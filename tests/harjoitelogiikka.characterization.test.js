/**
 * TalentMaster™ — Characterization-testit: harjoitelogiikka_v4.js (A7 Vaihe 1)
 *
 * TARKOITUS: pinnaa harjoitepankin NYKYKÄYTÖS ennen refaktorointia (A7). Nämä testit
 * ovat turvaverkko — jos refaktorointi muuttaa käytöstä, testi punaisena.
 * Importtaa AINA kanonisesta ROOT-tiedostosta (src/lib on re-export, A7 Vaihe 0).
 *
 * VERIFIOITU TODELLISUUS vs alkuperäinen spec (3 poikkeamaa — pinnattu todellisuuteen,
 * EI spec-oletukseen; characterization = mitä koodi OIKEASTI tekee):
 *  1. laskeTekninenKehityskohde ei-datalle → { lahde:'ikavaihe', varmuus:'oletus' }
 *     (spec oletti lahde:'oletus' — väärin; 'oletus' on varmuus-kentässä).
 *  2. generoiMiksiteksti(p, null, iv) HEITTÄÄ (lukee kehityskohde.kohde). Siksi kuluttaja
 *     Pelaaja_v7:1719 kietoo sen try/catchiin. Pinnaamme heiton, emme heittämättömyyttä.
 *  3. ADAR-override on D-TEHTÄVÄSSÄ (ei S), ehto pelaaja.adar_pisteet < 40 (LUKU, ei objekti
 *     {ac}). harjoitelogiikka_v4.js:1105-1113. Spec-fikstuuri {ac:0.2} EI laukaise overridea.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lib = require('../harjoitelogiikka_v4.js');

const PVM = '2026-06-15';

// Spec-fikstuurit (säilytetty sellaisenaan) — adar_matala.{ac} ei laukaise overridea (ks. yllä #3).
const FIKSTURIT = {
  leikkija_ei_dataa: { syntymaVuosi: 2016 },
  leikkija_flei:     { syntymaVuosi: 2016, flei_ketjut: { sbl: 2.1, sfl: 2.5, ll: 1.8, diag: 2.2, dfl: 2.0 }, luotu: '2026-01-01' },
  rakentaja_tki:     { syntymaVuosi: 2013, tki_kehityskohde: 'syotto', luotu: '2026-03-01' },
  rakentaja_tsi:     { syntymaVuosi: 2013, tsi_viimeisin: 1.4, luotu: '2026-03-01' },
  showcase_phv:      { syntymaVuosi: 2010, phv_tila: 'PH', luotu: '2026-01-15' },
  ilman_luotua:      { syntymaVuosi: 2013 },
  adar_matala:       { syntymaVuosi: 2013, adar_pisteet: { ac: 0.2 }, luotu: '2026-02-01' },
};

// valitsePaivanHarjoite-paluuobjektin kanoninen kenttärakenne (kuluttajasopimus, A7 §3B).
const VPH_KENTAT = ['cue', 'kehityskohde', 'kesto', 'nimi', 'ohje', 'paiviaAktiivinen', 'tarina', 'tyyppi', 'viikkotavoite', 'xp', 'yt'].sort();

describe('A7 Vaihe 0 — kanoonisuus', () => {
  it('src/lib/harjoitelogiikka_v4.js on re-export rootista (sama funktioviite)', () => {
    const lib2 = require('../src/lib/harjoitelogiikka_v4.js');
    expect(lib2.valitsePaivanHarjoite).toBe(lib.valitsePaivanHarjoite);
  });
});

describe('valitsePaivanHarjoite', () => {
  for (const [nimi, p] of Object.entries(FIKSTURIT)) {
    it(`${nimi}: ei heitä, palauttaa T-harjoitteen täydellä kenttärakenteella`, () => {
      const r = lib.valitsePaivanHarjoite(p, lib.PANKKI, PVM);
      expect(typeof r).toBe('object');
      expect(r).not.toBeNull();
      expect(Object.keys(r).sort()).toEqual(VPH_KENTAT); // kenttärakenne-snapshot (vain kentät)
      expect(r.tyyppi).toBe('T');                         // T-harjoite joka päivä (metodologia)
      expect(typeof r.ohje).toBe('string');
      expect(r.ohje.length).toBeGreaterThan(0);
    });
  }

  it('ilman luotua → paiviaAktiivinen === 0 (PAKOLLINEN — harjoite ei vaihdu ilman luotua)', () => {
    expect(lib.valitsePaivanHarjoite(FIKSTURIT.ilman_luotua, lib.PANKKI, PVM).paiviaAktiivinen).toBe(0);
    expect(lib.valitsePaivanHarjoite(FIKSTURIT.leikkija_ei_dataa, lib.PANKKI, PVM).paiviaAktiivinen).toBe(0);
  });

  it('luotu olemassa → paiviaAktiivinen on numero >= 0', () => {
    const r = lib.valitsePaivanHarjoite(FIKSTURIT.rakentaja_tki, lib.PANKKI, PVM);
    expect(typeof r.paiviaAktiivinen).toBe('number');
    expect(r.paiviaAktiivinen).toBeGreaterThanOrEqual(0);
  });

  it('leikkija §28 — ohje on ei-tyhjä string (leikkijän fallback, ei rakentajan drilliä)', () => {
    // _ohjeIkavaiheelle (root:2684) ei ole exportattu → §28 pinnataan julkisen API:n kautta.
    // ika annettu eksplisiittisesti → ikävaihe ei riipu kuluvasta vuodesta.
    const p = { ika: 10, luotu: '2026-01-01' };
    expect(lib._laskeIkavaihe(p)).toBe('leikkija');
    const r = lib.valitsePaivanHarjoite(p, lib.PANKKI, PVM);
    expect(typeof r.ohje).toBe('string');
    expect(r.ohje.length).toBeGreaterThan(0);
  });
});

describe('laskeTekninenKehityskohde', () => {
  it('palauttaa { kohde, lahde, varmuus, rawKohde }', () => {
    const k = lib.laskeTekninenKehityskohde(FIKSTURIT.rakentaja_tki);
    expect(Object.keys(k).sort()).toEqual(['kohde', 'lahde', 'rawKohde', 'varmuus']);
  });

  it('tki_kehityskohde → lahde === "tki", kohde === "syotto"', () => {
    const k = lib.laskeTekninenKehityskohde(FIKSTURIT.rakentaja_tki);
    expect(k.lahde).toBe('tki');
    expect(k.kohde).toBe('syotto');
  });

  it('tsi_viimeisin → lahde === "tsi"', () => {
    expect(lib.laskeTekninenKehityskohde(FIKSTURIT.rakentaja_tsi).lahde).toBe('tsi');
  });

  it('ei dataa → lahde === "ikavaihe", varmuus === "oletus" (TODELLISUUS, ei lahde:"oletus")', () => {
    const k = lib.laskeTekninenKehityskohde(FIKSTURIT.ilman_luotua);
    expect(k.lahde).toBe('ikavaihe');
    expect(k.varmuus).toBe('oletus');
  });
});

describe('generoiMiksiteksti', () => {
  it('happy path (oikea kehityskohde-objekti) → { miksi_lause1, miksi_lause2, miksi_lause3 } stringit', () => {
    const p = FIKSTURIT.rakentaja_tki;
    const kk = lib.laskeTekninenKehityskohde(p);
    const m = lib.generoiMiksiteksti(p, kk, lib._laskeIkavaihe(p));
    expect(Object.keys(m).sort()).toEqual(['miksi_lause1', 'miksi_lause2', 'miksi_lause3']);
    for (const v of Object.values(m)) expect(typeof v).toBe('string');
  });

  it('HEITTÄÄ kun kehityskohde === null (siksi Pelaaja_v7:1719 kietoo try/catchiin)', () => {
    const p = FIKSTURIT.rakentaja_tki;
    expect(() => lib.generoiMiksiteksti(p, null, lib._laskeIkavaihe(p))).toThrow();
  });
});

describe('generoimTehtavat', () => {
  it('palauttaa array jossa tyypit T, D, S', () => {
    const t = lib.generoimTehtavat(FIKSTURIT.rakentaja_tki, PVM);
    expect(Array.isArray(t)).toBe(true);
    expect(t.length).toBeGreaterThan(0);
    const tyypit = new Set(t.map((x) => x.tyyppi));
    for (const ty of ['T', 'D', 'S']) expect(tyypit.has(ty)).toBe(true);
  });
});

describe('INVARIANTIT — EI saa rikkoa refaktoroinnissa', () => {
  it('DIAG-ketju ei hajoa sl/fl-kentillä (PANKKI.D + PANKKI.S)', () => {
    for (const haara of ['D', 'S']) {
      const ketjut = Object.keys(lib.PANKKI[haara]);
      expect(ketjut).toContain('diag');
      expect(ketjut).not.toContain('sl');
      expect(ketjut).not.toContain('fl');
    }
  });

  it('ADAR-override: adar_pisteet < 40 (luku) → D-tehtävä ketju === "diag", adar_override === true', () => {
    const p = { syntymaVuosi: 2013, adar_pisteet: 30, luotu: '2026-02-01' };
    const d = lib.generoimTehtavat(p, PVM).find((x) => x.tyyppi === 'D');
    expect(d.ketju).toBe('diag');
    expect(d.adar_override).toBe(true);
  });

  it('ADAR >= 40 → ei diag-overridea (heikoin ketju voittaa)', () => {
    const p = { syntymaVuosi: 2013, adar_pisteet: 50, luotu: '2026-02-01' };
    const d = lib.generoimTehtavat(p, PVM).find((x) => x.tyyppi === 'D');
    expect(d.adar_override).toBe(false);
  });
});
