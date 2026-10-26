// tm_konsepti_saannot.js — Videoanalyysi V1-1: konseptin mitattavat säännöt tilannekuvasta.
//
// PUHDAS: ei DOMia, ei Firestorea, ei kirjoituksia. Tuloksia ei tallenneta, ne lasketaan lennossa.
// Tilanne = V0:n metadata + data/seuranta metreinä (origo keskellä, x = pituus, y = leveys, t sekunteina):
//   { kentta:{pituus_m,leveys_m}, suunta:{omaPuolustaa:'vasen'|'oikea'}, pelimuoto,
//     pelaajat:[{tunniste, joukkue:'oma'|'vast'|'tuomari', rooli:'pelaaja'|'mv', tarkkuus_m, polku:[{t,x,y}]}],
//     pallo:[{t,x,y}]|null, tapahtumat:[{t, tyyppi, tekija, kohde, lahde}] }
//
// Sääntödata on data-objekti ilman tekstejä: nimet, KPI-tekstit ja kysymykset luetaan resolvoidusta
// konseptista (tmKonseptiResolvoi). Rajat ovat TalentMasterin oletus (Teron päätökset 25.10.2026);
// asetukset.rajat korvaa mittarikohtaisesti ja rivin `lahde` kertoo 'tm' | 'seura'.
//
// Koordinaatit käännetään "hyökkäyskoordinaatiksi" u: oma hyökkää aina kohti kasvavaa u:ta.
// Käännöstä käytetään vain syvyyteen; sivusuunnassa käytetään eroja ja itseisarvoja (kätisyys-invariantti).

var TM_KONSEPTI_SAANNOT = {
  j_p2: { faasi: 'puolustus', pelimuodot: ['8v8', '11v11'], mittarit: [
    { id: 'linjavali', kpi: 'a', laji: 'linjavali', suunta: 'max', raja: { '11v11': 12, '8v8': 7 } },
    { id: 'kk_leveys', kpi: 'a', laji: 'linjan_leveys', linja: 'kk', ehto: 'pallo_laidalla', suunta: 'max', raja: { '11v11': 25, '8v8': 15 } },
    { id: 'kk_painopiste', kpi: 'b', laji: 'painopiste_pallosta', linja: 'kk', suunta: 'max', raja: { '11v11': 4, '8v8': 2.5 } },
    { id: 'takalinja_aukko', kpi: 'c', laji: 'suurin_vali', linja: 'taka', suunta: 'max', raja: { '11v11': 12, '8v8': 7 } }
  ], roolit: [
    { konsepti: 't_p1', kpi: 'a', laji: 'linjan_edella', linja: 'taka', suunta: 'max', raja: { '11v11': 3, '8v8': 2 } },
    { konsepti: 'lp_p2', kpi: 'c', laji: 'etaisyys_lahimpaan_hyokkaajaan', kohde: 'takalinjan_paaty', suunta: 'max', raja: { '11v11': 2.5, '8v8': 2.5 } },
    { konsepti: 'kk_p1', kpi: 'a', viittaa: 'kk_painopiste' },
    { konsepti: 'j_p1', kpi: 'c', laji: 'havainto' },
    { konsepti: 't_p3', kpi: 'c', laji: 'havainto' }
  ] },
  j_h4: { faasi: 'hyokkays', pelimuodot: ['8v8', '11v11'], mittarit: [
    { id: 'blokin_venytys', kpi: 'a', laji: 'vastustajan_blokki', suunta: 'min', raja: { '11v11': { leveys: 40, siirto: 8 }, '8v8': { leveys: 24, siirto: 5 } } },
    { id: 'sitova_kuljetus', kpi: 'a', laji: 'kuljetus_eteen', suunta: 'min', raja: { '11v11': 5, '8v8': 3 } },
    { id: 'tasku_vastaanotto', kpi: 'b', laji: 'vastaanotto_linjojen_valissa', suunta: 'min', raja: { '11v11': 5, '8v8': 3 } },
    { id: 'ohitetut', kpi: 'b', laji: 'vastustajia_pallon_ja_maalin_valissa_lasku', suunta: 'min', raja: { '11v11': 4, '8v8': 3 } }
  ], roolit: [
    { konsepti: 'ky_h2', kpi: 'b', viittaa: 'tasku_vastaanotto' },
    { konsepti: 'j_h4', kpi: 'a', viittaa: 'sitova_kuljetus' },
    { konsepti: 'lp_h5', kpi: 'a', laji: 'takalinjan_tasalla_lahto', suunta: 'min', raja: { '11v11': 5, '8v8': 3 } },
    { konsepti: 'j_h5', kpi: 'a', laji: 'havainto' }
  ] }
};

