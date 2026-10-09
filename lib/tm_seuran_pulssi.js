/* ════════════════════════════════════════════════════════════════════════
   tm_seuran_pulssi.js — S2: VP:n Koti = Seuran pulssi (docs/CODE_BRIEF_S2_KOTI.md; mockupit 23 + 25; D109–D125).
   PURE: ei Firebasea, ei DOM:ia (HTML-funktiot palauttavat merkkijonoja), ei kelloa (nytMs annetaan). Dual-export: module.exports || window.TM_SEURAN_PULSSI.

   Syöte = seurat/{sid}/kooste/{vvvv-Www} -dokumentit vanhin → uusin (kooste v4/v5, lib/tm_seuran_kooste.js), vain lukumääriä joukkueittain + `yhteensa` (uniikit pelaajat).
   · tmPulssiRivit(koosteet, opts)     → rivimalli: seura-rivi, joukkuerivit IKÄJÄRJESTYKSESSÄ (D42, ei lajittelua mittarin mukaan), merkit ● ▲ ■ ○ + luku (D112),
                                         trendi vain Viikkokatsaus- ja Käyttö-sarakkeissa (D111), datan ikä (D113), käyttöönottotila (D69), Tarvitsee huomiota (D73, max 3, D115)
   · tmPulssiHTML(malli, opts)         → koko "Joukkueiden viikko" -lohko (otsikko + nauhat + tulkintalause + signaalit + taulukko + mobiilikortit + rytmilause)
   · tmPulssiTulossaHTML(tapahtumat, nytMs, opts) → "Tulossa 14 päivää" (vain otsikot ja päivät)
   TAVOITTEET ovat YKSI taulukko, jonka S3 (seuran omat tavoitteet konfiguraatio/kooste_tavoitteet) korvaa: opts.tavoitteet.
   EI nimiä (pelaajan) eikä ID:itä: vain joukkueen nimi ja lukumäärät (§7.22, D122). Vain CSS-tokenit (ei hex-värejä).
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var DAY = 86400000;
  var PIENI = 5, VANHA_PV = 8, KAYNNISTYS_VK = 4, SIGNAALI_MAX = 3, KATSELMUS_SIGNAALI_PV = 10, KAYTTO_MATALA = 25, KATTAVUUS_JOUKKUE = 2 / 3, KELTAINEN = 0.75;
  /* D45 + D65 + D70 + D72. jakso/katsaus/katselmus/käyttö ovat tavoite-%. Käytön portaat (D69): käyttöönoton 4 viikon jälkeen kuukausittain. */
  var TAVOITTEET = { kilpa: { jakso: 90, katsaus: 70, katselmus: 90, kaytto: 50 }, harraste: { jakso: 90, katsaus: 50, katselmus: 90, kaytto: 30 } };
  var KAYTTO_PORTAAT = { kilpa: [25, 40, 50], harraste: [15, 25, 30] };
  var G = { ok: '●', w: '▲', err: '■', n: '○' };

  function _esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _ms(v) { if (v == null) return null; if (typeof v === 'number') return v; if (typeof v.toMillis === 'function') return v.toMillis(); if (typeof v.toDate === 'function') return v.toDate().getTime(); if (typeof v.seconds === 'number') return v.seconds * 1000; var x = Date.parse(v); return isNaN(x) ? null : x; }
  function _num(x) { return typeof x === 'number' && isFinite(x); }
  function _pros(o, n) { return n > 0 ? Math.round(o * 100 / n * 10) / 10 : null; }
  function _p0(x) { return x == null ? null : Math.round(x); }
  function _ika(nimi) { var m = /(\d{1,2})/.exec(String(nimi || '')); return m ? parseInt(m[1], 10) : 99; }
  function _vkNum(vk) { var m = /^(\d{4})-W(\d{2})$/.exec(String(vk || '')); return m ? { v: +m[1], w: +m[2] } : null; }
  /* viikkojen ero 'vvvv-Www' → 'vvvv-Www' (ISO-viikon maanantai UTC-päivänä) */
  function _viikonAlku(vk) { var x = _vkNum(vk); if (!x) return null; var j4 = Date.UTC(x.v, 0, 4), dow = (new Date(j4).getUTCDay() + 6) % 7; return j4 - dow * DAY + (x.w - 1) * 7 * DAY; }
  function viikkoEro(a, b) { var A = _viikonAlku(a), B = _viikonAlku(b); return A == null || B == null ? null : Math.round((B - A) / (7 * DAY)); }

  /* Merkki: 'ok' ● tavoitteessa · 'w' ▲ ≥ 75 % tavoitteesta · 'err' ■ selvästi alle · 'n' ○ ei arvioida. ylaraja 'oto' → enintään ▲ (D72). */
  function tmPulssiMerkki(pros, tavoite, ylaraja) {
    if (pros == null || tavoite == null) return 'n';
    var m = pros >= tavoite ? 'ok' : pros >= KELTAINEN * tavoite ? 'w' : 'err';
    if (ylaraja === 'oto' && m === 'ok') m = 'w';
    return m;
  }
  function tmPulssiKayttoTavoite(tyyppi, viikkojaAlusta) {
    var p = KAYTTO_PORTAAT[tyyppi === 'harraste' ? 'harraste' : 'kilpa'];
    if (viikkojaAlusta == null || viikkojaAlusta < KAYNNISTYS_VK) return null;   // käyttöönotto: ei tavoitetta (○)
    return p[Math.min(p.length - 1, Math.floor((viikkojaAlusta - KAYNNISTYS_VK) / 4))];
  }

  function _laskeva(sarja) { return sarja.length === 4 && sarja.every(function (x) { return x != null; }) && sarja[0] > sarja[1] && sarja[1] > sarja[2] && sarja[2] > sarja[3]; }

  function tmPulssiRivit(koosteet, opts) {
    opts = opts || {};
    var K = (Array.isArray(koosteet) ? koosteet : []).filter(function (d) { return d && d.joukkueet && typeof d.joukkueet === 'object'; }).sort(function (a, b) { return a.vk < b.vk ? -1 : a.vk > b.vk ? 1 : 0; });
    if (!K.length) return { tyhja: true };
    var TAV = opts.tavoitteet || TAVOITTEET, nyt = K[K.length - 1], nytMs = opts.nytMs != null ? opts.nytMs : Date.now(), viim4 = K.slice(-4);
    var laskettuMs = _ms(nyt.laskettu), ikaPv = laskettuMs != null ? (nytMs - laskettuMs) / DAY : null, vanha = ikaPv != null && ikaPv > VANHA_PV;
    var ensin = opts.ensimmainenVk || K[0].vk, alusta = viikkoEro(ensin, nyt.vk);
    var onb = { paalla: alusta != null && alusta < KAYNNISTYS_VK, viikko: alusta != null ? alusta + 1 : null, viikkojaAlusta: alusta };
    var merkitPaalla = !onb.paalla && !vanha;
    var jidt = Object.keys(nyt.joukkueet).sort(function (a, b) { var A = nyt.joukkueet[a], B = nyt.joukkueet[b], d = _ika(A.nimi) - _ika(B.nimi); return d || String(A.nimi).localeCompare(String(B.nimi)); });

    var rivit = jidt.map(function (jid) {
      var m = nyt.joukkueet[jid], tyyppi = m.tyyppi === 'harraste' ? 'harraste' : 'kilpa', profiili = m.profiili === 'ammatti' ? 'ammatti' : 'oto', T = TAV[tyyppi];
      var leik = m.ikavaihe === 'leikkija', pieni = (m.n_pelaajat || 0) < PIENI, n = m.n_pelaajat || 0;
      var kayttoO = leik ? m.n_perhe_kuittaus_7 : m.n_harjoite_7, kayttoOn = _num(kayttoO);
      var kayttoT = tmPulssiKayttoTavoite(tyyppi, alusta);
      var solu = function (o, nn, tav, yla) { var p = nn > 0 ? _pros(o, nn) : null; return { o: o, n: nn, pros: p, merkki: pieni || !merkitPaalla || p == null ? 'n' : tmPulssiMerkki(p, tav, yla), tavoite: tav }; };
      var jaksolla = solu(m.n_jaksolla || 0, n, T.jakso);
      if (!m.jakso && !(m.n_jaksolla > 0)) jaksolla.merkki = pieni || !merkitPaalla ? 'n' : 'err';
      var katsaus = leik ? { ei: 'leikkija' } : ((m.n_vastausperusta || 0) > 0 ? solu(m.n_vastanneet || 0, m.n_vastausperusta, T.katsaus) : { ei: 'ei_perustaa' });
      var katselmus = (m.n_katselmus_perusta || 0) > 0 ? solu(m.n_katselmus_ajallaan || 0, m.n_katselmus_perusta, T.katselmus, profiili) : { ei: m.n_katselmus > 0 ? 'ikkuna_auki' : (m.jakso ? 'jakso_kesken' : 'ei_jaksoa') };
      var kaytto = kayttoOn ? solu(kayttoO, n, kayttoT == null ? T.kaytto : kayttoT) : { ei: 'ei_v5' };
      if (kaytto.merkki && onb.paalla) kaytto.merkki = 'n';
      // trendi: neljän viimeisen viikon luvut (D111) — vain Viikkokatsaus ja Käyttö; arvio-viikot himmennetään
      var tKatsaus = viim4.map(function (d) { var x = d.joukkueet[jid]; return x && !leik && x.n_vastausperusta > 0 ? _pros(x.n_vastanneet, x.n_vastausperusta) : null; });
      var tKaytto = viim4.map(function (d) { var x = d.joukkueet[jid], o = x && (leik ? x.n_perhe_kuittaus_7 : x.n_harjoite_7); return x && _num(o) && x.n_pelaajat > 0 ? _pros(o, x.n_pelaajat) : null; });
      var arvio = viim4.map(function (d) { return !!d.arvio; });
      // ei jaksoa montako viikkoa peräkkäin (uusin → vanhempi)
      var eiJaksoaVk = 0; for (var i = K.length - 1; i >= 0; i--) { var x = K[i].joukkueet[jid]; if (x && !x.jakso) eiJaksoaVk++; else break; }
      return { jid: jid, nimi: m.nimi || jid, ikaNum: _ika(m.nimi), ikavaihe: m.ikavaihe || null, leikkija: leik, n: n, pieni: pieni, tyyppi: tyyppi, profiili: profiili,
        jakso: { voimassa: !!m.jakso, nimi: m.jakso_nimi || null, eiJaksoaVk: m.jakso ? 0 : eiJaksoaVk }, jaksolla: jaksolla, katsaus: katsaus, katselmus: katselmus, kaytto: kaytto,
        nKatselmusAuki: m.n_katselmus || 0, katselmusPv: opts.katselmusPv && opts.katselmusPv[jid] != null ? opts.katselmusPv[jid] : null,
        trendi: { katsaus: tKatsaus, kaytto: tKaytto, arvio: arvio, katsausLaskeva3: !leik && !pieni && _laskeva(tKatsaus) } };
    });

    // ── seura-rivi: yhteensa (uniikit pelaajat) ja joukkuesummat sarakkeille, joita yhteensa ei kanna ──
    var yht = nyt.yhteensa || {}, N = _num(yht.n_pelaajat) ? yht.n_pelaajat : rivit.reduce(function (a, r) { return a + r.n; }, 0);
    var njakso = rivit.filter(function (r) { return r.jakso.voimassa; }).length;
    var sJ = 0, sN = 0, sV = 0, sP = 0, sKA = 0, sKP = 0;
    rivit.forEach(function (r) { sJ += r.jaksolla.o; sN += r.n; if (r.katsaus.n) { sV += r.katsaus.o; sP += r.katsaus.n; } if (r.katselmus.n && !r.pieni && !r.leikkija) { sKA += r.katselmus.o; sKP += r.katselmus.n; } });
    var sovKatsaus = rivit.filter(function (r) { return !r.leikkija && !r.pieni; }).length, katKatsaus = rivit.filter(function (r) { return r.katsaus.n && !r.pieni; }).length;
    var sovKats = rivit.filter(function (r) { return !r.leikkija && !r.pieni; }).length, katKats = rivit.filter(function (r) { return r.katselmus.n && !r.pieni && !r.leikkija; }).length;
    var riit = function (kat, sov) { return sov > 0 && kat >= KATTAVUUS_JOUKKUE * sov - 1e-9; };   // D125: seuratason luku vain kun ≥ 2/3 sopivista joukkueista
    var TS = TAV.kilpa, seuraKaytto = _num(yht.n_harjoite_7) && N > 0 ? _pros(yht.n_harjoite_7, N) : null;
    var sm = function (p, tav, ok) { return !merkitPaalla || p == null || !ok ? 'n' : tmPulssiMerkki(p, tav); };
    var tSeuraKatsaus = viim4.map(function (d) { var a = 0, b = 0; Object.keys(d.joukkueet).forEach(function (j) { var x = d.joukkueet[j]; if (x.ikavaihe !== 'leikkija' && x.n_vastausperusta > 0) { a += x.n_vastanneet; b += x.n_vastausperusta; } }); return b > 0 ? _pros(a, b) : null; });
    var tSeuraKaytto = viim4.map(function (d) { var y = d.yhteensa || {}; return _num(y.n_harjoite_7) && y.n_pelaajat > 0 ? _pros(y.n_harjoite_7, y.n_pelaajat) : null; });
    var seura = { n: N, joukkueita: rivit.length, njakso: njakso, joukkuePelaajaSumma: sN,
      jaksolla: { pros: _pros(sJ, sN), merkki: sm(_pros(sJ, sN), TS.jakso, true) },
      katsaus: { o: sV, n: sP, pros: riit(katKatsaus, sovKatsaus) ? _pros(sV, sP) : null, kattavuus: { kat: katKatsaus, sov: sovKatsaus }, merkki: sm(_pros(sV, sP), TS.katsaus, riit(katKatsaus, sovKatsaus)) },
      katselmus: { o: sKA, n: sKP, pros: sKP > 0 && riit(katKats, sovKats) ? _pros(sKA, sKP) : null, kattavuus: { kat: katKats, sov: sovKats }, ei: sKP === 0, merkki: sm(sKP > 0 ? _pros(sKA, sKP) : null, TS.katselmus, riit(katKats, sovKats)) },
      kaytto: { pros: seuraKaytto, merkki: sm(seuraKaytto, tmPulssiKayttoTavoite('kilpa', alusta) == null ? TS.kaytto : tmPulssiKayttoTavoite('kilpa', alusta), true) },
      trendi: { katsaus: tSeuraKatsaus, kaytto: tSeuraKaytto, arvio: viim4.map(function (d) { return !!d.arvio; }) } };
    if (onb.paalla) { seura.kaytto.merkki = 'n'; }

    var malli = { vk: nyt.vk, vkNum: (_vkNum(nyt.vk) || {}).w || null, laskettuMs: laskettuMs, ikaPv: ikaPv, vanha: vanha, arvio: !!nyt.arvio, versioVanha: !rivit.some(function (r) { return r.kaytto.ei !== 'ei_v5'; }),
      onb: onb, merkitPaalla: merkitPaalla, seura: seura, rivit: rivit, koosteita: K.length };
    var sg = tmPulssiSignaalit(malli, opts);
    malli.signaalit = sg.nakyvat; malli.signaalejaYht = sg.yht; malli.signaalejaLisaa = sg.lisaa;
    malli.ilmanJaksoa = rivit.filter(function (r) { return !r.jakso.voimassa; }).length;
    return malli;
  }

  /* D73 — järjestys: 1) ei jaksoa ≥ 2 vk → Aloita jakso · 2) katselmusikkuna ≤ 10 pv, VAIN ammatti → Sulje jakso lauseella · 3) viikkokatsaus laskenut 3 vk → Viesti valmentajalle ·
     4) käyttö < 25 % (vasta käyttöönoton jälkeen) → Viesti perheille. EI "valinta odottaa" (D68) eikä testisyklin asioita (D118). Max 3 (D115); loput lasketaan. */
  function tmPulssiSignaalit(malli, opts) {
    opts = opts || {}; var ut = [];
    var lisaa = function (n, tyyppi, r, x) { ut.push(Object.assign({ jarj: n, tyyppi: tyyppi, jid: r.jid, nimi: r.nimi, avain: tyyppi + '|' + r.jid }, x)); };
    (malli.rivit || []).forEach(function (r) { if (!r.jakso.voimassa && r.jakso.eiJaksoaVk >= 2) lisaa(1, 'ei_jaksoa', r, { vk: r.jakso.eiJaksoaVk, n: r.n }); });
    (malli.rivit || []).forEach(function (r) {
      if (r.profiili === 'ammatti' && r.nKatselmusAuki > 0 && (r.katselmusPv == null || r.katselmusPv <= KATSELMUS_SIGNAALI_PV)) lisaa(2, 'katselmusikkuna', r, { pv: r.katselmusPv, auki: r.nKatselmusAuki });
    });
    (malli.rivit || []).forEach(function (r) { if (r.trendi.katsausLaskeva3) lisaa(3, 'katsaus_laskee', r, { alku: _p0(r.trendi.katsaus[0]), loppu: _p0(r.trendi.katsaus[3]) }); });
    if (!(malli.onb && malli.onb.paalla)) (malli.rivit || []).forEach(function (r) { if (!r.pieni && r.kaytto.pros != null && r.kaytto.pros < KAYTTO_MATALA) lisaa(4, 'kaytto_matala', r, { pros: _p0(r.kaytto.pros), leikkija: r.leikkija }); });
    ut.sort(function (a, b) { return a.jarj - b.jarj; });
    var piilossa = opts.piilossa || {};   // PR 2: kuitattu/siirretty signaali piiloon kunnes ehto muuttuu / palaa_vk
    var nakyvat = ut.filter(function (s) { return !piilossa[s.avain]; });
    return { nakyvat: nakyvat.slice(0, SIGNAALI_MAX), lisaa: Math.max(0, nakyvat.length - SIGNAALI_MAX), yht: nakyvat.length, kaikki: ut };
  }

  /* ── HTML ─────────────────────────────────────────────────────────────── */
  var CSS = ''
    + '.tmp{container-type:inline-size;container-name:tmp;display:grid;gap:14px;font-family:var(--font-sans,"DM Sans",system-ui,sans-serif)}'
    + '.tmp .eb{font-family:var(--font-mono,"DM Mono",monospace);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--teal)}'
    + '.tmp .dh{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}.tmp .dh .sp{flex:1}'
    + '.tmp .chip{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 9px;border-radius:3px;border:1px solid var(--border);color:var(--ink2);white-space:nowrap}'
    + '.tmp .chip.mono{font-family:var(--font-mono,"DM Mono",monospace);color:var(--ink3);font-weight:400}.tmp .chip.w{color:var(--amber);background:color-mix(in srgb,var(--amber) 16%,transparent);border-color:transparent}'
    + '.tmp .chip.ok{color:var(--teal);border-color:color-mix(in srgb,var(--teal) 40%,transparent);background:color-mix(in srgb,var(--teal) 14%,transparent)}.tmp .chip.err{color:var(--red);background:color-mix(in srgb,var(--red) 14%,transparent);border-color:transparent}.tmp .chip.n{color:var(--ink3)}'
    + '.tmp .lnk{background:none;border:0;padding:0;font:inherit;font-size:12.5px;color:var(--ink3);cursor:pointer;text-decoration:underline;text-underline-offset:3px}.tmp .lnk:hover{color:var(--teal)}'
    + '.tmp .btn{font:inherit;font-size:13.5px;font-weight:600;padding:8px 14px;border-radius:4px;border:1px solid var(--teal);background:var(--teal);color:var(--on-accent,#111110);cursor:pointer;min-height:36px;white-space:nowrap}'
    + '.tmp .lead{display:grid;gap:4px}.tmp .lead .big{font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:34px;line-height:1.05;font-weight:400;color:var(--ink)}.tmp .lead .big small{font-family:var(--font-sans,"DM Sans",sans-serif);font-size:14px;color:var(--ink3);margin-left:8px}'
    + '.tmp .ev{border:1px solid var(--border);border-radius:6px;background:var(--bg);display:grid;gap:8px;padding:12px 14px;min-width:0}'
    + '.tmp .ev.sig{border-color:var(--teal);background:color-mix(in srgb,var(--teal) 14%,transparent)}.tmp .ev.sig.w{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 16%,transparent)}.tmp .ev.sig.n{border-style:dashed;background:transparent}'
    + '.tmp .ev.sig .h2{font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:24px;font-weight:500;line-height:1.05}.tmp .ev.sig .why{font-size:13.5px;color:var(--ink2)}'
    + '.tmp .ev.sig .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.tmp .ev.sig .btn{justify-self:start}.tmp .ev.sig .second{font-size:12.5px;color:var(--ink3);border-top:1px dashed var(--border);padding-top:6px;display:flex;gap:14px;flex-wrap:wrap}'
    + '.tmp .ev.sig .second button,.tmp .ev.sig .second a{background:none;border:0;padding:0;font:inherit;color:var(--teal);font-weight:600;cursor:pointer;text-decoration:none}'
    + '.tmp .sigs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:6px}.tmp .sigs.one{grid-template-columns:minmax(0,1fr)}'
    + '.tmp .sigmore{font-size:13px;color:var(--ink3);margin-top:8px}.tmp .sigmore button,.tmp .sigmore a{background:none;border:0;padding:0;font:inherit;color:var(--teal);font-weight:600;cursor:pointer;text-decoration:none}'
    + '.tmp .eb.row2{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.tmp .legend{display:flex;gap:6px;flex-wrap:wrap;text-transform:none;letter-spacing:0}.tmp .legend .chip{font-family:var(--font-sans,"DM Sans",sans-serif)}'
    + '.tmp .pt-wrap{border:1px solid var(--border);border-radius:6px;overflow:hidden;margin-top:8px}.tmp table.pt{width:100%;border-collapse:collapse;font-size:13.5px}'
    + '.tmp table.pt th{padding:9px 12px;background:var(--bg);text-align:left;white-space:nowrap;font-weight:600;color:var(--ink2);border-bottom:1px solid var(--border)}.tmp table.pt th small{display:block;font-size:11.5px;color:var(--ink3);font-weight:400}'
    + '.tmp table.pt td{padding:9px 12px;vertical-align:middle;border-top:1px solid var(--border)}.tmp table.pt tr.seura td{background:var(--bg3);border-top:0}'
    + '.tmp table.pt td.nm .h{font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:21px;line-height:1.05;font-weight:500;color:var(--ink);text-decoration:none;background:none;border:0;padding:0;cursor:pointer}.tmp table.pt td.nm button.h:hover{color:var(--teal)}'
    + '.tmp table.pt td.nm .m{display:block;font-size:12px;color:var(--ink3);margin-top:1px}'
    + '.tmp .pv{display:inline-flex;align-items:baseline;gap:6px;font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:22px;line-height:1;font-weight:500;color:var(--ink)}.tmp .pv i{font-style:normal;font-family:var(--font-mono,"DM Mono",monospace);font-size:12px;width:14px;text-align:center}'
    + '.tmp .pv.ok i{color:var(--teal)}.tmp .pv.w,.tmp .pv.w i{color:var(--amber)}.tmp .pv.err,.tmp .pv.err i{color:var(--red)}.tmp .pv.n i{color:var(--ink3)}'
    + '.tmp .cs{display:block;font-size:12px;color:var(--ink3);margin-top:3px}.tmp .cs.w{color:var(--amber);font-weight:600}.tmp .cs.err{color:var(--red);font-weight:600}.tmp .dash{color:var(--ink3);font-size:14px}'
    + '.tmp .trend{display:inline-block;vertical-align:middle;margin-left:8px}.tmp .trend rect{fill:var(--ov-4,rgba(128,128,128,.28))}.tmp .trend rect:last-child{fill:var(--ov-5,rgba(128,128,128,.55))}.tmp .trend rect.ar{opacity:.45}.tmp .trend.dn rect:last-child{fill:var(--amber)}'
    + '.tmp .cards{display:none;gap:10px}.tmp .cards .ev .t{display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap}.tmp .cards .ev .t .h{font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:21px;font-weight:500;line-height:1.05;background:none;border:0;padding:0;color:var(--ink);cursor:pointer}'
    + '.tmp .cards .ev .t .age{font-family:var(--font-mono,"DM Mono",monospace);font-size:11.5px;color:var(--ink3)}.tmp .cards .ev .lause{font-size:14.5px;color:var(--ink);line-height:1.45}'
    + '.tmp .cards .ev .nums{display:flex;flex-wrap:wrap;gap:6px 18px}.tmp .cards .ev .nums div{display:grid}.tmp .cards .ev .nums .k{font-size:11.5px;color:var(--ink3)}.tmp .cards .ev .nums .v{font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:26px;line-height:1;font-weight:500}'
    + '.tmp .cards .ev .nums .v small{font-family:var(--font-mono,"DM Mono",monospace);font-size:11px;color:var(--ink3);margin-left:4px}.tmp .cards .ev .nums .v.w{color:var(--amber)}.tmp .cards .ev .nums .v.err{color:var(--red)}'
    + '.tmp .cards .ev .act{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border);padding-top:8px}.tmp .cards .ev .act button{background:none;border:0;padding:0;font:inherit;font-size:13.5px;font-weight:600;color:var(--teal);cursor:pointer}'
    + '.tmp details.acc{padding:0}.tmp details.acc summary{list-style:none;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;padding:12px 14px;align-items:baseline}.tmp details.acc summary::-webkit-details-marker{display:none}'
    + '.tmp details.acc summary .h{font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:21px;font-weight:500}.tmp details.acc summary .sum{grid-column:1/-1;font-family:var(--font-serif,"Cormorant Garamond",Georgia,serif);font-size:22px;color:var(--ink2);line-height:1}.tmp details.acc[open] summary .sum{display:none}.tmp details.acc .lause{padding:0 14px 12px}'
    + '.tmp .sect-note,.tmp .mini{font-size:13px;color:var(--ink3)}'
    + '@container tmp (max-width:900px){.tmp .sigs{grid-template-columns:minmax(0,1fr)}}'
    + '@container tmp (max-width:720px){.tmp .pt-wrap{display:none}.tmp .cards{display:grid}.tmp .lead .big{font-size:30px}.tmp .lead .big small{display:block;margin:4px 0 0}.tmp .legend{display:none}.tmp .eb.row2{display:block}}'
    + '@media (max-width:720px){.tmp .pt-wrap{display:none}.tmp .cards{display:grid}.tmp .lead .big small{display:block;margin:4px 0 0}.tmp .legend{display:none}.tmp .sigs{grid-template-columns:minmax(0,1fr)}}';

  function _tt(opts) { return typeof opts.t === 'function' ? opts.t : function (x) { return x; }; }
  function _fill(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ''; }); }
  function _spark(a, dn, ar) {
    var v = (a || []).map(function (x) { return x == null ? 0 : x; }), mx = Math.max.apply(null, v.concat([1])), w = 5, g = 2, h = 16;
    if (!(a || []).some(function (x) { return x != null; })) return '';
    var s = '<svg class="trend' + (dn ? ' dn' : '') + '" width="' + (v.length * (w + g)) + '" height="' + h + '" viewBox="0 0 ' + (v.length * (w + g)) + ' ' + h + '" role="img" aria-label="trend">';
    v.forEach(function (x, i) { var bh = Math.max(2, Math.round(h * x / mx)); s += '<rect' + (ar && ar[i] ? ' class="ar"' : '') + ' x="' + (i * (w + g)) + '" y="' + (h - bh) + '" width="' + w + '" height="' + bh + '"/>'; });
    return s + '</svg>';
  }
  function _pv(c, extra, pieniLkm) {   // c = solu; pieniLkm → "3/4"
    if (pieniLkm) return '<span class="pv n"><i>' + G.n + '</i>' + c.o + '/' + c.n + '</span>';
    return '<span class="pv ' + c.merkki + '"><i>' + G[c.merkki] + '</i>' + _p0(c.pros) + ' %' + (extra || '') + '</span>';
  }
  function _teamClick(opts, nimi) { return opts.fn && opts.fn.joukkue ? ' onclick="' + _esc(opts.fn.joukkue) + '(\'' + _esc(String(nimi).replace(/[\'"\\]/g, '')) + '\')"' : ''; }

  function _signaaliHTML(s, opts, esc, t) {
    var fn = opts.fn || {}, call = function (f, nimi) { return f ? ' onclick="' + _esc(f) + '(\'' + _esc(String(nimi).replace(/[\'"\\]/g, '')) + '\')"' : ''; };
    var P = { eb: '', h: '', why: '', btn: '', fn: fn.joukkue, aikapaine: false };
    if (s.tyyppi === 'ei_jaksoa') { P.eb = _fill(t('{nimi} · ilman jaksoa {vk} vk'), { nimi: s.nimi, vk: s.vk }); P.h = _fill(t('{nimi} ei ole aloittanut uutta jaksoa'), { nimi: s.nimi }); P.why = _fill(t('Tue valmentajaa: {n} pelaajaa ilman jaksoa.'), { n: s.n }); P.btn = t('Aloita jakso'); P.fn = fn.aloitaJakso || fn.joukkue; }
    else if (s.tyyppi === 'katselmusikkuna') { P.aikapaine = true; P.eb = _fill(t('{nimi} · katselmusikkuna auki'), { nimi: s.nimi }) + (s.pv != null ? ' · ' + s.pv + ' ' + t('pv') : ''); P.h = s.pv != null ? _fill(t('Katselmusikkuna sulkeutuu {pv} päivän päästä'), { pv: s.pv }) : t('Katselmusikkuna on auki'); P.why = _fill(t('Tue valmentajaa: {n} pelaajan jakso on päättynyt. Kevyt katselmus riittää.'), { n: s.auki }); P.btn = t('Sulje jakso lauseella'); P.fn = fn.sulje || fn.joukkue; }
    else if (s.tyyppi === 'katsaus_laskee') { P.eb = _fill(t('{nimi} · viikkokatsaus laskenut 3 vk'), { nimi: s.nimi }); P.h = t('Viikkokatsaus on laskenut kolme viikkoa'); P.why = _fill(t('Tue valmentajaa: {nimi} {a} → {b} %.'), { nimi: s.nimi, a: s.alku, b: s.loppu }); P.btn = t('Viesti valmentajalle'); P.fn = fn.valmentaja || fn.joukkue; }
    else { P.eb = _fill(t('{nimi} · käyttö {pros} %'), { nimi: s.nimi, pros: s.pros }); P.h = _fill(t('{nimi}: pelaajat ja perheet eivät vielä käytä'), { nimi: s.nimi }); P.why = s.leikkija ? t('Perheen kuittaukset puuttuvat.') : t('Harjoitteita ei ole merkitty tehdyiksi.'); P.btn = t('Viesti perheille'); P.fn = fn.perheet || fn.joukkue; }
    var kuitt = opts.kuittaus ? '<span>' + opts.kuittaus(s, esc, t) + '</span>' : '';   // PR 2: Kuittaa / Ensi viikolla
    return '<div class="ev sig' + (P.aikapaine ? ' w' : '') + '" data-signaali="' + esc(s.avain) + '"><span class="eb">' + esc(P.eb) + '</span><div class="h2">' + esc(P.h) + '</div><div class="why">' + esc(P.why) + '</div>'
      + '<div class="row"><button class="btn" type="button"' + call(P.fn, s.nimi) + '>' + esc(P.btn) + '</button></div>'
      + '<div class="second">' + (fn.joukkue ? '<button type="button"' + call(fn.joukkue, s.nimi) + '>' + esc(t('Tai avaa joukkue')) + ' →</button>' : '') + kuitt + '</div></div>';
  }

  function _ajanteksti(ms, t) {
    if (ms == null) return null;
    try {
      var o = {}; new Intl.DateTimeFormat('fi-FI', { timeZone: 'Europe/Helsinki', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
      return String(o.weekday || '').replace(/\.$/, '') + ' ' + o.hour + '.' + o.minute;
    } catch (e) { return null; }
  }

  function tmPulssiHTML(m, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), fn = opts.fn || {};
    if (!m || m.tyhja) return '<div class="tmp"><div class="ev sig n"><span class="eb">' + esc(t('Joukkueiden viikko')) + '</span><div class="h2">' + esc(t('Pulssi alkaa kertyä seuraavasta viikkokoosteesta')) + '</div><div class="why">' + esc(t('Kooste lasketaan maanantaisin klo 6.00.')) + '</div></div></div>';
    var h = '<div class="tmp" data-vk="' + esc(m.vk) + '">', S = m.seura;
    var aika = _ajanteksti(m.laskettuMs, t);
    // otsikko: datan ikä (D113) + hiljainen Päivitä
    h += '<div class="dh"><span class="eb">' + esc(t('Joukkueiden viikko')) + '</span><span class="sp"></span><span class="chip mono">' + esc((m.vkNum != null ? t('vk') + ' ' + m.vkNum : m.vk) + (aika ? ' · ' + t('laskettu') + ' ' + aika : '')) + '</span>'
      + (m.vanha ? '<span class="chip w">' + esc(_fill(t('{n} pv vanha'), { n: Math.floor(m.ikaPv) })) + '</span>' : '') + (m.arvio ? '<span class="chip n">' + esc(t('arvio')) + '</span>' : '')
      + (fn.paivita ? '<button class="lnk" type="button" onclick="' + _esc(fn.paivita) + '()">' + esc(t('Päivitä nyt')) + '</button>' : '') + '</div>';
    if (m.vanha) h += '<div class="ev sig w"><span class="eb">' + esc(t('Kooste vanhentunut')) + '</span><div class="h2">' + esc(_fill(t('Luvut ovat {n} päivän takaa'), { n: Math.floor(m.ikaPv) })) + '</div><div class="why">' + esc(t('Merkit on vaimennettu, kunnes kooste päivittyy. Luvut ja trendi näkyvät silti.')) + '</div>'
      + (fn.paivita ? '<div class="row"><button class="btn" type="button" onclick="' + _esc(fn.paivita) + '()">' + esc(t('Päivitä nyt')) + '</button></div>' : '') + '<div class="second">' + esc(t('Kooste lasketaan maanantaisin klo 6.00.')) + '</div></div>';
    // käyttöönottonauha (D69): suostumus eriteltynä; vain käyttöönotossa
    if (m.onb.paalla) {
      var su = opts.suostumus, ks = S.n > 0 && opts.suostumusKooste != null ? opts.suostumusKooste : (su ? su.annettu : null), pr = S.n > 0 && ks != null ? Math.round(ks * 100 / S.n) : null;
      h += '<div class="ev sig w"><span class="eb">' + esc(t('Suostumus · käyttöönotto')) + '</span><div class="h2">' + esc(pr != null ? _fill(t('Suostumus {pros} %, tavoite 90 %'), { pros: pr }) : t('Suostumus, tavoite 90 %')) + '</div>'
        + '<div class="why">' + esc(su ? _fill(t('{a} suostumusta · {k} kutsumatta · {o} odottaa vastausta. Nauha poistuu, kun tavoite täyttyy.'), { a: su.annettu, k: su.eiKutsuttu, o: su.odottaa }) : t('Nauha poistuu, kun tavoite täyttyy.')) + '</div>'
        + (fn.muistuta ? '<div class="row"><button class="btn" type="button" onclick="' + _esc(fn.muistuta) + '()">' + esc(t('Muistuta perheitä')) + '</button></div>' : '')
        + '<div class="second">' + esc(_fill(t('Käyttöönotto viikko {n}/4: merkit alkavat vasta sen jälkeen. Käyttöönoton alku on seuran ensimmäinen pulssiviikko.'), { n: m.onb.viikko })) + '</div></div>';
    }
    // tulkintalause (D109)
    var nS = m.signaalejaYht, sub = m.onb.paalla ? _fill(t('Käyttöönotto viikko {n}/4: ei värejä, vain luvut ja trendi.'), { n: m.onb.viikko }) : (nS ? _fill(nS === 1 ? t('{n} asia tälle viikolle.') : t('{n} asiaa tälle viikolle.'), { n: nS }) : t('Ei toimenpiteitä tällä viikolla.'));
    h += '<div class="lead"><div class="big">' + esc(_fill(t('{a}/{b} joukkuetta jaksolla.'), { a: S.njakso, b: S.joukkueita })) + ' <small>' + esc(sub) + '</small></div></div>';
    // Tarvitsee huomiota (D73, D115)
    if (m.signaalit.length) {
      h += '<div><span class="eb">' + esc(t('Tarvitsee huomiota')) + ' · ' + esc(t('enintään 3')) + '</span><div class="sigs' + (m.signaalit.length === 1 ? ' one' : '') + '">' + m.signaalit.map(function (s) { return _signaaliHTML(s, opts, esc, t); }).join('') + '</div>'
        + '<div class="sigmore">' + (m.signaalejaLisaa ? esc(_fill(t('+{n} muuta signaalia'), { n: m.signaalejaLisaa })) + ' · ' : '') + (fn.tilanne ? '<button type="button" onclick="' + _esc(fn.tilanne) + '()">' + esc(t('Kaikki signaalit ja poikkeamat → Tilanne')) + '</button>' : '') + '</div></div>';
    } else if (!m.vanha && !m.onb.paalla) {   // rauhallinen viikko (D114): tarkistuslause, jotta tyhjä ei näytä rikkinäiseltä
      h += '<div class="ev sig n"><span class="eb">' + esc(t('Tarvitsee huomiota')) + '</span><div class="h2">' + esc(t('Ei toimenpiteitä tällä viikolla')) + '</div><div class="why">' + esc(_fill(t('Tarkistettu {n} joukkuetta, 0 poikkeamaa.'), { n: S.joukkueita }) + (aika ? ' ' + _fill(t('Kooste laskettu {aika}.'), { aika: aika }) : '')) + '</div>'
        + (opts.seuraava ? '<div class="second">' + esc(opts.seuraava) + '</div>' : '') + '</div>';
    } else if (fn.tilanne) h += '<div class="sigmore"><button type="button" onclick="' + _esc(fn.tilanne) + '()">' + esc(t('Kaikki signaalit ja poikkeamat → Tilanne')) + '</button></div>';
    // taulukko
    h += '<div><div class="eb row2"><span>' + esc(t('Joukkueet ikäjärjestyksessä')) + '</span><span class="legend"><span class="chip ok">' + G.ok + ' ' + esc(t('tavoitteessa')) + '</span><span class="chip w">' + G.w + ' ' + esc(t('alle tavoitteen')) + '</span><span class="chip err">' + G.err + ' ' + esc(t('selvästi alle')) + '</span><span class="chip n">' + G.n + ' ' + esc(t('vain luku')) + '</span></span></div>';
    h += _taulukko(m, opts, esc, t) + _kortit(m, opts, esc, t) + '</div>';
    h += '<div class="sect-note">' + esc(t('Rivin nimi avaa joukkueen tiiminäkymän. Luvut kertovat silmukan rytmin, eivät sen laatua. Laadun arvioi katselmus. Käyttö 7 pv = pelaaja merkitsi harjoitteen tehdyksi viimeisen 7 päivän aikana; Leikkijällä perheen kuittaus. Pelaajien nimiä ei seuratasolla.')) + '</div>';
    return h + '</div>';
  }

  function _taulukko(m, opts, esc, t) {
    var S = m.seura, h = '<div class="pt-wrap"><table class="pt"><thead><tr><th>' + esc(t('Joukkue')) + '</th><th>' + esc(t('Jakso')) + '<small>' + esc(t('reitti')) + '</small></th><th>' + esc(t('Pelaajat jaksolla')) + '<small>' + esc(t('oma reitti')) + '</small></th><th>'
      + esc(t('Viikkokatsaus')) + '<small>' + esc(t('merkit')) + '</small></th><th>' + esc(t('Katselmus ajallaan')) + '<small>' + esc(t('kevyt katselmus')) + '</small></th><th>' + esc(t('Käyttö 7 pv')) + '<small>' + esc(t('harjoite merkitty tehdyksi')) + '</small></th></tr></thead><tbody>';
    var seuraSolu = function (c, cov, tr, trDn) {
      if (c.pros == null) return cov && cov.sov ? '<span class="pv n" style="font-size:14px;font-family:var(--font-sans,sans-serif);font-weight:400"><i>' + G.n + '</i>' + esc(_fill(t('mitattu {a}/{b} joukkuetta'), { a: cov.kat, b: cov.sov })) + '</span>' : '<span class="dash">—</span>';
      return '<span class="pv ' + c.merkki + '"><i>' + G[c.merkki] + '</i>' + _p0(c.pros) + ' %</span>' + _spark(tr, trDn, S.trendi.arvio);
    };
    h += '<tr class="seura"><td class="nm"><span class="h">' + esc(t('Koko seura')) + '</span><span class="m">' + esc(_fill(t('{n} pelaajaa (uniikit) · {a}/{b} joukkuetta jaksolla'), { n: S.n, a: S.njakso, b: S.joukkueita })) + '</span></td>'
      + '<td><span class="pv n">' + S.njakso + '/' + S.joukkueita + '</span><span class="cs">' + esc(t('joukkuetta')) + '</span></td>'
      + '<td>' + (S.jaksolla.pros == null ? '<span class="dash">—</span>' : '<span class="pv ' + S.jaksolla.merkki + '"><i>' + G[S.jaksolla.merkki] + '</i>' + _p0(S.jaksolla.pros) + ' %</span>') + '</td>'
      + '<td>' + seuraSolu(S.katsaus, S.katsaus.kattavuus, S.trendi.katsaus, false) + '</td>'
      + '<td>' + (S.katselmus.ei ? '<span class="dash">' + esc(t('jakso kesken')) + '</span>' : seuraSolu(S.katselmus, S.katselmus.kattavuus, null)) + '</td>'
      + '<td>' + (S.kaytto.pros == null ? '<span class="dash">—</span>' : '<span class="pv ' + S.kaytto.merkki + '"><i>' + G[S.kaytto.merkki] + '</i>' + _p0(S.kaytto.pros) + ' %</span>' + _spark(S.trendi.kaytto, false, S.trendi.arvio)) + '</td></tr>';
    m.rivit.forEach(function (r) {
      var meta = _fill(t('{iv} · {n} pel.'), { iv: r.ikavaihe ? t(r.ikavaihe === 'leikkija' ? 'Leikkijä' : r.ikavaihe === 'rakentaja' ? 'Rakentaja' : 'Showcase') : '—', n: r.n }) + (r.pieni ? ' · ' + t('pieni joukkue') : '') + ' · ' + t(r.tyyppi) + (r.leikkija ? '' : ' · ' + t(r.profiili));
      h += '<tr><td class="nm"><button class="h" type="button"' + _teamClick(opts, r.nimi) + '>' + esc(r.nimi) + '</button><span class="m">' + esc(meta) + '</span></td>';
      // jakso
      if (r.jakso.voimassa) h += '<td>' + esc(r.jakso.nimi || t('Jakso käynnissä')) + '</td>';
      else { var mk = r.pieni || !m.merkitPaalla ? 'n' : 'err'; h += '<td><span class="pv ' + mk + '" style="font-size:18px"><i>' + G[mk] + '</i>' + esc(t('Ei jaksoa')) + '</span>' + (r.jakso.eiJaksoaVk ? '<span class="cs ' + (mk === 'err' ? 'err' : '') + '">' + r.jakso.eiJaksoaVk + ' ' + esc(t('vk')) + '</span>' : '') + '</td>'; }
      // jaksolla
      h += '<td>' + (r.pieni ? _pv(r.jaksolla, '', true) : (r.jaksolla.pros == null ? '<span class="dash">—</span>' : _pv(r.jaksolla))) + '</td>';
      // viikkokatsaus
      var k = r.katsaus;
      if (k.ei === 'leikkija') h += '<td><span class="dash">' + esc(t('ei Leikkijällä')) + '</span></td>';
      else if (k.ei) h += '<td><span class="dash">—</span></td>';
      else h += '<td>' + (r.pieni ? _pv(k, '', true) : _pv(k) + _spark(r.trendi.katsaus, r.trendi.katsausLaskeva3, r.trendi.arvio) + (r.trendi.katsausLaskeva3 ? '<span class="cs w">' + esc(t('laskeva 3 vk')) + '</span>' : '') + '<span class="cs">' + esc(t('tavoite')) + ' ' + k.tavoite + ' %</span>') + '</td>';
      // katselmus
      var ka = r.katselmus;
      if (r.leikkija) h += '<td><span class="dash">—</span></td>';
      else if (ka.ei === 'ikkuna_auki') h += '<td><span class="dash">' + esc(t('ikkuna auki')) + '</span>' + (r.katselmusPv != null ? '<span class="cs w">' + r.katselmusPv + ' ' + esc(t('pv')) + '</span>' : '') + '</td>';
      else if (ka.ei === 'jakso_kesken') h += '<td><span class="dash">' + esc(t('jakso kesken')) + '</span></td>';
      else if (ka.ei) h += '<td><span class="dash">—</span></td>';
      else h += '<td>' + (r.pieni ? _pv(ka, '', true) : _pv(ka)) + (r.profiili === 'oto' ? '<span class="cs">' + esc(t('oto')) + '</span>' : '') + '</td>';
      // käyttö
      var ku = r.kaytto;
      if (ku.ei) h += '<td><span class="dash">—</span></td>';
      else h += '<td>' + (r.pieni ? _pv(ku, '', true) : _pv(ku) + _spark(r.trendi.kaytto, false, r.trendi.arvio)) + (r.leikkija ? '<span class="cs">' + esc(t('perhe mukana')) + '</span>' : '') + (!r.pieni && m.merkitPaalla && r.tyyppi === 'harraste' ? '<span class="cs">' + esc(t('tavoite')) + ' ' + ku.tavoite + ' %</span>' : '') + '</td>';
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  /* Mobiili (D74): ensin x/y jaksolla (tulkintalause yllä), poikkeamakortit ikäjärjestyksessä, tavoitteessa olevat yhden haitarin takana. Ei vaakavieritystä. */
  function _kortit(m, opts, esc, t) {
    var S = m.seura, sh = {}, ok = [], h = '<div class="cards">';
    m.signaalit.forEach(function (s) { sh[s.jid] = 1; });
    h += '<div class="mini">' + esc(_fill(t('jaksolla {a} % · katsaus {b} % · käyttö {c} %'), { a: S.jaksolla.pros == null ? '—' : _p0(S.jaksolla.pros), b: S.katsaus.pros == null ? '—' : _p0(S.katsaus.pros), c: S.kaytto.pros == null ? '—' : _p0(S.kaytto.pros) })) + '</div>';
    m.rivit.forEach(function (r) {
      if (sh[r.jid]) return;
      var n = [], fail = function (c) { return c && c.merkki && c.merkki !== 'ok' && c.merkki !== 'n' && !(c.pros != null && c.tavoite != null && c.pros >= c.tavoite); };   // oto: ▲ 100 %:lla (D72) ei ole "alle tavoitteen"
      if (!r.jakso.voimassa) n.push([t('Jakso'), t('ei jaksoa'), r.jakso.eiJaksoaVk ? r.jakso.eiJaksoaVk + ' ' + t('vk') : '', 'err']);
      else if (fail(r.jaksolla)) n.push([t('Jaksolla'), _p0(r.jaksolla.pros) + ' %', t('tavoite') + ' ' + r.jaksolla.tavoite, r.jaksolla.merkki]);
      if (!r.katsaus.ei && fail(r.katsaus)) n.push([t('Katsaus'), _p0(r.katsaus.pros) + ' %' + (r.trendi.katsausLaskeva3 ? ' ↘' : ''), t('tavoite') + ' ' + r.katsaus.tavoite, r.katsaus.merkki]);
      if (!r.katselmus.ei && fail(r.katselmus)) n.push([t('Katselmus'), _p0(r.katselmus.pros) + ' %', t('tavoite') + ' ' + r.katselmus.tavoite, r.katselmus.merkki]);
      if (!r.kaytto.ei && fail(r.kaytto)) n.push([t('Käyttö'), _p0(r.kaytto.pros) + ' %', t('tavoite') + ' ' + r.kaytto.tavoite, r.kaytto.merkki]);
      if (!n.length) { ok.push(r); return; }
      h += '<div class="ev"><div class="t"><button class="h" type="button"' + _teamClick(opts, r.nimi) + '>' + esc(r.nimi) + '</button><span class="age">' + r.n + ' ' + esc(t('pel.')) + (r.pieni ? ' · ' + esc(t('pieni')) : '') + '</span></div>'
        + '<div class="lause">' + esc(n.map(function (x) { return x[0].toLowerCase() + ' ' + x[1]; }).join(' · ') + ': ' + t('alle tavoitteen.')) + '</div>'
        + '<div class="nums">' + n.map(function (x) { return '<div><span class="k">' + esc(x[0]) + '</span><span class="v ' + (x[3] === 'ok' ? '' : x[3]) + '">' + esc(x[1]) + (x[2] ? '<small>' + esc(x[2]) + '</small>' : '') + '</span></div>'; }).join('') + '</div>'
        + '<div class="act"><button type="button"' + _teamClick(opts, r.nimi) + '>' + esc(t('Avaa joukkue')) + ' →</button></div></div>';
    });
    if (m.signaalit.length) h += '<div class="mini">' + esc(t('Toimenpiteet yllä:')) + ' ' + esc(m.rivit.filter(function (r) { return sh[r.jid]; }).map(function (r) { return r.nimi; }).join(' · ')) + '.</div>';
    if (ok.length) h += '<details class="ev acc"><summary><span class="h">' + esc(t('Tavoitteessa')) + '</span><span class="age">' + esc(_fill(t('{n} joukkuetta'), { n: ok.length })) + '</span><span class="sum">' + esc(ok.map(function (r) { return r.nimi; }).join(' · ')) + '</span></summary><div class="lause">' + esc(t('Ei poikkeamia tällä viikolla. Avaa joukkue koskettamalla nimeä.')) + '</div></details>';
    return h + '</div>';
  }

  /* Tulossa 14 päivää / Tänään (D122, oikea palsta): vain otsikot ja päivät olemassa olevasta kalenterista. tapahtumat = [{nimi, alkaa (Timestamp|ISO|ms)}].
     opts.tanaan = true → vain nykyinen Helsingin päivä ("Tänään"); muuten seuraavat 14 päivää. */
  function _pvHki(ms) { try { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Helsinki' }).format(new Date(ms)); } catch (e) { return ''; } }   // YYYY-MM-DD
  function tmPulssiTulossaHTML(tapahtumat, nytMs, opts) {
    opts = opts || {}; var esc = opts.esc || _esc, t = _tt(opts), raja = nytMs + 14 * DAY, tanaan = _pvHki(nytMs);
    var lista = (Array.isArray(tapahtumat) ? tapahtumat : []).map(function (e) { return { nimi: e && e.nimi, ms: _ms(e && e.alkaa) }; }).filter(function (e) {
      if (!e.nimi || e.ms == null) return false;
      return opts.tanaan ? _pvHki(e.ms) === tanaan : (_pvHki(e.ms) > tanaan && e.ms <= raja) || _pvHki(e.ms) === tanaan;
    }).sort(function (a, b) { return a.ms - b.ms; }).slice(0, 8);
    var pv = function (ms) { try { return new Intl.DateTimeFormat('fi-FI', opts.tanaan ? { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : { timeZone: 'Europe/Helsinki', weekday: 'short', day: 'numeric', month: 'numeric' }).format(new Date(ms)); } catch (e) { return ''; } };
    var otsikko = opts.tanaan ? t('Tänään') : t('Tulossa 14 päivää'), tyhja = opts.tanaan ? t('Ei tapahtumia tänään.') : t('Ei tapahtumia seuraavan 14 päivän aikana.');
    return '<div class="tmp"><div><span class="eb">' + esc(otsikko) + '</span>' + (lista.length
      ? '<div class="ev" style="margin-top:6px">' + lista.map(function (e) { return '<div style="display:flex;justify-content:space-between;gap:10px;font-size:13.5px"><span>' + esc(e.nimi) + '</span><span class="mini" style="font-family:var(--font-mono,monospace)">' + esc(pv(e.ms)) + '</span></div>'; }).join('') + '</div>'
      : '<div class="ev sig n" style="margin-top:6px"><div class="why">' + esc(tyhja) + '</div></div>') + '</div></div>';
  }
  function tmPulssiSeuraavaTapahtuma(tapahtumat, nytMs) {
    var l = (Array.isArray(tapahtumat) ? tapahtumat : []).map(function (e) { return { nimi: e && e.nimi, ms: _ms(e && e.alkaa) }; }).filter(function (e) { return e.nimi && e.ms != null && e.ms > nytMs; }).sort(function (a, b) { return a.ms - b.ms; });
    return l[0] || null;
  }

  var API = { PIENI: PIENI, VANHA_PV: VANHA_PV, KAYNNISTYS_VK: KAYNNISTYS_VK, SIGNAALI_MAX: SIGNAALI_MAX, TAVOITTEET: TAVOITTEET, KAYTTO_PORTAAT: KAYTTO_PORTAAT, CSS: CSS,
    viikkoEro: viikkoEro, tmPulssiMerkki: tmPulssiMerkki, tmPulssiKayttoTavoite: tmPulssiKayttoTavoite, tmPulssiRivit: tmPulssiRivit, tmPulssiSignaalit: tmPulssiSignaalit, tmPulssiHTML: tmPulssiHTML, tmPulssiTulossaHTML: tmPulssiTulossaHTML, tmPulssiSeuraavaTapahtuma: tmPulssiSeuraavaTapahtuma };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_SEURAN_PULSSI = API;
})(typeof window !== 'undefined' ? window : null);
