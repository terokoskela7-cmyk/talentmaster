// tm_konsepti_saannot.js — Taktiikkatyökalu, vaihe A · V1-1: konseptin sääntörivit tilanteesta.
//
// Puhdas kirjasto: tilanne + resolvoitu konsepti sisään, sääntörivit ulos. Ei Firestorea, ei DOMia,
// ei kirjoituksia, ei tallennusta (seuran rajat tulevat parametrina, opts.rajat). Ei xT/xG:tä.
// Ensimmäinen konsepti: J-P2 (pelikeskustan tasapaino). Uusi konsepti = uusi rivi SAANNOT-rekisteriin.
//
// SYÖTE
//   tilanne = { id, pelimuoto: '8v8'|'11v11', kentta: { pituus, leveys } (m),
//               suunta: 'ylos'|'alas'   // oman joukkueen hyökkäyssuunta, sama kuin kaavion spec.suunta
//               hetket: [ { t, vaihe?: 'puolustus'|'hyokkays', pallo: {x,y},
//                           oma: [ {id,x,y,mv?} ], vastustaja: [ {id,x,y,mv?} ] } ] }
//   Koordinaatit metreinä kaavion akseleilla: x = leveys (0..kentta.leveys), y = pituus (0..kentta.pituus).
//   konsepti = tmKonseptiResolvoi()-tulos (käytetään avain + pelimuoto[]).
//   opts = { puolustaja: 'oma'|'vastustaja' (oletus 'oma'), rajat: { ... } (seuran ylikirjoitukset) }
//
// TULOS: taulukko { saanto, kpi, tila, arvo, raja, hetki, perustelu }
//   tila: 'ok'        raja täyttyy kaikilla arvioiduilla hetkillä
//         'ylittyy'   raja rikkoutuu (myös alitus, kun sääntö vaatii vähimmäisarvoa) — arvo/hetki = pahin kohta
//         'havainto'  arvo mitataan, mutta rajaa ei ole (seura asetti rajan null)
//         'ei_dataa'  sääntöä ei voi arvioida (ei sopivia hetkiä / konsepti ei koske pelimuotoa)
//   hetki = pahimman (tai ei_datassa null) hetken indeksi hetket[]-taulukossa; arvo/raja numeroita.
//
// Perustelut ovat suomenkielistä sisäistä tekstiä; sv-käännöstä ei ole (odotuslista, PM kirjoittaa).

var TM_KS_OLETUSRAJAT = {
  // Oletukset ovat lähtöarvoja, EIVÄT menetelmän osa: seura ylikirjoittaa opts.rajat:lla.
  // 8v8 = konseptipelin merkitty alue (n. 30 × 25 m, ks. kaanon j_p2). 11v11 skaalattu; PM vahvistaa.
  '8v8':   { leveys: 25, syvyys: 30, siirto_osuus: 0.5, keskusta_min: 2, siirto_min_m: 8 },
  '11v11': { leveys: 40, syvyys: 35, siirto_osuus: 0.5, keskusta_min: 3, siirto_min_m: 10 }
};

function _ksLuku(v) { return typeof v === 'number' && isFinite(v); }
function _ksPyoristaa(v) { return Math.round(v * 10) / 10; }

function _ksRajat(pelimuoto, ylikirjoitus) {
  var pohja = TM_KS_OLETUSRAJAT[pelimuoto];
  if (!pohja) return null;
  var r = {}, k;
  for (k in pohja) r[k] = pohja[k];
  if (ylikirjoitus && typeof ylikirjoitus === 'object') {
    for (k in ylikirjoitus) {
      if (!Object.prototype.hasOwnProperty.call(pohja, k)) continue;
      if (ylikirjoitus[k] === null) r[k] = null;               // null = ei rajaa → 'havainto'
      else if (_ksLuku(ylikirjoitus[k])) r[k] = ylikirjoitus[k]; // muu kelvoton arvo ohitetaan
    }
  }
  return r;
}

// Kenttäpelaajat: maalivahti pois (mv-lippu, muuten oman maalin puoleisin).
function _ksKentta(pelaajat, suunta, kenttaPituus) {
  var lista = (pelaajat || []).filter(function (p) { return p && _ksLuku(p.x) && _ksLuku(p.y); });
  if (lista.length < 2) return [];
  var mv = lista.filter(function (p) { return p.mv === true; })[0];
  if (!mv) {
    // oma maali on hyökkäyssuunnan vastakkaisessa päässä; 'ylos' → hyökkäys y→0, maali y=pituus
    var syvin = lista[0];
    lista.forEach(function (p) {
      if (suunta === 'alas' ? p.y < syvin.y : p.y > syvin.y) syvin = p;
    });
    mv = syvin;
  }
  return lista.filter(function (p) { return p !== mv; });
}

