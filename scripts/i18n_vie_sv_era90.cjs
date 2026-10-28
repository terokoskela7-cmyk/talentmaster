#!/usr/bin/env node
/* sv-erä 90 (sv-aukot P7, .briefit/CODE_BRIEF_SV_AUKOT_P7.md, 28.10.2026) — VIENTI koodiin. 7 osiota / 110 riviä:
   kehityskaari kka_* 25 · kertymä 10 · kalenteritilaus 30 · idp_pelaaja ip_pl_* 35 · taman_tueksi 2 · kotiharjoitteet 4 · kentta 4.
   Lähde: docs/i18n/sv_kaannoserae_90_palautus.json (PM:n kirjoittama). Kaista: Tero. → lib/tm_lib_i18n.js sv-kartan loppuun (ennen mv_pohjat-merkkiä).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Sama malli kuin scripts/i18n_vie_sv_era89.cjs. Ajo: node scripts/i18n_vie_sv_era90.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_90_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_90_gemini.json';
const OSIOT = { 'lib.tm_kehityskaari': 'lib/tm_kehityskaari.js', 'lib.tm_harjoituskertyma_nakyma': 'lib/tm_harjoituskertyma_nakyma.js', 'lib.tm_kalenteri_tilaus_ui': 'lib/tm_kalenteri_tilaus_ui.js', 'lib.tm_idp_pelaaja': 'lib/tm_idp_pelaaja.js', 'lib.tm_taman_tueksi': 'lib/tm_taman_tueksi.js', 'lib.tm_kotiharjoitteet': 'lib/tm_kotiharjoitteet.js', 'lib.tm_kentta': 'lib/tm_kentta.js' };

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N');
  for (const [o, tiedosto] of Object.entries(OSIOT)) {
    if (!P[o] || !G[o]) { virheet.push('osio puuttuu: ' + o); continue; }
    if (JSON.stringify(Object.keys(P[o].rivit).sort()) !== JSON.stringify(Object.keys(G[o].rivit).sort())) { virheet.push(o + ': avaimet ≠ lähetetty erä'); continue; }
    const FI = require(path.join(juuri, tiedosto)).FI;
    for (const [k, r] of Object.entries(P[o].rivit)) {
      if (r.fi !== FI[k] || r.fi !== G[o].rivit[k].fi) { virheet.push(k + ': fi ≠ koodi / lähetetty erä'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
      if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
      uudet.push([k, r.sv]);
    }
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 90 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era90.cjs) ── sv-aukot P7: kehityskaari, kertymä, kalenteritilaus, idp_pelaaja, Tämän tueksi, kotiharjoitteet, Kenttä\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const vl = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (vl[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && uudet.length) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && uudet.length) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
