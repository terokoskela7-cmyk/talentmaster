/**
 * i18n Vaihe 5 · Raita B (VP_v25) — RENDER-KIELINEUTRAALI-GATE (step G, committattu · AST-pohjainen).
 *
 * VP:n vuotoluokka: RAAKA reitittämätön fi näkyvässä display-tekstissä (`>…<`-solmu · `title=`/`placeholder=` ·
 * konkatenoitu fi-suffiksi kuten `var + '/5 alue</span>'`). **Resolvi-todiste EI nappaa tätä** — se todistaa vain
 * että REITITETYT avaimet resolvoituvat, ei että kaikki näyttöliteraalit on reititetty.
 *
 * ⚙ AST-POHJAINEN (acorn) — EI rivipohjainen. Juurisyy vanhassa gatessa: se skannasi KONKATENOITUA LÄHDETEKSTIÄ →
 *   (1) blind-spot: `'…>' + v + '/5 alue</span>'` → span sisälsi ' + ' → codeLike ohitti (koko var+suffiksi-luokka);
 *   (2) 122 väärää positiivista: naiivi ' + '-tokenisointi pareutui väärin vpT('…')-kutsuissa.
 *   Molemmat = sama virhe (operoi lähdetekstillä, ei literaalien ARVOILLA). Korjaus: skannaa AST-literaalien arvot.
 *
 * "routed" = literaalin arvo (tai sen näyttöpala) on jonkin vpT()/vpTToimenpide()-kutsun ARGUMENTIN Literal/quasi-arvo
 *   (AST-eksakti → ei paren-matching-haurautta). Kandidaatit = kaikki muut string-Literalit + TemplateLiteral-quasit.
 * Vuoto = kandidaatin näyttöpala (markup-ulkoinen teksti / title= / placeholder= / display-kontekstin fi-suffiksi)
 *   joka sisältää fi-sanan EIKÄ ole ROUTED eikä allowlistissa.
 * Allowlist: §7 lib-curriculum-nimet (tm_fyysteemat/tm_teknistaktiset/tm_arviointi_taksonomia nimi_fi — lib-sv on oma
 *   raita) · tuotetermit (X-Factor/Hidden Gem/Underdog) · lyhenteet/indeksit/yksiköt (TKI/TSI/H-H/PHV/D1–D5/…) ·
 *   koodi/enum/CSS/id (codeish).
 *
 * SCOPE: RANGES = reititetyt render-alueet (solmun loc.start.line). V3 = _jsv (8040–9221). Jokainen tuleva alaerä
 *   (V4–V8) LISÄÄ oman alueensa → gate guardaa ne heti kun reititetty.
 *
 * Ei-vacuous: alempi it() ajaa detektorin synteettisellä vuodolla (>text< + var-suffiksi) → varmistaa että gate failaa
 *   aidosta vuodosta (korvaa käsin-mutaation).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const acorn = require('acorn');
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const RLO = 2679, RHI = 17921;              // VP pääscript (1-idx)
const RANGES = [[8040, 9221], [12600, 13750]]; // reititetyt alueet: V3 _jsv · V4 kalenteri. V5–V8: lisää tähän.
const ROUTED_FNS = new Set(['vpT', 'vpTToimenpide']);

// §7 lib-curriculum-nimet (jäävät fi → allowlist)
function libNames() {
  const out = new Set();
  const walk = (o) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if ((k === 'nimi_fi' || k === 'nimi' || k === 'fi') && typeof v === 'string') out.add(v); else walk(v);
  } };
  for (const L of ['tm_fyysteemat', 'tm_teknistaktiset', 'tm_arviointi_taksonomia']) {
    try { walk(require('../lib/' + L + '.js')); } catch { /* lib puuttuu → ohita */ }
  }
  return out;
}

