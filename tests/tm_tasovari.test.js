/* YKSI tasoväri + YKSI kattavuussääntö (lib/tm_tasovari.js, PR tmTasoVari). Luokat, ei hex-arvoja; kynnykset normistosta; §7.22: vain henkilökunnan näkymät. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const T = require('../lib/tm_tasovari.js'), NO = require('../lib/tm_normisto.js'), KL = require('../lib/tm_koti_luvut.js'), NR = require('../lib/tm_nakyma_ryhmat.js'), PVM = require('../lib/tm_pvm.js');
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const L = (v, o) => T.tmTasoVari(v, o);

describe('tmTasoVari — luokat asteikoittain', () => {
  it('hh5: 4–5 ok · 3 raja · 1–2 kehitys (ka: ≥3,5 / ≥2,5); kynnykset = normiston TASO_OK/TASO_RAJA', () => {
    expect([5, 4, 3.5, 3, 2.5, 2, 1].map((v) => L(v, { asteikko: 'hh5' }))).toEqual(['ok', 'ok', 'ok', 'raja', 'raja', 'kehitys', 'kehitys']);
    const R = NO.tmNormistoRajat(); expect(R.TASO_OK).toBe(3.5); expect(R.TASO_RAJA).toBe(2.5);
  });
  it('eerikkila3: EI KOSKAAN kehitys (kansallinen kärkiotos); taso 3 ok; 1–2 raja', () => {
    const arvot = []; for (let v = 0.5; v <= 3.5; v += 0.1) arvot.push(Math.round(v * 10) / 10);
    arvot.forEach((v) => expect(L(v, { asteikko: 'eerikkila3' }), String(v)).not.toBe('kehitys'));
    expect([3, 2, 1].map((v) => L(v, { asteikko: 'eerikkila3' }))).toEqual(['ok', 'raja', 'raja']);
  });
  it('tki: ≥60 ok · 40–59 raja · <40 kehitys; seuran TKI-raja (50) siirtää rajaa, 60 ei muutu', () => {
    expect([80, 60, 59, 40, 39].map((v) => L(v, { asteikko: 'tki' }))).toEqual(['ok', 'ok', 'raja', 'raja', 'kehitys']);
    expect(L(45, { asteikko: 'tki', asetukset: { rajat: { TKI: 50 } } })).toBe('kehitys'); expect(L(45, { asteikko: 'tki' })).toBe('raja');
    expect([85, 70, 45, 20].map((v) => T.tmTkiBandi(v))).toEqual(['erinomainen', 'hyva', 'kehitys', 'prioriteetti']);
  });
  it('valmius: ≥70 ok · ≥50 raja · muuten kehitys', () => { expect([90, 70, 69, 50, 49].map((v) => L(v, { asteikko: 'valmius' }))).toEqual(['ok', 'ok', 'raja', 'raja', 'kehitys']); });
  it('puuttuva, vanha, päivätön tai §28-neutraali → tuntematon (neutraali: ei punainen eikä amber)', () => {
    [null, undefined, '', NaN, 'x'].forEach((v) => expect(L(v, { asteikko: 'hh5' })).toBe('tuntematon'));
    ['vanha', 'tuntematon', 'paivaton'].forEach((t) => expect(L(5, { asteikko: 'hh5', tila: t })).toBe('tuntematon')); expect(L(5, { asteikko: 'tki', neutraali: true })).toBe('tuntematon'); expect(L(5, { asteikko: 'hh5', tila: 'tuore' })).toBe('ok');
    expect(T.tmTasoCss(null, { asteikko: 'hh5' })).toBe('var(--ink3)'); expect(T.tmTasoSavy('tuntematon')).toBe('neutraali');
  });
  it('värit = olemassa olevat tokenit, ei hex-arvoja; sävy libistä', () => {
    ['ok', 'raja', 'kehitys', 'tuntematon'].forEach((l) => expect(T.tmLuokkaCss(l)).toMatch(/^var\(--(teal|amber|red|ink3)\)$/));
    expect([5, 3, 1].map((v) => T.tmTasoCss(v, { asteikko: 'hh5' }))).toEqual(['var(--teal)', 'var(--amber)', 'var(--red)']); expect(T.tmTasoSavy('ok')).toBe('teal');
  });
});

describe('tmKattavuus — D125 yhdessä paikassa', () => {
  it('riittävä ≥ 70 %, matala < 40 %, muuten amber; otos pieni < OTOS_PIENI; min mitattu ≥ MIN_MITATTU; rajat normistosta', () => {
    expect(T.tmKattavuus(14, 20)).toMatchObject({ riittava: true, savy: 'teal', pct: 70 }); expect(T.tmKattavuus(13, 20).riittava).toBe(false);
    expect(T.tmKattavuus(12, 20)).toMatchObject({ riittava: false, matala: false, savy: 'amber', pct: 60 }); expect(T.tmKattavuus(7, 20)).toMatchObject({ matala: true, savy: 'neutraali' }); expect(T.tmKattavuus(8, 20).matala).toBe(false);
    expect(T.tmKattavuus(0, 20)).toMatchObject({ savy: 'neutraali', pct: 0 }); expect(T.tmKattavuus(3, 0)).toMatchObject({ riittava: false, pct: null });
    expect(T.tmKattavuus(7, 7)).toMatchObject({ otosPieni: true, minMitattu: true }); expect(T.tmKattavuus(8, 8).otosPieni).toBe(false); expect(T.tmKattavuus(4, 4).minMitattu).toBe(false);
    expect(NO.LUKITUT.KATTAVUUS_PELAAJA_PROS).toBe(70); expect(NO.LUKITUT.KATTAVUUS_MATALA_PROS).toBe(40);
  });
  it('sama sääntö kaikkialla: tm_koti_luvut.kattavuus (pelaajaosuus) ja tm_nakyma_ryhmat.tmKattavuusNayta antavat saman kuin tmKattavuus', () => {
    for (let yht = 1; yht <= 30; yht++) for (let n = 0; n <= yht; n++) {
      const K = T.tmKattavuus(n, yht), P = Array.from({ length: yht }, (_, i) => ({ i })), kl = KL.kattavuus(P, { _: [] }, (p) => p.i < n);
      expect(kl.riittava, n + '/' + yht).toBe(K.riittava);
      const nay = NR.tmKattavuusNayta(n, yht); if (n) { expect(nay.savy).toBe(K.savy); expect(nay.teksti).toBe(K.pct + ' %'); }
    }
  });
  it('luotettavuusrajat (MIN_MITATTU 5) tulevat normistosta: tm_vp_koti / tm_seuran_pulssi / tm_mittarit', () => {
    ['lib/tm_vp_koti.js', 'lib/tm_seuran_pulssi.js', 'lib/tm_mittarit.js'].forEach((f) => expect(lue(f), f).toMatch(/LUKITUT\.MIN_MITATTU/));
    expect(lue('lib/tm_mittarit.js')).toMatch(/LUKITUT\.VANHA_KK/);
  });
});

describe('vanhuusrajat — yksi vertailu (tm_normisto), ei 6 kk:n rajaa', () => {
  it('tmMuistutusKkYli / tmVanhaKkYli: ≥ MUISTUTUS_KK (12) / ≥ VANHA_KK (15); tmKkEro = päiviä / 30,4375', () => {
    expect([11.9, 12, 12.1].map((k) => NO.tmMuistutusKkYli(k))).toEqual([false, true, true]); expect([14.9, 15].map((k) => NO.tmVanhaKkYli(k))).toEqual([false, true]);
    expect(NO.tmKkEro(0, 30.4375 * 86400000)).toBeCloseTo(1, 9); expect(NO.tmKkEro(null, 1)).toBeNull();
  });
  it('lähteissä ei TUOREUS_KK / MITTAUS_VANHA_KK / MITTAUS_TASOTON_KK / 30.44 / 180 pv / "yli 6 kk" (VP, Master, libit)', () => {
    const lahteet = ['TalentMaster_VP_v25.html', 'TalentMaster_Master_v16.html', 'lib/tm_pvm.js', 'lib/tm_vp_tilanne.js'].map((f) => [f, lue(f)]);
    lahteet.forEach(([f, s]) => { expect(s, f).not.toMatch(/TUOREUS_KK|MITTAUS_VANHA_KK|MITTAUS_TASOTON_KK|30\.44[^3]|yli 6 kk|Yli 6 kk|\bd > 180\b/); });
    expect(PVM.TUOREUS_KK).toBeUndefined();
  });
});

describe('sama data → sama väri; kynnyksiä ei HTML:ssä', () => {
  const VP = lue('TalentMaster_VP_v25.html'), MA = lue('TalentMaster_Master_v16.html');
  it('VP:n hhTasoVari / tkiVari / _jsvTasoVari5 / _d5col ja libi antavat saman värin', () => {
    const pura = (nimi) => { const i = VP.indexOf('function ' + nimi + '('); let d = 0, j = VP.indexOf('{', i); for (let k = j; k < VP.length; k++) { if (VP[k] === '{') d++; else if (VP[k] === '}' && --d === 0) return VP.slice(i, k + 1); } };
    const ctx = vm.createContext({ tmTasoCss: T.tmTasoCss, tmTkiBandi: T.tmTkiBandi, tmLuokkaCss: T.tmLuokkaCss }); vm.runInContext(['hhTasoVari', 'tkiVari', 'tkiTaso', '_jsvTasoVari5', '_jsvTkiVari'].map(pura).join('\n') + '\nthis.f = { hh: hhTasoVari, tkiV: tkiVari, tkiT: tkiTaso, d5: _jsvTasoVari5, jt: _jsvTkiVari };', ctx);
    [null, 1, 1.4, 2, 2.4, 2.5, 3, 3.4, 3.5, 4, 5].forEach((v) => { expect(ctx.f.hh(v), String(v)).toBe(T.tmTasoCss(v, { asteikko: 'hh5' })); expect(ctx.f.d5(v)).toBe(ctx.f.hh(v)); });
    [null, 10, 39, 40, 59, 60, 79, 80, 100].forEach((v) => { expect(ctx.f.jt(v), String(v)).toBe(T.tmTasoCss(v, { asteikko: 'tki' })); if (v != null) expect(ctx.f.tkiV(ctx.f.tkiT(v)), String(v)).toBe(T.tmTasoCss(v, { asteikko: 'tki' })); });
  });
  it('Master ja VP kutsuvat libiä; ei hex-väriä tasofunktioissa; vanhat sisäkkäiset teal→amber-kynnysternaryt vain nimetyissä ei-taso-asteikoissa (% / VAI / audit)', () => {
    expect(VP).toContain('lib/tm_tasovari.js'); expect(MA).toContain('lib/tm_tasovari.js'); expect(lue('TalentMaster_Testaus_v9.html')).toContain('lib/tm_tasovari.js');
    ['function hhTasoVari(', 'function tkiVari(', 'function _jsvTkiVari('].forEach((s) => { const i = VP.indexOf(s); expect(VP.slice(i, VP.indexOf('\n', i)), s).not.toMatch(/#[0-9a-fA-F]{3,6}/); });
    const tern = /(?:>=?|<=?)\s*[0-9.]+\s*\?\s*'var\(--teal\)'\s*:[^;\n]{0,80}\?\s*'var\(--amber\)'/g;
    expect((VP.match(tern) || []).length + (MA.match(tern) || []).length).toBeLessThanOrEqual(9);   // jäljellä (ei taso/TKI/valmius): TSI-sekunnit (3), %-tulokset (3), gap, audit, pct-pulssi
    expect(MA).not.toMatch(/tki\s*>=\s*60\s*\?\s*'var\(--teal\)'/); expect(MA).not.toMatch(/hh\s*>=\s*4\s*\?\s*'var\(--teal\)'/);
  });
  it('§7.22: Pelaaja_v7 ja Vanhempi_v2 eivät lataa tm_tasovari.js eivätkä kutsu tasovärifunktioita', () => {
    ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html'].forEach((f) => { const s = lue(f); expect(s, f).not.toContain('tm_tasovari.js'); expect(s, f).not.toMatch(/\btmTasoVari\b|\btmTasoCss\b|\bhhTasoVari\b|\btkiVari\b|\btmTkiBandi\b/); });
  });
});
