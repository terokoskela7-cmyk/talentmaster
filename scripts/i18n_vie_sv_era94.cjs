#!/usr/bin/env node
/* sv-erä 94 (B9 suostumuksen peruminen, #1176; PM kirjoitti sv 4.11.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_94_palautus.json. Kaista: Tero.
   tm_lang (13): sv.pelaaja → huoltajasi_ei_ole_viela_antanut-riville, sv.vanhempi → pelaajan_kirjautuminen-riville (tm_lang rivikatossa 4047: ei uusia rivejä)
   henkilosto_kartta (7, avain = fi-teksti, Seuran tmHT) → lib/tm_henkilosto_i18n.js sv-kartan loppuun.
   lib (1) → lib/tm_lib_i18n.js sv, kt_phv_post-riville (rivikatossa 1838).
   sahkoposti (7) → functions/suostumus_peruminen.js TEKSTIT.sv (tyhjä sv-olio korvataan; kuittaus lähtee ruotsiksi vasta kun kaikki 7 ovat mukana).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen; fi täsmätään koodiin ja lähetettyyn erään.
   Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era94.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_94_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_94_gemini.json';
const F = { lang: 'lib/tm_lang.js', he: 'lib/tm_henkilosto_i18n.js', lib: 'lib/tm_lib_i18n.js', sp: 'functions/suostumus_peruminen.js' };
const ANKKURI = { pelaaja: 'huoltajasi_ei_ole_viela_antanut', vanhempi: 'pelaajan_kirjautuminen' }, LIB_ANKKURI = "'kt_phv_post'";
const SP_TYHJA = "  sv: { otsikko: '', tervehdys: '', vahvistus: '', aiempi: '', uudelleen: '', poisto: '', alaviite: '' },";
const KOHDE = { tm_lang: 'lang', henkilosto_kartta: 'he', lib: 'lib', sahkoposti: 'sp' };

function lataaLang(src) {
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined, localStorage: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : null;', sb);
  const m = (sb.module.exports && sb.module.exports.TM_LANG) || sb.__m; if (!m || !m.sv || !m.fi) throw new Error('tm_lang.js:n lataus epäonnistui'); return m;
}
function lataaTekstit(src) {   // functions/suostumus_peruminen.js: vain TEKSTIT-olio (ei moduulin riippuvuuksia)
  const i = src.indexOf('const TEKSTIT = {'), e = src.indexOf('\n};', i); if (i < 0 || e < 0) throw new Error('TEKSTIT-oliota ei löydy');
  return vm.runInNewContext('(' + src.slice(i + 'const TEKSTIT = '.length, e + 2) + ')');
}
/* Lisää "a: 'sv'," rivin loppuun ennen rivin kommenttia. Rivi = '\n<sisennys><ankkuri>:' välillä [alku, loppu). */
function lisaaRiville(src, alku, loppu, ankkuriAlku, lisays) {
  const j = src.indexOf(ankkuriAlku, alku); if (j < 0 || j > loppu || src.indexOf(ankkuriAlku, j + 1) < loppu && src.indexOf(ankkuriAlku, j + 1) > 0) return null;
  const e = src.indexOf('\n', j + 1), rivi = src.slice(j + 1, e), m = rivi.match(/^(.*',)(\s*\/\/.*)?$/); if (!m) return null;
  const kommentti = m[2] ? m[2] + ' · erä 94 (PM)' : '   // erä 94 (PM)';
  return src.slice(0, j + 1) + m[1] + ' ' + lisays + kommentti + src.slice(e);
}

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot || {}, G = JSON.parse(lue(LAHETYS)).osiot || {};
  const s = { lang: lue(F.lang), he: lue(F.he), lib: lue(F.lib), sp: lue(F.sp) };
  const L = lataaLang(s.lang), HE = lataaSv(s.he, 'TM_HENKILOSTO_I18N'), LIB = lataaSv(s.lib, 'TM_LIB_I18N'), SP = lataaTekstit(s.sp);
  const KTS_FI = require(path.join(juuri, 'lib/tm_kt_sivu.js')).FI;
  const u = { lang: [], he: [], lib: [], sp: [] };
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(G).sort())) virheet.push('osiot ≠ lähetetty erä');
  for (const o of Object.keys(G)) {
    const k0 = KOHDE[o]; if (!k0) { virheet.push('tuntematon osio: ' + o); continue; }
    if (!P[o]) { virheet.push('osio puuttuu palautuksesta: ' + o); continue; }
    if (JSON.stringify(Object.keys(P[o].rivit).sort()) !== JSON.stringify(Object.keys(G[o].rivit).sort())) { virheet.push(o + ': avaimet ≠ lähetetty erä'); continue; }
    for (const [k, r] of Object.entries(P[o].rivit)) {
      let koodiFi, nyt;
      if (k0 === 'lang') { const [ry, a] = k.split('.'); koodiFi = L.fi[ry] && L.fi[ry][a]; nyt = L.sv[ry] && L.sv[ry][a]; }
      else if (k0 === 'he') { koodiFi = k; nyt = HE[k]; }
      else if (k0 === 'lib') { koodiFi = KTS_FI && KTS_FI[k]; nyt = LIB[k]; }
      else { koodiFi = SP.fi[k]; nyt = SP.sv[k] === '' ? undefined : SP.sv[k]; }
      if (r.fi !== G[o].rivit[k].fi || r.fi !== koodiFi) { virheet.push(o + ' / ' + k + ': fi ≠ koodi / lähetetty erä'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(o + ' / ' + k + ': ' + syy); continue; }
      if (typeof nyt === 'string') { if (nyt === r.sv) ohitettu.push(k); else virheet.push(o + ' / ' + k + ': jo koodissa eri sv:llä'); continue; }
      u[k0].push([k, r.sv]);
    }
  }
  if (u.sp.length && u.sp.length !== Object.keys(SP.fi).length) virheet.push('sahkoposti: osittainen vienti (' + u.sp.length + '/' + Object.keys(SP.fi).length + ')');
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };

  const svA = s.lang.indexOf('\n  sv: {'), svE = s.lang.indexOf('\n  en: {', svA);
  for (const ry of ['pelaaja', 'vanhempi']) {
    const rivit = u.lang.filter(([k]) => k.split('.')[0] === ry); if (!rivit.length) continue;
    const bA = s.lang.indexOf('\n    ' + ry + ': {\n', svA), bE = s.lang.indexOf('\n    },', bA);
    if (svA < 0 || bA < 0 || bA > svE || bE < 0) { virheet.push('tm_lang sv.' + ry + ' -lohkoa ei löydy'); continue; }
    const uusi = lisaaRiville(s.lang, bA, bE, '\n      ' + ANKKURI[ry] + ':', rivit.map(([k, sv]) => k.split('.')[1] + ': ' + q(sv) + ',').join(' '));
    if (!uusi) { virheet.push('tm_lang sv.' + ry + ': ankkuririviä ei löydy'); continue; }
    s.lang = uusi;
  }
  if (u.he.length) s.he = lisaaKarttaan(s.he, u.he, '── sv-käännöserä 94 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era94.cjs): B9 suostumuksen peruminen ──');
  if (u.lib.length) {
    const a = s.lib.indexOf('\n  sv: {'), e = s.lib.indexOf('\n  en: {', a);
    const uusi = lisaaRiville(s.lib, a, e < 0 ? s.lib.length : e, '\n      ' + LIB_ANKKURI + ':', u.lib.map(([k, sv]) => q(k) + ': ' + q(sv) + ',').join(' '));
    if (!uusi) virheet.push('tm_lib_i18n sv: ankkuririviä ei löydy'); else s.lib = uusi;
  }
  if (u.sp.length) {
    const i = s.sp.indexOf(SP_TYHJA); if (i < 0 || s.sp.indexOf(SP_TYHJA, i + 1) >= 0) virheet.push('suostumus_peruminen.js: tyhjää sv-oliota ei löydy yksiselitteisesti');
    else {
      const m = new Map(u.sp), obj = '  sv: {   // sv-erä 94 (PM 4.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era94.cjs)\n'
        + Object.keys(SP.fi).map((k) => '    ' + k + ': ' + q(m.get(k)) + ',').join('\n') + '\n  },';
      s.sp = s.sp.slice(0, i) + obj + s.sp.slice(i + SP_TYHJA.length);
    }
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  // Verifiointi: ladataan kartat uudelleen ja verrataan merkki merkiltä
  const vL = lataaLang(s.lang), vH = lataaSv(s.he, 'TM_HENKILOSTO_I18N'), vLib = lataaSv(s.lib, 'TM_LIB_I18N'), vSp = lataaTekstit(s.sp);
  for (const [k, sv] of u.lang) { const [ry, a] = k.split('.'); if (!vL.sv[ry] || vL.sv[ry][a] !== sv) virheet.push('verifiointi tm_lang ' + k); }
  for (const [k, sv] of u.he) if (vH[k] !== sv) virheet.push('verifiointi henkilosto ' + k);
  for (const [k, sv] of u.lib) if (vLib[k] !== sv) virheet.push('verifiointi lib ' + k);
  for (const [k, sv] of u.sp) if (vSp.sv[k] !== sv) virheet.push('verifiointi sahkoposti ' + k);
  if (s.lang.split('\n').length !== lue(F.lang).split('\n').length || s.lib.split('\n').length !== lue(F.lib).split('\n').length) virheet.push('tm_lang/tm_lib_i18n: rivimäärä muuttui (rivikatto)');
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const n = u.lang.length + u.he.length + u.lib.length + u.sp.length;
  if (opts.kirjoita && n) for (const k of Object.keys(u)) if (u[k].length) fs.writeFileSync(path.join(juuri, F[k]), s[k]);
  return { virheet, lisatty: n, tmLang: u.lang.length, henkilosto: u.he.length, lib: u.lib.length, sahkoposti: u.sp.length, ohitettu, kirjoitettu: !!(opts.kirjoita && n) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
