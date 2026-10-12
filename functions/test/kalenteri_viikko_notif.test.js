'use strict';
/**
 * K35-6c (D192) — viikkoilmoitus: Täytä viikko -erä (viikko_era) → perheille YKSI ilmoitus per kohde + ISO-viikko. Päätöslogiikka (pure) + handler (stubattu admin).
 */
const { test } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const N = require('../kalenteri_notif');
const { viikonRajat } = require('../helsinki_paiva');

const DELETE = Symbol('delete'), STORE = new Map();
const ts = (d) => ({ toDate: () => d, toMillis: () => d.getTime() });
const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
function colAt(polku, ehdot = []) {
  const q = { get: async () => { const docs = lapset(polku).filter((k) => ehdot.every(([f, v]) => (STORE.get(k) || {})[f] === v)).map((k) => ({ id: k.split('/').pop(), data: () => STORE.get(k), exists: true })); return { docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) }; },
    where: (f, op, v) => colAt(polku, ehdot.concat([[f, v]])), orderBy: () => q, limit: () => q, select: () => q };
  q.doc = (id) => docAt(polku + '/' + id); q.add = async (v) => { STORE.set(polku + '/auto' + STORE.size, v); return { id: 'auto' }; };
  return q;
}
function docAt(polku) {
  return { get: async () => (STORE.has(polku) ? { exists: true, data: () => STORE.get(polku), id: polku.split('/').pop() } : { exists: false, data: () => ({}), id: polku.split('/').pop() }),
    create: async (data) => { if (STORE.has(polku)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; } STORE.set(polku, Object.assign({}, data)); },
    set: async (data, opts) => { const cur = (opts && opts.merge && STORE.get(polku)) || {}; STORE.set(polku, Object.assign({}, cur, data)); },
    update: async () => ({}), delete: async () => { STORE.delete(polku); }, collection: (c) => colAt(polku + '/' + c) };
}
const fakeDb = { collection: (c) => colAt(c), collectionGroup: () => colAt('x'), doc: (p) => docAt(p), batch: () => ({ set() {}, update() {}, delete() {}, commit: async () => {} }) };
let tsN = 0; const fakeFirestore = () => fakeDb;
fakeFirestore.FieldValue = { serverTimestamp: () => ({ __ts: ++tsN }), delete: () => DELETE, increment: (n) => n, arrayUnion: (...a) => a, arrayRemove: (...a) => a };
fakeFirestore.Timestamp = { now: () => ts(new Date(0)), fromDate: (d) => ts(d) };
Object.defineProperty(admin, 'firestore', { configurable: true, value: fakeFirestore });
Object.defineProperty(admin, 'auth', { configurable: true, value: () => ({ verifyIdToken: async () => ({ uid: 'u' }), getUser: async () => ({ uid: 'u', customClaims: {} }) }) });
admin.initializeApp = () => ({ delete: async () => {} });
require('firebase-functions-test')();
const fns = require('../index.js');

const SID = 'kpv', NOTIF = (pid, id) => `seurat/${SID}/pelaajat/${pid}/notifikaatiot/${id}`;
const ma = (h) => Date.now() + h * 3600000;   // tulevaisuus
const ev = (o = {}) => Object.assign({ nimi: 'Treeni', tyyppi: 'harjoitus', alkaa: ts(new Date(ma(30))), paattyy: ts(new Date(ma(31.5))), joukkue: 'kpv_u13', joukkueet: ['kpv_u13'], kohde: { tyyppi: 'joukkue' }, viikko_era: 'era1', poistettu: false }, o);
function alusta() {
  STORE.clear(); STORE.set(`seurat/${SID}`, { nimi: 'KPV' });
  STORE.set(`seurat/${SID}/joukkueet/kpv_u13`, { nimi: 'KPV U13' });
  STORE.set(`seurat/${SID}/pelaajat/p1`, { joukkue: 'KPV U13', joukkueet: ['kpv_u13'] });
  STORE.set(`seurat/${SID}/pelaajat/p2`, { joukkue: 'KPV U13', joukkueet: ['kpv_u13'], notif_asetukset: { inapp: { enabled: false } } });
  STORE.set(`seurat/${SID}/pelaajat/p3`, { joukkue: 'Muu', joukkueet: ['muu'] });
}
const luo = async (id, d) => { STORE.set(`seurat/${SID}/kalenteri/${id}`, d); return fns.notifKalenteriViikko.run({ data: () => d }, { params: { sid: SID, tapahtumaId: id } }); };

