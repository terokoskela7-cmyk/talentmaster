/**
 * TM_KETJU_MATRIISI — Fascia-ketju ↔ Testi ↔ Pallotekniikka
 *
 * Kolme lähdettä yhdistettynä:
 * 1. Anatominen näyttö: Wilke ym. 2016 (6589 artikkelia)
 * 2. ICC-arvot: TalentMaster-dokumentaatio
 * 3. Jalkapallotutkimus: Liikanen & Törmä 2025, Forsman 2013, Höner 2021
 *
 * ANATOMINEN NÄYTTÖ (Wilke 2016):
 *   SBL  ⭐⭐⭐ — kaikki siirtymät todistettu (14 tutkimusta)
 *   DIAG ⭐⭐⭐ — FL kaikki siirtymät (6 tut.) + SL 5/9 (21 tut.)
 *   LL   ⭐⭐   — 2/5 siirtymää (10 tutkimusta)
 *   DFL  ⭐⭐   — hengitysyhteys anatomisesti perusteltu
 *   SFL  ⭐    — 0/7 siirtymää → käytä toiminnallista kieltä, ei anatomista
 *
 * PALLOTEKNIIKKA-PERIAATE:
 *   Jokainen pallollinen suoritus aktivoi ketjujen yhdistelmän.
 *   Päivittäinen pallokosketus kehittää ketjuja — tekniikka ja fysiikka
 *   eivät ole erillisiä vaan sama asia eri kulmasta.
 *   (Nevanlinna 2014: kultaikkuna 7-12v, Liikanen 2025: syöttö +13%)
 */

