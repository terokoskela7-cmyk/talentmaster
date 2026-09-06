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
const RANGES = [[8040, 9221], [12600, 13750], [11661, 12400], [3777, 3865], [7885, 7910], [14186, 14550], [14552, 15185], [15189, 15690], [15770, 15884]]; // V3 _jsv · V4 kalenteri · V5 valmentajat · V6 IDP-jono · V7a MDT · V7b Reviewit+tuloskortti. V7c–V8: lisää.
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

const PRODUCT = /X-Factor|Hidden Gem|[Uu]nderdog|Cue|Player Development Card|Scouting|terveys\//; // tuotetermit + Cue + PDC-brändi/Scouting (verbatim)
const ABBR = 'TKI|TSI|H-H|PHV|D[1-5]|RPE|ADAR|CPD|DVI|RSVP|MAS|CMJ|SJ|FLEI|VAI\\+?|RAE|OVR|EI|FVP|VNE|SM|TK|IDP|VP|UA|meso|makro|mikro|Cue|cue|ka|cm|kg|min|vk|pv|kk|km/h|m/s';
const ABBR_ONLY = new RegExp('^(?:\\s|[·—–\\-/:()%.,+↑↓→▾▴◆⚠★☆●○≥≤<>&;0-9]|&amp;|&nbsp;|(?:' + ABBR + '))+$');
// V7b-live-oppi 0A: allowlist VAIN jos tuotetermien+lyhenteiden JÄLKEEN ei jää fi-sanaa (EI substring — 'Underdog-toimenpideaste' vuoti kun PRODUCT.test mätsäsi 'Underdog')
const PRODUCT_G = new RegExp(PRODUCT.source, 'g');
const ABBR_G = new RegExp('(?:' + ABBR + ')', 'g');
const stripAllow = (t) => t.replace(PRODUCT_G, ' ').replace(ABBR_G, ' ').replace(/[·—–\-/:()%.,+&;↑↓→ 0-9]|&amp;|&nbsp;/g, ' ');
const hasWord = (t) => /[A-Za-zÄÖÅäöå]{3,}/.test(t) && !ABBR_ONLY.test(t);
// zero-markup-literaali joka EI ole näyttöä (CSS-deklaraatio/-sääntö · attribuutti-scaffolding · id/enum/URL/lc-token)
const codeish = (v) =>
  /[;"={}]/.test(v) || /_/.test(v) || /--/.test(v) || /var\(|\(--/.test(v) || /:\/\//.test(v) ||
  /rgba?\(|hsla?\(|gradient|calc\(/.test(v) ||   // V7a-live: CSS-funktioarvot ternaary-haaroissa (ei näyttöä)
  /\.(html|js|css|png|jpg|json)\b/.test(v) || /[?&][a-zA-Z]+=/.test(v) || /^#[0-9a-fA-F]{3,8}$/.test(v) ||
  /^[a-z][a-z-]*:/.test(v.trim()) ||                    // CSS-property-alku (background:/border-left:2px solid)
  /^\w+\(/.test(v.trim()) ||   // funktiokutsu-handler (act:n toiminto-arg setWs('x'))
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
  // PER-OCCURRENCE routed: vpT/vpTToimenpide-kutsujen ARGUMENTTIEN char-ranget. Kandidaatti on routed VAIN jos
  // SE solmu on jonkin arg-rangen sisällä — EI globaali string-jäsenyys (V5-live-oppi: globaali ROUTED maskasi
  // raa'at per-occurrence-vuodot; "gate 0" takasi vain 0 ei-koskaan-reititettyä, ei 0 raakaa).
  const VPT_ARG_RANGES = [];
  const parentOf = new Map();
  const litNodes = [];

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
      node.arguments.forEach((a) => VPT_ARG_RANGES.push([a.start, a.end]));
    }
    if (node.type === 'Literal' && typeof node.value === 'string') litNodes.push({ value: node.value, node, tl: null });
    if (node.type === 'TemplateLiteral') node.quasis.forEach((q) => litNodes.push({ value: q.value.cooked, node: q, tl: node }));
    for (const k in node) { if (['loc', 'start', 'end', 'range'].includes(k)) continue;
      const c = node[k]; if (c && typeof c === 'object') wst.push([c, node]); }
  }

  // display-konteksti zero-markup-literaalille: '+' -ketju markup/vpT · toast/_setTxt/_dSet-arg · .textContent=/.innerText=/.innerHTML=
  const SETTER_FNS = new Set(['toast', '_setTxt', '_dSet', 'idrow', 'kpi', 'fp', 'set', 'sel', 'tier', 'act']); // V7d: tier(n,l,col)/act(sev,teksti,sub,nappi) — label-argit näyttöä // V7a idrow · V7b kpi/fp/set · V7c sel(id,label,opts) — label-arg näyttöä
  const TXT_PROPS = new Set(['textContent', 'innerText', 'innerHTML']);
  const DISPLAY_PROPS = new Set(['teksti']); // V7b-live: object-property display-arvo (badge-objektit teksti:'🏥 Valmius'+x — gate-sokea epäsuora display)
  const inDisplayContext = (node) => {
    let n = node, top = null;
    while (parentOf.get(n) && ((parentOf.get(n).type === 'BinaryExpression' && parentOf.get(n).operator === '+') || parentOf.get(n).type === 'ConditionalExpression')) { top = parentOf.get(n); n = top; } // V7a-live: kävele myös ternaaryn läpi (markup-ketjun ternaary-haara oli sokea piste)
    if (top && subtreeHasMarkupOrVpt(top)) return true;
    // 0B: AssignmentExpression RHS jossa LHS = *.textContent/innerText/innerHTML (V4-live-oppi: viikko-otsikko vuoti)
    const ct = top || node;
    const ctp = parentOf.get(ct);
    if (ctp && ctp.type === 'AssignmentExpression' && ctp.right === ct &&
        ctp.left && ctp.left.type === 'MemberExpression' && ctp.left.property &&
        ((ctp.left.property.type === 'Identifier' && TXT_PROPS.has(ctp.left.property.name)) ||
         (ctp.left.property.type === 'Literal' && TXT_PROPS.has(ctp.left.property.value)))) return true;
    // V7b-live: object-property display-arvo (esim. teksti:'…'+x badge-objekteissa)
    if (ctp && ctp.type === 'Property' && ctp.value === ct && ctp.key &&
        ((ctp.key.type === 'Identifier' && DISPLAY_PROPS.has(ctp.key.name)) ||
         (ctp.key.type === 'Literal' && DISPLAY_PROPS.has(ctp.key.value)))) return true;
    let p = parentOf.get(node);
    for (let i = 0; p && i < 8; i++, p = parentOf.get(p)) {
      if (p.type === 'CallExpression' && p.callee && p.callee.type === 'Identifier' && SETTER_FNS.has(p.callee.name)) return true;
    }
    return false;
  };

  const inRange = (ln) => ranges.some(([lo, hi]) => ln >= lo && ln <= hi);
  const isLib = (t) => { if (LIB.has(t)) return true; for (const L of LIB) if (L.length >= 6 && (t === L || t.startsWith(L) || (t.length >= 6 && L.startsWith(t)))) return true; return false; };
  // routed = TÄMÄ solmu on jonkin vpT-argin char-rangen sisällä (per-occurrence, ei globaali)
  const inVpt = (s, e) => VPT_ARG_RANGES.some(([rs, re]) => rs <= s && e <= re);

  const leaks = [];
  const seen = new Set();
  for (const lit of litNodes) {
    const value = lit.value;
    if (typeof value !== 'string' || !value) continue;
    const locNode = lit.tl || lit.node;
    const line = (locNode.loc ? locNode.loc.start.line : 0) + lineOffset;
    if (!inRange(line)) continue;
    if (inVpt(lit.node.start, lit.node.end)) continue; // per-occurrence routed → ohita koko solmu
    const mp = markupPieces(value);
    let pieces;
    if (mp) pieces = mp;
    else if (inDisplayContext(lit.tl || lit.node) && hasWord(value) && !codeish(value)) pieces = [value.trim()];
    else pieces = [];
    for (const p of pieces) {
      if (!hasWord(p) || !hasWord(stripAllow(p)) || isLib(p)) continue; // 0A: tuotetermin JÄLKEEN ei fi:tä → ohita; muuten vuoto
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
    // 0B: .textContent= / _setTxt() display-konteksti (V4-live-oppi)
    const txt = "function _u(el,x){ el.textContent = 'Viikkovuoto ' + x; _setTxt('id', 'Setter-vuoto'); }";
    const th = scanLeaks(txt, [[1, 99]], 0, new Set()).map((l) => l.p);
    expect(th.some((p) => p.includes('Viikkovuoto'))).toBe(true);
    expect(th).toContain('Setter-vuoto');
    // PER-OCCURRENCE (V5-live-oppi): raaka >Mentorointi< flagataan VAIKKA Mentorointi on vpT:ssä muualla
    // (globaali ROUTED maskasi tämän ennen; nyt char-range-per-occurrence).
    const perOcc = "function _p(){ var a = vpT('Mentorointi'); var h = '<div>Mentorointi</div>'; return a + h; }";
    expect(scanLeaks(perOcc, [[1, 99]], 0, new Set()).map((l) => l.p)).toContain('Mentorointi');
    // idrow-luokka (V7a-live-oppi): idrow(label,val)-display-helperin raaka fi-arg napataan; routed ei
    const idr = "function _c(){ return idrow('Raakaotsikko', vpT('a')) + idrow(vpT('Reititettyotsikko'), vpT('b')); }";
    const ih = scanLeaks(idr, [[1, 99]], 0, new Set()).map((l) => l.p);
    expect(ih).toContain('Raakaotsikko');
    expect(ih).not.toContain('Reititettyotsikko');
    // object-property display (V7b-live: teksti:'…' badge-objektit)
    const objp = "function _b(){ return [{key:'x', teksti:'Raakabadge'}, {key:'y', teksti:vpT('OKbadge')}]; }";
    const oh = scanLeaks(objp, [[1, 99]], 0, new Set()).map((l) => l.p);
    expect(oh).toContain('Raakabadge');
    expect(oh).not.toContain('OKbadge');
    // §0A: PRODUCT-allowlist koko-literaali, ei osajono (V7b-live: 'Underdog-toimenpideaste' vuoti)
    const prod = "function _p(){ return '<div>Hidden Gem (valmius 65)</div>' + '<div>Underdog</div>'; }";
    const ph = scanLeaks(prod, [[1, 99]], 0, new Set()).map((l) => l.p);
    expect(ph.some((x) => /valmius/.test(x))).toBe(true);   // tuotetermin JÄLKEEN fi jää → vuoto
    expect(ph.some((x) => x.trim() === 'Underdog')).toBe(false);   // pelkkä tuotetermi → ei vuoto
  });

  // ── Object-property-display-guard ──────────────────────────────────────────────
  // Enum/meta-NÄYTTÖ member-lausekkeina (esim. meta.nimi = KALENTERI_TYYPIT-tyyppinimi) EIVÄT ole
  // string-literaaleja → AST-render-gate (yllä) EIKÄ resolvi-todiste näe niitä. Pinnataan routed-muoto
  // lähdeskannauksella (kuten badge-testi 5b pinnasi /5 alue -suffiksit): jokainen listattu member-näyttö
  // ON aina vpT(...):n sisällä alueellaan. Sulkee saman aukon V5–V8:n enum-display-labeleille (roolit ym.)
  // — uusi alaerä lisää oman member-näyttönsä tähän.
  const MEMBER_DISPLAY = [
    { expr: 'meta.nimi', ranges: [[12600, 13750]] }, // V4 kalenteri: KALENTERI_TYYPIT-tyyppinimi (§1 enum-avain fi, näyttö vpT)
    { expr: 'IDP_TILA_LBL[p.idp_tila]', ranges: [[6100, 6140], [14460, 14510]] }, // V6 idp_tila-statusnäyttö (§1 enum-avain fi, näyttö vpT)
    { expr: 'dm.nimi', ranges: [[14990, 14996]] }, // V7b domeeni-display fokusChip (lc-avain fi, näyttö vpT)
    { expr: 'k.nimi', ranges: [[14623, 14627]] }, // V7b-fix2 tuloskortti _vpTkAlue mittarilabel (lib-data, näyttö vpT)
    { expr: 'k.arvo', ranges: [[14623, 14627]] }, // V7b-fix2 tuloskortti _vpTkAlue mittari-arvo (Ei arviointeja vielä ym.)
    // V7+: esim. { expr: 'roolimap[rooli]', ranges: [[...]] }
  ];
  it('enum/object-property-display reititetty vpT:llä (AST-gaten sokea piste)', () => {
    const lines = HTML.split('\n');
    const bad = [];
    for (const { expr, ranges } of MEMBER_DISPLAY) {
      for (const [lo, hi] of ranges) for (let ln = lo; ln <= hi; ln++) {
        const line = lines[ln - 1];
        if (!line) continue;
        let i = 0;
        while ((i = line.indexOf(expr, i)) !== -1) {
          if (line.slice(Math.max(0, i - 4), i) !== 'vpT(') bad.push(`${ln}: bare ${expr} (kääri vpT(${expr}))`);
          i += expr.length;
        }
      }
    }
    // Ei-vacuous: skanneri nappaa bare-muodon (synteettinen todiste)
    const probe = ['x = meta.nimi + "y"', 'x = vpT(meta.nimi)'];
    const pbad = probe.filter((l, idx) => { const i = l.indexOf('meta.nimi'); return l.slice(i - 4, i) !== 'vpT(' && idx === 0; });
    expect(pbad.length).toBe(1); // rivi 0 (bare) napataan, rivi 1 (vpT) ei
    expect(bad).toEqual([]);
  });
});
