/* sv-erä 84 (K4b: Kehityskeskustelu uudelle sivulle) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 1e3d713e…d176) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8');
const PO = JSON.parse(teksti('sv_kaannoserae_84_palautus.json')).osiot, GO = JSON.parse(teksti('sv_kaannoserae_84_gemini.json')).osiot;
const LIBIT = { 'lib.tm_kt_keskustelu': require('../lib/tm_kt_keskustelu.js').FI, 'lib.tm_kt_polku': require('../lib/tm_kt_polku.js').FI };
const V = require('../scripts/i18n_vie_sv_era84.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const KATTAVUUS = readFileSync(new URL('../tools/i18n/sv_kattavuus.mjs', import.meta.url), 'utf8'), LIBTESTI = readFileSync(new URL('./i18n_sv_era_lib.test.js', import.meta.url), 'utf8');
describe('sv-erä 84 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 52 riviä (48 + 4) = lähetetty erä; lähetetty sv tyhjä; fi = koodi; paikkamerkit säilyvät', () => {
    const sha = createHash('sha256').update(teksti('sv_kaannoserae_84_palautus.json')).digest('hex'); expect(sha.startsWith('1e3d713e')).toBe(true); expect(sha.endsWith('d176')).toBe(true);
    expect(Object.keys(PO).sort()).toEqual(Object.keys(GO).sort()); let n = 0;
    for (const o of Object.keys(PO)) {
      const P = PO[o].rivit, G = GO[o].rivit; expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort());
      for (const [k, r] of Object.entries(P)) { n++; expect(G[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(LIBIT[o][k]); expect(r.fi, k).toBe(G[k].fi); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
    }
    expect(n).toBe(52); expect(Object.keys(PO['lib.tm_kt_keskustelu'].rivit)).toHaveLength(48);
  });
  it('koodin sv = palautus merkki merkiltä; erä ei ole odottavien listoilla (sv-testi käytössä)', () => {
    for (const o of Object.keys(PO)) for (const [k, r] of Object.entries(PO[o].rivit)) expect(SV[k], k).toBe(r.sv);
    expect(KATTAVUUS).not.toMatch(/ODOTTAVAT_ERAT = \[[^\]]*\b84\b/); expect(LIBTESTI).not.toContain("'kes_otsikko'");
    expect(Object.keys(require('../lib/tm_kt_keskustelu.js').FI).filter((k) => typeof SV[k] !== 'string')).toEqual([]);
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(52); });
});
