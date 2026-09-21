/**
 * i18n vaihe 2 · sanktioitu sv-erä + 5 lukittua käännöspäätöstä.
 *
 * TAUSTA: #603 purki markupin käännösavaimista ja LIPUTTI 8 avainta, joissa sama
 * suomi oli kartassa kahdella eri sanktioidulla ruotsinnoksella. Skripti ei saanut
 * valita puolesta — kääntäjä (Kim/Gemini) päätti. Tämä portti pitää päätökset voimassa.
 *
 * MIKSI PORTTI: päätökset ovat pelkkiä merkkijonoarvoja kartassa. Mikään ei estä
 * seuraavaa käännöserää palauttamasta vanhaa muotoa — se ei kaada mitään, vaan
 * vaihtaa hiljaa näkyvän ruotsin Sibbon pilotissa.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const vaadi = createRequire(import.meta.url);
const SV = vaadi(join(juuri, 'lib/tm_vp_i18n.js')).TM_VP_I18N.sv;
const CM = vaadi(join(juuri, 'lib/tm_i18n_common.js')).TM_I18N_COMMON.sv;
const MUISTI = JSON.parse(readFileSync(join(juuri, 'docs/VP_SV_KAANNOSMUISTI.json'), 'utf8'));

/** Sana omana sanana (ei osana yhdyssanaa): 'Ungdom' ei osu 'Ungdomsfotboll':iin. */
const sanana = (s) => new RegExp('(^|[^A-Za-zÅÄÖåäö])' + s + '([^A-Za-zÅÄÖåäö]|$)');

/* Lukitut päätökset: vanha muoto → sanktioitu. Vanhaa ei saa esiintyä kummassakaan
   kartassa; uuden on oltava käytössä. */
const LUKITUT = [
  { fi: 'Mitattu', vanha: 'Mätt', uusi: 'Uppmätt' },
  { fi: 'Viim. kirjaus', vanha: 'Senaste anteckning', uusi: 'Senaste registrering' },
  { fi: 'Lapsuus', vanha: 'Barndom', uusi: 'Barnfotboll' },
  { fi: 'Nuoruus', vanha: 'Ungdom', uusi: 'Ungdomsfotboll' },
  { fi: '✓ Tulossa', vanha: '✓ Kommer', uusi: '✓ Kommer snart' },
];

describe('i18n vaihe 2 · lukitut sv-päätökset', () => {
  it('EI VACUOUS: kartat ovat ladattu ja isot', () => {
    expect(Object.keys(SV).length, 'VP-sivukartta tyhjä → portti ei mittaa mitään').toBeGreaterThan(2000);
    expect(Object.keys(MUISTI).length, 'käännösmuisti tyhjä').toBeGreaterThan(1000);
  });

  it('5 päätöstä voimassa — avainkohtaisesti', () => {
    for (const L of LUKITUT) {
      expect(SV[L.fi], 'lukittu päätös purettu avaimelta ' + JSON.stringify(L.fi)).toBe(L.uusi);
    }
  });

  it('vanhaa muotoa ei esiinny MISSÄÄN kummassakaan kartassa', () => {
    /* Päätös koskee kaikkia esiintymiä, myös markup-arvojen sisällä olevia
       pudotusvalikon labeleita (Barndom/Ungdom esiintyivät <option>-arvossa). */
    for (const L of LUKITUT) {
      if (L.vanha.startsWith('✓')) continue;              // kts. erillinen väite alla
      for (const [nimi, kartta] of [['lib', SV], ['käännösmuisti', MUISTI]]) {
        const osumat = Object.entries(kartta)
          .filter(([, v]) => typeof v === 'string' && sanana(L.vanha).test(v))
          .map(([k]) => k.slice(0, 60));
        expect(osumat, nimi + ': vanha muoto ' + JSON.stringify(L.vanha) + ' palasi').toEqual([]);
      }
    }
  });

  it('KOMMER: vain UI-tila muuttui — verbi ja jo-oikea arvo koskematta', () => {
    /* 'Kommer' on ruotsissa myös VERBI. Sokea korvaus olisi tuottanut
       "Kommer snart spelaren undan…" eli rikkinäistä kieltä. */
    const verbi = SV['Pääseekö karkuun ja saa kiinni — puhdas huippunopeus.'];
    expect(verbi, 'verbilause puuttuu → portti ei mittaa mitään').toBeTruthy();
    expect(verbi, 'verbi korvattiin UI-tilana').toMatch(/^Kommer spelaren undan/);
    /* Arvo joka oli jo oikein ei saa kertaantua. */
    expect(SV['Tulossa'], 'korvaus kertaantui').toBe('Kommer snart');
    expect(SV['Tulossa']).not.toContain('snart snart');
  });

  it('OSA 3: kartta oli jo oikein — erän ehdotus hylätty', () => {
    /* Käännöserä ehdotti näihin muutosta; kartta oli jo oikein → hylätty.
       Ilman porttia seuraava erä ajaisi ne läpi huomaamatta. */
    const arvot = Object.values(SV).join('\u0000');
    expect(arvot, 'Fotbollförbundet korvattiin erän ehdotuksella').toContain('Fotbollförbundet');
    expect(arvot, 'Öppna spelarkortet korvattiin').toContain('Öppna spelarkortet');
    expect(arvot, 'Auditberedskap korvattiin').toContain('Auditberedskap');
  });

  it('YHTEISKARTTA voittaa: erän yleissanoja ei duplikoitu sivukarttaan', () => {
    /* Erässä oli 3 avainta jotka ovat jo TM_I18N_COMMONissa samalla arvolla.
       Sivukarttaan lisättynä ne rikkoisivat dedupe-vartijan (i18n_common.test.js). */
    for (const k of ['Valmentaja', 'Joukkue', 'Kaikki']) {
      expect(CM[k], 'yhteiskartasta katosi ' + k).toBeTruthy();
      expect(SV[k], 'yleissana duplikoitu sivukarttaan: ' + k).toBeUndefined();
    }
  });

  it('ERÄ on kytketty (ei vacuous) — näyte sanktioituja arvoja', () => {
    /* Näyte erästä: jos kytkentä perutaan, nämä katoavat. */
    const nayte = {
      '✅ Poikkeuslupa': '✅ Dispens',
      'Kattavuus:': 'Täckning:',
    };
    for (const [fi, sv] of Object.entries(nayte)) {
      expect(SV[fi], 'sanktioitu käännös puuttuu avaimelta ' + JSON.stringify(fi)).toBe(sv);
    }
  });
});
