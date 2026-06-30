/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Bola Sempre -mikrosyklit  v2.0

   Huippuakatemioiden periaate: pelaaja koskettaa palloa joka päivä
   useissa eri konteksteissa, ei vain yhdessä strukturoidussa sessiossa.

   4 mikrosykliä päivässä:
     🌅 AAMU       1 min   pallotuntuma + päivän herätys
     🎒 VÄLITUNTI  1 min   "salaliike" tai skannaus (1m² tilassa)
     ⚽ TREENI     20 min  viikon teema (arkkityypit: Maestro/Shadowstep/Railgun/...)
     🌙 ILTA       2 min   1 tekniikkaklippi (neutraali) + 1 reflektiokysymys

   8 viikon makrosykli — synkronoituu tm-methodology.js:n JAKSOT-rakenteeseen:
     vk1 Maestro       — Vastaanotto         (DIAG)   pohja
     vk2 Shadowstep    — Dribbeli             (LL)     pohja
     vk3 Railgun       — 1v1 suora            (SBL)    pohja
     vk4 Velho         — 1v1 ahtaassa tilassa (LL)     kehitys
     vk5 Titan         — Liike ilman palloa   (SFL)    kehitys
     vk6 Arkkitehti    — Syöttö               (DIAG)   kehitys
     vk7 Viimeistelijä — Maalinteko           (SFL)    huipentuma
     vk8 OMA           — Pelaajan oma valinta (vapaa)  huipentuma

   Suunnitteluperiaatteet (alle 12-vuotiaalle):
     - Yhdessä lauseessa, alle 10 sanaa
     - Ei valmentajan termejä — lapsen kieli
     - Voi tehdä kotona, 1m² tilassa, ilman valmentajaa
     - Aina valinta: pelaaja näkee 3 vaihtoehtoa per mikrosykli
     - Iltarituaali = ei palloa (mielikuva tai video)

   Kortin skeema (kanoninen — _validoi tarkistaa):
     {
       id: 'bel-aa-1',                      // <arkkityyppiavain>-<tyyppi>-<index>
       otsikko: 'Maestron herätys',
       ohje_leikkija:  '...',                // < 10 sanaa
       ohje_rakentaja: '...',                // 13–15v, lyhyt perustelu
       ohje_showcase:  '...',                // 16+, termit ok
       tavoite: { tyyppi: 'kosketukset', maara: 30 },
       kesto_s: 60,
       tiesitko: {
         nyky:    'Moni maailman huippu harjoittelee tätä joka päivä.',
         legenda: 'Menneen sukupolven mestarit pomputtelivat aina ennen ottelua.',
         suomi:   'Suomalaishuiput tekevät tämän jokaisena treeniaamuna.'
       }
     }

   #91 (2026-06-30, Linjaus A): EI oikeita pelaaja-/seuranimiä lapselle näkyvässä sisällössä.
   Idolit korvattu tuotteen arkkityypeillä (§14) + geneerisillä kehyksillä; tarina + opetus säilytetty.
   Sisäiset objektiavaimet (bellingham/pedri/...) säilyvät — vain näyttösisältö anonymisoitu.

   Media (videoklipit, kuvat) → lib/tm-media.js
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
  // IDOLIT — viikon teemat (arkkityypit §14). Avaimet säilyvät (#91), nimet anonymisoitu.
  // Lapsi näkee arkkityypin, oppii ajattoman opetuksen, samaistuu — ilman oikeita nimiä.
  // ═══════════════════════════════════════════════════════════════════
  var IDOLIT = {
    bellingham: {
      koodi: 'bellingham',
      etunimi: 'Maestro', sukunimi: '',
      seura: '', numero: 5,
      ydintaito: 'vastaanotto',
      tagline: 'Pallo tarttuu jalkaan kuin magneetti',
      legenda: { nimi: 'menneen ajan vastaanoton mestari', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs suomalainen huippuhyökkääjä', seura: '' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    pedri: {
      koodi: 'pedri',
      etunimi: 'Shadowstep', sukunimi: '',
      seura: '', numero: 8,
      ydintaito: 'dribbeli',
      tagline: 'Katse ylös, pallo ei katoa',
      legenda: { nimi: 'klassinen keskikentän taituri', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs suomalainen keskikenttäpelaaja', seura: '' },
      vari: '#A50044', vastavari: '#FFFFFF'
    },
    vinicius: {
      koodi: 'vinicius',
      etunimi: 'Railgun', sukunimi: '',
      seura: '', numero: 7,
      ydintaito: '1v1_suora',
      tagline: 'Yksi liike — vastustaja jää taakse',
      legenda: { nimi: 'menneen sukupolven laitatähti', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs suomalainen hyökkääjä', seura: '' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    yamal: {
      koodi: 'yamal',
      etunimi: 'Velho', sukunimi: '',
      seura: '', numero: 19,
      ydintaito: '1v1_ahdas',
      tagline: 'Pieni tila — iso pelaaja',
      legenda: { nimi: 'ahtaan tilan klassikkonero', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs suomalainen taituri', seura: '' },
      vari: '#A50044', vastavari: '#FFFFFF'
    },
    haaland: {
      koodi: 'haaland',
      etunimi: 'Titan', sukunimi: '',
      seura: '', numero: 9,
      ydintaito: 'liike_ilman_palloa',
      tagline: 'Ole valmiina ennen palloa',
      legenda: { nimi: 'menneen ajan keskikentän moottori', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs nopea suomalainen hyökkääjä', seura: '' },
      vari: '#6CABDD', vastavari: '#FFFFFF'
    },
    trent: {
      koodi: 'trent',
      etunimi: 'Arkkitehti', sukunimi: '',
      seura: '', numero: 12,
      ydintaito: 'syotto',
      tagline: 'Pallo lentää kaaressa minne haluat',
      legenda: { nimi: 'legendaarinen syöttöjen mestari', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs suomalainen maajoukkuepelaaja', seura: '' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    kane: {
      koodi: 'kane',
      etunimi: 'Viimeistelijä', sukunimi: '',
      seura: '', numero: 9,
      ydintaito: 'maalinteko',
      tagline: 'Maalin edessä rauhallisesti',
      legenda: { nimi: 'klassinen maalikone', seura: '', vuosi: '' },
      suomalainen: { nimi: 'eräs suomalainen maalintekijä', seura: '' },
      vari: '#DC052D', vastavari: '#FFFFFF'
    }
  };

  // 8 vk rotaatio — synkronoituu JAKSOT-rakenteeseen.
  // vk8 = pelaajan oma valinta — UI tarjoaa teemanvalitsijaa.
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
      kuvaus: 'Pelaaja valitsee maanantaina yhden 7 teemasta — viikon ajan syvennytään siihen. ' +
              'Stage 4–5: voi yhdistää 2 teemaa (esim. Maestro + Arkkitehti).' }
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
  // KORTIT — 7 teemaa × 3 mikrosykli-tyyppiä × 3 vaihtoehtoa = 63 korttia
  // Treeni hoidetaan tm-prescription.js:n PANKKI:sta — ei kortti tästä.
  //
  // Skeema:
  //   id, otsikko
  //   ohje_leikkija (alle 10 sanaa) / ohje_rakentaja / ohje_showcase
  //   tavoite { tyyppi, maara }
  //   kesto_s
  //   tiesitko { nyky, legenda, suomi }   (anonymisoitu #91 — opetus säilyy, ei nimiä)
  // ═══════════════════════════════════════════════════════════════════
  var KORTIT = {

    // ───────── VK 1 — MAESTRO (vastaanotto) ─────────
    bellingham: {
      aamu: [
        {
          id: 'bel-aa-1',
          otsikko: 'Maestron herätys',
          ohje_leikkija: 'Pomputtele 30 kertaa. Älä pudota!',
          ohje_rakentaja: 'Pomputtelu sisäjalalla 30, vuorojaloin.',
          ohje_showcase: 'Sisäteräjongleeraus 2×30 — vuoroin oikealla ja vasemmalla.',
          tavoite: { tyyppi: 'kosketukset', maara: 30 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni maailman huippu harjoittelee tätä noin 30 min joka päivä.',
            legenda: 'Menneen ajan mestarit pomputtelivat aina ennen ottelua — lähes 100 kosketusta.',
            suomi:   'Suomalaishuiput tekevät tämän jokaisena treeniaamuna.'
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
            nyky:    'Parhaat kuolettavat pallon noin 30 cm säteellä jalastaan.',
            legenda: 'Klassikko opetti: "1. kosketus on koko peli."',
            suomi:   'Suomalaisvalmentajat muistuttavat: vastaanotto on perusasia, joka ratkaisee.'
          }
        },
        {
          id: 'bel-aa-3',
          otsikko: 'Sisäterä — ulkojalka',
          ohje_leikkija: 'Naputtele palloa 20 kertaa, sisä ja ulko vuorotellen.',
          ohje_rakentaja: 'Sisäterä–ulkojalka tap 20× — pallo pieneen ympyrään.',
          ohje_showcase: 'Tik-tak in/out 20× — pallo pysyy 30 cm ympyrässä.',
          tavoite: { tyyppi: 'kosketukset', maara: 20 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni huippu teki tätä satoja kertoja ennen koulua jo lapsena.',
            legenda: 'Eräs klassikkonero aloitti tip-tapin jo 6-vuotiaana.',
            suomi:   'Moni suomalaishuippu harjoitteli tämän pakkasella kotipihalla.'
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
            nyky:    'Huippuseuroissa tämä on perusliike ennen jokaista harjoitusta.',
            legenda: 'Eräs mestari teki tämän satoja kertoja viikossa akatemiassaan.',
            suomi:   'Suomalaisakatemiat harjoittelevat tätä jo pienestä pitäen.'
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
            nyky:    'Huiput katsovat ympärilleen kerran reilussa puolessa sekunnissa pelin aikana.',
            legenda: 'Klassinen keskikentän mestari näki 5 syöttölinjaa joka kosketuksen aikana.',
            suomi:   'Suomalaisvalmentaja: "Skannaus on opittavissa — siinä voi voittaa."'
          }
        },
        {
          id: 'bel-va-3',
          otsikko: 'Mielessä — vastaanotto',
          ohje_leikkija: 'Sulje silmät. Kuvittele että otat hienon kosketuksen.',
          ohje_rakentaja: 'Visualisoi 1. kosketus — pallo, jalka, asento. 60s.',
          ohje_showcase: 'Mentaaliharjoitus 60s: 1. kosketus paineessa, pallo hallintaan.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Eräs huippu kuvaili: "Pelaan ottelun päässäni illalla ennen unta."',
            legenda: 'Tutkijat: mielikuva = noin 60 % liikkeen oppimisesta.',
            suomi:   'Moni suomalaishuippu visualisoi syötöt aamulla ennen peliä.'
          }
        }
      ],
      ilta: [
        {
          id: 'bel-il-1',
          otsikko: 'Päivän paras kosketus — klippi',
          ohje_leikkija: 'Katso 30 sekuntia tekniikkaklippiä. Mitä pelaaja teki?',
          ohje_rakentaja: 'Katso klippi 30s, tunnista 1. kosketuksen tekniikka.',
          ohje_showcase: 'Analysoi klippi 30s — body shape ennen vastaanottoa.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Tällaiset klipit ovat huippuakatemioiden opetusvideoita.',
            legenda: 'Erään mestarin 1. kosketus oli kokonaisen joukkueen pelitavan pohja.',
            suomi:   'Suomalaiset analyysitiimit katsovat huippujen vastaanottoja viikoittain.'
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
            nyky:    'Moni huippu pitää päiväkirjaa onnistumisista joka ilta.',
            legenda: 'Huippuakatemioissa pelaajat kirjaavat yhden hyvän kosketuksen päivässä.',
            suomi:   'Suomalaisakatemiat ottavat reflektiopäiväkirjoja yhä laajemmin käyttöön.'
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
            nyky:    'Moni huippu asettaa muutaman mikrotavoitteen ennen jokaista peliä.',
            legenda: 'Huippuakatemioissa pelaajat asettavat tavoitteen joka iltaa varten.',
            suomi:   'Suomalaisvalmentaja: "Yksi tavoite per päivä — silloin se onnistuu."'
          }
        }
      ]
    },

    // ───────── VK 2 — SHADOWSTEP (dribbeli) ─────────
    pedri: {
      aamu: [
        {
          id: 'ped-aa-1',
          otsikko: 'Shadowstepin tip-tap',
          ohje_leikkija: 'Naputtele palloa 40 kertaa. Pidä se lähellä!',
          ohje_rakentaja: 'Tip-tap sisäjalalla 40× pieneen ympyrään.',
          ohje_showcase: 'High-frequency dribble 2×20 — pallo 30 cm säteellä.',
          tavoite: { tyyppi: 'kosketukset', maara: 40 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Huiput tekevät tätä satoja kertoja ennen harjoitusta.',
            legenda: 'Klassikko opetti: "Pallo on koira — pidä se aina lähellä."',
            suomi:   'Moni suomalaishuippu aloitti tip-tapin jo 7-vuotiaana.'
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
            nyky:    'Parhaat dribblaajat eivät katso palloa lähes koskaan.',
            legenda: 'Klassikko sanoi: "Kun katsot palloa, peli loppuu."',
            suomi:   'Suomalaisvalmentaja: "Pää pystyssä — siinä on koko pelin ydin."'
          }
        },
        {
          id: 'ped-aa-3',
          otsikko: 'Kahdeksikko',
          ohje_leikkija: 'Vie pallo jalkojen välistä 10 kertaa, kuin kahdeksikko.',
          ohje_rakentaja: 'Cone weave kahdeksikkona 10× — sisäterä, ulkojalka.',
          ohje_showcase: 'Figure-8 weave 10× — pallo myötäjalalla joka käännöksellä.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Huiput harjoittelevat tätä päivittäin akatemioissaan.',
            legenda: 'Eräs taituri teki tämän jo lapsena akatemian toistoissa.',
            suomi:   'Suomalaisvalmentaja: "Kahdeksikko opettaa molempia jalkoja yhtä aikaa."'
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
            nyky:    'Huiput käyttävät saksia harvoin — siksi se yllättää.',
            legenda: 'Moni klassikko teki ensimmäisen saksinsa jo lapsena.',
            suomi:   'Suomalaisvalmentaja: "Saksin merkitys on rytmi, ei pallon liikuttelu."'
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
            nyky:    'Moni huippu käyttää tätä ahtaassa tilassa joka ottelussa.',
            legenda: 'Klassikko opetti: "Drag back on keskikenttäpelaajan paras ase."',
            suomi:   'Suomalaishuiput käyttävät drag backia keskikentällä joka pelissä.'
          }
        },
        {
          id: 'ped-va-3',
          otsikko: 'Mielessä — dribbeli',
          ohje_leikkija: 'Kuvittele että dribblaat 3 vastustajan ohi.',
          ohje_rakentaja: 'Mielikuva 60s: 3 perättäistä 1v1-tilannetta.',
          ohje_showcase: 'Visualisointi: 3v1-skenario, pallo pysyy hallinnassa.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Eräs huippu kuvaili: "Pelaan 100 peliä päässäni viikossa."',
            legenda: 'Moni mestari aloitti mielikuvaharjoitukset jo teininä.',
            suomi:   'Moni suomalaishuippu visualisoi koko ottelun ennen peliä.'
          }
        }
      ],
      ilta: [
        {
          id: 'ped-il-1',
          otsikko: 'Tunnusliike — klippi',
          ohje_leikkija: 'Katso 30 sekuntia dribblausklippiä. Mitä huomasit?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 toistuva liike.',
          ohje_showcase: 'Klippi-analyysi 30s — toistuva signature-liike + konteksti.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat dribblaajat eivät katso palloa lähes koskaan.',
            legenda: 'Moni taituri oppi tyylinsä seuraamalla edellistä sukupolvea.',
            suomi:   'Suomalaisvalmentaja: "Katso huippuja — sieltä saa pelitavan opit."'
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
            nyky:    'Moni huippu kirjaa parhaat 1v1-tilanteet vihkoonsa.',
            legenda: 'Huippuakatemioissa pelaaja arvioi joka päivä omat 1v1-tilanteensa.',
            suomi:   'Suomalaisvalmentaja: "Pelaajan etu on rohkeus 1v1:ssä."'
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
            nyky:    'Eräs huippu kuvaili: "Kokeilen 1 uutta liikettä joka harjoituksessa."',
            legenda: 'Klassikko opetteli tunnusliikkeensä yksi liike viikossa -tahtiin.',
            suomi:   'Suomalaisvalmentaja: "Yksi rohkea liike per peli — siinä on kehittyminen."'
          }
        }
      ]
    },

    // ───────── VK 3 — RAILGUN (1v1 suora) ─────────
    vinicius: {
      aamu: [
        {
          id: 'vin-aa-1',
          otsikko: 'Railgunin kiihdytys',
          ohje_leikkija: 'Juokse 5 askelta täydellä vauhdilla pallon kanssa.',
          ohje_rakentaja: 'Räjähtävä lähtö pallolla 5× — 5–10 m kiihdytys.',
          ohje_showcase: 'Explosive first 5 steps — pallo + sprint, palautus täysi.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Nopeimmat laitahyökkääjät juoksevat yli 30 km/h pallon kanssa.',
            legenda: 'Klassikko opetti: "Räjähtävyys on osin synnynnäinen, osin treenattu."',
            suomi:   'Moni suomalaishuippu treenasi 5 askeleen lähtöä päivittäin nuorena.'
          }
        },
        {
          id: 'vin-aa-2',
          otsikko: 'Saksi + lähtö',
          ohje_leikkija: 'Tee saksi ja juokse heti! Sitten täysi vauhti.',
          ohje_rakentaja: 'Saksi + räjähtävä kiihdytys 5× — yhteensä yksi liike.',
          ohje_showcase: 'Step-over → 1st step explosive 5× — feint + acceleration.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Huiput käyttävät saksin + kiihdytyksen useita kertoja per peli.',
            legenda: 'Klassikko: "Liike on turha jos sen jälkeen et juokse."',
            suomi:   'Suomalaisvalmentaja: "Liike + lähtö on yksi asia, ei kaksi."'
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
            nyky:    'Parhaat laitahyökkääjät vaihtavat suuntaa kymmeniä kertoja per peli.',
            legenda: 'Klassikko: "Suunnanmuutos on enemmän kuin pelkkä lihas."',
            suomi:   'Moni suomalaishuippu treenasi tämän aamulenkin yhteydessä.'
          }
        }
      ],
      valitunti: [
        {
          id: 'vin-va-1',
          otsikko: 'Salaliike — vetokäännös',
          ohje_leikkija: 'Tee vetokäännös 5 kertaa. Pallo vedetään takajalalle!',
          ohje_rakentaja: 'Vetokäännös 5× per jalka — sisäterä pallon takaa.',
          ohje_showcase: 'Drag-turn 5× — pallo jalan takaa uuteen suuntaan, harhautus.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni huippu käyttää vetokäännöstä laidalla viikoittain.',
            legenda: 'Yksi klassikko teki tämän liikkeen kuuluisaksi arvokisoissa.',
            suomi:   'Moni suomalaishuippu oli mestari tässä käännöksessä.'
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
            nyky:    'Parhaat lukevat vastustajan jalat ennen kuin tämä liikkuu.',
            legenda: 'Klassikko: "Lue vastustaja ennen kuin pallo tulee."',
            suomi:   'Suomalaisvalmentaja: "Ohitus alkaa skannauksesta, ei liikkeestä."'
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
            nyky:    'Moni huippu visualisoi useita 1v1-tilanteita ennen ottelua.',
            legenda: 'Valmentajaperinne: noin 30 min mielikuvaa päivässä.',
            suomi:   'Suomalaisvalmentaja: "Mielikuva on ilmaista treeniä — joka iltaan."'
          }
        }
      ],
      ilta: [
        {
          id: 'vin-il-1',
          otsikko: 'Voitto-ohitus — klippi',
          ohje_leikkija: 'Katso 1v1-ohitusklippi 30 sekuntia.',
          ohje_rakentaja: 'Klippi 30s — 1v1-tilanne, mitä tapahtuu ennen liikettä?',
          ohje_showcase: 'Analyysi 30s — 1v1 trigger + decision.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat onnistuvat 1v1:ssä noin neljä kertaa kymmenestä.',
            legenda: 'Klassikko teki tuhansia 1v1-ohituksia urallaan.',
            suomi:   'Suomalaisanalyysi: 1v1-onnistuminen on opittavissa toistoilla.'
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
            nyky:    'Eräs huippu kuvaili: "Yksi rohkea liike per peli — silloin nautin."',
            legenda: 'Klassikko: "Rohkeus on taito, ei luonteenpiirre."',
            suomi:   'Suomalaisvalmentaja: "Kokeile rohkeasti — siitä se lähtee."'
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
            nyky:    'Moni huippu asettaa muutaman mikrotavoitteen ennen jokaista peliä.',
            legenda: 'Klassikko kirjoitti pelitavoitteet ennen ottelua.',
            suomi:   'Suomalaisvalmentaja: "Yksi 1v1 per peli onnistuu — riittää aluksi."'
          }
        }
      ]
    },

    // ───────── VK 4 — VELHO (1v1 ahdas) ─────────
    yamal: {
      aamu: [
        {
          id: 'yam-aa-1',
          otsikko: 'Velhon pikkukuljetus',
          ohje_leikkija: 'Kuljeta palloa pieneen ympyrään 30 sekuntia.',
          ohje_rakentaja: 'Tight dribble 30s — pallo pysyy 50 cm säteellä.',
          ohje_showcase: 'Confined dribbling 30s — kosketukset 1× sekunnissa.',
          tavoite: { tyyppi: 'sekunnit', maara: 30 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni ahtaan tilan velho harjoitteli tätä lapsena keittiön lattialla.',
            legenda: 'Eräs klassikkonero pelasi koko lapsuuden pienellä alueella.',
            suomi:   'Suomalaisvalmentaja: "Pieni tila pakottaa luovuuteen."'
          }
        },
        {
          id: 'yam-aa-2',
          otsikko: 'La Croqueta',
          ohje_leikkija: 'Vie pallo sisäjalalta toiselle 10 kertaa nopeasti.',
          ohje_rakentaja: 'La Croqueta 10× — 1 askel, vaihto sisäjalalta sisäjalalle.',
          ohje_showcase: 'La Croqueta 10× — klassinen liike, 1 step transfer.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Huiput käyttävät croquetaa juuri ahtaassa tilassa.',
            legenda: 'Eräs mestari voitti arvokisafinaalin tällä liikkeellä.',
            suomi:   'Moni suomalaishuippu oppi croquetan jo nuorena.'
          }
        },
        {
          id: 'yam-aa-3',
          otsikko: 'Pull push',
          ohje_leikkija: 'Vedä pallo taakse, työnnä eteen. 10 kertaa.',
          ohje_rakentaja: 'Pull push 10× — jalkapohja taakse, sisäterä eteen.',
          ohje_showcase: 'Pull–push combo 10× — klassinen liike, fast change of pace.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni huippu tekee tämän liikkeen ahtaissa paikoissa joka ottelussa.',
            legenda: 'Eräs mestari käytti tätä tuhansia kertoja urallaan.',
            suomi:   'Suomalaisvalmentaja: "Pull push — yksinkertainen ja tehokas."'
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
            nyky:    'Huiput harjoittelevat footworkin ilman palloa joka aamu.',
            legenda: 'Monessa akatemiassa opetetaan footwork ennen palloa.',
            suomi:   'Suomalaisvalmentaja: "Jalkojen rytmi on ennen pallon hallintaa."'
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
            nyky:    'Moni velho pelaa parhaiten juuri pienellä alueella.',
            legenda: 'Klassikko: "Pieni tila on minulle iso tila."',
            suomi:   'Suomalaisvalmentaja: "Pelaa pieni tila, kasvat suureksi."'
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
            nyky:    'Huiput visualisoivat pressing-tilanteita iltaisin.',
            legenda: 'Klassikko: "Painostuksesta ulos = yksi kosketus, ei kaksi."',
            suomi:   'Suomalaisvalmentaja: "Pakene aina eteenpäin — ei taaksepäin."'
          }
        }
      ],
      ilta: [
        {
          id: 'yam-il-1',
          otsikko: 'Ahtaan tilan liike — klippi',
          ohje_leikkija: 'Katso 1v1-klippi 30 s. Mitä jaloilla tapahtui?',
          ohje_rakentaja: 'Klippi 30s — ahdas 1v1, identifioi liikesarja.',
          ohje_showcase: 'Analyysi 30s — liikesarja + body feints ahtaassa tilassa.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni nykyhuippu nousi pääsarjaan jo teininä ahtaan tilan taidoilla.',
            legenda: 'Klassikoiden nuoruusvideoita on tutkittu lukemattomia kertoja akatemioissa.',
            suomi:   'Moni suomalaishuippu loisti juuri pienen tilan pelissä.'
          }
        },
        {
          id: 'yam-il-2',
          otsikko: 'Päivän pieni hetki',
          ohje_leikkija: 'Mihin pieneen tilaan mahduit tänään pallon kanssa?',
          ohje_rakentaja: 'Reflektio: pienin tila tänään + miten selvisit.',
          ohje_showcase: 'Tightest space today — solution + confidence level.',
          tavoite: { tyyppi: 'reflektio', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Eräs huippu kuvaili: "Pieni tila opettaa enemmän kuin iso kenttä."',
            legenda: 'Huippuakatemioissa pieni alue on opetuskenttä nuorimmille.',
            suomi:   'Suomalaisvalmentaja: "Pelaaja kasvaa pelin älyssä, ei koossa."'
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
            nyky:    'Huiput kokeilevat 1 uutta liikettä joka harjoituksessa.',
            legenda: 'Klassikko: "Liike on vain väline — pelaa, älä esitä."',
            suomi:   'Moni suomalaishuippu oppi tunnusliikkeensä jo nuorena.'
          }
        }
      ]
    },

    // ───────── VK 5 — TITAN (liike ilman palloa) ─────────
    haaland: {
      aamu: [
        {
          id: 'haa-aa-1',
          otsikko: 'Titanin starttisykäys',
          ohje_leikkija: 'Seiso paikallaan. Lähde juoksuun 5 sekunnissa, 5 kertaa.',
          ohje_rakentaja: 'Seisova lähtö 5× — räjähtävä 5–8 m ilman palloa.',
          ohje_showcase: 'Standing start sprint 5× — ensimmäiset 3 askelta maksimi.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Nopeimmat hyökkääjät sprinttaavat yli 35 km/h huipputasolla.',
            legenda: 'Klassikko: "Liike ilman palloa = noin 80 % pelistä."',
            suomi:   'Moni suomalaishyökkääjä tekee kymmeniä sprinttejä per ottelu.'
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
            nyky:    'Huiput tekevät high kneesin ennen jokaista ottelua.',
            legenda: 'Klassikko lämmitteli aina muutaman minuutin reaktiivisilla liikkeillä.',
            suomi:   'Suomalaisvalmentaja: "Räjähtävyys herätetään aamulla, ei iltapäivällä."'
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
            nyky:    'Huiput sprinttaavat useita kertoja jokaisen minuutin aikana ottelussa.',
            legenda: 'Klassikko: "Älä koskaan kävele — juokse tai seiso."',
            suomi:   'Suomalaisvalmentaja: "Sprintti = päätös, ei vain lihaskunto."'
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
            nyky:    'Huiput väistävät keskuspuolustajaa useita kertoja per peli.',
            legenda: 'Klassikko: "Hyökkääjän pelin ydin on irti pääseminen."',
            suomi:   'Moni suomalaishyökkääjä tekee tämän jokaisen ottelun lämmittelyssä.'
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
            nyky:    'Huiput vilkaisevat vapaata tilaa lähes joka sekunti pelin aikana.',
            legenda: 'Klassikko: "Hyvä juoksu on osin sitä, että näet sen ensin."',
            suomi:   'Suomalaisvalmentaja: "Tyhjä tila — siinä saa peliaikaa."'
          }
        },
        {
          id: 'haa-va-3',
          otsikko: 'Mielessä — tyhjään juoksu',
          ohje_leikkija: 'Kuvittele että juokset tyhjään tilaan ja saat syötön.',
          ohje_rakentaja: 'Mielikuva: irrottautuva juoksu + maali yhdellä kosketuksella.',
          ohje_showcase: 'Visualisointi: off-ball run + 1-touch finish.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni huippu visualisoi maaleja ennen jokaista peliä.',
            legenda: 'Klassikko: "Maali alkaa juoksusta — ei laukauksesta."',
            suomi:   'Suomalaisvalmentaja: "Päässä tehty maali on jo puoleksi tehty."'
          }
        }
      ],
      ilta: [
        {
          id: 'haa-il-1',
          otsikko: 'Tyhjään juoksu — klippi',
          ohje_leikkija: 'Katso 30 s liikeklippiä. Mihin pelaaja juoksi?',
          ohje_rakentaja: 'Klippi 30s — tunnista juoksu ja sen ajoitus syöttöön.',
          ohje_showcase: 'Analyysi 30s — off-ball run timing + defensive line break.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Hyvän juoksun ajoitus on opetusvideo lähes joka akatemiassa.',
            legenda: 'Klassikon syöttö + juoksu määritti aikoinaan kokonaisen pelitavan.',
            suomi:   'Moni suomalaishyökkääjä on noussut juuri nopeudellaan kärkeen.'
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
            nyky:    'Eräs huippu kuvaili: "Yksikään juoksu ei ole turha, vaikka et saa palloa."',
            legenda: 'Klassikko: "Kymmenen turhaa juoksua palkitsee yhden maalin."',
            suomi:   'Suomalaisvalmentaja: "Ajoita juoksu — älä myöhästy puolta askelta."'
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
            nyky:    'Moni huippu kirjaa juoksutavoitteet vihkoonsa joka päivä.',
            legenda: 'Klassikko asetti aina muutaman juoksutavoitteen peliä kohden.',
            suomi:   'Suomalaisvalmentaja: "Kolme juoksua per puoliaika — hyvä tavoite."'
          }
        }
      ]
    },

    // ───────── VK 6 — ARKKITEHTI (syöttö) ─────────
    trent: {
      aamu: [
        {
          id: 'tre-aa-1',
          otsikko: 'Arkkitehdin sisäterä',
          ohje_leikkija: 'Potkaise palloa seinään 20 kertaa sisäjalalla.',
          ohje_rakentaja: 'Sisäteräsyöttö seinään 20× — pallo palaa suoraan.',
          ohje_showcase: 'Inside foot pass 20× — tarkkuus + tukijalan asento.',
          tavoite: { tyyppi: 'toistot', maara: 20 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Parhaat syöttäjät harjoittelevat satoja sisäteräpasseja päivässä.',
            legenda: 'Eräs syöttöjen mestari potkaisi satoja passeja päivässä jo lapsena.',
            suomi:   'Suomalaisvalmentaja: "Sisäterä on syötön perusta — ei pikaratkaisu."'
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
            nyky:    'Huiput muistuttavat: "Tukijalka tekee passin, ei potkujalka."',
            legenda: 'Klassikko: "Suuri osa syötöstä on jo ennen kosketusta."',
            suomi:   'Suomalaisvalmentaja: "Tukijalan virhe = passin virhe."'
          }
        },
        {
          id: 'tre-aa-3',
          otsikko: 'Pitkä passi',
          ohje_leikkija: 'Heitä pallo ilmaan ja potkaise nilkalla, 5 kertaa.',
          ohje_rakentaja: 'Jalkapöytäpotku 5× — pallo nousee suoraan ja kauas.',
          ohje_showcase: 'Instep drive 5× — laces, knee over ball, follow-through.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Parhaat syöttävät tarkasti yli 70 metriä.',
            legenda: 'Erään mestarin tavaramerkki oli kaareva pitkä passi.',
            suomi:   'Suomalaisvalmentaja: "Pitkä passi avaa pelin — siksi treeni joka päivä."'
          }
        }
      ],
      valitunti: [
        {
          id: 'tre-va-1',
          otsikko: 'Salaliike — kaareva passi',
          ohje_leikkija: 'Kuvittele potkaisevasi pallon kaaressa kohteeseen.',
          ohje_rakentaja: 'Kaareva passi mielikuvana 5× — sisäterä, kierre.',
          ohje_showcase: 'Curl pass mental rehearsal 5× — bend angle + spin axis.',
          tavoite: { tyyppi: 'mielikuva', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat syöttäjät keräävät kymmeniä syöttöpisteitä kaudessa.',
            legenda: 'Erään mestarin tavaramerkki oli kaareva passi.',
            suomi:   'Suomalaisvalmentaja: "Kierre lähtee tukijalasta, ei potkujalasta."'
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
            nyky:    'Parhaat näkevät useita syöttölinjoja joka kosketuksen aikana.',
            legenda: 'Klassinen mestari näki 5 syöttölinjaa joka kosketuksen aikana.',
            suomi:   'Suomalaisvalmentaja: "Syöttö alkaa pään kääntämisestä, ei potkusta."'
          }
        },
        {
          id: 'tre-va-3',
          otsikko: 'Mielessä — ratkaiseva syöttö',
          ohje_leikkija: 'Kuvittele että teet maaliin johtavan syötön.',
          ohje_rakentaja: 'Mielikuva: assist-syöttö 30 m matkalta — kohde + kaari.',
          ohje_showcase: 'Visualisointi: defense-splitting pass — vector + timing.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Eräs huippu kuvaili: "Näen passin päässäni ennen kuin pallo tulee."',
            legenda: 'Klassikko harjoitteli mielikuvaa muutaman minuutin ennen jokaista peliä.',
            suomi:   'Suomalaisvalmentaja: "Mielikuva on ilmainen treeni, joka iltaan."'
          }
        }
      ],
      ilta: [
        {
          id: 'tre-il-1',
          otsikko: 'Maagiset syötöt — klippi',
          ohje_leikkija: 'Katso 30 s syöttöklippiä. Miltä syötöt näyttivät?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 syöttötekniikka.',
          ohje_showcase: 'Analyysi 30s — pass type + decision context.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni huippu oppi syöttötekniikkansa jo nuorena akatemiassa.',
            legenda: 'Klassikoiden vapaapotkut ovat netin katsotuimpia futisvideoita.',
            suomi:   'Moni suomalaishuippu on kärkeä juuri syöttötilastoissa.'
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
            nyky:    'Moni huippu kirjaa parhaat syötöt vihkoonsa joka peli.',
            legenda: 'Klassikko: "Yksi hyvä syöttö per peli muistetaan vuosia."',
            suomi:   'Suomalaisvalmentaja: "Uskalla syöttää eteenpäin, älä vain varman päälle."'
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
            nyky:    'Huiput muistuttavat: "Mieti syöttö ennen kuin saat pallon."',
            legenda: 'Klassikko: "Joka päivä yksi syöttö, jota ei vielä ole tehnyt."',
            suomi:   'Suomalaisvalmentaja: "Yksi rohkea syöttö per peli — siinä kehittyminen."'
          }
        }
      ]
    },

    // ───────── VK 7 — VIIMEISTELIJÄ (maalinteko) ─────────
    kane: {
      aamu: [
        {
          id: 'kan-aa-1',
          otsikko: 'Viimeistelijän rauhallinen lopetus',
          ohje_leikkija: 'Potkaise pallo seinään 10 kertaa rauhallisesti.',
          ohje_rakentaja: 'Hallittu maalipotku 10× seinään — sijoitus ennen vauhtia.',
          ohje_showcase: 'Composed finish 10× — accuracy edellä, low velocity.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Parhaat maalintekijät tekevät maalin usein sekunneissa peliin tultuaan.',
            legenda: 'Klassinen maalikone: "Maali on rauhallisuuden, ei voiman ratkaisu."',
            suomi:   'Suomalaisvalmentaja: "Hallittu kosketus voittaa kovan laukauksen."'
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
            nyky:    'Moni huippu treenasi heikkoa jalkaa erikseen kokonaisen kauden teininä.',
            legenda: 'Klassinen maalikone treenasi heikkoa jalkaa useita kertoja viikossa.',
            suomi:   'Suomalaisvalmentaja: "Heikko jalka on tukijalan apu — ei vihollinen."'
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
            nyky:    'Parhaat tekevät suuren osan maaleistaan kahdessa kosketuksessa.',
            legenda: 'Klassikko: "Maalintekijä on tehokas, ei tyylikäs."',
            suomi:   'Suomalaisvalmentaja: "Maalintekijä päättää laukauksen ennen kosketusta."'
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
            nyky:    'Moni huippu kokeili varvaspotkua jo nuorena akatemiassa.',
            legenda: 'Eräs klassikko voitti arvokisafinaalin varvaspotkulla.',
            suomi:   'Moni suomalaishuippu on yllättänyt maalivahdin varvaspotkulla.'
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
            nyky:    'Parhaat vilkaisevat maalivahdin asentoa hetkeä ennen laukausta.',
            legenda: 'Klassikko: "Lue maalivahti — älä yritä yllättää."',
            suomi:   'Suomalaisvalmentaja: "Maalivahti tekee päätöksen ennen sinua."'
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
            nyky:    'Moni huippu visualisoi maaleja ennen jokaista ottelua.',
            legenda: 'Klassikko: "Olen tehnyt jokaisen maalini päässäni ensin."',
            suomi:   'Suomalaisvalmentaja: "Mielikuvitus on maalintekijän paras ase."'
          }
        }
      ],
      ilta: [
        {
          id: 'kan-il-1',
          otsikko: 'Maalitähtihetket — klippi',
          ohje_leikkija: 'Katso 30 s maaliklippejä. Miten pelaaja osuu?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 toistuva maalintekotapa.',
          ohje_showcase: 'Klippi-analyysi — finishing patterns + body shape.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat tekevät yli 30 maalia kaudessa, vuodesta toiseen.',
            legenda: 'Klassinen maalikone iski satoja pääsarjamaaleja urallaan.',
            suomi:   'Moni suomalaishuippu on tehnyt maalin lähes joka toisessa pelissä.'
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
            nyky:    'Eräs huippu kuvaili: "Yksi hyvä laukaus opettaa enemmän kuin 10 huonoa."',
            legenda: 'Klassikko kirjasi laukaustilastot vihkoonsa joka peli.',
            suomi:   'Suomalaisvalmentaja: "Yksi maali voi muuttaa pelaajan uran."'
          }
        },
        {
          id: 'kan-il-3',
          otsikko: 'Yksi maali huomiseksi',
          ohje_leikkija: 'Teetkö huomenna maalin? Kuvittele se nyt.',
          ohje_rakentaja: 'Aseta tavoite: 1 maali tai laukaus huomenna.',
          ohje_showcase: 'Tavoite huomiselle: 1 spesifi laukaustilanne + tekniikka.',
          tavoite: { tyyppi: 'tavoite', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Moni huippu kirjaa maalitavoitteet vihkoonsa joka päivä.',
            legenda: 'Klassikko: "Aamulla muutama maali mielessä — illalla yksi lisää."',
            suomi:   'Suomalaisvalmentaja: "Yksi maali per peli — siinä on tavoite."'
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
      idoliNimi = i ? (i.etunimi + ' ' + i.sukunimi).trim() : idoliKoodi;
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

  // Hae yhden mikrosykli-tyypin kortit annetusta teemasta.
  // Vk8:lle välitetään valittu teema erikseen (oma_valinta).
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
  function generoiPaivanMikrosyklit(paivamaara, profiili, deps) {
    profiili = profiili || {};
    deps = deps || {};   // Vaihe 1: { PANKKI, T_KOHDE_PANKKI } — TREENI hakee näistä PANKKI-harjoitteen
    paivamaara = paivamaara || new Date();
    var efektiivinenStage = profiili.efektiivinenStage || 2;
    var kielitaso = profiili.kielitaso || 'leikkija';
    var paivanArkilainen = paivamaara.getDay(); // 0=su, 1=ma, ..., 6=la
    var viikkoTeema = laskeViikkoTeema(paivamaara);

    // Vk8 — pelaaja valitsee teeman
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
      // TREENI (Vaihe 1 — ohut sauma): hae varsinainen harjoite PANKISTA viikkoteeman mukaan,
      // jos deps.PANKKI on injektoitu. Muuten säilyy placeholder (taaksepäin-yhteensopiva).
      if (tyyppi === 'treeni') {
        var paatreeni = deps.PANKKI ? haePaatreeniHarjoite(viikkoTeema, deps, profiili) : null;
        return {
          tyyppi: 'treeni',
          tyyppiData: TYYPIT.treeni,
          idoli: idoli,
          viikkoTeema: viikkoTeema,
          omaValinta: omaValinta,
          valittu: paatreeni,
          vaihtoehdot: [],
          kielitaso: kielitaso,
          ohje: (paatreeni && paatreeni.nimi) ? (paatreeni.nimi + ' — ' + paatreeni.ohje)
              : (paatreeni && paatreeni.viesti) ? paatreeni.viesti
              : ('Päätreeni — generoidaan PANKKI:sta (' + viikkoTeema.teema + ')'),
          tiesitko: null,
          lahde: (paatreeni && paatreeni.lahde) ? 'PANKKI' : null,
          delegoi: paatreeni ? null : 'tm-prescription.js'
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
            virheet.push(k.id + ': prefiksi ei vastaa teemaa ' + ik);
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
  // PANKKI-SAUMA (Vaihe 1) — viikkoteema → PANKKI-harjoite
  // Mappaa teema → PANKKI:n T-mesosykli/kohde + liikeketjut (D/S). PANKKI +
  // T_KOHDE_PANKKI injektoidaan deps:nä — ei kovaa riippuvuutta lib:ssä.
  // ═══════════════════════════════════════════════════════════════════
  var TEEMA_PANKKI = {
    bellingham: { t: { tyyppi: 'meso',  avain: 'kaka' },    ketjut: ['diag'] }, // vk1
    pedri:      { t: { tyyppi: 'meso',  avain: 'affelay' }, ketjut: ['ll'] },   // vk2
    vinicius:   { t: { tyyppi: 'kohde', avain: 'nopeus' },  ketjut: ['sbl'] },  // vk3
    yamal:      { t: { tyyppi: 'meso',  avain: 'ronaldo' }, ketjut: ['ll'] },   // vk4
    haaland:    { t: null,                                  ketjut: ['sfl'] },  // vk5 (vain D/S)
    trent:      { t: { tyyppi: 'meso',  avain: 'beckham' }, ketjut: ['diag'] }, // vk6
    kane:       { t: null, ketjut: ['sfl'], placeholder: 'Maalinteko — sisältö lisätään Vaiheessa 2' }, // vk7
    OMA:        { t: { tyyppi: 'meso',  avain: 'perus' },   ketjut: [] }        // vk8 (vapaa)
  };

  // Hae päivän PÄÄTREENI-harjoite PANKISTA viikkoteeman mukaan.
  // viikkoTeema = laskeViikkoTeema():n paluu · deps = { PANKKI, T_KOHDE_PANKKI }.
  function haePaatreeniHarjoite(viikkoTeema, deps, profiili) {
    deps = deps || {}; profiili = profiili || {};
    var PANKKI = deps.PANKKI;
    if (!PANKKI || !viikkoTeema) return null;
    var idoliKoodi = viikkoTeema.idoli;
    // OMA-viikko: jos pelaaja on valinnut teeman, käytä sitä; muuten OMA → perus (vapaa pallokosketus).
    if (idoliKoodi === 'OMA' && profiili.oma_valinta_idoli) idoliKoodi = profiili.oma_valinta_idoli;
    var map = TEEMA_PANKKI[idoliKoodi];
    if (!map) return null;
    var kielitaso = profiili.kielitaso || 'leikkija';

    var harjoitteet = [];
    if (map.t && map.t.tyyppi === 'meso' && PANKKI.T && PANKKI.T[map.t.avain]) {
      var s = PANKKI.T[map.t.avain];
      ['vk1', 'vk2', 'vk3', 'vk4'].forEach(function (vk) { if (s[vk] && s[vk].nimi) harjoitteet.push(s[vk]); });
    } else if (map.t && map.t.tyyppi === 'kohde' && deps.T_KOHDE_PANKKI && deps.T_KOHDE_PANKKI[map.t.avain]) {
      harjoitteet = harjoitteet.concat(deps.T_KOHDE_PANKKI[map.t.avain]);
    }

    if (!harjoitteet.length) {
      return { placeholder: true, idoli: idoliKoodi, teema: viikkoTeema.teema, ketjut: map.ketjut,
               viesti: map.placeholder || ('Vain liikeketjut (D/S): ' + map.ketjut.join('/').toUpperCase()) };
    }

    var idx = (profiili.harjoiteIndeksi != null) ? (profiili.harjoiteIndeksi % harjoitteet.length) : 0;
    var h = harjoitteet[idx];
    return {
      nimi: h.nimi,
      ohje: h['ohje_' + kielitaso] || h.ohje_rakentaja || h.ohje || '',
      kesto: h.kesto || null, xp: h.xp || 20, cue: h.cue || null,
      mesosykli: (map.t && map.t.tyyppi === 'meso') ? map.t.avain : null,
      kohde: (map.t && map.t.tyyppi === 'kohde') ? map.t.avain : null,
      ketjut: map.ketjut, idoli: idoliKoodi, vaihtoehtoja: harjoitteet.length, lahde: 'PANKKI'
    };
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
    TEEMA_PANKKI: TEEMA_PANKKI,
    laskeViikkoTeema: laskeViikkoTeema,
    haeKortit: haeKortit,
    haePaatreeniHarjoite: haePaatreeniHarjoite,
    generoiPaivanMikrosyklit: generoiPaivanMikrosyklit,
    arvioiKosketukset: arvioiKosketukset,
    _valitseTiesitko: _valitseTiesitko,
    _validoi: _validoi,
    VERSIO: '2.1.0'
  };

})(typeof window !== 'undefined' ? window : this);
