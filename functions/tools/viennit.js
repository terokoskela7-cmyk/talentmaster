#!/usr/bin/env node
'use strict';
/**
 * Rivikattojen purku F0 — functions/index.js:n vientien TILANNEVEDOS (nimet + asetukset), jotta F1/F2-siirrot (käsittelijä moduuliin,
 * index.js:ään ohut exports.X = functions.region(...).runWith(...).https.onCall(moduuli.X)) eivät voi muuttaa julkaistavaa pintaa huomaamatta.
 *
 * Jokaisesta viennistä talletetaan: region, platform, secrets, muisti/aikaraja/instanssit, trigger (callable | https | schedule + aikavyöhyke | event + resurssi)
 * sekä https-funktioiden App Check -asetukset (enforceAppCheck / consumeAppCheckToken). Viimeiset EIVÄT näy firebase-functions v1:n __endpoint-metadatassa,
 * joten ne otetaan kiinni käärimällä providerin _onCallWithOptions / _onRequestWithOptions ennen index.js:n latausta.
 *
 *   node tools/viennit.js              → vertaa fixtureen (test/fixtures/viennit.json); exit 1 jos ero
 *   node tools/viennit.js --kirjoita   → kirjoittaa fixturen uudelleen (vain kun muutos on tarkoituksellinen; perustele PR:ssä)
 *
 * Ei verkkoa, ei GCP-projektia: firebase-admin stubataan (index.js kutsuu admin.firestore()/auth()/storage() moduulitasolla).
 */
const fs = require('fs');
const path = require('path');

const JUURI = path.join(__dirname, '..');
const FIXTURE = path.join(JUURI, 'test', 'fixtures', 'viennit.json');
const APPCHECK_AVAIMET = ['enforceAppCheck', 'consumeAppCheckToken'];

function stubbaaAdmin() {
  const admin = require('firebase-admin');
  const q = {};
  ['where', 'orderBy', 'limit', 'select', 'startAfter'].forEach((m) => { q[m] = () => q; });
  q.get = async () => ({ empty: true, docs: [], forEach() {} });
  q.doc = () => ({ get: async () => ({ exists: false }), collection: () => q });
  const firestore = () => ({ collection: () => q, collectionGroup: () => q, doc: () => q.doc(), batch: () => ({}) });
  firestore.FieldValue = {}; firestore.Timestamp = {};
  for (const [k, v] of [['firestore', firestore], ['auth', () => ({})], ['storage', () => ({ bucket: () => ({}) })]]) Object.defineProperty(admin, k, { configurable: true, value: v });
  admin.initializeApp = () => ({});
}

/* Kääritään https-providerin luontifunktiot: builder kutsuu niitä moduuliobjektin kautta (https._onCallWithOptions), joten sama moduuli-instanssi riittää. */
function kaariHttps() {
  const httpsPolku = path.join(path.dirname(require.resolve('firebase-functions/v1')), 'providers', 'https.js');
  const https = require(httpsPolku);
  for (const nimi of ['_onCallWithOptions', '_onRequestWithOptions']) {
    const alkup = https[nimi];
    https[nimi] = function (handler, options) {
      const f = alkup.apply(this, arguments);
      const o = options || {}, ac = {};
      APPCHECK_AVAIMET.forEach((k) => { ac[k] = o[k] === true; });
      Object.defineProperty(f, '__tmAppCheck', { value: ac, enumerable: false });
      return f;
    };
  }
}

/* Normalisoi yhden viennin kuvauksen: null-arvot ja tyhjät objektit pois, avaimet aakkosjärjestyksessä. */
function siisti(x) {
  if (Array.isArray(x)) return x.map(siisti);
  if (x && typeof x === 'object') {
    const ulos = {};
    for (const k of Object.keys(x).sort()) {
      const v = siisti(x[k]);
      if (v === null || v === undefined) continue;
      if (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length && k !== 'callableTrigger' && k !== 'httpsTrigger') continue;
      ulos[k] = v;
    }
    return ulos;
  }
  return x;
}
function kuvaus(f) {
  const e = siisti(f.__endpoint || {});
  if (f.__tmAppCheck) e.appCheck = f.__tmAppCheck;
  return e;
}

/** Lataa index.js:n stubatulla adminilla ja palauttaa { vientiNimi: kuvaus } aakkosjärjestyksessä. Kutsuttava kerran per prosessi. */
function lataaViennit() {
  if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = 'talentmaster-pilot';   // event-triggereiden resurssi lasketaan projektista (ei verkkoa)
  stubbaaAdmin();
  kaariHttps();
  const lokit = console.log; console.log = () => {};   // index.js:n latauslokit pois tulosteesta
  let viennit;
  try { viennit = require(path.join(JUURI, 'index.js')); } finally { console.log = lokit; }
  const ulos = {};
  for (const k of Object.keys(viennit).sort()) ulos[k] = kuvaus(viennit[k]);
  return ulos;
}

/** Puhdas vertailu (testattu): palauttaa listan eroista ihmisluettavina riveinä. */
function vertaa(vanha, uusi) {
  const erot = [];
  for (const k of Object.keys(vanha)) if (!(k in uusi)) erot.push('POISTUI: ' + k);
  for (const k of Object.keys(uusi)) if (!(k in vanha)) erot.push('UUSI: ' + k);
  for (const k of Object.keys(uusi)) {
    if (!(k in vanha)) continue;
    const a = JSON.stringify(vanha[k]), b = JSON.stringify(uusi[k]);
    if (a !== b) erot.push('MUUTTUI: ' + k + '\n    ennen: ' + a + '\n    nyt:   ' + b);
  }
  return erot;
}

function lueFixture() { return JSON.parse(fs.readFileSync(FIXTURE, 'utf8')); }

if (require.main === module) {
  const nyt = lataaViennit();
  if (process.argv.includes('--kirjoita')) {
    fs.mkdirSync(path.dirname(FIXTURE), { recursive: true });
    fs.writeFileSync(FIXTURE, JSON.stringify(nyt, null, 2) + '\n');
    console.log('Kirjoitettu ' + path.relative(JUURI, FIXTURE) + ': ' + Object.keys(nyt).length + ' vientiä.');
  } else {
    const erot = vertaa(lueFixture(), nyt);
    if (erot.length) { console.error('Viennit poikkeavat tilannevedoksesta (' + erot.length + '):\n' + erot.join('\n')); process.exit(1); }
    console.log('OK: ' + Object.keys(nyt).length + ' vientiä, nimet ja asetukset = tilannevedos.');
  }
}

module.exports = { lataaViennit, vertaa, siisti, lueFixture, FIXTURE, APPCHECK_AVAIMET };
