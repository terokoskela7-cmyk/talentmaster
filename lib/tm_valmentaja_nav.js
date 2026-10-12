/* ════════════════════════════════════════════════════════════════════════
   tm_valmentaja_nav.js — V-KOTI PR B · valmentajan Navigaatio v2 (D243/D244) lipun `liput.valmentaja_v2` takana. Dual-export (Node + selain): window.TM_VALMENTAJA_NAV.
   Ilman lippua EI tee mitään (vanha navigaatio täysin ennallaan). Kuoressa vain kytkentä: tmNavAsenna(...) alustuksessa, tmNavReitti/tmNavPiirra setWs:ssä, tmNavBadge inboxissa.
   PURE-osat: tmNavMalli(a) → { vasen, pelaajat, tyokalut, valilehdet, mobiili, alareuna } · tmNavHTML(m, C) → { sivu, valilehdet, plus, mobiili, viesti } · tmNavReitti(id) → { ws, toiminto?, valilehti? } · tmRyhmatHTML(ryhmat, jasenet, C) · tmNavCSS().
   DOM-osa: tmNavAsenna({ db, seuraId, doc?, win?, ryhmia(): Promise<bool>, ws(): string, t? }) → Promise<bool> (lippu päällä). Työkalut auki/kiinni localStorageen (try/catch).
   Rakenne: Koti · Viestit (badge) · Kalenteri · Joukkue (välilehdet Tilanne = pulse · Kausi ja jaksot = season) | Pelaajat (kehitystyöpöytä: lista → kortti → kehitys) · Ryhmät (vain jos omia ryhmiä) | Työkalut ▸ (6, suljettu oletuksena).
   "+ Havainto" -pääpainike joka näkymässä (desktop: yläreuna; mobiili: alapalkin keskellä). Mobiili < 800 px: alapalkki Koti · Kalenteri · + · Pelaajat · Valikko; Viestit yläkulmassa; Valikko = drawer (Joukkue + Ryhmät + Työkalut + asetukset).
   Vanhat työtila-id:t ohjautuvat (tmNavReitti): today → koti · pulse → joukkue/tilanne · season → joukkue/kausi · dev/kehitys → pelaajat · havainnot → koti + havaintomodaali. Ei hex-värejä (tokenit), ei emojeja.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _e(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var AVAIN = 'tm_valmentaja_nav_tyokalut';
  /* toiminto-id → onclick (vakioita; ei käyttäjädataa) */
  var TOIM = { koti: "setWs('koti')", viestit: "setWs('inbox')", kalenteri: "setWs('cal')", joukkue: "setWs('pulse')", tilanne: "setWs('pulse')", kausi: "setWs('season')", pelaajat: "setWs('dev')", ryhmat: "setWs('ryhmat')",
    testit: "setWs('testit')", kuorma: "setWs('kuorma')", taktiikka: 'avaaKaaviopankki()', havainto: "openDrill('adar')", itsearvio: 'avaaHarjoitusarviointi()', kehittyminen: 'avaaValmentajaKehitys()', asetukset: 'avaaCoachProfiili()', valikko: 'toggleTyokalut()' };
  /* vanha työtila-id → uusi reitti */
  var REITIT = { koti: { ws: 'koti' }, today: { ws: 'koti' }, havainnot: { ws: 'koti', toiminto: 'havainto' }, inbox: { ws: 'inbox' }, pulse: { ws: 'pulse', valilehti: 'tilanne' }, season: { ws: 'season', valilehti: 'kausi' },
    dev: { ws: 'dev' }, kehitys: { ws: 'dev' }, cal: { ws: 'cal' }, testit: { ws: 'testit' }, kuorma: { ws: 'kuorma' }, ryhmat: { ws: 'ryhmat' } };
  /* ws → merkittävä valikkokohta */
  var AKT = { koti: 'koti', inbox: 'viestit', cal: 'kalenteri', pulse: 'joukkue', season: 'joukkue', dev: 'pelaajat', ryhmat: 'ryhmat', testit: 'testit', kuorma: 'kuorma' };
  var IKONI = { koti: 'ic-home', viestit: 'ic-inbox', kalenteri: 'ic-cal', joukkue: 'ic-pulse', pelaajat: 'ic-dev', ryhmat: 'ic-obs', testit: 'ic-test', kuorma: 'ic-drill', taktiikka: 'ic-drill', havainto: 'ic-obs', itsearvio: 'ic-drill', kehittyminen: 'ic-home', asetukset: 'ic-home' };

  function tmNavReitti(id) { var r = REITIT[String(id)]; return r ? { ws: r.ws, toiminto: r.toiminto || null, valilehti: r.valilehti || null } : { ws: 'koti', toiminto: null, valilehti: null }; }
  function tmNavLippu(julkiset, seuraDoc) {   // vain täsmälleen true (kuten liput.kentta); liput/julkiset voittaa vanhan seurat.liput-kentän kun siinä on boolean
    if (julkiset && typeof julkiset === 'object' && typeof julkiset.valmentaja_v2 === 'boolean') return julkiset.valmentaja_v2;
    return !!(seuraDoc && seuraDoc.liput && seuraDoc.liput.valmentaja_v2 === true);
  }

  function tmNavMalli(a) {
    a = a || {}; var ws = a.ws || 'koti', akt = AKT[ws] || null, n = +a.lukemattomat || 0, it = function (id, teksti, extra) { return Object.assign({ id: id, teksti: teksti, toiminto: id, aktiivinen: akt === id }, extra || {}); };
    var tyokalut = [it('testit', 'Testit'), it('kuorma', 'Kuorma ja fiilis'), it('taktiikka', 'Taktiikkataulu', { aktiivinen: false }), it('havainto', 'Uusi havainto', { aktiivinen: false }), it('itsearvio', 'Itsearvio', { aktiivinen: false }), it('kehittyminen', 'Valmentajana kehittyminen', { aktiivinen: false })];
    return {
      vasen: [it('koti', 'Koti', { desk: true }), it('viestit', 'Viestit', { badge: n, desk: true }), it('kalenteri', 'Kalenteri', { desk: true }), it('joukkue', 'Joukkue')],
      pelaajat: [it('pelaajat', 'Pelaajat', { desk: true })].concat(a.ryhmia ? [it('ryhmat', 'Ryhmät')] : []),
      tyokalut: { auki: !!a.tyokalutAuki || tyokalut.some(function (x) { return x.aktiivinen; }), rivit: tyokalut },
      valilehdet: ws === 'pulse' || ws === 'season' ? [{ id: 'tilanne', teksti: 'Tilanne', toiminto: 'tilanne', aktiivinen: ws === 'pulse' }, { id: 'kausi', teksti: 'Kausi ja jaksot', toiminto: 'kausi', aktiivinen: ws === 'season' }] : null,
      mobiili: [it('koti', 'Koti'), it('kalenteri', 'Kalenteri'), { id: 'havainto', teksti: 'Havainto', toiminto: 'havainto', plus: true }, it('pelaajat', 'Pelaajat'), { id: 'valikko', teksti: 'Valikko', toiminto: 'valikko', aktiivinen: false }],
      viestit: { badge: n, aktiivinen: akt === 'viestit' },
      alareuna: [{ id: 'asetukset', teksti: 'Asetukset', toiminto: 'asetukset' }]
    };
  }

  function _ik(id) { return IKONI[id] ? '<svg width="16" height="16"><use href="#' + IKONI[id] + '"/></svg>' : ''; }
  function _badge(n) { return n ? '<span class="nv-badge">' + _e(n) + '</span>' : ''; }
  function tmNavHTML(m, C) {
    var t = (C && C.t) || function (x) { return x; };
    var rivi = function (x) { return '<div class="nv-item' + (x.aktiivinen ? ' active' : '') + (x.desk ? ' nv-desk' : '') + '" data-nv="' + _e(x.id) + '" onclick="' + _e(TOIM[x.toiminto]) + '">' + _ik(x.id) + '<span>' + _e(t(x.teksti)) + '</span>' + _badge(x.badge) + '</div>'; };
    var ty = m.tyokalut;
    var sivu = '<div class="nv">' + m.vasen.map(rivi).join('') + '<div class="nv-jako"></div>'
      + m.pelaajat.map(rivi).join('') + '<div class="nv-jako"></div>'
      + '<div class="nv-otsikko' + (ty.auki ? ' auki' : '') + '" data-nv-tyokalut="1" onclick="TM_VALMENTAJA_NAV.tmNavTyokalut()"><span>' + _e(t('Työkalut')) + ' (' + ty.rivit.length + ')</span><span class="nv-nuoli">&#9656;</span></div>'
      + (ty.auki ? '<div class="nv-tyokalut">' + ty.rivit.map(rivi).join('') + '</div>' : '')
      + '<div class="nv-jako"></div>' + m.alareuna.map(rivi).join('') + '</div>';
    var valilehdet = m.valilehdet ? '<div class="nv-valilehdet" role="tablist">' + m.valilehdet.map(function (x) { return '<button type="button" role="tab" class="nv-v' + (x.aktiivinen ? ' on' : '') + '" data-nv-v="' + x.id + '" onclick="' + _e(TOIM[x.toiminto]) + '">' + _e(t(x.teksti)) + '</button>'; }).join('') + '</div>' : '';
    var plus = '<button type="button" class="nv-plus" data-nv-plus="1" onclick="' + _e(TOIM.havainto) + '">+ ' + _e(t('Havainto')) + '</button>';
    var mobiili = m.mobiili.map(function (x) { return x.plus ? '<button type="button" class="nv-mplus" aria-label="' + _e(t('Uusi havainto')) + '" onclick="' + _e(TOIM[x.toiminto]) + '">+</button>'
      : '<button type="button" class="nv-mitem' + (x.aktiivinen ? ' active' : '') + '" data-nv="' + _e(x.id) + '" onclick="' + _e(TOIM[x.toiminto]) + '"><span class="nv-ml">' + _e(t(x.teksti)) + '</span></button>'; }).join('');
    var viesti = '<button type="button" class="nv-mviesti' + (m.viestit.aktiivinen ? ' active' : '') + '" aria-label="' + _e(t('Viestit')) + '" onclick="' + _e(TOIM.viestit) + '">' + _ik('viestit') + _badge(m.viestit.badge) + '</button>';
    return { sivu: sivu, valilehdet: valilehdet, plus: plus, mobiili: mobiili, viesti: viesti };
  }

  /* Ryhmät-näkymä: omat ryhmät + jäsenet (jasenet: { ryhmaId: [{id,nimi}] }); jäsen avaa pelaajan Pelaajat-osiossa */
  function tmRyhmatHTML(ryhmat, jasenet, C) {
    var t = (C && C.t) || function (x) { return x; }; ryhmat = ryhmat || []; jasenet = jasenet || {};
    if (!ryhmat.length) return '<div class="nv-ryhma"><div class="nv-ryhma-tyhja">' + _e(t('Sinulla ei ole ryhmiä.')) + '</div></div>';
    return ryhmat.map(function (r) {
      var j = jasenet[r.id] || [];
      return '<div class="nv-ryhma"><div class="nv-ryhma-nimi">' + _e(r.nimi || '') + '</div><div class="nv-ryhma-meta">' + _e(j.length + ' ' + t('pelaajaa') + (r.tyyppi === 'saanto' ? ' · ' + t('sääntöryhmä') : '')) + '</div>'
        + '<div class="nv-chips">' + j.map(function (p) { return '<button type="button" class="nv-chip" onclick="pickPlayer(\'' + _e(String(p.id).replace(/'/g, '')) + '\');setWs(\'dev\')">' + _e(p.nimi) + '</button>'; }).join('') + '</div></div>';
    }).join('');
  }

  var CSS = '.nav-v2 .wsbar,.nav-v2 #mobTabbar,.nav-v2 #coachSelfCard{display:none!important}.nav-v2 .sb-nav>:not(select){display:none!important}.nav-v2 .sb-nav:not(:has(select)){display:none!important}.nav-v2 .sb-nav{flex:0 0 auto;padding-bottom:0}.nav-v2 .sidebar:has(.sb-nav select) .sb-seura{display:none}.nav-v2 .nv{display:flex;flex-direction:column;gap:2px;padding:6px 8px}'
    + '.nv-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;color:var(--ink2);font-size:14px;cursor:pointer}.nv-item:hover{background:var(--card);color:var(--ink)}.nv-item.active{background:var(--teal-bg,var(--teal-dim));color:var(--teal)}.nv-item svg{opacity:.7;flex-shrink:0}'
    + '.nv-jako{height:1px;background:var(--line,var(--border));margin:8px 4px}.nv-otsikko{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;color:var(--ink3);font-size:12px;letter-spacing:.08em;text-transform:uppercase;cursor:pointer}.nv-otsikko.auki .nv-nuoli{transform:rotate(90deg)}.nv-nuoli{display:inline-block;transition:transform .15s}'
    + '.nv-tyokalut .nv-item{padding-left:22px}.nv-badge{margin-left:auto;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--teal);color:var(--on-accent,var(--bg));font-size:11px;display:inline-flex;align-items:center;justify-content:center}'
    + '.nv-valilehdet{display:flex;gap:6px;margin:0 0 14px;border-bottom:1px solid var(--line,var(--border))}.nv-v{background:none;border:0;border-bottom:2px solid transparent;color:var(--ink3);font-size:14px;padding:8px 12px;cursor:pointer}.nv-v.on{color:var(--ink);border-bottom-color:var(--teal)}'
    + '.nv-plus{background:var(--teal);color:var(--on-accent,var(--bg));border:0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;cursor:pointer;margin-right:10px}.h-top{align-items:center}.nv-hosts-plus{display:flex;align-items:center;margin-left:auto}'
    + '.nv-mob,.nv-mviesti{display:none}.nv-ryhma{background:var(--card);border:1px solid var(--line,var(--border));border-radius:10px;padding:14px 16px;margin-bottom:12px}.nv-ryhma-nimi{font-size:16px;color:var(--ink)}.nv-ryhma-meta,.nv-ryhma-tyhja{font-size:13px;color:var(--ink2);margin:2px 0 8px}.nv-chips{display:flex;flex-wrap:wrap;gap:6px}.nv-chip{background:transparent;border:1px solid var(--line,var(--border));color:var(--ink);border-radius:999px;padding:5px 12px;font-size:13px;cursor:pointer}'
    + '@media (max-width:799px){.nav-v2 .sb-bot{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}.nav-v2 .nv-desk{display:none}.nav-v2 .nav-burger,.nav-v2 .cmd-btn{display:none!important}.nav-v2 .sidebar{display:flex;position:fixed;inset:0 auto 0 0;width:264px;max-width:84vw;z-index:200;transform:translateX(-100%);transition:transform .25s}.nav-v2.nav-drawer-open .sidebar{transform:translateX(0)}.nav-v2.nav-drawer-open .sb-backdrop{display:block;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:199}'
    + '.nav-v2 .nv-plus{display:none}.nav-v2 .main{padding-top:58px;padding-bottom:84px}.nav-v2 .nv-mob{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:150;background:var(--bg2);border-top:.5px solid var(--line,var(--border));padding:4px 4px calc(4px + env(safe-area-inset-bottom,0px));align-items:flex-end}'
    + '.nv-mitem{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:52px;background:none;border:0;color:var(--ink3);cursor:pointer;font-size:11px}.nv-mitem.active{color:var(--teal)}.nv-mplus{flex:0 0 58px;width:58px;height:58px;margin:-18px 6px 2px;border-radius:50%;background:var(--teal);color:var(--on-accent,var(--bg));border:0;font-size:32px;line-height:1;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.35)}'
    + '.nav-v2 .nv-mviesti{display:inline-flex;position:fixed;top:10px;right:12px;z-index:160;width:44px;height:44px;align-items:center;justify-content:center;background:var(--bg2);border:1px solid var(--line,var(--border));border-radius:50%;color:var(--ink)}.nv-mviesti .nv-badge{position:absolute;top:-2px;right:-2px;margin:0}}';

  /* ── DOM-osa ── */
  var tila = null;
  function _lue(k) { try { return root.localStorage && root.localStorage.getItem(k); } catch (e) { return null; } }
  function _kirj(k, v) { try { root.localStorage && root.localStorage.setItem(k, v); } catch (e) { /* ei tallennusta */ } }
  function _aseta(doc, id, luokka, isanta, ennen, html) {
    var el = doc.getElementById(id);
    if (!el) { el = doc.createElement('div'); el.id = id; if (luokka) el.className = luokka; if (ennen && ennen.parentNode) ennen.parentNode.insertBefore(el, ennen); else isanta.appendChild(el); }
    el.innerHTML = html; return el;
  }
  function tmNavPiirra(ws) {
    if (!tila) return; if (ws) tila.ws = ws; var d = tila.doc, m = tmNavMalli({ ws: tila.ws, lukemattomat: tila.badge, ryhmia: tila.ryhmia, tyokalutAuki: tila.auki }), h = tmNavHTML(m, { t: tila.t });
    var side = d.getElementById('sidebar'), nav = side && side.querySelector('.sb-nav'), main = d.querySelector('.main'), htop = d.querySelector('.h-top'), wsbar = d.querySelector('.wsbar');
    if (side) _aseta(d, 'nvSide', '', side, nav ? nav.nextSibling : null, h.sivu);
    if (main) _aseta(d, 'nvTabs', '', main, wsbar ? wsbar.nextSibling : main.firstChild, h.valilehdet);
    if (htop) { _aseta(d, 'nvPlus', 'nv-hosts-plus', htop, htop.lastElementChild, h.plus); }
    _aseta(d, 'nvMob', 'nv-mob', d.body, null, h.mobiili); _aseta(d, 'nvViesti', '', d.body, null, h.viesti);
  }
  /* V-KOTI B live #3: Esc sulkee havaintomodaalin (valinta + upotettu pikakortti; pikakentät päivittyvät window._pkSulje:n kautta) ja fokus palaa "+ Havainto" -painikkeeseen. → true jos jotain suljettiin. */
  function tmNavPalautaFokus(doc) {
    doc = doc || (tila && tila.doc) || (typeof document !== 'undefined' ? document : null); if (!doc) return false;
    var nap = doc.querySelectorAll('.nv-plus, .nv-mplus');
    for (var i = 0; i < nap.length; i++) { if (nap[i].offsetParent !== null || (nap[i].getClientRects && nap[i].getClientRects().length)) { nap[i].focus(); return true; } }
    return false;
  }
  function tmNavHavaintoEsc(doc, win) {
    doc = doc || (typeof document !== 'undefined' ? document : null); if (!doc) return false;
    var pk = doc.getElementById('_pkModal'), v = doc.getElementById('_tmPhValinta'); if (!pk && !v) return false;
    if (pk) { if (win && typeof win._pkSulje === 'function') win._pkSulje(); else pk.remove(); }
    if (v && v.parentNode) v.parentNode.removeChild(v);
    if (tila) tmNavPalautaFokus(doc); return true;
  }
  function tmNavTyokalut() { if (!tila) return; tila.auki = !tila.auki; _kirj(AVAIN, tila.auki ? '1' : '0'); tmNavPiirra(); }
  function tmNavBadge(n) { if (!tila) return; tila.badge = +n || 0; tmNavPiirra(); }
  function tmNavAsenna(o) {
    var doc = o.doc || (typeof document !== 'undefined' ? document : null), db = o.db, sid = o.seuraId;
    if (!doc || !db || !sid) return Promise.resolve(false);
    var ref = db.collection('seurat').doc(sid), lue = function (p) { return Promise.resolve().then(function () { return p(); }).then(function (s) { return s && s.exists ? s.data() : null; }, function () { return null; }); };   // lukuvirhe/puuttuva → null → lippu pois
    return Promise.all([lue(function () { return ref.collection('liput').doc('julkiset').get(); }), lue(function () { return ref.get(); })]).then(function (r) {
      if (!tmNavLippu(r[0], r[1])) return false;
      return Promise.resolve(o.ryhmia ? o.ryhmia() : false).then(function (ry) { return ry; }, function () { return false; }).then(function (ry) {
        if (!doc.getElementById('nvCss')) { var st = doc.createElement('style'); st.id = 'nvCss'; st.textContent = CSS; doc.head.appendChild(st); }
        var mainEl = doc.querySelector('.main'); if (mainEl && !doc.querySelector('[data-view="ryhmat"]')) { var v = doc.createElement('div'); v.className = 'ws-view'; v.setAttribute('data-view', 'ryhmat'); v.innerHTML = '<div id="ryhmatView"></div>'; mainEl.appendChild(v); }
        doc.body.classList.add('nav-v2'); tila = { doc: doc, t: o.t, ws: (o.ws && o.ws()) || 'koti', badge: 0, ryhmia: !!ry, auki: _lue(AVAIN) === '1' }; tmNavPiirra(); var sb = doc.getElementById('sidebar'); if (sb) sb.addEventListener('click', function (ev) { var i = ev.target.closest && ev.target.closest('.nv-item'); if (i) doc.body.classList.remove('nav-drawer-open'); }); return true;
      });
    });
  }
  function _tyhjenna() { tila = null; }
  var API = { tmNavLippu: tmNavLippu, tmNavMalli: tmNavMalli, tmNavHTML: tmNavHTML, tmNavReitti: tmNavReitti, tmRyhmatHTML: tmRyhmatHTML, tmNavCSS: function () { return CSS; }, tmNavAsenna: tmNavAsenna, tmNavPiirra: tmNavPiirra, tmNavHavaintoEsc: tmNavHavaintoEsc, tmNavPalautaFokus: tmNavPalautaFokus, tmNavTyokalut: tmNavTyokalut, tmNavBadge: tmNavBadge, TOIM: TOIM, REITIT: REITIT, _tyhjenna: _tyhjenna };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_VALMENTAJA_NAV = API;
})(typeof window !== 'undefined' ? window : null);
