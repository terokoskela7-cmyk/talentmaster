/* ════════════════════════════════════════════════════════════════════════
   tm_seuran_pulssi.js — S2: VP:n Koti = Seuran pulssi (docs/CODE_BRIEF_S2_KOTI.md; mockupit 23 + 25; D109–D125).
   PURE: ei Firebasea, ei DOM:ia, ei kelloa (nytMs annetaan). Dual-export: module.exports || window.TM_SEURAN_PULSSI.

   Syöte = seurat/{sid}/kooste/{vvvv-Www} -dokumentit vanhin → uusin (kooste v4/v5, lib/tm_seuran_kooste.js), vain lukumääriä joukkueittain + `yhteensa` (uniikit pelaajat).
   · tmPulssiRivit(koosteet, opts)     → rivimalli: seura-rivi, joukkuerivit IKÄJÄRJESTYKSESSÄ (D42, ei lajittelua mittarin mukaan), merkit ● ▲ ■ ○ + luku (D112),
                                         trendi vain Viikkokatsaus- ja Käyttö-sarakkeissa (D111), datan ikä (D113), käyttöönottotila (D69), Tarvitsee huomiota (D73, max 3, D115)
   · (PR D: HTML poistettu — Kodin näkymät ovat lib/tm_vp_koti.js:ssä; tämä moduuli on pelkkä malli: rivit, signaalit, kuittaus, prosenttiapuri)
   · malli.signaalitLista = kaikki näkyvät signaalit (ei kuitatut); malli.signaalit = niistä 3 ensimmäistä (D115)
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
    var onb = { paalla: alusta != null && alusta < KAYNNISTYS_VK, viikko: alusta != null ? alusta + 1 : null, viikkojaAlusta: alusta, alku: ensin };
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
        jaksoVk: opts.jaksoVk && opts.jaksoVk[jid] ? opts.jaksoVk[jid] : null, nKatselmusAuki: m.n_katselmus || 0, katselmusPv: opts.katselmusPv && opts.katselmusPv[jid] != null ? opts.katselmusPv[jid] : null,
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
    malli.signaalit = sg.nakyvat; malli.signaalitKaikki = sg.kaikki; malli.signaalitLista = sg.lista;   // lista = kaikki näkyvät (ei kuitatut/siirretyt); Kodin Rytmi-näkymä (lib/tm_vp_koti.js) ryhmittelee ja rajaa itse
    malli.signaalejaYht = sg.yht; malli.signaalejaLisaa = sg.lisaa;
    malli.ilmanJaksoa = rivit.filter(function (r) { return !r.jakso.voimassa; }).length;
    return malli;
  }

  /* D73 — järjestys: 1) ei jaksoa ≥ 2 vk → Aloita jakso · 2) katselmusikkuna ≤ 10 pv, VAIN ammatti → Sulje jakso lauseella · 3) viikkokatsaus laskenut 3 vk → Viesti valmentajalle ·
     4) käyttö < 25 % (vasta käyttöönoton jälkeen) → Viesti perheille. EI "valinta odottaa" (D68) eikä testisyklin asioita (D118). Max 3 (D115); loput lasketaan. */
  function tmPulssiSignaalit(malli, opts) {
    opts = opts || {}; var ut = [];
    var lisaa = function (n, tyyppi, r, x) { ut.push(Object.assign({ jarj: n, tyyppi: tyyppi, jid: r.jid, nimi: r.nimi, jaksoVk: r.jaksoVk, avain: tyyppi + '|' + r.jid }, x)); };
    (malli.rivit || []).forEach(function (r) { if (!r.jakso.voimassa && r.jakso.eiJaksoaVk >= 2) lisaa(1, 'ei_jaksoa', r, { vk: r.jakso.eiJaksoaVk, n: r.n }); });
    (malli.rivit || []).forEach(function (r) {
      if (r.profiili === 'ammatti' && r.nKatselmusAuki > 0 && (r.katselmusPv == null || r.katselmusPv <= KATSELMUS_SIGNAALI_PV)) lisaa(2, 'katselmusikkuna', r, { pv: r.katselmusPv, auki: r.nKatselmusAuki });
    });
    (malli.rivit || []).forEach(function (r) { if (r.trendi.katsausLaskeva3) lisaa(3, 'katsaus_laskee', r, { alku: _p0(r.trendi.katsaus[0]), loppu: _p0(r.trendi.katsaus[3]), ty: r.tyyppi }); });
    if (!(malli.onb && malli.onb.paalla)) (malli.rivit || []).forEach(function (r) { if (!r.pieni && r.kaytto.pros != null && r.kaytto.pros < KAYTTO_MATALA) lisaa(4, 'kaytto_matala', r, { pros: _p0(r.kaytto.pros), leikkija: r.leikkija, tavoite: r.kaytto.tavoite }); });
    ut.sort(function (a, b) { return a.jarj - b.jarj; });
    ut.forEach(function (s) { s.ehto = tmPulssiEhto(s); });
    var nytMs = opts.nytMs != null ? opts.nytMs : Date.now();
    var piilossa = opts.piilossa || tmPulssiPiilossa(opts.kuittaukset, ut, malli.vk, nytMs);   // PR 2: kuitattu/siirretty signaali piiloon kunnes ehto muuttuu / palaa_vk
    var nakyvat = ut.filter(function (s) { return !piilossa[s.avain]; });
    return { nakyvat: nakyvat.slice(0, SIGNAALI_MAX), lisaa: Math.max(0, nakyvat.length - SIGNAALI_MAX), yht: nakyvat.length, kaikki: ut, lista: nakyvat };
  }

  /* ── KUITTAUS (PR 2, D124) — Kuittaa / Ensi viikolla. Tallennus olemassa olevaan seurat/{s}/toimenpiteet-kokoelmaan (ei Asia-kokoelmaa, R1):
       { tyyppi:'pulssi', signaali:<D73-tyyppi>, joukkue:<joukkueId>, tila:'kuitattu'|'siirretty', palaa_vk:'vvvv-Www'|null, ehto, kuitattu_vk, kuitattu_pvm, kuitattu_uid, luotu }
     Doc-id pulssi_{signaali}_{joukkue}: uusi valinta korvaa edellisen. `ehto` = signaalin ehdon tunniste (ei määrää: "ilman jaksoa 3 vk" → "4 vk" on sama ehto). */
  var KUITTAUS_TUORE_PV = 14;   // sama raja kuin ehdotusten vanheneminen (D134, tm_koti_luvut.ehdotusEste)
  function tmPulssiEhto(s) { return s.tyyppi === 'katselmusikkuna' ? 'auki:' + (s.auki || 0) : s.tyyppi; }
  function tmPulssiKuittausId(s) { return 'pulssi_' + s.tyyppi + '_' + s.jid; }
  function tmPulssiKuittausDoc(s, tila, nytVk) {
    return { tyyppi: 'pulssi', signaali: s.tyyppi, joukkue: s.jid, tila: tila === 'siirretty' ? 'siirretty' : 'kuitattu', palaa_vk: tila === 'siirretty' ? viikkoLisaa(nytVk, 1) : null, ehto: s.ehto || tmPulssiEhto(s), kuitattu_vk: nytVk };
  }
  /* Piiloon: siirretty kunnes palaa_vk; kuitattu kun (tuore ≤ 14 pv) TAI (ehto sama kuin nyt). Vanhempi kuittaus piilottaa vain saman ehdon → ehdon muuttuessa signaali palaa.
     Sama dedup-periaate kuin ehdotusEste. kuittaukset = luetut dokumentit (kuitattu_pvm Timestamp|ms|ISO). */
  function tmPulssiPiilossa(kuittaukset, signaalit, nytVk, nytMs) {
    var ut = {}, nyt = nytMs != null ? nytMs : Date.now();
    var sig = {}; (signaalit || []).forEach(function (s) { sig[s.avain] = s; });
    (Array.isArray(kuittaukset) ? kuittaukset : []).forEach(function (k) {
      if (!k || k.tyyppi !== 'pulssi') return;
      var avain = k.signaali + '|' + k.joukkue, s = sig[avain]; if (!s) return;
      if (k.tila === 'siirretty') { if (k.palaa_vk && nytVk < k.palaa_vk) ut[avain] = true; return; }
      if (k.tila !== 'kuitattu') return;
      var ms = _ms(k.kuitattu_pvm), tuore = ms != null && (nyt - ms) <= KUITTAUS_TUORE_PV * DAY;
      if (tuore || k.ehto === (s.ehto || tmPulssiEhto(s))) ut[avain] = true;
    });
    return ut;
  }

  function _TV() { var V = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_viikko.js') : (typeof window !== 'undefined' ? window.TM_VIIKKO : null); if (!V || typeof V.tmIsoViikkoMs !== 'function') throw new Error('TM_VIIKKO puuttuu: lataa lib/tm_viikko.js ENNEN tm_seuran_pulssi.js:ää (D140: ei omaa viikkokaavaa)'); return V; }   // YKSI ISO 8601 -kaava; KOVA virhe jos puuttuu
  function viikkoLisaa(vk, n) { var a = _viikonAlku(vk); if (a == null) return null; return _TV().tmIsoViikkoMs(a + n * 7 * DAY).tunniste; }
  function tmPulssiSeuraavaTapahtuma(tapahtumat, nytMs) {
    var l = (Array.isArray(tapahtumat) ? tapahtumat : []).map(function (e) { return { nimi: e && e.nimi, ms: _ms(e && e.alkaa) }; }).filter(function (e) { return e.nimi && e.ms != null && e.ms > nytMs; }).sort(function (a, b) { return a.ms - b.ms; });
    return l[0] || null;
  }

  /* D125/D168 · prosentti VAIN otoksen kanssa: nimittäjä < min (oletus PIENI) → "a/b" (ei "0 %"), nimittäjä 0 → "—". Kaikki uudet prosenttiluvut kulkevat tämän kautta (PR B/D). */
  function tmProsenttiTeksti(osoittaja, nimittaja, opts) {
    var min = opts && opts.min != null ? opts.min : PIENI, n = Number(nimittaja), o = Number(osoittaja) || 0;
    if (!(n > 0)) return '—'; if (n < min) return o + '/' + n; return Math.round(100 * o / n) + ' %';
  }
  var API = { tmProsenttiTeksti: tmProsenttiTeksti, PIENI: PIENI, VANHA_PV: VANHA_PV, KAYNNISTYS_VK: KAYNNISTYS_VK, SIGNAALI_MAX: SIGNAALI_MAX, TAVOITTEET: TAVOITTEET, KAYTTO_PORTAAT: KAYTTO_PORTAAT,
    viikkoEro: viikkoEro, viikkoLisaa: viikkoLisaa, tmPulssiMerkki: tmPulssiMerkki, tmPulssiKayttoTavoite: tmPulssiKayttoTavoite, tmPulssiRivit: tmPulssiRivit, tmPulssiEhto: tmPulssiEhto, tmPulssiKuittausId: tmPulssiKuittausId, tmPulssiKuittausDoc: tmPulssiKuittausDoc, tmPulssiPiilossa: tmPulssiPiilossa, tmPulssiSignaalit: tmPulssiSignaalit, tmPulssiSeuraavaTapahtuma: tmPulssiSeuraavaTapahtuma };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_SEURAN_PULSSI = API;
})(typeof window !== 'undefined' ? window : null);
