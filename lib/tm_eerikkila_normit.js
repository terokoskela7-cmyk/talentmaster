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
  sm_juoksu: { eerikkila: 'sm_juoksu', yksikko: 's', pienempi: true, phvHerkka: true },   // fyysinen ketteryys (D1), §8.4
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

  // ── Yksittäiset testit (julkinen kieli §14, §28-kehitysikkunakonteksti) ──
  lin5m:     '5 m kiihdytys — lähtönopeus/reaktio. Osin kehitettävissä jo ennen kasvupyrähdystä. Pienempi aika parempi.',
  lin10m:    '10 m kiihdytys — räjähtävä lähtö. Pienempi aika parempi.',
  lin30m:    '30 m maksiminopeus — vahvasti kasvupyrähdyksestä riippuva. Ennen kasvupyrähdystä heikko aika on NEUTRAALI, ei kehityskohde (§28).',
  lin20m:    '20 m — kiihdytyksen ja huippunopeuden väli. Pienempi aika parempi.',
  cmj:       'Kevennyshyppy (CMJ) — kimmovoima/räjähtävyys. Ennen kasvupyrähdystä mittaa koordinaatiota, ei voimaa.',
  sj:        'Staattinen hyppy (SJ) — puhdas voima ilman kimmoa. CMJ−SJ = kimmovoiman lisä.',
  mas:       'Maksimaalinen aerobinen nopeus — kestävyys. Tehokkaimmin kasvupyrähdyksen jälkeen. Tallennettu km/h.',
  kasirata:  'Ketteryyskahdeksikko — koordinaatio ja suunnanvaihto. Pienempi aika parempi.',
  sm_juoksu: 'Suunnanmuutos ilman palloa — puhdas ketteryys.',
  sm_pallo:  'Suunnanmuutos pallon kanssa — lajitekniikka vauhdissa.',
  pujottelu: 'Pujottelu — pallonhallinta vauhdissa. Pienempi aika parempi.',
  syotto:    'Syöttö — syöttötarkkuus ja -nopeus rataa pitkin. Pienempi aika parempi.',
  ponnauttelu:      'Ponnauttelu — pallotuntuma ja koordinaatio (sarjan suoritusaika).',
  pituuspotku:      'Pituuspotku — potkuvoima; metrit muunnetaan aikabonukseksi (vain U12–13).',
  kuljetus_laukaus: 'Kuljetus-laukaus — kuljetus + viimeistely; raaka-aika miinus tarkkuusvähennykset.',

  // ── Johdetut indeksit + dimensiot ──
  ei:        'Kimmovoima-indeksi (CMJ − SJ) — kuinka paljon kimmotus lisää hyppyä. Suurempi = parempi elastinen energia.',
  fvp:       'Voima-nopeus-profiili (5 m / 30 m) — kiihdytys- vai huippunopeustyyppi. Tulkittava kasvupyrähdyksen valossa.',
  vne:       'Räjähtävyysprofiili — kimmo + voima-nopeus + nopeus yhdistettynä tyypiksi (Räjähdys/Jousi/Moottori/Rakentaja/Perusta).',
  kiihdytysprofiili: 'Kiihdytysprofiili (10–30 m väliaika) — painottuuko kiihdytys vai huippunopeus.',
  d3:        'D3 Psyykkinen — motivaatio, valmennettavuus, sinnikkyys, keskittyminen, tunteiden hallinta (1–5).',
  d4:        'D4 Peliäly — kenttähavainto: havaitse, päätä, toimi, arvioi (ADAR). Kynnykset ikävaihekohtaisia.',
  d5:        'D5 Sosiaalinen — joukkuerooli ja vuorovaikutus (mittari kehitteillä).',
  adar:      'ADAR — peliälyn kenttähavainto (Havaitse, Päätä, Toimi, Arvioi, 1–3). Vähintään 3 havaintoa luotettava.',
  rae:       'Suhteellinen ikävaikutus — syntymäkvartaali (Q1 alkuvuosi … Q4 loppuvuosi). Saman ikäluokan Q4 on biologisesti nuorempi → arviota korjataan (RAE-korjaus oletuksena).',
  ovr:       'Kokonaisarvio — 5D-dimensioiden painotettu keskiarvo. Aktivoituu vasta kun ≥3 dimensiota mitattu; RAE-korjattu.',
};

// ════════════════════════════════════════════════════════════════════════════
// JOUSTAVA INDEKSILASKENTA (D1/D2) — KANONINEN (CLAUDE.md §30/§14)
// Indeksit lasketaan niistä testeistä jotka ON mitattu — ei vaadita kiinteää patteria.
// Sama funktio tuonnissa (Excel_Tuonti prosessoiExcel + recalcHH) JA näkymissä → ei kopioita.
// Tausta: ulkomaiset/erilaiset testipatterit (esim. Pallo-Iirot P10: vain H-H 10m/30m + syöttö/pujottelu).
// ════════════════════════════════════════════════════════════════════════════

// Sukupuolen normalisointi M/N:ksi yhdestä paikasta (Excel 'p'/'t', Firestore 'M'/'N', P/T).
// Excel_Tuonti tallennussilmukka käyttää tätä → ei toistettua haurasta inline-johtoa (sp-bugin juuri).
function normSukupuoliMN(raw) {
  var s = (raw == null ? '' : raw).toString().trim().toUpperCase();
  return (s === 'M' || s === 'P') ? 'M' : (s === 'N' || s === 'T') ? 'N' : null;
}

// D1 FYYSINEN — ka Eerikkilä-tasoista (1–5) niistä fyysisistä H-H-testeistä jotka on mitattu.
// sm_pallo jätetään pois (tekniikka → D2). mas km/h → m/s (HH_TESTI_MAP.kmh). Palauttaa {taso,lahde,kattavuus,maxKattavuus} | null.
function laskeD1Joustava(hh, ika, sp) {
  if (!hh || ika == null || !sp) return null;
  var FYS = ['lin5m', 'lin10m', 'lin30m', 'cmj', 'mas', 'kasirata', 'sm_juoksu'];   // sm_pallo EI (tekniikka→D2)
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

// D1 OSAINDEKSIT (additiivinen, §29) — erottelee fyysiset osa-alueet (nopeus vs MAS vs voima ym.) yhden
// blendatun d1_taso:n sijaan. Käyttää HH_TESTI_MAP + eerikkilaTaso (sama .kmh÷3,6-kuvio kuin laskeD1Joustava).
// Palauttaa 1–5-tasot (tai null jos testi puuttuu). EI määritä uudelleen d1_taso-koostetta.
function laskeD1Osaindeksit(hh, ika, sp) {
  if (!hh || ika == null || !sp) return null;
  var tasoT = function (t) { var a = hh[t], m = HH_TESTI_MAP[t]; if (a == null || isNaN(a) || !m) return null; return eerikkilaTaso(m.kmh ? a / 3.6 : a, m.eerikkila, ika, sp) || null; };
  var ka = function (arr) { var v = arr.filter(function (x) { return x != null; }); return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 10) / 10 : null; };
  return { kiihdytys: ka([tasoT('lin5m'), tasoT('lin10m')]), maksinopeus: tasoT('lin30m'),
           voima: ka([tasoT('cmj'), tasoT('sj')]), ketteryys: ka([tasoT('kasirata'), tasoT('sm_juoksu')]), aerobinen: tasoT('mas') };
}

// Ikä/PHV-tietoinen neutraalius (§28 + Eerikkilä Kevät 2025 §8.1). Pre-PHV: matala fyysinen on neutraali, ei kehityskohde.
// Virallinen kartta: PRE-PHV = P10–12 / T9–11. Kun phv_tila puuttuu, käytä ikää (normiIka) fallbackina.
function onNeutraaliPrePHV(p) {
  if (!p) return false;
  if (p.phv_tila === 'PRE' || p.phv_tila === 'LAH') return true;
  if (p.phv_tila) return false;                       // muu PHV-tila tiedossa → ei neutraali
  var jk = p.joukkue || (Array.isArray(p.joukkueet) ? p.joukkueet[0] : '') || '';
  var ika = (typeof normiIka === 'function') ? normiIka(p.syntymaVuosi, p.hh_pvm || p.tki_pvm || null, jk) : null;
  var sp = (String(jk).match(/\bT\s?\d/i) || p.sukupuoli === 'N' || p.sukupuoli === 'T') ? 'T' : 'P';
  if (ika == null) return false;
  return sp === 'T' ? (ika <= 11) : (ika <= 12);
}

// Joukkueen teknisesti heikoin ~20 % (§10 suhteellinen Kehityskohde). Pre-PHV d2_taso klusteroituu (U11 → taso 1),
// joten absoluuttinen d2<2 ylilaukeaa → järjestä d2_taso:lla, tiebreak raaka syöttö+pujottelu (suurempi = heikompi).
// Palauttaa Set:in avaimia (id || _id || "etunimi sukunimi"). Tyhjä/d2-tonta lista → tyhjä Set (ei kaadu).
function teknHeikoimmat20(joukkueenPelaajat) {
  var arvioitavat = (joukkueenPelaajat || []).filter(function (p) { return p && p.d2_taso != null; });
  if (!arvioitavat.length) return new Set();
  var raaka = function (p) { return ((p.hh_viimeisin && p.hh_viimeisin.syotto) || 0) + ((p.hh_viimeisin && p.hh_viimeisin.pujottelu) || 0); };
  var jarj = arvioitavat.slice().sort(function (a, b) { return (a.d2_taso - b.d2_taso) || (raaka(b) - raaka(a)); });   // heikoin ensin
  var n = Math.max(1, Math.ceil(arvioitavat.length * 0.2));
  return new Set(jarj.slice(0, n).map(function (p) { return p.id || p._id || (p.etunimi + ' ' + p.sukunimi); }));
}

