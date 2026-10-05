/**
 * R6.2a — KATSELMUS YHTEEN PAIKKAAN. Cockpitin "Kirjaa kehityskeskustelu" ei kirjoittanut review_viimeisin_pvm:ää → "katselmus myöhässä" jäi näkyviin
 * keskustelun jälkeenkin. Nyt kumpikin polku (A cockpit 'kehityskeskustelu', B MDT/bulk 'mdr') kirjoittaa saman tietueen lib/tm_kehityssilmukka.js
 * tmKirjaaKatselmus:n kautta: reviewit/{pvm} (merge) + review_viimeisin_pvm/-tyyppi (+ review_tagit) yhdessä batchissa.
 * Testit ajavat OIKEAT funktiot vm:ssä + OIKEAN laskeReviewKadenssi-rytmin. Fixturet: vain KPV U13 -testipelaajat; polut seurat/kpv/pelaajat/<pid>[/reviewit/<pvm>].
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const VP = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_VP_v25.html'), 'utf8');
const K = require('../lib/tm_kehityssilmukka.js');
const N = require('../lib/tm_eerikkila_normit.js');
function pura(tunniste) {
  const i = VP.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = VP.indexOf('{', i); k < VP.length; k++) { if (VP[k] === '{') syv++; else if (VP[k] === '}') { syv--; if (!syv) return VP.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const PID = 'm93GBdOaGCUuenMiCL0I';   // KPV U13 -testipelaaja
const POLKU = 'seurat/kpv/pelaajat/' + PID;
const PVM = '2026-10-05';
const NYT = new Date(2026, 9, 5, 12, 0);
// Pelaaja jonka katselmus on MYÖHÄSSÄ: viimeisin 1.6.2026, ikä 13 → kaista 42 pv → eräpäivä 13.7. → myöhässä 5.10.
const pelaajaDoc = (o) => Object.assign({ id: PID, joukkue: 'KPV U13', syntymaVuosi: 2013, review_viimeisin_pvm: '2026-06-01', review_viimeisin_tyyppi: 'mdr' }, o);

/* Firestore-tynkä: doc-store, jossa batch.set(merge) soveltuu oikealla semantiikalla; commit voi kaatua. */
function mockDb({ kaada = false, alku = {} } = {}) {
  const docs = JSON.parse(JSON.stringify(alku)), kirj = [];
  const ref = (polku) => ({ path: polku, collection: (c) => ({ doc: (id) => ref(polku + '/' + c + '/' + id) }) });
  const db = { collection: (c) => ({ doc: (id) => ref(c + '/' + id) }),
    batch: () => { const ops = []; return { set: (r, d, o) => ops.push({ polku: r.path, data: d, merge: !!(o && o.merge) }),
      commit: async () => { if (kaada) throw new Error('permission-denied'); ops.forEach((o) => { docs[o.polku] = o.merge ? Object.assign({}, docs[o.polku], o.data) : o.data; kirj.push(o); }); } }; } };
  return { db, docs, kirj };
}

