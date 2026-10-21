#!/usr/bin/env node
/* sv-erä 82 (Seura-tuonti: olemassa olevat pelaajat, monta sähköpostia, kutsuikkuna; 21.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_82_palautus.json. Kaista: Tero.
   henkilosto_kartta (30, avain = fi-teksti, Seuran tmHT-avaimet) → lib/tm_henkilosto_i18n.js sv-kartan loppuun.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen; fi täsmätään lähetettyyn erään.
   Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era82.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_82_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_82_gemini.json', OSIO = 'henkilosto_kartta';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  if (!P[OSIO]) return { virheet: ['osio puuttuu palautuksesta: ' + OSIO], lisatty: 0, ohitettu, kirjoitettu: false };
  if (JSON.stringify(Object.keys(P[OSIO].rivit).sort()) !== JSON.stringify(Object.keys(G[OSIO].rivit).sort())) return { virheet: [OSIO + ': avaimet ≠ lähetetty erä'], lisatty: 0, ohitettu, kirjoitettu: false };
  let sHe = lue('lib/tm_henkilosto_i18n.js'); const ol = lataaSv(sHe, 'TM_HENKILOSTO_I18N'), uudet = [];
  for (const [k, r] of Object.entries(P[OSIO].rivit)) {
    if (r.fi !== k || r.fi !== G[OSIO].rivit[k].fi) { virheet.push(k + ': fi ei vastaa lähetettyä erää'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    uudet.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) sHe = lisaaKarttaan(sHe, uudet, '── sv-käännöserä 82 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era82.cjs): Seura-tuonti ──');
  const u = lataaSv(sHe, 'TM_HENKILOSTO_I18N');
  for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi henkilosto ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && uudet.length) fs.writeFileSync(path.join(juuri, 'lib/tm_henkilosto_i18n.js'), sHe);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && uudet.length), henkilosto: uudet.length };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
