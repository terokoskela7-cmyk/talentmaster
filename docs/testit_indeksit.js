/**
 * TalentMaster™ — Testiindeksit
 * testit_indeksit.js
 *
 * Kolme testikerrosta → kolme indeksiä → joukkueen avainluvut
 *
 * Kerros 1: Tekniikkakilpailut (U8–U13) → TKI (0–100)
 * Kerros 2: H-H ominaisuustestit (U10–U19) → OVR (0–100) + EI + FVP + TSI
 * Kerros 3: Harjoitettavuuskartoitus (U10–U19) → FLEI (0–100%)
 *
 * Lähteet:
 * - H-H normitaulukko: 21 000+ pelaajan tietokanta (Suomi)
 * - TKI-laskentakaava: Liikanen & Törmä 2025, N=1843
 * - Tekniikkakilpailujen merkkirajat: SPL-tekniikkakilpailut
 * - Harjoitettavuuskartoitus: Olympiakomitean protokolla 2026
 */

// ─────────────────────────────────────────────────────────────────────────────
// KERROS 2: H-H OMINAISUUSTESTIT — NORMITAULUKKO
//
// Taso 1 = alle kansallisen ka (kehittyvä)
// Taso 2 = kansallinen ka (normaali)
// Taso 3 = hyvä kansallinen taso
// Taso 4 = erittäin hyvä (top 25%)
// Taso 5 = kansainvälinen taso (top 10%)
//
// Rakenne: HH_NORMIT[sukupuoli][testi][ikä] = [t1_max, t2_max, t3_max, t4_max]
// Arvo alle t1_max = taso 1, alle t2_max = taso 2, jne.
// Arvo yli t4_max = taso 5
//
// HUOM: 30m = aika sekunteina (pienempi = parempi → käänteinen)
//        CMJ, pituushyppy, 5-loikka = cm/m (suurempi = parempi)
//        Kasirata, SM-juoksu, SM-pallo = aika sekunteina (pienempi = parempi)
//        MAS = km/h (suurempi = parempi)
// ─────────────────────────────────────────────────────────────────────────────
const HH_NORMIT = {
  P: { // Pojat
    // 30m sprint (s) — KÄÄNTEINEN (pienempi on parempi)
    '30m': {
      10: [5.40, 5.10, 4.90, 4.70],
      11: [5.20, 4.95, 4.75, 4.55],
      12: [5.00, 4.75, 4.55, 4.35],
      13: [4.80, 4.55, 4.35, 4.15],
      14: [4.60, 4.35, 4.18, 4.00],
      15: [4.45, 4.20, 4.05, 3.88],
      16: [4.30, 4.10, 3.93, 3.78],
      17: [4.18, 3.98, 3.83, 3.68],
      18: [4.10, 3.90, 3.75, 3.60],
      19: [4.05, 3.85, 3.70, 3.55],
    },
    // 5m (s) — KÄÄNTEINEN
    '5m': {
      10: [1.20, 1.12, 1.06, 1.00],
      11: [1.16, 1.08, 1.02, 0.97],
      12: [1.12, 1.04, 0.98, 0.93],
      13: [1.08, 1.00, 0.95, 0.90],
      14: [1.04, 0.97, 0.92, 0.87],
      15: [1.01, 0.94, 0.89, 0.84],
      16: [0.98, 0.92, 0.87, 0.82],
      17: [0.96, 0.90, 0.85, 0.80],
      18: [0.94, 0.88, 0.83, 0.79],
      19: [0.93, 0.87, 0.82, 0.78],
    },
    // Kasirata (s) — KÄÄNTEINEN
    kasirata: {
      10: [12.80, 12.00, 11.40, 10.80],
      11: [12.20, 11.40, 10.80, 10.20],
      12: [11.60, 10.80, 10.20, 9.60],
      13: [11.00, 10.20, 9.65, 9.10],
      14: [10.50, 9.75, 9.20, 8.70],
      15: [10.10, 9.35, 8.85, 8.35],
      16: [9.75, 9.05, 8.55, 8.10],
      17: [9.50, 8.80, 8.35, 7.90],
      18: [9.30, 8.65, 8.20, 7.75],
      19: [9.20, 8.55, 8.10, 7.65],
    },
    // CMJ (cm) — normaali (suurempi on parempi)
    cmj: {
      10: [20, 25, 30, 36],
      11: [22, 27, 33, 39],
      12: [25, 30, 36, 43],
      13: [28, 34, 40, 47],
      14: [32, 38, 45, 52],
      15: [36, 43, 50, 57],
      16: [40, 47, 54, 61],
      17: [43, 50, 57, 64],
      18: [45, 52, 59, 66],
      19: [46, 53, 60, 67],
    },
    // SM-juoksu pallotta (s) — KÄÄNTEINEN
    sm_juoksu: {
      10: [12.50, 11.70, 11.10, 10.50],
      11: [12.00, 11.20, 10.60, 10.00],
      12: [11.50, 10.70, 10.10, 9.55],
      13: [11.00, 10.20, 9.65, 9.10],
      14: [10.50, 9.75, 9.25, 8.75],
      15: [10.10, 9.40, 8.90, 8.40],
      16: [9.80, 9.10, 8.65, 8.20],
      17: [9.60, 8.90, 8.45, 8.00],
      18: [9.45, 8.75, 8.30, 7.90],
      19: [9.35, 8.65, 8.20, 7.80],
    },
    // SM-pallo (s) — KÄÄNTEINEN
    sm_pallo: {
      10: [14.00, 13.00, 12.20, 11.40],
      11: [13.40, 12.40, 11.60, 10.80],
      12: [12.80, 11.80, 11.00, 10.20],
      13: [12.20, 11.20, 10.45, 9.70],
      14: [11.60, 10.70, 9.95, 9.20],
      15: [11.20, 10.30, 9.60, 8.90],
      16: [10.85, 10.00, 9.30, 8.65],
      17: [10.60, 9.75, 9.10, 8.45],
      18: [10.45, 9.60, 8.95, 8.30],
      19: [10.35, 9.50, 8.85, 8.20],
    },
    // Pujottelu (s) — KÄÄNTEINEN
    pujottelu: {
      10: [12.00, 11.20, 10.60, 10.00],
      11: [11.50, 10.70, 10.10, 9.50],
      12: [11.00, 10.20, 9.65, 9.05],
      13: [10.50, 9.75, 9.20, 8.65],
      14: [10.10, 9.35, 8.85, 8.30],
      15: [9.80, 9.10, 8.60, 8.10],
      16: [9.55, 8.85, 8.35, 7.90],
      17: [9.35, 8.70, 8.20, 7.75],
      18: [9.25, 8.60, 8.10, 7.65],
      19: [9.15, 8.50, 8.00, 7.55],
    },
    // MAS (km/h) — normaali (suurempi on parempi)
    mas: {
      10: [9.0, 10.0, 11.0, 12.0],
      11: [9.5, 10.5, 11.5, 12.5],
      12: [10.0, 11.0, 12.0, 13.0],
      13: [10.5, 11.5, 12.5, 13.5],
      14: [11.0, 12.0, 13.0, 14.0],
      15: [11.5, 12.5, 13.5, 14.5],
      16: [12.0, 13.0, 14.0, 15.0],
      17: [12.5, 13.5, 14.5, 15.5],
      18: [13.0, 14.0, 15.0, 16.0],
      19: [13.5, 14.5, 15.5, 16.5],
    },
    // Syöttöpenkki — pisteet (suurempi on parempi, max ~20p)
    syottopenkki: {
      10: [6, 9, 12, 16],
      11: [7, 10, 13, 17],
      12: [8, 11, 14, 18],
      13: [9, 12, 15, 18],
      14: [10, 13, 16, 19],
      15: [11, 14, 17, 19],
      16: [12, 15, 17, 20],
      17: [12, 15, 18, 20],
      18: [13, 16, 18, 20],
      19: [13, 16, 18, 20],
    },
  },
  T: { // Tytöt — omat normit
    '30m': {
      10: [5.70, 5.40, 5.20, 5.00],
      11: [5.50, 5.20, 5.00, 4.80],
      12: [5.30, 5.00, 4.82, 4.62],
      13: [5.15, 4.85, 4.67, 4.47],
      14: [5.05, 4.75, 4.58, 4.38],
      15: [4.98, 4.70, 4.53, 4.33],
      16: [4.93, 4.65, 4.48, 4.29],
      17: [4.90, 4.62, 4.46, 4.27],
      18: [4.88, 4.60, 4.44, 4.25],
      19: [4.87, 4.59, 4.43, 4.24],
    },
    cmj: {
      10: [16, 20, 25, 30],
      11: [18, 22, 27, 33],
      12: [20, 25, 30, 36],
      13: [23, 28, 33, 39],
      14: [25, 30, 36, 42],
      15: [27, 32, 38, 44],
      16: [28, 34, 39, 45],
      17: [29, 35, 40, 46],
      18: [30, 36, 41, 47],
      19: [30, 36, 42, 48],
    },
    kasirata: {
      10: [13.50, 12.70, 12.10, 11.50],
      11: [13.00, 12.20, 11.60, 11.00],
      12: [12.50, 11.70, 11.10, 10.50],
      13: [12.10, 11.30, 10.75, 10.20],
      14: [11.80, 11.00, 10.50, 9.95],
      15: [11.55, 10.80, 10.30, 9.75],
      16: [11.40, 10.65, 10.15, 9.65],
      17: [11.30, 10.55, 10.05, 9.55],
      18: [11.25, 10.50, 10.00, 9.50],
      19: [11.22, 10.48, 9.98, 9.48],
    },
    sm_juoksu: {
      10: [13.50, 12.60, 12.00, 11.40],
      11: [13.00, 12.10, 11.50, 10.90],
      12: [12.50, 11.65, 11.05, 10.45],
      13: [12.10, 11.25, 10.70, 10.10],
      14: [11.80, 11.00, 10.45, 9.90],
      15: [11.55, 10.78, 10.25, 9.70],
      16: [11.40, 10.65, 10.10, 9.60],
      17: [11.30, 10.56, 10.02, 9.52],
      18: [11.24, 10.50, 9.97, 9.47],
      19: [11.20, 10.46, 9.93, 9.43],
    },
    sm_pallo: {
      10: [15.00, 14.00, 13.20, 12.40],
      11: [14.40, 13.40, 12.60, 11.80],
      12: [13.80, 12.80, 12.00, 11.20],
      13: [13.30, 12.30, 11.55, 10.80],
      14: [13.00, 12.00, 11.28, 10.55],
      15: [12.75, 11.80, 11.10, 10.38],
      16: [12.60, 11.65, 10.97, 10.27],
      17: [12.52, 11.57, 10.90, 10.20],
      18: [12.47, 11.52, 10.85, 10.17],
      19: [12.44, 11.49, 10.82, 10.14],
    },
    pujottelu: {
      10: [13.00, 12.10, 11.50, 10.90],
      11: [12.50, 11.60, 11.00, 10.40],
      12: [12.00, 11.10, 10.55, 9.95],
      13: [11.60, 10.75, 10.20, 9.65],
      14: [11.30, 10.50, 9.95, 9.42],
      15: [11.10, 10.30, 9.78, 9.27],
      16: [10.96, 10.18, 9.67, 9.17],
      17: [10.87, 10.10, 9.60, 9.10],
      18: [10.82, 10.05, 9.55, 9.05],
      19: [10.79, 10.02, 9.52, 9.02],
    },
    mas: {
      10: [8.5, 9.5, 10.5, 11.5],
      11: [9.0, 10.0, 11.0, 12.0],
      12: [9.5, 10.5, 11.5, 12.5],
      13: [10.0, 11.0, 12.0, 13.0],
      14: [10.5, 11.5, 12.5, 13.5],
      15: [11.0, 12.0, 13.0, 14.0],
      16: [11.2, 12.2, 13.2, 14.2],
      17: [11.4, 12.4, 13.4, 14.4],
      18: [11.5, 12.5, 13.5, 14.5],
      19: [11.5, 12.5, 13.5, 14.5],
    },
    '5m': {
      10: [1.28, 1.20, 1.14, 1.08],
      11: [1.24, 1.16, 1.10, 1.04],
      12: [1.20, 1.12, 1.06, 1.00],
      13: [1.16, 1.09, 1.03, 0.97],
      14: [1.13, 1.06, 1.00, 0.95],
      15: [1.11, 1.04, 0.98, 0.93],
      16: [1.10, 1.03, 0.97, 0.92],
      17: [1.09, 1.02, 0.97, 0.91],
      18: [1.08, 1.01, 0.96, 0.91],
      19: [1.08, 1.01, 0.96, 0.90],
    },
    syottopenkki: {
      10: [5, 7, 10, 14],
      11: [6, 8, 11, 15],
      12: [7, 9, 12, 16],
      13: [7, 10, 13, 17],
      14: [8, 11, 14, 17],
      15: [8, 11, 14, 18],
      16: [9, 12, 15, 18],
      17: [9, 12, 15, 18],
      18: [9, 12, 15, 18],
      19: [9, 12, 15, 18],
    },
  },
};

