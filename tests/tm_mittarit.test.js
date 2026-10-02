/**
 * lib/tm_mittarit.js — Kehitystilanne v0 laskentasäännöt (brief: Seurakehitysdashboard v0, 2.10.2026).
 * Kellot kiinnitetty: kaikki päivämäärät ovat kiinteitä merkkijonoja (vrt. #637, fixture ei vanhene).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(import.meta.url);
const M = req('../lib/tm_mittarit.js');
const H = (pvm, x) => Object.assign({ pvm }, x);

describe('Hidden Gem siirretty VP:stä: sama tulos kuin vanha koodi', () => {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, 'tests/fixtures/hidden_gem_vp_ennen_siirtoa.js.txt'), 'utf8')
    + '\nthis.hg = laskeHiddenGem; this.d2 = laskeD2Taso; this.F = HIDDEN_GEM_FLEI;', ctx);
  it('HIDDEN_GEM_FLEI = 65 ja identtinen tulos pelaajaruudukolle', () => {
    expect(M.HIDDEN_GEM_FLEI).toBe(ctx.F);
    const arvot = [null, 1, 2, 2.5, 2.6, 3, 3.5, 4, 5];
    let n = 0;
    for (const hh of arvot) for (const d2 of arvot) for (const tki of [null, 30, 75]) for (const phv of [null, 'PRE', 'LAH', 'PH', 'AN'])
      for (const tv of [null, { merkki: 'kulta' }, { merkki: 'pronssi' }]) for (const flei of [null, 64, 65]) for (const to of [true, false]) {
        const p = { hh_taso: hh, d2_taso: d2, tki_viimeisin: tki, phv_tila: phv, tekninen_varhaiskehitys: tv, flei_viimeisin: flei, talenttiOhjelma: to };
        expect(M.laskeHiddenGem(p)).toEqual(ctx.hg(p)); expect(M.laskeD2Taso(p)).toEqual(ctx.d2(p)); n++;
      }
    expect(n).toBeGreaterThan(10000);
  });
  it('VP ei enää määrittele niitä itse, lataa kirjaston', () => {
    const VP = readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
    expect(VP).not.toMatch(/function laskeHiddenGem\(|function laskeD2Taso\(|const HIDDEN_GEM_FLEI/);
    expect(VP).toContain('<script src="lib/tm_mittarit.js?v=1"></script>');
  });
});

describe('SWC', () => {
  it('kerroin = 0,2 / 1,6832 (yksi nimetty vakio, tila alustava)', () => {
    expect(M.SWC_KERROIN).toBeCloseTo(0.11882, 4); expect(M.SWC_TILA).toBe('alustava');
  });
  it('briefin esimerkit P14 pojat: 30 m ≈ 0,05 s, CMJ ≈ 0,9 cm; MAS km/h (×3,6)', () => {
    expect(M.swcNormista('lin30m', 14, 'M')).toBeCloseTo(0.0475, 3);
    expect(M.swcNormista('cmj', 14, 'M')).toBeCloseTo(0.879, 2);
    const masMs = Math.abs(4.60 - 4.24) * M.SWC_KERROIN;
    expect(M.swcNormista('mas', 14, 'M')).toBeCloseTo(masMs * 3.6, 6);
  });
  it('ei normia (ikä < 10, tuntematon sukupuoli) → null → varaskaala', () => {
    expect(M.swcNormista('lin30m', 8, 'M')).toBeNull();
    expect(M.swcNormista('lin30m', 14, null)).toBeNull();
  });
  it('varaskaala 0,2 × SD vaatii ≥ 10 mittausta, muuten seuraava joukko (koko ikävaihe)', () => {
    const pieni = [4, 4.1, 4.2], iso = Array.from({ length: 10 }, (_, i) => 4 + i * 0.1);
    const sd = Math.sqrt(iso.reduce((a, x) => a + (x - 4.45) ** 2, 0) / 9);
    expect(M.swcSeurasta([pieni, iso])).toBeCloseTo(0.2 * sd, 9);
    expect(M.swcSeurasta([pieni])).toBeNull();
  });
});

describe('K1 vertailupari ja tila', () => {
  const pohja = { testi: 'lin30m', sukupuoli: 'M', syntymaVuosi: 2012 };
  it('suunta: aikatesti pienempi parempi → ↑; cmj isompi parempi → ↑', () => {
    const a = M.k1Tila(Object.assign({}, pohja, { historia: [H('2026-01-10', { lin30m: 4.60 }), H('2026-06-10', { lin30m: 4.50 })] }));
    expect(a.tila).toBe('vahva_ylos'); expect(a.symboli).toBe('↑'); expect(a.swcLahde).toBe('normi');
    const c = M.k1Tila(Object.assign({}, pohja, { testi: 'cmj', historia: [H('2026-01-10', { cmj: 30 }), H('2026-06-10', { cmj: 32 })] }));
    expect(c.tila).toBe('vahva_ylos');
    const d = M.k1Tila(Object.assign({}, pohja, { historia: [H('2026-01-10', { lin30m: 4.50 }), H('2026-06-10', { lin30m: 4.60 })] }));
    expect(d.tila).toBe('vahva_alas');
  });
  it('alle SWC → vaihtelun sisällä', () => {
    const r = M.k1Tila(Object.assign({}, pohja, { historia: [H('2026-01-10', { lin30m: 4.60 }), H('2026-06-10', { lin30m: 4.58 })] }));
    expect(r.tila).toBe('vaihtelu');
  });
  it('CV annettu → ↗ mahdollinen (≥ SWC mutta < CV)', () => {
    const r = M.k1Tila(Object.assign({}, pohja, { cv: 0.02, historia: [H('2026-01-10', { lin30m: 4.60 }), H('2026-06-10', { lin30m: 4.54 })] }));
    expect(r.tila).toBe('mahd_ylos'); expect(r.symboli).toBe('↗');
  });
  it('liian lyhyt väli (< 8 vk), liian pitkä (> 15 kk), ei paria (yksi mittaus)', () => {
    expect(M.k1Tila(Object.assign({}, pohja, { historia: [H('2026-01-10', { lin30m: 4.6 }), H('2026-02-20', { lin30m: 4.4 })] })).syy).toBe('liian_lyhyt');
    expect(M.k1Tila(Object.assign({}, pohja, { historia: [H('2024-01-10', { lin30m: 4.6 }), H('2025-05-11', { lin30m: 4.4 })] })).syy).toBe('liian_pitka');
    expect(M.k1Tila(Object.assign({}, pohja, { historia: [H('2026-01-10', { lin30m: 4.6 })] })).syy).toBe('ei_paria');
  });
  it('yli 9 kk väli → vertailukelpoinen mutta pitkaVali-merkintä', () => {
    const r = M.k1Tila(Object.assign({}, pohja, { historia: [H('2025-01-10', { lin30m: 4.7 }), H('2025-11-20', { lin30m: 4.5 })] }));
    expect(r.tila).toBe('vahva_ylos'); expect(r.pitkaVali).toBe(true);
  });
  it('PH jommallakummalla kerralla → ei vertailukelpoinen (kasvupyrähdys), ei ↓', () => {
    const bio = [{ mittauspaiva: '2026-01-01', phv_tila_koodi: 'LAH' }, { mittauspaiva: '2026-06-01', phv_tila_koodi: 'PH' }];
    const r = M.k1Tila(Object.assign({}, pohja, { bioDocs: bio, historia: [H('2026-01-10', { lin30m: 4.5 }), H('2026-06-10', { lin30m: 4.7 })] }));
    expect(r.tila).toBe('ei_vertailukelpoinen'); expect(r.syy).toBe('kasvupyrahdys');
  });
  it('PHV puuttuu → "ei tiedossa", pelaajaa ei suljeta pois', () => {
    const r = M.k1Tila(Object.assign({}, pohja, { bioDocs: [], historia: [H('2026-01-10', { lin30m: 4.6 }), H('2026-06-10', { lin30m: 4.5 })] }));
    expect(r.phvA).toBeNull(); expect(r.tila).toBe('vahva_ylos');
  });
  it('ei normia (ikä 8) → varaskaala seurasta; ilman sitä ei vertailukelpoinen', () => {
    const h = [H('2026-01-10', { lin30m: 6.0 }), H('2026-06-10', { lin30m: 5.8 })];
    expect(M.k1Tila({ testi: 'lin30m', sukupuoli: 'M', syntymaVuosi: 2018, historia: h }).syy).toBe('ei_swc');
    const r = M.k1Tila({ testi: 'lin30m', sukupuoli: 'M', syntymaVuosi: 2018, historia: h, swcSeura: 0.05 });
    expect(r.swcLahde).toBe('seura'); expect(r.tila).toBe('vahva_ylos');
  });
});

describe('pelaajataso, osuudet ja N < 5', () => {
  it('kehittyy: ≥ puolet mitatuista ↑ eikä yhtään ↓', () => {
    const t = (x) => ({ tila: x });
    expect(M.pelaajaKehittyy([t('vahva_ylos'), t('vaihtelu'), t('ei_vertailukelpoinen')])).toBe(true);
    expect(M.pelaajaKehittyy([t('vahva_ylos'), t('vahva_ylos'), t('vahva_alas')])).toBe(false);
    expect(M.pelaajaKehittyy([t('vahva_ylos'), t('vaihtelu'), t('vaihtelu')])).toBe(false);
    expect(M.pelaajaKehittyy([t('ei_vertailukelpoinen')])).toBeNull();
  });
  it('kehitysosuus: ↑ / (↑ + → + ↓); ↗ ja ei-vertailukelpoiset eivät nimittäjässä', () => {
    const t = (x) => ({ tila: x });
    const r = M.kehitysosuus([t('vahva_ylos'), t('vahva_ylos'), t('vaihtelu'), t('vahva_alas'), t('vaihtelu'), t('mahd_ylos'), t('ei_vertailukelpoinen')]);
    expect(r).toMatchObject({ arvo: 40, n: 2, N: 5, tila: 'ok' });
    expect(r.jakauma.mahd_ylos).toBe(1);
  });
  it('N < 5 → ei prosenttia (liian pieni ryhmä); N = 0 → ei dataa (ei 0 %)', () => {
    expect(M.osuus(3, 4)).toEqual({ arvo: null, n: 3, N: 4, tila: 'liian_pieni' });
    expect(M.osuus(0, 0)).toMatchObject({ arvo: null, tila: 'ei_dataa' });
    expect(M.osuus(0, 5)).toMatchObject({ arvo: 0, tila: 'ok' });
  });
});

describe('K1b ikätaso', () => {
  it('Δ ≥ +0,5 nopeammin, ±0,5 tahdissa, ≤ −0,5 hitaammin; puuttuva taso lasketaan raaka-arvoista', () => {
    const o = { sukupuoli: 'M', syntymaVuosi: 2012 };
    expect(M.k1bTila(Object.assign({}, o, { historia: [H('2026-01-10', { hh_taso: 2 }), H('2026-06-10', { hh_taso: 2.7 })] })).tila).toBe('nopeammin');
    expect(M.k1bTila(Object.assign({}, o, { historia: [H('2026-01-10', { hh_taso: 3 }), H('2026-06-10', { hh_taso: 3.3 })] })).tila).toBe('tahdissa');
    expect(M.k1bTila(Object.assign({}, o, { historia: [H('2026-01-10', { hh_taso: 3 }), H('2026-06-10', { hh_taso: 2.5 })] })).tila).toBe('hitaammin');
    const raaka = M.k1bTila(Object.assign({}, o, { historia: [H('2026-01-10', { lin30m: 4.60, cmj: 30 }), H('2026-06-10', { lin30m: 4.25, cmj: 36 })] }));
    expect(raaka.tasoA).toBeLessThan(raaka.tasoB); expect(raaka.tila).toBe('nopeammin');
  });
  it('PH → ei vertailukelpoinen', () => {
    const r = M.k1bTila({ sukupuoli: 'N', syntymaVuosi: 2012, bioDocs: [{ mittauspaiva: '2026-01-01', phv_tila_koodi: 'PH' }],
      historia: [H('2026-01-10', { hh_taso: 2 }), H('2026-06-10', { hh_taso: 3 })] });
    expect(r.syy).toBe('kasvupyrahdys');
  });
});

describe('Lohko 1: tavoitteen tila ja ennuste', () => {
  const nyt = '2027-07-02';   // vuoden puoliväli (kiinteä)
  it('Täyttynyt / Raiteilla / Riskissä / Puuttuu', () => {
    expect(M.tavoitteenTila({ toteuma: 260, tavoite: 250, tyyppi: 'maara', nyt, vuosi: 2027 }).tila).toBe('tayttynyt');
    expect(M.tavoitteenTila({ toteuma: 130, tavoite: 250, tyyppi: 'maara', nyt, vuosi: 2027 }).tila).toBe('raiteilla');
    expect(M.tavoitteenTila({ toteuma: 100, tavoite: 250, tyyppi: 'maara', nyt, vuosi: 2027 }).tila).toBe('riskissa');
    expect(M.tavoitteenTila({ toteuma: null, tavoite: 130, tyyppi: 'maara', nyt, vuosi: 2027, kasinKirjattava: true }).tila).toBe('puuttuu');
  });
  it('tasomittari (osuus/keskiarvo): ennuste = toteuma, ei lineaarista kasvua', () => {
    expect(M.tavoitteenTila({ toteuma: 7.5, tavoite: 8, tyyppi: 'taso', nyt, vuosi: 2027 })).toEqual({ tila: 'riskissa', ennuste: 7.5 });
  });
  it('vaatimus (F): true täyttynyt, false riskissä, null puuttuu', () => {
    expect(M.tavoitteenTila({ toteuma: true, tavoite: true }).tila).toBe('tayttynyt');
    expect(M.tavoitteenTila({ toteuma: false, tavoite: true }).tila).toBe('riskissa');
    expect(M.tavoitteenTila({ toteuma: null, tavoite: true }).tila).toBe('puuttuu');
  });
});

describe('apurit', () => {
  it('pvmFi pp.kk.vvvv; jakso kevät/syksy', () => {
    expect(M.pvmFi('2027-03-05')).toBe('05.03.2027');
    expect(M.jakso('2027-06-30')).toEqual({ vuosi: 2027, jakso: 'kevat' });
    expect(M.jakso('2027-07-01')).toEqual({ vuosi: 2027, jakso: 'syksy' });
  });
  it('ei seuraId-literaaleja eikä seuranimiä kirjastossa', () => {
    const L = readFileSync(join(ROOT, 'lib/tm_mittarit.js'), 'utf8');
    expect(L).not.toMatch(/\b(eps|kpv|sjk|grifk|sibbovargarna|palloiirot|yilves|vifk|demo-fc|Espoo|Pallo-Iirot)\b/i);
  });
});
