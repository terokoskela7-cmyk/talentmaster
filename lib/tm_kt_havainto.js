/* ════════════════════════════════════════════════════════════════════════
   tm_kt_havainto.js — kehitystyöpöytä 22 · B2 (D100): viikkohavainto YHDELLÄ NAPAUTUKSELLA + "Tallennettu · Kumoa" (5 s) + lyhyt alasheet lauseelle ja VEO-linkille. PURE (HTML-merkkijonot + validointi). Dual-export: module.exports || window.TM_KT_HAVAINTO.
   Kirjoitus kulkee ennallaan lib/tm_kehitystyopoyta.js tmKtTallennaOsaArvio:n kautta (oma rivi osa_havainnot.<konsepti>.<koodi>.<uid> = { arvo, pvm, rooli [, lause] }; VP ei korvaa valmentajan arviota).
   · tmKtHavaintoInlineHTML(d, c)   → kolme nappia suoraan signaalikortissa (Ei vielä · Ohjatusti · Itsenäisesti; napautus tallentaa) + "+ Lause tai klippi" (avaa alasheetin) + ohjerivi. d: { osa:{k,koodi,nimi,havainnot}, avain, uid }, c: { esc, t, pid, tallennaFn, lisaFn }
   · tmKtHavaintoSheetHTML(d, c)    → alasheetin runko: osa, valinta (radio), lause (≤ 140, valinnainen), VEO-linkki, Tallenna. c: { esc, t, pid, tallennaFn (pid, avain, koodi), veoFn }. Kentät: name=ktHavArvo · #ktHavLause
   · tmKtHavaintoLukuSheetista(lue) → { arvo, lause } luettuna lomakkeen kentistä (lue(nimi) → merkkijono)
   · tmKtLauseKelpaa(lause)         → { ok, syy } — enintään 140 merkkiä; KIELLETYT-portti varmuuden vuoksi (K1b 20.10.: lause on henkilökunnan sisäinen eikä näy pelaajalle eikä huoltajalle millään UI-reitillä; portti pidetään)
   · tmKtKumoaToast(t, viesti)      → { teksti, kumoa } toastin tekstit ("Tallennettu · Kumoa")
   · tmKtToastAjastin(el, ms, valmis, ajastus?) → toastin 5 s ajastin, joka PYSÄHTYY kun hiiri on toastin päällä TAI kosketus/fokus on toastin sisällä (esim. Kumoa-nappi) ja jatkuu täydet ms poistuttaessa (B2b; a11y: aikarajaa ei voi ohittaa vahingossa). ajastus = { set, clear } testejä varten. Palauttaa { pysayta(), jatka(), peru() }
   Ei hex-värejä (luokat tm_kt_komponentit.js:stä); kaikki teksti c.t:n läpi, fi-oletukset tässä.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var MAX_LAUSE = 140, TILAT = [['kt_v_ei_viela', 1], ['kt_v_ohjatusti', 2], ['kt_v_itsenaisesti', 3]];
  var FI = {
    kt_h_lisaa: '+ Lause tai klippi', kt_h_yksi_napautus: 'Yksi napautus tallentaa. Lause ja VEO-linkki avaavat lyhyen alasheetin.', kt_h_otsikko: 'Viikkohavainto', kt_h_valinta: 'Näkyikö osa harjoituksissa?', kt_h_lause: 'Lause (valinnainen)', kt_h_lause_ohje: 'Enintään 140 merkkiä. Vain henkilökunta näkee tämän.', kt_viikon_fokus: 'Tämän viikon fokus', kt_viikon_fokus_asetettu: 'Tämän viikon fokus asetettu ✓',
    kt_h_tallenna: 'Tallenna', kt_h_valitse_ensin: 'Valitse ensin, näkyikö osa.', kt_h_lause_pitka: 'Lause on liian pitkä (enintään 140 merkkiä).', kt_h_lause_kielletty: 'Lauseessa on sana, jota ei käytetä pelaajalle näkyvässä tekstissä: ', kt_h_tallennettu: 'Tallennettu', kt_h_kumoa: 'Kumoa', kt_h_kumottu: 'Kumottu', kt_v_ei_viela: 'Ei vielä', kt_v_ohjatusti: 'Ohjatusti', kt_v_itsenaisesti: 'Itsenäisesti', kt_h_veo: '+ Liitä VEO-linkki'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _fn(esc, nimi, args) { if (!nimi || args.some(function (a) { return a == null || a === ''; })) throw new Error('tmKtHavainto: onclick-argumentti puuttuu (' + nimi + ')'); return esc(nimi + '(' + args.map(function (a) { return JSON.stringify(a); }).join(',') + ')'); }
  function _oma(osa, uid) { return ((osa && osa.havainnot) || []).filter(function (x) { return uid && x.uid === uid; })[0] || null; }

  function tmKtHavaintoInlineHTML(d, c) {
    d = d || {}; c = c || {}; var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, o = d.osa, oma = _oma(o, d.uid);
    if (!o) return '';
    return '<div class="kt-pan kt-pan-inline" data-kt-havainto-inline><div class="kt-pan-opts">' + TILAT.map(function (a) {
      return '<button type="button" class="kt-btn' + (oma && oma.arvo === a[1] ? '' : ' q') + '" data-kt-havainto-arvo="' + a[1] + '" onclick="' + _fn(esc, c.tallennaFn, [c.pid, d.avain, o.koodi, a[1]]) + '">' + esc(t(a[0])) + '</button>'; }).join('')
      + '<button type="button" class="kt-btn g" data-kt-havainto-lisaa data-ts-avaaja="havainto_' + esc(c.pid) + '_' + esc(o.koodi) + '" onclick="' + _fn(esc, c.lisaFn, [c.pid, o.koodi]) + '">' + esc(t('kt_h_lisaa')) + '</button></div>'
      + '<div class="kt-meta">' + esc(t('kt_h_yksi_napautus')) + '</div></div>';
  }

  function tmKtHavaintoSheetHTML(d, c) {
    d = d || {}; c = c || {}; var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, o = d.osa, oma = _oma(o, d.uid);
    if (!o) return '';
    return '<div data-kt-havainto-sheet><div class="kt-meta" style="margin-bottom:8px">' + esc(o.k) + ' · ' + esc(o.nimi || '') + '</div><div class="kt-sheet-k" style="font-size:var(--fs-body,14px);margin-bottom:6px">' + esc(t('kt_h_valinta')) + '</div>'
      + '<div class="kt-pan-opts" role="radiogroup">' + TILAT.map(function (a) {
        return '<label class="kt-btn q" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;cursor:pointer"><input type="radio" name="ktHavArvo" value="' + a[1] + '"' + (oma && oma.arvo === a[1] ? ' checked' : '') + '>' + esc(t(a[0])) + '</label>'; }).join('') + '</div>'
      + '<label for="ktHavLause" class="kt-meta" style="display:block;margin:12px 0 4px">' + esc(t('kt_h_lause')) + '</label><textarea id="ktHavLause" rows="2" maxlength="' + MAX_LAUSE + '" style="width:100%;box-sizing:border-box;font:inherit;font-size:var(--fs-body,14px);padding:8px 10px;border-radius:8px;border:.5px solid var(--border);background:var(--bg);color:var(--ink)">' + esc(oma && oma.lause || '') + '</textarea>'
      + '<div class="kt-meta" style="margin:4px 0 12px">' + esc(t('kt_h_lause_ohje')) + '</div>'
      + (c.fokusFn && o.koodi && o.koodi !== '·' ? '<div style="margin:0 0 12px"><button type="button" class="kt-btn g" data-kt-viikon-fokus' + (d.fokusValittu ? ' aria-pressed="true" disabled' : ' aria-pressed="false"') + ' style="min-height:44px" onclick="' + _fn(esc, c.fokusFn, [c.pid, o.koodi]) + '">' + (d.fokusValittu ? '✓ ' : '') + esc(t('kt_viikon_fokus')) + '</button></div>' : '')   /* K1b/4: valmentajan valinta */
      + '<div class="kt-pan-act" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><button type="button" class="kt-btn" data-kt-havainto-sheet-tallenna style="min-height:44px" onclick="' + _fn(esc, c.tallennaFn, [c.pid, d.avain, o.koodi]) + '">' + esc(t('kt_h_tallenna')) + '</button>'
      + (c.veoFn ? '<button type="button" class="kt-btn g" data-kt-havainto-veo style="min-height:44px" onclick="' + _fn(esc, c.veoFn, [c.pid]) + '">' + esc(t('kt_h_veo')) + '</button>' : '') + '<span class="kt-meta" data-kt-havainto-virhe role="alert"></span></div></div>';
  }

  function tmKtHavaintoLukuSheetista(lue) { var a = Number(lue('ktHavArvo')); return { arvo: (a === 1 || a === 2 || a === 3) ? a : null, lause: String(lue('ktHavLause') || '').trim() }; }
  function tmKtLauseKelpaa(lause) {
    var s = String(lause == null ? '' : lause).trim(); if (!s) return { ok: true, syy: null };
    if (s.length > MAX_LAUSE) return { ok: false, syy: 'pitka' };
    var K = (function () { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_kielletyt.js') : (root && root.TM_KIELLETYT); } catch (e) { return root && root.TM_KIELLETYT; } })();
    var r = K && K.tmJaksoTekstiKelpaa ? K.tmJaksoTekstiKelpaa(s) : { ok: true }; return r.ok ? { ok: true, syy: null } : { ok: false, syy: 'kielletty', loydetty: r.loydetty };
  }
  function tmKtKumoaToast(t, viesti) { return { teksti: (viesti || _txt({ t: t }, 'kt_h_tallennettu')) + ' · ', kumoa: _txt({ t: t }, 'kt_h_kumoa') }; }

  function tmKtToastAjastin(el, ms, valmis, ajastus) {
    var set = (ajastus && ajastus.set) || setTimeout, clear = (ajastus && ajastus.clear) || clearTimeout, t = null, hiiri = false, fokus = false, valmisna = false;
    function kaynnista() { if (t != null || valmisna) return; t = set(function () { t = null; valmisna = true; valmis(); }, ms); }
    function pysayta() { if (t != null) { clear(t); t = null; } }
    function paivita() { if (hiiri || fokus) pysayta(); else kaynnista(); }
    if (el && el.addEventListener) {
      el.addEventListener('mouseenter', function () { hiiri = true; paivita(); }); el.addEventListener('mouseleave', function () { hiiri = false; paivita(); });
      el.addEventListener('focusin', function () { fokus = true; paivita(); }); el.addEventListener('focusout', function () { fokus = false; paivita(); });
    }
    kaynnista();
    return { pysayta: function () { hiiri = true; paivita(); }, jatka: function () { hiiri = false; fokus = false; paivita(); }, peru: function () { valmisna = true; pysayta(); } };
  }
  var API = { FI: FI, tmKtToastAjastin: tmKtToastAjastin, MAX_LAUSE: MAX_LAUSE, tmKtHavaintoInlineHTML: tmKtHavaintoInlineHTML, tmKtHavaintoSheetHTML: tmKtHavaintoSheetHTML, tmKtHavaintoLukuSheetista: tmKtHavaintoLukuSheetista, tmKtLauseKelpaa: tmKtLauseKelpaa, tmKtKumoaToast: tmKtKumoaToast };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_HAVAINTO = API;
})(typeof window !== 'undefined' ? window : this);
