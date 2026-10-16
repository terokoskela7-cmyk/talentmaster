#!/usr/bin/env node
/* sv-erä 58 (peliäly-tasokorjaus 16.10.) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_58_palautus.json. Kaista: Tero.
   lib.rubriikit (10, avain = fi-teksti) + lib.tm_adar_tekstit (8, avain = polku adar_*) → lib/tm_lib_i18n.js sv-kartan loppuun.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen; fi täsmätään koodin lähteisiin (tm_adar_rubriikki / tm_adar_tekstit).
   Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era58.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_58_palautus.json';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, A = require(path.join(juuri, 'lib/tm_adar_rubriikki.js')), TX = require(path.join(juuri, 'lib/tm_adar_tekstit.js'));
  const koodinFi = new Set(['Seuraava taito']); for (const x of Object.values(A.TASOT)) { koodinFi.add(x.nimi); koodinFi.add(x.nyt); }
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N'), uudet = [];
  const kasittele = (osio, avain, r, fiOk) => {
    if (!fiOk) { virheet.push(osio + ' ' + avain + ': fi ei vastaa koodin lähdettä'); return; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(osio + ' ' + avain + ': ' + syy); return; }
    if (typeof ol[avain] === 'string') { if (ol[avain] === r.sv) ohitettu.push(avain); else virheet.push(osio + ' ' + avain + ': jo koodissa eri sv:llä'); return; }
    uudet.push([avain, r.sv]);
  };
  for (const [k, r] of Object.entries(P['lib.rubriikit'].rivit)) kasittele('lib.rubriikit', k, r, r.fi === k && koodinFi.has(k));
  for (const [k, r] of Object.entries(P['lib.tm_adar_tekstit'].rivit)) kasittele('lib.tm_adar_tekstit', k, r, TX.FI[k] === r.fi);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {   // sv-kartan loppuun, mv_pohjat-merkin edelle (kuten erä 54)
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 58 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era58.cjs) ── peliäly-tasokorjaus: ÄLY-tasot, Seuraava taito, pikakortin D/R-kuvaukset\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const u = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && uudet.length) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && uudet.length) };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
