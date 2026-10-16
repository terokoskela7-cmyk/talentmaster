#!/usr/bin/env node
/* sv-erä 59 (Pikakortti design + pelaajakortin unelma 16.10.) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_59_palautus.json. Kaista: Tero.
   henkilosto_kartta (2: "Harjoitusvinkki:", "Harjoitusvinkki ▾") → lib/tm_henkilosto_i18n.js sv-kartan loppuun;
   lib.pelaajakortti_unelma (11: hahmonimet Viimeistelijä/Velho/Arkkitehti + 8 viikon teemaa, avain = fi-teksti) → lib/tm_lib_i18n.js sv-kartan loppuun (mv_pohjat-merkin edelle).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen; fi täsmätään lähetettyyn erään ja koodin lähteisiin
   (Pikakortin tmHT-avaimet, lib/tm-microcycles.js IDOLIT + NIMIKKO_VIIKOT). Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era59.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_59_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_59_gemini.json';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  const MC = (() => { const m = require(path.join(juuri, 'lib/tm-microcycles.js')); return (m.TM && m.TM.microcycles) || {}; })();
  const koodinUnelma = new Set((MC.NIMIKKO_VIIKOT || []).map((v) => v.teema)); ['Viimeistelijä', 'Velho', 'Arkkitehti'].forEach((n) => koodinUnelma.add(n));
  let sLib = lue('lib/tm_lib_i18n.js'), sHe = lue('lib/tm_henkilosto_i18n.js');
  const olLib = lataaSv(sLib, 'TM_LIB_I18N'), olHe = lataaSv(sHe, 'TM_HENKILOSTO_I18N'), libU = [], heU = [];
  for (const osio of ['henkilosto_kartta', 'lib.pelaajakortti_unelma']) {
    if (!P[osio]) { virheet.push('osio puuttuu palautuksesta: ' + osio); continue; }
    if (JSON.stringify(Object.keys(P[osio].rivit).sort()) !== JSON.stringify(Object.keys(G[osio].rivit).sort())) virheet.push(osio + ': avaimet ≠ lähetetty erä');
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const kasittele = (osio, k, r, ol, lista, fiOk) => {
    if (r.fi !== k || r.fi !== G[osio].rivit[k].fi || !fiOk) { virheet.push(osio + ' ' + k + ': fi ei vastaa lähetettyä erää/koodin lähdettä'); return; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(osio + ' ' + k + ': ' + syy); return; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(osio + ' ' + k + ': jo koodissa eri sv:llä'); return; }
    lista.push([k, r.sv]);
  };
  const SIVU = lue('TalentMaster_ADAR_Pikakortti.html');
  for (const [k, r] of Object.entries(P.henkilosto_kartta.rivit)) kasittele('henkilosto_kartta', k, r, olHe, heU, SIVU.includes("tmHT('" + k + "')"));
  for (const [k, r] of Object.entries(P['lib.pelaajakortti_unelma'].rivit)) kasittele('lib.pelaajakortti_unelma', k, r, olLib, libU, koodinUnelma.has(k));
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (heU.length) sHe = lisaaKarttaan(sHe, heU, '── sv-käännöserä 59 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era59.cjs): Pikakortin harjoitusvinkki ──');
  if (libU.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 59 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era59.cjs) ── pelaajakortin unelma-rivi: hahmonimet + viikon teemat\n' + libU.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const uLib = lataaSv(sLib, 'TM_LIB_I18N'), uHe = lataaSv(sHe, 'TM_HENKILOSTO_I18N');
  for (const [a, sv] of libU) if (uLib[a] !== sv) virheet.push('verifiointi lib ' + a);
  for (const [a, sv] of heU) if (uHe[a] !== sv) virheet.push('verifiointi henkilosto ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const n = libU.length + heU.length;
  if (opts.kirjoita && n) { fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib); fs.writeFileSync(path.join(juuri, 'lib/tm_henkilosto_i18n.js'), sHe); }
  return { virheet, lisatty: n, ohitettu, kirjoitettu: !!(opts.kirjoita && n), lib: libU.length, henkilosto: heU.length };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
