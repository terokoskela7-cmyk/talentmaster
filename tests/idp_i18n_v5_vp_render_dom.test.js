/**
 * i18n Vaihe 5 · Raita B (VP_v25) — RENDER-KIELINEUTRAALI-GATE (step G, committattu).
 *
 * VP:n vuotoluokka: RAAKA reitittämätön fi näkyvässä `>…<`-tekstisolmussa TAI `title=`/`placeholder=`-
 * attribuutissa. **Resolvi-todiste EI nappaa tätä** — se todistaa vain että REITITETYT avaimet resolvoituvat,
 * ei että kaikki näyttöliteraalit on reititetty. Tämä source-scanner failaa jos näkyvä display-literaali
 * sisältää luonnollisen (fi) sanan EIKÄ ole minkään `vpT(...)`-argin alueella eikä allowlistissa.
 *
 * "routed" = literaali (tai sen sisältävä koko-fragmentti) esiintyy jonkin `vpT(...)`-kutsun arg-alueella.
 * Allowlist: §7 lib-curriculum-nimet (tm_fyysteemat/tm_teknistaktiset/tm_arviointi_taksonomia nimi_fi —
 * lib-sv on oma raita) · tuotetermit (X-Factor/Hidden Gem/Underdog) · lyhenteet/indeksit/yksiköt
 * (TKI/TSI/H-H/PHV/D1–D5/RPE/ADAR/CPD/MAS/CMJ/…) · koodi (`' + `/`${}`/`&&`/…). C-suffiksit ('/5 alue',
 * '/3 valtak.') = PROVISORINEN allowlist (odottaa Teron päätöstä display vs lyhenne).
 *
 * SCOPE: RANGES = reititetyt render-alueet. V3 = _jsv (8040–9221). **Jokainen tuleva alaerä (V4–V8)
 * LISÄÄ oman alueensa tähän** → gate guardaa ne heti kun ne on reititetty.
 *
 * Negatiivitestattu: yhden stringin reitityksen poisto → gate failaa (ei tyhjää läpimenoa).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_VP_v25.html'), 'utf8');

const RLO = 2679, RHI = 17921;              // VP pääscript
const RANGES = [[8040, 9221]];              // reititetyt alueet (V3 _jsv). V4–V8: lisää tähän.

// §7 lib-curriculum-nimet (jäävät fi → allowlist)
function libNames() {
  const out = new Set();
  const walk = (o) => {
    if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
      if ((k === 'nimi_fi' || k === 'nimi' || k === 'fi') && typeof v === 'string') out.add(v);
      else walk(v);
    }
  };
  for (const L of ['tm_fyysteemat', 'tm_teknistaktiset', 'tm_arviointi_taksonomia']) {
    try { walk(require('../lib/' + L + '.js')); } catch { /* lib puuttuu → ohita */ }
  }
  return out;
}

// DIRECT: literaalit minkä tahansa vpT(...)-argin alueella (paren-matching, string-tietoinen)
function buildDirect(src) {
  const routed = new Set();
  let i = 0; const n = src.length;
  while (true) {
    const j = src.indexOf('vpT(', i);
    if (j < 0) break;
    let k = j + 4, depth = 1, q = null; const st = k;
    while (k < n && depth > 0) {
      const c = src[k];
      if (q) { if (c === '\\') { k += 2; continue; } if (c === q) q = null; }
      else if (c === "'" || c === '"' || c === '`') q = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      k++;
    }
    const arg = src.slice(st, k - 1);
    const lre = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = lre.exec(arg))) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
      routed.add(s); routed.add(s.trim());
    }
    i = k;
  }
  return routed;
}

describe('VP_v25 render-kielineutraali-gate (step G)', () => {
  it('reititetyillä render-alueilla 0 raakaa reitittämätöntä fi-näyttöliteraalia (>text< + title=/placeholder=)', () => {
    const lines = HTML.split('\n');
    const region = lines.slice(RLO - 1, RHI).join('\n');
    const DIRECT = buildDirect(region);
    const DIRECTlong = [...DIRECT].filter((d) => d.length > 4);
    const LIB = libNames();

    const PRODUCT = /X-Factor|Hidden Gem|Underdog/;
    const ABBR = 'TKI|TSI|H-H|PHV|D[1-5]|RPE|ADAR|CPD|DVI|MAS|CMJ|SJ|FLEI|VAI\\+?|RAE|OVR|EI|FVP|VNE|SM|TK|IDP|VP|UA|meso|makro|mikro|Cue|cue|ka|cm|kg|min|vk|pv|kk|km/h|m/s';
    const ABBR_ONLY = new RegExp('^(?:\\s|[·—–\\-/:()%.,+↑↓→▾▴◆⚠★☆●○≥≤<>&;0-9]|&amp;|&nbsp;|(?:' + ABBR + '))+$');
    const C_ALLOW = new Set(['/5 alue', '/3 valtak.', 'alue', 'valtak.']); // PROVISORINEN (Tero)

    const hasWord = (t) => /[A-Za-zÄÖÅäöå]{3,}/.test(t) && !ABBR_ONLY.test(t);
    const codeLike = (t) =>
      t.includes("'") || t.includes('${') || t.includes(' + ') || t.includes('var(') ||
      t.includes('=>') || t.includes('&&') || t.includes('||') || (t.includes(';') && t.includes('{'));
    const isLib = (t) => {
      if (LIB.has(t)) return true;
      for (const L of LIB) if (L.length >= 6 && (t === L || t.startsWith(L) || (t.length >= 6 && L.startsWith(t)))) return true;
      return false;
    };
    const routed = (t) => DIRECT.has(t) || DIRECTlong.some((b) => b.length > t.length && b.includes(t));

    const leaks = [];
    for (const [lo, hi] of RANGES) {
      for (let ln = lo; ln <= hi; ln++) {
        const line = lines[ln - 1];
        if (line == null) continue;
        const cands = [];
        for (const m of line.matchAll(/>([^<>{}`]+)</g)) cands.push(['>', m[1]]);
        for (const m of line.matchAll(/title="([^"]*)"/g)) cands.push(['title', m[1]]);
        for (const m of line.matchAll(/placeholder="([^"]*)"/g)) cands.push(['placeholder', m[1]]);
        for (const [kind, raw] of cands) {
          const t = raw.trim();
          if (!t || codeLike(t) || !hasWord(t)) continue;
          if (routed(t) || C_ALLOW.has(t) || PRODUCT.test(t) || isLib(t)) continue;
          leaks.push(`  ${ln} [${kind}] ${JSON.stringify(t.slice(0, 70))}`);
        }
      }
    }

    if (leaks.length) {
      throw new Error(
        `Reititetyillä VP-render-alueilla ${leaks.length} raakaa reitittämätöntä fi-näyttöliteraalia ` +
          '(renderöityy fi sv-tilassa; resolvi-todiste ei nappaa tätä luokkaa).\n' +
          'Kytke vpT:llä (tai lisää tietoinen allowlist):\n' + leaks.join('\n')
      );
    }
    expect(leaks.length).toBe(0);
  });
});
