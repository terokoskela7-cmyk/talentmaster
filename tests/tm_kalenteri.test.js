import { describe, it, expect } from 'vitest';
import K from '../lib/tm_kalenteri.js';

describe('tm_kalenteri — occurrence-generointi (K3 §13)', () => {
  it('kerran → vain alkupvm', () => {
    expect(K.tmKalenteriOccurrences('2026-09-01', 'kerran', null).pvmt).toEqual(['2026-09-01']);
    expect(K.tmKalenteriOccurrences('2026-09-01', null, null).pvmt).toEqual(['2026-09-01']);
  });

  it('viikoittain +7pv ≤ paattyy', () => {
    const r = K.tmKalenteriOccurrences('2026-09-01', 'viikoittain', '2026-09-29');
    expect(r.pvmt).toEqual(['2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-09-29']);
    expect(r.katkaistu).toBe(false);
  });

  it('2_viikottain +14pv', () => {
    const r = K.tmKalenteriOccurrences('2026-09-01', '2_viikottain', '2026-10-15');
    expect(r.pvmt).toEqual(['2026-09-01', '2026-09-15', '2026-09-29', '2026-10-13']);
  });

  it('kuukausittain +1kk', () => {
    const r = K.tmKalenteriOccurrences('2026-01-15', 'kuukausittain', '2026-04-15');
    expect(r.pvmt).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });

  it('paattyy juuri ennen seuraavaa → ei ylimääräistä', () => {
    const r = K.tmKalenteriOccurrences('2026-09-01', 'viikoittain', '2026-09-10');
    expect(r.pvmt).toEqual(['2026-09-01', '2026-09-08']);
  });

  it('cap 60 katkaisee + lippu', () => {
    const r = K.tmKalenteriOccurrences('2026-01-01', 'viikoittain', '2030-01-01', 60);
    expect(r.pvmt.length).toBe(60);
    expect(r.katkaistu).toBe(true);
  });

  it('cap tasan → ei katkaistu jos paattyy osuu', () => {
    const r = K.tmKalenteriOccurrences('2026-09-01', 'viikoittain', '2026-09-22', 4);
    expect(r.pvmt.length).toBe(4);
    expect(r.katkaistu).toBe(false);
  });

  it('ilman paattyy → cap-rajoitettu', () => {
    const r = K.tmKalenteriOccurrences('2026-09-01', 'viikoittain', null, 10);
    expect(r.pvmt.length).toBe(10);
    expect(r.katkaistu).toBe(true);
  });

  it('viikonpäivä 0=su..6=la', () => {
    expect(K.tmToistuvuusPaiva('2026-09-01')).toBe(2); // tiistai
    expect(K.tmToistuvuusPaiva('2026-09-06')).toBe(0); // sunnuntai
  });

  it('sarja-id + cadence-nimi', () => {
    expect(K.tmSarjaId(123, 'abc')).toBe('srj_123_abc');
    expect(K.tmCadenceNimi('viikoittain')).toBe('viikoittain');
    expect(K.tmCadenceNimi('2_viikottain')).toBe('joka toinen viikko');
    expect(K.tmCadenceNimi('kerran')).toBe('');
  });
});