describe('lib tmKirjaaKatselmus — yksi tietue kummallekin polulle', () => {
  const MDR = { tyyppi: 'mdr', pvm: PVM, tekija_uid: 'vp-uid', tekija_rooli: 'vp', paatos: 'p', idp_paivitetty: false };
  const KK = { tyyppi: 'kehityskeskustelu', pvm: PVM, tekija_uid: 'vp-uid', tekija_rooli: 'vp', idp_paivitetty: true, arvio: { arvo: 4.5, pelaajan_arvio: 4 }, tagit: ['oikea-jalka'] };
  it('molemmat tyypit: reviewit/{pvm} + review_viimeisin_pvm/-tyyppi (rytmin kentät) — tyyppi seuraa tietuetta', () => {
    const a = K.tmKirjaaKatselmus(pelaajaDoc(), MDR), b = K.tmKirjaaKatselmus(pelaajaDoc(), KK);
    expect(a.reviewitPvm).toBe(PVM); expect(b.reviewitPvm).toBe(PVM);
    expect(a.pikakentat).toEqual({ review_viimeisin_pvm: PVM, review_viimeisin_tyyppi: 'mdr' });
    expect(b.pikakentat).toEqual({ review_viimeisin_pvm: PVM, review_viimeisin_tyyppi: 'kehityskeskustelu', review_tagit: ['oikea-jalka'] });
    expect(a.reviewitData).toEqual(MDR); expect(b.reviewitData).toMatchObject({ tyyppi: 'kehityskeskustelu', arvio: { arvo: 4.5, pelaajan_arvio: 4 }, tagit: ['oikea-jalka'] });
  });
  it('review_tagit vain jos tagit annettu; undefined-kentät karsitaan (Firestore hylkäisi); syötettä ei mutatoida', () => {
    expect(K.tmKirjaaKatselmus(null, MDR).pikakentat.review_tagit).toBeUndefined();
    const r = K.tmKirjaaKatselmus(null, Object.assign({}, MDR, { paatos: undefined, ikavaihe: undefined }));
    expect('paatos' in r.reviewitData).toBe(false); expect('ikavaihe' in r.reviewitData).toBe(false);
    const kopio = JSON.parse(JSON.stringify(KK)); K.tmKirjaaKatselmus(null, KK); expect(KK).toEqual(kopio);
  });
  it('pikakentät eivät VANHENE: myöhäisempi review_viimeisin_pvm säilyy; sama/aiempi päivä päivittyy; tagit silti', () => {
    const tuleva = K.tmKirjaaKatselmus(pelaajaDoc({ review_viimeisin_pvm: '2026-12-01' }), KK);
    expect(tuleva.pikakentat).toEqual({ review_tagit: ['oikea-jalka'] }); expect(K.tmKirjaaKatselmus(pelaajaDoc({ review_viimeisin_pvm: '2026-12-01' }), MDR).pikakentat).toEqual({});
    expect(K.tmKirjaaKatselmus(pelaajaDoc({ review_viimeisin_pvm: PVM }), MDR).pikakentat.review_viimeisin_pvm).toBe(PVM);
    expect(K.tmKirjaaKatselmus(pelaajaDoc({ review_viimeisin_pvm: '2026-06-01' }), MDR).pikakentat.review_viimeisin_pvm).toBe(PVM);
    expect(K.tmKirjaaKatselmus({}, MDR).pikakentat.review_viimeisin_pvm).toBe(PVM);   // ei aiempaa
  });
  it('virheellinen pvm / puuttuva tyyppi → heittää (ei kirjoiteta väärälle päivälle)', () => {
    ['', '5.10.2026', '2026-10-05T10:00:00Z', null, undefined, 20261005].forEach((pvm) => expect(() => K.tmKirjaaKatselmus(null, { tyyppi: 'mdr', pvm }), String(pvm)).toThrow(/pvm/));
    ['', null, undefined, 3].forEach((tyyppi) => expect(() => K.tmKirjaaKatselmus(null, { tyyppi, pvm: PVM }), String(tyyppi)).toThrow(/tyyppi/));
  });
});

/* ── Sovelluspolut vm:ssä (VP_v25) ── */
function ymp({ kaada = false, idpOk = true, demo = false, pelaaja = {} } = {}) {
  const m = mockDb({ kaada, alku: { [POLKU]: pelaajaDoc(pelaaja) } });
  const log = { toastit: [], renderit: 0 };
  const p = Object.assign(pelaajaDoc(pelaaja), { _idpTavoite: { arviot: [] } });
  const arvot = { _rvArvo: '4.5', _rvNote: 'Pelaajan oma sana', _rvKomm: 'Valmentajan kommentti', _rvTagit: 'oikea-jalka, paineensieto', _vpReviewModal: null, mdtPaatos: 'päätös' };
  const c = { db: m.db, _seuraId: 'kpv', _isDemoMode: demo, _uid: 'vp-uid', _pelaajat: [p], _mdtPid: PID, Object, Array, Math, console: { warn() {} },
    window: { TM_KEHITYSSILMUKKA: K, _rvArvioVal: 4, _vpRooli: 'vp' }, vpT: (x) => x, toast: (t, k) => log.toastit.push([t, k]),
    tmPaivaIso: () => PVM, firebase: { auth: () => ({ currentUser: { uid: 'vp-uid', getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: { rooli: 'vp' } }) } }) },
    document: { getElementById: (id) => (id in arvot ? (arvot[id] == null ? null : { value: arvot[id], remove() {} }) : null) },
    _vpIdpPelaaja: () => p, idpLisaaArvio() {}, _vpReviewTagitSanitoi: (a) => a.filter((x) => ['oikea-jalka', 'paineensieto'].includes(x)),
    _vpKausitavoiteReRender() {}, _vpTallennaIdpDok: async () => idpOk, _vpKehAskelReRender() { log.renderit++; }, renderReviewit() { log.renderit++; }, renderTilanne() { log.renderit++; },
    _renderMDTProfiili() { log.renderit++; } };
  vm.createContext(c);
  vm.runInContext([pura('async function _vpKirjoitaReview('), pura('window._vpTallennaReview = async function'), pura('window._mdtMerkitseReview = async function')].join(';\n') + ';', c);
  return { c, m, p, log };
}
const kadenssi = (doc) => N.laskeReviewKadenssi(doc, NYT);

