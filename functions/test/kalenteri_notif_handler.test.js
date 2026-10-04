'use strict';
/**
 * V2 P0.4 PR 2 — kalenteri-ilmoitusten handlerit (notifKalenteriMuutos, notifTapahtumaMuistutus) index.js:n läpi, stubattu admin.
 * Todistaa kytkennän: kiinteä dokumenttitunniste (muutos_<evId> …), idempotenssi, tapahtuma_alkaa, tämän päivän koko päivän tapahtuma → ilmoitus.
 * Kello: oikea "nyt" — tapahtumat johdetaan siitä Helsingin rajoilla (testi ei riipu kellonajasta).
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const { huomisenRajat } = require('../helsinki_paiva');

const DELETE = Symbol('delete');
const STORE = new Map();   // polku → data
const ts = (d) => ({ toDate: () => d, toMillis: () => d.getTime() });
const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
const snap = (polku) => { const docs = lapset(polku).map((k) => ({ id: k.split('/').pop(), data: () => STORE.get(k), exists: true, ref: null })); return { docs, empty: !docs.length, size: docs.length, forEach: (cb) => docs.forEach(cb) }; };
function colAt(polku) {
  const q = { get: async () => snap(polku), where: () => q, orderBy: () => q, limit: () => q, select: () => q };
  q.doc = (id) => docAt(polku + '/' + id);
  q.add = async (v) => { STORE.set(polku + '/auto' + STORE.size, v); return { id: 'auto' }; };
  return q;
}
function docAt(polku) {
  return {
    get: async () => (STORE.has(polku) ? { exists: true, data: () => STORE.get(polku), id: polku.split('/').pop() } : { exists: false, data: () => ({}), id: polku.split('/').pop() }),
    create: async (data) => { if (STORE.has(polku)) { const e = new Error('6 ALREADY_EXISTS'); e.code = 6; throw e; } STORE.set(polku, Object.assign({}, data)); },
    set: async (data, opts) => {
      if (!(opts && opts.merge) && Object.values(data).includes(DELETE)) throw new Error('FieldValue.delete() vaatii merge:true (kuten oikea Firestore)');
      const cur = (opts && opts.merge && STORE.get(polku)) || {}; const next = Object.assign({}, cur);
      Object.keys(data).forEach((k) => { if (data[k] === DELETE) delete next[k]; else next[k] = data[k]; });
      STORE.set(polku, next);
    },
    update: async () => ({}), delete: async () => ({}), collection: (c) => colAt(polku + '/' + c),
  };
}
const fakeDb = { collection: (c) => colAt(c), collectionGroup: () => colAt('x'), doc: (p) => docAt(p), batch: () => ({ set() {}, update() {}, delete() {}, commit: async () => {} }) };
let tsN = 0;
const fakeFirestore = () => fakeDb;
fakeFirestore.FieldValue = { serverTimestamp: () => ({ __ts: ++tsN }), delete: () => DELETE, increment: (n) => n, arrayUnion: (...a) => a, arrayRemove: (...a) => a };
fakeFirestore.Timestamp = { now: () => ts(new Date(0)), fromDate: (d) => ts(d) };
Object.defineProperty(admin, 'firestore', { configurable: true, value: fakeFirestore });
Object.defineProperty(admin, 'auth', { configurable: true, value: () => ({ verifyIdToken: async () => ({ uid: 'u' }), getUser: async () => ({ uid: 'u', customClaims: {} }) }) });
admin.initializeApp = () => ({ delete: async () => {} });
const fft = require('firebase-functions-test')();
const fns = require('../index.js');

const SID = 'kpv';
const NOTIF = (pid, id) => `seurat/${SID}/pelaajat/${pid}/notifikaatiot/${id}`;
function alusta() {
  STORE.clear();
  STORE.set(`seurat/${SID}`, { nimi: 'KPV' });
  STORE.set(`seurat/${SID}/pelaajat/p1`, { joukkue: 'KPV U13', joukkueet: ['kpv_u13'] });
  STORE.set(`seurat/${SID}/pelaajat/p2`, { joukkue: 'KPV U13', joukkueet: ['kpv_u13'], notif_asetukset: { inapp: { enabled: false } } });   // opt-out
  STORE.set(`seurat/${SID}/pelaajat/p3`, { joukkue: 'Muu joukkue' });
}
const muutos = (before, after, evId = 'ev1') => fns.notifKalenteriMuutos.run({ before: { data: () => before }, after: { data: () => after } }, { params: { sid: SID, tapahtumaId: evId } });
const tanaanHelsinki = () => { const nyt = new Date(); const h = huomisenRajat(new Date(nyt.getTime() - 86400000)); return h.alku; };   // tämän Helsingin päivän keskiyö (eilisen "huominen")

test('muutos: tämän päivän koko päivän tapahtuma → ilmoitus kiinteällä tunnisteella + tapahtuma_alkaa (ennen: alkaa < now → ei mitään)', async () => {
  alusta();
  const alku = ts(tanaanHelsinki());
  const ev = (paikka) => ({ nimi: 'Leiri', koko_paiva: true, alkaa: alku, joukkue: 'kpv_u13', paikka });
  await muutos(ev('A'), ev('B'));
  const d = STORE.get(NOTIF('p1', 'muutos_ev1'));
  assert.ok(d, 'muutos_ev1 luotu');
  assert.deepStrictEqual([d.tyyppi, d.teksti, d.linkki, d.dedupe, d.luettu], ['muutos', 'Muutos: Leiri · B', 'kalenteri:ev1', 'muutos_ev1', false]);
  assert.strictEqual(d.tapahtuma_alkaa, alku);
  assert.strictEqual(STORE.has(NOTIF('p2', 'muutos_ev1')), false, 'opt-out kunnioitetaan');
  assert.strictEqual(STORE.has(NOTIF('p3', 'muutos_ev1')), false, 'muun joukkueen pelaaja ei saa');
});

test('muutos: kaksi muutosta peräkkäin → YKSI dokumentti, päivittyy; luettu → luettu:false', async () => {
  alusta();
  const a1 = ts(new Date(Date.now() + 3 * 3600000)), a2 = ts(new Date(Date.now() + 5 * 3600000)), a3 = ts(new Date(Date.now() + 7 * 3600000));
  const ev = (alkaa) => ({ nimi: 'Harjoitus', alkaa, paattyy: ts(new Date(alkaa.toMillis() + 5400000)), joukkue: 'kpv_u13' });
  await muutos(ev(a1), ev(a2));
  Object.assign(STORE.get(NOTIF('p1', 'muutos_ev1')), { luettu: true, luettu_pvm: 'x' });
  await muutos(ev(a2), ev(a3));
  const pelaajanNotifit = [...STORE.keys()].filter((k) => k.startsWith(`seurat/${SID}/pelaajat/p1/notifikaatiot/`));
  assert.deepStrictEqual(pelaajanNotifit, [NOTIF('p1', 'muutos_ev1')]);
  const d = STORE.get(NOTIF('p1', 'muutos_ev1'));
  assert.strictEqual(d.luettu, false); assert.strictEqual('luettu_pvm' in d, false); assert.strictEqual(d.tapahtuma_alkaa, a3);
});

test('peruttu: tunniste peruttu_<evId>; päättynyt tapahtuma → ei ilmoitusta', async () => {
  alusta();
  const tuleva = ts(new Date(Date.now() + 4 * 3600000));
  await muutos({ nimi: 'Peli', alkaa: tuleva, joukkue: 'kpv_u13' }, { nimi: 'Peli', alkaa: tuleva, joukkue: 'kpv_u13', poistettu: true });
  assert.ok(STORE.has(NOTIF('p1', 'peruttu_ev1')));
  assert.strictEqual(STORE.get(NOTIF('p1', 'peruttu_ev1')).teksti, 'Peruttu: Peli');
  alusta();
  const mennyt = ts(new Date(Date.now() - 6 * 3600000)), mennytLoppu = ts(new Date(Date.now() - 4 * 3600000));
  await muutos({ nimi: 'Peli', alkaa: mennyt, paattyy: mennytLoppu, joukkue: 'kpv_u13' }, { nimi: 'Peli', alkaa: mennyt, paattyy: mennytLoppu, joukkue: 'kpv_u13', poistettu: true });
  assert.strictEqual([...STORE.keys()].filter((k) => k.includes('/notifikaatiot/')).length, 0);
});

test('muistutus: kaksi peräkkäistä ajoa → yksi dokumentti, tunniste muistutus_<evId>, luettua ei nollata, tapahtuma_alkaa mukana', async () => {
  alusta();
  const huomenna = huomisenRajat(new Date()).alku;
  const alkaa = ts(new Date(huomenna.getTime() + 15 * 3600000));   // ~15:00–18:00 Helsinki huomenna
  STORE.set(`seurat/${SID}/kalenteri/ev9`, { nimi: 'Treeni', alkaa, joukkue: 'kpv_u13', paikka: 'Kenttä' });
  await fns.notifTapahtumaMuistutus.run({});
  const d = STORE.get(NOTIF('p1', 'muistutus_ev9'));
  assert.ok(d); assert.match(d.teksti, /^Huomenna: Treeni klo \d\d:\d\d · Kenttä$/); assert.strictEqual(d.tapahtuma_alkaa, alkaa); assert.strictEqual(d.dedupe, 'muistutus_ev9');
  d.luettu = true;
  await fns.notifTapahtumaMuistutus.run({});
  assert.strictEqual([...STORE.keys()].filter((k) => k.startsWith(`seurat/${SID}/pelaajat/p1/notifikaatiot/`)).length, 1);
  assert.strictEqual(STORE.get(NOTIF('p1', 'muistutus_ev9')).luettu, true);
  assert.strictEqual(STORE.has(NOTIF('p2', 'muistutus_ev9')), false);
});

test('index.js: ei enää add()/dedupe-hakua kalenteri-ilmoituksissa (kiinteä tunniste + set/create)', () => {
  const s = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.js'), 'utf8');
  assert.ok(!/_c4Notif/.test(s));
  const i = s.indexOf('exports.notifTapahtumaMuistutus'), j = s.indexOf('KAAVIO ERÄ D2');
  assert.ok(!/\.add\(/.test(s.slice(i, j)) && !/where\('dedupe'/.test(s.slice(i, j)));
});
after(() => fft.cleanup());
