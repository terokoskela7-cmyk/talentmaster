/* ════════════════════════════════════════════════════════════════════════
   tm_todistekortit.js — Kehitystyöpöytä K4a (D102, erä 79): Profiili-välilehden todistekortit. PURE (ei DOMia, ei Firestorea). Dual-export: module.exports || window.TM_TODISTEKORTIT.
   Lähde: docs/22_TULKINTASAANNOT.md (syöte → lause), docs/K4A_SUUNNITELMA.md. Vain henkilökunnalle (§7.22: pelaaja- ja perhe-app eivät näe tätä).
   Kaikki luetaan olemassa olevasta pelaajadokumentista (pikakentät) — EI uusia kenttiä. Tasot kanonisella perTestTasot-ketjulla (Eerikkilä-taso testihetken iästä, ei nykyiästä §14).
   · tmTodisteMalli(p, c)  → { phv, tyhjaKaikki, yhteenveto:{vahvuus,kehityskohde,puuttuu,viimeisin,tyhjaLause}, nauha:[5], kortit:[…], koonti|null, luvut }
        c: { nyt:Date, ika, sp (M|N), t(avain) (käännös; ei löydy → FI), perTestTasot(p,ika,sp), jaksoTila:'ei_jaksoa'|…, adarNimet? }
   (HTML + CSS: lib/tm_todistekortit_html.js)
   · tmTodisteFokus(p)     → 'tekninen'|'fyysinen'|'peli'|null (jakson aihe → osa-alue)
   Lauseet muodostetaan AVAIMISTA (tc_*), ei vapaasta merkkijonosta; sv tulee Gemini-erästä (tm_lib_i18n), puuttuva → FI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_todistekortit_fi.js') : root.TM_TODISTEKORTIT_FI;
  var RIVI_MAX = 3, FOKUS_RIVI_MAX = 4, PELI_RIVI_MAX = 5;   // Peli: kaikki ikätason ADAR-ulottuvuudet (≤ 4) + psyykkinen arvio

  function _t(c, k, par) {
    var v = c && typeof c.t === 'function' ? c.t(k) : null, s = (v != null && v !== k) ? v : (FI[k] != null ? FI[k] : k);
    if (par) Object.keys(par).forEach(function (n) { s = s.split('{' + n + '}').join(par[n] == null ? '' : String(par[n])); });
    return s;
  }
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  function _fn(nimi) { return (root && typeof root[nimi] === 'function') ? root[nimi] : null; }
  function _num(x) { return typeof x === 'number' && !isNaN(x); }
  function _fmt(x, d) { if (!_num(x)) return ''; var f = Math.pow(10, d == null ? 1 : d); return String(Math.round(x * f) / f).replace('.', ','); }
  function _puoli(x) { return Math.round(x * 2) / 2; }   // puolikas taso ei pyöristy alas
  function _pvmFi(iso) { if (!iso) return ''; var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (parseInt(m[3], 10) + '.' + parseInt(m[2], 10) + '.' + m[1]) : String(iso); }
  function _pvmLyhyt(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (parseInt(m[3], 10) + '.' + parseInt(m[2], 10) + '.') : ''; }
  function _ms(iso) { var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
  function _paivia(iso, nyt) { var a = _ms(iso); if (isNaN(a)) return null; var n = nyt instanceof Date ? nyt : new Date(); return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - a) / 86400000); }
  function _isoPvm(x) { if (x == null || x === '') return null; if (typeof x === 'string') return x.slice(0, 10); if (x && typeof x.toDate === 'function') { var d = x.toDate(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); } return null; }
  function _ikaTeksti(c, iso, nyt) {
    var pv = _paivia(iso, nyt); if (pv == null) return '';
    if (pv <= 0) return _t(c, 'tc_ika_tanaan');
    if (pv < 14) return _t(c, 'tc_ika_pv', { n: pv });
    if (pv < 60) return _t(c, 'tc_ika_vk', { n: Math.round(pv / 7) });
    return _t(c, 'tc_ika_kk', { n: Math.round(pv / 30.4) });
  }
  function _ikaLyhyt(c, iso, nyt) {   // K1e: "2 vk" (ilman "sitten") yhteenvedon Testattu-riville
    var pv = _paivia(iso, nyt); if (pv == null) return '';
    if (pv <= 0) return _t(c, 'tc_ika_lyh_tanaan');
    if (pv < 14) return _t(c, 'tc_ika_lyh_pv', { n: pv });
    if (pv < 60) return _t(c, 'tc_ika_lyh_vk', { n: Math.round(pv / 7) });
    return _t(c, 'tc_ika_lyh_kk', { n: Math.round(pv / 30.4) });
  }
  /* Datan ikä: ≤ 3 kk normaali · 3–6 kk amber · > 6 kk vanha (ainoa toiminto "Päivitä mittaus", §14) · > 12 kk ei tasona (D141). */
  function _ikaLuokka(iso, nyt) {
    var pv = _paivia(iso, nyt); if (pv == null) return 'normaali';
    if (pv > 365) return 'hyvin_vanha'; if (pv > 183) return 'vanha'; if (pv > 92) return 'amber'; return 'normaali';
  }
  function _trendiLuokka(nyt, ed, kynnys, pienempiParempi) {
    if (!_num(nyt) || !_num(ed)) return null;
    var d = nyt - ed; if (Math.abs(d) < kynnys) return 'flat';
    return (pienempiParempi ? d < 0 : d > 0) ? 'up' : 'down';
  }

  /* ── PHV: kerran tmPhvTila:sta (sama raportoitu arvo kaikille korteille) ── */
  function _phv(p, c) { if (c && c.phv) return c.phv; var P = _g('TM_PHV_TILA', './tm_phv_tila.js'); return P && P.tmPhvTila ? P.tmPhvTila(p) : (_fn('tmPhvTila') ? root.tmPhvTila(p) : 'tuntematon'); }
  function _fyysTulkintaSalli(phv) { return phv === 'POST' || phv === 'AN'; }   // heikoin fyysinen kehityskohteeksi vain POST/AN (§28)

  /* ── Jakson aihe → osa-alue (fokuskortti) ── */
  var FOKUS_AVAIN = { y_h1: 'tekninen', y_h2: 'tekninen', y_h3: 'tekninen', y_h4: 'tekninen', y_h5: 'tekninen', y_h9: 'tekninen',
    y_h0: 'peli', y_h6: 'peli', y_h7: 'peli', y_h8: 'peli', y_p1: 'peli', y_p2: 'peli', y_p3: 'peli', y_p4: 'peli' };
  function tmTodisteFokus(p) {
    var jf = p && p.jaksofokus; if (!jf || typeof jf !== 'object') return null;
    var av = jf.konsepti_avain ? String(jf.konsepti_avain) : null;
    if (av && FOKUS_AVAIN[av]) return FOKUS_AVAIN[av];
    if (av && /^ohjelma:/.test(av)) return 'fyysinen';
    if (!av && jf.ohjelma) return 'fyysinen';
    if (jf.domeeni === 'fyysinen') return 'fyysinen';
    return null;
  }

  /* ── Rivit ── */
  var FY_JARJ = ['lin30m', 'cmj', 'mas', 'lin10m', 'lin5m', 'kasirata', 'sj'];
  function _rivi(c, o) {   // yhteinen rivimuoto
    var nimi = _t(c, 'tc_t_' + o.id);
    return { id: o.id, nimi: nimi, raaka: o.raaka, yks: o.yks || '', taso: _num(o.taso) ? o.taso : null, max: o.max || 5, eiNormia: !!o.eiNormia, trendi: o.trendi || null, lahde: o.lahde, pvm: o.pvm || null, neutraali: !!o.neutraali };
  }
  function _historiaPisteet(hist, avain, tk) {   // → [{pvm, arvo}] pvm-järjestyksessä
    var ulos = [];
    (hist || []).forEach(function (pt) { if (!pt) return; var v = tk ? (_num(pt[avain + '_s']) ? pt[avain + '_s'] : pt[avain]) : pt[avain]; if (_num(v) && pt.pvm) ulos.push({ pvm: _isoPvm(pt.pvm), arvo: v }); });
    ulos.sort(function (a, b) { return String(a.pvm).localeCompare(String(b.pvm)); });
    return ulos;
  }
  function _trendi(pisteet, pienempi) {   // vain kun ≥ 2 pistettä samasta lähteestä; muutos suhteessa raakaan (pienempi = aikatesti)
    if (!pisteet || pisteet.length < 2) return null;
    var a = pisteet[pisteet.length - 2].arvo, b = pisteet[pisteet.length - 1].arvo;
    if (a === b) return 'flat';
    var kyn = Math.abs(a) * 0.01;   // < 1 % muutos = ennallaan (mittausvirhe)
    return _trendiLuokka(b, a, kyn, pienempi);
  }
  var AIKATESTI = { lin5m: 1, lin10m: 1, lin30m: 1, kasirata: 1, sm_juoksu: 1, sm_pallo: 1, syotto: 1, pujottelu: 1, ponnauttelu: 1, kuljetus_laukaus: 1 };
  function _fmtRaaka(r) {
    var f = _fn('_fmtTestiArvo') || ((_g('NORMIT', './tm_eerikkila_normit.js') || {})._fmtTestiArvo);
    var s = f ? f(r.arvo, r.yks) : _fmt(r.arvo, 2);
    return String(s).replace('.', ',') + (r.yks ? ' ' + r.yks : '');
  }

  function _perTestit(p, c) { var f = c.perTestTasot || _fn('perTestTasot') || ((_g('NORMIT', './tm_eerikkila_normit.js') || {}).perTestTasot); return f ? f(p, c.ika, c.sp) : []; }

  function _fyysRivit(p, c, rows, vanha) {
    var hist = p.hh_historia, ulos = [];
    FY_JARJ.forEach(function (id) {
      var r = rows.filter(function (x) { return x.dimensio === 'D1' && x.selKey === id; })[0]; if (!r) return;
      var piste = _historiaPisteet(hist, id, false);
      ulos.push(_rivi(c, { id: id, raaka: _fmtRaaka(r), yks: r.yks, taso: vanha ? null : r.taso, max: r.asteikko, eiNormia: r.taso == null, trendi: _trendi(piste, AIKATESTI[id]), lahde: 'hh', pvm: p.hh_pvm, neutraali: r.neutraali }));
    });
    return ulos;
  }
  function _teknRivit(p, c, rows, vanha) {
    var tk = rows.filter(function (x) { return x.dimensio === 'D2' && x.lahde === 'tk'; }), hh = rows.filter(function (x) { return x.dimensio === 'D2' && x.lahde === 'hh' && (x.selKey === 'syotto' || x.selKey === 'pujottelu'); });
    var sm = rows.filter(function (x) { return x.dimensio === 'D2' && (x.selKey === 'sm_juoksu' || x.selKey === 'sm_pallo'); });
    var lahde = tk.length ? 'tk' : hh.length ? 'hh' : sm.length ? 'sm' : null, ulos = [];
    if (lahde === 'tk') {
      var JARJ = ['kuljetus_laukaus', 'pujottelu', 'ponnauttelu', 'syotto'];
      JARJ.forEach(function (id) {
        var r = tk.filter(function (x) { return x.selKey === id; })[0]; if (!r) return;
        var piste = _historiaPisteet(p.tki_historia, id, true);
        ulos.push(_rivi(c, { id: id, raaka: _fmtRaaka(r), yks: r.yks, taso: vanha ? null : r.taso, max: 5, eiNormia: r.taso == null, trendi: _trendi(piste, true), lahde: 'tk', pvm: p.tki_pvm }));
      });
    } else if (lahde === 'hh') {
      ['pujottelu', 'syotto'].forEach(function (id) {
        var r = hh.filter(function (x) { return x.selKey === id; })[0]; if (!r) return;
        ulos.push(_rivi(c, { id: id, raaka: _fmtRaaka(r), yks: r.yks, taso: vanha ? null : r.taso, max: r.asteikko, eiNormia: r.taso == null, trendi: _trendi(_historiaPisteet(p.hh_historia, id, false), true), lahde: 'hh', pvm: p.hh_pvm }));
      });
    } else if (lahde === 'sm') {
      var j = sm.filter(function (x) { return x.selKey === 'sm_juoksu'; })[0], pa = sm.filter(function (x) { return x.selKey === 'sm_pallo'; })[0];
      if (j && pa) {   // seuran oma testistö: pallorata − juoksurata, ei normia → ei tasoa (yksi testi osa-alueella = tekniikkanäyte)
        var ero = Math.round((pa.arvo - j.arvo) * 100) / 100;
        ulos.push(_rivi(c, { id: 'sm_ero', raaka: _fmt(ero, 2) + ' s', yks: 's', taso: null, max: 5, eiNormia: true, trendi: null, lahde: 'sm', pvm: p.hh_pvm || p.tki_pvm || null }));
      } else {
        var r1 = j || pa;
        ulos.push(_rivi(c, { id: r1.selKey, raaka: _fmtRaaka(r1), yks: r1.yks, taso: vanha ? null : r1.taso, max: 5, eiNormia: r1.taso == null, trendi: null, lahde: 'sm', pvm: p.hh_pvm || p.tki_pvm || null }));
      }
    }
    return { rivit: ulos, lahde: lahde };
  }

  function _adarNimi(c, dk) { return _t(c, 'tc_t_' + dk); }
  function _adarBand(p, c) {
    var B = _fn('tmAdarBand') || ((_g('ADAR', './tm_pelialy_yksilo.js') || {}).tmAdarBand);
    try { var b = B ? B(c.ika, p.havainto_porras || null) : null; if (b && b.length) return b; } catch (e) { /* oletus */ }
    return ['a', 'd', 'ac', 'r'];
  }
  function _pelirivit(p, c) {
    var av = p.adar_viimeisin || {}, ed = p.adar_edellinen || null, band = _adarBand(p, c), dims = [];
    band.forEach(function (dk) { if (_num(av[dk])) dims.push({ id: dk, arvo: av[dk], ed: ed && _num(ed[dk]) ? ed[dk] : null }); });
    var pvm = _isoPvm(av.pvm);
    var rivit = [];
    if (dims.length) {   // KAIKKI ikätason ulottuvuudet riveille → tasonauhan keskiarvo = rivien keskiarvo = Masterin yht (tmAdarYht)
      dims.forEach(function (d) {
        rivit.push({ id: d.id, nimi: _adarNimi(c, d.id), raaka: _fmt(d.arvo, 1) + ' / 3', yks: '', taso: d.arvo, max: 3, eiNormia: false, trendi: _trendiLuokka(d.arvo, d.ed, 0.5, false), lahde: 'adar', pvm: pvm });
      });
    }
    var d3 = p.d3_viimeisin && p.d3_viimeisin.pisteet, coach = d3 && d3.coachability && _num(d3.coachability.avg) ? d3.coachability.avg : null;
    if (coach != null) rivit.push({ id: 'd3', nimi: _t(c, 'tc_t_d3'), raaka: _fmt(coach, 1) + ' / 5', yks: '', taso: coach, max: 5, eiNormia: false, trendi: null, lahde: 'd3', pvm: _isoPvm(p.d3_viimeisin.pvm) || null });
    var Y = _fn('tmAdarYht') || ((_g('ADAR', './tm_pelialy_yksilo.js') || {}).tmAdarYht), yht = null, osat = {};
    dims.forEach(function (d) { osat[d.id] = d.arvo; });
    try { yht = Y ? Y(osat, c.ika, p.havainto_porras || null) : null; } catch (e) { yht = null; }
    if (!_num(yht) && dims.length) yht = Math.round(dims.reduce(function (s, d) { return s + d.arvo; }, 0) / dims.length * 10) / 10;
    return { rivit: rivit.slice(0, PELI_RIVI_MAX), dims: dims, pvm: pvm, yht: yht };
  }

  /* Pelaajan oma näkemys: yksi lause, ei lukuja. D3 (pelaaja vs valmentaja, ero ≥ 1,5) ensin, sitten jakson itsearvio (≥ 1; kalibraatio_ero on itseisarvo → suunta arvoista). */
  function _omaNakemys(p, c) {
    var nimi = p.etunimi || '';
    var d3 = p.d3_viimeisin && p.d3_viimeisin.pisteet, paras = null;
    if (d3) Object.keys(d3).forEach(function (k) {
      var x = d3[k]; if (!x || !_num(x.pelaaja) || !_num(x.valmentaja)) return;
      var ero = x.pelaaja - x.valmentaja; if (Math.abs(ero) >= 1.5 && (!paras || Math.abs(ero) > Math.abs(paras.ero))) paras = { ero: ero, avain: k };
    });
    if (paras) return _t(c, paras.ero > 0 ? 'tc_oma_vahvempi' : 'tc_oma_varovaisempi', { nimi: nimi, aihe: _t(c, 'tc_oma_aihe_d3', { aihe: _t(c, 'tc_d3_' + paras.avain) }) });
    var h = Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : [];
    for (var i = h.length - 1; i >= 0; i--) {
      var r = h[i]; if (!r || !_num(r.arvio_itse) || !_num(r.arvio_valmentaja)) continue;
      var e = r.arvio_itse - r.arvio_valmentaja; if (Math.abs(e) < 1) return null;
      return _t(c, e > 0 ? 'tc_oma_vahvempi' : 'tc_oma_varovaisempi', { nimi: nimi, aihe: r.konsepti_nimi ? _t(c, 'tc_oma_aihe_jakso', { aihe: r.konsepti_nimi }) : _t(c, 'tc_oma_aihe_oletus') });
    }
    return null;
  }

  function _tasoSana(c, pct) { return _t(c, 'tc_ts_' + Math.max(1, Math.min(5, Math.round(pct * 5)))); }   // taso sanana (luvut näkyvät tasonauhassa ja riveillä)
  function _keskiTaso(rivit) {   // → { pct (0..1), arvo (skaalassa), max } | null; vain tasolliset rivit
    var r = rivit.filter(function (x) { return _num(x.taso) && x.max; });
    if (!r.length) return null;
    var pct = r.reduce(function (s, x) { return s + x.taso / x.max; }, 0) / r.length, max = Math.max.apply(null, r.map(function (x) { return x.max; }));
    return { pct: pct, arvo: pct * max, max: max, n: r.length };
  }

  /* ── Toiminnot ── */
  var JAKSO_AIHE = { syotto: 'y_h2' };   // testilaji → konseptin avain; vain yksiselitteinen (muille ei esivalintaa)
  function _x(c, avain, tekstiAvain, par, arg, extra) { return Object.assign({ avain: avain, teksti: _t(c, tekstiAvain, par), arg: arg == null ? null : arg }, extra || {}); }
  function _jaksoToiminto(c, kohde, jaksoTila) {   // kehityskohde → seuraavan jakson aihe (ei tallennusta)
    var ei = !jaksoTila || jaksoTila === 'ei_jaksoa';
    if (ei) {
      var av = kohde && JAKSO_AIHE[kohde.id] || null;
      return av ? _x(c, 'jakso_aiheeksi', 'tc_x_aiheeksi', { aihe: kohde.nimi }, av) : _x(c, 'jakso_aiheeksi', 'tc_x_aloita_jakso', null, null);
    }
    return kohde ? _x(c, 'polku', 'tc_x_kehityskohde_jakso', { aihe: kohde.nimi }, null) : _x(c, 'polku', 'tc_x_avaa_polku', null, null);
  }

  /* ── Kortit ── */
  function _ikaTiedot(c, pvm, nyt) { return { pvm: pvm || null, luokka: pvm ? _ikaLuokka(pvm, nyt) : 'normaali', pvmFi: pvm ? _pvmFi(pvm) : '', ikaTeksti: pvm ? _ikaTeksti(c, pvm, nyt) : '' }; }
  function _ikaMeta(c, ik) {
    if (ik.luokka === 'hyvin_vanha') return _t(c, 'tc_ika_hyvin_vanha', { vuosi: String(ik.pvm).slice(0, 4) });
    if (ik.luokka === 'vanha') return _t(c, 'tc_ika_vanha'); if (ik.luokka === 'amber') return _t(c, 'tc_ika_amber'); return '';
  }
  function _trendiLause(c, rivit, pvmEd, avaimet) {   // kortin trendi = nousevat vs laskevat rivit
    var up = rivit.filter(function (r) { return r.trendi === 'up'; }).length, dn = rivit.filter(function (r) { return r.trendi === 'down'; }).length, fl = rivit.filter(function (r) { return r.trendi === 'flat'; }).length;
    if (!up && !dn && !fl) return { luokka: null, lause: '' };
    var l = up > dn ? 'up' : dn > up ? 'down' : (fl ? 'flat' : 'flat');
    return { luokka: l, lause: pvmEd ? _t(c, avaimet[l], { pvm: _pvmFi(pvmEd) }) : '' };
  }
  function _edellinenPvm(hist, nyt) { var ps = (hist || []).map(function (x) { return _isoPvm(x && x.pvm); }).filter(Boolean).sort(); return ps.length >= 2 ? ps[ps.length - 2] : null; }

  function _kasvuKortti(p, c, phv, nyt) {
    var bio = p.biologinenIka_viimeisin && typeof p.biologinenIka_viimeisin === 'object' ? p.biologinenIka_viimeisin : null;
    var tahti = _num(p.kasvutahti_cm_v) ? p.kasvutahti_cm_v : (bio && _num(bio.kasvutahti_cm_v) ? bio.kasvutahti_cm_v : null);
    var k = { avain: 'kasvu', nimi: _t(c, 'tc_a_kasvu'), tyhja: !bio, fokus: false, rivit: [], merkit: [], ika: _ikaTiedot(c, bio ? _isoPvm(bio.pvm) : null, nyt), phv: phv, huomio: false };
    if (!bio) {   // tuntematon / ei mitattu → amber, ainoa toiminto = kasvumittaus
      k.lause = _t(c, 'tc_kasvu_tuntematon'); k.apu = _t(c, 'tc_kasvu_tarvitaan'); k.merkit = [{ teksti: _t(c, 'tc_m_ei_mitattu'), tyyppi: 'w' }];
      k.toiminto = _x(c, 'mittaus', 'tc_x_suunnittele_kasvumittaus', null, 'kasvumittaus'); return k;
    }
    var osat = [];
    var tila = { PRE: 'pre', LAH: 'lah', PH: 'ph', POST: 'post', AN: 'post' }[phv] || null;
    if (tila) osat.push(_t(c, 'tc_kasvu_' + tila));
    else osat.push(_t(c, 'tc_kasvu_tuntematon'));
    if (_num(bio.phv_ika) && tila && tila !== 'post') osat.push(_t(c, 'tc_kasvu_phv_ika', { ika: _fmt(bio.phv_ika, 1) }));
    if (_num(tahti)) osat.push(_t(c, 'tc_kasvu_tahti', { x: _fmt(tahti, 1) }));
    if (tila) osat.push(_t(c, 'tc_kasvu_' + tila + '_ohje'));
    if (_num(tahti) && tahti >= 7.2) { osat.push(_t(c, 'tc_kasvu_nopea', { x: _fmt(tahti, 1) })); k.huomio = true; }
    else if (_num(tahti) && tahti >= 6.5) osat.push(_t(c, 'tc_kasvu_kiihtyy', { x: _fmt(tahti, 1) }));
    k.lause = osat.join(' ');
    k.rivit.push({ id: 'phv', nimi: _t(c, 'tc_t_phv'), raaka: _t(c, 'tc_phv_' + phv), yks: '', taso: null, max: 5, eiNormia: false, trendi: null, lahde: 'kasvu', pvm: _isoPvm(bio.pvm), vain: 'teksti' });
    if (_num(bio.phv_ika)) k.rivit.push({ id: 'phv_ika', nimi: _t(c, 'tc_t_phv_ika'), raaka: _fmt(bio.phv_ika, 1) + ' v', yks: '', taso: null, max: 5, eiNormia: false, trendi: null, lahde: 'kasvu', pvm: _isoPvm(bio.pvm), vain: 'teksti' });
    if (_num(tahti)) k.rivit.push({ id: 'kasvutahti', nimi: _t(c, 'tc_t_kasvutahti'), raaka: _fmt(tahti, 1) + ' cm/v', yks: '', taso: null, max: 5, eiNormia: false, trendi: null, lahde: 'kasvu', pvm: _isoPvm(bio.pvm), vain: 'teksti' });
    k.lahdeTeksti = _t(c, 'tc_lahde_rivi_ilman_ikaa', { lahde: _t(c, 'tc_l_kasvu'), pvm: k.ika.pvmFi });
    k.toiminto = phv === 'PH' ? _x(c, 'kuorma', 'tc_x_kuorma', null, null) : _x(c, 'mittaus', 'tc_x_paivita', null, 'kasvumittaus');
    return k;
  }

  /* Pieni kehityskäyrä tärkeimmälle testille (≥ 2 pistettä samasta lähteestä, hh_historia): sparkline + ero; vauhti vain kun väli ≥ 60 pv (tmKaariNopeus, K4a §3). */
  function _kayra(p, c, rivit) {
    var K = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_kehityskaari.js') : root, r = null, sarja = null;   // selaimessa tmKaari* ovat window-globaaleja
    if (!K || typeof K.tmKaariSarja !== 'function') return null;
    rivit.some(function (x) { var sr = K.tmKaariSarja(p.hh_historia, x.id); if (sr.length >= 2) { r = x; sarja = sr; return true; } return false; });
    if (!r) return null;
    var nop = K.tmKaariNopeus(sarja), yks = r.id.indexOf('lin') === 0 || r.id === 'kasirata' ? ' s' : (r.id === 'cmj' || r.id === 'sj' ? ' cm' : ' km/h'), d = r.id === 'cmj' || r.id === 'sj' || r.id === 'mas' ? 1 : 2;
    return { id: r.id, nimi: r.nimi, siru: K.tmKaariSiru ? K.tmKaariSiru(sarja) : '',
      ero: _t(c, 'tc_kayra_ero', { eka: _fmt(sarja[0].arvo, d), nyt: _fmt(sarja[sarja.length - 1].arvo, d) + yks, n: sarja.length }),
      vauhti: nop && nop.lyhytVali ? _t(c, 'tc_kayra_lyhyt') : (nop && _num(nop.perKausi) ? _t(c, 'tc_kayra_vauhti', { x: (nop.perKausi > 0 ? '+' : '') + _fmt(nop.perKausi, 2) + yks }) : '') };
  }

  function _fyysKortti(p, c, phv, nyt, rows) {
    var pvm = _isoPvm(p.hh_pvm), ik = _ikaTiedot(c, pvm, nyt), vanha = ik.luokka === 'hyvin_vanha';
    var rivit = _fyysRivit(p, c, rows, vanha);
    var k = { avain: 'fyysinen', nimi: _t(c, 'tc_a_fyysinen'), tyhja: !rivit.length, fokus: false, rivit: rivit, merkit: [], ika: ik, phv: phv, huomio: false, lahdeTeksti: '' };
    if (!rivit.length) { k.lause = _t(c, 'tc_fy_tyhja'); k.toiminto = _x(c, 'mittaus', 'tc_x_suunnittele_mittaus', null, 'fyysinen'); return k; }
    var tasolliset = rivit.filter(function (r) { return _num(r.taso); }), osat = [], kesk = _keskiTaso(rivit);
    if (tasolliset.length >= 2 && kesk && !vanha) {
      var sort = tasolliset.slice().sort(function (a, b) { return b.taso / b.max - a.taso / a.max; });
      osat.push(_t(c, 'tc_fy_taso', { taso: _tasoSana(c, kesk.pct) }));
      osat.push(_t(c, 'tc_fy_vahvin_heikoin', { vahvin: sort[0].nimi, heikoin: sort[sort.length - 1].nimi }));
    } else if (tasolliset.length === 1 && !vanha) {
      osat.push(_t(c, 'tc_fy_yksi', { testi: tasolliset[0].nimi, taso: _tasoSana(c, tasolliset[0].taso / tasolliset[0].max) }));
    } else osat.push(_t(c, 'tc_fy_raaka'));
    var tr = _trendiLause(c, rivit, null, {});   // trendi näkyy rivin nuolessa, ei lauseessa
    if (phv === 'PH') osat = osat.slice(0, 1).concat(_t(c, 'tc_fy_ph'));   // kasvupyrähdys korvaa toisen virkkeen
    else if (!_fyysTulkintaSalli(phv)) k.selite = _t(c, 'tc_fy_selite');   // PRE/LAH/tuntematon: perustelu ⓘ:ssä (sääntö §28 elää koodissa: _fyysTulkintaSalli)
    k.lause = osat.slice(0, 2).join(' '); k.trendi = tr.luokka;
    k.lahdeTeksti = _t(c, 'tc_lahde_rivi', { lahde: _t(c, 'tc_l_hh'), pvm: ik.pvmFi }); k.lahdeMaara = _t(c, rivit.length === 1 ? 'tc_n_testi' : 'tc_n_testia', { n: rivit.length });
    k.kayra = _kayra(p, c, rivit);
    k.toiminto = _x(c, 'testihistoria', 'tc_x_testihistoria', null, 'fyysinen' + (k.kayra ? ':' + k.kayra.id : ''));   // K4c: arg = osio[:testi] → sheet avaa osion ja testin rivin
    return k;
  }

  function _teknKortti(p, c, phv, nyt, rows, kausiNimet) {
    var T = _teknRivit(p, c, rows, false), pvm = _isoPvm(p.tki_pvm) || _isoPvm(p.hh_pvm), ik = _ikaTiedot(c, pvm, nyt), vanha = ik.luokka === 'hyvin_vanha';
    if (vanha) T = _teknRivit(p, c, rows, true);
    var rivit = T.rivit;
    var k = { avain: 'tekninen', nimi: _t(c, 'tc_a_tekninen'), tyhja: !rivit.length, fokus: false, rivit: rivit, merkit: [], ika: ik, phv: phv, huomio: false, lahdeTeksti: '', lahde: T.lahde };
    if (!rivit.length) { k.lause = _t(c, 'tc_te_tyhja'); k.toiminto = _x(c, 'mittaus', 'tc_x_suunnittele_mittaus', null, 'tekninen'); return k; }
    var tasolliset = rivit.filter(function (r) { return _num(r.taso); }), osat = [];
    if (rivit.length === 1 || T.lahde === 'sm') {
      k.nayte = true; k.merkit = [{ teksti: _t(c, 'tc_m_tekniikkanayte'), tyyppi: '' }];
      osat.push(_t(c, 'tc_te_yksi'));
    } else if (tasolliset.length >= 2 && !vanha) {
      var kesk = _keskiTaso(rivit), sort = tasolliset.slice().sort(function (a, b) { return b.taso / b.max - a.taso / a.max; });
      osat.push(_t(c, 'tc_te_taso', { taso: _tasoSana(c, kesk.pct) }));
      osat.push(_t(c, 'tc_te_vahvin_heikoin', { vahvin: sort[0].nimi, heikoin: sort[sort.length - 1].nimi }));
      if (kausiNimet && kausiNimet.indexOf(sort[sort.length - 1].id) >= 0) osat.push(_t(c, 'tc_te_tukee'));
    } else osat.push(_t(c, 'tc_fy_raaka'));
    if (osat.length > 2) { k.apu = osat[2]; osat = osat.slice(0, 2); }   // enintään 2 virkettä: "Tukee kauden tavoitetta." pienelle riville
    if (phv === 'PH') osat = osat.slice(0, 1).concat(_t(c, 'tc_te_ph'));   // kasvupyrähdys korvaa toisen virkkeen
    var tr = _trendiLause(c, rivit, null, {}); k.trendi = tr.luokka;
    k.lause = osat.join(' ');
    var lahdeNimi = _t(c, T.lahde === 'tk' ? 'tc_l_tk' : T.lahde === 'hh' ? 'tc_l_hh' : 'tc_l_sm');
    k.lahdeTeksti = T.lahde === 'sm' ? _t(c, 'tc_lahde_rivi_ero', { lahde: lahdeNimi, pvm: ik.pvmFi }) : _t(c, 'tc_lahde_rivi', { lahde: lahdeNimi, pvm: ik.pvmFi });
    k.lahdeMaara = _t(c, rivit.length === 1 ? 'tc_n_testi' : 'tc_n_testia', { n: rivit.length });
    k.toiminto = _x(c, 'testihistoria', 'tc_x_testihistoria', null, 'tekninen' + (rivit[0] && rivit[0].id !== 'sm_ero' ? ':' + rivit[0].id : ''));
    return k;
  }

  function _peliKortti(p, c, phv, nyt) {
    var P = _pelirivit(p, c), nHav = _num(p.adar_havaintoja) ? p.adar_havaintoja : 0, arvioijat = Array.isArray(p.adar_arvioijat) ? p.adar_arvioijat : [];
    var ik = _ikaTiedot(c, P.pvm, nyt);
    var tyhja = !P.rivit.length;
    var k = { avain: 'peli', nimi: _t(c, 'tc_a_peli'), tyhja: tyhja, yht: P.yht, fokus: false, rivit: P.rivit, merkit: [], ika: ik, phv: phv, huomio: false, lahdeTeksti: '' };
    if (tyhja) { k.lause = _t(c, 'tc_pe_tyhja'); k.toiminto = _x(c, 'havainto', 'tc_x_havainto', null, null); return k; }
    var osat = [], av = p.adar_viimeisin || {};
    if (nHav < 3) {   // luotettavuusportti: < 3 havaintoa ei tulkintaa
      k.lause = _t(c, 'tc_pe_vahan'); k.apu = _t(c, 'tc_pe_luotettava_ohje'); k.vahan = true;
      k.merkit = [{ teksti: _t(c, nHav === 1 ? 'tc_n_havainto' : 'tc_n_havaintoa', { n: nHav }), tyyppi: '' }];
      k.toiminto = _x(c, 'havainto', 'tc_x_havainto', null, null); k.lahdeTeksti = ''; return k;
    }
    var ryh = { h: [], k: [], j: [] };
    P.dims.forEach(function (d) { (d.arvo >= 3 ? ryh.h : d.arvo >= 2 ? ryh.k : ryh.j).push(_adarNimi(c, d.id).toLowerCase()); });
    if (ryh.h.length) osat.push(_t(c, 'tc_pe_hallussa', { nimet: ryh.h.join(', ') }));
    if (ryh.k.length && !(ryh.h.length && ryh.j.length)) osat.push(_t(c, 'tc_pe_kehittyva', { nimet: ryh.k.join(', ') }));   // enintään 2 virkettä: kolmesta ryhmästä keskimmäinen jää pois (luvut riveillä)
    if (ryh.j.length) osat.push(_t(c, 'tc_pe_harjoittelussa', { nimet: ryh.j.join(', ') }));
    var a = arvioijat.length || (_num(p.adar_arvioijia) ? p.adar_arvioijia : 0);
    k.lause = osat.join(' ');
    k.oma = _omaNakemys(p, c);
    var tr = _trendiLause(c, P.rivit, null, {}); k.trendi = tr.luokka;
    var heikoin = P.dims.slice().sort(function (x, y) { return x.arvo - y.arvo; })[0];
    k.heikoinNimi = heikoin ? _adarNimi(c, heikoin.id).toLowerCase() : null;
    k.lahdeTeksti = _t(c, 'tc_lahde_rivi_ilman_ikaa', { lahde: _t(c, 'tc_l_adar'), pvm: ik.pvmFi });
    k.lahdeMaara = _t(c, nHav === 1 ? 'tc_n_havainto' : 'tc_n_havaintoa', { n: nHav }) + (a ? ' · ' + _t(c, a === 1 ? 'tc_n_arvioija' : 'tc_n_arvioijaa', { n: a }) : '') + ' · ' + _t(c, a >= 2 ? 'tc_pe_luotettava' : 'tc_pe_alustava');
    k.toiminto = k.heikoinNimi ? _x(c, 'puheeksi', 'tc_x_puheeksi', { aihe: k.heikoinNimi }, null) : _x(c, 'havainto', 'tc_x_havainto', null, null);
    return k;
  }

  function _fleiPct(f) { return _num(f) ? f : (f && _num(f.pct)) ? f.pct : null; }
  /* Mittauspäivä: flei_pvm → flei_viimeisin.pvm → flei_historian uusin rivi (flei_viimeisin on yleensä luku, ei objekti). */
  function _fleiPvm(p) {
    var v = _isoPvm(p.flei_pvm) || (p.flei_viimeisin && typeof p.flei_viimeisin === 'object' && _isoPvm(p.flei_viimeisin.pvm)) || null;
    if (v) return v;
    var ps = (Array.isArray(p.flei_historia) ? p.flei_historia : []).map(function (e) { return e && _isoPvm(e.pvm); }).filter(Boolean).sort();
    return ps.length ? ps[ps.length - 1] : null;
  }
  /* Heikoin alue (laskeKetjuProfiili: isot/pienet avaimet, vanhat SL/FL): nimetään vain jos ≥ 10 %-yks. muita alempi. */
  var KETJU_EROTUS = 10;
  function _heikoinAlue(p) {
    var T = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? (require('./tm-profile.js').TM || {}).profile : (root.TM && root.TM.profile);
    var kp = T && T.laskeKetjuProfiili ? T.laskeKetjuProfiili(p) : null;
    if (!kp || !kp.heikoin || !kp.toiseksiHeikoin) return null;
    return kp.painot[kp.toiseksiHeikoin] - kp.painot[kp.heikoin] >= KETJU_EROTUS ? kp.heikoin.toLowerCase() : null;
  }
  function _kehoKortti(p, c, phv, nyt) {
    var pct = _fleiPct(p.flei_viimeisin), pvm = _fleiPvm(p), ik = _ikaTiedot(c, pvm, nyt);
    if (!pvm) ik.luokka = 'vanha';   // päivä puuttuu → ei "normaali": sama kuin yli 6 kk vanha (Päivitä mittaus)
    var k = { avain: 'keho', nimi: _t(c, 'tc_a_keho'), tyhja: !(pct > 0), fokus: false, rivit: [], merkit: [], ika: ik, phv: phv, huomio: false, lahdeTeksti: '' };
    if (!(pct > 0)) { k.lause = _t(c, 'tc_ke_tyhja'); k.toiminto = _x(c, 'mittaus', 'tc_x_suunnittele_mittaus', null, 'keho'); return k; }
    var hist = (Array.isArray(p.flei_historia) ? p.flei_historia : []).filter(function (e) { return e && _num(e.flei); });
    var tr = hist.length >= 2 ? _trendiLuokka(hist[hist.length - 1].flei, hist[hist.length - 2].flei, 5, false) : null;
    var osat = [_t(c, pct >= 65 ? 'tc_ke_taso_hyva' : pct >= 50 ? 'tc_ke_taso_kehittyva' : 'tc_ke_taso_tuki')];
    var alue = _heikoinAlue(p), tuki = alue ? _t(c, 'tc_ke_tuki', { alue: _t(c, 'tc_alue_' + alue) }) : '', nakyy = alue ? _t(c, 'tc_ke_nakyy', { missa: _t(c, 'tc_alue_' + alue + '_missa') }) : '';
    if (pct < 40) { osat.push(_t(c, 'tc_ke_matala')); k.huomio = true; k.apu = [tuki, nakyy].filter(Boolean).join(' ') || null; }   // matala: ohjaus fysioterapeutille; alue pienelle riville
    else { if (tuki) osat.push(tuki); k.apu = nakyy || null; }
    k.lause = osat.join(' ');
    var taso = _puoli(pct / 20);   // 0–100 % → 5 pisteen asteikko, puolikas säilyy
    k.rivit.push({ id: 'keho', nimi: _t(c, 'tc_t_keho'), raaka: Math.round(pct) + ' %', yks: '', taso: ik.luokka === 'hyvin_vanha' ? null : taso, max: 5, eiNormia: false, trendi: tr, lahde: 'flei', pvm: pvm, pct: pct });
    k.trendi = tr; k.lahdeTeksti = pvm ? _t(c, 'tc_lahde_rivi_ilman_ikaa', { lahde: _t(c, 'tc_l_flei'), pvm: ik.pvmFi }) : _t(c, 'tc_lahde_rivi_ei_pvm', { lahde: _t(c, 'tc_l_flei') });
    k.toiminto = _x(c, 'mittaus', 'tc_x_paivita', null, 'keho');
    return k;
  }

  /* Datan ikä > 6 kk → ainoa toiminto "Päivitä mittaus" (§14); 3–6 kk amber-meta. */
  function _ikaToiminto(k, c) {
    if (k.tyhja || !k.ika || (k.ika.luokka !== 'vanha' && k.ika.luokka !== 'hyvin_vanha')) return;
    var arg = { fyysinen: 'fyysinen', tekninen: 'tekninen', keho: 'keho', kasvu: 'kasvumittaus' }[k.avain] || null;
    if (k.avain === 'peli') return;   // pelihavainnot eivät ole "mittaus"; uusi havainto on toiminto
    k.toiminto = _x(c, 'mittaus', 'tc_x_paivita', null, arg); k.vainPaivita = true;
  }

  var JARJ = ['fyysinen', 'tekninen', 'peli', 'keho', 'kasvu'];
  var NAUHA_JARJ = ['kasvu', 'fyysinen', 'tekninen', 'peli', 'keho'];

  function _nauhaRivi(k, c) {
    var o = { avain: k.avain, nimi: _t(c, 'tc_a_' + k.avain), lyhyt: _t(c, k.avain === 'kasvu' ? 'tc_a_kasvu_lyhyt' : 'tc_a_' + k.avain), pct: null, arvo: '', kattavuus: '', tyhja: true };
    if (k.avain === 'kasvu') { if (!k.tyhja) { o.tyhja = false; o.arvo = _t(c, 'tc_phv_' + (k.phv || 'tuntematon')); o.kattavuus = _t(c, 'tc_n_mittaus', { n: 1 }); o.pct = null; o.teksti = true; } else o.arvo = _t(c, 'tc_ei_mitattu'); return o; }
    if (k.tyhja) { o.arvo = _t(c, 'tc_ei_mitattu'); return o; }
    if (k.avain === 'keho') { var r = k.rivit[0]; o.tyhja = false; o.pct = r && _num(r.pct) && k.ika.luokka !== 'hyvin_vanha' ? Math.round(r.pct) : null; o.arvo = r && _num(r.pct) ? Math.round(r.pct) + ' %' : _t(c, 'tc_ei_tasoa'); o.kattavuus = _t(c, 'tc_n_mittaus', { n: 1 }); return o; }
    var rivit = k.avain === 'peli' ? k.rivit.filter(function (x) { return x.lahde === 'adar'; }) : k.rivit, kesk = _keskiTaso(rivit);
    if (k.avain === 'peli' && kesk && _num(k.yht)) kesk = { pct: k.yht * (1 / 3), arvo: k.yht, max: 3, n: kesk.n };   // YKSI laskenta: sama tmAdarYht kuin Masterin yht ja kortin ADAR-rivien keskiarvo
    o.tyhja = false;
    if (k.nayte) { o.arvo = _t(c, 'tc_ei_tasoa'); o.kattavuus = _t(c, 'tc_n_testi', { n: rivit.length }); return o; }   // tekniikkanäyte: ei osa-aluetta tasoa
    if (k.vahan) { o.arvo = _t(c, 'tc_ei_tasoa'); o.kattavuus = k.merkit && k.merkit[0] ? k.merkit[0].teksti : ''; return o; }
    if (!kesk) { o.arvo = _t(c, 'tc_ei_tasoa'); o.kattavuus = _t(c, 'tc_n_testia', { n: rivit.length }); return o; }
    o.pct = Math.round(kesk.pct * 100); o.arvo = _fmt(kesk.arvo, 1) + ' / ' + kesk.max;
    o.kattavuus = k.avain === 'peli' ? (k.lahdeMaara ? k.lahdeMaara.split(' · ')[0] : '') : (k.lahdeMaara || '');
    return o;
  }

  /* Yhteenvedon Vahvuus ja Kehityskohde: SAMOISTA korttiriveistä kuin kortit (ei toista logiikkaa); §28: PRE/LAH/tuntematon + PH → fyysistä ei nimetä kehityskohteeksi. */
  function _yhteenveto(kortit, c, phv, p, nyt, jaksoTila) {
    var ehdokkaat = [];
    ['tekninen', 'fyysinen', 'peli'].forEach(function (a) {
      var k = kortit[a]; if (!k || k.tyhja || k.vahan) return; if (k.nayte) return;
      k.rivit.forEach(function (r) { if (_num(r.taso) && r.max && r.lahde !== 'd3') ehdokkaat.push({ alue: a, rivi: r, pct: r.taso / r.max, kortti: k }); });
    });
    var o = { vahvuus: null, kehityskohde: null, puuttuu: null, viimeisin: null, tyhjaLause: null };
    var pvmt = [p.hh_pvm, p.tki_pvm, kortit.keho && kortit.keho.ika && kortit.keho.ika.pvm, p.adar_viimeisin && p.adar_viimeisin.pvm].map(_isoPvm).filter(Boolean).sort();
    var viim = pvmt.length ? pvmt[pvmt.length - 1] : null;
    if (viim) o.viimeisin = _t(c, 'tc_viimeisin_testi', { pvm: (_paivia(viim, nyt) || 0) < 330 ? _pvmLyhyt(viim) : _pvmFi(viim), ika: _ikaLyhyt(c, viim, nyt) });   // K1e: "Testattu 4.10. · 2 vk" (yli 11 kk → vuosi mukaan)
    if (ehdokkaat.length) {
      var max = Math.max.apply(null, ehdokkaat.map(function (e) { return e.pct; }));
      var v = max >= 0.6 ? ehdokkaat.filter(function (e) { return e.pct === max; })[0] : null;   // vahvuus vaatii vähintään tason 3/5 (60 % asteikosta); tasapeli: tekninen → fyysinen → peli
      var kandit = ehdokkaat.filter(function (e) { return e.alue === 'tekninen' || e.alue === 'peli' || _fyysTulkintaSalli(phv); });
      var min = kandit.length ? Math.min.apply(null, kandit.map(function (e) { return e.pct; })) : null;
      var kk = (min != null && min < max) ? kandit.filter(function (e) { return e.pct === min; })[0] : null;
      var meta = function (e) { return _t(c, 'tc_yht_meta', { alue: _t(c, 'tc_a_' + e.alue), taso: _fmt(_puoli(e.rivi.taso), 1), max: e.rivi.max, pvm: _pvmLyhyt(e.rivi.pvm) }); };
      if (v) o.vahvuus = { nimi: v.rivi.nimi, meta: meta(v), alue: v.alue };
      if (kk && kk !== v) o.kehityskohde = { nimi: kk.rivi.nimi, meta: meta(kk), alue: kk.alue, id: kk.rivi.id, toiminto: _jaksoToiminto(c, { id: kk.rivi.id, nimi: kk.rivi.nimi }, jaksoTila) };
    }
    return o;
  }

  /* ── Pääfunktio ── */
  function tmTodisteMalli(p, c) {
    p = p || {}; c = c || {};
    var nyt = c.nyt instanceof Date ? c.nyt : new Date(), phv = _phv(p, c), rows = _perTestit(p, c), jaksoTila = c.jaksoTila || 'ei_jaksoa';
    var kausiNimet = c.kausitavoiteLajit || null;
    var kortit = {
      kasvu: _kasvuKortti(p, c, phv, nyt), fyysinen: _fyysKortti(p, c, phv, nyt, rows), tekninen: _teknKortti(p, c, phv, nyt, rows, kausiNimet),
      peli: _peliKortti(p, c, phv, nyt), keho: _kehoKortti(p, c, phv, nyt)
    };
    JARJ.forEach(function (a) { _ikaToiminto(kortit[a], c); kortit[a].ikaMeta = kortit[a].tyhja || !kortit[a].ika || !kortit[a].ika.pvm ? '' : _ikaMeta(c, kortit[a].ika); });
    var fokusAvain = tmTodisteFokus(p), fokusAihe = p.jaksofokus && (p.jaksofokus.konsepti_nimi || p.jaksofokus.konsepti_avain) || null;
    if (fokusAvain && kortit[fokusAvain] && !kortit[fokusAvain].tyhja) {
      var fk = kortit[fokusAvain]; fk.fokus = true; fk.fokusAihe = fokusAihe;
      fk.merkit = [{ teksti: fokusAihe ? _t(c, 'tc_m_fokus', { aihe: fokusAihe }) : _t(c, 'tc_m_fokus_lyhyt'), tyyppi: 'f' }].concat(fk.merkit || []);
    } else fokusAvain = null;
    var yht = _yhteenveto(kortit, c, phv, p, nyt, jaksoTila);
    /* toiminnot: kehityskohteen alue + fokuskortti saavat "seuraavan jakson aihe" -napin; muut pitävät omansa */
    var khAlue = yht.kehityskohde && yht.kehityskohde.alue;
    if (khAlue && kortit[khAlue] && !kortit[khAlue].vainPaivita) kortit[khAlue].toiminto = yht.kehityskohde.toiminto;
    if (fokusAvain && !kortit[fokusAvain].vainPaivita && fokusAvain !== khAlue) kortit[fokusAvain].toiminto = _jaksoToiminto(c, null, jaksoTila === 'ei_jaksoa' ? 'kaynnissa' : jaksoTila);
    var tyhjat = JARJ.filter(function (a) { return kortit[a].tyhja; });
    var mittaus = ['kasvu', 'fyysinen', 'tekninen', 'keho'].filter(function (a) { return kortit[a].tyhja; });
    var koonti = null;
    if (tyhjat.length >= 3) {   // ≥ 3 viidestä tyhjää → yksi "Mittauskierros puuttuu" (luettelee puuttuvat mittausalueet; Peli ei ole mittauskierroksen asia)
      var nimet = mittaus.map(function (a) { return _t(c, 'tc_a_' + a); }).join(', ').replace(/, ([^,]*)$/, ' ja $1').toLowerCase().replace(/^./, function (m) { return m.toUpperCase(); });
      koonti = { avain: 'koonti', koonti: true, nimi: _t(c, 'tc_koonti_otsikko'), puuttuvat: mittaus.map(function (a) { return { avain: a, nimi: _t(c, 'tc_a_' + a), aika: a === 'kasvu' ? _t(c, 'tc_koonti_aika_kasvu') : '' }; }),
        lauseN: mittaus.length >= 3 ? _t(c, mittaus.length >= 4 ? 'tc_koonti_lause_4' : 'tc_koonti_lause_3') : _t(c, mittaus.length === 1 ? 'tc_koonti_lause_nimi' : 'tc_koonti_lause_nimet', { nimet: nimet }),
        merkki: { teksti: _t(c, 'tc_m_n_osa_aluetta', { n: mittaus.length }), tyyppi: 'w' }, toiminto: _x(c, 'mittaus', 'tc_x_suunnittele_kierros', null, 'kierros') };
    }
    var jarj = fokusAvain ? [fokusAvain].concat(['fyysinen', 'tekninen', 'peli', 'keho', 'kasvu'].filter(function (a) { return a !== fokusAvain; })) : ['fyysinen', 'tekninen', 'peli', 'keho', 'kasvu'];
    var nayta = [], koontiPaikassa = false;   // koonti korvaa ensimmäisen puuttuvan mittausalueen paikan, muut puuttuvat jäävät pois
    jarj.forEach(function (a) {
      if (koonti && mittaus.indexOf(a) >= 0) { if (!koontiPaikassa) { nayta.push(koonti); koontiPaikassa = true; } return; }
      nayta.push(kortit[a]);
    });
    var kokonaan = tyhjat.length === 5 || !(kortit.fyysinen.rivit.length || kortit.tekninen.rivit.length || !kortit.keho.tyhja || !kortit.peli.tyhja);
    var puuttuu = null;
    if (kortit.kasvu.tyhja) puuttuu = { nimi: _t(c, 'tc_puuttuu_kasvumittaus'), toiminto: _x(c, 'mittaus', 'tc_x_suunnittele_mittaus', null, 'kasvumittaus') };
    else { var ensin = mittaus.filter(function (a) { return a !== 'kasvu'; })[0]; if (ensin) puuttuu = { nimi: _t(c, 'tc_a_' + ensin), toiminto: _x(c, 'mittaus', 'tc_x_suunnittele_mittaus', null, ensin) }; }
    yht.puuttuu = puuttuu;
    if (kokonaan || (!yht.vahvuus && !yht.kehityskohde && tyhjat.length >= 3)) {
      var nPe = _num(p.adar_havaintoja) ? p.adar_havaintoja : 0;
      yht.tyhjaLause = _t(c, 'tc_yht_tyhja') + (nPe === 1 ? ' ' + _t(c, 'tc_yht_tyhja_havainto') : nPe > 1 ? ' ' + _t(c, 'tc_yht_tyhja_havaintoja', { n: nPe }) : '');
      yht.tyhjaApu = _t(c, 'tc_yht_tyhja_ohje');
    }
    var nauha = NAUHA_JARJ.map(function (a) { return _nauhaRivi(kortit[a], c); });
    var m = { phv: phv, tyhjaKaikki: !!yht.tyhjaLause, yhteenveto: yht, nauha: nauha, kortit: nayta, koonti: koonti, kortitKaikki: kortit, fokus: fokusAvain, jaksoTila: jaksoTila };
    m.luvut = _luvut(m);
    return m;
  }
  /* Näkyvien lukujen määrä (oletusnäkymä): yhteenvedon tasot + nauhan arvot + rivien raakatulokset + trendit eivät lasketa. Selaintesti laskee DOMista erikseen. */
  function _luvut(m) {
    var n = 0, y = m.yhteenveto;
    if (y.vahvuus) n += 1; if (y.kehityskohde) n += 1;
    m.nauha.forEach(function (r) { if (!r.tyhja && /\d/.test(r.arvo)) n += 1; });
    m.kortit.forEach(function (k) { (k.rivit || []).forEach(function (r) { if (/\d/.test(r.raaka || '')) n += 1; }); });
    return n;
  }

  var API = { FI: FI, tmTodisteMalli: tmTodisteMalli, tmTodisteFokus: tmTodisteFokus, JAKSO_AIHE: JAKSO_AIHE, RIVI_MAX: RIVI_MAX, FOKUS_RIVI_MAX: FOKUS_RIVI_MAX, PELI_RIVI_MAX: PELI_RIVI_MAX, _apu: { t: _t, num: _num, fmt: _fmt, puoli: _puoli, ikaLuokka: _ikaLuokka, trendi: _trendi, fmtRaaka: _fmtRaaka, rows: _perTestit, pisteet: _historiaPisteet, isoPvm: _isoPvm, pvmFi: _pvmFi, pvmLyhyt: _pvmLyhyt, paivia: _paivia, heikoinAlue: _heikoinAlue, fleiPct: _fleiPct, fleiPvm: _fleiPvm, ikaTeksti: _ikaTeksti, trendiLuokka: _trendiLuokka, AIKATESTI: AIKATESTI, FY_JARJ: FY_JARJ } };   // K4c (Kaikki mittaukset) käyttää samoja sääntöjä
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_TODISTEKORTIT = API;
})(typeof window !== 'undefined' ? window : this);
