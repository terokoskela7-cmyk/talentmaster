#!/usr/bin/env node
/* sv-erä 88 (K4d: Fyysinen-kortin profiilitulkinta, 22.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_88_palautus.json (PM:n kirjoittama, Teron hyväksymä; 5 riviä: lib.tm_todistekortit 4 + vp_kartta 1). Kaista: Tero.
   lib.tm_todistekortit (tc_*) → lib/tm_lib_i18n.js sv-kartan loppuun. Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartta uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   PM 22.10.: tc_fy_tulk_* -rivillä `fi_pm` = lopullinen (yhden virkkeen) suomenkielinen teksti; koodin FI vastaa sitä, ei `fi`-kenttää.
   vp_kartta-rivi → lib/tm_vp_i18n.js: vanha (orpo) sv-rivi korvataan uudella samassa kohdassa (PM pyysi poistoa).
   Ajo: node scripts/i18n_vie_sv_era88.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_88_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_88_gemini.json';
const OSIO = 'lib.tm_todistekortit', TIEDOSTO = 'lib/tm_todistekortit.js';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [], uudet = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot[OSIO].rivit, G = JSON.parse(lue(LAHETYS)).osiot[OSIO].rivit, TX = require(path.join(juuri, TIEDOSTO));
  let sLib = lue('lib/tm_lib_i18n.js'); const ol = lataaSv(sLib, 'TM_LIB_I18N');
  if (JSON.stringify(Object.keys(P).sort()) !== JSON.stringify(Object.keys(G).sort())) virheet.push('avaimet ≠ lähetetty erä');
  for (const [k, r] of Object.entries(P)) {
    const fi = r.fi_pm || r.fi;
    if (fi !== TX.FI[k]) { virheet.push(k + ': fi ei vastaa koodin lähdettä'); continue; }
    if (!r.fi_pm && r.fi !== (G[k] || {}).fi) { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
    const syy = sopii(fi, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    if (typeof ol[k] === 'string') { if (ol[k] === r.sv) ohitettu.push(k); else virheet.push(k + ': jo koodissa eri sv:llä'); continue; }
    uudet.push([k, r.sv]);
  }
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  if (uudet.length) {
    const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy');
    sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 81 (PM; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era88.cjs) ── K4d: Fyysinen-kortin profiilitulkinta (tc_fy_tulk_*)\n' + uudet.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i);
  }
  // vp_kartta (CMJ-ⓘ-vinkki): koodin fi = VP_v25:n TM_TESTI_OHJEET.cmj.vinkki; vanha sv-rivi (VP_VANHA) korvataan
  const VP_VANHA = 'Matala CMJ + matala nopeus → voimaharjoittelu. Korkea CMJ + matala nopeus → juoksutekniikka / nopeusharjoittelu.';
  const PV = JSON.parse(lue(PALAUTUS)).osiot.vp_kartta.rivit, GV = JSON.parse(lue(LAHETYS)).osiot.vp_kartta.rivit;
  if (JSON.stringify(Object.keys(PV).sort()) !== JSON.stringify(Object.keys(GV).sort())) virheet.push('vp_kartta: avaimet ≠ lähetetty erä');
  let sVp = lue('lib/tm_vp_i18n.js'); const ov = lataaSv(sVp, 'TM_VP_I18N'); const vpKoodi = (lue('TalentMaster_VP_v25.html').match(/cmj: \{ otsikko: 'Räjähtävyys · CMJ'[^\n]*?vinkki: '([^']*)'/) || [])[1]; const vpUudet = [];
  for (const [k, r] of Object.entries(PV)) {
    const fi = r.fi_pm || r.fi;
    if (fi !== k || fi !== vpKoodi) { virheet.push('vp_kartta: fi ei vastaa VP_v25:n koodia'); continue; }
    const syy = sopii(fi, r.sv); if (syy) { virheet.push('vp_kartta: ' + syy); continue; }
    if (typeof ov[k] === 'string') { if (ov[k] === r.sv) ohitettu.push('vp:' + k.slice(0, 20)); else virheet.push('vp_kartta: jo koodissa eri sv:llä'); continue; }
    vpUudet.push([k, r.sv]);
  }
  if (!virheet.length && vpUudet.length) {
    const rivit = sVp.split('\n'), i = rivit.findIndex((l) => l.indexOf(q(VP_VANHA) + ':') >= 0);
    if (i < 0) virheet.push('vp_kartta: vanhaa orpoa riviä ei löydy'); else rivit.splice(i, 1, ...vpUudet.map(([a, sv]) => '    ' + q(a) + ': ' + q(sv) + ','));
    sVp = rivit.join('\n');
  }
  if (!virheet.length) { const uv = lataaSv(sVp, 'TM_VP_I18N'); for (const [a, sv] of vpUudet) if (uv[a] !== sv) virheet.push('verifiointi vp ' + a); if (vpUudet.length && VP_VANHA in uv) virheet.push('vanha orpo vp-rivi ei poistunut'); }
  const u = lataaSv(sLib, 'TM_LIB_I18N'); for (const [a, sv] of uudet) if (u[a] !== sv) virheet.push('verifiointi lib ' + a);
  if (virheet.length) return { virheet, lisatty: 0, ohitettu, kirjoitettu: false };
  const muuttui = uudet.length > 0;
  if (opts.kirjoita && muuttui) fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib);
  if (opts.kirjoita && vpUudet.length) fs.writeFileSync(path.join(juuri, 'lib/tm_vp_i18n.js'), sVp);
  return { virheet, lisatty: uudet.length + vpUudet.length, ohitettu, kirjoitettu: !!(opts.kirjoita && (muuttui || vpUudet.length)) };
}
module.exports = { vie };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
