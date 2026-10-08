/* Masterin (TalentMaster_Master_v16.html) sv-avaimet ilman käännöstä (sv-läpiajo PR 3). Code EI kirjoita ruotsia (CLAUDE.md §0): tämä poimii vain fi-avaimet, joille ei ole sv-riviä
   missään masterT:n reitillä (TM_MASTER_I18N.sv → TM_I18N_COMMON.sv → TM_LIB_I18N.sv), ja ne menevät Gemini-erään (scripts/i18n_luo_gemini_era.cjs, osio master_kartta).
   Lähteet: (1) masterT('literaali') -kutsut (koko argumentti = yksi merkkijono), (2) data-i18n / -ph / -title / -aria / -html -attribuutit, (3) jakson tilakoneen tekstit (lib/tm_aloita_jakso.js teksti:/muoto:).
   Dynaamiset kutsut (masterT(muuttuja)) eivät näy — niiden kattavuus todennetaan ajonaikaisella läpiajolla (tools/i18n/sv_lapiajo.mjs) ja render-porteilla. */
'use strict';
const fs = require('fs');
const path = require('path');

function _lataa(juuri, f, nimi) { try { return require(path.join(juuri, f))[nimi].sv || {}; } catch (e) { return {}; } }
function _dec(t) { return t.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' '); }

function masterAvaimet(juuri) {
  juuri = juuri || path.join(__dirname, '..', '..');
  const HTML = fs.readFileSync(path.join(juuri, 'TalentMaster_Master_v16.html'), 'utf8');
  const kartat = [_lataa(juuri, 'lib/tm_master_i18n.js', 'TM_MASTER_I18N'), _lataa(juuri, 'lib/tm_i18n_common.js', 'TM_I18N_COMMON'), _lataa(juuri, 'lib/tm_lib_i18n.js', 'TM_LIB_I18N')];
  const onSv = (t) => kartat.some((K) => [t, _dec(t), t.trim()].some((x) => typeof K[x] === 'string' && K[x] !== ''));
  const avaimet = new Set();

  // (1) masterT('…') — paren-matching, string-tietoinen
  let i = 0; const n = HTML.length;
  for (;;) {
    const j = HTML.indexOf('masterT(', i); if (j < 0) break;
    let k = j + 8, d = 1, q = null; const st = k;
    while (k < n && d > 0) {
      const c = HTML[k];
      if (q) { if (c === '\\') { k += 2; continue; } if (c === q) q = null; }
      else if (c === "'" || c === '"' || c === '`') q = c;
      else if (c === '(') d++; else if (c === ')') d--;
      k++;
    }
    const arg = HTML.slice(st, k - 1);
    const m = /^\s*'((?:[^'\\]|\\.)*)'\s*$/.exec(arg) || /^\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(arg);
    if (m) avaimet.add(m[1].replace(/\\u00a0/g, ' ').replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"'));
    i = k;
  }
  // (2) data-i18n*-attribuutit
  for (const m of HTML.matchAll(/\sdata-i18n(?:-ph|-title|-aria|-html)?="([^"]*)"/g)) avaimet.add(_dec(m[1]));
  // (3) jakson tilakone
  const aj = fs.readFileSync(path.join(juuri, 'lib/tm_aloita_jakso.js'), 'utf8');
  for (const m of aj.matchAll(/\b(?:teksti|muoto): '((?:[^'\\]|\\.)*)'/g)) avaimet.add(m[1].replace(/\\'/g, "'"));

  const kaikki = [...avaimet].filter((t) => /[a-zåäöA-ZÅÄÖ]{3}/.test(t));
  return { kaikki, puuttuu: kaikki.filter((t) => !onSv(t)) };
}
module.exports = { masterAvaimet };
