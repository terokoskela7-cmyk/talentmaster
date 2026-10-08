/* ════════════════════════════════════════════════════════════════════════
   tm_joukkoaloitus.js — J4 C (docs/CODE_BRIEF_J4_JOUKKOALOITUS.md; design 14 D32): JOUKKOALOITUS — joukkuejakson kortin osio "Pelaajien jaksot" (PURE; ei Firebasea, ei DOM-kirjoitusta).
   Ehdotuksia EI tallenneta: ne lasketaan lennossa samoilla funktioilla kuin V1-modaalissa (tmAloitaJaksoTuki → tmTukitavoiteEhdotukset, tmTukitavoiteMaksimi, kesto ja päivät joukkuejaksosta).
   Hyväksy = täsmälleen V1-modaalin oletustallennus (tmAloitaJaksoOletusSyote → tmAloitaJaksoV2 → tmAloitaJaksoKirjoitus, YKSI update per pelaaja). Lähde ja testiarvot vain henkilökunnalle (§7.22).
   · tmJoukkueenPelaajat(pelaajat, jid, nimi)   → joukkueen pelaajat: jäsenyys joukkueet[]:stä (§7.18 tmPelaajanJoukkueet); nimi vain legacy-pelaajalle ilman joukkueet[]-listaa
   · tmJoukkoTila(p, nyt)                       → 'kaynnissa' | 'valittavana' | 'valinta_odottaa' (K3: pelaajalle tarjottu valinta, ei vielä valittu) | 'ei_ydinvahvuutta' | 'valmis'
   · tmJoukkoRivi(p, c)                         → { pid, nimi, tila, ydinvahvuus, ehdotus, maksimi, x, hyvaksyttavissa }   c = { tanaan, ika, sp, nimi, items, ehdotusAvain, haetut, tmPankki, seuraNimi, nyt? }
   · tmJoukkoHyvaksy(p, rivi, op)               → { jaksofokus, ydinvahvuus, vihje } kuten tmAloitaJaksoV2 (adapteri kirjoittaa)
   · tmRinnakkain(lista, n, fn)                 → rajattu rinnakkaisuus (n kerrallaan); virhe yhdessä ei kaada muita: tulos [{ arvo } | { virhe }] samassa järjestyksessä
   · tmJoukkoHTML(rivit, tila, opts)            → osion HTML. tila: { edistyy:{tehty, yht}|null, virheet:[{nimi, syy}], valmis:bool }; opts: { esc, t, hyvaksyFn, avaaFn, kaikkiFn }
   Vain tokenit (ei hex-värejä); kaikki teksti opts.t:n läpi; kaikki arvot escapataan. Dual-export: module.exports || window.TM_JOUKKOALOITUS.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _AJ() { return _req('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); }
  function _RV() { return _req('TM_REITIN_VALINTA', './tm_reitin_valinta.js'); }   // K3: rivitila "Valinta odottaa" / "valitsi A"
  function _norm(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }

  /* §7.18: jäsenyys = joukkueet[] (tmPelaajanJoukkueet, lib/tm_joukkue.js) — `joukkue`-NIMI vain legacy-pelaajalle, jolla ei ole joukkueet[]-listaa. joukkueDocs valinnainen (nimi-tunniste-ratkaisu). */
  function _PJ() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_joukkue.js').tmPelaajanJoukkueet; } catch (e) { /* ei */ } return root && root.tmPelaajanJoukkueet; }
  function tmJoukkueenPelaajat(pelaajat, jid, nimi, joukkueDocs) {
    var n = _norm(nimi), PJ = _PJ();
    return (Array.isArray(pelaajat) ? pelaajat : []).filter(function (p) {
      if (!p) return false;
      var ids = PJ ? PJ(p, joukkueDocs) : (Array.isArray(p.joukkueet) ? p.joukkueet : []);
      if (jid && ids.indexOf(jid) >= 0) return true;
      var legacy = !(Array.isArray(p.joukkueet) && p.joukkueet.length);
      return legacy && !!n && _norm(p.joukkue) === n;
    });
  }
  function _ydinvahvuus(p) {
    var a = p && p.ydinvahvuus && typeof p.ydinvahvuus.kuvaus === 'string' ? p.ydinvahvuus.kuvaus.trim() : '';
    if (a) return a;
    var b = p && p.ydinvahvuus_valinta && typeof p.ydinvahvuus_valinta.vaihtoehto === 'string' ? p.ydinvahvuus_valinta.vaihtoehto.trim() : '';
    return b || '';
  }
  function _umpeutunut(jf, nytMs) {   // sama sääntö kuin tm_jaksofokus.tmJfUmpeutunut: alkoi + kesto_vk (oletus 4) × 7 pv < nyt; ei alkoi-päivää → ei umpeudu (ei arvausta)
    var a = jf && jf.alkoi ? new Date(jf.alkoi).getTime() : NaN; if (isNaN(a)) return false;
    return (a + (jf.kesto_vk || 4) * 7 * DAY) < nytMs;
  }
  function tmJoukkoTila(p, nyt) {
    var nytMs = nyt instanceof Date ? nyt.getTime() : (typeof nyt === 'number' ? nyt : Date.now()), jf = p && p.jaksofokus;
    var onJakso = !!(jf && (jf.konsepti_avain || jf.konsepti_nimi));
    var RV = _RV(), k3 = RV && !onJakso ? RV.tmHenkRivitila(p) : null;   // K3: tarjous ilman aktiivista jaksoa
    if (k3) return k3.tila === 'valittu' ? 'valittavana' : 'valinta_odottaa';
    if (onJakso && jf.tila === 'valittavana') return 'valittavana';   // pelaaja on valinnut — valmentaja vahvistaa modaalissa
    if (onJakso && !_umpeutunut(jf, nytMs)) return 'kaynnissa';
    return _ydinvahvuus(p) ? 'valmis' : 'ei_ydinvahvuutta';
  }

  function tmJoukkoRivi(p, c) {
    c = c || {}; var AJ = _AJ(), tila = tmJoukkoTila(p, c.nyt), yv = _ydinvahvuus(p);
    var rivi = { pid: p.id, nimi: c.nimi || '', tila: tila, ydinvahvuus: yv, ehdotus: null, maksimi: null, x: null, hyvaksyttavissa: tila === 'valmis' };
    if (c.tilakone === true && AJ && typeof AJ.tmJaksoTila === 'function') rivi.tilakone = AJ.tmJaksoTila(p, { nyt: c.nyt });   // V4a (D47): rivitila samasta funktiosta kuin työpöydän otsikkorivi (vain lipulla; lippu pois → rivi ennallaan)
    if (tila === 'kaynnissa') return rivi;   // ei laskentaa: jakso käynnissä, ei toimintoa
    var RV = _RV(), k3 = RV ? RV.tmHenkRivitila(p) : null;
    if (k3 && (tila === 'valinta_odottaa' || tila === 'valittavana')) { rivi.k3 = k3; rivi.hyvaksyttavissa = false; return rivi; }   // K3: ei laskentaa — valmentaja vahvistaa modaalissa
    var tuki = null; try { tuki = AJ.tmAloitaJaksoTuki(p, { tanaan: c.tanaan, ika: c.ika, sp: c.sp, haetut: c.haetut, tmPankki: c.tmPankki, seuraNimi: c.seuraNimi }); } catch (e) { tuki = null; }
    if (!tuki) { rivi.hyvaksyttavissa = false; return rivi; }
    rivi.maksimi = tuki.maksimi;
    var k = tuki.nayta ? tuki.kortit.filter(function (x) { return x.valittu; })[0] : null;
    if (k) rivi.ehdotus = { alue: k.alue, kuvaus: k.kuvaus, lyhyt: k.lyhyt || '', miksi: k.miksi || '', perustelu: k.perustelu };
    try { rivi.x = AJ.tmAloitaJaksoTiedot(p, { items: c.items || [], ehdotusAvain: c.ehdotusAvain || null, ika: c.ika, nimi: c.nimi || '', tuki: tuki }); } catch (e) { rivi.x = null; rivi.hyvaksyttavissa = false; }
    if (rivi.hyvaksyttavissa && (!rivi.x || !rivi.x.valittuAvain)) rivi.hyvaksyttavissa = false;   // ei taitoa (ei ehdotusta eikä listaa) → vain "Avaa"
    return rivi;
  }

  function tmJoukkoHyvaksy(p, rivi, op) {
    var AJ = _AJ(); if (!rivi || !rivi.x || !rivi.x.tuki) throw new Error('tm_joukkoaloitus: rivillä ei ole laskettua lomaketta');
    var x = rivi.x, syote = AJ.tmAloitaJaksoOletusSyote(x), item = (x.items || []).filter(function (it) { return it.avain === syote.konsepti_avain; })[0];
    return AJ.tmAloitaJaksoV2(p, Object.assign({}, syote, { konsepti_nimi: item ? item.nimi : null, konsepti_koodi: item ? (item.koodi || null) : null }), x, op);
  }

  // Rajattu rinnakkaisuus: enintään n työtä käynnissä; tulos samassa järjestyksessä; yksittäisen virhe → { virhe } (muut jatkavat)
  function tmRinnakkain(lista, n, fn) {
    var tulos = new Array(lista.length), i = 0, raja = Math.max(1, Math.min(n || 1, lista.length || 1));
    function seuraava() {
      if (i >= lista.length) return Promise.resolve();
      var k = i++;
      return Promise.resolve().then(function () { return fn(lista[k], k); }).then(function (v) { tulos[k] = { arvo: v }; }, function (e) { tulos[k] = { virhe: e }; }).then(seuraava);
    }
    var tyot = []; for (var j = 0; j < raja; j++) tyot.push(seuraava());
    return Promise.all(tyot).then(function () { return tulos; });
  }

  var ALUE_NIMI = { tekninen_taktinen: 'Tekninen ja taktinen', fyysinen: 'Fyysinen', henkinen: 'Henkinen', sosiaalinen: 'Sosiaalinen' };
  function tmJoukkoHTML(rivit, tila, opts) {
    opts = opts || {}; tila = tila || {}; var esc = opts.esc || _esc, t = _t(opts);
    var nappi = function (fn, pid, teksti, ensisijainen) { return opts[fn] ? '<button type="button" data-ja-' + fn + ' onclick="event.stopPropagation();' + esc(opts[fn]) + '(\'' + esc(pid) + '\')" style="font-size:11px;font-weight:600;border-radius:7px;padding:5px 10px;cursor:pointer;border:.5px solid var(--teal);'
      + (ensisijainen ? 'background:var(--teal);color:var(--bg)' : 'background:transparent;color:var(--teal)') + '">' + esc(t(teksti)) + '</button>' : ''; };
    var valmiit = (rivit || []).filter(function (r) { return r.hyvaksyttavissa; }).length;
    var h = '<div class="tm-joukkoaloitus" style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:24px"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">'
      + '<div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3)">' + esc(t('Pelaajien jaksot')) + '</div>'
      + (opts.kaikkiFn && valmiit && !tila.edistyy ? '<button type="button" data-ja-kaikki onclick="event.stopPropagation();' + esc(opts.kaikkiFn) + '()" style="font-size:11.5px;font-weight:600;border-radius:7px;padding:6px 11px;cursor:pointer;border:.5px solid var(--teal);background:var(--teal);color:var(--bg)">' + esc(t('Hyväksy kaikki')) + ' (' + valmiit + ')</button>' : '') + '</div>';
    if (tila.edistyy) h += '<div data-ja-edistyy style="font-size:12px;color:var(--ink2);margin-top:8px">' + esc(t('Hyväksytään')) + ' ' + tila.edistyy.tehty + '/' + tila.edistyy.yht + '…</div>';
    if (tila.virheet && tila.virheet.length) h += '<div data-ja-virheet style="font-size:12px;color:var(--ink2);margin-top:8px;border:.5px solid var(--border);border-radius:8px;padding:8px 10px"><b>' + esc(t('Ei onnistunut')) + ' (' + tila.virheet.length + '):</b>' + tila.virheet.map(function (v) { return '<div>' + esc(v.nimi) + ' — ' + esc(v.syy) + '</div>'; }).join('') + '</div>';
    if (!rivit || !rivit.length) return h + '<div style="font-size:12.5px;color:var(--ink3);margin-top:8px">' + esc(t('Joukkueella ei ole pelaajia.')) + '</div></div>';
    h += '<div style="margin-top:8px">' + rivit.map(function (r) {
      var ehd = r.ehdotus ? '<div style="font-size:12px;color:var(--ink2);margin-top:3px"><span style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--teal)">' + esc(t(ALUE_NIMI[r.ehdotus.alue] || '')) + '</span> ' + esc(r.ehdotus.kuvaus) + (r.ehdotus.lyhyt ? ' <span style="color:var(--ink3)">· ' + esc(t(r.ehdotus.lyhyt.split(' (')[0]) + (r.ehdotus.lyhyt.indexOf(' (') > 0 ? ' (' + r.ehdotus.lyhyt.split(' (').slice(1).join(' (') : '')) + '</span>' : '') + '</div>'
        + (r.ehdotus.miksi ? '<details style="margin-top:2px"><summary style="font-size:11px;color:var(--ink3);cursor:pointer">' + esc(t('miksi?')) + '</summary><div style="font-size:11.5px;color:var(--ink2);margin-top:3px">' + esc(r.ehdotus.miksi) + '</div></details>' : '') : (r.maksimi === 0 && r.tila !== 'kaynnissa' ? '<div style="font-size:11.5px;color:var(--ink3);margin-top:3px">' + esc(t('Ei tukitavoitetta (ikävaihe)')) + '</div>' : '');
      var toiminto = r.tila === 'kaynnissa' ? '<span style="font-size:11.5px;color:var(--ink3)">' + esc(t('jakso käynnissä')) + '</span>'
        : (r.tila === 'virhe' ? '<span style="font-size:11.5px;color:var(--ink3)">' + esc(t('Tietoja ei saatu')) + '</span> ' + nappi('avaaFn', r.pid, 'Avaa', false)
        : (r.tila === 'valinta_odottaa' && r.k3 ? '<span style="font-size:11.5px;color:var(--ink3)">' + esc(_RV().tmHenkRiviTeksti(r.k3, '', { t: t })) + '</span> ' + nappi('avaaFn', r.pid, 'Avaa', false)
        : (r.tila === 'valittavana' && r.k3 ? '<span style="font-size:11.5px;color:var(--ink3)">' + esc(_RV().tmHenkRiviTeksti(r.k3, '', { t: t })) + '</span> ' + nappi('avaaFn', r.pid, 'Vahvista jakso', true)
        : (r.tila === 'valittavana' ? '<span style="font-size:11.5px;color:var(--ink3)">' + esc(t('Pelaaja valitsi — vahvista')) + '</span> ' + nappi('avaaFn', r.pid, 'Avaa', true)
          : (r.tila === 'ei_ydinvahvuutta' ? '<span style="font-size:11.5px;color:var(--ink3)">' + esc(t('Ei ydinvahvuutta')) + '</span> ' + nappi('avaaFn', r.pid, 'Avaa', false)
            : (r.hyvaksyttavissa ? nappi('hyvaksyFn', r.pid, 'Hyväksy', true) + ' ' + nappi('avaaFn', r.pid, 'Avaa', false) : nappi('avaaFn', r.pid, 'Avaa', false)))))));
      return '<div class="tm-ja-rivi" data-pid="' + esc(r.pid) + '" data-tila="' + esc(r.tila) + '" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;border-top:.5px solid var(--border);padding:8px 0">'
        + '<div style="min-width:0;flex:1 1 200px"><div style="font-size:13px;color:var(--ink);overflow-wrap:anywhere">' + esc(r.nimi) + (r.ydinvahvuus ? ' <span style="color:var(--ink3);font-size:11.5px">· ' + esc(r.ydinvahvuus) + '</span>' : '') + '</div>' + (opts.tilakone === true && r.tilakone ? '<div data-ja-rivitila="' + esc(r.tilakone.tila) + '" style="font-size:11.5px;color:' + (r.tilakone.rivitila.savy === 'amber' ? 'var(--amber)' : 'var(--ink3)') + '">' + esc(_AJ() && _AJ().tmJaksoTeksti ? _AJ().tmJaksoTeksti(r.tilakone.rivitila, t) : t(r.tilakone.rivitila.teksti)) + '</div>' : '') + (r.tila === 'kaynnissa' ? '' : ehd) + '</div>'
        + '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' + toiminto + '</div></div>';
    }).join('') + '</div></div>';
    return h;
  }

  var API = { tmJoukkueenPelaajat: tmJoukkueenPelaajat, tmJoukkoTila: tmJoukkoTila, tmJoukkoRivi: tmJoukkoRivi, tmJoukkoHyvaksy: tmJoukkoHyvaksy, tmRinnakkain: tmRinnakkain, tmJoukkoHTML: tmJoukkoHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_JOUKKOALOITUS = API;
})(typeof window !== 'undefined' ? window : this);
