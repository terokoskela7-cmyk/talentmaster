/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_ilmoitus.js — kalenteritapahtuman päättyminen + ilmoituksen päivä (V2 P0.4 PR 1)
   Jaettu Pelaaja_v7 + Vanhempi_v2. PURE (ei Firebase/DOM). Paikallinen päivä (§7.26), EI UTC.
   · Tapahtuma näkyy päättymiseensä asti: paattyy; jos kellonaikaa ei ole (koko_paiva / pelkkä pvm / alkaa 00:00 ilman
     päättymistä) → paikallisen päivän loppu. Ennen: `alkaa < nyt` pudotti koko päivän tapahtuman päivän alussa ja kesken olevan alkuhetkellä.
   · Ilmoituksen päivä: 1) tapahtuma_alkaa  2) tapahtuma linkki 'kalenteri:<evId>':n kautta  3) muistutuksille luotu + 1 pv
     (CF kirjoittaa muistutuksen klo 17 päivää ennen). Muistutus/muutos piiloon kun tapahtuma on päättynyt; peruttu pysyy.
   Dual-export: module.exports || window.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  function _pvm(v) {   // Firestore Timestamp | Date | ISO/pvm-merkkijono | ms | {seconds} → Date | null
    if (v == null || v === '') return null;
    var d = null;
    if (typeof v.toDate === 'function') d = v.toDate();
    else if (v instanceof Date) d = v;
    else if (typeof v === 'string') d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00') : new Date(v);   // pelkkä pvm = PAIKALLINEN keskiyö
    else if (typeof v === 'number') d = new Date(v);
    else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
    return (d && !isNaN(d.getTime())) ? d : null;
  }
  function _paivanLoppu(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
  function _paivaIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function _onKeskiyo(d) { return d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0; }

  function tmEvAlku(ev) { return ev ? (_pvm(ev.alkaa) || _pvm(ev.pvm)) : null; }

  // Onko tapahtumalla oikea kellonaika? Ei: koko_paiva · pelkkä pvm · alkaa 00:00 ilman päättymistä (Master tallentaa tyhjän ajan 00:00:na).
  function tmEvOnKellonaika(ev) {
    if (!ev || ev.koko_paiva === true) return false;
    var a = _pvm(ev.alkaa);
    if (!a) return false;
    var p = _pvm(ev.paattyy);
    if (_onKeskiyo(a) && (!p || p.getTime() <= a.getTime())) return false;
    return true;
  }

  // Päättymishetki: paattyy; kellonajaton → paikallisen päivän loppu (monipäiväisessä paattyy-päivän loppu). Kellonaika mutta ei
  // (kelvollista) päättymistä → alkuhetki (ei keksitä kestoa).
  function tmEvPaattyy(ev) {
    var a = tmEvAlku(ev); if (!a) return null;
    var p = _pvm(ev.paattyy);
    var pidempi = (p && p.getTime() > a.getTime()) ? p : null;
    if (!tmEvOnKellonaika(ev)) return _paivanLoppu(pidempi || a);
    return pidempi || a;
  }
  function tmEvPaattynyt(ev, nyt) {
    var e = tmEvPaattyy(ev); if (!e) return false;
    return (nyt || new Date()).getTime() > e.getTime();
  }

  function tmIlmoitusEvId(n) {
    var m = n && typeof n.linkki === 'string' ? n.linkki.match(/^kalenteri:(.+)$/) : null;
    return m ? m[1] : null;
  }
  function _etsi(tapahtumat, id) {
    if (!tapahtumat || !id) return null;
    if (Array.isArray(tapahtumat)) { for (var i = 0; i < tapahtumat.length; i++) if (tapahtumat[i] && tapahtumat[i].id === id) return tapahtumat[i]; return null; }
    return tapahtumat[id] || null;
  }

  // Ilmoituksen tapahtumapäivä → { pvm:'YYYY-MM-DD', lahde } | null
  function tmIlmoitusPaiva(n, tapahtumat) {
    if (!n) return null;
    var a = _pvm(n.tapahtuma_alkaa);
    if (a) return { pvm: _paivaIso(a), lahde: 'tapahtuma_alkaa' };
    var ev = _etsi(tapahtumat, tmIlmoitusEvId(n));
    var ea = ev ? tmEvAlku(ev) : null;
    if (ea) return { pvm: _paivaIso(ea), lahde: 'tapahtuma' };
    if (n.tyyppi === 'muistutus') {
      var l = _pvm(n.luotu);
      if (l) return { pvm: _paivaIso(new Date(l.getFullYear(), l.getMonth(), l.getDate() + 1)), lahde: 'luotu' };
    }
    return null;
  }

  // 'tanaan' | 'huomenna' | 'myohemmin' | 'mennyt' (+ pvmTxt "6.10.")
  function tmIlmoitusPaivaTyyppi(pvmIso, nyt) {
    var n = nyt || new Date();
    var tanaan = _paivaIso(n), huomenna = _paivaIso(new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1));
    var m = String(pvmIso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    var txt = m ? (parseInt(m[3], 10) + '.' + parseInt(m[2], 10) + '.') : '';
    var tyyppi = pvmIso === tanaan ? 'tanaan' : pvmIso === huomenna ? 'huomenna' : (pvmIso && pvmIso < tanaan ? 'mennyt' : 'myohemmin');
    return { tyyppi: tyyppi, pvmTxt: txt };
  }

  // Näytetäänkö ilmoitus? Peruttu aina. Muistutus/muutos: piiloon kun tapahtuma on päättynyt (löytyvä tapahtuma → sen päättyminen;
  // muuten johdettu päivä → päivän loppu). Ei päivää → näkyy (ennallaan).
  function tmIlmoitusNakyvissa(n, tapahtumat, nyt) {
    if (!n) return false;
    if (n.tyyppi !== 'muistutus' && n.tyyppi !== 'muutos') return true;
    var t = (nyt || new Date()).getTime();
    var ev = _etsi(tapahtumat, tmIlmoitusEvId(n));
    if (ev && tmEvAlku(ev)) return !tmEvPaattynyt(ev, nyt);
    var p = tmIlmoitusPaiva(n, tapahtumat);
    if (!p) return true;
    var m = p.pvm.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return t <= _paivanLoppu(new Date(+m[1], +m[2] - 1, +m[3])).getTime();
  }

  // Rivi renderöitäväksi: { nakyvissa, runko, paiva } — muistutuksen kiinteä "Huomenna: " -etuliite poistetaan (CF kirjoitti sen
  // kirjoitushetken mukaan); kutsuja liittää suhteellisen päivän t()-tekstillä. Ei päivää → runko = teksti sellaisenaan, paiva null.
  function tmIlmoitusRivi(n, tapahtumat, nyt) {
    var teksti = String((n && n.teksti) || '');
    var paiva = null, runko = teksti;
    if (n && n.tyyppi === 'muistutus') {
      var p = tmIlmoitusPaiva(n, tapahtumat);
      if (p) { paiva = tmIlmoitusPaivaTyyppi(p.pvm, nyt); runko = teksti.replace(/^Huomenna:\s*/, ''); }
    }
    return { nakyvissa: tmIlmoitusNakyvissa(n, tapahtumat, nyt), runko: runko, paiva: paiva };
  }

  var API = { tmEvAlku: tmEvAlku, tmEvOnKellonaika: tmEvOnKellonaika, tmEvPaattyy: tmEvPaattyy, tmEvPaattynyt: tmEvPaattynyt,
    tmIlmoitusEvId: tmIlmoitusEvId, tmIlmoitusPaiva: tmIlmoitusPaiva, tmIlmoitusPaivaTyyppi: tmIlmoitusPaivaTyyppi,
    tmIlmoitusNakyvissa: tmIlmoitusNakyvissa, tmIlmoitusRivi: tmIlmoitusRivi };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TM_KALENTERI_ILM = API; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
