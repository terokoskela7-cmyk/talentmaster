/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_ennatykset.js — OMAT ENNÄTYKSET (PB per testi) — KANONINEN, YKSI LÄHDE (KORTTI 1c, §26/§22/§28/§7.22)

   Ennen: sama logiikka kolmena kopiona (docs/testit_indeksit.js + Testaus_v9 + Excel_Tuonti inline) ja
   Pikakirjaus/Testituonti eivät päivittäneet ennätyksiä lainkaan → pelaajan Ennätykset-kortti ei syttynyt.
   Nyt kaikki kirjoittajat (Testaus_v9 · Excel_Tuonti · Testituonti_Master · Pikakirjaus) lataavat tämän.

   paivitaEnnatykset(nyky, tulokset) → { ennatykset, uudet:[testi] }
     nyky     = pelaajadokin `ennatykset` { <testi>: { paras, pvm, alusta, edellinen? } } | null
     tulokset = [{ testi, arvo, pvm?, alusta? }]   (testi = ENNATYS_META-avain)
     · suunta: pieni=true → pienempi parempi (aikatestit), muuten suurempi parempi (cmj/mas/flei)
     · §22: alustaherkkä testi verrataan vain saman alustan sisällä — KOODINA (lib/tm_alusta.js tmAlustaKoodi), joten
       Testaus_v9:n "mondo_yleisurheilualusta" ja Pikakirjauksen "Mondo / yleisurheilualusta" ovat sama alusta. Tallennus = koodi.
     · kohina-kynnys (_ennatysKynnys): mittausvirheen sisällä ei uutta ennätystä
     · ennätys puuttuu → SIEMEN pelaajan aiemmasta datasta (tmEnnatysSiemenet, PR D): vertailukelpoinen (sama alusta, eri päivä)
       siemen + parannus → `edellinen` → juhla; ei vertailukelpoista siementä → 1. tulos = lähtötaso, EI "uusi ennätys"
     · ei parannusta → entinen säilyy (EI "huononi", §28)
     · parannus → { paras, pvm, alusta, edellinen } — `edellinen` = voitettu oma tulos (pelaajan juhlaviesti
       näytetään VAIN kun se on olemassa = oikea parannus, ei ensimmäinen mittaus)

   tmEnnatysTulokset(tul, alusta, pvm) → tulokset-lista kirjoittajan testi-id → arvo -kartasta
     (Testaus_v9/Pikakirjaus-avaimet lin_30m/hyppy_cj + Testituonti-avaimet lin30m; arvo skalaari tai {paras|tulos}).
   tmEnnatyksetUpd(nyky, tul, alusta, pvm) → { ennatykset, uudet } | null (null = ei yhtään ennätystestiä)

   VAIN LASKENTA — ei Firestorea. Kutsuja lisää `ennatykset` SAMAAN batchiin testituloksen + pikakenttien kanssa (§26).
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // testi → { pieni: pienempi parempi · alusta: alustaherkkä (§22 ALUSTAHERKAT, vertaa vain saman alustan sisällä) }
  var ENNATYS_META = {
    lin5m: { pieni: true, alusta: true }, lin10m: { pieni: true, alusta: true }, lin30m: { pieni: true, alusta: true },
    cmj: { pieni: false, alusta: false }, mas: { pieni: false, alusta: true },
    kasirata: { pieni: true, alusta: true }, sm_juoksu: { pieni: true, alusta: true }, sm_pallo: { pieni: true, alusta: true },
    ponnauttelu: { pieni: true, alusta: false }, syotto: { pieni: true, alusta: true }, pujottelu: { pieni: true, alusta: true },
    kuljetus_laukaus: { pieni: true, alusta: true }, pituuspotku_bonus: { pieni: false, alusta: false }, flei: { pieni: false, alusta: false }
  };
  // Alustakoodi (PR F, lib/tm_alusta.js): vertailu ja tallennus KOODINA → sama alusta eri työkaluista vertailukelpoinen.
  // Resolvoi globaalista (selain) tai require (Node); puuttuu → arvo sellaisenaan (vanha käytös, ei kaadu).
  function _alustaKoodi(a) {
    var A = (typeof global !== 'undefined' && global && global.TM_ALUSTA) || null;
    if (!A && typeof module !== 'undefined' && module.exports && typeof require === 'function') { try { A = require('./tm_alusta.js'); } catch (e) { A = null; } }
    return A ? A.tmAlustaKoodi(a) : (a ? String(a) : 'tuntematon');
  }
  function _ennatysKynnys(arvo) { return Math.max(0.03, Math.abs(Number(arvo) || 0) * 0.005); }   // kohina: mittausvirheen yli

  /* SIEMEN (PR D 4.10.2026): kun ennatykset[testi] PUUTTUU, vertailukohta otetaan pelaajan AIEMMASTA datasta.
     Ennen: ensimmäinen kirjaus #749:n jälkeen tallentui ilman `edellinen`-kenttää → kenenkään 1. parannus ei juhlinut
     (Topias 4.10.: hh_historia 3.17 s → 3.12 s, ei juhlaa). Lähteet pelaajadokista (§26, ei alikokoelmakyselyä):
       · hh_historia[] (pvm, alusta per piste K1b/PR F) — vain ennätysavaimet; H-H pujottelu/syöttö EI (eri protokolla kuin TK-laji)
       · tki_historia[] (ponnauttelu_s/syotto_s/pujottelu_s) — kuljetus_laukaus EI (historiassa NETTO, kirjattu raaka-arvo eri)
       · hh_viimeisin+hh_pvm / tk_lajit_viimeisin+tk_lajit_pvm, jos samaa pvm:ää ei ole historiassa (alusta tuntematon)
     → { testi: [{ arvo, pvm, alusta }] }. Kirjoittaja antaa pelaajadokin ENNEN päivitystä. */
  var HH_SIEMEN = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata', 'sm_juoksu', 'sm_pallo'];
  var TK_SIEMEN = { ponnauttelu_s: 'ponnauttelu', syotto_s: 'syotto', pujottelu_s: 'pujottelu' };
  function tmEnnatysSiemenet(d) {
    var out = {};
    if (!d || typeof d !== 'object') return out;
    var lisaa = function (testi, arvo, pvm, alusta) {
      var v = Number(arvo); if (arvo == null || arvo === '' || isNaN(v)) return;
      (out[testi] = out[testi] || []).push({ arvo: v, pvm: pvm ? String(pvm).slice(0, 10) : null, alusta: alusta || null });
    };
    var hhPvm = {};
    (Array.isArray(d.hh_historia) ? d.hh_historia : []).forEach(function (h) {
      if (!h) return; hhPvm[String(h.pvm || '').slice(0, 10)] = 1;
      HH_SIEMEN.forEach(function (k) { if (h[k] != null) lisaa(k, h[k], h.pvm, h.alusta); });
    });
    if (d.hh_viimeisin && typeof d.hh_viimeisin === 'object' && !hhPvm[String(d.hh_pvm || '').slice(0, 10)]) {
      HH_SIEMEN.forEach(function (k) { if (d.hh_viimeisin[k] != null) lisaa(k, d.hh_viimeisin[k], d.hh_pvm, null); });
    }
    var tkPvm = {};
    (Array.isArray(d.tki_historia) ? d.tki_historia : []).forEach(function (h) {
      if (!h) return; tkPvm[String(h.pvm || '').slice(0, 10)] = 1;
      Object.keys(TK_SIEMEN).forEach(function (k) { if (h[k] != null) lisaa(TK_SIEMEN[k], h[k], h.pvm, h.alusta); });
    });
    if (d.tk_lajit_viimeisin && typeof d.tk_lajit_viimeisin === 'object' && !tkPvm[String(d.tk_lajit_pvm || '').slice(0, 10)]) {
      Object.keys(TK_SIEMEN).forEach(function (k) { if (d.tk_lajit_viimeisin[k] != null) lisaa(TK_SIEMEN[k], d.tk_lajit_viimeisin[k], d.tk_lajit_pvm, null); });
    }
    return out;
  }
  // Paras VERTAILUKELPOINEN siemen: eri päivä kuin uusi tulos (saman päivän korjaus ei ole "edellinen"); §22-alustaherkässä
  // testissä vain SAMA alustakoodi, eikä 'tuntematon' (alustaton tulos ei todista samaa alustaa). null = ei vertailukohtaa.
  function _parasSiemen(lista, meta, alusta, pvm) {
    var p = pvm ? String(pvm).slice(0, 10) : null, paras = null;
    (lista || []).forEach(function (s) {
      if (p && s.pvm === p) return;
      if (meta.alusta && (alusta === 'tuntematon' || _alustaKoodi(s.alusta) !== alusta)) return;
      if (!paras || (meta.pieni ? s.arvo < paras.arvo : s.arvo > paras.arvo)) paras = s;
    });
    return paras;
  }

  // Yhden ennätystietueen päivitys (sama logiikka kuin ennen; jaettu pää- ja alustakohtaiselle tietueelle).
  // → { rec, uusi } (rec = uusi tietue tai entinen; uusi = oikea parannus → juhla).
  function _paivitaYksi(cur, t, meta, arvo, alusta, siemenet) {
    if (!cur) {
      // Ei ennätystä vielä → siemen pelaajan aiemmasta datasta (PR D). Vertailukelpoinen siemen + parannus → `edellinen` → juhla.
      var sm = siemenet ? _parasSiemen(siemenet[t.testi], meta, alusta, t.pvm) : null;
      if (sm) {
        var par0 = meta.pieni ? (sm.arvo - arvo) : (arvo - sm.arvo);
        if (par0 > _ennatysKynnys(arvo)) return { rec: { paras: arvo, pvm: t.pvm || null, alusta: alusta, edellinen: sm.arvo }, uusi: true };
        return { rec: { paras: sm.arvo, pvm: sm.pvm, alusta: alusta }, uusi: false };   // aiempi oma paras pysyy (EI "huononi")
      }
      // Ei vertailukelpoista siementä (ei historiaa / eri tai tuntematon alusta, §22) → lähtötaso, EI juhlaa.
      return { rec: { paras: arvo, pvm: t.pvm || null, alusta: alusta }, uusi: false };
    }
    if (meta.alusta && _alustaKoodi(cur.alusta) !== alusta) return { rec: cur, uusi: false };   // §22: eri alusta → ei vertailua
    var parannus = meta.pieni ? (cur.paras - arvo) : (arvo - cur.paras);
    if (parannus > _ennatysKynnys(arvo)) return { rec: { paras: arvo, pvm: t.pvm || null, alusta: alusta, edellinen: cur.paras }, uusi: true };
    return { rec: cur, uusi: false };   // ei parannusta → entinen säilyy (EI "huononi" §28)
  }
  function _alustaLib() {
    var A = (typeof global !== 'undefined' && global && global.TM_ALUSTA) || null;
    if (!A && typeof module !== 'undefined' && module.exports && typeof require === 'function') { try { A = require('./tm_alusta.js'); } catch (e) { A = null; } }
    return A;
  }
  function _paaalusta(testi) { var A = _alustaLib(); return (A && A.tmPaaalusta) ? A.tmPaaalusta(testi) : null; }
  function _kopio(o) { var u = {}; if (o && typeof o === 'object') { for (var k in o) { if (Object.prototype.hasOwnProperty.call(o, k)) u[k] = o[k]; } } return u; }

  /* ALUSTOITTAIN (PR D2, päätös 4.10.2026): alustaherkän testin tulos tallentuu OMAN ALUSTANSA ennätykseksi
     `ennatykset_alustat.<testi>.<alustakoodi>` — eri alustan tulos EI enää katoa (§22 ennen: "eri alusta → ei lasketa").
     EI muuntokaavaa alustojen välillä (validoitua kerrointa ei ole). `ennatykset.<testi>` = PÄÄENNÄTYS (taaksepäin
     yhteensopiva lukijoille: valmennusapuri, Solo, diag): juoksutesteissä pääalustan (Mondo) ennätys kun sellainen on;
     muuten nykyinen/ensimmäinen tunnettu alusta. Alustaton ('tuntematon') tulos käyttää vanhaa yhden tietueen polkua.
     uudet = parantuneet testit (yhteensopiva) · uudetAlustat = 'testi@alusta'. */
  function paivitaEnnatykset(nyky, tulokset, siemenet, nykyAlustat) {
    var ulos = _kopio(nyky);
    var alustat = {}; var alustatMuuttui = false;
    if (nykyAlustat && typeof nykyAlustat === 'object') { for (var t0 in nykyAlustat) { if (Object.prototype.hasOwnProperty.call(nykyAlustat, t0)) alustat[t0] = _kopio(nykyAlustat[t0]); } }
    var uudet = [], uudetAlustat = [];
    (tulokset || []).forEach(function (t) {
      if (!t || !t.testi) return;
      var meta = ENNATYS_META[t.testi]; if (!meta) return;
      var arvo = Number(t.arvo); if (arvo == null || isNaN(arvo)) return;
      var alusta = _alustaKoodi(t.alusta);
      if (meta.alusta && alusta !== 'tuntematon') {
        var omat = alustat[t.testi] || {};
        var cur = ulos[t.testi];
        // Vanha pääennätys (tunnettu alusta) → oman alustansa riviksi ENNEN kuin pää voi vaihtua (lukuhetken "migraatio",
        // ei datamigraatiota): muuten esim. hallin ennätys katoaisi, kun ensimmäinen Mondo-tulos ottaa pään.
        var curKoodi = cur ? _alustaKoodi(cur.alusta) : null;
        if (cur && cur.paras != null && curKoodi !== 'tuntematon' && !omat[curKoodi]) { omat[curKoodi] = cur; alustatMuuttui = true; }
        var curA = omat[alusta] || null;
        var r = _paivitaYksi(curA, t, meta, arvo, alusta, siemenet);
        omat[alusta] = r.rec; alustat[t.testi] = omat; alustatMuuttui = true;
        if (r.uusi) { uudet.push(t.testi); uudetAlustat.push(t.testi + '@' + alusta); }
        var paa = _paaalusta(t.testi);
        if (paa && omat[paa]) ulos[t.testi] = omat[paa];                                       // pääalusta voittaa
        else if (!cur || _alustaKoodi(cur.alusta) === alusta || _alustaKoodi(cur.alusta) === 'tuntematon') ulos[t.testi] = omat[alusta];
        return;                                                                                   // muuten pää ennallaan (toinen alusta)
      }
      var r2 = _paivitaYksi(ulos[t.testi], t, meta, arvo, alusta, siemenet);
      ulos[t.testi] = r2.rec;
      if (r2.uusi) uudet.push(t.testi);
    });
    var tulos = { ennatykset: ulos, uudet: uudet, uudetAlustat: uudetAlustat };
    if (alustatMuuttui) tulos.ennatykset_alustat = alustat;
    return tulos;
  }

  /* NÄYTTÖRIVIT (PR D2) — jaettu Pelaaja_v7 + Vanhempi_v2: yksi rivi per (testi, alusta). Alustaherkässä testissä
     PÄÄALUSTA (Mondo) ENSIN, muut alustat omina riveinään (ei vertailua). Vanha pääennätys, jonka alustaa ei ole
     ennatykset_alustat:ssa (esim. 'tuntematon'), näytetään omana rivinään. → [{ avain, testi, alusta, paras, pvm,
     edellinen, paa }]. avain = 'testi' (ei-alustaherkkä / vanha) tai 'testi@alusta' (juhlan nähty-merkki). */
  function tmEnnatysRivit(p) {
    var E = (p && p.ennatykset && typeof p.ennatykset === 'object') ? p.ennatykset : {};
    var EA = (p && p.ennatykset_alustat && typeof p.ennatykset_alustat === 'object') ? p.ennatykset_alustat : {};
    var testit = Object.keys(ENNATYS_META).filter(function (k) { return E[k] || EA[k]; });
    var rivit = [];
    testit.forEach(function (testi) {
      var meta = ENNATYS_META[testi], omat = EA[testi] || {}, paa = _paaalusta(testi);
      var koodit = Object.keys(omat).filter(function (k) { return omat[k] && omat[k].paras != null; });
      if (meta.alusta && koodit.length) {
        koodit.sort(function (a, b) { if (a === paa) return -1; if (b === paa) return 1; return String((omat[b] || {}).pvm || '').localeCompare(String((omat[a] || {}).pvm || '')); });
        koodit.forEach(function (k) { var r = omat[k]; rivit.push({ avain: testi + '@' + k, testi: testi, alusta: k, paras: r.paras, pvm: r.pvm || null, edellinen: r.edellinen != null ? r.edellinen : null, paa: k === paa }); });
        var e0 = E[testi];
        if (e0 && e0.paras != null && koodit.indexOf(_alustaKoodi(e0.alusta)) < 0) rivit.push({ avain: testi, testi: testi, alusta: _alustaKoodi(e0.alusta), paras: e0.paras, pvm: e0.pvm || null, edellinen: e0.edellinen != null ? e0.edellinen : null, paa: false });
        return;
      }
      var e = E[testi];
      if (e && e.paras != null) rivit.push({ avain: testi, testi: testi, alusta: _alustaKoodi(e.alusta), paras: e.paras, pvm: e.pvm || null, edellinen: e.edellinen != null ? e.edellinen : null, paa: !!(paa && _alustaKoodi(e.alusta) === paa) });
    });
    return rivit;
  }

  // Kirjoittajan testi-id → ENNATYS_META-avain. H-H pujottelu/syöttö (pujottelu_hh/syotto_hh) EIVÄT ole mukana:
  // eri protokolla/normi kuin TK-laji (§26 normiperiaate 5) → ei sekoiteta samaan ennätykseen.
  var TESTI_MAP = {
    lin_5m: 'lin5m', lin_10m: 'lin10m', lin_30m: 'lin30m', hyppy_cj: 'cmj',          // Testaus_v9 / Pikakirjaus (lib-avaimet)
    lin5m: 'lin5m', lin10m: 'lin10m', lin30m: 'lin30m', cmj: 'cmj',                  // Testituonti_Master
    mas: 'mas', kasirata: 'kasirata', sm_juoksu: 'sm_juoksu', sm_pallo: 'sm_pallo',
    ponnauttelu: 'ponnauttelu', syotto: 'syotto', pujottelu: 'pujottelu', kuljetus_laukaus: 'kuljetus_laukaus'
  };
  function tmEnnatysTulokset(tul, alusta, pvm) {
    var out = [];
    if (!tul || typeof tul !== 'object') return out;
    Object.keys(TESTI_MAP).forEach(function (tid) {
      var v = tul[tid];
      var arvo = (v && typeof v === 'object') ? (v.paras != null ? v.paras : v.tulos) : v;
      if (arvo == null || arvo === '' || isNaN(Number(arvo))) return;
      out.push({ testi: TESTI_MAP[tid], arvo: Number(arvo), alusta: alusta || 'tuntematon', pvm: pvm || null });
    });
    return out;
  }
  // pelaajaDoc (valinn.) = pelaajadokin tila ENNEN tätä kirjoitusta → siemen puuttuvalle ennätykselle (PR D).
  function tmEnnatyksetUpd(nyky, tul, alusta, pvm, pelaajaDoc) {
    var tulokset = tmEnnatysTulokset(tul, alusta, pvm);
    if (!tulokset.length) return null;
    return paivitaEnnatykset(nyky || null, tulokset, pelaajaDoc ? tmEnnatysSiemenet(pelaajaDoc) : null,
      pelaajaDoc ? (pelaajaDoc.ennatykset_alustat || null) : null);   // PR D2: alustakohtaiset ennätykset
  }

  var API = { ENNATYS_META: ENNATYS_META, TESTI_MAP: TESTI_MAP, paivitaEnnatykset: paivitaEnnatykset,
    tmEnnatysTulokset: tmEnnatysTulokset, tmEnnatyksetUpd: tmEnnatyksetUpd, tmEnnatysSiemenet: tmEnnatysSiemenet, tmEnnatysRivit: tmEnnatysRivit, _ennatysKynnys: _ennatysKynnys };
  if (global) { global.TM_ENNATYKSET = API; global.paivitaEnnatykset = paivitaEnnatykset; }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
