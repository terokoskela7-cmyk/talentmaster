/* ════════════════════════════════════════════════════════════════════════
   tm_kehitystyopoyta.js — V4a: Kehitystyöpöytä V4 -kehys (docs/CODE_BRIEF_V4_KEHITYSTYOPOYTA.md §2 V4a; design 18 §1–2 + 13 §1 Tänään). PURE (ei Firebasea, ei DOMia): HTML-merkkijonot, adapterit (Master_v16, VP_v25) liittävät toiminnot.
   Sama komponentti molemmille (D38). Koko ruudun näkymä (D46): otsikkorivi ei vieri pois · ‹ › · nimi · joukkue · ikävaihe · PHV · jakson tila · ensisijainen nappi · ⋯ valikko · "Pelaajan silmin" · välilehdet Tänään · Polku · Näyttö.
   · tmKtCss()                    → tyylit: kehys + otsikkorivi (DM Sans/Cormorant, EI Archivoa — D51) + Archivo VAIN .kt-komponentin sisällä (@font-face, oma palvelin assets/fonts). Tokenit skoopattu .kt-shell:iin (--chalk/--chalk2/--amber-dim).
   · tmKtKehysHTML(x, opts)       → koko kehys. x: { pid, nimi, joukkue, ikavaihe, phv, tila (tmJaksoTila), edellinen, seuraava, jarj:{n,yht}, valilehti, silmin, tanaanHTML, polkuHTML, nayttoHTML, ladattu:{polku,naytto} }
        opts: { esc, t, lahde ('master'|'vp'), edellinenFn, seuraavaFn, valilehtiFn, toimiFn, silminFn, suljeFn, slotIds:{polku,naytto,tanaan} }
        Polku ja Näyttö ladataan vasta avattaessa (D52): ladattu:false → tyhjä paikka + data-ladattu="0".
   · tmKtTanaanHTML(y, opts)      → Tänään (vain luku): kenttä (tmKentta) + polun tila + osat sanoin + seuraava askel. y: { kenttaHTML, signaaliHTML?, rivitila, osat:[{k,teksti}], askel:{teksti, perustelu, nappi:{avain,teksti}}|null, signaali:null (V4b) }
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
    kt_kysymykset: 'Kolme kysymystä', kt_q_nakyy: 'Näkyykö ydinvahvuus pelissä?', kt_q_treeni: 'Treenataanko?', kt_q_mukana: 'Onko mukana?', kt_v_ei_tietoa: 'Ei vielä tietoa', kt_v_osaa_itsenaisesti: 'osaa itsenäisesti', kt_v_blokit: 'IDP-blokit tehty',
    kt_v_sitoumus_odottaa: 'Sitoumus odottaa', kt_v_sitoumus_vahvistamatta: 'Sitoumus tehty, vahvistus puuttuu', kt_v_sitoumus_vahvistettu: 'Sitoumus vahvistettu',
    kt_phv: 'PHV', kt_ei_askelta: 'Ei seuraavaa askelta juuri nyt.'
  };
  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : k); }
  function _tt(o, k) { return (o && typeof o.t === 'function') ? o.t(k) : k; }   // jakson tilakoneen tekstit (fi-avain → t())

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
      '.kt-tanaan{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);grid-template-areas:"kentta sig" "kentta muut";gap:20px;align-items:start}',
      '.kt-t-sig{grid-area:sig}.kt-t-kentta{grid-area:kentta}.kt-t-muut{grid-area:muut}.kt-t-sig:empty{display:none}',
      '.kt-kortti{background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:12px}',
      '.kt-otsikko-pieni{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink3);margin-bottom:6px}',
      '.kt-osarivi{font-size:13px;color:var(--ink);padding:4px 0}',   /* EI .kt-osa: se on Kenttä-komponentin (tm_kentta.js) absoluuttisesti sijoitettu osatagi — nimikolari */
      '.kt-rivi{display:flex;justify-content:space-between;gap:12px;align-items:baseline;padding:5px 0;font-size:13px;border-top:.5px solid var(--border)}.kt-rivi:first-of-type{border-top:none}',
      '.kt-rivi b{font-weight:600;color:var(--ink)}.kt-rivi span{color:var(--ink2);text-align:right}',
      '.kt-silmin .kt-hk{display:none}',
      '@media (max-width:768px){.kt-tanaan{grid-template-columns:1fr;grid-template-areas:"sig" "kentta" "muut"}.kt-ot{padding:8px 12px}.kt-nimi{font-size:19px}.kt-sivu{padding:12px}}'
    ].join('\n');
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
    var tabs = [['tanaan', 'kt_tanaan'], ['polku', 'kt_polku'], ['naytto', 'kt_nayto']].map(function (a) {
      return '<button type="button" role="tab" data-kt-valilehti="' + a[0] + '" aria-selected="' + (v === a[0] ? 'true' : 'false') + '" onclick="' + esc(opts.valilehtiFn + "('" + x.pid + "','" + a[0] + "')") + '">' + esc(t(a[1])) + '</button>';
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
      + '<span class="kt-chip ' + savy + '" data-kt-rivitila="' + esc(tila.tila) + '">' + esc(_tt(opts, tila.rivitila ? tila.rivitila.teksti : '')) + '</span>'
      + '<span style="flex:1"></span>' + ens + menu
      + '<button type="button" class="kt-nappi" aria-pressed="' + (x.silmin ? 'true' : 'false') + '" data-kt-silmin onclick="' + esc(fn('silminFn')) + '">' + esc(t('kt_silmin')) + '</button>'
      + (opts.suljeFn ? '<button type="button" class="kt-nappi kt-nappi-kuva" data-kt-sulje aria-label="' + esc(t('kt_lista')) + '" onclick="' + esc(opts.suljeFn + '()') + '">×</button>' : '')
      + '</div><div class="kt-valilehdet" role="tablist">' + tabs + '</div></header>'
      + sivu('tanaan', x.tanaanHTML, true) + sivu('polku', x.ladattu && x.ladattu.polku ? x.polkuHTML : '', x.ladattu && x.ladattu.polku) + sivu('naytto', x.ladattu && x.ladattu.naytto ? x.nayttoHTML : '', x.ladattu && x.ladattu.naytto)
      + '</div>';
  }

  function tmKtTanaanHTML(y, opts) {
    opts = opts || {}; y = y || {}; var esc = opts.esc || _esc, t = function (k) { return _txt(opts, k); };
    var osat = Array.isArray(y.osat) && y.osat.length ? y.osat.map(function (o) { return '<div class="kt-osarivi"><b>' + esc(String(o.k || '').toUpperCase()) + '</b> · ' + esc(o.teksti) + '</div>'; }).join('') : '<div class="kt-meta">' + esc(t('kt_ei_osia')) + '</div>';
    var a = y.askel;
    var askel = a ? '<div class="kt-kortti" data-kt-askel><div class="kt-otsikko-pieni">' + esc(t('kt_seuraava_askel')) + '</div><div style="font-size:14px">' + esc(a.teksti) + '</div>'
      + (a.perustelu ? '<div class="kt-meta" style="margin-top:4px">' + esc(a.perustelu) + '</div>' : '')
      + (a.nappi ? '<div style="margin-top:10px"><button type="button" class="kt-nappi kt-nappi-ens" onclick="' + esc(opts.toimiFn + "('" + y.pid + "','" + a.nappi.avain + "')") + '">' + esc(_tt(opts, a.nappi.teksti)) + '</button></div>' : '') + '</div>'
      : '';   // V4a: ei seuraava askel -korttia ilman sisältöä (signaali + askel tulevat V4b:ssä, D48)
    /* D52: mobiilissa ensimmäinen ruutu = signaali + nappi, sitten kenttä (grid-areas: sig · kentta · muut); työpöydällä kenttä vasemmalla, signaali oikealla ylhäällä. */
    return '<div class="kt-tanaan"><div class="kt-t-sig">' + (y.signaaliHTML || '') + '</div><div class="kt-t-kentta">' + (y.kenttaHTML || '') + '</div><div class="kt-t-muut">'
      + '<div class="kt-kortti"><div class="kt-otsikko-pieni">' + esc(t('kt_polun_tila')) + '</div><div style="font-size:14px">' + esc(_tt(opts, y.rivitila && y.rivitila.teksti)) + '</div></div>'
      + (y.kysymyksetHTML || '')   /* 13 §1: kolme kysymystä (henkilökunnalle lukuina) — vain kun jakso on aktiivinen */
      + '<div class="kt-kortti"><div class="kt-otsikko-pieni">' + esc(t('kt_osat')) + '</div>' + osat + '</div>' + askel + '</div></div>';
  }
  /* 13 §1 — kolme kysymystä henkilökunnalle: T = tmPolunTila(p, ctx) (lib/tm_polun_tila.js); vastaukset lukuina (§7.22 ei koske henkilökuntaa).
     opts: { esc, t, pvmFn(iso)→'4.11.', odottaaSitoumusta (bool: jakso alkanut, pelaaja ei ole vielä sitoutunut) } */
  function tmKtKysymyksetHTML(T, opts) {
    opts = opts || {}; if (!T || !Array.isArray(T.kysymykset)) return '';
    var esc = opts.esc || _esc, t = function (k) { return _txt(opts, k); };
    var otsikot = { nakyyko_fokus: 'kt_q_nakyy', treenataanko: 'kt_q_treeni', onko_mukana: 'kt_q_mukana' };
    var vastaus = function (q) {
      if (q.avain === 'onko_mukana' && opts.odottaaSitoumusta && !q.tieto) return t('kt_v_sitoumus_odottaa');
      if (!q.tieto) return t('kt_v_ei_tietoa');
      if (q.vastaus === 'osaa_itsenaisesti') return q.n + '/' + q.yht + ' ' + t('kt_v_osaa_itsenaisesti');
      if (q.vastaus === 'blokit_tehty') return q.n + '/' + q.yht + ' ' + t('kt_v_blokit');
      if (q.vastaus === 'sitoumus_odottaa') return t('kt_v_sitoumus_vahvistamatta');
      if (q.vastaus === 'sitoumus_vahvistettu') return t('kt_v_sitoumus_vahvistettu') + (q.pvm && typeof opts.pvmFn === 'function' ? ' ' + opts.pvmFn(q.pvm) : '');
      return t('kt_v_ei_tietoa');
    };
    return '<div class="kt-kortti" data-kt-kysymykset><div class="kt-otsikko-pieni">' + esc(t('kt_kysymykset')) + '</div>'
      + T.kysymykset.map(function (q) { return '<div class="kt-rivi" data-kt-kysymys="' + esc(q.avain) + '"><b>' + esc(t(otsikot[q.avain] || q.avain)) + '</b><span>' + esc(vastaus(q)) + '</span></div>'; }).join('') + '</div>';
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

  var API = { FI: FI, tmKtIkavaihe: tmKtIkavaihe, tmKtJarjestys: tmKtJarjestys, tmKtCss: tmKtCss, tmKtKehysHTML: tmKtKehysHTML, tmKtTanaanHTML: tmKtTanaanHTML, tmKtKysymyksetHTML: tmKtKysymyksetHTML, tmKtKysymyksetNakyy: tmKtKysymyksetNakyy, tmKtSitoumusOdottaa: tmKtSitoumusOdottaa, tmKtEiOikeuttaHTML: tmKtEiOikeuttaHTML, tmKtEiLoydyHTML: tmKtEiLoydyHTML, tmKtLataaHTML: tmKtLataaHTML };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_KEHITYSTYOPOYTA = API;
})(typeof window !== 'undefined' ? window : this);
