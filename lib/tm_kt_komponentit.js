/* ════════════════════════════════════════════════════════════════════════
   tm_kt_komponentit.js — mockup 22:n JAETUT komponentit (CODE_BRIEF_S2_KOTI, Design): signaalikortti .kt-sig (+ .w/.n, -h, -why, -second), nappi .kt-btn, yläotsikko .kt-eb,
   kysymyskortit .kt-q3/.kt-q, osarivit .kt-osa-r, kortti-anatomia .kt-ev (mockupin .ev). YKSI paikka CSS:lle: Kehitystyöpöytä (lib/tm_kehitystyopoyta.js) ja Seuran pulssi
   (lib/tm_seuran_pulssi.js) käyttävät samaa — samasta kortista ei synny kolmatta versiota. Vain olemassa olevat tokenit (ei hex-värejä, ei uusia tokeneita).
   Fontit/tokenit: --kt-serif ja --amber-dim tulevat .kt-shell:stä TAI kutsujan omalta juurelta (Seuran pulssi: .tmp määrittelee ne olemassa olevista tokeneista). PURE: ei DOM:ia paitsi tmKtKomponentitLisaa(document). Dual-export: module.exports || window.TM_KT_KOMPONENTIT.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var CSS = [
      '.kt-eb{font-family:var(--font-mono);font-size:var(--fs-eb,11px);letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}',
      '.kt-sig{border:1px solid var(--teal);background:color-mix(in srgb,var(--teal) 14%,transparent);border-radius:6px;padding:12px 14px;display:grid;gap:8px}',
      '.kt-sig.w{border-color:var(--amber);background:var(--amber-dim)}.kt-sig.n{border-style:dashed;background:transparent}',
      '.kt-sig-h{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);font-weight:500;line-height:1.05}',
      '.kt-sig-why{font-size:var(--fs-body,14px);color:var(--ink2)}',
      '.kt-sig-second{display:grid;gap:2px;font-size:var(--fs-body,14px);color:var(--ink2);border-top:1px dashed var(--border);padding-top:6px}',
      '.kt-btn{font:inherit;font-size:var(--fs-body,14px);font-weight:600;padding:8px 14px;border-radius:4px;border:1px solid var(--teal);background:var(--teal);color:var(--on-accent,var(--bg));cursor:pointer;min-height:36px;white-space:nowrap}',
      '.kt-btn.q{background:transparent;color:var(--teal)}.kt-btn.g{background:transparent;color:var(--ink2);border-color:var(--border)}',
      '.kt-btn:focus-visible,.kt-osa-r:focus-visible,.kt-linkki:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
      '.kt-q3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kt-q3.two{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '@media (max-width:720px){.kt-q3,.kt-q3.two{grid-template-columns:minmax(0,1fr)}}',
      '.kt-q{border:1px solid var(--border);border-radius:4px;padding:10px 12px;display:grid;gap:3px;background:var(--bg)}',
      '.kt-q-k{font-size:var(--fs-meta,12.5px);color:var(--ink3)}.kt-q-v{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);line-height:1.05;font-weight:500}.kt-q-v.na{color:var(--ink3);font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:400}.kt-q-v.w{color:var(--amber)}.kt-q-s{font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-osat{display:grid;gap:4px;margin-top:6px}',
      '.kt-osa-r{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font:inherit;font-size:var(--fs-body,14px);background:var(--bg);color:var(--ink);text-align:left;width:100%}',
      'button.kt-osa-r{cursor:pointer}.kt-osa-k{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--teal);font-weight:500}.kt-osa-st{font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-osa-mer{grid-column:1/-1;font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-osa-r.on{border-color:var(--amber)}.kt-osa-r.on .kt-osa-st{color:var(--amber);font-weight:600}.kt-osa-r.ok .kt-osa-st{color:var(--teal);font-weight:600}',
      /* mockup 25 rivilista (.vl/.vr/.dot/.vm/.tag + "g sm" -nappi + .note): Tilanne (poikkeamat, ehdotukset, esityslista), Viestit v0, … — YKSI paikka */
      '.kt-vl{display:grid;border:1px solid var(--border);border-radius:6px;margin-top:6px;overflow:hidden}',
      '.kt-vr{display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 12px;border-top:1px solid var(--border);font-size:var(--fs-body,14px)}.kt-vr:first-child{border-top:0}',
      '.kt-vr .kt-vt b{font-weight:600;margin-right:4px}.kt-vm{display:block;font-size:var(--fs-meta,12.5px);color:var(--ink2);margin-top:1px}.kt-dot{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);text-align:center}.kt-dot.ok{color:var(--teal)}.kt-dot.w{color:var(--amber)}.kt-dot.err{color:var(--red)}.kt-dot.n{color:var(--ink3)}',
      '.kt-tag{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2);border:1px solid var(--border);border-radius:3px;padding:0 5px;margin:0 4px}.kt-mono{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      '.kt-gb{background:none;border:1px solid var(--border);border-radius:4px;padding:3px 9px;min-height:28px;font:inherit;font-size:var(--fs-body,14px);font-weight:600;color:var(--ink2);cursor:pointer}.kt-gb.p{color:var(--teal);border-color:var(--teal-brd)}.kt-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}',
      '.kt-note{border-left:2px solid var(--teal);padding:8px 14px;color:var(--ink2);font-size:var(--fs-body,14px)}.kt-note.w{border-color:var(--amber)}',
      '@container (max-width:720px){.kt-vr{grid-template-columns:18px minmax(0,1fr)}.kt-vr .kt-acts,.kt-vr>.kt-gb{grid-column:2;justify-self:start}}',
      /* D143 joukkuenauha (mockup 29): segmentti per joukkue ikäjärjestyksessä; tila MUODOSTA, ei vain värillä: täytetty teal = jakso käynnissä ja katselmukset ajallaan · amber-ääriviiva = kesken / katselmus odottaa · katkoviiva = ei jaksoa */
      '.kt-nauha{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:3px;margin:2px 0}.kt-nauha i{display:block;height:8px;border-radius:2px;border:1px dashed var(--ink3);background:transparent}',
      '.kt-nauha i.ok{background:var(--teal);border:0}.kt-nauha i.w{background:color-mix(in srgb,var(--amber) 16%,transparent);border:1px solid var(--amber)}.kt-nauha.iso i{height:14px}',
      '.kt-nauha-l{display:flex;justify-content:space-between;font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2)}',
      /* mockup 22 ".ev": kortti-anatomia — otsikko · tulkintalause · luvut+ikä · yksi linkki (Seuran pulssi: mobiilin poikkeamakortit, Tänään/Tulossa) */
      '.kt-ev{border:1px solid var(--border);border-radius:6px;background:var(--bg);display:grid;gap:8px;padding:12px 14px;min-width:0}',
      '.kt-ev-t{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}',
      '.kt-ev-h{font-family:var(--kt-serif);font-size:var(--fs-h2,26px);font-weight:500;line-height:1.05;background:none;border:0;padding:0;color:var(--ink);cursor:pointer;text-align:left}',
      '.kt-ev-age{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);color:var(--ink2);white-space:nowrap}',
      '.kt-ev-lause{font-size:var(--fs-body,14px);color:var(--ink);line-height:1.45}',
      '.kt-ev-nums{display:flex;flex-wrap:wrap;gap:6px 18px}.kt-ev-nums>div{display:grid;gap:0}.kt-ev-k{font-size:var(--fs-meta,12.5px);color:var(--ink3)}',
      '.kt-ev-v{font-family:var(--font-sans);font-size:var(--fs-lead,16px);line-height:1.3;font-weight:600;font-variant-numeric:tabular-nums}.kt-ev-v small{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:400;color:var(--ink2);margin-left:4px}.kt-ev-v.w{color:var(--amber)}.kt-ev-v.err{color:var(--red)}',
      '.kt-ev-act{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:8px;margin-top:2px}.kt-ev-act button{background:none;border:0;padding:0;font:inherit;font-size:var(--fs-body,14px);font-weight:600;color:var(--teal);cursor:pointer}',
      'details.kt-ev.acc{padding:0}details.kt-ev.acc summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;padding:12px 14px;align-items:baseline}details.kt-ev.acc summary::-webkit-details-marker{display:none}',
      'details.kt-ev.acc .kt-ev-sum{grid-column:1/-1;font-family:var(--kt-serif);font-size:var(--fs-h2,26px);color:var(--ink2);line-height:1}details.kt-ev.acc[open] .kt-ev-sum{display:none}details.kt-ev.acc .kt-ev-lause{padding:0 14px 12px}',
  ].join('\n');
  /* D143: joukkuenauha. segs = [{tunniste, tila:'ok'|'w'|'n'}] ikäjärjestyksessä; o = {iso, t, esc}. Jokaisella segmentillä title + aria-label = tunniste ja tila. */
  var NAUHA_TILA = { ok: 'jakso käynnissä, katselmukset ajallaan', w: 'jakso kesken tai katselmus odottaa', n: 'ei jaksoa' };
  function tmKtNauhaHTML(segs, o) {
    o = o || {}; var esc = o.esc || function (x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }, t = typeof o.t === 'function' ? o.t : function (x) { return x; }, S = Array.isArray(segs) ? segs : [];
    if (!S.length) return '';
    var h = '<div class="kt-nauha' + (o.iso ? ' iso' : '') + '" style="--n:' + S.length + '" role="group" aria-label="' + esc(t('Joukkueet ikäjärjestyksessä')) + '">' + S.map(function (x) {
      var tl = x.tila === 'ok' || x.tila === 'w' ? x.tila : 'n', sel = esc(x.tunniste + ': ' + t(NAUHA_TILA[tl]));
      return '<i class="' + (tl === 'n' ? '' : tl) + '" role="img" title="' + sel + '" aria-label="' + sel + '"></i>';
    }).join('') + '</div>';
    if (o.iso) h += '<div class="kt-nauha-l"><span>' + esc(S[0].tunniste) + '</span><span>' + esc(t('ikäjärjestys')) + '</span><span>' + esc(S[S.length - 1].tunniste) + '</span></div>';
    return h;
  }
  /* Lisää CSS kerran (id tmKtKomponentit); toistuva kutsu ei tee mitään. */
  function tmKtKomponentitLisaa(doc) {
    if (!doc || !doc.head || (doc.getElementById && doc.getElementById('tmKtKomponentit'))) return false;
    var s = doc.createElement('style'); s.id = 'tmKtKomponentit'; s.textContent = CSS; doc.head.appendChild(s); return true;
  }
  var API = { CSS: CSS, NAUHA_TILA: NAUHA_TILA, tmKtNauhaHTML: tmKtNauhaHTML, tmKtKomponentitLisaa: tmKtKomponentitLisaa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_KT_KOMPONENTIT = API;
})(typeof window !== 'undefined' ? window : null);
