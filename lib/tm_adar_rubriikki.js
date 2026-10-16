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
 * Kortin ÄLY-taso (1–5) lasketaan yht-keskiarvosta (tmAdarTaso5, lib/tm_pelialy_yksilo.js) ja kuvaa KOKONAISUUTTA — tasojen nimet eivät nimeä ulottuvuuksia
 * (U8–12:lla yht on vain havainnoinnista, joten taso ei saa väittää mitään mittaamatonta). Seuraava askel tulee HEIKOIMMASTA MITATUSTA ulottuvuudesta (ASKEL).
 */
(function (root) {
  'use strict';

  // Tasot 1–5: yleiset nimet + kuvaukset (lapsen kieli), EI ulottuvuuskohtaisia — taso kuvaa kokonaisuutta.
  var TASOT = {
    1: { nimi: 'Alussa',      nyt: 'Opettelet katsomaan, mitä pelissä tapahtuu 👀' },
    2: { nimi: 'Kehittyvä',   nyt: 'Huomaat pelissä koko ajan enemmän 🧭' },
    3: { nimi: 'Vakaa',       nyt: 'Luet pelitilanteita ja teet hyviä valintoja ⚙️' },
    4: { nimi: 'Vahva',       nyt: 'Teet hyviä ratkaisuja myös kovassa vauhdissa 🔄' },
    5: { nimi: 'Erinomainen', nyt: 'Näet pelin askeleen edellä 🌟' }
  };
  // Seuraava askel per ulottuvuus (konsensus-avain: a = Assess, d = Decide, ac = Act, r = Reassess = virheestä palautuminen; kuvataan suuruusluokkana, ei kellotettuna).
  var ASKEL = {
    a: 'Käännä päätä ja katso ympärille ennen kuin saat pallon.',
    d: 'Päätä jo ennen kosketusta, minne pallo menee.',
    ac: 'Tee oikea ratkaisu myös paineessa ja nopeasti.',
    r: 'Virhe ei jää päähän — palaa peliin heti ja tee seuraava ratkaisu.'
  };
  var YLLAPITO = 'Huipputasolla — pidä yllä ja monipuolista rooleissa.';

  // Palauttaa {taso, nimi, nyt, askel} annetulle ÄLY-tasolle (1–5). `heikoin` = heikoin MITATTU ulottuvuus (a|d|ac|r, p.adar_heikoin; ikäportaan ulottuvuuksista →
  // U8–12:lla aina a); puuttuva/tuntematon → havainnoinnin askel (ainoa ulottuvuus, joka on mitattu kaikilla portailla). `heikoinPisteet` (valinnainen, 1–3) = heikoimman
  // ulottuvuuden pisteet: taso 5:llä ylläpitoteksti vain kun heikoinkin on 3 (puuttuva arvo = ylläpito). null jos taso puuttuu → kutsuja käyttää geneeristä fallbackia (§21).
  function alyTaso(taso, heikoin, heikoinPisteet) {
    var t = Math.round(Number(taso));
    if (!(t >= 1)) return null;
    if (t > 5) t = 5;
    var cur = TASOT[t];
    if (!cur) return null;
    var askel = (t === 5 && !(Number(heikoinPisteet) < 3)) ? YLLAPITO : (ASKEL[heikoin] || ASKEL.a);
    return { taso: t, nimi: cur.nimi, nyt: cur.nyt, askel: askel };
  }

  var API = { TASOT: TASOT, ASKEL: ASKEL, YLLAPITO: YLLAPITO, alyTaso: alyTaso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.TM_ADAR_RUBRIIKKI = API;
})(typeof window !== 'undefined' ? window : this);
