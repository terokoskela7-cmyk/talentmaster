/**
 * TalentMaster - i18n V4-A4: Pelaaja-kotinäytön takautuva-kirjausvirtaus sv.
 * "+ Lisää mennyt päivä" -linkki (rA1) + staattinen takautuva-modaali (_avaaTakautuvaModal) + 3 validointi-alertia
 * olivat kovakoodattua suomea → reititetty t():n kautta. Modaali = staattista body-HTML:ää → data-i18n + _takautuvaLokalisoi().
 * S7.22: neutraali "lisää mennyt harjoituspäivä" (Vilodag = lepopäivä, ei menetyskehystä). fi ei rikkoudu (fallback).
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

const AVAIMET = [
  'takautuva_linkki', 'takautuva_otsikko', 'takautuva_pvm', 'takautuva_mita', 'takautuva_jalkapallo',
  'takautuva_muu', 'takautuva_lepo', 'takautuva_kesto', 'takautuva_tallenna',
  'takautuva_val_pvm', 'takautuva_val_mita', 'takautuva_val_kesto',
];

describe('tm_lang: takautuva_* fi/sv/en täydelliset (12 avainta)', () => {
  it('kaikki avaimet ei-tyhjia stringeja kaikissa kielissa', () => {
    ['fi', 'sv', 'en'].forEach((k) => AVAIMET.forEach((a) => {
      expect(typeof L.TM_LANG[k].pelaaja[a]).toBe('string');
      expect(L.TM_LANG[k].pelaaja[a].trim().length).toBeGreaterThan(0);
    }));
  });
  it('fi identtinen nykyisiin (regressio): sanatarkat lähdetekstit', () => {
    expect(L.TM_LANG.fi.pelaaja.takautuva_linkki).toBe('+ Lisää mennyt päivä');
    expect(L.TM_LANG.fi.pelaaja.takautuva_otsikko).toBe('Lisää mennyt päivä');
    expect(L.TM_LANG.fi.pelaaja.takautuva_lepo).toBe('Lepopäivä');
    expect(L.TM_LANG.fi.pelaaja.takautuva_tallenna).toBe('✓ Lisää päivä');
    expect(L.TM_LANG.fi.pelaaja.takautuva_val_mita).toBe('Valitse mitä teit');
  });
  it('sv oikeasti kaannetty + S7.22-neutraali (ei menetyskehystä)', () => {
    expect(L.TM_LANG.sv.pelaaja.takautuva_lepo).toBe('Vilodag');
    expect(L.TM_LANG.sv.pelaaja.takautuva_pvm).toBe('Datum');
    expect(L.TM_LANG.sv.pelaaja.takautuva_mita).toBe('Vad gjorde du?');
    expect(L.TM_LANG.en.pelaaja.takautuva_muu).toBe('Other sport');
    ['sv', 'en'].forEach((k) => AVAIMET.forEach((a) => {
      const v = L.TM_LANG[k].pelaaja[a];
      expect(/förlora|förlorad|miste|menetet|lost day|missed/i.test(v)).toBe(false);   // ei menetyskehystä
      expect(/\bTKI\b|\bT[1-5]\b|percentil/.test(v)).toBe(false);
    }));
  });
  it('fi ei rikkoudu (t() palauttaa fi)', () => {
    L.tmAsetaKieli('fi', false);
    expect(L.t('pelaaja.takautuva_linkki')).toBe('+ Lisää mennyt päivä');
  });
});

describe('Pelaaja_v7 kytkenta — linkki + modaali + alertit reititetty', () => {
  it('A) rA1-linkki reititetty ${T(takautuva_linkki)} (template-literaali)', () => {
    expect(PEL).toContain("${T('takautuva_linkki')}");
    expect(PEL).not.toContain('    + Lisää mennyt päivä\n');
  });
  it('B) modaalin data-i18n-attribuutit lisätty (8 solmua)', () => {
    ['takautuva_otsikko', 'takautuva_pvm', 'takautuva_mita', 'takautuva_jalkapallo', 'takautuva_muu',
      'takautuva_lepo', 'takautuva_kesto', 'takautuva_tallenna'].forEach((k) =>
      expect(PEL).toContain('data-i18n="pelaaja.' + k + '"'));
  });
  it('B) emoji-napit span-kääritty (⚽<br> säilyy, vain span data-i18n)', () => {
    expect(PEL).toContain('⚽<br><span data-i18n="pelaaja.takautuva_jalkapallo">Jalkapallo</span>');
    expect(PEL).toContain('🏃<br><span data-i18n="pelaaja.takautuva_muu">Muu urheilu</span>');
    expect(PEL).toContain('🎮<br><span data-i18n="pelaaja.takautuva_lepo">Lepopäivä</span>');
  });
  it('B) _takautuvaLokalisoi lisätty + kutsuttu _avaaTakautuvaModal:ssa', () => {
    expect(PEL).toContain('function _takautuvaLokalisoi(ov)');
    expect(PEL).toContain('el.textContent = t(k);');
    expect(PEL).toContain('_takautuvaLokalisoi(ov);');
  });
  it('C) validointi-alertit reititetty t():hen', () => {
    expect(PEL).toContain("alert(t('pelaaja.takautuva_val_pvm'))");
    expect(PEL).toContain("alert(t('pelaaja.takautuva_val_mita'))");
    expect(PEL).toContain("alert(t('pelaaja.takautuva_val_kesto'))");
    expect(PEL).not.toContain("alert('Valitse päivä')");
  });
  it('universaalit min-napit ennallaan (ei käännetty)', () => {
    ['15 min', '30 min', '60 min', '90+ min'].forEach((s) => expect(PEL).toContain('>' + s + '</button>'));
  });
});

describe('cache-bust', () => {
  it('tm_lang ?v>=6 (Pelaaja+Vanhempi) · SW tm-pelaaja >=v21', () => {
    expect(PEL).toMatch(/lib\/tm_lang\.js\?v=([6-9]|\d\d)/);
    expect(readFileSync(join(__dir, '..', 'TalentMaster_Vanhempi_v2.html'), 'utf8')).toMatch(/lib\/tm_lang\.js\?v=([6-9]|\d\d)/);
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toMatch(/tm-pelaaja-v(2[1-9]|[3-9]\d)/);
  });
});
