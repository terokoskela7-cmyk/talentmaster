/**
 * Pelaaja-app V2 · Vaihe 0 · P0.7: kokoelman murtoluku ("10 / 14") pois Rakentajilta (U13–15).
 * Muut ikävaiheet ennallaan (Leikkijä U8–12, Showcase U16+). Oikea _laskeStage + rMinaKokoelma ajetaan vm:ssä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const HTML = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
function pura(tunniste) {
  const i = HTML.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = HTML.indexOf('{', i); k < HTML.length; k++) { if (HTML[k] === '{') syv++; else if (HTML[k] === '}') { syv--; if (!syv) return HTML.slice(i, k + 1); } }
  throw new Error('sulkeet');
}
const VUOSI = new Date().getFullYear();
function kokoelma(ika, extra = {}) {
  const sb = Object.assign({
    ...PEL_APU, _pelaaja: { syntymaVuosi: VUOSI - ika },
    tmPhvTila: () => '', tmPhvIlmoitettuPH: () => false,
    KORTTI_KATALOGI: { legendat: [{ ansainta: () => true }], harvinaiset: [], saavutukset: [{ ansainta: () => true }, { ansainta: () => false }], merkit: [{ laji: 'pujottelu' }] },
    _kkLajiTulos: () => null,
    _kkStripKortit: () => ({ earned: [{ nimi: 'A' }], locked: [{ nimi: 'B' }] }),
    _kkStripKorttiHTML: (c) => '[' + c.nimi + ']', Date, Array, Object,
  }, extra);
  vm.createContext(sb);
  vm.runInContext(pura('function _laskeStage(') + '\n' + pura('function rMinaKokoelma(') + '\nthis.f = rMinaKokoelma; this.s = _laskeStage;', sb);
  return sb;
}
const murtoluku = /\d+ \/ \d+/;

describe('P0.7 kokoelman murtoluku', () => {
  it('Rakentaja (U13–15): ei murtolukua, kortit + otsikko säilyvät', () => {
    [13, 14, 15].forEach((ika) => {
      const sb = kokoelma(ika); expect(sb.s(VUOSI - ika, { syntymaVuosi: VUOSI - ika }), 'stage ' + ika).toBe('2_rakentaja');
      const h = sb.f();
      expect(h, 'U' + ika).not.toMatch(murtoluku);
      expect(h).toContain('Korttikokoelma'); expect(h).toContain('[A]'); expect(h).toContain('[B]');
    });
  });
  it('Leikkijä (≤12) ja Showcase (16+): murtoluku ennallaan (2 / 4: legenda + yksi saavutus ansaittu)', () => {
    [10, 12, 16, 18].forEach((ika) => { expect(kokoelma(ika).f(), 'U' + ika).toMatch(/>2 \/ 4</); });
  });
  it('PH-pelaaja (kasvupyrähdys) → leikkijä-vaihe → murtoluku näkyy (stage-funktio ratkaisee, ei ikä)', () => {
    const sb = kokoelma(14, { tmPhvTila: () => 'PH' });
    expect(sb.f()).toMatch(murtoluku);
  });
  it('stage-funktio puuttuu → oletus Rakentaja (turvallisin: ei murtolukua)', () => {
    const sb = { ...PEL_APU, _pelaaja: { syntymaVuosi: VUOSI - 10 }, KORTTI_KATALOGI: { legendat: [{ ansainta: () => true }], harvinaiset: [], saavutukset: [], merkit: [] },
      _kkLajiTulos: () => null, _kkStripKortit: () => ({ earned: [{ nimi: 'A' }], locked: [] }), _kkStripKorttiHTML: () => '[A]', Array, Object };
    vm.createContext(sb); vm.runInContext(pura('function rMinaKokoelma(') + '\nthis.f = rMinaKokoelma;', sb);
    expect(sb.f()).not.toMatch(murtoluku);
  });
  it('tyhjä kokoelma → ei mitään (ennallaan)', () => {
    expect(kokoelma(14, { _kkStripKortit: () => ({ earned: [], locked: [] }) }).f()).toBe('');
  });
});
