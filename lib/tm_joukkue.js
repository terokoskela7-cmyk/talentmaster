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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    tmNormJoukkueAvain: tmNormJoukkueAvain,
    tmKanonisoiJoukkue: tmKanonisoiJoukkue,
    tmPuhdistaJoukkueetIdt: tmPuhdistaJoukkueetIdt
  };
}
