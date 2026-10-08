/* Yleinen reititinavainten poimija (sv-läpiajo PR 4): sivun tekstiavain-reitittimien (vpT / tmHT / phT / masterT / _mT) fi-avaimet, joille EI ole sv-riviä missään reitin kartassa.
   Code EI kirjoita ruotsia (CLAUDE.md §0): tämä poimii vain fi-avaimet Gemini-erään (scripts/i18n_luo_gemini_era.cjs). Sama menetelmä kuin master_avaimet.cjs.
   Lähteet: (1) ROUTER('literaali') -kutsut (ensimmäinen argumentti kokonaan yksi merkkijono; perässä olevat .replace() eivät haittaa), (2) data-i18n / -ph / -title / -aria / -html -attribuutit,
   (3) valitut avain→fi-teksti -taulukot (kulutuskohdassa reititetyt; nimet annetaan kutsujalta), (4) lisälähteet kutsujalta.
   Dynaamiset kutsut (ROUTER(muuttuja)) eivät näy — niiden kattavuus todennetaan ajonaikaisella läpiajolla (tools/i18n/sv_lapiajo.mjs) ja render-porteilla. */
'use strict';
const fs = require('fs');
const path = require('path');

function _dec(t) { return t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); }
function _pura(s) { return s.replace(/\\u00a0/g, ' ').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\'); }
const ON_TEKSTIA = (t) => /[a-zåäöA-ZÅÄÖ]{3}/.test(t) && !/^[a-z0-9_.:#\-/]+$/.test(t);

function lataaSv(juuri, tiedosto, nimi) { try { return require(path.join(juuri, tiedosto))[nimi].sv || {}; } catch (e) { return {}; } }

/* kutsut: ROUTER('…') -literaalit */
function reititinKutsut(src, routerit) {
  const out = new Set();
  for (const R of routerit) {
    const alku = new RegExp('(?<![\\w$.])' + R.replace(/\$/g, '\\$') + '\\(', 'g');
    let m;
    while ((m = alku.exec(src))) {
      let k = m.index + m[0].length, d = 1, q = null; const st = k;
      while (k < src.length && d > 0) {
        const c = src[k];
        if (q) { if (c === '\\') { k += 2; continue; } if (c === q) q = null; }
        else if (c === "'" || c === '"' || c === '`') q = c;
        else if (c === '(') d++; else if (c === ')') d--;
        k++;
      }
      const arg = src.slice(st, k - 1);
      const mm = /^\s*'((?:[^'\\]|\\.)*)'\s*$/.exec(arg) || /^\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(arg);
      if (mm) out.add(_pura(mm[1]));
    }
  }
  return out;
}
function dataI18n(html) {
  const out = new Set();
  for (const m of html.matchAll(/\sdata-i18n(?:-ph|-title|-aria|-html)?="([^"]*)"/g)) out.add(_dec(m[1]));
  return out;
}
/* taulukot: ylätason `var|const|let NIMI = …;` -lausekkeen sisältämät tekstimäiset merkkijonoliteraalit (acorn) */
function taulukkoTekstit(html, nimet) {
  const acorn = require('acorn');
  const out = new Set();
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    let ast; try { ast = acorn.parse(m[1], { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); } catch (e) { continue; }
    const kerää = (x) => {
      if (!x || typeof x.type !== 'string') return;
      if (x.type === 'Literal') { if (typeof x.value === 'string' && ON_TEKSTIA(x.value)) out.add(x.value); return; }
      if (x.type === 'Property' && !x.computed) { kerää(x.value); return; }
      if (x.type === 'FunctionExpression' || x.type === 'ArrowFunctionExpression') return;
      for (const k of Object.keys(x)) { if (k === 'loc' || k === 'type') continue; const v = x[k]; if (Array.isArray(v)) v.forEach(kerää); else if (v && typeof v.type === 'string') kerää(v); }
    };
    for (const n of ast.body) {
      let d = n;
      if (d.type === 'ExpressionStatement' && d.expression.type === 'AssignmentExpression' && d.expression.left.type === 'MemberExpression' && d.expression.left.property && nimet.includes(d.expression.left.property.name)) kerää(d.expression.right);
      if (d.type === 'VariableDeclaration') d.declarations.forEach((dd) => { if (dd.id && nimet.includes(dd.id.name)) kerää(dd.init); });
    }
  }
  return out;
}

/* ylätason: puuttuvat avaimet. asetukset: { juuri, tiedostot:[html…], routerit:[…], kartat:[[tiedosto, TM_NIMI]…], taulukot:[…], lisa:Set|Array } */
function poimi(a) {
  const juuri = a.juuri || path.join(__dirname, '..', '..');
  const kartat = a.kartat.map(([f, n]) => lataaSv(juuri, f, n));
  const onSv = (t) => kartat.some((K) => [t, _dec(t), t.trim()].some((x) => typeof K[x] === 'string' && K[x] !== ''));
  const avaimet = new Set();
  for (const f of a.tiedostot) {
    const src = fs.readFileSync(path.join(juuri, f), 'utf8');
    reititinKutsut(src, a.routerit).forEach((t) => avaimet.add(t));
    dataI18n(src).forEach((t) => avaimet.add(t));
    if (a.taulukot && a.taulukot.length) taulukkoTekstit(src, a.taulukot).forEach((t) => avaimet.add(t));
  }
  (a.lisa || []).forEach((t) => avaimet.add(t));
  const kaikki = [...avaimet].filter((t) => /[a-zåäöA-ZÅÄÖ]{3}/.test(t));
  return { kaikki, puuttuu: kaikki.filter((t) => !onSv(t)) };
}

module.exports = { poimi, reititinKutsut, dataI18n, taulukkoTekstit, lataaSv, ON_TEKSTIA };
