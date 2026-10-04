/**
 * §7.22-VAHTI — pelaajan ja huoltajan kortit (PR A, docs/PELAAJA_KORTIT_TILANNE.md #750).
 * PÄÄTÖS 4.10.2026 (Tero/projektinjohto): lapselle EI tasolukuja missään ikävaiheessa (CLAUDE.md §0 voittaa KORTTI_VISIO Osa B).
 *
 * Funktiot PURETAAN LÄHTEESTÄ ja AJETAAN (vm) "rikkaalla" pelaajadatalla, jossa on KAIKKI vuotolähteet: d1/d2/tki/adar/d3
 * (→ X/5 + OVR), tki 72 + tki_edellinen (→ TKI-luku/-delta), negatiivinen TK-trendi, laskeva mas_historia, hidden_gem/x_factor/
 * signaali (→ talenttisignaalit). Renderöity TEKSTI skannataan. Lisäksi: nopeus-legenda = "Huippuvauhtia" samasta tuloksesta,
 * oma ennätys -saavutus, Elite/Piilohelmi/X-Factor pois katalogista, huoltajan kausikortti.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import vm from 'vm';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PEL = readFileSync(join(ROOT, 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const V2 = readFileSync(join(ROOT, 'TalentMaster_Vanhempi_v2.html'), 'utf8');
const N = require('../lib/tm_eerikkila_normit.js');
const LANG = require('../lib/tm_lang.js');
const VUOSI = new Date().getFullYear();

function pura(lahde, tunniste) {
  const i = lahde.indexOf(tunniste); expect(i, tunniste).toBeGreaterThan(-1);
  let syv = 0;
  for (let k = lahde.indexOf('{', i); k < lahde.length; k++) { if (lahde[k] === '{') syv++; else if (lahde[k] === '}') { syv--; if (!syv) return lahde.slice(i, k + 1); } }
  throw new Error('sulkeet: ' + tunniste);
}
const teksti = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* Proxy-sandbox (kuten tests/pelaaja_722_kortti_tilastot.test.js): tuntematon apuri → stub, AIDOT funktiot ajetaan lähteestä. */
function sandbox(base) {
  const stub = new Proxy(function () {}, { apply() { return ''; }, get(t, k) { if (k === Symbol.toPrimitive) return () => ''; if (k === 'length') return 0; return stub; }, has() { return true; } });
  const sb = new Proxy(base, {
    has() { return true; },
    get(t, k) { if (k === Symbol.unscopables) return undefined; if (k in t) return t[k]; if (k === 'window') return sb; return stub; },
    set(t, k, v) { t[k] = v; return true; },
  });
  return vm.createContext(sb);
}
function lataaLib(ctx, f) { vm.runInContext(readFileSync(join(ROOT, f), 'utf8'), ctx); }

const PELAAJA_FN = ['function _thEsc(', 'function _laskeStage(', 'function _fcNaytaOvr(', 'function _fcKorttiData(', 'function _fcRengasSVG(',
  'function _minaTierVari(', 'function rMinaHero(', 'function naytaFcOverlay(', 'function rMinaTekniikkaprofiili(', 'function _signaaliLabel(',
  'function _minaHhHuipulla(', 'function _kkMitattuja(', 'function _ennRivit('];
