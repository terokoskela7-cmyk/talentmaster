#!/usr/bin/env node
/* sv-läpiajon STAATTINEN skanneri (docs/CODE_BRIEF_I18N_SV_LAPIAJO.md; KARTOITUS §8 "AST-skannaus"): löytää sovelluksen lähteestä kaiken reitittämättömän kovakoodatun suomen,
   myös ne näkymät joita ajonaikainen läpiajo ei saavuta demo-datalla (autentikoidut/datariippuvaiset renderöijät).
   Jäsentää HTML:n inline-skriptit (acorn), kerää merkkijono- ja template-literaalit, kokoaa HTML-tekstit/attribuutit (title, placeholder, aria-label, alt) ja tunnistaa suomen
   (sv_lapiajo_fi.mjs). Reititetyksi katsotaan literaali joka on routteri-kutsun (T, t, vpT, masterT, _p7K1T, _vKpT, tmLibT, …) argumentti.
   Ajo: node tools/i18n/sv_staattinen.mjs <tiedosto.html> [--json] [--ryhmat]    → rivit: rivi · renderöijä · konteksti · teksti */
import { readFileSync } from 'fs';
import * as acorn from 'acorn';
import { onkoSuomea, sanat } from './sv_lapiajo_fi.mjs';
import { createRequire } from 'module';

/* Suomen SANASTO-tunnistin (täydentää sv_lapiajo_fi-heuristiikan: lyhyet/päätteettömät sanat kuten 'Lukittu', 'Harvinainen', 'Legenda').
   FI-vain-sanasto = tm_lang.js:n fi-arvojen sanat (≥4 kirjainta) joita EI esiinny missään en-arvossa. Rajoitettu litteisiin 1–3 sanan teksteihin, jotta ei tule
   melua koodimaisista merkkijonoista. Varoitus: tunnistaa vain sanat jotka kielitiedostossa jo on; uudet sanat tulevat läpiajon heuristiikasta. */
const fiVainSanasto = (() => {
  try {
    const L = createRequire(import.meta.url)('../../lib/tm_lang.js').TM_LANG; const kerää = (o, ulos) => { for (const v of Object.values(o || {})) { if (typeof v === 'string') sanat(v).forEach((w) => { if (w.length >= 4) ulos.add(w); }); else if (v && typeof v === 'object') kerää(v, ulos); } return ulos; };
    const fi = kerää(L.fi, new Set()), en = kerää(L.en, new Set()), ulos = new Set();
    for (const w of fi) if (!en.has(w) && /[a-zåäö]{4}/.test(w)) ulos.add(w);
    return ulos;
  } catch (e) { return new Set(); }
})();
function sanastoSuomea(teksti) { const w = sanat(teksti).filter((x) => x.length >= 4); return w.length > 0 && w.length <= 3 && w.some((x) => fiVainSanasto.has(x)) && !/[<>{}=;]/.test(teksti); }

export const ROUTERIT = new Set(['T', 't', 'vpT', 'masterT', '_p7K1T', '_vKpT', 'tmLibT', 'tx', '_tr', 'tmT', '_L', '_hT', '_p7TtSv', '_pT', '_pt', '_mT', 'tmHT', 'phT']);   // + HARJOITE_I18N-getterit (_L/_hT) ja Pelaajan TT-sv (_p7TtSv)
const EI_UI_KUTSUT = new Set(['getElementById', 'querySelector', 'querySelectorAll', 'getAttribute', 'hasAttribute', 'removeAttribute', 'addEventListener', 'removeEventListener', 'log', 'warn', 'error', 'info', 'debug',
  'collection', 'doc', 'where', 'orderBy', 'getItem', 'setItem', 'removeItem', 'matches', 'closest', 'createElement', 'require', 'import', 'httpsCallable', 'functions', 'getComputedStyle', 'dispatchEvent', 'postMessage',
  'toLocaleDateString', 'toLocaleTimeString', 'toLocaleString', 'Intl', 'DateTimeFormat', 'RegExp', 'test', 'exec', 'match', 'padStart', 'padEnd', 'startsWith', 'endsWith', 'indexOf', 'includes', 'split', 'localeCompare']);
