#!/usr/bin/env node
/* sv-erä 85 (K1e: kaaviopankin sanasto + Profiilin Testattu-rivi, 21.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_85_palautus.json (PM; 12 riviä). Kaista: Tero.
   yhteiset_kartta (7, avain = fi-teksti) → lib/tm_i18n_common.js sv-kartan loppuun; lib.tm_todistekortit (5, tc_*) → lib/tm_lib_i18n.js (ennen mv_pohjat-merkkiä).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Ajo: node scripts/i18n_vie_sv_era85.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q, lisaaKarttaan } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_85_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_85_gemini.json';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot, TC = require(path.join(juuri, 'lib/tm_todistekortit_fi.js'));
  let sCom = lue('lib/tm_i18n_common.js'), sLib = lue('lib/tm_lib_i18n.js');
  const oc = lataaSv(sCom, 'TM_I18N_COMMON'), ol = lataaSv(sLib, 'TM_LIB_I18N'), uC = [], uL = [];
  for (const o of ['yhteiset_kartta', 'lib.tm_todistekortit']) {
    if (!P[o] || !G[o]) { virheet.push('osio puuttuu: ' + o); continue; }
    if (JSON.stringify(Object.keys(P[o].rivit).sort()) !== JSON.stringify(Object.keys(G[o].rivit).sort())) virheet.push(o + ': avaimet ≠ lähetetty erä');
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  for (const [k, r] of Object.entries(P.yhteiset_kartta.rivit)) {
    if (r.fi !== k || r.fi !== G.yhteiset_kartta.rivit[k].fi) { virheet.push(k + ': fi ei vastaa lähetettyä erää'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof oc[k] === 'string') { if (oc[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    uC.push([k, r.sv]);
  }
  for (const [k, r] of Object.entries(P['lib.tm_todistekortit'].rivit)) {
    if (r.fi !== TC[k] || r.fi !== G['lib.tm_todistekortit'].rivit[k].fi) { virheet.push(k + ': fi ≠ koodi / lähetetty erä'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    uL.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uC.length) { const e = sCom.indexOf('\n  },', sCom.indexOf('\n  sv: {')); if (sCom[e - 1] !== ',') sCom = sCom.slice(0, e) + ',' + sCom.slice(e); }   // sv-lohkon viimeisellä rivillä ei ollut pilkkua
  if (uC.length) sCom = lisaaKarttaan(sCom, uC, '── sv-käännöserä 85 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era85.cjs): K1e kaaviopankin sanasto ──');
  if (uL.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 85 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era85.cjs) ── K1e: Testattu-rivi (tc_*)\n' + uL.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const vc = lataaSv(sCom, 'TM_I18N_COMMON'), vl = lataaSv(sLib, 'TM_LIB_I18N');
  for (const [a, sv] of uC) if (vc[a] !== sv) virheet.push('verifiointi common ' + a);
  for (const [a, sv] of uL) if (vl[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const muuttui = uC.length + uL.length > 0;
  if (opts.kirjoita && muuttui) { if (uC.length) fs.writeFileSync(path.join(juuri, 'lib/tm_i18n_common.js'), sCom); if (uL.length) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib); }
  return { virheet, lisatty: uC.length + uL.length, common: uC.length, lib: uL.length, ohitettu, kirjoitettu: !!(opts.kirjoita && muuttui) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
