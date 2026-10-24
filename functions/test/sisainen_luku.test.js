'use strict';
/**
 * Vaihe 1 / PR 1c-2 — CF:ien dual-read (functions/sisainen_luku.js + index.js): notifReviewEraantyy (review_viimeisin_*) ja notifValintaOdottaa (vastuuhenkilo).
 * Todistaa: lippu POIS → ei lisälukuja ja vanha kenttä; lippu PÄÄLLÄ → sisainen voittaa; sisainen-lukuvirhe → vanha kenttä (ei kaadu); CF ei kirjoita henkilokunta-kenttiä.
 * Lippu käännetään jaetun kopion RYHMAT-olioon (sama olio jonka CF lukee) ja palautetaan jokaisen testin jälkeen.
 */
const { test, after, afterEach } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const S = require('../tm_sisainen.js');
const L = require('../sisainen_luku.js');

const DELETE = Symbol('delete');
const STORE = new Map();
const KIRJOITUKSET = [];
let LUVUT = { cg: 0, sisainenDoc: 0 }, CG_VIRHE = false;
const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
const snap = (polku) => { const docs = lapset(polku).map((k) => ({ id: k.split('/').pop(), data: () => STORE.get(k), exists: true, ref: { id: k.split('/').pop() } })); return { docs, empty: !docs.length, size: docs.length, forEach: (f) => docs.forEach(f) }; };
function colAt(polku) {
  const q = { get: async () => snap(polku), where: () => q, orderBy: () => q, limit: () => q, select: () => q };
  q.doc = (id) => docAt(polku + '/' + id);
  q.add = async (v) => { KIRJOITUKSET.push(['add', polku]); STORE.set(polku + '/auto' + STORE.size, v); return { id: 'auto' }; };
  return q;
}
function docAt(polku) {
  return {
    get: async () => { if (/\/sisainen\/tiedot$/.test(polku)) LUVUT.sisainenDoc++; return STORE.has(polku) ? { exists: true, data: () => STORE.get(polku), id: polku.split('/').pop() } : { exists: false, data: () => undefined, id: polku.split('/').pop() }; },
    set: async (d, opts) => { KIRJOITUKSET.push(['set', polku]); const cur = (opts && opts.merge && STORE.get(polku)) || {}; STORE.set(polku, Object.assign({}, cur, d)); },
    update: async (d) => { KIRJOITUKSET.push(['update', polku]); STORE.set(polku, Object.assign({}, STORE.get(polku), d)); },
    delete: async () => { KIRJOITUKSET.push(['delete', polku]); STORE.delete(polku); },
    collection: (c) => colAt(polku + '/' + c),
  };
}
/* collectionGroup('sisainen').where('seuraId','==',sid): palauttaa seuran sisainen/tiedot-dokumentit (ref.parent.parent.id = pelaajan id) */
function cg(nimi) {
  let sid = null; const q = { where: (k, op, v) => { sid = v; return q; },
    get: async () => { LUVUT.cg++; if (CG_VIRHE) { const e = new Error('FAILED_PRECONDITION: indeksi puuttuu'); e.code = 'failed-precondition'; throw e; }
      const docs = [...STORE.keys()].map((k) => k.match(/^seurat\/([^/]+)\/pelaajat\/([^/]+)\/sisainen\/tiedot$/)).filter((m) => m && m[1] === sid && STORE.get(m[0]).seuraId === sid)
        .map((m) => ({ id: 'tiedot', data: () => STORE.get(m[0]), ref: { parent: { parent: { id: m[2] } } } })); return { docs, forEach: (f) => docs.forEach(f) }; } };
  return q;
}
const fakeDb = { collection: (c) => colAt(c), collectionGroup: cg, doc: (p) => docAt(p), batch: () => ({ set() { KIRJOITUKSET.push(['batch', '?']); }, update() { KIRJOITUKSET.push(['batch', '?']); }, delete() {}, commit: async () => {} }) };
const fakeFirestore = () => fakeDb;
fakeFirestore.FieldValue = { serverTimestamp: () => ({ __ts: 1 }), delete: () => DELETE, increment: (n) => n, arrayUnion: (...a) => a, arrayRemove: (...a) => a };
fakeFirestore.Timestamp = { now: () => ({}), fromDate: (d) => d };
Object.defineProperty(admin, 'firestore', { configurable: true, value: fakeFirestore });
Object.defineProperty(admin, 'auth', { configurable: true, value: () => ({ verifyIdToken: async () => ({ uid: 'u' }), getUser: async () => ({ uid: 'u', customClaims: {} }) }) });
admin.initializeApp = () => ({ delete: async () => {} });
const fft = require('firebase-functions-test')();
const fns = require('../index.js');
after(() => fft.cleanup());

