/* ════════════════════════════════════════════════════════════════════════
   tm_kentta.js — K0: Kenttä-komponentti (PURE, ei Firebasea, ei DOM:ia, toimii offline). Inline-SVG + HTML-kerros merkkijonoina, kuten lib/tm_piirros.js.
   Mockup: docs/design/idp-v2/09_pelaaja_kentta.html (osio 0 · Idea + kaikki data-pitch-variantit), suunnitelma 10 (osiot 4–5), brief docs/CODE_BRIEF_KENTTA_K0.md.
   Yksi komponentti, neljä katsojaa (pelaaja, huoltaja, valmentaja, katselmus): kerrokset kuten spec:ssä — ase (alue) · reitti · viikkomerkit · osat · historia · lempipaikka · vaihtoehdot.

   tmKentta(spec, opts) → { svg, html, data } (opts.wrap === true → yksi merkkijono: <div class="kt"> svg + html </div>)
     spec = { koko:'puoli'|'koko', ase:{alue:{x,y,w,h}, nimi, sub, tila:'ok'|'puuttuu'}|null,
              reitti:{loppu:'maali'|'kaveri'|'kausitavoite', col:'teal'|'blue', faint}|null, viikot:{n, tehty, valmis}|null,
              osat:[{k,nimi,x,y,tila:'itsenaisesti'|'ohjatusti'|'ei_viela'|'nyt'}], historia:[{loppu}], lempipaikka:{x,y}|null,
              vaihtoehdot:[{k:'A',loppu},{k:'B',loppu}]|null, ilmanAluetta:true|undefined }   (ilmanAluetta: ei ase-/oma alue -laatikkoa eikä tekstiä; data.alue = null — pelkkä kenttä)
     opts = { t:fn(avain)→teksti, wrap, luokka, ariaLabel }
     Koordinaatit: leveys 0–100, pituus 0–140, hyökkäys ylös. koko:'puoli' leikkaa vain näkymän (viewBox 0 0 100 84), ei muuta koordinaatteja.
     Reitti: EI vapaata piirtoa — alku = ase.alue keskipiste, loppu = kiinteä piste (maali 48,8 · kaveri 74,24 · kausitavoite 50,30), kolme välipistettä (lievä kaari).
     Viikkomerkit tasavälein reitillä: i < tehty → täysi (.kt-vk-tehty) · i === tehty && !valmis → "nyt" (.kt-vk-nyt) · muuten tyhjä (.kt-vk) · valmis → kaikki täynnä.
     data = { viewBox, alue, reitti:[[x,y]…]|null, viikot:[{x,y,tila}]|null } — testattava geometria.
   VÄRIT: vain CSS-luokissa jotka osoittavat tokeneihin (--chalk --chalk2 --teal --teal-dim --amber --amber-dim --blue --ink --bg); lib ei sisällä hex-/rgb-värejä
   (brändiportti). tmKenttaCss() palauttaa luokat tyylilohkoksi. Tekstit (sinun vahvuutesi, nyt, vahvuus valitaan pian…) opts.t:n läpi; ilman t:tä avain sellaisenaan. D54: käyttäjälle ei koskaan "ase" — opts.rooli:'henkilokunta' → "ydinvahvuus"/"ydinvahvuus puuttuu"; muuten (oletus, pelaaja/huoltaja) "sinun vahvuutesi"/"vahvuus valitaan pian".
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

  /* K1b: nimitarran paikka. Luvut ovat kentän yksikköjä (leveys 0–100, pituus 0–H). Tarra on 11–15 px tekstiä + "ydinvahvuus" -rivi (noin 60 px korkea): alle ~30 yksikön levyiseen tai alle ~20 yksikön korkuiseen alueeseen se ei mahdu sisään
     (390 px:n kentällä yksikkö ≈ 3,4 px) → viereen (leveämmälle puolelle) tai, matalalle leveälle alueelle, alle / yläpuolelle. Muuten sisällä alueen alareunassa kuten ennen. */
  var TARRA_KAPEA = 30, TARRA_MATALA = 20;
  function tmKenttaTarra(a, H) {
    var kapea = a.w < TARRA_KAPEA, matala = a.h < TARRA_MATALA;
    if (!kapea && !matala) return { paikka: 'sisalla', tyyli: '' };
    var oikea = 100 - (a.x + a.w), vasen = a.x;
    if (kapea) {
      var oik = oikea >= vasen, tila = Math.max(6, (oik ? oikea : vasen) - 3), top = _n((a.y + a.h * 0.42) / H * 100);   // alueen keskikorkeus: rangaistusalueen ja keskipiirin välissä on viivaton kaista
      return { paikka: oik ? 'oikea' : 'vasen', tyyli: (oik ? 'left:calc(' + _n(a.x + a.w) + '% + 6px)' : 'right:calc(' + _n(100 - a.x) + '% + 6px)') + ';top:' + top + '%;max-width:calc(' + _n(tila) + '% - 6px)' };
    }
    var alle = a.y + a.h + 14 <= H;   // tilaa alapuolella → alle, muuten yläpuolelle
    return { paikka: alle ? 'alle' : 'ylos', tyyli: 'left:calc(' + _n(a.x) + '% + 0px);max-width:calc(' + _n(100 - a.x) + '% - 6px);' + (alle ? 'top:calc(' + _n((a.y + a.h) / H * 100) + '% + 4px)' : 'bottom:calc(' + _n((H - a.y) / H * 100) + '% + 4px)') };
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
    var ilmanAluetta = spec.ilmanAluetta === true;   // K1-korjaus: ei aluetta, ei oletusaluetta eikä tekstiä — pelkkä kenttä (alue tulee K3:ssa; ei arvata)
    var asePuuttuu = !ase || ase.tila === 'puuttuu' || !alue;
    var kaytAlue = alue || OLETUS_ALUE;
    data.alue = ilmanAluetta ? null : { x: kaytAlue.x, y: kaytAlue.y, w: kaytAlue.w, h: kaytAlue.h, puuttuu: asePuuttuu };
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
    if (ilmanAluetta) {
      // ei aluelaatikkoa lainkaan
    } else if (asePuuttuu) {
      html.push('<div class="kt-ase-puuttuu" style="' + geom + '"><b>' + _esc(t(opts.rooli === 'henkilokunta' ? 'ydinvahvuus puuttuu' : 'vahvuus valitaan pian')) + '</b></div>');
    } else {
      var nimiHTML = '<b>' + _esc(ase.nimi) + '</b><span>' + _esc(ase.sub != null ? ase.sub : t(opts.rooli === 'henkilokunta' ? 'ydinvahvuus' : 'sinun vahvuutesi')) + '</span>';
      var tarra = tmKenttaTarra(kaytAlue, H);   // K1b: kapea/matala alue → tarra alueen viereen tai alle (ei valu alueen yli eikä peitä kenttäviivoja alueen reunalla)
      data.tarra = tarra.paikka;
      if (tarra.paikka === 'sisalla') html.push('<div class="kt-ase" style="' + geom + '">' + nimiHTML + '</div>');
      else html.push('<div class="kt-ase" style="' + geom + '"></div><div class="kt-ase-tarra kt-ase-tarra-' + tarra.paikka + '" data-kt-tarra="' + tarra.paikka + '" style="' + tarra.tyyli + '">' + nimiHTML + '</div>');
    }

    // Osat: tagit (nimi + tilasana) — tai opts.osaPisteet: napautettavat ydinasiapisteet (kirjain ympyrässä, ei tilatekstiä; aria-label "a · teksti · tila"; napautus = opts.osaFn(pid, koodi) = sama kuin osarivin napautus)
    (Array.isArray(spec.osat) ? spec.osat : []).forEach(function (o) {
      if (!o) return;
      if (opts.osaPisteet === true) {
        var px = _luku(o.x, 0, 100, 50), py = _luku(o.y, 0, 140, 50), tl = o.tila || o.arvo || null, sanaP = tl && typeof opts.osaTila === 'function' ? opts.osaTila(tl) : '';
        var nimiP = typeof opts.osaNimi === 'function' ? opts.osaNimi(o.teksti) : (o.teksti || ''), aria = [o.k, nimiP, sanaP].filter(Boolean).join(' · ');
        var cls = 'kt-piste' + (o.tila === 'nyt' ? ' kt-piste-nyt' : (o.tila === 'itsenaisesti' ? ' kt-piste-ok' : '')) + (o.arvioitu === false || (!o.tila && !o.arvo) ? ' kt-piste-ei' : ''), pos = 'left:' + _n(px) + '%;top:' + _n(py / H * 100) + '%';
        html.push((opts.osaFn && opts.pid && o.koodi) ? '<button type="button" class="' + cls + '" data-kt-piste="' + _esc(o.koodi) + '" style="' + pos + '" aria-label="' + _esc(aria) + '" onclick="' + _esc(opts.osaFn + '(' + JSON.stringify(opts.pid) + ',' + JSON.stringify(o.koodi) + ')') + '">' + _esc(o.k) + '</button>'
          : '<span class="' + cls + '" data-kt-piste="' + _esc(o.koodi || o.k) + '" style="' + pos + '" role="img" aria-label="' + _esc(aria) + '">' + _esc(o.k) + '</span>');
        return;
      }
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
      '.kt-ase b{color:var(--teal);font-weight:800;line-height:1;word-spacing:.2em}',   /* kapea Archivo: sanavälistä ("1. kosketus") tuli liian pieni */
      '.kt-ase span{font-size:11px;color:var(--ink)}',
      '.kt-ase{overflow-wrap:anywhere}.kt-ase b,.kt-ase span{max-width:100%}',   /* K1b: pitkä nimi rivittyy alueen sisällä */
      '.kt-ase-tarra{position:absolute;z-index:3;display:grid;gap:1px;box-sizing:border-box;pointer-events:none}',   /* K1b: tarra alueen vieressä/alla (kapea tai matala alue) */
      '.kt-ase-tarra b{color:var(--teal);font-weight:800;line-height:1.1;word-spacing:.2em;overflow-wrap:anywhere;justify-self:start;background:var(--bg);padding:1px 5px;border-radius:2px}',
      '.kt-ase-tarra span{font-size:11px;color:var(--ink);justify-self:start;background:var(--bg);padding:1px 5px;border-radius:2px}',
      '.kt-ase-tarra-vasen b,.kt-ase-tarra-vasen span{justify-self:end;text-align:right}',
      '.kt-ase b,.kt-ase span{position:relative;z-index:3;justify-self:start;background:var(--bg);padding:1px 5px;border-radius:2px}',   /* B1 (mockup 22 v2): otsikko ei saa jäädä kentän viivojen ja reitin katkoviivan alle — taustalaikka peittää viivat tekstin kohdalta */
      '.kt-ase-puuttuu{position:absolute;display:grid;align-content:end;padding:7px 8px;box-sizing:border-box;background:transparent;border:1.5px dashed var(--chalk2);border-radius:3px}',
      '.kt-ase-puuttuu b{font-size:11px;font-weight:500;color:var(--ink)}',
      '.kt-osa{position:absolute;font-size:11px;line-height:1.2;color:var(--ink);background:var(--bg);border:1px solid var(--chalk2);border-radius:3px;padding:2px 6px;white-space:nowrap}',
      '.kt-osa-nyt{background:var(--amber-dim);border-color:var(--amber);color:var(--amber)}',
      /* ydinasiapisteet (opts.osaPisteet): ympyrä + kirjain, keskitetty koordinaattiin; arvioimaton himmeänä; "nyt" amber; osaa jo turkoosi reuna */
      '.kt-piste{position:absolute;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font:inherit;font-size:12px;font-weight:700;line-height:1;color:var(--ink);background:var(--bg);border:1.5px solid var(--chalk);padding:0;pointer-events:auto;cursor:pointer}',
      'span.kt-piste{cursor:default}.kt-piste:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
      '.kt-piste-ok{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 22%,var(--bg))}.kt-piste-nyt{background:var(--amber-dim);border-color:var(--amber);color:var(--amber)}.kt-piste-ei{opacity:.5}'
    ].join('\n');
  }

  var API = { tmKentta: tmKentta, tmKenttaCss: tmKenttaCss, tmKenttaReitti: tmKenttaReitti, tmKenttaTarra: tmKenttaTarra, LOPPU: LOPPU, OLETUS_ALUE: OLETUS_ALUE };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root && typeof window !== 'undefined') { root.TM_KENTTA = API; root.tmKentta = tmKentta; root.tmKenttaCss = tmKenttaCss; }
})(typeof window !== 'undefined' ? window : this);
