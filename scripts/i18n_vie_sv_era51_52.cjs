#!/usr/bin/env node
/* sv-erät 51 + 52 — VIENTI koodin karttaan (Sibbo-valmius 15.10.2026; Kaista: Tero). 51: lib.tm_mediaviesti / tm_kehitystyopoyta / tm_kt_havainto / tm_ryhmat / tm_tanaan_signaali; 52: lib.tm_kasvupyrahdys + tm_kt_toimintakortti. Lähde: docs/i18n/sv_kaannoserae_51_palautus.json, _52_palautus.json (33 riviä) + _49 (3) + _50 (16) (Gemini; käännökset hyväksytty sellaisenaan).
   Code EI kirjoita eikä muokkaa ruotsia (CLAUDE.md §0): jokainen sv-arvo kopioidaan palautuksesta MERKKI MERKILTÄ ja vienti VERIFIOIDAAN lataamalla kartta uudelleen.
   Kohde: lib.tm_kt_alue / tm_kehitystyopoyta / tm_kt_arviointi / tm_kt_toimintakortti → lib/tm_lib_i18n.js TM_LIB_I18N.sv (avain = lib-avain ka_- ja kt_-alkuiset; lisäys ennen mv_pohjat-lohkoa; masterT/vpT löytävät ne jaetun kirjastokartan kautta, päätös A).
   Ajo: node scripts/i18n_vie_sv_era51_52.cjs [--kuiva]   Idempotentti: jo viety rivi (sama sv) ohitetaan; virhe → ei kirjoiteta mitään. Erätiedostoja (sv_kaannoserae_N_gemini.json) ei kosketa. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PALAUTUKSET = ['docs/i18n/sv_kaannoserae_51_palautus.json', 'docs/i18n/sv_kaannoserae_52_palautus.json'];

const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028').replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029') + "'";
const PAIKKA = /\{[A-Za-z0-9_]+\}/g, TAGI = /<\/?[a-zA-Z][a-zA-Z0-9]*/g;
const joukko = (s, re, pois) => (String(s).match(re) || []).filter((x) => !(pois || []).includes(x)).sort().join('|');
function sopii(fi, sv) {
  if (typeof sv !== 'string' || !sv.trim()) return 'sv tyhjä';
  if (joukko(fi, PAIKKA, ['{gen}', '{e}']) !== joukko(sv, PAIKKA, ['{gen}', '{e}'])) return 'paikkamerkit eroavat';
  if (joukko(fi, TAGI) !== joukko(sv, TAGI)) return 'HTML-tagit eroavat';
  if (/^\s/.test(fi) !== /^\s/.test(sv) || /\s$/.test(fi) !== /\s$/.test(sv)) return 'alku-/loppuvälilyönti eroaa';
  return null;
}
function lataaSv(src, nimi) {
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined };
  vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof ' + nimi + ' !== "undefined") ? ' + nimi + ' : null;', sb);
  const m = (sb.module.exports && sb.module.exports[nimi]) || sb.__m;   // IIFE-kartta (tm_lib_i18n.js) näkyy vain module.exportsissa
  if (!m || !m.sv || !Object.keys(m.sv).length) throw new Error('kartan lataus epäonnistui: ' + nimi);
  return m.sv;
}

function vie(opts) {
  opts = opts || {};
  const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8');
  const FIK = {}; ['tm_mediaviesti', 'tm_kehitystyopoyta', 'tm_kt_havainto', 'tm_ryhmat', 'tm_tanaan_signaali', 'tm_kasvupyrahdys', 'tm_kt_toimintakortti'].forEach((l) => Object.assign(FIK, require(path.join(juuri, 'lib', l + '.js')).FI));
  const virheet = [], R = { lisatty: [], ohitettu: [] }, rivit = new Map();   // avain → [sv, osio]
  const common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
  for (const tied of PALAUTUKSET) {
    const P = JSON.parse(lue(tied));
    for (const [osio, o] of Object.entries(P.osiot)) for (const [avain, r] of Object.entries(o.rivit)) {
      const fi = r.fi; if (FIK[avain] !== fi) { virheet.push(tied + ' :: ' + avain + ': fi ei vastaa libin FI-avainta'); continue; }
      const syy = sopii(fi, r.sv); if (syy) { virheet.push(tied + ' :: ' + avain + ': ' + syy); continue; }
      if (typeof common[avain] === 'string') { virheet.push('avain on lukitussa yhteisessä glossaarissa: ' + avain); continue; }
      if (rivit.has(avain) && rivit.get(avain)[0] !== r.sv) { virheet.push('sama avain eri sv:llä erissä: ' + avain); continue; }
      rivit.set(avain, [r.sv, osio]);
    }
  }
  const fLib = 'lib/tm_lib_i18n.js'; let sLib = lue(fLib); const olLib = lataaSv(sLib, 'TM_LIB_I18N'), uudet = [];
  for (const [avain, [sv]] of rivit) {
    if (typeof olLib[avain] === 'string') { if (olLib[avain] === sv) R.ohitettu.push(avain); else virheet.push('lib-avain on jo koodissa eri sv:llä: ' + avain); continue; }
    uudet.push([avain, sv]);
  }
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false, yhteensa: rivit.size };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat'; const i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy tm_lib_i18n.js:stä');
    const blokki = '      // ── sv-käännöserät 51 + 52 (Gemini; docs/i18n/sv_kaannoserae_51|52_palautus.json; vienti scripts/i18n_vie_sv_era51_52.cjs) ──\n      // lib.tm_mediaviesti · tm_kehitystyopoyta · tm_kt_havainto · tm_ryhmat · tm_tanaan_signaali (51) · lib.tm_kasvupyrahdys · tm_kt_toimintakortti (52)\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n';
    sLib = sLib.slice(0, i) + blokki + sLib.slice(i); uudet.forEach(([a]) => R.lisatty.push(a));
  }
  const uLib = lataaSv(sLib, 'TM_LIB_I18N');   /* verifiointi: kartta ladataan uudelleen ja verrataan palautukseen merkki merkiltä */
  for (const [avain, [sv]] of rivit) if (uLib[avain] !== sv) virheet.push('verifiointi: ' + avain);
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false, yhteensa: rivit.size };
  if (opts.kirjoita && R.lisatty.length) fs.writeFileSync(path.join(juuri, fLib), sLib);
  return { virheet, lisatty: R.lisatty, ohitettu: R.ohitettu, kirjoitettu: !!(opts.kirjoita && R.lisatty.length), yhteensa: rivit.size };
}

if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ kirjoitettu: t.kirjoitettu, yhteensa: t.yhteensa, lisatty: t.lisatty.length, ohitettuJoViety: t.ohitettu.length }, null, 1));
}
module.exports = { vie, PALAUTUKSET };