var TKS_MAX_TARKKUUS_M = 2.0, TKS_LAIDALLA_OSUUS = 0.25, TKS_PALLOLLINEN_M = 2.0;
var TKS_TAKAISIN_S = 2, TKS_TASALLA_M = 2.0, TKS_NAYTE_S = 0.5, TKS_TAPAHTUMA_ENNEN_S = 2, TKS_TAPAHTUMA_JALKEEN_S = 0.3;
var TKS_LINJAKOKO = { '11v11': 4, '8v8': 3 };

function tksPyor(v) { return Math.round(v * 2) / 2; }   // 0,5 m
function tksEt(a, b) { return Math.sqrt((a.u - b.u) * (a.u - b.u) + (a.y - b.y) * (a.y - b.y)); }
function tksKeskiarvo(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s / a.length; }

// Sijainti hetkellä t: V0-1:n interpolointi (tilanneInterp, ≤ 0,5 s sääntö) — yksi totuus, ei omaa kopiota.
// Node: require; selain: window.tilanneInterp (lataa tm_tilanne_kaavio.js ennen tätä).
function tksPiste(polku, t) {
  var v0 = null;
  try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') v0 = require('./tm_tilanne_kaavio.js'); } catch (e) {}
  if (!v0 || !v0.tilanneInterp) v0 = typeof window !== 'undefined' ? window : {};
  return v0.tilanneInterp(polku, t);
}

// Tilanteen tila hetkellä t: pelaajat hyökkäyskoordinaatissa u. Epätarkat (> 2,0 m) ja tuomarit pois.
function tksTila(tilanne, t, huomiot) {
  var s = tilanne.suunta && tilanne.suunta.omaPuolustaa === 'oikea' ? -1 : 1;
  var tila = { oma: [], vast: [], omaMv: null, vastMv: null, pallo: null, leveys: tilanne.kentta ? tilanne.kentta.leveys_m : 0 };
  (tilanne.pelaajat || []).forEach(function (p) {
    if (p.joukkue !== 'oma' && p.joukkue !== 'vast') return;
    if (typeof p.tarkkuus_m === 'number' && p.tarkkuus_m > TKS_MAX_TARKKUUS_M) {
      if (huomiot && !huomiot.some(function (h) { return h.syy === 'epatarkka_ohitettu' && h.tunniste === p.tunniste; })) huomiot.push({ syy: 'epatarkka_ohitettu', tunniste: p.tunniste });
      return;
    }
    var q = tksPiste(p.polku, t);
    if (!q) return;
    var o = { tunniste: p.tunniste, u: s * q.x, y: q.y };
    if (p.rooli === 'mv') { if (p.joukkue === 'oma') tila.omaMv = o; else tila.vastMv = o; return; }
    (p.joukkue === 'oma' ? tila.oma : tila.vast).push(o);
  });
  var b = tksPiste(tilanne.pallo, t);
  if (b) tila.pallo = { u: s * b.x, y: b.y };
  tila.s = s;
  return tila;
}

function tksLinjat(pelaajat, n, syvinEnsin) {
  var j = pelaajat.slice().sort(function (a, b) { return syvinEnsin ? a.u - b.u : b.u - a.u; });
  return { taka: j.slice(0, n), kk: j.slice(n, 2 * n) };
}

function tksYlaraja(arvo, raja) { return { tila: arvo <= raja ? 'ok' : 'poikkeama', slack: raja - arvo }; }
function tksAlaraja(arvo, raja) { return { tila: arvo >= raja ? 'ok' : 'poikkeama', slack: arvo - raja }; }

