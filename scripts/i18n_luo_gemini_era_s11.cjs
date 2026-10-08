#!/usr/bin/env node
/* S1.1 Käyttöaste — Gemini-erä (sv) uusille henkilökunnan teksteille: lib/tm_kayttoaste.js (t('…')-literaalit + mittarien otsikot) ja VP_v25:n "Sovelluksen käyttö" -kortti.
   Code EI kirjoita ruotsia (CLAUDE.md §0): sv-kentät tyhjiä kunnes Gemini täyttää; täytetyt rivit säilyvät uudelleenajossa. Avain = suomenkielinen teksti sellaisenaan
   (vpT → tmLibT → TM_LIB_I18N.sv; vienti: lisää 'tm_kayttoaste' scripts/i18n_vie_sv_era.cjs LIBIT-listaan kun sv on saapunut). Ajo: node scripts/i18n_luo_gemini_era_s11.cjs */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, 'docs/i18n/sv_kaannoserae_s11.json');
const lib = fs.readFileSync(path.join(ROOT, 'lib/tm_kayttoaste.js'), 'utf8'), vp = fs.readFileSync(path.join(ROOT, 'TalentMaster_VP_v25.html'), 'utf8');
const avaimet = new Set();
for (const m of lib.matchAll(/\bt\('((?:[^'\\]|\\.)*)'\)/g)) avaimet.add(m[1].replace(/\\'/g, "'"));
for (const m of lib.matchAll(/\blbl: '([^']+)'/g)) avaimet.add(m[1]);
for (const m of lib.matchAll(/opts\.tyhjaTeksti \|\| '([^']+)'/g)) avaimet.add(m[1]);
const a = vp.indexOf('async function vpKayttoasteLataa'), b = vp.indexOf('window.vpKayttoasteLataa', a);
for (const m of vp.slice(a, b).matchAll(/vpT\('((?:[^'\\]|\\.)*)'\)/g)) avaimet.add(m[1].replace(/\\'/g, "'"));
let vanhat = {}; try { vanhat = JSON.parse(fs.readFileSync(OUT, 'utf8')).rivit || {}; } catch (e) { /* uusi */ }
const rivit = {}; [...avaimet].sort().forEach((fi) => { rivit[fi] = { fi, sv: (vanhat[fi] && typeof vanhat[fi].sv === 'string') ? vanhat[fi].sv : '' }; });
const ulos = { _tiedosto: 'sv_kaannoserae_s11.json', _tila: 'KESKEN — S1.1 Käyttöaste: henkilökunnan pinnan uudet tekstit (Admin on vain suomeksi; VP Koti "Sovelluksen käyttö"). Takaraja Gemini-erille 20.10.2026.',
  ohje_geminille: ['Täytä jokaiseen tyhjään "sv"-kenttään ruotsinkielinen käännös. Älä muuta avaimia tai "fi"-arvoja. Palauta koko JSON samassa järjestyksessä.', 'Henkilökunnan (VP, valmentajat) asiallinen kieli. Termit: Seura = Förening, Joukkue = Lag, Pelaaja = Spelare, Huoltaja = Vårdnadshavare, Kirjautunut = Inloggad, Aktiivinen = Aktiv, Suostumus = Samtycke. Säilytä merkit ja ' + "'%' / '/' sellaisenaan."],
  rivit };
fs.writeFileSync(OUT, JSON.stringify(ulos, null, 1) + '\n');
console.log('kirjoitettu ' + path.relative(ROOT, OUT) + ': ' + Object.keys(rivit).length + ' riviä');
