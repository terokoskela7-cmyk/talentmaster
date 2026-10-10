/* ════════════════════════════════════════════════════════════════════════
   tm_vp_koti_joukkueet.js — Kodin (Rytmi) JOUKKUEKORTIT ikävaiheittain (D171 palauttaa D159:n; mockup 32 + 33; D160 jaksottomat, D116 pieni joukkue, D147 ei nappeja kortissa, D169). PURE.
   Dual-export: module.exports || window.TM_VP_KOTI_JOUKKUEET. Kutsuja: lib/tm_vp_koti.js (tmKotiRytmiMalli / tmKotiRytmiHTML).
     · tmKotiIkaRyhmat(joukkueRivit, ilmanRivit, huomioSyy, kaikki) → [{ ikavaihe, ika:{a,b}, joukkueita, jaksolla, kortit[], ilman[], ilmanYhteen }]   (ikäjärjestys; ryhmät eivät ole joukkueita)
     · tmKotiJoukkueetHTML(ryhmat, o)  → HTML   o = { esc, t, fn, kk(f, ...arg), kapea, fill, plur, luku }   leveä: kortit (3 / 2 / 1 sarakkeella) · kapea (< 600 px): rivit
   Ikävaihe tulee joukkueen ikävaiheesta (kooste: syntymävuodesta, 9–12 Leikkijä · 13–15 Rakentaja · 16–19 Showcase). Ryhmittely ei ole paremmuusjärjestys (D42): järjestys on ikä.
   Kortti on KOKONAAN klikattava (role=button) eikä sisällä nappeja (D147). Huomio: amber-reuna + "▲ huomio" + syy yhdellä rivillä; sama syy kerran (D150).
   Pieni joukkue (alle 5): luvut lukumääränä ilman prosenttia (D116). Leikkijä: "perhe kuittaa" metatekstinä, ei lukusolussa. 0 pelaajan joukkueet eivät näy (D160).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var PIENI = 5, ILMAN_KORTTEINA = 2;   // jaksottomat korteiksi kun ≤ 2, muuten yksi katkoviivakortti tunnisteineen (D160)
  var IV = { leikkija: { k: 'Leikkijä', a: 9, b: 12 }, rakentaja: { k: 'Rakentaja', a: 13, b: 15 }, showcase: { k: 'Showcase', a: 16, b: 19 } }, JARJ = ['leikkija', 'rakentaja', 'showcase', null];
  function _num(x) { return typeof x === 'number' && isFinite(x); }

  /* joukkueRivit = jaksolliset (km.jaksollaRivit), ilmanRivit = jaksottomat (km.odottaa), huomioSyy = { jid: signaali }, kaikki = koko rivijärjestys (m.rivit, ikäjärjestys) */
  function tmKotiIkaRyhmat(joukkueRivit, ilmanRivit, huomioSyy, kaikki) {
    var jaks = {}, ilm = {}, ryh = {};
    (joukkueRivit || []).forEach(function (r) { jaks[r.jid] = r; }); (ilmanRivit || []).forEach(function (r) { ilm[r.jid] = r; });
    (kaikki || []).forEach(function (x) {
      if (!(x.n > 0) || (!jaks[x.jid] && !ilm[x.jid])) return;
      var iv = IV[x.ikavaihe] ? x.ikavaihe : null, g = ryh[iv] = ryh[iv] || { ikavaihe: iv, kortit: [], ilman: [], ikaMin: null, ikaMax: null };
      if (_num(x.ikaNum)) { g.ikaMin = g.ikaMin == null ? x.ikaNum : Math.min(g.ikaMin, x.ikaNum); g.ikaMax = g.ikaMax == null ? x.ikaNum : Math.max(g.ikaMax, x.ikaNum); }
      if (jaks[x.jid]) { var r = jaks[x.jid], sy = (huomioSyy || {})[x.jid] || null; g.kortit.push(Object.assign({}, r, { huomio: !!sy, syy: sy, syyToistuu: !!(sy && sy.toistuu), ikaNum: x.ikaNum, leikkija: !!x.leikkija, katsausC: x.katsaus, kayttoC: x.kaytto })); } else g.ilman.push(Object.assign({}, ilm[x.jid], { n: x.n }));
    });
    return JARJ.filter(function (iv) { return ryh[iv]; }).map(function (iv) {
      var g = ryh[iv], b = IV[iv] || { a: g.ikaMin, b: g.ikaMax };
      return { ikavaihe: iv, ika: { a: g.ikaMin != null ? Math.min(b.a != null ? b.a : g.ikaMin, g.ikaMin) : b.a, b: g.ikaMax != null ? Math.max(b.b != null ? b.b : g.ikaMax, g.ikaMax) : b.b },
        joukkueita: g.kortit.length + g.ilman.length, jaksolla: g.kortit.length, kortit: g.kortit, ilman: g.ilman, ilmanYhteen: g.ilman.length > ILMAN_KORTTEINA };
    });
  }

  /* kortin luvut: pieni joukkue = lukumäärä (3/4), muuten prosentti; puuttuva luku = ei solua; leikkijällä ei Katsaus-solua (perhe kuittaa) */
  function _luvut(r, o) {
    var out = [], esc = o.esc, t = o.t;
    var solu = function (nimike, c) {
      if (!c || c.o == null || !(c.n > 0)) return '';   // puuttuva luku = ei solua (ei "—")
      var teksti = r.n < PIENI ? c.o + '/' + c.n : Math.round(100 * c.o / c.n) + ' %';
      return '<span class="kk-nu"><span class="kk-nk">' + esc(t(nimike)) + '</span><span class="kk-v' + (r.huomio && r.syy && r.syy.tyyppi === (nimike === 'Katsaus' ? 'katsaus_laskee' : 'kaytto_matala') ? ' w' : '') + '">' + esc(teksti) + '</span></span>';
    };
    if (!r.luvut) return '<span class="kk-nu kk-perh"><span class="kk-nk">' + esc(t('perheitä mukana')) + '</span><span class="kk-v">' + esc(o.luku(r.perheet.a, r.perheet.b)) + '</span></span>';   // kattavuusportti (D125): ilman suostumuskattavuutta ei perheperusteisia lukuja
    if (!r.leikkija) out.push(solu('Katsaus', r.katsausC));
    out.push(solu('Käyttö 7 pv', r.kayttoC));
    return out.join('');
  }
  function _syy(r, o) {
    var sy = r.syy, t = o.t; if (!sy || r.syyToistuu) return '';
    return sy.tyyppi === 'katselmusikkuna' ? (sy.pv != null ? o.fill(t('Katselmusikkuna sulkeutuu {pv} päivän päästä'), { pv: sy.pv }) : t('Katselmusikkuna on auki')) : sy.tyyppi === 'katsaus_laskee' ? t('Katsaus laskenut kolme viikkoa') : o.fill(t('Käyttö {pros} %, tavoite {tav} %'), { pros: sy.pros, tav: sy.tavoite });
  }
  function _vkMeta(r, o) { return (r.vk ? o.fill(o.t('vk {vk}/{N}'), r.vk) : '') + (r.leikkija ? (r.vk ? ' · ' : '') + o.t('perhe kuittaa') : ''); }
  function _pelTeksti(r, o) { return o.fill(o.t('{n} pel.'), { n: r.n }); }

  function _kortti(r, o) {
    var esc = o.esc, t = o.t, why = _syy(r, o), N = r.vk && r.vk.N, nyt = r.vk && r.vk.vk, seg = '';
    if (_num(N) && N > 0) { for (var i = 1; i <= N; i++) seg += '<i class="' + (i < nyt ? 'on' : i === nyt ? 'nyt' : '') + '"></i>'; }
    var klik = (o.fn.joukkue ? o.kk('joukkue', r.nimi) + ' role="button" tabindex="0"' : '');
    return '<div class="kk-jk' + (r.huomio ? ' w' : '') + '"' + klik + ' aria-label="' + esc(r.nimi) + '"><div class="kk-jkt"><span class="kk-jtn" title="' + esc(r.nimi) + '">' + esc(r.tunniste) + '</span><span class="kk-mk' + (r.huomio ? ' w' : '') + '">' + esc(r.huomio ? '▲ ' + t('huomio') : _pelTeksti(r, o)) + '</span></div>'
      + (r.huomio ? '<div class="kk-sub">' + esc(_pelTeksti(r, o)) + '</div>' : '')
      + '<div class="kk-jak"><b>' + esc(r.teema || t('Jakso käynnissä')) + '</b>' + (seg ? '<div class="kk-vk" style="--n:' + N + '" role="img" aria-label="' + esc(o.fill(t('vk {vk}/{N}'), r.vk)) + '">' + seg + '</div>' : '') + '<span class="kk-vkl">' + esc(_vkMeta(r, o)) + '</span></div>'
      + (why ? '<div class="kk-why">' + esc(why) + '</div>' : '') + '<div class="kk-nums">' + _luvut(r, o) + '</div></div>';
  }
  function _rivi(r, o) {
    var esc = o.esc, t = o.t, why = _syy(r, o), klik = (o.fn.joukkue ? o.kk('joukkue', r.nimi) + ' role="button" tabindex="0"' : '');
    return '<div class="kk-jr' + (r.huomio ? ' w' : '') + '"' + klik + ' aria-label="' + esc(r.nimi) + '"><span class="kk-tn" title="' + esc(r.nimi) + '">' + esc(r.tunniste) + (r.huomio ? ' <span class="kk-mk w" title="' + esc(t('huomio')) + '">▲</span>' : '') + '</span>'
      + '<span class="kk-te"><b>' + esc(r.teema || t('Jakso käynnissä')) + '</b><span class="kk-m">' + esc(_pelTeksti(r, o) + (_vkMeta(r, o) ? ' · ' + _vkMeta(r, o) : '')) + '</span>' + (why ? '<span class="kk-why">' + esc(why) + '</span>' : '') + '</span>'
      + '<span class="kk-nums kk-rn">' + _luvut(r, o) + '</span><span class="kk-ar" aria-hidden="true">→</span></div>';
  }
  /* jaksoton joukkue katkoviivakorttina: "Ei jaksoa" + "Aloita jakso →" tekstinä (koko kortti on klikattava, ei nappia sisällä) */
  function _ilmanKortti(r, o) {
    var esc = o.esc, t = o.t, klik = (o.fn.joukkue ? o.kk('joukkue', r.nimi) + ' role="button" tabindex="0"' : '');
    return '<div class="kk-jk ei"' + klik + ' aria-label="' + esc(r.nimi) + '"><div class="kk-jkt"><span class="kk-jtn" title="' + esc(r.nimi) + '">' + esc(r.tunniste) + '</span><span class="kk-mk">' + esc(r.n != null ? _pelTeksti(r, o) : '') + '</span></div><div class="kk-jak"><b>' + esc(t('Ei jaksoa')) + '</b></div><div class="kk-nums"><span class="kk-lnk-t">' + esc(t('Aloita jakso →')) + '</span></div></div>';
  }
  /* kolme+ jaksotonta: YKSI katkoviivakortti tunnisteineen (D144: 6 + "+N") ja "Aloita jaksot" -linkki */
  function _ilmanYhteen(g, o) {
    var esc = o.esc, t = o.t, L = g.ilman, auki = !!(o.auki && o.auki['ilman_' + g.ikavaihe]), nayt = auki ? L : L.slice(0, 6), loput = L.length - nayt.length, avain = 'ilman_' + g.ikavaihe;
    return '<div class="kk-ilman"><div><div class="kk-ilman-h">' + esc(o.plur(t, L.length, '{n} joukkue ilman jaksoa', '{n} joukkuetta ilman jaksoa')) + '</div><div class="kk-tags">'
      + nayt.map(function (j) { return '<button type="button" class="kk-tag" title="' + esc(j.nimi) + '"' + o.kk('joukkue', j.nimi) + '>' + esc(j.tunniste) + '</button>'; }).join('') + (loput > 0 ? '<button type="button" class="kk-tag"' + o.kk('auki', avain) + '>+' + loput + '</button>' : '') + '</div></div>'
      + (o.fn.aloitaJaksot ? '<button class="kk-lnk" type="button"' + o.kk('aloitaJaksot') + '>' + esc(t('Aloita jaksot →')) + '</button>' : '') + '</div>';
  }

  function tmKotiJoukkueetHTML(ryhmat, o) {
    var esc = o.esc, t = o.t;
    return (ryhmat || []).map(function (g) {
      var iv = IV[g.ikavaihe], otsikko = (g.ika.a != null && g.ika.b != null ? o.fill(t('{a}–{b}-vuotiaat'), { a: g.ika.a, b: g.ika.b }) : t('Ikävaihe tuntematon')), meta = (iv ? t(iv.k) + ' · ' : '') + o.plur(t, g.joukkueita, '{n} joukkue', '{n} joukkuetta') + ' · ' + o.fill(t('{n} jaksolla'), { n: g.jaksolla });
      var kortit = g.kortit.map(function (r) { return o.kapea ? _rivi(r, o) : _kortti(r, o); }).join(''), ilman = '';
      if (g.ilman.length) ilman = g.ilmanYhteen ? '' : g.ilman.map(function (r) { return _ilmanKortti(r, o); }).join('');
      var sisalto = (o.kapea ? (kortit ? '<div class="kt-vl kk-list">' + kortit + '</div>' : '') : (kortit ? '<div class="kk-jg">' + kortit + '</div>' : '')) + (ilman ? '<div class="kk-jg kk-jg-ei">' + ilman + '</div>' : '') + (g.ilmanYhteen ? _ilmanYhteen(g, o) : '');
      return '<div class="kk-ika" data-ikavaihe="' + esc(g.ikavaihe || 'tuntematon') + '"><div class="kk-ikah"><b>' + esc(otsikko) + '</b><span>' + esc(meta) + '</span></div>' + sisalto + '</div>';
    }).join('');
  }

  var CSS = [
    '.kk-ika{display:grid;gap:10px}.kk-ika+.kk-ika{margin-top:18px}.kk-ikah{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;font-size:var(--fs-body,14px);color:var(--ink3)}.kk-ikah b{font-size:var(--fs-body,14px);color:var(--ink2);font-weight:600}',
    '.kk-jg{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:10px}.kk-jg-ei{margin-top:0}',
    '.kk-jk{border:1px solid var(--border);border-radius:8px;background:var(--bg);padding:14px 16px 12px;display:grid;gap:8px;cursor:pointer;color:inherit;font:inherit;text-align:left;position:relative;align-content:start}.kk-jk:hover{border-color:var(--ink3)}.kk-jk:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
    '.kk-jk.w{border-color:var(--amber);box-shadow:inset 3px 0 0 var(--amber)}.kk-jk.ei{border-style:dashed;background:transparent}.kk-jk.ei .kk-jak b{color:var(--ink3);font-weight:500}',
    '.kk-jkt{display:flex;justify-content:space-between;align-items:baseline;gap:8px;min-width:0}.kk-jtn{font-family:var(--font-serif);font-size:var(--fs-h2,26px);line-height:1;font-weight:500;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kk-mk{font-size:var(--fs-meta,12.5px);color:var(--ink2);white-space:nowrap;flex:none}   /* pitkä tunniste (ruotsinkieliset nimet) typistyy kolmeen pisteeseen; pelaajamäärä ei katkea */.kk-mk.w{color:var(--amber);font-weight:600}.kk-sub{font-size:var(--fs-meta,12.5px);color:var(--ink2);margin-top:-4px}',
    '.kk-jak{display:grid;gap:5px}.kk-jak b{font-size:var(--fs-lead,16px);font-weight:600;line-height:1.25;overflow-wrap:anywhere}.kk-vkl{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.kk-why{font-size:var(--fs-meta,12.5px);color:var(--amber)}',
    '.kk-vk{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:3px}.kk-vk i{height:5px;border-radius:2px;background:var(--ov-2)}.kk-vk i.on{background:var(--teal)}.kk-vk i.nyt{background:var(--teal);box-shadow:0 0 0 1px var(--ink3)}',
    '.kk-nums{display:flex;gap:16px;border-top:1px solid var(--border);padding-top:8px;min-height:20px}.kk-nums .kk-nu{display:grid}.kk-lnk-t{font-size:var(--fs-body,14px);font-weight:600;color:var(--teal)}.kk-v.w{color:var(--amber)}',
    '.kk-ilman{border:1px dashed var(--ink3);border-radius:8px;padding:14px 16px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:repeating-linear-gradient(135deg,transparent 0 9px,var(--ov-1) 9px 10px)}.kk-ilman-h{font-family:var(--font-serif);font-size:var(--fs-h2,26px);line-height:1.1}.kk-ilman .kk-tags{margin-top:6px}',
    '.kk-jr.w{box-shadow:inset 3px 0 0 var(--amber)}',
    /* ruudukko: kolme korttia rivissä leveällä (≥ 700 px), kaksi keskikokoisella (420–699), yksi kapealla; < 600 px viewport → rivit (JS: o.kapea) */
    '@container (min-width:700px){.kk-jg{grid-template-columns:repeat(3,minmax(0,1fr))}}@container (min-width:420px) and (max-width:699px){.kk-jg{grid-template-columns:repeat(2,minmax(0,1fr))}}@container (max-width:419px){.kk-jg{grid-template-columns:minmax(0,1fr)}.kk-ilman{grid-template-columns:minmax(0,1fr)}}'
  ].join('\n');

  var API = { CSS: CSS, tmKotiIkaRyhmat: tmKotiIkaRyhmat, tmKotiJoukkueetHTML: tmKotiJoukkueetHTML, IKAVAIHEET: IV };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VP_KOTI_JOUKKUEET = API;
})(typeof window !== 'undefined' ? window : null);
