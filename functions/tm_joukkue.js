// tm_joukkue.js — joukkue-merkkijonon normalisointi (#92). Jaettu, testattava, EI Firebase-riippuvuutta.
//
// ONGELMA (live, SJK): seurat/{sid}/joukkueet on puhdas (yksi doc per joukkue), MUTTA pelaajien `joukkue`-MERKKIJONO
// varioi erätuonneista (trailing/leading space, double space, iso/pieni kirjain, NBSP/zero-width, unicode-muoto) →
// Pelaajat-suodatin/VP-pulssi/Master/kalenteri ryhmittelevät `joukkue`-stringillä → sama joukkue pirstoutuu kahdeksi.
//
// RATKAISU: kanonisoi pelaajan raw joukkue-nimi seuran joukkuet-kokoelman doccia vasten (docin nimi = säilyvä muoto).
// §18-invariantti: pidä joukkue (kanoninen NIMI) + joukkueet[] (kanoninen ID) molemmat ajan tasalla.

// Normalisoitu VERTAILUavain — VAIN vertailuun, EI talletukseen. String concat (§7.1).
//   poista zero-width/BOM -> collapse whitespace (sis. NBSP  ) yhdeksi valilyonniksi -> trim -> NFC -> lowercase.
function tmNormJoukkueAvain(nimi) {
  if (nimi == null) return '';
  var s = String(nimi);
  s = s.replace(/[​‌‍﻿]/g, '');   // zero-width space/non-joiner/joiner + BOM -> pois (nakymattomat)
  s = s.replace(/\s+/g, ' ').trim();                  // \s kattaa NBSP:n ( ) -> valilyonti; tuplavalit yhdeksi
  if (typeof s.normalize === 'function') s = s.normalize('NFC');
  return s.toLowerCase();
}

// Kanonisoi raw joukkue-nimi seuran joukkuet-listaa vasten.
//   joukkueetLista = seuran joukkuet-kokoelman docit [{id, nimi}, ...].
//   Osuma normalisoidulla avaimella -> palauta docin KANONINEN { nimi, id } (docin nimi voittaa = sailyva muoto).
//   Ei osumaa -> null (= uusi joukkue / operaattorin paatos; ALA luo hiljaa duplikaattia).
function tmKanonisoiJoukkue(rawNimi, joukkueetLista) {
  var avain = tmNormJoukkueAvain(rawNimi);
  if (!avain || !Array.isArray(joukkueetLista)) return null;
  for (var i = 0; i < joukkueetLista.length; i++) {
    var d = joukkueetLista[i];
    if (d && tmNormJoukkueAvain(d.nimi) === avain) {
      return { nimi: d.nimi, id: d.id };
    }
  }
  return null;
}

// #92b — siivoa joukkueet[]-taulukko: jätä VAIN kanoniset team-id:t, poista nimi-string-jäänteet
// (erätuonti tallensi osalle joukkueet[]:hin team-NIMEN id:n sijaan → #92-arrayUnion jätti nimi-jäänteet → tuplasirut).
//   validIdt = seuran joukkuet-doc-id:t (Array tai Set). joukkueStr/joukkueetLista = turvaverkkoa varten.
//   Suodatus: pidä vain validi id (säilyttää järjestyksen). Jos tyhjenee MUTTA joukkue-string matchaa team-dociin
//   → [kanon.id] (turvaverkko). Palauttaa siivotun id-taulukon (uusi array). Idempotentti.
function tmPuhdistaJoukkueetIdt(joukkueet, validIdt, joukkueStr, joukkueetLista) {
  var set = (validIdt instanceof Set) ? validIdt : new Set(Array.isArray(validIdt) ? validIdt : []);
  var arr = Array.isArray(joukkueet) ? joukkueet : [];
  var puhdas = arr.filter(function (x) { return set.has(x); });
  if (puhdas.length === 0 && joukkueStr != null && Array.isArray(joukkueetLista)) {
    var kanon = tmKanonisoiJoukkue(joukkueStr, joukkueetLista);
    if (kanon && set.has(kanon.id)) puhdas = [kanon.id];
  }
  return puhdas;
}

