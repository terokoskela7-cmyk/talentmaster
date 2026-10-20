/* ════════════════════════════════════════════════════════════════════════
   tm_kt_taulu.js — K1b (kohta 7): TAKTIIKKATAULU PELAAJAKORTIN PÄÄLLE MODAALINA. Dual-export: module.exports || window.TM_KT_TAULU. Kaksi puolta, yksi tiedosto:
   · ISÄNTÄ (TalentMaster_Kehitystyopoyta.html): tmKtTauluModaali(env) → { avaa(o), sulje(), auki() } — modaali samalla mallilla kuin pikakortti Masterissa (_avaaPikakorttiUpotettu): iframe, teema isännältä (URL-parametri),
     alle 600 px koko näyttö + Android-takaisin sulkee, × sulkee. Iframe = Master upotettuna (?upotettu=taktiikka, lib/tm_kt_sivu.js tmKtTauluLinkki) → taulu avautuu heti, EI sivun vaihtoa eikä uloskirjautumista (kohta 1).
     env: { doc, win, linkki(o) → URL, t(avain) → teksti, esc?, toast?(msg) }. avaa(o) o: { pid, yv (ydinvahvuuden nimi), teema }.
   · MASTER (upotettu tila): tmKtTauluMasterAvaa(env) → true | false — lukee ?upotettu=taktiikka-parametrit, asettaa win._tmTauluKonteksti = { pid, ydinvahvuus } (taulu saa pelaajan ja jakson ydinvahvuuden; EI tallenna mitään pelaajalle),
     avaa taulun (env.avaa) ja ilmoittaa isännälle postMessagella kun taulu on suljettu ('suljettu') tai istuntoa ei ole ('ei_istuntoa'). env: { win, doc, avaa(), parametrit(search), nimi?(pid) }.
     Pankin otsikon alle lisätään rivi "Pelaajan nimi · ydinvahvuus" (vain näyttö).
   Viestit ovat vain tunnisteita ({ tmTaulu: 'suljettu' | 'ei_istuntoa' }); isäntä hyväksyy ne vain oman iframensa ikkunalta (ev.source).
   Ei värejä (vain tokenit), ei Firebasea.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var ID = '_ktTauluModal', KAAVIO_OVERLAYT = '#_kvModal, #_kvEditori, #_kvUusi, #_kvHylkays';

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ── ISÄNTÄ ── */
  function tmKtTauluModaali(env) {
    env = env || {}; var doc = env.doc || (root && root.document), win = env.win || root, t = typeof env.t === 'function' ? env.t : function (k) { return k; };
    var tila = null;   // { modal, ifr, popHandler, historia, msg }
    function auki() { return !!tila; }
    function _pura(popstatesta) {
      if (!tila) return;
      var x = tila; tila = null;
      if (x.msg) win.removeEventListener('message', x.msg);
      if (x.esc) doc.removeEventListener('keydown', x.esc);
      if (x.popHandler) win.removeEventListener('popstate', x.popHandler);
      if (x.historia && !popstatesta) { try { win.history.back(); } catch (e) { /* ei historiaa */ } }
      if (x.modal && x.modal.parentNode) x.modal.parentNode.removeChild(x.modal);
    }
    function sulje() { _pura(false); }
    function avaa(o) {
      o = o || {}; _pura(false);
      var pieni = (win.innerWidth || 1280) <= 600, modal = doc.createElement('div');
      modal.id = ID; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', t('Taktiikkataulu'));
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.82);z-index:9600;display:flex;align-items:center;justify-content:center;padding:' + (pieni ? '0' : '12px');
      modal.addEventListener('click', function (e) { if (e.target === modal) sulje(); });
      var x = { modal: modal, ifr: null, popHandler: null, historia: false, msg: null, esc: null };
      if (pieni) { try { win.history.pushState({ tmTaulu: 1 }, ''); x.historia = true; x.popHandler = function () { _pura(true); }; win.addEventListener('popstate', x.popHandler); } catch (e) { x.historia = false; } }   // Android-takaisin sulkee (kuten pikakortti)
      var box = doc.createElement('div');
      box.style.cssText = pieni
        ? 'background:var(--card);border:0;border-radius:0;width:100%;max-width:100%;height:100vh;height:100dvh;overflow:hidden;display:flex;flex-direction:column'
        : 'background:var(--card);border:.5px solid var(--line2,var(--border));border-radius:12px;width:min(1040px,100%);height:92vh;overflow:hidden;display:flex;flex-direction:column';
      var hdr = doc.createElement('div');
      hdr.style.cssText = 'flex:none;box-sizing:content-box;height:44px;display:flex;justify-content:space-between;align-items:center;padding:env(safe-area-inset-top) 4px 0 16px;border-bottom:.5px solid var(--line2,var(--border))';
      hdr.innerHTML = '<div style="font-family:var(--font-display,serif);font-size:18px;color:var(--ink)">' + _esc(t('Taktiikkataulu')) + '</div>';
      var xb = doc.createElement('button'); xb.type = 'button'; xb.setAttribute('data-kt-taulu-sulje', ''); xb.textContent = '×'; xb.setAttribute('aria-label', t('Sulje'));
      xb.style.cssText = 'background:none;border:none;color:var(--ink3);font-size:24px;cursor:pointer;width:44px;height:44px';
      xb.onclick = function () { sulje(); }; hdr.appendChild(xb); box.appendChild(hdr);
      var ifr = doc.createElement('iframe'); x.ifr = ifr;
      ifr.setAttribute('data-kt-taulu-iframe', ''); ifr.setAttribute('title', t('Taktiikkataulu')); ifr.style.cssText = 'flex:1;min-height:0;width:100%;border:0;background:var(--bg)';
      ifr.src = env.linkki ? env.linkki(o) : '';
      x.msg = function (ev) {   // vain oman iframen viestit; vain tunnisteet
        var d = ev && ev.data; if (!d || typeof d !== 'object' || !ifr.contentWindow || ev.source !== ifr.contentWindow) return;
        if (d.tmTaulu === 'suljettu') sulje();
        else if (d.tmTaulu === 'ei_istuntoa') { sulje(); if (typeof env.toast === 'function') env.toast(t('kts_kirjaudu')); }
      };
      win.addEventListener('message', x.msg);
      x.esc = function (ev) { if (ev && ev.key === 'Escape') sulje(); }; doc.addEventListener('keydown', x.esc);   // Esc sulkee (fokus isännässä)
      box.appendChild(ifr); modal.appendChild(box); doc.body.appendChild(modal); tila = x;
      return true;
    }
    return { avaa: avaa, sulje: sulje, auki: auki };
  }

  /* ── MASTER (upotettu tila) ── */
  function tmKtTauluMasterAvaa(env) {
    env = env || {}; var win = env.win || root, doc = env.doc || (root && root.document), r = typeof env.parametrit === 'function' ? env.parametrit(win.location && win.location.search) : null;
    if (!r || win._tmTauluAvattu) return false; win._tmTauluAvattu = true;
    win._tmTauluKonteksti = { pid: r.pid || null, ydinvahvuus: r.yv || '' };
    if (doc && doc.documentElement) doc.documentElement.classList.add('tm-upotettu-valmis');
    var ilmoita = function (tyyppi) { try { if (win.parent && win.parent !== win) win.parent.postMessage({ tmTaulu: tyyppi }, '*'); } catch (e) { /* ei isäntää */ } };
    /* Pelaaja + ydinvahvuus pankin otsikon alle (vain näyttö; ei tallenneta). Pankki piirretään uudelleen aina kun editorista palataan → rivi lisätään aina kun pankki on DOMissa ilman sitä. Nimi env.nimi(pid):stä (Master tuntee pelaajalistan). */
    var nimiLoytyi = false, rivi = function () {
      var m = doc && doc.getElementById('_kvModal'), k = win._tmTauluKonteksti; if (!m || !k) return;
      var nimi = typeof env.nimi === 'function' && k.pid ? env.nimi(k.pid) : '', teksti = [nimi, k.ydinvahvuus].filter(Boolean).join(' · '), ots = m.firstChild && m.firstChild.firstChild; if (!teksti || !ots) return;
      nimiLoytyi = !k.pid || !!nimi;
      var e = m.querySelector('[data-kaavio-konteksti]'); if (e) { if (e.textContent !== teksti) e.textContent = teksti; return; }
      e = doc.createElement('div'); e.setAttribute('data-kaavio-konteksti', ''); e.style.cssText = 'font-size:12px;color:var(--teal);margin:-4px 0 8px'; e.textContent = teksti; ots.parentNode.insertBefore(e, ots.nextSibling);
    };
    if (typeof win.setInterval === 'function') { var yrit = 0, kello = win.setInterval(function () { rivi(); if (nimiLoytyi || ++yrit > 24) win.clearInterval(kello); }, 500); }   // pelaajalista latautuu taulun avaamisen jälkeen → nimi täydentyy
    var MO = win.MutationObserver;
    if (typeof MO === 'function' && doc && doc.body) {
      var aj = null;   // kaikki taulun peittokerrokset pois (× / tausta) → isäntä sulkee modaalin; editori/uusi-kaavio-kerrokset eivät laukaise (debounce + tarkistus)
      new MO(function () { rivi(); if (aj) win.clearTimeout(aj); aj = win.setTimeout(function () { if (!doc.querySelector(KAAVIO_OVERLAYT)) ilmoita('suljettu'); }, 350); }).observe(doc.body, { childList: true });
    }
    if (typeof env.avaa === 'function') { var tulos = env.avaa(); if (tulos && typeof tulos.then === 'function') tulos.then(rivi, function () {}); else rivi(); }
    return true;
  }
  function tmKtTauluMasterEiIstuntoa(env) {   // upotettu Master ei saanut istuntoa → kerro isännälle (ei kirjautumislomaketta iframeen)
    env = env || {}; var win = env.win || root, r = typeof env.parametrit === 'function' ? env.parametrit(win.location && win.location.search) : null; if (!r) return false;
    try { if (win.parent && win.parent !== win) win.parent.postMessage({ tmTaulu: 'ei_istuntoa' }, '*'); } catch (e) { /* ei isäntää */ }
    return true;
  }

  var API = { ID: ID, tmKtTauluModaali: tmKtTauluModaali, tmKtTauluMasterAvaa: tmKtTauluMasterAvaa, tmKtTauluMasterEiIstuntoa: tmKtTauluMasterEiIstuntoa };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KT_TAULU = API;
})(typeof window !== 'undefined' ? window : this);
