// ════════════════════════════════════════════════════════════════════════
// tm_bioika.js — TalentMaster™ Biologisen iän laskentamoduuli v1.2
// Huhtikuu 2026
//
// MENETELMÄ: Mirwald 2002 (ainoa käytössä oleva)
//   Lähde: Mirwald RL et al. Med Sci Sports Exerc 2002;34(4):689-694
//   Tarvitsee: ikä, pituus, paino, istumapituus, sukupuoli
//   Antaa: maturity_offset, PHV-ikä, PHV-tila, yli-ikäisyys
//
// KHAMIS-ROCHE: Poistettu. Alkuperäisiä kertoimia ei voitu verifioidusti
//   vahvistaa — virheellinen ennuste on pahempi kuin ei ennustetta.
//
// ARKKITEHTUURIPERIAATE — BIOLOGINEN IKÄ ON OMA TESTIKERTANSA:
//   Istumapituusmittaus (Mirwald) tehdään usein eri sessiossa kuin
//   HH-testit tai tekniikkakilpailut. Siksi mittaukset tallennetaan
//   OMAAN alikokooelmaansa, eivät suoraan pelaajadokumenttiin:
//
//     pelaajat/{id}/biologinen_ika/{mittausPvm}
//       → historia: kehitys Pre-PHV → PHV-huippu → Post-PHV yli ajan
//
//   VP-dashboardin nopeaa hakua varten tallennetaan myös pikakenttä:
//     pelaajat/{id}.biologinenIka_viimeisin
//       → päivitetään aina kun uusi mittaus tallennetaan
//
// PALLOLIITON YLI-IKÄISYYSSAANTO:
//   Jos Mirwald-PHV-ikä >= kuukausittainen kynnysarvo (APHV - 0.75v),
//   VP voi hakea Palloliitolta poikkeusluvan nuorempaan ikäluokkaan.
// ════════════════════════════════════════════════════════════════════════

'use strict';

// ── Palloliiton yli-ikäisyyssaannon kynnysarvot ───────────────────────────
// Lähde: BioIkä-Excel v3 / Yli-ikäisyys-välilehti (Suomen Palloliitto)
// Muoto: syntymäkuukausi (1-12) → [pojat_kynnys, tytot_kynnys]
const YLI_IKAISYYS_KYNNYS = {
   1: [14.9667, 13.0667],
   2: [14.8833, 12.9833],
   3: [14.8000, 12.9000],
   4: [14.7167, 12.8167],
   5: [14.6333, 12.7333],
   6: [14.5500, 12.6500],
   7: [14.4667, 12.5667],
   8: [14.3833, 12.4833],
   9: [14.3000, 12.4000],
  10: [14.2167, 12.3167],
  11: [14.1333, 12.2333],
  12: [14.0500, 12.1500],
};

// ════════════════════════════════════════════════════════════════════════
// MIRWALD 2002 — maturity offset laskenta
//
// Maturity offset = kuinka monen vuoden päässä pelaaja on PHV-huipusta:
//   offset < 0  → ennen huippua  (Pre-PHV)
//   offset ≈ 0  → huipun kohdalla (PHV-huippu ±0.5v)
//   offset > 0  → huippu ohitettu (Post-PHV)
//
// PHV-ikä = kronologinen ikä − maturity_offset
//   → Ikä jolloin kasvupyrähdyksen huippu on/oli
//   → Vertaillaan Palloliiton kynnysarvoihin
// ════════════════════════════════════════════════════════════════════════

/**
 * Laskee Mirwald 2002 -kaavan mukaisen maturity offsetin.
 * Kaava on identtinen BioIkä-Excelin sarakkeen P kanssa.
 *
 * @param {Object} m
 * @param {number} m.ika           Kronologinen ikä vuosina (esim. 13.42)
 * @param {number} m.pituus        Seisomapituus cm (kahden mittauksen ka)
 * @param {number} m.paino         Paino kg
 * @param {number} m.istumapituus  Istumapituus cm
 * @param {string} m.sukupuoli     'P' tai 'T'
 * @returns {Object|null}
 */
