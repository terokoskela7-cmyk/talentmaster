#!/usr/bin/env node
// PostToolUse-koukku (Edit|Write|MultiEdit) — nappaa TalentMasterin dokumentoidut hiljaiset failit
// heti muokkauksen jälkeen. Kaikki tarkistukset ovat REGRESSIOPOHJAISIA tai baseline-puhtaita, joten
// koukku ei huuda olemassa olevalle koodille. Fail-open: sisäinen virhe → exit 0 (ei koskaan estä työtä).
//
// Tarkistukset:
//   A. Backtick-parillisuus REGRESSIO vs HEAD (§7.1 — pariton backtick = rikkonut template-literaalin → musta ruutu).
//   B. Kommentti-stripattu invarianttigrep: `firebase.functions()` ilman regionia (§7.4) · `.doc(palloId)` (§7.13).
//   C. ESLint muokattuun tiedostoon (baseline puhdas → mikä tahansa virhe = tämän muokkauksen regressio).
//   D. Kanonisille logiikkatiedostoille (lib/ + vakiokopiot): `vitest run` (§21/§25 — 3 kopiota pysyttävä synkassa).
//
// Estävä löydös → stderr + exit 2 (Claude näkee syyn). Puhdas → exit 0.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const PROJ = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

// Kommenttien riisunta rivikohtaisesti (riittää yksirivisiin invariantteihin): leikkaa `//`-kohdasta,
// ohita puhtaat lohkokommenttirivit (* alussa). EI täydellinen JS-parseri — vain false-positive-suoja.
function stripComment(line) {
  const t = line.trimStart();
  if (t.startsWith('*') || t.startsWith('/*') || t.startsWith('//')) return '';
  const i = line.indexOf('//');
  return i >= 0 ? line.slice(0, i) : line;
}

function backtickCount(s) {
  const m = s.match(/`/g);
  return m ? m.length : 0;
}

function gitHeadContent(rel) {
  try {
    return execFileSync('git', ['show', `HEAD:${rel}`], { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // uusi tiedosto (ei HEADissa)
  }
}

// Kanoniset logiikkatiedostot joissa vakiokopiot / Vitest-kattavuus (aja testit muokkauksen jälkeen).
function tarvitseeTestit(rel) {
  if (rel.startsWith('lib/') && rel.endsWith('.js')) return true;
  if (rel.startsWith('src/lib/') && rel.endsWith('.js')) return true;
  return ['docs/testit_indeksit.js', 'harjoitelogiikka_v4.js'].includes(rel);
}

function main() {
  const raw = readStdin();
  let evt;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }
  const fp = evt?.tool_input?.file_path;
  if (!fp) process.exit(0);

  const rel = path.relative(PROJ, path.resolve(PROJ, fp));
  if (rel.startsWith('..')) process.exit(0);                    // repon ulkopuolella
  if (!/\.(html|js)$/.test(rel)) process.exit(0);               // vain html/js
  if (/^(node_modules|tests)\//.test(rel)) process.exit(0);     // ohita riippuvuudet + testit itse

  let content;
  try { content = readFileSync(path.resolve(PROJ, fp), 'utf8'); } catch { process.exit(0); }

  const issues = [];

  // ── A. Backtick-parillisuus regressio (§7.1) ──
  const nyt = backtickCount(content);
  if (nyt % 2 === 1) {
    const head = gitHeadContent(rel);
    const baselineOk = head === null ? false : (backtickCount(head) % 2 === 0);
    // Vain jos HEAD oli parillinen (tai uusi tiedosto) → tämä muokkaus rikkoi parillisuuden.
    if (head === null || baselineOk) {
      issues.push(`§7.1 backtick-parillisuus: ${rel} — pariton määrä backtickeja (${nyt}). ` +
        `Todennäköisesti rikkinäinen template-literaali → musta ruutu. Käytä string-konkatenaatiota (+).`);
    }
  }

  // ── B. Invarianttigrep (kommentti-stripattu) ──
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const code = stripComment(lines[i]);
    if (/firebase\.functions\(\)/.test(code)) {
      issues.push(`§7.4 väärä region: ${rel}:${i + 1} — firebase.functions() → us-central1 (hiljainen fail). ` +
        `Käytä firebase.app().functions('europe-west1').`);
    }
    if (/\.doc\(\s*palloI[dD]\s*\)/.test(code)) {
      issues.push(`§7.13 PalloID ≠ doc-ID: ${rel}:${i + 1} — .doc(palloId) palauttaa "not found" rekisteröidyille. ` +
        `Hae where('tunniste','==',String(palloId)).`);
    }
  }

  // ── C. ESLint muokattuun tiedostoon ──
  try {
    execFileSync('node_modules/.bin/eslint', ['--no-warn-ignored', rel], { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    // exit 1 = lint-virheitä (estä); exit 2 = eslintin oma kaatuminen (fail-open).
    if (e.status === 1) {
      const out = (e.stdout || '') + (e.stderr || '');
      issues.push(`ESLint-virhe ${rel}:\n${out.trim().split('\n').slice(0, 25).join('\n')}`);
    }
  }

  // ── D. Vitest kanonisille logiikkatiedostoille (§21/§25 vakiokopiot) ──
  if (tarvitseeTestit(rel)) {
    try {
      execFileSync('node_modules/.bin/vitest', ['run', '--exclude', 'tests/rules/**'], { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) {
      const out = (e.stdout || '') + (e.stderr || '');
      const tail = out.trim().split('\n').filter(l => /✗|×|FAIL|failed|Error/i.test(l)).slice(0, 20).join('\n');
      issues.push(`Vitest punainen muokattuasi ${rel} (§21/§25 vakiot 3 kopiona — pysyttävä synkassa):\n${tail || out.trim().split('\n').slice(-15).join('\n')}`);
    }
  }

  if (issues.length) {
    process.stderr.write('⛔ TalentMaster-invarianttikoukku esti muutoksen:\n\n' + issues.map(s => '• ' + s).join('\n\n') + '\n');
    process.exit(2);
  }
  process.exit(0);
}

try { main(); } catch { process.exit(0); } // fail-open: buginen koukku ei koskaan estä työtä
