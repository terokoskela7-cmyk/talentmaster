#!/usr/bin/env node
'use strict';
/* taydenna_kertymat.js — projekti 06 PR 2b jatko: harjoituskertymien (pelaajat/{pid}/kooste/kertyma_{kausi}) BACKFILL synteettiselle stagingaineistolle, kun triggerit on poistettu datalatauksen ajaksi. VAIN staging.
 *   ! node scripts/kuorma/taydenna_kertymat.js --projekti=talentmaster-staging                       KUIVA-AJO (oletus): laskee korit, ei kirjoita
 *   ! node scripts/kuorma/taydenna_kertymat.js --projekti=talentmaster-staging --aja                 kirjoittaa
 * Valinnat: --kaudet=2025-26,2026-27 (oletus; synteettinen aineisto on kalenterivuodelta 2026) · --seura=<kuorma_seura_NN> (oletus: kaikki synteettiset seurat).
 * LUKKO (lukko.js) ennen Admin SDK:ta. Koskee VAIN seuroja, joiden id alkaa `kuorma_` JA synteettinen === true (kuten --tyhjenna).
 * Laskenta: lib/tm_harjoituskertyma.js tmKertymaKorit — SAMA kuin triggerit/taytaPelaaja (pariteettitesti vertaa). Tehokkuus: tapahtumat ja läsnäolijat luetaan KERRAN per seura+kausi (ei pelaajakohtaisesti) → luvut ≈ yksi per dokumentti; kyselyt rinnakkain (32) — peräkkäin ~6 000+ verkkokierrosta = yli 10 min ilman tulostetta. Edistyminen tulostuu 5 s välein.
 * Tyhjiä kertymiä ei kirjoiteta (kuten triggeritkään). Tuloste: vain lukumäärät (seurat numeroituna 'seura 1/2', ei tunnisteita). */
const path = require('path');
const L = require('./lukko.js');
const G = require('./generoi_aineisto.js');
const H = require(path.join(__dirname, '..', '..', 'lib', 'tm_harjoituskertyma.js'));
const K = require(path.join(__dirname, '..', '..', 'functions', 'harjoituskertyma.js'));
const PV = 86400000;
const KAUDET_OLETUS = ['2025-26', '2026-27'];
const _ms = (v) => (v && typeof v.toDate === 'function' ? v.toDate().getTime() : (typeof v === 'number' ? v : (v ? Date.parse(v) : null)));
const evMuoto = (id, d) => { const a = _ms(d.alkaa), b = _ms(d.paattyy); return Object.assign({}, d, { id, _alkaaMs: a, _paattyyMs: b != null ? b : a }); };

/** Rinnakkaisajo rajatulla samanaikaisuudella (peräkkäiset kyselyt = yksi verkkokierros kerrallaan → 10 000 kyselyä ≈ kymmeniä minuutteja; rinnakkain ~RINNAKKAIN-kertaa nopeampi). */
const RINNAKKAIN = 32;
async function rinnan(erat, n, fn) { let i = 0; const ajaa = async () => { while (i < erat.length) { const k = i++; await fn(erat[k], k); } }; await Promise.all(Array.from({ length: Math.min(n, erat.length) }, ajaa)); }
/** Edistymisen tulostus: korkeintaan kerran / `valiMs` + aina valmistuessa; muoto "  <vaihe>: <tehty>/<yht> (<%>) · <s> s". */
function edistyja(kirjaa, nimi, yht, kello, valiMs) {
  let viimeksi = kello(), tehty = 0; const alku = viimeksi;
  return () => { tehty++; const nyt = kello(); if (tehty === yht || nyt - viimeksi >= valiMs) { viimeksi = nyt; kirjaa('    ' + nimi + ': ' + tehty + '/' + yht + ' (' + Math.round(100 * tehty / Math.max(1, yht)) + ' %) · ' + ((nyt - alku) / 1000).toFixed(1) + ' s'); } };
}

/** Yhden seuran kertymät yhdelle kaudelle → { pelaajia, kirjoitettu }. deps: { db, Timestamp, FieldPath, palvelinAika }, bw: { set(ref, data) } tai null (kuiva-ajo), nyt: ms.
 *  o: { kirjaa (edistymistuloste), kello () → ms, valiMs (edistymisen väli, oletus 5000), rinnakkain }. Lukumäärä ≈ yksi per dokumentti (pelaajat 1 + joukkueet 1 + tapahtumat 1 + läsnäolijat 1 + kirjaukset 1); kyselyt ajetaan rinnakkain. */
