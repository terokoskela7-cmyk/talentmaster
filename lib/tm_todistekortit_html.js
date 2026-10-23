/* ════════════════════════════════════════════════════════════════════════
   tm_todistekortit_html.js — K4a (D102): Profiili-välilehden todistekorttien HTML + CSS (malli: lib/tm_todistekortit.js). Dual-export: module.exports || window.TM_TODISTEKORTIT_HTML.
   · tmTodisteHTML(malli, c) → { yhteenvetoHTML, nauhaHTML, kortitHTML } (c.esc, c.pid, c.t); toiminnot onclick="_ktTcToimi(pid, avain, arg)"
   · tmTodisteCss()          → CSS (sivun tokenit D169; < 720 px = haitari: fokuskortti auki, muut yhden rivin tiivistelminä, napautus avaa)
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var M = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_todistekortit.js') : root.TM_TODISTEKORTIT;
  var _t = M._apu.t, _num = M._apu.num, _fmt = M._apu.fmt, _puoli = M._apu.puoli, RIVI_MAX = M.RIVI_MAX, FOKUS_RIVI_MAX = M.FOKUS_RIVI_MAX, PELI_RIVI_MAX = M.PELI_RIVI_MAX;
  /* ── HTML ── */
  function _e(c) { return (c && typeof c.esc === 'function') ? c.esc : function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }; }
  function _pisteet(r, esc, c) {
    if (!_num(r.taso)) return '<span class="tc-ei" aria-label="' + esc(_t(c, 'tc_ei_normia')) + '">' + (r.eiNormia ? esc(_t(c, 'tc_ei_normia')) : '') + '</span>';
    var puoli = _puoli(r.taso), h = '';
    for (var i = 1; i <= r.max; i++) h += '<i class="d' + (puoli >= i ? ' on' : (puoli === i - 0.5 ? ' puoli' : '')) + '"></i>';
    return '<span class="tc-dots" role="img" aria-label="' + esc('taso ' + _fmt(puoli, 1) + '/' + r.max) + '">' + h + '</span>';
  }
  function _trendiHTML(r, esc, c) {
    var l = r.trendi; if (!l) return '<span class="tc-tr flat" aria-label="' + esc(_t(c, 'tc_tr_ei')) + '">–</span>';
    return '<span class="tc-tr' + (l === 'up' ? '' : l === 'down' ? ' down' : ' flat') + '" aria-label="' + esc(_t(c, 'tc_tr_label_' + l)) + '">' + (l === 'up' ? '↗' : l === 'down' ? '↘' : '–') + '</span>';
  }
  function _riviHTML(r, esc, c) {
    if (r.vain === 'teksti') return '<div class="tc-rivi tc-rivi-teksti"><span class="tc-lbl">' + esc(r.nimi) + '</span><span class="tc-raw">' + esc(r.raaka) + '</span></div>';
    return '<div class="tc-rivi"><span class="tc-lbl">' + esc(r.nimi) + '</span><span class="tc-raw">' + esc(r.raaka) + '</span>' + _pisteet(r, esc, c) + _trendiHTML(r, esc, c) + '</div>';
  }
  function _toimiHTML(k, esc, pid) {
    var x = k.toiminto; if (!x) return '';
    return '<button type="button" class="tc-act" data-tc-toiminto="' + esc(x.avain) + '" onclick="_ktTcToimi(' + esc(JSON.stringify(String(pid))) + ',' + esc(JSON.stringify(x.avain)) + ',' + esc(JSON.stringify(x.arg == null ? '' : x.arg)) + ')">' + esc(x.teksti) + '</button>';
  }
  function _korttiHTML(k, esc, c, pid, maxRivit) {
    var amber = k.tyhja || (k.ika && k.ika.luokka !== 'normaali' && !k.fokus);
    if (k.avain === 'peli') maxRivit = Math.max(maxRivit, PELI_RIVI_MAX);   // Peli näyttää kaikki ikätason ulottuvuudet
    var rivit = (k.rivit || []).slice(0, maxRivit), lisaa = (k.rivit || []).length - rivit.length;
    var rivitHTML = rivit.map(function (r) { return _riviHTML(r, esc, c); }).join('');
    var meta = k.ikaMeta || '';
    var merkki = (k.merkit || []).map(function (m) { return '<span class="tc-badge ' + esc(m.tyyppi || '') + '">' + esc(m.teksti) + '</span>'; }).join('');
    var huomio = k.huomio ? '<span class="tc-badge w">' + esc(_t(c, 'tc_m_huomio')) + '</span>' : '';
    var selId = 'tcSel-' + String(k.avain).replace(/[^a-z0-9_-]/gi, '');   // ⓘ otsikon vieressä (ei omalla rivillä); selite avautuu lauseen alle
    var ikoni = k.selite ? '<button type="button" class="tc-i" data-tc-selite aria-expanded="false" aria-controls="' + selId + '" aria-label="' + esc(_t(c, 'tc_selite_aria')) + '" onclick="var t=document.getElementById(\'' + selId + '\');t.hidden=!t.hidden;this.setAttribute(\'aria-expanded\',String(!t.hidden))"><span aria-hidden="true">ⓘ</span></button>' : '';
    var runko = '<div class="tc-k-pää"><span class="tc-k-nimi"><span class="tc-eb' + (k.tyhja ? ' w' : '') + '">' + esc(k.nimi) + '</span></span><span class="tc-k-merkit">' + merkki + huomio + '</span></div>'
      + '<p class="tc-lause">' + esc(k.lause) + ikoni + '</p>'   // ⓘ lauseen perässä (inline), ei omalla rivillään
      + (k.selite ? '<p class="tc-i-t" id="' + selId + '" role="note" hidden>' + esc(k.selite) + '</p>' : '')
      + (k.apu ? '<div class="tc-mono">' + esc(k.apu) + '</div>' : '')
      + (rivitHTML ? '<div class="tc-rivit' + (k.fokus && rivit.length > 2 ? ' kaks' : '') + '">' + rivitHTML + '</div>' : '')
      + (k.kayra ? '<div class="tc-kayra"><span class="tc-kayra-siru" aria-hidden="true">' + k.kayra.siru + '</span><span class="tc-kayra-t"><span class="tc-raw">' + esc(k.kayra.ero) + '</span>' + (k.kayra.vauhti ? '<span class="tc-mono">' + esc(k.kayra.vauhti) + '</span>' : '') + '</span></div>' : '')
      + (lisaa > 0 ? '<div class="tc-mono tc-lisa">' + esc(_t(c, lisaa === 1 ? 'tc_lisa_testi' : 'tc_lisa_testeja', { n: lisaa })) + '</div>' : '')
      + (k.oma ? '<div class="tc-oma"><span class="tc-eb ink3">' + esc(_t(c, 'tc_oma_otsikko')) + '</span><span class="tc-oma-t">' + esc(k.oma) + '</span></div>' : '')
      + (meta ? '<div class="tc-mono amb">' + esc(meta) + '</div>' : '')
      + '<div class="tc-alarivi">' + _toimiHTML(k, esc, pid) + '<span class="tc-mono">' + esc([k.lahdeTeksti, k.avain === 'peli' ? k.lahdeMaara : ''].filter(Boolean).join(' · ')) + '</span></div>';
    var cls = 'tc-k' + (k.fokus ? ' fokus' : '') + (amber ? ' amber' : '');
    if (k.fokus) return '<article class="' + cls + '" data-tc-kortti="' + esc(k.avain) + '" data-tc-fokus>' + runko + '</article>';
    var tr = k.trendi === 'up' ? '↗' : k.trendi === 'down' ? '↘' : '–';
    var lyhyt = String(k.lause || '').split(/(?<=\.)\s/)[0];
    return '<details class="' + cls + '" data-tc-kortti="' + esc(k.avain) + '" open><summary class="tc-sum"><span class="tc-sum-t"><span class="tc-eb' + (k.tyhja ? ' w' : '') + '">' + esc(k.nimi) + '</span><span class="tc-sum-s">' + esc(lyhyt) + '</span></span>'
      + '<span class="tc-tr' + (k.trendi === 'down' ? ' down' : k.trendi === 'up' ? '' : ' flat') + '" aria-hidden="true">' + tr + '</span><span class="tc-sum-nuoli" aria-hidden="true">▸</span></summary><div class="tc-k-runko">' + runko + '</div></details>';
  }
  function _koontiHTML(k, esc, c, pid) {
    var lista = k.puuttuvat.map(function (x) { return '<div class="tc-miss"><span>' + esc(x.nimi) + '</span><span class="tc-mono">' + esc(x.aika) + '</span></div>'; }).join('');
    return '<article class="tc-k amber koonti" data-tc-kortti="koonti"><div class="tc-k-pää"><span class="tc-eb w">' + esc(k.nimi) + '</span><span class="tc-badge w">' + esc(k.merkki.teksti) + '</span></div>'
      + '<p class="tc-lause">' + esc(k.lauseN) + '</p>' + '<div>' + lista + '</div>'
      + '<button type="button" class="tc-btn" data-tc-toiminto="mittaus" onclick="_ktTcToimi(' + esc(JSON.stringify(String(pid))) + ',\'mittaus\',\'kierros\')">' + esc(k.toiminto.teksti) + '</button></article>';
  }
  function tmTodisteHTML(m, c) {
    c = c || {}; var esc = _e(c), pid = c.pid || '', y = m.yhteenveto;
    var yht;
    if (m.tyhjaKaikki) yht = '<section class="tc-sek tc-s-yht" aria-label="' + esc(_t(c, 'tc_yhteenveto')) + '"><div class="tc-eb">' + esc(_t(c, 'tc_yhteenveto')) + '</div><div class="tc-k"><p class="tc-lause">' + esc(y.tyhjaLause) + '</p><div class="tc-mono">' + esc(y.tyhjaApu) + '</div></div></section>';
    else {
      var kolme = '<div class="tc-yht-grid' + (y.puuttuu ? '' : ' kaks') + '">'
        + '<div class="tc-yht-solu"><div class="tc-eb ink3">' + esc(_t(c, 'tc_vahvuus')) + '</div><div class="tc-yht-arvo">' + esc(y.vahvuus ? y.vahvuus.nimi : _t(c, 'tc_yht_ei_kohdetta')) + '</div>' + (y.vahvuus ? '<div class="tc-mono">' + esc(y.vahvuus.meta) + '</div>' : '') + '</div>'
        + '<div class="tc-yht-solu"><div class="tc-eb ink3">' + esc(_t(c, 'tc_kehityskohde')) + '</div><div class="tc-yht-arvo">' + esc(y.kehityskohde ? y.kehityskohde.nimi : _t(c, 'tc_yht_ei_kohdetta')) + '</div>' + (y.kehityskohde ? '<div class="tc-mono">' + esc(y.kehityskohde.meta) + '</div>' : '') + '</div>'
        + (y.puuttuu ? '<div class="tc-yht-solu amber"><div class="tc-eb w">' + esc(_t(c, 'tc_puuttuu')) + '</div><div class="tc-yht-arvo">' + esc(y.puuttuu.nimi) + '</div><button type="button" class="' + (m.koonti ? 'tc-act' : 'tc-btn') + '" data-tc-toiminto="mittaus" onclick="_ktTcToimi(' + esc(JSON.stringify(String(pid))) + ',\'mittaus\',' + esc(JSON.stringify(y.puuttuu.toiminto.arg || '')) + ')">' + esc(y.puuttuu.toiminto.teksti) + '</button></div>' : '') + '</div>';
      yht = '<section class="tc-sek tc-s-yht" aria-label="' + esc(_t(c, 'tc_yhteenveto')) + '"><div class="tc-yht-otsikko"><div class="tc-eb">' + esc(_t(c, 'tc_yhteenveto')) + '</div>' + (y.viimeisin ? '<div class="tc-mono">' + esc(y.viimeisin) + '</div>' : '') + '</div>' + kolme + '</section>';
    }
    var nauha = '<section class="tc-sek tc-nauha-sek tc-s-nauha" role="group" aria-label="' + esc(_t(c, 'tc_kokonaiskuva')) + '"><div class="tc-yht-otsikko"><div class="tc-eb ink3">' + esc(_t(c, 'tc_kokonaiskuva')) + '</div><div class="tc-mono tc-nauha-ohje">' + esc(_t(c, 'tc_nauha_ohje')) + '</div></div>'
      + m.nauha.map(function (r) {
        return '<div class="tc-nauha" data-tc-nauha="' + esc(r.avain) + '"><span class="tc-lbl"><span class="tc-pitka">' + esc(r.nimi) + '</span><span class="tc-lyhyt">' + esc(r.lyhyt) + '</span></span><span class="tc-bar" aria-hidden="true"><i' + (r.pct != null ? ' style="width:' + r.pct + '%"' : ' class="tyhja"') + '></i></span><span class="tc-raw">' + esc(r.arvo) + '</span><span class="tc-mono tc-kattavuus">' + esc(r.kattavuus) + '</span></div>';
      }).join('') + '</section>';
    /* K4e: c.jalkeen = { <korttiavain>: html } → lisäkortti heti kyseisen kortin jälkeen (esim. Psyykkinen (D3) Fyysisen jälkeen); fokuskortin jälkeen ruudukon ensimmäiseksi; jos kohdekorttia ei näytetä → ruudukon loppuun */
    var jalkeen = (c && c.jalkeen) || {}, sijoitettu = {}, ruudukonAlku = '';
    var lisaa = function (k) { var h = jalkeen[k.avain]; if (!h || sijoitettu[k.avain]) return ''; sijoitettu[k.avain] = true; return h; };
    var fokus = m.kortit.filter(function (k) { return k.fokus; }).map(function (k) { var h = _korttiHTML(k, esc, c, pid, FOKUS_RIVI_MAX); ruudukonAlku += lisaa(k); return h; }).join('');
    var muut = ruudukonAlku + m.kortit.filter(function (k) { return !k.fokus; }).map(function (k) { return (k.koonti ? _koontiHTML(k, esc, c, pid) : _korttiHTML(k, esc, c, pid, RIVI_MAX)) + lisaa(k); }).join('');
    Object.keys(jalkeen).forEach(function (avain) { if (!sijoitettu[avain] && jalkeen[avain]) { muut += jalkeen[avain]; sijoitettu[avain] = true; } });
    var kortitHTML = '<section class="tc-sek tc-s-kortit" aria-label="' + esc(_t(c, 'tc_todisteet')) + '"><div class="tc-eb">' + esc(_t(c, 'tc_todisteet')) + '</div>' + fokus + '<div class="tc-ruudukko">' + muut + '</div></section>';
    var raportti = '<div class="tc-raportti-rivi"><button type="button" class="kt-nappi tc-raportti" data-tc-raportti onclick="_avaaPelaajaraportti(' + esc(JSON.stringify(String(pid))) + ')">' + esc(_t(c, 'tc_x_pelaajaraportti')) + '</button></div>';
    return { raporttiHTML: raportti, yhteenvetoHTML: yht, nauhaHTML: nauha, kortitHTML: kortitHTML };
  }
  function tmTodisteCss() {   // vain sivun tokenit (D169: --fs-*, --ink*, --teal/--amber, --font-*); ei hex-värejä. DM Mono vain yläotsikoissa (.tc-eb)
    return '.kn-naytto{container-type:inline-size}.kn-kortit{display:flex;flex-direction:column}.tc-raportti-rivi{display:flex;justify-content:flex-end;order:0;margin:0 0 8px}.tc-s-yht{order:1}.tc-s-nauha{order:2}.tc-s-kortit{order:4}.tc-eb{font-family:var(--font-mono);font-size:var(--fs-eb);letter-spacing:.12em;text-transform:uppercase;color:var(--teal);line-height:1.2}.tc-eb.w{color:var(--amber)}.tc-eb.ink3{color:var(--ink3)}'
      + '.tc-mono{font-size:var(--fs-meta);color:var(--ink2);line-height:1.5}.tc-mono.amb{color:var(--amber)}'
      + '.tc-sek{display:flex;flex-direction:column;gap:12px;margin:0 0 22px}.tc-yht-otsikko{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}'
      + '.tc-yht-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--line2);border:1px solid var(--line2)}.tc-yht-grid.kaks{grid-template-columns:repeat(2,minmax(0,1fr))}'
      + '.tc-yht-solu{background:var(--card);padding:18px 20px;display:flex;flex-direction:column;gap:6px;align-items:flex-start;min-width:0}.tc-yht-solu.amber{background:var(--amber-bg);gap:10px}'
      + '.tc-yht-arvo{font-family:var(--font-display);font-size:var(--fs-h2);line-height:1.2;color:var(--ink)}'
      + '.tc-nauha-sek{background:var(--card);border:1px solid var(--line2);padding:16px 20px;gap:6px}'
      + '.tc-nauha{display:grid;grid-template-columns:150px minmax(0,1fr) 84px 96px;align-items:center;gap:14px;padding:6px 0;border-top:1px solid var(--line2)}'
      + '.tc-lbl{font-size:var(--fs-body);font-weight:500;line-height:1.3;color:var(--ink)}.tc-lyhyt{display:none}.tc-raw{font-size:var(--fs-meta);font-weight:600;font-variant-numeric:tabular-nums;color:var(--ink);text-align:right}'
      + '.tc-bar{height:8px;background:var(--line2);position:relative;display:block}.tc-bar i{position:absolute;left:0;top:0;bottom:0;background:var(--fill)}.tc-bar i.tyhja{right:0;background:transparent;border:1px dashed var(--amber)}'
      + '.tc-ruudukko{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.tc-ruudukko:empty{display:none}'
      + '.tc-k{background:var(--card);border:1px solid var(--line2);padding:20px 22px;display:flex;flex-direction:column;gap:14px;min-width:0}.tc-k.fokus{border-color:var(--teal);background:var(--teal-bg)}.tc-k.amber{border-color:var(--amber)}.tc-k.koonti{background:var(--amber-bg)}'
      + 'details.tc-k{padding:0;gap:0}details.tc-k>.tc-k-runko{padding:20px 22px;display:flex;flex-direction:column;gap:14px;min-width:0}.tc-sum{display:none}'
      + '.tc-k-pää{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.tc-k-merkit{display:flex;gap:6px;flex-wrap:wrap}'
      + '.tc-lause{font-family:var(--font-display);font-size:calc(var(--fs-lead) * 1.3);line-height:1.3;color:var(--ink);margin:0}'
      + '.tc-rivit{display:flex;flex-direction:column}.tc-rivit.kaks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 32px}'
      + '.tc-rivi{display:grid;grid-template-columns:minmax(0,1fr) 84px 76px 22px;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line2)}.tc-rivi-teksti{grid-template-columns:minmax(0,1fr) auto}'
      + '.tc-dots{display:flex;gap:4px;justify-content:flex-end}.tc-dots .d{width:8px;height:8px;border-radius:50%;border:1px solid var(--line2);box-sizing:border-box;display:inline-block}.tc-dots .d.on{background:var(--fill);border-color:var(--fill)}'
      + '.tc-dots .d.puoli{background:linear-gradient(90deg,var(--fill) 50%,transparent 50%);border-color:var(--fill)}.tc-ei{font-size:var(--fs-meta);color:var(--ink2);text-align:right}'
      + '.tc-tr{font-size:var(--fs-body);font-weight:600;color:var(--teal);text-align:right}.tc-tr.flat{color:var(--ink3)}.tc-tr.down{color:var(--amber)}'
      + '.tc-k-nimi{display:inline-flex;align-items:center;gap:2px;min-width:0}.tc-i{font-family:inherit;background:none;border:0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin:-14px -6px;vertical-align:middle;color:var(--ink2);font-size:var(--fs-body)}.tc-i-t{font-size:var(--fs-meta);line-height:1.5;color:var(--ink2);margin:0}'
      + '.tc-act{font-family:inherit;font-size:var(--fs-body);font-weight:600;line-height:1.2;color:var(--teal);text-decoration:underline;text-underline-offset:3px;padding:12px 0;min-height:44px;box-sizing:border-box;align-self:flex-start;background:none;border:0;cursor:pointer;text-align:left}'
      + '.tc-btn{font-family:inherit;font-size:var(--fs-body);font-weight:600;line-height:1;background:var(--fill);color:var(--on-fill);border:0;padding:12px 16px;min-height:48px;cursor:pointer;border-radius:6px}'
      + '.tc-alarivi{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}'
      + '.tc-badge{font-size:var(--fs-meta);font-weight:600;line-height:1;padding:5px 8px;border:1px solid var(--line2);color:var(--ink2)}.tc-badge.f{border-color:var(--teal);color:var(--teal)}.tc-badge.w{border-color:var(--amber);color:var(--amber);background:var(--amber-bg)}'
      + '.tc-kayra{display:flex;align-items:center;gap:14px;padding:4px 0 10px}.tc-kayra-t{display:flex;flex-direction:column;gap:4px}.tc-kayra .tc-raw{text-align:left}'
      + '.tc-oma{display:flex;gap:12px;align-items:center;padding:10px 12px;border:1px solid var(--line2);background:var(--bg)}.tc-oma-t{font-size:var(--fs-body);line-height:1.4;color:var(--ink2)}'
      + '.tc-miss{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line2);font-size:var(--fs-body);font-weight:500;line-height:1.3;color:var(--ink)}'
      /* mobiili (säiliö < 720 px, @container): haitari — fokuskortti auki, muut yhden rivin tiivistelminä; nauhasta pois kattavuussarake */
      + '@container (max-width:719px){.tc-raportti-rivi{order:3;justify-content:flex-start}.tc-yht-grid,.tc-yht-grid.kaks{grid-template-columns:1fr}.tc-yht-solu{padding:12px 16px;flex-direction:row;flex-wrap:wrap;justify-content:space-between;align-items:baseline}.tc-yht-solu.amber{flex-direction:column;align-items:stretch}.tc-yht-solu .tc-btn{width:100%}.tc-yht-arvo{font-size:var(--fs-lead);text-align:right}'
      + '.tc-nauha{grid-template-columns:96px minmax(0,1fr) 66px;gap:10px}.tc-kattavuus,.tc-nauha-ohje,.tc-pitka{display:none}.tc-lyhyt{display:inline}'
      + '.tc-ruudukko{grid-template-columns:1fr}.tc-k{border-radius:10px;padding:16px}.tc-rivit.kaks{display:flex}.tc-rivi{grid-template-columns:minmax(0,1fr) 62px 62px 16px;gap:8px;padding:9px 0}'
      + 'details.tc-k:not([open])>.tc-k-runko{display:none}details.tc-k .tc-sum{display:flex;align-items:center;gap:10px;min-height:56px;padding:12px 16px;cursor:pointer;list-style:none;box-sizing:border-box}details.tc-k .tc-sum::-webkit-details-marker{display:none}'
      + '.tc-sum-t{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}.tc-sum-s{font-size:var(--fs-meta);line-height:1.3;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tc-sum-nuoli{color:var(--ink3)}'
      + 'details.tc-k[open]>.tc-sum{border-bottom:1px solid var(--line2)}details.tc-k[open]>.tc-sum .tc-sum-s,details.tc-k[open]>.tc-sum .tc-tr{display:none}details.tc-k[open]>.tc-sum .tc-sum-nuoli{transform:rotate(90deg)}details.tc-k>.tc-k-runko .tc-k-nimi>.tc-eb{display:none}details.tc-k>.tc-k-runko .tc-k-pää{justify-content:flex-start}details.tc-k>.tc-k-runko .tc-k-pää:not(:has(.tc-badge)){display:none}}';
  }

  var API = { tmTodisteHTML: tmTodisteHTML, tmTodisteCss: tmTodisteCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TODISTEKORTIT_HTML = API;
})(typeof window !== 'undefined' ? window : this);
