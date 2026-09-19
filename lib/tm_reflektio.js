/* ══════════════════════════════════════════════════════════════════════════
   tm_reflektio.js — JAETTU äänireflektio (Master_v16 + VP_v25)
   Vaihe 1: irrotettu Masterin inlinestä · Vaihe 0: recorder-ydin → lib/tm_aani.js

   MIKSI LIB: reflektio tulee molempiin appeihin (VP saa täyden päiväkirjan).
   Kaksi inline-kopiota olisi sama driftirakenne kuin COD-saagassa ja
   MAS-käännöskorjauksessa (§22): sama logiikka kolmessa tiedostossa eri
   arvoilla.

   NAUHOITIN EI OLE TÄÄLLÄ. Sama ydin palvelee VP:n ääripalautetta, joka ei ole
   reflektiota — ks. lib/tm_aani.js. Tämä tiedosto omistaa REFLEKTION: lomakkeen,
   Firestore-dokumentin ja Storage-POLUN. Polkupäätös kuuluu kutsujalle, koska
   polut eroavat näkyvyydeltään (reflektio = vain oma uid).

   §7.1  string concatenation (+), EI sisäkkäisiä template-literaaleja.
   §7.17 HTML onclick= näkee vain window-globaalit → mount asentaa window._ref*.
   §7.22 oma yksityinen kasvupäiväkirja — vain uid itse, ei jaettua näkyvyyttä.
   Infra: storage.rules seurat/{sid}/kayttajat/{uid}/reflektiot/ + CSP media-src.
   ══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var VERSIO = '1.1.0';

  /* ── Konfiguraatio (mount) ─────────────────────────────────────────────── */
  var cfg = null;
  function _arvo(x) { return (typeof x === 'function') ? x() : x; }
  function _db() { return _arvo(cfg && cfg.db); }
  function _auth() { return _arvo(cfg && cfg.auth); }
  function _seuraId() { return _arvo(cfg && cfg.seuraId); }
  function _t(s) { return (cfg && typeof cfg.t === 'function') ? cfg.t(s) : s; }
  function _toast(viesti, tyyppi) { if (cfg && typeof cfg.toast === 'function') cfg.toast(viesti, tyyppi); }
  function _muutos() { if (cfg && typeof cfg.onMuutos === 'function') cfg.onMuutos(); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* Nauhoitin-instanssi (lib/tm_aani.js). Luodaan lomakkeen avaamisen yhteydessä. */
  var nauhoitin = null;
  var _refTapahtuma = null;   // valinnainen harjoituskonteksti (Vaihe 2) — null = itsenäinen reflektio

  var ID = { btn: 'refRecBtn', aika: 'refRecAika', preview: 'refPreview', litterointi: 'refLitteroiBtn' };

  function _nauhoitin() {
    if (!nauhoitin) {
      nauhoitin = global.tmAani.luo({
        btnId: ID.btn, aikaId: ID.aika, previewId: ID.preview, litterointiNappiId: ID.litterointi
      });
    }
    return nauhoitin;
  }
  function _nollaa() { if (nauhoitin) nauhoitin.nollaa(); nauhoitin = null; }

  /* ── Lomake ────────────────────────────────────────────────────────────── */
  function avaa(opts) {
    opts = opts || {};
    _nollaa();
    _refTapahtuma = opts.tapahtuma || null;
    var prefill = opts.prefill || {};
    var vanha = document.getElementById('refModal'); if (vanha) vanha.remove();
    var m = document.createElement('div'); m.id = 'refModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding:20px 16px;overflow-y:auto';
    m.onclick = function (e) { if (e.target === m) sulje(); };
    var audioTuettu = global.tmAani.tuettu();
    var h = '<div onclick="event.stopPropagation()" style="background:var(--card);border:.5px solid var(--line);border-radius:14px;width:min(540px,96vw);padding:20px 22px;margin:auto">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--ink)">' + _t('Uusi reflektiomerkintä') + '</div><button onclick="_refSulje()" style="background:none;border:none;color:var(--ink3);font-size:24px;cursor:pointer">×</button></div>'
      + '<div style="font-size:11px;color:var(--ink3);margin-bottom:12px">' + _t('Oma yksityinen kasvupäiväkirja — vain sinä näet tämän.') + '</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:12px"><button type="button" id="refTyyppiOhjattu" onclick="_refTyyppi(\'ohjattu\')" style="flex:1;padding:8px;border-radius:7px;border:.5px solid var(--teal);background:rgba(40,176,144,.12);color:var(--teal);cursor:pointer;font-size:12px">' + _t('Ohjattu (Plan-Do-Review)') + '</button>'
      + '<button type="button" id="refTyyppiVapaa" onclick="_refTyyppi(\'vapaa\')" style="flex:1;padding:8px;border-radius:7px;border:.5px solid var(--border);background:var(--surface);color:var(--ink3);cursor:pointer;font-size:12px">' + _t('Vapaa teksti') + '</button></div>'
      + '<div id="refOhjattu">'
      + '<div style="font-size:10px;color:var(--ink3);margin-bottom:6px">' + _t('Plan-Do-Review — reflektoi harjoitus kolmessa vaiheessa.') + '</div>'
      + '<label style="font-size:11px;color:var(--ink3)">' + _t('Mikä onnistui?') + '</label><textarea id="ref_onnistui" maxlength="600" rows="2" style="width:100%;margin:3px 0 8px;padding:7px 9px;border:.5px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--ink);font-size:12px;resize:vertical">' + _esc(prefill.onnistui || '') + '</textarea>'
      + '<label style="font-size:11px;color:var(--ink3)">' + _t('Mitä tekisin toisin?') + '</label><textarea id="ref_toisin" maxlength="600" rows="2" style="width:100%;margin:3px 0 8px;padding:7px 9px;border:.5px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--ink);font-size:12px;resize:vertical">' + _esc(prefill.toisin || '') + '</textarea>'
      + '<label style="font-size:11px;color:var(--ink3)">' + _t('Kehityskohde') + '</label><textarea id="ref_kehityskohde" maxlength="400" rows="2" style="width:100%;margin:3px 0 8px;padding:7px 9px;border:.5px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--ink);font-size:12px;resize:vertical">' + _esc(prefill.kehityskohde || '') + '</textarea></div>'
      + '<div id="refVapaa" style="display:none"><label style="font-size:11px;color:var(--ink3)">' + _t('Reflektio') + '</label><textarea id="ref_teksti" maxlength="2000" rows="4" style="width:100%;margin:3px 0 8px;padding:7px 9px;border:.5px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--ink);font-size:12px;resize:vertical">' + _esc(prefill.teksti || '') + '</textarea></div>'
      + '<div style="background:var(--bg2);border:.5px solid var(--line);border-radius:10px;padding:12px 14px;margin:8px 0 12px"><div style="font-size:11px;font-weight:600;color:var(--ink2);margin-bottom:8px">' + _t('🎙 Äänireflektio') + '<span style="font-weight:400;color:var(--ink3)">' + _t('(valinnainen, max 3 min)') + '</span></div>'
      + (audioTuettu ? '<div id="refRecAlue">' + global.tmAani.alueHTML(ID, '_refRecToggle()') + '</div>' : '<div style="font-size:11px;color:var(--ink3)">' + _t('Äänitallennus ei ole tuettu tässä selaimessa — voit silti kirjoittaa reflektion.') + '</div>')
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px"><label style="font-size:12px;color:var(--ink2)">' + _t('CPD-minuutit') + '</label><input type="number" id="ref_cpd" min="0" max="600" placeholder="—" style="width:80px;padding:6px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--ink);font-size:12px"><span style="font-size:10px;color:var(--ink3)">' + _t('(tallennetaan; CPD-koonti tulossa)') + '</span></div>'
      + '<button onclick="_refTallenna()" id="refTallennaBtn" style="width:100%;padding:11px;border:none;border-radius:9px;background:var(--teal);color:#fff;font-size:14px;font-weight:600;cursor:pointer">' + _t('Tallenna merkintä') + '</button></div>';
    m.innerHTML = h; m.dataset.tyyppi = 'ohjattu'; document.body.appendChild(m);
  }

  function refTyyppi(t) {
    var m = document.getElementById('refModal'); if (m) m.dataset.tyyppi = t;
    var oh = document.getElementById('refOhjattu'), va = document.getElementById('refVapaa');
    var bo = document.getElementById('refTyyppiOhjattu'), bv = document.getElementById('refTyyppiVapaa');
    var on = function (x) { x.style.borderColor = 'var(--teal)'; x.style.background = 'rgba(40,176,144,.12)'; x.style.color = 'var(--teal)'; };
    var off = function (x) { x.style.borderColor = 'var(--border)'; x.style.background = 'var(--surface)'; x.style.color = 'var(--ink3)'; };
    if (t === 'ohjattu') { oh.style.display = 'block'; va.style.display = 'none'; on(bo); off(bv); }
    else { oh.style.display = 'none'; va.style.display = 'block'; on(bv); off(bo); }
  }

  function sulje() { _nollaa(); _refTapahtuma = null; var m = document.getElementById('refModal'); if (m) m.remove(); }

  function tallenna() {
    var au = _auth(); var cu = au && au.currentUser; var sid = _seuraId();
    if (!cu || !sid) { _toast(_t('Kirjaudu ensin'), 'error'); return Promise.resolve(); }
    var n = nauhoitin;
    var m = document.getElementById('refModal'); var tyyppi = (m && m.dataset.tyyppi) || 'ohjattu';
    var val = function (id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; };
    var doc = { pvm: new Date().toISOString().slice(0, 10), lahde: 'oma', prompt_tyyppi: tyyppi, luotu: global.firebase.firestore.FieldValue.serverTimestamp() };
    if (tyyppi === 'ohjattu') { var o = val('ref_onnistui'), t = val('ref_toisin'), kk = val('ref_kehityskohde'); if (o) doc.onnistui = o; if (t) doc.toisin = t; if (kk) doc.kehityskohde = kk; }
    else { var txt = val('ref_teksti'); if (txt) doc.teksti = txt; }
    var cpdEl = document.getElementById('ref_cpd'); var cpd = cpdEl && cpdEl.value !== '' ? Number(cpdEl.value) : null; if (cpd != null && !isNaN(cpd)) doc.cpd_minuutit = cpd;
    /* Valinnainen harjoituskonteksti (Vaihe 2, päätös 1). Itsenäinen reflektio → kenttää ei kirjoiteta. */
    if (_refTapahtuma && _refTapahtuma.id) doc.tapahtuma_id = String(_refTapahtuma.id);
    var onAani = !!(n && n.onNauhoite());
    var onTekstia = !!(doc.onnistui || doc.toisin || doc.kehityskohde || doc.teksti);
    if (!onTekstia && !onAani) { _toast(_t('Kirjoita tai nauhoita reflektio'), 'error'); return Promise.resolve(); }
    if (n && n.liianIso()) { _toast(_t('Äänitiedosto liian iso (max ~12 MB)'), 'error'); return Promise.resolve(); }
    var btn = document.getElementById('refTallennaBtn'); if (btn) { btn.disabled = true; btn.textContent = _t('Tallennetaan…'); }
    return cu.getIdToken(true).then(function () {   // §7.2
      var refDoc = _db().collection('seurat').doc(sid).collection('kayttajat').doc(cu.uid).collection('reflektiot').doc();
      if (!onAani) return refDoc;
      /* POLKU PÄÄTETÄÄN TÄÄLLÄ (ei nauhoittimessa): tämä polku on reflektion oma,
         vain uid:n luettavissa — storage.rules seurat/{sid}/kayttajat/{uid}/reflektiot/. */
      var kansio = 'seurat/' + sid + '/kayttajat/' + cu.uid + '/reflektiot';
      return n.lataa(kansio, refDoc.id).then(function (tulos) {
        doc.audio_url = tulos.url;
        doc.audio_path = tulos.polku;
        doc.audio_kesto_s = tulos.kesto_s;
        if (tulos.transkriptio) doc.transkriptio = tulos.transkriptio;   // litterointi audion rinnalle (hakukelpoinen)
        return refDoc;
      });
    }).then(function (refDoc) {
      return refDoc.set(doc);
    }).then(function () {
      _toast(_t('✓ Reflektio tallennettu'), 'ok');
      _nollaa(); _refTapahtuma = null;
      var mm = document.getElementById('refModal'); if (mm) mm.remove();
      _muutos();   // päivitä näkymä
    })['catch'](function (e) {
      _toast('Tallennus epäonnistui: ' + ((e && e.message) || 'tuntematon'), 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Tallenna merkintä'; }
    });
  }

  /* GDPR: valmentaja poistaa oman merkinnän (audio Storagesta + doc). */
  function poista(id) {
    if (typeof global.confirm === 'function' && !global.confirm(_t('Poista tämä reflektiomerkintä pysyvästi? Tätä ei voi perua.'))) return Promise.resolve();
    var au = _auth(); var cu = au && au.currentUser; var sid = _seuraId();
    if (!cu || !sid) return Promise.resolve();
    return cu.getIdToken(true).then(function () {   // §7.2
      var ref = _db().collection('seurat').doc(sid).collection('kayttajat').doc(cu.uid).collection('reflektiot').doc(id);
      return ref.get().then(function (s) { return s.exists ? s.data() : {}; }, function () { return {}; }).then(function (d) {
        if (!d.audio_path) return ref;
        return global.firebase.storage().ref(d.audio_path)['delete']().then(function () { return ref; }, function () { return ref; /* tiedosto voi jo puuttua */ });
      }).then(function (r) { return r['delete'](); });
    }).then(function () {
      _toast(_t('Merkintä poistettu'), 'ok');
      _muutos();
    })['catch'](function (e) {
      _toast('Poisto epäonnistui: ' + ((e && e.message) || 'tuntematon'), 'error');
    });
  }

  /* ── Päiväkirja ────────────────────────────────────────────────────────── */
  /* Yhden merkinnän HTML. Master renderöi aikajanansa tällä (oma + arviointiin
     sidotut B-reflektiot samassa listassa), VP samalla funktiolla Vaiheessa 3. */
  function merkintaHTML(rf) {
    var oma = rf.kind !== 'arviointi';
    var lahdeLbl = oma ? _t('oma') : _t('arvioinnista');
    var cpdChip = (rf.cpd_minuutit != null && rf.cpd_minuutit !== '') ? '<span style="font-size:9px;color:var(--amber);border:.5px solid var(--amber);padding:0 5px;border-radius:8px;margin-left:6px">CPD ' + _esc(String(rf.cpd_minuutit)) + ' min</span>' : '';
    var audioHtml = rf.audio_url ? '<audio controls preload="none" src="' + _esc(rf.audio_url) + '" style="width:100%;margin-top:6px;height:36px"></audio>' + (rf.audio_kesto_s ? '<span style="font-size:10px;color:var(--ink3);margin-left:4px">🎙 ' + global.tmAani.fmtKesto(rf.audio_kesto_s) + '</span>' : '') + (rf.transkriptio ? '<div style="font-size:12px;color:var(--ink2);margin-top:4px"><span style="color:var(--ink3)">📝</span> ' + _esc(rf.transkriptio) + '</div>' : '') : '';
    var delBtn = oma ? '<button onclick="_refPoista(\'' + rf.id + '\')" title="Poista merkintä" style="background:none;border:none;color:var(--ink3);font-size:11px;cursor:pointer">🗑</button>' : '';
    return '<div style="border-left:2px solid ' + (oma ? 'var(--teal)' : 'var(--ink3)') + ';padding:4px 0 8px 12px;margin-bottom:8px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:10px;color:var(--ink3)">' + _esc((rf.pvm || '').slice(0, 10)) + (rf.joukkue ? ' · ' + _esc(rf.joukkue) : '') + ' · ' + lahdeLbl + cpdChip + '</div>' + delBtn + '</div>'
      + (rf.onnistui ? '<div style="font-size:12px;color:var(--ink2)"><b style="color:var(--teal)">' + _t('Onnistui:') + '</b> ' + _esc(rf.onnistui) + '</div>' : '')
      + (rf.toisin ? '<div style="font-size:12px;color:var(--ink2)"><b>' + _t('Toisin:') + '</b> ' + _esc(rf.toisin) + '</div>' : '')
      + (rf.kehityskohde ? '<div style="font-size:12px;color:var(--ink2)"><b style="color:var(--amber)">Kehityskohde:</b> ' + _esc(rf.kehityskohde) + '</div>' : '')
      + (rf.teksti ? '<div style="font-size:12px;color:var(--ink2);white-space:pre-wrap">' + _esc(rf.teksti) + '</div>' : '')
      + audioHtml + '</div>';
  }

  /* Lataa oman uid:n standalone-reflektiot (sama kysely kuin Masterin inline). */
  function lataaOmat(opts) {
    opts = opts || {};
    var sid = opts.seuraId || _seuraId();
    var au = _auth(); var uid = opts.uid || (au && au.currentUser && au.currentUser.uid);
    if (!sid || !uid) return Promise.resolve([]);
    return _db().collection('seurat').doc(sid).collection('kayttajat').doc(uid).collection('reflektiot').limit(100).get()
      .then(function (rs) { return rs.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; }); }, function () { return []; });
  }

  /* Täysi päiväkirjanäkymä (Vaihe 3: VP). opts.lisaMerkinnat = arviointiin
     sidotut reflektiot, jotka eivät ole omassa kokoelmassa. */
  function renderPaivakirja(container, opts) {
    opts = opts || {};
    var el = (typeof container === 'string') ? document.getElementById(container) : container;
    if (!el) return Promise.resolve();
    return lataaOmat(opts).then(function (omat) {
      var aikajana = omat.slice();
      (opts.lisaMerkinnat || []).forEach(function (rf) { var o = {}; for (var k in rf) if (Object.prototype.hasOwnProperty.call(rf, k)) o[k] = rf[k]; o.kind = 'arviointi'; aikajana.push(o); });
      aikajana.sort(function (a, b) { return String(b.pvm || '').localeCompare(String(a.pvm || '')); });
      var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px"><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3)">' + _t('Oma reflektiopäiväkirja') + '</div>'
        + '<button onclick="_refUusi()" style="font-size:11px;padding:5px 12px;border:.5px solid var(--teal);background:rgba(40,176,144,.12);color:var(--teal);border-radius:7px;cursor:pointer">' + _t('+ Uusi merkintä') + '</button></div>';
      if (!aikajana.length) h += '<div style="font-size:12px;color:var(--ink3);padding:6px 0">' + _t('Ei reflektioita vielä. Kirjoita tai nauhoita ensimmäinen merkintä — tai täytä malli B -arvioinnin reflektio. Tämä on oma yksityinen kasvupäiväkirjasi.') + '</div>';
      else aikajana.forEach(function (rf) { h += merkintaHTML(rf); });
      el.innerHTML = h;
    });
  }

  /* ── Mount ─────────────────────────────────────────────────────────────── */
  /* HUOM briiffin signatuuriin: mount(seuraId, uid, db) ei riitä — lib tarvitsee
     myös auth-instanssin (getIdToken), projectId:n (aiProxy-URL), käännösfunktion
     (masterT vs vpT) ja refresh-callbackin (avaaValmentajaKehitys vs VP:n oma). */
  function mount(opts) {
    cfg = opts || {};
    /* Nauhoitin jakaa samat riippuvuudet. mount on idempotentti, joten kutsujan
       ei tarvitse tietää että tmAani on erillinen lib. */
    global.tmAani.mount({ auth: cfg.auth, projectId: cfg.projectId, t: cfg.t, toast: cfg.toast });
    /* §7.17: lomakkeen onclick= näkee vain window-globaalit. Nimet ennallaan
       → Masterin olemassa oleva päiväkirja-HTML toimii muuttumattomana. */
    global._refRecToggle = function () { return _nauhoitin().toggle(); };
    global._refLitteroi = function () { return _nauhoitin().litteroi(); };
    global._refUusi = function () { return avaa({}); };
    global._refTyyppi = refTyyppi;
    global._refSulje = sulje;
    global._refTallenna = tallenna;
    global._refPoista = poista;
    return API;
  }

  var API = {
    VERSIO: VERSIO,
    mount: mount,
    avaa: avaa,
    sulje: sulje,
    tallenna: tallenna,
    poista: poista,
    renderPaivakirja: renderPaivakirja,
    lataaOmat: lataaOmat,
    merkintaHTML: merkintaHTML,
    fmtKesto: function (s) { return global.tmAani.fmtKesto(s); },
    audioTuettu: function () { return global.tmAani.tuettu(); }
  };

  global.tmReflektio = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
