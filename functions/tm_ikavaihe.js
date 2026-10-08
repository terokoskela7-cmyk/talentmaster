/* ════════════════════════════════════════════════════════════════════════
   tm_ikavaihe.js — pelaajan ikä ja ikävaihe (Leikkijä · Rakentaja · Showcase), PURE. S1 (Seuran pulssi): palvelin tunnistaa Leikkijän samalla säännöllä kuin sovellus.
   · tmPelaajaIka(syntymaVuosi, vuosi, joukkueNimi) → kokonaisluku 5–25 | null. Peilaa tm_eerikkila_normit.normiIka:a: syntymaVuosi annettu → vuosi − syntymaVuosi (5–25, muuten null);
     syntymaVuosi puuttuu → joukkueen nimen ikäluokka (P12 / T13 / U12). `vuosi` = KALENTERIVUOSI (palvelin: Helsingin vuosi), ei "viimeisimmän testin vuosi" kuten VP:n _dimIkaSp.
   · tmIkavaihe(ika) → 'leikkija' (≤ 12) | 'rakentaja' (13–15) | 'showcase' (16+) | null (tuntematon). Sama raja kuin tmKtIkavaihe / tmMvRekisteri. Tuntematon ≠ Leikkijä (kuten VP: ika null → 'muu').
   Pariteettitesti: tests/seuran_kooste.test.js ajaa normiIka:a vasten. Dual-export: module.exports || window.TM_IKAVAIHE.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function tmPelaajaIka(syntymaVuosi, vuosi, joukkueNimi) {
    if (syntymaVuosi != null && syntymaVuosi !== '') {
      var v = Number(vuosi); if (!isFinite(v)) return null;
      var ika = v - Number(syntymaVuosi);
      return (isFinite(ika) && ika >= 5 && ika <= 25) ? ika : null;
    }
    if (joukkueNimi) { var m = String(joukkueNimi).match(/\b([PTU])\s?(\d{1,2})\b/i); if (m) return parseInt(m[2], 10); }
    return null;
  }
  function tmIkavaihe(ika) {
    var n = Number(ika); if (ika == null || ika === '' || !isFinite(n) || n <= 0) return null;
    return n <= 12 ? 'leikkija' : n <= 15 ? 'rakentaja' : 'showcase';
  }
  var API = { tmPelaajaIka: tmPelaajaIka, tmIkavaihe: tmIkavaihe };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_IKAVAIHE = API;
})(typeof window !== 'undefined' ? window : this);