function tksEi(syy) { return { tila: 'ei_dataa', arvo: null, syy: syy }; }
function tksArvo(arvo, raja, suunta, tunnisteet, tunniste) {
  var r = suunta === 'max' ? tksYlaraja(arvo, raja) : tksAlaraja(arvo, raja);
  return { tila: r.tila, arvo: arvo, slack: r.slack, tunnisteet: tunnisteet || [], tunniste: tunniste == null ? null : tunniste };
}
function tksIds(a) { return a.map(function (p) { return p.tunniste; }); }

// ── Laskijat: (tila, raja, pelimuoto, ctx) → { tila, arvo, ... }; ctx.tilanne, ctx.t, ctx.omaTila(t) ──────
var TKS_LASKIJAT = {
  linjavali: function (T, raja, pm, c) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.oma, n, true);
    if (l.kk.length < n) return tksEi('linjat_puutteelliset');
    c.huomiot.push({ syy: 'linjat_paateltu_syvyydesta' });
    var v = tksPyor(tksKeskiarvo(l.kk.map(function (p) { return p.u; })) - tksKeskiarvo(l.taka.map(function (p) { return p.u; })));
    return tksArvo(v, raja, 'max', tksIds(l.taka.concat(l.kk)));
  },
  linjan_leveys: function (T, raja, pm, c, m) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.oma, n, true);
    if (l.kk.length < n) return tksEi('linjat_puutteelliset');
    if (!T.pallo) return tksEi('pallo_puuttuu');
    if (T.leveys / 2 - Math.abs(T.pallo.y) > T.leveys * TKS_LAIDALLA_OSUUS) return tksEi('ehto_ei_tayty');
    var ys = l.kk.map(function (p) { return p.y; });
    return tksArvo(tksPyor(Math.max.apply(null, ys) - Math.min.apply(null, ys)), raja, 'max', tksIds(l.kk));
  },
  painopiste_pallosta: function (T, raja, pm) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.oma, n, true);
    if (l.kk.length < n) return tksEi('linjat_puutteelliset');
    if (!T.pallo) return tksEi('pallo_puuttuu');
    return tksArvo(tksPyor(Math.abs(tksKeskiarvo(l.kk.map(function (p) { return p.y; })) - T.pallo.y)), raja, 'max', tksIds(l.kk));
  },
  suurin_vali: function (T, raja, pm) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.oma, n, true);
    if (l.taka.length < n) return tksEi('linjat_puutteelliset');
    var ys = l.taka.map(function (p) { return p.y; }).sort(function (a, b) { return a - b; }), max = 0;
    for (var i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > max) max = ys[i] - ys[i - 1];
    return tksArvo(tksPyor(max), raja, 'max', tksIds(l.taka));
  },
  linjan_edella: function (T, raja, pm) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.oma, n, true);
    if (l.taka.length < n) return tksEi('linjat_puutteelliset');
    var edessa = l.taka[0];
    l.taka.forEach(function (p) { if (p.u > edessa.u) edessa = p; });
    var muut = l.taka.filter(function (p) { return p !== edessa; }).map(function (p) { return p.u; });
    return tksArvo(tksPyor(edessa.u - tksKeskiarvo(muut)), raja, 'max', tksIds(l.taka), edessa.tunniste);
  },
  etaisyys_lahimpaan_hyokkaajaan: function (T, raja, pm) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.oma, n, true);
    if (l.taka.length < n) return tksEi('linjat_puutteelliset');
    if (!T.pallo) return tksEi('pallo_puuttuu');
    if (!T.vast.length) return tksEi('vastustajat_puuttuvat');
    var keski = tksKeskiarvo(l.taka.map(function (p) { return p.y; })), paa = l.taka[0];
    l.taka.forEach(function (p) { if (T.pallo.y >= keski ? p.y > paa.y : p.y < paa.y) paa = p; });
    var min = Infinity;
    T.vast.forEach(function (v) { var d = tksEt(paa, v); if (d < min) min = d; });
    return tksArvo(tksPyor(min), raja, 'max', tksIds(l.taka), paa.tunniste);
  },
  vastustajan_blokki: function (T, raja, pm, c) {
    if (T.vast.length < 2) return tksEi('liian_vahan_pelaajia');
    var ys = T.vast.map(function (p) { return p.y; });
    var leveys = tksPyor(Math.max.apply(null, ys) - Math.min.apply(null, ys)), siirto = null;
    var ed = tksTila(c.tilanne, c.t - TKS_TAKAISIN_S, null);
    if (ed.vast.length === T.vast.length) siirto = tksPyor(Math.abs(tksKeskiarvo(ys) - tksKeskiarvo(ed.vast.map(function (p) { return p.y; }))));
    var ok = leveys >= raja.leveys || (siirto !== null && siirto >= raja.siirto);
    var slack = Math.max(leveys / raja.leveys, siirto === null ? 0 : siirto / raja.siirto) - 1;
    return { tila: ok ? 'ok' : 'poikkeama', arvo: { leveys: leveys, siirto: siirto }, slack: slack, tunnisteet: tksIds(T.vast), tunniste: null };
  },
  kuljetus_eteen: function (T, raja, pm, c) {
    var k = tksPallollinen(T);
    if (!k) return tksEi('pallollinen_puuttuu');
    var ed = tksTila(c.tilanne, c.t - TKS_TAKAISIN_S, null).oma.filter(function (p) { return p.tunniste === k.tunniste; })[0];
    if (!ed) return tksEi('ei_havaintoa');
    return tksArvo(tksPyor(k.u - ed.u), raja, 'min', [k.tunniste], k.tunniste);
  },
  vastaanotto_linjojen_valissa: function (T, raja, pm, c) {
    var e = tksSyotto(c);
    if (!e) return tksEi('tapahtuma_puuttuu');
    var vast = T.oma.filter(function (p) { return p.tunniste === e.kohde; })[0];
    if (!vast) return tksEi('ei_havaintoa');
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.vast, n, false);
    if (l.kk.length < n) return tksEi('linjat_puutteelliset');
    var kk = tksKeskiarvo(l.kk.map(function (p) { return p.u; })), taka = tksKeskiarvo(l.taka.map(function (p) { return p.u; }));
    if (!(vast.u > kk && vast.u < taka)) return tksEi('ehto_ei_tayty');
    var min = Infinity;
    T.vast.forEach(function (v) { var d = tksEt(vast, v); if (d < min) min = d; });
    return tksArvo(tksPyor(min), raja, 'min', [vast.tunniste], vast.tunniste);
  },
  // "ohitetut" = pallon ja maalin välissä olevien vastustajien määrän LASKU ikkunan alusta loppuun
  // (ennen − jälkeen). Valmiiksi pallon takana olevat eivät lisää tulosta. Vain molemmilla hetkillä
  // havaitut vastustajat lasketaan. Ikkuna: [c.alku, c.t].
  vastustajia_pallon_ja_maalin_valissa_lasku: function (T, raja, pm, c) {
    var A = tksTila(c.tilanne, c.alku, null);
    if (!A.pallo || !T.pallo) return tksEi('pallo_puuttuu');
    var nyt = {};
    T.vast.forEach(function (p) { nyt[p.tunniste] = p; });
    var yhteiset = A.vast.filter(function (p) { return nyt[p.tunniste]; });
    if (yhteiset.length < 2) return tksEi('liian_vahan_pelaajia');
    var ennen = yhteiset.filter(function (p) { return p.u > A.pallo.u; });
    var jalkeen = yhteiset.filter(function (p) { return nyt[p.tunniste].u > T.pallo.u; });
    var ohitetut = ennen.filter(function (p) { return jalkeen.indexOf(nyt[p.tunniste]) < 0; });
    return tksArvo(ennen.length - jalkeen.length, raja, 'min', tksIds(ohitetut));
  },
  takalinjan_tasalla_lahto: function (T, raja, pm, c) {
    var n = TKS_LINJAKOKO[pm], l = tksLinjat(T.vast, n, false);
    if (l.taka.length < n) return tksEi('linjat_puutteelliset');
    var ed = tksTila(c.tilanne, c.t - TKS_TAKAISIN_S, null);
    var edL = tksLinjat(ed.vast, n, false);
    if (edL.taka.length < n) return tksEi('ei_havaintoa');
    var linja = tksKeskiarvo(edL.taka.map(function (p) { return p.u; })), paras = null;
    ed.oma.forEach(function (o0) {
      if (o0.u > linja + TKS_TASALLA_M) return;
      var nyt = T.oma.filter(function (p) { return p.tunniste === o0.tunniste; })[0];
      if (!nyt) return;
      var matka = nyt.u - o0.u;
      if (!paras || matka > paras.matka) paras = { matka: matka, tunniste: o0.tunniste };
    });
    if (!paras) return tksEi('ehto_ei_tayty');
    return tksArvo(tksPyor(paras.matka), raja, 'min', [paras.tunniste], paras.tunniste);
  }
};

