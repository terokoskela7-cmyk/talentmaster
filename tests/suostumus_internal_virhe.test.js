/**
 * TalentMaster™ — regressio: "Tallennus epäonnistui: internal" suostumuslomakkeella (Sibbo, Axel Eklund 2026-09).
 *
 * JUURISYY: vahvistaSuostumus-CF:n käsittelemätön poikkeus (pelaajadokumentin luku, PIN-uniikkiuskysely,
 * kylmäkäynnistys) palautui callable-protokollan kautta selaimeen paljaana "internal"-merkkijonona.
 * Suostumus jäi tallentumatta EIKÄ virheestä jäänyt jälkeä lokiin, auditiin eikä Sentryyn → operaattori
 * näki vain "kutsu lähetetty, ei rekisteröity".
 *
 * INVARIANTIT (tämä testi lukitsee):
 *  1. CF: jokainen ei-HttpsError kääntyy luettavaksi HttpsError-viestiksi + audit-hälytykseksi (severity 'alert').
 *  2. CF: PIN-generointi ei saa kaataa suostumusta (suostumus > PIN).
 *  3. Lomake: yksi automaattinen uudelleenyritys ohimenevälle virheelle + pysyvä virhelaatikko + Sentry-capture.
 *  4. i18n: virheteksti fi/sv/en (Sibbo = sv).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const CF = readFileSync(join(__dir, '..', 'functions', 'index.js'), 'utf8');
const REK = readFileSync(join(__dir, '..', 'TalentMaster_Rekisterointi_Suostumus.html'), 'utf8');

describe('vahvistaSuostumus — käsittelemättömien virheiden vartija', () => {
  it('onCall-kuori delegoi toteutukselle ja nappaa poikkeukset', () => {
    expect(CF).toContain('return await _vahvistaSuostumusImpl(data, context);');
    expect(CF).toContain('async function _vahvistaSuostumusImpl(data, context)');
  });
  it('HttpsError menee läpi sellaisenaan (ei peity internaliksi)', () => {
    expect(CF).toContain('if (e instanceof functions.https.HttpsError) throw e;');
  });
  it('tuntematon virhe → luettava viesti, EI paljasta "internal"-koodia', () => {
    expect(CF).toContain("'Suostumuksen tallennus epäonnistui palvelimella: ' + viesti");
  });
  it('tuntematon virhe kirjataan audit-hälytykseksi (Admin → Audit-loki)', () => {
    expect(CF).toContain("toiminto:  'suostumus_epaonnistui', severity: 'alert'");
    // odotettava valmiiksi — fire-and-forget katkeaisi kun funktio heittää heti perään
    expect(CF).toMatch(/await db\.collection\('audit'\)\.add\(\{\s*\n\s*toiminto:\s+'suostumus_epaonnistui'/);
  });
  it('virhe päätyy myös funktion lokiin stackin kanssa', () => {
    expect(CF).toContain("console.error('[vahvistaSuostumus] KÄSITTELEMÄTÖN VIRHE:'");
  });
});

describe('vahvistaSuostumus — PIN ei saa kaataa suostumusta', () => {
  it('PIN-uniikkiuskysely on try/catchissa ja jatkaa ilman PINiä', () => {
    const lohko = CF.slice(CF.indexOf('// PIN — 4-numeroinen'), CF.indexOf('await pelRef.update(paivitys)'));
    expect(lohko).toContain('try {');
    expect(lohko).toContain("console.warn('[vahvistaSuostumus] PIN-generointi epäonnistui");
    expect(lohko).toContain('pin = null;');
  });
});

describe('Rekisterointi_Suostumus — huoltajalle näkyvä virhepolku', () => {
  it('ohimenevä palvelinvirhe yritetään kerran uudelleen (CF idempotentti)', () => {
    expect(REK).toContain('function _vahvistaUudelleenyrityksella(hyoty)');
    expect(REK).toContain('tallennusPromise = _vahvistaUudelleenyrityksella({');
  });
  it('vain ohimenevät koodit uusitaan — pysyvät heitetään eteenpäin', () => {
    expect(REK).toContain("koodi === 'internal' || koodi === 'functions/internal'");
    expect(REK).toContain('if (!ohimeneva) throw err;');
  });
  it('virhe raportoidaan Sentryyn', () => {
    expect(REK).toContain("tags: { vaihe: 'suostumus_tallennus'");
  });
  it('pysyvä virhelaatikko (toast katoaa 2,8 s:ssa)', () => {
    expect(REK).toContain('id="tallennusVirhe"');
    expect(REK).toContain("vBox.style.display = 'block';");
  });
  it('EI enää paljasta callable-koodia ainoana viestinä', () => {
    expect(REK).not.toContain("toast('Tallennus epaonnistui: ' + err.message, true);");
  });
});

describe('i18n — virheteksti fi/sv/en (Sibbo = sv)', () => {
  ['fi', 'sv', 'en'].forEach((lang) => {
    it(`${lang}: virhe_palvelin/virhe_lyhyt/virhe_yleinen ei-tyhjinä`, () => {
      const s = L.TM_LANG[lang].suostumus;
      ['virhe_palvelin', 'virhe_lyhyt', 'virhe_yleinen'].forEach((k) => {
        expect(typeof s[k]).toBe('string');
        expect(s[k].trim().length).toBeGreaterThan(0);
      });
    });
  });
  it('virhe_palvelin sisältää {koodi}-paikanpitäjän kaikilla kielillä', () => {
    ['fi', 'sv', 'en'].forEach((lang) => {
      expect(L.TM_LANG[lang].suostumus.virhe_palvelin).toContain('{koodi}');
    });
  });
  it('t() interpoloi virhekoodin', () => {
    L.tmAsetaKieli('sv', false);
    expect(L.t('suostumus.virhe_palvelin', { koodi: 'internal' })).toContain('internal');
    L.tmAsetaKieli('fi', false);
  });
});
