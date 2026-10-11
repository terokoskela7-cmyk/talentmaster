/* YKSI TOTUUS NÄKYMISSÄ (Master + VP): kortti, ponnahdus, banneri, kattavuus, VP:n joukkuekortti ja hero antavat samat luvut ja saman luokan — kaikki lib/tm_nakyma_ryhmat.js:stä
   (→ tm_tekniikka / tm_fyysinen, VANHA_KK normistosta, päivä tm_testipaiva:sta). Tallennettuja d1_taso/d2_taso-kenttiä ei käytetä luokitteluun. Fixturet anonymisoituja (tests/helpers/yksi_totuus_fixture.cjs). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const F = require('./helpers/yksi_totuus_fixture.cjs'), H = require('./helpers/master_season_sandbox.cjs');
['tm_normisto', 'tm_testipaiva', 'tm_joukkuesaanto', 'tm_tekniikka', 'tm_fyysinen', 'tm_koti_luvut'].forEach((m) => require('../lib/' + m + '.js'));
const NR = require('../lib/tm_nakyma_ryhmat.js'), lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8'), t = (h) => h.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
const RYHMAT = (R) => Object.fromEntries(NR.RYHMAT.map((g) => [g, R.ryhmat[g].length]));

describe('lib: ryhmittely ja luvut (KPV P13 / P12, SJK P15)', () => {
  it('P13: 4/16 mitattu · 8 vanhaa · 4 ei dataa → ei luokkaa; #3 (TKI 38) ja #11 (TKI 34) ovat kehityskohteita vaikka tallennettu d2_taso on 3,5 / 4', () => {
    const R = NR.tmRyhmat('d2', F.p13(), F.NYT);
    expect(RYHMAT(R)).toEqual({ kehityskohde: 2, ok: 2, neutraali: 0, vanha: 8, paiva_tuntematon: 0, ei_dataa: 4 });
    expect(R.luokka.luokka).toBe('ei_luokkaa'); expect(R.luokka.mitattu).toBe(R.kortti.mitattu);
    expect(R.ryhmat.kehityskohde.map((r) => r.p.id).sort()).toEqual(['p13_11', 'p13_3']);
    expect(NR.tmKorttiSyy(R)).toBe('4/16 mitattu tuoreesti · 8 tulosta yli 15 kk vanhoja · 4 ilman tulosta – seuraava tekniikkakisa päivittää');
    expect(R.kortti.muistutuksia).toBe(1);   // #7: tekniikkakisasta yli vuosi (12 kk), tulos yhä voimassa
  });
  it('P12: 9/14 → kehityskohde (5)', () => {
    const R = NR.tmRyhmat('d2', F.p12(), F.NYT);
    expect(RYHMAT(R)).toMatchObject({ kehityskohde: 5, ok: 4, vanha: 5 }); expect(R.luokka.luokka).toBe('kehityskohde'); expect(R.kortti.mitattu).toBe(9);
    expect(NR.tmKorttiOtsikko(R).savy).toBe('amber');
  });
  it('tallennetut d1_taso/d2_taso eivät vaikuta: kaikille 5 → sama luokitus', () => {
    const P = F.p13().map((p) => Object.assign({}, p, { d2_taso: 5, d1_taso: 5, hh_taso: 5 })), a = NR.tmRyhmat('d2', P, F.NYT), b = NR.tmRyhmat('d2', F.p13(), F.NYT);
    expect(RYHMAT(a)).toEqual(RYHMAT(b));
  });
  it('SJK P15: D2-pylväät (kehityskohde + ok) = mitattu; neutraali ja vanha erikseen; yksi ilman dataa; stale d2_taso/tsi_recalc ei vaikuta', () => {
    const P = F.sjkP15(), R2 = NR.tmRyhmat('d2', P, F.NYT), R1 = NR.tmRyhmat('d1', P, F.NYT);
    expect(RYHMAT(R2)).toEqual({ kehityskohde: 2, ok: 6, neutraali: 4, vanha: 3, paiva_tuntematon: 2, ei_dataa: 3 });
    expect(R2.ryhmat.kehityskohde.length + R2.ryhmat.ok.length).toBe(R2.kortti.mitattu); expect(R2.kortti.mitattu).toBe(R2.luokka.mitattu); expect(R2.kortti.mitattu).toBe(8);   // vanha Master: "mitattu 15/20"
    expect(NR.tmRyhmaOtsikko('neutraali', 'd2')).toBe('Nopeus ja tekniikka samalla tasolla'); expect(NR.tmRyhmaOtsikko('neutraali', 'd1')).toBe('Kypsyys ratkaisee (§28)');
    expect(RYHMAT(R1)).toMatchObject({ ok: 8, neutraali: 4, vanha: 3 }); expect(NR.tmKorttiSyy(R2)).toContain('4 nopeus ja tekniikka samalla tasolla'); expect(NR.tmKorttiSyy(R1)).toContain('4 kypsyys ratkaisee');
  });
  it('D1-osaindeksit: §28 neutraloima enemmistö → harmaa "kypsyys ratkaisee" ilman lukua; amber vain luokittelun syynä oleville osille', () => {
    const R1 = NR.tmRyhmat('d1', F.sjkP15(), F.NYT), os = NR.tmD1Osaprofiili(R1), voima = os.find((o) => o.osa === 'voima');
    expect(voima.neutraloituja).toBeGreaterThan(0); expect(os.every((o) => o.savy !== 'amber')).toBe(true);   // luokka ok → ei ambereita
    const kd = F.sjkP15().map((p, i) => (i < 8 ? Object.assign({}, p, { hh_viimeisin: { cmj: 25, mas: 17 }, phv_tila: 'POST', biologinenIka_viimeisin: { phv: 'POST' } }) : p));   // tason 1 voima ilman §28:aa → syy
    const R = NR.tmRyhmat('d1', kd, F.NYT); if (R.luokka.luokka === 'kehityskohde') expect(NR.tmD1Osaprofiili(R).some((o) => o.savy === 'amber')).toBe(true);
  });
  it('päivä: kausiarvio (pvm_arvio / kausiteksti) kelpaa vanhuuteen ja näkyy "päivä arvioitu kaudesta"; tuntematon ei ole tuore eikä kehityskohde', () => {
    const arv = F.p13().map((p, i) => (i === 1 ? Object.assign({}, p, { tki_pvm: '2025-10-15', tki_pvm_arvio: true }) : i === 3 ? Object.assign({}, p, { tki_pvm: 'syksy 2025' }) : i === 4 ? Object.assign({}, p, { tki_pvm: '' }) : p));
    const R = NR.tmRyhmat('d2', arv, F.NYT), a = R.ryhmat.ok.concat(R.ryhmat.kehityskohde).filter((r) => r.arvio);
    expect(a.length).toBe(2); expect(NR.tmRiviSelite(a[0], 'd2')).toContain('päivä arvioitu kaudesta (syksy 2025)'); expect(R.luokka.arvioPvm).toBe(2); expect(R.kortti.arvioita).toBe(2);
    expect(R.ryhmat.paiva_tuntematon.length).toBe(1); expect(NR.tmRiviSelite(R.ryhmat.paiva_tuntematon[0], 'd2')).toContain('päivä tuntematon');
    expect(R.ryhmat.kehityskohde.some((r) => r.p.id === 'p13_5')).toBe(false);   // #5: ei päivää → ei kehityskohde (TKI 39 < 40)
  });
  it('kattavuus: tuoreesti luokitellut; vanhat erikseen; puuttuva data on neutraali "ei vielä mitattu", ei punainen', () => {
    const Y = NR.tmNakymaYhteenveto(F.sjkP15(), F.NYT); expect(Y.kattavuus).toMatchObject({ testattu: 12, vainVanha: 3, ilmanTulosta: 5, yht: 20 }); expect(Y.banneri).toEqual({ n: 3, kk: 15 });
    expect(NR.tmBanneriTeksti(Y.banneri)).toBe('3 pelaajan tulos on yli 15 kk vanha — ei tasona eikä värinä · päivitä mittaus');
    expect(NR.tmKattavuusNayta(0, 16)).toEqual({ teksti: 'ei vielä mitattu', savy: 'neutraali' }); ['teal', 'amber', 'neutraali'].forEach((s) => expect(['teal', 'amber', 'neutraali']).toContain(s));
    [[1, 16], [5, 16], [8, 16], [12, 16], [16, 16]].forEach(([n, y]) => expect(NR.tmKattavuusNayta(n, y).savy).not.toBe('red'));
  });
});

describe('kytkentä: Masterin kortti, popup ja banneri = lib (KPV P13)', () => {
  const M = H.luo(F.p13(), F.NYT), k = M.kausi();
  it('D2-kortti: sama syyrivi kuin libissä; pylväät summautuvat mitattuun; ei "liian vähän mitattuja" ilman syytä', () => {
    const x = t(k.hist); expect(x).toContain('4/16 mitattu tuoreesti · 8 tulosta yli 15 kk vanhoja · 4 ilman tulosta – seuraava tekniikkakisa päivittää'); expect(x).not.toContain('liian vähän mitattuja');
    expect(x).toMatch(/Kehityskohde\|2\|Ok\|2\|/); expect(x).toContain('Tekniikkakisasta yli vuosi · 1');
  });
  it('D1: ei "tämä seura on TKI-pohjainen" -päätelmää → "Ei H-H-fyysisiä mittauksia"', () => { const x = t(k.hist); expect(x).toContain('Ei H-H-fyysisiä mittauksia'); expect(x).not.toContain('TKI-pohjainen'); });
  it('banneri: "8 pelaajan tulos on yli 15 kk vanha" (VANHA_KK normistosta, ei 12 kk) ja kattavuus "Testattu" samasta luokittelusta (4/16 = 25 %)', () => {
    const x = t(k.pulse); expect(x).toContain('8 pelaajan tulos on yli 15 kk vanha'); expect(x).not.toContain('12 kk');
    expect(t(k.hist)).toMatch(/Testattu \|25 %\|8 pelaajalla vain yli 15 kk vanha tulos/);
  });
  it('puuttuva data ei punaisena: Peliäly/PHV/Valmius "ei vielä mitattu"; hist ei sisällä var(--red)', () => { expect(t(k.hist)).toMatch(/Peliäly ≥3 \|ei vielä mitattu/); expect(k.hist).not.toContain('var(--red)'); });
  it('popup (D2): ryhmät libistä; ei "taso < 3" / "taso ≥ 3" -otsikoita; #3 ja #11 kehityskohteina syineen, päivät tai kausi näkyvissä', () => {
    const x = t(M.popup('d2')); expect(x).toContain('Kehityskohde (2)'); expect(x).toContain('Ok (2)'); expect(x).toContain('Tulos yli 15 kk vanha (8)'); expect(x).toContain('Ei dataa (4)');
    expect(x).not.toMatch(/taso\s*[<≥]\s*3/); expect(x).toContain('p13_3'); expect(x).toContain('TKI 38'); expect(x).toContain('alle ikäluokan tason'); expect(x).toMatch(/mitattu \d+\.\d+\.2024/);
    expect(x).toContain('4/16 mitattu tuoreesti');
  });
  it('popup: tallennetut tasot eivät muuta ryhmiä', () => { const P = F.p13().map((p) => Object.assign({}, p, { d2_taso: 1 })); expect(t(H.luo(P, F.NYT).popup('d2'))).toContain('Kehityskohde (2)'); });
});

describe('kytkentä: SJK P15 Masterissa ja VP:n joukkuekortissa', () => {
  const M = H.luo(F.sjkP15(), F.NYT), k = M.kausi();
  it('Master: D2 4 nopeus ja tekniikka samalla tasolla; D1 4 kypsyys ratkaisee (§28 vain D1:lle); "§28-neutraali" ei D2:ssa', () => {
    const x = t(k.hist); expect(x).toContain('4 nopeus ja tekniikka samalla tasolla'); expect(x).toContain('4 kypsyys ratkaisee'); expect(x).not.toContain('§28-neutraali');
    expect(M.popup('d2')).toContain('Nopeus ja tekniikka samalla tasolla'); expect(M.popup('d1')).toContain('Kypsyys ratkaisee');
  });
  it('Master: D1-osaprofiilissa neutraloitu voima harmaa "kypsyys ratkaisee" (ei lukua)', () => { expect(k.hist).toMatch(/Voima[\s\S]{0,400}kypsyys ratkaisee/); });
});

describe('kytkentä: VP:n joukkuekortti ja hero = sama lib', () => {
  const VP = lue('TalentMaster_VP_v25.html');
  function ymp(P) {
    const sb = { console: { log() {}, warn() {}, error() {} }, document: { getElementById: (id) => (id === 'joukkuekortit' ? sb.__el : null) }, __el: { innerHTML: '' }, Math, JSON, Object, Array, String, Number, Set, Map, parseFloat, parseInt }; sb.window = sb; vm.createContext(sb);
    sb.Date = class extends Date { constructor(...a) { super(...(a.length ? a : [F.NYT])); } static now() { return F.NYT; } };
    for (const f of ['lib/tm_phv_tila.js', 'lib/tm_mittarit.js', 'lib/tm_eerikkila_normit.js']) vm.runInContext(lue(f), sb);
    sb.window.TM_NAKYMA_RYHMAT = NR; sb.window.TM_FYSINEN = require('../lib/tm_fyysinen.js'); sb.window.TM_TEKNIIKKA = require('../lib/tm_tekniikka.js'); sb.window.TM_KOTI_LUVUT = require('../lib/tm_koti_luvut.js');
    Object.assign(sb, { vpT: (x) => x, joukkueJarjestys: () => 0, lyhennaNimi: (x) => x, tmOnVanhaMittaus: () => false, tmPvmFi: (x) => x, tmKuukausiaMittauksesta: () => 0, onNeutraaliPrePHV: () => false, raeJoukkueJakauma: () => ({ n_kvartaalillisia: 0 }), _jsvJoukkueIkaSp: () => ({ ika: 13, sp: 'P' }), _pelaajat: P, _vpJoukkueDocs: F.jk });
    for (const n of ['laskeJoukkueSuunta', '_pJNimet', '_pOnJoukkueessa', '_pRyhmiteltyJoukkueittain', 'renderTeamPulse', 'laskeHeroInsight']) vm.runInContext(H.funktio(VP, 'function ' + n + '('), sb);
    return sb;
  }
  it.each([['P13', F.p13], ['P12', F.p12], ['SJK P15', F.sjkP15]])('%s: VP-kortin D2-luokitusrivi sisältää libin syyrivin sellaisenaan', (n, mk) => {
    const P = mk(), sb = ymp(P); sb.renderTeamPulse(); const x = t(sb.__el.innerHTML), R = NR.tmRyhmat('d2', P, F.NYT);
    expect(x).toContain('D2 · '); expect(x).toContain(NR.tmKorttiSyy(R)); expect(x).not.toMatch(/taso\s*[<≥]\s*3/);
  });
  it('hero: seuratason lause ei käytä omia tasorajoja — D1:n kattavuusportti tuoreesti luokitelluista; vanhat mainitaan', () => {
    const sb = ymp(F.sjkP15()); const s = sb.laskeHeroInsight(F.sjkP15()); expect(typeof s).toBe('string'); expect(s).toContain('D1 mitattu'); expect(s).toContain('3 pelaajan tulos on yli 15 kk vanha');
    expect(sb.laskeHeroInsight(F.p13())).toContain('Ensimmäiset mittaukset kirjattu');   // P13: ei D1-dataa → oletus
  });
  it('syvänäkymän kattavuus käyttää libin D1/D2-syyrivejä (ei omaa H-H n/N · TKI n/N -laskentaa)', () => {
    expect(VP).toContain("tmRyhmat('d1', pelaajat, _nytS"); expect(VP).not.toContain("osat.push('H-H ' + kHH"); expect(VP).not.toContain("osat.push('TKI ' + kTKI");
  });
});

describe('vartijat: ei omia luokittelurajoja eikä tallennettuja tasoja luokitteluun Masterin/VP:n kortti- ja ponnahduskoodissa', () => {
  const MA = lue('TalentMaster_Master_v16.html'), VP = lue('TalentMaster_VP_v25.html');
  const koodit = [['Master renderSeason', H.funktio(MA, 'function renderSeason')], ['Master popup', H.funktio(MA, 'window._avaaKausiPelaajat = function')], ['VP laskeHeroInsight', H.funktio(VP, 'function laskeHeroInsight')], ['VP renderTeamPulse D1/D2-luokitus', H.funktio(VP, 'function renderTeamPulse').split('YKSI TOTUUS')[1] || '']];
  it.each(koodit)('%s: ei vertailua d1_taso/d2_taso/hh_taso-kenttään luokittelua varten (Taso ≥3 -mittari kulkee laskeTaso3Osuus-libin kautta)', (n, src) => {
    expect(src).not.toMatch(/\b(?:d1_taso|d2_taso|hh_taso)\b\s*(?:<|<=|>=|>|===|!==)\s*\d/); expect(src).not.toMatch(/\b(?:12|15)\s*kk\b/); expect(src).not.toMatch(/\(taso\s*[<≥]\s*[1-5]\)/);
  });
  it('poistetut tekstit: "Kehityskohteet (taso < 3)", "Vahvuudet (taso ≥ 3)", "§28-neutraali N" D2:ssa, "tämä seura on TKI-pohjainen", "yli 12 kk vanha" Masterissa', () => {
    ['Kehityskohteet (taso < 3)', 'Vahvuudet (taso ≥ 3)', 'tämä seura on TKI-pohjainen', 'yli 12 kk vanha', "masterT('§28-neutraali')"].forEach((x) => expect(MA).not.toContain(x));
  });
});