const PRODUCT = /X-Factor|Hidden Gem|Underdog/;
const ABBR = 'TKI|TSI|H-H|PHV|D[1-5]|RPE|ADAR|CPD|DVI|RSVP|MAS|CMJ|SJ|FLEI|VAI\\+?|RAE|OVR|EI|FVP|VNE|SM|TK|IDP|VP|UA|meso|makro|mikro|Cue|cue|ka|cm|kg|min|vk|pv|kk|km/h|m/s';
const ABBR_ONLY = new RegExp('^(?:\\s|[·—–\\-/:()%.,+↑↓→▾▴◆⚠★☆●○≥≤<>&;0-9]|&amp;|&nbsp;|(?:' + ABBR + '))+$');
const hasWord = (t) => /[A-Za-zÄÖÅäöå]{3,}/.test(t) && !ABBR_ONLY.test(t);
// zero-markup-literaali joka EI ole näyttöä (CSS-deklaraatio/-sääntö · attribuutti-scaffolding · id/enum/URL/lc-token)
const codeish = (v) =>
  /[;"={}]/.test(v) || /_/.test(v) || /var\(|\(--/.test(v) || /:\/\//.test(v) ||
  /\.(html|js|css|png|jpg|json)\b/.test(v) || /[?&][a-zA-Z]+=/.test(v) || /^#[0-9a-fA-F]{3,8}$/.test(v) ||
  /^[a-z][a-z-]*:/.test(v.trim()) ||                    // CSS-property-alku (background:/border-left:2px solid)
  /^[a-z][a-zA-Z0-9]*$/.test(v.trim());

// näyttöteksti-palat yhden literaalin ARVOSTA (markup → tag-ulkoinen teksti + title/placeholder); null jos zero-markup
function markupPieces(v) {
  if (!v.includes('<') && !v.includes('>')) return null;
  const out = [];
  for (const m of v.matchAll(/>([^<>]*)/g)) { const t = m[1].trim(); if (t) out.push(t); }
  for (const m of v.matchAll(/([^<>]*)</g)) { const t = m[1].trim(); if (t) out.push(t); }
  for (const m of v.matchAll(/(?:title|placeholder)="([^"]*)"/g)) { const t = m[1].trim(); if (t) out.push(t); }
  return out;
}

// Ydin: skannaa lähde AST:na, palauta vuodot {line, p} RANGES-alueilta. lineOffset = tiedostorivi = loc.start.line + offset.
function scanLeaks(src, ranges, lineOffset, LIB) {
  const ast = acorn.parse(src, { ecmaVersion: 'latest', locations: true });
  const ROUTED = new Set();
  const parentOf = new Map();
  const litNodes = [];

  const litValues = (node, acc) => {
    const st = [node];
    while (st.length) {
      const n = st.pop();
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { for (const c of n) st.push(c); continue; }
      if (n.type === 'Literal' && typeof n.value === 'string') acc.push(n.value);
      if (n.type === 'TemplateLiteral') n.quasis.forEach((q) => acc.push(q.value.cooked));
      for (const k in n) { if (['loc', 'start', 'end', 'range'].includes(k)) continue;
        const c = n[k]; if (c && typeof c === 'object') st.push(c); }
    }
  };
  const subtreeHasMarkupOrVpt = (root) => {
    const st = [root];
    while (st.length) {
      const n = st.pop();
      if (!n || typeof n !== 'object') continue;
      if (Array.isArray(n)) { for (const c of n) st.push(c); continue; }
      if (n.type === 'Literal' && typeof n.value === 'string' && /[<>]/.test(n.value)) return true;
      if (n.type === 'TemplateLiteral' && n.quasis.some((q) => /[<>]/.test(q.value.cooked || ''))) return true;
      if (n.type === 'CallExpression' && n.callee && n.callee.type === 'Identifier' && ROUTED_FNS.has(n.callee.name)) return true;
      for (const k in n) { if (['loc', 'start', 'end', 'range'].includes(k)) continue;
        const c = n[k]; if (c && typeof c === 'object') st.push(c); }
    }
    return false;
  };

  const wst = [[ast, null]];
  while (wst.length) {
    const [node, parent] = wst.pop();
    if (!node || typeof node !== 'object') continue;
    if (Array.isArray(node)) { for (const n of node) wst.push([n, parent]); continue; }
    parentOf.set(node, parent);
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && ROUTED_FNS.has(node.callee.name)) {
      const acc = []; node.arguments.forEach((a) => litValues(a, acc));
      for (const v of acc) { ROUTED.add(v); ROUTED.add(v.trim()); const mp = markupPieces(v); if (mp) mp.forEach((p) => ROUTED.add(p)); }
    }
    if (node.type === 'Literal' && typeof node.value === 'string') litNodes.push({ value: node.value, node, tl: null });
    if (node.type === 'TemplateLiteral') node.quasis.forEach((q) => litNodes.push({ value: q.value.cooked, node: q, tl: node }));
    for (const k in node) { if (['loc', 'start', 'end', 'range'].includes(k)) continue;
      const c = node[k]; if (c && typeof c === 'object') wst.push([c, node]); }
  }

  // display-konteksti zero-markup-literaalille: '+' -konkatenaatioketju jossa markup/vpT, TAI toast()-argumentti
  const inDisplayContext = (node) => {
    let n = node, top = null;
    while (parentOf.get(n) && parentOf.get(n).type === 'BinaryExpression' && parentOf.get(n).operator === '+') { top = parentOf.get(n); n = top; }
    if (top && subtreeHasMarkupOrVpt(top)) return true;
    let p = parentOf.get(node);
    for (let i = 0; p && i < 8; i++, p = parentOf.get(p)) {
      if (p.type === 'CallExpression' && p.callee && p.callee.type === 'Identifier' && p.callee.name === 'toast') return true;
    }
    return false;
  };

  const inRange = (ln) => ranges.some(([lo, hi]) => ln >= lo && ln <= hi);
  const isLib = (t) => { if (LIB.has(t)) return true; for (const L of LIB) if (L.length >= 6 && (t === L || t.startsWith(L) || (t.length >= 6 && L.startsWith(t)))) return true; return false; };

  const leaks = [];
  const seen = new Set();
  for (const lit of litNodes) {
    const value = lit.value;
    if (typeof value !== 'string' || !value) continue;
    const locNode = lit.tl || lit.node;
    const line = (locNode.loc ? locNode.loc.start.line : 0) + lineOffset;
    if (!inRange(line)) continue;
    const mp = markupPieces(value);
    let pieces;
    if (mp) pieces = mp;
    else if (inDisplayContext(lit.tl || lit.node) && hasWord(value) && !codeish(value)) pieces = [value.trim()];
    else pieces = [];
    for (const p of pieces) {
      if (!hasWord(p) || ROUTED.has(p) || ROUTED.has(p.trim()) || PRODUCT.test(p) || isLib(p)) continue;
      const key = line + '|' + p;
      if (seen.has(key)) continue; seen.add(key);
      leaks.push({ line, p });
    }
  }
  leaks.sort((a, b) => a.line - b.line);
  return leaks;
}