const KAIKKI = process.argv.includes('--kaikki');   // katselmointitila: kaikki reitittämättömät tekstit (ei suomi-suodatinta) → käsin luokittelu
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
    const ennen = loydot.length; const skriptiAlku = m.index + m[0].indexOf('>') + 1;
    kavele(ast, [], koodi, alkuRivi, loydot);
    for (let i = ennen; i < loydot.length; i++) { loydot[i]._skriptiAlku = skriptiAlku; loydot[i].absAlku = skriptiAlku + loydot[i].alku; loydot[i].absLoppu = skriptiAlku + loydot[i].loppu; }
  }
  return { loydot, virheet };
}

/* Funktion OMALLA tasolla julistamat nimet (parametrit, var/let/const, sisäkkäiset funktiodeklaraatiot) — sisäkkäisten funktioiden sisään ei katsota. */
export function julistaaNimet(fn) {
  const nimet = new Set((fn.params || []).flatMap((q) => (q.type === 'Identifier' ? [q.name] : [])));
  const kavele2 = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n !== fn && /Function/.test(n.type)) { if (n.type === 'FunctionDeclaration' && n.id) nimet.add(n.id.name); return; }
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier') nimet.add(n.id.name);
    for (const k of Object.keys(n)) { if (k === 'loc' || k === 'type') continue; const v = n[k]; if (Array.isArray(v)) v.forEach(kavele2); else if (v && typeof v.type === 'string') kavele2(v); }
  };
  kavele2(fn); return nimet;
}

/* Varjostusvartija: reititinkutsu T('…')/t('…') jonka ympäröivä funktio (tai sen sisäkkäinen funktio) julistaa oman T/t-tunnisteen → kutsu osuisi paikalliseen muuttujaan
   (TypeError / ReferenceError TDZ). Palauttaa [{ rivi, nimi, funktio }]. Korjaus: käytä aliaksia _pT / _pt (määritelty reitittimen vieressä). */
/* Allowlist (tools/i18n/sv_staattinen_sallitut.json): renderöijä tai teksti (loppu-* = etuliite) jota ei lasketa reitittämättömäksi käyttäjätekstiksi. */
export function lataaSallitut() { return JSON.parse(readFileSync(new URL('./sv_staattinen_sallitut.json', import.meta.url), 'utf8')); }
export function onSallittu(f, S) {
  const r = f.renderoija || '';
  if (S.renderoijat.some((x) => r === x || r.startsWith(x + ' '))) return true;
  return S.tekstit.some((x) => f.teksti === x || (x.endsWith('*') && f.teksti.startsWith(x.slice(0, -1))));
}
export function varjostetutKutsut(src) {
  const ulos = [];
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(src))) {
    const koodi = m[1]; if (!koodi.trim()) continue;
    const alkuRivi = src.slice(0, m.index + m[0].indexOf('>') + 1).split('\n').length - 1;
    let ast; try { ast = acorn.parse(koodi, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); } catch (e) { continue; }
    (function kavele(n, funktiot) {
      if (!n || typeof n.type !== 'string') return;
      let f = funktiot;
      if (/Function/.test(n.type)) f = funktiot.concat([{ n, nimet: julistaaNimet(n) }]);
      if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && (n.callee.name === 'T' || n.callee.name === 't') && n.arguments[0] && n.arguments[0].type === 'Literal' && typeof n.arguments[0].value === 'string') {
        const v = f.find((x) => x.nimet.has(n.callee.name)); if (v) ulos.push({ rivi: alkuRivi + n.loc.start.line, nimi: n.callee.name, funktio: funktionNimi(f.map((x) => x.n)) });
      }
      for (const k of Object.keys(n)) { if (k === 'loc' || k === 'type') continue; const x = n[k]; if (Array.isArray(x)) x.forEach((y) => kavele(y, f)); else if (x && typeof x.type === 'string') kavele(x, f); }
    })(ast, []);
  }
  return ulos;
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
  for (let i = polku.length - 1; i >= 0; i--) {
    const n = polku[i];
    if (n.type === 'VariableDeclarator' && n.id && n.id.name) return '(ylätaso) ' + n.id.name;
    if (n.type === 'AssignmentExpression' && n.left) { const l = n.left; return '(ylätaso) ' + (l.type === 'MemberExpression' ? (l.property && (l.property.name || l.property.value)) : l.name); }
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
    for (const mm of s.matchAll(/(?:^|>)([^<>]+)(?=<|$)/g)) { const t = puhdas(mm[1]); if (t) ulos.push({ teksti: t, tyyppi: 'html-teksti', alkup: mm[1] }); }
    for (const mm of s.matchAll(/\b(title|placeholder|aria-label|alt)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) { const a = mm[2] != null ? mm[2] : mm[3]; const t = puhdas(a); if (t) ulos.push({ teksti: t, tyyppi: mm[1], alkup: a }); }
  } else { const t = puhdas(s); if (t) ulos.push({ teksti: t, tyyppi: 'merkkijono', alkup: s }); }
  return ulos;
}

