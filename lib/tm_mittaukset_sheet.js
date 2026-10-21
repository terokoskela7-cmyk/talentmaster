/* ════════════════════════════════════════════════════════════════════════
   tm_mittaukset_sheet.js — K4c (erä 83): "Kaikki mittaukset" -sheetin ISÄNTÄ (DOM: koko ruudun sheet, D100). Dual-export: module.exports || window.TM_MITTAUKSET_SHEET.
   · tmMittauksetSheet(env) → { avaa(pid, {osio, testi, suodatin}), sulje(), auki(), suodata(s), osio(avain), rivi(osio, testi) }
        env: { doc, win, pelaaja(pid), ctx(p, suodatin) → c (tmMittauksetMalli + HTML), suljeMuut?(), tausta? (Element: inert kun auki) }
   URL-tila kuten taktiikkataulussa (lib/tm_kt_taulu.js): avaus = history.pushState({tmMk}) + popstate → selaimen paluu sulkee, eteen palauttaa. Osoite (hash) ei muutu → pelaajareititin ei häiriinny.
   Luonnosta ei ole (lukunäkymä, ei kirjoituksia). Yksi sheet kerrallaan: suljeMuut() kutsutaan avattaessa.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var req = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require : null;
  var M = req ? req('./tm_mittaukset.js') : root.TM_MITTAUKSET, H = req ? req('./tm_mittaukset_html.js') : root.TM_MITTAUKSET_HTML, ID = 'ktMittaukset';

  function tmMittauksetSheet(env) {
    env = env || {}; var doc = env.doc || (root && root.document), win = env.win || root, tila = null;   // tila: { pid, suod, auki:{'osio/testi':1}, modal, avaaja, esc, historia }
    function auki() { return !!tila; }
    function _runko() {
      var p = env.pelaaja(tila.pid); if (!p) return '';
      var c = env.ctx(p, tila.suod), m = M.tmMittauksetMalli(p, c);
      return '<div class="mk-sivu">' + H.tmMittauksetHTML(m, c) + '</div>';
    }
    function _riviAuki(osio, testi, nayta) {
      var tr = tila.modal.querySelector('[data-mk-osio="' + osio + '"] tr[data-mk-testi="' + testi + '"]'); if (!tr) return false;
      var h = doc.getElementById('mkH-' + osio + '-' + testi), b = tr.querySelector('.mk-avaa'); if (!h) return false;
      h.hidden = !nayta; if (b) b.setAttribute('aria-expanded', String(nayta)); if (nayta) tila.auki[osio + '/' + testi] = 1; else delete tila.auki[osio + '/' + testi]; return true;
    }
    function _piirra() {
      var ylos = tila.modal.scrollTop; tila.modal.innerHTML = _runko();
      Object.keys(tila.auki).forEach(function (k) { var a = k.split('/'); _riviAuki(a[0], a[1], true); });
      tila.modal.scrollTop = ylos;
    }
    function osio(avain) { var s = tila && tila.modal.querySelector('[data-mk-osio="' + avain + '"]'); if (s) s.scrollIntoView({ block: 'start' }); return !!s; }
    function rivi(o, testi) { if (!tila) return false; var h = doc.getElementById('mkH-' + o + '-' + testi); return h ? _riviAuki(o, testi, h.hidden) : false; }
    function suodata(s) { if (!tila) return false; tila.suod = s === 'kausi' ? 'kausi' : 'kaikki'; _piirra(); return true; }
    function _pura(takaisin) {
      if (!tila) return; var x = tila; tila = null;
      doc.removeEventListener('keydown', x.esc, true);
      if (x.modal.parentNode) x.modal.parentNode.removeChild(x.modal);
      if (env.tausta) { try { env.tausta.inert = false; } catch (e) { /* ei inert-tukea */ } }
      if (x.historia && takaisin) { try { win.history.back(); } catch (e) { /* ei historiaa */ } }
      if (x.avaaja && x.avaaja.focus) { try { x.avaaja.focus(); } catch (e) { /* ei fokusta */ } }
    }
    function sulje() { _pura(true); }
    function avaa(pid, o, eiPush) {
      o = o || {}; if (tila && tila.pid !== pid) _pura(false);
      if (typeof env.suljeMuut === 'function') env.suljeMuut();
      var uusi = !tila;
      if (uusi) {
        var modal = doc.createElement('div'); modal.id = ID; modal.className = 'mk-tausta'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', M._t(env.ctx(env.pelaaja(pid) || {}, 'kaikki'), 'mk_otsikko'));
        tila = { pid: pid, suod: o.suodatin === 'kausi' ? 'kausi' : 'kaikki', auki: {}, modal: modal, avaaja: doc.activeElement, historia: false, esc: null };
        tila.esc = function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); sulje(); } }; doc.addEventListener('keydown', tila.esc, true);
        _piirra(); doc.body.appendChild(modal); if (env.tausta) { try { env.tausta.inert = true; } catch (e) { /* ei inert-tukea */ } }
        if (!eiPush) { try { win.history.pushState({ tmMk: { pid: pid, osio: o.osio || null, testi: o.testi || null } }, ''); tila.historia = true; } catch (e) { tila.historia = false; } }
        else tila.historia = true;
        var f = modal.querySelector('[data-mk-sulje]'); if (f && f.focus) f.focus();
      }
      if (o.testi && o.osio) rivi_auki(o.osio, o.testi);
      if (o.osio) osio(o.osio);
      return true;
    }
    function rivi_auki(o, testi) { if (tila) _riviAuki(o, testi, true); }
    if (win && win.addEventListener) win.addEventListener('popstate', function (ev) {   // paluu sulkee, eteen palauttaa
      var s = ev && ev.state && ev.state.tmMk;
      if (tila && !s) _pura(false);
      else if (!tila && s && env.pelaaja(s.pid)) avaa(s.pid, { osio: s.osio, testi: s.testi }, true);
    });
    return { avaa: avaa, sulje: sulje, auki: auki, suodata: suodata, osio: osio, rivi: rivi };
  }
  var API = { ID: ID, tmMittauksetSheet: tmMittauksetSheet };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_MITTAUKSET_SHEET = API;
})(typeof window !== 'undefined' ? window : this);
