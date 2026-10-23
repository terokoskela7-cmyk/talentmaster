/* ════════════════════════════════════════════════════════════════════════
   tm_d3_kortti.js — K4e kohta 1: Profiilin kortti "Psyykkinen (D3)" + D3-arviomodaali Kehitystyöpöydällä. PURE (ei Firestorea; DOM vain sivun liimassa). Dual-export: module.exports || window.TM_D3_KORTTI.
   Vain henkilökunnalle (§7.22: pelaaja- ja perhe-app eivät lataa tätä). Datalähde = HENKILÖKUNNAN yhdistetty näkymä (lib/tm_sisainen.js → sisainen/tiedot.d3_viimeisin + pelaajan d3_itsearvio, varalla vanhat d3_*).
   · tmD3KorttiMalli(p, c)           → { tyhja, pvm, rivit:[{avain,nimi,pel,val,vp,kuilu,varo}], varoja, lause:{avain,par}|null }   c: { nimi, t(avain) }
   · tmD3KorttiHTML(m, c)            → kortti-HTML (todistekorttien tyyli: details.tc-k) c: { esc, t, pid, voiKirjoittaa }
   · tmD3KorttiCss()                 → korttiin ja modaaliin tarvittava CSS (sivun tokenit, ei hex-värejä)
   · tmD3ArvioHTML(p, vastaukset, c) → modaalin HTML (5 ulottuvuutta × 1–5)       c: { esc, t, pid, nimi, dims:[{key,nimi,vQ}] }
   · tmD3ArvioKokoa(p, vastaukset, o)→ { d3_viimeisin, d3_taso, d3_pvm, d3_varmuus } | null — täsmälleen Masterin _tallennaD3:n laskenta (testi vartioi pariteettia)
   Kalibraatiokuilu: sama raja kuin lib/tm_eerikkila_normit.js renderD3VertailuHTML (max − min ≥ 1,5; pelaaja / valmentaja / VP) — pariteettitesti vartioi.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var TCFI = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_todistekortit_fi.js') : (root.TM_TODISTEKORTIT_FI || {});   // ulottuvuuksien nimet: tc_d3_<avain> (sv jo olemassa)
  /* Omat FI-avaimet (d3k_*); sv odottaa PM:ää (LIB_SV_ODOTTAA). Ei tc_*-avaimia: Profiilin selkokielisääntö (k4a2: ei "D3" tc-teksteissä) koskee Todistekorttien omia lauseita. */
  var FI = {
    d3k_nimi: 'Psyykkinen (D3)', d3k_ulottuvuus: 'Ulottuvuus', d3k_pel: 'PEL', d3k_val: 'VAL', d3k_vp: 'VP', d3k_ero_title: 'Ero vähintään 1,5 pistettä: hyvä aihe kalibrointiin', d3k_tyhja: 'Ei vielä D3-arviota.',
    d3k_tee_arvio: 'Tee arvio', d3k_paivita: 'Päivitä arvio', d3k_pvm: 'Arvioitu {pvm}',
    d3k_lause_matalampi: '{nimi} arvioi ulottuvuuden «{aihe}» selvästi valmentajia matalammaksi. Ota puheeksi kehityskeskustelussa.', d3k_lause_korkeampi: '{nimi} arvioi ulottuvuuden «{aihe}» selvästi valmentajia korkeammaksi. Ota puheeksi kehityskeskustelussa.',
    d3k_lause_valm_vp: 'Valmentajan ja VP:n arviot ulottuvuudesta «{aihe}» eroavat. Sopikaa yhteinen näkemys.', d3k_lause_vain_pelaaja: 'Vain pelaajan itsearvio. Valmentajan arvio puuttuu vielä.',
    d3k_lause_vain_valmentaja: 'Vain valmentajan arvio. Pelaaja ei ole vielä tehnyt itsearviota.', d3k_lause_linjassa: 'Pelaajan ja valmentajien arviot ovat samaa suuruusluokkaa.',
    d3k_modaali: 'Psyykkinen arvio: {nimi}', d3k_sulje: 'Sulje', d3k_ohje: 'Valmentajan arvio · 1 (harvoin) – 5 (lähes aina). Yhdistyy pelaajan itsearvioon keskiarvona.', d3k_tallenna: 'Tallenna arvio',
    d3k_tallennettu: 'D3-arvio tallennettu', d3k_anna_arvio: 'Anna vähintään yksi arvio', d3k_virhe: 'Tallennus epäonnistui. Yritä uudelleen.'
  };
  var D3 = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_d3_itsearvio.js') : root.TM_D3_ITSEARVIO;
  var DIMS = ['inner_drive', 'coachability', 'resilience', 'focus', 'emotional_control'];   // = D3_DIMS (lib/tm_eerikkila_normit.js)
  var KUILU_RAJA = 1.5;   // = renderD3VertailuHTML: kuilu >= 1.5

  function _t(c, k, par) {
    var v = c && typeof c.t === 'function' ? c.t(k) : null, s = (v != null && v !== k) ? v : (FI[k] != null ? FI[k] : (TCFI[k] != null ? TCFI[k] : k));
    if (par) Object.keys(par).forEach(function (n) { s = s.split('{' + n + '}').join(par[n] == null ? '' : String(par[n])); });
    return s;
  }
  function _e(c) { return (c && typeof c.esc === 'function') ? c.esc : function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }; }
  function _n(x) { return (typeof x === 'number' && isFinite(x) && x >= 1 && x <= 5) ? x : null; }
  function _pvmFi(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (parseInt(m[3], 10) + '.' + parseInt(m[2], 10) + '.' + m[1]) : ''; }
  function _yhdista(p) { return (p && D3 && D3.tmD3Yhdista) ? D3.tmD3Yhdista(p) : p; }   // dual-read: d3_itsearvio → .pelaaja (idempotentti; sivun lataus on jo yhdistänyt)

  function tmD3KorttiMalli(p, c) {
    var d = _yhdista(p) || {}, pisteet = (d.d3_viimeisin && d.d3_viimeisin.pisteet) || {}, varoja = 0, onArvo = false;
    var rivit = DIMS.map(function (k) {
      var pt = pisteet[k] || {}, pel = _n(pt.pelaaja), val = _n(pt.valmentaja), vp = _n(pt.vp);
      var vals = [pel, val, vp].filter(function (x) { return x != null; }), kuilu = vals.length >= 2 ? Math.max.apply(null, vals) - Math.min.apply(null, vals) : 0, varo = kuilu >= KUILU_RAJA;
      if (vals.length) onArvo = true; if (varo) varoja++;
      return { avain: k, nimi: _t(c, 'tc_d3_' + k), pel: pel, val: val, vp: vp, kuilu: kuilu, varo: varo };
    });
    var pvm = (d.d3_viimeisin && d.d3_viimeisin.pvm) || d.d3_pvm || (d.d3_itsearvio && d.d3_itsearvio.pvm) || null;
    if (!onArvo) return { tyhja: true, pvm: null, rivit: rivit, varoja: 0, lause: { avain: 'd3k_tyhja', par: null } };
    // Lause (D102, max 2): suurin kuilu pelaajan ja valmentajien (VAL/VP-keskiarvo) välillä → puheeksi; muuten valmentajat keskenään; muuten linjassa / puuttuva lähde.
    var paras = null;
    rivit.forEach(function (r) {
      var v = [r.val, r.vp].filter(function (x) { return x != null; }); if (r.pel == null || !v.length) return;
      var ka = v.reduce(function (a, b) { return a + b; }, 0) / v.length, ero = r.pel - ka;
      if (Math.abs(ero) >= KUILU_RAJA && (!paras || Math.abs(ero) > Math.abs(paras.ero))) paras = { r: r, ero: ero };
    });
    var lause;
    if (paras) lause = { avain: paras.ero < 0 ? 'd3k_lause_matalampi' : 'd3k_lause_korkeampi', par: { nimi: (c && c.nimi) || '', aihe: paras.r.nimi } };
    else {
      var vv = rivit.filter(function (r) { return r.val != null && r.vp != null && Math.abs(r.val - r.vp) >= KUILU_RAJA; })[0];
      var onP = rivit.some(function (r) { return r.pel != null; }), onV = rivit.some(function (r) { return r.val != null || r.vp != null; });
      lause = vv ? { avain: 'd3k_lause_valm_vp', par: { aihe: vv.nimi } } : !onV ? { avain: 'd3k_lause_vain_pelaaja', par: null } : !onP ? { avain: 'd3k_lause_vain_valmentaja', par: null } : { avain: 'd3k_lause_linjassa', par: null };
    }
    return { tyhja: false, pvm: pvm, rivit: rivit, varoja: varoja, lause: lause };
  }

  function tmD3KorttiHTML(m, c) {
    if (!m) return '';
    var esc = _e(c), pid = c && c.pid, nimi = _t(c, 'd3k_nimi'), lause = _t(c, m.lause.avain, m.lause.par);
    var rivitHTML = m.tyhja ? '' : '<div class="tc-d3-taulu" role="table" aria-label="' + esc(nimi) + '"><div class="tc-d3-rivi tc-d3-otsikko" role="row"><span role="columnheader">' + esc(_t(c, 'd3k_ulottuvuus')) + '</span>'
      + ['pel', 'val', 'vp'].map(function (s) { return '<span class="tc-d3-sar" role="columnheader">' + esc(_t(c, 'd3k_' + s)) + '</span>'; }).join('') + '<span aria-hidden="true"></span></div>'
      + m.rivit.map(function (r) {
        var sol = function (v) { return '<span class="tc-d3-sar tc-mono" role="cell">' + (v == null ? '–' : esc(String(v))) + '</span>'; };
        return '<div class="tc-d3-rivi' + (r.varo ? ' varo' : '') + '" role="row" data-d3-rivi="' + esc(r.avain) + '"><span class="tc-lbl" role="cell">' + esc(r.nimi) + '</span>' + sol(r.pel) + sol(r.val) + sol(r.vp)
          + '<span class="tc-d3-varo" role="cell"' + (r.varo ? ' title="' + esc(_t(c, 'd3k_ero_title')) + '" aria-label="' + esc(_t(c, 'd3k_ero_title')) + '"' : ' aria-hidden="true"') + '>' + (r.varo ? '⚠' : '') + '</span></div>';
      }).join('') + '</div>';
    var nappi = (c && c.voiKirjoittaa) ? '<button type="button" class="tc-act" data-tc-toiminto="d3_arvio" onclick="_ktTcToimi(' + esc(JSON.stringify(String(pid))) + ',&quot;d3_arvio&quot;,&quot;&quot;)">' + esc(_t(c, m.tyhja ? 'd3k_tee_arvio' : 'd3k_paivita')) + '</button>' : '';
    var meta = m.pvm ? '<span class="tc-mono">' + esc(_t(c, 'd3k_pvm', { pvm: _pvmFi(m.pvm) })) + '</span>' : '';
    var runko = '<div class="tc-k-pää"><span class="tc-k-nimi"><span class="tc-eb' + (m.tyhja ? ' w' : '') + '">' + esc(nimi) + '</span></span></div>'
      + '<p class="tc-lause">' + esc(lause) + '</p>' + rivitHTML + '<div class="tc-alarivi">' + nappi + meta + '</div>';
    var lyhyt = String(lause).split(/(?<=\.)\s/)[0];
    return '<details class="tc-k tc-d3' + (m.tyhja ? ' amber' : '') + '" data-tc-kortti="d3" open><summary class="tc-sum"><span class="tc-sum-t"><span class="tc-eb' + (m.tyhja ? ' w' : '') + '">' + esc(nimi) + '</span><span class="tc-sum-s">' + esc(lyhyt) + '</span></span>'
      + '<span class="tc-sum-nuoli" aria-hidden="true">▸</span></summary><div class="tc-k-runko">' + runko + '</div></details>';
  }

  function tmD3KorttiCss() {   // vain sivun tokenit (D169); ei hex-värejä
    return '.tc-d3-taulu{display:flex;flex-direction:column}.tc-d3-rivi{display:grid;grid-template-columns:minmax(0,1fr) 52px 52px 52px 22px;gap:8px;align-items:center;padding:9px 0;border-top:1px solid var(--line2);font-size:var(--fs-body)}'
      + '.tc-d3-otsikko{border-top:0;padding:0 0 6px;font-family:var(--font-m,monospace);font-size:var(--fs-small,11px);letter-spacing:.06em;color:var(--ink3)}.tc-d3-sar{text-align:center}.tc-d3-rivi.varo{color:var(--amber)}.tc-d3-varo{color:var(--amber);text-align:center}'
      + '.tc-d3m{position:fixed;inset:0;z-index:9200;background:var(--overlay,rgba(0,0,0,.55));display:flex;align-items:center;justify-content:center;padding:16px}.tc-d3m-k{background:var(--card);border:1px solid var(--line2);border-radius:10px;padding:20px 22px;max-width:560px;width:100%;max-height:90vh;overflow:auto;display:flex;flex-direction:column;gap:14px}'
      + '.tc-d3m-pää{display:flex;justify-content:space-between;align-items:center;gap:12px}.tc-d3m-x{background:none;border:0;color:var(--ink2);font-size:22px;cursor:pointer;min-width:44px;min-height:44px}.tc-d3m-ohje{font-size:var(--fs-small,12px);color:var(--ink3)}'
      + '.tc-d3m-q{display:flex;flex-direction:column;gap:6px}.tc-d3m-q small{color:var(--ink3)}.tc-d3m-l{display:flex;gap:6px}.tc-d3m-n{flex:1;min-height:44px;background:var(--card);border:1px solid var(--line2);color:var(--ink);border-radius:8px;font-size:var(--fs-body);cursor:pointer}'
      + '.tc-d3m-n.on{background:var(--fill);border-color:var(--fill);color:var(--on-fill)}.tc-d3m-tallenna{min-height:44px;border:0;border-radius:8px;background:var(--fill);color:var(--on-fill);font-size:var(--fs-body);cursor:pointer}'
      + '@media(max-width:720px){.tc-d3-rivi{grid-template-columns:minmax(0,1fr) 40px 40px 40px 20px;gap:4px}}';
  }

  function tmD3ArvioHTML(p, vastaukset, c) {
    var esc = _e(c), v = vastaukset || {}, pid = esc(JSON.stringify(String(c.pid)));
    var rivit = (c.dims || []).map(function (d) {
      return '<div class="tc-d3m-q"><b>' + esc(_t(c, 'tc_d3_' + d.key)) + '</b><small>' + esc(_t(c, d.vQ)) + '</small><div class="tc-d3m-l" role="group" aria-label="' + esc(_t(c, 'tc_d3_' + d.key)) + '">'
        + [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" class="tc-d3m-n' + (v[d.key] === n ? ' on' : '') + '" data-dim="' + esc(d.key) + '" data-n="' + n + '" aria-pressed="' + (v[d.key] === n ? 'true' : 'false') + '" onclick="_d3Valitse(&quot;' + esc(d.key) + '&quot;,' + n + ')">' + n + '</button>'; }).join('') + '</div></div>';
    }).join('');
    return '<div class="tc-d3m-k" role="dialog" aria-modal="true" aria-label="' + esc(_t(c, 'd3k_modaali', { nimi: c.nimi || '' })) + '" onclick="event.stopPropagation()"><div class="tc-d3m-pää"><span class="tc-eb">' + esc(_t(c, 'd3k_modaali', { nimi: c.nimi || '' })) + '</span>'
      + '<button type="button" class="tc-d3m-x" aria-label="' + esc(_t(c, 'd3k_sulje')) + '" onclick="_d3Sulje()">×</button></div><div class="tc-d3m-ohje">' + esc(_t(c, 'd3k_ohje')) + '</div>' + rivit
      + '<button type="button" class="tc-d3m-tallenna" onclick="_tallennaD3(' + pid + ')">' + esc(_t(c, 'd3k_tallenna')) + '</button></div>';
  }

  /* Sama laskenta kuin Masterin _tallennaD3 (valmentaja-arvio pisteisiin; keskiarvo valmentaja+pelaaja; lahteet; d3_varmuus). null kun ei yhtään arvoa. */
  function tmD3ArvioKokoa(p, vastaukset, o) {
    var d = _yhdista(p) || {}, v = vastaukset || {}, annettu = DIMS.filter(function (k) { return v[k] != null; });
    if (!annettu.length) return null;
    var pisteet = JSON.parse(JSON.stringify((d.d3_viimeisin && d.d3_viimeisin.pisteet) || {}));
    DIMS.forEach(function (k) { if (v[k] != null) { pisteet[k] = pisteet[k] || {}; pisteet[k].valmentaja = v[k]; } });
    var taso = D3.tmD3Avg(pisteet), lahteet = [], onP = false, onV = false;
    Object.keys(pisteet).forEach(function (k) { if (pisteet[k].valmentaja != null) onV = true; if (pisteet[k].pelaaja != null) onP = true; });
    if (onV) lahteet.push('valmentaja'); if (onP) lahteet.push('pelaaja');
    var pvm = o && o.pvm;
    return { d3_viimeisin: { pisteet: pisteet, pvm: pvm, lahteet: lahteet }, d3_taso: taso, d3_pvm: pvm, d3_varmuus: D3.tmD3Varmuus(lahteet) };
  }

  var API = { FI: FI, DIMS: DIMS, KUILU_RAJA: KUILU_RAJA, tmD3KorttiMalli: tmD3KorttiMalli, tmD3KorttiHTML: tmD3KorttiHTML, tmD3KorttiCss: tmD3KorttiCss, tmD3ArvioHTML: tmD3ArvioHTML, tmD3ArvioKokoa: tmD3ArvioKokoa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_D3_KORTTI = API;
})(typeof window !== 'undefined' ? window : this);
