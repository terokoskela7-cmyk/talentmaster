#!/usr/bin/env node
// PreToolUse-koukku (Bash) — estää `npm run version:bump` / bump_version.js -ajon feature-haarassa.
// Juurisyy #53: version:bump leimaa samat 5 tiedostoa joka PR:ssä → jatkuvat merge-konfliktit.
// Konventio (CLAUDE.md §33): versio bumpataan AUTOMAATTISESTI mainissa (bump-version.yml), ei käsin.
// Fail-open: sisäinen virhe → exit 0.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PROJ = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function readStdin() {
  try { return readFileSync(0, 'utf8'); } catch { return ''; }
}

function branch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: PROJ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { return ''; }
}

function main() {
  const raw = readStdin();
  let evt;
  try { evt = JSON.parse(raw); } catch { process.exit(0); }
  const cmd = evt?.tool_input?.command || '';

  // Vain varsinainen bumppaus-ajo KOMENTOPAIKASSA (rivin alku tai shell-erottimen jälkeen) —
  // ei jos pattern esiintyy vain lainausmerkeissä (echo/grep 'version:bump'). Erotin: ^ ; & | uusirivi.
  const bumppaa = /(^|[;&|\n])\s*(npm\s+run\s+version:bump|node\s+scripts\/bump_version\.js)\b/.test(cmd);
  if (!bumppaa) process.exit(0);

  const b = branch();
  if (b === 'main' || b === 'master' || b === '') process.exit(0); // mainissa sallittu (tai ei git-kontekstia)

  process.stderr.write(
    `⛔ version:bump estetty feature-haarassa (${b}).\n\n` +
    `Juurisyy #53: bump leimaa version.json + Admin/Master/Pelaaja/Vanhempi joka PR:ssä → merge-konfliktit.\n` +
    `Konventio (CLAUDE.md §33): versio bumpataan AUTOMAATTISESTI mainissa (bump-version.yml) mergen jälkeen.\n` +
    `Cache: Pages ~10 min + ?v=N / ?cb -cache-bust riittää useimpiin muutoksiin. Älä bumppaa käsin.\n`
  );
  process.exit(2);
}

try { main(); } catch { process.exit(0); }
