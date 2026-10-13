/* ════════════════════════════════════════════════════════════════════════
   tm_sheet.js — kehitystyöpöytä 22 · kierros B · B2 (D100, lukittu 13.10.; mockup 22 osio 5): YKSI sheet-komponentti VP:lle ja valmentajalle. Dual-export: module.exports || window.TM_SHEET.
   Nappi tekee toiminnon paikallaan: sheet avautuu nykyisen välilehden päälle, välilehti ei vaihdu. Kolme sääntöä:
     1 · YKSI sheet kerrallaan — uuden avaaminen sulkee edellisen (sen luonnos säilyy); sheetin päälle ei avata toista sheetiä eikä modaalia.
     2 · PITKÄ toiminto (Aloita jakso, Sulje jakso: useita kenttiä) = 390 px:llä koko ruudun sheet, työpöydällä keskitetty dialogi (≤ 680 px); LYHYT (viikkohavainto: yksi valinta + valinnainen lause) = alasheet (≤ 540 px keskitettynä työpöydällä).
     3 · SULKEMINEN SÄILYTTÄÄ LUONNOKSEN — Sulje, Esc ja taustan napautus eivät hävitä kirjoitettua. Vain Tallenna (tallennettu(id)) tai "Hylkää luonnos" tyhjentää. Luonnos on JS-muuttujassa (irrotettu DOM-alipuu), EI selaimen tallennuksessa.
   · tmSheetCss()                       → tyylit (vain tokenit; yksi @media 720 px)
   · tmSheetKehysHTML(m, opts)          → kehys: tausta + paneeli (kahva · ‹ Sulje · otsikko · "Luonnos säilytetty" · Hylkää luonnos) + runko. m: { id, tyyppi:'lyhyt'|'pitka', otsikko, luonnos }, opts: { esc, t }
   · tmSheetHallinta({ doc, win, t })   → { avaa(m), sulje(id?), tallennettu(id), hylkaa(id), luonnos(id), luonnokset(), avoinna(), paivitaMerkit() }
        avaa({ id, tyyppi, otsikko, sisalto (HTML-merkkijono | Element), avaaja? (Element: fokus palaa), onSulje? })
        Luonnos syntyy vain kun runkoa on muokattu (input/change) — koskematon sheet unohtuu suljettaessa. Samalla id:llä uudelleen avattaessa palaa sama runko arvoineen (sisalto-parametri ohitetaan).
        Avaajan merkki: elementit [data-ts-avaaja="<id>"] saavat sisarelementin .ts-luonnos-merkki ("Luonnos säilytetty") kun luonnos on olemassa (paivitaMerkit, kutsutaan automaattisesti).
   Saavutettavuus: role=dialog aria-modal, fokus sisään avattaessa ja avaajalle suljettaessa, Esc sulkee, kosketuskohteet ≥ 44 px.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = { ts_sulje: 'Sulje', ts_luonnos: 'Luonnos säilytetty', ts_hylkaa: 'Hylkää luonnos' };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }

  function tmSheetCss() {
    return [
      '.ts-tausta{position:fixed;inset:0;z-index:9100;background:color-mix(in srgb,var(--bg) 55%,transparent);display:flex;align-items:flex-end;justify-content:center}',
      '.ts-paneeli{background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:14px 14px 0 0;width:100%;max-height:88vh;display:flex;flex-direction:column;box-sizing:border-box;font-family:var(--font-body,inherit)}',
      '.ts-kahva{width:36px;height:4px;border-radius:2px;background:var(--chalk2,var(--border));margin:8px auto 2px}',
      '.ts-ylarivi{display:flex;align-items:center;flex-wrap:wrap;gap:2px 10px;padding:6px 14px 8px;border-bottom:.5px solid var(--border)}',
      '.ts-sulje{min-height:44px;min-width:44px;background:none;border:none;color:var(--teal);font:inherit;font-size:var(--fs-body,14px);cursor:pointer;padding:0 6px;white-space:nowrap}',
      '.ts-otsikko{flex:1 1 40%;font-family:var(--font-display,serif);font-size:var(--fs-lead,16px);color:var(--ink);margin:0}',
      '.ts-luonnos{font-size:var(--fs-meta,12.5px);color:var(--amber);white-space:nowrap}',
      '.ts-hylkaa{min-height:44px;background:none;border:none;color:var(--ink2);font:inherit;font-size:var(--fs-meta,12.5px);text-decoration:underline;cursor:pointer;padding:0 6px;white-space:nowrap}',
      '.ts-runko{overflow-y:auto;padding:14px;-webkit-overflow-scrolling:touch}',
      '.ts-luonnos-merkki{margin-left:8px;font-size:var(--fs-meta,12.5px);color:var(--amber)}',
      '@media (max-width:720px){.ts-pitka .ts-paneeli{max-height:none;height:100%;border-radius:0;border:none}.ts-lyhyt .ts-paneeli{max-height:70vh}}',
      '@media (min-width:721px){.ts-tausta{align-items:center}.ts-paneeli{border-radius:14px;max-width:540px}.ts-pitka .ts-paneeli{max-width:680px}.ts-kahva{display:none}}'
    ].join('\n');
  }

  function tmSheetKehysHTML(m, opts) {
    m = m || {}; opts = opts || {}; var esc = opts.esc || _esc, id = esc(m.id || '');
    return '<div class="ts-tausta ts-' + (m.tyyppi === 'pitka' ? 'pitka' : 'lyhyt') + '" data-ts-tausta="' + id + '"><div class="ts-paneeli" role="dialog" aria-modal="true" aria-labelledby="tsOtsikko_' + id + '" data-ts-sheet="' + id + '">'
      + '<div class="ts-kahva" aria-hidden="true"></div><div class="ts-ylarivi"><button type="button" class="ts-sulje" data-ts-sulje>‹ ' + esc(_txt(opts, 'ts_sulje')) + '</button><h2 class="ts-otsikko" id="tsOtsikko_' + id + '">' + esc(m.otsikko || '') + '</h2>'
      + (m.luonnos ? '<span class="ts-luonnos" data-ts-luonnos>' + esc(_txt(opts, 'ts_luonnos')) + '</span><button type="button" class="ts-hylkaa" data-ts-hylkaa>' + esc(_txt(opts, 'ts_hylkaa')) + '</button>' : '') + '</div><div class="ts-runko" data-ts-runko></div></div></div>';
  }

  function tmSheetHallinta(o) {
    o = o || {}; var doc = o.doc, win = o.win || (doc && doc.defaultView), t = o.t, luonn = {}, nyt = null;   // luonn[id] = { runko: Element, otsikko, tyyppi, avaaja }
    function _opts() { return { esc: _esc, t: t }; }
    function _runko(id) { return nyt && nyt.id === id ? nyt.runko : null; }
    function paivitaMerkit() {
      if (!doc) return; Array.prototype.forEach.call(doc.querySelectorAll('.ts-luonnos-merkki'), function (e) { e.parentNode.removeChild(e); });
      Object.keys(luonn).forEach(function (id) { if (!luonn[id].likainen) return; Array.prototype.forEach.call(doc.querySelectorAll('[data-ts-avaaja="' + id + '"]'), function (a) { var s = doc.createElement('span'); s.className = 'ts-luonnos-merkki'; s.textContent = _txt(_opts(), 'ts_luonnos'); a.parentNode.insertBefore(s, a.nextSibling); }); });
    }
    function _irrota() {   // sulkeminen: runko irrotetaan DOM:ista mutta säilytetään (luonnos); koskematon unohdetaan
      if (!nyt) return; var n = nyt, k = luonn[n.id]; nyt = null;
      if (n.kehys.parentNode) n.kehys.parentNode.removeChild(n.kehys);
      if (n.runko.parentNode) n.runko.parentNode.removeChild(n.runko);
      if (k && !k.likainen) delete luonn[n.id];
      if (doc && doc.removeEventListener) doc.removeEventListener('keydown', n.esc, true);
      if (n.avaaja && n.avaaja.focus) { try { n.avaaja.focus(); } catch (e) { /* ei fokusta */ } }
      if (typeof n.onSulje === 'function') n.onSulje(!!(k && k.likainen));
      paivitaMerkit();
    }
    function sulje(id) { if (nyt && (id == null || nyt.id === id)) _irrota(); return !nyt; }
    function avaa(m) {
      if (!doc || !m || !m.id) return false;
      if (nyt) _irrota();   // sääntö 1: yksi kerrallaan (edellisen luonnos säilyy)
      var vanha = luonn[m.id], runko = vanha ? vanha.runko : doc.createElement('div');
      if (!vanha) {
        if (m.sisalto && typeof m.sisalto === 'object') runko.appendChild(m.sisalto); else runko.innerHTML = String(m.sisalto == null ? '' : m.sisalto);
        luonn[m.id] = { runko: runko, likainen: false };
        var merkitse = function () { if (luonn[m.id] && !luonn[m.id].likainen) { luonn[m.id].likainen = true; var yl = doc.querySelector('[data-ts-sheet="' + m.id + '"] .ts-ylarivi'); if (yl && !yl.querySelector('[data-ts-luonnos]')) _nayta(m.id); } };
        runko.addEventListener('input', merkitse); runko.addEventListener('change', merkitse);
      }
      var w = doc.createElement('div'); w.innerHTML = tmSheetKehysHTML({ id: m.id, tyyppi: m.tyyppi, otsikko: m.otsikko, luonnos: !!(luonn[m.id] && luonn[m.id].likainen) }, _opts());
      var kehys = w.firstChild; kehys.querySelector('[data-ts-runko]').appendChild(runko); doc.body.appendChild(kehys);
      var esc = function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); sulje(m.id); } };
      nyt = { id: m.id, kehys: kehys, runko: runko, avaaja: m.avaaja || null, onSulje: m.onSulje, esc: esc };
      doc.addEventListener('keydown', esc, true);
      kehys.addEventListener('click', function (ev) {
        var tg = ev.target; if (tg === kehys || (tg.closest && tg.closest('[data-ts-sulje]'))) { sulje(m.id); return; }   // tausta + ‹ Sulje: luonnos säilyy (sääntö 3)
        if (tg.closest && tg.closest('[data-ts-hylkaa]')) hylkaa(m.id);
      });
      var f = runko.querySelector('input,textarea,select,button,[tabindex]'); if (f && f.focus) { try { f.focus(); } catch (e) { /* ei fokusta */ } }
      return true;
    }
    function _nayta(id) {   // luonnosmerkki + Hylkää ylärivillä kun luonnos syntyy kesken avoimen sheetin
      var yl = doc.querySelector('[data-ts-sheet="' + id + '"] .ts-ylarivi'); if (!yl || yl.querySelector('[data-ts-luonnos]')) return;
      var s = doc.createElement('span'); s.className = 'ts-luonnos'; s.setAttribute('data-ts-luonnos', ''); s.textContent = _txt(_opts(), 'ts_luonnos');
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'ts-hylkaa'; b.setAttribute('data-ts-hylkaa', ''); b.textContent = _txt(_opts(), 'ts_hylkaa'); yl.appendChild(s); yl.appendChild(b); paivitaMerkit();
    }
    function _tyhjenna(id) { var k = luonn[id]; if (k && k.runko.parentNode) k.runko.parentNode.removeChild(k.runko); delete luonn[id]; }
    function tallennettu(id) { if (nyt && nyt.id === id) { var n = nyt; delete luonn[id]; nyt = null; if (n.kehys.parentNode) n.kehys.parentNode.removeChild(n.kehys); if (doc.removeEventListener) doc.removeEventListener('keydown', n.esc, true); if (n.avaaja && n.avaaja.focus) { try { n.avaaja.focus(); } catch (e) { /* ei */ } } if (typeof n.onSulje === 'function') n.onSulje(false); } else _tyhjenna(id); paivitaMerkit(); }
    function hylkaa(id) { var auki = nyt && nyt.id === id; _tyhjenna(id); if (auki) { var n = nyt; nyt = null; if (n.kehys.parentNode) n.kehys.parentNode.removeChild(n.kehys); if (doc.removeEventListener) doc.removeEventListener('keydown', n.esc, true); if (typeof n.onSulje === 'function') n.onSulje(false); } paivitaMerkit(); }
    return { avaa: avaa, sulje: sulje, tallennettu: tallennettu, hylkaa: hylkaa, paivitaMerkit: paivitaMerkit, luonnos: function (id) { return !!(luonn[id] && luonn[id].likainen); }, luonnokset: function () { return Object.keys(luonn).filter(function (k) { return luonn[k].likainen; }); }, avoinna: function () { return nyt ? nyt.id : null; }, runko: _runko };
  }

  var API = { FI: FI, tmSheetCss: tmSheetCss, tmSheetKehysHTML: tmSheetKehysHTML, tmSheetHallinta: tmSheetHallinta };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_SHEET = API;
})(typeof window !== 'undefined' ? window : this);
