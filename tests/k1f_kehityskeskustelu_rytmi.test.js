/* K1f · Masterin "Kirjaa kehityskeskustelu" ja VP:n "Merkitse kehityskeskustelu tehdyksi" (yksittäin + bulk) nollaavat rytmin samalla säännöllä kuin Jakson yhteenveto (K1d).
   Ajetaan OIKEA kuorikoodi (Master _mIdpTallennaReview, VP _mdtMerkitseReview / _vpCockpitBulkMerkitse) vm:ssä + muistinvarainen Firestore; sen jälkeen
   sovellus (laskeReviewKadenssi → tmRytmi) ja push (functions/rytmi_notif.js) lukevat SAMAN pelaajadokumentin ja ovat samaa mieltä. Kuoren kello: 7.10.2026 (lataaSivu). */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { lataaSivu } from './helpers/sivu_ajuri.mjs';
import { fakeDb } from './_fakeFirestore.mjs';
const require = createRequire(import.meta.url);
const N = require('../lib/tm_eerikkila_normit.js'), RN = require('../functions/rytmi_notif.js');
globalThis.normiIka = N.normiIka;
const NYT = new Date(2026, 9, 8, 12, 0).getTime();   // 8.10.2026: päivä kuoren kellon (7.10.) jälkeen
const PVM = '2026-10-07';   // kuoren paikallinen päivä
const POLKU = 'seurat/demo/pelaajat/p1';
const PEL = { etunimi: 'Topi', sukunimi: 'Testi', syntymaVuosi: 2013, joukkue: 'Demo U13', review_viimeisin_pvm: '2026-08-01', review_viimeisin_tyyppi: 'jakso' };   // myöhässä
const sovellus = (p) => N.laskeReviewKadenssi(p, NYT);
const push = (p) => RN.rytmiNotifit([{ id: 'p1', data: p }], NYT);
const TAVOITE = () => ({ status: 'aktiivinen', luotu: '2026-09-01T10:00:00.000Z', mittari: { yksikko: 'taso' }, fokus: { alue: 'tekn', dim: 'x', nimi: 'Syöttö' }, arviot: [] });

function ymp(sivu, pelaaja, opts) {
  opts = opts || {};
  const f = fakeDb({ [POLKU]: Object.assign({}, pelaaja) });
  const loki = { toast: [] };
  const batchAlku = f.db.batch;
  if (opts.batchKaatuu) f.db.batch = () => { const b = batchAlku(); b.commit = async () => { throw new Error('verkko'); }; return b; };
  if (opts.idpKaatuu) { const tx = f.db.runTransaction; f.db.runTransaction = async () => { throw new Error('idp kaatui'); }; void tx; }
  const el = {}; const E = (id) => el[id] || (el[id] = { id, value: '', textContent: '', innerHTML: '', remove() {}, style: {}, classList: { add() {}, remove() {} } });
  const kayttaja = { uid: 'u1', getIdToken: async () => 't', getIdTokenResult: async () => ({ claims: { rooli: 'valmentaja' } }) };
  const c = lataaSivu(sivu, {
    _db: f.db, db: f.db, _seuraId: 'demo', _demo: false, _isDemoMode: false, _uid: 'u1', _rooli: 'valmentaja', masterT: (x) => x, vpT: (x) => x,
    firebase: { auth: () => ({ currentUser: kayttaja }), firestore: { FieldValue: { delete: () => 'DEL' } } },
    toast: (t, l) => loki.toast.push([t, l]),
  });
  c.document = Object.assign({}, c.document, { getElementById: E });
  if (c.window && c.window.TM_SISAINEN) c.window.TM_SISAINEN.RYHMAT.henkilokunta.kirjoitus = false;   // lipun käännön jälkeen: tämä testi koskee vanhaa (pelaajadokumentti-)polkua; sisainen-polku: tests/sisainen_henkilokunta*.test.js
  return { c, f, loki, E };
}
const pel = (t) => t.f.D.get(POLKU);
const rev = (t) => t.f.D.get(POLKU + '/reviewit/' + PVM);
/* pariteetti: kirjauksen jälkeen sovellus ja push ovat samaa mieltä — rytmi ajantasalla, ei muistutusta */
function pariteetti(p) {
  const r = sovellus(p); expect(r.status).toBe('ajantasalla'); expect(r.edellinenPv).toBeLessThan(14);
  expect(push(p)).toEqual([]);
}