function pelaajaCtx(p) {
  const fc = { innerHTML: '', classList: { add() {} } };
  const base = { console, Math, Date, JSON, String, Number, Object, Array, RegExp, Boolean, isNaN, parseFloat, parseInt, Proxy,
    _pelaaja: p, _streak: 9, _haeStreak: () => 9, _onkoSynttari: () => false, t: LANG.t,
    hhSeuraavaTaso: N.hhSeuraavaTaso, HH_TESTI_MAP: N.HH_TESTI_MAP,
    localStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: (id) => (id === 'fcOv' ? fc : null) } };
  const ctx = sandbox(base);
  lataaLib(ctx, 'lib/tm_kortti_rubriikit.js'); lataaLib(ctx, 'lib/tm_adar_rubriikki.js');
  vm.runInContext(PELAAJA_FN.map((f) => pura(PEL, f)).join('\n'), ctx);
  // KORTTI_KATALOGI on var-objekti (ei funktio) → puretaan erikseen
  const k0 = PEL.indexOf('var KORTTI_KATALOGI = {');
  vm.runInContext(PEL.slice(k0, PEL.indexOf('\n};', k0) + 3), ctx);
  ctx._fc = fc;
  return ctx;
}
// Rikas pelaaja: kaikki mitä vanha koodi muutti luvuiksi/signaaleiksi.
const rikas = (ika, extra) => Object.assign({
  id: 'm93GBdOaGCUuenMiCL0I', etunimi: 'Topias', sukunimi: 'Testi', sukupuoli: 'M', syntymaVuosi: VUOSI - ika, seuraId: 'kpv',
  flei_viimeisin: 62, d1_taso: 3.4, d2_taso: 3.2, tki_viimeisin: 72, tki_edellinen: 60, tki_merkki: 'hopea',
  d3_viimeisin: { pisteet: { a: { avg: 3.5 } } }, adar_viimeisin: { yht: 2.4 }, adar_havaintoja: 5,
  hh_viimeisin: { lin30m: 4.0 }, hh_taso: 5, hh_taso_edellinen: 1,
  hidden_gem: true, x_factor: true, signaali: 'x-factor', tki_vahvuus: 'syotto', tki_kehityskohde: 'pujottelu',
  mas_historia: [{ kmh: 14 }, { kmh: 12.5 }],
}, extra || {});

// Kielletyt muodot lapsen/huoltajan pinnalla (§7.22 + päätös 4.10.2026)
const KIELLETTY = [
  [/\/\s*5\b/, 'tasoluku X/5'], [/\btaso\s*\d/i, 'tasonumero'], [/\bOVR\b/, 'OVR'], [/\bTKI\b/, 'TKI-luku'],
  [/0\s*[–-]\s*99/, '0–99'], [/\d+\s*\/\s*100/, 'X/100'], [/\bElite\b/i, 'Elite-taso'],
  [/Piilohelmi|X-Factor|Hidden Gem/i, 'talenttisignaali'], [/kasvanut|tarkista kuormitus|lasku|heikkeni|huononi/i, 'negatiivinen ero'],
  [/\bXP\b/, 'XP'], [/menetät|putoat|sulkeutuu|häviät/i, 'loss aversion'], [/\btop\s*\d+\s*%|muihin verrattuna|joukkueen paras/i, 'vertailu muihin'],
];
function skannaa(s, nimi) {
  for (const [re, miksi] of KIELLETTY) expect(s, nimi + ': ' + miksi + ' (' + re + ')').not.toMatch(re);
}

