/* ════════════════════════════════════════════════════════════════════════
   tm_kasvupyrahdys.js — kasvupyrähdys-fysiikka: Teron hyväksymä ENNEN / NYT / JÄLKEEN -taulu (116 olemassa olevaa harjoitetta) + 25 uutta harjoitetta (Teron / TalentMasterid Oy:n omaa aineistoa, docs/LISENSSIT.md).
   Dual-export: module.exports || window.TM_KASVUPYRAHDYS. PURE: ei DOM:ia, ei tallennusta.
   · Päätöskoodit: k = kyllä (normaalisti) · v = vain kevennettynä (lähteen oma kasvupyrähdysohje) · e = ei (ei näytetä). e/n/j = ENNEN / NYT / JÄLKEEN.
   · Vaihe tulee tm_phv_tila.js:n tmPhvKuormaTila(pelaaja):sta: PRE → ennen · PH → nyt · POST/AN → jälkeen · LAH → ankarampi (ennen, nyt) · 'tuntematon' ja null (ei kasvupyrähdysmerkintää) → ei suodatusta, tavallinen ohjelma.
   · tmKpSuodata(liikkeet, tila, o) → { liikkeet, korvaavat }: ei → pois; vain kevennettynä → lähteen ohjeella (jos lähteellä ei ole omaa kevennettyä ohjetta, esim. kuntoutuspankki, liike jätetään pois); sama harjoite (sama nimi eri pankeissa) vain kerran; kun liike poistuu tai siitä poistetaan osa, ehdotetaan korvaavaa uusista.
   · NÄKYMÄ: näytetään vain nimi ja ohjeet. Tunnisteet (id), ketjukoodit (SBL, SFL, EX_…) ja Geminin perustelut eivät koskaan tule paluuarvojen näytettäviin kenttiin — vartija: tests/kasvupyrahdys_fysiikka.test.js.
   · DATA-lohko generoidaan: node scripts/phv_kasvupyrahdys_vie.cjs (lähde docs/design/idp-v2/42_kasvupyrahdys_hyvaksynta.json). ÄLÄ muokkaa käsin.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  /*DATA-ALKU*/
  var TAULU = [   // 116 olemassa olevaa harjoitetta (id = lähdeaineiston tunniste, EI näytetä)
    {id:'D.sbl.0', nimi:'Hyppynaru + varpaille nousu', e:'k', n:'v', j:'k', phv:'Naruhypyt 2×10s kevyesti. Jätä eksentrinen pois.', pois:1},
    {id:'D.sbl.1', nimi:'Naruhypyt + pohjeeksentrinen', e:'k', n:'v', j:'k', phv:'Naruhypyt 2×10s kevyesti. Pohjeeksentrinen pois — jänne-luuliitos herkkänä.', pois:1},
    {id:'D.sfl.0', nimi:'Lonkka auki + askelkävelyt', e:'k', n:'v', j:'k', phv:'Pelkkä 90/90-venytys 3×30s. Ei kyykkyä — polven etuosa herkkä.', pois:1},
    {id:'D.sfl.1', nimi:'Hip flexor + askelkyykky-kävely', e:'k', n:'v', j:'k', phv:'Pelkkä 90/90-venytys 3×30s per puoli. Ei kyykkyä.', pois:1},
    {id:'D.ll.0', nimi:'Simpukka + sivulankku', e:'k', n:'k', j:'k', phv:'Normaali — isometriset harjoitteet turvallisia.'},
    {id:'D.ll.1', nimi:'Clamshell + sivulankku', e:'k', n:'k', j:'k', phv:'Normaali — isometriset harjoitteet turvallisia.'},
    {id:'D.diag.0', nimi:'Seinäsyöttö — molemmat jalat', e:'k', n:'k', j:'k', phv:'Normaali — pallolliset tekniikkaharjoitteet aina turvallisia.'},
    {id:'D.diag.1', nimi:'Seinäsyöttö + ponnauttelu — DIAG päivittäin', e:'k', n:'k', j:'k', phv:'Normaali — pallolliset harjoitteet aina turvallisia.'},
    {id:'D.dfl.0', nimi:'Hengitys + kissa-lehmä', e:'k', n:'k', j:'k', phv:'Erityisen tärkeä PHV:ssä — syvä core tukee kasvavaa selkää.'},
    {id:'D.dfl.1', nimi:'360° hengitys + dead bug', e:'k', n:'k', j:'k', phv:'Erityisen tärkeä PHV:ssä — normaali tai lisää toistoja.'},
    {id:'D.pig.0', nimi:'Katso ennen — seinäpallo', e:'k', n:'k', j:'k', phv:'Kognitiiviset harjoitteet ovat täsmälleen oikea valinta PHV:ssä.'},
    {id:'D.pig.1', nimi:'Skannausrutiini — katso ensin', e:'k', n:'k', j:'k', phv:'Kognitiiviset harjoitteet ovat PARAS valinta PHV:ssä.'},
    {id:'S.sbl.parillinen.0', nimi:'Reaktiolähtö — pallo maahan', e:'k', n:'v', j:'k', phv:'3 lähtöä per sarja 70% teholla. Takaketju kasvaa — ei ylikuormiteta.'},
    {id:'S.sbl.parillinen.1', nimi:'Reaktiolähtö + pallonhallinta', e:'k', n:'v', j:'k', phv:'4 toistoa 70% teholla. Pallo mukana — tekninen osa turvallinen.'},
    {id:'S.sbl.parillinen.2', nimi:'Reaktiolähtö + laukaus maaliin', e:'k', n:'v', j:'k', phv:'4 toistoa 70% teholla.'},
    {id:'S.sbl.pariton.0', nimi:'5-loikka — kuinka kauas?', e:'k', n:'v', j:'k', phv:'Vain loikat 2×3 kevyesti. Jätä sprintti pois.', pois:1},
    {id:'S.sbl.pariton.1', nimi:'5-loikka ajalla + Nordic curl', e:'k', n:'v', j:'k', phv:'Vain 5-loikka 2×3 kevyesti. Nordic curl pois.', pois:1},
    {id:'S.sbl.pariton.2', nimi:'5-loikka + Nordic curl täysi', e:'v', n:'v', j:'k', phv:'Vain loikat 2×2. Nordic curl pois.', pois:1},
    {id:'S.ll.parillinen.0', nimi:'T-rata — laita aika', e:'k', n:'v', j:'k', phv:'Normaali — T-rata turvallinen. Ei maksiminopeussuunnanmuutoksia kipuun asti.'},
    {id:'S.ll.parillinen.1', nimi:'T-rata pallolla + reaktio', e:'k', n:'k', j:'k', phv:'Normaali — pallollinen tekniikka aina turvallista.'},
    {id:'S.ll.parillinen.2', nimi:'T-rata + 1v1-feinti', e:'k', n:'v', j:'k', phv:'T-rata 70% teholla. 1v1 normaali — pelillinen konteksti aina ok.'},
    {id:'S.ll.pariton.0', nimi:'Sivuhyppely + luisteluaskeleet', e:'k', n:'v', j:'k', phv:'2×5 per puoli kevyesti.'},
    {id:'S.ll.pariton.1', nimi:'YJ-laskeutuminen sivulle + pito', e:'k', n:'v', j:'k', phv:'Pelkkä sivuaskellasku — ei hyppyä. 3×5 per jalka.', pois:1},
    {id:'S.ll.pariton.2', nimi:'Reaktiivinen YJ-loikka — ei pitoa', e:'k', n:'v', j:'k', phv:'Hidas rytminen loikka 3×6. Ei maksiminopeutta.'},
    {id:'S.dfl.parillinen.0', nimi:'Lankku + "lentävä koira"', e:'k', n:'k', j:'k', phv:'Normaali — isometriset ovat PHV:n paras harjoitteluryhmä.'},
    {id:'S.dfl.parillinen.1', nimi:'Progressiivinen lankku + tasapaino', e:'k', n:'k', j:'k', phv:'Normaali tai enemmän toistoja.'},
    {id:'S.dfl.parillinen.2', nimi:'Karhukävely + pistoolikyykky', e:'k', n:'v', j:'k', phv:'Karhukävely normaali. Pistoolikyykky → pistoolikyykky seinää vasten.'},
    {id:'S.dfl.pariton.0', nimi:'Tasapaino + vatsarutistus lennossa', e:'k', n:'k', j:'k', phv:'Normaali — tasapainoharjoitteet turvallisia.'},
    {id:'S.dfl.pariton.1', nimi:'YJ-tasapaino silmät kiinni + pistoolikyykky', e:'k', n:'v', j:'k', phv:'Normaali.'},
    {id:'S.dfl.pariton.2', nimi:'Tasapainolauta + karhukävely + pistoolikyykky', e:'k', n:'v', j:'k', phv:'Tasapainolauta → kiinteä alusta. Pistoolikyykky seinää vasten.'},
    {id:'S.diag.parillinen.0', nimi:'Katso & nimeä — seinäpallo', e:'k', n:'k', j:'k', phv:'Kognitiiviset harjoitteet PARHAITA PHV:ssä.'},
    {id:'S.diag.parillinen.1', nimi:'Päätöksenteko numeroilla', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'S.diag.parillinen.2', nimi:'ADAR Honey Trap', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'S.diag.pariton.0', nimi:'Virhe-leikki — reagoi heti', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'S.diag.pariton.1', nimi:'Peliälyvideo + skannaus', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'S.diag.pariton.2', nimi:'Dual-task seinärondo', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'S.sfl.parillinen.0', nimi:'Hip flexor venytys + askelkyykky-kävely', e:'k', n:'v', j:'k', phv:'Normaali — venytykset aina turvallisia. Kyykkyjen laajuutta voidaan rajoittaa.'},
    {id:'S.sfl.parillinen.1', nimi:'Hip flexor 90/90 + askelkyykky-kiihdytys', e:'k', n:'v', j:'k', phv:'2×30s venytys + 3×10m askelkävely. Jätä kiihdytykset pois.', pois:1},
    {id:'S.sfl.parillinen.2', nimi:'Thomas-venytys + pelispesifi kiihdytyssarjat', e:'k', n:'v', j:'k', phv:'3×30s venytys + 3 reaktiivista kiihdytystä 70% teholla.'},
    {id:'S.sfl.pariton.0', nimi:'Pistoolikyykky progressio — yksijalkainen', e:'k', n:'v', j:'k', phv:'2×6 per jalka tuettuna. Syvyyttä rajoitetaan — polven etuosa herkkä.'},
    {id:'S.sfl.pariton.1', nimi:'Pistoolikyykky + Nordic curl yhdistelmä', e:'k', n:'v', j:'k', phv:'Pistoolikyykky 2×6 tuettuna. Nordic curl pois — jänne-luuliitos herkkä.', pois:1},
    {id:'SBL.aktivointi', nimi:'Naruhypyt + pohjeeksentrinen', e:'k', n:'v', j:'k', phv:'Naruhypyt 2×10s kevyesti. Eksentrinen pois.', pois:1},
    {id:'SBL.S1', nimi:'Reaktiolähtö — pallo maahan', e:'k', n:'v', j:'k', phv:'3 lähtöä 70%. Takaketju herkkä.'},
    {id:'SBL.S2', nimi:'5-loikka + mittaus', e:'k', n:'v', j:'k', phv:'Vain loikat 2×3 kevyesti.'},
    {id:'SBL.S3', nimi:'Reaktiolähtö + pallonhallinta', e:'k', n:'v', j:'k', phv:'4 toistoa 70%.'},
    {id:'SBL.S4', nimi:'5-loikka + Nordic curl', e:'v', n:'v', j:'k', phv:'Nordic curl pois.', pois:1},
    {id:'SBL.S5', nimi:'Sprint + pallo + laukaus', e:'k', n:'v', j:'k', phv:'4 toistoa 70%.'},
    {id:'SFL.aktivointi', nimi:'Hip flexor + askelkyykky-kävely', e:'k', n:'v', j:'k', phv:'Vain 90/90-venytys 3×30s. Ei kyykkyä.', pois:1},
    {id:'SFL.S1', nimi:'Kyykkyhyppy pehmeä', e:'k', n:'v', j:'k', phv:'2×5 kevyesti.'},
    {id:'SFL.S2', nimi:'Kyykkyhyppy toistot', e:'k', n:'v', j:'k', phv:'2×5 60% teholla.'},
    {id:'SFL.S3', nimi:'Etuketjun laskeutuminen', e:'k', n:'v', j:'k', phv:'Max Stage — seuraa kipua.'},
    {id:'SFL.S4', nimi:'Drop jump + 90° rotaatio', e:'v', n:'v', j:'k', phv:'Ei rotaatiota — suoraan 3×5.'},
    {id:'SFL.S5', nimi:'Sprint + potku', e:'k', n:'v', j:'k', phv:'70% teholla 4×.'},
    {id:'LL.aktivointi', nimi:'Clamshell + sivulankku', e:'k', n:'k', j:'k', phv:'Normaali — isometriset ovat turvallisia.'},
    {id:'LL.S1', nimi:'Sivuhyppely + luisteluaskeleet', e:'k', n:'v', j:'k', phv:'2×5 per puoli.'},
    {id:'LL.S2', nimi:'T-rata hidas', e:'k', n:'k', j:'k', phv:'Normaali, ei maksiminopeus.'},
    {id:'LL.S3', nimi:'T-rata ajalla + reaktio-SM', e:'k', n:'v', j:'k', phv:'Normaali.'},
    {id:'LL.S4', nimi:'YJ-laskeutuminen sivulle + pito', e:'k', n:'v', j:'k', phv:'Pelkkä sivuaskel — ei hyppyä. 3×5.', pois:1},
    {id:'LL.S5', nimi:'Reaktiivinen YJ-loikka + 1v1', e:'k', n:'v', j:'k', phv:'Hidas 3×6, ei 1v1.'},
    {id:'DIAG.aktivointi', nimi:'Seinäsyöttö — molemmat jalat', e:'k', n:'k', j:'k', phv:'Normaali — pallolliset tekniikkaharjoitteet aina turvallisia.'},
    {id:'DIAG.S1', nimi:'Seinäsyöttö yksi kosketus', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'DIAG.S2', nimi:'Seinäsyöttö + ponnauttelu', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'DIAG.S3', nimi:'Skannausrutiini', e:'k', n:'k', j:'k', phv:'Normaali — PHV:n paras harjoite.'},
    {id:'DIAG.S4', nimi:'Syöttö + vastaanotto + avaus', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'DIAG.S5', nimi:'Läpisyöttö + SM + laukaus', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'DFL.aktivointi', nimi:'360° hengitys + cat-cow + dead bug', e:'k', n:'k', j:'k', phv:'Paras valinta PHV:ssä — kaikki turvallisia.'},
    {id:'DFL.S1', nimi:'Lankku + bird dog', e:'k', n:'k', j:'k', phv:'Normaali, pidennä kestoa.'},
    {id:'DFL.S2', nimi:'Lankku + sivulankku + bird dog', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'DFL.S3', nimi:'Karhukävely + tasapaino', e:'k', n:'k', j:'k', phv:'Paras PHV-harjoite.'},
    {id:'DFL.S4', nimi:'Eläinrata + tasapainolauta', e:'k', n:'k', j:'k', phv:'Normaali.'},
    {id:'DFL.S5', nimi:'Pistoolikyykky + BOSU', e:'k', n:'v', j:'k', phv:'Ei pistoolikyykkyä — bird dog + tasapaino.'},
    {id:'EX_QUAD_SET', nimi:'Quadriceps-aktivointi', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_SLR', nimi:'Suoran jalan nosto', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_ANKLE_MOB', nimi:'Nilkan liikkuvuusharjoittelu', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_HIP_MOB', nimi:'Lonkan liikkuvuus — selinmakuu', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_CORE_MOB', nimi:'Selkärangan liikkuvuus — cat-cow', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_ISOMETRIC', nimi:'Isometrinen lihasaktivointia', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_PROP_BALANCE', nimi:'Proprioseptiikka — tasapainolauta', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_NILKKA', nimi:'Nilkan stabilisaatioharjoitus', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_NORDIC', nimi:'Nordic Hamstring', e:'v', n:'e', j:'k', hpp:1},
    {id:'EX_NORDIC_HS_REGRESSION', nimi:'Takareiden venytys — progressio', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_LONKKA', nimi:'Lonkan ojentajat — silta', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_KYYKKY', nimi:'Kyykky — hallittu', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_CALF_RAISE', nimi:'Pohjenousu — eksentrinen', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_PLANK', nimi:'Lankku', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_BIRD_DOG', nimi:'Bird Dog — selkälihasstabiliteetti', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_SHOULDER_ROT', nimi:'Olkapään ulkokierto — vastus', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_CALF_ISO_SEATED', nimi:'Pohje — istuen isometrinen', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_SIVU_HYPPY', nimi:'Sivuttaishypyt', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_LATERAL', nimi:'Lateraalijuoksu + suunnanmuutos', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_CMJ', nimi:'Kevennyshyppy (CMJ)', e:'k', n:'e', j:'k', hpp:1},
    {id:'EX_PLYO', nimi:'Plyometriikka — hyppysarjat', e:'v', n:'e', j:'k', hpp:1},
    {id:'EX_LAHTO', nimi:'Räjähtävät lähdöt', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_ROT_SYOTTO', nimi:'Rotaatiosyötöt — medicinepallo', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_MED_HEITTO', nimi:'Medicinepallo sivuheitto', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_LAUKAUS', nimi:'Laukausvolyymiharjoittelu', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_NORDIC_FULL', nimi:'Nordic Hamstring — täysi', e:'v', n:'e', j:'k', hpp:1},
    {id:'EX_COPENHAGEN_REG', nimi:'Copenhagen Hip Adduction — regressio', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_COPENHAGEN_FULL', nimi:'Copenhagen Hip Adduction — täysi', e:'v', n:'e', j:'k', hpp:1},
    {id:'EX_RDL_SINGLE_LEG', nimi:'Yksijalkamaastaveto (RDL)', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_STEP_DOWN_ECC', nimi:'Portaalta alas — eksentrinen', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_TKE', nimi:'Terminal Knee Extension', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_WALL_SQUAT_ISO', nimi:'Kyykkyistunta seinää vasten', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_HIP_FLEXOR_STRETCH', nimi:'Lonkan koukistajien venytys', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_MCGILL_BIG3', nimi:'McGill Big 3 — selkäkuntosarja', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_LATERAL_BAND_WALK', nimi:'Vastuskuminauhakävely sivuttain', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_LATERAL_HOP_DRILL', nimi:'Sivuttaisloikat — yksijalkainen', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_BULGARIAN_SPLIT', nimi:'Bulgarialaiskyykky', e:'k', n:'v', j:'k', hpp:1},
    {id:'EX_CALF_ECCENTRIC_STEP', nimi:'Pohje — eksentrinen portaalla', e:'v', n:'e', j:'k', hpp:1},
    {id:'EX_PERONEAL_ISO_BAND', nimi:'Pohjeluulihakset — isometrinen', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_PERONEAL_STRENGTH_BAND', nimi:'Pohjeluulihakset — dynaaminen', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_PERONEAL_ENDURANCE', nimi:'Pohjeluulihakset — kestävyys', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_BALANCE_SL_STABLE', nimi:'Yksijalkatasapaino — vakaa alusta', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_DORSIFLEXION_PAINFREE', nimi:'Nilkan koukistus — kivuton', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_DORSIFLEXION_KNEE2WALL', nimi:'Nilkan koukistus — polvi seinään', e:'k', n:'k', j:'k', hpp:1},
    {id:'EX_RUN_RETURN_PROGRESS', nimi:'Juoksupalaatumisohjelma', e:'k', n:'v', j:'k', hpp:1}
  ];
  var UUDET = [   // 25 uutta harjoitetta; tekstit FI-avaimissa kp_NN_nimi|vo|po|kp
    {id:'S.sfl.pariton.2', k:'01', ika:['rakentaja','showcase'], valineet:'merkkikartio', kotiin:'osin', e:'k', n:'v', j:'k', korvaa:[]},
    {id:'D.sl.0', k:'02', ika:['leikkija','rakentaja','showcase'], valineet:'alusta', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'D.sl.1', k:'03', ika:['rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'D.sbl.foot.0', k:'04', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'SFL.S0.landing', k:'05', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:['EX_CMJ','EX_PLYO']},
    {id:'SFL.decel.1', k:'06', ika:['rakentaja','showcase'], valineet:'2 kartiota', kotiin:'ei', e:'k', n:'v', j:'k', korvaa:[]},
    {id:'SBL.hinge.0', k:'07', ika:['leikkija','rakentaja','showcase'], valineet:'keppi tai harjanvarsi', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'DFL.antirot.1', k:'08', ika:['rakentaja','showcase'], valineet:'kuminauha', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'SBL.mech.1', k:'09', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'ei', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'FL.push.1', k:'10', ika:['rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'DFL.neck.1', k:'11', ika:['rakentaja','showcase'], valineet:'pallo tai käsi', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'EX_HAMSTRING_ISO_BRIDGE', k:'12', ika:['rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:['EX_NORDIC','EX_NORDIC_FULL','EX_NORDIC_HS_REGRESSION','SBL.S4','S.sbl.pariton.1','S.sbl.pariton.2','S.sfl.pariton.1']},
    {id:'EX_CALF_ISO_STANDING', k:'13', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:['EX_CALF_ECCENTRIC_STEP','D.sbl.0','D.sbl.1','SBL.aktivointi']},
    {id:'EX_SPANISH_SQUAT_ISO', k:'14', ika:['rakentaja','showcase'], valineet:'paksu kuminauha + kiintopiste', kotiin:'osin', e:'k', n:'v', j:'k', korvaa:['EX_KYYKKY','EX_BULGARIAN_SPLIT','D.sfl.0','D.sfl.1','SFL.aktivointi']},
    {id:'EX_ADDUCTOR_ISO_SQUEEZE', k:'15', ika:['leikkija','rakentaja','showcase'], valineet:'pallo', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:['EX_COPENHAGEN_FULL','EX_COPENHAGEN_REG']},
    {id:'EX_HIP_FLEXOR_ISO_MARCH', k:'16', ika:['leikkija','rakentaja','showcase'], valineet:'minikuminauha', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'EX_GLUTE_BRIDGE_SL', k:'17', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'EX_HIP_90_90_MOB', k:'18', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'EX_BAND_FACE_PULL', k:'19', ika:['rakentaja','showcase'], valineet:'kuminauha + kiintopiste', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'D.sbl.run.0', k:'20', ika:['leikkija','rakentaja','showcase'], valineet:'seinä', kotiin:'kyllä', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'SBL.mech.2', k:'21', ika:['rakentaja','showcase'], valineet:null, kotiin:'ei', e:'k', n:'v', j:'k', korvaa:[]},
    {id:'S.sbl.run.1', k:'22', ika:['leikkija','rakentaja'], valineet:'tikkaat tai merkit', kotiin:'ei', e:'k', n:'k', j:'k', korvaa:[]},
    {id:'S.ll.run.1', k:'23', ika:['rakentaja','showcase'], valineet:'kartiot', kotiin:'ei', e:'k', n:'v', j:'k', korvaa:[]},
    {id:'SBL.S6.fly', k:'24', ika:['rakentaja','showcase'], valineet:'kartiot', kotiin:'ei', e:'k', n:'v', j:'k', korvaa:[]},
    {id:'EX_DRIBBLE_RUN_SERIES', k:'25', ika:['leikkija','rakentaja','showcase'], valineet:null, kotiin:'ei', e:'k', n:'k', j:'k', korvaa:[]}
  ];
  var FI = {
    kp_01_nimi: 'Jarrutusaskel + askelkyykkypito',
    kp_01_vo: 'Hölkkä 5 m → 3 lyhyttä jarrutusaskelta → askelkyykkyyn, pito 3 s. Polvi varpaiden suuntaan, ylävartalo pystyssä. 3×5 per jalka.',
    kp_01_po: 'Hölkkää kartiolle, pysähdy kolmella pienellä askeleella ja jää askelkyykkyyn 3 sekunniksi. Polvi osoittaa varpaiden suuntaan.',
    kp_01_kp: 'Kävele kartiolle ja pysähdy rauhallisesti. Pidä askelkyykky matalampana (polvi ei syvälle) 20 s per jalka, 3 kertaa.',
    kp_02_nimi: 'Avautuva kirja (rintarangan kierto)',
    kp_02_vo: 'Kylkimakuu, polvet 90° ja yhdessä. Yläkäsi avautuu kaaressa lattiaa kohti, katse seuraa kättä, polvet pysyvät maassa. 2×8 per puoli.',
    kp_02_po: 'Mene kyljellesi polvet koukussa. Avaa ylempi käsi isossa kaaressa toiselle puolelle ja katso kättä. Polvet pysyvät yhdessä maassa.',
    kp_02_kp: 'Tee samalla tavalla. Tämä on hyvä liike kasvuaikana, koska se pitää selän liikkuvana.',
    kp_03_nimi: 'Maailman paras venytys',
    kp_03_vo: 'Pitkä askel eteen, takapolvi irti maasta. Etujalan puoleinen kyynärpää kohti nilkkaa, sitten käsi kiertäen kohti kattoa. 2×6 per puoli.',
    kp_03_po: 'Ota pitkä askel eteen. Vie kyynärpää kohti etujalan nilkkaa ja kierrä sitten käsi kohti kattoa. Hengitä rauhassa.',
    kp_03_kp: 'Tee pienemmällä askeleella, jos lonkan etuosa tai polvi tuntuu kireältä.',
    kp_04_nimi: 'Jalkaholvin hallinta (lyhyt jalka + varvasjooga)',
    kp_04_vo: 'Paljain jaloin istuen tai seisten: jalkaholvi nostetaan ilman varpaiden koukistusta, pito 5 s. Sen jälkeen isovarvas ylös muut alas ja päinvastoin. 2×10.',
    kp_04_po: 'Ota kengät pois. Yritä nostaa jalkapohjan holvia ylös niin, että varpaat pysyvät suorina. Pidä 5 sekuntia. Nosta sitten vuorotellen isovarvas ja muut varpaat.',
    kp_04_kp: 'Tee samalla tavalla. Jalat kasvavat kasvuaikana nopeasti, joten jalkojen hallintaa kannattaa harjoitella.',
    kp_05_nimi: 'Pysähdys puolikyykkyyn (Snap down)',
    kp_05_vo: 'Nousu päkiöille kädet ylhäällä → nopea pudotus puolikyykkyyn, pito 3 s. Polvet varpaiden suuntaan, äänetön alastulo, ei hyppyä. 3×6.',
    kp_05_po: 'Nouse varpaille kädet ylhäällä. Pudottaudu nopeasti puolikyykkyyn ja jää paikallesi 3 sekunniksi. Laskeudu hiljaa, polvet osoittavat varpaiden suuntaan.',
    kp_05_kp: 'Tee samalla tavalla, mutta pysähdy korkeampaan kyykkyyn, jos polvi tuntuu.',
    kp_06_nimi: 'Kolmen askeleen jarrutus',
    kp_06_vo: 'Kiihdytys 10 m noin 75 % vauhtiin, pysähdys merkille kolmella lyhyellä jarrutusaskeleella matalaan asentoon. Lantio alas, äänetön pysähdys. 3×4.',
    kp_06_po: 'Juokse kartiolle reippaasti, mutta et täysillä. Pysähdy kolmella pienellä askeleella matalaan asentoon ja yritä pysähtyä mahdollisimman hiljaa.',
    kp_06_kp: 'Juokse rauhallisemmin (noin puolet täydestä vauhdista) ja pysähdy pehmeästi.',
    kp_07_nimi: 'Lantiosarana kepillä',
    kp_07_vo: 'Keppi selkää pitkin niin, että se koskee takaraivoon, yläselkään ja ristiluuhun. Lantio liikkuu taakse, kosketukset säilyvät koko ajan. 3×10.',
    kp_07_po: 'Pidä keppiä selkää vasten niin, että se koskee päähän, selkään ja pakaroihin. Työnnä peppua taakse ja kallistu eteen. Keppi ei saa irrota mistään kohdasta.',
    kp_07_kp: 'Tee samalla tavalla. Liike opettaa nostamaan ja kumartumaan selkää säästäen.',
    kp_08_nimi: 'Kiertoa vastustava pito (Pallof press)',
    kp_08_vo: 'Kuminauha sivulta rinnan korkeudelta. Kädet suoriksi eteen ja pito 3 s niin, ettei vartalo kierry. Vaihtoehto: lankku, vuorokäsin olkapääkosketus lantio paikallaan. 3×8 per puoli.',
    kp_08_po: 'Kiinnitä kuminauha sivulle. Työnnä kädet suoraan eteen ja pidä 3 sekuntia niin, ettei vartalo käänny nauhan suuntaan.',
    kp_08_kp: 'Tee samalla tavalla. Liike vahvistaa keskivartaloa ja suojaa alaselkää.',
    kp_09_nimi: 'A-marssi ja A-hyppely',
    kp_09_vo: 'A-marssi 2×15 m: polvi ylös, nilkka koukussa, lantio ryhdissä. Sen jälkeen A-hyppely 2×15 m samalla asennolla.',
    kp_09_po: 'Marssi eteenpäin nostaen polvea korkealle ja pitäen varpaat ylöspäin. Kun marssi sujuu, tee sama pienin hypyin.',
    kp_09_kp: 'Tee pelkkä marssi, jos hyppely tuntuu polvessa tai kantapäässä. Keskity rytmiin.',
    kp_10_nimi: 'Lapapunnerrus + punnerrus',
    kp_10_vo: 'Lankkuasennossa 8 lapapunnerrusta (kädet suorina, lavat yhteen ja erilleen), sitten 8–10 punnerrusta keskivartalo tiukkana. Kevennys: kädet korokkeella. 3 sarjaa.',
    kp_10_po: 'Mene punnerrusasentoon. Liikuta ensin vain lapoja yhteen ja erilleen kädet suorina 8 kertaa. Tee sitten punnerruksia vartalo suorana.',
    kp_10_kp: 'Tee samalla tavalla. Jos punnerrus on raskas, laita kädet tuolille tai penkille.',
    kp_11_nimi: 'Niskan pitoharjoite neljään suuntaan',
    kp_11_vo: 'Käsi tai pallo pään vasten: paina eteen, taakse ja sivuille niin, ettei pää liiku. Kevyt paine. 2×5 s joka suuntaan.',
    kp_11_po: 'Laita käsi otsalle ja paina päätä kevyesti kättä vasten niin, ettei pää liiku. Pidä 5 sekuntia. Tee sama takaraivoon ja molemmille sivuille.',
    kp_11_kp: 'Tee samalla tavalla kevyellä paineella.',
    kp_12_nimi: 'Takareisisilta, pitkä vipu (pito)',
    kp_12_vo: 'Selinmakuu, kantapäät kaukana pakaroista (polvet lähes suorina). Lantio ylös ja pito 20–30 s. 3–4 sarjaa. Ei kramppia eikä kipua takareiteen.',
    kp_12_po: 'Mene selällesi kantapäät kauas pakaroista. Nosta lantio ylös ja pidä 20–30 sekuntia. Takareisi saa tuntua, mutta ei saa sattua.',
    kp_12_kp: 'Kasvuaikana tämä korvaa Nordic-takareisiliikkeen.',
    kp_13_nimi: 'Pohjepito tasamaalla',
    kp_13_vo: 'Tasamaalla nousu päkiöille, pito 30–45 s. 3 sarjaa suorin polvin ja 3 sarjaa polvet hieman koukussa. Kantapää ei laske tason alle. Ei kipua kantapäässä.',
    kp_13_po: 'Nouse varpaille lattialla ja pidä 30 sekuntia. Tee kolme kertaa suorin polvin ja kolme kertaa polvet vähän koukussa.',
    kp_13_kp: 'Kasvuaikana tämä korvaa portaalla tehtävän pohjeliikkeen. Lopeta, jos kantapäähän sattuu.',
    kp_14_nimi: 'Kuminauhakyykky (pito)',
    kp_14_vo: 'Paksu kuminauha polvitaipeissa kiintopisteeseen. Nojaa taakse sääret pystyssä ja pidä kivuttomassa kulmassa 4×30–45 s.',
    kp_14_po: 'Laita kuminauha polvien taakse ja kiinnitä se tukevaan paikkaan. Istu taaksepäin niin, että sääret pysyvät pystyssä. Pidä 30 sekuntia.',
    kp_14_kp: 'Pysy korkeammassa kulmassa, jos polven etuosa tuntuu. Ei saa sattua.',
    kp_15_nimi: 'Lähentäjäpuristus pallolla',
    kp_15_vo: 'Selinmakuu, pallo polvien välissä. Purista 70–80 % teholla 10–15 s, 5 kertaa. Polvikulmat 0°, 45° ja 90° vaihdellen. Ei nivuskipua.',
    kp_15_po: 'Mene selällesi pallo polvien välissä. Purista palloa reippaasti mutta et täysillä 10 sekuntia. Toista 5 kertaa.',
    kp_15_kp: 'Tee tämä täyden Copenhagen-liikkeen tilalla kasvuaikana.',
    kp_16_nimi: 'Lonkankoukistajan marssipito',
    kp_16_vo: 'Selinmakuu, minikuminauha jalkaterien ympärillä. Toinen polvi 90°, pito 3 s alaselkä neutraalina. 3×8 per puoli.',
    kp_16_po: 'Mene selällesi kuminauha jalkojen ympärillä. Nosta toinen polvi ylös ja pidä 3 sekuntia. Alaselkä pysyy lattiassa.',
    kp_16_kp: 'Tee samalla tavalla. Liike on hyvä, jos lonkan etuosa on kireä.',
    kp_17_nimi: 'Yhden jalan lantionnosto',
    kp_17_vo: 'Selinmakuu, toinen jalka ylhäällä. Lantio ylös yhdellä jalalla, pito 2 s lantio suorassa, hallittu lasku. 3×8–10 per puoli.',
    kp_17_po: 'Mene selällesi ja nosta toinen jalka ylös. Nosta lantio ylös toisen jalan avulla, pidä 2 sekuntia ja laske hitaasti.',
    kp_17_kp: 'Tee samalla tavalla. Jos lantio kallistuu, tee kahdella jalalla.',
    kp_18_nimi: 'Lonkan 90/90-liikkuvuus',
    kp_18_vo: 'Istuen molemmat polvet 90°. Polvet kääntyvät hallitusti puolelta toiselle rinta pystyssä, kädet tarvittaessa tukena. 2×8.',
    kp_18_po: 'Istu lattialle niin, että molemmat polvet ovat koukussa samaan suuntaan. Käännä polvet rauhallisesti toiselle puolelle. Pidä selkä suorana.',
    kp_18_kp: 'Tee samalla tavalla. Käytä käsiä tukena, jos liike on vaikea.',
    kp_19_nimi: 'Yläselän veto kuminauhalla',
    kp_19_vo: 'Kuminauha kasvojen korkeudelle, lavat yhteen ja peukalot kiertyvät taakse. Pito 2 s. 3×12.',
    kp_19_po: 'Vedä kuminauhaa kohti kasvoja niin, että lapaluut menevät yhteen. Käännä peukalot taaksepäin ja pidä 2 sekuntia.',
    kp_19_kp: 'Tee samalla tavalla. Liike tukee ryhtiä kasvuaikana.',
    kp_20_nimi: 'Seinädrilli: kiihdytysasento + marssi',
    kp_20_vo: 'Kädet seinällä, vartalo suorana noin 45° kulmassa. Polvi 90° ja nilkka koukussa, pito 3 s, vaihto hallitusti. 3×8 per puoli.',
    kp_20_po: 'Nojaa käsillä seinään vartalo suorana. Nosta toinen polvi ylös varpaat ylöspäin ja pidä 3 sekuntia. Vaihda jalkaa rauhassa.',
    kp_20_kp: 'Tee samalla tavalla. Liike opettaa juoksun lähtöasennon ilman hyppyjä.',
    kp_21_nimi: 'B-marssi, saksijuoksu ja kantapäät pakaraan',
    kp_21_vo: '2×15 m kukin: B-marssi (polvi ylös, rauhallinen ojennus, jalka aktiivisesti kehon alle), suorajalkasakset päkiällä, nopea kantapää pakaraan.',
    kp_21_po: 'Tee kolme juoksuliikettä 15 metrin matkalla: polvennostomarssi, jossa ojennat jalan ja vedät sen alle, suorin jaloin juoksu varpailla ja kantapäät pakaraan.',
    kp_21_kp: 'Tee B-marssi rauhallisesti. Älä potkaise jalkaa eteen.',
    kp_22_nimi: 'Askeltiheys tikkailla tai matalilla aidoilla',
    kp_22_vo: '1–2 kontaktia per väli täydellä askeltiheydellä, katse ylhäällä, kyynärpäät 90°. 5 m rullaus perään. 4–5 toistoa.',
    kp_22_po: 'Juokse tikkaiden läpi nopein pienin askelin, katse eteenpäin ja kädet mukana. Jatka viisi metriä rauhallisesti.',
    kp_22_kp: 'Tee samalla tavalla. Askeleet ovat pieniä ja nopeita, ei isoja loikkia.',
    kp_23_nimi: 'Kaarrejuoksu ristiaskeleella',
    kp_23_vo: 'Ristiaskelella lähtö sivulle ja kiihdytys 20 m loivaan kaarteeseen vartalo sisäänpäin kallistuneena. 3 per suunta.',
    kp_23_po: 'Lähde liikkeelle askeltamalla jalka toisen eteen sivulle. Juokse loivassa kaaressa 20 metriä ja kallista vartaloa kaarteen sisäpuolelle.',
    kp_23_kp: 'Juokse noin kolme neljäsosaa täydestä vauhdista.',
    kp_24_nimi: 'Lentävä 20 m',
    kp_24_vo: 'Rento, asteittainen kiihdytys 20 m, huippuvauhti 15–20 m hartiat rentoina, rullaus 20 m. 3–4 toistoa, palautus 2 min.',
    kp_24_po: 'Kiihdytä rauhassa 20 metriä, juokse kovaa 15–20 metriä rentona ja hidasta sitten vähitellen. Lepää 2 minuuttia toistojen välissä.',
    kp_24_kp: 'Juokse noin 80 % vauhdilla, et täysillä.',
    kp_25_nimi: 'Pikkuaskeljuoksu (dribble)',
    kp_25_vo: 'Pienet pyörivät askeleet: jalkaterä nousee nilkan tai säären puolivälin korkeudelle ja laskeutuu suoraan painopisteen alle. 4×20 m kävelypalautuksella.',
    kp_25_po: 'Juokse pienin askelin niin, että jalka nousee nilkan tai säären puoliväliin ja laskeutuu suoraan vartalon alle. 20 metriä, sitten kävele takaisin.',
    kp_25_kp: 'Tee samalla tavalla. Tämä on hyvä juoksurytmin harjoitus kasvuaikana.'
  };
  /*DATA-LOPPU*/

  var JARKEVYS = { k: 1, v: 2, e: 3 };   // ankaruus: ei > vain kevennettynä > kyllä
  var IKAVAIHEET = { leikkija: 1, rakentaja: 1, showcase: 1 };
  function _avain(nimi) { return String(nimi == null ? '' : nimi).normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function _strict(a, b) { return JARKEVYS[a] >= JARKEVYS[b] ? a : b; }

  var _IDX = null;
  function _indeksi() {
    if (_IDX) return _IDX; _IDX = { nimi: {}, id: {} };
    TAULU.forEach(function (r) { r.uusi = false; _lisaa(r); });
    UUDET.forEach(function (r) { r.uusi = true; _lisaa(r); });
    function _lisaa(r) { var a = _avain(_nimiRivi(r)); (_IDX.nimi[a] = _IDX.nimi[a] || []).push(r); _IDX.id[String(r.id).toLowerCase()] = r; }
    return _IDX;
  }
  function _nimiRivi(r) { return r.uusi ? FI['kp_' + r.k + '_nimi'] : r.nimi; }
  function _teksti(c, k) { var v = (c && typeof c.t === 'function') ? c.t(k) : k; return (v && v !== k) ? v : (FI[k] != null ? FI[k] : k); }
  /* Kevennysrivi ilman perustelua: " — jänne-luuliitos herkkänä." / " — polven etuosa herkkä." → " kasvuaikana." (käännetty sv-teksti käytetään sellaisenaan). */
  function _siisti(fi) { return String(fi).replace(/ — (jänne-luuliitos herkkänä|jänne-luuliitos herkkä|polven etuosa herkkä)\.$/, ' kasvuaikana.'); }
  function _tFi(c, fi) { var v = (c && typeof c.t === 'function') ? c.t(fi) : fi; return v || fi; }   // lähteen FI-teksti (sv-kartta avaimena FI-teksti; puuttuessa FI)

  /* PHV-tila → vaihe: 'e' (ennen) | 'n' (nyt) | 'j' (jälkeen) | 'EN' (lähestyy: ennen+nyt) | null (ei suodatusta: ei kasvupyrähdysmerkintää, mittaamaton tai normaali kuorma). */
  function tmKpVaihe(tila) {
    var t = String(tila == null ? '' : tila);
    if (t === 'PRE') return 'e'; if (t === 'PH') return 'n'; if (t === 'POST' || t === 'AN') return 'j'; if (t === 'LAH') return 'EN';   // 'tuntematon' (ei kasvupyrähdysmerkintää) ja null → ei suodatusta: tavallinen ohjelma
    return null;
  }
  function tmKpPaatos(r, tila) {
    var v = tmKpVaihe(tila); if (!v || !r) return 'k';
    if (v === 'e' || v === 'n' || v === 'j') return r[v];
    if (v === 'EN') return _strict(r.e, r.n);
    return 'k';
  }
  function tmKpEtsi(nimi) { return (_indeksi().nimi[_avain(nimi)] || []).slice(); }
  /* Sama harjoite (sama nimi, myös eri pankeissa) vain kerran: palauttaa listan ilman toistoja; o.aiemmat = jo käytetyt nimet (sama päivä/viikko). */
  function tmKpPoistaDuplikaatit(nimet, aiemmat) {
    var nahty = {}; (aiemmat || []).forEach(function (n) { nahty[_avain(n)] = 1; });
    return (nimet || []).filter(function (n) { var a = _avain(n); if (nahty[a]) return false; nahty[a] = 1; return true; });
  }
  function _ikaOk(r, ikavaihe) { var v = String(ikavaihe || '').toLowerCase().replace(/ä/g, 'a'); return !v || !IKAVAIHEET[v] || r.ika.indexOf(v) >= 0; }
  function _korvaavat(laukaisijat, tila, o, nahty) {
    var ids = {}; laukaisijat.forEach(function (r) { ids[String(r.id).toLowerCase()] = 1; });
    var ulos = []; var ph = String(tila) === 'PH';
    UUDET.forEach(function (u) {
      if (ulos.length >= ((o && o.maxKorvaavat) || 3)) return;
      if (!u.korvaa.some(function (id) { return ids[String(id).toLowerCase()]; })) return;
      if (!_ikaOk(u, o && o.ikavaihe)) return;
      var p = tmKpPaatos(u, tila); if (p === 'e') return;
      var nimi = _nimiRivi(u), a = _avain(nimi); if (nahty[a]) return; nahty[a] = 1;
      var kpTxt = _teksti(o, 'kp_' + u.k + '_kp'), voTxt = _teksti(o, 'kp_' + u.k + '_vo');
      ulos.push({ nimi: _teksti(o, 'kp_' + u.k + '_nimi'), ohje: p === 'v' ? kpTxt : voTxt, kp: (p === 'k' && ph) ? kpTxt : null });
    });
    return ulos;
  }
  /* liikkeet: [{ liike, toistot, video_url }] (jakson snapshot). Palauttaa { liikkeet (+ kevennetty: lähteen ohje), korvaavat: [{ nimi, ohje, kp }] }. c.t (valinn.) kääntää näytettävät tekstit. */
  function tmKpSuodata(liikkeet, tila, o) {
    o = o || {}; var nahty = {}, ulos = [], laukaisijat = [];
    (liikkeet || []).forEach(function (l) {
      if (!l || !l.liike) return; var a = _avain(l.liike); if (nahty[a]) return; nahty[a] = 1;
      var rs = tmKpEtsi(l.liike); if (!rs.length) { ulos.push(l); return; }   // tuntematon (seuran oma / vapaa) liike: ei kosketa
      var p = rs.reduce(function (acc, r) { return _strict(acc, tmKpPaatos(r, tila)); }, 'k');
      if (p === 'k') { ulos.push(l); return; }
      if (p === 'v') {
        var lahde = rs.filter(function (r) { return !r.uusi && !r.hpp && r.phv; })[0] || null;
        var uusi = rs.filter(function (r) { return r.uusi; })[0] || null;
        var teksti = lahde ? (function () { var x = _tFi(o, lahde.phv); return x === lahde.phv ? _siisti(x) : x; })() : (uusi ? _tFi(o, FI['kp_' + uusi.k + '_kp']) : null);
        if (teksti) { ulos.push(Object.assign({}, l, { kevennetty: teksti })); if (rs.some(function (r) { return r.pois; })) laukaisijat = laukaisijat.concat(rs); return; }
        // lähteellä ei omaa kevennettyä ohjetta → ei näytetä (varovaisin); jatkuu 'e'-haaraan
      }
      laukaisijat = laukaisijat.concat(rs);
    });
    return { liikkeet: ulos, korvaavat: laukaisijat.length ? _korvaavat(laukaisijat, tila, o, nahty) : [] };
  }
  var API = { FI: FI, TAULU: TAULU, UUDET: UUDET, tmKpVaihe: tmKpVaihe, tmKpPaatos: tmKpPaatos, tmKpEtsi: tmKpEtsi, tmKpSuodata: tmKpSuodata, tmKpPoistaDuplikaatit: tmKpPoistaDuplikaatit, _avain: _avain, _teksti: _teksti };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else if (root) root.TM_KASVUPYRAHDYS = API;
})(typeof window !== 'undefined' ? window : this);
