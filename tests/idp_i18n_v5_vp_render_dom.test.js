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
 * SCOPE: RANGES = reititetyt render-alueet (solmun loc.start.line). V3 = _jsv (8043–9224). Jokainen tuleva alaerä
 *   (V4–V8f) LISÄÄ oman alueensa → gate guardaa ne heti kun reititetty.
 *
 * Ei-vacuous: alempi it() ajaa detektorin synteettisellä vuodolla (>text< + var-suffiksi) → varmistaa että gate failaa
 *   aidosta vuodosta (korvaa käsin-mutaation).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import vm from 'vm';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const acorn = require('acorn');
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const RLO = 2692, RHI = 18297;              // VP pääscript (1-idx); RHI -32 kun kuollut renderPelaajat_old poistettiin (V8k-4b)
const RANGES = [[8441, 9623], [12975, 14125], [12068, 12807], [3791, 3879], [14561, 14925], [14927, 15560], [15564, 16065], [16145, 16259], [16261, 16350], [4435, 4509], [5374, 5441], [15529, 15605], [17305, 17385], [7288, 7572], [5983, 7287], [4757, 4867], [16358, 16502], [4868, 5373], [4600, 4701], [3552, 3779], [10240, 10285], [11318, 11333], [10861, 10879], [10881, 10913], [11142, 11197], [11236, 11260], [11262, 11270], [11272, 11279], [11284, 11314], [14275, 14286], [4189, 4433], [7707, 7769], [8033, 8189], [8231, 8258], [5640, 5659], [5697, 5727], [5828, 5858], [5924, 5980], [7683, 7704], [16890, 16925], [16939, 16947], [16930, 16938], [9996, 10022], [10069, 10125], [10137, 10163], [10214, 10237], [10288, 10306], [10308, 10319], [10321, 10328], [10528, 10539], [10573, 10589], [9872, 9891], [9892, 9917], [14157, 14233], [14485, 14558], [9624, 9861], [16535, 16552], [11334, 12002], [7577, 7617], [7898, 7915], [8281, 8411], [12012, 12037], [16955, 16960], [16967, 16977], [17292, 17304], [17475, 17610], [17999, 18016], [18019, 18044], [18163, 18208], [18273, 18284], [2856, 2930], [3970, 3990], [4055, 4080], [4125, 4180], [4545, 4580], [4705, 4720], [5800, 5815], [5865, 5895], [5900, 5920], [10050, 10066], [10188, 10211], [10333, 10340], [10569, 10572], [10598, 10624], [10757, 10778], [11031, 11094], [14289, 14296], [14406, 14418], [14460, 14470], [16578, 16586], [16601, 16617], [16619, 16664], [17033, 17100], [18210, 18262]]; // V8k-4b: viikko/mittaus/tapahtuma/demo/login. V8k-4a: hallintapuolen rypäs. V8k-3: [18220,18236] sulautui renderKalibin runkoon. V8k-2: [8286,8311] sulautui _vpAloitusHTML:n koko runkoon. V8k-1: [11737,11741] sulautui per-pelaaja-pikakatsauksen koko puuhun. V3 _jsv · V4 kalenteri · V5 valmentajat · V6 IDP-jono · V7a MDT · V7b Reviewit+tuloskortti. V7c–V8: lisää.
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

