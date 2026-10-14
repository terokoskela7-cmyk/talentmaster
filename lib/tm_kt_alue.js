/* ════════════════════════════════════════════════════════════════════════
   tm_kt_alue.js — PR B (D172–D174, mockup 34; aikaistettu lokakuuhun): YDINVAHVUUDEN ALUE KLIKKAAMALLA, sheetinä uudella sivulla (D100, D248). Dual-export: module.exports || window.TM_KT_ALUE.
   PURE-ydin (aluejako, ehdotus, kirjoitus, sheet-HTML) + sheet-tehdas tmKtAlueSheet(env) (adapteri injektoi DB:n, sheet-hallinnan, toastin).
   · tmKtAlueet(pelimuoto, normisto?)       → [{avain, nimi, x, y, w, h}] — pelipaikka-alueet + maalivahti: '8v8' 6 aluetta · '11v11' 8 aluetta · '5v5' [] (ei aluevalintaa, D173). Koordinaatisto 0–100 × 0–140, hyökkäys ylös (D174); normisto (§41) voi antaa omat jaot { '8v8': […], … }
   · tmKtAlueAvaimella(muoto, avain)        → alue | null
   · tmKtAlueAvain(p, muoto)                → avain | null: ydinvahvuus.alue_avain jos se kuuluu jakoon ja alue täsmää, muuten täsmäävä alue geometrialla, muuten alueen keskipisteen alue (pelimuoto vaihtunut)
   · tmKtAlueEhdotus(p, ctx)                → avain | null: (1) seuran linja ctx.linja.pelipaikkaAlueet[positio] (avain tai {muoto: avain}), (2) TalentMasterin pelipaikkadata TM_TT_PELIPAIKAT[positio].oletusalue (avain tai {muoto: avain}); kelvoton avain ohitetaan; EI arvausta — ei dataa → null (nykydatalla ei esivalintaa)
   · tmKtAlueKirjoitus(p, avain, muoto, ctx{uid, nyt}) → { ok, polut:{ydinvahvuus.alue {x,y,w,h}, .asetti_uid, .asetettu_pvm, .alue_avain}, virhe } (tmAlueKirjoitus, lib/tm_kentta_spec.js; Rules v3.64 sallii)
   · tmKtAlueMahdollinen(joukkueDoc, ctx)   → boolean: false vain kun joukkueen pelimuodot ovat täsmälleen ['5v5'] (silloin linkkiä "Aseta ydinvahvuus kentälle" ei näytetä lainkaan)
   · tmKtAlueSheetHTML(S, c) / tmKtAlueCss() — valinta: Kenttä (tm_kentta.js, koko kenttä, ilman aluetta) + napautettavat vyöhykkeet; valittu korostuu; ehdotus-merkintä
   · tmKtAlueSheet(env)                     → { avaa(pid), muoto(m), valitse(avain), tallenna(), sulje() }; pelimuoto kysytään kerran jos joukkueelta puuttuu (joukkueet/{jid}.pelimuodot, B1) ja tallennetaan samassa batchissa
   Värit vain tokeneilla. Tekstit c.t:n läpi (FI-oletukset FI, sv-erä 48).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    ka_otsikko: 'Ydinvahvuuden alue', ka_ohje: 'Napauta aluetta, jossa ydinvahvuus näkyy pelissä.', ka_hyokkays: '↑ hyökkäys', ka_oma_maali: 'oma maali ↓', ka_ehdotus: 'ehdotus',
    ka_muoto_kysymys: 'Mikä on joukkueen pelimuoto?', ka_muoto_ohje: 'Kysytään kerran. Vastaus tallennetaan joukkueelle.', ka_pelimuoto: 'Pelimuoto', ka_5v5: 'Pelimuodossa 5v5 ei valita aluetta.',
    ka_tallenna: 'Tallenna alue', ka_tallenna_muoto: 'Tallenna pelimuoto', ka_valitse_ensin: 'Napauta ensin aluetta.', ka_valittu: 'Valittu alue', ka_tallennettu: 'Alue tallennettu ✓', ka_muoto_tallennettu: 'Pelimuoto tallennettu ✓',
    ka_virhe: 'Alueen tallennus epäonnistui', ka_aseta: 'Aseta ydinvahvuus kentälle', ka_vaihda: 'Vaihda aluetta', ka_aloita_ydinvahvuudesta: 'Aloita jakso ydinvahvuudesta', ka_alue_merkitty: 'Ydinvahvuus "{nimi}" on merkitty kentälle {pvm} Jaksoa ei ole aloitettu.', ka_alue_merkitty_ilman_nimea: 'Ydinvahvuus on merkitty kentälle {pvm} Jaksoa ei ole aloitettu.', ka_valikko: 'Alueen valinnat', ka_peruuta: 'Peruuta', ka_ei_oikeutta: 'Sinulla ei ole oikeutta asettaa aluetta.',
    ka_n_karki: 'Kärki', ka_n_vasen_laita: 'Vasen laita', ka_n_oikea_laita: 'Oikea laita', ka_n_keskusta: 'Keskusta', ka_n_puolustus: 'Puolustus', ka_n_maalivahti: 'Maalivahti',
    ka_n_vasen_puolustaja: 'Vasen puolustaja', ka_n_oikea_puolustaja: 'Oikea puolustaja', ka_n_keskipuolustus: 'Keskipuolustus'
  };
  /* Mockup 34: [avain, x, y, w, h] — yhteinen koordinaatisto 0–100 × 0–140; jaot peittävät kentän kokonaan, ei päällekkäisyyttä */
  var ALUEET = {
    '8v8': [['karki', 25, 0, 50, 35], ['vasen_laita', 0, 0, 25, 96], ['oikea_laita', 75, 0, 25, 96], ['keskusta', 25, 35, 50, 61], ['puolustus', 0, 96, 100, 26], ['maalivahti', 0, 122, 100, 18]],
    '11v11': [['karki', 25, 0, 50, 35], ['vasen_laita', 0, 0, 25, 70], ['oikea_laita', 75, 0, 25, 70], ['keskusta', 25, 35, 50, 61], ['vasen_puolustaja', 0, 70, 25, 52], ['oikea_puolustaja', 75, 70, 25, 52], ['keskipuolustus', 25, 96, 50, 26], ['maalivahti', 0, 122, 100, 18]]
  };
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : k); }

  function tmKtAlueet(pelimuoto, normisto) {
    var lahde = normisto && normisto[pelimuoto] ? normisto[pelimuoto] : ALUEET[pelimuoto];
    if (!Array.isArray(lahde)) return [];
    return lahde.map(function (r) { return Array.isArray(r) ? { avain: r[0], nimi: FI['ka_n_' + r[0]] || r[0], x: r[1], y: r[2], w: r[3], h: r[4] } : Object.assign({ nimi: FI['ka_n_' + r.avain] || r.avain }, r); });
  }
  function tmKtAlueAvaimella(muoto, avain, normisto) { return tmKtAlueet(muoto, normisto).filter(function (a) { return a.avain === avain; })[0] || null; }
  function _sama(a, b) { return Math.abs(a.x - b.x) < 0.11 && Math.abs(a.y - b.y) < 0.11 && Math.abs(a.w - b.w) < 0.11 && Math.abs(a.h - b.h) < 0.11; }
  function tmKtAlueAvain(p, muoto, normisto) {
    var yv = p && p.ydinvahvuus, a = yv && yv.alue; if (!a || typeof a !== 'object') return null; var lista = tmKtAlueet(muoto, normisto); if (!lista.length) return null;
    var nimetty = yv.alue_avain && lista.filter(function (z) { return z.avain === yv.alue_avain; })[0]; if (nimetty && _sama(nimetty, a)) return nimetty.avain;
    var tasan = lista.filter(function (z) { return _sama(z, a); })[0]; if (tasan) return tasan.avain;
    var cx = a.x + a.w / 2, cy = a.y + a.h / 2; var sis = lista.filter(function (z) { return cx >= z.x && cx < z.x + z.w && cy >= z.y && cy < z.y + z.h; })[0]; return sis ? sis.avain : null;   // pelimuoto vaihtunut: alueen keskipiste ratkaisee, valmentaja vahvistaa itse
  }
  function _positio(p) { var J = _req('TM_KT_JAKSO', './tm_kt_jakso.js'); return J && J.tmKtPositio ? J.tmKtPositio(p) : (p && p.tt_positio_aktiivinen) || null; }
  function _avainMuodolle(v, muoto) { return typeof v === 'string' ? v : (v && typeof v === 'object' ? v[muoto] : null); }
  function tmKtAlueEhdotus(p, ctx, normisto) {
    ctx = ctx || {}; var muoto = ctx.muoto, pos = _positio(p); if (!pos || !muoto) return null;
    var ehdokkaat = [];
    if (ctx.linja && ctx.linja.pelipaikkaAlueet) ehdokkaat.push(_avainMuodolle(ctx.linja.pelipaikkaAlueet[pos], muoto));   // seuran linja ensin
    var PP = ctx.pelipaikat || _req('TM_TT_PELIPAIKAT', './tm_teknistaktiset.js'); if (PP && PP[pos]) ehdokkaat.push(_avainMuodolle(PP[pos].oletusalue, muoto));   // sitten TalentMasterin pelipaikkadata
    for (var i = 0; i < ehdokkaat.length; i++) if (ehdokkaat[i] && tmKtAlueAvaimella(muoto, ehdokkaat[i], normisto)) return ehdokkaat[i];   // kelvoton avain ohitetaan
    return null;
  }
  function tmKtAlueKirjoitus(p, avain, muoto, ctx, normisto) {
    var z = tmKtAlueAvaimella(muoto, avain, normisto); if (!z) return { ok: false, polut: null, virhe: 'alue_ei_kelpaa' };
    var KS = _req('TM_KENTTA_SPEC', './tm_kentta_spec.js'); if (!KS) return { ok: false, polut: null, virhe: 'ei_kirjastoa' };
    var r = KS.tmAlueKirjoitus({ x: z.x, y: z.y, w: z.w, h: z.h }, { uid: ctx && ctx.uid, nyt: ctx && ctx.nyt }); if (!r.ok) return r;
    r.polut['ydinvahvuus.alue_avain'] = avain; return r;
  }
  function tmKtAlueMahdollinen(joukkueDoc, ctx) {
    var KS = _req('TM_KENTTA_SPEC', './tm_kentta_spec.js'); if (!KS) return true; var m = KS.tmPelimuodot(joukkueDoc, ctx); return !(m.length === 1 && m[0] === '5v5');
  }
  function _joukkueellaMuoto(joukkueDoc) { return !!(joukkueDoc && Array.isArray(joukkueDoc.pelimuodot) && joukkueDoc.pelimuodot.length); }

  function tmKtAlueCss() {
    return ['.ka-wrap{display:grid;gap:10px}.ka-suunta{display:flex;justify-content:space-between;font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.ka-kentta{position:relative;width:100%;max-width:340px;margin:0 auto;aspect-ratio:100/140}.ka-kentta .kt{position:absolute;inset:0}.ka-kentta .kt svg{width:100%;height:100%;display:block}',
      '.ka-z{position:absolute;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;padding:2px;min-height:44px;font:inherit;font-size:var(--fs-meta,12.5px);color:var(--ink);background:transparent;border:1px dashed var(--line2);border-radius:6px;cursor:pointer}',
      '.ka-z:hover{background:color-mix(in srgb,var(--teal) 10%,transparent)}.ka-z[aria-pressed="true"]{background:color-mix(in srgb,var(--teal) 16%,transparent);border:2px solid var(--teal);font-weight:600}.ka-z:focus-visible{outline:2px solid var(--teal);outline-offset:1px}',
      '.ka-ehd{position:absolute;top:2px;right:3px;font-size:10.5px;line-height:1;color:var(--ink2);border:1px solid var(--line2);border-radius:999px;padding:1px 5px;background:var(--card)}',
      '.ka-muodot{display:flex;gap:8px;flex-wrap:wrap}.ka-muoto{min-height:44px;min-width:72px;font:inherit;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;color:var(--ink);background:transparent;border:1px solid var(--line2)}',
      '.ka-muoto[aria-pressed="true"]{border-color:var(--teal);color:var(--teal)}.ka-valittu{font-size:var(--fs-body,14px);color:var(--ink)}.ka-ohje{font-size:var(--fs-body,14px);color:var(--ink2)}.ka-toim{display:flex;gap:8px;flex-wrap:wrap;align-items:center}'].join('\n');
  }
  /* S = { muodot:[…], muoto, kysy:boolean (pelimuoto kysytään), valittu: avain|null, ehdotus: avain|null (näytetään merkintänä kunnes käyttäjä valitsee) } ; c: { esc, t, kenttaSvg (tm_kentta, ilman aluetta), valitseFn, muotoFn, tallennaFn, suljeFn } */
  function tmKtAlueSheetHTML(S, c) {
    S = S || {}; c = c || {}; var esc = c.esc || _esc, t = function (k) { return esc(_txt(c, k)); }, zs = tmKtAlueet(S.muoto, S.normisto), h = '<div class="ka-wrap" data-ka-sheet>';
    if (S.kysy) {
      h += '<div class="ka-ohje"><b>' + t('ka_muoto_kysymys') + '</b><br>' + t('ka_muoto_ohje') + '</div>';
      h += '<div class="ka-muodot" role="group" aria-label="' + t('ka_pelimuoto') + '">' + ['5v5', '8v8', '11v11'].map(function (m) { return '<button type="button" class="ka-muoto" data-ka-muoto="' + m + '" aria-pressed="' + (S.muoto === m ? 'true' : 'false') + '" onclick="' + esc(c.muotoFn + "('" + m + "')") + '">' + m + '</button>'; }).join('') + '</div>';
    } else if ((S.muodot || []).length > 1) {
      h += '<div class="ka-muodot" role="group" aria-label="' + t('ka_pelimuoto') + '">' + S.muodot.map(function (m) { return '<button type="button" class="ka-muoto" data-ka-muoto="' + esc(m) + '" aria-pressed="' + (S.muoto === m ? 'true' : 'false') + '" onclick="' + esc(c.muotoFn + "('" + m + "')") + '">' + esc(m) + '</button>'; }).join('') + '</div>';
    }
    if (!zs.length) {
      h += S.muoto === '5v5' ? '<div class="ka-ohje" data-ka-5v5>' + t('ka_5v5') + '</div>' : '';
    } else {
      h += '<div class="ka-ohje">' + t('ka_ohje') + '</div><div class="ka-suunta"><span>' + t('ka_hyokkays') + '</span><span>' + t('ka_oma_maali') + '</span></div>';
      h += '<div class="ka-kentta">' + (c.kenttaSvg || '') + zs.map(function (z) {
        var on = S.valittu === z.avain, nimi = _txt(c, 'ka_n_' + z.avain), ehd = S.ehdotus === z.avain && !S.valintaTehty;
        return '<button type="button" class="ka-z" data-ka-alue="' + esc(z.avain) + '" aria-pressed="' + (on ? 'true' : 'false') + '" aria-label="' + esc(nimi) + '" style="left:' + z.x + '%;top:' + (Math.round(z.y / 1.4 * 100) / 100) + '%;width:' + z.w + '%;height:' + (Math.round(z.h / 1.4 * 100) / 100) + '%" onclick="' + esc(c.valitseFn + "('" + z.avain + "')") + '">' + esc(nimi) + (ehd ? '<span class="ka-ehd" data-ka-ehdotus>' + t('ka_ehdotus') + '</span>' : '') + '</button>';
      }).join('') + '</div>';
      h += '<div class="ka-valittu" data-ka-valittu aria-live="polite">' + (S.valittu ? t('ka_valittu') + ': <b>' + esc(_txt(c, 'ka_n_' + S.valittu)) + '</b>' : t('ka_valitse_ensin')) + '</div>';
    }
    var voi = zs.length ? !!S.valittu : (S.kysy && S.muoto === '5v5');
    h += '<div class="ka-toim"><button type="button" class="kt-btn" data-ka-tallenna onclick="' + esc(c.tallennaFn + '()') + '"' + (voi && !S.tallentaa ? '' : ' aria-disabled="true" style="opacity:.55"') + '>' + t(zs.length ? 'ka_tallenna' : 'ka_tallenna_muoto') + '</button></div></div>';
    return h;
  }

  function tmKtAlueSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), tila = {};   // tila[pid] = { S, cont, jd }
    var ID = 'alue', id = function (pid) { return ID + '_' + pid; };
    function K() { return _req('TM_KENTTA', './tm_kentta.js'); }
    function _kenttaSvg() { var k = root && typeof root.tmKentta === 'function' ? root.tmKentta : (K() && K().tmKentta); return k ? k({ koko: 'koko', ilmanAluetta: true, ase: null }, { wrap: true }) : ''; }
    function _aktiivinen() { var a = env.sheet.avoinna(); return a && a.indexOf(ID + '_') === 0 ? a.slice(ID.length + 1) : null; }
    function _html(S) { return tmKtAlueSheetHTML(S, { esc: env.esc, t: env.t, kenttaSvg: _kenttaSvg(), valitseFn: '_ktAlueValitse', muotoFn: '_ktAlueMuoto', tallennaFn: '_ktAlueTallenna', suljeFn: '_ktAlueSulje' }); }
    function _piirra(pid) { var t = tila[pid]; if (!t) return; t.cont.innerHTML = _html(t.S); if (root && root.Event && t.cont.dispatchEvent) t.cont.dispatchEvent(new root.Event('input', { bubbles: true })); }   // valinta = muokkaus → luonnos säilyy
    function _uusiTila(p, jd, ctxIka) {
      var KS = _req('TM_KENTTA_SPEC', './tm_kentta_spec.js'), kysy = !_joukkueellaMuoto(jd), muodot = KS ? KS.tmPelimuodot(jd, { ika: ctxIka }) : ['11v11'], muoto = muodot[0];
      var S = { kysy: kysy, muodot: kysy ? [] : muodot, muoto: kysy ? null : muoto, valittu: null, ehdotus: null, valintaTehty: false, tallentaa: false };
      _paivitaValinta(S, p); return S;
    }
    function _paivitaValinta(S, p) {   // pelimuodon mukaan: nykyinen alue ensin (vaihto), muuten ehdotus (ei arvausta)
      var nyk = S.muoto ? tmKtAlueAvain(p, S.muoto) : null; S.valittu = nyk; S.ehdotus = null;
      if (!nyk && S.muoto) { var e = tmKtAlueEhdotus(p, { muoto: S.muoto, linja: env.linja ? env.linja() : null }); if (e) { S.ehdotus = e; S.valittu = e; } }
      S.valintaTehty = !!nyk;
    }
    function avaa(pid) {
      var p = env.pelaaja(pid); if (!p) return Promise.resolve(false);
      if (env.sheet.avoinna() === id(pid)) return Promise.resolve(true);
      if (tila[pid] && env.sheet.luonnos(id(pid))) { env.sheet.avaa({ id: id(pid), tyyppi: 'pitka', otsikko: _txt(env, 'ka_otsikko') }); return Promise.resolve(true); }
      var jd = env.joukkueDoc ? env.joukkueDoc(p) : null, ika = env.ika ? env.ika(p) : null;
      var S = _uusiTila(p, jd, ika), cont = doc.createElement('div'); tila[pid] = { S: S, cont: cont, jd: jd }; cont.innerHTML = _html(S);
      return Promise.resolve(env.sheet.avaa({ id: id(pid), tyyppi: 'pitka', otsikko: _txt(env, 'ka_otsikko'), sisalto: cont })).then(function () { return true; });
    }
    function muoto(m) { var pid = _aktiivinen(), t = pid && tila[pid]; if (!t || ['5v5', '8v8', '11v11'].indexOf(m) < 0) return; t.S.muoto = m; _paivitaValinta(t.S, env.pelaaja(pid)); _piirra(pid); }
    function valitse(avain) { var pid = _aktiivinen(), t = pid && tila[pid]; if (!t || !tmKtAlueAvaimella(t.S.muoto, avain)) return; t.S.valittu = avain; t.S.valintaTehty = true; _piirra(pid); }
    function sulje() { var pid = _aktiivinen(); if (pid) env.sheet.sulje(id(pid)); }
    function tallenna() {
      var pid = _aktiivinen(), t = pid && tila[pid]; if (!t || t.S.tallentaa) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      var p = env.pelaaja(pid), S = t.S, jd = t.jd, nyt = env.nyt ? env.nyt() : new Date(), cu = env.auth ? env.auth() : null, uid = (cu && cu.uid) || env.uid;
      var vainMuoto = S.muoto === '5v5' || !tmKtAlueet(S.muoto).length, kirj = null;
      if (!S.muoto) { env.toast(_txt(env, 'ka_muoto_kysymys'), 'error'); return Promise.resolve({ ok: false, syy: 'muoto' }); }
      if (!vainMuoto) { kirj = tmKtAlueKirjoitus(p, S.valittu, S.muoto, { uid: uid, nyt: nyt }); if (!kirj.ok) { env.toast(_txt(env, kirj.virhe === 'alue_ei_kelpaa' ? 'ka_valitse_ensin' : 'ka_virhe'), 'error'); return Promise.resolve({ ok: false, syy: kirj.virhe }); } }
      if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.'), 'error'); return Promise.resolve({ ok: false, syy: 'offline' }); }
      var kysyttiin = S.kysy, valmis = function () {
        if (kysyttiin && jd) jd.pelimuodot = [S.muoto];
        if (kirj) { p.ydinvahvuus = Object.assign({}, p.ydinvahvuus, { alue: kirj.polut['ydinvahvuus.alue'], asetti_uid: kirj.polut['ydinvahvuus.asetti_uid'], asetettu_pvm: kirj.polut['ydinvahvuus.asetettu_pvm'], alue_avain: S.valittu }); }
        env.sheet.tallennettu(id(pid)); delete tila[pid]; if (typeof env.nayta === 'function') env.nayta(); env.toast(_txt(env, kirj ? 'ka_tallennettu' : 'ka_muoto_tallennettu'), 'ok'); return { ok: true };
      };
      if (!env.sid || !env.db) return Promise.resolve(valmis());   // demo
      S.tallentaa = true;
      return Promise.resolve().then(function () { return cu ? cu.getIdToken(true) : null; }).then(function () {
        var b = env.db.batch(), seura = env.db.collection('seurat').doc(env.sid);
        if (kirj) b.update(seura.collection('pelaajat').doc(p.id), kirj.polut);   // YKSI update pelaajadokkiin
        if (kysyttiin && jd && jd.id) b.update(seura.collection('joukkueet').doc(jd.id), { pelimuodot: [S.muoto] });   // pelimuoto tallennetaan joukkueelle kerran (D174), sama batch
        return b.commit();
      }).then(valmis).catch(function (e) { S.tallentaa = false; if (typeof console !== 'undefined') console.warn('[alue]', e && e.message); var tx = _txt(env, 'ka_virhe'); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(tx, e) : tx, 'error'); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });
    }
    return { avaa: avaa, muoto: muoto, valitse: valitse, tallenna: tallenna, sulje: sulje };
  }
  var API = { ID: 'alue', FI: FI, ALUEET: ALUEET, tmKtAlueet: tmKtAlueet, tmKtAlueAvaimella: tmKtAlueAvaimella, tmKtAlueAvain: tmKtAlueAvain, tmKtAlueEhdotus: tmKtAlueEhdotus, tmKtAlueKirjoitus: tmKtAlueKirjoitus, tmKtAlueMahdollinen: tmKtAlueMahdollinen, tmKtAlueSheetHTML: tmKtAlueSheetHTML, tmKtAlueCss: tmKtAlueCss, tmKtAlueSheet: tmKtAlueSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_ALUE = API;
})(typeof window !== 'undefined' ? window : this);
