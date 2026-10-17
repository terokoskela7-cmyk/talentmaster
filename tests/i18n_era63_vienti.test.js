/* sv-erä 63 (Pikakortti luonnosbannerit) — vienti (scripts/i18n_vie_sv_era63.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const P = lue('sv_kaannoserae_63_palautus.json'), G = lue('sv_kaannoserae_63_gemini.json');
const V = require('../scripts/i18n_vie_sv_era63.cjs'), HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const KOHDE = { henkilosto_kartta: HE };
describe('sv-erä 63 — vienti', () => {
  it('palautus = lähetetty erä: samat 4 avainta, fi muuttumaton, sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(4);
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta)', () => { for (const [o, os] of Object.entries(P)) for (const [k, r] of Object.entries(os.rivit)) expect(KOHDE[o][k], o + ' ' + k).toBe(r.sv); });
  it('paikkamerkit säilyvät ({n}, {nimi}) ja parametrit ovat tmHT-avaimia sivulla', () => {
    const SIVU = readFileSync(new URL('../TalentMaster_ADAR_Pikakortti.html', import.meta.url), 'utf8');
    for (const [k, r] of Object.entries(P.henkilosto_kartta.rivit)) { expect(r.sv.match(/\{[a-z]+\}/g) || [], k).toEqual(k.match(/\{[a-z]+\}/g) || []); expect(SIVU, k).toContain("tmHT('" + k + "')"); }
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
