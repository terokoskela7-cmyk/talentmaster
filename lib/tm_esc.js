/* ════════════════════════════════════════════════════════════════════════
   tm_esc.js — jaettu HTML-escape (P1 · tallennettu XSS, 1.10.2026)
   Kaikki käyttäjäperäiset arvot (nimet, sähköpostit, joukkueet, suostumuksen antaja — osa tulee julkiselta
   suostumuslomakkeelta) kulkevat tmEsc():n kautta ennen innerHTML-templaattia.
   HUOM: tmEsc EI suojaa arvoa JS-merkkijonon sisällä onclick-attribuutissa (selain purkaa &#39; takaisin
   heittomerkiksi ennen JS:n ajoa) → onclickiin EI upoteta arvoja, vaan data-*-attribuutti + käsittelijä.
   Selain: window.tmEsc · Node: module.exports.
════════════════════════════════════════════════════════════════════════ */
(function (juuri) {
  'use strict';
  var KARTTA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' };
  function tmEsc(v) {
    return String(v == null ? '' : v).replace(/[&<>"'`]/g, function (c) { return KARTTA[c]; });
  }
  var api = { tmEsc: tmEsc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (juuri) juuri.tmEsc = tmEsc;
})(typeof window !== 'undefined' ? window : null);
