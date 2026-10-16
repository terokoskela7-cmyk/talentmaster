/* sv-erä 60 (Pikakortin sv-tilan viimeiset tekstit) — vienti (scripts/i18n_vie_sv_era60.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const P = lue('sv_kaannoserae_60_palautus.json'), G = lue('sv_kaannoserae_60_gemini.json');
const V = require('../scripts/i18n_vie_sv_era60.cjs'), HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const KOHDE = { henkilosto_kartta: HE };
describe('sv-erä 60 — vienti', () => {
  it('palautus = lähetetty erä: samat 10 avainta, fi muuttumaton, sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(10);
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta)', () => { for (const [o, os] of Object.entries(P)) for (const [k, r] of Object.entries(os.rivit)) expect(KOHDE[o][k], o + ' ' + k).toBe(r.sv); });
  it('laskuri on parametroitu ja korjattu: valda: {n} (ei «{n} valda»)', () => { expect(HE['{n} valittu']).toBe('valda: {n}'); expect(HE['Porras {n} / 4']).toBe('Steg {n} / 4'); for (const [k, v] of Object.entries(HE)) if (k.includes('{n}')) expect(v, k).toContain('{n}'); });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
