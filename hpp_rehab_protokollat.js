/**
 * HPP ELITE — Rehabilitaatioprotokollat v1.0
 * ============================================
 * Tiedosto: hpp_rehab_protokollat.js
 * 
 * KÄYTTÖ:
 *   Tämä tiedosto on TalentMaster-järjestelmän ja HPP ELITE -klinikan
 *   yhteinen protokolladata. Se voidaan päivittää ilman muutoksia
 *   sovelluskoodiin — lisää vain uusi harjoite HPP_EXERCISES-objektiin
 *   ja viittaa siihen protokollassa hppId:n kautta.
 *
 * PÄIVITYSOHJEET (klinikan asiantuntijoille):
 *   1. Lisää uusi harjoite HPP_EXERCISES-objektiin alla olevaa mallia seuraten
 *   2. Päivitä vammaprotokolla HPP_REHAB_PROTOKOLLAT-objektissa
 *   3. Päivitä versio ja päivämäärä tiedoston lopussa
 *   4. Testaa muutokset TalentMaster-testisivulla ennen tuotantoon vientiä
 *
 * LÄHTEET:
 *   Myers TW (2001) Anatomy Trains — fascial meridians
 *   Wilke J et al. (2016) Proposed nomenclature for myofascial force transmission
 *   HPP ELITE v9 harjoitekirjasto (Excel, 53 harjoitetta)
 *   Palloliiton Huuhkajapolku-testistö (2024)
 *
 * VERSIOHISTORIA:
 *   v1.0 (2026-03-19) — Ensimmäinen julkaistu versio, 7 vamma-aluetta,
 *                        53 harjoitteen kirjasto
 */

// ═══════════════════════════════════════════════════════════════════════════
// HARJOITEKIRJASTO
// ═══════════════════════════════════════════════════════════════════════════
// Jokainen harjoite on dokumentoitu viidellä kentällä:
//   n        — nimi suomeksi (lyhyt, kentällä käytettävä)
//   d        — annostelu (sarjat × toistot / aika)
//   ohje     — suoritusohje (1-2 lausetta, selkeä)
//   cue      — coaching cue (se yksi lause jonka valmentaja sanoo)
//   fascia   — fasialinja/linjat joita harjoite kuormittaa
//   progressio — harjoitteen taso (1=helpoin, 3=vaativin)
//   vaihe    — missä rehab-vaiheessa käytetään (Acute/Subacute/Chronic/All)
//   phv_ok   — onko turvallinen kasvupyrähdyksen aikana (true/false)
//   huomio   — erityishuomio tai kontraindikaatio

