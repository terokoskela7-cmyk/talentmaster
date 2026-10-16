/* sv-erä 61 (Peliäly: pelitilanne) — vienti (scripts/i18n_vie_sv_era61.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const P = lue('sv_kaannoserae_61_palautus.json'), G = lue('sv_kaannoserae_61_gemini.json');
const V = require('../scripts/i18n_vie_sv_era61.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, TX = require('../lib/tm_adar_tekstit.js');
describe('sv-erä 61 — vienti', () => {
  it('palautus = lähetetty erä: samat 32 avainta, fi muuttumaton, sv täytetty, paikkamerkit säilyvät', () => {
    const o = 'lib.tm_adar_tekstit'; expect(Object.keys(P)).toEqual([o]);
    expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort());
    for (const [k, r] of Object.entries(P[o].rivit)) {
      expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(r.fi, k).toBe(TX.FI[k]); expect(r.sv.trim(), k).not.toBe('');
      expect((r.fi.match(/\{n\}/g) || []).length, k).toBe((r.sv.match(/\{n\}/g) || []).length);
    }
    expect(Object.keys(P[o].rivit).length).toBe(32);
  });
  it('koodin sv = palautus merkki merkiltä; jokaiselle uudelle FI-avaimelle on sv', () => {
    for (const [k, r] of Object.entries(P['lib.tm_adar_tekstit'].rivit)) expect(SV[k], k).toBe(r.sv);
    expect(Object.keys(TX.FI).filter((k) => /^adar_(pt|luot|jak)_/.test(k) && typeof SV[k] !== 'string')).toEqual([]);
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