// JOUKKUEEN POIKKEUSKEHYS (docs/POIKKEUSKEHYS_SPEC.md) — puhdas, testattava poikkeamalaskenta.
// Lukee VAIN annetut pelaaja-pikakentät (§26) + laskeD1Osaindeksit. EI Firestore-kyselyjä, EI DOM:ia.
// Palauttaa lajitellun listan: {tyyppi, osaAlue, vakavuus, arvo, teema, ikavaiheOdotettu, n:{osuma,koko}}.
function laskeJoukkuePoikkeamat(pelaajat, ika, sp, opts) {
  opts = opts || {};
  if (!pelaajat || !pelaajat.length) return [];
  var T = { alleVahva: 2.5, alleLieva: 2.9, profiiliEro: 1.0, laskevaDelta: -0.3, laskevaMin: 2,
            hajontaOsuus: 0.33, hajontaTaso: 2, hajontaKa: 2.5, ydinKa: 3.0, kattavuus: 0.5 };
  for (var kk in opts) { if (opts[kk] != null) T[kk] = opts[kk]; }   // §7 kynnykset säädettävissä
  var POST_PHV = { maksinopeus: true, aerobinen: true, voima: true };   // §3: pre-PHV → caveat (amber, ei punainen)
  var OSAT = ['kiihdytys', 'maksinopeus', 'voima', 'ketteryys', 'aerobinen'];
  var NIMI = { kiihdytys: 'Kiihdytys', maksinopeus: 'Maksiminopeus', voima: 'Voima', ketteryys: 'Ketteryys', aerobinen: 'Aerobinen', tekniikka: 'Tekniikka' };
  var TEEMA = { kiihdytys: 'kiihdytysblokki', maksinopeus: 'maksiminopeusblokki', voima: 'voimablokki', ketteryys: 'ketteryysblokki', aerobinen: 'aerobinen blokki', tekniikka: 'tekniikkateema' };
  // §3 pre-PHV: phv_tila ohittaa ikäproxyn (enemmistö PRE/LAH); muuten kohortti-ikä ≤13.
  var withPhv = pelaajat.filter(function (p) { return p.phv_tila; });
  var prePHV = withPhv.length
    ? (withPhv.filter(function (p) { return p.phv_tila === 'PRE' || p.phv_tila === 'LAH'; }).length > withPhv.length / 2)
    : (ika != null && ika <= 13);

  var teknArvo = function (p) { return (p.tki_viimeisin != null) ? Math.round(p.tki_viimeisin / 20 * 10) / 10 : (p.d2_taso != null ? p.d2_taso : null); };
  var comp = function (p) { var a = [p.d1_taso, p.hh_taso, (p.tki_viimeisin != null ? p.tki_viimeisin / 20 : null), p.d2_taso].filter(function (x) { return x != null; }); return a.length ? Math.max.apply(null, a) : null; };

  var osaSumma = {}, osaLkm = {}; OSAT.forEach(function (o) { osaSumma[o] = 0; osaLkm[o] = 0; });
  var teknS = 0, teknN = 0;
  pelaajat.forEach(function (p) {
    var oi = (typeof laskeD1Osaindeksit === 'function') ? laskeD1Osaindeksit(p.hh_viimeisin, ika, sp) : null;
    if (oi) OSAT.forEach(function (o) { if (oi[o] != null) { osaSumma[o] += oi[o]; osaLkm[o]++; } });
    var tk = teknArvo(p); if (tk != null) { teknS += tk; teknN++; }
  });
  var osaKa = {}; OSAT.forEach(function (o) { osaKa[o] = osaLkm[o] ? Math.round(osaSumma[o] / osaLkm[o] * 10) / 10 : null; });
  var teknKa = teknN ? Math.round(teknS / teknN * 10) / 10 : null;

  var out = [];
  var DIMS = OSAT.map(function (o) { return { key: o, ka: osaKa[o], n: osaLkm[o] }; }).filter(function (d) { return d.ka != null; });
  if (teknKa != null) DIMS.push({ key: 'tekniikka', ka: teknKa, n: teknN });

  // 1. alle_normin (per dimensio)
  DIMS.forEach(function (d) {
    if (d.ka >= 3) return;
    var caveat = !!(POST_PHV[d.key] && prePHV);
    var vahva = d.ka < T.alleVahva;
    out.push({ tyyppi: 'alle_normin', osaAlue: d.key, vakavuus: caveat ? 'amber' : (vahva ? 'punainen' : 'amber'), arvo: d.ka,
      teema: caveat ? (NIMI[d.key] + ' alle normin (' + d.ka + ') — tulee PHV:n myötä; kehitä silti ' + TEEMA[d.key]) : (NIMI[d.key] + ' alle normin (' + d.ka + ') → ' + TEEMA[d.key]),
      ikavaiheOdotettu: caveat, n: { osuma: d.n, koko: pelaajat.length } });
  });
  // 2. profiilipoikkeama (vain fyysiset osaindeksit)
  var fys = DIMS.filter(function (d) { return d.key !== 'tekniikka'; });
  if (fys.length >= 2) {
    var mean = fys.reduce(function (a, d) { return a + d.ka; }, 0) / fys.length;
    var heikoin = fys.slice().sort(function (a, b) { return a.ka - b.ka; })[0];
    if (mean - heikoin.ka >= T.profiiliEro) {
      var cav = !!(POST_PHV[heikoin.key] && prePHV);
      out.push({ tyyppi: 'profiilipoikkeama', osaAlue: heikoin.key, vakavuus: 'amber', arvo: heikoin.ka,
        teema: NIMI[heikoin.key] + ' ' + heikoin.ka + ' selvästi muita heikompi → ' + TEEMA[heikoin.key],
        ikavaiheOdotettu: cav, n: { osuma: heikoin.n, koko: pelaajat.length } });
    }
  }
  // 3. laskeva trendi
  var laskevat = pelaajat.filter(function (p) {
    var dA = (p.hh_taso != null && p.hh_taso_edellinen != null) ? (p.hh_taso - p.hh_taso_edellinen) : null;
    var dB = (p.tki_viimeisin != null && p.tki_edellinen != null) ? ((p.tki_viimeisin - p.tki_edellinen) / 20) : null;
    return (dA != null && dA < T.laskevaDelta) || (dB != null && dB < T.laskevaDelta);
  }).length;
  if (laskevat >= T.laskevaMin) out.push({ tyyppi: 'laskeva', osaAlue: null, vakavuus: 'punainen', arvo: null,
    teema: laskevat + ' pelaajalla taso laskenut → tarkista kuormitus/motivaatio', ikavaiheOdotettu: false, n: { osuma: laskevat, koko: pelaajat.length } });
  // 4. sisäinen hajonta (composite)
  var comps = pelaajat.map(comp).filter(function (x) { return x != null; });
  if (comps.length) {
    var alle2 = comps.filter(function (x) { return x <= T.hajontaTaso; }).length;
    var compKa = comps.reduce(function (a, b) { return a + b; }, 0) / comps.length;
    if (alle2 / comps.length >= T.hajontaOsuus && compKa >= T.hajontaKa) out.push({ tyyppi: 'hajonta', osaAlue: null, vakavuus: 'amber', arvo: Math.round(compKa * 10) / 10,
      teema: alle2 + '/' + comps.length + ' pelaajaa tasolla ≤2 vaikka ka ' + (Math.round(compKa * 10) / 10) + ' → jakautunut joukkue', ikavaiheOdotettu: false, n: { osuma: alle2, koko: comps.length } });
  }
  // 5. talenttiydin alle normin
  var rated = pelaajat.map(function (p) { return { p: p, c: comp(p) }; }).filter(function (x) { return x.c != null; });
  if (rated.length) {
    var topN = (pelaajat.length >= 15) ? 10 : 5;
    var ydin = rated.slice().sort(function (a, b) { return b.c - a.c; }).slice(0, topN);
    var mukana = {}; ydin.forEach(function (x, i) { mukana[(x.p.id != null ? x.p.id : 'i' + i)] = true; });
    rated.forEach(function (x, i) { if (x.p.talenttiOhjelma === true) { var k = (x.p.id != null ? x.p.id : 'r' + i); if (!mukana[k]) { ydin.push(x); mukana[k] = true; } } });
    if (ydin.length) {
      var ydinKa = Math.round(ydin.reduce(function (a, x) { return a + x.c; }, 0) / ydin.length * 10) / 10;
      if (ydinKa < T.ydinKa) out.push({ tyyppi: 'talenttiydin', osaAlue: null, vakavuus: 'punainen', arvo: ydinKa,
        teema: 'Talenttiydin (top-' + topN + ') ka ' + ydinKa + ' alle normin (3.0) → talent-ID-huoli', ikavaiheOdotettu: false, n: { osuma: ydin.length, koko: pelaajat.length } });
    }
  }
  // 6. kattavuusvaje
  var testattu = pelaajat.filter(function (p) { return p.hh_taso != null || p.d1_taso != null || p.tki_viimeisin != null; }).length;
  if (testattu / pelaajat.length < T.kattavuus) out.push({ tyyppi: 'kattavuus', osaAlue: null, vakavuus: 'info', arvo: Math.round(testattu / pelaajat.length * 100),
    teema: 'Vain ' + testattu + '/' + pelaajat.length + ' testattu (<50%) → ei voi arvioida luotettavasti', ikavaiheOdotettu: false, n: { osuma: testattu, koko: pelaajat.length } });

  var jarj = { punainen: 0, amber: 1, info: 2 };
  out.sort(function (a, b) { if (jarj[a.vakavuus] !== jarj[b.vakavuus]) return jarj[a.vakavuus] - jarj[b.vakavuus]; var av = a.arvo == null ? Infinity : a.arvo, bv = b.arvo == null ? Infinity : b.arvo; return av - bv; });
  return out;
}

// VALMENTAJAN KALIBRAATIO (mentorointi) — puhdas, testattava. Lukee VAIN pikakentät. EI Firestore/DOM.
// RAE-bias: talenttiytimen (talenttiOhjelma, fallback top-5 composite) Q1% vs joukkueen Q1%.
// D3-kuilu: ka |pisteet[dim].valmentaja − .vp|. Leniency: joukkueen adar_viimeisin.yht-ka − klubiAdarKa.
// Palauttaa { rae, d3, leniency, headline, chips[] }.
function laskeValmentajaKalibraatio(joukkueenPelaajat, klubiAdarKa, opts) {
  opts = opts || {};
  var P = joukkueenPelaajat || [];
  var T = { raeOsuus: 50, raePp: 15, raeMin: 3, d3Amber: 1.0, d3Red: 1.5, d3Min: 2, lenAbs: 1.5, lenMin: 3 };
  for (var kk in opts) { if (opts[kk] != null) T[kk] = opts[kk]; }
  var chips = [];
  var comp = function (p) { var a = [p.d1_taso, p.hh_taso, (p.tki_viimeisin != null ? p.tki_viimeisin / 20 : null), p.d2_taso].filter(function (x) { return x != null; }); return a.length ? Math.max.apply(null, a) : null; };
  var kvart = function (p) { return p.rae_kvartaali || (typeof raeKvartaali === 'function' ? raeKvartaali(p.syntymaaika) : null); };

  // ── RAE-valintabias ──
  var rae = { tila: 'ei_dataa', joukkueQ1: null, ydinQ1: null, ero: null };
  var qPel = P.filter(function (p) { return !!kvart(p); });
  var ydin = P.filter(function (p) { return p.talenttiOhjelma === true; });
  if (ydin.length < T.raeMin) {   // fallback: top-5 composite
    ydin = P.map(function (p) { return { p: p, c: comp(p) }; }).filter(function (x) { return x.c != null; }).sort(function (a, b) { return b.c - a.c; }).slice(0, 5).map(function (x) { return x.p; });
  }
  var ydinQ = ydin.filter(function (p) { return !!kvart(p); });
  if (qPel.length >= T.raeMin && ydinQ.length >= T.raeMin) {
    var jQ1 = Math.round(qPel.filter(function (p) { return kvart(p) === 'Q1'; }).length / qPel.length * 100);
    var eQ1 = Math.round(ydinQ.filter(function (p) { return kvart(p) === 'Q1'; }).length / ydinQ.length * 100);
    rae = { tila: 'ok', joukkueQ1: jQ1, ydinQ1: eQ1, ero: eQ1 - jQ1 };
    if (eQ1 >= T.raeOsuus && (eQ1 - jQ1) >= T.raePp) {
      rae.tila = 'bias';
      chips.push({ key: 'rae', vakavuus: 'amber', teksti: 'Talenttiytimessä Q1 yliedustettu (' + eQ1 + '% vs joukkue ' + jQ1 + '%)', vinkki: 'Valitaanko taitoa vai ikäetua? Vertaa Q4-pelaajia samalla taitotasolla ennen karsintaa.' });
    }
  }

  // ── D3-kuilu (valmentaja vs VP) ──
  var d3 = { tila: 'ei_dataa', ka: null, n: 0 };
  var erot = [], d3pelN = 0;
  P.forEach(function (p) {
    var pt = p.d3_viimeisin && p.d3_viimeisin.pisteet;
    if (!pt) return;
    var pe = [];
    Object.keys(pt).forEach(function (dim) { var d = pt[dim]; if (d && d.valmentaja != null && d.vp != null) pe.push(Math.abs(d.valmentaja - d.vp)); });
    if (pe.length) { erot = erot.concat(pe); d3pelN++; }
  });
  if (d3pelN >= T.d3Min && erot.length) {
    var d3ka = Math.round(erot.reduce(function (a, b) { return a + b; }, 0) / erot.length * 10) / 10;
    d3 = { tila: (d3ka >= T.d3Red ? 'red' : (d3ka >= T.d3Amber ? 'amber' : 'ok')), ka: d3ka, n: d3pelN };
    if (d3ka >= T.d3Amber) chips.push({ key: 'd3', vakavuus: (d3ka >= T.d3Red ? 'punainen' : 'amber'), teksti: 'D3-arviot eroavat VP:stä (ka ' + d3ka + ', ' + d3pelN + ' pelaajaa)', vinkki: 'Kalibroi VP:n kanssa — käykää läpi 2–3 pelaajaa per ulottuvuus.' });
  }

  // ── Pelihavainto-leniency (konteksti) ──
  var leniency = { tila: 'ei_dataa', ka: null, delta: null, n: 0 };
  var yhts = P.map(function (p) { return p.adar_viimeisin && p.adar_viimeisin.yht; }).filter(function (x) { return x != null && !isNaN(x); });
  if (yhts.length >= T.lenMin && klubiAdarKa != null) {
    var jKa = Math.round(yhts.reduce(function (a, b) { return a + b; }, 0) / yhts.length * 10) / 10;
    var delta = Math.round((jKa - klubiAdarKa) * 10) / 10;
    leniency = { tila: (Math.abs(delta) >= T.lenAbs ? 'poikkeaa' : 'ok'), ka: jKa, delta: delta, n: yhts.length };
    if (Math.abs(delta) >= T.lenAbs) chips.push({ key: 'leniency', vakavuus: 'info', teksti: 'Pelihavaintoarviot ' + (delta > 0 ? 'korkeammat' : 'matalammat') + ' kuin klubilla (Δ ' + (delta > 0 ? '+' : '') + delta + ')', vinkki: delta > 0 ? 'Mahdollinen lievä arviointi — varmista yhteinen mittatikku VP:n kanssa.' : 'Mahdollinen tiukka arviointi — varmista ettei alipisteytä lupaavia.' });
  }

  var hasData = rae.tila !== 'ei_dataa' || d3.tila !== 'ei_dataa' || leniency.tila !== 'ei_dataa';
  var headline;
  if (!hasData) headline = 'Ei riittävästi dataa';
  else if (chips.length) { var so = { punainen: 0, amber: 1, info: 2 }; headline = chips.slice().sort(function (a, b) { return so[a.vakavuus] - so[b.vakavuus]; })[0].teksti; }
  else headline = 'Linjassa';
  return { rae: rae, d3: d3, leniency: leniency, headline: headline, chips: chips };
}

