/* ════════════════════════════════════════════════════════════════════════
   tm_kevyt_katselmus.js — V4b-2: kevyt katselmus (jakson sulku: 3 kysymystä + lause + valinnainen K3-tarjous = YKSI tallennus) ja "Hylkää valinta"
   (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md #8–#10, #14, §3; design 18 §4–5). PURE (ei Firebasea, ei DOMia) — Master_v16 ja VP_v25 ovat ohuita adaptereita.
   KEVYT KATSELMUS
   · tmKkAlku(p, ctx) → tila S { kevyt:{nakyi,treeni,mukana}, lause, k3:{paalla,kortit}, ... }   · tmKkVoiTallentaa(S) → { ok, syy }
   · tmKkTallennus(p, S, ctx) → kirjoitussuunnitelma { jaksofokus, historiaLisays:[rivi], reviewitPvm, reviewitData:{kevyt, kevyt_tallennettu}, poistaValinta } | { ok:false, syy, indeksi }
       Adapteri kirjoittaa YHDESSÄ batchissa: pelaajadokki update(jaksofokus, jaksofokus_historia arrayUnion(rivi) [, ydinvahvuus_valinta delete]) + reviewit/{pvm} set(reviewitData, {merge:true}).
       EI koske reviewit-dokumentin `tyyppi`-kenttää eikä pelaajan review_viimeisin_* -pikakenttiin (MDT-rytmi päivittyy vain täydestä katselmuksesta — Teron päätös 7.10.).
       Kolmen kysymyksen vastaukset VAIN reviewit/{pvm}.kevyt:iin (sanoina; EI pelaajadokkiin, jota pelaaja lukee, §39). Lause (≤140, K4:n vartija) historiariville + lause_lahde:'valmentaja'|'vp'.
   · tmKkSheetHTML(S, opts) — ruutu (Master + VP). · tmLauseEhdotukset(osat, nakyi) — oto-profiilin muokattavat aloitusehdotukset (ei lähetetä sellaisenaan).
   VALMENTAJAPROFIILI (D50): tmProfiili(joukkueDoc) → 'ammatti' | 'oto' (oletus 'oto', myös kun joukkuedokumenttia ei ole). Ammatti: lause pakollinen; oto: toivottu + ehdotukset.
   HYLKÄÄ VALINTA (§3 b)
   · tmHylkaaKortit(p, ehdotukset|kortit) → K3-kortit esitäytettynä nykyisillä vaihtoehdoilla (muutettavissa, sama lomake kuin K3-tarjous)
   · tmHylkaaTallennus(p, S, ctx{pvm}) → { ok, jaksofokus:{tila:'valittavana', vaihtoehdot, hylatty:{pvm, perustelu, valinta}}, poistaValinta:true } | { ok:false, syy, indeksi }
       Perustelu pelaajalle: pakollinen, ≤140, KIELLETYT + ei lukuja (tmVkLauseValmentaja). Yksi update(): jaksofokus + ydinvahvuus_valinta delete (kuten K3-tarjous). Pelaaja näkee "Valmentajalta: {perustelu}" kunnes valitsee uudelleen.
   Tekstit opts.t:n läpi (fi-oletus tässä; sv-avaimet määrittelemättä → Geminin lista). Vain tokenit (ei hex-värejä). Dual-export: module.exports || window.TM_KEVYT_KATSELMUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kk_otsikko: 'Sulje jakso', kk_q_nakyi: 'Näkyikö ase pelissä?', kk_q_treeni: 'Treenattiinko sitä?', kk_q_mukana: 'Oliko pelaaja mukana?',
    kk_nakyi_ei_viela: 'Ei vielä', kk_nakyi_ohjatusti: 'Ohjatusti', kk_nakyi_itsenaisesti: 'Itsenäisesti',
    kk_treeni_harvoin: 'Harvoin', kk_treeni_joskus: 'Joskus', kk_treeni_usein: 'Usein',
    kk_mukana_vahan: 'Vähän', kk_mukana_jonkin_verran: 'Jonkin verran', kk_mukana_hyvin: 'Hyvin',
    kk_lause: 'Lause pelaajalle', kk_lause_pakollinen: 'pakollinen · enintään 140 merkkiä', kk_lause_toivottu: 'toivottu · enintään 140 merkkiä', kk_lause_ohje: 'Pelaaja näkee tämän. Ei lukuja, ei vertailua.',
    kk_ehdotukset: 'Aloitusehdotuksia (muokkaa omin sanoin — ei lähetetä sellaisenaan)', kk_sulje_laheta: 'Sulje jakso ja lähetä', kk_syvenna: 'Syvennä (täysi katselmus)', kk_peruuta: 'Peruuta', kk_yksi_tallennus: 'yksi tallennus',
    kk_vp_lause: 'VP:n lause', kk_vp_ohje: 'Suljet jakson valmentajan puolesta; lause merkitään VP:n lauseeksi ja valmentaja näkee sen.',
    kk_virhe_kysymykset: 'Vastaa kaikkiin kolmeen kysymykseen.', kk_virhe_lause_pakollinen: 'Kirjoita lause pelaajalle.', kk_virhe_jakso: 'Ei suljettavaa jaksoa.', kk_tallennettu: 'Jakso suljettu ✓', kk_tallennettu_tarjous: 'Jakso suljettu · valinta tarjottu pelaajalle ✓',
    hk_otsikko: 'Hylkää valinta', hk_ohje: 'Pelaaja saa valita uudelleen. Kerro pelaajalle miksi — hän näkee lauseen valintaruudussa.', hk_perustelu: 'Perustelu pelaajalle', hk_perustelu_ohje: 'Enintään 140 merkkiä. Ei lukuja, ei vertailua.',
    hk_laheta: 'Lähetä pelaajalle uudelleen', hk_virhe_perustelu: 'Kirjoita perustelu pelaajalle.', hk_virhe_ei_valintaa: 'Pelaaja ei ole valinnut — ei hylättävää.', hk_valmis: 'Valinta palautettu pelaajalle ✓'
  };
  var KYSYMYKSET = [
    { avain: 'nakyi', k: 'kk_q_nakyi', arvot: ['ei_viela', 'ohjatusti', 'itsenaisesti'] },
    { avain: 'treeni', k: 'kk_q_treeni', arvot: ['harvoin', 'joskus', 'usein'] },
    { avain: 'mukana', k: 'kk_q_mukana', arvot: ['vahan', 'jonkin_verran', 'hyvin'] }
  ];
  var MAX_KORTIT = 4;

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _RV() { var m = _req('TM_REITIN_VALINTA', './tm_reitin_valinta.js'); if (!m) throw new Error('tm_kevyt_katselmus: tm_reitin_valinta.js puuttuu'); return m; }
  function _K4() { var m = _req('TM_VIIKKOKATSAUS', './tm_viikkokatsaus.js'); if (!m) throw new Error('tm_kevyt_katselmus: tm_viikkokatsaus.js puuttuu'); return m; }
  function _SL() { var m = _req('TM_KEHITYSSILMUKKA', './tm_kehityssilmukka.js'); if (!m) throw new Error('tm_kevyt_katselmus: tm_kehityssilmukka.js puuttuu'); return m; }
  function _str(v) { return typeof v === 'string' ? v.trim() : ''; }

  /* ── Profiili (D50): joukkueet/{jid}.valmentajaprofiili 'ammatti'|'oto'; oletus 'oto' (myös ilman joukkuedokumenttia, §7.21) ── */
  function tmProfiili(joukkueDoc) { return joukkueDoc && joukkueDoc.valmentajaprofiili === 'ammatti' ? 'ammatti' : 'oto'; }

  /* ── Vastaukset (sanoina; sama enum kuin Rules v3.46 kevytKelpaa) ── */
  function tmKevytKelpaa(k) {
    if (!k || typeof k !== 'object' || Array.isArray(k)) return false;
    var avaimet = Object.keys(k); if (avaimet.length !== KYSYMYKSET.length) return false;
    return KYSYMYKSET.every(function (q) { return q.arvot.indexOf(k[q.avain]) >= 0; });
  }
  /* Lause: tyhjä sallittu (oto) tai pakollinen (ammatti). Ei-tyhjä → K4:n vartija (≤140, KIELLETYT, ei lukuja). */
  function tmKkLause(s, profiili) {
    var t = _str(s);
    if (!t) return tmProfiili({ valmentajaprofiili: profiili }) === 'ammatti' ? { ok: false, teksti: null, syy: 'pakollinen' } : { ok: true, teksti: null, syy: null };
    return _K4().tmVkLauseValmentaja(t);
  }
  function tmKkLauseVirhe(syy, opts) { return syy === 'pakollinen' ? _txt(opts, 'kk_virhe_lause_pakollinen') : _K4().tmVkLauseVirhe(syy, opts); }

  /* ── Oto-profiilin aloitusehdotukset: osista, järjestys vastauksen mukaan; kaikki vartijan läpi (hylätty ehdotus pudotetaan). ── */
  var MALLIT = [
    function (o) { return o + ' näkyi jo pelissä.'; },
    function (o) { return o + ' alkoi tulla mukaan harjoituksissa.'; },
    function (o) { return o + ' on seuraava askel.'; }
  ];
  function tmLauseEhdotukset(osat, nakyi) {
    var lista = (Array.isArray(osat) ? osat : []).map(function (x) { return _str(x && x.teksti).replace(/[.!?…]+$/, ''); }).filter(Boolean);
    if (!lista.length) return [];
    var alku = nakyi === 'itsenaisesti' ? 0 : (nakyi === 'ohjatusti' ? 1 : 2), K4 = _K4(), ulos = [];
    for (var i = 0; i < MALLIT.length && ulos.length < 3; i++) {
      var m = MALLIT[(alku + i) % MALLIT.length], o = lista[i % lista.length];
      var s = m(o.charAt(0).toUpperCase() + o.slice(1)), v = K4.tmVkLauseValmentaja(s);
      if (v.ok && ulos.indexOf(v.teksti) < 0) ulos.push(v.teksti);
    }
    return ulos;
  }

  /* ── Tila ──
     ctx: { profiili, lahde:'valmentaja'|'vp', nimi, konsepti, kestoVk, kortit (K3-kortit; tmTarjousKortit), osat (ehdotuksia varten), vihjeet:{treeni?,mukana?} (automaattiset luvut henkilökunnalle), k3Paalla } */
  function tmKkAlku(p, ctx) {
    ctx = ctx || {}; var jf = (p && p.jaksofokus) || {};
    return { pid: p && p.id, nimi: ctx.nimi || '', konsepti: ctx.konsepti || jf.konsepti_nimi || jf.konsepti_avain || '', kestoVk: ctx.kestoVk != null ? ctx.kestoVk : (jf.kesto_vk || null),
      profiili: tmProfiili({ valmentajaprofiili: ctx.profiili }), lahde: ctx.lahde === 'vp' ? 'vp' : 'valmentaja', kevyt: { nakyi: null, treeni: null, mukana: null }, lause: '',
      osat: Array.isArray(ctx.osat) ? ctx.osat : [], vihjeet: ctx.vihjeet || {}, k3: { paalla: !!ctx.k3Paalla, kortit: Array.isArray(ctx.kortit) ? ctx.kortit : [] }, tallentaa: false };
  }
  function tmKkAsetaVastaus(S, avain, arvo) {
    var q = KYSYMYKSET.filter(function (x) { return x.avain === avain; })[0]; if (!S || !q || q.arvot.indexOf(arvo) < 0) return false;
    S.kevyt[avain] = S.kevyt[avain] === arvo ? null : arvo; return true;   // sama uudelleen = poista valinta
  }
  function tmKkEhdotukset(S) { return S && S.profiili !== 'ammatti' ? tmLauseEhdotukset(S.osat, S.kevyt && S.kevyt.nakyi) : []; }   // oto: muokattavat aloitusehdotukset; ammatti kirjoittaa itse
  function tmKkVoiTallentaa(S) {
    if (!S) return { ok: false, syy: 'tila' };
    if (!KYSYMYKSET.every(function (q) { return !!S.kevyt[q.avain]; })) return { ok: false, syy: 'kysymykset' };
    var l = tmKkLause(S.lause, S.profiili); if (!l.ok) return { ok: false, syy: l.syy };
    return { ok: true, syy: null };
  }

  /* ── Tallennus: kirjoitussuunnitelma ──
     ctx: { nytISO, pvm 'YYYY-MM-DD' (paikallinen päivä), rooli, harjoituksia, lasnaolo, alkoi, loppu, delta_mitattu, ohjelma? } */
  function tmKkTallennus(p, S, ctx) {
    ctx = ctx || {}; var jf = p && p.jaksofokus;
    if (!jf || !(jf.konsepti_avain || jf.konsepti_nimi || jf.ohjelma)) return { ok: false, syy: 'ei_jaksoa', indeksi: null };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ctx.pvm || ''))) return { ok: false, syy: 'pvm', indeksi: null };
    if (!tmKevytKelpaa(S && S.kevyt)) return { ok: false, syy: 'kysymykset', indeksi: null };
    var l = tmKkLause(S.lause, S.profiili); if (!l.ok) return { ok: false, syy: l.syy, indeksi: null };
    var tarjous = null;
    if (S.k3 && S.k3.paalla) {
      tarjous = _RV().tmTarjousOlio(S.k3.kortit);
      if (!tarjous.ok) return { ok: false, syy: 'k3_' + tarjous.syy, indeksi: tarjous.indeksi };
    }
    var nyt = ctx.nytISO || new Date().toISOString();
    var lisa = l.teksti ? { lause: l.teksti, lause_lahde: S.lahde === 'vp' ? 'vp' : 'valmentaja' } : undefined;
    var v = _SL().tmSuljeJakso({ jaksofokus: jf }, {
      alkoi: ctx.alkoi, loppu: ctx.loppu, harjoituksia: ctx.harjoituksia, lasnaolo: ctx.lasnaolo, arvioija_rooli: ctx.rooli || 'valmentaja',
      delta_mitattu: ctx.delta_mitattu || null, ohjelma: jf.ohjelma || null, tulos: null, uusi: null
    }, { nytISO: nyt, lisakentat: lisa });
    return { ok: true, jaksofokus: tarjous ? tarjous.jaksofokus : v.jaksofokus, historiaLisays: v.historiaLisays, tarjottu: !!tarjous, poistaValinta: !!tarjous,
      reviewitPvm: ctx.pvm, reviewitData: { kevyt: { nakyi: S.kevyt.nakyi, treeni: S.kevyt.treeni, mukana: S.kevyt.mukana }, kevyt_tallennettu: nyt } };
  }

  /* ── Hylkää valinta ── */
  function tmHylkaaKortit(p, ehdotukset) {
    var RV = _RV(), jf = (p && p.jaksofokus) || {}, ulos = [], nahty = {};
    (Array.isArray(jf.vaihtoehdot) ? jf.vaihtoehdot : []).forEach(function (v) {
      if (!v || typeof v.konsepti_avain !== 'string' || !v.konsepti_avain || nahty[v.konsepti_avain] || ulos.length >= MAX_KORTIT) return;
      nahty[v.konsepti_avain] = 1;
      ulos.push({ avain: v.konsepti_avain, nimi: _str(v.nimi) || v.konsepti_avain, syy: null, valittu: true, lause: _str(v.perustelu) });
    });
    var lisa = Array.isArray(ehdotukset) && ehdotukset.length && ehdotukset[0] && ehdotukset[0].avain !== undefined ? ehdotukset : RV.tmTarjousKortit(ehdotukset);   // valmiit kortit (adapterin _msK3Ehdotukset) tai raaka tmJaksoEhdotukset
    lisa.forEach(function (k) { if (!nahty[k.avain] && ulos.length < MAX_KORTIT) { nahty[k.avain] = 1; ulos.push(k); } });
    return ulos;
  }
  function tmHylkaaAlku(p, ctx) {
    ctx = ctx || {};
    return { pid: p && p.id, nimi: ctx.nimi || '', perustelu: '', k3: { paalla: true, kortit: tmHylkaaKortit(p, ctx.ehdotukset) }, tallentaa: false };
  }
  function tmHylkaaTallennus(p, S, ctx) {
    ctx = ctx || {}; var RV = _RV(), jf = p && p.jaksofokus, r = RV.tmHenkRivitila(p);
    if (!jf || jf.tila !== 'valittavana' || !r || r.tila !== 'valittu') return { ok: false, syy: 'ei_valintaa', indeksi: null };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ctx.pvm || ''))) return { ok: false, syy: 'pvm', indeksi: null };
    var t = _str(S && S.perustelu); if (!t) return { ok: false, syy: 'pakollinen', indeksi: null };
    var l = _K4().tmVkLauseValmentaja(t); if (!l.ok) return { ok: false, syy: l.syy, indeksi: null };
    if (/hyl[aäk]/i.test(t)) return { ok: false, syy: 'sana', indeksi: null };   // pelaaja ei näe sanaa "hylätty" (Teron päätös 7.10.)
    var tarjous = RV.tmTarjousOlio(S.k3 && S.k3.kortit); if (!tarjous.ok) return { ok: false, syy: 'k3_' + tarjous.syy, indeksi: tarjous.indeksi };
    var valinta = String(r.teksti || '').slice(0, 60);
    return { ok: true, poistaValinta: true, jaksofokus: { tila: 'valittavana', vaihtoehdot: tarjous.jaksofokus.vaihtoehdot, hylatty: { pvm: ctx.pvm, perustelu: l.teksti, valinta: valinta } } };
  }
  function tmHylkaaVirhe(syy, opts) {
    if (syy === 'pakollinen') return _txt(opts, 'hk_virhe_perustelu'); if (syy === 'ei_valintaa') return _txt(opts, 'hk_virhe_ei_valintaa');
    if (/^k3_/.test(syy)) return _RV().tmTarjousVirhe(syy.slice(3), opts);
    return _K4().tmVkLauseVirhe(syy, opts);
  }
  function tmKkVirhe(syy, opts) {
    if (syy === 'kysymykset') return _txt(opts, 'kk_virhe_kysymykset'); if (syy === 'ei_jaksoa') return _txt(opts, 'kk_virhe_jakso');
    if (/^k3_/.test(syy)) return _RV().tmTarjousVirhe(syy.slice(3), opts);
    return tmKkLauseVirhe(syy, opts);
  }

  /* ── HTML ── */
  var RASTI = 'font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3)';
  function _pill(esc, aktiivinen, fn, teksti, attr) {
    return '<button type="button" ' + attr + ' aria-pressed="' + (aktiivinen ? 'true' : 'false') + '" onclick="' + esc(fn) + '" style="flex:1;min-width:84px;font-size:12.5px;border-radius:8px;padding:9px 8px;cursor:pointer;border:.5px solid ' + (aktiivinen ? 'var(--teal)' : 'var(--border)') + ';background:' + (aktiivinen ? 'var(--teal)' : 'transparent') + ';color:' + (aktiivinen ? 'var(--on-accent,var(--bg))' : 'var(--ink)') + '">' + esc(teksti) + '</button>';
  }
  function _kentta() { return 'width:100%;box-sizing:border-box;background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:8px;padding:8px;font-family:inherit;font-size:13px;resize:none'; }
  function _kehys(id, esc, opts, sisus) {
    return '<div id="' + esc(id) + '" role="dialog" aria-modal="true" style="position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9200;display:flex;align-items:center;justify-content:center;padding:16px" onclick="if(event.target===this)' + esc(opts.suljeFn) + '()">'
      + '<div style="background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px;padding:20px;width:540px;max-width:100%;max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">' + sisus + '</div></div>';
  }
  /* opts: { esc, t, vastausFn(avain,arvo), lauseFn(v), ehdotusFn(i), tallennaFn, syvennaFn, suljeFn, k3:{paalleFn,valitseFn,lauseFn}, pinta, modalId } */
  function tmKkSheetHTML(S, opts) {
    opts = opts || {}; S = S || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, ammatti = S.profiili === 'ammatti', vp = S.lahde === 'vp';
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px"><div data-kvk-otsikko style="font-family:\'Cormorant Garamond\',serif;font-size:21px">' + T('kk_otsikko') + ' · ' + esc(S.konsepti || '') + (S.kestoVk ? ' · ' + esc(S.kestoVk) + ' vk' : '') + '</div>'
      + '<button type="button" aria-label="' + esc(_txt(opts, 'kk_peruuta')) + '" onclick="' + esc(opts.suljeFn) + '()" style="background:none;border:none;color:var(--ink3);font-size:22px;cursor:pointer;padding:0 6px">×</button></div>'
      + (S.nimi ? '<div style="font-size:11px;color:var(--ink3);margin-bottom:12px">' + esc(S.nimi) + '</div>' : '');
    KYSYMYKSET.forEach(function (q) {
      h += '<div data-kvk-kysymys="' + q.avain + '" style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">' + T(q.k) + '</div><div style="display:flex;gap:7px;flex-wrap:wrap">'
        + q.arvot.map(function (a) { return _pill(esc, S.kevyt && S.kevyt[q.avain] === a, opts.vastausFn + "('" + q.avain + "','" + a + "')", _txt(opts, 'kk_' + q.avain + '_' + a), 'data-kvk-arvo="' + a + '"'); }).join('') + '</div>'
        + (S.vihjeet && S.vihjeet[q.avain] ? '<div style="font-size:11px;color:var(--ink3);margin-top:4px">' + esc(S.vihjeet[q.avain]) + '</div>' : '') + '</div>';
    });
    h += '<div style="margin:14px 0 12px"><div style="' + RASTI + ';margin-bottom:4px">' + T(vp ? 'kk_vp_lause' : 'kk_lause') + ' · ' + T(ammatti ? 'kk_lause_pakollinen' : 'kk_lause_toivottu') + '</div>'
      + '<textarea id="kvkLause" data-kvk-lause rows="2" maxlength="' + _K4().MAX_LAUSE + '" oninput="' + esc(opts.lauseFn) + '(this.value)" style="' + _kentta() + '">' + esc(S.lause || '') + '</textarea>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">' + T(vp ? 'kk_vp_ohje' : 'kk_lause_ohje') + '</div>';
    var ehd = tmKkEhdotukset(S);
    if (ehd.length && opts.ehdotusFn) h += '<div data-kvk-ehdotukset style="margin-top:8px"><div style="font-size:10.5px;color:var(--ink3);margin-bottom:4px">' + T('kk_ehdotukset') + '</div><div style="display:flex;flex-direction:column;gap:5px">'
      + ehd.map(function (e, i) { return '<button type="button" data-kvk-ehdotus="' + i + '" onclick="' + esc(opts.ehdotusFn + '(' + i + ')') + '" style="text-align:left;font-size:12px;border-radius:8px;padding:7px 10px;cursor:pointer;border:.5px dashed var(--border);background:transparent;color:var(--ink2)">' + esc(e) + '</button>'; }).join('') + '</div></div>';
    h += '</div>';
    if (opts.k3) h += _RV().tmTarjousOsioHTML(S.k3, Object.assign({ esc: esc, t: opts.t, pinta: opts.pinta }, opts.k3));
    var voi = tmKkVoiTallentaa(S).ok && !S.tallentaa;
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button type="button" data-kvk-tallenna class="kt-nappi kt-nappi-ens" onclick="' + esc(opts.tallennaFn) + '()"' + (voi ? '' : ' aria-disabled="true" style="opacity:.55"') + '>' + T('kk_sulje_laheta') + '</button>'
      + (opts.syvennaFn ? '<button type="button" data-kvk-syvenna class="kt-nappi" onclick="' + esc(opts.syvennaFn) + '()">' + T('kk_syvenna') + '</button>' : '')
      + '<span style="font-size:11px;color:var(--ink3);align-self:center">' + T('kk_yksi_tallennus') + '</span></div>';
    return _kehys(opts.modalId || '_kvkModal', esc, opts, h);
  }
  /* Hylkää valinta -ruutu: perustelu + K3-lomake (kortit esitäytetty, muutettavissa). opts: { esc, t, lauseFn, tallennaFn, suljeFn, k3 } */
  function tmHylkaaSheetHTML(S, opts) {
    opts = opts || {}; S = S || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); };
    var h = '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px"><div data-hk-otsikko style="font-family:\'Cormorant Garamond\',serif;font-size:21px">' + T('hk_otsikko') + '</div>'
      + '<button type="button" aria-label="' + esc(_txt(opts, 'kk_peruuta')) + '" onclick="' + esc(opts.suljeFn) + '()" style="background:none;border:none;color:var(--ink3);font-size:22px;cursor:pointer;padding:0 6px">×</button></div>'
      + (S.nimi ? '<div style="font-size:11px;color:var(--ink3);margin-bottom:6px">' + esc(S.nimi) + '</div>' : '') + '<div style="font-size:12px;color:var(--ink2);margin-bottom:12px">' + T('hk_ohje') + '</div>'
      + '<div style="margin-bottom:12px"><div style="' + RASTI + ';margin-bottom:4px">' + T('hk_perustelu') + '</div><textarea id="hkPerustelu" data-hk-perustelu rows="2" maxlength="' + _K4().MAX_LAUSE + '" oninput="' + esc(opts.lauseFn) + '(this.value)" style="' + _kentta() + '">' + esc(S.perustelu || '') + '</textarea>'
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">' + T('hk_perustelu_ohje') + '</div></div>'
      + (opts.k3 ? _RV().tmTarjousOsioHTML(S.k3, Object.assign({ esc: esc, t: opts.t, pinta: opts.pinta }, opts.k3)) : '')
      + '<div style="display:flex;gap:8px;margin-top:6px"><button type="button" data-hk-laheta class="kt-nappi kt-nappi-ens" onclick="' + esc(opts.tallennaFn) + '()">' + T('hk_laheta') + '</button><button type="button" class="kt-nappi" onclick="' + esc(opts.suljeFn) + '()">' + T('kk_peruuta') + '</button></div>';
    return _kehys(opts.modalId || '_hkModal', esc, opts, h);
  }

  var API = { FI: FI, KYSYMYKSET: KYSYMYKSET, tmProfiili: tmProfiili, tmKevytKelpaa: tmKevytKelpaa, tmKkLause: tmKkLause, tmKkLauseVirhe: tmKkLauseVirhe, tmLauseEhdotukset: tmLauseEhdotukset, tmKkEhdotukset: tmKkEhdotukset,
    tmKkAlku: tmKkAlku, tmKkAsetaVastaus: tmKkAsetaVastaus, tmKkVoiTallentaa: tmKkVoiTallentaa, tmKkTallennus: tmKkTallennus, tmKkVirhe: tmKkVirhe, tmKkSheetHTML: tmKkSheetHTML,
    tmHylkaaKortit: tmHylkaaKortit, tmHylkaaAlku: tmHylkaaAlku, tmHylkaaTallennus: tmHylkaaTallennus, tmHylkaaVirhe: tmHylkaaVirhe, tmHylkaaSheetHTML: tmHylkaaSheetHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KEVYT_KATSELMUS = API;
})(typeof window !== 'undefined' ? window : this);
