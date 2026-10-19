/* ════════════════════════════════════════════════════════════════════════
   tm_historia_lause.js — suljetun jakson LAUSE ja SULKUPÄIVÄ henkilökunnan Historiassa (Polku · Historia, Master ja VP jaksohistoria). PURE (ei DOMia; lataus saa db:n parametrina).
   Lause on joko (a) pelaajalle näkyvä: jaksofokus_historia[].lause (+ lause_lahde) — tai (b) SISÄINEN: reviewit/{pvm}.lause_sisainen { teksti, lahde, uid, tallennettu } (kytkin "Näytä myös pelaajalle" pois, 0b).
   reviewit lukee vain oman seuran henkilökunta (Rules: onOmaSeura) → tätä EI ladata pelaaja- eikä perhe-appiin.
   · tmHlSulkupvm(h)        → 'YYYY-MM-DD' (paikallinen päivä) historiarivin `suljettu`-aikaleimasta | null — sama päivä kuin reviewit-dokumentin id (tmPaivaIso kirjoitushetkellä)
   · tmHlLause(h, reviewit) → { teksti, lahde:'vp'|'valmentaja', sisainen:boolean } | null — näkyvä lause ensin; muuten sisäinen reviewit[sulkupvm].lause_sisainen
   · tmHlLoppupvm(h)        → ISO/pvm jonka historia näyttää aikavälin loppuna: TODELLINEN sulkemispäivä (suljettu) kun se on olemassa, muuten suunniteltu päättymispäivä (paattyi)
   · tmHlAika(h)            → 'd.m.–d.m.' (alkoi–tmHlLoppupvm)
   · tmHlKorttiLisa(e, reviewit, o) · tmHlSlot(p, sisusFn, o) — korttilisä ja laiska lataus + slotin päivitys (Master/VP)
   · tmHlLataa(db, sid, pid) → Promise<{ [pvm]: reviewit-dokumentin data }> (vain henkilökunnan clientit)
   · tmHlSisainenMerkki(opts) → pieni merkki "sisäinen" (opts: { esc, t })
   Dual-export: module.exports || window.TM_HISTORIA_LAUSE.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = { hl_sisainen: 'sisäinen' };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _ms(t) { return t == null ? NaN : (t.toDate ? t.toDate().getTime() : (t instanceof Date ? t.getTime() : (typeof t === 'number' ? t : new Date(t).getTime()))); }
  function tmHlSulkupvm(h) {
    var ms = h ? _ms(h.suljettu) : NaN; if (!isFinite(ms)) return null;
    var d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function tmHlLause(h, reviewit) {
    if (!h) return null;
    var nak = typeof h.lause === 'string' ? h.lause.trim() : '';
    if (nak) return { teksti: nak, lahde: h.lause_lahde === 'vp' ? 'vp' : 'valmentaja', sisainen: false };
    var pvm = tmHlSulkupvm(h), r = pvm && reviewit && reviewit[pvm], s = r && r.lause_sisainen;
    var t = s && typeof s.teksti === 'string' ? s.teksti.trim() : '';
    return t ? { teksti: t, lahde: s.lahde === 'vp' ? 'vp' : 'valmentaja', sisainen: true } : null;
  }
  function tmHlLoppupvm(h) { return h ? (isFinite(_ms(h.suljettu)) ? h.suljettu : h.paattyi) : null; }
  function _dm(x) {
    if (x == null || x === '') return ''; var s = String(x), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return (+m[3]) + '.' + (+m[2]) + '.'; var ms = _ms(x); if (!isFinite(ms)) return ''; var d = new Date(ms); return d.getDate() + '.' + (d.getMonth() + 1) + '.';
  }
  function tmHlAika(h) { return [h && h.alkoi ? _dm(h.alkoi) : '', _dm(tmHlLoppupvm(h))].filter(Boolean).join('–'); }
  function tmHlLataa(db, sid, pid) {
    return db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection('reviewit').get().then(function (snap) {
      var out = {}; (snap && snap.docs || []).forEach(function (d) { out[d.id] = d.data(); }); return out;
    });
  }
  function tmHlSisainenMerkki(opts) {
    var esc = (opts && opts.esc) || _esc;
    return '<span data-hl-sisainen style="font-size:10px;letter-spacing:.06em;text-transform:uppercase;border:.5px solid var(--border);border-radius:4px;padding:1px 5px;color:var(--ink3);margin-left:4px;white-space:nowrap">' + esc(_txt(opts, 'hl_sisainen')) + '</span>';
  }
  /* Korttilisä (Master/VP jaksohistoria): aikaväli + lause (+ "sisäinen"-merkki). reviewit = tmHlLataa-kartta tai undefined (ei ladattu → vain näkyvä lause). */
  function tmHlKorttiLisa(e, reviewit, o) {
    o = o || {}; var esc = o.esc || _esc, ls = tmHlLause(e, reviewit), aika = tmHlAika(e);
    return (aika ? '<div data-hl-aika style="font-size:10px;color:var(--ink3);margin-top:2px">' + esc(aika) + '</div>' : '')
      + (ls ? '<div data-hl-lause style="font-size:11.5px;color:var(--ink2);margin-top:5px;white-space:normal;overflow-wrap:anywhere">”' + esc(ls.teksti) + '”' + (ls.sisainen ? tmHlSisainenMerkki(o) : '') + '</div>' : '');
  }
  /* Slotti: kääre [data-hl-slot=pid] + laiska reviewit-lataus (kerran / pelaaja, vain henkilökunnan clientit); valmistuessa kaikki slotit piirretään uudelleen sisusFn(p):llä.
     o: { db, sid, demo, esc }. Välimuisti window._hlReviewit[pid] (undefined = ei yritetty, null = latautuu). */
  function tmHlSlot(p, sisusFn, o) {
    o = o || {}; var esc = o.esc || _esc, w = (typeof window !== 'undefined') ? window : null;
    var sisus = sisusFn(p);
    if (!sisus || !p || !p.id || !w) return sisus;   // tyhjä historia → tyhjä (kutsujan oma tyhjätila säilyy)
    w._hlReviewit = w._hlReviewit || {};
    if (w._hlReviewit[p.id] === undefined && o.db && o.sid && !o.demo) {
      w._hlReviewit[p.id] = null;
      tmHlLataa(o.db, o.sid, p.id).then(function (d) { w._hlReviewit[p.id] = d; }, function (e) { if (w.console) w.console.warn('[historia] reviewit:', e && e.message); w._hlReviewit[p.id] = {}; })
        .then(function () { w.document.querySelectorAll('[data-hl-slot="' + p.id + '"]').forEach(function (el) { el.innerHTML = sisusFn(p); }); });
    }
    return '<div data-hl-slot="' + esc(p.id) + '">' + sisus + '</div>';
  }
  var API = { FI: FI, tmHlSulkupvm: tmHlSulkupvm, tmHlLause: tmHlLause, tmHlLoppupvm: tmHlLoppupvm, tmHlAika: tmHlAika, tmHlKorttiLisa: tmHlKorttiLisa, tmHlSlot: tmHlSlot, tmHlLataa: tmHlLataa, tmHlSisainenMerkki: tmHlSisainenMerkki };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_HISTORIA_LAUSE = API;
})(typeof window !== 'undefined' ? window : this);
