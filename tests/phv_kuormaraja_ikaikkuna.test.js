/**
 * PR C / päätös B (Tero 4.10.2026): PHV ei mitattu → S2-katto VAIN kalenteri-ikäikkunassa (pojat 12–15 v, tytöt 10–13 v;
 * nimetyt vakiot lib/tm_phv_tila.js). Muut mittaamattomat saavat normaalin ikävaiheen kuorman. Mitattu PH ja lomakkeelta
 * ilmoitettu PH pysyvät varovaisina iästä riippumatta. Henkilökunnalle "PHV ei mitattu"; lapselle ei mitään.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = require('../lib/tm_phv_tila.js');
const NYT = new Date(2026, 9, 4);
const pel = (ika, sp, extra) => Object.assign({ syntymaVuosi: 2026 - ika, sukupuoli: sp }, extra || {});

describe('Ikäikkuna — nimetyt vakiot ja rajat (mukaan lukien)', () => {
  it('vakiot: pojat 12–15, tytöt 10–13', () => {
    expect(P.PHV_IKKUNA_POJAT).toEqual({ min: 12, max: 15 });
    expect(P.PHV_IKKUNA_TYTOT).toEqual({ min: 10, max: 13 });
  });
  it.each([[11, false], [12, true], [15, true], [16, false]])('poika %i v mittaamaton → varovainen %s', (ika, odotus) => {
    expect(P.tmPhvKuormaVarovainen(pel(ika, 'M'), NYT)).toBe(odotus);
    expect(P.tmPhvKuormaTila(pel(ika, 'M'), NYT)).toBe(odotus ? 'tuntematon' : null);
    expect(P.tmPhvEiMitattu(pel(ika, 'M'), NYT)).toBe(odotus);
  });
  it.each([[9, false], [10, true], [13, true], [14, false]])('tyttö %i v mittaamaton → varovainen %s', (ika, odotus) => {
    expect(P.tmPhvKuormaVarovainen(pel(ika, 'N'), NYT)).toBe(odotus);
    expect(P.tmPhvEiMitattu(pel(ika, 'N'), NYT)).toBe(odotus);
  });
  it('valmis ika-kenttä (laskentaobjektit) kelpaa iäksi', () => {
    expect(P.tmPhvKuormaVarovainen({ ika: 13, sukupuoli: 'M' }, NYT)).toBe(true);
    expect(P.tmPhvKuormaVarovainen({ ika: 17, sukupuoli: 'M' }, NYT)).toBe(false);
  });
  it('sukupuoli tuntematon → yhdistetty 10–15; ikä tuntematon → varovainen', () => {
    expect(P.tmPhvKuormaVarovainen(pel(10, ''), NYT)).toBe(true);
    expect(P.tmPhvKuormaVarovainen(pel(15, ''), NYT)).toBe(true);
    expect(P.tmPhvKuormaVarovainen(pel(16, ''), NYT)).toBe(false);
    expect(P.tmPhvKuormaVarovainen({ sukupuoli: 'M' }, NYT)).toBe(true);
  });
});

describe('Mitattu PH ja ilmoitettu PH pysyvät kuten ennen (iästä riippumatta)', () => {
  const mit = (k) => ({ biologinenIka_viimeisin: { phv_tila_koodi: k } });
  it('mitattu PH 17 v → PH (varovainen, PH-teksti); mitattu PRE 13 v → normaali (ei S2-kattoa)', () => {
    expect(P.tmPhvKuormaTila(pel(17, 'M', mit('PH')), NYT)).toBe('PH');
    expect(P.tmPhvKuormaTila(pel(13, 'M', mit('PRE')), NYT)).toBe('PRE');
    expect(P.tmPhvKuormaVarovainen(pel(13, 'M', mit('PRE')), NYT)).toBe(false);
    expect(P.tmPhvEiMitattu(pel(13, 'M', mit('PRE')), NYT)).toBe(false);
  });
  it('ilmoitettu PH (ei mittausta) 17 v → varovainen; merkintä on "ilmoitettu" eikä "ei mitattu"', () => {
    const d = pel(17, 'M', { phv_tila: 'PH' });
    expect(P.tmPhvKuormaTila(d, NYT)).toBe('tuntematon');
    expect(P.tmPhvIlmoitettuPH(d)).toBe(true);
    expect(P.tmPhvEiMitattu(d, NYT)).toBe(false);
  });
});

describe('Kuluttajat: S2-katto vain ikkunassa', () => {
  // laskeEfektiivinenStage/generoimPreHarkka-ikäikkunakäytös: tests/tm_profile_prescription_phv.characterization.test.js (päätös B -testit)
  it('harjoitelogiikka, tm-profile ja tm-prescription käyttävät tmPhvKuormaTila:a (yksi sääntö)', () => {
    for (const f of ['harjoitelogiikka_v4.js', 'lib/tm-profile.js', 'lib/tm-prescription.js']) {
      expect(readFileSync(join(ROOT, f), 'utf8'), f).toContain('tmPhvKuormaTila');
    }
  });
  it('henkilökunnan merkintä VP + Master; Pelaaja/Vanhempi eivät näytä sitä lapselle', () => {
    expect(readFileSync(join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8')).toContain("vpT('PHV ei mitattu')");
    expect(readFileSync(join(ROOT, 'TalentMaster_Master_v16.html'), 'utf8')).toContain("masterT('PHV ei mitattu')");
    for (const f of ['TalentMaster_Pelaaja_v7.html', 'TalentMaster_Vanhempi_v2.html']) {
      expect(readFileSync(join(ROOT, f), 'utf8'), f).not.toMatch(/PHV ei mitattu|tmPhvEiMitattu/);
    }
  });
  it('functions/tm_phv_tila.js identtinen kopio', () => {
    expect(readFileSync(join(ROOT, 'functions/tm_phv_tila.js'), 'utf8')).toBe(readFileSync(join(ROOT, 'lib/tm_phv_tila.js'), 'utf8'));
  });
});
