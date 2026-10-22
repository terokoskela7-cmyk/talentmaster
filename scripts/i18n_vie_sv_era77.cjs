#!/usr/bin/env node
/* sv-erä 77 (K1b-jatko: Tämän viikon fokus, 3 riviä, PM 20.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_77_palautus.json (PM:n kirjoittama ja tarkistama). Kaista: Tero.
   lib.tm_kt_havainto (2) + lib.tm_tanaan_kentta (1) → lib/tm_lib_i18n.js sv-kartan loppuun (ennen mv_pohjat-merkkiä). Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Ajo: node scripts/i18n_vie_sv_era77.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_77_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_77_gemini.json';
const OSIOT = { 'lib.tm_kt_havainto': 'lib/tm_kt_havainto.js', 'lib.tm_tanaan_kentta': 'lib/tm_tanaan_kentta.js' };

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N');
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(OSIOT).sort()) || JSON.stringify(Object.keys(G).sort()) !== JSON.stringify(Object.keys(OSIOT).sort())) virheet.push('osiot ≠ odotetut');
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  for (const [osio, tiedosto] of Object.entries(OSIOT)) {
    const TX = require(path.join(juuri, tiedosto)), PR = P[osio].rivit, GR = G[osio].rivit;
    if (JSON.stringify(Object.keys(PR).sort()) !== JSON.stringify(Object.keys(GR).sort())) { virheet.push(osio + ': avaimet ≠ lähetetty erä'); continue; }
    for (const [k, r] of Object.entries(PR)) {
      if (r.fi !== TX.FI[k]) { virheet.push(k + ': fi ei vastaa koodin lähdettä'); continue; }
      if (r.fi !== GR[k].fi) { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
      if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
      uudet.push([k, r.sv]);
    }
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 77 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era77.cjs) ── K1b-jatko: Tämän viikon fokus (kt_viikon_fokus*, k1_talla_viikolla)\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const u = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const muuttui = uudet.length > 0;
  if (opts.kirjoita && muuttui) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && muuttui) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
