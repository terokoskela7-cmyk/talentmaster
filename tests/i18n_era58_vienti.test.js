/* sv-erä 58 (peliäly-tasokorjaus) — vienti (scripts/i18n_vie_sv_era58.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const P = lue('sv_kaannoserae_58_palautus.json'), G = lue('sv_kaannoserae_58_gemini.json');
const V = require('../scripts/i18n_vie_sv_era58.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const A = require('../lib/tm_adar_rubriikki.js'), TX = require('../lib/tm_adar_tekstit.js');
describe('sv-erä 58 — vienti', () => {
  it('palautus = lähetetty erä: samat 18 avainta, fi/huom muuttumattomat, sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(18);
  });
  it('koodin sv = palautus merkki merkiltä', () => { for (const o of Object.values(P)) for (const [k, r] of Object.entries(o.rivit)) expect(SV[k], k).toBe(r.sv); });
  it('jokaiselle kortin ÄLY-tekstille (nimet, nyt, askel, ylläpito, Seuraava taito) ja D/R-kuvauksille on sv', () => {
    const fi = ['Seuraava taito', A.YLLAPITO, ...Object.values(A.ASKEL)]; for (const x of Object.values(A.TASOT)) fi.push(x.nimi, x.nyt);
    for (const k of fi) expect(typeof SV[k], k).toBe('string');
    for (const k of ['adar_D_d1', 'adar_D_d2', 'adar_D_d3', 'adar_D_v1', 'adar_D_v3', 'adar_R_d1', 'adar_R_d2', 'adar_R_d3']) expect(typeof SV[k], k).toBe('string');
    expect(Object.keys(TX.FI).filter((k) => /^adar_[AD]|^adar_R_(d|v)/.test(k) && typeof SV[k] !== 'string')).toEqual([]);
  });
  it('sv-teksteissä ei sekuntirajoja eikä Duckworth-viitettä', () => { for (const o of Object.values(P)) for (const [k, r] of Object.entries(o.rivit)) expect(r.sv, k).not.toMatch(/\d+\s*(s\b|sek)/); });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
