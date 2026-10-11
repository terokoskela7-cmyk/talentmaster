/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_kyselyt.js — K35-1 · jaetut kalenterikyselyt (D192–D194; docs/KOKONAISKUVA_KAUSI_JAKSO_VIIKKO.md §2).
   PURE, toimii selaimessa JA Nodessa. Kopio functions/-kansioon tehdään siinä PR:ssä, joka ensimmäisenä käyttää tätä palvelimella (kaista Tero; pidetään identtisenä kuten tm_ryhmat.js). Riippuvuudet: tm_kalenteri_tyypit.js, tm_ryhmat.js.
   · TAUKO (D193, K35-6d D240): ainoa lähde on kalenteritapahtuma tyyppiä `seuran_tauko` TAI `joukkueen_vapaa` (rekisterin TAUKO_TYYPIT; aliakset tauko/loma kunnes data on tarkistettu). joukkueen_vapaa on aina joukkueeseen rajattu → koskee vain sitä joukkuetta.
     Ei env.tauot-syötettä, ei kausisuunnitelma.tauot-kenttää, ei kalenteri/tauot-kokoelmaa.
     tmKalTauot(tapahtumat, joukkueId?) → [{ nimi, a, b, alku, loppu }] · tmOnTauko(tapahtumat, pvm, joukkueId?) → { tauko, nimi?, alku?, loppu? }
     tmTaukopaivat(alku, loppu, tapahtumat, joukkueId?) → taukopäivien määrä välillä (molemmat päät mukana) — ikkunoiden pidennys, eskaloinnin 7 pv (D131).
     Tauko ilman joukkuetta koskee koko seuraa; joukkueelle rajattu tauko vain sitä joukkuetta.
   · SEURAAVA TAPAHTUMA: tmSeuraavaTapahtuma(tapahtumat, { joukkue?, ryhma?, pelaaja?, tyyppi?, nyt }) → { id, nimi, tyyppi, alkaa, paattyy, paikka, koko_paiva } | null
     käynnissä oleva lasketaan (paattyy ≥ nyt). Ei poistettuja, ei perutteja, ei taukoja. pelaaja → TM_RYHMAT.tmTapahtumaKuuluuPelaajalle (ryhmät ja poimitut mukana,
     henkilökunnan tapahtumat pois). tyyppi: avain tai lista (aliakset ratkaistaan). Käyttäjät: kehitystyöpöydän "Treenattiinko?", valmentajan Tänään (D142), pelaajan Viikko.
   Päivät Helsingin ajassa. Dual-export: module.exports || window.TM_KALENTERI_KYSELYT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _RY() { return _lib('./tm_ryhmat.js', 'TM_RYHMAT'); }

  function _ms(x) {
    if (x == null || x === '') return null;
    if (typeof x === 'number') return isFinite(x) ? x : null;
    if (x instanceof Date) return isNaN(x.getTime()) ? null : x.getTime();
    if (typeof x.toMillis === 'function') { try { return x.toMillis(); } catch (e) { return null; } }
    if (typeof x.seconds === 'number') return x.seconds * 1000;
    if (typeof x === 'string') { var t = Date.parse(x.length === 10 ? x + 'T12:00:00' : x); return isNaN(t) ? null : t; }
    return null;
  }
  /* Tapahtuman alku/loppu: VP:n Timestamp TAI Masterin muoto (pvm 'YYYY-MM-DD' + alkaa/paattyy 'HH:MM', paikallista aikaa).
     Master antaa lisäksi _alkaaMs/_paattyyMs (alkuperäiset ajat) — ne voittavat, koska HH:MM-muodosta puuttuu monipäiväisen tapahtuman loppupäivä. */
  function _aika(e, kentta) {
    var tarkka = kentta === 'alkaa' ? e._alkaaMs : e._paattyyMs; if (typeof tarkka === 'number' && isFinite(tarkka)) return tarkka;
    var x = e[kentta];
    if (typeof x === 'string' && /^\d{1,2}:\d{2}$/.test(x) && typeof e.pvm === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.pvm)) { var t = Date.parse(e.pvm + 'T' + (x.length === 4 ? '0' + x : x) + ':00'); return isNaN(t) ? null : t; }
    if (kentta === 'alkaa' && (x == null || x === '')) return _ms(e.pvm);
    return _ms(x);
  }
  var _fmt = null;
  function _paiva(ms) { try { _fmt = _fmt || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }); return _fmt.format(new Date(ms)); } catch (e) { var d = new Date(ms), z = function (x) { return (x < 10 ? '0' : '') + x; }; return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); } }
  function _norm(x) { return String(x == null ? '' : x).trim().toLowerCase(); }
  function _avain(t) { var T = _TY(); return T.tmKalTyyppiAvain ? T.tmKalTyyppiAvain(t) : _norm(t); }
  function _onTauko(t) { var T = _TY(); return T.tmKalOnTauko ? T.tmKalOnTauko(t) : _avain(t) === 'seuran_tauko'; }
  function _joukkueet(ev) { return [ev.joukkue].concat(Array.isArray(ev.joukkueet) ? ev.joukkueet : []).filter(Boolean).map(_norm); }

  function tmKalTauot(tapahtumat, joukkueId) {
    var j = joukkueId != null ? _norm(joukkueId) : null;
    return (Array.isArray(tapahtumat) ? tapahtumat : []).filter(function (e) {
      if (!e || e.poistettu === true || !_onTauko(e.tyyppi)) return false;
      var jj = _joukkueet(e); return !jj.length || (j != null && jj.indexOf(j) >= 0);
    }).map(function (e) {
      var a = _aika(e, 'alkaa'), b = e.paattyy != null && e.paattyy !== '' ? _aika(e, 'paattyy') : a;
      if (a == null) return null; if (b == null || b < a) b = a;
      return { nimi: e.nimi || null, a: a, b: b, alku: _paiva(a), loppu: _paiva(b) };
    }).filter(Boolean).sort(function (x, y) { return x.a - y.a; });
  }
  function tmOnTauko(tapahtumat, pvm, joukkueId) {
    var ms = _ms(pvm); if (ms == null) return { tauko: false };
    var p = _paiva(ms), L = tmKalTauot(tapahtumat, joukkueId);
    for (var i = 0; i < L.length; i++) if (L[i].alku <= p && p <= L[i].loppu) return { tauko: true, nimi: L[i].nimi, alku: L[i].alku, loppu: L[i].loppu };
    return { tauko: false };
  }
  function tmTaukopaivat(alku, loppu, tapahtumat, joukkueId) {
    var a = _ms(alku), b = _ms(loppu); if (a == null || b == null || b < a) return 0;
    var L = tmKalTauot(tapahtumat, joukkueId); if (!L.length) return 0;
    var n = 0, nahty = {}, DAY = 86400000;
    for (var t = a, k = 0; k < 800; t += DAY, k++) {
      var p = _paiva(t); if (p > _paiva(b)) break;
      if (nahty[p]) continue; nahty[p] = 1;
      for (var i = 0; i < L.length; i++) if (L[i].alku <= p && p <= L[i].loppu) { n++; break; }
    }
    return n;
  }

  function tmSeuraavaTapahtuma(tapahtumat, opts) {
    opts = opts || {};
    var nyt = _ms(opts.nyt); if (nyt == null) nyt = Date.now();
    var tyypit = opts.tyyppi == null ? null : (Array.isArray(opts.tyyppi) ? opts.tyyppi : [opts.tyyppi]).map(_avain);
    var j = opts.joukkue != null ? _norm(opts.joukkue) : null, r = opts.ryhma != null ? String(opts.ryhma) : null, pel = opts.pelaaja || null, RY = _RY();
    var paras = null;
    (Array.isArray(tapahtumat) ? tapahtumat : []).forEach(function (e) {
      if (!e || e.poistettu === true || e.tila === 'peruttu') return;
      var t = _avain(e.tyyppi); if (_onTauko(t)) return;
      if (tyypit && tyypit.indexOf(t) < 0) return;
      var a = _aika(e, 'alkaa'); if (a == null) return;
      var b = _aika(e, 'paattyy'); if (b == null || b < a) b = a;
      if (b < nyt) return;
      if (pel) { if (!RY.tmTapahtumaKuuluuPelaajalle || !RY.tmTapahtumaKuuluuPelaajalle(e, pel)) return; }
      if (j != null && _joukkueet(e).indexOf(j) < 0) return;
      if (r != null && !(e.kohde && String(e.kohde.ryhma_id) === r)) return;
      if (!paras || a < paras.alkaa) paras = { id: e.id != null ? e.id : null, nimi: e.nimi || '', tyyppi: t, alkaa: a, paattyy: b, paikka: e.paikka || null, koko_paiva: !!e.koko_paiva };
    });
    return paras;
  }

  var API = { tmKalTauot: tmKalTauot, tmOnTauko: tmOnTauko, tmTaukopaivat: tmTaukopaivat, tmSeuraavaTapahtuma: tmSeuraavaTapahtuma };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_KYSELYT = API;
})(typeof window !== 'undefined' ? window : null);