test('viikkoKohde: joukkue id TAI nimi (legacy) → doc-id; ryhmä → ryhmän id; kohteeton (aamutreeni) → null', () => {
  const docs = [{ id: 'kpv_u13', nimi: 'KPV U13' }];
  assert.deepStrictEqual(N.viikkoKohde({ joukkue: 'kpv_u13' }, docs), { tyyppi: 'joukkue', id: 'kpv_u13' });
  assert.deepStrictEqual(N.viikkoKohde({ joukkue: 'KPV U13' }, docs), { tyyppi: 'joukkue', id: 'kpv_u13' });
  assert.deepStrictEqual(N.viikkoKohde({ joukkue: '', joukkueet: ['kpv_u13'] }, docs), { tyyppi: 'joukkue', id: 'kpv_u13' });
  assert.deepStrictEqual(N.viikkoKohde({ kohde: { tyyppi: 'ryhma', ryhma_id: 'mv' }, joukkue: 'kpv_u13' }, docs), { tyyppi: 'ryhma', id: 'mv' });
  assert.strictEqual(N.viikkoKohde({ kohde: { tyyppi: 'pelaajat' }, joukkue: null }, docs), null); assert.strictEqual(N.viikkoKohde({ joukkue: 'tuntematon' }, docs), null); assert.strictEqual(N.viikkoKohde(null, docs), null);
});
test('viikkoPaatos: tunniste kohde_ISO-viikko, rakenteinen sisältö vain viikko+maara (ei nimiä), linkki; päättynyt/peruttu/henkilökunta/poistettu → null', () => {
  const e = ev(), alku = e.alkaa.toMillis(), vk = viikonRajat(alku).tunniste, p = N.viikkoPaatos(e, { tyyppi: 'joukkue', id: 'kpv_u13' }, 4, new Date());
  assert.strictEqual(p.tyyppi, 'viikko'); assert.strictEqual(p.avain, 'kpv_u13_' + vk); assert.deepStrictEqual(p.ilmoitus, { tyyppi: 'viikko', viikko: vk, maara: 4 }); assert.strictEqual(p.linkki, 'kalenteri:viikko:' + vk); assert.ok(!/Treeni/.test(JSON.stringify(p)));
  const k = { tyyppi: 'joukkue', id: 'x' }, nyt = new Date();
  assert.strictEqual(N.viikkoPaatos(ev({ alkaa: ts(new Date(ma(-30))), paattyy: ts(new Date(ma(-29))) }), k, 1, nyt), null);
  for (const o of [{ tila: 'peruttu' }, { poistettu: true }, { nakyvyys: 'henkilokunta' }]) assert.strictEqual(N.viikkoPaatos(ev(o), k, 1, nyt), null, JSON.stringify(o));
  assert.strictEqual(N.viikkoPaatos(e, null, 1, nyt), null);
});
test('NELJÄ tapahtumaa samasta erästä → perheelle YKSI ilmoitus viikko_<jid>_<viikko> (ei neljää); lukumäärä = 4; opt-out ja muu joukkue eivät saa', async () => {
  alusta();
  const evs = [30, 54, 78, 102].map((h) => ev({ alkaa: ts(new Date(ma(h))), paattyy: ts(new Date(ma(h + 1.5))) }));
  evs.forEach((e, i) => STORE.set(`seurat/${SID}/kalenteri/e${i}`, e));   // erä kirjoitetaan kerralla (batch), sitten triggerit
  for (let i = 0; i < 4; i++) await fns.notifKalenteriViikko.run({ data: () => evs[i] }, { params: { sid: SID, tapahtumaId: 'e' + i } });
  const vk = viikonRajat(evs[0].alkaa.toMillis()).tunniste, id = 'viikko_kpv_u13_' + vk, d = STORE.get(NOTIF('p1', id));
  assert.ok(d, 'ilmoitus luotu: ' + id);
  assert.deepStrictEqual([d.tyyppi, d.dedupe, d.luettu, d.linkki], ['viikko', id, false, 'kalenteri:viikko:' + vk]); assert.strictEqual(d.ilmoitus.maara, 4); assert.strictEqual(d.ilmoitus.viikko, vk); assert.ok(!('nimi' in d.ilmoitus));
  assert.strictEqual([...STORE.keys()].filter((k) => k.startsWith(`seurat/${SID}/pelaajat/p1/notifikaatiot/`)).length, 1, 'yksi ilmoitus, ei yksi per tapahtuma');
  assert.strictEqual(STORE.has(NOTIF('p2', id)), false, 'opt-out'); assert.strictEqual([...STORE.keys()].some((k) => k.startsWith(`seurat/${SID}/pelaajat/p3/notifikaatiot/`)), false, 'muu joukkue ei saa');
  assert.ok(STORE.has(`seurat/${SID}/notifikaatio_erat/kpv_u13_${vk}`), 'fan-out-marker');
});
test('toinen erä samalle viikolle EI tee uutta eikä nollaa luettua; seuraava viikko saa oman', async () => {
  alusta();
  const a = ev(); await luo('a1', a); const vk = viikonRajat(a.alkaa.toMillis()).tunniste, id = 'viikko_kpv_u13_' + vk;
  STORE.get(NOTIF('p1', id)).luettu = true;
  await luo('b1', ev({ viikko_era: 'era2' }));   // toinen erä, sama viikko
  assert.strictEqual(STORE.get(NOTIF('p1', id)).luettu, true); assert.strictEqual([...STORE.keys()].filter((k) => k.startsWith(`seurat/${SID}/pelaajat/p1/notifikaatiot/`)).length, 1);
  await luo('c1', ev({ viikko_era: 'era3', alkaa: ts(new Date(ma(30 + 24 * 8))), paattyy: ts(new Date(ma(31.5 + 24 * 8))) }));
  assert.strictEqual([...STORE.keys()].filter((k) => k.startsWith(`seurat/${SID}/pelaajat/p1/notifikaatiot/`)).length, 2, 'uusi viikko → oma ilmoitus');
});
test('ilman viikko_era (Uusi tapahtuma, sarja) / aamutreeni ilman kohdetta / henkilökunta / menneen viikon täyttö → ei ilmoitusta', async () => {
  alusta();
  const e1 = ev(); delete e1.viikko_era; await luo('x1', e1);
  await luo('x2', ev({ joukkue: null, joukkueet: [], kohde: { tyyppi: 'pelaajat' } })); await luo('x3', ev({ nakyvyys: 'henkilokunta' }));
  await luo('x4', ev({ alkaa: ts(new Date(ma(-30))), paattyy: ts(new Date(ma(-29))) }));
  assert.strictEqual([...STORE.keys()].filter((k) => k.includes('/notifikaatiot/')).length, 0); assert.strictEqual([...STORE.keys()].filter((k) => k.includes('/notifikaatio_erat/')).length, 0);
});
test('ryhmän erä: ilmoitus ryhmän pelaajille (pelaajat_id), tunniste viikko_<ryhmä>_<viikko>, neutraali sisältö', async () => {
  alusta(); STORE.set(`seurat/${SID}/pelaajat/p3`, { joukkue: 'Muu', joukkueet: ['muu'] });
  const e = ev({ joukkue: null, joukkueet: [], kohde: { tyyppi: 'ryhma', ryhma_id: 'mv', ryhma_nimi: 'Maalivahdit' }, pelaajat_id: ['p3'] }); await luo('g1', e);
  const vk = viikonRajat(e.alkaa.toMillis()).tunniste, id = 'viikko_mv_' + vk;
  assert.ok(STORE.has(NOTIF('p3', id))); assert.strictEqual(STORE.has(NOTIF('p1', id)), false); assert.ok(!/Maalivahdit/.test(JSON.stringify(STORE.get(NOTIF('p3', id)))));
});
test('epäonnistunut fan-out vapauttaa varauksen (seuraava erä voi yrittää uudelleen)', async () => {
  alusta(); const orig = fakeDb.collection;
  const e = ev(); STORE.set(`seurat/${SID}/kalenteri/f1`, e);
  const col = fakeDb.collection; fakeDb.collection = () => { throw new Error('boom'); };
  await assert.rejects(() => fns.notifKalenteriViikko.run({ data: () => e }, { params: { sid: SID, tapahtumaId: 'f1' } }));
  fakeDb.collection = col;
  assert.strictEqual([...STORE.keys()].some((k) => k.includes('/notifikaatio_erat/')), false);
});
