/* ════════════════════════════════════════════════════════════════════════
   tm_kehityskaari.js — Trendi Vaihe 2: yksilön KEHITYSKAARI (PURE render-ydin).
   Lukee hh_historia[] / tki_historia[] (Vaihe 1a/1b selkäranka) → sparkline-sarjat,
   suunta, kehitysnopeus, jaksofokus-sidos. EI kirjoitusta, EI skeemaa, EI Firestore/DOM.

   Kanoni (design-doc §1/§7):
   - Taso + suunta AINA pari. Suuntaa EI tallenneta → luetaan pienempi_parempi-lipusta.
   - Kehitysnopeutta EI tallenneta → Δ/Δt päivätyistä pisteistä.
   - Tasot raaoista (render injektoi laskeFn:n; tm_eerikkila_normit). §28: pre-PHV suunta ei rankaisu.
   Dual-export: module.exports || window. §34.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  // pienempi_parempi -lippu per avain (kanoninen; yhtenevä HH_TESTI_MAP §28 + TK_LAJIT_META §23 + §22).
  // true = aikatesti (arvo laskee → paranee). false = suurempi parempi (hyppy/mas/indeksi/taso/bonus).
  var PIENEMPI_PAREMPI = {
    lin5m: true, lin10m: true, lin30m: true, kasirata: true, sm_juoksu: true, sm_pallo: true,
    pujottelu: true, syotto: true,
    ponnauttelu: true, kuljetus_laukaus: true, kokonaistulos: true,
    cmj: false, mas: false, pituuspotku_bonus: false,
    tki: false, hh_taso: false, d1_taso: false, d2_taso: false
  };
  // Ei-mitattavat/meta-avaimet joita EI koskaan piirretä sparklineen.
  var META_AVAIMET = { pvm: 1 };
  // §4.1 (Selkeys 4) — Kehityskaari-ryhmittely: aggregaatit (koosteet) erilleen yksittäisistä testeistä.
  var AGGREGAATIT = { kokonaistulos: 1, tki: 1 };
  var FYYSISET_KAARI = { lin5m: 1, lin10m: 1, lin30m: 1, cmj: 1, mas: 1, kasirata: 1, sm_juoksu: 1, sm_pallo: 1 };

  function _numOk(v) { return typeof v === 'number' && !isNaN(v) && isFinite(v); }
  function _ms(x) {
    if (x == null) return 0;
    if (typeof x === 'number') return x;
    if (typeof x === 'string') { var t = Date.parse(x); return isNaN(t) ? 0 : t; }
    if (typeof x.toMillis === 'function') return x.toMillis();
    if (x.seconds != null) return x.seconds * 1000;
    if (x instanceof Date) return x.getTime();
    return 0;
  }

  // Onko avain "pienempi parempi"? Tuntematon → oletus false (suurempi parempi) mutta merkitään epävarmaksi.
  function tmKaariPienempiParempi(avain) {
    return PIENEMPI_PAREMPI[avain] === true;
  }

  // Mitatut (numeeriset) avaimet historiassa — testijoukko-agnostinen union, meta pois. Järjestys vakaa.
  function tmKaariMitatutAvaimet(historia) {
    var nahty = {}, ulos = [];
    (historia || []).forEach(function (pt) {
      if (!pt) return;
      Object.keys(pt).forEach(function (k) {
        if (META_AVAIMET[k]) return;
        if (!_numOk(pt[k])) return;
        if (!nahty[k]) { nahty[k] = 1; ulos.push(k); }
      });
    });
    return ulos;
  }

  // Aikasarja yhdelle avaimelle: [{ pvm, ms, arvo }] pvm-nousevassa, vain pisteet joilla avain on numero.
  function tmKaariSarja(historia, avain) {
    var ulos = [];
    (historia || []).forEach(function (pt) {
      if (!pt || !_numOk(pt[avain]) || pt.pvm == null) return;
      ulos.push({ pvm: pt.pvm, ms: _ms(pt.pvm), arvo: pt[avain] });
    });
    ulos.sort(function (a, b) { return a.ms - b.ms; });
    return ulos;
  }

  // Suunta koko kaarelle (ensimmäinen → viimeinen). parani = kehittyikö pienempi_parempi-lipun mukaan.
  //   → { suunta:'up'|'down'|'flat', parani:bool|null, delta, ensimmainen, viimeinen, n }
  //   suunta 'up' = PARANNUS (näytöllä ↑), riippumatta siitä nouseeko vai laskeeko raaka-arvo.
  function tmKaariSuunta(avain, sarja) {
    sarja = sarja || [];
    if (sarja.length < 2) return { suunta: 'flat', parani: null, delta: 0, ensimmainen: sarja[0] ? sarja[0].arvo : null, viimeinen: sarja[0] ? sarja[0].arvo : null, n: sarja.length };
    var a = sarja[0].arvo, b = sarja[sarja.length - 1].arvo;
    var delta = Math.round((b - a) * 1000) / 1000;
    if (delta === 0) return { suunta: 'flat', parani: false, delta: 0, ensimmainen: a, viimeinen: b, n: sarja.length };
    var pienempi = tmKaariPienempiParempi(avain);
    var parani = pienempi ? (delta < 0) : (delta > 0);
    return { suunta: parani ? 'up' : 'down', parani: parani, delta: delta, ensimmainen: a, viimeinen: b, n: sarja.length };
  }

  // Kehitysnopeus Δ/Δt päivätyistä pisteistä (uusin − vanhin). dtVuodet päivistä; perKausi = perVuosi/2 (§19 kausi ≈ ½v).
  //   → { delta, dtVuodet, perVuosi, perKausi } tai null jos <2 pistettä tai Δt=0.
  function tmKaariNopeus(sarja) {
    sarja = sarja || [];
    if (sarja.length < 2) return null;
    var eka = sarja[0], vika = sarja[sarja.length - 1];
    var dtMs = vika.ms - eka.ms;
    if (dtMs <= 0) return null;
    var dtVuodet = dtMs / (365.25 * 86400000);
    var delta = vika.arvo - eka.arvo;
    var perVuosi = delta / dtVuodet;
    var r = function (x) { return Math.round(x * 1000) / 1000; };
    return { delta: r(delta), dtVuodet: r(dtVuodet), perVuosi: r(perVuosi), perKausi: r(perVuosi / 2) };
  }

  // Taso-trendi raaoista: [{ pvm, taso }]. laskeFn(pt) → taso (render injektoi; tm_eerikkila_normit + ikä
  // mittaushetkellä → johdonmukainen kortin kanssa). Jos laskeFn puuttuu → käytä snapshotin tallennettua tasoa.
  function tmKaariTasoSarja(historia, tasoAvain, laskeFn) {
    var ulos = [];
    (historia || []).forEach(function (pt) {
      if (!pt || pt.pvm == null) return;
      var taso = null;
      if (typeof laskeFn === 'function') { var t = laskeFn(pt); if (_numOk(t)) taso = t; }
      if (taso == null && _numOk(pt[tasoAvain])) taso = pt[tasoAvain];
      if (taso == null) return;
      ulos.push({ pvm: pt.pvm, ms: _ms(pt.pvm), taso: taso });
    });
    ulos.sort(function (a, b) { return a.ms - b.ms; });
    return ulos;
  }

  // Kattavuus: kehityskaari vaatii ≥2 pistettä (muuten fallback-teksti).
  function tmKaariKattavuusOk(sarja) { return (sarja || []).length >= 2; }

  // Jaksofokus-jaksot aikajanalle (vain ne joilla alkoi-pvm). Uusin ensin.
  //   → [{ nimi, domeeni, alkoi, paattyi, alkoiMs, paattyiMs, tulos }]
  function tmKaariJaksot(jaksofokusHistoria) {
    var ulos = [];
    (jaksofokusHistoria || []).forEach(function (j) {
      if (!j || j.alkoi == null) return;
      ulos.push({
        nimi: j.konsepti_nimi || j.konsepti_avain || 'Jakso', domeeni: j.domeeni || null,
        alkoi: j.alkoi, paattyi: j.paattyi || null, alkoiMs: _ms(j.alkoi),
        paattyiMs: j.paattyi ? _ms(j.paattyi) : 0, tulos: j.tulos || null
      });
    });
    ulos.sort(function (a, b) { return b.alkoiMs - a.alkoiMs; });
    return ulos;
  }

  // Jakson mitattu vaikutus valitulle sarjalle: arvo ENNEN jaksoa (viimeisin ≤ alkoi) vs JÄLKEEN (ensimmäinen ≥ alkoi,
  // mieluiten ≥ paattyi). → { ennen, jalkeen, delta, parani } tai null jos ei bracketoivia pisteitä.
  function tmKaariJaksoSidos(jakso, avain, sarja) {
    if (!jakso || !sarja || sarja.length < 1) return null;
    var alkoi = jakso.alkoiMs || _ms(jakso.alkoi);
    var paattyi = jakso.paattyiMs || _ms(jakso.paattyi) || alkoi;
    if (!alkoi) return null;
    var ennen = null, jalkeen = null;
    sarja.forEach(function (p) {
      if (p.ms <= alkoi) { if (!ennen || p.ms > ennen.ms) ennen = p; }
    });
    // jälkeen = ensimmäinen piste joka on ≥ paattyi (tai jos ei, ≥ alkoi)
    sarja.forEach(function (p) {
      if (p.ms >= paattyi) { if (!jalkeen || p.ms < jalkeen.ms) jalkeen = p; }
    });
    if (!jalkeen) { sarja.forEach(function (p) { if (p.ms >= alkoi) { if (!jalkeen || p.ms < jalkeen.ms) jalkeen = p; } }); }
    if (!ennen || !jalkeen || ennen.ms === jalkeen.ms) return null;
    var delta = Math.round((jalkeen.arvo - ennen.arvo) * 1000) / 1000;
    var pienempi = tmKaariPienempiParempi(avain);
    return { ennen: ennen.arvo, jalkeen: jalkeen.arvo, delta: delta, parani: pienempi ? (delta < 0) : (delta > 0) };
  }

  // ── Näyttö-metadata ────────────────────────────────────────────────────
  var NIMI = {
    lin30m: '30 m', lin10m: '10 m', lin5m: '5 m', cmj: 'Kevennyshyppy', mas: 'MAS',
    kasirata: 'Ketteryys', sm_juoksu: 'Suunnanmuutos', sm_pallo: 'Suunnanmuutos (pallo)',
    pujottelu: 'Pujottelu', syotto: 'Syöttö', tki: 'TKI',
    ponnauttelu: 'Ponnauttelu', kuljetus_laukaus: 'Kuljetus-laukaus', kokonaistulos: 'Tekniikka yht.',
    hh_taso: 'H-H taso', d1_taso: 'D1 fyysinen', d2_taso: 'D2 tekninen'
  };
  var YKSIKKO = { cmj: ' cm', mas: ' km/h', tki: '', hh_taso: '', d1_taso: '', d2_taso: '' };
  // §28 PHV-herkät fyysiset avaimet (yhtenevä HH_TESTI_MAP.phvHerkka) — pre-PHV suunta EI rankaisu.
  var PHV_HERKKA = { lin5m: 1, lin10m: 1, lin30m: 1, cmj: 1, mas: 1, kasirata: 1, sm_juoksu: 1 };
  var PRE_PHV = { PRE: 1, LAH: 1, pre_phv: 1 };

  function tmKaariNimi(avain) { return NIMI[avain] || avain; }
  function tmKaariYksikko(avain) { return YKSIKKO[avain] != null ? YKSIKKO[avain] : ' s'; }

  function _esc(s, escFn) { return (typeof escFn === 'function') ? escFn(s) : String(s == null ? '' : s); }
  // Näyttömuotoilu: raaka-arvo max 2 desimaaliin, turhat nollat pois (6.179→6.18, 40→40, 5.3→5.3).
  // VAIN näyttöketjussa — tmKaariSuunta/Nopeus säilyttävät tarkat arvot laskennassa.
  function _fmt(x) { return (typeof x === 'number' && isFinite(x)) ? String(Math.round(x * 100) / 100) : String(x == null ? '' : x); }

  // Pieni sparkline (inline SVG, hiusviiva + teal-aksentti). sarja = [{arvo}] pvm-järjestyksessä.
  function _sparkline(sarja, w, h) {
    w = w || 96; h = h || 22;
    var vals = sarja.map(function (p) { return p.arvo; });
    if (vals.length < 2) return '';
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var rng = (mx - mn) || 1;
    var pts = vals.map(function (v, i) {
      var x = (i / (vals.length - 1)) * (w - 4) + 2;
      var y = h - 3 - ((v - mn) / rng) * (h - 6);   // korkeampi raaka-arvo ylös (piirtona; suunta luetaan erikseen)
      return (Math.round(x * 10) / 10) + ',' + (Math.round(y * 10) / 10);
    }).join(' ');
    var lastX = w - 2, lastY = h - 3 - ((vals[vals.length - 1] - mn) / rng) * (h - 6);
    return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="vertical-align:middle">'
      + '<polyline points="' + pts + '" fill="none" stroke="var(--teal,#28B090)" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/>'
      + '<circle cx="' + (Math.round(lastX * 10) / 10) + '" cy="' + (Math.round(lastY * 10) / 10) + '" r="1.6" fill="var(--teal,#28B090)"/></svg>';
  }

  // Suuntanuoli + väri. §28: pre-PHV + phvHerkkä → neutraali (ei punaista "huononnusta").
  function _nuoli(avain, suunta, phvTila) {
    if (suunta.suunta === 'flat') return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };   // Δ=0: ei nousu eikä lasku (ei punaista ↓)
    var neutraaliPre = PHV_HERKKA[avain] && PRE_PHV[phvTila];
    if (suunta.parani === true) return { merkki: '↑', vari: 'var(--teal,#28B090)' };
    if (suunta.parani === false) {
      if (neutraaliPre) return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };   // pre-PHV: ei rankaisu
      return { merkki: '↓', vari: '#C94040' };
    }
    return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };
  }

  // Yksi testirivi (nimi · sparkline · suunta · ⚡nopeus). ctx.esc, ctx.phvTila.
  // opts.eiPunainen: §34 §3.2 — älä näytä punaista laskua (TKI-divergenssi: raaka parani, indeksi laski) → amber.
  function _testiRivi(avain, sarja, ctx, opts) {
    var suunta = tmKaariSuunta(avain, sarja);
    var nuoli = _nuoli(avain, suunta, ctx.phvTila);
    if (opts && opts.eiPunainen && nuoli.vari === '#C94040') nuoli = { merkki: nuoli.merkki, vari: 'var(--amber,#E0A040)' };
    var nop = tmKaariNopeus(sarja);
    var yks = tmKaariYksikko(avain);
    var nopTxt = nop ? ('⚡ ' + (nop.perKausi > 0 ? '+' : '') + (Math.round(nop.perKausi * 100) / 100) + yks + '/kausi') : '';
    var arvoTxt = _fmt(suunta.ensimmainen) + '→' + _fmt(suunta.viimeinen);
    return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">'
      + '<span style="min-width:96px;color:var(--ink2)">' + _esc(tmKaariNimi(avain), ctx.esc) + '</span>'
      + '<span style="flex:0 0 auto">' + _sparkline(sarja) + '</span>'
      + '<span style="color:var(--ink3);font-family:var(--font-m,monospace);font-size:10px">' + arvoTxt + '</span>'
      + '<span style="color:' + nuoli.vari + ';font-weight:600">' + nuoli.merkki + '</span>'
      + '<span style="color:var(--ink3);margin-left:auto;white-space:nowrap">' + nopTxt + '</span></div>';
  }

  // TÄYSI kehityskaari (valmentaja/VP). ctx = { esc, phvTila, tasoFns:{d1_taso:fn,d2_taso:fn,hh_taso:fn} }.
  // Lukee p.hh_historia + p.tki_historia. Kattavuus-fallback jos <2 pistettä yhdelläkään avaimella.
  function tmKaariRenderFull(p, ctx) {
    ctx = ctx || {};
    var hh = (p && Array.isArray(p.hh_historia)) ? p.hh_historia : [];
    var tki = (p && Array.isArray(p.tki_historia)) ? p.tki_historia : [];
    var hhAvaimet = tmKaariMitatutAvaimet(hh).filter(function (k) { return NIMI[k] && ['hh_taso', 'd1_taso', 'd2_taso'].indexOf(k) < 0; });
    var tkiAvaimet = tmKaariMitatutAvaimet(tki).filter(function (k) { return NIMI[k]; });
    // §4.1 — ryhmittely: fyysiset → tekniikka per laji → (hiusviiva) → aggregaatit (kooste). Aggregaatit
    // (Tekniikka yht. + TKI) EIVÄT sekaan yksittäisiin testeihin. Kattavuus: ≥2 pistettä per avain.
    var fyysR = [], teknR = [], aggR = [];
    var _lisaa = function (k, s) {
      var m = { k: k, s: s };
      if (AGGREGAATIT[k]) aggR.push(m); else if (FYYSISET_KAARI[k]) fyysR.push(m); else teknR.push(m);
    };
    hhAvaimet.forEach(function (k) { var s = tmKaariSarja(hh, k); if (tmKaariKattavuusOk(s)) _lisaa(k, s); });
    tkiAvaimet.forEach(function (k) { var s = tmKaariSarja(tki, k); if (tmKaariKattavuusOk(s)) _lisaa(k, s); });
    if (!fyysR.length && !teknR.length && !aggR.length) {
      return '<div style="font-size:11px;color:var(--ink3);padding:8px 0">Kehityskaari täyttyy kun mittauksia on ≥2.</div>';
    }
    var rivit = fyysR.concat(teknR).map(function (m) { return _testiRivi(m.k, m.s, ctx); }).join('');

    // §4.2 — aggregaatit omaan lohkoonsa hiusviivan alle + TKI-divergenssin selitys (KAKSI DELTAA, §34 §3.2).
    var aggHtml = '';
    if (aggR.length) {
      var tkiM = null, kokM = null;
      aggR.forEach(function (m) { if (m.k === 'tki') tkiM = m; else if (m.k === 'kokonaistulos') kokM = m; });
      var tkiS = tkiM ? tmKaariSuunta('tki', tkiM.s) : null;
      var kokS = kokM ? tmKaariSuunta('kokonaistulos', kokM.s) : null;
      // divergenssi: TKI laskee (down) MUTTA Tekniikka yht. paranee (up) → §34 §3.2 (raaka parani, ikävaatimus koveni enemmän)
      var divergenssi = !!(tkiS && kokS && tkiS.suunta === 'down' && tkiS.parani === false && kokS.parani === true);
      var aggRivit = aggR.map(function (m) {
        return _testiRivi(m.k, m.s, ctx, (divergenssi && m.k === 'tki') ? { eiPunainen: true } : null);
      }).join('');
      var selitys = '';
      if (divergenssi) {
        var vv = (ctx.tkiVuosivauhti != null && !isNaN(ctx.tkiVuosivauhti))
          ? (' (~' + (Math.round(Math.abs(ctx.tkiVuosivauhti) * 10) / 10) + ' s/v)') : '';
        selitys = '<div style="margin-top:4px;font-size:10px;color:var(--ink3);line-height:1.5">ⓘ Tekniikka-ajat paranivat, mutta TKI laski — <b style="color:var(--ink2)">ikävaatimus kovenee</b>' + vv + '. Kehitys on oikeansuuntaista; pysyäkseen indeksin tahdissa sen pitää olla vielä nopeampaa.</div>';
      }
      aggHtml = '<div style="margin-top:8px;padding-top:6px;border-top:.5px solid var(--border,rgba(255,255,255,.08))">'
        + '<div style="font-size:9px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3);margin-bottom:2px">Kooste</div>'
        + aggRivit + selitys + '</div>';
    }

    // Per-D taso-trendi (raaoista, ctx.tasoFns). Näytä D1/D2 jos vähintään 2 pistettä.
    var tasoHtml = '';
    var tasoFns = ctx.tasoFns || {};
    ['d1_taso', 'd2_taso'].forEach(function (tk) {
      var ts = tmKaariTasoSarja(hh, tk, tasoFns[tk]);
      if (ts.length < 2) return;
      var suunta = tmKaariSuunta(tk, ts.map(function (x) { return { arvo: x.taso }; }));
      var nuoli = _nuoli(tk, suunta, ctx.phvTila);
      tasoHtml += '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:11px">'
        + '<span style="min-width:96px;color:var(--ink2)">' + _esc(tmKaariNimi(tk), ctx.esc) + '</span>'
        + '<span style="color:var(--ink3);font-family:var(--font-m,monospace);font-size:10px">taso ' + _fmt(suunta.ensimmainen) + '→' + _fmt(suunta.viimeinen) + '</span>'
        + '<span style="color:' + nuoli.vari + ';font-weight:600">' + nuoli.merkki + '</span></div>';
    });

    // Jaksofokus-sidos: jaksot aikajanalle → mitattu vaikutus (fyysinen→lin30m/kasirata, muuten TKI).
    var jaksoHtml = '';
    var jaksot = tmKaariJaksot(p && p.jaksofokus_historia);
    if (jaksot.length) {
      var _pvmLbl = function (iso) { return (typeof ctx.pvmFn === 'function') ? ctx.pvmFn(iso) : String(iso || '').slice(0, 10); };
      var _sarjaKey = { fyysinen: hhAvaimet.indexOf('lin30m') >= 0 ? 'lin30m' : (hhAvaimet[0] || null) };
      var rows = jaksot.slice(0, 4).map(function (j) {
        var key = (j.domeeni === 'fyysinen') ? _sarjaKey.fyysinen : (tkiAvaimet.indexOf('tki') >= 0 ? 'tki' : (tkiAvaimet[0] || _sarjaKey.fyysinen));
        var sarja = key ? (hhAvaimet.indexOf(key) >= 0 ? tmKaariSarja(hh, key) : tmKaariSarja(tki, key)) : [];
        var sidos = key ? tmKaariJaksoSidos(j, key, sarja) : null;
        var vaikutus = sidos
          ? (' · ' + _esc(tmKaariNimi(key), ctx.esc) + ' ' + _fmt(sidos.ennen) + '→' + _fmt(sidos.jalkeen) + ' ' + (sidos.parani ? '✓' : '○'))
          : '';
        var vali = _pvmLbl(j.alkoi) + (j.paattyi ? '–' + _pvmLbl(j.paattyi) : '');
        return '<div style="font-size:11px;color:var(--ink3);padding:2px 0">Jakso: <span style="color:var(--ink2)">' + _esc(j.nimi, ctx.esc) + '</span> <span style="font-size:10px">(' + _esc(vali, ctx.esc) + ')</span>' + vaikutus + '</div>';
      }).join('');
      jaksoHtml = '<div style="margin-top:8px;padding-top:6px;border-top:.5px solid var(--border,rgba(255,255,255,.08))">' + rows + '</div>';
    }

    // Järjestys: fyysiset+tekniikka → aggregaatit (kooste) → per-D taso-trendi → jaksofokus-sidos.
    return '<div style="padding:2px 0">' + rivit + aggHtml
      + (tasoHtml ? '<div style="margin-top:8px;padding-top:6px;border-top:.5px solid var(--border,rgba(255,255,255,.08))">' + tasoHtml + '</div>' : '')
      + jaksoHtml + '</div>';
  }

  // PELAAJA-versio (§7.22 kannustava): EI kovia lukuja/normivertailua — vain kannustava suunta.
  // "📈 Kehityit — 30 m nopeutui". §28: pre-PHV vain positiivinen suunta (ei "huononit").
  function tmKaariRenderPelaaja(p, ctx) {
    ctx = ctx || {};
    var hh = (p && Array.isArray(p.hh_historia)) ? p.hh_historia : [];
    var tki = (p && Array.isArray(p.tki_historia)) ? p.tki_historia : [];
    var avaimet = tmKaariMitatutAvaimet(hh).filter(function (k) { return NIMI[k] && ['hh_taso', 'd1_taso', 'd2_taso'].indexOf(k) < 0; });
    var tkiAv = tmKaariMitatutAvaimet(tki).filter(function (k) { return NIMI[k]; });
    var parannukset = [];
    avaimet.forEach(function (k) {
      var s = tmKaariSarja(hh, k); if (!tmKaariKattavuusOk(s)) return;
      var suunta = tmKaariSuunta(k, s);
      if (suunta.parani === true) parannukset.push({ k: k, s: s });
    });
    tkiAv.forEach(function (k) {
      var s = tmKaariSarja(tki, k); if (!tmKaariKattavuusOk(s)) return;
      var suunta = tmKaariSuunta(k, s);
      if (suunta.parani === true) parannukset.push({ k: k, s: s });
    });
    var onDataa = tmKaariMitatutAvaimet(hh).some(function (k) { return tmKaariKattavuusOk(tmKaariSarja(hh, k)); })
      || tkiAv.some(function (k) { return tmKaariKattavuusOk(tmKaariSarja(tki, k)); });
    if (!onDataa) {
      return '<div style="font-size:12px;color:var(--ink3,#8C8B86);padding:8px 0">Kehityskaari täyttyy kun sinulla on ≥2 mittausta 🌱</div>';
    }
    var VERBI = { lin30m: '30 m nopeutui', lin10m: '10 m nopeutui', lin5m: '5 m nopeutui', kasirata: 'Ketteryys parani', sm_juoksu: 'Suunnanmuutos parani', sm_pallo: 'Pallonhallinta parani', cmj: 'Ponnistus parani', mas: 'Kestävyys parani', pujottelu: 'Pujottelu parani', syotto: 'Syöttö parani', tki: 'Tekniikka nousi', kokonaistulos: 'Tekniikka parani' };
    if (!parannukset.length) {
      // §28: ei "huononit" — kannustava neutraali kun ei vielä parannusta.
      return '<div style="font-size:12px;color:var(--ink2,#C9C7C0);padding:8px 0">📈 Kehityskaaresi on rakentumassa — jatka treenaamista, seuraava mittaus näyttää suunnan 💪</div>';
    }
    var rivit = parannukset.slice(0, 5).map(function (m) {
      var lause = VERBI[m.k] || (tmKaariNimi(m.k) + ' parani');
      return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--ink,#EDEBE3)">'
        + '<span style="color:var(--teal,#28B090)">📈</span>'
        + '<span>' + _esc(lause, ctx.esc) + '</span>'
        + '<span style="flex:0 0 auto;margin-left:auto">' + _sparkline(m.s, 72, 18) + '</span></div>';
    }).join('');
    return '<div style="padding:2px 0"><div style="font-size:12px;font-weight:600;color:var(--teal,#28B090);margin-bottom:4px">Kehityit! 🎉</div>' + rivit + '</div>';
  }

  var API = {
    PIENEMPI_PAREMPI: PIENEMPI_PAREMPI,
    tmKaariPienempiParempi: tmKaariPienempiParempi,
    tmKaariNimi: tmKaariNimi, tmKaariYksikko: tmKaariYksikko,
    tmKaariRenderFull: tmKaariRenderFull, tmKaariRenderPelaaja: tmKaariRenderPelaaja,
    tmKaariMitatutAvaimet: tmKaariMitatutAvaimet,
    tmKaariSarja: tmKaariSarja,
    tmKaariSuunta: tmKaariSuunta,
    tmKaariNopeus: tmKaariNopeus,
    tmKaariTasoSarja: tmKaariTasoSarja,
    tmKaariKattavuusOk: tmKaariKattavuusOk,
    tmKaariJaksot: tmKaariJaksot,
    tmKaariJaksoSidos: tmKaariJaksoSidos
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_KEHITYSKAARI = API;
  if (typeof window !== 'undefined') {
    root.tmKaariPienempiParempi = tmKaariPienempiParempi;
    root.tmKaariMitatutAvaimet = tmKaariMitatutAvaimet;
    root.tmKaariSarja = tmKaariSarja;
    root.tmKaariSuunta = tmKaariSuunta;
    root.tmKaariNopeus = tmKaariNopeus;
    root.tmKaariTasoSarja = tmKaariTasoSarja;
    root.tmKaariKattavuusOk = tmKaariKattavuusOk;
    root.tmKaariJaksot = tmKaariJaksot;
    root.tmKaariJaksoSidos = tmKaariJaksoSidos;
    root.tmKaariNimi = tmKaariNimi; root.tmKaariYksikko = tmKaariYksikko;
    root.tmKaariRenderFull = tmKaariRenderFull; root.tmKaariRenderPelaaja = tmKaariRenderPelaaja;
  }
})(typeof window !== 'undefined' ? window : this);
