/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri.js — K3 toistuvat tapahtumat: jaettu PURE-ydin (VP_v25 + Master_v16).
   Materialisointi = konkreettiset occurrence-dokit, jaettu toistuvuus_sarja_id
   (KALENTERI_ARKKITEHTUURI.md §13). UI inline kummassakin appissa; tämä = testattava ydin.
   Dual-export: module.exports (Vitest) || window.TM_KALENTERI (selain).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var CAP_OLETUS = 60;
  var ASKEL = { viikoittain: 7, '2_viikottain': 14 };

  // "YYYY-MM-DD" → paikallinen Date (keskiyö). Ei aikavyöhykedriftiä (ei UTC-parsintaa).
  function _parse(iso) {
    if (!iso) return null;
    var osat = String(iso).slice(0, 10).split('-');
    if (osat.length !== 3) return null;
    return new Date(Number(osat[0]), Number(osat[1]) - 1, Number(osat[2]));
  }
  function _fmt(d) {
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // Occurrence-päivämäärät: alkupvm → askel ≤ paattyy ≤ cap. Palauttaa { pvmt, katkaistu }.
  // cadence: 'kerran'|'viikoittain'|'2_viikottain'|'kuukausittain'. 'kerran'/tyhjä → [alku].
  function tmKalenteriOccurrences(alkuISO, cadence, paattyyISO, cap) {
    cap = cap || CAP_OLETUS;
    var pvmt = [];
    var cur = _parse(alkuISO);
    if (!cur) return { pvmt: pvmt, katkaistu: false };
    if (cadence === 'kerran' || !cadence) return { pvmt: [_fmt(cur)], katkaistu: false };
    var loppu = _parse(paattyyISO);
    var katkaistu = false;
    while (true) {
      if (loppu && cur.getTime() > loppu.getTime()) break;
      if (pvmt.length >= cap) { katkaistu = true; break; }
      pvmt.push(_fmt(cur));
      if (cadence === 'kuukausittain') { cur.setMonth(cur.getMonth() + 1); }
      else {
        var askel = ASKEL[cadence];
        if (!askel) break;               // tuntematon cadence → vain ensimmäinen
        cur.setDate(cur.getDate() + askel);
      }
    }
    return { pvmt: pvmt, katkaistu: katkaistu };
  }

  // Viikonpäivä 0=su..6=la (toistuvuus.paiva).
  function tmToistuvuusPaiva(alkuISO) {
    var d = _parse(alkuISO);
    return d ? d.getDay() : null;
  }

  // Sarjan id (pure — selain antaa ts=Date.now(), rnd=satunnaismerkkijono).
  function tmSarjaId(ts, rnd) {
    return 'srj_' + ts + '_' + rnd;
  }

  // Cadence-näyttönimi indikaattoriin ("Toistuu viikoittain").
  function tmCadenceNimi(cadence) {
    return ({
      viikoittain: 'viikoittain',
      '2_viikottain': 'joka toinen viikko',
      kuukausittain: 'kuukausittain'
    })[cadence] || '';
  }

  var API = {
    tmKalenteriOccurrences: tmKalenteriOccurrences,
    tmToistuvuusPaiva: tmToistuvuusPaiva,
    tmSarjaId: tmSarjaId,
    tmCadenceNimi: tmCadenceNimi,
    CAP_OLETUS: CAP_OLETUS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_KALENTERI = API;
})(typeof window !== 'undefined' ? window : this);