describe('RYTMI NOLLAUTUU MOLEMMISTA POLUISTA (A cockpit · B MDT)', () => {
  it('lähtötilanne: katselmus MYÖHÄSSÄ', () => { expect(kadenssi(pelaajaDoc()).status).toBe('myohassa'); });
  it('A · cockpit "Kirjaa kehityskeskustelu": pelaajadokin review_viimeisin_pvm = tänään → rytmi ajantasalla (ennen: jäi myöhäiseksi)', async () => {
    const e = ymp(); await e.c.window._vpTallennaReview(PID);
    const doc = e.m.docs[POLKU];
    expect(doc.review_viimeisin_pvm).toBe(PVM); expect(doc.review_viimeisin_tyyppi).toBe('kehityskeskustelu');
    expect(kadenssi(doc).status).toBe('ajantasalla'); expect(kadenssi(doc).viimeisinPvm).toBe(PVM);
    expect(e.p.review_viimeisin_pvm).toBe(PVM);   // lokaali päivittyi onnistumisen jälkeen
    expect(e.log.renderit).toBeGreaterThanOrEqual(3);   // askel + reviewit + tilanne piirretty uudelleen
  });
  it('B · MDT-review ("Merkitse tehdyksi"): sama nollaus', async () => {
    const e = ymp(); await e.c.window._mdtMerkitseReview();
    expect(kadenssi(e.m.docs[POLKU]).status).toBe('ajantasalla'); expect(e.m.docs[POLKU].review_viimeisin_tyyppi).toBe('mdr');
  });
  it('päätös (_pdcPaatos): review_myohassa ennen → ei enää A- eikä B-polun jälkeen', () => {
    const aja = (doc) => { const LAS = (p, n) => N.laskeReviewKadenssi(p, n); const c = { window: { TM_SEURAAVA_ASKEL: { tmSeuraavaAskel: (p, o) => require('../lib/tm_seuraava_askel.js').tmSeuraavaAskel(p, Object.assign({}, o, { deps: { laskeReviewKadenssi: LAS, idpJumissa: () => false, sitoumusOdottaa: () => false, jaksoUmpeutunut: () => false } })) } }, laskeReviewKadenssi: LAS, vpT: (x) => x, tmPvmFi: (x) => x, _rvcSitoumusOdottaa: () => false, idpJumissa: () => false, Date, Object };   // R6.2b: _pdcPaatos = kääre → lib
      vm.createContext(c); vm.runInContext(pura('window._pdcPaatos = function') + ';', c); return c.window._pdcPaatos(Object.assign({ jaksofokus: { konsepti_nimi: 'X' } }, doc), NYT.getTime()); };
    expect(aja(pelaajaDoc()).avain).toBe('review_myohassa');
    return Promise.all([ymp(), ymp()]).then(async ([a, b]) => {
      await a.c.window._vpTallennaReview(PID); await b.c.window._mdtMerkitseReview();
      expect(aja(a.m.docs[POLKU]).avain).not.toBe('review_myohassa'); expect(aja(b.m.docs[POLKU]).avain).not.toBe('review_myohassa');
    });
  });
});

