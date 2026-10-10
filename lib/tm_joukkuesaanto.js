/* ════════════════════════════════════════════════════════════════════════
   tm_joukkuesaanto.js — YKSI joukkuesääntö "X kehityskohteena" (docs/TEKNIIKKA_MAARITELMA.md §2.3, docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md §3).
   Jaettu: lib/tm_tekniikka.js ja lib/tm_fyysinen.js kutsuvat tätä — sääntö on yhdessä paikassa.

   tmJoukkueSaanto({ yht, mitattu, kehityskohteita }) →
     kehityskohde = (mitattu ≥ 5 JA 3·kehityskohteita ≥ mitattu)  TAI  (2·kehityskohteita ≥ yht)         — kokonaisluvuilla, yhtäsuuruus riittää (5/15 riittää)
     luokka       = 'kehityskohde' | 'ok' (mitattu ≥ 5) | 'ei_luokkaa' (muuten; "ei tekniikka-/fyysistä dataa · N joukkuetta" VP:lle)
     eiMitattua   = mitattu === 0
     otosPieni    = luokiteltu (luokka ≠ 'ei_luokkaa'), mutta mitattuja < 8
   `yht` = KAIKKI joukkueen pelaajat (myös neutraalit, vajaat, ilman dataa); `mitattu` = pelaajat, joiden mittaus on kelvollinen ja ei neutraloitu.
   Dual-export: module.exports + window.TM_JOUKKUESAANTO + window.tmJoukkueSaanto.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var RAJAT = { MIN_MITATTU: 5, OTOS_PIENI: 8 };
  function _n(x) { x = Number(x); return isFinite(x) && x > 0 ? Math.floor(x) : 0; }
  function tmJoukkueSaanto(o) {
    o = o || {}; var yht = _n(o.yht), m = _n(o.mitattu), k = _n(o.kehityskohteita);
    var kd = (m >= RAJAT.MIN_MITATTU && k > 0 && 3 * k >= m) || (yht > 0 && k > 0 && 2 * k >= yht);
    var luokka = kd ? 'kehityskohde' : (m >= RAJAT.MIN_MITATTU ? 'ok' : 'ei_luokkaa');
    return { kehityskohde: kd, luokka: luokka, eiMitattua: m === 0, otosPieni: luokka !== 'ei_luokkaa' && m < RAJAT.OTOS_PIENI };
  }
  var API = { RAJAT: RAJAT, tmJoukkueSaanto: tmJoukkueSaanto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TM_JOUKKUESAANTO = API; root.tmJoukkueSaanto = tmJoukkueSaanto; }
})(typeof window !== 'undefined' ? window : null);
