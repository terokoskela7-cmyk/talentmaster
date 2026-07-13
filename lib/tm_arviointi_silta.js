/* ════════════════════════════════════════════════════════════════════════
   tm_arviointi_silta.js — Vaihe 5: arviointi → resepti -silta PURE-ydin.
   Kääntää Palloliitto-arvioinnin (havaittu 1–5) reseptiksi: heikoin havaittu
   D2-ominaisuus → ehdotettu OMA_VERSIO-konsepti (jaksofokus-ehdotus, ei pakko §4).
   EI yhdistä kehyksiä (asteikot erillään, ARVIOINTIKEHYS_VS_CURRICULUM §3) — vain
   kääntää tuloksen ehdotukseksi. PURE (EI window/DOM/Firestore); vaihe-gating +
   konsepti_nimi tulevat ctx:n kautta (kutsuja resolvoi tmTtItems/libistä).
   Dual-export: module.exports (Vitest) || window.TM_ARVIOINTI_SILTA. §4·§26·§28·§34.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // LUKITUT PARIT (Tero validoinut) — VAIN D2 (teknis-taktinen). D1/D3/D5 EIVÄT tuota
  // teknis-taktista konseptia; D4 (peliäly) → 4d joukkueteema (vaihe 5.1, ei tässä).
  // ⚠ I3a (SSOT): looginen silta on siirtynyt `lib/tm_kehityspolku.js` (D2_KONSEPTI) -resolveriin, joka
  //   KORJAA tämän kartan mäppäysvirheen: `dribbling → y_h3` (ei y_h4 — Y-H4 Harhauttaminen syntyy D4-pelihavainnosta,
  //   ei D2:sta, §A.7). Tämä SILTA_MAP on Vaihe 5:n legacy-polku (säilytetään taaksepäinyhteensopivuuden vuoksi);
  //   uudet I3a-kytkennät (toimintakortti/IDP-silta) käyttävät resolveria. Älä laajenna tätä — päivitä D2_KONSEPTI.
  var SILTA_MAP = {
    dribbling: 'y_h4',          // Kuljetus ahtaassa → harhautus/1v1  (I3a-resolver korjaa → y_h3)
    running_with_ball: 'y_h3',  // Kuljetus tilaan → porttikuljetus
    ball_control: 'y_h1',       // Pallonhallinta → ensimmäinen kosketus
    ball_protection: 'y_h5',    // Pallon suojaus → suojaus paineessa
    short_passing: 'y_h2',      // Lyhyt syöttö → syöttö eteenpäin
    link_up: 'y_h6',            // Yhteispeli → tukipeli/tarjoutuminen
    finishing: 'y_h9'           // Viimeistely → viimeistely/laukaus
  };
  var SILTA_NIMET = {
    dribbling: 'Kuljetus ahtaassa', running_with_ball: 'Kuljetus tilaan', ball_control: 'Pallonhallinta',
    ball_protection: 'Pallon suojaus', short_passing: 'Lyhyt syöttö', link_up: 'Yhteispeli', finishing: 'Viimeistely'
  };
  // Tasapelissä (sama arvo) suositaan PERUSTAITOJA (pieni index = korkea prioriteetti):
  // pallonhallinta/kosketus ennen viimeistelyä (§4b.1). Ihmisen arvio voittaa numeron → näytä top-3.
  var SILTA_PRIORITEETTI = ['ball_control', 'short_passing', 'running_with_ball', 'ball_protection', 'dribbling', 'link_up', 'finishing'];

  function _prio(pk) { var i = SILTA_PRIORITEETTI.indexOf(pk); return i < 0 ? 999 : i; }
  function _set(arr) { var s = {}; (arr || []).forEach(function (x) { s[x && x.avain ? x.avain : x] = 1; }); return s; }

  // tmSiltaEhdota(arviointi_havaittu, ctx) → top-3 ehdotusta (heikoin ensin, tasapeli → perustaito).
  // arviointi_havaittu: { palloliitto_avain: 1..5 | null(N/A) }. ctx (kaikki valinnaisia):
  //   sallitutKonseptit: [avain|{avain}] (vaihe-gating, tmTtItems); jos annettu → suodata konseptit tähän joukkoon.
  //   konseptiNimi: fn(avain)→nimi (libistä §34); oletus = avain.
  // → [{palloliitto_avain, palloliitto_nimi, arvo, konsepti_avain, konsepti_nimi, syy}]. Tyhjä = graceful.
  function tmSiltaEhdota(havaittu, ctx) {
    ctx = ctx || {};
    if (!havaittu || typeof havaittu !== 'object') return [];
    var sallitut = ctx.sallitutKonseptit ? _set(ctx.sallitutKonseptit) : null;
    var nimiFn = (typeof ctx.konseptiNimi === 'function') ? ctx.konseptiNimi : null;
    var kand = [];
    Object.keys(SILTA_MAP).forEach(function (pk) {
      var arvo = havaittu[pk];
      if (typeof arvo !== 'number' || arvo < 1 || arvo > 5) return;   // puuttuu / N/A / ei-numero → ohita
      var ka = SILTA_MAP[pk];
      if (sallitut && !sallitut[ka]) return;                          // vaihe-gating (§28: D2 = tekninen ikkuna)
      kand.push({ pk: pk, arvo: arvo, ka: ka });
    });
    kand.sort(function (a, b) { return a.arvo - b.arvo || _prio(a.pk) - _prio(b.pk); });
    return kand.slice(0, 3).map(function (x, i) {
      return {
        palloliitto_avain: x.pk,
        palloliitto_nimi: SILTA_NIMET[x.pk] || x.pk,
        arvo: x.arvo,
        konsepti_avain: x.ka,
        konsepti_nimi: nimiFn ? (nimiFn(x.ka) || x.ka) : x.ka,
        syy: (i === 0 ? 'Heikoin havaittu: ' : 'Havaittu: ') + (SILTA_NIMET[x.pk] || x.pk) + ' (' + x.arvo + '/5)'
      };
    });
  }

  var API = { SILTA_MAP: SILTA_MAP, SILTA_NIMET: SILTA_NIMET, SILTA_PRIORITEETTI: SILTA_PRIORITEETTI, tmSiltaEhdota: tmSiltaEhdota };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_ARVIOINTI_SILTA = API;
})(typeof window !== 'undefined' ? window : this);
