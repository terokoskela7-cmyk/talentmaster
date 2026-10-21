#!/usr/bin/env node
/* sv-erä 81 (K4a2: Profiilin selkokieli, 21.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_81_palautus.json (PM:n kirjoittama, Teron hyväksymä; 35 riviä). Kaista: Tero.
   lib.tm_todistekortit (tc_*) → lib/tm_lib_i18n.js sv-kartan loppuun. Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   PM:n katselmointi (#1110): rivillä voi olla `fi_pm` = lopullinen suomenkielinen teksti (tc_l_hh "H-H-testit", tc_t_d3 "Valmennettavuus"); koodin FI vastaa sitä, ei `fi`-kenttää.
   Ajo: node scripts/i18n_vie_sv_era81.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_81_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_81_gemini.json';
const OSIO = 'lib.tm_todistekortit', TIEDOSTO = 'lib/tm_todistekortit.js';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot[OSIO].rivit, G = JSON.parse(lue(LAHETYS)).osiot[OSIO].rivit, TX = require(path.join(juuri, TIEDOSTO));
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N');
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(G).sort())) virheet.push('avaimet ≠ lähetetty erä');
  for (const [k, r] of Object.entries(P)) {
    const fi = r.fi_pm || r.fi;
    if (fi !== TX.FI[k]) { virheet.push(k + ': fi ei vastaa koodin lähdettä'); continue; }
    if (!r.fi_pm && r.fi !== (G[k] || {}).fi) { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
    const syy = sopii(fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    uudet.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 81 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era81.cjs) ── K4a2: Profiilin selkokieli (tc_*)\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
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
