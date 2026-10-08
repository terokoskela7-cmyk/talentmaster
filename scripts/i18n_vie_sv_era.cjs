#!/usr/bin/env node
/* sv-käännöserän vienti koodiin (docs/CODE_BRIEF_I18N_SV_ERA_2026-10-08.md; Kaista: Tero).
   Lähde: docs/i18n/sv_kaannoserae_2026-10-08.json (Gemini). Code EI kirjoita ruotsia (CLAUDE.md §0): kaikki sv-arvot kopioidaan
   tästä JSONista sellaisenaan, ei käsin eikä muokaten.
   Ajo: node scripts/i18n_vie_sv_era.cjs [--kuiva]
   · lib.*  → lib/tm_lib_i18n.js (generoitu, TM_LIB_I18N.sv; kysymyspohjat = mv_pohjat)
   · tm_lang → lib/tm_lang.js sv-lohko (puuttuvat avaimet ryhmittäin; olemassa olevaa ei kosketa)
   · vp_kartta + vp_otsikot_data_i18n → lib/tm_vp_i18n.js sv; master_* → lib/tm_master_i18n.js sv
   Idempotentti: jo olemassa oleva avain ohitetaan (ei ylikirjoiteta) ja raportoidaan, jos arvo eroaa. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const KUIVA = process.argv.includes('--kuiva');
const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/i18n/sv_kaannoserae_2026-10-08.json'), 'utf8'));
const lue = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const kirjoita = (f, s) => { if (!KUIVA) fs.writeFileSync(path.join(ROOT, f), s); };
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029') + "'";
const raportti = { lisatty: {}, ohitettuOlemassa: {}, eroaa: {}, tyhjat: [] };
const rap = (k, v) => { (raportti[k[0]][k[1]] = raportti[k[0]][k[1]] || []).push(v); };

function rivit(osio) { const o = J.osiot[osio]; if (!o) throw new Error('osio puuttuu: ' + osio); return o.rivit; }
function svArvo(osio, avain, rivi) {
  if (typeof rivi.sv !== 'string' || rivi.sv === '') { raportti.tyhjat.push(osio + ' :: ' + avain); return null; }
  return rivi.sv;
}

/* ── 1. lib/tm_lib_i18n.js ── */
const LIBIT = ['tm_kehitystyopoyta', 'tm_kevyt_katselmus', 'tm_klippi_perhe', 'tm_mediaviesti', 'tm_reitin_valinta', 'tm_ryhmat', 'tm_taman_tueksi', 'tm_tanaan_kentta', 'tm_tanaan_signaali', 'tm_viikkokatsaus'];
function vieLib() {
  const svt = {}; const lahde = {}; const tormaykset = [];
  for (const l of LIBIT) {
    const r = rivit('lib.' + l);
    for (const [k, v] of Object.entries(r)) {
      const sv = svArvo('lib.' + l, k, v); if (sv == null) continue;
      if (k in svt) { tormaykset.push(k + ' (' + lahde[k] + ' ↔ ' + l + (svt[k] === sv ? ', sama sv' : ', ERI sv') + ')'); if (svt[k] !== sv) throw new Error('lib-avaintörmäys eri sv:llä: ' + k); continue; }
      svt[k] = sv; lahde[k] = l;
    }
  }
  const poh = rivit('lib.tm_mediaviesti.kysymyspohjat');
  const mvp = {};
  for (const [ty, rek] of Object.entries(poh)) { mvp[ty] = {}; for (const [r, o] of Object.entries(rek)) { if (!Array.isArray(o.sv) || o.sv.length !== o.fi.length || o.sv.some((x) => typeof x !== 'string' || !x)) throw new Error('mv_pohjat ' + ty + '.' + r + ': sv ei vastaa fi-taulukkoa'); mvp[ty][r] = o.sv.slice(); } }
  let s = '/* ════════════════════════════════════════════════════════════════════════\n'
    + '   tm_lib_i18n.js — JAETTU kirjastojen (lib/tm_*.js, `var FI = { avain: … }`) sv-kartta. GENEROITU: scripts/i18n_vie_sv_era.cjs ← docs/i18n/sv_kaannoserae_2026-10-08.json (Gemini).\n'
    + '   ÄLÄ MUOKKAA KÄSIN (CLAUDE.md §0: Code ei kirjoita ruotsia) — uudet rivit tulevat Gemini-erästä. Päätös A (KARTOITUS.md §5) = vaihtoehto 2.\n'
    + '   Rakenne: TM_LIB_I18N = { sv: { <kirjaston FI-avain>: \'sv-teksti\', …, mv_pohjat: { <klippityyppi>: { <rekisteri>: [3 kysymystä] } } } }. Avain = kirjaston FI-avain sellaisenaan.\n'
    + '   · tmLibT(avain[, kieli]) → sv-merkkijono | undefined (fi/ei riviä → undefined → kutsuja putoaa nykyiseen reittiinsä ja lopulta kirjaston fi-oletukseen).\n'
    + '     Myös mv_pohja_<tyyppi>_<rekisteri>_<n> -avaimet johdetaan mv_pohjat-taulukoista (yksi totuus).\n'
    + '   · tmLibPohjat(tyyppi, rekisteri[, kieli]) → sv-taulukko | null.\n'
    + '   Kutsujat: vpT (tm_vp_i18n.js), masterT (tm_master_i18n.js), Pelaajan _p7K1T, Vanhemman _vKpT, tm_mediaviesti.tmMvPohjat.\n'
    + '   Dual-export: module.exports || window.TM_LIB_I18N (+ window.tmLibT / tmLibPohjat).\n'
    + '════════════════════════════════════════════════════════════════════════ */\n'
    + '(function (root) {\n  \'use strict\';\n  var TM_LIB_I18N = {\n    sv: {\n';
  for (const l of LIBIT) {
    s += '      // ── ' + l + ' ──\n';
    for (const k of Object.keys(svt).filter((x) => lahde[x] === l)) s += '      ' + q(k) + ': ' + q(svt[k]) + ',\n';
  }
  s += '      // ── tm_mediaviesti.kysymyspohjat (3 kysymystä / tyyppi × rekisteri, samassa järjestyksessä kuin fi) ──\n      mv_pohjat: {\n';
  for (const [ty, rek] of Object.entries(mvp)) { s += '        ' + ty + ': {\n'; for (const [r, a] of Object.entries(rek)) s += '          ' + r + ': [' + a.map(q).join(', ') + '],\n'; s += '        },\n'; }
  s += '      },\n    },\n  };\n\n'
    + '  function _kieli(k) { if (k) return k; try { return (typeof root.tmNykyinenKieli === \'function\' && root.tmNykyinenKieli()) || \'fi\'; } catch (e) { return \'fi\'; } }\n'
    + '  function tmLibPohjat(tyyppi, rekisteri, kieli) {\n'
    + '    var k = _kieli(kieli), m = TM_LIB_I18N[k]; if (k === \'fi\' || !m || !m.mv_pohjat) return null;\n'
    + '    var a = m.mv_pohjat[tyyppi] && m.mv_pohjat[tyyppi][rekisteri]; return Array.isArray(a) ? a : null;\n'
    + '  }\n'
    + '  function tmLibT(avain, kieli) {\n'
    + '    var k = _kieli(kieli); if (k === \'fi\' || typeof avain !== \'string\') return undefined;\n'
    + '    var m = TM_LIB_I18N[k]; if (!m) return undefined;\n'
    + '    if (Object.prototype.hasOwnProperty.call(m, avain) && typeof m[avain] === \'string\') return m[avain];\n'
    + '    var p = /^mv_pohja_([a-z]+)_([a-z]+)_([1-9])$/.exec(avain);\n'
    + '    if (p) { var a = tmLibPohjat(p[1], p[2], k); if (a && typeof a[+p[3] - 1] === \'string\') return a[+p[3] - 1]; }\n'
    + '    return undefined;\n'
    + '  }\n\n'
    + '  var API = { TM_LIB_I18N: TM_LIB_I18N, tmLibT: tmLibT, tmLibPohjat: tmLibPohjat };\n'
    + '  if (typeof module !== \'undefined\' && module.exports) module.exports = API;\n'
    + '  else { root.TM_LIB_I18N = TM_LIB_I18N; root.tmLibT = tmLibT; root.tmLibPohjat = tmLibPohjat; }\n'
    + '})(typeof window !== \'undefined\' ? window : this);\n';
  kirjoita('lib/tm_lib_i18n.js', s);
  raportti.lisatty['lib/tm_lib_i18n.js'] = [Object.keys(svt).length + ' avainta + mv_pohjat ' + Object.values(mvp).reduce((a, r) => a + Object.values(r).reduce((b, x) => b + x.length, 0), 0) + ' riviä'];
  if (tormaykset.length) raportti.lisatty['lib-avaintörmäykset (sama sv)'] = tormaykset;
}

