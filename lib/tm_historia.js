/*
 * tm_historia.js — Mittaushistorian selkäranka (hh_historia + tki_historia).
 *
 * Puhtaat, testattavat funktiot — EI Firestorea, EI DOMia. Peilaa flei_historia[]-mallin H-H:lle ja TKI:lle.
 * Vaihe 1 (data): trendi luetaan aikasarjana. Suuntaa/kehitysnopeutta EI tallenneta — ne johdetaan näytöllä
 * (kanoninen pienempi_parempi + Δ/Δt päivätyistä pisteistä). Historia tallentaa raa'at arvot + tasot sellaisenaan.
 *
 * Periaatteet:
 *  - §26 "näytä mitä on": snapshot ottaa VAIN mitatut (numeeriset) avaimet — ei fabrikoi null-avaimia.
 *  - Testijoukko-agnostinen: sama koodi Sibbo (kasirata+lin30m) ja SJK (lin10m/lin30m/cmj/sm_juoksu/sm_pallo) -datalle.
 *  - Kova katto 20 (pvm-järjestys); vanhemmat pudotetaan arraysta — testitulokset-dokumentit = totuus/arkisto.
 *  - Idempotentti: upsert pvm:llä (sama pvm korvaa) → re-import/backfill ei tuota duplikaatteja.
 */
(function (root) {
  'use strict';

  var HISTORIA_CAP = 20;

  // Fyysisen H-H-snapshotin sallitut raaka-avaimet (hh_viimeisin-muoto). Testit-mäppi käyttää cmj:lle
  // avainta 'hyppy_cj' — kutsuja normalisoi sen 'cmj':ksi ennen tätä (hv = hh_viimeisin-muotoinen).
  var HH_RAAKA_AVAIMET = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata', 'sm_juoksu', 'sm_pallo', 'pujottelu', 'syotto'];
  var HH_TASO_AVAIMET = ['hh_taso', 'd1_taso', 'd2_taso'];

  function _numOk(v) { return typeof v === 'number' && !isNaN(v) && isFinite(v); }

  // tmHhSnapshot(pvm, { hh_taso, d1_taso, d2_taso, hv }) → { pvm, ...vain mitatut avaimet }.
  // Kopioi VAIN olemassa olevat numeeriset raaka-arvot (HH_RAAKA_AVAIMET) hv:stä + tasot (jos != null).
  // Ei null-avaimia.
  function tmHhSnapshot(pvm, src) {
    src = src || {};
    var snap = { pvm: pvm };
    HH_TASO_AVAIMET.forEach(function (k) { if (_numOk(src[k])) snap[k] = src[k]; });
    var hv = src.hv || {};
    HH_RAAKA_AVAIMET.forEach(function (k) { if (_numOk(hv[k])) snap[k] = hv[k]; });
    return snap;
  }

  // tmTkiSnapshot(pvm, { tki, tkLajit }) → { pvm, tki, ...per-laji } (vain mitatut).
  // tkLajit = per-laji-arvot (ponnauttelu/syotto/pujottelu/kuljetus_laukaus/pituuspotku_bonus/kokonaistulos…);
  // kopioi kaikki numeeriset avaimet → testijoukko-agnostinen.
  function tmTkiSnapshot(pvm, src) {
    src = src || {};
    var snap = { pvm: pvm };
    if (_numOk(src.tki)) snap.tki = src.tki;
    var tk = src.tkLajit || {};
    Object.keys(tk).forEach(function (k) { if (_numOk(tk[k])) snap[k] = tk[k]; });
    return snap;
  }

  // tmHistoriaLisaa(arr, snapshot, cap=20) → uusi array (EI mutatoi):
  //   upsert pvm:llä (sama pvm korvaa → idempotentti), lajittele pvm nousevaan, leikkaa viimeiset `cap`.
  //   Snapshotin, jossa on vain { pvm } (ei mitattua dataa), voi silti lisätä — pvm on pakollinen.
  function tmHistoriaLisaa(arr, snapshot, cap) {
    cap = (cap == null) ? HISTORIA_CAP : cap;
    var base = Array.isArray(arr) ? arr.slice() : [];
    if (!snapshot || snapshot.pvm == null) return base;
    var out = base.filter(function (x) { return x && x.pvm !== snapshot.pvm; });
    out.push(snapshot);
    out.sort(function (a, b) { return String(a.pvm).localeCompare(String(b.pvm)); });
    if (out.length > cap) out = out.slice(out.length - cap);
    return out;
  }

  var API = {
    HISTORIA_CAP: HISTORIA_CAP,
    HH_RAAKA_AVAIMET: HH_RAAKA_AVAIMET,
    tmHhSnapshot: tmHhSnapshot,
    tmTkiSnapshot: tmTkiSnapshot,
    tmHistoriaLisaa: tmHistoriaLisaa
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  // Globaalit (selain): sekä nimiavaruus että suorat funktiot (yhdenmukainen muiden libien kanssa).
  root.TM_HISTORIA = API;
  root.tmHhSnapshot = tmHhSnapshot;
  root.tmTkiSnapshot = tmTkiSnapshot;
  root.tmHistoriaLisaa = tmHistoriaLisaa;
})(typeof window !== 'undefined' ? window : this);
