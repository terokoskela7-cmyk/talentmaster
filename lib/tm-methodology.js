/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Metodologia-library
   
   Yhdistää:
   - harjoitelogiikka_v4_2.js (5 ketjua, kielitasot, mesosyklit, PANKKI)
   - TM_LiikehallintaMatrix_v2.html (13 liikekategoriaa × 5 Stage)
   - Master v9:n JAKSO_RAKENNE (8 vk sykli)
   
   Käyttö:
   <script src="lib/tm-methodology.js"></script>
   window.TM.metodologia.KETJUT
   window.TM.metodologia.STAGES
   window.TM.metodologia.JAKSOT
   window.TM.metodologia.MATRIISI_13
   window.TM.metodologia.KIELITASOT
   window.TM.metodologia.MESOSYKLIT
   
   TÄRKEÄÄ: tämä on pelkkää dataa — ei UI:ta, ei I/O:ta, ei DOM:ia.
   Profiilin laskenta → lib/tm-profile.js
   Ohjelman generointi → lib/tm-prescription.js
   ═══════════════════════════════════════════════════════════════════ */

(function(root) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // 5 LIIKEKETJUA — anatominen perusta (Wilke 2016, Liikanen 2025)
  // DIAG = SL+FL yhdessä (vahvin anatominen näyttö ⭐⭐⭐)
  // Peliäly (pig/D4) on oma dimensionsa, EI liikeketju
  // ═══════════════════════════════════════════════════════════════════
  var KETJUT = {
    SBL: {
      koodi: 'SBL', nimi: 'Vauhtiketju', emoji: '⚡',
      anatomia: 'Superficial Back Line — jalkapohja → pohje → hamstring → selkä',
      pelifunktio: 'Sprintti, kiihdytys, pitkä askel',
      naytto: '⭐⭐⭐ Wilke 2016',
      cue_leikkija: 'nopeutesi',
      cue_rakentaja: 'takaketju — jalkapohjasta selkään',
      cue_showcase: 'SBL — takaketjun voima (Wilke 2016)',
      vamma_riski: 'Hamstring-vammat — Nordic curl suojaa (Petersen 2011: −51%)'
    },
    SFL: {
      koodi: 'SFL', nimi: 'Lähtöketju', emoji: '🦵',
      anatomia: 'Superficial Front Line — varvas → sääri → quadriceps → vatsa',
      pelifunktio: 'Räjähtävä lähtö, ponnistus, potku',
      naytto: '⭐⭐ Wilke 2016',
      cue_leikkija: 'räjähtäväsi',
      cue_rakentaja: 'etuketju — lonkka auki, polvi nousee',
      cue_showcase: 'SFL — lonkka auki → räjähtävyys ja potku',
      vamma_riski: 'ACL — valgus-kollapsi laskeutuessa, tasainen jarrutus'
    },
    LL: {
      koodi: 'LL', nimi: 'Sivuketju', emoji: '↔️',
      anatomia: 'Lateral Line — ulkosyrjä → peroneum → IT-band → gluteus medius',
      pelifunktio: 'Suunnanmuutos, pujottelu, lateraalivakaus',
      naytto: '⭐⭐ LL-tutkimus',
      cue_leikkija: 'ketteryytesi',
      cue_rakentaja: 'sivuketju — estää polven kaatumisen sisäänpäin',
      cue_showcase: 'LL — lateraalivakaus, pujottelu +9%',
      vamma_riski: 'ACL: gluteus medius estää valgus-kollapsın'
    },
    DIAG: {
      koodi: 'DIAG', nimi: 'Diagonaaliketju', emoji: '🔄',
      anatomia: 'Spiral + Functional Line yhdessä — kiertoketju + yhdistelmäketju',
      pelifunktio: 'Syöttö, SM-pallo, pujottelu, rotaatio',
      naytto: '⭐⭐⭐ Liikanen 2025',
      cue_leikkija: 'syöttösi ja kierroksesi',
      cue_rakentaja: 'diagonaaliketju — rintakehä ohjaa, jalka seuraa',
      cue_showcase: 'DIAG — SL+FL yhdessä: syöttö +13%, SM-pallo +8%',
      vamma_riski: 'Pakara- ja lähentäjävammat — rotaatiolaskeutuminen ACL-riski'
    },
    DFL: {
      koodi: 'DFL', nimi: 'Hallintaketju', emoji: '🏗️',
      anatomia: 'Deep Front Line — pallea → lonkankoukistaja → lantionpohja',
      pelifunktio: 'Asento, hengitys, stabiliteetti, pohja kaikelle',
      naytto: '⭐⭐ Kolar 2012',
      cue_leikkija: 'tasapainosi',
      cue_rakentaja: 'hallintaketju — pallea pitää lantion kasassa',
      cue_showcase: 'DFL — hengitys, asento, pohja kaikelle',
      vamma_riski: 'Alaselkäkivut, yleisvakauden puute — PHV-herkkä alue'
    }
  };

  // Peliäly — oma dimensionsa, ei liikeketju.
  // ADAR-taso: Anticipation / Decision / Action / Reaction.
  var PIG = {
    koodi: 'PIG', nimi: 'Peliäly', emoji: '🧠',
    kuvaus: 'ADAR-taso — kognitiivinen dimensio joka kehittyy jokaisen ketjun sisällä',
    alaryhmat: {
      A_anticipation: 'Katse ylös ennen kosketusta, ennakointi',
      D_decision: 'Oikea valinta oikeaan aikaan',
      A_action: 'Tekninen suoritus paineessa',
      R_reaction: 'Toipuminen virheestä'
    },
    cue_leikkija: 'katse ylös ja nimeä ennen kosketusta',
    cue_rakentaja: 'pre-scanning — mitä ympärilläsi on?',
    cue_showcase: 'ADAR — Vaeyens 2007: pre-scanning > fysiikka eliitin erotteluna'
  };

  // ═══════════════════════════════════════════════════════════════════
  // 5 STAGE — Everton Academy -framework, PHV-pohjainen progressio
  // Training age > kronologinen ikä
  // ═══════════════════════════════════════════════════════════════════
  var STAGES = {
    1: {
      nro: 1, nimi: 'Perusta', lyhyt: 'S1',
      kuvaus: 'Kehonpaino, hidas, tekniikka oikein',
      intensiteetti: '40–60%',
      toistot: 'Vähän, laatu edellä',
      vari: '#6b7280',
      piste_min: 0, piste_max: 39,
      ikatavoite: 'U8–U10 pääsääntöisesti',
      phv_rajoitus: 'Sopii aina, myös PHV-kaudella'
    },
    2: {
      nro: 2, nimi: 'Perustaito', lyhyt: 'S2',
      kuvaus: 'Lisää toistoja ja liikelaajuutta — liike omistetaan',
      intensiteetti: '60–70%',
      toistot: 'Enemmän, hallittu rytmi',
      vari: '#14b8a6',
      piste_min: 40, piste_max: 54,
      ikatavoite: 'U11–U13',
      phv_rajoitus: 'Max Stage PHV-kaudella (PH-tila)'
    },
    3: {
      nro: 3, nimi: 'Kehittävä', lyhyt: 'S3',
      kuvaus: 'Pieni ulkoinen vastus ja reaktiivisuus',
      intensiteetti: '70–85%',
      toistot: 'Sarja-pituuksia, tempo vaihtelee',
      vari: '#f59e0b',
      piste_min: 55, piste_max: 69,
      ikatavoite: 'U14–U15',
      phv_rajoitus: 'Ei sovi PHV-kaudella; alle 14v → max S3'
    },
    4: {
      nro: 4, nimi: 'Huipentava', lyhyt: 'S4',
      kuvaus: 'Kuorma, nopeus, kognitiivinen haaste',
      intensiteetti: '85–95%',
      toistot: 'Maksimi-lähellä, laatu vaaditaan',
      vari: '#ef4444',
      piste_min: 70, piste_max: 84,
      ikatavoite: 'U16–U17',
      phv_rajoitus: 'Ei alle 14v, ei PHV-kaudella'
    },
    5: {
      nro: 5, nimi: 'Eliitti', lyhyt: 'S5',
      kuvaus: 'Maksimiteho, pelispesifi, itsenäinen arviointi',
      intensiteetti: '95–100%',
      toistot: 'Maksimi, pelitilanteessa',
      vari: '#a855f7',
      piste_min: 85, piste_max: 100,
      ikatavoite: 'U18+',
      phv_rajoitus: 'Ei alle 16v'
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // JAKSORAKENNE — 8 viikon makrosykli (Master v9:stä)
  // Pohja → Kehitys → Huipentuma, Stage-modif kasvaa
  // ═══════════════════════════════════════════════════════════════════
  var JAKSOT = {
    pohja: {
      koodi: 'pohja', nimi: 'Pohjavaihe',
      viikot: '1–3 / 8',
      kuvaus: 'Perustekniikka, volyymi keskeinen',
      stageModif: 0,
      vari: '#14b8a6'
    },
    kehitys: {
      koodi: 'kehitys', nimi: 'Kehitysvaihe',
      viikot: '4–6 / 8',
      kuvaus: 'Progressio — Stage +1',
      stageModif: 1,
      vari: '#f59e0b'
    },
    huipentuma: {
      koodi: 'huipentuma', nimi: 'Huipentumavaihe',
      viikot: '7–8 / 8',
      kuvaus: 'Lajiteho ja peli-integraatio — Stage +2',
      stageModif: 2,
      vari: '#a855f7'
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // MESOSYKLIT — kuukausiteemat (harjoitelogiikka_v4_2.js:stä)
  // Määrää MITÄ harjoitellaan, jakso määrää KUINKA intensiivisesti
  // ═══════════════════════════════════════════════════════════════════
  var MESOSYKLIT = {
    9:  { kk: 'Syyskuu',   teema: 'Kaka',     alue: 'Vastaanottaminen',   kuvaus: 'Ensimmäinen kosketus ratkaisee' },
    10: { kk: 'Lokakuu',   teema: 'Affelay',  alue: 'Dribbelin perusta',  kuvaus: 'Katse ylös, neljä perustaitoa' },
    11: { kk: 'Marraskuu', teema: 'Ronaldo',  alue: '1v1-liikkeet',       kuvaus: 'U-käännös, saksi, Cruyff' },
    12: { kk: 'Joulukuu',  teema: 'Beckham',  alue: 'Syöttäminen',        kuvaus: 'Sisäterä, jalkapöytä, pitkä passi' },
    1:  { kk: 'Tammikuu',  teema: 'Kaka II',  alue: 'Vastaanottaminen (vaativa)', kuvaus: 'Kierros 2 — paineessa' },
    2:  { kk: 'Helmikuu',  teema: 'Affelay II', alue: 'Dribbeli (vastustaja)', kuvaus: 'Aktiivinen puolustaja' },
    3:  { kk: 'Maaliskuu', teema: 'Ronaldo II', alue: '1v1 pelissä',      kuvaus: 'Pieni alue, feintit' },
    4:  { kk: 'Huhtikuu',  teema: 'Beckham II', alue: 'Syöttö pelissä',   kuvaus: 'Läpisyötöt, vapaat potkut' },
    5:  { kk: 'Toukokuu',  teema: 'Peli',     alue: 'Pelillinen integraatio', kuvaus: 'Kaikki yhdistetään' },
    6:  { kk: 'Kesäkuu',   teema: 'Peli',     alue: 'Kauden huipentuma',  kuvaus: 'Mittaus + palkinnot' },
    7:  { kk: 'Heinäkuu',  teema: 'Lepo',     alue: 'Omatoiminen',        kuvaus: 'Palautuminen + omatekniikka' },
    8:  { kk: 'Elokuu',    teema: 'Valmistava', alue: 'Kauteen valmistautuminen', kuvaus: 'Pohjakunto + testit' }
  };

  // ═══════════════════════════════════════════════════════════════════
  // KIELITASOT — kehitysvaiheen mukaan (harjoitelogiikka_v4_2.js:stä)
  // Sama harjoite, eri sanat
  // ═══════════════════════════════════════════════════════════════════
  var KIELITASOT = {
    leikkija: {
      koodi: 'leikkija', nimi: 'Leikkijä',
      ika_min: 8, ika_max: 12,
      tyyli: 'Konkreettinen, hauska, "leiki", "kokeile"',
      cue_esimerkki: 'Nopeasti eteen! Laske montako kertaa onnistut.',
      perusteluUX: 'Lapsi ei tarvitse teoreettista perustelua — tarinaa ja peliä.'
    },
    rakentaja: {
      koodi: 'rakentaja', nimi: 'Rakentaja',
      ika_min: 13, ika_max: 15,
      tyyli: 'Asiallinen, "tee näin", perustelu lyhyesti',
      cue_esimerkki: 'Nordic curl 3×5, hallittu lasku — hamstring oppii jarruttamaan.',
      perusteluUX: 'Nuori haluaa tietää MIKSI — lyhyt syy riittää.'
    },
    showcase: {
      koodi: 'showcase', nimi: 'Showcase',
      ika_min: 16, ika_max: 99,
      tyyli: 'Ammattimainen, termit ok, "mittaa", "kirjaa"',
      cue_esimerkki: 'Nordic hamstring eksentrinen 3×5. Mittaa asymmetria: oikea vs vasen >10% = korjausväli.',
      perusteluUX: 'Pelaaja arvioi itseään — data ja termistö osa identiteettiä.'
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // MATRIISI_13 — Everton 13 liikekategoriaa × 5 Stage
  // Lähde: TM_LiikehallintaMatrix_v2.html
  // ═══════════════════════════════════════════════════════════════════
  var MATRIISI_13 = [
    {
      nro: 1, koodi: 'kyykky', nimi: 'Kyykky',
      ketjut: ['DFL','SFL'],
      kuvaus: 'Perusliikekuvio — pohja voimalle ja laskeutumiselle',
      stages: {
        1: { nimi: 'Kehonpainokyykky', kuvaus: 'Kädet eteen, kantapäät maassa, selkä suora', phv: 'Sopii aina' },
        2: { nimi: 'Goblet-kyykky kevyt', kuvaus: 'Käsipaino rinnalla 2–4 kg', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Goblet + tempo', kuvaus: '3s alas, 1s ylös — eksentrinen paino', phv: 'Max PHV-kaudella' },
        4: { nimi: 'Takakyykky tanko', kuvaus: 'Tanko niskoilla, perustekniikka vahva', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Takakyykky kuorma', kuvaus: '1–3 toistoa, maksimilähellä', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 2, koodi: 'askelkyykky', nimi: 'Askelkyykky',
      ketjut: ['SFL','LL'],
      kuvaus: 'Yhden jalan voima — jalkapallon ydintaito',
      stages: {
        1: { nimi: 'Askelkyykky paikalla', kuvaus: 'Jalka eteen, polvi 90°', phv: 'Sopii aina' },
        2: { nimi: 'Askelkyykkykävely', kuvaus: 'Kävele eteenpäin, iso askel', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Askelkyykky + rotaatio', kuvaus: 'Yläkeho kiertyy etujalan yli', phv: 'Max PHV:ssä' },
        4: { nimi: 'Askelkyykky + hyppy', kuvaus: 'Räjähtävä vaihto ilmassa', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Askelkyykky + pallo + laukaus', kuvaus: 'Peliasento laukaukseen', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 3, koodi: 'lantionnosto', nimi: 'Lantionnosto',
      ketjut: ['SBL','DFL'],
      kuvaus: 'Takaketjun aktivointi — pakara + hamstring',
      stages: {
        1: { nimi: 'Glute bridge kaksi jalkaa', kuvaus: 'Selällään, polvet 90°, lantio ylös', phv: 'Sopii aina' },
        2: { nimi: 'Glute bridge yksi jalka', kuvaus: 'Toinen jalka ilmassa', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Hip thrust koroke', kuvaus: 'Olkapäät penkillä, liikeradan kasvu', phv: 'Max PHV:ssä' },
        4: { nimi: 'Hip thrust kuorma', kuvaus: 'Tanko lantiolla', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Nordic curl täysi', kuvaus: 'Ilman käsiapua — eliittitaito', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 4, koodi: 'push_pull', nimi: 'Push / Pull',
      ketjut: ['DFL','DIAG'],
      kuvaus: 'Ylävartalon voima — ei kuormita kasvualueita',
      stages: {
        1: { nimi: 'Push-up polvet maassa', kuvaus: 'Kädet leveämmällä kuin hartiat', phv: 'Sopii aina' },
        2: { nimi: 'Push-up täysi', kuvaus: 'Keho suorana', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Push-up + rivi', kuvaus: 'Käsipainoilla — rivi ylös laskun jälkeen', phv: 'Max PHV:ssä' },
        4: { nimi: 'Leuanveto avustettu', kuvaus: 'Kuminauha tai partneri', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Leuanveto täysi / dippi', kuvaus: 'Ilman apua', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 5, koodi: 'core', nimi: 'Keskivartalo',
      ketjut: ['DFL'],
      kuvaus: 'Pallea + syvä core — pohja kaikelle',
      stages: {
        1: { nimi: 'Hengitys + cat-cow', kuvaus: '360° palleahengitys, kissa-lehmä', phv: 'Paras PHV:ssä' },
        2: { nimi: 'Dead bug + lankku', kuvaus: 'Dead bug 3×5 + lankku 3×20s', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Sivulankku + bird dog', kuvaus: 'Sivulankku 3×20s + bird dog', phv: 'Sopii PHV:ssä' },
        4: { nimi: 'Karhukävely + matokävely', kuvaus: '10m karhukävely + matokävely', phv: 'Sopii PHV:ssä' },
        5: { nimi: 'Dragon flag / Russian twist kuorma', kuvaus: 'Eliittikuorma', phv: 'Ei alle 14v' }
      }
    },
    {
      nro: 6, koodi: 'hyppy_bilateral', nimi: 'Hyppy — kaksi jalkaa',
      ketjut: ['SFL','SBL'],
      kuvaus: 'Plyometria — räjähtävyys',
      stages: {
        1: { nimi: 'Hyppy paikaltaan pehmeä', kuvaus: 'Pomppu → pehmeä laskeutuminen', phv: 'Sopii aina' },
        2: { nimi: '5-loikka paikaltaan', kuvaus: 'Mittaa matka', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Kyykkyhyppy toistot', kuvaus: '3×8, pehmeä lasku', phv: 'Max PHV:ssä' },
        4: { nimi: 'Syväpudotushyppy 30 cm', kuvaus: 'Astu alas → hyppy ylös', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Syväpudotushyppy + 90° rotaatio', kuvaus: 'Lasku käännettynä', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 7, koodi: 'hyppy_unilateral', nimi: 'Hyppy — yhdellä jalalla',
      ketjut: ['LL','SBL'],
      kuvaus: 'YJ-plyometria — ACL:n suojaus',
      stages: {
        1: { nimi: 'YJ-pomppu paikalla', kuvaus: '8 pomppua per jalka', phv: 'Sopii aina' },
        2: { nimi: 'YJ-aitaloikka matala', kuvaus: 'Loikka esteen yli + pito', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'YJ-sivuloikka + pito', kuvaus: 'Sivu hyppy → kyykky 2s', phv: 'Max PHV:ssä' },
        4: { nimi: 'Reaktiivinen YJ sivuloikka', kuvaus: 'Ilman pitoa — rytmi', phv: 'Ei PHV:ssä' },
        5: { nimi: 'YJ + tasapainolauta', kuvaus: 'Epävakaalle alustalle', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 8, koodi: 'juoksutekniikka', nimi: 'Juoksutekniikka',
      ketjut: ['SBL','SFL'],
      kuvaus: 'Kiihdytys ja maksimivauhti',
      stages: {
        1: { nimi: 'Polvennostokävely', kuvaus: 'A-skip hidas', phv: 'Sopii aina' },
        2: { nimi: 'A-skip + B-skip', kuvaus: 'Dynaaminen rytmi', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Sprint 20 m', kuvaus: '3×20 m täysi palautus', phv: 'Sopii PHV:ssä' },
        4: { nimi: 'Sprint 40 m resistanced', kuvaus: 'Kuminauha-aktivointi', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Sprint + pallo + laukaus', kuvaus: 'Pelin konteksti', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 9, koodi: 'ryominta', nimi: 'Ryömintä',
      ketjut: ['DFL','SBL'],
      kuvaus: 'Karhukävely → hämähäkki → mato — dynaaminen core',
      stages: {
        1: { nimi: 'Karhukävely 5m', kuvaus: 'Polvet 2 cm lattiasta', phv: 'Paras PHV:ssä' },
        2: { nimi: 'Karhukävely 10m sivuttain', kuvaus: 'Vasen-oikea suunnat', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Hämähäkkikävely', kuvaus: 'Samanaikainen käsi + jalka', phv: 'Sopii PHV:ssä' },
        4: { nimi: 'Matokävely kyynärpäillä', kuvaus: 'Selällään, vedä', phv: 'Sopii PHV:ssä' },
        5: { nimi: 'Eläinrata — vapaa', kuvaus: 'Pelaaja valitsee liikkeet', phv: 'Sopii PHV:ssä' }
      }
    },
    {
      nro: 10, koodi: 'laskeutuminen_bi', nimi: 'Laskeutuminen — kaksi jalkaa',
      ketjut: ['SFL','SBL'],
      kuvaus: 'ACL-suojaus — GRF 3–5× kehonpaino',
      stages: {
        1: { nimi: 'Drop hyppy matala', kuvaus: 'Astu alas 20 cm + pehmeä lasku', phv: 'Sopii aina' },
        2: { nimi: 'Kyykkyhyppy + pysäytys', kuvaus: 'Pito 2s laskeutumisen jälkeen', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'Drop jump 30 cm', kuvaus: 'Välitön uusi hyppy', phv: 'Max PHV:ssä' },
        4: { nimi: 'Drop jump + 90°', kuvaus: 'Käännös ilmassa', phv: 'Ei PHV:ssä' },
        5: { nimi: 'Reaktiivinen drop + pallo', kuvaus: 'Pelaa heti laskun jälkeen', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 11, koodi: 'laskeutuminen_uni', nimi: 'Laskeutuminen — yhdellä jalalla',
      ketjut: ['LL','SBL'],
      kuvaus: 'YJ-laskeutuminen — valgus-kollapsin ehkäisy',
      stages: {
        1: { nimi: 'YJ-askellasku paikalla', kuvaus: 'Astu alas + polvi linjassa', phv: 'Sopii aina' },
        2: { nimi: 'YJ-lasku pitkältä', kuvaus: 'Hyppää eteen + pito 2s', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'YJ-sivulasku + pito', kuvaus: 'Sivuhyppy + stabilointi', phv: 'Max PHV:ssä' },
        4: { nimi: 'YJ-reaktio + lasku', kuvaus: 'Suunnanvaihto ilmassa', phv: 'Ei PHV:ssä' },
        5: { nimi: 'YJ + vastustaja', kuvaus: 'Pelillinen konteksti', phv: 'Ei alle 16v' }
      }
    },
    {
      nro: 12, koodi: 'suunnanmuutos', nimi: 'Suunnanmuutos',
      ketjut: ['LL','DIAG'],
      kuvaus: 'Ketteryys — T-rata, pujottelu',
      stages: {
        1: { nimi: 'Pujottelu kartioilla hidas', kuvaus: 'Tekniikka edellä', phv: 'Sopii aina' },
        2: { nimi: 'T-rata aika', kuvaus: 'Mittaa aika', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'T-rata pallolla', kuvaus: 'Pallo mukana', phv: 'Sopii PHV:ssä' },
        4: { nimi: 'Reaktio-SM + suunta', kuvaus: 'Partneri osoittaa', phv: 'Max PHV:ssä' },
        5: { nimi: '1v1 pieni alue', kuvaus: 'Feintit pelissä', phv: 'Ei alle 14v' }
      }
    },
    {
      nro: 13, koodi: 'tasapaino', nimi: 'Tasapaino + proprioseptio',
      ketjut: ['DFL','LL'],
      kuvaus: 'Yhden jalan seisonta → epävakaa alusta',
      stages: {
        1: { nimi: 'YJ-seisonta 30s', kuvaus: 'Toinen jalka ylhäällä', phv: 'Sopii aina' },
        2: { nimi: 'YJ silmät kiinni', kuvaus: '20s ilman näköä', phv: 'Sopii PHV:ssä' },
        3: { nimi: 'YJ + pallo', kuvaus: 'Heitä + kiinni + tasapaino', phv: 'Sopii PHV:ssä' },
        4: { nimi: 'Tasapainolauta', kuvaus: 'Epävakaa alusta + pallo', phv: 'Sopii PHV:ssä' },
        5: { nimi: 'BOSU + laukaus', kuvaus: 'Epävakaalta maaliin', phv: 'Ei alle 14v' }
      }
    }
  ];

  // ═══════════════════════════════════════════════════════════════════
  // APUFUNKTIOT — kielitaso + mesosykli iästä ja päivästä
  // ═══════════════════════════════════════════════════════════════════

  function _ikatyyppi(ika) {
    ika = ika || 13;
    if (ika <= 12) return 'leikkija';
    if (ika <= 15) return 'rakentaja';
    return 'showcase';
  }

  function _viikonNumero(d) {
    d = d || new Date();
    var t = new Date(d.getFullYear(), 0, 1);
    var pv = Math.floor((d - t) / 86400000);
    return Math.ceil((pv + t.getDay() + 1) / 7);
  }

  function _laskeMesosykli(d) {
    d = d || new Date();
    var kk = d.getMonth() + 1;
    return MESOSYKLIT[kk] || MESOSYKLIT[9];
  }

  function _laskeJakso(d) {
    var vk = _viikonNumero(d);
    var paikka = ((vk - 1) % 8) + 1;
    var j = paikka <= 3 ? JAKSOT.pohja
          : paikka <= 6 ? JAKSOT.kehitys
          : JAKSOT.huipentuma;
    return Object.assign({ jaksoPaikka: paikka }, j);
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTIT
  // ═══════════════════════════════════════════════════════════════════
  var TM = root.TM || (root.TM = {});
  TM.metodologia = {
    KETJUT: KETJUT,
    PIG: PIG,
    STAGES: STAGES,
    JAKSOT: JAKSOT,
    MESOSYKLIT: MESOSYKLIT,
    KIELITASOT: KIELITASOT,
    MATRIISI_13: MATRIISI_13,
    _ikatyyppi: _ikatyyppi,
    _laskeJakso: _laskeJakso,
    _laskeMesosykli: _laskeMesosykli,
    _viikonNumero: _viikonNumero,
    VERSIO: '1.0.0'
  };

})(typeof window !== 'undefined' ? window : this);
