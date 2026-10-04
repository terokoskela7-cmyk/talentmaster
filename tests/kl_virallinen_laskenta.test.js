/**
 * Kuljetus-laukaus — VIRALLINEN laskutapa (Tekniikkakilpailu U8–U13 säännöt), kaikki kirjauspolut.
 *  · 2 suoritusta, kussakin aika + 4 palloa (vähennys/pallo 0·1·2·3·5); NETTO = aika + 10·ennenaikaiset − Σvähennykset
 *  · TULOS = pienempi NETTO (min vasta nettojen jälkeen) · Math.max(0, …) suojana · raakadata talteen (§14)
 *  Esimerkit: tuloskortti S1 28.5−(0+2+2+0)=24.5 · S2 30.7−(5+5+2+2)=16.7 → 16.7 · säännöt 34.2−5−5−1=23.2 · ennenaikainen +10.
 * Polut: lib (kanoninen) · Testaus_v9 (vm, oikeat handlerit) · Excel_Tuonti (vm, _laskeTestiRyhma) · Pikakirjaus (lib) · tmLaskePikakentat.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(juuri, f), 'utf8');
const T = require('../lib/tm_pikakentat.js');
const KAT = require('../lib/tm_testikatalogi.js');
function pura(lahde, tunniste) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const KORTTI = { y1: { raaka: 28.5, osumat: [0, 2, 2, 0] }, y2: { raaka: 30.7, osumat: [5, 5, 2, 2] } };

describe('lib — tmKlSuorituksenNetto / tmKlTulos', () => {
  it('tuloskortin esimerkki: 24.5 ja 16.7 → TULOS 16.7', () => {
    expect(T.tmKlSuorituksenNetto(KORTTI.y1)).toBe(24.5);
    expect(T.tmKlSuorituksenNetto(KORTTI.y2)).toBe(16.7);
    expect(T.tmKlTulos(KORTTI)).toBe(16.7);
  });
  it('sääntöjen esimerkki 34.2 −5 −5 −1 = 23.2', () => { expect(T.tmKlSuorituksenNetto({ raaka: 34.2, osumat: [5, 5, 1, 0] })).toBe(23.2); });
  it('ennenaikainen +10 s/kpl (näille ei tarkkuusvähennystä = 0 syötetty)', () => {
    expect(T.tmKlSuorituksenNetto({ raaka: 20, ennenaikaiset: 1, osumat: [0, 0, 2, 2] })).toBe(26);
    expect(T.tmKlSuorituksenNetto({ raaka: 20, ennenaikaiset: 2, osumat: [5, 0, 0, 0] })).toBe(35);
    expect(T.tmKlTulos({ y1: { raaka: 20, ennenaikaiset: 1, osumat: [0, 0, 0, 0] }, y2: { raaka: 31, osumat: [0, 0, 0, 0] } })).toBe(30);
  });
  it('min vasta NETTOjen jälkeen: pienempi raaka-aika ei voita, jos netto on suurempi', () => {
    const d = { y1: { raaka: 25, osumat: [0, 0, 0, 0] }, y2: { raaka: 30, osumat: [5, 5, 2, 2] } };   // netot 25 vs 16
    expect(T.tmKlTulos(d)).toBe(16);
  });
  it('Math.max(0, …) suojana', () => { expect(T.tmKlSuorituksenNetto({ raaka: 3, osumat: [5, 5, 5, 5] })).toBe(0); });
  it('yksi suoritus riittää; tyhjä osumakenttä ("") = 0; vain-netto-suoritus (ei raakaa) huomioidaan; ei dataa → null', () => {
    expect(T.tmKlTulos({ y1: { raaka: 28.5, osumat: [0, 2, '', ''] } })).toBe(26.5);
    expect(T.tmKlTulos({ y1: { netto: 22.2 }, y2: { raaka: 30, osumat: [0, 0, 0, 0] } })).toBe(22.2);
    expect(T.tmKlTulos({ y1: { raaka: null, osumat: ['', '', '', ''] } })).toBeNull();
    expect(T.tmKlTulos(null)).toBeNull();
  });
  it('vanha yhden suorituksen tallenne (raaka + rangaistukset[] suora summa + ennenaikaiset) ennallaan', () => {
    expect(T.tmKlTulos({ raaka: 20, rangaistukset: [5, 1], ennenaikaiset: 0 })).toBe(14);
    expect(T.tmKlTulos({ raaka: 20, rangaistukset: [5, 1], ennenaikaiset: 1, tulos: 999 })).toBe(24);
    expect(T.tmKlTulos({ raaka: null, rangaistukset: [0, 0, 0, 0], tulos: null })).toBeNull();
  });
  it('Pikakirjaus/Excel-muoto { raaka, vahennys }', () => { expect(T.tmKlTulos({ raaka: 30.7, vahennys: 14 })).toBe(16.7); });
});

describe('tmLaskePikakentat — TK-pikakentät käyttävät virallista tulosta (2 suoritusta, vanha tallenne, ennenaikainen)', () => {
  const doc = { syntymaVuosi: 2014, sukupuoli: 'P' };
  it('{y1,y2} → kuljetus_laukaus_s = 16.7', () => {
    const upd = T.tmLaskePikakentat(doc, { ponnauttelu: { paras: 10 }, kuljetus_laukaus: KORTTI }, '2026-05-02');
    expect(upd.tk_lajit_viimeisin.kuljetus_laukaus_s).toBe(16.7);
  });
  it('ennenaikainen +10 kulkee läpi; vanha tallenne ennallaan', () => {
    const e = T.tmLaskePikakentat(doc, { ponnauttelu: { paras: 10 }, kuljetus_laukaus: { y1: { raaka: 20, ennenaikaiset: 1, osumat: [0, 0, 2, 2] } } }, '2026-05-02');
    expect(e.tk_lajit_viimeisin.kuljetus_laukaus_s).toBe(26);
    const v = T.tmLaskePikakentat(doc, { ponnauttelu: { paras: 10 }, kuljetus_laukaus: { raaka: 20, rangaistukset: [5, 1] } }, '2026-05-02');
    expect(v.tk_lajit_viimeisin.kuljetus_laukaus_s).toBe(14);
  });
});

describe('Testaus_v9 — oikeat handlerit (vm)', () => {
  const HTML = lue('TalentMaster_Testaus_v9.html');
  function ymp() {
    const lokit = { tallennettu: [], renderoitu: 0 };
    const sb = {
      Math, parseInt, parseFloat, Array, Object, String, isNaN, JSON,
      window: { TM_PIKAKENTAT: T }, _tulokset: {},
      _escapeHtml: (x) => String(x),
      _tallennaTulosKentta(pid, id, obj) { lokit.tallennettu.push([pid, id, JSON.parse(JSON.stringify(obj))]); },
      _v5Valahda() {}, _v5Rendero() { lokit.renderoitu++; },
    };
    vm.createContext(sb);
    const koodi = [pura(HTML, 'function _kuljetusLaukausTulos(d)'), pura(HTML, 'function _v5KlPaivita('),
      pura(HTML, 'function _v5KlRenderKaksi('), 'const _V5_KL_OSUMA_VALINNAT = [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [5, "5"]];']
      .concat(['_v5KlSyotaRaaka', '_v5KlSyotaOsuma', '_v5KlSyotaEnnen'].map((n) => 'window.' + n + ' = ' + pura(HTML, 'window.' + n + ' = function').replace(/^window\.[A-Za-z0-9_]+ = /, ''))).join(';\n');
    vm.runInContext(koodi + '\nthis.W = window; this.R = _v5KlRenderKaksi; this.TULOS = _kuljetusLaukausTulos;', sb);
    return { sb, lokit };
  }
  const raaka = (v) => ({ value: String(v), trim() { return String(v); } });
  it('syöttö: tuloskortin esimerkki → y1/y2 = {raaka, osumat[4], ennenaikaiset, netto}, tulos 16.7', () => {
    const { sb, lokit } = ymp(); const W = sb.W;
    W._v5KlSyotaRaaka('P', 1, raaka(28.5)); [0, 2, 2, 0].forEach((v, i) => W._v5KlSyotaOsuma('P', 1, i, { value: String(v) }));
    W._v5KlSyotaRaaka('P', 2, raaka('30,7')); [5, 5, 2, 2].forEach((v, i) => W._v5KlSyotaOsuma('P', 2, i, { value: String(v) }));
    const kl = sb._tulokset.P.kuljetus_laukaus;
    expect(kl.y1).toEqual({ raaka: 28.5, osumat: [0, 2, 2, 0], ennenaikaiset: 0, netto: 24.5 });
    expect(kl.y2).toEqual({ raaka: 30.7, osumat: [5, 5, 2, 2], ennenaikaiset: 0, netto: 16.7 });
    expect(kl.tulos).toBe(16.7); expect(kl.paras).toBe(16.7);
    expect(lokit.tallennettu.at(-1)[2].tulos).toBe(16.7);   // tallennettu
  });
  it('ennenaikaiset-stepper +10 s/kpl, rajat 0–4; tyhjä osuma-valinta = ""', () => {
    const { sb } = ymp(); const W = sb.W;
    W._v5KlSyotaRaaka('P', 1, raaka(20)); W._v5KlSyotaOsuma('P', 1, 2, { value: '2' }); W._v5KlSyotaOsuma('P', 1, 3, { value: '2' });
    W._v5KlSyotaEnnen('P', 1, 1);
    expect(sb._tulokset.P.kuljetus_laukaus.y1.netto).toBe(26);
    for (let i = 0; i < 6; i++) W._v5KlSyotaEnnen('P', 1, 1);
    expect(sb._tulokset.P.kuljetus_laukaus.y1.ennenaikaiset).toBe(4);
    for (let i = 0; i < 6; i++) W._v5KlSyotaEnnen('P', 1, -1);
    expect(sb._tulokset.P.kuljetus_laukaus.y1.ennenaikaiset).toBe(0);
    W._v5KlSyotaOsuma('P', 1, 2, { value: '' });
    expect(sb._tulokset.P.kuljetus_laukaus.y1.osumat[2]).toBe('');
  });
  it('aika tyhjennetty → netto/tulos null (ei vanhaa arvoa jäljelle)', () => {
    const { sb } = ymp(); const W = sb.W;
    W._v5KlSyotaRaaka('P', 1, raaka(20)); W._v5KlSyotaRaaka('P', 1, raaka(''));
    expect(sb._tulokset.P.kuljetus_laukaus.tulos).toBeNull();
  });
  it('maksimiaika 40 s → varoitus renderissä (>40), ei varoitusta ≤40', () => {
    const { sb } = ymp();
    const html = (a) => sb.R({ nimi: 'KL' }, 'P', { y1: { raaka: a, osumat: [0, 0, 0, 0], ennenaikaiset: 0 } }, '');
    expect(html(41)).toContain('Yli maksimiajan 40 s'); expect(html(40)).not.toContain('Yli maksimiajan');
  });
  it('render: valinnat 0/1/2/3/5 + valittu arvo + Netto + Tulos (pienempi netto)', () => {
    const { sb } = ymp();
    const h = sb.R({ nimi: 'KL' }, 'P', KORTTI, '');
    expect(h).toContain('Netto 1'); expect(h).toContain('24.50 s'); expect(h).toContain('16.70 s'); expect(h).toContain('Tulos (pienempi netto)');
    expect(h).toMatch(/<option value="5" selected>/);
  });
  it('vanha yhden suorituksen tallenne: luetaan ennallaan + vanha UI-haara säilyy; valmis-tarkistus tunnistaa uuden muodon', () => {
    const { sb } = ymp();
    expect(sb.TULOS({ raaka: 20, rangaistukset: [5, 1], ennenaikaiset: 0, tulos: 14 })).toBe(14);
    expect(HTML).toContain("if (!(d.raaka != null && !d.y1 && !d.y2)) return _v5KlRenderKaksi(");
    expect(HTML).toMatch(/v\.raaka != null \|\| \(v\.y1 && v\.y1\.raaka != null\) \|\| \(v\.y2 && v\.y2\.raaka != null\)/);
  });
});

describe('Excel_Tuonti — _laskeTestiRyhma (vm)', () => {
  const HTML = lue('TalentMaster_Excel_Tuonti.html');
  const laske = (() => { const sb = {}; vm.createContext(sb); vm.runInContext(pura(HTML, 'function _laskeTestiRyhma(') + '\nthis.f = _laskeTestiRyhma;', sb); return sb.f; })();
  const cols = (...k) => ({ columns: k.map(([kind, yritys, index]) => ({ kind, yritys, index })) });
  it('tuloskortti: raaka − vähennys yhteensä per yritys → TULOS 16.7, y1/y2 = {raaka, vahennys, netto}', () => {
    const r = laske('kuljetus_laukaus', cols(['kl_raaka', 1, 0], ['kl_vahennys', 1, 1], ['kl_raaka', 2, 2], ['kl_vahennys', 2, 3]), [28.5, 4, 30.7, 14]);
    expect(r.skalaari).toBe(16.7); expect(r.rakenne.y1).toEqual({ raaka: 28.5, vahennys: 4, netto: 24.5 });
    expect(r.rakenne.y2).toEqual({ raaka: 30.7, vahennys: 14, netto: 16.7 }); expect(r.rakenne.tulos).toBe(16.7); expect(r.varoitus).toBeNull();
  });
  it('sääntöjen esimerkki 34.2 − 11 = 23.2; min vasta nettojen jälkeen', () => {
    expect(laske('kuljetus_laukaus', cols(['kl_raaka', 1, 0], ['kl_vahennys', 1, 1]), [34.2, 11]).skalaari).toBe(23.2);
    expect(laske('kuljetus_laukaus', cols(['kl_raaka', 1, 0], ['kl_vahennys', 1, 1], ['kl_raaka', 2, 2], ['kl_vahennys', 2, 3]), [25, 0, 30, 14]).skalaari).toBe(16);
  });
  it('vähennys-sarake PUUTTUU → ei hiljaista nollaa: raaka ei ole netto, varoitus', () => {
    const r = laske('kuljetus_laukaus', cols(['kl_raaka', 1, 0], ['kl_raaka', 2, 1]), [28.5, 30.7]);
    expect(r.skalaari).toBeNull(); expect(r.varoitus).toMatch(/vähennys-sarake puuttuu/);
    expect(r.rakenne.y1.netto).toBeNull();
  });
  it('osittain: yhdeltä yritykseltä puuttuu sarake → vain toinen lasketaan + varoitus; tyhjä solu sarakkeen ollessa = 0', () => {
    const r = laske('kuljetus_laukaus', cols(['kl_raaka', 1, 0], ['kl_vahennys', 1, 1], ['kl_raaka', 2, 2]), [28.5, 4, 20]);
    expect(r.skalaari).toBe(24.5); expect(r.varoitus).toMatch(/suoritus 2/);
    const t = laske('kuljetus_laukaus', cols(['kl_raaka', 1, 0], ['kl_vahennys', 1, 1]), [28.5, '']);
    expect(t.skalaari).toBe(28.5); expect(t.varoitus).toBeNull();
  });
  it('varoitus pinnalle: validoinnissa 4c-rivi', () => { expect(HTML).toMatch(/_tkVaroitukset \|\| \[\]\)\.forEach\(m => varoitukset\.push/); });
});

describe('Pikakirjaus — aika + vähennykset yhteensä → netto koodissa, raakadata talteen', () => {
  let P;
  beforeAll(() => { globalThis.TM_PIKAKENTAT = T; globalThis.TM_TESTIKATALOGI = KAT; P = require('../lib/tm_pikakirjaus.js'); });
  it('tuloskortti S2: 30.7 − 14 → netto 16.7; sääntöjen 34.2 − 11 → 23.2', () => {
    expect(P._tuloksetRivista({ kuljetus_laukaus: { raaka: '30.7', vahennys: '14' } }, ['kuljetus_laukaus']).kuljetus_laukaus).toBe(16.7);
    expect(P._tuloksetRivista({ kuljetus_laukaus: { raaka: '34,2', vahennys: '11' } }, ['kuljetus_laukaus']).kuljetus_laukaus).toBe(23.2);
  });
  it('payload tallentaa raaka + vähennys + netto (tulos/paras = netto); muut testit ennallaan', () => {
    const rivi = { kuljetus_laukaus: { raaka: '30.7', vahennys: '14' }, lin30m: '5.1' };
    const tul = P._tuloksetRivista(rivi, ['kuljetus_laukaus', 'lin30m']);
    const p = P._testitulosPayload(tul, '2026-10-04', 'u', null, 'n', P._klRaakaRivista(rivi));
    expect(p.testit.kuljetus_laukaus).toEqual({ raaka: 30.7, vahennys: 14, netto: 16.7, tulos: 16.7, paras: 16.7 });
    expect(p.testit.lin_30m).toBe(5.1);
    expect(tul.kuljetus_laukaus).toBe(16.7);   // alavirran laskenta saa skalaarin
  });
  it('ei KL-syötettä → payload ennallaan (testit = tulokset)', () => {
    const tul = P._tuloksetRivista({ lin30m: '5.1' }, ['lin30m']);
    expect(P._testitulosPayload(tul, '2026-10-04', 'u', null, 'n', null).testit).toBe(tul);
  });
  it('vähennys puuttuu (ei hiljaista nollaa) / aika puuttuu → virhe, ei tulosta; vähennys 0 hyväksytään', () => {
    expect(P._klVirhe({ kuljetus_laukaus: { raaka: '30' } })).toMatch(/vähennykset yhteensä/);
    expect(P._klVirhe({ kuljetus_laukaus: { raaka: '', vahennys: '3' } })).toMatch(/syötä aika/);
    expect(P._klVirhe({ kuljetus_laukaus: { raaka: '30', vahennys: '0' } })).toBeNull();
    expect(P._klVirhe({})).toBeNull();
    expect(P._tuloksetRivista({ kuljetus_laukaus: { raaka: '30' } }, ['kuljetus_laukaus'])).toEqual({});
    expect(P._klSuoritus({ raaka: '30', vahennys: '-1' })).toBeNull();
  });
  it('tallennusketju: Pikakirjaus-skalaari → tmLaskePikakentat → kuljetus_laukaus_s = netto', () => {
    const tul = P._tuloksetRivista({ ponnauttelu: '10', kuljetus_laukaus: { raaka: '30.7', vahennys: '14' } }, ['ponnauttelu', 'kuljetus_laukaus']);
    expect(T.tmLaskePikakentat({ syntymaVuosi: 2014, sukupuoli: 'P' }, tul, '2026-05-02').tk_lajit_viimeisin.kuljetus_laukaus_s).toBe(16.7);
  });
});