// Testit jotka ovat KÄÄNTEISIÄ (pienempi on parempi)
const HH_KAANTEINEN = new Set(['30m','5m','kasirata','sm_juoksu','sm_pallo','pujottelu']);

// H-H testit ja niiden liikeketjukytkökset
const HH_TESTIT_META = {
  '30m':        { nimi: '30m sprint',       ketju: 'sbl', yksikko: 's' },
  '5m':         { nimi: '5m kiihdytys',     ketju: 'sfl', yksikko: 's' },
  kasirata:     { nimi: 'Kasirata',         ketju: 'll',  yksikko: 's' },
  cmj:          { nimi: 'CMJ',              ketju: 'sbl', yksikko: 'cm' },
  sm_juoksu:    { nimi: 'SM-juoksu',        ketju: 'll',  yksikko: 's' },
  sm_pallo:     { nimi: 'SM-pallo',         ketju: 'sl',  yksikko: 's' },
  pujottelu:    { nimi: 'Pujottelu',        ketju: 'sl',  yksikko: 's' },
  mas:          { nimi: 'MAS',              ketju: 'sfl', yksikko: 'km/h' },
  syottopenkki: { nimi: 'Syöttöpenkki',    ketju: 'sl',  yksikko: 'p' },
};

// ─────────────────────────────────────────────────────────────────────────────
// KERROS 1: TEKNIIKKAKILPAILUT — MERKKIRAJAT
//
// Pisteytys: Kulta / Hopea / Pronssi per suorite per ikä+sukupuoli
// Rakenne: TK_MERKKIRAJAT[sukupuoli][laji][ikä] = { kulta, hopea, pronssi }
//
// Kulta  = korkein merkki (erinomainen)
// Hopea  = hyvä suoritus
// Pronssi = hyväksytty suoritus
//
// Lähteet: SPL tekniikkakilpailut 2024–2026
// ─────────────────────────────────────────────────────────────────────────────
// Kokonaistulosrajat SEKUNTEINA per ikä+sukupuoli (tekniikkakilpailu, pienempi parempi).
// Korvasi aiemmat lajikohtaiset TK_MERKKIRAJAT — kaikki 5 lajia ovat nyt aikatestejä.
// Lähde: SPL tekniikkakilpailut + pilottikalibrointi 2026-05.
const TK_KOKONAISRAJAT = {
  P: {
    8:  { kulta: 95,  hopea: 105, pronssi: 120 },
    9:  { kulta: 85,  hopea: 100, pronssi: 115 },
    10: { kulta: 100, hopea: 120, pronssi: 140 },
    11: { kulta: 90,  hopea: 110, pronssi: 130 },
    12: { kulta: 80,  hopea: 90,  pronssi: 105 },
    13: { kulta: 75,  hopea: 85,  pronssi: 100 },
  },
  T: {
    8:  { kulta: 110, hopea: 125, pronssi: 140 },
    9:  { kulta: 105, hopea: 120, pronssi: 135 },
    10: { kulta: 110, hopea: 135, pronssi: 155 },
    11: { kulta: 105, hopea: 125, pronssi: 145 },
    12: { kulta: 95,  hopea: 115, pronssi: 135 },
    13: { kulta: 90,  hopea: 110, pronssi: 130 },
  },
};

