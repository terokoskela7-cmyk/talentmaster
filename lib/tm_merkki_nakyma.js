/* ════════════════════════════════════════════════════════════════════════
   tm_merkki_nakyma.js — pelaajan ja huoltajan merkkinäkymän YKSI sääntö (Teron päätös 19.10.2026, palaute-näkyvyys vaihe 0a). PURE (ei DOMia, ei Firebasea).
   Pelaaja ja huoltaja näkevät nykyisen merkin ja seuraavan merkin tavoitteena ("Kohti hopeaa"). EI sekunteja, EI etäisyyttä, EI "matka kultaan".
   Kehitys vain sanoin verrattuna pelaajan OMAAN edelliseen mittaukseen ("Parempi kuin viime kerralla"); ellei tulos parantunut, ei sanota mitään (§7.22).
   · tmMerkkiNakyma(p, opts) → { nykyinen: 'pronssi'|'hopea'|'kulta'|null, seuraava: 'pronssi'|'hopea'|'kulta'|null, ylin: bool, parempi: bool } | null (ei mittausta)
       opts.merkki  — jos kutsuja on laskenut merkin itse (testihetken ikä); muuten p.tki_merkki
   Aika pienempi = parempi (kokonaisaika, sekunteja); vertailu 0,1 s tarkkuudella kuten aiemmin ("paransit"), mutta luku EI koskaan näy.
   Dual-export: module.exports || window.TM_MERKKI_NAKYMA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var JARJESTYS = ['pronssi', 'hopea', 'kulta'];
  function _luku(v) { if (v == null || v === '') return null; var n = Number(v); return isFinite(n) ? n : null; }
  function tmMerkkiNakyma(p, opts) {
    if (!p) return null;
    var vi = _luku(p.tk_kokonaistulos_viimeisin);
    var onMittaus = vi != null || _luku(p.tki_viimeisin) != null || !!(opts && opts.merkki) || !!p.tki_merkki;
    if (!onMittaus) return null;
    var m = (opts && opts.merkki) || p.tki_merkki || null;
    var i = JARJESTYS.indexOf(m);
    var nykyinen = i >= 0 ? JARJESTYS[i] : null;
    var seuraava = i < 0 ? JARJESTYS[0] : (i + 1 < JARJESTYS.length ? JARJESTYS[i + 1] : null);
    var ed = _luku(p.tk_kokonaistulos_edellinen);
    var parempi = ed != null && vi != null && Math.round((ed - vi) * 10) / 10 > 0;
    return { nykyinen: nykyinen, seuraava: seuraava, ylin: nykyinen === 'kulta', parempi: parempi };
  }
  var API = { tmMerkkiNakyma: tmMerkkiNakyma, JARJESTYS: JARJESTYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_MERKKI_NAKYMA = API;
})(typeof window !== 'undefined' ? window : this);