// #70 — kronologinen joukkuejärjestys: ikäluokka nuorimmasta vanhimpaan (P → T → U, ikä nouseva).
// Korjaa satunnaisen/aakkos-järjestyksen ("P10 < P16 < P8"). Tunnistamaton ikä loppuun, nimellä. EI mutatoi alkuperäistä.
function _joukkueLajiAvain(j) {
  var nimi = String((j && (j.nimi || j.id)) || '');
  var m = nimi.match(/\b([PTU])\s?(\d{1,2})\b/i);
  var sp = m ? m[1].toUpperCase() : '';
  var spRank = sp === 'P' ? 0 : sp === 'T' ? 1 : sp === 'U' ? 2 : 8;   // P → T → U → tunnistamaton
  // ikä nimestä (nouseva); muuten vuosi (suurempi vuosi = nuorempi → 3000−vuosi pitää nuoret ensin); muuten loppuun.
  var ika = m ? parseInt(m[2], 10)
          : (j && typeof j.vuosi === 'number' ? (3000 - j.vuosi) : 999);
  return { spRank: spRank, ika: ika, nimi: nimi };
}
function lajitteleJoukkueetIkaluokittain(joukkueet) {
  var arr = Array.isArray(joukkueet) ? joukkueet.slice() : [];
  arr.sort(function (a, b) {
    var ka = _joukkueLajiAvain(a), kb = _joukkueLajiAvain(b);
    return (ka.spRank - kb.spRank) || (ka.ika - kb.ika) || ka.nimi.localeCompare(kb.nimi);
  });
  return arr;
}

/* ── §18-JÄSENYYS YHDESTÄ PAIKASTA ────────────────────────────────────────────────────────
   Pelaajalla on KAKSI joukkuetietoa, ja molempia luetaan eri näkymissä:
     joukkue / joukkueNimi   = kanoninen NIMI  → VP, Master ja Admin ryhmittelevät tällä
     joukkueet[] / joukkueetNimet[] = team-doc ID:t → seurahallinta suodattaa ja laskee tällä
   Kumpikin luontipolku rakensi tämän omalla tavallaan, ja molemmat rikkoivat invariantin:
   tuonti jätti id:t kirjoittamatta, rekisteröinti kirjoitti NIMEN id:n paikalle. Siksi rakenne
   tehdään NYT yhdessä paikassa — sama periaate kuin H1:n tmAhKertaPayload.

   Paluuarvo on aina KAIKKI neljä kenttää, jotta kirjoitus ei voi jättää puolta pois.
   ORPO (nimi ei vastaa yhtään team-docia): id:tä EI ARVATA — joukkueet jää tyhjäksi ja
   `orpo: true` kertoo kutsujalle, että rivi on merkittävä ja operaattorin ratkaistava. */
function tmJoukkueJasenyys(rawNimi, joukkueetLista) {
  var raaka = (rawNimi == null) ? '' : String(rawNimi).trim();
  if (!raaka) return { joukkue: '', joukkueNimi: '', joukkueet: [], joukkueetNimet: [], orpo: false, id: null };
  var kanon = tmKanonisoiJoukkue(raaka, joukkueetLista);
  if (!kanon) {
    return { joukkue: raaka, joukkueNimi: raaka, joukkueet: [], joukkueetNimet: [], orpo: true, id: null };
  }
  return {
    joukkue: kanon.nimi, joukkueNimi: kanon.nimi,
    joukkueet: [kanon.id], joukkueetNimet: [kanon.nimi],
    orpo: false, id: kanon.id,
  };
}

/** Jäsenyys tunnetusta team-docista (rekisteröinti: id on jo valittu pudotusvalikosta). */
function tmJoukkueJasenyysIdlla(joukkueId, joukkueNimi) {
  var id = joukkueId ? String(joukkueId) : '';
  var nimi = joukkueNimi ? String(joukkueNimi) : '';
  if (!id) return { joukkue: nimi, joukkueNimi: nimi, joukkueet: [], joukkueetNimet: [], orpo: !!nimi, id: null };
  return { joukkue: nimi || id, joukkueNimi: nimi || id, joukkueet: [id], joukkueetNimet: nimi ? [nimi] : [], orpo: false, id: id };
}

