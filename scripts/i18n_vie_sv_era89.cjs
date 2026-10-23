#!/usr/bin/env node
/* sv-erä 89 (K4e: Profiilin Psyykkinen (D3) -kortti + D3-modaali [lib.tm_d3_kortti, d3k_*, 23 riviä] ja Pelaajaraportti vaihe A [lib.tm_pelaajaraportti, pr_*, 45 riviä], 23.10.2026) — VIENTI koodiin.
   Lähde: docs/i18n/sv_kaannoserae_89_palautus.json (PM:n kirjoittama; 68 riviä). Kaista: Tero. Molemmat osiot → lib/tm_lib_i18n.js sv-kartan loppuun (ennen mv_pohjat-merkkiä).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Tarkistukset riveittäin: fi = libin FI = lähetetty erä; sv ei tyhjä; paikkamerkit, HTML-tagit ja alku-/loppuvälilyönti säilyvät (sopii()).
   Ajo: node scripts/i18n_vie_sv_era89.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_89_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_89_gemini.json';
const OSIOT = { 'lib.tm_d3_kortti': 'lib/tm_d3_kortti.js', 'lib.tm_pelaajaraportti': 'lib/tm_pelaajaraportti.js' };

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
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 89 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era89.cjs) ── K4e: Psyykkinen (D3) -kortti + D3-modaali (d3k_*) ja Pelaajaraportti vaihe A (pr_*)\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
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
