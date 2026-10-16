#!/usr/bin/env node
/* sv-erä 55 (Sibbo 1.11. suostumuslomake vaihe 1, staattinen markup) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_55_palautus.json. Kaista: Tero.
   tm_lang (suostumus.rek_*, 59) → lib/tm_lang.js sv-lohkon suostumus-ryhmän loppuun; rivit pois tests/tm_lang_sv_odotuslista.cjs:stä.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era55.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sopii, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_55_palautus.json';

function lataaLang(src) {
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined, localStorage: undefined, navigator: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : null;', sb);
  return (sb.module.exports && sb.module.exports.TM_LANG) || sb.__m;
}
function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], langU = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot.tm_lang;
  let sLang = lue('lib/tm_lang.js'); const L = lataaLang(sLang), hae = (k, p) => p.split('.').reduce((o, x) => (o == null ? undefined : o[x]), L[k]);
  for (const [avain, r] of Object.entries(P.rivit)) {
    if (!/^suostumus\.rek_/.test(avain)) { virheet.push('tm_lang ' + avain + ': ei suostumus.rek_-avain'); continue; }
    if (hae('fi', avain) !== r.fi) { virheet.push('tm_lang ' + avain + ': fi ei vastaa tm_lang.fi:tä'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push('tm_lang ' + avain + ': ' + syy); continue; }
    const nyk = hae('sv', avain); if (typeof nyk === 'string' && nyk) { if (nyk === r.sv) ohitettu.push(avain); else virheet.push('tm_lang ' + avain + ': jo koodissa eri sv:llä'); continue; }
    langU.push([avain.replace(/^suostumus\./, ''), r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (langU.length) {   // tm_lang sv-lohkon suostumus-ryhmän loppuun
    const lines = sLang.split('\n'), idx = lines.map((l, i) => (/^    suostumus: \{/.test(l) ? i : -1)).filter((i) => i >= 0); if (idx.length !== 3) throw new Error('suostumus-lohkoja ei 3');
    let j = idx[1] + 1; while (!/^    \},?\s*(\/\/.*)?$/.test(lines[j])) j++;
    lines.splice(j, 0, '      // sv-käännöserä 55 (Gemini; vienti scripts/i18n_vie_sv_era55.cjs): suostumuslomakkeen staattinen markup (vaihe 1)', ...langU.map(([a, sv]) => '      ' + a + ': ' + q(sv) + ','));
    sLang = lines.join('\n');
  }
  const uL = lataaLang(sLang); for (const [a, sv] of langU) if (uL.sv.suostumus[a] !== sv) virheet.push('verifiointi tm_lang ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  let odotusPoistettu = 0, sOd = lue('tests/tm_lang_sv_odotuslista.cjs');
  for (const [avain] of Object.entries(P.rivit)) { const rivi = "  '" + avain + "',\n"; if (sOd.includes(rivi)) { sOd = sOd.replace(rivi, ''); odotusPoistettu++; } }
  sOd = sOd.replace(/  \/\/ Sibbo 1\.11\. vaihe 1: lomakkeen staattisen markupin avaimet \(erä 55; sv Geminiltä\)\n(?!  ')/, '');
  if (opts.kirjoita && langU.length) { fs.writeFileSync(path.join(juuri, 'lib/tm_lang.js'), sLang); }
  if (opts.kirjoita && odotusPoistettu) fs.writeFileSync(path.join(juuri, 'tests/tm_lang_sv_odotuslista.cjs'), sOd);
  return { virheet, lisatty: langU.length, ohitettu, odotusPoistettu, kirjoitettu: !!(opts.kirjoita && langU.length) };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
