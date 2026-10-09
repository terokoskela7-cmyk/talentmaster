/**
 * S2b PR 0 — auditin 27 P0-luvut (docs/CODE_BRIEF_S2B_VALMENTAJA_TANAAN.md PR 0, kaikille seuroille).
 * (1 viikkonumero: tests/viikko_yksi_kaava.test.js.) Tässä: 2 avoin testi · 3 profiilikortti · 4 Kausi-joukkuedokumentti · 5 kattavuusportti (D125) · 6 mittauksen ikä (D141) · 7 päivämäärät.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const LU = require('../lib/tm_koti_luvut.js'), PVM = require('../lib/tm_pvm.js');
const MA = readFileSync(new URL('../TalentMaster_Master_v16.html', import.meta.url), 'utf8');
const NORMIT = readFileSync(new URL('../lib/tm_eerikkila_normit.js', import.meta.url), 'utf8');
const { funktio } = require('./helpers/vp_koti_sandbox.cjs');

describe('2 · avoin testi — YKSI määritelmä', () => {
  const T = [{ id: 1, tila: 'avoin', joukkue: 'KPV P13' }, { id: 2, tila: 'avoin', joukkue: 'SJK P14' }, { id: 3, tila: 'suljettu', joukkue: 'KPV P13' }, { id: 4, tila: 'suunniteltu' }, { id: 5, tila: 'avoin', joukkue_nimi: 'KPV P13' }];
  it('avoin = ei suljettu JA kuuluu valittuun joukkueeseen (joukkueeton = seuratason, kuuluu kaikille; ei valintaa = kaikki)', () => {
    expect(LU.avoimetTestit(T, 'KPV P13').map((t) => t.id)).toEqual([1, 4, 5]);
    expect(LU.avoimetTestit(T, 'SJK P14').map((t) => t.id)).toEqual([2, 4]);
    expect(LU.avoimetTestit(T, null).map((t) => t.id)).toEqual([1, 2, 4, 5]); expect(LU.avoimetTestit(T, '').length).toBe(4);
    expect(LU.avoimetTestit(null, 'X')).toEqual([]); expect(LU.avoimetTestit([null, undefined], 'X')).toEqual([]);
  });
  it('Tänään-badge, Testit-sivu, mittaririvi ja Kausi-nauha kutsuvat samaa funktiota samalla joukkueella → sama luku', () => {
    expect((MA.match(/TM_KOTI_LUVUT\.avoimetTestit\(_testitapahtumat, _joukkue\)/g) || []).length).toBeGreaterThanOrEqual(5);
    expect(MA).not.toMatch(/_testitapahtumat\s*(\|\|\s*\[\])?\)?\.filter\(t\s*=>\s*t\.tila\s*!==\s*'suljettu'/);   // ei enää omaa avoin-ehtoa
    expect(MA).not.toMatch(/\(_testitapahtumat\|\|\[\]\)\.filter\(t\s*=>\s*t\.tila\s*!==\s*'suljettu'\)/);
  });
  it('REGRESSIO: valittuna KPV P13, seurassa yksi avoin SJK P14 -testi → badge ja sivu molemmat 0 (ennen: badge 1, sivu "ei avoimia")', () => {
    const tapahtumat = [{ tila: 'avoin', joukkue: 'SJK P14' }];
    expect(LU.avoimetTestit(tapahtumat, 'KPV P13').length).toBe(0);   // badge/mittari
    expect(LU.avoimetTestit(tapahtumat, 'KPV P13').length === 0).toBe(true);   // Testit-sivu "Ei avoimia testitapahtumia."
  });
});

describe('3 · profiilikortti seuraa joukkuevalitsinta', () => {
  it('_paivitaKaikkiNakymat piirtää profiilikortin uudelleen (valitsimen onchange kutsuu sitä molemmissa valitsimissa)', () => {
    expect(funktio(MA, '_paivitaKaikkiNakymat')).toContain("['coachSelf', renderCoachSelfCard]");
    expect((MA.match(/_paivitaKaikkiNakymat\(\);/g) || []).length).toBeGreaterThanOrEqual(2);
  });
  it('kortin alarivi lukee valitun joukkueen (_joukkue), ei muistettua: ajettuna vm:ssä "KPV P13" vaihtuu → kortti "KPV P13", ei "SJK P14"', () => {
    const el = { innerHTML: '', style: {} };
    const ctx = { console, masterT: (x) => x, document: { getElementById: (id) => (id === 'coachSelfCard' ? el : null) }, window: { _valmentajaData: { etunimi: 'Rasmus', sukunimi: 'B', rooli: 'vp' } }, _superAdmin: false, _rooli: 'vp', _joukkue: 'SJK P14', _coachActivity: { havainnot: 1, viestit: 0 }, _seuraId: null, _uid: null };
    vm.createContext(ctx); vm.runInContext(funktio(MA, 'renderCoachSelfCard'), ctx);
    ctx.renderCoachSelfCard(); expect(el.innerHTML).toContain('SJK P14');
    ctx._joukkue = 'KPV P13'; ctx.renderCoachSelfCard(); expect(el.innerHTML).toContain('KPV P13'); expect(el.innerHTML).not.toContain('SJK P14');
  });
});

describe('4 · Kausi: "Joukkuedokumenttia ei ole" vain kun dokumenttia oikeasti ei ole', () => {
  const joukkueet = require('../lib/tm_joukkue.js');
  it('doc-id voi poiketa nimestä johdetusta tunnisteesta: "KPV P13" → kanoninen doc kpv_u13 (tmPelaajanJoukkueet, §7.18)', () => {
    expect(joukkueet.tmPelaajanJoukkueet({ joukkue: 'KPV P13' }, [{ id: 'kpv_u13', nimi: 'KPV P13' }, { id: 'sjk_p14', nimi: 'SJK P14' }])).toEqual(['kpv_u13']);
  });
  const luo = (docs) => {
    const el = { innerHTML: '' }, luvut = [];
    const liita = (path, c) => (path ? path + '/' + c : c), node = (path) => ({ get: async () => { luvut.push(path); const d = docs[path]; if (d) return { exists: true, id: path.split('/').pop(), data: () => d }; const lista = Object.keys(docs).filter((k) => k.indexOf(path + '/') === 0 && k.slice(path.length + 1).indexOf('/') < 0); return { exists: false, docs: lista.map((k) => ({ id: k.split('/').pop(), data: () => docs[k] })), data: () => undefined }; }, collection: (c) => node(liita(path, c)), doc: (c) => node(liita(path, c)) });
    const J = { tmJoukkuejaksoKortti: (d) => ({ nimi: d.nimi, onJakso: false }), tmJoukkuejaksoKorttiHTML: (k) => '<KORTTI ' + k.nimi + '>', tmJoukkuejaksoSynkkaIlmoitusHTML: () => '' };
    const ctx = { console, Promise, JSON, Object, Array, String, window: { TM_JOUKKUEJAKSO: J, tmPelaajanJoukkueet: joukkueet.tmPelaajanJoukkueet, _mJjLiput: {} }, document: { getElementById: (id) => (id === 'seasonJoukkuejakso' ? el : null) }, _demo: false, _seuraId: 'kpv', _db: node(''), _joukkue: 'KPV P13', masterT: (x) => x, _mEsc: (s) => String(s), _rooli: 'vp', _superAdmin: false,
      _mJjLataaLiput: async () => ({ kentta: true }), _mJjCtx: () => ({}), _mJjSaaMuokata: () => true, _mJaLaske: async () => {}, _mLataaTeemat() {}, kvkProfiilit: null };
    ctx.window._kvkProfiilit = {}; vm.createContext(ctx); vm.runInContext(['_joukkueTunniste', '_mJjVoiLuoda', '_mJjRender'].map((n) => funktio(MA, n)).join('\n'), ctx);
    return { ctx, el, luvut };
  };
  it('doc kpv_u13 (nimi "KPV P13") löytyy valitulle "KPV P13":lle — kortti piirtyy, ei "luo joukkue ensin"', async () => {
    const y = luo({ 'seurat/kpv/joukkueet/kpv_u13': { nimi: 'KPV P13' } }); await y.ctx._mJjRender();
    expect(y.el.innerHTML).toContain('<KORTTI KPV P13>'); expect(y.el.innerHTML).not.toContain('luo joukkue ensin'); expect(y.ctx.window._mJjDoc.jid).toBe('kpv_u13');
  });
  it('yleinen polku: doc-id = nimestä johdettu tunniste → yksi suora luku, ei listaa', async () => {
    const y = luo({ 'seurat/kpv/joukkueet/kpv_p13': { nimi: 'KPV P13' } }); await y.ctx._mJjRender(); expect(y.el.innerHTML).toContain('<KORTTI'); expect(y.luvut).toEqual(['seurat/kpv/joukkueet/kpv_p13']);
  });
  it('doc oikeasti puuttuu → ohje selitetään (VP: luo joukkue; muu: pyydä VP:tä)', async () => {
    const y = luo({ 'seurat/kpv/joukkueet/sjk_p14': { nimi: 'SJK P14' } }); await y.ctx._mJjRender(); expect(y.el.innerHTML).toContain('Joukkuedokumenttia ei ole — luo joukkue ensin.');
    const z = luo({}); z.ctx._rooli = 'valmentaja'; await z.ctx._mJjRender(); expect(z.el.innerHTML).toContain('Pyydä VP:tä luomaan joukkue');
  });
});

describe('5 · kattavuusportti (D125) Kausi-lukuihin ja RAE:hen', () => {
  it('"Kehittynyt 100 %" viidestä pelaajasta 16:sta → "5/16 mitattu kahdesti" (kattavuus alle 70 %)', () => {
    const P = Array.from({ length: 16 }, (_, i) => ({ id: 'p' + i })), pari = P.slice(0, 5);
    const k = LU.kattavuus(P, { _: P }, (p) => pari.indexOf(p) >= 0); expect(k.riittava).toBe(false); expect(k.n + '/' + k.yht).toBe('5/16');
    const kok = LU.kattavuus(P, { _: P }, (p) => P.indexOf(p) < 12); expect(kok.riittava).toBe(true);   // 12/16 = 75 %
  });
  it('Masterin Kausi: Kehittynyt, Taso ≥3 ja RAE kulkevat kattavuusportin kautta; portin alla "x/y", ei prosenttia', () => {
    const src = funktio(MA, 'renderSeason');
    expect(src).toContain("window.TM_KOTI_LUVUT.kattavuus(lista, { _: lista }, onMitattu)"); expect(src).toMatch(/katPari = _kat\(P,/); expect(src).toMatch(/katTaso = _kat\(P,/); expect(src).toMatch(/_katRae = _kat\(P,/);
    expect(src).toMatch(/metr\(masterT\('Kehittynyt \(abs\)'\)[\s\S]*?, null, katPari\)/); expect(src).toMatch(/onTasoN \? 'taso' : null, katTaso\)/);
    expect(src).toContain("portti ? kat.n + '/' + kat.yht"); expect(src).toContain('syntymäaikoja puuttuu — jakaumaa ei näytetä');
  });
  it('RAE-portti: 4 syntymäaikaa 16:sta → ei jakaumaa (sama virhe kuin VP:ssä)', () => {
    const P = Array.from({ length: 16 }, (_, i) => ({ id: 'q' + i, q: i < 4 ? 'Q3' : null })); expect(LU.kattavuus(P, { _: P }, (p) => !!p.q).riittava).toBe(false);
  });
});

describe('6 · D141 mittauksen ikä: yli 12 kk vanha ei tasona eikä värinä', () => {
  const ref = '2026-10-10';
  it('tmTasoVanhentunut: 12 kk raja (kalenterikuukausien ero > 12)', () => {
    expect(PVM.tmTasoVanhentunut('2023-10-28', ref)).toBe(true); expect(PVM.tmTasoVanhentunut('2025-10-01', ref)).toBe(false); expect(PVM.tmTasoVanhentunut('2025-10-31', ref)).toBe(false); expect(PVM.tmTasoVanhentunut('2026-09-20', ref)).toBe(false);
    expect(PVM.tmTasoVanhentunut('2025-09-30', ref)).toBe(true); expect(PVM.tmTasoVanhentunut('2025-07-30', ref)).toBe(true);   // kalenterikuukausien ero > 12 (kk-tarkkuus, kuten tmKuukausiaMittauksesta)
    expect(PVM.tmTasoVanhentunut(null, ref)).toBe(false); expect(PVM.tmTasoVanhentunut('roska', ref)).toBe(false);
  });
  it('"mitattu 2023 · päivitä" vanhentuneelle, "mitattu 20.9.2026" tuoreelle; käännösfunktio mukaan', () => {
    expect(PVM.tmMittausIkaTeksti('2023-10-28', ref)).toBe('mitattu 2023 · päivitä'); expect(PVM.tmMittausIkaTeksti('2026-09-20', ref)).toBe('mitattu 20.9.2026'); expect(PVM.tmMittausIkaTeksti(null, ref)).toBe('');
    expect(PVM.tmMittausIkaTeksti('2023-10-28', ref, (x) => '[' + x + ']')).toBe('[mitattu {vuosi} · päivitä]'.replace('{vuosi}', '2023'));
  });
  const kehitys = (p) => { const ctx = { console, Math, Date, JSON, window: {}, tmPhvKoodi: require('../lib/tm_phv_tila.js').tmPhvKoodi }; vm.createContext(ctx); ['tm_pvm.js', 'tm_viikko.js'].forEach((f) => vm.runInContext(readFileSync(new URL('../lib/' + f, import.meta.url), 'utf8'), ctx)); vm.runInContext(NORMIT, ctx); return ctx.renderKehityskorttiHTML(p, 13, 'M'); };
  it('kehityskortti: 2023-mittaus (D1 hh_pvm, D2 tki_pvm) → ei tasoa eikä punaista, vain "mitattu 2023 · päivitä"; tuore mittaus ennallaan', () => {
    const vanha = kehitys({ hh_taso: 1.2, d1_taso: 1.2, hh_pvm: '2023-10-28', tki_viimeisin: 20, d2_taso: 1, d2_lahde: 'tk', tki_pvm: '2023-10-28' });
    expect(vanha).toContain('mitattu 2023 · päivitä'); expect(vanha).not.toContain('var(--red)'); expect(vanha).not.toMatch(/>1\.2<span/); expect(vanha).not.toMatch(/>1<span style="font-size:13px/);
    const tuore = kehitys({ hh_taso: 4, d1_taso: 4, hh_pvm: new Date().toISOString().slice(0, 10), tki_viimeisin: 70, d2_taso: 4, d2_lahde: 'tk', tki_pvm: new Date().toISOString().slice(0, 10) });
    expect(tuore).not.toContain('päivitä'); expect(tuore).toContain('var(--teal)');
  });
  it('Kausi: vanhentuneen mittauksen pelaaja pois tasolaskennoista (Pt) ja huomautus; päivämäärä puuttuu → pysyy mukana', () => {
    const src = funktio(MA, 'renderSeason'); expect(src).toContain('tmTasoVanhentunut(_mMittPvm(p))'); expect(src).toContain('yli 12 kk vanha — ei tasona eikä värinä');
  });
  it('pelaajakortin otsikko: yli 12 kk → "mitattu 2023 · päivitä" (ei "testattu 28.10.2023" nykytasona)', () => { expect(funktio(MA, '_mPinfoOsat')).toContain('tmMittausIkaTeksti(_testPvmIso, null, masterT)'); });
});

describe('7 · päivämäärät suomalaisessa muodossa', () => {
  it('Kuorma: ISO "2026-09-20" → "20.9." (ei "09-20")', () => { expect(PVM.tmPvmFiLyhyt('2026-09-20')).toBe('20.9.'); expect(PVM.tmPvmFiLyhyt('2026-12-01')).toBe('1.12.'); expect(PVM.tmPvmFiLyhyt(null)).toBe(''); expect(MA).toContain("tmPvmFiLyhyt(r.pvm)"); expect(MA).not.toMatch(/\(r\.pvm \|\| ''\)\.slice\(5\)/); });
});
