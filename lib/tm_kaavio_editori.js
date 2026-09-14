/* tm_kaavio_editori.js — kaavioeditorin TILA- JA KOORDINAATTIKERROS (erä B).
   PUHDAS: ei DOMia, ei tapahtumankuuntelijoita, ei globaalia tilaa → yksikkötestattava nodessa.
   Tapahtumaputki (pointerdown/move/up, SVG-CTM) kuuluu isäntänäkymään; tämä lib tarjoaa sille
   koordinaattimuunnokset ja puhtaat tilaoperaatiot.

   ⚠ KOORDINAATISTO — LUKITTU YHTEEN render-libin kanssa.
   Prototyypin standalone-editori (tm_kaavio_editori.html) käytti VIEWPORT-mappia
     PY(y) = PAD + ((y-34)/66)*(VH-2*PAD)      // näyttää vain hyökkäyskolmanneksen
   ja inverssiä OY(py) → clamp 34..100. HUOM: se EI ollut datavirhe — tuotettu spec-y on
   täyskenttäasteikolla (34..100 ⊂ 0..100). Ongelma oli että editorin PIKSELIT eivät vastaa
   tm_kaavio_render.js:n pikseleitä samalle y:lle → editori ei osu renderöidyn kaavion päälle.
   Siksi tässä käytetään render-libin täyskenttämappia ja sen inverssiä. Seuraus: editori näyttää
   koko kentän (elementit pienempiä) ja sallii y<34.

   Kaikki operaatiot palauttavat UUDEN tilan (ei mutatoi) → undo on pelkkä pino. */

var _KE_VW = 300, _KE_VH = 450, _KE_PAD = 12;

