/* ════════════════════════════════════════════════════════════════════════
   tm_viikon_osa.js — K1b (kohta 4, Teron päätös 20.10.): VIIKON OSA ("Tämän viikon fokus") YHDESSÄ PAIKASSA. PURE. Dual-export: module.exports || window.TM_VIIKON_OSA.
   Aiemmin viikon osa oli pelkkä laskentasääntö (ensimmäinen osa a–e-järjestyksessä, jonka tila ei ole "itsenäisesti"). Nyt valmentaja/VP voi valita sen napauttamalla ydinasiaa → "Tämän viikon fokus".
   Tallennus: pelaajan `jaksofokus.viikon_osa = { koodi, pvm }` (pvm = valinnan päivä YYYY-MM-DD). Ei Rules-muutosta (jaksofokus-alikenttiä ei rajata, v3.56/v3.64). Uusi jakso korvaa koko jaksofokus-objektin → valinta nollautuu itsestään.
   Voimassa kun (1) koodi on jakson osa ja (2) valinnan pvm on SAMASSA ISO-viikossa kuin tänään (TM_VIIKKO, ei omaa viikkolaskentaa) → viikon vaihtuessa palataan laskentasääntöön. Muuten laskentasääntö.
   · tmViikonOsaKoodi(jf, tanaanIso)          → voimassa oleva valittu koodi | null
   · tmViikonOsa(osat, valittuKoodi)          → osa | null — osat [{k, koodi, tila}] · valittu (jos löytyy) voittaa, muuten ensimmäinen ei-itsenäisesti
   · tmViikonOsaPelaajalle(jf, raaka, tanaanIso) → osan kirjain ('a'…) | null — pelaajasovellus: raaka = tmTanaanOsat(jf, {max:26}); tilat jaksofokus.osa_arviot:ista; SAMA tmViikonOsa
   · tmViikonOsaKirjoitus(koodi, tanaanIso)   → { 'jaksofokus.viikon_osa': { koodi, pvm } } | null (kelvoton koodi/päivä)
   Vain koodilliset osat voi valita (koodi = konseptin KPI-koodi); ydinasia ilman koodia käyttää laskentasääntöä.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var OSA_TILAT = { 1: 'ei_viela', 2: 'ohjatusti', 3: 'itsenaisesti' }, KOODI_RE = /^[A-Za-z0-9_-]{1,40}$/, PVM_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  function _viikko() { try { return (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_viikko.js') : (root && root.TM_VIIKKO); } catch (e) { return root && root.TM_VIIKKO; } }
  function _tunniste(iso) { var m = PVM_RE.exec(String(iso == null ? '' : iso)), V = _viikko(); return m && V ? V.tmIsoViikkoYMD(+m[1], +m[2], +m[3]).tunniste : null; }
  function tmViikonOsaKoodi(jf, tanaanIso) {
    var v = jf && jf.viikon_osa; if (!v || typeof v !== 'object' || typeof v.koodi !== 'string' || !KOODI_RE.test(v.koodi)) return null;
    var a = _tunniste(v.pvm), b = _tunniste(tanaanIso); return a && b && a === b ? v.koodi : null;
  }
  function tmViikonOsa(osat, valittuKoodi) {
    var l = Array.isArray(osat) ? osat : [], i;
    if (valittuKoodi) for (i = 0; i < l.length; i++) if (l[i] && l[i].koodi === valittuKoodi) return l[i];
    for (i = 0; i < l.length; i++) if (l[i] && l[i].tila !== 'itsenaisesti') return l[i];
    return null;
  }
  function tmViikonOsaPelaajalle(jf, raaka, tanaanIso) {
    var oa = (jf && jf.osa_arviot && jf.konsepti_avain && jf.osa_arviot[jf.konsepti_avain]) || {};
    var osat = (Array.isArray(raaka) ? raaka : []).map(function (o) { return { k: o.k, koodi: o.koodi || '·', tila: OSA_TILAT[oa[o.koodi]] || null }; });
    var o = tmViikonOsa(osat, tmViikonOsaKoodi(jf, tanaanIso)); return o ? o.k : null;
  }
  function tmViikonOsaKirjoitus(koodi, tanaanIso) {
    if (typeof koodi !== 'string' || !KOODI_RE.test(koodi) || !PVM_RE.test(String(tanaanIso))) return null;
    return { 'jaksofokus.viikon_osa': { koodi: koodi, pvm: String(tanaanIso) } };
  }
  var API = { OSA_TILAT: OSA_TILAT, tmViikonOsaKoodi: tmViikonOsaKoodi, tmViikonOsa: tmViikonOsa, tmViikonOsaPelaajalle: tmViikonOsaPelaajalle, tmViikonOsaKirjoitus: tmViikonOsaKirjoitus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_VIIKON_OSA = API;
})(typeof window !== 'undefined' ? window : this);
