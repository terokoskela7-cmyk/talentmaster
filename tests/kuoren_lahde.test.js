/**
 * Rivikattojen purku S0 · kuoren lähde ja siirtotarkistus.
 *
 * MIKSI: Seura.html:n koodi siirretään sellaisenaan seura/-kansioon (S1–S4). Lähdettä tekstinä lukevat testit
 * ja vartijat näkevät siirretyn koodin vain, jos ne lukevat kuoren scripts/kuoren_lahde.js:n kautta.
 * Tämä tiedosto vartioi, että (1) laajennus toimii, (2) jokainen kuoren osa on olemassa eikä orpoja osia ole,
 * (3) kukaan ei lue Seura.html:ää ohi laajennuksen ja (4) siirtotarkistus erottaa siirron muutoksesta.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { lueKuori, laajennaKuori, kuorenOsat, OSAKANSIOT } = require('../scripts/kuoren_lahde.js');
const { jasennaDiff, vertaa } = require('../scripts/siirtotarkistus.js');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..');

function tilapainen(tiedostot) {
  const d = mkdtempSync(join(tmpdir(), 'kuori-'));
  for (const [p, s] of Object.entries(tiedostot)) { mkdirSync(dirname(join(d, p)), { recursive: true }); writeFileSync(join(d, p), s); }
  return d;
}

describe('laajennaKuori', () => {
  const html = '<head><link rel="stylesheet" href="seura/seura.css">\n<script src="lib/tm_esc.js"></script></head>\n'
    + '<body><script src="seura/a.js?v=1234abcd"></script>\n<script>var KUORI = 1;</script>\n<script src="seura/b.js"></script></body>';
  const d = tilapainen({ 'seura/seura.css': '.x{color:var(--teal)}', 'seura/a.js': 'function a() {}', 'seura/b.js': 'var B = 2;', 'k.html': html });

  it('osatiedostot liitetään tagin paikalle, järjestys säilyy, lib/-tagi jää tagiksi', () => {
    const u = laajennaKuori(html, d);
    expect(u).toContain('<style data-kuoriosa="seura/seura.css">\n.x{color:var(--teal)}\n</style>');
    expect(u).toContain('<script data-kuoriosa="seura/a.js">\nfunction a() {}\n</script>');
    expect(u).toContain('<script src="lib/tm_esc.js"></script>');
    expect(u.indexOf('function a()')).toBeLessThan(u.indexOf('var KUORI'));
    expect(u.indexOf('var KUORI')).toBeLessThan(u.indexOf('var B = 2'));
    expect(u).not.toMatch(/src="seura\//);
  });
  it('kuorenOsat listaa osat lähdejärjestyksessä ilman ?v:tä', () => {
    expect(kuorenOsat(html)).toEqual([{ polku: 'seura/seura.css', tapa: 'css' }, { polku: 'seura/a.js', tapa: 'script' }, { polku: 'seura/b.js', tapa: 'script' }]);
  });
  it('lueKuori: HTML laajennetaan, muut tiedostot palautuvat sellaisinaan', () => {
    expect(lueKuori('k.html', d)).toContain('var B = 2;');
    expect(lueKuori('seura/b.js', d)).toBe('var B = 2;');
  });
  it('puuttuva osatiedosto heittää (ei hiljaista tyhjää)', () => {
    expect(() => laajennaKuori('<script src="seura/puuttuu.js"></script>', d)).toThrow(/puuttuu: seura\/puuttuu\.js/);
  });
  it('kuori ilman osaviittauksia palautuu tavu tavulta samana', () => {
    const s = readFileSync(join(juuri, 'TalentMaster_Admin.html'), 'utf8');
    expect(laajennaKuori(s, juuri)).toBe(s);
  });
});

describe('repon kuoret', () => {
  const html = readdirSync(juuri).filter((f) => f.endsWith('.html'));
  const viitatut = new Set(html.flatMap((f) => kuorenOsat(readFileSync(join(juuri, f), 'utf8')).map((o) => o.polku)));
  it('jokainen viitattu osatiedosto on olemassa', () => {
    expect([...viitatut].filter((p) => !existsSync(join(juuri, p)))).toEqual([]);
  });
  it('osakansioissa ei ole orpoja tiedostoja (jokainen .js/.css on jonkin kuoren lataama)', () => {
    const orvot = OSAKANSIOT.flatMap((k) => (existsSync(join(juuri, k)) ? readdirSync(join(juuri, k)) : [])
      .filter((f) => /\.(js|css)$/.test(f)).map((f) => k + f)).filter((p) => !viitatut.has(p));
    expect(orvot).toEqual([]);
  });
});

describe('vartija: Seura.html:n lähdettä ei lueta ohi kuoren_lahde.js:n', () => {
  /* Raakaa rakennetta tarvitsevat: kasvukatto laskee kuoren omat rivit, SDK-versioportti lukee head-tagit,
     tämä tiedosto testaa laajennusta raakaa tekstiä vasten. */
  const SALLITUT = new Set(['kuoret_kasvukatto.test.js', 'firebase_sdk_versio.test.js', 'kuoren_lahde.test.js']);
  const SUORA = /readFileSync\([^)]*TalentMaster_Seura\.html/;
  it('testit lukevat Seuran lueKuori():lla tai lataaSivu():lla', () => {
    const rikkojat = readdirSync(join(juuri, 'tests')).filter((f) => /\.(test\.)?(js|mjs|cjs)$/.test(f) && !SALLITUT.has(f))
      .filter((f) => SUORA.test(readFileSync(join(juuri, 'tests', f), 'utf8')));
    expect(rikkojat, 'lue Seura lueKuori():lla (scripts/kuoren_lahde.js), muuten seura/-kansioon siirretty koodi jää näkymättä').toEqual([]);
  });
});

describe('siirtotarkistus', () => {
  const diff = [
    'diff --git a/K.html b/K.html', '--- a/K.html', '+++ b/K.html', '@@ -1,3 +1,1 @@',
    '-function a() {', '-  return 1;', '-}', '+<script src="seura/a.js"></script>',
    'diff --git a/seura/a.js b/seura/a.js', '--- /dev/null', '+++ b/seura/a.js', '@@ -0,0 +1,3 @@',
    '+function a() {', '+  return 1;', '+}',
  ].join('\n');
  it('puhdas siirto: ylijäämänä vain uusi tagirivi', () => {
    const { pois, lisa } = jasennaDiff(diff);
    const r = vertaa(pois, lisa);
    expect(r.vainPoistettu).toEqual([]);
    expect(r.vainLisatty.map((x) => x.rivi)).toEqual(['<script src="seura/a.js"></script>']);
    expect(r.vainLisatty[0].tiedostot).toEqual(['K.html']);
  });
  it('siirron aikana muuttunut rivi näkyy molemmilla puolilla', () => {
    const { pois, lisa } = jasennaDiff(diff.replace('+  return 1;', '+  return 2;'));
    const r = vertaa(pois, lisa);
    expect(r.vainPoistettu.map((x) => x.rivi)).toEqual(['  return 1;']);
    expect(r.vainLisatty.map((x) => x.rivi).sort()).toEqual(['  return 2;', '<script src="seura/a.js"></script>'].sort());
  });
  it('sisennyksen muutos ei ole siirto', () => {
    const { pois, lisa } = jasennaDiff(diff.replace('+  return 1;', '+    return 1;'));
    expect(vertaa(pois, lisa).vainPoistettu.map((x) => x.rivi)).toEqual(['  return 1;']);
  });
});
