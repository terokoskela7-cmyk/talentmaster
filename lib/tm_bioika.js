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

// ── Sukupuolen normalisointi ──────────────────────────────────────────────
// Mirwald/KR-kaavat käyttävät 'P' (poika) / 'T' (tyttö).
// Firestore tallentaa 'M'/'N' (CLAUDE.md §17 #13) — tuetaan myös vanhoja muotoja.
// HUOM: aiempi versio ei tunnistanut 'N':ää → tyttö laski poikien kaavalla.
function normSukupuoli(sp) {
  var s = String(sp == null ? '' : sp).toLowerCase();
  if (s === 't' || s === 'n' || s === 'tytto' || s === 'tyttö' ||
      s === 'nainen' || s === 'f' || s === 'girl' || s === 'female') return 'T';
  return 'P';
}

// ════════════════════════════════════════════════════════════════════════
// KHAMIS-ROCHE — integraatiopinta (LASKENTA LUKITTU)
//
// Kertoimet ovat IMPERIAALISIA (pituus tuumina, paino paunoina, midparent
// tuumina), ikä- ja sukupuolikohtaisia 4.0–17.5v puolen vuoden välein.
// Lähde joka pitää käyttää: Khamis & Roche, Pediatrics 1994;94:504-507
//   + erratum Pediatrics 1995;95(3):457 (alkuperäiset kertoimet väärin).
//
// EI VIELÄ VERIFIOITU → KR_KERTOIMET on tyhjä ja laskeKR() palauttaa
//   { error: 'KR_KERTOIMET_PUUTTUU' }. §30: virheellinen aikuispituusennuste
//   on pahempi kuin ei ennustetta lainkaan — älä keksi kertoimia.
// ════════════════════════════════════════════════════════════════════════
var KR_KERTOIMET = {
  // ika(desim) -> [B0, b_pituus_in, b_paino_lb, b_midparent_in]  (imperiaalinen)
  P: {},
  T: {},
};
var KR_VERIFIOITU = false; // → true vasta kun KR_KERTOIMET täytetty + ristiintarkistettu

// Vanhempien pituuksien fallback puuttuville (THL FinRavinto 2017, 25–34v) — §30
var VANHEMPI_FALLBACK_CM = { isa: 179, aiti: 166 };
// Vanhempien itseraportoinnin yliarviointikorjaus (Epstein 1995)
var VANHEMPI_KORJAUS_CM = { isa: 1.5, aiti: 1.0 };

