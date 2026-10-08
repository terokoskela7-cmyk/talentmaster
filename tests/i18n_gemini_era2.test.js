/* Gemini-erä 2 (docs/i18n/sv_kaannoserae_2.json) on ELÄVÄ: kattaa jokaisen sv-odotuslistan avaimen (fi/en tm_lang.js:stä) — uusi odotuslistan rivi ilman
 * pohjan päivitystä (node scripts/i18n_luo_gemini_era.cjs) kaatuu tähän, jotta yksikään uusi avain ei jää Geminiltä pyytämättä (takaraja 20.10.2026).
 * Code EI kirjoita ruotsia: sv-kentät ovat tyhjiä kunnes Gemini täyttää; täytetyt rivit säilyvät ajossa. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ERA = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_2.json'), 'utf8'));
const L = require('../lib/tm_lang.js').TM_LANG;
const ODOTTAA = require('./tm_lang_sv_odotuslista.cjs');
const hae = (kieli, polku) => polku.split('.').reduce((o, k) => (o == null ? undefined : o[k]), L[kieli]);
const rivit = ERA.osiot.tm_lang.rivit;

describe('Gemini-erä 2 — tm_lang-osio', () => {
  it('jokainen sv-odotuslistan avain on erässä, fi/en täsmäävät tm_lang.js:ään', () => {
    const puuttuu = ODOTTAA.filter((p) => !rivit[p]);
    expect(puuttuu, 'aja: node scripts/i18n_luo_gemini_era.cjs').toEqual([]);
    const eroaa = ODOTTAA.filter((p) => rivit[p].fi !== hae('fi', p) || rivit[p].en !== hae('en', p));
    expect(eroaa, 'fi/en muuttui — aja: node scripts/i18n_luo_gemini_era.cjs').toEqual([]);
  });
  it('erässä ei vanhentuneita rivejä: rivi joka ei ole odotuslistalla on täytetty (sv saapui)', () => {
    const vanhentuneet = Object.keys(rivit).filter((p) => !ODOTTAA.includes(p) && !rivit[p].sv);
    expect(vanhentuneet).toEqual([]);
  });
  it('sv-kentät ovat merkkijonoja; Code ei ole täyttänyt ruotsia (tyhjä tai Geminin tuoma)', () => {
    Object.values(rivit).forEach((r) => expect(typeof r.sv).toBe('string'));
  });
  it('ADAR-nimikanoni (lib) mukana ja kattaa tmAdarNimet:n avaimet', () => {
    const lib = ERA.osiot.lib_adar_nimet.rivit;
    ['pelaaja', 'valmentaja'].forEach((r) => ['a', 'd', 'ac', 'r'].forEach((k) => expect(lib['adar_nimi_' + r + '_' + k], r + k).toBeTruthy()));
    const N = require('../lib/tm_pelialy_yksilo.js').TM_ADAR_NIMET;
    ['pelaaja', 'valmentaja'].forEach((r) => ['a', 'd', 'ac', 'r'].forEach((k) => expect(lib['adar_nimi_' + r + '_' + k].fi).toBe(N[r][k])));
  });
  it('muuttujat {…} ja HTML-tagit säilyvät fi → en (sama joukko)', () => {
    const joukko = (s) => (s.match(/\{[A-Za-z0-9_]+\}|<\/?[a-z]+>/g) || []).sort().join('|');
    const rikki = Object.entries(rivit).filter(([, r]) => joukko(r.fi) !== joukko(r.en)).map(([p]) => p);
    expect(rikki).toEqual([]);
  });
});

describe('Gemini-erä 2 — lib.rubriikit (kortin tasokuvaukset)', () => {
  const A = require('../lib/tm_adar_rubriikki.js'), K = require('../lib/tm_kortti_rubriikit.js');
  const rub = ERA.osiot['lib.rubriikit'].rivit;
  it('jokainen kirjaston palauttama tekstikenttä (nyt/askel/vahvuus) on erässä avaimena fi-tekstinä', () => {
    const kaikki = [];
    for (let t = 1; t <= 5; t++) [A.alyTaso(t), K.fysTaso(t), K.psyTaso(t, null)].forEach((r) => kaikki.push(r.nyt, r.askel));
    ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'].forEach((k) => kaikki.push(K.psyTaso(1, { [k]: 3 }).vahvuus));
    const puuttuu = kaikki.filter((fi) => !rub[fi]);
    expect(puuttuu, 'aja: node scripts/i18n_luo_gemini_era.cjs').toEqual([]);
    Object.entries(rub).forEach(([avain, r]) => expect(r.fi).toBe(avain));
  });
  it('Pelaaja_v7 reitittää nämä tekstit _p7RubT:n kautta (ei suoraan r.nyt / r.askel / r.vahvuus)', () => {
    const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
    const a = src.indexOf("if (d.key === 'ÄLY' && window.TM_ADAR_RUBRIIKKI)");
    const seg = src.slice(a, src.indexOf('\n  };', a));
    expect(seg).toMatch(/_p7RubT\(r\.nyt\)/); expect(seg).toMatch(/_p7RubT\(r\.askel\)/); expect(seg).toMatch(/_p7RubT\(r\.vahvuus\)/);
    expect(seg.replace(/_p7RubT\(r\.(nyt|askel|vahvuus)\)/g, '')).not.toMatch(/\+ r\.(nyt|askel|vahvuus)\b/);
  });
  it('_p7RubT: sv-rivi → sv; ei riviä / ei tmLibT:tä → teksti ennallaan', () => {
    const src = readFileSync(join(juuri, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
    const f = src.slice(src.indexOf('function _p7RubT('), src.indexOf('\n', src.indexOf('function _p7RubT(')));
    const aja = (win) => new Function('window', f + '\nreturn _p7RubT;')(win);
    expect(aja({ tmLibT: (s) => (s === 'x' ? 'Y' : undefined) })('x')).toBe('Y');
    expect(aja({ tmLibT: () => undefined })('x')).toBe('x');
    expect(aja({})('x')).toBe('x');
  });
});

describe('Gemini-erä 2 — lib.tm_kentta', () => {
  it('Kenttä-komponentin t(\'…\')-avaimet ja OSA_TILA-sanat ovat erässä', () => {
    const src = readFileSync(join(juuri, 'lib/tm_kentta.js'), 'utf8');
    const rivit2 = ERA.osiot['lib.tm_kentta'].rivit;
    const avaimet = new Set([...src.matchAll(/\bt\('([^']+)'\)/g)].map((m) => m[1]));
    const ot = src.match(/var OSA_TILA = \{([^}]*)\}/); [...ot[1].matchAll(/:\s*'([^']+)'/g)].forEach((m) => avaimet.add(m[1]));
    ['ydinvahvuus', 'sinun vahvuutesi'].forEach((k) => { expect(src).toContain("'" + k + "'"); avaimet.add(k); });   // ternary-avaimet
    expect([...avaimet].filter((k) => !rivit2[k])).toEqual([]);
  });
});
