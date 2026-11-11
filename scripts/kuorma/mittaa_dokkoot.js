#!/usr/bin/env node
'use strict';
/* mittaa_dokkoot.js — projekti 06 PR 3: dokumenttikoot (VAIHE0 3.3, P11: isoin pelaajadokumentti < 250 kt kolmen kauden jälkeen). VAIN LUKEVA.
 *   ! node scripts/kuorma/mittaa_dokkoot.js --offline=savu_taysi                      OFFLINE: laskee koot generaattorin datasta (ei Firestorea, ei verkkoa) — ennakko
 *   ! node scripts/kuorma/mittaa_dokkoot.js --projekti=talentmaster-staging           KUIVA-AJO: tulostaa mitä luetaan (lukulukuarvio), ei lue
 *   ! node scripts/kuorma/mittaa_dokkoot.js --projekti=talentmaster-staging --aja     lukee synteettiset seurat (kuorma_ + synteettinen:true) ja laskee koot
 * Koko = Firestore-tallennuskoon laskentakaava (mittaus_lib.firestoreDokKoko; tarkka koko ei ole API:ssa). Ryhmät: seurat/{}/pelaajat/{}, …/kayttajat/{}, seurat/{}/kooste/{}, seurat/{}/pelaajat/{}/kooste/{}.
 * Tuloste: vain luvut (ei tunnisteita, ei sisältöä); isoimman dokumentin suurimmat KENTÄT nimellä (kentännimet ovat skeemaa, ei dataa). LUKKO (lukko.js) ennen Admin SDK:ta. */
const fs = require('fs'), path = require('path');
const M = require('./mittaus_lib.js');
const L = require('./lukko.js');
const A = require('./aineisto.js');

const RYHMAT = [['pelaajat', /^seurat\/[^/]+\/pelaajat\/[^/]+$/], ['kayttajat', /^seurat\/[^/]+\/kayttajat\/[^/]+$/], ['seuran_kooste', /^seurat\/[^/]+\/kooste\/[^/]+$/], ['pelaajan_kooste', /^seurat\/[^/]+\/pelaajat\/[^/]+\/kooste\/[^/]+$/]];
const ryhmaAvain = (polku) => { const r = RYHMAT.find(([, re]) => re.test(polku)); return r ? r[0] : null; };

/** Pure: kohteet = iterable { polku, data } → { ryhmat: { <ryhmä>: { n, max_b, max_kt, mediaani_b, p95_b, summa_b } }, isoinPelaaja: { koko_b, koko_kt, kentat: [{ kentta, b }] } }. */
function mittaaKoot(kohteet) {
  const koot = {}; let isoin = null;
  for (const k of kohteet) {
    const g = ryhmaAvain(k.polku); if (!g) continue;
    const b = M.firestoreDokKoko(k.polku, k.data); (koot[g] = koot[g] || []).push(b);
    if (g === 'pelaajat' && (!isoin || b > isoin.b)) isoin = { b, data: k.data, polku: k.polku };
  }
  const ryhmat = {}; Object.keys(koot).forEach((g) => { const t = M.tilasto(koot[g]); ryhmat[g] = { n: t.n, max_b: t.max, max_kt: Math.round(t.max / 10.24) / 100, mediaani_b: t.mediaani, p95_b: t.p95, summa_b: koot[g].reduce((a, x) => a + x, 0) }; });
  let isoinPelaaja = null;
  if (isoin) {
    const kentat = Object.keys(isoin.data || {}).map((f) => ({ kentta: f, b: Buffer.byteLength(f, 'utf8') + 1 + M.arvoKoko(isoin.data[f]) })).sort((a, b) => b.b - a.b).slice(0, 5);
    isoinPelaaja = { koko_b: isoin.b, koko_kt: Math.round(isoin.b / 10.24) / 100, osuus_rajasta: isoin.b / (M.RAJAT.pelaajadokumentti_kt * 1000), kentat };
  }
  return { ryhmat, isoinPelaaja };
}

function* offlineKohteet(profiiliNimi, siemen) { const p = A.PROFIILIT[profiiliNimi]; for (const d of A.generoi(p, siemen || 1)) yield { polku: d.polku, data: d.data }; }

