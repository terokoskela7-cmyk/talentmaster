/* sv-erä 59 (Pikakortti design + pelaajakortin unelma) — vienti (scripts/i18n_vie_sv_era59.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const P = lue('sv_kaannoserae_59_palautus.json'), G = lue('sv_kaannoserae_59_gemini.json');
const V = require('../scripts/i18n_vie_sv_era59.cjs'), LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const KOHDE = { henkilosto_kartta: HE, 'lib.pelaajakortti_unelma': LIB };
describe('sv-erä 59 — vienti', () => {
  it('palautus = lähetetty erä: samat 13 avainta, fi muuttumaton, sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(13);
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta + lib-kartta)', () => { for (const [o, os] of Object.entries(P)) for (const [k, r] of Object.entries(os.rivit)) expect(KOHDE[o][k], o + ' ' + k).toBe(r.sv); });
  it('hahmonimet Maestro/Shadowstep/Railgun/Titan eivät saa sv-riviä (ennallaan)', () => { for (const n of ['Maestro', 'Shadowstep', 'Railgun', 'Titan']) expect(LIB[n], n).toBeUndefined(); });
  it('unelma-rivin esimerkki: Avslutare — Målskytte', () => { expect(LIB.Viimeistelijä).toBe('Avslutare'); expect(LIB.Maalinteko).toBe('Målskytte'); expect(HE['Harjoitusvinkki:']).toBe('Träningstips:'); });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
