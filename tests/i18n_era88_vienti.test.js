/* sv-erä 88 (K4d: Fyysinen-kortin profiilitulkinta) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha af2af029…4fba) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const teksti = (f) => lue('docs/i18n/' + f);
const PO = JSON.parse(teksti('sv_kaannoserae_88_palautus.json')).osiot, GO = JSON.parse(teksti('sv_kaannoserae_88_gemini.json')).osiot;
const FI = require('../lib/tm_todistekortit_fi.js'), V = require('../scripts/i18n_vie_sv_era88.cjs');
const SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, VPSV = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const VP_VANHA = 'Matala CMJ + matala nopeus → voimaharjoittelu. Korkea CMJ + matala nopeus → juoksutekniikka / nopeusharjoittelu.';
describe('sv-erä 88 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 5 riviä (4 + 1) = lähetetty erä; lähetetty sv tyhjä; fi/fi_pm = koodi; paikkamerkit säilyvät', () => {
    const sha = createHash('sha256').update(teksti('sv_kaannoserae_88_palautus.json')).digest('hex'); expect(sha.startsWith('af2af029')).toBe(true); expect(sha.endsWith('4fba')).toBe(true);
    expect(Object.keys(PO).sort()).toEqual(Object.keys(GO).sort()); let n = 0;
    for (const o of Object.keys(PO)) {
      const P = PO[o].rivit, G = GO[o].rivit; expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort());
      for (const [k, r] of Object.entries(P)) {
        n++; expect(G[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); const fi = r.fi_pm || r.fi;
        if (o === 'lib.tm_todistekortit') expect(fi, k).toBe(FI[k]); else expect(fi, k).toBe(k);
        expect(JSON.stringify(fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g)));
      }
    }
    expect(n).toBe(5); expect(Object.keys(PO['lib.tm_todistekortit'].rivit)).toHaveLength(4); expect(Object.keys(PO.vp_kartta.rivit)).toHaveLength(1);
  });
  it('koodin sv = palautus merkki merkiltä (lib + VP-kartta); vanha orpo VP-rivi on poissa; erä ei ole odottavien listoilla', () => {
    for (const [k, r] of Object.entries(PO['lib.tm_todistekortit'].rivit)) expect(SV[k], k).toBe(r.sv);
    for (const [k, r] of Object.entries(PO.vp_kartta.rivit)) expect(VPSV[k], k).toBe(r.sv);
    expect(VP_VANHA in VPSV).toBe(false);
    expect(lue('tools/i18n/sv_kattavuus.mjs')).not.toMatch(/ODOTTAVAT_ERAT = \[[^\]]*\b88\b/); expect(lue('tests/i18n_sv_era_lib.test.js')).not.toContain("'tc_fy_tulk_voima'");
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(5); });
});
