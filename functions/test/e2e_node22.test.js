'use strict';
/**
 * E2E-savutesti (offline) — Node 22 + firebase-functions 6.6.0 (1st-gen /v1).
 * Tarkoitus: todistaa että SDK-major-noston jälkeen 1st-gen-handlerit kutsutaan oikealla
 * signaturella (onCall (data,context) · onRequest (req,res) · onRun(context) · onCreate(snap,context))
 * eikä logger/secrets/context-breaking riko niitä. EI testaa liiketoimintalogiikkaa — vain SDK-plumbing.
 * Ajetaan node:test-runnerilla (offline, ei verkkoa, ei GCP-projektia): `npm test` (functions/).
 */
const { test, after } = require('node:test');
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
  collectionGroup: () => fakeQuery(),
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

// ── 1) onCall (data, context) + HttpsError — luoKayttaja ──
test('luoKayttaja: ilman autentikointia → HttpsError unauthenticated', async () => {
  const wrapped = fft.wrap(fns.luoKayttaja);
  await assert.rejects(() => wrapped({}, {}), (e) => e.code === 'unauthenticated');
});
test('luoKayttaja: auth + virheellinen email → HttpsError invalid-argument', async () => {
  const wrapped = fft.wrap(fns.luoKayttaja);
  await assert.rejects(
    () => wrapped({ email: 'ei-emailia' }, { auth: { uid: 'u', token: {} } }),
    (e) => e.code === 'invalid-argument'
  );
});

// ── 2) onRequest (req, res) — aiProxy (https) ──
function mockRes() {
  const r = { _status: null, _json: null, _headers: {}, _body: null };
  r.set = (k, v) => { r._headers[k] = v; return r; };
  r.status = (c) => { r._status = c; return r; };
  r.json = (o) => { r._json = o; return r; };
  r.send = (s) => { r._body = s; return r; };
  return r;
}
test('aiProxy: POST ilman Bearer-tokenia → 401 UNAUTHORIZED', async () => {
  const res = mockRes();
  await fns.aiProxy({ method: 'POST', headers: {}, body: {} }, res);
  assert.strictEqual(res._status, 401);
  assert.strictEqual(res._json.code, 'UNAUTHORIZED');
});
test('aiProxy: OPTIONS → 204 (CORS-preflight)', async () => {
  const res = mockRes();
  await fns.aiProxy({ method: 'OPTIONS', headers: {}, body: {} }, res);
  assert.strictEqual(res._status, 204);
});

// ── 3) pubsub.schedule(...).onRun(context) — notifReviewEraantyy (ajastettu) ──
test('notifReviewEraantyy (ajastettu): onRun ajaa läpi ilman heittoa', async () => {
  const wrapped = fft.wrap(fns.notifReviewEraantyy);
  await assert.doesNotReject(() => wrapped({}));   // tyhjä db → silmukka ei aja → resolvaa
});

// ── 4) firestore.document(...).onCreate(snap, context) — notifPalauteJaettu (trigger) ──
// Käytetään v1 CloudFunction.run(snap, context):ia (SDK:n oma handler-invoker) — makeDocumentSnapshot
// vaatisi stubbaamattoman firestore-servicen (snapshot_), mikä on ristiriidassa offline-db-stubin kanssa.
// Handler käyttää vain snap.data() + context.params → rakennetaan minimaalinen snapshot käsin.
test('notifPalauteJaettu (trigger): onCreate(snap,context) ilman heittoa', async () => {
  const snap = { data: () => ({ tekija_uid: 'joku', teksti: 'x' }) };
  await assert.doesNotReject(() => fns.notifPalauteJaettu.run(snap, { params: { sid: 's1', aid: 'a1' } }));
});

after(() => fft.cleanup());
