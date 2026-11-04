/* sv-korjauserä B5 (PM 4.11.2026): ADAR "Toteutus" = "Utförande" kaikkialla ("Aktion" pois). Code ei kirjoita ruotsia (§0): koodin sv = PM:n korjauserä
   (sha 9c34b2ea…7af1) merkki merkiltä, viety scripts/i18n_vie_sv_korjaus_b5.cjs:llä. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const KORJAUS = 'docs/i18n/sv_korjaus_b5_utforande.json', E = JSON.parse(teksti(KORJAUS)).osiot;
const V = require('../scripts/i18n_vie_sv_korjaus_b5.cjs'), L = require('../lib/tm_lang.js').TM_LANG, LIB = require('../lib/tm_lib_i18n.js').TM_LIB_I18N.sv;
const PY = require('../lib/tm_pelialy_yksilo.js');

describe('sv-korjauserä B5 — vienti', () => {
  it('korjauserä = tarkistettu tiedosto (sha); 3 riviä (tm_lang 1, lib 2); sv_vanha "Aktion" → sv "Utförande"', () => {
    const sha = createHash('sha256').update(teksti(KORJAUS)).digest('hex');
    expect(sha.startsWith('9c34b2ea')).toBe(true); expect(sha.endsWith('7af1')).toBe(true);
    expect(Object.keys(E).sort()).toEqual(['lib', 'tm_lang']);
    const rivit = Object.values(E).flatMap((o) => Object.values(o.rivit));
    expect(rivit).toHaveLength(3); expect(JSON.parse(teksti(KORJAUS))._rivit_yhteensa).toBe(3);
  });
  it('koodin sv = korjauserä merkki merkiltä; fi = koodin fi (tm_lang fi + ADAR-nimikanoni)', () => {
    for (const [k, r] of Object.entries(E.tm_lang.rivit)) { const [ry, a] = k.split('.'); expect(L.sv[ry][a], k).toBe(r.sv); expect(L.fi[ry][a], k).toBe(r.fi); }
    for (const [k, r] of Object.entries(E.lib.rivit)) { expect(LIB[k], k).toBe(r.sv); const [, , rooli, u] = k.split('_'); expect(PY.TM_ADAR_NIMET[rooli][u], k).toBe(r.fi); }
  });
  it('yksi termi: ADAR Toteutus (adar_nimi_*_ac, tc_t_ac) on ruotsiksi sama kaikkialla; "Aktion" ei enää missään sv-kartassa', () => {
    expect(new Set([L.sv.pelaaja.adar_nimi_pelaaja_ac, LIB.adar_nimi_pelaaja_ac, LIB.adar_nimi_valmentaja_ac, LIB.tc_t_ac]).size).toBe(1);
    expect(teksti('lib/tm_lang.js') + teksti('lib/tm_lib_i18n.js')).not.toMatch(/: 'Aktion',/);
  });
  it('näkyvä nimikanoni ruotsiksi: tmAdarNimet(sv-kääntäjä).ac = Utförande pelaajalle ja valmentajalle', () => {
    const tr = (k) => (LIB[k] !== undefined ? LIB[k] : k);
    expect(PY.tmAdarNimet('pelaaja', tr).ac).toBe(E.lib.rivit.adar_nimi_pelaaja_ac.sv); expect(PY.tmAdarNimet('valmentaja', tr).ac).toBe(E.lib.rivit.adar_nimi_valmentaja_ac.sv);
  });
  it('idempotentti: uusintakuiva-ajo ei korvaa mitään eikä löydä virheitä', () => { const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.korvattu).toBe(0); expect(t.ohitettu).toHaveLength(3); });
});
