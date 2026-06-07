/**
 * TalentMaster™ — Eerikkilä-normitestit
 * lib/tm_eerikkila_normit.js
 *
 * HUOM: eerikkilaTaso(arvo, testi, ika, sukup)
 *   - testi = 'nopeus_30m', 'hyppy_cj', 'mas', 'pujottelu', 'syotto' jne.
 *   - sukup = 'M' (pojat) tai 'N' (tytöt) — EI 'P'/'T'
 *   - palauttaa 0 kun testiä/ikää ei tunneta (ei null)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  EERIKKILA_NORMIT,
  eerikkilaTaso,
  eerikkilaNormiarvo,
  laskeTSI,
} = require('../lib/tm_eerikkila_normit.js');

// ═══════════════════════════════════════════════════════════════════
// eerikkilaTaso — 5-portainen (ja 3-portainen pujottelu/syotto)
// ═══════════════════════════════════════════════════════════════════
describe('eerikkilaTaso', () => {
  // nopeus_30m P10: [4.88, 5.01, 5.15, 5.31] — pienempi_parempi
  // ≤4.88 → taso 5, ≤5.01 → 4, ≤5.15 → 3, ≤5.31 → 2, >5.31 → 1

  it('palauttaa tason 1 huonolle käänteiselle arvolle', () => {
    const taso = eerikkilaTaso(6.0, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(1);
  });

  it('palauttaa tason 5 erittäin hyvälle käänteiselle arvolle', () => {
    const taso = eerikkilaTaso(4.5, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(5);
  });

  it('rajatapaus: tasan taso-5-rajalla → taso 5', () => {
    // nopeus_30m P10: [4.88,...] → arvo 4.88 ≤ 4.88 → taso 5
    const taso = eerikkilaTaso(4.88, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(5);
  });

  it('rajatapaus: juuri yli taso-5-rajan → taso 4', () => {
    const taso = eerikkilaTaso(4.89, 'nopeus_30m', 10, 'M');
    expect(taso).toBe(4);
  });

  it('suurempi=parempi testi (hyppy_cj)', () => {
    // hyppy_cj P14 → suurempi on parempi
    const huono = eerikkilaTaso(15, 'hyppy_cj', 14, 'M');
    expect(huono).toBe(1);
    const hyva = eerikkilaTaso(50, 'hyppy_cj', 14, 'M');
    expect(hyva).toBe(5);
  });

  it('MAS m/s-arvoilla (normi on m/s)', () => {
    // mas P14 suurempi=parempi
    const taso = eerikkilaTaso(4.0, 'mas', 14, 'M');
    expect(taso).toBeGreaterThanOrEqual(1);
    expect(taso).toBeLessThanOrEqual(5);
  });

  it('REGRESSIO: km/h-arvo saturoi taso 5 — yksikkömuunnos /3.6 on pakollinen', () => {
    // BUGI joka korjattiin: MAS-data tallennetaan km/h, normi on m/s. Jos raaka
    // km/h-luku syötetään eerikkilaTasoon, se saturoituu aina taso 5:een (VÄÄRIN).
    // Kutsupaikan ON muunnettava km/h → m/s (÷3.6) ennen tätä funktiota.
    // 14.4 km/h = 4.0 m/s. M14 MAS-normi (taso 3) = 4.4 m/s.
    expect(eerikkilaNormiarvo('mas', 14, 'M')).toBe(4.4);       // normi todella m/s
    expect(eerikkilaTaso(14.4, 'mas', 14, 'M')).toBe(5);        // km/h raakana → saturoi 5
    expect(eerikkilaTaso(4.0, 'mas', 14, 'M')).toBe(1);         // sama nopeus m/s → oikea (matala) taso
    // Ydinväite: yksikkö ratkaisee tuloksen → eri yksiköt eivät saa antaa samaa tasoa.
    expect(eerikkilaTaso(14.4, 'mas', 14, 'M'))
      .not.toBe(eerikkilaTaso(4.0, 'mas', 14, 'M'));
  });

  it('palauttaa 0 tuntemattomalle testille', () => {
    expect(eerikkilaTaso(5, 'olematon', 10, 'M')).toBe(0);
  });

  it('palauttaa 0 null-arvolle', () => {
    expect(eerikkilaTaso(null, 'nopeus_30m', 10, 'M')).toBe(0);
  });

  it('pujottelu on 3-portainen (taso 1–3)', () => {
    const huono = eerikkilaTaso(99, 'pujottelu', 12, 'M');
    const hyva = eerikkilaTaso(1, 'pujottelu', 12, 'M');
    expect(huono).toBe(1);
    expect(hyva).toBe(3);
  });

  it('syotto on 3-portainen (taso 1–3)', () => {
    const huono = eerikkilaTaso(99, 'syotto', 12, 'M');
    expect(huono).toBe(1);
    const hyva = eerikkilaTaso(1, 'syotto', 12, 'M');
    expect(hyva).toBe(3);
  });

  it('N-sukupuoli (tytöt) toimii', () => {
    // nopeus_30m tytöt: [5.18, 5.33, 5.48, 5.65] (P10 approx)
    const taso = eerikkilaTaso(6.5, 'nopeus_30m', 10, 'N');
    expect(taso).toBe(1); // huono aika
  });

  it('ikä cappaa 10–19', () => {
    const t9 = eerikkilaTaso(6.0, 'nopeus_30m', 9, 'M');
    const t10 = eerikkilaTaso(6.0, 'nopeus_30m', 10, 'M');
    expect(t9).toBe(t10);
  });
});

// ═══════════════════════════════════════════════════════════════════
// eerikkilaNormiarvo — taso-3-kynnysarvo (ikäluokan keskitaso)
// Param order: (testi, ika, sukup) — sukup 'M'/'P' → pojat
// ═══════════════════════════════════════════════════════════════════
describe('eerikkilaNormiarvo', () => {
  it('palauttaa numeron tunnetuille testeille', () => {
    const arvo = eerikkilaNormiarvo('nopeus_30m', 12, 'M');
    expect(typeof arvo).toBe('number');
    expect(arvo).toBeGreaterThan(0);
  });

  it('palauttaa null tuntemattomalle testille', () => {
    expect(eerikkilaNormiarvo('olematon', 10, 'M')).toBeNull();
  });

  it('30m P12 normiarvo (taso-3-kynnys) on järkevä', () => {
    // nopeus_30m pojat P12: [4.56, 4.69, 4.82, 4.97] → rajat[2]=4.82
    const arvo = eerikkilaNormiarvo('nopeus_30m', 12, 'M');
    expect(arvo).toBeCloseTo(4.82, 1);
  });

  it('tytöille eri arvo', () => {
    const m = eerikkilaNormiarvo('nopeus_30m', 12, 'M');
    const n = eerikkilaNormiarvo('nopeus_30m', 12, 'N');
    expect(m).not.toBe(n);
  });
});

// ═══════════════════════════════════════════════════════════════════
// laskeTSI — Tekniikka-nopeus-indeksi
// laskeTSI(smjuoksu, smpallo) palauttaa numeron (smpallo - smjuoksu)
// ═══════════════════════════════════════════════════════════════════
describe('laskeTSI', () => {
  it('TSI = sm_pallo - sm_juoksu (numero)', () => {
    const result = laskeTSI(5.0, 5.8);
    expect(result).toBeCloseTo(0.8, 1);
  });

  it('palauttaa negatiivisen arvon kun pallo nopeampi', () => {
    const result = laskeTSI(5.5, 5.0);
    expect(result).toBeCloseTo(-0.5, 1);
  });

  it('palauttaa 0 kun samat ajat', () => {
    expect(laskeTSI(5.0, 5.0)).toBe(0);
  });

  it('palauttaa null kun parametrit puuttuvat', () => {
    expect(laskeTSI(null, 5.0)).toBeNull();
    expect(laskeTSI(5.0, null)).toBeNull();
  });
});
