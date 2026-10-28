/* sv-erä 76 (K1b) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = palautus (Teron/PM:n tarkistama) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const OSIOT = { 'lib.tm_kt_havainto': require('../lib/tm_kt_havainto.js'), 'lib.tm_kt_polku': require('../lib/tm_kt_polku.js') };
const P = lue('sv_kaannoserae_76_palautus.json'), G = lue('sv_kaannoserae_76_gemini.json');
const V = require('../scripts/i18n_vie_sv_era76.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
describe('sv-erä 76 — vienti', () => {
  it('palautus 3 riviä = lähetetty erä; fi = koodi; sv täytetty; paikkamerkit säilyvät', () => {
    let n = 0;
    for (const [o, TX] of Object.entries(OSIOT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(TX.FI[k]); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(3);
  });
  it('koodin sv = palautus merkki merkiltä; jokaiselle kt_h_- ja ktp_-avaimelle on sv', () => {
    for (const o of Object.keys(OSIOT)) for (const [k, r] of Object.entries(P[o].rivit)) expect(SV[k], k).toBe(r.sv);
    for (const TX of Object.values(OSIOT)) expect(Object.keys(TX.FI).filter((k) => /^(kt_h_|ktp_)/.test(k) && typeof SV[k] !== 'string' && !require('./helpers/k1d_korvaukset.cjs').era80Odottaa(k) && !require('./helpers/sv_era91_odottaa.cjs').includes(k))).toEqual([]);   // sv-aukot k11/k12: erän 91 ktp_kausi_*/ktp_dom_* odottavat PM:ää · K1d: erä 80 -avaimet odottavat Geminiä
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu.length).toBe(3); });
});