function tksPallollinen(T) {
  if (!T.pallo) return null;
  var paras = null, d;
  T.oma.forEach(function (p) { d = tksEt(p, T.pallo); if (d <= TKS_PALLOLLINEN_M && (!paras || d < paras.d)) paras = { d: d, p: p }; });
  return paras ? paras.p : null;
}
// Viimeisin oman joukkueen syöttö, jolla on kohde, ikkunassa [t − 2 s, t + 0,3 s].
function tksSyotto(c) {
  var omat = {}, paras = null;
  (c.tilanne.pelaajat || []).forEach(function (p) { if (p.joukkue === 'oma') omat[p.tunniste] = true; });
  (c.tilanne.tapahtumat || []).forEach(function (e) {
    if (e.tyyppi !== 'syotto' || e.kohde == null || !omat[e.tekija] || !omat[e.kohde]) return;
    if (e.t < c.t - TKS_TAPAHTUMA_ENNEN_S || e.t > c.t + TKS_TAPAHTUMA_JALKEEN_S) return;
    if (!paras || e.t > paras.t) paras = e;
  });
  return paras;
}

// Oletusraja pelimuodolle + seuran ylikirjoitus. Palauttaa { raja, lahde }.
function tksRaja(maaritys, id, pm, asetukset) {
  var oletus = maaritys.raja[pm], seura = asetukset && asetukset.rajat && asetukset.rajat[id];
  if (seura === undefined || seura === null) return { raja: oletus, lahde: 'tm' };
  if (typeof oletus === 'object') {
    if (typeof seura !== 'object') return { raja: oletus, lahde: 'tm' };
    var r = {};
    for (var k in oletus) r[k] = typeof seura[k] === 'number' ? seura[k] : oletus[k];
    return { raja: r, lahde: 'seura' };
  }
  return typeof seura === 'number' ? { raja: seura, lahde: 'seura' } : { raja: oletus, lahde: 'tm' };
}

