/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_omat.js — K35-6d · Masterin luonnin "joukkueen omat": vapaa (D240), erikoisohjelma (D241), joukkueen valmennuspalaveri (D242). PURE (HTML-merkkijonot + dokumentti), toimii selaimessa JA Nodessa.
   Riippuvuudet: tm_kalenteri_tyypit.js (tyyppien ominaisuudet: kokoPaiva, joukkuePakollinen; ERIKOISOHJELMA_LAJIT), tm_ryhmat.js (HK-tyypit).
   · tmKalOmatTyyppi(tyyppi) → { kokoPaiva, laji, joukkuePakollinen } — luonti näyttää Loppupäivä-kentän (+ Laji erikoisohjelmalle) ja piilottaa kellonajat / toistuvuuden
   · tmKalOmatHTML({ t, pvm, inpCss }) → lomakeosio (Loppupäivä + Laji); tmKalOmatNayta(tyyppi, { wrap, piilota:[elementit] }) → näyttää/piilottaa
   · tmKalOmatKenelle(tyyppi, { joukkue:bool }) → { sallitut } — koko päivän omat lukittu joukkueeseen; palaveri-tyypeille + 'joukkue_hk' ("Joukkueen valmennus (X)", D242)
   · tmKalOmatDoc({ tyyppi, pvm, loppu, laji, nimi, joukkueId, joukkueNimi }) → { ok, doc, alkaa:'YYYY-MM-DDT00:00', paattyy:'YYYY-MM-DDT23:59' } | { ok:false, syy:'joukkue'|'loppu'|'laji' }
       doc: koko_paiva true, joukkue = joukkue-ID (Rules v3.58: pakollinen, valmentaja vain oma), joukkue_nimi, joukkueet[id], kohde {tyyppi:'joukkue'}, laji (erikoisohjelma). Päivä-aikaleimat Timestamp-muunnos kutsujalla.
   Dual-export: module.exports || window.TM_KALENTERI_OMAT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _R() { return _lib('./tm_ryhmat.js', 'TM_RYHMAT'); }
  var LAJI_NIMET = { leiri: 'Leiri', turnaus: 'Turnaus', kotiviikko: 'Kotiviikko', kevennys: 'Kevennys', muu: 'Muu' };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tmKalOmatTyyppi(tyyppi) { var T = _TY(), ty = T.tmKalTyyppi ? T.tmKalTyyppi(tyyppi) : {}; return { kokoPaiva: !!ty.kokoPaiva && !!ty.joukkuePakollinen, laji: ty.avain === 'erikoisohjelma', joukkuePakollinen: !!ty.joukkuePakollinen }; }
  function tmKalOmatHTML(o) {
    o = o || {}; var t = typeof o.t === 'function' ? o.t : function (x) { return x; }, css = o.inpCss || '', lab = 'font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:.06em;color:var(--ink3);display:block;margin-bottom:4px', T = _TY();
    var lajit = (T.ERIKOISOHJELMA_LAJIT || Object.keys(LAJI_NIMET)).map(function (l) { return '<option value="' + _esc(l) + '">' + _esc(t(LAJI_NIMET[l] || l)) + '</option>'; }).join('');
    return '<div data-ko-loppu><label style="' + lab + '">' + _esc(t('Loppupäivä')) + '</label><input type="date" id="tapahtumaLoppu" value="' + _esc(o.pvm || '') + '" style="' + css + '"></div>'
      + '<div data-ko-laji style="display:none"><label style="' + lab + '">' + _esc(t('Laji')) + '</label><select id="tapahtumaLaji" style="' + css + '">' + lajit + '</select></div>';
  }
  function tmKalOmatNayta(tyyppi, r) {
    var x = tmKalOmatTyyppi(tyyppi); if (!r || !r.wrap) return x;
    r.wrap.style.display = x.kokoPaiva ? 'flex' : 'none'; var l = r.wrap.querySelector('[data-ko-laji]'); if (l) l.style.display = x.laji ? 'block' : 'none';
    (r.piilota || []).forEach(function (el) { if (el) el.style.display = x.kokoPaiva ? 'none' : (el._kvAlkuperainen != null ? el._kvAlkuperainen : ''); });
    return x;
  }
  function tmKalOmatKenelle(tyyppi, o) {
    var x = tmKalOmatTyyppi(tyyppi), R = _R(), hk = R.tmOletusNakyvyys && R.tmOletusNakyvyys(tyyppi) === 'henkilokunta';
    if (x.joukkuePakollinen) return { sallitut: ['joukkue'] };
    return { sallitut: ['joukkue'].concat(hk && o && o.joukkue ? ['joukkue_hk'] : [], ['ryhma', 'pelaajat', 'henkilokunta']) };
  }
  function _pv(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : null; }
  function tmKalOmatDoc(v) {
    v = v || {}; var x = tmKalOmatTyyppi(v.tyyppi); if (!x.kokoPaiva) return { ok: false, syy: 'tyyppi' };
    var a = _pv(v.pvm), b = _pv(v.loppu) || a; if (!v.joukkueId) return { ok: false, syy: 'joukkue' }; if (!a || !b || b < a) return { ok: false, syy: 'loppu' };
    if (x.laji && Object.keys(LAJI_NIMET).indexOf(v.laji) < 0) return { ok: false, syy: 'laji' };
    var doc = { tyyppi: _TY().tmKalTyyppiAvain(v.tyyppi), nimi: v.nimi || (x.laji ? LAJI_NIMET[v.laji] : _TY().tmKalTyyppi(v.tyyppi).nimi), koko_paiva: true, joukkue: v.joukkueId, joukkue_nimi: v.joukkueNimi || v.joukkueId, joukkueet: [v.joukkueId], pelaajat_id: [], kohde: { tyyppi: 'joukkue' }, nakyvyys: 'kaikki' };
    if (x.laji) doc.laji = v.laji;
    return { ok: true, doc: doc, alkaa: a + 'T00:00', paattyy: b + 'T23:59' };
  }
  var API = { tmKalOmatTyyppi: tmKalOmatTyyppi, tmKalOmatHTML: tmKalOmatHTML, tmKalOmatNayta: tmKalOmatNayta, tmKalOmatKenelle: tmKalOmatKenelle, tmKalOmatDoc: tmKalOmatDoc, LAJI_NIMET: LAJI_NIMET };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_OMAT = API;
})(typeof window !== 'undefined' ? window : null);