function laskeMirwald(m) {
  const { ika, pituus, paino, istumapituus, sukupuoli } = m;
  if (!ika || !pituus || !paino || !istumapituus || !sukupuoli) return null;

  const jalat = pituus - istumapituus; // jalkojenpituus

  let offset;
  if (sukupuoli === 'P') {
    // Poikien kaava — Mirwald 2002 Table 1
    offset = -9.236
      + 0.0002708 * (jalat * istumapituus)
      - 0.001663  * (ika  * jalat)
      + 0.007216  * (ika  * istumapituus)
      + 0.02292   * (paino / pituus * 100);
  } else {
    // Tyttöjen kaava — Mirwald 2002 Table 2
    offset = -9.376
      + 0.0001882 * (jalat * istumapituus)
      + 0.0022    * (ika  * jalat)
      + 0.005841  * (ika  * istumapituus)
      - 0.002658  * (ika  * paino)
      + 0.07693   * (paino / pituus * 100);
  }

  const maturity_offset = Math.round(offset * 100) / 100;
  const phv_ika         = Math.round((ika - offset) * 100) / 100;

  // PHV-tila — sama logiikka kuin Excelin sarake R
  let phv_tila, phv_tila_koodi;
  if      (offset < -1.0) { phv_tila = 'Pre-PHV (>1v ennen)';      phv_tila_koodi = 'PRE';  }
  else if (offset < -0.5) { phv_tila = 'Lähestyy PHV (0.5–1v)';   phv_tila_koodi = 'LAH';  }
  else if (offset <=  0.5){ phv_tila = 'PHV-huippu (±0.5v)';       phv_tila_koodi = 'PH';   }
  else if (offset <=  1.0){ phv_tila = 'Post-PHV (0.5–1v jälk.)';  phv_tila_koodi = 'POST'; }
  else                     { phv_tila = 'Jälki-PHV (>1v jälk.)';   phv_tila_koodi = 'AN';   }

  return {
    maturity_offset,
    phv_ika,
    phv_tila,
    phv_tila_koodi,
    jalkojenpituus: Math.round(jalat * 10) / 10,
  };
}

// ════════════════════════════════════════════════════════════════════════
// PÄÄFUNKTIO — rakentaa Firestore-dokumentin yhden mittauskerran tiedoista
//
// Kutsu tästä kun testauslomake tai Excel-tuonti saa mittausarvot.
// Palauttaa valmiin dokumentin joka tallennetaan kahteen paikkaan:
//
//   pelaajat/{id}/biologinen_ika/{mittausPvm}   ← historia
//   pelaajat/{id}.biologinenIka_viimeisin       ← VP-näkymän pikakenttä
// ════════════════════════════════════════════════════════════════════════

/**
 * Rakentaa biologisen iän Firestore-dokumentin.
 * Dokumentin ID = mittauspäivä merkkijonona (esim. '2026-04-10').
 *
 * @param {Object}       syote
 * @param {string}       syote.sukupuoli      'P'/'poika' tai 'T'/'tytto'
 * @param {Date|string}  syote.syntymapvm
 * @param {Date|string}  [syote.mittauspaiva] Oletus: tänään
 * @param {number}       syote.pituus         cm
 * @param {number}       syote.paino          kg
 * @param {number}       syote.istumapituus   cm
 * @param {string}       [syote.konteksti]    'kartoitus'|'hh_testi'|'erillinen'
 * @param {string}       [syote.mittaaja]     Mittaajan nimi tai rooli
 * @returns {Object|null}
 */
