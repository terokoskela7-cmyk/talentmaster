/**
 * TalentMaster™ — K1a: FLEI (Kehon valmius) Kehityskaareen (render-only, ei write-sidea).
 * flei_historia on jo pikakenttä → tmKaariFleiBlokki lisää FLEI-kaarirvin tmKaariRenderFull:iin (kooste-taso, suurempi parempi).
 * §7.22: EI pelaajapintaan (tmKaariRenderPelaaja ennallaan — K4 hoitaa variantin). Orpo _fleiSpark-kortti jätetty rauhaan.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const L = require('../lib/tm_kehityskaari.js');
const esc = (s) => String(s == null ? '' : s);
const __dir = dirname(fileURLToPath(import.meta.url));
const LIBSRC = readFileSync(join(__dir, '..', 'lib', 'tm_kehityskaari.js'), 'utf8');

describe('tmKaariFleiBlokki — FLEI-kaarirvi (suurempi parempi)', () => {
  it('nouseva → ↑ teal · lähtö→nyt · mittausmäärä', () => {
    const h = L.tmKaariFleiBlokki({ flei_historia: [{ flei: 55 }, { flei: 62 }] });
    expect(h).toContain('Kehon valmius · FLEI');
    expect(h).toContain('55→62');
    expect(h).toContain('↑');
    expect(h).toContain('var(--teal,#28B090)');
    expect(h).toContain('2 mitt.');
  });
  it('laskeva → ↓ amber (ei rankaisu-punainen)', () => {
    const h = L.tmKaariFleiBlokki({ flei_historia: [{ flei: 62 }, { flei: 55 }] });
    expect(h).toContain('↓');
    expect(h).toContain('var(--amber,#E0A040)');
  });
  it('datataso <2 → tyhjä (FLEI-kortti näyttää lähtöpisteen; ei fabrikointia)', () => {
    expect(L.tmKaariFleiBlokki({ flei_historia: [{ flei: 55 }] })).toBe('');
    expect(L.tmKaariFleiBlokki({})).toBe('');
    expect(L.tmKaariFleiBlokki({ flei_historia: [{ flei: null }, { flei: null }] })).toBe('');
  });
});

describe('kytkentä tmKaariRenderFull:iin', () => {
  it('FLEI-only-pelaaja → kaari näyttää FLEI-rivin (ei "täyttyy kun ≥2")', () => {
    const full = L.tmKaariRenderFull({ flei_historia: [{ flei: 55 }, { flei: 62 }] }, { esc });
    expect(full).toContain('Kehon valmius · FLEI');
    expect(full).not.toContain('Kehityskaari täyttyy kun mittauksia on ≥2');
  });
  it('FLEI + hh_historia → molemmat kaaressa (ei korvaa fyysisiä)', () => {
    const full = L.tmKaariRenderFull({ flei_historia: [{ flei: 55 }, { flei: 62 }], hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 4.8 }] }, { esc });
    expect(full).toContain('Kehon valmius · FLEI');
  });
  it('§7.22 — tmKaariRenderPelaaja EI vuoda VP-FLEI-blokin muotoa (raakaluvut/· FLEI/amber); §7.22-variantti = K4', () => {
    const pel = L.tmKaariRenderPelaaja({ flei_historia: [{ flei: 55 }, { flei: 62 }] }, { esc });
    expect(pel).not.toContain('Kehon valmius · FLEI');   // VP-otsikko (luvut) EI pelaajalle
    expect(pel).not.toContain('55→62');                   // ei raakalukuja pelaajapinnalle
    expect(pel).not.toContain('var(--amber');             // ei amberia pelaajan kaareen (K4 §7.22-turva)
  });
});

describe('koskemattomuus (ei koske §34/jaksofokus/K5a-ADARiin)', () => {
  it('lib säilyttää olemassa olevat lohkot', () => {
    expect(LIBSRC).toContain('function tmKaariAdarBlokki');       // K5a ennallaan
    expect(LIBSRC).toContain('function tmKaariJaksoSidos');       // jaksofokus-sidos ennallaan
    expect(LIBSRC).toContain('TKI-laskua <b>ei näytetä punaisena</b>');   // §34 kaksidelta ennallaan
    expect(LIBSRC).toContain('rivit + aggHtml + _fleiBlokki');    // FLEI kooste-tasolla
  });
});
