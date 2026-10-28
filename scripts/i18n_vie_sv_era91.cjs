#!/usr/bin/env node
/* sv-erä 91 (sv-aukot kohdat 10–15, PM 28.10.2026) — VIENTI koodiin. 3 osiota / 17 riviä: tm_kt_polku (kausi + domeeni) 6 · tm_vp_koti_palsta (tapahtumatyypit) 9 · tm_vp_navi 2.
   Lisäksi PM:n tarkistus erän 19 viennistä (_pm_era19_tarkistus.korjaukset, 3 riviä): arvo KORVATAAN erän 19 lohkossa (scripts/i18n_vie_sv_era19_vp_koti.cjs), ei lisätä uutta riviä.
   Lähde: docs/i18n/sv_kaannoserae_91_palautus.json (PM:n kirjoittama). Kaista: Tero. → lib/tm_lib_i18n.js sv-kartan loppuun (ennen mv_pohjat-merkkiä).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Sama malli kuin scripts/i18n_vie_sv_era90.cjs. Ajo: node scripts/i18n_vie_sv_era91.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_91_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_91_gemini.json';
const OSIOT = { 'lib.tm_kt_polku': 'lib/tm_kt_polku.js', 'lib.tm_vp_koti_palsta': 'lib/tm_vp_koti_palsta.js', 'lib.tm_vp_navi': 'lib/tm_vp_navi.js' };
const ERA19_OTSIKKO = '      // ── sv-aukot k15: VP Koti + navi (Gemini erä 19';
const VP_LIBIT = ['lib/tm_vp_koti.js', 'lib/tm_vp_koti_palsta.js', 'lib/tm_vp_navi.js'];

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [], korjattu = [];
  const PJ = JSON.parse(lue(PALAUTUS)), P = PJ.osiot, G = JSON.parse(lue(LAHETYS)).osiot;
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
  // PM:n korjaukset erän 19 lohkoon: avaimen on oltava lohkossa tasan kerran; arvo korvataan paikallaan
  const KORJ = (PJ._pm_era19_tarkistus && PJ._pm_era19_tarkistus.korjaukset) || {}, FIVP = {};
  for (const l of VP_LIBIT) Object.assign(FIVP, require(path.join(juuri, l)).FI);
  const a = sLib.indexOf(ERA19_OTSIKKO), b = a < 0 ? -1 : sLib.indexOf('\n      // ──', a + 1);
  if (a < 0 || b < 0) virheet.push('erän 19 lohkoa ei löydy');
  else {
    let lohko = sLib.slice(a, b);
    for (const [k, sv] of Object.entries(KORJ)) {
      if (!(k in FIVP)) { virheet.push('korjaus ' + k + ': ei VP Kodin FI-avain'); continue; }
      const syy = sopii(FIVP[k], sv); if (syy) { virheet.push('korjaus ' + k + ': ' + syy); continue; }
      const alku = '\n      ' + q(k) + ': ', i = lohko.indexOf(alku);
      if (i < 0 || lohko.indexOf(alku, i + 1) >= 0) { virheet.push('korjaus ' + k + ': ei tasan kerran erän 19 lohkossa'); continue; }
      const j = lohko.indexOf('\n', i + 1), rivi = '\n      ' + q(k) + ': ' + q(sv) + ',';
      if (lohko.slice(i, j) === rivi) { ohitettu.push(k); continue; }
      lohko = lohko.slice(0, i) + rivi + lohko.slice(j); korjattu.push(k);
    }
    sLib = sLib.slice(0, a) + lohko + sLib.slice(b);
  }
  if (virheet.length) return { virheet, lisatty: 0, korjattu: [], ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 91 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era91.cjs) ── sv-aukot k10–15: Polun kausi + domeeni, Kodin palstan tapahtumatyypit, navi\n'
      + uudet.map(([k, sv]) => '      ' + q(k) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const vl = lataaSv(sLib, 'TM_LIB_I18N');
  for (const [k, sv] of uudet) if (vl[k] !== sv) virheet.push('verifiointi lib ' + k);
  for (const [k, sv] of Object.entries(KORJ)) if (vl[k] !== sv) virheet.push('verifiointi korjaus ' + k);
  if (virheet.length) return { virheet, lisatty: 0, korjattu: [], ohitettu, kirjoitettu: false };
  const muuttui = uudet.length + korjattu.length > 0;
  if (opts.kirjoita && muuttui) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, korjattu, ohitettu, kirjoitettu: !!(opts.kirjoita && muuttui) };
}
module.exports = { vie, PALAUTUS };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ lisatty: t.lisatty, korjattu: t.korjattu.length, ohitettu: t.ohitettu.length, kirjoitettu: t.kirjoitettu }));
}
