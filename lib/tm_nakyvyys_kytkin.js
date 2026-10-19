/* ════════════════════════════════════════════════════════════════════════
   tm_nakyvyys_kytkin.js — YHTENÄINEN kytkin "Näytä myös pelaajalle" (Teron päätös 19.10.2026, palaute-näkyvyys 0b). PURE (ei DOMia, ei Firebasea).
   Jokaisessa paikassa, jossa valmentaja kirjoittaa palautetta pelaajasta, on sama kytkin, sama teksti ja OLETUS POIS (= sisäinen, vain henkilökunta).
   · tmNakyvyysPaalla(arvo) → boolean (vain tosi === true tai 'pelaaja' = päällä; kaikki muu = pois)
   · tmNakyvyysKytkinHTML(paalla, opts{ esc, t, toggleFn, id, kompakti }) → kytkin + ohjeteksti (sama komponentti kaikkialla); toggleFn = globaalin funktion nimi, kutsutaan arvolla (true|false)
   · tmLauseSuunnitelma(teksti, nayta, ctx{ lahde, uid, nytISO }) → { historia: {lause, lause_lahde}|undefined, reviewit: {lause_sisainen:{teksti,lahde,uid,tallennettu}}|undefined }
       nayta = true  → lause historiariville (pelaajadokumentti, pelaaja lukee) — nykyinen käytös
       nayta = false → lause VAIN reviewit/{pvm}.lause_sisainen (alikokoelma jota pelaaja ja huoltaja eivät lue, Rules: onOmaSeura) — EI pelaajan luettavaan paikkaan
   Tekstit opts.t:n läpi (fi-oletus tässä; sv = lib/tm_lib_i18n.js, Gemini).
   Dual-export: module.exports || window.TM_NAKYVYYS_KYTKIN.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    nk_otsikko: 'Näytä myös pelaajalle',
    nk_ohje_pois: 'Pois: vain henkilökunta näkee tämän.',
    nk_ohje_paalla: 'Päällä: pelaaja ja huoltaja näkevät tämän.'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function tmNakyvyysPaalla(arvo) { return arvo === true || arvo === 'pelaaja'; }
  function tmNakyvyysKytkinHTML(paalla, opts) {
    opts = opts || {}; var on = tmNakyvyysPaalla(paalla), esc = opts.esc || _esc, id = opts.id || 'nkKytkin';
    var fn = opts.toggleFn ? esc(opts.toggleFn) + '(' + (on ? 'false' : 'true') + ')' : '';
    var ohje = _txt(opts, on ? 'nk_ohje_paalla' : 'nk_ohje_pois');
    /* opts.kompakti = vain rivi (selite title-vihjeenä) — ahtaisiin näkymiin (Pikakortti: yksi näyttö, ei vieritystä); sama komponentti ja sama teksti */
    return '<div data-nk-kytkin style="margin:' + (opts.kompakti ? '0' : '10px 0 4px') + '"><label title="' + esc(ohje) + '" style="display:flex;align-items:center;gap:9px;cursor:pointer;font-size:' + ('13px') + ';font-weight:600">'
      + '<input type="checkbox" id="' + esc(id) + '" data-nk-checkbox ' + (on ? 'checked ' : '') + 'onchange="' + fn + '" style="width:18px;height:18px;accent-color:var(--teal,#28B090);flex-shrink:0">'
      + '<span>' + esc(_txt(opts, 'nk_otsikko')) + '</span></label>'
      + (opts.kompakti ? '' : '<div data-nk-ohje style="font-size:10.5px;color:var(--ink3);margin:3px 0 0 27px">' + esc(ohje) + '</div>') + '</div>';
  }
  function tmLauseSuunnitelma(teksti, nayta, ctx) {
    ctx = ctx || {}; var t = typeof teksti === 'string' ? teksti.trim() : '';
    if (!t) return { historia: undefined, reviewit: undefined };
    var lahde = ctx.lahde === 'vp' ? 'vp' : 'valmentaja';
    if (tmNakyvyysPaalla(nayta)) return { historia: { lause: t, lause_lahde: lahde }, reviewit: undefined };
    return { historia: undefined, reviewit: { lause_sisainen: { teksti: t, lahde: lahde, uid: ctx.uid || null, tallennettu: ctx.nytISO || new Date().toISOString() } } };
  }
  var API = { FI: FI, tmNakyvyysPaalla: tmNakyvyysPaalla, tmNakyvyysKytkinHTML: tmNakyvyysKytkinHTML, tmLauseSuunnitelma: tmLauseSuunnitelma };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_NAKYVYYS_KYTKIN = API;
})(typeof window !== 'undefined' ? window : this);
