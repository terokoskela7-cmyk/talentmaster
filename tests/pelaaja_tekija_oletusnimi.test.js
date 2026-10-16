/* Tekijän oletusnimi (erä 60 -jatko): pikakortti tallentaa puuttuvan nimen nullina, pelaajakortti näyttää neutraalin
 * oletuksen KÄÄNNETTYNÄ (pelaaja.valmentaja → sv 'Tränare'). Vanhat dokumentit tekija_nimi === 'Valmentaja' käsitellään samoin
 * näytössä (ei datamigraatiota). Ajetaan sivun oikea funktio sandboxissa (testityngän nimi = tuotannon nimi). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANG = require('../lib/tm_lang.js');
const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const rivi = (alku) => { const i = src.indexOf(alku); return src.slice(i, src.indexOf('\n', i)); };

function nayta(kieli, arvo) {
  LANG.tmAsetaKieli(kieli, false);
  try {
    const T = (k) => LANG.t(k.indexOf('.') >= 0 ? k : 'pelaaja.' + k);
    // eslint-disable-next-line no-new-func
    return new Function('T', 'window', rivi('function _p7TekijaNimi(') + '\nreturn _p7TekijaNimi;')(T, { tmTekijaNimiNaytto: require('../lib/tm_tekija_nimi.js').tmTekijaNimiNaytto })(arvo);
  } finally { LANG.tmAsetaKieli('fi', false); }
}

describe('_p7TekijaNimi — neutraali oletus käännettynä', () => {
  it.each([[null], [undefined], [''], ['  '], ['Valmentaja']])('puuttuva/vanha oletus %j → sv Tränare', (v) => {
    expect(nayta('sv', v)).toBe('Tränare');
  });
  it('fi ja en: Valmentaja / Coach', () => {
    expect(nayta('fi', null)).toBe('Valmentaja');
    expect(nayta('en', 'Valmentaja')).toBe('Coach');
  });
  it('oikea nimi sellaisenaan; sähköposti ei koskaan', () => {
    expect(nayta('sv', 'Valle Valmentaja')).toBe('Valle Valmentaja');
    expect(nayta('sv', 'talentmasterid@gmail.com')).toBe('Tränare');
  });
});

describe('Pelaaja_v7 — kaikki tekijänimen näyttöpaikat reititetty', () => {
  it('ei paljasta raakaa tekija_nimi/tekija-arvoa ilman _p7TekijaNimi:ä', () => {
    expect(src).toContain('_p7TekijaNimi(d.tekija_nimi || d.valmentajaNimi)');
    expect(src).toContain('_p7TekijaNimi(h.tekija_nimi || h.valmentajaNimi)');
    expect(src).toContain('_mEscP(_p7TekijaNimi(r.tekija))');
    expect(src).not.toMatch(/h\.tekija_nimi \|\| h\.valmentajaNimi \|\| T\(/);
  });
});