const SID = 'kpv', PID = 'p1';
const HK = S.RYHMAT.henkilokunta, JS = S.RYHMAT.jaksofokus_sisainen;
const lippu = (hk, js) => { HK.kirjoitus = !!hk; JS.kirjoitus = !!js; };
function alusta() { STORE.clear(); KIRJOITUKSET.length = 0; LUVUT = { cg: 0, sisainenDoc: 0 }; CG_VIRHE = false; lippu(false, false); }
afterEach(() => lippu(false, false));

test('liputPaalla: oletus pois; kumpi tahansa lippu (henkilokunta tai jaksofokus) → päällä; ryhmat-parametri ohittaa', () => {
  assert.strictEqual(L.liputPaalla(), false); lippu(true, false); assert.strictEqual(L.liputPaalla(), true); lippu(false, true); assert.strictEqual(L.liputPaalla(), true);
  lippu(false, false); assert.strictEqual(L.liputPaalla({ henkilokunta: { kirjoitus: true } }), true);
});

test('lippu POIS: yhdistaLista / yhdistaYksi eivät lue mitään (ei collectionGroup-, ei dokumenttilukua) ja palauttavat datan sellaisenaan', async () => {
  alusta(); STORE.set(`seurat/${SID}/pelaajat/${PID}/sisainen/tiedot`, { seuraId: SID, review_viimeisin_pvm: '2026-11-01' });
  const rivit = [{ id: PID, data: { review_viimeisin_pvm: '2020-01-01' } }];
  assert.strictEqual(await L.yhdistaLista(fakeDb, SID, rivit), rivit); const d = { vastuuhenkilo: { uid: 'a' } }; assert.strictEqual(await L.yhdistaYksi(fakeDb, SID, PID, d), d);
  assert.deepStrictEqual(LUVUT, { cg: 0, sisainenDoc: 0 });
});

test('lippu PÄÄLLÄ: lista = YKSI collectionGroup-kysely, sisainen voittaa, puuttuva sisainen → vanha kenttä; yksittäinen = yksi dokumenttiluku', async () => {
  alusta(); lippu(true, false);
  STORE.set(`seurat/${SID}/pelaajat/${PID}/sisainen/tiedot`, { seuraId: SID, review_viimeisin_pvm: '2026-11-01' });
  const r = await L.yhdistaLista(fakeDb, SID, [{ id: PID, data: { review_viimeisin_pvm: '2020-01-01', etunimi: 'A' } }, { id: 'p2', data: { review_viimeisin_pvm: '2020-02-02' } }]);
  assert.strictEqual(LUVUT.cg, 1); assert.strictEqual(r[0].data.review_viimeisin_pvm, '2026-11-01'); assert.strictEqual(r[0].data.etunimi, 'A'); assert.strictEqual(r[1].data.review_viimeisin_pvm, '2020-02-02');
  const y = await L.yhdistaYksi(fakeDb, SID, PID, { vastuuhenkilo: { uid: 'vanha' } }); assert.strictEqual(LUVUT.sisainenDoc, 1); assert.strictEqual(y.review_viimeisin_pvm, '2026-11-01'); assert.strictEqual(y.vastuuhenkilo.uid, 'vanha');
});

test('lippu päällä, sisainen-luku epäonnistuu (indeksi/Rules): ei kaadu, vanhat kentät käytössä', async () => {
  alusta(); lippu(true, false); CG_VIRHE = true; const log = []; const w = console.warn; console.warn = (...a) => log.push(a.join(' '));
  try { const r = await L.yhdistaLista(fakeDb, SID, [{ id: PID, data: { review_viimeisin_pvm: '2020-01-01' } }]); assert.strictEqual(r[0].data.review_viimeisin_pvm, '2020-01-01'); } finally { console.warn = w; }
  assert.ok(log.some((x) => /joukkolataus epäonnistui/.test(x)));
});

