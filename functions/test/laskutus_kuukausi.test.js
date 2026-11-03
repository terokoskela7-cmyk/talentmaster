'use strict';
/**
 * Laskutus L1b — functions/laskutus_kuukausi.js mock-Firestorella (ei emulaattoria).
 * Kuun vaihteen yö Suomen ajassa: 30.11. klo 23.30 (= 21.30Z) on vielä marraskuuta, 1.12. klo 1.30 (= 30.11. 23.30Z) on jo joulukuuta.
 * create() ei ylikirjoita, myöhässä ajo → myohassa, yhden seuran virhe ei kaada muita, audit jokaisesta poikkeamasta.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const K = require('../laskutus_kuukausi');

const SERVER_TS = { __ts: 'palvelin' };
const FieldValue = { serverTimestamp: () => SERVER_TS };

const HKI_30_11_2330 = Date.UTC(2026, 10, 30, 21, 30);   // ma 30.11.2026 klo 23.30 Helsinki (EET +2)
const HKI_1_12_0130 = Date.UTC(2026, 10, 30, 23, 30);    // ti 1.12.2026 klo 1.30 Helsinki — UTC:ssä vielä 30.11.
const HKI_1_12_0600 = Date.UTC(2026, 11, 1, 4, 0);       // ajastettu ajohetki
const HKI_3_12_1000 = Date.UTC(2026, 11, 3, 8, 0);       // myöhässä
const HKI_1_1_0130 = Date.UTC(2026, 11, 31, 23, 30);     // pe 1.1.2027 klo 1.30 Helsinki — UTC:ssä vielä 31.12.2026

function luoDb(data, opts) {
  const STORE = new Map(Object.entries(data)); const audit = []; opts = opts || {};
  const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
  const docSnap = (polku) => ({ id: polku.split('/').pop(), exists: STORE.has(polku), data: () => STORE.get(polku) });
  function colRef(polku) {
    return {
      doc: (id) => docRef(polku + '/' + id),
      add: async (d) => { if (polku === 'audit') audit.push(d); else throw new Error('odottamaton add ' + polku); },
      get: async () => {
        if (opts.heitaPolulle && polku.indexOf(opts.heitaPolulle) >= 0) throw new Error('mock-virhe ' + polku);
        const docs = lapset(polku).map(docSnap); return { docs, empty: !docs.length, size: docs.length };
      },
    };
  }
  function docRef(polku) {
    return {
      path: polku, id: polku.split('/').pop(), get: async () => docSnap(polku), collection: (n) => colRef(polku + '/' + n),
      set: async () => { throw new Error('set() kielletty: ' + polku); },
      create: async (d) => { if (STORE.has(polku)) { const e = new Error('6 ALREADY_EXISTS: Document already exists: ' + polku); e.code = 6; throw e; } STORE.set(polku, JSON.parse(JSON.stringify(d))); },
    };
  }
  return { STORE, audit, collection: (n) => colRef(n) };
}
const deps = (db, nytMs) => ({ db, FieldValue, nyt: () => nytMs, loki: { log() {}, error() {} } });

/* Sopimuksen esimerkki: joukkueet 30 + 20 pelaajaa, kaikilla suostumus, kaikki ≥ 10 v → 80 + 25 + 20 = 125 € */
function sopimusSeura(sid, o) {
  o = o || {}; const d = {};
  d['seurat/' + sid] = { nimi: sid };
  d['laskutus_asetukset/' + sid] = Object.assign({ laskutettava: true, sopimus_alkaen: '2026-11' }, o.asetukset || {});
  d['seurat/' + sid + '/joukkueet/j30'] = { nimi: 'P12', laskutustila: 'aktiivinen' };
  d['seurat/' + sid + '/joukkueet/j20'] = { nimi: 'T12', laskutustila: 'aktiivinen' };
  d['seurat/' + sid + '/joukkueet/jp'] = { nimi: 'P8' };   // passiivinen (puuttuva tila)
  d['seurat/' + sid + '/kayttajat/v1'] = { rooli: 'valmentaja', email: 'v@x.fi', joukkueet: ['j30', 'j20'] };
  for (let i = 0; i < 30; i++) d['seurat/' + sid + '/pelaajat/a' + i] = { joukkue: 'P12', joukkueet: ['j30'], syntymaVuosi: 2014, suostumusTila: 'annettu' };
  for (let i = 0; i < 20; i++) d['seurat/' + sid + '/pelaajat/b' + i] = { joukkue: 'T12', joukkueet: ['j20'], syntymaVuosi: 2014, suostumusTila: 'annettu' };
  return d;
}
const snap = (db, kk, sid) => db.STORE.get('laskutus/' + kk + '/seurat/' + sid);

