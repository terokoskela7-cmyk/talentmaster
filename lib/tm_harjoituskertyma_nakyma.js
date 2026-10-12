/* ════════════════════════════════════════════════════════════════════════
   tm_harjoituskertyma_nakyma.js — K35-6f · harjoituskertymän HTML-näkymät (PURE, HTML-merkkijonot; tekstit C.t():n kautta, avain = fi-teksti). Laskenta: lib/tm_harjoituskertyma.js (tmKertymaKoreista).
   Kehittävä sävy: ei vertailua muihin pelaajiin, ei punaisia hälytyksiä, ei hex-värejä (tokenit (fallback-ketju: Master/VP --ink*, Pelaaja --text/--slate, Vanhempi --surface): teal = ohjattu, ink3 = omatoiminen).
   · tmKertymaMasterHTML(k, C) — Masterin pelaajakortin "Harjoittelu"-lohko: 4 vk + kausi: Joukkueharjoitukset 14/16 · Aamutreenit 5/6 · Ottelut 3 · Omatoimiset 9 + viikoittainen pino-palkki (ohjattu/omatoimi)
   · tmKertymaKevytHTML(k, C) — Pelaajan/Vanhemman tiivis kortti: "Tällä kaudella: 14 treeniä · 5 aamutreeniä · 9 omatoimista" + 8 vk minipalkki (lapselle: C.vanhempi → "Tällä kaudella lapsella: …")
   · tmKertymaPulssiHTML(j, C) — Pulssin rivi "Ohjattu läsnäolo · 4 vk" (joukkueen %; alle 70 % olevat nimet vain valmentajalle: C.valmentaja + C.nimet)
   · tmKertymaCSS() — YKSI paikka CSS:lle. Dual-export: module.exports || window.TM_HARJOITUSKERTYMA_NAKYMA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _tt(C) { return C && typeof C.t === 'function' ? C.t : function (x) { return x; }; }
  var CSS = '.hk{display:grid;gap:10px}.hk-sarakkeet{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.hk-otsikko{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink3,var(--slate))}'
    + '.hk-rivi{display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--ink,var(--text));padding:3px 0}.hk-rivi b{font-weight:600;font-variant-numeric:tabular-nums}.hk-pieni{font-size:12px;color:var(--ink2,var(--slate))}.hk-tyhja{font-size:13px;color:var(--ink2,var(--slate))}'
    + '.hk-palkit{display:flex;align-items:flex-end;gap:3px;height:56px;margin-top:2px}.hk-pv{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;min-width:0}.hk-o{background:var(--teal);border-radius:2px 2px 0 0;min-height:0}.hk-m{background:var(--ink3,var(--slate));opacity:.55;border-radius:2px 2px 0 0;min-height:0}.hk-pv.tyhja:after{content:"";display:block;height:2px;background:var(--border,rgba(128,128,128,.25))}'
    + '.hk-selite{display:flex;gap:12px;font-size:12px;color:var(--ink2,var(--slate))}.hk-selite i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:4px;vertical-align:-1px}.hk-selite i.o{background:var(--teal)}.hk-selite i.m{background:var(--ink3,var(--slate));opacity:.55}'
    + '.hk-kortti{background:var(--card,var(--surface));border:1px solid var(--border,rgba(128,128,128,.25));border-radius:8px;padding:12px 14px;display:grid;gap:8px}.hk-yla{font-size:14px;color:var(--ink,var(--text));line-height:1.4}@media (max-width:480px){.hk-sarakkeet{grid-template-columns:minmax(0,1fr)}}';
  function _palkit(viikot, n, t) {
    var v = (viikot || []).slice(-n), maks = 1; v.forEach(function (x) { maks = Math.max(maks, x.ohjattu + x.omatoimi); });
    return '<div class="hk-palkit" role="img" aria-label="' + _esc(t('Viikoittainen harjoittelu')) + '">' + v.map(function (x) { var tyhja = !x.ohjattu && !x.omatoimi; return '<div class="hk-pv' + (tyhja ? ' tyhja' : '') + '" title="' + _esc(x.vk) + '"><div class="hk-m" style="height:' + Math.round(100 * x.omatoimi / maks) + '%"></div><div class="hk-o" style="height:' + Math.round(100 * x.ohjattu / maks) + '%"></div></div>'; }).join('') + '</div>'
      + '<div class="hk-selite"><span><i class="o"></i>' + _esc(t('Ohjattu')) + '</span><span><i class="m"></i>' + _esc(t('Omatoiminen')) + '</span></div>';
  }
  function _jakso(s, otsikko, t) {
    var rivi = function (nimi, arvo) { return '<div class="hk-rivi"><span>' + _esc(t(nimi)) + '</span><b>' + _esc(arvo) + '</b></div>'; }, r = [];
    if (s.treeni.yht) r.push(rivi('Joukkueharjoitukset', s.treeni.lasna + '/' + s.treeni.yht));
    if (s.ryhma.yht) r.push(rivi('Ryhmätreenit', s.ryhma.lasna + '/' + s.ryhma.yht));
    if (s.aamu.yht) r.push(rivi('Aamutreenit', s.aamu.lasna + '/' + s.aamu.yht));
    if (s.ottelu.lasna) r.push(rivi('Ottelut', String(s.ottelu.lasna)));
    if (s.omatoimi.n) r.push(rivi('Omatoimiset', String(s.omatoimi.n)));
    var poissa = ['treeni', 'aamu', 'ryhma', 'ottelu'].reduce(function (a, c) { return { sairas: a.sairas + s[c].poissa.sairas, estynyt: a.estynyt + s[c].poissa.estynyt, muu: a.muu + s[c].poissa.muu }; }, { sairas: 0, estynyt: 0, muu: 0 }), ei = ['treeni', 'aamu', 'ryhma', 'ottelu'].reduce(function (a, c) { return a + s[c].ei_kirjattu; }, 0), lisa = [];
    if (poissa.sairas || poissa.estynyt) lisa.push(t('Poissa ilmoitettu') + ': ' + (poissa.sairas ? poissa.sairas + ' ' + t('sairas') : '') + (poissa.sairas && poissa.estynyt ? ' · ' : '') + (poissa.estynyt ? poissa.estynyt + ' ' + t('estynyt') : ''));
    if (ei) lisa.push(ei + ' ' + t('ei kirjattu'));
    return '<div><div class="hk-otsikko">' + _esc(t(otsikko)) + '</div>' + (r.length ? r.join('') : '<div class="hk-tyhja">' + _esc(t('Ei vielä kirjauksia')) + '</div>') + (lisa.length ? '<div class="hk-pieni">' + _esc(lisa.join(' · ')) + '</div>' : '') + '</div>';
  }
  function _tyhjaKooste(k) {   // ei yhtään kirjausta kaudella eikä 4 vk:lla (ei läsnäoloja, otteluita eikä omatoimisia)
    return ['vk4', 'kausi'].every(function (a) { var x = k[a]; return !x || (!x.omatoimi.n && ['treeni', 'aamu', 'ryhma', 'ottelu'].every(function (c) { return !x[c] || !(x[c].yht || x[c].lasna || x[c].paik || x[c].myoh); })); });
  }
  function tmKertymaMasterHTML(k, C) {
    var t = _tt(C); if (!k) return '';
    if (_tyhjaKooste(k)) return '<div class="hk"><div class="hk-tyhja">' + _esc(t('Kertymä alkaa näkyä, kun läsnäoloja tai omatoimisia kirjataan.')) + '</div></div>';   // K35-11 #6: tyhjä tila, ei piilotusta (piilotus vain lukuvirheessä = k null)
    return '<div class="hk"><div class="hk-sarakkeet">' + _jakso(k.vk4, '4 viikkoa', t) + _jakso(k.kausi, 'Kausi', t) + '</div>' + _palkit(k.viikot, 12, t) + '</div>';
  }
  function tmKertymaKevytHTML(k, C) {
    var t = _tt(C); if (!k) return ''; var s = k.kausi, treeneja = s.treeni.lasna + s.ryhma.lasna, osat = [];
    if (treeneja) osat.push(treeneja + ' ' + t('treeniä')); if (s.aamu.lasna) osat.push(s.aamu.lasna + ' ' + t('aamutreeniä')); if (s.ottelu.lasna) osat.push(s.ottelu.lasna + ' ' + t('ottelua')); if (s.omatoimi.n) osat.push(s.omatoimi.n + ' ' + t('omatoimista'));
    var yla = osat.length ? t(C && C.vanhempi ? 'Tällä kaudella lapsella' : 'Tällä kaudella') + ': ' + osat.join(' · ') : t('Kausi on vasta alussa — jokainen treeni ja omatoiminen kirjaus kertyy tähän.');
    return '<div class="hk-kortti"><div class="hk-yla">' + _esc(yla) + '</div>' + _palkit(k.viikot, 8, t) + '</div>';
  }
  function tmKertymaPulssiHTML(j, C) {
    var t = _tt(C); if (!j || !j.pelaajia) return '';
    var alle = C && C.valmentaja && j.alle70.length ? '<div class="hk-pieni">' + _esc(t('Seurataan') + ': ' + j.alle70.map(function (i) { return (C.nimet && C.nimet(i)) || ''; }).filter(Boolean).join(', ')) + '</div>' : '';
    return '<div class="hk-rivi"><span>' + _esc(t('Ohjattu läsnäolo')) + ' · ' + _esc(t('4 viikkoa')) + '</span><b>' + j.ohjattuPros + ' %</b></div>' + alle;
  }
  var API = { tmKertymaMasterHTML: tmKertymaMasterHTML, tmKertymaKevytHTML: tmKertymaKevytHTML, tmKertymaPulssiHTML: tmKertymaPulssiHTML, tmKertymaCSS: function () { return CSS; }, CSS: CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_HARJOITUSKERTYMA_NAKYMA = API;
})(typeof window !== 'undefined' ? window : null);
