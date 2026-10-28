#!/usr/bin/env node
/* sv-aukot kohta 15 (PM 28.10.2026): VP Kodin ja navin tekstit, joille Gemini palautti sv:n jo erässä 19 (docs/i18n/sv_kaannoserae_19_palautus.json,
   osiot lib.tm_vp_koti + lib.tm_vp_navi; samat fi-tekstit myös osioista lib.tm_seuran_pulssi / lib.tm_vp_tilanne(_harva), joista Kodin koodi siirrettiin) mutta joita ei koskaan viety koodiin (era19-vie kirjoitti vain erätiedostoihin; scripts/i18n_vie_sv_era53_19.cjs vei vain vp_kartta-rivit).
   Lisäksi 'Showcase' erän 54 palautuksesta (master_kartta; VP ei lataa Masterin karttaa). Kaista: Tero. → lib/tm_lib_i18n.js sv-kartan loppuun (ennen mv_pohjat-merkkiä).
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä, vain kun palautuksen fi = libin nykyinen FI-teksti; vienti VERIFIOIDAAN lataamalla kartta uudelleen.
   Idempotentti; virhe → ei kirjoiteta mitään. Sama malli kuin scripts/i18n_vie_sv_era90.cjs. Ajo: node scripts/i18n_vie_sv_era19_vp_koti.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const LAHTEET = [['docs/i18n/sv_kaannoserae_19_palautus.json', ['lib.tm_vp_koti', 'lib.tm_vp_navi', 'lib.tm_seuran_pulssi', 'lib.tm_vp_tilanne', 'lib.tm_vp_tilanne_harva']], ['docs/i18n/sv_kaannoserae_54_palautus.json', ['master_kartta']]];
const LIBIT = ['lib/tm_vp_koti.js', 'lib/tm_vp_koti_palsta.js', 'lib/tm_vp_navi.js'];
/* PM tarkisti 121 riviä 28.10.2026: 3 korjausta (docs/i18n/sv_kaannoserae_91_palautus.json _pm_era19_tarkistus.korjaukset) korvasivat arvon tässä lohkossa (scripts/i18n_vie_sv_era91.cjs) → korjattu arvo hyväksytään koodissa. */
const KORJAUKSET_TIEDOSTO = 'docs/i18n/sv_kaannoserae_91_palautus.json';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [];
  const FI = {}; for (const l of LIBIT) Object.assign(FI, require(path.join(juuri, l)).FI);
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N'), nahty = new Set();
  let KORJ = {}; try { KORJ = (JSON.parse(lue(KORJAUKSET_TIEDOSTO))._pm_era19_tarkistus || {}).korjaukset || {}; } catch (e) { KORJ = {}; }
  for (const [tiedosto, osiot] of LAHTEET) {
    const P = JSON.parse(lue(tiedosto)).osiot;
    for (const o of osiot) {
      if (!P[o]) { virheet.push(tiedosto + ': osio puuttuu ' + o); continue; }
      for (const [k, r] of Object.entries(P[o].rivit)) {
        if (!(k in FI)) continue;
        if (nahty.has(k)) { if (uudet.concat(ohitettu.map((x) => [x, ol[x]])).some(([a, sv]) => a === k && sv !== r.sv)) virheet.push(k + ': eri sv eri osioissa (' + o + ')'); continue; }   // vain tämän PR:n FI-karttojen avaimet; muut rivit on jo viety muualle
        if (r.fi !== FI[k]) { virheet.push(k + ': palautuksen fi ≠ libin FI'); continue; }
        if (typeof r.sv !== 'string' || !r.sv.trim()) continue;
        const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
        nahty.add(k);
        if (typeof ol[k] === 'string') { if (ol[k] === r.sv || (KORJ[k] != null && ol[k] === KORJ[k])) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
        uudet.push([k, r.sv]);
      }
    }
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-aukot k15: VP Koti + navi (Gemini erä 19 + Showcase erä 54; vienti scripts/i18n_vie_sv_era19_vp_koti.cjs) ──\n'
      + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  const vl = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (vl[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (opts.kirjoita && uudet.length) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  return { virheet, lisatty: uudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && uudet.length), avaimet: uudet.map((x) => x[0]).concat(ohitettu) };
}
module.exports = { vie, LAHTEET, KORJAUKSET_TIEDOSTO };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify({ lisatty: t.lisatty, ohitettu: t.ohitettu.length, kirjoitettu: t.kirjoitettu }));
}
