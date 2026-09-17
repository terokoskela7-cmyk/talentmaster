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

/* Päätepisteen normalisointi. §3 sallii liikkeen päälle KAKSI muotoa: `{ref}` (kiinnittyy
   pelaajaan ja seuraa sitä) tai `{x,y}` (vapaa piste kentällä). kaavioSnapPaate palauttaa jo
   kumman tahansa, joten editori voi syöttää sen sellaisenaan. Pelkkä merkkijono tulkitaan
   refiksi — se on vanha kutsumuoto, joka pysyy toimivana. */
function _keNormPaate(p) {
  if (p == null) return null;
  if (typeof p === 'string') return { ref: p };
  if (p.ref) return { ref: p.ref };
  if (typeof p.x === 'number' && typeof p.y === 'number') {
    return { x: _keKlamppi(Math.round(p.x * 10) / 10, 0, 100), y: _keKlamppi(Math.round(p.y * 10) / 10, 0, 100) };
  }
  return null;
}

function kaavioLisaaLiike(spec, tyyppi, from, to) {
  var a = _keNormPaate(from), b = _keNormPaate(to);
  if (!a || !b) return { spec: spec, virhe: 'paate_puuttuu' };
  // Viite-eheys jo täällä: validaattori hylkäisi tuntemattoman refin vasta tallennuksessa, jolloin
  // käyttäjä olisi jo piirtänyt. Sama syy kuin kaavioPoista():n siivouksella.
  var idt = ((spec && spec.pelaajat) || []).map(function (p) { return p.id; });
  if ((a.ref && idt.indexOf(a.ref) < 0) || (b.ref && idt.indexOf(b.ref) < 0)) return { spec: spec, virhe: 'tuntematon_ref' };
  var s = _keKopio(spec);
  s.liikkeet = s.liikkeet || [];
  s.liikkeet.push({ id: _keUusiId(s, 'L'), tyyppi: tyyppi || 'syotto', from: a, to: b });
  return { spec: s, id: s.liikkeet[s.liikkeet.length - 1].id };
}

/* Selite = kuvan sisäinen tekstilappu.
   §32-KORJAUS: aiemmin sama suomenkielinen teksti kirjoitettiin KAIKKIIN kolmeen kieleen
   (t:{fi:t, sv:t, en:t}). Se läpäisi validaattorin mutta rikkoi datakielisäännön — suomea
   sv/en-kentässä on väärää dataa, ei puuttuvaa dataa, ja se olisi näyttänyt käännetyltä.
   Nyt luonti täyttää VAIN fi:n; sv/en täytetään ominaisuuspaneelissa. Validaattori vaatii yhä
   kaikki kolme, joten tallennus estyy kunnes käännökset on kirjoitettu — se on tietoinen
   vaihtokauppa: mieluummin näkyvä este kuin hiljainen väärä data. */
function kaavioLisaaSelite(spec, x, y, teksti) {
  var t = String(teksti == null ? '' : teksti).trim();
  if (!t) return { spec: spec, virhe: 'tyhja_teksti' };
  var s = _keKopio(spec);
  s.selitteet = s.selitteet || [];
  s.selitteet.push({
    id: _keUusiId(s, 'S'),
    x: _keKlamppi(Math.round(x * 10) / 10, 0, 100),
    y: _keKlamppi(Math.round(y * 10) / 10, 0, 100),
    t: { fi: t, sv: '', en: '' }
  });
  return { spec: s, id: s.selitteet[s.selitteet.length - 1].id };
}

var KAAVIO_SELITE_KIELET = ['fi', 'sv', 'en'];
/* Yksi kieli kerrallaan → paneelin kolme kenttää kirjoittavat eri arvot. */
function kaavioAsetaSeliteTeksti(spec, id, kieli, teksti) {
  if (KAAVIO_SELITE_KIELET.indexOf(kieli) < 0) return { spec: spec, virhe: 'tuntematon_kieli' };
  var s = _keKopio(spec);
  var se = (s.selitteet || []).filter(function (q) { return q.id === id; })[0];
  if (!se) return { spec: spec, virhe: 'tuntematon_id' };
  se.t = se.t || {};
  se.t[kieli] = String(teksti == null ? '' : teksti).trim();
  return { spec: s };
}
/* Vajaat selitteet paneelin varoitusta varten: [{id, puuttuu:['sv','en']}]. Sama sääntö kuin
   validaattorilla, mutta editori voi kertoa sen ENNEN kuin tallennus estyy. */
