/* tm_xt_kerros.js — UHKA-ARVO-KERROS TAKTIIKKATAULUN SVG:N PÄÄLLE.
   Vaatii DOMin + tm_kaavio_render.js (kaavioPX/kaavioPY) + tm_xt.js → testataan headless-selaimella.

   SAMA KURI KUIN EDITORIN OVERLAYSSA (tm_kaavio_ui.js _kaavioPiirraEditori): jaettu renderöijä
   drawSpec() pysyy PUHTAANA ja koskemattomana. Tämä lib ottaa sen palauttaman SVG:n ja lisää
   siihen kaksi valinnaista kerrosta:
     1) UHKAKARTTA — 12×8 ruudukko kentän alle (ENSIMMÄISEKSI <g>:hen → kenttäviivat, liikkeet
        ja pelaajat piirtyvät sen päälle, kartta ei peitä mitään).
     2) LIIKKEIDEN ARVOT — pieni DM Mono -lappu jokaisen liikkeen keskipisteeseen (+2,4 / −0,8).
   Kerros EI kirjoita speciin mitään — se on näkymä, ei dataa. Spec-skeema ja validaattori
   pysyvät ennallaan, joten mikään olemassa oleva kaavio ei muutu.

   VÄRIT vain olemassa olevista kaaviotokeneista (--accent, --slate, --bg, --ink, --font-mono),
   jotka on skoopattu .tm-kaavio-elementtiin jokaisessa apissa → toimii sekä tummassa että
   vaaleassa teemassa ilman uusia tokeneita.

   ⚠ EI template literaleja (CLAUDE.md §7.1) — string concatenation. */

var _XTK_NS = 'http://www.w3.org/2000/svg';

function _xtkEl(t, a) {
  var e = document.createElementNS(_XTK_NS, t);
  for (var k in a) e.setAttribute(k, a[k]);
  return e;
}
/* Piirtajan JULKAISTU rajapinta. tm_kaavio_render.js fanauttaa kenttansa myos windowiin, joten paljas
   kaavioPX toimi selaimessa — mutta riippuvuus oli implisiittinen (nakymaton no-undef-portille) ja rikkoisi
   hiljaa jos fanautus poistetaan. Varakaava on kaytossa VAIN jos piirtajaa ei ole ladattu. */
function _xtkRender() { return (typeof TM_KAAVIO_RENDER !== 'undefined' && TM_KAAVIO_RENDER) ? TM_KAAVIO_RENDER : null; }
function _xtkPX(x) { var R = _xtkRender(); return (R && typeof R.kaavioPX === 'function') ? R.kaavioPX(x) : 12 + (x / 100) * 276; }
function _xtkPY(y) { var R = _xtkRender(); return (R && typeof R.kaavioPY === 'function') ? R.kaavioPY(y) : 12 + (y / 100) * 426; }

/* Ruudun rajat kaavion koordinaateissa. Sarake 0 = oma pääty; suunta 'ylos' → oma pääty y=100. */
function _xtkRuudunRajat(rivi, sarake, suunta) {
  var x0 = rivi / 8 * 100, x1 = (rivi + 1) / 8 * 100;
  var e0 = sarake / 12 * 100, e1 = (sarake + 1) / 12 * 100;
  var y0, y1;
  if (suunta === 'alas') { y0 = e0; y1 = e1; } else { y0 = 100 - e1; y1 = 100 - e0; }
  return { x0: x0, x1: x1, y0: y0, y1: y1 };
}

/* 1) UHKAKARTTA. Palauttaa luodun <g>:n. Voimakkuus on logaritminen (xtVoimakkuus), koska
   maalin edusta on ~40× omaa päätyä — lineaarisena kartta olisi yksi kirkas ruutu. */
function xtPiirraUhkakartta(svg, spec, asetukset) {
  var o = asetukset || {};
  var suunta = (spec && spec.suunta) || 'ylos';
  var juuri = svg.querySelector('g') || svg;
  var g = _xtkEl('g', { 'class': 'xt-uhkakartta', 'pointer-events': 'none' });
  var maxOpa = typeof o.maxOpasiteetti === 'number' ? o.maxOpasiteetti : 0.62;
  for (var r = 0; r < XT_RIVIT; r++) {
    for (var c = 0; c < XT_SARAKKEET; c++) {
      var b = _xtkRuudunRajat(r, c, suunta);
      var v = XT_RUUDUKKO[r][c];
      var opa = 0.03 + xtVoimakkuus(v) * (maxOpa - 0.03);
      g.appendChild(_xtkEl('rect', {
        x: _xtkPX(b.x0), y: _xtkPY(b.y0),
        width: _xtkPX(b.x1) - _xtkPX(b.x0), height: _xtkPY(b.y1) - _xtkPY(b.y0),
        fill: 'var(--accent)', 'fill-opacity': opa.toFixed(3),
        stroke: 'var(--bg)', 'stroke-width': 0.6, 'stroke-opacity': 0.5,
        'data-xt': v, 'data-rivi': r, 'data-sarake': c
      }));
    }
  }
  juuri.insertBefore(g, juuri.firstChild);
  return g;
}

