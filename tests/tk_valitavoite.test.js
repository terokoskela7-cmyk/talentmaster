/**
 * TK-välitavoite ("Nyt X s → tavoite Y s") — huoltaja (Vanhempi_v2) ja pelaaja (Pelaaja_v7). Havainto: "Pujottelu nyt 12.4 s →
 * tavoite 25.5 s". Selvitys (§31 TK per-laji -viitteet, TK_LAJIVIITTEET): kaksi kopioitua laskentaa (_minaValitavoite/_vanhValitavoite)
 *   1) "hyvä"-taso jo saavutettu → tavoite = viite → HUONOMPI kuin nykyinen (13 v pujottelu 25.0 s → "tavoite 25.5 s")
 *   2) pyöristys 0.5 s → tavoite saattoi olla nykyistä huonompi (25.4 → 25.5)
 *   3) väärän protokollan tulos (H-H-pujottelu ~12 s) TK-viitettä (~25 s) vastaan → arvattu luku
 * Korjaus: YKSI jaettu TM_TESTIT.tkValitavoite (docs/testit_indeksit.js); null → rivi piilotetaan (ei arvattua lukua).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(ROOT, f), 'utf8');
const T = require('../docs/testit_indeksit.js');
const LANG = require('../lib/tm_lang.js');
const VUOSI = new Date().getFullYear();
const PUJ13 = T.tkLajiViite('pujottelu', 13, 'P');   // { erinomainen 24.8, hyva 25.3 }

describe('tkValitavoite — tavoite aina parempi kuin nykyinen; muuten null', () => {
  it('EI VACUOUS: viite on olemassa ja TK-mittakaavassa (~25 s)', () => { expect(PUJ13.hyva).toBeGreaterThan(20); });
  it.each([
    [27.5, 25],      // gap ≤ 3 → hyvä (25.3) pyöristettynä parempaan suuntaan → 25.0
    [30, 27],        // gap > 3 → arvo − 3 s
    [25.4, 25],      // pieni gap: pyöristys EI saa viedä yli nykyisen (ennen 25.5)
    [25.0, null],    // hyvä jo saavutettu (ennen "tavoite 25.5 s" = huonompi)
    [25.3, null],    // tasan hyvä
    [12.4, null],    // H-H-mittakaava TK-viitettä vastaan (havainnon tapaus) → ei arvattua lukua
    [50, null],      // epäuskottavan hidas → väärä mittakaava
  ])('pujottelu 13 v: %s s → %s', (arvo, odotus) => {
    const t = T.tkValitavoite(arvo, PUJ13, false);
    expect(t).toBe(odotus);
    if (t != null) expect(t).toBeLessThan(arvo);
  });
  it('suurempi parempi (pituuspotku_bonus): tavoite > nykyinen; hyvä saavutettu → null; matala bonus ei ole "väärä mittakaava"', () => {
    const v = T.tkLajiViite('pituuspotku_bonus', 13, 'P');
    expect(T.tkValitavoite(v.hyva - 1, v, true)).toBeGreaterThan(v.hyva - 1);
    expect(T.tkValitavoite(v.hyva + 1, v, true)).toBeNull();
    expect(T.tkValitavoite(2, v, true)).toBe(5);
  });
  it('puuttuva viite/arvo → null', () => {
    expect(T.tkValitavoite(27, null, false)).toBeNull();
    expect(T.tkValitavoite(null, PUJ13, false)).toBeNull();
    expect(T.tkValitavoite('', PUJ13, false)).toBeNull();
  });
});

function pura(src, tun) { const i = src.indexOf(tun); expect(i, tun).toBeGreaterThan(-1); let syv = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') syv++; else if (src[k] === '}') { syv--; if (!syv) return src.slice(i, k + 1); } } }
const tx = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

describe('Vanhempi_v2 · tekniikka: väärä/arvattu tavoite ei näy huoltajalle', () => {
  const V2 = lue('TalentMaster_Vanhempi_v2.html');
  const aja = (pujS) => {
    const lapsi = { syntymaVuosi: VUOSI - 13, sukupuoli: 'M', tki_viimeisin: 60, tki_kehityskohde: 'pujottelu', tki_vahvuus: 'syotto',
      tk_lajit_viimeisin: { syotto_s: 35, pujottelu_s: pujS } };
    const ctx = vm.createContext({ window: { _lapsi: lapsi, TM_TESTIT: T }, t: LANG.t, IKA: {}, _age: 'u15', Math, Number, String, Object, isNaN });
    const a = V2.indexOf('const _VANH_LAJINIMI'), b = V2.indexOf('const TUKIVINKIT');
    vm.runInContext([V2.slice(a, V2.indexOf(';', a) + 1), V2.slice(b, V2.indexOf('};', b) + 2), pura(V2, 'function _genetiivi('),
      pura(V2, 'function _vanhValitavoite('), pura(V2, 'function rVanhempiTekniikka(')].join('\n') + '\nthis.f = rVanhempiTekniikka;', ctx);
    return tx(ctx.f());
  };
  const NYT_TAV = /→/;
  it('havainnon tapaus 12.4 s (H-H-mittakaava) → EI "Nyt … → tavoite …" -riviä; kehityskohde-nimi säilyy', () => {
    const h = aja(12.4);
    expect(h).not.toMatch(NYT_TAV); expect(h).not.toContain('25.5');
    expect(h).toContain(LANG.TM_LANG.fi.vanhempi.tek_seuraava_askel);
  });
  it('taso jo saavutettu 25.0 s → ei huonompaa tavoitetta', () => { expect(aja(25.0)).not.toMatch(NYT_TAV); });
  it('tavallinen 27.5 s → "Nyt 27.5 … 25" (tavoite parempi)', () => {
    const h = aja(27.5);
    expect(h).toMatch(NYT_TAV); expect(h).toContain('27.5'); expect(h).toMatch(/\b25\b/);
  });
});

describe('Pelaaja_v7 · sama jaettu tavoite (ei kopiota)', () => {
  const P7 = lue('TalentMaster_Pelaaja_v7.html');
  it('_tekKorttiData: 12.4 → ei tavoitetta (nyt+tavoite null → rivi piiloon); 27.5 → 25', () => {
    const ctx = vm.createContext({ window: { TM_TESTIT: T }, Math, Number, String, Date });
    vm.runInContext([pura(P7, 'function _minaTekLajiNimi('), pura(P7, 'function _minaValitavoite('), pura(P7, 'function _tekKorttiData(')].join('\n')
      + '\nthis.f = _tekKorttiData;', ctx);
    const p = (s) => ({ syntymaVuosi: VUOSI - 13, sukupuoli: 'M', tki_kehityskohde: 'pujottelu', tk_lajit_viimeisin: { pujottelu_s: s } });
    expect(ctx.f(p(12.4)).kehitys).toMatchObject({ nyt: null, tavoite: null });
    expect(ctx.f(p(27.5)).kehitys).toMatchObject({ nyt: 27.5, tavoite: 25 });
  });
  it('kumpikaan sovellus ei enää laske tavoitetta itse (laskenta vain testit_indeksit.js:ssä); ?v nostettu', () => {
    for (const [f, fn] of [['TalentMaster_Pelaaja_v7.html', 'function _minaValitavoite('], ['TalentMaster_Vanhempi_v2.html', 'function _vanhValitavoite(']]) {
      const s = lue(f), runko = pura(s, fn);
      expect(runko, f).toContain('T.tkValitavoite(arvo, viite, kaant)');
      expect(runko, f).not.toMatch(/gap <= 3|Math\.round\(t \* 2\)/);
      expect(s, f).toContain('docs/testit_indeksit.js?v=11"');
    }
  });
});