// Tekniikkakilpailut — lajit ja metadata
// Kaikki tekniikkakilpailun lajit ovat aikatestejä (sekunnit), pienempi parempi.
const TK_LAJIT_META = {
  ponnauttelu:      { nimi: 'Ponnauttelu',        yksikko: 's', kaanteinen: true },
  syotto:           { nimi: 'Syöttö pujotellen',  yksikko: 's', kaanteinen: true },
  pujottelu:        { nimi: 'Pujottelu',          yksikko: 's', kaanteinen: true },
  kuljetus_laukaus: { nimi: 'Kuljetus-laukaus',   yksikko: 's', kaanteinen: true },
  pituuspotku:      { nimi: 'Pituuspotku',        yksikko: 's', kaanteinen: true },
};

// ─────────────────────────────────────────────────────────────────────────────
// LASKENTAFUNKTIOT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Laskee H-H testin tason (1–5) yhdelle suoritukselle.
 * @param {string} testi  - testin id (esim. '30m', 'cmj')
 * @param {number} arvo   - mitattu arvo
 * @param {number} ika    - pelaajan ikä vuosina
 * @param {string} sp     - sukupuoli 'P' tai 'T'
 * @returns {number} taso 1–5
 */
function hhLaskeTaso(testi, arvo, ika, sp) {
  const sukuNormit = HH_NORMIT[sp] || HH_NORMIT['P'];
  const testiNormit = sukuNormit[testi];
  if (!testiNormit) return null;

  // Interpoloi lähimmät ikärajat (käytä lähintä saatavilla olevaa ikää)
  const ikaInt = Math.round(Math.max(10, Math.min(19, ika)));
  const rajat = testiNormit[ikaInt] || testiNormit[Object.keys(testiNormit)[0]];
  if (!rajat) return null;

  const [t2, t3, t4, t5] = rajat; // raja-arvot tasojen välillä
  const kaanteinen = HH_KAANTEINEN.has(testi);

  if (kaanteinen) {
    // Pienempi on parempi (esim. aika)
    if (arvo > t2)  return 1;
    if (arvo > t3)  return 2;
    if (arvo > t4)  return 3;
    if (arvo > t5)  return 4;
    return 5;
  } else {
    // Suurempi on parempi (esim. hyppy, MAS)
    if (arvo < t2)  return 1;
    if (arvo < t3)  return 2;
    if (arvo < t4)  return 3;
    if (arvo < t5)  return 4;
    return 5;
  }
}

/**
 * Laskee laskennalliset H-H metrikat (EI, FVP, TSI).
 * @param {object} tulokset - {cmj, sj, '5m', '30m', sm_juoksu, sm_pallo}
 * @returns {object} {ei, fvp, tsi, eiTulkinta, fvpTulkinta, tsiTulkinta}
 */
function hhLaskeMetrikat(tulokset) {
  const result = {};

  // EI = CMJ − SJ (elastisuusindeksi, SSC-hyödyntämiskyky)
  if (tulokset.cmj != null && tulokset.sj != null) {
    result.ei = parseFloat((tulokset.cmj - tulokset.sj).toFixed(1));
    result.eiTulkinta = result.ei >= 8 ? 'erinomainen' :
                        result.ei >= 5 ? 'hyvä' :
                        result.ei >= 3 ? 'kehittyvä' : 'prioriteetti';
  }

  // FVP = 5m / (30m / 6) — voima-nopeus-profiili
  if (tulokset['5m'] != null && tulokset['30m'] != null) {
    const fvp = tulokset['5m'] / (tulokset['30m'] / 6);
    result.fvp = parseFloat(fvp.toFixed(2));
    result.fvpTulkinta = fvp < 0.90 ? 'nopeusprofiili' :
                         fvp <= 1.10 ? 'tasapainoinen' : 'voimaprofiili';
  }

  // TSI = SM-juoksu − SM-pallo (tekniikka-nopeus-indeksi)
  if (tulokset.sm_juoksu != null && tulokset.sm_pallo != null) {
    result.tsi = parseFloat((tulokset.sm_pallo - tulokset.sm_juoksu).toFixed(2));
    result.tsiTulkinta = result.tsi <= 0.5 ? 'erinomainen' :
                         result.tsi <= 1.0 ? 'hyvä' :
                         result.tsi <= 1.5 ? 'kehittyvä' : 'prioriteetti';
  }

  return result;
}

/**
 * Laskee OVR-indeksin (0–100) H-H testituloksista.
 * OVR = painotettu keskiarvo tasoista, normalisoitu 0–100.
 * Painotukset: liikeketjun tärkeyden mukaan jalkapallossa.
 * @param {object} tasot - {testi: taso} esim. {'30m': 3, cmj: 4, ...}
 * @returns {number} OVR 0–100
 */
function hhLaskeOVR(tasot) {
  // Painotukset testien tärkeydelle jalkapallossa
  const PAINOT = {
    '30m':        1.5,  // maksiminopeus — kriittinen
    '5m':         1.5,  // kiihdytys — kriittinen
    kasirata:     1.2,  // ketteryys
    cmj:          1.2,  // räjähtävyys
    sm_juoksu:    1.0,
    sm_pallo:     1.3,  // tekniikka — tärkeä ennustaja
    pujottelu:    1.3,  // tekniikka
    mas:          1.0,  // kestävyys
    syottopenkki: 1.0,
  };

  let pisteet = 0;
  let painoYhteensa = 0;

  Object.entries(tasot).forEach(([testi, taso]) => {
    if (taso != null && PAINOT[testi]) {
      pisteet += taso * PAINOT[testi];
      painoYhteensa += PAINOT[testi];
    }
  });

  if (painoYhteensa === 0) return null;
  // Taso 1–5 → 0–100: (ka - 1) / 4 × 100
  const kaske = pisteet / painoYhteensa;
  return Math.round(((kaske - 1) / 4) * 100);
}

/**
 * Laskee tekniikkakilpailun merkin yhdelle suoritukselle.
 * @param {string} laji   - 'ponnauttelu'|'syotto'|'pujottelu'|'kuljetus_laukaus'|'pituuspotku'
 * @param {number} arvo   - mitattu arvo
 * @param {number} ika    - pelaajan ikä
 * @param {string} sp     - 'P'|'T'
 * @returns {string|null} 'kulta'|'hopea'|'pronssi'|null
 */
// Merkki KOKONAISTULOKSESTA (sekuntia, pienempi parempi) — ei enää lajikohtainen.
function tkLaskeMerkki(kokonaistulos, ika, sp) {
  const sukuRajat = TK_KOKONAISRAJAT[sp] || TK_KOKONAISRAJAT['P'];
  const rajat = sukuRajat[Math.round(ika)];
  if (!rajat || kokonaistulos == null) return null;
  if (kokonaistulos <= rajat.kulta)   return 'kulta';
  if (kokonaistulos <= rajat.hopea)   return 'hopea';
  if (kokonaistulos <= rajat.pronssi) return 'pronssi';
  return null;
}

