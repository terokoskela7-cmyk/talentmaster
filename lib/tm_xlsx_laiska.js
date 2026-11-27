/* tm_xlsx_laiska.js — SheetJS (xlsx 0.18.5, ~315 kt gzip) ladataan vasta kun Excel-tiedostoa luetaan tai kirjoitetaan (PM 12.11.2026, mittausraportti: Seura + Master).
   Käyttö: await window.tmXlsxLataa() → window.XLSX. Sama CDN-osoite ja versio kuin aiemmin staattisessa <script>-tagissa. Kerran: samanaikaiset kutsut jakavat lupauksen;
   epäonnistunut lataus nollaa lupauksen (seuraava yritys hakee uudelleen) ja heittää Error('xlsx-lataus'). */
(function (root) {
  'use strict';
  var URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', lupaus = null;
  function tmXlsxLataa() {
    if (root.XLSX) return Promise.resolve(root.XLSX);
    if (lupaus) return lupaus;
    lupaus = new Promise(function (ok, virhe) {
      var s = root.document.createElement('script');
      s.src = URL; s.async = true;
      s.onload = function () { if (root.XLSX) ok(root.XLSX); else { lupaus = null; virhe(new Error('xlsx-lataus')); } };
      s.onerror = function () { lupaus = null; if (s.parentNode) s.parentNode.removeChild(s); virhe(new Error('xlsx-lataus')); };
      root.document.head.appendChild(s);
    });
    return lupaus;
  }
  root.tmXlsxLataa = tmXlsxLataa;
  if (typeof module !== 'undefined' && module.exports) module.exports = { tmXlsxLataa: tmXlsxLataa, URL: URL };
})(typeof window !== 'undefined' ? window : this);
