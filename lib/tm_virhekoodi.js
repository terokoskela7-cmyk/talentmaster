/* ════════════════════════════════════════════════════════════════════════
   tm_virhekoodi.js — tallennusvirheen syy näkyviin toastiin (Master + VP). Käyttäjä näkee mistä on kyse: oikeudet (permission-denied), yhteys (unavailable) vai muu.
   · tmVirheKoodi(e)           → 'permission-denied' | 'unavailable' | muu Firebase-koodi (esim. 'failed-precondition', 'tm/ei-yhteytta') | 'tuntematon'  (koodi siivotaan: vain a–z 0–9 - _ / , ≤ 40 merkkiä; ei vapaata tekstiä)
   · tmVirheTeksti(perus, e)   → perus + ' (' + koodi + ')'   — perus = jo käännetty teksti
   PURE. Dual-export: module.exports || window.TM_VIRHEKOODI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function tmVirheKoodi(e) {
    var k = e && typeof e.code === 'string' ? e.code : '';
    k = k.replace(/^(firestore|storage|functions|auth)\//, '').toLowerCase().replace(/[^a-z0-9\-_\/]/g, '').slice(0, 40);
    return k || 'tuntematon';
  }
  function tmVirheTeksti(perus, e) { return String(perus == null ? '' : perus) + ' (' + tmVirheKoodi(e) + ')'; }
  var API = { tmVirheKoodi: tmVirheKoodi, tmVirheTeksti: tmVirheTeksti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_VIRHEKOODI = API;
})(typeof window !== 'undefined' ? window : this);
