/* sv-erä 81 (K4a2) — lähetystiedosto PM:lle: fi = koodi, sv tyhjä (Code ei kirjoita ruotsia, §0), muuttuneilla vanha sv viitteeksi (sv_nyt). Vienti tehdään kun PM:n palautus saapuu. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const G = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_81_gemini.json', import.meta.url), 'utf8')).osiot['lib.tm_todistekortit'].rivit;
const FI = require('../lib/tm_todistekortit_fi.js'), T = require('../scripts/i18n_era81_tuki.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, FX = require('./fixtures/k4a2_fi_muutokset.json');
describe('sv-erä 81 — lähetystiedosto', () => {
  it('35 riviä = uudet 16 + muuttuneet 19; fi = koodi; sv tyhjä; paikkamerkit tallella', () => {
    expect(Object.keys(G).sort()).toEqual(T.era81Odottaa()); expect(Object.keys(G)).toHaveLength(35);
    for (const [k, r] of Object.entries(G)) { expect(r.fi, k).toBe(FI[k]); expect(r.sv, k).toBe(''); expect(r.huom.length, k).toBeGreaterThan(10); }
    expect(Object.values(G).filter((r) => r.sv_nyt).length).toBe(19);
  });
  it('koodin sv-kartassa ei ole odottavia eikä poistuneita avaimia (vanha sv poistettu, ei vanhentunutta ruotsia näkyviin)', () => {
    T.era81Odottaa().concat(Object.keys(FX.poistettu)).forEach((k) => expect(SV[k], k).toBeUndefined());
  });
});