/* ── HENKILÖSTÖN JOUKKUEET NÄYTTÖÖN (1.10.2026) ──────────────────────────────────────────
   Valmentajalla voi olla useita joukkueita (kayttajat.joukkueetNimet[]), mutta henkilöstökortit lukivat
   vain legacy-yksikkökenttää joukkueNimi/joukkue → "KPV T18" vaikka valmentaja vetää myös U13:a.
   Kanoninen kenttä on joukkueetNimet; joukkueNimet on sama data väärällä nimellä (luoKayttaja kirjoitti sen #693:sta 1.10.2026 asti).
   joukkueet[] (team-doc id:t) EI näytetä: id ei ole nimi. Legacy-kentät vain, jos listaa ei ole.
   Duplikaatit pois vertailuavaimella, järjestys säilyy (ensimmäinen = legacy-pääjoukkue). */
function tmHenkiloJoukkueNimet(d) {
  if (!d) return [];
  var lista = Array.isArray(d.joukkueetNimet) && d.joukkueetNimet.length ? d.joukkueetNimet
            : Array.isArray(d.joukkueNimet) && d.joukkueNimet.length ? d.joukkueNimet
            : [d.joukkueNimi || d.joukkue];
  var nahty = {}, ulos = [];
  for (var i = 0; i < lista.length; i++) {
    var nimi = (lista[i] == null) ? '' : String(lista[i]).trim();
    var avain = tmNormJoukkueAvain(nimi);
    if (!avain || nahty[avain]) continue;
    nahty[avain] = true;
    ulos.push(nimi);
  }
  return ulos;
}
/** Näyttöteksti "KPV T18 · KPV U13"; tyhjä lista → tyhjä = oletus ('—' tms.). EI escapea: kutsuja escapoi. */
function tmHenkiloJoukkueTeksti(d, tyhja) {
  var n = tmHenkiloJoukkueNimet(d);
  return n.length ? n.join(' · ') : (tyhja == null ? '' : tyhja);
}

/* ── JOUKKUEJÄSENYYDEN YKSI SÄÄNTÖ (§7.18, Tero 8.10.2026) ──────────────────────────────────
   joukkueet[] on jäsenyyden TOTUUS. `joukkue` on vain näyttönimi, ja sen tunnisteen on oltava joukkueet[]:ssä. Pelaaja voi kuulua useaan joukkueeseen (lasketaan jokaiseen; seuran
   kokonaisluvut uniikeista pelaajista). Ryhmät eivät ole joukkueita. Ikäluokka tulee syntymävuodesta, ei joukkueesta.
   Syy: Sibbon 25 pelaajalla joukkue = "2014 Blå" mutta joukkueet[] = [p12]; VP ryhmitteli nimellä, Master ja kooste nimellä TAI tunnisteella → sama pelaaja kahdessa joukkueessa (271 vs 246).

   tmPelaajanJoukkueet(p, joukkueDocs) → joukkueiden TUNNISTEET (uniikit, järjestys säilyy). KÄYTÄ KAIKKIALLA joukkuemittareissa (VP:n joukkuekortit, pulssi, poikkeamat, Master, kooste).
     · joukkueet[] ei tyhjä → vain ne tunnisteet, jotka ovat seuran joukkue-doceja (joukkueDocs [{id, nimi}]). Legacy: nimi joukkueet[]:ssä → kanoninen doc (vain osuessa); tuntematon tunniste ohitetaan.
     · joukkueet[] puuttuu/tyhjä (legacy-pelaaja ennen §18:aa) → `joukkue`-nimi kanonisoidaan docia vasten (yksi tunniste) — EI muuten: nimi ei koskaan LISÄÄ jäsenyyttä listaan, jossa on tunnisteita.
     · joukkueDocs puuttuu tai on tyhjä → joukkueet[] sellaisenaan (merkkijonoina); nimeä ei voi ratkaista.
   Ei koske `joukkue`-kenttää ryhmittelyssä: vartija tests/joukkuejasenyys_yksi_saanto.test.js. */
