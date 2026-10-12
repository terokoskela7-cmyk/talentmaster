/* ════════════════════════════════════════════════════════════════════════
   tm_kalenteri_kuukausi.js — K35-11b · Masterin kalenterin KUUKAUSINÄKYMÄ (korvaa "Kuukausi — tulossa"). PURE; viikon kortit lasketaan SAMASTA mallista kuin viikkonäkymä (tm_kalenteri_nakyma.tmKalViikkoMalli) → sama suodatus/tyypit/värit.
   · tmKuukausiMalli({ tapahtumat, vuosi, kk (0–11), tanaan, nyt?, max? }) → { vuosi, kk, otsikko:{vuosi,kk}, viikot:[{ vk, maanantai, paivat:[{ pvm, nro, kuussa, tanaan, tauko, kortit:[{id,nimi,alkaa,vari,katkoviiva,tyyppi}], lisaa }] }], yhteensa }
     Maanantai ensin; 4–6 viikkoriviä; päivässä enintään `max` (oletus 3) korttia + `lisaa` = loput; koko päivän tapahtumat (tauko, testi) ensin.
   · tmKuukausiSiirto(vuosi, kk, suunta) → { vuosi, kk } · tmKuukausiNimi(kk) · tmKuukausiHTML(malli, C) — C: { t, on:{ tapahtuma(id), paiva(pvm) } } (onclick-merkkijonot; vain id/pvm vakioina) · tmKuukausiCSS() (tokenit, ei hex).
   Dual-export: module.exports || window.TM_KALENTERI_KUUKAUSI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  var KK = ['tammikuu', 'helmikuu', 'maaliskuu', 'huhtikuu', 'toukokuu', 'kesäkuu', 'heinäkuu', 'elokuu', 'syyskuu', 'lokakuu', 'marraskuu', 'joulukuu'], VP = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  function _z(n) { return (n < 10 ? '0' : '') + n; }
  function _iso(u) { var d = new Date(u); return d.getUTCFullYear() + '-' + _z(d.getUTCMonth() + 1) + '-' + _z(d.getUTCDate()); }
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tmKuukausiNimi(kk) { return KK[((kk % 12) + 12) % 12]; }
  function tmKuukausiSiirto(vuosi, kk, suunta) { var n = vuosi * 12 + kk + (suunta || 0); return { vuosi: Math.floor(n / 12), kk: ((n % 12) + 12) % 12 }; }
  function tmKuukausiMalli(a) {
    a = a || {}; var N = _lib('./tm_kalenteri_nakyma.js', 'TM_KALENTERI_NAKYMA'), max = a.max > 0 ? a.max : 3, vuosi = +a.vuosi, kk = +a.kk, tanaan = String(a.tanaan || '').slice(0, 10), viikot = [], yht = 0;
    var eka = Date.UTC(vuosi, kk, 1, 12), wd = (new Date(eka).getUTCDay() + 6) % 7, ma = eka - wd * 86400000, vikaPv = Date.UTC(vuosi, kk + 1, 0, 12);
    for (var w = 0; w < 6; w++) {
      var u0 = ma + w * 7 * 86400000; if (w >= 4 && u0 > vikaPv) break;
      var mai = _iso(u0), vm = N.tmKalViikkoMalli ? N.tmKalViikkoMalli({ maanantai: mai, tapahtumat: a.tapahtumat || [], nyt: a.nyt }) : { paivat: [] }, paivat = [];
      for (var i = 0; i < 7; i++) {
        var p = vm.paivat && vm.paivat[i] || { pvm: _iso(u0 + i * 86400000), kortit: [], kokoPaiva: [] }, d = new Date(Date.UTC(+p.pvm.slice(0, 4), +p.pvm.slice(5, 7) - 1, +p.pvm.slice(8, 10), 12)), kuussa = d.getUTCMonth() === kk && d.getUTCFullYear() === vuosi;
        var kaikki = (p.kokoPaiva || []).concat(p.kortit || []).map(function (k) { return { id: k.id, nimi: k.nimi || k.tyyppi || '', alkaa: k.alkaa || '', vari: k.vari, katkoviiva: !!k.katkoviiva, tyyppi: k.tyyppi }; });
        if (kuussa) yht += kaikki.length;
        paivat.push({ pvm: p.pvm, nro: d.getUTCDate(), kuussa: kuussa, tanaan: p.pvm === tanaan, tauko: p.tauko || null, kortit: kaikki.slice(0, max), lisaa: Math.max(0, kaikki.length - max) });
      }
      viikot.push({ maanantai: mai, paivat: paivat });
    }
    return { vuosi: vuosi, kk: kk, otsikko: { vuosi: vuosi, kk: kk }, viikot: viikot, yhteensa: yht };
  }
  var CSS = '.km{display:grid;gap:4px}.km-otsikko,.km-rivi{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}.km-vp{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink3);padding:2px 6px}'
    + '.km-pv{background:var(--card);border:1px solid var(--border);border-radius:6px;min-height:92px;padding:4px 6px;min-width:0;display:flex;flex-direction:column;gap:2px;cursor:pointer}.km-pv.ei{opacity:.45}.km-pv.t{border-color:var(--teal)}.km-nro{font-size:12px;color:var(--ink2)}.km-pv.t .km-nro{color:var(--teal)}'
    + '.km-ev{display:flex;gap:4px;align-items:center;font-size:11.5px;color:var(--ink);line-height:1.25;border:0;background:none;text-align:left;padding:1px 0;cursor:pointer;min-width:0}.km-ev i{flex:0 0 6px;height:6px;border-radius:50%;background:var(--ink3)}.km-ev span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.km-lisaa{font-size:11px;color:var(--ink3)}.km-tyhja{font-size:13px;color:var(--ink2);padding:8px 2px}@media (max-width:640px){.km-pv{min-height:64px;padding:3px}.km-ev .km-aika{display:none}.km-ev span{white-space:normal}}';
  function tmKuukausiHTML(m, C) {
    var t = (C && C.t) || function (x) { return x; }, on = (C && C.on) || {};
    var hdr = '<div class="km-otsikko">' + VP.map(function (v) { return '<div class="km-vp">' + _esc(t(v)) + '</div>'; }).join('') + '</div>';
    var rivit = m.viikot.map(function (w) {
      return '<div class="km-rivi">' + w.paivat.map(function (d) {
        return '<div class="km-pv' + (d.kuussa ? '' : ' ei') + (d.tanaan ? ' t' : '') + '" data-pvm="' + _esc(d.pvm) + '" onclick="' + _esc(on.paiva ? on.paiva(d.pvm) : '') + '"><span class="km-nro">' + d.nro + '</span>'
          + d.kortit.map(function (k) { return '<button type="button" class="km-ev" onclick="event.stopPropagation();' + _esc(on.tapahtuma && k.id != null ? on.tapahtuma(k.id) : '') + '"><i style="background:' + _esc(k.vari || 'var(--ink3)') + '"></i><span><b class="km-aika">' + _esc(k.alkaa ? k.alkaa + ' ' : '') + '</b>' + _esc(t(k.nimi)) + '</span></button>'; }).join('')
          + (d.lisaa ? '<span class="km-lisaa">+' + d.lisaa + ' ' + _esc(t('lisää')) + '</span>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('');
    return '<div class="km">' + hdr + rivit + (m.yhteensa ? '' : '<div class="km-tyhja">' + _esc(t('Ei tapahtumia tässä kuussa.')) + '</div>') + '</div>';
  }
  var API = { tmKuukausiMalli: tmKuukausiMalli, tmKuukausiSiirto: tmKuukausiSiirto, tmKuukausiNimi: tmKuukausiNimi, tmKuukausiHTML: tmKuukausiHTML, tmKuukausiCSS: function () { return CSS; }, KK: KK };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KALENTERI_KUUKAUSI = API;
})(typeof window !== 'undefined' ? window : null);
