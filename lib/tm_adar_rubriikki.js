/*
 * tm_adar_rubriikki.js — Kanoninen pelihavainto-/ADAR-tasokuvaus (peliäly, D4).
 *
 * YKSI LÄHDE peliälyn tasoteksteille. Pelihavainto-työkalu (TalentMaster_ADAR_Pikakortti.html)
 * määrittelee saman ADAR-rubriikin arviointipuolelta (valmentaja):
 *   Taso 1 · Havainnoija      (U8–U12)  — arvioidaan vain Assess
 *   Taso 2 · Arvioija         (U13–U15) — Assess + Decide + Act
 *   Taso 3 · Täysi havainto   (U16–U19) — täysi ADAR + Reassess
 * ADAR-ulottuvuudet: Assess = havainnointi · Decide = päätöksenteko · Act = toteutus · Reassess = uudelleenarviointi.
 *
 * Tämä rakenne surfaceaa SAMAN rubriikin PELAAJALLE lapsen kielellä (§7.22: oma taso + oma seuraava
 * askel, kriteeripohjainen — EI vertailua muihin, ei percentiiliä). Käytetään Pelaaja_v7 kortin
 * kääntöpuolella (naytaFcOverlay). Bundlattu Pikakortti pitää oman arviointi-copynsa inline (offline-
 * bundleri, eri tarkoitus); tämä lib = pelaajanäkymän kanoninen lähde → EI kahdennettua pelaaja-copya.
 *
 * Kehitysportaat (1–5) on johdettu ADAR-ulottuvuuksien luonnollisesta etenemisestä
 * (havainnoi → päätä → toteuta → arvioi uudelleen → täysi pelinäkemys). Kortin ÄLY-taso (1–5)
 * lasketaan adar-pisteistä; tämä antaa jokaiselle tasolle kehityssuuntautuneen kuvauksen + seuraavan askeleen.
 */
(function (root) {
  'use strict';

  var TASOT = {
    1: {
      nimi: 'Havainnointi',
      nyt: 'Alat havainnoida peliä 👀',
      askel: 'Käännä päätä ja katso ympärille ennen kuin saat pallon.'
    },
    2: {
      nimi: 'Päätöksenteko',
      nyt: 'Luet tilanteita ja teet valintoja 🧭',
      askel: 'Päätä jo ennen kosketusta, minne pallo menee.'
    },
    3: {
      nimi: 'Toteutus',
      nyt: 'Toteutat ratkaisusi pelissä ⚙️',
      askel: 'Tee oikea ratkaisu myös paineessa ja nopeasti.'
    },
    4: {
      nimi: 'Uudelleenarviointi',
      nyt: 'Ennakoit ja korjaat jatkuvasti 🔄',
      askel: 'Lue peliä koko ajan — säädä paikkaasi ennen kuin palloa tarvitaan.'
    },
    5: {
      nimi: 'Täysi pelinäkemys',
      nyt: 'Näet pelin askeleen edellä 🌟',
      askel: 'Huipputasolla — pidä yllä ja monipuolista rooleissa.'
    }
  };

  // Palauttaa {taso, nimi, nyt, askel} annetulle ÄLY-tasolle (1–5). `nyt` = tason kuvaus lapsen kielellä,
  // `askel` = tason oma kannustava seuraava askel (taso 5:llä ylläpito-vinkki). null jos taso puuttuu →
  // kutsuja käyttää geneeristä fallbackia (§21).
  function alyTaso(taso) {
    var t = Math.round(Number(taso));
    if (!(t >= 1)) return null;
    if (t > 5) t = 5;
    var cur = TASOT[t];
    if (!cur) return null;
    return { taso: t, nimi: cur.nimi, nyt: cur.nyt, askel: cur.askel };
  }

  var API = { TASOT: TASOT, alyTaso: alyTaso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.TM_ADAR_RUBRIIKKI = API;
})(typeof window !== 'undefined' ? window : this);
