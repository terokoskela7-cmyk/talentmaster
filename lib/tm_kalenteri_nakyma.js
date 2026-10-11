/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_nakyma.js — K35-6a · Masterin kalenterin viikkonäkymä päiväsarakkeina (mockup 35 §2; D182, D184, D194) + Täytä viikko -signaalikortti.
   PURE: ei DOM:ia, ei Firestorea; HTML-merkkijonot kuten tm_kt_komponentit. Masterin OMA näkymä (D186 tarkennus: VP:n seuran viikko on eri näkymä, K35-8) — yhteistä on data, tyyppirekisteri ja laskenta.
   Riippuvuudet: tm_kalenteri_tyypit.js (tyyppi + väri: tmKalTyyppi, tmKalMerkkiTyyli), tm_kalenteri_malli.js (tmKalKokoPaiva, tmKalOsuuPaivalle, tmKalPaiva).
   · tmKalViikkoMalli({ tapahtumat, maanantai, ehdotukset?, paallekkaisyydet?, ohitetut? }) → { maanantai, ehdotuksia, ohitetut:[{pvm, vkpaiva, syy}], paivat:[7 × { pvm, vkpaiva, otsikko:'ma 19.10.', kokoPaiva:[kortti], kortit:[kortti aikajärjestyksessä], tauko? }] }
       kortti = { id, ehdotus, idx?, tyyppi (kanoninen avain), merkki, vari ('var(--token)'), katkoviiva, nimi, vastustaja, alkaa, paattyy, paikka, tila, joukkue, md?, painotus?, teema?, paallekkain?:{ pelaajia, toinen_id, toinen_nimi }, kooste?:{ paikalla, yht } (lasnaolo_kooste; K35-6e), merkitsematta?:true (päättynyt harjoitus/ottelu ilman koostetta) }
       K35-6e: tmKalViikkoMalli({ …, nyt }) — päättynyt (paattyy < nyt) harjoitus tai ottelu, ei peruttu, joukkue- tai ryhmätapahtuma, ei koostetta → merkitsematta:true; HTML näyttää "Merkitse läsnäolot" vain kun C.henkilokunta (hiljainen rivi, ei nappia). Kooste "✓ p/yht" (yht = paikalla + myöhässä + poissa) näkyy aina.
       Koko päivän tapahtumat (koko_paiva, tauko, mentorointi; monipäiväinen osuu jokaiselle päivälle) ylimmäksi; ehdotuskortit katkoviivalla; päällekkäisyys = lukumäärä + toisen tapahtuman nimi, EI pelaajien nimiä.
   · tmKalViikkoHTML(malli, C) → HTML (7 saraketta; ≤ 640 px päivät riveinä — CSS tmKalNakymaCSS()). C = { t (käännös, avain = fi-teksti), tyyppiNimi(ty)→teksti, tanaan:'YYYY-MM-DD', on:{ kortti(id)→js, ehdotus(idx)→js, lisaa(pvm)→js } }
   · tmKalTaytaKorttiHTML(tila, C) — yksi signaalikortti (D184): tila = { tyyppi:'tayta'|'vahvista'|'pelimuoto'|'ei_pohjaa', pohjaNimi?, n?, lahde?:'pohja'|'monista', saaAsettaa?, pelimuodot? } · C.on = { tayta, monista, yksittainen, vahvista, peru, pelimuoto(pm) }
   · tmKalPvmFi('2026-10-14') → '14.10.2026' · tmKalPvmLyhyt('2026-10-19') → 'ma 19.10.'
   Värit vain tokeneina (tmKalMerkkiTyyli), ei hex-arvoja eikä emojeja. Päivät puhtaalla ISO-aritmetiikalla (UTC-keskipäivä) — ei paikallisaikaa.
   Dual-export: module.exports || window.TM_KALENTERI_NAKYMA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _MA() { return _lib('./tm_kalenteri_malli.js', 'TM_KALENTERI_MALLI'); }
  var VPAIVAT = ['ma', 'ti', 'ke', 'to', 'pe', 'la', 'su'];

  function _utc(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _z(n) { return (n < 10 ? '0' : '') + n; }
  function _lisaa(iso, vrk) { var u = _utc(iso); if (u == null) return null; var d = new Date(u + vrk * 86400000); return d.getUTCFullYear() + '-' + _z(d.getUTCMonth() + 1) + '-' + _z(d.getUTCDate()); }
  function _vk(iso) { var u = _utc(iso); return u == null ? null : ((new Date(u).getUTCDay() + 6) % 7); }   // 0 = ma
  function tmKalPvmFi(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? (+m[3]) + '.' + (+m[2]) + '.' + m[1] : String(iso || ''); }
  function tmKalPvmLyhyt(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? VPAIVAT[_vk(iso)] + ' ' + (+m[3]) + '.' + (+m[2]) + '.' : String(iso || ''); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _tt(C) { return C && typeof C.t === 'function' ? C.t : function (x) { return x; }; }
  function _hhmm(x) { var m = /^(\d{1,2}):(\d{2})/.exec(String(x || '')); return m ? _z(+m[1]) + ':' + m[2] : ''; }
  var _fmtK = null;
  function _kelloMs(ms) { if (ms == null) return ''; try { _fmtK = _fmtK || new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); return _fmtK.format(new Date(ms)); } catch (e) { return ''; } }

  function _kortti(e, ehdotus, idx) {
    var TY = _TY(), ty = TY.tmKalTyyppi ? TY.tmKalTyyppi(e.tyyppi) : { avain: String(e.tyyppi || 'muu'), merkki: 'muu' }, st = TY.tmKalMerkkiTyyli ? TY.tmKalMerkkiTyyli(ty.merkki) : { vari: 'var(--ink2)', katkoviiva: false };
    var alkaa = _hhmm(e.alkaa) || (e._alkaaMs != null ? _kelloMs(e._alkaaMs) : ''), paattyy = _hhmm(e.paattyy) || (e._paattyyMs != null ? _kelloMs(e._paattyyMs) : '');
    var lk = e.lasnaolo_kooste, ky = lk ? (lk.paikalla || 0) + (lk.myohassa || 0) + (lk.poissa || 0) : 0;
    var aamu = e.alalaji === 'aamutreeni' && !ehdotus;   // K35-6d: aamutreeni = harjoituksen esiasetus (poimitut pelaajat): kortissa merkki "Aamu" ja poimittujen määrä
    return { id: e.id != null ? e.id : null, ehdotus: !!ehdotus, aamu: aamu, pelaajia: aamu && Array.isArray(e.pelaajat_id) ? e.pelaajat_id.length : null, lukittu: _MA().tmKalSaaMuokata ? !_MA().tmKalSaaMuokata('alkaa', e) : false, kooste: ky > 0 ? { paikalla: lk.paikalla || 0, yht: ky } : null, _alkaaMs: e._alkaaMs != null ? e._alkaaMs : null, _paattyyMs: e._paattyyMs != null ? e._paattyyMs : null, _ryhma: !!(e.kohde && e.kohde.tyyppi === 'ryhma'), idx: idx, tyyppi: ty.avain, merkki: ty.merkki, vari: st.vari, katkoviiva: !!st.katkoviiva || !!ehdotus, nimi: e.nimi || '', vastustaja: e.vastustaja || '', alkaa: alkaa, paattyy: paattyy,
      paikka: e.paikka || '', tila: e.tila || '', joukkue: e.joukkue_nimi || e.joukkue || '', md: e.md != null ? e.md : null, painotus: e.painotus || null, teema: e.teema || null };
  }
  function tmKalViikkoMalli(a) {
    a = a || {}; var MA = _MA(), ma = String(a.maanantai || '').slice(0, 10), tap = (Array.isArray(a.tapahtumat) ? a.tapahtumat : []).filter(function (e) { return e && e.poistettu !== true; });
    var paivat = []; for (var i = 0; i < 7; i++) { var p = _lisaa(ma, i); paivat.push({ pvm: p, vkpaiva: i, otsikko: tmKalPvmLyhyt(p), kokoPaiva: [], kortit: [] }); }
    var nimiIdlla = {}; tap.forEach(function (e) { if (e.id != null) nimiIdlla[e.id] = e; });
    tap.forEach(function (e) {
      var koko = MA.tmKalKokoPaiva ? MA.tmKalKokoPaiva(e) : e.koko_paiva === true, oma = e.pvm || (e._alkaaMs != null && MA.tmKalPaiva ? MA.tmKalPaiva(e._alkaaMs) : null);
      paivat.forEach(function (d) {
        if (koko ? !(MA.tmKalOsuuPaivalle && MA.tmKalOsuuPaivalle(e, d.pvm)) : oma !== d.pvm) return;
        var k = _kortti(e, false); if (koko) { d.kokoPaiva.push(k); if (_TY().tmKalOnTauko ? _TY().tmKalOnTauko(k.tyyppi) : k.tyyppi === 'seuran_tauko') d.tauko = k.nimi || true; } else d.kortit.push(k);
      });
    });
    var ehd = Array.isArray(a.ehdotukset) ? a.ehdotukset : [], pk = Array.isArray(a.paallekkaisyydet) ? a.paallekkaisyydet : [];
    ehd.forEach(function (e, idx) {
      var d = paivat.filter(function (x) { return x.pvm === e.pvm; })[0]; if (!d) return; var k = _kortti(e, true, idx);
      var p = pk.filter(function (x) { return x.pvm === e.pvm; })[0]; if (p) { var t = nimiIdlla[p.toinen_tapahtuma_id]; k.paallekkain = { pelaajia: p.pelaajia, toinen_id: p.toinen_tapahtuma_id, toinen_nimi: t ? (t.nimi || (_TY().tmKalTyyppi ? _TY().tmKalTyyppi(t.tyyppi).nimi : '')) : '' }; }
      d.kortit.push(k);
    });
    var nytMs = a.nyt != null ? +a.nyt : null;
    if (nytMs != null) paivat.forEach(function (d) { d.kortit.forEach(function (k) {   // K35-6e: päättynyt harjoitus/ottelu ilman läsnäolokoostetta (ei peruttu, joukkue- tai ryhmätapahtuma)
      var loppu = k._paattyyMs != null ? k._paattyyMs : k._alkaaMs;
      if (!k.ehdotus && !k.kooste && (k.tyyppi === 'harjoitus' || k.tyyppi === 'ottelu') && k.tila !== 'peruttu' && k.tila !== 'peruutettu' && (k.joukkue || k._ryhma || k.aamu) && loppu != null && loppu < nytMs) k.merkitsematta = true;
    }); });
    paivat.forEach(function (d) { d.kortit.sort(function (x, y) { return (x.alkaa || '99:99') < (y.alkaa || '99:99') ? -1 : ((x.alkaa || '99:99') > (y.alkaa || '99:99') ? 1 : 0); }); });
    return { maanantai: ma, ehdotuksia: ehd.length, paivat: paivat, ohitetut: (Array.isArray(a.ohitetut) ? a.ohitetut : []).map(function (o) { return { pvm: o.pvm, vkpaiva: _vk(o.pvm), syy: o.syy }; }) };
  }

  var CSS = [
    '.kv-viikko{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}',
    '.kv-paiva{background:var(--card);border:1px solid var(--border);border-radius:6px;display:flex;flex-direction:column;min-width:0}.kv-paiva.kv-tanaan{border-color:var(--teal)}',
    '.kv-pv-hdr{display:flex;align-items:baseline;gap:6px;padding:8px 10px;border-bottom:1px solid var(--border)}.kv-pv-nimi{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3)}',
    '.kv-pv-pvm{font-family:"Cormorant Garamond",serif;font-size:18px;color:var(--ink)}.kv-tanaan .kv-pv-pvm{color:var(--teal)}',
    '.kv-lisaa{margin-left:auto;background:none;border:1px solid var(--border);border-radius:4px;color:var(--ink2);cursor:pointer;font:inherit;font-size:14px;line-height:1;min-width:28px;min-height:28px}',
    '.kv-koko{display:grid;gap:4px;padding:6px 8px 0}.kv-kortit{display:grid;gap:6px;padding:8px;align-content:start;flex:1}',
    '.kv-kortti{background:color-mix(in srgb,var(--kv) 12%,transparent);border-left:3px solid var(--kv);border-radius:4px;padding:7px 9px;cursor:pointer;min-width:0}.kv-kortti.kv-katko{border-left-style:dashed}',
    '.kv-ehdotus{border:1px dashed var(--kv);border-left:3px dashed var(--kv);background:transparent}.kv-peruttu{opacity:.55;text-decoration:line-through}',
    '.kv-aika{font-family:"DM Mono",monospace;font-size:11px;color:var(--ink2)}.kv-nimi{font-size:13px;font-weight:600;color:var(--ink);overflow-wrap:anywhere}.kv-meta{font-size:12px;color:var(--ink2);overflow-wrap:anywhere}',
    '.kv-ehd-merkki{font-size:11px;color:var(--ink3);letter-spacing:.06em;text-transform:uppercase}.kv-varoitus{margin-top:4px;padding:4px 6px;border:1px solid var(--amber);border-radius:3px;background:var(--amber-dim,transparent);font-size:12px;color:var(--ink)}',
    '.kv-aamu{color:var(--teal)}',
    '.kv-siirra{display:none;margin-top:6px;background:none;border:0;padding:0;font:inherit;font-size:12px;color:var(--teal);text-decoration:underline;cursor:pointer}@media (max-width:640px),(pointer:coarse){.kv-siirra{display:inline-block}}.kv-kortti[draggable=true]{cursor:grab}',
    '.kv-tyhja{color:var(--ink3);font-size:12px;padding:2px 2px}.kv-ohitetut{margin-top:8px;font-size:12px;color:var(--ink3)}',
    '.kv-signaali{border:1px solid var(--teal);background:color-mix(in srgb,var(--teal) 10%,transparent);border-radius:6px;padding:12px 14px;display:grid;gap:8px;margin-bottom:12px}',
    '.kv-sig-h{font-size:15px;font-weight:600;color:var(--ink)}.kv-sig-why{font-size:13px;color:var(--ink2)}.kv-sig-rivi{display:flex;flex-wrap:wrap;gap:12px;align-items:center}',
    '.kv-btn{font:inherit;font-size:13px;font-weight:600;padding:8px 14px;border-radius:4px;border:1px solid var(--teal);background:var(--teal);color:var(--bg);cursor:pointer;min-height:36px}.kv-btn.q{background:transparent;color:var(--teal)}.kv-btn:disabled{opacity:.55;cursor:default}',
    '.kv-linkki{background:none;border:0;padding:0;font:inherit;font-size:13px;color:var(--teal);cursor:pointer;text-decoration:underline}',
    '.kv-btn:focus-visible,.kv-linkki:focus-visible,.kv-kortti:focus-visible,.kv-lisaa:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
    '@media (max-width:640px){.kv-viikko{grid-template-columns:minmax(0,1fr)}.kv-paiva{flex-direction:column}.kv-pv-hdr{border-bottom:0}.kv-kortit:empty{display:none}}'
  ].join('');

  function _kortinHTML(k, C, t, koko) {
    var on = C.on || {}, nimi = k.tyyppi === 'ottelu' ? (C.tyyppiNimi ? C.tyyppiNimi(k.tyyppi) : 'Ottelu') + (k.vastustaja ? ' · ' + k.vastustaja : '') : (k.nimi || (C.tyyppiNimi ? C.tyyppiNimi(k.tyyppi) : k.tyyppi));
    if (k.tyyppi === 'harjoitus' && !k.nimi && C.tyyppiNimi) nimi = C.tyyppiNimi(k.tyyppi);
    if (k.aamu) nimi = t('Aamutreeni') + (k.pelaajia != null ? ' · ' + k.pelaajia + ' ' + t('pel.') : '');   // "Aamutreeni · 6 pel."
    var aika = k.alkaa ? k.alkaa + (k.paattyy ? '–' + k.paattyy : '') : '', js = k.ehdotus ? (on.ehdotus ? on.ehdotus(k.idx) : '') : (on.kortti && k.id != null ? on.kortti(k.id) : '');
    var meta = [k.paikka, k.painotus, k.teema ? t('Teema') + ': ' + k.teema : '', (!k.ehdotus && C.nayta_joukkue && k.joukkue) ? k.joukkue : ''].filter(Boolean).map(function (x) { return '<div class="kv-meta">' + _esc(x) + '</div>'; }).join('');
    var la = k.kooste ? '<div class="kv-meta kv-kooste">✓ ' + k.kooste.paikalla + '/' + k.kooste.yht + '</div>' : (k.merkitsematta && C.henkilokunta ? '<div class="kv-meta kv-muistutus">' + _esc(t('Merkitse läsnäolot')) + '</div>' : '');
    var siirto = !koko && !k.ehdotus && C.siirrettava && C.siirrettava(k) && !k.lukittu && k.alkaa && on.veda && on.siirra, sj = siirto ? ' draggable="true" ondragstart="' + _esc(on.veda(k.id)) + '"' : '', sn = siirto ? '<button type="button" class="kv-siirra" onclick="event.stopPropagation();' + _esc(on.siirra(k.id)) + '">' + _esc(t('Siirrä…')) + '</button>' : '';
    var pk = k.paallekkain ? '<div class="kv-varoitus">' + _esc(t('{n} pelaajaa myös: {nimi}').replace('{n}', k.paallekkain.pelaajia).replace('{nimi}', k.paallekkain.toinen_nimi || '')) + '</div>' : '';
    return '<div class="kv-kortti' + (k.ehdotus ? ' kv-ehdotus' : '') + (k.katkoviiva && !k.ehdotus ? ' kv-katko' : '') + (k.tila === 'peruttu' ? ' kv-peruttu' : '') + '" style="--kv:' + _esc(k.vari) + '"' + (js ? ' tabindex="0" role="button" onclick="' + _esc(js) + '"' : '') + sj + ' title="' + _esc(nimi) + '">'
      + (k.ehdotus ? '<div class="kv-ehd-merkki">' + _esc(t('Ehdotus')) + '</div>' : (k.aamu ? '<div class="kv-ehd-merkki kv-aamu">' + _esc(t('Aamu')) + '</div>' : '')) + (aika ? '<div class="kv-aika">' + _esc(aika) + '</div>' : '') + '<div class="kv-nimi">' + _esc(nimi) + '</div>' + meta + la + pk + sn + '</div>';
  }
  function tmKalViikkoHTML(m, C) {
    C = C || {}; var t = _tt(C), on = C.on || {}, h = '<div class="kv-viikko">';
    ((m && m.paivat) || []).forEach(function (d) {
      var nimi = t(VPAIVAT[d.vkpaiva].charAt(0).toUpperCase() + VPAIVAT[d.vkpaiva].slice(1)), pvm = d.otsikko.split(' ')[1] || '';
      h += '<section class="kv-paiva' + (C.tanaan === d.pvm ? ' kv-tanaan' : '') + '"' + (on.pudota ? ' ondragover="event.preventDefault()" ondrop="' + _esc(on.pudota(d.pvm)) + '"' : '') + '><header class="kv-pv-hdr"><span class="kv-pv-nimi">' + _esc(nimi) + '</span><span class="kv-pv-pvm">' + _esc(pvm) + '</span>'
        + (on.lisaa ? '<button type="button" class="kv-lisaa" onclick="' + _esc(on.lisaa(d.pvm)) + '" aria-label="' + _esc(t('Lisää tapahtuma') + ' ' + d.otsikko) + '">+</button>' : '') + '</header>'
        + (d.kokoPaiva.length ? '<div class="kv-koko">' + d.kokoPaiva.map(function (k) { return _kortinHTML(k, C, t, true); }).join('') + '</div>' : '')
        + '<div class="kv-kortit">' + d.kortit.map(function (k) { return _kortinHTML(k, C, t); }).join('') + '</div></section>';
    });
    h += '</div>';
    var oh = ((m && m.ohitetut) || []).filter(function (o) { return o.syy !== 'olemassa'; });
    if (oh.length) h += '<div class="kv-ohitetut">' + _esc(t('Ohitettu') + ': ' + oh.map(function (o) { return VPAIVAT[o.vkpaiva] + ' ' + t(o.syy); }).join(' · ')) + '</div>';
    return h;
  }

  function tmKalTaytaKorttiHTML(tila, C) {
    C = C || {}; tila = tila || {}; var t = _tt(C), on = C.on || {}, e = function (js) { return js ? ' onclick="' + _esc(js) + '"' : ''; };
    var linkki = function (txt, js) { return '<button type="button" class="kv-linkki"' + e(js) + '>' + _esc(t(txt)) + '</button>'; };
    var yks = linkki('Lisää yksittäinen tapahtuma', on.yksittainen), mon = linkki('Monista edellinen viikko', on.monista), h, rivi;
    if (tila.tyyppi === 'vahvista') {
      h = t(tila.lahde === 'monista' ? 'Edellisen viikon harjoitukset' : 'Viikon ehdotus') + ' · ' + t('Esikatselu');
      rivi = '<button type="button" class="kv-btn"' + (tila.kesken ? ' disabled aria-busy="true"' : e(on.vahvista)) + '>' + _esc(t(tila.kesken ? 'Tallennetaan…' : 'Vahvista {n} harjoitusta').replace('{n}', tila.n || 0)) + '</button>' + (tila.kesken ? '' : linkki('Peru', on.peru));
      return '<div class="kv-signaali"><div class="kv-sig-h">' + _esc(h) + '</div><div class="kv-sig-why">' + _esc(t('Ehdotukset näkyvät katkoviivalla; napauta korttia muokataksesi aikaa ja paikkaa.')) + '</div><div class="kv-sig-rivi">' + rivi + '</div></div>';
    }
    if (tila.tyyppi === 'pelimuoto') {
      var pm = tila.saaAsettaa ? (tila.pelimuodot || ['3v3', '5v5', '8v8', '11v11']).map(function (x) { return '<button type="button" class="kv-btn q"' + e(on.pelimuoto ? on.pelimuoto(x) : '') + '>' + _esc(x) + '</button>'; }).join('')
        : '<span class="kv-sig-why">' + _esc(t('Pyydä valmennuspäällikköä asettamaan pelimuoto')) + '</span>';
      return '<div class="kv-signaali"><div class="kv-sig-h">' + _esc(t('Viikolla ei ole harjoituksia')) + '</div><div class="kv-sig-why">' + _esc(t('Valitse joukkueen pelimuoto kerran, niin viikon voi täyttää pohjasta.')) + '</div><div class="kv-sig-rivi">' + pm + '</div><div class="kv-sig-rivi">' + mon + yks + '</div></div>';
    }
    if (tila.tyyppi === 'ei_pohjaa') return '<div class="kv-signaali"><div class="kv-sig-h">' + _esc(t('Viikolla ei ole harjoituksia')) + '</div><div class="kv-sig-why">' + _esc(t('Joukkueelle ei löydy viikkopohjaa.')) + '</div><div class="kv-sig-rivi">' + mon + yks + '</div></div>';
    return '<div class="kv-signaali"><div class="kv-sig-h">' + _esc(t('Viikolla ei ole harjoituksia')) + '</div><div class="kv-sig-why">' + _esc(tila.pohjaNimi ? t('Täytä viikko pohjasta') + ': ' + tila.pohjaNimi : t('Täytä viikko pohjasta')) + '</div>'
      + '<div class="kv-sig-rivi"><button type="button" class="kv-btn"' + e(on.tayta) + '>' + _esc(t('Täytä viikko')) + '</button>' + mon + yks + '</div></div>';
  }

  var API = { tmKalViikkoMalli: tmKalViikkoMalli, tmKalViikkoHTML: tmKalViikkoHTML, tmKalTaytaKorttiHTML: tmKalTaytaKorttiHTML, tmKalPvmFi: tmKalPvmFi, tmKalPvmLyhyt: tmKalPvmLyhyt, tmKalNakymaCSS: function () { return CSS; }, CSS: CSS, VPAIVAT: VPAIVAT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_NAKYMA = API;
})(typeof window !== 'undefined' ? window : null);
