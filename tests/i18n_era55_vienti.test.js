/* sv-erä 55 (Sibbo 1.11. suostumuslomake vaihe 1, staattinen markup) — vienti (scripts/i18n_vie_sv_era55.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot.tm_lang.rivit;
const P = lue('sv_kaannoserae_55_palautus.json'), G = lue('sv_kaannoserae_55_gemini.json');
const V = require('../scripts/i18n_vie_sv_era55.cjs'), L = require('../lib/tm_lang.js').TM_LANG, ODOTUS = require('./tm_lang_sv_odotuslista.cjs');
describe('sv-erä 55 — vienti', () => {
  it('palautus = lähetetty erä: samat 59 avainta, fi/en/huom muuttumattomat, sv täytetty kaikilla', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(59);
    for (const [k, r] of Object.entries(P)) { expect(r.sv.trim(), k).not.toBe(''); for (const f of ['fi', 'en', 'huom']) expect(r[f], k + ' ' + f).toBe(G[k][f]); }
  });
  it('koodin sv = palautus merkki merkiltä; fi ja en ennallaan', () => {
    for (const [k, r] of Object.entries(P)) { const a = k.replace(/^suostumus\./, ''); expect(L.sv.suostumus[a], k).toBe(r.sv); expect(L.fi.suostumus[a], k).toBe(r.fi); expect(L.en.suostumus[a], k).toBe(r.en); }
  });
  it('sv-odotuslista ei sisällä erän 55 avaimia', () => { expect(Object.keys(P).filter((k) => ODOTUS.includes(k))).toEqual([]); });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.odotusPoistettu).toBe(0); });
});
