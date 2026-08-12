/* tm_kypsyys.js — Kypsyys / PHV -komponentti (jaettu renderöijä). Korvaa paljaan "AN"-koodin luettavalla
   kypsyyskuvalla: ① kypsyysaikajana (maturity_offset), ② kasvutahti-palkki, ③ kasvuviiva-sparkline + §28-tulkinta.
   Itsenäinen (ei riippuvuutta IDP-modaaliin) — kutsuttavissa mistä tahansa apista. Lukee VAIN pikakenttiä (§26).
   Design-totuus: docs/idp_design/KYPSYYS_PHV_design_kartta_v1.html. Brändilukko §5 (Cormorant/DM Sans/DM Mono · teal).
   Dual-export: module.exports || window.

   VARTIJAT (ehdoton): kasvutahti/kasvuviiva = null kun <2 kasvumittausta (älä piirrä viivaa); sparkline vaatii ≥3
   pistettä; PH-tila → kuormarajoitin (§28); tyhjä (ei kypsyysdataa) = rehellinen tyhjä tila. rooli='pelaaja' → §7.22. */
(function (root) {
  'use strict';

  var VAIHE = {   // §25 PHV-tilakoodi → luettava vaihe + timeline-vyöhyke
    PRE:  { nimi: 'Ennen kasvupyrähdystä', lyhyt: 'Ennen', vyohyke: 'pre' },
    LAH:  { nimi: 'Lähestyy kasvupyrähdystä', lyhyt: 'Lähestyy', vyohyke: 'lah' },
    PH:   { nimi: 'Kasvupyrähdyksessä', lyhyt: 'PHV-huippu', vyohyke: 'phv' },
    POST: { nimi: 'Kasvupyrähdyksen jälkeen', lyhyt: 'Post', vyohyke: 'post' },
    AN:   { nimi: 'Jälki-PHV', lyhyt: 'Jälki-PHV', vyohyke: 'an' }
  };

  function tmKypsyysVaihe(koodi) { return VAIHE[String(koodi || '').toUpperCase()] || null; }

  // Kasvutahti-vyöhyke (cm/v): hidas <3 · kohtalainen 3–7.2 · nopea ≥7.2 (loukkaantumisriski). null → null.
  function tmKasvutahtiVyohyke(cmv) {
    if (cmv == null || isNaN(Number(cmv))) return null;
    cmv = Number(cmv);
    return cmv < 3 ? 'hidas' : cmv < 7.2 ? 'kohtalainen' : 'nopea';
  }

  // Kasvutahti-markerin sijainti (%) design-kartan vyöhykeleveyksillä (hid flex3 · koh flex4.2 · nop flex2.8 = 10).
  function tmKasvutahtiPos(cmv) {
    if (cmv == null || isNaN(Number(cmv))) return null; cmv = Number(cmv);
    if (cmv < 3) return Math.max(2, cmv / 3 * 30);
    if (cmv < 7.2) return 30 + (cmv - 3) / (7.2 - 3) * 42;
    return Math.min(98, 72 + (Math.min(cmv, 10) - 7.2) / (10 - 7.2) * 28);
  }

  // Kypsyysaikajanan markerin sijainti (%) offsetista. Vyöhykkeet pre/lah/phv/post/an (flex 1.5/.5/1/.5/1.5).
  // offset −2.5 → 0 %, +2.5 → 100 % (lineaarinen); +1.3 → ~76 % (design). null → null.
  function tmKypsyysMarkerPos(offset) {
    if (offset == null || isNaN(Number(offset))) return null;
    return Math.max(3, Math.min(97, (Number(offset) + 2.5) / 5 * 100));
  }

  // Kasvumittausten määrä (kasvuhistoria = [{pvm, pituus_cm}]).
  function _mittauksia(data) { return (data && Array.isArray(data.kasvuhistoria)) ? data.kasvuhistoria.filter(function (x) { return x && x.pituus_cm != null; }).length : 0; }

  // VARTIJA-kooste (PUHDAS, testattava): mitä komponentti saa piirtää + §28-kuormarajoitin.
  function tmKypsyysGuard(data) {
    data = data || {};
    var n = _mittauksia(data);
    var koodi = String(data.phv_tila_koodi || '').toUpperCase();
    var onKypsyys = !!(tmKypsyysVaihe(koodi) || data.maturity_offset != null);
    // kasvutahti: vaatii ≥2 kasvumittausta TAI valmiiksi laskettu kasvutahti_cm_v (johdettu ≥2:sta)
    var naytaKasvutahti = (data.kasvutahti_cm_v != null && !isNaN(Number(data.kasvutahti_cm_v))) && n >= 2;
    return {
      onKypsyys: onKypsyys,
      naytaKasvutahti: naytaKasvutahti,           // <2 mittausta → false (ei viivaa)
      naytaSparkline: n >= 3,                      // sparkline vaatii ≥3 pistettä
      kuormarajoitin: koodi === 'PH',              // §28: kasvupyrähdyksessä → kuormarajoitin
      varhaiskypsa: (data.phv_ika != null && data.kronologinen_ika != null && Number(data.phv_ika) > Number(data.kronologinen_ika) + 0.5),
      mittauksia: n
    };
  }

  // ── Renderöinti (DOM) ─────────────────────────────────────────────────────
  var CSS_ID = 'tmKypsyysCss';
  var CSS = '.tmky{border:.5px solid var(--border,#2a2a28);border-radius:var(--r-card,10px);padding:20px 22px;background:var(--surface,#1C1C1A);font-family:var(--font-sans,\'DM Sans\',system-ui,sans-serif);font-weight:300;color:var(--ink,#E8EEF8)}'
    + '.tmky .kh{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}.tmky .kt{font-family:var(--font-serif,\'Cormorant Garamond\',serif);font-size:22px}.tmky .ks{font-family:var(--font-mono,\'DM Mono\',monospace);font-size:10px;color:var(--ink3,#6B82A8)}.tmky .km{margin-left:auto;font-family:var(--font-mono,monospace);font-size:9px;color:var(--ink3,#6B82A8)}'
    + '.tmky .eb{font-family:var(--font-sans,sans-serif);font-weight:600;font-size:9.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--teal,#28B090)}'
    + '.tmky .lab{font-family:var(--font-mono,monospace);font-size:10px;color:var(--ink2,#9AAAC4);margin:14px 0 20px;line-height:1.5}.tmky .lab b{color:var(--ink,#E8EEF8);font-weight:500}.tmky .lab .early{color:var(--amber,#E0A040)}'
    + '.tmky .mtl{position:relative;margin:0 0 8px}.tmky .track{display:flex;height:12px;border-radius:6px;overflow:hidden;border:.5px solid var(--border,#2a2a28)}.tmky .seg{height:12px}.tmky .seg.pre{flex:1.5;background:var(--surface2,#161614)}.tmky .seg.lah{flex:.5;background:var(--surface2,#161614)}.tmky .seg.phv{flex:1;background:var(--amber-dim,rgba(224,160,64,.12));border-left:.5px solid var(--amber-brd,rgba(224,160,64,.32));border-right:.5px solid var(--amber-brd,rgba(224,160,64,.32))}.tmky .seg.post{flex:.5;background:var(--surface2,#161614)}.tmky .seg.an{flex:1.5;background:var(--teal-dim,rgba(40,176,144,.12))}'
    + '.tmky .mk{position:absolute;top:-7px;width:2px;height:26px;background:var(--teal,#28B090);border-radius:2px}.tmky .mk .dot{position:absolute;top:-4px;left:-4px;width:10px;height:10px;border-radius:50%;background:var(--teal,#28B090);border:2px solid var(--bg,#111110)}.tmky .mk .ml{position:absolute;top:-22px;left:50%;transform:translateX(-50%);white-space:nowrap;font-family:var(--font-mono,monospace);font-size:9px;color:var(--teal,#28B090)}'
    + '.tmky .names{display:flex;margin-top:8px;font-family:var(--font-mono,monospace);font-size:8.5px;color:var(--ink3,#6B82A8);text-align:center}.tmky .names span.pre{flex:1.5}.tmky .names span.lah{flex:.5}.tmky .names span.phv{flex:1;color:var(--amber,#E0A040)}.tmky .names span.post{flex:.5}.tmky .names span.an{flex:1.5;color:var(--teal,#28B090)}'
    + '.tmky .gv{margin-top:22px}.tmky .gvh{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px}.tmky .gval{font-family:var(--font-serif,serif);font-size:20px}.tmky .gvt{position:relative;display:flex;height:10px;border-radius:5px;overflow:hidden;border:.5px solid var(--border,#2a2a28)}.tmky .z{height:10px}.tmky .z.hid{flex:3;background:var(--surface2,#161614)}.tmky .z.koh{flex:4.2;background:var(--teal-dim,rgba(40,176,144,.12))}.tmky .z.nop{flex:2.8;background:var(--red-dim,rgba(201,64,64,.14))}.tmky .gmk{position:absolute;top:-4px;width:2px;height:18px;background:var(--ink,#E8EEF8);border-radius:2px}'
    + '.tmky .gn{display:flex;margin-top:6px;font-family:var(--font-mono,monospace);font-size:8.5px;color:var(--ink3,#6B82A8)}.tmky .gn span.hid{flex:3}.tmky .gn span.koh{flex:4.2;color:var(--teal,#28B090)}.tmky .gn span.nop{flex:2.8;color:var(--red,#C94040);text-align:right}.tmky .gtr{font-family:var(--font-mono,monospace);font-size:9.5px;color:var(--ink3,#6B82A8);margin-top:8px}'
    + '.tmky .curve{margin-top:20px;display:flex;gap:16px;align-items:center;flex-wrap:wrap}.tmky .cnote{font-family:var(--font-mono,monospace);font-size:9.5px;color:var(--ink3,#6B82A8);line-height:1.5;flex:1;min-width:180px}'
    + '.tmky .mean{margin-top:20px;padding-top:16px;border-top:.5px solid var(--border,#2a2a28)}.tmky .mr{display:flex;gap:11px;align-items:flex-start;padding:6px 0;font-size:12.5px;color:var(--ink2,#9AAAC4);line-height:1.45}.tmky .mr .d{flex:0 0 auto;width:5px;height:5px;border-radius:50%;background:var(--teal,#28B090);margin-top:8px}.tmky .mr.warn .d{background:var(--amber,#E0A040)}.tmky .mr b{color:var(--ink,#E8EEF8);font-weight:500}.tmky .dn{font-family:var(--font-mono,monospace);font-size:9.5px;color:var(--ink3,#6B82A8);margin-top:14px;line-height:1.55}'
    + '.tmky-chip{display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono,monospace);font-size:10.5px;color:var(--teal,#28B090);border:.5px solid var(--teal-brd,rgba(40,176,144,.30));border-radius:var(--r-chip,6px);padding:7px 12px;background:var(--teal-dim,rgba(40,176,144,.12));cursor:pointer}.tmky-chip .mini{display:flex;height:6px;width:70px;border-radius:3px;overflow:hidden;border:.5px solid var(--border,#2a2a28)}.tmky-chip .mini i{height:6px}.tmky-chip .mini .a{flex:2.5;background:var(--surface2,#161614)}.tmky-chip .mini .b{flex:1;background:var(--amber-dim,rgba(224,160,64,.12))}.tmky-chip .mini .c{flex:1.5;background:var(--teal,#28B090)}'
    + '.tmky-empty{border:.5px dashed var(--border,#2a2a28);border-radius:var(--r-card,10px);padding:36px 22px;text-align:center;background:var(--surface,#1C1C1A)}.tmky-empty .et{font-family:var(--font-serif,serif);font-size:22px;color:var(--ink2,#9AAAC4);margin-bottom:8px}.tmky-empty .ed{font-size:12.5px;color:var(--ink3,#6B82A8);max-width:460px;margin:0 auto 16px;line-height:1.55}.tmky-empty .cta{font-family:var(--font-sans,sans-serif);font-size:12px;font-weight:500;padding:9px 16px;border-radius:var(--r-inset,8px);border:.5px solid var(--teal-brd,rgba(40,176,144,.30));color:var(--teal,#28B090);background:transparent;cursor:pointer}';

  function _injectCss(doc) { if (!doc || doc.getElementById(CSS_ID)) return; var s = doc.createElement('style'); s.id = CSS_ID; s.textContent = CSS; (doc.head || doc.documentElement).appendChild(s); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function _num1(v) { return (v == null || isNaN(Number(v))) ? null : Math.round(Number(v) * 10) / 10; }

  // Kasvuviiva-sparkline (pituus/aika) ≥3 pisteestä. Palauttaa SVG-stringin tai '' (guard).
  function _sparkline(hist) {
    var pts = (hist || []).filter(function (x) { return x && x.pituus_cm != null; }).map(function (x) { return Number(x.pituus_cm); });
    if (pts.length < 3) return '';
    var W = 150, H = 60, pad = 6, mn = Math.min.apply(null, pts), mx = Math.max.apply(null, pts), rng = (mx - mn) || 1;
    var xy = pts.map(function (v, i) { var x = pad + i / (pts.length - 1) * (W - 2 * pad); var y = (H - pad) - (v - mn) / rng * (H - 2 * pad); return [Math.round(x), Math.round(y)]; });
    var poly = xy.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    var circ = xy.map(function (p, i) { var col = (i === xy.length - 1) ? 'var(--teal,#28B090)' : 'var(--ink3,#6B82A8)'; return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.4" fill="' + col + '"/>'; }).join('');
    return '<svg width="150" height="60" viewBox="0 0 150 60" aria-label="kasvuviiva"><polyline points="' + poly + '" fill="none" stroke="var(--teal,#28B090)" stroke-width="1.6" stroke-linejoin="round"/>' + circ + '</svg>';
  }

  function _meaningRows(data, g) {
    var koodi = String(data.phv_tila_koodi || '').toUpperCase(), r = [];
    if (g.kuormarajoitin) r.push({ warn: true, html: '<b>Kuormarajoitin (§28):</b> kasvupyrähdyksen huippu käynnissä — voimaharjoittelu max 80 % 1RM, hyppyvolyymi −20 %, juoksuvolyymi seurattava.' });
    if (koodi === 'PRE' || koodi === 'LAH') r.push({ html: '<b>Pre-PHV — fyysinen neutraali:</b> matala 30 m / MAS / CMJ on biologisesti odotettua, EI kehityskohde (§28). Taito ja koordinaatio ovat nyt herkkiä ikkunoita.' });
    else if (koodi === 'POST' || koodi === 'AN') r.push({ html: '<b>Fyysiset ikkunat auki:</b> nopeus, voima ja aerobinen kannattaa treenata (post-PHV herkkyys). Matala fyysinen testi = aito kehityskohde.' });
    if (g.varhaiskypsa) r.push({ html: '<b>Varhaiskypsä → älä sekoita kokoa taitoon</b> (RAE). Etu fyysisyydessä voi olla kypsyyttä, ei lahjakkuutta — arvioi peli edellä.' });
    if (!r.length) r.push({ html: '<b>Kypsyysvaihe huomioidaan</b> fyysisten testien tulkinnassa (§28).' });
    return r;
  }

  function tmKypsyys(el, data, opts) {
    if (!el) return;
    opts = opts || {}; data = data || {};
    var doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
    _injectCss(doc);
    var g = tmKypsyysGuard(data);
    var vaihe = tmKypsyysVaihe(data.phv_tila_koodi);

    // Tyhjä tila (rehellinen): ei kypsyysdataa lainkaan.
    if (!g.onKypsyys) {
      el.innerHTML = '<div class="tmky-empty"><div class="et">Kypsyyttä ei mitattu</div>'
        + '<div class="ed">PHV-aikajana ja kasvutahti rakentuvat kasvumittauksesta (pituus · paino · istumapituus). Ilman mittausta kypsyysvaihetta ei näytetä — fyysiset testit luetaan silloin ilman kypsyyskorjausta (varauksin).</div>'
        + '<button class="cta" ' + (opts.onCta ? 'data-tmky-cta="1"' : '') + '>📍 Tee kasvumittaus →</button></div>';
      if (opts.onCta && typeof opts.onCta === 'function') { var b = el.querySelector('[data-tmky-cta]'); if (b) b.addEventListener('click', opts.onCta); }
      return;
    }

    var offset = _num1(data.maturity_offset), cmv = _num1(data.kasvutahti_cm_v);
    var markerPos = tmKypsyysMarkerPos(data.maturity_offset);

    // SIRU-muoto (Aloituksen selkäranka)
    if (opts.muoto === 'siru') {
      el.innerHTML = '<span class="tmky-chip" ' + (opts.onAvaa ? 'data-tmky-avaa="1"' : '') + '>🌱 ' + _esc(vaihe ? vaihe.lyhyt : '—') + (offset != null ? ' · ' + (offset >= 0 ? '+' : '') + offset + ' v' : '')
        + '<span class="mini"><i class="a"></i><i class="b"></i><i class="c"></i></span>'
        + (g.naytaKasvutahti && cmv != null ? 'kasvu ' + cmv + ' cm/v' : 'kasvutahti: kerätään') + ' ▾</span>';
      if (opts.onAvaa && typeof opts.onAvaa === 'function') { var a = el.querySelector('[data-tmky-avaa]'); if (a) a.addEventListener('click', opts.onAvaa); }
      return;
    }

    // TÄYSI kortti
    var early = g.varhaiskypsa ? ' → <span class="early">varhaiskypsä' + (offset != null ? ' (' + (offset >= 0 ? '+' : '') + offset + ' v edellä)' : '') + '</span>' : '';
    var h = '<div class="tmky"><div class="kh"><span class="kt">Kypsyys · PHV</span><span class="ks">Mirwald 2002 · biologinen kypsyys</span>' + (data.mittaus_pvm ? '<span class="km">mitattu ' + _esc(data.mittaus_pvm) + '</span>' : '') + '</div>';
    h += '<div class="lab"><b>' + _esc(vaihe ? vaihe.nimi : '—') + '</b>' + (offset != null ? ' · offset <b>' + (offset >= 0 ? '+' : '') + offset + ' v</b>' : '') + (data.phv_ika != null && data.kronologinen_ika != null ? ' · bio-ikä <b>' + _num1(data.phv_ika) + ' v</b> vs kronologinen ' + _num1(data.kronologinen_ika) + ' v' : '') + early + '</div>';
    // ① aikajana
    h += '<div class="mtl"><div class="track"><span class="seg pre"></span><span class="seg lah"></span><span class="seg phv"></span><span class="seg post"></span><span class="seg an"></span></div>'
      + (markerPos != null ? '<div class="mk" style="left:' + markerPos.toFixed(0) + '%"><span class="dot"></span><span class="ml">' + (offset != null ? (offset >= 0 ? '+' : '') + offset + ' v' : '') + '</span></div>' : '') + '</div>';
    h += '<div class="names"><span class="pre">Ennen</span><span class="lah">Lähestyy</span><span class="phv">PHV-huippu</span><span class="post">Post</span><span class="an">Jälki-PHV</span></div>';
    // ② kasvutahti
    h += '<div class="gv"><div class="gvh"><span class="eb">Kasvutahti · pituuden muutos</span>' + (g.naytaKasvutahti && cmv != null ? '<span class="gval">' + cmv + ' <span style="font-family:var(--font-mono,monospace);font-size:11px;color:var(--ink3,#6B82A8)">cm/v</span></span>' : '') + '</div>';
    if (g.naytaKasvutahti && cmv != null) {
      var gpos = tmKasvutahtiPos(cmv);
      h += '<div class="gvt"><span class="z hid"></span><span class="z koh"></span><span class="z nop"></span>' + (gpos != null ? '<span class="gmk" style="left:' + gpos.toFixed(0) + '%"></span>' : '') + '</div>'
        + '<div class="gn"><span class="hid">hidas &lt;3</span><span class="koh">kohtalainen 3–7.2</span><span class="nop">nopea ≥7.2 · riski ⚠</span></div>'
        + '<div class="gtr">Vyöhyke: <b style="color:var(--ink2,#9AAAC4)">' + _esc(tmKasvutahtiVyohyke(cmv)) + '</b>' + (tmKasvutahtiVyohyke(cmv) === 'nopea' ? ' — nopea kasvu, loukkaantumisriski kohonnut (§28)' : '') + '.</div>';
    } else {
      h += '<div class="gtr">Kasvutahti vaatii ≥2 kasvumittausta — nyt ' + g.mittauksia + '. Toinen mittaus avaa tahdin ja kasvuviivan.</div>';
    }
    h += '</div>';
    // ③ kasvuviiva
    var spark = g.naytaSparkline ? _sparkline(data.kasvuhistoria) : '';
    if (spark) h += '<div class="curve">' + spark + '<div class="cnote"><b style="color:var(--ink2,#9AAAC4)">Kasvuviiva</b> (pituus/aika) — tarkentuu jokaisella kasvumittauksella (U13–15: 3×/v).</div></div>';
    // meaning
    h += '<div class="mean"><div class="eb" style="margin-bottom:8px">Mitä kypsyys tarkoittaa · §28</div>';
    _meaningRows(data, g).forEach(function (m) { h += '<div class="mr' + (m.warn ? ' warn' : '') + '"><span class="d"></span><div>' + m.html + '</div></div>'; });
    h += '<div class="dn">Seuraava kasvumittaus tarkentaa kasvuviivan + tahdin.' + (data.yli_ikaisyys && data.yli_ikaisyys.poikkeuslupa ? ' Yli-ikäisyys-poikkeuslupa: kyllä.' : '') + '</div></div>';
    h += '</div>';
    el.innerHTML = h;
  }

  var API = {
    tmKypsyys: tmKypsyys,
    tmKypsyysVaihe: tmKypsyysVaihe,
    tmKasvutahtiVyohyke: tmKasvutahtiVyohyke,
    tmKasvutahtiPos: tmKasvutahtiPos,
    tmKypsyysMarkerPos: tmKypsyysMarkerPos,
    tmKypsyysGuard: tmKypsyysGuard
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) Object.keys(API).forEach(function (k) { root[k] = API[k]; });
})(typeof window !== 'undefined' ? window : this);