// Yksi sääntö yhdellä hetkellä.
function tksLaske(m, id, pm, asetukset, c) {
  if (!m.laji || m.laji === 'havainto') return { tila: 'havainto', arvo: null, raja: null, lahde: 'tm', tunnisteet: [], tunniste: null };
  var r = tksRaja(m, id, pm, asetukset), T = tksTila(c.tilanne, c.t, c.huomiot), tulos;
  if (T.oma.length === 0 && T.vast.length === 0) tulos = tksEi('ei_havaintoa');
  else tulos = TKS_LASKIJAT[m.laji](T, r.raja, pm, c, m);
  tulos.raja = r.raja; tulos.lahde = r.lahde;
  return tulos;
}

// Aikavälillä (ikkuna_s > 0) näytteet 0,5 s välein ja huonoin raja-ala (pienin slack) voittaa.
function tksHuonoin(m, id, pm, asetukset, tilanne, t, ikkuna, huomiot) {
  if (m.laji === 'vastustajia_pallon_ja_maalin_valissa_lasku') {   // ikkuna on mittarin oma: [t, t+ikkuna] tai [t−2 s, t]
    var loppu = ikkuna > 0 ? t + ikkuna : t, alku = ikkuna > 0 ? t : t - TKS_TAKAISIN_S;
    var yksi = tksLaske(m, id, pm, asetukset, { tilanne: tilanne, t: loppu, alku: alku, huomiot: huomiot });
    yksi.t = loppu;
    return yksi;
  }
  var ajat = [t];
  for (var s = TKS_NAYTE_S; s <= ikkuna + 1e-9; s += TKS_NAYTE_S) ajat.push(Math.round((t + s) * 1000) / 1000);
  var paras = null, eka = null;
  ajat.forEach(function (ta) {
    var r = tksLaske(m, id, pm, asetukset, { tilanne: tilanne, t: ta, huomiot: huomiot });
    r.t = ta;
    if (!eka) eka = r;
    if (r.tila === 'havainto') { if (!paras) paras = r; return; }
    if (r.tila === 'ei_dataa') return;
    if (!paras || paras.tila === 'havainto' || r.slack < paras.slack) paras = r;
  });
  return paras || eka;
}

