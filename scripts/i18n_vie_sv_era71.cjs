#!/usr/bin/env node
/* sv-erä 71 (Sulje jakso -ikkunan valmentajan lause + Historian "sisäinen"-merkki; 19.10.) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_71_palautus.json. Kaista: Tero.
   lib.tm_kevyt_katselmus (kk_valm_lause, kk_lause_ohje_ei_lukuja) + lib.tm_historia_lause (hl_sisainen) → lib/tm_lib_i18n.js sv-kartan loppuun.
   LISÄKSI Teron oma teksti (19.10.): kk_vp_lause sv "Tränarchefens hälsning" → "Tränarchefens mening" (MUUTOS olemassa olevaan riviin; Tero kirjoitti, ei Gemini).
   Code EI kirjoita ruotsia (§0): Geminin arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era71.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_71_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_71_gemini.json';
const OSIOT = { 'lib.tm_kevyt_katselmus': 'lib/tm_kevyt_katselmus.js', 'lib.tm_historia_lause': 'lib/tm_historia_lause.js' };
const TERO = { avain: 'kk_vp_lause', fi: 'VP:n lause', vanha: 'Tränarchefens hälsning', uusi: 'Tränarchefens mening' };   // Teron oma teksti (19.10.2026)

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N');
  for (const [OSIO, tiedosto] of Object.entries(OSIOT)) {
    if (!P[OSIO]) { virheet.push('osio puuttuu palautuksesta: ' + OSIO); continue; }
    if (JSON.stringify(Object.keys(P[OSIO].rivit).sort()) !== JSON.stringify(Object.keys(G[OSIO].rivit).sort())) virheet.push(OSIO + ': avaimet ≠ lähetetty erä');
    const TX = require(path.join(juuri, tiedosto));
    for (const [k, r] of Object.entries(P[OSIO].rivit)) {
      if (r.fi !== TX.FI[k] || r.fi !== (G[OSIO].rivit[k] || {}).fi) { virheet.push(k + ': fi ei vastaa lähetettyä erää/koodin lähdettä'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
      if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
      uudet.push([k, r.sv]);
    }
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 71 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era71.cjs) ── Sulje jakso: valmentajan lause + Historian "sisäinen"-merkki\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  // Teron oma teksti: kk_vp_lause
  let teroMuutettu = 0; const rivi = '      ' + q(TERO.avain) + ': ' + q(TERO.vanha) + ',', uusiRivi = '      ' + q(TERO.avain) + ': ' + q(TERO.uusi) + ',';
  if (lataaSv(sLib, 'TM_LIB_I18N')[TERO.avain] === TERO.uusi) ohitettu.push(TERO.avain);
  else if (sLib.split(rivi).length === 2) { sLib = sLib.replace(rivi, uusiRivi); teroMuutettu = 1; } else virheet.push(TERO.avain + ': vanhaa riviä ei löydy tasan kerran');
  const u = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (u[TERO.avain] !== TERO.uusi) virheet.push('verifiointi ' + TERO.avain);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const muuttui = uudet.length + teroMuutettu > 0;
  if (opts.kirjoita && muuttui) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, teroMuutettu, ohitettu, kirjoitettu: !!(opts.kirjoita && muuttui) };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
