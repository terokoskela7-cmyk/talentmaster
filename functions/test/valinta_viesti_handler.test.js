'use strict';
/**
 * D-2 — notifValintaOdottaa (index.js:n läpi, stubattu admin) + valinta_viesti.js (pure).
 * Todistaa: vastaanottajat (vastuuhenkilö ensin; muuten joukkueen valmentajat + talenttivalmentaja; VP ja UTJ aina), tunniste valinta_{pid}_{jakso}_{uid},
 * uusi valinta päivittää saman dokumentin (luettu:false), yhteiset kentät, EI sähköpostia/pushia, ja RAJAUS: ainoa kirjoituspolku on seurat/{id}/viestit/* —
 * ei pelaajadokumenttiin eikä jaksofokukseen.
 */
const { test, after } = require('node:test');
const assert = require('node:assert');
const admin = require('firebase-admin');
const V = require('../valinta_viesti');

const DELETE = Symbol('delete');
const STORE = new Map();
const KIRJOITUKSET = [];   // jokainen set/update/add/delete/create polku
const lapset = (polku) => [...STORE.keys()].filter((k) => k.startsWith(polku + '/') && k.slice(polku.length + 1).indexOf('/') < 0);
const snap = (polku) => { const docs = lapset(polku).map((k) => ({ id: k.split('/').pop(), data: () => STORE.get(k), exists: true })); return { docs, empty: !docs.length, size: docs.length, forEach: (fn) => docs.forEach(fn) }; };
function colAt(polku) {
  const q = { get: async () => snap(polku), where: () => q, orderBy: () => q, limit: () => q, select: () => q };
  q.doc = (id) => docAt(polku + '/' + id);
  q.add = async (v) => { KIRJOITUKSET.push(['add', polku]); STORE.set(polku + '/auto' + STORE.size, v); return { id: 'auto' }; };
  return q;
}
function docAt(polku) {
  return {
    get: async () => (STORE.has(polku) ? { exists: true, data: () => STORE.get(polku), id: polku.split('/').pop() } : { exists: false, data: () => undefined, id: polku.split('/').pop() }),
    create: async (d) => { KIRJOITUKSET.push(['create', polku]); STORE.set(polku, Object.assign({}, d)); },
    set: async (d, opts) => { KIRJOITUKSET.push(['set', polku]); const cur = (opts && opts.merge && STORE.get(polku)) || {}; STORE.set(polku, Object.assign({}, cur, d)); },
    update: async (d) => { KIRJOITUKSET.push(['update', polku]); STORE.set(polku, Object.assign({}, STORE.get(polku), d)); },
    delete: async () => { KIRJOITUKSET.push(['delete', polku]); STORE.delete(polku); },
    collection: (c) => colAt(polku + '/' + c),
  };
}
const fakeDb = { collection: (c) => colAt(c), collectionGroup: () => colAt('x'), doc: (p) => docAt(p), batch: () => ({ set() { KIRJOITUKSET.push(['batch', '?']); }, update() { KIRJOITUKSET.push(['batch', '?']); }, delete() {}, commit: async () => {} }) };
let tsN = 0;
const fakeFirestore = () => fakeDb;
fakeFirestore.FieldValue = { serverTimestamp: () => ({ __ts: ++tsN }), delete: () => DELETE, increment: (n) => n, arrayUnion: (...a) => a, arrayRemove: (...a) => a };
fakeFirestore.Timestamp = { now: () => ({}), fromDate: (d) => d };
Object.defineProperty(admin, 'firestore', { configurable: true, value: fakeFirestore });
Object.defineProperty(admin, 'auth', { configurable: true, value: () => ({ verifyIdToken: async () => ({ uid: 'u' }), getUser: async () => ({ uid: 'u', customClaims: {} }) }) });
admin.initializeApp = () => ({ delete: async () => {} });
const fft = require('firebase-functions-test')();
const fns = require('../index.js');

const SID = 'kpv', PID = 'm93GBdOaGCUuenMiCL0I';
const POLKU_V = (uid, jakso = 'y_h2') => `seurat/${SID}/viestit/valinta_${PID}_${jakso}_${uid}`;
function alusta(kayttajat) {
  STORE.clear(); KIRJOITUKSET.length = 0;
  STORE.set(`seurat/${SID}`, { nimi: 'KPV', vp_uid: 'vp-kpv-001' });
  Object.entries(kayttajat || {
    'valm-u13': { rooli: 'valmentaja', joukkueet: ['kpv_u13'], etunimi: 'Veera', sukunimi: 'Valmentaja' }, 'valm-u15': { rooli: 'valmentaja', joukkueet: ['kpv_u15'] },
    'talval': { rooli: 'talenttivalmentaja', joukkueet: [], etunimi: 'Taneli', sukunimi: 'Talent' }, 'utj': { rooli: 'urheilutoimenjohtaja' }, 'fysiikka': { rooli: 'fysiikkavalmentaja', joukkueet: ['kpv_u13'] }, 'sihteeri': { rooli: 'seurasihteeri' },
    'pois': { rooli: 'valmentaja', joukkueet: ['kpv_u13'], aktiivinen: false },
  }).forEach(([uid, k]) => STORE.set(`seurat/${SID}/kayttajat/${uid}`, k));
}
const PELAAJA = (lisa) => Object.assign({ etunimi: 'Topias', sukunimi: 'K.', joukkueet: ['kpv_u13'], jaksofokus: { konsepti_avain: 'y_h2', konsepti_nimi: 'Saattaen vaihtaminen', alkoi: '2026-10-05', tila: 'valittavana' } }, lisa || {});
const VALINTA = (v = 'saattaen vaihtaminen', pvm = '2026-10-06') => ({ vaihtoehto: v, valittu_pvm: pvm });
const aja = (before, after) => fns.notifValintaOdottaa.run({ before: { data: () => before }, after: { data: () => after } }, { params: { seuraId: SID, pelaajaId: PID } });
const viestit = () => lapset(`seurat/${SID}/viestit`).map((k) => [k.split('/').pop(), STORE.get(k)]);
const uidt = () => viestit().map(([id]) => id.split('_').pop()).sort();