describe('K1f · Master: "Kirjaa kehityskeskustelu" nollaa rytmin', () => {
  const masterYmp = (pelaaja, opts) => {
    const t = ymp('TalentMaster_Master_v16.html', pelaaja, opts);
    const p = Object.assign({ id: 'p1', _mIdpTavoite: TAVOITE() }, pelaaja);
    t.p = p; t.c._mIdpPelaaja = p; t.c._mIdpReRender = () => {};
    t.E('_mktRvArvo').value = ''; t.E('_mktRvKomm').value = 'hyvä'; t.c._mktRvArvioVal = 4;
    return t;
  };
  it('lähtötilanne: ilman kirjausta rytmi myöhässä ja push lähtee (testin lähtökohta)', () => {
    expect(sovellus(PEL).status).toBe('myohassa'); expect(push(PEL)).toHaveLength(1);
  });
  it('IDP onnistuu → reviewit/{pvm} + review_viimeisin_pvm/-tyyppi samassa batchissa; sovellus ja push samaa mieltä', async () => {
    const t = masterYmp(PEL); await t.c._mIdpTallennaReview('p1');
    expect(t.f.D.get(POLKU + '/idp_kausi/2026').tavoitteet[0].arviot).toHaveLength(1);   // IDP-arvio ennallaan
    expect(pel(t)).toMatchObject({ review_viimeisin_pvm: PVM, review_viimeisin_tyyppi: 'kehityskeskustelu', idp_viim_review: PVM });
    expect(rev(t)).toMatchObject({ tyyppi: 'kehityskeskustelu', pvm: PVM, tekija_uid: 'u1', tekija_rooli: 'valmentaja', idp_paivitetty: true, arvio: { arvo: null, pelaajan_arvio: 4 } });
    expect(rev(t).valmentajan_kommentti).toBeUndefined();   // kommentti jää IDP-arvioon
    expect(t.f.loki.batchOps).toEqual([2]);   // YKSI batch: reviewit + pelaajadokumentti
    expect(t.p.review_viimeisin_pvm).toBe(PVM);   // paikallinen tila
    pariteetti(pel(t));
  });
  it('aiempaa myöhäisempi review_viimeisin_pvm säilyy (pikakenttiä ei vanhenneta), reviewit/{pvm} silti kirjoitetaan', async () => {
    const t = masterYmp(Object.assign({}, PEL, { review_viimeisin_pvm: '2026-10-07T00:00:00', review_viimeisin_tyyppi: 'mdr' }));
    t.p.review_viimeisin_pvm = '2026-10-09'; t.f.D.set(POLKU, Object.assign({}, PEL, { review_viimeisin_pvm: '2026-10-09', review_viimeisin_tyyppi: 'mdr' }));
    await t.c._mIdpTallennaReview('p1');
    expect(pel(t)).toMatchObject({ review_viimeisin_pvm: '2026-10-09', review_viimeisin_tyyppi: 'mdr' }); expect(rev(t).tyyppi).toBe('kehityskeskustelu');
  });
  it('IDP-tallennus epäonnistuu → mitään katselmusta ei kirjoiteta (ei valeonnistumista)', async () => {
    const t = masterYmp(PEL, { idpKaatuu: true }); await t.c._mIdpTallennaReview('p1');
    expect(rev(t)).toBeUndefined(); expect(pel(t).review_viimeisin_pvm).toBe('2026-08-01'); expect(t.p.review_viimeisin_pvm).toBe('2026-08-01');
    expect(t.loki.toast.some(([x, l]) => l === 'error')).toBe(true); expect(sovellus(pel(t)).status).toBe('myohassa');
  });
  it('katselmus-batch epäonnistuu → virhetoast, paikallinen tila ennallaan', async () => {
    const t = masterYmp(PEL, { batchKaatuu: true }); await t.c._mIdpTallennaReview('p1');
    expect(rev(t)).toBeUndefined(); expect(t.p.review_viimeisin_pvm).toBe('2026-08-01'); expect(t.loki.toast.some(([x, l]) => x === 'Tallennus epäonnistui' && l === 'error')).toBe(true);
  });
  it('ilman kauden tavoitetta ei kirjoiteta mitään (vanha ehto ennallaan)', async () => {
    const t = masterYmp(PEL); delete t.p._mIdpTavoite; await t.c._mIdpTallennaReview('p1');
    expect(rev(t)).toBeUndefined(); expect(pel(t)).toEqual(PEL); expect(t.f.loki.commits).toBe(0);
  });
  it('demo (ei seuraa): vain paikallinen tila, ei Firestore-kirjoitusta', async () => {
    const t = masterYmp(PEL); t.c._demo = true; await t.c._mIdpTallennaReview('p1');
    expect(t.f.loki.commits).toBe(0); expect(t.p.review_viimeisin_pvm).toBe(PVM); expect(pel(t)).toEqual(PEL);
  });
});

