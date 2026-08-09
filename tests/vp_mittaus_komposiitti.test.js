/**
 * TalentMaster™ — E2.3.1: kuljetus_laukaus-komposiitin korjaus (TalentMaster_VP_v25.html)
 * Puhtaat funktiot: _vpKuljetusNetto (netto-kaava, REPLIKA primitiivin _kuljetusLaukausTulos) +
 * _vpKomposiittiSyotteesta (dialogin syöte → komposiittiobjekti). Poimitaan lähteestä + verrataan primitiiviin.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dir = dirname(fileURLToPath(import.meta.url));

let _vpKuljetusNetto, _vpKomposiittiSyotteesta, _vpKuljetusRangaistukset;
// primitiivin kanoninen netto (tm_pikakentat käyttää samaa _kuljetusLaukausTulosia laskeKokonaistuloksessa) —
// poimitaan _kuljetusLaukausTulos-lähdefunktio libistä vertailukohteeksi.
let _kuljetusLaukausTulosCanon;
beforeAll(() => {
  const html = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = html.findIndex(l => l.includes('function _vpKuljetusRangaistukset'));
  const e = html.findIndex(l => l.includes('window._vpKomposiittiSyotteesta = _vpKomposiittiSyotteesta;'));
  if (s < 0 || e < 0) throw new Error('lohkoa ei löytynyt');
  const api = new Function('var window = {};\n' + html.slice(s, e + 1).join('\n') + '\n return { _vpKuljetusNetto, _vpKomposiittiSyotteesta, _vpKuljetusRangaistukset };')();
  _vpKuljetusNetto = api._vpKuljetusNetto;
  _vpKomposiittiSyotteesta = api._vpKomposiittiSyotteesta;
  _vpKuljetusRangaistukset = api._vpKuljetusRangaistukset;

  // Poimi primitiivin _kuljetusLaukausTulos (IIFE-sisäinen) lähteestä vertailua varten.
  const lib = readFileSync(join(__dir, '..', 'lib', 'tm_pikakentat.js'), 'utf8').split('\n');
  const ls = lib.findIndex(l => l.includes('function _kuljetusLaukausTulos'));
  let le = ls + 1; while (le < lib.length && !/^\s{2}}/.test(lib[le])) le++;
  _kuljetusLaukausTulosCanon = new Function(lib.slice(ls, le + 1).join('\n') + '\n return _kuljetusLaukausTulos;')();
});

describe('_vpKuljetusNetto — REPLIKA primitiivin _kuljetusLaukausTulos', () => {
  const cases = [
    { raaka: 20, ennen: 0, rang: [5, 1] },      // 20 − 6 = 14
    { raaka: 22.5, ennen: 0, rang: [] },        // 22.5
    { raaka: 18, ennen: 2, rang: [3] },         // 18 + 20 − 3 = 35
    { raaka: 10, ennen: 0, rang: [5, 5, 5] },   // 10 − 15 = −5 → max 0
    { raaka: 25, ennen: 1, rang: [-2] },        // 25 + 10 + 2 = 37 (negatiivinen rangaistus)
    { raaka: 12.345, ennen: 0, rang: [1.11] }   // 11.235 → 2 des
  ];
  it('vastaa kanonista netto-kaavaa kaikilla tapauksilla', () => {
    cases.forEach(c => {
      const oma = _vpKuljetusNetto(c.raaka, c.ennen, c.rang);
      const canon = _kuljetusLaukausTulosCanon({ raaka: c.raaka, ennenaikaiset: c.ennen, rangaistukset: c.rang });
      expect(oma).toBe(canon);
    });
  });
  it('NaN raaka → null (kuten primitiivi)', () => {
    expect(_vpKuljetusNetto('', 0, [])).toBeNull();
    expect(_vpKuljetusNetto(NaN, 0, [])).toBeNull();
  });
  it('max-suoja: netto ei mene alle 0', () => {
    expect(_vpKuljetusNetto(5, 0, [10])).toBe(0);
  });
});

describe('_vpKuljetusRangaistukset — parsinta', () => {
  it('"5, 10, -2" → [5,10,-2]; tyhjät/NaN pois', () => {
    expect(_vpKuljetusRangaistukset('5, 10, -2')).toEqual([5, 10, -2]);
    expect(_vpKuljetusRangaistukset('5, , x, 3')).toEqual([5, 3]);
    expect(_vpKuljetusRangaistukset('')).toEqual([]);
    expect(_vpKuljetusRangaistukset(null)).toEqual([]);
  });
});

describe('_vpKomposiittiSyotteesta — dialogin syöte → komposiittiobjekti', () => {
  it('rakentaa komposiitin; raaka pakollinen', () => {
    expect(_vpKomposiittiSyotteesta('20', '0', '5, 1')).toEqual({ raaka: 20, rangaistukset: [5, 1], ennenaikaiset: 0 });
    expect(_vpKomposiittiSyotteesta('18', '2', '3')).toEqual({ raaka: 18, rangaistukset: [3], ennenaikaiset: 2 });
  });
  it('raaka NaN/tyhjä → null (ei tallennusta)', () => {
    expect(_vpKomposiittiSyotteesta('', '0', '')).toBeNull();
    expect(_vpKomposiittiSyotteesta('abc', '0', '')).toBeNull();
  });
  it('ennenaikaiset/rangaistukset oletus 0/[]; negatiivinen ennen → 0', () => {
    expect(_vpKomposiittiSyotteesta('15', '', '')).toEqual({ raaka: 15, rangaistukset: [], ennenaikaiset: 0 });
    expect(_vpKomposiittiSyotteesta('15', '-3', '')).toEqual({ raaka: 15, rangaistukset: [], ennenaikaiset: 0 });
  });
  it('rakennettu komposiitti → netto vastaa kanonista', () => {
    const k = _vpKomposiittiSyotteesta('20', '2', '5, 1');
    expect(_vpKuljetusNetto(k.raaka, k.ennenaikaiset, k.rangaistukset))
      .toBe(_kuljetusLaukausTulosCanon(k));
  });
});
