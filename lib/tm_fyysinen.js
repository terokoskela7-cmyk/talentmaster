/* ════════════════════════════════════════════════════════════════════════
   tm_fyysinen.js — "Fyysiset testit kehityskohteena": YKSI määritelmä pelaajalle ja joukkueelle (H-H-fyysiset testit).
   Päätökset: docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md §0, §3, §6 (Tero 10.10.2026). Vain henkilökunnan näkymä (§7.22).
   Rajaus: "Eerikkilä-tasoa ei käytetä heikkoutena" koskee VAIN Eerikkilän tekniikkatestejä (syöttö, pujottelu) ja niistä johdettua d2_taso:a — H-H-fyysiset
   tasot (1–5; 1 = alle kansallisen keskitason, Palloliitto FINAL2024) ovat päteviä.

   PELAAJA — tasot lasketaan RAAKATULOKSISTA (hh_viimeisin) testihetken iällä (normiIka(syntymaVuosi, testipäivä)) ja sukupuolella M/N (kenttä → joukkuenimen P/T → ei arvausta).
   EI lueta tallennettuja d1_taso/hh_taso-kenttiä. Testit: lin5m, lin10m (kiihdytys) · lin30m (maksinopeus) · cmj (voima) · mas (aerobinen, km/h ÷ 3,6) · kasirata (ketteryys) · sm_juoksu (suunnanmuutos).
   Ei tekniikkaa: sm_pallo, pujottelu, syotto kuuluvat lib/tm_tekniikka.js:lle.
     kehityskohde  = vähintään yksi testi tasolla 1, jota §28 EI neutraloi
     §28           = TM_KOTI_LUVUT.kypsyysEstetty(osa-alue, p) (= tm_idp.js idpKypsyysEstetty + tm_phv_tila.js tmPhvTila; PRE/LAH tai PHV tuntematon neutraloi gated-osa-alueet
                     kiihdytys, maksinopeus, voima, aerobinen — myös 5/10 m; EI ketteryys eikä suunnanmuutos). Sääntöä EI kirjoiteta tässä uudelleen.
     neutraali     = tason 1 testit vain §28:n alla → EI kehityskohde, EI mitattu, kuuluu joukkueen kokonaismäärään; `kypsyysMittaamatta` = neutraali ja PHV tuntematon
     ok            = ≥ 1 taso eikä tason 1:tä
     ei_dataa      = ei mittausta · vanha (≥ 15 kk) · päivä tuntematon · sukupuoli puuttuu · ikä puuttuu · ikä alle 10
   VANHUUS 15 kk koko fyysiselle patteristolle (testipaivat.fyysinen_hh, varalla hh_pvm); yksittäisen testin oma päivä ei ole tallessa (K8:n juurikorjaus).
   Päivä: lib/tm_tekniikka.js tmTekniikkaPvmTila (jaettu: puuttuva/virheellinen päivä = "päivä tuntematon", ei tuore).

   JOUKKUE — jäsenyys tmPelaajanJoukkueet; joukkuesääntö YKSI: lib/tm_joukkuesaanto.js (≥ 1/3 mitatuista (≥ 5) tai ≥ 1/2 kaikista; otos pieni < 8; ilman luokkaa).
   Syy = osa-alueet, joissa joukkueen kehityskohdepelaajilla on tason 1 testi (yleisin ensin).

   Riippuvuudet: tm_eerikkila_normit.js, tm_joukkue.js, tm_tekniikka.js, tm_joukkuesaanto.js, tm_koti_luvut.js (+ tm_idp.js, tm_phv_tila.js).
   Dual-export: module.exports + window.TM_FYSINEN ja globaalit.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  /* testi → osa-alue (sama jako kuin laskeD1Osaindeksit/IDP_OSA_AVAIN) */
  var TESTIT = { lin5m: 'kiihdytys', lin10m: 'kiihdytys', lin30m: 'maksinopeus', cmj: 'voima', mas: 'aerobinen', kasirata: 'ketteryys', sm_juoksu: 'suunnanmuutos' };
  var OSAT = ['maksinopeus', 'kiihdytys', 'voima', 'aerobinen', 'ketteryys', 'suunnanmuutos'];   // syyjärjestys tasatilanteessa
  var SM_MIN_IKA = 10, SM_AIKUINEN_IKA = 20;

  function _lib(f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root || {}); } catch (e) { return root || {}; } }
  function _E() { return _lib('./tm_eerikkila_normit.js'); }
  function _J() { return _lib('./tm_joukkue.js'); }
  function _TK() { return _lib('./tm_tekniikka.js'); }
  function _LU() { return _lib('./tm_koti_luvut.js'); }
  function _PHV() { return _lib('./tm_phv_tila.js'); }
  function _saanto() { return _lib('./tm_joukkuesaanto.js'); }
  function _tk() { var T = _TK(); return T.tmTekniikkaPvmTila ? T : (T.TM_TEKNIIKKA || T); }
  function _lu() { var L = _LU(); return L.kypsyysEstetty ? L : (L.TM_KOTI_LUVUT || L); }
  function _phvTila(p) { var P = _PHV(), f = P.tmPhvTila; return typeof f === 'function' ? f(p) : 'tuntematon'; }
  function _num(x) { return typeof x === 'number' && isFinite(x); }

  /* Taso raakatuloksesta rekisteristä; 0 = EI tasoa. Ikä < 10 → ei tasoa; ikä ≥ 20 → avain 'M'/'N' (eerikkilaTaso leikkaisi hiljaa 10–19:ään); MAS km/h → m/s. */
  function tmFyysinenTaso(testi, arvo, ika, sp) {
    var E = _E(), v = typeof arvo === 'string' ? parseFloat(arvo.replace(',', '.')) : arvo, HM = E.HH_TESTI_MAP || (typeof HH_TESTI_MAP !== 'undefined' ? HH_TESTI_MAP : null), m = HM && HM[testi];   // selaimessa HH_TESTI_MAP on const (lexikaalinen, ei window-ominaisuus)
    if (!TESTIT.hasOwnProperty(testi) || !m || !_num(v) || v <= 0 || !_num(ika) || ika < SM_MIN_IKA || (sp !== 'M' && sp !== 'N') || typeof E.eerikkilaTaso !== 'function') return 0;
    var t = E.eerikkilaTaso(m.kmh ? v / 3.6 : v, m.eerikkila, ika >= SM_AIKUINEN_IKA ? sp : Math.round(ika), sp);
    return t >= 1 && t <= 5 ? t : 0;
  }
  function _testipvm(p) {
    var tp = p && p.testipaivat && p.testipaivat.fyysinen_hh;
    return tp != null && tp !== '' ? tp : (p ? p.hh_pvm : null);
  }

  /* → { tila: 'kehityskohde'|'ok'|'neutraali'|'ei_dataa', osat: [heikot osa-alueet (ei neutraloidut)], neutraloidut: [osa-alueet], kypsyysMittaamatta, tasot:{testi:taso}, eiDataaSyy, vanha, paivaTuntematon } */
  function tmFyysinenPelaaja(p, nytMs, opts) {
    opts = opts || {}; nytMs = _num(nytMs) ? nytMs : Date.now();
    var ulos = { tila: 'ei_dataa', osat: [], neutraloidut: [], kypsyysMittaamatta: false, tasot: {}, eiDataaSyy: 'ei_mittausta', vanha: false, paivaTuntematon: false };
    var hh = p && p.hh_viimeisin;
    if (!hh || typeof hh !== 'object' || !Object.keys(TESTIT).some(function (t) { return hh[t] != null && hh[t] !== ''; })) return ulos;
    var TK = _tk(), pt = TK.tmTekniikkaPvmTila(_testipvm(p), nytMs);
    if (pt.tila === 'tuntematon') { ulos.paivaTuntematon = true; ulos.eiDataaSyy = 'paiva_tuntematon'; return ulos; }
    if (pt.tila === 'vanha') { ulos.vanha = true; ulos.eiDataaSyy = 'vanha'; return ulos; }
    var sp = TK.tmTekniikkaSukupuoli(p, opts.joukkueNimi);
    if (!sp) { ulos.eiDataaSyy = 'sukupuoli_puuttuu'; return ulos; }
    var E = _E(), ika = E.normiIka(p.syntymaVuosi != null ? Number(p.syntymaVuosi) : null, pt.iso, p.joukkue || opts.joukkueNimi || null);
    if (ika == null) { ulos.eiDataaSyy = 'ika_puuttuu'; return ulos; }
    if (ika < SM_MIN_IKA) { ulos.eiDataaSyy = 'ika_alle_10'; return ulos; }
    var LU = _lu(), mitattu = 0, heikot = {}, neutr = {};
    Object.keys(TESTIT).forEach(function (t) {
      if (hh[t] == null || hh[t] === '') return;
      var l = tmFyysinenTaso(t, hh[t], ika, sp); if (!l) return;
      ulos.tasot[t] = l; mitattu++;
      if (l === 1) { var osa = TESTIT[t]; if (LU.kypsyysEstetty(osa, p)) neutr[osa] = 1; else heikot[osa] = 1; }   // §28: YKSI vahti
    });
    if (!mitattu) { ulos.eiDataaSyy = 'ei_tasoa'; return ulos; }
    ulos.eiDataaSyy = null;
    ulos.osat = OSAT.filter(function (o) { return heikot[o]; }); ulos.neutraloidut = OSAT.filter(function (o) { return neutr[o]; });
    if (ulos.osat.length) ulos.tila = 'kehityskohde';
    else if (ulos.neutraloidut.length) { ulos.tila = 'neutraali'; ulos.kypsyysMittaamatta = _phvTila(p) === 'tuntematon'; }
    else ulos.tila = 'ok';
    return ulos;
  }

  function _mediaani(a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }), k = b.length >> 1; return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2; }
  function tmFyysinenJoukkueLuokka(pelaajat, nytMs, opts) {
    opts = opts || {}; nytMs = _num(nytMs) ? nytMs : Date.now();
    var P = Array.isArray(pelaajat) ? pelaajat : [], yht = P.length, mitattu = 0, kehit = 0, neutr = 0, kypsMit = 0, eiDataa = 0, vanhoja = 0, pvmTunt = 0, spPuuttuu = 0, osaLkm = {}, pvmt = [], kkt = [];
    P.forEach(function (p) {
      var r = tmFyysinenPelaaja(p, nytMs, opts);
      if (r.vanha) vanhoja++; if (r.paivaTuntematon) pvmTunt++;
      if (r.tila === 'neutraali') { neutr++; if (r.kypsyysMittaamatta) kypsMit++; return; }
      if (r.tila === 'ei_dataa') { eiDataa++; if (r.eiDataaSyy === 'sukupuoli_puuttuu') spPuuttuu++; return; }
      mitattu++;
      if (r.tila === 'kehityskohde') { kehit++; r.osat.forEach(function (o) { osaLkm[o] = (osaLkm[o] || 0) + 1; }); }
      var pt = _tk().tmTekniikkaPvmTila(_testipvm(p), nytMs); if (pt.iso) { pvmt.push(pt.iso); kkt.push(pt.kk); }
    });
    var S = _saanto().tmJoukkueSaanto({ yht: yht, mitattu: mitattu, kehityskohteita: kehit });
    var osat = OSAT.filter(function (o) { return osaLkm[o]; }).sort(function (a, b) { return osaLkm[b] - osaLkm[a] || OSAT.indexOf(a) - OSAT.indexOf(b); });
    return { yht: yht, mitattu: mitattu, kehityskohteita: kehit, neutraaleja: neutr, kypsyysMittaamatta: kypsMit, eiDataa: eiDataa, vanhoja: vanhoja, paivaTuntematon: pvmTunt, sukupuoliPuuttuu: spPuuttuu,
      luokka: S.luokka, eiMitattua: S.eiMitattua, otosPieni: S.otosPieni, syy: S.kehityskohde ? (osat[0] || null) : null, syyt: S.kehityskohde ? osat : [], syyJako: osaLkm,
      uusinPvm: pvmt.length ? pvmt.slice().sort().pop() : null, mediaaniKk: kkt.length ? Math.round(_mediaani(kkt) * 10) / 10 : null };
  }

  /* Joukkue jäsenyyden mukaan (tmPelaajanJoukkueet) */
  function tmJoukkueFyysinen(pelaajat, joukkueDocs, joukkueId, nytMs, opts) {
    var f = _J().tmPelaajanJoukkueet, docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], doc = null;
    docs.forEach(function (d) { if (d && String(d.id) === String(joukkueId)) doc = d; });
    var jasenet = (Array.isArray(pelaajat) ? pelaajat : []).filter(function (p) { return typeof f === 'function' && f(p, docs).indexOf(String(joukkueId)) >= 0; });
    var o = {}; for (var k in (opts || {})) o[k] = opts[k];
    if (doc && doc.nimi && o.joukkueNimi == null) o.joukkueNimi = doc.nimi;
    var r = tmFyysinenJoukkueLuokka(jasenet, nytMs, o); r.joukkueId = String(joukkueId); return r;
  }

  /* Kaikki joukkueet + laskurit näkymille. `kypsyysMittaamatta` = UNIIKIT pelaajat (kuuluvat ≥ 1 joukkueeseen, jolla on pelaajia), joiden tason 1 testit neutraloitiin, koska PHV on tuntematon. */
  function tmFyysinenYhteenveto(pelaajat, joukkueDocs, nytMs, opts) {
    var docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], f = _J().tmPelaajanJoukkueet, P = Array.isArray(pelaajat) ? pelaajat : [];
    var ulos = { joukkueet: {}, joukkueita: 0, kehityskohde: 0, ok: 0, eiLuokkaa: 0, eiMitattua: 0, eiFyysistaDataa: 0, otosPieni: 0, kypsyysMittaamatta: 0, neutraaleja: 0, syy: {} };
    docs.forEach(function (d) {
      if (!d || d.id == null) return;
      var r = tmJoukkueFyysinen(P, docs, d.id, nytMs, opts); if (!r.yht) return;
      ulos.joukkueet[String(d.id)] = r; ulos.joukkueita++;
      if (r.luokka === 'kehityskohde') { ulos.kehityskohde++; if (r.syy) ulos.syy[r.syy] = (ulos.syy[r.syy] || 0) + 1; } else if (r.luokka === 'ok') ulos.ok++; else { ulos.eiLuokkaa++; ulos.eiFyysistaDataa++; }
      if (r.eiMitattua) ulos.eiMitattua++; if (r.otosPieni) ulos.otosPieni++;
    });
    P.forEach(function (p) {
      if (typeof f !== 'function' || !f(p, docs).some(function (id) { return ulos.joukkueet[id]; })) return;
      var r = tmFyysinenPelaaja(p, nytMs, opts); if (r.tila === 'neutraali') { ulos.neutraaleja++; if (r.kypsyysMittaamatta) ulos.kypsyysMittaamatta++; }
    });
    return ulos;
  }

  var API = { TESTIT: TESTIT, OSAT: OSAT, tmFyysinenTaso: tmFyysinenTaso, tmFyysinenPelaaja: tmFyysinenPelaaja, tmFyysinenJoukkueLuokka: tmFyysinenJoukkueLuokka, tmJoukkueFyysinen: tmJoukkueFyysinen, tmFyysinenYhteenveto: tmFyysinenYhteenveto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TM_FYSINEN = API; root.tmFyysinenPelaaja = tmFyysinenPelaaja; root.tmJoukkueFyysinen = tmJoukkueFyysinen; root.tmFyysinenYhteenveto = tmFyysinenYhteenveto; }
})(typeof window !== 'undefined' ? window : null);
