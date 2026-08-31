/**
 * TalentMaster - i18n V1-B2: Vanhempi_v2 syvasisalto + nimen taivutus (jatko V1-B:lle #400).
 * Irrotus -> t('vanhempi.*'). Nimen taivutus poistettu: lahdetekstit nominatiivissa / ilman nimea (robusti, sv/en OK).
 * S7.22: anti-vertailu sailyy, ei tasolukuja/percentiileja/TKI-laskua vanhemmallekaan. fi ei rikkoudu (fallback).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const V = readFileSync(join(__dir, '..', 'TalentMaster_Vanhempi_v2.html'), 'utf8');

describe('tm_lang vanhempi.* laajennettu (V1-B2) sv/en taydelliset', () => {
  it('vanhempi laajeni (>=40 avainta) ja sv/en 0 puuttuvaa (deep vs fi)', () => {
    const fi = L.TM_LANG.fi.vanhempi;
    expect(Object.keys(fi).length).toBeGreaterThanOrEqual(40);
    const puuttuu = [];
    const walk = (a, b, pre) => Object.keys(a).forEach((k) => {
      const p = pre ? pre + '.' + k : k;
      if (typeof a[k] === 'string') { if (typeof (b && b[k]) !== 'string') puuttuu.push(p); }
      else if (a[k] && typeof a[k] === 'object') walk(a[k], b && b[k], p);
    });
    walk(fi, L.TM_LANG.sv.vanhempi, 'sv');
    walk(fi, L.TM_LANG.en.vanhempi, 'en');
    expect(puuttuu).toEqual([]);
  });
});

describe('V1-B2 nimen taivutus poistettu (nominatiivi-robusti)', () => {
  it('ei {gen}-taivutusjaanteita sv/en-vanhempi-avaimissa (fi saa kayttaa {gen}-placeholderia → _genetiivi replace, V4-B)', () => {
    const jaljet = [];
    // V4-B: fi kayttaa {gen}-placeholderia (koodi korvaa _genetiivi():lla); sv/en EI nimen taivutusta.
    ['sv', 'en'].forEach((l) => Object.entries(L.TM_LANG[l].vanhempi).forEach(([k, v]) => {
      if (typeof v === 'string' && /\{gen\}/.test(v)) jaljet.push(l + '.' + k);
    }));
    expect(jaljet).toEqual([]);
  });
  it('tervetulo_johdanto ilman nimea (lapsesi / ditt barns / your child); lista-avaimet ilman taivutusta', () => {
    expect(L.TM_LANG.fi.vanhempi.tervetulo_johdanto).toContain('lapsesi');
    expect(L.TM_LANG.sv.vanhempi.tervetulo_johdanto).toContain('ditt barns');
    ['tervetulo_kehu', 'tervetulo_kortti', 'tervetulo_viestit', 'tervetulo_kirjaa'].forEach((k) => {
      ['fi', 'sv', 'en'].forEach((l) => expect(typeof L.TM_LANG[l].vanhempi[k]).toBe('string'));
    });
  });
  it('koodi kayttaa t() lista-toimintoriveihin (ei nimi+lle-concatia)', () => {
    expect(V).toContain("t('vanhempi.tervetulo_kehu')");
    expect(V).toContain("t('vanhempi.tervetulo_kirjaa')");
    expect(V).toContain("t('vanhempi.tervetulo_johdanto')");   // ei { gen: gen }
    expect(V).not.toContain("(nimi + 'lle')");
    expect(V).not.toContain("'Kirjaa ' + gen + ' treeni'");
  });
});

describe('S7.22 vanhempi sv/en ei kiellettya kielta; anti-vertailu sailyy', () => {
  it('ei TKI/tasolukuja/percentiileja sv/en', () => {
    const osumat = [];
    ['sv', 'en'].forEach((l) => Object.values(L.TM_LANG[l].vanhempi).forEach((v) => {
      if (typeof v === 'string' && /\bTKI\b|\bT[1-5]\b|percentil/.test(v)) osumat.push(v.slice(0, 30));
    }));
    expect(osumat).toEqual([]);
  });
  it('anti-vertailu (ei kavereihin) sailyy sv/en', () => {
    expect(/kompisar/.test(L.TM_LANG.sv.vanhempi.kultainen_teksti)).toBe(true);
    expect(/friends/.test(L.TM_LANG.en.vanhempi.kultainen_teksti)).toBe(true);
  });
});

describe('V1-B2 cache-bust', () => {
  it('tm_lang ?v=3 + SW-cache v8', () => {
    expect(V).toMatch(/lib\/tm_lang\.js\?v=([3-9]|\d\d)/);   // >=3 (kestaa myohemmat bumpit, esim. V4-A3 -> v5)
    expect(readFileSync(join(__dir, '..', 'sw_vanhempi.js'), 'utf8')).toMatch(/const CACHE = 'tm-vanhempi-v([89]|\d\d)'/);   // >=v8
  });
});
