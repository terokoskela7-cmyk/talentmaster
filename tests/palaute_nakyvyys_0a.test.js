/**
 * Palaute-näkyvyys vaihe 0a (Teron päätökset 19.10.2026): pelaaja ja huoltaja näkevät nykyisen merkin ja seuraavan merkin tavoitteena ("Kohti hopeaa").
 * EI sekunteja, EI etäisyyttä, EI "matka kultaan", EI MAS-raakalukua, EI valmentajan arviointitasojen kuvauksia, EI "A/B mitattu" -rengasta.
 * Kehitys vain sanoin oman edellisen mittauksen suhteen ("Parempi kuin viime kerralla"); ellei parantunut, ei mitään.
 * Perhe-appiin sanavartija (lib/tm_kielletyt.js) valmentajan vapaille teksteille.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const lue = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const { tmMerkkiNakyma } = require('../lib/tm_merkki_nakyma.js');
const KI = require('../lib/tm_kielletyt.js');
const PEL = lue('TalentMaster_Pelaaja_v7.html'), V2 = lue('TalentMaster_Vanhempi_v2.html');
const pura = (s, t) => { const i = s.indexOf(t); if (i < 0) throw new Error('puuttuu: ' + t); let d = 0; for (let k = s.indexOf('{', i); k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } } };

describe('tmMerkkiNakyma — yksi sääntö pelaajalle ja huoltajalle', () => {
  it('nykyinen + seuraava: pronssi → hopea, hopea → kulta, ei merkkiä (mutta mitattu) → pronssi', () => {
    expect(tmMerkkiNakyma({ tki_merkki: 'pronssi', tki_viimeisin: 40 })).toMatchObject({ nykyinen: 'pronssi', seuraava: 'hopea', ylin: false });
    expect(tmMerkkiNakyma({ tki_merkki: 'hopea', tki_viimeisin: 50 })).toMatchObject({ nykyinen: 'hopea', seuraava: 'kulta' });
    expect(tmMerkkiNakyma({ tki_viimeisin: 30 })).toMatchObject({ nykyinen: null, seuraava: 'pronssi' });
  });
  it('ylin merkki → vain se (ei seuraavaa)', () => {
    expect(tmMerkkiNakyma({ tki_merkki: 'kulta', tki_viimeisin: 80 })).toMatchObject({ nykyinen: 'kulta', seuraava: null, ylin: true });
  });
  it('parani: uusi kokonaisaika pienempi kuin edellinen → parempi; ei parantunut / sama / ei aiempaa → ei', () => {
    const p = (ed, vi) => ({ tki_merkki: 'hopea', tk_kokonaistulos_edellinen: ed, tk_kokonaistulos_viimeisin: vi });
    expect(tmMerkkiNakyma(p(70, 66)).parempi).toBe(true);
    expect(tmMerkkiNakyma(p(66, 70)).parempi).toBe(false);
    expect(tmMerkkiNakyma(p(66, 66)).parempi).toBe(false);
    expect(tmMerkkiNakyma(p(66.04, 66)).parempi).toBe(false);   // alle 0,1 s ei ole parannus
    expect(tmMerkkiNakyma({ tki_merkki: 'hopea', tk_kokonaistulos_viimeisin: 66 }).parempi).toBe(false);   // ei aiempaa mittausta
  });
  it('ei mittausta → null (kutsuja näyttää tyhjätilan); opts.merkki voittaa tallennetun', () => {
    expect(tmMerkkiNakyma({})).toBeNull(); expect(tmMerkkiNakyma(null)).toBeNull();
    expect(tmMerkkiNakyma({ tki_merkki: 'pronssi', tki_viimeisin: 40 }, { merkki: 'kulta' }).nykyinen).toBe('kulta');
  });
  it('palautus ei sisällä lukuja (vain merkkien nimet ja totuusarvot)', () => {
    const r = tmMerkkiNakyma({ tki_merkki: 'hopea', tk_kokonaistulos_edellinen: 70, tk_kokonaistulos_viimeisin: 66 });
    expect(JSON.stringify(r)).not.toMatch(/\d/);
  });
});

describe('lähdekoodivartija: pelaajan ja huoltajan merkki-/tekniikka-/vauhtipinnoilla ei sekunteja, matkaa eikä tasokuvauksia', () => {
  const PINNAT = [[PEL, 'function rMinaTekniikkaprofiili('], [PEL, 'function _minaTavoiteRivit('], [PEL, 'function rMinaMAS('], [PEL, 'function rMinaFyysinenTavoite('],
    [PEL, 'function _tekTavoiteSaate('], [V2, 'function rVanhempiTekniikka(']];
  it.each(PINNAT.map(([s, f]) => [f, pura(s, f)]))('%s: ei " s"-yksikköä, km/h, m/s, nuolta eikä matka/tavoite-lukuja', (f, koodi) => {
    const koodiIlmanKommentteja = koodi.replace(/\/\/[^\n]*/g, '');
    expect(koodiIlmanKommentteja).not.toMatch(/' s'|\+ ' s\b| s<\/|km\/h|m\/s|toFixed|gap_s|tkSekuntibudjetti|matka_tavoite|tek_matka|tek_nyt_tavoite|paransit|→ '/);
  });
  it('Pelaaja: ADAR/FYS/PSY-tasokuvaukset ja "A/B mitattu" -rengas poissa pelaajan kortilta', () => {
    expect(PEL).not.toMatch(/TM_ADAR_RUBRIIKKI\.alyTaso\(|TM_KORTTI_RUBRIIKIT\.(fysTaso|psyTaso)\(|a_b_mitattu|_fcRengasSVG|F\.rengas/);
  });
  it('Pelaaja + Vanhempi lataavat jaetun merkkisäännön; SW:t cachettaavat sen; Vanhempi lataa sanavartijan', () => {
    for (const s of [PEL, V2]) expect(s).toMatch(/<script src="lib\/tm_merkki_nakyma\.js\?v=\d+"><\/script>/);
    expect(V2).toMatch(/<script src="lib\/tm_kielletyt\.js\?v=\d+"><\/script>/);
    expect(lue('sw_pelaaja.js')).toContain('/lib/tm_merkki_nakyma.js'); expect(lue('sw_vanhempi.js')).toContain('/lib/tm_merkki_nakyma.js'); expect(lue('sw_vanhempi.js')).toContain('/lib/tm_kielletyt.js');
  });
  it('Uudet tekstit ovat tm_lang.js:ssä (fi + en) ja sv-odotuslistalla (erä 69) — Code ei kirjoita ruotsia', () => {
    const era = JSON.parse(lue('docs/i18n/sv_kaannoserae_69_gemini.json')).osiot.tm_lang.rivit;
    const odotus = require('./tm_lang_sv_odotuslista.cjs');
    const L = require('../lib/tm_lang.js').TM_LANG;
    for (const k of ['merkki_kohti_pronssi', 'merkki_kohti_hopea', 'merkki_kohti_kulta', 'merkki_parempi']) {
      expect(L.fi.vanhempi[k], k).toBeTruthy(); expect(L.en.vanhempi[k], k).toBeTruthy();
      expect(odotus, k).toContain('vanhempi.' + k); expect(era['vanhempi.' + k].sv, k).toBe('');
    }
  });
});

