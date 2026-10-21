#!/usr/bin/env node
/* sv-erä 80 (K1d: sanasto, yhteenvetorytmi, ⓘ-selitteet, pelaajan Minä, ADAR-nimet; 21.10.2026) — VIENTI koodiin. Lähde: docs/i18n/sv_kaannoserae_80_palautus.json (PM:n kirjoittama, Teron tarkistama; sha f644ddf2…8ba9). Kaista: Tero.
   Code EI kirjoita ruotsia (§0): palautuksen sv kopioidaan merkki merkiltä; vienti VERIFIOIDAAN lataamalla kartat uudelleen. Idempotentti; virhe → ei kirjoiteta mitään.
   Kohteet: lib/tm_lib_i18n.js (lib.* ja lib_adar_nimet: avain = lib-avain tai fi-teksti), lib/tm_vp_i18n.js (vp_kartta), lib/tm_master_i18n.js (master_kartta), lib/tm_i18n_common.js (yhteiset_kartta), lib/tm_lang.js (tm_lang).
   Rivin avain jo jossakin kartassa (vanha sv, sv_nyt) → arvo KORVATAAN paikallaan (kaikki esiintymät); ei missään → lisätään osion oletuskarttaan. Ajo: node scripts/i18n_vie_sv_era80.cjs [--kuiva] */
