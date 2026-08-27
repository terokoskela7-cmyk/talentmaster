/**
 * TalentMaster - i18n V4-A3 (Osa A): Pelaaja-kotinäytön reitittämättömät chrome-tekstit sv.
 * 4 tekstiä jäivät kovakoodattuina suomeksi sv-tilassa: "Näin teet" (D-kortin ohje-label),
 * "Kirjaa tehdyksi" (D/S/T-korttien nappi), "Pallo joka päivä" (T-kortin otsikko), RAE-Q4-viesti
 * (otsikko + teksti). Reititetty t('pelaaja.*'):n kautta (fi/sv/en). S7.22: RAE-Q4 ei tasoja/vertailua.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

const AVAIMET = ['nain_teet', 'kirjaa_tehdyksi', 'pallo_joka_paiva', 'rae_q4_otsikko', 'rae_q4_teksti'];
const KIELLETTY = /\bTKI\b|\bT[1-5]\b|percentil|better than|worse than/;

describe('tm_lang pelaaja.* chrome-avaimet (V4-A3) fi/sv/en taydelliset', () => {
  it('kaikki 5 avainta ei-tyhjia stringeja kaikissa kielissa', () => {
    ['fi', 'sv', 'en'].forEach((k) => AVAIMET.forEach((a) => {
      expect(typeof L.TM_LANG[k].pelaaja[a]).toBe('string');
      expect(L.TM_LANG[k].pelaaja[a].trim().length).toBeGreaterThan(0);
    }));
  });
  it('sv/en oikeasti kaannetty (ei fi-kopio) keskeisille avaimille', () => {
    expect(L.TM_LANG.sv.pelaaja.nain_teet).toBe('Så här gör du');
    expect(L.TM_LANG.sv.pelaaja.pallo_joka_paiva).toBe('Bollen varje dag');
    expect(L.TM_LANG.en.pelaaja.kirjaa_tehdyksi).toBe('Mark as done');
    expect(L.TM_LANG.sv.pelaaja.nain_teet).not.toBe(L.TM_LANG.fi.pelaaja.nain_teet);
  });
  it('S7.22: RAE-Q4-teksti sv/en ei sisalla tasolukuja/vertailua', () => {
    ['sv', 'en'].forEach((k) => expect(KIELLETTY.test(L.TM_LANG[k].pelaaja.rae_q4_teksti)).toBe(false));
    // anti-vertailu-kehys sailyy (fi: "alä vertailuun")
    expect(/jämföra/.test(L.TM_LANG.sv.pelaaja.rae_q4_teksti)).toBe(true);
    expect(/comparing/.test(L.TM_LANG.en.pelaaja.rae_q4_teksti)).toBe(true);
  });
  it('fi ei rikkoudu: fi-arvo palautuu', () => {
    L.tmAsetaKieli('fi', false);
    expect(L.t('pelaaja.nain_teet')).toBe('Näin teet');
    expect(L.t('pelaaja.rae_q4_otsikko')).toBe('Sinulle');
  });
});

describe('Pelaaja_v7 kytkenta: chrome reititetty T()-getterilla (ei kovakoodattua)', () => {
  it('T()-kutsut lisatty (nain_teet/kirjaa_tehdyksi/pallo_joka_paiva/rae_q4)', () => {
    ["T('nain_teet')", "T('kirjaa_tehdyksi')", "T('pallo_joka_paiva')", "T('rae_q4_otsikko')", "T('rae_q4_teksti')"]
      .forEach((s) => expect(PEL).toContain(s));
  });
  it('ei kovakoodattuja suomi-literaaleja kotinäytöllä', () => {
    expect(PEL).not.toContain('>Näin teet</span>');
    expect(PEL).not.toContain('✓ Kirjaa tehdyksi');
    expect(PEL).not.toContain('>Sinulle</div>');
    expect(PEL).not.toContain('>Pallo joka päivä</div>');
    expect(PEL).not.toContain('Olet ikäluokkasi nuorimpia');
  });
  it('tm_lang ?v>=4 + SW-cache >= v18', () => {
    expect(PEL).toMatch(/lib\/tm_lang\.js\?v=([4-9]|\d\d)/);
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/const CACHE = 'tm-pelaaja-v(1[8-9]|[2-9]\d)'/);
  });
});
