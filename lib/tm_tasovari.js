/* ════════════════════════════════════════════════════════════════════════
   tm_tasovari.js — YKSI tasoväri ja YKSI kattavuussääntö (CLAUDE.md §41 "Kolmen kerroksen malli"; vain HENKILÖKUNNAN näkymät, §7.22: ei pelaajalle eikä huoltajalle).
   Palauttaa LUOKAN, ei hex-arvoa: 'ok' | 'raja' | 'kehitys' | 'tuntematon'. Kynnykset tulevat lib/tm_normisto.js:stä (opts.asetukset; oletus Suomi), ei vakioina HTML:ssä.
   Värit = olemassa olevat tokenit: ok → --teal · raja → --amber · kehitys → --red · tuntematon → --ink3 (puuttuva, vanha tai päivätön tulos on NEUTRAALI, ei punainen eikä amber).

   tmTasoVari(arvo, { asteikko, tila, neutraali, asetukset }) → luokka
     asteikko 'hh5'        taso 1–5 (kokonaisluku tai ka): ok ≥ TASO_OK (3,5) · raja ≥ TASO_RAJA (2,5) · muuten kehitys
     asteikko 'eerikkila3' Eerikkilän tekniikkataso 1–3 (kansallinen kärkiotos): EI KOSKAAN 'kehitys'. ok ≥ TEK3_OK (2,5; taso 3 = positiivinen signaali) · muuten raja
     asteikko 'tki'        TKI 0–100: ok ≥ TKI_OK (60) · raja ≥ TKI (40, seuran linja) · muuten kehitys
     asteikko 'valmius'    kehon valmius (FLEI) 0–100: ok ≥ VALMIUS_OK (70) · raja ≥ VALMIUS_RAJA (50) · muuten kehitys
     tila 'vanha' | 'tuntematon' | 'paivaton' tai neutraali:true (§28 kypsyysvahti) → 'tuntematon'
   tmTasoSavy(luokka) → 'teal' | 'amber' | 'red' | 'neutraali' · tmTasoCss(arvo, opts) → 'var(--teal)' … (tokeni)
   tmKattavuus(mitattu, yhteensa, opts) → D125-portti: { n, yht, pct, riittava (≥ KATTAVUUS_PELAAJA_PROS), matala (< KATTAVUUS_MATALA_PROS), otosPieni (< OTOS_PIENI), minMitattu (≥ MIN_MITATTU), savy }
   Dual-export: module.exports + window.TM_TASOVARI (+ window.tmTasoVari/tmTasoCss/tmKattavuus).
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var OLETUS = { TASO_OK: 3.5, TASO_RAJA: 2.5, TEK3_OK: 2.5, TKI: 40, TKI_OK: 60, TKI_ERINOMAINEN: 80, VALMIUS_OK: 70, VALMIUS_RAJA: 50, MIN_MITATTU: 5, OTOS_PIENI: 8 };   // vain jos normistolibiä ei ole ladattu (varmistus; sivuilla normisto ladataan aina)
  var LUKITUT = { KATTAVUUS_PELAAJA_PROS: 70, KATTAVUUS_MATALA_PROS: 40 };
  var CSS = { ok: 'var(--teal)', raja: 'var(--amber)', kehitys: 'var(--red)', tuntematon: 'var(--ink3)' };
  var SAVY = { ok: 'teal', raja: 'amber', kehitys: 'red', tuntematon: 'neutraali' };

  function _NO() { try { var L = (typeof module !== 'undefined' && module.exports && typeof require === 'function') ? require('./tm_normisto.js') : (root || {}); return L.tmNormistoRajat ? L : (L.TM_NORMISTO || null); } catch (e) { return null; } }
  function _R(asetukset) { var N = _NO(), R = null; try { R = N ? N.tmNormistoRajat(asetukset) : null; } catch (e) { R = null; } var o = {}; Object.keys(OLETUS).forEach(function (k) { o[k] = R && typeof R[k] === 'number' ? R[k] : OLETUS[k]; }); var N2 = N && N.LUKITUT ? N.LUKITUT : {}; Object.keys(LUKITUT).forEach(function (k) { o[k] = typeof N2[k] === 'number' ? N2[k] : LUKITUT[k]; }); return o; }
  function _luku(x) { var n = typeof x === 'string' && x.trim() !== '' ? Number(x) : x; return typeof n === 'number' && isFinite(n) ? n : null; }

  function tmTasoVari(arvo, opts) {
    opts = opts || {};
    if (opts.neutraali || (opts.tila && opts.tila !== 'tuore')) return 'tuntematon';
    var v = _luku(arvo); if (v == null) return 'tuntematon';
    var R = _R(opts.asetukset), a = opts.asteikko || 'hh5';
    if (a === 'hh5') return v >= R.TASO_OK ? 'ok' : v >= R.TASO_RAJA ? 'raja' : 'kehitys';
    if (a === 'eerikkila3') return v >= R.TEK3_OK ? 'ok' : 'raja';   // kansallinen kärkiotos: taso 1 ei ole kehityskohde
    if (a === 'tki') return v >= R.TKI_OK ? 'ok' : v >= R.TKI ? 'raja' : 'kehitys';
    if (a === 'valmius') return v >= R.VALMIUS_OK ? 'ok' : v >= R.VALMIUS_RAJA ? 'raja' : 'kehitys';
    return 'tuntematon';
  }
  /* TKI-bändi (4-portainen nimi): erinomainen ≥ TKI_ERINOMAINEN (80) · hyva ≥ TKI_OK · kehitys ≥ TKI · prioriteetti — nimi vain tekstiin; väri tulee luokasta (tmTasoVari) */
  function tmTkiBandi(tki, opts) {
    var v = _luku(tki); if (v == null) return null; var R = _R(opts && opts.asetukset);
    return v >= R.TKI_ERINOMAINEN ? 'erinomainen' : v >= R.TKI_OK ? 'hyva' : v >= R.TKI ? 'kehitys' : 'prioriteetti';
  }
  function tmLuokkaCss(luokka) { return CSS[luokka] || CSS.tuntematon; }
  function tmTasoSavy(luokka) { return SAVY[luokka] || 'neutraali'; }
  function tmTasoCss(arvo, opts) { return CSS[tmTasoVari(arvo, opts)]; }

  function tmKattavuus(mitattu, yhteensa, opts) {
    var R = _R(opts && opts.asetukset), n = _luku(mitattu), yht = _luku(yhteensa); n = n == null || n < 0 ? 0 : Math.floor(n); yht = yht == null || yht < 0 ? 0 : Math.floor(yht);
    var pct = yht ? Math.round(n / yht * 100) : null, EPS = 1e-9;
    var riittava = yht > 0 && n >= R.KATTAVUUS_PELAAJA_PROS / 100 * yht - EPS, matala = yht > 0 && n < R.KATTAVUUS_MATALA_PROS / 100 * yht - EPS;
    return { n: n, yht: yht, pct: pct, riittava: riittava, matala: matala, otosPieni: n < R.OTOS_PIENI, minMitattu: n >= R.MIN_MITATTU, savy: !yht || !n ? 'neutraali' : riittava ? 'teal' : matala ? 'neutraali' : 'amber', rajaPros: R.KATTAVUUS_PELAAJA_PROS };
  }

  var API = { tmTkiBandi: tmTkiBandi, tmLuokkaCss: tmLuokkaCss, tmTasoVari: tmTasoVari, tmTasoSavy: tmTasoSavy, tmTasoCss: tmTasoCss, tmKattavuus: tmKattavuus };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) { root.TM_TASOVARI = API; root.tmTasoVari = tmTasoVari; root.tmTasoCss = tmTasoCss; root.tmTkiBandi = tmTkiBandi; root.tmLuokkaCss = tmLuokkaCss; root.tmKattavuus = tmKattavuus; }
})(typeof window !== 'undefined' ? window : null);
