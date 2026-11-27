/**
 * Rivikattojen purku S2a · Seuran JS-osat ladataan ENNEN kuoren inline-lohkoa.
 *
 * Miksi: inline-lohkon funktiomäärittelyt hoistautuivat lohkon alkuun. Jos ulkoinen <script src> jakaisi lohkon,
 * selain voi palata tapahtumasilmukkaan tiedostoa hakiessaan, ja onAuthStateChanged-kutsu (lohkon alussa) ehtisi
 * ajaa ennen kuin loppuosan funktiot on määritelty → ReferenceError. Kun osa ladataan ennen lohkoa ja sisältää
 * vain määrittelyjä, se vastaa hoistausta: funktiot ovat olemassa jo lohkon alkaessa, ja lohko pysyy ehjänä.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const require = createRequire(import.meta.url);
const acorn = require('acorn');
const JUURI = join(dirname(fileURLToPath(import.meta.url)), '..');
const { kuorenOsat } = require('../scripts/kuoren_lahde.js');
const KUORI = readFileSync(join(JUURI, 'TalentMaster_Seura.html'), 'utf8');
const jsOsat = kuorenOsat(KUORI).map((o) => o.polku).filter((p) => /\.js$/.test(p));

describe('S2a · Seuran JS-osat: ennen inline-lohkoa, vain määrittelyjä', () => {
  it('EI VACUOUS: seura/seura_kutsut.js on kuoren osa', () => {
    expect(jsOsat).toContain('seura/seura_kutsut.js');
  });

  it('jokainen JS-osa ladataan ennen ensimmäistä inline-<script>-lohkoa (lohkoa ei jaeta)', () => {
    const inline = KUORI.search(/<script>\s*\n/);
    expect(inline).toBeGreaterThan(0);
    for (const p of jsOsat) {
      const i = KUORI.indexOf('<script src="' + p + '"');
      expect(i, p).toBeGreaterThan(0);
      expect(i < inline, p + ' ennen inline-lohkoa').toBe(true);
    }
    expect(KUORI.match(/<script>\s*\n/g)).toHaveLength(1);
  });

  /* PM 7.11. (S2b): ylätasolla sallitaan funktiomäärittelyt, window.X = function -sijoitukset ja muuttujat, joiden alkuarvo on tyhjä
     ([], {}, null, '', 0 tai ei alkuarvoa). Muu ylätason lause (DOM-kutsu, kuuntelija, laskettu arvo) = pysähdy ja kysy PM:ltä. */
  const tyhja = (e) => !e || (e.type === 'ArrayExpression' && e.elements.length === 0) || (e.type === 'ObjectExpression' && e.properties.length === 0)
    || (e.type === 'Literal' && (e.value === null || e.value === '' || e.value === 0));
  /* PM 7.11. (S3): const-vakio, jonka arvo on pelkkä merkkijono tai luku (template vain ilman ${}). Ei let/var, ei laskettua arvoa. */
  const vakio = (e) => !!e && ((e.type === 'Literal' && (typeof e.value === 'string' || typeof e.value === 'number'))
    || (e.type === 'TemplateLiteral' && e.expressions.length === 0));
  const sallittu = (n) => n.type === 'FunctionDeclaration'
    || (n.type === 'VariableDeclaration' && n.declarations.every((d) => d.id.type === 'Identifier' && (tyhja(d.init) || (n.kind === 'const' && vakio(d.init)))))
    || (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression'
      && n.expression.left.type === 'MemberExpression' && n.expression.left.object.name === 'window'
      && /FunctionExpression$/.test(n.expression.right.type));
  const jasenna = (src) => acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', locations: true });

  it('JS-osan ylätasolla vain määrittelyt ja tyhjät alkuarvot (ei latausaikaista ajoa)', () => {
    for (const p of jsOsat) {
      const muut = jasenna(readFileSync(join(JUURI, p), 'utf8')).body.filter((n) => !sallittu(n));
      expect(muut.map((n) => p + ':' + n.loc.start.line + ' ' + n.type)).toEqual([]);
    }
  });

  it('vartija tunnistaa kielletyt: laskettu alkuarvo, DOM-kutsu, kuuntelija', () => {
    for (const src of ['let a = [1];', 'const b = foo();', "document.getElementById('x');", "window.addEventListener('load', f);", 'var c = { x: 1 };', "let d = 'x';",
      'var e = 10;', 'const f = `a${x}`;', 'const g = -1;', 'const h = 1 + 2;', "const i = 'a' + 'b';", 'const j = [1, 2];', 'const k = true;', 'const l = /x/;']) {
      expect(jasenna(src).body.every(sallittu), src).toBe(false);
    }
    expect(jasenna("let a = []; var b = {}; let c = null, d = '', e = 0, f; function g() {} window.h = async function () {};").body.every(sallittu)).toBe(true);
    expect(jasenna("const m = 'teksti'; const n = 10; const o = `pohja ilman lausekkeita`; const p = 0.5;").body.every(sallittu)).toBe(true);
  });

  /* Sama ylätason nimi kahdessa tiedostossa: let/const → SyntaxError koko skriptille, function → myöhempi korvaa aiemman hiljaa.
     Vertailuun kuuluvat kaikki JS-osat ja kuoren inline-lohko. */
  const nimet = (ast) => ast.body.flatMap((n) => n.type === 'FunctionDeclaration' ? [n.id.name]
    : n.type === 'VariableDeclaration' ? n.declarations.map((d) => d.id.name)
      : (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.left.type === 'MemberExpression'
        && n.expression.left.object.name === 'window' && !n.expression.left.computed) ? ['window.' + n.expression.left.property.name] : []);

  it('sama ylätason nimi ei ole määritelty kahdessa tiedostossa (JS-osat + kuoren inline-lohko)', () => {
    const inline = KUORI.slice(KUORI.search(/<script>\s*\n/) + '<script>'.length, KUORI.lastIndexOf('</script>'));
    const lahteet = [['TalentMaster_Seura.html (inline)', inline], ...jsOsat.map((p) => [p, readFileSync(join(JUURI, p), 'utf8')])];
    const missa = new Map();
    for (const [tiedosto, src] of lahteet) for (const n of new Set(nimet(jasenna(src)))) missa.set(n, [...(missa.get(n) || []), tiedosto]);
    const tuplat = [...missa].filter(([, t]) => t.length > 1).map(([n, t]) => n + ': ' + t.join(' + '));
    expect(tuplat).toEqual([]);
    expect(missa.size).toBeGreaterThan(100);   // EI VACUOUS: inline-lohkon nimet ovat mukana
  });

  it('EI VACUOUS: S3:n vakiot ovat seura_pelaajahallinta.js:ssä ja kuuluvat tuplanimitarkistukseen', () => {
    const n = nimet(jasenna(readFileSync(join(JUURI, 'seura/seura_pelaajahallinta.js'), 'utf8')));
    expect(n).toEqual(expect.arrayContaining(['PIN_SUOSTUMUS_PUUTTUU', 'KORTTI_ERA']));
  });

  it('EI VACUOUS: S2b:n tyhjät tilamuuttujat ovat seura_tuonti.js:ssä', () => {
    const n = nimet(jasenna(readFileSync(join(JUURI, 'seura/seura_tuonti.js'), 'utf8')));
    expect(n).toEqual(expect.arrayContaining(['_massakutsuData', '_massakutsuDataKaikki', '_excelData']));
  });
});
