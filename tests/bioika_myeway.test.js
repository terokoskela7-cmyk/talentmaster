// PHV / Mirwald — MyE.Way-pariteetti (2026-07-01). Lukitsee poikien vakion −9.3236 (MyE.Way, Palloliiton
// live-tuote) KAIKISSA KOLMESSA kopiossa (tm_bioika / tm_testipankki / tm_ylaikaisyys). Tytöt −9.376 (ennallaan).
// Verifioitu 2 riippumattomalla MyE.Way-referenssipisteellä (istumapituus = mitattu − jakkara).
// Jos joku kopio jää päivittämättä → tämä testi punaiseksi (guardaa "kolme kopiota, päivitä yhdessä").
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const { laskeMirwald } = require('../src/lib/tm_bioika.js');
const { TM_LASKE_BIOIKA } = require('../src/lib/tm_testipankki.js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = (p) => readFileSync(resolve(__dirname, '..', p), 'utf8');

// MyE.Way-referenssipisteet
const AAMOS = { ika: 13.94, pituus: 146.1, paino: 36.2, istumapituus: 73.4, sukupuoli: 'P' }; // P2012 → offset −1.61 / PHV 15.55
const FELISSA = { ika: 10.55, pituus: 142.8, paino: 32.8, istumapituus: 73.0, sukupuoli: 'T' }; // T2015 → offset −1.45

describe('PHV Mirwald — MyE.Way-pariteetti (poikien vakio −9.3236)', () => {
  it('tm_bioika.laskeMirwald: pojat → MyE.Way-offset −1.61 (Aamos Järvinen)', () => {
    expect(laskeMirwald(AAMOS).maturity_offset).toBeCloseTo(-1.61, 2);
  });

  it('tm_bioika.laskeMirwald: tytöt → −1.45 (Felissa Kalinko, −9.376 ennallaan)', () => {
    expect(laskeMirwald(FELISSA).maturity_offset).toBeCloseTo(-1.45, 2);
  });

  it('tm_testipankki.TM_LASKE_BIOIKA: pojat offset −1.61 + PHV-ikä 15.55 (päivämääräpohjainen)', () => {
    const syn   = new Date('2012-01-01T00:00:00Z');
    const testi = new Date(syn.getTime() + AAMOS.ika * 365.25 * 86400000);
    const r = TM_LASKE_BIOIKA({
      pituus: AAMOS.pituus, paino: AAMOS.paino, istumapituus: AAMOS.istumapituus,
      sukupuoli: 'P', syntymaPvm: syn.toISOString(), testiPvm: testi.toISOString(),
    });
    expect(r.offset).toBeCloseTo(-1.61, 2);
    expect(r.phvIka).toBeCloseTo(15.55, 1);
  });

  it('behavioraalinen pariteetti: tm_bioika === tm_testipankki (pojat)', () => {
    const syn   = new Date('2012-01-01T00:00:00Z');
    const testi = new Date(syn.getTime() + AAMOS.ika * 365.25 * 86400000);
    const tp = TM_LASKE_BIOIKA({
      pituus: AAMOS.pituus, paino: AAMOS.paino, istumapituus: AAMOS.istumapituus,
      sukupuoli: 'P', syntymaPvm: syn.toISOString(), testiPvm: testi.toISOString(),
    }).offset;
    expect(laskeMirwald(AAMOS).maturity_offset).toBeCloseTo(tp, 1);
  });

  // Lähdetason guard: tm_ylaikaisyys.js on selainpuolinen (ei CommonJS-exportia) → varmistetaan vakio
  // suoraan lähteestä. Sama tarkistus kaikille kolmelle → "kolme kopiota, päivitä yhdessä" ei rikkoudu hiljaa.
  it('KOLME KOPIOTA: kaikissa boys −9.3236, ei enää julkaistua −9.236 (girls −9.376 ennallaan)', () => {
    for (const f of ['src/lib/tm_bioika.js', 'src/lib/tm_testipankki.js', 'src/lib/tm_ylaikaisyys.js']) {
      const s = src(f);
      expect(s.includes('-9.3236')).toBe(true);   // poikien MyE.Way-vakio läsnä
      expect(s.includes('-9.236')).toBe(false);   // ei aktiivista ASCII-vakiota −9.236 (julkaistu Mirwald)
      expect(s.includes('-9.376')).toBe(true);    // tyttöjen vakio ennallaan
    }
  });
});
