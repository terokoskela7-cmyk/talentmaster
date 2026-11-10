#!/usr/bin/env node
/* tarkista_salaisuudet.js — CI-esitarkistus ennen functions-deployta. Jokaiselle koodin runWith({ secrets: [...] }) -salaisuudelle kohdeprojektissa:
 *   (1) salaisuus on OLEMASSA ja sillä on versio                      (gcloud secrets versions describe latest)
 *   (2) ajotilillä <projekti>@appspot.gserviceaccount.com on roles/secretmanager.secretAccessor TÄHÄN salaisuuteen   (gcloud secrets get-iam-policy)
 * MIKSI: firebase deploy validoi salaisuudet ennen latausta ja yrittää itse asettaa puuttuvan oikeuden; CI-tunnuksella ei ole (eikä saa olla) secretmanager.setIamPolicy → 403.
 * Kumpikin puute kaataa koko deployn ja KAIKKI functions-muutokset jäävät jumiin (10.11.2026 kahdesti: puuttuva salaisuus, sitten puuttuva secretAccessor).
 * Tämä kaataa saman ENNEN Firebasea ja antaa valmiit gcloud-komennot (luonti + oikeus). CI:lle EI anneta lisäoikeuksia: komennot ajaa Tero. Vain lukukutsut (versions describe, get-iam-policy).
 *   node scripts/tarkista_salaisuudet.js --projekti=<projektitunnus>
 * Tulosteessa vain salaisuuden NIMI ja ajotilin tunnus (ei arvoja). */
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
const AJOTILI = (projekti) => projekti + '@appspot.gserviceaccount.com';   // Cloud Functions 1st gen -ajotili (ei runWith serviceAccount -ylikirjoituksia)
const ROOLI = 'roles/secretmanager.secretAccessor';
/** Luontiohje: arvo luetaan piilotettuna, ei shell-historiaan. */
function luontiKomento(nimi, projekti) {
  return 'read -s "ARVO?Arvo ' + nimi + ': "; echo; printf \'%s\' "$ARVO" | gcloud secrets create ' + nimi + ' --project=' + projekti + ' --replication-policy=automatic --data-file=-; unset ARVO'
    + '\n      (jos salaisuus on jo olemassa mutta ilman versiota: ... | gcloud secrets versions add ' + nimi + ' --project=' + projekti + ' --data-file=-)';
}
/** Oikeusohje: SAMA aina luonnin kanssa. */
function oikeusKomento(nimi, projekti) {
  return 'gcloud secrets add-iam-policy-binding ' + nimi + ' --project=' + projekti + ' --member=serviceAccount:' + AJOTILI(projekti) + ' --role=' + ROOLI;
}
/** ajaGcloud(args) → { status, stdout, stderr }. Oletus: oikea gcloud. */
function gcloud(args) { const r = spawnSync('gcloud', args, { encoding: 'utf8' }); return { status: r.status == null ? 1 : r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') + (r.error ? String(r.error.message) : '') }; }
const ONPUUTE = /NOT_FOUND|not found|does not exist|has no versions/i;
const viimeinen = (t) => String(t || '').trim().split('\n').slice(-1)[0].slice(0, 160);

/** get-iam-policy (JSON) → onko ajotilillä secretAccessor tähän salaisuuteen. */
function onAccessor(stdout, projekti) {
  let p; try { p = JSON.parse(stdout || '{}'); } catch (e) { return null; }
  return (p.bindings || []).some((b) => b.role === ROOLI && (b.members || []).indexOf('serviceAccount:' + AJOTILI(projekti)) >= 0);
}
/** → { ok, puuttuu:[nimi], ilmanOikeutta:[nimi], virheet:[{nimi, syy}], viesti }. Kaikki puutteet kerralla (ei pysähdy ensimmäiseen). */
function tarkista(nimet, projekti, ajaGcloud) {
  const aja = ajaGcloud || gcloud, puuttuu = [], ilmanOikeutta = [], virheet = [];
  nimet.forEach((nimi) => {
    const v = aja(['secrets', 'versions', 'describe', 'latest', '--secret=' + nimi, '--project=' + projekti, '--format=value(name)']);
    if (v.status !== 0) { if (ONPUUTE.test(v.stderr)) puuttuu.push(nimi); else virheet.push({ nimi, syy: viimeinen(v.stderr) }); return; }
    const i = aja(['secrets', 'get-iam-policy', nimi, '--project=' + projekti, '--format=json']);
    if (i.status !== 0) { virheet.push({ nimi, syy: 'get-iam-policy: ' + viimeinen(i.stderr) }); return; }
    const o = onAccessor(i.stdout, projekti);
    if (o === null) virheet.push({ nimi, syy: 'get-iam-policy: vastausta ei voitu lukea' }); else if (!o) ilmanOikeutta.push(nimi);
  });
  const rivit = [];
  puuttuu.forEach((n) => rivit.push('PUUTTUU: salaisuus ' + n + ' (projekti ' + projekti + ') ei ole olemassa tai sillä ei ole versiota. Luo se JA anna ajotilille oikeus (aina yhdessä):\n'
    + '      1) ' + luontiKomento(n, projekti) + '\n      2) ' + oikeusKomento(n, projekti)));
  ilmanOikeutta.forEach((n) => rivit.push('EI OIKEUTTA: ajotilillä ' + AJOTILI(projekti) + ' ei ole ' + ROOLI + ' salaisuuteen ' + n + ' (CI ei saa asettaa sitä itse: setIamPolicy 403). Anna oikeus (Tero):\n      ' + oikeusKomento(n, projekti)));
  virheet.forEach((v) => rivit.push('TARKISTUS EPÄONNISTUI: ' + v.nimi + ' (projekti ' + projekti + '): ' + v.syy + ' — tarkista deploy-tilin lukuoikeus (secretmanager.versions.get / secrets.getIamPolicy; esim. roles/secretmanager.viewer).'));
  return { ok: !puuttuu.length && !ilmanOikeutta.length && !virheet.length, puuttuu, ilmanOikeutta, virheet, viesti: rivit.join('\n') };
}

function main(argv, ajaGcloud, juuri) {
  const p = argv.find((a) => a.indexOf('--projekti=') === 0), projekti = p ? p.split('=')[1] : '';
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projekti)) { console.error('Käyttö: node scripts/tarkista_salaisuudet.js --projekti=<projektitunnus>'); return 2; }
  const nimet = lueSalaisuudet(juuri);
  if (!nimet.length) { console.error('Koodista ei löytynyt yhtään secrets-listaa — esitarkistus ei ole mielekäs (vartija).'); return 2; }
  const r = tarkista(nimet, projekti, ajaGcloud);
  if (!r.ok) { console.error('Functions-deploy KESKEYTETTY: salaisuuksissa puutteita projektissa ' + projekti + ' (' + (r.puuttuu.length + r.ilmanOikeutta.length + r.virheet.length) + '/' + nimet.length + ').\n' + r.viesti); return 1; }
  console.log('OK: ' + nimet.length + ' salaisuutta olemassa projektissa ' + projekti + ', ajotilillä secretAccessor (' + nimet.join(', ') + ').');
  return 0;
}
module.exports = { lueSalaisuudet, tarkista, luontiKomento, oikeusKomento, onAccessor, AJOTILI, main };
if (require.main === module) process.exit(main(process.argv.slice(2)));
