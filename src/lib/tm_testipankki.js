/**
 * TalentMaster™ — Testipankki
 * ============================================================
 * Kaikki TalentMasterin mittausprotokollat yhtenä tiedostona.
 *
 * RAKENNE:
 *   TM_TESTIPANKKI         — kaikki yksittäiset testit metadatineen
 *   TM_PROTOKOLLAT         — valmiit protokollapaketit (laaja / suppea / tekniikka)
 *   TM_PROTOKOLLAN_TESTIT  — apufunktio: palauttaa protokollan testit järjestettynä
 *
 * KENTTÄTYYPIT (testi.tyyppi):
 *   'numero'   — pelaaja syöttää numeerisen arvon (ms, cm, kg, kertaa...)
 *   'asteikko' — valitaan taso 1/2/3 (harjoitettavuuskartoituksen liikeketjut)
 *   'luokka'   — valitaan ennalta määrätyistä luokista (PHV-vaihe)
 *   'aika'     — minuutit + sekunnit (kestävyystestit)
 *
 * PAREMPI-SUUNTA (testi.parempi):
 *   'suurempi' — suurempi arvo on parempi (hypyt, voima)
 *   'pienempi' — pienempi arvo on parempi (nopeus, aika)
 *   'taulukko' — tulos katsotaan viitetaulukosta (PHV, liikkuvuus)
 *   null       — ei suuntaa (paino, pituus — ei arvoteta paremmaksi/huonommaksi)
 *
 * MITTAUSKERRAT (testi.mittausKertoja):
 *   Kuinka monta mittauskertaa per pelaaja per testi.
 *   Lomake näyttää tämän määrän syöttökenttiä.
 *   Paras vai keskiarvo tallennetaan 'tallennaTapa'-kentän mukaan.
 *
 * IKÄRAJOITUS (testi.minIka):
 *   Testi näytetään lomakkeella vain jos pelaajan ikäluokka >= minIka.
 *   Undefined = ei rajoitusta.
 *
 * VERSIOHISTORIA:
 *   2026-04-05  v1.0  — H-H polku (laaja + suppea) + harjoitettavuuskartoitus
 *   2026-04-05  v1.1  — Tekniikkakilpailu (stub — täydennetään protokollan saavuttua)
 */

'use strict';

// ================================================================
//  TESTIPANKKI — kaikki yksittäiset testit
// ================================================================

