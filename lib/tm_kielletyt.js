/* ════════════════════════════════════════════════════════════════════════
   tm_kielletyt.js — GDPR/§7.22-sanavartija PELAAJAN sovellukselle (K1 osa 2b). Pelaaja_v7 ei saa ladata lib/tm_jakso_malli.js:ää (henkilökunnan päätösrakenteet, tukitarve; tests/r6_3a_jakso_malli.test.js),
   joten vartija on omassa pienessä libissään. SAMA lista kuin tm_jakso_malli.KIELLETYT — drift-testi (tests/k1_kielletyt.test.js) vertaa lähdekoodeja.
   · tmJaksoTekstiKelpaa(teksti) → { ok, loydetty }
   PURE. Dual-export: module.exports || window.TM_KIELLETYT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  // Avainsanat tahallaan tässä: tämä on vartijan oma lista, ei tallennettua tekstiä.
  var KIELLETYT = /heikkou|rajoite|rajoitt|kriittin|kriittis/i;
  function tmJaksoTekstiKelpaa(teksti) {
    var s = String(teksti == null ? '' : teksti), m = KIELLETYT.exec(s);
    return { ok: !m, loydetty: m ? m[0] : null };
  }
  var API = { KIELLETYT: KIELLETYT, tmJaksoTekstiKelpaa: tmJaksoTekstiKelpaa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KIELLETYT = API;
})(typeof window !== 'undefined' ? window : this);