function tmPelaajanJoukkueet(p, joukkueDocs) {
  if (!p) return [];
  var docs = (Array.isArray(joukkueDocs) && joukkueDocs.length) ? joukkueDocs : null, ids = Array.isArray(p.joukkueet) ? p.joukkueet : [], ulos = [], nahty = {};
  function lisaa(id) { if (id == null || id === '') return; id = String(id); if (!nahty[id]) { nahty[id] = true; ulos.push(id); } }
  if (ids.length) {
    ids.forEach(function (x) {
      if (x == null || x === '') return;
      if (!docs) { lisaa(x); return; }
      var tarkka = null; for (var i = 0; i < docs.length; i++) if (docs[i] && String(docs[i].id) === String(x)) { tarkka = docs[i]; break; }
      if (tarkka) { lisaa(tarkka.id); return; }
      var k = tmKanonisoiJoukkue(x, docs); if (k) lisaa(k.id);   // legacy: nimi id:n paikalla
    });
    return ulos;
  }
  if (docs) { var kn = tmKanonisoiJoukkue(p.joukkue != null ? p.joukkue : p.joukkueNimi, docs); if (kn) lisaa(kn.id); }
  return ulos;
}

/* Kirjoituspolku: pelaajan jäsenyys-päivitys YHDESTÄ paikasta (Seura "Siirrä joukkueeseen" / "Lisää joukkueeseen"; §7.18). Palauttaa KAIKKI neljä kenttää, jotta kirjoitus ei jätä puolta pois.
     tapa 'siirto'  → joukkueet = [kohde] (vanhat tunnisteet POIS), nimi = kohteen nimi
     tapa 'lisays'  → joukkueet = vanhat (voimassa olevat tunnisteet) + kohde; näyttönimi pysyy pelaajan nykyisenä pääjoukkueena, jos se on yhä jäsen, muuten ensimmäinen.
   Vanhat tunnisteet normalisoidaan tmPelaajanJoukkueet:llä (kuolleet/nimi-jäänteet pois). joukkueDocs [{id,nimi}] pakollinen (nimet docista). */
function tmJasenyysPaivitys(p, tapa, kohdeId, joukkueDocs) {
  var docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], nimet = {};
  docs.forEach(function (d) { if (d && d.id != null) nimet[d.id] = d.nimi || d.id; });
  var vanhat = tmPelaajanJoukkueet(p, docs.length ? docs : null);
  var uudet = (tapa === 'siirto') ? [String(kohdeId)] : (vanhat.indexOf(String(kohdeId)) >= 0 ? vanhat.slice() : vanhat.concat([String(kohdeId)]));
  var nimiLista = uudet.map(function (id) { return nimet[id] || id; });
  var nykyinen = p && (p.joukkue != null ? p.joukkue : p.joukkueNimi), paaNimi = nimiLista[0] || '';
  if (tapa !== 'siirto' && nykyinen != null) { for (var i = 0; i < nimiLista.length; i++) if (tmNormJoukkueAvain(nimiLista[i]) === tmNormJoukkueAvain(nykyinen)) { paaNimi = nimiLista[i]; break; } }
  return { joukkueet: uudet, joukkueetNimet: nimiLista, joukkue: paaNimi, joukkueNimi: paaNimi };
}

/* Ikäluokka joukkue-docista: ikaryhma ('P12'/'U12'), muuten nimen "P12"-osa, muuten vuosi (viite − vuosi). null = ei tiedossa. */
function _jasIkaDoc(d, viiteVuosi) {
  if (!d) return null;
  var m = /(\d{1,2})\s*$/.exec(String(d.ikaryhma || '')) || /\b[PTU]\s?(\d{1,2})\b/i.exec(String(d.nimi || ''));
  if (m) return parseInt(m[1], 10);
  var v = parseInt(d.vuosi, 10); return isNaN(v) ? null : viiteVuosi - v;
}

/* Jäsenyysdiagnoosi yhdelle pelaajalle (Excel_Tuonti "Tarkista joukkuejäsenyydet"; PURE, ei nimiä ulos).
   Palauttaa { tyyppi, ehdotus: {joukkueet:[id], joukkue, joukkueNimi, joukkueetNimet}|null, yksiselitteinen: bool|null }.
   tyypit: 'ehja' · 'tyhja' (ei nimeä eikä tunnisteita) · 'id_puuttuu' (nimi tunnettu, joukkueet[] tyhjä) · 'nimi_idn_paikalla' (joukkueet[] sisältää NIMEN) · 'vanha_id' (nimi→A, tunnisteet eivät sisällä A:ta) ·
           'nimi_puuttuu' (tunnisteet, ei nimeä) · 'nimi_tuntematon' (tunnisteet ok, nimi ei vastaa mitään docia → vain näyttönimi päivitetään) · 'orpo' (nimi ei vastaa docia eikä tunnisteita → ei korjausta) · 'kuollut_id' (joukkueet[] sisältää tuntemattomia tunnisteita).
   Korjaus = NIMEN mukainen joukkue (Teron oletus: 2014 Blå erillinen joukkue; Blå-pelaajat kuuluvat vain Blå:hon). Yksiselitteinen kun: kohdejoukkueen ikäluokka = pelaajan ikä (viiteVuosi − syntymaVuosi)
   TAI kohteen ikä ei tiedossa mutta vanhan tunnisteen ikä ≠ pelaajan ikä; useampi vanha tunniste tai ristiriitainen ikä → epäselvä (ehdotus silti = vain nimen joukkue; vahvistetaan erikseen). */
