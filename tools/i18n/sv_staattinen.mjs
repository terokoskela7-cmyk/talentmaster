#!/usr/bin/env node
/* sv-läpiajon STAATTINEN skanneri (docs/CODE_BRIEF_I18N_SV_LAPIAJO.md; KARTOITUS §8 "AST-skannaus"): löytää sovelluksen lähteestä kaiken reitittämättömän kovakoodatun suomen,
   myös ne näkymät joita ajonaikainen läpiajo ei saavuta demo-datalla (autentikoidut/datariippuvaiset renderöijät).
   Jäsentää HTML:n inline-skriptit (acorn), kerää merkkijono- ja template-literaalit, kokoaa HTML-tekstit/attribuutit (title, placeholder, aria-label, alt) ja tunnistaa suomen
   (sv_lapiajo_fi.mjs). Reititetyksi katsotaan literaali joka on routteri-kutsun (T, t, vpT, masterT, _p7K1T, _vKpT, tmLibT, …) argumentti.
   Ajo: node tools/i18n/sv_staattinen.mjs <tiedosto.html> [--json] [--ryhmat]    → rivit: rivi · renderöijä · konteksti · teksti */
import { readFileSync } from 'fs';
import * as acorn from 'acorn';
import { onkoSuomea } from './sv_lapiajo_fi.mjs';

export const ROUTERIT = new Set(['T', 't', 'vpT', 'masterT', '_p7K1T', '_vKpT', 'tmLibT', 'tx', '_tr', 'tmT']);
const EI_UI_KUTSUT = new Set(['getElementById', 'querySelector', 'querySelectorAll', 'getAttribute', 'hasAttribute', 'removeAttribute', 'addEventListener', 'removeEventListener', 'log', 'warn', 'error', 'info', 'debug',
  'collection', 'doc', 'where', 'orderBy', 'getItem', 'setItem', 'removeItem', 'matches', 'closest', 'createElement', 'require', 'import', 'httpsCallable', 'functions', 'getComputedStyle', 'dispatchEvent', 'postMessage',
  'toLocaleDateString', 'toLocaleTimeString', 'toLocaleString', 'Intl', 'DateTimeFormat', 'RegExp', 'test', 'exec', 'match', 'padStart', 'padEnd', 'startsWith', 'endsWith', 'indexOf', 'includes', 'split', 'localeCompare']);
const TEKNINEN = /^(?:[\w.#:\-\/\[\]="'*>+~,() ]|\$\{[^}]*\})*$/;   // CSS-valitsin / polku / tunniste -tyyppinen

export function skannaaHtml(src, tiedosto) {
  const loydot = []; const virheet = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(src))) {
    const koodi = m[1]; const alkuRivi = src.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;   // skriptin 1. rivin offset
    if (!koodi.trim()) continue;
    let ast;
    try { ast = acorn.parse(koodi, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); }
    catch (e) { virheet.push({ rivi: alkuRivi + (e.loc ? e.loc.line : 0), virhe: e.message }); continue; }
    kavele(ast, [], koodi, alkuRivi, loydot);
  }
  return { loydot, virheet };
}

function funktionNimi(polku) {
  for (let i = polku.length - 1; i >= 0; i--) {
    const n = polku[i];
    if (n.type === 'FunctionDeclaration' && n.id) return n.id.name;
    if ((n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression')) {
      const p = polku[i - 1];
      if (p && p.type === 'VariableDeclarator' && p.id && p.id.name) return p.id.name;
      if (p && p.type === 'AssignmentExpression' && p.left) return p.left.name || (p.left.property && p.left.property.name) || null;
      if (p && p.type === 'Property' && p.key) return p.key.name || p.key.value;
    }
  }
  return '(ylätaso)';
}
function kutsunNimi(c) { const f = c.callee; if (!f) return null; if (f.type === 'Identifier') return f.name; if (f.type === 'MemberExpression' && f.property) return f.property.name || f.property.value; return null; }

function kavele(n, polku, koodi, off, ulos) {
  if (!n || typeof n.type !== 'string') return;
  const uusi = polku.concat(n);
  if (n.type === 'Literal' && typeof n.value === 'string') arvioi(n.value, n, polku, off, ulos);
  else if (n.type === 'TemplateElement') arvioi(n.value.cooked == null ? n.value.raw : n.value.cooked, n, polku, off, ulos);
  for (const k of Object.keys(n)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'type') continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach((x) => kavele(x, uusi, koodi, off, ulos)); else if (v && typeof v.type === 'string') kavele(v, uusi, koodi, off, ulos);
  }
}

