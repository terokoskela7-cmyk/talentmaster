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
if (typeof window !== 'undefined') {
  window.HPP_EXERCISES          = HPP_EXERCISES;
  window.HPP_REHAB_PROTOKOLLAT  = HPP_REHAB_PROTOKOLLAT;
  window.HPP_REHAB_META         = HPP_REHAB_META;
}
