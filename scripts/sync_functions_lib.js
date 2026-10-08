#!/usr/bin/env node
'use strict';
/* lib/ → functions/ -kopiot (functions/jaettu_lib.json). Ajo: node scripts/sync_functions_lib.js [--tarkista]
   Ilman lippua kirjoittaa kopiot; --tarkista ei kirjoita vaan poistuu 1:llä, jos jokin kopio poikkeaa lähteestä. */
const fs = require('fs');
const path = require('path');
const JUURI = path.join(__dirname, '..');
const M = JSON.parse(fs.readFileSync(path.join(JUURI, 'functions/jaettu_lib.json'), 'utf8'));
const tarkista = process.argv.includes('--tarkista');
let ero = 0;
for (const f of M.tiedostot) {
  const lahde = fs.readFileSync(path.join(JUURI, 'lib', f), 'utf8');
  const kohde = path.join(JUURI, 'functions', f);
  const nyt = fs.existsSync(kohde) ? fs.readFileSync(kohde, 'utf8') : null;
  if (nyt === lahde) continue;
  ero++;
  if (tarkista) console.error('POIKKEAA: functions/' + f + ' ≠ lib/' + f);
  else { fs.writeFileSync(kohde, lahde); console.log('päivitetty functions/' + f); }
}
if (tarkista && ero) { console.error('Aja: node scripts/sync_functions_lib.js'); process.exit(1); }
if (!ero) console.log('kopiot ajan tasalla (' + M.tiedostot.length + ')');
