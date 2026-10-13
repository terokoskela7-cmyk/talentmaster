#!/usr/bin/env node
/* sv-erä 41 — VIENTI koodin karttoihin (V-KOTI sv-läpiajo, Sibbo; Tero 13.10.2026; Kaista: Tero). Lähde: docs/i18n/sv_kaannoserae_41_palautus.json (Gemini; 18 riviä = SV_ODOTTAA:n viimeiset avaimet).
   Code EI kirjoita eikä muokkaa ruotsia (CLAUDE.md §0): jokainen sv-arvo kopioidaan palautuksesta MERKKI MERKILTÄ ja vienti VERIFIOIDAAN lataamalla kartta uudelleen.
   Kaikki rivit ovat masterT-reitin avaimia (avain = fi-teksti: Kodin/navigaation/pre-harkan/ryhmien/kalenterin libit renderöidään Masterissa C.t = masterT) → lib/tm_master_i18n.js TM_MASTER_I18N.sv (lisäys sv-lohkon loppuun).
   Kuiva-ajo tarkistaa: paikkamerkit ({n}, {nimi} …), HTML-tagit, alku-/loppuvälilyönnit, tyhjät sv-arvot, lukitun yhteisen glossaarin päällekkäisyys (dedupe-invariantti: TM_MASTER_I18N ∩ TM_I18N_COMMON = ∅), jo koodissa oleva eri sv.
   Ajo: node scripts/i18n_vie_sv_era41.cjs [--kuiva]   Idempotentti: jo viety rivi (sama sv) ohitetaan; virhe → ei kirjoiteta mitään. Erätiedostoja (sv_kaannoserae_N.json) ei kosketa (kuten erien 3 ja 19-osa viennit). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_41_palautus.json';

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
  const P = JSON.parse(lue(PALAUTUS)), virheet = [], R = { lisatty: [], ohitettu: [] };
  const common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
  const fMa = 'lib/tm_master_i18n.js'; let sMa = lue(fMa); const olMa = lataaSv(sMa, 'TM_MASTER_I18N'); const rivit = [], nahty = new Set();
  for (const [osio, o] of Object.entries(P.osiot)) for (const [avain, r] of Object.entries(o.rivit)) {
    if (r.fi !== avain) { virheet.push(osio + ': avain ≠ fi: ' + avain); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(osio + ' :: ' + avain + ': ' + syy); continue; }
    if (typeof common[avain] === 'string') { virheet.push('avain on lukitussa yhteisessä glossaarissa (dedupe-invariantti): ' + avain); continue; }
    if (nahty.has(avain)) { if (rivit.find((x) => x[0] === avain)[1] !== r.sv) virheet.push('sama avain kahdessa osiossa eri sv:llä: ' + avain); continue; }
    nahty.add(avain);
    if (typeof olMa[avain] === 'string') { if (olMa[avain] === r.sv) R.ohitettu.push(avain); else virheet.push('Master-avain on jo koodissa eri sv:llä: ' + avain); continue; }
    rivit.push([avain, r.sv, osio]);
  }
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false, yhteensa: nahty.size };
  const otsake = '── sv-käännöserä 41 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era41.cjs) ──';
  if (rivit.length) {
    const a = sMa.indexOf('\n  sv: {'), b = sMa.indexOf('\n  en: {', a); if (a < 0 || b < 0) throw new Error('sv/en-lohkoa ei löydy: ' + fMa);
    const loppu = sMa.lastIndexOf('\n  },', b); if (loppu < a) throw new Error('sv-lohkon loppua ei löydy: ' + fMa);
    sMa = sMa.slice(0, loppu) + '\n    // ' + otsake + '\n' + rivit.map(([x, y]) => '    ' + q(x) + ': ' + q(y) + ',').join('\n') + sMa.slice(loppu);
    rivit.forEach(([x]) => R.lisatty.push(x));
  }
  const uMa = lataaSv(sMa, 'TM_MASTER_I18N');   /* verifiointi: kartta ladataan uudelleen ja verrataan palautukseen merkki merkiltä */
  for (const o of Object.values(P.osiot)) for (const [avain, r] of Object.entries(o.rivit)) if (uMa[avain] !== r.sv) virheet.push('verifiointi: ' + avain);
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false, yhteensa: nahty.size };
  if (opts.kirjoita && R.lisatty.length) fs.writeFileSync(path.join(juuri, fMa), sMa);
  return { virheet, lisatty: R.lisatty, ohitettu: R.ohitettu, kirjoitettu: !!(opts.kirjoita && R.lisatty.length), yhteensa: nahty.size };
}

if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ kirjoitettu: t.kirjoitettu, yhteensa: t.yhteensa, lisatty: t.lisatty.length, ohitettuJoViety: t.ohitettu.length }, null, 1));
}
module.exports = { vie, PALAUTUS };