function laskeBioIkaDokumentti(syote) {
  const sp = syote.sukupuoli || 'P';
  const sukupuoli = (sp === 'T' || sp === 'tytto' || sp === 'F' || sp === 'girl')
    ? 'T' : 'P';

  // Mittauspäivä voi erota muista testeistä — tämä on keskeinen arkkitehtuuriperiaate
  const mittauspaiva   = syote.mittauspaiva ? new Date(syote.mittauspaiva) : new Date();
  const syntymapvm     = new Date(syote.syntymapvm);
  const ika            = (mittauspaiva - syntymapvm) / (365.25 * 24 * 3600 * 1000);
  const syntymakuukausi = syntymapvm.getMonth() + 1;

  const mirwTulos = laskeMirwald({
    ika,
    pituus:       parseFloat(syote.pituus),
    paino:        parseFloat(syote.paino),
    istumapituus: parseFloat(syote.istumapituus),
    sukupuoli,
  });
  if (!mirwTulos) return null;

  // Yli-ikäisyyssaannon tarkistus
  let yli_ikaisyys = null;
  const kynnysData = YLI_IKAISYYS_KYNNYS[syntymakuukausi];
  if (kynnysData) {
    const kynnys = sukupuoli === 'P' ? kynnysData[0] : kynnysData[1];
    yli_ikaisyys = {
      kynnys,
      poikkeuslupa:  mirwTulos.phv_ika >= kynnys,
      teksti:        mirwTulos.phv_ika >= kynnys
        ? 'KYLLA - poikkeuslupa mahdollinen'
        : 'EI täytä ehtoja',
      syntymakuukausi,
    };
  }

  const mittausPvmStr = mittauspaiva.toISOString().split('T')[0];

  return {
    // Dokumentin ID ja konteksti
    mittauspaiva:  mittausPvmStr,
    konteksti:     syote.konteksti || 'erillinen', // 'kartoitus'|'hh_testi'|'erillinen'
    mittaaja:      syote.mittaaja || null,

    // Raakamittaukset — tallennetaan aina historiaan
    mittaukset: {
      pituus:       parseFloat(syote.pituus),
      paino:        parseFloat(syote.paino),
      istumapituus: parseFloat(syote.istumapituus),
      sukupuoli,
    },

    // Ikä mittaushetkellä (ei välttämättä sama kuin muiden testien ikä)
    ika_mittaushetkella: Math.round(ika * 100) / 100,

    // Mirwald-tulokset
    menetelma:        'mirwald_2002',
    maturity_offset:  mirwTulos.maturity_offset,
    phv_ika:          mirwTulos.phv_ika,
    phv_tila:         mirwTulos.phv_tila,
    phv_tila_koodi:   mirwTulos.phv_tila_koodi, // harjoitusohjelma lukee tämän

    // Palloliiton yli-ikäisyyssaanto
    yli_ikaisyys,

    // Yhteensopivuuskentät tm_ylaikaisyys.js:lle —
    // se lukee: pelaaja.biologinenIka.krono, .phvTila, .mirwald.*
    krono:   Math.round(ika * 100) / 100,
    phvTila: mirwTulos.phv_tila,
    mirwald: {
      pituus:       parseFloat(syote.pituus),
      istumapituus: parseFloat(syote.istumapituus),
      paino:        parseFloat(syote.paino),
      ika:          Math.round(ika * 100) / 100,
      sukupuoli,
    },

    laskettu: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════════
// TALLENNUSAPU — palauttaa molemmat Firestore-operaatiot valmiina
// ════════════════════════════════════════════════════════════════════════

/**
 * Palauttaa valmiit tallennusparametrit kutsuvan koodin käytettäväksi.
 *
 * Käyttö testauslomakkeessa tai Excel-tuonnissa:
 *
 *   const ops = bioIkaTallennusOperaatiot(syote);
 *   if (!ops) return;
 *
 *   const baseRef = db.collection('seurat').doc(seuraId)
 *                     .collection('pelaajat').doc(pelaajaId);
 *
 *   // 1. Tallenna historia (aiemmat mittaukset säilyvät)
 *   await baseRef.collection('biologinen_ika')
 *                .doc(ops.mittausPvmId)
 *                .set(ops.dokumentti);
 *
 *   // 2. Päivitä pikakenttä VP-näkymää varten
 *   await baseRef.update({
 *     biologinenIka_viimeisin: ops.dokumentti,
 *     phv_tila: ops.dokumentti.phv_tila_koodi,
 *   });
 *
 * @returns {{ mittausPvmId: string, dokumentti: Object }|null}
 */
function bioIkaTallennusOperaatiot(syote) {
  const dok = laskeBioIkaDokumentti(syote);
  if (!dok) return null;
  return {
    mittausPvmId: dok.mittauspaiva, // käytetään dokumentin ID:nä
    dokumentti:   dok,
  };
}

// ════════════════════════════════════════════════════════════════════════
// APUFUNKTIOT — VP-dashboardin ja pelaajanäkymän käyttöön
// ════════════════════════════════════════════════════════════════════════

/**
 * Lyhyt tekstiyhteenveto VP:n näkymään.
 * Esim. "13.2v | PHV-huippu ⚠️ | mitattu 2026-04-10"
 *
 * @param {Object} dok Firestore-dokumentti biologinen_ika-kokoelmasta
 */
function bioIkaTiivistelma(dok) {
  if (!dok) return '—';
  const osat = [`${dok.ika_mittaushetkella ?? dok.krono}v`];
  const nimet = { PRE:'Pre-PHV', LAH:'Lähestyy PHV', PH:'PHV-huippu ⚠️', POST:'Post-PHV', AN:'Jälki-PHV' };
  if (dok.phv_tila_koodi) osat.push(nimet[dok.phv_tila_koodi] || dok.phv_tila_koodi);
  if (dok.mittauspaiva)   osat.push(`mitattu ${dok.mittauspaiva}`);
  return osat.join(' | ');
}

/**
 * Palauttaa yli-ikäisyysmerkin VP:n näkymään, tai null jos ei koske.
 * Esim. "✅ Poikkeuslupa mahdollinen — PHV-ikä 14.8v, kynnys 14.72v"
 */
function yliIkaisyysMerkki(dok) {
  if (!dok?.yli_ikaisyys?.poikkeuslupa) return null;
  return `✅ Poikkeuslupa mahdollinen — PHV-ikä ${dok.phv_ika}v, kynnys ${dok.yli_ikaisyys.kynnys}v`;
}

/**
 * PHV-tilan värikoodi CSS-muuttujana UI:hin.
 * PHV-huippu on punainen koska harjoitusohjelman kuormarajoitin aktivoituu.
 */
function phvTilaVari(koodi) {
  return ({
    PRE:  'var(--color-text-info)',
    LAH:  'var(--color-text-warning)',
    PH:   'var(--color-text-danger)',
    POST: 'var(--color-text-success)',
    AN:   'var(--color-text-secondary)',
  })[koodi] ?? 'var(--color-text-secondary)';
}

// ── Eksportointi ──────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    laskeBioIkaDokumentti, bioIkaTallennusOperaatiot, laskeMirwald,
    bioIkaTiivistelma, yliIkaisyysMerkki, phvTilaVari,
    YLI_IKAISYYS_KYNNYS,
  };
} else if (typeof window !== 'undefined') {
  window.TM_BioIka = {
    laskeBioIkaDokumentti, bioIkaTallennusOperaatiot, laskeMirwald,
    bioIkaTiivistelma, yliIkaisyysMerkki, phvTilaVari,
    YLI_IKAISYYS_KYNNYS,
  };
}