// VANHEMPIRAPORTIN FRASEOLOGIA — SSOT (§7.22, §16). Pohjana Vanhempi_v2 TUKIVINKIT/rVanhempiTekniikka.
// Ulos EI tasolukuja/percentiilejä/vertailua/TKI-laskua — vain lapsen kielen positiivinen kehys.
var _VANH_LAJI = { ponnauttelu:'Ponnauttelu', syotto:'Syöttö', pujottelu:'Pujottelu', kuljetus_laukaus:'Kuljetus-laukaus', pituuspotku_bonus:'Pituuspotku', pituuspotku:'Pituuspotku' };
var _VANH_OSA = { kiihdytys:'räjähtävä lähtö', maksinopeus:'nopeus', voima:'voima', ketteryys:'ketteryys', aerobinen:'jaksaminen' };
var VANH_TUKIVINKIT = {
  syotto: 'Syöttötarkkuus kehittyy leikinomaisella toistolla — 10 min pihapeliä seinää tai sinua vasten riittää. Kehu yrittämistä, älä aikaa.',
  pujottelu: 'Pujottelu vaatii pallotuntumaa — kartioiksi käyvät kengät tai pullot. Tee siitä leikki, älä suoritus.',
  ponnauttelu: 'Ponnauttelu on kärsivällisyyslaji — ennätykset tulevat aaltoina. Juhlikaa pieniä onnistumisia yhdessä.',
  kuljetus_laukaus: 'Kuljetus ja laukaus kehittyvät vapaassa pelissä parhaiten — pihapelit ja vapaa pallottelu ovat arvokkainta harjoitusta.',
  pituuspotku: 'Potkuvoima kasvaa kehon mukana — tekniikka ratkaisee. Pitkät syötöt pihalla ovat hyvä yhteisharjoitus.',
  kiihdytys: 'Räjähtävä lähtö kehittyy hyppely- ja kiriharjoitteista leikkien — hippa ja viestit pihalla ovat parhaita.',
  maksinopeus: 'Nopeus kehittyy leikkien — hippa, viestit ja lyhyet kirit pihalla. Tärkeintä on ilo liikkeestä.',
  voima: 'Voima kehittyy oman kehon painolla leikkien — kiipeily, hyppely ja temppuradat pihalla.',
  ketteryys: 'Ketteryys kehittyy monipuolisesta liikkumisesta ja peleistä, joissa pitää väistellä ja muuttaa suuntaa.',
  aerobinen: 'Jaksaminen kasvaa monipuolisesta liikkumisesta — pyöräily, uinti ja pelit. Ei tarvitse erikseen treenata.'
};
var _VANH_AUTONOMIA = 'Kehu yrittämistä ja harjoittelua, ei tulosta. Anna lapsen johtaa leikkiä — kiinnostus kantaa pidemmälle kuin paine.';

function vanhempiRaporttiTekstit(p, ika, sp) {
  p = p || {};
  var nimi = p.etunimi || 'lapsesi';
  // §14/§28 ikävaihe: ≤12 leikkijä · 13–15 rakentaja (nuori urheilija) · ≥16 showcase. null → leikkijä (varovaisin §7.22).
  var vaihe = (ika == null || ika <= 12) ? 'leikkija' : (ika <= 15 ? 'rakentaja' : 'showcase');
  var oi = (typeof laskeD1Osaindeksit === 'function') ? laskeD1Osaindeksit(p.hh_viimeisin, ika, sp) : null;
  var parit = oi ? ['kiihdytys','maksinopeus','voima','ketteryys','aerobinen'].filter(function (k) { return oi[k] != null; }).map(function (k) { return { k: k, v: oi[k] }; }) : [];
  var vahvinOsa = parit.length ? parit.slice().sort(function (a, b) { return b.v - a.v; })[0].k : null;
  var heikoinOsa = parit.length ? parit.slice().sort(function (a, b) { return a.v - b.v; })[0].k : null;

  // VAHVUUS (ensin) — laji ennen osaindeksiä
  var vahvuus;
  if (p.tki_vahvuus && _VANH_LAJI[p.tki_vahvuus]) {
    vahvuus = { kohde: _VANH_LAJI[p.tki_vahvuus], teksti: _VANH_LAJI[p.tki_vahvuus] + ' on vahvin lajisi — hieno juttu! Tästä kannattaa ammentaa iloa.' };
  } else if (vahvinOsa) {
    vahvuus = { kohde: _VANH_OSA[vahvinOsa], teksti: 'Erityisen hyvää juuri nyt: ' + _VANH_OSA[vahvinOsa] + '. Tätä kannattaa juhlia.' };
  } else {
    vahvuus = { kohde: null, teksti: 'Into ja yrittäminen ovat tärkein vahvuus tässä iässä — ja niitä riittää!' };
  }

  // SEURAAVA ASKEL — ikävaiheistettu, positiivinen + §28, EI tasolukua/"heikkous"
  var seuraavaAskel, kohdeNimi = null;
  var askelLoppu = vaihe === 'leikkija'  ? ' Pieni parannus joka treenissä riittää — ja moni taito kehittyy kasvun myötä.'
                 : vaihe === 'rakentaja' ? ' Tämä kehittyy jäsennellyllä, kohdistetulla harjoittelulla ja riittävällä levolla — laatu ratkaisee, ei määrä.'
                 :                          ' Yksilöllisesti suunniteltu harjoittelu ja palautuminen vievät tästä eteenpäin.';
  if (p.tki_kehityskohde && _VANH_LAJI[p.tki_kehityskohde]) {
    kohdeNimi = _VANH_LAJI[p.tki_kehityskohde];
    seuraavaAskel = { kohde: kohdeNimi, teksti: 'Seuraava askel: ' + kohdeNimi + '.' + askelLoppu };
  } else if (heikoinOsa) {
    kohdeNimi = _VANH_OSA[heikoinOsa];
    seuraavaAskel = { kohde: kohdeNimi, teksti: 'Seuraava askel: ' + kohdeNimi + '.' + askelLoppu };
  } else {
    seuraavaAskel = { kohde: null, teksti: vaihe === 'leikkija' ? 'Monipuolinen liikkuminen ja pelaaminen vievät eteenpäin — anna lapsen kokeilla eri lajeja.'
      : vaihe === 'rakentaja' ? 'Monipuolinen harjoittelu, säännöllinen rytmi ja palautuminen vievät eteenpäin tässä kasvuvaiheessa.'
      : 'Yksilöllinen harjoitusrytmi ja palautuminen kantavat eteenpäin.' };
  }

  // TUKIVINKIT — ikävaiheistettu (leikki ≤12 · uni/ravinto/koulu/jäsennelty harjoittelu/autonomia 13+)
  var tukivinkit = [];
  if (vaihe === 'leikkija') {
    var tukiKey = (p.tki_kehityskohde ? String(p.tki_kehityskohde).replace('_bonus', '') : (heikoinOsa || null));
    if (tukiKey && VANH_TUKIVINKIT[tukiKey]) tukivinkit.push(VANH_TUKIVINKIT[tukiKey]);
    tukivinkit.push(_VANH_AUTONOMIA);
  } else {
    var kohdeTxt = kohdeNimi ? (' (kohdistettuna: ' + kohdeNimi + ')') : '';
    tukivinkit.push('Uni ja lepo ovat kasvupyrähdyksessä tärkeintä — riittävä yöuni tukee sekä kehitystä että mielialaa.');
    tukivinkit.push('Monipuolinen, säännöllinen ravinto: kasvava keho tarvitsee energiaa ja proteiinia joka aterialla.');
    tukivinkit.push('Tasapaino koulun ja urheilun välillä — turvaa palautumispäivät, ei joka päivä täysillä.');
    tukivinkit.push('Jäsennelty omatoimiharjoittelu' + kohdeTxt + ' — laatu ennen määrää, kohdennettu toisto vie pisimmälle.');
    tukivinkit.push('Anna nuoren ottaa vastuuta omasta harjoittelustaan — sisäinen motivaatio kantaa. Tuki, ei paine.');
    if (vaihe === 'showcase') tukivinkit.push('Hakekaa yksilöllistä ohjausta — keskustelkaa valmentajan kanssa tavoitteista ja kuormituksesta.');
  }

  // PROSESSIKEHU — vain jos käynti-/kehitysdataa
  var prosessikehu = null;
  var kehittynyt = (p.hh_taso != null && p.hh_taso_edellinen != null && p.hh_taso > p.hh_taso_edellinen)
    || (p.tki_viimeisin != null && p.tki_edellinen != null && p.tki_viimeisin > p.tki_edellinen);
  if (kehittynyt) prosessikehu = 'Hienoa — ' + nimi + ' on kehittynyt! Juhlikaa prosessia ja yrittämistä, ei vain tulosta.';
  else if (p.streak && p.streak > 0) prosessikehu = 'Hienoa, että ' + nimi + ' on harjoitellut säännöllisesti — se on tärkein juttu.';

  return { vahvuus: vahvuus, seuraavaAskel: seuraavaAskel, tukivinkit: tukivinkit, prosessikehu: prosessikehu, ikavaihe: vaihe };
}

// REVIEW-KADENSSI (MDT-raportin tarkistusrytmi) — puhdas, testattava. Lukee pikakentät review_viimeisin_pvm/-tyyppi.
// Ikäkaistat (säädettävät opts): ikä≥12 → 42 pv · ikä 9–11 (oletus) → 84 pv. Ikä syntymaVuosi/normiIka(joukkuenimi).
function laskeReviewKadenssi(p, nyt, opts) {
  p = p || {}; opts = opts || {};
  var KAISTA_YLI12 = opts.kaistaYli12 != null ? opts.kaistaYli12 : 42;
  var KAISTA_9_11 = opts.kaista9_11 != null ? opts.kaista9_11 : 84;
  var ERAANTYMASSA_PV = opts.eraantymassaPv != null ? opts.eraantymassaPv : 14;
  var PV = 86400000;
  var _ms = function (d) {
    if (d == null) return null;
    if (typeof d === 'number') return d;
    if (d instanceof Date) return d.getTime();
    if (typeof d === 'object' && d.toDate) { try { return d.toDate().getTime(); } catch (e) { return null; } }
    var m = String(d).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]).getTime();
    var t = new Date(String(d)).getTime();
    return isNaN(t) ? null : t;
  };
  var nytMs = _ms(nyt); if (nytMs == null) nytMs = Date.now();
  var nytYear = new Date(nytMs).getFullYear();
  var ika = null;
  if (p.syntymaVuosi != null) { var a = nytYear - p.syntymaVuosi; if (a >= 5 && a <= 25) ika = a; }
  if (ika == null && typeof normiIka === 'function') ika = normiIka(p.syntymaVuosi, nyt, p.joukkue);   // joukkuenimi-fallback
  var ikakaista = (ika != null && ika >= 12) ? KAISTA_YLI12 : KAISTA_9_11;

  var viimMs = _ms(p.review_viimeisin_pvm);
  if (viimMs == null) return { status: 'ei_reviewia', eraantyyPvm: null, ylimaaraPv: null, viimeisinPvm: null, tyyppi: null, ikakaista: ikakaista };
  var pvmStr = function (ms) { var d = new Date(ms), mm = d.getMonth() + 1, dd = d.getDate(); return d.getFullYear() + '-' + (mm < 10 ? '0' : '') + mm + '-' + (dd < 10 ? '0' : '') + dd; };
  var eraantyyMs = viimMs + ikakaista * PV;
  var ylimaaraPv = Math.round((nytMs - eraantyyMs) / PV);   // >0 = myöhässä
  var status = ylimaaraPv > 0 ? 'myohassa' : (ylimaaraPv >= -ERAANTYMASSA_PV ? 'eraantymassa' : 'ajantasalla');
  return { status: status, eraantyyPvm: pvmStr(eraantyyMs), ylimaaraPv: ylimaaraPv, viimeisinPvm: p.review_viimeisin_pvm, tyyppi: p.review_viimeisin_tyyppi || null, ikakaista: ikakaista };
}

// Joukkueen review-kooste roll-upiin. on-time-% lasketaan arvioiduista (ei_reviewia ei mukana baselineen).
function laskeJoukkueReviewKooste(pelaajat, nyt, opts) {
  pelaajat = pelaajat || [];
  var c = { ajantasalla: 0, eraantymassa: 0, myohassa: 0, ei_reviewia: 0 };
  pelaajat.forEach(function (p) { var r = laskeReviewKadenssi(p, nyt, opts); c[r.status] = (c[r.status] || 0) + 1; });
  var arvioidut = c.ajantasalla + c.eraantymassa + c.myohassa;
  return { onTime_pct: arvioidut ? Math.round(c.ajantasalla / arvioidut * 100) : null,
    myohassa_n: c.myohassa, eraantymassa_n: c.eraantymassa, ajantasalla_n: c.ajantasalla, ei_reviewia_n: c.ei_reviewia, n: pelaajat.length };
}

// KANONINEN composite-taso + taso≥3-osuus. lvl(p) = max(d1_taso, hh_taso, d2_taso, laskeD2Joustava→taso).
// Yksi lähde → Master Kausi + VP-tuloskortti täsmäävät samalla scopella (poistaa 26/53-ristiriidan).
function _tasoIkaSp(p) {
  var ika = (typeof normiIka === 'function') ? normiIka(p.syntymaVuosi, null, p.joukkue) : null;
  var r = String(p.sukupuoli || '').toUpperCase(), sp = (r === 'N' || r === 'T') ? 'N' : (r === 'M' || r === 'P') ? 'M' : null;
  if (sp == null && p.joukkue) { var jm = String(p.joukkue).match(/\b([PT])\s?\d/i); if (jm) sp = jm[1].toUpperCase() === 'T' ? 'N' : 'M'; }
  return { ika: ika, sp: sp || 'M' };
}
function _tasoLvl(p) {
  var isp = _tasoIkaSp(p);
  var d2j = (typeof laskeD2Joustava === 'function') ? laskeD2Joustava(p, isp.ika, isp.sp) : null;
  var a = [p.d1_taso, p.hh_taso, p.d2_taso, (d2j ? d2j.taso : null)].filter(function (x) { return x != null; });
  return a.length ? Math.max.apply(null, a) : null;
}
function laskeTaso3Osuus(pelaajat, opts) {
  pelaajat = pelaajat || []; opts = opts || {};
  var koh = pelaajat;
  if (opts.joukkueet && opts.joukkueet.length) {
    var set = {}; opts.joukkueet.forEach(function (j) { set[String(j).toLowerCase().trim()] = 1; });
    koh = pelaajat.filter(function (p) {
      if (p.joukkue && set[String(p.joukkue).toLowerCase().trim()]) return true;
      if (Array.isArray(p.joukkueet)) return p.joukkueet.some(function (j) { return set[String(j).toLowerCase().trim()]; });
      return false;
    });
  }
  var arvioidut = 0, n3 = 0;
  koh.forEach(function (p) { var L = _tasoLvl(p); if (L != null) { arvioidut++; if (L >= 3) n3++; } });
  return { osuus_pct: arvioidut ? Math.round(n3 / arvioidut * 100) : null, n_taso3: n3, n_arvioidut: arvioidut };
}

