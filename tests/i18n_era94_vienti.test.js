/* sv-erä 94 (B9 suostumuksen peruminen, #1176) — vienti. Code ei kirjoita ruotsia (§0): koodin sv = PM:n kirjoittama palautus (sha e99ada24…2982) merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_94_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_94_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era94.cjs'), HE = require('../lib/tm_henkilosto_i18n.js').TM_HENKILOSTO_I18N.sv, L = require('../lib/tm_lang.js').TM_LANG;
const LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, SP = require('../functions/suostumus_peruminen.js').TEKSTIT;
describe('sv-erä 94 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha), 28 riviä = lähetetty erä; lähetetty sv tyhjä', () => {
    const sha = createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_94_palautus.json')).digest('hex');
    expect(sha.startsWith('e99ada24')).toBe(true); expect(sha.endsWith('2982')).toBe(true);
    let n = 0;
    for (const o of Object.keys(G)) { expect(Object.keys(P[o].rivit).sort()).toEqual(Object.keys(G[o].rivit).sort()); for (const [k, r] of Object.entries(P[o].rivit)) { n++; expect(G[o].rivit[k].sv, k).toBe(''); expect(r.sv.trim(), k).not.toBe(''); expect(r.fi, k).toBe(G[o].rivit[k].fi); } }
    expect(n).toBe(28);
  });
  it('koodin sv = palautus merkki merkiltä (tm_lang, henkilöstökartta, lib, sähköposti)', () => {
    for (const [k, r] of Object.entries(P.tm_lang.rivit)) { const [ry, a] = k.split('.'); expect(L.sv[ry][a], k).toBe(r.sv); expect(L.fi[ry][a], k).toBe(r.fi); }
    for (const [k, r] of Object.entries(P.henkilosto_kartta.rivit)) expect(HE[k], k).toBe(r.sv);
    for (const [k, r] of Object.entries(P.lib.rivit)) expect(LIB[k], k).toBe(r.sv);
    for (const [k, r] of Object.entries(P.sahkoposti.rivit)) { expect(SP.sv[k], k).toBe(r.sv); expect(SP.fi[k], k).toBe(r.fi); }
    expect(Object.keys(SP.sv).sort()).toEqual(Object.keys(SP.fi).sort());
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.ohitettu).toHaveLength(28); });
  it('erä 94 ei ole odottavien listalla, sv-odotuslistalla eikä LIB_SV_ODOTTAA:ssa', () => {
    const rivi = teksti('tools/i18n/sv_kattavuus.mjs').match(/const ODOTTAVAT_ERAT = \[([^\]]*)\];/); expect(rivi).toBeTruthy(); expect(rivi[1].split(',').map((x) => x.trim())).not.toContain('94');
    const od = require('./tm_lang_sv_odotuslista.cjs'); for (const k of Object.keys(P.tm_lang.rivit)) expect(od, k).not.toContain(k);
    expect(teksti('tests/i18n_sv_era_lib.test.js')).not.toContain("'kts_suostumus_peruttu'");
  });
});