function tmJasenyysDiagnoosi(p, joukkueDocs, viiteVuosi) {
  var docs = Array.isArray(joukkueDocs) ? joukkueDocs : [], nimi = (p && (p.joukkue != null ? p.joukkue : p.joukkueNimi)); nimi = nimi == null ? '' : String(nimi).trim();
  var raaka = p && Array.isArray(p.joukkueet) ? p.joukkueet.filter(function (x) { return x != null && x !== ''; }) : [];
  var kanon = nimi ? tmKanonisoiJoukkue(nimi, docs) : null, voimassa = tmPelaajanJoukkueet(p, docs);
  var tuntemattomia = raaka.filter(function (x) { var k = null; for (var i = 0; i < docs.length; i++) if (docs[i] && String(docs[i].id) === String(x)) { k = docs[i]; break; } return !k && !tmKanonisoiJoukkue(x, docs); });
  function ehd(d) { return { joukkueet: [d.id], joukkue: d.nimi, joukkueNimi: d.nimi, joukkueetNimet: [d.nimi] }; }
  function docIdlla(id) { for (var i = 0; i < docs.length; i++) if (docs[i] && String(docs[i].id) === String(id)) return docs[i]; return null; }
  if (!nimi && !raaka.length) return { tyyppi: 'tyhja', ehdotus: null, yksiselitteinen: null };
  if (!nimi) { var d0 = voimassa.length ? docIdlla(voimassa[0]) : null; return d0 ? { tyyppi: 'nimi_puuttuu', ehdotus: { joukkueet: voimassa.slice(), joukkue: d0.nimi, joukkueNimi: d0.nimi, joukkueetNimet: voimassa.map(function (id) { var d = docIdlla(id); return d ? d.nimi : id; }) }, yksiselitteinen: true } : { tyyppi: 'kuollut_id', ehdotus: null, yksiselitteinen: null }; }
  if (!kanon) return voimassa.length ? { tyyppi: 'nimi_tuntematon', ehdotus: (function () { var d = docIdlla(voimassa[0]); return d ? { joukkueet: voimassa.slice(), joukkue: d.nimi, joukkueNimi: d.nimi, joukkueetNimet: voimassa.map(function (id) { var x = docIdlla(id); return x ? x.nimi : id; }) } : null; })(), yksiselitteinen: true } : { tyyppi: 'orpo', ehdotus: null, yksiselitteinen: null };
  if (!raaka.length) return { tyyppi: 'id_puuttuu', ehdotus: ehd(kanon), yksiselitteinen: true };
  var tarkkojaIdita = raaka.filter(function (x) { return !!docIdlla(x); }).length, nimiaIdnPaikalla = raaka.length > tarkkojaIdita && raaka.some(function (x) { return !docIdlla(x) && !!tmKanonisoiJoukkue(x, docs); });
  if (voimassa.indexOf(kanon.id) >= 0) {
    var norm = { joukkueet: voimassa.slice(), joukkue: kanon.nimi, joukkueNimi: kanon.nimi, joukkueetNimet: voimassa.map(function (id) { var d = docIdlla(id); return d ? d.nimi : id; }) };
    if (nimiaIdnPaikalla) return { tyyppi: 'nimi_idn_paikalla', ehdotus: norm, yksiselitteinen: true };   // joukkueet[] sisältää NIMEN (legacy) → tunniste
    if (tuntemattomia.length) return { tyyppi: 'kuollut_id', ehdotus: norm, yksiselitteinen: true };
    return { tyyppi: 'ehja', ehdotus: null, yksiselitteinen: null };
  }
  // vanha_id: nimi → A, tunnisteet (voimassa) eivät sisällä A:ta
  var vuosi = viiteVuosi || new Date().getFullYear(), pika = (p && p.syntymaVuosi != null) ? vuosi - Number(p.syntymaVuosi) : null;
  var tIka = _jasIkaDoc(docIdlla(kanon.id), vuosi), yksi = false;
  if (voimassa.length === 1 && pika != null && !isNaN(pika)) {
    var sIka = _jasIkaDoc(docIdlla(voimassa[0]), vuosi);
    yksi = (tIka != null && tIka === pika) || (tIka == null && sIka != null && sIka !== pika);
  }
  return { tyyppi: 'vanha_id', ehdotus: ehd(kanon), yksiselitteinen: yksi };
}

