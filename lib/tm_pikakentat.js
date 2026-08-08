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

  // Kuljetus-laukaus netto (raaka + ennenaikaiset*10 − rangaistukset) — replika Testaus_v9 _kuljetusLaukausTulos.
  function _kuljetusLaukausTulos(d) {
    if (!d || typeof d !== 'object') return null;
    var raaka = parseFloat(d.raaka);
    if (isNaN(raaka)) return null;
    var r = d.rangaistukset || [];
    var sum = r.reduce(function (acc, x) { return acc + (parseFloat(x) || 0); }, 0);
    var ennen = parseInt(d.ennenaikaiset) || 0;
    return Math.max(0, +(raaka + ennen * 10 - sum).toFixed(2));
  }

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
      tkLaskeMerkki: f('tkLaskeMerkki', T), tkPituuspotkuBonus: f('tkPituuspotkuBonus', T)
    };
    if (typeof module !== 'undefined' && module.exports) {
      try {
        var E = require('./tm_eerikkila_normit.js');
        ['normiIka', 'normSukupuoliMN', 'eerikkilaTaso', 'laskeD1Joustava', 'laskeD2HH'].forEach(function (n) { if (!deps[n] && E && typeof E[n] === 'function') deps[n] = E[n]; });
      } catch (e) { /* selain / puuttuu */ }
      try {
        var TT = require('../docs/testit_indeksit.js');
        ['laskeKokonaistulos', 'tkLaskeTKI', 'tkLaskeMerkki', 'tkPituuspotkuBonus'].forEach(function (n) { if (!deps[n] && TT && typeof TT[n] === 'function') deps[n] = TT[n]; });
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
    if (!D || typeof D.normiIka !== 'function' || typeof D.laskeKokonaistulos !== 'function') return upd;  // kanoniset funktiot puuttuvat
    var d = pelaajaDoc || {};
    var tul = tulokset || {};
    pvm = pvm ? String(pvm).slice(0, 10) : new Date().toISOString().slice(0, 10);

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

    // ── TKI pikakentät (vain ika 8–13 tuottaa TKI:n, sp = P/T) ──
    if (saaTKI && ika != null && spPT) {
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

    return upd;
  }

  var API = { tmLaskePikakentat: tmLaskePikakentat, _HH_MAP: _HH_MAP };
  if (global) { global.tmLaskePikakentat = tmLaskePikakentat; global.TM_PIKAKENTAT = API; }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