test('ilman vastuuhenkilöä: joukkueen valmentajat + talenttivalmentaja + VP (vp_uid) + UTJ; EI toisen joukkueen, fysiikka-, sihteeri- eikä deaktivoitua', async () => {
  alusta(); await aja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA() }));
  assert.deepStrictEqual(uidt(), ['talval', 'utj', 'valm-u13', 'vp-kpv-001']);
  assert.strictEqual(STORE.get(POLKU_V('valm-u13')).syy, 'joukkue'); assert.strictEqual(STORE.get(POLKU_V('talval')).syy, 'talentti');
  assert.strictEqual(STORE.get(POLKU_V('utj')).syy, 'johto'); assert.strictEqual(STORE.get(POLKU_V('vp-kpv-001')).syy, 'johto');
});

test('vastuuhenkilö asetettu: hän ensin, joukkue/talentti EI; VP ja UTJ silti aina', async () => {
  alusta(); const p = PELAAJA({ vastuuhenkilo: { uid: 'valm-u13', rooli: 'valmentaja', asetettu_pvm: '2026-10-05' } });
  await aja(p, Object.assign({}, p, { ydinvahvuus_valinta: VALINTA() }));
  assert.deepStrictEqual(uidt(), ['utj', 'valm-u13', 'vp-kpv-001']);
  assert.strictEqual(STORE.get(POLKU_V('valm-u13')).syy, 'vastuuhenkilo'); assert.strictEqual(STORE.get(POLKU_V('valm-u13')).vastuuhenkilo_nimi, 'Veera Valmentaja');
});

test('vastuuhenkilö = VP (vp_uid, ei kayttajat-dokkia) → yksi viesti VP:lle, syy vastuuhenkilo; kelpaamaton/deaktivoitu vastuuhenkilö → paluu joukkueeseen', async () => {
  alusta(); const p = PELAAJA({ vastuuhenkilo: { uid: 'vp-kpv-001', rooli: 'vp', asetettu_pvm: '2026-10-05' } });
  await aja(p, Object.assign({}, p, { ydinvahvuus_valinta: VALINTA() })); assert.deepStrictEqual(uidt(), ['utj', 'vp-kpv-001']); assert.strictEqual(STORE.get(POLKU_V('vp-kpv-001')).syy, 'vastuuhenkilo');
  for (const huono of ['pois', 'tuntematon']) {
    alusta(); const q = PELAAJA({ vastuuhenkilo: { uid: huono, rooli: 'valmentaja', asetettu_pvm: '2026-10-05' } });
    await aja(q, Object.assign({}, q, { ydinvahvuus_valinta: VALINTA() })); assert.deepStrictEqual(uidt(), ['talval', 'utj', 'valm-u13', 'vp-kpv-001'], huono);
  }
});

test('rakenne: yhteiset kentät (tyyppi, pelaajaId, jakso, osa, luettu), nakyvyys henkilokunta, henkilökunnan sana, aika serverTimestamp; ei video_url eikä heikkous/rajoite/kriittinen', async () => {
  alusta(); await aja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA() }));
  const d = STORE.get(POLKU_V('valm-u13'));
  assert.strictEqual(d.tyyppi, 'valinta'); assert.strictEqual(d.pelaajaId, PID); assert.strictEqual(d.jakso, 'y_h2'); assert.strictEqual(d.osa, null); assert.strictEqual(d.luettu, false);
  assert.strictEqual(d.nakyvyys, 'henkilokunta'); assert.strictEqual(d.vastaanottajaUid, 'valm-u13'); assert.strictEqual(d.pelaajaNimi, 'Topias K.'); assert.strictEqual(d.vaihtoehto, 'saattaen vaihtaminen');
  assert.strictEqual(d.teksti, 'Topias K. valitsi ydinvahvuutensa, vahvista jakso.'); assert.ok(d.aika && d.aika.__ts);
  assert.ok(!('video_url' in d)); assert.ok(!/heikkous|rajoite|kriittinen/i.test(JSON.stringify(d))); assert.ok(!Object.keys(d).some((k) => /(^|_)ase(_|$)/.test(k)));
});

