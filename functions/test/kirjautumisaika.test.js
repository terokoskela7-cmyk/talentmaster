'use strict';
/**
 * Avauskirjoitukset palvelimelle, PR A: functions/kirjautumisaika.js mock-Firestorella ja mock-Authilla (ei emulaattoria).
 * PM 8.11.2026 P2 (c2): aika = max(lastRefreshTime, lastSignInTime), kirjoitus vain kun Helsingin päivä on uudempi, vain seurat/{sid}/kayttajat/{uid}.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const K = require('../kirjautumisaika');

const Timestamp = { fromMillis: (ms) => ({ __ts: ms, toMillis: () => ms }) };
const HKI_8_11_2330 = Date.UTC(2026, 10, 8, 21, 30);   // su 8.11.2026 klo 23.30 Helsinki (EET +2)
const HKI_9_11_0030 = Date.UTC(2026, 10, 8, 22, 30);   // ma 9.11. klo 0.30 Helsinki — UTC:ssä vielä 8.11.
const HKI_9_11_1200 = Date.UTC(2026, 10, 9, 10, 0);
const authAika = (ms) => new Date(ms).toUTCString();   // Admin SDK:n metadata-merkkijonomuoto

function luo(docs, authKayttajat, opts) {
  opts = opts || {}; const STORE = new Map(Object.entries(docs)); const kirjoitukset = []; const getUsersKutsut = [];
  const db = {
    collectionGroup: (n) => ({ get: async () => ({ docs: [...STORE.keys()].filter((k) => k.split('/').slice(-2, -1)[0] === n).map((k) => ({ ref: { path: k }, data: () => STORE.get(k) })) }) }),
    doc: (p) => ({ path: p }),
    batch: () => { const ops = []; return { update: (ref, d) => ops.push([ref.path, d]), commit: async () => { if (opts.kirjoitusVirhe) throw new Error('mock commit'); ops.forEach(([p, d]) => { kirjoitukset.push([p, d]); STORE.set(p, Object.assign({}, STORE.get(p), d)); }); } }; },
  };
  const auth = { getUsers: async (ids) => {
    getUsersKutsut.push(ids.length); if (ids.length > 100) throw new Error('getUsers > 100');
    if (opts.authVirheEra === getUsersKutsut.length) throw new Error('mock auth');
    return { users: ids.map((i) => authKayttajat[i.uid]).filter(Boolean), notFound: [] };
  } };
  const lokit = []; const loki = { log: (s) => lokit.push(s), error: (s) => lokit.push(s) };
  return { STORE, kirjoitukset, getUsersKutsut, lokit, deps: { db, auth, Timestamp, loki } };
}

test('helsinginPaiva: Helsingin päivä, ei UTC (klo 0.30 Helsingissä on jo seuraava päivä)', () => {
  assert.strictEqual(K.helsinginPaiva(HKI_8_11_2330), '2026-11-08');
  assert.strictEqual(K.helsinginPaiva(HKI_9_11_0030), '2026-11-09');
  assert.strictEqual(K.helsinginPaiva(null), null);
});

test('authAktiivisuusMs: max(lastRefreshTime, lastSignInTime); puuttuva → null', () => {
  assert.strictEqual(K.authAktiivisuusMs({ metadata: { lastSignInTime: authAika(HKI_8_11_2330), lastRefreshTime: authAika(HKI_9_11_1200) } }), HKI_9_11_1200);
  assert.strictEqual(K.authAktiivisuusMs({ metadata: { lastSignInTime: authAika(HKI_9_11_1200), lastRefreshTime: null } }), HKI_9_11_1200);
  assert.strictEqual(K.authAktiivisuusMs({ metadata: {} }), null);
  assert.strictEqual(K.authAktiivisuusMs(null), null);
});

test('paivitettavat: uusi päivä → kirjoitus; sama Helsingin päivä → ei; vanhempi → ei (ei koskaan taaksepäin); puuttuva kenttä → kirjoitus', () => {
  const ts = (ms) => ({ toMillis: () => ms });
  const ajat = new Map([['a', HKI_9_11_0030], ['b', HKI_9_11_1200], ['c', HKI_8_11_2330], ['d', HKI_9_11_1200]]);
  const r = K.paivitettavat([
    { polku: 'seurat/s/kayttajat/a', uid: 'a', nykyinen: ts(HKI_8_11_2330) },   // 8.11. → 9.11. (UTC:ssä sama päivä!)
    { polku: 'seurat/s/kayttajat/b', uid: 'b', nykyinen: ts(HKI_9_11_0030) },   // sama päivä 9.11.
    { polku: 'seurat/s/kayttajat/c', uid: 'c', nykyinen: ts(HKI_9_11_1200) },   // Auth vanhempi kuin kenttä
    { polku: 'seurat/s/kayttajat/d', uid: 'd', nykyinen: undefined },           // §0-tyhjä täyttyy
    { polku: 'seurat/s/kayttajat/e', uid: 'e', nykyinen: undefined },           // ei Auth-aikaa → ei kirjoitusta
  ], ajat);
  assert.deepStrictEqual(r.map((x) => x.polku), ['seurat/s/kayttajat/a', 'seurat/s/kayttajat/d']);
});

test('aja: vain seurat/{sid}/kayttajat/{uid}, kenttä Timestampina, ylätason /kayttajat ja muut kokoelmat ohitetaan', async () => {
  const m = luo({
    'seurat/kpv/kayttajat/u1': { rooli: 'vp' },
    'seurat/sjk/kayttajat/u1': { rooli: 'valmentaja', viimeisinKirjautuminen: { toMillis: () => HKI_8_11_2330 } },
    'kayttajat/u1': { rooli: 'x' },
    'seurat/kpv/pelaajat/p1': { nimi: 'ei koskaan' },
  }, { u1: { uid: 'u1', metadata: { lastSignInTime: authAika(HKI_8_11_2330), lastRefreshTime: authAika(HKI_9_11_1200) } } });
  const t = await K.aja(m.deps);
  assert.deepStrictEqual(m.kirjoitukset.map((k) => k[0]).sort(), ['seurat/kpv/kayttajat/u1', 'seurat/sjk/kayttajat/u1']);
  for (const [, d] of m.kirjoitukset) { assert.deepStrictEqual(Object.keys(d), ['viimeisinKirjautuminen']); assert.strictEqual(d.viimeisinKirjautuminen.toMillis(), HKI_9_11_1200); }
  assert.deepStrictEqual(m.STORE.get('kayttajat/u1'), { rooli: 'x' });
  assert.deepStrictEqual(t, { kayttajia: 2, authLoytyi: 1, paivitetty: 2, virheita: 0 });
  assert.deepStrictEqual(m.getUsersKutsut, [1], 'sama uid kahdessa seurassa haetaan Authista kerran');
});

test('aja: idempotentti — toinen ajo samana päivänä ei kirjoita', async () => {
  const m = luo({ 'seurat/kpv/kayttajat/u1': {} }, { u1: { uid: 'u1', metadata: { lastRefreshTime: authAika(HKI_9_11_1200) } } });
  await K.aja(m.deps); const t2 = await K.aja(m.deps);
  assert.strictEqual(m.kirjoitukset.length, 1); assert.strictEqual(t2.paivitetty, 0);
});

test('aja: getUsers 100 uid:n erissä; yhden erän virhe ei kaada muita', async () => {
  const docs = {}, auth = {};
  for (let i = 0; i < 250; i++) { docs['seurat/s/kayttajat/u' + i] = {}; auth['u' + i] = { uid: 'u' + i, metadata: { lastRefreshTime: authAika(HKI_9_11_1200) } }; }
  const m = luo(docs, auth, { authVirheEra: 2 });
  const t = await K.aja(m.deps);
  assert.deepStrictEqual(m.getUsersKutsut, [100, 100, 50]);
  assert.strictEqual(t.paivitetty, 150); assert.strictEqual(t.virheita, 1);
});

test('aja: kirjoitusvirhe kirjataan, ei heitä; loki sisältää vain lukumäärät (ei uid:eitä)', async () => {
  const m = luo({ 'seurat/kpv/kayttajat/salainenUid123': {} }, { salainenUid123: { uid: 'salainenUid123', metadata: { lastRefreshTime: authAika(HKI_9_11_1200) } } }, { kirjoitusVirhe: true });
  const t = await K.aja(m.deps);
  assert.strictEqual(t.virheita, 1); assert.strictEqual(t.paivitetty, 0);
  assert.ok(m.lokit.every((s) => s.indexOf('salainenUid123') < 0), m.lokit.join('\n'));
});

test('index.js: kirjautumisaikaYo kytketty, klo 3.30 Europe/Helsinki, europe-west1, moduuli vain require + käsittelijä', () => {
  const s = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const i = s.indexOf('exports.kirjautumisaikaYo'); assert.ok(i > 0);
  const blk = s.slice(i, s.indexOf(';', s.indexOf('.onRun(', i)) + 1);
  for (const x of ["region('europe-west1')", "schedule('30 3 * * *')", "timeZone('Europe/Helsinki')", "require('./kirjautumisaika').ajastettuKasittelija"]) assert.ok(blk.indexOf(x) >= 0, x);
});
