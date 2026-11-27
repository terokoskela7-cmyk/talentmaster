#!/usr/bin/env node
/**
 * staging_konfiguraatio.js — projekti 06 PR 1 (PM 9.11.2026 P2 = A, P5): korvaa Firebase-konfiguraation CI-TYÖTILASSA staging-arvoilla ennen deployta.
 * Repo EI muutu: skripti ajetaan vain deploy-staging.yml:ssä uudessa checkoutissa. Tuotantokoodiin ei kosketa.
 *
 * Korvaa julkaistavassa joukossa (firebase.json hosting.ignore rajaa pois archive/, tests/, functions/ jne.):
 *   projekti-id (kaikki muodot: authDomain, storageBucket, hostit)  · apiKey · appId · messagingSenderId · App Check site key · Sentry-DSN → pois (guard: DSN alkaa '<')
 * Vartijat (P2): (1) projekti-id on täsmälleen `talentmaster-staging` — mikä tahansa muu, myös tuotanto, kaatuu; (2) syötteet ovat oikean muotoisia ja eroavat tuotannon
 * arvoista; (3) korvauksen JÄLKEEN yksikään julkaistava tiedosto ei saa sisältää tuotannon projekti-id:tä, avainta, appId:tä, senderId:tä, site keytä tai DSN:ää,
 * eikä odotettuja avaintiedostoja saa jäädä korvaamatta (hiljainen ohitus kaatuu). Tulostaa vain lukumääriä ja tiedostonimiä — ei arvoja.
 *
 * Syötteet (ympäristö tai --nimi=arvo): STAGING_PROJEKTI, STAGING_API_KEY, STAGING_APP_ID, STAGING_SENDER_ID, STAGING_APPCHECK_SITE_KEY. Ne ovat julkisia web-konfiguraation arvoja
 * (kuuluvat clientiin), eivät salaisuuksia. Käyttö: node scripts/staging_konfiguraatio.js [--juuri=.] [--kuiva]
 * HUOM: tämä on ainoa tiedosto, jossa tuotannon arvot esiintyvät kirjaimellisina (ne on tunnistettava, jotta ne voi korvata); projekti 06 -generaattorien ja mittausten
 * staattinen vartija ei koske tähän tiedostoon.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const STAGING_PROJEKTI = 'talentmaster-staging';
const PROD = {
  projekti: 'talentmaster-pilot',
  apiKey: 'AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo',
  senderId: '872561784446',
  appId: '1:872561784446:web:05c4c7996dfd46ddd14a2f',
  siteKey: '6Lf3tbstAAAAAE9fqxhiH9WltKEdT4NuJBXF0kjq',
  dsn: 'https://5ee45f46c735176690c07995ca09f321@o4511571051741184.ingest.de.sentry.io/4511571104890960',
};
const SENTRY_POIS = '<sentry-pois-stagingissa>';   // tm_sentry.js: DSN joka alkaa '<' → init ohitetaan (no-op)
const TEKSTI = /\.(html|js|json|css|webmanifest|txt|svg|xml)$/i;
const AVAINTIEDOSTOT = ['config.js', 'lib/tm_appcheck.js', 'tm_sentry.js'];   // joiden PITÄÄ muuttua
const VAHINTAAN_HTML = 15;                                                    // elävien sivujen määrä on 21; alle 15 korvattua = jokin meni pieleen

/** Syötteet → validoidut asetukset tai heittää. */
function asetukset(syote) {
  const s = syote || {};
  const virheet = [];
  const projekti = String(s.projekti || '').trim();
  if (projekti !== STAGING_PROJEKTI) virheet.push('STAGING_PROJEKTI pitää olla täsmälleen ' + STAGING_PROJEKTI + ' (annettu: ' + (projekti || 'tyhjä') + ')');
  const a = { projekti, apiKey: String(s.apiKey || '').trim(), appId: String(s.appId || '').trim(), senderId: String(s.senderId || '').trim(), siteKey: String(s.siteKey || '').trim() };
  if (!/^AIza[0-9A-Za-z_-]{35}$/.test(a.apiKey)) virheet.push('STAGING_API_KEY: väärä muoto');
  if (!/^\d{6,}$/.test(a.senderId)) virheet.push('STAGING_SENDER_ID: väärä muoto');
  if (!/^1:\d+:web:[0-9a-f]+$/.test(a.appId)) virheet.push('STAGING_APP_ID: väärä muoto');
  else if (a.appId.split(':')[1] !== a.senderId) virheet.push('STAGING_APP_ID ja STAGING_SENDER_ID eivät täsmää');
  if (!/^6L[0-9A-Za-z_-]{30,}$/.test(a.siteKey)) virheet.push('STAGING_APPCHECK_SITE_KEY: väärä muoto');
  [['apiKey', 'apiKey'], ['appId', 'appId'], ['senderId', 'senderId'], ['siteKey', 'siteKey']].forEach(([k, p]) => { if (a[k] && a[k] === PROD[p]) virheet.push(k + ' on sama kuin tuotannon arvo'); });
  if (virheet.length) { const e = new Error(virheet.join('; ')); e.virheet = virheet; throw e; }
  return a;
}

/** Korvauslista järjestyksessä: pitkät/sisäkkäiset ensin (appId sisältää senderId:n), projekti-id viimeisenä. */
function korvaukset(a) {
  return [[PROD.dsn, SENTRY_POIS], [PROD.appId, a.appId], [PROD.apiKey, a.apiKey], [PROD.siteKey, a.siteKey], [PROD.senderId, a.senderId], [PROD.projekti, a.projekti]];
}