// Käyttäytymis-/tulkintavaroitukset — näytetään AINA KR-tuloksen yhteydessä
var BIOIKA_VAROITUKSET = {
  kr_estimoitu:     'Toinen/molemmat vanhempien pituudet puuttuvat — tulos on arvio',
  kr_epaluotettava: 'KR-menetelmä on epätarkempi murrosiässä (±5–7 cm)',
  phv_circa:        'Pelaaja on kasvupyrähdyksessä — erityishuomio kuormituksessa',
  monietninen:      'KR perustuu eurooppalaiseen aineistoon — sovellettava harkiten',
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
 * HUOM: poikien vakio linjattu MyE.Way'hin (−9.3236) 2026-07-01 → PHV täsmää MyE.Way'hin (Palloliiton
 * live-tuote, SJK-ekosysteemi) bitilleen. Eroaa julkaistusta Mirwald 2002 -arvosta (−9.236) 0.088 v (~1 kk).
 * Verifioitu 2 MyE.Way-referenssipisteellä. Tyttöjen vakio (−9.376) on jo identtinen MyE.Way'n kanssa → ennallaan.
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
    // Poikien kaava — Mirwald 2002 Table 1 (vakio −9.3236 = MyE.Way-pariteetti, ks. funktion docstring)
    offset = -9.3236
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
  const sukupuoli = normSukupuoli(syote.sukupuoli);

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

  // Bio-banding V1: kehitysvaihe-kaista (aina) + kasvutahti (vain jos edellinen mittaus annettu).
  // syote.edellinen = { pituus, mittauspaiva } edellisestä biologinen_ika-dokista (≥2 mittausta).
  const kehitysvaihe_kaista = kehitysvaiheKaista(mirwTulos.phv_tila_koodi);
  let kasvutahti = null;
  if (syote.edellinen && syote.edellinen.pituus != null && syote.edellinen.mittauspaiva) {
    kasvutahti = laskeKasvutahti(
      parseFloat(syote.pituus), mittauspaiva,
      syote.edellinen.pituus, syote.edellinen.mittauspaiva,
    );
  }

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

    // Bio-banding V1 (Mirwald-pohjainen) — pikakentiksi pelaajadokumenttiin (§26)
    kehitysvaihe_kaista,                                  // 'pre'|'circa'|'post'
    kasvutahti_cm_v:    kasvutahti ? kasvutahti.cm_v : null,      // null jos <2 mittausta
    kasvutahti_vyohyke: kasvutahti ? kasvutahti.vyohyke : null,  // 'hidas'|'kohtalainen'|'nopea'

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
 *   // 2. Päivitä pikakentät VP-/valmentajanäkymää varten (§26 + bio-banding V1)
 *   await baseRef.update({
 *     biologinenIka_viimeisin: ops.dokumentti,
 *     phv_tila:            ops.dokumentti.phv_tila_koodi,
 *     kehitysvaihe_kaista: ops.dokumentti.kehitysvaihe_kaista,        // 'pre'|'circa'|'post'
 *     kasvutahti_cm_v:     ops.dokumentti.kasvutahti_cm_v,            // null jos <2 mittausta
 *     kasvutahti_vyohyke:  ops.dokumentti.kasvutahti_vyohyke,
 *   });
 *
 *   // Kasvutahtia varten anna syote.edellinen = { pituus, mittauspaiva } edellisestä
 *   // biologinen_ika-dokista (Testaus_v9 hakee sen ennen tallennusta).
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

// ════════════════════════════════════════════════════════════════════════
// BIO-BANDING V1 (Mirwald-pohjainen — EI Khamis-Rochea, ks. BIOBANDING_ARKKITEHTUURI.md)
// ════════════════════════════════════════════════════════════════════════

/**
 * Kehitysvaihe-kaista bio-bandingiin (karkeampi ±1v-luokka phv_tila:n päälle).
 * Bio-banding circa = ±1v PHV:stä (tiede §2B). phv_tila (PRE/LAH/PH/POST/AN) on
 * hienompi; tämä ryhmittelee treeni-/ottelu-bio-bandingiin kolmeen kaistaan.
 *   PRE                → 'pre'   (offset < −1v)
 *   LAH + PH + POST    → 'circa' (offset −1…+1v)
 *   AN                 → 'post'  (offset > +1v)
 * @param {string} phv_tila_koodi 'PRE'|'LAH'|'PH'|'POST'|'AN'
 * @returns {'pre'|'circa'|'post'|null}
 */
function kehitysvaiheKaista(phv_tila_koodi) {
  switch (phv_tila_koodi) {
    case 'PRE':  return 'pre';
    case 'LAH':
    case 'PH':
    case 'POST': return 'circa';
    case 'AN':   return 'post';
    default:     return null;
  }
}

/**
 * Kasvutahti (cm/v) kahdesta pituusmittauksesta + vyöhyke.
 * Vyöhykkeet (tiede §2C + MyE.Way-pariteetti): hidas <3.0 · kohtalainen 3.0–7.2 · nopea ≥7.2.
 * ≥7.2 cm/v = loukkaantumisriskisignaali (PMC6293374) → valmentajasignaali PH-kuormarajoittimen rinnalle.
 * Vaatii ≥2 mittausta → palauttaa null jos edellistä ei ole (tai väli ≤0).
 * @returns {{cm_v:number, vyohyke:'hidas'|'kohtalainen'|'nopea'}|null}
 */
function laskeKasvutahti(pituus_nyt, pvm_nyt, pituus_edell, pvm_edell) {
  if (pituus_nyt == null || pituus_edell == null || pvm_nyt == null || pvm_edell == null) return null;
  var pn = parseFloat(pituus_nyt);
  var pe = parseFloat(pituus_edell);
  if (isNaN(pn) || isNaN(pe)) return null;
  var d2 = _bioToDate(pvm_nyt);
  var d1 = _bioToDate(pvm_edell);
  if (!d1 || !d2) return null;
  var vuodet = (d2 - d1) / (365.25 * 24 * 3600 * 1000);
  if (vuodet <= 0) return null;                    // sama/negatiivinen väli → ei mielekäs tahti
  var cm_v = Math.round(((pn - pe) / vuodet) * 10) / 10;
  var vyohyke = cm_v < 3.0 ? 'hidas' : (cm_v < 7.2 ? 'kohtalainen' : 'nopea');
  return { cm_v: cm_v, vyohyke: vyohyke };
}

// ════════════════════════════════════════════════════════════════════════
// APUFUNKTIOT — ikä + vanhempien pituudet
// ════════════════════════════════════════════════════════════════════════

/** Muuntaa Date | Firestore Timestamp | ISO-string | 'YYYY-MM-DD' Dateksi. */
function _bioToDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();       // Firestore Timestamp
  if (typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'string') {
    var m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);                // 'YYYY-MM-DD' → UTC (§17 #2)
    if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    var d = new Date(v); return isNaN(d) ? null : d;
  }
  return null;
}

