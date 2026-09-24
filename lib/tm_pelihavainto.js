/* tm_pelihavainto.js — KOHDENNETUN PELIHAVAINNON LASKENTA (Vaihe 1, CODE_TASK_PELIANALYTIIKKA_2026-09 §5).

   PUHDAS LIB: ei DOMia, ei Firestorea, ei i18n-lauseita. Palauttaa AVAIMIA ja LUKUJA — käyttöliittymä
   kääntää avaimet (i18n) ja päättää mitä näytetään kenellekin. Näin sama laskenta palvelee kenttätyökalua,
   Masterin pelaajanäkymää ja VP:n raporttia ilman kopioita.

   KOORDINAATIT. Data on AINA kanonisessa muodossa { len, wid } (0–100):
     len = 0 oma maali … 100 vastustajan maali · wid = 0 hyökkääjän vasen laita … 100 oikea.
   Taktiikkataulun spec (Opta, suunta 'ylos') on esitysmuoto: x = wid, y = 100 − len.
   Näyttö (vaakakenttä tarkkailijan silmin) kääntyy puoliajan ja seisomapaikan mukaan — kääntö tehdään
   VAIN näytöllä, tallennettu piste ei koskaan käänny.

   xT: käytetään lib/tm_xt.js:ää sellaisenaan — ruudukkoa EI kopioida tänne. Kynnys "eteni heti" luetaan
   xtLuokka():sta (uhkapisteinä), jottei rajaa tarvitse toistaa kahdessa paikassa.

   EI LASKETTUJA ARVOJA FIRESTOREEN (§5.6): kertoimien päivitys (xG-kalibrointi, nuorten oma ruudukko) ei
   saa vaatia datamigraatiota. Kaikki tässä lasketaan lennossa tallennetusta raakadatasta.

   ⚠ EI Ä/Ö-MERKKEJÄ MERKKIJONOLITERAALEISSA (vartija tarkistaa): lib ei sisällä näyttötekstiä.
   Kommenteissa ääkköset ovat sallittuja. */

var _PH_XT = (typeof module !== 'undefined' && module.exports)
  ? require('./tm_xt.js')
  : ((typeof window !== 'undefined' && window.TM_XT) ? window.TM_XT : null);

