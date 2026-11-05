/* ════════════════════════════════════════════════════════════════════════
   tm_liput_admin.js — Admin "Liput" -näkymä (D1 / QG-3 vaihe 0, Tero 5.11.2026). VAIN SA.
   · Taulukko: seura × rekisterin lippu (tm_liput.LIPUT) → tehokas arvo + lähde (julkiset / vanha kenttä / oletus).
   · Kytkin: vahvistus → callable asetaSeuranLippu (vain SA; kirjoittaa liput/julkiset + audit-rivin samassa transaktiossa).
     Pelkkä päälle/pois (päätös 3) — ei avaimen poistoa; pois = false liput/julkiset-dokumentissa.
   · Muutosloki: haeAuditLoki({ toiminto: ['lippu_muutettu'] }) — aika, seura, lippu, vanha → uusi, tekijä.
   Kaikki logiikka täällä (kuoren kasvukatto); Admin kytkee vain env:n. Merkkijonot +-liitoksella (§7.1).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _L() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_liput.js'); } catch (e) { /* ei */ } return root && root.TM_LIPUT; }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  var KORTTI = 'background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:12px';
  var LAHDE = { julkiset: '', vanha: 'vanha kenttä', oletus: 'oletus' };

  /* Puhdas: seurat [{id, nimi, liput?}] + julkiset { sid: data|null } → rivit [{ id, nimi, liput: [{ avain, arvo, lahde }] }] */
  function tmLiputRivit(seurat, julkiset) {
    var L = _L(); julkiset = julkiset || {};
    return (seurat || []).map(function (s) {
      return { id: s.id, nimi: s.nimi || s.id, liput: L.LIPUT.map(function (l) { var t = L.tmLippuTila(l.avain, julkiset[s.id], s); return { avain: l.avain, arvo: t.arvo, lahde: t.lahde }; }) };
    });
  }

  function tmLiputTaulukkoHTML(rivit) {
    var L = _L();
    var h = '<div style="' + KORTTI + ';overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr><th style="text-align:left;padding:6px 8px">Seura</th>';
    L.LIPUT.forEach(function (l) { h += '<th style="text-align:left;padding:6px 8px" title="' + _esc(l.kuvaus) + '"><code>' + _esc(l.avain) + '</code></th>'; });
    h += '</tr></thead><tbody>';
    (rivit || []).forEach(function (r) {
      h += '<tr style="border-top:1px solid var(--border)"><td style="padding:6px 8px">' + _esc(r.nimi) + ' <span style="color:var(--ink3);font-size:11px">' + _esc(r.id) + '</span></td>';
      r.liput.forEach(function (l) {
        var lah = LAHDE[l.lahde] ? ' <span style="color:var(--ink3);font-size:11px">(' + LAHDE[l.lahde] + ')</span>' : '';
        h += '<td style="padding:6px 8px"><button type="button" data-seura="' + _esc(r.id) + '" data-lippu="' + _esc(l.avain) + '" data-arvo="' + (l.arvo ? '1' : '0') + '" onclick="liputVaihda(this.dataset.seura, this.dataset.lippu, this.dataset.arvo !== \'1\')"'
          + ' style="font-size:12px;padding:4px 10px;border-radius:6px;cursor:pointer;border:.5px solid var(--ink3);background:' + (l.arvo ? 'var(--teal)' : 'none') + ';color:' + (l.arvo ? 'var(--on-accent,#111110)' : 'var(--ink2)') + '">' + (l.arvo ? 'päällä' : 'pois') + '</button>' + lah + '</td>';
      });
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  function tmLiputLokiHTML(rivit, seuraNimi) {
    if (!rivit || !rivit.length) return '<div style="color:var(--ink3);font-size:13px">Ei vielä lippumuutoksia.</div>';
    var h = '<table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr><th style="text-align:left;padding:4px 8px">Aika</th><th style="text-align:left;padding:4px 8px">Seura</th><th style="text-align:left;padding:4px 8px">Lippu</th><th style="text-align:left;padding:4px 8px">Muutos</th><th style="text-align:left;padding:4px 8px">Tekijä</th></tr></thead><tbody>';
    rivit.forEach(function (r) {
      var aika = r.aikaleima ? new Date(r.aikaleima).toLocaleString('fi-FI') : '—', p = function (v) { return v ? 'päällä' : 'pois'; };
      h += '<tr style="border-top:1px solid var(--border)"><td style="padding:4px 8px">' + _esc(aika) + '</td><td style="padding:4px 8px">' + _esc((seuraNimi && seuraNimi(r.seuraId)) || r.seuraId || '—') + '</td><td style="padding:4px 8px"><code>' + _esc(r.lippu || '—') + '</code></td>'
        + '<td style="padding:4px 8px">' + p(r.vanha) + ' → ' + p(r.uusi) + (r.lahde_vanha === 'vanha' ? ' <span style="color:var(--ink3)">(oli vanhassa kentässä)</span>' : '') + '</td><td style="padding:4px 8px;color:var(--ink3)">' + _esc(r.tekija_uid || '—') + '</td></tr>';
    });
    return h + '</tbody></table>';
  }

  /* env: { db, kutsu(nimi) → callable, alue() → elementti, seurat() → [{id, nimi, liput}], vahvista(teksti) → bool, ilmoita(teksti, tyyppi) } */
  function tmLiputAdmin(env) {
    function lataaJulkiset(seurat) {
      return Promise.all(seurat.map(function (s) {
        return env.db.collection('seurat').doc(s.id).collection('liput').doc('julkiset').get().then(function (d) { return [s.id, d.exists ? d.data() : null]; });
      })).then(function (pa) { var o = {}; pa.forEach(function (x) { o[x[0]] = x[1]; }); return o; });
    }
    function seuraNimi(sid) { var s = (env.seurat() || []).filter(function (x) { return x.id === sid; })[0]; return s ? (s.nimi || s.id) : sid; }
    function render() {
      var alue = env.alue(); if (!alue) return Promise.resolve();
      alue.innerHTML = '<h2 style="margin:0 0 6px">Liput</h2><div style="color:var(--ink3);font-size:13px;margin-bottom:12px">Seurakohtaiset käyttöönottoliput. Muutos kirjautuu lokiin (Audit-loki: "Seuran lippu muutettu"). Vain super-admin.</div>'
        + '<div id="liputTaulukko" style="color:var(--ink3)">Ladataan…</div><h3 style="margin:18px 0 6px">Muutosloki</h3><div id="liputLoki" style="color:var(--ink3)">Ladataan…</div>';
      var seurat = env.seurat() || [];
      var t = lataaJulkiset(seurat).then(function (jul) { var el = env.alue().querySelector('#liputTaulukko'); if (el) el.innerHTML = tmLiputTaulukkoHTML(tmLiputRivit(seurat, jul)); })
        .catch(function (e) { var el = env.alue().querySelector('#liputTaulukko'); if (el) el.innerHTML = '<div style="color:var(--red)">Lippujen lataus epäonnistui: ' + _esc(e && e.message) + '</div>'; });
      var l = env.kutsu('haeAuditLoki')({ toiminto: ['lippu_muutettu'], limit: 100 }).then(function (r) { var el = env.alue().querySelector('#liputLoki'); if (el) el.innerHTML = tmLiputLokiHTML((r && r.data && r.data.rivit) || [], seuraNimi); })
        .catch(function (e) { var el = env.alue().querySelector('#liputLoki'); if (el) el.innerHTML = '<div style="color:var(--red)">Lokin lataus epäonnistui: ' + _esc(e && e.message) + '</div>'; });
      return Promise.all([t, l]);
    }
    function vaihda(seuraId, lippu, arvo) {
      if (!env.vahvista(seuraNimi(seuraId) + ': ' + lippu + ' → ' + (arvo ? 'päälle' : 'pois') + '?')) return Promise.resolve(false);
      return env.kutsu('asetaSeuranLippu')({ seuraId: seuraId, lippu: lippu, arvo: arvo }).then(function (r) {
        var d = (r && r.data) || {}; env.ilmoita(d.muuttui ? (lippu + ' ' + (arvo ? 'päällä' : 'pois') + ' — kirjattu lokiin') : 'Ei muutosta (arvo oli jo ' + (arvo ? 'päällä' : 'pois') + ')', 'ok');
        return render().then(function () { return true; });
      }).catch(function (e) { env.ilmoita('Lipun tallennus epäonnistui: ' + (e && e.message), 'virhe'); return false; });   // virhe näkyy, ei niellä
    }
    return { render: render, vaihda: vaihda };
  }

  var API = { tmLiputRivit: tmLiputRivit, tmLiputTaulukkoHTML: tmLiputTaulukkoHTML, tmLiputLokiHTML: tmLiputLokiHTML, tmLiputAdmin: tmLiputAdmin };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_LIPUT_ADMIN = API;
})(typeof window !== 'undefined' ? window : this);
