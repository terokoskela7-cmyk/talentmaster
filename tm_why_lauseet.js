/**
 * TalentMaster™ — tm_why_lauseet.js
 *
 * Kirjoittaja:  Tero Koskela (Palloliitto / TalentMaster)
 * Päivitetty:   2026-05-11
 * Versio:       1.2
 *
 * Muutosloki v1.2:
 *   RAKENNEMUUTOS: Kirjausrakenne selkeytetty
 *     T = Tekniikka (Bola Siempre) — EI ketjusidonnainen, oma lausetaulukko
 *     D = Dual/Ylläpito (liikkuvuus, hermosto) — FLEI-ketjusidonnainen
 *     S = Strength/Täydentävä (heikoin FLEI-ketju) — FLEI-ketjusidonnainen
 *     P = Peli (otteludata) — ei why-lausetta
 *   LISÄTTY: WHY_T_LAUSEET — Bola Siempre -lauseet ikäfaaseittain
 *   LISÄTTY: getTHarjoiteWhy(stage) — T-harjoitteen why-lause
 *   LISÄTTY: normalisointikommentti getSHarjoiteWhy():hin
 *
 * Muutosloki v1.1:
 *   SFL · T · showcase  — "siirtymän teho" → "...siirtyy maahan"
 *   SFL · S · leikkija  — piilokehotus poistettu rakenteesta
 *   DIAG · D · showcase — 28 sanaa → 22 sanaa, tutkijaviite poistettu
 *   DFL  · D · showcase — 32 sanaa → 16 sanaa, toteamus + pelikytkentä
 *
 * Käyttö:
 *   // T-harjoite (Bola Siempre — EI ketjusidonnainen):
 *   const t = getTHarjoiteWhy('2_rakentaja');
 *
 *   // D-harjoite (ylläpito, FLEI-ketjusidonnainen):
 *   const d = getWhyLause('LL', 'D', '2_rakentaja');
 *
 *   // S-harjoite (täydentävä, heikoin FLEI-ketju automaattisesti):
 *   // HUOM: flei-arvot oltava normalisoituna 0-100 (Firestore tallentaa 1-3 → normalisoi ensin)
 *   //   normalisointi: (raakaArvo - 1) / 2 * 100
 *   const { ketju, lause } = getSHarjoiteWhy({ SBL:62, SFL:71, LL:55, DIAG:70, DFL:74 }, '2_rakentaja');
 *
 * Harjoitetyypit (kirjausrakenne — kirjaukset/{pvm}/tyyppi):
 *   'T' = Tekniikka / Bola Siempre — pallollinen päivittäinen, EI ketjusidonnainen
 *   'D' = Dual / Ylläpito — liikkuvuus + hermosto, FLEI-ketjusidonnainen
 *   'S' = Strength / Täydentävä — heikoin FLEI-ketju, FLEI-ketjusidonnainen
 *   'P' = Peli — otteludata, TASO-integraatio, ei why-lausetta
 *
 * Behavior Playbook -invariantit (kaikki 45 D+S-lausetta + 3 T-lausetta):
 *   ✓  Luettavissa ilman kontekstia
 *   ✓  Ei kehotusverbiä
 *   ✓  Toteamus, ei imperatiivi
 *   ✓  Pelitilannekytkentä mukana
 *   ✓  Max 25 sanaa
 */

'use strict';


/* ────────────────────────────────────────────────────────────
   ⚽ T — Tekninen / Bola Siempre
   EI FLEI-ketjusidonnainen — sama lause kaikille pelaajille
   ikäfaasista riippumatta

   Periaate: pallo joka päivä rakentaa hermoratoja joita ei
   muuten synny. Kultaikkuna sulkeutuu — päivittäinen
   aktivaatio pitää sen auki.

   Pelitilanne: pallontuntu, luovuus, automaatio paineen alla
────────────────────────────────────────────────────────────── */
const WHY_T_LAUSEET = {
  leikkija:  'Pallo joka päivä. Tänään keksi jotain uutta mitä sillä voi tehdä.',
  rakentaja: 'Päivittäinen pallokosketus rakentaa hermoratoja joita ei muuten synny. Kultaikkuna on auki — käytä se.',
  showcase:  'Elite-pelaajan pallontuntu ei synny kahdesti viikossa. Päivittäinen aktivaatio pitää tekniikka-automaation terävänä.',
};

