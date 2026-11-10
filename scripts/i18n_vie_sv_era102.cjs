#!/usr/bin/env node
/* sv-erä 102 (VP:n Kenttä-näkymän vierekkäiset tekstit, #1245; PM 10.11.2026): 55 riviä → VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_102_palautus.json (PM) ↔ docs/i18n/sv_kaannoserae_102_gemini.json (lähetetty erä, osio vp_kentta_b).
   Kaista: Tero. Code EI kirjoita ruotsia (§0): jokainen kartan sv on PM:n rivi merkki merkiltä (avain = koodin reititinliteraali, ei paloittelua). Kohteet:
   · rivit 'Valakyykky', 'Askelkyykky', 'Hyvää huomenta', 'Etunojapunnerrus' (liikkuvuusliikkeet; PM: lisää lukittuun sanastoon) → lib/tm_i18n_common.js TM_I18N_COMMON.sv
   · muut 51 riviä → lib/tm_vp_i18n.js TM_VP_I18N.sv (vpT; kypsyyskortti ja kehityskaari kutsuvat vpT:tä)
   · konseptien nimet (PM: yhtenäistä): lib/tm_lib_i18n.js sn_y_h0…sn_y_h9 = MASTER-sidecarin 'y_hN.nimi' normaalilla kirjoitusasulla (ensimmäinen kirjain iso, loput pienellä; sama muunnos kuin VP:n _vpKonseptiNimiNimella) — mekaaninen johdos, ei uutta ruotsia.
   Idempotentti; virhe → mitään ei kirjoiteta. Ajo: node scripts/i18n_vie_sv_era102.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_102_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_102_gemini.json', OSIO = 'vp_kentta_b', MASTER = 'docs/i18n/curriculum_kaannettava.sv.MASTER.json';
const COMMON_FI = ['Valakyykky', 'Askelkyykky', 'Hyvää huomenta', 'Etunojapunnerrus'];
const KONSEPTIT = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ['sn_y_h' + n, 'y_h' + n + '.nimi']);
const otsake = 'sv-käännöserä 102 (PM 10.11.2026; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era102.cjs) — VP Kenttä-näkymän vierekkäiset tekstit (#1245)';
const normaali = (s) => (s === s.toUpperCase() && s !== s.toLowerCase() ? s.charAt(0) + s.slice(1).toLowerCase() : s);   // = _vpKonseptiNimiNimella (P1.2)

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const ei = (v) => ({ virheet: v, lisatty: 0, ohitettu, kirjoitettu: false });
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  if (JSON.stringify(Object.keys(P)) !== '["' + OSIO + '"]' || JSON.stringify(Object.keys(G)) !== '["' + OSIO + '"]') return ei(['osiot ≠ [' + OSIO + ']']);
  const PR = P[OSIO].rivit, GR = G[OSIO].rivit;
  if (JSON.stringify(Object.keys(PR).sort()) !== JSON.stringify(Object.keys(GR).sort())) virheet.push('avaimet ≠ lähetetty erä');
  let sVp = lue('lib/tm_vp_i18n.js'), sCm = lue('lib/tm_i18n_common.js'), sLib = lue('lib/tm_lib_i18n.js');
  const common = lataaSv(sCm, 'TM_I18N_COMMON'), vp = lataaSv(sVp, 'TM_VP_I18N'), lib = lataaSv(sLib, 'TM_LIB_I18N');
  const vpUudet = [], cmUudet = [];
  for (const [k, r] of Object.entries(PR)) {
    const g = GR[k] || {};
    if (r.fi !== k || g.fi !== k || g.sv !== '') { virheet.push(k + ': fi ≠ lähetetty erä'); continue; }
    const syy = sopii(k, r.sv); if (syy) { virheet.push(k + ': ' + syy); continue; }
    const ol = typeof common[k] === 'string' ? common[k] : vp[k];   // vpT-järjestys: common → VP
    if (typeof ol === 'string') { if (ol === r.sv) ohitettu.push(k); else virheet.push(k + ': kartassa jo eri sv (' + ol + ') ≠ PM (' + r.sv + ') — PM päättää'); continue; }
    (COMMON_FI.includes(k) ? cmUudet : vpUudet).push([k, r.sv]);
  }
  for (const k of COMMON_FI) if (!PR[k]) virheet.push(k + ': puuttuu palautuksesta');
  // konseptien nimet: lib-sanasto = MASTER normaalilla kirjoitusasulla
  const M = JSON.parse(lue(MASTER)), konsMuutokset = [];
  for (const [avain, mk] of KONSEPTIT) {
    if (typeof M[mk] !== 'string') { virheet.push(mk + ': ei MASTER-sidecarissa'); continue; }
    const uusi = normaali(M[mk]); if (lib[avain] === uusi) continue;
    const vanha = '      ' + q(avain) + ': ' + q(lib[avain]) + ',';
    if (typeof lib[avain] !== 'string' || !sLib.includes(vanha)) { virheet.push(avain + ': riviä ei löydy tm_lib_i18n.js:stä'); continue; }
    konsMuutokset.push([avain, vanha, uusi]);
  }
  if (virheet.length) return ei(virheet);
  if (vpUudet.length) sVp = lisaaKarttaan(sVp, vpUudet, otsake);
  if (cmUudet.length) {
    const a = sCm.indexOf('\n  sv: {'), b = sCm.indexOf('\n  en: {', a), loppu = sCm.lastIndexOf('\n  },', b); if (a < 0 || b < 0 || loppu < a) return ei(['common sv-lohkoa ei löydy']);
    sCm = sCm.slice(0, loppu) + '\n    // ' + otsake + ': liikkuvuusliikkeet (lukittu sanasto)\n' + cmUudet.map(([x, y]) => '    ' + q(x) + ': ' + q(y) + ',').join('\n') + sCm.slice(loppu);
  }
  for (const [avain, vanha, uusi] of konsMuutokset) sLib = sLib.replace(vanha, '      ' + q(avain) + ': ' + q(uusi) + ',');
  const vl = lataaSv(sVp, 'TM_VP_I18N'), cl = lataaSv(sCm, 'TM_I18N_COMMON'), ll = lataaSv(sLib, 'TM_LIB_I18N');
  for (const [a, sv] of vpUudet) if (vl[a] !== sv) virheet.push('verifiointi VP ' + a);
  for (const [a, sv] of cmUudet) if (cl[a] !== sv) virheet.push('verifiointi common ' + a);
  for (const [avain, , uusi] of konsMuutokset) if (ll[avain] !== uusi) virheet.push('verifiointi lib ' + avain);
  if (virheet.length) return ei(virheet);
  const kirjoita = !!(opts.kirjoita && (vpUudet.length || cmUudet.length || konsMuutokset.length));
  if (kirjoita) { fs.writeFileSync(path.join(juuri, 'lib/tm_vp_i18n.js'), sVp); fs.writeFileSync(path.join(juuri, 'lib/tm_i18n_common.js'), sCm); fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib); }
  return { virheet, lisatty: vpUudet.length + cmUudet.length, vp: vpUudet.length, common: cmUudet.length, konseptit: konsMuutokset.map((x) => x[0]), ohitettu, kirjoitettu: kirjoita };
}
module.exports = { vie, PALAUTUS, LAHETYS, KONSEPTIT, COMMON_FI, normaali };
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t, null, 1));
}
