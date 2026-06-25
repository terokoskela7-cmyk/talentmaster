import { describe, it, expect } from 'vitest';
import S from '../lib/tm_solo_data.js';

describe('tm_solo_data — PlayerCode (SOLO_P0_SPEC §8)', () => {
  it('muoto TMP- + 6 merkkiä turva-aakkostosta', () => {
    for (let i = 0; i < 200; i++) {
      const c = S.tmGeneroiPlayerCode();
      expect(c).toMatch(/^TMP-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      expect(S.tmPlayerCodeKelpaa(c)).toBe(true);
    }
  });

  it('aakkosto EI sisällä sekoittuvia merkkejä 0/O/1/I/L', () => {
    expect(S.ALPHABET).not.toMatch(/[01OIL]/);
    expect(S.ALPHABET.length).toBe(31);
  });

  it('rnd injektoitavissa → deterministinen', () => {
    const rnd = () => 0;            // aina ensimmäinen merkki
    expect(S.tmGeneroiPlayerCode(rnd)).toBe('TMP-AAAAAA');
    const rnd2 = () => 0.999999;    // aina viimeinen merkki (9)
    expect(S.tmGeneroiPlayerCode(rnd2)).toBe('TMP-999999');
  });

  it('tmPlayerCodeKelpaa hylkää virheelliset', () => {
    expect(S.tmPlayerCodeKelpaa('TMP-1234')).toBe(false);       // vanha 4-num muoto
    expect(S.tmPlayerCodeKelpaa('TMP-ABCDE0')).toBe(false);     // sisältää 0
    expect(S.tmPlayerCodeKelpaa('TMP-ABCDEI')).toBe(false);     // sisältää I
    expect(S.tmPlayerCodeKelpaa('XMP-ABCDEF')).toBe(false);     // väärä prefiksi
    expect(S.tmPlayerCodeKelpaa('TMP-ABCDEFG')).toBe(false);    // 7 merkkiä
    expect(S.tmPlayerCodeKelpaa(null)).toBe(false);
  });

  it('tmLuoSoloProfiili torjuu tallennuksen ilman ehtojen hyväksyntää (§7 invariantti)', async () => {
    await expect(
      S.tmLuoSoloProfiili({}, {}, { uid: 'u1', email: 'a@b.fi', ehdot: { tos: true, privacy: false }, profiili: {} })
    ).rejects.toThrow(/hyväksy/i);
  });

  it('jakauma kattaa koko aakkoston (ei vinoumaa)', () => {
    const nähty = new Set();
    for (let i = 0; i < 4000; i++) for (const ch of S.tmGeneroiPlayerCode().slice(4)) nähty.add(ch);
    expect(nähty.size).toBe(31);
  });
});