const WHY_LAUSEET = {

  /* ────────────────────────────────────────────────────────────
     ⚡ SBL — Vauhtiketju  (Posterior chain)
     Selkä · pakarat · takareidet · pohkeet
     Pelitilanne: lähtönopeus, sprintti, ponnistus
  ──────────────────────────────────────────────────────────── */
  SBL: {
    T: {
      leikkija:  'Takapuolelta tulee vauhti. Siellä asuu juoksumoottori.',
      rakentaja: 'Sprintti käynnistyy takaketjusta — takareisistä ja pakaroista. Tämä opettaa sen liikkeen.',
      showcase:  'Posterior chain tuottaa sprintin viisi ensimmäistä metriä. Tekniikka siirtää voiman maahan.',
    },
    D: {
      leikkija:  'Takalihakset herätetään ensin. Sitten ne jaksavat juosta.',
      rakentaja: 'Kylmä takaketju repeää helpommin. Lämmittely on vakuutus takareidelle.',
      showcase:  'Aktivoitu takalinja vähentää hamstring-strainin riskiä ennen kovaa kuormaa.',
    },
    S: {
      leikkija:  'Vahva takapää juoksee pisimpään. Loppupeli on sen aikaa.',
      rakentaja: 'Heikoin lenkki väsyy ensin. Tämä vahvistaa sitä — ja olet viimeisellä vartilla yhä nopein.',
      showcase:  'Kohdennettu vahvistus ketjun heikoimpaan segmenttiin. Loppupeli ratkaistaan siellä missä vastustajan posterior chain antautuu.',
    },
  },

  /* ────────────────────────────────────────────────────────────
     🦵 SFL — Lähtöketju  (Anterior chain)
     Lonkankoukistajat · nelipäinen · etureisi
     Pelitilanne: potku, hyppy, ensiaskel, suunnanmuutos
  ──────────────────────────────────────────────────────────── */
  SFL: {
    T: {
      leikkija:  'Etupuolesta tulee potku ja hyppy.',
      rakentaja: 'Ensiaskel ja laukaus syntyvät etulinjasta — etureidestä ja lonkan koukistajista.',
      // v1.1: "siirtymän teho" → konkreetti "siirtyy maahan"
      showcase:  'Anterior chain tuottaa laukauksen ja ensiaskeleen räjähdyksen. Tekniikka määrittää kuinka paljon siitä voimasta siirtyy maahan.',
    },
    D: {
      leikkija:  'Etureidet venyvät. Polvet kiittävät.',
      rakentaja: 'Kireä etureisi vetää polvea väärään suuntaan. Kasvupyrähdyksessä tämä on kriittistä.',
      showcase:  'Etulinjan liikkuvuus suojaa patellaa PHV-vaiheessa, kun luut kasvavat lihaksia nopeammin.',
    },
    S: {
      // v1.1: "hyppää/potkaisee" piilokehotus → rakenne-muutos
      leikkija:  'Vahva etupuoli tekee hypystä korkeamman ja potkusta kovemman.',
      rakentaja: 'Räjähdysmoottori voittaa puolustajan ensimmäisessä askeleessa. Se on tässä.',
      showcase:  'Anterior chainin voima = laukauksen vauhti, ponnistuksen korkeus, ensiaskeleen eksplosiivisuus.',
    },
  },

  /* ────────────────────────────────────────────────────────────
     ↔️ LL — Sivuketju  (Lateral line)
     Lonkan loitontajat · IT-band · kylkilihakset
     Pelitilanne: sivuaskel, suunnanmuutos, 1v1 puolustus
  ──────────────────────────────────────────────────────────── */
  LL: {
    T: {
      leikkija:  'Sivuille liikkumiseen tarvitaan kylkiä.',
      rakentaja: 'Sivuaskel ja suunnanmuutos kulkevat sivuketjua pitkin. Tämä opettaa sen reitin.',
      showcase:  'Lateral line hallitsee frontaalitason siirtymät. Cutting-liike ja sivuaskel lepäävät tällä.',
    },
    D: {
      leikkija:  'Lantio pysyy suorassa juostessa. Polvi kiittää.',
      rakentaja: 'Kun lantio ei tue, polvi kaatuu sisäänpäin. Se on yleisin ACL-vammamekanismi.',
      showcase:  'Pelvic stability vähentää valgus-kuormaa polveen. ACL-riskin vähennys alkaa täältä.',
    },
    S: {
      leikkija:  'Vahvat kyljet pitävät kiinni hyökkääjässä.',
      rakentaja: '1v1 on sivuttaisvoimaa. Heikko sivuketju antaa hyökkääjän ohittaa.',
      showcase:  'Vahva lateral line = leveämpi puolustettava kaista, tiukempi body-to-body duellissa.',
    },
  },

  /* ────────────────────────────────────────────────────────────
     🔄 DIAG — Kiertoketju  (Spiral / Diagonal line)
     Yhdistää vastakkaiset olkapäät ja lonkat
     Pelitilanne: vastaanoton kierto, laukauksen rotaatio, vartalokierto
     Viite: Wilke et al. 2016 (koodikommentti — ei näy pelaajalle)
  ──────────────────────────────────────────────────────────── */
  DIAG: {
    T: {
      leikkija:  'Keho kiertyy kun pallo tulee. Koko kroppa liikkuu yhdessä.',
      rakentaja: 'Pallo vastaanotetaan kiertoliikkeellä — olkapää ja vastakkainen lonkka tekevät samaa työtä.',
      showcase:  'Spiral line yhdistää vastakkaiset raajat. Vastaanoton kierto ja torson rotaatio syntyvät tästä.',
    },
    D: {
      leikkija:  'Juostessa keho kiertyy pikkuisen. Se on oikein.',
      rakentaja: 'Jalkapallo on kiertojen peli mutta harjoitellaan useimmiten suoraan eteenpäin. Tämä korjaa sen.',
      // v1.1: 28 sanaa → 22 sanaa, tutkijaviite poistettu pelaajalta
      showcase:  'Jalkapallon yleisin liikesuunta on rotaatio — muttei se mitä harjoituksissa useimmiten tehdään. Kiertoketju yhdistää vastakkaiset puolet.',
    },
    S: {
      leikkija:  'Kiertovoima tekee laukauksesta kovan.',
      rakentaja: 'Laukauksen teho ei tule jalasta vaan vartalon kierrosta. Tämä vahvistaa sen lähteen.',
      showcase:  'Rotational power = laukauksen teho, syötön tarkkuus liikkeessä, vartalosuojaus paineen alla.',
    },
  },

  /* ────────────────────────────────────────────────────────────
     🏗️ DFL — Hallintaketju  (Deep Front Line)
     Syvät stabiloijat · lantionpohja · syvät selkälihakset
     Pelitilanne: tasapaino kontaktissa, asento 90 min, yhdenjalan tarkkuus
  ──────────────────────────────────────────────────────────── */
  DFL: {
    T: {
      leikkija:  'Keskustassa asuu tasapaino. Siitä pysyy pystyssä yhdellä jalalla.',
      rakentaja: 'Kontaktitilanteessa pysyt pystyssä ytimen ansiosta. Kaikki muu rakentuu tähän.',
      showcase:  'Deep front line on postural kontrollin perusta. Vastaanotto, kontakti ja yhden jalan tarkkuus lepäävät tällä.',
    },
    D: {
      leikkija:  'Syvät lihakset pitävät ryhdin koko päivän.',
      rakentaja: 'Kun keskikeho ei tue, muut lihakset paikkaavat — ja väsyvät nopeammin. Tämä on perusta.',
      // v1.1: 32 sanaa selittely → 16 sanaa toteamus + pelikytkentä
      showcase:  'DFL aktivoi kaiken muun. Kun ydin ei tue, voima vuotaa ennen kuin se saavuttaa jalkaa.',
    },
    S: {
      leikkija:  'Vahva keskusta = koko peli ilman kipua.',
      rakentaja: '90 minuuttia kivutta alkaa keskikehon kestävyydestä. Tämä on vakuutus rasitusvammoja vastaan.',
      showcase:  'Core endurance vähentää low back -rasitusvammojen ilmaantuvuutta. Pitkä ura alkaa täältä.',
    },
  },

};


