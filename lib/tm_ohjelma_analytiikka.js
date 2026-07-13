/* ════════════════════════════════════════════════════════════════════════
   tm_ohjelma_analytiikka.js — Vaihe 7.2b: per-ohjelma-analytiikka ("mikä ohjelma toimii kenelle").
   Rakentuu 7.2a:n (tm_ohjelma.js + jaksofokus_historia) päälle. Lukee suljettujen jaksojen historiarivit
   (ohjelma.ohjelma_id === id) ja koostaa: n · ka_delta · toteuma-% · tulosjakauma · PHV-erittely.
   PROSESSIREHELLINEN (§29): ka_delta VAIN riveiltä joilla mitattu delta on olemassa (mitattu_n/yhteensa_n = "N/M mitattu").
   EI AI:ta (= 7.2c). PURE (EI Firestore/DOM) — pelaajahistoriat injektoidaan. Dual-export: module.exports || window.TM_OHJELMA_ANAL.
   Additiivinen (K5): kuorma_kooste (GPS/Catapult) lisättävissä erikseen — dose ≠ response, kuorma täydentää toteumaa.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var TULOS_LUOKAT = ['parani', 'ennallaan', 'vaihda'];

  function _tyhja() {
    return { n: 0, ka_delta: null, toteuma_pct: null, tulosjakauma: { parani: 0, ennallaan: 0, vaihda: 0 },
      phv_erittely: {}, mitattu_n: 0, yhteensa_n: 0 };
  }
  function _ka(arr) {
    if (!arr.length) return null;
    var s = 0; for (var i = 0; i < arr.length; i++) s += arr[i];
    return Math.round(s / arr.length * 100) / 100;
  }
  // Rivin mitattu delta (§29): delta_mitattu.muutos numerona, muuten null (EI keksitä deltaa mittaamattomille).
  function _delta(h) {
    var dm = h && h.delta_mitattu;
    return (dm && typeof dm.muutos === 'number' && !isNaN(dm.muutos)) ? dm.muutos : null;
  }
  // Rivin toteuma-% (läsnäolo tehty/tavoite). null jos ei läsnäolodataa.
  function _toteuma(h) {
    var la = h && h.lasnaolo;
    if (la && typeof la.paikalla === 'number' && la.yhteensa > 0) return la.paikalla / la.yhteensa * 100;
    return null;
  }

  // tmOhjelmaKooste(ohjelmaId, pelaajat) → kooste-objekti (§1). pelaajat = [{ jaksofokus_historia:[...], phv_tila }].
  // PHV liitetään pelaajan phv_tila:sta (historiarivi ei talleta PHV:tä; rivin oma h.phv_tila voittaa jos on).
  function tmOhjelmaKooste(ohjelmaId, pelaajat) {
    if (!ohjelmaId || !Array.isArray(pelaajat)) return _tyhja();
    var rivit = [];
    pelaajat.forEach(function (p) {
      if (!p) return;
      var hist = Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : [];
      hist.forEach(function (h) {
        if (h && h.ohjelma && h.ohjelma.ohjelma_id === ohjelmaId) {
          rivit.push({ h: h, phv: h.phv_tila || p.phv_tila || 'tuntematon' });
        }
      });
    });
    var n = rivit.length;
    if (!n) return _tyhja();

    var deltat = [], toteumat = [];
    var tulos = { parani: 0, ennallaan: 0, vaihda: 0 };
    var phv = {};   // { vaihe: { n, deltat:[] } }
    rivit.forEach(function (r) {
      var h = r.h;
      var d = _delta(h);
      if (d != null) deltat.push(d);
      var t = _toteuma(h);
      if (t != null) toteumat.push(t);
      if (TULOS_LUOKAT.indexOf(h.tulos) >= 0) tulos[h.tulos] += 1;
      var pv = r.phv || 'tuntematon';
      if (!phv[pv]) phv[pv] = { n: 0, deltat: [] };
      phv[pv].n += 1;
      if (d != null) phv[pv].deltat.push(d);
    });

    var phv_erittely = {};
    Object.keys(phv).forEach(function (k) {
      phv_erittely[k] = { n: phv[k].n, ka_delta: _ka(phv[k].deltat), mitattu_n: phv[k].deltat.length };
    });

    return {
      n: n,
      ka_delta: _ka(deltat),                                   // §29: vain mitatuista
      toteuma_pct: toteumat.length ? Math.round(_ka(toteumat)) : null,
      tulosjakauma: tulos,
      phv_erittely: phv_erittely,
      mitattu_n: deltat.length,                                // montako riviä joilla mitattu delta
      yhteensa_n: n                                            // kaikki suljetut jaksot tällä ohjelmalla
    };
  }

  var API = { tmOhjelmaKooste: tmOhjelmaKooste, TULOS_LUOKAT: TULOS_LUOKAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_OHJELMA_ANAL = API;
})(typeof window !== 'undefined' ? window : this);