async function laskeSeuraKausi(deps, bw, sid, kausi, nyt, o) {
  o = o || {}; const tunn = o.tunn || 'seura', kirjaa = o.kirjaa || (() => {}), kello = o.kello || Date.now, valiMs = o.valiMs != null ? o.valiMs : 5000, n = o.rinnakkain || RINNAKKAIN;
  const db = deps.db, seura = db.collection('seurat').doc(sid), y = +kausi.slice(0, 4), alku = y + '-08-01', loppuIso = (y + 1) + '-07-31';
  const pSnap = await seura.collection('pelaajat').get(), pelaajat = []; pSnap.forEach((d) => { const x = d.data() || {}; if (x.poistettu === true || x.arkistoitu === true || x.aktiivinen === false) return; pelaajat.push(Object.assign({ id: d.id }, x)); });
  const jSnap = await seura.collection('joukkueet').get(), joukkueDocs = []; jSnap.forEach((d) => joukkueDocs.push({ id: d.id, nimi: (d.data() || {}).nimi }));
  const eSnap = await seura.collection('kalenteri').where('alkaa', '>=', deps.Timestamp.fromDate(new Date(Date.parse(alku + 'T00:00:00Z') - PV))).where('alkaa', '<=', deps.Timestamp.fromDate(new Date(Date.parse(loppuIso + 'T00:00:00Z') + 2 * PV))).get(), tap = [];
  eSnap.forEach((d) => tap.push(evMuoto(d.id, d.data() || {})));
  const kat = tap.filter((e) => H.tmKertymaKategoria(e)); kirjaa('  ' + tunn + ' ' + kausi + ': pelaajia ' + pelaajat.length + ' · tapahtumia ' + tap.length + ' (kertymään ' + kat.length + ')');
  const pidLasnaolot = {};   // pid → { eventId: { tila, syy, saatavuus } } — luetaan kerran per tapahtuma
  const e1 = edistyja(kirjaa, 'läsnäolijat (tapahtumia)', kat.length, kello, valiMs);
  await rinnan(kat, n, async (ev) => {
    const ls = await seura.collection('kalenteri').doc(ev.id).collection('lasnaolijat').get();
    ls.forEach((d) => { const x = d.data() || {}; (pidLasnaolot[d.id] = pidLasnaolot[d.id] || {})[ev.id] = { tila: x.tila || null, syy: x.syy || '', saatavuus: x.saatavuus || null }; }); e1();
  });
  let kirjoitettu = 0; const e2 = edistyja(kirjaa, 'kirjaukset ja korit (pelaajia)', pelaajat.length, kello, valiMs);
  await rinnan(pelaajat, n, async (p) => {
    const kSnap = await seura.collection('pelaajat').doc(p.id).collection('kirjaukset').where(deps.FieldPath.documentId(), '>=', alku).where(deps.FieldPath.documentId(), '<=', loppuIso).get(), kir = [];
    kSnap.forEach((d) => kir.push(Object.assign({ pvm: d.id }, d.data() || {})));
    const korit = H.tmKertymaKorit({ tapahtumat: tap, lasnaolot: pidLasnaolot[p.id] || {}, kirjaukset: kir, pelaaja: p, joukkueDocs, nyt }); e2();
    if (!Object.keys(korit).length) return;   // ei tyhjiä dokumentteja
    if (bw) bw.set(db.doc('seurat/' + sid + '/pelaajat/' + p.id + '/kooste/' + K.koosteId(kausi)), { kausi, versio: 1, viikot: korit, paivitetty: deps.palvelinAika() });
    kirjoitettu++;
  });
  return { pelaajia: pelaajat.length, kirjoitettu };
}

function lueArgv(argv) {
  const o = { aja: false, projekti: undefined, kaudet: KAUDET_OLETUS, seura: undefined, tuntematon: [] };
  (argv || []).forEach((a) => { if (a === '--aja') o.aja = true; else if (a.indexOf('--projekti=') === 0) o.projekti = a.slice(11); else if (a.indexOf('--kaudet=') === 0) o.kaudet = a.slice(9).split(','); else if (a.indexOf('--seura=') === 0) o.seura = a.slice(8); else o.tuntematon.push(a); });
  return o;
}

