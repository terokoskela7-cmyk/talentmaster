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
  var DAY = 86400000, KATSELMUS_VK_ENNEN = 4, AJ_ENNEN = 4, AJ_YHT = 14, MITTAUS_VANHA_KK = 6, POIKKEAMA_NAKY = 6, TILANNE_MAX_EHDOTUKSET = 3, HUOMIOT_NAKY = 5, JAKSO_RIVEJA = 5, MITTAUS_TASOTON_KK = 12;   /* D148/D149: huomioita 5 + "näytä kaikki", ehdotuksia 3; D141: yli 12 kk vanha mittaus ei ole tasoväite */

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
  var _kieli = 'fi', LOC = { fi: 'fi-FI', sv: 'sv-FI', en: 'en-GB' };   // viikonpäivät ym. valitusta kielestä (opts.kieli)
  function _pvmHki(ms, o) { try { return new Intl.DateTimeFormat(LOC[_kieli] || 'fi-FI', Object.assign({ timeZone: 'Europe/Helsinki' }, o)).format(new Date(ms)); } catch (e) { return ''; } }
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
      palaveri: pal ? { ms: _ms(pal.alkaa), id: pal.id || null } : null, poikkeamat: flat, laskettuMs: env.laskettuMs != null ? env.laskettuMs : null, ehdotukset: env.ehdotukset || [], idpN: env.idpN != null ? env.idpN : 0,
      talentit: { n: tal, ehdokkaita: gem.ehdokkaat, odottaa: gem.odottaa }, rae: rae, d1: d1, ryhmaN: env.ryhmaN != null ? env.ryhmaN : null };
  }

  /* ════════ MALLI ════════ */
  /* D144: klikattavat lyhyet tunnisteet; enintään kuusi + "+N" (klikkaus avaa koko ryhmän; o.auki[avain]) — sama sääntö kaikkiin "kesken"-listoihin */
  function _tagit(L, tila, avain, o) {
    var ala = String(avain).replace(/_m$/, ''), max = o.auki && o.auki[ala] ? 999 : (avain === 'kaista' ? 10 : 6), nayt = L.slice(0, max)   /* mockup 30: aikajanan kaistalla 10 tunnistetta, muualla 6 */, loput = L.length - nayt.length;
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

  /* ── D148: huomiot selkokielellä. Asia (kind) = tekniikka · kärkipelaajat · fyysiset · alaraja · kehitys · vanha mittaus (D141: yli 12 kk ei ole tasoväite).
     RYHMITTELY (PR C-korjaus): sama asia vähintään kolmella joukkueella → YKSI rivi "Tekniikka alle ikätason · 5 joukkuetta" (tunnisteet D144:llä, rivi avaa listan joukkueista);
     kahden joukkueen asiat jäävät joukkuekohtaisiksi riveiksi. Joukkuerivin tila = asioiden nimet ("tekniikka · kärkipelaajat"), ei "2 asiaa". ── */
  var HUOMIO_RYHMA_MIN = 3, KIND_JARJ = { tekniikka: 0, karki: 1, fyysinen: 2, alaraja: 3, kehitys: 4, vanha_tekniikka: 5, vanha_fyysinen: 6, vanha_muu: 7 };
  function _huomiot(rivit, nimet, nyt) {
    var ryh = {}, jarj = [];
    (rivit || []).forEach(function (x) { if (!ryh[x.joukkue]) { ryh[x.joukkue] = []; jarj.push(x.joukkue); } ryh[x.joukkue].push(x); });
    var tiimit = jarj.map(function (nimi) {
      var items = ryh[nimi], vanhat = items.filter(function (x) { return x.mitattuKk != null && x.mitattuKk >= MITTAUS_TASOTON_KK; }), tuoreet = items.filter(function (x) { return !(x.mitattuKk != null && x.mitattuKk >= MITTAUS_TASOTON_KK); }), aktiiviset = tuoreet.filter(function (x) { return !x.estetty; });
      var tunniste = lyhytTunniste(nimi, nimet), uusin = items.reduce(function (a, x) { return x.mitattuMs != null && (a == null || x.mitattuMs > a) ? x.mitattuMs : a; }, null), vuosi = uusin != null ? new Date(uusin).getUTCFullYear() : null, kinds = [];
      if (!aktiiviset.length) {
        if (!vanhat.length) return null;   // kaikki kypsyysvahdin estämiä → ei huomiota (§28)
        kinds.push('vanha_' + (vanhat[0].osa === 'Tekniikka' ? 'tekniikka' : vanhat[0].osa === 'Fyysinen' ? 'fyysinen' : 'muu'));
        return { joukkue: nimi, tunniste: tunniste, kinds: kinds, vuosi: vuosi, mitattuMs: uusin, kk: null, phv: false, w: false };
      }
      var osat = {}; aktiiviset.forEach(function (x) { osat[x.osa] = x; });
      var alaraja = aktiiviset.some(function (x) { return x.alaraja; });
      if (osat.Tekniikka) kinds.push('tekniikka'); if (osat.Talenttiydin) kinds.push('karki'); if (osat.Fyysinen && !alaraja) kinds.push('fyysinen'); if (alaraja) kinds.push('alaraja'); if (osat.Kehitys) kinds.push('kehitys');
      return { joukkue: nimi, tunniste: tunniste, kinds: kinds, vuosi: vuosi, mitattuMs: uusin, kk: uusin != null ? Math.floor((nyt - uusin) / (30.44 * DAY)) : null, phv: !!osat.Fyysinen, w: aktiiviset.some(function (x) { return x.sev === 'w'; }) };
    }).filter(Boolean);
    /* ryhmät: asia ≥ 3 joukkueella */
    var laskuri = {}; tiimit.forEach(function (j) { j.kinds.forEach(function (k) { (laskuri[k] = laskuri[k] || []).push(j); }); });
    var ryhmat = Object.keys(laskuri).filter(function (k) { return laskuri[k].length >= HUOMIO_RYHMA_MIN; }).map(function (k) {
      var L = laskuri[k].slice().sort(function (p, q) { return nimet.indexOf(p.joukkue) - nimet.indexOf(q.joukkue); }); L.forEach(function (j) { j.kinds = j.kinds.filter(function (x) { return x !== k; }); });
      return { tyyppi: 'ryhma', kind: k, n: L.length, w: L.some(function (j) { return j.w; }), jarj: L.some(function (j) { return j.w; }) ? 1 : 2, joukkueet: L.map(function (j) { return { nimi: j.joukkue, tunniste: j.tunniste, kk: j.kk, mitattuMs: j.mitattuMs, vuosi: j.vuosi }; }) };
    });
    var rivit2 = tiimit.filter(function (j) { return j.kinds.length; }).map(function (j) { return { tyyppi: 'joukkue', joukkue: j.joukkue, tunniste: j.tunniste, kinds: j.kinds, vuosi: j.vuosi, mitattuMs: j.mitattuMs, kk: j.kk, phv: j.phv, n: j.kinds.length, w: j.w && !j.kinds.every(function (k) { return /^vanha_/.test(k); }), jarj: j.kinds.every(function (k) { return /^vanha_/.test(k); }) ? 3 : (j.w ? 1 : 2) }; });
    var ut = ryhmat.concat(rivit2);
    ut.sort(function (a, b) { return (a.jarj - b.jarj) || ((b.n || 0) - (a.n || 0)) || ((KIND_JARJ[(a.kind || a.kinds[0])] || 0) - (KIND_JARJ[(b.kind || b.kinds[0])] || 0)); });
    return ut;
  }
  /* D149: ehdotus = lause + tunnisteet. Otsikko teonsanalla, perustelu yhdellä rivillä, joukkueet uniikkeina tunnisteina (D144). */
  var EH_AIHE = { tki_alhainen: ['Tekniikkaharjoittelua', 'Useilla pelaajilla tekniikka alle pronssitason.'], tki_lahella_merkkia: ['Omatoimiharjoittelua', 'Pelaajia lähellä pronssia. Merkki on saavutettavissa.'],
    hh_taso_alhainen: ['Yksilöllinen ohjelma', 'Pelaajia alle Eerikkilä-tason.'], suunta_lasku: ['Kuormituksen tarkistus', 'Taso on laskenut. Tarkista kuormitus.'],
    flei_kartoitus_puuttuu: ['Harjoitettavuuskartoitus', 'Kehon valmius on kartoittamatta. Varaa kartoituspäivä.'], tkk_puuttuu: ['Tekniikkamittaus', 'Tekniikkamittaukset puuttuvat. Suunnittele tekniikkakilpailu.'] };
  function _ehdotus(e, nimet) {
    var L = (e.joukkueet || []).filter(Boolean), uniq = [], nahty = {};
    L.forEach(function (n) { var tn = lyhytTunniste(n, nimet); if (!nahty[tn]) { nahty[tn] = 1; uniq.push({ nimi: n, tunniste: tn }); } });
    var a = EH_AIHE[e.signaali] || ['Toimenpide', 'Seurannan perusteella tämä asia kannattaa käsitellä.'];
    return { ids: e.ids || [], signaali: e.signaali || null, aihe: a[0], perustelu: a[1], joukkueita: uniq.length, tunnisteet: uniq, teksti: e.teksti || '' };
  }
  /* D170: Rytmi-vaiheen signaali = jaksopalaverin valmius ("Kaksi katselmusta auki ennen palaveria" → Avaa esityslista) */
  function _signaali(m, J, nyt) {
    var auki = J.filter(function (j) { return j.tila === 'w'; }), pal = m.palaveri && m.palaveri.ms != null ? m.palaveri : null;
    if (!auki.length && !pal) return null;
    var pv = pal ? Math.max(0, Math.ceil((pal.ms - nyt) / DAY)) : null, aikaisin = auki.reduce(function (a, j) { return j.jakso && j.jakso.a1 != null && (a == null || j.jakso.a1 < a) ? j.jakso.a1 : a; }, null);
    return { w: auki.length > 0, ms: pal ? pal.ms : null, pv: pv, auki: auki.map(function (j) { return j.tunniste; }), n: auki.length, vk: aikaisin != null ? viikkoNro(aikaisin) : null };
  }

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
      katselmus: kk.perusta > 0 ? { pros: Math.round(100 * kk.ajallaan / kk.perusta), jaksoja: kk.jaksoja, ajallaan: kk.ajallaan, perusta: kk.perusta } : null,
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
    var raja = LU.rajaaEhdotukset ? LU.rajaaEhdotukset(tuoreet, TILANNE_MAX_EHDOTUKSET) : { nakyvat: tuoreet.slice(0, TILANNE_MAX_EHDOTUKSET), lisaa: Math.max(0, tuoreet.length - TILANNE_MAX_EHDOTUKSET) };
    m.ehdotukset = { nakyvat: raja.nakyvat, lisaa: raja.lisaa, yht: tuoreet.length };

    /* 7 · talentit + syntymäkvartaalit */
    m.talentit = s.talentit || { n: 0, ehdokkaita: 0, odottaa: 0 }; m.rae = s.rae || null; m.ryhmaN = s.ryhmaN;

    /* ── v2 (PR C, mockup 30 + D147–D152, D170) ── */
    m.laskettuMs = s.laskettuMs != null ? s.laskettuMs : null; m.nytIdx = nytIdx; m.kausi = s.kausiAlkuMs != null ? new Date(s.kausiAlkuMs).getUTCFullYear() : new Date(nyt).getUTCFullYear();
    var jaksollisia = m.ryhmat.ok.length + m.ryhmat.w.length;
    m.vaihe = y === 0 || jaksollisia * 3 < y ? 'kaynnistys' : 'rytmi';   // sama sääntö kuin Kodissa (D164)
    m.huomiot = _huomiot(m.poikkeamat, nimet, nyt);
    m.signaali = m.vaihe === 'rytmi' ? _signaali(m, J, nyt) : null;   // D170: Käynnistys-vaiheessa Tilanteessa EI signaalikorttia ("Aloita jaksot" on Kodissa)
    m.ehdotuksetV2 = m.ehdotukset.nakyvat.map(function (e) { return _ehdotus(e, nimet); });
    m.ehdotuksetKaikki = tuoreet.map(function (e) { return _ehdotus(e, nimet); });   // "+N muuta ehdotusta" avaa kaikki paikallaan
    return m;
  }

  /* ════════ CSS (asettelu; komponentit tulevat tm_kt_komponentit.js:stä) ════════ */
  var CSS = [
    '.tt{--kt-serif:var(--font-serif);--amber-dim:color-mix(in srgb,var(--amber) 16%,transparent);--tt-teal-dim:color-mix(in srgb,var(--teal) 16%,transparent);container-type:inline-size;container-name:tt;display:grid;gap:24px;font-family:var(--font-sans);color:var(--ink);min-width:0}',
    '.tt>*{min-width:0}.tt .kt-eb.row2{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.tt .legend{display:flex;gap:6px;flex-wrap:wrap;text-transform:none;letter-spacing:0}.tt .chip{display:inline-flex;align-items:center;gap:6px;font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:600;padding:3px 9px;border-radius:3px;border:1px solid var(--border);color:var(--ink2);white-space:normal;text-transform:none;letter-spacing:0}.tt .chip.w{color:var(--amber);background:var(--amber-dim);border-color:transparent}',
    /* 2 · aikajana */
    '.tt-ajw{overflow-x:auto;border:1px solid var(--border);border-radius:6px;margin-top:6px;background:var(--bg)}',
    '.tt-aj{position:relative;display:grid;grid-template-columns:112px repeat(var(--n),minmax(40px,1fr));min-width:660px;font-size:var(--fs-meta,12.5px)}',
    '.tt-ajh{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2);text-align:center;padding:6px 0;border-bottom:1px solid var(--border)}.tt-ajh.nyt{color:var(--amber);font-weight:600}',
    '.tt-ajn{padding:0 10px;display:flex;align-items:center;height:34px;border-top:1px solid var(--border);white-space:nowrap}.tt-ajn button{background:none;border:0;padding:0;font:inherit;font-weight:600;font-size:var(--fs-meta,12.5px);color:var(--ink);cursor:pointer}',
    '.tt-ajr{position:relative;height:34px;border-top:1px solid var(--border)}',
    '.tt-ajb{position:absolute;top:7px;height:20px;border-radius:3px;overflow:hidden;display:flex;align-items:center;padding:0 6px;box-sizing:border-box;background:var(--tt-teal-dim);border:1px solid var(--teal-brd)}.tt-ajb span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:var(--fs-meta,12.5px)}',
    '.tt-ajk{position:absolute;top:9px;transform:translateX(-50%);font-style:normal;color:var(--teal);font-size:var(--fs-meta,12.5px)}',
    '.tt-ajm{position:absolute;top:0;bottom:0;left:calc(112px + (100% - 112px) * (var(--c) + .5) / var(--n));border-left:1.5px solid var(--amber);pointer-events:none}.tt-ajm.tp{border-left:1.5px dashed var(--ink3)}',
    '.tt-ajt{position:absolute;top:28px;bottom:0;left:calc(112px + (100% - 112px) * var(--s) / var(--n));width:calc((100% - 112px) * var(--w) / var(--n));background:var(--ink3);opacity:.25;pointer-events:none}',
    /* rivilistat (poikkeamat, ehdotukset) */
    '.tt-lause{font-size:var(--fs-body,14px);color:var(--ink2);line-height:1.45;margin:0}.tt-det{border:1px solid var(--border);border-radius:6px}.tt-det>summary{cursor:pointer;padding:9px 12px;font-size:var(--fs-body,14px);color:var(--ink2)}.tt-det>div{padding:0 12px 12px}',
    '.tt-tg{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);border:1px solid var(--teal-brd);border-radius:3px;padding:1px 7px;color:var(--ink2);background:var(--bg);cursor:pointer}.tt-tg.w{border-color:var(--amber)}.tt-tg.n{border:1px dashed var(--ink3)}',
    '.tt-jrs{display:grid;gap:6px;margin-top:4px}.tt-jr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.tt-nimet{display:flex;flex-wrap:wrap;gap:4px}',
    '.tt-lnk{background:none;border:0;padding:0;font:inherit;color:var(--teal);font-weight:600;cursor:pointer}.tt-cta{margin-left:auto;font-size:var(--fs-meta,12.5px);color:var(--teal);font-weight:600;background:var(--bg);border:0;padding:2px 6px;border-radius:3px;cursor:pointer;font-family:inherit}',
    '.tt-ajn.ilman{height:auto;min-height:44px;flex-direction:column;align-items:flex-start;justify-content:center;gap:0;padding:6px 10px;font-weight:500;color:var(--ink2)}.tt-ajn.ilman small{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
    '.tt-ajr.ilman{height:auto;min-height:44px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 10px;background:repeating-linear-gradient(135deg,transparent 0 9px,var(--ov-1) 9px 10px)}',
    '.tt-ajb.w{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 16%,transparent)}',
    '.tt-mj,.tt-ilmankortti{display:none}.tt-mjr{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;align-items:center;margin-top:6px}.tt-mjb{border:1px solid var(--teal-brd);background:var(--tt-teal-dim);border-radius:3px;padding:2px 8px;font-size:var(--fs-meta,12.5px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tt-mjb.w{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 16%,transparent)}',
    '.tt-ilmankortti{background:repeating-linear-gradient(135deg,transparent 0 9px,var(--ov-1) 9px 10px)}.tt-tgs{display:flex;flex-wrap:wrap;gap:4px}',
        /* v2: otsikko, kysymykset, signaali, huomiot, ehdotukset, kolmen kortin rivi */
    '.tt-hd{display:grid;gap:10px}.tt-row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}.tt-age,.tt-m{font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
    '.tt-h1{font-family:var(--font-serif);font-weight:400;font-size:var(--fs-h1,40px);line-height:1.02;margin:0}.tt-lead{font-size:var(--fs-lead,16px);color:var(--ink2);max-width:62ch;margin:0}',
    '.tt .kt-q3.four{grid-template-columns:repeat(4,minmax(0,1fr))}.tt .kt-q-v small{font-family:var(--font-sans);font-size:var(--fs-body,14px);font-weight:400;color:var(--ink2);margin-left:2px}',
    '.tt .kt-sig .row{display:flex;gap:18px;align-items:center;flex-wrap:wrap}.tt-leg{display:flex;gap:16px;flex-wrap:wrap;font-size:var(--fs-meta,12.5px);color:var(--ink2)}.tt-leg span{display:inline-flex;align-items:center;gap:6px}',
    '.tt-leg i{width:14px;height:8px;border-radius:2px;display:inline-block;border:1px dashed var(--ink3)}.tt-leg i.ok{background:var(--teal);border:0}.tt-leg i.w{border:1px solid var(--amber);background:var(--amber-dim)}',
    '.tt-two{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:16px;align-items:start}.tt-col{display:grid;gap:10px;min-width:0}.tt-secth{display:flex;justify-content:space-between;align-items:baseline;gap:10px}',
    '.tt-list{display:grid;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--bg)}',
    '.tt-it{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px;border:0;border-top:1px solid var(--border);background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;width:100%}.tt-it:first-child{border-top:0}.tt-it:hover{background:var(--ov-1)}.tt-it:focus-visible{outline:2px solid var(--teal);outline-offset:-2px}',
    '.tt-j{font-family:var(--font-sans);font-size:var(--fs-lead,16px);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}.tt-tx{display:grid;gap:2px;min-width:0}.tt-a{font-size:var(--fs-body,14px);color:var(--ink)}.tt-st{font-size:var(--fs-meta,12.5px);color:var(--ink2);text-align:right;white-space:nowrap}.tt-st.w{color:var(--amber);font-weight:600}.tt-go{color:var(--ink3);margin-left:8px}',
    '.tt-more{padding:10px 16px;border-top:1px solid var(--border)}.tt-why{font-size:var(--fs-meta,12.5px);color:var(--ink2)}.tt-tgs{display:flex;flex-wrap:wrap;gap:4px}',
    '.tt-eit{display:grid;gap:8px;padding:14px 16px;border-top:1px solid var(--border)}.tt-eit:first-child{border-top:0}.tt-eh2{font-family:var(--font-sans);font-size:var(--fs-lead,16px);font-weight:600;line-height:1.3}',
    '.tt-ryhma{border-top:1px solid var(--border)}.tt-ryhma:first-child{border-top:0}.tt-ryhma>summary{list-style:none;cursor:pointer}.tt-ryhma>summary::-webkit-details-marker{display:none}.tt-ryhma>summary.tt-it{border-top:0}.tt-ryhma[open]>summary .tt-go{transform:rotate(180deg);display:inline-block}.tt-ryhmasis{background:var(--ov-1)}.tt-alit{padding:9px 16px 9px 28px}',
    '.tt-erow{display:flex;align-items:center;gap:14px}.tt-sp{flex:1}.tt-kebab{position:relative}.tt-kebab summary{list-style:none;cursor:pointer;border:1px solid var(--border);border-radius:4px;width:30px;height:30px;display:grid;place-items:center;color:var(--ink2);font-size:var(--fs-lead,16px);line-height:1}.tt-kebab summary::-webkit-details-marker{display:none}',
    '.tt-menu{position:absolute;right:0;bottom:36px;z-index:5;display:grid;min-width:130px;border:1px solid var(--border);border-radius:6px;background:var(--bg);overflow:hidden}.tt-menu button{background:none;border:0;border-top:1px solid var(--border);padding:9px 14px;text-align:left;font:inherit;font-size:var(--fs-body,14px);color:var(--ink);cursor:pointer}.tt-menu button:first-child{border-top:0}.tt-menu button:hover{background:var(--ov-1)}',
    '.tt .kt-btn.sm{font-size:var(--fs-body,14px);padding:6px 12px;min-height:32px}',
    '.tt-g3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.tt-g3k{gap:8px}.tt-bigv{font-family:var(--font-serif);font-size:var(--fs-h2,26px);line-height:1;font-weight:500}.tt-bigv.w{color:var(--amber)}.tt-bigv small{font-family:var(--font-sans);font-size:var(--fs-body,14px);color:var(--ink2);font-weight:400;margin-left:4px}.tt-act{border-top:1px solid var(--border);padding-top:10px}',
    '#ws-tilanne.tt-uusi{margin-left:0;margin-right:auto}',
    '.tt-ajmuut{height:auto;min-height:38px;display:flex;align-items:center;font-weight:400;color:var(--ink2)}',
    '@container tt (max-width:760px){.tt-ajw{display:none}.tt-mj{display:block}.tt-ilmankortti{display:grid}.tt .kt-q3.four{grid-template-columns:repeat(2,minmax(0,1fr))}.tt-two,.tt-g3{grid-template-columns:minmax(0,1fr)}.tt .legend{display:none}.tt .kt-eb.row2{display:block}.tt-h1{font-size:var(--fs-h1,32px)}.tt-it{grid-template-columns:40px minmax(0,1fr)}.tt-st{grid-column:2;text-align:left}}'
  ].join('\n');

  /* ════════ HTML ════════ */
  var G = { ok: '●', w: '▲', err: '■', n: '○' };
  function tmTilanneHTML(m, opts) {
    opts = opts || {}; _kieli = opts.kieli || 'fi'; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {}, h = '';
    var call = function (f) { var a = Array.prototype.slice.call(arguments, 1).map(function (x) { return "'" + String(x).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ') + "'"; }); return f ? ' onclick="' + esc(f + '(' + a.join(',') + ')') + '"' : ''; };
    var KT = _req('TM_KT_KOMPONENTIT', './tm_kt_komponentit.js') || {}, auki = opts.auki || {};
    var tagit = function (L, tila, avain) { return _tagit(L, tila, avain, { esc: esc, call: call, fn: fn, auki: auki }); };
    var nauha = function (iso) { return KT.tmKtNauhaHTML ? KT.tmKtNauhaHTML(m.nauha, { iso: iso, t: t, esc: esc }) : ''; };
    var K = m.kortit, S = m.signaali, aj = m.aikajana, P = m.palaveri;
    var kausiTeksti = _fill(t('Kausi {a}–{b}'), { a: m.kausi, b: String((m.kausi + 1) % 100).replace(/^(\d)$/, '0$1') });

    /* A · otsikko ja tulkintalause (D151). Käynnistys-vaiheessa EI signaalikorttia (D170). */
    var aika = m.laskettuMs != null ? _pvmHki(m.laskettuMs, { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : null;
    var otsikko, lause;
    if (!m.joukkueita) { otsikko = t('Kausi odottaa joukkueita.'); lause = t('Joukkueet ilmestyvät tähän, kun pelaajat on tuotu.'); }
    else {
      var jakso = _fill(t('Jakso on käynnissä {a}/{b} joukkueella.'), { a: K.jaksolla.a, b: K.jaksolla.b }), pal = P.ms != null ? _pvViikonpv(P.ms) : null;
      if (m.vaihe === 'kaynnistys') { otsikko = t('Kausi on alussa.'); lause = jakso + ' ' + (pal ? _fill(t('Ennen jaksopalaveria {pvm} tärkein asia on, että joukkueet aloittavat jaksonsa.'), { pvm: pal }) : t('Tärkein asia on, että joukkueet aloittavat jaksonsa.')); }
      else { otsikko = m.huomiot.length > 2 ? t('Kausi vaatii huomiota.') : t('Kausi etenee suunnitellusti.'); lause = jakso + (pal && S && S.n ? ' ' + (S.n === 1 ? _fill(t('Jaksopalaveriin {pvm} on vielä auki yksi katselmus.'), { pvm: pal }) : _fill(t('Jaksopalaveriin {pvm} on vielä auki {n} katselmusta.'), { pvm: pal, n: S.n })) : ''); }
    }
    h += '<div class="tt-hd"><div class="tt-row"><span class="kt-eb">' + esc(kausiTeksti + ' · ' + _fill(t('viikko {n}'), { n: viikkoNro(m.nytIdx) })) + '</span>' + (aika ? '<span class="tt-age">' + esc(_fill(t('kooste {aika}'), { aika: aika })) + '</span>' : '') + '</div>'
      + '<h3 class="tt-h1">' + esc(otsikko) + '</h3><p class="tt-lead">' + esc(lause) + '</p></div>';

    /* B · neljä kysymyskorttia (mockup 22 .q3): kysymys · luku · lähde. Amber vain kun luku on alle puolen. */
    var q = function (k, v, pieni, s2, amber, na) { return '<div class="kt-q"><span class="kt-q-k">' + esc(k) + '</span><span class="kt-q-v' + (amber ? ' w' : '') + (na ? ' na' : '') + '">' + esc(v) + (pieni ? '<small>' + esc(pieni) + '</small>' : '') + '</span><span class="kt-q-s">' + esc(s2) + '</span></div>'; };
    var ka = K.katselmus;
    h += '<div class="kt-q3 four">'
      + q(t('Onko joukkueilla jakso?'), K.jaksolla.b > 0 ? String(K.jaksolla.a) : '—', K.jaksolla.b > 0 ? '/' + K.jaksolla.b : '', K.jaksolla.ilman.length ? _fill(t('{n} ilman jaksoa'), { n: K.jaksolla.ilman.length }) : t('kaikilla jakso'), K.jaksolla.b > 0 && K.jaksolla.a * 2 < K.jaksolla.b)
      + (ka ? q(t('Ovatko katselmukset ajallaan?'), String(ka.ajallaan), '/' + ka.perusta, ka.perusta - ka.ajallaan > 0 ? _fill(t('{n} auki'), { n: ka.perusta - ka.ajallaan }) : t('kaikki ajallaan'), ka.perusta > 0 && ka.ajallaan * 2 < ka.perusta) : q(t('Ovatko katselmukset ajallaan?'), '—', '', t('ei vielä päättyneitä jaksoja'), false, true))
      + q(t('Onko mitattu tällä kaudella?'), K.mitattu.b > 0 ? String(K.mitattu.a) : '—', K.mitattu.b > 0 ? '/' + K.mitattu.b : '', K.mitattu.testijakso ? _fill(t('testijakso vk {a}–{b}'), K.mitattu.testijakso) : t('ei testijaksoa'), K.mitattu.b > 0 && K.mitattu.a * 2 < K.mitattu.b)
      + q(t('Odottaako IDP vahvistusta?'), String(K.idp), '', K.idp ? t('pelaajaa odottaa') : t('ei odottavia'), K.idp > 0) + '</div>';

    /* C · yksi signaalikortti — vain Rytmi-vaiheessa (D170): jaksopalaverin valmius. Sivun ainoa täytetty nappi (D147). */
    if (S) {
      var lst = S.auki.length > 1 ? S.auki.slice(0, -1).join(', ') + ' ' + t('ja') + ' ' + S.auki[S.auki.length - 1] : S.auki.join('');
      h += '<div class="kt-sig' + (S.w ? ' w' : '') + '" id="tilannePalaveri"><span class="kt-eb">' + esc(S.ms != null ? _fill(t('Jaksopalaveri · {pvm} · {n} päivää'), { pvm: _pvViikonpv(S.ms), n: S.pv }) : t('Jaksopalaveri')) + '</span>'
        + '<div class="kt-sig-h">' + esc(S.w ? (S.n === 1 ? t('Yksi katselmus auki ennen palaveria.') : _fill(t('{n} katselmusta auki ennen palaveria.'), { n: S.n })) : t('Kaikki katselmukset ovat valmiina.')) + '</div>'
        + '<div class="kt-sig-why">' + esc(S.w ? _fill(t('{lista}: jakso päättyy vk {vk}. Katselmus vie noin 10 minuuttia: kolme kysymystä ja yksi lause.'), { lista: lst, vk: S.vk != null ? S.vk : '' }) : t('Esityslista kokoaa jaksojen tulokset, poikkeamat, ehdotukset ja onnistumiset.')) + '</div>'
        + '<div class="row"><button class="kt-btn" type="button"' + call(fn.esityslista) + '>' + esc(t('Avaa esityslista')) + '</button>' + (S.w && fn.valmentaja ? '<button class="tt-lnk" type="button"' + call(fn.valmentaja) + '>' + esc(t('Muistuta valmentajia')) + '</button>' : '') + '</div>'
        + nauha(true) + '<div class="tt-leg"><span><i class="ok"></i>' + esc(_fill(t('{n} jakso käynnissä'), { n: m.ryhmat.ok.length })) + '</span><span><i class="w"></i>' + esc(_fill(t('{n} katselmus auki'), { n: m.ryhmat.w.length })) + '</span><span><i></i>' + esc(_fill(t('{n} ei jaksoa'), { n: m.ryhmat.n.length })) + '</span></div></div>';
    }
    h += '<div id="tilanneEsityslista"></div>';

    /* D · kauden aikajana (D43/D145): omat rivit jaksollisille (5 + "näytä kaikki"), yksi kaista jaksottomille tunnisteineen — tunnisteet VAIN täällä (D150) */
    var pos = function (a) { return 'calc(' + (a - aj.A) + ' * 100% / ' + aj.n + ')'; };
    var leg = '<span class="chip">◆ ' + esc(t('katselmus')) + '</span><span class="chip w">│ ' + esc(t('nyt')) + '</span>'
      + (aj.palaveri ? '<span class="chip">┆ ' + esc(_fill(t('jaksopalaveri {pvm}'), { pvm: _pv(aj.palaveri.ms) })) + '</span>' : '')
      + (aj.testijakso ? '<span class="chip">▒ ' + esc(_fill(t('testijakso vk {a}–{b}'), aj.testijakso)) + '</span>' : '');
    var kaista = aj.kaista, rivitKaikki = aj.rivit, kaikkiAuki = !!auki.jaksot, rivit = kaikkiAuki ? rivitKaikki : rivitKaikki.slice(0, JAKSO_RIVEJA), piilossa = rivitKaikki.length - rivit.length;
    var cta = aj.vahan ? t('Aloita jaksot →') : t('Aloita jakso →'), ctaFn = '<button type="button" class="tt-cta"' + call(fn.aloitaJaksot) + '>' + esc(cta) + '</button>';
    leg += kaista.length ? '<span class="chip n">▨ ' + esc(t('ei jaksoa')) + '</span>' : '';
    if (m.joukkueita) h += '<div id="tilanneAikajana"><div class="kt-eb row2"><span>' + esc(t('Kausi · jaksot aikajanalla')) + '</span><span class="legend">' + leg + '</span></div>'
      + '<div class="tt-ajw"><div class="tt-aj" style="--n:' + aj.n + '">' + (rivit.length ? '<div class="tt-ajh"></div>' + aj.otsikot.map(function (o) { return '<div class="tt-ajh' + (o.idx === aj.nyt ? ' nyt' : '') + '">' + o.nro + '</div>'; }).join('') : '')
      + rivit.map(function (r) {
        var b = '', j = r.jakso;
        if (j) { var s0 = Math.max(j.a0, aj.A), e0 = Math.min(j.a1, aj.B); if (!(e0 < aj.A || s0 > aj.B)) b += '<div class="tt-ajb' + (r.tila === 'w' ? ' w' : '') + '" style="left:' + pos(s0) + ';width:calc(' + (e0 - s0 + 1) + ' * 100% / ' + aj.n + ')"><span>' + esc(j.nimi || t('Jakso käynnissä')) + '</span></div>';
          if (j.a1 >= aj.A && j.a1 <= aj.B) b += '<i class="tt-ajk" title="' + esc(t('katselmus')) + '" style="left:calc(' + (j.a1 - aj.A + .5) + ' * 100% / ' + aj.n + ')">◆</i>'; }
        return '<div class="tt-ajn"><button type="button"' + call(fn.joukkue, r.nimi) + '>' + esc(r.tunniste) + '</button></div><div class="tt-ajr" style="grid-column:2 / span ' + aj.n + '">' + b + '</div>';
      }).join('')
      + (piilossa > 0 ? '<div class="tt-ajn tt-ajmuut">' + esc(_fill(t('+{n} jaksoa'), { n: piilossa })) + '</div><div class="tt-ajr tt-ajmuut" style="grid-column:2 / span ' + aj.n + '"><button type="button" class="tt-cta"' + call(fn.auki, 'jaksot') + '>' + esc(t('Näytä kaikki jaksot →')) + '</button></div>' : '')
      + (rivit.length ? '<div class="tt-ajm" style="--c:' + (aj.nyt - aj.A) + ';--n:' + aj.n + '"></div>'
        + (aj.palaveri && aj.palaveri.idx >= aj.A && aj.palaveri.idx <= aj.B ? '<div class="tt-ajm tp" style="--c:' + (aj.palaveri.idx - aj.A) + ';--n:' + aj.n + '"></div>' : '')
        + (aj.testijakso ? '<div class="tt-ajt" style="--s:' + (Math.max(aj.testijakso.a0, aj.A) - aj.A) + ';--w:' + (Math.min(aj.testijakso.a1, aj.B) - Math.max(aj.testijakso.a0, aj.A) + 1) + ';--n:' + aj.n + '"></div>' : '') : '')
      + (kaista.length ? '<div class="tt-ajn ilman"><span>' + esc(t('Ei jaksoa')) + '</span><small>' + esc(_fill(t('{n} joukkuetta'), { n: kaista.length })) + '</small></div><div class="tt-ajr ilman" style="grid-column:2 / span ' + aj.n + '">' + tagit(kaista, 'n', 'kaista') + ctaFn + '</div>' : '')
      + '</div></div>'
      /* mobiili (≤ 720 px): aikajana tiivistyy riveiksi; "ei jaksoa" -kaista omaksi kortikseen — ei täytettyä nappia (D147) */
      + '<div class="tt-mj"><span class="kt-eb">' + esc(_fill(t('Jaksot · vk {vk}'), { vk: viikkoNro(aj.nyt) })) + '</span>' + rivit.map(function (r) { var j = r.jakso; return '<div class="tt-mjr"><b>' + esc(r.tunniste) + '</b><div class="tt-mjb' + (r.tila === 'w' ? ' w' : '') + '">' + esc(((j && j.nimi) || t('Jakso käynnissä')) + (j ? ' · ' + _fill(t('vk {a}/{b}'), { a: Math.min(Math.max(aj.nyt - j.a0 + 1, 1), j.N), b: j.N }) : '')) + '</div></div>'; }).join('')
      + (piilossa > 0 ? '<button type="button" class="tt-cta"' + call(fn.auki, 'jaksot') + '>' + esc(_fill(t('+{n} jaksoa · näytä kaikki →'), { n: piilossa })) + '</button>' : '') + '</div>'
      + (kaista.length ? '<div class="kt-ev tt-ilmankortti"><span class="kt-eb">' + esc(_fill(t('Ei jaksoa · {n} joukkuetta'), { n: kaista.length })) + '</span><div class="tt-tgs">' + tagit(kaista, 'n', 'kaista_m') + '</div><button type="button" class="tt-cta"' + call(fn.aloitaJaksot) + '>' + esc(cta) + '</button></div>' : '')
      + '</div>';

    /* E · huomiot (vasen) ja ehdotukset (oikea) rinnakkain (D148, D149). Molemmat ovat LISTAN ALKIOITA: otsikko DM Sans --fs-lead 600 (D169). */
    var HU = m.huomiot, huKaikki = !!auki.huomiot, huNayt = huKaikki ? HU : HU.slice(0, HUOMIOT_NAKY);
    var KL = { tekniikka: 'Tekniikka alle ikätason', karki: 'Kärkipelaajien taso alle ikätason', fyysinen: 'Fyysiset testit alle ikätason', alaraja: 'Fyysiset testit asteikon alarajalla', kehitys: 'Taso laskenut kahden viimeisen testin välillä', vanha_tekniikka: 'Tekniikan mittaus on vanha', vanha_fyysinen: 'Fyysisten testien mittaus on vanha', vanha_muu: 'Mittaus on vanha' };
    var KN = { tekniikka: 'tekniikka', karki: 'kärkipelaajat', fyysinen: 'fyysiset testit', alaraja: 'alaraja', kehitys: 'kehitys', vanha_tekniikka: 'mittaus vanha', vanha_fyysinen: 'mittaus vanha', vanha_muu: 'mittaus vanha' };
    var mittaus = function (x) { return x.mitattuMs != null ? (x.kk != null && x.kk >= 2 ? _fill(t('mitattu {kk} kk sitten'), { kk: x.kk }) : _fill(t('mitattu {pvm}'), { pvm: _pv(x.mitattuMs) })) : ''; };
    var huRivi = function (x) {
      if (x.tyyppi === 'ryhma') {   // sama asia ≥ 3 joukkueella → yksi rivi; tunnisteet D144 (kuusi + "+N"); rivi avaa listan joukkueista
        var L = x.joukkueet, tn = L.slice(0, 6).map(function (j) { return '<span class="tt-tg ok">' + esc(j.tunniste) + '</span>'; }).join('') + (L.length > 6 ? '<span class="tt-tg ok">+' + (L.length - 6) + '</span>' : '');
        return '<details class="tt-ryhma"><summary class="tt-it"><span class="tt-j" aria-hidden="true"></span><span class="tt-tx"><span class="tt-a">' + esc(_fill(t('{asia} · {n} joukkuetta'), { asia: t(KL[x.kind]), n: x.n })) + '</span><span class="tt-tgs">' + tn + '</span></span><span class="tt-st' + (x.w ? ' w' : '') + '"><span class="tt-go" aria-hidden="true">▾</span></span></summary>'
          + '<div class="tt-ryhmasis">' + L.map(function (j) { var mt = /^vanha_/.test(x.kind) ? (j.vuosi != null ? _fill(t('viimeksi {vuosi} · ei tasoarviota'), { vuosi: j.vuosi }) : t('ei tasoarviota')) : mittaus(j); return '<button type="button" class="tt-it tt-alit" aria-label="' + esc(j.nimi) + '"' + call(fn.joukkue, j.nimi) + '><span class="tt-j">' + esc(j.tunniste) + '</span><span class="tt-tx"><span class="tt-m">' + esc(mt) + '</span></span><span class="tt-st"><span class="tt-go" aria-hidden="true">›</span></span></button>'; }).join('') + '</div></details>';
      }
      var K = x.kinds, tasot = [], seg = [];
      K.forEach(function (k) { if (k === 'tekniikka') tasot.push(t('Tekniikka')); else if (k === 'karki') tasot.push(t('kärkipelaajien taso')); else if (k === 'fyysinen') tasot.push(t('Fyysiset testit')); });
      if (tasot.length) seg.push(_fill(t('{osat} alle ikätason'), { osat: tasot.length > 1 ? tasot.slice(0, -1).join(', ') + ' ' + t('ja') + ' ' + tasot[tasot.length - 1] : tasot[0] }));
      K.forEach(function (k) { if (k === 'alaraja' || k === 'kehitys' || /^vanha_/.test(k)) seg.push(t(KL[k])); });
      var meta = [], vanha = K.length && K.every(function (k) { return /^vanha_/.test(k); });
      if (vanha) meta.push(x.vuosi != null ? _fill(t('viimeksi {vuosi} · ei tasoarviota'), { vuosi: x.vuosi }) : t('ei tasoarviota')); else { var mt = mittaus(x); if (mt) meta.push(mt); if (x.phv) meta.push(t('PHV huomioitu')); }
      var st = K.length > 1 ? K.map(function (k) { return t(KN[k]); }).join(' · ') : K[0] === 'alaraja' ? t('tarkista mittaus') : K[0] === 'kehitys' ? t('kuormitus?') : vanha ? t('päivitä') : '', lause = seg.join('. ');
      return '<button type="button" class="tt-it" aria-label="' + esc(x.joukkue + ': ' + lause) + '"' + call(fn.joukkue, x.joukkue) + '><span class="tt-j">' + esc(x.tunniste) + '</span><span class="tt-tx"><span class="tt-a">' + esc(lause) + '</span><span class="tt-m">' + esc(meta.join(' · ')) + '</span></span><span class="tt-st' + (x.w && st ? ' w' : '') + '">' + esc(st) + '<span class="tt-go" aria-hidden="true">›</span></span></button>';
    };
    var huoSis = '<div class="tt-col" id="tilannePoikkeamat"><div class="tt-secth"><span class="kt-eb">' + esc(t('Joukkueet, jotka tarvitsevat huomiota')) + '</span>' + (HU.length ? '<span class="tt-m">' + huNayt.length + ' / ' + HU.length + '</span>' : '') + '</div>'
      + (HU.length ? '<div class="tt-list">' + huNayt.map(huRivi).join('') + (HU.length > huNayt.length ? '<div class="tt-more"><button type="button" class="tt-lnk"' + call(fn.auki, 'huomiot') + '>' + esc(_fill(t('Näytä kaikki {n} →'), { n: HU.length })) + '</button></div>' : '') + '</div>'
        : '<div class="kt-note">' + esc(t('Ei huomioita — kaikki joukkueet odotetulla tasolla.')) + '</div>') + '</div>';
    var ehKaikki = !!auki.ehdotukset, EH = ehKaikki ? m.ehdotuksetKaikki : m.ehdotuksetV2, ehSis = '<div class="tt-col" id="tilanneEhdotukset"><div class="tt-secth"><span class="kt-eb">' + esc(t('TalentMaster ehdottaa · sinä päätät')) + '</span>' + (m.ehdotukset.yht ? '<span class="tt-m">' + EH.length + ' / ' + m.ehdotukset.yht + '</span>' : '') + '</div>'
      + (EH.length ? '<div class="tt-list">' + EH.map(function (e, i) {
        var ids = e.ids.join(','), otsikko2 = e.joukkueita === 1 ? _fill(t('{aihe} yhdelle joukkueelle'), { aihe: t(e.aihe) }) : _fill(t('{aihe} {n} joukkueelle'), { aihe: t(e.aihe), n: e.joukkueita });
        return '<div class="tt-eit"><div class="tt-eh2">' + esc(otsikko2) + '</div><div class="tt-why">' + esc(t(e.perustelu)) + '</div>'
          + '<div class="tt-tgs">' + tagit(e.tunnisteet, 'ok', 'e' + i) + '</div><div class="tt-erow"><button class="kt-btn q sm" type="button"' + call(fn.hyvaksy, ids) + '>' + esc(t('Ota käyttöön')) + '</button><span class="tt-sp"></span>'
          + '<details class="tt-kebab"><summary aria-label="' + esc(t('Muokkaa · Hylkää')) + '" title="' + esc(t('Muokkaa · Hylkää')) + '">⋯</summary><div class="tt-menu"><button type="button"' + call(fn.muokkaa, ids) + '>' + esc(t('Muokkaa')) + '</button><button type="button"' + call(fn.hylkaa, ids) + '>' + esc(t('Hylkää')) + '</button></div></details></div></div>'; }).join('')
        + (m.ehdotukset.yht > EH.length ? '<div class="tt-more"><button type="button" class="tt-lnk"' + call(fn.auki, 'ehdotukset') + '>' + esc(_fill(t('+{n} muuta ehdotusta'), { n: m.ehdotukset.yht - EH.length })) + '</button></div>' : '') + '</div>'
        : '<div class="kt-note">' + esc(t('Ei avoimia toimenpiteitä — hyvä työ.')) + '</div>') + '</div>';
    h += '<div class="tt-two">' + huoSis + ehSis + '</div>';

    /* F · mittaus · talentit · syntymäkvartaalit — sama .kt-ev-anatomia: otsikko, luku, lause, linkki (mockup 30 .g3) */
    var M = m.mittaus, T = m.talentit, R = m.rae, d1 = m.d1 && !m.d1.riittava && m.d1.b > 0 ? ' ' + _fill(t('Seuratason fyysisiä lukuja ei näytetä ennen kuin {z}/{b} on mitattu.'), { z: m.d1.raja, b: m.d1.b }) : '';
    var kortti = function (id, eb, v, pieni, w, lause2, linkki, linkkiFn) { return '<div class="kt-ev tt-g3k" id="' + id + '"><span class="kt-eb">' + esc(eb) + '</span><div class="tt-bigv' + (w ? ' w' : '') + '">' + esc(v) + (pieni ? '<small>' + esc(pieni) + '</small>' : '') + '</div><p class="tt-lause">' + esc(lause2) + '</p><div class="tt-act"><button type="button" class="tt-lnk"' + call(linkkiFn) + '>' + esc(linkki) + '</button></div></div>'; };
    h += '<div class="tt-g3">'
      + kortti('tilanneMittaus', t('Mittaustilanne'), M.yht > 0 ? String(M.vanhoja) : '—', M.yht > 0 ? _fill(t('/{y} yli 6 kk vanha'), { y: M.yht }) : '', M.yht > 0 && M.vanhoja * 2 > M.yht, (M.testijakso ? _fill(t('Seuraava testijakso vk {a}–{b}.'), { a: M.testijakso.a, b: M.testijakso.b }) : t('Testijaksoa ei ole suunniteltu.')) + d1, M.testijakso ? t('Suunnittele testijakso →') : t('Suunnittele testijakso →'), fn.testijakso)
      + kortti('tilanneTalentit', t('Talentit'), String(T.n), _fill(t('talenttia · {m} ehdokasta'), { m: T.ehdokkaita }), false, t('Hidden Gem -ehdokkaat näkyvät, kun D1 on mitattu (§28).') + (T.odottaa ? ' ' + _fill(t('{n} odottaa mittausta.'), { n: T.odottaa }) : ''), m.ryhmaN != null ? _fill(t('Talenttiryhmä · {n} jäsentä →'), { n: m.ryhmaN }) : t('Avaa talentit →'), fn.ryhmat)
      + kortti('tilanneRae', t('Syntymäkvartaalit'), R ? String(R.n) : '—', R ? _fill(t('/{yht} syntymäaikaa'), { yht: R.yht }) : '', false,
          R && R.riittava && R.n ? ['Q1', 'Q2', 'Q3', 'Q4'].map(function (qq) { return qq + ' ' + R.pct[qq] + ' %'; }).join(' · ') + '.' : (R ? _fill(t('RAE-jakaumaa ei voi vielä lukea: syntymäajat puuttuvat {n} pelaajalta.'), { n: Math.max(0, R.yht - R.n) }) : t('Syntymäkvartaali-data täyttyy kun huoltajat rekisteröivät pelaajat.')),
          R && R.riittava ? t('Avaa RAE →') : t('Täydennä syntymäajat →'), fn.rae)
      + '</div>';

    return '<div class="tt">' + h + '</div>';
  }

  /* Jaksopalaverin esityslista (D123/D135): jaksojen tulokset, poikkeamat, ehdotukset, onnistumiset. Raportointi-työtilan sisältö (MDT, harjoittelun laatu, Head of Talent) on esityslistan liitteenä (#tilanneRaportitDet). */
  function tmTilanneEsityslistaHTML(m, onnistumiset, opts) {
    opts = opts || {}; _kieli = opts.kieli || 'fi'; var esc = opts.esc || _esc, t = _tt(opts), P = m.palaveri, h = '', rivit = function (a) { return '<div class="kt-vl">' + a.join('') + '</div>'; };
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
