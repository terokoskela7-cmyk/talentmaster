/* tmPvmLocale / tmPvmFmt (sv-läpiajo PR 3): päivämäärät seuraavat kieltä; fi-tulos on ennallaan ('fi-FI'). */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const { tmPvmLocale, tmPvmFmt } = require('../lib/tm_lang.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = new Date(2026, 9, 5);   // ma 5.10.2026

describe('tmPvmLocale', () => {
  it('kieli → locale', () => {
    expect(tmPvmLocale('fi')).toBe('fi-FI');
    expect(tmPvmLocale('sv')).toBe('sv-FI');
    expect(tmPvmLocale('en')).toBe('en-GB');
  });
  it('tuntematon kieli → fi-FI; ilman argumenttia → nykyinen kieli (oletus fi)', () => {
    expect(tmPvmLocale('xx')).toBe('fi-FI');
    expect(tmPvmLocale()).toBe('fi-FI');
  });
});

describe('tmPvmFmt', () => {
  it('fi on tavutarkasti sama kuin entinen kovakoodattu toLocaleDateString("fi-FI")', () => {
    for (const o of [{ weekday: 'short', day: 'numeric', month: 'numeric' }, { day: 'numeric', month: 'numeric' }]) {
      expect(tmPvmFmt(D, o, 'fi')).toBe(D.toLocaleDateString('fi-FI', o));
    }
  });
  it('sv ja en eroavat fi:stä (viikonpäivä seuraa kieltä)', () => {
    const o = { weekday: 'short', day: 'numeric', month: 'numeric' };
    const fi = tmPvmFmt(D, o, 'fi'), sv = tmPvmFmt(D, o, 'sv'), en = tmPvmFmt(D, o, 'en');
    expect(new Set([fi, sv, en]).size).toBe(3);
    expect(sv.toLowerCase()).toContain('mån');
  });
});

describe('Vanhempi_v2 — ei kovakoodattua fi-FI-localea', () => {
  it('toLocaleDateString(\'fi-FI\') korvattu tmPvmFmt:llä', () => {
    const src = readFileSync(join(juuri, 'TalentMaster_Vanhempi_v2.html'), 'utf8');
    expect(src).not.toMatch(/toLocaleDateString\(\s*['"]fi-FI['"]/);
    expect((src.match(/tmPvmFmt\(/g) || []).length).toBeGreaterThanOrEqual(3);
  });
});
