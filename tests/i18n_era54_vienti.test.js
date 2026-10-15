/* sv-erä 54 (Sibbo-reititys) — vienti (scripts/i18n_vie_sv_era54.cjs). Code ei kirjoita ruotsia (§0): koodin sv = Geminin palautus merkki merkiltä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const P = JSON.parse(readFileSync(new URL('../docs/i18n/sv_kaannoserae_54_palautus.json', import.meta.url), 'utf8')).osiot;
const V = require('../scripts/i18n_vie_sv_era54.cjs'), LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv, MA = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv, L = require('../lib/tm_lang.js').TM_LANG, VK = require('../scripts/vientipohja_kieli.js');
describe('sv-erä 54 — vienti', () => {
  it('rivimäärät 24 + 34 + 3 + 4, kaikissa sv', () => { expect(Object.keys(P.tm_lang.rivit)).toHaveLength(24); expect(Object.keys(P['lib.tm_harjoitusarviointi'].rivit)).toHaveLength(34); expect(Object.keys(P.master_kartta.rivit)).toHaveLength(3); expect(Object.keys(P.vientipohja.rivit)).toHaveLength(4); for (const o of Object.values(P)) for (const [k, r] of Object.entries(o.rivit)) expect(r.sv && r.sv.trim(), k).toBeTruthy(); });
  it('koodin sv = palautus: tm_lang, TM_LIB_I18N (avain = fi), TM_MASTER_I18N, vientipohja_sv.json', () => {
    for (const [k, r] of Object.entries(P.tm_lang.rivit)) expect(k.split('.').reduce((o, x) => o[x], L.sv), k).toBe(r.sv);
    for (const [k, r] of Object.entries(P['lib.tm_harjoitusarviointi'].rivit)) expect(LIB[k], k).toBe(r.sv);
    for (const [k, r] of Object.entries(P.master_kartta.rivit)) expect(MA[k], k).toBe(r.sv);
    for (const [k, r] of Object.entries(P.vientipohja.rivit)) expect(VK.lataaSv()[k], k).toBe(r.sv);
  });
  it('kuittaus-aliakset käytössä sv-pohjassa: näyttöarvot ja OHJE-rivi 5 palautuksen mukaan; ei puuttuvia tekstejä', () => {
    const kt = VK.kielitaulu('sv'); expect(kt.puuttuu).toEqual([]); const c = VK.pohjaSisalto(kt, 'SJK');
    expect(c.kuittaukset).toEqual([P.vientipohja.rivit.kuit_ok.sv, P.vientipohja.rivit.kuit_muutettu.sv, P.vientipohja.rivit.kuit_poista.sv]);
    expect(c.ohje.some((t) => t.startsWith('5. ') && t.includes(P.vientipohja.rivit.kuit_muutettu.sv))).toBe(true);
  });
  it('idempotentti', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); });
});
