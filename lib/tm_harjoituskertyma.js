/* ════════════════════════════════════════════════════════════════════════
   tm_harjoituskertyma.js — K35-6f · pelaajan harjoituskertymä (ohjattu + omatoiminen): YKSI jaettu kooste valmentajalle, pelaajalle ja huoltajalle. PURE, dual-export (Node + selain); kopio functions/-kansioon.
   Kehittävä sävy: ei vertailua muihin pelaajiin, ei "luvatonta poissaoloa". Laskenta viikkokoreihin ('YYYY-Www', ISO: lib/tm_viikko.js) → palvelin tallentaa korit (pelaajat/{pid}/kooste/kertyma_{kausi}), näkymät summaavat.
   · ohjattu (kategoriat): treeni = joukkueharjoitus · aamu = aamutreeni (alalaji 'aamutreeni') · ryhma = ryhmätreeni · ottelu. Joka kategoriassa: paik, myoh, poissa{sairas, estynyt, muu}, ei_kirjattu.
       Lasketaan VAIN valmentajan vahvistamat läsnäolot (lasnaolijat-dokin tila); päättynyt tapahtuma ilman pelaajan tilaa = "ei kirjattu" (EI poissa). Poissa-syyt erikseen (sairas / estynyt-ilmoitus / muu) — ei luvaton-luokkaa.
       Rosteri = tmKuuluuPelaajalle (jäsenyys §7.18, poimitut, ryhmä) kun pelaaja annetaan.
   · omatoimi: kirjaukset (tehty ≠ false, ei 'lepo'): n + minuutit (kesto_min, jos on).
   · srpe: null — RAKENNE VARATTU: sRPE/kuorma (D197) lisätään myöhemmin samaan viikkokoriin.
   API: tmKertymaPaiva(ms|Timestamp|ISO) → Helsingin päivä · tmKertymaVkRajat(iso) → { avain, ma, su } · tmKertymaKausiAvain(iso) · tmKertymaKausiAlku(iso) · tmKertymaVkAvain(iso) · tmKertymaKategoria(ev) · tmKertymaPoissaSyy(lasnaolo) · tmViikkoKori({ tapahtumat, lasnaolot:{evId:{tila,syy,saatavuus}}, kirjaukset:[{pvm,tyyppi,tehty,kesto_min}], pelaaja?, joukkueDocs?, nyt })
        tmKertymaKorit(sisaan) → { 'YYYY-Www': kori } · tmKertymaKoreista(korit, nyt) → { vk4, kausi, viikot:[{vk, ohjattu, omatoimi, min, srpe:null}] } · tmKertyma({ …, nyt, kausiAlku }) → sama (korit + summaus)
        tmKertymaJoukkue(pelaajienVk4[]) → { pelaajia, ohjattuPros, alle70:[indeksit] } (Pulssi, vain valmentajalle)
   Dual-export: module.exports || window.TM_HARJOITUSKERTYMA.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  function _lib(f, g) { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require(f); } catch (e) { /* selain */ } return (root && root[g]) || {}; }
  function _VK() { return _lib('./tm_viikko.js', 'TM_VIIKKO'); }
  function _TY() { return _lib('./tm_kalenteri_tyypit.js', 'TM_KALENTERI_TYYPIT'); }
  function _KP() { return _lib('./tm_kalenteri_pelaajalle.js', 'TM_KALENTERI_PELAAJALLE'); }
  var KATEGORIAT = ['treeni', 'aamu', 'ryhma', 'ottelu'], OHJATTU_PROS = ['treeni', 'aamu', 'ryhma'], DAY = 86400000;

  function _utc(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], 12) : null; }
  function _iso(u) { var d = new Date(u), z = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getUTCFullYear() + '-' + z(d.getUTCMonth() + 1) + '-' + z(d.getUTCDate()); }
  var _fmt = null;
  function _paiva(x) {   // Helsingin kalenteripäivä: 'YYYY-MM-DD' -merkkijono | ms | Date | Timestamp
    if (typeof x === 'string' && /^\d{4}-\d{2}-\d{2}/.test(x)) return x.slice(0, 10);
    var ms = x == null ? null : (typeof x === 'number' ? x : (x instanceof Date ? x.getTime() : (typeof x.toDate === 'function' ? x.toDate().getTime() : Date.parse(x)))); if (ms == null || isNaN(ms)) return null;
    try { _fmt = _fmt || new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit' }); return _fmt.format(new Date(ms)); } catch (e) { return _iso(ms + 3 * 3600000); }
  }
  function tmKertymaVkAvain(iso) { var u = _utc(iso); if (u == null) return null; var d = new Date(u); return _VK().tmIsoViikkoYMD(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).tunniste; }
  function _vkMaanantai(avain) {   // 'YYYY-Www' → maanantain ISO-päivä (torstai-menetelmä: viikon 1 torstai = vuoden 1. torstai)
    var m = /^(\d{4})-W(\d{2})$/.exec(String(avain || '')); if (!m) return null; var j4 = Date.UTC(+m[1], 0, 4, 12), wd = (new Date(j4).getUTCDay() + 6) % 7; return _iso(j4 - wd * DAY + (+m[2] - 1) * 7 * DAY);
  }
  function tmKertymaVkRajat(iso) { var v = tmKertymaVkAvain(iso), ma = v && _vkMaanantai(v); return ma ? { avain: v, ma: ma, su: _iso(_utc(ma) + 6 * DAY) } : null; }
  function tmKertymaKausiAvain(iso) { var m = /^(\d{4})-(\d{2})/.exec(String(iso || '')); if (!m) return null; var y = +m[1], kk = +m[2]; var a = kk >= 8 ? y : y - 1; return a + '-' + String((a + 1) % 100).padStart(2, '0'); }
  function tmKertymaKausiAlku(iso) { var k = tmKertymaKausiAvain(iso); return k ? k.slice(0, 4) + '-08-01' : null; }

  function tmKertymaKategoria(ev) {
    if (!ev || ev.poistettu === true || ev.tila === 'peruttu' || ev.tila === 'peruutettu') return null;
    var a = _TY().tmKalTyyppiAvain ? _TY().tmKalTyyppiAvain(ev.tyyppi) : ev.tyyppi;
    if (a === 'ottelu') return 'ottelu'; if (a !== 'harjoitus') return null;
    return ev.alalaji === 'aamutreeni' ? 'aamu' : (ev.kohde && ev.kohde.tyyppi === 'ryhma' ? 'ryhma' : 'treeni');
  }
  function tmKertymaPoissaSyy(la) {   // ilmoitettu syy: sairas | estynyt (ennakkoilmoitus tai syy) | muu — ei "luvaton"-luokkaa
    var s = String((la && la.syy) || '').toLowerCase();
    if (/sairas|kipe|flunssa|kuume|vamma|loukka|tauti/.test(s)) return 'sairas';
    if ((la && la.saatavuus === 'estynyt') || /estyn|koulu|loma|matka|perhe|kokeet?|tentti/.test(s)) return 'estynyt';
    return 'muu';
  }
  function _kat() { return { paik: 0, myoh: 0, poissa: { sairas: 0, estynyt: 0, muu: 0 }, ei_kirjattu: 0 }; }
  function _tyhjaKori() { var k = { omatoimi: { n: 0, min: 0 }, srpe: null }; KATEGORIAT.forEach(function (c) { k[c] = _kat(); }); return k; }

  function tmViikkoKori(a) {
    a = a || {}; var kori = _tyhjaKori(), KP = _KP(), nyt = a.nyt != null ? +a.nyt : Date.now(), la = a.lasnaolot || {};
    (Array.isArray(a.tapahtumat) ? a.tapahtumat : []).forEach(function (ev) {
      var c = tmKertymaKategoria(ev); if (!c) return;
      if (a.pelaaja && KP.tmKuuluuPelaajalle && !KP.tmKuuluuPelaajalle(ev, a.pelaaja, a.joukkueDocs || [])) return;
      var x = la[ev.id], t = x && x.tila, k = kori[c];
      if (t === 'paikalla') k.paik++; else if (t === 'myohassa') k.myoh++; else if (t === 'poissa') k.poissa[tmKertymaPoissaSyy(x)]++;
      else { var loppu = ev._paattyyMs != null ? ev._paattyyMs : (ev.paattyy ? _ms(ev.paattyy) : _ms(ev.alkaa)); if (loppu != null && loppu < nyt) k.ei_kirjattu++; }   // vahvistamaton = ei kirjattu (ei poissa); tulevaa ei lasketa
    });
    (Array.isArray(a.kirjaukset) ? a.kirjaukset : []).forEach(function (r) { if (!r || r.tehty === false || r.tyyppi === 'lepo') return; kori.omatoimi.n++; kori.omatoimi.min += +r.kesto_min > 0 ? +r.kesto_min : 0; });
    return kori;
  }
  function _ms(x) { if (x == null || x === '') return null; if (typeof x === 'number') return x; if (typeof x.toDate === 'function') return x.toDate().getTime(); var t = Date.parse(x); return isNaN(t) ? null : t; }

  function tmKertymaKorit(a) {   // ryhmittelee tapahtumat ja kirjaukset viikkoihin → korit
    a = a || {}; var ev = {}, kir = {};
    (a.tapahtumat || []).forEach(function (e) { var p = _paiva(e.pvm || e._alkaaMs || e.alkaa), v = p && tmKertymaVkAvain(p); if (v) (ev[v] = ev[v] || []).push(e); });
    (a.kirjaukset || []).forEach(function (r) { var p = _paiva(r.pvm || r.paivays || r.id), v = p && tmKertymaVkAvain(p); if (v) (kir[v] = kir[v] || []).push(r); });
    var out = {}; Object.keys(ev).concat(Object.keys(kir)).forEach(function (v) { if (!out[v]) out[v] = tmViikkoKori({ tapahtumat: ev[v] || [], lasnaolot: a.lasnaolot, kirjaukset: kir[v] || [], pelaaja: a.pelaaja, joukkueDocs: a.joukkueDocs, nyt: a.nyt }); });
    return out;
  }

  function _summaa(kohde, k) {
    KATEGORIAT.forEach(function (c) { var s = kohde[c], x = k[c]; if (!x) return; s.paik += x.paik || 0; s.myoh += x.myoh || 0; s.ei_kirjattu += x.ei_kirjattu || 0; ['sairas', 'estynyt', 'muu'].forEach(function (z) { s.poissa[z] += (x.poissa && x.poissa[z]) || 0; }); });
    if (k.omatoimi) { kohde.omatoimi.n += k.omatoimi.n || 0; kohde.omatoimi.min += k.omatoimi.min || 0; }
  }
  function _valmis(s) { KATEGORIAT.forEach(function (c) { var x = s[c]; x.poissa.yht = x.poissa.sairas + x.poissa.estynyt + x.poissa.muu; x.lasna = x.paik + x.myoh; x.yht = x.lasna + x.poissa.yht; }); return s; }
  function _tyhjaSumma() { var s = { omatoimi: { n: 0, min: 0 } }; KATEGORIAT.forEach(function (c) { s[c] = _kat(); }); return s; }

  function _norm(k) {   // palvelimelta tuleva kori voi olla vajaa (vanha versio / puuttuva kategoria) → täydennä nolliksi
    var t = _tyhjaKori(); k = k || {}; KATEGORIAT.forEach(function (c) { if (k[c]) { t[c].paik = k[c].paik || 0; t[c].myoh = k[c].myoh || 0; t[c].ei_kirjattu = k[c].ei_kirjattu || 0; ['sairas', 'estynyt', 'muu'].forEach(function (z) { t[c].poissa[z] = (k[c].poissa && k[c].poissa[z]) || 0; }); } }); if (k.omatoimi) t.omatoimi = { n: k.omatoimi.n || 0, min: k.omatoimi.min || 0 }; return t;
  }
  function tmKertymaKoreista(korit0, nyt, opts) {
    var korit = {}; Object.keys(korit0 || {}).forEach(function (v) { korit[v] = _norm(korit0[v]); }); var tanaan = _paiva(nyt != null ? nyt : Date.now()), ma = _utc(_vkMaanantai(tmKertymaVkAvain(tanaan))), vk4 = _tyhjaSumma(), kausi = _tyhjaSumma(), viikot = [], i;
    var alku = (opts && opts.kausiAlku) || tmKertymaKausiAlku(tanaan), nelja = {}, lista = [];
    for (i = 11; i >= 0; i--) lista.push(tmKertymaVkAvain(_iso(ma - i * 7 * DAY)));
    lista.slice(-4).forEach(function (v) { nelja[v] = 1; });
    Object.keys(korit).forEach(function (v) { var m = _vkMaanantai(v); if (m && _iso(_utc(m) + 6 * DAY) >= alku && m <= tanaan) { _summaa(kausi, korit[v]); } if (nelja[v]) _summaa(vk4, korit[v]); });
    lista.forEach(function (v) { var k = korit[v] || _tyhjaKori(), o = 0; OHJATTU_PROS.concat(['ottelu']).forEach(function (c) { o += (k[c].paik || 0) + (k[c].myoh || 0); }); viikot.push({ vk: v, ohjattu: o, omatoimi: k.omatoimi.n, min: k.omatoimi.min, srpe: null }); });
    return { vk4: _valmis(vk4), kausi: _valmis(kausi), viikot: viikot, kausiAvain: tmKertymaKausiAvain(tanaan) };
  }
  function tmKertyma(a) { return tmKertymaKoreista(tmKertymaKorit(a), a && a.nyt, { kausiAlku: a && a.kausiAlku }); }

  /* Pulssi (joukkue): jokaisen pelaajan vk4 → joukkueen ohjattu läsnäolo-% ja alle 70 % olevat (indeksit; näytetään vain valmentajalle) */
  function tmKertymaJoukkue(lista) {
    var p = 0, y = 0, alle = [], n = 0;
    (lista || []).forEach(function (v, i) { if (!v) return; var l = 0, t = 0; OHJATTU_PROS.forEach(function (c) { l += v[c].lasna != null ? v[c].lasna : (v[c].paik + v[c].myoh); t += v[c].yht != null ? v[c].yht : (v[c].paik + v[c].myoh + (v[c].poissa.yht || 0)); }); if (!t) return; n++; p += l; y += t; if (l / t < 0.7) alle.push(i); });
    return { pelaajia: n, ohjattuPros: y ? Math.round(100 * p / y) : null, alle70: alle };
  }

  /* Lataus (kuoren kytkentä): henkilökunta lukee koosteen suoraan (Rules v3.59), pelaaja/huoltaja callablella haePelaajanKertyma. Molemmat → tmKertymaKoreista-muotoinen tulos tai null (virhe/ei dokumenttia = tyhjä kausi). */
  function tmKertymaLueKooste(db, sid, pid, nyt) {
    nyt = nyt != null ? nyt : Date.now();
    return db.collection('seurat').doc(sid).collection('pelaajat').doc(pid).collection('kooste').doc('kertyma_' + tmKertymaKausiAvain(_paiva(nyt))).get()
      .then(function (d) { return tmKertymaKoreista(d && d.exists ? (d.data() || {}).viikot : {}, nyt); }, function () { return null; });
  }
  function tmKertymaLueCallable(fn, args, nyt) {
    return fn(args).then(function (v) { return (v && v.data && v.data.kertyma) || null; }, function () { return null; });
  }
  function tmKertymaLueJoukkue(db, sid, pidt, nyt) {   // Pulssi: pelaajakohtaiset vk4-summat (taulukko pidt-järjestyksessä) → tmKertymaJoukkue
    return Promise.all((pidt || []).map(function (pid) { return tmKertymaLueKooste(db, sid, pid, nyt).then(function (k) { return k && k.vk4; }); })).then(tmKertymaJoukkue);
  }
  var API = { tmKertymaLueKooste: tmKertymaLueKooste, tmKertymaLueCallable: tmKertymaLueCallable, tmKertymaLueJoukkue: tmKertymaLueJoukkue, KATEGORIAT: KATEGORIAT, tmKertymaPaiva: _paiva, tmKertymaVkAvain: tmKertymaVkAvain, tmKertymaVkRajat: tmKertymaVkRajat, tmKertymaKausiAvain: tmKertymaKausiAvain, tmKertymaKausiAlku: tmKertymaKausiAlku, tmKertymaKategoria: tmKertymaKategoria, tmKertymaPoissaSyy: tmKertymaPoissaSyy, tmViikkoKori: tmViikkoKori, tmKertymaKorit: tmKertymaKorit, tmKertymaKoreista: tmKertymaKoreista, tmKertyma: tmKertyma, tmKertymaJoukkue: tmKertymaJoukkue };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_HARJOITUSKERTYMA = API;
})(typeof window !== 'undefined' ? window : null);
