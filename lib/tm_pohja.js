/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_pohja.js — Itsekuvaava Excel-tuontipohja (P1.2, docs/CODE_OHJE_TESTIT_HUB_P1.md)
   Sarakegenerointi MIELIVALTAISESTA testilistasta + Meta-lehti (round-trip: generointi ↔ luku).

   KANONINEN testi-id-muoto = Excel PROTOKOLLAT (lin30m, hyppy_cj, pujottelu_hh, kuljetus_laukaus…).
   EI Testaus_v9 VAPAA_TESTIPANKKI (lin_5m) — eri id-avaruus JA kattaa vain osan testeistä (ei H-H
   fyysisiä: mas/sm_juoksu/sm_pallo/kasirata). Excel-generaattori + lukija ovat jo PROTOKOLLAT-pohjaisia,
   joten sama id-avaruus = ei mappauskerrosta, ei kolmatta divergoivaa lähdettä. Ks. P1.2-raportti.

   Puhtaita funktioita (ei DOM/SheetJS-riippuvuutta) → testattavissa (vitest). SheetJS-kääre jää Excel_Tuonti.html:iin.
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var META_MARKER = '__TM_POHJA_META__';
  var META_VERSIO = 'v1';

  // Otsikko-slug (sama logiikka kuin Excel_Tuonti _pohjaTestiNimi): sulut pois, ä/ö→a/o, CamelCase.
  function _slug(nimi) {
    return String(nimi == null ? '' : nimi).replace(/\(.*?\)/g, '').trim()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/Ä/g, 'A').replace(/Ö/g, 'O')
      .replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
      .map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join('');
  }

  // Yksikkösuffiksi otsikkoon: '1-3p' → 'p'; muuten yksikkö tai 'arvo'.
  function _yksSuffiksi(yksikko) {
    if (yksikko === '1-3p' || yksikko === 'p') return 'p';
    return yksikko || 'arvo';
  }

  /* Rakenna sarakemääritykset yhdelle testille. testi = { id, nimi, yksikko, yritykset?, lajiLogiikka? }.
     Palauttaa [{ header, testId, kind, yritys }]. Erikoislajit (kuljetus_laukaus/pituuspotku/mas) saavat
     saman skeeman kuin PROTOKOLLAT-haarat (pohjaSarakkeet) → myös vanha fuzzy-lukija tunnistaa ne. */
  function sarakkeetTestista(testi) {
    if (!testi || !testi.id) return [];
    var id = testi.id;
    var yks = testi.yksikko || 's';
    var yrit = Math.max(1, testi.yritykset || 1);

    if (testi.lajiLogiikka === 'kuljetus_laukaus' || id === 'kuljetus_laukaus') {
      var kl = [];
      for (var i = 1; i <= (yrit || 2); i++) {
        kl.push({ header: 'KuljetusLaukaus_raaka_s_' + i, testId: id, kind: 'kl_raaka', yritys: i });
        kl.push({ header: 'KuljetusLaukaus_vahennys_s_' + i, testId: id, kind: 'kl_vahennys', yritys: i });
      }
      return kl;
    }
    if (testi.lajiLogiikka === 'pituuspotku' || id === 'pituuspotku') {
      return [
        { header: 'Pituuspotku_oikea_m_1', testId: id, kind: 'pp_oikea', yritys: 1 },
        { header: 'Pituuspotku_oikea_m_2', testId: id, kind: 'pp_oikea', yritys: 2 },
        { header: 'Pituuspotku_vasen_m_1', testId: id, kind: 'pp_vasen', yritys: 1 },
        { header: 'Pituuspotku_vasen_m_2', testId: id, kind: 'pp_vasen', yritys: 2 }
      ];
    }
    if (id === 'mas') {
      // MAS = aika (min,sek) → parseMasAika lukupäässä. Yksi sarake, kind 'arvo'.
      return [{ header: 'MAS_aika_(min,sek)', testId: id, kind: 'arvo', yritys: 1 }];
    }
    // Geneerinen aika/arvo-testi: _1.._N suorituksina.
    var base = _slug(testi.nimi || id) + '_' + _yksSuffiksi(yks);
    var out = [];
    for (var j = 1; j <= yrit; j++) out.push({ header: base + '_' + j, testId: id, kind: 'arvo', yritys: j });
    return out;
  }

  // Koko valitun testilistan sarakkeet (litteä taulukko, generointijärjestyksessä).
  function sarakkeetTesteista(testit) {
    var ulos = [];
    (testit || []).forEach(function (t) { ulos = ulos.concat(sarakkeetTestista(t)); });
    return ulos;
  }

  /* Meta-lehden AOA (array-of-arrays): rivi 0 = marker+versio, rivi 1 = otsikot, loput = per sarake.
     Itsekuvaava: tuonti tunnistaa sarakkeet TÄSTÄ (ei URL/tapahtuma-riippuvuutta, ei PROTOKOLLAT-osumaa). */
  function metaLehtiAoa(sarakkeet, yksikkoById) {
    yksikkoById = yksikkoById || {};
    var aoa = [[META_MARKER, META_VERSIO], ['testId', 'header', 'kind', 'yritys', 'yksikko']];
    (sarakkeet || []).forEach(function (s) {
      aoa.push([s.testId, s.header, s.kind, s.yritys, yksikkoById[s.testId] || '']);
    });
    return aoa;
  }

  /* Lue Meta-lehti AOA:sta → { 'header_lower': { testId, kind, yritys, yksikko } } tai null (ei TM-metalehti).
     Round-trip: lueMetaLehti(metaLehtiAoa(sarakkeetTesteista(testit))) palauttaa saman skeeman. */
  function lueMetaLehti(aoa) {
    if (!aoa || !aoa.length || !aoa[0] || String(aoa[0][0]).trim() !== META_MARKER) return null;
    var map = {};
    for (var r = 2; r < aoa.length; r++) {
      var row = aoa[r] || [];
      var testId = String(row[0] == null ? '' : row[0]).trim();
      var header = String(row[1] == null ? '' : row[1]).trim();
      if (!testId || !header) continue;
      map[header.toLowerCase()] = {
        testId: testId,
        kind: String(row[2] == null ? 'arvo' : row[2]).trim() || 'arvo',
        yritys: parseInt(row[3], 10) || 1,
        yksikko: String(row[4] == null ? '' : row[4]).trim() || null
      };
    }
    return map;
  }

  var API = {
    META_MARKER: META_MARKER, META_VERSIO: META_VERSIO,
    sarakkeetTestista: sarakkeetTestista,
    sarakkeetTesteista: sarakkeetTesteista,
    metaLehtiAoa: metaLehtiAoa,
    lueMetaLehti: lueMetaLehti
  };
  if (global) global.TM_POHJA = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