function _keKlamppi(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function _keKopio(o) { return JSON.parse(JSON.stringify(o)); }

/* Spec-koordinaatti → pikseli. SAMA kaava kuin tm_kaavio_render.js (täyskenttä). */
function kaavioEdPX(x) { return _KE_PAD + (x / 100) * (_KE_VW - 2 * _KE_PAD); }
function kaavioEdPY(y) { return _KE_PAD + (y / 100) * (_KE_VH - 2 * _KE_PAD); }
/* Pikseli → spec-koordinaatti (inverssi, clamp 0–100). */
function kaavioEdOX(px) { return _keKlamppi((px - _KE_PAD) / (_KE_VW - 2 * _KE_PAD) * 100, 0, 100); }
function kaavioEdOY(py) { return _keKlamppi((py - _KE_PAD) / (_KE_VH - 2 * _KE_PAD) * 100, 0, 100); }

/* Pelimuodon katto per joukkue — sama lähde kuin validaattorin capOf. Editori estää jo UI:ssa;
   validaattori vahvistaa tallennuksessa (kaksinkertainen portti on tahallinen). */
function kaavioKatto(pelimuoto) {
  var m = /^(\d+)v(\d+)$/.exec(String(pelimuoto || ''));
  return m ? [+m[1], +m[2]] : [11, 11];
}
function kaavioMahtuu(spec, joukkue) {
  var k = kaavioKatto(spec && spec.pelimuoto);
  var raja = joukkue === 'vastustaja' ? k[1] : k[0];
  var n = ((spec && spec.pelaajat) || []).filter(function (p) { return p.joukkue === joukkue; }).length;
  return n < raja;
}

function _keUusiId(spec, etuliite) {
  var kaytossa = {}, i;
  ((spec.pelaajat) || []).forEach(function (p) { kaytossa[p.id] = 1; });
  ((spec.liikkeet) || []).forEach(function (l) { kaytossa[l.id] = 1; });
  for (i = 1; i < 500; i++) { if (!kaytossa[etuliite + i]) return etuliite + i; }
  return etuliite + Date.now();
}

/* ── TILAOPERAATIOT (puhtaat) ─────────────────────────────────────────────────────────── */

function kaavioLisaaPelaaja(spec, pelaaja) {
  var s = _keKopio(spec);
  s.pelaajat = s.pelaajat || [];
  var j = (pelaaja && pelaaja.joukkue) || 'oma';
  if (!kaavioMahtuu(s, j)) return { spec: spec, virhe: 'pelimuoto_taynna' };
  var p = Object.assign({ id: _keUusiId(s, j === 'oma' ? 'O' : 'V'), joukkue: j, rooli: 'tuki', x: 50, y: 50 }, pelaaja || {});
  p.x = _keKlamppi(p.x, 0, 100); p.y = _keKlamppi(p.y, 0, 100);
  if (p.pallo) s.pelaajat.forEach(function (q) { delete q.pallo; });   // ≤1 pallollinen (§6)
  s.pelaajat.push(p);
  return { spec: s, id: p.id };
}

function kaavioLisaaLiike(spec, tyyppi, fromRef, toRef) {
  var s = _keKopio(spec);
  s.liikkeet = s.liikkeet || [];
  s.liikkeet.push({ id: _keUusiId(s, 'L'), tyyppi: tyyppi || 'syotto', from: { ref: fromRef }, to: { ref: toRef } });
  return { spec: s, id: s.liikkeet[s.liikkeet.length - 1].id };
}

/* Siirto: pikselit sisään, spec-koordinaatit ulos. Tämä on se kohta joka rikkoutui
   viewport-mapilla — hit-testaus ja siirto käyttävät nyt samaa mappia kuin renderöijä. */
function kaavioSiirraPelaaja(spec, id, px, py) {
  var s = _keKopio(spec), p = (s.pelaajat || []).find(function (q) { return q.id === id; });
  if (!p) return { spec: spec, virhe: 'tuntematon_id' };
  p.x = Math.round(kaavioEdOX(px) * 10) / 10;
  p.y = Math.round(kaavioEdOY(py) * 10) / 10;
  return { spec: s };
}

/* Liikkeen vapaa päätepiste napsahtaa lähimpään pelaajaan (ref) jos se on kynnyksen sisällä.
   Kynnys on SPEC-yksiköissä, ei pikseleissä → riippumaton katselukoosta. */
function kaavioSnapPaate(spec, x, y, kynnys) {
  var raja = (kynnys == null) ? 4 : kynnys, paras = null, pd = raja;
  ((spec && spec.pelaajat) || []).forEach(function (p) {
    var d = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
    if (d <= pd) { pd = d; paras = p.id; }
  });
  return paras ? { ref: paras } : { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

/* Poisto siivoaa VIITE-EHEYDEN: pelaajan poisto poistaa myös häneen osoittavat liikkeet ja
   peittovarjot. Ilman tätä §6-validaattori hylkäisi tallennuksen ("viittaa tuntemattomaan"). */
function kaavioPoista(spec, id) {
  var s = _keKopio(spec);
  s.pelaajat = (s.pelaajat || []).filter(function (p) { return p.id !== id; });
  s.liikkeet = (s.liikkeet || []).filter(function (l) {
    if (l.id === id) return false;
    return !((l.from && l.from.ref === id) || (l.to && l.to.ref === id));
  });
  s.peittovarjot = (s.peittovarjot || []).filter(function (pv) { return pv.from !== id && pv.to !== id; });
  if (!s.peittovarjot.length) delete s.peittovarjot;
  return { spec: s };
}

/* ── UNDO ─────────────────────────────────────────────────────────────────────────────── */
function kaavioHistoriaLisaa(historia, spec, maxPituus) {
  var h = (historia || []).slice(-((maxPituus || 40) - 1));
  h.push(_keKopio(spec));
  return h;
}
function kaavioKumoa(historia) {
  var h = (historia || []).slice();
  if (!h.length) return { historia: h, spec: null };
  var edellinen = h.pop();
  return { historia: h, spec: edellinen };
}

var TM_KAAVIO_EDITORI = {
  kaavioEdPX: kaavioEdPX, kaavioEdPY: kaavioEdPY, kaavioEdOX: kaavioEdOX, kaavioEdOY: kaavioEdOY,
  kaavioKatto: kaavioKatto, kaavioMahtuu: kaavioMahtuu,
  kaavioLisaaPelaaja: kaavioLisaaPelaaja, kaavioLisaaLiike: kaavioLisaaLiike,
  kaavioSiirraPelaaja: kaavioSiirraPelaaja, kaavioSnapPaate: kaavioSnapPaate, kaavioPoista: kaavioPoista,
  kaavioHistoriaLisaa: kaavioHistoriaLisaa, kaavioKumoa: kaavioKumoa
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KAAVIO_EDITORI;
if (typeof window !== 'undefined') { for (var _kek in TM_KAAVIO_EDITORI) { try { window[_kek] = TM_KAAVIO_EDITORI[_kek]; } catch (e) {} } }
