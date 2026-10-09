/* ════════════════════════════════════════════════════════════════════════
   tm_kehitystyopoyta.js — V4a: Kehitystyöpöytä V4 -kehys (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md §2 V4a; design 18 §1–2 + 13 §1 Tänään). PURE (ei Firebasea, ei DOMia): HTML-merkkijonot, adapterit (Master_v16, VP_v25) liittävät toiminnot.
   Sama komponentti molemmille (D38). Koko ruudun näkymä (D46): otsikkorivi ei vieri pois · ‹ › · nimi · joukkue · ikävaihe · PHV · jakson tila · ensisijainen nappi · ⋯ valikko · "Pelaajan silmin" · välilehdet Tänään · Polku · Näyttö.
   · tmKtCss()                    → tyylit: kehys + otsikkorivi (DM Sans/Cormorant, EI Archivoa — D51) + Archivo VAIN .kt-komponentin sisällä (@font-face, oma palvelin assets/fonts). Tokenit skoopattu .kt-shell:iin (--chalk/--chalk2/--amber-dim).
   · tmKtKehysHTML(x, opts)       → koko kehys. x: { pid, nimi, joukkue, ikavaihe, phv, tila (tmJaksoTila), edellinen, seuraava, jarj:{n,yht}, valilehti, silmin, tanaanHTML, polkuHTML, nayttoHTML, ladattu:{polku,naytto} }
        opts: { esc, t, lahde ('master'|'vp'), edellinenFn, seuraavaFn, valilehtiFn, toimiFn, silminFn, suljeFn, slotIds:{polku,naytto,tanaan} }
        Polku ja Näyttö ladataan vasta avattaessa (D52): ladattu:false → tyhjä paikka + data-ladattu="0".
   · tmKtTanaanHTML(y, opts)      → Tänään (vain luku): signaali + kenttä (tmKentta) + kolme kysymystä + osat sanoin. y: { kenttaHTML, signaaliHTML?, kysymyksetHTML?, osat:[{k,teksti}] }
   · tmKtEiOikeuttaHTML(opts) / tmKtLataaHTML(opts) / tmKtEiLoydyHTML(opts)  → "Ei oikeutta" · lataus · pelaajaa ei löydy
   Tekstit opts.t:n läpi (fi-oletukset tässä; sv-avaimet määrittelemättä → Geminin lista). Vain tokenit (ei hex-värejä). §7.22 koskee pelaajan puolta; tässä henkilökunta, mutta "Pelaajan silmin" piilottaa henkilökunnan merkinnät (.kt-hk).
   Dual-export: module.exports || window.TM_KEHITYSTYOPOYTA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    kt_ei_oikeutta: 'Ei oikeutta', kt_ei_oikeutta_ohje: 'Tämä pelaaja ei kuulu sinun joukkueeseesi. Pyydä VP:tä tai talenttivalmentajaa avaamaan.', kt_takaisin: 'Takaisin listaan', kt_lataa: 'Ladataan pelaajaa…',
    kt_ei_loydy: 'Pelaajaa ei löytynyt', kt_edellinen: 'Edellinen pelaaja', kt_seuraava: 'Seuraava pelaaja', kt_lista: 'Lista', kt_silmin: 'Pelaajan silmin', kt_valikko: 'Lisää toimintoja',
    kt_tanaan: 'Tänään', kt_polku: 'Polku', kt_nayttö: 'Näyttö', kt_nayto: 'Näyttö', kt_ladataan: 'Ladataan…', kt_polun_tila: 'Polun tila', kt_osat: 'Osat', kt_seuraava_askel: 'Seuraava askel', kt_ei_osia: 'Osat tulevat jakson mukana.',
    kt_kysymykset: 'Kolme kysymystä', kt_q_nakyy: 'Näkyykö ydinvahvuus pelissä?', kt_q_treeni: 'Treenattiinko?', kt_q_mukana: 'Onko mukana?', kt_v_ei_tietoa: 'Ei vielä tietoa', kt_v_osaa_itsenaisesti: 'osaa itsenäisesti', kt_v_blokit: 'IDP-blokit tehty',
    kt_v_sitoumus_odottaa: 'Sitoumus odottaa', kt_v_sitoumus_vahvistamatta: 'Sitoumus tehty, vahvistus puuttuu', kt_v_sitoumus_vahvistettu: 'Sitoumus vahvistettu',
    kt_phv: 'PHV', kt_ei_askelta: 'Ei seuraavaa askelta juuri nyt.',
    kt_nayto_vain_henk: 'Näyttö näkyy vain henkilökunnalle',
    kt_v_viikkoa: 'viikkoa', kt_l_vk_su: 'pelaajan viikkokatsaus su', kt_v_tulee_tanaan: 'Tulee tänään', kt_l_vk_sunnuntaina: 'pelaaja vastaa sunnuntaina',
    kt_l_viikkohavainto: 'viikkohavainto', kt_l_ei_havaintoa: 'ei vielä havaintoa', kt_l_merkitse: 'merkitse viikkohavainto',
    kt_v_sitoutui: 'Sitoutui', kt_l_vahvista: 'vahvista', kt_l_vahvista_nappi: 'Vahvista sitoumus',
    kt_st_itsenaisesti: 'itsenäisesti', kt_st_ohjatusti: 'ohjatusti', kt_st_ei_viela: 'ei vielä', kt_st_arvioi: 'arvioi', kt_st_viikon_osa: 'viikon osa',
    kt_v_itsenaisesti: 'Itsenäisesti', kt_v_ohjatusti: 'Ohjatusti', kt_v_ei_viela: 'Ei vielä', kt_v_ei_viela_havaintoa: 'Ei vielä havaintoa', kt_v_ei_tietoa_na: 'Ei vielä tietoa',
    kt_sig_why_osa: 'Viikko {n}/{vk}, osa {k} ”{nimi}” on viikon osa. Noin 10 sekuntia: näkyikö osa harjoituksissa?', kt_sig_why_osa_ilman: 'Osa {k} ”{nimi}” on viikon osa. Noin 10 sekuntia: näkyikö osa harjoituksissa?',
    kt_sig_sit_annettu: 'Sitoumus annettu {a}, vahvistettu {v}', kt_sig_sit_ei: 'Pelaaja sitoutuu sovelluksessa',
    kt_osa_tallennettu: 'Osa-arvio tallennettu', kt_tallennus_virhe: 'Tallennus epäonnistui',
    kt_pan_ei_jaksoa: 'Havaintoa ei voi merkitä tälle jaksolle', kt_pan_virhe: 'Havaintopaneelia ei voitu avata',
    kt_pan_otsikko: 'Merkitse viikkohavainto', kt_pan_osa: 'Osa', kt_pan_veo: '+ Liitä VEO-linkki', kt_pan_peru: 'Peru', kt_pan_ei_osia: 'Osat tulevat näkyviin, kun jaksolle on valittu taito.'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : k); }
  function _tt(o, k) { return (o && typeof o.t === 'function') ? o.t(k) : k; }   // jakson tilakoneen tekstit (fi-avain → t())
  function _rt(o, r) {   // rivitilan teksti (tmJaksoTeksti: yhdistelmätekstit käännetään mallina, ks. tm_aloita_jakso.js)
    var AJ; try { AJ = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_aloita_jakso.js') : (typeof window !== 'undefined' ? window.TM_ALOITA_JAKSO : null); } catch (e) { AJ = (typeof window !== 'undefined') ? window.TM_ALOITA_JAKSO : null; }
    if (AJ && typeof AJ.tmJaksoTeksti === 'function') return AJ.tmJaksoTeksti(r, o && o.t);
    return _tt(o, r ? r.teksti : '');
  }

  function tmKtCss() {
    return [
      /* Archivo VAIN Kenttä-komponentin (.kt) sisällä (D51): @font-face omalta palvelimelta (assets/fonts, ei Google Fontsia) — ei lataudu ennen kuin .kt renderöidään. */
      "@font-face{font-family:'Archivo Variable';font-style:normal;font-display:swap;font-weight:100 900;font-stretch:62% 125%;src:url(assets/fonts/archivo-latin-wdth-normal.woff2) format('woff2-variations')}",
      '.kt-shell{--kt-sans:\'DM Sans\',system-ui,sans-serif;--kt-serif:\'Cormorant Garamond\',serif}',
      '.kt-shell .kt{--font-k:\'Archivo Variable\',system-ui,sans-serif;font-family:var(--font-k)}',   /* värit/tokenit (--chalk, --chalk2, --amber-dim; .kt: --amber, --blue, --teal-dim) määritellään sivun CSS:ssä (D10) — lib ei sisällä väriarvoja */
      '.kt-shell{position:fixed;inset:0;z-index:250;overflow-y:auto;background:var(--bg);color:var(--ink);font-family:var(--kt-sans)}',
      '.kt-ot{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:.5px solid var(--border);padding:10px 16px;font-family:var(--kt-sans)}',
      '.kt-ot *{font-family:var(--kt-sans)}',   /* otsikkorivi ja napit = DM Sans, ei Archivoa */
      '.kt-ot-rivi{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.kt-nimi{font-family:var(--kt-serif);font-size:22px;line-height:1.1;color:var(--ink);margin:0}',
      '.kt-meta{font-size:12px;color:var(--ink3)}',
      '.kt-chip{display:inline-block;font-size:11px;border:.5px solid var(--border);border-radius:999px;padding:2px 8px;color:var(--ink2)}',
      '.kt-chip-amber{border-color:var(--amber);color:var(--amber)}',
      '.kt-chip-ok{border-color:var(--teal);color:var(--teal)}',
      '.kt-nappi{font-size:13px;font-weight:600;border-radius:8px;padding:8px 14px;cursor:pointer;border:.5px solid var(--teal);background:transparent;color:var(--teal);min-height:36px}',
      '.kt-nappi-ens{background:var(--teal);color:var(--on-accent,var(--bg))}',
      '.kt-nappi-kuva{padding:6px 10px;min-width:36px;border-color:var(--border);color:var(--ink2)}',
      '.kt-nappi[disabled]{opacity:.4;cursor:default}',
      '.kt-valikko{position:relative}',
      '.kt-valikko>summary{list-style:none;cursor:pointer}',
      '.kt-valikko>summary::-webkit-details-marker{display:none}',
      '.kt-valikko-lista{position:absolute;right:0;top:100%;margin-top:4px;min-width:220px;background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:6px;z-index:6;display:flex;flex-direction:column;gap:2px}',
      '.kt-valikko-lista button{text-align:left;background:none;border:none;color:var(--ink);font-size:13px;padding:8px 10px;border-radius:6px;cursor:pointer}',
      '.kt-valikko-lista button[disabled]{color:var(--ink3);cursor:default}',
      '.kt-valilehdet{display:flex;gap:4px;margin-top:8px}',
      '.kt-valilehdet button{font-size:13px;background:none;border:none;border-bottom:2px solid transparent;color:var(--ink2);padding:6px 12px;cursor:pointer}',
      '.kt-valilehdet button[aria-selected="true"]{color:var(--ink);border-bottom-color:var(--teal);font-weight:600}',
      '.kt-sivu{max-width:1100px;margin:0 auto;padding:16px}',
      /* mockup 22 osio 1 (Tänään): kaksi saraketta, alle 720 px yksi (signaali ensin, Kenttä toisena). Tokenit: --line → --border (VP:ssä --line vain .tm-kaavio-skoopissa); --teal-dim vain .kt-sisäinen → color-mix(teal); --sur ei käytössä */
      '.kt-tanaan{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:18px;align-items:start}',
      '.kt-t-oikea{display:grid;gap:12px;min-width:0}',
      '@media (max-width:720px){.kt-tanaan{grid-template-columns:minmax(0,1fr)}.kt-t-kentta{order:2}}',
      '.kt-eb{font-family:var(--font-mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal)}',
      '.kt-sig{border:1px solid var(--teal);background:color-mix(in srgb,var(--teal) 14%,transparent);border-radius:6px;padding:12px 14px;display:grid;gap:8px}',
      '.kt-sig.w{border-color:var(--amber);background:var(--amber-dim)}.kt-sig.n{border-style:dashed;background:transparent}',
      '.kt-sig-h{font-family:var(--kt-serif);font-size:24px;font-weight:500;line-height:1.05}',
      '.kt-sig-why{font-size:13.5px;color:var(--ink2)}',
      '.kt-sig-second{display:grid;gap:2px;font-size:12.5px;color:var(--ink3);border-top:1px dashed var(--border);padding-top:6px}',
      '.kt-btn{font:inherit;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:4px;border:1px solid var(--teal);background:var(--teal);color:var(--on-accent,var(--bg));cursor:pointer;min-height:36px;white-space:nowrap}',
      '.kt-btn.q{background:transparent;color:var(--teal)}.kt-btn.g{background:transparent;color:var(--ink2);border-color:var(--border)}',
      '.kt-btn:focus-visible,.kt-osa-r:focus-visible,.kt-linkki:focus-visible{outline:2px solid var(--teal);outline-offset:2px}',
      '.kt-pan{display:grid;gap:8px;border-top:1px solid var(--border);padding-top:10px}.kt-pan-h{font-size:13.5px;color:var(--ink)}.kt-pan-opts,.kt-pan-act{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.kt-q3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.kt-q3.two{grid-template-columns:repeat(2,minmax(0,1fr))}',
      '@media (max-width:720px){.kt-q3,.kt-q3.two{grid-template-columns:minmax(0,1fr)}}',
      '.kt-q{border:1px solid var(--border);border-radius:4px;padding:10px 12px;display:grid;gap:3px;background:var(--bg)}',
      '.kt-q-k{font-size:12.5px;color:var(--ink3)}.kt-q-v{font-family:var(--kt-serif);font-size:24px;line-height:1.05;font-weight:500}.kt-q-v.na{color:var(--ink3);font-size:18px}.kt-q-v.w{color:var(--amber)}.kt-q-s{font-size:12px;color:var(--ink3)}',
      '.kt-osat{display:grid;gap:4px;margin-top:6px}',
      '.kt-osa-r{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:7px 10px;border:1px solid var(--border);border-radius:4px;font:inherit;font-size:13.5px;background:var(--bg);color:var(--ink);text-align:left;width:100%}',
      'button.kt-osa-r{cursor:pointer}.kt-osa-k{font-family:var(--font-mono);font-size:12px;color:var(--teal);font-weight:500}.kt-osa-st{font-size:12px;color:var(--ink3)}',
      '.kt-osa-r.on{border-color:var(--amber)}.kt-osa-r.on .kt-osa-st{color:var(--amber);font-weight:600}.kt-osa-r.ok .kt-osa-st{color:var(--teal);font-weight:600}',
      '.kt-kortti{background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px}',
      '.kt-otsikko-pieni{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px}',
      '.kt-osarivi{font-size:13px;color:var(--ink);padding:4px 0}',   /* EI .kt-osa: se on Kenttä-komponentin (tm_kentta.js) absoluuttisesti sijoitettu osatagi — nimikolari */
      '.kt-rivi{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:5px 0;font-size:13px;border-top:.5px solid var(--border)}.kt-rivi:first-of-type{border-top:none}',
      '.kt-rivi b{font-weight:600;color:var(--ink)}.kt-rivi span{color:var(--ink2);text-align:right}',
      '.kt-silmin .kt-hk{display:none}',
      '.kt-linkki{background:none;border:none;color:var(--teal);font:inherit;padding:0;cursor:pointer;text-decoration:underline}.kt-sitoumus-rivi{padding:0 4px 12px}',
      '@media (max-width:768px){.kt-tanaan{grid-template-columns:1fr;grid-template-areas:"sig" "kentta" "muut"}.kt-ot{padding:8px 12px}.kt-nimi{font-size:19px}.kt-sivu{padding:12px}}'
    ].join('\n');
  }

  /* A8 — "Pelaajan silmin": luvut merkitään .kt-hk-luokalla (CSS piilottaa ne silmin-tilassa, sanat jäävät). Tänään + Polku vain; Näyttö on silmin-tilassa kokonaan pois (kehys).
     tmKtHk(html): jo escapetun HTML:n tekstiosista numeroryhmät (+ lyhyt yksikkö: pv/vk/kk/v/s/%) → <span class="kt-hk">. Tagien sisään ei kosketa. */
  var LUKU_RE = /\d+\+?(?:[.,/:]\d+)*\.?(?:\s?(?:pv|vk|kk|v|s|%)(?![A-Za-zÅÄÖåäö]))?/g;
  function tmKtHk(html) {
    return String(html == null ? '' : html).split(/(<[^>]*>)/).map(function (osa, i) { return i % 2 ? osa : osa.replace(LUKU_RE, '<span class="kt-hk">$&</span>'); }).join('');
  }
  /* Polku-välilehden legacy-HTML: sama merkintä DOM:ssa (tekstisolmut), ei kosketa nappeihin/lomakekenttiin/skripteihin. Palauttaa katkaisijan (MutationObserver: asynkroninen sisältö, esim. viikon lataus). */
  function tmKtHkLuvut(juuri) {
    if (!juuri || !juuri.ownerDocument || typeof juuri.ownerDocument.createTreeWalker !== 'function') return function () {};
    var doc = juuri.ownerDocument, ohita = /^(BUTTON|INPUT|SELECT|TEXTAREA|SCRIPT|STYLE|SVG|OPTION)$/i, kesken = false;
    function kasittele() {
      kesken = true;
      try {
        var solmut = [], w = doc.createTreeWalker(juuri, 4, null), n;
        while ((n = w.nextNode())) {
          var ok = true;
          for (var e = n.parentNode; e && e !== juuri; e = e.parentNode) { if (ohita.test(e.nodeName) || (e.classList && e.classList.contains('kt-hk'))) { ok = false; break; } }
          if (ok) { LUKU_RE.lastIndex = 0; if (LUKU_RE.test(n.nodeValue)) solmut.push(n); }
        }
        solmut.forEach(function (sn) {
          var tmp = doc.createElement('span'); tmp.innerHTML = tmKtHk(_esc(sn.nodeValue));
          var frag = doc.createDocumentFragment(); while (tmp.firstChild) frag.appendChild(tmp.firstChild);
          sn.parentNode.replaceChild(frag, sn);
        });
      } finally { kesken = false; }
    }
    kasittele();
    var MO = doc.defaultView && doc.defaultView.MutationObserver; if (typeof MO !== 'function') return function () {};
    var mo = new MO(function () { if (!kesken) kasittele(); });
    mo.observe(juuri, { childList: true, subtree: true });
    return function () { mo.disconnect(); };
  }

  function _nappi(cls, teksti, fn, esc, extra) { return '<button type="button" class="kt-nappi ' + cls + '" ' + (extra || '') + (fn ? ' onclick="' + esc(fn) + '"' : ' disabled') + '>' + esc(teksti) + '</button>'; }

  function tmKtKehysHTML(x, opts) {
    opts = opts || {}; x = x || {}; var esc = opts.esc || _esc, t = function (k) { return _txt(opts, k); }, pid = esc(x.pid);
    var tila = x.tila || { tila: 'ei_jaksoa', ensisijainen: null, valikko: [], rivitila: { teksti: '', savy: 'neutraali' } };
    var fn = function (nimi) { return opts[nimi] ? opts[nimi] + "('" + pid + "')" : ''; };
    var ens = tila.ensisijainen ? '<button type="button" class="kt-nappi kt-nappi-ens" data-kt-ensisijainen="' + esc(tila.ensisijainen.avain) + '" onclick="' + esc(opts.toimiFn + "('" + x.pid + "','" + tila.ensisijainen.avain + "')") + '">' + esc(_tt(opts, tila.ensisijainen.teksti)) + '</button>' : '';
    var valikko = (tila.valikko || []).filter(function (m) { return m; });
    var menu = valikko.length ? '<details class="kt-valikko"><summary class="kt-nappi kt-nappi-kuva" aria-label="' + esc(t('kt_valikko')) + '">⋯</summary><div class="kt-valikko-lista" role="menu">'
      + valikko.map(function (m) { return '<button type="button" role="menuitem" data-kt-valikko="' + esc(m.avain) + '"' + (m.kaytettavissa === false ? ' disabled' : ' onclick="' + esc(opts.toimiFn + "('" + x.pid + "','" + m.avain + "')") + '"') + '>' + esc(_tt(opts, m.teksti)) + '</button>'; }).join('') + '</div></details>' : '';
    var savy = tila.rivitila && tila.rivitila.savy === 'amber' ? 'kt-chip-amber' : (tila.rivitila && tila.rivitila.savy === 'ok' ? 'kt-chip-ok' : '');
    var jarj = x.jarj && x.jarj.yht ? '<span class="kt-meta" aria-label="' + esc(x.jarj.n + '/' + x.jarj.yht) + '">' + esc(x.jarj.n + '/' + x.jarj.yht) + '</span>' : '';
    var v = x.valilehti || 'tanaan', slot = opts.slotIds || {};
    if (x.silmin && v === 'naytto') v = 'tanaan';   // A8: Näyttö ei ole pelaajan silmin -tilassa käytössä
    var tabs = [['tanaan', 'kt_tanaan'], ['polku', 'kt_polku'], ['naytto', 'kt_nayto']].map(function (a) {
      var pois = x.silmin && a[0] === 'naytto';   // A8: Näyttö näkyy vain henkilökunnalle
      return '<button type="button" role="tab" data-kt-valilehti="' + a[0] + '" aria-selected="' + (v === a[0] ? 'true' : 'false') + '"' + (pois ? ' disabled aria-disabled="true" title="' + esc(t('kt_nayto_vain_henk')) + '"' : ' onclick="' + esc(opts.valilehtiFn + "('" + x.pid + "','" + a[0] + "')") + '"') + '>' + esc(t(a[1])) + '</button>';
    }).join('');
    var sivu = function (nimi, html, ladattu) {
      return '<section class="kt-sivu" role="tabpanel" id="' + esc(slot[nimi] || ('ktSivu_' + nimi)) + '" data-kt-sivu="' + nimi + '" data-ladattu="' + (ladattu ? '1' : '0') + '"' + (v === nimi ? '' : ' hidden') + '>' + (html || '') + '</section>';
    };
    return '<div id="ktNakyma" class="kt-shell' + (x.silmin ? ' kt-silmin' : '') + '" data-kt-pid="' + pid + '" data-kt-valilehti-nyt="' + esc(v) + '" data-kt-tila="' + esc(tila.tila) + '">'
      + '<header class="kt-ot"><div class="kt-ot-rivi">'
      + _nappi('kt-nappi-kuva', '‹', fn('edellinenFn') && x.edellinen ? fn('edellinenFn') : '', esc, 'aria-label="' + esc(t('kt_edellinen')) + '" data-kt-edellinen')
      + _nappi('kt-nappi-kuva', '›', fn('seuraavaFn') && x.seuraava ? fn('seuraavaFn') : '', esc, 'aria-label="' + esc(t('kt_seuraava')) + '" data-kt-seuraava') + jarj
      + '<h1 class="kt-nimi">' + esc(x.nimi) + '</h1>'
      + '<span class="kt-meta">' + esc([x.joukkue, x.ikavaihe].filter(Boolean).join(' · ')) + '</span>'
      + (x.phv ? '<span class="kt-chip kt-hk">' + esc(t('kt_phv')) + ' ' + esc(x.phv) + '</span>' : '')
      + '<span class="kt-chip ' + savy + '" data-kt-rivitila="' + esc(tila.tila) + '">' + esc(_rt(opts, tila.rivitila)) + '</span>'
      + '<span style="flex:1"></span>' + ens + menu
      + '<button type="button" class="kt-nappi" aria-pressed="' + (x.silmin ? 'true' : 'false') + '" data-kt-silmin onclick="' + esc(fn('silminFn')) + '">' + esc(t('kt_silmin')) + '</button>'
      + (opts.suljeFn ? '<button type="button" class="kt-nappi kt-nappi-kuva" data-kt-sulje aria-label="' + esc(t('kt_lista')) + '" onclick="' + esc(opts.suljeFn + '()') + '">×</button>' : '')
      + '</div><div class="kt-valilehdet" role="tablist">' + tabs + '</div></header>'
      + sivu('tanaan', x.tanaanHTML, true) + sivu('polku', x.ladattu && x.ladattu.polku ? x.polkuHTML : '', x.ladattu && x.ladattu.polku) + sivu('naytto', x.silmin ? '<div class="kt-meta" data-kt-nayto-pois>' + esc(t('kt_nayto_vain_henk')) + '</div>' : (x.ladattu && x.ladattu.naytto ? x.nayttoHTML : ''), !x.silmin && x.ladattu && x.ladattu.naytto)
      + '</div>';
  }

  /* Tänään (mockup 22 osio 1): koottu osa-HTML:stä. y: { kenttaHTML, signaaliHTML, kysymyksetHTML, osatHTML }. DOM-järjestys: Kenttä, sitten oikea sarake (signaali → kysymykset → Osat); alle 720 px Kenttä toisena (CSS order). */
  function tmKtTanaanHTML(y) {
    y = y || {};
    return '<div class="kt-tanaan"><div class="kt-t-kentta">' + (y.kenttaHTML || '') + '</div><div class="kt-t-oikea">' + (y.signaaliHTML || '') + (y.kysymyksetHTML || '') + (y.osatHTML || '') + '</div></div>';
  }
  function _fmt(str, o) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return o && o[k] != null ? o[k] : m; }); }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }

  /* Osan nimi ja selitys. Teksti jaetaan ensimmäisestä kaksoispisteestä; jos sitä edeltävä osa on alle 3 sanaa tai alle 20 merkkiä, nimeksi tulee KOKO teksti ("Valitse: hyökkää palloa vastaan…" ei saa jäädä pelkäksi "Valitse"). */
  function tmKtOsaJako(teksti) {
    var s = String(teksti == null ? '' : teksti).trim(), i = s.indexOf(':'); if (i < 0) return { nimi: s, selitys: '' };
    var ed = s.slice(0, i).trim(), sanoja = ed ? ed.split(/\s+/).length : 0;
    if (sanoja < 3 || ed.length < 20) return { nimi: s, selitys: '' };
    return { nimi: ed, selitys: s.slice(i + 1).trim() };
  }
  /* Jakson KAIKKI osat tiloineen henkilökunnalle (sama lähde kuin paneeli ja Polun otsikko): [{k, koodi, teksti, nimi, tila:'itsenaisesti'|'ohjatusti'|'ei_viela'|null}]. ctx: { kaanon }. Pelaajasovelluksen kolmen osan raja ei koske tätä. */
  var OSA_TILAT = { 1: 'ei_viela', 2: 'ohjatusti', 3: 'itsenaisesti' };
  function tmKtOsat(jf, ctx) {
    var TK = _TKt(); if (!TK || !jf || typeof jf !== 'object' || jf.tila === 'valittavana') return [];
    var oa = (jf.osa_arviot && jf.konsepti_avain && jf.osa_arviot[jf.konsepti_avain]) || {};
    return TK.tmTanaanOsat(jf, { kaanon: ctx && ctx.kaanon, max: 26 }).map(function (o) { var koodi = o.koodi || '·'; return { k: o.k, koodi: koodi, teksti: o.teksti, nimi: tmKtOsaJako(o.teksti).nimi, tila: OSA_TILAT[oa[koodi]] || null }; });
  }
  /* YKSI sääntö: viikon osa = ensimmäinen osa järjestyksessä, jonka tila ei ole "itsenäisesti". Kaikki itsenäisesti (tai ei osia) → null. VP ja Master käyttävät tätä. */
  function tmKtViikonOsa(osat) { var l = Array.isArray(osat) ? osat : []; for (var i = 0; i < l.length; i++) if (l[i] && l[i].tila !== 'itsenaisesti') return l[i]; return null; }
  /* Polun otsikko "n/m osaa hallussa": m = kaikki osat. */
  function tmKtOsatYhteenveto(osat) { var l = Array.isArray(osat) ? osat : []; return { n: l.filter(function (o) { return o && o.tila === 'itsenaisesti'; }).length, m: l.length }; }

  /* A11 — jakson viikkokatsaukset yhteen riviin. docs = luetut dokumentit (≤ raja; null = ei ladattu / ei käynnissä → null), tanaan = tmPaivaIso() (paikallinen päivä, ei UTC; CLAUDE.md §7.26).
     → { n (vastattuja viikkoja), vk (jakson kuluva viikko), viimeisin (sunnuntain pvm | null), sunnuntai, vastattuTanaan, rajattu (docs.length ≥ raja → n voi olla alaraja) }; vain tämän jakson dokumentit (jakso_alkoi == jakson alku). */
  function _K4() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_viikkokatsaus.js') : (root && root.TM_VIIKKOKATSAUS); } catch (e) { return root && root.TM_VIIKKOKATSAUS; } }
  function _TKt() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_tanaan_kentta.js') : (root && root.TM_TANAAN_KENTTA); } catch (e) { return root && root.TM_TANAAN_KENTTA; } }
  function _pn(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : null; }
  function tmKtVkKooste(p, docs, tanaan, raja) {
    var K4 = _K4(); if (!K4 || !Array.isArray(docs) || !tanaan || _pn(tanaan) == null) return null;
    var alkoi = K4.tmVkJaksoAlkoi(p && p.jaksofokus); if (!alkoi) return null;
    var rel = docs.filter(function (d) { return d && d.jakso_alkoi === alkoi && Array.isArray(d.vastaukset) && d.vastaukset.length && String(d.id) <= tanaan; }).sort(function (a, b) { return String(a.id || '') < String(b.id || '') ? -1 : 1; });
    var TK = _TKt(), x = TK ? TK.tmTanaanTila(p, { tanaan: tanaan }) : null;
    var vk = x && x.viikko ? x.viikko.n : Math.max(1, Math.floor((_pn(tanaan) - _pn(alkoi)) / 7) + 1);
    return { n: rel.length, vk: vk, viimeisin: rel.length ? String(rel[rel.length - 1].id) : null, sunnuntai: new Date(_pn(tanaan) * 86400000).getUTCDay() === 0, vastattuTanaan: rel.some(function (d) { return d.id === tanaan; }), rajattu: docs.length >= (raja || 6) };
  }
  /* Päivä muodossa d.m. (ISO-päivä sellaisenaan; aikaleima → paikallinen päivä). pvmFn-syöte ohitetaan: yksi muoto kaikkialla Tänäänissä. */
  function _pvmTxt(opts, iso) {
    if (!iso) return '';
    var s = String(iso), m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) { var d = new Date(s); if (isNaN(d.getTime())) return s; m = [0, d.getFullYear(), d.getMonth() + 1, d.getDate()]; }
    return (+m[3]) + '.' + (+m[2]) + '.';
  }
  var OTSIKOT = { nakyyko_fokus: 'kt_q_nakyy', treenataanko: 'kt_q_treeni', onko_mukana: 'kt_q_mukana' };
  var TILA_V = { itsenaisesti: 'kt_v_itsenaisesti', ohjatusti: 'kt_v_ohjatusti', ei_viela: 'kt_v_ei_viela' }, TILA_ST = { itsenaisesti: 'kt_st_itsenaisesti', ohjatusti: 'kt_st_ohjatusti', ei_viela: 'kt_st_ei_viela' };
  function _q(esc, avain, k, v, cls, s) { return '<div class="kt-q" data-kt-kysymys="' + esc(avain) + '"><span class="kt-q-k">' + esc(k) + '</span><span class="kt-q-v' + (cls ? ' ' + cls : '') + '">' + tmKtHk(esc(v)) + '</span>' + (s ? '<span class="kt-q-s" data-kt-lahde>' + s + '</span>' : '') + '</div>'; }

  /* Kysymyskortit (mockup .q3): KAKSI korttia — Näkyykö ydinvahvuus pelissä? (viikon osan tila sanana) · Treenattiinko? (viikkokatsaukset, A11) — ja kolmas vain kun sitoumus odottaa vahvistusta ("Sitoutui · vahvista").
     Ei otsikkoa. Näytetään kun jakso on aktiivinen. d: { osat, viikonOsa, vk (tmKtVkKooste|null), sit (tmSitoumus), nakyy, toimiFn, pid, pvmFn } — c: { esc, t }. */
  function tmKtKysymyksetHTML(d, c) {
    d = d || {}; c = c || {}; if (!d.nakyy) return '';
    var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, link = function (avain, teksti, extra) { return c.toimiFn && c.pid ? '<button type="button" class="kt-linkki" ' + (extra || '') + ' onclick="' + esc(c.toimiFn + '(' + JSON.stringify(c.pid) + ',' + JSON.stringify(avain) + ')') + '">' + esc(teksti) + '</button>' : esc(teksti); };
    var osat = d.osat || [], vo = d.viikonOsa, q1v, q1c = '';
    if (vo && vo.tila) q1v = t(TILA_V[vo.tila]);
    else if (!vo && osat.length) q1v = t('kt_v_itsenaisesti');   // kaikki osat itsenäisesti
    else { q1v = t('kt_v_ei_viela_havaintoa'); q1c = 'na'; }
    var q1s = (q1c === 'na' ? link('havainto', t('kt_l_merkitse'), 'data-kt-havainto') : link('havainto', t('kt_l_viikkohavainto'), 'data-kt-havainto-muuta'));
    var k = d.vk, q2v, q2c = '', q2s = '';
    if (k && k.n > 0) { q2v = k.n + (k.rajattu && k.vk > k.n ? '+' : '') + '/' + k.vk + ' ' + t('kt_v_viikkoa'); q2s = tmKtHk(esc(t('kt_l_vk_su') + ' ' + _pvmTxt(c, k.viimeisin))); }
    else if (k && k.sunnuntai && !k.vastattuTanaan) { q2v = t('kt_v_tulee_tanaan'); q2c = 'w'; }
    else if (k) { q2v = t('kt_v_ei_viela'); q2c = 'na'; q2s = esc(t('kt_l_vk_sunnuntaina')); }
    else { q2v = t('kt_v_ei_tietoa_na'); q2c = 'na'; }
    var odottaa = !!(d.sit && d.sit.sitoutunut && !d.sit.vahvistettu);
    var q3 = odottaa ? '<div class="kt-q" data-kt-sitoumus="kortti"><span class="kt-q-k">' + esc(t('kt_q_mukana')) + '</span><span class="kt-q-v">' + esc(t('kt_v_sitoutui')) + '</span><span class="kt-q-s">' + tmKtHk(esc(_pvmTxt(c, d.sit.annettu_pvm))) + ' · ' + link('vahvista_sitoumus', t('kt_l_vahvista'), 'data-kt-vahvista-sitoumus') + '</span></div>' : '';
    return '<div class="kt-q3' + (odottaa ? '' : ' two') + '" data-kt-kysymykset>' + _q(esc, 'nakyyko_fokus', t(OTSIKOT.nakyyko_fokus), q1v, q1c, q1s) + _q(esc, 'treenataanko', t(OTSIKOT.treenataanko), q2v, q2c, q2s) + q3 + '</div>';
  }
  /* Osat-kortti (.osat): yläotsikko "OSAT · {jakson nimi}", rivi = painike (osaFn(pid, koodi) avaa viikkohavaintopaneelin tämä osa valittuna) tai pelkkä näyttö (Master: ei osaFn). Tilat: itsenäisesti · ohjatusti · ei vielä · arvioi; viikon osa: "viikon osa". */
  function tmKtOsatHTML(d, c) {
    d = d || {}; c = c || {}; var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, osat = d.osat || [];
    var rivit = osat.length ? osat.map(function (o) {
      var on = d.viikonOsa && d.viikonOsa.koodi === o.koodi, cls = 'kt-osa-r' + (on ? ' on' : (o.tila === 'itsenaisesti' ? ' ok' : '')), st = on ? t('kt_st_viikon_osa') : (o.tila ? t(TILA_ST[o.tila]) : t('kt_st_arvioi'));
      var sis = '<span class="kt-osa-k">' + esc(o.k) + '</span><span>' + esc(o.nimi) + '</span><span class="kt-osa-st">' + esc(st) + '</span>';
      return c.osaFn && c.pid ? '<button type="button" class="' + cls + '" data-kt-osa="' + esc(o.koodi) + '" onclick="' + esc(c.osaFn + '(' + JSON.stringify(c.pid) + ',' + JSON.stringify(o.koodi) + ')') + '">' + sis + '</button>' : '<div class="' + cls + '" data-kt-osa="' + esc(o.koodi) + '">' + sis + '</div>';
    }).join('') : '<div class="kt-meta">' + esc(t('kt_ei_osia')) + '</div>';
    return '<div data-kt-osat><span class="kt-eb">' + esc(t('kt_osat') + (d.jaksoNimi ? ' · ' + d.jaksoNimi : '')) + '</span><div class="kt-osat">' + rivit + '</div></div>';
  }
  /* Viikkohavaintopaneeli (D100) signaalikortin sisällä: otsikko näyttää valitun osan kirjaimen ja nimen; kolme .btn.q (valittu = täytetty); napautus tallentaa (tallennaFn → _vpJfOsaArvioSet, ei uutta kirjoituspolkua). VEO-linkki ja Peru. */
  function tmKtPaneeliHTML(d, c) {
    d = d || {}; c = c || {}; var esc = c.esc || _esc, t = function (k) { return _txt(c, k); }, osat = d.osat || [];
    var o = osat.filter(function (x) { return x.koodi === d.valittu; })[0] || d.viikonOsa || osat[0] || null, pid = c.pid;
    var fn = function (nimi, args) {   // rikkinäistä onclickiä ei renderöidä hiljaa: puuttuva funktio/argumentti (esim. pid) → virhe
      if (!nimi || args.some(function (a) { return a == null || a === ''; })) throw new Error('tmKtPaneeliHTML: onclick-argumentti puuttuu (' + nimi + ': ' + JSON.stringify(args) + ')');
      return esc(nimi + '(' + args.map(function (a) { return JSON.stringify(a); }).join(',') + ')');
    };
    var h = '<div class="kt-pan" data-kt-havainto-paneeli><div class="kt-pan-h">' + esc(t('kt_pan_otsikko')) + (o ? ' · ' + esc(o.k) + ' ' + esc(o.nimi) : '') + '</div>';
    if (!o) h += '<div class="kt-meta">' + esc(t('kt_pan_ei_osia')) + '</div>';
    else h += '<div class="kt-pan-opts">' + [['ei_viela', 1], ['ohjatusti', 2], ['itsenaisesti', 3]].map(function (a) {
      return '<button type="button" class="kt-btn' + (o.tila === a[0] ? '' : ' q') + '" data-kt-havainto-arvo="' + a[1] + '" onclick="' + fn(c.tallennaFn, [pid, d.avain, o.koodi, a[1]]) + '">' + esc(t(TILA_V[a[0]])) + '</button>';
    }).join('') + '</div>';
    return h + '<div class="kt-pan-act"><button type="button" class="kt-btn g" data-kt-havainto-veo onclick="' + fn(c.veoFn, [pid]) + '">' + esc(t('kt_pan_veo')) + '</button><button type="button" class="kt-btn g" data-kt-havainto-peru onclick="' + fn(c.peruFn, []) + '">' + esc(t('kt_pan_peru')) + '</button></div></div>';
  }

  /* YKSI kirjoitusydin osa-arvion tallennukselle (VP + Master; A13 jatko 3): paikallinen päivitys heti, tmPaivitaJaksofokus (dot-polku jaksofokus.osa_arviot.<konsepti> — vain tämä alikenttä),
     getIdToken(true), update. A-sarjassa viimeisin merkintä korvaa edellisen (tekijä/pvm-tietue tulee B1:ssä, D108). Rules: oman joukkueen valmentaja / johto / SA saavat päivittää pelaajadokumentin (jaksofokus).
     d: { db, sid, auth (() => currentUser), KS (TM_KEHITYSSILMUKKA), demo, toast(teksti, 'ok'|'error'), t, viesti, demoLisa, virheTeksti(teksti, virhe), paivita }
     → Promise<boolean> (true = tallennettu tai demo-lokaali; false = ei jaksoa / virhe — virhe näkyy toastina). */
  function tmKtTallennaOsaArvio(d, p, konsepti, koodi, arvo) {
    d = d || {}; var jf = p && p.jaksofokus, ilm = function (txt, tyyppi) { if (typeof d.toast === 'function') d.toast(txt, tyyppi); };
    if (!jf || !konsepti || !koodi || !d.KS) return Promise.resolve(false);
    jf.osa_arviot = jf.osa_arviot || {};
    var uusi = Object.assign({}, jf.osa_arviot[konsepti]); uusi[koodi] = arvo; jf.osa_arviot[konsepti] = uusi;   // paikallinen näyttö heti
    var osa = String(konsepti).indexOf('.') >= 0 ? { osa_arviot: jf.osa_arviot } : { ['osa_arviot.' + konsepti]: uusi }, polut = d.KS.tmPaivitaJaksofokus(p, osa).polut, viesti = d.viesti || _txt(d, 'kt_osa_tallennettu');
    if (d.demo || !d.sid) { ilm(viesti + (d.demoLisa || ''), 'ok'); if (d.paivita) d.paivita(); return Promise.resolve(true); }
    return Promise.resolve().then(function () { var cu = typeof d.auth === 'function' ? d.auth() : null; return cu ? cu.getIdToken(true) : null; })
      .then(function () { return d.db.collection('seurat').doc(d.sid).collection('pelaajat').doc(p.id).update(polut); })
      .then(function () { ilm(viesti + ' ✓', 'ok'); if (d.paivita) d.paivita(); return true; })
      .catch(function (e) { if (typeof console !== 'undefined') console.warn('[osa-arvio]', e && e.message); var txt = _txt(d, 'kt_tallennus_virhe'); ilm(typeof d.virheTeksti === 'function' ? d.virheTeksti(txt, e) : txt, 'error'); return false; });
  }
  /* Viikkohavaintopaneelin käsittelijät (VP + Master, yksi toteutus): tilan (S.havaintoAuki/-Osa) hallinta, oikeustarkistus, VEO = Lisää klippi, tallennus = d.kirjoita (→ tmKtTallennaOsaArvio).
     d: { S, pelaaja(pid), voi(p), toast, eiOikeutta (teksti), nayta(), kirjoita(p, avain, koodi, arvo), veo(pid) } → { avaa(pid, koodi?), sulje(), veo(pid), tallenna(pid, avain, koodi, arvo) } */
  function tmKtHavaintoKasittelijat(d) {
    var S = d.S, sulje = function () { S.havaintoAuki = null; S.havaintoOsa = null; };
    return {
      avaa: function (pid, koodi) { var p = d.pelaaja(pid); if (!p) return false; if (!d.voi(p)) { if (d.toast) d.toast(typeof d.eiOikeutta === 'function' ? d.eiOikeutta() : d.eiOikeutta, 'err'); return false; } S.havaintoAuki = pid; S.havaintoOsa = koodi || null; d.nayta(); return true; },
      sulje: function () { sulje(); d.nayta(); },
      veo: function (pid) { return d.veo(pid); },
      tallenna: function (pid, avain, koodi, arvo) { var p = d.pelaaja(pid); if (!p || !d.voi(p)) return false; sulje(); d.kirjoita(p, avain, koodi, arvo); d.nayta(); return true; }   // paikallinen päivitys tapahtuu synkronisesti ennen kirjoitusta → näyttö heti
    };
  }

  /* KOKO Tänään-näkymä (VP + Master; shell antaa vain datan ja funktioiden nimet). p = pelaaja, tila = tmJaksoTila.
     c: { esc, t, pvmFn, hk, toimiFn, osaFn, tallennaFn, veoFn, peruFn, paneeli (bool), voiKirjoittaa (bool), kentta (HTML), kaanon (fn), tanaan (ISO),
          sigCtx: { nyt, profiili, askel, vkEiVastattu, nimi }, vk (tmKtVkKooste | null), havainto: { auki, osa } }
     Viikon osa -sääntö (tmKtViikonOsa) ohjaa signaalin perustelua, Q1:tä, Osat-korttia ja paneelin oletusta; kaikki osat itsenäisesti → havaintoa ei pyydetä. */
  function tmKtTanaanKoko(p, tila, c) {
    c = c || {}; var esc = c.esc || _esc, t = function (k) { return _txt(c, k); };
    var TS = _req('TM_TANAAN_SIGNAALI', './tm_tanaan_signaali.js'), PT = _req('TM_POLUN_TILA', './tm_polun_tila.js'), SXL = _req('TM_SITOUMUS', './tm_sitoumus.js'), TK = _TKt();
    var jf = p && p.jaksofokus, nakyy = tmKtKysymyksetNakyy(tila), kaynnissa = !!(tila && (tila.tila === 'kaynnissa' || tila.tila === 'vahvistettu'));
    var osat = tmKtOsat(jf, { kaanon: c.kaanon }), vo = kaynnissa ? tmKtViikonOsa(osat) : null, kaikkiHallussa = kaynnissa && osat.length > 0 && !vo;
    var sit = nakyy && SXL ? SXL.tmSitoumus(p) : null, sg = c.sigCtx || {};
    var sig = TS ? TS.tmTanaanSignaali(p, Object.assign({}, sg, { tila: tila, eiHavaintoa: kaikkiHallussa, rooli: c.rooli || sg.rooli }), { t: c.t }) : null, e = sig && sig.ensisijainen;
    var viikko = TK && c.tanaan ? TK.tmTanaanTila(p, { tanaan: c.tanaan }).viikko : null;
    var why = e && e.avain === 'havainto' && vo ? _fmt(t(viikko ? 'kt_sig_why_osa' : 'kt_sig_why_osa_ilman'), { n: viikko && viikko.n, vk: viikko && viikko.k, k: vo.k, nimi: vo.nimi }) : '';
    var ala = [];
    if (sit && sit.vahvistettu) ala.push(_fmt(t('kt_sig_sit_annettu'), { a: _pvmTxt(c, sit.annettu_pvm), v: _pvmTxt(c, sit.vahvistettu_pvm) }));
    else if (sit && !sit.sitoutunut) ala.push(t('kt_sig_sit_ei'));
    var paneeli = '', paneeliOikea = false;
    if (c.paneeli && c.voiKirjoittaa && c.havainto && c.havainto.auki) {
      var viesti = function (k) { return '<div class="kt-pan" data-kt-havainto-paneeli="ei"><div class="kt-meta">' + esc(t(k)) + '</div></div>'; };   // tila, jossa käyttäjälle ei näy mitään, ei saa syntyä
      if (!(jf && jf.konsepti_avain)) paneeli = viesti('kt_pan_ei_jaksoa');
      else { try { paneeli = tmKtPaneeliHTML({ osat: osat, viikonOsa: vo, valittu: c.havainto.osa, avain: jf.konsepti_avain }, Object.assign({}, c, { pid: p.id })); paneeliOikea = true; } catch (e) { if (typeof console !== 'undefined') console.error('[Tänään] viikkohavaintopaneeli:', e && e.message); paneeli = viesti('kt_pan_virhe'); } }
    }   // pid kuuluu AINA mukaan (hotfix: onclick="_ktHavaintoTallenna(,…)")
    var sigHTML = TS && e ? TS.tmTanaanSignaaliHTML(sig, { esc: esc, t: c.t, toimiFn: c.toimiFn, pid: p.id, hk: c.hk || tmKtHk, why: why, sisalto: paneeli, piilotaNappi: paneeliOikea, alarivit: ala }) : (paneeli ? '<div class="kt-sig n">' + paneeli + '</div>' : '');
    var T = nakyy && PT ? PT.tmPolunTila(p, { askel: sg.askel ? { avain: sg.askel.avain, tila: sg.askel.tila } : null, blokit: null }) : null;
    var qHTML = T ? tmKtKysymyksetHTML({ osat: osat, viikonOsa: vo, vk: c.vk, sit: sit, nakyy: nakyy }, { esc: esc, t: c.t, pvmFn: c.pvmFn, toimiFn: c.toimiFn, pid: p.id }) : '';
    var osatHTML = tmKtOsatHTML({ osat: osat, viikonOsa: vo, jaksoNimi: jf && jf.konsepti_nimi }, { esc: esc, t: c.t, osaFn: c.paneeli && c.voiKirjoittaa ? c.osaFn : null, pid: p.id });
    return tmKtTanaanHTML({ kenttaHTML: c.kentta, signaaliHTML: sigHTML, kysymyksetHTML: qHTML, osatHTML: osatHTML });
  }

  /* 13 §1: kolme kysymystä näytetään vasta kun jakso on aktiivinen (käynnissä · vahvistettu · päättynyt); "sitoumus odottaa" = tilakoneen 'vahvistettu'. Tilatunnisteet täällä, ei adaptereiden render-JS:ssä. */
  function tmKtKysymyksetNakyy(tila) { var n = tila && tila.tila; return n === 'kaynnissa' || n === 'vahvistettu' || n === 'paattynyt'; }
  function tmKtSitoumusOdottaa(tila) { return !!(tila && tila.tila === 'vahvistettu'); }
  function _tyhja(cls, otsikko, ohje, nappiTeksti, fn, esc) {
    return '<div id="ktNakyma" class="kt-shell" data-kt-tila="' + cls + '"><div class="kt-sivu" style="text-align:center;padding-top:80px"><h1 class="kt-nimi">' + esc(otsikko) + '</h1>' + (ohje ? '<p class="kt-meta" style="margin:10px 0 18px">' + esc(ohje) + '</p>' : '')
      + (fn ? '<button type="button" class="kt-nappi kt-nappi-ens" data-kt-sulje onclick="' + esc(fn) + '">' + esc(nappiTeksti) + '</button>' : '') + '</div></div>';
  }
  function tmKtEiOikeuttaHTML(opts) { opts = opts || {}; var esc = opts.esc || _esc; return _tyhja('ei_oikeutta', _txt(opts, 'kt_ei_oikeutta'), _txt(opts, 'kt_ei_oikeutta_ohje'), _txt(opts, 'kt_takaisin'), opts.suljeFn ? opts.suljeFn + '()' : '', esc); }
  function tmKtEiLoydyHTML(opts) { opts = opts || {}; var esc = opts.esc || _esc; return _tyhja('ei_loydy', _txt(opts, 'kt_ei_loydy'), '', _txt(opts, 'kt_takaisin'), opts.suljeFn ? opts.suljeFn + '()' : '', esc); }
  function tmKtLataaHTML(opts) { opts = opts || {}; var esc = opts.esc || _esc; return _tyhja('lataa', _txt(opts, 'kt_lataa'), '', '', '', esc); }

  /* Ikävaihe nimeltä (CLAUDE.md §14: 10–12 Leikkijä · 13–15 Rakentaja · 16–19 Showcase). ika vuosina | null → ''. */
  function tmKtIkavaihe(ika) { var n = Number(ika); if (ika == null || !isFinite(n) || n <= 0) return ''; return n <= 12 ? 'Leikkijä' : n <= 15 ? 'Rakentaja' : 'Showcase'; }
  /* Edellinen/seuraava listan järjestyksessä (ei kierrä ympäri: ensimmäisellä ei edellistä, viimeisellä ei seuraavaa). ids: [pid] listan järjestyksessä. */
  function tmKtJarjestys(ids, pid) {
    var l = Array.isArray(ids) ? ids : [], i = l.indexOf(pid); if (i < 0) return { edellinen: null, seuraava: null, n: 0, yht: l.length };
    return { edellinen: i > 0 ? l[i - 1] : null, seuraava: i < l.length - 1 ? l[i + 1] : null, n: i + 1, yht: l.length };
  }

  var API = { FI: FI, tmKtIkavaihe: tmKtIkavaihe, tmKtJarjestys: tmKtJarjestys, tmKtHk: tmKtHk, tmKtHkLuvut: tmKtHkLuvut, tmKtCss: tmKtCss, tmKtKehysHTML: tmKtKehysHTML, tmKtTanaanHTML: tmKtTanaanHTML, tmKtKysymyksetHTML: tmKtKysymyksetHTML, tmKtVkKooste: tmKtVkKooste, tmKtOsaJako: tmKtOsaJako, tmKtOsat: tmKtOsat, tmKtViikonOsa: tmKtViikonOsa, tmKtOsatYhteenveto: tmKtOsatYhteenveto, tmKtOsatHTML: tmKtOsatHTML, tmKtPaneeliHTML: tmKtPaneeliHTML, tmKtTanaanKoko: tmKtTanaanKoko, tmKtTallennaOsaArvio: tmKtTallennaOsaArvio, tmKtHavaintoKasittelijat: tmKtHavaintoKasittelijat, tmKtKysymyksetNakyy: tmKtKysymyksetNakyy, tmKtSitoumusOdottaa: tmKtSitoumusOdottaa, tmKtEiOikeuttaHTML: tmKtEiOikeuttaHTML, tmKtEiLoydyHTML: tmKtEiLoydyHTML, tmKtLataaHTML: tmKtLataaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KEHITYSTYOPOYTA = API;
})(typeof window !== 'undefined' ? window : this);