/* Seurakohtainen raportti diagnooseista: lukumäärät tyypeittäin + epäselvät yhdistelminä (vain joukkuetunnisteet ja lukumäärät — EI nimiä, EI pelaajatunnisteita). */
function tmJasenyysRaportti(pelaajat, joukkueDocs, viiteVuosi) {
  var r = { pelaajia: 0, tyypit: {}, yksiselitteisia: 0, epaselvat: [], korjattavat: [] }, epa = {};
  (pelaajat || []).forEach(function (p) {
    r.pelaajia++;
    var d = tmJasenyysDiagnoosi(p, joukkueDocs, viiteVuosi); r.tyypit[d.tyyppi] = (r.tyypit[d.tyyppi] || 0) + 1;
    if (!d.ehdotus) return;
    if (d.yksiselitteinen) { r.yksiselitteisia++; r.korjattavat.push({ pelaaja: p, ehdotus: d.ehdotus, tyyppi: d.tyyppi }); }
    else {
      var nyt = tmPelaajanJoukkueet(p, joukkueDocs).slice().sort().join('+') || '(ei)', avain = d.tyyppi + ' | nyt ' + nyt + ' → ' + d.ehdotus.joukkueet.join('+');
      epa[avain] = epa[avain] || { tyyppi: d.tyyppi, nyt: tmPelaajanJoukkueet(p, joukkueDocs), ehdotus: d.ehdotus.joukkueet, lkm: 0, pelaajat: [] }; epa[avain].lkm++; epa[avain].pelaajat.push({ pelaaja: p, ehdotus: d.ehdotus });
    }
  });
  r.epaselvat = Object.keys(epa).map(function (k) { return epa[k]; });
  return r;
}

if (typeof window !== 'undefined') {
  window.tmPelaajanJoukkueet = tmPelaajanJoukkueet;
  window.tmJasenyysPaivitys = tmJasenyysPaivitys;
  window.tmJasenyysDiagnoosi = tmJasenyysDiagnoosi;
  window.tmJasenyysRaportti = tmJasenyysRaportti;
  window.tmJoukkueJasenyys = tmJoukkueJasenyys;
  window.tmJoukkueJasenyysIdlla = tmJoukkueJasenyysIdlla;
  window.tmHenkiloJoukkueNimet = tmHenkiloJoukkueNimet;
  window.tmHenkiloJoukkueTeksti = tmHenkiloJoukkueTeksti;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tmNormJoukkueAvain: tmNormJoukkueAvain,
    tmKanonisoiJoukkue: tmKanonisoiJoukkue,
    tmPuhdistaJoukkueetIdt: tmPuhdistaJoukkueetIdt,
    lajitteleJoukkueetIkaluokittain: lajitteleJoukkueetIkaluokittain,
    tmPelaajanJoukkueet: tmPelaajanJoukkueet,
    tmJasenyysPaivitys: tmJasenyysPaivitys,
    tmJasenyysDiagnoosi: tmJasenyysDiagnoosi,
    tmJasenyysRaportti: tmJasenyysRaportti,
    tmJoukkueJasenyys: tmJoukkueJasenyys,
    tmJoukkueJasenyysIdlla: tmJoukkueJasenyysIdlla,
    tmHenkiloJoukkueNimet: tmHenkiloJoukkueNimet,
    tmHenkiloJoukkueTeksti: tmHenkiloJoukkueTeksti
  };
}
