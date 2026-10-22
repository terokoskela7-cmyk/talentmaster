/* ════════════════════════════════════════════════════════════════════════
   tm_d3_itsearvio.js — Vaihe 1 / PR 1d: D3-JAKO. PURE (ei Firestorea, ei DOMia). Dual-export: module.exports || window.TM_D3_ITSEARVIO.
   Ongelma (inventaario 22.10.): `d3_viimeisin.pisteet[dim]` sisälsi samassa objektissa valmentajan, VP:n ja pelaajan pisteet; pelaaja luki ja kirjoitti koko objektin
   → pelaaja pystyi lukemaan JA väärentämään valmentajan arvion. Jako:
     · B  `pelaajat/{pid}.d3_itsearvio` = { pisteet: { <dim>: 1..5 }, pvm: 'YYYY-MM-DD', jakso_alkoi } — VAIN pelaajan oma arvio (pelaaja-app kirjoittaa ja lukee tämän).
     · A  `sisainen/tiedot.d3_viimeisin` (+ d3_taso/d3_pvm/d3_varmuus/d3_vp_pvm) — valmentajan, VP:n ja kalibraation pisteet (lib/tm_sisainen.js).
   Tämä tiedosto on pelaaja-appin ainoa D3-lib (pelaaja-app EI lataa tm_sisainen.js:ää). §7.22: ei lukuja vertailuna, ei valmentajan pisteitä pelaajalle.
   · tmD3ItsearvioPisteet(p)                → { dim: n } pelaajan OMAT arvot: d3_itsearvio ensin, varalla vanha d3_viimeisin.pisteet[dim].pelaaja (EI muita osia)
   · tmD3ItsearvioJakso(p)                  → jakso_alkoi (d3_itsearvio, varalla vanha d3_viimeisin.jakso_alkoi) | null
   · tmD3ItsearvioOlio(annetut, p, opts)    → d3_itsearvio-olio tallennettavaksi (yhdistää aiemmat arvot; opts.pvm, opts.jaksoAlkoi) | null
   · tmD3ItsearvioKirjoitus(annetut, p, o)  → { d3_itsearvio } — YKSI kirjoitettava kenttä (ei d3_taso/d3_varmuus/d3_viimeisin)
   · tmD3ItsearvioKa(p)                     → pelaajan oman itsearvion keskiarvo 1..5 | null (kortin PSY-osa)
   · tmD3Yhdista(doc)                       → HENKILÖKUNNAN näkymä: d3_itsearvio → d3_viimeisin.pisteet[dim].pelaaja, avg, lahteet, d3_taso, d3_varmuus uudelleen
   · tmD3Varmuus(lahteet), tmD3Avg(pisteet) → kanoniset laskennat (sama sääntö kuin d3Varmuus / Master _laskeD3Avg)
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var DIMS = ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'];   // = D3_DIMS (lib/tm_eerikkila_normit.js)
  var PVM_RE = /^\d{4}-\d{2}-\d{2}$/;

  function _arvo(v) { var n = (typeof v === 'number') ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN); return (isFinite(n) && n >= 1 && n <= 5) ? Math.round(n) : null; }
  function _kopio(x) { return JSON.parse(JSON.stringify(x == null ? null : x)); }

  /* Pelaajan OMAT arvot. Vanha muoto: vain `.pelaaja`-osa luetaan (valmentajan/VP:n osia ei koskaan). */
  function tmD3ItsearvioPisteet(p) {
    var ulos = {}; if (!p || typeof p !== 'object') return ulos;
    var vanha = p.d3_viimeisin && p.d3_viimeisin.pisteet, uusi = p.d3_itsearvio && p.d3_itsearvio.pisteet;
    DIMS.forEach(function (d) {
      var v = _arvo(uusi && uusi[d]);
      if (v == null && vanha && vanha[d] && typeof vanha[d] === 'object') v = _arvo(vanha[d].pelaaja);
      if (v != null) ulos[d] = v;
    });
    return ulos;
  }
  function tmD3ItsearvioJakso(p) {
    if (!p) return null;
    if (p.d3_itsearvio && typeof p.d3_itsearvio.jakso_alkoi === 'string') return p.d3_itsearvio.jakso_alkoi;
    return (p.d3_viimeisin && typeof p.d3_viimeisin.jakso_alkoi === 'string') ? p.d3_viimeisin.jakso_alkoi : null;
  }
  function tmD3ItsearvioOlio(annetut, p, opts) {
    opts = opts || {}; annetut = annetut || {};
    var pisteet = tmD3ItsearvioPisteet(p), n = 0;
    DIMS.forEach(function (d) { var v = _arvo(annetut[d]); if (v != null) { pisteet[d] = v; n++; } });
    if (!n) return null;
    var pvm = PVM_RE.test(String(opts.pvm || '')) ? String(opts.pvm) : null;
    if (!pvm) throw new Error('tm_d3_itsearvio: pvm (YYYY-MM-DD) puuttuu');
    return { pisteet: pisteet, pvm: pvm, jakso_alkoi: opts.jaksoAlkoi || null };
  }
  function tmD3ItsearvioKirjoitus(annetut, p, opts) { var o = tmD3ItsearvioOlio(annetut, p, opts); return o ? { d3_itsearvio: o } : null; }
  function tmD3ItsearvioKa(p) {
    var v = tmD3ItsearvioPisteet(p), a = Object.keys(v).map(function (k) { return v[k]; });
    return a.length ? Math.round(a.reduce(function (s, x) { return s + x; }, 0) / a.length * 10) / 10 : null;
  }

  function tmD3Varmuus(lahteet) {
    if (!lahteet || !lahteet.length) return null;
    var v = lahteet.indexOf('valmentaja') >= 0, p = lahteet.indexOf('pelaaja') >= 0;
    return v && p ? 'trianguloitu' : v ? 'valmentaja' : p ? 'itsearvio' : null;
  }
  /* Muokkaa pisteet-objektia paikallaan: pt.avg = valmentajan ja pelaajan keskiarvo (VP ei mukana). Palauttaa d3_taso (avg-arvojen ka, 1 desimaali) | null. */
  function tmD3Avg(pisteet) {
    var avgs = [];
    Object.keys(pisteet || {}).forEach(function (k) {
      var pt = pisteet[k]; if (!pt || typeof pt !== 'object') return; var vals = [];
      if (pt.valmentaja != null) vals.push(pt.valmentaja); if (pt.pelaaja != null) vals.push(pt.pelaaja);
      if (vals.length) { pt.avg = Math.round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length * 10) / 10; avgs.push(pt.avg); }
    });
    return avgs.length ? Math.round(avgs.reduce(function (a, b) { return a + b; }, 0) / avgs.length * 10) / 10 : null;
  }

  /* Henkilökunnan näkymä: pelaajan d3_itsearvio on `.pelaaja`-osan totuus. EI muuta syötettä (palauttaa uuden dokumentin). Ilman d3_itsearvio:ta dokumentti palautuu sellaisenaan. */
  function tmD3Yhdista(doc) {
    var it = doc && doc.d3_itsearvio && doc.d3_itsearvio.pisteet; if (!it || typeof it !== 'object') return doc;
    var ulos = Object.assign({}, doc), vanha = _kopio(doc.d3_viimeisin) || {}, pisteet = vanha.pisteet || {}, lisatty = false;
    DIMS.forEach(function (d) {
      var v = _arvo(it[d]); if (v == null) return;
      pisteet[d] = (pisteet[d] && typeof pisteet[d] === 'object') ? pisteet[d] : {}; pisteet[d].pelaaja = v; lisatty = true;
    });
    if (!lisatty) return doc;
    var taso = tmD3Avg(pisteet), lahteet = Array.isArray(vanha.lahteet) ? vanha.lahteet.slice() : [];
    if (lahteet.indexOf('pelaaja') < 0) lahteet.push('pelaaja');
    vanha.pisteet = pisteet; vanha.lahteet = lahteet;
    if (!vanha.pvm) vanha.pvm = doc.d3_itsearvio.pvm || null;
    if (!vanha.jakso_alkoi && doc.d3_itsearvio.jakso_alkoi) vanha.jakso_alkoi = doc.d3_itsearvio.jakso_alkoi;
    ulos.d3_viimeisin = vanha; ulos.d3_taso = taso; ulos.d3_varmuus = tmD3Varmuus(lahteet);
    if (ulos.d3_pvm == null) ulos.d3_pvm = doc.d3_itsearvio.pvm || null;
    return ulos;
  }

  var API = { DIMS: DIMS, tmD3ItsearvioPisteet: tmD3ItsearvioPisteet, tmD3ItsearvioJakso: tmD3ItsearvioJakso, tmD3ItsearvioOlio: tmD3ItsearvioOlio, tmD3ItsearvioKirjoitus: tmD3ItsearvioKirjoitus,
    tmD3ItsearvioKa: tmD3ItsearvioKa, tmD3Yhdista: tmD3Yhdista, tmD3Varmuus: tmD3Varmuus, tmD3Avg: tmD3Avg };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_D3_ITSEARVIO = API;
})(typeof window !== 'undefined' ? window : this);