/** → { teksti, osumat } */
function korvaaTeksti(teksti, lista) {
  let osumat = 0, t = teksti;
  lista.forEach(([mista, mihin]) => { const osia = t.split(mista); if (osia.length > 1) { osumat += osia.length - 1; t = osia.join(mihin); } });
  return { teksti: t, osumat };
}

/** Tuotannon arvot, joita tekstissä vielä on (nimet, ei arvoja). */
function jaljella(teksti) {
  return Object.keys(PROD).filter((k) => teksti.indexOf(PROD[k]) >= 0);
}

/** Firebase-glob → RegExp (konservatiivinen: ilman '/'-merkkiä olevat mallit vain juuressa → julkaistavaa joukkoa ei supisteta liikaa). */
function globRe(g) {
  let r = '', i = 0;
  while (i < g.length) {
    if (g.startsWith('**/', i)) { r += '(?:.*/)?'; i += 3; }
    else if (g.startsWith('/**', i) && i + 3 === g.length) { r += '(?:/.*)?'; i += 3; }
    else if (g.startsWith('**', i)) { r += '.*'; i += 2; }
    else if (g[i] === '*') { r += '[^/]*'; i++; }
    else { r += g[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&'); i++; }
  }
  return new RegExp('^' + r + '$');
}

/** Julkaistavat tekstitiedostot (suhteelliset polut) juuresta firebase.json:n hosting.ignore mukaan. */
function julkaistavat(juuri) {
  const cfg = JSON.parse(fs.readFileSync(path.join(juuri, 'firebase.json'), 'utf8'));
  const ign = (cfg.hosting && cfg.hosting.ignore || []).map(globRe);
  const ulos = [];
  const kavele = (rel) => {
    fs.readdirSync(path.join(juuri, rel), { withFileTypes: true }).forEach((d) => {
      const p = rel ? rel + '/' + d.name : d.name;
      if (d.name === 'node_modules' || d.name === '.git') return;
      if (ign.some((re) => re.test(p))) return;
      if (d.isDirectory()) kavele(p);
      else if (TEKSTI.test(d.name)) ulos.push(p);
    });
  };
  kavele('');
  return ulos.sort();
}

/** Koko ajo. → { muutetut: {polku: osumat}, virheet: [] } ; kuiva = ei kirjoita. */
function aja(juuri, a, kuiva) {
  const lista = korvaukset(a), muutetut = {}, virheet = [];
  const tiedostot = julkaistavat(juuri);
  tiedostot.forEach((p) => {
    const abs = path.join(juuri, p), alku = fs.readFileSync(abs, 'utf8');
    const r = korvaaTeksti(alku, lista);
    if (r.osumat) { muutetut[p] = r.osumat; if (!kuiva) fs.writeFileSync(abs, r.teksti); }
    const jaljelle = jaljella(kuiva ? r.teksti : fs.readFileSync(abs, 'utf8'));
    if (jaljelle.length) virheet.push(p + ': tuotannon arvoja jäljellä (' + jaljelle.join(', ') + ')');
  });
  AVAINTIEDOSTOT.forEach((p) => { if (!muutetut[p]) virheet.push(p + ': ei korvattu (odotettu muutos puuttuu)'); });
  const html = Object.keys(muutetut).filter((p) => /^[^/]+\.html$/.test(p)).length;
  if (html < VAHINTAAN_HTML) virheet.push('korvattuja juuri-HTML-sivuja ' + html + ' < ' + VAHINTAAN_HTML);
  return { muutetut, virheet, tiedostoja: tiedostot.length };
}

module.exports = { STAGING_PROJEKTI, PROD, SENTRY_POIS, AVAINTIEDOSTOT, asetukset, korvaukset, korvaaTeksti, jaljella, globRe, julkaistavat, aja };

if (require.main === module) {
  try {
    const argv = process.argv.slice(2);
    const arg = (n) => { const o = argv.find((x) => x.indexOf('--' + n + '=') === 0); return o ? o.slice(n.length + 3) : null; };
    const e = process.env;
    const a = asetukset({ projekti: arg('projekti') || e.STAGING_PROJEKTI, apiKey: arg('api-key') || e.STAGING_API_KEY, appId: arg('app-id') || e.STAGING_APP_ID,
      senderId: arg('sender-id') || e.STAGING_SENDER_ID, siteKey: arg('appcheck-site-key') || e.STAGING_APPCHECK_SITE_KEY });
    const juuri = path.resolve(arg('juuri') || '.'), kuiva = argv.indexOf('--kuiva') >= 0;
    const r = aja(juuri, a, kuiva);
    Object.keys(r.muutetut).forEach((p) => console.log((kuiva ? '[kuiva] ' : '') + p + ': ' + r.muutetut[p]));
    console.log('Julkaistavia tekstitiedostoja ' + r.tiedostoja + ', korvattu ' + Object.keys(r.muutetut).length + ' tiedostossa (' + Object.keys(r.muutetut).reduce((s, p) => s + r.muutetut[p], 0) + ' kohtaa).');
    if (r.virheet.length) { r.virheet.forEach((v) => console.error('VIRHE: ' + v)); process.exit(1); }
    console.log('OK: yhtään tuotannon arvoa ei jäänyt julkaistavaan joukkoon.');
  } catch (err) { console.error('VIRHE: ' + err.message); process.exit(1); }
}
