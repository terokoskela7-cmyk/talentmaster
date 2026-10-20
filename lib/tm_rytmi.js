/* ════════════════════════════════════════════════════════════════════════
   tm_rytmi.js — K1d (Tero 20.10.2026): YHTEENVETORYTMI yhdessä paikassa (PURE; ei Firebasea, ei DOMia). laskeReviewKadenssi (lib/tm_eerikkila_normit.js) delegoi tänne.
   Rytmi = "jakson yhteenveto tai kehityskeskustelu viimeistään N pv välein": ikä ≥ 12 v → 42 pv · 9–11 v → 84 pv; erääntymässä kun ≤ 14 pv jäljellä.
   tmRytmi(p, nytMs, { ikakaista, ika, eraantymassaPv }) → { status, raakaStatus, jaksoHoitaa, eraantyyPvm, ylimaaraPv, viimeisinPvm, tyyppi, ikakaista, valiPv, ika, edellinenPv, jakso:{kaynnissa, alkuPvm, loppuPvm, nimi} }
   SÄÄNNÖT:
   · Edellinen yhteenveto/keskustelu = myöhäisin näistä: pelaajan review_viimeisin_pvm (kehityskeskustelu, MDT, TAI jakson yhteenveto joka kirjoittaa sen) ja — vain luku, ei datamuutosta —
     viimeisin suljettu jakso (jaksofokus_historia[].sulkutapa 'suljettu', päivä = suljettu). Näin ennen K1d:tä suljetut jaksot nollaavat rytmin ilman migraatiota.
   · Jakso käynnissä (sama sääntö kuin tmJaksoTila: konsepti/ohjelma, ei 'valittavana', alku tiedossa, loppu = alku + kesto_vk × 7 pv > tänään) ja jakso päättyy viimeistään eräpäivänä
     → jakson yhteenveto hoitaa asian: status 'ajantasalla' (raakaStatus säilyy). Jakso päättyy eräpäivän JÄLKEEN → status raaka (erääntymässä/myöhässä) ja ilmoitus kertoo molemmat päivät.
   · Päivälaskenta KALENTERIPÄIVINÄ (paikallinen päivä, §7.26): sama tulos UTC:ssä ja Helsingissä, kellonsiirto ei siirrä päivää.
   Dual-export: module.exports || window.TM_RYTMI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var PV = 86400000;
  function _ms(d) {
    if (d == null) return null;
    if (typeof d === 'number') return d;
    if (d instanceof Date) return d.getTime();
    if (typeof d === 'object' && d.toDate) { try { return d.toDate().getTime(); } catch (e) { return null; } }
    var s = String(d), m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    var t = new Date(s).getTime(); return isNaN(t) ? null : t;
  }
  function _paiva(v) { var ms = _ms(v); if (ms == null || isNaN(ms)) return null; var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }   // paikallisen päivän keskiyö (aikaleima → paikallinen päivä, date-only sellaisenaan)
  function _lisaa(ms, n) { var d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime(); }
  function _ero(a, b) { return Math.round((b - a) / PV); }   // b − a kalenteripäivinä
  function _str(ms) { var d = new Date(ms), m = d.getMonth() + 1, p = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (p < 10 ? '0' : '') + p; }

  /* Käynnissä oleva jakso (pvm-merkkijonoina) tai { kaynnissa:false } */
  function tmRytmiJakso(jf, nytPaiva) {
    var tyhja = { kaynnissa: false, alkuPvm: null, loppuPvm: null, nimi: null };
    if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi || jf.ohjelma) || jf.tila === 'valittavana') return tyhja;
    var al = _paiva(jf.alkoi != null && jf.alkoi !== '' ? jf.alkoi : jf.alku); if (al == null) return tyhja;
    var lo = _lisaa(al, (Number(jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : 4) * 7);
    return { kaynnissa: lo > nytPaiva, alkuPvm: _str(al), loppuPvm: _str(lo), nimi: jf.konsepti_nimi || null };
  }
  /* Edellinen yhteenveto/keskustelu: { paiva (ms), pvm, tyyppi } | null */
  function tmRytmiEdellinen(p, nytPaiva) {
    var v = _paiva(p.review_viimeisin_pvm), tyyppi = p.review_viimeisin_tyyppi || null, pvm = p.review_viimeisin_pvm;
    (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).forEach(function (r) {
      if (!r || r.sulkutapa !== 'suljettu' || !r.suljettu) return;
      var d = _paiva(r.suljettu); if (d == null || d > nytPaiva) return;
      if (v == null || d > v) { v = d; tyyppi = 'jakso'; pvm = _str(d); }
    });
    return v == null ? null : { paiva: v, pvm: pvm, tyyppi: tyyppi };
  }
  function tmRytmi(p, nytMs, o) {
    p = p || {}; o = o || {}; var nytPaiva = _paiva(nytMs != null ? nytMs : Date.now()), kaista = o.ikakaista || 84, erPv = o.eraantymassaPv != null ? o.eraantymassaPv : 14;
    var jakso = tmRytmiJakso(p.jaksofokus, nytPaiva), ed = tmRytmiEdellinen(p, nytPaiva);
    var pohja = { ikakaista: kaista, valiPv: kaista, ika: o.ika != null ? o.ika : null, jakso: jakso };
    if (!ed) return Object.assign({ status: 'ei_reviewia', raakaStatus: 'ei_reviewia', jaksoHoitaa: false, eraantyyPvm: null, ylimaaraPv: null, viimeisinPvm: null, tyyppi: null, edellinenPv: null }, pohja);
    var er = _lisaa(ed.paiva, kaista), yli = _ero(er, nytPaiva);   // >0 = myöhässä
    var raaka = yli > 0 ? 'myohassa' : (yli >= -erPv ? 'eraantymassa' : 'ajantasalla');
    var hoitaa = raaka !== 'ajantasalla' && jakso.kaynnissa && jakso.loppuPvm <= _str(er);
    return Object.assign({ status: hoitaa ? 'ajantasalla' : raaka, raakaStatus: raaka, jaksoHoitaa: hoitaa, eraantyyPvm: _str(er), ylimaaraPv: yli, viimeisinPvm: ed.pvm, tyyppi: ed.tyyppi, edellinenPv: _ero(ed.paiva, nytPaiva) }, pohja);
  }

  var API = { tmRytmi: tmRytmi, tmRytmiJakso: tmRytmiJakso, tmRytmiEdellinen: tmRytmiEdellinen };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_RYTMI = API;
})(typeof window !== 'undefined' ? window : this);
