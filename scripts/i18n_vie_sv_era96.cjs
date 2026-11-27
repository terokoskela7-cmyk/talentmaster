#!/usr/bin/env node
/* sv-erä 96 (QG-1c: VP Läge oikean datan tiloissa + kielivartijan uudet löydöt, #1188; PM 5.11.2026) — VIENTI koodiin. 4 osiota / 52 riviä:
   vp.* → lib/tm_vp_i18n.js (vpT, avain = fi-teksti) · master.tm_kalenteri → lib/tm_master_i18n.js (masterT, avain = fi-teksti).
   Lähde: docs/i18n/sv_kaannoserae_96_palautus.json (PM:n kirjoittama). Kaista: Tero.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen; fi täsmätään lähetettyyn erään ja
   osion _lahde-tiedostoihin (teksti lainausmerkeissä koodissa). Idempotentti; virhe → ei kirjoiteta mitään. Sama malli kuin scripts/i18n_vie_sv_era92.cjs.
   Ajo: node scripts/i18n_vie_sv_era96.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_96_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_96_gemini.json';
const F = { vp: 'lib/tm_vp_i18n.js', master: 'lib/tm_master_i18n.js' }, NIMI = { vp: 'TM_VP_I18N', master: 'TM_MASTER_I18N' };
const KOHDE = (osio) => osio.startsWith('vp.') ? 'vp' : osio.startsWith('master.') ? 'master' : null;
const OTSAKE = 'sv-käännöserä 96 (PM 5.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era96.cjs) — QG-1c: VP Läge oikean datan tiloissa';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot || {}, G = JSON.parse(lue(LAHETYS)).osiot || {};
  const s = { vp: lue(F.vp), master: lue(F.master) }, ol = { vp: lataaSv(s.vp, NIMI.vp), master: lataaSv(s.master, NIMI.master) }, uudet = { vp: [], master: [] };
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(G).sort())) virheet.push('osiot ≠ lähetetty erä');
  for (const o of Object.keys(G)) {
    const k0 = KOHDE(o); if (!k0) { virheet.push('tuntematon kohde: ' + o); continue; }
    if (!P[o]) { virheet.push('osio puuttuu palautuksesta: ' + o); continue; }
    if (JSON.stringify(Object.keys(P[o].rivit).sort()) !== JSON.stringify(Object.keys(G[o].rivit).sort())) { virheet.push(o + ': avaimet ≠ lähetetty erä'); continue; }
    const lahde = String(G[o]._lahde || '').split(' · ').map((f) => lue(f)).join('\n');
    for (const [k, r] of Object.entries(P[o].rivit)) {
      const g = G[o].rivit[k];
      if (r.fi !== k || r.fi !== g.fi || g.sv !== '') { virheet.push(o + ' / ' + k + ': fi ≠ lähetetty erä'); continue; }
      if (!lahde.includes("'" + k + "'")) { virheet.push(o + ' / ' + k + ': fi-tekstiä ei löydy koodista (' + G[o]._lahde + ')'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(o + ' / ' + k + ': ' + syy); continue; }
      const nyt = ol[k0][k];
      if (typeof nyt === 'string') { if (nyt === r.sv) ohitettu.push(k); else virheet.push(o + ' / ' + k + ': jo koodissa eri sv:llä'); continue; }
      if (uudet[k0].some(([x]) => x === k)) { if (!uudet[k0].some(([x, y]) => x === k && y === r.sv)) virheet.push(k + ': sama avain kahdesti eri sv:llä'); continue; }
      uudet[k0].push([k, r.sv]);
    }
  }
  if (virheet.length) return { virheet, lisatty: {}, ohitettu, kirjoitettu: false };
  for (const k0 of ['vp', 'master']) if (uudet[k0].length) s[k0] = lisaaKarttaan(s[k0], uudet[k0], OTSAKE);
  for (const k0 of ['vp', 'master']) { const V = lataaSv(s[k0], NIMI[k0]); for (const [k, sv] of uudet[k0]) if (V[k] !== sv) virheet.push('verifiointi ' + k0 + ' / ' + k); }
  if (virheet.length) return { virheet, lisatty: {}, ohitettu, kirjoitettu: false };
  const lisatty = { vp: uudet.vp.length, master: uudet.master.length }, kirjoita = !!(opts.kirjoita && (lisatty.vp || lisatty.master));
  if (kirjoita) for (const k0 of ['vp', 'master']) if (uudet[k0].length) fs.writeFileSync(path.join(juuri, F[k0]), s[k0]);
  return { virheet, lisatty, ohitettu, kirjoitettu: kirjoita };
}
module.exports = { vie, PALAUTUS, LAHETYS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
