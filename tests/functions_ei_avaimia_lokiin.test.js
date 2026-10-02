/**
 * VARTIJA: functions/-koodi ei kirjoita lokiin API-avaimia eikä niiden osia (esim. substring/slice avaimesta).
 * Lokiviesti saa kertoa vain tilan ('OK' / 'PUUTTUU'). Skannaa jokaisen console.*(…)-kutsun KOKO lauseen
 * (myös usean rivin yli), riisuu merkkijonoliteraalit ja kommentit ja vaatii ettei jäljelle jää avain-/salaisuus-
 * tunnistetta tai process.env-viittausta.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');
const FN = join(juuri, 'functions');
const TIEDOSTOT = readdirSync(FN).filter((f) => f.endsWith('.js'));
const KIELLETTY = /api_?key|apikey|secret|passw|bearer|authorization|process\.env|private_?key|access_?key/i;

/** Palauttaa kaikki console.*(…)-lauseet {rivi, koodi}, sulut laskien (merkkijonot ohitetaan sulkulaskussa). */
function consoleLauseet(src) {
  const out = [];
  const re = /console\s*\.\s*(?:log|warn|error|info|debug)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, sy = 1, q = null;
    for (; i < src.length && sy > 0; i++) {
      const c = src[i];
      if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
      if (c === '"' || c === "'" || c === '`') { q = c; continue; }
      if (c === '(') sy++; else if (c === ')') sy--;
    }
    out.push({ rivi: src.slice(0, m.index).split('\n').length, koodi: src.slice(m.index, i) });
  }
  return out;
}
const ilmanLiteraaleja = (k) => k
  .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
  .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");

describe('functions/: ei avaimia lokiin', () => {
  it('EI VACUOUS: skanneri löytää console-kutsuja ja ymmärtää usean rivin lauseet', () => {
    const kaikki = TIEDOSTOT.flatMap((f) => consoleLauseet(readFileSync(join(FN, f), 'utf8')));
    expect(TIEDOSTOT).toContain('index.js');
    expect(kaikki.length).toBeGreaterThan(30);
    expect(consoleLauseet("console.log('a',\n  x ? 1 : 2);\nfoo()")[0].koodi).toBe("console.log('a',\n  x ? 1 : 2)");
  });
  it('negatiivitesti: vanha SendGrid-rivi (substring avaimesta) jäisi kiinni', () => {
    const vanha = "console.log('[SendGrid] SENDGRID_API_KEY:', apiKey\n    ? 'SG.' + apiKey.substring(3, 8) + '***' : 'PUUTTUU');";
    expect(KIELLETTY.test(ilmanLiteraaleja(consoleLauseet(vanha)[0].koodi))).toBe(true);
  });
  it('yksikään console.*-lause ei viittaa avaimeen, salaisuuteen, tunnisteeseen tai process.env:iin', () => {
    const rikkojat = [];
    for (const f of TIEDOSTOT) {
      for (const l of consoleLauseet(readFileSync(join(FN, f), 'utf8'))) {
        if (KIELLETTY.test(ilmanLiteraaleja(l.koodi))) rikkojat.push(f + ':' + l.rivi + '  ' + l.koodi.replace(/\s+/g, ' ').slice(0, 120));
      }
    }
    expect(rikkojat, 'lokita vain tila (OK/PUUTTUU), ei avainta eikä sen osia').toEqual([]);
  });
  it('SendGrid-lokirivi kertoo vain OK/PUUTTUU eikä käytä substring/slice avaimesta', () => {
    const s = readFileSync(join(FN, 'index.js'), 'utf8');
    expect(s).toContain("const avainTila = apiKey ? 'OK' : 'PUUTTUU';");
    expect(s).not.toMatch(/apiKey\s*\.\s*(substring|substr|slice)\(/);
  });
  it('avainmuuttujista ei oteta osajonoja missään functions/*.js:ssä', () => {
    const osajonot = [];
    for (const f of TIEDOSTOT) {
      readFileSync(join(FN, f), 'utf8').split('\n').forEach((r, i) => {
        if (/(api_?key|secret|token_?avain)[\w.]*\s*\.\s*(substring|substr|slice)\(/i.test(r)) osajonot.push(f + ':' + (i + 1));
      });
    }
    expect(osajonot).toEqual([]);
  });
});
