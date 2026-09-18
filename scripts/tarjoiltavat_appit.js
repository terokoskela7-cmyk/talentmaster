/**
 * TARJOILTAVAN JOUKON YKSI TOTUUSLÄHDE.
 *
 * Tarjoiltava appi = versionhallittu juuren *.html − firebase.json hosting.ignore.
 *
 * Kaksi tarkkaa valintaa:
 *  1. `git ls-files`, EI `readdirSync` — työhakemistossa voi lojua versionhallitsemattomia
 *     scratch-tiedostoja, jotka eivät koskaan päädy deployiin. Ne vuotivat aiemmin sekä
 *     lint-kohdejoukkoon että live-probeen ja tuottivat harhaisia tuloksia.
 *  2. hosting.ignore on se sama lista jonka Firebase Hosting lukee → lint kohdistuu täsmälleen
 *     siihen mitä käyttäjä voi avata, ei nimipohjaiseen `TalentMaster_*`-alijoukkoon.
 *
 * Käyttäjät: scripts/lint.js · tests/hosting_firebase_sdk_kytkenta.test.js · live-probe.
 */
'use strict';

const { execFileSync } = require('child_process');
const { readFileSync } = require('fs');
const { join } = require('path');

const JUURI = join(__dirname, '..');

/** Minimaalinen glob → regex niille kuvioille joita hosting.ignore käyttää (**, *, ?). */
function teeKuvio(glob) {
  return new RegExp('^' + glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '(?:.*/)?')
    .replace(/\*\*/g, '.*')
    .replace(/(?<!\.)\*/g, '[^/]*')
    .replace(/\?/g, '[^/]') + '$');
}

function ignoroitu(polku, ignore) {
  return ignore.some((g) => teeKuvio(g).test(polku) || (g.endsWith('/**') && polku.startsWith(g.slice(0, -2))));
}

/** @returns {string[]} tarjoiltavat juuren HTML-tiedostot, aakkosjärjestyksessä */
function tarjoiltavatAppit(juuri = JUURI) {
  const ignore = JSON.parse(readFileSync(join(juuri, 'firebase.json'), 'utf8')).hosting.ignore;
  return execFileSync('git', ['ls-files', '*.html'], { cwd: juuri, encoding: 'utf8' })
    .split('\n')
    .map((s) => s.trim())
    .filter((p) => p && !p.includes('/') && !ignoroitu(p, ignore))
    .sort();
}

module.exports = { tarjoiltavatAppit };

if (require.main === module) {
  process.stdout.write(tarjoiltavatAppit().join('\n') + '\n');
}
