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

if (typeof window !== 'undefined') {
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
    tmJoukkueJasenyys: tmJoukkueJasenyys,
    tmJoukkueJasenyysIdlla: tmJoukkueJasenyysIdlla,
    tmHenkiloJoukkueNimet: tmHenkiloJoukkueNimet,
    tmHenkiloJoukkueTeksti: tmHenkiloJoukkueTeksti
  };
}