function kaavioSeliteVajaat(spec) {
  return ((spec && spec.selitteet) || []).map(function (se) {
    var p = KAAVIO_SELITE_KIELET.filter(function (k) { return !(se.t && se.t[k] && String(se.t[k]).trim()); });
    return p.length ? { id: se.id, puuttuu: p } : null;
  }).filter(Boolean);
}

/* Joukkueen vaihto. Rooli siirtyy mukana järkevästi: vastustajaksi → 'paine' (painostaja),
   omaksi → 'vaihtoehto' jos rooli oli vastustajakohtainen. gk on vain vastustajan ominaisuus
   renderöijässä, joten se siivotaan kun pelaaja palaa omaksi (muuten lippu jäisi näkymättömäksi
   roikkumaan ja palaisi takaisin jos joukkue vaihdetaan uudelleen). */
function kaavioAsetaJoukkue(spec, id, joukkue) {
  if (joukkue !== 'oma' && joukkue !== 'vastustaja') return { spec: spec, virhe: 'tuntematon_joukkue' };
  var s = _keKopio(spec);
  var p = (s.pelaajat || []).filter(function (q) { return q.id === id; })[0];
  if (!p) return { spec: spec, virhe: 'tuntematon_id' };
  if (p.joukkue === joukkue) return { spec: s };
  if (!kaavioMahtuu(s, joukkue)) return { spec: spec, virhe: 'pelimuoto_taynna' };
  p.joukkue = joukkue;
  if (joukkue === 'vastustaja') { if (p.rooli !== 'paine') p.rooli = 'paine'; }
  else { if (p.rooli === 'paine') p.rooli = 'vaihtoehto'; delete p.gk; }
  return { spec: s };
}

/* Boolean-liput (korostus, gk). Falsy → kenttä poistetaan, jotta spec pysyy siistinä. */
var KAAVIO_LIPUT = ['korostus', 'gk'];
function kaavioAsetaLippu(spec, id, kentta, arvo) {
  if (KAAVIO_LIPUT.indexOf(kentta) < 0) return { spec: spec, virhe: 'tuntematon_kentta' };
  var s = _keKopio(spec);
  var p = (s.pelaajat || []).filter(function (q) { return q.id === id; })[0];
  if (!p) return { spec: spec, virhe: 'tuntematon_id' };
  if (kentta === 'gk' && p.joukkue !== 'vastustaja') return { spec: spec, virhe: 'gk_vain_vastustajalle' };
  if (arvo) p[kentta] = true; else delete p[kentta];
  return { spec: s };
}

/* Liikkeen tyypin vaihto ilman uudelleenpiirtoa. */
function kaavioAsetaLiiketyyppi(spec, id, tyyppi) {
  if (['syotto', 'juoksu', 'kuljetus', 'laukaus'].indexOf(tyyppi) < 0) return { spec: spec, virhe: 'tuntematon_tyyppi' };
  var s = _keKopio(spec);
  var l = (s.liikkeet || []).filter(function (q) { return q.id === id; })[0];
  if (!l) return { spec: spec, virhe: 'tuntematon_id' };
  l.tyyppi = tyyppi;
  return { spec: s };
}

/* MIGRAATIO: globaali spec.cone → pelaajakohtainen nakokentta. Idempotentti (aja kahdesti → sama).
   Editori ajaa tämän avattaessa ja ingest ennen validointia, jolloin dokumentti "korjaa itsensä"
   seuraavassa tallennuksessa. Renderöijä sietää molempia muotoja siirtymän ajan, joten
   migroimaton dokumentti näyttää oikealta jo ennen kuin se on tallennettu uudelleen.
   Omistaja = ainoa vastaanottaja; useammasta otetaan ensimmäinen (vanha render käytti myös
   find():iä, joten lopputulos vastaa sitä mitä käyttäjä NÄKI ennen migraatiota). */
function kaavioNormalisoiNakokentta(spec) {
  if (!spec || !spec.cone) return { spec: spec, muuttui: false };
  var c = spec.cone;
  if (typeof c.half !== 'number' || typeof c.r !== 'number') { var t = _keKopio(spec); delete t.cone; return { spec: t, muuttui: true }; }
  var s = _keKopio(spec);
  var omistaja = (s.pelaajat || []).filter(function (p) { return p.rooli === 'vastaanottaja'; })[0];
  if (omistaja && !omistaja.nakokentta) {
    omistaja.nakokentta = { half: c.half, r: c.r };
    if (typeof omistaja.suunta !== 'number') omistaja.suunta = (typeof omistaja.avoin === 'number') ? omistaja.avoin : -90;
  }
  delete s.cone;
  return { spec: s, muuttui: true };
}

