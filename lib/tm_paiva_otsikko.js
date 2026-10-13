/* tm_paiva_otsikko.js — Kodin otsikkorivin päiväys kielen mukaan. PURE; dual-export: module.exports || window.TM_PAIVA_OTSIKKO.
   · tmPaivaOtsikko(d, kieli, t) → 'Tiistai, 13. lokakuuta' (fi, ennallaan) | 'tisdag 13 oktober' (sv: viikonpäivä pienellä, ei pistettä päivän perässä, ei pilkkua).
   sv käyttää samaa jaettua päiväyslibiä kuin muu sovellus (tm_lang.js tmPvmFmt → Intl sv-FI); fi säilyttää nykyiset sanataulukot ja t()-reitin. Viikkonumero (· VIIKKO n) jää kutsujalle. */
(function (root) {
  'use strict';
  var PV = ['sunnuntai', 'maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai'];
  var KK = ['tammikuuta', 'helmikuuta', 'maaliskuuta', 'huhtikuuta', 'toukokuuta', 'kesäkuuta', 'heinäkuuta', 'elokuuta', 'syyskuuta', 'lokakuuta', 'marraskuuta', 'joulukuuta'];
  function _fmt() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_lang.js').tmPvmFmt : (root && root.tmPvmFmt); } catch (e) { return root && root.tmPvmFmt; } }
  function tmPaivaOtsikko(d, kieli, t) {
    var tt = typeof t === 'function' ? t : function (x) { return x; }, f = _fmt();
    if (kieli === 'sv' && typeof f === 'function') return f(d, { weekday: 'long', day: 'numeric', month: 'long' }, 'sv').toLowerCase().replace(/\./g, '').replace(/,/g, '').replace(/\s+/g, ' ').trim();
    var w = tt(PV[d.getDay()]); return w.charAt(0).toUpperCase() + w.slice(1) + ', ' + d.getDate() + '. ' + tt(KK[d.getMonth()]);
  }
  var API = { tmPaivaOtsikko: tmPaivaOtsikko };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_PAIVA_OTSIKKO = API;
})(typeof window !== 'undefined' ? window : this);
