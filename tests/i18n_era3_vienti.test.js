/* Gemini-erä 3 viety koodiin (scripts/i18n_vie_sv_era3.cjs): jokainen erän sv-arvo on kartassa MERKKI MERKILTÄ samana kuin erässä (Code ei muuta ruotsia, CLAUDE.md §0).
 * Palautettavat rivit (jos jokin ei sopinut) ovat docs/i18n/sv_era3_palautetaan.json:ssa; nyt 0. fi/en-sisältö ei muutu (vienti vain lisää sv-avaimia). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const ERA = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_kaannoserae_3.json'), 'utf8'));
const PAL = JSON.parse(readFileSync(join(juuri, 'docs/i18n/sv_era3_palautetaan.json'), 'utf8')).rivit;
const L = require('../lib/tm_lang.js').TM_LANG.sv;
const LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const VP = require('../lib/tm_vp_i18n.js').TM_VP_I18N.sv;
const MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const polku = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const rivit = (osio) => Object.entries(ERA.osiot[osio].rivit);

describe('Gemini-erä 3 — vienti', () => {
  it('erä: 88 riviä, kaikilla sv; ei palautettavia', () => {
    const kaikki = Object.values(ERA.osiot).flatMap((o) => Object.values(o.rivit));
    expect(kaikki.length).toBe(88); expect(kaikki.filter((r) => !r.sv)).toEqual([]); expect(PAL).toEqual([]);
  });
  it('tm_lang (24) → lib/tm_lang.js sv', () => { expect(rivit('tm_lang').length).toBe(24); for (const [p, r] of rivit('tm_lang')) expect(polku(L, p), p).toBe(r.sv); });
  it('lib.tm_kehitystyopoyta (44) + lib.tm_tanaan_signaali (1) → lib/tm_lib_i18n.js sv', () => {
    expect(rivit('lib.tm_kehitystyopoyta').length).toBe(44); expect(rivit('lib.tm_tanaan_signaali').length).toBe(1);
    for (const o of ['lib.tm_kehitystyopoyta', 'lib.tm_tanaan_signaali']) for (const [a, r] of rivit(o)) expect(LIB[a], a).toBe(r.sv);
  });
  it('vp_kartta (9) → tm_vp_i18n.js; master_kartta (10) → tm_master_i18n.js', () => {
    expect(rivit('vp_kartta').length).toBe(9); expect(rivit('master_kartta').length).toBe(10);
    for (const [a, r] of rivit('vp_kartta')) expect(VP[a], a).toBe(r.sv);
    for (const [a, r] of rivit('master_kartta')) expect(MA[a], a).toBe(r.sv);
  });
  it('paikkamerkit säilyvät fi → sv', () => {
    const pm = (s) => (String(s).match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join('|');
    for (const o of Object.values(ERA.osiot)) for (const r of Object.values(o.rivit)) expect(pm(r.sv)).toBe(pm(r.fi));
  });
});
