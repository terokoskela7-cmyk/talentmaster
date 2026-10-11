/* Vartija: firebase-adminissa ei ole admin.applicationDefault() — oikea kutsu on admin.credential.applicationDefault() (#1006: skripti kaatui "is not a function"). */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const SCRIPTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'scripts');
const kaikki = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? (n === 'node_modules' ? [] : kaikki(p)) : (/\.(c|m)?js$/.test(n) ? [p] : []); });
describe('scripts/**: ADC-kutsu', () => {
  it('yksikään skripti ei kutsu admin.applicationDefault() (vain admin.credential.applicationDefault())', () => {
    const rikkoo = kaikki(SCRIPTS).filter((f) => /(?<!credential)\.applicationDefault\s*\(/.test(readFileSync(f, 'utf8')) || /admin\.applicationDefault/.test(readFileSync(f, 'utf8')));
    expect(rikkoo.map((f) => f.slice(SCRIPTS.length + 1))).toEqual([]);
  });
  it('käytetty API on olemassa firebase-adminissa', () => { const a = require('firebase-admin'); expect(typeof a.credential.applicationDefault).toBe('function'); expect(a.applicationDefault).toBeUndefined(); });
});
