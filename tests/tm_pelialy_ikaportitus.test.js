import { describe, it, expect } from 'vitest';
import P from '../lib/tm_pelialy_yksilo.js';

describe('tm_pelialy — ADAR §4-ikäportitus (Malli A, PR #266)', () => {
  const topias = { a: 3, d: 2, ac: 3, r: 3 };   // U13-havainto, Reading kirjattu

  it('tmAdarBand: §4-ikävyöhykkeet', () => {
    expect(P.tmAdarBand(10)).toEqual(['a']);
    expect(P.tmAdarBand(12)).toEqual(['a']);
    expect(P.tmAdarBand(13)).toEqual(['a', 'd', 'ac']);
    expect(P.tmAdarBand(15)).toEqual(['a', 'd', 'ac']);
    expect(P.tmAdarBand(16)).toEqual(['a', 'd', 'ac', 'r']);
    expect(P.tmAdarBand(null)).toEqual(['a', 'd', 'ac', 'r']);   // tuntematon → turvaverkko
  });

  it('U13: yht = ka(a,d,ac), Reading EI mukana → 2.7 (ei 2.8)', () => {
    // (3+2+3)/3 = 2.666… → 2.7
    expect(P.tmAdarYht(topias, 13)).toBe(2.7);
    // ilman ikäportitusta (kaikki 4) olisi (3+2+3+3)/4 = 2.75 → 2.8
    expect(P.tmAdarYht(topias, null)).toBe(2.8);
  });

  it('U8–12: vain a', () => {
    expect(P.tmAdarYht(topias, 10)).toBe(3);          // ka([3]) = 3
    expect(P.tmAdarYht({ a: 2, d: 3, ac: 3, r: 3 }, 11)).toBe(2);
  });

  it('U16+: kaikki 4', () => {
    expect(P.tmAdarYht(topias, 16)).toBe(2.8);        // (3+2+3+3)/4 = 2.75 → 2.8
  });

  it('yht laskee vain kirjatuista band-osista (null-osat ohitetaan)', () => {
    expect(P.tmAdarYht({ a: 3, d: null, ac: 3 }, 13)).toBe(3);   // ka(3,3)
    expect(P.tmAdarYht({}, 13)).toBe(null);
    expect(P.tmAdarYht({ a: null }, 10)).toBe(null);
  });

  it('tmAdarBonusOsat: ikätason yli menevät kirjatut osat', () => {
    expect(P.tmAdarBonusOsat(topias, 13)).toEqual(['r']);        // U13 → Reading on bonus
    expect(P.tmAdarBonusOsat(topias, 16)).toEqual([]);           // U16 → r kuuluu bandiin
    expect(P.tmAdarBonusOsat({ a: 3, d: 2, ac: 3 }, 13)).toEqual([]);  // ei r → ei bonusta
    expect(P.tmAdarBonusOsat({ a: 2, d: 3, ac: 3, r: 2 }, 10)).toEqual(['d', 'ac', 'r']);  // U10 → vain a bandissa
  });
});
