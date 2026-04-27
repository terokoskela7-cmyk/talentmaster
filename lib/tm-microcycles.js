/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Bola Sempre -mikrosyklit  v2.0
   
   Benfican Seixal-akatemian periaate: pelaaja koskettaa palloa joka päivä
   useissa eri konteksteissa, ei vain yhdessä strukturoidussa sessiossa.
   
   4 mikrosykliä päivässä:
     🌅 AAMU       1 min   pallotuntuma + päivän herätys
     🎒 VÄLITUNTI  1 min   "salaliike" tai skannaus (1m² tilassa)
     ⚽ TREENI     20 min  viikon teema (Bellingham/Pedri/Vinicius/...)
     🌙 ILTA       2 min   1 klippi nykypelaajasta + 1 reflektiokysymys
   
   8 viikon makrosykli — synkronoituu tm-methodology.js:n JAKSOT-rakenteeseen:
     vk1 Bellingham — Vastaanotto         (DIAG)   pohja
     vk2 Pedri      — Dribbeli             (LL)     pohja
     vk3 Vinicius   — 1v1 suora            (SBL)    pohja
     vk4 Yamal      — 1v1 ahtaassa tilassa (LL)     kehitys
     vk5 Haaland    — Liike ilman palloa   (SFL)    kehitys
     vk6 Trent      — Syöttö               (DIAG)   kehitys
     vk7 Kane       — Maalinteko           (SFL)    huipentuma
     vk8 OMA        — Pelaajan oma valinta (vapaa)  huipentuma
   
   Suunnitteluperiaatteet (alle 12-vuotiaalle):
     - Yhdessä lauseessa, alle 10 sanaa
     - Ei valmentajan termejä — lapsen kieli
     - Voi tehdä kotona, 1m² tilassa, ilman valmentajaa
     - Aina valinta: pelaaja näkee 3 vaihtoehtoa per mikrosykli
     - Iltarituaali = ei palloa (mielikuva tai video)
   
   Kortin skeema (kanoninen — _validoi tarkistaa):
     {
       id: 'bel-aa-1',                      // <idoli>-<tyyppi>-<index>
       otsikko: 'Bellinghamin herätys',
       ohje_leikkija:  '...',                // < 10 sanaa
       ohje_rakentaja: '...',                // 13–15v, lyhyt perustelu
       ohje_showcase:  '...',                // 16+, termit ok
       tavoite: { tyyppi: 'kosketukset', maara: 30 },
       kesto_s: 60,
       tiesitko: {
         nyky:    'Bellingham harjoittelee tätä joka päivä Madridissa.',
         legenda: 'Kaká pomputteli aina ennen ottelua.',
         suomi:   'Pukki teki tämän jokaisena treeniaamuna HJK:lla.'
       }
     }
   
   Media (videoklipit, pelaajakuvat) → lib/tm-media.js
   Korttien koodi ei tiedä mediasta — UI hakee korttiId:llä TM.media:sta.
   
   Käyttö:
     <script src="lib/tm-microcycles.js"></script>
     window.TM.microcycles.haeMikrosyklit(viikkoTeema)
     window.TM.microcycles.IDOLIT
     window.TM.microcycles.NIMIKKO_VIIKOT
     window.TM.microcycles._validoi()        // dev-tarkistus
   ═══════════════════════════════════════════════════════════════════ */

