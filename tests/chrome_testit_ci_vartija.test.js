/**
 * QG-1b: jokainen selaintesti ajetaan CI:ssä. Ennen QG-1b:tä 37 selaintestitiedostoa ei ajettu missään (unit-tests ohittaa ne TM_CHROME_TESTS=0:lla,
 * chrome-tests ajoi vain käsin listatut 15) → kuusi niistä oli vanhentunut huomaamatta ja kt_polku 390 px -vika näkyi vasta erillisajossa.
 * Lista: .github/chrome_testit.txt (test.yml:n chrome-tests jakaa sen neljään osaan). Selaintesti = tiedosto, joka lukee TM_CHROME_TESTS-muuttujaa
 * TAI käynnistää Chromen (Playwright-launch tai jaettu apuri tests/helpers/chrome_ajo.mjs).
 * Tämä vartija kaatuu, jos uusi selaintesti puuttuu listalta tai listalla on tiedosto, jota ei ole.
 * Selainvakaus (4.11.2026): vp_koti_pulssi_selain käynnisti Chromen ilman TM_CHROME_TESTS-ehtoa → ajettiin unit-testsissä satojen testien kuormassa ja
 * kaatui ilman tulosta, eikä vartija nähnyt sitä. Käsin käynnistetty `--dump-dom`-Chrome jäi chrome-osissa ajoittain tulostamatta mitään → kielletty.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTA = readFileSync(join(JUURI, '.github/chrome_testit.txt'), 'utf8').split('\n').map((r) => r.trim()).filter(Boolean);
const tiedostot = (kansio) => readdirSync(join(JUURI, kansio), { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? (e.name === 'rules' || e.name === 'fixtures' || e.name === 'helpers' ? [] : tiedostot(kansio + '/' + e.name)) : (e.name.endsWith('.test.js') ? [kansio + '/' + e.name] : []));
const KAYNNISTAA = /chromium\.launch|chrome_ajo\.mjs|selainKaynnista|--headless/;
const KAIKKI = tiedostot('tests').filter((f) => f !== 'tests/chrome_testit_ci_vartija.test.js').map((f) => [f, readFileSync(join(JUURI, f), 'utf8')]);
const SELAIN = KAIKKI.filter(([, s]) => /TM_CHROME_TESTS/.test(s) || KAYNNISTAA.test(s)).map(([f]) => f).sort();

describe('QG-1b · selaintestit CI-listalla', () => {
  it('jokainen TM_CHROME_TESTS-tiedosto on .github/chrome_testit.txt:ssä', () => {
    expect(SELAIN.filter((f) => !LISTA.includes(f))).toEqual([]);
  });
  it('listalla vain olemassa olevia selaintestejä, ei tuplia', () => {
    expect(LISTA.filter((f) => !existsSync(join(JUURI, f)))).toEqual([]);
    expect(LISTA.filter((f) => !SELAIN.includes(f))).toEqual([]);
    expect(new Set(LISTA).size).toBe(LISTA.length);
  });
  it('jokainen Chromen käynnistävä testi ohitetaan unit-testsissä (TM_CHROME_TESTS tai apurin CHROME_KAYTOSSA)', () => {
    expect(KAIKKI.filter(([, s]) => KAYNNISTAA.test(s) && !/TM_CHROME_TESTS|CHROME_KAYTOSSA/.test(s)).map(([f]) => f)).toEqual([]);
    expect(readFileSync(join(JUURI, 'tests/helpers/chrome_ajo.mjs'), 'utf8')).toContain("process.env.TM_CHROME_TESTS !== '0'");
  });
  it('ei käsin käynnistettyä --dump-dom-Chromea (jäi CI:ssä ajoittain ilman tulostetta): selain = Playwright / tests/helpers/chrome_ajo.mjs', () => {
    const LIPPU = new RegExp('[\'"]--dump' + '-dom[\'"]');   // prosessin argumenttina annettu lippu (kommenttimaininnat sallittu)
    expect(KAIKKI.filter(([, s]) => LIPPU.test(s)).map(([f]) => f)).toEqual([]);
    expect(LIPPU.test("spawn(CHROME, ['--headless=new', '--dump" + "-dom', url])")).toBe(true);   // ei vacuous
  });
  it('test.yml ajaa listan osina (ei käsin kirjoitettua tiedostolistaa)', () => {
    const yml = readFileSync(join(JUURI, '.github/workflows/test.yml'), 'utf8');
    expect(yml).toContain('.github/chrome_testit.txt'); expect(yml).toMatch(/--shard=\$\{\{ matrix\.osa \}\}\/4/);
    expect(yml).not.toMatch(/vitest run tests\/kentta_k0\.test\.js/);
  });
});
