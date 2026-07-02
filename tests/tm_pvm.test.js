// #61 — Excel-päivämääräsolun normalisointi (45930-sarjanumero-bugi).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { tmPaivaIso, tmSolustaPvm, tmOnHHtesti, tmValitseHhPvm, tmTestipaivaPatteristot } = require('../lib/tm_pvm.js');

// testipaivat protokolla→patteristo-mäppäys (CODE_TASK_TESTIPAIVAT Osa 2a).
describe('tmTestipaivaPatteristot — testi → patteristo(t)', () => {
  it('fyysinen H-H → fyysinen_hh', () => {
    expect(tmTestipaivaPatteristot({ protokolla: 'hh_suppea', testit: { lin30m: 4.2, cmj: 40 } })).toEqual(['fyysinen_hh']);
  });
  it('H-H-tekniikka (syöttö/pujottelu) → tekniikka_hh', () => {
    expect(tmTestipaivaPatteristot({ protokolla: 'hh_suppea', testit: { syotto: 38, pujottelu: 12 } })).toEqual(['tekniikka_hh']);
  });
  it('test-ID-variantit syotto_hh/pujottelu_hh (testitulokset-doc) → tekniikka_hh', () => {
    expect(tmTestipaivaPatteristot({ protokolla: 'hh_suppea', testit: { syotto_hh: 38.4, pujottelu_hh: 12.1 } })).toEqual(['tekniikka_hh']);
    expect(tmTestipaivaPatteristot({ protokolla: 'hh_laaja', testit: { lin_30m: 5.1, hyppy_cj: 40, syotto_hh: 38 } })).toEqual(['fyysinen_hh', 'tekniikka_hh']);
  });
  it('hh_laaja (fyysinen + tekniikka) → molemmat', () => {
    expect(tmTestipaivaPatteristot({ protokolla: 'hh_laaja', testit: { lin30m: 4.2, syotto: 38 } })).toEqual(['fyysinen_hh', 'tekniikka_hh']);
  });
  it('tekniikkakilpailu → tki (EI tekniikka_hh vaikka syotto)', () => {
    expect(tmTestipaivaPatteristot({ protokolla: 'tekniikkakilpailu', testit: { syotto: 40, ponnauttelu: 48 } })).toEqual(['tki']);
  });
  it('tyhjä testit → []', () => {
    expect(tmTestipaivaPatteristot({ protokolla: 'hh_suppea', testit: {} })).toEqual([]);
  });
});

// hh_pvm A-semantiikka (CODE_TASK_TESTIPAIVAT Osa 1): max vaikuttanut H-H-testipäivä, ei backdate.
describe('tmValitseHhPvm — hh_pvm A-semantiikka', () => {
  const fys6_05 = { protokolla: 'hh_suppea', testit: { lin30m: 4.19, cmj: 41, mas: 14.9 }, pvm: '2026-06-05' };
  const tekn6_09 = { protokolla: 'hh_suppea', testit: { syotto: 38.4, pujottelu: 12.1 }, pvm: '2026-06-09' };
  const tki = { protokolla: 'tekniikkakilpailu', testit: { syotto: 40, ponnauttelu: 48 }, pvm: '2026-06-20' };

  it('merge-pelaaja (fys 5.6. + tekn 9.6.) → 9.6. (max), EI backdate 5.6.:een', () => {
    expect(tmValitseHhPvm([fys6_05, tekn6_09], '2026-06-09')).toBe(null);   // jo 9.6. → ei muutosta
    expect(tmValitseHhPvm([fys6_05, tekn6_09], '2026-04-01')).toBe('2026-06-09');   // stale → korjaa max:iin
  });
  it('yksittäistesti: nykyPvm === testipäivä → null (jo OK)', () => {
    expect(tmValitseHhPvm([fys6_05], '2026-06-05')).toBe(null);
    expect(tmValitseHhPvm([fys6_05], '2026-04-01')).toBe('2026-06-05');
  });
  it('EI koskaan backdate: nykyPvm uudempi kuin max → null', () => {
    expect(tmValitseHhPvm([fys6_05], '2026-07-01')).toBe(null);
  });
  it('TKI (tekniikkakilpailu) EI vaikuta hh_pvm:ään', () => {
    expect(tmValitseHhPvm([tki], '2026-04-01')).toBe(null);            // ei H-H-testejä → null
    expect(tmValitseHhPvm([fys6_05, tki], '2026-04-01')).toBe('2026-06-05');   // tki (6.20) ohitetaan
  });
  it('tmOnHHtesti: fyysinen/tekniikka=true, tekniikkakilpailu=false', () => {
    expect(tmOnHHtesti(fys6_05)).toBe(true);
    expect(tmOnHHtesti(tekn6_09)).toBe(true);
    expect(tmOnHHtesti(tki)).toBe(false);
    expect(tmOnHHtesti({ testit: {} })).toBe(false);
  });
});

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