describe('§7.22-vahti · Pelaaja_v7 renderöi rikkaalla datalla ilman tasolukuja/TKI:tä/signaaleja/negatiivisia eroja', () => {
  for (const [vaihe, ika] of [['leikkija', 11], ['rakentaja', 13], ['showcase', 17]]) {
    it(`${vaihe} (U${ika}): hero + flip-kortti (etu + taka)`, () => {
      const c = pelaajaCtx(rikas(ika));
      const hero = teksti(c.rMinaHero());
      expect(hero, 'hero ei renderöitynyt').toContain('Topias');
      skannaa(hero, 'hero');
      expect(hero).not.toMatch(/\b(72|66|62)\b/);   // ei tki/OVR/flei-lukua
      c.naytaFcOverlay();
      const fc = teksti(c._fc.innerHTML);
      expect(fc.length, 'flip ei renderöitynyt').toBeGreaterThan(200);
      skannaa(fc, 'flip');
      expect(fc).not.toMatch(/\b(72|66|62)\b/);
      expect(fc).toContain('✓');
    });
  }
  it('Tekniikkaprofiili: ei TKI-lukua, ei eliittisuhde-palkkeja, ei negatiivista trendiä; sekunnit + mitali näkyvät', () => {
    const c = pelaajaCtx(rikas(13));
    c._tekniikkaData = { tki: 72, merkki: 'hopea', vahvuudet: [], kehityskohteet: [], testit: { syotto: 9.2, pujottelu: 12.4 }, trendi: { ero: 3, parani: false }, kpl: 2 };
    const h = c.rMinaTekniikkaprofiili();
    const tx = teksti(h);
    skannaa(tx, 'tekniikka');
    expect(tx).not.toContain('72');
    expect(h, 'palkin täyttö = suhde eliittiviitteeseen').not.toMatch(/width:\s*\d+%/);
    expect(tx).toContain('9.2 s'); expect(tx).toContain('hopea');
    c._tekniikkaData.trendi = { ero: 3, parani: true };
    expect(teksti(c.rMinaTekniikkaprofiili())).toContain('parantunut 3 s');
  });
  it('signaalimerkki: X-Factor/Piilohelmi ei renderöidy; putki näkyy positiivisena', () => {
    for (const s of ['x-factor', 'gem']) skannaa(teksti(pelaajaCtx(rikas(13, { signaali: s }))._signaaliLabel()), 'signaali ' + s);
    expect(teksti(pelaajaCtx(rikas(13))._signaaliLabel())).toMatch(/9/);   // putki 9 pv
  });
  it('lähde: Tänään-kultakortti ei laske FLEI-lukua; MAS ei näytä laskua; showcase-OVR-portti suljettu', () => {
    expect(PEL).not.toMatch(/flei_viimeisin\|\|0\)\*0\.9\+10/);
    const mas = pura(PEL, 'function rMinaMAS(');
    expect(mas).not.toContain('tarkista kuormitus'); expect(mas).not.toContain('tarkista harjoitteluärsyke');
    expect(pura(PEL, 'function _fcNaytaOvr(')).toMatch(/return false;/);
  });
});

describe('Kokoelma · nopeus-legenda, oma ennätys, poistetut kortit', () => {
  it('SAMA 30 m tulos sytyttää "Huippuvauhtia"-tarkistuksen JA Nopeus-legendan (ennen avainvirhe → aina lukittu)', () => {
    const p = rikas(13);
    const c = pelaajaCtx(p);
    expect(c._minaHhHuipulla(p, 'lin30m')).toBe(true);
    const leg = c.KORTTI_KATALOGI.legendat.find((k) => k.id === 'legend_nopeus');
    expect(leg.ansainta(p)).toBe(true);
    expect(leg.ansainta(rikas(13, { hh_viimeisin: { lin30m: 5.9 } })), 'hidas tulos ei sytytä').toBe(false);
    // EI VACUOUS: vanha kutsu olisi palauttanut null (testit_indeksit-avaimet '30m'/'P')
    expect(N.hhSeuraavaTaso('lin30m', 4.0, 13, 'M').seuraavaTaso).toBeNull();
  });
  it('ach_omaennatys: ansaitaan vain kun oma tulos on voitettu (edellinen), ei 1. mittauksesta', () => {
    const k = pelaajaCtx(rikas(13)).KORTTI_KATALOGI.saavutukset.find((x) => x.id === 'ach_omaennatys');
    expect(k, 'ach_omaennatys puuttuu').toBeTruthy();
    expect(k.ansainta({ ennatykset: { lin30m: { paras: 4.0, edellinen: 5.9 } } })).toBe(true);
    expect(k.ansainta({ ennatykset: { lin30m: { paras: 5.9 } } })).toBe(false);
    expect(k.ansainta({})).toBe(false);
  });
  it('Elite, Piilohelmi ja X-Factor poissa; tier ei koskaan "elite" täydelläkään datalla', () => {
    const c = pelaajaCtx(rikas(17));
    const idt = Object.values(c.KORTTI_KATALOGI).flat().map((k) => k.id);
    for (const pois of ['tier_elite', 'rare_piilohelmi', 'rare_xfactor']) expect(idt).not.toContain(pois);
    expect(c._fcKorttiData(rikas(17, { sos: 5 })).tier).not.toBe('elite');
    expect(c._fcKorttiData(rikas(17)).traits.join(' ')).not.toMatch(/Piilohelmi/);
  });
});

