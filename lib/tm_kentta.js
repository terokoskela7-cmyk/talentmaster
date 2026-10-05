/* ════════════════════════════════════════════════════════════════════════
   tm_kentta.js — K0: Kenttä-komponentti (PURE, ei Firebasea, ei DOM:ia, toimii offline). Inline-SVG + HTML-kerros merkkijonoina, kuten lib/tm_piirros.js.
   Mockup: docs/design/idp-v2/09_pelaaja_kentta.html (osio 0 · Idea + kaikki data-pitch-variantit), suunnitelma 10 (osiot 4–5), brief docs/CODE_BRIEF_KENTTA_K0.md.
   Yksi komponentti, neljä katsojaa (pelaaja, huoltaja, valmentaja, katselmus): kerrokset kuten spec:ssä — ase (alue) · reitti · viikkomerkit · osat · historia · lempipaikka · vaihtoehdot.

   tmKentta(spec, opts) → { svg, html, data } (opts.wrap === true → yksi merkkijono: <div class="kt"> svg + html </div>)
     spec = { koko:'puoli'|'koko', ase:{alue:{x,y,w,h}, nimi, sub, tila:'ok'|'puuttuu'}|null,
              reitti:{loppu:'maali'|'kaveri'|'kausitavoite', col:'teal'|'blue', faint}|null, viikot:{n, tehty, valmis}|null,
              osat:[{k,nimi,x,y,tila:'itsenaisesti'|'ohjatusti'|'ei_viela'|'nyt'}], historia:[{loppu}], lempipaikka:{x,y}|null,
              vaihtoehdot:[{k:'A',loppu},{k:'B',loppu}]|null }
     opts = { t:fn(avain)→teksti, wrap, luokka, ariaLabel }
     Koordinaatit: leveys 0–100, pituus 0–140, hyökkäys ylös. koko:'puoli' leikkaa vain näkymän (viewBox 0 0 100 84), ei muuta koordinaatteja.
     Reitti: EI vapaata piirtoa — alku = ase.alue keskipiste, loppu = kiinteä piste (maali 48,8 · kaveri 74,24 · kausitavoite 50,30), kolme välipistettä (lievä kaari).
     Viikkomerkit tasavälein reitillä: i < tehty → täysi (.kt-vk-tehty) · i === tehty && !valmis → "nyt" (.kt-vk-nyt) · muuten tyhjä (.kt-vk) · valmis → kaikki täynnä.
     data = { viewBox, alue, reitti:[[x,y]…]|null, viikot:[{x,y,tila}]|null } — testattava geometria.
   VÄRIT: vain CSS-luokissa jotka osoittavat tokeneihin (--chalk --chalk2 --teal --teal-dim --amber --amber-dim --blue --ink --bg); lib ei sisällä hex-/rgb-värejä
   (brändiportti). tmKenttaCss() palauttaa luokat tyylilohkoksi. Tekstit (sinun aseesi, nyt, ase puuttuu…) opts.t:n läpi; ilman t:tä avain sellaisenaan.
   §7.22: viikkomerkit ovat KESTOA, eivät suoritusta; osan tila on sana; ei lukuarvoja, ei vertailua.
   Dual-export: module.exports || window.TM_KENTTA (+ window.tmKentta, window.tmKenttaCss).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var LOPPU = { maali: [48, 8], kaveri: [74, 24], kausitavoite: [50, 30] };
  var OLETUS_ALUE = { x: 30, y: 48, w: 40, h: 30 };
  var OSA_TILA = { itsenaisesti: 'itsenäisesti', ohjatusti: 'ohjatusti', ei_viela: 'ei vielä', nyt: 'nyt' };

  function _n(v) { return Math.round(v * 100) / 100; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _luku(v, ala, yla, oletus) { v = Number(v); return isFinite(v) ? Math.min(yla, Math.max(ala, v)) : oletus; }
  function _kaanna(opts) { return (opts && typeof opts.t === 'function') ? opts.t : function (k) { return k; }; }

  function _alue(ase) {
    var a = ase && ase.alue;
    if (!a || !isFinite(Number(a.x)) || !isFinite(Number(a.y)) || !isFinite(Number(a.w)) || !isFinite(Number(a.h))) return null;
    return { x: _luku(a.x, 0, 100, 0), y: _luku(a.y, 0, 140, 0), w: _luku(a.w, 1, 100, 1), h: _luku(a.h, 1, 140, 1) };
  }

  // Reitti: alkupiste → loppupiste kolmella välipisteellä (lievä sivuttaiskaari; deterministinen). Palauttaa 5 pistettä.
  function tmKenttaReitti(alku, loppu) {
    var pisteet = [[_n(alku[0]), _n(alku[1])]];
    var dx = loppu[0] - alku[0], dy = loppu[1] - alku[1], pit = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / pit, ny = dx / pit;   // normaali
    [0.25, 0.5, 0.75].forEach(function (t) {
      var kaari = Math.sin(Math.PI * t) * 3;
      pisteet.push([_n(alku[0] + dx * t + nx * kaari), _n(alku[1] + dy * t + ny * kaari)]);
    });
    pisteet.push([loppu[0], loppu[1]]);
    return pisteet;
  }
  function _polku(p) { return p.map(function (q, i) { return (i ? 'L' : 'M') + q[0] + ' ' + q[1]; }).join(' '); }
  // Piste murtoviivalla suhteessa t (0–1), pituuden mukaan.
  function _pisteReitilla(p, t) {
    var L = [], kok = 0, i;
    for (i = 1; i < p.length; i++) { var d = Math.sqrt(Math.pow(p[i][0] - p[i - 1][0], 2) + Math.pow(p[i][1] - p[i - 1][1], 2)); L.push(d); kok += d; }
    var x = t * kok;
    for (i = 0; i < L.length; i++) {
      if (x <= L[i] || i === L.length - 1) { var u = L[i] ? Math.min(1, x / L[i]) : 0; return [_n(p[i][0] + (p[i + 1][0] - p[i][0]) * u), _n(p[i][1] + (p[i + 1][1] - p[i][1]) * u)]; }
      x -= L[i];
    }
    return [p[0][0], p[0][1]];
  }

  function _viivat() {
    return '<g class="kt-line">'
      + '<line x1="0" y1="70" x2="100" y2="70"/><circle cx="50" cy="70" r="13"/>'
      + '<rect x="20" y="0" width="60" height="23"/><rect x="35" y="0" width="30" height="8"/>'
      + '<rect x="20" y="117" width="60" height="23"/><rect x="35" y="132" width="30" height="8"/>'
      + '<path d="M39 23a13 13 0 0 0 22 0"/><path d="M39 117a13 13 0 0 1 22 0"/>'
      + '</g>';
  }

  function tmKentta(spec, opts) {
    spec = spec || {}; opts = opts || {};
    var t = _kaanna(opts);
    var H = spec.koko === 'koko' ? 140 : 84;
    var viewBox = '0 0 100 ' + H;
    var svg = [], html = [];
    var data = { viewBox: viewBox, alue: null, reitti: null, viikot: null };

    var ase = spec.ase || null;
    var alue = _alue(ase);
    var asePuuttuu = !ase || ase.tila === 'puuttuu' || !alue;
    var kaytAlue = alue || OLETUS_ALUE;
    data.alue = { x: kaytAlue.x, y: kaytAlue.y, w: kaytAlue.w, h: kaytAlue.h, puuttuu: asePuuttuu };
    var alku = [kaytAlue.x + kaytAlue.w / 2, kaytAlue.y + kaytAlue.h / 2];

    svg.push(_viivat());

    // Historia: haaleat jäljet (kiinteät, edellisten jaksojen suunta); ei oikeaa reittidataa → siirretty alkupiste per merkintä.
    (Array.isArray(spec.historia) ? spec.historia : []).forEach(function (h, i) {
      var loppu = LOPPU[h && h.loppu] || LOPPU.maali;
      var a = [Math.max(2, alku[0] - 6 * (i + 1)), Math.min(H - 2, alku[1] + 10 * (i + 1))];
      svg.push('<path class="kt-historia" d="' + _polku(tmKenttaReitti(a, loppu)) + '"/>');
    });

    // Reitit: yksittäinen reitti TAI vaihtoehdot (A teal, B sininen, haalea).
    var reitit = [];
    if (Array.isArray(spec.vaihtoehdot) && spec.vaihtoehdot.length) {
      spec.vaihtoehdot.forEach(function (v, i) { reitit.push({ loppu: v && v.loppu, b: i > 0, faint: i > 0, k: v && v.k, vaiht: true }); });
    } else if (spec.reitti) {
      reitit.push({ loppu: spec.reitti.loppu, b: spec.reitti.col === 'blue', faint: !!spec.reitti.faint });
    }
    var paaReitti = null;
    reitit.forEach(function (r, i) {
      var loppu = LOPPU[r.loppu] || LOPPU.maali;
      var p = tmKenttaReitti(alku, loppu);
      if (i === 0) paaReitti = p;
      svg.push('<path class="kt-reitti' + (r.b ? ' kt-reitti-b' : '') + (r.faint ? ' kt-faint' : '') + '" d="' + _polku(p) + '"/>');
      if (i === 0) data.reitti = p;
      if (r.vaiht) {
        html.push('<div class="kt-osa" style="left:' + _n(loppu[0] - 6) + '%;top:' + _n(Math.max(0, loppu[1] - 7) / H * 100) + '%">' + _esc(r.k) + ' · ' + _esc(t(r.loppu === 'kaveri' ? 'kaveri' : r.loppu === 'kausitavoite' ? 'kausitavoite' : 'maali')) + '</div>');
      }
    });
    if (paaReitti) {
      var loppuP = paaReitti[paaReitti.length - 1];
      if (!reitit[0].b) svg.push('<circle class="kt-maali" cx="' + loppuP[0] + '" cy="' + loppuP[1] + '" r="1.6"/>');
    }

    // Viikkomerkit: vain jos on reitti ja viikot
    var vk = spec.viikot;
    if (paaReitti && vk && Number(vk.n) > 0) {
      var n = Math.min(24, Math.floor(Number(vk.n))), tehty = _luku(vk.tehty, 0, n, 0), valmis = !!vk.valmis;
      data.viikot = [];
      for (var i = 0; i < n; i++) {
        var q = _pisteReitilla(paaReitti, (i + 1) / n);
        var tila = (valmis || i < tehty) ? 'tehty' : (i === tehty ? 'nyt' : 'tyhja');
        data.viikot.push({ x: q[0], y: q[1], tila: tila });
        var cls = tila === 'tehty' ? 'kt-vk-tehty' : tila === 'nyt' ? 'kt-vk-nyt' : 'kt-vk';
        svg.push('<circle class="' + cls + '" cx="' + q[0] + '" cy="' + q[1] + '" r="' + (tila === 'nyt' ? 3.2 : 2.4) + '"/>');
      }
    }

    // Lempipaikka (U8–12): pallo
    if (spec.lempipaikka && isFinite(Number(spec.lempipaikka.x)) && isFinite(Number(spec.lempipaikka.y))) {
      var lx = _luku(spec.lempipaikka.x, 0, 100, 50), ly = _luku(spec.lempipaikka.y, 0, 140, 50);
      svg.push('<circle class="kt-pallo" cx="' + lx + '" cy="' + ly + '" r="3"/>');
      html.push('<div class="kt-osa" style="left:' + _n(Math.min(70, lx + 4)) + '%;top:' + _n(Math.max(0, ly - 12) / H * 100) + '%">' + _esc(t('tässä tykkään pelata')) + '</div>');
    }

    // Ase: alue HTML-kerroksena (nimi + sub). Puuttuu → katkoviiva, ei täyttöä.
    var top = _n(kaytAlue.y / H * 100), hh = _n(kaytAlue.h / H * 100);
    var geom = 'left:' + _n(kaytAlue.x) + '%;top:' + top + '%;width:' + _n(kaytAlue.w) + '%;height:' + hh + '%';
    if (asePuuttuu) {
      html.push('<div class="kt-ase-puuttuu" style="' + geom + '"><b>' + _esc(t('ase puuttuu')) + '</b></div>');
    } else {
      html.push('<div class="kt-ase" style="' + geom + '"><b>' + _esc(ase.nimi) + '</b><span>' + _esc(ase.sub != null ? ase.sub : t('sinun aseesi')) + '</span></div>');
    }

    // Osat: tagit (nimi + tilasana)
    (Array.isArray(spec.osat) ? spec.osat : []).forEach(function (o) {
      if (!o) return;
      var sana = OSA_TILA[o.tila] ? t(OSA_TILA[o.tila]) : '';
      var ox = _luku(o.x, 0, 100, 50), oy = _luku(o.y, 0, 140, 50);
      html.push('<div class="kt-osa' + (o.tila === 'nyt' ? ' kt-osa-nyt' : '') + '" style="left:' + _n(ox) + '%;top:' + _n(oy / H * 100) + '%">'
        + _esc(o.k) + (o.nimi ? ' · ' + _esc(o.nimi) : '') + (sana ? ' · ' + _esc(sana) : '') + '</div>');
    });

    var label = opts.ariaLabel != null ? opts.ariaLabel : t('Kenttä');
    var svgStr = '<svg class="kt-svg" viewBox="' + viewBox + '" role="img" aria-label="' + _esc(label) + '">' + svg.join('') + '</svg>';
    var htmlStr = '<div class="kt-layer">' + html.join('') + '</div>';
    if (opts.wrap === true) return '<div class="kt' + (opts.luokka ? ' ' + _esc(opts.luokka) : '') + '">' + svgStr + htmlStr + '</div>';
    return { svg: svgStr, html: htmlStr, data: data };
  }

  // Tyylit: vain tokenit (ei hex/rgb). Kenttä-kehys: .kt (position:relative) sisältää SVG:n ja .kt-layer-kerroksen.
  function tmKenttaCss() {
    return [
      '.kt{position:relative;border:1.5px solid var(--chalk);border-radius:4px;overflow:hidden;background:var(--bg)}',
      '.kt-svg{display:block;width:100%;height:auto}',
      '.kt-layer{position:absolute;inset:0;pointer-events:none}',
      '.kt-line{fill:none;stroke:var(--chalk);stroke-width:.8}',
      '.kt-line2,.kt-historia{fill:none;stroke:var(--chalk2);stroke-width:1.6;stroke-dasharray:2 2.5}',
      '.kt-reitti{fill:none;stroke:var(--teal);stroke-width:1.2;stroke-dasharray:2 2.2}',
      '.kt-reitti-b{stroke:var(--blue)}',
      '.kt-faint{opacity:.5}',
      '.kt-vk{fill:var(--bg);stroke:var(--teal);stroke-width:1}',
      '.kt-vk-tehty{fill:var(--teal);stroke:var(--teal);stroke-width:1}',
      '.kt-vk-nyt{fill:var(--amber);stroke:var(--amber);stroke-width:1}',
      '.kt-maali{fill:var(--teal)}',
      '.kt-pallo{fill:var(--ink);stroke:var(--bg);stroke-width:.8}',
      '.kt-ase{position:absolute;display:grid;align-content:end;gap:1px;padding:7px 8px;box-sizing:border-box;background:var(--teal-dim);border:1.5px dashed var(--teal);border-radius:3px}',
      '.kt-ase b{color:var(--teal);font-weight:800;line-height:1}',
      '.kt-ase span{font-size:11px;color:var(--ink)}',
      '.kt-ase-puuttuu{position:absolute;display:grid;align-content:end;padding:7px 8px;box-sizing:border-box;background:transparent;border:1.5px dashed var(--chalk2);border-radius:3px}',
      '.kt-ase-puuttuu b{font-size:11px;font-weight:500;color:var(--ink)}',
      '.kt-osa{position:absolute;font-size:11px;line-height:1.2;color:var(--ink);background:var(--bg);border:1px solid var(--chalk2);border-radius:3px;padding:2px 6px;white-space:nowrap}',
      '.kt-osa-nyt{background:var(--amber-dim);border-color:var(--amber);color:var(--amber)}'
    ].join('\n');
  }

  var API = { tmKentta: tmKentta, tmKenttaCss: tmKenttaCss, tmKenttaReitti: tmKenttaReitti, LOPPU: LOPPU, OLETUS_ALUE: OLETUS_ALUE };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root && typeof window !== 'undefined') { root.TM_KENTTA = API; root.tmKentta = tmKentta; root.tmKenttaCss = tmKenttaCss; }
})(typeof window !== 'undefined' ? window : this);
