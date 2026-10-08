/* ADAR-nimikanoni käännettynä (sv-läpiajo PR 2): tmAdarNimet(rooli, tr) + Pelaaja_v7 rAdar. Perheet näkevät nämä nimet (Pelaaja: pelaaja-kanoni).
 * Sopimus: puuttuva käännös → suomen oletus (TM_ADAR_NIMET) ennallaan; fi-tulos tavutarkasti sama kuin ennen; sv tulee jaetusta libikartasta (Gemini-erä), en tm_lang:ista. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { PEL_APU } from './helpers/pelaaja_t.mjs';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const L = require('../lib/tm_pelialy_yksilo.js');
const LANG = require('../lib/tm_lang.js');
const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');

describe('tmAdarNimet — lib', () => {
  it('ilman kääntäjää / kääntäjä palauttaa avaimen → suomen nimikanoni sellaisenaan', () => {
    expect(L.tmAdarNimet('pelaaja')).toEqual(L.TM_ADAR_NIMET.pelaaja);
    expect(L.tmAdarNimet('valmentaja', (k) => k)).toEqual(L.TM_ADAR_NIMET.valmentaja);
    expect(L.tmAdarNimet('tuntematon-rooli')).toEqual(L.TM_ADAR_NIMET.valmentaja);
  });
  it('kääntäjä kutsutaan avaimella adar_nimi_<rooli>_<ulottuvuus>; käännetyt nimet käytössä, puuttuvat → fi', () => {
    const kutsut = [];
    const n = L.tmAdarNimet('pelaaja', (k) => { kutsut.push(k); return k === 'adar_nimi_pelaaja_a' ? 'Observation' : k; });
    expect(kutsut).toEqual(['adar_nimi_pelaaja_a', 'adar_nimi_pelaaja_d', 'adar_nimi_pelaaja_ac', 'adar_nimi_pelaaja_r']);
    expect(n).toEqual({ a: 'Observation', d: 'Päätöksenteko', ac: 'Toteutus', r: 'Palautuminen' });
  });
  it('kääntäjän heitto tai raaka tm_lang-polku ei vuoda näkyviin', () => {
    expect(L.tmAdarNimet('pelaaja', () => { throw new Error('x'); })).toEqual(L.TM_ADAR_NIMET.pelaaja);
    expect(L.tmAdarNimet('pelaaja', (k) => 'pelaaja.' + k)).toEqual(L.TM_ADAR_NIMET.pelaaja);
  });
  it('valmentaja-kanoni käyttää omia avaimia (VP/Master/pikakortti PR 3–4)', () => {
    const kutsut = []; L.tmAdarNimet('valmentaja', (k) => { kutsut.push(k); return k; });
    expect(kutsut).toEqual(['adar_nimi_valmentaja_a', 'adar_nimi_valmentaja_d', 'adar_nimi_valmentaja_ac', 'adar_nimi_valmentaja_r']);
  });
});

describe('Pelaaja_v7 rAdar — nimet kielen mukaan', () => {
  function ajaRAdar(kieli) {
    const i = src.indexOf('function rAdar() {'); let d = 0, runko = '';
    for (let j = src.indexOf('{', i); j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) { runko = src.slice(i, j + 1); break; } } }
    const k1 = src.indexOf('function _p7K1T('); const k1runko = src.slice(k1, src.indexOf('\n', k1));
    LANG.tmAsetaKieli(kieli, false);
    const store = {
      ...PEL_APU, t: LANG.t, window: {}, _pelaaja: { ika: 17, adar_viimeisin: { a: 3, d: 2, ac: 2, r: 1 } }, console, Math, Number, String, Object, Array, Date, isNaN,
      tmAdarBand: L.tmAdarBand, tmAdarYht: L.tmAdarYht, tmAdarBonusOsat: L.tmAdarBonusOsat, tmAdarIkaPorras: L.tmAdarIkaPorras, tmAdarNimet: L.tmAdarNimet,
      TM_ADAR_PORTAAT: L.TM_ADAR_PORTAAT, TM_ADAR_NIMET: L.TM_ADAR_NIMET,
    };
    const ymp = new Proxy(store, { has: (t2, k) => (k in t2) || !(k in globalThis), get: (t2, k) => (k === Symbol.unscopables ? undefined : (k in t2 ? t2[k] : undefined)), set: (t2, k, v) => { t2[k] = v; return true; } });
    try { // eslint-disable-next-line no-new-func
      return new Function('__ymp', 'with(__ymp){' + k1runko + '\n' + runko + '\nreturn rAdar();}')(ymp);
    } finally { LANG.tmAsetaKieli('fi', false); }
  }
  it('fi: suomalaiset nimet kuten ennen', () => {
    const h = ajaRAdar('fi');
    ['Havainnointi', 'Päätöksenteko', 'Toteutus', 'Palautuminen'].forEach((n) => expect(h).toContain(n));
  });
  it('en: englanninkieliset nimet (tm_lang pelaaja.adar_nimi_pelaaja_*), ei suomalaisia ulottuvuusnimiä', () => {
    const h = ajaRAdar('en');
    ['Observation', 'Decision-making', 'Execution', 'Recovery'].forEach((n) => expect(h).toContain(n));
    ['Havainnointi', 'Päätöksenteko', 'Toteutus', 'Palautuminen'].forEach((n) => expect(h).not.toContain('>' + n + '<'));
  });
});
