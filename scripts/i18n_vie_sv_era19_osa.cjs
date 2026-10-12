#!/usr/bin/env node
/* sv-erä 19 — OSAVIENTI koodin karttoihin (Sibbo 1.11. -valmius, Tero 13.10.2026; Kaista: Tero). Lähde: docs/i18n/sv_kaannoserae_19_palautus.json (Gemini).
   Vie VAIN alla nimetyt 24 riviä (7 kirjastoriviä + 17 Masterin riviä); muut erän 19 rivit viedään koko erän vientiskriptillä 1.11. jälkeen.
   Code EI kirjoita eikä muokkaa ruotsia (CLAUDE.md §0): jokainen sv-arvo kopioidaan palautuksesta merkki merkiltä; vienti VERIFIOIDAAN lataamalla kartat uudelleen.
   Erätiedostoja (sv_kaannoserae_N.json) ei kosketa (kuten erän 3 vienti: erän 2 rivit jäivät tyhjiksi) — niiden täyttö kuuluu koko erän vientiin
   (scripts/i18n_kooste.cjs era19-vie --kirjoita); tests/i18n_master_pr3_reititys.test.js tuntee tämän listan.
   Kohteet:
     lib.tm_kehitystyopoyta, lib.tm_tanaan_signaali → lib/tm_lib_i18n.js TM_LIB_I18N.sv (avain = lib-avain; lisäys ennen mv_pohjat-lohkoa)
     master_kartta                                   → lib/tm_master_i18n.js TM_MASTER_I18N.sv (avain = fi-teksti; lisäys sv-lohkon loppuun)
   Ajo: node scripts/i18n_vie_sv_era19_osa.cjs [--kuiva]
   Idempotentti: jo viety rivi (sama sv) ohitetaan; eri sv koodissa, common-kartan avain tai sopimaton rivi → ajo kaatuu eikä kirjoita mitään. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_19_palautus.json';

/* Klippikortin kanssa samalla sivulla (valmentajan pelaajanäkymä / Master_v16) näkyvät rivit — ks. PR:n kuvaus. */
const LIB_AVAIMET = [
  ['lib.tm_kehitystyopoyta', 'kt_jakso'], ['lib.tm_kehitystyopoyta', 'kt_ei_jaksoa_kortti'], ['lib.tm_kehitystyopoyta', 'kt_katselmus'], ['lib.tm_kehitystyopoyta', 'kt_vk_lyhyt'],
  ['lib.tm_kehitystyopoyta', 'kt_arviot_eroavat'], ['lib.tm_kehitystyopoyta', 'kt_l_vk_tanaan'], ['lib.tm_tanaan_signaali', 'ts_muistuta_nappi'],
];
const MASTER_AVAIMET = [
  'mitattu {n}/{yht} · alle kattavuusrajan (70 %) — osuutta ei näytetä', 'mitattu {n}/{yht} · syntymäaikoja puuttuu — jakaumaa ei näytetä',
  'Ei kehityskohdetta', 'Fyysiset testit kehityskohteena', 'Tekniikka kehityskohteena', 'Alle ikäluokan keskitason', 'Ikäluokan keskitaso tai parempi',
  'Tekniikkakisasta yli vuosi', 'Ei H-H-fyysisiä mittauksia', 'D2 Tekninen — luokitus', '{n} pelaajalla vain yli {kk} kk vanha tulos', '{n} testattua',
  'Luo testitapahtuma', 'esim. Kenttä 2', 'Muut tyypit', 'Muokkaa ehdotusta', 'Poista ehdotus',
];

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
  const rivi = (osio, avain) => { const r = P.osiot[osio] && P.osiot[osio].rivit[avain]; if (!r) virheet.push('ei palautuksessa: ' + osio + ' :: ' + avain); return r; };
  const common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');

  /* lib */
  const fLib = 'lib/tm_lib_i18n.js'; let sLib = lue(fLib); const olLib = lataaSv(sLib, 'TM_LIB_I18N'); const libUudet = [];
  for (const [osio, a] of LIB_AVAIMET) {
    const r = rivi(osio, a); if (!r) continue; const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(osio + ' :: ' + a + ': ' + syy); continue; }
    if (typeof olLib[a] === 'string') { if (olLib[a] === r.sv) R.ohitettu.push(a); else virheet.push('lib-avain on jo koodissa eri sv:llä: ' + a); continue; }
    libUudet.push([osio, a, r.sv]);
  }
  /* master */
  const fMa = 'lib/tm_master_i18n.js'; let sMa = lue(fMa); const olMa = lataaSv(sMa, 'TM_MASTER_I18N'); const maUudet = [];
  for (const fi of MASTER_AVAIMET) {
    const r = rivi('master_kartta', fi); if (!r) continue; if (r.fi !== fi) { virheet.push('master_kartta: avain ≠ fi: ' + fi); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push('master_kartta :: ' + fi + ': ' + syy); continue; }
    if (typeof common[fi] === 'string') { virheet.push('avain on lukitussa yhteisessä glossaarissa (dedupe-invariantti): ' + fi); continue; }
    if (typeof olMa[fi] === 'string') { if (olMa[fi] === r.sv) R.ohitettu.push(fi); else virheet.push('Master-avain on jo koodissa eri sv:llä: ' + fi); continue; }
    maUudet.push([fi, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false };

  const otsake = '── sv-käännöserä 19, osavienti (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era19_osa.cjs) ──';
  if (libUudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat'; const i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy tm_lib_i18n.js:stä');
    let blokki = '      // ' + otsake + '\n';
    for (const osio of [...new Set(libUudet.map((x) => x[0]))]) blokki += '      // ' + osio + '\n' + libUudet.filter((x) => x[0] === osio).map(([, a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n';
    sLib = sLib.slice(0, i) + blokki + sLib.slice(i);
    libUudet.forEach(([, a]) => R.lisatty.push(a));
  }
  if (maUudet.length) {
    const a = sMa.indexOf('\n  sv: {'), b = sMa.indexOf('\n  en: {', a); if (a < 0 || b < 0) throw new Error('sv/en-lohkoa ei löydy: ' + fMa);
    const loppu = sMa.lastIndexOf('\n  },', b); if (loppu < a) throw new Error('sv-lohkon loppua ei löydy: ' + fMa);
    sMa = sMa.slice(0, loppu) + '\n    // ' + otsake.replace('(Gemini; ', '(Gemini; osio master_kartta; ') + '\n' + maUudet.map(([x, y]) => '    ' + q(x) + ': ' + q(y) + ',').join('\n') + sMa.slice(loppu);
    maUudet.forEach(([x]) => R.lisatty.push(x));
  }
  /* verifiointi: ladataan kirjoitettavat kartat ja verrataan palautukseen merkki merkiltä */
  const uLib = lataaSv(sLib, 'TM_LIB_I18N'), uMa = lataaSv(sMa, 'TM_MASTER_I18N');
  for (const [osio, a] of LIB_AVAIMET) if (uLib[a] !== P.osiot[osio].rivit[a].sv) virheet.push('verifiointi: lib ' + a);
  for (const fi of MASTER_AVAIMET) if (uMa[fi] !== P.osiot.master_kartta.rivit[fi].sv) virheet.push('verifiointi: master ' + fi);
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false };
  if (opts.kirjoita && R.lisatty.length) { fs.writeFileSync(path.join(juuri, fLib), sLib); fs.writeFileSync(path.join(juuri, fMa), sMa); }
  return { virheet, lisatty: R.lisatty, ohitettu: R.ohitettu, kirjoitettu: !!(opts.kirjoita && R.lisatty.length) };
}

if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ kirjoitettu: t.kirjoitettu, lisatty: t.lisatty.length, ohitettuJoViety: t.ohitettu.length }, null, 1));
}
module.exports = { LIB_AVAIMET, MASTER_AVAIMET, vie, PALAUTUS };