// Puolustavan joukkueen hetket, joissa ryhmityksen sääntöjä voi arvioida.
function _ksHetket(tilanne, puolustaja) {
  var suunta = tilanne.suunta === 'alas' ? 'alas' : 'ylos';
  // vastustajan hyökkäyssuunta on päinvastainen
  var puolSuunta = puolustaja === 'vastustaja' ? (suunta === 'ylos' ? 'alas' : 'ylos') : suunta;
  var out = [];
  (tilanne.hetket || []).forEach(function (h, i) {
    if (!h || !h.pallo || !_ksLuku(h.pallo.x) || !_ksLuku(h.pallo.y)) return;
    if (h.vaihe && h.vaihe !== 'puolustus') return;
    var kp = _ksKentta(h[puolustaja], puolSuunta, tilanne.kentta && tilanne.kentta.pituus);
    if (kp.length < 3) return;
    var xs = kp.map(function (p) { return p.x; }), ys = kp.map(function (p) { return p.y; });
    out.push({
      i: i, pallo: h.pallo, pelaajat: kp,
      leveys: Math.max.apply(null, xs) - Math.min.apply(null, xs),
      syvyys: Math.max.apply(null, ys) - Math.min.apply(null, ys),
      keskipiste: xs.reduce(function (a, b) { return a + b; }, 0) / xs.length
    });
  });
  return out;
}

function _ksRivi(saanto, kpi, tila, arvo, raja, hetki, perustelu) {
  return { saanto: saanto, kpi: kpi, tila: tila, arvo: arvo, raja: raja, hetki: hetki, perustelu: perustelu };
}
function _ksEiDataa(saanto, kpi, syy) { return _ksRivi(saanto, kpi, 'ei_dataa', null, null, null, syy); }

// Yläraja-sääntö (leveys, syvyys): pahin = suurin arvo.
function _ksYlaraja(saanto, kpi, hetket, kentta, raja, nimi) {
  if (!hetket.length) return _ksEiDataa(saanto, kpi, 'Ei puolustushetkiä, joissa kenttäpelaajia on vähintään kolme.');
  var pahin = hetket[0];
  hetket.forEach(function (h) { if (h[kentta] > pahin[kentta]) pahin = h; });
  var arvo = _ksPyoristaa(pahin[kentta]);
  if (raja === null) return _ksRivi(saanto, kpi, 'havainto', arvo, null, pahin.i, 'Ryhmityksen ' + nimi + ' oli enimmillään ' + arvo + ' m (seuralla ei rajaa).');
  var rikki = arvo > raja;
  return _ksRivi(saanto, kpi, rikki ? 'ylittyy' : 'ok', arvo, raja, pahin.i,
    'Ryhmityksen ' + nimi + ' oli enimmillään ' + arvo + ' m, raja ' + raja + ' m.');
}

function _ksLeveys(hetket, r) { return _ksYlaraja('j_p2a_leveys', 'a', hetket, 'leveys', r.leveys, 'leveys'); }
function _ksSyvyys(hetket, r) { return _ksYlaraja('j_p2a_syvyys', 'a', hetket, 'syvyys', r.syvyys, 'syvyys'); }

// J-P2b: ryhmityksen keskipiste seuraa pallon sivuttaisliikettä.
// Arvo = pienin (keskipisteen siirtymä / pallon siirtymä) peräkkäisten hetkien välillä; vain kun pallo siirtyi
// sivusuunnassa vähintään siirto_min_m. Negatiivinen = ryhmitys meni vastakkaiseen suuntaan.
function _ksSiirtyma(hetket, r) {
  var s = 'j_p2b_siirtyma', pahin = null;
  for (var k = 1; k < hetket.length; k++) {
    var a = hetket[k - 1], b = hetket[k], dp = b.pallo.x - a.pallo.x;
    if (Math.abs(dp) < r.siirto_min_m) continue;
    var osuus = (b.keskipiste - a.keskipiste) / dp;
    if (!pahin || osuus < pahin.osuus) pahin = { osuus: osuus, i: b.i };
  }
  if (!pahin) return _ksEiDataa(s, 'b', 'Pallo ei siirtynyt sivusuunnassa vähintään ' + r.siirto_min_m + ' m peräkkäisten hetkien välillä.');
  var arvo = Math.round(pahin.osuus * 100) / 100;
  if (r.siirto_osuus === null) return _ksRivi(s, 'b', 'havainto', arvo, null, pahin.i, 'Ryhmitys siirtyi pallon sivuttaisliikkeestä enimmillään ' + Math.round(arvo * 100) + ' % (seuralla ei rajaa).');
  return _ksRivi(s, 'b', arvo < r.siirto_osuus ? 'ylittyy' : 'ok', arvo, r.siirto_osuus, pahin.i,
    'Heikoimmillaan ryhmitys siirtyi ' + Math.round(arvo * 100) + ' % pallon sivuttaisliikkeestä, vähintään ' + Math.round(r.siirto_osuus * 100) + ' % vaaditaan.');
}