function arvioi(s, n, polku, off, ulos) {
  if (!s || s.length < 3 || s.length > 900) return;
  const kont = reititetty(polku, n); if (kont) return;
  for (const { teksti, tyyppi, alkup } of tekstit(s)) {
    if (teksti.length < 3 || !/[A-Za-zÅÄÖåäö]{3}/.test(teksti)) continue;
    if (tyyppi === 'merkkijono' && !/\s/.test(teksti) && !/^[A-ZÅÄÖ]/.test(teksti) && !/[åäö]/i.test(teksti)) continue;   // tunniste/avain (kaynnissa, jaksofokus)
    if (tyyppi === 'merkkijono' && TEKNINEN.test(teksti) && !/[åäö]/i.test(teksti) && !/\s[A-Za-zåäö]{3,}/.test(teksti) && !(KAIKKI && /^[A-ZÅÄÖ][a-zåäö]{3,}/.test(teksti))) continue;
    if (/^(?:https?:|\/|\.\/|[a-z]+:\/\/)/.test(teksti) || /\.(?:js|css|png|svg|json|html)\b/.test(teksti)) continue;
    const f = onkoSuomea(teksti); if (!KAIKKI && !f.fi && !sanastoSuomea(teksti)) continue;
    const ylataso = !polku.some((x) => /Function/.test(x.type));
    const varjostaaT = polku.some((x) => /Function/.test(x.type) && (() => { const nn = julistaaNimet(x); return nn.has('T') || nn.has('t'); })());   // paikallinen T/t (esim. const T = window.TM_TESTIT) varjostaa globaalin reitittimen → _pT/_pt
    ulos.push({ rivi: off + n.loc.start.line, renderoija: funktionNimi(polku), tyyppi, teksti, alkup, solmu: n.type, alku: n.start, loppu: n.end, ylataso, varjostaaT, vanhempi: polku.length ? polku[polku.length - 1].type : null, jasenObj: !!(polku.length && polku[polku.length - 1].type === 'MemberExpression' && polku[polku.length - 1].object === n), _skriptiAlku: null });
  }
}

if (process.argv[1] && process.argv[1].endsWith('sv_staattinen.mjs')) {
  const tiedosto = process.argv[2];
  if (process.argv.includes('--varjostus')) { const v = varjostetutKutsut(readFileSync(tiedosto, 'utf8')); v.forEach((x) => console.log(x.rivi + '\t' + x.nimi + '\t' + x.funktio)); console.error(v.length + ' varjostettua reititinkutsua'); process.exit(v.length ? 1 : 0); } if (!tiedosto) { console.error('käyttö: node tools/i18n/sv_staattinen.mjs <tiedosto.html> [--json] [--ryhmat]'); process.exit(2); }
  let { loydot, virheet } = skannaaHtml(readFileSync(tiedosto, 'utf8'), tiedosto);
  if (process.argv.includes('--sallitut')) { const S = lataaSallitut(); loydot = loydot.filter((f) => !onSallittu(f, S)); }
  if (process.argv.includes('--json')) console.log(JSON.stringify({ tiedosto, virheet, loydot }, null, 1));
  else if (process.argv.includes('--ryhmat')) {
    const g = {}; loydot.forEach((x) => { (g[x.renderoija] = g[x.renderoija] || []).push(x); });
    console.log(tiedosto + ': ' + loydot.length + ' löydöstä, ' + Object.keys(g).length + ' renderöijää' + (virheet.length ? ', parse-virheitä ' + virheet.length : ''));
    Object.entries(g).sort((a, b) => b[1].length - a[1].length).forEach(([k, v]) => console.log('  ' + String(v.length).padStart(4) + '  ' + k));
  } else { loydot.forEach((x) => console.log(x.rivi + '\t' + x.renderoija + '\t' + x.tyyppi + '\t' + x.teksti.slice(0, 110))); console.error(loydot.length + ' löydöstä' + (virheet.length ? ', parse-virheitä ' + JSON.stringify(virheet.slice(0, 3)) : '')); }
}
