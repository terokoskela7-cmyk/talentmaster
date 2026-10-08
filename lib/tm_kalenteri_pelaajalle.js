/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_pelaajalle.js — pelaajan ja huoltajan kalenteri PALVELIMELLA (B4; docs/CODE_BRIEF_B4_PELAAJAN_KALENTERI.md). PURE (ei Firebase/DOM).
   Käyttö: functions/pelaajan_kalenteri.js (callable haePelaajanKalenteri) ja _c4Roster (ilmoitusjoukko) — SAMA sääntö, jotta ilmoitukset ja näkyvä kalenteri eivät eroa.
   JÄSENYYS (§7.18): pelaajan joukkueet = tmPelaajanJoukkueet(p, joukkueDocs) (joukkueet[] on totuus; `joukkue`-nimi ei LISÄÄ jäsenyyttä). Tapahtuman joukkuetunnisteet
     (ev.joukkue + ev.joukkueet[]) ratkaistaan samoille doc-id:ille (id tai normalisoitu id tai nimi); jos seuralla ei ole joukkue-doceja: normalisoitu tunnistevertailu joukkueet[]:iin. pelaajat_id lisää jäsenyyden (poimitut pelaajat / ryhmätapahtuma).
   NÄKYVYYS: tmNakyyPelaajalle (lib/tm_ryhmat.js) — nakyvyys:'henkilokunta' ja vanhat palaveritapahtumat ilman kenttää eivät näy.
   KENTTIEN SALLITTULISTA (ei muuta): ks. NAKYVAT_KENTAT / LOGISTIIKKA_KENTAT. Tapahtuman muut kentät (luoja_uid, muokkaaja_uid, osallistujat_uid, pelaajat_id, lasnaolo_kooste, valmentaja_rpe*, muistiinpanot…) EIVÄT lähde palvelimelta.
   IKKUNA: alkaa ∈ [tänään(Helsinki) − 7 pv, tänään + 30 pv]; tmPudotaVanhat: paattyy (tai alkaa, jos paattyy puuttuu) > 24 h menneisyydessä → pois (väljä raja kattaa aikavyöhyke-eron);
     jäljelle jääneistä 20 aikaisinta. Lopullinen päättymissuodatus (tmEvPaattynyt, paikallinen aika) tehdään selaimessa kuten ennen.
   Dual-export: module.exports || window.TM_KALENTERI_PELAAJALLE.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var NAKYVAT_KENTAT = ['nimi', 'tyyppi', 'paikka', 'pelaajaviesti', 'koko_paiva', 'pvm'];                     // sellaisenaan (merkkijono/boolean)
  var AJAT = ['alkaa', 'paattyy'];                                                                              // → ISO-merkkijono
  var LOGISTIIKKA_KENTAT = ['saapumisaika', 'peliasu', 'kartta_url', 'kimppakyyti'];
  var IKKUNA_ALKU_PV = -7, IKKUNA_LOPPU_PV = 30, MAX_TAPAHTUMAT = 20, VANHA_RAJA_MS = 24 * 3600 * 1000;

  function _req(nimi, polku) {
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { try { return require(polku); } catch (e) { return null; } }
    return root[nimi] || null;
  }
  function _J() { return _req('TM_JOUKKUE', './tm_joukkue.js'); }
  function _R() { return _req('TM_RYHMAT', './tm_ryhmat.js'); }

  function _pvm(v) {   // Firestore Timestamp | Date | ISO/pvm-merkkijono | ms | {seconds} → Date | null
    if (v == null || v === '') return null;
    var d = null;
    if (typeof v.toDate === 'function') d = v.toDate();
    else if (v instanceof Date) d = v;
    else if (typeof v === 'string') d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + 'T00:00:00Z') : new Date(v);
    else if (typeof v === 'number') d = new Date(v);
    else if (typeof v.seconds === 'number') d = new Date(v.seconds * 1000);
    return (d && !isNaN(d.getTime())) ? d : null;
  }
  function _norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[\s_]+/g, ''); }

  /* Tapahtuman joukkuetunniste → seuran joukkue-doc-id (tai null): tarkka id → normalisoitu id → kanoninen nimi (tm_joukkue.js). */
  function tmTunnisteDocIdksi(x, docs) {
    if (x == null || x === '' || !Array.isArray(docs)) return null;
    var i, d;
    for (i = 0; i < docs.length; i++) { d = docs[i]; if (d && String(d.id) === String(x)) return String(d.id); }
    for (i = 0; i < docs.length; i++) { d = docs[i]; if (d && _norm(d.id) === _norm(x)) return String(d.id); }
    var J = _J(), k = J && J.tmKanonisoiJoukkue ? J.tmKanonisoiJoukkue(x, docs) : null;
    return k ? String(k.id) : null;
  }

  /* Kuuluuko tapahtuma pelaajalle? pelaaja = { id, joukkue, joukkueet }, joukkueDocs [{id, nimi}]. */
  function tmKuuluuPelaajalle(ev, pelaaja, joukkueDocs) {
    if (!ev || !pelaaja || ev.poistettu) return false;
    var R = _R(); if (!R || !R.tmNakyyPelaajalle(ev)) return false;
    if (Array.isArray(ev.pelaajat_id) && ev.pelaajat_id.indexOf(pelaaja.id) >= 0) return true;
    var J = _J(); var omat = J ? J.tmPelaajanJoukkueet(pelaaja, joukkueDocs) : [];
    if (!omat.length) return false;
    var avaimet = [ev.joukkue].concat(Array.isArray(ev.joukkueet) ? ev.joukkueet : []);
    if (!Array.isArray(joukkueDocs) || !joukkueDocs.length) {   // seuralla ei joukkue-doceja (legacy): nimeä/tunnistetta ei voi kanonisoida → normalisoitu tunnistevertailu joukkueet[]:iin
      var ok = {}; omat.forEach(function (x) { ok[_norm(x)] = 1; });
      return avaimet.some(function (x) { return x != null && x !== '' && ok[_norm(x)]; });
    }
    for (var i = 0; i < avaimet.length; i++) { var id = tmTunnisteDocIdksi(avaimet[i], joukkueDocs); if (id && omat.indexOf(id) >= 0) return true; }
    return false;
  }

  /* Vanhempi kuin 24 h? (paattyy, tai alkaa jos paattyy puuttuu) */
  function tmPudotaVanhat(ev, nytMs) {
    var e = _pvm(ev && ev.paattyy) || _pvm(ev && ev.alkaa);
    if (!e) return false;   // ei aikaa → ei pudoteta tässä (kysely rajaa alkaa-kentällä)
    return e.getTime() < nytMs - VANHA_RAJA_MS;
  }

  /* Sallittulistattu projektio. omaSaatavuus: 'tulossa' | 'estynyt' | null. */
  function tmProjisoi(ev, omaSaatavuus) {
    var o = { id: ev.id };
    NAKYVAT_KENTAT.forEach(function (k) { if (ev[k] !== undefined && ev[k] !== null) o[k] = ev[k]; });
    AJAT.forEach(function (k) { var d = _pvm(ev[k]); if (d) o[k] = d.toISOString(); });
    if (ev.logistiikka && typeof ev.logistiikka === 'object') {
      var lg = {}; LOGISTIIKKA_KENTAT.forEach(function (k) { if (ev.logistiikka[k] !== undefined && ev.logistiikka[k] !== null) lg[k] = ev.logistiikka[k]; });
      if (Object.keys(lg).length) o.logistiikka = lg;
    }
    o.omaSaatavuus = omaSaatavuus || null;
    return o;
  }

  /* events: [{id, …tapahtumadoc}] → projisoidut, aikajärjestyksessä, enintään MAX_TAPAHTUMAT. saatavuudet: { evId: 'tulossa'|'estynyt' } (valinnainen; ks. tmValitseEnnenSaatavuutta). */
  function tmValitse(events, pelaaja, joukkueDocs, nytMs) {
    var arr = (events || []).filter(function (ev) { return tmKuuluuPelaajalle(ev, pelaaja, joukkueDocs) && !tmPudotaVanhat(ev, nytMs); });
    arr.sort(function (a, b) { var x = _pvm(a.alkaa) || _pvm(a.pvm), y = _pvm(b.alkaa) || _pvm(b.pvm); return (x ? x.getTime() : 0) - (y ? y.getTime() : 0); });
    return arr.slice(0, MAX_TAPAHTUMAT);
  }

  var API = { tmKuuluuPelaajalle: tmKuuluuPelaajalle, tmTunnisteDocIdksi: tmTunnisteDocIdksi, tmPudotaVanhat: tmPudotaVanhat, tmProjisoi: tmProjisoi, tmValitse: tmValitse,
    NAKYVAT_KENTAT: NAKYVAT_KENTAT, AJAT: AJAT, LOGISTIIKKA_KENTAT: LOGISTIIKKA_KENTAT, IKKUNA_ALKU_PV: IKKUNA_ALKU_PV, IKKUNA_LOPPU_PV: IKKUNA_LOPPU_PV, MAX_TAPAHTUMAT: MAX_TAPAHTUMAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KALENTERI_PELAAJALLE = API;
})(typeof window !== 'undefined' ? window : this);