/**
 * Laskee TKI-indeksin (Tekninen taitoindeksi, 0–100) tekniikkakilpailujen tuloksista.
 * TKI = (Syöttö×0.40) + (Pujottelu×0.30) + (SM-pallo×0.30), normalisoitu biologiseen ikään.
 * Tässä käytetään merkkejä: kulta=3, hopea=2, pronssi=1, ei merkkiä=0.
 * @param {object} merkit - {syotto:'kulta', pujottelu:'hopea', ...}
 * @returns {number} TKI 0–100
 */
// TKI 0–100 nelivyöhykkeellä KOKONAISTULOKSESTA (sekuntia, pienempi parempi).
function tkLaskeTKI(kokonaistulos, ika, sp) {
  const sukuRajat = TK_KOKONAISRAJAT[sp] || TK_KOKONAISRAJAT['P'];
  const rajat = sukuRajat[Math.round(ika)];
  if (!rajat || kokonaistulos == null || kokonaistulos <= 0) return null;
  let tki;
  if (kokonaistulos <= rajat.kulta) {
    tki = 80 + 20 * (rajat.kulta / kokonaistulos);
    tki = Math.max(80, Math.min(100, tki));
  } else if (kokonaistulos <= rajat.hopea) {
    tki = 60 + 20 * ((rajat.hopea - kokonaistulos) / (rajat.hopea - rajat.kulta));
  } else if (kokonaistulos <= rajat.pronssi) {
    tki = 40 + 20 * ((rajat.pronssi - kokonaistulos) / (rajat.pronssi - rajat.hopea));
  } else {
    const maksimi = rajat.pronssi * 1.5;
    tki = 40 * ((maksimi - kokonaistulos) / (maksimi - rajat.pronssi));
    tki = Math.max(0, tki);
  }
  return Math.round(tki);
}

// Pituuspotku-aikabonus: paras potku metreinä / 5, max 20 s.
function tkPituuspotkuBonus(metrit) {
  if (!metrit || isNaN(metrit) || metrit <= 0) return 0;
  return Math.min(20, metrit / 5);
}

// Kokonaistulos sekunteina (pienempi parempi): 4 aikalajia (kuljetus_laukaus.tulos sisältää
// tarkkuusvähennykset + ennenaikaisrangaistukset), miinus pituuspotku-aikabonus (vain ikä >= 12).
function laskeKokonaistulos(testit, ika, sp) {
  if (!testit) return null;
  const aikaArvo = (id) => {
    const v = testit[id];
    if (v == null) return null;
    if (typeof v === 'object') return (v.tulos != null ? v.tulos : v.paras);
    return v;
  };
  const lajit = ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'];
  let summa = 0, n = 0;
  lajit.forEach(id => { const a = aikaArvo(id); if (a != null && !isNaN(a)) { summa += a; n++; } });
  if (n === 0) return null;
  if (ika >= 12) {
    const pp = testit.pituuspotku;
    const metrit = (pp && typeof pp === 'object') ? (pp.metrit != null ? pp.metrit : pp.paras) : pp;
    summa -= tkPituuspotkuBonus(metrit);
  }
  return Math.round(summa * 100) / 100;
}