const TM_TESTIPANKKI = {

  // ── KATEGORIA 1: ANTROPOMETRIA JA KEHITYSVAIHE ──────────────
  // Nämä eivät ole suorituskykymittauksia vaan taustatietoja
  // jotka tarvitaan biologisen iän laskentaan (Mirwald 2002).

  paino: {
    id: 'paino',
    nimi: { fi: 'Paino', sv: 'Vikt' },
    kategoria: 'antropometria',
    alikategoria: null,
    yksikko: 'kg',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,       // BioIka.xlsx: kaksi mittausta, käytetään keskiarvoa
    tallennaTapa: 'keskiarvo',
    parempi: null,
    dimensio: 'D1',
    kuvaus: 'Kehon paino kilogrammoina. Mitataan kahdesti — järjestelmä laskee keskiarvon. ' +
            'Mitataan aamulla ennen harjoitusta.',
  },

  pituus: {
    id: 'pituus',
    nimi: { fi: 'Pituus', sv: 'Längd' },
    kategoria: 'antropometria',
    alikategoria: null,
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,       // BioIka.xlsx: kaksi mittausta, käytetään keskiarvoa
    tallennaTapa: 'keskiarvo',
    parempi: null,
    dimensio: 'D1',
    kuvaus: 'Seisomapituus senttimetreinä. Mitataan kahdesti — järjestelmä laskee keskiarvon. ' +
            'Kantapäät seinässä, katse suoraan eteenpäin.',
  },

  phv: {
    id: 'phv',
    nimi: { fi: 'Kehitysvaihe (PHV)', sv: 'Utvecklingsfas (PHV)' },
    kategoria: 'antropometria',
    alikategoria: null,
    yksikko: null,
    tyyppi: 'luokka',
    luokat: [
      { arvo: 'pre',    label: { fi: 'Pre-PHV (ennen kasvupyrähdystä)',   sv: 'Pre-PHV' } },
      { arvo: 'peak',   label: { fi: 'Peak-PHV (kasvupyrähdysvaihe)',     sv: 'Peak-PHV' } },
      { arvo: 'post',   label: { fi: 'Post-PHV (kasvupyrähdyksen jälkeen)', sv: 'Post-PHV' } },
      { arvo: 'stable', label: { fi: 'Vakaa (ei selkeää pyrähdystä)',     sv: 'Stabil' } },
    ],
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'taulukko',
    dimensio: 'D1',
    kuvaus: 'Biologinen kehitysvaihe Mirwald (2002) -menetelmällä arvioituna. ' +
            'Tarvitsee pituuden, painon ja istumapituuden.',
  },

  istumapituus: {
    id: 'istumapituus',
    nimi: { fi: 'Istumapituus', sv: 'Sittlängd' },
    kategoria: 'antropometria',
    alikategoria: null,
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: null,
    dimensio: 'D1',
    kuvaus: 'Istuma-asennossa mitattu pituus — tarvitaan PHV-laskentaan (Mirwald).',
  },

  rasvaprosentti: {
    id: 'rasvaprosentti',
    nimi: { fi: 'Rasvaprosentti', sv: 'Fettprocent' },
    kategoria: 'antropometria',
    alikategoria: null,
    yksikko: '%',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'taulukko',    // riippuu iästä ja sukupuolesta
    dimensio: 'D1',
    minIka: 'U13',          // rasvaprosentti ei ole relevantti alle U13
    kuvaus: 'Kehon rasvaprosentti. Mitataan ihopoimumittarilla tai bioimpedanssilla.',
  },

  // ── KATEGORIA 2: LINEAARINOPEUS ─────────────────────────────
  // Kaikki nopeustestit millisekunteina (ms).
  // VIFK:n data on ms-muodossa, joten käytetään samaa yksikköä.
  // Pienempi arvo = nopeampi = parempi.

  nopeus_10m: {
    id: 'nopeus_10m',
    nimi: { fi: 'Nopeus 10m', sv: 'Hastighet 10m' },
    kategoria: 'fyysiset',
    alikategoria: 'lineaarinopeus',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',   // paras (nopein) kolmesta mittauksesta
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: '10 metrin lähtönopeus. Mittaa räjähtävää kiihtyvyyttä. ' +
            'Kolme suoritusta — tallennetaan nopein (pienin arvo).',
  },

  nopeus_20m: {
    id: 'nopeus_20m',
    nimi: { fi: 'Nopeus 20m', sv: 'Hastighet 20m' },
    kategoria: 'fyysiset',
    alikategoria: 'lineaarinopeus',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: '20 metrin nopeus. Mittaa kiihtyvyysvaiheen kehittymistä.',
  },

  nopeus_30m: {
    id: 'nopeus_30m',
    nimi: { fi: 'Nopeus 30m', sv: 'Hastighet 30m' },
    kategoria: 'fyysiset',
    alikategoria: 'lineaarinopeus',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: '30 metrin nopeus. Mittaa huippunopeuden saavuttamista.',
  },

  nopeus_5m: {
    id: 'nopeus_5m',
    nimi: { fi: 'Nopeus 5m', sv: 'Hastighet 5m' },
    kategoria: 'fyysiset',
    alikategoria: 'lineaarinopeus',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: '5 metrin reaktionopeus. Lyhyin matka — puhdas lähtönopeus.',
  },

  // ── KATEGORIA 3: SUUNNANMUUTOSNOPEUS ────────────────────────

  kasirata: {
    id: 'kasirata',
    nimi: { fi: 'Kasirata (ketteryys)', sv: 'Åttatest (rörlighet)' },
    kategoria: 'fyysiset',
    alikategoria: 'suunnanmuutos',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: 'Kasirata-ketteryystesti millisekunteina. ' +
            'VIFK:n Smidighet-testi käyttää tätä protokollaa. ' +
            'Kolme suoritusta, tallennetaan nopein.',
  },

  sm_juoksu_jalkapallo: {
    id: 'sm_juoksu_jalkapallo',
    nimi: { fi: 'SM-juoksu (jalkapallo)', sv: 'SM-löpning (fotboll)' },
    kategoria: 'fyysiset',
    alikategoria: 'suunnanmuutos',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: 'Jalkapallon suunnanmuutostesti ilman palloa.',
  },

  sm_pallo_jalkapallo: {
    id: 'sm_pallo_jalkapallo',
    nimi: { fi: 'SM-pallo (jalkapallo)', sv: 'SM-boll (fotboll)' },
    kategoria: 'fyysiset',
    alikategoria: 'suunnanmuutos',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: 'Jalkapallon suunnanmuutostesti pallon kanssa.',
  },

  // ── KATEGORIA 4: NOPEUSVOIMA ─────────────────────────────────
  // Hyppytestit senttimetreinä. Suurempi arvo = parempi.
  // VIFK:n Hopp-data on cm-muodossa.

  staattinen_hyppy: {
    id: 'staattinen_hyppy',
    nimi: { fi: 'Staattinen hyppy (SJ)', sv: 'Statiskt hopp (SJ)' },
    kategoria: 'fyysiset',
    alikategoria: 'nopeusvoima',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',   // korkein hyppy kolmesta
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Staattinen hyppy (Squat Jump). Lähtö kyykkyasennosta ilman ' +
            'esikevennystä. Mittaa konsentrista voimantuottoa.',
  },

  kevennyshyppy: {
    id: 'kevennyshyppy',
    nimi: { fi: 'Kevennyshyppy (CMJ)', sv: 'Avsatshoppning (CMJ)' },
    kategoria: 'fyysiset',
    alikategoria: 'nopeusvoima',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Counter Movement Jump. Hyppy kevennyksen kautta. ' +
            'VIFK:n CMJ-data käyttää tätä protokollaa.',
  },

  kevennyshyppy_15_25: {
    id: 'kevennyshyppy_15_25',
    nimi: { fi: 'Kevennyshyppy kuormilla (15kg/20kg/25%BW)', sv: 'CMJ med last (15kg/20kg/25%BW)' },
    kategoria: 'fyysiset',
    alikategoria: 'nopeusvoima',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 1,       // yksi suoritus per kuorma
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    minIka: 'U13',
    kuvaus: 'Kevennyshyppy lisäkuormilla. Mitataan kolmella eri kuormalla ' +
            'voima-nopeuskäyrän rakentamiseksi.',
  },

  kevennyshyppy_30_50: {
    id: 'kevennyshyppy_30_50',
    nimi: { fi: 'Kevennyshyppy kuormilla (30kg/40kg/50%BW)', sv: 'CMJ med last (30kg/40kg/50%BW)' },
    kategoria: 'fyysiset',
    alikategoria: 'nopeusvoima',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    minIka: 'U15',           // raskaammat kuormat vasta U15+
    kuvaus: 'Kevennyshyppy raskaammilla kuormilla. U15+ ikäryhmille.',
  },

  pituushyppy: {
    id: 'pituushyppy',
    nimi: { fi: 'Vauhditon pituushyppy', sv: 'Ståendehopp (längd)' },
    kategoria: 'fyysiset',
    alikategoria: 'nopeusvoima',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Vauhditon pituushyppy. Mittaa alaraajojen räjähtävää voimaa ' +
            'horisontaalisessa suunnassa.',
  },

  viisi_loikka: {
    id: 'viisi_loikka',
    nimi: { fi: '5-loikka', sv: '5-hopp' },
    kategoria: 'fyysiset',
    alikategoria: 'nopeusvoima',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Viiden peräkkäisen loikan yhteispituus. Mittaa reaktiivista ' +
            'voimantuottoa ja rytmitajua.',
  },

  // ── KATEGORIA 5: MAKSIMI- JA KESTOVOIMA ─────────────────────
  // Voimatestit pääosin U13+ ikäryhmille.

  etunojapunnerrus: {
    id: 'etunojapunnerrus',
    nimi: { fi: 'Etunojapunnerrus (OHK)', sv: 'Armhävningar (max)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 'krt',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Etunojapunnerrus oikealla harjoitustavalla (OHK). ' +
            'Maksimisuorituksia yhtenä sarjana.',
  },

  leuanveto: {
    id: 'leuanveto',
    nimi: { fi: 'Leuanveto (OHK)', sv: 'Chins (max)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 'krt',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Leuanveto yliotteella. Oikea harjoitustapa (OHK).',
  },

  naruhypyt_15s: {
    id: 'naruhypyt_15s',
    nimi: { fi: 'Naruhypyt (15s)', sv: 'Hopprep (15s)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 'krt',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Naruhyppyjen määrä 15 sekunnissa.',
  },

  pistoolikyykky: {
    id: 'pistoolikyykky',
    nimi: { fi: 'Pistoolikyykky (arv)', sv: 'Pistolsquat (bed.)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: null,
    tyyppi: 'luokka',
    luokat: [
      { arvo: '0', label: { fi: 'Ei onnistu',                  sv: 'Lyckas inte' } },
      { arvo: '1', label: { fi: 'Onnistuu tuella',             sv: 'Lyckas med stöd' } },
      { arvo: '2', label: { fi: 'Onnistuu ilman tukea',        sv: 'Lyckas utan stöd' } },
      { arvo: '3', label: { fi: 'Onnistuu helposti (kontrolli)', sv: 'Lyckas enkelt' } },
    ],
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    minIka: 'U13',
    kuvaus: 'Pistoolikyykky arvioituna asteikolla 0-3.',
  },

  lankku: {
    id: 'lankku',
    nimi: { fi: 'Lankku', sv: 'Planka' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Lankku sekunteina.',
  },

  // ── KATEGORIA 6: KESTÄVYYS ───────────────────────────────────

  mas_1200m: {
    id: 'mas_1200m',
    nimi: { fi: '1200m (MAS)', sv: '1200m (MAS)' },
    kategoria: 'fyysiset',
    alikategoria: 'kestavyys',
    yksikko: 'aika',        // min:sek — lomake näyttää kaksi kenttää
    tyyppi: 'aika',
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: 'Maksimaalinopeustesti (MAS) 1200m juoksuna. ' +
            'Tulos muunnetaan m/s-nopeudeksi viitetaulukon avulla.',
    // MAS-nopeus lasketaan kaavalla: MAS = 1200 / (aika_sekunteina - 20.3)
    laskentaKaava: 'mas',
  },

  // ── KATEGORIA 7: LAJITEKNIIKKA ───────────────────────────────
  // Nämä kuuluvat tekniikkakilpailuun, mutta ovat myös H-H polun
  // laajan protokollan osia.

  pujottelu: {
    id: 'pujottelu',
    nimi: { fi: 'Pujottelu', sv: 'Slalom' },
    kategoria: 'tekniikka',
    alikategoria: 'lajitekniikka',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 10,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D2',         // tekninen dimensio
    kuvaus: 'Pallon kuljetus pujotteluradalla kellotettuna.',
  },

  syotto: {
    id: 'syotto',
    nimi: { fi: 'Syöttö', sv: 'Passning' },
    kategoria: 'tekniikka',
    alikategoria: 'lajitekniikka',
    yksikko: 'p',           // pistettä
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D2',
    kuvaus: 'Syöttöpistetesti — osumista kertyvät pisteet.',
  },

  ponnauttelu: {
    id: 'ponnauttelu',
    nimi: { fi: 'Ponnauttelu', sv: 'Jonglering' },
    kategoria: 'tekniikka',
    alikategoria: 'lajitekniikka',
    yksikko: 'krt',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 3,
    tallennaTapa: 'paras',
    parempi: 'suurempi',
    dimensio: 'D2',
    kuvaus: 'Pallon ilmassa pitäminen — maksimisuoritusten lukumäärä.',
  },

  // ── KATEGORIA 8: LIIKKUVUUS, TASAPAINO JA TOIMINNALLISUUS ───

  tasapaino: {
    id: 'tasapaino',
    nimi: { fi: 'Tasapaino', sv: 'Balans' },
    kategoria: 'liikkuvuus',
    alikategoria: 'tasapaino',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Yhdellä jalalla seisominen silmät kiinni, sekunteina.',
  },

  nilkan_liikkuvuus: {
    id: 'nilkan_liikkuvuus',
    nimi: { fi: 'Nilkan liikkuvuus (OHK)', sv: 'Ankelrörlighet (OHK)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Nilkan dorsaalifleksio oikealla harjoitustavalla (OHK). ' +
            'Varvasseini-etäisyys cm.',
  },

  eteentaivutus_haaraistunn: {
    id: 'eteentaivutus_haaraistunn',
    nimi: { fi: 'Eteentaivutus haaraistunnassa (AD)', sv: 'Framåtböjning i grensittning (AD)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Lonkan adduktorien liikkuvuus.',
  },

  thomasin_testi: {
    id: 'thomasin_testi',
    nimi: { fi: 'Lonkankoukistajien liikkuvuus (Thomasin testi)', sv: 'Höftböjarrörlighet (Thomas test)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: null,
    tyyppi: 'luokka',
    luokat: [
      { arvo: '1', label: { fi: 'Rajoittunut (lonkka ei ojennu)',    sv: 'Begränsad' } },
      { arvo: '2', label: { fi: 'Lähes normaali',                    sv: 'Nästan normal' } },
      { arvo: '3', label: { fi: 'Normaali (täysi ojennus)',          sv: 'Normal' } },
    ],
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Lonkankoukistajien kireys Thomasin testillä arvioituna.',
  },

  valakyykky: {
    id: 'valakyykky',
    nimi: { fi: 'Valakyykky (OHK)', sv: 'Djupknäböj med stång (OHK)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'toiminnallisuus',
    yksikko: null,
    tyyppi: 'luokka',
    luokat: [
      { arvo: '1', label: { fi: 'Ei onnistu (kompensaatioita)',      sv: 'Lyckas inte' } },
      { arvo: '2', label: { fi: 'Onnistuu lievillä kompensaatioilla', sv: 'Lyckas med kompensationer' } },
      { arvo: '3', label: { fi: 'Onnistuu puhtaasti',                sv: 'Lyckas rent' } },
    ],
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Valakyykky oikealla harjoitustavalla — liikekontrollin arviointi.',
  },

  sivulankku: {
    id: 'sivulankku',
    nimi: { fi: 'Sivulankku', sv: 'Sidoplanka' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,       // molemmat puolet erikseen
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Sivulankku sekunteina per puoli (vasen + oikea). ' +
            'Mittaa lateraalista keskivartalon voimaa ja symmetriaa.',
  },

  // ── KATEGORIA 4b: SUUNNANMUUTOS — täydentävät ───────────────

  suunnanmuutos_505: {
    id: 'suunnanmuutos_505',
    nimi: { fi: '5-0-5 (MOD)', sv: '5-0-5 (MOD)' },
    kategoria: 'fyysiset',
    alikategoria: 'suunnanmuutos',
    yksikko: 'ms',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    dimensio: 'D1',
    kuvaus: 'Modifioitu 5-0-5 suunnanmuutostesti. Juoksu 5m, 180° käännös, takaisin 5m. ' +
            'Mitataan vain käännösvaiheen aika. Molemmat jalat erikseen. ' +
            'Kansainvälisesti laajasti käytetty.',
  },

  // ── KATEGORIA 5b: KESTÄVYYS — täydentävät ───────────────────

  maksimisyke: {
    id: 'maksimisyke',
    nimi: { fi: 'Maksimisyke', sv: 'Maxpuls' },
    kategoria: 'fyysiset',
    alikategoria: 'kestavyys',
    yksikko: 'bpm',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: null,           // ei arvoteta — käytetään harjoittelun vyöhykelaskentaan
    dimensio: 'D1',
    kuvaus: 'Maksimisyke (HRmax) lyöntiä per minuutti. ' +
            'Mitataan MAS-testin tai maksimaalisen rasituksen yhteydessä. ' +
            'Tarvitaan sykevyöhykkeiden laskentaan (vyöhyke 1-5).',
  },

  // ── KATEGORIA 6b: LIIKKUVUUS — täydentävät ──────────────────

  suoran_jalan_nosto: {
    id: 'suoran_jalan_nosto',
    nimi: { fi: 'Aktiivinen suoran jalan nosto makuulta (OHK)', sv: 'Aktivt benlyft liggande (max)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: '°',
    tyyppi: 'numero',
    askellusvali: 5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Takareiden ja takaketjun liikkuvuus. Makuuasennosta nostetaan suora jalka ' +
            'niin korkealle kuin mahdollista ilman polven koukistumista. ' +
            'Mitataan kulma asteina. Normaali ≥ 70°.',
  },

  hartiarenkaan_liikkuvuus: {
    id: 'hartiarenkaan_liikkuvuus',
    nimi: { fi: 'Hartiarenkaan liikkuvuus (OHK)', sv: 'Skulderrörlighet (max)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Hartiarenkaan liikkuvuus oikealla harjoitustavalla. ' +
            'Käsien nosto kepillä niskan taakse — mitataan ote-etäisyys cm. ' +
            'Pienempi ote-etäisyys = parempi liikkuvuus (normi n. olkaleveys).',
  },

  hyva_huomenta: {
    id: 'hyva_huomenta',
    nimi: { fi: 'Hyvää huomenta -liike', sv: 'Good morning -rörelse' },
    kategoria: 'liikkuvuus',
    alikategoria: 'toiminnallisuus',
    yksikko: null,
    tyyppi: 'luokka',
    luokat: [
      { arvo: '1', label: { fi: 'Ei onnistu — selkä pyöristyy tai polvet koukistuvat', sv: 'Lyckas inte' } },
      { arvo: '2', label: { fi: 'Onnistuu osittain — lievää kompensointia',             sv: 'Delvis' } },
      { arvo: '3', label: { fi: 'Onnistuu puhtaasti — selkä suorana, polvet suorina',   sv: 'Rent' } },
    ],
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Selkäketjun toiminnallisuus. Keppi niskalla, taivutus eteenpäin ' +
            'lantiosta ilman selän pyöristymistä. Mittaa takaketjun toiminnallisuutta.',
  },

  eteentaivutus_istuen: {
    id: 'eteentaivutus_istuen',
    nimi: { fi: 'Eteentaivutus istuen (HT)', sv: 'Framåtböjning sittande (HT)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: 'cm',
    tyyppi: 'numero',
    askellusvali: 0.5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Harjoitustesti (HT) — istuen, jalat suorana, kurotus eteenpäin cm. ' +
            'Mittaa takareiden ja alaselän liikkuvuutta yhdistettynä.',
  },

  lonkan_ojennus: {
    id: 'lonkan_ojennus',
    nimi: { fi: 'Lonkan aktiivinen ojennus (OHK)', sv: 'Aktiv höftsträckning (max)' },
    kategoria: 'liikkuvuus',
    alikategoria: 'liikkuvuus',
    yksikko: '°',
    tyyppi: 'numero',
    askellusvali: 5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    kuvaus: 'Lonkan aktiivinen ojennusliikkuvuus. ' +
            'Mitataan makuuasennosta lonkan ojennus asteina. ' +
            'Tärkeä jalkapalloilijoiden lonkankoukistajien kireyden arvioinnissa.',
  },

  // ── RASKAAT VOIMATESTIT (U15+, vaatii salilaitteita) ────────
  // Lisätty testipankkiin mutta ei oletuksena protokolliin.
  // Käytä ainoastaan U15+ ikäluokissa fysioterapeutin tai
  // fysiikkavalmentajan valvonnassa.

  kulmaveto: {
    id: 'kulmaveto',
    nimi: { fi: 'Kulmaveto (OHK)', sv: 'Rodd (max)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 'krt',
    tyyppi: 'numero',
    askellusvali: 1,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    minIka: 'U15',
    kuvaus: 'Kulmaveto oikealla harjoitustavalla — maksimisuoritukset.',
  },

  trap_bar_maastaveto: {
    id: 'trap_bar_maastaveto',
    nimi: { fi: 'Trap bar maastaveto (5RM)', sv: 'Trap bar marklyft (5RM)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 'kg',
    tyyppi: 'numero',
    askellusvali: 2.5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    minIka: 'U15',
    kuvaus: 'Trap bar maastaveto 5 toistomaksimilla. Vaatii trap bar -välineen.',
  },

  takakyykky: {
    id: 'takakyykky',
    nimi: { fi: 'Takakyykky (5RM)', sv: 'Knäböj (5RM)' },
    kategoria: 'fyysiset',
    alikategoria: 'voima',
    yksikko: 'kg',
    tyyppi: 'numero',
    askellusvali: 2.5,
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    minIka: 'U15',
    kuvaus: 'Takakyykky 5 toistomaksimilla. Vaatii tangon ja turvalliset olosuhteet.',
  },
  // Liikeketjujen kapasiteetti asteikolla 1-3.
  // 1 = rajoittunut, 2 = kohtalainen, 3 = hyvä.
  // Yhteispistemäärästä lasketaan FLEI-indeksi (%).
  // Nämä ovat TalentMasterin FLEI-laskennassa käytettäviä testejä.

  hpp_sbl: {
    id: 'hpp_sbl',
    nimi: { fi: 'Sagittaalinen takaketju (SBL)', sv: 'Sagittal bakre kedja (SBL)' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikeketjut',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: {
      1: { fi: 'Rajoittunut — vaatii erityistoimia',        sv: 'Begränsad' },
      2: { fi: 'Kohtalainen — kehitettävissä harjoittelulla', sv: 'Måttlig' },
      3: { fi: 'Hyvä — ei estä harjoittelua',               sv: 'Bra' },
    },
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    fleiBidrag: true,        // tämä testi vaikuttaa FLEI-laskentaan
    ketju: 'sbl',
    kuvaus: 'Sagittaalinen takaketju: takareisi, pakara, selkä. ' +
            'Rajoittunut SBL näkyy takareiden kireytena ja alaselän ongelmina.',
  },

  hpp_sfl: {
    id: 'hpp_sfl',
    nimi: { fi: 'Sagittaalinen etuketju (SFL)', sv: 'Sagittal främre kedja (SFL)' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikeketjut',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: {
      1: { fi: 'Rajoittunut', sv: 'Begränsad' },
      2: { fi: 'Kohtalainen', sv: 'Måttlig' },
      3: { fi: 'Hyvä',        sv: 'Bra' },
    },
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    fleiBidrag: true,
    ketju: 'sfl',
    kuvaus: 'Sagittaalinen etuketju: lonkankoukistajat, nelipäinen, vatsalihakset.',
  },

  hpp_ll: {
    id: 'hpp_ll',
    nimi: { fi: 'Lateraalinen ketju (LL)', sv: 'Lateral kedja (LL)' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikeketjut',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: {
      1: { fi: 'Rajoittunut', sv: 'Begränsad' },
      2: { fi: 'Kohtalainen', sv: 'Måttlig' },
      3: { fi: 'Hyvä',        sv: 'Bra' },
    },
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    fleiBidrag: true,
    ketju: 'll',
    kuvaus: 'Lateraalinen ketju: IT-kalvo, gluteus medius, sivutaivutus.',
  },

  hpp_sl: {
    id: 'hpp_sl',
    nimi: { fi: 'Spiraaliketju (SL)', sv: 'Spiral kedja (SL)' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikeketjut',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: {
      1: { fi: 'Rajoittunut', sv: 'Begränsad' },
      2: { fi: 'Kohtalainen', sv: 'Måttlig' },
      3: { fi: 'Hyvä',        sv: 'Bra' },
    },
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    fleiBidrag: true,
    ketju: 'sl',
    kuvaus: 'Spiraaliketju: rotaatioliikkeet, viistot vatsalihakset.',
  },

  hpp_dfl: {
    id: 'hpp_dfl',
    nimi: { fi: 'Syvä etuketju (DFL)', sv: 'Djup frontal kedja (DFL)' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikeketjut',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: {
      1: { fi: 'Rajoittunut', sv: 'Begränsad' },
      2: { fi: 'Kohtalainen', sv: 'Måttlig' },
      3: { fi: 'Hyvä',        sv: 'Bra' },
    },
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    fleiBidrag: true,
    ketju: 'dfl',
    kuvaus: 'Syvä etuketju: lantionpohja, syvät lonkka-lihakset, pallea.',
  },

  hpp_fl: {
    id: 'hpp_fl',
    nimi: { fi: 'Toiminnallinen ketju (FL)', sv: 'Funktionell kedja (FL)' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikeketjut',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: {
      1: { fi: 'Rajoittunut', sv: 'Begränsad' },
      2: { fi: 'Kohtalainen', sv: 'Måttlig' },
      3: { fi: 'Hyvä',        sv: 'Bra' },
    },
    mittausKertoja: 1,
    tallennaTapa: 'ainoa',
    parempi: 'suurempi',
    dimensio: 'D1',
    fleiBidrag: true,
    ketju: 'fl',
    kuvaus: 'Toiminnallinen ketju: diagonaaliset liikkeet ylä- ja alaraajan välillä.',
  },


  luistelijan_kyykky: {
    id: 'luistelijan_kyykky',
    nimi: { fi: 'Luistelijan kyykky', sv: 'Skridskoknäböj' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liiketaito',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: { 1: { fi: 'Rajoittunut', sv: 'Begränsad' }, 2: { fi: 'Kohtalainen', sv: 'Måttlig' }, 3: { fi: 'Hyvä', sv: 'Bra' } },
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U10',
    kuvaus: 'Kyykky yhdellä jalalla (skater squat). Mittaa yhden jalan stabiliteettia ja eksentristä voimaa.',
  },
  askelkyykky: {
    id: 'askelkyykky',
    nimi: { fi: 'Askelkyykky', sv: 'Utfallssteg' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liiketaito',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: { 1: { fi: 'Rajoittunut', sv: 'Begränsad' }, 2: { fi: 'Kohtalainen', sv: 'Måttlig' }, 3: { fi: 'Hyvä', sv: 'Bra' } },
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U10',
    kuvaus: 'Askelkyykky eteen ja taakse. Mittaa alaraajojen hallintaa sagittaalitasolla.',
  },
  lankku_120s: {
    id: 'lankku_120s',
    nimi: { fi: 'Lankku 120s', sv: 'Planka 120s' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima',
    yksikko: 's', tyyppi: 'numero', askellusvali: 1,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U13',
    kuvaus: 'Lankku 120 sekuntia. U15-ikäluokan vaativampi versio.',
  },
  lantionnosto_yj: {
    id: 'lantionnosto_yj',
    nimi: { fi: 'Yhden jalan lantionnosto tasolla', sv: 'Enbenslyftet på bänk' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima',
    yksikko: 'krt', tyyppi: 'numero', askellusvali: 1,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U13',
    kuvaus: 'Yhden jalan lantionnosto korokkeella. Mittaa takareiden ja pakaran voimaa.',
  },
  naruhypyt_30s_yj: {
    id: 'naruhypyt_30s_yj',
    nimi: { fi: 'Yhden jalan naruhypyt 30s', sv: 'Enbenshopprep 30s' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima',
    yksikko: 'krt', tyyppi: 'numero', askellusvali: 1,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U13',
    kuvaus: 'Naruhypyt yhdellä jalalla 30 sekuntia. Mittaa nilkan voimaa ja reaktiivisuutta.',
  },
  slr_neuraalinen: {
    id: 'slr_neuraalinen',
    nimi: { fi: 'SLR neuraalinen (suoran jalan nosto)', sv: 'SLR neural' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'liikkuvuus',
    yksikko: null,
    tyyppi: 'asteikko',
    asteikko: { 1: { fi: 'Rajoittunut (<70°)', sv: 'Begränsad' }, 2: { fi: 'Kohtalainen (70–90°)', sv: 'Måttlig' }, 3: { fi: 'Hyvä (>90°)', sv: 'Bra' } },
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U13',
    kuvaus: 'Aktiivinen suoran jalan nosto selinmakuulla (Straight Leg Raise). Mittaa takareiden liikkuvuutta ja neuraalista tensioita.',
  },
  rinnalleveto_5rm: {
    id: 'rinnalleveto_5rm',
    nimi: { fi: 'Rinnalleveto 5RM', sv: 'Frivändning 5RM' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima_5rm',
    yksikko: 'kg', tyyppi: 'numero', askellusvali: 2.5,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U16',
    kuvaus: 'Rinnalleveto 5 toistomaksimilla (Power clean 5RM). Vaatii hyvän tekniikan ennen kuormia.',
  },
  yj_kyykky_5rm: {
    id: 'yj_kyykky_5rm',
    nimi: { fi: 'Yhden jalan kyykky 5RM', sv: 'Enbenssquat 5RM' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima_5rm',
    yksikko: 'kg', tyyppi: 'numero', askellusvali: 2.5,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U16',
    kuvaus: 'Yhden jalan kyykky (Bulgarian split squat) 5 toistomaksimilla.',
  },
  jalkojen_nosto: {
    id: 'jalkojen_nosto',
    nimi: { fi: 'Jalkojen nosto riipunnasta', sv: 'Benlyft hängande' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima',
    yksikko: 'krt', tyyppi: 'numero', askellusvali: 1,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U13',
    kuvaus: 'Jalkojen nosto riipunnasta (toes to bar). Mittaa lonkan koukistajien ja vatsalihasten voimaa.',
  },
  penkkipunnerrus_5rm: {
    id: 'penkkipunnerrus_5rm',
    nimi: { fi: 'Penkkipunnerrus 5RM', sv: 'Bänkpress 5RM' },
    kategoria: 'harjoitettavuus',
    alikategoria: 'voima_5rm',
    yksikko: 'kg', tyyppi: 'numero', askellusvali: 2.5,
    mittausKertoja: 1, tallennaTapa: 'ainoa', parempi: 'suurempi',
    dimensio: 'D1', minIka: 'U16',
    kuvaus: 'Penkkipunnerrus 5 toistomaksimilla.',
  },

  // ── KATEGORIA 9b: HARJOITETTAVUUS — HPP ELITE fascia-ketjut ─────
  // HUOM: Nämä ovat ERILLINEN protokolla HPP ELITE -fascia-analyysiin.
  // Ne eivät ole sama asia kuin Palloliiton harjoitettavuuskartoitus.
  // HPP ELITE → fascia-liikeketjujen kapasiteetti (SBL/SFL/LL/SL/DFL/FL) → FLEI
  // Palloliiton harjoitettavuuskartoitus → toiminnalliset liiketestit → FLEI

  // ── KATEGORIA 10: TEKNIIKKAKILPAILU ─────────────────────────
  // Palloliiton virallinen tekniikkakilpailuprotokolla 2023.
  // Lähde: https://www-assets.palloliitto.fi/62562/1694693543-tekniikkakilpailusaannot-2023.pdf
  //
  // LAJIT ikäluokittain:
  //   P/T 13 ja 12:  ponnauttelu + syöttö + pujottelu + kuljetus-laukaus + pituuspotku
  //   P/T 11, 10, 9: ponnauttelu + syöttö + pujottelu + kuljetus-laukaus
  //   P/T 8:         kuljetus-laukaus + pujottelu + syöttö + ponnauttelu
  //
  // TULOS: Kaikki lajit mitataan sekunteina (s). Tarkkuusvähennykset
  // kuljetus-laukauksessa ja pituuspotkussa vähennetään loppuajasta.
  // Kokonaisaika = kaikkien lajien summa — pienempi on parempi.
  // Merkkisuoritusrajat: Kulta / Hopea / Pronssi (ikäluokkakohtaiset).
  //
  // KAKSI YRITYSTÄ per laji — parempi tulos kirjataan.
  // Maksimiaika: ponnauttelu 40s, syöttö 60s, pujottelu 60s, kuljetus-laukaus 40s.

  tk_ponnauttelu: {
    id: 'tk_ponnauttelu',
    nimi: { fi: 'Ponnauttelu', sv: 'Jonglering' },
    kategoria: 'tekniikkakilpailu',
    alikategoria: 'pallonkasittely',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',   // parempi = pienempi aika
    parempi: 'pienempi',
    maksimiAika: 40,
    dimensio: 'D2',
    kuvaus: 'Ponnauttelu ajanotolla. Ponnautetaan vuorojaloin 4 krt + vuororeisin 4 krt ' +
            '+ päällä 4 krt (P13-11/T13-12). Sarja toistetaan 3 kertaa. ' +
            'Aika mitataan pallon liikkeellelähdöstä viimeiseen päällä-ponnautukseen. ' +
            'Kaksi yritystä — parempi kirjataan. Maksimiaika 40s.',
    suoritussaannot: {
      'P13-11/T13-12': 'vuorojaloin 4 krt + vuororeisin 4 krt + päällä 4 krt — 3 sarjaa',
      'P10/T11':       'vuorojaloin 4 krt + vuororeisin 4 krt + päällä 1 krt — 3 sarjaa',
      'P9/T10-9':      'vuorojaloin 4 krt + vuororeisin 2 krt — 2 sarjaa',
      'P/T8':          'vuorojaloin 10 krt',
    },
  },

  tk_syotto: {
    id: 'tk_syotto',
    nimi: { fi: 'Syöttö', sv: 'Passning' },
    kategoria: 'tekniikkakilpailu',
    alikategoria: 'pallonkasittely',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    maksimiAika: 60,
    dimensio: 'D2',
    kuvaus: 'Syöttö ajanotolla. Kaksi syöttöpenkkiä 20m etäisyydellä. ' +
            'Suoritetaan 5 syöttöä kumpaankin penkkiin (yhteensä 10 syöttöä), ' +
            'vuoroin oikealla ja vasemmalla jalalla. ' +
            'P/T 9 ja nuoremmat: 3 syöttöä per penkki. ' +
            'Kaksi yritystä — parempi kirjataan. Maksimiaika 60s.',
  },

  tk_pujottelu: {
    id: 'tk_pujottelu',
    nimi: { fi: 'Pujottelu', sv: 'Slalom' },
    kategoria: 'tekniikkakilpailu',
    alikategoria: 'pallonkasittely',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    maksimiAika: 60,
    dimensio: 'D2',
    kuvaus: 'Pujottelu pallolla ajanotolla. 8 merkkikepiä, äärimmäisten välinen etäisyys 20m. ' +
            'Suorissa kuljetusosuuksissa kosketettava palloon vähintään 3 kertaa. ' +
            'Aika lähtökosketuksesta sekä pallon että kilpailijan ylitettyä maalilinjan. ' +
            'Kaksi yritystä — parempi kirjataan. Maksimiaika 60s.',
  },

  tk_kuljetus_laukaus: {
    id: 'tk_kuljetus_laukaus',
    nimi: { fi: 'Kuljetus–laukaus', sv: 'Dribbel–skott' },
    kategoria: 'tekniikkakilpailu',
    alikategoria: 'pallonkasittely',
    yksikko: 's',
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 2,
    tallennaTapa: 'paras',
    parempi: 'pienempi',
    maksimiAika: 40,
    dimensio: 'D2',
    kuvaus: 'Kuljetus–laukaus neljällä pallolla. Kuljetusmatka lähtöviivalta ' +
            'rangaistusalueen rajalle. Pallot 1+2 oikealla, pallot 3+4 vasemmalla jalalla. ' +
            'Tarkkuusvähennykset: nurkkalohko ilmassa -5s, keskilohko ilmassa -3s, ' +
            'nurkkalohko maata pitkin -2s, keskilohko maata pitkin -1s. ' +
            'Laukaus ennen PA-aluetta: +10s/pallo. Kaksi yritystä. Maksimiaika 40s.',
    tarkkuusvahennykset: {
      nurkka_ilmassa:  -5,
      keski_ilmassa:   -3,
      nurkka_maata:    -2,
      keski_maata:     -1,
      laukaus_ennen_pa: +10,
    },
  },

  tk_pituuspotku: {
    id: 'tk_pituuspotku',
    nimi: { fi: 'Pituuspotku', sv: 'Längdskott' },
    kategoria: 'tekniikkakilpailu',
    alikategoria: 'pallonkasittely',
    yksikko: 's',            // muunnetaan sekunneiksi kaavalla: 5m = 1s
    tyyppi: 'numero',
    askellusvali: 0.1,
    mittausKertoja: 1,       // 4 potkua (2 oik + 2 vas), parempi per jalka lasketaan
    tallennaTapa: 'laskenta',
    parempi: 'pienempi',     // vähennys kokonaisajasta — suurempi potku = enemmän vähennystä
    maksimiVahennys: 20,     // maksimivähennys 20s
    dimensio: 'D2',
    minIka: 'U12',           // vain P/T 13-12
    kuvaus: 'Pituuspotku nilkkapotkulla. Rata 70m x 10m. ' +
            '2 potkua oikealla + 2 potkua vasemmalla jalalla. ' +
            'Parempi potku per jalka lasketaan. ' +
            'Kokonaisaika vähennetään kaavalla: 5m = 1s (max -20s). ' +
            'Esim. 100m = -20s, 43m = -8.6s.',
    laskentaKaava: 'pituuspotku_vahennys',  // 5m = 1s
  },
};


// ================================================================
//  PROTOKOLLAT — valmiit testipaketit
// ================================================================

const TM_PROTOKOLLAT = {

  /**
   * H-H POLKU — LAAJA PROTOKOLLA
   * HJK-kliniikan tasoinen kokonaiskartoitus.
   * Kesto: 2-4 tuntia. Vaatii hyppymaton ja laser-ajastimen.
   * Sopii: U13+ ikäluokille, kerran tai kahdesti kaudessa.
   */
  hh_laaja: {
    id: 'hh_laaja',
    nimi: { fi: 'H-H polku — Laaja protokolla', sv: 'H-H vägen — Bred protokoll' },
    kuvaus: 'Palloliiton H-H polun täydellinen kartoitusprotokolla. ' +
            'Kerran tai kahdesti kaudessa. U13+ ikäluokille.',
    kesto: '2-4h',
    minIka: 'U13',
    vaatimukset: ['Hyppymatto', 'Laser-ajastin', 'Voimalaitteet (U15+)'],
    testit: [
      // Antropometria — kaikki neljä bio-ikälaskentaan
      'paino', 'pituus', 'istumapituus', 'phv', 'rasvaprosentti',
      // Lineaarinopeus
      'nopeus_5m', 'nopeus_10m', 'nopeus_20m', 'nopeus_30m',
      // Suunnanmuutos
      'kasirata', 'suunnanmuutos_505', 'sm_juoksu_jalkapallo', 'sm_pallo_jalkapallo',
      // Nopeusvoima
      'staattinen_hyppy', 'kevennyshyppy', 'kevennyshyppy_15_25',
      'pituushyppy', 'viisi_loikka',
      // Voima
      'etunojapunnerrus', 'leuanveto', 'pistoolikyykky', 'naruhypyt_15s', 'lankku',
      // Kestävyys
      'mas_1200m', 'maksimisyke',
      // Lajitekniikka
      'pujottelu', 'syotto', 'ponnauttelu',
      // Liikkuvuus
      'tasapaino', 'nilkan_liikkuvuus', 'eteentaivutus_haaraistunn',
      'thomasin_testi', 'valakyykky', 'suoran_jalan_nosto',
      'hartiarenkaan_liikkuvuus', 'hyva_huomenta', 'eteentaivutus_istuen',
    ],
  },

  /**
   * H-H POLKU — SUPPEA PROTOKOLLA
   * Voidaan tehdä normaalin harjoituksen yhteydessä.
   * Kesto: 45-60 minuuttia. Ei vaadi erityislaitteita.
   * Sopii: kaikille ikäluokille, 2-4 kertaa kaudessa.
   */
  hh_suppea: {
    id: 'hh_suppea',
    nimi: { fi: 'H-H polku — Suppea protokolla', sv: 'H-H vägen — Kort protokoll' },
    kuvaus: 'Suppea versio H-H polun kartoituksesta. Voidaan tehdä harjoituksen yhteydessä. ' +
            'Sopii U10+ ikäluokille.',
    kesto: '45-60min',
    minIka: 'U10',
    vaatimukset: ['Sekuntikello', 'Mitta'],
    testit: [
      'paino', 'pituus', 'phv',
      'nopeus_10m', 'nopeus_30m',
      'kevennyshyppy',
      'etunojapunnerrus',
      'mas_1200m',
      'tasapaino',
      'thomasin_testi',
    ],
  },

  /**
   * VIFK P13 — RÄÄTÄLÖITY PROTOKOLLA
   * Vastaa VIFK:n käyttämää testirakennetta (Smidighet + Hopp + Snabbhet).
   * Voidaan käyttää pohjana muille seuroille joilla on vastaavat testit.
   */
  vifk_p13: {
    id: 'vifk_p13',
    nimi: { fi: 'VIFK P13 — Nopeus, ketteryys ja voima', sv: 'VIFK P13 — Hastighet, rörlighet och kraft' },
    kuvaus: 'VIFK:n P13-joukkueen käyttämä testiprotokolla. ' +
            'Ketteryys (Kasirata), Hyppytestit (SJ+CMJ) ja Nopeus (10/20/30m).',
    kesto: '60-90min',
    minIka: 'U11',
    vaatimukset: ['Laser-ajastin', 'Hyppymatto'],
    testit: [
      'paino', 'pituus', 'phv',
      'kasirata',
      'staattinen_hyppy', 'kevennyshyppy',
      'nopeus_10m', 'nopeus_20m', 'nopeus_30m',
    ],
  },

  /**
   * HARJOITETTAVUUSKARTOITUS (HPP ELITE) — Fascia-hallintaketjut
   *
   * ═══════════════════════════════════════════════════════════════
   * FLEI-ARKKITEHTUURI — KAKSI MITTARIA PELAAJAN PROFIILISSA
   * ═══════════════════════════════════════════════════════════════
   *
   * 1. FLEI (kehonpaino) — protokollat harjoitettavuus_u12/u15/u19
   *    Toiminnalliset kehonpainotestit, pisteet 1-3.
   *    Kertoo: suoriutuuko pelaaja ikäluokan testeistä.
   *    Laukaisee klinikka-triggerin alle 60%.
   *    Tallentuu: kartoitukset/{id}.flei
   *
   * 2. FLEI (fascia/hallintaketjut) — TÄMÄ PROTOKOLLA ← KAIKEN PERUSTA
   *    Fascia-liikeketjujen kapasiteetti: SBL/SFL/LL/SL/DFL/FL.
   *    Kertoo: MIKÄ ketju rajoittaa harjoittelua ja miksi.
   *    Ohjaa 70/30-ohjelman painotukset suoraan:
   *      → 30% kohdennettu = heikoin hallintaketju
   *      → 70% kokonaisvaltainen = kaikki ketjut yhdessä
   *    Auto-ohjelma aktivoituu suoraan ketjuanalyysin perusteella.
   *    Tallentuu: kartoitukset/{id}.flei_fascia + ketjupisteet
   *
   * Profiilissa molemmat rinnakkain:
   *   FLEI 74% │ ⚡SBL🔴 🦵SFL🟢 ↔️LL🟡 🔄SL🟢 🏗️DFL🟡 ⬡FL🟢
   *
   * Ketjut → emoji-tunnisteet (IDP-kortissa käytössä):
   *   ⚡ SBL — Sagittaalinen takaketju
   *   🦵 SFL — Sagittaalinen etuketju
   *   ↔️ LL  — Lateraalinen ketju
   *   🔄 SL  — Spiraaliketju
   *   🏗️ DFL — Syvä etuketju
   *   ⬡  FL  — Toiminnallinen ketju
   * ═══════════════════════════════════════════════════════════════
   */
  harjoitettavuus: {
    id: 'harjoitettavuus',
    nimi: { fi: 'Harjoitettavuuskartoitus (HPP ELITE)', sv: 'Träningsbarhetskartläggning (HPP ELITE)' },
    kuvaus: 'Fascia-hallintaketjujen kapasiteettikartoitus. ' +
            'Tuottaa FLEI-indeksin ketjukohtaisesti (SBL/SFL/LL/SL/DFL/FL). ' +
            'Kaiken harjoittelun perusta — ohjaa 70/30-ohjelman painotukset suoraan. ' +
            'U10+ ikäluokille 2-3x kaudessa. Vaatii koulutetun testivastaavan.',
    kesto: '20-30min',
    minIka: 'U10',
    vaatimukset: ['Fysioterapeutti tai koulutettu testivastaava'],
    testit: [
      'hpp_sbl', 'hpp_sfl', 'hpp_ll', 'hpp_sl', 'hpp_dfl', 'hpp_fl',
    ],
    laskeeFlei: true,
    fleiPohja: 'fascia',   // erottelee kehonpainopohjaisesta FLEI:stä
    ketjuEmojit: {
      sbl: '⚡', sfl: '🦵', ll: '↔️', sl: '🔄', dfl: '🏗️', fl: '⬡',
    },
  },


  /**
   * HARJOITETTAVUUSKARTOITUS U12 (10-12v)
   * TalentMaster/Eerikkilä-protokolla 2026.
   * Lähde: TalentMaster_Harjoitettavuus.xlsx välilehti U12.
   * 9 toiminnallista liiketestiä, asteikko 1-3. FLEI kehonpainotesteistä.
   */
  harjoitettavuus_u12: {
    id: 'harjoitettavuus_u12',
    nimi: { fi: 'Harjoitettavuuskartoitus U12 (10–12v)', sv: 'Träningsbarhet U12' },
    kuvaus: 'Liiketaito ja perusvoima. 9 testiä, pisteet 1-3 per testi. ' +
            'Testit ovat samalla harjoitteita — sopii alkuverryttelyn yhteyteen.',
    kesto: '20-30min',
    minIka: 'U10', maxIka: 'U12',
    vaatimukset: ['Keppi valakyykkyyn', 'Hyppymatto (pituushyppy)'],
    testit: [
      'valakyykky', 'luistelijan_kyykky', 'askelkyykky', 'hyva_huomenta',
      'etunojapunnerrus', 'lankku', 'naruhypyt_15s', 'pituushyppy', 'viisi_loikka',
    ],
    laskeeFlei: true,
    fleiPohja: 'kehonpaino',  // FLEI lasketaan kehonpainotesteistä, ei fascia-ketjuista
  },

  /**
   * HARJOITETTAVUUSKARTOITUS U15 (13-15v)
   * TalentMaster/Eerikkilä-protokolla 2026.
   * 13 testiä. ⚠️ PHV-HUIPPU → MAX 60% kuorma.
   * Lantionnosto < 29 toistoa + kantakipu → VÄLITÖN terapia-referral.
   */
  harjoitettavuus_u15: {
    id: 'harjoitettavuus_u15',
    nimi: { fi: 'Harjoitettavuuskartoitus U15 (13–15v)', sv: 'Träningsbarhet U15' },
    kuvaus: '⚠️ KRIITTINEN PHV-IKÄLUOKKA. Tarkista PHV-tila ENNEN testausta. ' +
            'PHV-huippu → max 60% kuorma. 13 testiä, kapasiteetti + liikkuvuus.',
    kesto: '30-40min',
    minIka: 'U13', maxIka: 'U15',
    phvHuomio: true,  // laukaisee PHV-varoituksen lomakkeella
    vaatimukset: ['Rekkitanko (leuanveto/jalkojen nosto)', 'Koroke (lantionnosto)'],
    testit: [
      'pistoolikyykky', 'etunojapunnerrus', 'leuanveto', 'jalkojen_nosto',
      'lankku_120s', 'sivulankku', 'lantionnosto_yj', 'naruhypyt_30s_yj',
      'yhden_jalan_pakianousu', 'slr_neuraalinen', 'thomasin_testi',
      'pituushyppy', 'viisi_loikka',
    ],
    laskeeFlei: true,
    fleiPohja: 'kehonpaino',
  },

  /**
   * HARJOITETTAVUUSKARTOITUS U19 (16-19v)
   * TalentMaster/Eerikkilä-protokolla 2026.
   * Lohko A: Voimatestit 5RM (voidaan tehdä eri päivänä).
   * Lohko B: Kehonpainotestit → FLEI.
   */
  harjoitettavuus_u19: {
    id: 'harjoitettavuus_u19',
    nimi: { fi: 'Harjoitettavuuskartoitus U19 (16–19v)', sv: 'Träningsbarhet U19' },
    kuvaus: 'Kaksi lohkoa. Lohko A: Voimatestit 5RM (kg ja kg/BW). ' +
            'Lohko B: Kehonpainotestit 1-3p → FLEI. Voidaan tehdä eri päivinä.',
    kesto: 'Lohko A: 30-45min | Lohko B: 20-30min',
    minIka: 'U16',
    vaatimukset: ['Voimalaitteet (tangot, levyt)', 'Rekkitanko'],
    testit_lohko_a: [
      'takakyykky', 'trap_bar_maastaveto', 'rinnalleveto_5rm',
      'yj_kyykky_5rm', 'leuanveto', 'penkkipunnerrus_5rm',
    ],
    testit_lohko_b: [
      'jalkojen_nosto', 'lonkan_ojennus', 'yhden_jalan_pakianousu',
      'slr_neuraalinen', 'thomasin_testi', 'pituushyppy', 'viisi_loikka',
    ],
    testit: [  // yhdistetty lista protokollatyökaluille
      'takakyykky', 'trap_bar_maastaveto', 'rinnalleveto_5rm',
      'yj_kyykky_5rm', 'leuanveto', 'penkkipunnerrus_5rm',
      'jalkojen_nosto', 'lonkan_ojennus', 'yhden_jalan_pakianousu',
      'slr_neuraalinen', 'thomasin_testi', 'pituushyppy', 'viisi_loikka',
    ],
    laskeeFlei: true,
    fleiPohja: 'kehonpaino',  // FLEI vain lohkon B pisteistä
  },


  /**
   * TEKNIIKKAKILPAILU
   * Palloliiton virallinen protokolla 2023.
   * Lähde: palloliitto.fi/palloliiton-tekniikkakilpailut
   *
   * IKÄLUOKKAKOHTAISET LAJIT:
   *   P/T 13-12: ponnauttelu + syöttö + pujottelu + kuljetus-laukaus + pituuspotku
   *   P/T 11-9:  ponnauttelu + syöttö + pujottelu + kuljetus-laukaus
   *   P/T 8:     kuljetus-laukaus + pujottelu + syöttö + ponnauttelu
   *
   * MERKKISUORITUSRAJAT 2023 (kokonaisaika sekunteina, pienempi = parempi):
   *   Kulta / Hopea / Pronssi
   *   P13: alle 75 / 85 / 100    P12: alle 80 / 90 / 105
   *   P11: alle 90 / 110 / 130   P10: alle 100 / 120 / 140
   *   P9:  alle 85 / 100 / 115   P8:  alle 95 / 105 / 120
   *   T13: alle 90 / 110 / 130   T12: alle 95 / 115 / 135
   *   T11: alle 105 / 125 / 145  T10: alle 110 / 135 / 155
   *   T9:  alle 105 / 120 / 135  T8:  alle 110 / 125 / 140
   */
  tekniikkakilpailu: {
    id: 'tekniikkakilpailu',
    nimi: { fi: 'Tekniikkakilpailu', sv: 'Teknikmatch' },
    kuvaus: 'Palloliiton virallinen tekniikkakilpailuprotokolla 2023. ' +
            '4-5 lajia ikäluokasta riippuen. Tulos = lajien aikojen summa (s). ' +
            'Pienempi kokonaisaika = parempi.',
    kesto: '45-90min',
    minIka: 'U8',           // Palloliiton virallinen ikäraja P/T 8 ja vanhemmat
    vaatimukset: ['Syöttöpenkit 2 kpl', 'Merkkikepit 8+ kpl', 'Pallot', 'Sekuntikello', 'Jalkapallomaali'],
    // Testit ikäluokittain — lomake näyttää oikeat lajit automaattisesti
    testit_13_12: ['tk_ponnauttelu', 'tk_syotto', 'tk_pujottelu', 'tk_kuljetus_laukaus', 'tk_pituuspotku'],
    testit_11_9:  ['tk_ponnauttelu', 'tk_syotto', 'tk_pujottelu', 'tk_kuljetus_laukaus'],
    testit_8:     ['tk_kuljetus_laukaus', 'tk_pujottelu', 'tk_syotto', 'tk_ponnauttelu'],
    // Oletustestit (käytetään jos ikäluokkaa ei tiedetä)
    testit: ['tk_ponnauttelu', 'tk_syotto', 'tk_pujottelu', 'tk_kuljetus_laukaus', 'tk_pituuspotku'],
    laskeeKokonaisAika: true,
    // Merkkirajat: { ikäluokka: { kulta, hopea, pronssi } }
    merkkirajat: {
      P13: { kulta: 75,  hopea: 85,  pronssi: 100 },
      P12: { kulta: 80,  hopea: 90,  pronssi: 105 },
      P11: { kulta: 90,  hopea: 110, pronssi: 130 },
      P10: { kulta: 100, hopea: 120, pronssi: 140 },
      P9:  { kulta: 85,  hopea: 100, pronssi: 115 },
      P8:  { kulta: 95,  hopea: 105, pronssi: 120 },
      T13: { kulta: 90,  hopea: 110, pronssi: 130 },
      T12: { kulta: 95,  hopea: 115, pronssi: 135 },
      T11: { kulta: 105, hopea: 125, pronssi: 145 },
      T10: { kulta: 110, hopea: 135, pronssi: 155 },
      T9:  { kulta: 105, hopea: 120, pronssi: 135 },
      T8:  { kulta: 110, hopea: 125, pronssi: 140 },
    },
  },
};


// ================================================================
//  APUFUNKTIOT
// ================================================================

/**
 * Palauttaa protokollan testit järjestettynä kategorioittain.
 * Käytetään lomakkeen renderöinnissä.
 *
 * @param {string} protokollaId — esim. 'hh_suppea'
 * @param {string} kieli        — 'fi' tai 'sv'
 * @returns {Array} testit kategorioittain ryhmiteltyinä
 */
function TM_PROTOKOLLAN_TESTIT(protokollaId, kieli = 'fi') {
  const protokolla = TM_PROTOKOLLAT[protokollaId];
  if (!protokolla) return [];

  // Kerätään testit testipankista ja ryhmitellään kategorioittain
  const kategoriat = {};

  protokolla.testit.forEach(testiId => {
    const testi = TM_TESTIPANKKI[testiId];
    if (!testi) return;

    const kat = testi.kategoria;
    if (!kategoriat[kat]) kategoriat[kat] = { testit: [] };
    kategoriat[kat].testit.push({
      ...testi,
      nimiFi: testi.nimi.fi,
      nimiSv: testi.nimi.sv,
      naytettavaNimi: testi.nimi[kieli] || testi.nimi.fi,
    });
  });

  return Object.entries(kategoriat).map(([kat, data]) => ({
    kategoria: kat,
    testit: data.testit,
  }));
}

/**
 * Laskee FLEI-indeksin fascia-hallintaketjuista (HPP ELITE).
 * Palauttaa myös ketjukohtaiset pisteet ja heikoimman ketjun.
 *
 * @param {Object} tulokset — { hpp_sbl: 2, hpp_sfl: 3, hpp_ll: 1, ... }
 *                            tai lyhytnimillä { sbl: 2, sfl: 3, ll: 1, ... }
 * @returns {Object} { flei, ketjut, heikoin, heikoinArvo }
 */
function TM_LASKE_FLEI(tulokset) {
  var liikeketjut = ['hpp_sbl', 'hpp_sfl', 'hpp_ll', 'hpp_sl', 'hpp_dfl', 'hpp_fl'];
  var ketjuIdt    = ['sbl',     'sfl',     'll',     'sl',     'dfl',     'fl'    ];
  var pisteet = 0, max = 0;
  var ketjut = {};
  var heikoin = null, heikoinArvo = 99;

  liikeketjut.forEach(function(ketjuId, i) {
    var lyhyt = ketjuIdt[i];
    var arvo = parseInt(tulokset[ketjuId] != null ? tulokset[ketjuId] : tulokset[lyhyt]);
    max += 3;
    if (!isNaN(arvo) && arvo >= 1 && arvo <= 3) {
      pisteet += arvo;
      ketjut[lyhyt] = arvo;
      if (arvo < heikoinArvo) { heikoinArvo = arvo; heikoin = lyhyt; }
    } else {
      ketjut[lyhyt] = null;
    }
  });

  return {
    flei:        max > 0 ? Math.round((pisteet / max) * 100) : 0,
    ketjut:      ketjut,
    heikoin:     heikoin,
    heikoinArvo: heikoinArvo === 99 ? null : heikoinArvo,
  };
}

/**
 * Laskee FLEI-indeksin harjoitettavuuskartoituksen kehonpainotesteistä.
 * Käyttötapaus: harjoitettavuus_u12/u15/u19 (fleiPohja: 'kehonpaino').
 *
 * @param {Object} tulokset  — { valakyykky: 2, lankku: 3, naruhypyt_15s: 2, ... }
 * @param {Array}  testiIdt  — protokollan testit-lista (määrää max-pisteet)
 * @returns {number}         — FLEI 0-100
 */
function TM_LASKE_FLEI_KEHONPAINO(tulokset, testiIdt) {
  var pisteet = 0, max = 0;
  (testiIdt || []).forEach(function(id) {
    var arvo = parseInt(tulokset[id]);
    max += 3;
    if (!isNaN(arvo) && arvo >= 1 && arvo <= 3) pisteet += arvo;
  });
  return max > 0 ? Math.round((pisteet / max) * 100) : 0;
}


/**
 * Laskee biologisen iän PHV-offsetin Mirwald (2002) -menetelmällä.
 * Lähde: TalentMaster_BioIka.xlsx + Mirwald RL et al. (2002).
 *
 * MITTAUKSET: Pituus ja paino mitataan KAHDESTI — käytetään keskiarvoa.
 *
 * @param {Object} params
 * @param {number}  params.pituus1      — seisomapituus 1. mittaus (cm)
 * @param {number}  params.pituus2      — seisomapituus 2. mittaus (cm)
 * @param {number}  params.paino1       — paino 1. mittaus (kg)
 * @param {number}  params.paino2       — paino 2. mittaus (kg)
 * @param {number}  params.istumapituus — istumapituus (cm)
 * @param {string}  params.syntymaPvm   — syntymäpäivä (ISO-string tai Date)
 * @param {string}  params.sukupuoli    — 'P' tai 'T' (tai 'M'/'F')
 * @param {Date}    [params.testiPvm]   — testipäivä (default: tänään)
 *
 * @returns {Object} {
 *   offset: number,        — maturity offset vuosina
 *   phvIka: number,        — PHV-ikä vuosina (= kronoIka - offset)
 *   vaihe: string,         — 'pre' | 'peak' | 'post'
 *   bioIka: number,        — biologinen ikä
 *   kronoIka: number,      — kronologinen ikä
 *   yliIkaisyys: boolean,  — onko poikkeuslupakelpoinen
 *   kynnys: number,        — Palloliiton kynnysarvo (PHV-ikä)
 * }
 */
function TM_LASKE_BIOIKA(params) {
  // Lasketaan keskiarvot jos kaksi mittausta
  var pit = params.pituus2 != null
    ? (parseFloat(params.pituus1) + parseFloat(params.pituus2)) / 2
    : parseFloat(params.pituus1 || params.pituus);
  var pai = params.paino2 != null
    ? (parseFloat(params.paino1) + parseFloat(params.paino2)) / 2
    : parseFloat(params.paino1 || params.paino);
  var ist  = parseFloat(params.istumapituus);
  var suku = (params.sukupuoli || 'P').toUpperCase();
  // Normalisoidaan P/T ja M/F
  if (suku === 'M') suku = 'P';
  if (suku === 'F') suku = 'T';

  // Kronologinen ikä desimaalina
  var syntyma = new Date(params.syntymaPvm);
  var testi   = params.testiPvm ? new Date(params.testiPvm) : new Date();
  var kronoIka = (testi - syntyma) / (1000 * 60 * 60 * 24 * 365.25);

  var jalat  = pit - ist; // jalkakorkeus
  var offset;

  if (suku === 'P') {
    // Mirwald 2002 — pojat (vakio −9.3236 = MyE.Way-pariteetti 2026-07-01; ks. tm_bioika.js laskeMirwald)
    offset = -9.3236
      + (0.0002708  * jalat * ist)
      + (-0.001663  * kronoIka * jalat)
      + (0.007216   * kronoIka * ist)
      + (0.02292    * (pai / pit) * 100);
  } else {
    // Mirwald 2002 — tytöt
    offset = -9.376
      + (0.0001882  * jalat * ist)
      + (0.0022     * kronoIka * jalat)
      + (0.005841   * kronoIka * ist)
      + (-0.002658  * kronoIka * pai)
      + (0.07693    * (pai / pit) * 100);
  }

  // PHV-ikä = kronologinen ikä - maturity offset
  // (BioIka.xlsx: "PHV-ika = Kronologinen ika - Maturity offset")
  var phvIka = kronoIka - offset;

  // PHV-vaihe offsetin mukaan
  var vaihe = offset < -1 ? 'pre' : offset <= 1 ? 'peak' : 'post';

  // Palloliiton yli-ikäisyyskynnys: APHV - 0.75 kuukausittain
  // Kynnystaulukko (BioIka.xlsx Yli-ikaisyys-välilehti)
  var syntKk = syntyma.getMonth() + 1; // 1-12
  var kynnykset = {
    P: [14.9667,14.8833,14.8,14.7167,14.6333,14.55,14.4667,14.3833,14.3,14.2167,14.1333,14.05],
    T: [13.0667,12.9833,12.9,12.8167,12.7333,12.65,12.5667,12.4833,12.4,12.3167,12.2333,12.15],
  };
  var kynnys = kynnykset[suku][syntKk - 1];
  var yliIkaisyys = phvIka >= kynnys;

  return {
    offset:      Math.round(offset  * 100) / 100,
    phvIka:      Math.round(phvIka  * 100) / 100,
    vaihe:       vaihe,
    bioIka:      Math.round((kronoIka + offset) * 10) / 10,
    kronoIka:    Math.round(kronoIka * 10) / 10,
    yliIkaisyys: yliIkaisyys,
    kynnys:      kynnys,
  };
}


/**
 * @param {string} ikaluokka — esim. 'P13', 'T11', 'P8'
 * @param {number} kokonaisAika — sekunteina
 * @returns {string|null} 'kulta' | 'hopea' | 'pronssi' | null
 */
function TM_LASKE_MERKKI(ikaluokka, kokonaisAika) {
  const rajat = TM_PROTOKOLLAT.tekniikkakilpailu.merkkirajat[ikaluokka];
  if (!rajat) return null;
  if (kokonaisAika < rajat.kulta)   return 'kulta';
  if (kokonaisAika < rajat.hopea)   return 'hopea';
  if (kokonaisAika < rajat.pronssi) return 'pronssi';
  return null;
}

/**
 * Muuntaa pituuspotkun metrit aikavähennykseksi (5m = 1s, max 20s).
 * @param {number} metrit
 * @returns {number} vähennys sekunteina (positiivinen luku)
 */
function TM_PITUUSPOTKU_VAHENNYS(metrit) {
  return Math.min(20, metrit / 5);
}


/**
 * Kaava: MAS = 1200 / (aika_sekunteina - 20.3)
 *
 * @param {number} minuutit
 * @param {number} sekunnit
 * @returns {number} MAS-nopeus m/s (2 desim.)
 */
function TM_LASKE_MAS(minuutit, sekunnit) {
  const kokonaisAika = (minuutit * 60) + sekunnit;
  if (kokonaisAika <= 20.3) return 0;
  return Math.round((1200 / (kokonaisAika - 20.3)) * 100) / 100;
}

/**
 * Palauttaa testin lyhyen kategorianimen näyttöä varten.
 */
const TM_KATEGORIAN_NIMI = {
  antropometria:     { fi: 'Antropometria ja kehitysvaihe', sv: 'Antropometri och utvecklingsfas' },
  fyysiset:          { fi: 'Fyysiset suorituskykytestit',   sv: 'Fysiska prestationstest' },
  tekniikka:         { fi: 'Lajitekniikka',                 sv: 'Grenspecifik teknik' },
  liikkuvuus:        { fi: 'Liikkuvuus ja tasapaino',       sv: 'Rörlighet och balans' },
  harjoitettavuus:   { fi: 'Harjoitettavuuskartoitus',      sv: 'Träningsbarhetskartläggning' },
  tekniikkakilpailu: { fi: 'Tekniikkakilpailu',             sv: 'Teknikmatch' },
};

const TM_ALIKATEGORIAN_NIMI = {
  lineaarinopeus:  { fi: 'Lineaarinopeus',           sv: 'Linjär hastighet' },
  suunnanmuutos:   { fi: 'Suunnanmuutosnopeus',      sv: 'Riktningsändringshastighet' },
  nopeusvoima:     { fi: 'Nopeusvoima',              sv: 'Explosiv kraft' },
  voima:           { fi: 'Maksimi- ja kestovoima',   sv: 'Maximal- och uthållighetsstyrka' },
  kestavyys:       { fi: 'Kestävyys',                sv: 'Uthållighet' },
  lajitekniikka:   { fi: 'Lajitekniikka',            sv: 'Grenspecifik teknik' },
  tasapaino:       { fi: 'Tasapaino',                sv: 'Balans' },
  liikkuvuus:      { fi: 'Liikkuvuus',               sv: 'Rörlighet' },
  toiminnallisuus: { fi: 'Toiminnallisuus',          sv: 'Funktionalitet' },
  liikeketjut:     { fi: 'Liikeketjut',              sv: 'Rörelsebanor' },
  pallonhallinta:  { fi: 'Pallonhallinta',           sv: 'Bollkontroll' },
};

// ================================================================
//  VIENTI (CommonJS + selain)
// ================================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TM_TESTIPANKKI,
    TM_PROTOKOLLAT,
    TM_PROTOKOLLAN_TESTIT,
    TM_LASKE_FLEI,
    TM_LASKE_FLEI_KEHONPAINO,
    TM_LASKE_MAS,
    TM_LASKE_BIOIKA,
    TM_LASKE_MERKKI,
    TM_PITUUSPOTKU_VAHENNYS,
    TM_KATEGORIAN_NIMI,
    TM_ALIKATEGORIAN_NIMI,
  };
}
if (typeof window !== 'undefined') {
  window.TM_TESTIPANKKI             = TM_TESTIPANKKI;
  window.TM_PROTOKOLLAT             = TM_PROTOKOLLAT;
  window.TM_PROTOKOLLAN_TESTIT      = TM_PROTOKOLLAN_TESTIT;
  window.TM_LASKE_FLEI              = TM_LASKE_FLEI;
  window.TM_LASKE_FLEI_KEHONPAINO   = TM_LASKE_FLEI_KEHONPAINO;
  window.TM_LASKE_MAS               = TM_LASKE_MAS;
  window.TM_LASKE_BIOIKA            = TM_LASKE_BIOIKA;
  window.TM_LASKE_MERKKI            = TM_LASKE_MERKKI;
  window.TM_PITUUSPOTKU_VAHENNYS    = TM_PITUUSPOTKU_VAHENNYS;
  window.TM_KATEGORIAN_NIMI         = TM_KATEGORIAN_NIMI;
  window.TM_ALIKATEGORIAN_NIMI      = TM_ALIKATEGORIAN_NIMI;
}
