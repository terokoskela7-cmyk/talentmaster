/**
 * TalentMaster™ — H-H/TSI-analyysimalli VAIHE 1 -yksikkötestit
 * Funktiot: hhSeuraavaTaso, hhVaadittuVuosivauhti, hhKehityskohde (lib/tm_eerikkila_normit.js)
 * Speksi: docs/HH_TSI_ANALYYSIMALLI.md · docs/tehtavat_arkisto/TEHTAVA_HH_VAIHE1.md
 * Kynnysarvot EERIKKILA_NORMIT-taulukosta (nopeus_30m P15=[4.08,4.18,4.28,4.41] · mas P12=[4.40,4.31,4.20,4.00] · hyppy_cj P15=[41.3,37.5,35.4,33.0]).
 * Ajetaan: npm test
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { hhSeuraavaTaso, hhVaadittuVuosivauhti, hhKehityskohde } = require('../lib/tm_eerikkila_normit.js');

describe('hhSeuraavaTaso', () => {
  it('lin30m P15 4.34 → taso 2, seuraava 3, kynnys 4.28, gap 0.06 (s)', () => {
    expect(hhSeuraavaTaso('lin30m', 4.34, 15, 'M')).toEqual({ nykyinenTaso: 2, seuraavaTaso: 3, kynnys: 4.28, gap: 0.06, yksikko: 's' });
  });
  it('cmj P15 35.5 → taso 3, gap käänteinen (suurempi=parempi) +2.0 cm', () => {
    const r = hhSeuraavaTaso('cmj', 35.5, 15, 'M');
    expect(r.nykyinenTaso).toBe(3);
    expect(r.gap).toBe(2);          // 37.5 − 35.5
    expect(r.yksikko).toBe('cm');
  });
  it('MAS-yksikkömuunnos: 14.4 km/h ÷3.6 = 4.0 m/s → taso 2 (EI saturoitu 5!)', () => {
    const r = hhSeuraavaTaso('mas', 14.4, 12, 'M');
    expect(r.nykyinenTaso).toBe(2);  // §30 regressio: ilman ÷3.6 → taso 5
    expect(r.yksikko).toBe('km/h');
    expect(r.kynnys).toBe(15.12);    // 4.20 m/s × 3.6
    expect(r.gap).toBe(0.72);        // 15.12 − 14.4
  });
  it('taso 5 → seuraavaTaso null (huipputaso)', () => {
    const r = hhSeuraavaTaso('lin30m', 4.00, 15, 'M');  // ≤4.08 → taso 5
    expect(r.nykyinenTaso).toBe(5);
    expect(r.seuraavaTaso).toBeNull();
  });
  it('tuntematon testi / null arvo → null', () => {
    expect(hhSeuraavaTaso('xxx', 4.0, 15, 'M')).toBeNull();
    expect(hhSeuraavaTaso('lin30m', null, 15, 'M')).toBeNull();
  });
});

describe('hhVaadittuVuosivauhti', () => {
  it('lin30m taso 3 P15→P16 → 0.10 s/v (4.28 − 4.18)', () => {
    expect(hhVaadittuVuosivauhti('lin30m', 15, 'M', 3)).toBe(0.1);
  });
  it('ika+1 puuttuu normeista → null (ika 19)', () => {
    expect(hhVaadittuVuosivauhti('lin30m', 19, 'M', 3)).toBeNull();
  });
});

describe('hhKehityskohde — PHV-suodatin (§0/§28)', () => {
  // hv: lin30m 4.34 (P15 taso2) · cmj 35.5 (taso3) · sm_pallo 8.9 (P15=[8.57,8.83,9.02,9.31] → taso3)
  const hv = { lin30m: 4.34, cmj: 35.5, sm_pallo: 8.9 };
  it('P15.0 ikäoletus → kehityskohde = alin fyysinen (lin30m), phvVarmuus ikaoletus', () => {
    const r = hhKehityskohde(hv, 15.0, 'M', null);
    expect(r.phvVarmuus).toBe('ikaoletus');
    expect(r.kehityskohde).toBe('lin30m');
  });
  it('P14.9 epavarma → fyysiset suodattuvat, vain sm_pallo kehityskohteeksi', () => {
    const r = hhKehityskohde(hv, 14.9, 'M', null);
    expect(r.phvVarmuus).toBe('epavarma');
    expect(r.kehityskohde).toBe('sm_pallo');
  });
  it('T12.9 epavarma / T13.0 ikaoletus (tyttöjen raja 13.0)', () => {
    expect(hhKehityskohde(hv, 12.9, 'N', null).phvVarmuus).toBe('epavarma');
    expect(hhKehityskohde(hv, 13.0, 'N', null).phvVarmuus).toBe('ikaoletus');
  });
  it('PH-tila → fyysiset suodattuvat + kuormarajoitin, sm_pallo silti sallittu', () => {
    const r = hhKehityskohde(hv, 15.0, 'M', 'PH');
    expect(r.kehityskohde).toBe('sm_pallo');   // lin30m/cmj suodattuvat
    expect(r.kuormarajoitin).toBe(true);
  });
  it('POST → täysi: alin taso mistä tahansa; vahvuus = taso ≥4', () => {
    const r = hhKehityskohde({ lin30m: 4.00 }, 15.0, 'M', 'POST');  // taso 5
    expect(r.phvVarmuus).toBe('mitattu');
    expect(r.vahvuus).toBe('lin30m');          // taso 5 ≥ 4
  });
});
