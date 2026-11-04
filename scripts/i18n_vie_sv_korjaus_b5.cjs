#!/usr/bin/env node
/* sv-korjauserä B5 (PM 4.11.2026): ADAR "Toteutus" = "Utförande" kaikkialla. "Aktion" (Gemini-erä 2) korvataan kolmessa avaimessa. VIENTI koodiin.
   Lähde: docs/i18n/sv_korjaus_b5_utforande.json. Kaista: Tero.
   Code EI kirjoita ruotsia (§0): sv kopioidaan merkki merkiltä erästä. Ennen korvausta tarkistetaan, että fi = koodi ja nykyinen sv = erän sv_vanha.
   Korvattava literaali on oltava tiedostossa täsmälleen kerran. Vienti verifioidaan lataamalla kartat uudelleen. Idempotentti: jo korvattu → ohitetaan.
   Virhe → mitään ei kirjoiteta. Ajo: node scripts/i18n_vie_sv_korjaus_b5.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const KORJAUS = 'docs/i18n/sv_korjaus_b5_utforande.json';
const F_LANG = 'lib/tm_lang.js', F_LIB = 'lib/tm_lib_i18n.js';

function lataaLang(src) {
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined, localStorage: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : null;', sb);
  const m = (sb.module.exports && sb.module.exports.TM_LANG) || sb.__m; if (!m || !m.sv || !m.fi) throw new Error('tm_lang.js:n lataus epäonnistui'); return m;
}
function lataaLibFi(src) {   // tm_lib_i18n.js: fi-arvoa ei ole kartassa → fi täsmätään libien FI-tekstiin muualla (ks. testi); tässä vain sv
  return lataaSv(src, 'TM_LIB_I18N');
}
/* Korvaa yksi literaali tasan kerran: rivi muotoa `<sisennys><avain>: '<vanha>',` (tm_lang) tai `<sisennys>'<avain>': '<vanha>',` (lib). */
function korvaaKerran(src, vanhaRivi, uusiRivi, virheet, nimi) {
  const n = src.split(vanhaRivi).length - 1;
  if (n !== 1) { virheet.push(nimi + ': korvattava rivi löytyi ' + n + ' kertaa (pitää olla 1)'); return src; }
  return src.replace(vanhaRivi, () => uusiRivi);
}

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], tehty = [];
  const E = JSON.parse(lue(KORJAUS)).osiot || {};
  let sLang = lue(F_LANG), sLib = lue(F_LIB);
  const L = lataaLang(sLang), LIB = lataaLibFi(sLib);
  for (const o of Object.keys(E)) if (o !== 'tm_lang' && o !== 'lib') virheet.push('tuntematon osio: ' + o);
  for (const [k, r] of Object.entries((E.tm_lang || {}).rivit || {})) {
    const [ry, a] = k.split('.'), fi = L.fi[ry] && L.fi[ry][a], nyt = L.sv[ry] && L.sv[ry][a];
    if (r.fi !== fi) { virheet.push('tm_lang / ' + k + ': fi ≠ koodi'); continue; }
    if (nyt === r.sv) { ohitettu.push(k); continue; }
    if (nyt !== r.sv_vanha) { virheet.push('tm_lang / ' + k + ': koodin sv ≠ sv_vanha'); continue; }
    const i = sLang.indexOf('\n  sv: {'), e = sLang.indexOf('\n  en: {', i), vanhaRivi = '      ' + a + ': ' + q(r.sv_vanha) + ',';
    const osuma = sLang.indexOf(vanhaRivi, i);
    if (i < 0 || osuma < 0 || osuma > e) { virheet.push('tm_lang / ' + k + ': riviä ei löydy sv-osiosta'); continue; }
    sLang = sLang.slice(0, i) + korvaaKerran(sLang.slice(i, e), vanhaRivi, '      ' + a + ': ' + q(r.sv) + ',', virheet, 'tm_lang / ' + k) + sLang.slice(e);
    tehty.push(['tm_lang', k, r.sv]);
  }
  for (const [k, r] of Object.entries((E.lib || {}).rivit || {})) {
    const nyt = LIB[k];
    if (nyt === r.sv) { ohitettu.push(k); continue; }
    if (nyt !== r.sv_vanha) { virheet.push('lib / ' + k + ': koodin sv ≠ sv_vanha'); continue; }
    sLib = korvaaKerran(sLib, '      ' + q(k) + ': ' + q(r.sv_vanha) + ',', '      ' + q(k) + ': ' + q(r.sv) + ',', virheet, 'lib / ' + k);
    tehty.push(['lib', k, r.sv]);
  }
  if (virheet.length) return { virheet, korvattu: 0, ohitettu, kirjoitettu: false };
  const vL = lataaLang(sLang), vLib = lataaSv(sLib, 'TM_LIB_I18N');
  for (const [o, k, sv] of tehty) {
    const arvo = o === 'tm_lang' ? (vL.sv[k.split('.')[0]] || {})[k.split('.')[1]] : vLib[k];
    if (arvo !== sv) virheet.push('verifiointi ' + o + ' ' + k);
  }
  if (virheet.length) return { virheet, korvattu: 0, ohitettu, kirjoitettu: false };
  const nLang = tehty.filter((x) => x[0] === 'tm_lang').length, nLib = tehty.length - nLang;
  if (opts.kirjoita && tehty.length) { if (nLang) fs.writeFileSync(path.join(juuri, F_LANG), sLang); if (nLib) fs.writeFileSync(path.join(juuri, F_LIB), sLib); }
  return { virheet, korvattu: tehty.length, tmLang: nLang, lib: nLib, ohitettu, kirjoitettu: !!(opts.kirjoita && tehty.length) };
}
module.exports = { vie, KORJAUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
