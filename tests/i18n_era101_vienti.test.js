/* sv-erä 101 (VP:n Kenttä-lippu, #1244, PM 9.11.2026) — 69 riviä. Code ei kirjoita ruotsia (§0): koodin sv = PM:n palautus (sha 9e8735f3…37f4) merkki merkiltä.
   Kohteet: lib/tm_vp_i18n.js TM_VP_I18N.sv (vpT; libit vpT:n kautta; avain = fi-teksti tai johdettu pala, jonka kokoonpano verifioidaan PM:n riviä vasten) + TP_TOIMENPIDE_HANNAT (rivit 65–69).
   Palautus ei kirjoita mitään uudelleen: vienti on idempotentti. Reititys todennetaan sv-läpiajossa (fx_vp_kentta, 0 uutta). */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const teksti = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const P = JSON.parse(teksti('docs/i18n/sv_kaannoserae_101_palautus.json')).osiot, G = JSON.parse(teksti('docs/i18n/sv_kaannoserae_101_gemini.json')).osiot;
const V = require('../scripts/i18n_vie_sv_era101.cjs'), { lataaSv } = require('../scripts/i18n_vie_sv_era53_19.cjs');
const rivit = P.vp_kentta.rivit;
const LIB = lataaSv(teksti('lib/tm_vp_i18n.js'), 'TM_VP_I18N'), COMMON = lataaSv(teksti('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
const KARTTA = (k) => (typeof COMMON[k] === 'string' ? COMMON[k] : LIB[k]);   // vpT-järjestys
const VPI = require('../lib/tm_vp_i18n.js');
const pm = (s) => (s.match(/\{\w+\}/g) || []).sort().join();
const HANNAT = Object.entries(rivit).filter(([k]) => /^(?:fyysiset testit|tekniikka) kehityskohteena/.test(k));

describe('sv-erä 101 — vienti', () => {
  it('palautus = tarkistettu tiedosto (sha); 69 riviä = lähetetty erä; lähetetty sv tyhjä, palautettu täytetty, samat paikkamerkit', () => {
    expect(createHash('sha256').update(teksti('docs/i18n/sv_kaannoserae_101_palautus.json')).digest('hex')).toBe('9e8735f3d4aaf5f6af00065e0fdda66528c66393e1bd7574faca181c647037f4');
    expect(Object.keys(P)).toEqual(['vp_kentta']); expect(Object.keys(rivit)).toHaveLength(69);
    expect(Object.keys(rivit).sort()).toEqual(Object.keys(G.vp_kentta.rivit).sort());
    for (const [k, r] of Object.entries(rivit)) { expect(G.vp_kentta.rivit[k].sv, k).toBe(''); expect(r.fi, k).toBe(k); expect(r.sv.trim(), k).not.toBe(''); expect(pm(r.sv), k).toBe(pm(k)); }
  });
  it('idempotentti: uusintakuiva-ajo ei löydä virheitä eikä lisää mitään (uudet rivit + 5 häntää on jo koodissa)', () => {
    const t = V.vie({ kirjoita: false });
    expect(t.virheet).toEqual([]); expect(t.lisatty).toBe(0); expect(t.hannat).toBe(0);
  });
  it('koodin sv = PM:n rivi merkki merkiltä: kokonaiset rivit sellaisinaan, johdetut palat (reitit) kokoamalla takaisin PM:n riviksi', () => {
    let kokonaisia = 0, paloja = 0;
    for (const [k, r] of Object.entries(rivit)) {
      if (HANNAT.some(([h]) => h === k)) continue;
      const reitti = V.REITIT[k] ? V.REITIT[k](k, r.sv) : null;
      if (!reitti) { if (typeof KARTTA(k) === 'string') { expect(KARTTA(k), k).toBe(r.sv); kokonaisia++; } continue; }
      if (!reitti.avain || reitti.sv == null) continue;
      expect(KARTTA(reitti.avain), k).toBe(reitti.sv); paloja++;
      if (reitti.kokoa) { const [a, b] = reitti.kokoa(reitti.avain, reitti.sv); expect(a, k).toBe(k); expect(b, k).toBe(r.sv); }
    }
    expect(kokonaisia).toBeGreaterThan(40); expect(paloja).toBeGreaterThan(10);
  });
  it('s/kausi ja cm/kausi: pala (ei esimerkkilukua) — s/säsong, cm/säsong', () => {
    expect(KARTTA('s/kausi')).toBe('s/säsong'); expect(KARTTA('cm/kausi')).toBe('cm/säsong');
    for (const k of Object.keys(rivit).filter((x) => /\/kausi$/.test(x))) expect(Object.keys(LIB)).not.toContain(k);
  });
});

describe('TP_TOIMENPIDE_HANNAT — kaikki kuusi palvelinsignaalia sv-tilassa (yksittäinen + aggregaatti)', () => {
  const kieli = globalThis.tmNykyinenKieli;
  beforeAll(() => { globalThis.tmNykyinenKieli = () => 'sv'; });
  afterAll(() => { globalThis.tmNykyinenKieli = kieli; });
  const T = VPI.vpTToimenpide;
  /* Tekstit sellaisina kuin palvelin (functions/tm_toimenpide_signaalit.js) ja VP:n aggregaatti (dedupToimenpiteet) ne muodostavat. */
  const SIGNAALIT = {
    hh_taso_alhainen: ['U12 — fyysiset testit kehityskohteena: 4 pelaajaa. Aloita yksilöllinen harjoitusohjelma.', 'Kaikki joukkueet — fyysiset testit kehityskohteena. Aloita yksilöllinen ohjelma.'],
    suunta_lasku: ['U12 — H-H taso laskussa 3 pelaajalla. Tarkista kuormitus.', 'Kaikki joukkueet — H-H taso laskussa. Tarkista kuormitus.'],
    tkk_puuttuu: ['U12 — tekniikkamittaukset puuttuvat kaikilta pelaajilta. Suunnittele tekniikkakilpailu.', 'Kaikki joukkueet — tekniikkamittaukset puuttuvat 3:lta joukkueelta. Suunnittele tekniikkakilpailu.'],
    tki_alhainen: ['U12 — tekniikka kehityskohteena: 5 pelaajaa alle ikätason. Fokusoi tekniikkaharjoittelu.', 'U12 — tekniikka kehityskohteena: 2 pelaajaa, pallo hidastaa suunnanmuutoksissa. Fokusoi tekniikkaharjoittelu.', 'Kaikki joukkueet — tekniikka kehityskohteena. Fokusoi tekniikkaharjoittelu.'],
    tki_lahella_merkkia: ['U12 — 4 pelaajaa lähellä pronssia (TKI 35–54). Kohdenna omatoimiharjoittelu — merkki on saavutettavissa seuraavassa kilpailussa.', 'Kaikki joukkueet — pelaajia lähellä pronssia. Kohdenna omatoimiharjoittelu, merkki saavutettavissa.'],
    harjoitettavuus: ['U12 — harjoitettavuuskartoitus (kehon valmius) tekemättä. Varaa kartoituspäivä, jotta harjoittelua voi yksilöllistää.', 'Kaikki joukkueet — harjoitettavuuskartoitus (kehon valmius) tekemättä 3:lta joukkueelta. Varaa kartoituspäivä.'],
  };
  it('kuusi signaalia: häntä kääntyy (ei fi-häntää jäljellä), joukkueen nimi säilyy, luvut täyttyvät', () => {
    expect(Object.keys(SIGNAALIT)).toHaveLength(6);
    for (const [id, tekstit] of Object.entries(SIGNAALIT)) for (const fi of tekstit) {
      const sv = T(fi), [pfx, ...rest] = sv.split(' — ');
      expect(sv, id + ': ' + fi).not.toBe(fi); expect(rest.join(' — '), id).not.toBe(fi.split(' — ').slice(1).join(' — '));
      expect(pfx === 'U12' || pfx === 'Alla lag', id + ': ' + pfx).toBe(true);
    }
  });
  it('rivit 65–69: palvelimen uudet muodot kääntyvät PM:n sv:ksi merkki merkiltä ({n} täytetty)', () => {
    expect(HANNAT).toHaveLength(5);
    const nayte = { 'fyysiset testit kehityskohteena: {n} pelaajaa. Aloita yksilöllinen harjoitusohjelma.': 4, 'tekniikka kehityskohteena: {n} pelaajaa alle ikätason. Fokusoi tekniikkaharjoittelu.': 5, 'tekniikka kehityskohteena: {n} pelaajaa, pallo hidastaa suunnanmuutoksissa. Fokusoi tekniikkaharjoittelu.': 2 };
    for (const [fi, r] of HANNAT) {
      const n = nayte[fi] != null ? nayte[fi] : '';
      expect(T('U12 — ' + fi.replace('{n}', n)), fi).toBe('U12 — ' + r.sv.replace('{n}', n));
    }
    expect(T('Kaikki joukkueet — tekniikka kehityskohteena. Fokusoi tekniikkaharjoittelu.')).toBe('Alla lag — ' + rivit['tekniikka kehityskohteena. Fokusoi tekniikkaharjoittelu.'].sv);
  });
  it('fi-tilassa teksti ei muutu', () => {
    globalThis.tmNykyinenKieli = () => 'fi';
    for (const t of Object.values(SIGNAALIT).flat()) expect(T(t)).toBe(t);
    globalThis.tmNykyinenKieli = () => 'sv';
  });
});