/* ── Vanhempi_v2 ── */
function vanhempiCtx(lapsi) {
  const base = { console, Math, Date, JSON, String, Number, Object, Array, isNaN, t: LANG.t, tmPaivaIso: () => '2026-10-04',
    _age: 'u15', IKA: { u15: { nimi: 'Topias', ryhma: 'KPV U13' } }, ic: () => '' };
  const ctx = sandbox(base);
  ctx.window._lapsi = lapsi;
  const alku = V2.indexOf('const _VANH_LAJINIMI'), alku2 = V2.indexOf('const _VANH_ENN = {');
  vm.runInContext([V2.slice(alku, V2.indexOf(';', alku) + 1), V2.slice(V2.indexOf('const TUKIVINKIT'), V2.indexOf('};', V2.indexOf('const TUKIVINKIT')) + 2),
    V2.slice(alku2, V2.indexOf('};', alku2) + 2), pura(V2, 'function _genetiivi('), pura(V2, 'function _vEsc('), pura(V2, 'function _vanhValitavoite('),
    pura(V2, 'function _vanhEnnArvo('), pura(V2, 'function _vanhEnnPvm('), pura(V2, 'function rVanhempiEnnatykset('),
    pura(V2, 'function rVanhempiTekniikka('), pura(V2, 'function rKortti(')].join('\n'), ctx);
  return ctx;
}
describe('§7.22-vahti · Vanhempi_v2 (huoltaja)', () => {
  const lapsi = Object.assign(rikas(13), { kortti: 74, stage: 'Rakentaja', treeneja_kausi: 0, signaali: 'xfactor', streak: 9,
    tk_lajit_viimeisin: { syotto_s: 9.2, pujottelu_s: 12.4 }, tk_lajit_pvm: '2026-10-03', tk_kokonaistulos_viimeisin: 60,
    ennatykset: { lin30m: { paras: 4.0, pvm: '2026-10-03', edellinen: 5.9 } } });
  it('kausikortti: ei "Kortti 0–99"-lukua, ei Treenejä/Stage-tyhjiä, ei 2025/26, ei X-Factoria (myös demo), ei jaa-nappia; putki + ennätys näkyvät', () => {
    const h = vanhempiCtx(lapsi).rKortti();
    const tx = teksti(h);
    skannaa(tx, 'kausikortti');
    expect(tx).not.toContain('74'); expect(tx).not.toContain('2025/26'); expect(tx).not.toContain('Stage');
    expect(tx).not.toContain(LANG.TM_LANG.fi.vanhempi.kortti_treeneja); expect(tx).not.toContain(LANG.TM_LANG.fi.vanhempi.kortti_jaa_nappi);
    expect(tx).toContain('Streak'); expect(tx).toContain('9');
    expect(tx).toContain('Omat ennätykset'); expect(tx).toContain('4.0 s');
  });
  it('tekniikka: ei TKI-lukua eikä eliittisuhde-palkkeja; sekunnit + vahvuus + miten tukea', () => {
    const h = vanhempiCtx(lapsi).rVanhempiTekniikka();
    const tx = teksti(h);
    skannaa(tx, 'huoltajan tekniikka');
    expect(tx).not.toContain('72');
    expect(h).not.toMatch(/width:\s*\d+%/);
    expect(tx).toContain('9.2 s');
  });
});

describe('EI VACUOUS: vahti nappaa vanhat vuodot', () => {
  it('jokainen tunnettu vuotomuoto punertaa', () => {
    for (const huono of ['3/5', 'Nyt taso 4', 'OVR 66', '72 TKI', 'Kortti 0–99', '62 / 100', '⭐ Elite', '💎 Piilohelmi', '★ X-Factor',
      'Kokonaisaikasi on kasvanut 3 s', '↓ −0.4 m/s — lasku, tarkista kuormitus', '+50 XP', 'top 30 %']) {
      expect(KIELLETTY.some(([re]) => re.test(huono)), huono).toBe(true);
    }
  });
});
