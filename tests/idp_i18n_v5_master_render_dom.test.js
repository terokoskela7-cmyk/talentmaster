/**
 * i18n Vaihe 5 · Raita B (Master_v16) — RENDER-KIELINEUTRAALI-GATE (Erä 3 DoD-ydin).
 *
 * Aiemmin ei ollut committattua render-JS-gatea (vain ad-hoc-skanneri) → "100 % sv" ei ollut
 * pakotettavissa. Tämä source-scanner-gate skannaa render-JS-alueen (pääscript 1861→) näkyvät
 * näyttöliteraalit (`>text<` JA `'...'`) ja failaa jos yksikään on TM_MASTER_I18N.sv/-common-avain
 * joka EI ole reititetty masterT:llä → renderöityisi fi:nä sv-tilassa.
 *
 * KRIITTINEN "routed"-määritelmä: literaali on reititetty jos se esiintyy MINKÄ TAHANSA masterT(...)-
 * kutsun argumenttialueella — EI vain `masterT('literal')`. Tämä kattaa:
 *   · suora            masterT('x')                         → DIRECT
 *   · ehto/konkat      masterT(cond ? 'x' : 'y')            → DIRECT (literaali arg-alueella)
 *   · const-kartta     const M={k:'x'}; …masterT(M[k])      → CONTAINER (M ∈ routed-identit)
 *   · muuttuja-uudel.  suositus='x'; …masterT(suositus)     → CONTAINER (reassign routed-identille)
 *   · objekti-props    masterT(o.nimi) → { nimi:'x' }        → PROP
 *   · silmukka-array   ARR.map(c=>…masterT(c[1]))           → LOOP-ARRAY (ARR ∈ routed-identit)
 *
 * Allowlist (tietoiset fi-jäänteet, EIVÄT näyttöä): demo §3 (1914–2053) · KETJU_NIMET §1-const
 * (2680–2683) · §21 demo-mockup (9350–9372) · enum-arvo-kentät (kind:/tila:/…/otsikko:/protokolla:) ·
 * enum-vertailuoperandit (=== 'x') · tuotetermit (X-Factor/Hidden Gem/Underdog/CPD-full-name) ·
 * demo-toastit ('… (demo …)') · inline-enum-array `[…].forEach(v=>…masterT(v))`.
 *
 * Rajaus: staattisen body-chromen kattaa erillinen staattinen-DOM-vartija (idp_i18n_v5_master_static_dom).
 * Tämä gate = Erä 3:n hyväksyntäkriteeri: reititä kunnes residuaali = 0 (pakotettu + regressiosuojattu).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __dir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const Msv = require('../lib/tm_master_i18n.js').TM_MASTER_I18N.sv;
const Csv = require('../lib/tm_i18n_common.js').TM_I18N_COMMON.sv;
const HTML = readFileSync(join(__dir, '..', 'TalentMaster_Master_v16.html'), 'utf8');

const dec = (t) => t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
function resolvesSv(t) {
  for (const K of [Msv, Csv]) for (const x of [t, dec(t)]) if (x in K && K[x] !== x) return true;
  return false;
}

// Render-JS-alue = pääscript (1-indeksoitu 1861..9813). Ankkuroidaan DEMO-lohkon + navin läsnäoloon
// ettei alue lipsahda tuntemattomasti; rajat lasketaan script-tageista.
function renderRegion(lines) {
  // pääscript = ensimmäinen <script> ilman src-attribuuttia rivin 1800 jälkeen
  let lo = -1;
  for (let i = 1800; i < lines.length; i++) {
    if (/^\s*<script>\s*$/.test(lines[i])) { lo = i + 1; break; } // 1-indeksoitu ensimmäinen rivi scriptin sisällä
  }
  let hi = -1;
  for (let i = lo; i < lines.length; i++) {
    if (/^\s*<\/script>/.test(lines[i])) { hi = i; break; } // 1-indeksoitu sulkeva rivi (poissuljettu)
  }
  return { lo, hi }; // 1-indeksoidut, lo mukana .. hi-1 mukana
}

// DIRECT: literaalit MINKÄ TAHANSA masterT(...)-kutsun arg-alueella (paren-matching, string-tietoinen)
function buildDirect(src) {
  const routed = new Set();
  let i = 0;
  const n = src.length;
  while (true) {
    const j = src.indexOf('masterT(', i);
    if (j < 0) break;
    let k = j + 8, depth = 1, q = null;
    const st = k;
    while (k < n && depth > 0) {
      const c = src[k];
      if (q) {
        if (c === '\\') { k += 2; continue; }
        if (c === q) q = null;
      } else if (c === "'" || c === '"' || c === '`') q = c;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      k++;
    }
    const arg = src.slice(st, k - 1);
    const lre = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = lre.exec(arg))) {
      const s = (m[1] ?? m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
      routed.add(s);
      routed.add(s.trim()); // trailing-space-varianti: masterT('Kausi ')
    }
    i = k;
  }
  return routed;
}

describe('Master render-kielineutraali-gate (Erä 3 DoD-ydin)', () => {
  it('render-JS-alueella (pääscript) 0 reitittämätöntä [K]-näyttöliteraalia', () => {
    const lines = HTML.split('\n');
    const { lo, hi } = renderRegion(lines);
    expect(lo).toBeGreaterThan(1800);
    expect(hi).toBeGreaterThan(lo);
    const region = lines.slice(lo - 1, hi - 1).join('\n');

    const DIRECT = buildDirect(region);
    const DIRECT_BLOBS = [...DIRECT].filter((d) => d.includes('<'));

    // routed-identit: V annettu masterT:lle muodossa masterT(V) / masterT(V[..]) / masterT(V.x)
    const ROUTED_IDENTS = new Set();
    for (const m of region.matchAll(/masterT\(\s*(\w+)\s*[)[.]/g)) if (m[1] !== 'masterT') ROUTED_IDENTS.add(m[1]);
    // LOOP-ARRAY: ARR.filter/map/forEach(V=>…) jossa V (tai V[..]) reititetään → ARR ∈ routed
    for (const m of region.matchAll(/(\w+)\s*\.\s*(?:filter|map|forEach)\(\s*(\w+)\s*=>/g)) {
      const lv = m[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp('masterT\\(\\s*' + lv + '\\s*[)[.]').test(region)) ROUTED_IDENTS.add(m[1]);
    }
    // PROPS: masterT(x.PROP) → objekti-literaalin `PROP:'…'`-arvot renderöityvät sv. 'section' todennettu
    // (CP_BASE.map(c=>c.section) → masterT(sec), rivit 9673/9677).
    const PROPS = new Set(['section']);
    for (const m of region.matchAll(/masterT\(\s*\w+\.(\w+)/g)) PROPS.add(m[1]);

    // CONTAINER: `const/let/var V = {`/`[` -lohkot (+ yksirivinen reassign V='…') joissa V ∈ ROUTED_IDENTS
    const containerLines = new Set();
    let depth = 0, active = false;
    for (let idx = lo - 1; idx < hi - 1; idx++) {
      const raw = lines[idx];
      if (!active) {
        const m = raw.match(/(?:const|let|var)\s+(\w+)\s*=\s*([[{])/);
        if (m && ROUTED_IDENTS.has(m[1])) {
          active = true; depth = 0;
          for (const ch of raw.slice(m.index + m[0].length - 1)) {
            if (ch === '[' || ch === '{') depth++;
            else if (ch === ']' || ch === '}') depth--;
          }
          containerLines.add(idx + 1);
          if (depth <= 0) active = false;
        } else {
          for (const rm of raw.matchAll(/(?:^|[;{?])\s*(?:const|let|var\s+)?(\w+)\s*=\s*['"]/g)) {
            if (ROUTED_IDENTS.has(rm[1])) { containerLines.add(idx + 1); break; }
          }
        }
      } else {
        containerLines.add(idx + 1);
        for (const ch of raw) {
          if (ch === '[' || ch === '{') depth++;
          else if (ch === ']' || ch === '}') depth--;
        }
        if (depth <= 0) active = false;
      }
    }

    const PROD = /X-Factor|Hidden Gem|Underdog|Continuing Professional Development/;
    const ENUM_FIELD = /(?:kind|tila|domeeni|malli|lahde|faasi|ketju|otsikko|protokolla)\s*:\s*$/;
    const CMP = /[=!]==?\s*$/;
    const isAllowedRegion = (ln) =>
      (ln >= 1914 && ln <= 2053) || (ln >= 2680 && ln <= 2683) || (ln >= 9350 && ln <= 9372);

    const leaks = [];
    for (let idx = lo - 1; idx < hi - 1; idx++) {
      const ln = idx + 1;
      const line = lines[idx];
      if (isAllowedRegion(ln) || containerLines.has(ln)) continue;
      // inline-enum-array `[…].forEach/map(v=>…masterT(v))`
      if (line.includes('masterT(') && /\]\.(?:forEach|map)\(/.test(line)) continue;

      for (const m of line.matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
        const ts = m[1].replace(/\\'/g, "'").trim();
        if (!ts || !resolvesSv(ts)) continue;
        if (DIRECT.has(ts) || DIRECT.has(dec(ts)) || PROD.test(ts) || ts.includes('(demo')) continue;
        const pre = line.slice(0, m.index);
        if (ENUM_FIELD.test(pre) || CMP.test(pre)) continue;
        const pm = pre.match(/(\w+)\s*:\s*$/); // PROP-routed
        if (pm && PROPS.has(pm[1])) continue;
        leaks.push(`  ${ln} [q] ${JSON.stringify(ts.slice(0, 70))}`);
      }
      for (const m of line.matchAll(/>([^<>{}`]+)</g)) {
        const ts = m[1].trim();
        if (!ts || !resolvesSv(ts)) continue;
        if (DIRECT.has(ts) || DIRECT.has(dec(ts)) || PROD.test(ts)) continue;
        if (DIRECT_BLOBS.some((b) => b.includes('>' + ts + '<'))) continue; // osa masterT-arg-HTML:ää
        leaks.push(`  ${ln} [>] ${JSON.stringify(ts.slice(0, 70))}`);
      }
    }

    if (leaks.length) {
      throw new Error(
        `Render-JS-alueella ${leaks.length} reitittämätöntä [K]-näyttöliteraalia (renderöityy fi sv-tilassa).\n` +
          'Kytke masterT:llä (tai lisää tietoinen allowlist jos aito fi-jäänne):\n' +
          leaks.join('\n')
      );
    }
    expect(leaks.length).toBe(0);
  });
});
