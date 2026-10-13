/* ════════════════════════════════════════════════════════════════════════
   tm-prescription-teksti.js — V-KOTI sv-läpiajo kierros B: pre-harkan blokin alaotsikko kutsujan kielellä (lataa tm-prescription.js:n JÄLKEEN).
   TM.prescription.alaotsikkoTeksti(b, t): b.alaotsikko_avain = { avain, nimi?, emoji?, ka?, pieni? } → t(avain) + muuttujat: {nimi} käännetään t():llä (ketjun nimi; pieni → pienellä alkukirjaimella),
   {emoji} ja {ka} sellaisenaan. Ei avainta → ''. Fi-tulos = blokin vanha `alaotsikko`-teksti. Dual-export: TM.prescription (selain) + module.exports.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function alaotsikkoTeksti(b, t) {
    var a = b && b.alaotsikko_avain; if (!a || !a.avain) return '';
    var tt = typeof t === 'function' ? t : function (x) { return x; }, s = String(tt(a.avain) || a.avain), nimi = a.nimi != null ? String(tt(a.nimi)) : ''; if (a.pieni) nimi = nimi.toLowerCase();
    return s.replace('{nimi}', nimi).replace('{emoji}', a.emoji || '').replace('{ka}', a.ka != null ? a.ka : '');
  }
  var TM = root.TM || (root.TM = {}); TM.prescription = TM.prescription || {}; TM.prescription.alaotsikkoTeksti = alaotsikkoTeksti;
  if (typeof module !== 'undefined' && module.exports) module.exports = { alaotsikkoTeksti: alaotsikkoTeksti };
})(typeof window !== 'undefined' ? window : this);