/* ── 2. tm_lang.js sv-lohko ── */
function vieTmLang() {
  let src = lue('lib/tm_lang.js');
  const L = require(path.join(ROOT, 'lib/tm_lang.js')).TM_LANG;
  const r = rivit('tm_lang');
  const svAlku = src.indexOf('\n  sv: {'), enAlku = src.indexOf('\n  en: {', svAlku);
  if (svAlku < 0 || enAlku < 0) throw new Error('tm_lang sv/en-lohkoa ei löydy');
  let sv = src.slice(svAlku, enAlku);
  const ryhmat = {};
  for (const [polku, v] of Object.entries(r)) {
    const osat = polku.split('.'); if (osat.length !== 2) throw new Error('odotettiin ryhmä.avain: ' + polku);
    const [g, k] = osat; const olemassa = L.sv[g] && L.sv[g][k];
    if (typeof olemassa === 'string') { rap(['ohitettuOlemassa', 'tm_lang'], polku); if (olemassa !== v.sv) rap(['eroaa', 'tm_lang'], polku + ': koodissa "' + olemassa + '" ≠ erä "' + v.sv + '"'); continue; }
    const arvo = svArvo('tm_lang', polku, v); if (arvo == null) continue;
    (ryhmat[g] = ryhmat[g] || []).push([k, arvo]);
  }
  for (const [g, lista] of Object.entries(ryhmat)) {
    const rivit2 = lista.map(([k, a]) => '      ' + k + ': ' + q(a) + ',');
    const alku = sv.indexOf('\n    ' + g + ': {');
    if (alku >= 0) {
      const loppu = sv.indexOf('\n    },', alku); if (loppu < 0) throw new Error('ryhmän ' + g + ' loppua ei löydy');
      sv = sv.slice(0, loppu) + '\n' + rivit2.join('\n') + sv.slice(loppu);
    } else {   // uusi ryhmä (alusta): fi-lohkon järjestys → ennen pelaaja-ryhmää
      const ennen = sv.indexOf('\n    pelaaja: {'); if (ennen < 0) throw new Error('pelaaja-ryhmää ei löydy sv-lohkosta');
      sv = sv.slice(0, ennen) + '\n    ' + g + ': {\n' + rivit2.join('\n') + '\n    },\n' + sv.slice(ennen);
    }
    lista.forEach(([k]) => rap(['lisatty', 'tm_lang'], g + '.' + k));
  }
  src = src.slice(0, svAlku) + sv + src.slice(enAlku);
  kirjoita('lib/tm_lang.js', src);
}

