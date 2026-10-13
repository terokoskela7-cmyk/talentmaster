/* ════════════════════════════════════════════════════════════════════════
   tm_kt_jakso.js — kehitystyöpöytä 22 · kierros B · B2b (D100): Aloita / Vahvista / Muokkaa jakso SHEETINÄ uudella sivulla. Dual-export: module.exports || window.TM_KT_JAKSO.
   Sama lomake, validointi ja kirjoitus kuin Masterin/VP:n modaalissa (lib/tm_aloita_jakso.js + tm_jakso_malli.js + tm_kehityssilmukka.js) — vain kuori on sheet (lib/tm_sheet.js, pitkä = 390 px koko ruutu / työpöydällä dialogi; sulkeminen säilyttää luonnoksen).
   Vanha näkymä (Master, VP) ennallaan: tämä moduuli ladataan vain uudelle sivulle (lipun kehitystyopoyta_v2 takana).
   · tmKtPp(p)                         → { ika, sp, joukkue, positio, tt_positio_aktiivinen, syntymaVuosi } (testihetken ikä: normiIka §26; sama sääntö kuin Masterin _devIkaSp/_mAjPelaajaPp)
   · tmKtJaksoNappiAvain(p)            → 'aloita' | 'vahvista' | 'muokkaa' (tmJaksoNappi)
   · tmKtJaksoSheet(env)               → { avaa(pid, esivalintaAvain?), tallenna(pid), sulje() }
        env: { KS (TM_KEHITYSSILMUKKA), db, sid, doc, win, t (D248-sanastolla), esc, rooli, uid, auth, sheet (TM_SHEET-hallinta), toast(teksti), nayta(), pelaaja(pid), liput(): Promise<{kentta}>, joukkueDocs, nyt(): Date, henkilosto(): Promise<[]>, arrayUnion(...), verkossa(): boolean, seuranNimi, virheTeksti(teksti, virhe) }
   Kirjoitus: YKSI update (tmAloitaJaksoKirjoitus) vasta kun validointi on läpi; paikallinen tila vasta onnistumisen jälkeen; virhe → toast + sheet auki (luonnos säilyy).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _g(nimi, polku) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(polku) : (root && root[nimi]); } catch (e) { return root && root[nimi]; } }
  function _fn(nimi) { return (root && typeof root[nimi] === 'function') ? root[nimi] : undefined; }
  function _paiva(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var ID = 'jakso';   // sheet-id = ID + '_' + pid (yksi luonnos per pelaaja)
  function _id(pid) { return ID + '_' + pid; }

  var ALIAS = { 'keskikenttä': 'KK', 'keskikentta': 'KK', 'keskari': 'KK', 'hyökkääjä': 'KH', 'hyokkaaja': 'KH', 'kärki': 'KH', 'laita': 'LA', 'laitahyökkääjä': 'LA', 'puolustaja': 'T', 'keskuspuolustaja': 'T', 'maalivahti': 'MV', 'veskari': 'MV' };   // sama kuin Masterin _ttNormPositio
  function _positio(p) {
    var P = root && root.TM_TT_PELIPAIKAT, val = p.tt_positio_aktiivinen || p.positio || p.pelipaikka;
    if (p.tt_positio_aktiivinen) return p.tt_positio_aktiivinen;
    if (!val || !P) return null; var s = String(val).trim(); if (!s) return null; var up = s.toUpperCase(); if (P[up]) return up;
    var low = s.toLowerCase(); for (var k in P) { var n = (P[k].nimi || '').toLowerCase(); if (n && (low === n || n.indexOf(low) === 0 || low.indexOf(n) === 0)) return k; }
    return ALIAS[low] || null;
  }
  function tmKtPp(p) {   // ikä testipäivästä (§26/§14), sukupuoli M/N; sama kuin Masterin _devIkaSp
    p = p || {}; var normiIka = _fn('normiIka'), pvm = p.hh_pvm || p.d1_pvm || p.tki_pvm || p.d2_pvm || null, ika = null, sp = (p.sukupuoli === 'P' || p.sukupuoli === 'M') ? 'M' : (p.sukupuoli === 'T' || p.sukupuoli === 'N') ? 'N' : null;
    try { ika = normiIka ? normiIka(p.syntymaVuosi, pvm, p.joukkue) : (p.syntymaVuosi ? new Date().getFullYear() - p.syntymaVuosi : null); } catch (e) { ika = null; }
    var jm = String(p.joukkue || '').match(/\b([PTU])\s?(\d{1,2})\b/i); if (ika == null && jm) ika = parseInt(jm[2], 10); if (sp == null && jm) sp = jm[1].toUpperCase() === 'T' ? 'N' : 'M'; if (sp == null) sp = 'M';
    var pc = _positio(p); return { ika: ika, sp: sp, joukkue: p.joukkue, positio: pc, tt_positio_aktiivinen: pc, syntymaVuosi: p.syntymaVuosi };
  }
  function tmKtJaksoNappiAvain(p) { var AJ = _g('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); return AJ ? AJ.tmJaksoNappi(p) : 'aloita'; }

  function tmKtJaksoSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), tila = {};   // tila[pid] = { x, otsikko, avaaja }
    var AJ = function () { return _g('TM_ALOITA_JAKSO', './tm_aloita_jakso.js'); };
    function _naytaNimet(items) {   // D248: harjoiteltavan asian nimi arkikielellä lomakkeessa (tallennus käyttää kanonista nimeä)
      var SN = _g('TM_SANASTO', './tm_sanasto.js'); if (!SN) return items;
      return (items || []).map(function (it) { var n = SN.tmSanastoKonseptiNimi(it.avain, it.nimi); return n === it.nimi ? it : Object.assign({}, it, { nimi: n, kanoninenNimi: it.nimi }); });
    }
    function _items(pp) { var kaanon = _fn('tmTtItems') ? root.tmTtItems(pp) : []; return _fn('tmKonseptiListaa') ? root.tmKonseptiListaa(kaanon, env.sid) : kaanon; }
    function _ehdotus(p, pp) {
      var R = root && root.TM_KEHITYSPOLKU, py = root && root.TM_PELIALY_YKSILO; if (!R || !p || !p.idp_fokus || !p.idp_fokus.alue) return null;
      var g = function (n) { return (root && typeof root[n] === 'function') ? root[n] : undefined; };
      try { return R.tmRatkaiseKehityspolku(p.idp_fokus, pp, { tmPelialyYksiloEhdota: py && py.tmPelialyYksiloEhdota, tmTtKysymykset: g('tmTtKysymykset'), tmTtHarjoitteet: g('tmTtHarjoitteet'), tmTtVaihe: g('tmTtVaihe'), tmTaksonomiaByAvain: g('tmTaksonomiaByAvain') }); } catch (e) { return null; }
    }
    function _hae(nimi, f) { return Promise.resolve().then(f).catch(function (e) { if (typeof console !== 'undefined') console.warn('[B2b] lähde ' + nimi + ':', e && e.message); return null; }); }
    function _haeTuki(p) {   // pelaajasta riippumattomat lähteet + havainnot RINNAKKAIN; yhden lähteen virhe → lähde jää pois (lomake aukeaa silti)
      var a = AJ(), seura = env.db.collection('seurat').doc(env.sid), jid = a.tmAjJoukkueId(p.joukkue || (Array.isArray(p.joukkueet) ? p.joukkueet[0] : ''));
      return Promise.all([
        _hae('joukkuejakso', function () { if (!jid) return null; var d = (env.joukkueDocs || []).filter(function (x) { return x.id === jid; })[0]; if (d) return { jid: jid, data: d }; return seura.collection('joukkueet').doc(jid).get().then(function (sn) { return sn.exists ? { jid: jid, data: Object.assign({ id: jid }, sn.data()) } : null; }); }),
        _hae('arviointikehys', function () { return seura.collection('konfiguraatio').doc(a.KONF.arviointikehys).get().then(function (sn) { var avain = sn.exists ? (sn.data() || {}).kehys : null; return _fn('tmKehys') ? root.tmKehys(avain || 'palloliitto') : null; }); }),
        _hae('prosessiprofiili', function () { return seura.collection('konfiguraatio').doc(a.KONF.prosessiprofiili).get().then(function (sn) { return sn.exists ? sn.data() : null; }); }),
        _hae('harjoitepankki', function () { return seura.collection('harjoitepankki').get().then(function (sn) { return sn.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }); }); }),
        _hae('ohjelmat', function () { return seura.collection('ohjelmat').get().then(function (sn) { return sn.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }).filter(function (o) { return o.tila !== 'luonnos'; }); }); }),   // luonnos ei ole käytettävissä (ei jakso-snapshotiin)
        _hae('havainnot', function () { return seura.collection('pelaajat').doc(p.id).collection('havainnot').where('tyyppi', '==', 'adar_pikakortti').get().then(function (sn) { return sn.docs.map(function (d) { return d.data(); }); }); })
      ]).then(function (r) { return { joukkue: r[0], kehys: r[1], profiili: r[2], seuranPankki: r[3], seuranOhjelmat: r[4], havainnot: r[5] }; });
    }
    function _nimi(p) { var s = String(p.nimi || ((p.etunimi || '') + ' ' + (p.sukunimi || ''))).trim(); return s || ''; }

    function avaa(pid, esivalintaAvain) {   // → Promise<boolean>
      var p = env.pelaaja(pid), a = AJ(); if (!p || !a) return Promise.resolve(false);
      if (env.sheet.avoinna() === _id(pid)) return Promise.resolve(true);
      if (env.sheet.luonnos(_id(pid)) && tila[pid]) { env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: tila[pid].otsikko, avaaja: tila[pid].avaaja }); return Promise.resolve(true); }   // luonnos säilytetty (D100): palautetaan sellaisenaan
      var pp = tmKtPp(p), ehd = _ehdotus(p, pp), VH = _g('TM_VASTUUHENKILO', './tm_vastuuhenkilo.js');
      var henk = typeof env.henkilosto === 'function' ? Promise.resolve().then(env.henkilosto).catch(function () { return []; }) : Promise.resolve([]);
      return Promise.resolve(typeof env.liput === 'function' ? env.liput() : {}).catch(function () { return {}; }).then(function (liput) {
        var kentta = !!(liput && liput.kentta === true && typeof a.tmAloitaJaksoTuki === 'function');
        return Promise.all([henk, kentta ? _haeTuki(p).catch(function () { return null; }) : null]).then(function (r) {
          var tuki = null; try { if (kentta && r[1]) tuki = a.tmAloitaJaksoTuki(p, { tanaan: _paiva(env.nyt ? env.nyt() : new Date()), ika: pp.ika, sp: pp.sp, haetut: r[1], tmPankki: (root && root.TM_KOTI_OLETUS) || null, seuraNimi: env.seuranNimi || null }); } catch (e) { if (typeof console !== 'undefined') console.warn('[B2b] tukiosio:', e && e.message); tuki = null; }
          var x = a.tmAloitaJaksoTiedot(p, { tuki: tuki, items: _naytaNimet(_items(pp)) || [], ehdotusAvain: ehd && ehd.tyyppi === 'teknis_taktinen' ? ehd.konsepti_avain : null, esivalintaAvain: esivalintaAvain || null, ika: pp.ika, nimi: _nimi(p), vastuuhenkilot: VH ? VH.tmVastuuhenkiloVaihtoehdot(r[0] || []) : null });
          var tmp = doc.createElement('div'); tmp.innerHTML = a.tmAloitaJaksoModalHTML(x, { esc: env.esc, t: env.t, modalId: '_ktJaksoLomake', overlayAttrs: 'style="display:block"', tallennaFn: '_ktJaksoTallenna', suljeFn: '_ktJaksoSulje' });
          var laatikko = tmp.firstChild && tmp.firstChild.firstChild, otsikkoEl = laatikko && laatikko.firstChild, otsikko = otsikkoEl ? otsikkoEl.textContent : '';
          if (otsikkoEl) laatikko.removeChild(otsikkoEl);   // otsikko siirtyy sheetin yläriville
          laatikko.style.cssText = 'color:var(--ink)';
          tila[pid] = { x: x, otsikko: otsikko, avaaja: doc.querySelector('[data-kt-ensisijainen]') || null };
          return env.sheet.avaa({ id: _id(pid), tyyppi: 'pitka', otsikko: otsikko, sisalto: laatikko, avaaja: tila[pid].avaaja });
        });
      });
    }
    function sulje() { var id = env.sheet.avoinna(); if (id && id.indexOf(ID + '_') === 0) env.sheet.sulje(id); }

    function tallenna(pid) {   // → Promise<{ok, syy}>
      var p = env.pelaaja(pid), a = AJ(), JM = _g('TM_JAKSO_MALLI', './tm_jakso_malli.js'), VH = _g('TM_VASTUUHENKILO', './tm_vastuuhenkilo.js'), runko = env.sheet.runko(_id(pid));
      if (!p || !a || !JM || !runko) return Promise.resolve({ ok: false, syy: 'ei_lomaketta' });
      var arvo = function (id) { var el = runko.querySelector('#' + id); return el ? (el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value) : ''; };
      var x = tila[pid] && tila[pid].x, v1 = !!(x && x.tuki && x.pid === pid), pp = tmKtPp(p), syote = v1 ? a.tmAloitaJaksoSyoteV2(arvo, x) : a.tmAloitaJaksoSyote(arvo), item = (_items(pp) || []).filter(function (it) { return it.avain === syote.konsepti_avain; })[0];
      var tulos, nyt = env.nyt ? env.nyt() : new Date();
      try {
        var sy = Object.assign({}, syote, { konsepti_nimi: item ? (item.kanoninenNimi || item.nimi) : null, konsepti_koodi: item ? item.koodi : null }), op = { tanaan: _paiva(nyt), rooli: env.rooli === 'super_admin' ? 'vp' : env.rooli, ika: pp.ika, nytISO: nyt.toISOString() };
        tulos = v1 ? a.tmAloitaJaksoV2(p, sy, x, op) : JM.tmAloitaJakso(p, sy, op);
      } catch (e) { var syy = String(e && e.message || '').replace(/^tm_(jakso_malli|aloita_jakso|tukitavoitteet):\s*/, ''); env.toast(env.t('Jaksoa ei voi aloittaa') + ': ' + syy); return Promise.resolve({ ok: false, syy: syy }); }   // validointi ENNEN kirjoitusta; sheet jää auki
      var vh = null;
      if (syote.vastuuhenkilo_arvo && VH) { try { var o = syote.vastuuhenkilo_arvo.split('|'); vh = VH.tmVastuuhenkiloAsetus(p, { uid: o[0], rooli: o[1] }, _paiva(nyt)).kirjoitus.vastuuhenkilo; } catch (e) { env.toast(env.t('Vastuuhenkilön asetus epäonnistui')); return Promise.resolve({ ok: false, syy: 'vastuuhenkilo' }); } }
      if (typeof env.verkossa === 'function' && !env.verkossa()) { env.toast(env.t('Tallennus ei onnistunut, koska verkkoyhteys puuttuu. Yritä uudelleen, kun yhteys palaa.')); return Promise.resolve({ ok: false, syy: 'offline' }); }
      var v = env.KS.tmAsetaJaksofokus(p, tulos.jaksofokus, { nytISO: nyt.toISOString() }); delete v.jaksofokus.tila;   // "valittavana" päättyy kun valmentaja vahvistaa/aloittaa jakson
      var paivita = function () { p.jaksofokus = v.jaksofokus; p.ydinvahvuus = tulos.ydinvahvuus; if (vh) p.vastuuhenkilo = vh; if (v.historiaLisays && v.historiaLisays.length) p.jaksofokus_historia = (Array.isArray(p.jaksofokus_historia) ? p.jaksofokus_historia : []).concat(v.historiaLisays); };
      return Promise.resolve().then(function () { var cu = env.auth(); return cu ? cu.getIdToken(true) : null; })
        .then(function () { return env.db.collection('seurat').doc(env.sid).collection('pelaajat').doc(p.id).update(a.tmAloitaJaksoKirjoitus(v, tulos, vh, { arrayUnion: env.arrayUnion })); })
        .then(function () { paivita(); env.sheet.tallennettu(_id(pid)); delete tila[pid]; env.toast(env.t('Jakso aloitettu') + ' ✓'); if (typeof env.nayta === 'function') env.nayta(); return { ok: true }; })
        .catch(function (e) { if (typeof console !== 'undefined') console.warn('[B2b] aloitaJakso:', e && e.message); env.toast(typeof env.virheTeksti === 'function' ? env.virheTeksti(env.t('Tallennus epäonnistui — tarkista oikeutesi tai yritä uudelleen'), e) : env.t('Tallennus epäonnistui — tarkista oikeutesi tai yritä uudelleen')); return { ok: false, syy: (e && e.code === 'permission-denied') ? 'oikeudet' : 'tallennus' }; });   // virhe näkyy; sheet auki, luonnos säilyy
    }
    return { avaa: avaa, tallenna: tallenna, sulje: sulje };
  }

  var API = { ID: ID, tmKtPp: tmKtPp, tmKtJaksoNappiAvain: tmKtJaksoNappiAvain, tmKtJaksoSheet: tmKtJaksoSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_JAKSO = API;
})(typeof window !== 'undefined' ? window : this);
