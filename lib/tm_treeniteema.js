/* ════════════════════════════════════════════════════════════════════════
   tm_treeniteema.js — Vaihe 4d: teemakattavuus PURE-ydin (VP_v25 kalenteri).
   Vertaa joukkueen jaksofokukset (4a/4c) vs suunnitellut treeniteema-harjoitukset
   (4d) valitulla jaksolla → "harjoittelemmeko sitä mihin sovimme keskittyvämme?".
   Signaali: konsepti jossa ≥3 pelaajan fokus MUTTA 0 teemaharjoitusta → gap.
   PURE (EI Firestore/DOM); tapahtumat normalisoidaan kutsujassa {treeniteema, pvm}.
   Dual-export: module.exports (Vitest) || window.TM_TREENITEEMA. §26 · §35 · §4.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var GAP_KYNNYS = 3;   // ≥3 pelaajan fokus ilman harjoitusta → 🟠 "Suunnittele" (sama kynnys kuin 4c ryhmäharjoite)

  function _onFokus(p) { return !!(p && p.jaksofokus && p.jaksofokus.konsepti_avain); }

  // Onko pvm (YYYY-MM-DD) välillä [alku, loppu] inklusiivinen. null-rajat = ei rajausta siltä puolelta.
  function _valilla(pvm, alku, loppu) {
    if (!pvm) return false;
    var p = String(pvm).slice(0, 10);
    if (alku && p < String(alku).slice(0, 10)) return false;
    if (loppu && p > String(loppu).slice(0, 10)) return false;
    return true;
  }

  // pelaajat: [{jaksofokus:{konsepti_avain, konsepti_nimi}}]
  // tapahtumat: [{treeniteema:{avain, nimi}, pvm:'YYYY-MM-DD'}] (poistetut suodatettu kutsujassa)
  // jaksoAlku/jaksoLoppu: 'YYYY-MM-DD' inklusiivinen (null = ei rajaa).
  // → [{avain, nimi, fokus_n, harjoitus_n, kate, gap}] laskeva fokus_n. Vain fokus-teemat (fokus_n≥1).
  function tmTtKate(pelaajat, tapahtumat, jaksoAlku, jaksoLoppu) {
    var teemat = {};
    (pelaajat || []).forEach(function (p) {
      if (!_onFokus(p)) return;
      var jf = p.jaksofokus, a = jf.konsepti_avain;
      if (!teemat[a]) teemat[a] = { avain: a, nimi: jf.konsepti_nimi || a, fokus_n: 0, harjoitus_n: 0 };
      teemat[a].fokus_n += 1;
    });
    (tapahtumat || []).forEach(function (t) {
      var tt = t && t.treeniteema;
      if (!tt || !tt.avain) return;
      if (!_valilla(t.pvm, jaksoAlku, jaksoLoppu)) return;
      if (!teemat[tt.avain]) return;   // vain fokusoituja teemoja seurataan (kate = fokus vs harjoitus)
      teemat[tt.avain].harjoitus_n += 1;
    });
    return Object.keys(teemat).map(function (k) {
      var t = teemat[k];
      t.kate = t.harjoitus_n > 0;
      t.gap = t.fokus_n >= GAP_KYNNYS && t.harjoitus_n === 0;
      return t;
    }).sort(function (a, b) { return b.fokus_n - a.fokus_n || String(a.nimi).localeCompare(String(b.nimi)); });
  }

  var API = { tmTtKate: tmTtKate, GAP_KYNNYS: GAP_KYNNYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_TREENITEEMA = API;
})(typeof window !== 'undefined' ? window : this);
