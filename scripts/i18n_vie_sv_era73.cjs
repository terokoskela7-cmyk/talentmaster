#!/usr/bin/env node
/* sv-erä 73 (K2: Näyttö uudella sivulla — "Näytä kaikki mittaukset", lataus- ja virheteksti; 19.10.) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_73_palautus.json. Kaista: Tero.
   lib.tm_naytto_lohkot (kn_*) → lib/tm_lib_i18n.js sv-kartan loppuun. Ajetaan VASTA kun Tero on palauttanut Geminin täyttämän tiedoston (.sv_palautukset/…_palautus.json → docs/i18n/).
   Code EI kirjoita ruotsia (§0): Geminin arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era73.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_73_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_73_gemini.json';
const OSIOT = { 'lib.tm_naytto_lohkot': 'lib/tm_naytto_lohkot.js' };

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
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 73 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era73.cjs) ── Näyttö uudella sivulla: "Näytä kaikki mittaukset", lataus- ja virheteksti\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const u = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const muuttui = uudet.length > 0;
  if (opts.kirjoita && muuttui) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && muuttui) };
}
module.exports = { vie };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
