/**
 * TalentMaster™ — K4: Kehityskaari pelaaja §7.22 -variantti (tmKaariRenderPelaaja).
 * (A) FLEI → "Kehon valmius" §7.22: vain kun PARANI (suurempi parempi), positiivinen verbi + sparkline;
 *     EI lukuja/amber/normia (VP:n tmKaariFleiBlokki näyttää ne → ei kutsuta pelaajapinnassa).
 * (B) §22 alusta-vartija: pelaaja-render segmentoi sekava-alusta-sarjan (jaettu _alustaSegmentoi _testiRivin kanssa)
 *     → nurmi→halli EI tuota valhe-"30 m nopeutui". VP _testiRivi käytös identtinen (⚠-merkki säilyy).
 * §28: pre-PHV / ei-parannusta = kannustava neutraali (EI "huononit"). Ei punaista/amberia pelaajan kaareen.
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
const PELAAJA = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

describe('K4 (A) — FLEI "Kehon valmius" §7.22 pelaaja-variantti', () => {
  it('FLEI parani → "Kehon valmius parani" positiivisena, EI lukuja/amber/· FLEI', () => {
    const h = L.tmKaariRenderPelaaja({ flei_historia: [{ flei: 55 }, { flei: 62 }] }, { esc });
    expect(h).toContain('Kehon valmius parani');
    expect(h).toContain('Kehityit');
    expect(h).toContain('<svg');                 // sparkline
    expect(h).not.toContain('55');               // ei raakalukuja
    expect(h).not.toContain('62');
    expect(h).not.toContain('· FLEI');           // ei VP-otsikkoa
    expect(h).not.toContain('var(--amber');      // ei amberia
  });
  it('FLEI laski → EI näytetä (§28 ei "huononit"), ei amber/punainen', () => {
    const h = L.tmKaariRenderPelaaja({ flei_historia: [{ flei: 62 }, { flei: 55 }] }, { esc });
    expect(h).not.toContain('Kehon valmius parani');
    expect(h).not.toContain('var(--amber');
    expect(h).not.toContain('#C94040');
  });
  it('FLEI-only-parannus → "Kehityit!" (ei honest-empty-seed)', () => {
    const h = L.tmKaariRenderPelaaja({ flei_historia: [{ flei: 55 }, { flei: 62 }] }, { esc });
    expect(h).not.toContain('täyttyy kun sinulla on ≥2');
  });
  it('FLEI <2 mittausta → ei riviä', () => {
    expect(L.tmKaariRenderPelaaja({ flei_historia: [{ flei: 62 }] }, { esc })).not.toContain('Kehon valmius parani');
  });
});

describe('K4 (B) — §22 alusta-vartija pelaaja-renderissä', () => {
  it('sekava alusta (nurmi→halli) → EI valhe-"30 m nopeutui" (segmentoitu)', () => {
    const h = L.tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'halli' }] }, { esc });
    expect(h).not.toContain('30 m nopeutui');
  });
  it('sama alusta (nurmi→nurmi) aito parannus → näkyy', () => {
    const h = L.tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'nurmi' }] }, { esc });
    expect(h).toContain('30 m nopeutui');
  });
  it('null-alusta (vanha data) → vertailukelpoinen, näkyy (ei regressiota)', () => {
    const h = L.tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0 }, { pvm: '2026-06-01', lin30m: 4.8 }] }, { esc });
    expect(h).toContain('30 m nopeutui');
  });
  it('pelaajalle EI näytetä ⚠-alusta-merkkiä (§7.22: ei amber-varoitusta pelaajan kaareen)', () => {
    const h = L.tmKaariRenderPelaaja({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'halli' }] }, { esc });
    expect(h).not.toContain('⚠');
  });
});

describe('K4 — jaettu _alustaSegmentoi (extract-and-share) · VP käytös identtinen', () => {
  it('lib sisältää jaetun helperin ja _testiRivi käyttää sitä', () => {
    expect(LIBSRC).toContain('function _alustaSegmentoi(avain, sarja)');
    expect(LIBSRC).toContain('var _seg = _alustaSegmentoi(avain, sarja);');
  });
  it('VP-regressio: tmKaariRenderFull sekava-alusta → ⚠-merkki + ei cross-alusta-deltaa (K1b säilyy)', () => {
    const vp = L.tmKaariRenderFull({ hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'halli' }] }, { esc });
    expect(vp).toContain('⚠ halli');
    expect(vp).not.toContain('5→4.8');
  });
});

describe('K4 — koskemattomuus (§7.22 · K5a-ADAR · ei kiellettyä väriä)', () => {
  it('K5a ADAR-pelaajahaara ennallaan (rooli:pelaaja, positiivinen)', () => {
    expect(LIBSRC).toContain("rooli: 'pelaaja'");
    expect(LIBSRC).toContain('function tmKaariAdarBlokki');
  });
  it('pelaajan kaaressa ei kiellettyjä brändivärejä (§5) eikä amberia/punaista', () => {
    const h = L.tmKaariRenderPelaaja({ flei_historia: [{ flei: 55 }, { flei: 62 }], hh_historia: [{ pvm: '2026-01-01', lin30m: 5.0, alusta: 'nurmi' }, { pvm: '2026-06-01', lin30m: 4.8, alusta: 'nurmi' }] }, { esc });
    expect(/c060a8|3EC9A7|4A7ED9/i.test(h)).toBe(false);
    expect(h).not.toContain('var(--amber');
    expect(h).not.toContain('#C94040');
  });
  it('Pelaaja_v7 lataa lib ?v=4 (K4 vaatii lataus)', () => {
    expect(PELAAJA).toContain('lib/tm_kehityskaari.js?v=4');
  });
});
