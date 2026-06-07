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
    // 30m sprint (s) — KÄÄNTEINEN (pienempi on parempi) — Palloliitto FINAL2024 (2026-06-05)
    '30m': {
      10: [5.31, 5.15, 5.01, 4.88],
      11: [5.14, 4.99, 4.86, 4.73],
      12: [4.97, 4.82, 4.69, 4.56],
      13: [4.81, 4.65, 4.52, 4.37],
      14: [4.57, 4.42, 4.29, 4.17],
      15: [4.41, 4.28, 4.18, 4.08],
      16: [4.31, 4.18, 4.13, 4.02],
      17: [4.24, 4.11, 4.06, 3.96],
      18: [4.19, 4.07, 3.99, 3.86],
      19: [4.14, 4.00, 3.93, 3.81],
      M: [4.08, 3.96, 3.87, 3.77],
    },
    // 5m (s) — KÄÄNTEINEN — Palloliitto FINAL2024 (2026-06-05)
    '5m': {
      10: [1.18, 1.14, 1.11, 1.08],
      11: [1.15, 1.11, 1.09, 1.05],
      12: [1.12, 1.08, 1.05, 1.02],
      13: [1.09, 1.05, 1.02, 0.99],
      14: [1.05, 1.01, 0.99, 0.96],
      15: [1.03, 0.99, 0.97, 0.94],
      16: [1.01, 0.97, 0.95, 0.92],
      17: [0.99, 0.95, 0.93, 0.90],
      18: [0.97, 0.93, 0.91, 0.88],
      19: [0.95, 0.91, 0.89, 0.87],
      M: [0.94, 0.90, 0.88, 0.86],
    },
    // Kasirata (s) — KÄÄNTEINEN — Palloliitto FINAL2024 (2026-06-05)
    kasirata: {
      10: [7.44, 7.32, 7.18, 7.05],
      11: [7.32, 7.19, 7.05, 6.90],
      12: [7.17, 7.04, 6.90, 6.74],
      13: [7.03, 6.91, 6.74, 6.58],
      14: [6.93, 6.75, 6.60, 6.45],
      15: [6.88, 6.67, 6.52, 6.37],
      16: [6.80, 6.58, 6.46, 6.30],
      17: [6.63, 6.45, 6.30, 6.19],
      18: [6.48, 6.32, 6.18, 6.04],
      19: [6.37, 6.23, 6.10, 5.95],
      M: [6.29, 6.16, 6.04, 5.90],
    },
    // CMJ (cm) — normaali (suurempi on parempi) — Palloliitto FINAL2024 (2026-06-05)
    cmj: {
      10: [22.3, 23.7, 25.5, 27.3],
      11: [23.5, 25.5, 27.2, 29.3],
      12: [25.2, 27.2, 29.1, 32.2],
      13: [27.3, 29.4, 31.4, 35.2],
      14: [30.7, 32.8, 35.1, 38.1],
      15: [33.0, 35.4, 37.5, 41.3],
      16: [35.2, 37.9, 39.6, 43.0],
      17: [36.4, 40.3, 42.1, 45.1],
      18: [37.9, 41.9, 44.2, 46.6],
      19: [39.3, 44.3, 46.0, 48.5],
      M: [41.1, 45.7, 49.0, 52.0],
    },
    // SM-juoksu pallotta (s) — KÄÄNTEINEN — Palloliitto FINAL2024 (2026-06-05)
    sm_juoksu: {
      10: [9.40, 9.09, 8.83, 8.55],
      11: [9.03, 8.73, 8.50, 8.21],
      12: [8.73, 8.45, 8.21, 8.00],
      13: [8.49, 8.22, 7.99, 7.73],
      14: [8.36, 8.08, 7.84, 7.58],
      15: [8.03, 7.82, 7.64, 7.45],
      16: [7.80, 7.61, 7.49, 7.35],
      17: [7.73, 7.52, 7.42, 7.27],
      18: [7.66, 7.45, 7.36, 7.19],
      19: [7.58, 7.38, 7.28, 7.11],
      M: [7.49, 7.29, 7.18, 7.01],
    },
    // SM-pallo (s) — KÄÄNTEINEN — Palloliitto FINAL2024 (2026-06-05)
    sm_pallo: {
      10: [11.02, 10.58, 10.24, 9.89],
      11: [10.53, 10.14, 9.84, 9.51],
      12: [10.18, 9.86, 9.58, 9.27],
      13: [9.92, 9.56, 9.31, 8.98],
      14: [9.57, 9.28, 9.04, 8.75],
      15: [9.31, 9.02, 8.83, 8.57],
      16: [8.99, 8.74, 8.60, 8.39],
      17: [8.82, 8.60, 8.47, 8.30],
      18: [8.74, 8.52, 8.41, 8.21],
      19: [8.65, 8.44, 8.32, 8.13],
      M: [8.55, 8.34, 8.22, 8.02],
    },
    // Pujottelu (s) — KÄÄNTEINEN — H-H 3-portainen (taso 1-3), FINAL2024. Vain P10-15.
    pujottelu: {
      10: [29.1, 26.3],
      11: [27.8, 25.0],
      12: [26.8, 24.0],
      13: [26.1, 23.3],
      14: [25.6, 22.5],
      15: [25.0, 21.8],
    },
    // MAS (km/h) — normaali (suurempi on parempi) — Palloliitto FINAL2024, m/s ×3.6 (2026-06-05)
    mas: {
      10: [13.32, 13.68, 14.04, 14.40],
      11: [14.04, 14.40, 14.76, 15.12],
      12: [14.40, 15.12, 15.52, 15.84],
      13: [14.98, 15.48, 15.84, 16.20],
      14: [15.26, 15.84, 16.20, 16.56],
      15: [15.66, 16.20, 16.56, 16.92],
      16: [16.02, 16.56, 16.92, 17.28],
      17: [16.02, 16.56, 17.24, 17.64],
      18: [16.38, 16.92, 17.64, 18.00],
      19: [16.38, 16.92, 17.64, 18.36],
      M: [16.74, 17.28, 18.00, 18.36],
    },
    // Syöttö (s) — KÄÄNTEINEN — H-H 3-portainen (taso 1-3), FINAL2024. Vain P10-15.
    syotto: {
      10: [44.9, 38.7],
      11: [41.4, 36.0],
      12: [39.5, 35.0],
      13: [38.0, 33.0],
      14: [35.0, 31.1],
      15: [34.0, 30.0],
    },
  },
  T: { // Tytöt — omat normit — Palloliitto FINAL2024 (2026-06-05)
    '30m': {
      10: [5.48, 5.31, 5.16, 5.00],
      11: [5.36, 5.14, 5.00, 4.84],
      12: [5.12, 4.96, 4.83, 4.69],
      13: [4.96, 4.83, 4.71, 4.59],
      14: [4.88, 4.75, 4.63, 4.52],
      15: [4.83, 4.68, 4.55, 4.43],
      16: [4.80, 4.63, 4.51, 4.33],
      17: [4.75, 4.61, 4.44, 4.31],
      18: [4.73, 4.56, 4.41, 4.26],
      19: [4.70, 4.53, 4.39, 4.22],
      N: [4.65, 4.45, 4.33, 4.18],
    },
    cmj: {
      10: [19.8, 22.5, 24.0, 26.2],
      11: [21.0, 23.7, 25.2, 27.9],
      12: [22.2, 25.3, 26.5, 29.3],
      13: [23.2, 26.3, 27.7, 30.5],
      14: [25.0, 28.4, 29.4, 32.2],
      15: [26.7, 29.5, 32.2, 34.5],
      16: [27.4, 30.0, 33.2, 35.4],
      17: [27.8, 30.5, 34.4, 36.0],
      18: [28.7, 30.5, 34.4, 37.0],
      19: [29.2, 31.5, 34.8, 37.8],
      N: [29.7, 33.4, 35.9, 38.6],
    },
    kasirata: {
      10: [7.70, 7.63, 7.45, 7.23],
      11: [7.51, 7.38, 7.26, 7.15],
      12: [7.35, 7.22, 7.10, 6.94],
      13: [7.16, 7.00, 6.86, 6.74],
      14: [7.08, 6.94, 6.80, 6.70],
      15: [7.04, 6.90, 6.75, 6.65],
      16: [7.00, 6.85, 6.70, 6.59],
      17: [6.96, 6.80, 6.65, 6.55],
      18: [6.90, 6.76, 6.59, 6.51],
      19: [6.82, 6.65, 6.51, 6.45],
      N: [6.76, 6.60, 6.49, 6.42],
    },
    sm_juoksu: {
      10: [9.60, 9.30, 9.05, 8.77],
      11: [9.26, 8.99, 8.76, 8.50],
      12: [8.92, 8.70, 8.50, 8.29],
      13: [8.73, 8.51, 8.32, 8.11],
      14: [8.67, 8.42, 8.21, 7.97],
      15: [8.61, 8.39, 8.10, 7.95],
      16: [8.45, 8.28, 8.05, 7.90],
      17: [8.38, 8.25, 7.98, 7.85],
      18: [8.30, 8.20, 7.91, 7.80],
      19: [8.25, 8.15, 7.86, 7.75],
      N: [8.20, 8.08, 7.80, 7.68],
    },
    sm_pallo: {
      10: [11.96, 11.39, 10.90, 10.49],
      11: [11.32, 10.83, 10.43, 9.95],
      12: [10.87, 10.40, 10.11, 9.64],
      13: [10.46, 10.12, 9.86, 9.41],
      14: [10.19, 9.74, 9.53, 9.23],
      15: [9.74, 9.51, 9.22, 9.07],
      16: [9.56, 9.35, 9.10, 8.95],
      17: [9.48, 9.32, 9.04, 8.90],
      18: [9.40, 9.27, 8.97, 8.85],
      19: [9.35, 9.22, 8.92, 8.80],
      N: [9.30, 9.15, 8.86, 8.73],
    },
    pujottelu: {
      10: [32.0, 28.0],
      11: [29.8, 26.3],
      12: [28.2, 25.1],
      13: [27.5, 24.9],
      14: [27.0, 24.2],
      15: [26.3, 23.5],
    },
    mas: {
      10: [12.24, 12.74, 13.28, 13.68],
      11: [12.60, 13.10, 13.57, 14.04],
      12: [12.96, 13.39, 13.93, 14.40],
      13: [13.32, 13.68, 14.29, 14.76],
      14: [13.68, 14.04, 14.62, 15.12],
      15: [13.86, 14.22, 14.80, 15.30],
      16: [14.04, 14.58, 14.98, 15.48],
      17: [14.22, 14.76, 15.16, 15.66],
      18: [14.40, 14.94, 15.34, 15.84],
      19: [14.58, 15.12, 15.52, 16.02],
      N: [14.76, 15.30, 15.66, 16.20],
    },
    '5m': {
      10: [1.20, 1.16, 1.13, 1.10],
      11: [1.18, 1.13, 1.10, 1.07],
      12: [1.14, 1.10, 1.08, 1.05],
      13: [1.12, 1.08, 1.06, 1.03],
      14: [1.11, 1.07, 1.05, 1.02],
      15: [1.10, 1.06, 1.03, 1.00],
      16: [1.09, 1.05, 1.02, 0.99],
      17: [1.08, 1.04, 1.01, 0.98],
      18: [1.07, 1.03, 1.00, 0.97],
      19: [1.06, 1.02, 0.99, 0.96],
      N: [1.05, 1.01, 0.98, 0.95],
    },
    // Syöttö (s) — KÄÄNTEINEN — H-H 3-portainen (taso 1-3), FINAL2024. Vain T10-15.
    syotto: {
      10: [51.2, 43.8],
      11: [46.9, 40.2],
      12: [42.7, 37.0],
      13: [40.9, 35.8],
      14: [39.3, 34.0],
      15: [38.5, 32.8],
    },
  },
};

