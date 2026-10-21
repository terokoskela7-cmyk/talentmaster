/* K1d (sv-erä 80, vienti 21.10.2026): erä 80 KORVASI aiempien erien sv-rivejä (sanasto: katselmus/arviointi/IDP → jakson yhteenveto/kehityssuunnitelma, ADAR R = Reagointi).
   Vanhojen erien vientiskriptit ja -testit tunnistavat korvatun rivin tällä: koodin sv = erän 80 palautuksen sv kyseiselle avaimelle → ei "eri sv:llä" -virhettä. */
'use strict';
const fs = require('fs');
const path = require('path');
let KARTTA = null;
function kartta() {
  if (KARTTA) return KARTTA; KARTTA = new Map();
  let P; try { P = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs', 'i18n', 'sv_kaannoserae_80_palautus.json'), 'utf8')).osiot; } catch (e) { return KARTTA; }
  for (const o of Object.values(P)) for (const [k, r] of Object.entries(o.rivit)) { if (!KARTTA.has(k)) KARTTA.set(k, new Set()); KARTTA.get(k).add(r.sv); }
  return KARTTA;
}
/** true jos avaimella on erässä 80 uusi sv ja koodissa on se (vanha erä on korvattu) */
function korvattu(avain, koodinSv) { const s = kartta().get(avain); return !!(s && s.has(koodinSv)); }
module.exports = { korvattu };
