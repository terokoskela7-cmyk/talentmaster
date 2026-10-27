/* Synteettiset tilanteet konseptisääntöjen testeihin (V0 §2 -muoto, metrit, origo keskellä, x = pituus, y = leveys).
   EI oikeaa dataa (repo on julkinen). omaPuolustaa 'vasen' → oma hyökkää +x. Kenttä 105 × 68.
   Pelaajat ovat paikallaan (kaksi pistettä); liikkuvat annetaan [[t,x,y],...]-polkuna. */
/* Paikallaan oleva pelaaja: havainto joka 0,5 s (≤ 0,5 s sääntö vaatii tiheän polun). */
function staattinen(x, y) { var a = []; for (var t = 0; t <= 10; t += 0.5) a.push({ t: t, x: x, y: y }); return a; }
function tihenna(k) {
  var o = [];
  for (var t = k[0].t; t <= k[k.length - 1].t + 1e-9; t += 0.25) {
    var i = 0; while (i < k.length - 2 && k[i + 1].t < t) i++;
    var a = k[i], b = k[i + 1], f = b.t === a.t ? 0 : Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t)));
    o.push({ t: Math.round(t * 100) / 100, x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) });
  }
  return o;
}
function p(tunniste, joukkue, rooli, polku, tarkkuus) {
  return { tunniste: tunniste, joukkue: joukkue, rooli: rooli, tarkkuus_m: tarkkuus == null ? 0.3 : tarkkuus,
    polku: polku.length && Array.isArray(polku[0]) ? tihenna(polku.map(function (a) { return { t: a[0], x: a[1], y: a[2] }; }))
      : staattinen(polku[0], polku[1]) };
}
function rakenna(o) {
  return { kentta: { pituus_m: 105, leveys_m: 68 }, suunta: { omaPuolustaa: o.suunta || 'vasen', vahvistettu: true },
    pelimuoto: o.pelimuoto || '11v11', kesto_s: 10, hz: { pelaajat: 5, pallo: 25 },
    pelaajat: o.pelaajat, pallo: o.pallo === undefined ? tihenna([{ t: 0, x: 0, y: 0 }, { t: 10, x: 0, y: 0 }]) : (o.pallo && tihenna(o.pallo)), tapahtumat: o.tapahtumat || [] };
}

/* J-P2 (11v11): oma puolustaa. Pallo laidalla (y = 25). opts: kkY (kk-linjan y:t), takaY, takaX, vastY.
   Oletus = ok-tilanne: linjaväli 11, kk-leveys 16, painopiste 1,5 m pallosta, aukko 10, toppari 0 m edellä. */
function jp2(opts) {
  opts = opts || {};
  var takaY = opts.takaY || [-15, -5, 5, 15], takaX = opts.takaX || [-34, -34, -34, -34];
  var kkY = opts.kkY || [15, 21, 27, 31], kkX = opts.kkX || -22;
  var pel = [p(100, 'oma', 'mv', [-50, 0])];
  takaY.forEach(function (y, i) { pel.push(p(1 + i, 'oma', 'pelaaja', [takaX[i], y])); });
  kkY.forEach(function (y, i) { pel.push(p(5 + i, 'oma', 'pelaaja', [kkX, y])); });
  pel.push(p(9, 'oma', 'pelaaja', [-5, 10]), p(10, 'oma', 'pelaaja', [-5, -10]));
  pel.push(p(200, 'vast', 'mv', [50, 0]));
  var v = opts.vastY || [16.5];   // lähin hyökkääjä oman takalinjan (y 15) päätyä vastaan
  pel.push(p(11, 'vast', 'pelaaja', [-33, v[0]]));
  [[-20, 25], [-18, 8], [-18, -8], [-10, -20], [-8, 0], [0, 12], [0, -12], [5, 0]].forEach(function (a, i) { pel.push(p(12 + i, 'vast', 'pelaaja', a)); });
  return rakenna({ pelaajat: pel, pelimuoto: opts.pelimuoto, suunta: opts.suunta, pallo: [{ t: 0, x: -25, y: 25 }, { t: 10, x: -25, y: 25 }] });
}
/* Klipin 6 muoto: kk-painopiste 6,5 m sivussa, toppari 4 m edellä, aukko 15 m. */
function jp2Poikkeama() {
  return jp2({ takaY: [-20, -5, 5, 15], takaX: [-34, -34, -34, -30], kkY: [8, 16, 22, 28], vastY: [30] });
}