// Testit jotka ovat KÄÄNTEISIÄ (pienempi on parempi)
const HH_KAANTEINEN = new Set(['30m','5m','kasirata','sm_juoksu','sm_pallo','pujottelu','syotto']);

// H-H 3-portaiset testit (taso 1-3 eikä 1-5); taulukon pituus 2 = [taso2_raja, taso3_raja].
const HH_ASTEIKKO_3 = new Set(['pujottelu','syotto']);

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
  syotto:       { nimi: 'Syöttö (H-H)',     ketju: 'sl',  yksikko: 's' },
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
  syotto:           { nimi: 'Syöttö',  yksikko: 's', kaanteinen: true },
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

  const ikaInt = Math.round(Math.max(10, Math.min(19, ika)));
  // EI fallbackia toiseen ikään: 3-portaiset (pujottelu/syotto) pätevät vain 10-15,
  // joten 16+ → null (ei bogus-tasoa P10-normeista). 5-portaisilla kaikki 10-19 löytyvät.
  const rajat = testiNormit[ikaInt];
  if (!rajat || !rajat.length) return null;

  // rajat = [taso2_raja, taso3_raja, ...]; pituus 4 → 5-portainen (1-5), pituus 2 → 3-portainen (1-3).
  const n = rajat.length;
  const kaanteinen = HH_KAANTEINEN.has(testi);

  if (kaanteinen) {
    // Pienempi on parempi (esim. aika)
    for (let i = 0; i < n; i++) { if (arvo > rajat[i]) return i + 1; }
    return n + 1;
  } else {
    // Suurempi on parempi (esim. hyppy, MAS)
    for (let i = 0; i < n; i++) { if (arvo < rajat[i]) return i + 1; }
    return n + 1;
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
    syotto:       1.0,  // tekniikka (H-H syöttö)
  };

  let pisteet = 0;
  let painoYhteensa = 0;

  Object.entries(tasot).forEach(([testi, taso]) => {
    if (taso != null && PAINOT[testi]) {
      // 3-portaiset (taso 1-3) skaalataan 5-portaiselle (1→1, 2→3, 3→5), jotta ne eivät
      // vääristä painotettua keskiarvoa alaspäin. Näyttö pysyy 1-3, vain OVR normalisoi.
      const tasoNorm = HH_ASTEIKKO_3.has(testi) ? 1 + (taso - 1) * 2 : taso;
      pisteet += tasoNorm * PAINOT[testi];
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
function tkLaskeMerkki(kokonaistulos, ika, sp, rajatOverride) {
  const rajat = rajatOverride || (TK_KOKONAISRAJAT[sp] || TK_KOKONAISRAJAT['P'])[Math.round(ika)];
  if (!rajat || kokonaistulos == null) return null;
  if (kokonaistulos < rajat.kulta)   return 'kulta';
  if (kokonaistulos < rajat.hopea)   return 'hopea';
  if (kokonaistulos < rajat.pronssi) return 'pronssi';
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
function tkLaskeTKI(kokonaistulos, ika, sp, rajatOverride) {
  var sukuRajat = rajatOverride || (TK_KOKONAISRAJAT[sp] || TK_KOKONAISRAJAT['P']);
  // rajatOverride voi olla suoraan {kulta,hopea,pronssi} tai sukupuolittainen {P:{8:{...}}}
  var rajat = (rajatOverride && rajatOverride.kulta != null)
    ? rajatOverride
    : (sukuRajat[Math.round(ika)] || null);
  if (!rajat || kokonaistulos == null || kokonaistulos <= 0) return null;
  let tki;
  if (kokonaistulos <= rajat.kulta) {
    // Vyöhyke 4: interpoloi 80→99 kultarajalta kohti ideaalia.
    // Math.min estää ideaalin kasvamisen suuremmaksi kuin kokonaistulos
    const ideaali = Math.min(rajat.kulta * 0.5, kokonaistulos * 0.5);
    tki = 80 + 20 * ((rajat.kulta - kokonaistulos) / (rajat.kulta - ideaali));
    tki = Math.max(80, Math.min(99, tki));
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
