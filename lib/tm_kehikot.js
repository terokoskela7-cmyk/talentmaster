/* ════════════════════════════════════════════════════════════════════════
   tm_kehikot.js — Palloliiton vertailukehikot (versioitu, kiinteä konfiguraatio). PUHDAS.
   Brief: Seurakehitysdashboard v0 (2.10.2026). Koodissa VAIN yleiset asiat: kehikot ja mittarimäärittelyt.
   Seuran omat tavoitteet ovat datassa (seurat/{sid}/kehitysasetukset/{vuosi}); tyhjä asetus = tämän kehikon tasot.

   Lukujen lähde: brief "Mittarit v0" (Palloliiton Kori 3 -kriteerit). Kori 1 ja 2: lukuja EI ole briefissä →
   niitä ei keksitä; kehikko palauttaa { maaritelty: false } ja näkymä kertoo sen.
   Dual-export: module.exports + window.TM_KEHIKOT.
   ════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* Mittarit, joita Lohko 1 voi näyttää. tyyppi: laskentatyyppi (A kehitysosuus, B tavoitetasoosuus, C määrä vs.
     tavoite, D asteikon keskiarvo, F vaatimus täyttyy). kertyma: 'maara' = kertyy vuoden mittaan (lineaarinen
     ennuste 31.12.), 'taso' = osuus/keskiarvo (ennuste = toteuma). kasin: kirjataan seuratuki-lomakkeelle. */
  var MITTARIT = {
    A_kehittyvat:      { nimi: 'Pelaajista kehittyy fyysisesti', yksikko: '%', tyyppi: 'A', kertyma: 'taso', tekija: 'pelaajat', lahde: 'TalentMasterin normeista (alustava)' },
    C3_havainnot:      { nimi: 'Harjoitushavainnot', yksikko: 'kpl', tyyppi: 'C', kertyma: 'maara', tekija: 'valmennus', lahde: 'harjoitusarvioinnit, malli Palloliitto' },
    C3_a1:             { nimi: 'Valmentajien innostavuus', yksikko: '0–10', tyyppi: 'D', kertyma: 'taso', tekija: 'valmennus', lahde: 'keskiarvo 0–10' },
    C3_a2:             { nimi: 'Pelaajat liikkeessä', yksikko: '%', tyyppi: 'D', kertyma: 'taso', tekija: 'valmennus', lahde: 'osuus harjoitusajasta' },
    C3_a2_osuus80:     { nimi: 'Havainnot, joissa liikkeessä ≥ 80 %', yksikko: '%', tyyppi: 'B', kertyma: 'taso', tekija: 'valmennus', lahde: 'osuus havainnoista' },
    C2a_kohtaamiset:   { nimi: 'Valmentajakohtaamiset', yksikko: 'kpl', tyyppi: 'C', kertyma: 'maara', tekija: 'valmennus', lahde: 'havainnointi, itsereflektio ja mentorointi' },
    C2b_koulutukset:   { nimi: 'Ydintaitojen koulutustapahtumat', yksikko: 'kpl', tyyppi: 'C', kertyma: 'maara', kasin: true, tekija: 'seura', lahde: 'kirjattu käsin' },
    C1_lisenssit:      { nimi: 'Lisenssikoulutussuoritukset', yksikko: 'kpl', tyyppi: 'C', kertyma: 'maara', kasin: true, tekija: 'seura', lahde: 'kirjattu käsin' },
    J2_roolit:         { nimi: 'Roolit ja omavastuu', yksikko: '', tyyppi: 'F', kasin: true, tekija: 'seura', lahde: 'kirjattu käsin' },
    J3_yhteistyoseurat: { nimi: 'Yhteistyöseurat', yksikko: '', tyyppi: 'F', kasin: true, tekija: 'seura', lahde: 'kirjattu käsin' },
    J5_t3:             { nimi: 'T3-ohjelma', yksikko: '', tyyppi: 'F', kasin: true, tekija: 'seura', lahde: 'kirjattu käsin' },
  };

  /* Versioidut kehikot. Avain = versiotunnus; kehikkoKorille valitsee voimassa olevan. */
  var KEHIKOT = {
    'palloliitto-kori3-v1': {
      versio: 'palloliitto-kori3-v1', kori: 3, nimi: 'Palloliitto Kori 3', maaritelty: true,
      tukikausi: '2027–2028', arviointipaiva: '2027-06-30',
      tasot: {
        C3_havainnot: 250,          // harjoitushavainnot kalenterivuodessa
        C3_a1: 8,                   // innostavuus, tavoite kohti 8
        C3_a2_osuus80: null,        // seurattava (osuus havainnoista, joissa a2 ≥ 80 %), ei Palloliiton lukua
        C2a_kohtaamiset: 100,
        C2b_koulutukset: 6,         // 3 lapsuusvaihe + 3 nuoruusvaihe
        C1_lisenssit: 130,          // 70 FVS + 60 muuta
        J2_roolit: true, J3_yhteistyoseurat: true, J5_t3: true,
      },
      erittely: {
        C2b_koulutukset: { lapsuus: 3, nuoruus: 3 },
        C1_lisenssit: { fvs: 70, muut: 60 },
      },
      K8_omatoiminen: { paivia_viikossa: 7, viikkoja: 12 },   // vertailuna, lapsuusvaihe
      C3_a2_raja: 80,
    },
  };
  var OLETUS_KORILLE = { 3: 'palloliitto-kori3-v1' };

  function kehikkoKorille(kori) {
    var k = Number(kori);
    var avain = OLETUS_KORILLE[k];
    if (!avain) return { kori: isFinite(k) && k > 0 ? k : null, maaritelty: false, nimi: isFinite(k) && k > 0 ? 'Palloliitto Kori ' + k : null, tasot: {} };
    return KEHIKOT[avain];
  }

  /* Seuran tavoite rivikohtaisesti: kehitysasetukset/{vuosi}.tavoitteet[mittari] voittaa; tyhjä → kehikon taso. */
  function tavoiteRiville(mittari, asetukset, kehikko) {
    var oma = asetukset && asetukset.tavoitteet && asetukset.tavoitteet[mittari];
    var pl = kehikko && kehikko.tasot ? kehikko.tasot[mittari] : undefined;
    var omaArvo = (oma && typeof oma === 'object' && 'arvo' in oma) ? oma.arvo : oma;
    return {
      tavoite: omaArvo != null ? omaArvo : (pl != null ? pl : null),
      lahde: omaArvo != null ? 'seura' : (pl != null ? 'palloliitto' : null),
      palloliitto: pl == null ? null : pl,
      seuraMatalampi: omaArvo != null && typeof omaArvo === 'number' && typeof pl === 'number' && omaArvo < pl,
    };
  }

  /* Ensinäkymän kolme tekijää (brief: KISS ja Oura-tyyli). Tavoitteet jaetaan näihin MITTARIT[x].tekija-kentällä. */
  var TEKIJAT = [
    { id: 'pelaajat', nimi: 'Pelaajat kehittyvät', lyhyt: 'Pelaajakehitys' },
    { id: 'valmennus', nimi: 'Valmennuksen laatu', lyhyt: 'Valmennuksen laatu' },
    { id: 'seura', nimi: 'Seura ja rakenteet', lyhyt: 'Seuran rakenteet' },
  ];
  var API = { TEKIJAT: TEKIJAT, MITTARIT: MITTARIT, KEHIKOT: KEHIKOT, kehikkoKorille: kehikkoKorille, tavoiteRiville: tavoiteRiville };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.TM_KEHIKOT = API;
})(typeof window !== 'undefined' ? window : null);