test('kuukausi Suomen ajassa: 30.11. klo 23.30 → edellinen = lokakuu; 1.12. klo 1.30 ja 6.00 → marraskuu; 1.1. klo 1.30 → joulukuu', () => {
  assert.strictEqual(K.edellinenKk(HKI_30_11_2330), '2026-10');
  assert.strictEqual(K.edellinenKk(HKI_1_12_0130), '2026-11');
  assert.strictEqual(K.edellinenKk(HKI_1_12_0600), '2026-11');
  assert.strictEqual(K.edellinenKk(HKI_1_1_0130), '2026-12');   // vuodenvaihde
  assert.strictEqual(new Date(HKI_1_12_0130).toISOString().slice(0, 10), '2026-11-30', 'tarkistus: UTC-päivä olisi väärä');
});

test('laskentahetki = kuukauden viimeinen päivä; ajallaan ajo = seuraavan kuun 1. päivä', () => {
  assert.strictEqual(K.kuunViimeinenPaiva('2026-11'), '2026-11-30');
  assert.strictEqual(K.kuunViimeinenPaiva('2026-12'), '2026-12-31');
  assert.strictEqual(K.kuunViimeinenPaiva('2027-02'), '2027-02-28');
  assert.strictEqual(K.kuunViimeinenPaiva('2028-02'), '2028-02-29');
  assert.strictEqual(K.ajopaiva('2026-11'), '2026-12-01');
  assert.strictEqual(K.ajopaiva('2026-12'), '2027-01-01');
  assert.strictEqual(K.kuunViimeinenPaiva('2026-13'), null);
});

test('ajo 1.12. klo 1.30 Suomen aikaa (UTC 30.11.) → marraskuun snapshot, sopimuksen esimerkki 125 €, ei myöhässä', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  const r = await K.laskeKaikki(deps(db, HKI_1_12_0130), {});
  assert.strictEqual(r.kk, '2026-11'); assert.strictEqual(r.luotu.length, 1); assert.strictEqual(r.virheet.length, 0);
  const s = snap(db, '2026-11', 'sibbo');
  assert.ok(s, 'laskutus/2026-11/seurat/sibbo luotu');
  assert.strictEqual(db.STORE.has('laskutus/2026-10/seurat/sibbo'), false);
  assert.strictEqual(s.kk, '2026-11'); assert.strictEqual(s.laskentahetki, '2026-11-30');
  assert.strictEqual(s.ajettu_pvm, '2026-12-01'); assert.strictEqual(s.myohassa, false);
  assert.strictEqual(s.seuralisenssi_snt, 8000); assert.strictEqual(s.pelaajamaksut_snt, 4500); assert.strictEqual(s.yhteensa_snt, 12500);
  const j30 = s.joukkueet.find((j) => j.id === 'j30'), jp = s.joukkueet.find((j) => j.id === 'jp');
  assert.strictEqual(j30.summa_snt, 2500); assert.strictEqual(j30.katto_kaytossa, true);
  assert.strictEqual(jp.laskutustila, 'passiivinen'); assert.strictEqual(jp.summa_snt, 0);
  assert.strictEqual(s.hinnat.hinta_pelaaja_snt, 100); assert.strictEqual(s.lahde, 'laskutusKuukausi');
  const a = db.audit.find((x) => x.toiminto === 'laskutus_kuukausi_ajo');
  assert.ok(a && a.kk === '2026-11' && a.luotu === 1 && a.yhteensa_snt === 12500 && a.severity === 'info');
});

test('ajastettu ajohetki 1.12. klo 6.00 → sama marraskuu; käsittelijä palauttaa null', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  assert.strictEqual(await K.ajastettuKasittelija(deps(db, HKI_1_12_0600))(), null);
  const s = snap(db, '2026-11', 'sibbo');
  assert.ok(s); assert.strictEqual(s.myohassa, false); assert.strictEqual(s.yhteensa_snt, 12500);
});

test('ajo 30.11. klo 23.30 Suomen aikaa → EI marraskuuta (kuu ei ole päättynyt); lokakuu ennen sopimusta = 0 €, myöhässä', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  const r = await K.laskeKaikki(deps(db, HKI_30_11_2330), {});
  assert.strictEqual(r.kk, '2026-10');
  assert.strictEqual(db.STORE.has('laskutus/2026-11/seurat/sibbo'), false, 'marraskuuta ei lasketa ennen kuun loppua');
  const s = snap(db, '2026-10', 'sibbo');
  assert.strictEqual(s.laskutettava, false); assert.strictEqual(s.yhteensa_snt, 0); assert.strictEqual(s.myohassa, true);
});