/* Pelaajakohtainen näkökenttä. Korvaa globaalin kaavioAsetaConen; `half`/`r` ovat säädettäviä. */
function kaavioAsetaNakokentta(spec, pelaajaId, asetukset) {
  var s = _keKopio(spec);
  var p = (s.pelaajat || []).filter(function (q) { return q.id === pelaajaId; })[0];
  if (!p) return { spec: spec, virhe: 'tuntematon_id' };
  if (asetukset === false || asetukset === null) { delete p.nakokentta; return { spec: s }; }
  var nyt = p.nakokentta || {};
  var half = (asetukset && typeof asetukset.half === 'number') ? asetukset.half : (typeof nyt.half === 'number' ? nyt.half : 58);
  var r = (asetukset && typeof asetukset.r === 'number') ? asetukset.r : (typeof nyt.r === 'number' ? nyt.r : 42);
  // Klamppaus vastaa validaattorin rajoja: editori ei saa tuottaa arvoa jonka tallennus hylkää.
  p.nakokentta = { half: _keKlamppi(half, 1, 180), r: Math.max(1, r) };
  if (asetukset && typeof asetukset.katve === 'boolean') p.nakokentta.katve = asetukset.katve;
  else if (nyt.katve === true) p.nakokentta.katve = true;
  if (typeof p.suunta !== 'number') p.suunta = (typeof p.avoin === 'number') ? p.avoin : -90;
  return { spec: s };
}

/* Kehon suunta asteina. Editori antaa kulman pelaajasta osoittimeen. */
function kaavioAsetaSuunta(spec, pelaajaId, aste) {
  if (typeof aste !== 'number' || !isFinite(aste)) return { spec: spec, virhe: 'ei_numero' };
  var s = _keKopio(spec);
  var p = (s.pelaajat || []).filter(function (q) { return q.id === pelaajaId; })[0];
  if (!p) return { spec: spec, virhe: 'tuntematon_id' };
  var a = aste % 360; if (a > 180) a -= 360; if (a < -180) a += 360;   // normalisoi -180..180
  p.suunta = Math.round(a * 10) / 10;
  return { spec: s };
}

/* Pallon omistaja. Eksklusiivinen: sama id uudelleen ottaa pallon pois (§6 sallii ≤1). */
function kaavioAsetaPallo(spec, pelaajaId) {
  var s = _keKopio(spec);
  var oli = (s.pelaajat || []).filter(function (q) { return q.pallo; })[0];
  (s.pelaajat || []).forEach(function (q) { delete q.pallo; });
  if (!pelaajaId || (oli && oli.id === pelaajaId)) return { spec: s };
  var p = (s.pelaajat || []).filter(function (q) { return q.id === pelaajaId; })[0];
  if (!p) return { spec: spec, virhe: 'tuntematon_id' };
  p.pallo = true;
  return { spec: s };
}

/* Näkökenttä. §3:ssa `cone` on OBJEKTI {r, half} — renderöijä lukee molemmat (sector(...)), joten
   `cone:true` läpäisisi validaattorin mutta piirtäisi NaN-polun. Validaattori vaatii lisäksi tasan
   yhden vastaanottajan jolla on numeerinen `avoin`; se varmistetaan tässä, jottei tallennus kaadu
   vasta lopuksi. Kulman hienosäätö on myöhempi lisäys — oletus on pelisuunta. */
function kaavioAsetaCone(spec, paalle, asetukset) {
  var s = _keKopio(spec);
  if (!paalle) { delete s.cone; return { spec: s }; }
  var recv = (s.pelaajat || []).filter(function (p) { return p.rooli === 'vastaanottaja'; });
  if (recv.length !== 1) return { spec: spec, virhe: 'vaatii_yhden_vastaanottajan' };
  if (typeof recv[0].avoin !== 'number') recv[0].avoin = -90;   // oletus: kohti hyökkäyssuuntaa
  s.cone = { r: (asetukset && asetukset.r) || 42, half: (asetukset && asetukset.half) || 58 };
  return { spec: s };
}