'use strict';
const fs = require('fs');
const path = require('path');
const { sopii, lataaSv, q } = require('./i18n_vie_sv_era53_19.cjs');
const ROOT = path.join(__dirname, '..');
const PALAUTUS = 'docs/i18n/sv_kaannoserae_80_palautus.json', LAHETYS = 'docs/i18n/sv_kaannoserae_80_gemini.json';
const KARTAT = { lib: { f: 'lib/tm_lib_i18n.js', nimi: 'TM_LIB_I18N' }, vp: { f: 'lib/tm_vp_i18n.js', nimi: 'TM_VP_I18N' }, master: { f: 'lib/tm_master_i18n.js', nimi: 'TM_MASTER_I18N' }, common: { f: 'lib/tm_i18n_common.js', nimi: 'TM_I18N_COMMON' } };
const OLETUS = { vp_kartta: 'vp', master_kartta: 'master', yhteiset_kartta: 'common', lib_adar_nimet: 'lib', 'lib.tm_seuran_pulssi': 'vp', 'lib.tm_vp_koti': 'vp', 'lib.tm_vp_tilanne': 'vp' };   // fi-tekstiavaimiset VP-libit → VP-kartta (vpT)   // muut lib.* → lib
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ARVO = "(?:'((?:[^'\\\\]|\\\\.)*)'|\"((?:[^\"\\\\]|\\\\.)*)\")";
function svLohko(src) { const a = src.search(/\n {2,4}sv:\s*\{/); if (a < 0) return null; const rel = src.slice(a + 1).search(/\n {2,4}en:\s*\{/); return [a, rel < 0 ? src.length : a + 1 + rel]; }
/* korvaa avaimen kaikki esiintymät sv-lohkossa; palauttaa [uusi src, esiintymien määrä] */
function korvaa(src, avain, sv) {
  const l = svLohko(src); if (!l) return [src, 0];
  const re = new RegExp('(' + reEsc(q(avain)) + '\\s*:\\s*)' + ARVO, 'g'); let n = 0;
  const lohko = src.slice(l[0], l[1]).replace(re, (m, a) => { n++; return a + q(sv); });
  return [src.slice(0, l[0]) + lohko + src.slice(l[1]), n];
}
function korvaaLang(src, polku, sv) {   // 'pelaaja.adar_nimi_pelaaja_r' → lehtiavain sv-lohkossa (identifier-avain)
  const l = svLohko(src); if (!l) return [src, 0]; const lehti = polku.split('.').pop(), re = new RegExp('(\\b' + reEsc(lehti) + '\\s*:\\s*)' + ARVO, 'g'); let n = 0;
  const lohko = src.slice(l[0], l[1]).replace(re, (m, a) => { n++; return a + q(sv); });
  return [src.slice(0, l[0]) + lohko + src.slice(l[1]), n];
}
function lisaaKarttaan(src, rivit, otsake) {   // fi-/lib-avaimiset kartat: sv-lohkon loppuun
  const l = svLohko(src) || [0, src.length], loppu = src.lastIndexOf('\n  },', l[1]) >= l[0] ? src.lastIndexOf('\n  },', l[1]) : src.lastIndexOf('\n    },', l[1]);
  if (loppu < l[0]) throw new Error('sv-lohkon loppua ei löydy');
  const ind = src.slice(loppu + 1).startsWith('    }') ? '      ' : '    ';
  return src.slice(0, loppu) + '\n' + ind + '// ' + otsake + '\n' + rivit.map(([x, y]) => ind + q(x) + ': ' + q(y) + ',').join('\n') + src.slice(loppu);
}
function vie(opts) {
  opts = opts || {}; const juuri = opts.juuri || ROOT, lue = (f) => fs.readFileSync(path.join(juuri, f), 'utf8'), virheet = [], ohitettu = [];
  const P = JSON.parse(lue(PALAUTUS)).osiot, G = JSON.parse(lue(LAHETYS)).osiot;
  const src = {}; for (const k of Object.keys(KARTAT)) src[k] = lue(KARTAT[k].f); let lang = lue('lib/tm_lang.js');
  const lisattavat = { lib: [], vp: [], master: [], common: [] }, odotus = []; let korvattu = 0;
  for (const osio of Object.keys(G)) {
    if (!P[osio]) { virheet.push('osio puuttuu palautuksesta: ' + osio); continue; }
    if (JSON.stringify(Object.keys(P[osio].rivit).sort()) !== JSON.stringify(Object.keys(G[osio].rivit).sort())) virheet.push(osio + ': avaimet ≠ lähetetty erä');
    for (const [a, r] of Object.entries(P[osio].rivit)) {
      if (r.fi !== (G[osio].rivit[a] || {}).fi) { virheet.push(osio + ' :: ' + a + ': fi ≠ lähetetty'); continue; }
      const syy = sopii(r.fi, r.sv); if (syy) { virheet.push(osio + ' :: ' + a + ': ' + syy); continue; }
      if (osio === 'tm_lang') { const [u, n] = korvaaLang(lang, a, r.sv); if (!n) { virheet.push('tm_lang-avainta ei löydy sv-lohkosta: ' + a); continue; } lang = u; korvattu += n; odotus.push(['lang', a, r.sv]); continue; }
      const oletus = OLETUS[osio] || 'lib'; let loytyi = false;
      for (const k of Object.keys(KARTAT)) {
        const [u, n] = korvaa(src[k], a, r.sv); if (n) { loytyi = true; src[k] = u; korvattu += n; odotus.push([k, a, r.sv]); }
      }
      if (!loytyi) { lisattavat[oletus].push([a, r.sv]); odotus.push([oletus, a, r.sv]); }
    }
  }
  for (const k of Object.keys(lisattavat)) if (lisattavat[k].length) src[k] = lisaaKarttaan(src[k], lisattavat[k], '── sv-käännöserä 80 (' + PALAUTUS + '; vienti scripts/i18n_vie_sv_era80.cjs) ── K1d: sanasto, yhteenvetorytmi, ⓘ, pelaajan Minä, ADAR-nimet');
  if (virheet.length) return { virheet, korvattu: 0, lisatty: 0, kirjoitettu: false };
  for (const [k, a, sv] of odotus) {   // verifiointi: kartat ladataan uudelleen
    if (k === 'lang') { const l = svLohko(lang), lehti = a.split('.').pop(), m = new RegExp('\\b' + reEsc(lehti) + '\\s*:\\s*' + ARVO).exec(lang.slice(l[0], l[1])); if (!m || (m[1] != null ? m[1] : m[2]).replace(/\\(.)/g, '$1') !== sv) virheet.push('verifiointi tm_lang ' + a); continue; }
    const u = lataaSv(src[k], KARTAT[k].nimi); if (u[a] !== sv) virheet.push('verifiointi: ' + k + ' ' + a);
  }
  if (virheet.length) return { virheet, korvattu: 0, lisatty: 0, kirjoitettu: false };
  const lisatty = Object.values(lisattavat).reduce((s, x) => s + x.length, 0), muuttui = lisatty > 0 || korvattu > 0 && Object.keys(KARTAT).some((k) => src[k] !== lue(KARTAT[k].f)) || lang !== lue('lib/tm_lang.js');
  if (opts.kirjoita && muuttui) { for (const k of Object.keys(KARTAT)) fs.writeFileSync(path.join(juuri, KARTAT[k].f), src[k]); fs.writeFileSync(path.join(juuri, 'lib/tm_lang.js'), lang); }
  return { virheet, korvattu, lisatty, kirjoitettu: !!(opts.kirjoita && muuttui), rivit: odotus.length };
}
if (require.main === module) {
  const t = vie({ kirjoita: !process.argv.includes('--kuiva') });
  if (t.virheet.length) { console.error('VIENTI KAATUI, mitään ei kirjoitettu:\n- ' + t.virheet.join('\n- ')); process.exit(1); }
  console.log(JSON.stringify(t));
}
module.exports = { vie, korvaa, korvaaLang, PALAUTUS, LAHETYS };
