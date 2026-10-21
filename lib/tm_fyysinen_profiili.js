/* ════════════════════════════════════════════════════════════════════════
   tm_fyysinen_profiili.js — K4d (erä 88): Fyysinen-kortin profiilitulkinta CMJ × sprintti × kasirata. PURE (ei DOMia, ei Firestorea).
   Peruste: KPV-data 11/2024–6/2026 (221 pelaajaa): CMJ–30 m r = −0,78, kasirata–30 m r = 0,65 → yhdistelmä kertoo, MITÄ harjoitellaan.
   Syöte = ikä- ja sukupuolinormitetut TASOT (perTestTasot-ketju, testihetken ikä §14), EI raaka-arvoja. Vain henkilökunnalle (§7.22).
   · tmFyysinenSyote(rows, p) → { cmj, lin30m, lin10m, kasirata }, kukin { taso, pvm } (pvm = testin oma mittauspäivä hh_historiasta, muuten hh_pvm)
   · tmFyysinenProfiili(syote, phv) → { tyyppi:'voima'|'juoksu'|'suunnanmuutos', alue } | null
   Ehdot järjestyksessä (ensimmäinen osuva): voima (CMJ ≤ 2 ja sprintti ≤ 2) · juoksu (CMJ − sprintti ≥ 1,5) · suunnanmuutos (sprintti − kasirata ≥ 1,5).
   Sprinttitaso = 30 m (puuttuessa 10 m). Vertailu vain, jos molemmat tasot ovat olemassa ja mittaukset ≤ 30 pv toisistaan.
   Kasvuvaihe (§28): PH → ei tulkintaa; tuntematon/PRE/LAH → `voima` ei näy (heikkous voi johtua kasvuvaiheesta); juoksu + suunnanmuutos saavat näkyä.
   Dual-export: module.exports || window.TM_FYSINEN_PROFIILI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var KYNNYS = { VOIMA_MAX: 2, JUOKSU_EROTUS: 1.5, SUUNNANMUUTOS_EROTUS: 1.5, PAIVAT_MAX: 30 };   // kaikki kynnysarvot tässä
  var ALUE = { voima: 'voima_ja_hyppy', juoksu: 'kiihdytys_ja_juoksutekniikka', suunnanmuutos: 'jarrutus_ja_suunnanmuutos' };
  var VOIMA_SALLITUT = { POST: 1, AN: 1 };   // voima näkyy vain kun kasvuvaihe tiedetään ja se on ohi (§28)

  function _num(x) { return typeof x === 'number' && !isNaN(x); }
  function _ms(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
  function _taso(x) { return x && _num(x.taso) ? x.taso : null; }
  function _lahella(a, b) {   // molemmilla pvm ja ero ≤ 30 pv
    var x = _ms(a && a.pvm), y = _ms(b && b.pvm);
    return !isNaN(x) && !isNaN(y) && Math.abs(x - y) / 86400000 <= KYNNYS.PAIVAT_MAX;
  }

  function tmFyysinenSyote(rows, p) {
    var hist = (p && Array.isArray(p.hh_historia)) ? p.hh_historia : [], hv = (p && p.hh_viimeisin) || {}, oletus = p && p.hh_pvm ? String(p.hh_pvm).slice(0, 10) : null, ulos = {};
    function pvmTestille(id) {
      var viim = null;
      hist.forEach(function (pt) { if (pt && _num(pt[id]) && pt.pvm) { var d = String(pt.pvm).slice(0, 10); if (!viim || d > viim.pvm) viim = { pvm: d, arvo: pt[id] }; } });
      return viim && viim.arvo === hv[id] ? viim.pvm : oletus;   // historian uusin piste = viimeisin arvo → sen pvm; muuten hh_pvm
    }
    ['cmj', 'lin30m', 'lin10m', 'kasirata'].forEach(function (id) {
      var r = (rows || []).filter(function (x) { return x && x.dimensio === 'D1' && x.selKey === id; })[0];
      if (r && _num(r.taso)) ulos[id] = { taso: r.taso, pvm: pvmTestille(id) };
    });
    return ulos;
  }

  function tmFyysinenProfiili(syote, phv) {
    if (!syote || phv === 'PH') return null;
    var cmj = syote.cmj, spr = _taso(syote.lin30m) != null ? syote.lin30m : syote.lin10m, kas = syote.kasirata, tyyppi = null;
    if (_taso(cmj) != null && _taso(spr) != null && _lahella(cmj, spr)) {
      if (_taso(cmj) <= KYNNYS.VOIMA_MAX && _taso(spr) <= KYNNYS.VOIMA_MAX) tyyppi = 'voima';
      else if (_taso(cmj) - _taso(spr) >= KYNNYS.JUOKSU_EROTUS) tyyppi = 'juoksu';
    }
    if (!tyyppi && _taso(spr) != null && _taso(kas) != null && _lahella(spr, kas) && _taso(spr) - _taso(kas) >= KYNNYS.SUUNNANMUUTOS_EROTUS) tyyppi = 'suunnanmuutos';
    if (!tyyppi) return null;
    if (tyyppi === 'voima' && !VOIMA_SALLITUT[phv]) return null;
    return { tyyppi: tyyppi, alue: ALUE[tyyppi] };
  }

  var API = { tmFyysinenProfiili: tmFyysinenProfiili, tmFyysinenSyote: tmFyysinenSyote, KYNNYS: KYNNYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_FYSINEN_PROFIILI = API;
})(typeof window !== 'undefined' ? window : this);
