/* sv-erä 79 (K4a) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = palautus (Teron/PM:n tarkistama) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const OSIOT = { 'lib.tm_todistekortit': require('../lib/tm_todistekortit.js'), 'lib.tm_kehitystyopoyta': require('../lib/tm_kehitystyopoyta.js') };
const P = lue('sv_kaannoserae_79_palautus.json'), G = lue('sv_kaannoserae_79_gemini.json');
const V = require('../scripts/i18n_vie_sv_era79.cjs'), { era79Ohita } = require('../scripts/i18n_era81_tuki.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const OHITETUT = Object.values(P).reduce((n, o) => n + Object.keys(o.rivit).filter(era79Ohita).length, 0);   // K4a2: 36 riviä poistunut/muuttunut → erä 81
describe('sv-erä 79 — vienti', () => {
  it('palautus 185 riviä = lähetetty erä; fi = koodi; sv täytetty; paikkamerkit säilyvät', () => {
    let n = 0;
    for (const [o, TX] of Object.entries(OSIOT)) {
      expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort());
      for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(r.sv.trim(), k).not.toBe(''); if (era79Ohita(k)) continue; /* K4a2: korvattu erällä 81 */ expect(r.fi, k).toBe(TX.FI[k]); expect(r.fi, k).toBe(G[o].rivit[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(185);
  });
  it('koodin sv = palautus merkki merkiltä', () => {
    for (const o of Object.keys(OSIOT)) for (const [k, r] of Object.entries(P[o].rivit)) { if (era79Ohita(k)) continue; expect(SV[k], k).toBe(r.sv); }   // K4a2: poistunut tai korvattu erällä 81 (sv: tests/i18n_era81_vienti.test.js)
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu.length).toBe(185 - OHITETUT); });
});
