/* ════════════════════════════════════════════════════════════════════════
   tm_ical.js — K35-7a · kalenterisyöte RFC 5545 (iCalendar) -muotoon (D190). PURE (ei Firebasea, ei DOM:ia); kopio functions/-kansioon (functions/jaettu_lib.json).
   tmIcal(tapahtumat, { nimi, kieli, nyt, nimet }) → merkkijono (CRLF, rivitaitto 75 oktettia, TEXT-escapet \\ \; \, \n)
   · Syötteenä JO RAJATUT, projisoidut tapahtumat (functions/kalenteri_ical.js: rajaus lib/tm_kalenteri_pelaajalle.js — tmKuuluuPelaajalle/tmProjisoi tai tm_ryhmat tmNakyyKalenterissa; tämä lib ei rajaa mitään):
     { id, tyyppi, nimi?, joukkue_nimi?, paikka?, pelaajaviesti?, koko_paiva?, alkaa (ISO), paattyy? (ISO), tila?, versio?, paivitetty? (ISO) }
   · VCALENDAR: VERSION 2.0, PRODID, METHOD:PUBLISH, X-WR-CALNAME, REFRESH-INTERVAL / X-PUBLISHED-TTL PT1H. Ajat UTC (…Z); koko päivä VALUE=DATE (Helsingin kalenteripäivä; DTEND = viimeinen päivä + 1).
   · UID = <id>@talentmaster · SEQUENCE = versio (muokkauslaskuri), puuttuu → paivitetty-sekunnit, muuten 0 · peruttu → STATUS:CANCELLED, muuten CONFIRMED
   · SUMMARY = tyypin nimi rekisteristä (lib/tm_kalenteri_tyypit.js) + " · " + joukkueen nimi (ilman joukkuetta: + tapahtuman nimi, jos se eroaa tyypin nimestä) · LOCATION = paikka · DESCRIPTION = VAIN pelaajille tarkoitettu viesti (pelaajaviesti).
     Henkilökunnan muistiinpanoja, pelaajien nimiä tai muita kenttiä ei kirjoiteta syötteeseen (sallittulista; vartija tests/k35_7a_ical.test.js).
   · kieli: seuran kieli (fi|sv|en), fallback fi — LANGUAGE-parametri tekstikentille; tyyppien nimet opts.nimet[kieli][avain] (jos annettu), muuten rekisterin suomenkielinen nimi.
   Dual-export: module.exports || window.TM_ICAL.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _TY() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_kalenteri_tyypit.js'); } catch (e) { /* selain */ } return (root && root.TM_KALENTERI_TYYPIT) || {}; }
  var KIELET = ['fi', 'sv', 'en'];
  function _z(n, l) { var s = String(n); while (s.length < (l || 2)) s = '0' + s; return s; }
  function _ms(v) { if (v == null || v === '') return null; if (typeof v === 'number') return isFinite(v) ? v : null; if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime(); if (typeof v.toDate === 'function') return v.toDate().getTime(); var t = Date.parse(v); return isNaN(t) ? null : t; }
  function _utc(ms) { var d = new Date(ms); return d.getUTCFullYear() + _z(d.getUTCMonth() + 1) + _z(d.getUTCDate()) + 'T' + _z(d.getUTCHours()) + _z(d.getUTCMinutes()) + _z(d.getUTCSeconds()) + 'Z'; }
  var _fmt = null;
  function _helsinkiPaiva(ms) {   // 'YYYY-MM-DD' Helsingin ajassa
    try { _fmt = _fmt || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }); return _fmt.format(new Date(ms)); } catch (e) { var d = new Date(ms + 3 * 3600000); return d.getUTCFullYear() + '-' + _z(d.getUTCMonth() + 1) + '-' + _z(d.getUTCDate()); }
  }
  function _pv(iso, vrk) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso), u = Date.UTC(+m[1], +m[2] - 1, +m[3] + (vrk || 0)), d = new Date(u); return d.getUTCFullYear() + _z(d.getUTCMonth() + 1) + _z(d.getUTCDate()); }
  function tmIcalTeksti(s) { return String(s == null ? '' : s).replace(/\r\n|\r/g, '\n').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function _tavut(ch) { var c = ch.charCodeAt(0); return c < 0x80 ? 1 : (c < 0x800 ? 2 : (c >= 0xD800 && c <= 0xDBFF ? 4 : 3)); }
  /* Rivitaitto RFC 5545 §3.1: enintään 75 oktettia riviä kohti (CRLF ei mukana), jatkorivi alkaa välilyönnillä; monitavuista merkkiä ei katkaista */
  function tmIcalTaita(rivi) {
    var ulos = [], nyt = '', n = 0, raja = 75, i, ch, b;
    for (i = 0; i < rivi.length; i++) {
      ch = rivi[i]; if (ch.charCodeAt(0) >= 0xD800 && ch.charCodeAt(0) <= 0xDBFF && i + 1 < rivi.length) { ch += rivi[++i]; }
      b = _tavut(ch); if (n + b > raja) { ulos.push(nyt); nyt = ' '; n = 1; raja = 75; }
      nyt += ch; n += b;
    }
    ulos.push(nyt); return ulos.join('\r\n');
  }
  function _rivi(nimi, arvo, params) { return tmIcalTaita(nimi + (params || '') + ':' + arvo); }
  function _sequence(ev) { var v = ev.versio; if (typeof v === 'number' && isFinite(v) && v >= 0) return Math.floor(v); var p = _ms(ev.paivitetty); return p != null ? Math.floor(p / 1000) : 0; }
  function _tyyppiNimi(avain, opts, kieli) { var N = opts.nimet && opts.nimet[kieli]; if (N && N[avain]) return N[avain]; var T = _TY(); return T.tmKalTyyppi ? T.tmKalTyyppi(avain).nimi : String(avain || ''); }
  function _summary(ev, opts, kieli) {
    var T = _TY(), avain = T.tmKalTyyppiAvain ? T.tmKalTyyppiAvain(ev.tyyppi) : ev.tyyppi, tn = _tyyppiNimi(avain, opts, kieli);
    if (ev.joukkue_nimi) return tn + ' · ' + ev.joukkue_nimi;
    return ev.nimi && ev.nimi !== tn ? tn + ' · ' + ev.nimi : tn;
  }
  function _vevent(ev, opts, kieli, nytMs) {
    var a = _ms(ev.alkaa); if (a == null || ev.id == null) return null;
    var b = _ms(ev.paattyy), L = ';LANGUAGE=' + kieli, r = ['BEGIN:VEVENT', _rivi('UID', tmIcalTeksti(ev.id) + '@talentmaster'), 'DTSTAMP:' + _utc(_ms(ev.paivitetty) != null ? _ms(ev.paivitetty) : nytMs)];
    if (ev.koko_paiva === true) {
      var alku = _helsinkiPaiva(a), loppu = b != null && b > a ? _helsinkiPaiva(b - 1000) : alku;   // paattyy 23:59 tai seuraavan päivän 00:00 → viimeinen päivä
      r.push('DTSTART;VALUE=DATE:' + _pv(alku, 0), 'DTEND;VALUE=DATE:' + _pv(loppu < alku ? alku : loppu, 1));
    } else { r.push('DTSTART:' + _utc(a), 'DTEND:' + _utc(b != null && b > a ? b : a + 3600000)); }   // loppu puuttuu → 1 h
    r.push('SEQUENCE:' + _sequence(ev), 'STATUS:' + (ev.tila === 'peruttu' || ev.tila === 'peruutettu' ? 'CANCELLED' : 'CONFIRMED'), _rivi('SUMMARY', tmIcalTeksti(_summary(ev, opts, kieli)), L));
    if (ev.paikka) r.push(_rivi('LOCATION', tmIcalTeksti(ev.paikka), L));
    if (ev.pelaajaviesti) r.push(_rivi('DESCRIPTION', tmIcalTeksti(ev.pelaajaviesti), L));
    r.push('END:VEVENT'); return r.join('\r\n');
  }
  function tmIcal(tapahtumat, opts) {
    opts = opts || {}; var kieli = KIELET.indexOf(opts.kieli) >= 0 ? opts.kieli : 'fi', nytMs = _ms(opts.nyt) != null ? _ms(opts.nyt) : Date.now();
    var rivit = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TalentMaster//Kalenteri//' + kieli.toUpperCase(), 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', _rivi('X-WR-CALNAME', tmIcalTeksti(opts.nimi || 'TalentMaster'), ';LANGUAGE=' + kieli), 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
    (Array.isArray(tapahtumat) ? tapahtumat : []).forEach(function (ev) { var v = ev && _vevent(ev, opts, kieli, nytMs); if (v) rivit.push(v); });
    rivit.push('END:VCALENDAR'); return rivit.join('\r\n') + '\r\n';
  }
  var API = { tmIcal: tmIcal, tmIcalTeksti: tmIcalTeksti, tmIcalTaita: tmIcalTaita, KIELET: KIELET };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_ICAL = API;
})(typeof window !== 'undefined' ? window : null);