function reititetty(polku, n) {
  // literaali on routterikutsun suora argumentti (myös a ? 'x' : 'y' ja + -ketjut sen sisällä)
  for (let i = polku.length - 1; i >= 0; i--) {
    const p = polku[i];
    if (p.type === 'CallExpression') { const nimi = kutsunNimi(p); return ROUTERIT.has(nimi) ? 'reititetty' : (EI_UI_KUTSUT.has(nimi) ? 'ei-ui-kutsu' : null); }
    if (p.type === 'Property' && p.key === n && !p.computed) return 'avain';
    if (p.type === 'MemberExpression' && p.computed && p.property === n) return 'avain';
    if (p.type === 'ImportDeclaration' || p.type === 'ExportNamedDeclaration') return 'moduuli';
    if (p.type === 'BinaryExpression' && ['===', '!==', '==', '!='].includes(p.operator)) return 'vertailu';
    if (p.type === 'SwitchCase' && p.test === n) return 'vertailu';
    if (/Function/.test(p.type) || p.type === 'Program') return null;
  }
  return null;
}

function tekstit(s) {
  // palauttaa [{teksti, tyyppi}] — HTML-tekstit (tagien välissä) ja attribuutit (title/placeholder/aria-label/alt), tai koko merkkijono kun ei markupia
  const ulos = [];
  const puhdas = (x) => x.replace(/\$\{[^}]*\}/g, ' ').replace(/&(?:nbsp|amp|quot|lt|gt|middot|bull|#\d+);/g, ' ').replace(/\s+/g, ' ').trim();
  if (/<[a-zA-Z\/!]/.test(s)) {
    for (const mm of s.matchAll(/(?:^|>)([^<>]+)(?=<|$)/g)) { const t = puhdas(mm[1]); if (t) ulos.push({ teksti: t, tyyppi: 'html-teksti' }); }
    for (const mm of s.matchAll(/\b(title|placeholder|aria-label|alt)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) { const t = puhdas(mm[2] != null ? mm[2] : mm[3]); if (t) ulos.push({ teksti: t, tyyppi: mm[1] }); }
  } else { const t = puhdas(s); if (t) ulos.push({ teksti: t, tyyppi: 'merkkijono' }); }
  return ulos;
}

function arvioi(s, n, polku, off, ulos) {
  if (!s || s.length < 3 || s.length > 900) return;
  const kont = reititetty(polku, n); if (kont) return;
  for (const { teksti, tyyppi } of tekstit(s)) {
    if (teksti.length < 3 || !/[A-Za-zÅÄÖåäö]{3}/.test(teksti)) continue;
    if (tyyppi === 'merkkijono' && !/\s/.test(teksti) && !/^[A-ZÅÄÖ]/.test(teksti) && !/[åäö]/i.test(teksti)) continue;   // tunniste/avain (kaynnissa, jaksofokus)
    if (tyyppi === 'merkkijono' && TEKNINEN.test(teksti) && !/[åäö]/i.test(teksti) && !/\s[A-Za-zåäö]{3,}/.test(teksti)) continue;
    if (/^(?:https?:|\/|\.\/|[a-z]+:\/\/)/.test(teksti) || /\.(?:js|css|png|svg|json|html)\b/.test(teksti)) continue;
    const f = onkoSuomea(teksti); if (!f.fi) continue;
    ulos.push({ rivi: off + n.loc.start.line, renderoija: funktionNimi(polku), tyyppi, teksti });
  }
}

if (process.argv[1] && process.argv[1].endsWith('sv_staattinen.mjs')) {
  const tiedosto = process.argv[2]; if (!tiedosto) { console.error('käyttö: node tools/i18n/sv_staattinen.mjs <tiedosto.html> [--json] [--ryhmat]'); process.exit(2); }
  const { loydot, virheet } = skannaaHtml(readFileSync(tiedosto, 'utf8'), tiedosto);
  if (process.argv.includes('--json')) console.log(JSON.stringify({ tiedosto, virheet, loydot }, null, 1));
  else if (process.argv.includes('--ryhmat')) {
    const g = {}; loydot.forEach((x) => { (g[x.renderoija] = g[x.renderoija] || []).push(x); });
    console.log(tiedosto + ': ' + loydot.length + ' löydöstä, ' + Object.keys(g).length + ' renderöijää' + (virheet.length ? ', parse-virheitä ' + virheet.length : ''));
    Object.entries(g).sort((a, b) => b[1].length - a[1].length).forEach(([k, v]) => console.log('  ' + String(v.length).padStart(4) + '  ' + k));
  } else { loydot.forEach((x) => console.log(x.rivi + '\t' + x.renderoija + '\t' + x.tyyppi + '\t' + x.teksti.slice(0, 110))); console.error(loydot.length + ' löydöstä' + (virheet.length ? ', parse-virheitä ' + JSON.stringify(virheet.slice(0, 3)) : '')); }
}