test('vuodenvaihde 1.1.2027 klo 1.30 → joulukuun 2026 snapshot, ikä vuoden 2026 mukaan', async () => {
  const d = sopimusSeura('sibbo');
  d['seurat/sibbo/pelaajat/a0'] = Object.assign({}, d['seurat/sibbo/pelaajat/a0'], { syntymaVuosi: 2017 });   // 2026: 9 v → 0 €; 2027 olisi 10 v
  const db = luoDb(d);
  const r = await K.laskeKaikki(deps(db, HKI_1_1_0130), {});
  assert.strictEqual(r.kk, '2026-12');
  const s = snap(db, '2026-12', 'sibbo');
  assert.strictEqual(s.laskentahetki, '2026-12-31'); assert.strictEqual(s.ajettu_pvm, '2027-01-01'); assert.strictEqual(s.myohassa, false);
  assert.strictEqual(s.joukkueet.find((j) => j.id === 'j30').alle_ika, 1);
});

test('myöhässä ajo 3.12. → marraskuu, myohassa: true (ajohetken tila), audit merkitsee', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  await K.laskeKaikki(deps(db, HKI_3_12_1000), {});
  const s = snap(db, '2026-11', 'sibbo');
  assert.strictEqual(s.myohassa, true); assert.strictEqual(s.ajettu_pvm, '2026-12-03'); assert.strictEqual(s.tila_hetkelta, 'ajohetki');
  assert.strictEqual(db.audit.find((x) => x.toiminto === 'laskutus_kuukausi_ajo').myohassa, true);
});

test('uusi ajo samalle kuulle: create() ei ylikirjoita, ohitetaan hallitusti + audit', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  await K.laskeKaikki(deps(db, HKI_1_12_0600), {});
  const ensimmainen = JSON.stringify(snap(db, '2026-11', 'sibbo'));
  db.STORE.set('seurat/sibbo/joukkueet/j20', { nimi: 'T12', laskutustila: 'passiivinen' });   // tila muuttuu ajojen välissä
  const r = await K.laskeKaikki(deps(db, HKI_3_12_1000), {});
  assert.deepStrictEqual(r.on_jo, ['sibbo']); assert.strictEqual(r.luotu.length, 0); assert.strictEqual(r.virheet.length, 0);
  assert.strictEqual(JSON.stringify(snap(db, '2026-11', 'sibbo')), ensimmainen, 'snapshot ennallaan');
  const a = db.audit.find((x) => x.toiminto === 'laskutus_snapshot_on_jo');
  assert.ok(a && a.kk === '2026-11' && a.seuraId === 'sibbo' && a.severity === 'warn');
});

test('yhden seuran virhe ei kaada muita: loki + audit (alert), muut seurat luodaan', async () => {
  const d = Object.assign({}, sopimusSeura('sibbo'), sopimusSeura('rikki'), sopimusSeura('kpv'));
  const db = luoDb(d, { heitaPolulle: 'seurat/rikki/pelaajat' });
  const r = await K.laskeKaikki(deps(db, HKI_1_12_0600), {});
  assert.deepStrictEqual(r.luotu.map((t) => t.sid).sort(), ['kpv', 'sibbo']);
  assert.strictEqual(r.virheet.length, 1); assert.strictEqual(r.virheet[0].sid, 'rikki');
  assert.strictEqual(db.STORE.has('laskutus/2026-11/seurat/rikki'), false);
  const a = db.audit.find((x) => x.toiminto === 'laskutus_snapshot_virhe');
  assert.ok(a && a.seuraId === 'rikki' && a.severity === 'alert' && /mock-virhe/.test(a.viesti));
  assert.strictEqual(db.audit.find((x) => x.toiminto === 'laskutus_kuukausi_ajo').severity, 'alert');
});

test('virheelliset asetukset → kyseinen seura virheeksi (ei hiljaista oletusta), muut jatkuvat', async () => {
  const d = Object.assign({}, sopimusSeura('sibbo'), sopimusSeura('vaara', { asetukset: { hinta_pelaaja_snt: 1.5 } }));
  const db = luoDb(d);
  const r = await K.laskeKaikki(deps(db, HKI_1_12_0600), {});
  assert.deepStrictEqual(r.luotu.map((t) => t.sid), ['sibbo']);
  assert.strictEqual(r.virheet[0].sid, 'vaara'); assert.match(r.virheet[0].viesti, /hinta_pelaaja_snt/);
});

