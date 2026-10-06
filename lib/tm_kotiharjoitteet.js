/* ════════════════════════════════════════════════════════════════════════
   tm_kotiharjoitteet.js — pelaajan jakson KOTIHARJOITTEET (PURE; ei Firebasea). Lähde: pelaajadokin jaksofokus.tukiosa.harjoitteet[] — snapshot-kopio, jonka valmentaja liitti
   hyväksytystä seuran ohjelmasta/pankista (tm_jakso_malli.tmOhjelmaTukiosaan). Pelaaja EI lue ohjelmat/harjoitepankki-kokoelmia: kaikki mitä tarvitaan on snapshotissa.
   · tmKotiharjoitteet(jaksofokus)            → turvalliset rivit [{id, nimi, toistot, palautus, kesto_min, pelaajan_ohje, kotiin_huomio, video_url, kuva_url, lahde, lahde_nimi, jarjestys}] (tyhjä = ei näytetä)
   · tmKotiharjoitteetHTML(rivit, opts)       → kortti (liike · toistot · palautus · kesto · ohje · video/kuva-linkit · pieni lähdemerkintä); opts: { esc, t }
   Lähdemerkintä = SEURAN NIMI snapshotista (lahde_nimi, ei kovakoodattu); ilman nimeä "Seuran harjoite"; lahde 'tm' → "TalentMaster". Linkit vain http(s) (target=_blank rel=noopener).
   Puolustava suodatus: ei näytetä riviä jonka kaytto on 'joukkue' tai tila ≠ 'hyvaksytty' (vaikka sellainen eksyisi snapshotiin). §7.22: ei tasoja/vertailuja. Dual-export: module.exports || window.TM_KOTIHARJOITTEET.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var URL_RE = /^https?:\/\//i;
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _s(v) { return typeof v === 'string' && v.trim() ? v.trim() : null; }

  function tmKotiharjoitteet(jf) {
    var h = jf && jf.tukiosa && Array.isArray(jf.tukiosa.harjoitteet) ? jf.tukiosa.harjoitteet : [];
    var rivit = [];
    h.forEach(function (e, i) {
      if (!e || typeof e !== 'object' || e.kaytto === 'joukkue' || (e.tila != null && e.tila !== 'hyvaksytty')) return;
      var nimi = _s(e.liike) || _s(e.nimi); if (!nimi) return;
      rivit.push({ id: e.id != null ? String(e.id) : String(i), nimi: nimi, toistot: _s(e.toistot), palautus: _s(e.palautus), kesto_min: typeof e.kesto_min === 'number' && isFinite(e.kesto_min) ? e.kesto_min : null,
        pelaajan_ohje: _s(e.pelaajan_ohje), kotiin_huomio: _s(e.kotiin_huomio), video_url: URL_RE.test(e.video_url || '') ? e.video_url : null, kuva_url: URL_RE.test(e.kuva_url || '') ? e.kuva_url : null,
        lahde: e.lahde === 'tm' ? 'tm' : 'seura', lahde_nimi: _s(e.lahde_nimi), jarjestys: typeof e.jarjestys === 'number' ? e.jarjestys : i + 1 });
    });
    return rivit.sort(function (a, b) { return a.jarjestys - b.jarjestys; });
  }

  function tmKotiharjoitteetHTML(rivit, opts) {
    if (!rivit || !rivit.length) return '';
    var esc = (opts && opts.esc) || _esc, t = _t(opts);
    return '<div class="tm-kotiharjoitteet">' + rivit.map(function (r) {
      var meta = [r.toistot, r.palautus ? (t('palautus') + ' ' + r.palautus) : null, r.kesto_min != null ? (r.kesto_min + ' min') : null].filter(Boolean).map(esc).join(' · ');
      var linkit = [r.video_url ? '<a href="' + esc(r.video_url) + '" target="_blank" rel="noopener">' + esc(t('Video')) + '</a>' : '', r.kuva_url ? '<a href="' + esc(r.kuva_url) + '" target="_blank" rel="noopener">' + esc(t('Kuva')) + '</a>' : ''].filter(Boolean).join(' · ');
      var lahde = r.lahde === 'tm' ? 'TalentMaster' : (r.lahde_nimi || t('Seuran harjoite'));
      return '<div class="tm-kh-rivi" style="padding:10px 0;border-top:.5px solid var(--line)">'
        + '<div style="font-size:14px;font-weight:600;color:var(--ink)">' + esc(r.nimi) + (r.kotiin_huomio ? ' <span class="tm-kh-huomio" style="font-weight:400;font-size:12px;color:var(--ink3)">(' + esc(r.kotiin_huomio) + ')</span>' : '') + '</div>'
        + (meta ? '<div style="font-size:12px;color:var(--ink3);margin-top:2px">' + meta + '</div>' : '')
        + (r.pelaajan_ohje ? '<div style="font-size:13px;color:var(--ink2);margin-top:5px;line-height:1.5">' + esc(r.pelaajan_ohje) + '</div>' : '')
        + (linkit ? '<div style="font-size:12px;margin-top:5px">' + linkit + '</div>' : '')
        + '<div class="tm-kh-lahde" style="font-size:10px;color:var(--ink3);margin-top:5px;letter-spacing:.04em">' + esc(lahde) + '</div></div>';
    }).join('') + '</div>';
  }

  var API = { tmKotiharjoitteet: tmKotiharjoitteet, tmKotiharjoitteetHTML: tmKotiharjoitteetHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KOTIHARJOITTEET = API;
})(typeof window !== 'undefined' ? window : this);