describe('cockpit-polku (A): tietue, virheet, rajat', () => {
  it('reviewit/{pvm}: tyyppi, arvio {arvo numerona, pelaajan_arvio}, tagit; EI tekstejä (pelaajan sana / valmentajan kommentti jäävät IDP-arvioon)', async () => {
    const e = ymp(); await e.c.window._vpTallennaReview(PID);
    const r = e.m.docs[POLKU + '/reviewit/' + PVM];
    expect(r).toMatchObject({ tyyppi: 'kehityskeskustelu', pvm: PVM, tekija_uid: 'vp-uid', tekija_rooli: 'vp', idp_paivitetty: true, arvio: { arvo: 4.5, pelaajan_arvio: 4 }, tagit: ['oikea-jalka', 'paineensieto'] });
    expect(JSON.stringify(r)).not.toMatch(/Pelaajan oma sana|Valmentajan kommentti|pelaajan_note|valmentajan_kommentti/);
    expect(e.m.docs[POLKU].review_tagit).toEqual(['oikea-jalka', 'paineensieto']);
  });
  it('YKSI batch, polut tasan seurat/kpv/pelaajat/<pid> + /reviewit/<pvm> (KPV U13), ei erillistä review_tagit-kirjoitusta', async () => {
    const e = ymp(); await e.c.window._vpTallennaReview(PID);
    expect(e.m.kirj.map((o) => o.polku)).toEqual([POLKU + '/reviewit/' + PVM, POLKU]); expect(e.m.kirj.every((o) => o.merge)).toBe(true);
    expect(pura('window._vpTallennaReview = async function')).not.toMatch(/set\(\{ review_tagit/);
  });
  it('arvo ei numero → arvio.arvo null (ei NaN/undefined Firestoreen)', async () => {
    const e = ymp(); e.c.document.getElementById = (id) => (({ _rvArvo: { value: '' }, _rvTagit: { value: '' } })[id] || (id === '_vpReviewModal' ? null : { value: '', remove() {} }));
    await e.c.window._vpTallennaReview(PID);
    expect(e.m.docs[POLKU + '/reviewit/' + PVM].arvio.arvo).toBeNull();
  });
  it('IDP-kirjoitus epäonnistuu (_vpTallennaIdpDok → false): EI katselmusmerkintää, EI paikallista päivitystä', async () => {
    const e = ymp({ idpOk: false }); await e.c.window._vpTallennaReview(PID);
    expect(e.m.kirj).toEqual([]); expect(e.p.review_viimeisin_pvm).toBe('2026-06-01'); expect(kadenssi(e.m.docs[POLKU]).status).toBe('myohassa');
  });
  it('katselmus-batch epäonnistuu: virheilmoitus (error), lokaali tila ja rytmi ENNALLAAN (ei valeonnistumista)', async () => {
    const e = ymp({ kaada: true }); await e.c.window._vpTallennaReview(PID);
    expect(e.m.kirj).toEqual([]); expect(e.p.review_viimeisin_pvm).toBe('2026-06-01'); expect(e.p.review_tagit).toBeUndefined();
    expect(e.log.toastit.some(([t, k]) => k === 'error' && /Tallennus epäonnistui/.test(t))).toBe(true);
  });
  it('demo: ei Firestore-kirjoitusta; lokaali tila päivittyy', async () => {
    const e = ymp({ demo: true }); await e.c.window._vpTallennaReview(PID);
    expect(e.m.kirj).toEqual([]); expect(e.p.review_viimeisin_pvm).toBe(PVM);
  });
  it('myöhäisempi review_viimeisin_pvm säilyy (ei vanhene): cockpit-kirjaus ei siirrä rytmiä taaksepäin', async () => {
    const e = ymp({ pelaaja: { review_viimeisin_pvm: '2026-12-01' } }); await e.c.window._vpTallennaReview(PID);
    expect(e.m.docs[POLKU].review_viimeisin_pvm).toBe('2026-12-01'); expect(e.m.docs[POLKU].review_tagit).toEqual(['oikea-jalka', 'paineensieto']);
  });
});

describe('sama päivä: MDT + cockpit eivät pyyhi toistensa kenttiä (merge)', () => {
  it('reviewit/{pvm}: mdr ensin, sitten kehityskeskustelu (ja päinvastoin) → molempien kentät säilyvät', async () => {
    const e = ymp(); await e.c.window._mdtMerkitseReview(); await e.c.window._vpTallennaReview(PID);
    const r = e.m.docs[POLKU + '/reviewit/' + PVM];
    expect(r.paatos).toBe('päätös'); expect(r.arvio).toEqual({ arvo: 4.5, pelaajan_arvio: 4 }); expect(r.tagit).toEqual(['oikea-jalka', 'paineensieto']); expect(r.tyyppi).toBe('kehityskeskustelu');
    const f = ymp(); await f.c.window._vpTallennaReview(PID); await f.c.window._mdtMerkitseReview();
    const q = f.m.docs[POLKU + '/reviewit/' + PVM]; expect(q.arvio).toEqual({ arvo: 4.5, pelaajan_arvio: 4 }); expect(q.tyyppi).toBe('mdr');
  });
});

describe('lähdevartijat', () => {
  it('cockpit kutsuu yhteistä kirjoittajaa; MDT ja bulk päivittävät lokaalin planin pikakentistä (ei kovakoodattua mdr)', () => {
    expect(pura('window._vpTallennaReview = async function')).toMatch(/await _vpKirjoitaReview\(p\.id, _pvm, _katselmus, p, _vplan \? _vplan\.kirjoitus : null\)/);
    expect(pura('window._mdtMerkitseReview = async function')).toMatch(/Object\.assign\(p, _plan\.pikakentat\)/);
    expect(pura('window._vpCockpitBulkMerkitse = async function')).toMatch(/Object\.assign\(p, _plan\.pikakentat\)/);
    expect(pura('async function _vpKirjoitaReview(')).toMatch(/tmKirjaaKatselmus/);
  });
  it('VP lataa tm_kehityssilmukka.js (jaksokooste ennen sitä)', () => {
    expect(VP).toContain('lib/tm_kehityssilmukka.js?v=2'); expect(VP.indexOf('tm_jaksokooste.js')).toBeLessThan(VP.indexOf('tm_kehityssilmukka.js'));
  });
});
