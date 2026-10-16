/*
 * tm_adar_rubriikki.js — Kanoninen pelihavainto-/ADAR-tasokuvaus (peliäly, D4).
 *
 * YKSI LÄHDE peliälyn tasoteksteille. Pelihavainto-työkalu (TalentMaster_ADAR_Pikakortti.html)
 * määrittelee saman ADAR-rubriikin arviointipuolelta (valmentaja). Portaat (TM_ADAR_PORTAAT, lib/tm_pelialy_yksilo.js):
 *   Porras 1 · Havainnoija      (oletus U8–12)  — arvioidaan vain Assess
 *   Porras 2 · Päätöksentekijä  — Assess + Decide
 *   Porras 3 · Toteuttaja (oletus U13–15) — Assess + Decide + Act
 *   Porras 4 · Täysi havainto   (oletus U16+) — täysi ADAR + Reassess
 * PERIAATE: peliäly etenee osaamistavoitteen mukaan, ikä ei lukitse. Ikä antaa vain oletusportaan (tmAdarIkaPorras); valmentaja nostaa portaan (p.havainto_porras).
 * ADAR-ulottuvuudet: Assess = havainnointi · Decide = päätöksenteko · Act = toteutus · Reassess = uudelleenarviointi.
 *
 * Tämä rakenne surfaceaa SAMAN rubriikin PELAAJALLE lapsen kielellä (§7.22: oma taso + oma seuraava
 * askel, kriteeripohjainen — EI vertailua muihin, ei percentiiliä). Käytetään Pelaaja_v7 kortin
 * kääntöpuolella (naytaFcOverlay). Bundlattu Pikakortti pitää oman arviointi-copynsa inline (offline-
 * bundleri, eri tarkoitus); tämä lib = pelaajanäkymän kanoninen lähde → EI kahdennettua pelaaja-copya.
 *
 * Kortin ÄLY-taso (1–5) lasketaan yht-keskiarvosta (tmAdarTaso5, lib/tm_pelialy_yksilo.js) ja kuvaa KOKONAISUUTTA — tasojen nimet eivät nimeä ulottuvuuksia
 * (porras 1:llä yht on vain havainnoinnista, joten taso ei saa väittää mitään mittaamatonta). Seuraava askel: ks. alyTaso (osaamistavoite → heikoin mitattu → seuraava taito → ylläpito).
 */
(function (root) {
  'use strict';

  // Tasot 1–5: yleiset nimet + kuvaukset (lapsen kieli), EI ulottuvuuskohtaisia — taso kuvaa kokonaisuutta.
  var TASOT = {
    1: { nimi: 'Alussa',      nyt: 'Opettelet katsomaan, mitä pelissä tapahtuu 👀' },
    2: { nimi: 'Kehittyvä',   nyt: 'Huomaat pelissä koko ajan enemmän 🧭' },
    3: { nimi: 'Vakaa',       nyt: 'Luet peliä hyvin ⚙️' },
    4: { nimi: 'Vahva',       nyt: 'Luet peliä hyvin myös kovassa vauhdissa 🔄' },
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

  // Portaat + ikäoletus: sama lähde kuin lib/tm_pelialy_yksilo.js (ei kopiota). Node: require; selain: bare-globaalit (lib ladataan ennen kutsua).
  function _yks() { try { if (typeof module !== 'undefined' && module.exports && typeof require === 'function') return require('./tm_pelialy_yksilo.js'); } catch (e) { /* selain */ } return { TM_ADAR_PORTAAT: root.TM_ADAR_PORTAAT, tmAdarIkaPorras: root.tmAdarIkaPorras }; }
  function _porras(ctx) {
    var n = Number(ctx.porras);
    if (n >= 1 && n <= 4) return Math.floor(n);
    var y = _yks();
    var o = (typeof y.tmAdarIkaPorras === 'function') ? y.tmAdarIkaPorras(ctx.ika == null || ctx.ika === '' ? null : Number(ctx.ika)) : 4;
    return o >= 1 && o <= 4 ? o : 4;
  }

  // Palauttaa {taso, nimi, nyt, askel, askelTyyppi, askelDim} annetulle ÄLY-tasolle (1–5). Kortti ei väitä mitään, mitä pelaajan portaalla ei mitata.
  // ctx = { porras (p.havainto_porras; puuttuu → tmAdarIkaPorras(ika), ika tuntematon → 4), ika, heikoin (p.adar_heikoin: a|d|ac|r, vain portaan ulottuvuuksista),
  //         heikoinPisteet (heikoimman ulottuvuuden pisteet 1–3), ehdotus (p.havainto_porras_ehdotus {valmis, seuraava, hist}) }
  // Seuraava askel — ensimmäinen täyttyvä voittaa:
  //   a) ehdotus.valmis → ASKEL[ehdotus.seuraava]        'seuraava_taito'  (porras hallussa → siirry seuraavaan tavoitteeseen, vaikka vanha taito välillä 2)
  //   b) heikoinPisteet < 3 (tai pisteet puuttuvat ja taso < 5) → ASKEL[heikoin | a]  'harjoittele'
  //   c) porras < 4 (pisteet 3, tai tuntemattomat ja taso 5 = yht ≥ 2,75 → kuin 3) → portaan (porras+1) uusi ulottuvuus 'seuraava_taito'  (nykyinen porras hallussa, ehdotus vielä vailla 3 havaintoa)
  //   d) muuten (vain porras 4; ylläpito ei koskaan portaalla 1–3) → YLLAPITO  'yllapito'
  // heikoin puuttuu (b/c-valinnassa) → a (havainnointi mitataan kaikilla portailla). null jos taso puuttuu → kutsuja käyttää geneeristä fallbackia (§21).
  function alyTaso(taso, ctx) {
    var t = Math.round(Number(taso));
    if (!(t >= 1)) return null;
    if (t > 5) t = 5;
    var cur = TASOT[t];
    if (!cur) return null;
    ctx = ctx || {};
    var porras = _porras(ctx), portaat = _yks().TM_ADAR_PORTAAT || {}, eh = ctx.ehdotus, heik = ASKEL[ctx.heikoin] ? ctx.heikoin : 'a', dim, tyyppi,
      tiedossa = ctx.heikoinPisteet != null && !isNaN(Number(ctx.heikoinPisteet)), pist = Number(ctx.heikoinPisteet);
    if (eh && eh.valmis === true && ASKEL[eh.seuraava]) { dim = eh.seuraava; tyyppi = 'seuraava_taito'; }
    else if (!tiedossa ? t < 5 : pist < 3) { dim = heik; tyyppi = 'harjoittele'; }   // pisteet tiedossa → <3; EI tiedossa (vanha dokumentti ilman adar_heikoin) ja taso < 5 → sama (ASKEL.a)
    else if (porras < 4 && portaat[porras + 1]) {   // pisteet tiedossa (=3) TAI tuntemattomat + taso 5 (yht ≥ 2,75 → käsitellään kuin 3)
      var pp = portaat[porras + 1]; dim = pp[pp.length - 1]; tyyppi = 'seuraava_taito'; }
    else { dim = null; tyyppi = 'yllapito'; }
    return { taso: t, nimi: cur.nimi, nyt: cur.nyt, askel: dim ? ASKEL[dim] : YLLAPITO, askelTyyppi: tyyppi, askelDim: dim };
  }

  var API = { TASOT: TASOT, ASKEL: ASKEL, YLLAPITO: YLLAPITO, alyTaso: alyTaso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.TM_ADAR_RUBRIIKKI = API;
})(typeof window !== 'undefined' ? window : this);