/**
 * Desimaalinen ikä vuosina referenssipäivänä (EI new Date() oletuksena ellei
 * refPvm puutu). Esim. 12.75.
 */
function laskeIkaDesimaalinen(syntyma, refPvm) {
  var s = _bioToDate(syntyma);
  var r = refPvm ? _bioToDate(refPvm) : new Date();
  if (!s || !r) return null;
  return Math.round(((r - s) / (365.25 * 24 * 3600 * 1000)) * 100) / 100;
}

/** Palauttaa puuttuvan vanhemman pituuden väestöfallbackin (§30). */
function estimoiPuuttuvaVanhempi(kumpi) {
  var cm = (String(kumpi).toLowerCase().indexOf('isa') === 0 ||
            String(kumpi).toLowerCase().indexOf('isä') === 0)
    ? VANHEMPI_FALLBACK_CM.isa : VANHEMPI_FALLBACK_CM.aiti;
  return { cm: cm, on_estimoitu: true };
}

// ════════════════════════════════════════════════════════════════════════
// KHAMIS-ROCHE — laskenta (LUKITTU kunnes KR_KERTOIMET verifioitu)
//
// Rakentaa kaiken muun (midparent, yliarviointikorjaus, fallback,
// virhemarginaali, varoitukset) mutta palauttaa
// { error: 'KR_KERTOIMET_PUUTTUU' } kunnes verifioidut kertoimet on lisätty.
// Integraatiopinta on siis valmis — kun KR_KERTOIMET täytetään ja
// KR_VERIFIOITU=true, numeroennuste aktivoituu automaattisesti.
// ════════════════════════════════════════════════════════════════════════

/**
 * @param {Object} p
 * @param {number} p.pituus_cm      Lapsen seisomapituus cm
 * @param {number} p.paino_kg       Lapsen paino kg
 * @param {number} p.ika_desim      Desimaalinen ikä vuosina
 * @param {string} p.sukupuoli      'M'/'P'/'N'/'T' tms.
 * @param {number|null} p.isa_cm_raw   Isän raportoima pituus cm (tai null)
 * @param {number|null} p.aiti_cm_raw  Äidin raportoima pituus cm (tai null)
 */
