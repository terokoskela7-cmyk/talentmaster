// Vaihe 4d — teemakattavuus PURE-ydin (lib/tm_treeniteema.js).
// Vertaa jaksofokukset (4c) vs suunnitellut treeniteema-harjoitukset (4d) jaksolla.
import { describe, it, expect } from 'vitest';
const TT = require('../lib/tm_treeniteema.js');

const fokus = (avain, nimi) => ({ jaksofokus: { konsepti_avain: avain, konsepti_nimi: nimi } });
const harj = (avain, nimi, pvm) => ({ treeniteema: { avain, nimi }, pvm });

describe('tmTtKate', () => {
  it('laskee fokus_n ja harjoitus_n per teema', () => {
    const pel = [fokus('y_h0', 'Kuljetus'), fokus('y_h0', 'Kuljetus'), fokus('y_h1', 'Syöttö')];
    const tap = [harj('y_h0', 'Kuljetus', '2026-07-08'), harj('y_h1', 'Syöttö', '2026-07-09')];
    const r = TT.tmTtKate(pel, tap, '2026-07-01', '2026-07-31');
    expect(r.find(x => x.avain === 'y_h0')).toMatchObject({ fokus_n: 2, harjoitus_n: 1, kate: true, gap: false });
    expect(r.find(x => x.avain === 'y_h1')).toMatchObject({ fokus_n: 1, harjoitus_n: 1, kate: true });
  });

  it('gap = ≥3 fokus + 0 harjoitusta jaksolla', () => {
    const pel = [fokus('y_h0', 'Kuljetus'), fokus('y_h0', 'Kuljetus'), fokus('y_h0', 'Kuljetus')];
    const r = TT.tmTtKate(pel, [], '2026-07-01', '2026-07-31');
    expect(r[0]).toMatchObject({ fokus_n: 3, harjoitus_n: 0, kate: false, gap: true });
  });

  it('2 fokus + 0 harjoitusta ≠ gap (alle kynnyksen), mutta kate false', () => {
    const pel = [fokus('y_h0', 'K'), fokus('y_h0', 'K')];
    const r = TT.tmTtKate(pel, [], null, null);
    expect(r[0]).toMatchObject({ fokus_n: 2, harjoitus_n: 0, kate: false, gap: false });
  });

  it('harjoitus jakson ULKOPUOLELLA ei lasketa katteeksi', () => {
    const pel = [fokus('y_h0', 'K'), fokus('y_h0', 'K'), fokus('y_h0', 'K')];
    const tap = [harj('y_h0', 'K', '2026-06-30')];   // ennen jaksoa
    const r = TT.tmTtKate(pel, tap, '2026-07-01', '2026-07-31');
    expect(r[0]).toMatchObject({ harjoitus_n: 0, gap: true });
  });

  it('harjoitus teemalle jolla ei fokusta → ei riviä (vain fokusteemoja seurataan)', () => {
    const pel = [fokus('y_h0', 'K')];
    const tap = [harj('y_h9', 'Muu', '2026-07-08')];
    const r = TT.tmTtKate(pel, tap, null, null);
    expect(r.map(x => x.avain)).toEqual(['y_h0']);
    expect(r[0].harjoitus_n).toBe(0);
  });

  it('järjestys laskeva fokus_n', () => {
    const pel = [fokus('y_h0', 'A'), fokus('y_h1', 'B'), fokus('y_h1', 'B'), fokus('y_h2', 'C'), fokus('y_h2', 'C'), fokus('y_h2', 'C')];
    const r = TT.tmTtKate(pel, [], null, null);
    expect(r.map(x => x.avain)).toEqual(['y_h2', 'y_h1', 'y_h0']);
  });

  it('tyhjät → tyhjä', () => {
    expect(TT.tmTtKate([], [], null, null)).toEqual([]);
    expect(TT.tmTtKate(null, null)).toEqual([]);
  });

  it('rajaton (null jaksorajat) laskee kaikki harjoitukset', () => {
    const pel = [fokus('y_h0', 'K'), fokus('y_h0', 'K'), fokus('y_h0', 'K')];
    const tap = [harj('y_h0', 'K', '2020-01-01'), harj('y_h0', 'K', '2030-12-31')];
    expect(TT.tmTtKate(pel, tap, null, null)[0]).toMatchObject({ harjoitus_n: 2, gap: false });
  });
});
