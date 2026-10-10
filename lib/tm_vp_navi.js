/* ════════════════════════════════════════════════════════════════════════
   tm_vp_navi.js — VP_v25 NAVIGAATIO v3 (S2c PR 2; docs/CODE_BRIEF_S2C_TILANNE_NAVI.md, mockup 25 §1 "Navigaatio", D135) + Viestit v0.
   PURE: ei Firebasea, ei DOM:ia. Dual-export: module.exports || window.TM_VP_NAVI. Vain Kenttä-lipun seurat (adapteri VP_v25:ssä).
     Sivupalkki 1280 px:  Koti · Viestit · Kalenteri · Tilanne │ Joukkueet ja ryhmät · Valmentajat │ Työkalut (suljettu): Testit · Pelihavainto · Bio-banding · Taktiikkataulu · Ohjelmakirjasto │ Asetukset alhaalla
     Mobiilin alapalkki:  Koti · Viestit · Kalenteri · Tilanne · Joukkueet
   · tmNaviReitti(ws, nakyma)            → {ws, nakyma, avaa} — KAIKKI vanhat setWs-avaimet ohjataan uuteen paikkaan (taulukko REITIT; vartijatesti käy läpi jokaisen)
   · tmNaviNimiAvain(ws)                 → sivupalkin nimi (murupolku seuraa uutta rakennetta)
   · tmNaviSivupalkkiHTML(opts) / tmNaviTabbarHTML(opts) / tmNaviPikatoiminnot(opts)
   · tmViestitRivit(docs, uid, nimiFn)   → VP:n henkilökuntaviestit (lähetetyt + saapuneet), uusin ensin
   · tmViestitHTML(rivit, opts)          → Viestit v0 -lista (kt-komponentit; Asiat-kytkös tulee tammikuussa)
   Komponentit: lib/tm_kt_komponentit.js; vain olemassa olevat tokenit.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _tt(o) { return (o && typeof o.t === 'function') ? o.t : function (k) { return k; }; }
  function _fill(s, v) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return v && v[k] != null ? v[k] : m; }); }
  function _ms(x) { if (x == null) return null; if (typeof x === 'number') return x; if (typeof x.toMillis === 'function') return x.toMillis(); if (typeof x.toDate === 'function') return x.toDate().getTime(); if (typeof x.seconds === 'number') return x.seconds * 1000; var t = Date.parse(x); return isFinite(t) ? t : null; }

  /* ── rakenne (mockup 25 NAVI / TYO) ── */
  var PAIVITTAIN = [
    { ws: 'koti', avain: 'Koti', ikoni: '⌂' },
    { ws: 'viestit', avain: 'Viestit', ikoni: '✉︎', laskuri: 'viestit' },
    { ws: 'kalenteri', avain: 'Kalenteri', ikoni: '▦' },
    { ws: 'tilanne', avain: 'Tilanne', ikoni: '◷', laskuri: 'tilanne' }
  ];
  var PORAUTUMINEN = [
    { ws: 'joukkueet', avain: 'Joukkueet ja ryhmät', ikoni: '◎' },
    { ws: 'valmentajat', avain: 'Valmentajat', ikoni: '☺' }
  ];
  var TYOKALUT = [   // suljettu ryhmä; fn = olemassa oleva avaaja
    { avain: 'Testit', fn: "setWs('testit')", ws: 'testit' },
    { avain: 'Pelihavainto', fn: 'avaaAdarKenttatyokalu()' },
    { avain: 'Bio-banding', fn: 'avaaBioBanding()' },
    { avain: 'Taktiikkataulu', fn: 'avaaKaaviopankki()' },
    { avain: 'Ohjelmakirjasto', fn: "_vpOhjKirjastoModal('','')" }
  ];
  var TABBAR = [{ ws: 'koti', avain: 'Koti', ikoni: '⌂' }, { ws: 'viestit', avain: 'Viestit', ikoni: '✉︎' }, { ws: 'kalenteri', avain: 'Kalenteri', ikoni: '▦' }, { ws: 'tilanne', avain: 'Tilanne', ikoni: '◷' }, { ws: 'joukkueet', avain: 'Joukkueet', ikoni: '◎' }];
  var ASETUKSET = { ws: 'asetukset', avain: 'Asetukset' };

  /* ── VANHAT AVAIMET → UUSI PAIKKA (D135). Taulukkotesti käy jokaisen läpi. avaa = osio jonka Tilanne avaa; nakyma = Joukkueet ja ryhmät -sivun välilehti ── */
  var REITIT = {
    pelaajat:    { ws: 'joukkueet', nakyma: 'pelaajat' },      // Pelaajat → Joukkueet ja ryhmät (pelaajahaku ⌘K + joukkue → pelaaja)
    ryhmat:      { ws: 'joukkueet', nakyma: 'ryhmat' },        // Ryhmät → Joukkueet ja ryhmät
    raportointi: { ws: 'tilanne', avaa: 'raportointi' },       // Raportointi → Tilanne · Jaksopalaveri (esityslistan liitteet)
    reviewit:    { ws: 'tilanne', avaa: 'reviewit' },          // Seuranta → Tilanne
    jaksofokus:  { ws: 'tilanne', avaa: 'jaksofokus' }         // Jaksofokus → Tilanne
  };
  /* Pysyvät avaimet (ei ohjausta): uuden rakenteen omat + Työkalut/Asetukset */
  var PYSYVAT = ['koti', 'viestit', 'kalenteri', 'tilanne', 'joukkueet', 'valmentajat', 'testit', 'asetukset'];
  /* Muut vanhat sivupalkin kohdat, jotka eivät ole työtiloja: minne ne ovat siirtyneet */
  var VANHAT_KOHDAT = { 'Arvioi harjoitus': 'Kodin pikatoiminto', 'Aloita tästä': 'Koti · aloitusopas', 'Pelihavainto': 'Työkalut', 'Bio-banding': 'Työkalut', 'Taktiikkataulu': 'Työkalut', 'Ohjelmakirjasto': 'Työkalut', 'Jaksofokus': 'Tilanne', 'Seuranta': 'Tilanne', 'Raportointi': 'Tilanne', 'Ryhmät': 'Joukkueet ja ryhmät', 'Pelaajat': 'Joukkueet ja ryhmät' };

  function tmNaviReitti(ws, nakyma) {
    var r = REITIT[ws];
    if (r) return { ws: r.ws, nakyma: r.nakyma || nakyma || null, avaa: r.avaa || null, vanha: ws };
    return { ws: ws, nakyma: ws === 'joukkueet' ? (nakyma || 'pelaajat') : (nakyma || null), avaa: null, vanha: ws };
  }
  function tmNaviNimiAvain(ws) {
    var kaikki = PAIVITTAIN.concat(PORAUTUMINEN), i;
    for (i = 0; i < kaikki.length; i++) if (kaikki[i].ws === ws) return kaikki[i].avain;
    for (i = 0; i < TYOKALUT.length; i++) if (TYOKALUT[i].ws === ws) return TYOKALUT[i].avain;
    return ws === 'asetukset' ? ASETUKSET.avain : null;
  }

  /* ── sivupalkki ── */
  function tmNaviSivupalkkiHTML(opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), laskurit = opts.laskurit || {}, aktiivinen = opts.aktiivinen || 'koti';
    var kohta = function (k) {
      var n = k.laskuri ? laskurit[k.laskuri] : 0, badge = k.laskuri ? '<b class="sb-badge ' + (k.laskuri === 'tilanne' ? 'n' : 'amber') + '" id="nv-badge-' + k.laskuri + '"' + (n > 0 ? '' : ' style="display:none"') + '>' + (n > 0 ? esc(n) : '') + '</b>' : '';
      return '<div class="nv-i' + (aktiivinen === k.ws ? ' on' : '') + '" data-nv="' + k.ws + '" role="link" tabindex="0" onclick="setWs(\'' + k.ws + '\')"><i aria-hidden="true">' + k.ikoni + '</i><span>' + esc(t(k.avain)) + '</span>' + badge + '</div>';
    };
    return PAIVITTAIN.map(kohta).join('') + '<div class="nv-sep"></div>' + PORAUTUMINEN.map(kohta).join('')
      + '<details class="nv-tyo"><summary class="kt-eb">' + esc(t('Työkalut')) + ' <span class="nv-mono">' + TYOKALUT.length + '</span></summary>'
      + TYOKALUT.map(function (k) { return '<div class="nv-i sm" role="link" tabindex="0" onclick="' + esc(k.fn) + '">' + esc(t(k.avain)) + '</div>'; }).join('') + '</details>';
  }
  function tmNaviTabbarHTML(opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), aktiivinen = opts.aktiivinen || 'koti';
    return TABBAR.map(function (k) { return '<button class="tabbar-item' + (aktiivinen === k.ws ? ' active' : '') + '" data-ws="' + k.ws + '" onclick="setWs(\'' + k.ws + '\')"><span class="tb-ic" aria-hidden="true">' + k.ikoni + '</span><span class="tb-lbl">' + esc(t(k.avain)) + '</span></button>'; }).join('');
  }
  /* Joukkueet ja ryhmät -sivun välilehdet (väliaikainen kunnes PR 3 rakentaa oman sivun): Joukkueet · Ryhmät */
  function tmNaviValilehdetHTML(nakyma, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts);
    return '<div class="nv-seg"><button type="button" class="' + (nakyma !== 'ryhmat' ? 'on' : '') + '" onclick="setWs(\'joukkueet\',\'pelaajat\')">' + esc(t('Joukkueet')) + '</button><button type="button" class="' + (nakyma === 'ryhmat' ? 'on' : '') + '" onclick="setWs(\'joukkueet\',\'ryhmat\')">' + esc(t('Ryhmät')) + '</button></div>';
  }
  /* Kodin pikatoiminnot (mockup 25 .quick) → tm_seuran_pulssi opts.pika */
  function tmNaviPikatoiminnot() {
    return [{ teksti: '+ Arvioi harjoitus', fn: 'vpAvaaHarjoitusarviointi' }, { teksti: '+ Kirjaa mentorointi', fn: '_vpPikaMentorointi' }, { teksti: '+ Uusi tapahtuma', fn: '_vpPikaTapahtuma' }];
  }

  /* ── Viestit v0: VP:n henkilökuntaviestit ── */
  var EI_HENKILOKUNTA_TYYPIT = { klippi: 1, klippi_vastaus: 1, klippi_kuittaus: 1 };
  function onHenkilokuntaViesti(d) {
    if (!d) return false;
    var tyyppi = d.tyyppi == null ? '' : String(d.tyyppi), nak = d.nakyvyys == null ? 'henkilokunta' : String(d.nakyvyys);
    if (EI_HENKILOKUNTA_TYYPIT[tyyppi]) return false;
    return nak !== 'pelaaja' && nak !== 'huoltaja';   // pelaajalle/huoltajalle näkyvät (perheviestit) eivät kuulu henkilökunnan Viestit-listaan
  }
  function tmViestitRivit(docs, uid, nimiFn) {
    var nahty = {}, ulos = [];
    (Array.isArray(docs) ? docs : []).forEach(function (d) {
      if (!d || !uid || !onHenkilokuntaViesti(d)) return;
      var lahettaja = d.lahettajaUid || d.from || null, vastaanottaja = d.vastaanottajaUid || d.to || null;
      if (lahettaja !== uid && vastaanottaja !== uid) return;
      var id = d.id || (lahettaja + '|' + vastaanottaja + '|' + _ms(d.aika || d.luotu)); if (nahty[id]) return; nahty[id] = 1;
      var saapunut = vastaanottaja === uid, osapuoli = saapunut ? lahettaja : vastaanottaja;
      ulos.push({ id: d.id || null, saapunut: saapunut, osapuoli: osapuoli, nimi: (nimiFn && nimiFn(osapuoli, d)) || null, teksti: String(d.teksti == null ? '' : d.teksti), ms: _ms(d.aika || d.luotu), lukematon: saapunut && d.luettu !== true });
    });
    return ulos.sort(function (a, b) { return (b.ms || 0) - (a.ms || 0); });
  }
  function tmViestitLukemattomat(rivit) { return (Array.isArray(rivit) ? rivit : []).filter(function (r) { return r.lukematon; }).length; }
  function _aika(ms, nytMs) {
    if (ms == null) return '';
    try {
      var h = function (o) { return new Intl.DateTimeFormat('fi-FI', Object.assign({ timeZone: 'Europe/Helsinki' }, o)).format(new Date(ms)); };
      var sama = nytMs != null && h({ year: 'numeric', month: 'numeric', day: 'numeric' }) === new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', year: 'numeric', month: 'numeric', day: 'numeric' }).format(new Date(nytMs));
      return sama ? h({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) : h({ day: 'numeric', month: 'numeric' }).replace(/\.?$/, '.');
    } catch (e) { return ''; }
  }
  function tmViestitHTML(rivit, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {}, nyt = opts.nytMs != null ? opts.nytMs : Date.now(), R = Array.isArray(rivit) ? rivit : [], n = tmViestitLukemattomat(R), h = '';
    h += '<span class="kt-eb">' + esc(n ? _fill(t('Viestit · {n} lukematonta'), { n: n }) : t('Viestit')) + '</span>';
    if (!R.length) h += '<div class="kt-note" style="margin-top:6px">' + esc(t('Ei henkilökuntaviestejä vielä.')) + '</div>';
    else h += '<div class="kt-vl">' + R.slice(0, 50).map(function (r) {
      var lyhyt = r.teksti.length > 140 ? r.teksti.slice(0, 137) + '…' : r.teksti, nimi = r.nimi || t('Valmentaja');
      return '<div class="kt-vr"><span class="kt-dot ' + (r.lukematon ? 'w' : 'n') + '">' + (r.lukematon ? '●' : '○') + '</span><span class="kt-vt"><b>' + esc(nimi) + '</b><span class="kt-tag">' + esc(t(r.saapunut ? 'saapunut' : 'lähetetty')) + '</span>' + esc(lyhyt) + '<span class="kt-vm">' + esc(_aika(r.ms, nyt)) + '</span></span>'
        + (fn.avaa && r.osapuoli ? '<button class="kt-gb' + (r.lukematon ? ' p' : '') + '" type="button" onclick="' + esc(fn.avaa) + '(\'' + String(r.osapuoli).replace(/[^\w-]/g, '') + '\',\'' + String(r.id || '').replace(/[^\w-]/g, '') + '\')">' + esc(t(r.saapunut ? 'Vastaa' : 'Avaa')) + '</button>' : '<span></span>') + '</div>';
    }).join('') + '</div>';
    h += '<div class="kt-vm" style="margin-top:8px">' + esc(t('Henkilökunnan viestit. Asiat ja ketjut tulevat tammikuussa.')) + '</div>';
    return '<div class="nv-wrap">' + h + '</div>';
  }

  /* ── CSS (mockup 25 .snav/.sb-i/.sb-tyo/.tbar; vain olemassa olevat tokenit) ── */
  var CSS = [
    '#sidebar.navi3>.sb-section-label,#sidebar.navi3>.sb-item,#sidebar.navi3>.sb-divider{display:none}#sbNavUusi{display:none}#sidebar.navi3 #sbNavUusi{display:grid;gap:2px;padding:6px 8px 0}',
    '.nv-i{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:4px;color:var(--ink2);font-size:var(--fs-body,14px);cursor:pointer;user-select:none}.nv-i:hover{background:var(--ov-1)}',
    '.nv-i i{font-style:normal;width:16px;text-align:center;color:var(--ink3)}',
    '.nv-i.on{background:color-mix(in srgb,var(--teal) 16%,transparent);color:var(--ink);font-weight:600;box-shadow:inset 2px 0 0 var(--teal)}.nv-i.on i{color:var(--teal)}',
    '.nv-i .sb-badge{font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:400}',
    '.nv-i .sb-badge.n{background:var(--ov-3);color:var(--ink)}',
    '.nv-i.sm{font-size:var(--fs-meta,12.5px);padding:5px 10px 5px 36px;color:var(--ink3)}',
    '.nv-sep{height:1px;background:var(--border);margin:8px 6px}',
    '.nv-tyo{margin-top:8px;border-top:1px solid var(--border);padding-top:6px}.nv-tyo summary{list-style:none;cursor:pointer;padding:7px 10px;color:var(--ink3);display:flex;justify-content:space-between}.nv-tyo summary::-webkit-details-marker{display:none}.nv-mono{font-family:var(--font-sans)}',
    '.nv-wrap{container-type:inline-size;display:grid;gap:8px;font-family:var(--font-sans);color:var(--ink)}',
    '.nv-seg{display:flex;gap:6px;margin:0 0 14px}.nv-seg button{background:none;border:1px solid var(--border);border-radius:4px;padding:5px 12px;font:inherit;font-size:var(--fs-body,14px);font-weight:600;color:var(--ink2);cursor:pointer}.nv-seg button.on{color:var(--teal);border-color:var(--teal-brd);background:color-mix(in srgb,var(--teal) 16%,transparent)}',
    '.tabbar-item .tb-ic{font-style:normal}'
  ].join('\n');

  var API = { CSS: CSS, PAIVITTAIN: PAIVITTAIN, PORAUTUMINEN: PORAUTUMINEN, TYOKALUT: TYOKALUT, TABBAR: TABBAR, REITIT: REITIT, PYSYVAT: PYSYVAT, VANHAT_KOHDAT: VANHAT_KOHDAT,
    tmNaviReitti: tmNaviReitti, tmNaviNimiAvain: tmNaviNimiAvain, tmNaviSivupalkkiHTML: tmNaviSivupalkkiHTML, tmNaviTabbarHTML: tmNaviTabbarHTML, tmNaviPikatoiminnot: tmNaviPikatoiminnot, tmNaviValilehdetHTML: tmNaviValilehdetHTML,
    onHenkilokuntaViesti: onHenkilokuntaViesti, tmViestitRivit: tmViestitRivit, tmViestitLukemattomat: tmViestitLukemattomat, tmViestitHTML: tmViestitHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_VP_NAVI = API;
})(typeof window !== 'undefined' ? window : null);
