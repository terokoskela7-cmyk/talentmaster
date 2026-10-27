/* tm_tilanne_kaavio.js — TILANNE (seurantadata metreinä) → KAAVIO-SPEC (§3, Opta 100×100). Videoanalyysi V0 / T1.
   PUHDAS: ei DOMia, ei Firestorea → yksikkötestattava nodessa. Sama tyyli kuin tm_kaavio_*.js.

   LÄHDE: seurat/{sid}/tilanteet/{tid} (CODE_BRIEF_VIDEO_V0 §2). Raakadata metreinä:
     kentta {pituus_m, leveys_m} (PAKOLLINEN) · suunta {omaPuolustaa:'vasen'|'oikea'} · pelimuoto · kesto_s
     pelaajat[{tunniste (uniikki), joukkue:'oma'|'vast'|'tuomari', rooli?:'pelaaja'|'mv', tarkkuus_m, polku:[{t,x,y}]}]
     pallo?:[{t,x,y}] — LÄHTEEN TAAJUUDELLA (25 Hz): 5 Hz:llä keskityksen ohilento ja kosketus sekoittuvat
       (Metrica-testi: 10 ja 13 molemmat ~1,4 m pallosta, 25 Hz:llä 10 on 0,27 m).
     tapahtumat?:[{t, tyyppi:'syotto'|'laukaus', tekija, kohde?, lahde}] — ENSISIJAISIA: 2D-seuranta ei erota
       puskukaksinkamppailun kosketusta (hyökkääjä ja puolustaja molemmat < 0,5 m pallosta).
     Koordinaatit: origo keskipisteessä, x = pituus (oikea +), y = leveys (kameraa kohti +).
   KOHDE: §3-spec. x = leveys 0–100, y = pituus 0–100, origo ylävasen, suunta 'ylos' = vastustajan maali y≈0.

   MUUNNOS (lukittu, testattu): oma joukkue hyökkää aina ylös. Kierto, ei peilaus.
     omaPuolustaa 'vasen' (hyökkää +x):  ySpec = 50 − x/L·100,  xSpec = 50 + y/W·100
     omaPuolustaa 'oikea' (hyökkää −x):  ySpec = 50 + x/L·100,  xSpec = 50 − y/W·100

   PERIAATTEET
   · Raakadata talteen, tulkinta koodissa: spec on johdettu NÄKYMÄ hetkestä t.
   · Ei arvata: pelaaja mukaan vain, jos lähin havainto on ≤ TK_MAX_AUKKO_S hetkestä. Puuttuva kenttä, väärä
     pelimuoto, hetki tilanteen ulkopuolella tai tuplatunniste → poikkeus (kutsuja näyttää virheen).
   · Erotuomari ei kuulu kaavioon (joukkue-enum oma|vastustaja). Epätarkka (> TK_MAX_TARKKUUS_M) pois.
   · Seurannasta päätelty syöttö merkitään AINA liikkeeseen lahde:'arvio'.
   · ohitetut = kaaviosta pois jätetyt; huomiot = mukana, mutta muutettu (esim. klampattu rajalle). */

var TK_MAX_AUKKO_S = 0.5, TK_PALLO_M = 1.5, TK_KOSKETUS_M = 2.0, TK_PAINE_M = 5.0, TK_MAX_TARKKUUS_M = 2.0;
var TK_PELIMUODOT = /^(5|7|8|9|11)v(5|7|8|9|11)$/;

