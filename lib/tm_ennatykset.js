/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_ennatykset.js — OMAT ENNÄTYKSET (PB per testi) — KANONINEN, YKSI LÄHDE (KORTTI 1c, §26/§22/§28/§7.22)

   Ennen: sama logiikka kolmena kopiona (docs/testit_indeksit.js + Testaus_v9 + Excel_Tuonti inline) ja
   Pikakirjaus/Testituonti eivät päivittäneet ennätyksiä lainkaan → pelaajan Ennätykset-kortti ei syttynyt.
   Nyt kaikki kirjoittajat (Testaus_v9 · Excel_Tuonti · Testituonti_Master · Pikakirjaus) lataavat tämän.

   paivitaEnnatykset(nyky, tulokset) → { ennatykset, uudet:[testi] }
     nyky     = pelaajadokin `ennatykset` { <testi>: { paras, pvm, alusta, edellinen? } } | null
     tulokset = [{ testi, arvo, pvm?, alusta? }]   (testi = ENNATYS_META-avain)
     · suunta: pieni=true → pienempi parempi (aikatestit), muuten suurempi parempi (cmj/mas/flei)
     · §22: alustaherkkä testi verrataan vain saman alustan sisällä
     · kohina-kynnys (_ennatysKynnys): mittausvirheen sisällä ei uutta ennätystä
     · 1. tulos = lähtötaso, EI "uusi ennätys" · ei parannusta → entinen säilyy (EI "huononi", §28)
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
  function _ennatysKynnys(arvo) { return Math.max(0.03, Math.abs(Number(arvo) || 0) * 0.005); }   // kohina: mittausvirheen yli

  function paivitaEnnatykset(nyky, tulokset) {
    var ulos = {};
    if (nyky && typeof nyky === 'object') { for (var k in nyky) { if (Object.prototype.hasOwnProperty.call(nyky, k)) ulos[k] = nyky[k]; } }
    var uudet = [];
    (tulokset || []).forEach(function (t) {
      if (!t || !t.testi) return;
      var meta = ENNATYS_META[t.testi]; if (!meta) return;
      var arvo = Number(t.arvo); if (arvo == null || isNaN(arvo)) return;
      var alusta = t.alusta || 'tuntematon';
      var cur = ulos[t.testi];
      if (!cur) { ulos[t.testi] = { paras: arvo, pvm: t.pvm || null, alusta: alusta }; return; }   // 1. tulos, ei "uusi ennätys"
      if (meta.alusta && (cur.alusta || 'tuntematon') !== alusta) return;                            // §22: eri alusta → ei lasketa
      var parannus = meta.pieni ? (cur.paras - arvo) : (arvo - cur.paras);
      if (parannus > _ennatysKynnys(arvo)) { ulos[t.testi] = { paras: arvo, pvm: t.pvm || null, alusta: alusta, edellinen: cur.paras }; uudet.push(t.testi); }
      // ei parannusta → säilytä entinen (EI "huononi" §28)
    });
    return { ennatykset: ulos, uudet: uudet };
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
  function tmEnnatyksetUpd(nyky, tul, alusta, pvm) {
    var tulokset = tmEnnatysTulokset(tul, alusta, pvm);
    if (!tulokset.length) return null;
    return paivitaEnnatykset(nyky || null, tulokset);
  }

  var API = { ENNATYS_META: ENNATYS_META, TESTI_MAP: TESTI_MAP, paivitaEnnatykset: paivitaEnnatykset,
    tmEnnatysTulokset: tmEnnatysTulokset, tmEnnatyksetUpd: tmEnnatyksetUpd, _ennatysKynnys: _ennatysKynnys };
  if (global) { global.TM_ENNATYKSET = API; global.paivitaEnnatykset = paivitaEnnatykset; }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
