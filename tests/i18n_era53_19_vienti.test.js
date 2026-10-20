/* sv-erä 53 (lib.tm_kt_sivu, lib.tm_kt_havainto, master_kartta) + erän 19 vp_kartta — vienti (scripts/i18n_vie_sv_era53_19.cjs; Sibbo-reititys).
 * Code ei kirjoita ruotsia (CLAUDE.md §0): testi vertaa koodin sv-arvoja Geminin palautukseen merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { S67 } from './helpers/era67_korvatut.mjs';
const require = createRequire(import.meta.url);
const lueJ = (f) => JSON.parse(readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const V = require('../scripts/i18n_vie_sv_era53_19.cjs'), LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const P53 = lueJ(V.PALAUTUS_53), P19 = lueJ(V.PALAUTUS_19);
describe('sv-erä 53 + erä 19 (VP) — vienti', () => {
  it('lib.tm_kt_sivu 15 + lib.tm_kt_havainto 14: koodin sv = palautus', () => {
    for (const osio of ['lib.tm_kt_sivu', 'lib.tm_kt_havainto']) for (const [a, r] of Object.entries(P53.osiot[osio].rivit)) { expect(r.sv && r.sv.trim(), a).toBeTruthy(); if (a === 'kt_h_lause_ohje') { expect(LIB[a], a).not.toBe(S67(r.sv)); continue; } expect(LIB[a], a).toBe(S67(r.sv)); }   // kt_h_lause_ohje: fi muutettu K1b:ssä (20.10.), uusi sv erästä 76
    expect(Object.keys(P53.osiot['lib.tm_kt_sivu'].rivit)).toHaveLength(15); expect(Object.keys(P53.osiot['lib.tm_kt_havainto'].rivit)).toHaveLength(14);
  });
  it('kovakoodatut.harjoitusarviointi 22: TM_LIB_I18N.sv[fi-teksti] = palautus (masterT ja vpT löytävät jaetun kirjastokartan)', () => {
    const rv = Object.entries(P53.osiot['kovakoodatut.harjoitusarviointi'].rivit); expect(rv).toHaveLength(22);
    for (const [fi, r] of rv) { expect(r.sv && r.sv.trim(), fi).toBeTruthy(); expect(LIB[fi], fi).toBe(S67(r.sv)); }
  });
  it('master_kartta 8: Master-kartan sv = palautus', () => { const rv = Object.entries(P53.osiot.master_kartta.rivit); expect(rv).toHaveLength(8); for (const [fi, r] of rv) expect(MA[fi], fi).toBe(S67(r.sv)); });
  it('erän 19 vp_kartta: jokaisella palautuksen rivillä on sv VP-kartassa tai yhteisessä kartassa (sama arvo)', () => {
    const CO = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
    for (const [fi, r] of Object.entries(P19.osiot.vp_kartta.rivit)) { const k = VP[fi] !== undefined ? VP[fi] : CO[fi]; expect(k, fi).toBe(S67(r.sv)); }
  });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toEqual([]); });
  it('erätiedosto 53 (lähetetty versio) jäi koskematta: sv tyhjä', () => { for (const o of Object.values(lueJ('docs/i18n/sv_kaannoserae_53_gemini.json').osiot)) for (const r of Object.values(o.rivit)) expect(r.sv).toBe(''); });
});
