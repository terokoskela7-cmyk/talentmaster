/* sv-erä 73 (K2: Näyttö uudella sivulla) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = Geminin/Teron palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const O = 'lib.tm_naytto_lohkot';
const P = lue('sv_kaannoserae_73_palautus.json')[O].rivit, G = lue('sv_kaannoserae_73_gemini.json')[O].rivit;
const V = require('../scripts/i18n_vie_sv_era73.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, TX = require('../lib/tm_naytto_lohkot.js');
describe('sv-erä 73 — vienti', () => {
  it('palautus 5 riviä = lähetetty erä; fi = koodi; sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P).length).toBe(5);
    for (const [k, r] of Object.entries(P)) { expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(TX.FI[k]); expect(r.fi, k).toBe(G[k].fi); }
  });
  it('koodin sv = palautus merkki merkiltä; jokaiselle kn_-avaimelle on sv', () => {
    for (const [k, r] of Object.entries(P)) expect(SV[k], k).toBe(r.sv);
    expect(Object.keys(TX.FI).filter((k) => typeof SV[k] !== 'string')).toEqual([]);
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu.length).toBe(5); });
});