/* 2) LIIKKEIDEN ARVOT. Lappu liikkeen keskipisteeseen. Oma liike --accent, vastustajan --slate,
   'palauttaa' himmeämpänä (kuvaus, ei varoitusväri — taaksepäin syöttö voi olla oikea ratkaisu).
   Juoksu näytetään potentiaalina (ohut kehys, ei täyttöä). Laukaus ohitetaan (ei xT). */
function xtPiirraLiikearvot(svg, spec, analyysi) {
  var a = analyysi || xtKaavioAnalyysi(spec);
  var juuri = svg.querySelector('g') || svg;
  var g = _xtkEl('g', { 'class': 'xt-liikearvot', 'pointer-events': 'none' });
  a.liikkeet.forEach(function (li) {
    if (li.pisteet == null) return;
    var mx = (_xtkPX(li.from.x) + _xtkPX(li.to.x)) / 2;
    var my = (_xtkPY(li.from.y) + _xtkPY(li.to.y)) / 2;
    var teksti = xtMuotoile(li.pisteet, true);
    var lev = 6 + teksti.length * 5.1, kork = 12;
    var vari = li.tekija === 'vastustaja' ? 'var(--slate)' : 'var(--accent)';
    var juoksu = li.tyyppi === 'juoksu';
    var himmea = li.luokka === 'palauttaa' || li.luokka === 'yllapitaa';
    var lappu = _xtkEl('g', { 'class': 'xt-lappu', 'data-liike': li.id || '', 'data-pisteet': li.pisteet });
    lappu.appendChild(_xtkEl('rect', {
      x: mx - lev / 2, y: my - kork / 2, width: lev, height: kork, rx: 1.5,
      fill: juoksu ? 'var(--bg)' : vari, 'fill-opacity': juoksu ? 0.85 : (himmea ? 0.55 : 0.95),
      stroke: vari, 'stroke-width': juoksu ? 0.9 : 0, 'stroke-dasharray': juoksu ? '2 1.5' : 'none'
    }));
    var t = _xtkEl('text', {
      x: mx, y: my + 3.1, 'text-anchor': 'middle',
      'font-family': 'var(--font-mono)', 'font-weight': 600, 'font-size': 8,
      fill: juoksu ? vari : 'var(--bg)'
    });
    t.textContent = teksti;
    lappu.appendChild(t);
    g.appendChild(lappu);
  });
  juuri.appendChild(g);
  return g;
}

/* YKSI KUTSU isäntäapille: xtPiirraKerros(svg, spec, {uhkakartta:true, arvot:true}).
   Palauttaa analyysin, jotta isäntä voi näyttää yhteenvedon ilman toista laskentaa. */
function xtPiirraKerros(svg, spec, asetukset) {
  var o = asetukset || {};
  if (!svg || !spec || typeof xtKaavioAnalyysi !== 'function') return null;
  var analyysi = xtKaavioAnalyysi(spec);
  if (o.uhkakartta !== false) xtPiirraUhkakartta(svg, spec, o);
  if (o.arvot !== false) xtPiirraLiikearvot(svg, spec, analyysi);
  return analyysi;
}

/* Pikseli (SVG-koordinaatti) → kaavion koordinaatti. Pelihavainnon napautuksiin ja
   uhkakartan hover-arvoon. Sama inverssi kuin tm_kaavio_editori.js kaavioEdOX/OY. */
function xtPikselistaKaavioon(svg, clientX, clientY) {
  var pt = svg.createSVGPoint(); pt.x = clientX; pt.y = clientY;
  var m = svg.getScreenCTM(); if (!m) return null;
  var p = pt.matrixTransform(m.inverse());
  var x = (p.x - 12) / 276 * 100, y = (p.y - 12) / 426 * 100;
  return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
}

var TM_XT_KERROS = {
  xtPiirraKerros: xtPiirraKerros, xtPiirraUhkakartta: xtPiirraUhkakartta,
  xtPiirraLiikearvot: xtPiirraLiikearvot, xtPikselistaKaavioon: xtPikselistaKaavioon
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_XT_KERROS;
if (typeof window !== 'undefined') { for (var _xtkk in TM_XT_KERROS) { try { window[_xtkk] = TM_XT_KERROS[_xtkk]; } catch (e) {} } window.TM_XT_KERROS = TM_XT_KERROS; }
