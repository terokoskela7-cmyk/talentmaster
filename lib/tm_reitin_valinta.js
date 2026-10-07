/* ════════════════════════════════════════════════════════════════════════
   tm_reitin_valinta.js — K3: pelaaja valitsee seuraavan reitin (D8) ja sitoutuu (P6) (docs/CODE_BRIEF_K3_REITIN_VALINTA.md; Kaista: Tero). Vain Kenttä-lipun takana (kutsujat tarkistavat).
   Henkilökunta tarjoaa 1–2 konseptia sulussa → pelaaja valitsee (tai ehdottaa omaa) → valmentaja vahvistaa V1-modaalissa (D14). Rules v3.37 riittää: pelaaja kirjoittaa vain ydinvahvuus_valinta {vaihtoehto ≤ 60, valittu_pvm}.
   PURE (ei Firestorea, ei DOMia) + HTML-merkkijonot. Pelaaja_v7 EI lataa tm_jakso_malli.js:ää → vaihtoehtojen suodatus peilaa tmPelaajanVaihtoehdot-funktiota (sama sääntö; testi vertaa).
   TARJOUS (henkilökunta)
   · tmTarjousKortit(ehdotukset)                 → [{avain, nimi, syy, valittu:false, lause:''}] ≤ 2 (ehdotukset = tm_seuraava_askel.tmJaksoEhdotukset; syy = vain henkilökunnan "miksi?", EI koskaan pelaajalle)
   · tmTarjousOlio(kortit)                       → { ok, jaksofokus:{tila:'valittavana', vaihtoehdot:[{konsepti_avain, nimi, perustelu, vahvistettu:true}]} } | { ok:false, syy:'ei_valittu'|'tyhja'|'pitka'|'sana'|'luku'|'nimi'|'vartija_puuttuu', indeksi }
                                                  perustelu = valmentajan oma lause (≤ 120, KIELLETYT + K1:n mittaus-/lukutarkistus). Kesto ja päivät asetetaan vasta vahvistuksessa.
   · tmTarjousOsioHTML(x, opts)                  → sulkulomakkeen osio "Anna pelaajan valita seuraava reitti" (Master + VP)
   · tmHenkRivitila(p) / tmHenkRiviTeksti(r, nimi, opts) / tmHenkRiviHTML → "Valinta odottaa" | "[nimi] valitsi A" | "oma ehdotus" (Masterin pelaajalista, J4:n lista)
   · tmVahvistusEsivalinta(p)                    → { avain, nimi, oma, teksti } | null (V1-modaalin esitäyttö)
   PELAAJA
   · tmVaihtoehdot(jf)                           → vain 'valittavana' + vahvistettu:true + konsepti_avain, enintään kaksi
   · tmValintaTila(p)                            → { tila:'ei'|'valittavana'|'valittu', vaihtoehdot, valinta }  (uusi jakso alkanut / ei tarjousta → 'ei')
   · tmValintaOlio(vaihtoehto, jf, ctx{tanaan})  → { ok, data:{vaihtoehto, valittu_pvm}, oma } | { ok:false, syy }   (konsepti_avain TAI oma teksti ≤ 60 + KIELLETYT)
   · tmValintaLisaHTML(tila, opts) / tmValintaRuutuHTML(vaihtoehdot, st, opts)  → "Hyvä jakso" -kortin lisä + valintaruutu (09)
   · tmSitoumusTanaan(p, ctx{tanaan, sitoumus, ladattu}) → boolean: jakson 1. viikko + ei vielä sitoutunut tähän jaksoon (P6: sitoumus näkyy myös Tänään-sivulla)
   Tekstit opts.t:n läpi (avain → fi-oletus tässä; sv-avaimet määrittelemättä → Geminin lista). §7.22: ei lukuja, tasoja, vertailua, määräaikaa. Dual-export: module.exports || window.TM_REITIN_VALINTA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    k3_osio_otsikko: 'Anna pelaajan valita seuraava reitti', k3_osio_ohje: 'Valinnainen. Pelaaja näkee vain valitsemasi vaihtoehdot ja lauseesi. Jakso alkaa vasta kun vahvistat sen.',
    k3_osio_paalle: 'Anna pelaajan valita', k3_osio_pois: 'Ei, aloitan jakson itse', k3_osio_ei_ehdotuksia: 'Ei ehdotuksia (ei arviointia) — voit aloittaa jakson itse.',
    k3_miksi: 'miksi?', k3_lause_valm: 'Lause pelaajalle (enintään 120 merkkiä)', k3_lause_ohje: 'Yksi lause, jonka pelaaja näkee vaihtoehdon kohdalla. Ei lukuja, ei vertailua.',
    k3_sulje_tarjoa: 'Sulje jakso ja tarjoa valinta', k3_tarjottu: 'Jakso suljettu · valinta tarjottu pelaajalle ✓', k3_tarjottu_vp: 'Jakso suljettu · valinta tarjottu pelaajalle', k3_tarjous_virhe_ei_valittu: 'Valitse vähintään yksi vaihtoehto tai ota tarjous pois.',
    k3_virhe_tyhja: 'Kirjoita jokaiselle valitulle vaihtoehdolle lause pelaajalle.', k3_virhe_pitka: 'Lause on liian pitkä (enintään 120 merkkiä).',
    k3_virhe_sana: 'Lause sisältää sanan, jota pelaajalle ei näytetä.', k3_virhe_luku: 'Lause ei saa sisältää lukuja tai mittausmuotoja.', k3_virhe_nimi: 'Vaihtoehdon nimeä ei voi tarjota.',
    k3_rivi_odottaa: 'Valinta odottaa', k3_rivi_valitsi: 'valitsi', k3_rivi_oma: 'ehdotti omaa', k3_rivi_oma_merkki: 'oma ehdotus', k3_rivi_vahvista: 'Vahvista jakso',
    k3_esivalinta_reitti: 'Pelaaja valitsi seuraavan reitin', k3_esivalinta_oma: 'Pelaajan oma ehdotus',
    k3_valitse_nappi: 'Valitse seuraava reitti', k3_valittu_kortti: 'Valintasi on valmentajalla', k3_valittu_ohje: 'Valmentaja vahvistaa uuden jakson.',
    k3_ruutu_otsikko: 'Mihin haluat mennä seuraavaksi?', k3_ruutu_ohje: 'Valitse yksi. Valmentaja vahvistaa sen kanssasi.', k3_ruutu_valmentajalta: 'Valmentajalta',
    k3_oma_nappi: '+ Oma ehdotus', k3_oma_otsikko: 'Oma ehdotus', k3_oma_ohje: 'Kirjoita omin sanoin (enintään 60 merkkiä).', k3_valitsen: 'Valitsen tämän', k3_takaisin: 'Takaisin',
    k3_ruutu_ei_tarjousta: 'Valmentaja ei ole vielä tarjonnut vaihtoehtoja.',
    k3_pelaaja_virhe_tyhja: 'Valitse jokin vaihtoehto tai kirjoita oma.', k3_pelaaja_virhe_pitka: 'Kirjoitus on liian pitkä (enintään 60 merkkiä).', k3_pelaaja_virhe_sana: 'Tekstissä on sana, jota ei voi tallentaa. Kirjoita se toisin.',
    k3_sitoumus_otsikko: 'Sitoudu uuteen jaksoon'
  };
  var MAX_LAUSE = 120, MAX_OMA = 60, MAX_VAIHTOEHDOT = 2, MAX_NIMI = 80, KIRJAIMET = ['A', 'B'];

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _txt(o, k) { var v = (o && typeof o.t === 'function') ? o.t(k) : k; return (v && v !== k) ? v : FI[k]; }
  function _req(g, f) { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require(f) : (root && root[g]); } catch (e) { return root && root[g]; } }
  function _KI() { return _req('TM_KIELLETYT', './tm_kielletyt.js'); }
  function _TS() { return _req('TM_TAMAN_TUEKSI', './tm_taman_tueksi.js'); }
  function _TK() { return _req('TM_TANAAN_KENTTA', './tm_tanaan_kentta.js'); }
  function _JM() { return _req('TM_JAKSO_MALLI', './tm_jakso_malli.js'); }
  function _str(v) { return typeof v === 'string' ? v.trim() : ''; }

  /* ── Vaihtoehdot (D8): pelaaja näkee vain valmentajan vahvistamat, vain kun jakso on 'valittavana', enintään kaksi. ──
     Sama sääntö kuin tm_jakso_malli.tmPelaajanVaihtoehdot — Pelaaja_v7 ei lataa sitä libiä, joten peilaus (tests/k3_reitin_valinta.test.js vertaa kumpaakin). */
  function tmVaihtoehdot(jf) {
    if (!jf || jf.tila !== 'valittavana' || !Array.isArray(jf.vaihtoehdot)) return [];
    return jf.vaihtoehdot.filter(function (v) { return v && v.vahvistettu === true && v.konsepti_avain && typeof v.konsepti_avain === 'string'; }).slice(0, MAX_VAIHTOEHDOT);
  }

  /* ── Lause: ≤ 120 + KIELLETYT + (henkilökunnan lause) K1:n mittaus-/lukutarkistus. Vartija puuttuu → ei hyväksytä (suljettu virhe). ── */
  function _lause(s) {
    var t = _str(s);
    if (!t) return { ok: false, teksti: null, syy: 'tyhja' };
    if (t.length > MAX_LAUSE) return { ok: false, teksti: null, syy: 'pitka' };
    var KI = _KI(); if (!KI || typeof KI.tmJaksoTekstiKelpaa !== 'function') return { ok: false, teksti: null, syy: 'vartija_puuttuu' };
    if (!KI.tmJaksoTekstiKelpaa(t).ok) return { ok: false, teksti: null, syy: 'sana' };
    var TS = _TS(); if (!TS || typeof TS.tmTukiPerustelu !== 'function') return { ok: false, teksti: null, syy: 'vartija_puuttuu' };
    if (TS.tmTukiPerustelu(t) === null) return { ok: false, teksti: null, syy: 'luku' };
    return { ok: true, teksti: t, syy: null };
  }

  /* ── Tarjous (henkilökunta) ── */
  function tmTarjousKortit(ehdotukset) {
    var ulos = [], nahty = {};
    (Array.isArray(ehdotukset) ? ehdotukset : []).forEach(function (e) {
      if (!e || typeof e.konsepti_avain !== 'string' || !e.konsepti_avain || nahty[e.konsepti_avain] || ulos.length >= MAX_VAIHTOEHDOT) return;
      nahty[e.konsepti_avain] = 1;
      ulos.push({ avain: e.konsepti_avain, nimi: _str(e.konsepti_nimi) || e.konsepti_avain, syy: _str(e.syy) || null, valittu: false, lause: '' });
    });
    return ulos;
  }
  function tmTarjousOlio(kortit) {
    var valitut = (Array.isArray(kortit) ? kortit : []).map(function (k, i) { return { k: k, i: i }; }).filter(function (o) { return o.k && o.k.valittu === true; });
    if (!valitut.length || valitut.length > MAX_VAIHTOEHDOT) return { ok: false, syy: 'ei_valittu', indeksi: null };
    var KI = _KI(), vaihtoehdot = [], nahty = {};
    for (var j = 0; j < valitut.length; j++) {
      var k = valitut[j].k, i = valitut[j].i, avain = _str(k.avain), nimi = _str(k.nimi);
      if (!/^[a-z0-9_]+$/.test(avain) || avain.length > MAX_OMA || nahty[avain] || !nimi || nimi.length > MAX_NIMI) return { ok: false, syy: 'nimi', indeksi: i };
      if (!KI || typeof KI.tmJaksoTekstiKelpaa !== 'function') return { ok: false, syy: 'vartija_puuttuu', indeksi: i };
      if (!KI.tmJaksoTekstiKelpaa(nimi).ok) return { ok: false, syy: 'nimi', indeksi: i };
      var l = _lause(k.lause); if (!l.ok) return { ok: false, syy: l.syy, indeksi: i };
      nahty[avain] = 1;
      vaihtoehdot.push({ konsepti_avain: avain, nimi: nimi, perustelu: l.teksti, vahvistettu: true });
    }
    return { ok: true, jaksofokus: { tila: 'valittavana', vaihtoehdot: vaihtoehdot } };
  }
  function tmTarjousVirhe(syy, opts) { return _txt(opts, { ei_valittu: 'k3_tarjous_virhe_ei_valittu', tyhja: 'k3_virhe_tyhja', pitka: 'k3_virhe_pitka', luku: 'k3_virhe_luku', nimi: 'k3_virhe_nimi' }[syy] || 'k3_virhe_sana'); }

  /* ── Henkilökunnan rivitila: odottaa | valittu (kirjain A/B tai oma ehdotus) ── */
  function _valinta(p) { var v = p && p.ydinvahvuus_valinta; return v && typeof v.vaihtoehto === 'string' && v.vaihtoehto.trim() ? { vaihtoehto: v.vaihtoehto.trim(), pvm: v.valittu_pvm || null } : null; }
  function tmHenkRivitila(p) {
    var vs = tmVaihtoehdot(p && p.jaksofokus); if (!vs.length) return null;
    var v = _valinta(p); if (!v) return { tila: 'odottaa', kirjain: null, nimi: null, oma: false, teksti: null };
    var i = -1; vs.forEach(function (x, n) { if (i < 0 && x.konsepti_avain === v.vaihtoehto) i = n; });
    return i >= 0 ? { tila: 'valittu', kirjain: KIRJAIMET[i], nimi: vs[i].nimi || vs[i].konsepti_avain, oma: false, teksti: v.vaihtoehto, avain: vs[i].konsepti_avain }
      : { tila: 'valittu', kirjain: null, nimi: null, oma: true, teksti: v.vaihtoehto, avain: null };
  }
  function tmHenkRiviTeksti(r, pelaajaNimi, opts) {
    if (!r) return '';
    if (r.tila === 'odottaa') return _txt(opts, 'k3_rivi_odottaa');
    var nimi = _str(pelaajaNimi);
    if (r.oma) return (nimi ? nimi + ' ' : '') + _txt(opts, 'k3_rivi_oma') + ': ' + r.teksti + ' (' + _txt(opts, 'k3_rivi_oma_merkki') + ')';
    return (nimi ? nimi + ' ' : '') + _txt(opts, 'k3_rivi_valitsi') + ' ' + r.kirjain + ' · ' + r.nimi;
  }
  function tmHenkRiviHTML(r, pelaajaNimi, opts) {
    if (!r) return ''; opts = opts || {}; var esc = opts.esc || _esc;
    return '<span data-k3-rivi="' + esc(r.tila) + '" style="font-size:11.5px;color:var(--ink3)">' + esc(tmHenkRiviTeksti(r, pelaajaNimi, opts)) + '</span>';
  }
  function tmVahvistusEsivalinta(p) {
    var r = tmHenkRivitila(p); if (!r || r.tila !== 'valittu') return null;
    return { avain: r.avain, nimi: r.nimi, oma: r.oma, teksti: r.teksti };
  }

  /* ── Sulkulomakkeen osio (Master + VP). x: { paalla, kortit:[{avain,nimi,syy,valittu,lause}], ladattu }
        opts: { esc, t, paalleFn, valitseFn(i), lauseFn(i,v), pinta (CSS-tausta; Master var(--surface), VP var(--deep)) } ── */
  function tmTarjousOsioHTML(x, opts) {
    opts = opts || {}; x = x || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, kortit = Array.isArray(x.kortit) ? x.kortit : [];
    var rasti = 'font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--ink3)';
    var btn = function (fn, teksti, aktiivinen) { return '<button type="button" onclick="' + esc(fn) + '" style="font-size:11.5px;border-radius:8px;padding:6px 11px;cursor:pointer;border:.5px solid ' + (aktiivinen ? 'var(--teal)' : 'var(--border)') + ';background:' + (aktiivinen ? 'rgba(40,176,144,.14)' : 'var(--ov-1,rgba(255,255,255,.04))') + ';color:' + (aktiivinen ? 'var(--teal)' : 'var(--ink2)') + ';font-weight:' + (aktiivinen ? '600' : '400') + '">' + teksti + '</button>'; };
    var h = '<div data-k3-osio style="background:' + (opts.pinta || 'var(--surface,#1C1C1A)') + ';border:.5px solid var(--border);border-radius:10px;padding:13px;margin-bottom:10px">'
      + '<div style="' + rasti + ';margin-bottom:4px">' + T('k3_osio_otsikko') + '</div>'
      + '<div style="font-size:11px;color:var(--ink3);margin-bottom:8px">' + T('k3_osio_ohje') + '</div>';
    if (!kortit.length) return h + '<div data-k3-ei-ehdotuksia style="font-size:12px;color:var(--ink3)">' + T('k3_osio_ei_ehdotuksia') + '</div></div>';
    h += '<div style="display:flex;gap:7px;flex-wrap:wrap">' + btn(opts.paalleFn + '(true)', T('k3_osio_paalle'), !!x.paalla) + btn(opts.paalleFn + '(false)', T('k3_osio_pois'), !x.paalla) + '</div>';
    if (x.paalla) {
      h += kortit.map(function (k, i) {
        return '<div data-k3-kortti="' + i + '" style="margin-top:10px;border-top:.5px solid var(--border);padding-top:9px">'
          + '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);cursor:pointer"><input type="checkbox" ' + (k.valittu ? 'checked ' : '') + 'onchange="' + esc(opts.valitseFn) + '(' + i + ')"> <b>' + esc(KIRJAIMET[i] || '') + '</b> ' + esc(k.nimi) + '</label>'
          + (k.syy ? '<details style="margin:3px 0 0 24px"><summary style="font-size:11px;color:var(--ink3);cursor:pointer">' + T('k3_miksi') + '</summary><div style="font-size:11.5px;color:var(--ink2);margin-top:3px">' + esc(k.syy) + '</div></details>' : '')
          + (k.valittu ? '<div style="margin:8px 0 0 24px"><div style="' + rasti + ';margin-bottom:3px">' + T('k3_lause_valm') + '</div>'
            + '<textarea rows="2" maxlength="' + MAX_LAUSE + '" oninput="' + esc(opts.lauseFn) + '(' + i + ',this.value)" style="width:100%;box-sizing:border-box;background:var(--card);color:var(--ink);border:.5px solid var(--border);border-radius:8px;padding:8px;font-family:inherit;font-size:13px;resize:none">' + esc(k.lause || '') + '</textarea>'
            + '<div style="font-size:10.5px;color:var(--ink3);margin-top:3px">' + T('k3_lause_ohje') + '</div></div>' : '')
          + '</div>';
      }).join('');
    }
    return h + '</div>';
  }

  /* ── Pelaaja: tila + valintaolio ── */
  function tmValintaTila(p) {
    var vs = tmVaihtoehdot(p && p.jaksofokus); if (!vs.length) return { tila: 'ei', vaihtoehdot: [], valinta: null };
    var r = tmHenkRivitila(p);
    if (!r || r.tila !== 'valittu') return { tila: 'valittavana', vaihtoehdot: vs, valinta: null };
    return { tila: 'valittu', vaihtoehdot: vs, valinta: { avain: r.avain, nimi: r.nimi, oma: r.oma, teksti: r.teksti, kirjain: r.kirjain } };
  }
  function tmValintaOlio(vaihtoehto, jf, ctx) {
    var vs = tmVaihtoehdot(jf); if (!vs.length) return { ok: false, syy: 'ei_tarjousta' };
    var tanaan = ctx && ctx.tanaan; if (!/^\d{4}-\d{2}-\d{2}$/.test(String(tanaan || ''))) return { ok: false, syy: 'pvm' };
    var v = _str(vaihtoehto); if (!v) return { ok: false, syy: 'tyhja' };
    for (var i = 0; i < vs.length; i++) if (vs[i].konsepti_avain === v) return { ok: true, oma: false, data: { vaihtoehto: v, valittu_pvm: tanaan } };
    if (v.length > MAX_OMA) return { ok: false, syy: 'pitka' };
    var KI = _KI(); if (!KI || typeof KI.tmJaksoTekstiKelpaa !== 'function') return { ok: false, syy: 'vartija_puuttuu' };
    if (!KI.tmJaksoTekstiKelpaa(v).ok) return { ok: false, syy: 'sana' };
    return { ok: true, oma: true, data: { vaihtoehto: v, valittu_pvm: tanaan } };
  }
  function tmValintaVirhe(syy, opts) { return _txt(opts, syy === 'pitka' ? 'k3_pelaaja_virhe_pitka' : syy === 'sana' ? 'k3_pelaaja_virhe_sana' : 'k3_pelaaja_virhe_tyhja'); }

  /* ── Pelaajan HTML. Vain T1/Kenttä-tokenit (--card, --text, --teal-d, --font-k, btn-p); §7.22: ei lukuja, ei määräaikaa. ── */
  function tmValintaLisaHTML(tila, opts) {
    opts = opts || {}; var esc = opts.esc || _esc; if (!tila || tila.tila === 'ei') return '';
    if (tila.tila === 'valittu') return '<div data-k3-tila="valittu" style="margin-top:14px"><div style="font-family:var(--font-k);font-size:16px;font-weight:600;color:var(--text)">' + esc(_txt(opts, 'k3_valittu_kortti')) + '</div>'
      + '<div style="font-size:13px;color:var(--ink2);margin-top:3px">' + esc(_txt(opts, 'k3_valittu_ohje')) + '</div></div>';
    return '<div data-k3-tila="valittavana" style="margin-top:14px"><button type="button" class="btn-p" onclick="' + esc(opts.valitseFn || '') + '">' + esc(_txt(opts, 'k3_valitse_nappi')) + '</button></div>';
  }
  /* st: { valittu: avain | '__oma' | null, omaAuki: bool, oma: string, tallentaa: bool }  opts: { esc, t, kentta (HTML), valitseFn(avain), omaFn, omaTekstiFn(v), tallennaFn, takaisinFn } */
  function tmValintaRuutuHTML(vaihtoehdot, st, opts) {
    opts = opts || {}; st = st || {}; var esc = opts.esc || _esc, T = function (k) { return esc(_txt(opts, k)); }, vs = Array.isArray(vaihtoehdot) ? vaihtoehdot : [];
    var kortti = function (sel) { return 'display:block;width:100%;text-align:left;box-sizing:border-box;margin-top:10px;padding:14px 16px;border-radius:12px;cursor:pointer;background:var(--card);border:' + (sel ? '1.5px solid var(--teal-d)' : '.5px solid var(--border2, var(--border))') + ';color:var(--text);font-family:inherit'; };
    var h = '<section id="p7K3Ruutu" data-k3-ruutu style="margin:12px 20px">'
      + '<div style="font-family:var(--font-k);font-size:22px;font-weight:700;color:var(--text);line-height:1.2">' + T('k3_ruutu_otsikko') + '</div>'
      + '<div style="font-size:13px;color:var(--ink2);margin-top:4px">' + T('k3_ruutu_ohje') + '</div>' + (opts.kentta || '');
    if (!vs.length) return h + '<div style="font-size:13px;color:var(--ink2);margin-top:12px">' + T('k3_ruutu_ei_tarjousta') + '</div></section>';
    vs.forEach(function (v, i) {
      var sel = st.valittu === v.konsepti_avain;
      h += '<button type="button" data-k3-vaihtoehto="' + esc(v.konsepti_avain) + '" onclick="' + esc(opts.valitseFn) + '(\'' + esc(v.konsepti_avain) + '\')" style="' + kortti(sel) + '">'
        + '<div style="font-family:var(--font-k);font-size:17px;font-weight:600;line-height:1.25">' + esc(v.nimi || v.konsepti_avain) + '</div>'
        + (v.perustelu ? '<div style="font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--teal-d);margin-top:10px">' + T('k3_ruutu_valmentajalta') + '</div><div style="font-size:14px;color:var(--text);line-height:1.45;margin-top:3px;white-space:pre-wrap">' + esc(v.perustelu) + '</div>' : '')
        + '</button>';
    });
    var omaSel = st.valittu === '__oma';
    h += '<button type="button" data-k3-oma onclick="' + esc(opts.omaFn) + '()" style="' + kortti(omaSel) + '"><div style="font-size:15px;font-weight:600">' + T('k3_oma_nappi') + '</div></button>';
    if (st.omaAuki) h += '<div style="margin-top:8px"><div style="font-size:12px;color:var(--ink2);margin-bottom:4px">' + T('k3_oma_ohje') + '</div>'
      + '<input id="p7K3Oma" type="text" maxlength="' + MAX_OMA + '" value="' + esc(st.oma || '') + '" oninput="' + esc(opts.omaTekstiFn) + '(this.value)" style="width:100%;box-sizing:border-box;background:var(--surface2, var(--card));color:var(--text);border:.5px solid var(--border2, var(--border));border-radius:8px;padding:10px;font-family:inherit;font-size:14px"></div>';
    var voi = !st.tallentaa && (st.valittu && st.valittu !== '__oma' || (st.valittu === '__oma' && _str(st.oma)));
    h += '<button id="p7K3Tallenna" type="button" class="btn-p" onclick="' + esc(opts.tallennaFn) + '()" style="margin-top:14px"' + (voi ? '' : ' disabled') + '>' + T('k3_valitsen') + '</button>'
      + '<button type="button" onclick="' + esc(opts.takaisinFn) + '()" style="display:block;margin:10px auto 0;background:none;border:none;color:var(--ink2);font-size:13px;cursor:pointer">' + T('k3_takaisin') + '</button></section>';
    return h;
  }

  /* ── P6: sitoumus Tänään-sivulla jakson ensimmäisellä viikolla, kunnes pelaaja on sitoutunut tähän jaksoon. ──
     ctx.sitoumus = window._p7Sitoumus (pelaaja_sitoumus-olio) · ctx.ladattu = idp_kausi luettu (ennen sitä ei näytetä → ei välähdystä sitoutuneelle) */
  function tmSitoumusTanaan(p, ctx) {
    ctx = ctx || {}; var TK = _TK(), jf = p && p.jaksofokus; if (!TK || !jf || !ctx.tanaan || ctx.ladattu !== true) return false;
    var x = TK.tmTanaanTila(p, { tanaan: ctx.tanaan });
    if (x.tila !== 'jakso' && x.tila !== 'sunnuntai') return false;
    if (!x.viikko || x.viikko.n !== 1) return false;
    var s = ctx.sitoumus; if (!s || !s.sitoumus_pvm) return true;
    return s.jakso_alkoi != null && jf.alkoi != null && s.jakso_alkoi !== jf.alkoi;   // sitoumus vanhalta jaksolta → uusi jakso, sitoudu uudelleen (sama sääntö kuin _p7Vanhentunut)
  }

  var API = { FI: FI, tmTeksti: function (k, opts) { return _txt(opts, k); }, MAX_LAUSE: MAX_LAUSE, MAX_OMA: MAX_OMA, tmVaihtoehdot: tmVaihtoehdot, tmTarjousKortit: tmTarjousKortit, tmTarjousOlio: tmTarjousOlio, tmTarjousVirhe: tmTarjousVirhe, tmTarjousOsioHTML: tmTarjousOsioHTML,
    tmHenkRivitila: tmHenkRivitila, tmHenkRiviTeksti: tmHenkRiviTeksti, tmHenkRiviHTML: tmHenkRiviHTML, tmVahvistusEsivalinta: tmVahvistusEsivalinta,
    tmValintaTila: tmValintaTila, tmValintaOlio: tmValintaOlio, tmValintaVirhe: tmValintaVirhe, tmValintaLisaHTML: tmValintaLisaHTML, tmValintaRuutuHTML: tmValintaRuutuHTML, tmSitoumusTanaan: tmSitoumusTanaan };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TM_REITIN_VALINTA = API;
})(typeof window !== 'undefined' ? window : this);
