#!/usr/bin/env node
/**
 * Versio-leima (cache-busting).
 * Kirjoittaa version.json:in + päivittää APP_VERSION:n jokaiseen pilotti-appiin samaan arvoon.
 * Aja ENNEN deployta kun haluat että käyttäjien selaimet hakevat tuoreen version
 * automaattisesti (versio-tarkistus-skripti appien <head>:ssä pakottaa reloadin):
 *
 *   npm run version:bump   →   git add -A && commit && push
 *
 * Appien APP_VERSION + version.json pidetään synkassa → ei manuaalista per-tiedosto-bumppia.
 */
'use strict';
const fs = require('fs');

const APPS = [
  'TalentMaster_Master_v16.html',
  'TalentMaster_Pelaaja_v7.html',
  'TalentMaster_Vanhempi_v2.html',
];

const v = String(Date.now());
fs.writeFileSync('version.json', JSON.stringify({ v }) + '\n');

let stamped = 0;
for (const f of APPS) {
  let s = fs.readFileSync(f, 'utf8');
  const re = /(var APP_VERSION=')[^']*(')/;
  if (!re.test(s)) { console.warn('⚠ ' + f + ': APP_VERSION-placeholderia ei löytynyt — versio-tarkistus puuttuu?'); continue; }
  s = s.replace(re, '$1' + v + '$2');
  fs.writeFileSync(f, s);
  stamped++;
}
console.log('✓ versio ' + v + ' → version.json + ' + stamped + '/' + APPS.length + ' appia leimattu');
