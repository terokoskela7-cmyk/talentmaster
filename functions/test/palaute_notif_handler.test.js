'use strict';
/**
 * E2E-savutesti (offline) — Node 22 + firebase-functions 6.6.0 (1st-gen /v1).
 * (Handler-testi: notifPalauteJaettu.) Tarkoitus: todistaa että SDK-major-noston jälkeen 1st-gen-handlerit kutsutaan oikealla
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
const DOCS = {};
const LISATYT = [];
function docAt(path) {
  const d = fakeDocRef();
  d.get = async () => (DOCS[path] === undefined ? fakeSnap() : { exists: true, data: () => DOCS[path], id: path.split('/').pop() });
  d.collection = (c) => collAt(path + '/' + c);
  return d;
}
function collAt(path) { const q = fakeQuery(); q.doc = (id) => docAt(path + '/' + id); q.add = async (v) => { LISATYT.push({ path, v }); return { id: 'uusi' }; }; return q; }
const fakeDb = {
  collection: (c) => collAt(c),
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


// notifPalauteJaettu: teksti kertoo kuka / mitä / milloin; ohitussääntö (oma palaute → ei notifia) ennallaan.
const ARV = 'seurat/kpv/harjoitusarvioinnit/a1';
function aja(palaute) {
  LISATYT.length = 0;
  return fns.notifPalauteJaettu.run({ data: () => palaute }, { params: { sid: 'kpv', aid: 'a1' } }).then(() => LISATYT.slice());
}
test('äänipalaute: kuka (etunimi palvelimelta) + mitä + milloin + joukkue; rakenteiset kentät talletetaan', async () => {
  DOCS[ARV] = { valmentajaUid: 'val1', pvm: '2026-10-02', joukkue: 'KPV U13' };
  DOCS['seurat/kpv/kayttajat/vp1'] = { etunimi: 'Rasmus', rooli: 'vp' };
  const l = await aja({ tekija_uid: 'vp1', tekija_rooli: 'vp', audio_url: 'https://x/y.webm', teksti: '' });
  assert.strictEqual(l.length, 1);
  assert.strictEqual(l[0].path, 'seurat/kpv/kayttajat/val1/notifikaatiot');
  const n = l[0].v;
  assert.strictEqual(n.teksti, 'Rasmus antoi äänipalautetta harjoituksestasi 2.10. (KPV U13).');
  assert.deepStrictEqual([n.tyyppi, n.tekija_etunimi, n.onAani, n.joukkue, n.pvm], ['palaute', 'Rasmus', true, 'KPV U13', '2026-10-02']);
  assert.deepStrictEqual(n.linkki, { nakyma: 'palaute', aid: 'a1' });
  assert.strictEqual(n.luettu, false);
});
test('tekstipalaute, etunimi puuttuu → rooli selkokielellä; ei pelaajien nimiä', async () => {
  DOCS[ARV] = { valmentajaUid: 'val1', pvm: '2026-10-02', joukkue: 'KPV U13', pelaajaNimi: 'Testi Pelaaja' };
  DOCS['seurat/kpv/kayttajat/vp2'] = { rooli: 'vp' };
  const l = await aja({ tekija_uid: 'vp2', teksti: 'Hyvä!' });
  assert.strictEqual(l[0].v.teksti, 'Valmennuspäällikkö antoi palautetta harjoituksestasi 2.10. (KPV U13).');
  assert.strictEqual(l[0].v.onAani, false);
  assert.ok(!JSON.stringify(l[0].v).includes('Testi Pelaaja'));
});
test('päivä ja joukkue puuttuvat → silti kelvollinen teksti', async () => {
  DOCS[ARV] = { valmentajaUid: 'val1' };
  const l = await aja({ tekija_uid: 'tuntematon', tekija_rooli: 'valmentaja', teksti: 'x' });
  assert.strictEqual(l[0].v.teksti, 'Valmentaja antoi palautetta harjoituksestasi.');
  assert.strictEqual(l[0].v.pvm, null);
});
test('ohitussääntö: oma palaute (tekija_uid == valmentajaUid) → ei notifia', async () => {
  DOCS[ARV] = { valmentajaUid: 'val1', pvm: '2026-10-02', joukkue: 'KPV U13' };
  const l = await aja({ tekija_uid: 'val1', teksti: 'oma' });
  assert.strictEqual(l.length, 0);
});
test('arviointia ei löydy / valmentajaUid puuttuu → ei notifia', async () => {
  delete DOCS[ARV];
  assert.strictEqual((await aja({ tekija_uid: 'vp1', teksti: 'x' })).length, 0);
  DOCS[ARV] = { joukkue: 'U9' };
  assert.strictEqual((await aja({ tekija_uid: 'vp1', teksti: 'x' })).length, 0);
});
after(() => fft.cleanup());
