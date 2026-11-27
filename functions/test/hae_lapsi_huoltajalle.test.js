'use strict';
/**
 * email_verified PR c (Rules v3.81, PM 6.11.2026): haeLapsiHuoltajalle palauttaa lapset VAIN vahvistetulle sähköpostille.
 * Vahvistamaton (false / puuttuu) → { found:false, lapset:[], vahvistamatta:true } ilman Firestore-hakua (ei nimiä, seuraa eikä joukkuetta).
 * Offline: firebase-admin stubattu kuten e2e_node22.test.js.
 */
const { test, after } = require('node:test');
const HAUT = [];
const LAPSI = { id: 'p1', data: () => ({ etunimi: 'Testi', sukunimi: 'Lapsi', joukkue: 'U12', syntymaVuosi: 2014 }),
  ref: { parent: { parent: { id: 'fcl', parent: { id: 'seurat' } } } } };
const assert = require('node:assert');

// ── Stub firebase-admin ENNEN index.js:n latausta (index.js kutsuu admin.firestore()/auth() moduulitasolla) ──
const admin = require('firebase-admin');

function fakeSnap() { return { exists: false, empty: true, size: 0, docs: [], data: () => ({}), id: 'fake', forEach() {} }; }
function fakeQuery() {
  const q = {};
  ['where', 'orderBy', 'limit', 'select'].forEach((m) => { q[m] = () => q; });
  q.get = async () => fakeSnap();
  q.add = async () => ({ id: 'new' });
  q.doc = () => fakeDocRef();
  return q;
}
function fakeDocRef() {
  const d = {};
  d.get = async () => fakeSnap();
  d.set = async () => ({});
  d.update = async () => ({});
  d.delete = async () => ({});
  d.collection = () => fakeQuery();
  return d;
}
const fakeDb = {
  collection: () => fakeQuery(),
  collectionGroup: (c) => { HAUT.push(c); const q = fakeQuery(); q.get = async () => ({ empty: false, size: 1, docs: [LAPSI] }); return q; },
  doc: () => fakeDocRef(),
  batch: () => ({ set() {}, update() {}, delete() {}, commit: async () => {} }),
};
// admin.firestore/auth ovat getter-only-namespaceja → defineProperty (configurable), ei suora '='.
const fakeFirestore = () => fakeDb;
fakeFirestore.FieldValue = { serverTimestamp: () => '__ts__', increment: (n) => n, arrayUnion: (...a) => a, arrayRemove: (...a) => a };
fakeFirestore.Timestamp = { now: () => ({ toDate: () => new Date(0), toMillis: () => 0 }), fromDate: (dd) => ({ toDate: () => dd, toMillis: () => dd.getTime() }) };
Object.defineProperty(admin, 'firestore', { configurable: true, value: fakeFirestore });
Object.defineProperty(admin, 'auth', { configurable: true, value: () => ({
  verifyIdToken: async () => ({ uid: 'test-uid' }),
  getUserByEmail: async () => { const e = new Error('not found'); e.code = 'auth/user-not-found'; throw e; },
  createUser: async () => ({ uid: 'created-uid' }),
  setCustomUserClaims: async () => {},
  getUser: async () => ({ uid: 'test-uid', customClaims: {} }),
}) });
admin.initializeApp = () => ({ delete: async () => {} });   // index.js init + fft.cleanup() kutsuu app.delete()

// firebase-functions-test ilman argumentteja = OFFLINE-tila (ei verkkoa, ei projektia)
const fft = require('firebase-functions-test')();
// Vasta nyt: lataa funktiot (SDK 6.6.0 + firebase-functions/v1 + stubattu admin)
const fns = require('../index.js');

const kutsu = (token) => fft.wrap(fns.haeLapsiHuoltajalle)({}, { auth: { uid: 'h1', token } });
after(() => fft.cleanup());

test('vahvistettu sähköposti → lapset löytyvät (haku tehdään)', async () => {
  HAUT.length = 0;
  const r = await kutsu({ email: 'huoltaja@test.fi', email_verified: true });
  assert.strictEqual(r.found, true); assert.strictEqual(r.lapset.length, 1); assert.strictEqual(r.lapset[0].etunimi, 'Testi');
  assert.strictEqual(r.vahvistamatta, undefined); assert.deepStrictEqual(HAUT, ['pelaajat']);
});
for (const [nimi, token] of [['email_verified false', { email: 'huoltaja@test.fi', email_verified: false }], ['email_verified puuttuu', { email: 'huoltaja@test.fi' }], ['email_verified merkkijono "true"', { email: 'huoltaja@test.fi', email_verified: 'true' }]]) {
  test(nimi + ' → ei lapsia, ei hakua, vahvistamatta: true', async () => {
    HAUT.length = 0;
    const r = await kutsu(token);
    assert.deepStrictEqual(r, { found: false, lapset: [], vahvistamatta: true });
    assert.deepStrictEqual(HAUT, []);
  });
}
test('ilman emailia → unauthenticated (ennallaan)', async () => {
  await assert.rejects(() => kutsu({ email_verified: true }), (e) => e.code === 'unauthenticated');
});