const PRODUCT = /X-Factor|Hidden Gem|[Uu]nderdog|Cue|Player Development Card|TalentMaster|Eerikkilä|Scouting|oversight|nat\.|akt\.|Pre-PHV|Circa-PHV|Post-PHV|terveys\//; // tuotetermit + Cue + PDC/TalentMaster-brändi/Scouting + oversight (verbatim; kartta pitää "oversight-signal")
const ABBR = 'TKI|TSI|H-H|PHV|ACWR|D[1-5]|RPE|ADAR|CPD|DVI|RSVP|MAS|CMJ|SJ|FLEI|VAI\\+?|RAE|OVR|EI|FVP|VNE|SM|TK|IDP|VP|UA|meso|makro|mikro|Cue|cue|ka|cm|kg|min|vk|pv|kk|km/h|m/s';
const ABBR_ONLY = new RegExp('^(?:\\s|[·—–\\-/:()%.,+↑↓→▾▴◆⚠★☆●○≥≤<>&;0-9]|&amp;|&nbsp;|(?:' + ABBR + '))+$');
// V7b-live-oppi 0A: allowlist VAIN jos tuotetermien+lyhenteiden JÄLKEEN ei jää fi-sanaa (EI substring — 'Underdog-toimenpideaste' vuoti kun PRODUCT.test mätsäsi 'Underdog')
const PRODUCT_G = new RegExp(PRODUCT.source, 'g');
const ABBR_G = new RegExp('(?:' + ABBR + ')', 'g');
const stripAllow = (t) => t.replace(PRODUCT_G, ' ').replace(ABBR_G, ' ').replace(/[·—–\-/:()%.,+&;↑↓→ 0-9]|&amp;|&nbsp;/g, ' ');
const hasWord = (t) => /[A-Za-zÄÖÅäöå]{3,}/.test(t) && !ABBR_ONLY.test(t);
// zero-markup-literaali joka EI ole näyttöä (CSS-deklaraatio/-sääntö · attribuutti-scaffolding · id/enum/URL/lc-token)
// Erä 2 -korjaus: `"` EI YKSINÄÄN tee literaalista koodia. Aiemmin `[;"={}]` niputti lainausmerkin
// muun koodirakenteen kanssa → aito näyttöteksti jossa siteerataan UI-nappia
// (sub:'… (avaa pelaajakortti · "Arvioi (VP)")') luokittui koodiksi ja vuoti hiljaa sv-tilassa VAIKKA
// `sub` on DISPLAY_PROPS:issa. Lainausmerkki lasketaan koodiksi vain kun mukana on muuta rakennetta
// (`;` `=` `{` `}` `<` `>`), mikä kattaa attribuutti-scaffoldingin (' class="chip">', 'data-x="1"')
// ja JSON-muotoiset arvot. Kavennus on tarkoituksella kapein mahdollinen — ks. mutaatiotodiste alla.
// V8k-4a: markup-paloille OMA koodivartija. `codeish` ajetaan vain nollamarkup-haaralle, joten
// `<style>`-lohkon CSS-runko ja inline-onclickin JS-runko pääsivät paloina läpi (kaksi väärää
// positiivista, r4170/r4167). Vartija on TAHALLAAN kapea — vain syntaksi jota suomenkielisessä
// näyttötekstissä ei esiinny: CSS-sääntörunko `sel{prop:val;}` ja JS-jäsenpolku (document./this./classList.).
// Mutaatiotodiste: koko skriptin vuotomäärä laskee TÄSMÄLLEEN 2:lla (ks. testi alla).
const codeishPiece = (v) =>
  /\{[^}]*:[^}]*[;}]/.test(v) ||
  /^[a-z][a-z0-9_-]*:[^\s]/.test(v.trim()) ||   // V8k-4b: `avain:arvo`-token (esim. lahde:pelaaja) — `codeish`illa oli tämä jo, paloilla ei

  /\b(?:document|window|this)\.[A-Za-z_$]/.test(v) ||
  /\bclassList\.|\bgetElementById\(|\bquerySelectorAll?\(/.test(v);
const codeish = (v) =>
  /[;={}]/.test(v) || (/"/.test(v) && /[;={}<>]/.test(v)) || /_/.test(v) || /--/.test(v) || /var\(|\(--/.test(v) || /:\/\//.test(v) ||
  /rgba?\(|hsla?\(|gradient|calc\(/.test(v) ||   // V7a-live: CSS-funktioarvot ternaary-haaroissa (ei näyttöä)
  /\.(html|js|css|png|jpg|json)\b/.test(v) || /[?&][a-zA-Z]+=/.test(v) || /^#[0-9a-fA-F]{3,8}$/.test(v) ||
  /^[a-z][a-z-]*:/.test(v.trim()) ||                    // CSS-property-alku (background:/border-left:2px solid)
  /^\w+\(/.test(v.trim()) ||   // funktiokutsu-handler (act:n toiminto-arg setWs('x'))
  /^[a-z][a-zA-Z0-9]*$/.test(v) ||   // V8e-JF1: bare (VÄLILYÖNNITÖN) lowercase-token = enum/id/koodi
  /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(v.trim()) ||   // V8k-4b: paljas sähköpostiosoite (ei käännettävää)
  /^["'\s]*(selected|disabled|checked|readonly|required|multiple|hidden|open|active|under|uusi|empty|low|high|locked|sel)["'\s]*$/.test(v);  // HTML-attr/CSS-class-sanat (empty/low/high/locked/sel = tila-luokat, väliin ternaary-haarassa).
// Erä 2 -korjaus: sallitaan ympäröivä lainausmerkki/whitespace — attribuutti-scaffolding sulkee
// edellisen attribuutin lainauksen ('" selected'). Kun `"` ei enää yksinään ole codeish, tämä on
// ainoa paikka jossa se pitää yhä lukea koodiksi; ehto vaatii ettei literaalissa ole MITÄÄN muuta.

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
  const ID_ARG0 = new Set(['_setTxt', 'set', '_dSet']);   // (elementId, teksti) — arg 0 = id, ei näyttöä
  const SETTER_FNS = new Set(['toast', '_setTxt', '_dSet', 'idrow', 'kpi', 'fp', 'set', 'sel', 'tier', 'act', 'row', 'kattavuusSig']); // V7d: tier(n,l,col)/act(sev,teksti,sub,nappi) — label-argit näyttöä // V7a idrow · V7b kpi/fp/set · V7c sel(id,label,opts) — label-arg näyttöä // V8e-JF2: row(accId,ico,eyebrow,title,…) IDP-haitari — eyebrow/title-argit näyttöä (Jaksohistoria vuoti)
  const TXT_PROPS = new Set(['textContent', 'innerText', 'innerHTML']);
  const DISPLAY_PROPS = new Set(['teksti', 'title', 'sub', 'cta']); // V7b-live: object-property display-arvo (badge-objektit teksti:'🏥 Valmius'+x — gate-sokea epäsuora display)
  const inDisplayContext = (node) => {
    // V8d-oppi: template-quasi markup-kantavassa TemplateLiteralissa (`…${x} havaintoa · ${y} kautta</div>`)
    // — tag-viereetön quasi (' havaintoa · ') oli sokea piste; koko template rakentaa HTML:ää → quasit ovat näyttöä.
    if (node.type === 'TemplateLiteral' && node.quasis.some((q) => /[<>]/.test(q.value.cooked || ''))) return true;
    // V7f-live: vertailun operandi (e.code === 'permission-denied') EI ole näyttöä — se on arvo/enum-vertailu.
    // SETTER_FNS-esivanhempikävely muuten leimasi toast(...)-argissa olevan ternaary-testin vertailuliteraalin näytöksi.
    { const par = parentOf.get(node); if (par && par.type === 'BinaryExpression' && ['==', '===', '!=', '!=='].includes(par.operator)) return false; }
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
    // V7e: <arr>.push('…fi…') tekstiraportti-luokka (L.push) — ct on SUORA push-argumentti (ei sisennetty
    // toiseen kutsuun; qs.push(col.where('array-contains',…)) EI ole display).
    if (ctp && ctp.type === 'CallExpression' && ctp.callee && ctp.callee.type === 'MemberExpression' &&
        ctp.callee.property && ctp.callee.property.name === 'push' && ctp.arguments.includes(ct)) return true;
    let p = parentOf.get(node);
    for (let i = 0; p && i < 8; i++, p = parentOf.get(p)) {
      if (p.type === 'CallExpression' && p.callee && p.callee.type === 'Identifier' && SETTER_FNS.has(p.callee.name)) {
        // V8k: ID-ARGUMENTTI EI OLE NÄYTTÖÄ. _setTxt/set/_dSet ottavat (elementId, teksti) — koko-scriptin
        // lukko paljasti ~30 väärää positiivista ('greeting-name', 'season-phase', 'topbar-avatar'),
        // koska esivanhempikävely leimasi KAIKKI argumentit näytöksi. Vain arg 0 rajataan pois ja vain
        // näiltä kolmelta; muiden setterien argumenttijärjestys on erilainen (toast, idrow, kpi…).
        if (ID_ARG0.has(p.callee.name)) {
          let q = node, r = parentOf.get(q);
          while (r && r !== p) { q = r; r = parentOf.get(r); }
          if (r === p && p.arguments[0] === q) return false;
        }
        return true;
      }
    }
    return false;
  };

  const inRange = (ln) => ranges.some(([lo, hi]) => ln >= lo && ln <= hi);
  // Erä 4 -korjaus: isLib oli PREFIX-match → mikä tahansa chrome-teksti joka ALKAA lib-nimellä
  // allowlistattiin. Lib-nimi 'Fyysinen' peitti chrome-tekstin 'Fyysinen ikkuna' ja 'Tekninen' peitti
  // 'Tekninen vahvuus' — molemmat vuotivat sv-tilassa gaten ollessa vihreä (live paljasti). Nyt
  // täsmäys on EKSAKTI; ainoa jousto on ympäröivä välimerkki/whitespace, jonka palanpoiminta voi jättää.
  const libTrim = (x) => x.replace(/^[·—–\-/:()%.,+;!?"'\s]+/, '').replace(/[·—–\-/:()%.,+;!?"'\s]+$/, '');
  const isLib = (t) => LIB.has(t) || LIB.has(libTrim(t));
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
      if (!hasWord(p) || !hasWord(stripAllow(p)) || isLib(p) || codeishPiece(p)) continue; // 0A: tuotetermin JÄLKEEN ei fi:tä → ohita; muuten vuoto
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
    // V7e: L.push('…fi…') tekstiraportti-luokka napataan; qs.push(col.where('array-contains')) EI (data)
    const pushT = "function _r(){ var L=[]; L.push('Raakaraportti rivi'); var qs=[]; qs.push(col.where('x','array-contains',id)); return L; }";
    const pushHits = scanLeaks(pushT, [[1,99]], 0, new Set()).map((l)=>l.p);
    expect(pushHits).toContain('Raakaraportti rivi');
    expect(pushHits).not.toContain('array-contains');
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
    { expr: 'meta.nimi', ranges: [[12970, 14070]] }, // V4 kalenteri: KALENTERI_TYYPIT-tyyppinimi (§1 enum-avain fi, näyttö vpT)
    { expr: 'IDP_TILA_LBL[p.idp_tila]', ranges: [[6500, 6520], [14840, 14890]] }, // V6 idp_tila-statusnäyttö (§1 enum-avain fi, näyttö vpT)
    { expr: 'dm.nimi', ranges: [[15360, 15375]] }, // V7b domeeni-display fokusChip (lc-avain fi, näyttö vpT)
    { expr: 'k.nimi', ranges: [[14998, 15002]] }, // V7b-fix2 tuloskortti _vpTkAlue mittarilabel (lib-data, näyttö vpT)
    { expr: 'k.arvo', ranges: [[14998, 15002]] }, // V7b-fix2 tuloskortti _vpTkAlue mittari-arvo (Ei arviointeja vielä ym.)
    // V7+: esim. { expr: 'roolimap[rooli]', ranges: [[...]] }
    // ── Erä 3 (kuormanarratiivi) — KAKSI UUTTA SOKEAA LUOKKAA, kumpikin gaten ulottumattomissa:
    // (a) CONTAINER/MUUTTUJA-REITITETTY: acwrSana-ternaari on sidottu VariableDeclaratoriin, ei
    //     markup-ketjuun → inDisplayContext=false. Lisäksi 'linjassa'/'koholla'/'matala' ovat
    //     codeish-bare-lowercase-tokeneita → kaksinkertaisesti piilossa. Vartija vaatii vpT:n
    //     MÄÄRITTELYSSÄ (arvo reititetään kerran, muuttujaa käytetään markupissa vapaasti).
    { expr: "'kertyy ~4 vk'", ranges: [[10245, 10255]] },
    { expr: "'linjassa'", ranges: [[10245, 10255]] },
    { expr: "'koholla'", ranges: [[10245, 10255]] },
    { expr: "'matala'", ranges: [[10245, 10255]] },
    // (b) INLINE-ONCLICK-TOAST JS:N RAKENTAMASSA MARKUPISSA: toast(...) attribuuttimerkkijonon sisällä
    //     ei ole AST-kutsu (Erä 1:n kanavaportti ei näe) eikä >text< (render-gate ei näe). Reititys
    //     tehdään muuttujaan ennen merkkijonoa; vartija lukitsee sen.
    { expr: "'Kuorma pidetty ennallaan'", ranges: [[10245, 10255]] },
    // ── Erä 4 (mittausnäkymät). Kaksi luokkaa, kumpikin eri syystä gaten ulottumattomissa:
    // (4) CODEISH-PIILO: 'muokattavissa'/'luku' OVAT markup-ketjussa (display-konteksti tunnistuu),
    //     mutta codeish pudottaa ne bare-lowercase-tokeneina → sokeus tulee SISÄLLÖSTÄ, ei kontekstista.
    //     Tämä on erän 1. tapaus jossa luokka 4 esiintyy YKSINÄÄN (erässä 3 se kasautui luokan 5 päälle).
    { expr: "'muokattavissa'", ranges: [[10880, 10890]] },
    { expr: "'luku'", ranges: [[10880, 10890]] },
    // (5) CONTAINER/MUUTTUJA: arvo sidottu VariableDeclaratoriin (mt @10606, patteristo @10983),
    //     renderöidään vasta myöhemmin markupissa → inDisplayContext=false.
    { expr: "'mitätöity '", ranges: [[10865, 10875]] },
    { expr: "'H-H-patteristo'", ranges: [[11240, 11250]] },
    { expr: "'tekniikkakilpailu'", ranges: [[11240, 11250]] },
    { expr: "'mittaus'", ranges: [[11240, 11250]] },
  ];
  // Erä 4 (mittausnäkymät, _vpMittaus*-perhe) — ALUE-todiste 7 funktion yli.
  it('RANGES-alueet _vpMittaus* ovat oikeasti valvonnassa (mutaatio aitoon lähteeseen)', () => {
    const lines = HTML.split('\n');
    const src = lines.slice(RLO - 1, RHI - 1).join('\n');
    expect(scanLeaks(src, RANGES, RLO - 1, LIB).length).toBe(0);
    // kaksi eri funktiota perheen eri päistä → todistaa ettei vain yksi ankkuri osu
    const r1 = src.replace("vpT('Korjaa mittaus')", "'Korjaa mittaus'");
    expect(r1).not.toBe(src);
    expect(scanLeaks(r1, RANGES, RLO - 1, LIB).map((l) => l.p)).toContain('Korjaa mittaus');
    const r2 = src.replace("vpT('Mitä testit kertovat')", "'Mitä testit kertovat'");
    expect(r2).not.toBe(src);
    const l2 = scanLeaks(r2, RANGES, RLO - 1, LIB);
    expect(l2.map((l) => l.p)).toContain('Mitä testit kertovat');
    expect(l2.every((l) => l.line >= 10858 && l.line <= 11311)).toBe(true);
  });

  // Erä 4c — ENUM→NÄYTTÖ. TKI-mitali ('kulta'/'hopea'/'pronssi') on Firestore-arvo joka renderöityy
  // sellaisenaan; identifier-lauseke → AST-gate ei näe. LIVE paljasti "(TKI hopea)" sv-tilassa (gate
  // vihreä). Käännös tehdään VAIN renderissä — tallennettu arvo pysyy fi:nä (§23 tki_merkki).
  // MEMBER_DISPLAY ei sovi tähän: kääre on _jsvEsc(vpT(merkki)), jolloin vartijan etsimä lauseke ei
  // esiinny lähteessä lainkaan → se menisi vacuous-läpi. Siksi eksplisiittinen lähdeväite.
  it('TKI-mitali renderöidään vpT:n läpi, ei raakana enum-arvona', () => {
    const alue = HTML.split('\n').slice(11280, 11311).join('\n');
    expect(alue).toContain('vpT(merkki)');
    expect(alue).not.toMatch(/_jsvEsc\(merkki\)/);
    // ja mitaliarvot ovat kartassa (muuten vpT palauttaisi fi:n)
    const kartta = readFileSync(join(__dir, '..', 'lib', 'tm_vp_i18n.js'), 'utf8');
    ['kulta', 'hopea', 'pronssi'].forEach((k) => expect(kartta).toContain("'" + k + "':"));
  });

  // Erä 4b — isLib-KAVENNUS. Live paljasti että gate oli vihreä vaikka 'Fyysinen ikkuna' ja
  // 'Tekninen vahvuus' renderöityivät suomeksi: isLib oli PREFIX-match, ja lib-nimet 'Fyysinen'/
  // 'Tekninen' allowlistasivat minkä tahansa niillä ALKAVAN chrome-tekstin. Kavennus = eksakti
  // täsmäys (+ ympäröivä välimerkki). Ilman tätä casea kavennus voisi palautua huomaamatta.
  it('isLib täsmää EKSAKTISTI — lib-nimellä alkava chrome-teksti EI ole allowlistattu', () => {
    const lib = new Set(['Fyysinen', 'Tekninen', 'Pallonhallinta']);
    const snip = "function _n(){ return '<div><b>Fyysinen ikkuna</b> ja <b>Tekninen vahvuus</b></div>'; }";
    const hits = scanLeaks(snip, [[1, 99]], 0, lib).map((l) => l.p);
    expect(hits).toEqual(expect.arrayContaining(['Fyysinen ikkuna', 'Tekninen vahvuus']));
    // …mutta PELKKÄ lib-nimi (myös välimerkein) pysyy allowlistattuna — muuten curriculum-nimet vuotaisivat
    const puhdas = "function _p(){ return '<div><b>Fyysinen</b> · <b>Pallonhallinta,</b></div>'; }";
    expect(scanLeaks(puhdas, [[1, 99]], 0, lib).map((l) => l.p)).toEqual([]);
  });

  // V8k-4b — kaksi kapeaa laajennusta, molemmat mitattu (koko skripti 96 → 94, 0 uutta):
  //   (1) `Eerikkilä` = laitosnimi → PRODUCT-termi (kuten TalentMaster/Hidden Gem). Poistaa väärät
  //       positiivit joissa EI ole muuta kuin tuotetermi + lyhenne ('H-H/Eerikkilä', '/5 · Eerikkilä').
  //   (2) paljas sähköpostiosoite → codeish (ei koskaan käännettävää näyttötekstiä).
  // Molemmat PITÄÄ säilyttää kapeina: lause jossa Eerikkilä + suomea pysyy vuotona.
  it('Eerikkilä-tuotetermi ja sähköposti eivät vuoda — mutta Eerikkilä + fi-sana vuotaa yhä', () => {
    const vain = `function _a(){ return '<span>H-H/Eerikkilä</span><span>/5 · Eerikkilä</span>'; }`;
    expect(scanLeaks(vain, [[1, 99]], 0, new Set())).toEqual([]);
    const mail = `function _m(){ document.getElementById('x').textContent = 'demo@talentmaster.fi'; }`;
    expect(scanLeaks(mail, [[1, 99]], 0, new Set())).toEqual([]);
    const seka = `function _s(){ return '<div>Normivertailu (Eerikkilä, taso-3 = ikäluokan keskitaso)</div>'; }`;
    expect(scanLeaks(seka, [[1, 99]], 0, new Set()).map((l) => l.p))
      .toEqual(['Normivertailu (Eerikkilä, taso-3 = ikäluokan keskitaso)']);
  });

  // V8k-4a — codeishPiece-KAVENNUS. `codeish` ajetaan vain nollamarkup-haaralle, joten markup-
  // literaalista pilkotut palat pääsivät läpi ilman koodisuodatusta: `<style>`-lohkon CSS-runko ja
  // inline-onclickin JS-runko kirjautuivat "vuodoiksi" (r4170/r4167). Kavennus on tahallaan kapea.
  // TÄMÄ CASE PITÄÄ KAVENNUKSEN KAPEANA: näyttöteksti jossa on `;`/`=`/`:` EI saa hävitä.
  it('codeishPiece pudottaa CSS-/JS-rungon mutta EI välimerkillistä näyttötekstiä', () => {
    const css = `function _s(){ return '<style>[data-k].on{background:rgba(1,2,3,.1)!important;color:#28B090}</style>'; }`;
    expect(scanLeaks(css, [[1, 99]], 0, new Set())).toEqual([]);
    const js = `function _b(){ return '<button onclick="this.classList.remove(1);document.getElementById(2)">x</button>'; }`;
    expect(scanLeaks(js, [[1, 99]], 0, new Set())).toEqual([]);
    // …mutta aito näyttöteksti välimerkeillä pysyy vuotona (kavennus ei saa niellä sitä)
    // V8k-4b: `avain:arvo`-token (kenttänimi monospacena) — `codeish` tunsi tämän jo, palat eivät
    const kentta = `function _k(){ return '<div>x <span class="mono">lahde:pelaaja</span> y</div>'; }`;
    expect(scanLeaks(kentta, [[1, 99]], 0, new Set())).toEqual([]);
    const nayt = `function _n(){ return '<div>Taso 3 = ikäluokan keskitaso; vertaa varoen</div>'; }`;
    expect(scanLeaks(nayt, [[1, 99]], 0, new Set()).map((l) => l.p))
      .toEqual(['Taso 3 = ikäluokan keskitaso; vertaa varoen']);
    // …eikä kaksoispisteellinen NÄYTTÖTEKSTI (välilyönti perässä) saa hävitä
    const otsikko = `function _o(){ return '<div>Radar-normi: ikäluokan keskitaso</div>'; }`;
    expect(scanLeaks(otsikko, [[1, 99]], 0, new Set()).map((l) => l.p))
      .toEqual(['Radar-normi: ikäluokan keskitaso']);
  });

  // Erä 4 — TODISTE ETTÄ GATE ON SOKEA luokille 4 ja 5 (→ MEMBER_DISPLAY on ainoa vartija).
  it('codeish-bare-token ja container-muuttuja EIVÄT näy scanLeaksille', () => {
    // (4) display-konteksti tunnistuu, mutta codeish pudottaa bare-lowercase-tokenin
    const bare = "function _m(v){ return '<div>' + (v ? 'muokattavissa' : 'luku') + '</div>'; }";
    expect(scanLeaks(bare, [[1, 99]], 0, new Set())).toEqual([]);
    // (5) arvo VariableDeclaratorissa, renderöidään vasta myöhemmin
    const cont = "function _c(a,b){ var mt = 'mitätöity ' + a; return '<span>' + mt + '</span>'; }";
    expect(scanLeaks(cont, [[1, 99]], 0, new Set())).toEqual([]);
  });

  // Erä 3 (kuormanarratiivi) — ALUE-todiste + KAHDEN SOKEAN LUOKAN todiste. Huom: luokat (a) ja (b)
  // EIVÄT näy scanLeaksille lainkaan, joten niiden regressio on todistettava MEMBER_DISPLAY-vartijan
  // kautta (alla oma it()), ei gaten kautta. Tämä it() todistaa vain RANGES-alueen valvonnan.
  it('RANGES-alue kuormanarratiivi on oikeasti valvonnassa (mutaatio aitoon lähteeseen)', () => {
    const lines = HTML.split('\n');
    const src = lines.slice(RLO - 1, RHI - 1).join('\n');
    expect(scanLeaks(src, RANGES, RLO - 1, LIB).length).toBe(0);
    const rikki = src.replace("vpT('§28 kuormaehdotus:')", "'§28 kuormaehdotus:'");
    expect(rikki).not.toBe(src);
    const leaks = scanLeaks(rikki, RANGES, RLO - 1, LIB);
    expect(leaks.map((l) => l.p)).toContain('§28 kuormaehdotus:');
    expect(leaks.every((l) => l.line >= 9981 && l.line <= 11070)).toBe(true);
    // Kehon valmius -pää erikseen (toinen alue samassa erässä)
    const rikki2 = src.replace("vpT('🎯 Heikoin ketju:')", "'🎯 Heikoin ketju:'");
    expect(rikki2).not.toBe(src);
    expect(scanLeaks(rikki2, RANGES, RLO - 1, LIB).map((l) => l.p).join(' ')).toContain('Heikoin ketju');
  });

  // Erä 3 — TODISTE ETTÄ GATE ON NÄILLE SOKEA (ja siksi vartija on välttämätön, ei koristeellinen).
  it('container-ternaari ja inline-onclick-toast EIVÄT näy scanLeaksille (→ MEMBER_DISPLAY-vartija)', () => {
    // (a) ternaari VariableDeclaratorissa: ei markup-ketjua → ei display-kontekstia
    const varT = "function _v(a){ const sana = a == null ? 'kertyy ~4 vk' : a > 1.3 ? 'koholla' : 'matala'; return '<div>' + sana + '</div>'; }";
    expect(scanLeaks(varT, [[1, 99]], 0, new Set())).toEqual([]);
    // (b) toast() attribuuttimerkkijonon sisällä: merkkijonoa, ei kutsua
    const inline = "function _b(){ return '<button onclick=\"toast(\\'Kuorma pidetty ennallaan\\',\\'ok\\')\">OK</button>'; }";
    expect(scanLeaks(inline, [[1, 99]], 0, new Set()).map((l) => l.p)).not.toContain('Kuorma pidetty ennallaan');
  });

  // Erä 2 (renderSignals) — ALUE-erän todiste. Edellinen it() todistaa että DETEKTORI toimii;
  // tämä todistaa että UUSI RANGES-ALUE on oikeasti valvonnassa (ankkuri voisi osoittaa väärään
  // kohtaan ja gate näyttäisi silti vihreää). Mutaatio tehdään AITOON lähteeseen, ei snippettiin.
  it('RANGES-alue [3539,3766] renderSignals on oikeasti valvonnassa (mutaatio aitoon lähteeseen)', () => {
    const lines = HTML.split('\n');
    const src = lines.slice(RLO - 1, RHI - 1).join('\n');
    expect(scanLeaks(src, RANGES, RLO - 1, LIB).length).toBe(0);          // lähtötila puhdas
    // unroutaa yksi kytkentä renderSignalsin sisällä → gaten PITÄÄ punastua juuri siellä
    const rikki = src.replace("cta: vpT('Hyväksy →')", "cta: 'Hyväksy →'");
    expect(rikki).not.toBe(src);
    const leaks = scanLeaks(rikki, RANGES, RLO - 1, LIB);
    expect(leaks.map((l) => l.p)).toContain('Hyväksy →');
    expect(leaks.every((l) => l.line >= 3539 && l.line <= 3766)).toBe(true);

    // 3658 (lainausmerkillinen sub) — juuri se vuoto jonka gate PÄÄSTI LÄPI ennen codeish-kovennusta.
    // Tämä case lukitsee korjauksen: unroutaus on nyt havaittava, ei enää hiljainen.
    const rikki2 = src.replace(
      "sub: vpT('Lisää valmentajan arvio → trianguloitu D3 (avaa pelaajakortti · \"Arvioi (VP)\")')",
      "sub: 'Lisää valmentajan arvio → trianguloitu D3 (avaa pelaajakortti · \"Arvioi (VP)\")'"
    );
    expect(rikki2).not.toBe(src);
    const leaks2 = scanLeaks(rikki2, RANGES, RLO - 1, LIB);
    expect(leaks2.length).toBeGreaterThan(0);
    expect(leaks2.every((l) => l.line >= 3539 && l.line <= 3766)).toBe(true);
  });

  // Erä 2: gate laajennettiin näkemään signaaliobjektien näyttökentät + kattavuusSig-argumentti.
  // Ilman näitä renderSignalsin teksti olisi jäänyt pysyvästi sokeaksi pisteeksi (RANGES ei olisi auttanut).
  it('signaaliobjektin title/sub/cta ja kattavuusSig-argumentti ovat display-kontekstia', () => {
    const sig = "function _s(){ return [{prio:'warn', title:'Raakaotsikko', sub:'Raakaalaotsikko', cta:'Raakanappi →'}]; }";
    const sh = scanLeaks(sig, [[1, 99]], 0, new Set()).map((l) => l.p);
    expect(sh).toEqual(expect.arrayContaining(['Raakaotsikko', 'Raakaalaotsikko', 'Raakanappi →']));
    const ks = "function _k(){ kattavuusSig(n, 'Raaka kattavuusteksti'); kattavuusSig(n, vpT('OK-teksti')); }";
    const kh = scanLeaks(ks, [[1, 99]], 0, new Set()).map((l) => l.p);
    expect(kh).toContain('Raaka kattavuusteksti');
    expect(kh).not.toContain('OK-teksti');
    // enum/koodiarvot samoissa objekteissa EIVÄT saa flagaantua
    const enumi = "function _e(){ return [{prio:'crit', ctaClass:'amber-cta', action:\"setWs('kalenteri')\", title:vpT('OK')}]; }";
    expect(scanLeaks(enumi, [[1, 99]], 0, new Set()).map((l) => l.p)).toEqual([]);
    // Erä 2 -korjaus — LAINAUSMERKKI EI PIILOTA NÄYTTÖTEKSTIÄ. Ennen kovennusta `codeish` luokitteli
    // minkä tahansa `"`-merkin sisältävän literaalin koodiksi → DISPLAY_PROPS-arvo joka siteeraa
    // UI-nappia vuoti hiljaa (rivi 3658). Ilman tätä casea kovennus ei olisi valvottu.
    const lain = "function _q(){ return [{sub:'Testi \"lainaus\" tähän', title:vpT('OK')}]; }";
    expect(scanLeaks(lain, [[1, 99]], 0, new Set()).map((l) => l.p).join(' ')).toContain('lainaus');
    // …mutta attribuutti-scaffolding pysyy koodina (muuten '" selected' -luokka alkaisi vuotaa FP:nä)
    const attr = "function _a(v){ return '<option value=\"' + v + '\"' + (v ? '\" selected' : '\"') + '>'; }";
    expect(scanLeaks(attr, [[1, 99]], 0, new Set()).map((l) => l.p)).toEqual([]);
    // …ja aito koodirakenne lainausmerkin kanssa pysyy koodina
    const koodi = "function _c(){ return [{sub:'data-x=\"1\" muuta'}]; }";
    expect(scanLeaks(koodi, [[1, 99]], 0, new Set()).map((l) => l.p)).toEqual([]);
  });

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
    // V8k-4b — EI-VACUOUS PER ENTRY: rivinumeroihin ankkuroitu vartija rappeutuu hiljaa kun koodi
    // siirtyy (todettu: 15/16 aluetta oli ajautunut niin ettei yksikään osuma ollut enää alueella →
    // vartija meni läpi tyhjänä). Nyt jokaisen entryn on osuttava vähintään kerran, muuten punainen.
    const tyhjat = [];
    for (const { expr, ranges } of MEMBER_DISPLAY) {
      let n = 0;
      for (const [lo, hi] of ranges) for (let ln = lo; ln <= hi; ln++) {
        const line = lines[ln - 1]; if (line) n += line.split(expr).length - 1;
      }
      if (!n) tyhjat.push(`${expr} @ ${JSON.stringify(ranges)} — 0 osumaa (alue ajautunut)`);
    }
    expect(tyhjat).toEqual([]);
    // Ei-vacuous: skanneri nappaa bare-muodon (synteettinen todiste)
    const probe = ['x = meta.nimi + "y"', 'x = vpT(meta.nimi)'];
    const pbad = probe.filter((l, idx) => { const i = l.indexOf('meta.nimi'); return l.slice(i - 4, i) !== 'vpT(' && idx === 0; });
    expect(pbad.length).toBe(1); // rivi 0 (bare) napataan, rivi 1 (vpT) ei
    expect(bad).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RESOLVI-PORTTI (Erä 2). Gate yllä todistaa että literaali on KÄÄRITTY. Se ei todista että kääre
// TUOTTAA ruotsia: puuttuva karttarivi tai strip-variantti (`vpT(' x ')` kun avain on `'x'`) näyttää
// gatelle reititetyltä mutta renderöityy sv-tilassa suomeksi. Tämä portti sulkee sen aukon koko
// RANGES-alueelta — ei vain uudelta erältä. Sääntö on AVAIMEN OLEMASSAOLO, ei arvon eroavuus:
// osa termeistä on ruotsiksi identtisiä (Showcase · Deadline · Fokus), ja ne kirjataan eksplisiittisesti
// karttaan sen sijaan että portti arvaisi. Portti löysi käyttöönotossa 5 aiemmin näkymätöntä aukkoa.
describe('VP_v25 resolvi-portti — jokaisella reititetyllä avaimella on sv-rivi', () => {
  const kerääAvaimet = () => {
    const lines = HTML.split('\n');
    const src = lines.slice(RLO - 1, RHI - 1).join('\n');
    const ast = acorn.parse(src, { ecmaVersion: 2022, locations: true, ranges: true });
    const inR = (l) => RANGES.some(([a, b]) => l >= a && l <= b);
    const out = new Set();
    (function w(n) {
      if (!n || typeof n !== 'object') return;
      if (n.type === 'CallExpression' && n.callee && n.callee.type === 'Identifier' && n.callee.name === 'vpT') {
        const a = n.arguments[0];
        if (a && a.type === 'Literal' && typeof a.value === 'string' && inR(a.loc.start.line + (RLO - 1))) out.add(a.value);
      }
      for (const k in n) { const v = n[k]; if (Array.isArray(v)) v.forEach(w); else if (v && typeof v === 'object' && v.type) w(v); }
    })(ast);
    return out;
  };
  const kartat = () => {
    const sb = { console: { log() {}, warn() {}, error() {} } };
    sb.window = sb;
    vm.createContext(sb);
    ['lib/tm_lang.js', 'lib/tm_i18n_common.js', 'lib/tm_vp_i18n.js']
      .forEach((f) => vm.runInContext(readFileSync(join(__dir, '..', f), 'utf8'), sb));
    return sb;
  };

  it('0 vpT-avainta ilman sv-riviä (common tai VP-sivukartta)', () => {
    const sb = kartat();
    const cm = (sb.TM_I18N_COMMON && sb.TM_I18N_COMMON.sv) || {};
    const vp = (sb.TM_VP_I18N && sb.TM_VP_I18N.sv) || {};
    const puuttuu = [...kerääAvaimet()].filter((k) => typeof cm[k] !== 'string' && typeof vp[k] !== 'string');
    expect(puuttuu).toEqual([]);
  });
  it('ei-vacuous: avaimia on runsaasti eikä keräys ole tyhjä', () => {
    expect(kerääAvaimet().size).toBeGreaterThan(1000);
  });
  it('EI VACUOUS: keksitty avain EI ole kartassa (portti todella tarkistaa)', () => {
    const sb = kartat();
    const vp = (sb.TM_VP_I18N && sb.TM_VP_I18N.sv) || {};
    expect(typeof vp['Tätä avainta ei ole olemassa xyzzy']).not.toBe('string');
  });
  it('strip-variantti EI kelpaa: avain välilyönteineen on eri avain kuin ilman', () => {
    const sb = kartat();
    const vp = (sb.TM_VP_I18N && sb.TM_VP_I18N.sv) || {};
    expect(typeof vp['Hyväksy →']).toBe('string');
    expect(typeof vp[' Hyväksy → ']).not.toBe('string');
  });
});
