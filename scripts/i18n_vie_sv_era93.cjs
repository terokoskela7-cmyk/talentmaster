#!/usr/bin/env node
/* sv-erä 93 (8–9 v -esto, #1175; PM kirjoitti sv 3.11.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_93_palautus.json. Kaista: Tero.
   tm_lang.pelaaja.ika_alle_10 → lib/tm_lang.js sv.pelaaja (samalle riville kuin huoltajasi_ei_ole_viela_antanut: tm_lang on rivikatossa 4047)
   henkilosto_kartta (2, avain = fi-teksti, Seuran tmHT) → lib/tm_henkilosto_i18n.js sv-kartan loppuun.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen; fi täsmätään koodiin ja lähetettyyn erään.
   Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era93.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_93_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_93_gemini.json';
const F_LANG = 'lib/tm_lang.js', F_HE = 'lib/tm_henkilosto_i18n.js', ANKKURI = 'huoltajasi_ei_ole_viela_antanut';

function lataaLang(src) {
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined, localStorage: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : null;', sb);
  const m = (sb.module.exports && sb.module.exports.TM_LANG) || sb.__m; if (!m || !m.sv || !m.fi) throw new Error('tm_lang.js:n lataus epäonnistui'); return m;
}

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot || {}, G = JSON.parse(lue(LAHETYS)).osiot || {};
  let sLang = lue(F_LANG), sHe = lue(F_HE);
  const L = lataaLang(sLang), HE = lataaSv(sHe, 'TM_HENKILOSTO_I18N'), uLang = [], uHe = [];
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(G).sort())) virheet.push('osiot ≠ lähetetty erä');
  for (const o of Object.keys(G)) {
    if (!P[o]) { virheet.push('osio puuttuu palautuksesta: ' + o); continue; }
    if (JSON.stringify(Object.keys(P[o].rivit).sort()) !== JSON.stringify(Object.keys(G[o].rivit).sort())) { virheet.push(o + ': avaimet ≠ lähetetty erä'); continue; }
    for (const [k, r] of Object.entries(P[o].rivit)) {
      let koodiFi, nyt;
      if (o === 'tm_lang') { const [ry, a] = k.split('.'); koodiFi = L.fi[ry] && L.fi[ry][a]; nyt = L.sv[ry] && L.sv[ry][a]; }
      else if (o === 'henkilosto_kartta') { koodiFi = k; nyt = HE[k]; }
      else { virheet.push('tuntematon osio: ' + o); continue; }
      if (r.fi !== G[o].rivit[k].fi || r.fi !== koodiFi) { virheet.push(o + ' / ' + k + ': fi ≠ koodi / lähetetty erä'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(o + ' / ' + k + ': ' + syy); continue; }
      if (typeof nyt === 'string') { if (nyt === r.sv) ohitettu.push(k); else virheet.push(o + ' / ' + k + ': jo koodissa eri sv:llä'); continue; }
      (o === 'tm_lang' ? uLang : uHe).push([k, r.sv]);
    }
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  for (const [k, sv] of uLang) {   // sv.<ryhmä>: ankkuririvin loppuun (ei uutta riviä)
    const [ry, a] = k.split('.'), i = sLang.indexOf('\n  sv: {'), e = sLang.indexOf('\n  en: {', i);
    const j = sLang.indexOf('\n      ' + ANKKURI + ': ', i), loppu = j < 0 ? -1 : sLang.indexOf('\n', j + 1);
    if (ry !== 'pelaaja' || i < 0 || j < 0 || j > e || !/',\s*$/.test(sLang.slice(j, loppu))) { virheet.push('tm_lang sv.' + ry + ': ankkuririviä ei löydy'); continue; }
    sLang = sLang.slice(0, loppu) + ' ' + a + ': ' + q(sv) + ',   // erä 93 (PM)' + sLang.slice(loppu);
  }
  if (uHe.length) sHe = lisaaKarttaan(sHe, uHe, '── sv-käännöserä 93 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era93.cjs): 8–9 v -esto ──');
  const vL = lataaLang(sLang), vH = lataaSv(sHe, 'TM_HENKILOSTO_I18N');
  for (const [k, sv] of uLang) { const [ry, a] = k.split('.'); if (!vL.sv[ry] || vL.sv[ry][a] !== sv) virheet.push('verifiointi tm_lang ' + k); }
  for (const [k, sv] of uHe) if (vH[k] !== sv) virheet.push('verifiointi henkilosto ' + k);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const n = uLang.length + uHe.length;
  if (opts.kirjoita && n) { if (uLang.length) fs.writeFileSync(path.join(juuri, F_LANG), sLang); if (uHe.length) fs.writeFileSync(path.join(juuri, F_HE), sHe); }
  return { virheet, lisatty: n, tmLang: uLang.length, henkilosto: uHe.length, ohitettu, kirjoitettu: !!(opts.kirjoita && n) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