function laskeKR(p) {
  p = p || {};
  var sp = normSukupuoli(p.sukupuoli);
  var varoitukset = [];

  // 1. Vanhempien pituudet: yliarviointikorjaus (Epstein) tai väestöfallback
  var on_estimoitu = false;
  var isaRaw  = (p.isa_cm_raw  != null && p.isa_cm_raw  !== '') ? parseFloat(p.isa_cm_raw)  : null;
  var aitiRaw = (p.aiti_cm_raw != null && p.aiti_cm_raw !== '') ? parseFloat(p.aiti_cm_raw) : null;
  var isa  = (isaRaw  != null && !isNaN(isaRaw))  ? isaRaw  - VANHEMPI_KORJAUS_CM.isa  : (on_estimoitu = true, VANHEMPI_FALLBACK_CM.isa);
  var aiti = (aitiRaw != null && !isNaN(aitiRaw)) ? aitiRaw - VANHEMPI_KORJAUS_CM.aiti : (on_estimoitu = true, VANHEMPI_FALLBACK_CM.aiti);
  if (on_estimoitu) varoitukset.push(BIOIKA_VAROITUKSET.kr_estimoitu);

  // 2. Midparent-korkeus (sukupuolikorjattu, cm)
  var midparent_cm = sp === 'P' ? (isa + aiti + 13) / 2 : (isa + aiti - 13) / 2;
  midparent_cm = Math.round(midparent_cm * 10) / 10;

  // 3. Virhemarginaali (näytetään AINA)
  var ika = p.ika_desim;
  var virhe_cm = (ika >= 11 && ika <= 15) ? 2.5 : 2.0;
  if (on_estimoitu) virhe_cm += 1.5;
  if (ika >= 11 && ika <= 15) varoitukset.push(BIOIKA_VAROITUKSET.kr_epaluotettava);

  // 4. GATE: ilman verifioituja kertoimia ei numeroennustetta
  if (!KR_VERIFIOITU || !KR_KERTOIMET[sp] || Object.keys(KR_KERTOIMET[sp]).length === 0) {
    return {
      error: 'KR_KERTOIMET_PUUTTUU',
      saatavilla: false,
      midparent_cm: midparent_cm,
      on_estimoitu: on_estimoitu,
      virhe_cm: virhe_cm,
      varoitukset: varoitukset,
    };
  }

  // 5. (Aktivoituu kun KR_KERTOIMET täytetty — Pediatrics 1995 erratum)
  //    Muunna imperiaalisiksi, hae ikäinterpoloidut kertoimet, laske:
  //      ennustettu_in = B0 + b1*pituus_in + b2*paino_lb + b3*midparent_in
  //      ennustettu_cm = ennustettu_in * 2.54
  //      pah_prosentti = pituus_cm / ennustettu_cm * 100
  //    Toistaiseksi tähän ei päästä (GATE yllä).
  return { error: 'KR_LASKENTA_EI_TOTEUTETTU', saatavilla: false };
}

// ── Eksportointi ──────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    laskeBioIkaDokumentti, bioIkaTallennusOperaatiot, laskeMirwald,
    bioIkaTiivistelma, yliIkaisyysMerkki, phvTilaVari,
    kehitysvaiheKaista, laskeKasvutahti,
    laskeKR, laskeIkaDesimaalinen, estimoiPuuttuvaVanhempi, normSukupuoli,
    YLI_IKAISYYS_KYNNYS, BIOIKA_VAROITUKSET,
  };
} else if (typeof window !== 'undefined') {
  window.TM_BioIka = {
    laskeBioIkaDokumentti, bioIkaTallennusOperaatiot, laskeMirwald,
    bioIkaTiivistelma, yliIkaisyysMerkki, phvTilaVari,
    kehitysvaiheKaista, laskeKasvutahti,
    laskeKR, laskeIkaDesimaalinen, estimoiPuuttuvaVanhempi, normSukupuoli,
    YLI_IKAISYYS_KYNNYS, BIOIKA_VAROITUKSET,
  };
}