/** deps: { luoDb(projekti) → { db, projekti, bulkWriter(), Timestamp, FieldPath, palvelinAika }, kirjaa, virhe, env, adc, nyt }. */
async function main(argv, deps) {
  const d = deps || {}, kirjaa = d.kirjaa || ((r) => console.log(r)), virhe = d.virhe || ((r) => console.error(r)), a = lueArgv(argv);
  if (a.tuntematon.length) { virhe('Tuntematon valinta (' + a.tuntematon.length + ' kpl).'); return 2; }
  const lukko = L.tarkistaLukko({ projekti: a.projekti, env: d.env || process.env, adc: ('adc' in d) ? d.adc : L.lueAdcQuotaProjekti(d.env || process.env) });
  if (!lukko.ok) { virhe('LUKKO: ' + lukko.virhe); return 1; }
  if (!a.kaudet.every((k) => /^\d{4}-\d{2}$/.test(k))) { virhe('Virheellinen --kaudet (muoto 2025-26,2026-27).'); return 2; }
  const kuiva = !a.aja; kirjaa('KERTYMIEN BACKFILL ' + (kuiva ? '(KUIVA-AJO, ei kirjoita)' : '(KIRJOITTAA)') + ' · projekti ' + lukko.projekti + ' · kaudet ' + a.kaudet.join(','));
  const y = await d.luoDb(lukko.projekti);
  if (y.projekti !== lukko.projekti) { virhe('LUKKO: Admin SDK:n projekti ei vastaa --projekti-parametria — ajo keskeytetty.'); return 1; }
  let seurat = (await G.tyhjennettavat(y.db)).map((s) => s.id); if (a.seura) seurat = seurat.filter((s) => s === a.seura);
  const bw = kuiva ? null : y.bulkWriter(), nyt = d.nyt || Date.now(); let pelaajia = 0, korit = 0;
  const kello = d.kello || Date.now, t0 = kello(), o = { kirjaa, kello, valiMs: d.valiMs, rinnakkain: d.rinnakkain };
  kirjaa('  synteettisiä seuroja: ' + seurat.length + ' · rinnakkaisuus ' + (d.rinnakkain || RINNAKKAIN) + ' (edistyminen tulostuu seuroittain ja kausittain)');
  for (let i = 0; i < seurat.length; i++) for (const kausi of a.kaudet) { const sid = seurat[i], tunn = 'seura ' + (i + 1) + '/' + seurat.length, t1 = kello(), r = await laskeSeuraKausi(y, bw, sid, kausi, nyt, Object.assign({}, o, { tunn })); pelaajia += r.pelaajia; korit += r.kirjoitettu; kirjaa('  ' + tunn + ' ' + kausi + ' valmis: ' + r.kirjoitettu + ' kertymää · ' + ((kello() - t1) / 1000).toFixed(1) + ' s'); }
  if (bw) { kirjaa('  odotetaan kirjoitusten valmistumista (bulkWriter) …'); await bw.close(); }
  kirjaa('  synteettisiä seuroja: ' + seurat.length + ' · pelaajia (kausi kerrallaan): ' + pelaajia + ' · ' + (kuiva ? 'kirjoitettaisiin' : 'kirjoitettu') + ' kertymädokumenttia: ' + korit);
  kirjaa((kuiva ? 'Kuiva-ajo valmis. Kirjoita lisäämällä --aja.' : 'Valmis.') + ' Kokonaiskesto ' + ((kello() - t0) / 1000).toFixed(1) + ' s.'); return 0;
}
function luoOikeaDb(projekti) {
  const admin = require(path.join(__dirname, '..', '..', 'functions', 'node_modules', 'firebase-admin'));
  admin.initializeApp({ projectId: projekti }); const db = admin.firestore();
  return { db, projekti: admin.app().options.projectId, Timestamp: admin.firestore.Timestamp, FieldPath: admin.firestore.FieldPath, palvelinAika: () => admin.firestore.FieldValue.serverTimestamp(), bulkWriter: () => db.bulkWriter({ throttling: { initialOpsPerSecond: 500, maxOpsPerSecond: 5000 } }) };
}
if (require.main === module) main(process.argv.slice(2), { luoDb: luoOikeaDb }).then((c) => process.exit(c)).catch((e) => { console.error('Virhe: ' + (e && e.code ? e.code : 'tuntematon')); process.exit(2); });
module.exports = { main, lueArgv, laskeSeuraKausi, KAUDET_OLETUS, rinnan, RINNAKKAIN };
