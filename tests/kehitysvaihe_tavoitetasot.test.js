// Bio-banding dual-taso -lib (docs/kehitysvaihe_tavoitetasot.js) — parsii + pariteettiankkurit + graceful.
// Regressio: lib sisälsi tuplasulku-syntaksivirheen (]}} → depth −12) joka teki TM_KEHITYSVAIHE:sta undefined
// → kehitysvaihe-sarake olisi aina "—". Tämä lukitsee rakenteen ehjäksi. §28/§30, CLAUDE.md §25.
import { describe, it, expect } from 'vitest';
const KV = require('../docs/kehitysvaihe_tavoitetasot.js');

describe('kehitysvaihe_tavoitetasot — lib parsii + pariteettiankkurit', () => {
  it('kehitysvaiheTaso on funktio (lib parsii, TM_KEHITYSVAIHE ehjä)', () => {
    expect(typeof KV.kehitysvaiheTaso).toBe('function');
  });

  it('rakenne ehjä: kaikki 6 fyysistä testiä P + T (tuplasulku-regressio)', () => {
    ['lin5m', 'lin10m', 'lin20m', 'lin30m', 'cmj', 'mas'].forEach(function(t){
      expect(KV.TAULUKOT.P[t]).toBeTruthy();
      expect(KV.TAULUKOT.T[t]).toBeTruthy();
      expect(Array.isArray(KV.TAULUKOT.P[t].kaistat)).toBe(true);
      expect(KV.TAULUKOT.P[t].kaistat.length).toBe(5);   // 5 PHV-kaistaa
    });
  });

  it('pariteettiankkurit (lib s.18): P 10m 1.81 off −0.5 → 4; 1.78 off +1.7 → 2', () => {
    expect(KV.kehitysvaiheTaso(1.81, 'lin10m', -0.5, 'P')).toBe(4);
    expect(KV.kehitysvaiheTaso(1.78, 'lin10m', 1.7, 'P')).toBe(2);
  });

  it('sukupuoli-normalisointi M→P, N→T', () => {
    expect(KV.kehitysvaiheTaso(4.85, 'lin30m', -1.6, 'M')).toBe(KV.kehitysvaiheTaso(4.85, 'lin30m', -1.6, 'P'));
    expect(KV.kehitysvaiheTaso(5.0, 'lin30m', 0.2, 'N')).toBe(KV.kehitysvaiheTaso(5.0, 'lin30m', 0.2, 'T'));
  });

  it('MAS (suurempi=parempi) ja nopeus (pienempi=parempi) tuottavat validin 1–5 tason', () => {
    const mas = KV.kehitysvaiheTaso(4.0, 'mas', -1.6, 'P');
    expect(mas).toBeGreaterThanOrEqual(1); expect(mas).toBeLessThanOrEqual(5);
    const lin = KV.kehitysvaiheTaso(4.85, 'lin30m', -1.6, 'P');
    expect(lin).toBeGreaterThanOrEqual(1); expect(lin).toBeLessThanOrEqual(5);
  });

  it('graceful null: offset puuttuu / tuntematon testi / arvo puuttuu / tuntematon sp → null', () => {
    expect(KV.kehitysvaiheTaso(4.85, 'lin30m', null, 'P')).toBe(null);
    expect(KV.kehitysvaiheTaso(4.85, 'lin40m', -1.6, 'P')).toBe(null);
    expect(KV.kehitysvaiheTaso(null, 'lin30m', -1.6, 'P')).toBe(null);
    expect(KV.kehitysvaiheTaso(4.85, 'lin30m', -1.6, 'X')).toBe(null);
  });
});
