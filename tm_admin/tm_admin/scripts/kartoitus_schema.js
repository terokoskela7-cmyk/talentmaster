/**
 * TalentMaster — Harjoitettavuuskartoitus Firestore Schema
 * Perustuu: Jalkapallon harjoitettavuuskartoitus testimanuaali 2026 (Suomen Palloliitto / Eerikkilä)
 * 
 * Polku: seurat/{seuraId}/kartoitukset/{kartoitusId}
 */

// ============================================================
// VIITEARVOT (kovakoodattu logiikkaan, ei tallenneta Firestoreen)
// Käytetään automaattisessa pisteytyslogiikassa
// ============================================================

const VIITEARVOT = {

  U12: {
    // Sama asteikko tytöille ja pojille PAITSI hypyissä
    valakyykky:         { tyyppi: "laatu",   asteikko: [1,2,3] },
    luistelijanKyykky:  { tyyppi: "laatu",   asteikko: [1,2,3] },
    askelkyykky:        { tyyppi: "laatu",   asteikko: [1,2,3] },
    hyvaaHuomenta:      { tyyppi: "laatu",   asteikko: [1,2,3] },
    etunojapunnerrus:   { tyyppi: "laatu",   asteikko: [1,2,3] },
    lankku60s:          { tyyppi: "aika_s",  T: [30, 50], P: [30, 50] },       // <30=1, 30-49=2, ≥50=3
    naruhypyt15s:       { tyyppi: "toistot", T: [26, 36], P: [26, 36] },       // <26=1, 26-35=2, ≥36=3
    pituushyppy:        { tyyppi: "matka_m", T: [1.75, 1.85], P: [1.80, 1.95] }, // P-raja eri
    loikka5:            { tyyppi: "matka_m", T: [8.75, 9.25], P: [9.00, 9.75] },
  },

  U15: {
    pistoolikyykky:     { tyyppi: "toistot", T: [5, 8],   P: [6, 10] },
    etunojapunnerrus:   { tyyppi: "toistot", T: [12, 20],  P: [24, 34] },
    leuanveto:          { tyyppi: "toistot", T: [4, 6],   P: [7, 10] },
    // Testi 4: vaihtoehtoinen — jalkojen nosto TAI lankku 120s TAI sivulankku 60s
    jalkojenNosto:      { tyyppi: "toistot", T: [5, 10],  P: [8, 13] },
    lankku120s:         { tyyppi: "aika_s",  T: [60, 90], P: [60, 90] },
    sivulankku60s:      { tyyppi: "aika_s",  T: [40, 50], P: [40, 50] },
    lantionnosto:       { tyyppi: "toistot", T: [29, 40],  P: [37, 46] },
    // Testi 6: vaihtoehtoinen — naruhypyt TAI päkiänousu
    naruhypyt30s:       { tyyppi: "toistot", T: [57, 68],  P: [62, 72] },
    pakianousu:         { tyyppi: "toistot", T: [15, 20],  P: [15, 20] },  // ≥15=2, 20=3
    slr:                { tyyppi: "laatu",   asteikko: [1,2,3] },
    thomasTesti:        { tyyppi: "laatu",   asteikko: [1,2,3] },
    pituushyppy:        { tyyppi: "matka_m", T: [1.95, 2.10], P: [2.20, 2.45] },
    loikka5:            { tyyppi: "matka_m", T: [9.75, 10.50], P: [11.00, 12.25] },
  },

  U19: {
    // Voimatestit: suhteellinen 1RM (kg/kg), ikäkohtainen — rakenne alla
    takakyykky_rel:     { tyyppi: "voima_rel", ikakohtainen: true },
    maastaveto_rel:     { tyyppi: "voima_rel", ikakohtainen: true },
    rinnalleveto_rel:   { tyyppi: "voima_rel", ikakohtainen: true },
    yhdenJalanKyykky_rel: { tyyppi: "voima_rel", ikakohtainen: true },
    penkkipunnerrus_rel:  { tyyppi: "voima_rel", ikakohtainen: true },
    leuanveto:          { tyyppi: "toistot", T: [8, 15],  P: [5, 8] },
    jalkojenNosto:      { tyyppi: "toistot", T: [12, 20], P: [9, 16] },
    pakianousu:         { tyyppi: "toistot", T: [15, 20], P: [15, 20] },
    lonkanOjennus:      { tyyppi: "laatu",   asteikko: [1,2,3] },
    slr:                { tyyppi: "laatu",   asteikko: [1,2,3] },
    thomasTesti:        { tyyppi: "laatu",   asteikko: [1,2,3] },
    pituushyppy:        { tyyppi: "matka_m", T: [2.45, 2.75], P: [2.10, 2.30] },
    loikka5:            { tyyppi: "matka_m", T: [12.25, 13.75], P: [10.50, 11.50] },
  },

  // U19 voimatestien ikäkohtaiset raja-arvot (suhteellinen 1RM kg/kg)
  // Rakenne: { T16: [raja1_raja2], T17: [...], ... }
  VOIMA_RAJAT: {
    takakyykky: {
      T: { 16: [1.2,1.3], 17: [1.3,1.4], 18: [1.4,1.5], 19: [1.5,1.6] },
      P: { 16: [1.3,1.4], 17: [1.4,1.5], 18: [1.5,1.6], 19: [1.6,1.8] },
    },
    maastaveto: {
      T: { 16: [1.5,1.7], 17: [1.7,1.8], 18: [1.8,1.9], 19: [1.9,2.0] },
      P: { 16: [1.8,2.0], 17: [1.8,2.0], 18: [2.0,2.2], 19: [2.1,2.3] },
    },
    rinnalleveto: {
      T: { 16: [0.75,0.80], 17: [0.80,0.85], 18: [0.85,0.90], 19: [0.90,0.95] },
      P: { 16: [0.90,0.95], 17: [0.95,1.00], 18: [1.00,1.05], 19: [1.05,1.10] },
    },
    yhdenJalanKyykky: {
      T: { 16: [0.80,0.90], 17: [0.90,1.00], 18: [1.00,1.10], 19: [1.10,1.20] },
      P: { 16: [0.90,1.00], 17: [1.00,1.10], 18: [1.10,1.20], 19: [1.20,1.40] },
    },
    penkkipunnerrus: {
      T: { 16: [0.70,0.75], 17: [0.75,0.80], 18: [0.80,0.85], 19: [0.85,0.90] },
      P: { 16: [0.85,0.90], 17: [0.90,0.95], 18: [0.95,1.00], 19: [1.00,1.05] },
    },
  },
};

