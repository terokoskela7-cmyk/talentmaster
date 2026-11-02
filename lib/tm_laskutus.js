/* ════════════════════════════════════════════════════════════════════════
   tm_laskutus.js — Laskutus L1 (PM 2.11.2026, .briefit/CODE_BRIEF_LASKUTUS_L1.md + vaihe 0 -päätökset).
   PUHDAS laskenta: ei Firebasea, ei verkkoa. Sama tiedosto selaimessa (Admin "Laskutus") ja Cloud Functionsissa
   (functions/tm_laskutus.js = tavu tavulta sama kopio, jaettu_lib.json). Rahat SENTTEINÄ kokonaislukuina.

   Säännöt (sopimus Sibbo 1.11.2026 + PM:n päätökset):
   · Vain sopimusseura: asetukset.laskutettava === true JA laskentakuukausi ≥ sopimus_alkaen. Muuten ei laskua.
   · Seuralisenssi joka kuukausi sopimuksen alusta, myös ilman aktiivisia joukkueita.
   · Joukkue lasketaan vain, jos laskutustila === 'aktiivinen' (puuttuva = passiivinen).
   · Laskutettava joukkue = vähintään yksi aktiivinen rooli 'valmentaja' -käyttäjä, jolla joukkue on kayttajat.joukkueet[]:ssä.
     Aktiivinen joukkue ilman valmentajaa → 0 € + varoitus (SA ratkaisee), PAITSI jos SA:n ohitus laskutus_vastuuvalmentaja_ok === true (vastuuvalmentaja_sa). Ryhmät (seurat/{sid}/ryhmat) eivät ole joukkueita.
   · Pelaaja lasketaan KERRAN: pääjoukkueessa, jos se on aktiivinen; muuten ensimmäisessä aktiivisessa joukkueessaan.
     Pääjoukkue = näyttönimen (joukkue/joukkueNimi) joukkue, jos se on jäsenyyksissä (tmPelaajanJoukkueet, §7.18); muuten jäsenyyksien järjestys.
   · Ikä = laskentakuukauden vuosi − syntymaVuosi (varalla syntymaaika:n vuosi). Ikä < maksuton_alle_ika (10) → 0 €. Ikä puuttuu → maksullinen + merkintä.
   · Suostumus = functions/suostumus.js suostumusAnnettu (kanoninen): suostumusTila === 'annettu' || suostumus.annettu.
   · Laskentaperuste 'suostumus' (vain suostumukselliset) | 'lista' (koko lista). Välimalli: lista_alkaen_kk_aktivoinnista = n (vain peruste 'lista'):
     joukkueen kuukaudet 1..n aktivoinnista (laskutus_aktivoitu.pvm, ensimmäinen aktivointi; aktivointikuukausi = 1) lasketaan 'suostumus'-säännöllä, sen jälkeen 'lista'.
   · Joukkueen summa = min(maksulliset × hinta, katto). Seuran summa = seuralisenssi + joukkueiden summat. alv kenttänä (0 %).
   Dual-export: module.exports || window.TM_LASKUTUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _PJ() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_joukkue.js'); } catch (e) { /* ei */ } return root ? { tmPelaajanJoukkueet: root.tmPelaajanJoukkueet, tmKanonisoiJoukkue: root.tmKanonisoiJoukkue } : null; }

  var PERUSTEET = ['suostumus', 'lista'];
  var OLETUS = Object.freeze({ seuralisenssi_snt: 8000, hinta_pelaaja_snt: 100, joukkuekatto_snt: 2500, laskentaperuste: 'suostumus', lista_alkaen_kk_aktivoinnista: null,
    maksuton_alle_ika: 10, alv_prosentti: 0, voimassa_alkaen: '2026-11', laskutettava: false, sopimus_alkaen: null });
  var SNT = ['seuralisenssi_snt', 'hinta_pelaaja_snt', 'joukkuekatto_snt'];
  var KK_RE = /^(\d{4})-(\d{2})$/;

  function _kokonais(x) { return typeof x === 'number' && isFinite(x) && Math.floor(x) === x; }
  /* 'YYYY-MM' → kuukausi-indeksi (vuosi*12 + kk-1); virheellinen → null */
  function tmLaskutusKkIndeksi(kk) { var m = KK_RE.exec(String(kk || '')); if (!m) return null; var k = Number(m[2]); return k >= 1 && k <= 12 ? Number(m[1]) * 12 + k - 1 : null; }
  /* KAIKKI laskutuksen päivät ja kuukaudet Suomen ajassa (Europe/Helsinki), ei UTC:ssä eikä ajoympäristön vyöhykkeessä
     (Cloud Functions = UTC; 1.12. klo 0–2 Suomessa on UTC:ssä vielä 30.11.). Ensisijaisesti Intl; jos Intl-vyöhyke puuttuu,
     EU:n kesäaikasääntö (EEST +3 h maaliskuun viim. sunnuntai 01 UTC → lokakuun viim. sunnuntai 01 UTC, muuten EET +2 h). */
  function _kaksi(n) { return (n < 10 ? '0' : '') + n; }
  function _viimSunnuntai01Utc(v, kk0) { var loppu = new Date(Date.UTC(v, kk0 + 1, 0)); return Date.UTC(v, kk0, loppu.getUTCDate() - loppu.getUTCDay(), 1); }
  function _helsinkiOsat(d) {
    try {
      var o = {}; new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
      if (/^\d{4}$/.test(o.year) && /^\d{2}$/.test(o.month) && /^\d{2}$/.test(o.day)) return { v: o.year, kk: o.month, pv: o.day };
    } catch (e) { /* Intl-vyöhyke puuttuu → sääntö alla */ }
    var ms = d.getTime(), v = d.getUTCFullYear(), kesa = ms >= _viimSunnuntai01Utc(v, 2) && ms < _viimSunnuntai01Utc(v, 9), x = new Date(ms + (kesa ? 3 : 2) * 3600000);
    return { v: String(x.getUTCFullYear()), kk: _kaksi(x.getUTCMonth() + 1), pv: _kaksi(x.getUTCDate()) };
  }
  /* Date | Firestore Timestamp {toDate}|{seconds} | ISO-aikaleima → Date tai null */
  function _hetki(x) {
    if (typeof x === 'string') x = new Date(x);
    var d = (typeof x.toDate === 'function') ? x.toDate() : (x instanceof Date ? x : (typeof x.seconds === 'number' ? new Date(x.seconds * 1000) : null));
    return d && !isNaN(d.getTime()) ? d : null;
  }
  /* Päivämäärä ('YYYY-MM-DD' | ISO-aikaleima | Date | Firestore Timestamp {toDate}|{seconds}) → 'YYYY-MM' Helsingin ajassa; pelkkä päivä 'YYYY-MM-DD' otetaan sellaisenaan. */
  function tmLaskutusKk(x) {
    if (x == null) return null;
    if (typeof x === 'string' && !/T\d/.test(x)) { var m = /^(\d{4})-(\d{2})/.exec(x); return m ? m[1] + '-' + m[2] : null; }
    var d = _hetki(x); if (!d) return null;
    var o = _helsinkiOsat(d); return o.v + '-' + o.kk;
  }
  /* Helsingin päivä 'YYYY-MM-DD' (oletus: nyt). laskutus_aktivoitu.pvm ja laskutustila_muutettu.pvm kirjoitetaan tällä. */
  function tmLaskutusPaiva(x) {
    var d = _hetki(x == null ? new Date() : x); if (!d) return null;
    var o = _helsinkiOsat(d); return o.v + '-' + o.kk + '-' + o.pv;
  }

  /* Oletus + seurakohtainen ohitus → { ok, asetukset, virhe }. Vain tunnetut avaimet; virheellinen arvo = virhe (ei hiljaista oletusta — laskun peruste). */
  function tmLaskutusAsetukset(oletus, seura) {
    var a = Object.assign({}, OLETUS);
    [oletus, seura].forEach(function (lahde) { if (lahde && typeof lahde === 'object') Object.keys(OLETUS).forEach(function (k) { if (lahde[k] !== undefined) a[k] = lahde[k]; }); });
    for (var i = 0; i < SNT.length; i++) if (!_kokonais(a[SNT[i]]) || a[SNT[i]] < 0) return { ok: false, asetukset: a, virhe: SNT[i] + ' ei ole ei-negatiivinen kokonaisluku (sentit)' };
    if (PERUSTEET.indexOf(a.laskentaperuste) < 0) return { ok: false, asetukset: a, virhe: 'tuntematon laskentaperuste: ' + a.laskentaperuste };
    if (a.lista_alkaen_kk_aktivoinnista !== null) {
      if (!_kokonais(a.lista_alkaen_kk_aktivoinnista) || a.lista_alkaen_kk_aktivoinnista < 1) return { ok: false, asetukset: a, virhe: 'lista_alkaen_kk_aktivoinnista ei ole positiivinen kokonaisluku' };
      if (a.laskentaperuste !== 'lista') return { ok: false, asetukset: a, virhe: "lista_alkaen_kk_aktivoinnista vaatii laskentaperuste 'lista'" };
    }
    if (!_kokonais(a.maksuton_alle_ika) || a.maksuton_alle_ika < 0) return { ok: false, asetukset: a, virhe: 'maksuton_alle_ika ei ole kokonaisluku' };
    if (typeof a.alv_prosentti !== 'number' || a.alv_prosentti < 0) return { ok: false, asetukset: a, virhe: 'alv_prosentti virheellinen' };
    if (a.laskutettava !== true && a.laskutettava !== false) return { ok: false, asetukset: a, virhe: 'laskutettava ei ole true/false' };
    if (a.laskutettava && tmLaskutusKkIndeksi(a.sopimus_alkaen) === null) return { ok: false, asetukset: a, virhe: "sopimus_alkaen puuttuu tai ei ole muotoa 'YYYY-MM'" };
    return { ok: true, asetukset: a, virhe: null };
  }

  /* functions/suostumus.js suostumusAnnettu — sama ehto (pariteettitesti). */
  function tmLaskutusSuostumus(p) { var x = p || {}; return x.suostumusTila === 'annettu' || !!(x.suostumus && x.suostumus.annettu); }
  /* Ei mukana: demo, arkistoitu, poistettu, aktiivinen:false (functions/seuran_kooste.js pelaajaPoissa + tila-kenttä). */
  function tmLaskutusPoissa(p) { var x = p || {}; return x.isDemoUser === true || x.poistettu === true || x.arkistoitu === true || x.aktiivinen === false || x.tila === 'arkistoitu' || x.tila === 'poistettu'; }
  /* Ikä laskentavuonna (kalenterivuoden aikana täytettävä) tai null. */
  function tmLaskutusIka(p, vuosi) {
    var x = p || {}, sv = x.syntymaVuosi;
    if (typeof sv === 'string' && /^\d{4}$/.test(sv)) sv = Number(sv);
    if (!_kokonais(sv)) { var kk = tmLaskutusKk(x.syntymaaika); sv = kk ? Number(kk.slice(0, 4)) : null; }
    return _kokonais(sv) && sv > 1900 ? vuosi - sv : null;
  }

  function _haamu(k) { return !k.rooli || (!k.email && !k.etunimi && !k.sukunimi); }
  /* kayttajat-dokumentit → { joukkueId: aktiivisten valmentajien määrä }. Vain rooli 'valmentaja', aktiivinen !== false, ei demo, ei haamu. Nimimerkinnät kanonisoidaan, kuolleet id:t pois. */
  function tmLaskutusValmentajat(kayttajat, joukkueDocs) {
    var J = _PJ(), docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], ulos = {}, idt = {};
    docs.forEach(function (d) { ulos[d.id] = 0; idt[String(d.id)] = true; });
    (Array.isArray(kayttajat) ? kayttajat : []).forEach(function (k) {
      if (!k || k.rooli !== 'valmentaja' || k.aktiivinen === false || k.demo === true || _haamu(k)) return;
      var omat = {};
      (Array.isArray(k.joukkueet) ? k.joukkueet : []).forEach(function (x) {
        if (x == null || x === '') return;
        if (idt[String(x)]) { omat[String(x)] = true; return; }
        var kn = J && J.tmKanonisoiJoukkue ? J.tmKanonisoiJoukkue(x, docs) : null; if (kn) omat[kn.id] = true;
      });
      Object.keys(omat).forEach(function (id) { ulos[id]++; });
    });
    return ulos;
  }

  /* Pelaajan laskutusjoukkue: pääjoukkue, jos aktiivinen; muuten ensimmäinen aktiivinen jäsenyyksistä. → { joukkueId|null, paajoukkue, siirretty } */
  function tmLaskutusJoukkue(p, joukkueDocs, onAktiivinen) {
    var J = _PJ(); if (!J || !J.tmPelaajanJoukkueet) throw new Error('tm_laskutus: tm_joukkue.js (tmPelaajanJoukkueet) puuttuu');
    var jj = J.tmPelaajanJoukkueet(p, joukkueDocs); if (!jj.length) return { joukkueId: null, paajoukkue: null, siirretty: false };
    var nimi = p.joukkue != null ? p.joukkue : p.joukkueNimi, kn = nimi ? J.tmKanonisoiJoukkue(nimi, joukkueDocs) : null;
    var paa = (kn && jj.indexOf(kn.id) >= 0) ? kn.id : jj[0];
    if (onAktiivinen(paa)) return { joukkueId: paa, paajoukkue: paa, siirretty: false };
    var jarj = [paa].concat(jj.filter(function (x) { return x !== paa; }));
    for (var i = 0; i < jarj.length; i++) if (onAktiivinen(jarj[i])) return { joukkueId: jarj[i], paajoukkue: paa, siirretty: true };
    return { joukkueId: null, paajoukkue: paa, siirretty: false };
  }

  /* Joukkueen käytetty peruste kuukaudelle → { peruste, kk_aktivoinnista|null, varoitus|null } */
  function tmLaskutusPeruste(asetukset, joukkue, kk) {
    var n = asetukset.lista_alkaen_kk_aktivoinnista;
    if (asetukset.laskentaperuste !== 'lista' || n === null || n === undefined) return { peruste: asetukset.laskentaperuste, kk_aktivoinnista: null, varoitus: null };
    var akk = tmLaskutusKk(joukkue && joukkue.laskutus_aktivoitu && joukkue.laskutus_aktivoitu.pvm);
    if (!akk) return { peruste: 'suostumus', kk_aktivoinnista: null, varoitus: 'aktivointi_puuttuu' };   // edullisempi seuralle + SA korjaa
    var nro = tmLaskutusKkIndeksi(kk) - tmLaskutusKkIndeksi(akk) + 1;
    return { peruste: nro <= n ? 'suostumus' : 'lista', kk_aktivoinnista: nro, varoitus: null };
  }

  function _kattoSumma(n, hinta, katto) { return Math.min(n * hinta, katto); }

  /* PÄÄLASKENTA: yhden seuran yksi kuukausi. syote: { kk:'YYYY-MM', seuraId, asetukset (tmLaskutusAsetukset(...).asetukset), joukkueet:[{id,…}], pelaajat:[{id,…}], kayttajat:[…] }
     → tulos (snapshotin sisältö; ei aikaleimaa, ei nimiä pelaajista — vain id-listat korjattaville). Heittää, jos kk virheellinen. */
  function tmLaskutusLaske(syote) {
    var kk = syote.kk, kki = tmLaskutusKkIndeksi(kk); if (kki === null) throw new Error("tm_laskutus: kk ei ole muotoa 'YYYY-MM': " + kk);
    var a = syote.asetukset, vuosi = Number(kk.slice(0, 4));
    var docs = (syote.joukkueet || []).filter(function (d) { return d && d.demo !== true; });
    var sopimus = a.laskutettava === true && tmLaskutusKkIndeksi(a.sopimus_alkaen) !== null && kki >= tmLaskutusKkIndeksi(a.sopimus_alkaen);
    var valm = tmLaskutusValmentajat(syote.kayttajat, docs), rivit = {}, aktiiviset = {};
    docs.forEach(function (d) {
      var akt = d.laskutustila === 'aktiivinen', pr = akt ? tmLaskutusPeruste(a, d, kk) : { peruste: null, kk_aktivoinnista: null, varoitus: null };
      if (akt) aktiiviset[d.id] = true;
      var ohitus = d.laskutus_vastuuvalmentaja_ok === true;   // SA:n ohitus (briiffi "2014 Blå"): vastuuhenkilö muussa kuin valmentajaroolissa
      rivit[d.id] = { id: d.id, nimi: d.nimi || d.id, laskutustila: akt ? 'aktiivinen' : 'passiivinen', valmentajia: valm[d.id] || 0, vastuuvalmentaja: (valm[d.id] || 0) > 0 || ohitus, vastuuvalmentaja_sa: ohitus && !(valm[d.id] > 0),
        peruste: pr.peruste, kk_aktivoinnista: pr.kk_aktivoinnista, laskutus_aktivoitu: (d.laskutus_aktivoitu && tmLaskutusKk(d.laskutus_aktivoitu.pvm)) || null,
        pelaajia: 0, maksulliset_suostumus: 0, maksulliset_lista: 0, maksulliset: 0, alle_ika: 0, ika_puuttuu: 0, ilman_suostumusta: 0, siirretty_muualta: 0,
        summa_snt: 0, katto_kaytossa: false, varoitukset: pr.varoitus ? [pr.varoitus] : [] };
    });
    var P = { yhteensa: 0, poissa: 0, ilman_aktiivista_joukkuetta: 0, laskussa: 0, ika_puuttuu_idt: [] };
    (syote.pelaajat || []).forEach(function (p) {
      if (!p) return; P.yhteensa++;
      if (tmLaskutusPoissa(p)) { P.poissa++; return; }
      var lj = tmLaskutusJoukkue(p, docs, function (id) { return !!aktiiviset[id]; });
      if (!lj.joukkueId) { P.ilman_aktiivista_joukkuetta++; return; }
      var r = rivit[lj.joukkueId]; r.pelaajia++; P.laskussa++; if (lj.siirretty) r.siirretty_muualta++;
      var ika = tmLaskutusIka(p, vuosi);
      if (ika !== null && ika < a.maksuton_alle_ika) { r.alle_ika++; return; }
      if (ika === null) { r.ika_puuttuu++; if (P.ika_puuttuu_idt.length < 500) P.ika_puuttuu_idt.push(p.id); }
      r.maksulliset_lista++;
      if (tmLaskutusSuostumus(p)) r.maksulliset_suostumus++; else r.ilman_suostumusta++;
    });
    var pelaajamaksut = 0, varoitukset = { ilman_valmentajaa: [], aktivointi_puuttuu: [] };
    var joukkueet = docs.map(function (d) { return rivit[d.id]; }).sort(function (x, y) { return String(x.nimi).localeCompare(String(y.nimi), 'fi'); });
    joukkueet.forEach(function (r) {
      if (r.laskutustila !== 'aktiivinen') return;
      r.maksulliset = r.peruste === 'lista' ? r.maksulliset_lista : r.maksulliset_suostumus;
      if (r.varoitukset.indexOf('aktivointi_puuttuu') >= 0) varoitukset.aktivointi_puuttuu.push(r.id);
      if (!r.vastuuvalmentaja) { r.varoitukset.push('ei_valmentajaa'); varoitukset.ilman_valmentajaa.push(r.id); return; }   // 0 €, SA ratkaisee
      if (!sopimus) return;
      r.summa_snt = _kattoSumma(r.maksulliset, a.hinta_pelaaja_snt, a.joukkuekatto_snt); r.katto_kaytossa = r.maksulliset * a.hinta_pelaaja_snt > a.joukkuekatto_snt;
      pelaajamaksut += r.summa_snt;
    });
    var lisenssi = sopimus ? a.seuralisenssi_snt : 0;
    return { kk: kk, seuraId: syote.seuraId, laskutettava: sopimus, sopimus_alkaen: a.sopimus_alkaen || null,
      hinnat: { seuralisenssi_snt: a.seuralisenssi_snt, hinta_pelaaja_snt: a.hinta_pelaaja_snt, joukkuekatto_snt: a.joukkuekatto_snt, maksuton_alle_ika: a.maksuton_alle_ika,
        laskentaperuste: a.laskentaperuste, lista_alkaen_kk_aktivoinnista: a.lista_alkaen_kk_aktivoinnista, alv_prosentti: a.alv_prosentti },
      seuralisenssi_snt: lisenssi, pelaajamaksut_snt: pelaajamaksut, yhteensa_snt: lisenssi + pelaajamaksut, alv_prosentti: a.alv_prosentti,
      joukkueet: joukkueet, pelaajat: P, varoitukset: varoitukset };
  }

  function _eur(snt) { return (snt / 100).toFixed(2).replace('.', ','); }
  function _csv(x) { var s = String(x == null ? '' : x); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  /* CSV (; erotin, desimaalipilkku — Excel fi): yksi rivi per joukkue + seuran summarivi. tulokset = [tmLaskutusLaske(...), …], seuraNimet = { sid: nimi } */
  function tmLaskutusCsv(tulokset, seuraNimet) {
    var nimet = seuraNimet || {}, rivit = [['kuukausi', 'seura', 'joukkue', 'tila', 'vastuuvalmentaja', 'peruste', 'maksulliset', 'suostumukselliset', 'koko_lista', 'alle_10v', 'ika_puuttuu', 'ilman_suostumusta', 'katto', 'summa_eur', 'alv_pct']];
    (tulokset || []).forEach(function (t) {
      var sn = nimet[t.seuraId] || t.seuraId;
      t.joukkueet.forEach(function (r) { rivit.push([t.kk, sn, r.nimi, r.laskutustila, r.vastuuvalmentaja ? (r.vastuuvalmentaja_sa ? 'kyllä (SA)' : 'kyllä') : 'ei', r.peruste || '', r.maksulliset, r.maksulliset_suostumus, r.maksulliset_lista, r.alle_ika, r.ika_puuttuu, r.ilman_suostumusta, r.katto_kaytossa ? 'kyllä' : 'ei', _eur(r.summa_snt), t.alv_prosentti]); });
      rivit.push([t.kk, sn, 'SEURALISENSSI', '', '', '', '', '', '', '', '', '', '', _eur(t.seuralisenssi_snt), t.alv_prosentti]);
      rivit.push([t.kk, sn, 'YHTEENSÄ', '', '', '', '', '', '', '', '', '', '', _eur(t.yhteensa_snt), t.alv_prosentti]);
    });
    return rivit.map(function (r) { return r.map(_csv).join(';'); }).join('\n') + '\n';
  }

  var API = { OLETUS: OLETUS, PERUSTEET: PERUSTEET, tmLaskutusAsetukset: tmLaskutusAsetukset, tmLaskutusKk: tmLaskutusKk, tmLaskutusPaiva: tmLaskutusPaiva, tmLaskutusKkIndeksi: tmLaskutusKkIndeksi,
    tmLaskutusSuostumus: tmLaskutusSuostumus, tmLaskutusPoissa: tmLaskutusPoissa, tmLaskutusIka: tmLaskutusIka, tmLaskutusValmentajat: tmLaskutusValmentajat,
    tmLaskutusJoukkue: tmLaskutusJoukkue, tmLaskutusPeruste: tmLaskutusPeruste, tmLaskutusLaske: tmLaskutusLaske, tmLaskutusCsv: tmLaskutusCsv };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_LASKUTUS = API;
})(typeof window !== 'undefined' ? window : this);