function lueArgv(argv) {
  const o = { projekti: undefined, aja: false, offline: undefined, ulos: 'mittaus_tulokset/dokumentit.json', tuntematon: [] };
  (argv || []).forEach((a) => { if (a === '--aja') o.aja = true; else if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--offline=') === 0) o.offline = a.slice(10); else if (a.indexOf('--ulos=') === 0) o.ulos = a.slice(7); else o.tuntematon.push(a); });
  return o;
}
function kirjoita(ulos, tulos) { fs.mkdirSync(path.dirname(ulos), { recursive: true }); fs.writeFileSync(ulos, JSON.stringify(tulos, null, 2) + '\n'); }
function tulosta(kirjaa, r) {
  Object.keys(r.ryhmat).forEach((g) => { const x = r.ryhmat[g]; kirjaa('  ' + g + ': ' + x.n + ' dokumenttia · suurin ' + x.max_kt + ' kt · mediaani ' + Math.round(x.mediaani_b) + ' B · p95 ' + Math.round(x.p95_b) + ' B'); });
  if (r.isoinPelaaja) kirjaa('  ISOIN PELAAJADOKUMENTTI: ' + r.isoinPelaaja.koko_kt + ' kt (' + (r.isoinPelaaja.osuus_rajasta * 100).toFixed(1) + ' % P11-rajasta ' + M.RAJAT.pelaajadokumentti_kt + ' kt) · suurimmat kentät: ' + r.isoinPelaaja.kentat.map((k) => k.kentta + ' ' + k.b + ' B').join(', '));
}

async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv);
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl).'); return 2; }
  if (a.offline) {
    if (!A.PROFIILIT[a.offline]) { virhe('Tuntematon profiili.'); return 2; }
    kirjaa('DOKUMENTTIKOOT (OFFLINE, generaattorin data, profiili ' + a.offline + ') — ei Firestorea');
    const r = mittaaKoot(offlineKohteet(a.offline)); tulosta(kirjaa, r); kirjoita(a.ulos, { meta: { tila: 'offline', profiili: a.offline, aika: new Date().toISOString() }, ryhmat: r.ryhmat, isoinPelaaja: r.isoinPelaaja }); kirjaa('Valmis · ' + a.ulos); return 0;
  }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }
  kirjaa('DOKUMENTTIKOOT ' + (a.aja ? '(LUKEE)' : '(KUIVA-AJO, ei lue)') + ' · projekti ' + lukko.projekti);
  if (!a.aja) { kirjaa('Lukisi: synteettisten seurojen (kuorma_ + synteettinen:true) pelaajat, kayttajat, seuran kooste ja pelaajien kooste — noin yksi luku/dokumentti. Lue lisäämällä --aja.'); return 0; }
  const y = await d.luoDb(lukko.projekti); if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
  const G = require('./generoi_aineisto.js'), seurat = await G.tyhjennettavat(y.db), kohteet = [];
  for (const s of seurat) {
    for (const k of ['pelaajat', 'kayttajat', 'kooste']) { const sn = await s.ref.collection(k).get(); sn.forEach((x) => kohteet.push({ polku: 'seurat/' + s.id + '/' + k + '/' + x.id, data: x.data() })); }
  }
  const sallitut = seurat.map((s) => 'seurat/' + s.id + '/pelaajat/'), pk = await y.db.collectionGroup('kooste').get();   // yksi luku/dokumentti; vain synteettisten seurojen pelaajat
  pk.forEach((x) => { if (sallitut.some((e) => x.ref.path.indexOf(e) === 0)) kohteet.push({ polku: x.ref.path, data: x.data() }); });
  const r = mittaaKoot(kohteet); tulosta(kirjaa, r); kirjoita(a.ulos, { meta: { tila: 'staging', seuroja: seurat.length, aika: new Date().toISOString() }, ryhmat: r.ryhmat, isoinPelaaja: r.isoinPelaaja }); kirjaa('Valmis · ' + a.ulos); return 0;
}
function luoOikeaDb(projekti) { const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin')); admin.initializeApp({ projectId: projekti }); return { db: admin.firestore(), projekti: admin.app().options.projectId }; }
if (require.main === module) main(process.argv.slice(2), { luoDb: luoOikeaDb }).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.code ? e.code : 'tuntematon')); process.exit(2); });
module.exports = { main, lueArgv, mittaaKoot, offlineKohteet, ryhmaAvain };
