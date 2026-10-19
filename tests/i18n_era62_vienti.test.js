/* sv-erä 62 (Pikakortti yhdelle näytölle) — vienti (scripts/i18n_vie_sv_era62.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const P = lue('sv_kaannoserae_62_palautus.json'), G = lue('sv_kaannoserae_62_gemini.json');
const V = require('../scripts/i18n_vie_sv_era62.cjs'), HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv;
const KOHDE = { henkilosto_kartta: HE };
describe('sv-erä 62 — vienti', () => {
  it('palautus = lähetetty erä: samat 11 avainta, fi muuttumaton, sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort(), o).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(11);
  });
  it('koodin sv = palautus merkki merkiltä (henkilöstökartta)', () => { for (const [o, os] of Object.entries(P)) for (const [k, r] of Object.entries(os.rivit)) expect(KOHDE[o][k], o + ' ' + k).toBe(r.sv); });
  it('paikkamerkit säilyvät ({n}, {nimi}) ja parametrit ovat tmHT-avaimia sivulla', () => {
    const SIVU = readFileSync(new URL('../TalentMaster_ADAR_Pikakortti.html', import.meta.url), 'utf8');
    for (const [k, r] of Object.entries(P.henkilosto_kartta.rivit)) { expect(r.sv.match(/\{[a-z]+\}/g) || [], k).toEqual(k.match(/\{[a-z]+\}/g) || []); if (!['Pelaaja näkee', 'Näytä pelaajalle'].includes(k)) expect(SIVU, k).toContain("tmHT('" + k + "')"); }   // 0b: vanha kytkin vaihtui lib/tm_nakyvyys_kytkin.js:ään
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