// Tavoitetaso-jakauma per ominaisuus (#67): annetuista 1–5-tasoista (null = ei mitattu) → pylväsjakauma + ka + ≥kynnys-osuus.
// kynnys = "tavoitteessa"-raja (default 3 = ikäluokan keskitaso). Palauttaa {jakauma:[t1..t5], n, ka, n_tavoite, osuus_pct|null}.
// n = mitattujen lukumäärä (kattavuus); osuus_pct null kun n=0 (EI fabrikoida). Pyöristys pylvääseen Math.round.
function tasoJakauma(tasot, kynnys) {
  kynnys = (kynnys == null) ? 3 : kynnys;
  var jak = [0, 0, 0, 0, 0], summa = 0, n = 0, nt = 0;
  (tasot || []).forEach(function (t) {
    if (t == null || isNaN(t)) return;
    var r = Math.round(t); if (r < 1) r = 1; if (r > 5) r = 5;
    jak[r - 1]++; summa += t; n++; if (t >= kynnys) nt++;
  });
  return { jakauma: jak, n: n, ka: n ? Math.round(summa / n * 10) / 10 : null, n_tavoite: nt, osuus_pct: n ? Math.round(nt / n * 100) : null };
}

// TKI-tavoitejakauma (#67 cross-club): TKI-arvot → bändit (<40 prioriteetti · 40–59 kehitys · ≥60 hyvä) + TKI≥tavoite-osuus.
// Sibbon tekniikka EI mahdu taso-3-kehykseen → oma asteikko. tavoite = "hyvä"-raja (default 60). osuus_pct null kun n=0.
function tkiTavoiteJakauma(tkit, tavoite) {
  tavoite = (tavoite == null) ? 60 : tavoite;
  var alle40 = 0, keski = 0, hyva = 0, summa = 0, n = 0, nt = 0;
  (tkit || []).forEach(function (v) {
    if (v == null || isNaN(v)) return;
    n++; summa += v; if (v >= tavoite) nt++;
    if (v < 40) alle40++; else if (v < 60) keski++; else hyva++;
  });
  return { bandit: { alle40: alle40, keski: keski, hyva: hyva }, n: n, ka: n ? Math.round(summa / n) : null, n_tavoite: nt, osuus_pct: n ? Math.round(nt / n * 100) : null };
}