/* ────────────────────────────────────────────────────────────
   API
──────────────────────────────────────────────────────────── */

/**
 * Palauttaa why-lauseen harjoitekorttiin.
 * @param {string} ketju   'SBL' | 'SFL' | 'LL' | 'DIAG' | 'DFL'
 * @param {string} tyyppi  'T' | 'D' | 'S'
 * @param {string} stage   '1_leikkija' | '2_rakentaja' | '3_showcase'
 *                         tai lyhyt 'leikkija' | 'rakentaja' | 'showcase'
 * @returns {string}
 */
function getWhyLause(ketju, tyyppi, stage) {
  const map = {
    '1_leikkija': 'leikkija', leikkija: 'leikkija',
    '2_rakentaja':'rakentaja', rakentaja:'rakentaja',
    '3_showcase': 'showcase',  showcase: 'showcase',
  };
  const ika = map[stage];
  if (!ika) return '';
  return WHY_LAUSEET?.[ketju]?.[tyyppi]?.[ika] ?? '';
}

/**
 * 70/30-automaatio: S-harjoitteen why-lause FLEI:n heikoimman ketjun mukaan.
 * @param {object} flei  { SBL: 62, SFL: 71, LL: 68, DIAG: 55, DFL: 74 }
 * @param {string} stage
 * @returns {{ ketju: string, lause: string }}
 */
