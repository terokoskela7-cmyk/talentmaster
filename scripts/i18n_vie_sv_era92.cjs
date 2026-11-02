#!/usr/bin/env node
/* sv-erä 92 (QG-1:n kertalisäys baselineen + sv_aukot_baseline_28, PM 29.–30.10.2026) — VIENTI koodiin. 10 osiota / 55 riviä:
   vp.* → lib/tm_vp_i18n.js (fi-teksti-avain) · master.* → lib/tm_master_i18n.js (fi-teksti-avain) · lib.tm_kehitystyopoyta → lib/tm_lib_i18n.js (lib-avain) · tm_lang.pelaaja → lib/tm_lang.js sv.pelaaja.
   Lisäksi KOPIOT (ei uutta ruotsia): tm_nakyma_ryhmat-rivin muut osat (Ei luokkaa, {n}/{yht} mitattu tuoreesti, {n} ilman tulosta) Masterin kartasta VP:n karttaan
   samalla kun {n} ilman päivää viedään — muuten D1-rivi näkyisi VP:ssä puoliksi suomeksi.
   Lähde: docs/i18n/sv_kaannoserae_92_palautus.json (PM:n kirjoittama). Kaista: Tero.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Sama malli kuin scripts/i18n_vie_sv_era91.cjs. Ajo: node scripts/i18n_vie_sv_era92.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_92_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_92_gemini.json';
const F = { vp: 'lib/tm_vp_i18n.js', master: 'lib/tm_master_i18n.js', lib: 'lib/tm_lib_i18n.js', lang: 'lib/tm_lang.js' };
const KOHDE = (osio) => osio.startsWith('vp.') ? 'vp' : osio.startsWith('master.') ? 'master' : osio.startsWith('lib.') ? 'lib' : osio.startsWith('tm_lang.') ? 'lang' : null;
const LIB_FI = { 'lib.tm_kehitystyopoyta': 'lib/tm_kehitystyopoyta.js' };
const KOPIOT_MASTER_VP = ['Ei luokkaa', '{n}/{yht} mitattu tuoreesti', '{n} ilman tulosta'];   // lib/tm_nakyma_ryhmat.js → VP (vpT)
const OTSAKE = 'sv-käännöserä 92 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era92.cjs) — QG-1:n baseline-tekstit';

function lataaLang(src) {   // tm_lang.js: TM_LANG = { fi, sv, en } → koko olio
  const vm = require('vm'), sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined, localStorage: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : null;', sb);
  const m = (sb.module.exports && sb.module.exports.TM_LANG) || sb.__m; if (!m || !m.sv || !m.fi) throw new Error('tm_lang.js:n lataus epäonnistui'); return m;
}

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot || {}, G = JSON.parse(lue(LAHETYS)).osiot || {};
  const s = { vp: lue(F.vp), master: lue(F.master), lib: lue(F.lib), lang: lue(F.lang) };
  const ol = { vp: lataaSv(s.vp, 'TM_VP_I18N'), master: lataaSv(s.master, 'TM_MASTER_I18N'), lib: lataaSv(s.lib, 'TM_LIB_I18N') }, L = lataaLang(s.lang);
  const uudet = { vp: [], master: [], lib: [], lang: [] };
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(G).sort())) virheet.push('osiot ≠ lähetetty erä');
  for (const o of Object.keys(G)) {
    const k0 = KOHDE(o); if (!k0) { virheet.push('tuntematon kohde: ' + o); continue; }
    if (!P[o]) { virheet.push('osio puuttuu palautuksesta: ' + o); continue; }
    if (JSON.stringify(Object.keys(P[o].rivit).sort()) !== JSON.stringify(Object.keys(G[o].rivit).sort())) { virheet.push(o + ': avaimet ≠ lähetetty erä'); continue; }
    const FI = LIB_FI[o] ? require(path.join(juuri, LIB_FI[o])).FI : null;
    const lahde = k0 === 'vp' || k0 === 'master' ? String(G[o]._lahde || '').split(' · ').map((f) => lue(f)).join('\n') : null;
    for (const [k, r] of Object.entries(P[o].rivit)) {
      const g = G[o].rivit[k];
      // fi = koodi = lähetetty erä
      let koodiFi;
      if (k0 === 'lib') koodiFi = FI && FI[k];
      else if (k0 === 'lang') { const [ryhma, a] = k.split('.'); koodiFi = L.fi[ryhma] && L.fi[ryhma][a]; }
      else koodiFi = lahde.includes("'" + k + "'") ? k : undefined;
      if (r.fi !== g.fi || r.fi !== koodiFi) { virheet.push(o + ' / ' + k + ': fi ≠ koodi / lähetetty erä'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(o + ' / ' + k + ': ' + syy); continue; }
      let nyt;
      if (k0 === 'lang') { const [ryhma, a] = k.split('.'); nyt = L.sv[ryhma] && L.sv[ryhma][a]; } else nyt = ol[k0][k];
      if (typeof nyt === 'string') { if (nyt === r.sv) ohitettu.push(k); else virheet.push(o + ' / ' + k + ': jo koodissa eri sv:llä'); continue; }
      if (uudet[k0].some(([x]) => x === k)) { if (!uudet[k0].some(([x, y]) => x === k && y === r.sv)) virheet.push(k + ': sama avain kahdesti eri sv:llä'); continue; }
      uudet[k0].push([k, r.sv]);
    }
  }
  // Kopiot Master → VP: arvo täsmälleen Masterin kartan sv
  const kopiot = [];
  for (const k of KOPIOT_MASTER_VP) {
    const m = ol.master[k]; if (typeof m !== 'string' || !m) { virheet.push('kopio ' + k + ': ei Masterin kartassa'); continue; }
    if (typeof ol.vp[k] === 'string') { if (ol.vp[k] === m) ohitettu.push('kopio:' + k); else virheet.push('kopio ' + k + ': VP:ssä eri sv'); continue; }
    kopiot.push([k, m]);
  }
  if (virheet.length) return { virheet, lisatty: {}, kopiot: [], ohitettu, kirjoitettu: false };
  const n = { vp: uudet.vp.length + kopiot.length, master: uudet.master.length, lib: uudet.lib.length, lang: uudet.lang.length };
  if (uudet.vp.length || kopiot.length) {
    let v = s.vp; if (uudet.vp.length) v = lisaaKarttaan(v, uudet.vp, OTSAKE);
    if (kopiot.length) v = lisaaKarttaan(v, kopiot, 'erä 92: kopiot lib/tm_master_i18n.js:stä (sama sv merkki merkiltä) — lib/tm_nakyma_ryhmat.js:n D1-rivin muut osat');
    s.vp = v;
  }
  if (uudet.master.length) s.master = lisaaKarttaan(s.master, uudet.master, OTSAKE);
  if (uudet.lib.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = s.lib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    s.lib = s.lib.slice(0, i) + '      // ── ' + OTSAKE + ': Kehitystyöpöydän kasvupyrähdys-chip\n' + uudet.lib.map(([k, sv]) => '      ' + q(k) + ': ' + q(sv) + ',').join('\n') + '\n' + s.lib.slice(i);
  }
  for (const [k, sv] of uudet.lang) {   // sv.<ryhmä> -lohkon alkuun
    const [ryhma, a] = k.split('.'), i = s.lang.indexOf('\n  sv: {'), e = s.lang.indexOf('\n  en: {', i), alku = '\n    ' + ryhma + ': {\n', j = s.lang.indexOf(alku, i);
    if (i < 0 || j < 0 || j > e) { virheet.push('tm_lang sv.' + ryhma + ' -lohkoa ei löydy'); continue; }
    s.lang = s.lang.slice(0, j + alku.length) + '      ' + a + ': ' + q(sv) + ',   // erä 92 (PM)\n' + s.lang.slice(j + alku.length);
  }
  // Verifiointi: ladataan kartat uudelleen
  const vl = { vp: lataaSv(s.vp, 'TM_VP_I18N'), master: lataaSv(s.master, 'TM_MASTER_I18N'), lib: lataaSv(s.lib, 'TM_LIB_I18N') }, vL = lataaLang(s.lang);
  for (const k0 of ['vp', 'master', 'lib']) for (const [k, sv] of uudet[k0]) if (vl[k0][k] !== sv) virheet.push('verifiointi ' + k0 + ' ' + k);
  for (const [k, sv] of kopiot) if (vl.vp[k] !== sv || vl.vp[k] !== vl.master[k]) virheet.push('verifiointi kopio ' + k);
  for (const [k, sv] of uudet.lang) { const [ryhma, a] = k.split('.'); if (!vL.sv[ryhma] || vL.sv[ryhma][a] !== sv) virheet.push('verifiointi tm_lang ' + k); }
  if (virheet.length) return { virheet, lisatty: {}, kopiot: [], ohitettu, kirjoitettu: false };
  const muuttui = n.vp + n.master + n.lib + n.lang > 0;
  if (opts.kirjoita && muuttui) for (const k0 of Object.keys(F)) if (s[k0] !== lue(F[k0])) fs.writeFileSync(path.join(juuri, F[k0]), s[k0]);
  return { virheet, lisatty: n, kopiot: kopiot.map(([k]) => k), ohitettu, kirjoitettu: !!(opts.kirjoita && muuttui) };
}
module.exports = { vie, PALAUTUS, KOPIOT_MASTER_VP };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ lisatty: t.lisatty, kopiot: t.kopiot, ohitettu: t.ohitettu.length, kirjoitettu: t.kirjoitettu }));
}
