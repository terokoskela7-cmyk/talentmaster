/* sv-erät 46 + 47 vienti (scripts/i18n_vie_sv_era46_47.cjs): 37 Gemini-riviä → TM_LIB_I18N.sv merkki merkiltä; idempotentti; sanaston sv-tila (D248). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url), JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const lue = (f) => readFileSync(join(JUURI, f), 'utf8');
const V = require('../scripts/i18n_vie_sv_era46_47.cjs'), LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, SN = require('../lib/tm_sanasto.js');
const rivit = V.PALAUTUKSET.flatMap((f) => Object.values(JSON.parse(lue(f)).osiot).flatMap((o) => Object.entries(o.rivit)));
describe('erät 46 + 47 vienti', () => {
  it('palautuksissa 37 riviä, kaikilla sv; jokainen on kirjastokartassa täsmälleen palautuksen arvo; avain on sanaston FI-avain ja fi = sanaston fi', () => {
    expect(rivit).toHaveLength(37); rivit.forEach(([avain, r]) => { expect(r.sv.trim().length, avain).toBeGreaterThan(0); expect(LIB[avain], avain).toBe(r.sv); expect(require('./helpers/k1d_korvaukset.cjs').erassaFi(avain, SN.FI[avain]), avain).toBe(r.fi); });   // K1d: sn_jakson_arviointi fi muuttui → erän fi on vanha
    expect(Object.keys(SN.FI).filter((k) => typeof LIB[k] !== 'string')).toEqual([]);   // jokaiselle sanaston avaimelle on sv
  });
  it('idempotentti: uusi kuiva-ajo ei lisää mitään', () => { const r = V.vie({}); expect(r.virheet).toEqual([]); expect(r.lisatty).toEqual([]); expect(r.ohitettu).toHaveLength(37); expect(r.kirjoitettu).toBe(false); });
  it('sv-tilassa sanasto antaa Gemini-sv:n (myös vanhoille avaimille: kt_nayto → sn_mittaukset); fi-tilassa arkikieli; sv-tilassa ei fi-tekstiä sanastoavaimista', () => {
    const t = SN.tmSanastoT((k) => LIB[k] != null ? LIB[k] : k, { kieli: () => 'sv' });
    expect(t('kt_nayto')).toBe(LIB.sn_mittaukset); expect(t('kt_katselmus')).toBe(LIB.sn_jakson_arviointi); expect(t('kt_ei_osia')).toBe(LIB.sn_ydinasiat_tyhja); expect(t('ts_ei_tietoa')).toBe(LIB.sn_ensimmainen_jakso);
    Object.keys(SN.FI).forEach((k) => { expect(t(k), k).toBe(LIB[k]); });
    const f = SN.tmSanastoT((k) => k, { kieli: () => 'fi' }); expect(f('kt_nayto')).toBe('Mittaukset');
  });
});