const PELAAJA = (lisa) => Object.assign({ etunimi: 'Topias', sukunimi: 'K.', joukkue: 'KPV U13', joukkueet: ['kpv_u13'], syntymaVuosi: 2013, jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', alkoi: '2026-10-05', tila: 'valittavana' } }, lisa || {});
const VALINTA = { vaihtoehto: 'saattaen vaihtaminen', valittu_pvm: '2026-10-06' };
const valintaAja = (before, after) => fns.notifValintaOdottaa.run({ before: { data: () => before }, after: { data: () => after } }, { params: { seuraId: SID, pelaajaId: PID } });
function valintaAlusta() {
  alusta(); STORE.set(`seurat/${SID}`, { nimi: 'KPV', vp_uid: 'vp-kpv-001' });
  [['valm-u13', { rooli: 'valmentaja', joukkueet: ['kpv_u13'], etunimi: 'Veera', sukunimi: 'Valmentaja' }], ['utj', { rooli: 'urheilutoimenjohtaja' }]].forEach(([u, k]) => STORE.set(`seurat/${SID}/kayttajat/${u}`, k));
}
const syyt = () => lapset(`seurat/${SID}/viestit`).map((k) => STORE.get(k).syy).sort();

test('notifValintaOdottaa: vastuuhenkilö vain sisainen:ssä → lippu päällä viesti hänelle (syy vastuuhenkilo), lippu pois ei (joukkue-reitti)', async () => {
  const vh = { uid: 'valm-u13', rooli: 'valmentaja', asetettu_pvm: '2026-10-05' };
  valintaAlusta(); STORE.set(`seurat/${SID}/pelaajat/${PID}/sisainen/tiedot`, { seuraId: SID, vastuuhenkilo: vh });
  await valintaAja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA })); assert.deepStrictEqual(syyt(), ['joukkue', 'johto', 'johto'].sort()); assert.strictEqual(LUVUT.sisainenDoc, 0);
  valintaAlusta(); lippu(true, false); STORE.set(`seurat/${SID}/pelaajat/${PID}/sisainen/tiedot`, { seuraId: SID, vastuuhenkilo: vh });
  await valintaAja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA })); assert.deepStrictEqual(syyt(), ['johto', 'johto', 'vastuuhenkilo']); assert.strictEqual(LUVUT.sisainenDoc, 1);
});

test('notifValintaOdottaa: ei päätöstä (ei valintaa) → ei sisainen-lukua; CF ei kirjoita pelaajadokumenttiin eikä sisainen:iin lipusta riippumatta', async () => {
  valintaAlusta(); lippu(true, true); await valintaAja(PELAAJA(), PELAAJA()); assert.strictEqual(LUVUT.sisainenDoc, 0);
  await valintaAja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA }));
  assert.ok(KIRJOITUKSET.length > 0); KIRJOITUKSET.forEach(([, polku]) => assert.match(polku, /\/viestit(\/|$)/, 'vain viestit-kokoelmaan: ' + polku));
});

function rytmiAlusta() {
  alusta(); STORE.set(`seurat/${SID}`, { nimi: 'KPV' }); STORE.set(`seurat/${SID}/kayttajat/vp1`, { rooli: 'vp' });
  STORE.set(`seurat/${SID}/pelaajat/${PID}`, { etunimi: 'Topias', sukunimi: 'K.', joukkue: 'KPV U13', syntymaVuosi: 2013, review_viimeisin_pvm: '2020-01-01', review_viimeisin_tyyppi: 'kehityskeskustelu' });
}
const notifit = () => lapset(`seurat/${SID}/kayttajat/vp1/notifikaatiot`).map((k) => STORE.get(k));
const tanaan = () => new Date().toISOString().slice(0, 10);

test('notifReviewEraantyy: lippu POIS → vanha review_viimeisin_pvm (myöhässä) → notif; EI collectionGroup-lukua', async () => {
  rytmiAlusta(); STORE.set(`seurat/${SID}/pelaajat/${PID}/sisainen/tiedot`, { seuraId: SID, review_viimeisin_pvm: tanaan(), review_viimeisin_tyyppi: 'kehityskeskustelu' });
  await fns.notifReviewEraantyy.run(); assert.strictEqual(notifit().length, 1); assert.strictEqual(LUVUT.cg, 0);
});

test('notifReviewEraantyy: lippu PÄÄLLÄ → tuore review_viimeisin_pvm sisainen:stä voittaa → ei notifia; sisainen puuttuu → vanha kenttä → notif; yksi collectionGroup-kysely per seura', async () => {
  rytmiAlusta(); lippu(true, false); STORE.set(`seurat/${SID}/pelaajat/${PID}/sisainen/tiedot`, { seuraId: SID, review_viimeisin_pvm: tanaan(), review_viimeisin_tyyppi: 'kehityskeskustelu' });
  await fns.notifReviewEraantyy.run(); assert.strictEqual(notifit().length, 0); assert.strictEqual(LUVUT.cg, 1);
  rytmiAlusta(); lippu(true, false); await fns.notifReviewEraantyy.run(); assert.strictEqual(notifit().length, 1);
  rytmiAlusta(); lippu(true, false); CG_VIRHE = true; const w = console.warn; console.warn = () => {}; try { await fns.notifReviewEraantyy.run(); } finally { console.warn = w; } assert.strictEqual(notifit().length, 1);   // lukuvirhe → vanha kenttä, ajo ei kaadu
});
