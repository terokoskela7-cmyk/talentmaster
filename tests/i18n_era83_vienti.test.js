/* sv-erä 83 (K4c: Kaikki mittaukset) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha 7defa747…c0c0) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../docs/i18n/' + f, import.meta.url), 'utf8');
const OSIO = 'lib.tm_mittaukset', P = JSON.parse(teksti('sv_kaannoserae_83_palautus.json')).osiot[OSIO].rivit, G = JSON.parse(teksti('sv_kaannoserae_83_gemini.json')).osiot[OSIO].rivit;
const FI = require('../lib/tm_mittaukset_fi.js'), V = require('../scripts/i18n_vie_sv_era83.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const KATTAVUUS = readFileSync(new URL('../tools/i18n/sv_kattavuus.mjs', import.meta.url), 'utf8');
describe('sv-erä 83 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 59 riviä = lähetetty erä; lähetetty sv tyhjä; fi = koodi; paikkamerkit säilyvät', () => {
    const sha = createHash('sha256').update(teksti('sv_kaannoserae_83_palautus.json')).digest('hex'); expect(sha.startsWith('7defa747')).toBe(true); expect(sha.endsWith('c0c0')).toBe(true);
    expect(Object.keys(P).sort()).toEqual(Object.keys(G).sort()); expect(Object.keys(P)).toHaveLength(59);
    for (const [k, r] of Object.entries(P)) { expect(G[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(FI[k]); expect(JSON.stringify(r.fi.match(/\{\w+\}/g)), k).toBe(JSON.stringify(r.sv.match(/\{\w+\}/g))); }
  });
  it('koodin sv = palautus merkki merkiltä; erä ei ole enää odottavien listalla', () => {
    for (const [k, r] of Object.entries(P)) expect(SV[k], k).toBe(r.sv);
    expect(KATTAVUUS).not.toMatch(/ODOTTAVAT_ERAT = \[[^\]]*\b83\b/);
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(59); });
});
