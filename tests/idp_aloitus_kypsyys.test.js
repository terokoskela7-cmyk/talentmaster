/**
 * TalentMaster™ — IDP VAIHE 2.0: Aloituksen Kypsyys-siru datankoonti (_vpAloitusKypsyysData, VP_v25).
 * PUHDAS: kokoaa tmKypsyys-komponentin syötteen pikakentistä (§26); ei uutta laskentaa; tyhjä → tyhjä.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

let A;
beforeAll(() => {
  const lines = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8').split('\n');
  const s = lines.findIndex((l) => l.includes('function _vpAloitusKypsyysData(p) {'));
  const e = lines.findIndex((l) => l.includes('window._vpAloitusKypsyysData = _vpAloitusKypsyysData;'));
  if (s < 0 || e < 0) throw new Error('Aloitus-kypsyys-lohkoa ei löytynyt');
  A = new Function('var window = {};\n' + lines.slice(s, e + 1).join('\n') + '\n return { _vpAloitusKypsyysData: _vpAloitusKypsyysData };')();
});

describe('_vpAloitusKypsyysData — kokoaa pikakentistä (§26)', () => {
  it('biologinenIka_viimeisin + phv_tila → tmKypsyys-syöte', () => {
    const p = { phv_tila: 'AN', biologinenIka_viimeisin: { maturity_offset: 1.3, phv_ika: 14.7, kronologinen_ika: 13.4, kasvutahti_cm_v: 4.1, kasvutahti_vyohyke: 'kohtalainen', pvm: '2025-04-12' } };
    const kd = A._vpAloitusKypsyysData(p);
    expect(kd).toMatchObject({ phv_tila_koodi: 'AN', maturity_offset: 1.3, phv_ika: 14.7, kronologinen_ika: 13.4, kasvutahti_cm_v: 4.1, mittaus_pvm: '2025-04-12' });
  });
  it('top-level kasvutahti_cm_v/vyohyke voittaa bion', () => {
    const kd = A._vpAloitusKypsyysData({ phv_tila: 'PH', kasvutahti_cm_v: 7.9, kasvutahti_vyohyke: 'nopea', biologinenIka_viimeisin: { maturity_offset: 0, kasvutahti_cm_v: 4 } });
    expect(kd.kasvutahti_cm_v).toBe(7.9);
    expect(kd.kasvutahti_vyohyke).toBe('nopea');
  });
  it('kasvuhistoria pikakentästä (p tai bio); muuten []', () => {
    expect(A._vpAloitusKypsyysData({ kasvuhistoria: [{ pvm: '2024', pituus_cm: 155 }] }).kasvuhistoria.length).toBe(1);
    expect(A._vpAloitusKypsyysData({ biologinenIka_viimeisin: { kasvuhistoria: [{ pvm: '2024', pituus_cm: 155 }] } }).kasvuhistoria.length).toBe(1);
    expect(A._vpAloitusKypsyysData({}).kasvuhistoria).toEqual([]);
  });
  it('tyhjä pelaaja → kaikki null/[] (rehellinen tyhjä; siru gate estää renderin)', () => {
    const kd = A._vpAloitusKypsyysData({});
    expect(kd.phv_tila_koodi).toBeNull();
    expect(kd.maturity_offset).toBeNull();
    expect(kd.kasvutahti_cm_v).toBeNull();
    expect(kd.kasvuhistoria).toEqual([]);
  });
});
