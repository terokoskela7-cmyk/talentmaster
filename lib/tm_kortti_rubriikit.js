/*
 * tm_kortti_rubriikit.js — Kortin kääntöpuolen kehitystekstit FYS (D1) + PSY (D3).
 *
 * YKSI LÄHDE fyysisten ja mielen taitojen tasokuvauksille pelaajan FIFA-kortin kääntöpuolella
 * (Pelaaja_v7 naytaFcOverlay `bar()`). Jatkoa `tm_adar_rubriikki.js`:lle (ÄLY/peliäly) ja TEK-riville:
 * sama kuvio — "Nyt" (tason kuvaus lapsen kielellä) + "Seuraava askel" (kannustava, kriteeripohjainen).
 *
 * §7.22: lapsen kieli, oma taso + oma seuraava askel, EI vertailua muihin, ei percentiiliä, ei uhkakieltä,
 * prosessikehu (Dweck). Tasonumeroa EI tekstiin — kortti näyttää numeron erikseen toissijaisena elementtinä.
 *
 * §28: pre-PHV fyysinen (🌱-grow) EI kutsu fysTaso:a — pysyy neutraalina (raaka pre-PHV-fyysinen ei ole
 * kehityskohde vaan biologisesti odotettua). Kutsuja (kortti) ohittaa grow/tulossa-tilat ennen fysTaso-kutsua.
 */
(function (root) {
  'use strict';

  // ── FYS (D1, fyysiset taidot) — kannustava jokaisella tasolla, ei "olet hidas" (§28-turvallinen) ──
  var FYS_TASOT = {
    1: { nimi: 'Perusta',     nyt: 'Rakennat liikkumisen perustaa 🌱', askel: 'Leiki, juokse ja hyppää paljon — keho vahvistuu.' },
    2: { nimi: 'Vahvistuva',  nyt: 'Liikut yhä ketterämmin 🏃',        askel: 'Harjoittele nopeita lähtöjä ja suunnanmuutoksia.' },
    3: { nimi: 'Ketterä',     nyt: 'Olet nopea ja tasapainoinen ⚡',   askel: 'Yhdistä nopeus ja pallo — kiihdytä hallitusti.' },
    4: { nimi: 'Räjähtävä',   nyt: 'Kiihdytät ja hyppäät voimalla 💥', askel: 'Muista palautuminen — voima kasvaa levolla.' },
    5: { nimi: 'Huippukunto', nyt: 'Liikut huipputasolla 🌟',          askel: 'Pidä yllä ja monipuolista liikkumista.' }
  };

  // ── PSY (D3, mielen taidot) — sisu/keskittyminen/rauhallisuus, prosessikehu ──
  var PSY_TASOT = {
    1: { nimi: 'Alku',         nyt: 'Harjoittelet keskittymistä ja sinnikkyyttä 🌱', askel: 'Yritä jatkaa vielä hetki, vaikka tuntuisi vaikealta.' },
    2: { nimi: 'Kasvava sisu', nyt: 'Jaksat yrittää uudelleen 💪',                   askel: 'Kuuntele yksi vinkki ja kokeile sitä heti.' },
    3: { nimi: 'Keskittyjä',   nyt: 'Pysyt mukana ja rauhoitut 🎯',                  askel: 'Pidä pää pelissä koko treenin — myös lopussa.' },
    4: { nimi: 'Sinnikäs',     nyt: 'Palaudut pettymyksistä nopeasti 🔄',            askel: 'Kun ärsyttää, hengitä ja jatka — virhe ei jää päähän.' },
    5: { nimi: 'Vahva mieli',  nyt: 'Johdat itseäsi ja pysyt rauhallisena 🌟',       askel: 'Näytä esimerkkiä muille — pidä yllä.' }
  };

  // PSY-osa-alueiden (D3, _MINA_D3_KYS) lapsen kielen näyttönimet ⭐vahvuudelle. Järjestys = tasapelin ratkaisu.
  var PSY_VAHVUUS_NIMET = [
    { key: 'inner_drive',       nimi: 'Oma into' },
    { key: 'coachability',      nimi: 'Ohjeiden kuuntelu' },
    { key: 'resilience',        nimi: 'Sinnikkyys' },
    { key: 'focus',             nimi: 'Keskittyminen' },
    { key: 'emotional_control', nimi: 'Rauhallisuus' }
  ];

  // Yhteinen guard (kuten alyTaso): pyöristä, hylkää <1, cappaa 5:een. null → kutsuja käyttää geneeristä fallbackia.
  function _normTaso(taso) {
    var t = Math.round(Number(taso));
    if (!(t >= 1)) return null;
    if (t > 5) t = 5;
    return t;
  }

  // Palauttaa {taso, nimi, nyt, askel} annetulle FYS-tasolle (1–5), tai null jos taso puuttuu.
  function fysTaso(taso) {
    var t = _normTaso(taso);
    if (t == null) return null;
    var cur = FYS_TASOT[t];
    if (!cur) return null;
    return { taso: t, nimi: cur.nimi, nyt: cur.nyt, askel: cur.askel };
  }

  // Poimii korkeimman D3-osa-alueen `pisteet`-oliosta → {avain, arvo} tai null. pisteet[key] voi olla
  // olio {avg|pelaaja|valmentaja} tai raakaluku. Tasapeli → ensimmäinen PSY_VAHVUUS_NIMET-järjestyksessä.
  function _poimiVahvuus(pisteet) {
    if (!pisteet || typeof pisteet !== 'object') return null;
    var paras = null;
    for (var i = 0; i < PSY_VAHVUUS_NIMET.length; i++) {
      var key = PSY_VAHVUUS_NIMET[i].key;
      var pt = pisteet[key];
      var arvo = null;
      if (typeof pt === 'number') arvo = pt;
      else if (pt && typeof pt === 'object') arvo = (pt.avg != null ? pt.avg : (pt.pelaaja != null ? pt.pelaaja : (pt.valmentaja != null ? pt.valmentaja : null)));
      if (arvo == null || isNaN(Number(arvo))) continue;
      // strict > → tasapelissä säilyy ensimmäinen (järjestysprioriteetti)
      if (paras == null || Number(arvo) > paras.arvo) paras = { nimi: PSY_VAHVUUS_NIMET[i].nimi, arvo: Number(arvo) };
    }
    return paras;
  }

  // Palauttaa {taso, nimi, nyt, askel [, vahvuus]} annetulle PSY-tasolle (1–5), tai null jos taso puuttuu.
  // `pisteet` valinnainen (= p.d3_viimeisin.pisteet): jos annettu ja korkein osa-alue löytyy → `vahvuus`-kenttä
  // (lapsen kielen näyttönimi, kuten TEK ⭐vahvuus). Puuttuva/tyhjä pisteet → vahvuus jätetään pois (ei pakoteta).
  function psyTaso(taso, pisteet) {
    var t = _normTaso(taso);
    if (t == null) return null;
    var cur = PSY_TASOT[t];
    if (!cur) return null;
    var r = { taso: t, nimi: cur.nimi, nyt: cur.nyt, askel: cur.askel };
    var v = _poimiVahvuus(pisteet);
    if (v) r.vahvuus = v.nimi;
    return r;
  }

  var API = { FYS_TASOT: FYS_TASOT, PSY_TASOT: PSY_TASOT, fysTaso: fysTaso, psyTaso: psyTaso };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.TM_KORTTI_RUBRIIKIT = API;
})(typeof window !== 'undefined' ? window : this);