/* 8v8: 3 + 3 + 1 hyökkääjä. */
function jp2_8v8() {
  var pel = [p(100, 'oma', 'mv', [-35, 0])];
  [-8, 0, 8].forEach(function (y, i) { pel.push(p(1 + i, 'oma', 'pelaaja', [-22, y])); });
  [6, 11, 16].forEach(function (y, i) { pel.push(p(5 + i, 'oma', 'pelaaja', [-16, y])); });
  pel.push(p(9, 'oma', 'pelaaja', [-3, 0]), p(200, 'vast', 'mv', [35, 0]));
  [[-21, 9.5], [-12, 14], [-10, -6], [-4, 0], [0, 10], [2, -10], [6, 2]].forEach(function (a, i) { pel.push(p(11 + i, 'vast', 'pelaaja', a)); });
  return rakenna({ pelaajat: pel, pelimuoto: '8v8', pallo: [{ t: 0, x: -14, y: 14 }, { t: 10, x: -14, y: 14 }] });
}

/* J-H4: oma hyökkää +x. Vastustajan blokki: taka x = 30, kk x = 18, kaksi kärjessä x = 5.
   opts: etaisyys = lähimmän vastustajan etäisyys vastaanottajasta, vastaanottajalla (tunniste 2) pallo (24, 0) hetkellä 3,
   kuljetus = vastaanottajan eteneminen 2 s aikana, juoksu = tunniste 3:n eteneminen 2 s aikana (lähtö x = 29),
   leveys = true → leveä blokki, tapahtuma = false → ei syöttötapahtumaa. */
function jh4(opts) {
  opts = opts || {};
  var et = opts.etaisyys == null ? 6.9 : opts.etaisyys, kulj = opts.kuljetus == null ? 6 : opts.kuljetus, juoksu = opts.juoksu == null ? 7 : opts.juoksu;
  var pel = [p(100, 'oma', 'mv', [-50, 0]), p(200, 'vast', 'mv', [50, 0])];
  pel.push(p(1, 'oma', 'pelaaja', [10, -15]));
  pel.push(p(2, 'oma', 'pelaaja', [[1, 24 - kulj, 0], [3, 24, 0]]));      // vastaanottaja + kuljettaja
  pel.push(p(3, 'oma', 'pelaaja', [[1, 29, 20], [3, 29 + juoksu, 20]]));  // lähtö vastustajan takalinjan tasalta
  var kkY = [-18, -6, 6, 18];
  [-15, -5, 5, 15].forEach(function (y, i) { pel.push(p(11 + i, 'vast', 'pelaaja', [30, y])); });
  kkY.forEach(function (y, i) { pel.push(p(15 + i, 'vast', 'pelaaja', i === 0 ? [24 - et, 0] : [18, y])); });
  var karki = opts.leveys ? 24 : 8;
  pel.push(p(19, 'vast', 'pelaaja', [5, karki]), p(20, 'vast', 'pelaaja', [5, -karki]));
  return rakenna({ pelaajat: pel, suunta: opts.suunta, pelimuoto: opts.pelimuoto,
    pallo: [{ t: 0, x: 18, y: 0 }, { t: 1, x: 18, y: 0 }, { t: 3, x: 24, y: 0 }, { t: 10, x: 24, y: 0 }],
    tapahtumat: opts.tapahtuma === false ? [] : [{ t: 2.6, tyyppi: 'syotto', tekija: 1, kohde: 2, lahde: 'valmentaja' }] });
}

/* Peilaus: sama tilanne 180° kierrettynä ja omaPuolustaa 'oikea' (kätisyys). */
function kierra(t) {
  var k = JSON.parse(JSON.stringify(t));
  k.suunta.omaPuolustaa = k.suunta.omaPuolustaa === 'vasen' ? 'oikea' : 'vasen';
  k.pelaajat.forEach(function (q) { q.polku.forEach(function (a) { a.x = -a.x; a.y = -a.y; }); });
  (k.pallo || []).forEach(function (a) { a.x = -a.x; a.y = -a.y; });
  return k;
}
module.exports = { jp2: jp2, jp2Poikkeama: jp2Poikkeama, jp2_8v8: jp2_8v8, jh4: jh4, kierra: kierra };
