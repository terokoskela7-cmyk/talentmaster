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

  // ── Vaihe B: RISTIINARVIO (multi-rater konsensus + anti-anchoring) ──────────
  // Kanoni: D4 = KONSENSUS, ei "viimeisin voittaa". adar_viimeisin.yht = §4-ikäportitettu
  // keskiarvo arvioijien VIIMEISIMMISTÄ havainnoista (kukin arvioija painaa kerran, uusin per uid).
  // PURE (ei Firestore/DOM/Date.now) → Vitest-testattava. Havainto: { pisteet:{A,D,Act,R}, luotu,
  //   tekija_uid|valmentajaUid, tekija_nimi|valmentajaNimi, tekija_rooli }.

  var ADAR_KENTTA_MAP = { a: 'A', d: 'D', ac: 'Act', r: 'R' };   // konsensus-avain → havainnon pisteet-avain
  var TALENTTI_YHT_KYNNYS = 2.5;   // korkeat pisteet talenttinosto-signaaliin (1–3-skaala)

  function _adarMs(luotu) {
    if (luotu == null) return 0;
    if (typeof luotu === 'number') return luotu;
    if (typeof luotu === 'string') { var t = Date.parse(luotu); return isNaN(t) ? 0 : t; }
    if (typeof luotu.toMillis === 'function') return luotu.toMillis();          // Firestore Timestamp
    if (luotu.seconds != null) return luotu.seconds * 1000;                     // Timestamp-plain
    if (luotu instanceof Date) return luotu.getTime();
    return 0;
  }
  function _adarN13(v) {   // pisteet → 1–3 (vanha 1–5/1–10 capataan, kuten Master paivitaAdarPikakentat)
    if (v == null || isNaN(v)) return null;
    return Math.max(1, Math.min(3, Math.round(v)));
  }
  function _adarUid(h)  { return h.tekija_uid || h.valmentajaUid || null; }
  function _adarNimi(h) { return h.tekija_nimi || h.valmentajaNimi || null; }
  // ISO-pvm (tai luotu) → 'YYYY-MM' kuukausiavain (riippumattomuus-ikkuna).
  function tmAdarKuukausiAvain(pvmTaiMs) {
    var ms = _adarMs(pvmTaiMs);
    if (!ms) return null;
    var d = new Date(ms);
    var m = d.getUTCMonth() + 1;
    return d.getUTCFullYear() + '-' + (m < 10 ? '0' + m : '' + m);
  }

  // Konsensuskoostus: ryhmittele havainnot arvioijittain (uid) → kunkin UUSIN → dim-keskiarvo yli arvioijien.
  //   Palauttaa: { arvioijat:[{uid,nimi,rooli,pisteet:{a,d,ac,r},pvm}], arvioijia,
  //               dimKonsensus:{a,d,ac,r}, yht (§4), yhtenevyys:{a,d,ac,r}(max−min),
  //               yhtenevyysTaso ('korkea'|'keskiverto'|'matala'|null), vahvin, heikoin }
  function tmAdarKonsensus(havainnot, ika) {
    havainnot = Array.isArray(havainnot) ? havainnot : [];
    // 1. ryhmittele arvioijan uusimpaan (uid puuttuu → oma anonyymi ryhmä per havainto, ei sekoita muihin)
    var uusinPerUid = {};
    var anonI = 0;
    havainnot.forEach(function (h) {
      if (!h || !h.pisteet) return;
      var uid = _adarUid(h) || ('_anon' + (anonI++));
      var ms = _adarMs(h.luotu);
      if (!uusinPerUid[uid] || ms > uusinPerUid[uid]._ms) {
        uusinPerUid[uid] = { h: h, _ms: ms, uid: _adarUid(h) };
      }
    });
    var arvioijat = Object.keys(uusinPerUid).map(function (k) {
      var e = uusinPerUid[k], h = e.h, p = h.pisteet || {};
      var pisteet = {};
      Object.keys(ADAR_KENTTA_MAP).forEach(function (dk) { pisteet[dk] = _adarN13(p[ADAR_KENTTA_MAP[dk]]); });
      return { uid: e.uid, nimi: _adarNimi(h), rooli: h.tekija_rooli || null,
               pisteet: pisteet, pvm: e._ms ? new Date(e._ms).toISOString() : null, _ms: e._ms };
    }).sort(function (a, b) { return b._ms - a._ms; });   // uusin ensin (näyttöjärjestys)

    // 2. dim-keskiarvo yli arvioijien + hajonta (max−min)
    var dimKonsensus = {}, yhtenevyys = {};
    Object.keys(ADAR_KENTTA_MAP).forEach(function (dk) {
      var vals = arvioijat.map(function (a) { return a.pisteet[dk]; })
                          .filter(function (v) { return v != null; });
      if (!vals.length) { dimKonsensus[dk] = null; yhtenevyys[dk] = null; return; }
      dimKonsensus[dk] = Math.round(vals.reduce(function (s, v) { return s + v; }, 0) / vals.length * 10) / 10;
      yhtenevyys[dk] = Math.max.apply(null, vals) - Math.min.apply(null, vals);
    });

    // 3. yht = §4-ikäportitettu konsensus (tmAdarYht band-dimeistä)
    var yht = tmAdarYht(dimKonsensus, ika);

    // 4. vahvin/heikoin konsensuksesta (band-dimeistä; ikä null → kaikki)
    var band = tmAdarBand(ika);
    var vahvin = null, heikoin = null, max = -Infinity, min = Infinity;
    band.forEach(function (dk) {
      var v = dimKonsensus[dk];
      if (v == null) return;
      if (v > max) { max = v; vahvin = dk; }
      if (v < min) { min = v; heikoin = dk; }
    });

    // 5. yhtenevyystaso — vain band-dimien suurin hajonta (§4-relevantit), ≥2 arvioijaa
    var yhtenevyysTaso = null;
    if (arvioijat.length >= 2) {
      var spreadit = band.map(function (dk) { return yhtenevyys[dk]; })
                         .filter(function (v) { return v != null; });
      var maxSpread = spreadit.length ? Math.max.apply(null, spreadit) : 0;
      yhtenevyysTaso = maxSpread <= 0 ? 'korkea' : (maxSpread <= 1 ? 'keskiverto' : 'matala');
    }
    // arvioijat-listasta pudotetaan sisäinen _ms (ei vuoda pikakenttään)
    arvioijat.forEach(function (a) { delete a._ms; });
    return { arvioijat: arvioijat, arvioijia: arvioijat.length, dimKonsensus: dimKonsensus,
             yht: yht, yhtenevyys: yhtenevyys, yhtenevyysTaso: yhtenevyysTaso,
             vahvin: vahvin, heikoin: heikoin };
  }

  // Anti-anchoring-gate: näkeekö nykyinen uid muiden arviot? Avoin VAIN jos uid on tallentanut
  // OMAN havaintonsa kuluvan kalenterikuukauden aikana (nowMs). Ennen sitä → lukko (ei DOM-vuotoa).
  // arvioijat = tmAdarKonsensus(...).arvioijat. Pure (nowMs param, ei Date.now).
  function tmAdarRistiinarvioAvoin(arvioijat, omaUid, nowMs) {
    if (!omaUid) return false;
    var kkNyt = tmAdarKuukausiAvain(nowMs);
    if (!kkNyt) return false;
    return (arvioijat || []).some(function (a) {
      return a.uid === omaUid && tmAdarKuukausiAvain(a.pvm) === kkNyt;
    });
  }

  // Talenttinosto-signaali: ≥2 arvioijaa + korkea yhtenevyys + korkeat konsensuspisteet.
  function tmAdarTalenttiSignaali(kons) {
    if (!kons) return false;
    return kons.arvioijia >= 2 && kons.yhtenevyysTaso === 'korkea'
        && kons.yht != null && kons.yht >= TALENTTI_YHT_KYNNYS;
  }

  var API = { KARTTA_A: KARTTA_A, TAK_NIMI: TAK_NIMI, tmPelialyYksiloEhdota: tmPelialyYksiloEhdota,
    ADAR_JARJ: ADAR_JARJ, tmAdarBand: tmAdarBand, tmAdarYht: tmAdarYht, tmAdarBonusOsat: tmAdarBonusOsat,
    tmAdarKonsensus: tmAdarKonsensus, tmAdarRistiinarvioAvoin: tmAdarRistiinarvioAvoin,
    tmAdarTalenttiSignaali: tmAdarTalenttiSignaali, tmAdarKuukausiAvain: tmAdarKuukausiAvain,
    TALENTTI_YHT_KYNNYS: TALENTTI_YHT_KYNNYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_PELIALY_YKSILO = API;
  // Bare-globaalit selaimeen (yhdenmukainen muiden libien kanssa) — käytetään Master/Pelaaja/VP-renderissä.
  if (typeof window !== 'undefined') {
    root.tmAdarBand = tmAdarBand; root.tmAdarYht = tmAdarYht; root.tmAdarBonusOsat = tmAdarBonusOsat;
    root.tmAdarKonsensus = tmAdarKonsensus; root.tmAdarRistiinarvioAvoin = tmAdarRistiinarvioAvoin;
    root.tmAdarTalenttiSignaali = tmAdarTalenttiSignaali; root.tmAdarKuukausiAvain = tmAdarKuukausiAvain;
  }
})(typeof window !== 'undefined' ? window : this);