var HPP_EXERCISES = {

  // ──────────────────────────────────────────────────────────────────────
  // AKUUTTIVAIHEEN HARJOITTEET — kivuton, turvallinen liike
  // ──────────────────────────────────────────────────────────────────────

  EX_QUAD_SET: {
    n: 'Quadriceps-aktivointi',
    d: '3 × 10 / jalka',
    ohje: 'Makaa selällään, polvi ojennettuna. Jännitä reiden etuosa kevyesti, pidä 5 sekuntia.',
    cue: 'Paina polven takaosa lattiaan — reiden etuosa jännittyy.',
    fascia: 'SFL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Aloitusharjoite polvioperaation tai -vamman jälkeen. EI kipua sallita.'
  },

  EX_SLR: {
    n: 'Suoran jalan nosto',
    d: '3 × 10 / jalka',
    ohje: 'Makaa selällään. Nosta suoraksi ojennettu jalka 45° kulmaan ja laske hallitusti.',
    cue: 'Vatsa kiinni — älä anna selän kaareutua noston aikana.',
    fascia: 'SFL + SBL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Polven quadriceps-voiman ylläpito immobilisaatiovaiheessa.'
  },

  EX_ANKLE_MOB: {
    n: 'Nilkan liikkuvuusharjoittelu',
    d: '2 × 10 suuntaa',
    ohje: 'Istu tuolilla, nosta jalka lattiasta. Tee nilkalla suuria ympyröitä molemmin puolin.',
    cue: 'Iso, hidas ympyrä — anna nilkka lämmetä.',
    fascia: 'LL + SBL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Nilkkavamman ensimmäisen päivän kipuohjattu liike. Ei painokuormitusta.'
  },

  EX_HIP_MOB: {
    n: 'Lonkan liikkuvuus — selinmakuu',
    d: '2 × 10 / jalka',
    ohje: 'Makaa selällään. Vedä polvi rintaan ja tee pieniä ympyräliikkeitä lonkkanivelellä.',
    cue: 'Lantio pysyy alustalla — vain jalka liikkuu.',
    fascia: 'DFL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Lonkkavamman liikelaajuuden ylläpito. Ei kipua sallita.'
  },

  EX_CORE_MOB: {
    n: 'Selkärangan liikkuvuus — cat-cow',
    d: '2 × 10 toistoa',
    ohje: 'Konttausasennossa. Pyöristä selkä kattoa kohti, sitten notista se alas. Hidas rytmi.',
    cue: 'Hengitä ulos pyöristäessä, sisään notistamalla.',
    fascia: 'SBL + SFL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Selkävamman akuuttivaiheen liikkuvuuden ylläpito.'
  },

  EX_ISOMETRIC: {
    n: 'Isometrinen lihasaktivointia',
    d: '3 × 5 s pidätys / lihasryhmä',
    ohje: 'Jännitä kohdelihas ilman liikettä. Pidä 5 sekuntia, rentouta täysin.',
    cue: 'Kipua ei saa tuntua — kevyt jännitys riittää.',
    fascia: 'SBL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Akuuttivaiheen lihaksiston aktivointi ilman kuormitusta. Kaikille vamma-alueille.'
  },

  // ──────────────────────────────────────────────────────────────────────
  // SUBAKUUTTIVAIHEEN HARJOITTEET — varhainen kuormitus ja vahvistus
  // ──────────────────────────────────────────────────────────────────────

  EX_PROP_BALANCE: {
    n: 'Proprioseptiikka — tasapainolauta',
    d: '3 × 30 s / jalka',
    ohje: 'Seiso yhdellä jalalla tasapainolaudalla. Pidä katse horisontissa, polvi hieman koukussa.',
    cue: 'Nilkka tekee työn — älä korjaa tasapainoa vartalolla.',
    fascia: 'LL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkkavamman subakuuttivaihe. Aloitetaan vakaalla alustalla ennen epävakaata.'
  },

  EX_NILKKA: {
    n: 'Nilkan stabilisaatioharjoitus',
    d: '3 × 12 / jalka',
    ohje: 'Seiso yhdellä jalalla, polvi hieman koukussa. Tee pieniä suunnanmuutoksia nilkalla.',
    cue: 'Varvas osoittaa suoraan eteenpäin — ei käänny sisään.',
    fascia: 'LL + SBL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkkavamman subakuuttivaihe. Siirtyy EX_PROP_BALANCE:sta.'
  },

  EX_NORDIC: {
    n: 'Nordic Hamstring',
    d: '3 × 6 toistoa',
    ohje: 'Polvet maassa, jalat kiinni. Laske ylävartaloa eteenpäin mahdollisimman hitaasti. Käsillä ponnistus ylös.',
    cue: 'Pidä keho suorana — ei lantio eteen. Jarruta, älä anna tippua.',
    fascia: 'SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: false,
    huomio: 'EI PHV-vaiheessa. Aloitetaan vain kun Nordic curl on kivuton reisivamman jälkeen. Palloliiton kv-suositus.'
  },

  EX_NORDIC_HS_REGRESSION: {
    n: 'Takareiden venytys — progressio',
    d: '2 × 30 s / jalka',
    ohje: 'Istu lattialle, ojennettu jalka suorana edessä. Kurkota sormet varpaita kohti, pidä selkä suorana.',
    cue: 'Hengitä ulos venytyksen aikana — anna lihaksen pehmetä.',
    fascia: 'SBL',
    progressio: 1,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Reisivamman subakuuttivaiheen ensimmäinen eksentrinen harjoite ennen EX_NORDIC:ia.'
  },

  EX_LONKKA: {
    n: 'Lonkan ojentajat — silta',
    d: '3 × 12 toistoa',
    ohje: 'Makaa selällään polvet koukussa. Nosta lantio ylös, pidä 2 sekuntia, laske hallitusti.',
    cue: 'Purista pakarat yhteen huipulla — älä anna lantion kiertyä.',
    fascia: 'SBL + DFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Polvi- ja lonkkavammojen subakuuttivaiheen perusharjoite.'
  },

  EX_KYYKKY: {
    n: 'Kyykky — hallittu',
    d: '3 × 10 toistoa',
    ohje: 'Jalat hartianlevyisessä haara-asennossa. Laske hitaasti kyykkyyn (3 s), nouse 1 s.',
    cue: 'Polvi seuraa varpaansuuntaa — ei kaadu sisään.',
    fascia: 'SFL + DFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Polvi- ja lonkkavammojen subakuuttivaihe. Kipuraja: ei polvisärkyä laskuvaiheen aikana.'
  },

  EX_CALF_RAISE: {
    n: 'Pohjenousu — eksentrinen',
    d: '3 × 15 / jalka',
    ohje: 'Seiso portaan reunalla yhdellä jalalla. Nouse varpaille (1 s), laske hitaasti alas kantapää alemmaksi (3–4 s).',
    cue: 'Lasku on tärkeämpi kuin nousu — hidas ja hallittu.',
    fascia: 'SBL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Pohje- ja akillesvamman subakuuttivaihe. Alfredson-protokollan mukainen.'
  },

  EX_PLANK: {
    n: 'Lankku',
    d: '3 × 25–45 s',
    ohje: 'Kyynärnojassa, keho suorana nilkoista päähän. Älä anna lantion pudota tai nousta.',
    cue: 'Napa kohti selkärankaa — jännitä vatsa koko ajan.',
    fascia: 'SFL + DFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Selkävamman subakuuttivaiheen perusharjoite. McGill Big 3 -protokollan osa.'
  },

  EX_BIRD_DOG: {
    n: 'Bird Dog — selkälihasstabiliteetti',
    d: '3 × 8 / puoli',
    ohje: 'Konttausasennossa. Ojenna samanaikaisesti vastakkainen käsi ja jalka suoraksi. Pidä 3 s.',
    cue: 'Selkä ei kaareudu — kuvittele lasi selässä.',
    fascia: 'SBL + DFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Selkävamman subakuuttivaihe. McGill Big 3 -protokollan osa.'
  },

  EX_SHOULDER_ROT: {
    n: 'Olkapään ulkokierto — vastus',
    d: '3 × 15 / puoli',
    ohje: 'Kyynärvarsi 90°, kyynärpää kyljessä. Pyöritä kyynärvarsi poispäin vartalosta vastusta vasten.',
    cue: 'Kyynärpää pysyy kiinni kyljessä — vain kyynärvarsi liikkuu.',
    fascia: 'FL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Olkapäävamman rotator cuff -harjoite. Aloitetaan subakuuttivaiheessa.'
  },

  EX_CALF_ISO_SEATED: {
    n: 'Pohje — istuen isometrinen',
    d: '3 × 10 s pidätys',
    ohje: 'Istu tuolilla, jalkapohja lattialla. Paina jalkapohjaa lattiaa vasten jännitä pohje.',
    cue: 'Kipua ei saa tuntua — kevyt jännitys riittää.',
    fascia: 'SBL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Pohjevamman akuuttivaiheen aktivointi ennen eksentrisiä harjoitteita.'
  },

  // ──────────────────────────────────────────────────────────────────────
  // KROONISEN VAIHEEN HARJOITTEET — täysi kuormitus ja lajinomaisuus
  // ──────────────────────────────────────────────────────────────────────

  EX_SIVU_HYPPY: {
    n: 'Sivuttaishypyt',
    d: '3 × 8 / suunta',
    ohje: 'Hyppää sivulle yhdellä jalalla, laske pehmeästi vastakkaiselle jalalle. Vaihda suuntaa.',
    cue: 'Laskeudu pehmeästi — polvi ei kaadu sisään.',
    fascia: 'LL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Nilkkavamman loppuvaihe. Edeltää suunnanmuutosharjoittelua pelissä.'
  },

  EX_LATERAL: {
    n: 'Lateraalijuoksu + suunnanmuutos',
    d: '4 × 10 m / suunta',
    ohje: 'Juokse sivulle matalassa asennossa ja tee terävä suunnanmuutos merkillä. Nopeus mukaan.',
    cue: 'Matala asento — polvi ja lonkka koukussa koko ajan.',
    fascia: 'LL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Nilkka- ja polvivamman palautumisvaihe. Edellyttää kipuvapaata yksijalkahyppyä.'
  },

  EX_CMJ: {
    n: 'Kevennyshyppy (CMJ)',
    d: '3 × 5 hyppyä',
    ohje: 'Seiso, tee nopea kyykky ja ponnista ylös mahdollisimman kovaa. Laske pehmeästi.',
    cue: 'Nopea alas — heti ylös. Kuin pallo pomppaa.',
    fascia: 'SBL + SFL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: false,
    huomio: 'EI PHV-huipussa. Plyometrinen harjoite — edellyttää kivutonta kyykkyä täydellä liikelaajuudella.'
  },

  EX_PLYO: {
    n: 'Plyometriikka — hyppysarjat',
    d: '4 × 6 hyppyä',
    ohje: 'Hyppää penkille tai esteen yli. Minimoi maakosketusaika — nouse heti uudelleen.',
    cue: 'Maassa vain sekunnin kymmenesosa — jousijännitys.',
    fascia: 'SBL + SFL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: false,
    huomio: 'EI PHV-huipussa. Korkein plyometrinen taso — edellyttää 3 kk oireenvapaata harjoittelua vamman jälkeen.'
  },

  EX_LAHTO: {
    n: 'Räjähtävät lähdöt',
    d: '6 × 10 m',
    ohje: 'Lähtö paikaltaan — eksploosiivinen ensimmäinen askel. Täysi vauhti 10 metriin.',
    cue: 'Ensimmäinen askel on tärkein — työnnä maata taaksepäin.',
    fascia: 'SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Reisi-, pohje- ja polvivamman paluuvaihe. Edellyttää kivutonta juoksuaskelta.'
  },

  EX_ROT_SYOTTO: {
    n: 'Rotaatiosyötöt — medicinepallo',
    d: '3 × 10 / suunta',
    ohje: 'Seiso sivuttain seinän lähellä. Heitä medicinepallo seinään vartalon kierrolla.',
    cue: 'Kierto alkaa lonkasta — ei olkapäästä.',
    fascia: 'SL + DFL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Selkä- ja olkapäävamman paluuvaihe. Alkaa kevyellä pallolla.'
  },

  EX_MED_HEITTO: {
    n: 'Medicinepallo sivuheitto',
    d: '3 × 8 / suunta',
    ohje: 'Seiso seinästä 1–2 m. Heitä medicinepallo seinään sivuttaisella kiertoliikkeellä.',
    cue: 'Lantio vetää — kädet seuraavat.',
    fascia: 'SL',
    progressio: 2,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Selkä- ja olkapäävamman paluuvaihe. Kevyempi versio EX_ROT_SYOTTO:sta.'
  },

  EX_LAUKAUS: {
    n: 'Laukausvolyymiharjoittelu',
    d: '3 × 10 laukausta / jalka',
    ohje: 'Laukaise palloa erilaisista asennoista. Laatu ennen voimaa — liikerata ensin oikein.',
    cue: 'Astuva jalka osoittaa maaliin — koko keho kiertyy.',
    fascia: 'SL + SBL',
    progressio: 2,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Olkapäävamman paluuvaihe. Myös lonkka- ja selkävamman loppuvaihe.'
  },

  // ──────────────────────────────────────────────────────────────────────
  // HPP ELITE -SPESIFIT HARJOITTEET (suoraan HPP ELITE v9 -kirjastosta)
  // ──────────────────────────────────────────────────────────────────────

  EX_NORDIC_FULL: {
    n: 'Nordic Hamstring — täysi',
    d: '3 × 8 toistoa',
    ohje: 'Polvet maassa, jalat tuettu. Laske ylävartaloa eteenpäin mahdollisimman hitaasti (5–6 s). Käsillä ponnistus takaisin.',
    cue: 'Pakarat kiinni — selkä suora koko laskun ajan.',
    fascia: 'SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: false,
    huomio: 'Täysin kehittynyt Nordic-versio. Ei PHV-vaiheessa. Preventiivinen käyttö saison aikana.'
  },

  EX_COPENHAGEN_REG: {
    n: 'Copenhagen Hip Adduction — regressio',
    d: '3 × 8 / puoli',
    ohje: 'Kylkimakuulla, alempi jalka korokkeella. Nosta lantio ylös ja laske hallitusti.',
    cue: 'Lantio suorassa linjassa — ei kiertyy.',
    fascia: 'DFL + LL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Lonkan lähentäjävamman (nivusvamma) subakuuttivaihe. Preventiivinen käyttö kaikille.'
  },

  EX_COPENHAGEN_FULL: {
    n: 'Copenhagen Hip Adduction — täysi',
    d: '3 × 10 / puoli',
    ohje: 'Kylkimakuulla, ylempi jalka penkillä. Nosta lantio ylös, pidä 1 s, laske hallitusti.',
    cue: 'Keho suorana jalasta päähän — ei taivuta vyötäröltä.',
    fascia: 'DFL + LL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Lonkan lähentäjävamman paluuvaihe. Korkein nivusvamman preventiivinen harjoite.'
  },

  EX_RDL_SINGLE_LEG: {
    n: 'Yksijalkamaastaveto (RDL)',
    d: '3 × 8 / jalka',
    ohje: 'Seiso yhdellä jalalla. Taivuta eteenpäin lonkalta, vapaa jalka osoittaa taaksepäin. Palaa hitaasti.',
    cue: 'Selkä suorana — liike tapahtuu lonkasta, ei selästä.',
    fascia: 'SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Reisi- ja polvivamman paluuvaihe. Erittäin hyvä tasapaino- ja hamstring-harjoite.'
  },

  EX_STEP_DOWN_ECC: {
    n: 'Portaalta alas — eksentrinen',
    d: '3 × 10 / jalka',
    ohje: 'Seiso portaalla yhdellä jalalla. Laske kantapää hitaasti alas portaan reunan yli (3–4 s). Nouse takaisin.',
    cue: 'Polvi suoraan eteenpäin — ei kaadu sisään tai ulkoa.',
    fascia: 'SFL + SBL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Polvilumpio-oireyhtymän (runner\'s knee) ja patellatendiniitinen subakuuttivaihe.'
  },

  EX_TKE: {
    n: 'Terminal Knee Extension',
    d: '3 × 15 / jalka',
    ohje: 'Vastus reiden takana koukistettuna. Ojenna polvi suoraksi vastuusta huolimatta. Hallittu.',
    cue: 'Vain polvi liikkuu — lonkka ja nilkka paikoillaan.',
    fascia: 'SFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Eturistisideleikkauksen (ACL) jälkeen ja polvivammojen quadriceps-aktivaatio subakuuttivaiheessa.'
  },

  EX_WALL_SQUAT_ISO: {
    n: 'Kyykkyistunta seinää vasten',
    d: '3 × 30 s',
    ohje: 'Selkä seinässä, polvet 90° kulmaan. Pidä asento. Jos kipua polvessa, nouse korkeammalle.',
    cue: 'Painopiste kantapäillä — polvet eivät ylitä varpaiden linjaa.',
    fascia: 'SFL + DFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Polvi- ja lonkkavamman subakuuttivaihe. Isometrinen vaihtoehto dynaamiselle kyykkylle.'
  },

  EX_HIP_FLEXOR_STRETCH: {
    n: 'Lonkan koukistajien venytys',
    d: '2 × 30 s / puoli',
    ohje: 'Askelkyykyssä eteen, takajalan polvi maassa. Työnnä lantiota eteenpäin kunnes venytys tuntuu reiden etupuolella.',
    cue: 'Lantio suoraan eteenpäin — ei käänny sivulle.',
    fascia: 'SFL',
    progressio: 1,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Lonkka- ja selkävamman liikkuvuuden palautus. PHV-pelaajilla erityisen tärkeä — psoas kiristyy kasvussa.'
  },

  EX_MCGILL_BIG3: {
    n: 'McGill Big 3 — selkäkuntosarja',
    d: 'Katso alla',
    ohje: '1) Modifioitu sit-up (3×8) 2) Bird Dog (3×8/puoli) 3) Sivulankku (3×30s/puoli). Tee järjestyksessä.',
    cue: 'Selkäranka neutraalissa — ei pyöristä missään liikkeessä.',
    fascia: 'SBL + SFL + DFL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Selkävamman subakuuttivaihe. McGill 2007 -protokollan mukainen. Kestää noin 15 min.'
  },

  EX_LATERAL_BAND_WALK: {
    n: 'Vastuskuminauhakävely sivuttain',
    d: '2 × 15 m / suunta',
    ohje: 'Vastus nilkkojen tai polvien ympärillä. Kävele sivusuuntaan matalassa puolikiikki-asennossa.',
    cue: 'Askeleet pieninä — älä anna jalkojen lähestyä toisiaan.',
    fascia: 'LL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkka- ja polvivamman subakuuttivaihe. Lonkan loitontajien aktivaatio.'
  },

  EX_LATERAL_HOP_DRILL: {
    n: 'Sivuttaisloikat — yksijalkainen',
    d: '3 × 8 / suunta',
    ohje: 'Loikka sivulle yhdellä jalalla, laske pehmeästi samalle jalalle. Vaihda suuntaa.',
    cue: 'Laskeudu nilkka, polvi, lonkka järjestyksessä — pehmeästi.',
    fascia: 'LL + SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Nilkkavamman paluuvaihe ennen täyttä suunnanmuutosta pelissä.'
  },

  EX_BULGARIAN_SPLIT: {
    n: 'Bulgarialaiskyykky',
    d: '3 × 8 / jalka',
    ohje: 'Takajalan varvas penkillä. Laske etujalan kyykkyyn hitaasti (3 s), nouse 1 s.',
    cue: 'Etupolvi suoraan varpaiden yli — ei sisään eikä ulos.',
    fascia: 'SFL + DFL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Polvi- ja lonkkavamman paluuvaihe. Erittäin hyvä unilateraalinen vahvistusharjoite.'
  },

  EX_CALF_ECCENTRIC_STEP: {
    n: 'Pohje — eksentrinen portaalla',
    d: '3 × 15 / jalka',
    ohje: 'Seiso portaan reunalla. Nouse molemmilla jaloilla, laske hitaasti yhdellä jalalla kantapää alemmaksi (4–5 s).',
    cue: 'Lasku on koko harjoite — tee se todella hitaasti.',
    fascia: 'SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Pohje- ja akillesvamman krooninen vaihe. Alfredson heavy-load protokolla.'
  },

  EX_PERONEAL_ISO_BAND: {
    n: 'Pohjeluulihakset — isometrinen',
    d: '3 × 10 s / jalka',
    ohje: 'Istu, vastus nilkan ympärillä ulkopuolella. Paina jalkaa ulospäin vastuuta vasten. Pidä 10 s.',
    cue: 'Nilkka liikkuu ulospäin — ei koko jalka.',
    fascia: 'LL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Nilkan lateraalivamman akuuttivaiheen ensimmäinen aktiivinen harjoite.'
  },

  EX_PERONEAL_STRENGTH_BAND: {
    n: 'Pohjeluulihakset — dynaaminen',
    d: '3 × 15 / jalka',
    ohje: 'Istu, vastus nilkan ympärillä. Paina jalkaa ulospäin ja sisäänpäin vuorotellen. Täysi liikelaajuus.',
    cue: 'Hidas ja hallittu — eri suuntiin.',
    fascia: 'LL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkan lateraalivamman subakuuttivaihe. Siirtyy EX_PERONEAL_ISO_BAND:sta.'
  },

  EX_PERONEAL_ENDURANCE: {
    n: 'Pohjeluulihakset — kestävyys',
    d: '3 × 25 / jalka',
    ohje: 'Istu, vastus nilkan ympärillä. Eversion liike nopealla rytmillä, suurella toistomäärällä.',
    cue: 'Pieni liike, iso määrä — kestävyys rakentuu.',
    fascia: 'LL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkan peroneal-lihasten kestävyysharjoittelu ennen paluuta juoksuun.'
  },

  EX_BALANCE_SL_STABLE: {
    n: 'Yksijalkatasapaino — vakaa alusta',
    d: '3 × 30 s / jalka',
    ohje: 'Seiso yhdellä jalalla silmät auki, katse kaukana. Polvi hieman koukussa. Älä anna heilua.',
    cue: 'Nilkka tekee työn — pidä varpaat levossa, ei tartu.',
    fascia: 'LL',
    progressio: 1,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkkavamman ensimmäinen tasapainoharjoite ennen epävakaata alustaa.'
  },

  EX_DORSIFLEXION_PAINFREE: {
    n: 'Nilkan koukistus — kivuton',
    d: '2 × 10',
    ohje: 'Istu tuolilla, jalka lattialla. Nosta jalkaterä lattiasta niin paljon kuin kipuvapaasti pystyt.',
    cue: 'Vain niin pitkälle kuin ei satu — kuuntele kehoa.',
    fascia: 'SBL + LL',
    progressio: 1,
    vaihe: 'Acute',
    phv_ok: true,
    huomio: 'Nilkkavamman ensimmäinen aktiivinen liike. Painopiste kivuttomassa liikelaajuudessa.'
  },

  EX_DORSIFLEXION_KNEE2WALL: {
    n: 'Nilkan koukistus — polvi seinään',
    d: '3 × 10 / jalka',
    ohje: 'Seiso lähellä seinää, paina polvea kohti seinää pitäen kantapää lattiassa. Lisää etäisyyttä progressiivisesti.',
    cue: 'Kantapää pysyy lattiassa — polvi ylittää varpaan.',
    fascia: 'SBL + LL',
    progressio: 2,
    vaihe: 'Subacute',
    phv_ok: true,
    huomio: 'Nilkan dorsifleksion liikkuvuuden palautus. Tärkein testi ennen juoksupaluuta.'
  },

  EX_RUN_RETURN_PROGRESS: {
    n: 'Juoksupalaatumisohjelma',
    d: 'Katso protokolla alla',
    ohje: 'Vaihe 1: Kävely 20 min. Vaihe 2: Kävely-hölkkä 20 min (1 min hölkkä / 1 min kävely × 10). Vaihe 3: Tasainen hölkkä 20 min. Vaihe 4: Temponvaihtelu. Vaihe 5: Täysi harjoitus.',
    cue: 'Kipua ei missään vaiheessa — jos kipua, palataan edelliseen vaiheeseen.',
    fascia: 'SBL',
    progressio: 3,
    vaihe: 'Chronic',
    phv_ok: true,
    huomio: 'Alaraajamman (reisi, pohje, nilkka, polvi) juoksupalautumisohjelma. Kestää tyypillisesti 5–10 päivää.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REHABILITAATIOPROTOKOLLAT VAMMA-ALUEITTAIN
// ═══════════════════════════════════════════════════════════════════════════
// Rakenne per vamma-alue:
//   fasialinja      — anatominen fasialinja (Myers 2001)
//   ketju           — TalentMaster-liikeketju (HPP_FASCIA-avain)
//   aikataulut      — tyypilliset palautumisajat vakavuuden mukaan
//   rehab.akuutti   — 0–72h protokolla
//   rehab.subakuutti— 4–14 pv protokolla
//   rehab.krooninen — 15 pv+ / return-to-sport protokolla
//   paluu_kriteerit — milloin voidaan palata täyteen harjoitteluun

var HPP_REHAB_PROTOKOLLAT = {

  Nilkka: {
    fasialinja: 'LL (Lateral Line) + SBL',
    ketju: 'sivu',
    ketju2: 'taka',
    tyypilliset_vammat: ['Lateraalinivelsiderepeämä (invertio)', 'Mediaalinivelsiderepeämä', 'Akillesjännetulehdus'],
    aikataulut: {
      liev:  { min_pv: 3,  max_pv: 7,  kuvaus: 'Lievä nyrjähdys — harjoittelu rajoitettu' },
      keski: { min_pv: 7,  max_pv: 21, kuvaus: 'Kohtalainen vamma — osittainen harjoittelu 2–3 vk' },
      vak:   { min_pv: 21, max_pv: 90, kuvaus: 'Vakava (side/jänne) — täysi palautuminen 3–12 vk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'PEACE (Protection, Elevation, Avoid anti-inflammatory, Compression, Education)',
        kielletyt: ['Kuormittava seisominen', 'Juokseminen', 'Hyppääminen', 'Suunnanmuutokset'],
        harjoitteet: ['EX_DORSIFLEXION_PAINFREE', 'EX_PERONEAL_ISO_BAND', 'EX_ANKLE_MOB'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (4–14 pv)',
        periaate: 'Varhainen kuormitus, proprioseptiikka, nilkan stabilisaatio',
        kielletyt: ['Täysi suunnanmuutos', 'Kontaktitilanteet'],
        harjoitteet: ['EX_DORSIFLEXION_KNEE2WALL', 'EX_BALANCE_SL_STABLE', 'EX_PERONEAL_STRENGTH_BAND',
                      'EX_NILKKA', 'EX_PROP_BALANCE', 'EX_LATERAL_BAND_WALK', 'EX_PERONEAL_ENDURANCE'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (14 pv+)',
        periaate: 'Progressiivinen kuormitus, lajinomainen liike, suunnanmuutokset',
        kielletyt: [],
        harjoitteet: ['EX_SIVU_HYPPY', 'EX_LATERAL_HOP_DRILL', 'EX_LATERAL', 'EX_RUN_RETURN_PROGRESS'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Kivuton kävely ja juoksu suoralla',
      'EX_BALANCE_SL_STABLE onnistuu 30 s silmät auki JA kiinni',
      'Nilkan dorsifleksio symmetrinen (+/- 5° verrattuna terveeseen puoleen)',
      'Yksijalkahyppy 80%+ verrattuna terveeseen puoleen'
    ],
    phv_huomio: 'PHV-pelaajilla nilkkanivelten luu-rust-liittymät ovat herkempiä. Kuormituksen lisäys hitaampaa.'
  },

  Polvi: {
    fasialinja: 'SBL + SFL + DFL',
    ketju: 'taka',
    ketju2: 'syva',
    tyypilliset_vammat: ['Eturistisiderepeämä (ACL)', 'Mediaalinen sivuside (MCL)', 'Meniskivamma',
                         'Patellafemoral-oireyhtymä', 'Osgood-Schlatter (kasvuikäisillä)'],
    aikataulut: {
      liev:  { min_pv: 3,  max_pv: 14, kuvaus: 'Lievä (MCL gr.1, Osgood lievä) — rajoitettu 1–2 vk' },
      keski: { min_pv: 14, max_pv: 42, kuvaus: 'Kohtalainen (MCL gr.2, menisci) — 2–6 vk' },
      vak:   { min_pv: 90, max_pv: 270, kuvaus: 'Vakava (ACL-leikkaus) — 9 kk return-to-sport' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'Turvotuksen hallinta, kipuohjattu liike, immobilisaatio tarvittaessa',
        kielletyt: ['Täysi kuormitus', 'Pivot-liikkeet', 'Hypyt'],
        harjoitteet: ['EX_QUAD_SET', 'EX_SLR', 'EX_ANKLE_MOB', 'EX_ISOMETRIC'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (1–6 vk)',
        periaate: 'Lihasvoima, täysi liikelaajuus, kipuohjattu progressio',
        kielletyt: ['Kontaktitilanteet', 'Nordic curl ennen 8 vk ACL:stä'],
        harjoitteet: ['EX_TKE', 'EX_STEP_DOWN_ECC', 'EX_WALL_SQUAT_ISO', 'EX_LONKKA',
                      'EX_KYYKKY', 'EX_BRIDGE_BILATERAL', 'EX_COPENHAGEN_REG'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (6 vk+, ACL 6 kk+)',
        periaate: 'Voima, plyometriikka, lajinomainen liike. ACL: hop-testit ennen paluuta',
        kielletyt: ['ACL: ei paluuta alle 9 kk leikkauksesta'],
        harjoitteet: ['EX_RDL_SINGLE_LEG', 'EX_BULGARIAN_SPLIT', 'EX_NORDIC',
                      'EX_CMJ', 'EX_PLYO', 'EX_LAHTO'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Kivuton käveleminen, juoksu, suunnanmuutos',
      'Kyykky täydelle syvyydelle kivuttomasti',
      'Quadriceps-voima 90%+ verrattuna terveeseen puoleen (dynamometri)',
      'Yksijalkahyppy 90%+ symmetria (hop tests) — ACL-paluu',
      'Osgood: kivuton hyppy ja juoksu rasituksessa'
    ],
    phv_huomio: 'Kasvuikäisillä Osgood-Schlatter on yleinen. PHV-huipussa quadriceps-jänteen kuormitus kasvaa — huomioi plyometrian lisäyksessä.'
  },

  Reisi: {
    fasialinja: 'SBL (takareiden) + SFL (etureiden)',
    ketju: 'taka',
    ketju2: null,
    tyypilliset_vammat: ['Takareiden lihaskuiturepeämä (hamstring)', 'Etureiden (quadriceps) revähdys', 'Lihaskouristus'],
    aikataulut: {
      liev:  { min_pv: 5,  max_pv: 14, kuvaus: '< 10% lihaskuituvaurio — 1–2 vk rajoitettu' },
      keski: { min_pv: 14, max_pv: 28, kuvaus: '10–50% — 2–4 vk' },
      vak:   { min_pv: 28, max_pv: 90, kuvaus: '> 50% tai täydellinen — 4–12 vk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'EI VENYTTELYÄ. Lepo, jää, kompressio. Kipuohjattu isometrinen aktivaatio.',
        kielletyt: ['Venyttely', 'Lämpöhoito', 'Hieronta ensimmäisten 48h aikana', 'Sprinttäminen'],
        harjoitteet: ['EX_ISOMETRIC'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (4–14 pv)',
        periaate: 'Eksentrinen vahvistus, progressiivinen kuormitus. Nordic alku regressiolla.',
        kielletyt: ['Täysi sprintti', 'Maksimaalinen venyttely'],
        harjoitteet: ['EX_NORDIC_HS_REGRESSION', 'EX_LONKKA', 'EX_RDL_SINGLE_LEG', 'EX_BRIDGE_BILATERAL'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (14 pv+)',
        periaate: 'Täysi eksentrinen vahvistus, räjähtävä harjoittelu. Nordic curl kun kivuton.',
        kielletyt: [],
        harjoitteet: ['EX_NORDIC', 'EX_NORDIC_FULL', 'EX_LAHTO', 'EX_RUN_RETURN_PROGRESS'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'EX_NORDIC kivuton 3 sarjaa',
      'Painokipu painettaessa (palpation) poissa',
      'Jogging kivuton',
      'Maksimaalinen sprintti 90%+ nopeudella kivuton'
    ],
    phv_huomio: 'PHV-vaiheessa reisiluun kasvu nopeampaa kuin hamstring-jänteen venyvyys kehittyy. Kasvupyrähdyksen aikana hamstring-riskit kasvavat — ehkäisevä Nordic curl-ohjelma suositeltava.'
  },

  Pohje: {
    fasialinja: 'SBL',
    ketju: 'taka',
    ketju2: null,
    tyypilliset_vammat: ['Gastrocnemius-repeämä', 'Soleus-repeämä', 'Akillesjänteen osittainen repeämä', 'Achilles-tendinopathy'],
    aikataulut: {
      liev:  { min_pv: 7,  max_pv: 21, kuvaus: 'Lievä pohjelihas — 1–3 vk' },
      keski: { min_pv: 21, max_pv: 42, kuvaus: 'Kohtalainen — 3–6 vk' },
      vak:   { min_pv: 42, max_pv: 180, kuvaus: 'Vakava akillesvamma — 6 vk–6 kk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'Kohoasento, jää, kompressio. EI varpaille nousua. EI lämpöä.',
        kielletyt: ['Varpaille nousu', 'Juokseminen', 'Hyppääminen', 'Lämpöhoito'],
        harjoitteet: ['EX_ANKLE_MOB', 'EX_CALF_ISO_SEATED', 'EX_ISOMETRIC'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (4–21 pv)',
        periaate: 'Eksentrinen pohjeharjoittelu (Alfredson). Progressiivinen painokuormitus.',
        kielletyt: ['Lyhyt kontaktiaika (hyppysarjat)', 'Täysi sprintti'],
        harjoitteet: ['EX_CALF_RAISE', 'EX_CALF_ECCENTRIC_STEP', 'EX_BALANCE_SL_STABLE'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (21 pv+)',
        periaate: 'Juoksupalautuminen, räjähtävyys, lajinomaisuus. Akilles: plyometria vasta täysin kivuttomana.',
        kielletyt: [],
        harjoitteet: ['EX_LAHTO', 'EX_PLYO', 'EX_RUN_RETURN_PROGRESS'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Kipuvapaata kivuton kaksoispohjenousu 25 toistoa × 3 sarjaa',
      'Yksijalkavarpaille nousu 15 toistoa kivuton',
      'Jogging 20 min kivuton',
      'Suunnanmuutokset kivuttomia'
    ],
    phv_huomio: 'Akillesjänteen tendiniitti on harvinainen lapsilla. PHV:ssä Sever\'s disease (kantapäänkiristys) on yleinen — ei vaadi pitkää lepoa, kipuohjattu progressio.'
  },

  Lonkka: {
    fasialinja: 'DFL + SFL + LL',
    ketju: 'syva',
    ketju2: 'etu',
    tyypilliset_vammat: ['Lonkan koukistajan (psoas) revähdys', 'Nivuslihaksen revähdys (adduktori)', 'Hip impingement (FAI)', 'Kasvuikäisten apofyysivamma'],
    aikataulut: {
      liev:  { min_pv: 5,  max_pv: 14, kuvaus: 'Lievä lihasrevähdys — 1–2 vk' },
      keski: { min_pv: 14, max_pv: 42, kuvaus: 'Kohtalainen — 2–6 vk' },
      vak:   { min_pv: 42, max_pv: 90, kuvaus: 'Vakava / apofyysivamma — 6–12 vk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'Lepo, kivuton liike. EI venyttelyä koukistajaan akuuttivaiheessa.',
        kielletyt: ['Lonkan koukistajan venyttely', 'Sprinttäminen', 'Potkaisu'],
        harjoitteet: ['EX_HIP_MOB', 'EX_ISOMETRIC', 'EX_ANKLE_MOB'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (4–14 pv)',
        periaate: 'Lonkan stabilisaatio, syvät lihakset. Copenhagen adduktoreille.',
        kielletyt: ['Maksimaalinen laukaus', 'Täysi suunnanmuutos'],
        harjoitteet: ['EX_LONKKA', 'EX_COPENHAGEN_REG', 'EX_HIP_FLEXOR_STRETCH',
                      'EX_BRIDGE_SINGLE', 'EX_CLAMSHELL'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (14 pv+)',
        periaate: 'Voimaharjoittelu, räjähtävyys, laukausspesifinen harjoittelu.',
        kielletyt: [],
        harjoitteet: ['EX_COPENHAGEN_FULL', 'EX_RDL_SINGLE_LEG', 'EX_LAHTO', 'EX_LAUKAUS'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Kivuton kävely ja hölkkä',
      'Lonkan lähentäjävoima 90%+ symmetria',
      'Laukaus kivuton täydellä voimalla',
      'Suunnanmuutokset kivuttomia'
    ],
    phv_huomio: 'Kasvuikäisillä apofyysivamma (luisen kiinnityskohdan irtoaminen) on vakava vamma joka voi naamioitua lihaskipuna. Jos lonkkaluun alueella äkillinen terävä kipu hyppäämisen tai potkaisemisen yhteydessä → kuvantaminen kiireellisesti.'
  },

  Selkä: {
    fasialinja: 'SBL + DFL',
    ketju: 'syva',
    ketju2: 'taka',
    tyypilliset_vammat: ['Lihasperäinen selkäkipu', 'Spondylolyysi (kasvuikäisillä)', 'Välilevytyrä (harvinainen lapsilla)'],
    aikataulut: {
      liev:  { min_pv: 3,  max_pv: 14, kuvaus: 'Lihaskipu — 3–14 pv' },
      keski: { min_pv: 14, max_pv: 42, kuvaus: 'Spondylolyysi / rakenteellinen — 2–6 vk' },
      vak:   { min_pv: 42, max_pv: 120, kuvaus: 'Rasitusmurtuma / vakava — 6–16 vk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'Aktiivinen lepo. EI pakkovoimakkaat kiertoliikkeet. Kipuohjattu liike.',
        kielletyt: ['Taivutus-kierto yhdistelmä', 'Raskas nosto', 'Hypyt'],
        harjoitteet: ['EX_CORE_MOB', 'EX_HIP_MOB', 'EX_ISOMETRIC'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (4–14 pv)',
        periaate: 'McGill Big 3, syvälihasaktivaaatio. Neutraali selkäranka kaikissa liikkeissä.',
        kielletyt: ['Kiertoliikkeet raskaalla kuormalla'],
        harjoitteet: ['EX_PLANK', 'EX_BIRD_DOG', 'EX_MCGILL_BIG3', 'EX_DEAD_BUG'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (14 pv+)',
        periaate: 'Toiminnallinen vahvistus, rotaatioharjoittelu, lajinomainen liike.',
        kielletyt: [],
        harjoitteet: ['EX_MED_HEITTO', 'EX_ROT_SYOTTO', 'EX_LAHTO', 'EX_LAUKAUS'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Kivuton kävely, hölkkä, suunnanmuutos',
      'Laukaus kivuton täydellä kierrolla',
      'Rotaatioharjoittelu kivuton',
      'Spondylolyysi: kuvantaminen ennen paluuta'
    ],
    phv_huomio: 'PHV-vaiheessa selkäranka on alttein rasitusmurtumille (spondylolyysi). Jos L5-alueen kipu yhdistyy taaksetaivutukseen → välitön lääkärikonsultaatio. Älä anna jatkaa harjoittelua kivun kanssa.'
  },

  Olkapää: {
    fasialinja: 'FL (Functional Line) + SFL',
    ketju: 'kierto',
    ketju2: null,
    tyypilliset_vammat: ['Rotator cuff -tulehdus', 'AC-nivelen nyrjähdys', 'Instabiliteetti (kasvuikäisillä)', 'Heittäjän olkapää'],
    aikataulut: {
      liev:  { min_pv: 7,  max_pv: 21, kuvaus: 'Tulehdus / lievä nyrjähdys — 1–3 vk' },
      keski: { min_pv: 21, max_pv: 56, kuvaus: 'Rotator cuff / AC — 3–8 vk' },
      vak:   { min_pv: 56, max_pv: 180, kuvaus: 'Instabiliteetti / leikkaus — 8–24 vk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–72 h)',
        periaate: 'Lepo, kipu alas. EI heittoliikkeitä. Kipuohjattu liikkuvuus.',
        kielletyt: ['Heittoliikkeet', 'Pään yläpuolinen kuormitus', 'Puristusharjoitteet'],
        harjoitteet: ['EX_HIP_MOB', 'EX_ISOMETRIC'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (1–4 vk)',
        periaate: 'Rotator cuff -harjoittelu, liikelaajuus, skapulaarinen stabiilius.',
        kielletyt: ['Heittoliikkeet täydellä voimalla'],
        harjoitteet: ['EX_SHOULDER_ROT', 'EX_FACE_PULL', 'EX_SHOULDER_ER', 'EX_INVERTED_ROW'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (4 vk+)',
        periaate: 'Heittovoimaharjoittelu, laukausspesifinen harjoittelu, lajinomainen progressio.',
        kielletyt: [],
        harjoitteet: ['EX_MED_HEITTO', 'EX_ROT_SYOTTO', 'EX_LAUKAUS'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Täysi kivuton liikelaajuus (flexio, abduktio, kierto)',
      'Rotator cuff -voima 90%+ symmetria',
      'Medicinepallo heitto kivuton täydellä liikkeellä',
      'Laukaus kivuton progressiivisessa voimassa'
    ],
    phv_huomio: 'Kasvuikäisillä avulsiomurtuma (luisen kiinnityskohdan irtoaminen) on mahdollinen äkillisissä heittoliikkeissä. Olkapäänkiristys PHV-kasvussa normaalia — lonkan koukistajien kaltainen ilmiö.'
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// VERSIO JA METATIEDOT
// ═══════════════════════════════════════════════════════════════════════════
var HPP_REHAB_META = {
  versio: '1.0',
  paivitetty: '2026-03-19',
  paivittaja: 'TalentMaster / HPP ELITE',
  harjoitteita: Object.keys(HPP_EXERCISES).length,
  protokollia: Object.keys(HPP_REHAB_PROTOKOLLAT).length,
  lahteet: [
    'Myers TW (2001) Anatomy Trains',
    'McGill S (2007) Low Back Disorders',
    'Alfredson H (1998) Heavy load eccentric calf training',
    'HPP ELITE v9 harjoitekirjasto (Excel, 53 harjoitetta)',
    'Palloliiton Huuhkajapolku-testistö 2024'
  ]
};

// Tee protokollat saataville globaalisti (käytettävissä TalentMasterissa)


// ═══════════════════════════════════════════════════════════════════════════
// LAAJENNETUT PROTOKOLLAT — HPP ELITE v9 03_VAMMAKIRJASTO (rivit 40–64)
// ═══════════════════════════════════════════════════════════════════════════
// Nämä protokollat perustuvat suoraan HPP ELITE v9 Excel-tiedoston
// vammakirjastoon. ACL on eriytetty kahteen protokollaan koska akuutti
// vamma ja leikkauksen jälkeinen kuntoutus ovat täysin eri ohjelmat.

var HPP_REHAB_LAAJENNETUT = {

  // ── ACL (kaksi erillistä protokollaa) ──────────────────────────────────
  // Lähde: HPP ELITE v9, rivi 40 (akuutti) ja rivi 41 (leikkauksen jälkeen)

  ACL_akuutti: {
    nimi: 'ACL-vamma (eturistisiteen repeämä)',
    fasialinja: 'SBL + SFL + DFL',
    ketju: 'taka',
    ketju2: 'syva',
    huomio: 'KRIITTINEN: ACL-vammassa ei pidä painostaa leikkauspäätöstä heti. Konservatiivinen hoito on mahdollinen erityisesti nuorilla. Lääkärikonsultaatio välittömästi.',
    phv_huomio: 'Kasvuikäisillä ACL-leikkauksen sijaan suositaan konservatiivista hoitoa kasvulevyjen suojelemiseksi. Konsultoi lastenlääkäriä tai ortopedia ennen leikkauspäätöstä.',
    aikataulut: {
      vak: { min_pv: 0, max_pv: 14, kuvaus: 'Akuuttivaihe — turvotuksen hallinta, liikelaajuuden palautus ennen mahdollista leikkausta' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–2 vk ennen leikkauspäätöstä)',
        periaate: 'RICE + quadriceps-aktivointi. Tavoite: polvi suoraksi, turvotus alas, kävely ilman ontumista ENNEN leikkausta. Leikkaus tehdään vasta kun polvi on "cool" — ei akuutisti turvonnut.',
        kielletyt: ['Pivot-liikkeet', 'Juokseminen', 'Hypyt', 'Kontaktitilanteet'],
        harjoitteet: ['EX_QUAD_SET', 'EX_SLR', 'EX_ANKLE_MOB', 'EX_WALL_SQUAT_ISO'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Pre-op (2–6 vk) — "prehabilitation"',
        periaate: 'Prehabilitaatio ennen leikkausta parantaa tuloksia merkittävästi. Tavoite: täysi liikelaajuus, normaali kävely, lihasvoima lähes symmetrinen. Leikkaus siirretään kunnes nämä täyttyvät.',
        kielletyt: ['Kiertoliikkeet', 'Hyppääminen'],
        harjoitteet: ['EX_TKE', 'EX_WALL_SQUAT_ISO', 'EX_LONKKA', 'EX_BALANCE_SL_STABLE'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Konservatiivinen kuntoutus (jos ei leikkausta)',
        periaate: 'Neuromuskulaarinen harjoittelu, quadriceps- ja hamstring-voima, proprioseptiikka. Stabiliteetti ilman sidevaurion korjausta.',
        kielletyt: [],
        harjoitteet: ['EX_NORDIC', 'EX_RDL_SINGLE_LEG', 'EX_LATERAL', 'EX_BALANCE_SL_STABLE'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Lääkärin lupa paluuseen (aina ACL:ssä)',
      'Täysi kivuton liikelaajuus',
      'Kävely ilman ontumista',
      'Konservatiivinen: hop-testit 90%+ symmetria'
    ]
  },

  ACL_leikkaus: {
    nimi: 'ACL — leikkauksen jälkeinen kuntoutus (9–12 kk)',
    fasialinja: 'SBL + SFL + DFL',
    ketju: 'taka',
    ketju2: 'syva',
    huomio: 'PITKÄ PROSESSI: ACL-leikkauksen jälkeen return-to-sport on aikaisintaan 9 kuukautta. Ennenaikainen paluu on merkittävin uusintavamman riskitekijä. Ei oikoteitä.',
    phv_huomio: 'Kasvuikäisillä käytetään kasvulevyt säästäviä tekniikoita. Kuntoutusaikataulu on sama tai pidempi kuin aikuisilla. PHV-vaihe voi muuttaa aikataulua.',
    aikataulut: {
      vak: { min_pv: 270, max_pv: 365, kuvaus: 'Leikkauksen jälkeinen kuntoutus — return-to-sport aikaisintaan 9 kk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Vaihe 1: Akuutti (0–6 vk leikkauksesta)',
        periaate: 'Turvotuksen hallinta, täysi ojentuminen prioriteetti, koukistuminen progressiivisesti. Quadriceps-aktivointi HETI. Kävely ilman kyynärsauvoja 2–4 vk.',
        kielletyt: ['Kyykky alle 90°', 'Hypyt', 'Juokseminen', 'Pivot-liikkeet'],
        harjoitteet: ['EX_QUAD_SET', 'EX_SLR', 'EX_TKE', 'EX_ANKLE_MOB'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Vaihe 2–3: Vahvistus (6 vk–4 kk)',
        periaate: 'Progressiivinen voimaharjoittelu. Pyörä 8 vk, juoksu 12–16 vk. Uiminen 6 vk. Nordic curl vasta 4–6 kk. Quadriceps/hamstring-suhde seurattava.',
        kielletyt: ['Nordic curl ennen 16 vk', 'Pivot-liikkeet ennen 4 kk', 'Kontaktitilanteet'],
        harjoitteet: ['EX_WALL_SQUAT_ISO', 'EX_LONKKA', 'EX_STEP_DOWN_ECC', 'EX_RDL_SINGLE_LEG', 'EX_BALANCE_SL_STABLE'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Vaihe 4–5: Return-to-Sport (4–9 kk)',
        periaate: 'Plyometriikka 4 kk, juoksu 4–5 kk, sprintti 5–6 kk. Kontaktiharjoittelu 6–7 kk. Return-to-play 9 kk VAIN jos hop-testit 90%+ JA psykologinen valmius.',
        kielletyt: ['Täysi peli ennen 9 kk'],
        harjoitteet: ['EX_NORDIC', 'EX_NORDIC_FULL', 'EX_CMJ', 'EX_PLYO', 'EX_LAHTO', 'EX_LATERAL'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Vähintään 9 kuukautta leikkauksesta',
      'Quadriceps-voima 90%+ symmetria (dynamometri)',
      'Hamstring/quadriceps-suhde ≥ 0.6',
      'Hop-testien nelikko (single hop, triple hop, crossover hop, 6m timed) 90%+ symmetria',
      'Psykologinen valmius (ACL-RSI pisteet ≥ 65)',
      'Lääkärin kirjallinen lupa'
    ]
  },

  // ── Meniskivamma ─────────────────────────────────────────────────────────
  Meniskivamma: {
    nimi: 'Meniskivamma (polven kierukkavamma)',
    fasialinja: 'SBL + SFL',
    ketju: 'taka',
    ketju2: 'syva',
    huomio: 'Meniskit ovat polven "iskunvaimentimet". Osittainen repeämä voi parantua konservatiivisesti. Täydellinen repeämä tai "bucket handle" vaatii usein leikkauksen.',
    phv_huomio: 'Kasvuikäisillä lateraalinen diskoidinen menisci on anatominen variantti — ei vamma. Medialinen menisci repeämä on harvinainen lapsilla mutta mahdollinen.',
    aikataulut: {
      liev:  { min_pv: 14, max_pv: 42,  kuvaus: 'Konservatiivinen hoito — 2–6 vk' },
      keski: { min_pv: 42, max_pv: 90,  kuvaus: 'Kirurginen (ompelu) — 6–12 vk' },
      vak:   { min_pv: 28, max_pv: 56,  kuvaus: 'Kirurginen (osittainen poisto) — 4–8 vk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti (0–2 vk)',
        periaate: 'Kuormituksen vähennys, turvotuksen hallinta. Täysi liikelaajuus progressiivisesti. Polven napsahtelu tai lukittuminen → lääkäriin kiireellisesti.',
        kielletyt: ['Täysi kyykky', 'Kiertokuormitus', 'Juokseminen'],
        harjoitteet: ['EX_QUAD_SET', 'EX_SLR', 'EX_TKE', 'EX_WALL_SQUAT_ISO'],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti (2–8 vk)',
        periaate: 'Quadriceps-voima, polven stabiliteetti. Kyykky progressiivisesti — ei täyteen syvyyteen ennen kuin kivuton.',
        kielletyt: ['Täysi kyykky alle 90°', 'Kiertoliikkeet täydellä kuormalla'],
        harjoitteet: ['EX_STEP_DOWN_ECC', 'EX_LONKKA', 'EX_KYYKKY', 'EX_BALANCE_SL_STABLE'],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Return-to-Sport (8 vk+)',
        periaate: 'Täysi kuormitus progressiivisesti. Plyometriikka kun täysi kyykky on kivuton.',
        kielletyt: [],
        harjoitteet: ['EX_BULGARIAN_SPLIT', 'EX_CMJ', 'EX_LAHTO', 'EX_LATERAL'],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Täysi kyykky kivuton',
      'Kävely ja juoksu kivuton',
      'Quadriceps-voima symmetrinen',
      'Kiertoliike kivuton'
    ]
  },

  // ── Aivotärähdys (return-to-play) ────────────────────────────────────────
  Aivotarahdys: {
    nimi: 'Aivotärähdys (return-to-play)',
    fasialinja: 'Ei fasialinjaa — neurologinen vamma',
    ketju: null,
    ketju2: null,
    huomio: 'KRIITTINEN TURVALLISUUSASIA: Aivotärähdyksen jälkeen ei koskaan palata samaan peliin tai harjoitukseen. Oireettomana voi aloittaa palautumisportaat — ei ennen täyttä oireettomuutta.',
    phv_huomio: 'Kasvuikäisillä aivotärähdys paranee hitaammin kuin aikuisilla. Koulussa voi olla oppimisvaikeuksia aivotärähdyksen aikana — tiedota opettajia.',
    aikataulut: {
      liev:  { min_pv: 7,  max_pv: 21,  kuvaus: 'Lievä (oireet <1 vk) — return-to-play 7–14 pv' },
      keski: { min_pv: 14, max_pv: 42,  kuvaus: 'Kohtalainen (oireet 1–4 vk) — 2–6 vk' },
      vak:   { min_pv: 42, max_pv: 180, kuvaus: 'Post-concussion syndrooma — 6 vk–6 kk' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Vaihe 1–2: Lepo ja kognitiivinen palautuminen',
        periaate: 'Täydellinen lepo 24–48h. Sen jälkeen kevyt aerobinen aktiviteetti (kävely) jos oireeton. EI ruudunkatselua, pelejä, meluisia ympäristöjä ennen oireettomuutta.',
        kielletyt: ['Kontaktitilanteet', 'Harjoittelu', 'Ruutuaika', 'Meluisa ympäristö'],
        harjoitteet: [],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Vaihe 3–4: Portaittainen palautuminen',
        periaate: 'GRTP-protokolla (Graduated Return to Play): Vaihe 3 = kevyt aerobinen ilman kontaktia. Vaihe 4 = lajinomainen harjoittelu ilman kontaktia. 24h oireettomana per porras.',
        kielletyt: ['Kontaktitilanteet', 'Hypyt ennen oireettomuutta'],
        harjoitteet: [],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Vaihe 5–6: Täysi palautuminen',
        periaate: 'Vaihe 5 = kontaktiharjoittelu luvalla. Vaihe 6 = täysi palautuminen peliin. Lääkärin lupa AINA ennen kontaktiharjoittelua.',
        kielletyt: [],
        harjoitteet: [],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      '24h oireeton per porras — EI oikotietä',
      'Lääkärin kirjallinen lupa ennen kontaktiharjoittelua',
      'Kognitiiviset testit (ImPACT/SCAT5) normaalitasolla',
      'Koulumenestys palautunut normaalitasolle'
    ]
  },

  // ── RED-S (Suhteellinen energiavaje) ─────────────────────────────────────
  REDS: {
    nimi: 'RED-S — Relative Energy Deficiency in Sport',
    fasialinja: 'Systeeminen — kaikki fasialinjat',
    ketju: null,
    ketju2: null,
    huomio: 'KRIITTINEN erityisesti tyttöpelaajilla: RED-S tarkoittaa, että pelaaja syö vähemmän kuin mitä harjoittelu kuluttaa. Oireet: väsymys, stressimurtumat, kuukautishäiriöt, heikentynyt palautuminen. Vaatii ravitsemusterapeutin.',
    phv_huomio: 'Kasvupyrähdyksessä energiantarve kasvaa merkittävästi. Kilpailupaine + kasvu + riittämätön ravitsemus = korkea RED-S-riski. Tarkkaile erityisesti tyttöpelaajia 12–16v.',
    aikataulut: {
      liev:  { min_pv: 14, max_pv: 42,  kuvaus: 'Lievä — ravitsemusterapia, 2–6 vk' },
      vak:   { min_pv: 42, max_pv: 365, kuvaus: 'Vakava (luuntiheys, sydän) — lääkäri, kuukausia' }
    },
    rehab: {
      akuutti: {
        vaihe: 'Akuutti: Energiatasapainon korjaus',
        periaate: 'Ravitsemusterapeutti HETI. Harjoittelumäärää vähennetään kunnes energiatasapaino korjattu. EI liikunnallista rangaistusta — se pahentaa tilannetta.',
        kielletyt: ['Lisäkuormitus', 'Harjoittelumäärän kasvatus'],
        harjoitteet: [],
        hpp_phase: 'Acute'
      },
      subakuutti: {
        vaihe: 'Subakuutti: Ohjattu palautuminen',
        periaate: 'Progressiivinen harjoittelun palautuminen ravitsemusterapeutin seurannassa. Harjoittelupäiväkirja + ruokapäiväkirja yhdistettynä.',
        kielletyt: ['Paastopäivät', 'Intensiivinen harjoittelu ilman ravitsemussuunnitelmaa'],
        harjoitteet: [],
        hpp_phase: 'Subacute'
      },
      krooninen: {
        vaihe: 'Krooninen: Kestävä energiatasapaino',
        periaate: 'Seuranta koko kauden ajan. RPE-seuranta erityisen tärkeä — korkea RPE pienellä kuormalla on RED-S-signaali.',
        kielletyt: [],
        harjoitteet: [],
        hpp_phase: 'Chronic'
      }
    },
    paluu_kriteerit: [
      'Ravitsemusterapeutin hyväksyntä',
      'Kuukautiskierto palautunut (tytöt)',
      'Luuntiheys normaalitasolla (jos mitattu)',
      'RPE vastaa kuormitusta'
    ]
  }
};

// Yhdistä laajennetut protokollat pääkirjastoon
Object.assign(HPP_REHAB_PROTOKOLLAT, HPP_REHAB_LAAJENNETUT);

// Päivitä metatieto
HPP_REHAB_META.versio = '1.1';
HPP_REHAB_META.paivitetty = '2026-03-19';
HPP_REHAB_META.protokollia = Object.keys(HPP_REHAB_PROTOKOLLAT).length;
HPP_REHAB_META.huomio = 'v1.1: Lisätty ACL (erikseen akuutti + leikkauksen jälkeinen), meniskivamma, aivotärähdys (GRTP), RED-S. Lähde: HPP ELITE v9 / 03_VAMMAKIRJASTO.';

if (typeof window !== 'undefined') {
  window.HPP_REHAB_PROTOKOLLAT = HPP_REHAB_PROTOKOLLAT;
  window.HPP_REHAB_META = HPP_REHAB_META;
}


// ═══════════════════════════════════════════════════════════════════════════
// HPP_REHAB_PROTOKOLLAT_EXCEL — HPP ELITE v9 klinikka-DB laajennus
// Lähde: 09_KLINIKKA_DB-välilehti, 13 oirekuvaa × 3 vaihetta
// Lisätty automaattisesti — älä muokkaa käsin
// ═══════════════════════════════════════════════════════════════════════════

var HPP_REHAB_PROTOKOLLAT_EXCEL = {

  Osgood_Schlatter: {
    "nimi": "Osgood-Schlatter",
    "fasialinja": "LL",
    "kategoria": "Polvikipu",
    "phv_huomio": "🔴 KRIITTINEN — kasvulevyt auki. PHV-kasvupyrähdyksessä jänne-luuliitos herkimmillään.",
    "aikataulut": {
        "liev": "2–4vk",
        "keski": "4–8vk",
        "vak": "8–16vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: kuorma 0%. Ei hyppyjä, ei juoksua",
            "kielletyt": [],
            "harjoite": "Eksentrinen quad step-down korokkeelta — 3×10 toistoa (Max 3/10 kipua)",
            "hpp_phase": "Acute"
        },
        "krooninen": {
            "vaihe": "Return-to-Sport",
            "periaate": "Krooninen: progressiivinen voima",
            "kielletyt": [],
            "harjoite": "Hyppynaruhyppy progressio — 2×30 sek (Max 2/10 kipua)",
            "hpp_phase": "Chronic"
        }
    },
    "paluu_kriteerit": [
        "Kivuton hyppy ja juoksu",
        "Ei kipua tuberositas tibiaan painettaessa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Penikkatauti: {
    "nimi": "Penikkatauti",
    "fasialinja": "SBL",
    "kategoria": "Muu",
    "phv_huomio": "⚠️ PHV+: nopea kasvuvaihe lisää SBL-kuormaa. Alaraajan pituuskasvu kiristää koko takaketjun.",
    "aikataulut": {
        "liev": "3–7pv",
        "keski": "2–4vk",
        "vak": "4–8vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: lepoa + kylmä + kompressio",
            "kielletyt": [],
            "harjoite": "Eksentrinen pohjelasku korokkeella — 3×15 toistoa (Lievä kipu ok (max 4/10))",
            "hpp_phase": "Acute"
        },
        "krooninen": {
            "vaihe": "Return-to-Sport",
            "periaate": "Krooninen: juoksuprogressio vasta kivuton",
            "kielletyt": [],
            "harjoite": "Nordic hamstring + pohje eksentrinen — 3×5-8 toistoa (Lihasten polte ok)",
            "hpp_phase": "Chronic"
        }
    },
    "paluu_kriteerit": [
        "Kivuton juoksu suoralla",
        "Eksentrinen pohjelasku 15 toistoa kivuttomasti"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Epäspesifi_polvikipu: {
    "nimi": "Epäspesifi polvikipu",
    "fasialinja": "LL",
    "kategoria": "Polvikipu",
    "phv_huomio": "⚠️ Polven valgus nuorilla = DFL + LL yhteisheikkous. Tarkista lantion hallinta.",
    "aikataulut": {
        "liev": "3–14pv",
        "keski": "2–6vk",
        "vak": "4–12vk"
    },
    "rehab": {},
    "paluu_kriteerit": [
        "Kivuton harjoittelu",
        "Fysioterapeutin lupa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Alaselkäkipu__akuutti: {
    "nimi": "Alaselkäkipu (akuutti)",
    "fasialinja": "DFL",
    "kategoria": "Selkä",
    "phv_huomio": "⚠️ Hengitys AINA ENSIN. PHV: nopea kasvuvaihe + istumakoulu = DFL heikkous.",
    "aikataulut": {
        "liev": "3–7pv",
        "keski": "1–3vk",
        "vak": "2–8vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: VAIN hengitysharjoitteet + kevyt mobil",
            "kielletyt": [],
            "harjoite": "Dead bug regressio — 3×8 toistoa/puoli (Kivuton)",
            "hpp_phase": "Acute"
        },
        "krooninen": {
            "vaihe": "Return-to-Sport",
            "periaate": "Krooninen: McGill Big 3",
            "kielletyt": [],
            "harjoite": "McGill Big 3 (bird dog + sivulankku + modified crunch) — 3×10 toistoa/puoli (Kivuton)",
            "hpp_phase": "Chronic"
        }
    },
    "paluu_kriteerit": [
        "Kivuton harjoittelu",
        "Fysioterapeutin lupa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Lihaskireydet__hamstring: {
    "nimi": "Lihaskireydet (hamstring)",
    "fasialinja": "SBL",
    "kategoria": "Alaraaja",
    "phv_huomio": "⚠️ PHV: femurin kasvu → hamstring-pituus jää jälkeen. Neuraalinen komponentti usein mukana.",
    "aikataulut": {
        "liev": "3–7pv",
        "keski": "1–2vk",
        "vak": "2–4vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: EI venytystä — lisää mikrovaurioita",
            "kielletyt": [],
            "harjoite": "SLR-flossing kuminauhalla — 3×10 toistoa/jalka (Lievä venytys ok)",
            "hpp_phase": "Acute"
        },
        "krooninen": {
            "vaihe": "Return-to-Sport",
            "periaate": "Krooninen: Nordic + progressiivinen",
            "kielletyt": [],
            "harjoite": "Nordic hamstring täysi — 3×5-8 toistoa (Lihasten polte)",
            "hpp_phase": "Chronic"
        }
    },
    "paluu_kriteerit": [
        "Nordic kivuton 3 sarjaa",
        "Jogging kivuton"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Lihaskireydet__lonkka_vasikka: {
    "nimi": "Lihaskireydet (lonkka/vasikka)",
    "fasialinja": "SFL",
    "kategoria": "Lonkka/Nivus",
    "phv_huomio": "⚠️ PHV: femurin kasvu → hip flexor lyhentyminen. Iliopsoas kireys = DFL heikkous.",
    "aikataulut": {
        "liev": "3–14pv",
        "keski": "2–6vk",
        "vak": "4–12vk"
    },
    "rehab": {},
    "paluu_kriteerit": [
        "Kivuton harjoittelu",
        "Fysioterapeutin lupa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Patellofemoraalinen_kipu: {
    "nimi": "Patellofemoraalinen kipu",
    "fasialinja": "LL",
    "kategoria": "Polvikipu",
    "phv_huomio": "⚠️ Klassinen PHV-kipu. Femurin kasvu → VMO jää jälkeen → patellan lateralisoituminen.",
    "aikataulut": {
        "liev": "1–2vk",
        "keski": "3–6vk",
        "vak": "6–12vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: kompressio pois, isometriat ok",
            "kielletyt": [],
            "harjoite": "Clamshell + lateral walk + single leg squat — 3×15 toistoa/puoli (Lihasten polte)",
            "hpp_phase": "Acute"
        },
        "krooninen": {
            "vaihe": "Return-to-Sport",
            "periaate": "Krooninen: koko alaraajaketju",
            "kielletyt": [],
            "harjoite": "Bulgarian split squat VMO-linjaus — 3×8-10 toistoa/jalka (Kivuton)",
            "hpp_phase": "Chronic"
        }
    },
    "paluu_kriteerit": [
        "YJ-kyykky kivuton",
        "Hyppy ja lasku kivuton"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Akillesjänteen_tendinopatia: {
    "nimi": "Akillesjänteen tendinopatia",
    "fasialinja": "SBL",
    "kategoria": "Muu",
    "phv_huomio": "⚠️ Reaktiivinen vs. degeneratiivinen — eri protokolla. Kompressio pahentaa reaktiivista.",
    "aikataulut": {
        "liev": "2–4vk",
        "keski": "4–8vk",
        "vak": "3–6kk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti/Reaktiivinen: isometrinen kuorma",
            "kielletyt": [],
            "harjoite": "Eksentrinen pohjelasku korokkeelta progressio — 3×15 toistoa (Lievä kipu ok (max 3/10))",
            "hpp_phase": "Acute"
        }
    },
    "paluu_kriteerit": [
        "Isometrinen pohjelasku kivuton",
        "Yksijalkahyppy 80%+ symmetria"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Nilkan_nyrjähdys__lateraalinen: {
    "nimi": "Nilkan nyrjähdys (lateraalinen)",
    "fasialinja": "LL",
    "kategoria": "Muu",
    "phv_huomio": "⚠️ Toistuvat nyrjähdykset = LL + SL yhteisheikkous. Neuraalinen uudelleenohjelmointi tärkeä.",
    "aikataulut": {
        "liev": "3–7pv",
        "keski": "1–3vk",
        "vak": "3–12vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: RICE + peroneus-isometrinen",
            "kielletyt": [],
            "harjoite": "Single leg balance + lateral hop reaktiivinen — 3×30 sek/jalka (Lihasten polte + tasapaino)",
            "hpp_phase": "Acute"
        }
    },
    "paluu_kriteerit": [
        "YJ-tasapaino 30s silmät kiinni",
        "Yksijalkahyppy 80%+ symmetria"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Nivuskipu___adduktori: {
    "nimi": "Nivuskipu / adduktori",
    "fasialinja": "DFL",
    "kategoria": "Lonkka/Nivus",
    "phv_huomio": "⚠️ Jalkapalloilijoilla yleinen. DFL: iliopsoas + lantionpohja + adduktori yhteisheikkous.",
    "aikataulut": {
        "liev": "1–2vk",
        "keski": "3–6vk",
        "vak": "6–12vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: lepoa + isometrinen adduktori",
            "kielletyt": [],
            "harjoite": "Copenhagen plank progressio — 3×20-30 sek (Lihasten polte)",
            "hpp_phase": "Acute"
        }
    },
    "paluu_kriteerit": [
        "Copenhagen plank kivuton",
        "Sivuaskel ja potku kivuton"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  IT_band_syndrooma__ITBS: {
    "nimi": "IT-band-syndrooma (ITBS)",
    "fasialinja": "LL",
    "kategoria": "Alaraaja",
    "phv_huomio": "⚠️ Ylikuormitusvamma juoksijoilla + jalkapalloilijoilla. TFL-lihas syynä — EI IT-band itse.",
    "aikataulut": {
        "liev": "1–2vk",
        "keski": "2–4vk",
        "vak": "4–8vk"
    },
    "rehab": {
        "akuutti": {
            "vaihe": "Akuutti (0–72h)",
            "periaate": "Akuutti: kuorma pois + TFL käsittely",
            "kielletyt": [],
            "harjoite": "TFL myofaskiaalinen vapautus — 2×2 min/puoli (Kivuton)",
            "hpp_phase": "Acute"
        }
    },
    "paluu_kriteerit": [
        "Juoksu kivuton",
        "Single leg squat kivuton 10 toistoa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  Olkapää___rotator_cuff: {
    "nimi": "Olkapää / rotator cuff",
    "fasialinja": "SL",
    "kategoria": "Yläraaja",
    "phv_huomio": "⚠️ Heittolajeissa SL-kiertokomponentti kriittinen. Skapula-stabiliteetti ennen RC-vahvistusta.",
    "aikataulut": {
        "liev": "3–14pv",
        "keski": "2–6vk",
        "vak": "4–12vk"
    },
    "rehab": {},
    "paluu_kriteerit": [
        "Kivuton harjoittelu",
        "Fysioterapeutin lupa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

  ACL_riski___polven_valgus: {
    "nimi": "ACL-riski / polven valgus",
    "fasialinja": "LL",
    "kategoria": "Polvikipu",
    "phv_huomio": "⚠️ Laskeutumismekaniikka + valgus = korkein riski. Ennaltaehkäisy > kuntoutus.",
    "aikataulut": {
        "liev": "Ennaltaehk.",
        "keski": "2–4vk",
        "vak": "6–12vk"
    },
    "rehab": {},
    "paluu_kriteerit": [
        "Kivuton harjoittelu",
        "Fysioterapeutin lupa"
    ],
    "lahde": "HPP_ELITE_v9_klinikka_db"
},

};

// Yhdistä Excel-protokollat pääkirjastoon
if (typeof HPP_REHAB_PROTOKOLLAT !== 'undefined') {
  Object.assign(HPP_REHAB_PROTOKOLLAT, HPP_REHAB_PROTOKOLLAT_EXCEL);
  if (typeof HPP_REHAB_META !== 'undefined') {
    HPP_REHAB_META.protokollia = Object.keys(HPP_REHAB_PROTOKOLLAT).length;
    HPP_REHAB_META.versio = '2.0';
    HPP_REHAB_META.paivitetty = '2026-03-26';
    HPP_REHAB_META.huomio = 'v2.0: Lisätty 13 oirekuvaa HPP ELITE v9 klinikka-DB:stä. Yhteensä ' + Object.keys(HPP_REHAB_PROTOKOLLAT).length + ' protokollaa.';
  }
}
if (typeof window !== 'undefined') {
  window.HPP_REHAB_PROTOKOLLAT = HPP_REHAB_PROTOKOLLAT;
  window.HPP_REHAB_META         = HPP_REHAB_META;
}
