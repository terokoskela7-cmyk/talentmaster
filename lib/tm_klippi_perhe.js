/* ════════════════════════════════════════════════════════════════════════
   tm_klippi_perhe.js — R6.4 Mediaviesti M1 / PR 2: pelaajan ja perheen puoli (docs/CODE_BRIEF_R6_4_MEDIAVIESTI.md kohdat 11–14; D57, D59, D62; design 19 §3). PURE (ei Firebasea, ei DOMia):
   Pelaaja_v7 ja Vanhempi_v2 ovat ohuita adaptereita. Lataa myös tm_mediaviesti.js (linkin tunnistus, tyyppinimet).
   Klippiketju = seurat/{sid}/viestit: valmentajan 'klippi' → pelaajan/huoltajan 'klippi_vastaus' (+ huoltajan 'klippi_kuittaus' = "Katsoimme yhdessä") → valmentajan kuittauslause klippi-dokumentissa.
   IKÄTASOT (tmMvNakyvyys): U8–12 'perhe' (huoltaja vastaa lapsen valinnalla + rastilla), U13–14 'valinta' (3 vaihtoehtoa + "omin sanoin" ≤200), U15+ 'lause' (yksi lause ≤200). Tuntematon ikä → 'valinta'.
   PELAAJALLE EI LUKUJA, vertailua, muiden vastauksia eikä "11/18" (§7.22) — tämä lib ei saa muiden pelaajien dokumentteja eikä laske mitään määriä. "Vastasit · valmentaja lukenut" vain kun valmentaja on oikeasti lukenut (luettu:true).
   · kpTaso(ika) → 'perhe'|'valinta'|'lause' · kpValinnat(taso, t) → [{avain, teksti}] (3 kpl; vain 'perhe'/'valinta')
   · kpKetjut(dokit, ctx) → ketjut uusin ensin (ctx: { nyt:Date, pelaajaId }) — vain näkyviä: tyyppi klippi, oma pelaajaId, nakyva_alkaen ≤ nyt, ei poistettu
   · kpNakyvat(ketjut, ctx) → Tänään-rivin ketjut (avoimet + viimeaikaiset suljetut, max 3)
   · kpVastausDokumentit(ketju, syote, ctx) → { ok, dokit:[vastaus, kuittaus?] } | { ok:false, syy } — avainjoukko = Rules v3.50 viestiPelaajanLuonti (nakyvyys 'pelaaja', luettu false, vastaanottajaUid = klipin)
   HTML (tokenit, ei hex-värejä): kpKorttiHTML · kpKetjuHTML.  Tekstit opts.t:n läpi (fi-oletus tässä; sv-avaimet määrittelemättä → docs/R6_4_MEDIAVIESTI_SV_KAANNOKSET.md).
   Dual-export: module.exports || window.TM_KLIPPI_PERHE.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kp_otsikko: 'Valmentajalta klippi', kp_perhe_otsikko: 'Katsokaa yhdessä', kp_perhe_ohje: 'Valmentaja lähetti {nimi} klipin', kp_luku_otsikko: 'Valmentajalta klippi · keskustelu',
    kp_valmentaja: 'Valmentaja', kp_lapsi_valitsee: '{nimi} valitsee itse:', kp_valitse: 'Valitse vastaus', kp_omin_sanoin: 'Sanoisitko omin sanoin?', kp_lause_ohje: 'Kirjoita yksi lause', kp_lause_kentta: 'Sinun vastauksesi',
    kp_laheta: 'Lähetä', kp_laheta_valmentajalle: 'Lähetä valmentajalle', kp_katsoimme: 'Katsoimme yhdessä', kp_katsoimme_ohje: 'huoltaja kuittaa', kp_lahetetaan: 'Lähetetään…',
    kp_huoltaja_nakee: 'Huoltaja näkee tämän keskustelun.', kp_vastasit: 'Vastasit', kp_vastattu: 'Vastaus lähetetty', kp_valmentaja_lukenut: 'valmentaja lukenut', kp_perhe_kuittasi: 'Kuittasit: katsoimme yhdessä', kp_kuittaus: 'Kuittaus',
    kp_ei_vastausta_lukutila: 'Ei vastausta vielä.', kp_lukutila_ohje: 'Näet lapsesi ja valmentajan keskustelun.', kp_lapsi_vastasi: 'Lapsi vastasi', kp_avaa: 'Avaa',
    kp_suljettu: 'Suljettu', kp_muut: 'Muut klipit',
    kp_virhe_tyhja: 'Valitse vastaus tai kirjoita lause.', kp_virhe_pitka: 'Vastaus on liian pitkä (enintään 200 merkkiä).', kp_virhe_valinta: 'Valitse jokin vaihtoehdoista.', kp_virhe_ketju: 'Klippiä ei löytynyt.', kp_virhe_lahetys: 'Vastaus ei lähtenyt',
    kp_valinta_leikkija_1: 'Katsoin ylös', kp_valinta_leikkija_2: 'Juoksin tilaan', kp_valinta_leikkija_3: 'En tiedä',
    kp_valinta_rakentaja_1: 'Näin puolustajan', kp_valinta_rakentaja_2: 'Arvasin', kp_valinta_rakentaja_3: 'En muista'
  };
  var MAX_VASTAUS = 200, MAX_VALINTA = 60, SULJETTU_PV = 14, KORTTI_MAX = 3;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; if (v && v !== k) return v; if (FI[k] != null) return FI[k]; var M = _MV(); return M && M.FI && M.FI[k] != null ? M.FI[k] : k; }   // mv_*-avaimet (linkki, tyyppinimet) tulevat tm_mediaviesti.js:stä
  function _fmt(s, m) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return m && m[k] != null ? m[k] : ''; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return null; } }
  function _MV() { return _req('TM_MEDIAVIESTI', './tm_mediaviesti.js'); }
  function _ms(t) { return t == null ? NaN : (t.toDate ? t.toDate().getTime() : (t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : new Date(t).getTime()))); }
  function _str(v) { return typeof v === 'string' ? v.trim() : ''; }

  function kpTaso(ika) {
    var n = ika == null || ika === '' ? NaN : Number(ika);
    if (!isFinite(n)) return 'valinta';
    return n <= 12 ? 'perhe' : (n <= 14 ? 'valinta' : 'lause');
  }
  function kpValinnat(taso, opts) {
    var reg = taso === 'perhe' ? 'leikkija' : (taso === 'valinta' ? 'rakentaja' : null); if (!reg) return [];
    return [1, 2, 3].map(function (i) { var a = 'kp_valinta_' + reg + '_' + i; return { avain: a, teksti: _txt(opts, a) }; });
  }

  /* dokit: pelaajan viestit-kyselyn tulos ({id, …}); ctx: { nyt (Date), pelaajaId } */
  function kpKetjut(dokit, ctx) {
    ctx = ctx || {}; var nyt = ctx.nyt instanceof Date ? ctx.nyt.getTime() : Date.now(), lista = Array.isArray(dokit) ? dokit : [];
    var klipit = [], vastaukset = [];
    lista.forEach(function (d) {
      if (!d || d.poistettu) return; if (ctx.pelaajaId && d.pelaajaId !== ctx.pelaajaId) return;
      if (d.tyyppi === 'klippi') { var alk = _ms(d.nakyva_alkaen); if (isFinite(alk) && alk > nyt) return; klipit.push(d); }   // D62: ei ennen nakyva_alkaen
      else if (d.tyyppi === 'klippi_vastaus' || d.tyyppi === 'klippi_kuittaus') vastaukset.push(d);
    });
    var MV = _MV();
    var ketjut = klipit.map(function (k) {
      var omat = vastaukset.filter(function (v) { return v.vastaus_viestille === k.id; });
      var vast = omat.filter(function (v) { return v.tyyppi === 'klippi_vastaus'; }).sort(function (a, b) { return (_ms(b.aika) || 0) - (_ms(a.aika) || 0); })[0] || null;
      var kuitt = omat.some(function (v) { return v.tyyppi === 'klippi_kuittaus' || v.kuittaus === true; });
      var t0 = _ms(k.aika) || _ms(k.nakyva_alkaen) || 0;
      return { id: k.id, klippi_id: k.klippi_id || k.id, url: k.url, domain: k.domain || '', mediatyyppi: k.mediatyyppi || 'linkki', kohta_s: k.kohta_s != null ? k.kohta_s : null, klippityyppi: k.klippityyppi || 'onnistui',
        valmentajaNimi: k.fromNimi || '', saate: k.saate || '', kysymys: k.kysymys || '', joukkueklippi: k.joukkueklippi === true, osa: k.osa || null, nakyvyys: k.nakyvyys || 'pelaaja', vastaanottajaUid: k.vastaanottajaUid || '',
        suljettu: k.tila === 'suljettu', kuittaus_lause: k.kuittaus_lause || '', t: t0,
        vastaus: vast ? { valinta: vast.valinta || '', teksti: vast.teksti || '', aika: _ms(vast.aika) || 0, luettu: vast.luettu === true } : null, perheKuittasi: kuitt,
        linkkiOk: MV && MV.tmMvLinkki ? MV.tmMvLinkki(k.url).ok === true : /^https:\/\/.+/.test(String(k.url || '')) };
    });
    ketjut.sort(function (a, b) { return (b.t || 0) - (a.t || 0); });
    return ketjut;
  }
  /* Tänään-rivi: avoimet (ei suljettu) + suljetut jotka ovat enintään SULJETTU_PV vanhoja; uusin ensin, max KORTTI_MAX */
  function kpNakyvat(ketjut, ctx) {
    ctx = ctx || {}; var nyt = ctx.nyt instanceof Date ? ctx.nyt.getTime() : Date.now(), raja = nyt - SULJETTU_PV * 86400000;
    return (Array.isArray(ketjut) ? ketjut : []).filter(function (k) { return !k.suljettu || (k.t || 0) >= raja; }).slice(0, KORTTI_MAX);
  }

  /* syote: { valinta (avain tai teksti), teksti, kuittaa (bool, vain perhe) }; ctx: { pelaajaId, uid, rooli:'pelaaja'|'huoltaja', nimi, taso, t }. Dokit ilman aika-kenttää (adapteri: serverTimestamp). */
  function kpVastausDokumentit(ketju, syote, ctx) {
    ctx = ctx || {}; syote = syote || {};
    if (!ketju || !ketju.id) return { ok: false, syy: 'ketju' };
    var taso = ctx.taso || 'valinta', valinta = '', teksti = _str(syote.teksti), v = _str(syote.valinta);
    if (taso === 'perhe' || taso === 'valinta') {
      if (v) { var os = kpValinnat(taso, ctx).filter(function (o) { return o.avain === v || o.teksti === v; })[0]; if (!os) return { ok: false, syy: 'valinta' }; valinta = os.teksti.slice(0, MAX_VALINTA); }
    }
    if (taso === 'perhe') teksti = '';   // U8–12: vain lapsen valinta (+ rasti); vapaata tekstiä ei
    if (taso === 'lause') { valinta = ''; }
    if (teksti.length > MAX_VASTAUS) return { ok: false, syy: 'pitka' };
    if (taso === 'perhe' && !valinta) return { ok: false, syy: 'tyhja' };
    if (taso === 'valinta' && !valinta && !teksti) return { ok: false, syy: 'tyhja' };
    if (taso === 'lause' && !teksti) return { ok: false, syy: 'tyhja' };
    var base = function (tyyppi) { return { tyyppi: tyyppi, pelaajaId: ctx.pelaajaId, vastaanottajaUid: ketju.vastaanottajaUid, lahettajaUid: ctx.uid, fromRole: ctx.rooli === 'huoltaja' ? 'huoltaja' : 'pelaaja', fromNimi: ctx.nimi || '', vastaus_viestille: ketju.id, nakyvyys: 'pelaaja', luettu: false, aika: null }; };
    if (!ctx.pelaajaId || !ctx.uid || !ketju.vastaanottajaUid) return { ok: false, syy: 'ketju' };
    var d = base('klippi_vastaus'); if (valinta) d.valinta = valinta; if (teksti) d.teksti = teksti;
    var dokit = [d];
    if (taso === 'perhe' && syote.kuittaa === true && ctx.rooli === 'huoltaja') { var k = base('klippi_kuittaus'); k.kuittaus = true; dokit.push(k); }   // "Katsoimme yhdessä" — vain huoltajalta (Rules)
    return { ok: true, dokit: dokit };
  }
  function kpVirhe(syy, opts) { return _txt(opts, { tyhja: 'kp_virhe_tyhja', pitka: 'kp_virhe_pitka', valinta: 'kp_virhe_valinta', ketju: 'kp_virhe_ketju' }[syy] || 'kp_virhe_lahetys'); }

  /* ── HTML ── */
  var KORTTI = 'background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin:12px 20px';
  var ASKEL = 'border-left:2px solid var(--border);padding:2px 0 2px 12px;margin:10px 0';
  var YLA = 'font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px';
  var META = 'font-size:11px;color:var(--ink3);margin-top:3px';
  var KENTTA = 'width:100%;box-sizing:border-box;background:var(--card);color:var(--text,var(--ink));border:.5px solid var(--border);border-radius:8px;padding:9px 12px;font-size:14px;font-family:inherit';
  function _kohtaTeksti(s) { if (s == null || !isFinite(s)) return ''; var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60, p = function (n) { return n < 10 ? '0' + n : '' + n; }; return h ? h + ':' + p(m) + ':' + p(x) : m + ':' + p(x); }
  function _pvm(ms) { if (!ms || !isFinite(ms)) return ''; var d = new Date(ms), vp = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la']; return vp[d.getDay()] + ' ' + d.getDate() + '.' + (d.getMonth() + 1) + '.'; }
  function _linkki(esc, T, k) {
    var ulos = k.linkkiOk ? '<a data-kp-linkki href="' + esc(k.url) + '" target="_blank" rel="noopener noreferrer" style="color:var(--teal-d,var(--teal));font-size:13px">' + T('mv_ulos') + '</a> ' : '';
    return '<div style="margin:6px 0">' + ulos + '<span data-kp-domain style="font-size:12px;color:var(--ink3)">' + esc(k.domain || '') + (k.kohta_s != null ? ' · ' + esc(_kohtaTeksti(k.kohta_s)) : '') + ' · ' + T('mv_uuteen') + '</span></div>';
  }
  function _pill(esc, akt, fn, teksti, attr) { return '<button type="button" ' + attr + ' aria-pressed="' + (akt ? 'true' : 'false') + '" onclick="' + esc(fn) + '" style="text-align:left;padding:9px 14px;margin:0 6px 6px 0;border-radius:999px;border:.5px solid ' + (akt ? 'var(--teal)' : 'var(--border)') + ';background:' + (akt ? 'var(--teal)' : 'transparent') + ';color:' + (akt ? 'var(--on-accent,var(--text))' : 'var(--text,var(--ink))') + ';font-size:13px;cursor:pointer">' + esc(teksti) + '</button>'; }

  /* opts.tila 'huoltaja' (Vanhempi_v2): klipin nakyvyys ratkaisee — 'huoltaja' (U8–12) → 'perhe' (vastaus + rasti), 'pelaaja' (U13+) → 'luku' (vain keskustelu) */
  function _tasoKetjulle(K, opts) { var t = (opts && opts.tila) || 'valinta'; return t === 'huoltaja' ? (K && K.nakyvyys === 'huoltaja' ? 'perhe' : 'luku') : t; }

  /* K: ketju (kpKetjut-alkio); S: tila { valinta, teksti, kuittaa, tallentaa }; opts: { esc, t, tila:'perhe'|'valinta'|'lause'|'luku', nimi (lapsen etunimi), huoltajaNakee (bool), valitseFn, tekstiFn, kuittaaFn, lahetaFn, avaaFn } */
  function kpKetjuHTML(K, S, opts) {
    opts = opts || {}; S = S || {}; var esc = opts.esc || _esc, T = function (k, m) { return esc(_fmt(_txt(opts, k), m)); }, tx = function (k) { return _txt(opts, k); }, taso = _tasoKetjulle(K, opts), luku = taso === 'luku';
    var tyyppiNimi = tx('mv_pelaajanimi_' + (K.klippityyppi || 'onnistui')), v = K.vastaus;
    var h = '<div data-kp-ketju="' + esc(K.id) + '">' + _linkki(esc, function (k) { return esc(tx(k)); }, K)
      + '<div style="' + META + '">' + esc((K.valmentajaNimi || tx('kp_valmentaja')) + ' · ' + _pvm(K.t)) + ' · ' + esc(tyyppiNimi) + '</div>'
      + (K.saate ? '<div data-kp-saate style="font-size:14px;color:var(--text,var(--ink));margin-top:8px">' + esc(K.saate) + '</div>' : '')
      + '<div data-kp-kysymys style="font-size:15px;font-weight:600;color:var(--text,var(--ink));margin-top:8px">' + esc(K.kysymys) + '</div>';
    if (v) {   // vastattu: lukutila + "Vastasit · valmentaja lukenut"
      var sisalto = [v.valinta, v.teksti].filter(Boolean).join(' — ');
      h += '<div style="' + ASKEL + '"><div style="' + YLA + '">' + (luku ? T('kp_lapsi_vastasi') : T('kp_vastasit')) + '</div><div data-kp-vastaus style="font-size:14px;color:var(--text,var(--ink))">' + esc(sisalto) + '</div>'
        + '<div data-kp-tila style="' + META + '">' + esc(_pvm(v.aika)) + (v.luettu ? ' · <span data-kp-lukenut>' + esc(tx('kp_valmentaja_lukenut')) + '</span>' : '') + (K.perheKuittasi ? ' · ' + esc(tx('kp_perhe_kuittasi')) : '') + '</div></div>';
    } else if (luku) {
      h += '<div data-kp-ei-vastausta style="' + META + ';margin-top:10px">' + T('kp_ei_vastausta_lukutila') + '</div>';
    } else {
      var tallenna = S.tallentaa === true, nap = function (aktiivinen) { return 'class="btn-p kt-nappi kt-nappi-ens" ' + (tallenna || !aktiivinen ? 'disabled ' : '') + 'data-kp-laheta style="width:auto;padding:9px 16px;margin:10px 0 0"'; };
      if (taso === 'perhe' || taso === 'valinta') {
        var vs = kpValinnat(taso, opts);
        h += '<div style="margin-top:12px"><div style="' + YLA + '">' + (taso === 'perhe' ? esc(_fmt(tx('kp_lapsi_valitsee'), { nimi: opts.nimi || '' })) : T('kp_valitse')) + '</div>'
          + vs.map(function (o) { return _pill(esc, S.valinta === o.avain, (opts.valitseFn || '') + "('" + o.avain + "')", o.teksti, 'data-kp-valinta="' + esc(o.avain) + '"'); }).join('') + '</div>';
        if (taso === 'valinta') h += '<div style="margin-top:6px"><div style="' + YLA + '">' + T('kp_omin_sanoin') + '</div><textarea data-kp-teksti rows="2" maxlength="' + MAX_VASTAUS + '" ' + (tallenna ? 'disabled ' : '') + 'oninput="' + esc(opts.tekstiFn || '') + '(this.value)" style="' + KENTTA + ';resize:none">' + esc(S.teksti || '') + '</textarea></div>';
        if (taso === 'perhe') h += '<label data-kp-kuittaa style="display:flex;gap:10px;align-items:center;margin-top:10px;font-size:13px;color:var(--text,var(--ink));cursor:pointer"><input type="checkbox" ' + (S.kuittaa ? 'checked ' : '') + (tallenna ? 'disabled ' : '') + 'onchange="' + esc(opts.kuittaaFn || '') + '(this.checked)"> ' + T('kp_katsoimme') + ' <span style="color:var(--ink3);font-size:11px">· ' + T('kp_katsoimme_ohje') + '</span></label>';
        var voiLahettaa = taso === 'perhe' ? !!S.valinta : (!!S.valinta || !!_str(S.teksti));
        h += '<button type="button" ' + nap(voiLahettaa) + ' onclick="' + esc(opts.lahetaFn || '') + '()">' + (tallenna ? T('kp_lahetetaan') : (taso === 'perhe' ? T('kp_laheta_valmentajalle') : T('kp_laheta'))) + '</button>';
      } else {   // 'lause' (U15+)
        h += '<div style="margin-top:12px"><div style="' + YLA + '">' + T('kp_lause_ohje') + '</div><textarea data-kp-teksti rows="3" maxlength="' + MAX_VASTAUS + '" ' + (tallenna ? 'disabled ' : '') + 'oninput="' + esc(opts.tekstiFn || '') + '(this.value)" style="' + KENTTA + ';resize:none" aria-label="' + esc(tx('kp_lause_kentta')) + '">' + esc(S.teksti || '') + '</textarea></div>'
          + '<button type="button" ' + nap(!!_str(S.teksti)) + ' onclick="' + esc(opts.lahetaFn || '') + '()">' + (tallenna ? T('kp_lahetetaan') : T('kp_laheta')) + '</button>';
      }
    }
    if (K.kuittaus_lause) h += '<div style="' + ASKEL + '"><div style="' + YLA + '">' + T('kp_kuittaus') + '</div><div data-kp-kuittaus style="font-size:14px;color:var(--text,var(--ink))">' + esc(K.kuittaus_lause) + '</div></div>';
    if (opts.huoltajaNakee && !luku) h += '<div data-kp-huoltaja-nakee style="' + META + ';margin-top:10px">' + T('kp_huoltaja_nakee') + '</div>';
    return h + '</div>';
  }

  /* Tänään-rivi (Pelaaja) / Katsokaa yhdessä (Vanhempi) / keskustelu (Vanhempi U13+). ketjut: kpNakyvat-tulos; valittuId: auki oleva; muut ketjut kompakteina riveinä.
     opts: kpKetjuHTML:n lisäksi { otsikkoAvain } */
  function kpKorttiHTML(ketjut, valittuId, S, opts) {
    opts = opts || {}; var l = Array.isArray(ketjut) ? ketjut : []; if (!l.length) return '';
    var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, v = l.filter(function (k) { return k.id === valittuId; })[0] || l[0];
    var muut = l.filter(function (k) { return k.id !== v.id; });
    var vt = _tasoKetjulle(v, opts), otsikko = vt === 'perhe' ? 'kp_perhe_otsikko' : (vt === 'luku' ? 'kp_luku_otsikko' : 'kp_otsikko'), ohje = vt === 'perhe' ? 'kp_perhe_ohje' : (vt === 'luku' ? 'kp_lukutila_ohje' : null);
    var h = '<div class="kt-kortti" data-kp-kortti style="' + KORTTI + '"><div class="kt-otsikko-pieni" data-kp-otsikko style="' + YLA + '">' + T(otsikko) + '</div>'
      + (ohje ? '<div style="font-size:12px;color:var(--ink3);margin-bottom:4px">' + esc(_fmt(_txt(opts, ohje), { nimi: opts.nimi || '' })) + '</div>' : '')
      + kpKetjuHTML(v, v.id === valittuId || l.length === 1 ? S : {}, opts);
    if (muut.length) h += '<div style="margin-top:12px;border-top:.5px solid var(--border);padding-top:8px"><div style="' + YLA + '">' + T('kp_muut') + '</div>' + muut.map(function (k) {
      return '<button type="button" data-kp-avaa="' + esc(k.id) + '" onclick="' + esc((opts.avaaFn || '') + "('" + k.id + "')") + '" style="display:block;width:100%;text-align:left;background:none;border:none;border-top:.5px solid var(--border);padding:8px 0;color:var(--text,var(--ink));font-size:13px;cursor:pointer">' + esc(k.kysymys) + ' <span style="color:var(--ink3);font-size:11px">· ' + esc(k.suljettu ? _txt(opts, 'kp_suljettu') : (k.vastaus ? _txt(opts, 'kp_vastattu') : _txt(opts, 'kp_avaa'))) + '</span></button>'; }).join('') + '</div>';
    return h + '</div>';
  }

  var API = { FI: FI, MAX_VASTAUS: MAX_VASTAUS, SULJETTU_PV: SULJETTU_PV, KORTTI_MAX: KORTTI_MAX, kpTaso: kpTaso, kpValinnat: kpValinnat, kpKetjut: kpKetjut, kpNakyvat: kpNakyvat, kpVastausDokumentit: kpVastausDokumentit, kpVirhe: kpVirhe, kpKetjuHTML: kpKetjuHTML, kpKorttiHTML: kpKorttiHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KLIPPI_PERHE = API;
})(typeof window !== 'undefined' ? window : this);