// VP-TULOSKORTTI (governance-audit, docs/VP_TULOSKORTTI_SPEC.md). Puhdas, testattava. Vain pikakentät, ei DOM/Firestore.
// Alueet I Prosessikuri · II Pelaajakehitys · III Valmentajavaikuttavuus · IV Reiluus. metriikat[] = tavoite-vs-toteuma-lähde.
var _TULOS_ALUE_STATUS = function (kpit) {
  var rel = kpit.map(function (k) { return k.status; }).filter(function (s) { return s !== 'tulossa' && s !== 'info'; });
  if (!rel.length) return 'tulossa';
  if (rel.indexOf('punainen') >= 0) return 'punainen';
  if (rel.indexOf('amber') >= 0) return 'amber';
  return 'vihrea';
};
var _TAVOITE_META = {
  taso3_pct:                { lbl: 'Taso ≥3 -osuus (%)',          metriikka: 'taso3_pct',                 dir: 'yli', alue: 'II' },
  mdr_ontime_pct:           { lbl: 'MDR ajan tasalla (%)',        metriikka: 'mdr_ontime_pct',            dir: 'yli', alue: 'I' },
  mdr_kattavuus_pct:        { lbl: 'MDR-kattavuus (%)',           metriikka: 'mdr_kattavuus_pct',         dir: 'yli', alue: 'I' },
  peliaaly_kattavuus_pct:   { lbl: 'Peliäly-kattavuus (%)',       metriikka: 'peliaaly_kattavuus_pct',    dir: 'yli', alue: 'II' },
  testikattavuus_pct:       { lbl: 'Testikattavuus (%)',          metriikka: 'testikattavuus_pct',        dir: 'yli', alue: 'II' },
  vai_ka:                   { lbl: 'VAI+ ka.',                    metriikka: 'vai_ka',                    dir: 'yli', alue: 'III' },
  mentorointi_kattavuus_pct:{ lbl: 'Mentorointi-kattavuus (%)',   metriikka: 'mentorointi_kattavuus_pct', dir: 'yli', alue: 'III' },
  lisenssi_kattavuus_pct:   { lbl: 'Lisenssi-kattavuus (%)',      metriikka: 'lisenssi_kattavuus_pct',    dir: 'yli', alue: 'III' },
  rae_q1_max:               { lbl: 'RAE Q1 enintään (%)',         metriikka: 'rae_q1_pct',                dir: 'alle', alue: 'IV' },
  toimenpideaste_pct:       { lbl: 'Underdog-toimenpideaste (%)', metriikka: 'toimenpideaste_pct',        dir: 'yli', alue: 'IV' }
};
function laskeTavoiteToteuma(kortti, tavoitteet) {
  if (!tavoitteet || typeof tavoitteet !== 'object') return [];
  var M = (kortti && kortti.metriikat) || {};
  var out = [];
  Object.keys(tavoitteet).forEach(function (id) {
    var t = tavoitteet[id]; if (t == null || typeof t !== 'object') return;
    var meta = _TAVOITE_META[id] || { metriikka: id, dir: 'yli', lbl: id, alue: null };
    var toteuma = M[meta.metriikka];
    var saavutettu = (toteuma != null && t.tavoite != null) ? (meta.dir === 'alle' ? (toteuma <= t.tavoite) : (toteuma >= t.tavoite)) : false;
    out.push({ alue: t.alue || meta.alue || null, mittariId: id, nimi: meta.lbl || id, tavoite: t.tavoite, toteuma: (toteuma != null ? toteuma : null), saavutettu: saavutettu });
  });
  return out;
}
function laskeVPTuloskortti(pelaajat, valmentajat, tavoitteet, nyt, opts) {
  pelaajat = pelaajat || []; valmentajat = valmentajat || []; opts = opts || {};
  var N = pelaajat.length;
  var pct = function (n, d) { return d ? Math.round(n / d * 100) : null; };
  var st = function (v, g, a, suunta) { if (v == null) return 'tulossa'; suunta = suunta || 'yli'; return suunta === 'yli' ? (v >= g ? 'vihrea' : v >= a ? 'amber' : 'punainen') : (v <= g ? 'vihrea' : v <= a ? 'amber' : 'punainen'); };
  var M = {};

  // ── I Prosessikuri ──
  var kooste = (typeof laskeJoukkueReviewKooste === 'function') ? laskeJoukkueReviewKooste(pelaajat, nyt) : null;
  M.mdr_kattavuus_pct = pct(pelaajat.filter(function (p) { return p.review_viimeisin_pvm != null; }).length, N);
  M.mdr_ontime_pct = kooste ? kooste.onTime_pct : null;
  var I = { kpi: [
    { nimi: 'MDR-kattavuus', arvo: M.mdr_kattavuus_pct != null ? M.mdr_kattavuus_pct + '%' : '—', status: st(M.mdr_kattavuus_pct, 80, 50), n: N },
    { nimi: 'Reviewit ajan tasalla', arvo: M.mdr_ontime_pct != null ? M.mdr_ontime_pct + '%' : '—', status: st(M.mdr_ontime_pct, 80, 50), n: kooste ? (kooste.ajantasalla_n + kooste.eraantymassa_n + kooste.myohassa_n) : 0 }
  ], meta: { myohassa_n: kooste ? kooste.myohassa_n : 0, ei_reviewia_n: kooste ? kooste.ei_reviewia_n : 0 } };
  I.status = _TULOS_ALUE_STATUS(I.kpi);

  // ── II Pelaajakehitys ── (taso≥3 kanonisesta laskeTaso3Osuus:sta, valinnainen akatemia-kohortti)
  var t3 = laskeTaso3Osuus(pelaajat, { joukkueet: (opts.taso3Joukkueet || null) });
  M.taso3_pct = t3.osuus_pct; M.taso3_n_arvioidut = t3.n_arvioidut; M.taso3_n = t3.n_taso3;
  var talentti = pelaajat.filter(function (p) { if (p.signaali === 'xfactor') return true; if (typeof laskeHiddenGem === 'function') { var hg = laskeHiddenGem(p); return hg.dHG || hg.fleiHG; } return false; }).length;
  M.talentti_n = talentti;
  M.hyvinvointiliput_n = pelaajat.filter(function (p) { return (p.flei_viimeisin != null && p.flei_viimeisin < 40) || p.phv_tila === 'PH'; }).length;
  M.peliaaly_kattavuus_pct = pct(pelaajat.filter(function (p) { return (p.adar_havaintoja || 0) >= 3; }).length, N);
  M.testikattavuus_pct = pct(pelaajat.filter(function (p) { return p.hh_taso != null || p.d1_taso != null || p.tki_viimeisin != null; }).length, N);
  var II = { kpi: [
    { nimi: 'Taso ≥3 -osuus', arvo: M.taso3_pct != null ? M.taso3_pct + '%' : '—', status: st(M.taso3_pct, 40, 20), n: M.taso3_n_arvioidut },
    { nimi: 'Talenttisignaalit', arvo: String(talentti), status: 'info', n: N },
    { nimi: 'Peliäly-kattavuus', arvo: M.peliaaly_kattavuus_pct != null ? M.peliaaly_kattavuus_pct + '%' : '—', status: st(M.peliaaly_kattavuus_pct, 50, 25), n: N },
    { nimi: 'Testikattavuus', arvo: M.testikattavuus_pct != null ? M.testikattavuus_pct + '%' : '—', status: st(M.testikattavuus_pct, 80, 50), n: N },
    { nimi: 'Hyvinvointiliput', arvo: String(M.hyvinvointiliput_n), status: N ? st(M.hyvinvointiliput_n, 0, 2, 'alle') : 'tulossa', n: N }
  ], meta: {} };
  II.status = _TULOS_ALUE_STATUS(II.kpi);

  // ── III Valmentajavaikuttavuus ──
  var vais = valmentajat.map(function (c) { return c._vai && c._vai.vai; }).filter(function (x) { return x != null && !isNaN(x); });
  M.vai_ka = vais.length ? Math.round(vais.reduce(function (a, b) { return a + b; }, 0) / vais.length) : null;
  M.mentorointi_kattavuus_pct = valmentajat.length ? pct(valmentajat.filter(function (c) { return c.mentorointiPvt != null && c.mentorointiPvt < 30; }).length, valmentajat.length) : null;
  M.lisenssi_kattavuus_pct = valmentajat.length ? pct(valmentajat.filter(function (c) { return c.lisenssitaso; }).length, valmentajat.length) : null;
  // Harjoitusarviointi-pikakentät (HARJOITUSARVIOINTI_SPEC §8) — datagate kun ei arviointeja
  var _hlat = valmentajat.map(function (c) { return c.harjoituslaatu_ka; }).filter(function (x) { return x != null && !isNaN(x); });
  M.harjoituslaatu_ka = _hlat.length ? Math.round(_hlat.reduce(function (a, b) { return a + b; }, 0) / _hlat.length * 10) / 10 : null;
  M.harjoituslaatu_n = valmentajat.reduce(function (s, c) { return s + (c.harjoituslaatu_n || 0); }, 0);
  var _vtat = valmentajat.map(function (c) { return c.valmennustaito_ka; }).filter(function (x) { return x != null && !isNaN(x); });
  M.valmennustaito_ka = _vtat.length ? Math.round(_vtat.reduce(function (a, b) { return a + b; }, 0) / _vtat.length * 10) / 10 : null;
  M.valmennustaito_n = valmentajat.reduce(function (s, c) { return s + (c.valmennustaito_n || 0); }, 0);
  var III = { kpi: [
    { nimi: 'VAI+ ka.', arvo: M.vai_ka != null ? String(M.vai_ka) : '—', status: st(M.vai_ka, 70, 50), n: valmentajat.length },
    { nimi: 'Mentorointi-kattavuus', arvo: M.mentorointi_kattavuus_pct != null ? M.mentorointi_kattavuus_pct + '%' : '—', status: st(M.mentorointi_kattavuus_pct, 70, 40), n: valmentajat.length },
    { nimi: 'Lisenssi-kattavuus', arvo: M.lisenssi_kattavuus_pct != null ? M.lisenssi_kattavuus_pct + '%' : '—', status: st(M.lisenssi_kattavuus_pct, 80, 50), n: valmentajat.length },
    { nimi: 'Harjoituslaatu (Palloliitto)', arvo: M.harjoituslaatu_ka != null ? M.harjoituslaatu_ka + '/10' : 'Ei arviointeja vielä', status: M.harjoituslaatu_ka == null ? 'info' : st(M.harjoituslaatu_ka, 7, 5), n: M.harjoituslaatu_n },
    { nimi: 'Valmennustaito-indeksi', arvo: M.valmennustaito_ka != null ? M.valmennustaito_ka + '/5' : 'Ei arviointeja vielä', status: M.valmennustaito_ka == null ? 'info' : st(M.valmennustaito_ka, 3.5, 2.5), n: M.valmennustaito_n }
  ], meta: {} };
  III.status = _TULOS_ALUE_STATUS(III.kpi);

  // ── IV Reiluus (RAE) ──
  var underdogit = [], q1n = 0, qn = 0;
  pelaajat.forEach(function (p) { if (typeof raeChip === 'function') { var rc = raeChip(p); if (rc.q) { qn++; if (rc.q === 'Q1') q1n++; } if (rc.underdog) underdogit.push(p); } });
  M.rae_q1_pct = pct(q1n, qn);
  M.underdog_n = underdogit.length;
  var toimennettu = underdogit.filter(function (p) { return p.talenttiOhjelma === true || p.review_viimeisin_pvm != null || p.idp_tila != null || p.idp_jono === true; }).length;
  M.toimenpideaste_pct = underdogit.length ? pct(toimennettu, underdogit.length) : null;
  var IV = { kpi: [
    { nimi: 'Q1-osuus', arvo: M.rae_q1_pct != null ? M.rae_q1_pct + '%' : '—', status: st(M.rae_q1_pct, 35, 45, 'alle'), n: qn },
    { nimi: 'Underdogit', arvo: String(underdogit.length), status: 'info', n: N },
    { nimi: 'Toimenpideaste', arvo: M.toimenpideaste_pct != null ? M.toimenpideaste_pct + '%' : '—', status: st(M.toimenpideaste_pct, 70, 40), n: underdogit.length }
  ], meta: { ikaharha: (M.rae_q1_pct != null && M.rae_q1_pct > 40) } };
  IV.status = _TULOS_ALUE_STATUS(IV.kpi);

  var alueet = { I: I, II: II, III: III, IV: IV };
  var auditValmius = ['I', 'II', 'III', 'IV'].filter(function (k) { return alueet[k].status === 'vihrea'; }).length;
  var toteumat = laskeTavoiteToteuma({ metriikat: M }, tavoitteet);
  return {
    ylataso: { auditValmius_x_per4: auditValmius, tavoitteetSaavutettu_per_n: { saavutettu: toteumat.filter(function (t) { return t.saavutettu; }).length, n: toteumat.length } },
    alueet: alueet, metriikat: M, toteumat: toteumat
  };
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

// D2 sm_pallo-fallback-päätös (#68, §14): kun H-H (syöttö/pujottelu) EI anna d2:ta mutta sm_pallo (lajitekniikka) on mitattu.
// sm_juoksu EI koskaan D2:een. Palauttaa {taso,lahde:'sm_pallo',kattavuus:1} | null. EI ylikirjoita H-H/TKI/TK-lähdettä
// (vain kun olemassa d2 puuttuu tai on jo sm/sm_pallo-pohjainen). onD2HH = onko H-H-d2 jo laskettu tässä ajossa.
function d2SmPalloFallback(p, ika, sp, onD2HH) {
  if (onD2HH || !p) return null;                                            // H-H ensisijainen
  if (p.tki_viimeisin != null || p.sm_pallo_viimeisin == null) return null;
  if (!(p.d2_taso == null || p.d2_lahde == null || p.d2_lahde === 'sm' || p.d2_lahde === 'sm_pallo')) return null;
  if (ika == null || !sp) return null;
  var t = eerikkilaTaso(parseFloat(p.sm_pallo_viimeisin), 'sm_pallo', ika, sp);
  return t ? { taso: t, lahde: 'sm_pallo', kattavuus: 1 } : null;
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

// ════════════════════════════════════════════════════════════════════════════
// IKÄKONVENTIO §24/§26 — KANONINEN norminhaun ikä (ikäluokka), ks. docs/IKAKONVENTIO_SPEC.md
// normiIka = year(testipvm) − syntymaVuosi (EI 1.7.-vähennystä — se on bio-ika §25, joka pidetään erillään).
// Pvm puuttuu → currentYear (näkymä "nyt"). syntymaVuosi puuttuu → joukkuenimi-fallback ("SJK P14"→14).
// ════════════════════════════════════════════════════════════════════════════
function _vuosiPvmsta(pvm) {
  if (pvm == null) return null;
  if (typeof pvm === 'object' && pvm.toDate) { try { return pvm.toDate().getFullYear(); } catch (e) { return null; } }
  if (pvm instanceof Date) return pvm.getFullYear();
  var m = String(pvm).match(/(\d{4})/);   // ISO 'YYYY-..' tai 'pp.kk.vvvv' → ensimmäinen 4-num vuosi
  return m ? parseInt(m[1], 10) : null;
}
function normiIka(syntymaVuosi, pvm, joukkue) {
  if (syntymaVuosi != null) {
    var v = _vuosiPvmsta(pvm);
    if (v == null) v = new Date().getFullYear();   // pvm puuttuu → "nyt"
    var ika = v - syntymaVuosi;
    return (ika >= 5 && ika <= 25) ? ika : null;    // järkevyysraja
  }
  if (joukkue) {                                     // syntymaVuosi puuttuu → joukkuenimen ikäluokka
    var jm = String(joukkue).match(/\b([PTU])\s?(\d{1,2})\b/i);
    if (jm) return parseInt(jm[2], 10);
  }
  return null;
}
// RAE — suhteellinen ikävaikutus (§14/§30). Kvartaali syntymäkuukaudesta (Jan-1-katkaisu, suomalainen ikäluokkajako).
// TODO (§14/§30): RAE_KERROIN:ia EI vielä sovelleta missään laskennassa. Kvartaali tallennetaan pikakenttänä
// (rae_kvartaali, tuonti+recalc) ja kerroin on tässä valmiina. Sovelluskohta = talent-/OVR-laskenta kun §14/§30
// määrittää (esim. potentiaalin normalisointi suhteellisen iän mukaan) — älä keksi OVR-logiikkaa ennen päätöstä.
var RAE_KERROIN = { Q1: 0.92, Q2: 0.96, Q3: 1.02, Q4: 1.06 };
function raeKvartaali(syntymaaika) {
  if (syntymaaika == null) return null;
  var kk = null;
  if (typeof syntymaaika === 'object' && syntymaaika.toDate) { try { kk = syntymaaika.toDate().getMonth() + 1; } catch (e) { kk = null; } }
  else if (syntymaaika instanceof Date) kk = syntymaaika.getMonth() + 1;
  else {
    var m = String(syntymaaika).match(/^\d{4}-(\d{1,2})/);   // ISO 'YYYY-MM-..'
    if (m) kk = parseInt(m[1], 10);
    else { var f = String(syntymaaika).match(/^\d{1,2}\.(\d{1,2})\./); if (f) kk = parseInt(f[1], 10); }   // 'pp.kk.vvvv'
  }
  if (kk == null || kk < 1 || kk > 12) return null;
  return kk <= 3 ? 'Q1' : kk <= 6 ? 'Q2' : kk <= 9 ? 'Q3' : 'Q4';
}
// RAE-NÄKYVYYS (Sprint 2, docs/RAE_NAKYVYYS_SPEC.md): kvartaali pikakentästä (fallback raeKvartaali) +
// underdog-LUKKO (Q4 + jokin dimensio ≥3). VAIN näkyvyys — RAE_KERROIN-korjaus odottaa OVR:ää (älä sovella tasoihin).
function raeChip(p) {
  if (p == null) return { q: null, underdog: false };
  var q = p.rae_kvartaali || raeKvartaali(p.syntymaaika);
  if (!q) return { q: null, underdog: false };
  return { q: q, underdog: isUnderdog(p) };
}
// Underdog/piilohelmi (§3B lukittu): Q4 (ikäluokan nuorin) + lvl(p) ≥ 3 (jokin dimensio ikäluokan keskitason yli).
// lvl = kanoninen _tasoLvl (max{d1_taso, hh_taso, d2_taso, laskeD2Joustava→taso}, §6b/§B10). EI "FLEI≥60". EI RAE_KERROIN:ia (§4).
function isUnderdog(p) {
  if (p == null) return false;
  var q = p.rae_kvartaali || raeKvartaali(p.syntymaaika);
  return q === 'Q4' && _tasoLvl(p) >= 3;
}
// Joukkueen BQ-jakauma (§3C, Pinta 1) — vain pelaajista joilla kvartaali. signaali: Q1>40% valintaharha · Q4>25% underdog_ok · muuten tasapaino · n=0 → null.
function raeJoukkueJakauma(pelaajat) {
  pelaajat = pelaajat || [];
  var Q = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }, n = 0;
  pelaajat.forEach(function (p) {
    var q = p && (p.rae_kvartaali || raeKvartaali(p.syntymaaika));
    if (q && Q[q] != null) { Q[q]++; n++; }
  });
  var pct = {};
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(function (k) { pct[k] = n ? Math.round(Q[k] / n * 100) : 0; });
  var signaali = null;
  if (n > 0) signaali = (pct.Q1 > 40) ? 'valintaharha' : (pct.Q4 > 25) ? 'underdog_ok' : 'tasapaino';
  return { Q1: Q.Q1, Q2: Q.Q2, Q3: Q.Q3, Q4: Q.Q4, pct: pct, n_kvartaalillisia: n, signaali: signaali };
}

// D3-VARMUUS (§C-jatko, D3_KALIBRAATIO_SPEC malli A) — kuinka luotettavasti d3_taso edustaa pelaajaa.
// Johdetaan lahteet[]:stä (pikakenttä d3_varmuus, §26). Sama periaate kuin ADAR ≥3 / ikäoletus:
// pelkkä itsearvio EI ole kova talenttiarvio — merkki estää sen lukemisen sellaisena.
//   'trianguloitu' = pelaaja + valmentaja (vahvin) · 'valmentaja' = vain valmentaja · 'itsearvio' = vain pelaaja.
// VP-arvio (pisteet[dim].vp, komento 2) lisää kalibraatiosignaalin, EI muuta varmuustasoa.
function d3Varmuus(lahteet) {
  if (!lahteet || !lahteet.length) return null;
  var onV = lahteet.indexOf('valmentaja') >= 0;
  var onP = lahteet.indexOf('pelaaja') >= 0;
  if (onV && onP) return 'trianguloitu';
  if (onV) return 'valmentaja';
  if (onP) return 'itsearvio';
  return null;
}
var D3_VARMUUS_META = {
  itsearvio:    { lbl: 'itsearvio',      vari: 'var(--amber)', txt: 'Vain pelaajan itsearvio — ei vielä valmentajan vahvistusta. Ei kova talenttiarvio.' },
  valmentaja:   { lbl: 'valmentaja',     vari: 'var(--ink3)',  txt: 'Vain valmentajan arvio — pelaaja ei ole vielä tehnyt itsearviota.' },
  trianguloitu: { lbl: 'trianguloitu ✓', vari: 'var(--teal)',  txt: 'Pelaaja + valmentaja arvioineet — luotettava D3.' }
};
// Pieni teemavärinen merkki aikuisnäkymiin (Master D3-lohko, VP pelaajamodaali). EI pelaajan näkymään (§7.22).
function d3VarmuusChip(varmuus) {
  var m = D3_VARMUUS_META[varmuus];
  if (!m) return '';
  return '<span title="' + m.txt + '" style="display:inline-block;font-size:9px;font-weight:600;letter-spacing:.04em;'
    + 'padding:1px 6px;border-radius:3px;border:.5px solid ' + m.vari + ';color:' + m.vari + ';white-space:nowrap;vertical-align:middle">' + m.lbl + '</span>';
}

// D3 kanoniset ulottuvuudet (key MUST match Master _D3_DIMS + Pelaaja itsearvio + pisteet[dim]).
// vQ = valmentajan kysymys (päivittäinen havainto) · vpQ = VP:n kysymys (kokonaiskuva, vähemmän päivittäisbiasia).
var D3_DIMS = [
  { key: 'inner_drive',       nimi: 'Sisäinen motivaatio', vQ: 'Harjoittelee omaehtoisesti, ei vain käskystä',  vpQ: 'Näkyykö omaehtoinen kehityshalu yli joukkueen vertailussa?' },
  { key: 'coachability',      nimi: 'Valmennettavuus',     vQ: 'Ottaa palautteen vastaan ja soveltaa sitä',      vpQ: 'Kehittyykö palautteen myötä myös pidemmällä aikavälillä?' },
  { key: 'resilience',        nimi: 'Sinnikkyys',          vQ: 'Ei luovuta vastoinkäymisissä',                   vpQ: 'Kestääkö vastoinkäymiset myös kovemmassa kilpailussa?' },
  { key: 'focus',             nimi: 'Keskittyminen',       vQ: 'Pysyy tehtävässä koko harjoituksen',             vpQ: 'Säilyykö keskittyminen vaativissa tilanteissa?' },
  { key: 'emotional_control', nimi: 'Tunteiden hallinta',  vQ: 'Hallitsee turhautumisen pelitilanteissa',         vpQ: 'Pysyykö malttina myös ratkaisuhetkillä?' }
];

// D3 kolmen näkökulman vertailu (D3_KALIBRAATIO_SPEC malli A): per ulottuvuus pelaaja/valmentaja/VP
// rinnakkain + kuilu (max−min ≥1.5) korostettuna ⚠. Aikuisnäkymä (Master D3-lohko + VP pelaajamodaali).
function renderD3VertailuHTML(pisteet) {
  if (!pisteet || !Object.keys(pisteet).length) return '';
  var onVP = Object.keys(pisteet).some(function (k) { return pisteet[k] && pisteet[k].vp != null; });
  var solu = function (v, vari) {
    return '<span style="flex:0 0 30px;text-align:center;font-family:var(--font-m,monospace);color:' + (v == null ? 'var(--ink3)' : vari) + '">' + (v == null ? '–' : v) + '</span>';
  };
  var head = '<div style="display:flex;align-items:center;gap:6px;font-size:9px;letter-spacing:.04em;color:var(--ink3);text-transform:uppercase;padding-bottom:3px;border-bottom:.5px solid var(--border,rgba(242,239,230,.1))">'
    + '<span style="flex:1">D3 kalibraatio</span>'
    + '<span style="flex:0 0 30px;text-align:center">Pel</span>'
    + '<span style="flex:0 0 30px;text-align:center">Val</span>'
    + '<span style="flex:0 0 30px;text-align:center">VP</span>'
    + '<span style="flex:0 0 18px"></span></div>';
  var rows = D3_DIMS.map(function (d) {
    var pt = pisteet[d.key] || {};
    var P = pt.pelaaja, V = pt.valmentaja, VP = pt.vp;
    var vals = [P, V, VP].filter(function (x) { return x != null; });
    var kuilu = vals.length >= 2 ? (Math.max.apply(null, vals) - Math.min.apply(null, vals)) : 0;
    var varo = kuilu >= 1.5;
    return '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px">'
      + '<span style="flex:1;color:var(--ink2)">' + d.nimi + '</span>'
      + solu(P, 'var(--ink)') + solu(V, 'var(--teal)') + solu(VP, 'var(--blue)')
      + '<span style="flex:0 0 18px;text-align:center" title="' + (varo ? 'Kuilu ≥1.5 — kalibraatio' : '') + '">' + (varo ? '⚠' : '') + '</span></div>';
  }).join('');
  var vihje = onVP ? '' : '<div style="font-size:10px;color:var(--ink3);margin-top:4px">VP ei ole vielä arvioinut — kalibraatiovertailu täydentyy VP-arviolla.</div>';
  return '<div style="margin-top:8px">' + head + rows + vihje + '</div>';
}

// Kalibraatiokuilu: onko pelaajalla ulottuvuus jossa valmentajan ja VP:n arvio eroaa ≥1.5 (molemmat annettu).
// Käytetään VP-Kodin/raportin signaalissa ("eroaa N pelaajalla") + Masterin valmentaja-vihjeessä.
function d3VpKuiluPelaajalla(pisteet) {
  if (!pisteet) return false;
  return Object.keys(pisteet).some(function (k) {
    var pt = pisteet[k];
    return pt && pt.valmentaja != null && pt.vp != null && Math.abs(pt.valmentaja - pt.vp) >= 1.5;
  });
}

// PER-TEST TM-NORMITASOT (§8 — yksittäiset testit, joustavuuden päätepiste). KANONINEN: Master + VP + tuleva
// datagrid kutsuvat tätä (ei normikopioita). Palauttaa rivin JOKAISESTA mitatusta testistä — myös kun aggregaatti
// (d1/d2) ei laskeudu (esim. Pallo-Iirot 10m/30m/syöttö/pujottelu ilman cmj/mas/TKI).
//   rivi = { label, arvo, yks, taso, asteikko:3|5, lahde:'hh'|'tk', dimensio:'D1'|'D2', neutraali, xfactor, pienempi, seuraavaTaso, gap }
// - Fyysiset (lin*/cmj/sj/mas/kasirata/sm_*) → eerikkilaTaso 5-port (MAS ÷3.6). H-H syöttö/pujottelu → 3-port.
//   TK-lajit (tk_lajit_viimeisin) → tkLajiTaso 1–5 (lahde:'tk' — §6.4: sama rata, ERI normi, älä sekoita H-H/TK).
// - ika/sp null → taso:null (raaka ilman tasoa, EI väärää tasoa).
// - §28 ikätietoinen neutraali (vain lin30m/mas/cmj): PRE/LAH → neutraali:true (mikä ikä tahansa); phv puuttuu & ika≤12 → neutraali:true;
//   phv puuttuu & ika≥13 → oletus:true (näytä ikänormattu taso + varaus, ei 🌱); PH/POST/AN → ei kumpaakaan. 5m/10m/syöttö/pujottelu/TK eivät.
// - xfactor:true kun taso===5 (5-port) tai taso===3 (3-port).
// - gap/seuraavaTaso: matka seuraavaan tasoon testin omissa yksiköissä (kanoninen hhSeuraavaTaso HH-testeille,
//   suora Eerikkilä-kynnys 3-port syöttö/pujottelu + sm_juoksu). pienempi=pienempi_parempi (vihjeen ±-suunta). null jos ei laskettavissa/huipulla.
// tkLajiTaso: globaali ajossa (Master lataa docs/testit_indeksit.js, VP inline-kopio); Node/Vitest → ohitetaan TK-rivit.
function perTestTasot(p, ika, sp) {
  if (p == null) return [];
  var hv = (p.hh_viimeisin && typeof p.hh_viimeisin === 'object') ? p.hh_viimeisin : {};
  var spEer = (sp === 'M' || sp === 'P') ? 'M' : (sp === 'N' || sp === 'T') ? 'N' : null;
  var NEUTR = { lin30m: 1, mas: 1, cmj: 1 };   // §28 post-PHV-herkät (maksiminopeus/voima)
  // IKÄTIETOINEN PHV-neutraali (§28): vain NEUTR-testeille.
  //   PRE/LAH → neutraali (vahvistettu pre-PHV, mikä tahansa ikä).
  //   phv puuttuu: ika ≤12 → neutraali (pre-PHV todennäköinen); ika ≥13 → ei neutraali, oletus:true (ikänormattu taso + varaus).
  //   PH/POST/AN → ei neutraali, ei oletus.
  var _phv = p.phv_tila;
  var _phvPre = (_phv === 'PRE' || _phv === 'LAH');
  var _phvPuuttuu = (_phv == null || _phv === '');
  var neutTila = function (key) {
    if (!NEUTR[key]) return { neutraali: false, oletus: false };
    if (_phvPre) return { neutraali: true, oletus: false };
    if (_phvPuuttuu) {
      if (ika != null && ika <= 12) return { neutraali: true, oletus: false };
      if (ika != null && ika >= 13) return { neutraali: false, oletus: true };
      return { neutraali: false, oletus: false };   // ikä null → taso muutenkin null
    }
    return { neutraali: false, oletus: false };       // PH/POST/AN
  };
  var out = [];
  // Gap seuraavaan tasoon Eerikkilä-normitetuille testeille jotka EIVÄT ole HH_TESTI_MAP:ssa (syöttö/pujottelu 3-port, sm_juoksu).
  var gapEer = function (eer, arvoNorm, nykyTaso) {
    var nd = EERIKKILA_NORMIT[eer];
    if (!nd || nykyTaso == null) return null;
    var maks = nd.asteikko || 5;
    if (nykyTaso >= maks) return null;
    var seur = nykyTaso + 1;
    var taul = (spEer === 'M') ? nd.pojat : nd.tytot;
    var rajat = taul && taul[Math.min(19, Math.max(10, Math.round(ika)))];
    if (!rajat || rajat[maks - seur] == null) return null;
    var kynnys = rajat[maks - seur];
    var gap = nd.pienempi_parempi ? (arvoNorm - kynnys) : (kynnys - arvoNorm);
    return (gap > 0) ? { seuraavaTaso: seur, gap: Math.round(gap * 100) / 100 } : null;
  };
  var lisaaEer = function (key, arvo, eer, label, yks, asteikko, dimensio, kmh) {
    if (arvo == null || isNaN(arvo)) return;
    var nd = EERIKKILA_NORMIT[eer];
    var taso = null, gap = null, seuraavaTaso = null;
    if (ika != null && spEer) {
      var arvoNorm = kmh ? (+arvo / 3.6) : +arvo;
      var tt = eerikkilaTaso(arvoNorm, eer, ika, spEer);
      taso = (tt > 0) ? tt : null;
      if (taso != null) {
        if (HH_TESTI_MAP[key]) {                                   // kanoninen hhSeuraavaTaso (hoitaa MAS km/h-muunnoksen)
          var st = hhSeuraavaTaso(key, +arvo, ika, spEer);
          if (st && st.gap != null && st.gap > 0) { gap = st.gap; seuraavaTaso = st.seuraavaTaso; }
        } else {                                                   // syöttö/pujottelu (3-port) + sm_juoksu
          var g = gapEer(eer, arvoNorm, taso);
          if (g) { gap = g.gap; seuraavaTaso = g.seuraavaTaso; }
        }
      }
    }
    var _nt = neutTila(key);
    out.push({ label: label, arvo: +arvo, yks: yks, taso: taso, asteikko: asteikko, lahde: 'hh', dimensio: dimensio, selKey: key,
      neutraali: _nt.neutraali, oletus: _nt.oletus, xfactor: (asteikko === 3 ? taso === 3 : taso === 5),
      pienempi: !!(nd && nd.pienempi_parempi), seuraavaTaso: seuraavaTaso, gap: gap });
  };
  // 1) Fyysiset D1 (Eerikkilä 5-port). hyppy_sj:lle ei normia → taso jää nulliksi (raaka).
  lisaaEer('lin5m',  hv.lin5m,  'nopeus_5m',  '5m',  's', 5, 'D1');
  lisaaEer('lin10m', hv.lin10m, 'nopeus_10m', '10m', 's', 5, 'D1');
  lisaaEer('lin30m', hv.lin30m, 'nopeus_30m', '30m', 's', 5, 'D1');
  lisaaEer('cmj',    hv.cmj,    'hyppy_cj',   'CMJ', 'cm', 5, 'D1');
  lisaaEer('sj',     hv.sj,     'hyppy_sj',   'SJ',  'cm', 5, 'D1');
  lisaaEer('mas',    hv.mas,    'mas',        'MAS', 'km/h', 5, 'D1', true);
  lisaaEer('kasirata', hv.kasirata, 'kasirata', 'Kasirata', 's', 5, 'D1');
  // 2) Tekninen D2: SM-suunnanmuutos (Eerikkilä 5-port) + H-H syöttö/pujottelu (3-port)
  lisaaEer('sm_juoksu', p.sm_juoksu_viimeisin, 'sm_juoksu', 'SM-juoksu', 's', 5, 'D2');
  lisaaEer('sm_pallo',  p.sm_pallo_viimeisin,  'sm_pallo',  'SM-pallo',  's', 5, 'D2');
  lisaaEer('syotto',    hv.syotto,    'syotto',    'Syöttö',    's', 3, 'D2');
  lisaaEer('pujottelu', hv.pujottelu, 'pujottelu', 'Pujottelu', 's', 3, 'D2');
  // 3) TK-lajit (1–5, lahde:'tk'). sp 'P'/'T'; tkLajiTaso vain ikä 8–13.
  var tkl = (p.tk_lajit_viimeisin && typeof p.tk_lajit_viimeisin === 'object') ? p.tk_lajit_viimeisin : null;
  if (tkl && typeof tkLajiTaso === 'function') {
    var spTk = (sp === 'M' || sp === 'P') ? 'P' : (sp === 'N' || sp === 'T') ? 'T' : null;
    [['syotto_s', 'syotto', 'Syöttö (TK)'], ['pujottelu_s', 'pujottelu', 'Pujottelu (TK)'],
     ['ponnauttelu_s', 'ponnauttelu', 'Ponnauttelu (TK)'], ['kuljetus_laukaus_s', 'kuljetus_laukaus', 'Kuljetus-laukaus (TK)']
    ].forEach(function (m) {
      var a = tkl[m[0]];
      if (a == null || isNaN(a)) return;
      var taso = null;
      if (ika != null && spTk) { var tt = tkLajiTaso(m[1], +a, Math.round(ika), spTk); taso = (tt != null && tt > 0) ? tt : null; }
      out.push({ label: m[2], arvo: +a, yks: 's', taso: taso, asteikko: 5, lahde: 'tk', dimensio: 'D2', selKey: m[1], neutraali: false, oletus: false, xfactor: (taso === 5), pienempi: true, seuraavaTaso: null, gap: null });
    });
  }
  return out;
}

// KEHITYSKORTTI (§8 redesign) — KANONINEN render-helper jonka Master JA VP kutsuvat (ei kopioitua UI-logiikkaa).
// Palauttaa HTML-merkkijonon (TM-tokenit §5: var(--teal/amber/red/ink*/bg2), reunat rgba). Sibbon malli:
//   D1/D2-mittarikortit (iso luku /5 + lähde·kattavuus) + per-test-rivit ryhmiteltynä (D1 fyysinen / D2 tekninen):
//   nimi + arvo + "→ taso N+1: ±X yks" (kanon. perTestTasot.gap) + värillinen tasomerkki ("N / 5" | "N / 3").
// §28: neutraali-rivi → 🌱 "ei vielä arvioida" (teal), EI punaista, EI gap-vihjettä. xfactor → ⭐. taso null → raaka.
// Lähde-merkinnät (§30): TK-rivi merkitään "TK"; D2-kortin caption näyttää lähteen (TKI/SM/H-H/TK). Tyhjä → ''.
function renderKehityskorttiHTML(p, ika, sp) {
  if (p == null) return '';
  // ℹ️ aina TM_SELITTEET:istä (yksi totuuslähde). Lib-taso → toimii Master+VP. title-tooltip (ei _tmIBtn-riippuvuutta).
  var _selInfo = function (k) { var t = (k && typeof TM_SELITTEET !== 'undefined' && TM_SELITTEET[k]) ? TM_SELITTEET[k] : null; return t ? ' <span title="' + String(t).replace(/"/g, '&quot;') + '" style="cursor:help;color:var(--ink3);font-size:10px;opacity:.7">ⓘ</span>' : ''; };
  var rivit = (typeof perTestTasot === 'function') ? perTestTasot(p, ika, sp) : [];
  var T = { teal: 'var(--teal)', amber: 'var(--amber)', red: 'var(--red)', ink: 'var(--ink)', ink2: 'var(--ink2)', ink3: 'var(--ink3)' };
  var bo = '.5px solid rgba(242,239,230,.08)';
  var tasoVari = function (r) {
    if (r.taso == null) return T.ink3;
    if (r.neutraali && r.taso <= 3) return T.teal;                       // §28
    if (r.asteikko === 3) return r.taso >= 3 ? T.teal : r.taso === 2 ? T.amber : T.red;
    return r.taso >= 4 ? T.teal : r.taso === 3 ? T.amber : T.red;
  };
  var rivi = function (r) {
    var col = tasoVari(r);
    var src = r.lahde === 'tk' ? ' <span style="color:' + T.ink3 + ';font-size:9px">TK</span>' : '';
    var badge;
    if (r.taso == null) badge = '<span style="color:' + T.ink3 + ';font-size:11px">raaka</span>';
    else if (r.neutraali && r.taso <= 3) badge = '<span style="color:' + T.teal + ';font-size:11px;white-space:nowrap">🌱 ei vielä arvioida</span>';
    else badge = '<span style="display:inline-block;min-width:46px;text-align:center;padding:2px 8px;border-radius:4px;border:.5px solid ' + col + ';color:' + col + ';background:rgba(255,255,255,.03);font-size:11px;font-weight:600;white-space:nowrap">' + (r.xfactor ? '⭐ ' : '') + r.taso + ' / ' + r.asteikko + '</span>';
    var vihje = '';
    if (!(r.neutraali && r.taso <= 3) && r.gap != null && r.seuraavaTaso != null) {
      vihje = '<span style="color:' + T.ink3 + ';font-size:10px">→ taso ' + r.seuraavaTaso + ': ' + (r.pienempi ? '−' : '+') + r.gap + ' ' + r.yks + '</span>';
    }
    // §28 ikäoletus (PHV mittaamatta, ika≥13): näytä taso normaalisti + pieni amber-tagi (ei 🌱)
    var oletusTag = r.oletus ? '<span title="PHV mittaamatta — taso ikänormista" style="color:' + T.amber + ';font-size:9px;border:.5px solid ' + T.amber + ';border-radius:3px;padding:0 4px;margin-left:6px">ikäoletus</span>' : '';
    // Rivittyvä layout: badge pysyy oikealla (order:2 + margin-left:auto), vihje+ikäoletus
    // pudottuvat omalle rivilleen badgen alle kapealla näytöllä (order:3 + flex 100%) → ei overlapia 390px:llä.
    var vihjeRivi = (vihje || oletusTag)
      ? '<span style="order:3;flex:1 1 100%;min-width:0">' + vihje + oletusTag + '</span>' : '';
    return '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;padding:6px 0;border-top:' + bo + '">'
      + '<span style="flex:0 0 76px;color:' + T.ink2 + ';font-size:12px">' + r.label + src + _selInfo(r.selKey) + '</span>'
      + '<span style="flex:0 0 62px;font-family:\'Cormorant Garamond\',serif;font-size:15px;color:' + T.ink + '">' + r.arvo + '<span style="font-size:10px;color:' + T.ink3 + '"> ' + r.yks + '</span></span>'
      + '<span style="order:2;margin-left:auto;flex:0 0 auto">' + badge + '</span>'
      + vihjeRivi + '</div>';
  };
  var ryhma = function (otsikko, dim) {
    var rs = rivit.filter(function (r) { return r.dimensio === dim; });
    if (!rs.length) return '';
    return '<div style="margin-top:13px"><div style="font-size:10px;letter-spacing:.06em;color:' + T.ink3 + ';text-transform:uppercase;margin-bottom:2px">' + otsikko + '</div>' + rs.map(rivi).join('') + '</div>';
  };
  var kortti = function (lbl, val, capt, vari, selKey) {
    return '<div style="flex:1;background:var(--bg2);border:' + bo + ';border-radius:8px;padding:11px 13px">'
      + '<div style="font-size:10px;letter-spacing:.06em;color:' + T.ink3 + ';text-transform:uppercase">' + lbl + _selInfo(selKey) + '</div>'
      + '<div style="font-family:\'Cormorant Garamond\',serif;font-size:30px;line-height:1.15;color:' + (val == null ? T.ink3 : vari) + '">' + (val == null ? '—' : val) + '<span style="font-size:13px;color:' + T.ink3 + '"> / 5</span></div>'
      + '<div style="font-size:10px;color:' + T.ink3 + ';margin-top:1px">' + capt + '</div></div>';
  };
  // D1-kortti (d1_taso → hh_taso)
  var d1v = null, d1c = '—', d1col = T.ink;
  if (p.d1_taso != null) { d1v = p.d1_taso; d1c = 'lähde: H-H' + (p.d1_kattavuus ? ' · ' + p.d1_kattavuus + ' testiä' : ''); }
  else if (p.hh_taso != null) { d1v = p.hh_taso; d1c = 'lähde: H-H'; }
  if (d1v != null) d1col = d1v >= 4 ? T.teal : d1v >= 3 ? T.amber : T.red;
  // D2-kortti (TKI > d2_taso). Lähde-merkintä §30.
  var d2v = null, d2c = '—', d2col = T.ink;
  if (p.tki_viimeisin != null) { d2v = Math.round(p.tki_viimeisin / 20 * 10) / 10; d2c = 'lähde: TKI'; }
  else if (p.d2_taso != null) { d2v = p.d2_taso; d2c = 'lähde: ' + ({ sm: 'SM', hh: 'H-H', tk: 'TK' }[p.d2_lahde] || 'tekninen') + (p.d2_kattavuus ? ' · ' + p.d2_kattavuus + ' testiä' : ''); }
  if (d2v != null) d2col = d2v >= 3.5 ? T.teal : d2v >= 2.5 ? T.amber : T.red;

  if (!rivit.length && d1v == null && d2v == null) return '';
  var h = '';
  if (d1v != null || d2v != null) h += '<div style="display:flex;gap:10px;margin-bottom:2px">' + kortti('D1 Fyysinen', d1v, d1c, d1col, 'd1') + kortti('D2 Tekninen', d2v, d2c, d2col, 'd2') + '</div>';
  h += ryhma('Fyysinen (D1)', 'D1');
  h += ryhma('Tekniikka (D2)', 'D2');
  if (rivit.length) {
    var onOletus = rivit.some(function (r) { return r.oletus; });
    h += '<div style="margin-top:8px;font-size:10px;color:' + T.ink3 + ';line-height:1.5">🌱 = ennen kasvupyrähdystä, fyysistä ei vielä arvioida · ⭐ = X-Factor (huipputaso)'
      + (onOletus ? ' · <span style="color:' + T.amber + '">ikäoletus</span> = PHV mittaamatta, taso ikänormista — tarkentuu kasvumittauksella' : '')
      + ' · tekniikka 1–3, fyysinen 1–5</div>';
  }
  return h;
}

// ════════════════════════════════════════════════════════════════════════════
// HARJOITUSARVIOINTI (kaksimallinen) — puhtaat laskurit (docs/HARJOITUSARVIOINTI_SPEC.md)
// A = Palloliiton harjoittelun laatu (0–10 + %-kriteerit) · B = valmennustaidot (1–5 + reflektio).
// Vain pikakenttä-/vastaus-objekteja, ei DOM/Firestore. §26.
// ════════════════════════════════════════════════════════════════════════════
function _ha_ka(arvot) {
  var v = arvot.filter(function (x) { return x != null && !isNaN(x); });
  return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 10) / 10 : null;
}
// Malli A: ka = a1,a3,a4,a5,a7 (0–10) keskiarvo; a2→liike_pct, a6→maali_pct (0–100). null-turva.
function laskeHarjoituslaatuPalloliitto(vastaukset) {
  vastaukset = vastaukset || {};
  var num = function (x) { return (x != null && !isNaN(Number(x))) ? Number(x) : null; };
  var ka = _ha_ka(['a1', 'a3', 'a4', 'a5', 'a7'].map(function (k) { return num(vastaukset[k]); }));
  return { ka_0_10: ka, liike_pct: num(vastaukset.a2), maali_pct: num(vastaukset.a6) };
}
// Malli B: b1–b7 (1–5) keskiarvo, null jos 0 vastausta.
function laskeValmennustaitoIndeksi(vastaukset) {
  vastaukset = vastaukset || {};
  var num = function (x) { return (x != null && !isNaN(Number(x))) ? Number(x) : null; };
  return _ha_ka(['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].map(function (k) { return num(vastaukset[k]); }));
}
// Kalibraatiokuilu malli B: itsearvio − havainnointi per kriteeri + ka |Δ| (vain yhteiset kriteerit).
function laskeHarjoitusKalibraatio(itsearvio, havainnointi) {
  itsearvio = itsearvio || {}; havainnointi = havainnointi || {};
  var per = {}, absit = [];
  ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'].forEach(function (k) {
    var i = itsearvio[k], h = havainnointi[k];
    if (i != null && !isNaN(i) && h != null && !isNaN(h)) { var d = Number(i) - Number(h); per[k] = d; absit.push(Math.abs(d)); }
  });
  return { per_kriteeri: per, ka_abs_kuilu: absit.length ? Math.round(absit.reduce(function (a, b) { return a + b; }, 0) / absit.length * 100) / 100 : null };
}
// Koostaa valmentajan pikakentät arviointilistasta, malli erottaa. Yksinkertainen ka (Vaihe 1).
function laskeValmentajaHarjoitusKooste(arvioinnit) {
  arvioinnit = arvioinnit || [];
  var _uusinPvm = function (lista) { var p = null; lista.forEach(function (a) { if (a.pvm && (!p || String(a.pvm) > String(p))) p = a.pvm; }); return p; };
  var aLista = arvioinnit.filter(function (a) { return a.malli === 'palloliitto'; });
  var bLista = arvioinnit.filter(function (a) { return a.malli === 'valmennustaidot'; });
  var out = {};
  var aKat = aLista.map(function (a) { return laskeHarjoituslaatuPalloliitto(a.vastaukset).ka_0_10; }).filter(function (x) { return x != null; });
  out.harjoituslaatu_ka = aKat.length ? Math.round(aKat.reduce(function (a, b) { return a + b; }, 0) / aKat.length * 10) / 10 : null;
  out.harjoituslaatu_n = aLista.length;
  out.harjoituslaatu_pvm = _uusinPvm(aLista);
  // viimeisin A:n %-kriteerit (uusimmasta)
  var aUusin = aLista.slice().sort(function (x, y) { return String(y.pvm || '').localeCompare(String(x.pvm || '')); })[0];
  if (aUusin) { var r = laskeHarjoituslaatuPalloliitto(aUusin.vastaukset); out.harjoituslaatu_liike_pct = r.liike_pct; out.harjoituslaatu_maali_pct = r.maali_pct; }
  var bKat = bLista.map(function (a) { return laskeValmennustaitoIndeksi(a.vastaukset); }).filter(function (x) { return x != null; });
  out.valmennustaito_ka = bKat.length ? Math.round(bKat.reduce(function (a, b) { return a + b; }, 0) / bKat.length * 10) / 10 : null;
  out.valmennustaito_n = bLista.length;
  out.valmennustaito_pvm = _uusinPvm(bLista);
  return out;
}

// ── HARJOITUSARVIOINTI VAIHE 2.1 — dashboard-koosteet (HARJOITUSARVIOINTI_VAIHE2_SPEC) ──
function _haAvaimet(malli) { return malli === 'valmennustaidot' ? ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'] : ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']; }
function _haOverall(a) { return a.malli === 'valmennustaidot' ? laskeValmennustaitoIndeksi(a.vastaukset) : laskeHarjoituslaatuPalloliitto(a.vastaukset).ka_0_10; }
// Koostaa suodatetun otoksen: {n, ka (overall), per_kriteeri:{a1:{ka,n}…}, viimeisin_pvm}.
function koostaHarjoitusarvioinnit(arvioinnit, opts) {
  arvioinnit = arvioinnit || []; opts = opts || {};
  var malli = opts.malli || 'palloliitto';
  var lc = function (x) { return String(x == null ? '' : x).toLowerCase().trim(); };
  var koh = arvioinnit.filter(function (a) {
    if (a.malli !== malli) return false;
    if (opts.joukkue && lc(a.joukkue) !== lc(opts.joukkue)) return false;
    if (opts.ikavaihe && a.ikavaihe !== opts.ikavaihe) return false;
    if (opts.valmentaja && a.valmentajaUid !== opts.valmentaja) return false;
    if (opts.arviointitapa && a.arviointitapa !== opts.arviointitapa) return false;   // malli B -suodatin
    if (opts.aikavali) {
      if (opts.aikavali.alku && String(a.pvm || '') < String(opts.aikavali.alku)) return false;
      if (opts.aikavali.loppu && String(a.pvm || '') > String(opts.aikavali.loppu)) return false;
    }
    return true;
  });
  var per = {};
  _haAvaimet(malli).forEach(function (k) {
    var vals = koh.map(function (a) { return (a.vastaukset && a.vastaukset[k] != null && !isNaN(a.vastaukset[k])) ? Number(a.vastaukset[k]) : null; }).filter(function (x) { return x != null; });
    per[k] = { ka: vals.length ? Math.round(vals.reduce(function (s, x) { return s + x; }, 0) / vals.length * 10) / 10 : null, n: vals.length };
  });
  var ov = koh.map(_haOverall).filter(function (x) { return x != null; });
  var ka = ov.length ? Math.round(ov.reduce(function (s, x) { return s + x; }, 0) / ov.length * 10) / 10 : null;
  var viim = null; koh.forEach(function (a) { if (a.pvm && (!viim || String(a.pvm) > String(viim))) viim = a.pvm; });
  return { n: koh.length, ka: ka, per_kriteeri: per, viimeisin_pvm: viim };
}
// ISO-viikko pvm-stringistä 'YYYY-MM-DD'.
function _haIsoViikko(pvm) {
  var p = String(pvm).split('-'); var d = new Date(Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1));
  var day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  var ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var wk = Math.ceil((((d - ys) / 86400000) + 1) / 7);
  return d.getUTCFullYear() + '-W' + (wk < 10 ? '0' : '') + wk;
}
// Aikasarja overall-ka per bucket. bucket 'kuukausi'(oletus)|'viikko'|'kausi'.
function harjoitusTrendi(arvioinnit, opts) {
  arvioinnit = arvioinnit || []; opts = opts || {};
  var bucket = opts.bucket || 'kuukausi';
  var avain = function (pvm) {
    var s = String(pvm || ''); if (s.length < 7) return null;
    if (bucket === 'viikko') return _haIsoViikko(s);
    if (bucket === 'kausi') { var y = +s.slice(0, 4), m = +s.slice(5, 7); var sy = m >= 7 ? y : y - 1; return sy + '/' + String(sy + 1).slice(-2); }
    return s.slice(0, 7);   // kuukausi YYYY-MM
  };
  var ryhmat = {};
  arvioinnit.forEach(function (a) {
    var k = avain(a.pvm); if (k == null) return;
    var ov = _haOverall(a); if (ov == null) return;
    (ryhmat[k] = ryhmat[k] || []).push(ov);
  });
  return Object.keys(ryhmat).sort().map(function (k) {
    var v = ryhmat[k];
    return { label: k, ka: Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length * 10) / 10, n: v.length };
  });
}
// Delta per kriteeri vs kansallinen ka. a7 (seuran oma) → ei kansallista → delta null, suunta 'neutraali'.
function harjoitusBenchmarkDelta(per_kriteeri, kansallinen_ka) {
  per_kriteeri = per_kriteeri || {}; kansallinen_ka = kansallinen_ka || {};
  var out = {};
  Object.keys(per_kriteeri).forEach(function (k) {
    var oma = per_kriteeri[k] ? per_kriteeri[k].ka : null;
    var nat = kansallinen_ka[k];
    if (oma == null || nat == null || isNaN(nat)) { out[k] = { delta: null, suunta: 'neutraali', kansallinen: (nat == null || isNaN(nat)) ? null : nat }; return; }
    var d = Math.round((oma - nat) * 10) / 10;
    out[k] = { delta: d, suunta: d > 0 ? 'yli' : d < 0 ? 'ali' : 'tasan', kansallinen: nat };
  });
  return out;
}