describe('VP_v25 render-kielineutraali-gate (step G · AST)', () => {
  const LIB = libNames();

  it('reititetyillä render-alueilla 0 raakaa reitittämätöntä fi-näyttöliteraalia', () => {
    const lines = HTML.split('\n');
    const src = lines.slice(RLO - 1, RHI - 1).join('\n');
    const leaks = scanLeaks(src, RANGES, RLO - 1, LIB);
    if (leaks.length) {
      throw new Error(
        `Reititetyillä VP-render-alueilla ${leaks.length} raakaa reitittämätöntä fi-näyttöliteraalia ` +
          '(renderöityy fi sv-tilassa; resolvi-todiste ei nappaa tätä luokkaa).\nKytke vpT:llä (tai allowlist):\n' +
          leaks.map((l) => `  ${l.line}  ${JSON.stringify(l.p.slice(0, 72))}`).join('\n')
      );
    }
    expect(leaks.length).toBe(0);
  });

  it('detektori EI vacuous: nappaa raa\'an >text< + konkatenoidun var-suffiksin', () => {
    // Kaksi vuotomuotoa jotka vanha rivipohjainen gate missasi/FP:si:
    const snippet =
      "function _t(x){ let h=''; " +
      "h += '<div class=\"c\">Raaka vuototeksti</div>'; " +   // (a) täysi >text<
      "h += '<span>' + x + '/5 vuotosuffiksi</span>'; " +      // (b) var + fi-suffiksi (blind-spot)
      "return h; }";
    const leaks = scanLeaks(snippet, [[1, 99]], 0, new Set());
    const hits = leaks.map((l) => l.p);
    expect(hits).toContain('Raaka vuototeksti');
    expect(hits.some((p) => p.includes('vuotosuffiksi'))).toBe(true);
    // vpT-kääre poistaa vuodon (routed):
    const ok = "function _t(x){ return '<span>' + x + vpT('/5 ok') + '</span>'; }";
    expect(scanLeaks(ok, [[1, 99]], 0, new Set()).length).toBe(0);
  });
});