// Vahvuudet ja kehityskohteet lajiosuuksien perusteella (4 aikalajia; pituuspotku pois).
// Pienempi osuus kokonaisajasta = suhteessa nopeampi = vahvuus; suurempi osuus = kehityskohde.
function _laskeVahvuudetJaKehityskohteet(tulokset, pelaaja, tap) {
  const t = (tulokset && tulokset.testit) ? tulokset.testit : (tulokset || {});
  const lajit = ['ponnauttelu', 'syotto', 'pujottelu', 'kuljetus_laukaus'];
  const aikaArvo = (id) => {
    const v = t[id];
    if (v == null) return null;
    if (typeof v === 'object') return (v.tulos != null ? v.tulos : v.paras);
    return v;
  };
  const out = { vahvuudet: [], kehityskohteet: [], trendi: null };
  const arvot = {}; let summa = 0, n = 0;
  lajit.forEach(id => { const a = aikaArvo(id); if (a != null && !isNaN(a) && a > 0) { arvot[id] = a; summa += a; n++; } });
  if (n === 0 || summa <= 0) return out;
  const tasainen = 1 / n;
  const ika = (pelaaja && pelaaja.ika != null) ? pelaaja.ika : 12;
  const leikkija = ika <= 10;
  Object.keys(arvot).forEach(id => {
    const osuus = arvot[id] / summa;
    const poikkeama = (osuus - tasainen) / tasainen; // <0 = vahvuus, >0 = kehityskohde
    const taso = Math.round((tasainen / osuus) * 100);
    const nimi = (TK_LAJIT_META[id] && TK_LAJIT_META[id].nimi) || id;
    if (poikkeama <= -0.10) {
      out.vahvuudet.push({ laji: id, nimi: nimi, taso: taso,
        teksti: leikkija ? 'Tämä sujuu sinulta hienosti!' : 'Vahvuutesi — ikäistesi kärkeä tässä lajissa' });
    } else if (poikkeama >= 0.15) {
      out.kehityskohteet.push({ laji: id, nimi: nimi, taso: taso,
        teksti: leikkija ? 'Tässä voit harjoitella vielä lisää' : 'Tässä sinulla on eniten kasvunvaraa juuri nyt' });
    }
  });
  out.vahvuudet.sort((a, b) => b.taso - a.taso);
  out.kehityskohteet.sort((a, b) => a.taso - b.taso);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOUKKUEEN AVAINLUVUT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Laskee joukkueen avainluvut H-H testituloksista.
 * @param {Array} pelaajaTulokset - [{pelaajaId, ika, sp, tulokset: {...}}]
 * @returns {object} avainluvut
 */
function laskeJoukkuenHHAvainluvut(pelaajaTulokset) {
  const testit = Object.keys(HH_TESTIT_META);
  const kaikki = { ovrKa: 0, ovrJakauma: {1:0,2:0,3:0,4:0,5:0} };
  const testiKa = {}; // per testi: taso-keskiarvo
  const testiJakauma = {}; // per testi: montako per taso

  testit.forEach(t => {
    testiKa[t] = null;
    testiJakauma[t] = {1:0,2:0,3:0,4:0,5:0};
  });

  let ovrYhteensa = 0;
  let ovrLkm = 0;

  pelaajaTulokset.forEach(pelaaja => {
    const tasot = {};
    testit.forEach(testi => {
      const arvo = pelaaja.tulokset && pelaaja.tulokset[testi];
      if (arvo != null) {
        const taso = hhLaskeTaso(testi, arvo, pelaaja.ika, pelaaja.sp || 'P');
        if (taso) {
          tasot[testi] = taso;
          testiJakauma[testi][taso]++;
        }
      }
    });

    const ovr = hhLaskeOVR(tasot);
    if (ovr != null) {
      ovrYhteensa += ovr;
      ovrLkm++;
      // OVR-jakauma: 0-19=1, 20-39=2, 40-59=3, 60-79=4, 80-100=5
      const ovrTaso = ovr < 20 ? 1 : ovr < 40 ? 2 : ovr < 60 ? 3 : ovr < 80 ? 4 : 5;
      kaikki.ovrJakauma[ovrTaso]++;
    }
  });

  kaikki.ovrKa = ovrLkm > 0 ? Math.round(ovrYhteensa / ovrLkm) : null;
  kaikki.pelaajiaMitattu = ovrLkm;

  // Per-testi-keskiarvot
  testit.forEach(testi => {
    const arvot = pelaajaTulokset
      .map(p => p.tulokset && p.tulokset[testi] != null
        ? hhLaskeTaso(testi, p.tulokset[testi], p.ika, p.sp || 'P')
        : null)
      .filter(Boolean);
    testiKa[testi] = arvot.length > 0
      ? parseFloat((arvot.reduce((a,b) => a+b, 0) / arvot.length).toFixed(1))
      : null;
  });

  // Liikeketjukohtaiset vahvuudet/heikkoudet
  const ketjuKa = { sbl: [], sfl: [], ll: [], sl: [] };
  testit.forEach(testi => {
    const meta = HH_TESTIT_META[testi];
    if (meta && testiKa[testi] != null) {
      ketjuKa[meta.ketju]?.push(testiKa[testi]);
    }
  });
  const ketjuIndeksit = {};
  Object.entries(ketjuKa).forEach(([ketju, arvot]) => {
    ketjuIndeksit[ketju] = arvot.length > 0
      ? parseFloat((arvot.reduce((a,b) => a+b, 0) / arvot.length).toFixed(1))
      : null;
  });

  // Kehityskohteet: testit joissa joukkueen taso-ka on alle 3
  const kehityskohteet = testit
    .filter(t => testiKa[t] != null && testiKa[t] < 3.0)
    .sort((a,b) => testiKa[a] - testiKa[b])
    .slice(0, 3);

  // Vahvuudet: testit joissa taso-ka yli 3.5
  const vahvuudet = testit
    .filter(t => testiKa[t] != null && testiKa[t] >= 3.5)
    .sort((a,b) => testiKa[b] - testiKa[a])
    .slice(0, 3);

  return {
    ovrKa:          kaikki.ovrKa,
    ovrJakauma:     kaikki.ovrJakauma,
    pelaajiaMitattu: kaikki.pelaajiaMitattu,
    testiKa,
    testiJakauma,
    ketjuIndeksit,
    kehityskohteet,
    vahvuudet,
  };
}

/**
 * Laskee joukkueen TKI-avainluvut tekniikkakilpailuista.
 * @param {Array} pelaajaTulokset - [{pelaajaId, ika, sp, tulokset: {laji: arvo}}]
 * @returns {object}
 */
function laskeJoukkuenTKIAvainluvut(pelaajaTulokset) {
  // Kokonaistuloksen merkkijakauma (ei enää lajikohtainen)
  const merkkiJakauma = { kulta: 0, hopea: 0, pronssi: 0, ei: 0 };
  let tkiYhteensa = 0;
  let tkiLkm = 0;

  pelaajaTulokset.forEach(pelaaja => {
    const sp = pelaaja.sp || 'P';
    const kt = laskeKokonaistulos(pelaaja.tulokset, pelaaja.ika, sp);
    if (kt == null) return;
    const merkki = tkLaskeMerkki(kt, pelaaja.ika, sp);
    merkkiJakauma[merkki || 'ei']++;
    const tki = tkLaskeTKI(kt, pelaaja.ika, sp);
    if (tki != null) { tkiYhteensa += tki; tkiLkm++; }
  });

  const yhteensaMerkit = merkkiJakauma.kulta + merkkiJakauma.hopea + merkkiJakauma.pronssi + merkkiJakauma.ei;
  const kultaOsuus = yhteensaMerkit > 0 ? Math.round(merkkiJakauma.kulta / yhteensaMerkit * 100) : 0;

  return {
    tkiKa:           tkiLkm > 0 ? Math.round(tkiYhteensa / tkiLkm) : null,
    pelaajiaMitattu:  tkiLkm,
    merkkiJakauma,   // { kulta, hopea, pronssi, ei } kokonaistuloksesta
    kultaOsuus,      // kultamerkin osuus % kokonaistuloksesta
    tkiTaso: tkiLkm > 0 ? (
      Math.round(tkiYhteensa / tkiLkm) >= 80 ? 'erinomainen' :
      Math.round(tkiYhteensa / tkiLkm) >= 60 ? 'hyvä' :
      Math.round(tkiYhteensa / tkiLkm) >= 40 ? 'kehittyvä' : 'prioriteetti'
    ) : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KERROS 2: RÄJÄHTÄVYYSPROFIILI — EI, FVP, VNE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EI — Elastisuusindeksi (Stretch-Shortening Cycle, SSC)
 *
 * Mittaa kuinka paljon pelaaja hyötyy joustoliikkeestä.
 * CMJ = kevennyshyppy (varastoi elastista energiaa akillesjänteeseen)
 * SJ  = kyykkylähtöinen hyppy ilman kevennystä (pelkkä lihasvoima)
 * EI  = CMJ − SJ → erotus kertoo joustovoiman hyödyntämiskyvyn
 *
 * Tavoitteet (pojat): U12 ≥3cm, U14 ≥5cm, U18+ ≥8cm
 * Matala EI → pelaaja on "jäykkä", ei hyödynnä kehon jousimekanismia
 * → harjoitetaan eksentrisen + plyometrisen harjoittelun avulla
 *
 * @param {number} cmj - kevennyshyppy cm
 * @param {number} sj  - kyykkylähtöinen hyppy cm
 * @param {number} ika - pelaajan ikä
 * @returns {object} { arvo, tulkinta, tavoite, kehityssuositus }
 */
function laskeEI(cmj, sj, ika) {
  if (cmj == null || sj == null) return null;
  const ei = parseFloat((cmj - sj).toFixed(1));

  // Ikäkohtaiset tavoitteet
  const tavoite = ika <= 12 ? 3 : ika <= 14 ? 5 : ika <= 16 ? 6 : 8;

  let tulkinta, kehityssuositus;
  if (ei >= tavoite * 1.4) {
    tulkinta = 'erinomainen';
    kehityssuositus = 'Erinomainen SSC-hyödyntämiskyky. Ylläpidä plyometrinen harjoittelu.';
  } else if (ei >= tavoite) {
    tulkinta = 'hyvä';
    kehityssuositus = 'Hyvä elastisuus. Lisää pudotushypyt ja kontrastiharjoittelu.';
  } else if (ei >= tavoite * 0.6) {
    tulkinta = 'kehittyvä';
    kehityssuositus = 'Elastisuus kehittyy. Priorisoi eksentrinen harjoittelu + akillesjänteen hoito.';
  } else {
    tulkinta = 'prioriteetti';
    kehityssuositus = 'Matala SSC-hyödyntäminen. Aloita peruselastisuusharjoittelu ennen plyometriaa.';
  }

  return { arvo: ei, tulkinta, tavoite, kehityssuositus, cmj, sj };
}

/**
 * FVP — Voima-nopeus-profiili
 *
 * Kertoo onko pelaaja voima- vai nopeusprofiili.
 * Osoittaja (5m) = kiihdytysvaihe → räjähtävä voimantuotto
 * Nimittäjä (30m/6) = maksiminopeusvaiheen suhteellinen referenssi
 *
 * <0.90 = nopeusprofiili → parempi maksiminopeudessa kuin kiihdytyksessä
 *          → harjoita: räjähtävä voimaharjoittelu, kyykky, maastaveto
 * 0.90–1.10 = tasapainoinen → optimaalinen useimmille peli-paikoille
 * >1.10 = voimaprofiili → parempi kiihdytyksessä kuin maksiminopeudessa
 *          → harjoita: nopeus + plyometria + flying-sprintit
 *
 * @param {number} m5  - 5m aika sekunteina
 * @param {number} m30 - 30m aika sekunteina
 * @param {string} pelipaikka - vapaaehtoinen, tarkentaa suosituksen
 * @returns {object} { arvo, profiili, tulkinta, harjoitussuositus }
 */
function laskeFVP(m5, m30, pelipaikka) {
  if (m5 == null || m30 == null) return null;
  const fvp = parseFloat((m5 / (m30 / 6)).toFixed(2));

  let profiili, tulkinta, harjoitussuositus;
  if (fvp < 0.85) {
    profiili = 'nopeus';
    tulkinta = 'Selkeä nopeusprofiili — maksiminopeus vahva, kiihdytys kehityskohde';
    harjoitussuositus = 'Räjähtävä voimaharjoittelu: takakyykky, maastaveto, pudotushypyt. Lyhyet kiihdytysloikat 0–10m.';
  } else if (fvp < 0.90) {
    profiili = 'nopeus_tasapainoinen';
    tulkinta = 'Lähellä tasapainoa — lievästi nopeuspainotteinen';
    harjoitussuositus = 'Lisää räjähtävää voimatyötä. Kontrastiharjoittelu (voimaharjoite + sprintti samassa sessiossa).';
  } else if (fvp <= 1.10) {
    profiili = 'tasapainoinen';
    tulkinta = 'Tasapainoinen voima-nopeus-profiili — optimaalinen useimmille pelipaikoille';
    harjoitussuositus = 'Ylläpidä molempia. Pelipaikkakohtainen priorisointi IDP:stä.';
  } else if (fvp <= 1.20) {
    profiili = 'voima_tasapainoinen';
    tulkinta = 'Lähellä tasapainoa — lievästi voimapainotteinen';
    harjoitussuositus = 'Lisää nopeusharjoittelua: flying-sprintit 20–40m, reaktiosprintit.';
  } else {
    profiili = 'voima';
    tulkinta = 'Selkeä voimaprofiili — kiihdytys vahva, maksiminopeus kehityskohde';
    harjoitussuositus = 'Nopeus + plyometria: flying-sprintit, askeltiheysharjoitteet, suunnanmuutossprintit.';
  }

  // Pelipaikkakohtainen lisäkommentti
  const pelipaikkaHuomio = {
    W:   fvp > 1.10 ? '⚠️ Laitahyökkääjälle nopeusprofiili on tärkeämpi — priorisoi maksiminopeus' : '✓ Profiili sopii laitalle',
    ST:  fvp < 0.90 ? '⚠️ Kärjelle räjähtävä kiihdytys on kriittinen — lisää voimatyötä' : '✓ Profiili sopii kärjelle',
    CD:  fvp < 1.00 ? '⚠️ Puolustajalle voima on tärkein — lisää räjähtävää voimaharjoittelua' : '✓ Profiili sopii puolustajalle',
    CDM: '✓ Tasapainoinen profiili sopii DM-rooliin',
    FB:  fvp > 1.10 ? '⚠️ Laitapuolustajalle maksiminopeus kriittinen' : '✓ Profiili sopii laitapuolustajalle',
  };

  return {
    arvo: fvp,
    profiili,
    tulkinta,
    harjoitussuositus,
    pelipaikkaHuomio: pelipaikka ? (pelipaikkaHuomio[pelipaikka] || '') : '',
    m5, m30,
  };
}

/**
 * VNE — Voima-Nopeus-Elastisuus-profiili
 *
 * Yhdistää EI, FVP ja absoluuttisen nopeustason yhdeksi
 * räjähtävyysprofiiliksi. Kertoo millainen räjähtävä jalkapalloilija
 * pelaaja on kokonaisuutena ja mikä on harjoittelun prioriteetti.
 *
 * Profiilityypit:
 * - "Räjähdys"   : korkea EI + nopeus + tasapainoinen FVP → valmis
 * - "Jousi"      : korkea EI mutta matala nopeus → kehitä maksiminopeutta
 * - "Moottori"   : korkea nopeus mutta matala EI → kehitä elastisuutta
 * - "Rakentaja"  : voimaprofiili, kehitä nopeuspuolta
 * - "Perusta"    : kaikki kehittyvällä tasolla → kokonaisvaltainen kehitys
 *
 * @param {object} params - { cmj, sj, m5, m30, taso30m, ika, pelipaikka }
 * @returns {object} profiili kokonaisuutena
 */
function laskeVNE(params) {
  const { cmj, sj, m5, m30, taso30m, ika, pelipaikka } = params;

  const ei  = laskeEI(cmj, sj, ika);
  const fvp = laskeFVP(m5, m30, pelipaikka);

  // Normalisoi pisteet 0-100 skaalaan
  const eiPisteet  = ei  ? Math.min(100, Math.round((ei.arvo / (ei.tavoite * 1.5)) * 100)) : null;
  const nopeusP    = taso30m ? Math.round(((taso30m - 1) / 4) * 100) : null;
  const fvpP       = fvp ? (
    fvp.profiili === 'tasapainoinen'        ? 100 :
    fvp.profiili.includes('tasapainoinen')  ? 75 : 50
  ) : null;

  // Laske VNE-kokonaisindeksi (jos kaikki saatavilla)
  const komponentit = [eiPisteet, nopeusP, fvpP].filter(v => v != null);
  const vneIndeksi = komponentit.length > 0
    ? Math.round(komponentit.reduce((a,b) => a+b, 0) / komponentit.length)
    : null;

  // Tunnista profiilityyppi
  let profiilityyppi = 'perusta';
  let profiiliKuvaus = '';
  let harjoitusPrioriteetti = [];

  if (ei && fvp && taso30m) {
    const eiHyvä    = ei.tulkinta === 'erinomainen' || ei.tulkinta === 'hyvä';
    const nopeusHyvä = taso30m >= 4;
    const fvpOk     = fvp.profiili === 'tasapainoinen' || fvp.profiili.includes('tasapainoinen');

    if (eiHyvä && nopeusHyvä && fvpOk) {
      profiilityyppi = 'rajahdys';
      profiiliKuvaus = '⚡ Räjähdys — erinomainen räjähtävyysprofiili kokonaisuutena';
      harjoitusPrioriteetti = ['Ylläpidä kaikki osa-alueet', 'Pelipaikkakohtainen viimeistely'];
    } else if (eiHyvä && !nopeusHyvä) {
      profiilityyppi = 'jousi';
      profiiliKuvaus = '🏹 Jousi — hyvä elastisuus mutta maksiminopeus kehityskohde';
      harjoitusPrioriteetti = ['Flying-sprintit 20–40m', 'Askeltiheysharjoitteet', 'Kontrastiharjoittelu'];
    } else if (!eiHyvä && nopeusHyvä) {
      profiilityyppi = 'moottori';
      profiiliKuvaus = '🔧 Moottori — hyvä maksiminopeus, elastisuus kehityskohde';
      harjoitusPrioriteetti = ['Pudotushypyt', 'Eksentrinen harjoittelu', 'Akillesharjoitteet'];
    } else if (fvp.profiili === 'voima' || fvp.profiili === 'voima_tasapainoinen') {
      profiilityyppi = 'rakentaja';
      profiiliKuvaus = '🏗️ Rakentaja — vahva voimaperusta, nopeus kehityskohde';
      harjoitusPrioriteetti = ['Maksiminopeussprintit', 'Reaktioharjoitteet', 'Plyometria'];
    } else {
      profiilityyppi = 'perusta';
      profiiliKuvaus = '🌱 Perusta — kokonaisvaltainen räjähtävyyskehitys käynnissä';
      harjoitusPrioriteetti = ['Perusvoimaharjoittelu', 'Tekniset sprintit', 'Peruselastisuus'];
    }
  }

  return {
    vneIndeksi,
    profiilityyppi,
    profiiliKuvaus,
    harjoitusPrioriteetti,
    kattavuus: komponentit.length,    // montako 3:sta komponentista saatavilla
    maxKattavuus: 3,
    komponentit: { ei, fvp, nopeusTaso: taso30m, eiPisteet, nopeusP, fvpP },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME IQ — ADAR-ARVIOINTIJÄRJESTELMÄ
//
// Filosofia: "Pelaaja ensin" — Game IQ aukeaa pelaajalle kun hän saa
// arvioinnin. Valmennuspäällikön ja valmentajan yhteispeli.
//
// Moderni jalkapallo vaatii:
//   - Nopea syöttö edullisessa asemassa olevalle (Assess → Decide <1s)
//   - Prässilinjan murtaminen syötöllä (Decide: oikea ajoitus + suunta)
//   - 10-paikan läpäisy syötöllä puolilinjan yli (Act: tekninen tarkkuus)
//   - Boksin sisään syöttö pystypaluulle (kaikki 4 vaihetta yhdistettynä)
//
// Nämä ovat ADAR:n todennettavia ilmiöitä — ei mielipidekysymyksiä.
// ─────────────────────────────────────────────────────────────────────────────

// ADAR-dimensiot ja niiden pelitilannekytköset
const ADAR_DIMENSIOT = {
  assess: {
    nimi:        'Assess — Havainto',
    ikoni:       '🔍',
    kysymys:     'Katsaako pelaaja ylös ennen vastaanottoa ja lukee pelin?',
    pelitilanne: 'Näkeekö hän vapaan pelaajan ennen kuin pallo saapuu?',
    merkit:      ['skannausfrekvenssi','pään asento','silmien liike ennen kosketusta'],
    ikäraja:     8,   // käytössä U8+
    maxPisteet:  3,
  },
  decide: {
    nimi:        'Decide — Päätös',
    ikoni:       '⚡',
    kysymys:     'Tekeekö pelaaja nopean ja oikean päätöksen?',
    pelitilanne: 'Murtaako hän prässilinjan syötöllä vai jää kiinni?',
    merkit:      ['päätösnopeus <1s','johdonmukaisuus','valinnan laatu paineessa'],
    ikäraja:     13,  // käytössä U13+
    maxPisteet:  3,
  },
  act: {
    nimi:        'Act — Toteutus',
    ikoni:       '💥',
    kysymys:     'Toteutuuko suunniteltu liike teknisesti paineessa?',
    pelitilanne: 'Meneekö syöttö boksin sisään pystypaluulle vai ei?',
    merkit:      ['tekninen laatu paineessa','tarkkuus','nopeus'],
    ikäraja:     13,  // käytössä U13+
    maxPisteet:  3,
  },
  reassess: {
    nimi:        'Re-assess — Palautuminen',
    ikoni:       '🔄',
    kysymys:     'Palautuuko pelaaja virheestä vai jähmettyy?',
    pelitilanne: 'Jatkaako hän peliä virheen jälkeen vai vetäytyy tilanteista?',
    merkit:      ['palautumisaika <15s','seuraava toiminta','asenne'],
    ikäraja:     16,  // täysi ADAR U16+
    maxPisteet:  3,
  },
};

// Pelitilannescenaariot ADAR-arviointiin
// Nämä ovat konkreettisia tilanteita joita valmentaja havainnoi kentällä
const ADAR_SKENAARIOT = {
  // Skenaario 1: Prässilinjan murto syötöllä
  pressi_murto: {
    nimi:        'Prässilinjan murto',
    kuvaus:      'Vastustaja prässää korkealla. Pelaaja vastaanottaa pallon puolustuspäässä.',
    mitataanADAR: ['assess','decide','act'],
    arvioitavat: [
      'Näkeekö pelaaja vapaan pelaajan prässin takana ennen vastaanottoa? (Assess)',
      'Syöttääkö hän eteenpäin prässin läpi vai peruuttaa turvallisesti? (Decide)',
      'Meneekö syöttö täsmälleen vapaan pelaajan jalkoihin? (Act)',
    ],
    pelipaikat:  ['CD','CDM','GK'],
    moderniFokus: 'Korkea prässi on modernin jalkapallon tärkein taktinen elementti. Pelaaja joka ei pysty syöttämään prässin läpi pakottaa joukkueen aina palaamaan taaksepäin.',
  },
  // Skenaario 2: 10-paikan läpäisy puolilinjan yli
  kymmenen_paikka: {
    nimi:        '10-paikan läpäisy',
    kuvaus:      'Pelaaja saa pallon 10-paikalla. Vastustajan puolilinja on kiinni.',
    mitataanADAR: ['assess','decide','act'],
    arvioitavat: [
      'Näkeekö pelaaja syvyysjuoksun ennen vastaanottoa? (Assess)',
      'Tunnistaa oikean hetken syötölle — ennen vai jälkeen vastustajan siirron? (Decide)',
      'Tekninen läpilyönti — puolilinjan yli oikeaan tilaan? (Act)',
    ],
    pelipaikat:  ['CAM','CDM','CM'],
    moderniFokus: 'Moderni 10-paikka ei vedä itse vaan syöttää — nopea kierrättäminen puolilinjan läpi on joukkueen tärkein hyökkäyselementti.',
  },
  // Skenaario 3: Boksin sisäinen syöttö pystypaluulle
  boksi_syotto: {
    nimi:        'Boksin sisäinen syöttö',
    kuvaus:      'Pallo kulkee laidalle. Pelaaja näkee pystypaluun boksin sisällä.',
    mitataanADAR: ['assess','decide','act'],
    arvioitavat: [
      'Skannaako pelaaja boksin sisälle ennen laidasaantia? (Assess)',
      'Syöttääkö hän boksin sisään oikeaan aikaan ennen puolustajan siirtoa? (Decide)',
      'Syöttö löytää juoksijan jalkoihin — ei liian aikaisin eikä liian myöhään? (Act)',
    ],
    pelipaikat:  ['W','FB','ST'],
    moderniFokus: 'Boksin sisäinen syöttö pystypaluulle on todennäköisin maalintekotilanne. Pelaaja joka näkee ja löytää tämän tilanteen säännöllisesti on erittäin arvokas.',
  },
  // Skenaario 4: Nopea kierrätys edullisessa asemassa
  nopea_kierratys: {
    nimi:        'Nopea kierrätys 2v1',
    kuvaus:      'Joukkueella on 2v1-ylivoima. Pelaajalla on pallo ja vapaa joukkuetoveri.',
    mitataanADAR: ['assess','decide','act','reassess'],
    arvioitavat: [
      'Tunnistaa ylivoiman ennen vastaanottoa? (Assess)',
      'Syöttää välittömästi vai menee itse? Oikea päätös? (Decide)',
      'Syöttö oikeaan aikaan — ei liian myöhään kun puolustaja ehtii sulkea? (Act)',
      'Jos menettää pallon — palaa heti puolustusasentoon? (Re-assess)',
    ],
    pelipaikat:  ['kaikki'],
    moderniFokus: 'Nopea ylivoiman hyödyntäminen on modernin positional play -jalkapallon ydin. Pelaaja joka ei syötä nopeasti pakottaa joukkueen hitaaseen pelaamiseen.',
  },
};

// ADAR-pisteytysfunktio ikäluokan mukaan
const ADAR_IKATASOT = {
  U8_U12:  { dimensiot: ['assess'],                      maxPisteet: 3,  nimi: 'Taso 1 — Havainnoija' },
  U13_U15: { dimensiot: ['assess','decide','act'],       maxPisteet: 9,  nimi: 'Taso 2 — Arvioija' },
  U16_U19: { dimensiot: ['assess','decide','act','reassess'], maxPisteet: 12, nimi: 'Taso 3 — Täysi ADAR' },
};

/**
 * Laskee ADAR-tason ikäluokan mukaan.
 * @param {number} ika
 * @returns {object} ADAR-ikätaso
 */
function adarHaeIkaTaso(ika) {
  if (ika < 13) return { ...ADAR_IKATASOT.U8_U12,  koodiNimi: 'U8_U12' };
  if (ika < 16) return { ...ADAR_IKATASOT.U13_U15, koodiNimi: 'U13_U15' };
  return { ...ADAR_IKATASOT.U16_U19, koodiNimi: 'U16_U19' };
}

/**
 * Laskee ADAR-kokonaispisteet ja tulkinnan yhdestä arviointikerrasta.
 *
 * @param {object} pisteet - { assess: 0-3, decide: 0-3, act: 0-3, reassess: 0-3 }
 * @param {number} ika     - pelaajan ikä (määrittää mitkä dimensiot lasketaan)
 * @param {string} skenaario - vapaaehtoinen, esim. 'pressi_murto'
 * @returns {object} { yhteensa, maxPisteet, prosentti, taso, dimensioTulkinnat, skenaarionOpetus }
 */
function laskeADARPisteet(pisteet, ika, skenaario) {
  const ikaTaso = adarHaeIkaTaso(ika);
  let yhteensa = 0;

  const dimensioTulkinnat = {};
  ikaTaso.dimensiot.forEach(dim => {
    const p = pisteet[dim] ?? 0;
    yhteensa += p;
    dimensioTulkinnat[dim] = {
      pisteet: p,
      max:     3,
      taso:    p === 3 ? 'erinomainen' : p === 2 ? 'hyvä' : p === 1 ? 'kehittyvä' : 'ei havaittu',
      ...ADAR_DIMENSIOT[dim],
    };
  });

  const prosentti   = Math.round((yhteensa / ikaTaso.maxPisteet) * 100);
  const taso        = prosentti >= 80 ? 'erinomainen' :
                      prosentti >= 60 ? 'hyvä' :
                      prosentti >= 40 ? 'kehittyvä' : 'prioriteetti';

  // Heikoin dimensio → harjoitussuositus
  const heikoinDim = ikaTaso.dimensiot
    .filter(d => pisteet[d] != null)
    .sort((a,b) => (pisteet[a]??0) - (pisteet[b]??0))[0];

  const harjoitussuositukset = {
    assess:   'Skannausharjoitteet: pallonkäsittely + pään kohottaminen. Honey Trap -drilli. "Katso ennen kuin otat pallon."',
    decide:   'Dual-Task Rondo: pyöritetään palloa + valmentaja huutaa suunnan. Paineistettu 4v4+1. Tavoite: päätös alle 1 sekunnissa.',
    act:      'Paineistettu tekninen harjoittelu: sama syöttö ensin ilman vastustajaa → sitten puolustaja mukaan. Transfer peliin.',
    reassess: 'Error Recovery -drilli: tahallinen virhe harjoituksessa → pelaaja pakko jatkaa välittömästi. Resilience coaching.',
  };

  return {
    yhteensa,
    maxPisteet:  ikaTaso.maxPisteet,
    prosentti,
    taso,
    ikaTaso:     ikaTaso.nimi,
    dimensioTulkinnat,
    heikoinDimensio:    heikoinDim,
    harjoitussuositus:  heikoinDim ? harjoitussuositukset[heikoinDim] : null,
    skenaarionOpetus:   skenaario ? ADAR_SKENAARIOT[skenaario] : null,
    // Hidden Gem / X-Factor -kytkös
    onXFactorSignaali:  prosentti >= 80 && ika >= 13,
    onHiddenGemSignaali: prosentti >= 60 && ika >= 13 && pisteet.decide >= 2,
  };
}

/**
 * Laskee ADAR-trendin useammasta arviointikerrasta.
 * Kertoo kehittyykö pelaajan Game IQ yli ajan.
 *
 * @param {Array} arvioinnit - [{ pvm, pisteet, ika, skenaario }]
 * @returns {object} { trendi, kehitysvauhti, viimeisinTulos, paras, heikoin }
 */
function laskeADARTrendi(arvioinnit) {
  if (!arvioinnit || arvioinnit.length < 2) return null;

  // Järjestä aikajärjestykseen
  const jarjestetty = [...arvioinnit].sort((a,b) => new Date(a.pvm) - new Date(b.pvm));

  const tulokset = jarjestetty.map(a => {
    const tulos = laskeADARPisteet(a.pisteet, a.ika, a.skenaario);
    return { pvm: a.pvm, prosentti: tulos.prosentti, yhteensa: tulos.yhteensa };
  });

  const ensimmainen = tulokset[0].prosentti;
  const viimeisin   = tulokset[tulokset.length-1].prosentti;
  const muutos      = viimeisin - ensimmainen;

  // Kuukausien määrä
  const kuukaudet = (new Date(jarjestetty[jarjestetty.length-1].pvm) - new Date(jarjestetty[0].pvm))
    / (30 * 24 * 3600 * 1000);

  const kehitysvauhti = kuukaudet > 0
    ? parseFloat((muutos / kuukaudet).toFixed(1))
    : null;

  return {
    trendi:          muutos > 5 ? 'nouseva' : muutos < -5 ? 'laskeva' : 'tasainen',
    muutosProsentti: muutos,
    kehitysvauhti,   // % per kuukausi
    viimeisinTulos:  viimeisin,
    paras:           Math.max(...tulokset.map(t => t.prosentti)),
    heikoin:         Math.min(...tulokset.map(t => t.prosentti)),
    arviointiKerrat: tulokset.length,
    aikajana:        tulokset,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE-RAKENNE (dokumentaatio)
//
// Kaikki testitulokset:
// seurat/{seuraId}/testit/{testId}
// {
//   tyyppi:        'hh' | 'tekniikka' | 'harjoitettavuus'
//   pelaajaId:     string
//   pelaajaNimi:   string
//   seuraId:       string
//   joukkue:       string
//   ika:           number
//   sp:            'P' | 'T'
//   bioIka:        number | null  (PHV-laskennasta)
//   pvm:           string (ISO date)
//   kausi:         string (esim. '2025-2026')
//   testaaja:      string (uid)
//   testaajaEmail: string
//
//   // H-H testit:
//   tulokset: { '30m': 4.45, cmj: 38, ... }
//   tasot:    { '30m': 3, cmj: 4, ... }   // laskettu automaattisesti
//   ovr:      72                            // laskettu automaattisesti
//   metrikat: { ei: 5.2, fvp: 0.98, tsi: 0.8 }  // laskettu automaattisesti
//
//   // Tekniikkakilpailut:
//   tulokset: { ponnauttelu: 48, syotto: 22, pujottelu: 13.2, ... }
//   merkit:   { ponnauttelu: 'kulta', syotto: 'hopea', ... }
//   tki:      74                            // laskettu automaattisesti
//
//   // Harjoitettavuuskartoitus:
//   tulokset: { valakyykky: 2, luistelijan_kyykky: 3, ... }
//   flei:     67                            // laskettu VP-näkymässä
//
//   luotu:    Timestamp
// }
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EKSPORTTI (käytä joko module.exports tai globaalina)
// ─────────────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // H-H normitaulukot
    HH_NORMIT, HH_KAANTEINEN, HH_TESTIT_META,
    // Tekniikkakilpailut
    TK_KOKONAISRAJAT, TK_LAJIT_META,
    // H-H laskenta
    hhLaskeTaso, hhLaskeMetrikat, hhLaskeOVR,
    // TKI laskenta
    tkLaskeMerkki, tkLaskeTKI, laskeKokonaistulos, _laskeVahvuudetJaKehityskohteet, tkPituuspotkuBonus,
    // Joukkueen avainluvut
    laskeJoukkuenHHAvainluvut, laskeJoukkuenTKIAvainluvut,
    // Räjähtävyysprofiili
    laskeEI, laskeFVP, laskeVNE,
    // Game IQ / ADAR
    ADAR_DIMENSIOT, ADAR_SKENAARIOT, ADAR_IKATASOT,
    adarHaeIkaTaso, laskeADARPisteet, laskeADARTrendi,
  };
} else {
  window.TM_TESTIT = {
    HH_NORMIT, HH_KAANTEINEN, HH_TESTIT_META,
    TK_KOKONAISRAJAT, TK_LAJIT_META,
    hhLaskeTaso, hhLaskeMetrikat, hhLaskeOVR,
    tkLaskeMerkki, tkLaskeTKI, laskeKokonaistulos, _laskeVahvuudetJaKehityskohteet, tkPituuspotkuBonus,
    laskeJoukkuenHHAvainluvut, laskeJoukkuenTKIAvainluvut,
    laskeEI, laskeFVP, laskeVNE,
    ADAR_DIMENSIOT, ADAR_SKENAARIOT, ADAR_IKATASOT,
    adarHaeIkaTaso, laskeADARPisteet, laskeADARTrendi,
  };
}
