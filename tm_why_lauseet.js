/**
 * TalentMaster™ — tm_why_lauseet.js
 *
 * Kirjoittaja:  Tero Koskela (Palloliitto / TalentMaster)
 * Päivitetty:   2026-05-12
 * Versio:       1.3
 *
 * Muutosloki v1.3:
 *   D-rivin lauseet reframed vahvuus-kehykseen (Seligman PERMA + SDT):
 *   SBL·D·rakentaja: "repeää helpommin" → "tuottaa täyden sprintin"
 *   SBL·D·showcase:  "vähentää riskiä" → "kantaa kovan kuorman"
 *   SFL·D·rakentaja: "Kireä/väärään" → "Vapaa/omalla radallaan"
 *   LL·D·rakentaja:  "kaatuu/ACL" → "pitää linjassa/kallein vakuutus"
 *   DFL·D·rakentaja: "ei tue/paikkaavat" → "jakaa kuorman tasaisesti"
 *
 * Muutosloki v1.1:
 *   SFL · T · showcase  — "siirtymän teho" → "...siirtyy maahan"
 *   SFL · S · leikkija  — piilokehotus poistettu rakenteesta
 *   DIAG · D · showcase — 28 sanaa → 22 sanaa, tutkijaviite poistettu
 *   DFL  · D · showcase — 32 sanaa → 16 sanaa, toteamus + pelikytkentä
 *
 * Käyttö:
 *   const lause = getWhyLause('SBL', 'T', '2_rakentaja');
 *   const { ketju, lause } = getSHarjoiteWhy({ SBL:62, SFL:71, LL:68, DIAG:55, DFL:74 }, '2_rakentaja');
 *
 * Behavior Playbook -invariantit (kaikki 45 lausetta):
 *   ✓  Luettavissa ilman kontekstia
 *   ✓  Ei kehotusverbiä
 *   ✓  Toteamus, ei imperatiivi
 *   ✓  Pelitilannekytkentä mukana
 *   ✓  Max 25 sanaa
 */

'use strict';

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
      rakentaja: 'Lämmin takaketju tuottaa täyden sprintin. Lämmittely vapauttaa moottorin.',
      showcase:  'Aktivoitu takalinja kantaa kovan kuorman. Hamstring kestää 90 minuuttia.',
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
      rakentaja: 'Vapaa etureisi pitää polven omalla radallaan. Tämä on kriittistä kasvupyrähdyksessä.',
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
      rakentaja: 'Vahva lantio pitää polven linjassa. Pelaajan kallein vakuutus.',
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
      rakentaja: 'Vahva keskikeho jakaa kuorman tasaisesti. Kaikki muu lihaksisto kiittää.',
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
  const heikoin = Object.entries(flei).sort(([, a], [, b]) => a - b)[0][0];
  return { ketju: heikoin, lause: getWhyLause(heikoin, 'S', stage) };
}

/**
 * T-harjoitteen ("Pallo joka päivä" / Bola Siempre) miksi-teksti per vaihe.
 * Ketju-agnostinen — päivittäinen pallokosketus on universaali tekniikkahabit,
 * ei sidottu yhteen ketjuun (siksi oma funktio, ei getWhyLause(ketju,...)).
 * @param {string} stage  '1_leikkija' | '2_rakentaja' | '3_showcase'
 * @returns {string}
 */
function getTHarjoiteWhy(stage) {
  const map = {
    '1_leikkija': 'leikkija', leikkija: 'leikkija',
    '2_rakentaja': 'rakentaja', rakentaja: 'rakentaja',
    '3_showcase': 'showcase', showcase: 'showcase',
  };
  const ika = map[stage];
  if (!ika) return '';
  // Päivittäin vaihtuva kannustus pihapeleihin + pallolla leikkimiseen.
  // Kultainen ikkuna (leikkijä): pihapelit ja kosketukset tärkeimpiä juuri nyt.
  const TEHTAVAT = {
    leikkija: [
      'Mene pihalle pelaamaan! Pihapelit kavereiden kanssa tekevät sinusta taiturin.',
      'Jongleeraa pallolla — montako kosketusta saat putkeen?',
      'Potki palloa seinään ja ota haltuun. Kaverin kanssa vielä hauskempaa.',
      'Pujottele pallo jalkojen välistä pihalla. Keksi oma rata!',
      'Pelaa pihapeliä — seinäfutis, kuningaspallo, mitä vaan. Pääasia: pallo jalassa.',
      'Kokeile molemmilla jaloilla. Heikko jalka oppii nyt leikkien helpoimmin.',
      'Ulos pallon kanssa! Tässä iässä joka kosketus on kultaa.',
    ],
    rakentaja: [
      'Pihapeli kavereiden kanssa — paras tapa pitää tekniikka terävänä.',
      'Jongleeraus: tavoittele uutta ennätystä molemmilla jaloilla.',
      'Seinäsyötöt heikolla jalalla — montako vauhdilla?',
      'Tee pihalle pujottelurata: nopeus ja hallinta yhtä aikaa.',
      'Ota pallo mukaan ulos. Päivittäinen kosketus tekee siitä automaattista.',
      'Pelaa pienpeliä ahtaassa tilassa — siellä tekniikka pakotetaan teräväksi.',
      'Tänään kaikki kosketukset heikolla jalalla. Sieltä ero syntyy.',
    ],
    showcase: [
      'Pihapeli tai pienpeli — tiukassa tilassa tekniikka testataan.',
      'Jongleeraus + terävä ensikosketus. Laatu ennen määrää.',
      'Heikko jalka aseeksi: tee tänään tietoisesti kaikki sillä.',
      'Seinäsyötöt vauhdilla, ensikosketus täsmälleen jalkaan.',
      'Pallonhallinta paineessa: nopea pujottelu, pää ylhäällä.',
      'Ota pallo ulos vaikka 15 min. Toistot ratkaisevat huipulla.',
      'Pelaa kavereiden kanssa — pelistä oppii sen mitä harjoitus ei opeta.',
    ],
  };
  const lista = TEHTAVAT[ika];
  return lista[new Date().getDay() % lista.length];   // 0=su … 6=la, kiertää viikoittain
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WHY_LAUSEET, getWhyLause, getSHarjoiteWhy, getTHarjoiteWhy };
}
