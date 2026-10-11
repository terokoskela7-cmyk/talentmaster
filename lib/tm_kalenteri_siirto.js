/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_siirto.js — K35-6b · tapahtuman siirto toiselle päivälle (Outlook-tyyli: kortin vetäminen työpöydällä, kortin "Siirrä…" mobiilissa). PURE; Master vain kytkee.
   Pudotus / "Siirrä…" avaa pienen vahvistuksen: uusi päivä + aika (esitäytetty; ALKUPERÄINEN kellonaika säilyy, kesto säilyy) → Vahvista kirjoittaa. Sarjatapahtumalle kysytään laajuus (vain tämä / tämä ja seuraavat / koko sarja).
   · tmSiirtoVoi(kortti) → boolean — ei ehdotusta, ei koko päivän tapahtumaa, ei tuodun lähteen lukitsemaa aikaa (tmKalSaaMuokata 'alkaa'), aika tiedossa
   · tmSiirtoSuunnitelma(ev, { pvm, alkaa }) → { ok, pvm, alkaa, paattyy, paivaEro, muuttui } | { ok:false, syy:'pvm'|'aika'|'lukittu' } — kesto säilyy (yli keskiyön → 23:59)
   · tmSiirtoDoc({ pvm }, suunnitelma) → { alkaa:'YYYY-MM-DDTHH:MM', paattyy } — sarjan jokaiselle dokille sama päiväsiirto (tmKalSiirraPaiva)
   · tmSiirtoLomakeHTML({ t, pvm, alkaa, paattyy, nimi }) → modaalin sisältö (.cal-modal-yla/-runko/-ala); id:t siirtoPvm · siirtoAlkaa · siirtoPaattyy · siirtoTallenna · siirtoPeru
   Dual-export: module.exports || window.TM_KALENTERI_SIIRTO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _MA() { return _lib('./tm_kalenteri_malli.js', 'TM_KALENTERI_MALLI'); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _min(h) { var m = /^(\d{1,2}):(\d{2})/.exec(String(h || '')); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function _hhmm(n) { var z = function (x) { return (x < 10 ? '0' : '') + x; }; return z(Math.floor(n / 60)) + ':' + z(n % 60); }
  function tmSiirtoVoi(k) { if (!k || k.ehdotus || k.lukittu || k.koko_paiva) return false; return _min(k.alkaa) != null; }
  function tmSiirtoSuunnitelma(ev, s) {
    var MA = _MA(); s = s || {}; ev = ev || {};
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s.pvm || ''))) return { ok: false, syy: 'pvm' };
    var a = _min(s.alkaa), a0 = _min(ev.alkaa); if (a == null || a0 == null) return { ok: false, syy: 'aika' };
    if (MA.tmKalSaaMuokata && !MA.tmKalSaaMuokata('alkaa', ev)) return { ok: false, syy: 'lukittu' };
    var b0 = _min(ev.paattyy), kesto = b0 != null && b0 > a0 ? b0 - a0 : null, paattyy = kesto == null ? null : _hhmm(Math.min(a + kesto, 23 * 60 + 59));
    var ero = MA.tmKalPaivaEro ? MA.tmKalPaivaEro(s.pvm, ev.pvm) : 0, alkaa = _hhmm(a);
    return { ok: true, pvm: s.pvm, alkaa: alkaa, paattyy: paattyy, paivaEro: ero, muuttui: ero !== 0 || alkaa !== _hhmm(a0) };
  }
  function tmSiirtoDoc(d, s) {
    var MA = _MA(), p = MA.tmKalSiirraPaiva ? MA.tmKalSiirraPaiva(d.pvm, s.paivaEro) : d.pvm;
    return { alkaa: p + 'T' + s.alkaa, paattyy: s.paattyy ? p + 'T' + s.paattyy : null };
  }
  function tmSiirtoLomakeHTML(o) {
    o = o || {}; var t = typeof o.t === 'function' ? o.t : function (x) { return x; }, css = 'width:100%;padding:9px 12px;border:0.5px solid var(--border);border-radius:6px;background:var(--surface);color:var(--ink);font-size:14px;box-sizing:border-box', lab = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);display:block;margin-bottom:4px';
    return '<div class="cal-modal-yla"><div><div style="font-size:16px;font-weight:500">' + _esc(t('Siirrä tapahtuma')) + '</div>' + (o.nimi ? '<div style="font-size:12px;color:var(--ink3)">' + _esc(o.nimi) + '</div>' : '') + '</div></div>'
      + '<div class="cal-modal-runko"><div><label style="' + lab + '">' + _esc(t('Päivä')) + '</label><input type="date" id="siirtoPvm" value="' + _esc(o.pvm || '') + '" style="' + css + '"></div>'
      + '<div><label style="' + lab + '">' + _esc(t('Alkaa')) + '</label><input type="time" id="siirtoAlkaa" value="' + _esc(o.alkaa || '') + '" style="' + css + '"></div>'
      + '<div style="font-size:12px;color:var(--ink2)">' + _esc(t('Päättyy')) + ': <span id="siirtoPaattyy">' + _esc(o.paattyy || '–') + '</span> · ' + _esc(t('Kesto säilyy.')) + '</div></div>'
      + '<div class="cal-modal-ala"><button type="button" id="siirtoPeru" style="padding:10px;background:var(--surface);border:0.5px solid var(--border);border-radius:6px;color:var(--ink2);cursor:pointer">' + _esc(t('Peruuta')) + '</button>'
      + '<button type="button" id="siirtoTallenna" style="padding:10px;background:var(--teal);color:var(--bg);border:none;border-radius:6px;cursor:pointer;font-weight:500">' + _esc(t('Siirrä')) + '</button></div>';
  }
  var API = { tmSiirtoVoi: tmSiirtoVoi, tmSiirtoSuunnitelma: tmSiirtoSuunnitelma, tmSiirtoDoc: tmSiirtoDoc, tmSiirtoLomakeHTML: tmSiirtoLomakeHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_SIIRTO = API;
})(typeof window !== 'undefined' ? window : null);
