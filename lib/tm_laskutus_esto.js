/* ════════════════════════════════════════════════════════════════════════
   tm_laskutus_esto.js — Laskutus L1c (.briefit/CODE_BRIEF_LASKUTUS_L1C.md §4 + PM 3.11.): harmaa tila UI:ssa.
   Selain ei lue laskutus_asetuksia (vain SA) → sopimusseuratieto = peili seurat/{sid}.laskutus_sopimus (vain SA/skripti kirjoittaa, Rules v3.74).
   Sama sääntö kuin palvelimella (functions/laskutus_esto.js), joka on varsinainen esto — tämä on vain UI-vihje:
     · esto vain, kun seura.laskutus_sopimus === true
     · joukkue passiivinen, jos laskutustila !== 'aktiivinen' (puuttuva = passiivinen); demo-joukkuetta ei estetä
     · pelaaja sallittu, jos JOKIN joukkueista (tmPelaajanJoukkueet, §7.18 — sama kuin tmLaskutusJoukkue) on aktiivinen; ei joukkuetta → esto
   PURE. Dual-export: module.exports || window.TM_LASKUTUS_ESTO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TEKSTI = 'Ei käytössä – sovi käyttöönotosta TalentMasterin kanssa';   // fi-avain; sv TM_I18N_COMMON / tm_lang (PM:n teksti)
  var SYY = 'joukkue_passiivinen';
  function _J() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_joukkue.js'); } catch (e) { /* ei */ } return root && root.tmPelaajanJoukkueet ? root : null; }
  function tmLaskutusSopimus(seura) { return !!seura && seura.laskutus_sopimus === true; }
  function _aktiivinen(d) { return !!d && (d.laskutustila === 'aktiivinen' || d.demo === true); }
  function tmLaskutusJoukkueEstetty(seura, joukkue) { return tmLaskutusSopimus(seura) && !_aktiivinen(joukkue); }
  function tmLaskutusPelaajaEstetty(seura, pelaaja, joukkueDocs) {
    if (!tmLaskutusSopimus(seura)) return false;
    var J = _J(), docs = Array.isArray(joukkueDocs) ? joukkueDocs : [];
    if (!J || typeof J.tmPelaajanJoukkueet !== 'function') return false;   // ei tulkintaa → ei harmaata (palvelin estää silti)
    var jj = J.tmPelaajanJoukkueet(pelaaja || {}, docs), byId = {};
    docs.forEach(function (d) { if (d && d.id != null) byId[String(d.id)] = d; });
    for (var i = 0; i < jj.length; i++) if (_aktiivinen(byId[String(jj[i])])) return false;
    return true;
  }
  /* Palvelimen virhe (callable) → true, jos syy on laskutusesto. */
  function tmLaskutusEstoVirhe(e) { return !!(e && e.details && e.details.syy === SYY); }
  var API = { TEKSTI: TEKSTI, SYY: SYY, tmLaskutusSopimus: tmLaskutusSopimus, tmLaskutusJoukkueEstetty: tmLaskutusJoukkueEstetty,
    tmLaskutusPelaajaEstetty: tmLaskutusPelaajaEstetty, tmLaskutusEstoVirhe: tmLaskutusEstoVirhe };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_LASKUTUS_ESTO = API;
})(typeof window !== 'undefined' ? window : this);