describe('K1f · VP: "Merkitse kehityskeskustelu tehdyksi" nollaa rytmin samalla säännöllä (tyyppi pysyy mdr)', () => {
  const vpYmp = (pelaaja, opts) => {
    const t = ymp('TalentMaster_VP_v25.html', pelaaja, opts);
    const p = Object.assign({ id: 'p1' }, pelaaja);
    Object.assign(t.c, { _pelaajat: [p], _mdtPid: 'p1', _renderMDTProfiili() {}, renderReviewit() {}, renderTilanne() {}, _reviewSel: { p1: true }, _reviewSelMode: true, _vpVoiMuokata: () => true, _vpRooli: 'vp' });
    t.p = p; return t;
  };
  it('yksittäinen _mdtMerkitseReview: reviewit/{pvm} + pikakentät (mdr), yksi batch; sovellus ja push samaa mieltä', async () => {
    const t = vpYmp(PEL); await t.c._mdtMerkitseReview();
    expect(pel(t)).toMatchObject({ review_viimeisin_pvm: PVM, review_viimeisin_tyyppi: 'mdr' }); expect(rev(t)).toMatchObject({ tyyppi: 'mdr', pvm: PVM, idp_paivitetty: false });
    expect(t.f.loki.batchOps).toEqual([2]); expect(t.p.review_viimeisin_pvm).toBe(PVM); pariteetti(pel(t));
  });
  it('bulk _vpCockpitBulkMerkitse: sama tulos', async () => {
    const t = vpYmp(PEL); t.c.confirm = () => true; t.c.window.confirm = () => true; await t.c._vpCockpitBulkMerkitse();
    expect(pel(t)).toMatchObject({ review_viimeisin_pvm: PVM, review_viimeisin_tyyppi: 'mdr' }); expect(rev(t).tyyppi).toBe('mdr'); pariteetti(pel(t));
  });
  it('aiempaa myöhäisempi review_viimeisin_pvm säilyy myös VP:n merkinnässä', async () => {
    const t = vpYmp(Object.assign({}, PEL, { review_viimeisin_pvm: '2026-10-09', review_viimeisin_tyyppi: 'kehityskeskustelu' })); await t.c._mdtMerkitseReview();
    expect(pel(t)).toMatchObject({ review_viimeisin_pvm: '2026-10-09', review_viimeisin_tyyppi: 'kehityskeskustelu' }); expect(rev(t).tyyppi).toBe('mdr');
  });
  it('batch epäonnistuu → ei kirjoitusta, paikallinen tila ennallaan, virhetoast (ei ✓)', async () => {
    const t = vpYmp(PEL, { batchKaatuu: true }); await t.c._mdtMerkitseReview();
    expect(rev(t)).toBeUndefined(); expect(t.p.review_viimeisin_pvm).toBe('2026-08-01'); expect(t.loki.toast.some(([x, l]) => l === 'error')).toBe(true); expect(t.loki.toast.some(([x]) => /✓/.test(x))).toBe(false);
  });
});

describe('K1f · kaikki kolme polkua kirjoittavat saman päivämuodon ja tyyppi ei vaikuta rytmiin', () => {
  it('review_viimeisin_tyyppi (kehityskeskustelu / mdr / jakso) ei muuta tmRytmi-tulosta', () => {
    const tulos = ['kehityskeskustelu', 'mdr', 'jakso'].map((tp) => { const r = sovellus(Object.assign({}, PEL, { review_viimeisin_pvm: PVM, review_viimeisin_tyyppi: tp })); return [r.status, r.eraantyyPvm, r.ylimaaraPv]; });
    expect(tulos[1]).toEqual(tulos[0]); expect(tulos[2]).toEqual(tulos[0]);
  });
});
