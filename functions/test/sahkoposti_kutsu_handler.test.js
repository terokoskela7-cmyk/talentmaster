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
const DOCS = {};
function docAt(path) {
  const d = fakeDocRef();
  d.get = async () => (DOCS[path] === undefined ? fakeSnap() : { exists: true, data: () => DOCS[path], id: path.split('/').pop(), get: (k) => DOCS[path][k] });
  d.collection = (c) => collAt(path + '/' + c);
  return d;
}
function collAt(path) { const q = fakeQuery(); q.doc = (id) => docAt(path + '/' + id); return q; }
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


// Handler-testi: lahetaRekisteriKutsu käyttää seuran nimeä palvelimelta. SendGrid-stub napaa lähtevän payloadin.
const https = require('https');
const lahetetyt = [];
https.request = (opts, cb) => ({ on() {}, write(p) { lahetetyt.push(JSON.parse(p)); }, end() { cb({ statusCode: 202, on(ev, f) { if (ev === 'end') f(); } }); } });
process.env.SENDGRID_API_KEY = 'SG.testikey123';

const SIVU = 'https://talentmasterid.com/TalentMaster_Rekisterointi_Suostumus.html';
test('lahetaRekisteriKutsu: selaimen seura=Väärä Seura ohitetaan → viestissä, fromNamessa ja linkissä seuran oikea nimi', async () => {
  DOCS['seurat/s1'] = { nimi: 'FC Oikea', vp_uid: 'vp1' };
  const wrapped = fft.wrap(fns.lahetaRekisteriKutsu);
  await wrapped({
    seuraId: 's1', seura: 'Väärä Seura', hEmail: 'huoltaja@oikeaosoite.fi', etunimi: 'Ella', sukunimi: 'K',
    linkki: SIVU + '?seuraId=s1&seura=V%C3%A4%C3%A4r%C3%A4%20Seura&pelaajaId=p1&suostumusAnnettu=2026-09-30',
  }, { auth: { uid: 'vp1', token: {} } });
  const p = lahetetyt[lahetetyt.length - 1];
  assert.ok(p, 'viesti lähti');
  assert.strictEqual(p.from.name, 'FC Oikea');
  assert.ok(p.subject.startsWith('FC Oikea'));
  const html = p.content[0].value;
  assert.ok(html.includes('FC Oikea') && !html.includes('Väärä Seura') && !html.includes('V%C3%A4%C3%A4r%C3%A4'));
  assert.ok(html.includes('seura=FC+Oikea') && html.includes('suostumusAnnettu=2026-09-30'));
});
test('lahetaRekisteriKutsu: vieras linkki → invalid-argument, ei lähetystä', async () => {
  const n = lahetetyt.length;
  const wrapped = fft.wrap(fns.lahetaRekisteriKutsu);
  await assert.rejects(() => wrapped({ seuraId: 's1', hEmail: 'huoltaja@oikeaosoite.fi', linkki: 'https://evil.example/' },
    { auth: { uid: 'vp1', token: {} } }), (e) => e.code === 'invalid-argument');
  assert.strictEqual(lahetetyt.length, n);
});
after(() => fft.cleanup());
