/* K4a2 (sv-erä 81, Profiilin selkokieli 21.10.2026): K4a:n erän 79 tc_*-avaimista osa POISTUI ja osan fi MUUTTUI. Erän 79 vientiskripti ja -testi ohittavat nämä avain-tarkasti
   (lähde: tests/fixtures/k4a2_fi_muutokset.json); niiden sv on poistettu libistä ja uudet/muuttuneet odottavat erää 81 (PM kirjoittaa sv:n, §0). */
'use strict';
const fs = require('fs');
const path = require('path');
let F = null;
function fx() { if (!F) F = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'fixtures', 'k4a2_fi_muutokset.json'), 'utf8')); return F; }
/** true jos erän 79 rivi on poistunut tai sen fi on muuttunut K4a2:ssa → ei viedä eikä verrata koodiin */
function era79Ohita(avain) { const f = fx(); return avain === 'tc_viimeisin_testi' /* K1e (erä 85): fi muuttui "Testattu …"; sv poistettu */ || Object.prototype.hasOwnProperty.call(f.poistettu, avain) || Object.prototype.hasOwnProperty.call(f.muuttunut, avain); }
/** erän 81 odottavat lib-avaimet (uudet + muuttuneet fi, joilla ei ole enää sv:tä) */
function era81Odottaa() { const f = fx(); return Object.keys(f.muuttunut).concat(f.uusi).sort(); }
module.exports = { era79Ohita, era81Odottaa };
