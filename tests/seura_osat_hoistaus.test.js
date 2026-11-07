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

  it('JS-osa sisältää ylätasolla vain funktiomäärittelyjä ja window.X = function -sijoituksia (ei latausaikaista ajoa)', () => {
    for (const p of jsOsat) {
      const ast = acorn.parse(readFileSync(join(JUURI, p), 'utf8'), { ecmaVersion: 'latest', sourceType: 'script' });
      const muut = ast.body.filter((n) => !(n.type === 'FunctionDeclaration'
        || (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression'
          && n.expression.left.type === 'MemberExpression' && n.expression.left.object.name === 'window'
          && /FunctionExpression$/.test(n.expression.right.type))));
      expect(muut.map((n) => p + ':' + n.loc?.start.line + ' ' + n.type)).toEqual([]);
    }
  });
});
