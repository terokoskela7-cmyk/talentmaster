/* sv-erä 78 (K1b) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = palautus (Teron/PM:n tarkistama) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const OSIOT = { 'lib.tm_kehitystyopoyta': require('../lib/tm_kehitystyopoyta.js'), 'lib.tm_tanaan_kentta': require('../lib/tm_tanaan_kentta.js'), 'lib.tm_kt_taulu': require('../lib/tm_kt_taulu.js'), 'lib.tm_ilmoitus_lista': require('../lib/tm_ilmoitus_lista.js') };
const P = lue('sv_kaannoserae_78_palautus.json'), G = lue('sv_kaannoserae_78_gemini.json');
const V = require('../scripts/i18n_vie_sv_era78.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
describe('sv-erä 78 — vienti', () => {
  it('palautus 7 riviä = lähetetty erä; fi = koodi; sv täytetty; paikkamerkit säilyvät', () => {
    let n = 0;
    for (const [o, TX] of Object.entries(OSIOT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(TX.FI[k]); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(7);
  });
  it('koodin sv = palautus merkki merkiltä', () => {
    for (const o of Object.keys(OSIOT)) for (const [k, r] of Object.entries(P[o].rivit)) expect(SV[k], k).toBe(r.sv);
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu.length).toBe(7); });
});
