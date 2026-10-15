#!/usr/bin/env node
/* sv-erä 54 (Sibbo-reititys) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_54_palautus.json. Kaista: Tero.
   tm_lang (suostumus.*, 24) → lib/tm_lang.js sv-lohko · lib.tm_harjoitusarviointi (34, avain = fi) → TM_LIB_I18N · master_kartta (3) → TM_MASTER_I18N · vientipohja (4: kuittaus-aliakset + ohje_5v) → scripts/vientipohja_sv.json.
   Code EI kirjoita ruotsia (§0): arvot kopioidaan merkki merkiltä ja vienti VERIFIOIDAAN lataamalla kartat uudelleen. Idempotentti; virhe → ei kirjoiteta mitään. Ajo: node scripts/i18n_vie_sv_era54.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, lisaaKarttaan, q } = require('./i18n_vie_sv_era53_19.cjs');
const VK = require('./vientipohja_kieli.js');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_54_palautus.json';

function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], R = { lisatty: [], ohitettu: [] };
  const P = JSON.parse(lue(PALAUTUS)).osiot, common = lataaSv(lue('lib/tm_i18n_common.js'), 'TM_I18N_COMMON');
  let sLib = lue('lib/tm_lib_i18n.js'), sMa = lue('lib/tm_master_i18n.js'), sLang = lue('lib/tm_lang.js');
  const olLib = lataaSv(sLib, 'TM_LIB_I18N'), olMa = lataaSv(sMa, 'TM_MASTER_I18N');
  const L = require(path.join(juuri, 'lib/tm_lang.js')).TM_LANG, hae = (k, p) => p.split('.').reduce((o, x) => (o == null ? undefined : o[x]), L[k]);
  const libU = [], maU = [], langU = [], vpU = {};
  for (const [avain, r] of Object.entries(P.tm_lang.rivit)) {
    if (hae('fi', avain) !== r.fi) { virheet.push('tm_lang ' + avain + ': fi ei vastaa tm_lang.fi:tä'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push('tm_lang ' + avain + ': ' + syy); continue; }
    const nyk = hae('sv', avain); if (typeof nyk === 'string' && nyk) { if (nyk === r.sv) R.ohitettu.push(avain); else virheet.push('tm_lang ' + avain + ': jo koodissa eri sv:llä'); continue; }
    langU.push([avain.replace(/^suostumus\./, ''), r.sv]);
  }
  for (const [fi, r] of Object.entries(P['lib.tm_harjoitusarviointi'].rivit)) {
    if (r.fi !== fi) { virheet.push('lib.tm_harjoitusarviointi: avain ≠ fi: ' + fi); continue; }
    const syy = sopii(fi, r.sv); if (syy) { virheet.push('lib.tm_harjoitusarviointi ' + fi + ': ' + syy); continue; }
    if (typeof olLib[fi] === 'string') { if (olLib[fi] === r.sv) R.ohitettu.push(fi); else virheet.push('lib-avain jo koodissa eri sv:llä: ' + fi); continue; }
    libU.push([fi, r.sv]);
  }
  for (const [fi, r] of Object.entries(P.master_kartta.rivit)) {
    if (r.fi !== fi) { virheet.push('master_kartta: avain ≠ fi: ' + fi); continue; }
    const syy = sopii(fi, r.sv); if (syy) { virheet.push('master_kartta ' + fi + ': ' + syy); continue; }
    if (typeof common[fi] === 'string') { virheet.push('avain lukitussa yhteisessä glossaarissa: ' + fi); continue; }
    if (typeof olMa[fi] === 'string') { if (olMa[fi] === r.sv) R.ohitettu.push(fi); else virheet.push('Master-avain jo koodissa eri sv:llä: ' + fi); continue; }
    maU.push([fi, r.sv]);
  }
  const fiVp = VK.kaannettavat(), svNyk = JSON.parse(lue('scripts/vientipohja_sv.json'));
  for (const [id, r] of Object.entries(P.vientipohja.rivit)) {
    if (fiVp[id] !== r.fi) { virheet.push('vientipohja ' + id + ': fi ei vastaa kielitaulua'); continue; }
    const syy = sopii(r.fi, r.sv); if (syy) { virheet.push('vientipohja ' + id + ': ' + syy); continue; }
    if (svNyk.tekstit[id] === r.sv) R.ohitettu.push(id); else if (svNyk.tekstit[id]) virheet.push('vientipohja ' + id + ': jo eri sv:llä'); else vpU[id] = r.sv;
  }
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false };
  if (libU.length) { const mark = '      // ── tm_mediaviesti.kysymyspohjat', i = sLib.indexOf(mark); if (i < 0) throw new Error('mv_pohjat-merkkiä ei löydy'); sLib = sLib.slice(0, i) + '      // ── sv-käännöserä 54 (Gemini; ' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era54.cjs) ── lib.tm_harjoitusarviointi (avain = fi-teksti)\n' + libU.map(([a, sv]) => '      ' + q(a) + ': ' + q(sv) + ',').join('\n') + '\n' + sLib.slice(i); }
  if (maU.length) sMa = lisaaKarttaan(sMa, maU, '── sv-käännöserä 54, osio master_kartta (Gemini; vienti scripts/i18n_vie_sv_era54.cjs) ──');
  if (langU.length) {   // tm_lang sv-lohkon suostumus-ryhmän loppuun
    const lines = sLang.split('\n'), idx = lines.map((l, i) => (/^    suostumus: \{/.test(l) ? i : -1)).filter((i) => i >= 0); if (idx.length !== 3) throw new Error('suostumus-lohkoja ei 3');
    let j = idx[1] + 1; while (!/^    \},?\s*(\/\/.*)?$/.test(lines[j])) j++;
    lines.splice(j, 0, '      // sv-käännöserä 54 (Gemini; vienti scripts/i18n_vie_sv_era54.cjs): suostumuslomakkeen dynaamiset viestit ja kuitti', ...langU.map(([a, sv]) => '      ' + a + ': ' + q(sv) + ','));
    sLang = lines.join('\n');
  }
  // verifiointi
  const uLib = lataaSv(sLib, 'TM_LIB_I18N'), uMa = lataaSv(sMa, 'TM_MASTER_I18N'), uL = (() => { const sb = { module: { exports: {} }, console: { log() {}, warn() {} }, window: undefined, localStorage: undefined, navigator: undefined }; require('vm').createContext(sb); require('vm').runInContext(sLang + '\n;this.__x = TM_LANG;', sb); return sb.__x; })();
  for (const [a, sv] of libU) if (uLib[a] !== sv) virheet.push('verifiointi lib ' + a);
  for (const [a, sv] of maU) if (uMa[a] !== sv) virheet.push('verifiointi master ' + a);
  for (const [a, sv] of langU) if (uL.sv.suostumus[a] !== sv) virheet.push('verifiointi tm_lang ' + a);
  if (virheet.length) return { virheet, lisatty: [], ohitettu: R.ohitettu, kirjoitettu: false };
  const n = libU.length + maU.length + langU.length + Object.keys(vpU).length;
  if (opts.kirjoita && n) {
    fs.writeFileSync(path.join(juuri, 'lib/tm_lib_i18n.js'), sLib); fs.writeFileSync(path.join(juuri, 'lib/tm_master_i18n.js'), sMa); fs.writeFileSync(path.join(juuri, 'lib/tm_lang.js'), sLang);
    Object.assign(svNyk.tekstit, vpU); fs.writeFileSync(path.join(juuri, 'scripts/vientipohja_sv.json'), JSON.stringify(svNyk, null, 1) + '\n');
  }
  return { virheet, lisatty: n, ohitettu: R.ohitettu, kirjoitettu: !!(opts.kirjoita && n), lib: libU.length, master: maU.length, tm_lang: langU.length, vientipohja: Object.keys(vpU).length };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, PALAUTUS };
