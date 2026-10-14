/* sv-erät 48–50 vienti (scripts/i18n_vie_sv_era48_50.cjs): 52 Gemini-riviä → TM_LIB_I18N.sv merkki merkiltä; idempotentti; fi = libin FI-avain. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const V = require('../scripts/i18n_vie_sv_era48_50.cjs'), LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const FI = {}; ['tm_kt_alue', 'tm_kehitystyopoyta', 'tm_kt_arviointi', 'tm_kt_toimintakortti'].forEach((l) => Object.assign(FI, require('../lib/' + l + '.js').FI));
const rivit = V.PALAUTUKSET.flatMap((f) => Object.values(JSON.parse(lue(f)).osiot).flatMap((o) => Object.entries(o.rivit)));
describe('erät 48–50 vienti', () => {
  it('palautuksissa 52 riviä (33 + 3 + 16), kaikilla sv; jokainen on kirjastokartassa täsmälleen palautuksen arvo ja fi = libin FI', () => {
    expect(rivit).toHaveLength(52);
    rivit.forEach(([avain, r]) => { expect(r.sv.trim().length, avain).toBeGreaterThan(0); expect(LIB[avain], avain).toBe(r.sv); expect(FI[avain], avain).toBe(r.fi); });
  });
  it('idempotentti: uusi kuiva-ajo ei lisää mitään', () => { const r = V.vie({}); expect(r.virheet).toEqual([]); expect(r.lisatty).toEqual([]); expect(r.ohitettu).toHaveLength(52); expect(r.kirjoitettu).toBe(false); });
});
