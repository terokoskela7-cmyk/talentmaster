#!/usr/bin/env node
'use strict';
/* generoi_aineisto.js — projekti 06 PR 2: synteettisen aineiston generaattori stagingiin (VAIHE0 §2, P10–P12). Tero ajaa (gcloud ADC):
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging                       KUIVA-AJO (oletus): laskee dokumenttimäärät, ei kirjoita mitään
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --aja                 kirjoittaa (profiili savu = 2 seuraa, 1 000 pelaajaa)
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --tyhjenna            kuiva-ajo: montako synteettistä seuraa poistettaisiin
 *   ! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --tyhjenna --aja      poistaa (recursiveDelete)
 * Valinnat: --profiili=savu (oletus) · --siemen=1 (oletus; sama siemen → sama aineisto, P10) · --projekti PAKOLLINEN (ei oletusta).
 * LUKKO (lukko.js): vain talentmaster-staging[-x] / demo-kuorma; --projekti + env + ADC:n quota-projekti kaikki samaa; muu kaatuu ENNEN Admin SDK:n alustusta.
 * TYHJENNYS koskee VAIN seuroja, joiden id alkaa `kuorma_` JA dokumentilla synteettinen === true (muuta ei kosketa, vaikka projekti olisi väärä).
 * Kirjoitus BulkWriterilla, ramp-up 500/s → 5 000/s (500/50/5-sääntö). Tuloste: vain lukumäärät — ei nimiä, tunnisteita eikä id:itä. */
const path = require('path');
const L = require('./lukko.js');
const A = require('./aineisto.js');

const SEURA_ETUVALI = 'kuorma_';

function lueArgv(argv) {
  const o = { aja: false, tyhjenna: false, profiili: 'savu', siemen: '1', projekti: undefined, tuntematon: [] };
  (argv || []).forEach((a) => {
    if (a === '--aja') o.aja = true; else if (a === '--tyhjenna') o.tyhjenna = true; else if (a === '--kuiva') o.aja = false;
    else if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--profiili=') === 0) o.profiili = a.slice(11);
    else if (a.indexOf('--siemen=') === 0) o.siemen = a.slice(9); else o.tuntematon.push(a);
  });
  return o;
}

/** Tyhjennettävät seurat: id-etuliite JA synteettinen === true. → [{ id, ref }] */
async function tyhjennettavat(db) {
  const snap = await db.collection('seurat').get();
  return snap.docs.filter((d) => d.id.indexOf(SEURA_ETUVALI) === 0 && d.data() && d.data().synteettinen === true).map((d) => ({ id: d.id, ref: d.ref }));
}

/** deps: { luoDb(projekti) → { db, bulkWriter() , projektiVarmistus } , kirjaa(rivi), env, adc }. Palauttaa exit-koodin 0/1/2. */
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv);
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl). Katso skriptin otsikko.'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }   // ENNEN mitään Admin SDK -kutsua
  const profiili = A.PROFIILIT[a.profiili];
  if (!profiili) { virhe('Tuntematon profiili. Saatavilla: ' + Object.keys(A.PROFIILIT).join(', ')); return 2; }
  const moodi = a.tyhjenna ? 'TYHJENNYS' : 'GENEROINTI', kuiva = !a.aja;
  kirjaa(moodi + (kuiva ? ' (KUIVA-AJO, ei kirjoita)' : ' (KIRJOITTAA)') + ' · projekti ' + lukko.projekti + ' · profiili ' + profiili.nimi + ' · siemen ' + a.siemen);
  if (!a.tyhjenna) {
    const m = A.laske(profiili, a.siemen);
    Object.keys(m).forEach((k) => kirjaa('  ' + k.padEnd(18) + String(m[k]).padStart(9)));
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Kirjoita lisäämällä --aja.'); return 0; }
  }
  const yhteys = await d.luoDb(lukko.projekti);
  if (yhteys.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
  const db = yhteys.db;
  if (a.tyhjenna) {
    const lista = await tyhjennettavat(db);
    kirjaa('  poistettavia synteettisiä seuroja: ' + lista.length);
    if (kuiva) { kirjaa('Kuiva-ajo valmis. Poista lisäämällä --aja.'); return 0; }
    const bw = yhteys.bulkWriter(); for (const s of lista) await db.recursiveDelete(s.ref, bw); await bw.close();
    kirjaa('Poistettu synteettisiä seuroja: ' + lista.length); return 0;
  }
  const bw = yhteys.bulkWriter(); let kirjoitettu = 0, epaonnistui = 0;
  bw.onWriteError((e) => { if (e.failedAttempts < 5) return true; epaonnistui++; return false; });
  for (const doc of A.generoi(profiili, a.siemen)) {
    bw.set(db.doc(doc.polku), doc.data).catch(() => {});
    if (++kirjoitettu % 25000 === 0) kirjaa('  jonossa ' + kirjoitettu + ' dokumenttia …');
  }
  await bw.close();
  kirjaa('Kirjoitettu ' + (kirjoitettu - epaonnistui) + ' dokumenttia, epäonnistui ' + epaonnistui + '.');
  return epaonnistui ? 1 : 0;
}

/** Oikea Admin SDK. Alustetaan vasta lukon jälkeen; projektiId annetaan eksplisiittisesti. */
function luoOikeaDb(projekti) {
  const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: projekti });
  const db = admin.firestore();
  return { db, projekti: admin.app().options.projectId, bulkWriter: () => db.bulkWriter({ throttling: { initialOpsPerSecond: 500, maxOpsPerSecond: 5000 } }) };
}

if (require.main === module) main(process.argv.slice(2), { luoDb: luoOikeaDb }).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.code ? e.code : 'tuntematon')); process.exit(2); });
module.exports = { main, lueArgv, tyhjennettavat };