describe('Vanhempi_v2: sanavartija valmentajan vapaille teksteille', () => {
  const aja = (kielletyt) => { const c = vm.createContext({ window: { TM_KIELLETYT: kielletyt } }); vm.runInContext(pura(V2, 'function _vTekstiKelpaa('), c); return (t) => vm.runInContext('_vTekstiKelpaa(' + JSON.stringify(t) + ')', c); };
  it('kelpo teksti läpi; kielletty sana (heikkous/rajoite/kriittinen) ei; vartija puuttuu → ei (suljettu virhe)', () => {
    const kelpaa = aja(KI);
    expect(kelpaa('Hieno peli, jatka samaan malliin!')).toBe(true);
    expect(kelpaa('Pelaajan heikkous on vasen jalka')).toBe(false);
    expect(kelpaa('Kriittinen vaihe kauden alussa')).toBe(false);
    expect(aja(undefined)('Hieno peli')).toBe(false);
  });
  it('vartija ajetaan sekä valmentajan viesteille että valmentajan kirjausten tekstille', () => {
    expect(V2).toMatch(/_valmentajaViestit = _valmentajaViestit\.filter\(function \(v\) \{ return _vTekstiKelpaa\(_vViestiTeksti\(v\)\); \}\)/);
    expect(V2).toMatch(/k\.lahde !== 'valmentaja' \|\| _vTekstiKelpaa\(k\.teksti\)/);
  });
});