// ============================================================
// FIRESTORE DOCUMENT SCHEMA
// Polku: seurat/{seuraId}/kartoitukset/{kartoitusId}
// ============================================================

const KARTOITUS_SCHEMA = {

  // --- METATIEDOT ---
  id:           "string",         // Firestore auto-id
  seuraId:      "string",         // "kpv"
  luotu:        "timestamp",
  muokattu:     "timestamp",
  luonutUid:    "string",         // kirjaajan Firebase UID

  // --- PELAAJAN TIEDOT ---
  pelaajaId:    "string",         // PalloID tai sisäinen id (ei Firebase UID)
  nimi:         "string",
  sukupuoli:    "string",         // "T" | "P"
  ika:          "number",         // ikä testaushetkellä (kokonaisluku)
  syntymavuosi: "number",         // lasketaan ikäluokka tästä
  ikäluokka:    "string",         // "U12" | "U15" | "U19" — lasketaan automaattisesti
  joukkue:      "string",
  phvTila:      "string",         // "Varhainen" | "PHV-huippu" | "Post-PHV" | "Ei tiedossa"

  // --- TESTIN METATIEDOT ---
  testauspvm:   "timestamp",
  arvioija:     "string",         // nimi tai uid
  kausi:        "string",         // "kevat_2026" | "syksy_2026"

  // --- TESTIT U12 (9 kpl) ---
  // Tallennusmuoto jokaiselle testille:
  //   tulos: raaka tulos (sekuntia / toistoja / metriä / pisteet 1-3)
  //   pisteet: 1 | 2 | 3 (lasketaan viitearvoista, voidaan korjata manuaalisesti)
  //   huomio: vapaaehtoinen tekstikenttä
  u12: {
    valakyykky:        { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" },
    luistelijanKyykky: { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" },
    askelkyykky:       { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" },
    hyvaaHuomenta:     { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" },
    etunojapunnerrus:  { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" },
    lankku60s:         { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // sekuntia
    naruhypyt15s:      { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // toistoja
    pituushyppy:       { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // metriä
    loikka5:           { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // metriä
  },

  // --- TESTIT U15 (10 kpl, vaihtoehtoisia testejä) ---
  u15: {
    pistoolikyykky:    { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // toistoja
    etunojapunnerrus:  { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // toistoja (äänimerkin tahdissa)
    leuanveto:         { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // toistoja
    // Testi 4: VAIHTOEHTOINEN — kirjataan mikä suoritettiin + tulos
    testi4_valinta:    "string",   // "jalkojenNosto" | "lankku120s" | "sivulankku60s"
    testi4_tulos:      { tulos: "number", pisteet: "1|2|3", huomio: "string?" },
    lantionnosto:      { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // toistoja/jalka
    // Testi 6: VAIHTOEHTOINEN
    testi6_valinta:    "string",   // "naruhypyt30s" | "pakianousu"
    testi6_tulos:      { tulos: "number", pisteet: "1|2|3", huomio: "string?" },
    slr:               { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" }, // laatu 1-3
    thomasTesti:       { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" }, // laatu 1-3
    pituushyppy:       { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // metriä
    loikka5:           { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // metriä
  },

  // --- TESTIT U19 (13 kpl) ---
  u19: {
    // Voimatestit 5RM — tallennetaan raaka 5RM kuorma + kehonpaino → lasketaan suhteellinen
    takakyykky:        { kg5rm: "number", kehonpaino: "number", rel1rm: "number", pisteet: "1|2|3" },
    maastaveto:        { kg5rm: "number", kehonpaino: "number", rel1rm: "number", pisteet: "1|2|3" },
    rinnalleveto:      { kg5rm: "number", kehonpaino: "number", rel1rm: "number", pisteet: "1|2|3" },
    yhdenJalanKyykky:  { kg5rm: "number", kehonpaino: "number", rel1rm: "number", pisteet: "1|2|3",
                         puoli: "string" }, // "V" | "O" | "molemmat"
    penkkipunnerrus:   { kg5rm: "number", kehonpaino: "number", rel1rm: "number", pisteet: "1|2|3" },
    leuanveto:         { tulos: "number",         pisteet: "1|2|3", huomio: "string?" },
    jalkojenNosto:     { tulos: "number",         pisteet: "1|2|3", huomio: "string?" },
    pakianousu:        { tulos: "number",         pisteet: "1|2|3", huomio: "string?" }, // toistoja/jalka
    lonkanOjennus:     { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" }, // laatu
    slr:               { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" }, // laatu
    thomasTesti:       { tulos: "number_or_null", pisteet: "1|2|3", huomio: "string?" }, // laatu
    pituushyppy:       { tulos: "number",         pisteet: "1|2|3", huomio: "string?" },
    loikka5:           { tulos: "number",         pisteet: "1|2|3", huomio: "string?" },
  },

  // --- YHTEENVETO (lasketaan automaattisesti) ---
  yhteenveto: {
    pisteetYhteensa:   "number",    // summa kaikista pisteistä
    pisteetMaksimi:    "number",    // U12=27, U15=30(tai 39), U19=39(tai 24)
    fleiProsentti:     "number",    // pisteetYhteensa / pisteetMaksimi * 100
    fleiTaso:          "string",    // "hyvä" | "kehitys" | "prioriteetti"
    kuormaRajoitin:    "string",    // "normaali" | "80pct" | "60pct"
    asiHuomio:         "string?",   // automaattinen ASI-laskenta jos relevantit testit tehty
  },

  // --- ASI-LASKENTA (askelryhtisymmetria, jos 1-jalkatestit tehty molemmille puolille) ---
  asi: {
    lantionnosto_V:    "number?",   // vasemman jalan toistot
    lantionnosto_O:    "number?",   // oikean jalan toistot
    lantionnosto_asi:  "number?",   // (|V-O|/parempi)*100
    lantionnosto_taso: "string?",   // "ok" | "huomio" | "kriittinen"
    // Vastaavat pakianousu, naruhypyt yms. jos molemmat puolet mitattu
  },
};

// ============================================================
// BRZYCKI 1RM KAAVA
// ============================================================
// 1RM = kuorma / (1.0278 - (0.0278 * toistot))
// Suhteellinen: 1RM / kehonpaino

function laskeBrzycki(kg5rm, toistot = 5) {
  return kg5rm / (1.0278 - (0.0278 * toistot));
}

function laskeSuhteellinen1RM(kg5rm, kehonpaino, toistot = 5) {
  const rm1 = laskeBrzycki(kg5rm, toistot);
  return parseFloat((rm1 / kehonpaino).toFixed(3));
}

// ============================================================
// ESIMERKKI: KPV U15-pelaajan kartoitusdokumentti Firestoressä
// ============================================================

const ESIMERKKI_U15 = {
  id:           "auto",
  seuraId:      "kpv",
  luotu:        "2026-03-22T10:00:00Z",
  muokattu:     "2026-03-22T10:00:00Z",
  luonutUid:    "jIbW7q8nLggswTjefkYuSvtneH92",  // KPV VP

  pelaajaId:    "kpv_001",
  nimi:         "Matti Meikäläinen",
  sukupuoli:    "P",
  ika:          14,
  syntymavuosi: 2012,
  ikäluokka:    "U15",
  joukkue:      "KPV U15",
  phvTila:      "PHV-huippu",

  testauspvm:   "2026-03-22T09:00:00Z",
  arvioija:     "Pekka Valmentaja",
  kausi:        "kevat_2026",

  u15: {
    pistoolikyykky:   { tulos: 7,    pisteet: 2, huomio: "" },
    etunojapunnerrus: { tulos: 16,   pisteet: 2, huomio: "Hyvä tekniikka" },
    leuanveto:        { tulos: 5,    pisteet: 2, huomio: "" },
    testi4_valinta:   "jalkojenNosto",
    testi4_tulos:     { tulos: 8,    pisteet: 2, huomio: "" },
    lantionnosto:     { tulos: 32,   pisteet: 2, huomio: "" },
    testi6_valinta:   "naruhypyt30s",
    testi6_tulos:     { tulos: 60,   pisteet: 2, huomio: "" },
    slr:              { tulos: null, pisteet: 2, huomio: "Vasen 85°, oikea 88°" },
    thomasTesti:      { tulos: null, pisteet: 3, huomio: "" },
    pituushyppy:      { tulos: 2.05, pisteet: 2, huomio: "" },
    loikka5:          { tulos: 10.1, pisteet: 2, huomio: "" },
  },

  yhteenveto: {
    pisteetYhteensa:  20,
    pisteetMaksimi:   30,
    fleiProsentti:    67,
    fleiTaso:         "kehitys",
    kuormaRajoitin:   "60pct",  // PHV-huippu
    asiHuomio:        "⚡ Tee 1-jalan testit molemmin puolin. ASI=(V-O)/parempi×100. >10%=🟡 >15%=🔴",
  },
};

module.exports = { VIITEARVOT, KARTOITUS_SCHEMA, laskeBrzycki, laskeSuhteellinen1RM };
