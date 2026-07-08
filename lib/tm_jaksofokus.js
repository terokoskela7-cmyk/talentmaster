/* ════════════════════════════════════════════════════════════════════════
   tm_jaksofokus.js — Vaihe 4c: VP:n jaksofokus-oversight PURE-ydin (VP_v25).
   Aggregoi jaksofokus-pikakentät (§26) → kattavuus, jaksot (aktiivinen/umpeutunut),
   teemakeskittymä (konseptijakauma → ryhmäharjoite-signaali), lähdejakauma.
   UI inline VP_v25:ssä; tämä = testattava ydin (EI Firestore-lukuja, EI DOM:ia).
   Dual-export: module.exports (Vitest) || window.TM_JAKSOFOKUS (selain). §4 · §26 · §37.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var DAY_MS = 86400000;
  var RYHMA_KYNNYS = 3;   // ≥3 pelaajaa samassa konseptissa → ryhmäharjoite-CTA (§3.2)

  function _nowMs(nyt) {
    if (nyt == null) return Date.now();
    if (nyt instanceof Date) return nyt.getTime();
    if (typeof nyt === 'string') return new Date(nyt).getTime();
    return nyt;
  }

  // Onko pelaajalla aktiivinen/asetettu jaksofokus (konsepti valittu).
  function tmJfOnFokus(p) {
    return !!(p && p.jaksofokus && p.jaksofokus.konsepti_avain);
  }

  // Umpeutunut = jakso alkoi + kesto_vk*7 pv < nyt. Ei alkoi-pvm:ää → EI umpeutunut (ei tietoa).
  // jf = jaksofokus-objekti (ei koko pelaaja). nyt: ms | Date | ISO | null(=now).
  function tmJfUmpeutunut(jf, nyt) {
    if (!jf || !jf.konsepti_avain || !jf.alkoi) return false;
    var alkoi = new Date(jf.alkoi).getTime();
    if (isNaN(alkoi)) return false;
    var vk = jf.kesto_vk || 4;
    return (alkoi + vk * 7 * DAY_MS) < _nowMs(nyt);
  }

  // Kattavuus: montako pelaajaa jolla jaksofokus. { katettu, yht, pct(0–100), ilman }.
  function tmJfKattavuus(pelaajat) {
    var yht = (pelaajat || []).length;
    var katettu = (pelaajat || []).filter(tmJfOnFokus).length;
    return { katettu: katettu, yht: yht, pct: yht ? Math.round(katettu / yht * 100) : 0, ilman: yht - katettu };
  }

  // Teemakeskittymä: konsepti → montako pelaajaa (laskeva). [{ avain, nimi, count, ryhma(bool) }].
  // ryhma = count >= RYHMA_KYNNYS (ryhmäharjoite kannattaa).
  function tmJfTeemakeskittyma(pelaajat) {
    var map = {};
    (pelaajat || []).forEach(function (p) {
      if (!tmJfOnFokus(p)) return;
      var jf = p.jaksofokus;
      var avain = jf.konsepti_avain;
      if (!map[avain]) map[avain] = { avain: avain, nimi: jf.konsepti_nimi || avain, count: 0 };
      map[avain].count += 1;
    });
    return Object.keys(map).map(function (k) {
      var t = map[k]; t.ryhma = t.count >= RYHMA_KYNNYS; return t;
    }).sort(function (a, b) { return b.count - a.count || String(a.nimi).localeCompare(String(b.nimi)); });
  }

  // Jaksot: { aktiiviset, umpeutuneet } (vain fokuksen omaavista).
  function tmJfJaksot(pelaajat, nyt) {
    var aktiiviset = 0, umpeutuneet = 0;
    (pelaajat || []).forEach(function (p) {
      if (!tmJfOnFokus(p)) return;
      if (tmJfUmpeutunut(p.jaksofokus, nyt)) umpeutuneet += 1; else aktiiviset += 1;
    });
    return { aktiiviset: aktiiviset, umpeutuneet: umpeutuneet };
  }

  // Lähdejakauma: kuka asetti fokuksen. { valmentaja, vp, talenttivalmentaja, muu }.
  function tmJfLahdejakauma(pelaajat) {
    var j = { valmentaja: 0, vp: 0, talenttivalmentaja: 0, muu: 0 };
    (pelaajat || []).forEach(function (p) {
      if (!tmJfOnFokus(p)) return;
      var l = p.jaksofokus.lahde;
      if (l === 'valmentaja' || l === 'vp' || l === 'talenttivalmentaja') j[l] += 1; else j.muu += 1;
    });
    return j;
  }

  // Talentit erikseen (VP-erityisvastuu §37): { katettu, yht, ilman }.
  function tmJfTalentit(pelaajat) {
    var tal = (pelaajat || []).filter(function (p) { return p && p.talenttiOhjelma === true; });
    var katettu = tal.filter(tmJfOnFokus).length;
    return { katettu: katettu, yht: tal.length, ilman: tal.length - katettu };
  }

  // Koko KPI-kooste yhdellä kutsulla (VP KPI-nauha).
  function tmJfKooste(pelaajat, nyt) {
    return {
      kattavuus: tmJfKattavuus(pelaajat),
      jaksot: tmJfJaksot(pelaajat, nyt),
      talentit: tmJfTalentit(pelaajat),
      lahde: tmJfLahdejakauma(pelaajat),
      teemat: tmJfTeemakeskittyma(pelaajat)
    };
  }

  var API = {
    tmJfOnFokus: tmJfOnFokus,
    tmJfUmpeutunut: tmJfUmpeutunut,
    tmJfKattavuus: tmJfKattavuus,
    tmJfTeemakeskittyma: tmJfTeemakeskittyma,
    tmJfJaksot: tmJfJaksot,
    tmJfLahdejakauma: tmJfLahdejakauma,
    tmJfTalentit: tmJfTalentit,
    tmJfKooste: tmJfKooste,
    RYHMA_KYNNYS: RYHMA_KYNNYS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_JAKSOFOKUS = API;
})(typeof window !== 'undefined' ? window : this);
