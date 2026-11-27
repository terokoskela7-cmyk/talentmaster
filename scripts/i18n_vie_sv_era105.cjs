#!/usr/bin/env node
/* sv-erä 105 (Päivän harjoite PR E, Polku-rivi "Omatoiminen tällä viikolla"; PM 21.11.2026): 5 riviä → VIENTI koodiin. Kohde lib/tm_lib_i18n.js TM_LIB_I18N.sv (lib-avain ktp_omat*).
   Lähde: docs/i18n/sv_kaannoserae_105_palautus.json (PM) ↔ docs/i18n/sv_kaannoserae_105_gemini.json (lähetetty erä, osio lib.tm_kt_polku). fi = lib/tm_kt_polku.js FI.
   Code EI kirjoita ruotsia (§0): jokainen kartan sv on PM:n rivi merkki merkiltä. Paikkamerkit ({osa}, {harjoite}, {seura}) säilyvät.
   Idempotentti; virhe → mitään ei kirjoiteta. Ajo: node scripts/i18n_vie_sv_era105.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_105_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_105_gemini.json', OSIO = 'lib.tm_kt_polku';
const KARTTA = 'lib/tm_lib_i18n.js', NIMI = 'TM_LIB_I18N', FI_LIB = 'lib/tm_kt_polku.js', MARKKERI = '      // ── tm_mediaviesti.kysymyspohjat';
const OTSAKE = 'sv-käännöserä 105 (PM 21.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era105.cjs) — Päivän harjoite PR E: Polku-rivi "Omatoiminen tällä viikolla"';
const merkit = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  if (JSON.stringify(Object.keys(P)) !== '["' + OSIO + '"]' || JSON.stringify(Object.keys(G)) !== '["' + OSIO + '"]') return { virheet: ['osiot ≠ [' + OSIO + ']'], lisatty: 0, ohitettu, kirjoitettu: false };
  const PR = P[OSIO].rivit, GR = G[OSIO].rivit;
  if (JSON.stringify(Object.keys(PR).sort()) !== JSON.stringify(Object.keys(GR).sort())) virheet.push('avaimet ≠ lähetetty erä');
  const FI = require(path.join(juuri, FI_LIB)).FI, src = lue(KARTTA), ol = lataaSv(src, NIMI), uudet = [];
  for (const [k, r] of Object.entries(PR)) {
    const g = GR[k] || {};
    if (r.fi !== g.fi || r.fi !== FI[k]) { virheet.push(k + ': fi ≠ koodi / lähetetty erä'); continue; }
    if (g.sv !== '') { virheet.push(k + ': lähetetty sv ei tyhjä'); continue; }
    if (typeof r.sv !== 'string' || !r.sv.trim()) { virheet.push(k + ': sv puuttuu'); continue; }
    if (merkit(r.fi) !== merkit(r.sv)) { virheet.push(k + ': paikkamerkit eroavat (' + merkit(r.fi) + ' ≠ ' + merkit(r.sv) + ')'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo kartassa eri sv:llä (' + ol[k] + ')'); continue; }
    uudet.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  let uusi = src;
  if (uudet.length) {
    const i = src.indexOf(MARKKERI); if (i < 0) return { virheet: ['kartan lisäyskohtaa (mediaviesti-markkeri) ei löydy'], lisatty: 0, ohitettu, kirjoitettu: false };
    uusi = src.slice(0, i) + '      // ── ' + OTSAKE + '\n' + uudet.map(([k, sv]) => '      ' + q(k) + ': ' + q(sv) + ',').join('\n') + '\n' + src.slice(i);
  }
  const V = lataaSv(uusi, NIMI); for (const [k, sv] of uudet) if (V[k] !== sv) virheet.push('verifiointi: ' + k);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const kirjoita = !!(opts.kirjoita && uudet.length); if (kirjoita) fs.writeFileSync(path.join(juuri, KARTTA), uusi);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: kirjoita };
}
module.exports = { vie, PALAUTUS, LAHETYS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ lisatty: t.lisatty, ohitettu: t.ohitettu, kirjoitettu: t.kirjoitettu }));
}
