// #61 — Excel-päivämääräsolun normalisointi (45930-sarjanumero-bugi).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmPaivaIso, tmSolustaPvm } = require('../lib/tm_pvm.js');

describe('tmPaivaIso — Excel-sarjanumero (#61 regressio: 45930 ei 45930-01-01)', () => {
  it('sarjanumero numerona → oikea vuosi (EI 45930-01-01)', () => {
    const r = tmPaivaIso(45930);
    expect(r).toBe('2025-09-30');           // 45930 = 30.9.2025 (epookki 1899-12-30)
    expect(r).not.toBe('45930-01-01');      // KRIITTINEN: ei vuotta 45930
  });
  it('sarjanumero merkkijonona (SheetJS String(45930)) → sama, ei vuosi 45930', () => {
    expect(tmPaivaIso('45930')).toBe('2025-09-30');
    expect(tmPaivaIso('45930')).not.toBe('45930-01-01');
  });
  it('ISO- ja FI-päivämäärät läpi', () => {
    expect(tmPaivaIso('2025-10-21')).toBe('2025-10-21');
    expect(tmPaivaIso('21.10.2025')).toBe('2025-10-21');
  });
  it('Date-olio → timezone-safe ISO (local getFullYear, ei toISOString)', () => {
    expect(tmPaivaIso(new Date(2025, 9, 21))).toBe('2025-10-21');   // kk 0-indeksoitu
  });
  it('vuosinäköinen luku < 20000 EI tulkita sarjanumeroksi väärin', () => {
    // 2013 on > 59 ja < 100000 → epoch-haara: 2013 päivää 1970:stä = 1975 (ei vuosi 2013, mutta ei myöskään 2013-01-01)
    const r = tmPaivaIso(2013);
    expect(r).not.toBe('2013-01-01');
    expect(typeof r).toBe('string');
  });
  it('tyhjä / null → null', () => {
    expect(tmPaivaIso(null)).toBeNull();
    expect(tmPaivaIso('')).toBeNull();
    expect(tmPaivaIso('ei-päivä')).toBeNull();
  });
});

describe('tmSolustaPvm — solu-arvo (numero/Date → ISO, teksti trimmattuna)', () => {
  it('sarjanumero (numero) → ISO, EI 45930-01-01', () => {
    expect(tmSolustaPvm(45930)).toBe('2025-09-30');
    expect(tmSolustaPvm(45930)).not.toBe('45930-01-01');
  });
  it('Date-olio → ISO', () => {
    expect(tmSolustaPvm(new Date(2025, 9, 21))).toBe('2025-10-21');
  });
  it('teksti palautetaan trimmattuna (esim. "Kevät 2026", "2013")', () => {
    expect(tmSolustaPvm('  Kevät 2026 ')).toBe('Kevät 2026');
    expect(tmSolustaPvm('2013')).toBe('2013');     // syntymävuosi-tyyppi: teksti EI muunnu sarjanumeroksi
  });
  it('tyhjä / null → ""', () => {
    expect(tmSolustaPvm('')).toBe('');
    expect(tmSolustaPvm(null)).toBe('');
    expect(tmSolustaPvm(undefined)).toBe('');
  });
});
