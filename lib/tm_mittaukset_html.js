/* ════════════════════════════════════════════════════════════════════════
   tm_mittaukset_html.js — K4c (erä 83): "Kaikki mittaukset" -sheetin HTML + CSS (malli: lib/tm_mittaukset.js). Dual-export: module.exports || window.TM_MITTAUKSET_HTML.
   · tmMittauksetHTML(malli, c) → koko ruudun sheetin sisältö (kiinteä otsikkorivi + osiot). c: { esc, t, pid }
   · tmMittauksetCss()          → CSS (vain sivun tokenit D169: --fs-*, --ink*, --teal/--amber, --line2; ei hex-värejä; DM Mono vain .mk-eb)
   Toiminnot (sivun liima): _ktMkSulje() · _ktMkSuodata(s) · _ktMkOsio(osio) · _ktMkRivi(osio, testi) · _ktTcToimi(pid, avain, arg) (K4a). Ei emojeita; ⓘ-selitteet napin takana.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var M = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_mittaukset.js') : root.TM_MITTAUKSET, _t = M._t;
  function _e(c) { return (c && typeof c.esc === 'function') ? c.esc : function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }; }
  function _js(esc, x) { return esc(JSON.stringify(x == null ? '' : x)); }
  function _taso(r, c, esc) {
    var v = r.viimeisin; if (r.lahde === 'kasvu') return '<span class="mk-ei">–</span>';
    if (typeof v.taso !== 'number') return '<span class="mk-ei">' + esc(_t(c, r.eiNormia ? 'tc_ei_normia' : 'mk_ei_tasoa')) + '</span>';
    return '<span class="mk-luku">' + esc(String(Math.round(v.taso * 2) / 2).replace('.', ',') + ' / ' + r.max) + '</span>';
  }
  function _muutos(l, c, esc) {
    if (!l) return '<span class="mk-m flat" aria-label="' + esc(_t(c, 'mk_muutos_ei')) + '">–</span>';
    return '<span class="mk-m ' + l + '" aria-label="' + esc(_t(c, 'mk_muutos_' + l)) + '">' + (l === 'up' ? '↗' : l === 'down' ? '↘' : '–') + '</span>';
  }
  function _paiva(v, c, esc) { return v.pvmFi ? '<span class="mk-luku mk-pv-p">' + esc(v.pvmFi) + '</span><span class="mk-luku mk-pv-l">' + esc(v.pvmKort || v.pvmFi) + '</span>' + (v.merkki ? '<span class="mk-ika">' + esc(v.merkki) + '</span>' : '') : '<span class="mk-ei">' + esc(_t(c, 'mk_paiva_puuttuu')) + '</span>'; }
  function _info(id, tekstit, c, esc) {
    return '<button type="button" class="mk-i" aria-expanded="false" aria-controls="' + id + '" aria-label="' + esc(_t(c, 'mk_i_aria')) + '" onclick="var t=document.getElementById(\'' + id + '\');t.hidden=!t.hidden;this.setAttribute(\'aria-expanded\',String(!t.hidden))"><span aria-hidden="true">ⓘ</span></button>'
      + '<div class="mk-i-t" id="' + id + '" role="note" hidden>' + tekstit.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div>';
  }
  /* Käyrä: SVG, ylös = parempi (aikatesteissä käänteinen akseli). x = aika; sama päivä → tasavälein. */
  function _kayra(h, nimi, c, esc) {
    var P = h.kayra.pisteet, W = 320, H = 110, pad = 10, ms = P.map(function (x) { return Date.parse(x.pvm); }), v = P.map(function (x) { return x.arvo; });
    var mn = Math.min.apply(null, v), mx = Math.max.apply(null, v), rng = mx - mn || 1, t0 = ms[0], dt = ms[ms.length - 1] - t0;
    var xy = P.map(function (x, i) {
      var px = pad + (dt > 0 ? (ms[i] - t0) / dt : i / (P.length - 1)) * (W - 2 * pad), r = (x.arvo - mn) / rng, py = mx === mn ? H / 2 : pad + (h.kayra.pienempi ? r : 1 - r) * (H - 2 * pad);
      return [Math.round(px * 10) / 10, Math.round(py * 10) / 10];
    });
    var suunta = xy[xy.length - 1][1] < xy[0][1] ? 'ylos' : xy[xy.length - 1][1] > xy[0][1] ? 'alas' : 'tasan';
    return '<div class="mk-kayra" data-mk-kayra data-mk-suunta="' + suunta + '"><div class="mk-akseli" aria-hidden="true"><span>' + esc(_t(c, 'mk_akseli_parempi')) + '</span><span>' + esc(_t(c, 'mk_akseli_heikompi')) + '</span></div>'
      + '<div class="mk-kayra-k"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(_t(c, 'mk_kayra_aria', { nimi: nimi })) + '"><line class="mk-g" x1="0" y1="' + pad + '" x2="' + W + '" y2="' + pad + '"/><line class="mk-g" x1="0" y1="' + (H - pad) + '" x2="' + W + '" y2="' + (H - pad) + '"/>'
      + '<polyline points="' + xy.map(function (q) { return q.join(','); }).join(' ') + '"/>' + xy.map(function (q, i) { return '<circle cx="' + q[0] + '" cy="' + q[1] + '" r="' + (i === xy.length - 1 ? 4 : 3) + '"/>'; }).join('') + '</svg>'
      + '<div class="mk-x"><span>' + esc(P[0].pvm.split('-').reverse().map(Number).join('.')) + '</span><span>' + esc(P[P.length - 1].pvm.split('-').reverse().map(Number).join('.')) + '</span></div></div></div>';
  }
  function _historia(r, id, c, esc) {
    var h = r.historia;
    return '<tr class="mk-hr" id="' + id + '" data-mk-historia hidden><td colspan="7"><div class="mk-hist"><div class="mk-hist-v">' + _kayra(h, r.nimi, c, esc)
      + '<p class="mk-lause">' + esc(h.lause) + '</p><p class="mk-lause">' + esc(h.ero) + '</p>' + (h.vauhti ? '<p class="mk-lause" data-mk-vauhti>' + esc(h.vauhti) + '</p>' : '') + '</div>'
      + '<table class="mk-ht"><thead><tr><th>' + esc(_t(c, 'mk_c_paiva')) + '</th><th>' + esc(_t(c, 'mk_c_tulos')) + '</th><th>' + esc(_t(c, 'mk_c_taso')) + '</th><th>' + esc(_t(c, 'mk_c_lahde')) + '</th></tr></thead><tbody>'
      + h.pisteet.map(function (x) { return '<tr><td>' + esc(x.pvmFi || _t(c, 'mk_paiva_puuttuu')) + '</td><td class="mk-luku">' + esc(x.raaka) + '</td><td>' + (typeof x.taso === 'number' ? esc(String(Math.round(x.taso * 2) / 2).replace('.', ',') + ' / ' + x.max) : '<span class="mk-ei">–</span>') + '</td><td>' + esc(x.lahde) + '</td></tr>'; }).join('')
      + '</tbody></table></div></td></tr>';
  }
  function _taulu(o, c, esc) {
    var th = function (k, cls) { return '<th scope="col"' + (cls ? ' class="' + cls + '"' : '') + '>' + esc(_t(c, k)) + '</th>'; };
    var rivit = o.rivit.map(function (r) {
      var id = 'mkH-' + o.avain + '-' + r.id, auki = !!r.historia, nMitt = _t(c, r.n === 1 ? 'mk_n_mittaus' : 'mk_n_mittausta', { n: r.n }), v = r.viimeisin;
      var nimi = auki ? '<button type="button" class="mk-avaa" aria-expanded="false" aria-controls="' + id + '" aria-label="' + esc(_t(c, 'mk_avaa_historia', { nimi: r.nimi })) + '"><span class="mk-nuoli" aria-hidden="true">▸</span><span>' + esc(r.nimi) + '</span></button>' : '<span class="mk-nimi-p">' + esc(r.nimi) + '</span>';
      return '<tr class="mk-r' + (auki ? ' avattava' : '') + '" data-mk-testi="' + esc(r.id) + '"' + (auki ? ' onclick="_ktMkRivi(' + _js(esc, o.avain) + ',' + _js(esc, r.id) + ')"' : '') + '><th scope="row">' + nimi + '<span class="mk-ala">' + esc(nMitt) + '</span></th>'
        + '<td class="mk-luku">' + esc(v.raaka) + '</td><td class="mk-c-v">' + _taso(r, c, esc) + '</td><td class="mk-c-ed">' + (r.edellinen ? esc(r.edellinen.raaka) : '<span class="mk-ei">–</span>') + '</td><td class="mk-c-v">' + _muutos(r.muutos, c, esc) + '</td><td>' + _paiva(v, c, esc) + '</td><td class="mk-c-n">' + esc(nMitt) + '</td></tr>'
        + (auki ? _historia(r, id, c, esc) : '');
    }).join('');
    var kasvu = o.avain === 'kasvu';   // kasvumittaus: yksi mittaus, ei tasoa eikä vertailua → vain Testi · Viimeisin · Päivä · Mittauksia
    return '<div class="mk-kaari"><table class="mk-t' + (kasvu ? ' mk-kasvu' : '') + '"><thead><tr>' + th('mk_c_testi') + th('mk_c_viimeisin') + th('mk_c_taso', 'mk-c-v') + th('mk_c_edellinen', 'mk-c-ed') + th('mk_c_muutos', 'mk-c-v') + th('mk_c_paiva') + th('mk_c_mittauksia', 'mk-c-n') + '</tr></thead><tbody>' + rivit + '</tbody></table></div>';
  }
  function _peli(o, c, esc) {
    var P = o.peli, html = '';
    if (P) {
      var rivi = function (r, cls) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + ' data-mk-dim="' + esc(r.id) + '"><th scope="row">' + esc(r.nimi) + '</th><td class="mk-luku">' + esc(r.viimeisin) + '</td><td>' + (r.edellinen ? esc(r.edellinen) : '<span class="mk-ei">–</span>') + '</td><td>' + _muutos(r.muutos, c, esc) + '</td>'
        + r.arvioijat.map(function (x) { return '<td class="mk-luku">' + (x ? esc(x) : '<span class="mk-ei">–</span>') + '</td>'; }).join('') + '</tr>'; };
      html += '<div class="mk-kaari"><table class="mk-t mk-peli"><thead><tr>' + '<th scope="col">' + esc(_t(c, 'mk_c_ulottuvuus')) + '</th><th scope="col">' + esc(_t(c, 'mk_c_viimeisin')) + '</th><th scope="col">' + esc(_t(c, 'mk_c_edellinen')) + '</th><th scope="col">' + esc(_t(c, 'mk_c_muutos')) + '</th>'
        + P.arvioijat.map(function (n) { return '<th scope="col" class="mk-arv">' + esc(n) + '</th>'; }).join('') + '</tr></thead><tbody>' + P.rivit.map(function (r) { return rivi(r); }).join('') + (P.keskiarvo ? rivi(P.keskiarvo, 'mk-ka') : '')
        + P.lukitut.map(function (l) { return '<tr class="mk-lukittu" data-mk-lukittu="' + esc(l.id) + '"><th scope="row">' + esc(l.nimi) + '</th><td colspan="' + (3 + P.arvioijat.length) + '"><span class="mk-ei">' + esc(l.teksti) + '</span></td></tr>'; }).join('') + '</tbody></table></div>'
        + (P.lukko ? '<p class="mk-lukko" data-mk-lukko>' + esc(P.lukko) + '</p>' : '') + (P.vahan ? '<p class="mk-lause">' + esc(P.vahan) + '</p>' : '')
        + '<p class="mk-meta">' + esc(P.meta) + (P.merkki ? ' <span class="mk-ika">' + esc(P.merkki) + '</span>' : '') + '</p>';
    }
    if (o.d3) {
      var vp = o.d3.rivit.some(function (r) { return r.vp; });
      html += '<h3 class="mk-h3">' + esc(_t(c, 'mk_d3_otsikko')) + '</h3><p class="mk-meta">' + esc(_t(c, 'mk_d3_ohje')) + ' ' + esc(o.d3.pvmFi) + (o.d3.merkki ? ' <span class="mk-ika">' + esc(o.d3.merkki) + '</span>' : '') + '</p>'
        + '<div class="mk-kaari"><table class="mk-t" data-mk-psyykkinen><thead><tr><th scope="col">' + esc(_t(c, 'mk_c_ulottuvuus')) + '</th><th scope="col">' + esc(_t(c, 'mk_c_valmentaja')) + '</th>' + (vp ? '<th scope="col">' + esc(_t(c, 'mk_c_vp')) + '</th>' : '') + '</tr></thead><tbody>'
        + o.d3.rivit.map(function (r) { return '<tr><th scope="row">' + esc(r.nimi) + '</th><td class="mk-luku">' + (r.valmentaja ? esc(r.valmentaja) : '<span class="mk-ei">–</span>') + '</td>' + (vp ? '<td class="mk-luku">' + (r.vp ? esc(r.vp) : '<span class="mk-ei">–</span>') + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table></div>';
    }
    return html + (o.oma ? '<p class="mk-oma" data-mk-oma>' + esc(o.oma) + '</p>' : '');
  }
  function _osio(o, c, esc, pid) {
    var infot = [_t(c, 'mk_i_taso'), _t(c, 'mk_i_muutos'), _t(c, 'mk_i_paiva')];
    if (o.avain === 'peli') infot = [_t(c, 'mk_i_peli')]; else if (o.avain === 'keho') infot.push(_t(c, 'mk_i_keho')); else if (o.avain === 'kasvu') infot = [_t(c, 'mk_i_paiva')];
    if (o.selite) infot.push(o.selite);
    var runko;
    if (o.tyhja) runko = '<div class="mk-tyhja" data-mk-tyhja>' + (o.tyhjaOtsikko ? '<div class="mk-tyhja-o">' + esc(o.tyhjaOtsikko) + '</div>' : '') + '<p class="mk-lause">' + esc(o.tyhjaLause) + '</p>'
      + (o.toiminto ? '<button type="button" class="mk-act" data-tc-toiminto="' + esc(o.toiminto.avain) + '" onclick="_ktTcToimi(' + _js(esc, pid) + ',' + _js(esc, o.toiminto.avain) + ',' + _js(esc, o.toiminto.arg) + ')">' + esc(o.toiminto.teksti) + '</button>' : '') + '</div>';
    else if (o.eiKaudella) runko = '<p class="mk-lause" data-mk-ei-kaudella>' + esc(_t(c, 'mk_ei_kaudella')) + '</p>';
    else runko = (o.avain === 'peli' ? _peli(o, c, esc) : _taulu(o, c, esc)) + (o.tuki ? '<p class="mk-tuki" data-mk-tuki>' + esc(o.tuki) + '</p>' : '') + (o.matala ? '<p class="mk-lause mk-varoitus">' + esc(o.matala) + '</p>' : '');
    return '<section class="mk-osio" id="mkO-' + o.avain + '" data-mk-osio="' + o.avain + '" aria-labelledby="mkOt-' + o.avain + '"><div class="mk-osio-yla"><h2 class="mk-h" id="mkOt-' + o.avain + '">' + esc(o.nimi) + '</h2>'
      + (o.lahde ? '<span class="mk-meta">' + esc(_t(c, 'mk_lahde', { lahde: o.lahde })) + '</span>' : '') + (o.tyhja ? '' : _info('mkI-' + o.avain, infot, c, esc)) + '</div>' + runko + '</section>';
  }
  function tmMittauksetHTML(m, c) {
    c = c || {}; var esc = _e(c), pid = c.pid || '';
    var seg = ['kaikki', 'kausi'].map(function (s) { return '<button type="button" class="mk-seg-b' + (m.suodatin === s ? ' on' : '') + '" data-mk-suod="' + s + '" aria-pressed="' + (m.suodatin === s) + '" onclick="_ktMkSuodata(\'' + s + '\')">' + esc(_t(c, s === 'kausi' ? 'mk_kausi' : 'mk_kaikki')) + '</button>'; }).join('');
    var sirut = m.osiot.map(function (o) { return '<button type="button" class="mk-siru' + (o.tyhja ? ' tyhja' : '') + '" data-mk-ankkuri="' + o.avain + '" onclick="_ktMkOsio(\'' + o.avain + '\')">' + esc(o.nimi) + '</button>'; }).join('');
    return '<header class="mk-yla"><div class="mk-yla-r"><button type="button" class="mk-sulje" data-mk-sulje onclick="_ktMkSulje()">‹ ' + esc(_t(c, 'mk_takaisin')) + '</button>'
      + '<div class="mk-henk"><div class="mk-eb">' + esc(_t(c, 'mk_otsikko')) + '</div><h1 class="mk-nimi">' + esc(m.nimi) + '</h1><div class="mk-meta">' + esc([m.joukkue, m.ika].filter(Boolean).join(' · ')) + '</div></div>'
      + '<div class="mk-seg" role="group" aria-label="' + esc(_t(c, 'mk_suodatin_aria')) + '">' + seg + '</div></div><nav class="mk-sirut" aria-label="' + esc(_t(c, 'mk_osiot_aria')) + '">' + sirut + '</nav></header>'
      + '<div class="mk-runko">' + m.osiot.map(function (o) { return _osio(o, c, esc, pid); }).join('') + '</div>';
  }
  /* Profiilin kehys: todistekortit + "Näytä kaikki mittaukset" -nappi (avaa sheetin). Korvaa K2:n avattavan raakalistan (se säilyy Masterissa). */
  function tmMittauksetKehysHTML(kortitHTML, c) {
    c = c || {}; var esc = _e(c);
    return '<div class="kn-naytto" data-kn-naytto><div class="kn-kortit" data-kn-kortit>' + (kortitHTML || '') + '</div><div class="mk-linkki-rivi"><button type="button" class="mk-linkki" data-kn-kaikki-avaa onclick="_ktMkAvaa(' + _js(esc, c.pid) + ')">' + esc(_t(c, 'kn_kaikki')) + ' <span aria-hidden="true">›</span></button></div></div>';
  }
  function tmMittauksetCss() {
    return '.mk-linkki-rivi{margin:4px 0 8px}.mk-linkki{font-family:inherit;font-size:var(--fs-body);font-weight:600;color:var(--ink);background:var(--card);border:1px solid var(--line2);border-radius:8px;padding:0 18px;min-height:48px;cursor:pointer}.mk-linkki:hover{border-color:var(--teal)}'
      + '.mk-tausta{position:fixed;inset:0;z-index:9100;background:var(--bg);color:var(--ink);overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:var(--font-body)}.mk-sivu{max-width:1120px;margin:0 auto;padding:0 24px 56px}'
      + '.mk-yla{position:sticky;top:0;z-index:2;background:var(--bg);border-bottom:1px solid var(--line2);padding-top:12px}.mk-yla-r{display:flex;align-items:center;gap:16px;flex-wrap:wrap}'
      + '.mk-sulje{font-family:inherit;font-size:var(--fs-body);font-weight:600;color:var(--teal);background:none;border:0;cursor:pointer;min-height:44px;padding:0 4px;white-space:nowrap}.mk-henk{flex:1 1 220px;min-width:0}'
      + '.mk-eb{font-family:var(--font-mono);font-size:var(--fs-eb);letter-spacing:.12em;text-transform:uppercase;color:var(--teal);line-height:1.2}.mk-nimi{font-family:var(--font-display);font-weight:500;font-size:var(--fs-h2);line-height:1.15;margin:2px 0;color:var(--ink)}'
      + '.mk-meta{font-size:var(--fs-meta);color:var(--ink2);line-height:1.5}.mk-seg{display:inline-flex;border:1px solid var(--line2);border-radius:8px;overflow:hidden}.mk-seg-b{font-family:inherit;font-size:var(--fs-body);font-weight:600;color:var(--ink2);background:var(--card);border:0;padding:0 16px;min-height:44px;cursor:pointer}.mk-seg-b.on{background:var(--fill);color:var(--on-fill)}'
      + '.mk-sirut{display:flex;gap:8px;overflow-x:auto;white-space:nowrap;padding:10px 0 12px;-webkit-overflow-scrolling:touch}.mk-siru{flex:0 0 auto;font-family:inherit;font-size:var(--fs-body);font-weight:600;color:var(--ink);background:var(--card);border:1px solid var(--line2);border-radius:999px;padding:0 16px;min-height:44px;cursor:pointer}.mk-siru.tyhja{color:var(--ink2);border-style:dashed}'
      + '.mk-osio{margin:28px 0 0;scroll-margin-top:150px}.mk-osio-yla{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 8px}.mk-h{font-family:var(--font-display);font-weight:500;font-size:var(--fs-h2);line-height:1.2;margin:0;color:var(--ink)}.mk-h3{font-family:var(--font-display);font-weight:500;font-size:var(--fs-lead);margin:22px 0 2px;color:var(--ink)}'
      + '.mk-i{font-family:inherit;background:none;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;color:var(--ink2);font-size:var(--fs-body)}.mk-i-t{flex-basis:100%;background:var(--card);border:1px solid var(--line2);padding:4px 14px;border-radius:8px}.mk-i-t p{font-size:var(--fs-meta);line-height:1.5;color:var(--ink2);margin:8px 0}'
      + '.mk-kaari{overflow-x:auto;background:var(--card);border:1px solid var(--line2)}.mk-t{width:100%;border-collapse:collapse;font-size:var(--fs-body);color:var(--ink)}.mk-t th,.mk-t td{padding:10px 14px;text-align:left;border-top:1px solid var(--line2);vertical-align:middle;font-weight:400}'
      + '.mk-t thead th{border-top:0;font-size:var(--fs-meta);font-weight:600;color:var(--ink2);white-space:nowrap}.mk-t tbody th{font-weight:600}.mk-luku{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}.mk-ei{font-size:var(--fs-meta);color:var(--ink2)}'
      + '.mk-pv-l{display:none}.mk-kasvu .mk-c-ed,.mk-kasvu .mk-c-v{display:none}.mk-ala{display:none;font-size:var(--fs-meta);font-weight:400;color:var(--ink2)}.mk-ika{display:block;font-size:var(--fs-meta);color:var(--amber);font-weight:400}.mk-meta .mk-ika{display:inline}'
      + '.mk-m{font-size:var(--fs-body);font-weight:600;color:var(--ink2)}.mk-m.up{color:var(--teal)}.mk-m.flat{color:var(--ink3)}'
      + '.mk-r.avattava{cursor:pointer}.mk-avaa{font-family:inherit;font-size:var(--fs-body);font-weight:600;color:var(--ink);background:none;border:0;padding:0;cursor:pointer;text-align:left;min-height:44px;display:inline-flex;align-items:center;gap:8px}.mk-nuoli{color:var(--ink3);display:inline-block;transition:transform .15s}.mk-avaa[aria-expanded="true"] .mk-nuoli{transform:rotate(90deg)}'
      + '.mk-hr>td{background:var(--bg);padding:0}.mk-hist{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:24px;padding:18px 20px}.mk-hist-v{display:flex;flex-direction:column;gap:6px}.mk-lause{font-size:var(--fs-body);line-height:1.5;color:var(--ink2);margin:6px 0 0}'
      + '.mk-kayra{display:flex;gap:10px;align-items:stretch}.mk-akseli{display:flex;flex-direction:column;justify-content:space-between;font-size:var(--fs-meta);color:var(--ink2);padding:2px 0 22px}.mk-kayra-k{flex:1;min-width:0}.mk-kayra svg{display:block;width:100%;height:120px;color:var(--teal)}'
      + '.mk-kayra svg polyline{fill:none;stroke:currentColor;stroke-width:2;vector-effect:non-scaling-stroke}.mk-kayra svg circle{fill:currentColor}.mk-kayra svg .mk-g{stroke:var(--line2);stroke-width:1;vector-effect:non-scaling-stroke}.mk-x{display:flex;justify-content:space-between;font-size:var(--fs-meta);color:var(--ink2)}'
      + '.mk-ht{width:100%;border-collapse:collapse;font-size:var(--fs-body);align-self:start}.mk-ht th,.mk-ht td{padding:8px 10px;text-align:left;border-top:1px solid var(--line2);font-weight:400}.mk-ht thead th{border-top:0;font-size:var(--fs-meta);font-weight:600;color:var(--ink2)}'
      + '.mk-ka th,.mk-ka td{border-top:2px solid var(--line2)}.mk-lukittu th,.mk-lukittu td{color:var(--ink2)}.mk-lukko,.mk-tuki{font-size:var(--fs-body);line-height:1.5;color:var(--ink);margin:12px 0 0}.mk-lukko{color:var(--amber)}.mk-varoitus{color:var(--amber)}.mk-oma{font-size:var(--fs-body);line-height:1.5;color:var(--ink2);margin:18px 0 0;padding:12px 14px;border:1px solid var(--line2);background:var(--card)}'
      + '.mk-tyhja{border:1.5px dashed var(--amber);background:var(--amber-bg);padding:18px 20px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}.mk-tyhja-o{font-family:var(--font-display);font-size:var(--fs-h2);line-height:1.2;color:var(--ink)}'
      + '.mk-act{font-family:inherit;font-size:var(--fs-body);font-weight:600;color:var(--teal);text-decoration:underline;text-underline-offset:3px;background:none;border:0;cursor:pointer;min-height:44px;padding:0;text-align:left}'
      + '@media (max-width:719px){.mk-h{font-size:calc(var(--fs-lead) * 1.4)}.mk-pv-p{display:none}.mk-pv-l{display:inline}.mk-sivu{padding:0 16px 48px}.mk-nimi{font-size:var(--fs-lead)}.mk-c-ed,.mk-c-n{display:none}.mk-ala{display:block}.mk-t th,.mk-t td{padding:9px 8px}.mk-t{font-size:var(--fs-meta)}.mk-avaa{font-size:var(--fs-meta)}.mk-hist{grid-template-columns:1fr;gap:14px;padding:14px 12px}.mk-osio{scroll-margin-top:190px}.mk-seg{width:100%}.mk-seg-b{flex:1}.mk-yla-r{gap:8px}.mk-henk{flex-basis:calc(100% - 100px)}}';
  }
  var API = { tmMittauksetHTML: tmMittauksetHTML, tmMittauksetKehysHTML: tmMittauksetKehysHTML, tmMittauksetCss: tmMittauksetCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_MITTAUKSET_HTML = API;
})(typeof window !== 'undefined' ? window : this);
