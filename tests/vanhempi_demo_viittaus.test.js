/* Regressio: Vanhempi_v2 `_vanhTapahtumatHTML` viittasi paikalliseen `_demo`-muuttujaan jota ei ollut → ReferenceError huoltajan etusivulla (tuli #1023:ssa 12.10.). Löytyi Sibbo sv -kuvia otettaessa.
 * Sääntö: jokainen funktio joka käyttää `_demo`-tunnistetta julistaa sen itse (muuttuja ei ole globaali). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
const src = readFileSync(new URL('../TalentMaster_Vanhempi_v2.html', import.meta.url), 'utf8');
describe('Vanhempi_v2: _demo julistettu jokaisessa käyttäjäfunktiossa', () => {
  const lohkot = src.split(/\n(?=(?:async )?function [A-Za-z_$][\w$]*\s*\()/);
  it('funktiolohkoissa joissa _demo esiintyy on myös "var _demo"', () => {
    const rikki = lohkot.filter((l) => /\b_demo\b/.test(l) && !/\bvar _demo\b/.test(l)).map((l) => l.slice(0, 60));
    expect(rikki).toEqual([]);
  });
  it('_vanhTapahtumatHTML julistaa _demo:n ennen käyttöä', () => {
    const l = lohkot.find((x) => x.startsWith('function _vanhTapahtumatHTML')); expect(l.indexOf('var _demo')).toBeGreaterThan(-1); expect(l.indexOf('var _demo')).toBeLessThan(l.indexOf('|| _demo ||'));
  });
});
