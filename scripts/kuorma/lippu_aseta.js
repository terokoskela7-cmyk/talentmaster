#!/usr/bin/env node
'use strict';
/* lippu_aseta.js — asettaa YHDEN seuran YHDEN käyttöönottolipun STAGINGISSA (lista_seura A/B-mittaus: B = lippu päällä, A = pois). TERO AJAA (ADC); Code ei aja.
 *   ! node scripts/kuorma/lippu_aseta.js --projekti=talentmaster-staging --seura=1 --lippu=lista_seura --arvo=paalle          KUIVA-AJO (oletus): näyttää nykyisen ja uuden tehokkaan arvon
 *   ! node scripts/kuorma/lippu_aseta.js --projekti=talentmaster-staging --seura=1 --lippu=lista_seura --arvo=paalle --aja    kirjoittaa
 * --seura=<n> = kuorma_seura_<nn> (sama numerointi kuin ab_vuorotellen --seura-a/--seura-b); --arvo=paalle|pois. Lippu vain rekisteristä (lib/tm_liput.js).
 * Kirjoitus = sama callable-logiikka kuin Admin → Liput (functions/liput_hallinta.js): transaktio, seurat/{sid}/liput/julkiset + audit-rivi (tekija_uid 'skripti:kuorma_lippu_aseta'). Vain kuorma-seurat (synteettinen: true).
 * TUOTANTO: ei tällä skriptillä — Admin-paneelin Liput-näkymä tukee seurakohtaista arvoa (seura × lippu, muutosloki). Projektilukko (lukko.js) hylkää kaiken muun kuin stagingin. */
const L = require('./lukko.js');
const LIPUT = require('../../lib/tm_liput.js');
const HALLINTA = require('../../functions/liput_hallinta.js');
const TEKIJA = 'skripti:kuorma_lippu_aseta';

function lueArgv(argv) {
  const o = { projekti: undefined, seura: undefined, lippu: undefined, arvo: undefined, aja: false, tuntematon: [] };
  (argv || []).forEach((x) => {
    const kv = /^--([a-z]+)=(.*)$/.exec(x);
    if (x === '--aja') o.aja = true;
    else if (kv && ['projekti', 'seura', 'lippu', 'arvo'].indexOf(kv[1]) >= 0) o[kv[1]] = kv[2];
    else o.tuntematon.push(x.split('=')[0]);
  });
  return o;
}
/** --seura=<n> tai kuorma_seura_<nn> → 'kuorma_seura_NN' | null. */
function seuraId(s) {
  const m = /^(?:kuorma_seura_)?(\d{1,2})$/.exec(String(s == null ? '' : s));
  return m && +m[1] >= 1 ? 'kuorma_seura_' + String(+m[1]).padStart(2, '0') : null;
}
const arvoBool = (a) => (a === 'paalle' ? true : a === 'pois' ? false : null);

/** deps: { luoDb(projekti) → { db, FieldValue, projekti }, kirjaa, virhe, env, adc }. → exit-koodi 0/1/2. */
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), o = lueArgv(argv);
  if (o.tuntematon.length) { virhe('Tuntematon valinta: ' + o.tuntematon.join(', ') + '. Katso skriptin otsikko.'); return 2; }
  const sid = seuraId(o.seura), arvo = arvoBool(o.arvo);
  if (!sid) { virhe('--seura=<n> (1–99) tai kuorma_seura_<nn> puuttuu / virheellinen.'); return 2; }
  if (!o.lippu || !LIPUT.tmLippuTunnettu(o.lippu)) { virhe('--lippu puuttuu tai ei ole rekisterissä (lib/tm_liput.js).'); return 2; }
  if (arvo === null) { virhe('--arvo=paalle tai --arvo=pois.'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: o.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }   // ENNEN Admin SDK:ta
  const y = await d.luoDb(lukko.projekti);
  if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
  const sref = y.db.collection('seurat').doc(sid), s = await sref.get();
  if (!s.exists) { virhe('Seuraa ' + sid + ' ei löydy stagingistä (aja ensin generoi_aineisto.js).'); return 1; }
  if (!s.data() || s.data().synteettinen !== true) { virhe(sid + ' ei ole synteettinen kuorma-seura — lippua ei kosketa.'); return 1; }
  const j = await sref.collection('liput').doc('julkiset').get(), nyt = LIPUT.tmLippuTila(o.lippu, j.exists ? j.data() : null, s.data());
  kirjaa((o.aja ? 'KIRJOITUS' : 'KUIVA-AJO (ei kirjoita; lisää --aja)') + ' · projekti ' + lukko.projekti + ' · ' + sid + ' · ' + o.lippu + ': ' + (nyt.arvo ? 'päällä' : 'pois') + ' (' + nyt.lahde + ') → ' + (arvo ? 'päälle' : 'pois'));
  if (nyt.arvo === arvo) { kirjaa('Ei muutosta (tehokas arvo on jo ' + (arvo ? 'päällä' : 'pois') + ').'); return 0; }
  if (!o.aja) return 0;
  try {
    const h = HALLINTA.kasittelija({ db: y.db, FieldValue: y.FieldValue, HttpsError: class extends Error { constructor(k, m) { super(m); this.code = k; } }, onSuperAdminUid: async () => true, loki: { log: () => {}, error: () => {} } });
    const r = await h({ seuraId: sid, lippu: o.lippu, arvo }, { auth: { uid: TEKIJA } });
    kirjaa('Kirjoitettu: ' + sid + ' · ' + o.lippu + ' ' + (r.vanha ? 'päällä' : 'pois') + ' → ' + (r.uusi ? 'päällä' : 'pois') + ' (audit-rivi lisätty). Kuuntelijat päivittyvät heti; kirjaudu sisään uudelleen / lataa sivu ennen mittausta.');
  } catch (e) { virhe('Kirjoitus epäonnistui: ' + (e && e.code ? e.code + ' ' : '') + String(e && e.message || '').split('\n')[0]); return 1; }
  return 0;
}
function luoOikeaDb(projekti) {
  const path = require('path'), admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: projekti });
  return { db: admin.firestore(), FieldValue: admin.firestore.FieldValue, projekti: admin.app().options.projectId };
}
if (require.main === module) main(process.argv.slice(2), { luoDb: luoOikeaDb }).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.code ? e.code : 'tuntematon')); process.exit(2); });
module.exports = { main, lueArgv, seuraId, luoOikeaDb };
