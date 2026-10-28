/* ════════════════════════════════════════════════════════════════════════
   tm_pelaajaraportti.js — K4e kohta 2, vaihe A: YHTEINEN Pelaajaraportti Kehitystyöpöydällä (Master + VP käyttävät samaa). PURE (ei Firestorea, ei DOMia). Dual-export: module.exports || window.TM_PELAAJARAPORTTI.
   Päätös PM 23.10. (.briefit/PM_VASTAUS_K4E.md): ohut raportti — hero · päätöslause · Kehityssuunnitelma (pääosio) · Tavoitteet (Masterin vapaat tavoitteet) · Psyykkinen (sama D3-lib kuin Profiilin kortissa) ·
   kehityskeskustelun merkintä · Vie PDF. EI radaria, kaarta, Scouting-linssiä eikä Ottelu-kaistaa (vaihe B / TASO-data). Vain henkilökunnalle (§7.22: pelaaja- ja perhe-app eivät lataa tätä).
   · tmRaporttiHTML(p, c) → koko raportin sisältö (yksi <article>); c: { esc, t, pid, nimi, ika, ikavaihe, nyt, voiKirjoittaa, johto, paatos:{teksti,savy}|null, kausi:{tila,malli}, jakso:{nimi,domeeni,vk,vkYht}|null,
       tavoitteet:{tila,rivit}, review:{status,ylimaaraPv,eraantyyPvm,viimeisinPvm}|null, d3HTML }
   · tmRaporttiTavoiteRivit(rivit) → tavoitteet uusin ensin (luotu.seconds)   · tmRaporttiCss() → tyylit + @media print (vain tokenit)
   Toiminnot (sivun liima): _prSulje() · _prTulosta() · _prTallennaTavoite(pid) · _prVaihdaTila(pid, tid, tila) · _ktKesAvaa(pid) · _ktTcToimi(pid,'d3_arvio') (D3-kortti).
   Tavoitteiden tallennuspolku EI muutu: seurat/{sid}/pelaajat/{pid}/tavoitteet/{id} {teksti, tavoitepvm, tila, valmentajaUid, valmentajaNimi, luotu} + pikakenttä tavoite_aktiivinen_kpl (sivun liima).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var POLKU = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_kt_polku.js').FI : ((root && root.TM_KT_POLKU && root.TM_KT_POLKU.FI) || {});   // kierrätetään Polun avaimet (ktp_*; sv olemassa)
  var FI = {
    pr_otsikko: 'Pelaajaraportti', pr_eyebrow: 'Pelaajaraportti', pr_sulje: 'Sulje', pr_pdf: 'Vie PDF',
    pr_paatos_ei: 'Ei avointa toimenpidettä juuri nyt.', pr_paatos_ots: 'Seuraava askel',
    pr_ks_ots: 'Kehityssuunnitelma', pr_ks_tila: 'Tila', pr_ks_ei_tavoitetta: 'Kauden tavoitetta ei ole asetettu.', pr_ks_jakso_ei: 'Ei jaksoa käynnissä.',
    pr_idp_aktiivinen: 'Aktiivinen', pr_idp_ehdotettu: 'Ehdotettu', pr_idp_odottaa: 'Odottaa', pr_idp_hyvaksytty: 'Hyväksytty', pr_idp_hylatty: 'Hylätty', pr_idp_puuttuu: 'Puuttuu',
    pr_tav_ots: 'Tavoitteet', pr_tav_ladataan: 'Ladataan…', pr_tav_ei: 'Ei tavoitteita vielä.', pr_tav_virhe: 'Tavoitteiden lataus epäonnistui.', pr_tav_uusi_ph: 'Uusi tavoite pelaajalle…', pr_tav_pvm: 'Tavoitepvm',
    pr_tav_tallenna: 'Tallenna tavoite', pr_tav_tavoite: 'Tavoite {pvm}', pr_tav_t_kaynnissa: 'Käynnissä', pr_tav_t_saavutettu: 'Saavutettu', pr_tav_t_kesken: 'Kesken', pr_tav_kirjoita: 'Kirjoita tavoite ensin',
    pr_tav_tallennettu: 'Tavoite tallennettu', pr_tav_tallennus_virhe: 'Tallennus epäonnistui. Yritä uudelleen.', pr_tav_paivitys_virhe: 'Päivitys epäonnistui. Yritä uudelleen.', pr_tav_tila_aria: 'Tavoitteen tila',
    pr_kk_ots: 'Kehityskeskustelu', pr_rv_ajantasalla: 'Yhteenveto ajan tasalla', pr_rv_eraantymassa: 'Yhteenveto erääntymässä', pr_rv_myohassa: 'Yhteenveto myöhässä', pr_rv_ei: 'Ei yhteenvetoa vielä',
    pr_rv_viim: 'viim. {pvm}', pr_rv_erayty: 'erääntyy {pvm}', pr_rv_yli: '{n} pv yli',
    pr_chip_synt: 'synt.', pr_chip_underdog: 'Underdog', pr_ei_oikeutta: 'Ei oikeutta tähän pelaajaan',
    pr_sub_testi: 'testattu {pvm}', pr_sub_vanha: 'mittaus on yli {kk} kk vanha'
  };

  function _t(c, k, par) {
    var v = c && typeof c.t === 'function' ? c.t(k) : null, s = (v != null && v !== k) ? v : (FI[k] != null ? FI[k] : (POLKU[k] != null ? POLKU[k] : k));
    if (par) Object.keys(par).forEach(function (n) { s = s.split('{' + n + '}').join(par[n] == null ? '' : String(par[n])); });
    return s;
  }
  function _e(c) { return (c && typeof c.esc === 'function') ? c.esc : function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]; }); }; }
  function _pvm(c, iso) { if (!iso) return ''; if (c && typeof c.pvmFn === 'function') return c.pvmFn(iso) || iso; var m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (parseInt(m[3], 10) + '.' + parseInt(m[2], 10) + '.' + m[1]) : String(iso); }
  function _label(x, c) { var y = String(x == null ? '' : x).trim().replace(/_/g, '-').toLowerCase(); if (!/^[a-zäöå -]+$/.test(y)) return ''; var k = 'ktp_dom_' + y.replace(/-/g, '_'); return POLKU[k] != null ? _t(c, k) : y; }   // avaimet: tm_kt_polku DOM_AVAIN   // = Polun domeenin esitys (tm_kt_polku.js; sv-aukot k12 avaimella)
  function _kausi(c, s) { var m = /^\s*(syksy|kevät)\s+(\d{4})\s*$/i.exec(String(s == null ? '' : s)); return m ? _t(c, m[1].toLowerCase() === 'syksy' ? 'ktp_kausi_syksy' : 'ktp_kausi_kevat', { v: m[2] }) : String(s == null ? '' : s); }   // sv-aukot k11 (= tmKtPolkuKausiNaytto)
  function _taito(c, n) { return (n && typeof c.taitoNimiFn === 'function') ? (c.taitoNimiFn(n) || n) : n; }   // sv-aukot k10/k13: tallennettu taidon nimi näyttökielelle
  function _js(esc, x) { return esc(JSON.stringify(x == null ? '' : x)); }
  var TILAT = ['kaynnissa', 'saavutettu', 'kesken'];

  function tmRaporttiTavoiteRivit(rivit) {
    return (Array.isArray(rivit) ? rivit.slice() : []).sort(function (a, b) { return ((b.luotu && b.luotu.seconds) || 0) - ((a.luotu && a.luotu.seconds) || 0); });
  }

  function _hero(p, c, esc) {
    var sub = [p.pelipaikka || p.positio || '', p.joukkue || '', c.ika != null ? (c.ika + ' v') : '', c.phv ? ('PHV ' + c.phv) : ''].filter(Boolean).map(esc).join(' · ');
    if (c.testPvm) sub += (sub ? ' · ' : '') + esc(_t(c, 'pr_sub_testi', { pvm: _pvm(c, c.testPvm) })) + (c.testVanha ? ' · ' + esc(_t(c, 'pr_sub_vanha', { kk: c.muistutusKk })) : '');
    var chips = (c.chips || []).map(function (x) { return '<span class="pr-chip">' + esc(x) + '</span>'; }).join('');
    return '<header class="pr-hero"><div class="pr-eb">' + esc(_t(c, 'pr_eyebrow')) + (c.ikavaihe ? ' · ' + esc(c.ikavaihe) : '') + '</div><h1 class="pr-nimi">' + esc(c.nimi || '') + '</h1><div class="pr-sub">' + sub + '</div>'
      + (chips ? '<div class="pr-chips">' + chips + '</div>' : '') + '</header>';
  }
  function _paatos(c, esc) {
    var x = c.paatos, teksti = x && x.teksti ? x.teksti : _t(c, 'pr_paatos_ei');
    return '<section class="pr-paatos' + (x && x.teksti && x.savy === 'teal' ? ' toimi' : '') + '" data-pr-paatos aria-label="' + esc(_t(c, 'pr_paatos_ots')) + '"><p>' + esc(teksti) + '</p></section>';
  }
  function _kehsuunnitelma(p, c, esc) {
    var k = c.kausi || { tila: 'lataa' }, h = '<section class="pr-sek" data-pr-sek="kehityssuunnitelma"><h2 class="pr-ot">' + esc(_t(c, 'pr_ks_ots')) + '</h2>';
    if (k.tila === 'lataa') h += '<p class="pr-mono">' + esc(_t(c, 'ktp_lataa')) + '</p>';
    else if (k.tila === 'virhe') h += '<p class="pr-virhe" role="alert">' + esc(_t(c, 'ktp_virhe_kausi')) + '</p>';
    else if (!k.malli) h += '<p class="pr-lause">' + esc(_t(c, 'pr_ks_ei_tavoitetta')) + '</p>';
    else {
      var m = k.malli;
      h += '<div class="pr-kausi"><div class="pr-eb">' + esc(_t(c, 'ktp_kausi')) + (m.kausi ? ' · ' + esc(_kausi(c, m.kausi)) : '') + '</div>' + (m.nimi ? '<p class="pr-iso">' + esc(_taito(c, m.nimi)) + '</p>' : '')
        + (m.omin ? '<p class="pr-lause">' + esc(_t(c, 'ktp_omin_sanoin', { teksti: m.omin })) + '</p>' : '')
        + '<p class="pr-mono">' + [m.asetettu ? _t(c, 'ktp_asetettu', { pvm: _pvm(c, String(m.asetettu && m.asetettu.toDate ? m.asetettu.toDate().toISOString() : m.asetettu).slice(0, 10)) }) : '',
          m.lahto ? _t(c, 'ktp_lahto_mitattu', { arvo: m.lahto.arvo, yks: m.lahto.yks, pvm: _pvm(c, m.lahto.pvm) }) : '', m.tavoite ? _t(c, 'ktp_tavoite_arvo', { arvo: m.tavoite.arvo, yks: m.tavoite.yks }) : ''].filter(Boolean).map(esc).join(' · ') + '</p></div>';
    }
    var tila = p.idp_tila && FI['pr_idp_' + p.idp_tila] ? _t(c, 'pr_idp_' + p.idp_tila) : '';
    if (tila) h += '<div class="pr-rivi"><span class="pr-k">' + esc(_t(c, 'pr_ks_tila')) + '</span><span>' + esc(tila) + '</span></div>';
    var j = c.jakso;
    h += '<div class="pr-jakso"><div class="pr-eb">' + esc(_t(c, 'ktp_jakso_nyt')) + '</div>' + (j && j.nimi ? '<p class="pr-iso">' + esc(j.nimi) + '</p><p class="pr-mono">' + [_label(j.domeeni, c), j.vk != null && j.vkYht ? _t(c, 'ktp_viikko', { n: j.vk, k: j.vkYht }) : ''].filter(Boolean).map(esc).join(' · ') + '</p>' : '<p class="pr-lause">' + esc(_t(c, 'pr_ks_jakso_ei')) + '</p>') + '</div>';
    return h + '</section>';
  }
  function _tavoitteet(p, c, esc) {
    var t = c.tavoitteet || { tila: 'lataa', rivit: [] }, pid = _js(esc, c.pid), h = '<section class="pr-sek" data-pr-sek="tavoitteet"><h2 class="pr-ot">' + esc(_t(c, 'pr_tav_ots')) + '</h2><div id="prTavoitteet">';
    if (t.tila === 'lataa') h += '<p class="pr-mono">' + esc(_t(c, 'pr_tav_ladataan')) + '</p>';
    else if (t.tila === 'virhe') h += '<p class="pr-virhe" role="alert">' + esc(_t(c, 'pr_tav_virhe')) + '</p>';
    else if (!t.rivit.length) h += '<p class="pr-lause">' + esc(_t(c, 'pr_tav_ei')) + '</p>';
    else h += tmRaporttiTavoiteRivit(t.rivit).map(function (r) {
      var tila = TILAT.indexOf(r.tila) >= 0 ? r.tila : 'kaynnissa';
      var sel = c.voiKirjoittaa ? '<select class="pr-sel no-print" aria-label="' + esc(_t(c, 'pr_tav_tila_aria')) + '" onchange="_prVaihdaTila(' + pid + ',' + _js(esc, r.id) + ',this.value)">' + TILAT.map(function (s) { return '<option value="' + s + '"' + (tila === s ? ' selected' : '') + '>' + esc(_t(c, 'pr_tav_t_' + s)) + '</option>'; }).join('') + '</select>' : '';
      return '<div class="pr-tav" data-pr-tavoite="' + esc(r.id) + '"><div class="pr-tav-ylä"><span class="pr-tav-teksti">' + esc(r.teksti || '') + '</span><span class="pr-badge ' + tila + '">' + esc(_t(c, 'pr_tav_t_' + tila)) + '</span></div>'
        + '<div class="pr-tav-ala"><span class="pr-mono">' + [r.tavoitepvm ? _t(c, 'pr_tav_tavoite', { pvm: _pvm(c, r.tavoitepvm) }) : '', r.valmentajaNimi || ''].filter(Boolean).map(esc).join(' · ') + '</span>' + sel + '</div></div>';
    }).join('');
    h += '</div>';
    if (c.voiKirjoittaa) h += '<div class="pr-lisaa no-print"><textarea id="prTavoiteTeksti" maxlength="300" rows="2" placeholder="' + esc(_t(c, 'pr_tav_uusi_ph')) + '" aria-label="' + esc(_t(c, 'pr_tav_uusi_ph')) + '"></textarea>'
      + '<div class="pr-lisaa-ala"><label class="pr-mono">' + esc(_t(c, 'pr_tav_pvm')) + ' <input type="date" id="prTavoitePvm"></label><button type="button" class="pr-nappi" id="prTavoiteBtn" onclick="_prTallennaTavoite(' + pid + ')">' + esc(_t(c, 'pr_tav_tallenna')) + '</button></div></div>';
    return h + '</section>';
  }
  function _keskustelu(c, esc) {
    var r = c.review, pid = _js(esc, c.pid); if (!r && !c.voiKirjoittaa) return '';
    var map = { ajantasalla: 'pr_rv_ajantasalla', eraantymassa: 'pr_rv_eraantymassa', myohassa: 'pr_rv_myohassa', ei_reviewia: 'pr_rv_ei' }, avain = r && map[r.status] ? map[r.status] : 'pr_rv_ei';
    var lisa = r ? (r.status === 'myohassa' ? ' · ' + _t(c, 'pr_rv_yli', { n: r.ylimaaraPv }) : ((r.status === 'eraantymassa' || r.status === 'ajantasalla') && r.eraantyyPvm ? ' · ' + _t(c, 'pr_rv_erayty', { pvm: _pvm(c, r.eraantyyPvm) }) : '')) + (r.viimeisinPvm ? ' · ' + _t(c, 'pr_rv_viim', { pvm: _pvm(c, r.viimeisinPvm) }) : '') : '';
    return '<section class="pr-sek pr-kk" data-pr-sek="kehityskeskustelu"><h2 class="pr-ot">' + esc(_t(c, 'pr_kk_ots')) + '</h2><div class="pr-rivi"><span>' + esc(_t(c, avain) + lisa) + '</span>'
      + (c.voiKirjoittaa ? '<button type="button" class="pr-nappi no-print" data-kt-kirjaa-keskustelu onclick="_prKirjaaKeskustelu(' + pid + ')">' + esc(_t(c, 'ktp_kirjaa_keskustelu')) + '</button>' : '') + '</div></section>';
  }

  function tmRaporttiHTML(p, c) {
    c = c || {}; p = p || {}; var esc = _e(c);
    return '<article class="pr-raportti" data-pelaajaraportti="' + esc(p.id || c.pid || '') + '"><div class="pr-ylarivi no-print"><button type="button" class="pr-nappi" data-pr-pdf onclick="_prTulosta()">' + esc(_t(c, 'pr_pdf')) + '</button>'
      + '<button type="button" class="pr-nappi ghost" data-pr-sulje onclick="_prSulje()" aria-label="' + esc(_t(c, 'pr_sulje')) + '">' + esc(_t(c, 'pr_sulje')) + '</button></div>'
      + _hero(p, c, esc) + _paatos(c, esc) + _kehsuunnitelma(p, c, esc) + _tavoitteet(p, c, esc)
      + '<section class="pr-psy" data-pr-sek="psyykkinen">' + (c.d3HTML || '') + '</section>' + _keskustelu(c, esc) + '</article>';
  }

  function tmRaporttiCss() {   // vain sivun tokenit (D169): ei hex-värejä (print: tokenit pakotetaan vaaleiksi, ei kovakoodattuja värejä)
    return '.pr-kuori{position:fixed;inset:0;z-index:9000;overflow:auto;background:var(--bg);padding:24px 16px}.pr-raportti{max-width:820px;margin:0 auto;display:flex;flex-direction:column;gap:18px;color:var(--ink);font-size:var(--fs-body)}'
      + '.pr-ylarivi{display:flex;gap:8px;justify-content:flex-end}.pr-nappi{min-height:44px;padding:0 16px;border-radius:8px;border:1px solid var(--fill);background:var(--fill);color:var(--on-fill);font-size:var(--fs-body);cursor:pointer}.pr-nappi.ghost{background:transparent;color:var(--ink);border-color:var(--line2)}'
      + '.pr-hero{background:var(--card);border:1px solid var(--line2);border-radius:12px;padding:22px 24px}.pr-eb{font-family:var(--font-m,monospace);font-size:var(--fs-eb);letter-spacing:.12em;text-transform:uppercase;color:var(--teal)}'
      + '.pr-nimi{font-family:var(--font-serif,serif);font-weight:400;font-size:var(--fs-h1);line-height:1.05;margin:6px 0 4px;color:var(--ink)}.pr-sub,.pr-mono{font-size:var(--fs-meta);color:var(--ink2)}.pr-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}'
      + '.pr-chip{font-size:var(--fs-meta);padding:2px 10px;border-radius:20px;border:1px solid var(--line2);color:var(--ink2)}'
      + '.pr-paatos{border-left:3px solid var(--line2);padding:8px 14px;color:var(--ink2)}.pr-paatos.toimi{border-left-color:var(--teal);color:var(--ink);background:var(--teal-bg)}.pr-paatos p{margin:0;font-size:var(--fs-lead)}'
      + '.pr-sek{background:var(--card);border:1px solid var(--line2);border-radius:12px;padding:20px 22px;display:flex;flex-direction:column;gap:12px}.pr-ot{font-family:var(--font-serif,serif);font-weight:500;font-size:var(--fs-h2);margin:0;color:var(--ink)}'
      + '.pr-iso{font-size:var(--fs-lead);margin:2px 0;color:var(--ink)}.pr-lause{margin:2px 0;color:var(--ink2);font-size:var(--fs-lead)}.pr-virhe{color:var(--amber);margin:0}.pr-rivi{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}.pr-k{color:var(--ink2)}'
      + '.pr-tav{border:1px solid var(--line2);border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}.pr-tav-ylä,.pr-tav-ala{display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap}.pr-tav-teksti{flex:1;min-width:0}'
      + '.pr-badge{font-size:var(--fs-meta);padding:2px 10px;border-radius:20px;border:1px solid var(--line2);color:var(--ink2)}.pr-badge.kaynnissa{border-color:var(--amber);color:var(--amber)}.pr-badge.saavutettu{border-color:var(--teal);color:var(--teal)}'
      + '.pr-sel,.pr-lisaa textarea,.pr-lisaa input{background:var(--card);color:var(--ink);border:1px solid var(--line2);border-radius:6px;font-size:var(--fs-body);padding:8px;min-height:44px;box-sizing:border-box}.pr-lisaa textarea{width:100%;resize:vertical}'
      + '.pr-lisaa{display:flex;flex-direction:column;gap:8px}.pr-lisaa-ala{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}.pr-psy details.tc-k{margin:0}'
      + '@media print{body>*:not(.pr-kuori){display:none!important}.pr-kuori{position:static!important;overflow:visible!important;padding:0!important;background:none!important}.no-print{display:none!important}'
      + ':root{--bg:Canvas;--card:Canvas;--ink:CanvasText;--ink2:CanvasText;--ink3:CanvasText;--line2:GrayText;--teal:CanvasText;--teal-bg:Canvas;--amber:CanvasText;--fill:CanvasText;--on-fill:Canvas}.pr-sek,.pr-hero{break-inside:avoid;border-color:GrayText}@page{margin:12mm}}'
      + '@media(max-width:720px){.pr-kuori{padding:12px 8px}.pr-hero,.pr-sek{padding:16px}.pr-nimi{font-size:var(--fs-h1)}}';
  }

  var API = { FI: FI, TILAT: TILAT, tmRaporttiHTML: tmRaporttiHTML, tmRaporttiTavoiteRivit: tmRaporttiTavoiteRivit, tmRaporttiCss: tmRaporttiCss };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_PELAAJARAPORTTI = API;
})(typeof window !== 'undefined' ? window : this);
