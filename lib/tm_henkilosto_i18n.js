/* ════════════════════════════════════════════════════════════════════════
   tm_henkilosto_i18n.js — henkilöstösovellusten (Seura, ADAR Pikakortti, Pelihavainto_Kentta) YHTEINEN sv-kartta + reititin (sv-läpiajo PR 4).
   Sama malli kuin tm_master_i18n.js / tm_vp_i18n.js: avain = suomenkielinen teksti sellaisenaan, arvo = ruotsi (GEMINI — Code EI kirjoita ruotsia, CLAUDE.md §0).
   Kartta on tarkoituksella TYHJÄ kunnes Gemini-erä 2 (docs/i18n/sv_kaannoserae_2.json, osio henkilosto_kartta) viedään (scripts/i18n_vie_sv_era.cjs) → siihen asti sv-tilassa teksti pysyy suomena.
   Reititin tmHT(fi): lukittu glossaari (TM_I18N_COMMON) → tämä kartta → fi. Lokalisointi-sweep tmHTL(juuri): data-i18n / -ph / -title / -aria / -html.
   Kieli: tmNykyinenKieli() (tm_lang.js; seuran kieli → tmKieliInitSeura). Dual-export: module.exports || window.
════════════════════════════════════════════════════════════════════════ */
var TM_HENKILOSTO_I18N = {
  sv: {
  },
  en: {}
};
// Node/testit: varmista että jaettu common on ladattu (selaimessa <script>-tagilla ENNEN tätä).
if (typeof tmI18nResolve === 'undefined' && typeof require === 'function') {
  try {
    var _cmnH = require('./tm_i18n_common.js');
    if (typeof global !== 'undefined') { global.TM_I18N_COMMON = _cmnH.TM_I18N_COMMON; global.tmI18nResolve = _cmnH.tmI18nResolve; global.tmLokalisoiCommon = _cmnH.tmLokalisoiCommon; }
  } catch (e) { /* common valinnainen — fi-fallback ilman sitä */ }
}
function tmHT(fi) { return (typeof tmI18nResolve === 'function') ? tmI18nResolve(fi, TM_HENKILOSTO_I18N) : fi; }
function tmHTL(root) { if (typeof tmLokalisoiCommon === 'function') tmLokalisoiCommon(root || (typeof document !== 'undefined' ? document : null), TM_HENKILOSTO_I18N); }
if (typeof window !== 'undefined') { window.TM_HENKILOSTO_I18N = TM_HENKILOSTO_I18N; window.tmHT = tmHT; window.tmHTL = tmHTL; }
if (typeof module !== 'undefined' && module.exports) module.exports = { TM_HENKILOSTO_I18N: TM_HENKILOSTO_I18N, tmHT: tmHT, tmHTL: tmHTL };
