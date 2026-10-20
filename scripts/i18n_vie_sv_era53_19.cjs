#!/usr/bin/env node
/* sv-erä 53 (lib.tm_kt_sivu, lib.tm_kt_havainto, master_kartta) + erän 19 VP-rivit (vp_kartta, 37 riviä jotka palautuksessa mutta eivät koodissa) — VIENTI koodin karttoihin (Sibbo-reititys; Kaista: Tero).
   Lähteet: docs/i18n/sv_kaannoserae_53_palautus.json, docs/i18n/sv_kaannoserae_19_palautus.json. Kohteet: lib/tm_lib_i18n.js (lib-avain), lib/tm_master_i18n.js (fi-teksti), lib/tm_vp_i18n.js (fi-teksti).
   Code EI kirjoita eikä muokkaa ruotsia (CLAUDE.md §0): sv kopioidaan palautuksesta MERKKI MERKILTÄ ja vienti VERIFIOIDAAN lataamalla kartat uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Ajo: node scripts/i18n_vie_sv_era53_19.cjs [--kuiva]   Rivit "kovakoodatut.*" (erä 53) EIVÄT kuulu tähän: ne viedään vasta reitityksen yhteydessä (scripts/i18n_vie_sv_reititys.cjs). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
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
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof ' + nimi + ' !== "undefined") ? ' + nimi + ' : null;', sb);
  const m = (sb.module.exports && sb.module.exports[nimi]) || sb.__m; if (!m || !m.sv || !Object.keys(m.sv).length) throw new Error('kartan lataus epäonnistui: ' + nimi); return m.sv;
}
/** lisää rivit sv-lohkon loppuun (fi-teksti-avaimiset kartat: Master, VP) */
function lisaaKarttaan(src, rivit, otsake) {
  const a = src.indexOf('\n  sv: {'), b = src.indexOf('\n  en: {', a); if (a < 0 || b < 0) throw new Error('sv/en-lohkoa ei löydy');
  const loppu = src.lastIndexOf('\n  },', b); if (loppu < a) throw new Error('sv-lohkon loppua ei löydy');
  return src.slice(0, loppu) + '\n    // ' + otsake + '\n' + rivit.map(([x, y]) => '    ' + q(x) + ': ' + q(y) + ',').join('\n') + src.slice(loppu);
}
const KORVATUT_FI = ['kt_h_lause_ohje'];   // K1b (20.10.2026): lauseen selite muutettu ('Vain henkilökunta näkee tämän.') → erä 76
const PALAUTUS_53 = 'docs/i18n/sv_kaannoserae_53_palautus.json', PALAUTUS_19 = 'docs/i18n/sv_kaannoserae_19_palautus.json';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], R = { lisatty: [], ohitettu: [] };
  const P53 = JSON.parse(lue(PALAUTUS_53)), P19 = JSON.parse(lue(PALAUTUS_19));
  const common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
  const fLib = 'lib/tm_lib_i18n.js', fMa = 'lib/tm_master_i18n.js', fVp = 'lib/tm_vp_i18n.js';
  let sLib = lue(fLib), sMa = lue(fMa), sVp = lue(fVp);
  const olLib = lataaSv(sLib, 'TM_LIB_I18N'), olMa = lataaSv(sMa, 'TM_MASTER_I18N'), olVp = lataaSv(sVp, 'TM_VP_I18N');
  const libUudet = [], maUudet = [], vpUudet = [], odotus = [];   // odotus = palautuksen rivit joiden vienti on tarkistettava verifioinnissa
  // ── erä 53: lib ──
  for (const osio of ['lib.tm_kt_sivu', 'lib.tm_kt_havainto']) {
    const FI = require(path.join(juuri, 'lib', osio.slice(4) + '.js')).FI;
    for (const [a, r] of Object.entries(P53.osiot[osio].rivit)) {
      if (KORVATUT_FI.indexOf(a) >= 0 && FI[a] !== r.fi) { R.ohitettu.push(a); continue; }   // fi muutettu myöhemmin (K1b, erä 76): vanha sv poistettu koodista, uusi sv tulee erästä 76
      if (FI[a] !== r.fi) { virheet.push(osio + ' :: ' + a + ': fi ei vastaa libin FI-avainta'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(osio + ' :: ' + a + ': ' + syy); continue; }
      odotus.push(['lib', a, r.sv]);
      if (typeof olLib[a] === 'string') { if (olLib[a] === r.sv) R.ohitettu.push(a); else virheet.push('lib-avain on jo koodissa eri sv:llä: ' + a); continue; }
      libUudet.push([a, r.sv]);
    }
  }
  // ── erä 53: kovakoodatut.harjoitusarviointi → TM_LIB_I18N (avain = fi-teksti; masterT ja vpT löytävät jaetun kirjastokartan), vain rivit joita lib/tm_harjoitusarviointi.js käyttää ──
  const haSrc = lue('lib/tm_harjoitusarviointi.js');
  for (const [fi, r] of Object.entries(P53.osiot['kovakoodatut.harjoitusarviointi'].rivit)) {
    if (r.fi !== fi) { virheet.push('kovakoodatut.harjoitusarviointi: avain ≠ fi: ' + fi); continue; }
    if (haSrc.indexOf(fi.replace(/'/g, "\\'")) < 0) { virheet.push('kovakoodatut.harjoitusarviointi :: ' + fi + ': tekstiä ei löydy lib/tm_harjoitusarviointi.js:stä'); continue; }
    const syy = sopii(fi, r.sv); if (syy) { virheet.push('kovakoodatut.harjoitusarviointi :: ' + fi + ': ' + syy); continue; }
    odotus.push(['lib', fi, r.sv]);
    if (typeof olLib[fi] === 'string') { if (olLib[fi] === r.sv) R.ohitettu.push(fi); else virheet.push('lib-avain on jo koodissa eri sv:llä: ' + fi); continue; }
    libUudet.push([fi, r.sv]);
  }
  // ── karttarivit: master_kartta (53) → Master; vp_kartta (19) → VP, vain rivit joille sv puuttuu koodista ──
  const karttaRivit = (P, osio, ol, uudet, nimi, vainPuuttuvat) => {
    for (const [fi, r] of Object.entries(P.osiot[osio].rivit)) {
      if (r.fi !== fi) { virheet.push(osio + ': avain ≠ fi: ' + fi); continue; }
      if (vainPuuttuvat && require('../tests/helpers/k1d_korvaukset.cjs').KARTTA.has(fi)) { R.ohitettu.push(fi); continue; }   // K1d: fi-avain korvattu sanastopäätöksellä (sv päivittyy erässä 80)
      if (typeof ol[fi] === 'string') { if (!vainPuuttuvat && ol[fi] !== r.sv) virheet.push(nimi + '-avain on jo koodissa eri sv:llä: ' + fi); else R.ohitettu.push(fi); continue; }
      const syy = sopii(fi, r.sv); if (syy) { virheet.push(osio + ' :: ' + fi + ': ' + syy); continue; }
      if (typeof common[fi] === 'string') { virheet.push('avain on lukitussa yhteisessä glossaarissa (dedupe-invariantti): ' + fi); continue; }
      odotus.push([nimi, fi, r.sv]); uudet.push([fi, r.sv]);
    }
  };
  karttaRivit(P53, 'master_kartta', olMa, maUudet, 'master', false);
  karttaRivit(P19, 'vp_kartta', olVp, vpUudet, 'vp', true);
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false };
  if (libUudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat'; const i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy tm_lib_i18n.js:stä');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 53 (Gemini; ' + PALAUTUS_53 + '; vienti scripts/i18n_vie_sv_era53_19.cjs) ── lib.tm_kt_sivu · lib.tm_kt_havainto · kovakoodatut.harjoitusarviointi (avain = fi-teksti)\n' + libUudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
    libUudet.forEach(([a]) => R.lisatty.push(a));
  }
  if (maUudet.length) { sMa = lisaaKarttaan(sMa, maUudet, '── sv-käännöserä 53, osio master_kartta (Gemini; vienti scripts/i18n_vie_sv_era53_19.cjs) ──'); maUudet.forEach(([x]) => R.lisatty.push(x)); }
  if (vpUudet.length) { sVp = lisaaKarttaan(sVp, vpUudet, '── sv-käännöserä 19, osio vp_kartta, palautus 11.10. (Gemini; vienti scripts/i18n_vie_sv_era53_19.cjs) ──'); vpUudet.forEach(([x]) => R.lisatty.push(x)); }
  const uLib = lataaSv(sLib, 'TM_LIB_I18N'), uMa = lataaSv(sMa, 'TM_MASTER_I18N'), uVp = lataaSv(sVp, 'TM_VP_I18N');   // verifiointi: kartat ladataan uudelleen
  for (const [k, a, sv] of odotus) if ((k === 'lib' ? uLib : k === 'master' ? uMa : uVp)[a] !== sv) virheet.push('verifiointi: ' + k + ' ' + a);
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false };
  if (opts.kirjoita && R.lisatty.length) { fs.writeFileSync(path.join(juuri, fLib), sLib); fs.writeFileSync(path.join(juuri, fMa), sMa); fs.writeFileSync(path.join(juuri, fVp), sVp); }
  return { virheet, lisatty: R.lisatty, ohitettu: R.ohitettu, kirjoitettu: !!(opts.kirjoita && R.lisatty.length), lib: libUudet.length, master: maUudet.length, vp: vpUudet.length };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ kirjoitettu: t.kirjoitettu, lib: t.lib, master: t.master, vp: t.vp, ohitettuJoViety: t.ohitettu.length }));
}
module.exports = { vie, PALAUTUS_53, PALAUTUS_19, sopii, lataaSv, lisaaKarttaan, q };