test('seuravalinta: ei sopimusta eikä aktiivisia joukkueita → ei snapshotia; sopimusseura ilman aktiivisia → vain lisenssi; aktiivinen ilman sopimusta → 0 € snapshot', async () => {
  const d = {
    'seurat/tyhja': { nimi: 'Tyhjä' }, 'seurat/tyhja/joukkueet/x': { nimi: 'X' },
    'seurat/lisenssi': { nimi: 'L' }, 'laskutus_asetukset/lisenssi': { laskutettava: true, sopimus_alkaen: '2026-11' }, 'seurat/lisenssi/joukkueet/y': { nimi: 'Y', laskutustila: 'passiivinen' },
    'seurat/eisop': { nimi: 'E' }, 'seurat/eisop/joukkueet/z': { nimi: 'Z', laskutustila: 'aktiivinen' },
  };
  const db = luoDb(d);
  const r = await K.laskeKaikki(deps(db, HKI_1_12_0600), {});
  assert.deepStrictEqual(r.ohitettu, ['tyhja']);
  assert.strictEqual(db.STORE.has('laskutus/2026-11/seurat/tyhja'), false);
  assert.strictEqual(snap(db, '2026-11', 'lisenssi').yhteensa_snt, 8000);
  const e = snap(db, '2026-11', 'eisop'); assert.strictEqual(e.laskutettava, false); assert.strictEqual(e.yhteensa_snt, 0);
});

test('oletusasetukset (laskutus_asetukset/oletus) + seuran ohitus yhdistyvät kuten Adminin esikatselussa', async () => {
  const d = sopimusSeura('sibbo', { asetukset: { joukkuekatto_snt: 3000 } });
  d['laskutus_asetukset/oletus'] = { seuralisenssi_snt: 15000, hinta_pelaaja_snt: 250, joukkuekatto_snt: 999999 };
  const db = luoDb(d);
  await K.laskeKaikki(deps(db, HKI_1_12_0600), {});
  const s = snap(db, '2026-11', 'sibbo');
  assert.strictEqual(s.hinnat.seuralisenssi_snt, 15000); assert.strictEqual(s.hinnat.joukkuekatto_snt, 3000);
  assert.strictEqual(s.pelaajamaksut_snt, 3000 + 3000);   // 30×2,5 € = 75 → katto 30; 20×2,5 € = 50 → katto 30
});

test('index.js: laskutusKuukausi = europe-west1, 0 6 1 * *, Europe/Helsinki, ajastettuKasittelija', () => {
  const CF = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const i = CF.indexOf('exports.laskutusKuukausi = functions'); assert.ok(i > 0, 'export puuttuu');
  const lohko = CF.slice(i, CF.indexOf(';', i));
  assert.match(lohko, /\.region\('europe-west1'\)/);
  assert.match(lohko, /\.pubsub\.schedule\('0 6 1 \* \*'\)/);
  assert.match(lohko, /\.timeZone\('Europe\/Helsinki'\)/);
  assert.match(lohko, /laskutusKuukausi\.ajastettuKasittelija\(/);
});

test('moduuli ei käytä set()/update()-kirjoitusta snapshotille eikä UTC-päivää', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'laskutus_kuukausi.js'), 'utf8');
  assert.match(src, /\.create\(doc\)/);
  assert.doesNotMatch(src, /\.set\(|\.update\(/);
  assert.doesNotMatch(src, /toISOString/);
});

/* ── SA-varapolku: callable laskutusKuukausiVarapolku ── */
class HttpsError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const vpDeps = (db, nytMs, saUidit) => Object.assign(deps(db, nytMs), { HttpsError, onSuperAdminUid: async (uid) => (saUidit || ['sa']).indexOf(uid) >= 0 });
const ctx = (uid) => ({ auth: { uid, token: {} } });

test('varapolku: kirjautumaton → unauthenticated; ei-SA (VP, valmentaja) → permission-denied; ei kirjoituksia', async () => {
  const db = luoDb(sopimusSeura('sibbo')); const f = K.varapolkuKasittelija(vpDeps(db, HKI_3_12_1000));
  await assert.rejects(f({}, {}), { code: 'unauthenticated' });
  await assert.rejects(f({}, ctx('vp-uid')), { code: 'permission-denied' });
  await assert.rejects(f({ kk: '2026-11' }, ctx('valmentaja-uid')), { code: 'permission-denied' });
  assert.strictEqual(db.STORE.has('laskutus/2026-11/seurat/sibbo'), false);
});

