/* sv-erät 51 + 52 — vienti (scripts/i18n_vie_sv_era51_52.cjs; Sibbo-valmius). Code ei kirjoita ruotsia (CLAUDE.md §0): testi vertaa koodin sv-arvoja Geminin palautukseen merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const lueJ = (f) => JSON.parse(readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const V = require('../scripts/i18n_vie_sv_era51_52.cjs'), SV = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
describe('sv-erät 51 + 52 — vienti', () => {
  const rivit = V.PALAUTUKSET.flatMap((f) => Object.entries(lueJ(f).osiot).flatMap(([osio, o]) => Object.entries(o.rivit).map(([k, r]) => ({ osio, k, r }))));
  it('134 riviä, kaikissa sv täytetty', () => { expect(rivit).toHaveLength(134); for (const { k, r } of rivit) expect(r.sv && r.sv.trim(), k).toBeTruthy(); });
  it('koodin sv = palautuksen sv merkki merkiltä', () => { for (const { k, r } of rivit) expect(SV[k], k).toBe(r.sv); });
  it('idempotentti: uusintakuiva-ajo ei lisää mitään eikä kaadu', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toEqual([]); expect(t.ohitettu).toHaveLength(134); });
});
