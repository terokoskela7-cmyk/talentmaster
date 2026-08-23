/**
 * TalentMaster™ — i18n V0.5: suostumuslomakkeen sv/en-kytkentä + kielivalitsin (GDPR-kriittinen).
 * 25 suostumus.*-avainta fi/sv/en (docs/I18N_SUOSTUMUS_KAANNOKSET.md, LUONNOS sv/en → juristi vahvistaa).
 * Lomake kytketty t()-kutsuihin (data-i18n) + NÄKYVÄ kielivalitsin KAIKISSA seuroissa (seura=oletus, huoltaja ohittaa).
 * INVARIANTIT: sv/en 0 puuttuvaa avainta · fi ä/ö normalisoitu · chkConsent/showPrivacy koskematon · teal-only.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const REK = readFileSync(join(__dir, '..', 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');

const KEYS = ['info_otsikko', 'info_teksti', 'ryhma_pakolliset', 'ryhma_testaus', 'ryhma_jakaminen', 'badge_pakollinen', 'badge_vapaaehtoinen',
  'c1_otsikko', 'c1_teksti', 'c2_otsikko', 'c2_teksti_alku', 'c2_linkki', 'c2_teksti_loppu', 'c3_otsikko', 'c3_teksti', 'c4_otsikko', 'c4_teksti',
  'c5_otsikko', 'c5_teksti', 'c6_otsikko', 'c6_teksti', 'nappi_takaisin', 'nappi_vahvista', 'onnistui_otsikko', 'onnistui_teksti'];

describe('tm_lang suostumus.* — 25 avainta fi/sv/en (GDPR: sv/en täydellinen)', () => {
  ['fi', 'sv', 'en'].forEach((lang) => {
    it(`${lang}: kaikki 25 avainta ei-tyhjinä merkkijonoina`, () => {
      const puuttuu = KEYS.filter((k) => typeof L.TM_LANG[lang].suostumus[k] !== 'string' || !L.TM_LANG[lang].suostumus[k].trim());
      expect(puuttuu).toEqual([]);
    });
  });
  it('fi = normalisoitu ä/ö (info_otsikko, iän, käytännössä)', () => {
    expect(L.TM_LANG.fi.suostumus.info_otsikko).toBe('Mitä tämä tarkoittaa käytännössä?');
    expect(L.TM_LANG.fi.suostumus.c4_otsikko).toContain('iän');
  });
  it('t() palauttaa oikean kielen suostumustekstin', () => {
    L.tmAsetaKieli('sv', false); expect(L.t('suostumus.c1_otsikko')).toBe('Lagring av uppgifter i registret');
    L.tmAsetaKieli('en', false); expect(L.t('suostumus.badge_pakollinen')).toBe('REQUIRED');
    L.tmAsetaKieli('fi', false); expect(L.t('suostumus.nappi_vahvista')).toBe('Vahvista ja lähetä');
  });
});

describe('Rekisterointi — lomake kytketty t():hen (data-i18n) säilyttäen rakenteen', () => {
  it('info + ryhmät + c1–c6 + badget + napit + onnistui = data-i18n', () => {
    ['suostumus.info_otsikko', 'suostumus.info_teksti', 'suostumus.ryhma_pakolliset', 'suostumus.ryhma_testaus', 'suostumus.ryhma_jakaminen',
      'suostumus.badge_pakollinen', 'suostumus.badge_vapaaehtoinen', 'suostumus.c1_otsikko', 'suostumus.c1_teksti',
      'suostumus.c2_teksti_alku', 'suostumus.c2_linkki', 'suostumus.c2_teksti_loppu', 'suostumus.c3_otsikko', 'suostumus.c4_otsikko',
      'suostumus.c5_otsikko', 'suostumus.c6_otsikko', 'suostumus.nappi_takaisin', 'suostumus.nappi_vahvista',
      'suostumus.onnistui_otsikko', 'suostumus.onnistui_teksti'].forEach((k) => {
      expect(REK).toContain('data-i18n="' + k + '"');
    });
  });
  it('c2: showPrivacy-nappi säilyy (linkki keskellä), badge-luokat + checkbox-id:t ennallaan', () => {
    expect(REK).toContain('onclick="showPrivacy()" data-i18n="suostumus.c2_linkki"');
    expect(REK).toContain('class="req-b" data-i18n="suostumus.badge_pakollinen"');
    expect(REK).toContain('class="opt-b" data-i18n="suostumus.badge_vapaaehtoinen"');
    ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'].forEach((id) => expect(REK).toContain('id="' + id + '" onchange="chkConsent()"'));
  });
  it('chkConsent-logiikka koskematon (pakolliset c1+c2 → nappi)', () => {
    expect(REK).toContain('function chkConsent()');
  });
});

describe('Rekisterointi — NÄKYVÄ kielivalitsin (fi/sv/en) KAIKISSA seuroissa (GDPR-perusvaatimus)', () => {
  it('valitsin + 3 kieltä + _rekVaihdaKieli-kytkentä', () => {
    expect(REK).toContain('id="langSwitch"');
    ['fi', 'sv', 'en'].forEach((l) => expect(REK).toContain("data-lang=\"" + l + "\" onclick=\"_rekVaihdaKieli('" + l + "')\""));
  });
  it('huoltajan valinta persistoi (tmAsetaKieli tallenna=true) → ohittaa seura-oletuksen', () => {
    expect(REK).toContain('tmAsetaKieli(kieli, true)');
  });
  it('re-render-funktiot + kieli-init kutsuu _rekKaanna (lataus + async seura.kieli)', () => {
    expect(REK).toContain('function _rekKaanna()');
    expect(REK).toContain('function _rekPaivitaKieliValitsin()');
    expect(REK).toContain('_rekKaanna(); _rekPaivitaKieliValitsin();');
  });
  it('valitsin teal-aksentti, EI kiellettyä väriä (§5)', () => {
    // langSwitch-lohko käyttää vain var(--teal)/#28B090/#fff/transparent
    const blk = REK.slice(REK.indexOf('id="langSwitch"'), REK.indexOf('id="langSwitch"') + 900);
    expect(blk).toContain('var(--teal,#28B090)');
    expect(/#3EC9A7|#4A7ED9|#c060a8/i.test(blk)).toBe(false);
  });
});
