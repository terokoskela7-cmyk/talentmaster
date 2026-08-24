/**
 * TalentMaster - i18n V1-A2: Pelaaja_v7 syvanakymat (jatko V1-A:lle). Irrotus -> t('pelaaja.*').
 * S7.22 (tekniikka/tavoite): EI tasolukuja/percentiileja/TKI-laskua lapselle, ei vertailua/uhkaa.
 * INVARIANTIT: sv/en taydelliset (0 puuttuvaa) - fi ei rikkoudu (fallback) - ei kiellettya kielta sv/en.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const L = require('../lib/tm_lang.js');
const PEL = readFileSync(join(__dir, '..', 'TalentMaster_Pelaaja_v7.html'), 'utf8');

const KIELLETTY = /\bTKI\b|\bT[1-5]\b|percentil|better than|worse than/;

describe('tm_lang pelaaja.* laajennettu (V1-A2) sv/en taydelliset', () => {
  it('pelaaja-kategoria laajeni (>=50 avainta) ja sv/en 0 puuttuvaa (deep vs fi)', () => {
    const fi = L.TM_LANG.fi.pelaaja;
    expect(Object.keys(fi).length).toBeGreaterThanOrEqual(50);
    const puuttuu = [];
    const walk = (a, b, pre) => Object.keys(a).forEach((k) => {
      const p = pre ? pre + '.' + k : k;
      if (typeof a[k] === 'string') { if (typeof (b && b[k]) !== 'string') puuttuu.push(p); }
      else if (a[k] && typeof a[k] === 'object') walk(a[k], b && b[k], p);
    });
    walk(fi, L.TM_LANG.sv.pelaaja, 'sv');
    walk(fi, L.TM_LANG.en.pelaaja, 'en');
    expect(puuttuu).toEqual([]);
  });
  it('fi ei rikkoudu: fi-arvo palautuu; puuttuva avain -> avain itse', () => {
    L.tmAsetaKieli('fi', false);
    expect(L.t('pelaaja.streak')).toBe('🔥 Aloita putki tänään.');
    expect(L.t('pelaaja.ei_ole_avainta_xyz')).toBe('pelaaja.ei_ole_avainta_xyz');
  });
});

describe('S7.22 pelaaja sv/en ei sisalla tasolukuja/TKI-laskua/vertailua', () => {
  ['sv', 'en'].forEach((lang) => {
    it(lang + ': ei kiellettya S7.22-kielta', () => {
      const osumat = [];
      const walk = (o) => Object.values(o).forEach((v) => {
        if (typeof v === 'string') { if (KIELLETTY.test(v)) osumat.push(v.slice(0, 40)); }
        else if (v && typeof v === 'object') walk(v);
      });
      walk(L.TM_LANG[lang].pelaaja);
      expect(osumat).toEqual([]);
    });
  });
});

describe('V1-A2 irrotus + cache-bust', () => {
  it('Pelaaja kayttaa enemman t(pelaaja.*)-kutsuja (syvanakymat irrotettu)', () => {
    expect((PEL.match(/t\('pelaaja\./g) || []).length).toBeGreaterThanOrEqual(10);
  });
  it('tm_lang ?v=3 + SW-cache v14', () => {
    expect(PEL).toContain('lib/tm_lang.js?v=3');
    expect(readFileSync(join(__dir, '..', 'sw_pelaaja.js'), 'utf8')).toContain("const CACHE = 'tm-pelaaja-v14'");
  });
});
