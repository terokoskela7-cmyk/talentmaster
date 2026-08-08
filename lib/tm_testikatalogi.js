/* ══════════════════════════════════════════════════════════════════════════════════════════════════
   tm_testikatalogi.js — JAETTU TESTIKATALOGI (P2.1, docs/CODE_OHJE_TESTIT_HUB_P2.md)
   Joustavan testivalitsimen kanoninen lähde: mitatut testit (H-H fyysinen + H-H tekniikka + tekniikkakilpailu)
   jotka tuottavat §26-pikakenttiä. Käytössä Pikakirjaus-lomakkeessa (VP + Master).

   ⚠ PIDÄ SYNKASSA: TalentMaster_Excel_Tuonti.html KATALOGI_META (P1.2). Sama kanoninen id-muoto (Excel: lin30m).
   Harjoitettavuustestit (1–3p) EIVÄT ole tässä — ne eivät tuota pikakenttiä (Testaus_v9 hoitaa ne). Vaihe 3
   konsolidoi Excel_Tuonnin tähän libiin (yksi lähde).

   Puhtaita funktioita/dataa → testattavissa. Dual-export (window + module.exports).
   ══════════════════════════════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  // Kanoninen katalogimeta (Excel-id). yritykset = pohjaSarakkeet-pariteetti; alustaherka §22.
  var KATALOGI_META = {
    lin5m:    { nimi: 'Lineaarinopeus 5m',        yksikko: 's',    yritykset: 3, kategoria: 'Nopeus & voima',  alustaherka: true },
    lin10m:   { nimi: 'Lineaarinopeus 10m',       yksikko: 's',    yritykset: 3, kategoria: 'Nopeus & voima',  alustaherka: true },
    lin30m:   { nimi: 'Lineaarinopeus 30m',       yksikko: 's',    yritykset: 3, kategoria: 'Nopeus & voima',  alustaherka: true },
    kasirata: { nimi: 'Kasirata',                 yksikko: 's',    yritykset: 2, kategoria: 'Nopeus & voima',  alustaherka: true },
    sm_juoksu:{ nimi: 'SM-juoksu (ilman palloa)', yksikko: 's',    yritykset: 2, kategoria: 'Nopeus & voima',  alustaherka: true },
    hyppy_sj: { nimi: 'Staattinen hyppy (SJ)',    yksikko: 'cm',   yritykset: 3, kategoria: 'Nopeus & voima' },
    hyppy_cj: { nimi: 'Kevennyshyppy (CMJ)',      yksikko: 'cm',   yritykset: 3, kategoria: 'Nopeus & voima' },
    mas:      { nimi: 'MAS-juoksutesti',          yksikko: 'km/h', yritykset: 1, kategoria: 'Nopeus & voima',  alustaherka: true },
    sm_pallo: { nimi: 'SM-pallo',                 yksikko: 's',    yritykset: 2, kategoria: 'Tekniikka (H-H)', alustaherka: true },
    pujottelu_hh: { nimi: 'Pujottelu (H-H)',      yksikko: 's',    yritykset: 2, kategoria: 'Tekniikka (H-H)', alustaherka: true },
    syotto_hh:{ nimi: 'Syöttö (H-H)',             yksikko: 's',    yritykset: 2, kategoria: 'Tekniikka (H-H)', alustaherka: true },
    ponnauttelu: { nimi: 'Ponnauttelu',           yksikko: 's',    yritykset: 2, kategoria: 'Tekniikkakilpailu' },
    syotto:   { nimi: 'Syöttö',                   yksikko: 's',    yritykset: 2, kategoria: 'Tekniikkakilpailu', alustaherka: true },
    pujottelu:{ nimi: 'Pujottelu',                yksikko: 's',    yritykset: 2, kategoria: 'Tekniikkakilpailu', alustaherka: true },
    kuljetus_laukaus: { nimi: 'Kuljetus-laukaus (netto s)', yksikko: 's', yritykset: 2, kategoria: 'Tekniikkakilpailu', alustaherka: true },
    pituuspotku: { nimi: 'Pituuspotku (m)',       yksikko: 'm',    yritykset: 4, kategoria: 'Tekniikkakilpailu' }
  };

  // Protokolla-esitäytöt = todelliset testId:t (pohjaSarakkeet-pariteetti; hh_laaja splitit lin5m/lin10m).
  var PROTO_ESITAYTTO = {
    hh_laaja:         ['lin5m', 'lin10m', 'lin30m', 'hyppy_cj', 'hyppy_sj', 'mas', 'sm_juoksu', 'sm_pallo', 'kasirata', 'pujottelu_hh', 'syotto_hh'],
    hh_suppea:        ['lin30m', 'hyppy_cj', 'mas', 'sm_juoksu', 'sm_pallo'],
    tekniikkakilpailu:['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus', 'pituuspotku']
  };

  // Katalogi-id → tm_pikakentat.js:n odottama tulokset-avain (Testaus_v9 _tulokset-muoto). Vain lin-splitit eroavat.
  var LIB_INPUT_KEY = { lin5m: 'lin_5m', lin10m: 'lin_10m', lin30m: 'lin_30m' };
  function tmLibInputKey(id) { return LIB_INPUT_KEY[id] || id; }

  function tmKatalogiTesti(id) {
    if (!id || !KATALOGI_META[id]) return null;
    var m = KATALOGI_META[id];
    return { id: id, nimi: m.nimi, yksikko: m.yksikko, yritykset: m.yritykset, kategoria: m.kategoria, alustaherka: !!m.alustaherka };
  }

  // Kaikki testit kategoriajärjestyksessä (UI-valitsimeen).
  function tmKaikkiKatalogiTestit() {
    var jarjestys = ['Nopeus & voima', 'Tekniikka (H-H)', 'Tekniikkakilpailu'];
    var ulos = [];
    jarjestys.forEach(function (kat) {
      Object.keys(KATALOGI_META).forEach(function (id) { if (KATALOGI_META[id].kategoria === kat) ulos.push(tmKatalogiTesti(id)); });
    });
    return ulos;
  }

  function tmProtoEsitaytto(protokolla) { return (PROTO_ESITAYTTO[protokolla] || []).slice(); }

  // Onko listassa alustaherkkiä testejä (§22 → alusta-valinta lomakkeessa).
  function tmOnkoAlustaherkka(idt) { return (idt || []).some(function (id) { var t = tmKatalogiTesti(id); return t && t.alustaherka; }); }

  var API = {
    KATALOGI_META: KATALOGI_META, PROTO_ESITAYTTO: PROTO_ESITAYTTO,
    tmKatalogiTesti: tmKatalogiTesti, tmKaikkiKatalogiTestit: tmKaikkiKatalogiTestit,
    tmProtoEsitaytto: tmProtoEsitaytto, tmLibInputKey: tmLibInputKey, tmOnkoAlustaherkka: tmOnkoAlustaherkka
  };
  if (global) global.TM_TESTIKATALOGI = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
