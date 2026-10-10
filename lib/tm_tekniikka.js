/* ════════════════════════════════════════════════════════════════════════
   tm_tekniikka.js — "Tekniikka kehityskohteena": YKSI määritelmä pelaajalle ja joukkueelle.
   Päätökset: docs/TEKNIIKKA_MAARITELMA.md §2, §6 (Tero 10.10.2026). Vain henkilökunnan näkymä (§7.22):
   pelaajalle ja huoltajalle ei näytetä luokitusta, tasoja eikä lukuja.

   PELAAJA — ketju TKI → SM-tasot, ensimmäinen KÄYTETTÄVISSÄ OLEVA (tuore) mittari ratkaisee:
     1. TKI (tki_viimeisin, tki_pvm):      TKI < 40                                   → kehityskohde, syy 'alle_ikatason'
     2. SM-tasot (sm_pallo_viimeisin, sm_juoksu_viimeisin, tsi_pvm), tasot RAAKATULOKSISTA normiIka(testipvm):ssä,
        sukupuoli 'M'/'N':
          pallo = 1 ja juoksu ≥ 2                                                       → kehityskohde, syy 'alle_ikatason'
          pallo = 1 ja juoksu = 1                                                       → EI kehityskohde, EI mitattu
                                                                                          ('nopeus_ja_tekniikka_samalla_tasolla', §28:
                                                                                          hitautta ei tehdä kehityskohteeksi tekniikan nimellä)
          pallo ≥ 2 tasoa juoksun alapuolella                                           → kehityskohde, syy 'pallo_hidastaa'
          vain toinen SM-testeistä                                                      → 'mittaus_vajaa': ei mitattu, tason 1 sääntöä ei sovelleta
     3. muuten 'ei_dataa' (syy: sukupuoli_puuttuu · ika_puuttuu · ika_alle_10 · ei_mittausta · vain vanhoja / päivä tuntematon).
   VANHUUS 15 kk mittarikohtaisesti (kalenterikuukausina): vanhempi tulos ei vaikuta luokitukseen ja pelaajan kohdalla
   kerrotaan `vanhat: ['TKI'|'SM']` ("TKI/SM-testi yli vuoden vanha"). Ikä luetaan VAIN tekniikkamittarin omasta
   päivästä — FLEI tai muu mittaus ei peitä vanhaa tekniikkatulosta. PÄIVÄ TUNTEMATON (puuttuva, tyhjä, virheellinen tai
   tulevaisuudessa) on oma tila (`tuntematonPvm`), EI tuore: mittari ei luokita (K8).

   JOUKKUE — jäsenyys tmPelaajanJoukkueet (ryhmät eivät ole joukkueita):
     'kehityskohde'  kun  3 · kehityskohteita ≥ mitattu  JA  mitattu ≥ 5   TAI   2 · kehityskohteita ≥ kaikki joukkueen pelaajat
                     (kokonaisluvuilla, yhtäsuuruus riittää: 5/15 riittää; mitatut = ei neutraaleja, ei vajaita, ei ilman dataa)
     'ok'            mitattu ≥ 5 eikä edellä
     'ei_luokkaa'    muuten ("ei tekniikkadataa · N joukkuetta" VP:lle; eiMitattua = mitattu === 0)
     otosPieni       luokiteltu, mutta mitattuja < 8
     syy             se, joka koskee useampaa kehityskohdepelaajaa; tasatilanteessa 'alle_ikatason'

   EI käytä: d2_taso, sm_*_taso (tallennettu), Eerikkilän tekniikkatasoa (syöttö/pujottelu), TKI→taso-muunnoksia (TKI/20 jne.).
   Normit luetaan NORMIREKISTERIstä normiston mukaan (lib/tm_normisto.js) — ei suoria viittauksia normitauluihin.

   Riippuvuudet: lib/tm_eerikkila_normit.js (normiIka, normSukupuoliMN), lib/tm_normisto.js (rajat, normihaku), lib/tm_joukkue.js (tmPelaajanJoukkueet).
   Dual-export: module.exports (Node/Vitest) + window.TM_TEKNIIKKA ja globaalit (selain, <script src>).
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* Rajat ja normihaku EIVÄT ole täällä: lib/tm_normisto.js (normisto + seuran linja; opts.asetukset, oletus Suomi). Joukkuesääntö: lib/tm_joukkuesaanto.js. */
  var VANHA_KK_OLETUS = 15;   // vain tmTekniikkaPvmTila:n oletus kun kutsuja ei anna rajaa (menetelmä: datan ikä)
  var DAY = 86400000;

  /* Node: require; selain: globaalit (window). */
  function _lib(f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root || {}); } catch (e) { return root || {}; } }
  function _E() { return _lib('./tm_eerikkila_normit.js'); }
  function _J() { return _lib('./tm_joukkue.js'); }
  function _saanto() { return _lib('./tm_joukkuesaanto.js'); }
  /* → { id, R (rajat), lahteet, seuranRajat, ketju, laskeTaso, testikartta } tai null (tuntematon normisto / puuttuva rekisteri → "ei dataa", ei virhettä) */
  function _normisto(opts) {
    var L = _lib('./tm_normisto.js'), NO = L.tmNormistoKaytto ? L : (L.TM_NORMISTO || null);
    try { return NO ? NO.tmNormistoKaytto(opts && opts.asetukset) : null; } catch (e) { return null; }
  }
  function _num(x) { return typeof x === 'number' && isFinite(x); }

  /* ── päivä: testipäivän ISO-päivä (UTC) tai null = "päivä tuntematon" ── */
  function _isoPaiva(pvm) {
    if (pvm == null || pvm === '') return null;
    var d = null;
    if (typeof pvm === 'object' && typeof pvm.toDate === 'function') { try { d = pvm.toDate(); } catch (e) { return null; } }
    else if (pvm instanceof Date) d = pvm;
    else if (typeof pvm === 'object' && _num(pvm.seconds)) d = new Date(pvm.seconds * 1000);
    else if (typeof pvm === 'string') { var m = pvm.trim().match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (isNaN(d.getTime()) || d.getUTCMonth() !== +m[2] - 1) return null; }
    else if (_num(pvm)) d = new Date(pvm);
    if (!d || isNaN(d.getTime())) return null;
    var kk = d.getMonth() + 1, pv = d.getDate();   // paikallinen päivä (§7.26: ei UTC-johdannaista)
    return d.getFullYear() + '-' + (kk < 10 ? '0' : '') + kk + '-' + (pv < 10 ? '0' : '') + pv;
  }
  /* Tila: { tila: 'tuore'|'vanha'|'tuntematon', iso, kk } — vanha, kun testipäivä + 15 kalenterikuukautta ≤ nyt. Yli vuorokauden tulevaisuudessa oleva päivä ei ole testipäivä → tuntematon. */
  function tmTekniikkaPvmTila(pvm, nytMs, vanhaKk) {
    vanhaKk = _num(vanhaKk) ? vanhaKk : VANHA_KK_OLETUS;
    var iso = _isoPaiva(pvm);
    if (!iso || !_num(nytMs)) return { tila: 'tuntematon', iso: null, kk: null };
    var y = +iso.slice(0, 4), mo = +iso.slice(5, 7) - 1, da = +iso.slice(8, 10), t0 = Date.UTC(y, mo, da);
    if (t0 - nytMs > DAY) return { tila: 'tuntematon', iso: iso, kk: null };
    var raja = new Date(Date.UTC(y, mo + vanhaKk, da)); if (raja.getUTCDate() !== da) raja = new Date(Date.UTC(y, mo + vanhaKk + 1, 0));   // kk-loppu: 31.1. + 1 kk ei ylitä
    return { tila: raja.getTime() <= nytMs ? 'vanha' : 'tuore', iso: iso, kk: Math.max(0, (nytMs - t0) / (30.4375 * DAY)) };
  }

  /* ── sukupuoli 'M'/'N': 1) sukupuoli-kenttä (M/P/N/T), 2) joukkuenimen P/T-tunnus (P14, T12), muuten null — EI arvausta.
     VAROITUS: Eerikkilä-normihaku käyttää tyttöjen normia kaikelle muulle kuin 'M':lle, joten tuntematon sukupuoli EI saa mennä sille. ── */
  function _nimiSp(nimi) { var m = String(nimi == null ? '' : nimi).match(/(?:^|[^A-Za-zÅÄÖåäö0-9])([PT])\s?\d{1,2}(?![0-9])/i); return m ? (m[1].toUpperCase() === 'T' ? 'N' : 'M') : null; }
  function tmTekniikkaSukupuoli(p, joukkueNimi) {
    if (!p) return null;
    var k = _E().normSukupuoliMN ? _E().normSukupuoliMN(p.sukupuoli) : null;
    if (k) return k;
    var nimet = [p.joukkue, p.joukkueNimi].concat(Array.isArray(p.joukkueetNimet) ? p.joukkueetNimet : [], [joukkueNimi]);
    for (var i = 0; i < nimet.length; i++) { var sp = _nimiSp(nimet[i]); if (sp) return sp; }
    return null;
  }

  /* ── SM-taso raakatuloksesta rekisteristä. 0 = EI tasoa (ei koskaan "taso 1").
     VAROITUS: normihaku leikkaa iän hiljaa väliin 10–19 → tässä ikä < 10 = ei tasoa, ikä ≥ 20 = avain 'M'/'N' (aikuisten normi).
     Älä kutsu normihakua SM-testeille tämän funktion ohi. Normihaku palauttaa 0 myös puuttuvalle arvolle. Tuntematon normisto → 0. asetukset valinnainen (oletus Suomi). ── */
  function tmSmTaso(arvo, testi, ika, sp, asetukset) {
    var v = typeof arvo === 'string' ? parseFloat(arvo.replace(',', '.')) : arvo, N = _normisto({ asetukset: asetukset });
    if (!N || !_num(v) || v <= 0 || !_num(ika) || ika < N.R.SM_MIN_IKA || (sp !== 'M' && sp !== 'N')) return 0;
    var t = N.laskeTaso(testi, v, ika >= N.R.SM_AIKUINEN_IKA ? sp : Math.round(ika), sp);
    return t >= 1 && t <= 5 ? t : 0;
  }

  function _ika(p, pvmIso, joukkueNimi) {
    var f = _E().normiIka; if (typeof f !== 'function') return null;
    var vuosi = p.syntymaVuosi != null ? Number(p.syntymaVuosi) : null;
    return f(_num(vuosi) ? vuosi : null, pvmIso, p.joukkue || joukkueNimi || null);
  }

  /* ── pelaajan luokitus ──
     → { tila: 'tki'|'sm'|'neutraali'|'vajaa'|'ei_dataa', mittari: 'TKI'|'SM'|null, mitattu, kehityskohde, syy, huom, tasot, arvo, vanhat[], tuntematonPvm[], eiDataaSyy } */
  function tmTekniikkaMittari(p, nytMs, opts) {
    opts = opts || {}; nytMs = _num(nytMs) ? nytMs : Date.now();
    var ulos = { tila: 'ei_dataa', mittari: null, mitattu: false, kehityskohde: false, syy: null, huom: null, tasot: null, arvo: null, vanhat: [], tuntematonPvm: [], eiDataaSyy: null };
    if (!p) { ulos.eiDataaSyy = 'ei_mittausta'; return ulos; }
    var N = _normisto(opts), R = N && N.R, ketju = N && N.ketju.tekniikka || [];
    if (!N || !ketju.length) { ulos.eiDataaSyy = N ? 'ei_ketjua' : 'normisto_tuntematon'; return ulos; }   // tuntematon normisto / ei tekniikkaketjua → "ei dataa", ei virhettä
    ulos.seuranRaja = N.seuranRajat.some(function (a) { return a === 'TKI' || a === 'SM_TASO_RAJA' || a === 'ERO_TASOA'; });
    var eiSyy = null;   // ensimmäinen syy miksi data ei kelvannut

    /* 1 · TKI */
    var tki = p.tki_viimeisin != null && p.tki_viimeisin !== '' ? Number(p.tki_viimeisin) : null;
    if (ketju.indexOf('tki') >= 0 && _num(tki)) {
      var tp = tmTekniikkaPvmTila(p.tki_pvm, nytMs, R.VANHA_KK);
      if (tp.tila === 'tuore') { ulos.tila = 'tki'; ulos.mittari = 'TKI'; ulos.mitattu = true; ulos.arvo = tki; ulos.kehityskohde = tki < R.TKI; ulos.syy = ulos.kehityskohde ? 'alle_ikatason' : null; return ulos; }
      if (tp.tila === 'vanha') { ulos.vanhat.push('TKI'); eiSyy = eiSyy || 'vanha'; } else { ulos.tuntematonPvm.push('TKI'); eiSyy = eiSyy || 'paiva_tuntematon'; }
    }

    /* 2 · SM-tasot (SM-pallo on pakollinen; päivä = tsi_pvm) */
    var pallo = p.sm_pallo_viimeisin != null && p.sm_pallo_viimeisin !== '' ? p.sm_pallo_viimeisin : null, juoksu = p.sm_juoksu_viimeisin != null && p.sm_juoksu_viimeisin !== '' ? p.sm_juoksu_viimeisin : null;
    if (ketju.indexOf('sm') >= 0 && (pallo != null || juoksu != null)) {
      var sp = tmTekniikkaPvmTila(p.tsi_pvm, nytMs, R.VANHA_KK);
      if (sp.tila === 'vanha') { ulos.vanhat.push('SM'); eiSyy = eiSyy || 'vanha'; }
      else if (sp.tila === 'tuntematon') { ulos.tuntematonPvm.push('SM'); eiSyy = eiSyy || 'paiva_tuntematon'; }
      else {
        var sukup = tmTekniikkaSukupuoli(p, opts.joukkueNimi);
        if (!sukup) eiSyy = eiSyy || 'sukupuoli_puuttuu';
        else {
          var ika = _ika(p, sp.iso, opts.joukkueNimi);
          if (ika == null) eiSyy = eiSyy || 'ika_puuttuu';
          else if (ika < R.SM_MIN_IKA) eiSyy = eiSyy || 'ika_alle_10';
          else if (pallo == null || juoksu == null) { ulos.tila = 'vajaa'; ulos.mittari = 'SM'; ulos.huom = 'mittaus_vajaa'; return ulos; }   // pelkkä toinen SM-testeistä: ei mitattu, tason 1 sääntöä ei sovelleta
          else {
            var tpal = tmSmTaso(pallo, 'sm_pallo', ika, sukup, opts.asetukset), tjuo = tmSmTaso(juoksu, 'sm_juoksu', ika, sukup, opts.asetukset);
            if (tpal < 1 || tjuo < 1) { ulos.tila = 'vajaa'; ulos.mittari = 'SM'; ulos.huom = 'mittaus_vajaa'; return ulos; }   // arvo ei kelpaa (0 / ei-numero)
            ulos.mittari = 'SM'; ulos.tasot = { pallo: tpal, juoksu: tjuo, ika: ika, sukupuoli: sukup };
            if (tpal <= R.SM_TASO_RAJA && tjuo <= R.SM_TASO_RAJA) { ulos.tila = 'neutraali'; ulos.huom = 'nopeus_ja_tekniikka_samalla_tasolla'; return ulos; }   // §28: ei kehityskohde, ei lasketa joukkueluokitukseen
            ulos.tila = 'sm'; ulos.mitattu = true;
            if (tpal <= R.SM_TASO_RAJA) { ulos.kehityskohde = true; ulos.syy = 'alle_ikatason'; }                                   // juoksu ≥ 2 (kohta edellä)
            else if (tpal <= tjuo - R.ERO_TASOA) { ulos.kehityskohde = true; ulos.syy = 'pallo_hidastaa'; }
            return ulos;
          }
        }
      }
    }
    ulos.eiDataaSyy = eiSyy || 'ei_mittausta';
    return ulos;
  }

  /* ── joukkueen luokitus ── */
  function _mediaani(a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }), k = b.length >> 1; return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2; }
  function tmTekniikkaJoukkueLuokka(pelaajat, nytMs, opts) {
    opts = opts || {}; nytMs = _num(nytMs) ? nytMs : Date.now();
    var P = Array.isArray(pelaajat) ? pelaajat : [], yht = P.length, mitattu = 0, kehit = 0, alle = 0, pallo = 0, neutr = 0, vajaa = 0, vanhoja = 0, pvmTunt = 0, spPuuttuu = 0, eiDataa = 0, lahteet = { TKI: 0, SM: 0 }, pvmt = [], kkt = [];
    var NN = _normisto(opts), vanhaKk = NN ? NN.R.VANHA_KK : VANHA_KK_OLETUS, seuranRaja = !!(NN && NN.seuranRajat.some(function (a) { return a === 'TKI' || a === 'SM_TASO_RAJA' || a === 'ERO_TASOA' || a === 'MIN_MITATTU' || a === 'OTOS_PIENI'; }));
    P.forEach(function (p) {
      var m = tmTekniikkaMittari(p, nytMs, opts);
      if (m.vanhat.length) vanhoja++;
      if (m.tuntematonPvm.length) pvmTunt++;
      if (m.tila === 'neutraali') { neutr++; return; }
      if (m.tila === 'vajaa') { vajaa++; return; }
      if (!m.mitattu) { eiDataa++; if (m.eiDataaSyy === 'sukupuoli_puuttuu') spPuuttuu++; return; }
      mitattu++; lahteet[m.mittari]++;
      if (m.kehityskohde) { kehit++; if (m.syy === 'alle_ikatason') alle++; else pallo++; }
      var pt = tmTekniikkaPvmTila(m.mittari === 'TKI' ? p.tki_pvm : p.tsi_pvm, nytMs, vanhaKk);
      if (pt.iso) { pvmt.push(pt.iso); kkt.push(pt.kk); }
    });
    /* YKSI joukkuesääntö: lib/tm_joukkuesaanto.js (jaettu tm_fyysinen:n kanssa) */
    var S = _saanto().tmJoukkueSaanto({ yht: yht, mitattu: mitattu, kehityskohteita: kehit }, opts.asetukset);
    var kehityskohde = S.kehityskohde, luokka = S.luokka;
    return { yht: yht, mitattu: mitattu, kehityskohteita: kehit, neutraaleja: neutr, vajaita: vajaa, eiDataa: eiDataa, vanhoja: vanhoja, paivaTuntematon: pvmTunt, sukupuoliPuuttuu: spPuuttuu,
      luokka: luokka, eiMitattua: S.eiMitattua, otosPieni: S.otosPieni, seuranRaja: seuranRaja,
      syy: kehityskohde ? (alle >= pallo ? 'alle_ikatason' : 'pallo_hidastaa') : null, syyJako: { alle_ikatason: alle, pallo_hidastaa: pallo }, lahteet: lahteet,
      uusinPvm: pvmt.length ? pvmt.slice().sort().pop() : null, mediaaniKk: kkt.length ? Math.round(_mediaani(kkt) * 10) / 10 : null };
  }

  /* Joukkue jäsenyyden mukaan: tmPelaajanJoukkueet(p, joukkueDocs) sisältää joukkueId:n. joukkueDocs [{id, nimi}] */
  function tmJoukkueTekniikka(pelaajat, joukkueDocs, joukkueId, nytMs, opts) {
    var f = _J().tmPelaajanJoukkueet, docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], doc = null;
    docs.forEach(function (d) { if (d && String(d.id) === String(joukkueId)) doc = d; });
    var jasenet = (Array.isArray(pelaajat) ? pelaajat : []).filter(function (p) { return typeof f === 'function' && f(p, docs).indexOf(String(joukkueId)) >= 0; });
    var o = {}; for (var k in (opts || {})) o[k] = opts[k];
    if (doc && doc.nimi && o.joukkueNimi == null) o.joukkueNimi = doc.nimi;
    var r = tmTekniikkaJoukkueLuokka(jasenet, nytMs, o); r.joukkueId = String(joukkueId); return r;
  }

  /* Kaikki joukkueet + laskurit näkymille: { joukkueet: {id: tulos}, kehityskohde: N, ok: N, eiLuokkaa: N, eiMitattua: N, otosPieni: N, joukkueita: N }
     Vain joukkueet, joilla on pelaajia (yht > 0). `eiTekniikkadataa` = ilman luokkaa (sekä 0 mitattua että 1–4) — VP:lle "ei tekniikkadataa · N joukkuetta". */
  function tmTekniikkaYhteenveto(pelaajat, joukkueDocs, nytMs, opts) {
    var docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], ulos = { joukkueet: {}, joukkueita: 0, kehityskohde: 0, ok: 0, eiLuokkaa: 0, eiMitattua: 0, eiTekniikkadataa: 0, otosPieni: 0, syy: { alle_ikatason: 0, pallo_hidastaa: 0 } };
    var f = _J().tmPelaajanJoukkueet, jas = {};   // jäsenyys KERRAN per pelaaja (ei joukkue × pelaaja -silmukkaa): 2 000 pelaajaa × 80 joukkuetta
    (Array.isArray(pelaajat) ? pelaajat : []).forEach(function (p) { (typeof f === 'function' ? f(p, docs) : []).forEach(function (id) { (jas[id] = jas[id] || []).push(p); }); });
    docs.forEach(function (d) {
      if (!d || d.id == null) return;
      var o = {}; for (var k in (opts || {})) o[k] = opts[k]; if (d.nimi && o.joukkueNimi == null) o.joukkueNimi = d.nimi;
      var r = tmTekniikkaJoukkueLuokka(jas[String(d.id)] || [], nytMs, o); r.joukkueId = String(d.id);
      if (!r.yht) return;
      ulos.joukkueet[String(d.id)] = r; ulos.joukkueita++;
      if (r.luokka === 'kehityskohde') { ulos.kehityskohde++; ulos.syy[r.syy]++; } else if (r.luokka === 'ok') ulos.ok++; else { ulos.eiLuokkaa++; ulos.eiTekniikkadataa++; }
      if (r.eiMitattua) ulos.eiMitattua++;
      if (r.otosPieni) ulos.otosPieni++;
    });
    return ulos;
  }

  var API = { tmTekniikkaPvmTila: tmTekniikkaPvmTila, tmTekniikkaSukupuoli: tmTekniikkaSukupuoli, tmSmTaso: tmSmTaso, tmTekniikkaMittari: tmTekniikkaMittari,
    tmTekniikkaJoukkueLuokka: tmTekniikkaJoukkueLuokka, tmJoukkueTekniikka: tmJoukkueTekniikka, tmTekniikkaYhteenveto: tmTekniikkaYhteenveto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) {
    root.TM_TEKNIIKKA = API;
    root.tmTekniikkaMittari = tmTekniikkaMittari; root.tmJoukkueTekniikka = tmJoukkueTekniikka; root.tmTekniikkaYhteenveto = tmTekniikkaYhteenveto; root.tmTekniikkaSukupuoli = tmTekniikkaSukupuoli;
  }
})(typeof window !== 'undefined' ? window : null);
