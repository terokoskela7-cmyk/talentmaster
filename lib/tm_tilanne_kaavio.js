// tm_tilanne_kaavio.js — Taktiikkatyökalu, vaihe A · V0-1: tilanteen yksi hetki → kaavion spec.
//
// Puhdas kirjasto: tilanne (metrit) sisään, jaetun kaaviorenderöijän §3-spec ulos
// (lib/tm_kaavio_validate.js hyväksyy sen sellaisenaan). Ei Firestorea, ei DOMia, ei kirjoituksia,
// ei tallennusta; syötettä ei mutatoida. Renderöijää ei kosketa.
//
// SYÖTE (sama muoto kuin tm_konsepti_saannot.js:n tilanne)
//   tilanne = { id, pelimuoto: '8v8'|'11v11'|…, kentta: { pituus, leveys } (m),
//               suunta: 'ylos'|'alas'   // oman joukkueen hyökkäyssuunta, sama kuin spec.suunta
//               hetket: [ { t, pallo: {x,y}, oma: [ {id,x,y,mv?} ], vastustaja: [ {id,x,y,mv?} ] } ] }
//   Koordinaatit metreinä kaavion akseleilla: x = leveys, y = pituus → muunnos on pelkkä skaalaus 0–100.
//
// MUUNNOS
//   · Pelaajan id saa etuliitteen (o_/v_), jotta joukkueiden id:t eivät törmää.
//   · Pelaajan rooli: pallolla oleva = 'syöttäjä' + pallo:true, muut oman joukkueen = 'tuki',
//     vastustajat = 'paine'. Seurantadata ei kerro roolia; enum vaatii jonkin, ja nämä ovat neutraalit.
//   · Pallo piirtyy pelaajalle (spec ei tunne vapaata palloa): lähin pelaaja, jos enintään
//     opts.palloEtaisyysM (oletus 3 m) päässä; muuten ei palloa ja varoitus 'pallo_ei_pelaajalla'.
//   · Kentän ulkopuolelle osuvat koordinaatit leikataan 0–100:aan (varoitus 'koordinaatti_leikattu').
//   · Pelaajia yli pelimuodon kapasiteetin → spec jätetään silti rakentamatta (null) ja varoitus
//     'liikaa_pelaajia': kaavio ei saa näyttää väärää kokoonpanoa.
// TULOS: { spec, varoitukset: [koodi] } tai { spec: null, varoitukset: [koodi] }.
// spec.avain on kutsujan antama curriculum-avain (opts.avain, esim. 'j_p2'); puuttuessa 'tilanne'.

function _tkLuku(v) { return typeof v === 'number' && isFinite(v); }
function _tkKapasiteetti(pelimuoto) {
  var m = /^(\d+)v(\d+)$/.exec(pelimuoto || '');
  return m ? [+m[1], +m[2]] : [11, 11];
}
function _tkProsentti(arvo, mitta, varoitukset) {
  var p = arvo / mitta * 100;
  if (p < 0 || p > 100) { if (varoitukset.indexOf('koordinaatti_leikattu') < 0) varoitukset.push('koordinaatti_leikattu'); p = p < 0 ? 0 : 100; }
  return Math.round(p * 10) / 10;
}

function tmTilanneKaavio(tilanne, hetkiIdx, opts) {
  opts = opts || {};
  var varoitukset = [];
  var k = tilanne && tilanne.kentta;
  var h = tilanne && tilanne.hetket && tilanne.hetket[hetkiIdx];
  if (!h || !k || !_tkLuku(k.leveys) || !_tkLuku(k.pituus) || k.leveys <= 0 || k.pituus <= 0) {
    return { spec: null, varoitukset: ['tilanne_puutteellinen'] };
  }
  var cap = _tkKapasiteetti(tilanne.pelimuoto);
  var oma = (h.oma || []).filter(function (p) { return p && _tkLuku(p.x) && _tkLuku(p.y); });
  var vast = (h.vastustaja || []).filter(function (p) { return p && _tkLuku(p.x) && _tkLuku(p.y); });
  if (oma.length > cap[0] || vast.length > cap[1]) return { spec: null, varoitukset: ['liikaa_pelaajia'] };

  // pallollinen: lähin pelaaja palloetäisyyden rajan sisällä
  var pallolla = null;
  if (h.pallo && _tkLuku(h.pallo.x) && _tkLuku(h.pallo.y)) {
    var raja = _tkLuku(opts.palloEtaisyysM) ? opts.palloEtaisyysM : 3, paras = Infinity;
    oma.concat(vast).forEach(function (p) {
      var d = Math.sqrt(Math.pow(p.x - h.pallo.x, 2) + Math.pow(p.y - h.pallo.y, 2));
      if (d <= raja && d < paras) { paras = d; pallolla = p; }
    });
  }
  if (!pallolla) varoitukset.push('pallo_ei_pelaajalla');

  function rakenna(p, joukkue, etuliite) {
    var o = {
      id: etuliite + String(p.id),
      joukkue: joukkue,
      rooli: p === pallolla ? 'syöttäjä' : (joukkue === 'oma' ? 'tuki' : 'paine'),
      x: _tkProsentti(p.x, k.leveys, varoitukset),
      y: _tkProsentti(p.y, k.pituus, varoitukset)
    };
    if (p === pallolla) o.pallo = true;
    return o;
  }
  var spec = {
    avain: opts.avain || 'tilanne',
    suunta: tilanne.suunta === 'alas' ? 'alas' : 'ylos',
    pelimuoto: tilanne.pelimuoto,
    pelaajat: oma.map(function (p) { return rakenna(p, 'oma', 'o_'); })
      .concat(vast.map(function (p) { return rakenna(p, 'vastustaja', 'v_'); }))
  };
  if (opts.kpi) spec.kpi = opts.kpi;
  return { spec: spec, varoitukset: varoitukset };
}

// Kaikki hetket kerralla (esim. jaksonäkymän pikkukuvat). Jokainen hetki on itsenäinen tulos.
function tmTilanneKaaviot(tilanne, opts) {
  return ((tilanne && tilanne.hetket) || []).map(function (_h, i) { return tmTilanneKaavio(tilanne, i, opts); });
}

var TM_TILANNE_KAAVIO = { tmTilanneKaavio: tmTilanneKaavio, tmTilanneKaaviot: tmTilanneKaaviot };
if (typeof module !== 'undefined' && module.exports) module.exports = TM_TILANNE_KAAVIO;
if (typeof window !== 'undefined') { for (var _tkk in TM_TILANNE_KAAVIO) { try { window[_tkk] = TM_TILANNE_KAAVIO[_tkk]; } catch (e) {} } window.TM_TILANNE_KAAVIO = TM_TILANNE_KAAVIO; }
