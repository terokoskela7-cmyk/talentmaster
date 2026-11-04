/* ════════════════════════════════════════════════════════════════════════
   tm_liput.js — käyttöönottoliput, YKSI TOTUUS (K1 osa 2; Rules v3.43): seurat/{sid}/liput/julkiset = { kentta: bool } (luettavissa pelaajalle ja henkilökunnalle).
   Vanha seurat/{sid}.liput.kentta on FALLBACK K7:ään asti: uusi dokumentti voittaa kun siinä on boolean-arvo; muuten vanha (täsmälleen true).
   · tmKenttaLippu(julkiset, seuraDoc)  → boolean  (vain täsmälleen true avaa Kenttä-polut; 'true'/1/puuttuva → false)
   · tmLiput(julkiset, seuraDoc)        → { …vanhat liput, kentta: boolean } — adapterien `liput.kentta === true` -ehdot toimivat ennallaan
   · LIPUT (D1, 5.11.2026)               → rekisteri: SA:n Liput-paneeli näyttää ja callable asetaSeuranLippu hyväksyy VAIN nämä avaimet
   · tmLippuTila(avain, julkiset, seura) → { arvo: boolean, lahde: 'julkiset'|'vanha'|'oletus' } — sama etusija kaikille lipuille
   PURE; ei Firebasea. Dual-export: module.exports || window.TM_LIPUT. Kopio functions/tm_liput.js (identtinen, testi).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function tmKenttaLippu(julkiset, seuraDoc) {
    if (julkiset && typeof julkiset === 'object' && typeof julkiset.kentta === 'boolean') return julkiset.kentta;
    return !!(seuraDoc && seuraDoc.liput && seuraDoc.liput.kentta === true);
  }
  var LIPUT = [
    { avain: 'kentta', kuvaus: 'Kenttä-polut (Design V2): Master, VP, Pelaaja, Kehitystyöpöytä' },
    { avain: 'kehitystyopoyta_v2', kuvaus: 'Kehitystyöpöytä v2 -sivu (Master ja VP ohjaavat sinne)' },
    { avain: 'valmentaja_v2', kuvaus: 'Valmentajan uusi navigaatio (Master, Kehitystyöpöytä)' },
    { avain: 'klippi_oma_video', kuvaus: 'Klippi ryhmälle: pelaajan oma video (Master, VP)' }
  ];
  function tmLippuTunnettu(avain) { return LIPUT.some(function (l) { return l.avain === avain; }); }
  function tmLippuTila(avain, julkiset, seuraDoc) {
    if (julkiset && typeof julkiset === 'object' && typeof julkiset[avain] === 'boolean') return { arvo: julkiset[avain], lahde: 'julkiset' };
    if (seuraDoc && seuraDoc.liput && seuraDoc.liput[avain] === true) return { arvo: true, lahde: 'vanha' };
    return { arvo: false, lahde: 'oletus' };
  }
  function tmLiput(julkiset, seuraDoc) {
    var vanhat = seuraDoc && seuraDoc.liput && typeof seuraDoc.liput === 'object' ? seuraDoc.liput : {};
    var jul = julkiset && typeof julkiset === 'object' ? julkiset : {};
    return Object.assign({}, vanhat, jul, { kentta: tmKenttaLippu(julkiset, seuraDoc) });
  }
  var API = { tmKenttaLippu: tmKenttaLippu, tmLiput: tmLiput, LIPUT: LIPUT, tmLippuTunnettu: tmLippuTunnettu, tmLippuTila: tmLippuTila };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_LIPUT = API;
})(typeof window !== 'undefined' ? window : this);
