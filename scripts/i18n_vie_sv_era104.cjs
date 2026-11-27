#!/usr/bin/env node
/* sv-erä 104 (sähköpostin vaihto, Google-tunnus, #1290; PM 14.11.2026): 1 rivi → VIENTI koodiin. Kohde lib/tm_henkilosto_i18n.js (tmHT, avain = fi-teksti).
   Lähde: docs/i18n/sv_kaannoserae_104_palautus.json (PM) ↔ docs/i18n/sv_kaannoserae_104_gemini.json (lähetetty erä, osio henkilosto_kartta). Kaista: Tero.
   Code EI kirjoita ruotsia (§0): jokainen kartan sv on PM:n rivi merkki merkiltä. Avaimet ovat jo erässä malleja ({x}), joten ne viedään sellaisinaan;
   PM:n sv:ssä on oltava samat paikkamerkit. Jokaisen avaimen on oltava koodissa lainausmerkeissä (reititys) tai KOODISSA-katkelmana (data-avain
   tai koottu avain). Idempotentti; virhe → mitään ei kirjoiteta. Ajo: node scripts/i18n_vie_sv_era104.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan } = require('./i18n_vie_sv_era53_19.cjs');
const { lueKuori } = require('./kuoren_lahde.js');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_104_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_104_gemini.json', OSIO = 'henkilosto_kartta';
const KARTTA = 'lib/tm_henkilosto_i18n.js', NIMI = 'TM_HENKILOSTO_I18N';
const LAHTEET = ['seura/seura_hallinta.js'];
const OTSAKE = 'sv-käännöserä 104 (PM 14.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era104.cjs) — Seura: sähköpostin vaihto, Google-tunnus (#1290)';
/* Avaimet, joita ei ole koodissa yhtenä literaalina. Erä 104: tyhjä — jokainen avain on seura/seura_hallinta.js:ssä lainausmerkeissä (tmHT('…')). */
const KOODISSA = {};
const merkit = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(',');

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  if (JSON.stringify(Object.keys(P)) !== '["' + OSIO + '"]' || JSON.stringify(Object.keys(G)) !== '["' + OSIO + '"]') return { virheet: ['osiot ≠ [' + OSIO + ']'], lisatty: 0, ohitettu, kirjoitettu: false };
  const PR = P[OSIO].rivit, GR = G[OSIO].rivit;
  if (JSON.stringify(Object.keys(PR).sort()) !== JSON.stringify(Object.keys(GR).sort())) virheet.push('avaimet ≠ lähetetty erä');
  const src = lue(KARTTA), ol = lataaSv(src, NIMI), common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
  const koodi = LAHTEET.map((f) => (f.endsWith('.html') ? lueKuori(f, juuri) : lue(f))).join('\n');
  const uudet = [];
  for (const [k, r] of Object.entries(PR)) {
    const g = GR[k] || {};
    if (r.fi !== k || g.fi !== k || g.sv !== '') { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
    if (typeof r.sv !== 'string' || !r.sv.trim()) { virheet.push(k + ': sv puuttuu'); continue; }
    if (merkit(k) !== merkit(r.sv)) { virheet.push(k + ': paikkamerkit eroavat (' + merkit(k) + ' ≠ ' + merkit(r.sv) + ')'); continue; }
    const syy = sopii(k, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    const kd = KOODISSA[k];
    if (kd ? !koodi.includes(kd) : (!koodi.includes("'" + k + "'") && !koodi.includes('"' + k + '"'))) { virheet.push(k + ': avainta ei reititetty koodissa'); continue; }
    if (typeof common[k] === 'string') { if (common[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': yhteinen kartta antaa eri sv:n (' + common[k] + ')'); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo kartassa eri sv:llä (' + ol[k] + ')'); continue; }
    uudet.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const uusi = uudet.length ? lisaaKarttaan(src, uudet, OTSAKE) : src, V = lataaSv(uusi, NIMI);
  for (const [k, sv] of uudet) if (V[k] !== sv) virheet.push('verifiointi: ' + k);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const kirjoita = !!(opts.kirjoita && uudet.length); if (kirjoita) fs.writeFileSync(path.join(juuri, KARTTA), uusi);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: kirjoita };
}
module.exports = { vie, KOODISSA, PALAUTUS, LAHETYS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ lisatty: t.lisatty, ohitettu: t.ohitettu, kirjoitettu: t.kirjoitettu }));
}
