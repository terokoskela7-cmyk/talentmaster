/* ════════════════════════════════════════════════════════════════════════
   tm_pelialy_yksilo.js — P1: pelihavainto (peliäly/D4) → yksilöteema (Kartta A).
   Kääntää havainnon peliäly-taksonomia-avaimet (tmAdarHavaittu / valmentajan dropdown)
   → TM_TT_YOUTH-teemaehdotukset (top-3). Ehdotus, ei pakko (§1.1 asiantuntijan valta):
   UI tarjoaa aina "Näytä kaikki teemat" ehdotuksen ohi. Kartta A LUKITTU (§13).
   PURE (EI Firestore/DOM). Dual-export: module.exports || window.TM_PELIALY_YKSILO. §34.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // Kartta A (LUKITTU §13): D4-taksonomia-avain → TM_TT_YOUTH-teema-shortlist (relevanssijärjestys).
  var KARTTA_A = {
    // football_sense (hyökkäys/pelinluku)
    anticipation: ['y_h0', 'y_h6', 'y_p3'],          // Ennakointi
    vision: ['y_h0', 'y_h8', 'y_h6'],                // Näkemys
    decision_making: ['y_h2', 'y_h3', 'y_h8'],       // Päätöksenteko
    positioning: ['y_h7', 'y_p2', 'y_p3'],           // Sijoittuminen
    timing: ['y_h7', 'y_h8'],                        // Ajoitus
    play_under_pressure: ['y_h1', 'y_h5'],           // Peli paineessa (raja D2, myös V5-silta)
    // puolustus → yhteinen p-teema-shortlist (§4)
    defensive_anticipation: ['y_p3', 'y_p1', 'y_p2'],
    defensive_positioning: ['y_p2', 'y_p3', 'y_p1'],
    pressing: ['y_p1', 'y_p4', 'y_p2'],
    tackling: ['y_p1', 'y_p2', 'y_p3'],
    defending_1v1: ['y_p1', 'y_p2'],
    defensive_heading: ['y_p2', 'y_p3'],
    clearing_crosses: ['y_p2', 'y_p3'],
    blocking_shots: ['y_p1', 'y_p2'],
    defensive_reliability: ['y_p2', 'y_p3', 'y_p4'],
    resilience: ['y_p4', 'y_p1']
  };
  // Taksonomia-avain → nimi_fi (syy-tekstiin). Lähde tm_arviointi_taksonomia.js D4.
  var TAK_NIMI = {
    anticipation: 'Ennakointi', vision: 'Näkemys', decision_making: 'Päätöksenteko', positioning: 'Sijoittuminen',
    timing: 'Ajoitus', play_under_pressure: 'Peli paineessa', versatility: 'Monipuolisuus',
    defensive_anticipation: 'Puolustusennakointi', defensive_positioning: 'Puolustussijoittuminen', pressing: 'Prässi',
    tackling: 'Riistot', defending_1v1: '1v1-puolustaminen', defensive_heading: 'Puolustuspääpeli',
    clearing_crosses: 'Keskitysten torjunta', blocking_shots: 'Blokit', defensive_reliability: 'Puolustusvarmuus',
    resilience: 'Sinnikkyys'
  };
  // Perustaito ensin tasapelissä (kuten V5): TM_TT_YOUTH-järjestys (perustaidot → edistyneet).
  var PERUSTAITO_JARJESTYS = ['y_h0', 'y_h1', 'y_h2', 'y_h3', 'y_h4', 'y_h5', 'y_h6', 'y_h7', 'y_h8', 'y_h9', 'y_p1', 'y_p2', 'y_p3', 'y_p4'];
  function _pt(k) { var i = PERUSTAITO_JARJESTYS.indexOf(k); return i < 0 ? 999 : i; }
  function _set(arr) { var s = {}; (arr || []).forEach(function (x) { s[x && x.avain ? x.avain : x] = 1; }); return s; }

  // tmPelialyYksiloEhdota(taksonomiaAvaimet, ctx) → top-3 [{konsepti_avain, konsepti_nimi, taksonomia_avain, syy}].
  //   taksonomiaAvaimet: ['anticipation', ...] (havainnon taksonomia-kenttä). ctx:
  //     sallitutKonseptit: [avain|{avain}] (ika/vaihe-gating, tmTtItems) · konseptiNimi(avain)→nimi (oletus = avain).
  //   Perustaito ensin tasapelissä. Tyhjä = graceful.
  function tmPelialyYksiloEhdota(taksonomiaAvaimet, ctx) {
    ctx = ctx || {};
    if (!Array.isArray(taksonomiaAvaimet) || !taksonomiaAvaimet.length) return [];
    var sallitut = ctx.sallitutKonseptit ? _set(ctx.sallitutKonseptit) : null;
    var nimiFn = (typeof ctx.konseptiNimi === 'function') ? ctx.konseptiNimi : null;
    var score = {}, driver = {};
    taksonomiaAvaimet.forEach(function (tak) {
      var lista = KARTTA_A[tak]; if (!lista) return;
      lista.forEach(function (kons, i) {
        score[kons] = (score[kons] || 0) + (lista.length - i);   // aikaisempi shortlistissa = korkeampi
        if (!(kons in driver)) driver[kons] = tak;               // ensimmäinen ajava taksonomia = syy
      });
    });
    var cand = Object.keys(score);
    if (sallitut) cand = cand.filter(function (k) { return sallitut[k]; });
    cand.sort(function (a, b) { return score[b] - score[a] || _pt(a) - _pt(b); });
    return cand.slice(0, 3).map(function (k) {
      return {
        konsepti_avain: k,
        konsepti_nimi: nimiFn ? (nimiFn(k) || k) : k,
        taksonomia_avain: driver[k],
        syy: 'Havaittu: ' + (TAK_NIMI[driver[k]] || driver[k])
      };
    });
  }

  // ── ADAR §4-ikäportitus (Malli A, PR #266) — KANONINEN peliäly-yhtenäisyys ──
  // Osat: a=Havaitse/Awareness · d=Päätä/Decision · ac=Toimi/Action · r=Reading/Reassess (kukin 1–3).
  // Band (§4): U8–12=[a] · U13–15=[a,d,ac] · U16+=[a,d,ac,r]. yht (D4) lasketaan VAIN ikätason osista;
  // ikätason yli menevä (esim. U13:n Reading) säilyy datassa ja näytetään bonuksena — ei nosta lukua.
  var ADAR_JARJ = ['a', 'd', 'ac', 'r'];
  function tmAdarBand(ika) {
    if (ika == null) return ADAR_JARJ.slice();            // ikä tuntematon → kaikki (turvaverkko)
    if (ika <= 12) return ['a'];
    if (ika <= 15) return ['a', 'd', 'ac'];
    return ['a', 'd', 'ac', 'r'];
  }
  // yht = keskiarvo (1–3) VAIN ikätason kirjatuista osista. null jos ei yhtään.
  function tmAdarYht(osat, ika) {
    osat = osat || {};
    var vals = tmAdarBand(ika).map(function (k) { return osat[k]; }).filter(function (v) { return v != null && !isNaN(v); });
    if (!vals.length) return null;
    return Math.round(vals.reduce(function (s, v) { return s + v; }, 0) / vals.length * 10) / 10;
  }
  // Ikätason yli menevät KIRJATUT osat (bonus-näyttö) — avainlista järjestyksessä.
  function tmAdarBonusOsat(osat, ika) {
    osat = osat || {};
    var band = tmAdarBand(ika);
    return ADAR_JARJ.filter(function (k) { return band.indexOf(k) < 0 && osat[k] != null; });
  }

  var API = { KARTTA_A: KARTTA_A, TAK_NIMI: TAK_NIMI, tmPelialyYksiloEhdota: tmPelialyYksiloEhdota,
    ADAR_JARJ: ADAR_JARJ, tmAdarBand: tmAdarBand, tmAdarYht: tmAdarYht, tmAdarBonusOsat: tmAdarBonusOsat };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_PELIALY_YKSILO = API;
  // Bare-globaalit selaimeen (yhdenmukainen muiden libien kanssa) — käytetään Master/Pelaaja-renderissä.
  if (typeof window !== 'undefined') { root.tmAdarBand = tmAdarBand; root.tmAdarYht = tmAdarYht; root.tmAdarBonusOsat = tmAdarBonusOsat; }
})(typeof window !== 'undefined' ? window : this);