(function(root) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // IDOLIT — viikon teemat × 3 sukupolvea
  // Lapsi näkee nykypelaajan, oppii legendan, samaistuu suomalaiseen
  // ═══════════════════════════════════════════════════════════════════
  var IDOLIT = {
    bellingham: {
      koodi: 'bellingham',
      etunimi: 'Jude', sukunimi: 'Bellingham',
      seura: 'Real Madrid', numero: 5,
      ydintaito: 'vastaanotto',
      tagline: 'Pallo tarttuu jalkaan kuin magneetti',
      legenda: { nimi: 'Kaká', seura: 'AC Milan / Real', vuosi: '2003–2014' },
      suomalainen: { nimi: 'Teemu Pukki', seura: 'Norwich / HJK' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    pedri: {
      koodi: 'pedri',
      etunimi: 'Pedri', sukunimi: 'González',
      seura: 'Barcelona', numero: 8,
      ydintaito: 'dribbeli',
      tagline: 'Katse ylös, pallo ei katoa',
      legenda: { nimi: 'Ibrahim Afellay', seura: 'PSV / Barcelona', vuosi: '2004–2018' },
      suomalainen: { nimi: 'Tim Sparv', seura: 'HJK / Suomen kapteeni' },
      vari: '#A50044', vastavari: '#FFFFFF'
    },
    vinicius: {
      koodi: 'vinicius',
      etunimi: 'Vinicius', sukunimi: 'Jr.',
      seura: 'Real Madrid', numero: 7,
      ydintaito: '1v1_suora',
      tagline: 'Yksi liike — vastustaja jää taakse',
      legenda: { nimi: 'Cristiano Ronaldo', seura: 'ManUtd / Real', vuosi: '2003–' },
      suomalainen: { nimi: 'Joel Pohjanpalo', seura: 'Venezia / huuhkajat' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    yamal: {
      koodi: 'yamal',
      etunimi: 'Lamine', sukunimi: 'Yamal',
      seura: 'Barcelona', numero: 19,
      ydintaito: '1v1_ahdas',
      tagline: 'Pieni tila — iso pelaaja',
      legenda: { nimi: 'Lionel Messi', seura: 'Barcelona / Inter Miami', vuosi: '2004–' },
      suomalainen: { nimi: 'Jari Litmanen', seura: 'Ajax / Barcelona / Liverpool' },
      vari: '#A50044', vastavari: '#FFFFFF'
    },
    haaland: {
      koodi: 'haaland',
      etunimi: 'Erling', sukunimi: 'Haaland',
      seura: 'Manchester City', numero: 9,
      ydintaito: 'liike_ilman_palloa',
      tagline: 'Ole valmiina ennen palloa',
      legenda: { nimi: 'Wesley Sneijder', seura: 'Inter / Real', vuosi: '2003–2019' },
      suomalainen: { nimi: 'Oliver Antman', seura: 'Go Ahead Eagles / huuhkajat' },
      vari: '#6CABDD', vastavari: '#FFFFFF'
    },
    trent: {
      koodi: 'trent',
      etunimi: 'Trent', sukunimi: 'Alexander-Arnold',
      seura: 'Real Madrid', numero: 12,
      ydintaito: 'syotto',
      tagline: 'Pallo lentää kaaressa minne haluat',
      legenda: { nimi: 'David Beckham', seura: 'ManUtd / Real', vuosi: '1992–2013' },
      suomalainen: { nimi: 'Robert Taylor', seura: 'Inter Miami / huuhkajat' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    kane: {
      koodi: 'kane',
      etunimi: 'Harry', sukunimi: 'Kane',
      seura: 'Bayern München', numero: 9,
      ydintaito: 'maalinteko',
      tagline: 'Maalin edessä rauhallisesti',
      legenda: { nimi: 'Ruud van Nistelrooy', seura: 'ManUtd / Real', vuosi: '1998–2012' },
      suomalainen: { nimi: 'Benjamin Källman', seura: 'Cremonese / huuhkajat' },
      vari: '#DC052D', vastavari: '#FFFFFF'
    }
  };

  // 8 vk rotaatio — synkronoituu JAKSOT-rakenteeseen.
  // vk8 = pelaajan oma valinta — UI tarjoaa idolinvalitsijaa.
  // jakso-kentta on informatiivinen — varsinainen jakso lasketaan tm-methodology.js:ssä.
  var NIMIKKO_VIIKOT = [
    { vk: 1, idoli: 'bellingham', teema: 'Vastaanotto',           ketju: 'DIAG', jakso: 'pohja' },
    { vk: 2, idoli: 'pedri',      teema: 'Dribbeli',              ketju: 'LL',   jakso: 'pohja' },
    { vk: 3, idoli: 'vinicius',   teema: '1v1 suora',             ketju: 'SBL',  jakso: 'pohja' },
    { vk: 4, idoli: 'yamal',      teema: '1v1 ahtaassa tilassa',  ketju: 'LL',   jakso: 'kehitys' },
    { vk: 5, idoli: 'haaland',    teema: 'Liike ilman palloa',    ketju: 'SFL',  jakso: 'kehitys' },
    { vk: 6, idoli: 'trent',      teema: 'Syöttö',                ketju: 'DIAG', jakso: 'kehitys' },
    { vk: 7, idoli: 'kane',       teema: 'Maalinteko',            ketju: 'SFL',  jakso: 'huipentuma' },
    { vk: 8, idoli: 'OMA',        teema: 'Oma valinta',           ketju: null,   jakso: 'huipentuma',
      kuvaus: 'Pelaaja valitsee maanantaina yhden 7 idolista — viikon ajan syvennytään siihen. ' +
              'Stage 4–5: voi yhdistää 2 idolia (esim. Bellingham + Trent).' }
  ];

  // ═══════════════════════════════════════════════════════════════════
  // MIKROSYKLI-TYYPIT — 4 päivittäistä rituaalia
  // ═══════════════════════════════════════════════════════════════════
  var TYYPIT = {
    aamu: {
      koodi: 'aamu', nimi: 'Aamu', emoji: '🌅',
      kellonaika: '06:30–08:30',
      kesto_min: 1, kesto_max: 2,
      konteksti: 'Ennen kouluun lähtöä — keittiössä, eteisessä tai pihalla',
      vaatimus: 'Pallo + 1 m² tilaa',
      tarkoitus: 'Aktivoi keho ja muistuta päivän teemasta'
    },
    valitunti: {
      koodi: 'valitunti', nimi: 'Välitunti', emoji: '🎒',
      kellonaika: '11:00–13:00',
      kesto_min: 1, kesto_max: 2,
      konteksti: 'Koulun pihalla tai luokassa',
      vaatimus: 'Joko koulupallo TAI ei mitään (mielikuvaharjoitus)',
      tarkoitus: 'Pidä taito mielessä päivän aikana'
    },
    treeni: {
      koodi: 'treeni', nimi: 'Päätreeni', emoji: '⚽',
      kellonaika: '15:00–18:00',
      kesto_min: 15, kesto_max: 25,
      konteksti: 'Kotipiha, jalkapallokenttä tai sali',
      vaatimus: 'Pallo + ~10 m² tilaa',
      tarkoitus: 'Viikon teeman strukturoitu harjoittelu'
    },
    ilta: {
      koodi: 'ilta', nimi: 'Ilta', emoji: '🌙',
      kellonaika: '20:30–21:30',
      kesto_min: 2, kesto_max: 3,
      konteksti: 'Sängyssä tai sohvalla — rauhoittuminen',
      vaatimus: 'Vain puhelin tai ajatus',
      tarkoitus: 'Reflektoi päivä, vahvista mielikuva'
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // KORTIT — 7 idolia × 3 mikrosykli-tyyppiä × 3 vaihtoehtoa = 63 korttia
  // Treeni hoidetaan tm-prescription.js:n PANKKI:sta — ei kortti tästä.
  //
  // Skeema:
  //   id, otsikko
  //   ohje_leikkija (alle 10 sanaa) / ohje_rakentaja / ohje_showcase
  //   tavoite { tyyppi, maara }
  //   kesto_s
  //   tiesitko { nyky, legenda, suomi }
  // ═══════════════════════════════════════════════════════════════════
  var KORTIT = {

    // ───────── VK 1 — BELLINGHAM (vastaanotto) ─────────
    bellingham: {
      aamu: [
        {
          id: 'bel-aa-1',
          otsikko: 'Bellinghamin herätys',
          ohje_leikkija: 'Pomputtele 30 kertaa. Älä pudota!',
          ohje_rakentaja: 'Pomputtelu sisäjalalla 30, vuorojaloin.',
          ohje_showcase: 'Sisäjalkajongleeraus 2×30 — vuoroin oikealla ja vasemmalla.',
          tavoite: { tyyppi: 'kosketukset', maara: 30 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham harjoittelee tätä 30 min joka päivä Madridissa.',
            legenda: 'Kaká pomputteli aina ennen ottelua. Lähes 100 kosketusta.',
            suomi:   'Pukki teki tämän jokaisena treeniaamuna HJK:lla.'
          }
        },
        {
          id: 'bel-aa-2',
          otsikko: 'Magneetti',
          ohje_leikkija: 'Heitä pallo seinään 10 kertaa. Ota kiinni jalalla.',
          ohje_rakentaja: 'Seinävastaanotto 10× — pallo pysähtyy heti jalkaan.',
          ohje_showcase: 'Seinäsyöttö 10× — 1. kosketus pysäyttää, ei karkaa.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham kuolettaa pallon 30 cm säteellä jalastaan.',
            legenda: 'Kaká: "1. kosketus on koko peli."',
            suomi:   'Pukki: "Vastaanotto on perusasia, joka ratkaisee."'
          }
        },
        {
          id: 'bel-aa-3',
          otsikko: 'Sisäjalka — ulkojalka',
          ohje_leikkija: 'Naputtele palloa 20 kertaa, sisä ja ulko vuorotellen.',
          ohje_rakentaja: 'Sisäjalka–ulkojalka tap 20× — pallo pieneen ympyrään.',
          ohje_showcase: 'Tik-tak in/out 20× — pallo pysyy 30 cm ympyrässä.',
          tavoite: { tyyppi: 'kosketukset', maara: 20 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham teki tätä 100× ennen koulua lapsuudessaan.',
            legenda: 'Kaká aloitti tip-tapin 6-vuotiaana São Paulossa.',
            suomi:   'Pukki harjoitteli tämän pakkasella kotipihassa.'
          }
        }
      ],
      valitunti: [
        {
          id: 'bel-va-1',
          otsikko: 'Salaliike — vastaanotto',
          ohje_leikkija: 'Pyydä kaveri heittämään pallo. Ota kiinni jalalla 5 kertaa.',
          ohje_rakentaja: 'Heittovastaanotto kaverin kanssa 5× — pallo putoaa hallintaan.',
          ohje_showcase: 'Ilmavastaanotto 5× — kuoletuskosketus, pallo pysähtyy 30 cm säteelle.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Real Madridissa tämä on perusliike ennen jokaista harjoitusta.',
            legenda: 'Kaká teki tämän 200× viikossa Milanon akatemiassa.',
            suomi:   'HJK:n akatemia harjoittelee tätä 4-vuotiaista alkaen.'
          }
        },
        {
          id: 'bel-va-2',
          otsikko: 'Skannaus — etsi maalit',
          ohje_leikkija: 'Etsi pihalta 5 paikkaa, mihin voisit potkaista maalin.',
          ohje_rakentaja: 'Tunnista 5 syöttölinjaa ympärilläsi. Sano ne ääneen.',
          ohje_showcase: 'Pre-scan: tunnista 5 vapaata kohdetta 30 sekunnissa.',
          tavoite: { tyyppi: 'havainnot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham katsoo ympärilleen 0,6× sekunnissa pelin aikana.',
            legenda: 'Xavi näki 5 syöttölinjaa joka kosketuksen aikana.',
            suomi:   'Sparv: "Suomalaiset voittavat skannauksessa, jos opettelevat."'
          }
        },
        {
          id: 'bel-va-3',
          otsikko: 'Mielessä — Bellingham',
          ohje_leikkija: 'Sulje silmät. Kuvittele että otat hienon kosketuksen.',
          ohje_rakentaja: 'Visualisoi 1. kosketus — pallo, jalka, asento. 60s.',
          ohje_showcase: 'Mentaaliharjoitus 60s: 1. kosketus paineessa, pallo hallintaan.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham: "Pelaan ottelun päässäni illalla ennen unta."',
            legenda: 'Tutkijat: mielikuva = 60% liikkeen oppimisesta.',
            suomi:   'Litmanen visualisoi syötöt aamulla ennen jokaista peliä.'
          }
        }
      ],
      ilta: [
        {
          id: 'bel-il-1',
          otsikko: 'Bellinghamin paras kosketus',
          ohje_leikkija: 'Katso 30 sekuntia Bellingham-klippiä. Mitä hän teki?',
          ohje_rakentaja: 'Katso klippi 30s, tunnista 1. kosketuksen tekniikka.',
          ohje_showcase: 'Analysoi klippi 30s — body shape ennen vastaanottoa.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Tämä klippi on Madridin akatemian opetusvideo.',
            legenda: 'Kaká:n 1. kosketus oli pohja koko AC Milanin pelitavalle 2003–07.',
            suomi:   'HJK:n analyysitiimi katsoo Bellinghamia viikoittain.'
          }
        },
        {
          id: 'bel-il-2',
          otsikko: 'Päivän paras kosketus',
          ohje_leikkija: 'Mikä oli paras kosketuksesi tänään? Kerro ääneen.',
          ohje_rakentaja: 'Reflektio: paras kosketus tänään ja miksi se onnistui.',
          ohje_showcase: 'Päivän reflektio — 1 onnistuminen + miksi se toimi.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham pitää päiväkirjaa onnistumisista joka ilta.',
            legenda: 'Benficassa pelaajat pitävät päiväkirjaa — 1 hyvä kosketus/päivä.',
            suomi:   'HJK U17 ottaa käyttöön reflektiopäiväkirjan kaudesta 2024.'
          }
        },
        {
          id: 'bel-il-3',
          otsikko: 'Huomenna',
          ohje_leikkija: 'Mieti 1 kosketus jonka haluat onnistua huomenna.',
          ohje_rakentaja: 'Aseta 1 tavoite huomiselle: vastaanotto-tilanne ja toteutus.',
          ohje_showcase: 'Huomisen tavoite — 1 spesifi vastaanotto + suoritus-cue.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham asettaa 3 mikrotavoitetta ennen jokaista peliä.',
            legenda: 'La Masia: pelaajat asettavat tavoitteen joka iltaa varten.',
            suomi:   'Pukki: "Yksi tavoite per päivä — silloin se onnistuu."'
          }
        }
      ]
    },

    // ───────── VK 2 — PEDRI (dribbeli) ─────────
    pedri: {
      aamu: [
        {
          id: 'ped-aa-1',
          otsikko: 'Pedrin tip-tap',
          ohje_leikkija: 'Naputtele palloa 40 kertaa. Pidä se lähellä!',
          ohje_rakentaja: 'Tip-tap sisäjalalla 40× pieneen ympyrään.',
          ohje_showcase: 'High-frequency dribble 2×20 — pallo 30 cm säteellä.',
          tavoite: { tyyppi: 'kosketukset', maara: 40 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Pedri tekee tämän 200× ennen Barcan harjoitusta.',
            legenda: 'Iniesta: "Pallo on koira — pidä se aina lähellä."',
            suomi:   'Sparv aloitti tip-tapin 7-vuotiaana Vaasassa.'
          }
        },
        {
          id: 'ped-aa-2',
          otsikko: 'Katse ylös',
          ohje_leikkija: 'Kuljeta palloa 20 askelta. Katso eteen, ei alas!',
          ohje_rakentaja: 'Kuljetus 20m katse ylhäällä, pallo lähellä.',
          ohje_showcase: 'Eyes-up dribble 20m — kontrolli ilman silmäkontaktia palloon.',
          tavoite: { tyyppi: 'askeleet', maara: 20 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Pedri ei katso palloa lähes koskaan dribblauksen aikana.',
            legenda: 'Iniesta sanoi: "Kun katsot palloa, peli loppuu."',
            suomi:   'Sparv: "Pää pystyssä — siinä on koko Suomen jalkapallon ydin."'
          }
        },
        {
          id: 'ped-aa-3',
          otsikko: 'Kahdeksikko',
          ohje_leikkija: 'Vie pallo jalkojen välistä 10 kertaa, kuin kahdeksikko.',
          ohje_rakentaja: 'Cone weave kahdeksikkona 10× — sisäjalka, ulkojalka.',
          ohje_showcase: 'Figure-8 weave 10× — pallo myötäjalalla joka käännöksellä.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Pedri harjoittelee tätä päivittäin La Masiassa.',
            legenda: 'Affelay teki tämän PSV:n akatemiassa lapsena.',
            suomi:   'Sparv: "Kahdeksikko opettaa molempia jalkoja yhtä aikaa."'
          }
        }
      ],
      valitunti: [
        {
          id: 'ped-va-1',
          otsikko: 'Salaliike — saksi',
          ohje_leikkija: 'Tee saksi 5 kertaa. Heittele jalkaa pallon yli!',
          ohje_rakentaja: 'Saksiliike 5× per jalka — paikallaan, ei pelitilannetta.',
          ohje_showcase: 'Step-over 5× per jalka — selvä rytmi, ei pallokontaktia.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Pedri käyttää saksia harvoin — siksi se yllättää.',
            legenda: 'Cristiano Ronaldo teki saksin ensi kertaa 8-vuotiaana.',
            suomi:   'Sparv: "Saksin merkitys on rytmi, ei pallon liikuttelu."'
          }
        },
        {
          id: 'ped-va-2',
          otsikko: 'Salaliike — drag back',
          ohje_leikkija: 'Vedä palloa taaksepäin 5 kertaa jalkapohjalla.',
          ohje_rakentaja: 'Drag back 5× — jalkapohja, käänny ja jatka toiseen suuntaan.',
          ohje_showcase: 'Drag back + turn 5× — 180° pivot, pallo jalassa.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal käytti tätä El Clásicossa 2024.',
            legenda: 'Iniesta: "Drag back on suomalaisen pelaajan paras ase."',
            suomi:   'Sparv käyttää drag backia keskikentällä jokaisessa pelissä.'
          }
        },
        {
          id: 'ped-va-3',
          otsikko: 'Mielessä — Pedri',
          ohje_leikkija: 'Kuvittele että dribblaat 3 vastustajan ohi.',
          ohje_rakentaja: 'Mielikuva 60s: 3 perättäistä 1v1-tilannetta.',
          ohje_showcase: 'Visualisointi: 3v1-skenario, pallo pysyy hallinnassa.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Pedri sanoi: "Pelaan 100 peliä päässäni viikossa."',
            legenda: 'Affelay aloitti mielikuvaharjoitukset 11-vuotiaana PSV:llä.',
            suomi:   'Litmanen visualisoi koko ottelun kotimatkalla.'
          }
        }
      ],
      ilta: [
        {
          id: 'ped-il-1',
          otsikko: 'Pedrin tunnusliike',
          ohje_leikkija: 'Katso 30 sekuntia Pedrin dribblausta. Mitä huomasit?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 toistuva liike.',
          ohje_showcase: 'Klippi-analyysi 30s — Pedrin signature-liike + konteksti.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Pedri ei katso palloa lähes koskaan dribblauksen aikana.',
            legenda: 'Affelay PSV–Barca-siirron jälkeen oli "Iniestan oppilas".',
            suomi:   'Sparv: "Katso Pedriä — sieltä saa Suomen pelitavan opit."'
          }
        },
        {
          id: 'ped-il-2',
          otsikko: 'Päivän paras dribblaus',
          ohje_leikkija: 'Onnistuitko ohittamaan jonkun tänään? Kerro miten.',
          ohje_rakentaja: 'Reflektio: paras 1v1-tilanne tänään, mikä ratkaisi.',
          ohje_showcase: 'Päivän paras 1v1 — liike, ajoitus, body feint.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Pedri kirjoittaa parhaat 1v1-tilanteet vihkoonsa.',
            legenda: 'La Masia: pelaaja arvioi joka päivä 1v1-tilastonsa.',
            suomi:   'Sparv: "Suomalaisen pelaajan etu on rohkeus 1v1:ssä."'
          }
        },
        {
          id: 'ped-il-3',
          otsikko: 'Yksi liike huomiseksi',
          ohje_leikkija: 'Valitse 1 liike, jonka kokeilet huomenna oikeasti.',
          ohje_rakentaja: 'Valitse 1 dribbaus-liike huomiseksi — tee se kerran.',
          ohje_showcase: 'Tavoite: 1 spesifi dribbaus-liike + pelitilanteinen konteksti.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'De Bruyne: "Kokeilen 1 uutta liikettä joka harjoituksessa."',
            legenda: 'Iniesta opetteli croquetan 11-vuotiaana — 1 liike viikossa.',
            suomi:   'Sparv: "Yksi rohkea liike per peli — siinä on kehittyminen."'
          }
        }
      ]
    },

    // ───────── VK 3 — VINICIUS (1v1 suora) ─────────
    vinicius: {
      aamu: [
        {
          id: 'vin-aa-1',
          otsikko: 'Viniciuksen kiihdytys',
          ohje_leikkija: 'Juokse 5 askelta täydellä vauhdilla pallon kanssa.',
          ohje_rakentaja: 'Räjähtävä lähtö pallolla 5× — 5–10 m kiihdytys.',
          ohje_showcase: 'Explosive first 5 steps — pallo + sprint, palautus täysi.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Vinicius juoksee 35 km/h täysivauhtia pallolla.',
            legenda: 'Cristiano Ronaldo: "Räjähtävyys on synnynnäinen + treenattu."',
            suomi:   'Pohjanpalo treenasi 5 askeleen lähtöä päivittäin nuorena.'
          }
        },
        {
          id: 'vin-aa-2',
          otsikko: 'Saksi + lähtö',
          ohje_leikkija: 'Tee saksi ja juokse heti! Kuin Vinicius.',
          ohje_rakentaja: 'Saksi + räjähtävä kiihdytys 5× — yhteensä yksi liike.',
          ohje_showcase: 'Step-over → 1st step explosive 5× — feint + acceleration.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Vinicius käyttää saksin + kiihdytyksen 8× per peli.',
            legenda: 'Cristiano: "Liike on turha jos sen jälkeen et juokse."',
            suomi:   'Pohjanpalo: "Liike + lähtö on yksi asia, ei kaksi."'
          }
        },
        {
          id: 'vin-aa-3',
          otsikko: 'Suunnanvaihto',
          ohje_leikkija: 'Juokse 5 askelta oikealle, sitten 5 vasemmalle. 3 kertaa.',
          ohje_rakentaja: 'Cut-and-go 3× — vauhti, suunnanvaihto, uusi vauhti.',
          ohje_showcase: 'Change of direction 3× — 180° at full speed, control.',
          tavoite: { tyyppi: 'toistot', maara: 3 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Vinicius vaihtaa suuntaa 90× per peli — eniten La Ligassa.',
            legenda: 'Cristiano: "Suunnanmuutos on enemmän kuin lihasta."',
            suomi:   'Pohjanpalo treenasi tämän jokaisen aamulenkin yhteydessä.'
          }
        }
      ],
      valitunti: [
        {
          id: 'vin-va-1',
          otsikko: 'Salaliike — Cruyff',
          ohje_leikkija: 'Tee Cruyff-käännös 5 kertaa. Pallo vedetään takajalalle!',
          ohje_rakentaja: 'Cruyff turn 5× per jalka — sisäjalka pallon takaa.',
          ohje_showcase: 'Cruyff turn 5× — körnerin valeurin uusi suunta.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Vinicius käyttää Cruyff-käännöstä laitahyökkääjänä viikoittain.',
            legenda: 'Johan Cruyff teki tämän liikkeen 1974 MM-kisoissa.',
            suomi:   'Litmanen oli mestari Cruyff-käännöksessä Ajaxilla.'
          }
        },
        {
          id: 'vin-va-2',
          otsikko: 'Skannaus — vastustajat',
          ohje_leikkija: 'Etsi pihalla 3 paikkaa, mihin voisit ohittaa vastustajan.',
          ohje_rakentaja: 'Tunnista 3 ohitus-tilannetta ympäristössä.',
          ohje_showcase: '3 1v1-skenario nykyhetkessä: tila + reitti + ratkaisu.',
          tavoite: { tyyppi: 'havainnot', maara: 3 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Vinicius näkee vastustajan jalat ennen kuin tämä liikkuu.',
            legenda: 'Cristiano: "Lue vastustaja ennen kuin pallo tulee."',
            suomi:   'Pohjanpalo: "Ohitus alkaa skannauksesta, ei liikkeestä."'
          }
        },
        {
          id: 'vin-va-3',
          otsikko: 'Mielessä — yksi ohitus',
          ohje_leikkija: 'Kuvittele että ohitat puolustajan ja teet maalin.',
          ohje_rakentaja: 'Mielikuva: 1v1-ohitus + lopputulos (laukaus tai keskitys).',
          ohje_showcase: 'Mentaaliharjoitus 60s — 1v1, body feint, finish.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Vinicius visualisoi 5 1v1-tilannetta ennen ottelua.',
            legenda: 'Brasilialaiset valmentajat: 30 min mielikuvaa päivässä.',
            suomi:   'Pohjanpalo: "Mielikuva on ilmaista treeniä — joka iltaan."'
          }
        }
      ],
      ilta: [
        {
          id: 'vin-il-1',
          otsikko: 'Viniciuksen voitto-ohitus',
          ohje_leikkija: 'Katso Viniciuksen ohitus-klippi 30 sekuntia.',
          ohje_rakentaja: 'Klippi 30s — Vinicius 1v1, mitä hän tekee ennen liikettä?',
          ohje_showcase: 'Analyysi 30s — Viniciuksen 1v1 trigger + decision.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Vinicius onnistuu 4/10 kerrasta — paras Euroopassa.',
            legenda: 'Cristiano teki 1v1 ohituksen 7000+ kertaa Real-urallaan.',
            suomi:   'Veikkausliigan analyysi: Pohjanpalon 1v1 = 32% onnistumista.'
          }
        },
        {
          id: 'vin-il-2',
          otsikko: 'Päivän rohkein hetki',
          ohje_leikkija: 'Olitko tänään rohkea pallon kanssa? Mihin uskalsit?',
          ohje_rakentaja: 'Reflektio: rohkein pelitilanne tänään, mitä uskalsit.',
          ohje_showcase: 'Päivän courage moment — riskinotto + outcome.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Vinicius: "Yksi rohkea liike per peli — silloin nautin."',
            legenda: 'Cruyff: "Rohkeus on taito, ei luonteenpiirre."',
            suomi:   'Pohjanpalo: "Suomalainen ei ole rohkea? — kokeile silti."'
          }
        },
        {
          id: 'vin-il-3',
          otsikko: 'Huominen 1v1',
          ohje_leikkija: 'Mieti 1 vastustaja jonka aiot ohittaa huomenna.',
          ohje_rakentaja: 'Aseta tavoite: 1 onnistunut 1v1-ohitus huomenna.',
          ohje_showcase: 'Tavoite: 1 spesifi 1v1-tilanne + valittu liike.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Mbappé asettaa 3 mikrotavoitetta ennen jokaista peliä.',
            legenda: 'Cristiano kirjoittaa pelitavoitteet ennen ottelua.',
            suomi:   'Pohjanpalo: "Yksi 1v1 per peli onnistuu — riittää aluksi."'
          }
        }
      ]
    },

    // ───────── VK 4 — YAMAL (1v1 ahdas) ─────────
    yamal: {
      aamu: [
        {
          id: 'yam-aa-1',
          otsikko: 'Yamalin pikkukuljetus',
          ohje_leikkija: 'Kuljeta palloa pieneen ympyrään 30 sekuntia.',
          ohje_rakentaja: 'Tight dribble 30s — pallo pysyy 50 cm säteellä.',
          ohje_showcase: 'Confined dribbling 30s — kosketukset 1× sekunnissa.',
          tavoite: { tyyppi: 'sekunnit', maara: 30 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal harjoitteli tätä 4-vuotiaana keittiön lattialla.',
            legenda: 'Messi pelasi koko lapsuuden 4×4 m alueella Rosariossa.',
            suomi:   'Litmanen: "Pieni tila — pakottaa luovuuteen."'
          }
        },
        {
          id: 'yam-aa-2',
          otsikko: 'La Croqueta',
          ohje_leikkija: 'Vie pallo sisäjalalta toiselle 10 kertaa nopeasti.',
          ohje_rakentaja: 'La Croqueta 10× — 1 askel, vaihto sisäjalalta sisäjalalle.',
          ohje_showcase: 'La Croqueta 10× — Iniestan signature, 1 step transfer.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal käyttää croquetaa La Masian opetuksen mukaan.',
            legenda: 'Iniesta voitti MM-finaalin tällä liikkeellä 2010.',
            suomi:   'Litmanen oppi croquetan Ajaxilla 1992 — vei sen Suomeen.'
          }
        },
        {
          id: 'yam-aa-3',
          otsikko: 'Pull push',
          ohje_leikkija: 'Vedä pallo taakse, työnnä eteen. 10 kertaa.',
          ohje_rakentaja: 'Pull push 10× — jalkapohja taakse, sisäjalka eteen.',
          ohje_showcase: 'Pull–push combo 10× — Messi-signature, fast change of pace.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal teki tämän liikkeen El Clásicossa 2024.',
            legenda: 'Messi käytti tätä 7000+ kertaa Barcelona-urallaan.',
            suomi:   'Litmanen: "Pull push — yksinkertainen ja tehokas."'
          }
        }
      ],
      valitunti: [
        {
          id: 'yam-va-1',
          otsikko: 'Salaliike — kahdeksikko',
          ohje_leikkija: 'Tee jaloillasi kahdeksikko ilman palloa 10 kertaa.',
          ohje_rakentaja: 'Footwork kahdeksikko 10× — pelkkä jalkojen kuvio.',
          ohje_showcase: 'Footwork pattern 10× — body coordination ilman palloa.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal harjoittelee footworkin ilman palloa joka aamu.',
            legenda: 'Brasilian akatemiat: footwork ennen palloa.',
            suomi:   'Litmanen: "Jalkojen rytmi on ennen pallon hallintaa."'
          }
        },
        {
          id: 'yam-va-2',
          otsikko: 'Skannaus — pieni tila',
          ohje_leikkija: 'Etsi pihalta 3 pientä paikkaa, mihin mahdut juuri.',
          ohje_rakentaja: 'Tunnista 3 ahdasta tilaa — kuvittele 1v1 niissä.',
          ohje_showcase: 'Tight space recognition 3× + ratkaisuvaihtoehdot.',
          tavoite: { tyyppi: 'havainnot', maara: 3 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal pelaa parhaiten 5×5 m alueella.',
            legenda: 'Messi: "Pieni tila on minulle iso tila."',
            suomi:   'Litmanen: "Pelaa pieni tila, kasvat suureksi."'
          }
        },
        {
          id: 'yam-va-3',
          otsikko: 'Mielessä — pakopaikka',
          ohje_leikkija: 'Kuvittele että karkaat 2 vastustajalta pienessä tilassa.',
          ohje_rakentaja: 'Mielikuva: pakene 2v1-ahdistuksesta yhdellä liikkeellä.',
          ohje_showcase: 'Mental rehearsal — escape from press, 1 touch + acceleration.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal visualisoi pressing-tilanteita iltaisin.',
            legenda: 'Iniesta: "Painostuksesta ulos = yksi kosketus, ei kaksi."',
            suomi:   'Litmanen: "Pakene aina eteenpäin — ei taaksepäin."'
          }
        }
      ],
      ilta: [
        {
          id: 'yam-il-1',
          otsikko: 'Yamalin liike Realia vastaan',
          ohje_leikkija: 'Katso Yamal-klippi 30 s. Mitä jaloilla tapahtui?',
          ohje_rakentaja: 'Klippi 30s — Yamal 1v1, identifioi liikesarja.',
          ohje_showcase: 'Analyysi 30s — Yamalin sequence + body feints.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal teki El Clásicossa 2024 maalin 17-vuotiaana.',
            legenda: 'Messin nuoruusvideoita on tutkittu 1000+ kertaa La Masiassa.',
            suomi:   'Litmanen oli ensimmäinen suomalainen joka pelasi El Clásicossa.'
          }
        },
        {
          id: 'yam-il-2',
          otsikko: 'Päivän pieni hetki',
          ohje_leikkija: 'Mihin pieneen tilaan mahduit tänään palloa kanssa?',
          ohje_rakentaja: 'Reflektio: pienin tila tänään + miten selvisit.',
          ohje_showcase: 'Tightest space today — solution + confidence level.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal: "Pieni tila opettaa enemmän kuin iso kenttä."',
            legenda: 'La Masia: 4×4 m on opetusalue alle 10-vuotiaille.',
            suomi:   'Litmanen: "Suomalainen kasvaa pelin älyssä, ei koossa."'
          }
        },
        {
          id: 'yam-il-3',
          otsikko: 'Yksi temppu huomiseksi',
          ohje_leikkija: 'Valitse 1 temppu, jonka teet huomenna.',
          ohje_rakentaja: 'Valitse 1 1v1-liike huomiseksi — tee se rohkeasti.',
          ohje_showcase: 'Holvaa 1 spesifi liike huomiseksi + treenitilanne.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Yamal kokeilee 1 uutta liikettä joka harjoituksessa.',
            legenda: 'Messi: "Liike on vain väline — pelaa, älä esitä."',
            suomi:   'Litmanen oppi pull push -liikkeen 11-vuotiaana Reipasissa.'
          }
        }
      ]
    },

    // ───────── VK 5 — HAALAND (liike ilman palloa) ─────────
    haaland: {
      aamu: [
        {
          id: 'haa-aa-1',
          otsikko: 'Haalandin starttisykäys',
          ohje_leikkija: 'Seiso paikallaan. Lähde juoksuun 5 sekunnissa, 5 kertaa.',
          ohje_rakentaja: 'Seisova lähtö 5× — räjähtävä 5–8 m ilman palloa.',
          ohje_showcase: 'Standing start sprint 5× — ensimmäiset 3 askelta maksimi.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland sprintaa 36 km/h Premier Leaguessa.',
            legenda: 'Sneijder: "Liike ilman palloa = 80% pelistä."',
            suomi:   'Antman juoksee 60+ sprinttiä ottelussa Eredivisiessä.'
          }
        },
        {
          id: 'haa-aa-2',
          otsikko: 'Kohotus jalalla',
          ohje_leikkija: 'Hypi paikallaan 30 sekuntia. Polvet ylös!',
          ohje_rakentaja: 'High knees 30s — räjähtävä reaktiivisuus, etujalka aktiivinen.',
          ohje_showcase: 'High knees 30s — frequency >60 per puoli, SFL aktivoitu.',
          tavoite: { tyyppi: 'sekunnit', maara: 30 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland tekee high kneesin ennen jokaista ottelua.',
            legenda: 'Sneijder lämmitteli aina 5 min reaktiivisilla liikkeillä.',
            suomi:   'Antman: "Räjähtävyys on aamulla, ei iltapäivällä."'
          }
        },
        {
          id: 'haa-aa-3',
          otsikko: 'Suora juoksu',
          ohje_leikkija: 'Juokse 10 metriä suoraan kovaa. Tee se 3 kertaa.',
          ohje_rakentaja: 'Sprintti 10m × 3 — täysi vauhti, palautus 30s.',
          ohje_showcase: 'Linear sprint 3×10m — max velocity, full recovery.',
          tavoite: { tyyppi: 'toistot', maara: 3 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Haaland sprintaa 4× per minuutti ottelussa.',
            legenda: 'Sneijder: "Älä koskaan kävele — juokse tai seiso."',
            suomi:   'Antman: "Sprintti = päätös, ei lihaksen kunto."'
          }
        }
      ],
      valitunti: [
        {
          id: 'haa-va-1',
          otsikko: 'Salaliike — väistö',
          ohje_leikkija: 'Astu sivuun 5 kertaa, kuin väistäisit puolustajaa.',
          ohje_rakentaja: 'Lateral step 5× — sivuaskel pakaroista, ei polvista.',
          ohje_showcase: 'Lateral evasion 5× — gluteus medius (LL) aktivoitu.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland väistää keskuspuolustajaa 8× per peli.',
            legenda: 'Sneijder: "Hyökkääjän pelin ydin on irti pääseminen."',
            suomi:   'Antman tekee tämän jokaisen ottelun lämmittelyssä.'
          }
        },
        {
          id: 'haa-va-2',
          otsikko: 'Skannaus — vapaa tila',
          ohje_leikkija: 'Etsi pihalta 3 paikkaa, mihin voisit juosta tyhjään.',
          ohje_rakentaja: 'Tunnista 3 vapaata aluetta — minne juokset jos saisit syötön?',
          ohje_showcase: 'Off-ball scanning 3× — running lanes + receiver position.',
          tavoite: { tyyppi: 'havainnot', maara: 3 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland katsoo vapaata tilaa 0,8× sekunnissa pelin aikana.',
            legenda: 'Sneijder: "Hyvä juoksu on 30% sitä, että näet sen ensin."',
            suomi:   'Antman: "Tyhjä tila — siinä Suomen kavuun saa peliaikaa."'
          }
        },
        {
          id: 'haa-va-3',
          otsikko: 'Mielessä — Haaland',
          ohje_leikkija: 'Kuvittele että juokset tyhjään tilaan ja saat syötön.',
          ohje_rakentaja: 'Mielikuva: irrottautuva juoksu + maali yhdellä kosketuksella.',
          ohje_showcase: 'Visualisointi: off-ball run + 1-touch finish.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland visualisoi 10 maalia ennen jokaista peliä.',
            legenda: 'Sneijder: "Maali alkaa juoksusta — ei laukauksesta."',
            suomi:   'Antman: "Päässä tehty maali on jo puoleksi tehty."'
          }
        }
      ],
      ilta: [
        {
          id: 'haa-il-1',
          otsikko: 'Haalandin tyhjään juoksu',
          ohje_leikkija: 'Katso 30 s Haaland-klippiä. Mihin hän juoksi?',
          ohje_rakentaja: 'Klippi 30s — tunnista juoksu ja sen ajoitus syöttöön.',
          ohje_showcase: 'Analyysi 30s — off-ball run timing + defensive line break.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haalandin juoksun ajoitus on opetusvideo joka akatemiassa.',
            legenda: 'Sneijderin syöttö + juoksu = 2010 MM-finaalin pelitapa.',
            suomi:   'Antmanin nopeus on Eredivisien top-5 hyökkääjä-tilastossa.'
          }
        },
        {
          id: 'haa-il-2',
          otsikko: 'Päivän paras juoksu',
          ohje_leikkija: 'Mikä oli paras juoksusi tänään ilman palloa?',
          ohje_rakentaja: 'Reflektio: paras off-ball run tänään + saitko sen palkkion.',
          ohje_showcase: 'Best off-ball today — timing + space + reward.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland: "Yhdestäkään juoksusta ei ole turhaa, vaikka et saa palloa."',
            legenda: 'Sneijder: "10 turhaa juoksua palkitsee 1 maalin."',
            suomi:   'Antman: "Suomalainen pelaa puoli askelta liian myöhässä."'
          }
        },
        {
          id: 'haa-il-3',
          otsikko: 'Yksi juoksu huomiseksi',
          ohje_leikkija: 'Mieti 1 paikka mihin juokset huomenna ennen palloa.',
          ohje_rakentaja: 'Aseta tavoite: 1 ennakoiva juoksu huomenna.',
          ohje_showcase: 'Tavoite: 1 anticipatory run + spesifi pelitilanne.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland kirjoittaa juoksutavoitteet vihkoonsa joka päivä.',
            legenda: 'Sneijder asetti aina 5 juoksutavoitetta peliä kohden.',
            suomi:   'Antman: "Kolme juoksua per puoliaika — silloin olen tyytyväinen."'
          }
        }
      ]
    },

    // ───────── VK 6 — TRENT (syöttö) ─────────
    trent: {
      aamu: [
        {
          id: 'tre-aa-1',
          otsikko: 'Trentin sisäjalka',
          ohje_leikkija: 'Potkaise palloa seinään 20 kertaa sisäjalalla.',
          ohje_rakentaja: 'Sisäjalkasyöttö seinään 20× — pallo palaa suoraan.',
          ohje_showcase: 'Inside foot pass 20× — tarkkuus + tukijalan asento.',
          tavoite: { tyyppi: 'toistot', maara: 20 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Trent harjoittelee 200 sisäjalkapassia päivässä.',
            legenda: 'Beckham potkaisi 500 sisäjalkapassia päivässä lapsena.',
            suomi:   'Taylor: "Sisäjalka on syötön perusta — ei pikaratkaisu."'
          }
        },
        {
          id: 'tre-aa-2',
          otsikko: 'Tukijalka',
          ohje_leikkija: 'Aseta tukijalka pallon viereen ennen jokaista syöttöä.',
          ohje_rakentaja: 'Tukijalan paikka 20× — tarkasti pallon vieressä, ei takana.',
          ohje_showcase: 'Plant foot placement 20× — alignment with target.',
          tavoite: { tyyppi: 'toistot', maara: 20 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Trent: "Tukijalka tekee passin, ei potkujalka."',
            legenda: 'Beckham: "90% syötöstä on jo ennen kosketusta."',
            suomi:   'Taylor: "Tukijalan virhe = passin virhe."'
          }
        },
        {
          id: 'tre-aa-3',
          otsikko: 'Pitkä passi',
          ohje_leikkija: 'Heitä pallo ilmaan ja potkaise nilkalla, 5 kertaa.',
          ohje_rakentaja: 'Wreef-potku 5× — pallo nousee suoraan ja kauas.',
          ohje_showcase: 'Instep drive 5× — laces, knee over ball, follow-through.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Trent syöttää 70m tarkasti — Beckham syötti 75m.',
            legenda: 'Beckhamin allekirjoitus oli kaareva pitkä passi.',
            suomi:   'Taylor: "Pitkä passi avaa peli — siksi treeni joka päivä."'
          }
        }
      ],
      valitunti: [
        {
          id: 'tre-va-1',
          otsikko: 'Salaliike — kaareva passi',
          ohje_leikkija: 'Kuvittele potkaisevasi pallon kaaressa kohteeseen.',
          ohje_rakentaja: 'Kaareva passi mielikuvana 5× — sisäjalka, kierre.',
          ohje_showcase: 'Curl pass mental rehearsal 5× — bend angle + spin axis.',
          tavoite: { tyyppi: 'mielikuva', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Trentillä on 18 assistia kaudessa — Premier League ME.',
            legenda: 'Beckhamin allekirjoitus oli kaareva passi.',
            suomi:   'Taylor: "Kierre lähtee tukijalasta, ei potkujalasta."'
          }
        },
        {
          id: 'tre-va-2',
          otsikko: 'Skannaus — syöttölinjat',
          ohje_leikkija: 'Etsi pihalta 5 paikkaa, mihin voisit syöttää pallon.',
          ohje_rakentaja: 'Tunnista 5 syöttölinjaa — määritä etäisyys silmämääräisesti.',
          ohje_showcase: '5 passing lanes — distance + obstacle assessment.',
          tavoite: { tyyppi: 'havainnot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Trent näkee 3+ syöttölinjaa joka kosketuksen aikana.',
            legenda: 'Xavi näki 5 syöttölinjaa joka kosketuksen aikana.',
            suomi:   'Taylor: "Syöttö alkaa pään kääntämisestä, ei potkusta."'
          }
        },
        {
          id: 'tre-va-3',
          otsikko: 'Mielessä — Trent',
          ohje_leikkija: 'Kuvittele että teet maaliin syötön kuin Trent.',
          ohje_rakentaja: 'Mielikuva: assist-syöttö 30 m matkalta — kohde + kaari.',
          ohje_showcase: 'Visualisointi: defense-splitting pass — vector + timing.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Trent: "Mielessäni näen passin ennen kuin pallo tulee."',
            legenda: 'Beckham harjoitteli mielikuvaa 10 min ennen jokaista peliä.',
            suomi:   'Taylor: "Mielikuva on ilmainen treeni, joka iltaan."'
          }
        }
      ],
      ilta: [
        {
          id: 'tre-il-1',
          otsikko: 'Trentin maagiset syötöt',
          ohje_leikkija: 'Katso 30 s Trent-klippiä. Miltä syötöt näyttivät?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 syöttötekniikka.',
          ohje_showcase: 'Analyysi 30s — Trentin pass type + decision context.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Trent oppi tämän tekniikan 9-vuotiaana Liverpoolin akatemiassa.',
            legenda: 'Beckhamin frikut ovat YouTuben katsotuimpia futisvideoita.',
            suomi:   'Taylorin syöttötilastot ovat huuhkajien kärkeä.'
          }
        },
        {
          id: 'tre-il-2',
          otsikko: 'Päivän paras syöttö',
          ohje_leikkija: 'Mikä oli paras syöttösi tänään? Mihin se meni?',
          ohje_rakentaja: 'Reflektio: paras syöttö tänään + lopputulos.',
          ohje_showcase: 'Best pass today — receiver position + outcome quality.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Trent kirjoittaa parhaat syötöt vihkoonsa joka peli.',
            legenda: 'Beckham: "Yksi hyvä syöttö per peli muistetaan vuosia."',
            suomi:   'Taylor: "Suomalainen pelaaja syöttää liian varmasti."'
          }
        },
        {
          id: 'tre-il-3',
          otsikko: 'Yksi syöttö huomiseksi',
          ohje_leikkija: 'Mieti 1 hieno syöttö, jonka teet huomenna.',
          ohje_rakentaja: 'Aseta tavoite: 1 vaikea syöttö huomenna onnistuu.',
          ohje_showcase: 'Tavoite: 1 challenging pass + receiver + ratkaiseva ajoitus.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Bellingham: "Mieti syöttö ennen kuin saat pallon."',
            legenda: 'Beckham: "Joka päivä yksi syöttö, jota ei vielä ole tehnyt."',
            suomi:   'Taylor: "Yksi rohkea syöttö per peli — siinä kehittyminen."'
          }
        }
      ]
    },

    // ───────── VK 7 — KANE (maalinteko) ─────────
    kane: {
      aamu: [
        {
          id: 'kan-aa-1',
          otsikko: 'Kanen rauhallinen lopetus',
          ohje_leikkija: 'Potkaise pallo seinään 10 kertaa rauhallisesti.',
          ohje_rakentaja: 'Hallittu maalipotku 10× seinään — sijoitus ennen vauhtia.',
          ohje_showcase: 'Composed finish 10× — accuracy edellä, low velocity.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Kanen 1. liiga-maali tuli 5 sekunnissa peliin tultua.',
            legenda: 'Van Nistelrooy: "Maali on rauhallisuuden, ei voiman ratkaisu."',
            suomi:   'Källman: "Hallittu kosketus voittaa kovaan kaiverrettu."'
          }
        },
        {
          id: 'kan-aa-2',
          otsikko: 'Heikolla jalalla',
          ohje_leikkija: 'Potkaise heikolla jalalla 10 kertaa. Yritä osua!',
          ohje_rakentaja: 'Heikon jalan laukaus 10× — tarkkuus, ei voimaa.',
          ohje_showcase: 'Weak foot finishing 10× — placement + balance.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Kane treenasi heikon jalan vuosi 17-vuotiaana — 2h/päivä.',
            legenda: 'Van Nistelrooy treenasi vasemman jalan kahdesti viikossa.',
            suomi:   'Källman: "Heikko jalka on kuin tukijalan apu — ei vihollinen."'
          }
        },
        {
          id: 'kan-aa-3',
          otsikko: 'Kosketus + laukaus',
          ohje_leikkija: 'Heitä pallo, ota kiinni, laukaise. 5 kertaa.',
          ohje_rakentaja: '1. kosketus + laukaus 5× — kaksi kosketusta yhteensä.',
          ohje_showcase: 'Set + finish 5× — 1st touch direction + immediate strike.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Kane tekee 80% maaleistaan kahdessa kosketuksessa.',
            legenda: 'Van Nistelrooy: "Maalintekijä on tehokas, ei tyylikäs."',
            suomi:   'Källman: "Maalintekijä päättää laukauksen ennen kosketusta."'
          }
        }
      ],
      valitunti: [
        {
          id: 'kan-va-1',
          otsikko: 'Salaliike — varvaspotku',
          ohje_leikkija: 'Heitä pallo, kosketa varpaalla 5 kertaa.',
          ohje_rakentaja: 'Toe-poke harjoitus 5× — nopein laukaustyyppi.',
          ohje_showcase: 'Toe-poke technique 5× — fastest release in tight space.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Kanen on kokeillut varvaspotkua 16-vuotiaana akatemiassa.',
            legenda: 'Ronaldo Brasilialainen voitti MM-finaalin varvaspotkulla 2002.',
            suomi:   'Källman teki varvaspotkulla maalin Cremoneselle 2024.'
          }
        },
        {
          id: 'kan-va-2',
          otsikko: 'Skannaus — maalivahti',
          ohje_leikkija: 'Etsi 3 paikkaa pihasta, joihin voisit "tehdä maalin".',
          ohje_rakentaja: 'Tunnista 3 sijoitus-vaihtoehtoa — kuvittele maalivahti.',
          ohje_showcase: 'Goalkeeper position scan + 3 placement options.',
          tavoite: { tyyppi: 'havainnot', maara: 3 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Kane katsoo maalivahdin asentoa 0,3 s ennen laukausta.',
            legenda: 'Van Nistelrooy: "Lue maalivahti — älä yritä yllättää."',
            suomi:   'Källman: "Maalivahti tekee päätöksen ennen sinua."'
          }
        },
        {
          id: 'kan-va-3',
          otsikko: 'Mielessä — maalintekijä',
          ohje_leikkija: 'Kuvittele että teet maalin tärkeässä pelissä.',
          ohje_rakentaja: 'Mielikuva: maali rangaistuspotkun jälkeen tai pelistä.',
          ohje_showcase: 'Mental rehearsal — pressure goal scenario + composure.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Kane visualisoi 5 maalia ennen jokaista ottelua.',
            legenda: 'Van Nistelrooy: "Olen tehnyt jokaisen maalini päässäni ensin."',
            suomi:   'Källman: "Mielikuvitus on maalintekijän paras ase."'
          }
        }
      ],
      ilta: [
        {
          id: 'kan-il-1',
          otsikko: 'Kanen maalitähtihetket',
          ohje_leikkija: 'Katso 30 s Kane-maaleja. Miten hän osuu?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 toistuva maalintekotapa.',
          ohje_showcase: 'Klippi-analyysi — Kanen finishing patterns + body shape.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Kanen 30+ maalia/kausi — yli 10 vuotta peräkkäin.',
            legenda: 'Van Nistelrooy: 150 Premier League -maalia 219 ottelussa.',
            suomi:   'Källmanin maalitilasto Veikkausliigassa on 0,5 maalia/peli.'
          }
        },
        {
          id: 'kan-il-2',
          otsikko: 'Päivän paras laukaus',
          ohje_leikkija: 'Mikä oli paras potkusi tänään? Osuiko se?',
          ohje_rakentaja: 'Reflektio: paras laukaus tänään + miksi se onnistui.',
          ohje_showcase: 'Best strike today — technique + outcome + adjustment.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Kane: "Yksi hyvä laukaus opettaa enemmän kuin 10 huonoa."',
            legenda: 'Van Nistelrooy kirjoitti laukaustilastot vihkoonsa joka peli.',
            suomi:   'Källman: "Yksi maali muuttaa pelaajan urallaan."'
          }
        },
        {
          id: 'kan-il-3',
          otsikko: 'Yksi maali huomiseksi',
          ohje_leikkija: 'Tehkö huomenna maalin? Kuvittele se nyt.',
          ohje_rakentaja: 'Aseta tavoite: 1 maali tai laukaus huomenna.',
          ohje_showcase: 'Tavoite huomiselle: 1 spesifi laukaustilanne + tekniikka.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Haaland kirjoittaa maalitavoitteet vihkoonsa joka päivä.',
            legenda: 'Van Nistelrooy: "Aamulla 3 maalia mielessä — illalla 1 lisää."',
            suomi:   'Källman: "Yksi maali per peli — siinä on tavoite."'
          }
        }
      ]
    }

  };

  // ═══════════════════════════════════════════════════════════════════
  // VOLYYMI EFEKTIIVISEN STAGEN MUKAAN
  // S1–S2 = 3 mikrosykliä (aamu + treeni + ilta), välitunti pois
  // S3    = 4 mikrosykliä (kaikki neljä)
  // S4–S5 = 4 mikrosykliä + bonus (haastevariantit)
  // ═══════════════════════════════════════════════════════════════════
  var VOLYYMI = {
    1: { tyypit: ['aamu', 'treeni', 'ilta'],              tavoiteKosketukset: 800,  bonus: false },
    2: { tyypit: ['aamu', 'treeni', 'ilta'],              tavoiteKosketukset: 1200, bonus: false },
    3: { tyypit: ['aamu', 'valitunti', 'treeni', 'ilta'], tavoiteKosketukset: 1800, bonus: false },
    4: { tyypit: ['aamu', 'valitunti', 'treeni', 'ilta'], tavoiteKosketukset: 2400, bonus: true },
    5: { tyypit: ['aamu', 'valitunti', 'treeni', 'ilta'], tavoiteKosketukset: 3000, bonus: true }
  };

  // ═══════════════════════════════════════════════════════════════════
  // APIT
  // ═══════════════════════════════════════════════════════════════════

  function _viikonNumero(d) {
    d = d || new Date();
    var t = new Date(d.getFullYear(), 0, 1);
    var pv = Math.floor((d - t) / 86400000);
    return Math.ceil((pv + t.getDay() + 1) / 7);
  }

  // 8 vk rotaatio. Alkaa vk 36 (syyskuu, kauden alku).
  function laskeViikkoTeema(paivamaara) {
    paivamaara = paivamaara || new Date();
    var vk = _viikonNumero(paivamaara);
    var paikka = ((vk - 36) % 8 + 8) % 8 + 1; // 1..8
    var pohja = NIMIKKO_VIIKOT[paikka - 1];
    // Rikasta idoliNimi-kentällä (UI-mukavuus)
    var idoliKoodi = pohja.idoli;
    var idoliNimi;
    if (idoliKoodi === 'OMA') {
      idoliNimi = 'Oma valinta';
    } else {
      var i = IDOLIT[idoliKoodi];
      idoliNimi = i ? (i.etunimi + ' ' + i.sukunimi) : idoliKoodi;
    }
    return {
      vk: pohja.vk,
      idoli: pohja.idoli,
      idoliNimi: idoliNimi,
      teema: pohja.teema,
      ketju: pohja.ketju,
      jakso: pohja.jakso,
      kuvaus: pohja.kuvaus || null
    };
  }

  // Hae yhden mikrosykli-tyypin kortit annetusta idolista.
  // Vk8:lle välitetään valittu idoli erikseen (oma_valinta).
  function haeKortit(idoliKoodi, tyyppi) {
    if (!idoliKoodi || idoliKoodi === 'OMA') return [];
    var idoliKortit = KORTIT[idoliKoodi];
    if (!idoliKortit) return [];
    return idoliKortit[tyyppi] || [];
  }

  // Hae päivän mikrosyklit profiilin perusteella.
  // Profiili voi sisältää:
  //   efektiivinenStage: 1–5
  //   kielitaso: 'leikkija' | 'rakentaja' | 'showcase'
  //   oma_valinta_idoli: 'bellingham' | ... (vk8:lle)
  //   tiesitko_painotus: 'nyky' | 'legenda' | 'suomi' | 'rotaatio' (oletus rotaatio)
  function generoiPaivanMikrosyklit(paivamaara, profiili) {
    profiili = profiili || {};
    paivamaara = paivamaara || new Date();
    var efektiivinenStage = profiili.efektiivinenStage || 2;
    var kielitaso = profiili.kielitaso || 'leikkija';
    var paivanArkilainen = paivamaara.getDay(); // 0=su, 1=ma, ..., 6=la
    var viikkoTeema = laskeViikkoTeema(paivamaara);

    // Vk8 — pelaaja valitsee idolin
    var efektiivinenIdoliKoodi = viikkoTeema.idoli;
    var omaValinta = false;
    if (viikkoTeema.idoli === 'OMA') {
      efektiivinenIdoliKoodi = profiili.oma_valinta_idoli || 'bellingham';
      omaValinta = true;
    }
    var idoli = IDOLIT[efektiivinenIdoliKoodi];
    var volyymi = VOLYYMI[efektiivinenStage] || VOLYYMI[2];

    // Sunnuntai = lepo, vain ilta-reflektio
    if (paivanArkilainen === 0) {
      var iltaKortti = _valitseKortti(efektiivinenIdoliKoodi, 'ilta', paivamaara);
      return [{
        tyyppi: 'ilta',
        tyyppiData: TYYPIT.ilta,
        idoli: idoli,
        viikkoTeema: viikkoTeema,
        omaValinta: omaValinta,
        valittu: iltaKortti,
        vaihtoehdot: haeKortit(efektiivinenIdoliKoodi, 'ilta'),
        kielitaso: kielitaso,
        ohje: _valitseOhje(iltaKortti, kielitaso),
        tiesitko: _valitseTiesitko(iltaKortti, paivamaara, profiili.tiesitko_painotus),
        leporukaPaiva: true
      }];
    }

    // Tavallinen päivä — generoi mikrosyklit volyymin mukaan
    var mikrosyklit = volyymi.tyypit.map(function(tyyppi) {
      // Treeni hoidetaan tm-prescription.js:n PANKKI:sta — ei kortti tästä
      if (tyyppi === 'treeni') {
        return {
          tyyppi: 'treeni',
          tyyppiData: TYYPIT.treeni,
          idoli: idoli,
          viikkoTeema: viikkoTeema,
          omaValinta: omaValinta,
          valittu: null,
          vaihtoehdot: [],
          kielitaso: kielitaso,
          ohje: 'Päätreeni — generoidaan PANKKI:sta (' + viikkoTeema.teema + ')',
          tiesitko: null,
          delegoi: 'tm-prescription.js'
        };
      }

      var valittu = _valitseKortti(efektiivinenIdoliKoodi, tyyppi, paivamaara);
      return {
        tyyppi: tyyppi,
        tyyppiData: TYYPIT[tyyppi],
        idoli: idoli,
        viikkoTeema: viikkoTeema,
        omaValinta: omaValinta,
        valittu: valittu,
        vaihtoehdot: haeKortit(efektiivinenIdoliKoodi, tyyppi),
        kielitaso: kielitaso,
        ohje: _valitseOhje(valittu, kielitaso),
        tiesitko: _valitseTiesitko(valittu, paivamaara, profiili.tiesitko_painotus)
      };
    });

    return mikrosyklit;
  }

  // Valitse kortti deterministisesti päivämäärän perusteella.
  function _valitseKortti(idoliKoodi, tyyppi, paivamaara) {
    var kortit = haeKortit(idoliKoodi, tyyppi);
    if (kortit.length === 0) return null;
    var d = paivamaara || new Date();
    var idx = (d.getDate() + d.getMonth()) % kortit.length;
    return kortit[idx];
  }

  function _valitseOhje(kortti, kielitaso) {
    if (!kortti) return '';
    if (kielitaso === 'leikkija' && kortti.ohje_leikkija) return kortti.ohje_leikkija;
    if (kielitaso === 'rakentaja' && kortti.ohje_rakentaja) return kortti.ohje_rakentaja;
    if (kielitaso === 'showcase' && kortti.ohje_showcase) return kortti.ohje_showcase;
    return kortti.ohje_leikkija || kortti.ohje_rakentaja || kortti.ohje_showcase || '';
  }

  // Valitse tiesitko-rivi.
  // painotus: 'nyky' | 'legenda' | 'suomi' | 'rotaatio' (oletus)
  // Rotaatio: arkipäivän mukaan (ma-ke nyky, to-pe legenda, la suomi, su nyky)
  function _valitseTiesitko(kortti, paivamaara, painotus) {
    if (!kortti || !kortti.tiesitko) return null;
    var t = kortti.tiesitko;
    if (typeof t === 'string') return t; // legacy
    if (painotus && t[painotus]) return t[painotus];
    var d = paivamaara || new Date();
    var ark = d.getDay(); // 0=su, 6=la
    if (ark === 6) return t.suomi || t.nyky || t.legenda;
    if (ark >= 1 && ark <= 3) return t.nyky || t.legenda || t.suomi;
    return t.legenda || t.nyky || t.suomi;
  }

  // Arvioi päivän kosketukset valittujen korttien perusteella.
  function arvioiKosketukset(mikrosyklit) {
    if (!mikrosyklit || !mikrosyklit.length) return 0;
    var summa = 0;
    mikrosyklit.forEach(function(ms) {
      if (!ms.valittu) return;
      var t = ms.valittu.tavoite;
      if (!t) return;
      // Karkeat arviot: kosketus = 1, toisto = 4 kosketusta, askel = 2
      if (t.tyyppi === 'kosketukset') summa += t.maara;
      else if (t.tyyppi === 'toistot') summa += t.maara * 4;
      else if (t.tyyppi === 'askeleet') summa += t.maara * 2;
      else if (t.tyyppi === 'sekunnit') summa += Math.floor(t.maara * 1.5);
    });
    // Treeni lisää ~600 kosketusta keskimäärin
    var treenissa = mikrosyklit.some(function(ms) { return ms.tyyppi === 'treeni'; });
    if (treenissa) summa += 600;
    return summa;
  }

  // ═══════════════════════════════════════════════════════════════════
  // VALIDAATIO — ajetaan kerran modulin lataamisen jälkeen kehityksessä
  // ═══════════════════════════════════════════════════════════════════
  function _validoi() {
    var virheet = [];
    var idoliKoodit = Object.keys(IDOLIT);
    var nahdytIdt = {};
    var prefiksit = {
      bellingham: 'bel', pedri: 'ped', vinicius: 'vin',
      yamal: 'yam', haaland: 'haa', trent: 'tre', kane: 'kan'
    };
    idoliKoodit.forEach(function(ik) {
      if (!KORTIT[ik]) {
        virheet.push('IDOLI ilman kortteja: ' + ik);
        return;
      }
      ['aamu', 'valitunti', 'ilta'].forEach(function(tyyppi) {
        var arr = KORTIT[ik][tyyppi];
        if (!arr || arr.length !== 3) {
          virheet.push(ik + '/' + tyyppi + ': odotettu 3 korttia, sai ' + (arr ? arr.length : 0));
          return;
        }
        arr.forEach(function(k, i) {
          // 1) id muoto + duplikaatti
          if (!k.id) virheet.push(ik + '/' + tyyppi + '[' + i + ']: id puuttuu');
          else if (nahdytIdt[k.id]) virheet.push('Duplikaatti id: ' + k.id);
          else nahdytIdt[k.id] = true;
          if (k.id && prefiksit[ik] && k.id.indexOf(prefiksit[ik] + '-') !== 0) {
            virheet.push(k.id + ': prefiksi ei vastaa idolia ' + ik);
          }
          // 2) pakolliset kentät
          ['otsikko', 'ohje_leikkija', 'ohje_rakentaja', 'ohje_showcase', 'tavoite', 'tiesitko'].forEach(function(kentta) {
            if (!k[kentta]) virheet.push(k.id + ': pakollinen kenttä puuttuu — ' + kentta);
          });
          // 3) Leikkijä-ohje < 10 sanaa
          if (k.ohje_leikkija) {
            var sanat = k.ohje_leikkija.trim().split(/\s+/).length;
            if (sanat > 10) virheet.push(k.id + ': Leikkijä-ohje yli 10 sanaa (' + sanat + ')');
          }
          // 4) tiesitko-objektin rakenne
          if (k.tiesitko) {
            if (typeof k.tiesitko !== 'object') {
              virheet.push(k.id + ': tiesitko ei ole objekti');
            } else {
              ['nyky', 'legenda', 'suomi'].forEach(function(taso) {
                if (!k.tiesitko[taso]) virheet.push(k.id + ': tiesitko.' + taso + ' puuttuu');
              });
            }
          }
        });
      });
    });
    return { ok: virheet.length === 0, virheet: virheet, korttiMaara: Object.keys(nahdytIdt).length };
  }

  // ═══════════════════════════════════════════════════════════════════
  // EXPORTIT
  // ═══════════════════════════════════════════════════════════════════
  var TM = root.TM || (root.TM = {});
  TM.microcycles = {
    IDOLIT: IDOLIT,
    NIMIKKO_VIIKOT: NIMIKKO_VIIKOT,
    TYYPIT: TYYPIT,
    KORTIT: KORTIT,
    VOLYYMI: VOLYYMI,
    laskeViikkoTeema: laskeViikkoTeema,
    haeKortit: haeKortit,
    generoiPaivanMikrosyklit: generoiPaivanMikrosyklit,
    arvioiKosketukset: arvioiKosketukset,
    _valitseTiesitko: _valitseTiesitko,
    _validoi: _validoi,
    VERSIO: '2.0.0'
  };

})(typeof window !== 'undefined' ? window : this);
