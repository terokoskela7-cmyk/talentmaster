/* Erä 105 (Päivän harjoite PR E, Polku-rivi): 5 lib-avainta odottaa PM:n sv-palautusta (Code ei kirjoita ruotsia, §0). Avaimet luetaan erätiedostosta: sv tyhjä = ei vielä viety.
   Kun palautus on viety (scripts/i18n_vie_sv_era105.cjs), poista tämä tiedosto ja sen käyttö testeistä (i18n_sv_era_lib, i18n_era64_vienti, i18n_era76_vienti, sv_kattavuus). */
const fs = require('fs'), path = require('path');
const E = JSON.parse(fs.readFileSync(path.join(__dirname, '../../docs/i18n/sv_kaannoserae_105_gemini.json'), 'utf8'));
const AVAIMET = Object.keys(E.osiot['lib.tm_kt_polku'].rivit).filter((k) => !String(E.osiot['lib.tm_kt_polku'].rivit[k].sv || '').trim());
module.exports = { AVAIMET, era105Odottaa: (k) => AVAIMET.indexOf(k) >= 0 };
