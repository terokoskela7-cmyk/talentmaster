/* sv-erä 83 (K4c: Kaikki mittaukset) — lähetystiedosto PM:lle. Code ei kirjoita ruotsia (CLAUDE.md §0): sv-arvot ovat tyhjiä kunnes PM palauttaa; avaimet odottavat (LIB_SV_ODOTTAA, ODOTTAVAT_ERAT). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const J = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_83_gemini.json', import.meta.url), 'utf8')), R = J.osiot['lib.tm_mittaukset'].rivit;
const FI = require('../lib/tm_mittaukset_fi.js'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, KATTAVUUS = readFileSync(new URL('../tools/i18n/sv_kattavuus.mjs', import.meta.url), 'utf8');
describe('sv-erä 83 — lähetystiedosto', () => {
  it('rivit = tm_mittaukset_fi.js:n avaimet joille ei ole sv:tä (59); fi = koodi; sv tyhjä; huomautus jokaisella', () => {
    const odotettu = Object.keys(FI).filter((k) => !(k in SV)).sort(); expect(Object.keys(R).sort()).toEqual(odotettu); expect(odotettu).toHaveLength(59);
    for (const [k, r] of Object.entries(R)) { expect(r.fi, k).toBe(FI[k]); expect(r.sv, k).toBe(''); expect(String(r.huom).length, k).toBeGreaterThan(15); expect(k, k).toMatch(/^mk_/); }
  });
  it('paikanvaraajat mainitaan huomautuksessa (kääntäjä säilyttää ne)', () => { for (const [k, r] of Object.entries(R)) for (const m of r.fi.match(/\{\w+\}/g) || []) expect(r.huom, k + ' ' + m).toContain(m); });
  it('K4a:n ja K2:n jo käännetyt avaimet eivät ole erässä; erä 83 on odottavien listalla; ei ruotsia koodissa (mk_* puuttuu sv-kartasta)', () => {
    expect(Object.keys(R).filter((k) => /^(tc_|kn_)/.test(k))).toEqual([]); expect(KATTAVUUS).toMatch(/ODOTTAVAT_ERAT = \[[^\]]*\b83\b/);
    expect(Object.keys(SV).filter((k) => /^mk_/.test(k))).toEqual([]);
  });
});
