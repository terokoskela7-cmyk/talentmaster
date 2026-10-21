/* ════════════════════════════════════════════════════════════════════════
   tm_kt_keskustelu.js — K4b (erä 84): KEHITYSKESKUSTELU uudella sivulla (D100-sheet). Logiikka + HTML + tekstit; PURE (ei Firebasea, ei globaalia DOM-tilaa). Dual-export: module.exports || window.TM_KT_KESKUSTELU.
   Sheetin ohjain (tila, luonnos, kirjoitus): lib/tm_kt_keskustelu_sheet.js. Vanha puoli (Master, VP) ennallaan.
   VAIN SISÄINEN (PM 21.10.2026): ei "Näytä myös pelaajalle" -kytkintä, ei pelaajadokumentin uusia kenttiä, ei pelaajanäkymää (K4b2 myöhemmin).
   Rakenne: 1 Kauden tavoite ja jaksot · 2 Pelaajan oma arvio ja valmentajien arvio (D3, erot "Hyvä aihe keskusteluun") · 3 Neljä aluetta · 4 Sovitut asiat ja seuraava askel · 5 Kauden tavoitteen tarkistus · 6 Pelaajaraportti.
   KIRJOITUS (yksi batch): reviewit/{pvm} (set merge): tyyppi 'kehityskeskustelu', pvm, sovitut_sisainen {teksti, lahde, uid, tallennettu}, kk_tallennettu, kk_kausitavoite?, kk_tekija_uid, kk_tekija_rooli
     + pelaajadokumentti review_viimeisin_pvm / review_viimeisin_tyyppi:'kehityskeskustelu' (tmKirjaaKatselmus → tmRytmi nollautuu; sovellus ja push samaa mieltä).
     Sama dokumentti kuin jakson yhteenvedolla (lause_sisainen, kevyt, hylkays_sisainen) mutta eri kentät → merge ei ylikirjoita toisen kenttiä.
   · tmKeNelikulma(p) → [{ avain, tila:'cur'|'fresh'|'none' }]  (jaksofokus.domeeni = nykyinen; jaksofokus_historia[].domeeni = arvioitu) — sama laskenta kuin VP:n Reviewit-rivillä
   · tmKeKausiTila(lataus) → { tila:'voimassa'|'ehdotus'|'ei', tavoite, nimi }  ·  tmKeLataaKausi(d) → Promise<lataus>  ·  tmKeJaksot(p, o) · tmKeD3Erot(pisteet)
   · tmKeAlku(p, o) · tmKeVoiTallentaa(S) · tmKeTallennus(p, S, ctx) → { ok, reviewitPvm, reviewitData, pikakentat, avaaKausi } | { ok:false, syy }
   · tmKeHistoriaRivit(reviewitDocs) → [{ pvm, teksti, lahde }] (uusin ensin)  ·  tmKeSheetHTML(S, opts)
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kes_otsikko: 'Kehityskeskustelu', kes_tallenna: 'Tallenna kehityskeskustelu', kes_sulje: 'Sulje', kes_tallennettu: 'Kehityskeskustelu kirjattu ✓',
    kes_sisainen: 'Sisäinen kirjaus: vain henkilökunta näkee tämän. Pelaaja ja huoltaja eivät näe sitä.',
    kes_ohje_ei_tavoitetta: 'Kehityskeskustelun voi kirjata, kun pelaajalle on asetettu kauden tavoite.', kes_aseta_tavoite: 'Aseta kauden tavoite',
    kes_ohje_ehdotus: 'Kauden tavoite odottaa hyväksyntää. Hyväksy se, niin kehityskeskustelun voi kirjata.', kes_avaa_tavoite: 'Avaa kauden tavoite',
    kes_lataus_virhe: 'Kauden tavoitteen lataus epäonnistui.', kes_yrita_uudelleen: 'Yritä uudelleen',
    kes_s1: 'Kauden tavoite ja jaksot', kes_s1_henkilokunta: 'Näkyy vain henkilökunnalle.', kes_kausi: 'Kauden tavoite: {nimi}', kes_jakso_nyt: 'Jakso nyt: {nimi}', kes_jakso_nyt_vk: 'Jakso nyt: {nimi} · vk {n}/{yht}', kes_jakso_ei: 'Ei käynnissä olevaa jaksoa.',
    kes_jaksot_aiemmin: 'Edelliset jaksot', kes_tulos_parani: 'parani', kes_tulos_ennallaan: 'ennallaan', kes_tulos_vaihda: 'fokus vaihdettiin', kes_jaksot_ei: 'Ei vielä päätettyjä jaksoja.',
    kes_s2: 'Pelaajan oma arvio ja valmentajien arvio', kes_s2_ei: 'Ei vielä pelaajan eikä valmentajan arviota.', kes_aihe_otsikko: 'Hyvä aihe keskusteluun', kes_aihe_rivi: '{alue}: arviot eroavat', kes_aihe_ei: 'Arviot ovat lähellä toisiaan.', kes_pelihavainnot: 'Pelihavaintoja: {n}',
    kes_s3: 'Neljä aluetta', kes_alue_fyysinen: 'Fyysinen', kes_alue_teknis_taktinen: 'Tekniikka ja pelitaito', kes_alue_psyykkinen: 'Henkinen', kes_alue_sosiaalinen: 'Sosiaalinen',
    kes_alue_cur: 'nykyinen fokus', kes_alue_fresh: 'arvioitu', kes_alue_none: 'ei arvioitu',
    kes_s4: 'Sovitut asiat ja seuraava askel', kes_s4_ohje: 'Kirjaa, mitä sovittiin ja mikä on seuraava askel. Vain henkilökunta näkee tekstin.', kes_s4_virhe_tyhja: 'Kirjoita sovitut asiat ennen tallennusta.', kes_s4_virhe_pitka: 'Teksti on liian pitkä.',
    kes_s5: 'Kauden tavoitteen tarkistus', kes_pidetaan: 'Tavoite pysyy', kes_muutetaan: 'Tavoitetta muutetaan', kes_muutetaan_ohje: 'Tallennuksen jälkeen avautuu kauden tavoite.',
    kes_raportti: 'Pelaajaraportti ↗', kes_lataa: 'Ladataan…', kes_virhe: 'Tallennus epäonnistui', kes_offline: 'Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.'
  };
  var MAX_TEKSTI = 1000;
  var ALUEET = ['fyysinen', 'teknis_taktinen', 'psyykkinen', 'sosiaalinen'];
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _fmt(str, o) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function _txt(o, k) {
    var v = (o && typeof o.t === 'function') ? o.t(k) : k; if (v && v !== k) return v;
    if (FI[k] != null) return FI[k];
    var P = _g('TM_KT_POLKU', './tm_kt_polku.js'); if (P && P.FI && P.FI[k] != null) return P.FI[k];
    var MK = _g('TM_MITTAUKSET_FI', './tm_mittaukset_fi.js'); if (MK && MK[k] != null) return MK[k];   // K4c-avaimet (mk_*) uudelleenkäytössä: ei duplikaatteja sv-erään
    var MV = _g('TM_MEDIAVIESTI', './tm_mediaviesti.js'); return MV && MV.FI && MV.FI[k] != null ? MV.FI[k] : k;
  }
  function _ms(t) { return t == null ? NaN : (t.toDate ? t.toDate().getTime() : (t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : new Date(t).getTime()))); }
  function _pvm(x) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x || '')); if (m) return (+m[3]) + '.' + (+m[2]) + '.'; var ms = _ms(x); if (!isFinite(ms)) return ''; var d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.'; }

  /* ── Neljä aluetta (ent. Nelikulma): sama laskenta kuin VP:n Reviewit-rivillä (siirretty tänne; VP delegoi) ── */
  function tmKeNelikulma(p) {
    var cur = (p && p.jaksofokus && p.jaksofokus.domeeni) || null, katetut = {};
    (Array.isArray(p && p.jaksofokus_historia) ? p.jaksofokus_historia : []).forEach(function (h) { if (h && h.domeeni) katetut[h.domeeni] = 1; });
    return ALUEET.map(function (a) { return { avain: a, tila: (a === cur) ? 'cur' : (katetut[a] ? 'fresh' : 'none') }; });
  }

  /* ── Kauden tavoite: ehto = VOIMASSA OLEVA tavoite (tmKtPolkuKausi != null); ehdotus/luonnos → odottaa hyväksyntää; muuten ei tavoitetta ── */
  function _idp() {
    try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_idp.js'); } catch (e) { /* selain */ }
    return root && typeof root.idpKausivuosi === 'function' ? root : null;
  }
  function tmKeKausiTila(lataus) {
    var P = _g('TM_KT_POLKU', './tm_kt_polku.js'), l = lataus || {}, k = P && l.tavoite ? P.tmKtPolkuKausi(l.tavoite) : null;
    if (k) return { tila: 'voimassa', tavoite: l.tavoite, nimi: k.nimi || k.omin || '' };
    if (l.luonnos || (l.tavoite && l.tavoite.status === 'ehdotettu')) return { tila: 'ehdotus', tavoite: null, nimi: '' };
    return { tila: 'ei', tavoite: null, nimi: '' };
  }
  /* d: { db, sid, pid, nyt } → Promise<{ tavoite, luonnos }>  (kuluva vuosi, vuodenvaihteessa edellinen — sama valinta kuin Masterin _mIdpLataa) */
  function tmKeLataaKausi(d) {
    d = d || {}; var I = _idp(); if (!d.db || !d.sid || !d.pid || !I) return Promise.resolve({ tavoite: null, luonnos: null });
    var nyt = d.nyt || new Date(), vuosi = I.idpKausivuosi(nyt), ed = String(Number(vuosi) - 1);
    var col = d.db.collection('seurat').doc(d.sid).collection('pelaajat').doc(d.pid).collection('idp_kausi');
    var lue = function (id) { return col.doc(id).get().then(function (s) { return s && s.exists ? ((s.data() || {}).tavoitteet || null) : null; }); };
    return lue(vuosi).then(function (arr) {
      var kasi = function (edArr) { var v = I.idpValitseKahdestaVuodesta(arr, vuosi, edArr, ed); return { tavoite: v.tavoite || null, luonnos: v.luonnos || null }; };
      if (I.idpJaaVoimassaJaEhdotus(arr).tavoite) return kasi(null);
      return lue(ed).catch(function () { return null; }).then(kasi);
    });
  }

  /* ── Jaksot lyhyesti: nykyinen + 3 viimeisintä päätettyä ── */
  function tmKeJaksot(p, o) {
    o = o || {}; var jf = p && p.jaksofokus, nimi = function (a, n) { return typeof o.nimiFn === 'function' ? o.nimiFn(a, n) : n; };
    var nyt = jf && (jf.konsepti_avain || jf.konsepti_nimi) && jf.tila !== 'valittavana' ? { nimi: nimi(jf.konsepti_avain, jf.konsepti_nimi) || jf.konsepti_avain, vk: null } : null;
    if (nyt) {   // viikko n/yht: YKSI sääntö lib/tm_aloita_jakso.js (tmJaksoTila.rivitila.vk) — ei omaa viikkokaavaa
      var AJ = _g('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'), t = null; try { t = AJ && AJ.tmJaksoTila ? AJ.tmJaksoTila(p, { nyt: o.nyt != null ? new Date(_ms(o.nyt)) : new Date() }) : null; } catch (e) { t = null; }
      if (t && t.rivitila && t.rivitila.vk) nyt.vk = { n: t.rivitila.vk.n, yht: t.rivitila.vk.yht };
    }
    var l = (Array.isArray(p && p.jaksofokus_historia) ? p.jaksofokus_historia : []).filter(function (h) { return h && typeof h === 'object' && (h.konsepti_nimi || h.konsepti_avain) && h.paattyi; })
      .sort(function (x, y) { return (_ms(y.paattyi) || 0) - (_ms(x.paattyi) || 0); }).slice(0, 3)
      .map(function (h) { return { nimi: nimi(h.konsepti_avain, h.konsepti_nimi) || h.konsepti_avain, tulos: h.tulos === 'parani' || h.tulos === 'ennallaan' || h.tulos === 'vaihda' ? h.tulos : null, pvm: h.suljettu || h.paattyi }; });
    return { nyt: nyt, aiemmat: l };
  }

  /* ── D3: erot (pelaaja / valmentaja / VP) ≥ 1.5 → "Hyvä aihe keskusteluun". Lähde d3_viimeisin.pisteet (sama kuin renderD3VertailuHTML). Pelaajalle ei näytetä lukuja. ── */
  function _d3Dims() { var N = _g('TM_EERIKKILA_NORMIT', './tm_eerikkila_normit.js'); return (N && N.D3_DIMS) || (root && root.D3_DIMS) || []; }
  function tmKeD3Erot(pisteet) {
    if (!pisteet || typeof pisteet !== 'object') return [];
    return _d3Dims().map(function (d) {
      var pt = pisteet[d.key] || {}, v = [pt.pelaaja, pt.valmentaja, pt.vp].filter(function (x) { return typeof x === 'number'; });
      return v.length >= 2 && Math.max.apply(null, v) - Math.min.apply(null, v) >= 1.5 ? { key: d.key, nimi: d.nimi } : null;
    }).filter(Boolean);
  }
  function _d3Html(pisteet, opts) {   // uusi sivu: otsikko "Psyykkinen arvio" ja sarakkeet "Pelaaja / Valmentajat / VP" (valinnainen parametri; vanha Master/VP-renderöinti ennallaan)
    var f = (root && root.renderD3VertailuHTML) || (function () { var N = _g('TM_EERIKKILA_NORMIT', './tm_eerikkila_normit.js'); return N && N.renderD3VertailuHTML; })();
    return typeof f === 'function' ? f(pisteet, { otsikko: _esc(_txt(opts, 'mk_d3_otsikko')), sarakkeet: [_esc(_txt(opts, 'mv_pelaaja')), _esc(_txt(opts, 'mk_c_valmentaja')), _esc(_txt(opts, 'mk_c_vp'))], kuilu: _esc(_txt(opts, 'kes_aihe_otsikko')) }) : '';
  }

  /* ── Tila ja validointi ── */
  function tmKeAlku(p, o) {
    o = o || {};
    return { pid: p && p.id, nimi: o.nimi || '', lahde: o.lahde === 'vp' ? 'vp' : 'valmentaja', lataa: true, virhe: false, kausi: { tila: 'ei', tavoite: null, nimi: '' }, sovitut: '', kausiValinta: null, tallentaa: false, virheViesti: '' };
  }
  function tmKeVoiTallentaa(S) {
    var t = String((S && S.sovitut) || '').trim();
    if (!t) return { ok: false, syy: 'tyhja' };
    if (t.length > MAX_TEKSTI) return { ok: false, syy: 'pitka' };
    return { ok: true, syy: null };
  }
  function tmKeVirhe(syy, opts) { return _txt(opts, syy === 'pitka' ? 'kes_s4_virhe_pitka' : 'kes_s4_virhe_tyhja'); }
  /* ctx: { pvm 'YYYY-MM-DD' (paikallinen päivä), nytISO, uid, rooli, superAdmin }. Tallentaa vain jos kausitavoite on voimassa (sama ehto kuin sheetin lomake). */
  function tmKeTallennus(p, S, ctx) {
    ctx = ctx || {}; var v = tmKeVoiTallentaa(S); if (!v.ok) return { ok: false, syy: v.syy };
    if (!S || !S.kausi || S.kausi.tila !== 'voimassa') return { ok: false, syy: 'ei_tavoitetta' };
    var KS = _g('TM_KEHITYSSILMUKKA', './tm_kehityssilmukka.js'); if (!KS || typeof KS.tmKirjaaKatselmus !== 'function') return { ok: false, syy: 'ei_lib' };
    var lahde = (ctx.superAdmin || ['vp', 'urheilutoimenjohtaja'].indexOf(ctx.rooli) >= 0) ? 'vp' : 'valmentaja', nyt = ctx.nytISO || new Date().toISOString();
    var kv = S.kausiValinta === 'pidetaan' || S.kausiValinta === 'muutetaan' ? S.kausiValinta : undefined;
    var plan = KS.tmKirjaaKatselmus(p || null, { tyyppi: 'kehityskeskustelu', pvm: ctx.pvm,
      sovitut_sisainen: { teksti: String(S.sovitut).trim(), lahde: lahde, uid: ctx.uid || null, tallennettu: nyt },
      kk_tallennettu: nyt, kk_kausitavoite: kv, kk_tekija_uid: ctx.uid || null, kk_tekija_rooli: ctx.superAdmin ? 'super_admin' : (ctx.rooli || 'valmentaja') });
    return { ok: true, reviewitPvm: plan.reviewitPvm, reviewitData: plan.reviewitData, pikakentat: plan.pikakentat, avaaKausi: kv === 'muutetaan' };
  }

  /* ── Historia: reviewit-dokumentit joissa kk_tallennettu + sovitut_sisainen.teksti ── */
  function tmKeHistoriaRivit(docs) {
    var ulos = []; if (!docs || typeof docs !== 'object') return ulos;
    Object.keys(docs).forEach(function (pvm) {
      var d = docs[pvm], s = d && d.sovitut_sisainen, t = s && typeof s.teksti === 'string' ? s.teksti.trim() : '';
      if (d && typeof d.kk_tallennettu === 'string' && t) ulos.push({ pvm: pvm, teksti: t, lahde: s.lahde === 'vp' ? 'vp' : 'valmentaja' });
    });
    return ulos.sort(function (a, b) { return a.pvm < b.pvm ? 1 : a.pvm > b.pvm ? -1 : 0; });
  }

  /* ── HTML ── */
  var RASTI = 'font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3)';
  function _sek(esc, otsikko, sisalto, attr) { return '<section ' + (attr || '') + ' style="margin:0 0 16px"><div style="font-size:13px;font-weight:600;margin-bottom:6px">' + esc(otsikko) + '</div>' + sisalto + '</section>'; }
  function _pill(esc, on, fn, teksti, attr) { return '<button type="button" ' + attr + ' aria-pressed="' + (on ? 'true' : 'false') + '" onclick="' + esc(fn) + '" style="font-size:12.5px;border-radius:8px;padding:9px 12px;min-height:44px;cursor:pointer;border:.5px solid ' + (on ? 'var(--teal)' : 'var(--border)') + ';background:' + (on ? 'var(--teal-bg,rgba(40,176,144,.12))' : 'transparent') + ';color:' + (on ? 'var(--teal)' : 'var(--ink2)') + ';font-weight:' + (on ? '600' : '400') + '">' + esc(teksti) + '</button>'; }
  function _nappi(esc, teksti, fn, attr, ens) { return '<button type="button" class="kt-nappi' + (ens ? ' kt-nappi-ens' : '') + '" ' + (attr || '') + ' onclick="' + esc(fn) + '">' + esc(teksti) + '</button>'; }
  /* opts: { esc, t, nimiFn(avain,nimi), p (pelaaja), nyt, sovitutFn, kausiFn(v), tallennaFn, suljeFn, asetaFn, uudelleenFn, raporttiFn } — fn-nimet = window-funktioita */
  function tmKeSheetHTML(S, opts) {
    opts = opts || {}; S = S || {}; var esc = opts.esc || _esc, T = function (k, m) { return _fmt(_txt(opts, k), m); }, p = opts.p || {}, k = S.kausi || {};
    if (S.lataa) return '<div data-kes-lataa style="font-size:13px;color:var(--ink2)">' + esc(T('kes_lataa')) + '</div>';
    if (S.virhe) return '<div data-kes-virhe role="alert" style="font-size:13px;color:var(--amber);margin-bottom:10px">' + esc(T('kes_lataus_virhe')) + '</div>' + _nappi(esc, T('kes_yrita_uudelleen'), opts.uudelleenFn + '()', 'data-kes-uudelleen');
    if (k.tila === 'ei') return '<div data-kes-ohje="ei" style="font-size:13px;color:var(--ink2);margin-bottom:12px">' + esc(T('kes_ohje_ei_tavoitetta')) + '</div>' + _nappi(esc, T('kes_aseta_tavoite'), opts.asetaFn + '()', 'data-kes-aseta', true);
    if (k.tila === 'ehdotus') return '<div data-kes-ohje="ehdotus" style="font-size:13px;color:var(--ink2);margin-bottom:12px">' + esc(T('kes_ohje_ehdotus')) + '</div>' + _nappi(esc, T('kes_avaa_tavoite'), opts.asetaFn + '()', 'data-kes-aseta', true);
    var J = tmKeJaksot(p, { nimiFn: opts.nimiFn, nyt: opts.nyt });
    var h = '<div data-kes-lomake style="font-size:11px;color:var(--ink3);margin-bottom:12px">' + esc(T('kes_sisainen')) + '</div>';
    /* 1 · Kauden tavoite ja jaksot */
    var s1 = '<div data-kes-kausi style="font-size:13px;color:var(--ink)">' + esc(T('kes_kausi', { nimi: k.nimi })) + '</div>'
      + '<div data-kes-jakso style="font-size:13px;color:var(--ink2);margin-top:3px">' + esc(J.nyt ? (J.nyt.vk ? T('kes_jakso_nyt_vk', { nimi: J.nyt.nimi, n: J.nyt.vk.n, yht: J.nyt.vk.yht }) : T('kes_jakso_nyt', { nimi: J.nyt.nimi })) : T('kes_jakso_ei')) + '</div>'
      + '<div style="' + RASTI + ';margin:8px 0 3px">' + esc(T('kes_jaksot_aiemmin')) + '</div>'
      + (J.aiemmat.length ? J.aiemmat.map(function (a) { return '<div data-kes-aiempi style="font-size:12.5px;color:var(--ink2)">' + esc([a.nimi, _pvm(a.pvm), a.tulos ? T('kes_tulos_' + a.tulos) : ''].filter(Boolean).join(' · ')) + '</div>'; }).join('') : '<div style="font-size:12.5px;color:var(--ink3)">' + esc(T('kes_jaksot_ei')) + '</div>')
      + '<div style="font-size:10.5px;color:var(--ink3);margin-top:4px">' + esc(T('kes_s1_henkilokunta')) + '</div>';
    h += _sek(esc, T('kes_s1'), s1, 'data-kes-s="1"');
    /* 2 · Pelaajan oma arvio vs valmentajien arvio */
    var pis = p.d3_viimeisin && p.d3_viimeisin.pisteet, erot = tmKeD3Erot(pis), s2 = '';
    if (pis && Object.keys(pis).length) {
      s2 += _d3Html(pis, opts);
      s2 += '<div data-kes-aihe style="margin-top:8px"><div style="' + RASTI + ';margin-bottom:3px">' + esc(T('kes_aihe_otsikko')) + '</div>'
        + (erot.length ? erot.map(function (e) { return '<div data-kes-ero style="font-size:12.5px;color:var(--amber)">' + esc(T('kes_aihe_rivi', { alue: e.nimi })) + '</div>'; }).join('') : '<div style="font-size:12.5px;color:var(--ink3)">' + esc(T('kes_aihe_ei')) + '</div>') + '</div>';
    } else s2 += '<div style="font-size:12.5px;color:var(--ink3)">' + esc(T('kes_s2_ei')) + '</div>';
    if (Number(p.adar_havaintoja) > 0) s2 += '<div data-kes-havainnot style="font-size:12.5px;color:var(--ink2);margin-top:6px">' + esc(T('kes_pelihavainnot', { n: Number(p.adar_havaintoja) })) + '</div>';
    h += _sek(esc, T('kes_s2'), s2, 'data-kes-s="2"');
    /* 3 · Neljä aluetta */
    var s3 = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">' + tmKeNelikulma(p).map(function (a) {
      return '<div data-kes-alue="' + a.avain + '" data-kes-alue-tila="' + a.tila + '" style="border:.5px solid var(--border);border-left:2px solid ' + (a.tila === 'none' ? 'var(--ink3)' : 'var(--teal)') + ';border-radius:7px;padding:8px 10px;' + (a.tila === 'none' ? 'opacity:.7' : '') + '"><div style="font-size:12.5px;color:var(--ink)">' + esc(T('kes_alue_' + a.avain)) + '</div><div style="font-size:11px;color:' + (a.tila === 'cur' ? 'var(--teal)' : 'var(--ink3)') + ';margin-top:2px">' + esc(T('kes_alue_' + a.tila)) + '</div></div>';
    }).join('') + '</div>';
    h += _sek(esc, T('kes_s3'), s3, 'data-kes-s="3"');
    /* 4 · Sovitut asiat ja seuraava askel */
    var s4 = '<div style="font-size:11px;color:var(--ink3);margin-bottom:4px">' + esc(T('kes_s4_ohje')) + '</div>'
      + '<textarea id="kesSovitut" data-kes-sovitut rows="5" maxlength="' + MAX_TEKSTI + '" aria-label="' + esc(T('kes_s4')) + '" oninput="' + esc(opts.sovitutFn) + '(this.value)" style="width:100%;box-sizing:border-box;background:var(--bg2,var(--card));color:var(--ink);border:.5px solid var(--border);border-radius:8px;padding:9px 10px;font:inherit;font-size:13px;resize:vertical">' + esc(S.sovitut || '') + '</textarea>';
    h += _sek(esc, T('kes_s4'), s4, 'data-kes-s="4"');
    /* 5 · Kauden tavoitteen tarkistus */
    var s5 = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + _pill(esc, S.kausiValinta === 'pidetaan', opts.kausiFn + "('pidetaan')", T('kes_pidetaan'), 'data-kes-kausi-valinta="pidetaan"') + _pill(esc, S.kausiValinta === 'muutetaan', opts.kausiFn + "('muutetaan')", T('kes_muutetaan'), 'data-kes-kausi-valinta="muutetaan"') + '</div>'
      + (S.kausiValinta === 'muutetaan' ? '<div style="font-size:11px;color:var(--ink3);margin-top:4px">' + esc(T('kes_muutetaan_ohje')) + '</div>' : '');
    h += _sek(esc, T('kes_s5'), s5, 'data-kes-s="5"');
    /* 6 · Pelaajaraportti + tallennus */
    var voi = tmKeVoiTallentaa(S).ok && !S.tallentaa;
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:6px"><button type="button" data-kes-tallenna class="kt-nappi kt-nappi-ens" onclick="' + esc(opts.tallennaFn) + '()"' + (voi ? '' : ' aria-disabled="true" style="opacity:.55"') + '>' + esc(T('kes_tallenna')) + '</button>'
      + _nappi(esc, T('kes_raportti'), opts.raporttiFn + '(' + JSON.stringify(String(S.pid || '')) + ')', 'data-kes-raportti') + '</div>';
    return h;
  }

  var API = { FI: FI, MAX_TEKSTI: MAX_TEKSTI, ALUEET: ALUEET, tmKeNelikulma: tmKeNelikulma, tmKeKausiTila: tmKeKausiTila, tmKeLataaKausi: tmKeLataaKausi, tmKeJaksot: tmKeJaksot, tmKeD3Erot: tmKeD3Erot, tmKeAlku: tmKeAlku, tmKeVoiTallentaa: tmKeVoiTallentaa, tmKeVirhe: tmKeVirhe,
    tmKeTallennus: tmKeTallennus, tmKeHistoriaRivit: tmKeHistoriaRivit, tmKeSheetHTML: tmKeSheetHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_KESKUSTELU = API;
})(typeof window !== 'undefined' ? window : this);