// Kalibraatiohistoria (Vaihe 2.2) — vahvistetuista itsearvio↔havainnointi-pareista per valmentaja.
// Pari = kaksi malli B -arviointia samalla pari_id + pari_vahvistettu===true (1 itsearvio + 1 havainnointi).
// kuilu = itsearvio − havainnointi (laskeHarjoitusKalibraatio). Kaventuva keskikuilu = parempi itsetuntemus.
function harjoitusKalibraatioHistoria(arvioinnit) {
  arvioinnit = arvioinnit || [];
  var parit = {};
  arvioinnit.forEach(function (a) {
    if (a.malli !== 'valmennustaidot') return;
    if (!a.pari_id || a.pari_vahvistettu !== true) return;
    (parit[a.pari_id] = parit[a.pari_id] || []).push(a);
  });
  var per = {};
  Object.keys(parit).forEach(function (pid) {
    var g = parit[pid];
    var itse = g.filter(function (x) { return x.arviointitapa === 'itsearvio'; })[0];
    var hav = g.filter(function (x) { return x.arviointitapa === 'havainnointi'; })[0];
    if (!itse || !hav) return;   // pariton/epätäydellinen → pois
    var kal = laskeHarjoitusKalibraatio(itse.vastaukset, hav.vastaukset);
    if (kal.ka_abs_kuilu == null) return;
    var uid = hav.valmentajaUid || itse.valmentajaUid;
    var r = per[uid] = per[uid] || { valmentajaUid: uid, valmentaja: hav.valmentaja || itse.valmentaja, parit: [], _sum: {}, _n: {} };
    r.parit.push({ pari_id: pid, pvm: hav.pvm || itse.pvm, joukkue: hav.joukkue || itse.joukkue, per_kriteeri: kal.per_kriteeri, ka_abs_kuilu: kal.ka_abs_kuilu });
    Object.keys(kal.per_kriteeri).forEach(function (bk) { r._sum[bk] = (r._sum[bk] || 0) + kal.per_kriteeri[bk]; r._n[bk] = (r._n[bk] || 0) + 1; });
  });
  Object.keys(per).forEach(function (uid) {
    var r = per[uid];
    r.parit.sort(function (a, b) { return String(a.pvm || '').localeCompare(String(b.pvm || '')); });
    r.n_paria = r.parit.length;
    r.keskikuilu = Math.round(r.parit.reduce(function (s, p) { return s + p.ka_abs_kuilu; }, 0) / r.parit.length * 100) / 100;
    r.per_kriteeri = {};
    Object.keys(r._sum).forEach(function (bk) { r.per_kriteeri[bk] = Math.round(r._sum[bk] / r._n[bk] * 100) / 100; });
    delete r._sum; delete r._n;
    var maxK = null, maxV = -1;
    Object.keys(r.per_kriteeri).forEach(function (bk) { var av = Math.abs(r.per_kriteeri[bk]); if (av > maxV) { maxV = av; maxK = bk; } });
    r.suurin_kuilu_kriteeri = maxK; r.suurin_kuilu_arvo = maxK != null ? r.per_kriteeri[maxK] : null;
    var ks = Object.keys(r.per_kriteeri);
    var avgSigned = ks.length ? ks.reduce(function (s, bk) { return s + r.per_kriteeri[bk]; }, 0) / ks.length : 0;
    r.suunta = avgSigned > 0.3 ? 'yliarvio' : avgSigned < -0.3 ? 'aliarvio' : 'linjassa';
    r.trendi = r.parit.map(function (p) { return { pvm: p.pvm, kuilu: p.ka_abs_kuilu }; });
    if (r.parit.length >= 2) { var eka = r.parit[0].ka_abs_kuilu, vika = r.parit[r.parit.length - 1].ka_abs_kuilu; r.kaventuu = vika < eka; r.kuilu_muutos = Math.round((vika - eka) * 100) / 100; }
    else { r.kaventuu = null; r.kuilu_muutos = null; }
  });
  return per;
}

