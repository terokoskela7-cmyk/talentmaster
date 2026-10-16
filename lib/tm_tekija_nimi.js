/* ════════════════════════════════════════════════════════════════════════
   tm_tekija_nimi.js — YKSI paikka havainnon / viestin TEKIJÄN NIMELLE (tallennus + näyttö).

   MIKSI JAETTU: sama sääntö oli kolmessa kopiossa (Pikakortti, tmViestiNimi, Pelaaja_v7 _p7TekijaNimi)
   ja neljäs olisi syntynyt VP:n/Masterin historiaan. Lapsi näkee kentän pelaajakortillaan.

   ⚠ INVARIANTIT:
     1. Tallennus: sähköposti EI KOSKAAN `tekija_nimi`-kenttään (tietosuoja). Puuttuva nimi → null,
        ei suomenkielistä 'Valmentaja'-tekstiä (se jäisi sv/en-lapselle kääntämättä).
     2. Näyttö: null / tyhjä / vanha kovakoodattu 'Valmentaja' / sähköposti → kutsujan antama KÄÄNNETTY
        oletus. Vanhoille dokumenteille ei tehdä datamigraatiota (poikkeus: scripts/siivoa_tekija_nimi_sahkoposti.js
        nollaa sähköpostit kertaluontoisesti).

   Dual-export: module.exports (Vitest) || window (selain).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function _teksti(v) { return (v == null) ? '' : String(v).trim(); }
  function _onSahkoposti(s) { return s.indexOf('@') >= 0; }

  /** Tallennettava nimi: ensimmäinen ehdokas joka on ei-tyhjä eikä sähköposti, muuten null. */
  function tmTekijaNimiTalletus(ehdokkaat) {
    var lista = Array.isArray(ehdokkaat) ? ehdokkaat : [ehdokkaat];
    for (var i = 0; i < lista.length; i++) {
      var s = _teksti(lista[i]);
      if (s && !_onSahkoposti(s)) return s;
    }
    return null;
  }

  /** Näytettävä nimi: oikea nimi sellaisenaan, muuten `oletus` (kutsuja antaa sen käännettynä). */
  function tmTekijaNimiNaytto(arvo, oletus) {
    var s = _teksti(arvo);
    return (!s || s === 'Valmentaja' || _onSahkoposti(s)) ? oletus : s;
  }

  var api = { tmTekijaNimiTalletus: tmTekijaNimiTalletus, tmTekijaNimiNaytto: tmTekijaNimiNaytto };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) { root.tmTekijaNimiTalletus = tmTekijaNimiTalletus; root.tmTekijaNimiNaytto = tmTekijaNimiNaytto; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