var TM_KETJU_MATRIISI = {

  // ══════════════════════════════════════════════════════════════
  // ⚡ SBL — TAKAKETJU
  // Anatomia: ⭐⭐⭐ VAHVA | Jalkapallo: nopeus, räjähtävyys
  // ══════════════════════════════════════════════════════════════
  sbl: {
    id: 'sbl',
    emoji: '⚡',
    nimi: { fi: 'Takaketju', sv: 'Bakre kedjan' },
    reitti: 'jalkapohja → pohje → hamstring → pakara → selkä → niska',
    anatomia_naytto: 'vahva',
    jalkapallo: 'Nopeus, räjähtävyys, kiihdytys. Nopeus syntyy takaa.',
    tyypillinen_oire: ['hamstring', 'alaselkä', 'akillesjänne', 'MTSS'],

    testit: [
      { id: 'nopeus_10m',        naytto: 'vahva',      icc: '>0.97',
        perustelu: 'Kiihdytys = takaketjun kuormitustesti. SBL anatomisesti vahvin.' },
      { id: 'nopeus_30m',        naytto: 'vahva',      icc: '>0.97',
        perustelu: 'Maksiminopeus = takaketjun elastinen energian vapautus.' },
      { id: 'kevennyshyppy',     naytto: 'vahva',      icc: '>0.95',
        perustelu: 'CMJ mittaa SSC-kapasiteettia — takaketjun eksentrinen→konsentrinen.' },
      { id: 'viisi_loikka',      naytto: 'vahva',      icc: '0.90-0.95',
        perustelu: 'Reaktiiviset loikat = takaketjun SSC-käyttö toistuvasti.' },
      { id: 'pituushyppy',       naytto: 'kohtalainen', icc: '0.90-0.95',
        perustelu: 'Horisontaalinen ponnistus painottaa takaketjua.' },
      { id: 'suoran_jalan_nosto', naytto: 'vahva',     icc: '0.85-0.96',
        perustelu: 'Suora hamstringin + takaketjun liikkuvuustesti.' },
      { id: 'slr_neuraalinen',   naytto: 'vahva',      icc: '0.85-0.96',
        perustelu: 'Neuraalinen tensio takaketjussa. Toistuva hamstring = usein neuraalinen.' },
      { id: 'lantionnosto_yj',   naytto: 'kohtalainen', icc: '0.85+',
        perustelu: 'Hamstring + pakara eksentrinen. PHV-varoitus < 29 toistoa.' },
    ],

    pallotekniikka: [
      {
        laji: 'pituuspotku',
        rooli: 'pääketju',
        perustelu: 'Tukijalan takaketju absorboi iskun ja generoi voimaa. ' +
                   'Heikko SBL → potku menee nilkalta eikä koko ketjulta.',
        harjoite_cue: 'Tunne kantapää maassa läpi koko tukivaiheen.',
      },
      {
        laji: 'kuljetus_laukaus',
        rooli: 'avustava',
        perustelu: 'Tukijalan SBL absorboi laukaisuvoiman. ' +
                   'Heikko SBL näkyy tasapainon menetyksenä laukaisun jälkeen.',
        harjoite_cue: 'Pohje kiinni maassa — ei nouse päkiälle ennen kontaktia.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 🦵 SFL — ETUKETJU
  // Anatomia: ⭐ HEIKKO (Wilke 2016: 0/7) — käytä toiminnallista kieltä
  // Jalkapallo: potku, räjähtävyys, kiihdytys
  // ══════════════════════════════════════════════════════════════
  sfl: {
    id: 'sfl',
    emoji: '🦵',
    nimi: { fi: 'Etuketju', sv: 'Främre kedjan' },
    reitti: 'jalkapöytä → quadriceps → lonkankoukistaja → vatsa → kaula',
    anatomia_naytto: 'heikko',
    anatomia_huomio: 'Käytä: "lonkka auki → potku tehostuu". Älä: "rectus femoris jatkuu rectus abdominikseen".',
    jalkapallo: 'Räjähtävyys, potku, kiihdytys. Lonkka auki → potku tehostuu.',
    tyypillinen_oire: ['polven etuosa / Osgood-Schlatter', 'pubiitis', 'hip flexor kireys'],

    testit: [
      { id: 'thomasin_testi',  naytto: 'vahva',       icc: '0.80-0.92',
        perustelu: 'Lonkankoukistajien kireys on kliinisesti vahvin SFL-indikaattori.' },
      { id: 'staattinen_hyppy', naytto: 'kohtalainen', icc: '0.90-0.95',
        perustelu: 'SJ ilman SSC = konsentrinen etuketjun testi (quadriceps).' },
      { id: 'valakyykky',      naytto: 'kohtalainen', icc: '0.72-0.89',
        perustelu: 'Paljastaa hip flexor -kireyden ja rintakehän liikkuvuuden.' },
      { id: 'askelkyykky',     naytto: 'kohtalainen', icc: '0.85+',
        perustelu: 'Kuormittaa etuketjua yhden jalan kautta.' },
      { id: 'nopeus_5m',       naytto: 'epäsuora',    icc: '>0.97',
        perustelu: '5m lähtö = räjähtävä kiihdytys lonkasta. Hip flexor kireys rajoittaa.' },
    ],

    pallotekniikka: [
      {
        laji: 'syotto',
        rooli: 'avustava',
        perustelu: 'Lonkka avautuu potkuvaiheessa — SFL:n kireys rajoittaa voiman siirtymistä. ' +
                   'Thomas positiivinen → syötön voima rajoittuu suoraan.',
        harjoite_cue: 'Lonkka auki ensin — sitten jalka heilahtaa.',
      },
      {
        laji: 'kuljetus_laukaus',
        rooli: 'pääketju',
        perustelu: 'Laukaisussa lonkka ojentuu täysin — vaatii vapaan SFL:n. ' +
                   'Hip flexor kireys on yleisin syy miksi potku ei "lennä".',
        harjoite_cue: 'Tunne rintakehä auki ennen kontaktia.',
      },
      {
        laji: 'pituuspotku',
        rooli: 'avustava',
        perustelu: 'Maksimaalisessa pituuspotkulle lonkan täysi ojennus kriittinen.',
        harjoite_cue: 'Anna lonkan tulla kokonaan auki — älä pidä kiinni.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // ↔️ LL — SIVUKETJU
  // Anatomia: ⭐⭐ KOHTALAINEN | Jalkapallo: ketteryys p=0.001
  // ══════════════════════════════════════════════════════════════
  ll: {
    id: 'll',
    emoji: '↔️',
    nimi: { fi: 'Sivuketju', sv: 'Laterala kedjan' },
    reitti: 'jalkapohja → fibula → IT-band → gluteus → thorax',
    anatomia_naytto: 'kohtalainen',
    jalkapallo: 'Ketteryys, lateraalivakaus, suunnanmuutos. 3 askeleella jarrutus.',
    tyypillinen_oire: ['IT-band', 'toistuva nilkan nyrjähdys', 'polven lateraalivamma'],

    testit: [
      { id: 'kasirata',            naytto: 'vahva',      icc: '0.90-0.95',
        perustelu: 'Kasirata = lateraaliketjun monipuolisin testi. Liikanen 2025: p=0.001.' },
      { id: 'suunnanmuutos_505',   naytto: 'vahva',      icc: '0.91-0.97',
        perustelu: '5-0-5 mittaa puhdasta 180° käännöstä. Asymmetria >0.1s = riski.' },
      { id: 'sm_juoksu_jalkapallo', naytto: 'kohtalainen', icc: '0.90+',
        perustelu: 'SM-juoksu ilman palloa = puhdas suunnanmuutos (LL + DIAG).' },
      { id: 'luistelijan_kyykky',  naytto: 'kohtalainen', icc: '0.85+',
        perustelu: 'Yhden jalan lateraalivakaus. Polvilumpion siirtyminen = LL-kireys.' },
      { id: 'sivulankku',          naytto: 'kohtalainen', icc: '0.85+',
        perustelu: 'Lateraalisen keskivartalon voima = LL-stabiliteetti.' },
      { id: 'tasapaino',           naytto: 'kohtalainen', icc: '0.85-0.91',
        perustelu: 'Y-Balance posterolateral = LL/DFL. Nilkan vammariskin ennustaja.' },
      { id: 'nilkan_liikkuvuus',   naytto: 'epäsuora',    icc: '0.85+',
        perustelu: 'Nilkan dorsifleksio rajoittaa lateraaliliikkumista.' },
    ],

    pallotekniikka: [
      {
        laji: 'pujottelu',
        rooli: 'pääketju',
        perustelu: 'Pujottelu vaatii toistuvaa lateraalista jarrutusta ja käynnistystä. ' +
                   'LL on se ketju joka pitää polven linjassa käänteissä. ' +
                   'Liikanen 2025: pujottelu +9% erotteli. Forsman 2013: kaikissa ikäluokissa.',
        harjoite_cue: '3 askelta jarrutuksessa — älä katkaise liikettä yhdellä askeleella.',
      },
      {
        laji: 'ponnauttelu',
        rooli: 'avustava',
        perustelu: 'Sivuttaiset mukautukset ponnauttelussa vaativat LL-stabiliteettia. ' +
                   'Heikko LL → ponnauttelu epätarkka sivulle menevällä pallolla.',
        harjoite_cue: 'Pidä lantio tasaisena — älä kallista sivulle palloa hakiessa.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 🔄⬡ DIAG — DIAGONAALIKETJU (SL + FL yhdistetty)
  // Anatomia: ⭐⭐⭐ VAHVA — molemmat todistettu (Wilke 2016)
  // Jalkapallo: syöttö +13%, SM-pallo +8% (Liikanen 2025)
  // ══════════════════════════════════════════════════════════════
  diag: {
    id: 'diag',
    emoji: '🔄⬡',
    nimi: { fi: 'Diagonaaliketju', sv: 'Diagonalkedjan' },
    reitti: 'SL: kallo → ristiin kehon yli → jalkapohja  |  FL: latissimus → kontra-gluteus → lonkankoukistaja',
    anatomia_naytto: 'vahva',
    jalkapallo: 'Rotaatiovoima, syöttö, harhautukset, diagonaalivoimat. Rintakehä ohjaa.',
    tyypillinen_oire: ['nivusvamma', 'IT-band', 'toistuva nilkka', 'olkapää-lonkka-diagonaali'],

    testit: [
      { id: 'sm_pallo_jalkapallo', naytto: 'vahva',      icc: '0.90+',
        perustelu: 'SM-pallo = rotaatio (SL) + diagonaalivoima (FL) samanaikaisesti. Liikanen 2025: +8%.' },
      { id: 'syotto',              naytto: 'vahva',      icc: '0.80-0.90',
        perustelu: 'Syöttö: latissimus → kontralateraalinen lonkka (FL) + rintakehän rotaatio (SL). Liikanen 2025: +13%.' },
      { id: 'viisi_loikka',        naytto: 'vahva',      icc: '0.90-0.95',
        perustelu: 'Vuorojalkaloikat = FL-diagonaali toistuvasti. Latissimus → gluteus joka loikassa.' },
      { id: 'pujottelu',           naytto: 'kohtalainen', icc: '0.85-0.92',
        perustelu: 'Pujottelu = rotaatio (SL) + suunnanmuutos. Forsman 2013: erotteli U11-U14.' },
      { id: 'ponnauttelu',         naytto: 'kohtalainen', icc: '0.80-0.90',
        perustelu: 'Ponnauttelu vaatii rotaatio-koordinaatiota. Forsman 2013: erotteli kaikissa ikäluokissa.' },
      { id: 'eteentaivutus_haaraistunn', naytto: 'kohtalainen', icc: '0.85+',
        perustelu: 'Haaraistunta = spiraaliketjun kireys. Adduktorikireys liittyy DIAG-epätasapainoon.' },
      { id: 'hartiarenkaan_liikkuvuus', naytto: 'kohtalainen', icc: '0.80-0.90',
        perustelu: 'Hartiarenkaan kireys rajoittaa latissimus-toimintaa → FL-rajoite.' },
    ],

    pallotekniikka: [
      {
        laji: 'syotto',
        rooli: 'pääketju',
        perustelu: 'Syöttö on puhtain DIAG-suoritus jalkapallossa. ' +
                   'FL: latissimus aktivoituu vastakkaiselta puolelta. ' +
                   'SL: rintakehän rotaatio generoi voimaa. ' +
                   'Liikanen 2025: syöttö vahvin ammattilaisennustaja (+13%).',
        harjoite_cue: 'Rintakehä ohjaa — jalka seuraa automaattisesti.',
      },
      {
        laji: 'sm_pallo_jalkapallo',
        rooli: 'pääketju',
        perustelu: 'SM-pallo paineessa vaatii DIAG:n täyden integraation. ' +
                   'Rotaatio käännöksessä (SL) + diagonaalivoima lähdössä (FL). ' +
                   'Liikanen 2025: +8% erotteli ammattilaiset.',
        harjoite_cue: 'Käänny rintakehästä — älä vain siirrä painoa.',
      },
      {
        laji: 'pujottelu',
        rooli: 'avustava',
        perustelu: 'Pujottelussa nopeat käännöt tulevat rotaatiosta (SL). ' +
                   'Diagonaaliaskel käännöksessä aktivoi FL:n.',
        harjoite_cue: 'Ensimmäinen askel käännöksessä diagonaaliin — ei suoraan sivulle.',
      },
      {
        laji: 'ponnauttelu',
        rooli: 'pääketju',
        perustelu: 'Ponnauttelu on päivittäinen DIAG-harjoite ilman että sitä edes tiedetään. ' +
                   'Rytminen pallonkosketus vaatii DIAG-koordinaatiota. ' +
                   'Forsman 2013: ponnauttelu erotteli lahjakkaita kaikissa U11-U14-ikäluokissa.',
        harjoite_cue: 'Rintakehä rentona — anna kehon kiertyä luonnostaan.',
      },
      {
        laji: 'kuljetus_laukaus',
        rooli: 'pääketju',
        perustelu: 'Laukominen generoi voiman DIAG:sta: rintakehä avautuu vastakkaiseen suuntaan ' +
                   'juuri ennen kontaktia (SL) ja latissimus vetää (FL). ' +
                   'Tämä on "whip"-efekti joka tekee laukauksesta tehokkaan.',
        harjoite_cue: 'Käsi vastakkaiselta puolelta eteen — se avaa diagonaalin.',
      },
      {
        laji: 'pituuspotku',
        rooli: 'avustava',
        perustelu: 'Pituuspotkulle maksimaalinen kääntymisenopeus lähtöaskelessa tulee DIAG:sta.',
        harjoite_cue: 'Viimeinen askel diagonaaliin — avaa rotaatio ennen kontaktia.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════
  // 🏗️ DFL — HALLINTAKETJU
  // Anatomia: ⭐⭐ KOHTALAINEN | Jalkapallo: asento, hengitys, rytmi
  // ══════════════════════════════════════════════════════════════
  dfl: {
    id: 'dfl',
    emoji: '🏗️',
    nimi: { fi: 'Hallintaketju', sv: 'Djupa kedjan' },
    reitti: 'jalkaterän syvät → lantionpohja → iliopsoas → pallea → niska',
    anatomia_naytto: 'kohtalainen',
    jalkapallo: 'Asento, hengitys, elastisuus. Ryhti pysyy kovimmassakin tilanteessa.',
    tyypillinen_oire: ['alaselkä toistuva', 'lantion epävakaus', 'hengityshäiriö'],

    testit: [
      { id: 'valakyykky',   naytto: 'vahva',       icc: '0.72-0.89',
        perustelu: 'Valakyykky on DFL:n toiminnallisin testi. Lantionpohja + pallea + thorax.' },
      { id: 'lankku',       naytto: 'vahva',       icc: '0.85+',
        perustelu: 'Lankku = DFL-stabiliteetti käytännössä.' },
      { id: 'lankku_120s',  naytto: 'vahva',       icc: '0.85+',
        perustelu: 'U15-version pidempi lankku = DFL:n kestovoimatesti.' },
      { id: 'tasapaino',    naytto: 'kohtalainen', icc: '0.85-0.91',
        perustelu: 'SEBT Anterior = DFL (Plisky 2006). Nilkan syvät stabilisaattorit.' },
      { id: 'hyva_huomenta', naytto: 'kohtalainen', icc: '0.75-0.85',
        perustelu: 'Hip hinge = DFL + SBL integraatio. Selkärangan neutraali vaatii DFL.' },
      { id: 'lonkan_ojennus', naytto: 'kohtalainen', icc: '0.80+',
        perustelu: 'Lonkan aktiivinen ojennus = iliopsoas (DFL:n ydinlihas) toiminnallisuus.' },
    ],

    pallotekniikka: [
      {
        laji: 'ponnauttelu',
        rooli: 'pääketju',
        perustelu: 'Ponnauttelu on DFL:n jatkuva testi — rytmi, asento ja hengitys integroituna. ' +
                   'Heikko DFL: rytmi hajoaa väsyessä, asento kallistuu eteenpäin. ' +
                   'DFL pitää syvän pohjan kaikelle pallonkosketukselle. ' +
                   'Tämä on MIKSI päivittäinen ponnauttelu on tärkeää — se harjoittaa DFL:ää samalla.',
        harjoite_cue: 'Hengitä tasaisesti — älä pidätä hengitystä ponnautellessasi.',
      },
      {
        laji: 'syotto',
        rooli: 'avustava',
        perustelu: 'DFL pitää lantion vakaana syötön aikana. ' +
                   'Heikko DFL → lantio heiluu → syöttö epätarkka.',
        harjoite_cue: 'Vatsa kiinni ennen kontaktia — lantio pysyy paikallaan.',
      },
      {
        laji: 'sm_pallo_jalkapallo',
        rooli: 'avustava',
        perustelu: 'SM-pallo paineessa: DFL pitää asennon vaikka DIAG generoi rotaation. ' +
                   'Ilman DFL-pohjaa SM-pallo hajoaa rasituksessa.',
        harjoite_cue: 'Asento säilyy läpi koko sarjan — ei lysähdä käänteissä.',
      },
      {
        laji: 'pujottelu',
        rooli: 'avustava',
        perustelu: 'Nopea suunnanmuutos vaatii DFL-pohjan — ilman sitä vartalon hallinta pettää.',
        harjoite_cue: 'Pidä pää paikoillaan käänteissä — ei pompi ylös-alas.',
      },
    ],
  },

};

// ══════════════════════════════════════════════════════════════
// PALLOTEKNIIKKA-HAKEMISTO
// Koonti: mikä tekniikka aktivoi mitä ketjua
// ══════════════════════════════════════════════════════════════

var TM_PALLOTEKNIIKKA = {
  ponnauttelu: {
    id: 'ponnauttelu',
    ketjut: [
      { ketju: 'dfl',  rooli: 'pääketju',  emoji: '🏗️',
        kuvaus: 'Rytmi, asento, hengitys integroituna. Heikko DFL → rytmi hajoaa.' },
      { ketju: 'diag', rooli: 'pääketju',  emoji: '🔄⬡',
        kuvaus: 'Rotaatio-koordinaatio pehmeissä käänteissä.' },
      { ketju: 'll',   rooli: 'avustava',  emoji: '↔️',
        kuvaus: 'Sivuttaiset mukautukset.' },
    ],
    harjoite_cue: 'Hengitä tasaisesti, rintakehä rentona, anna kehon kiertyä luonnostaan.',
    miksi_paivittain: 'Ponnauttelu harjoittaa DFL + DIAG -integraatiota päivittäin ilman kuormitusta. ' +
                      'Forsman 2013: erotteli lahjakkaita kaikissa U11-U14-ikäluokissa.',
  },
  syotto: {
    id: 'syotto',
    ketjut: [
      { ketju: 'diag', rooli: 'pääketju',  emoji: '🔄⬡',
        kuvaus: 'Latissimus → kontra-lonkka (FL) + rintakehän rotaatio (SL). Liikanen 2025: +13%.' },
      { ketju: 'sfl',  rooli: 'avustava',  emoji: '🦵',
        kuvaus: 'Lonkka avautuu potkuvaiheessa. Thomas positiivinen → voima rajoittuu.' },
      { ketju: 'dfl',  rooli: 'avustava',  emoji: '🏗️',
        kuvaus: 'Lantio vakaa syötön aikana.' },
    ],
    harjoite_cue: 'Rintakehä ohjaa — jalka seuraa automaattisesti. Lonkka auki ensin.',
    miksi_paivittain: 'Syöttö on vahvin yksittäinen ammattilaisennustaja (+13%, Liikanen 2025). ' +
                      'Päivittäinen syöttöpenkki tai seinäsyöttö kehittää DIAG-integraatiota.',
  },
  pujottelu: {
    id: 'pujottelu',
    ketjut: [
      { ketju: 'll',   rooli: 'pääketju',  emoji: '↔️',
        kuvaus: 'Lateraalinen jarrutus ja käynnistys. Liikanen 2025: +9%.' },
      { ketju: 'diag', rooli: 'avustava',  emoji: '🔄⬡',
        kuvaus: 'Rotaatioimpulssi nopeissa käänteissä.' },
      { ketju: 'dfl',  rooli: 'avustava',  emoji: '🏗️',
        kuvaus: 'Vartalon hallinta läpi koko pujottelun.' },
    ],
    harjoite_cue: '3 askelta jarrutuksessa. Ensimmäinen askel käännöksessä diagonaaliin.',
    miksi_paivittain: 'Pujottelu on LL + DIAG -integraation päivittäinen harjoite. ' +
                      'Forsman 2013: erotteli lahjakkaita kaikissa ikäluokissa.',
  },
  kuljetus_laukaus: {
    id: 'kuljetus_laukaus',
    ketjut: [
      { ketju: 'diag', rooli: 'pääketju',  emoji: '🔄⬡',
        kuvaus: 'Whip-efekti: rintakehä auki + latissimus vetää. Tekee laukauksesta tehokkaan.' },
      { ketju: 'sfl',  rooli: 'pääketju',  emoji: '🦵',
        kuvaus: 'Lonkan täysi ojennus. Hip flexor kireys = potku ei lennä.' },
      { ketju: 'sbl',  rooli: 'avustava',  emoji: '⚡',
        kuvaus: 'Tukijalan takaketju absorboi laukaisuvoiman.' },
    ],
    harjoite_cue: 'Käsi vastakkaiselta puolelta eteen. Lonkka auki. Tunne pohje maassa.',
    miksi_paivittain: 'Laukaisutekniikka vaatii DIAG + SFL -integraation. ' +
                      'Päivittäinen viimeistely harjoittaa näitä ketjuja samalla.',
  },
  pituuspotku: {
    id: 'pituuspotku',
    ketjut: [
      { ketju: 'sbl',  rooli: 'pääketju',  emoji: '⚡',
        kuvaus: 'Tukijalan takaketju absorboi ja generoi. Heikko SBL = potku hajoaa nilkalta.' },
      { ketju: 'diag', rooli: 'avustava',  emoji: '🔄⬡',
        kuvaus: 'Lähtöaskeleen rotaatioimpulssi. Viimeinen askel diagonaaliin.' },
      { ketju: 'sfl',  rooli: 'avustava',  emoji: '🦵',
        kuvaus: 'Lonkan täysi ojennus maksimaaliseen kantamaan.' },
    ],
    harjoite_cue: 'Kantapää maassa tukivaiheessa. Viimeinen askel diagonaaliin. Anna lonkan tulla auki.',
    miksi_paivittain: 'Pituuspotku vaatii kaikkein eniten ketjujen integraatiota — ' +
                      'siksi se tulee protokollaan vasta U12:sta.',
  },
};

// ══════════════════════════════════════════════════════════════
// APUFUNKTIOT
// ══════════════════════════════════════════════════════════════

function TM_TESTIN_KETJUT(testiId) {
  var tulokset = [];
  Object.values(TM_KETJU_MATRIISI).forEach(function(ketju) {
    ketju.testit.forEach(function(linkki) {
      if (linkki.id === testiId) {
        tulokset.push({
          ketju: ketju.id, emoji: ketju.emoji,
          nimi: ketju.nimi.fi, naytto: linkki.naytto,
        });
      }
    });
  });
  return tulokset;
}

function TM_KETJUN_TESTIT(ketjuId) {
  var ketju = TM_KETJU_MATRIISI[ketjuId];
  if (!ketju) return [];
  var j = { vahva: 0, kohtalainen: 1, epäsuora: 2, heikko: 3 };
  return ketju.testit.slice().sort(function(a, b) {
    return (j[a.naytto]||9) - (j[b.naytto]||9);
  });
}

function TM_TEKNIIKAN_KETJUT(tekniikkaId) {
  var t = TM_PALLOTEKNIIKKA[tekniikkaId];
  if (!t) return [];
  return t.ketjut;
}

function TM_KETJUN_TEKNIIKAT(ketjuId) {
  var tulokset = [];
  Object.values(TM_PALLOTEKNIIKKA).forEach(function(t) {
    t.ketjut.forEach(function(k) {
      if (k.ketju === ketjuId) {
        tulokset.push({
          laji: t.id, rooli: k.rooli,
          cue: t.harjoite_cue,
        });
      }
    });
  });
  return tulokset;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TM_KETJU_MATRIISI, TM_PALLOTEKNIIKKA,
    TM_TESTIN_KETJUT, TM_KETJUN_TESTIT,
    TM_TEKNIIKAN_KETJUT, TM_KETJUN_TEKNIIKAT,
  };
}
if (typeof window !== 'undefined') {
  window.TM_KETJU_MATRIISI    = TM_KETJU_MATRIISI;
  window.TM_PALLOTEKNIIKKA    = TM_PALLOTEKNIIKKA;
  window.TM_TESTIN_KETJUT     = TM_TESTIN_KETJUT;
  window.TM_KETJUN_TESTIT     = TM_KETJUN_TESTIT;
  window.TM_TEKNIIKAN_KETJUT  = TM_TEKNIIKAN_KETJUT;
  window.TM_KETJUN_TEKNIIKAT  = TM_KETJUN_TEKNIIKAT;
}