/* ── 3. merkkijonokartat (avain = fi-teksti) ── */
function vieKartta(tiedosto, osiot, mapNimi) {
  let src = lue(tiedosto);
  const mod = {}; const ctx = {};
  // olemassa olevat avaimet: vm-ajo (sama tapa kuin muut portit) — common + sivukartta
  const vm = require('vm');
  const sandbox = { window: undefined, module: { exports: {} }, console };
  const kartta = (() => { const cmn = lue('lib/tm_i18n_common.js'); const sb = { module: { exports: {} }, console }; vm.createContext(sb); vm.runInContext(cmn + '\n;this.__c = (typeof TM_I18N_COMMON !== "undefined") ? TM_I18N_COMMON : null;', sb); return sb.__c; })();
  const sb2 = { module: { exports: {} }, console }; vm.createContext(sb2); vm.runInContext(src + '\n;this.__m = ' + mapNimi + ';', sb2);
  const olemassa = sb2.__m.sv || {}; const common = (kartta && kartta.sv) || {};
  const lisattavat = [];
  for (const osio of osiot) {
    for (const [fi, v] of Object.entries(rivit(osio))) {
      const sv = svArvo(osio, fi, v); if (sv == null) continue;
      if (fi in common) { rap(['ohitettuOlemassa', tiedosto + ' (common)'], fi); continue; }
      if (fi in olemassa) { rap(['ohitettuOlemassa', tiedosto], fi); if (olemassa[fi] !== sv) rap(['eroaa', tiedosto], '"' + fi + '": koodissa "' + olemassa[fi] + '" ≠ erä "' + sv + '"'); continue; }
      if (lisattavat.some((x) => x[0] === fi)) continue;
      lisattavat.push([fi, sv]);
    }
  }
  const svAlku = src.indexOf('\n  sv: {'), enAlku = src.indexOf('\n  en: {', svAlku);
  const loppu = src.lastIndexOf('\n  },', enAlku); if (svAlku < 0 || loppu < svAlku) throw new Error('sv-lohkon loppua ei löydy: ' + tiedosto);
  const blokki = '\n    // ── sv-käännöserä 8.10.2026 (Gemini; docs/i18n/sv_kaannoserae_2026-10-08.json; vienti scripts/i18n_vie_sv_era.cjs) ──\n' + lisattavat.map(([a, b]) => '    ' + q(a) + ': ' + q(b) + ',').join('\n');
  src = src.slice(0, loppu) + blokki + src.slice(loppu);
  kirjoita(tiedosto, src);
  raportti.lisatty[tiedosto] = [lisattavat.length + ' riviä'];
}

vieLib();
vieTmLang();
vieKartta('lib/tm_vp_i18n.js', ['vp_kartta', 'vp_otsikot_data_i18n'], 'TM_VP_I18N');
vieKartta('lib/tm_master_i18n.js', ['master_kartta', 'master_otsikot_data_i18n'], 'TM_MASTER_I18N');

console.log(JSON.stringify(raportti, (k, v) => (Array.isArray(v) && v.length > 12 && typeof v[0] === 'string' && v.length > 12 ? v.slice(0, 12).concat(['… +' + (v.length - 12)]) : v), 1));
if (raportti.tyhjat.length) { console.error('TYHJIÄ sv-rivejä (ei viety, fi-fallback): ' + raportti.tyhjat.length); }
