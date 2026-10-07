/* Apuri (ei testi): lataa HTML-sivun inline-skriptien TOP-LEVEL-määrittelyt (funktiot, const/let/var, window.X = …) vm-kontekstiin oikeine libeineen, ilman sivun käynnistyskoodia.
   Jäsennys espree:llä (sama parseri kuin scripts/lint_globaalit.js). Jokainen lause ajetaan erikseen try/catchissa → yksittäisen määrittelyn virhe ei kaada muita.
   Käyttö: V4b-1 snapshot-testit (VP:n pelaajakortti ennen/jälkeen funktioiden erottamisen) ja Näyttö-testit. */
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import vm from 'vm';
const require = createRequire(import.meta.url);
const espree = require('espree');
const juuri = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export function lataaSivu(htmlTiedosto, extra) {
  const src = readFileSync(join(juuri, htmlTiedosto), 'utf8');
  const KIINTEA = new Date('2026-10-08T10:00:00Z').getTime(); class KDate extends Date { constructor(...a) { if (a.length) super(...a); else super(KIINTEA); } static now() { return KIINTEA; } }
  const ctx = { console: { warn() {}, log() {}, error() {} }, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, Date: KDate, Math, JSON, Object, Array, String, Number, Promise, RegExp, Error, isFinite, isNaN, parseFloat, parseInt, Map, Set, Symbol, encodeURIComponent, decodeURIComponent, Boolean, TypeError };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  ctx.document = { getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }), querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, body: { appendChild() {}, style: {} }, head: { appendChild() {} }, documentElement: { dataset: {} } };
  ctx.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; ctx.sessionStorage = ctx.localStorage; ctx.navigator = { onLine: true, userAgent: 'test' }; ctx.location = { hash: '', search: '', pathname: '/x', href: 'http://x/x' };
  ctx.addEventListener = () => {}; ctx.removeEventListener = () => {}; ctx.requestAnimationFrame = (f) => 0; ctx.matchMedia = () => ({ matches: false, addEventListener() {} }); ctx.history = { replaceState() {}, back() {} };
  vm.createContext(ctx);
  for (const m of src.matchAll(/<script src="(lib\/[^"?]+)(?:\?[^"]*)?"><\/script>/g)) { const p = join(juuri, m[1]); if (existsSync(p)) { try { vm.runInContext(readFileSync(p, 'utf8') + '\n;', ctx, { filename: m[1] }); } catch (e) { /* kuten selaimessa */ } } }
  const lohkot = [...src.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="module")[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  let ajettu = 0, virheita = 0;
  for (const koodi of lohkot) {
    let ast; try { ast = espree.parse(koodi, { ecmaVersion: 'latest', sourceType: 'script', range: true }); } catch (e) { continue; }
    for (const n of ast.body) {
      const win = n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression' && n.expression.left.type === 'MemberExpression' && n.expression.left.object.name === 'window';
      if (!(n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration' || n.type === 'VariableDeclaration' || win)) continue;
      let lause = koodi.slice(n.range[0], n.range[1]);
      if (n.type === 'VariableDeclaration' && n.kind !== 'var') lause = 'var' + lause.slice(n.kind.length);   // const/let → var: epäonnistunut alustus (esim. firebase puuttuu) jättää undefinedin, ei TDZ-ansaa
      try { vm.runInContext(lause, ctx); ajettu++; } catch (e) { virheita++; }
    }
  }
  Object.assign(ctx, extra || {});
  ctx.__lataus = { ajettu, virheita };
  return ctx;
}
