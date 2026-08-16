/**
 * TalentMaster™ — K5a: Pelaajan peliäly-kaari (ADAR ajassa, dimensioittain).
 * lib/tm_kehityskaari.js: per-dimensio (Havaitse/Päätä/Toimi/Arvioi) 2-piste (adar_edellinen→adar_viimeisin, §29-kuvio).
 * §28 ikäportti (U11 ≠ U16) · §7.22 pelaaja-variantti (ei tasolukuja/arvioijia/vertailua) · nykytila-ilman-nuolta rehellisesti.
 * Kaappaus (adar_edellinen) Master + ADAR_Pikakortti (pvm-vahti, ei clobbaa uudelleenlaskennassa).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lib = require('../lib/tm_kehityskaari.js');
const esc = (s) => String(s == null ? '' : s);
const VP = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');
const MASTER = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');
const PELAAJA = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');
const PIKAKORTTI = readFileSync(join(__dir, '..', 'TalentMaster_ADAR_Pikakortti.html'), 'utf8');

describe('tmKaariAdarDimensiot — §28 ikäportti + {nyt,lahto}', () => {
  it('U13 → band a/d/ac (R pois); rakentaa nyt+lahto', () => {
    const d = lib.tmKaariAdarDimensiot({ a: 2.4, d: 2.2, ac: 2.6, r: 2.0 }, { a: 2.1, d: 2.0, ac: 2.5, r: 1.9 }, 13);
    expect(Object.keys(d).sort()).toEqual(['a', 'ac', 'd']);   // r ei bandissa
    expect(d.a).toEqual({ nyt: 2.4, lahto: 2.1 });
  });
  it('U11 → vain a · U16 → a/d/ac/r · ikä null → kaikki', () => {
    expect(Object.keys(lib.tmKaariAdarDimensiot({ a: 2, d: 2, ac: 2, r: 2 }, null, 11))).toEqual(['a']);
    expect(Object.keys(lib.tmKaariAdarDimensiot({ a: 2, d: 2, ac: 2, r: 2 }, null, 16)).sort()).toEqual(['a', 'ac', 'd', 'r']);
    expect(Object.keys(lib.tmKaariAdarDimensiot({ a: 2, d: 2, ac: 2, r: 2 }, null, null)).length).toBe(4);
  });
  it('ei adar_viimeisin → null; lahto puuttuu → lahto:null', () => {
    expect(lib.tmKaariAdarDimensiot(null, null, 13)).toBe(null);
    expect(lib.tmKaariAdarDimensiot({ a: 2.4 }, null, 13).a).toEqual({ nyt: 2.4, lahto: null });
  });
});

describe('tmKaariAdarBlokki — VP täysi (2-piste palkit)', () => {
  it('2 pist. · lähtö→nyt · Havaitse/Päätä/Toimi · §28-guard · R pois U13', () => {
    const dim = lib.tmKaariAdarDimensiot({ a: 2.4, d: 2.2, ac: 2.6, r: 2.0 }, { a: 2.1, d: 2.0, ac: 2.5, r: 1.9 }, 13);
    const h = lib.tmKaariAdarBlokki(dim, { esc, ika: 13, havaintoja: 12 });
    expect(h).toContain('2 pist. · dimensioittain');
    expect(h).toContain('Havaitse (A)');
    expect(h).toContain('2.1→<b');       // lähtö→nyt
    expect(h).toContain('12 havaintoa');
    expect(h).toContain('U11 ≠ U16');    // §28-guard
    expect(h).not.toContain('Arvioi');   // R ei bandissa U13
  });
  it('nykytila-ilman-nuolta rehellisesti kun adar_edellinen puuttuu', () => {
    const dim = lib.tmKaariAdarDimensiot({ a: 2.4, d: 2.2, ac: 2.6 }, null, 13);
    const h = lib.tmKaariAdarBlokki(dim, { esc, ika: 13 });
    expect(h).toContain('nykytila · dimensioittain');
    expect(h).toContain('Ajassa täyttyy 2. havainnosta');
    expect(h).not.toContain('→');        // ei nuolta ilman lähtöä
  });
  it('parani → teal-palkki; ei-parani → ink3', () => {
    const h = lib.tmKaariAdarBlokki({ a: { nyt: 2.4, lahto: 2.1 }, d: { nyt: 2.0, lahto: 2.2 } }, { esc, ika: 16 });
    expect(h).toContain('var(--teal,#28B090)');   // a parani
    expect(h).toContain('var(--ink3,#6B82A8)');   // d ei parantunut
  });
});

describe('tmKaariAdarBlokki — Pelaaja §7.22 (ei lukuja/palkkeja/vertailua)', () => {
  it('vain parantunut dimensio "kehittyi", EI tasolukuja EI palkkeja', () => {
    const dim = lib.tmKaariAdarDimensiot({ a: 2.4, d: 2.0, ac: 2.6 }, { a: 2.1, d: 2.0, ac: 2.5 }, 13);
    const h = lib.tmKaariAdarBlokki(dim, { esc, ika: 13, rooli: 'pelaaja' });
    expect(h).toContain('kehittyi');
    expect(h).toContain('Havaitse');
    expect(h).not.toContain('Päätä');     // d ei parantunut → ei näytetä
    expect(h).not.toContain('2.4');       // §7.22 ei tasolukuja
    expect(h).not.toContain('width:');    // ei palkkeja (tasoindikaattori)
    expect(h).not.toContain('havaintoa'); // ei arvioijamäärää
  });
  it('ei parannusta (ei lähtöä) → tyhjä (ei "huononit")', () => {
    const dim = lib.tmKaariAdarDimensiot({ a: 2.4, d: 2.2 }, null, 13);
    expect(lib.tmKaariAdarBlokki(dim, { esc, ika: 13, rooli: 'pelaaja' })).toBe('');
  });
});

describe('tmKehityskaari adar-haara (TODO ratkaistu, option b: data.dimensiot)', () => {
  it('om=adar + data.dimensiot → per-dimensio (ei yhtä sparklinea)', () => {
    let html = '';
    const el = { ownerDocument: { getElementById: () => ({}), createElement: () => ({ appendChild() {} }), head: { appendChild() {} } }, set innerHTML(v) { html = v; }, get innerHTML() { return html; } };
    lib.tmKehityskaari(el, { ika: 16, dimensiot: { a: { nyt: 2.4, lahto: 2.1 }, r: { nyt: 2.0, lahto: 1.9 } } }, { ominaisuus: 'adar' });
    expect(html).toContain('peliäly · dimensioittain');
    expect(html).toContain('Havaitse (A)');
    expect(html).toContain('Arvioi (R)');   // U16 → R mukana
    expect(html).not.toContain('<svg');      // ei sparklinea
  });
});

describe('render-kytkentä (tmKaariRenderFull/Pelaaja + VP/Pelaaja-triggerit)', () => {
  it('lib: molemmat renderöijät sisällyttävät _adarBlokki:n', () => {
    const src = readFileSync(join(__dir, '..', 'lib', 'tm_kehityskaari.js'), 'utf8');
    expect(src).toContain('jaksoHtml + _adarBlokki');            // tmKaariRenderFull
    expect(src).toContain("rivit + _adarBlokki + '</div>';");    // tmKaariRenderPelaaja
    expect(src).toContain('!_adarBlokki');                       // tyhjä-tarkistukset
  });
  it('VP-trigger: kaari myös adar-only + ika ctx:iin (§28)', () => {
    expect(VP).toContain('|| p.adar_viimeisin');   // löysä: adar-only-trigger olemassa (ehtoa laajennettu K1a:ssa FLEI-only:lla)
    expect(VP).toContain('ika: _ksIsp.ika,');
  });
  it('Pelaaja-trigger: adar-only + ika', () => {
    expect(PELAAJA).toContain('|| p.adar_viimeisin;   // K5a');
    expect(PELAAJA).toContain('tmKaariRenderPelaaja(p, { ika: _ika })');
  });
});

describe('kaappaus (adar_edellinen, §29 pvm-vahti — ei clobbaa uudelleenlaskennassa)', () => {
  it('Master: kaappaa VAIN eri pvm:llä, conditional lisäys (merge säilyttää vanhan samalla pvm:llä)', () => {
    expect(MASTER).toContain('_oldAv = _pd.adar_viimeisin || null;');
    expect(MASTER).toContain('if (_oldAv && _oldAv.pvm && uusinPvm && _oldAv.pvm !== uusinPvm) {');
    expect(MASTER).toContain('_adarKentat.adar_edellinen = {');
  });
  it('ADAR_Pikakortti (bundler-template): sama kaappaus lukee vanhan + conditional (raw escapattu sisältö)', () => {
    // Raw-string-tarkistus (bundler-template = literaalit escapatun JSON:n sisällä; ei JSON.parse-riippuvuutta).
    expect(PIKAKORTTI).toContain('_oldAv = (_oldAvDoc && _oldAvDoc.exists && _oldAvDoc.data().adar_viimeisin) || null;');
    expect(PIKAKORTTI).toContain('if (_oldAv && _oldAv.pvm && uusinPvm && _oldAv.pvm !== uusinPvm) { _adarSet.adar_edellinen = { a: _oldAv.a');
    expect(PIKAKORTTI).toContain('await _pRef.set(_adarSet, { merge: true });');
  });
  it('SW-cache nostettu (§27, Pelaaja-app muuttui)', () => {
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toContain("const CACHE = 'tm-pelaaja-v11';");
  });
});