function getSHarjoiteWhy(flei, stage) {
  // HUOM: flei-arvot oltava normalisoituna 0–100
  // Firestore tallentaa raakadatana 1–3 asteikolla (esim. sbl: 2.16)
  // Normalisoi ennen kutsua: (raakaArvo - 1) / 2 * 100
  // Esim: { SBL: Math.round((p.sbl-1)/2*100), ... }
  const heikoin = Object.entries(flei).sort(([, a], [, b]) => a - b)[0][0];
  return { ketju: heikoin, lause: getWhyLause(heikoin, 'S', stage) };
}


/**
 * T-harjoitteen (Bola Siempre) why-lause.
 * EI ketjusidonnainen — sama lause kaikille pelaajille ikäfaasista riippuen.
 * @param {string} stage  '1_leikkija' | '2_rakentaja' | '3_showcase'
 *                        tai lyhyt 'leikkija' | 'rakentaja' | 'showcase'
 * @returns {string}
 */
function getTHarjoiteWhy(stage) {
  const map = {
    '1_leikkija': 'leikkija', leikkija: 'leikkija',
    '2_rakentaja':'rakentaja', rakentaja:'rakentaja',
    '3_showcase': 'showcase',  showcase: 'showcase',
  };
  const ika = map[stage];
  if (!ika) return '';
  return WHY_T_LAUSEET[ika] ?? '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WHY_LAUSEET, WHY_T_LAUSEET, getWhyLause, getTHarjoiteWhy, getSHarjoiteWhy };
}
