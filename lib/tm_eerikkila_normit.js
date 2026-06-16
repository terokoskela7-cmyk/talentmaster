/**
 * TalentMaster™ — tm_eerikkila_normit.js
 *
 * Eerikkilä-Palloliitto fyysisteknisten ominaisuustestien
 * tavoitetasot 2024 (päivitetty 20.5.2024 / 14.10.2024)
 *
 * Lähde: Poikien ja miesten jalkapallon fyysisteknisten
 *        ominaisuustestien tavoitetasot FINAL2024
 *        Tyttöjen ja naisten jalkapallon fyysisteknisten
 *        ominaisuustestien tavoitetasot FINAL2024
 *
 * Järjestelmä: 5-portainen (1-5), poikkeuksena lajitekniikka (1-3)
 *   Taso 5 = kansainvälinen kärkitaso (paras 10%)
 *   Taso 4 = kansallinen kärkitaso (paras 25%)
 *   Taso 3 = hieman yli kansallisen keskitason (paras 45%)
 *   Taso 2 = hieman alle kansallisen keskitason (paras 70%)
 *   Taso 1 = alle kansallisen keskitason
 *
 * Pienempi arvo = parempi (nopeustesteissä)
 * Suurempi arvo = parempi (hyppy cm, MAS m/s)
 * Lajitekniikka: pienempi = parempi (aika sekunteina)
 *
 * Käyttö:
 *   eerikkilaTaso(4.88, 'nopeus_30m', 14, 'M')  // → 3
 *   eerikkilaTaso(38, 'hyppy_cj', 13, 'M')       // → 3
 *   eerikkilaTaso(22.5, 'pujottelu', 14, 'M')    // → 3
 */

'use strict';

// ─── Normitaulukot ─────────────────────────────────────────────────────────
// Ikäluokat: 10,11,12,13,14,15,16,17,18,19,'M' (miehet) tai 'N' (naiset)
// Arvorakenne per ikäluokka: [taso5_raja, taso4_raja, taso3_raja, taso2_raja]
// Tulkinta:
//   pienempi_parempi=true:  arvo <= taso5_raja → taso 5, <= taso4_raja → taso 4, jne.
//   pienempi_parempi=false: arvo >= taso5_raja → taso 5, >= taso4_raja → taso 4, jne.

