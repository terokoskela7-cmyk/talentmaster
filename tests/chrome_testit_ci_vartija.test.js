/**
 * QG-1b: jokainen selaintesti ajetaan CI:ssä. Ennen QG-1b:tä 37 selaintestitiedostoa ei ajettu missään (unit-tests ohittaa ne TM_CHROME_TESTS=0:lla,
 * chrome-tests ajoi vain käsin listatut 15) → kuusi niistä oli vanhentunut huomaamatta ja kt_polku 390 px -vika näkyi vasta erillisajossa.
 * Lista: .github/chrome_testit.txt (test.yml:n chrome-tests jakaa sen neljään osaan). Selaintesti = tiedosto, joka lukee TM_CHROME_TESTS-muuttujaa.
 * Tämä vartija kaatuu, jos uusi selaintesti puuttuu listalta tai listalla on tiedosto, jota ei ole.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTA = readFileSync(join(JUURI, '.github/chrome_testit.txt'), 'utf8').split('\n').map((r) => r.trim()).filter(Boolean);
const tiedostot = (kansio) => readdirSync(join(JUURI, kansio), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === 'rules' || e.name === 'fixtures' || e.name === 'helpers' ? [] : tiedostot(kansio + '/' + e.name)) : (e.name.endsWith('.test.js') ? [kansio + '/' + e.name] : []));
const SELAIN = tiedostot('tests').filter((f) => /TM_CHROME_TESTS/.test(readFileSync(join(JUURI, f), 'utf8')) && f !== 'tests/chrome_testit_ci_vartija.test.js').sort();

describe('QG-1b · selaintestit CI-listalla', () => {
  it('jokainen TM_CHROME_TESTS-tiedosto on .github/chrome_testit.txt:ssä', () => {
    expect(SELAIN.filter((f) => !LISTA.includes(f))).toEqual([]);
  });
  it('listalla vain olemassa olevia selaintestejä, ei tuplia', () => {
    expect(LISTA.filter((f) => !existsSync(join(JUURI, f)))).toEqual([]);
    expect(LISTA.filter((f) => !SELAIN.includes(f))).toEqual([]);
    expect(new Set(LISTA).size).toBe(LISTA.length);
  });
  it('test.yml ajaa listan osina (ei käsin kirjoitettua tiedostolistaa)', () => {
    const yml = readFileSync(join(JUURI, '.github/workflows/test.yml'), 'utf8');
    expect(yml).toContain('.github/chrome_testit.txt'); expect(yml).toMatch(/--shard=\$\{\{ matrix\.osa \}\}\/4/);
    expect(yml).not.toMatch(/vitest run tests\/kentta_k0\.test\.js/);
  });
});
