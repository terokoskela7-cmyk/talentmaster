/* ════════════════════════════════════════════════════════════════════════
   tm_kirjaus_tyypit.js — pelaajan omatoimisen kirjauksen tyyppi selkokielelle valmentajalle (Master Viestit/Inbox + Pulssi).
   YKSI TOTUUS: pelaaja kirjaa `kirjaukset/{pvm}.tyyppi` = 'D' | 'S' | 'T' | 'joukkue' | 'vapaa' (Pelaaja_v7 _tallennaKirjaus) — kirjain EI koskaan
   saa näkyä sellaisenaan. Vapaassa kirjauksessa laji on `konteksti` (pihapeli, kaveri, keho, pallo, muu); vanhoissa tapahtumissa laji oli `tyyppi`.
   · tmKirjausOtsikko(e, o) → kortin otsikko (tuntematon koodi → "Kirjasi treenin")
   · tmKirjausAlarivi(e, o) → harjoitteen nimi (`harjoite_nimi`, ≤ 80 merkkiä) tai vapaan liikkeen laji; null jos ei lisätietoa
   · tmKirjausRivi(e, o)    → "Otsikko · alarivi" yhteen riviin (Pulssi)
   Teksti kulkee o.t(fi):n läpi (masterT); ilman sitä fi. Palautetut merkkijonot EIVÄT ole HTML-escapattuja (kutsuja escapaa).
   Dual-export: module.exports || window.TM_KIRJAUS_TYYPIT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TYYPIT = { D: 'Päivän harjoitus', S: 'Kohdennettu kehitys', T: 'Pallo joka päivä', joukkue: 'Joukkueharjoitus', vapaa: 'Omatoiminen treeni', individual: 'Omatoimi', team: 'Joukkueharjoitus' };
  var LAJIT = { pihapeli: 'Pihapeli', uinti: 'Uintia', pyora: 'Pyöräily', pallo: 'Palloleikki', metsa: 'Metsässä', muu: 'Muu liike', kaveri: 'Kaverin kanssa', keho: 'Oma keho' };
  var OLETUS = 'Kirjasi treenin';
  var MAX_NIMI = 80;
  function _t(o, fi) { return (o && typeof o.t === 'function') ? o.t(fi) : fi; }
  function _has(m, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(m, k); }
  function _nimi(s) { return (typeof s === 'string' && s.trim()) ? s.trim().slice(0, MAX_NIMI) : null; }
  /* Harjoitteen nimi: saman päivän sessiot[]:sta kirjauksen tyyppiä vastaava (päivädokin ylätaso on viimeisin kirjaus), muuten ylätason kenttä. */
  function tmKirjausHarjoiteNimi(e) {
    if (!e) return null;
    var ss = Array.isArray(e.sessiot) ? e.sessiot : [];
    for (var i = 0; i < ss.length; i++) if (ss[i] && ss[i].tyyppi === e.tyyppi && _nimi(ss[i].harjoite_nimi)) return _nimi(ss[i].harjoite_nimi);
    return _nimi(e.harjoite_nimi);
  }
  function tmKirjausOtsikko(e, o) {
    var k = e && e.tyyppi;
    if (_has(TYYPIT, k)) return _t(o, TYYPIT[k]);
    if (_has(LAJIT, k)) return _t(o, LAJIT[k]);   // vanha tapahtuma: laji tyyppinä
    return _t(o, OLETUS);
  }
  function tmKirjausAlarivi(e, o) {
    if (!e) return null;
    var nimi = tmKirjausHarjoiteNimi(e);
    if (nimi) return nimi;
    var k = e.tyyppi;
    if ((k === 'vapaa' || k === 'T') && _has(LAJIT, e.konteksti)) return _t(o, LAJIT[e.konteksti]);
    return null;
  }
  function tmKirjausRivi(e, o) {
    var a = tmKirjausAlarivi(e, o), t = tmKirjausOtsikko(e, o);
    return a && a !== t ? t + ' · ' + a : t;
  }
  var API = { tmKirjausOtsikko: tmKirjausOtsikko, tmKirjausAlarivi: tmKirjausAlarivi, tmKirjausRivi: tmKirjausRivi, tmKirjausHarjoiteNimi: tmKirjausHarjoiteNimi, TYYPIT: TYYPIT, LAJIT: LAJIT, MAX_NIMI: MAX_NIMI };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KIRJAUS_TYYPIT = API;
})(typeof window !== 'undefined' ? window : this);
