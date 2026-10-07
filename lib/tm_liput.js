/* ════════════════════════════════════════════════════════════════════════
   tm_liput.js — käyttöönottoliput, YKSI TOTUUS (K1 osa 2; Rules v3.43): seurat/{sid}/liput/julkiset = { kentta: bool } (luettavissa pelaajalle ja henkilökunnalle).
   Vanha seurat/{sid}.liput.kentta on FALLBACK K7:ään asti: uusi dokumentti voittaa kun siinä on boolean-arvo; muuten vanha (täsmälleen true).
   · tmKenttaLippu(julkiset, seuraDoc)  → boolean  (vain täsmälleen true avaa Kenttä-polut; 'true'/1/puuttuva → false)
   · tmLiput(julkiset, seuraDoc)        → { …vanhat liput, kentta: boolean } — adapterien `liput.kentta === true` -ehdot toimivat ennallaan
   PURE; ei Firebasea. Dual-export: module.exports || window.TM_LIPUT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function tmKenttaLippu(julkiset, seuraDoc) {
    if (julkiset && typeof julkiset === 'object' && typeof julkiset.kentta === 'boolean') return julkiset.kentta;
    return !!(seuraDoc && seuraDoc.liput && seuraDoc.liput.kentta === true);
  }
  function tmLiput(julkiset, seuraDoc) {
    var vanhat = seuraDoc && seuraDoc.liput && typeof seuraDoc.liput === 'object' ? seuraDoc.liput : {};
    var jul = julkiset && typeof julkiset === 'object' ? julkiset : {};
    return Object.assign({}, vanhat, jul, { kentta: tmKenttaLippu(julkiset, seuraDoc) });
  }
  var API = { tmKenttaLippu: tmKenttaLippu, tmLiput: tmLiput };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_LIPUT = API;
})(typeof window !== 'undefined' ? window : this);