const EERIKKILA_NORMIT = {

  // ══════════════════════════════════════════════════════════════════════════
  // 1. LINEAARINOPEUS (sekunteina — pienempi on parempi)
  // ══════════════════════════════════════════════════════════════════════════

  nopeus_5m: {
    pienempi_parempi: true,
    pojat: {
      10:[1.08,1.11,1.14,1.18], 11:[1.05,1.09,1.11,1.15], 12:[1.02,1.05,1.08,1.12],
      13:[0.99,1.02,1.05,1.09], 14:[0.96,0.99,1.01,1.05], 15:[0.94,0.97,0.99,1.03],
      16:[0.92,0.95,0.97,1.01], 17:[0.90,0.93,0.95,0.99], 18:[0.88,0.91,0.93,0.97],
      19:[0.87,0.89,0.91,0.95], M:[0.86,0.88,0.90,0.94]
    },
    tytot: {
      10:[1.10,1.13,1.16,1.20], 11:[1.07,1.10,1.13,1.18], 12:[1.05,1.08,1.10,1.14],
      13:[1.03,1.06,1.08,1.12], 14:[1.02,1.05,1.07,1.11], 15:[1.00,1.03,1.06,1.10],
      16:[0.99,1.02,1.05,1.09], 17:[0.98,1.01,1.04,1.08], 18:[0.97,1.00,1.03,1.07],
      19:[0.96,0.99,1.02,1.06], N:[0.95,0.98,1.01,1.05]
    }
  },

  nopeus_10m: {
    pienempi_parempi: true,
    pojat: {
      10:[1.92,1.97,2.02,2.08], 11:[1.88,1.93,1.97,2.02], 12:[1.81,1.86,1.91,1.97],
      13:[1.75,1.81,1.86,1.92], 14:[1.69,1.74,1.78,1.84], 15:[1.67,1.71,1.74,1.80],
      16:[1.64,1.68,1.71,1.75], 17:[1.62,1.65,1.67,1.73], 18:[1.59,1.63,1.65,1.71],
      19:[1.57,1.59,1.63,1.68], M:[1.54,1.57,1.61,1.66]
    },
    tytot: {
      10:[1.96,2.01,2.06,2.12], 11:[1.91,1.96,2.01,2.08], 12:[1.85,1.91,1.95,2.01],
      13:[1.83,1.87,1.91,1.96], 14:[1.81,1.85,1.89,1.95], 15:[1.78,1.83,1.87,1.93],
      16:[1.75,1.81,1.85,1.92], 17:[1.74,1.78,1.84,1.90], 18:[1.72,1.77,1.83,1.89],
      19:[1.71,1.76,1.81,1.88], N:[1.69,1.75,1.80,1.86]
    }
  },

  nopeus_20m: {
    pienempi_parempi: true,
    pojat: {
      10:[3.42,3.51,3.60,3.70], 11:[3.34,3.42,3.50,3.60], 12:[3.22,3.31,3.39,3.49],
      13:[3.09,3.19,3.28,3.38], 14:[2.97,3.06,3.14,3.24], 15:[2.91,3.00,3.06,3.14],
      16:[2.87,2.96,2.99,3.09], 17:[2.82,2.91,2.94,3.04], 18:[2.79,2.86,2.91,3.00],
      19:[2.74,2.80,2.86,2.96], M:[2.71,2.76,2.82,2.91]
    },
    tytot: {
      10:[3.50,3.61,3.71,3.82], 11:[3.40,3.50,3.59,3.74], 12:[3.31,3.40,3.48,3.58],
      13:[3.24,3.32,3.39,3.49], 14:[3.20,3.27,3.34,3.44], 15:[3.12,3.21,3.28,3.40],
      16:[3.08,3.19,3.27,3.37], 17:[3.06,3.15,3.26,3.36], 18:[3.04,3.13,3.23,3.34],
      19:[3.00,3.12,3.20,3.32], N:[2.98,3.07,3.16,3.29]
    }
  },

  nopeus_30m: {
    pienempi_parempi: true,
    pojat: {
      10:[4.88,5.01,5.15,5.31], 11:[4.73,4.86,4.99,5.14], 12:[4.56,4.69,4.82,4.97],
      13:[4.37,4.52,4.65,4.81], 14:[4.17,4.29,4.42,4.57], 15:[4.08,4.18,4.28,4.41],
      16:[4.02,4.13,4.18,4.31], 17:[3.96,4.06,4.11,4.24], 18:[3.86,3.99,4.07,4.19],
      19:[3.81,3.93,4.00,4.14], M:[3.77,3.87,3.96,4.08]
    },
    tytot: {
      10:[5.00,5.16,5.31,5.48], 11:[4.84,5.00,5.14,5.36], 12:[4.69,4.83,4.96,5.12],
      13:[4.59,4.71,4.83,4.96], 14:[4.52,4.63,4.75,4.88], 15:[4.43,4.55,4.68,4.83],
      16:[4.33,4.51,4.63,4.80], 17:[4.31,4.44,4.61,4.75], 18:[4.26,4.41,4.56,4.73],
      19:[4.22,4.39,4.53,4.70], N:[4.18,4.33,4.46,4.65]
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 2. SUUNNANMUUTOSNOPEUS (sekunteina — pienempi on parempi)
  // ══════════════════════════════════════════════════════════════════════════

  kasirata: {
    pienempi_parempi: true,
    pojat: {
      10:[7.05,7.18,7.32,7.44], 11:[6.90,7.05,7.19,7.32], 12:[6.74,6.90,7.04,7.17],
      13:[6.58,6.74,6.91,7.03], 14:[6.45,6.60,6.75,6.93], 15:[6.37,6.52,6.67,6.88],
      16:[6.30,6.46,6.58,6.80], 17:[6.19,6.30,6.45,6.63], 18:[6.04,6.18,6.32,6.48],
      19:[5.95,6.10,6.23,6.37], M:[5.90,6.04,6.16,6.29]
    },
    tytot: {
      10:[7.23,7.45,7.63,7.70], 11:[7.15,7.26,7.38,7.51], 12:[6.94,7.10,7.22,7.35],
      13:[6.74,6.86,7.00,7.16], 14:[6.70,6.80,6.94,7.08], 15:[6.65,6.75,6.90,7.04],
      16:[6.59,6.70,6.85,7.00], 17:[6.55,6.65,6.80,6.96], 18:[6.51,6.59,6.76,6.90],
      19:[6.45,6.51,6.65,6.82], N:[6.42,6.49,6.60,6.76]
    }
  },

  sm_juoksu: {
    pienempi_parempi: true,
    pojat: {
      10:[8.55,8.83,9.09,9.40], 11:[8.21,8.50,8.73,9.03], 12:[8.00,8.21,8.45,8.73],
      13:[7.73,7.99,8.22,8.49], 14:[7.58,7.84,8.08,8.36], 15:[7.45,7.64,7.82,8.03],
      16:[7.35,7.49,7.61,7.80], 17:[7.27,7.42,7.52,7.73], 18:[7.19,7.36,7.45,7.66],
      19:[7.11,7.28,7.38,7.58], M:[7.01,7.18,7.29,7.49]
    },
    tytot: {
      10:[8.77,9.05,9.30,9.60], 11:[8.50,8.76,8.99,9.26], 12:[8.29,8.50,8.70,8.92],
      13:[8.11,8.32,8.51,8.73], 14:[7.97,8.21,8.42,8.67], 15:[7.95,8.10,8.39,8.61],
      16:[7.90,8.05,8.28,8.45], 17:[7.85,7.98,8.25,8.38], 18:[7.80,7.91,8.20,8.30],
      19:[7.75,7.86,8.15,8.25], N:[7.68,7.80,8.08,8.20]
    }
  },

  sm_pallo: {
    pienempi_parempi: true,
    pojat: {
      10:[9.89,10.24,10.58,11.02], 11:[9.51,9.84,10.14,10.53], 12:[9.27,9.58,9.86,10.18],
      13:[8.98,9.31,9.56,9.92],  14:[8.75,9.04,9.28,9.57],   15:[8.57,8.83,9.02,9.31],
      16:[8.39,8.60,8.74,8.99],  17:[8.30,8.47,8.60,8.82],   18:[8.21,8.41,8.52,8.74],
      19:[8.13,8.32,8.44,8.65],  M:[8.02,8.22,8.34,8.55]
    },
    tytot: {
      10:[10.49,10.90,11.39,11.96], 11:[9.95,10.43,10.83,11.32], 12:[9.64,10.11,10.40,10.87],
      13:[9.41,9.86,10.12,10.46],   14:[9.23,9.53,9.74,10.19],   15:[9.07,9.22,9.51,9.74],
      16:[8.95,9.10,9.35,9.56],     17:[8.90,9.04,9.32,9.48],    18:[8.85,8.97,9.27,9.40],
      19:[8.80,8.92,9.22,9.35],     N:[8.73,8.86,9.15,9.30]
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 3. NOPEUSVOIMA — Kevennyshyppy (cm — suurempi on parempi)
  // ══════════════════════════════════════════════════════════════════════════

  hyppy_cj: {
    pienempi_parempi: false,
    pojat: {
      10:[27.3,25.5,23.7,22.3], 11:[29.3,27.2,25.5,23.5], 12:[32.2,29.1,27.2,25.2],
      13:[35.2,31.4,29.4,27.3], 14:[38.1,35.1,32.8,30.7], 15:[41.3,37.5,35.4,33.0],
      16:[43.0,39.6,37.9,35.2], 17:[45.1,42.1,40.3,36.4], 18:[46.6,44.2,41.9,37.9],
      19:[48.5,46.0,44.3,39.3], M:[52.0,49.0,45.7,41.1]
    },
    tytot: {
      10:[26.2,24.0,22.5,19.8], 11:[27.9,25.2,23.7,21.0], 12:[29.3,26.5,25.3,22.2],
      13:[30.5,27.7,26.3,23.2], 14:[32.2,29.4,28.4,25.0], 15:[34.5,32.2,29.5,26.7],
      16:[35.4,33.2,30.0,27.4], 17:[36.0,34.4,30.5,27.8], 18:[37.0,34.4,30.5,28.7],
      19:[37.8,34.8,31.5,29.2], N:[38.6,35.9,33.4,29.7]
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 4. KESTÄVYYS — MAS m/s (suurempi on parempi)
  // ══════════════════════════════════════════════════════════════════════════

  mas: {
    pienempi_parempi: false,
    pojat: {
      10:[4.00,3.90,3.80,3.70], 11:[4.20,4.10,4.00,3.90], 12:[4.40,4.31,4.20,4.00],
      13:[4.50,4.40,4.30,4.16], 14:[4.60,4.50,4.40,4.24], 15:[4.70,4.60,4.50,4.35],
      16:[4.80,4.70,4.60,4.45], 17:[4.90,4.79,4.60,4.45], 18:[5.00,4.90,4.70,4.55],
      19:[5.10,4.90,4.70,4.55], M:[5.10,5.00,4.80,4.65]
    },
    tytot: {
      10:[3.80,3.69,3.54,3.40], 11:[3.90,3.77,3.64,3.50], 12:[4.00,3.87,3.72,3.60],
      13:[4.10,3.97,3.80,3.70], 14:[4.20,4.06,3.90,3.80], 15:[4.25,4.11,3.95,3.85],
      16:[4.30,4.16,4.05,3.90], 17:[4.35,4.21,4.10,3.95], 18:[4.40,4.26,4.15,4.00],
      19:[4.45,4.31,4.20,4.05], N:[4.50,4.35,4.25,4.10]
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 5. LAJITEKNIIKKA — 3-portainen (1-3), pienempi aika on parempi
  //    Tavoitetasot vain 15 ikävuoteen asti (P10-P15, T10-T15)
  // ══════════════════════════════════════════════════════════════════════════

  pujottelu: {
    pienempi_parempi: true,
    asteikko: 3,  // HUOM: 3-portainen, ei 5-portainen
    pojat: {
      10:[26.3,29.1], 11:[25.0,27.8], 12:[24.0,26.8],
      13:[23.3,26.1], 14:[22.5,25.6], 15:[21.8,25.0]
      // P16+ ei tavoitetasoja
    },
    tytot: {
      10:[28.0,32.0], 11:[26.3,29.8], 12:[25.1,28.2],
      13:[24.9,27.5], 14:[24.2,27.0], 15:[23.5,26.3]
      // T16+ ei tavoitetasoja
    }
  },

  syotto: {
    pienempi_parempi: true,
    asteikko: 3,  // HUOM: 3-portainen, ei 5-portainen
    pojat: {
      10:[38.7,44.9], 11:[36.0,41.4], 12:[35.0,39.5],
      13:[33.0,38.0], 14:[31.1,35.0], 15:[30.0,34.0]
    },
    tytot: {
      10:[43.8,51.2], 11:[40.2,46.9], 12:[37.0,42.7],
      13:[35.8,40.9], 14:[34.0,39.3], 15:[32.8,38.5]
    }
  }

};

// ─── API ───────────────────────────────────────────────────────────────────

/**
 * Laskee Eerikkilä-tavoitetason raakamittaukselle.
 *
 * @param {number} arvo    Mitattu arvo (s, cm tai m/s)
 * @param {string} testi   Testin nimi (ks. EERIKKILA_NORMIT avaimet)
 * @param {number} ika     Kronologinen ikä (10–19) tai 'M'/'N' aikuisille
 * @param {string} sukup   'M' (mies/poika) | 'N' (nainen/tyttö)
 * @returns {number}       Taso 1-5 (tai 1-3 lajitekniikalle), 0 jos ei dataa
 */
function eerikkilaTaso(arvo, testi, ika, sukup) {
  if (arvo == null || !EERIKKILA_NORMIT[testi]) return 0;

  const testiData = EERIKKILA_NORMIT[testi];
  const taulukko  = sukup === 'M' ? testiData.pojat : testiData.tytot;
  if (!taulukko) return 0;

  // Ikäavain: numero tai 'M'/'N'
  const ikaAvain = (ika === 'M' || ika === 'N') ? ika
    : Math.min(19, Math.max(10, Math.round(ika)));
  const rajat = taulukko[ikaAvain];
  if (!rajat) return 0;

  const maks = testiData.asteikko || 5;  // 3 tai 5

  if (testiData.pienempi_parempi) {
    if (arvo <= rajat[0]) return maks;       // taso 5 tai 3
    if (arvo <= rajat[1]) return maks - 1;
    if (arvo <= rajat[2]) return maks - 2;
    if (maks === 5 && arvo <= rajat[3]) return 2;
    return 1;
  } else {
    if (arvo >= rajat[0]) return maks;
    if (arvo >= rajat[1]) return maks - 1;
    if (arvo >= rajat[2]) return maks - 2;
    if (maks === 5 && arvo >= rajat[3]) return 2;
    return 1;
  }
}

/**
 * Normin viitearvo ikäluokalle: taso-3 kynnys (= keskitaso) detail-paneelin "Normi"-sarakkeelle.
 * Peilaa eerikkilaTaso:n ikä-/sukupuoliresolvoinnin. Palauttaa numeron tai null.
 */
function eerikkilaNormiarvo(testi, ika, sukup) {
  const testiData = EERIKKILA_NORMIT[testi];
  if (!testiData) return null;
  const taulukko = (sukup === 'M' || sukup === 'P') ? testiData.pojat : testiData.tytot;
  if (!taulukko) return null;
  const ikaAvain = (ika === 'M' || ika === 'N') ? ika
    : Math.min(19, Math.max(10, Math.round(ika)));
  const rajat = taulukko[ikaAvain];
  if (!rajat) return null;
  return rajat[2];   // taso-3 kynnys = ikäluokan keskitaso
}

/**
 * Laskee kaikki Eerikkilä-tasot pelaajadatasta kerralla.
 *
 * @param {object} pelaaja  Firestore-pelaajadokumentti
 * @returns {object}        { nopeus_30m: 3, hyppy_cj: 4, ... }
 */
// Iteroi UNIVERSAALI_TESTIREKISTERIN kautta — ei kovakoodattuja kenttänimiä; toimii uusille testeille.
// HUOM kenttäkartoitus: lukee meta.pikakentta-kentän pelaajadatasta (flat). SM-testit (sm_*_viimeisin)
// resolvoituvat; hh_viimeisin_* ovat nested (hh_viimeisin.lin30m) → eivät vielä resolvoidu (myöhempi sprint).
function eerikkilaProfiilit(pelaaja, ika, sukupuoli) {
  if (ika == null) {
    ika = pelaaja.syntymaVuosi ? (new Date().getFullYear() - pelaaja.syntymaVuosi) : null;
  }
  if (sukupuoli == null) sukupuoli = pelaaja.sukupuoli || 'M';
  if (ika == null) return {};
  const sp = (sukupuoli === 'P' || sukupuoli === 'M') ? 'M' : 'N';   // §3: Eerikkilä odottaa 'M'/'N'

  const profiilit = {};
  Object.keys(UNIVERSAALI_TESTIREKISTERI).forEach(function(testiId){
    const meta = UNIVERSAALI_TESTIREKISTERI[testiId];
    if (!meta.eerikkila || meta.lahde !== 'eerikkila') return;   // vain Eerikkilä-normitetut
    const arvo = pelaaja[meta.pikakentta];
    if (arvo == null || isNaN(arvo)) return;
    profiilit[testiId] = {
      arvo: arvo,
      taso: eerikkilaTaso(arvo, meta.eerikkila, ika, sp),
      yksikko: meta.yksikko,
      dimensio: meta.dimensio
    };
  });
  return profiilit;
}

// ─── Laskennalliset metriikat ───────────────────────────────────────────────

/**
 * EI = Elastisuusindeksi (SSC-hyödyntäminen) — SIMPLE versio (palauttaa numeron).
 * Kanoninen rikastettu versio: docs/testit_indeksit.js :: laskeEI(cmj, sj, ika) → object.
 * Tätä käytetään vain jos testit_indeksit.js EI ole ladattu.
 */
function laskeEI_simple(cj_cm, sj_cm) {
  if (cj_cm == null || sj_cm == null) return null;
  return Math.round((cj_cm - sj_cm) * 10) / 10;
}
// Backward-compat: jos testit_indeksit.js ei ole ladattu, tarjoa laskeEI-nimi
if (typeof laskeEI === 'undefined') { var laskeEI = laskeEI_simple; }

/**
 * FVP = Voima-nopeus-profiili — SIMPLE versio (palauttaa numeron).
 * Kanoninen: docs/testit_indeksit.js :: laskeFVP(m5, m30, pelipaikka) → object.
 */
function laskeFVP_simple(n5m_s, n30m_s) {
  if (n5m_s == null || n30m_s == null || n30m_s === 0) return null;
  return Math.round((n5m_s / (n30m_s / 6)) * 100) / 100;
}
if (typeof laskeFVP === 'undefined') { var laskeFVP = laskeFVP_simple; }

/**
 * TSI = Tekniikka-nopeus-indeksi
 * TSI = SM-pallo - SM-juoksu (§22-kanoninen; positiivinen = pallo hidastaa, lähellä nollaa = tekniikka vahva)
 * ≤0.5s = erinomainen, >1.5s = prioriteetti
 */
function laskeTSI(smjuoksu_s, smpallo_s) {
  if (smjuoksu_s == null || smpallo_s == null) return null;
  return Math.round((smpallo_s - smjuoksu_s) * 100) / 100;
}

/**
 * Kiihdytysprofiili 10m + 30m -kumulatiivisista väliajoista (ei vaadi 5m:ää).
 * Vertaa kiihdytysvaihetta (0–10m) huippunopeusvaiheeseen (lentävä 10–30m).
 *   accel_ms  = 10 / t10                (keskinopeus 0–10m)
 *   flying_ms = 20 / (t30 − t10)        (keskinopeus 10–30m, lentävä)
 *   suhde     = flying_ms / accel_ms    (aina > 1; iso ero = huippunopeuspainotteinen)
 * Heuristiset rajat (jr-jalkapallo): <1.35 kiihdytysprofiili · 1.35–1.50 tasapainoinen · >1.50 huippunopeusprofiili.
 */
function laskeKiihdytysprofiili(t10_s, t30_s) {
  if (t10_s == null || t30_s == null) return null;
  const lentava = t30_s - t10_s;
  if (t10_s <= 0 || lentava <= 0) return null;
  const accel_ms = 10 / t10_s;
  const flying_ms = 20 / lentava;
  const suhde = Math.round((flying_ms / accel_ms) * 100) / 100;
  const tyyppi = suhde < 1.35 ? 'kiihdytysprofiili — vahva startti'
    : suhde <= 1.50 ? 'tasapainoinen profiili'
    : 'huippunopeusprofiili — vahva lentävä nopeus';
  return { suhde: suhde, accel_ms: Math.round(accel_ms * 100) / 100, flying_ms: Math.round(flying_ms * 100) / 100, tyyppi: tyyppi };
}

// ════════════════════════════════════════════════════════════════════════════
// H-H/TSI-ANALYYSIMALLI VAIHE 1 (docs/HH_TSI_ANALYYSIMALLI.md) — taso→kohde→määrä→vauhti.
// Kynnykset AINA EERIKKILA_NORMIT-taulukosta (SSOT, ei kovakoodattuja). MAS: data km/h, normi m/s → ÷3.6.
// HH_TESTI_MAP = hh_viimeisin-avain → eerikkila-normiavain + yksikkö + suunta + PHV-herkkyys (§28).
// ════════════════════════════════════════════════════════════════════════════
const HH_TESTI_MAP = {
  lin30m:   { eerikkila: 'nopeus_30m', yksikko: 's',    pienempi: true,  phvHerkka: true },
  lin10m:   { eerikkila: 'nopeus_10m', yksikko: 's',    pienempi: true,  phvHerkka: true },
  lin5m:    { eerikkila: 'nopeus_5m',  yksikko: 's',    pienempi: true,  phvHerkka: true },
  cmj:      { eerikkila: 'hyppy_cj',   yksikko: 'cm',   pienempi: false, phvHerkka: true },
  mas:      { eerikkila: 'mas',        yksikko: 'km/h', pienempi: false, phvHerkka: true,  kmh: true },  // aerobinen → post-PHV-herkkä (§28), EI kehityskohde ilman post-PHV-varmuutta
  kasirata: { eerikkila: 'kasirata',   yksikko: 's',    pienempi: true,  phvHerkka: true },
  sm_pallo: { eerikkila: 'sm_pallo',   yksikko: 's',    pienempi: true,  phvHerkka: false },  // tekniikka → AINA sallittu (ainoa phvHerkka:false)
};
function _hhIkaAvain(ika) { return (ika === 'M' || ika === 'N') ? ika : Math.min(19, Math.max(10, Math.round(ika))); }

// Gap seuraavaan Eerikkilä-tasokynnykseen testin omissa yksiköissä. Taso 5/3 → seuraavaTaso null.
function hhSeuraavaTaso(testi, arvo, ika, sp) {
  const m = HH_TESTI_MAP[testi];
  if (!m || arvo == null || isNaN(arvo)) return null;
  const nd = EERIKKILA_NORMIT[m.eerikkila];
  if (!nd) return null;
  const arvoNorm = m.kmh ? (arvo / 3.6) : arvo;                 // MAS km/h → m/s
  const nyk = eerikkilaTaso(arvoNorm, m.eerikkila, ika, sp);
  if (!nyk) return null;
  const maks = nd.asteikko || 5;
  const r2 = function (x) { return Math.round(x * 100) / 100; };
  if (nyk >= maks) return { nykyinenTaso: nyk, seuraavaTaso: null, kynnys: null, gap: null, yksikko: m.yksikko };
  const seur = nyk + 1;
  const taulukko = (sp === 'M') ? nd.pojat : nd.tytot;
  const rajat = taulukko && taulukko[_hhIkaAvain(ika)];
  if (!rajat || rajat[maks - seur] == null) return null;
  const kynnys = m.kmh ? (rajat[maks - seur] * 3.6) : rajat[maks - seur];   // m/s → km/h paluussa
  const gap = m.pienempi ? r2(arvo - kynnys) : r2(kynnys - arvo);
  return { nykyinenTaso: nyk, seuraavaTaso: seur, kynnys: r2(kynnys), gap: gap, yksikko: m.yksikko };
}

// Vaadittu vuosivauhti = saman tason kynnysero ika vs ika+1 (normit kiristyvät iän myötä). null jos ika+1 puuttuu.
function hhVaadittuVuosivauhti(testi, ika, sp, taso) {
  const m = HH_TESTI_MAP[testi];
  if (!m) return null;
  const nd = EERIKKILA_NORMIT[m.eerikkila];
  if (!nd) return null;
  const maks = nd.asteikko || 5;
  if (taso < 2 || taso > maks) return null;
  const taulukko = (sp === 'M') ? nd.pojat : nd.tytot;
  const i = Math.round(ika);
  const r1 = taulukko && taulukko[i], rNext = taulukko && taulukko[i + 1];
  if (!r1 || !rNext || r1[maks - taso] == null || rNext[maks - taso] == null) return null;
  const k1 = r1[maks - taso], k2 = rNext[maks - taso];
  const diffNorm = m.pienempi ? (k1 - k2) : (k2 - k1);          // positiivinen = kynnys kiristyy
  return Math.round((m.kmh ? diffNorm * 3.6 : diffNorm) * 100) / 100;
}

// Kehityskohde + vahvuus PHV-suodatettuna (§0/§28 EHDOTON — suodatin VAIN täällä, ei UI:ssa).
// ikaDesimaali kutsujalta (syntymaaika → syntymaVuosi → joukkuenimi). phvTila: PHV-tilakoodi tai null.
function hhKehityskohde(hh_viimeisin, ikaDesimaali, sp, phvTila) {
  const hv = hh_viimeisin || {};
  let phvVarmuus, sallitutFyysiset;
  if (phvTila === 'POST' || phvTila === 'AN') { phvVarmuus = 'mitattu'; sallitutFyysiset = true; }
  else if (phvTila === 'PRE' || phvTila === 'LAH' || phvTila === 'PH') { phvVarmuus = 'mitattu'; sallitutFyysiset = false; }
  else {
    const ikaoletus = (sp === 'N' && ikaDesimaali >= 13.0) || (sp === 'M' && ikaDesimaali >= 15.0);
    phvVarmuus = ikaoletus ? 'ikaoletus' : 'epavarma';
    sallitutFyysiset = ikaoletus;
  }
  let kehLaji = null, kehTaso = 99, vahLaji = null, vahTaso = 0;
  Object.keys(HH_TESTI_MAP).forEach(function (testi) {
    const arvo = hv[testi];
    if (arvo == null || isNaN(arvo)) return;
    const m = HH_TESTI_MAP[testi];
    const taso = eerikkilaTaso(m.kmh ? (arvo / 3.6) : arvo, m.eerikkila, ikaDesimaali, sp);
    if (!taso) return;
    if (taso >= 4 && taso > vahTaso) { vahTaso = taso; vahLaji = testi; }     // vahvuus AINA sallittu
    // §0/§28 (EHDOTON): ilman post-PHV-varmuutta (epavarma TAI mitattu PRE/LAH/PH,
    // sallitutFyysiset=false) VAIN tekniikka (sm_pallo, ainoa phvHerkka:false) kelpaa
    // kehityskohteeksi → fyysistä vajetta (30m/MAS/CMJ) ei tulkita kehityskohteeksi.
    // Jos sm_pallo-dataa ei ole → kehLaji jää nulliksi (EI fyysistä fallbackia).
    const onSallittu = (testi === 'sm_pallo') || !m.phvHerkka || sallitutFyysiset;
    if (onSallittu && taso < kehTaso) { kehTaso = taso; kehLaji = testi; }
  });
  return { kehityskohde: kehLaji, vahvuus: vahLaji, phvVarmuus: phvVarmuus, kuormarajoitin: (phvTila === 'PH') };
}

// ════════════════════════════════════════════════════════════════════════════
// TM_SELITTEET — keskitetty lyhennesanasto aikuisnäkymiin (Master/VP). YKSI totuuslähde,
// ei copy-paste-selitteitä. Julkinen kieli (CLAUDE.md §14). Pelaaja-näkymässä EI lyhenteitä.
// ════════════════════════════════════════════════════════════════════════════
const TM_SELITTEET = {
  d1:        'D1 Fyysinen — testitasojen keskiarvo, 1–5 (3 = ikäluokan keskitaso)',
  d2:        'D2 Tekninen — TKI- tai SM-testipohjainen, 1–5 (3 = ikäluokan keskitaso)',
  tki:       'Tekniikkakilpailuindeksi 0–100 ikäluokan merkkirajoja vasten',
  tsi:       'SM-pallo − SM-juoksu: paljonko pallo hidastaa (tavoite < 0.5 s)',
  flei:      'Kehon valmiusindeksi 0–100 % (liikehallintaketjut)',
  hh_taso:   'Huippu-Haastaja-testitasot 1–5 (Palloliiton normit)',
  hh_tekniikka: 'H-H-tekniikkatasot ovat huippukynnyksiä: taso 3 ≈ valtakunnan kärki, taso 2 ≈ ikäluokan paras neljännes — taso 1 ei tarkoita heikkoa',
  tk_lajitaso: 'TK-lajitaso 1–5 kilpailukohorttia vasten (2023–25, 3 477 pelaajaa): taso 3 = kisaajien keskitaso, taso 5 = paras 20 %. Otos on kilpailuihin osallistuneet — ei väestönormi.',
  phv:       'Kasvupyrähdysstatus (PRE/LÄH/PH/POST) — PH = kuormarajoitin',
  ikaoletus: 'Ei kasvumittausta — kehityskohde perustuu ikään (T≥13/P≥15)',
};

// ════════════════════════════════════════════════════════════════════════════
// JOUSTAVA INDEKSILASKENTA (D1/D2) — KANONINEN (CLAUDE.md §30/§14)
// Indeksit lasketaan niistä testeistä jotka ON mitattu — ei vaadita kiinteää patteria.
// Sama funktio tuonnissa (Excel_Tuonti prosessoiExcel + recalcHH) JA näkymissä → ei kopioita.
// Tausta: ulkomaiset/erilaiset testipatterit (esim. Pallo-Iirot P10: vain H-H 10m/30m + syöttö/pujottelu).
// ════════════════════════════════════════════════════════════════════════════

// D1 FYYSINEN — ka Eerikkilä-tasoista (1–5) niistä fyysisistä H-H-testeistä jotka on mitattu.
// sm_pallo jätetään pois (tekniikka → D2). mas km/h → m/s (HH_TESTI_MAP.kmh). Palauttaa {taso,lahde,kattavuus,maxKattavuus} | null.
function laskeD1Joustava(hh, ika, sp) {
  if (!hh || ika == null || !sp) return null;
  var FYS = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata'];   // fyysiset (ei sm_pallo)
  var summa = 0, n = 0;
  FYS.forEach(function (t) {
    var a = hh[t]; var m = HH_TESTI_MAP[t];
    if (a == null || isNaN(a) || !m) return;
    var tt = eerikkilaTaso(m.kmh ? a / 3.6 : a, m.eerikkila, ika, sp);
    if (tt) { summa += tt; n++; }
  });
  if (!n) return null;
  return { taso: Math.round(summa / n * 10) / 10, lahde: 'hh', kattavuus: n, maxKattavuus: FYS.length };
}

// D2 TEKNINEN H-H:sta — ka syöttö+pujottelu Eerikkilä-3-portaisista (1–3), normalisoitu 1–5: (t-1)*2+1.
// Eerikkilä-avaimet 'syotto'/'pujottelu' (asteikko 3). Palauttaa {taso,lahde:'hh',kattavuus,maxKattavuus} | null.
function laskeD2HH(hh, ika, sp) {
  if (!hh || ika == null || !sp) return null;
  var tasot = [];
  ['syotto', 'pujottelu'].forEach(function (k) {
    var a = hh[k];
    if (a == null || isNaN(a)) return;
    var t3 = eerikkilaTaso(a, k, ika, sp);     // 1–3 (asteikko 3)
    if (t3) tasot.push((t3 - 1) * 2 + 1);       // 1–3 → 1–5
  });
  if (!tasot.length) return null;
  var ka = tasot.reduce(function (x, y) { return x + y; }, 0) / tasot.length;
  return { taso: Math.round(ka * 10) / 10, lahde: 'hh', kattavuus: tasot.length, maxKattavuus: 2 };
}

// D2 JOUSTAVA (kanoninen prioriteetti, lue-aika): TKI (tki_viimeisin/20) → H-H (syöttö/pujottelu)
//   → olemassa oleva d2_taso (SM/TK, tuonnin kirjoittama). {taso,lahde,kattavuus} | null. Ikä/sp vain H-H-haaraan.
function laskeD2Joustava(p, ika, sp) {
  if (p == null) return null;
  if (p.tki_viimeisin != null) return { taso: Math.round((p.tki_viimeisin / 20) * 10) / 10, lahde: 'tki', kattavuus: 1 };
  var hh = laskeD2HH(p.hh_viimeisin, ika, sp);
  if (hh) return hh;
  if (p.d2_taso != null) return { taso: p.d2_taso, lahde: p.d2_lahde || 'sm', kattavuus: 1 };
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EERIKKILA_NORMIT,
    eerikkilaTaso,
    eerikkilaNormiarvo,
    eerikkilaProfiilit,
    laskeEI,
    laskeFVP,
    laskeTSI,
    laskeKiihdytysprofiili,
    // H-H/TSI-analyysimalli VAIHE 1
    HH_TESTI_MAP,
    hhSeuraavaTaso,
    hhVaadittuVuosivauhti,
    hhKehityskohde,
    // Joustava indeksilaskenta (D1/D2) — kanoninen, §30/§14
    laskeD1Joustava,
    laskeD2HH,
    laskeD2Joustava,
    // Selitesanasto (VAIHE 3)
    TM_SELITTEET
  };
}

// ════════════════════════════════════════════════════════════════════════════
// UNIVERSAALI TESTIREKISTERI (Sprint B) — mittaus on universaali, normi paikallinen.
// dimensio (D1/D2/D4), eerikkila (normitaulukon avain tai null), lahde, yksikko,
// pienempi_parempi, phv_sensitiivinen, pikakentta (Firestore), aliakset (kv-otsikkohaku).
// ════════════════════════════════════════════════════════════════════════════
const UNIVERSAALI_TESTIREKISTERI = {

  // ── D1 FYYSINEN ──
  lin30m: { dimensio:'D1', eerikkila:'nopeus_30m', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:true, pikakentta:'hh_viimeisin_lin30m',
    aliakset:['lin30m','lin_30m','nopeus_30m','sprint_30m','30m sprint','Antritt 30m','snelheidstest 30m','30 meter sprint'] },
  lin10m: { dimensio:'D1', eerikkila:'nopeus_10m', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:true, pikakentta:'hh_viimeisin_lin10m',
    aliakset:['lin10m','lin_10m','nopeus_10m','10m sprint','Antritt 10m','10 meter sprint'] },
  lin5m: { dimensio:'D1', eerikkila:'nopeus_5m', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:true, pikakentta:'hh_viimeisin_lin5m',
    aliakset:['lin5m','lin_5m','nopeus_5m','5m sprint'] },
  hyppy_cj: { dimensio:'D1', eerikkila:'hyppy_cj', lahde:'eerikkila', yksikko:'cm', pienempi_parempi:false, phv_sensitiivinen:true, pikakentta:'hh_viimeisin_cmj',
    aliakset:['hyppy_cj','cmj','counter_movement_jump','kevennyshyppy','Gegenbewegungssprung','tegenbeweging sprong'] },
  hyppy_sj: { dimensio:'D1', eerikkila:null, lahde:'eerikkila_pohja', yksikko:'cm', pienempi_parempi:false, phv_sensitiivinen:true, pikakentta:'hyppy_sj_viimeisin',
    aliakset:['hyppy_sj','sj_jump','SJ','static_jump','Standsprung','staande sprong'] },   // raaka cm, ei normia; käytetään EI-laskentaan
  mas: { dimensio:'D1', eerikkila:'mas', lahde:'eerikkila', yksikko:'km/h', pienempi_parempi:false, phv_sensitiivinen:false, pikakentta:'hh_viimeisin_mas',
    aliakset:['mas','mas_kmh','MAS','vmax_aerob','maximale Ausdauergeschwindigkeit','maximale aerobe snelheid'] },
  kasirata: { dimensio:'D1', eerikkila:'kasirata', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:true, pikakentta:'kasirata_viimeisin',
    aliakset:['kasirata','kasirata_s','5-10-5','figure_8','Achter-Parcours'] },
  flei: { dimensio:'D1', eerikkila:null, lahde:'flei', yksikko:'%', pienempi_parempi:false, phv_sensitiivinen:true, pikakentta:'flei_viimeisin',
    aliakset:['flei','flei_viimeisin','liikehallinta'] },

  // ── D2 TEKNINEN ──
  sm_juoksu: { dimensio:'D2', eerikkila:'sm_juoksu', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:true, pikakentta:'sm_juoksu_viimeisin',
    aliakset:['sm_juoksu','sm_juoksu_s','slalom_juoksu','Slalomtest ohne Ball','slalomtest zonder bal','ball_slalom_no_ball','suunnanmuutos_ilman_palloa'] },
  sm_pallo: { dimensio:'D2', eerikkila:'sm_pallo', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:true, pikakentta:'sm_pallo_viimeisin',
    aliakset:['sm_pallo','sm_pallo_s','slalom_pallo','Ballführungsparcours','dribbelparcours','ball_slalom','suunnanmuutos_pallon_kanssa'] },
  pujottelu: { dimensio:'D2', eerikkila:'pujottelu', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:false, pikakentta:'pujottelu_viimeisin',
    aliakset:['pujottelu','pujottelu_s','pujottelu_hh','Dribbling','dribbeltest'] },
  syotto: { dimensio:'D2', eerikkila:'syotto', lahde:'eerikkila', yksikko:'s', pienempi_parempi:true, phv_sensitiivinen:false, pikakentta:'syotto_viimeisin',
    aliakset:['syotto','syotto_s','syotto_hh','Syöttö','Passspiel','passing_test'] },

  // ── D4 PELI ──
  adar: { dimensio:'D4', eerikkila:null, lahde:'adar', yksikko:'/3', pienempi_parempi:false, phv_sensitiivinen:false, pikakentta:'adar_viimeisin_yht',
    aliakset:['adar','game_intelligence','pelialy'] }
  // CUSTOM-testimalli: { dimensio:'D1', eerikkila:null, lahde:'custom', yksikko:'ms', pikakentta:'reaktioaika_viimeisin', aliakset:[...] }
};

// ── KOMPOSIITTI-INDIKAATTORIT — johdettu useammasta testistä, lasketaan recalc-työkaluilla ──
const KOMPOSIITTI_INDIKAATTORIT = {
  hh_taso: { dimensio:'D1', lahde:'komposiitti', komponentit:['lin30m','hyppy_cj','mas'], laskenta:'eerikkila_keskiarvo', pikakentta:'hh_taso' },
  tsi:     { dimensio:'D2', lahde:'komposiitti', komponentit:['sm_pallo','sm_juoksu'], kaava:'sm_pallo - sm_juoksu', pikakentta:'tsi_viimeisin', normalisointi:null }, // §22, raaka s
  ei:      { dimensio:'D1', lahde:'komposiitti', komponentit:['hyppy_cj','hyppy_sj'], kaava:'hyppy_cj - hyppy_sj', pikakentta:'ei_viimeisin', yksikko:'cm', normalisointi:null, phv_sensitiivinen:true } // SSC; EI heikkenee usein PHV-alussa
};

// ── NORMIREKISTERI — metadata; itse normidata pysyy EERIKKILA_NORMIT:ssä ──
const NORMIREKISTERI = {
  eerikkila: {
    nimi: 'Eerikkilä-normit (Suomi)', versio: '2024', maat: ['FI'], kielet: ['fi','sv'],
    laskeNormitaso: function(testiId, arvo, ika, sukupuoli) { return eerikkilaTaso(arvo, testiId, ika, sukupuoli); }
  }
  // Tuleva: dfb (DE/AT/CH), knvb (NL/BE), ajax — lisätään kun data saadaan.
};
const NORMI_OLETUS = 'eerikkila';

if (typeof module !== 'undefined' && module.exports) {
  module.exports.UNIVERSAALI_TESTIREKISTERI = UNIVERSAALI_TESTIREKISTERI;
  module.exports.KOMPOSIITTI_INDIKAATTORIT = KOMPOSIITTI_INDIKAATTORIT;
  module.exports.NORMIREKISTERI = NORMIREKISTERI;
  module.exports.NORMI_OLETUS = NORMI_OLETUS;
}
