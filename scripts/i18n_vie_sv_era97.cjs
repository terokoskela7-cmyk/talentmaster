#!/usr/bin/env node
/* sv-erä 97 (email_verified PR a, #1210; PM kirjoitti sv 6.11.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_97_palautus.json. Kaista: Tero.
   tm_lang (1): sv.vanhempi → vahvista_sahkoposti-riville (ei uusia rivejä; tm_lang rivikatossa 4049).
   Code EI kirjoita ruotsia (§0): arvo kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla tm_lang uudelleen; fi täsmätään koodiin ja lähetettyyn erään.
   Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era97.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { sopii, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_97_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_97_gemini.json', F = 'lib/tm_lang.js';
const ANKKURI = { vanhempi: 'vahvista_sahkoposti' };

function lataaLang(src) {
  const sb = { module: { exports: {} }, console: { log() {}, warn() {}, error() {} }, window: undefined, localStorage: undefined }; vm.createContext(sb);
  vm.runInContext(src + '\n;this.__m = (typeof TM_LANG !== "undefined") ? TM_LANG : null;', sb);
  const m = (sb.module.exports && sb.module.exports.TM_LANG) || sb.__m; if (!m || !m.sv || !m.fi) throw new Error('tm_lang.js:n lataus epäonnistui'); return m;
}
/* Lisää "a: 'sv'," rivin loppuun ennen rivin kommenttia. Rivi = '\n<sisennys><ankkuri>:' välillä [alku, loppu), yksiselitteinen. */
function lisaaRiville(src, alku, loppu, ankkuriAlku, lisays) {
  const j = src.indexOf(ankkuriAlku, alku); if (j < 0 || j > loppu) return null;
  const j2 = src.indexOf(ankkuriAlku, j + 1); if (j2 > 0 && j2 < loppu) return null;
  const e = src.indexOf('\n', j + 1), rivi = src.slice(j + 1, e), m = rivi.match(/^(.*',)(\s*\/\/.*)?$/); if (!m) return null;
  const kommentti = m[2] ? m[2] + ' · erä 97 (PM)' : '   // erä 97 (PM)';
  return src.slice(0, j + 1) + m[1] + ' ' + lisays + kommentti + src.slice(e);
}

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot || {}, G = JSON.parse(lue(LAHETYS)).osiot || {};
  let s = lue(F); const L = lataaLang(s), u = [];
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(['tm_lang']) || JSON.stringify(Object.keys(G).sort()) !== JSON.stringify(['tm_lang'])) virheet.push('osiot ≠ [tm_lang]');
  else if (JSON.stringify(Object.keys(P.tm_lang.rivit).sort()) !== JSON.stringify(Object.keys(G.tm_lang.rivit).sort())) virheet.push('tm_lang: avaimet ≠ lähetetty erä');
  else for (const [k, r] of Object.entries(P.tm_lang.rivit)) {
    const [ry, a] = k.split('.'); const koodiFi = L.fi[ry] && L.fi[ry][a], nyt = L.sv[ry] && L.sv[ry][a];
    if (!ANKKURI[ry]) { virheet.push(k + ': tuntematon ryhmä'); continue; }
    if (r.fi !== G.tm_lang.rivit[k].fi || r.fi !== koodiFi) { virheet.push(k + ': fi ≠ koodi / lähetetty erä'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof nyt === 'string') { if (nyt === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    u.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };

  const svA = s.indexOf('\n  sv: {'), svE = s.indexOf('\n  en: {', svA);
  for (const ry of Object.keys(ANKKURI)) {
    const rivit = u.filter(([k]) => k.split('.')[0] === ry); if (!rivit.length) continue;
    const bA = s.indexOf('\n    ' + ry + ': {\n', svA), bE = s.indexOf('\n    },', bA);
    if (svA < 0 || bA < 0 || bA > svE || bE < 0) { virheet.push('tm_lang sv.' + ry + ' -lohkoa ei löydy'); continue; }
    const uusi = lisaaRiville(s, bA, bE, '\n      ' + ANKKURI[ry] + ':', rivit.map(([k, sv]) => k.split('.')[1] + ': ' + q(sv) + ',').join(' '));
    if (!uusi) { virheet.push('tm_lang sv.' + ry + ': ankkuririviä ei löydy yksiselitteisesti'); continue; }
    s = uusi;
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const vL = lataaLang(s);   // verifiointi: ladataan uudelleen ja verrataan merkki merkiltä
  for (const [k, sv] of u) { const [ry, a] = k.split('.'); if (!vL.sv[ry] || vL.sv[ry][a] !== sv) virheet.push('verifiointi tm_lang ' + k); }
  if (s.split('\n').length !== lue(F).split('\n').length) virheet.push('tm_lang: rivimäärä muuttui (rivikatto)');
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && u.length) fs.writeFileSync(path.join(juuri, F), s);
  return { virheet, lisatty: u.length, ohitettu, kirjoitettu: !!(opts.kirjoita && u.length) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
