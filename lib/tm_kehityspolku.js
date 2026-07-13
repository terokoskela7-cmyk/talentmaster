/* ════════════════════════════════════════════════════════════════════════
   tm_kehityspolku.js — I3a: Looginen silta (havainto → tavoite → konsepti/fundamentti → harjoite).
   YKSI resolver joka kääntää IDP-tavoitteen (idp_fokus {alue, dim}) oikeaksi youth-konseptiksi /
   fundamentiksi ja siitä valmiiseen harjoitteeseen. EHDOTTAA — valmentaja päättää (§0 asiantuntijan valta).
   Yhdistää olemassa olevat kartat: D2 → D2_KONSEPTI (korjaa SILTA_MAP:n mäppäysvirheen §A.5) ·
   D4 → KARTTA_A (tm_pelialy_yksilo, aktivoitu ctx.tmPelialyYksiloEhdota:lla) · D1 → fyysinen · D3/D5 → laadullinen.
   PURE (EI Firestore/DOM). Lib-riippuvuudet injektoidaan ctx:n kautta → testattava stubeilla.
   Dual-export: module.exports (Vitest) || window.TM_KEHITYSPOLKU. Kartta = DATA (Tero hienosäätää ilman koodia).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // ── §A.5 D2_KONSEPTI (Teron ehdotus, korvaa SILTA_MAP:n mäppäysvirheen) ──
  // D2-taksonomia-avain → TM_TT_YOUTH-konsepti. Kaikki 18 D2-avainta katettu (14 aitoa konseptia + 2 tulosmittari + 2 modifier/erikois).
  // Y-H4 (Harhauttaminen) & Y-H7 EIVÄT mäppäydy D2:sta (§A.7) — Y-H4 syntyy D4-pelihavainnosta (1v1), Y-H7 on taktinen/palloton (D4).
  // ÄLÄ lisää y_h4/y_h7 tähän karttaan.
  var D2_KONSEPTI = {
    // pallonhallinta
    ball_control: 'y_h1',        // Pallonhallinta → Haltuunotto (ensimmäinen kosketus)
    running_with_ball: 'y_h3',   // Kuljetus tilaan → Tempokuljetus
    dribbling: 'y_h3',           // Kuljetus ahtaassa → Tempokuljetus (EI y_h4: harhautus tulee D4:stä, §A.7)
    ball_protection: 'y_h5',     // Pallon suojaus → Pallon suojaaminen
    link_up: 'y_h6',             // Yhteispeli → Tuen tarjoaminen
    // syotto
    short_passing: 'y_h2',       // Lyhyt syöttö → Syöttäminen
    long_passing: 'y_h2',        // Pitkä syöttö → Syöttäminen (alt-vihje y_h8: leveyteen/syvyyteen)
    passing_variety: 'y_h2',     // Syöttövalikoima → Syöttäminen
    hide_pass: 'y_h2',           // Syötön piilotus → Syöttäminen (+ havainnointi_vihje, §A.5)
    ball_striking: 'y_h2',       // Pallonkäsittely → Syöttäminen (lyöntitekniikka)
    // viimeistely
    finishing: 'y_h9',           // Viimeistely → Viimeistely
    heading: 'y_h9',             // Pääpeli → Viimeistely (hyökkäyspääpeli)
    shooting_accuracy: 'y_h9',   // Laukauksen tarkkuus → Viimeistely (tag: placement)
    shooting_power: 'y_h9',      // Laukauksen voima → Viimeistely (tag: power)
    shooting_quickness: 'y_h9',  // Laukauksen nopeus → Viimeistely (tag: first-time)
    shooting_variety: 'y_h9'     // Laukausvalikoima → Viimeistely (tag: variety)
    // shooting_efficiency → TULOSMITTARI · weaker_foot → MODIFIERI (alla, ei tässä kartassa)
  };

  // §A.5 alt-vihje: konsepti + toissijainen konsepti-ehdotus (näytetään "tai"-vihjeenä).
  var ALT_VIHJE = { long_passing: 'y_h8' };

  // §E harjoite-tägit: laukaustyyppi → suodattaa Y-H9-harjoitevalinnan (jos harjoitteilla tägit; muuten toimii ilman).
  var HARJOITE_TAGIT = {
    shooting_accuracy: ['placement'], shooting_power: ['power'],
    shooting_quickness: ['first-time'], shooting_variety: ['variety']
  };

  // §A.2 tulosmittarit — SEURAUS, ei harjoiteltava taito. EI konseptia; kehitä alla olevia taitoja + päätöksenteko (D4).
  var TULOSMITTARI = { shooting_efficiency: 1, defensive_reliability: 1, consistency: 1 };
  // §A.5 modifieri — ei erillistä konseptia; harjoitteen jalka-attribuutti (§E).
  var MODIFIERI = { weaker_foot: 'heikompi' };

  // §A.4 havainnointi_vihje (Y-H0 läpileikkaava): teknisille suoritustaidoille (haltuunotto/syöttö/kuljetus).
  // "Jos tekniikka on ok mutta pelaaja ei käytä sitä — tarkista havainnointi (Y-H0)."
  var HAVAINNOINTI_VIHJE_KONSEPTIT = { y_h1: 1, y_h2: 1, y_h3: 1 };
  // Lisäksi eksplisiittinen per-avain-lippu (§A.5 hide_pass).
  var HAVAINNOINTI_VIHJE_AVAIN = { hide_pass: 1 };

  // Youth-konseptien nimet (itsenäinen fallback kun ctx.konseptiNimi puuttuu — resolver toimii ilman lib-injektiota).
  var YOUTH_NIMI = {
    y_h0: 'Havainnointi', y_h1: 'Haltuunotto', y_h2: 'Syöttäminen', y_h3: 'Tempokuljetus', y_h4: 'Harhauttaminen',
    y_h5: 'Pallon suojaaminen', y_h6: 'Tuen tarjoaminen', y_h7: 'Vartioinnista irtaantuminen',
    y_h8: 'Leveyteen ja syvyyteen pelaaminen', y_h9: 'Viimeistely',
    y_p1: '1v1-puolustaminen', y_p2: 'Vartiointi', y_p3: 'Varmistaminen', y_p4: 'Tilan puolustaminen ja merkkauksen vaihto'
  };

  function _nimi(avain, ctx) {
    if (ctx && typeof ctx.konseptiNimi === 'function') { var n = ctx.konseptiNimi(avain); if (n) return n; }
    return YOUTH_NIMI[avain] || avain;
  }
  function _dim(idpFokus, ctx) {
    if (idpFokus && idpFokus.dim) return idpFokus.dim;
    if (ctx && typeof ctx.tmTaksonomiaByAvain === 'function' && idpFokus && idpFokus.alue) {
      var it = ctx.tmTaksonomiaByAvain(idpFokus.alue); if (it && it.dim) return it.dim;
    }
    return null;
  }
  // Rakenna teknis-taktinen tulos (D2 tai D4 → youth-konsepti) + cue/harjoite/fundamentti ctx:stä.
  function _teknisTulos(alue, konsepti, dim, pelaaja, ctx, varmuus, extra) {
    ctx = ctx || {}; extra = extra || {};
    var cue = (typeof ctx.tmTtKysymykset === 'function') ? (ctx.tmTtKysymykset(konsepti) || []) : [];
    var harjoite = (typeof ctx.tmTtHarjoitteet === 'function') ? (ctx.tmTtHarjoitteet(konsepti) || []) : [];
    var vihje = !!HAVAINNOINTI_VIHJE_KONSEPTIT[konsepti] || !!HAVAINNOINTI_VIHJE_AVAIN[alue];
    var out = {
      tyyppi: 'teknis_taktinen', alue: alue, dim: dim,
      konsepti_avain: konsepti, konsepti_nimi: _nimi(konsepti, ctx),
      fundamentti_avain: null, fundamentti_nimi: null,
      harjoite_tagit: extra.harjoite_tagit || null,
      alt_konsepti_avain: extra.alt || null, alt_konsepti_nimi: extra.alt ? _nimi(extra.alt, ctx) : null,
      havainnointi_vihje: vihje,
      cue: cue, harjoite: harjoite,
      varmuus: varmuus, syy: extra.syy || null
    };
    // §A.6 fundamentti-kerros: vain kun pelipaikkavaihe & pelipaikka & sisältö valmis (gate). Muuten pelkkä youth-konsepti.
    var vaihe = (typeof ctx.tmTtVaihe === 'function') ? ctx.tmTtVaihe(pelaaja || {}) : null;
    var pos = pelaaja && (pelaaja.tt_positio_aktiivinen || pelaaja.positio);
    if (vaihe === 'pelipaikka' && pos && typeof ctx.haeFundamentti === 'function') {
      var f = ctx.haeFundamentti(pelaaja, konsepti, dim);   // ctx palauttaa {avain, nimi} vain jos sisältö valmis (cue/harjoite/kpi)
      if (f && f.avain) { out.fundamentti_avain = f.avain; out.fundamentti_nimi = f.nimi || f.avain; }
    }
    return out;
  }

  // ── PÄÄRESOLVER ──
  // idpFokus: { alue, dim }. pelaaja: { ika/syntymaVuosi/joukkue, positio/tt_positio_aktiivinen, ... }.
  // ctx (kaikki valinnaisia — graceful): tmPelialyYksiloEhdota, tmTtKysymykset, tmTtHarjoitteet, tmTtVaihe,
  //   konseptiNimi, tmTaksonomiaByAvain, sallitutKonseptit, haeFundamentti.
  function tmRatkaiseKehityspolku(idpFokus, pelaaja, ctx) {
    ctx = ctx || {};
    if (!idpFokus || !idpFokus.alue) {
      return { tyyppi: 'ei_konseptia', alue: null, dim: null, konsepti_avain: null, konsepti_nimi: null,
        fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
        cue: [], harjoite: [], varmuus: 'ei_konseptia', syy: 'Ei aktiivista tavoitetta.' };
    }
    var alue = idpFokus.alue, dim = _dim(idpFokus, ctx);

    // §A.2 tulosmittari — ennen dimensiodispatchia (defensive_reliability on D4, shooting_efficiency D2).
    if (TULOSMITTARI[alue]) {
      return { tyyppi: 'tulosmittari', alue: alue, dim: dim, konsepti_avain: null, konsepti_nimi: null,
        fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
        cue: [], harjoite: [], varmuus: 'ei_konseptia',
        syy: 'Seuraus, ei harjoiteltava taito — kehitä alla olevia taitoja + päätöksenteko (D4).' };
    }
    // §A.5 modifieri (weaker_foot) — ei konseptia, harjoitteen jalka-attribuutti.
    if (MODIFIERI[alue]) {
      return { tyyppi: 'modifieri', alue: alue, dim: dim, konsepti_avain: null, konsepti_nimi: null,
        fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, jalka: MODIFIERI[alue],
        havainnointi_vihje: false, cue: [], harjoite: [], varmuus: 'ei_konseptia',
        syy: 'Ei erillinen konsepti — harjoittele heikommalla jalalla muissa konsepteissa.' };
    }

    // §A.1 dispatch dimensiolla (dim tunnettu tai D2-kartasta pääteltävä).
    if (D2_KONSEPTI[alue] || dim === 'D2') {
      var konsepti = D2_KONSEPTI[alue];
      if (!konsepti) {
        return { tyyppi: 'teknis_taktinen', alue: alue, dim: 'D2', konsepti_avain: null, konsepti_nimi: null,
          fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
          cue: [], harjoite: [], varmuus: 'ei_konseptia', syy: 'D2-kohteelle ei kartoitettua konseptia.' };
      }
      return _teknisTulos(alue, konsepti, 'D2', pelaaja, ctx, 'lukittu',
        { harjoite_tagit: HARJOITE_TAGIT[alue] || null, alt: ALT_VIHJE[alue] || null,
          syy: 'Tavoitteesta ehdotettu: ' + _nimi(konsepti, ctx) + '.' });
    }
    if (dim === 'D4') {
      // §A.1 aktivoi KARTTA_A (tm_pelialy_yksilo): D4-taksonomia-avain → youth-konsepti-shortlist.
      var top = null;
      if (typeof ctx.tmPelialyYksiloEhdota === 'function') {
        var ehd = ctx.tmPelialyYksiloEhdota([alue], { sallitutKonseptit: ctx.sallitutKonseptit, konseptiNimi: ctx.konseptiNimi }) || [];
        if (ehd.length) top = ehd[0];
      }
      if (top && top.konsepti_avain) {
        var r = _teknisTulos(alue, top.konsepti_avain, 'D4', pelaaja, ctx, 'ehdotettu',
          { syy: top.syy || ('Tavoitteesta ehdotettu: ' + _nimi(top.konsepti_avain, ctx) + '.') });
        return r;
      }
      return { tyyppi: 'teknis_taktinen', alue: alue, dim: 'D4', konsepti_avain: null, konsepti_nimi: null,
        fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
        cue: [], harjoite: [], varmuus: 'ei_konseptia', syy: 'Peliäly-kohteelle ei konseptikarttaa (KARTTA_A puuttuu ctx:stä).' };
    }
    if (dim === 'D1') {
      return { tyyppi: 'fyysinen', alue: alue, dim: 'D1', konsepti_avain: null, konsepti_nimi: null,
        fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
        cue: [], harjoite: [], varmuus: 'ei_konseptia', route: 'fyysinen',
        syy: 'Fyysinen kehityskohde — reititä fyysiseen jaksoteemaan (ei teknis-taktista harjoitetta).' };
    }
    if (dim === 'D3' || dim === 'D5') {
      return { tyyppi: 'laadullinen', alue: alue, dim: dim, konsepti_avain: null, konsepti_nimi: null,
        fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
        cue: [], harjoite: [], varmuus: 'ei_konseptia',
        syy: (dim === 'D3' ? 'Henkinen' : 'Sosiaalinen') + ' kehityskohde — kehityskeskustelu/rooli, ei pakotettua harjoitetta.' };
    }
    // Tuntematon dim / ei kartoitettu.
    return { tyyppi: 'ei_konseptia', alue: alue, dim: dim, konsepti_avain: null, konsepti_nimi: null,
      fundamentti_avain: null, fundamentti_nimi: null, harjoite_tagit: null, havainnointi_vihje: false,
      cue: [], harjoite: [], varmuus: 'ei_konseptia', syy: 'Kohteelle ei kartoitettua kehityspolkua.' };
  }

  var API = {
    D2_KONSEPTI: D2_KONSEPTI, ALT_VIHJE: ALT_VIHJE, HARJOITE_TAGIT: HARJOITE_TAGIT,
    TULOSMITTARI: TULOSMITTARI, MODIFIERI: MODIFIERI, YOUTH_NIMI: YOUTH_NIMI,
    tmRatkaiseKehityspolku: tmRatkaiseKehityspolku
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_KEHITYSPOLKU = API;
})(typeof window !== 'undefined' ? window : this);
