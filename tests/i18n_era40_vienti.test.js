/* sv-erä 40 vienti (scripts/i18n_vie_sv_era40.cjs): 67 Gemini-riviä → TM_MASTER_I18N.sv merkki merkiltä; idempotentti; dedupe-invariantti; sv-portin odotuslista = 18 (erä 41). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8'), P = JSON.parse(lue('docs/i18n/sv_kaannoserae_40_palautus.json'));
const V = require('../scripts/i18n_vie_sv_era40.cjs'), MI = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, CMN = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const rivit = Object.values(P.osiot).flatMap((o) => Object.entries(o.rivit));
describe('erä 40 vienti', () => {
  it('palautuksessa 67 riviä, kaikilla sv; jokainen on Masterin kartassa täsmälleen palautuksen arvo (merkki merkiltä, myös välilyönnit ja paikkamerkit)', () => {
    expect(rivit).toHaveLength(67); rivit.forEach(([fi, r]) => { expect(r.fi).toBe(fi); expect(r.sv.trim().length, fi).toBeGreaterThan(0); expect(MI[fi], fi).toBe(r.sv); });
  });
  it('paikkamerkit ja HTML-tagit samat kuin fi-avaimessa; ei alku-/loppuvälilyönti-eroja', () => {
    const pm = (s) => (s.match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join('|');
    rivit.forEach(([fi, r]) => { expect(pm(r.sv), fi).toBe(pm(fi)); expect(/^\s/.test(fi), fi).toBe(/^\s/.test(r.sv)); expect(/\s$/.test(fi), fi).toBe(/\s$/.test(r.sv)); });
  });
  it('dedupe-invariantti: Masterin avaimet eivät ole lukitussa yhteisessä glossaarissa', () => { rivit.forEach(([fi]) => expect(typeof CMN[fi], fi).not.toBe('string')); });
  it('idempotentti: uusi kuiva-ajo ei lisää mitään (kaikki jo viety), ei virheitä', () => { const r = V.vie({}); expect(r.virheet).toEqual([]); expect(r.lisatty).toEqual([]); expect(r.ohitettu).toHaveLength(67); expect(r.kirjoitettu).toBe(false); });
  it('sv-portin odotuslista on 18 (V-KOTI; odottaa erän 41 palautusta) eikä sisällä yhtään erän 40 avainta', () => {
    const s = lue('tests/v_koti_sv_selain.test.js'), a = s.indexOf('export const SV_ODOTTAA = ['), b = s.indexOf('\n];', a) + 3, lista = (0, eval)('(' + s.slice(a, b).replace('export const SV_ODOTTAA = ', '').replace(/;$/, '') + ')');
    expect(lista).toHaveLength(18); const e40 = new Set(rivit.map(([fi]) => fi)); lista.forEach((k) => expect(e40.has(k), k).toBe(false));
    const e41 = Object.values(JSON.parse(lue('docs/i18n/sv_kaannoserae_41_gemini.json')).osiot).flatMap((o) => Object.keys(o.rivit)); expect([...lista].sort()).toEqual([...e41].sort());   // lista = erä 41 täsmälleen
  });
});