// Valmentajan oma kehityskooste (Vaihe 2.3a) — kaikki omasta datasta (valmentajaUid==uid).
// Yhdistää 2.1/2.2-funktiot: A/B-trendit + oma kalibraatio + reflektiopäiväkirja + seuraava askel.
function omaKehitysKooste(arvioinnit, uid) {
  arvioinnit = arvioinnit || [];
  var omat = arvioinnit.filter(function (a) { return a.valmentajaUid === uid; });
  var aLista = omat.filter(function (a) { return a.malli === 'palloliitto'; });
  var bLista = omat.filter(function (a) { return a.malli === 'valmennustaidot'; });
  var trendA = harjoitusTrendi(aLista, { bucket: 'kuukausi' });
  var trendB = harjoitusTrendi(bLista, { bucket: 'kuukausi' });
  var kalibMap = harjoitusKalibraatioHistoria(omat);
  var kalib = kalibMap[uid] || null;
  var reflektiot = bLista.filter(function (a) { return a.reflektio && (a.reflektio.onnistui || a.reflektio.toisin || a.reflektio.kehityskohde); })
    .map(function (a) { return { pvm: a.pvm, joukkue: a.joukkue, onnistui: a.reflektio.onnistui || '', toisin: a.reflektio.toisin || '', kehityskohde: a.reflektio.kehityskohde || '' }; })
    .sort(function (x, y) { return String(y.pvm || '').localeCompare(String(x.pvm || '')); });
  var seuraavaAskel = null;
  for (var i = 0; i < reflektiot.length; i++) { if (reflektiot[i].kehityskohde) { seuraavaAskel = { teksti: reflektiot[i].kehityskohde, pvm: reflektiot[i].pvm, lahde: 'reflektio' }; break; } }
  // viimeisimmät overall-arvot trendeistä (vahvuus-kehys)
  var viimA = trendA.length ? trendA[trendA.length - 1].ka : null;
  var viimB = trendB.length ? trendB[trendB.length - 1].ka : null;
  return { n_A: aLista.length, n_B: bLista.length, trendA: trendA, trendB: trendB, viimA: viimA, viimB: viimB, kalib: kalib, reflektiot: reflektiot, seuraavaAskel: seuraavaAskel };
}