// J-P2c: kun pallo on laidalla (ulompi kolmannes), keskikäytävässä (keskimmäinen kolmannes) on vähintään
// keskusta_min kenttäpelaajaa. Arvo = pienin määrä arvioiduilla hetkillä.
function _ksKeskusta(hetket, r, leveys) {
  var s = 'j_p2c_keskusta', pahin = null, a = leveys / 3, b = 2 * leveys / 3;
  hetket.forEach(function (h) {
    if (h.pallo.x >= a && h.pallo.x <= b) return;   // pallo keskellä: sääntö ei koske
    var n = h.pelaajat.filter(function (p) { return p.x >= a && p.x <= b; }).length;
    if (!pahin || n < pahin.n) pahin = { n: n, i: h.i };
  });
  if (!pahin) return _ksEiDataa(s, 'c', 'Pallo ei ollut laidalla yhdelläkään puolustushetkellä.');
  if (r.keskusta_min === null) return _ksRivi(s, 'c', 'havainto', pahin.n, null, pahin.i, 'Pallon ollessa laidalla keskikäytävässä oli vähintään ' + pahin.n + ' kenttäpelaajaa (seuralla ei rajaa).');
  return _ksRivi(s, 'c', pahin.n < r.keskusta_min ? 'ylittyy' : 'ok', pahin.n, r.keskusta_min, pahin.i,
    'Pallon ollessa laidalla keskikäytävässä oli heikoimmillaan ' + pahin.n + ' kenttäpelaajaa, vähintään ' + r.keskusta_min + ' vaaditaan.');
}

var TM_KS_SAANNOT = {
  j_p2: function (hetket, r, tilanne) {
    return [_ksLeveys(hetket, r), _ksSyvyys(hetket, r), _ksSiirtyma(hetket, r), _ksKeskusta(hetket, r, tilanne.kentta.leveys)];
  }
};

function tmKonseptiSaannot(tilanne, konsepti, opts) {
  opts = opts || {};
  if (!tilanne || !konsepti || !konsepti.avain) return [];
  var laske = TM_KS_SAANNOT[konsepti.avain];
  if (!laske) return [];
  var k = tilanne.kentta;
  if (!k || !_ksLuku(k.leveys) || !_ksLuku(k.pituus) || k.leveys <= 0 || k.pituus <= 0) {
    return [_ksEiDataa(konsepti.avain, null, 'Tilanteelta puuttuu kentän koko.')];
  }
  var sallitut = konsepti.pelimuoto;
  if (Array.isArray(sallitut) && sallitut.indexOf(tilanne.pelimuoto) < 0) {
    return [_ksEiDataa(konsepti.avain, null, 'Konsepti ei koske pelimuotoa ' + tilanne.pelimuoto + '.')];
  }
  var rajat = _ksRajat(tilanne.pelimuoto, opts.rajat);
  if (!rajat) return [_ksEiDataa(konsepti.avain, null, 'Pelimuodolle ' + tilanne.pelimuoto + ' ei ole oletusrajoja.')];
  var puolustaja = opts.puolustaja === 'vastustaja' ? 'vastustaja' : 'oma';
  return laske(_ksHetket(tilanne, puolustaja), rajat, tilanne);
}

var TM_KONSEPTI_SAANNOT = {
  tmKonseptiSaannot: tmKonseptiSaannot,
  TM_KS_OLETUSRAJAT: TM_KS_OLETUSRAJAT,
  TM_KS_KONSEPTIT: Object.keys(TM_KS_SAANNOT)
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KONSEPTI_SAANNOT;
if (typeof window !== 'undefined') { for (var _ksk in TM_KONSEPTI_SAANNOT) { try { window[_ksk] = TM_KONSEPTI_SAANNOT[_ksk]; } catch (e) {} } window.TM_KONSEPTI_SAANNOT = TM_KONSEPTI_SAANNOT; }
