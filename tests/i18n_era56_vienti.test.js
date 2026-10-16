/* sv-erä 56 (Sibbo-viimeistely 16.10., tietosuojaikkuna) — vienti (scripts/i18n_vie_sv_era56.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot.tm_lang.rivit;
const P = lue('sv_kaannoserae_56_palautus.json'), G = lue('sv_kaannoserae_56_gemini.json');
const V = require('../scripts/i18n_vie_sv_era56.cjs'), L = require('../lib/tm_lang.js').TM_LANG, ODOTUS = require('./tm_lang_sv_odotuslista.cjs');
describe('sv-erä 56 — vienti', () => {
  it('palautus = lähetetty erä: samat 3 avainta, fi/en/huom muuttumattomat, sv täytetty', () => {
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(3);
    for (const [k, r] of Object.entries(P)) { expect(r.sv.trim(), k).not.toBe(''); for (const f of ['fi', 'en', 'huom']) expect(r[f], k + ' ' + f).toBe(G[k][f]); }
  });
  it('koodin sv = palautus merkki merkiltä; fi ja en ennallaan', () => {
    for (const [k, r] of Object.entries(P)) { const a = k.replace(/^suostumus\./, ''); expect(L.sv.suostumus[a], k).toBe(r.sv); expect(L.fi.suostumus[a], k).toBe(r.fi); expect(L.en.suostumus[a], k).toBe(r.en); }
  });
  it('sv-odotuslista ei sisällä erän 56 avaimia eikä muitakaan suostumus.rek_-avaimia', () => { expect(Object.keys(P).filter((k) => ODOTUS.includes(k))).toEqual([]); expect(ODOTUS.filter((k) => /^suostumus\.rek_/.test(k))).toEqual([]); });
  it('tietosuojaikkunan sv: ei vanhaa "ei siirretä EU:n ulkopuolelle" -väitettä; 90 pv ja SendGrid/USA mukana', () => {
    expect(L.sv.suostumus.rek_ts_sijainti_teksti).toMatch(/SendGrid/); expect(L.sv.suostumus.rek_ts_sijainti_teksti).toMatch(/USA/);
    expect(L.sv.suostumus.rek_ts_sailytysaika_90pv).toMatch(/90 dagar/);
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.odotusPoistettu).toBe(0); });
});
