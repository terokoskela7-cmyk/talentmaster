/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_pikakirjaus.js — PIKAKIRJAUS-LOMAKE (P2.1, docs/CODE_OHJE_TESTIT_HUB_P2.md)
   Kevyt "kirjaa tulos" 1–N pelaajalle ilman tapahtumaa. Jaettu VP_v25 + Master_v16 (TM_PIKAKIRJAUS.avaa(ctx)).

   Flow: joukkue → 1–N pelaajaa → testit (TM_TESTIKATALOGI) → 📅 testipäivä (oletus tänään, muutettavissa) →
   syöttöruudukko → Tallenna per pelaaja:
     · testitulokset/{pvm}_pikakirjaus  (§22 Moodi B, upsert)
     · hh_historia/tki_historia         (tm_historia, testipäivän pvm)
     · pikakentät                        TM_PIKAKENTAT.tmLaskePikakentat(pelaajaDoc, tulokset, testipäivä) → ref.update
                                         → §26 pari-invariantti + viimeisin-vartija HOITUU LIBISSÄ (ei replikoida).

   Testipäivä ohjaa *_pvm:n JA normiIka:n (libissä) — EI Date.now laskennassa. Riippuvuudet: TM_TESTIKATALOGI,
   TM_PIKAKENTAT (H-H aina; TKI vain jos TKI-funktiot ladattu → VP tekee H-H:n, Master H-H+TKI), tm_historia (valinn.),
   ctx.db/seuraId/uid/pelaajat/joukkueNimet/toast. Itsekuvaava, teematietoinen modaali (prefers-color-scheme).
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var STYLE_ID = 'tmpk-styles';
  // Teema: tumma oletus (canonical Carbon) + vaalea overridena. Kunnioittaa hostin eksplisiittistä
  // :root[data-theme] -valitsinta (VP) JA OS-preferenssiä (prefers-color-scheme) → "molemmat teemat".
  var _LIGHT =
    '.tmpk-panel{background:#FBFAF7;color:#1C1C1A;border-color:rgba(28,28,26,.14);}' +
    '.tmpk-sub{color:rgba(28,28,26,.6);}.tmpk-sect,.tmpk-count{color:rgba(28,28,26,.5);}' +
    '.tmpk-panel input,.tmpk-panel select{background:#FFFFFF;border-color:rgba(28,28,26,.18);color:#1C1C1A;}' +
    '.tmpk-grid th,.tmpk-grid td{border-color:rgba(28,28,26,.09);}.tmpk-grid thead th{color:rgba(28,28,26,.6);}' +
    '.tmpk-grid th:first-child,.tmpk-grid td:first-child{background:#FBFAF7;}';
  var _DARK =
    '.tmpk-panel{background:#161614;color:#E8EEF8;border-color:rgba(255,255,255,.10);}' +
    '.tmpk-sub{color:rgba(232,238,248,.6);}.tmpk-sect,.tmpk-count{color:rgba(232,238,248,.5);}' +
    '.tmpk-panel input,.tmpk-panel select{background:#1C1C1A;border-color:rgba(255,255,255,.14);color:#E8EEF8;}' +
    '.tmpk-grid th,.tmpk-grid td{border-color:rgba(255,255,255,.07);}.tmpk-grid thead th{color:rgba(232,238,248,.6);}' +
    '.tmpk-grid th:first-child,.tmpk-grid td:first-child{background:#161614;}';
  var TMPK_CSS =
    '.tmpk-ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:24px 12px;font-family:"DM Sans",system-ui,sans-serif;}' +
    '.tmpk-panel{background:#161614;color:#E8EEF8;border:.5px solid rgba(255,255,255,.10);border-radius:14px;max-width:860px;width:100%;padding:22px 22px 18px;box-shadow:0 20px 60px rgba(0,0,0,.5);}' +
    '.tmpk-eyebrow{font-size:11px;letter-spacing:.09em;text-transform:uppercase;color:#28B090;font-weight:600;}' +
    '.tmpk-title{font-family:"Cormorant Garamond",Georgia,serif;font-weight:400;font-size:26px;margin:2px 0 2px;}' +
    '.tmpk-sub{font-size:12.5px;color:rgba(232,238,248,.6);line-height:1.5;margin-bottom:14px;}' +
    '.tmpk-sect{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:rgba(232,238,248,.5);margin:16px 0 6px;}' +
    '.tmpk-row{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;}' +
    '.tmpk-panel input,.tmpk-panel select{background:#1C1C1A;border:.5px solid rgba(255,255,255,.14);border-radius:7px;color:#E8EEF8;padding:8px 10px;font-family:inherit;font-size:13px;}' +
    '.tmpk-panel input[type=number]{width:78px;padding:6px 8px;}' +
    '.tmpk-chk{display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;}' +
    '.tmpk-tests{display:flex;flex-wrap:wrap;gap:6px 14px;}' +
    '.tmpk-day{font-weight:600;color:#28B090;}' +
    '.tmpk-gridwrap{overflow-x:auto;margin-top:6px;border:.5px solid rgba(255,255,255,.10);border-radius:10px;}' +
    '.tmpk-grid{border-collapse:collapse;width:100%;font-size:13px;}' +
    '.tmpk-grid th,.tmpk-grid td{padding:7px 9px;border-bottom:.5px solid rgba(255,255,255,.07);text-align:center;white-space:nowrap;}' +
    '.tmpk-grid th:first-child,.tmpk-grid td:first-child{text-align:left;position:sticky;left:0;background:#161614;}' +
    '.tmpk-grid thead th{color:rgba(232,238,248,.6);font-weight:500;font-size:11.5px;}' +
    '.tmpk-btn{border:none;border-radius:8px;padding:9px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;}' +
    '.tmpk-btn.pri{background:#28B090;color:#08130F;}' +
    '.tmpk-btn.ghost{background:none;color:rgba(232,238,248,.6);}' +
    '.tmpk-foot{display:flex;gap:12px;align-items:center;margin-top:16px;flex-wrap:wrap;}' +
    '.tmpk-count{font-size:12px;color:rgba(232,238,248,.5);}' +
    '.tmpk-note{font-size:11.5px;color:#E0A040;margin-top:6px;}' +
    '@media (prefers-color-scheme: light){' + _LIGHT + '}' +
    _themed(':root[data-theme="light"]', _LIGHT) +
    _themed(':root[data-theme="dark"]', _DARK);
  // Prefiksoi jokainen (myös pilkuilla eritelty) valitsin → data-theme-scope oikein (ei vuotoa globaaliin).
  function _themed(prefix, cssRules) {
    return cssRules.replace(/([^{}]+)\{([^}]*)\}/g, function (_m, sels, body) {
      return sels.split(',').map(function (s) { return prefix + ' ' + s.trim(); }).join(',') + '{' + body + '}';
    });
  }

  function _injectStyles() {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style'); s.id = STYLE_ID; s.textContent = TMPK_CSS; document.head.appendChild(s);
  }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function _pad(n) { return String(n).length < 2 ? '0' + n : String(n); }
  function _today() { var d = new Date(); return d.getFullYear() + '-' + _pad(d.getMonth() + 1) + '-' + _pad(d.getDate()); }
  function _nimi(p) { return ((p.etunimi || '') + ' ' + (p.sukunimi || '')).trim() || p.nimi || p.id; }

  // ── PUHTAAT apufunktiot (vitest) ──────────────────────────────────────────────────────────
  // Rivin syöteet → tulokset (lib-avaimin, skalaarit). rivi = {catalogId: arvo}; testIdt = katalogi-id:t.
  function _tuloksetRivista(rivi, testIdt) {
    var K = global.TM_TESTIKATALOGI;
    var out = {};
    (testIdt || []).forEach(function (id) {
      var v = rivi ? rivi[id] : null;
      if (v == null || v === '' || isNaN(parseFloat(v))) return;
      out[K ? K.tmLibInputKey(id) : id] = parseFloat(v);
    });
    return out;
  }
  // Upsert doc-id: sama pvm → sama dokumentti → saman päivän uudelleensyöttö = korjaus (ei duplikaattia).
  function _docId(pvm) { return pvm + '_pikakirjaus'; }
  // testitulokset-dokin hyötykuorma (§22 Moodi B, upsert).
  function _testitulosPayload(tulokset, pvm, uid, serverTs, nowIso) {
    var p = { testit: tulokset, testauspvm: pvm, kausi: '', protokolla: 'pikakirjaus', lahde: 'pikakirjaus', tuotu: nowIso || pvm, tuojaUid: uid || null };
    if (serverTs) p.tallennettu = serverTs;
    return p;
  }
  // Lisää hh_historia/tki_historia upd:iin raakatuloksista (upsert pvm:llä tm_historia-libillä, jos ladattu).
  function _lisaaHistoria(upd, d, tulokset, pvm) {
    var HH = global.TM_PIKAKENTAT && global.TM_PIKAKENTAT._HH_MAP;
    if (HH && typeof global.tmHhSnapshot === 'function' && typeof global.tmHistoriaLisaa === 'function') {
      var hv = {}; Object.keys(HH).forEach(function (k) { var v = tulokset[k]; if (v != null && !isNaN(v)) hv[HH[k]] = v; });
      if (Object.keys(hv).length) upd.hh_historia = global.tmHistoriaLisaa(d.hh_historia || [], global.tmHhSnapshot(pvm, { hh_taso: upd.hh_taso, d1_taso: upd.d1_taso, d2_taso: upd.d2_taso, hv: hv }));
    }
    if (upd.tki_viimeisin != null && typeof global.tmTkiSnapshot === 'function' && typeof global.tmHistoriaLisaa === 'function') {
      upd.tki_historia = global.tmHistoriaLisaa(d.tki_historia || [], global.tmTkiSnapshot(pvm, { tki: upd.tki_viimeisin, tkLajit: upd.tk_lajit_viimeisin || {} }));
    }
    return upd;
  }

  // ── MODAALI ───────────────────────────────────────────────────────────────────────────────
  function avaa(ctx) {
    ctx = ctx || {};
    var toast = ctx.toast || function (m) { try { console.log('[pikakirjaus]', m); } catch (e) {} };
    if (!ctx.db || !ctx.seuraId) { toast('Pikakirjaus: puuttuva seura-konteksti', 'err'); return; }
    var K = global.TM_TESTIKATALOGI;
    if (!K) { toast('Pikakirjaus: testikatalogi ei latautunut', 'err'); return; }
    _injectStyles();

    var pelaajat = (ctx.pelaajat || []).slice();
    var joukkueet = {};
    pelaajat.forEach(function (p) { var j = p.joukkue || (ctx.joukkueNimet && p.joukkueet && p.joukkueet[0] && ctx.joukkueNimet[p.joukkueet[0]]) || ''; if (j) joukkueet[j] = true; });
    var joukkueLista = Object.keys(joukkueet).sort();

    var state = { joukkue: joukkueLista[0] || '', pelaajat: {}, testit: [], pvm: _today(), alusta: '', grid: {} };

    var ov = document.createElement('div'); ov.className = 'tmpk-ov';
    ov.addEventListener('click', function (e) { if (e.target === ov) _sulje(); });
    function _sulje() { if (ov.parentNode) ov.parentNode.removeChild(ov); }

    function _pelaajatJoukkueessa() {
      if (!state.joukkue) return pelaajat;
      return pelaajat.filter(function (p) {
        if (p.joukkue === state.joukkue) return true;
        if (Array.isArray(p.joukkueet) && ctx.joukkueNimet) return p.joukkueet.some(function (id) { return ctx.joukkueNimet[id] === state.joukkue; });
        return false;
      });
    }

    function _render() {
      var h = '';
      h += '<div class="tmpk-eyebrow">⚡ Pikakirjaus</div>';
      h += '<div class="tmpk-title">Kirjaa testituloksia</div>';
      h += '<div class="tmpk-sub">Yksi tai useampi pelaaja, sama testijoukko. Tulokset näkyvät mittaristossa heti — ei vaadi tapahtumaa.</div>';

      // Joukkue
      h += '<div class="tmpk-sect">Joukkue</div><div class="tmpk-row">';
      h += '<select data-role="joukkue">' + joukkueLista.map(function (j) { return '<option' + (j === state.joukkue ? ' selected' : '') + '>' + _esc(j) + '</option>'; }).join('') + (joukkueLista.length ? '' : '<option value="">(ei joukkueita)</option>') + '</select>';
      h += '</div>';

      // Pelaajat
      var pj = _pelaajatJoukkueessa();
      h += '<div class="tmpk-sect">Pelaajat (' + Object.keys(state.pelaajat).filter(function (k) { return state.pelaajat[k]; }).length + '/' + pj.length + ') <a href="#" data-role="kaikki" style="color:#28B090;font-size:11px;margin-left:8px">valitse kaikki</a></div>';
      h += '<div class="tmpk-tests">' + pj.map(function (p) {
        return '<label class="tmpk-chk"><input type="checkbox" data-role="pel" data-id="' + _esc(p.id) + '"' + (state.pelaajat[p.id] ? ' checked' : '') + '> ' + _esc(_nimi(p)) + '</label>';
      }).join('') + (pj.length ? '' : '<span class="tmpk-count">Ei pelaajia tässä joukkueessa</span>') + '</div>';

      // Testit
      h += '<div class="tmpk-sect">Testit <select data-role="esitaytto" style="margin-left:8px"><option value="">— esitäyttö —</option><option value="hh_laaja">HH laaja</option><option value="hh_suppea">HH suppea</option><option value="tekniikkakilpailu">Tekniikkakilpailu</option></select></div>';
      var kaikki = K.tmKaikkiKatalogiTestit(), viimKat = null, tr = '';
      kaikki.forEach(function (t) {
        if (t.kategoria !== viimKat) { viimKat = t.kategoria; tr += '<div style="width:100%;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:rgba(232,238,248,.4);margin:6px 0 0">' + _esc(t.kategoria) + '</div>'; }
        tr += '<label class="tmpk-chk"><input type="checkbox" data-role="testi" data-id="' + t.id + '"' + (state.testit.indexOf(t.id) >= 0 ? ' checked' : '') + '> ' + _esc(t.nimi) + '</label>';
      });
      h += '<div class="tmpk-tests">' + tr + '</div>';

      // Testipäivä + alusta
      h += '<div class="tmpk-sect">📅 Testipäivä <span class="tmpk-count">(oletus tänään — vaihda jos tulos on aiemmalta päivältä)</span></div>';
      h += '<div class="tmpk-row"><input type="date" data-role="pvm" value="' + _esc(state.pvm) + '" class="tmpk-day">';
      if (K.tmOnkoAlustaherkka(state.testit)) {
        h += '<label style="font-size:12px;color:rgba(232,238,248,.6)">Alusta (§22) <select data-role="alusta"><option value="">(täytä)</option>' +
          ['Tekonurmi', 'Luonnonnurmi', 'Hiekkatekonurmi', 'Halli / parketti', 'Muu'].map(function (a) { return '<option' + (a === state.alusta ? ' selected' : '') + '>' + a + '</option>'; }).join('') + '</select></label>';
      }
      h += '</div>';
      // Pikakenttälaskenta puuttuu kokonaan (lib lataamatta) → varoita (H-H + TKI hoituvat kun TM_PIKAKENTAT ladattu;
      // VP saa TKI:n tm_tki_core.js:stä, Master testit_indeksit.js:stä → tekniikkakilpailu laskee TKI:n molemmissa).
      if (!global.TM_PIKAKENTAT) {
        h += '<div class="tmpk-note">Huom: pikakenttälaskenta ei latautunut — tulokset ja historia tallentuvat, mutta pikakentät (hh/TKI) eivät päivity ennen recalcia.</div>';
      }

      // Ruudukko
      h += '<div id="tmpk-grid"></div>';

      // Footer
      h += '<div class="tmpk-foot"><button class="tmpk-btn pri" data-role="tallenna">💾 Tallenna</button>' +
        '<button class="tmpk-btn ghost" data-role="sulje">Peruuta</button>' +
        '<span class="tmpk-count" data-role="status"></span></div>';

      panel.innerHTML = h;
      _sidonnat();
      _renderGrid();
    }

    function _renderGrid() {
      var host = panel.querySelector('#tmpk-grid'); if (!host) return;
      var pids = Object.keys(state.pelaajat).filter(function (k) { return state.pelaajat[k]; });
      if (!pids.length || !state.testit.length) { host.innerHTML = '<div class="tmpk-count" style="margin-top:10px">Valitse pelaajat ja testit → syöttöruudukko ilmestyy.</div>'; return; }
      var testit = state.testit.map(function (id) { return K.tmKatalogiTesti(id); }).filter(Boolean);
      var pelById = {}; pelaajat.forEach(function (p) { pelById[p.id] = p; });
      var html = '<div class="tmpk-gridwrap"><table class="tmpk-grid"><thead><tr><th>Pelaaja</th>' +
        testit.map(function (t) { return '<th title="' + _esc(t.nimi) + '">' + _esc(t.nimi.replace(/\s*\(.*?\)/, '')) + '<br><span style="font-weight:400;opacity:.6">' + _esc(t.yksikko) + '</span></th>'; }).join('') + '</tr></thead><tbody>';
      pids.forEach(function (pid) {
        html += '<tr><td>' + _esc(_nimi(pelById[pid] || { id: pid })) + '</td>' +
          testit.map(function (t) {
            var v = (state.grid[pid] && state.grid[pid][t.id] != null) ? state.grid[pid][t.id] : '';
            return '<td><input type="number" step="any" inputmode="decimal" data-pid="' + _esc(pid) + '" data-tid="' + t.id + '" value="' + _esc(v) + '"></td>';
          }).join('') + '</tr>';
      });
      html += '</tbody></table></div>';
      host.innerHTML = html;
      host.querySelectorAll('input[type=number]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var pid = inp.getAttribute('data-pid'), tid = inp.getAttribute('data-tid');
          state.grid[pid] = state.grid[pid] || {}; state.grid[pid][tid] = inp.value;
        });
      });
    }

    function _sidonnat() {
      var q = function (sel) { return panel.querySelector(sel); };
      var js = q('[data-role=joukkue]'); if (js) js.addEventListener('change', function () { state.joukkue = js.value; state.pelaajat = {}; _render(); });
      var kaikki = q('[data-role=kaikki]'); if (kaikki) kaikki.addEventListener('click', function (e) { e.preventDefault(); var pj = _pelaajatJoukkueessa(); var kaikkiValittu = pj.every(function (p) { return state.pelaajat[p.id]; }); pj.forEach(function (p) { state.pelaajat[p.id] = !kaikkiValittu; }); _render(); });
      panel.querySelectorAll('[data-role=pel]').forEach(function (c) { c.addEventListener('change', function () { state.pelaajat[c.getAttribute('data-id')] = c.checked; _renderGrid(); _paivitaOtsikot(); }); });
      var es = q('[data-role=esitaytto]'); if (es) es.addEventListener('change', function () { if (es.value) { state.testit = K.tmProtoEsitaytto(es.value); _render(); } });
      panel.querySelectorAll('[data-role=testi]').forEach(function (c) {
        c.addEventListener('change', function () {
          var id = c.getAttribute('data-id'), i = state.testit.indexOf(id);
          if (c.checked && i < 0) state.testit.push(id); else if (!c.checked && i >= 0) state.testit.splice(i, 1);
          _render();   // alusta-näkyvyys + ruudukko riippuvat testivalinnasta
        });
      });
      var pvm = q('[data-role=pvm]'); if (pvm) pvm.addEventListener('change', function () { state.pvm = pvm.value; });
      var al = q('[data-role=alusta]'); if (al) al.addEventListener('change', function () { state.alusta = al.value; });
      var t = q('[data-role=tallenna]'); if (t) t.addEventListener('click', _tallenna);
      var s = q('[data-role=sulje]'); if (s) s.addEventListener('click', _sulje);
    }
    function _paivitaOtsikot() { var sec = panel.querySelectorAll('.tmpk-sect')[1]; /* pelaaja-laskuri päivittyy _render:issä; kevyt no-op */ if (sec) {} }

    async function _tallenna() {
      var pids = Object.keys(state.pelaajat).filter(function (k) { return state.pelaajat[k]; });
      if (!pids.length) { toast('Valitse vähintään yksi pelaaja', 'err'); return; }
      if (!state.testit.length) { toast('Valitse vähintään yksi testi', 'err'); return; }
      if (!state.pvm) { toast('Valitse testipäivä', 'err'); return; }
      var status = panel.querySelector('[data-role=status]');
      var tallennaBtn = panel.querySelector('[data-role=tallenna]'); if (tallennaBtn) tallennaBtn.disabled = true;
      var ok = 0, fail = 0, tyhja = 0;
      try { var cu = (typeof firebase !== 'undefined') && firebase.auth().currentUser; if (cu) await cu.getIdToken(true); } catch (e) {}
      var serverTs = (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) ? firebase.firestore.FieldValue.serverTimestamp() : null;
      var nowIso = new Date().toISOString();
      for (var i = 0; i < pids.length; i++) {
        var pid = pids[i];
        if (status) status.textContent = 'Tallennetaan ' + (i + 1) + '/' + pids.length + '…';
        try {
          var tulokset = _tuloksetRivista(state.grid[pid], state.testit);
          if (!Object.keys(tulokset).length) { tyhja++; continue; }
          var pelRef = ctx.db.collection('seurat').doc(ctx.seuraId).collection('pelaajat').doc(pid);
          var payload = _testitulosPayload(tulokset, state.pvm, ctx.uid, serverTs, nowIso);
          if (state.alusta) payload.alusta = state.alusta;
          await pelRef.collection('testitulokset').doc(_docId(state.pvm)).set(payload, { merge: true });   // upsert
          var snap = await pelRef.get();
          var d = (snap.exists && snap.data()) || {};
          var upd = (global.TM_PIKAKENTAT && global.TM_PIKAKENTAT.tmLaskePikakentat) ? global.TM_PIKAKENTAT.tmLaskePikakentat(d, tulokset, state.pvm) : {};
          _lisaaHistoria(upd, d, tulokset, state.pvm);
          if (Object.keys(upd).length) await pelRef.update(upd);
          ok++;
        } catch (e) { console.warn('[pikakirjaus]', pid, e && e.message); fail++; }
      }
      if (tallennaBtn) tallennaBtn.disabled = false;
      toast(ok + ' pelaajan tulokset tallennettu' + (tyhja ? ' · ' + tyhja + ' ilman arvoja' : '') + (fail ? ' · ' + fail + ' epäonnistui' : ''), fail ? 'err' : 'ok');
      if (ok > 0 && !fail) _sulje(); else if (status) status.textContent = '';
    }

    var panel = document.createElement('div'); panel.className = 'tmpk-panel';
    ov.appendChild(panel);
    document.body.appendChild(ov);
    _render();
  }

  var API = { avaa: avaa, _tuloksetRivista: _tuloksetRivista, _testitulosPayload: _testitulosPayload, _lisaaHistoria: _lisaaHistoria, _docId: _docId };
  if (global) global.TM_PIKAKIRJAUS = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