test('varapolku: vain päättynyt kuukausi Suomen ajassa — 30.11. klo 23.30 marraskuu hylätään, 1.12. klo 1.30 hyväksytään', async () => {
  let db = luoDb(sopimusSeura('sibbo'));
  await assert.rejects(K.varapolkuKasittelija(vpDeps(db, HKI_30_11_2330))({ kk: '2026-11' }, ctx('sa')), { code: 'failed-precondition' });
  await assert.rejects(K.varapolkuKasittelija(vpDeps(db, HKI_30_11_2330))({ kk: '2027-01' }, ctx('sa')), { code: 'failed-precondition' });
  await assert.rejects(K.varapolkuKasittelija(vpDeps(db, HKI_30_11_2330))({ kk: '2026-13' }, ctx('sa')), { code: 'invalid-argument' });
  assert.strictEqual(db.STORE.has('laskutus/2026-11/seurat/sibbo'), false);
  db = luoDb(sopimusSeura('sibbo'));
  const r = await K.varapolkuKasittelija(vpDeps(db, HKI_1_12_0130))({ kk: '2026-11' }, ctx('sa'));
  assert.strictEqual(r.kk, '2026-11'); assert.strictEqual(r.luotu, 1); assert.strictEqual(r.yhteensa_snt, 12500);
});

test('varapolku: oletus = edellinen kuukausi, myohassa: true myös 1. päivänä, tapa + ajaja_uid, audit uid:llä', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  const r = await K.varapolkuKasittelija(vpDeps(db, HKI_1_12_0600))({}, ctx('sa'));
  assert.deepStrictEqual(r, { kk: '2026-11', luotu: 1, on_jo: [], ohitettu: 0, virheet: [], yhteensa_snt: 12500 });
  const s = snap(db, '2026-11', 'sibbo');
  assert.strictEqual(s.myohassa, true); assert.strictEqual(s.tapa, 'varapolku'); assert.strictEqual(s.ajaja_uid, 'sa');
  const a = db.audit.find((x) => x.toiminto === 'laskutus_kuukausi_ajo');
  assert.ok(a.tapa === 'varapolku' && a.uid === 'sa' && a.myohassa === true);
});

test('varapolku ajastetun ajon jälkeen: ei korvaa (on_jo), ajastettu snapshot säilyy myohassa: false', async () => {
  const db = luoDb(sopimusSeura('sibbo'));
  await K.ajastettuKasittelija(deps(db, HKI_1_12_0600))();
  const r = await K.varapolkuKasittelija(vpDeps(db, HKI_3_12_1000))({ kk: '2026-11' }, ctx('sa'));
  assert.deepStrictEqual(r.on_jo, ['sibbo']); assert.strictEqual(r.luotu, 0);
  const s = snap(db, '2026-11', 'sibbo'); assert.strictEqual(s.tapa, 'ajastettu'); assert.strictEqual(s.myohassa, false);
  assert.ok(db.audit.find((x) => x.toiminto === 'laskutus_snapshot_on_jo' && x.uid === 'sa' && x.tapa === 'varapolku'));
});

test('varapolku: odottamaton virhe → internal (ei sisäistä viestiä selaimelle)', async () => {
  const db = luoDb(sopimusSeura('sibbo')); db.collection = (n) => { if (n === 'seurat') return { get: async () => { throw new Error('salainen polku'); } }; return luoDb({}).collection(n); };
  await assert.rejects(K.varapolkuKasittelija(vpDeps(db, HKI_3_12_1000))({}, ctx('sa')), (e) => e.code === 'internal' && !/salainen/.test(e.message));
});

test('index.js: laskutusKuukausiVarapolku = callable, europe-west1, App Check, onSuperAdminUid', () => {
  const CF = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const i = CF.indexOf('exports.laskutusKuukausiVarapolku = functions'); assert.ok(i > 0, 'export puuttuu');
  const lohko = CF.slice(i, CF.indexOf(';', i));
  assert.match(lohko, /\.region\('europe-west1'\)/); assert.match(lohko, /enforceAppCheck: true/);
  assert.match(lohko, /\.https\.onCall\(laskutusKuukausi\.varapolkuKasittelija\(/); assert.match(lohko, /onSuperAdminUid/);
});
