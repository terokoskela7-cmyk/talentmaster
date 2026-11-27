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
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_102_palautus.json')).digest('hex')).toBe('3522d3cedee6e7e18a0fb40bbcdeae7031492fe1dafcfacb270ff672c733e70a');
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

describe('konseptien nimet: yksi sv-nimi per konsepti (MASTER.json = lib-sanasto sn_y_h* ja sn_y_p*)', () => {
  const TUNNUKSET = [...Array(10).keys()].map((n) => 'y_h' + n).concat([1, 2, 3, 4].map((n) => 'y_p' + n));
  it('lib sn_y_h0…9 ja sn_y_p1…4 = MASTER yX.nimi normaalilla kirjoitusasulla (Mottagning, Finter och utmaningar)', () => {
    expect(TUNNUKSET).toHaveLength(14); expect(V.KONSEPTIT.map((x) => x[0])).toEqual(TUNNUKSET.map((t) => 'sn_' + t));
    for (const t of TUNNUKSET) {
      const m = MASTER[t + '.nimi']; expect(typeof m, t).toBe('string');
      expect(LIB['sn_' + t], 'sn_' + t).toBe(m.charAt(0) + m.slice(1).toLowerCase());
    }
    expect(LIB.sn_y_h1).toBe('Mottagning'); expect(LIB.sn_y_h4).toBe('Finter och utmaningar'); expect(LIB.sn_y_p1).toBe('1v1-försvarsspel'); expect(LIB.sn_y_p3).toBe('Understöd i försvarsspel');
  });
  it('sama muunnos kuin VP:n _vpKonseptiNimiNimella (ei erillistä kirjoitusasulogiikkaa)', () => {
    const vpHtml = teksti('TalentMaster_VP_v25.html');
    expect(vpHtml).toContain('function _vpKonseptiNimiNormaali(sv)'); expect(vpHtml).toContain('return _vpKonseptiNimiNormaali(sv);');   // normalisoija: tests/vp_konsepti_nimi_normaali.test.js vertaa vientiskriptin kopioon
    for (const t of TUNNUKSET) expect(V.normaali(MASTER[t + '.nimi']), t).toBe(LIB['sn_' + t]);
  });
});

describe('PM:n korjaus #1245: keskellä riviä pieni alkukirjain; isoalkuiset avaimet ennallaan', () => {
  it('uudet avaimet bio-ikä / kehityskaari ovat omia (pienet) ja pienellä; isoalkuiset Bio-ikä / Kehityskaari säilyvät isolla', () => {
    expect(rivit['bio-ikä'].sv).toBe('bio-ålder'); expect(rivit.kehityskaari.sv).toBe('utvecklingskurva');
    expect(VP['bio-ikä']).toBe('bio-ålder'); expect(VP.kehityskaari).toBe('utvecklingskurva');
    expect(VP['Bio-ikä']).toBe('Bio-ålder'); expect(VP.Kehityskaari).toBe('Utvecklingskurva');
  });
  it('avain ei ole jaettu: pienaakkoslinen bio-ikä on vain kypsyyskortin otsikkorivin keskellä (tm_kypsyys.js), kehityskaari vain sparklinen aria-labelissa', () => {
    const kaytto = (avain) => ['lib/tm_kypsyys.js', 'lib/tm_kehityskaari.js', 'lib/tm_kehitystilanne.js', 'TalentMaster_VP_v25.html'].filter((f) => new RegExp("(?:_T|vpT|\\bT)\\('" + avain + "'\\)").test(teksti(f)));
    expect(kaytto('bio-ikä')).toEqual(['lib/tm_kypsyys.js']); expect(kaytto('kehityskaari')).toEqual(['lib/tm_kehityskaari.js']);
  });
});