function _tkInterp(polku, t) {
  if (!polku || !polku.length) return null;
  var n = polku.length, i = 0;
  if (t < polku[0].t - TK_MAX_AUKKO_S || t > polku[n - 1].t + TK_MAX_AUKKO_S) return null;
  while (i < n - 1 && polku[i + 1].t < t) i++;
  var a = polku[i], b = polku[Math.min(i + 1, n - 1)];
  if (Math.min(Math.abs(a.t - t), Math.abs(b.t - t)) > TK_MAX_AUKKO_S) return null;
  if (b.t === a.t || t <= a.t) return { x: a.x, y: a.y };
  if (t >= b.t) return { x: b.x, y: b.y };
  var k = (t - a.t) / (b.t - a.t);
  return { x: a.x + k * (b.x - a.x), y: a.y + k * (b.y - a.y) };
}
function _tkKlamppi(v) { return Math.max(0, Math.min(100, v)); }
function _tkPyor(v) { return Math.round(v * 10) / 10; }
function _tkEt(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

/* metrit → §3 (palauttaa myös tiedon klamppauksesta) */
function tilanneMetritSpeciin(p, kentta, omaPuolustaa) {
  var L = kentta.pituus_m, W = kentta.leveys_m, ys, xs;
  if (omaPuolustaa === 'oikea') { ys = 50 + p.x / L * 100; xs = 50 - p.y / W * 100; }
  else { ys = 50 - p.x / L * 100; xs = 50 + p.y / W * 100; }
  var kx = _tkKlamppi(xs), ky = _tkKlamppi(ys);
  return { x: _tkPyor(kx), y: _tkPyor(ky), klampattu: kx !== xs || ky !== ys };
}

/* Kosketus seurannasta: pallon suunta kääntyy > 25° tai vauhti putoaa alle 60 %:iin, kun pallo liikkuu
   (≥ 0,3 m / 0,2 s ≈ 1,5 m/s — muuten paikallaan olevan pallon kohina tuottaisi "kosketuksia"). */
function _tkKosketus(pallo, tt) {
  var pb = _tkInterp(pallo, tt), p0 = _tkInterp(pallo, tt - 0.2), p1 = _tkInterp(pallo, tt + 0.2);
  if (!pb || !p0 || !p1) return null;
  var v0x = pb.x - p0.x, v0y = pb.y - p0.y, v1x = p1.x - pb.x, v1y = p1.y - pb.y;
  var s0 = Math.hypot(v0x, v0y), s1 = Math.hypot(v1x, v1y);
  if (s0 < 0.3) return null;
  var kulma = s1 > 0.05 ? Math.acos(Math.max(-1, Math.min(1, (v0x * v1x + v0y * v1y) / (s0 * s1)))) * 180 / Math.PI : 180;
  return (kulma > 25 || s1 < 0.6 * s0) ? pb : null;
}

/* tilanne + hetki t → { spec, ohitetut:[{tunniste, syy}], huomiot:[{tunniste, syy}], hetki, tunnisteet:{specId: tunniste} } */
function tilanneKaavioksi(tilanne, t, opts) {
  opts = opts || {};
  if (!tilanne || !tilanne.kentta || !(tilanne.kentta.pituus_m > 0) || !(tilanne.kentta.leveys_m > 0)) throw new Error('tilanne_kentta_puuttuu');
  var pelimuoto = opts.pelimuoto || tilanne.pelimuoto || '11v11';
  var pm = TK_PELIMUODOT.exec(pelimuoto); if (!pm) throw new Error('pelimuoto_ei_kelpaa');
  if (typeof t !== 'number' || t < 0 || (tilanne.kesto_s != null && t > tilanne.kesto_s)) throw new Error('hetki_tilanteen_ulkopuolella');
  var nahty = {};
  (tilanne.pelaajat || []).forEach(function (pl) { if (nahty[pl.tunniste]) throw new Error('tunniste_ei_uniikki'); nahty[pl.tunniste] = 1; });
  var kentta = tilanne.kentta, puol = (tilanne.suunta && tilanne.suunta.omaPuolustaa) === 'oikea' ? 'oikea' : 'vasen';
  var ikkuna = opts.liikeIkkuna_s != null ? opts.liikeIkkuna_s : 2.0;
  var minLiike = opts.minLiike_m != null ? opts.minLiike_m : 3.0;
  var maxNuolet = opts.maxNuolet != null ? opts.maxNuolet : 6;
  var ohitetut = [], huomiot = [], ehd = [];

  // 1) ehdokkaat hetkellä t
  (tilanne.pelaajat || []).forEach(function (pl) {
    if (pl.joukkue === 'tuomari') { ohitetut.push({ tunniste: pl.tunniste, syy: 'tuomari' }); return; }
    if (pl.joukkue !== 'oma' && pl.joukkue !== 'vast') { ohitetut.push({ tunniste: pl.tunniste, syy: 'tuntematon_joukkue' }); return; }
    if (pl.tarkkuus_m != null && pl.tarkkuus_m > TK_MAX_TARKKUUS_M) { ohitetut.push({ tunniste: pl.tunniste, syy: 'epatarkka' }); return; }
    var m = _tkInterp(pl.polku, t);
    if (!m) { ohitetut.push({ tunniste: pl.tunniste, syy: 'ei_havaintoa' }); return; }
    ehd.push({ pl: pl, m: m, mJ: _tkInterp(pl.polku, t + ikkuna) });
  });
  var etsi = function (tunniste) { for (var i = 0; i < ehd.length; i++) if (ehd[i].pl.tunniste === tunniste) return ehd[i]; return null; };
  var pallo = tilanne.pallo ? _tkInterp(tilanne.pallo, t) : null;

  // 2) pallollinen, kohde, tapahtuma. Tapahtumat ensin (lähin ajassa, ikkunassa [t−0,3, t+ikkuna]).
  var hold = null, recv = null, katkoP = null, arvio = false, tap = null;
  var evs = (tilanne.tapahtumat || []).filter(function (ev) {
    return (ev.tyyppi === 'syotto' || ev.tyyppi === 'laukaus') && ev.t >= t - 0.3 && ev.t <= t + ikkuna;
  }).sort(function (a, b) { return a.t - b.t; });
  if (evs.length) {
    tap = evs[0];
    var tek = etsi(tap.tekija);
    if (!tek) { huomiot.push({ tunniste: tap.tekija, syy: 'tapahtuman_tekija_puuttuu' }); tap = null; }
    else {
      var tekNyt = tek.m;
      // tekijä on pallollinen vain, jos pallo on hänellä nyt (tai pallodataa ei ole ja tapahtuma on ±0,3 s)
      if (pallo ? _tkEt(tekNyt, pallo) < TK_PALLO_M : Math.abs(tap.t - t) <= 0.3) {
        hold = tek;
        if (tap.tyyppi === 'syotto' && tap.kohde != null) {
          recv = etsi(tap.kohde);
          if (!recv) huomiot.push({ tunniste: tap.kohde, syy: 'tapahtuman_kohde_puuttuu' });
        }
      } else tap = null;   // pallo ei ole tekijällä tällä hetkellä → tapahtuma ei koske tätä hetkeä
    }
  } else if (pallo) {
    // ei tapahtumia → seuranta (arvio)
    ehd.forEach(function (e) { var dd = _tkEt(e.m, pallo); if (dd < TK_PALLO_M && (!hold || dd < _tkEt(hold.m, pallo))) hold = e; });
    if (hold) {
      for (var tt = t + 0.1; tt <= t + ikkuna + 1e-9 && !recv && !katkoP; tt += 0.1) {
        var pb = _tkKosketus(tilanne.pallo, tt); if (!pb) continue;
        var lahin = null, ld = Infinity;
        ehd.forEach(function (e) { var q = _tkInterp(e.pl.polku, tt); if (!q) return; var dd = _tkEt(q, pb); if (dd < TK_KOSKETUS_M && dd < ld) { lahin = e; ld = dd; } });
        if (!lahin || lahin === hold) continue;            // pallollisen oma kosketus (syöttö, kuljetus)
        if (lahin.pl.joukkue === hold.pl.joukkue) recv = lahin; else katkoP = pb;
      }
      arvio = true;
    }
  }

  // 3) pelimuodon katto — EI koskaan pallollista, kohdetta eikä maalivahtia
  var suoj = function (e) { return e === hold || e === recv || e.pl.rooli === 'mv'; };
  ['oma', 'vast'].forEach(function (j, ji) {
    var cap = +pm[ji + 1];
    var omat = ehd.filter(function (e) { return e.pl.joukkue === j; });
    var yli = omat.length - cap; if (yli <= 0) return;
    omat.filter(function (e) { return !suoj(e); })
      .sort(function (a, b) { return (b.pl.tarkkuus_m || 0) - (a.pl.tarkkuus_m || 0); })
      .slice(0, yli).forEach(function (e) { e.pois = true; ohitetut.push({ tunniste: e.pl.tunniste, syy: 'pelimuoto_taynna' }); });
  });
  ehd = ehd.filter(function (e) { return !e.pois; });

  // 4) paine = lähin vastustaja pallolliselle, enintään 5 m
  var paine = null;
  if (hold) ehd.forEach(function (e) {
    if (e.pl.joukkue === hold.pl.joukkue) return; var dd = _tkEt(e.m, hold.m);
    if (dd <= TK_PAINE_M && (!paine || dd < _tkEt(paine.m, hold.m))) paine = e;
  });

  // 5) pelaajat
  var pelaajat = [], nO = 0, nV = 0, tunnisteet = {};
  ehd.forEach(function (e) {
    var oma = e.pl.joukkue === 'oma';
    e.id = oma ? 'O' + (++nO) : 'V' + (++nV); tunnisteet[e.id] = e.pl.tunniste;
    var s = tilanneMetritSpeciin(e.m, kentta, puol);
    if (s.klampattu) huomiot.push({ tunniste: e.pl.tunniste, syy: 'klampattu_rajalle' });
    var p = { id: e.id, joukkue: oma ? 'oma' : 'vastustaja', rooli: e === hold ? 'syöttäjä' : e === recv ? 'vastaanottaja' : e === paine ? 'paine' : 'tuki', x: s.x, y: s.y };
    if (e.pl.rooli === 'mv') p.gk = true;
    if (e === hold) p.pallo = true;
    if (opts.korostettu != null && e.pl.tunniste === opts.korostettu) p.korostus = true;
    pelaajat.push(p);
  });

  // 6) liikkeet: pallosta lähtevä nuoli ensin, sitten suurimmat juoksut. Id:t juoksevat ilman aukkoja.
  var liikkeet = [], add = function (l) { l.id = 'L' + (liikkeet.length + 1); liikkeet.push(l); };
  var merk = arvio ? { lahde: 'arvio' } : {};
  if (hold && tap && tap.tyyppi === 'laukaus') {
    add({ tyyppi: 'laukaus', from: { ref: hold.id }, to: { x: 50, y: hold.pl.joukkue === 'oma' ? 0 : 100 } });
  } else if (hold && recv) {
    add(Object.assign({ tyyppi: 'syotto', from: { ref: hold.id }, to: { ref: recv.id } }, merk));
  } else if (hold && katkoP) {
    var kk = tilanneMetritSpeciin(katkoP, kentta, puol);
    add({ tyyppi: 'syotto', from: { ref: hold.id }, to: { x: kk.x, y: kk.y }, lahde: 'arvio' });
  } else if (hold && arvio && pallo) {
    var pJ = _tkInterp(tilanne.pallo, t + ikkuna);
    if (pJ && _tkEt(pallo, pJ) >= minLiike && _tkEt(hold.mJ || hold.m, pJ) >= TK_PALLO_M) {
      var kp = tilanneMetritSpeciin(pJ, kentta, puol);
      add({ tyyppi: 'syotto', from: { ref: hold.id }, to: { x: kp.x, y: kp.y }, lahde: 'arvio' });
    }
  }
  var pallostaNuoli = liikkeet.length > 0;
  ehd.filter(function (e) { return e.mJ && _tkEt(e.m, e.mJ) >= minLiike && !(pallostaNuoli && e === hold); })
    .sort(function (a, b) { return _tkEt(b.m, b.mJ) - _tkEt(a.m, a.mJ); })
    .slice(0, maxNuolet)
    .forEach(function (e) {
      var k = tilanneMetritSpeciin(e.mJ, kentta, puol);
      add({ tyyppi: e === hold ? 'kuljetus' : 'juoksu', from: { ref: e.id }, to: { x: k.x, y: k.y } });
    });

  var spec = { avain: opts.avain, suunta: 'ylos', pelimuoto: pelimuoto, nakyma: opts.nakyma || 'koko', pelaajat: pelaajat, liikkeet: liikkeet };
  return { spec: spec, ohitetut: ohitetut, huomiot: huomiot, hetki: t, tunnisteet: tunnisteet };
}

var TM_TILANNE_KAAVIO = {
  tilanneKaavioksi: tilanneKaavioksi, tilanneMetritSpeciin: tilanneMetritSpeciin, tilanneInterp: _tkInterp,
  TK_MAX_AUKKO_S: TK_MAX_AUKKO_S, TK_PALLO_M: TK_PALLO_M, TK_KOSKETUS_M: TK_KOSKETUS_M, TK_PAINE_M: TK_PAINE_M, TK_MAX_TARKKUUS_M: TK_MAX_TARKKUUS_M
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_TILANNE_KAAVIO;
if (typeof window !== 'undefined') { for (var _tkk in TM_TILANNE_KAAVIO) { try { window[_tkk] = TM_TILANNE_KAAVIO[_tkk]; } catch (e) {} } }
