/* ════════════════════════════════════════════════════════════════════════
   tm_vp_tilanne.js — VP_v25 Tilanne = KAUSI (S2c PR 1; docs/CODE_BRIEF_S2C_TILANNE_NAVI.md, mockup 25 §1 "Tilanne", D123).
   PURE: ei Firebasea, ei DOM:ia, ei kelloa (nytMs sisään). Dual-export: module.exports || window.TM_VP_TILANNE.
   Järjestys (D123): neljä tilannekorttia → kauden aikajana (D43) → jaksopalaveri → poikkeamat joukkueittain → mittaustilanne → ehdotukset (≤ 5) → talentit + syntymäkvartaalit.
   Komponentit: lib/tm_kt_komponentit.js (.kt-eb, .kt-sig, .kt-btn, .kt-ev …) — oma CSS vain asettelulle (.tt-*). Vain olemassa olevat tokenit.

   · tmTilanneSyote(env)         → malliin tarvittava syöte VP:n globaaleista (env = {pelaajat, joukkueDocs, joukkueNimet, kalenteri, tapahtumat, ehdotukset, idpN, pulssi, kausiAlkuMs, nytMs, fn})
   · tmTilanneMalli(syote)       → näkymämalli (kortit, aikajana, palaveri, poikkeamat, mittaus, ehdotukset, talentit, rae)
   · tmTilanneHTML(malli, opts)  → HTML (opts: {t, esc, fn:{joukkue, testijakso, esityslista, hyvaksy, muokkaa, hylkaa, ryhmat, rae}})
   · CSS                         → .tt-* asettelutyylit (lisää tmKtKomponentitLisaa:n jälkeen)
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000, KATSELMUS_VK_ENNEN = 4, AJ_ENNEN = 4, AJ_YHT = 14, MITTAUS_VANHA_KK = 6, POIKKEAMA_NAKY = 6, TILANNE_MAX_EHDOTUKSET = 5;

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _tt(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _LU() { return _req('TM_KOTI_LUVUT', './tm_koti_luvut.js') || {}; }
  function _ms(x) {
    if (x == null) return null;
    if (typeof x === 'number') return x;
    if (typeof x.toMillis === 'function') return x.toMillis();
    if (typeof x.toDate === 'function') return x.toDate().getTime();
    if (typeof x.seconds === 'number') return x.seconds * 1000;
    var t = Date.parse(x); return isFinite(t) ? t : null;
  }
  function _num(x) { return typeof x === 'number' && isFinite(x); }

  /* ── viikot: yhtenäinen viikkoindeksi (maanantai-viikko, 1.1.1970 = torstai) ja ISO-viikkonumero ── */
  function viikkoIdx(ms) { return Math.floor((Math.floor(ms / DAY) + 3) / 7); }
  function viikkoNro(idx) {   // YKSI ISO 8601 -kaava (lib/tm_viikko.js); viikon torstai = idx*7 (päivänumero); D140: KOVA virhe jos lib puuttuu
    var V = _req('TM_VIIKKO', './tm_viikko.js');
    if (!V || typeof V.tmIsoViikkoMs !== 'function') throw new Error('TM_VIIKKO puuttuu: lataa lib/tm_viikko.js ENNEN tm_vp_tilanne.js:ää (D140: ei omaa viikkokaavaa)');
    return V.tmIsoViikkoMs(idx * 7 * DAY).viikko;
  }
  function _pvmHki(ms, o) { try { return new Intl.DateTimeFormat('fi-FI', Object.assign({ timeZone: 'Europe/Helsinki' }, o)).format(new Date(ms)); } catch (e) { return ''; } }
  function _pv(ms) { var x = _pvmHki(ms, { day: 'numeric', month: 'numeric' }); return /\.$/.test(x) ? x : x + '.'; }   // fi-FI antaa jo "8.10."
  function _pvViikonpv(ms) { return _pvmHki(ms, { weekday: 'short', day: 'numeric', month: 'numeric' }); }
  function _kkEro(isoPvm, nytMs) { var t = _ms(isoPvm); return t == null ? null : Math.floor((nytMs - t) / (30.44 * DAY)); }

  /* ════════ SYÖTE: VP:n globaaleista → malliin ════════ */
  function tmTilanneSyote(env) {
    env = env || {}; var fn = env.fn || {}, nyt = env.nytMs != null ? env.nytMs : Date.now(), LU = _LU();
    var S = env.pulssi || {}, malli = S.malli || null, rivit = (malli && malli.rivit) || [];
    var docs = {}; (env.joukkueDocs || []).forEach(function (d) { docs[d.id] = d; });

    /* Tyhjät joukkueet (0 pelaajaa) pois KAIKISTA Tilanteen luvuista, nauhasta ja aikajanalta (D143–D145, mockup 29). Jäsenyys = tmPelaajanJoukkueet (§7.18), ei p.joukkue-kenttä.
       Ilman jäsenyysfunktiota (vanha kutsuja) → koosteen n_pelaajat. */
    var maara = {}, pelaajiaLadattu = !!(env.pelaajat && env.pelaajat.length), kaytaJasenyytta = !fn.pelaajanJoukkueet || !pelaajiaLadattu;   // pelaajia ei vielä ladattu (tyhjä lista) → EI rajata pelaajamäärällä: koosteen r.n ratkaisee (ei 0/0)
    if (!kaytaJasenyytta) (env.pelaajat || []).forEach(function (p) { (fn.pelaajanJoukkueet(p, env.joukkueDocs || []) || []).forEach(function (id) { maara[id] = (maara[id] || 0) + 1; }); });
    var onPelaajia = function (r) { return kaytaJasenyytta ? (r.n || 0) > 0 : (maara[r.jid] || 0) > 0; };

    /* Joukkueet ikäjärjestyksessä (sama rivi kuin pulssissa) + joukkuejakso aikajanalle (joukkuedokumentin jaksofokus) */
    var joukkueet = rivit.filter(onPelaajia).map(function (r) {
      var jf = (docs[r.jid] || {}).jaksofokus, a = jf && jf.alku ? _ms(String(jf.alku).slice(0, 10)) : null, N = jf && Number(jf.kesto_vk) > 0 ? Number(jf.kesto_vk) : null;
      var nimi = jf && jf.osa_alueet && jf.osa_alueet.tekninen_taktinen && jf.osa_alueet.tekninen_taktinen.nimi || r.jakso.nimi || null;
      var j = a != null && N ? { nimi: nimi, a0: viikkoIdx(a), a1: viikkoIdx(a) + N - 1, N: N } : null;
      return { jid: r.jid, nimi: r.nimi, ika: r.ikaNum, ikavaihe: r.ikavaihe, n: kaytaJasenyytta ? r.n : maara[r.jid], voimassa: !!r.jakso.voimassa, jakso: j, jaksoVk: r.jaksoVk,
               katselmusAuki: r.nKatselmusAuki > 0, katselmusPv: r.katselmusPv, pieni: r.pieni, leikkija: r.leikkija };
    });

    /* Katselmukset ajallaan (kausi): koosteiden suljetut ikkunat yhteen (n_katselmus_ajallaan / perusta), jaksoja = (joukkue, viikko) -parit joilla perusta > 0 */
    var ka = 0, kp = 0, kj = 0;
    (S.koosteet || []).forEach(function (k) { Object.keys(k.joukkueet || {}).forEach(function (jid) { var x = k.joukkueet[jid]; if (x && x.n_katselmus_perusta > 0 && x.ikavaihe !== 'leikkija') { ka += x.n_katselmus_ajallaan || 0; kp += x.n_katselmus_perusta; kj++; } }); });

    /* Mittaukset: joukkueen viimeisin mittauspäivä (hh/tki/flei, §26) */
    var jm = fn.ryhmittely ? fn.ryhmittely(env.pelaajat || [], 'Tuntematon') : {};
    var mitattu = joukkueet.map(function (j) {
      var pp = jm[j.nimi] || [], mx = null;
      pp.forEach(function (p) { [p.hh_pvm, p.tki_pvm, p.flei_pvm].forEach(function (dv) { if (dv) { var s = String(dv); if (!mx || s > mx) mx = s; } }); });
      return { nimi: j.nimi, pvm: mx, ms: mx ? _ms(mx.slice(0, 10)) : null, n: pp.length, pelaajat: pp };
    });

    /* Testijakso: seuraava suunniteltu testitapahtuma (pvm_alku–pvm_loppu) */
    var tj = (env.tapahtumat || []).filter(function (t) { return t && t.tila === 'suunniteltu' && _ms(t.pvm_alku) != null && _ms(t.pvm_alku) >= nyt - DAY; })
      .sort(function (a, b) { return _ms(a.pvm_alku) - _ms(b.pvm_alku); })[0] || null;
    var testijakso = tj ? { a0: viikkoIdx(_ms(tj.pvm_alku)), a1: viikkoIdx(_ms(tj.pvm_loppu || tj.pvm_alku)), nimi: tj.nimi || null, alkuMs: _ms(tj.pvm_alku) } : null;

    /* Jaksopalaveri = kalenteritapahtuma (tyyppi 'jaksopalaveri') */
    var pal = (env.kalenteri || []).filter(function (e) { return e && e.tyyppi === 'jaksopalaveri' && !e.poistettu && _ms(e.alkaa) != null && _ms(e.alkaa) >= nyt - 6 * 3600000; })
      .sort(function (a, b) { return _ms(a.alkaa) - _ms(b.alkaa); })[0] || null;

    /* Poikkeamat: kypsyysvahdilla (lib poikkeamaPortti), sama lähde kuin vanha renderPoikkeamat */
    var flat = [];
    if (fn.poikkeamat && LU.poikkeamaPortti) joukkueet.forEach(function (j) {
      var pp = jm[j.nimi] || []; if (!pp.length) return;
      var isp = fn.ikaSp ? fn.ikaSp(j.nimi) : { ika: null, sp: 'M' };
      LU.poikkeamaPortti(fn.poikkeamat(pp, isp.ika, isp.sp === 'T' ? 'N' : 'M'), pp).forEach(function (x) { flat.push({ joukkue: j.nimi, tyyppi: x.tyyppi, osaAlue: x.osaAlue, vakavuus: x.vakavuus, arvo: x.arvo, teema: x.teema, ikavaiheOdotettu: x.ikavaiheOdotettu, alaraja: x.alaraja, kypsyysEstetty: x.kypsyysEstetty }); });
    });

    /* Talentit + Hidden Gem (§28-portti) */
    var tal = (env.pelaajat || []).filter(function (p) { return p.talenttiOhjelma === true; }).length;
    var gem = fn.hiddenGem ? fn.hiddenGem() : { ehdokkaat: 0, odottaa: 0 };

    /* RAE (D125: kattavuusportti) */
    var rae = null;
    if (fn.raeJakauma && (env.pelaajat || []).length) {
      var jk = fn.raeJakauma(env.pelaajat), kat = LU.kattavuus ? LU.kattavuus(env.pelaajat, jm, function (p) { return !!(fn.raeQ && fn.raeQ(p)); }) : { riittava: true, n: jk.n_kvartaalillisia, yht: env.pelaajat.length };
      rae = { n: jk.n_kvartaalillisia, yht: env.pelaajat.length, riittava: !!kat.riittava, pct: jk.pct, signaali: jk.signaali };
    }

    /* D1-kattavuus seuratasolle (D125): "mitattu x/y joukkueelta" */
    var d1 = LU.kattavuus ? LU.kattavuus(env.pelaajat || [], jm, function (p) { return p.hh_taso != null || p.d1_taso != null; }) : null;

    return { nytMs: nyt, joukkueet: joukkueet, seura: { njakso: joukkueet.filter(function (j) { return j.voimassa; }).length, joukkueita: joukkueet.length },   // nimittäjä = joukkueet joilla on pelaajia
      katselmusKausi: { ajallaan: ka, perusta: kp, jaksoja: kj }, mitattu: mitattu, kausiAlkuMs: env.kausiAlkuMs != null ? env.kausiAlkuMs : null, testijakso: testijakso,
      palaveri: pal ? { ms: _ms(pal.alkaa), id: pal.id || null } : null, poikkeamat: flat, ehdotukset: env.ehdotukset || [], idpN: env.idpN != null ? env.idpN : 0,
      talentit: { n: tal, ehdokkaita: gem.ehdokkaat, odottaa: gem.odottaa }, rae: rae, d1: d1, ryhmaN: env.ryhmaN != null ? env.ryhmaN : null };
  }

  /* ════════ MALLI ════════ */
  /* D144: klikattavat lyhyet tunnisteet; enintään kuusi + "+N" (klikkaus avaa koko ryhmän; o.auki[avain]) — sama sääntö kaikkiin "kesken"-listoihin */
  function _tagit(L, tila, avain, o) {
    var ala = String(avain).replace(/_m$/, ''), max = o.auki && o.auki[ala] ? 999 : (avain === 'kaista' ? 8 : 6), nayt = L.slice(0, max)   /* mockup 29: aikajanan kaistalla 8 tunnistetta, muualla 6 */, loput = L.length - nayt.length;
    return nayt.map(function (x) { return '<button type="button" class="tt-tg ' + tila + '"' + o.call(o.fn.joukkue, x.nimi) + '>' + o.esc(x.tunniste) + '</button>'; }).join('')
      + (loput > 0 ? '<button type="button" class="tt-tg ' + tila + '" data-auki="' + avain + '"' + o.call(o.fn.auki, avain) + '>+' + loput + '</button>' : '');
  }
  /* Joukkueen lyhyt tunniste (P13, T14): ensimmäinen ikäluokkatunnus nimestä; duplikaatilla (P12 kilpa/harraste) loppu mukaan */
  function lyhytTunniste(nimi, kaikki) {
    var sanat = String(nimi == null ? '' : nimi).trim().split(/\s+/), i = 0;
    for (; i < sanat.length; i++) if (/^[A-Za-zÅÄÖåäö]?\d{1,2}$/.test(sanat[i])) break;
    if (i >= sanat.length) return String(nimi);
    var perus = sanat[i].toUpperCase(), sama = (kaikki || []).filter(function (x) { var q = String(x).trim().split(/\s+/), k = 0; for (; k < q.length; k++) if (/^[A-Za-zÅÄÖåäö]?\d{1,2}$/.test(q[k])) break; return k < q.length && q[k].toUpperCase() === perus; }).length;
    return sama > 1 ? sanat.slice(i).join(' ') : perus;
  }
  /* Joukkueen tila nauhaan: ok = jakso käynnissä ja katselmukset ajallaan · w = kesken / katselmus odottaa · n = ei jaksoa */
  function joukkueenTila(j) { return !j.voimassa ? 'n' : (j.katselmusAuki ? 'w' : 'ok'); }

  function tmTilanneMalli(s) {
    s = s || {}; var nyt = s.nytMs != null ? s.nytMs : Date.now(), nytIdx = viikkoIdx(nyt), J = s.joukkueet || [], LU = _LU();
    var y = J.length, m = { nytMs: nyt, joukkueita: y };
    var nimet = J.map(function (j) { return j.nimi; });
    J = J.map(function (j) { return Object.assign({}, j, { tila: joukkueenTila(j), tunniste: lyhytTunniste(j.nimi, nimet) }); });
    m.nauha = J.map(function (j) { return { nimi: j.nimi, tunniste: j.tunniste, tila: j.tila }; });
    var ryhma = function (t) { return J.filter(function (j) { return j.tila === t; }).map(function (j) { return { nimi: j.nimi, tunniste: j.tunniste }; }); };
    m.ryhmat = { ok: ryhma('ok'), w: ryhma('w'), n: ryhma('n') };

    /* 1 · neljä tilannekorttia */
    var ilman = J.filter(function (j) { return j.tila === 'n'; }).map(function (j) { return j.tunniste; });
    var mit = (s.mitattu || []), kausiAlku = s.kausiAlkuMs, mitKausi = mit.filter(function (x) { return x.ms != null && (kausiAlku == null || x.ms >= kausiAlku); }).length, kk = s.katselmusKausi || {};
    var tj = s.testijakso;
    m.kortit = {
      jaksolla: { a: J.filter(function (j) { return j.tila !== 'n'; }).length, b: y, ilman: ilman },
      katselmus: kk.perusta > 0 ? { pros: Math.round(100 * kk.ajallaan / kk.perusta), jaksoja: kk.jaksoja } : null,
      mitattu: { a: mitKausi, b: y, testijakso: tj ? { a: viikkoNro(tj.a0), b: viikkoNro(tj.a1) } : null, heikko: y > 0 && mitKausi < Math.ceil(y * 2 / 3) },
      idp: s.idpN || 0
    };

    /* 2 · aikajana: ikkuna nyt−4 … nyt+9 viikkoa */
    var A = nytIdx - AJ_ENNEN, B = A + AJ_YHT - 1;
    m.aikajana = { A: A, B: B, n: AJ_YHT, nyt: nytIdx, otsikot: [], rivit: J.filter(function (j) { return j.tila !== 'n'; }).map(function (j) { return { nimi: j.nimi, tunniste: j.tunniste, jakso: j.jakso, voimassa: j.voimassa, tila: j.tila }; }), kaista: m.ryhmat.n, vahan: (y - m.ryhmat.n.length) * 2 < y };
    for (var w = A; w <= B; w++) m.aikajana.otsikot.push({ idx: w, nro: viikkoNro(w) });
    m.aikajana.palaveri = s.palaveri ? { idx: viikkoIdx(s.palaveri.ms), pvm: _pv(s.palaveri.ms), ms: s.palaveri.ms } : null;
    m.aikajana.testijakso = tj ? { a0: tj.a0, a1: tj.a1, a: viikkoNro(tj.a0), b: viikkoNro(tj.a1) } : null;

    /* 3 · jaksopalaveri: ryhmät Valmiina · Kesken · Ei jaksoa (D144); valmis = jakso käynnissä JA katselmusikkuna ei auki */
    m.palaveri = { ms: s.palaveri ? s.palaveri.ms : null, id: s.palaveri ? s.palaveri.id : null, valmiit: m.ryhmat.ok.length, yht: y, ok: m.ryhmat.ok, w: m.ryhmat.w, n: m.ryhmat.n,
      vahan: (m.ryhmat.ok.length + m.ryhmat.w.length) * 2 < y };   // D146: alle puolella joukkueista jakso → "Jaksot puuttuvat N joukkueelta." + päätoiminto "Aloita jaksot"

    /* 4 · poikkeamat: YKSI rivi per joukkue ja osa-alue (domain) */
    var DOM = function (x) { return x.tyyppi === 'talenttiydin' ? 'Talenttiydin' : (x.osaAlue === 'tekniikka' ? 'Tekniikka' : (x.tyyppi === 'laskeva' || x.tyyppi === 'hajonta') ? 'Kehitys' : 'Fyysinen'); };
    var SEV = { punainen: 0, amber: 1, info: 2 }, ryh = {};
    (s.poikkeamat || []).forEach(function (x) { if (x.tyyppi === 'kattavuus') return; var k = x.joukkue + '|' + DOM(x); (ryh[k] = ryh[k] || { joukkue: x.joukkue, osa: DOM(x), items: [] }).items.push(x); });
    var mitMap = {}; mit.forEach(function (x) { mitMap[x.nimi] = x; });
    var rivit = Object.keys(ryh).map(function (k) {
      var g = ryh[k], items = g.items, sev = Math.min.apply(null, items.map(function (x) { return SEV[x.vakavuus] == null ? 2 : SEV[x.vakavuus]; }));
      var est = items.filter(function (x) { return x.kypsyysEstetty; }), kaikkiEstetty = est.length === items.length;
      var paa = items.slice().sort(function (a, b) { return (SEV[a.vakavuus] - SEV[b.vakavuus]) || ((a.arvo == null ? 99 : a.arvo) - (b.arvo == null ? 99 : b.arvo)); })[0];
      var osia = {}; items.forEach(function (x) { if (x.osaAlue) osia[x.osaAlue] = 1; });
      var mt = mitMap[g.joukkue] || {}, kkEro = _kkEro(mt.pvm, nyt);
      return { joukkue: g.joukkue, osa: g.osa, sev: kaikkiEstetty ? 'n' : (sev <= 1 ? 'w' : 'n'), estetty: kaikkiEstetty ? est[0].kypsyysEstetty : null,
               teksti: paa.teema, n: Object.keys(osia).length, tyyppi: paa.tyyppi, alaraja: items.some(function (x) { return x.alaraja; }), arvo: paa.arvo, jarj: kaikkiEstetty ? 9 : sev,
               mitattuPvm: mt.pvm || null, mitattuKk: kkEro, vanha: kkEro != null && kkEro >= MITTAUS_VANHA_KK, mitattuMs: mt.ms || null };
    }).sort(function (a, b) { return (a.jarj - b.jarj) || (b.n - a.n); });
    m.poikkeamat = rivit;
    m.d1 = s.d1 ? { riittava: !!s.d1.riittava, a: s.d1.joukkueN, b: s.d1.joukkueYht, raja: Math.ceil(2 * s.d1.joukkueYht / 3) } : null;

    /* 5 · mittaustilanne: joukkueita joiden viimeisin mittaus on yli 6 kk (tai puuttuu) */
    var vanhoja = mit.filter(function (x) { var e = _kkEro(x.pvm, nyt); return e == null || e >= MITTAUS_VANHA_KK; }).length;
    m.mittaus = { vanhoja: vanhoja, yht: mit.length, testijakso: m.aikajana.testijakso };

    /* 6 · ehdotukset ≤ 5 (D134): vanhentuneet pois, "+N muuta" */
    var tuoreet = (s.ehdotukset || []).filter(function (e) { return !(LU.ehdotusVanhentunut && LU.ehdotusVanhentunut(e.luotu, nyt)); });
    var raja = LU.rajaaEhdotukset ? LU.rajaaEhdotukset(tuoreet, LU.TILANNE_MAX_EHDOTUKSET || TILANNE_MAX_EHDOTUKSET) : { nakyvat: tuoreet.slice(0, TILANNE_MAX_EHDOTUKSET), lisaa: Math.max(0, tuoreet.length - TILANNE_MAX_EHDOTUKSET) };
    m.ehdotukset = { nakyvat: raja.nakyvat, lisaa: raja.lisaa };

    /* 7 · talentit + syntymäkvartaalit */
    m.talentit = s.talentit || { n: 0, ehdokkaita: 0, odottaa: 0 }; m.rae = s.rae || null; m.ryhmaN = s.ryhmaN;
    return m;
  }

  /* ════════ CSS (asettelu; komponentit tulevat tm_kt_komponentit.js:stä) ════════ */
  var CSS = [
    '.tt{--kt-serif:var(--font-serif);--amber-dim:color-mix(in srgb,var(--amber) 16%,transparent);--tt-teal-dim:color-mix(in srgb,var(--teal) 16%,transparent);container-type:inline-size;container-name:tt;display:grid;gap:14px;font-family:var(--font-sans);color:var(--ink);min-width:0}',
    '.tt>*{min-width:0}.tt .kt-eb.row2{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.tt .legend{display:flex;gap:6px;flex-wrap:wrap;text-transform:none;letter-spacing:0}.tt .chip{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-sans);font-size:12px;font-weight:600;padding:3px 9px;border-radius:3px;border:1px solid var(--border);color:var(--ink3);white-space:normal;text-transform:none;letter-spacing:0}.tt .chip.w{color:var(--amber);background:var(--amber-dim);border-color:transparent}',
    /* 1 · tilannekortit */
    '.tt-tk{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.tt-tk .kt-ev{gap:2px}.tt-k{font-size:11.5px;color:var(--ink3)}.tt-v{font-family:var(--kt-serif);font-size:30px;line-height:1;font-weight:500}.tt-v.w{color:var(--amber)}.tt-s{font-size:12px;color:var(--ink3)}',
    /* 2 · aikajana */
    '.tt-ajw{overflow-x:auto;border:1px solid var(--border);border-radius:6px;margin-top:6px;background:var(--bg)}',
    '.tt-aj{position:relative;display:grid;grid-template-columns:112px repeat(var(--n),minmax(40px,1fr));min-width:660px;font-size:12px}',
    '.tt-ajh{font-family:var(--font-mono);font-size:11px;color:var(--ink3);text-align:center;padding:6px 0;border-bottom:1px solid var(--border)}.tt-ajh.nyt{color:var(--amber);font-weight:600}',
    '.tt-ajn{padding:0 10px;display:flex;align-items:center;height:34px;border-top:1px solid var(--border);white-space:nowrap}.tt-ajn button{background:none;border:0;padding:0;font:inherit;font-weight:600;font-size:12.5px;color:var(--ink);cursor:pointer}',
    '.tt-ajr{position:relative;height:34px;border-top:1px solid var(--border)}',
    '.tt-ajb{position:absolute;top:7px;height:20px;border-radius:3px;overflow:hidden;display:flex;align-items:center;padding:0 6px;box-sizing:border-box;background:var(--tt-teal-dim);border:1px solid var(--teal-brd)}.tt-ajb span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11.5px}',
    '.tt-ajk{position:absolute;top:9px;transform:translateX(-50%);font-style:normal;color:var(--teal);font-size:12px}',
    '.tt-ajm{position:absolute;top:0;bottom:0;left:calc(112px + (100% - 112px) * (var(--c) + .5) / var(--n));border-left:1.5px solid var(--amber);pointer-events:none}.tt-ajm.tp{border-left:1.5px dashed var(--ink3)}',
    '.tt-ajt{position:absolute;top:28px;bottom:0;left:calc(112px + (100% - 112px) * var(--s) / var(--n));width:calc((100% - 112px) * var(--w) / var(--n));background:var(--ink3);opacity:.25;pointer-events:none}',
    /* rivilistat (poikkeamat, ehdotukset) */
    '.tt-g2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.tt-mini{font-size:12.5px;color:var(--ink3);background:none;border:0;padding:0;text-align:left;cursor:pointer;font-family:inherit}',
    '.tt-lause{font-size:14.5px;color:var(--ink);line-height:1.45}.tt-det{border:1px solid var(--border);border-radius:6px}.tt-det>summary{cursor:pointer;padding:9px 12px;font-size:13.5px;color:var(--ink2)}.tt-det>div{padding:0 12px 12px}',
    '.tt-tg{font-family:var(--font-mono);font-size:11px;border:1px solid var(--teal-brd);border-radius:3px;padding:1px 7px;color:var(--ink2);background:var(--bg);cursor:pointer}.tt-tg.w{border-color:var(--amber)}.tt-tg.n{border:1px dashed var(--ink3)}',
    '.tt-jrs{display:grid;gap:6px;margin-top:4px}.tt-jr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tt-nimet{display:flex;flex-wrap:wrap;gap:4px}',
    '.tt-lnk{background:none;border:0;padding:0;font:inherit;color:var(--teal);font-weight:600;cursor:pointer}.tt-cta{margin-left:auto;font-size:12.5px;color:var(--teal);font-weight:600;background:var(--bg);border:0;padding:2px 6px;border-radius:3px;cursor:pointer;font-family:inherit}',
    '.tt-ajn.ilman{height:auto;min-height:44px;flex-direction:column;align-items:flex-start;justify-content:center;gap:0;padding:6px 10px;font-weight:500;color:var(--ink2)}.tt-ajn.ilman small{font-family:var(--font-mono);font-size:10.5px;color:var(--ink3)}',
    '.tt-ajr.ilman{height:auto;min-height:44px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 10px;background:repeating-linear-gradient(135deg,transparent 0 9px,var(--ov-1) 9px 10px)}',
    '.tt-ajb.w{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 16%,transparent)}',
    '.tt-mj,.tt-ilmankortti{display:none}.tt-mjr{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;align-items:center;margin-top:6px}.tt-mjb{border:1px solid var(--teal-brd);background:var(--tt-teal-dim);border-radius:3px;padding:2px 8px;font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tt-mjb.w{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 16%,transparent)}',
    '.tt-ilmankortti{background:repeating-linear-gradient(135deg,transparent 0 9px,var(--ov-1) 9px 10px)}.tt-tgs{display:flex;flex-wrap:wrap;gap:4px}',
    '@container tt (max-width:720px){.tt-ajw{display:none}.tt-mj{display:block}.tt-ilmankortti{display:grid}.tt-tk{grid-template-columns:repeat(2,minmax(0,1fr))}.tt-g2{grid-template-columns:minmax(0,1fr)}.tt .legend{display:none}.tt .kt-eb.row2{display:block}}'
  ].join('\n');

  /* ════════ HTML ════════ */
  var G = { ok: '●', w: '▲', err: '■', n: '○' };
  function tmTilanneHTML(m, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {}, h = '';
    var call = function (f) { var a = Array.prototype.slice.call(arguments, 1).map(function (x) { return "'" + String(x).replace(/['"\\<>&\n]/g, '') + "'"; }); return f ? ' onclick="' + esc(f) + '(' + a.join(',') + ')"' : ''; };
    var KT = _req('TM_KT_KOMPONENTIT', './tm_kt_komponentit.js') || {}, auki = opts.auki || {};
    var tagit = function (L, tila, avain) { return _tagit(L, tila, avain, { esc: esc, call: call, fn: fn, auki: auki }); };
    var nauha = function (iso) { return KT.tmKtNauhaHTML ? KT.tmKtNauhaHTML(m.nauha, { iso: iso, t: t, esc: esc }) : ''; };
    var kpi = function (k, v, sub, l) { return '<div class="kt-ev"><span class="tt-k">' + esc(k) + '</span><span class="tt-v' + (l ? ' ' + l : '') + '">' + esc(v) + '</span><span class="tt-s">' + esc(sub) + '</span></div>'; };
    var K = m.kortit;

    /* 1 · neljä tilannekorttia (D125-portti: katselmus-prosentti vain kun jaksoja on päättynyt) */
    h += '<div class="tt-tk">'
      + '<div class="kt-ev"><span class="tt-k">' + esc(t('Jaksolla')) + '</span><span class="tt-v' + (K.jaksolla.a * 2 < K.jaksolla.b ? ' w' : '') + '">' + esc(K.jaksolla.a + '/' + K.jaksolla.b) + '</span>' + nauha(false)
        + '<span class="tt-s">' + (K.jaksolla.ilman.length ? esc(_fill(t('{n} ilman jaksoa'), { n: K.jaksolla.ilman.length })) + ' · <button type="button" class="tt-lnk"' + call(fn.auki, 'n') + '>' + esc(t('näytä')) + '</button>' : esc(t('kaikilla jakso'))) + '</span></div>'
      + kpi(t('Katselmukset ajallaan'), K.katselmus ? K.katselmus.pros + ' %' : '—', K.katselmus ? _fill(t('{n} jaksoa päättynyt tällä kaudella'), { n: K.katselmus.jaksoja }) : t('ei vielä päättyneitä jaksoja'))
      + kpi(t('Mitattu tällä kaudella'), K.mitattu.a + '/' + K.mitattu.b, K.mitattu.testijakso ? _fill(t('joukkuetta · testijakso vk {a}–{b}'), K.mitattu.testijakso) : t('joukkuetta'), K.mitattu.heikko ? 'w' : '')
      + kpi(t('IDP odottaa'), String(K.idp), t('sitoumus vahvistamatta')) + '</div>';

    /* 2 · kauden aikajana */
    var aj = m.aikajana, pos = function (a) { return 'calc(' + (a - aj.A) + ' * 100% / ' + aj.n + ')'; };
    var leg = '<span class="chip">◆ ' + esc(t('katselmus')) + '</span><span class="chip w">│ ' + esc(t('nyt')) + '</span>'
      + (aj.palaveri ? '<span class="chip">┆ ' + esc(_fill(t('jaksopalaveri {pvm}'), { pvm: aj.palaveri.pvm })) + '</span>' : '')
      + (aj.testijakso ? '<span class="chip">▒ ' + esc(_fill(t('testijakso vk {a}–{b}'), aj.testijakso)) + '</span>' : '');
    var kaista = aj.kaista, cta = aj.vahan ? t('Aloita jaksot →') : t('Aloita jakso →'), ctaFn = '<button type="button" class="tt-cta"' + call(fn.aloitaJaksot) + '>' + esc(cta) + '</button>';
    leg += kaista.length ? '<span class="chip n">▨ ' + esc(t('ei jaksoa')) + '</span>' : '';
    h += '<div><div class="kt-eb row2"><span>' + esc(t('Kausi · jaksot aikajanalla')) + '</span><span class="legend">' + leg + '</span></div>'
      + '<div class="tt-ajw"><div class="tt-aj" style="--n:' + aj.n + '">' + (aj.rivit.length ? '<div class="tt-ajh"></div>' + aj.otsikot.map(function (o) { return '<div class="tt-ajh' + (o.idx === aj.nyt ? ' nyt' : '') + '">' + o.nro + '</div>'; }).join('') : '')
      + aj.rivit.map(function (r) {
        var b = '', j = r.jakso;
        if (j) { var s0 = Math.max(j.a0, aj.A), e0 = Math.min(j.a1, aj.B); if (!(e0 < aj.A || s0 > aj.B)) b += '<div class="tt-ajb' + (r.tila === 'w' ? ' w' : '') + '" style="left:' + pos(s0) + ';width:calc(' + (e0 - s0 + 1) + ' * 100% / ' + aj.n + ')"><span>' + esc(j.nimi || t('Jakso käynnissä')) + '</span></div>';
          if (j.a1 >= aj.A && j.a1 <= aj.B) b += '<i class="tt-ajk" title="' + esc(t('katselmus')) + '" style="left:calc(' + (j.a1 - aj.A + .5) + ' * 100% / ' + aj.n + ')">◆</i>'; }
        return '<div class="tt-ajn"><button type="button"' + call(fn.joukkue, r.nimi) + '>' + esc(r.tunniste) + '</button></div><div class="tt-ajr" style="grid-column:2 / span ' + aj.n + '">' + b + '</div>';
      }).join('')
      + (aj.rivit.length ? '<div class="tt-ajm" style="--c:' + (aj.nyt - aj.A) + ';--n:' + aj.n + '"></div>'
        + (aj.palaveri && aj.palaveri.idx >= aj.A && aj.palaveri.idx <= aj.B ? '<div class="tt-ajm tp" style="--c:' + (aj.palaveri.idx - aj.A) + ';--n:' + aj.n + '"></div>' : '')
        + (aj.testijakso ? '<div class="tt-ajt" style="--s:' + (Math.max(aj.testijakso.a0, aj.A) - aj.A) + ';--w:' + (Math.min(aj.testijakso.a1, aj.B) - Math.max(aj.testijakso.a0, aj.A) + 1) + ';--n:' + aj.n + '"></div>' : '') : '')
      + (kaista.length ? '<div class="tt-ajn ilman"><span>' + esc(t('Ei jaksoa')) + '</span><small>' + esc(_fill(t('{n} joukkuetta'), { n: kaista.length })) + '</small></div><div class="tt-ajr ilman" style="grid-column:2 / span ' + aj.n + '">' + tagit(kaista, 'n', 'kaista') + ctaFn + '</div>' : '')
      + '</div></div>'
      /* mobiili (≤ 720 px): aikajana tiivistyy riveiksi, "ei jaksoa" -kaista omaksi kortikseen (mockup 29) */
      + '<div class="tt-mj"><span class="kt-eb">' + esc(_fill(t('Jaksot · vk {vk}'), { vk: viikkoNro(aj.nyt) })) + '</span>' + aj.rivit.map(function (r) { var j = r.jakso; return '<div class="tt-mjr"><b>' + esc(r.tunniste) + '</b><div class="tt-mjb' + (r.tila === 'w' ? ' w' : '') + '">' + esc(((j && j.nimi) || t('Jakso käynnissä')) + (j ? ' · ' + _fill(t('vk {a}/{b}'), { a: Math.min(Math.max(aj.nyt - j.a0 + 1, 1), j.N), b: j.N }) : '')) + '</div></div>'; }).join('') + '</div>'
      + (kaista.length ? '<div class="kt-ev tt-ilmankortti"><span class="kt-eb">' + esc(_fill(t('Ei jaksoa · {n} joukkuetta'), { n: kaista.length })) + '</span><div class="tt-tgs">' + tagit(kaista, 'n', 'kaista_m') + '</div><button type="button" class="kt-btn"' + call(fn.aloitaJaksot) + '>' + esc(t('Aloita jaksot')) + '</button></div>' : '')
      + '</div>';

    /* 3 · jaksopalaveri */
    var P = m.palaveri, ryh = function (L, tila, avain, nimi) { return L.length ? '<div class="tt-jr"><span class="chip ' + tila + '">' + esc(_fill(t(nimi), { n: L.length })) + '</span><span class="tt-nimet">' + tagit(L, tila, avain) + '</span></div>' : ''; };
    h += '<div class="kt-sig" id="tilannePalaveri"><span class="kt-eb">' + esc(P.ms ? _fill(t('Jaksopalaveri · {pvm}'), { pvm: _pvViikonpv(P.ms) }) : t('Jaksopalaveri')) + '</span>'
      + '<div class="kt-sig-h">' + esc(P.vahan ? _fill(t('Jaksot puuttuvat {n} joukkueelta.'), { n: P.n.length }) : _fill(t('{a}/{b} joukkuetta valmiina.'), { a: P.valmiit, b: P.yht })) + '</div>'
      + nauha(true) + '<div class="tt-jrs">' + ryh(P.ok, 'ok', 'ok', 'Valmiina {n}') + ryh(P.w, 'w', 'w', 'Kesken {n}') + ryh(P.n, 'n', 'n', 'Ei jaksoa {n}') + '</div>'
      + '<div class="row">' + (P.vahan ? '<button class="kt-btn" type="button"' + call(fn.aloitaJaksot) + '>' + esc(_fill(t('Aloita jaksot {n} joukkueelle'), { n: P.n.length })) + '</button><button class="kt-gb" type="button"' + call(fn.esityslista) + '>' + esc(t('Avaa esityslista')) + '</button>'
        : '<button class="kt-btn" type="button"' + call(fn.esityslista) + '>' + esc(t('Avaa esityslista')) + '</button>') + '</div>'
      + '<div class="kt-sig-second">' + esc(P.vahan ? t('Valitse joukkue tunnisteesta ja aloita jakso joukkueen näkymässä. Valmentaja vahvistaa teeman omalle joukkueelleen.') : t('Esityslista kokoaa jaksojen tulokset, poikkeamat, ehdotukset ja onnistumiset.')) + '</div></div>';
    h += '<div id="tilanneEsityslista"></div>';

    /* 4 · poikkeamat joukkueittain */
    var pr = m.poikkeamat, rivi = function (x) {
      var txt = x.estetty ? _fill(t('{n}/{yht} kypsyysvaihe ei salli tulkintaa'), { n: x.estetty.n, yht: x.estetty.yht }) : (x.n > 1 && (x.tyyppi === 'alle_normin' || x.tyyppi === 'profiilipoikkeama') && x.osa === 'Fyysinen' ? _fill(t('H-H alle normin {n} osa-alueella'), { n: x.n }) : x.teksti);
      var meta = [];
      if (x.mitattuPvm) meta.push(x.mitattuKk != null && x.mitattuKk >= 2 ? _fill(t('mitattu {kk} kk sitten'), { kk: x.mitattuKk }) : _fill(t('mitattu {pvm}'), { pvm: _pv(x.mitattuMs) }));
      if (x.vanha && m.mittaus.testijakso) meta.push(_fill(t('odottaa testiä vk {vk}'), { vk: m.mittaus.testijakso.a }));
      if (x.osa === 'Fyysinen' && !x.estetty) meta.push(t('PHV huomioitu (§28)'));
      if (x.alaraja) meta.push(t('arvo 1,0 = asteikon alaraja — tarkista mittaus'));
      var act = x.estetty ? '' : '<button class="kt-gb" type="button"' + call(fn.joukkue, x.joukkue) + '>' + esc(x.osa === 'Tekniikka' ? t('Ehdota teemaa') : t('Ehdota jaksoa')) + '</button>';
      return '<div class="kt-vr"><span class="kt-dot ' + x.sev + '">' + G[x.sev] + '</span><span class="kt-vt"><b>' + esc(x.joukkue) + '</b> <span class="kt-tag">' + esc(t(x.osa)) + '</span> ' + esc(txt) + '<span class="kt-vm">' + esc(meta.join(' · ')) + '</span></span>' + (act || '<span></span>') + '</div>';
    };
    h += '<div id="tilannePoikkeamat"><span class="kt-eb">' + esc(t('Poikkeamat · yksi rivi per joukkue ja osa-alue')) + '</span>';
    if (!pr.length) h += '<div class="kt-note" style="margin-top:6px">' + esc(t('Ei poikkeamia — kaikki joukkueet odotetulla tasolla.')) + '</div>';
    else {
      h += '<div class="kt-vl">' + pr.slice(0, POIKKEAMA_NAKY).map(rivi).join('') + '</div>';
      if (pr.length > POIKKEAMA_NAKY) h += '<details class="tt-det" style="margin-top:6px"><summary>+' + (pr.length - POIKKEAMA_NAKY) + ' ' + esc(t('muuta poikkeamaa')) + '</summary><div><div class="kt-vl">' + pr.slice(POIKKEAMA_NAKY).map(rivi).join('') + '</div></div></details>';
    }
    if (m.d1 && !m.d1.riittava && m.d1.b > 0) h +=   /* ei "0/0" kun pelaajia ei ole vielä ladattu */ '<div class="kt-note" style="margin-top:8px">' + esc(_fill(t('Seuratason fyysisiä lukuja ei näytetä: D1 mitattu {a}/{b} joukkueelta. Luku palaa, kun kattavuus on vähintään {z}/{b}.'), { a: m.d1.a, b: m.d1.b, z: m.d1.raja })) + '</div>';
    h += '</div>';

    /* 5 · mittaustilanne */
    var M = m.mittaus;
    h += '<div class="kt-sig n" id="tilanneMittaus"><span class="kt-eb">' + esc(t('Mittaustilanne')) + '</span>'
      + '<div class="kt-sig-h">' + esc(M.vanhoja ? _fill(t('{n}/{y} joukkueen mittaus on yli 6 kk vanha'), { n: M.vanhoja, y: M.yht }) : t('Kaikkien joukkueiden mittaus on alle 6 kk vanha')) + '</div>'
      + '<div class="kt-sig-why">' + esc(t('Joukkuekohtainen mittaus avautuu joukkueen Kausi-välilehdeltä.')) + '</div>'
      + (M.vanhoja ? '<div class="row"><button class="kt-btn" type="button"' + call(fn.testijakso) + '>' + esc(M.testijakso ? _fill(t('Suunnittele testijakso vk {a}–{b}'), { a: M.testijakso.a, b: M.testijakso.b }) : t('Suunnittele testijakso')) + '</button></div>' : '') + '</div>';

    /* 6 · ehdotukset (≤ 5) */
    var E = m.ehdotukset;
    h += '<div id="tilanneEhdotukset"><span class="kt-eb">' + esc(t('Ehdotukset · TalentMaster ehdottaa, VP päättää')) + '</span>';
    if (!E.nakyvat.length) h += '<div class="kt-note" style="margin-top:6px">' + esc(t('Ei avoimia toimenpiteitä — hyvä työ.')) + '</div>';
    else h += '<div class="kt-vl">' + E.nakyvat.map(function (e) {
      var ids = (e.ids || []).join(',');
      return '<div class="kt-vr"><span class="kt-dot ok">●</span><span class="kt-vt"><span class="kt-mono">' + esc(t('ehdotus')) + '</span> <b>' + esc(opts.teksti ? opts.teksti(e.teksti) : e.teksti) + '</b>' + (e.meta ? '<span class="kt-vm">' + esc(e.meta) + '</span>' : '') + '</span>'
        + '<span class="kt-acts"><button class="kt-gb p" type="button"' + call(fn.hyvaksy, ids) + '>' + esc(t('Hyväksy')) + '</button><button class="kt-gb" type="button"' + call(fn.muokkaa, ids) + '>' + esc(t('Muokkaa')) + '</button><button class="kt-gb" type="button"' + call(fn.hylkaa, ids) + '>' + esc(t('Hylkää')) + '</button></span></div>'; }).join('') + '</div>';
    if (E.lisaa > 0) h += '<div class="kt-vm" style="margin-top:6px">+' + E.lisaa + ' ' + esc(t('muuta ehdotusta')) + '</div>';
    h += '</div>';

    /* 7 · talentit + syntymäkvartaalit */
    var T = m.talentit, R = m.rae, pct = R && R.riittava && R.n ? ['Q1', 'Q2', 'Q3', 'Q4'].map(function (q) { return q + ' ' + R.pct[q] + ' %'; }).join(' · ') + '.' : null;
    h += '<div class="tt-g2" id="tilanneTalentit"><div class="kt-ev"><div class="kt-ev-t"><span class="kt-ev-h">' + esc(t('Talentit')) + '</span><span class="kt-ev-age">' + esc(_fill(t('{n} · {m} ehdokasta'), { n: T.n, m: T.ehdokkaita })) + '</span></div>'
      + '<div class="tt-lause">' + esc(t('Hidden Gem -ehdokkaat näkyvät vasta, kun D1 on mitattu (§28).')) + (T.odottaa ? ' ' + esc(_fill(t('{n} odottaa mittausta.'), { n: T.odottaa })) : '') + '</div>'
      + '<button class="tt-mini" type="button"' + call(fn.ryhmat) + '>' + esc(m.ryhmaN != null ? _fill(t('Talenttiryhmä · {n} jäsentä →'), { n: m.ryhmaN }) : t('Avaa talentit →')) + '</button></div>'
      + '<div class="kt-ev"><div class="kt-ev-t"><span class="kt-ev-h">' + esc(t('Syntymäkvartaalit')) + '</span><span class="kt-ev-age">' + (R ? esc(_fill(t('{n}/{yht} syntymäaikaa'), { n: R.n, yht: R.yht })) : '') + '</span></div>'
      + '<div class="tt-lause">' + esc(pct || (R ? _fill(t('mitattu {n}/{yht} · syntymäaikoja puuttuu'), { n: R.n, yht: R.yht }) : t('Syntymäkvartaali-data täyttyy kun huoltajat rekisteröivät pelaajat.'))) + '</div>'
      + '<button class="tt-mini" type="button"' + call(fn.rae) + '>' + esc(t('Avaa RAE →')) + '</button></div></div>';

    return '<div class="tt">' + h + '</div>';
  }

  /* Jaksopalaverin esityslista (D123/D135): jaksojen tulokset, poikkeamat, ehdotukset, onnistumiset. Raportointi-työtilan sisältö (MDT, harjoittelun laatu, Head of Talent) on esityslistan liitteenä (#tilanneRaportitDet). */
  function tmTilanneEsityslistaHTML(m, onnistumiset, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), P = m.palaveri, h = '', rivit = function (a) { return '<div class="kt-vl">' + a.join('') + '</div>'; };
    var rv = function (dot, txt, meta) { return '<div class="kt-vr"><span class="kt-dot ' + dot + '">' + G[dot] + '</span><span class="kt-vt">' + esc(txt) + (meta ? '<span class="kt-vm">' + esc(meta) + '</span>' : '') + '</span><span></span></div>'; };
    h += '<span class="kt-eb">' + esc(P.ms ? _fill(t('Esityslista · {pvm}'), { pvm: _pvViikonpv(P.ms) }) : t('Esityslista')) + '</span>';
    var fnE = opts.fn || {}, callE = function (f) { var x = Array.prototype.slice.call(arguments, 1).map(function (y) { return "'" + String(y).replace(/['"\\<>&\n]/g, '') + "'"; }); return f ? ' onclick="' + esc(f) + '(' + x.join(',') + ')"' : ''; };
    var rt = function (L, tila, avain, nimi) { return L.length ? '<div class="tt-jr"><span class="chip ' + tila + '">' + esc(_fill(t(nimi), { n: L.length })) + '</span><span class="tt-nimet">' + _tagit(L, tila, avain, { esc: esc, call: callE, fn: fnE, auki: opts.auki }) + '</span></div>' : ''; };
    h += '<div><div class="kt-mono">1 · ' + esc(t('Jaksot ja katselmukset')) + '</div>' + ((m.ryhmat.w.length || m.ryhmat.n.length) ? '<div class="kt-vl" style="padding:8px 12px;gap:6px">' + rt(m.ryhmat.w, 'w', 'e_w', 'Kesken {n}') + rt(m.ryhmat.n, 'n', 'e_n', 'Ei jaksoa {n}') + '</div>' : rivit([rv('ok', t('Kaikki katselmukset tehty.'))])) + '</div>';
    h += '<div><div class="kt-mono">2 · ' + esc(t('Poikkeamat')) + '</div>' + rivit(m.poikkeamat.length ? m.poikkeamat.slice(0, 3).map(function (x) { return rv(x.sev, x.joukkue + ' · ' + t(x.osa), x.estetty ? '' : x.teksti); }) : [rv('ok', t('Ei poikkeamia — kaikki joukkueet odotetulla tasolla.'))]) + '</div>';
    h += '<div><div class="kt-mono">3 · ' + esc(t('Ehdotukset')) + '</div>' + rivit(m.ehdotukset.nakyvat.length ? m.ehdotukset.nakyvat.map(function (e) { return rv('ok', opts.teksti ? opts.teksti(e.teksti) : e.teksti); }) : [rv('n', t('Ei avoimia toimenpiteitä — hyvä työ.'))]) + '</div>';
    h += '<div><div class="kt-mono">4 · ' + esc(t('Onnistumiset')) + '</div>' + rivit((onnistumiset || []).length ? onnistumiset.map(function (x) { return rv('ok', x); }) : [rv('n', t('Ei vielä kirjattuja onnistumisia.'))]) + '</div>';
    return h;
  }

  var API = { CSS: CSS, viikkoIdx: viikkoIdx, viikkoNro: viikkoNro, tmTilanneSyote: tmTilanneSyote, tmTilanneMalli: tmTilanneMalli, tmTilanneHTML: tmTilanneHTML, tmTilanneEsityslistaHTML: tmTilanneEsityslistaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VP_TILANNE = API;
})(typeof window !== 'undefined' ? window : null);
