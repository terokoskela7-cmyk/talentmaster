/* sv-erä 81 (K4a2) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 30102126…94bc) merkki merkiltä.
   PM:n katselmointi (#1110): fi_pm = lopullinen suomenkielinen teksti (tc_l_hh "H-H-testit", tc_t_d3 "Valmennettavuus"). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('sv_kaannoserae_81_palautus.json')).osiot['lib.tm_todistekortit'].rivit, G = JSON.parse(teksti('sv_kaannoserae_81_gemini.json')).osiot['lib.tm_todistekortit'].rivit;
const FI = require('../lib/tm_todistekortit_fi.js'), V = require('../scripts/i18n_vie_sv_era81.cjs'), T = require('../scripts/i18n_era81_tuki.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, FX = require('./fixtures/k4a2_fi_muutokset.json');
describe('sv-erä 81 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 35 riviä = lähetetty erä; lähetetty sv tyhjä; fi = koodi (fi_pm voittaa); paikkamerkit säilyvät', () => {
    expect(createHash('sha256').update(teksti('sv_kaannoserae_81_palautus.json')).digest('hex').startsWith('30102126')).toBe(true);
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P).sort()).toEqual(T.era81Odottaa()); expect(Object.keys(P)).toHaveLength(35);
    for (const [k, r] of Object.entries(P)) {
      expect(G[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); const fi = r.fi_pm || r.fi; expect(fi, k).toBe(FI[k]);
      expect(JSON.stringify(fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g)));
    }
    expect(Object.entries(P).filter(([, r]) => r.fi_pm).map(([k, r]) => [k, r.fi_pm])).toEqual([['tc_l_hh', 'H-H-testit'], ['tc_t_d3', 'Valmennettavuus']]);
  });
  it('koodin sv = palautus merkki merkiltä; poistuneilla avaimilla ei sv:tä', () => {
    for (const [k, r] of Object.entries(P)) expect(SV[k], k).toBe(r.sv);
    Object.keys(FX.poistettu).forEach((k) => expect(SV[k], k).toBeUndefined());
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(35); });
});
