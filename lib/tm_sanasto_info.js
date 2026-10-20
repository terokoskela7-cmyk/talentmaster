/* ════════════════════════════════════════════════════════════════════════
   tm_sanasto_info.js — K1d (Tero 20.10.2026): sanasto näkyviin sovelluksessa. Yksi jaettu komponentti Masterille, VP:lle ja kehitystyöpöydälle (D98).
   · tmSanastoInfoHTML(avain, opts)   → ⓘ-nappi (≥ 44 px kosketusalue, aria-label, aria-expanded/-controls) + paikallaan avautuva selite (1–2 lausetta + "Lue lisää"); ei sivun vaihtoa.
       avain: 'kehityssuunnitelma' | 'jakson_yhteenveto' | 'kehityskeskustelu' | 'pelaajaraportti' | 'tilannekuva'.  opts: { esc, t (avain→teksti, fi-oletus tässä), id }
   · tmSanastoInfoToggle(nappi, doc?) → avaa/sulkee selitteen. Sulkeutuu: Esc (fokus takaisin nappiin), napautus ulkopuolelle, uusi napautus, toisen selitteen avaus.
   · tmKehitysEteneeHTML(opts)        → "Miten kehitys etenee" -ruutu (role=dialog): yksi SVG-kaavio + lyhyt teksti kierrosta. tmKehitysEteneeAvaa(doc, opts) / tmKehitysEteneeSulje(doc).
       Kierros: Kehityssuunnitelma (kauden tavoite) → jakso 6 vk (aihe, ydinasiat, viikon fokus) → jakson yhteenveto → seuraava jakso · kehityskeskustelu tarvittaessa / VP:n kanssa · rytmi 42 pv (≥ 12 v) / 84 pv (9–11 v) · pelaajaraportti.
   · tmSanastoInfoCss()               → tyylit (vain tokenit); tmSanastoInfoAsenna(doc) lisää ne kerran (<style id="tmSiCss">) ja Esc-/ulkopuolinen napautus -kuuntelijat.
   Tekstit: FI-oletus tässä, sv erä 80 (lib/tm_lib_i18n.js:n kautta adapterin opts.t). Pelaaja- ja perhe-appeihin EI ⓘ-selitteitä (brief 0b). PURE paitsi tmSanastoInfoToggle/-Asenna/-Avaa (DOM).
   Dual-export: module.exports || window.TM_SANASTO_INFO.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    si_n_kehityssuunnitelma: 'Kehityssuunnitelma', si_n_jakson_yhteenveto: 'Jakson yhteenveto', si_n_kehityskeskustelu: 'Kehityskeskustelu', si_n_pelaajaraportti: 'Pelaajaraportti', si_n_tilannekuva: 'Seuran tilannekuva',
    si_kehityssuunnitelma: 'Pelaajan kauden tavoite ja sen alla etenevät 6 viikon jaksot.',
    si_jakson_yhteenveto: 'Jakson lopussa: vastaat kolmeen kysymykseen, kirjoitat lauseen ja valitset seuraavan jakson. Kirjataan aina, ja se nollaa yhteenvetorytmin.',
    si_kehityskeskustelu: 'Laajempi keskustelu pelaajan ja tarvittaessa huoltajan kanssa, yleensä VP:n kanssa.',
    si_pelaajaraportti: 'Dokumentti, jonka voit näyttää tai antaa pelaajalle ja perheelle.',
    si_tilannekuva: 'VP:n kooste siitä, onko yhteenvedot ja keskustelut ajan tasalla joukkueittain.',
    si_aria: 'Mikä on {termi}?', si_lue_lisaa: 'Lue lisää', si_sulje: 'Sulje',
    ke_otsikko: 'Miten kehitys etenee', ke_ingressi: 'Pelaajan kehitys etenee kierroksena: kauden tavoite, 6 viikon jaksot ja jakson lopussa yhteenveto, josta seuraava jakso alkaa.',
    ke_d_suunnitelma: 'Kehityssuunnitelma', ke_d_suunnitelma_alla: 'kauden tavoite', ke_d_jakso: 'Jakso · 6 vk', ke_d_jakso_alla: 'aihe · ydinasiat · viikon fokus', ke_d_yhteenveto: 'Jakson yhteenveto', ke_d_yhteenveto_alla: 'jakson lopussa',
    ke_d_seuraava: 'Seuraava jakso', ke_d_keskustelu: 'Kehityskeskustelu', ke_d_keskustelu_alla: 'tarvittaessa tai VP:n kanssa', ke_d_raportti: 'Pelaajaraportti', ke_d_raportti_alla: 'pelaajalle ja perheelle', ke_d_kaavio: 'Kaavio: kehityssuunnitelma, jakso, jakson yhteenveto ja seuraava jakso',
    ke_rytmi: 'Rytmi: jakson yhteenveto tai kehityskeskustelu viimeistään 42 päivän välein (12 vuotta täyttäneet) tai 84 päivän välein (9–11-vuotiaat). Kumpikin nollaa rytmin.',
    ke_jakso: 'Jakso kestää yleensä 6 viikkoa. Sen aikana pelaaja harjoittelee yhtä aihetta, jonka ydinasioista yksi on viikon fokus.',
    ke_raportti: 'Pelaajaraportti on dokumentti pelaajalle ja perheelle. Se kertoo, missä pelaaja on nyt ja mihin ollaan menossa.'
  };
  var TERMIT = ['kehityssuunnitelma', 'jakson_yhteenveto', 'kehityskeskustelu', 'pelaajaraportti', 'tilannekuva'];
  var _ctr = 0;

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _fmt(s, m) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return m && m[k] != null ? m[k] : ''; }); }

  function tmSanastoInfoHTML(avain, opts) {
    opts = opts || {}; if (TERMIT.indexOf(avain) < 0) return '';
    if (typeof opts.t === 'function' && root) root.TM_SANASTO_INFO_OPTS = { t: opts.t, esc: opts.esc };   // "Lue lisää" avaa ruudun samalla kielellä (adapterin t)
    var esc = opts.esc || _esc, id = opts.id || ('tmSi' + avain + (++_ctr)), nimi = _txt(opts, 'si_n_' + avain);
    return '<span class="si" data-si="' + esc(avain) + '"><button type="button" class="si-n" data-si-nappi aria-expanded="false" aria-controls="' + esc(id) + '" aria-label="' + esc(_fmt(_txt(opts, 'si_aria'), { termi: nimi })) + '" onclick="TM_SANASTO_INFO.tmSanastoInfoToggle(this)"><span aria-hidden="true">ⓘ</span></button>'
      + '<span class="si-p" id="' + esc(id) + '" role="note" hidden><span class="si-t" data-si-teksti>' + esc(_txt(opts, 'si_' + avain)) + '</span> <button type="button" class="si-ll" data-si-lue-lisaa onclick="TM_SANASTO_INFO.tmKehitysEteneeAvaa(document)">' + esc(_txt(opts, 'si_lue_lisaa')) + '</button></span></span>';
  }

  /* ── DOM ── */
  function _doc(n) { return (n && n.ownerDocument) || (typeof document !== 'undefined' ? document : null); }
  function _suljeKaikki(doc, paitsi) {
    Array.prototype.forEach.call(doc.querySelectorAll('.si-p:not([hidden])'), function (p) {
      if (p === paitsi) return; p.hidden = true; var n = p.parentNode && p.parentNode.querySelector('[data-si-nappi]'); if (n) n.setAttribute('aria-expanded', 'false');
    });
  }
  function tmSanastoInfoToggle(nappi) {
    var doc = _doc(nappi); if (!doc || !nappi) return false; tmSanastoInfoAsenna(doc);
    var p = doc.getElementById(nappi.getAttribute('aria-controls')); if (!p) return false;
    var auki = !p.hidden; _suljeKaikki(doc, p);
    p.hidden = auki; nappi.setAttribute('aria-expanded', auki ? 'false' : 'true');
    if (!auki) {   // reunatarkistus: selite ei saa mennä ruudun ulkopuolelle (390 px) — sijoitetaan napin kohdalle ja rajataan 8 px:n reunuksiin
      var si = nappi.parentNode, w = doc.documentElement.clientWidth || (doc.defaultView && doc.defaultView.innerWidth) || 0;
      p.style.left = '0'; p.style.right = 'auto';
      if (w) { var sl = si.getBoundingClientRect().left, pw = p.offsetWidth, kohde = Math.min(Math.max(sl, 8), Math.max(8, w - 8 - pw)); p.style.left = (kohde - sl) + 'px'; }
    }
    return !auki;
  }
  function tmSanastoInfoAsenna(doc) {
    if (!doc || !doc.head) return false;
    if (!doc.getElementById('tmSiCss')) { var st = doc.createElement('style'); st.id = 'tmSiCss'; st.textContent = tmSanastoInfoCss(); doc.head.appendChild(st); }
    if (doc.documentElement.getAttribute('data-si-asennettu') === '1') return true;
    doc.documentElement.setAttribute('data-si-asennettu', '1');
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      var modal = doc.getElementById('tmKeModal'); if (modal) { tmKehitysEteneeSulje(doc); return; }
      var auki = doc.querySelector('.si-p:not([hidden])'); if (!auki) return;
      var n = auki.parentNode.querySelector('[data-si-nappi]'); _suljeKaikki(doc); if (n && n.focus) n.focus();
    });
    doc.addEventListener('click', function (e) {
      var t = e.target; if (t && t.closest && t.closest('.si')) return;
      _suljeKaikki(doc);
    });
    return true;
  }

  /* ── Miten kehitys etenee ── */
  function _svg(opts) {
    var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); };
    var box = function (x, y, w, h, a, b, cls) { return '<g class="' + cls + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="6"/><text x="' + (x + w / 2) + '" y="' + (y + 22) + '" text-anchor="middle" class="si-sv-h">' + T(a) + '</text>' + (b ? '<text x="' + (x + w / 2) + '" y="' + (y + 41) + '" text-anchor="middle" class="si-sv-s">' + T(b) + '</text>' : '') + '</g>'; };
    return '<svg class="si-sv" viewBox="0 0 340 330" role="img" aria-label="' + T('ke_d_kaavio') + '" xmlns="http://www.w3.org/2000/svg">'
      + '<defs><marker id="tmSiNuoli" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" class="si-sv-nuoli"/></marker></defs>'
      + box(40, 6, 260, 52, 'ke_d_suunnitelma', 'ke_d_suunnitelma_alla', 'si-sv-a') + '<line x1="170" y1="58" x2="170" y2="76" class="si-sv-l" marker-end="url(#tmSiNuoli)"/>'
      + box(40, 78, 260, 52, 'ke_d_jakso', 'ke_d_jakso_alla', 'si-sv-b') + '<line x1="170" y1="130" x2="170" y2="148" class="si-sv-l" marker-end="url(#tmSiNuoli)"/>'
      + box(40, 150, 260, 52, 'ke_d_yhteenveto', 'ke_d_yhteenveto_alla', 'si-sv-c') + '<line x1="170" y1="202" x2="170" y2="220" class="si-sv-l" marker-end="url(#tmSiNuoli)"/>'
      + box(40, 222, 260, 36, 'ke_d_seuraava', '', 'si-sv-b')
      + '<path d="M300 240 H322 V104 H304" class="si-sv-l" fill="none" marker-end="url(#tmSiNuoli)"/>'
      + box(6, 272, 160, 52, 'ke_d_keskustelu', 'ke_d_keskustelu_alla', 'si-sv-d') + box(174, 272, 160, 52, 'ke_d_raportti', 'ke_d_raportti_alla', 'si-sv-d')
      + '</svg>';
  }
  function tmKehitysEteneeHTML(opts) {
    opts = opts || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); };
    return '<div id="tmKeModal" class="si-modal" role="dialog" aria-modal="true" aria-labelledby="tmKeOts" onclick="if(event.target===this)TM_SANASTO_INFO.tmKehitysEteneeSulje(document)">'
      + '<div class="si-box"><div class="si-hd"><h2 id="tmKeOts" class="si-ots">' + T('ke_otsikko') + '</h2><button type="button" class="si-x" data-si-sulje aria-label="' + T('si_sulje') + '" onclick="TM_SANASTO_INFO.tmKehitysEteneeSulje(document)">×</button></div>'
      + '<p class="si-ing">' + T('ke_ingressi') + '</p>' + _svg(opts)
      + '<p class="si-pr">' + T('ke_jakso') + '</p><p class="si-pr">' + T('ke_rytmi') + '</p><p class="si-pr">' + T('ke_raportti') + '</p></div></div>';
  }
  function tmKehitysEteneeAvaa(doc, opts) {
    doc = doc || (typeof document !== 'undefined' ? document : null); if (!doc || !doc.body) return false;
    tmSanastoInfoAsenna(doc); _suljeKaikki(doc); tmKehitysEteneeSulje(doc);
    var w = doc.createElement('div'); w.innerHTML = tmKehitysEteneeHTML(opts || (root && root.TM_SANASTO_INFO_OPTS) || {}); doc.body.appendChild(w.firstChild);
    var x = doc.querySelector('#tmKeModal [data-si-sulje]'); if (x && x.focus) x.focus();
    return true;
  }
  function tmKehitysEteneeSulje(doc) { doc = doc || (typeof document !== 'undefined' ? document : null); var m = doc && doc.getElementById('tmKeModal'); if (m) m.parentNode.removeChild(m); return !!m; }

  function tmSanastoInfoCss() {
    return [
      '.si{position:relative;display:inline-block;vertical-align:middle}',
      '.si-n{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin:-13px -10px;padding:0;background:none;border:none;color:var(--teal);font:inherit;font-size:var(--fs-body,14px);cursor:pointer;border-radius:50%}',
      '.si-n:focus-visible,.si-ll:focus-visible,.si-x:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
      '.si-p{position:absolute;top:100%;left:0;z-index:60;width:min(300px,80vw);margin-top:6px;padding:10px 12px;background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--border);border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.35);font-family:var(--font-sans);font-size:var(--fs-meta,12.5px);font-weight:400;line-height:1.4;letter-spacing:0;text-transform:none;text-align:left}',
      '.si-p[hidden]{display:none}.si-ll{display:inline-block;background:none;border:none;padding:0;min-height:44px;font:inherit;color:var(--teal);text-decoration:underline;cursor:pointer}',
      '.si-modal{position:fixed;inset:0;z-index:9300;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:16px}',
      '.si-box{background:var(--card,var(--bg));color:var(--ink);border:1px solid var(--border);border-radius:10px;padding:18px 18px 8px;width:480px;max-width:100%;max-height:92vh;overflow-y:auto;font-family:var(--font-sans)}',
      '.si-hd{display:flex;justify-content:space-between;align-items:center;gap:8px}.si-ots{margin:0;font-family:var(--kt-serif,"Cormorant Garamond",serif);font-weight:500;font-size:var(--fs-h2,26px)}',
      '.si-x{min-width:44px;min-height:44px;background:none;border:none;color:var(--ink2);font-size:24px;cursor:pointer}',
      '.si-ing,.si-pr{font-size:var(--fs-body,14px);color:var(--ink2);line-height:1.45;margin:8px 0}',
      '.si-sv{display:block;width:100%;height:auto;margin:10px 0}.si-sv rect{fill:var(--bg);stroke:var(--border);stroke-width:1}.si-sv-a rect{stroke:var(--teal)}.si-sv-c rect{stroke:var(--teal);fill:color-mix(in srgb,var(--teal) 14%,var(--bg))}.si-sv-d rect{stroke-dasharray:4 3}',
      '.si-sv-h{font-size:14px;font-weight:600;fill:var(--ink)}.si-sv-s{font-size:12.5px;fill:var(--ink2)}.si-sv-l{stroke:var(--ink3);stroke-width:1.4}.si-sv-nuoli{fill:var(--ink3)}'
    ].join('\n');
  }

  if (typeof document !== 'undefined' && document.head) tmSanastoInfoAsenna(document);   // tyylit + Esc-/ulkopuolinen napautus -kuuntelijat heti latauksessa (ennen ensimmäistä ⓘ-napautusta)

  var API = { FI: FI, TERMIT: TERMIT, tmSanastoInfoHTML: tmSanastoInfoHTML, tmSanastoInfoToggle: tmSanastoInfoToggle, tmSanastoInfoAsenna: tmSanastoInfoAsenna, tmSanastoInfoCss: tmSanastoInfoCss, tmKehitysEteneeHTML: tmKehitysEteneeHTML, tmKehitysEteneeAvaa: tmKehitysEteneeAvaa, tmKehitysEteneeSulje: tmKehitysEteneeSulje };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_SANASTO_INFO = API;
})(typeof window !== 'undefined' ? window : this);