test('uusi valinta ennen vahvistusta päivittää SAMAN dokumentin ja palauttaa luettu:false; ei uusia dokumentteja', async () => {
  alusta(); await aja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA('A') }));
  const n = viestit().length; STORE.get(POLKU_V('valm-u13')).luettu = true;
  await aja(PELAAJA({ ydinvahvuus_valinta: VALINTA('A') }), PELAAJA({ ydinvahvuus_valinta: VALINTA('B', '2026-10-07') }));
  assert.strictEqual(viestit().length, n); assert.strictEqual(STORE.get(POLKU_V('valm-u13')).luettu, false); assert.strictEqual(STORE.get(POLKU_V('valm-u13')).vaihtoehto, 'B');
});

test('EI laukea: ei muutosta valinnassa, ei valintaa, jakso ei valittavana / ei jaksoa / vanha tila; muu pelaajapäivitys ei tee mitään', async () => {
  const jaksoIlman = (tila) => PELAAJA({ jaksofokus: Object.assign({}, PELAAJA().jaksofokus, tila ? { tila } : { tila: undefined }), ydinvahvuus_valinta: VALINTA() });
  const tapaukset = [
    [PELAAJA({ ydinvahvuus_valinta: VALINTA() }), PELAAJA({ ydinvahvuus_valinta: VALINTA(), etunimi: 'Topi' })],   // sama valinta
    [PELAAJA(), PELAAJA({ hh_pvm: '2026-10-06' })],                                                                      // ei valintaa
    [PELAAJA(), jaksoIlman('aktiivinen')], [PELAAJA(), jaksoIlman(null)], [PELAAJA(), PELAAJA({ jaksofokus: null, ydinvahvuus_valinta: VALINTA() })],
    [PELAAJA(), PELAAJA({ ydinvahvuus_valinta: { valittu_pvm: '2026-10-06' } })],                                        // vaihtoehto puuttuu
  ];
  for (const [b, a] of tapaukset) { alusta(); await aja(b, a); assert.strictEqual(viestit().length, 0); assert.strictEqual(KIRJOITUKSET.length, 0); }
});

test('RAJAUS: ainoa kirjoituspolku on seurat/{id}/viestit/* — ei pelaajadokumenttiin, ei jaksofokukseen, ei muihin kokoelmiin; ei sähköpostia/pushia', async () => {
  alusta(); const pelaajaPolku = `seurat/${SID}/pelaajat/${PID}`; STORE.set(pelaajaPolku, PELAAJA({ ydinvahvuus_valinta: VALINTA() })); const ennen = JSON.stringify(STORE.get(pelaajaPolku));
  await aja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA() }));
  assert.ok(KIRJOITUKSET.length >= 4); assert.ok(KIRJOITUKSET.every(([, p]) => p.startsWith(`seurat/${SID}/viestit/valinta_${PID}_`)), JSON.stringify(KIRJOITUKSET));
  assert.strictEqual(JSON.stringify(STORE.get(pelaajaPolku)), ennen);
  const fs = require('fs'); const src = fs.readFileSync(require.resolve('../index.js'), 'utf8'); const i = src.indexOf('exports.notifValintaOdottaa'); const lohko = src.slice(i, src.indexOf('exports.', i + 20));
  assert.ok(!/lahetaSahkoposti|sendgrid|messaging\(|sendMulticast|sendToDevice|notifikaatiot|collection\('pelaajat'\)\.doc\([^)]*\)\s*\.(set|update)/i.test(lohko));
  assert.ok(!/\.collection\('pelaajat'\)/.test(lohko) && !/jaksofokus/.test(lohko.replace(/\/\/.*$/gm, '')), 'funktion runko ei koske pelaajat-kokoelmaan eikä jaksofokukseen');
});

test('virhe (Firestore kaatuu) ei heitä — loki, funktio palauttaa null', async () => {
  alusta(); const vanha = fakeDb.collection; fakeDb.collection = () => { throw new Error('boom'); };
  try { assert.strictEqual(await aja(PELAAJA(), PELAAJA({ ydinvahvuus_valinta: VALINTA() })), null); } finally { fakeDb.collection = vanha; }
});

test('pure: viestiId siivoaa erikoismerkit; vastaanottajat ilman dataa → tyhjä/vain vp_uid; nimen puute ei kaada', () => {
  assert.strictEqual(V.viestiId('p/1', 'a b', 'u:1'), 'valinta_p_1_a_b_u_1');
  assert.deepStrictEqual(V.vastaanottajat({}, [], {}), []); assert.deepStrictEqual(V.vastaanottajat({}, null, { vp_uid: 'v' }), [{ uid: 'v', syy: 'johto' }]);
  assert.strictEqual(V.rakennaViestit('p', {}, { jaksoavain: 'j', vaihtoehto: 'x' }, [{ uid: 'u', syy: 'johto' }], [])[0].data.teksti, 'valitsi ydinvahvuutensa, vahvista jakso.');
});

after(() => { fft.cleanup(); });
