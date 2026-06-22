/* ════════════════════════════════════════════════════════════════════════════
 * TM_HARJOITUS — jaettu harjoitusarviointilomake (Master + VP), kaksimallinen.
 * docs/HARJOITUSARVIOINTI_SPEC.md. Data-vetoinen: A ja B jakavat saman renderöijän.
 * Carbon §5 · string concat §7.1 · pikakentät §26 · getIdToken(true) §7.2.
 * Riippuvuudet (globaalit): normiIka, laskeValmentajaHarjoitusKooste (tm_eerikkila_normit.js).
 * Kutsu: TM_HARJOITUS.avaa({ db, firebase, seuraId, config, konteksti, joukkueet, valmentajat, malliLukko, onTallennettu })
 * ════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var _S = null;   // aktiivinen tila
  var _O = null;   // avaus-optiot

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _todayISO() { var d = new Date(); var m = d.getMonth() + 1, p = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (p < 10 ? '0' : '') + p; }

  // Ikävaihe joukkueen nimestä (normiIka joukkuenimi-fallback). 5–11 lapsuus / 12–15 nuoruus.
  function _autoIkavaihe(joukkue) {
    var ika = null;
    try { if (typeof normiIka === 'function') ika = normiIka(null, null, joukkue || ''); } catch (e) { ika = null; }
    if (ika == null) return 'nuoruus';
    return ika <= 11 ? 'lapsuus' : 'nuoruus';
  }

  // ── Kriteeristöt ──
  function KRITEERIT_A(ikavaihe, q7) {
    var L = ikavaihe !== 'nuoruus';   // lapsuus oletus
    return [
      { id: 'a1', tyyppi: 'liukuri', min: 0, max: 10, kysymys: L ? 'Valmennuksen toiminta on innostavaa' : 'Valmennuksen toiminta on vaativaa ja innostavaa', kuvaus: 'Vuorovaikutus aktiivista ja kannustavaa; palaute oppimista tukevaa; huomioi kaikki pelaajat' },
      { id: 'a2', tyyppi: 'pct', kysymys: 'Pelaajat ovat harjoitusajasta liikkeessä', kuvaus: 'Liikkumisen määrä kellolla; aktiivinen lajinomainen liikkuminen, ei turhaa odottelua' },
      { id: 'a3', tyyppi: 'liukuri', min: 0, max: 10, kysymys: 'Toistojen määrä — pallokosketukset', kuvaus: 'Keskim. pallokosketukset/harjoitus. 1 = 100 kosketusta … 10 = 1000' },
      { id: 'a4', tyyppi: 'liukuri', min: 0, max: 10, kysymys: 'Toistojen määrä — teknis-taktiset toiminnat', kuvaus: 'Opittavat tilanteet. 1 = 10 toistoa … 10 = 100' },
      { id: 'a5', tyyppi: 'liukuri', min: 0, max: 10, kysymys: L ? 'Lapset heittäytyvät pelille' : 'Pelaajien toiminta on täysivauhtista', kuvaus: 'Täysillä yrittäminen; rohkeita pallollisena ja pallottomana; läsnä opetustilanteissa' },
      { id: 'a6', tyyppi: 'pct', kysymys: 'Maalintekoa mahdollistava harjoittelu', kuvaus: 'Osuus harjoitteista joissa pelinomaista viimeistelyä. 2/4 harjoitetta = 50 %' },
      { id: 'a7', tyyppi: 'liukuri', min: 0, max: 10, kysymys: q7 || 'Seuran oma tavoite', kuvaus: 'Seuran oma tavoite (konfiguraatio)' },
      { id: 'a8', tyyppi: 'toggle', kysymys: 'Annetaanko henkilökohtainen palaute valmentajalle / tiimille', kuvaus: '' }
    ];
  }
  var KRITEERIT_B = [
    { id: 'b1', kysymys: 'Harjoituksen organisointi & rakenne', matala: 'hajanainen', korkea: 'erinomaisesti jäsennelty (sujuvat siirtymät, vähän jonotusta)' },
    { id: 'b2', kysymys: 'Tavoitteen selkeys', matala: 'epäselvä', korkea: 'kirkas & kytketty jaksoteemaan / kehityskohteisiin' },
    { id: 'b3', kysymys: 'Palautteen anto — määrä', matala: 'vähäistä / harvoille', korkea: 'runsasta & kattavaa (tavoittaa kaikki)' },
    { id: 'b4', kysymys: 'Palautteen anto — laatu', matala: 'yleisluontoista', korkea: 'täsmällistä, oikea-aikaista, oivalluttavaa (kysyvä ote)' },
    { id: 'b5', kysymys: 'Pedagoginen ote & oppimisilmapiiri', matala: 'ohjaajavetoinen', korkea: 'pelaajakeskeinen (virheet sallittu, autonomian tuki)' },
    { id: 'b6', kysymys: 'Eriyttäminen & yksilöllistäminen', matala: 'yksi taso kaikille', korkea: 'yksilöity (taitotaso + kypsyysvaihe + kuormitus)' },
    { id: 'b7', kysymys: 'Vuorovaikutus & ilmapiiri', matala: 'etäinen', korkea: 'lämmin & läsnä (psykologinen turvallisuus)' }
  ];

  // ── DOM → tila (säilyttää arvot mallia/ikävaihetta vaihdettaessa) ──
  function _keraa() {
    var v = _S.vastaukset, t = _S.tasmennykset;
    function val(id) { var e = document.getElementById('ha_' + id); return e ? e.value : null; }
    function tval(id) { var e = document.getElementById('hat_' + id); return e ? e.value : null; }
    if (_S.malli === 'palloliitto') {
      ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7'].forEach(function (id) { var x = val(id); if (x != null && x !== '') v[id] = Number(x); var tx = tval(id); if (tx != null) t[id] = tx; });
      // a8 luetaan _S.a8 (toggle-tila)
    } else {
      ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].forEach(function (id) { var x = val(id); if (x != null && x !== '') v[id] = Number(x); var tx = tval(id); if (tx != null) t[id] = tx; });
      ['onnistui', 'toisin', 'kehityskohde'].forEach(function (id) { var e = document.getElementById('haref_' + id); if (e) _S.reflektio[id] = e.value; });
    }
    var jE = document.getElementById('ha_joukkue'); if (jE) _S.joukkue = jE.value;
    var pE = document.getElementById('ha_pvm'); if (pE) _S.pvm = pE.value;
  }

  // ── Renderöinti ──
  function _kriteeriRivi(k) {
    var v = _S.vastaukset, t = _S.tasmennykset;
    var ots = '<div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px">' + _esc(k.kysymys) + '</div>'
      + (k.kuvaus ? '<div style="font-size:11px;color:var(--ink3);margin-bottom:6px;line-height:1.4">' + _esc(k.kuvaus) + '</div>' : '');
    var kontrolli = '';
    if (k.tyyppi === 'toggle') {
      var on = _S.a8 === true, off = _S.a8 === false;
      kontrolli = '<div style="display:flex;gap:8px">'
        + '<button type="button" onclick="_haSetA8(true)" style="flex:1;padding:8px;border-radius:7px;border:.5px solid ' + (on ? 'var(--teal)' : 'var(--border)') + ';background:' + (on ? 'rgba(40,176,144,.15)' : 'var(--surface)') + ';color:' + (on ? 'var(--teal)' : 'var(--ink2)') + ';cursor:pointer;font-size:13px">Kyllä</button>'
        + '<button type="button" onclick="_haSetA8(false)" style="flex:1;padding:8px;border-radius:7px;border:.5px solid ' + (off ? 'var(--red)' : 'var(--border)') + ';background:' + (off ? 'rgba(201,64,64,.12)' : 'var(--surface)') + ';color:' + (off ? 'var(--red)' : 'var(--ink2)') + ';cursor:pointer;font-size:13px">Ei</button></div>';
    } else {
      var min = k.tyyppi === 'pct' ? 0 : (k.min != null ? k.min : 0);
      var max = k.tyyppi === 'pct' ? 100 : (k.max != null ? k.max : 10);
      var step = k.tyyppi === 'pct' ? 5 : 1;
      var cur = (v[k.id] != null) ? v[k.id] : '';
      var disp = (cur === '') ? '—' : (cur + (k.tyyppi === 'pct' ? ' %' : ''));
      kontrolli = '<div style="display:flex;align-items:center;gap:10px">'
        + '<input type="range" id="ha_' + k.id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + (cur === '' ? Math.round((min + max) / 2) : cur) + '"'
        + ' oninput="document.getElementById(\'haval_' + k.id + '\').textContent=this.value+\'' + (k.tyyppi === 'pct' ? ' %' : '') + '\'" style="flex:1;accent-color:var(--teal)">'
        + '<span id="haval_' + k.id + '" style="min-width:42px;text-align:right;font-family:\'Cormorant Garamond\',serif;font-size:20px;color:var(--teal)">' + _esc(disp) + '</span></div>'
        + '<textarea id="hat_' + k.id + '" maxlength="200" placeholder="Täsmennys (vapaaehtoinen)" rows="1" style="width:100%;margin-top:6px;padding:6px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:12px;resize:vertical">' + _esc(t[k.id] || '') + '</textarea>';
    }
    return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px">' + ots + kontrolli + '</div>';
  }

  function _kriteeriRiviB(k) {
    var v = _S.vastaukset, t = _S.tasmennykset, cur = (v[k.id] != null) ? v[k.id] : '';
    var ots = '<div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:6px">' + _esc(k.kysymys) + '</div>';
    var napit = '<div style="display:flex;gap:6px;margin-bottom:6px">';
    for (var i = 1; i <= 5; i++) {
      var sel = (cur === i);
      napit += '<button type="button" onclick="_haSetB(\'' + k.id + '\',' + i + ')" style="flex:1;padding:9px 0;border-radius:7px;border:.5px solid ' + (sel ? 'var(--teal)' : 'var(--border)') + ';background:' + (sel ? 'rgba(40,176,144,.15)' : 'var(--surface)') + ';color:' + (sel ? 'var(--teal)' : 'var(--ink2)') + ';cursor:pointer;font-size:14px;font-weight:600">' + i + '</button>';
    }
    napit += '</div>';
    var ankkurit = '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink3);margin-bottom:6px"><span>1 · ' + _esc(k.matala) + '</span><span style="text-align:right">5 · ' + _esc(k.korkea) + '</span></div>';
    var ts = '<textarea id="hat_' + k.id + '" maxlength="200" placeholder="Täsmennys (vapaaehtoinen)" rows="1" style="width:100%;padding:6px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:12px;resize:vertical">' + _esc(t[k.id] || '') + '</textarea>';
    return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:10px">' + ots + napit + ankkurit + ts + '</div>';
  }

  function _chip(txt, vari) { return '<span style="font-size:10px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;padding:3px 9px;border-radius:20px;border:.5px solid ' + vari + ';color:' + vari + '">' + _esc(txt) + '</span>'; }

  function _render() {
    var inner = document.getElementById('haInner'); if (!inner) return;
    var mallit = (_O.config && _O.config.mallit_kaytossa && _O.config.mallit_kaytossa.length) ? _O.config.mallit_kaytossa : ['palloliitto', 'valmennustaidot'];
    var q7 = (_O.config && _O.config.q7_kysymys) || 'Seuran oma tavoite';
    var isA = _S.malli === 'palloliitto';
    var malliLabel = isA ? 'A · Harjoittelun laatu' : 'B · Valmennustaidot';

    // Header
    var h = '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px">'
      + '<div><div style="font-family:\'Cormorant Garamond\',serif;font-size:24px;color:var(--ink);line-height:1.1">Arvioi harjoitus</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' + _chip(malliLabel, 'var(--teal)') + _chip(_S.ikavaihe === 'lapsuus' ? 'Lapsuus 5–11' : 'Nuoruus 12–15', 'var(--blue)') + (isA ? '' : _chip(_S.arviointitapa === 'itsearvio' ? 'Itsearvio' : 'Havainnointi', 'var(--amber)')) + '</div></div>'
      + '<button type="button" onclick="_haSulje()" style="background:none;border:none;color:var(--ink3);font-size:24px;cursor:pointer;line-height:1">×</button></div>';

    // Mallinvalitsin (jos >1)
    if (mallit.length > 1 && !_O.malliLukko) {
      h += '<div style="display:flex;gap:8px;margin-bottom:10px">';
      mallit.forEach(function (m) {
        var sel = _S.malli === m, lbl = m === 'palloliitto' ? 'A · Harjoittelun laatu' : 'B · Valmennustaidot';
        h += '<button type="button" onclick="_haSetMalli(\'' + m + '\')" style="flex:1;padding:9px;border-radius:8px;border:.5px solid ' + (sel ? 'var(--teal)' : 'var(--border)') + ';background:' + (sel ? 'rgba(40,176,144,.12)' : 'var(--surface)') + ';color:' + (sel ? 'var(--teal)' : 'var(--ink2)') + ';cursor:pointer;font-size:12px;font-weight:600">' + lbl + '</button>';
      });
      h += '</div>';
    }

    // Konteksti-rivi: joukkue + valmentaja + pvm + ikävaihe-toggle (+ arviointitapa malli B)
    h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">';
    // Joukkue
    if (_O.joukkueet && _O.joukkueet.length) {
      h += '<div style="flex:1;min-width:140px"><label style="font-size:10px;color:var(--ink3);text-transform:uppercase">Joukkue</label>'
        + '<select id="ha_joukkue" onchange="_haJoukkueVaihtui(this.value)" style="width:100%;padding:7px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:13px"><option value="">— valitse —</option>';
      _O.joukkueet.forEach(function (j) { h += '<option value="' + _esc(j) + '"' + (_S.joukkue === j ? ' selected' : '') + '>' + _esc(j) + '</option>'; });
      h += '</select></div>';
    } else {
      h += '<div style="flex:1;min-width:140px"><label style="font-size:10px;color:var(--ink3);text-transform:uppercase">Joukkue</label>'
        + '<input id="ha_joukkue" value="' + _esc(_S.joukkue || '') + '" onchange="_haJoukkueVaihtui(this.value)" placeholder="Joukkue" style="width:100%;padding:7px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:13px"></div>';
    }
    // Valmentaja
    if (_O.valmentajat && _O.valmentajat.length) {
      h += '<div style="flex:1;min-width:140px"><label style="font-size:10px;color:var(--ink3);text-transform:uppercase">Valmentaja</label>'
        + '<select id="ha_valm" onchange="_haValmentajaVaihtui(this.value)" style="width:100%;padding:7px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:13px"><option value="">— valitse —</option>';
      _O.valmentajat.forEach(function (c) { h += '<option value="' + _esc(c.uid) + '"' + (_S.valmentajaUid === c.uid ? ' selected' : '') + '>' + _esc(c.nimi || c.uid) + '</option>'; });
      h += '</select></div>';
    } else {
      h += '<div style="flex:1;min-width:140px"><label style="font-size:10px;color:var(--ink3);text-transform:uppercase">Valmentaja</label>'
        + '<div style="padding:7px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--bg2);color:var(--ink2);font-size:13px">' + _esc(_S.valmentaja || '—') + '</div></div>';
    }
    // Pvm
    h += '<div style="min-width:130px"><label style="font-size:10px;color:var(--ink3);text-transform:uppercase">Päivämäärä</label>'
      + '<input type="date" id="ha_pvm" value="' + _esc(_S.pvm) + '" style="width:100%;padding:7px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:13px"></div>';
    h += '</div>';

    // Ikävaihe + arviointitapa togglet
    h += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px;font-size:11px;color:var(--ink3)">';
    h += '<div>Ikävaihe: <button type="button" onclick="_haSetIka(\'lapsuus\')" style="padding:4px 10px;border-radius:6px;border:.5px solid ' + (_S.ikavaihe === 'lapsuus' ? 'var(--teal)' : 'var(--border)') + ';background:' + (_S.ikavaihe === 'lapsuus' ? 'rgba(40,176,144,.12)' : 'transparent') + ';color:' + (_S.ikavaihe === 'lapsuus' ? 'var(--teal)' : 'var(--ink2)') + ';cursor:pointer;font-size:11px">Lapsuus</button> '
      + '<button type="button" onclick="_haSetIka(\'nuoruus\')" style="padding:4px 10px;border-radius:6px;border:.5px solid ' + (_S.ikavaihe === 'nuoruus' ? 'var(--teal)' : 'var(--border)') + ';background:' + (_S.ikavaihe === 'nuoruus' ? 'rgba(40,176,144,.12)' : 'transparent') + ';color:' + (_S.ikavaihe === 'nuoruus' ? 'var(--teal)' : 'var(--ink2)') + ';cursor:pointer;font-size:11px">Nuoruus</button></div>';
    if (!isA) {
      h += '<div>Arviointitapa: <button type="button" onclick="_haSetTapa(\'itsearvio\')" style="padding:4px 10px;border-radius:6px;border:.5px solid ' + (_S.arviointitapa === 'itsearvio' ? 'var(--amber)' : 'var(--border)') + ';background:' + (_S.arviointitapa === 'itsearvio' ? 'rgba(224,160,64,.12)' : 'transparent') + ';color:' + (_S.arviointitapa === 'itsearvio' ? 'var(--amber)' : 'var(--ink2)') + ';cursor:pointer;font-size:11px">Itsearvio</button> '
        + '<button type="button" onclick="_haSetTapa(\'havainnointi\')" style="padding:4px 10px;border-radius:6px;border:.5px solid ' + (_S.arviointitapa === 'havainnointi' ? 'var(--amber)' : 'var(--border)') + ';background:' + (_S.arviointitapa === 'havainnointi' ? 'rgba(224,160,64,.12)' : 'transparent') + ';color:' + (_S.arviointitapa === 'havainnointi' ? 'var(--amber)' : 'var(--ink2)') + ';cursor:pointer;font-size:11px">Havainnointi</button></div>';
    }
    h += '</div>';

    // Kriteerit
    if (isA) {
      KRITEERIT_A(_S.ikavaihe, q7).forEach(function (k) { h += _kriteeriRivi(k); });
    } else {
      KRITEERIT_B.forEach(function (k) { h += _kriteeriRiviB(k); });
      // Reflektio
      var r = _S.reflektio;
      h += '<div style="background:var(--card);border:.5px solid var(--teal);border-radius:10px;padding:12px 14px;margin-bottom:10px">'
        + '<div style="font-size:12px;font-weight:600;color:var(--teal);text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Itsereflektio</div>'
        + '<label style="font-size:11px;color:var(--ink3)">Mikä onnistui?</label><textarea id="haref_onnistui" maxlength="300" rows="2" style="width:100%;margin:4px 0 8px;padding:6px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:12px;resize:vertical">' + _esc(r.onnistui || '') + '</textarea>'
        + '<label style="font-size:11px;color:var(--ink3)">Mitä tekisin toisin?</label><textarea id="haref_toisin" maxlength="300" rows="2" style="width:100%;margin:4px 0 8px;padding:6px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:12px;resize:vertical">' + _esc(r.toisin || '') + '</textarea>'
        + '<label style="font-size:11px;color:var(--ink3)">Oma kehityskohde valmentajana</label><textarea id="haref_kehityskohde" maxlength="200" rows="2" style="width:100%;margin:4px 0 0;padding:6px 8px;border:.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:12px;resize:vertical">' + _esc(r.kehityskohde || '') + '</textarea></div>';
    }

    h += '<button type="button" onclick="_haTallenna()" id="haTallennaBtn" style="width:100%;margin-top:6px;padding:11px;border:none;border-radius:9px;background:var(--teal);color:#fff;font-size:14px;font-weight:600;cursor:pointer">Tallenna arviointi</button>';
    inner.innerHTML = h;
  }

  // ── Event-handlerit (globaalit, onclick) ──
  window._haSetMalli = function (m) { _keraa(); _S.malli = m; _render(); };
  window._haSetIka = function (i) { _keraa(); _S.ikavaihe = i; _render(); };
  window._haSetTapa = function (t) { _keraa(); _S.arviointitapa = t; _render(); };
  window._haSetA8 = function (b) { _S.a8 = b; _render(); };
  window._haSetB = function (id, v) { _keraa(); _S.vastaukset[id] = v; _render(); };
  window._haJoukkueVaihtui = function (j) { _keraa(); _S.joukkue = j; _S.ikavaihe = _autoIkavaihe(j); _render(); };
  window._haValmentajaVaihtui = function (uid) {
    _keraa(); _S.valmentajaUid = uid;
    var c = (_O.valmentajat || []).filter(function (x) { return x.uid === uid; })[0];
    if (c) { _S.valmentaja = c.nimi || uid; if (c.joukkue && !_S.joukkue) { _S.joukkue = c.joukkue; _S.ikavaihe = _autoIkavaihe(c.joukkue); } }
    _render();
  };
  window._haSulje = function () { var m = document.getElementById('haModal'); if (m) m.remove(); _S = null; _O = null; };

  window._haTallenna = async function () {
    _keraa();
    if (!_S.valmentajaUid) { _toast('Valitse valmentaja ensin', 'error'); return; }
    if (!_S.joukkue) { _toast('Anna joukkue ensin', 'error'); return; }
    var btn = document.getElementById('haTallennaBtn'); if (btn) { btn.disabled = true; btn.textContent = 'Tallennetaan…'; }
    try {
      var fb = _O.firebase, db = _O.db, sid = _O.seuraId;
      var u = fb && fb.auth ? fb.auth().currentUser : null; if (u) await u.getIdToken(true);   // §7.2
      var doc = {
        malli: _S.malli,
        arviointitapa: _S.arviointitapa,
        ikavaihe: _S.ikavaihe,
        joukkue: _S.joukkue || null,
        valmentaja: _S.valmentaja || null,
        valmentajaUid: _S.valmentajaUid,
        arvioija: _S.arvioija || null,
        arvioijaUid: _S.arvioijaUid || (u ? u.uid : null),
        pvm: _S.pvm || _todayISO(),
        vastaukset: _S.vastaukset,
        tasmennykset: _S.tasmennykset,
        luotu: fb.firestore.FieldValue.serverTimestamp()
      };
      if (_S.malli === 'valmennustaidot') doc.reflektio = _S.reflektio;
      else doc.henk_palaute = (_S.a8 === true);
      await db.collection('seurat').doc(sid).collection('harjoitusarvioinnit').add(doc);

      // Pikakentät valmentajan kayttajat-dokiin (vain pikakenttä-avaimet — EI rooli)
      try {
        var snap = await db.collection('seurat').doc(sid).collection('harjoitusarvioinnit').where('valmentajaUid', '==', _S.valmentajaUid).get();
        var lista = snap.docs.map(function (d) { return d.data(); });
        if (typeof laskeValmentajaHarjoitusKooste === 'function') {
          var k = laskeValmentajaHarjoitusKooste(lista);
          var pika = {};
          ['harjoituslaatu_ka', 'harjoituslaatu_n', 'harjoituslaatu_pvm', 'harjoituslaatu_liike_pct', 'harjoituslaatu_maali_pct', 'valmennustaito_ka', 'valmennustaito_n', 'valmennustaito_pvm'].forEach(function (key) { if (k[key] !== undefined) pika[key] = k[key]; });
          await db.collection('seurat').doc(sid).collection('kayttajat').doc(_S.valmentajaUid).set(pika, { merge: true });
        }
      } catch (e2) { /* pikakenttä-päivitys best-effort */ }

      _toast('✓ Harjoitusarviointi tallennettu', 'ok');
      var cb = _O.onTallennettu;
      window._haSulje();
      if (typeof cb === 'function') cb();
    } catch (e) {
      _toast('Tallennus epäonnistui: ' + ((e && e.message) || 'tuntematon'), 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Tallenna arviointi'; }
    }
  };

  function _toast(msg, tyyppi) { if (typeof window.toast === 'function') window.toast(msg, tyyppi); else if (tyyppi === 'error') alert(msg); }

  // ── Julkinen API ──
  function avaa(opts) {
    _O = opts || {};
    var k = _O.konteksti || {};
    var malli = _O.malliLukko || (_O.config && _O.config.oletusmalli) || 'palloliitto';
    var mallit = (_O.config && _O.config.mallit_kaytossa && _O.config.mallit_kaytossa.length) ? _O.config.mallit_kaytossa : ['palloliitto', 'valmennustaidot'];
    if (mallit.indexOf(malli) < 0) malli = mallit[0];
    _S = {
      malli: malli,
      ikavaihe: k.ikavaihe || _autoIkavaihe(k.joukkue),
      arviointitapa: k.arviointitapa || 'itsearvio',
      joukkue: k.joukkue || '',
      valmentaja: k.valmentaja || '',
      valmentajaUid: k.valmentajaUid || '',
      arvioija: k.arvioija || '',
      arvioijaUid: k.arvioijaUid || '',
      pvm: k.pvm || _todayISO(),
      a8: null,
      vastaukset: {}, tasmennykset: {}, reflektio: {}
    };
    var vanha = document.getElementById('haModal'); if (vanha) vanha.remove();
    var m = document.createElement('div');
    m.id = 'haModal';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9400;display:flex;align-items:flex-start;justify-content:center;padding:20px 16px;overflow-y:auto';
    m.onclick = function (e) { if (e.target === m) window._haSulje(); };
    m.innerHTML = '<div onclick="event.stopPropagation()" style="background:var(--bg2);border:.5px solid var(--border);border-radius:14px;width:min(560px,96vw);padding:20px 22px;margin:auto"><div id="haInner"></div></div>';
    document.body.appendChild(m);
    _render();
  }

  window.TM_HARJOITUS = { avaa: avaa, KRITEERIT_A: KRITEERIT_A, KRITEERIT_B: KRITEERIT_B, _autoIkavaihe: _autoIkavaihe };
})();