function tksRivi(r, perus) {
  var o = {};
  for (var k in perus) o[k] = perus[k];
  o.arvo = r.arvo; o.raja = r.raja == null ? null : r.raja; o.tila = r.tila; o.lahde = r.lahde; o.t = r.t;
  return o;
}

function konseptiSaannot(tilanne, avain, opts) {
  opts = opts || {};
  var tyhja = { mittarit: [], roolit: [], huomiot: [] };
  var def = TM_KONSEPTI_SAANNOT[String(avain || '').toLowerCase().replace(/-/g, '_')];
  if (!def || !tilanne || !tilanne.kentta || typeof opts.t !== 'number') return tyhja;
  var pm = opts.pelimuoto || tilanne.pelimuoto, ikkuna = opts.ikkuna_s > 0 ? opts.ikkuna_s : 0, huomiot = [];
  var tuettu = def.pelimuodot.indexOf(pm) >= 0;
  if (!tuettu) huomiot.push({ syy: 'pelimuoto_ei_konseptin' });
  else if (!(tilanne.pelaajat || []).some(function (p) { return p.rooli === 'mv' && p.joukkue === 'oma'; })) huomiot.push({ syy: 'mv_ei_merkitty' });
  var a = opts.asetukset;
  var tulokset = {};
  function laske(m, id) {
    if (!tuettu) return { tila: 'ei_dataa', arvo: null, raja: null, lahde: 'tm', tunnisteet: [], tunniste: null, t: opts.t };
    var r = tksHuonoin(m, id, pm, a, tilanne, opts.t, ikkuna, huomiot);
    return r;
  }
  var mittarit = def.mittarit.map(function (m) {
    var r = laske(m, m.id); tulokset[m.id] = r;
    var rivi = tksRivi(r, { id: m.id, kpi: m.kpi });
    rivi.tunnisteet = r.tunnisteet || [];
    return rivi;
  });
  var roolit = def.roolit.map(function (m) {
    var r;
    if (m.viittaa) {
      r = tulokset[m.viittaa] || { tila: 'ei_dataa', arvo: null, raja: null, lahde: 'tm', t: opts.t };
      var rivi = tksRivi(r, { konsepti: m.konsepti, kpi: m.kpi });
      rivi.tunniste = r.tunniste == null ? null : r.tunniste;
      return rivi;
    }
    r = laske(m, m.konsepti);
    var o = tksRivi(r, { konsepti: m.konsepti, kpi: m.kpi });
    o.tunniste = r.tunniste == null ? null : r.tunniste;
    return o;
  });
  var nahty = {};
  return { mittarit: mittarit, roolit: roolit, huomiot: huomiot.filter(function (h) { var k = h.syy + ':' + h.tunniste; if (nahty[k]) return false; nahty[k] = true; return true; }) };
}

var TM_KONSEPTI_SAANNOT_API = { konseptiSaannot: konseptiSaannot, TM_KONSEPTI_SAANNOT: TM_KONSEPTI_SAANNOT };
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KONSEPTI_SAANNOT_API;
if (typeof window !== 'undefined') { for (var _tksk in TM_KONSEPTI_SAANNOT_API) { try { window[_tksk] = TM_KONSEPTI_SAANNOT_API[_tksk]; } catch (e) {} } }
