/* ════════════════════════════════════════════════════════════════════════
   tm_valmentaja_koti_nakyma.js — V-KOTI PR A · valmentajan Koti v2 HTML (PURE; malli: lib/tm_valmentaja_koti.js). Tekstit C.t():n kautta (avain = fi-teksti). Ei hex-värejä (tokenit), ei punaista pelaajanostoissa: amber (huomio) + teal (myönteinen).
   tmKotiHTML(malli, C) — C: { t, on:{ toiminto(nappi) → onclick-merkkijono } , nimiVk? } · tmKotiCSS() · tmKotiLataaSaatavuus(db, sid, evId, pelaajat) → Promise<{tulossa:n, estynyt:[{nimi,syy}]}> (vain seuraavan tapahtuman lasnaolijat)
   Dual-export: module.exports || window.TM_VALMENTAJA_KOTI_NAKYMA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var VPV = ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'];
  var CSS = '.vk{display:grid;gap:18px;max-width:980px}.vk-kortti{background:var(--bg2,var(--surface));border:1px solid var(--border);border-radius:10px;padding:16px 18px;display:grid;gap:10px}'
    + '.vk-eb{font-family:\'DM Mono\',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}.vk-iso{font-family:\'Cormorant Garamond\',serif;font-size:26px;color:var(--ink);line-height:1.15}'
    + '.vk-meta{font-size:13px;color:var(--ink2)}.vk-rivi{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.vk-nappi{background:transparent;border:1px solid var(--teal);color:var(--teal);border-radius:8px;padding:8px 14px;font-size:13px;cursor:pointer}.vk-nappi.p{background:var(--teal);color:var(--on-accent,var(--bg))}'
    + '.vk-estynyt{font-size:12.5px;color:var(--ink2)}.vk-viikko{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}.vk-pv{border:1px solid var(--border);border-radius:8px;padding:8px 6px;min-height:84px;font-size:12px;color:var(--ink2);min-width:0}'
    + '.vk-pv.t{border-color:var(--teal);background:var(--teal-dim,rgba(40,176,144,.1))}.vk-pv b{display:block;font-size:12px;color:var(--ink);margin-bottom:2px}.vk-md{font-family:\'DM Mono\',monospace;font-size:10.5px;color:var(--ink3)}.vk-ev{display:block;margin-top:4px;color:var(--ink);overflow-wrap:anywhere;cursor:pointer}'
    + '.vk-teht{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border);font-size:14px;color:var(--ink)}.vk-teht:first-of-type{border-top:0}'
    + '.vk-teht.turva{border-left:3px solid var(--amber);padding-left:10px}.vk-lisaa{display:none}.vk-tehtavat.auki .vk-lisaa{display:block}.vk-kaikki{justify-self:start}.vk-nosto{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 0;border-top:1px solid var(--border);font-size:14px;color:var(--ink);cursor:pointer}.vk-nosto:first-of-type{border-top:0}.vk-nosto small{display:block;font-size:12.5px;color:var(--amber)}.vk-nosto.m small{color:var(--teal)}'
    + '.vk-syke{display:flex;flex-wrap:wrap;gap:20px}.vk-luku{font-family:\'Cormorant Garamond\',serif;font-size:26px;color:var(--ink);line-height:1}.vk-lbl{display:block;font-size:12px;color:var(--ink2);margin-top:2px}'
    + '.vk-palkit{display:flex;align-items:flex-end;gap:3px;height:44px}.vk-pk{flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%}.vk-pk i{display:block;min-height:0}.vk-pk .o{background:var(--teal)}.vk-pk .m{background:var(--ink3);opacity:.55}'
    + '.vk-tyhja{font-size:14px;color:var(--ink2);line-height:1.5}@media (max-width:640px){.vk-viikko{grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.vk-pv{padding:6px 3px;font-size:11px;min-height:64px}.vk-iso{font-size:22px}}';
  function _nappi(n, C, p) { return '<button type="button" class="vk-nappi' + (p ? ' p' : '') + '" onclick="' + _e(C.on(n)) + '">' + _e(C.t(n.teksti)) + '</button>'; }
  function _seuraava(s, C) {
    var t = C.t; if (!s) return '<div class="vk-kortti"><div class="vk-eb">' + _e(t('Seuraava')) + '</div><div class="vk-tyhja">' + _e(t('Ei tulevia tapahtumia. Lisää harjoitus tai ottelu kalenteriin.')) + '</div><div class="vk-rivi">' + _nappi({ teksti: 'Avaa kalenteri', toiminto: 'kalenteri' }, C, true) + '</div></div>';
    var meta = [s.pvm ? (VPV[(new Date(s.pvm + 'T12:00:00Z').getUTCDay() + 6) % 7] + ' ' + s.pvm.slice(8) + '.' + s.pvm.slice(5, 7) + '.') : '', s.aika, s.paikka].filter(Boolean).join(' · ');
    var lisa = [s.md ? s.md : '', s.teema ? s.teema : ''].filter(Boolean).join(' · ');
    var sa = s.saatavuusTiedossa && s.pelaajia ? '<div class="vk-estynyt">' + _e(s.pelaajia + ' ' + t('pelaajaa') + ' · ' + s.vahvistanut + ' ' + t('vahvistanut') + ' · ' + s.estynyt + ' ' + t('estynyt')) + (s.estyneet.length ? ': ' + _e(s.estyneet.map(function (x) { return x.nimi + (x.syy ? ' (' + x.syy + ')' : ''); }).join(', ')) : '') + '</div>' : '';
    return '<div class="vk-kortti"><div class="vk-eb">' + _e(t('Seuraava')) + '</div><div class="vk-iso">' + _e(s.nimi) + '</div><div class="vk-meta">' + _e(meta) + (lisa ? ' · ' + _e(lisa) : '') + '</div>' + sa
      + '<div class="vk-rivi">' + s.napit.map(function (n, i) { return _nappi(n, C, i === 0); }).join('') + '</div></div>';
  }
  function _viikko(v, C) {
    var t = C.t, solut = v.paivat.map(function (p) {
      return '<div class="vk-pv' + (p.tanaan ? ' t' : '') + '"><b>' + _e(t(VPV[p.vpaiva])) + ' ' + _e(p.pvm.slice(8)) + '</b>' + (p.md ? '<span class="vk-md">' + _e(p.md) + '</span>' : '')
        + p.tapahtumat.map(function (e) { return '<span class="vk-ev" onclick="' + _e(C.on({ toiminto: 'avaa', arg: e.id })) + '">' + _e(e.aika) + ' ' + _e(t(e.nimi)) + '</span>'; }).join('') + '</div>';
    }).join('');
    return '<div class="vk-kortti"><div class="vk-eb">' + _e(t('Tämä viikko')) + '</div><div class="vk-viikko">' + solut + '</div>'
      + (v.tyhja ? '<div class="vk-tyhja">' + _e(t('Viikko on tyhjä.')) + '</div><div class="vk-rivi">' + _nappi({ teksti: 'Täytä viikko', toiminto: 'tayta' }, C, true) + '</div>' : '') + '</div>';
  }
  function _lista(otsikko, rivit, C) { return rivit.length ? '<div class="vk-kortti"><div class="vk-eb">' + _e(C.t(otsikko)) + '</div>' + rivit.join('') + '</div>' : ''; }
  function _tehtavaLista(teht, lisa, C) {   // 3 näkyvissä + "Näytä kaikki (n)" (loput piilossa kunnes avataan; ei skriptiä: luokan vaihto)
    if (!teht.length) return '';
    return '<div class="vk-kortti vk-tehtavat"><div class="vk-eb">' + _e(C.t('Tehtävät')) + '</div>' + teht.join('') + (lisa.length ? '<div class="vk-lisaa">' + lisa.join('') + '</div><button type="button" class="vk-nappi vk-kaikki" onclick="this.parentNode.classList.toggle(\'auki\')">' + _e(C.t('Näytä kaikki')) + ' (' + (teht.length + lisa.length) + ')</button>' : '') + '</div>';
  }
  function tmKotiHTML(m, C) {
    if (!m) return ''; var t = C.t, rivi = function (x) { return '<div class="vk-teht' + (x.turva ? ' turva' : '') + '"><span>' + _e(x.paattyy ? t(x.teksti) + (x.tarkenne ? ' ' + x.tarkenne : '') + ' · ' + t(x.paattynyt ? 'jakso päättyi' : 'jakso päättyy') + ' ' + x.paattyy : t(x.teksti.split(': ')[0]) + (x.teksti.indexOf(': ') > 0 ? ': ' + x.teksti.split(': ').slice(1).join(': ') : '')) + '</span>' + _nappi(x.nappi, C, false) + '</div>'; }, teht = m.tehtavat.map(rivi), lisa = (m.lisaTehtavat || []).map(rivi);
    var nost = m.nostot.map(function (x) { return '<div class="vk-nosto' + (x.myonteinen ? ' m' : '') + '" onclick="' + _e(C.on(x)) + '"><span>' + _e(x.nimi) + '<small>' + _e(t(x.syy)) + '</small></span><span>›</span></div>'; });
    var s = m.syke, luvut = '', pk = (s.viikot || []).slice(-8), maks = 1; pk.forEach(function (x) { maks = Math.max(maks, x.ohjattu + x.omatoimi); });
    if (s.lasnaolo4vk != null) luvut += '<div><span class="vk-luku">' + s.lasnaolo4vk + ' %</span><span class="vk-lbl">' + _e(t('Läsnäolo 4 vk')) + '</span></div>';
    luvut += '<div><span class="vk-luku">' + s.omatoimiAktiivisia + '/' + s.pelaajia + '</span><span class="vk-lbl">' + _e(t('Omatoimisia tällä viikolla')) + '</span></div>';
    if (s.jakso) luvut += '<div><span class="vk-luku">' + s.jakso.vk + '/' + s.jakso.yht + '</span><span class="vk-lbl">' + _e(t('Jakson viikko')) + (s.jakso.paattyy ? ' · ' + _e(t('päättyy')) + ' ' + (+s.jakso.paattyy.slice(8)) + '.' + (+s.jakso.paattyy.slice(5, 7)) + '.' : '') + '</span></div>';
    var syke = '<div class="vk-kortti"><div class="vk-eb">' + _e(t('Syke')) + '</div><div class="vk-syke">' + luvut + '</div>'
      + (pk.length ? '<div class="vk-palkit">' + pk.map(function (x) { return '<div class="vk-pk" title="' + _e(x.vk) + '"><i class="m" style="height:' + Math.round(100 * x.omatoimi / maks) + '%"></i><i class="o" style="height:' + Math.round(100 * x.ohjattu / maks) + '%"></i></div>'; }).join('') + '</div>' : '')
      + '<div class="vk-rivi">' + _nappi({ teksti: 'Avaa Pulssi', toiminto: 'pulssi' }, C, false) + '</div></div>';
    var viestit = m.viestit.map(function (v) { return '<div class="vk-teht"><span>' + _e((v.kuka ? v.kuka + ': ' : '') + String(v.teksti || '').slice(0, 90)) + '</span>' + _nappi({ teksti: 'Avaa', toiminto: 'viestit', arg: v.id }, C, false) + '</div>'; });
    if (m.tyhja === 'uusi') return '<div class="vk"><div class="vk-kortti"><div class="vk-eb">' + _e(t('Aloita tästä')) + '</div><div class="vk-iso">' + _e(t('Tervetuloa')) + '</div><div class="vk-tyhja">' + _e(t('Aloita kolmella askeleella: lisää pelaajat joukkueeseen, täytä viikon harjoitukset kalenteriin ja kirjaa ensimmäinen havainto.')) + '</div><div class="vk-rivi">'
      + _nappi({ teksti: 'Täytä viikko', toiminto: 'tayta' }, C, true) + _nappi({ teksti: 'Uusi havainto', toiminto: 'havainto' }, C, false) + '</div></div></div>';
    return '<div class="vk">' + _seuraava(m.seuraava, C) + _tehtavaLista(teht, lisa, C) + _viikko(m.viikko, C) + _lista('Pelaajat, joihin kannattaa tarttua', nost, C) + syke + _lista('Lukemattomat viestit', viestit, C) + '</div>';
  }
  function tmKotiLataaSaatavuus(db, sid, evId, pelaajat) {
    var nimi = {}; (pelaajat || []).forEach(function (p) { nimi[p.id] = p.nimi; });
    return db.collection('seurat').doc(sid).collection('kalenteri').doc(evId).collection('lasnaolijat').get().then(function (q) {
      var tul = 0, est = []; q.forEach(function (d) { var x = d.data() || {}; if (x.saatavuus === 'tulossa') tul++; else if (x.saatavuus === 'estynyt') est.push({ nimi: nimi[d.id] || x.nimi || '', syy: x.syy || '' }); });
      return { tulossa: tul, estynyt: est };
    }, function () { return null; });
  }
  var API = { tmKotiHTML: tmKotiHTML, tmKotiCSS: function () { return CSS; }, tmKotiLataaSaatavuus: tmKotiLataaSaatavuus, CSS: CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_VALMENTAJA_KOTI_NAKYMA = API;
})(typeof window !== 'undefined' ? window : null);
