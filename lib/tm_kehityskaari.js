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
  // K1b §22 — alusta-herkät avaimet (juoksu/ketteryys): vertailukelpoisia vain saman alustan sisällä. CMJ (hyppy) EI herkkä.
  var ALUSTAHERKAT = { lin5m: 1, lin10m: 1, lin30m: 1, kasirata: 1, sm_juoksu: 1, sm_pallo: 1, mas: 1, pujottelu: 1, pujottelu_hh: 1, syotto: 1, syotto_hh: 1 };
  // Alusta-normalisointi (STUB, K1b): tulevaisuudessa muuntaa eri alustojen tulokset vertailukelpoisiksi yleiskaavalla.
  // Nyt palauttaa arvon sellaisenaan → vartija segmentoi (ei normalisoi) → ei virheellistä ristialustavertailua. Täytetään kun kaava saatavilla.
  function _alustaNormi(arvo, alusta) { return arvo; }   // eslint: alusta varattu tulevalle kaavalle
  function _alustaLyhyt(a) {
    if (!a) return 'alusta';
    var s = String(a).toLowerCase();
    if (s.indexOf('mondo') >= 0 || s.indexOf('yleisurheilu') >= 0) return 'mondo';
    if (s.indexOf('nurmi') >= 0 || s.indexOf('luonnon') >= 0) return 'nurmi';
    if (s.indexOf('teko') >= 0) return 'tekonurmi';
    if (s.indexOf('halli') >= 0 || s.indexOf('sisä') >= 0) return 'halli';
    return String(a).slice(0, 12);
  }

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
      ulos.push({ pvm: pt.pvm, ms: _ms(pt.pvm), arvo: pt[avain], alusta: (pt.alusta != null ? pt.alusta : null) });   // K1b §22 — alusta per piste
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
    // K1b §22 — alusta-herkkä: segmentoi VAIN kun eksplisiittiset alustat eroavat (null = vertailukelpoinen → ei regressiota
    // vanhaan dataan; kaikki-null → delta näkyy kuten ennen). Vasta uusi nurmi vs uusi halli → vertaa viimeisimmän alustan sisällä.
    var alustaMerkki = '';
    if (ALUSTAHERKAT[avain] && sarja && sarja.length) {
      var expl = {};
      sarja.forEach(function (p) { if (p.alusta != null) expl[p.alusta] = 1; });
      var alustat = Object.keys(expl);
      if (alustat.length >= 2) {
        var viimAlusta = null;
        for (var i = sarja.length - 1; i >= 0; i--) { if (sarja[i].alusta != null) { viimAlusta = sarja[i].alusta; break; } }
        sarja = sarja.filter(function (p) { return p.alusta == null || p.alusta === viimAlusta; });
        alustaMerkki = '<span style="color:var(--amber,#E0A040);font-size:9px;margin-left:4px" title="Eri alustan pisteet piilotettu — §22: vertailu vain saman alustan sisällä">⚠ ' + _esc(_alustaLyhyt(viimAlusta), ctx.esc) + '</span>';
      } else if (alustat.length === 1) {
        alustaMerkki = '<span style="color:var(--ink3);font-size:9px;margin-left:4px">· ' + _esc(_alustaLyhyt(alustat[0]), ctx.esc) + '</span>';
      } else {
        alustaMerkki = '<span style="color:var(--ink3);font-size:9px;margin-left:4px;opacity:.65" title="Testialustaa ei merkitty näihin pisteisiin (§22)">· alusta —</span>';
      }
    }
    var suunta = tmKaariSuunta(avain, sarja);
    var nuoli = _nuoli(avain, suunta, ctx.phvTila);
    if (opts && opts.eiPunainen && nuoli.vari === '#C94040') nuoli = { merkki: nuoli.merkki, vari: 'var(--amber,#E0A040)' };
    var nop = tmKaariNopeus(sarja);
    var yks = tmKaariYksikko(avain);
    var nopTxt = nop ? ('⚡ ' + (nop.perKausi > 0 ? '+' : '') + (Math.round(nop.perKausi * 100) / 100) + yks + '/kausi') : '';
    var arvoTxt = _fmt(suunta.ensimmainen) + '→' + _fmt(suunta.viimeinen);
    return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px">'
      + '<span style="min-width:96px;color:var(--ink2)">' + _esc(tmKaariNimi(avain), ctx.esc) + alustaMerkki + '</span>'
      + '<span style="flex:0 0 auto">' + _sparkline(sarja) + '</span>'
      + '<span style="color:var(--ink3);font-family:var(--font-m,monospace);font-size:10px">' + arvoTxt + '</span>'
      + '<span style="color:' + nuoli.vari + ';font-weight:600">' + nuoli.merkki + '</span>'
      + '<span style="color:var(--ink3);margin-left:auto;white-space:nowrap">' + nopTxt + '</span></div>';
  }

  // TÄYSI kehityskaari (valmentaja/VP). ctx = { esc, phvTila, tasoFns:{d1_taso:fn,d2_taso:fn,hh_taso:fn} }.
  // Lukee p.hh_historia + p.tki_historia. Kattavuus-fallback jos <2 pistettä yhdelläkään avaimella.
  // ═══════ K5a — ADAR peliäly-kaari per dimensio (2-piste: adar_edellinen → adar_viimeisin). Design
  // KEHITYSKAARI_KISS_design_kartta_v1 (.adim). §28 ikäportti (U11 ≠ U16) · §7.22 pelaaja-variantti (ei tasolukuja/
  // arvioijia/vertailua). Palauttaa inline-HTML-stringin (teematokenit → molemmat teemat). Reuse tmAdarKonsensus-data. ═══════
  var ADAR_DIM_NIMI = { a: 'Havaitse (A)', d: 'Päätä (D)', ac: 'Toimi (Ac)', r: 'Arvioi (R)' };
  var ADAR_DIM_JARJ = ['a', 'd', 'ac', 'r'];
  function _kaariAdarBand(ika) {   // §28 ikäportti (peiliaa tmAdarBand — ei kosketa konsensuslaskentaan)
    if (ika == null) return ADAR_DIM_JARJ.slice();
    if (ika <= 12) return ['a'];
    if (ika <= 15) return ['a', 'd', 'ac'];
    return ['a', 'd', 'ac', 'r'];
  }
  // adar_viimeisin (nyt) + adar_edellinen (lähtö|null) → dimensiot {a:{nyt,lahto},...}. Vain band+ei-null dimit.
  function tmKaariAdarDimensiot(av, aedell, ika) {
    if (!av) return null;
    var band = _kaariAdarBand(ika), out = {}, n = 0;
    band.forEach(function (dk) {
      if (av[dk] == null) return;
      out[dk] = { nyt: av[dk], lahto: (aedell && aedell[dk] != null) ? aedell[dk] : null };
      n++;
    });
    return n ? out : null;
  }
  // dimensiot = { a:{nyt, lahto?}, ... }. opts = { esc, ika, rooli, havaintoja }.
  function tmKaariAdarBlokki(dimensiot, opts) {
    opts = opts || {}; dimensiot = dimensiot || {};
    var esc = opts.esc || function (s) { return String(s == null ? '' : s); };
    var pelaaja = (opts.rooli === 'pelaaja');
    var band = _kaariAdarBand(opts.ika);
    var dimit = band.filter(function (dk) { return dimensiot[dk] && dimensiot[dk].nyt != null; });
    if (!dimit.length) return '';
    var onLahto = dimit.some(function (dk) { return dimensiot[dk].lahto != null; });
    if (pelaaja) {
      // §7.22 — VAIN positiivinen suunta, EI lukuja/palkkeja/vertailua/arvioijia. Ei lähtöä → ei "kehittyi"-väitettä.
      var paran = dimit.filter(function (dk) { var d = dimensiot[dk]; return d.lahto != null && Number(d.nyt) > Number(d.lahto); });
      if (!paran.length) return '';
      var pr = paran.map(function (dk) {
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--ink,#EDEBE3)"><span style="color:var(--teal,#28B090)">📈</span><span>' + esc(ADAR_DIM_NIMI[dk].split(' ')[0]) + ' kehittyi</span></div>';
      }).join('');
      return '<div style="margin-top:6px"><div style="font-size:11px;font-weight:600;color:var(--teal,#28B090);margin-bottom:2px">Peliäly kehittyy 🧠</div>' + pr + '</div>';
    }
    var rivit = dimit.map(function (dk) {
      var d = dimensiot[dk], nyt = Number(d.nyt), lahto = (d.lahto != null ? Number(d.lahto) : null);
      var w = Math.max(6, Math.min(100, Math.round(nyt / 3 * 100)));
      var barCol = (lahto != null && nyt > lahto) ? 'var(--teal,#28B090)' : 'var(--ink3,#6B82A8)';
      var delta = (lahto != null)
        ? (esc(lahto) + '→<b style="color:var(--ink,#E8EEF8)">' + esc(nyt) + '</b>')
        : '<b style="color:var(--ink,#E8EEF8)">' + esc(nyt) + '</b>';
      return '<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:11px">'
        + '<span style="flex:0 0 84px;color:var(--ink2,#9AAAC4)">' + esc(ADAR_DIM_NIMI[dk]) + '</span>'
        + '<span style="flex:1;min-width:40px;height:5px;border-radius:3px;background:var(--bg3,#1C1C1A);overflow:hidden"><span style="display:block;height:100%;width:' + w + '%;background:' + barCol + '"></span></span>'
        + '<span style="flex:0 0 auto;font-family:var(--font-mono,monospace);font-size:10px;color:var(--ink3,#6B82A8)">' + delta + '</span></div>';
    }).join('');
    var tier = onLahto ? '2 pist. · dimensioittain' : 'nykytila · dimensioittain';
    var guard = onLahto
      ? 'Dimensiokohtainen — ei suoraa vuosivertailua (<b>U11 ≠ U16</b>, §28).'
      : 'Ajassa täyttyy 2. havainnosta — nyt nykytila per dimensio (<b>U11 ≠ U16</b>, §28).';
    var hav = (opts.havaintoja != null) ? ('<span style="margin-left:6px;font-family:var(--font-mono,monospace);font-size:9px;color:var(--ink3,#6B82A8)">' + esc(opts.havaintoja) + ' havaintoa</span>') : '';
    return '<div style="margin-top:8px;padding-top:6px;border-top:.5px solid var(--border,rgba(255,255,255,.08))">'
      + '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px"><span style="font-weight:600;font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink2,#9AAAC4)">Peliäly · kenttähavainto</span>' + hav
      + '<span style="margin-left:auto;font-family:var(--font-mono,monospace);font-size:8px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3,#6B82A8);border:.5px solid var(--border2,rgba(255,255,255,.05));border-radius:4px;padding:2px 5px">' + tier + '</span></div>'
      + rivit
      + '<div style="margin-top:6px;font-family:var(--font-mono,monospace);font-size:9px;color:var(--ink3,#6B82A8);display:flex;gap:5px;line-height:1.45"><span style="color:var(--amber,#E0A040)">▲</span><span>' + guard + '</span></div>'
      + '</div>';
  }

  function tmKaariRenderFull(p, ctx) {
    ctx = ctx || {};
    var hh = (p && Array.isArray(p.hh_historia)) ? p.hh_historia : [];
    var tki = (p && Array.isArray(p.tki_historia)) ? p.tki_historia : [];
    // K5a — ADAR peliäly-lohko (pikakentistä; §26 ei alikokoelmakyselyä). Renderöityy myös adar-only-pelaajalle.
    var _adarBlokki = tmKaariAdarBlokki(tmKaariAdarDimensiot(p && p.adar_viimeisin, p && p.adar_edellinen, ctx.ika) || {}, { esc: ctx.esc, ika: ctx.ika, havaintoja: p && p.adar_havaintoja });
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
    if (!fyysR.length && !teknR.length && !aggR.length && !_adarBlokki) {
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

    // Järjestys: fyysiset+tekniikka → aggregaatit (kooste) → per-D taso-trendi → jaksofokus-sidos → K5a peliäly-dimensiot.
    return '<div style="padding:2px 0">' + rivit + aggHtml
      + (tasoHtml ? '<div style="margin-top:8px;padding-top:6px;border-top:.5px solid var(--border,rgba(255,255,255,.08))">' + tasoHtml + '</div>' : '')
      + jaksoHtml + _adarBlokki + '</div>';
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
    // K5a — peliäly-dimensiot (§7.22: vain positiivinen suunta, ei lukuja). Näkyy myös adar-only-pelaajalle.
    var _adarBlokki = tmKaariAdarBlokki(tmKaariAdarDimensiot(p && p.adar_viimeisin, p && p.adar_edellinen, ctx.ika) || {}, { esc: ctx.esc, ika: ctx.ika, rooli: 'pelaaja' });
    if (!onDataa && !_adarBlokki) {
      return '<div style="font-size:12px;color:var(--ink3,#8C8B86);padding:8px 0">Kehityskaari täyttyy kun sinulla on ≥2 mittausta 🌱</div>';
    }
    var VERBI = { lin30m: '30 m nopeutui', lin10m: '10 m nopeutui', lin5m: '5 m nopeutui', kasirata: 'Ketteryys parani', sm_juoksu: 'Suunnanmuutos parani', sm_pallo: 'Pallonhallinta parani', cmj: 'Ponnistus parani', mas: 'Kestävyys parani', pujottelu: 'Pujottelu parani', syotto: 'Syöttö parani', tki: 'Tekniikka nousi', kokonaistulos: 'Tekniikka parani' };
    if (!parannukset.length) {
      // §28: ei "huononit" — kannustava neutraali kun ei vielä parannusta. Peliäly-parannus (jos on) silti näkyviin.
      return '<div style="font-size:12px;color:var(--ink2,#C9C7C0);padding:8px 0">📈 Kehityskaaresi on rakentumassa — jatka treenaamista, seuraava mittaus näyttää suunnan 💪</div>' + _adarBlokki;
    }
    var rivit = parannukset.slice(0, 5).map(function (m) {
      var lause = VERBI[m.k] || (tmKaariNimi(m.k) + ' parani');
      return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:var(--ink,#EDEBE3)">'
        + '<span style="color:var(--teal,#28B090)">📈</span>'
        + '<span>' + _esc(lause, ctx.esc) + '</span>'
        + '<span style="flex:0 0 auto;margin-left:auto">' + _sparkline(m.s, 72, 18) + '</span></div>';
    }).join('');
    return '<div style="padding:2px 0"><div style="font-size:12px;font-weight:600;color:var(--teal,#28B090);margin-bottom:4px">Kehityit! 🎉</div>' + rivit + _adarBlokki + '</div>';
  }

  /* ═══════ KISS-renderöijä tmKehityskaari(el, data, opts) — design docs/idp_design/KEHITYSKAARI_KISS_design_kartta_v1.html.
     Trendiviiva mille tahansa mitatulle ominaisuudelle. VARTIJAT: datataso (1=lähtöpiste/2=suunta/≥3=kaari) ·
     kaksi deltaa (§34, TKI-laskua ei punaisena jos abs+) · alustavartija (§22) · rooli='pelaaja' → vain oma abs+ (§7.22).
     TODO (VAIHE 2): ominaisuus='adar' renderöi nyt yhden sparklinen (kokonaisluku 1–3). Design K2 = per-dimensio
     A/D/Ac/R -palkit. Päätä VAIHE 2:ssa: (a) per-dimensio-kutsu (kutsuja antaa yhden dimin data.historian) VAI
     (b) palkit komponentin sisään (data.dimensiot:{a,d,ac,r}). Nyt kguard sanoo "dimensiokohtainen" mutta piirtää yhden viivan. */

  // Alustavartija (§22): nopeus/ketteryys — vertaile vain saman alusta-arvon pisteitä. alusta null → kaikki pisteet.
  function tmKaariAlustaSuodata(historia, alusta) {
    var h = (historia || []).filter(function (x) { return x && x.arvo != null; });
    if (alusta == null) return h;
    return h.filter(function (x) { return x.alusta == null || String(x.alusta) === String(alusta); });
  }
  // Datataso pisteiden määrästä: 1 → 'lahtopiste' · 2 → 'suunta' · ≥3 → 'kaari' · 0 → 'tyhja'.
  function tmKaariDatataso(historia) {
    var n = (historia || []).filter(function (x) { return x && x.arvo != null; }).length;
    return n >= 3 ? 'kaari' : n === 2 ? 'suunta' : n === 1 ? 'lahtopiste' : 'tyhja';
  }
  // Kaksi deltaa (§34): abs-parannus (suoritus) vs normi (ikävaatimus). Palauttaa: {absPositiivinen, normiPunainen}.
  // absPos = suoritus parani; normiPunainen = normi laski JA suoritus EI parantunut (muuten neutraali/harmaa, ei punainen).
  function tmKaariKaksiDeltaa(deltaAbs, deltaNormi) {
    var absPos = (deltaAbs != null && Number(deltaAbs) > 0);
    return { absPositiivinen: absPos, normiPunainen: (deltaNormi != null && Number(deltaNormi) < 0 && !absPos) };
  }

  var KK_CSS_ID = 'tmKehityskaariCss';
  var KK_CSS = '.tmkk{border:.5px solid var(--border,#2a2a28);border-radius:var(--r-card,10px);padding:16px 17px 15px;background:var(--surface,#1C1C1A);font-family:var(--font-sans,\'DM Sans\',system-ui,sans-serif);font-weight:300;color:var(--ink,#E8EEF8)}'
    + '.tmkk .kch{display:flex;align-items:baseline;gap:8px;margin-bottom:2px}.tmkk .keb{font-weight:600;font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink2,#9AAAC4)}.tmkk .ktier{margin-left:auto;font-family:var(--font-mono,monospace);font-size:8px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3,#6B82A8);border:.5px solid var(--border2,rgba(255,255,255,.05));border-radius:4px;padding:2px 5px}'
    + '.tmkk .kval{font-family:var(--font-serif,\'Cormorant Garamond\',serif);font-size:26px;line-height:1.05;margin:2px 0 1px}.tmkk .kval .u{font-family:var(--font-mono,monospace);font-size:11px;color:var(--ink3,#6B82A8);margin-left:3px}.tmkk .ksub{font-family:var(--font-mono,monospace);font-size:9.5px;color:var(--ink3,#6B82A8);margin-bottom:10px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}'
    + '.tmkk .db{display:inline-flex;align-items:center;gap:4px;font-family:var(--font-mono,monospace);font-size:10px;padding:2px 7px;border-radius:5px;border:.5px solid var(--border2,rgba(255,255,255,.05))}.tmkk .db.up{color:var(--teal,#28B090);border-color:var(--teal-brd,rgba(40,176,144,.30));background:var(--teal-dim,rgba(40,176,144,.12))}.tmkk .db.flat{color:var(--ink3,#6B82A8)}.tmkk .db.warn{color:var(--amber,#E0A040);border-color:var(--amber-brd,rgba(224,160,64,.32));background:var(--amber-dim,rgba(224,160,64,.12))}'
    + '.tmkk .spark{width:100%;height:58px;margin:2px 0 4px;display:block}.tmkk .spark .ln{fill:none;stroke:var(--teal,#28B090);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}.tmkk .spark .ln.ref{stroke:var(--ink3,#6B82A8);stroke-width:1.4;stroke-dasharray:3 3;opacity:.75}.tmkk .spark .ar{fill:var(--teal-dim,rgba(40,176,144,.12))}.tmkk .spark .pt{fill:var(--teal,#28B090);stroke:var(--bg,#111110);stroke-width:2}.tmkk .spark .pt0{fill:var(--surface,#1C1C1A);stroke:var(--ink3,#6B82A8);stroke-width:1.5}'
    + '.tmkk .kint{font-size:11.5px;color:var(--ink2,#9AAAC4);line-height:1.5;margin-top:8px}.tmkk .kint b{color:var(--ink,#E8EEF8);font-weight:500}.tmkk .kguard{margin-top:9px;font-family:var(--font-mono,monospace);font-size:9px;color:var(--ink3,#6B82A8);display:flex;align-items:flex-start;gap:5px;line-height:1.45}.tmkk .kguard .g{color:var(--amber,#E0A040)}'
    + '.tmkk .tdd{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 2px}.tmkk .tdd .cell{border:.5px solid var(--border2,rgba(255,255,255,.05));border-radius:6px;padding:7px 9px;background:var(--bg2,#161614)}.tmkk .tdd .cl{font-family:var(--font-mono,monospace);font-size:8px;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3,#6B82A8);margin-bottom:2px}.tmkk .tdd .cv{font-family:var(--font-mono,monospace);font-size:12px}.tmkk .tdd .cv.pos{color:var(--teal,#28B090)}.tmkk .tdd .cv.neu{color:var(--ink2,#9AAAC4)}'
    + '.tmkk-chip{display:inline-flex;align-items:center;gap:9px;border:.5px solid var(--teal-brd,rgba(40,176,144,.30));border-radius:8px;padding:8px 13px;background:var(--teal-dim,rgba(40,176,144,.12));font-family:var(--font-mono,monospace);font-size:11px;color:var(--ink,#E8EEF8);cursor:pointer}.tmkk-chip .cx{color:var(--ink3,#6B82A8)}'
    + '.tmkk-empty{border:.5px dashed var(--border,#2a2a28);border-radius:var(--r-card,10px);padding:32px 22px;text-align:center;background:var(--surface2,#161614)}.tmkk-empty .et{font-family:var(--font-serif,serif);font-size:22px;margin-bottom:8px}.tmkk-empty .ed{font-size:12px;color:var(--ink2,#9AAAC4);max-width:460px;margin:0 auto 16px;line-height:1.55}.tmkk-empty .cta{font-family:var(--font-sans,sans-serif);font-weight:500;font-size:12px;color:var(--teal,#28B090);border:.5px solid var(--teal-brd,rgba(40,176,144,.30));border-radius:var(--r-chip,6px);padding:9px 16px;background:transparent;cursor:pointer}';
  function _kkInject(doc) { if (!doc || doc.getElementById(KK_CSS_ID)) return; var s = doc.createElement('style'); s.id = KK_CSS_ID; s.textContent = KK_CSS; (doc.head || doc.documentElement).appendChild(s); }
  function _kkEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Sparkline sarjasta [{arvo}] (≥1). pienempiParempi → käännä pystyakseli (pienempi = ylös). ref = valinnainen normisarja.
  function _kkSpark(arvot, pienempiParempi, refArvot) {
    var vals = arvot.slice(); if (!vals.length) return '';
    var kaikki = vals.concat((refArvot || [])); var mn = Math.min.apply(null, kaikki), mx = Math.max.apply(null, kaikki), rng = (mx - mn) || 1;
    var W = 260, H = 58, pad = 12;
    var Y = function (v) { var t = (v - mn) / rng; if (pienempiParempi) t = 1 - t; return Math.round((H - 6) - t * (H - 14)); };
    var X = function (i, n) { return Math.round(pad + (n <= 1 ? 0 : i / (n - 1) * (W - 2 * pad))); };
    var line = vals.map(function (v, i) { return X(i, vals.length) + ',' + Y(v); }).join(' ');
    var svg = '<svg class="spark" viewBox="0 0 260 58" preserveAspectRatio="none" aria-label="kehityskaari">';
    if (refArvot && refArvot.length === vals.length) svg += '<polyline class="ln ref" points="' + refArvot.map(function (v, i) { return X(i, vals.length) + ',' + Y(v); }).join(' ') + '"/>';
    svg += '<polyline class="ln" points="' + line + '"/>';
    svg += vals.map(function (v, i) { var cls = (i === 0) ? 'pt0' : 'pt'; return '<circle class="' + cls + '" cx="' + X(i, vals.length) + '" cy="' + Y(v) + '" r="' + (i === vals.length - 1 ? 4 : 3.2) + '"/>'; }).join('');
    return svg + '</svg>';
  }

  function tmKehityskaari(el, data, opts) {
    if (!el) return;
    opts = opts || {}; data = data || {};
    var doc = el.ownerDocument || (typeof document !== 'undefined' ? document : null);
    _kkInject(doc);
    var om = opts.ominaisuus || 'fyysinen', rooli = opts.rooli || 'vp', pelaaja = (rooli === 'pelaaja');
    var alusta = (om === 'fyysinen' && data.alusta != null) ? data.alusta : null;
    var hist = tmKaariAlustaSuodata(data.historia, alusta);
    var arvot = hist.map(function (x) { return Number(x.arvo); });
    var taso = tmKaariDatataso(hist);
    var esc = _kkEsc, yks = data.yksikko || '';
    var eb = { fyysinen: 'Fyysinen', flei: 'Kehon valmius · FLEI', tki: 'Tekniikka · TKI', adar: 'Peliäly · kenttähavainto' }[om] || esc(om);
    var pp = !!data.pienempiParempi;

    // K5a (TODO VAIHE 2 ratkaistu, option b) — ADAR per dimensio: data.dimensiot:{a:{nyt,lahto},...} → palkit komponentin
    // sisään (ei yhtä sparklinea). §28 ikäportti (data.ika) · §7.22 (opts.rooli='pelaaja').
    if (om === 'adar' && data.dimensiot) {
      var _adarH = tmKaariAdarBlokki(data.dimensiot, { esc: esc, ika: data.ika, rooli: rooli, havaintoja: data.havaintoja });
      el.innerHTML = '<div class="tmkk"><div class="kch"><span class="keb">' + eb + '</span><span class="ktier">peliäly · dimensioittain</span></div>'
        + (_adarH || '<div style="font-size:11px;color:var(--ink3,#6B82A8);padding:6px 0">Ei peliäly-dataa tälle ikävaiheelle.</div>') + '</div>';
      return;
    }

    // TYHJÄ tila
    if (taso === 'tyhja') {
      el.innerHTML = '<div class="tmkk-empty"><div class="et">Ei mittausta</div><div class="ed">Kehityskaari rakentuu mittauksista. Ilman mittausta ei näytetä kaarta — lähtötaso ja kaari piirtyvät kun dataa kertyy.</div><button class="cta" data-tmkk-cta="1">📍 Suunnittele mittaus →</button></div>';
      if (typeof opts.onCta === 'function') { var b0 = el.querySelector('[data-tmkk-cta]'); if (b0) b0.addEventListener('click', opts.onCta); }
      return;
    }

    var h = '<div class="tmkk"><div class="kch"><span class="keb">' + eb + '</span><span class="ktier">' + (taso === 'kaari' ? '≥3 · kaari' : taso === 'suunta' ? '2 · suunta' : '1 · lähtöpiste') + '</span></div>';
    h += '<div class="kval">' + esc(data.arvo != null ? data.arvo : (arvot.length ? arvot[arvot.length - 1] : '—')) + '<span class="u">' + esc(yks) + '</span></div>';

    // Suunta / delta (§29) — pelaajalle vain abs+ (§7.22)
    var absPos = (data.deltaAbs != null && Number(data.deltaAbs) > 0);
    var suB = '';
    if (taso !== 'lahtopiste') {
      if (pelaaja) {
        // §7.22 — VAIN oma abs-parannus positiivisena. EI ↓, EI 'db warn', EI laskua/vertailua/TKI-laskua.
        suB = absPos ? ('<span class="db up">↑' + (data.deltaAbs != null ? ' +' + esc(data.deltaAbs) + (yks ? ' ' + esc(yks) : '') : '') + '</span>') : '';
      } else if (om === 'tki') {
        var kd = tmKaariKaksiDeltaa(data.deltaAbs, data.deltaNormi);
        suB = kd.absPositiivinen ? '<span class="db up">suoritus ↑</span>' : (data.deltaNormi != null && Number(data.deltaNormi) < 0 ? '<span class="db warn">TKI ' + esc(data.deltaNormi) + '</span>' : '<span class="db flat">→</span>');
      } else {
        var su = data.suunta || null;
        var dlt = (data.deltaAbs != null) ? ((Number(data.deltaAbs) > 0 ? '+' : '') + data.deltaAbs + (yks ? ' ' + yks : '')) : '';
        var up = absPos || su === 'up';
        suB = '<span class="db ' + (up ? 'up' : su === 'down' ? 'warn' : 'flat') + '">' + (up ? '↑' : su === 'down' ? '↓' : '→') + (dlt ? ' ' + esc(dlt) : '') + '</span>';
      }
    }
    h += '<div class="ksub">' + (data.normiTaso != null && !pelaaja ? 'taso ' + esc(data.normiTaso) + '/5' : (taso === 'lahtopiste' ? 'nykytaso' : '')) + suB + '</div>';

    // Sparkline (≥3) TAI 2-pisteen viiva; ref-viiva TKI:lle (kaksi deltaa). §7.22: pelaajalle EI laskevaa kaarta —
    // vain oma paraneva kehitys näkyviin; muuten neutraali kint-rivi (ei loss-aversion-kuvaa).
    var ref = (om === 'tki' && !pelaaja && Array.isArray(data.normiHistoria) && data.normiHistoria.length === arvot.length) ? data.normiHistoria.map(Number) : null;
    if (taso === 'lahtopiste') h += '<div style="font-family:var(--font-mono,monospace);font-size:9.5px;color:var(--ink3,#6B82A8);margin:8px 0">Yksi piste — toinen mittaus avaa kaaren.</div>';
    else if (pelaaja && !absPos) h += '<div style="font-family:var(--font-mono,monospace);font-size:9.5px;color:var(--ink3,#6B82A8);margin:8px 0">Kehitys jatkuu — seuraava mittaus näyttää edistymän.</div>';
    else h += _kkSpark(arvot, pp, ref);

    // TKI kaksi deltaa -strip (§34) — ei pelaajalle
    if (om === 'tki' && !pelaaja && (data.deltaAbs != null || data.deltaNormi != null)) {
      h += '<div class="tdd"><div class="cell"><div class="cl">Suoritus (abs)</div><div class="cv ' + (Number(data.deltaAbs) > 0 ? 'pos' : 'neu') + '">' + esc(data.deltaAbs != null ? ((Number(data.deltaAbs) > 0 ? '+' : '') + data.deltaAbs) : '—') + (Number(data.deltaAbs) > 0 ? ' · parani' : '') + '</div></div>'
        + '<div class="cell"><div class="cl">Ikänormi (TKI)</div><div class="cv neu">' + esc(data.deltaNormi != null ? data.deltaNormi : '—') + (data.deltaNormi != null && Number(data.deltaNormi) < 0 ? ' · vaatimus koveni' : '') + '</div></div></div>';
    }

    // Tulkinta + vartija
    if (om === 'tki' && !pelaaja) h += '<div class="kguard"><span class="g">▲</span><span>TKI-laskua <b>ei näytetä punaisena</b> kun abs-delta on positiivinen (§34).</span></div>';
    else if (om === 'fyysinen') h += '<div class="kguard"><span class="g">▲</span><span>Vertailu vain <b>saman alustan</b> sisällä (§22)' + (alusta != null ? ' · alusta: ' + esc(alusta) : '') + '.</span></div>';
    else if (om === 'adar') h += '<div class="kguard"><span class="g">▲</span><span>Dimensiokohtainen — ei suoraa vuosivertailua (<b>U11 ≠ U16</b>, §28).</span></div>';
    if (pelaaja) h += '<div class="kint">Oma parannus: ' + (data.deltaAbs != null && Number(data.deltaAbs) > 0 ? '<b>' + esc((Number(data.deltaAbs) > 0 ? '+' : '') + data.deltaAbs) + '</b> — hyvää työtä!' : 'seuraava mittaus näyttää edistymän.') + '</div>';

    h += '</div>';
    el.innerHTML = h;
  }

  var API = {
    PIENEMPI_PAREMPI: PIENEMPI_PAREMPI,
    tmKehityskaari: tmKehityskaari,
    tmKaariAlustaSuodata: tmKaariAlustaSuodata,
    tmKaariDatataso: tmKaariDatataso,
    tmKaariKaksiDeltaa: tmKaariKaksiDeltaa,
    tmKaariPienempiParempi: tmKaariPienempiParempi,
    tmKaariNimi: tmKaariNimi, tmKaariYksikko: tmKaariYksikko,
    tmKaariRenderFull: tmKaariRenderFull, tmKaariRenderPelaaja: tmKaariRenderPelaaja,
    tmKaariAdarBlokki: tmKaariAdarBlokki, tmKaariAdarDimensiot: tmKaariAdarDimensiot,   // K5a
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
    root.tmKaariAdarBlokki = tmKaariAdarBlokki; root.tmKaariAdarDimensiot = tmKaariAdarDimensiot;   // K5a
    root.tmKehityskaari = tmKehityskaari;
    root.tmKaariAlustaSuodata = tmKaariAlustaSuodata;
    root.tmKaariDatataso = tmKaariDatataso;
    root.tmKaariKaksiDeltaa = tmKaariKaksiDeltaa;
  }
})(typeof window !== 'undefined' ? window : this);
