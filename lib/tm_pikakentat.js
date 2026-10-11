/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_pikakentat.js — §26-PIKAKENTTIEN KANONINEN LASKENTA (P2.0, docs/CODE_OHJE_TESTIT_TEEMA_ROADMAP.md)

   tmLaskePikakentat(pelaajaDoc, tulokset, pvm) → upd   (pikakenttä-update-objekti; {} jos ei kirjoitettavaa)

   IDENTTINEN Testaus_v9 Vaihe 1 _v6TallennaPikakentat-logiikan kanssa (H-H merge + hh_pvm/hh_taso/d1/d2,
   TKI tki_viimeisin/tki_pvm/tki_merkki/tk_lajit/tk_kokonaistulos, §26 pari-invariantti, normiIka §26,
   joukkuenimi-fallback) — PLUS **viimeisin-vartija**: jos syötetyn tuloksen pvm < olemassa oleva *_pvm,
   EI ylikirjoiteta uudempaa *_viimeisin/*_taso-pikakenttää (P-EDIT: vanhemman tuloksen muokkaus ei pyyhi
   tuoretta tilaa). Vartija on no-op kun pvm >= *_pvm (kenttätyökalun normaali "uusin tulos" -polku) → lib
   tuottaa tällöin Vaihe 1:n kanssa identtisen upd:n.

   VAIN LASKENTA — ei Firestore-kirjoitusta (kutsuja tekee ref.update(upd)). Vaihe 3 migratoi Testaus_v9 +
   Excel_Tuonti kutsumaan tätä (yksi lähde). Riippuvuudet resolvoidaan joustavasti (_resolve): Node → require
   (tm_eerikkila_normit.js + docs/testit_indeksit.js); selain → bare-globaalit + window.TM_TESTIT-nimiavaruus.
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // Testaus_v9-testi-id → hh_viimeisin-avain (identtinen _V6_HH_MAP kanssa).
  var _HH_MAP = { lin_5m: 'lin5m', lin_10m: 'lin10m', lin_30m: 'lin30m', hyppy_cj: 'cmj', mas: 'mas', kasirata: 'kasirata', sm_juoksu: 'sm_juoksu', sm_pallo: 'sm_pallo', pujottelu_hh: 'pujottelu', syotto_hh: 'syotto' };

  // Skalaari testiarvosta: objekti {tulos|paras} tai suora arvo (identtinen Vaihe 1 num()).
  function _num(v) {
    if (v == null) return null;
    if (typeof v === 'object') v = (v.tulos != null ? v.tulos : v.paras);
    var n = parseFloat(v); return isNaN(n) ? null : n;
  }

  // ── Kuljetus-laukaus — VIRALLINEN laskutapa (Tekniikkakilpailu U8–U13 säännöt; KANONINEN, muut polut delegoivat) ──────────
  // Suoritus: aika (raaka) + 4 palloa, kullekin maaliin menneelle vähennys (nurkka ilma 5 · nurkka maa 2 · keski ilma 3 ·
  //   keski maa 1 · ohi 0). Ennenaikainen laukaus = +10 s/kpl eikä sille tarkkuusvähennystä (syötetään 0).
  //   NETTO = max(0, raaka + 10·ennenaikaiset − Σvähennykset). TULOS = PARHAAN (pienin) suorituksen NETTO — min vasta nettojen jälkeen.
  // Syötemuodot (taaksepäin yhteensopivat): { raaka, osumat[4] } (uusi) · { raaka, rangaistukset[] } (vanha Testaus_v9, suora summa) ·
  //   { raaka, vahennys } (Pikakirjaus/Excel, vähennykset yhteensä) · ennenaikaiset kaikissa.
  var KL_OSUMA_ARVOT = [0, 1, 2, 3, 5];
  var KL_MAX_AIKA = 40;
  var KL_ENNEN_S = 10;
  function _klSumma(arr) { return arr.reduce(function (a, x) { return a + (parseFloat(x) || 0); }, 0); }
  function tmKlSuorituksenNetto(s) {
    if (!s || typeof s !== 'object') return null;
    var raaka = parseFloat(s.raaka);
    if (isNaN(raaka)) return null;
    var vah = Array.isArray(s.osumat) ? _klSumma(s.osumat) : Array.isArray(s.rangaistukset) ? _klSumma(s.rangaistukset) : (parseFloat(s.vahennys) || 0);
    var ennen = parseInt(s.ennenaikaiset) || 0;
    return Math.max(0, +(raaka + ennen * KL_ENNEN_S - vah).toFixed(2));
  }
  // → TULOS (pienin netto). d: { y1:{…}, y2:{…} } (2 suoritusta) TAI yksittäinen suoritus (vanha tallenne / Pikakirjaus).
  function tmKlTulos(d) {
    if (!d || typeof d !== 'object') return null;
    var nettot = [];
    ['y1', 'y2'].forEach(function (y) {
      var s = d[y]; if (!s || typeof s !== 'object') return;
      var n = tmKlSuorituksenNetto(s);
      if (n == null && s.netto != null && isFinite(parseFloat(s.netto))) n = parseFloat(s.netto);   // vain netto tallessa (ei raakaa)
      if (n != null) nettot.push(n);
    });
    if (nettot.length) return Math.min.apply(null, nettot);
    return tmKlSuorituksenNetto(d);
  }
  function _kuljetusLaukausTulos(d) { return tmKlTulos(d); }   // vanha nimi (kutsujat alempana)

  // hh_taso (avaintestit 30m/cmj/mas — Eerikkilä-tasojen ka, mas km/h → m/s ÷3.6) — replika _v6HhTaso.
  function _hhTaso(hv, ika, sp, eerikkilaTaso) {
    if (!hv || ika == null || !sp || typeof eerikkilaTaso !== 'function') return null;
    var MAP = { lin30m: { e: 'nopeus_30m' }, cmj: { e: 'hyppy_cj' }, mas: { e: 'mas', kmh: true } };
    var summa = 0, n = 0;
    Object.keys(MAP).forEach(function (k) {
      var a = hv[k]; if (a == null || isNaN(a)) return;
      var t = eerikkilaTaso(MAP[k].kmh ? a / 3.6 : a, MAP[k].e, ika, sp);
      if (t) { summa += t; n++; }
    });
    return n ? Math.round(summa / n * 10) / 10 : null;
  }

  // tk_lajit_viimeisin kokonaistuloksen komponenteista — replika _v6TkLajitPikakentat (kuljetus = netto;
  // pituuspotku_bonus vain ika>=12). tkPituuspotkuBonus injektoituna.
  function _tkLajitPikakentat(testit, ika, tkPituuspotkuBonus) {
    if (!testit) return null;
    var aikaArvo = function (id) {
      var v = testit[id];
      if (v == null) return null;
      if (typeof v === 'object') return (v.tulos != null ? v.tulos : v.paras);
      var n = parseFloat(v); return isNaN(n) ? null : n;
    };
    var out = {};
    var p1 = aikaArvo('ponnauttelu');      if (p1 != null) out.ponnauttelu_s = p1;
    var s1 = aikaArvo('syotto');           if (s1 != null) out.syotto_s = s1;
    var pu = aikaArvo('pujottelu');        if (pu != null) out.pujottelu_s = pu;
    var kl = aikaArvo('kuljetus_laukaus'); if (kl != null) out.kuljetus_laukaus_s = kl;
    if (ika != null && ika >= 12) {
      var pp = testit.pituuspotku, bonus = null;
      if (pp && typeof pp === 'object' && pp.aikabonus_s != null) bonus = parseFloat(pp.aikabonus_s);
      else {
        var metrit = (pp && typeof pp === 'object') ? (pp.metrit != null ? pp.metrit : (pp.paras_m != null ? pp.paras_m : pp.paras)) : pp;
        if (metrit != null && !isNaN(parseFloat(metrit)) && typeof tkPituuspotkuBonus === 'function') bonus = tkPituuspotkuBonus(parseFloat(metrit));
      }
      if (bonus != null && !isNaN(bonus)) out.pituuspotku_bonus_s = Math.round(bonus * 100) / 100;
    }
    return (Object.keys(out).length > 0) ? out : null;
  }

  // Riippuvuudet: bare-globaalit → window.TM_TESTIT (TKI) → Node require (tm_eerikkila_normit + testit_indeksit).
  function _resolve() {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (global || {});
    var T = g.TM_TESTIT || {};
    var f = function (n, ns) { return (typeof g[n] === 'function') ? g[n] : ((ns && typeof ns[n] === 'function') ? ns[n] : null); };
    var deps = {
      normiIka: f('normiIka'), normSukupuoliMN: f('normSukupuoliMN'),
      eerikkilaTaso: f('eerikkilaTaso'), laskeD1Joustava: f('laskeD1Joustava'), laskeD2HH: f('laskeD2HH'),
      laskeKokonaistulos: f('laskeKokonaistulos', T), tkLaskeTKI: f('tkLaskeTKI', T),
      tkLaskeMerkki: f('tkLaskeMerkki', T), tkPituuspotkuBonus: f('tkPituuspotkuBonus', T),
      // Johdetut (tmJohdetutPikakentat): vahvuus/kehityskohde — SAMAT kanoniset funktiot kuin Excel_Tuonti/recalcHH.
      // _laskeVahvuudetJaKehityskohteet: docs/testit_indeksit.js (Master/Pelaaja) TAI lib/tm_tki_core.js (VP/Testaus_v9/
      // Testituonti) → TM_TESTIT. hhKehityskohde: lib/tm_eerikkila_normit.js. Puuttuu → kenttä jää kirjoittamatta.
      _laskeVahvuudetJaKehityskohteet: f('_laskeVahvuudetJaKehityskohteet', T), hhKehityskohde: f('hhKehityskohde'),
      // tm_historia (rebuild-primitiivi rakentaa hh_historia/tki_historia; tmLaskePikakentat EI käytä näitä)
      tmHhSnapshot: f('tmHhSnapshot'), tmTkiSnapshot: f('tmTkiSnapshot'), tmHistoriaLisaa: f('tmHistoriaLisaa')
    };
    if (typeof module !== 'undefined' && module.exports) {
      try {
        var E = require('./tm_eerikkila_normit.js');
        ['normiIka', 'normSukupuoliMN', 'eerikkilaTaso', 'laskeD1Joustava', 'laskeD2HH', 'hhKehityskohde'].forEach(function (n) { if (!deps[n] && E && typeof E[n] === 'function') deps[n] = E[n]; });
      } catch (e) { /* selain / puuttuu */ }
      try {
        var TT = require('../docs/testit_indeksit.js');
        ['laskeKokonaistulos', 'tkLaskeTKI', 'tkLaskeMerkki', 'tkPituuspotkuBonus', '_laskeVahvuudetJaKehityskohteet'].forEach(function (n) { if (!deps[n] && TT && typeof TT[n] === 'function') deps[n] = TT[n]; });
      } catch (e) { /* selain / puuttuu */ }
      try {
        var HH = require('./tm_historia.js');
        ['tmHhSnapshot', 'tmTkiSnapshot', 'tmHistoriaLisaa'].forEach(function (n) { if (!deps[n] && HH && typeof HH[n] === 'function') deps[n] = HH[n]; });
      } catch (e) { /* selain / puuttuu */ }
    }
    return deps;
  }

  /* pelaajaDoc = pelaajan Firestore-dokumentti (syntymaVuosi/syntymaaika, sukupuoli, joukkue, olemassa olevat
     pikakentät hh_viimeisin/hh_pvm/tki_pvm/d2_taso/d2_lahde). tulokset = test-id → arvo (Testaus_v9 _tulokset-muoto).
     pvm = tuloksen päivä (ISO 'YYYY-MM-DD'). Palauttaa upd-objektin (Firestore .update()-hyötykuorma). */
  function tmLaskePikakentat(pelaajaDoc, tulokset, pvm, optDeps) {
    var D = optDeps || _resolve();
    var upd = {};
    // H-H-polku vaatii vain normiIka:n (+ eerikkilä self-guardattu). TKI-polku self-guardattu erikseen alempana
    // (laskeKokonaistulos/tkLaskeTKI/tkLaskeMerkki) → toimii myös ympäristössä jossa TKI-funktioita ei ole ladattu
    // (esim. VP joka ei lataa testit_indeksit.js). Testaus_v9/Master-ympäristössä kaikki läsnä → identtinen Vaihe 1.
    if (!D || typeof D.normiIka !== 'function') return upd;
    var d = pelaajaDoc || {};
    var tul = tulokset || {};
    /* EI hiljaista varapäivää: ilman tuloksen päivää pikakenttiä ei kirjoiteta (pari-invariantti: arvo + oikea *_pvm) → {} + console.warn/Sentry. */
    if (!pvm || !/^\d{4}-\d{2}-\d{2}/.test(String(pvm))) {
      try { var _TP = (typeof TM_TESTIPAIVA !== 'undefined') ? TM_TESTIPAIVA : require('./tm_testipaiva.js'); _TP.tmPaivaVaroitus('tmLaskePikakentat: testipäivä puuttuu — pikakenttiä ei kirjoiteta'); } catch (e) { if (typeof console !== 'undefined' && console.warn) console.warn('[tm_pikakentat] testipäivä puuttuu — pikakenttiä ei kirjoiteta'); }
      return upd;
    }
    pvm = String(pvm).slice(0, 10);

    // Ikä (normiIka §26) + sukupuoli. Joukkuenimi-fallback (identtinen Vaihe 1).
    var syntV = d.syntymaVuosi || null;
    if (syntV == null) {
      var sa = d.syntymaaika || d.syntymapaiva;
      if (sa && typeof sa.toDate === 'function') { try { syntV = sa.toDate().getFullYear(); } catch (e) {} }
      else if (sa) { var my = String(sa).match(/(\d{4})/); if (my) syntV = parseInt(my[1], 10); }
    }
    var ika = D.normiIka(syntV, pvm, d.joukkue);
    var spMN = (typeof D.normSukupuoliMN === 'function') ? D.normSukupuoliMN(d.sukupuoli) : null;
    if (spMN == null && d.joukkue) { var jm = String(d.joukkue).match(/\b([PT])\s?\d/i); if (jm) spMN = (jm[1].toUpperCase() === 'P') ? 'M' : 'N'; }
    var spPT = (spMN === 'M') ? 'P' : (spMN === 'N') ? 'T' : null;

    // VIIMEISIN-VARTIJA (§26/P-EDIT): kirjoita vain jos pvm >= olemassa oleva *_pvm (tai sitä ei ole).
    // ISO 'YYYY-MM-DD' -string vertailu = kronologinen. Suojaa erikseen H-H- ja TKI-patteriston.
    var saaHH  = !d.hh_pvm  || String(pvm) >= String(d.hh_pvm);
    var saaTKI = !d.tki_pvm || String(pvm) >= String(d.tki_pvm);

    // ── H-H pikakentät: hh_viimeisin (MERGE) + hh_pvm/hh_taso + d1_taso + d2_taso ──
    var hvUusi = {};
    Object.keys(_HH_MAP).forEach(function (k) { var v = _num(tul[k]); if (v != null) hvUusi[_HH_MAP[k]] = v; });
    if (saaHH && Object.keys(hvUusi).length) {
      var hvMerged = Object.assign({}, (d.hh_viimeisin && typeof d.hh_viimeisin === 'object') ? d.hh_viimeisin : {}, hvUusi);
      upd.hh_viimeisin = hvMerged;                       // §26 pari-invariantti: arvo + pvm yhdessä
      upd.hh_pvm = pvm;
      var hhTaso = _hhTaso(hvMerged, ika, spMN, D.eerikkilaTaso);
      if (hhTaso != null) upd.hh_taso = hhTaso;
      if (ika != null && spMN && typeof D.laskeD1Joustava === 'function') {
        var d1 = D.laskeD1Joustava(hvMerged, ika, spMN);
        if (d1) { upd.d1_taso = d1.taso; upd.d1_lahde = d1.lahde; upd.d1_kattavuus = d1.kattavuus; upd.d1_pvm = pvm; }
      }
      // D2 H-H-fallback: ÄLÄ ylikirjoita parempaa stored-lähdettä (TKI/TK). Identtinen Vaihe 1 -guardi.
      if (ika != null && spMN && typeof D.laskeD2HH === 'function' && (d.d2_taso == null || d.d2_lahde === 'hh' || d.d2_lahde === 'sm' || d.d2_lahde === 'sm_pallo' || d.d2_lahde === 'tk')) {
        var d2 = D.laskeD2HH(hvMerged, ika, spMN);
        if (d2) { upd.d2_taso = d2.taso; upd.d2_lahde = d2.lahde; upd.d2_kattavuus = d2.kattavuus; upd.d2_pvm = pvm; }
      }
    }

    // ── TKI pikakentät (vain ika 8–13 tuottaa TKI:n, sp = P/T) — self-guardattu TKI-funktioihin ──
    if (saaTKI && ika != null && spPT && typeof D.laskeKokonaistulos === 'function' && typeof D.tkLaskeTKI === 'function' && typeof D.tkLaskeMerkki === 'function') {
      var tkTestit = {};
      ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'].forEach(function (laji) {
        var a = tul[laji];
        if (a && typeof a === 'object') a = (laji === 'kuljetus_laukaus') ? _kuljetusLaukausTulos(a) : a.paras;
        if (a != null && a !== '' && !isNaN(parseFloat(a))) tkTestit[laji] = parseFloat(a);
      });
      var pp2 = tul.pituuspotku, ppM = (pp2 && typeof pp2 === 'object') ? pp2.paras : pp2;
      if (ppM != null && !isNaN(parseFloat(ppM))) tkTestit.pituuspotku = parseFloat(ppM);

      var kt = D.laskeKokonaistulos(tkTestit, ika, spPT);
      var tki = (kt != null) ? D.tkLaskeTKI(kt, ika, spPT) : null;
      if (tki != null) {
        upd.tki_viimeisin = tki; upd.tki_pvm = pvm;       // §26 pari-invariantti
        var merkki = D.tkLaskeMerkki(kt, ika, spPT);
        if (merkki) upd.tki_merkki = merkki;
        var tkLajit = _tkLajitPikakentat(tkTestit, ika, D.tkPituuspotkuBonus);
        if (tkLajit) { upd.tk_lajit_viimeisin = tkLajit; upd.tk_lajit_pvm = pvm; }
        if (kt != null) upd.tk_kokonaistulos_viimeisin = kt;
      }
    }

    // Johdetut pikakentät (vahvuus/kehityskohde + *_edellinen) SAMAAN upd:iin → samaan batchiin (§26).
    Object.assign(upd, tmJohdetutPikakentat(d, upd, pvm, D));
    /* Tuloksen päivä on OIKEA (kutsuja antoi päivän): vanha *_pvm_arvio-merkki (kausiarvio) poistetaan samassa päivityksessä — ei jää väärää "arvio"-leimaa. Selaimessa (Firestore-sentinel); Node-testeissä ei sentineliä. */
    var _del = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.delete() : null;
    if (_del) Object.keys(upd).forEach(function (k) { if (/^(tki|hh|tsi|d1|d2)_pvm$/.test(k) && upd[k] === pvm) upd[k + '_arvio'] = _del; });
    return upd;
  }

  /* ── JOHDETUT PIKAKENTÄT (PR B datakatkokset, 2026-10-04) ────────────────────────────────────────────────
     Ennen nämä syttyivät VAIN Excel-tuonnissa (prosessoiExcel profiiliUpdate + recalcHH) → Pikakirjauksen,
     Testaus_v9:n ja Testituonnin tuloksilla ⭐-vahvuus, 🎯-kehityskohde, 📈-parannus ja Vauhti & pallo -tavoite
     eivät syttyneet. Laskee ne JAETUSTI jo lasketusta upd:sta (tmLaskePikakentat TAI Testaus_v9 _v6PikakentatUpd):

       tki_vahvuus / tki_kehityskohde   ← _laskeVahvuudetJaKehityskohteet(tk_lajit) [kuten Excel: vain jos löytyy]
       tki_edellinen(+_pvm)             ← vanha tki_viimeisin/tki_pvm        } pvm-vahti: VAIN aidolla uudella
       tk_kokonaistulos_edellinen(+_pvm)← vanha tk_kokonaistulos/tk_lajit_pvm } testillä (pvm > vanha *_pvm) →
       hh_taso_edellinen(+_pvm)         ← vanha hh_taso/hh_pvm               } saman päivän korjaus EI vangitse
       hh_kehityskohde / hh_vahvuus     ← hhKehityskohde(hv, ikaDes, sp, phv_tila) [kuten recalcHH, null mukana]

     Kirjoitetaan vain kun vastaava patteristo kirjoitetaan tässä upd:ssa (viimeisin-vartija on jo tehnyt
     päätöksen: vanhempi tulos → ei TKI-/H-H-kenttiä upd:ssa → ei johdettujakaan). Pari-invariantti: arvo + _pvm yhdessä.
     EI laskentalogiikan muutosta — kanoniset funktiot, ikä/sp-johto replikoi recalcHH:n (bio-ika desimaalina). */
  function tmJohdetutPikakentat(pelaajaDoc, upd, pvm, optDeps) {
    var D = optDeps || _resolve();
    var d = pelaajaDoc || {};
    var u = upd || {};
    var out = {};
    if (!D || !pvm) return out;
    pvm = String(pvm).slice(0, 10);
    var uudempi = function (vanhaPvm) { return !!vanhaPvm && pvm > String(vanhaPvm).slice(0, 10); };

    // ── TKI ──
    if (u.tki_viimeisin != null) {
      if (d.tki_viimeisin != null && uudempi(d.tki_pvm)) { out.tki_edellinen = d.tki_viimeisin; out.tki_edellinen_pvm = d.tki_pvm; }
      if (u.tk_kokonaistulos_viimeisin != null && d.tk_kokonaistulos_viimeisin != null && uudempi(d.tk_lajit_pvm)) {
        out.tk_kokonaistulos_edellinen = d.tk_kokonaistulos_viimeisin; out.tk_kokonaistulos_edellinen_pvm = d.tk_lajit_pvm;
      }
      var tl = u.tk_lajit_viimeisin;
      if (tl && typeof D._laskeVahvuudetJaKehityskohteet === 'function') {
        var tt = {};
        ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'].forEach(function (l) {
          var v = tl[l + '_s']; if (v != null && !isNaN(parseFloat(v))) tt[l] = parseFloat(v);   // numeroina (kanoni ei parseFloattaa)
        });
        var vk = D._laskeVahvuudetJaKehityskohteet({ testit: tt }, { ika: _normiIka(d, pvm, D) }, null) || {};
        var v0 = vk.vahvuudet && vk.vahvuudet[0], k0 = vk.kehityskohteet && vk.kehityskohteet[0];
        if (v0 && v0.laji) out.tki_vahvuus = v0.laji;            // kuten Excel: kirjoitetaan vain kun löytyy
        if (k0 && k0.laji) out.tki_kehityskohde = k0.laji;
      }
    }

    // ── H-H ──
    if (u.hh_viimeisin && typeof u.hh_viimeisin === 'object') {
      if (u.hh_taso != null && d.hh_taso != null && uudempi(d.hh_pvm)) { out.hh_taso_edellinen = d.hh_taso; out.hh_taso_edellinen_pvm = d.hh_pvm; }
      // recalcHH-replika: vain kun hh_taso laskettu (recalcHH ohittaa muuten), sp joukkueesta → sukupuoli, ikä desimaalina.
      if (u.hh_taso != null && typeof D.hhKehityskohde === 'function') {
        var joukkue = d.joukkue || (Array.isArray(d.joukkueet) ? d.joukkueet[0] : '') || '';
        var jm = String(joukkue).match(/\b([PTU])\s?(\d{1,2})\b/i);
        var joukkueIka = jm ? parseInt(jm[2], 10) : null;
        var spRaaka = (jm && /[PT]/i.test(jm[1])) ? jm[1].toUpperCase() : (d.sukupuoli || null);
        var sp = (spRaaka === 'P' || spRaaka === 'M') ? 'M' : (spRaaka === 'T' || spRaaka === 'N') ? 'N' : null;
        var ref = new Date(pvm + 'T00:00:00');
        var ikaDes = null;
        if (d.syntymaaika && typeof d.syntymaaika.toDate === 'function') ikaDes = (ref.getTime() - d.syntymaaika.toDate().getTime()) / (365.25 * 864e5);
        else if (d.syntymaVuosi) ikaDes = (ref.getTime() - new Date(d.syntymaVuosi, 6, 1).getTime()) / (365.25 * 864e5);
        else ikaDes = joukkueIka;
        if (sp && ikaDes != null && !isNaN(ikaDes)) {
          var hvK = Object.assign({}, u.hh_viimeisin);
          if (hvK.sm_pallo == null && d.sm_pallo_viimeisin != null) hvK.sm_pallo = d.sm_pallo_viimeisin;
          var kk = D.hhKehityskohde(hvK, ikaDes, sp, (typeof tmPhvKoodi === 'function' ? tmPhvKoodi : require('./tm_phv_tila.js').tmPhvKoodi)(d));   // PR C: lomakkeen AN ei salli fyysistä kehityskohdetta
          out.hh_kehityskohde = kk ? kk.kehityskohde : null;
          out.hh_vahvuus = kk ? kk.vahvuus : null;
        }
      }
    }
    return out;
  }
  // Normi-ikä (vain _laskeVahvuudetJaKehityskohteet-tekstin ikävaiheeseen; ei vaikuta lajivalintaan).
  function _normiIka(d, pvm, D) {
    if (typeof D.normiIka !== 'function') return null;
    var syntV = d.syntymaVuosi || null;
    if (syntV == null) { var my = String(d.syntymaaika && d.syntymaaika.toDate ? '' : (d.syntymaaika || '')).match(/(\d{4})/); if (my) syntV = parseInt(my[1], 10); }
    try { return D.normiIka(syntV, pvm, d.joukkue); } catch (e) { return null; }
  }

  // ── REBUILD-PRIMITIIVI (P-EDIT.0, docs/P-EDIT.0_CODE_BRIEF.md) ─────────────────────────────────────
  // Rakenna pelaajan §26-pikakentät + mittaushistoria UUDELLEEN ALUSTA kaikista testituloksista (molemmat
  // arkistot yhtenäistettynä yhdeksi merkinnat-listaksi). Tarpeen KORJAUKSEEN/PEHMEÄÄN POISTOON: inkrementaalinen
  // tmLaskePikakentat + VIIMEISIN-VARTIJA ei osaa perua taaksepäin (viimeisimmän mittauksen poisto jättäisi
  // *_pvm:n osoittamaan poistettuun päivään). Rebuild kiertää vartijan PUHTAALLA PÖYDÄLLÄ (ei muokkaa vartijaa).
  //
  // VAIN ORKESTROINTI — uudelleenkäyttää tmLaskePikakentat (§26-mäppäys) + tm_historia (snapshot/cap/upsert):
  //   suodata (mitatoitu/pvm-tön pois) → järjestä nouseva pvm → nollaa omistetut → fold → rakenna historia.
  // Puhdas: ei Firestorea, ei DOMia, ei Date.now-riippuvuutta (merkinnöillä on pvm). Idempotentti.
  //
  // Palauttaa { upd, poistetut }: upd = asetettavat kentät (caller: doc.set(upd,{merge:true}) — HUOM hh_viimeisin
  // on map → caller kirjoittaa sen KORVATEN, ei deep-mergellä, esim. update()); poistetut = kentät jotka olivat
  // dokumentissa mutta hävisivät (caller: FieldValue.delete()) — Firestore-merge ei koskaan poista kenttää.
  //
  // ⚠ D2 RISTILÄHDE-SUOJAUS: tämä fold tuottaa d2:n VAIN H-H:sta (laskeD2HH → lahde 'hh'). Ulkoinen d2 (teknistaktinen
  // 'tk' / 'sm' / 'sm_pallo' / muu ≠ 'hh') EI ole foldin omistama → sitä ei nollata, ei ylikirjoiteta (step-d2 strippaus),
  // eikä listata poistetuiksi. Vain 'hh'-pohjainen / puuttuva d2 on omistettu.
  var _OMISTETUT_YDIN = ['hh_viimeisin', 'hh_pvm', 'hh_taso', 'd1_taso', 'd1_lahde', 'd1_kattavuus', 'd1_pvm', 'tki_viimeisin', 'tki_pvm', 'tki_merkki', 'tk_lajit_viimeisin', 'tk_lajit_pvm', 'tk_kokonaistulos_viimeisin'];
  var _D2_KENTAT = ['d2_taso', 'd2_lahde', 'd2_kattavuus', 'd2_pvm'];
  var _IDENTITEETTI = ['syntymaVuosi', 'syntymaaika', 'syntymapaiva', 'sukupuoli', 'joukkue'];

  function tmRakennaPikakentatArkistosta(pelaajaDoc, merkinnat, optDeps) {
    var D = optDeps || _resolve();
    var d = pelaajaDoc || {};
    // Ulkoinen d2 = d2 mitattu muusta kuin H-H:sta ('hh') → suojattu (fold ei omista).
    var d2Ulkoinen = (d.d2_taso != null && d.d2_lahde && d.d2_lahde !== 'hh');

    // base: identiteetti + (ulkoinen d2 säilytettynä) — omistetut ydin/historia NOLLATTU (puhdas pöytä → poisto regressoi).
    var base = {};
    _IDENTITEETTI.forEach(function (k) { if (d[k] !== undefined) base[k] = d[k]; });
    if (d2Ulkoinen) _D2_KENTAT.forEach(function (k) { if (d[k] !== undefined) base[k] = d[k]; });

    // Suodata (mitatoitu:true / pvm-tön pois) + järjestä nouseva pvm (vanhin ensin → VIIMEISIN-VARTIJA asettuu oikein).
    var jarj = (merkinnat || [])
      .filter(function (m) { return m && m.mitatoitu !== true && m.pvm != null; })
      .slice().sort(function (a, b) { return String(a.pvm).localeCompare(String(b.pvm)); });

    var hhHist = [], tkiHist = [];
    jarj.forEach(function (m) {
      var step = tmLaskePikakentat(base, m.tulokset || {}, m.pvm, D);
      if (d2Ulkoinen) _D2_KENTAT.forEach(function (k) { delete step[k]; });   // suojaa ulkoinen d2 (älä clobberaa)
      Object.assign(base, step);   // seuraava merkintä näkee edellisen *_pvm:t → vartija toimii kronologisesti
      // Historia rinnalla (uudelleenkäytä tm_historia — upsert pvm:llä + cap 20 hoituu libissä).
      var pvmM = String(m.pvm).slice(0, 10);
      var hv = {}; Object.keys(_HH_MAP).forEach(function (k) { var v = _num((m.tulokset || {})[k]); if (v != null) hv[_HH_MAP[k]] = v; });
      if (Object.keys(hv).length && typeof D.tmHhSnapshot === 'function' && typeof D.tmHistoriaLisaa === 'function') {
        hhHist = D.tmHistoriaLisaa(hhHist, D.tmHhSnapshot(pvmM, { hh_taso: step.hh_taso, d1_taso: step.d1_taso, d2_taso: step.d2_taso, hv: hv }));
      }
      if (step.tki_viimeisin != null && typeof D.tmTkiSnapshot === 'function' && typeof D.tmHistoriaLisaa === 'function') {
        tkiHist = D.tmHistoriaLisaa(tkiHist, D.tmTkiSnapshot(pvmM, { tki: step.tki_viimeisin, tkLajit: step.tk_lajit_viimeisin || {} }));
      }
    });

    // Kokoa upd omistetuista kentistä (fold-tulos base:ssa). Ulkoinen d2 jätetään koskematta (ei upd:iin).
    var upd = {};
    _OMISTETUT_YDIN.forEach(function (k) { if (base[k] !== undefined) upd[k] = base[k]; });
    if (!d2Ulkoinen) _D2_KENTAT.forEach(function (k) { if (base[k] !== undefined) upd[k] = base[k]; });
    if (hhHist.length) upd.hh_historia = hhHist;
    if (tkiHist.length) upd.tki_historia = tkiHist;

    // Poistettavat: omistettu kenttä oli dokumentissa mutta hävisi rebuildissa (muuten haamuarvo jää; merge ei poista).
    var poistetut = [];
    var kaikkiOmistetut = _OMISTETUT_YDIN.concat(['hh_historia', 'tki_historia']);
    if (!d2Ulkoinen) kaikkiOmistetut = kaikkiOmistetut.concat(_D2_KENTAT);
    kaikkiOmistetut.forEach(function (k) { if (d[k] !== undefined && upd[k] === undefined) poistetut.push(k); });

    return { upd: upd, poistetut: poistetut };
  }
  // ── /REBUILD-PRIMITIIVI ────────────────────────────────────────────────────────────────────────────

  var API = { tmLaskePikakentat: tmLaskePikakentat, tmJohdetutPikakentat: tmJohdetutPikakentat, tmRakennaPikakentatArkistosta: tmRakennaPikakentatArkistosta, _HH_MAP: _HH_MAP,
    tmKlSuorituksenNetto: tmKlSuorituksenNetto, tmKlTulos: tmKlTulos, KL_OSUMA_ARVOT: KL_OSUMA_ARVOT, KL_MAX_AIKA: KL_MAX_AIKA };
  if (global) { global.tmLaskePikakentat = tmLaskePikakentat; global.tmRakennaPikakentatArkistosta = tmRakennaPikakentatArkistosta; global.TM_PIKAKENTAT = API; }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
