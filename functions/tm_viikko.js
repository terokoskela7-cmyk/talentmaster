/* ════════════════════════════════════════════════════════════════════════
   tm_viikko.js — YKSI ISO 8601 -viikkolaskenta kaikille sovelluksille (audit 27 §3 P0, D140; docs/CODE_BRIEF_S2B_VALMENTAJA_TANAAN.md PR 0).
   JUURISYY: Master näytti "Viikko 42" (_getVk), Kalenteri "Viikko 40" (weekNum), oikea ISO-viikko oli 41 — kaksi omaa kaavaa, kumpikaan ei ISO 8601.
   ISO 8601: viikko alkaa maanantaista; viikko 1 = viikko, jossa vuoden ensimmäinen torstai on. Vuoden 52/53 → 1 raja ratkeaa torstaista.
   PURE, kokonaislukuaritmetiikkaa (ei aikavyöhykevirheitä): kalenteripäivä (y, m, d) → päivänumero → torstai → viikko.
     · tmIsoViikkoYMD(y, m, d)  → { vuosi, viikko, tunniste:'YYYY-Www' }   m = 1–12
     · tmIsoViikkoPaiva(date)   → sama; käyttää Daten PAIKALLISTA kalenteripäivää (käyttäjän näkemä päivä, kuten tmPaivaIso)
     · tmIsoViikkoMs(ms)        → sama; UTC-kalenteripäivä (palvelimen koosteen tunnisteen kanssa yhtenevä; Cloud Functions on UTC)
     · tmIsoViikkoNro(date)     → pelkkä viikkonumero (paikallinen päivä)
     · tmIsoViikonMaanantaiYMD(y, m, d) → { y, m, d } viikon maanantai
   VARTIJA: tests/viikko_yksi_kaava.test.js — sovelluksissa ja libeissä ei omia viikkokaavoja.
   Dual-export: module.exports || window.TM_VIIKKO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000;
  function _pv(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAY); }            // päivänumero (1.1.1970 = 0)
  function tmIsoViikkoYMD(y, m, d) {
    var dn = _pv(y, m, d), wd = ((dn % 7) + 7 + 3) % 7;                                // ma = 0 … su = 6 (1.1.1970 oli torstai)
    var to = dn - wd + 3, ty = new Date(to * DAY).getUTCFullYear();                      // viikon torstai ratkaisee vuoden
    var w = Math.floor((to - _pv(ty, 1, 1)) / 7) + 1;
    return { vuosi: ty, viikko: w, tunniste: ty + '-W' + (w < 10 ? '0' : '') + w };
  }
  function tmIsoViikkoPaiva(date) { var x = date || new Date(); return tmIsoViikkoYMD(x.getFullYear(), x.getMonth() + 1, x.getDate()); }
  function tmIsoViikkoMs(ms) { var x = new Date(ms); return tmIsoViikkoYMD(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate()); }
  function tmIsoViikkoNro(date) { return tmIsoViikkoPaiva(date).viikko; }
  function tmIsoViikonMaanantaiYMD(y, m, d) { var dn = _pv(y, m, d), wd = ((dn % 7) + 7 + 3) % 7, x = new Date((dn - wd) * DAY); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; }
  var API = { tmIsoViikkoYMD: tmIsoViikkoYMD, tmIsoViikkoPaiva: tmIsoViikkoPaiva, tmIsoViikkoMs: tmIsoViikkoMs, tmIsoViikkoNro: tmIsoViikkoNro, tmIsoViikonMaanantaiYMD: tmIsoViikonMaanantaiYMD };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VIIKKO = API;
})(typeof window !== 'undefined' ? window : null);
