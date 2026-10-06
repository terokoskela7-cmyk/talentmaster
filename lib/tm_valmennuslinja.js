/* ════════════════════════════════════════════════════════════════════════
   tm_valmennuslinja.js — seuran valmennuslinjan lukija henkilökunnan näkymiin (PURE; ei Firebasea/DOM-riippuvuutta; lataus injektoidaan HTML:stä).
   Lähde: seurat/{id}/valmennuslinja/teemat (VAIN hyväksytyt jaksot) + teemat_luonnos (luonnokset; staff-only lohko, Rules v3.40/v3.41). Päätelmä: lib/tm_jakso_malli.js tmJoukkueenTeema.
   · tmTeemaKerros(teematDoc, luonnosDoc)                → { hyvaksytty:{jaksot}, luonnos:{jaksot} }  (suodatus tilan mukaan myös lukijassa: hyväksytty-lohkoon vain tila 'hyvaksytty')
   · tmJoukkueenTeemaNaytto(joukkue, pvm, kerros, opts)  → { nyt, seuraava, luonnos:{nyt, seuraava}|null } | null  (opts.henkilokunta → luonnos mukaan; muuten ei KOSKAAN)
   · tmTeemaRiviHTML(tulos, opts)                        → yksi rivi "Joukkueen teema: X (seuraavaksi Y) · luonnos: Z"; opts.t kääntää tekstit; null/tyhjä → ''
   Null-turvallinen (D16): ilman linjaa / ilman osumaa palautetaan null ja näkymä toimii. EI pelaajan/huoltajan näkymiin. Dual-export: module.exports || window.TM_VALMENNUSLINJA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _malli(opts) { return (opts && opts.malli) || (root && root.TM_JAKSO_MALLI) || (typeof require === 'function' ? require('./tm_jakso_malli.js') : null); }
  function _jaksot(doc) { return doc && Array.isArray(doc.jaksot) ? doc.jaksot.filter(function (r) { return r && typeof r === 'object'; }) : []; }

  function tmTeemaKerros(teematDoc, luonnosDoc) {
    return {
      hyvaksytty: { jaksot: _jaksot(teematDoc).filter(function (r) { return r.tila === 'hyvaksytty'; }) },
      luonnos: { jaksot: _jaksot(luonnosDoc).filter(function (r) { return r.tila !== 'hyvaksytty'; }) }
    };
  }

  function tmJoukkueenTeemaNaytto(joukkue, pvm, kerros, opts) {
    var M = _malli(opts); if (!M || !kerros) return null;
    var virallinen = M.tmJoukkueenTeema(joukkue, pvm, { teemat: kerros.hyvaksytty });
    var luonnos = (opts && opts.henkilokunta) ? M.tmJoukkueenTeema(joukkue, pvm, { teemat: kerros.luonnos }) : null;
    if (!virallinen && !luonnos) return null;
    return { nyt: virallinen ? virallinen.nyt : null, seuraava: virallinen ? virallinen.seuraava : null, luonnos: luonnos || null };
  }

  function tmTeemaRiviHTML(tulos, opts) {
    if (!tulos) return '';
    var t = (opts && typeof opts.t === 'function') ? opts.t : function (k) { return k; };
    var osat = [];
    if (tulos.nyt) osat.push('<b style="color:var(--ink2);font-weight:600">' + _esc(tulos.nyt) + '</b>');
    if (tulos.seuraava) osat.push(_esc(t('seuraavaksi')) + ' ' + _esc(tulos.seuraava));
    var l = tulos.luonnos;
    if (l && (l.nyt || l.seuraava)) osat.push('<i data-teema-luonnos>' + _esc(t('luonnos')) + ': ' + _esc(l.nyt || l.seuraava) + '</i>');
    if (!osat.length) return '';
    return '<div class="tm-joukkueen-teema" style="margin:6px 0;font-size:12px;color:var(--ink3)">' + _esc(t('Joukkueen teema')) + ': ' + osat.join(' · ') + '</div>';
  }

  var API = { tmTeemaKerros: tmTeemaKerros, tmJoukkueenTeemaNaytto: tmJoukkueenTeemaNaytto, tmTeemaRiviHTML: tmTeemaRiviHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.TM_VALMENNUSLINJA = API;
})(typeof window !== 'undefined' ? window : this);
