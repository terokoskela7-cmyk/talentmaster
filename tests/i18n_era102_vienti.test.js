/* sv-erä 102 (VP Kenttä-näkymän vierekkäiset tekstit, #1245, PM 10.11.2026) — 55 riviä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha-lukittu) merkki merkiltä.
   Kohteet: lib/tm_vp_i18n.js (51), lib/tm_i18n_common.js (4 liikkuvuusliikettä, lukittu sanasto). Konseptien nimet: lib sn_y_h* = MASTER-sidecar normaalilla kirjoitusasulla. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_102_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_102_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era102.cjs'), { lataaSv } = require('../scripts/i18n_vie_sv_era53_19.cjs');
const rivit = P.vp_kentta_b.rivit;
const VP = lataaSv(teksti('lib/tm_vp_i18n.js'), 'TM_VP_I18N'), CM = lataaSv(teksti('lib/tm_i18n_common.js'), 'TM_I18N_COMMON'), LIB = lataaSv(teksti('lib/tm_lib_i18n.js'), 'TM_LIB_I18N');
const MASTER = JSON.parse(teksti('docs/i18n/curriculum_kaannettava.sv.MASTER.json'));
const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();

describe('sv-erä 102 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 55 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_102_palautus.json')).digest('hex')).toBe('4443d7601fd5e776a97598c6260ce592857bb950cdb9be15ca778fce971a575e');
    expect(Object.keys(P)).toEqual(['vp_kentta_b']); expect(Object.keys(rivit)).toHaveLength(55);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.vp_kentta_b.rivit).sort());
    for (const [k, r] of Object.entries(rivit)) { expect(G.vp_kentta_b.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); expect(pm(r.sv), k).toBe(pm(k)); }
  });
  it('idempotentti: uusintakuiva-ajo ei löydä virheitä eikä lisää mitään', () => {
    const t = V.vie({ kirjoita: false }); expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.konseptit).toEqual([]);
  });
  it('koodin sv = PM:n rivi merkki merkiltä, vpT-järjestyksellä (common → VP); liikkuvuusliikkeet lukitussa sanastossa (common), ei VP-kartassa', () => {
    for (const [k, r] of Object.entries(rivit)) expect(typeof CM[k] === 'string' ? CM[k] : VP[k], k).toBe(r.sv);
    for (const k of V.COMMON_FI) { expect(CM[k], k).toBe(rivit[k].sv); expect(VP[k], k).toBeUndefined(); }
    expect(V.COMMON_FI.map((k) => CM[k])).toEqual(['Overhead-knäböj', 'Utfallssteg', 'Good morning', 'Armhävning']);
  });
});

describe('konseptien nimet: yksi sv-nimi per konsepti (MASTER.json = lib-sanasto sn_y_h*)', () => {
  it('lib sn_y_h0…9 = MASTER y_hN.nimi normaalilla kirjoitusasulla (Mottagning, Finter och utmaningar)', () => {
    for (let n = 0; n <= 9; n++) {
      const m = MASTER['y_h' + n + '.nimi']; expect(typeof m, 'y_h' + n).toBe('string');
      expect(LIB['sn_y_h' + n], 'sn_y_h' + n).toBe(m.charAt(0) + m.slice(1).toLowerCase());
    }
    expect(LIB.sn_y_h1).toBe('Mottagning'); expect(LIB.sn_y_h4).toBe('Finter och utmaningar');
  });
  it('sama muunnos kuin VP:n _vpKonseptiNimiNimella (ei erillistä kirjoitusasulogiikkaa)', () => {
    const vpHtml = teksti('TalentMaster_VP_v25.html');
    expect(vpHtml).toContain("(sv === sv.toUpperCase() && sv !== sv.toLowerCase()) ? (sv.charAt(0) + sv.slice(1).toLowerCase()) : sv");
    for (let n = 0; n <= 9; n++) expect(V.normaali(MASTER['y_h' + n + '.nimi']), 'y_h' + n).toBe(LIB['sn_y_h' + n]);
  });
});