// CPD-kooste (Vaihe 2.3b-2) — kertynyt CPD = reflektio-CPD (Σ cpd_minuutit → h) + koulutus-/kurssi-CPD (cpd_tunnit_kausi).
// EI ylikirjoiteta cpd_tunnit_kausi:ta. Edistymä-% VAIN jos vaatimusH asetettu (datagate, ei kovakoodattuja oletuksia).
function cpdKooste(reflektiot, koulutusTunnit, vaatimusH) {
  reflektiot = reflektiot || [];
  var min = reflektiot.reduce(function (s, r) { var v = Number(r && r.cpd_minuutit); return s + (isNaN(v) ? 0 : v); }, 0);
  var refH = Math.round(min / 60 * 10) / 10;
  var koulH = (koulutusTunnit != null && !isNaN(koulutusTunnit)) ? Number(koulutusTunnit) : 0;
  var kertynyt = Math.round((refH + koulH) * 10) / 10;
  var vaat = (vaatimusH != null && !isNaN(vaatimusH) && Number(vaatimusH) > 0) ? Number(vaatimusH) : null;
  var edistyma = vaat ? Math.min(100, Math.round(kertynyt / vaat * 100)) : null;
  return { reflektio_min: min, reflektio_h: refH, koulutus_h: koulH, kertynyt_h: kertynyt, vaatimus_h: vaat, edistyma_pct: edistyma };
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
    normSukupuoliMN,
    onNeutraaliPrePHV,
    teknHeikoimmat20,
    laskeD1Joustava,
    laskeD1Osaindeksit,
    laskeJoukkuePoikkeamat,
    laskeValmentajaKalibraatio,
    vanhempiRaporttiTekstit,
    laskeReviewKadenssi,
    laskeJoukkueReviewKooste,
    laskeVPTuloskortti,
    laskeTavoiteToteuma,
    laskeTaso3Osuus,
    tasoJakauma,
    tkiTavoiteJakauma,
    // Harjoitusarviointi (kaksimallinen) — HARJOITUSARVIOINTI_SPEC
    laskeHarjoituslaatuPalloliitto,
    laskeValmennustaitoIndeksi,
    laskeHarjoitusKalibraatio,
    laskeValmentajaHarjoitusKooste,
    koostaHarjoitusarvioinnit,
    harjoitusTrendi,
    harjoitusBenchmarkDelta,
    harjoitusKalibraatioHistoria,
    omaKehitysKooste,
    cpdKooste,
    laskeD2HH,
    d2SmPalloFallback,
    laskeD2Joustava,
    perTestTasot,
    renderKehityskorttiHTML,
    // Ikäkonventio §24/§26 (docs/IKAKONVENTIO_SPEC.md)
    normiIka,
    raeKvartaali,
    RAE_KERROIN,
    raeChip,
    isUnderdog,
    raeJoukkueJakauma,
    // D3-varmuus + kalibraatio (D3_KALIBRAATIO_SPEC malli A)
    d3Varmuus,
    D3_VARMUUS_META,
    d3VarmuusChip,
    D3_DIMS,
    renderD3VertailuHTML,
    d3VpKuiluPelaajalla,
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
  module.exports.normSukupuoliMN = normSukupuoliMN;
  module.exports.onNeutraaliPrePHV = onNeutraaliPrePHV;
  module.exports.teknHeikoimmat20 = teknHeikoimmat20;
  module.exports.d2SmPalloFallback = d2SmPalloFallback;
  module.exports.tasoJakauma = tasoJakauma;
  module.exports.tkiTavoiteJakauma = tkiTavoiteJakauma;
}
