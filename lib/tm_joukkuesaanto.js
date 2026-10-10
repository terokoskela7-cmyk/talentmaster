/* ════════════════════════════════════════════════════════════════════════
   tm_joukkuesaanto.js — YKSI joukkuesääntö "X kehityskohteena" (docs/TEKNIIKKA_MAARITELMA.md §2.3, docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md §3).
   Jaettu: lib/tm_tekniikka.js ja lib/tm_fyysinen.js kutsuvat tätä — sääntö on yhdessä paikassa.

   tmJoukkueSaanto({ yht, mitattu, kehityskohteita }) →
     kattava      = mitattu ≥ 5  TAI  2·mitattu ≥ yht                                                    — riittävä kattavuus
     kehityskohde = kattava JA kehityskohteita > 0 JA 3·kehityskohteita ≥ mitattu                         — kokonaisluvuilla, yhtäsuuruus riittää (5/15 riittää)
     luokka       = 'kehityskohde' | 'ok' (kattava) | 'ei_luokkaa' (muuten; "ei tekniikka-/fyysistä dataa · N joukkuetta" VP:lle)
     eiMitattua   = mitattu === 0
     otosPieni    = luokiteltu (luokka ≠ 'ei_luokkaa'), mutta mitattuja < 8
   `yht` = KAIKKI joukkueen pelaajat (myös neutraalit, vajaat, ilman dataa); `mitattu` = pelaajat, joiden mittaus on kelvollinen ja ei neutraloitu.
   Dual-export: module.exports + window.TM_JOUKKUESAANTO + window.tmJoukkueSaanto.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  /* Rajat (≥ 5 mitattua, 1/3, puolet, otos pieni < 8) EIVÄT ole täällä: ne tulevat lib/tm_normisto.js:stä (normisto + seuran linja). Ilman asetuksia TalentMasterin oletus (Suomi). */
  var _varoitettu = false;   // EI hiljaista oletusta: TM_NORMISTO puuttuu selaimesta → console.warn (+ Sentry) kerran; tila "ei dataa"
  function _varoitaNormisto(lib) {
    if (_varoitettu) return; _varoitettu = true;
    var v = lib + ': TM_NORMISTO puuttuu (lib/tm_normisto.js pitää ladata ennen tätä) — laskenta antaa tilan "ei dataa", ei oletusta';
    try { if (typeof console !== 'undefined' && console.warn) console.warn(v); if (root && root.Sentry && typeof root.Sentry.captureMessage === 'function') root.Sentry.captureMessage(v, 'warning'); } catch (e) { /* ei kaadu */ }
  }
  function _no() {
    var NO = null; try { var L = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_normisto.js') : (root || {}); NO = L.tmNormistoRajat ? L : (L.TM_NORMISTO || null); } catch (e) { NO = null; }
    if (!NO) _varoitaNormisto('tm_joukkuesaanto'); return NO;
  }
  function _n(x) { x = Number(x); return isFinite(x) && x > 0 ? Math.floor(x) : 0; }
  function tmJoukkueSaanto(o, asetukset) {
    o = o || {}; var yht = _n(o.yht), m = _n(o.mitattu), k = _n(o.kehityskohteita), NO = _no(), R = NO ? NO.tmNormistoRajat(asetukset) : null;
    if (!R) return { kehityskohde: false, luokka: 'ei_luokkaa', eiMitattua: m === 0, otosPieni: false };   // tuntematon normisto / ei normistolibiä → ei luokkaa (ei virhettä)
    var kattava = m >= R.MIN_MITATTU || 2 * m >= yht;   // riittävä kattavuus: ≥ MIN_MITATTU mitattua TAI vähintään puolet joukkueesta mitattu
    var kd = kattava && m > 0 && k > 0 && R.OSUUS_MITATUSTA * k >= m;
    var luokka = kd ? 'kehityskohde' : (kattava && m > 0 ? 'ok' : 'ei_luokkaa');
    return { kehityskohde: kd, luokka: luokka, eiMitattua: m === 0, otosPieni: luokka !== 'ei_luokkaa' && m < R.OTOS_PIENI };
  }
  var API = { tmJoukkueSaanto: tmJoukkueSaanto };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TM_JOUKKUESAANTO = API; root.tmJoukkueSaanto = tmJoukkueSaanto; }
})(typeof window !== 'undefined' ? window : null);
