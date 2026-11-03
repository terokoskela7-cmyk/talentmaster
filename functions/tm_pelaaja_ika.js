/* ════════════════════════════════════════════════════════════════════════
   tm_pelaaja_ika.js — 8–9 v -esto pelaaja-appiin (LASKUTUS_L1_VAIHE0 §7.6, PM päätös 8, 3.11.2026; kaista Tero)

   Sääntö: ikä = vuosi − syntymävuosi (kalenterivuoden aikana täytettävä, Helsingin vuosi). Ikä ≤ 9 → pelaaja-appi estetty
   (2026: syntynyt 2017 tai myöhemmin). Esto poistuu itsestään vuoden vaihteessa. Malli: Rulesin onU12HuoltajaIka.
   Syntymävuosi: syntymaVuosi (numero tai 'YYYY'), varalla syntymaaika (Timestamp | Date | ISO | { seconds }) Helsingin vuotena
   — sama tulkinta kuin tm_laskutus.js tmLaskutusIka (vartija: tests/pelaaja_ika.test.js).

   Tila (tmPelaajaAppTila):
     'ok'           → PIN, pelaajalinkki ja kirjautuminen sallittu
     'ika_alle_10'  → ei PIN:iä, ei pelaajalinkkiä, kirjautuminen hylätään (huoltaja käyttää Vanhempi-näkymää)
     'ika_puuttuu'  → myöntäminen fail-closed ("lisää syntymävuosi"); kirjautuminen SALLITAAN + audit (PM päätös 8)
   Sama tiedosto lib/ (Seura, Vanhempi_v2) ja functions/ (kopio: node scripts/sync_functions_lib.js).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var RAJA_IKA = 9;   // ikä ≤ 9 → estetty
  var SYY_ALLE = 'ika_alle_10', SYY_PUUTTUU = 'ika_puuttuu';

  function _kokonais(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function _hetki(x) {
    if (x == null) return null;
    if (typeof x.toDate === 'function') { try { return x.toDate(); } catch (e) { return null; } }
    if (x instanceof Date) return isNaN(x.getTime()) ? null : x;
    if (typeof x.seconds === 'number') return new Date(x.seconds * 1000);
    if (typeof x._seconds === 'number') return new Date(x._seconds * 1000);
    if (typeof x === 'number') return new Date(x);
    if (typeof x === 'string') { var d = new Date(x); return isNaN(d.getTime()) ? null : d; }
    return null;
  }
  /* Helsingin kalenterivuosi (oletus: nyt). Cloud Functions ajaa UTC:ssä → 1.1. klo 0–2 Suomessa on UTC:ssä vielä edellinen vuosi. */
  function tmHelsinkiVuosi(x) {
    var d = _hetki(x == null ? new Date() : x); if (!d) return null;
    try {
      var v = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', year: 'numeric' }).format(d);
      if (/^\d{4}$/.test(v)) return Number(v);
    } catch (e) { /* Intl-vyöhyke puuttuu → +2 h riittää vuodelle (vuodenvaihde on talviajassa) */ }
    return new Date(d.getTime() + 2 * 3600 * 1000).getUTCFullYear();
  }
  function tmPelaajaSyntymaVuosi(p) {
    var x = p || {}, sv = x.syntymaVuosi;
    if (typeof sv === 'string' && /^\d{4}$/.test(sv)) sv = Number(sv);
    if (!_kokonais(sv)) {
      var s = x.syntymaaika;
      if (typeof s === 'string' && /^\d{4}-\d{2}/.test(s) && !/T\d/.test(s)) sv = Number(s.slice(0, 4));
      else sv = s == null ? null : tmHelsinkiVuosi(s);
    }
    return _kokonais(sv) && sv > 1900 ? sv : null;
  }
  function tmPelaajaAppIka(p, vuosi) {
    var sv = tmPelaajaSyntymaVuosi(p), v = _kokonais(vuosi) ? vuosi : tmHelsinkiVuosi();
    return sv == null ? null : v - sv;
  }
  /* Vaihe 0:n nimi: true vain, kun ikä tiedetään ja se on ≤ 9. Puuttuva vuosi → false (ks. tmPelaajaAppTila). */
  function pelaajaAppEstettyIka(p, vuosi) { var ika = tmPelaajaAppIka(p, vuosi); return ika !== null && ika <= RAJA_IKA; }
  function tmPelaajaAppTila(p, vuosi) {
    var ika = tmPelaajaAppIka(p, vuosi);
    if (ika === null) return SYY_PUUTTUU;
    return ika <= RAJA_IKA ? SYY_ALLE : 'ok';
  }

  var API = { RAJA_IKA: RAJA_IKA, SYY_ALLE: SYY_ALLE, SYY_PUUTTUU: SYY_PUUTTUU, tmHelsinkiVuosi: tmHelsinkiVuosi,
    tmPelaajaSyntymaVuosi: tmPelaajaSyntymaVuosi, tmPelaajaAppIka: tmPelaajaAppIka, pelaajaAppEstettyIka: pelaajaAppEstettyIka, tmPelaajaAppTila: tmPelaajaAppTila };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_PELAAJA_IKA = API;
})(typeof window !== 'undefined' ? window : this);
