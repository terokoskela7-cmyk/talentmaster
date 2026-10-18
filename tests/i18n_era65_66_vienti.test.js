/* sv-erät 65 (B4b Polku), 66 (klipin ajastettu-tila) ja 68 (klippikortti A) — vienti (scripts/i18n_vie_sv_era65.cjs, era66.cjs, era68.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => JSON.parse(readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8')).osiot;
const SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
for (const [n, osio, lib, rivejä] of [[65, 'lib.tm_kt_polku', '../lib/tm_kt_polku.js', 31], [66, 'lib.tm_mediaviesti', '../lib/tm_mediaviesti.js', 2], [68, 'lib.tm_klippi_perhe', '../lib/tm_klippi_perhe.js', 2]]) {
  const P = lue('sv_kaannoserae_' + n + '_palautus.json')[osio].rivit, G = lue('sv_kaannoserae_' + n + '_gemini.json')[osio].rivit, TX = require(lib), V = require('../scripts/i18n_vie_sv_era' + n + '.cjs');
  describe('sv-erä ' + n + ' — vienti', () => {
    it(rivejä + ' riviä = lähetetty erä; fi = koodi; sv täytetty; paikkamerkit säilyvät', () => {
      expect(Object.keys(P).length).toBe(rivejä); expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort());
      for (const [k, r] of Object.entries(P)) { expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(TX.FI[k]); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    });
    it('koodin sv = palautus merkki merkiltä', () => { for (const [k, r] of Object.entries(P)) expect(SV[k], k).toBe(r.sv); });
    it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
  });
}
describe('erä 65: ktp_a_kausi-korjaus', () => { it('fi "Kauden tavoite omin sanoin" ja sv vietynä', () => { expect(require('../lib/tm_kt_polku.js').FI.ktp_a_kausi).toBe('Kauden tavoite omin sanoin'); expect(typeof SV.ktp_a_kausi).toBe('string'); }); });
