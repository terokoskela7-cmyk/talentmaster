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
    expect(VP).toMatch(/<script src="lib\/tm_mittarit\.js\?v=\d+"><\/script>/);
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

describe('laskentatyypit B–D', () => {
  it('B tavoitetasoOsuus: rajalla tasan lasketaan mukaan, suunta valittavissa, ei-numerot pois, N < 5 piilotetaan', () => {
    expect(M.tavoitetasoOsuus([80, 79, 95, 60, 81], 80)).toMatchObject({ arvo: 60, n: 3, N: 5, tila: 'ok' });
    expect(M.tavoitetasoOsuus([4.1, 4.3, 4.2, 4.0, 4.5], 4.2, true)).toMatchObject({ arvo: 60, n: 3, N: 5 });
    expect(M.tavoitetasoOsuus([90, null, 'x', NaN, 85, 70, 88, 92], 80)).toMatchObject({ n: 4, N: 5 });
    expect(M.tavoitetasoOsuus([90, 85, 70], 80)).toMatchObject({ arvo: null, tila: 'liian_pieni' });
    expect(M.tavoitetasoOsuus([], 80)).toMatchObject({ arvo: null, tila: 'ei_dataa' });
  });
  it('C maaraVsTavoite: määrä ja tavoite sellaisinaan, puuttuva = null (ei 0)', () => {
    expect(M.maaraVsTavoite(27, 35)).toEqual({ arvo: 27, tavoite: 35 });
    expect(M.maaraVsTavoite(0, 35)).toEqual({ arvo: 0, tavoite: 35 });
    expect(M.maaraVsTavoite(undefined, null)).toEqual({ arvo: null, tavoite: null });
  });
  it('D asteikonKeskiarvo: 1 desimaali, ei-numerot pois, tyhjä → null ja N 0', () => {
    expect(M.asteikonKeskiarvo([7, 8, 6, 8])).toEqual({ arvo: 7.3, N: 4 });
    expect(M.asteikonKeskiarvo([7, null, 'x', 9])).toEqual({ arvo: 8, N: 2 });
    expect(M.asteikonKeskiarvo([])).toEqual({ arvo: null, N: 0 });
  });
});

describe('K1b ikätaso (normi interpoloidaan tarkalla iällä, päätetty 2.10.)', () => {
  const pojka = { sukupuoli: 'M', syntymaVuosi: 2012, syntymaaika: '2012-05-01' };
  it('jatkuva taso: normirajalla tasan 3,00 ja 4,00; taulukon järjestys [t5..t2] huomioitu', () => {
    expect(M.k1bTasoPisteelle({ lin30m: 4.42 }, 13.5, 'M').taso).toBeCloseTo(3, 6);
    expect(M.k1bTasoPisteelle({ lin30m: 4.29 }, 13.5, 'M').taso).toBeCloseTo(4, 6);
    expect(M.k1bTasoPisteelle({ lin30m: 6.0 }, 13.5, 'M').taso).toBe(1);
    expect(M.k1bTasoPisteelle({ cmj: 50 }, 13.5, 'M').taso).toBe(5);
  });
  it('tammikuun ikäluokan vaihto ei laske tasoa: sama tulos marras → tammi = tahdissa (pieni lasku)', () => {
    const r = M.k1bTila(Object.assign({}, pojka, { historia: [H('2025-11-15', { lin30m: 4.5 }), H('2026-01-15', { lin30m: 4.5 })] }));
    expect(r.tila).toBe('tahdissa'); expect(r.delta).toBeGreaterThan(-0.3); expect(r.delta).toBeLessThan(0);
  });
  it('vuoden pysähdys → hitaammin; selvä parannus → nopeammin', () => {
    expect(M.k1bTila(Object.assign({}, pojka, { historia: [H('2025-04-15', { lin30m: 4.5, cmj: 32 }), H('2026-04-14', { lin30m: 4.5, cmj: 32 })] })).tila).toBe('hitaammin');
    expect(M.k1bTila(Object.assign({}, pojka, { historia: [H('2025-10-14', { lin30m: 4.6, cmj: 30 }), H('2026-04-14', { lin30m: 4.3, cmj: 35 })] })).tila).toBe('nopeammin');
  });
  it('vaadittu vauhti: 30 m tason 3 pitäminen P14 ≈ −0,14 s / v', () => {
    expect(M.vaadittuVauhti('lin30m', 13.5, 'M', 3)).toBeCloseTo(-0.14, 2);
  });
  it('kehitysvaihe: kypsyysmittaus → biologinen ikä; puuttuu → kalenteri-ikä (ei suljeta pois), merkintä', () => {
    const h = [H('2025-10-14', { lin30m: 4.5 }), H('2026-04-14', { lin30m: 4.4 })];
    const bio = [{ mittauspaiva: '2025-10-10', maturity_offset: -1.2 }, { mittauspaiva: '2026-04-10', maturity_offset: -0.7 }];
    const b = M.k1bTila(Object.assign({}, pojka, { historia: h, bioDocs: bio, vertailu: 'kehitysvaihe' }));
    const k = M.k1bTila(Object.assign({}, pojka, { historia: h, bioDocs: bio }));
    expect(b.vertailu).toBe('kehitysvaihe'); expect(b.kalenteriVara).toBe(false); expect(b.tasoA).not.toBe(k.tasoA);
    const ilman = M.k1bTila(Object.assign({}, pojka, { historia: h, bioDocs: [], vertailu: 'kehitysvaihe' }));
    expect(ilman.kalenteriVara).toBe(true); expect(ilman.tasoA).toBe(k.tasoA);
  });
  it('PH → ei vertailukelpoinen', () => {
    const r = M.k1bTila({ sukupuoli: 'N', syntymaVuosi: 2012, bioDocs: [{ mittauspaiva: '2026-01-01', phv_tila_koodi: 'PH' }],
      historia: [H('2026-01-10', { lin30m: 4.8 }), H('2026-06-10', { lin30m: 4.7 })] });
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