/* Osumatesti poistotyökalulle: mikä elementti on pisteen alla. Järjestys = päällimmäisin ensin
   (selite → pelaaja → liike), jotta pieni lappu ison pelaajan päällä on valittavissa. */
function kaavioOsuma(spec, x, y, kynnys) {
  var raja = (kynnys == null) ? 4 : kynnys;
  var etaisyys = function (ax, ay) { return Math.sqrt(Math.pow(ax - x, 2) + Math.pow(ay - y, 2)); };
  var s = spec || {};
  var osui = null, pd = raja;
  (s.selitteet || []).forEach(function (se) { var d = etaisyys(se.x, se.y); if (d <= pd) { pd = d; osui = { tyyppi: 'selite', id: se.id }; } });
  if (osui) return osui;
  pd = raja;
  (s.pelaajat || []).forEach(function (p) { var d = etaisyys(p.x, p.y); if (d <= pd) { pd = d; osui = { tyyppi: 'pelaaja', id: p.id }; } });
  if (osui) return osui;
  // Liike: etäisyys janaan. Vapaa pää on piste, ref-pää haetaan pelaajasta.
  var piste = function (paate) {
    if (!paate) return null;
    if (paate.ref) { var p = (s.pelaajat || []).find(function (q) { return q.id === paate.ref; }); return p ? { x: p.x, y: p.y } : null; }
    return { x: paate.x, y: paate.y };
  };
  pd = raja;
  (s.liikkeet || []).forEach(function (l) {
    var a = piste(l.from), b = piste(l.to);
    if (!a || !b) return;
    var dx = b.x - a.x, dy = b.y - a.y, pit2 = dx * dx + dy * dy;
    var t = pit2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / pit2)) : 0;
    var d = etaisyys(a.x + t * dx, a.y + t * dy);
    if (d <= pd) { pd = d; osui = { tyyppi: 'liike', id: l.id }; }
  });
  return osui;
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
  s.selitteet = (s.selitteet || []).filter(function (se) { return se.id !== id; });
  if (!s.selitteet.length) delete s.selitteet;
  // Viimeisen vastaanottajan poisto jättäisi conen orvoksi → validaattori hylkäisi tallennuksen
  // virheellä jota käyttäjä ei osaa yhdistää poistoon. Siivotaan se tässä.
  if (s.cone && (s.pelaajat || []).filter(function (p) { return p.rooli === 'vastaanottaja'; }).length !== 1) delete s.cone;
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
  kaavioLisaaSelite: kaavioLisaaSelite, kaavioAsetaCone: kaavioAsetaCone, kaavioOsuma: kaavioOsuma,
  kaavioAsetaSeliteTeksti: kaavioAsetaSeliteTeksti, kaavioSeliteVajaat: kaavioSeliteVajaat,
  kaavioAsetaJoukkue: kaavioAsetaJoukkue, kaavioAsetaLippu: kaavioAsetaLippu,
  kaavioAsetaLiiketyyppi: kaavioAsetaLiiketyyppi, KAAVIO_SELITE_KIELET: KAAVIO_SELITE_KIELET,
  kaavioNormalisoiNakokentta: kaavioNormalisoiNakokentta, kaavioAsetaNakokentta: kaavioAsetaNakokentta,
  kaavioAsetaSuunta: kaavioAsetaSuunta, kaavioAsetaPallo: kaavioAsetaPallo,
  kaavioEdPX: kaavioEdPX, kaavioEdPY: kaavioEdPY, kaavioEdOX: kaavioEdOX, kaavioEdOY: kaavioEdOY,
  kaavioKatto: kaavioKatto, kaavioMahtuu: kaavioMahtuu,
  kaavioLisaaPelaaja: kaavioLisaaPelaaja, kaavioLisaaLiike: kaavioLisaaLiike,
  kaavioSiirraPelaaja: kaavioSiirraPelaaja, kaavioSnapPaate: kaavioSnapPaate, kaavioPoista: kaavioPoista,
  kaavioHistoriaLisaa: kaavioHistoriaLisaa, kaavioKumoa: kaavioKumoa
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_KAAVIO_EDITORI;
if (typeof window !== 'undefined') { for (var _kek in TM_KAAVIO_EDITORI) { try { window[_kek] = TM_KAAVIO_EDITORI[_kek]; } catch (e) {} } }
