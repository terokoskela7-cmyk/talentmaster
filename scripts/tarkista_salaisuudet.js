#!/usr/bin/env node
/* tarkista_salaisuudet.js — CI-esitarkistus ennen functions-deployta: jokainen koodin runWith({ secrets: [...] }) -salaisuus on OLEMASSA kohdeprojektissa ja sillä on versio.
 * MIKSI: firebase deploy validoi salaisuuksien versiot ennen kuin lataa mitään; puuttuva salaisuus kaataa koko deployn ja KAIKKI functions-muutokset jäävät jumiin
 * (10.11.2026: tuotannon deploy kaatui puuttuvaan VALVONTA_VASTAANOTTAJA-salaisuuteen). Tämä kaataa saman asian selkeästi ja ENNEN deployta: nimi + luontikomento.
 *   node scripts/tarkista_salaisuudet.js --projekti=<projektitunnus>
 * Tarkistus = sama kutsu kuin firebase-toolsilla (secrets versions describe latest), joten deploy-tilillä on siihen oikeus. Tulosteessa vain salaisuuden NIMI (ei arvoa). */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const JUURI = path.join(__dirname, '..');
const NIMI_RE = /^[A-Za-z_][A-Za-z0-9_]{0,254}$/;

const ilmanKommentteja = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
/** Koodin kaikki secrets: [...] -nimet (functions/*.js, ei testit eikä node_modules), aakkosjärjestyksessä, uniikit. */
function lueSalaisuudet(juuri) {
  const dir = path.join(juuri || JUURI, 'functions'), nimet = new Set();
  fs.readdirSync(dir).filter((f) => /\.js$/.test(f)).forEach((f) => {
    const koodi = ilmanKommentteja(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const m of koodi.matchAll(/\bsecrets\s*:\s*\[([^\]]*)\]/g)) for (const n of m[1].matchAll(/['"]([^'"]+)['"]/g)) if (NIMI_RE.test(n[1])) nimet.add(n[1]);
  });
  return Array.from(nimet).sort();
}
/** Luontiohje (tulostetaan virheessä): arvo luetaan piilotettuna, ei shell-historiaan. */
function luontiKomento(nimi, projekti) {
  return 'read -s "ARVO?Arvo ' + nimi + ': "; echo; printf \'%s\' "$ARVO" | gcloud secrets create ' + nimi + ' --project=' + projekti + ' --replication-policy=automatic --data-file=-; unset ARVO'
    + '\n      (jos salaisuus on jo olemassa mutta ilman versiota: ... | gcloud secrets versions add ' + nimi + ' --project=' + projekti + ' --data-file=-)';
}
/** ajaGcloud(args) → { status, stderr }. Oletus: oikea gcloud. */
function gcloud(args) { const r = spawnSync('gcloud', args, { encoding: 'utf8' }); return { status: r.status == null ? 1 : r.status, stderr: String(r.stderr || '') + (r.error ? String(r.error.message) : '') }; }

/** → { ok, puuttuu:[nimi], virheet:[{nimi, syy}], viesti }. */
function tarkista(nimet, projekti, ajaGcloud) {
  const aja = ajaGcloud || gcloud, puuttuu = [], virheet = [];
  nimet.forEach((nimi) => {
    const r = aja(['secrets', 'versions', 'describe', 'latest', '--secret=' + nimi, '--project=' + projekti, '--format=value(name)']);
    if (r.status === 0) return;
    if (/NOT_FOUND|not found|does not exist|has no versions/i.test(r.stderr)) puuttuu.push(nimi);
    else virheet.push({ nimi, syy: r.stderr.trim().split('\n').slice(-1)[0].slice(0, 160) });
  });
  const rivit = [];
  puuttuu.forEach((n) => rivit.push('PUUTTUU: salaisuus ' + n + ' (projekti ' + projekti + ') ei ole olemassa tai sillä ei ole versiota.\n    Luo se ennen deployta:\n      ' + luontiKomento(n, projekti)));
  virheet.forEach((v) => rivit.push('TARKISTUS EPÄONNISTUI: ' + v.nimi + ' (projekti ' + projekti + '): ' + v.syy + ' — tarkista deploy-tilin oikeus (secretmanager.versions.get).'));
  return { ok: !puuttuu.length && !virheet.length, puuttuu, virheet, viesti: rivit.join('\n') };
}

function main(argv, ajaGcloud, juuri) {
  const p = argv.find((a) => a.indexOf('--projekti=') === 0), projekti = p ? p.split('=')[1] : '';
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projekti)) { console.error('Käyttö: node scripts/tarkista_salaisuudet.js --projekti=<projektitunnus>'); return 2; }
  const nimet = lueSalaisuudet(juuri);
  if (!nimet.length) { console.error('Koodista ei löytynyt yhtään secrets-listaa — esitarkistus ei ole mielekäs (vartija).'); return 2; }
  const r = tarkista(nimet, projekti, ajaGcloud);
  if (!r.ok) { console.error('Functions-deploy KESKEYTETTY: salaisuuksia puuttuu projektista ' + projekti + ' (' + (r.puuttuu.length + r.virheet.length) + '/' + nimet.length + ').\n' + r.viesti); return 1; }
  console.log('OK: ' + nimet.length + ' salaisuutta olemassa projektissa ' + projekti + ' (' + nimet.join(', ') + ').');
  return 0;
}
module.exports = { lueSalaisuudet, tarkista, luontiKomento, main };
if (require.main === module) process.exit(main(process.argv.slice(2)));
