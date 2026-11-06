/**
 * LINT-PORTTI: kohdistuu TARJOILTAVAAN joukkoon, ei nimipohjaiseen alijoukkoon.
 *
 * Aiempi skripti lintasi vain `TalentMaster_*.html` → `tm_dna_builder.html` (kuollut JS,
 * mojibake-korruptio), `TM_*.html`, `index.html`, `404.html` ja `talentmaster_player_demo_1.html`
 * eivät olleet KOSKAAN lintauksessa. Juuri sen aukon läpi tarjoiltavaan joukkoon pääsi sivu jonka
 * koko JS oli kuollut parse-virheeseen.
 *
 * Kohdejoukko johdetaan datasta (scripts/tarjoiltavat_appit.js) + kirjastot.
 */
'use strict';

const { spawnSync } = require('child_process');
const { join } = require('path');
const { existsSync, readdirSync } = require('fs');
const { tarjoiltavatAppit } = require('./tarjoiltavat_appit.js');

const JUURI = join(__dirname, '..');
const KIRJASTOT = ['lib/', 'docs/testit_indeksit.js', 'harjoitelogiikka_v4.js'];
// Kuorista siirretty koodi (rivikattojen purku). Mukana vasta kun kansio on olemassa (S1+).
/* Kuorista siirretyt osat (seura/): vain .js-tiedostot — pelkkä CSS-kansio saisi eslintin kaatumaan ("all files ignored"). */
const KUORIOSAT = ['seura'].filter((k) => existsSync(join(JUURI, k)))
  .flatMap((k) => readdirSync(join(JUURI, k)).filter((f) => f.endsWith('.js')).map((f) => k + '/' + f));

const kohteet = [...tarjoiltavatAppit(JUURI), ...KIRJASTOT, ...KUORIOSAT];

const r = spawnSync('npx', ['eslint', '--no-warn-ignored', ...kohteet], {
  cwd: JUURI,
  stdio: 'inherit',
});

process.exit(r.status === null ? 1 : r.status);