function _phXt() { return _PH_XT; }
function _phLuku(v) { return typeof v === 'number' && isFinite(v); }
function _phKlamppi(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ── 1 · KOORDINAATIT ─────────────────────────────────────────────────────────────────────── */

/** Kanoninen { len, wid } → taktiikkataulun spec { x, y } (Opta, suunta 'ylos'). */
function phOptaksi(p) {
  if (!p || !_phLuku(p.len) || !_phLuku(p.wid)) return null;
  return { x: p.wid, y: 100 - p.len };
}

/** Taktiikkataulun spec { x, y } (suunta 'ylos') → kanoninen { len, wid }. */
function phKanoniseksi(x, y) {
  if (!_phLuku(x) || !_phLuku(y)) return null;
  return { len: 100 - y, wid: x };
}

/* Näytön kääntö (mockupin flipX/flipY, docs/prototyypit/pelihavainto_kenttatyokalu_mockup.html):
   vaakakenttä, joten näytön x on PITUUSakseli ja y LEVEYSakseli.
     flipX = 2. puoliaika (hyokkayssuunta kaantyy)
     flipY = hyokkayssuunta × seisomapaikka (vastakkaiselta laidalta katsottuna sivut peilautuvat) */
function _phFlipX(o) { return !!(o && o.puoliaika === 2); }
function _phFlipY(o) {
  var hyokkaaOikealle = !_phFlipX(o);
  var lahi = !(o && o.seisoo === 'kauko');
  return hyokkaaOikealle ? !lahi : lahi;
}

/** Kanoninen piste → näytön { x, y } (0–100). Kaantoa ei koskaan tallenneta. */
function phNaytolle(p, opts) {
  if (!p || !_phLuku(p.len) || !_phLuku(p.wid)) return null;
  return {
    x: _phFlipX(opts) ? 100 - p.len : p.len,
    y: _phFlipY(opts) ? 100 - p.wid : p.wid
  };
}

/** Näytön piste → kanoninen { len, wid }. phNaytolle/phNaytolta on haviota (4 yhdistelmaa). */
function phNaytolta(sx, sy, opts) {
  if (!_phLuku(sx) || !_phLuku(sy)) return null;
  var x = _phKlamppi(sx, 0, 100), y = _phKlamppi(sy, 0, 100);
  return {
    len: _phFlipX(opts) ? 100 - x : x,
    wid: _phFlipY(opts) ? 100 - y : y
  };
}

/* ── 1b · KAKSINPELIN TULOS-ENUM ──────────────────────────────────────────────────────────
   Lukittu lista, koska lib ja kenttatyokalu EIVAT saa erota: jos tallentaja kirjoittaa esim. 'ei'
   ja lib odottaa 'ei_ohittanut', havitty 1v1 katoaisi menetyksista ja riskista hiljaa (se nakyisi
   vain yrityksissa). Tuntematon arvo EI kelpaa yritykseksi — mieluummin puuttuu kuin vaaristaa. */
var PH_KAKSINPELI_TULOS = {
  hyokkays: ['ohitti', 'rikottiin', 'ei_ohittanut'],
  puolustus: ['voitti', 'viivytti', 'ohitettiin']
};
var PH_1V1_ONNISTUI = ['ohitti', 'rikottiin'];

function _phTunnettuTulos(m) {
  if (!m || m.tyyppi !== 'kaksinpeli') return false;
  var sallitut = PH_KAKSINPELI_TULOS[m.rooli];
  return !!sallitut && sallitut.indexOf(m.tulos) >= 0;
}

/* ── 2 · SANALLINEN SIJAINTI (avaimina, kayttoliittyma kaantaa) ───────────────────────────── */

/* Kaistat ovat mockupin (kenttatyokalu) rajat 25/40/60/75 — VIISI kaistaa, koska puolikaista on
   taktisessa puheessa oma paikkansa eika "keskusta tai laita" riita. i18n-avaimet ovat PR-C:ssa. */
var PH_KAISTA_RAJAT = [[25, 'vasen_laita'], [40, 'vasen_puolikaista'], [60, 'keskusta'], [75, 'oikea_puolikaista']];

/** { kolmannes: 'puolustus'|'keski'|'hyokkays', kaista: ks. PH_KAISTA_RAJAT + 'oikea_laita' } */
function phVyohyke(p) {
  if (!p || !_phLuku(p.len) || !_phLuku(p.wid)) return null;
  var len = _phKlamppi(p.len, 0, 100), wid = _phKlamppi(p.wid, 0, 100);
  var kaista = 'oikea_laita';
  for (var i = 0; i < PH_KAISTA_RAJAT.length; i++) {
    if (wid < PH_KAISTA_RAJAT[i][0]) { kaista = PH_KAISTA_RAJAT[i][1]; break; }
  }
  return {
    kolmannes: len < 100 / 3 ? 'puolustus' : (len < 200 / 3 ? 'keski' : 'hyokkays'),
    kaista: kaista
  };
}

/* ── 3 · IKATASOT ─────────────────────────────────────────────────────────────────────────── */

/* tmAdarIkaTier antaa dimensiolistan: 1 → u812 · 3 → u1315 · 4 → u16.
   TIETOINEN POIKKEUS: tuntematon ika (null/undefined) → 'u812', vaikka tmAdarIkaTier(null) antaa nelja
   dimensiota. Nain lukuja ei koskaan nayteta vaaralle ikaryhmalle, kun ikaa ei tiedeta. */
function phIkataso(ika) {
  if (ika == null) return 'u812';
  var tier = (typeof tmAdarIkaTier === 'function') ? tmAdarIkaTier(ika)
    : ((typeof window !== 'undefined' && typeof window.tmAdarIkaTier === 'function') ? window.tmAdarIkaTier(ika) : null);
  var n = tier ? tier.length : (ika >= 16 ? 4 : (ika >= 13 ? 3 : 1));
  if (n <= 1) return 'u812';
  if (n <= 3) return 'u1315';
  return 'u16';
}

/** U8–12: tilanteet ja 1v1-tulokset nakyvat, LUVUT eivat (§5.5). */
function phNaytaLuvut(ikataso) { return ikataso !== 'u812'; }

/* ── 4 · MAALIODOTUSARVO (xG) ─────────────────────────────────────────────────────────────── */

/* Geometrinen malli: logit = b0 + b1 × kulma(rad) + b2 × etaisyys(m).
   Kertoimet ovat ESIMERKKI eivatka kalibroituja — siksi id on xg_geom_v0_esimerkki.
   xg_geom_v1 luodaan vasta kalibroinnin jalkeen (§4). */
var PH_XG_MALLIT = { xg_geom_v0_esimerkki: { b0: 0, b1: 1.6, b2: -0.12 } };
var PH_XG_OLETUS = 'xg_geom_v0_esimerkki';

/* Maalin leveys metreina pelimuodoittain. Pienkenttien arvot ovat null, kunnes Tero vahvistaa ne —
   ja silloin phXg palauttaa null. Parempi puuttua kuin nayttaa vaara luku. */
var PH_MAALI_LEVEYS = { '11v11': 7.32, '8v8': null, '5v5': null };

function phMaalinLeveys(pelimuoto) {
  var m = /^(\d+)v(\d+)$/.exec(pelimuoto || '');
  if (!m || +m[1] >= 11) return PH_MAALI_LEVEYS['11v11'];
  var avain = m[1] + 'v' + m[2];
  return Object.prototype.hasOwnProperty.call(PH_MAALI_LEVEYS, avain) ? PH_MAALI_LEVEYS[avain] : null;
}

/** { todennakoisyys, etaisyys_m, kulma_rad, malli } tai null. */
function phXg(piste, pelimuoto, mallinId) {
  var XT = _phXt();
  if (!piste || !_phLuku(piste.len) || !_phLuku(piste.wid) || !XT) return null;
  var prof = XT.xtProfiili(pelimuoto);
  if (!prof) return null;                                   // esim. 3v3 → xT/xG ei kaytossa
  var G = phMaalinLeveys(pelimuoto);
  if (!_phLuku(G) || G <= 0) return null;                   // pienkentan maali vahvistamatta
  var id = mallinId || PH_XG_OLETUS;
  var k = PH_XG_MALLIT[id];
  if (!k) return null;                                      // tuntematon malli-id ei kaada
  var x = (1 - _phKlamppi(piste.len, 0, 100) / 100) * prof.pituus;      // m maaliviivaan
  var y = (_phKlamppi(piste.wid, 0, 100) / 100 - 0.5) * prof.leveys;    // m keskilinjasta
  var etaisyys = Math.sqrt(x * x + y * y);
  // Maalin nakyva kulma: atan2(G·x, x² + y² − (G/2)²) — 0 maaliviivalla maalin ulkopuolella.
  var kulma = Math.atan2(G * x, x * x + y * y - (G / 2) * (G / 2));
  if (kulma < 0) kulma += Math.PI;
  var logit = k.b0 + k.b1 * kulma + k.b2 * etaisyys;
  return {
    todennakoisyys: 1 / (1 + Math.exp(-logit)),
    etaisyys_m: etaisyys,
    kulma_rad: kulma,
    malli: id
  };
}

/* ── 5 · MERKINNAN ARVO ───────────────────────────────────────────────────────────────────── */

var PH_SUUNTA = 'ylos';   // kanoninen → Opta-muunnoksen jalkeen hyokkayssuunta on aina ylos

function _phXtArvo(p, pelimuoto) {
  var XT = _phXt(), o = phOptaksi(p);
  if (!XT || !o) return null;
  return XT.xtArvo(o.x, o.y, PH_SUUNTA, pelimuoto);
}

/** Etenemisen uhkapisteet (loppu − alku), tai null. */
function _phDelta(m, pelimuoto) {
  var XT = _phXt();
  var a = _phXtArvo(m.alku, pelimuoto), b = _phXtArvo(m.loppu, pelimuoto);
  if (a == null || b == null || !XT) return null;
  return XT.xtPisteet(b - a);
}

function _phRiski(p, pelimuoto) {
  var XT = _phXt(), o = phOptaksi(p);
  if (!XT || !o) return null;
  return XT.xtMenetysriski(o.x, o.y, PH_SUUNTA, pelimuoto);
}

/* Menetyksen piste: harhasyotto menetetaan sinne minne se meni (loppu), muut merkinnat omaan pisteeseensa. */
function _phMenetysPiste(m) { return m.loppu || m.piste || m.alku || null; }

/** { laji, pisteet, yksikko, taso?, malli } tai null (eiSijaintia · 3v3 · ei arvoa taman tyyppiselle).
    opts.xgMalli = dokumentin tasolla valittu xG-malli (dok.malli.xg). Merkinnalla EI ole omaa mallia. */
function phArvo(m, pelimuoto, opts) {
  var XT = _phXt();
  if (!m || !XT || m.eiSijaintia) return null;
  if (XT.xtProfiili(pelimuoto) === null) return null;                  // pelimuoto xT:n ulkopuolella
  var malli = (XT.xtProfiili(pelimuoto) || {}).malli || null;
  var uhka = function (pisteet) {
    return pisteet == null ? null : { laji: 'uhka', pisteet: pisteet, yksikko: 'uhkapisteet', luokka: XT.xtLuokka(pisteet), malli: malli };
  };
  var riski = function (p) {
    var r = _phRiski(p, pelimuoto);
    return r == null ? null : { laji: 'menetysriski', pisteet: r.pisteet, yksikko: 'uhkapisteet', taso: r.taso, malli: malli };
  };
  var puolustus = function (p) {
    // Puolustusarvo = menetysriskin peililuku samassa pisteessa: mita vastustaja OLISI saanut.
    var r = _phRiski(p, pelimuoto);
    return r == null ? null : { laji: 'puolustus', pisteet: r.pisteet, yksikko: 'uhkapisteet', taso: r.taso, malli: malli };
  };

  switch (m.tyyppi) {
    case 'syotto':
      if (m.perilla === false) return riski(_phMenetysPiste(m));
      return uhka(_phDelta(m, pelimuoto));
    case 'kuljetus':
    case 'etenee':
      return uhka(_phDelta(m, pelimuoto));
    case 'juoksu': {
      var d = _phDelta(m, pelimuoto);
      return d == null ? null : { laji: 'potentiaali', pisteet: d, yksikko: 'uhkapisteet', malli: malli };
    }
    case 'riisto':
      return puolustus(m.piste || m.loppu || m.alku);
    case 'menetys':
      return riski(_phMenetysPiste(m));
    case 'kaksinpeli': {
      var kp = m.piste || m.alku;
      if (m.rooli === 'puolustus' && m.tulos === 'voitti') return puolustus(kp);
      if (m.rooli === 'hyokkays' && m.tulos === 'ei_ohittanut') return riski(kp);
      // Ohitetuksi tuleminen ei ole menetys (pallo ei vaihtanut omistajaa), mutta tilanne on vaarallinen
      // samassa pisteessa. Oma laji, jottei se summaudu menetysriskeihin — mockup nayttaa taman.
      if (m.rooli === 'puolustus' && m.tulos === 'ohitettiin') {
        var rr = _phRiski(kp, pelimuoto);
        return rr == null ? null : { laji: 'tilanteen_vaara', pisteet: rr.pisteet, yksikko: 'uhkapisteet', taso: rr.taso, malli: malli };
      }
      return null;
    }
    case 'laukaus': {
      var xg = phXg(m.piste || m.loppu || m.alku, pelimuoto, (opts && opts.xgMalli) || null);
      return xg == null ? null : { laji: 'xg', pisteet: xg.todennakoisyys, yksikko: 'todennakoisyys', malli: xg.malli };
    }
    default:
      return null;                                                     // 'hetki' ja taydentamattomat
  }
}

/* ── 6 · YHTEENVETO (§5.4 + §5.4.1) ───────────────────────────────────────────────────────── */

function _phOnJuuri(m) {
  return m.tyyppi === 'riisto' || (m.tyyppi === 'kaksinpeli' && m.rooli === 'puolustus' && m.tulos === 'voitti');
}

function _phUhkaPisteet(m, pelimuoto) {
  var a = phArvo(m, pelimuoto);
  return (a && a.laji === 'uhka') ? a.pisteet : null;
}

/* Dokumentin xG-malli. Tuntematon id ei kaadu: phXg palauttaa null ja laskettu jaa nollaan. */
function _phXgMalli(dok) { return (dok && dok.malli && dok.malli.xg) || PH_XG_OLETUS; }

/* KETJU ON MONITASOINEN. Kenttatyokalu tuottaa riisto → kuljetus → syotto niin, etta SYOTON ketju
   osoittaa KULJETUKSEEN, ei riistoon. Yhden tason luku pudottaisi ketjun arvokkaimman osan (syoton)
   siirtyman uhkasummasta — juuri siita luvusta, jota §5.4.1 kuvaa vahvaksi pelialysignaaliksi.
   §5.4.1: "Ketju kuljetaan ketju-viittauksia YLOSPAIN juureen."
   Syklisuoja: rikkinainen tai kehamainen viittaus palauttaa null, ei jaa silmukkaan. */
var PH_KETJU_MAX = 10;

function _phIndeksi(merkinnat) {
  var byId = {};
  (merkinnat || []).forEach(function (m) { if (m && m.id != null) byId[m.id] = m; });
  return byId;
}

/** Merkinnan ketjun juuri (merkinta itse jos ei ketjua). null jos viittaus on rikki tai kehamainen. */
function _phJuuri(m, byId) {
  var nyt = m, n = 0;
  while (nyt && nyt.ketju != null) {
    if (++n > PH_KETJU_MAX) return null;                 // sykli tai liian syva ketju
    nyt = byId[nyt.ketju];
  }
  return nyt || null;
}

/** Ketjun jasenet: KAIKKI jalkelaiset (myos lastenlapset), ei vain suorat lapset. */
function _phKetju(merkinnat, juuri, byId) {
  if (!juuri || juuri.id == null) return [];
  var idx = byId || _phIndeksi(merkinnat);
  return merkinnat.filter(function (x) {
    if (x === juuri || x.ketju == null) return false;
    var j = _phJuuri(x, idx);
    return !!j && j.id === juuri.id;
  });
}

/* §5.4.1: siirtyman saannot. Palauttaa { sailyi, menetetty, eteniHeti, menetysHeti, selvitys, uhka }. */
function _phSiirtyma(merkinnat, pelimuoto) {
  var XT = _phXt();
  var byId = _phIndeksi(merkinnat);
  var out = { sailyi: 0, menetetty: 0, eteniHeti: 0, menetysHeti: 0, selvitys: 0, kesken: 0, uhka: 0 };
  merkinnat.filter(_phOnJuuri).forEach(function (juuri) {
    var jatko = juuri.jatko || null;
    if (!jatko) return;                                                 // aikaraja → ei lasketa
    var jasenet = _phKetju(merkinnat, juuri, byId);
    // Siirtyman uhka = ketjun jasenten (syotot perille + kuljetukset) uhka-arvojen summa, kukin KERRAN.
    jasenet.forEach(function (j) {
      if (j.tyyppi !== 'syotto' && j.tyyppi !== 'kuljetus') return;
      var p = _phUhkaPisteet(j, pelimuoto);
      if (p != null) out.uhka += p;
    });
    /* Sailyi/menetetty ja "eteni heti" arvioidaan ENSIMMAISESTA teosta = riiston SUORASTA lapsesta
       (§5.4.1, sama kuin kenttatyokalussa). Lastenlapsi ei saa arvioida niita: ketjun kuljetus → syotto
       arvioituisi silloin syoton perusteella. Vain uhkasumma kulkee koko ketjun lapi. */
    var eka = function (tyyppi) {
      for (var i = 0; i < jasenet.length; i++) {
        if (jasenet[i].tyyppi === tyyppi && jasenet[i].ketju === juuri.id) return jasenet[i];
      }
      return null;
    };
    var etenee = function (j) {
      var p = j ? _phUhkaPisteet(j, pelimuoto) : null;
      return p != null && XT && XT.xtLuokka(p) === 'etenee';
    };
    /* Ketjuton 'syotto'/'kuljetus' = KESKEN, ei menetys: valmentaja napautti jatkon mutta ei ehtinyt
       pyyhkaista. Sama periaate kuin jatko === null (aikaraja) — ei nimittajaan, taydennetaan tauolla.
       §5.4.1:n taulukossa menetys on vain "ei perilla" / lopputuote 'menetys'. */
    if (jatko === 'syotto') {
      var s = eka('syotto');
      if (!s) { out.kesken++; return; }
      if (s.perilla !== false) { out.sailyi++; if (etenee(s)) out.eteniHeti++; }
      else { out.menetetty++; out.menetysHeti++; }
    } else if (jatko === 'kuljetus') {
      var k = eka('kuljetus');
      if (!k) { out.kesken++; return; }
      if (k.lopputuote !== 'menetys') { out.sailyi++; if (etenee(k)) out.eteniHeti++; }
      else { out.menetetty++; out.menetysHeti++; }
    } else if (jatko === 'sailyi' || jatko === 'rikottiin') {
      out.sailyi++;
    } else if (jatko === 'menetys') {
      out.menetetty++; out.menetysHeti++;
    } else if (jatko === 'selvitys') {
      out.selvitys++;                                                   // EI nimittajassa (§5.4.1)
    }
  });
  out.uhka = Math.round(out.uhka * 10) / 10;
  out.sailytysosuus = (out.sailyi + out.menetetty) > 0 ? out.sailyi / (out.sailyi + out.menetetty) : null;
  return out;
}

/** §5.4:n luvut ja ADAR-rivit AVAIMINA ja LUKUINA. Ei lauseita, ei arvosanoja. */
function phYhteenveto(dok) {
  var XT = _phXt();
  var merkinnat = (dok && Array.isArray(dok.merkinnat)) ? dok.merkinnat : [];
  var pelimuoto = (dok && dok.ottelu && dok.ottelu.pelimuoto) || '11v11';
  var ikataso = (dok && dok.ikataso) || 'u812';
  var ketjussa = function (m) { return m.ketju != null; };

  var byId = _phIndeksi(merkinnat);
  var juuriId = function (m) { return m.ketju == null ? null : _phJuuri(m, byId); };
  /* 1v1 hyokkays: kaksinpelit (VAIN tunnetulla tuloksella, K1) + kuljetukset joissa ohitus matkalla.
     Ketjun kuljetus 1v1-juuren alla EI tuplaa ohitusta: se on saman ohituksen jatke, ei uusi yritys. */
  var hyokkays1v1 = merkinnat.filter(function (m) {
    return m.tyyppi === 'kaksinpeli' && m.rooli === 'hyokkays' && _phTunnettuTulos(m);
  });
  var ohitusKuljetukset = merkinnat.filter(function (m) {
    if (m.tyyppi !== 'kuljetus' || m.ohitus !== true) return false;
    var j = juuriId(m);
    return !(j && j.tyyppi === 'kaksinpeli');
  });
  var ykkosetHyokkays = {
    onnistui: hyokkays1v1.filter(function (m) { return PH_1V1_ONNISTUI.indexOf(m.tulos) >= 0; }).length + ohitusKuljetukset.length,
    yritykset: hyokkays1v1.length + ohitusKuljetukset.length
  };

  var puolustus1v1 = merkinnat.filter(function (m) {
    return m.tyyppi === 'kaksinpeli' && m.rooli === 'puolustus' && _phTunnettuTulos(m);
  });
  var ykkosetPuolustus = {
    voitti: puolustus1v1.filter(function (m) { return m.tulos === 'voitti'; }).length,
    kaikki: puolustus1v1.length,
    viivytti: puolustus1v1.filter(function (m) { return m.tulos === 'viivytti'; }).length,
    ohitettiin: puolustus1v1.filter(function (m) { return m.tulos === 'ohitettiin'; }).length
  };

  var juuret = merkinnat.filter(_phOnJuuri);
  var puolustusarvo = 0;
  juuret.forEach(function (m) { var a = phArvo(m, pelimuoto); if (a && a.laji === 'puolustus') puolustusarvo += a.pisteet; });

  // Luotu uhka: syotot perille + kuljetukset (ei juoksuja, ei taydentamattomia 'etenee'-merkintoja).
  var uhkaMerkinnat = merkinnat.filter(function (m) {
    if (m.tyyppi === 'syotto') return m.perilla !== false;
    return m.tyyppi === 'kuljetus';
  });
  var luotuUhka = 0, uhkaRiistoista = 0;
  uhkaMerkinnat.forEach(function (m) {
    var p = _phUhkaPisteet(m, pelimuoto);
    if (p == null) return;
    luotuUhka += p;
    if (ketjussa(m)) {
      var juuri = _phJuuri(m, byId);                      // K8: koko ketju ylospain, ei vain suora vanhempi
      if (juuri && _phOnJuuri(juuri)) uhkaRiistoista += p;
    }
  });

  var syotot = merkinnat.filter(function (m) { return m.tyyppi === 'syotto'; });
  var kuljetukset = merkinnat.filter(function (m) { return m.tyyppi === 'kuljetus'; });
  var lopputuotteet = {};
  kuljetukset.forEach(function (m) {
    var k = m.lopputuote || 'avoin';
    lopputuotteet[k] = (lopputuotteet[k] || 0) + 1;
  });

  var xgMalli = _phXgMalli(dok);
  var laukaukset = merkinnat.filter(function (m) { return m.tyyppi === 'laukaus'; });
  var xgSumma = 0, xgLaskettu = 0;
  laukaukset.forEach(function (m) {
    var a = phArvo(m, pelimuoto, { xgMalli: xgMalli });
    if (a && a.laji === 'xg') { xgSumma += a.pisteet; xgLaskettu++; }
  });

  // Menetykset: menetys-merkinnat + harhasyotot + havityt hyokkays-1v1:t.
  var menetykset = merkinnat.filter(function (m) {
    if (m.tyyppi === 'menetys') return true;
    if (m.tyyppi === 'syotto') return m.perilla === false;
    return m.tyyppi === 'kaksinpeli' && m.rooli === 'hyokkays' && m.tulos === 'ei_ohittanut';
  });
  var korkeallaRiskilla = menetykset.filter(function (m) {
    var a = phArvo(m, pelimuoto);
    return !!(a && a.laji === 'menetysriski' && a.taso === 'korkea');
  }).length;

  var siirtyma = _phSiirtyma(merkinnat, pelimuoto);

  // ADAR-rivit: samat luvut ADARin nelja vaihetta ankkuroiden (ei korvaa arviota).
  var skannattavat = merkinnat.filter(function (m) {
    return (m.tyyppi === 'syotto' || m.tyyppi === 'kuljetus') && !ketjussa(m) && m.skannasi != null;
  });
  var reaktiolliset = merkinnat.filter(function (m) { return m.reaktio != null && m.reaktio !== 'ei'; });
  var reagoiHeti = merkinnat.filter(function (m) { return m.reaktio === 'heti'; }).length;

  return {
    ikataso: ikataso,
    naytaLuvut: phNaytaLuvut(ikataso),
    pelimuoto: pelimuoto,
    malli: {
      xt: (XT && XT.xtProfiili(pelimuoto) || {}).malli || null,
      xg: xgMalli                                        // KAYTETTY id, ei aina oletus
    },
    /* Tilannelaskuri = juuret: ketjun jasenet eivat tuplaa sita, ja eiSijaintia-merkinnat (hetket)
       kuuluvat lukumaariin vaikka niille ei lasketa arvoa. Kaikkien merkintojen maara omalla avaimellaan. */
    merkintoja: merkinnat.filter(function (m) { return m && m.ketju == null; }).length,
    merkintojaKaikki: merkinnat.length,
    luvut: {
      ykkosetHyokkays: ykkosetHyokkays,
      ykkosetPuolustus: ykkosetPuolustus,
      riistot: { n: juuret.length, puolustusarvo: Math.round(puolustusarvo * 10) / 10 },
      siirtyma: siirtyma,
      luotuUhka: { pisteet: Math.round(luotuUhka * 10) / 10, riistoista: Math.round(uhkaRiistoista * 10) / 10 },
      syotot: { perille: syotot.filter(function (m) { return m.perilla !== false; }).length, yhteensa: syotot.length },
      kuljetukset: { n: kuljetukset.length, lopputuotteet: lopputuotteet },
      xg: { summa: Math.round(xgSumma * 1000) / 1000, laukauksia: laukaukset.length, laskettu: xgLaskettu },
      menetykset: { n: menetykset.length, korkeallaRiskilla: korkeallaRiskilla }
    },
    adar: {
      ennenPalloa: {
        juoksut: merkinnat.filter(function (m) { return m.tyyppi === 'juoksu'; }).length,
        skannasi: { kylla: skannattavat.filter(function (m) { return m.skannasi === true; }).length, yhteensa: skannattavat.length }
      },
      pallonKanssa: {
        ykkosetHyokkays: ykkosetHyokkays,
        syotot: { perille: syotot.filter(function (m) { return m.perilla !== false; }).length, yhteensa: syotot.length },
        kuljetukset: { n: kuljetukset.length, lopputuotteet: lopputuotteet }
      },
      puolustaminen: { ykkosetPuolustus: ykkosetPuolustus, riistot: juuret.length },
      riistonJalkeen: siirtyma,
      menetyksenJalkeen: { reagoiHeti: reagoiHeti, yhteensa: reaktiolliset.length }
    }
  };
}

var TM_PELIHAVAINTO = {
  phOptaksi: phOptaksi, phKanoniseksi: phKanoniseksi,
  phNaytolle: phNaytolle, phNaytolta: phNaytolta,
  phVyohyke: phVyohyke,
  phIkataso: phIkataso, phNaytaLuvut: phNaytaLuvut,
  phXg: phXg, phMaalinLeveys: phMaalinLeveys,
  phArvo: phArvo, phYhteenveto: phYhteenveto,
  PH_XG_MALLIT: PH_XG_MALLIT, PH_XG_OLETUS: PH_XG_OLETUS, PH_MAALI_LEVEYS: PH_MAALI_LEVEYS,
  PH_KAKSINPELI_TULOS: PH_KAKSINPELI_TULOS, PH_1V1_ONNISTUI: PH_1V1_ONNISTUI, PH_KAISTA_RAJAT: PH_KAISTA_RAJAT
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_PELIHAVAINTO;
if (typeof window !== 'undefined') { for (var _phk in TM_PELIHAVAINTO) { try { window[_phk] = TM_PELIHAVAINTO[_phk]; } catch (e) {} } window.TM_PELIHAVAINTO = TM_PELIHAVAINTO; }
