/* ════════════════════════════════════════════════════════════════════════
   tm_ilmoitus_lista.js — K1c (kohta 3): pelaajan ja perheen ilmoituslista: ryhmittely, rivit, ✕ PAIKALLAAN (ei koko näkymän uudelleenpiirtoa → sivu ei hyppää alkuun) ja "Kuittaa kaikki".
   Pelaaja_v7 ja Vanhempi_v2 ovat ohuita adaptereita (sama malli kuin tm_klippi_perhe.js): lataus, kuittauksen tallennus (laitteen localStorage, tm_kalenteri_ilmoitus.js) ja `draw()` pysyvät appeissa.
   Dual-export: module.exports || window.TM_ILMOITUS_LISTA. Tokenit (ei hex-värejä); tekstit opts.t:n kautta (fi-oletus tässä; sv Gemini-erästä).
   · tmIlmoitusNimi(n) → tapahtuman nimi (rakenteinen ilmoitus.nimi | "Peruttu: X" -tekstistä) | ''
   · tmIlmoitusRyhmat(rivit) → [{ ryhma:false, x } | { ryhma:true, nimi, jasenet:[x], id }]  — rivit = [{ n, r }]; vain saman nimiset 'peruttu'-rivit (≥ 2) yhdistetään; järjestys säilyy (ryhmä ensimmäisen jäsenen paikalle)
   · tmIlmoitusRiviHTML(x, o) · tmIlmoitusRyhmaHTML(g, o) · tmIlmoitusKuittaaKaikkiHTML(o) · tmIlmoitusMerkkiHTML(tyyppi)   (o: { esc, t, teksti(x) → rivin teksti, ikoni(tyyppi) → html, tapFn, kuittaaFn, kuittaaRyhmaFn, kaikkiFn })
   · tmIlmoitusAvaaRyhma(el) — ryhmärivin avaus/sulku (▸ / ▾)
   · tmIlmoitusPoistaPaikallaan(doc, win, idt, ms) → Promise — häivyttää ja poistaa rivit/ryhmät DOMista; vierityskohta (window + vierityssäiliö) talteen ja palautus; päivittää otsikon (laskuri, "Kuittaa kaikki" < 3 rivillä pois, tyhjä osio pois)
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = { ilm_kertaa: '{n} kertaa', ilm_kuittaa_kaikki: 'Kuittaa kaikki' };
  var KAIKKI_RAJA = 3;   // "Kuittaa kaikki" näkyviin kun rivejä (ryhmä = yksi rivi) on vähintään tämän verran
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _t(o, avain, m) {
    var v = o && typeof o.t === 'function' ? o.t(avain) : avain, s = (v && v !== avain) ? v : (FI[avain] != null ? FI[avain] : avain);
    if (m) Object.keys(m).forEach(function (k) { s = s.split('{' + k + '}').join(m[k]); });
    return s;
  }

  function tmIlmoitusNimi(n) {
    if (!n) return '';
    var r = n.ilmoitus && typeof n.ilmoitus === 'object' ? n.ilmoitus.nimi : '';
    if (r) return String(r).trim();
    var m = /^Peruttu:\s*(.+)$/.exec(String(n.teksti || '')); return m ? m[1].trim() : '';
  }
  function tmIlmoitusRyhmat(rivit) {
    var l = Array.isArray(rivit) ? rivit : [], lkm = {}, ulos = [], nahty = {};
    function avain(x) { return x && x.n && x.n.tyyppi === 'peruttu' ? tmIlmoitusNimi(x.n).toLowerCase() : ''; }
    l.forEach(function (x) { var a = avain(x); if (a) lkm[a] = (lkm[a] || 0) + 1; });
    l.forEach(function (x) {
      var a = avain(x);
      if (!a || lkm[a] < 2) { ulos.push({ ryhma: false, x: x }); return; }
      if (nahty[a]) { nahty[a].jasenet.push(x); return; }
      nahty[a] = { ryhma: true, nimi: tmIlmoitusNimi(x.n), jasenet: [x], id: 'g' + ulos.length };
      ulos.push(nahty[a]);
    });
    return ulos;
  }

  /* Peruttu = hillitty status-merkki (ei punaista ❌-emojia); muut tyypit säilyttävät kuvakkeensa (o.ikoni). */
  function tmIlmoitusMerkkiHTML(tyyppi) {
    return tyyppi === 'peruttu'
      ? '<span data-ilm-merkki="peruttu" aria-hidden="true" style="flex-shrink:0;width:8px;height:8px;margin:6px 4px 0 3px;border-radius:50%;border:1.5px solid var(--ink3);opacity:.8"></span>'
      : '';
  }
  var X = 'flex-shrink:0;margin:-8px -8px -8px 0;padding:8px 10px;font-size:13px;line-height:1;color:var(--ink3);cursor:pointer';
  function _kuori(o) { return 'display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:9px;margin-bottom:6px;transition:opacity .18s'; }
  function _tyyli(luettu) {
    return luettu ? 'background:transparent;border:.5px solid var(--border)' : 'background:color-mix(in srgb,var(--teal) 8%,transparent);border:.5px solid color-mix(in srgb,var(--teal) 28%,transparent)';
  }
  function _ikoni(o, tyyppi) { var m = tmIlmoitusMerkkiHTML(tyyppi); return m || (typeof o.ikoni === 'function' ? o.ikoni(tyyppi) : ''); }

  function tmIlmoitusRiviHTML(x, o) {
    o = o || {}; var esc = o.esc || _esc, n = x.n, id = esc(n.id), luettu = !!n.luettu;
    return '<div data-ilm-rivi="' + id + '"' + (luettu ? '' : ' data-ilm-lukematon') + ' onclick="' + esc(o.tapFn + "('" + n.id + "','" + (n.linkki || '') + "')") + '" style="' + _kuori(o) + ';' + _tyyli(luettu) + ';cursor:pointer">'
      + _ikoni(o, n.tyyppi)
      + '<span style="flex:1;min-width:0;font-size:12.5px;color:var(--text);line-height:1.4">' + esc(o.teksti(x)) + '</span>'
      + (luettu ? '' : '<span data-ilm-piste style="width:7px;height:7px;border-radius:50%;background:var(--teal);flex-shrink:0;margin-top:5px"></span>')
      + (n.tyyppi === 'peruttu' ? '<span data-ilm-kuittaa role="button" aria-label="' + esc(_t(o, 'yleiset.sulje')) + '" onclick="event.stopPropagation();' + esc(o.kuittaaFn + "('" + n.id + "')") + '" style="' + X + '">✕</span>' : '') + '</div>';
  }
  function tmIlmoitusRyhmaHTML(g, o) {
    o = o || {}; var esc = o.esc || _esc, idt = g.jasenet.map(function (x) { return x.n.id; }), lukematon = g.jasenet.some(function (x) { return !x.n.luettu; });
    var otsikko = (typeof o.peruttuTeksti === 'function' ? o.peruttuTeksti(g.nimi) : g.nimi) + ' · ' + _t(o, 'ilm_kertaa', { n: g.jasenet.length });
    return '<div data-ilm-rivi="' + esc(g.id) + '" data-ilm-ryhma="' + esc(idt.join(',')) + '"' + (lukematon ? ' data-ilm-lukematon' : '') + ' style="margin-bottom:6px;transition:opacity .18s">'
      + '<div data-ilm-ryhma-otsikko role="button" aria-expanded="false" tabindex="0" onclick="TM_ILMOITUS_LISTA.tmIlmoitusAvaaRyhma(this)" style="' + _kuori(o) + ';margin-bottom:0;' + _tyyli(!lukematon) + ';cursor:pointer">'
      + tmIlmoitusMerkkiHTML('peruttu')
      + '<span style="flex:1;min-width:0;font-size:12.5px;color:var(--text);line-height:1.4">' + esc(otsikko) + '</span>'
      + (lukematon ? '<span data-ilm-piste style="width:7px;height:7px;border-radius:50%;background:var(--teal);flex-shrink:0;margin-top:5px"></span>' : '')
      + '<span data-ilm-nuoli aria-hidden="true" style="flex:0 0 14px;width:14px;text-align:center;font-size:12px;line-height:1.4;color:var(--ink2)">▸</span>'
      + '<span data-ilm-kuittaa role="button" aria-label="' + esc(_t(o, 'yleiset.sulje')) + '" onclick="event.stopPropagation();' + esc(o.kuittaaRyhmaFn + "('" + idt.join(',') + "')") + '" style="' + X + '">✕</span></div>'
      + '<div data-ilm-ryhma-lista hidden style="padding:6px 12px 2px 28px">'
      + g.jasenet.map(function (x) { return '<div data-ilm-ryhma-jasen style="font-size:12.5px;color:var(--ink2);line-height:1.4;padding:3px 0">' + esc(o.teksti(x)) + '</div>'; }).join('')
      + '</div></div>';
  }
  function tmIlmoitusKuittaaKaikkiHTML(o) {
    o = o || {}; var esc = o.esc || _esc;
    return '<span data-ilm-kaikki role="button" tabindex="0" onclick="' + esc(o.kaikkiFn + '()') + '" style="font-size:11px;color:var(--ink2);cursor:pointer;padding:6px 0 6px 10px">' + esc(_t(o, 'ilm_kuittaa_kaikki')) + '</span>';
  }
  function tmIlmoitusAvaaRyhma(el) {
    if (!el || !el.parentNode) return;
    var lista = el.parentNode.querySelector('[data-ilm-ryhma-lista]'); if (!lista) return;
    var auki = lista.hasAttribute('hidden'); if (auki) lista.removeAttribute('hidden'); else lista.setAttribute('hidden', '');
    el.setAttribute('aria-expanded', auki ? 'true' : 'false');
    var nuoli = el.querySelector('[data-ilm-nuoli]'); if (nuoli) nuoli.textContent = auki ? '▾' : '▸';
  }

  /* Vierityssäilöt: window + kaikki vieritettävät esivanhemmat (Pelaaja_v7:ssä vieritys on .scroll-säiliössä, ei ikkunassa). */
  function _vierityssailot(doc, win, el) {
    var l = [], e = el && el.parentNode;
    while (e && e.nodeType === 1) { if (typeof e.scrollTop === 'number' && e.scrollHeight > e.clientHeight) l.push({ e: e, y: e.scrollTop }); e = e.parentNode; }
    return { win: (win && (win.pageYOffset || win.scrollY)) || 0, sailiot: l };
  }
  function _palautaVieritys(win, v) {
    v.sailiot.forEach(function (s) { if (s.e.scrollTop !== s.y) s.e.scrollTop = s.y; });
    if (win && typeof win.scrollTo === 'function' && ((win.pageYOffset || win.scrollY) || 0) !== v.win) win.scrollTo(0, v.win);
  }
  function _paivitaOsio(doc) {
    var osio = doc.querySelector('[data-ilm-osio]'); if (!osio) return;
    var rivit = osio.querySelectorAll('[data-ilm-rivi]'), lkm = rivit.length;
    if (!lkm) { if (osio.parentNode) osio.parentNode.removeChild(osio); return; }
    var lukem = osio.querySelectorAll('[data-ilm-rivi][data-ilm-lukematon]').length;
    var laskuri = osio.querySelector('[data-ilm-laskuri]'); if (laskuri) { if (lukem) laskuri.textContent = String(lukem); else if (laskuri.parentNode) laskuri.parentNode.removeChild(laskuri); }
    var kaikki = osio.querySelector('[data-ilm-kaikki]'); if (kaikki && lkm < KAIKKI_RAJA && kaikki.parentNode) kaikki.parentNode.removeChild(kaikki);
  }
  /* idt: ilmoitusten id:t (rivi tai ryhmän jäsen). Rivi/ryhmä poistetaan kun KAIKKI sen id:t ovat mukana. Ei draw()-kutsua. */
  function tmIlmoitusPoistaPaikallaan(doc, win, idt, ms) {
    var lista = Array.isArray(idt) ? idt.map(String) : [], kohteet = [];
    [].slice.call(doc.querySelectorAll('[data-ilm-rivi]')).forEach(function (el) {
      var mukana = (el.getAttribute('data-ilm-ryhma') || el.getAttribute('data-ilm-rivi')).split(',');
      if (mukana.every(function (i) { return lista.indexOf(i) >= 0; })) kohteet.push(el);
    });
    if (!kohteet.length) return Promise.resolve(0);
    var v = _vierityssailot(doc, win, kohteet[0]), viive = ms == null ? 180 : ms;
    kohteet.forEach(function (el) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; });
    return new Promise(function (valmis) {
      var tee = function () {
        kohteet.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
        _paivitaOsio(doc); _palautaVieritys(win, v); valmis(kohteet.length);
        /* Chromen scroll anchoring korjaa vierityksen vasta seuraavan kuvan asettelun jälkeen (esim. otsikon "Kuittaa kaikki" katoaminen siirtää sisältöä) → palautus vielä kahden kuvan päästä, ettei vieritys muutu. */
        if (win && typeof win.requestAnimationFrame === 'function') win.requestAnimationFrame(function () { win.requestAnimationFrame(function () { _palautaVieritys(win, v); }); });
      };
      if (viive > 0 && win && typeof win.setTimeout === 'function') win.setTimeout(tee, viive); else tee();
    });
  }

  var API = { FI: FI, KAIKKI_RAJA: KAIKKI_RAJA, tmIlmoitusNimi: tmIlmoitusNimi, tmIlmoitusRyhmat: tmIlmoitusRyhmat, tmIlmoitusMerkkiHTML: tmIlmoitusMerkkiHTML, tmIlmoitusRiviHTML: tmIlmoitusRiviHTML, tmIlmoitusRyhmaHTML: tmIlmoitusRyhmaHTML, tmIlmoitusKuittaaKaikkiHTML: tmIlmoitusKuittaaKaikkiHTML, tmIlmoitusAvaaRyhma: tmIlmoitusAvaaRyhma, tmIlmoitusPoistaPaikallaan: tmIlmoitusPoistaPaikallaan };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_ILMOITUS_LISTA = API;
})(typeof window !== 'undefined' ? window : this);
