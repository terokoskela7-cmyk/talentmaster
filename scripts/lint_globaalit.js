/* scripts/lint_globaalit.js — AJONAIKAISTEN GLOBAALIEN KERÄIN no-undef-portille (#60).
 *
 * Miksi: repo on multi-HTML + <script src>-libejä, joten yhdessä tiedostossa määritelty top-level-nimi
 * näkyy toisessa vain selaimen globaalissa skoopissa. ESLint ei näe sitä → vääriä no-undef-positiiveja.
 * Keräin skannaa lähteet ja palauttaa nimet globals-kartaksi.
 *
 * MIKSI ESPREE EIKÄ REGEX: vanha keräin etsi rivialkuisia määrittelyjä säännöllisillä lausekkeilla
 * (`^(?:let|const|var)\s+NAME`). Se poimi MONIDEKLARAATTORISTA vain ensimmäisen nimen, joten
 * `var XT_RIVIT = 8, XT_SARAKKEET = 12;` jätti XT_SARAKKEET:in keräämättä → portti punersi aivan
 * kelvollisesta koodista (main jäi punaiseksi). Nyt jäsennetään ESLintin omalla parserilla (espree) ja
 * kerätään Program.body:n määrittelyt AST:sta: monideklaraattorit, destrukturointi ja class-määrittelyt
 * tulevat mukaan oikein.
 *
 * MITÄ KERÄTÄÄN (sama rajaus kuin ennen — portin terävyys säilyy):
 *   (1) `window.X = …` -sijoitukset mistä tahansa syvyydestä (window.X-pattern)
 *   (2) TOP-LEVEL (Program.body) function / async function / class -määrittelyt
 *   (3) TOP-LEVEL let/const/var — kaikki deklaraattorit ja destrukturointinimet
 * Sisennetyt PAIKALLISET muuttujat EIVÄT kelpaa: ne eivät ole Program.body:ssä, joten esim.
 * "'sp is not defined" -defektiluokka jää yhä kiinni. Program.body on tässä tarkempi kuin vanha
 * sarake-0-heuristiikka (joka poimi myös sarakkeeseen 0 kirjoitetun lohkon sisällön).
 *
 * VARAKEINO: jos lähde ei jäsenny (bundler-lohko, legacy-sivun aito SyntaxError), palataan sen lohkon
 * osalta vanhaan regex-keräimeen, jottei portti ala punertaa jäsennysvirheen takia.
 */
const fs = require('fs');
const path = require('path');
const espree = require('espree');

const PARSE = [
  { ecmaVersion: 'latest', sourceType: 'script' },
  { ecmaVersion: 'latest', sourceType: 'module' },   // <script type="module">
];

/* Regex-varakeino (vanha keräin). Käytetään VAIN kun jäsennys ei onnistu. */
function keraaRegexilla(src, g) {
  const reWin = /window\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
  const reFn = /^(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/gm;
  const reVar = /^(?:let|const|var)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  let m;
  while ((m = reWin.exec(src))) g[m[1]] = 'readonly';
  while ((m = reFn.exec(src))) g[m[1]] = 'readonly';
  while ((m = reVar.exec(src))) g[m[1]] = 'readonly';
  return g;
}

/* Sidontakuvion nimet: Identifier · ObjectPattern · ArrayPattern · AssignmentPattern · RestElement. */
function keraaKuvio(node, g) {
  if (!node) return;
  if (node.type === 'Identifier') { g[node.name] = 'readonly'; return; }
  if (node.type === 'ObjectPattern') { (node.properties || []).forEach((pr) => keraaKuvio(pr.value || pr.argument, g)); return; }
  if (node.type === 'ArrayPattern') { (node.elements || []).forEach((el) => keraaKuvio(el, g)); return; }
  if (node.type === 'AssignmentPattern') { keraaKuvio(node.left, g); return; }
  if (node.type === 'RestElement') { keraaKuvio(node.argument, g); }
}

/* Kävele koko AST: window.X = … voi olla minkä tahansa funktion sisällä. */
function kavele(node, kasittele) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((n) => kavele(n, kasittele)); return; }
  if (typeof node.type === 'string') kasittele(node);
  Object.keys(node).forEach((k) => {
    if (k === 'parent' || k === 'loc' || k === 'range') return;
    const v = node[k];
    if (v && typeof v === 'object') kavele(v, kasittele);
  });
}

/** Kerää yhden JS-lähteen globaalit karttaan g. Palauttaa true jos jäsennys onnistui. */
function keraaLahteesta(src, g) {
  let ast = null;
  for (const opts of PARSE) {
    try { ast = espree.parse(src, opts); break; } catch (e) { /* kokeile seuraavaa */ }
  }
  if (!ast) { keraaRegexilla(src, g); return false; }
  (ast.body || []).forEach((n) => {
    if ((n.type === 'FunctionDeclaration' || n.type === 'ClassDeclaration') && n.id) g[n.id.name] = 'readonly';
    else if (n.type === 'VariableDeclaration') (n.declarations || []).forEach((d) => keraaKuvio(d.id, g));
  });
  kavele(ast, (n) => {
    if (n.type !== 'AssignmentExpression') return;
    const L = n.left;
    if (L && L.type === 'MemberExpression' && L.object && L.object.type === 'Identifier'
      && L.object.name === 'window' && L.property && L.property.type === 'Identifier') {
      g[L.property.name] = 'readonly';
    }
  });
  return true;
}

/* HTML: vain inline <script>-lohkot (ei src, ei JSON/bundler-tyypit). */
const EI_JS = /type\s*=\s*["'](?:application\/json|application\/ld\+json|text\/template|__bundler\/[^"']*)["']/i;

function keraaHtmlista(src, g) {
  const re = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(src))) {
    const attr = m[1] || '';
    if (/\ssrc\s*=/.test(attr) || EI_JS.test(attr)) continue;
    keraaLahteesta(m[2], g);
  }
  return g;
}

/** Kerää globaalit repon juuresta: juuren *.html + *.js sekä lib/*.js. */
function keraaGlobaalit(juuri) {
  const g = {};
  const tiedostot = [];
  try {
    fs.readdirSync(juuri).forEach((f) => { if (/\.(html|js)$/.test(f)) tiedostot.push(f); });
  } catch (e) { return g; }
  try {
    fs.readdirSync(path.join(juuri, 'lib')).forEach((f) => { if (/\.js$/.test(f)) tiedostot.push('lib/' + f); });
  } catch (e) { /* ohita */ }
  tiedostot.forEach((f) => {
    let src;
    try { src = fs.readFileSync(path.join(juuri, f), 'utf8'); } catch (e) { return; }
    if (/\.html$/.test(f)) keraaHtmlista(src, g);
    else keraaLahteesta(src, g);
  });
  return g;
}

module.exports = { keraaGlobaalit, keraaLahteesta, keraaHtmlista, keraaRegexilla };
