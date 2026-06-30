/* ═══════════════════════════════════════════════════════════════════
   TalentMaster — Bola Sempre -mikrosyklit  v2.0

   Periaate (huippuakatemiat): pelaaja koskettaa palloa joka päivä
   useissa eri konteksteissa, ei vain yhdessä strukturoidussa sessiossa.

   #91 (Linjaus A): lapselle näkyvä sisältö anonymisoitu — ei oikeita pelaajien
   tai seurojen nimiä. Tuotteen arkkityypit (§14: Railgun · Maestro · Shadowstep · Titan)
   + geneeriset kehykset. Tarina + valmennusopetus säilytetty. Objektiavaimet säilyvät.

   4 mikrosykliä päivässä:
     🌅 AAMU       1 min   pallotuntuma + päivän herätys
     🎒 VÄLITUNTI  1 min   "salaliike" tai skannaus (1m² tilassa)
     ⚽ TREENI     20 min  viikon teema (Maestro/Shadowstep/Railgun/...)
     🌙 ILTA       2 min   1 tekniikkaklippi + 1 reflektiokysymys

   8 viikon makrosykli — synkronoituu tm-methodology.js:n JAKSOT-rakenteeseen:
     vk1 Maestro    — Vastaanotto         (DIAG)   pohja
     vk2 Shadowstep — Dribbeli             (LL)     pohja
     vk3 Railgun    — 1v1 suora            (SBL)    pohja
     vk4 Shadowstep — 1v1 ahtaassa tilassa (LL)     kehitys
     vk5 Titan      — Liike ilman palloa   (SFL)    kehitys
     vk6 Maestro    — Syöttö               (DIAG)   kehitys
     vk7 Titan      — Maalinteko           (SFL)    huipentuma
     vk8 OMA        — Pelaajan oma valinta (vapaa)  huipentuma

   Suunnitteluperiaatteet (alle 12-vuotiaalle):
     - Yhdessä lauseessa, alle 10 sanaa
     - Ei valmentajan termejä — lapsen kieli
     - Voi tehdä kotona, 1m² tilassa, ilman valmentajaa
     - Aina valinta: pelaaja näkee 3 vaihtoehtoa per mikrosykli
     - Iltarituaali = ei palloa (mielikuva tai video)

   Kortin skeema (kanoninen — _validoi tarkistaa):
     {
       id: 'bel-aa-1',                      // <avain>-<tyyppi>-<index>
       otsikko: 'Maestron herätys',
       ohje_leikkija:  '...',                // < 10 sanaa
       ohje_rakentaja: '...',                // 13–15v, lyhyt perustelu
       ohje_showcase:  '...',                // 16+, termit ok
       tavoite: { tyyppi: 'kosketukset', maara: 30 },
       kesto_s: 60,
       tiesitko: {
         nyky:    'Maailman huiput harjoittelevat tätä joka päivä.',
         legenda: 'Menneiden vuosikymmenten mestarit rakensivat uransa tästä.',
         suomi:   'Moni suomalaishuippu aloitti samasta perusasiasta.'
       }
     }

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
  // IDOLIT — viikon teemat arkkityypeittäin (#91 anonymisoitu)
  // Lapsi näkee arkkityypin, oppii periaatteen, samaistuu kehityspolkuun
  // ═══════════════════════════════════════════════════════════════════
  var IDOLIT = {
    bellingham: {
      koodi: 'bellingham',
      etunimi: 'Maestro', sukunimi: '(vastaanotto)',
      seura: 'huippuakatemia', numero: 5,
      ydintaito: 'vastaanotto',
      tagline: 'Pallo tarttuu jalkaan kuin magneetti',
      legenda: { nimi: 'Menneiden mestari', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen huippu', seura: 'pääsarja / maajoukkue' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    pedri: {
      koodi: 'pedri',
      etunimi: 'Shadowstep', sukunimi: '(dribbeli)',
      seura: 'huippuakatemia', numero: 8,
      ydintaito: 'dribbeli',
      tagline: 'Katse ylös, pallo ei katoa',
      legenda: { nimi: 'Dribblauksen klassikko', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen tekniikkapelaaja', seura: 'maajoukkue' },
      vari: '#A50044', vastavari: '#FFFFFF'
    },
    vinicius: {
      koodi: 'vinicius',
      etunimi: 'Railgun', sukunimi: '(1v1 suora)',
      seura: 'huippuakatemia', numero: 7,
      ydintaito: '1v1_suora',
      tagline: 'Yksi liike — vastustaja jää taakse',
      legenda: { nimi: 'Räjähtävyyden mestari', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen hyökkääjä', seura: 'maajoukkue' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    yamal: {
      koodi: 'yamal',
      etunimi: 'Shadowstep', sukunimi: '(ahdas tila)',
      seura: 'huippuakatemia', numero: 19,
      ydintaito: '1v1_ahdas',
      tagline: 'Pieni tila — iso pelaaja',
      legenda: { nimi: 'Ahtaan tilan taituri', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen taituri', seura: 'maajoukkue' },
      vari: '#A50044', vastavari: '#FFFFFF'
    },
    haaland: {
      koodi: 'haaland',
      etunimi: 'Titan', sukunimi: '(liike ilman palloa)',
      seura: 'huippuakatemia', numero: 9,
      ydintaito: 'liike_ilman_palloa',
      tagline: 'Ole valmiina ennen palloa',
      legenda: { nimi: 'Liikkeen mestari', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen nopeushyökkääjä', seura: 'maajoukkue' },
      vari: '#6CABDD', vastavari: '#FFFFFF'
    },
    trent: {
      koodi: 'trent',
      etunimi: 'Maestro', sukunimi: '(syöttö)',
      seura: 'huippuakatemia', numero: 12,
      ydintaito: 'syotto',
      tagline: 'Pallo lentää kaaressa minne haluat',
      legenda: { nimi: 'Syötön klassikko', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen syöttäjä', seura: 'maajoukkue' },
      vari: '#FFFFFF', vastavari: '#000000'
    },
    kane: {
      koodi: 'kane',
      etunimi: 'Titan', sukunimi: '(maalinteko)',
      seura: 'huippuakatemia', numero: 9,
      ydintaito: 'maalinteko',
      tagline: 'Maalin edessä rauhallisesti',
      legenda: { nimi: 'Maalinteon mestari', seura: 'klassikkoaikakausi', vuosi: 'aiempi sukupolvi' },
      suomalainen: { nimi: 'Suomalainen maalintekijä', seura: 'maajoukkue' },
      vari: '#DC052D', vastavari: '#FFFFFF'
    }
  };

  // 8 vk rotaatio — synkronoituu JAKSOT-rakenteeseen.
  // vk8 = pelaajan oma valinta — UI tarjoaa teemavalitsijaa.
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
              'Stage 4–5: voi yhdistää 2 teemaa (esim. vastaanotto + syöttö).' }
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
  //   tiesitko { nyky, legenda, suomi }
  // ═══════════════════════════════════════════════════════════════════
  var KORTIT = {

    // ───────── VK 1 — VASTAANOTTO (Maestro) ─────────
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
            nyky:    'Maailman huiput pomputtelevat satoja kosketuksia joka päivä — pallotuntuma syntyy toistosta.',
            legenda: 'Menneiden mestarit pomputtelivat aina ennen ottelua, kymmeniä kosketuksia putkeen.',
            suomi:   'Moni suomalaishuippu teki tämän jokaisena treeniaamuna jo lapsena.'
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
            nyky:    'Parhaat kuolettavat pallon alle puolen metrin säteelle jalastaan.',
            legenda: 'Klassikkomestari opetti: "Ensimmäinen kosketus on koko peli."',
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
            nyky:    'Huiput tekivät tätä satoja kertoja ennen koulua jo lapsuudessaan.',
            legenda: 'Moni mestari aloitti tip-tapin alle kouluikäisenä.',
            suomi:   'Suomalaishuippu harjoitteli tämän pakkasella kotipihassa.'
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
            nyky:    'Huippuakatemioissa tämä on perusliike ennen jokaista harjoitusta.',
            legenda: 'Klassikkoakatemiat toistivat tätä satoja kertoja viikossa.',
            suomi:   'Suomalaisakatemiat harjoittelevat tätä jo aivan pienestä alkaen.'
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
            nyky:    'Huiput katsovat ympärilleen jatkuvasti — useita kertoja sekunnissa pelin aikana.',
            legenda: 'Pelinrakentajamestari näki vapaat syöttölinjat joka kosketuksen aikana.',
            suomi:   'Suomalaisvalmentajat: "Skannauksen oppii kuka tahansa, joka harjoittelee sitä."'
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
            nyky:    'Moni huippu "pelaa ottelun päässään" illalla ennen unta.',
            legenda: 'Tutkijat: mielikuva on iso osa liikkeen oppimista.',
            suomi:   'Suomalaishuiput visualisoivat suorituksia aamulla ennen jokaista peliä.'
          }
        }
      ],
      ilta: [
        {
          id: 'bel-il-1',
          otsikko: 'Paras kosketus',
          ohje_leikkija: 'Katso 30 sekuntia tekniikkaklippiä. Mitä hän teki?',
          ohje_rakentaja: 'Katso klippi 30s, tunnista 1. kosketuksen tekniikka.',
          ohje_showcase: 'Analysoi klippi 30s — body shape ennen vastaanottoa.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Tällaisia tekniikkaklippejä käytetään huippuakatemioiden opetuksessa.',
            legenda: 'Klassikkomestarin ensikosketus oli pohja kokonaisen joukkueen pelitavalle.',
            suomi:   'Suomalaisanalyytikot katsovat parhaiden vastaanottoja viikoittain oppiakseen.'
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
            nyky:    'Moni huippu pitää päiväkirjaa onnistumisistaan joka ilta.',
            legenda: 'Huippuakatemioissa pelaajat kirjaavat yhden hyvän kosketuksen päivässä.',
            suomi:   'Suomalaisseurat ovat ottaneet reflektiopäiväkirjan käyttöön nuorilla.'
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
            nyky:    'Huiput asettavat muutaman mikrotavoitteen ennen jokaista peliä.',
            legenda: 'Huippuakatemioissa pelaajat asettavat tavoitteen joka iltaa varten.',
            suomi:   'Suomalaisvalmentajat: "Yksi tavoite per päivä — silloin se onnistuu."'
          }
        }
      ]
    },

    // ───────── VK 2 — DRIBBELI (Shadowstep) ─────────
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
            nyky:    'Parhaat dribblaajat tekevät tätä satoja kertoja ennen harjoitusta.',
            legenda: 'Klassikkotaituri opetti: "Pallo on koira — pidä se aina lähellä."',
            suomi:   'Suomalaishuippu aloitti tip-tapin pienenä kotikaupungissaan.'
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
            nyky:    'Parhaat eivät katso palloa lähes lainkaan dribblauksen aikana.',
            legenda: 'Klassikkotaituri sanoi: "Kun katsot palloa, peli loppuu."',
            suomi:   'Suomalaisvalmentajat: "Pää pystyssä — siinä on pelin ydin."'
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
            nyky:    'Huiput harjoittelevat tätä päivittäin perusharjoituksena.',
            legenda: 'Moni klassikkotaituri teki tämän akatemiassaan jo lapsena.',
            suomi:   'Suomalaisvalmentajat: "Kahdeksikko opettaa molempia jalkoja yhtä aikaa."'
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
            nyky:    'Parhaat käyttävät saksia harvoin — siksi se yllättää.',
            legenda: 'Moni klassikkotaituri opetteli saksin jo aivan nuorena.',
            suomi:   'Suomalaisvalmentajat: "Saksin merkitys on rytmi, ei pallon liikuttelu."'
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
            nyky:    'Ahtaan tilan taiturit käyttävät tätä huippuotteluissa.',
            legenda: 'Klassikkotaituri: "Drag back on keskikenttäpelaajan paras ase."',
            suomi:   'Moni suomalaispelinrakentaja käyttää drag backia joka pelissä.'
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
            nyky:    'Moni huippu sanoo "pelaavansa satoja pelejä päässään" viikossa.',
            legenda: 'Klassikkotaiturit aloittivat mielikuvaharjoitukset jo nuorina.',
            suomi:   'Suomalaishuiput visualisoivat koko ottelun kotimatkalla.'
          }
        }
      ],
      ilta: [
        {
          id: 'ped-il-1',
          otsikko: 'Tunnusliike',
          ohje_leikkija: 'Katso 30 sekuntia dribblausklippiä. Mitä huomasit?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 toistuva liike.',
          ohje_showcase: 'Klippi-analyysi 30s — toistuva tunnusliike + konteksti.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat eivät katso palloa lähes lainkaan dribblauksen aikana.',
            legenda: 'Klassikkotaiturit oppivat toisiltaan sukupolvelta toiselle.',
            suomi:   'Suomalaisvalmentajat: "Katso parhaita — sieltä saa pelitavan opit."'
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
            nyky:    'Moni huippu kirjaa parhaat 1v1-tilanteet ylös oppiakseen niistä.',
            legenda: 'Huippuakatemioissa pelaaja arvioi joka päivä omat 1v1-tilanteensa.',
            suomi:   'Suomalaisvalmentajat: "Pelaajan etu on rohkeus 1v1:ssä."'
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
            nyky:    'Huiput kokeilevat yhtä uutta liikettä joka harjoituksessa.',
            legenda: 'Klassikkotaituri opetteli tunnusliikkeensä yksi kerrallaan, viikko viikolta.',
            suomi:   'Suomalaisvalmentajat: "Yksi rohkea liike per peli — siinä on kehittyminen."'
          }
        }
      ]
    },

    // ───────── VK 3 — 1V1 SUORA (Railgun) ─────────
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
            nyky:    'Nopeimmat hyökkääjät juoksevat pallon kanssa lähes huippuvauhtia.',
            legenda: 'Räjähtävyyden mestari: "Vauhti on osin synnynnäistä, osin treenattua."',
            suomi:   'Suomalaishyökkääjät treenaavat 5 askeleen lähtöä päivittäin jo nuorena.'
          }
        },
        {
          id: 'vin-aa-2',
          otsikko: 'Saksi + lähtö',
          ohje_leikkija: 'Tee saksi ja juokse heti, niin kovaa kuin pystyt!',
          ohje_rakentaja: 'Saksi + räjähtävä kiihdytys 5× — yhteensä yksi liike.',
          ohje_showcase: 'Step-over → 1st step explosive 5× — feint + acceleration.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Parhaat laitahyökkääjät yhdistävät saksin ja kiihdytyksen monta kertaa pelissä.',
            legenda: 'Räjähtävyyden mestari: "Liike on turha, jos sen jälkeen et juokse."',
            suomi:   'Suomalaisvalmentajat: "Liike + lähtö on yksi asia, ei kaksi."'
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
            nyky:    'Terävimmät hyökkääjät vaihtavat suuntaa kymmeniä kertoja pelissä.',
            legenda: 'Räjähtävyyden mestari: "Suunnanmuutos on enemmän kuin lihasta."',
            suomi:   'Suomalaishyökkääjät treenaavat tämän aamulenkin yhteydessä.'
          }
        }
      ],
      valitunti: [
        {
          id: 'vin-va-1',
          otsikko: 'Salaliike — vetokäännös',
          ohje_leikkija: 'Tee vetokäännös 5 kertaa. Pallo vedetään takajalalle!',
          ohje_rakentaja: 'Vetokäännös 5× per jalka — sisäterä pallon takaa.',
          ohje_showcase: 'Vetokäännös 5× — valeliikkeellä uusi suunta.',
          tavoite: { tyyppi: 'toistot', maara: 5 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Laitahyökkääjät käyttävät vetokäännöstä viikoittain päästäkseen irti.',
            legenda: 'Klassikkomestari teki tämän käännöksen kuuluisaksi arvokisoissa.',
            suomi:   'Moni suomalaistaituri on ollut vetokäännöksen mestari.'
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
            nyky:    'Parhaat näkevät vastustajan jalat ennen kuin tämä liikkuu.',
            legenda: 'Räjähtävyyden mestari: "Lue vastustaja ennen kuin pallo tulee."',
            suomi:   'Suomalaisvalmentajat: "Ohitus alkaa skannauksesta, ei liikkeestä."'
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
            nyky:    'Huiput visualisoivat useita 1v1-tilanteita ennen ottelua.',
            legenda: 'Valmennusperinteessä mielikuvaa harjoiteltiin kymmeniä minuutteja päivässä.',
            suomi:   'Suomalaishyökkääjät: "Mielikuva on ilmaista treeniä — joka iltaan."'
          }
        }
      ],
      ilta: [
        {
          id: 'vin-il-1',
          otsikko: 'Voitto-ohitus',
          ohje_leikkija: 'Katso 1v1-ohitusklippi 30 sekuntia.',
          ohje_rakentaja: 'Klippi 30s — 1v1-tilanne, mitä hän tekee ennen liikettä?',
          ohje_showcase: 'Analyysi 30s — 1v1 trigger + decision.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat onnistuvat 1v1:ssä useammin kuin kukaan muu sarjassaan.',
            legenda: 'Klassikkomestari toisti 1v1-ohituksen tuhansia kertoja urallaan.',
            suomi:   'Suomalaisanalyysi: rohkea 1v1 onnistuu, kun sitä uskaltaa yrittää.'
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
            nyky:    'Huiput: "Yksi rohkea liike per peli — silloin nautin."',
            legenda: 'Klassikkomestari: "Rohkeus on taito, ei luonteenpiirre."',
            suomi:   'Suomalaisvalmentajat: "Et ole rohkea? — kokeile silti."'
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
            nyky:    'Huiput asettavat muutaman mikrotavoitteen ennen jokaista peliä.',
            legenda: 'Klassikkomestari kirjoitti pelitavoitteet muistiin ennen ottelua.',
            suomi:   'Suomalaisvalmentajat: "Yksi 1v1 per peli onnistuu — riittää aluksi."'
          }
        }
      ]
    },

    // ───────── VK 4 — 1V1 AHDAS (Shadowstep) ─────────
    yamal: {
      aamu: [
        {
          id: 'yam-aa-1',
          otsikko: 'Shadowstepin pikkukuljetus',
          ohje_leikkija: 'Kuljeta palloa pieneen ympyrään 30 sekuntia.',
          ohje_rakentaja: 'Tight dribble 30s — pallo pysyy 50 cm säteellä.',
          ohje_showcase: 'Confined dribbling 30s — kosketukset 1× sekunnissa.',
          tavoite: { tyyppi: 'sekunnit', maara: 30 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Ahtaan tilan taiturit harjoittelivat tätä pienenä keittiön lattialla.',
            legenda: 'Klassikkotaituri pelasi koko lapsuuden pienellä alueella ja kasvoi luovaksi.',
            suomi:   'Suomalaisvalmentajat: "Pieni tila pakottaa luovuuteen."'
          }
        },
        {
          id: 'yam-aa-2',
          otsikko: 'La Croqueta',
          ohje_leikkija: 'Vie pallo sisäjalalta toiselle 10 kertaa nopeasti.',
          ohje_rakentaja: 'La Croqueta 10× — 1 askel, vaihto sisäjalalta sisäjalalle.',
          ohje_showcase: 'La Croqueta 10× — klassikkoliike, 1 step transfer.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Ahtaan tilan taiturit käyttävät croquetaa päästäkseen ulos paineesta.',
            legenda: 'Klassikkotaituri voitti arvokisafinaalin tällä liikkeellä.',
            suomi:   'Moni suomalaistaituri oppi croquetan jo nuorena ja toi sen kotikentille.'
          }
        },
        {
          id: 'yam-aa-3',
          otsikko: 'Pull push',
          ohje_leikkija: 'Vedä pallo taakse, työnnä eteen. 10 kertaa.',
          ohje_rakentaja: 'Pull push 10× — jalkapohja taakse, sisäterä eteen.',
          ohje_showcase: 'Pull–push combo 10× — klassikkoliike, fast change of pace.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Ahtaan tilan taiturit tekevät tämän liikkeen huippuotteluissa.',
            legenda: 'Klassikkotaituri käytti tätä tuhansia kertoja urallaan.',
            suomi:   'Suomalaisvalmentajat: "Pull push — yksinkertainen ja tehokas."'
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
            nyky:    'Taiturit harjoittelevat footworkin ilman palloa joka aamu.',
            legenda: 'Klassikkoakatemiat opettivat footworkin ennen palloa.',
            suomi:   'Suomalaisvalmentajat: "Jalkojen rytmi on ennen pallon hallintaa."'
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
            nyky:    'Ahtaan tilan taiturit pelaavat parhaiten kaikkein pienimmässä tilassa.',
            legenda: 'Klassikkotaituri: "Pieni tila on minulle iso tila."',
            suomi:   'Suomalaisvalmentajat: "Pelaa pieni tila, kasvat suureksi."'
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
            nyky:    'Taiturit visualisoivat pressing-tilanteita iltaisin.',
            legenda: 'Klassikkotaituri: "Painostuksesta ulos = yksi kosketus, ei kaksi."',
            suomi:   'Suomalaisvalmentajat: "Pakene aina eteenpäin — ei taaksepäin."'
          }
        }
      ],
      ilta: [
        {
          id: 'yam-il-1',
          otsikko: 'Liike ahtaassa tilassa',
          ohje_leikkija: 'Katso tekniikkaklippi 30 s. Mitä jaloilla tapahtui?',
          ohje_rakentaja: 'Klippi 30s — 1v1 ahtaassa, identifioi liikesarja.',
          ohje_showcase: 'Analyysi 30s — liikesarja + body feints.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat tekevät ratkaisuja ahtaimmassakin tilassa rauhallisesti.',
            legenda: 'Klassikkotaiturien nuoruusvideoita on tutkittu lukemattomia kertoja oppimateriaalina.',
            suomi:   'Suomalaistaiturit ovat pärjänneet maailman kovimmilla kentillä.'
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
            nyky:    'Taiturit: "Pieni tila opettaa enemmän kuin iso kenttä."',
            legenda: 'Huippuakatemioissa pienikenttäpeli on opetusmuoto pienille pelaajille.',
            suomi:   'Suomalaisvalmentajat: "Pelaaja kasvaa pelin älyssä, ei koossa."'
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
            nyky:    'Taiturit kokeilevat yhtä uutta liikettä joka harjoituksessa.',
            legenda: 'Klassikkotaituri: "Liike on vain väline — pelaa, älä esitä."',
            suomi:   'Suomalaishuippu oppi pull push -liikkeen jo nuorena kotiseuransa kentällä.'
          }
        }
      ]
    },

    // ───────── VK 5 — LIIKE ILMAN PALLOA (Titan) ─────────
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
            nyky:    'Huippuhyökkääjät sprinttaavat lähes huippuvauhtia myös ilman palloa.',
            legenda: 'Liikkeen mestari: "Liike ilman palloa on suuri osa peliä."',
            suomi:   'Suomalaishyökkääjät tekevät kymmeniä sprinttejä ottelun aikana.'
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
            nyky:    'Huiput tekevät reaktiivisia liikkeitä ennen jokaista ottelua.',
            legenda: 'Liikkeen mestari lämmitteli aina muutaman minuutin reaktiivisilla liikkeillä.',
            suomi:   'Suomalaisvalmentajat: "Räjähtävyys on aamulla, ei iltapäivällä."'
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
            nyky:    'Huippuhyökkääjät sprinttaavat useita kertoja jokaisen minuutin aikana.',
            legenda: 'Liikkeen mestari: "Älä koskaan kävele — juokse tai seiso."',
            suomi:   'Suomalaisvalmentajat: "Sprintti = päätös, ei vain lihaksen kunto."'
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
            nyky:    'Hyökkääjät väistävät puolustajaa monta kertaa pelissä päästäkseen vapaaksi.',
            legenda: 'Liikkeen mestari: "Hyökkääjän pelin ydin on irti pääseminen."',
            suomi:   'Suomalaishyökkääjät tekevät tämän jokaisen ottelun lämmittelyssä.'
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
            nyky:    'Parhaat etsivät vapaata tilaa jatkuvasti pelin aikana.',
            legenda: 'Liikkeen mestari: "Hyvä juoksu on suurelta osin sitä, että näet sen ensin."',
            suomi:   'Suomalaisvalmentajat: "Tyhjä tila — siitä saa peliaikaa."'
          }
        },
        {
          id: 'haa-va-3',
          otsikko: 'Mielessä — liike',
          ohje_leikkija: 'Kuvittele että juokset tyhjään tilaan ja saat syötön.',
          ohje_rakentaja: 'Mielikuva: irrottautuva juoksu + maali yhdellä kosketuksella.',
          ohje_showcase: 'Visualisointi: off-ball run + 1-touch finish.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Huiput visualisoivat maaleja ennen jokaista peliä.',
            legenda: 'Liikkeen mestari: "Maali alkaa juoksusta — ei laukauksesta."',
            suomi:   'Suomalaisvalmentajat: "Päässä tehty maali on jo puoleksi tehty."'
          }
        }
      ],
      ilta: [
        {
          id: 'haa-il-1',
          otsikko: 'Tyhjään juoksu',
          ohje_leikkija: 'Katso 30 s liikeklippiä. Mihin hän juoksi?',
          ohje_rakentaja: 'Klippi 30s — tunnista juoksu ja sen ajoitus syöttöön.',
          ohje_showcase: 'Analyysi 30s — off-ball run timing + defensive line break.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Huippujuoksun ajoitus on opetusmateriaalia joka akatemiassa.',
            legenda: 'Klassikkojen syöttö + juoksu määritti aikansa parhaiden joukkueiden pelitavan.',
            suomi:   'Suomalaishyökkääjien nopeus on yltänyt Euroopan kärkitilastoihin.'
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
            nyky:    'Huiput: "Yksikään juoksu ei ole turha, vaikket saisi palloa."',
            legenda: 'Liikkeen mestari: "Monta turhaa juoksua palkitsee yhden maalin."',
            suomi:   'Suomalaisvalmentajat: "Älä jää puoli askelta myöhään — lähde ajoissa."'
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
            nyky:    'Huiput kirjaavat juoksutavoitteet muistiin joka päivä.',
            legenda: 'Liikkeen mestari asetti aina muutaman juoksutavoitteen peliä kohden.',
            suomi:   'Suomalaisvalmentajat: "Kolme juoksua per puoliaika — silloin olet tyytyväinen."'
          }
        }
      ]
    },

    // ───────── VK 6 — SYÖTTÖ (Maestro) ─────────
    trent: {
      aamu: [
        {
          id: 'tre-aa-1',
          otsikko: 'Maestron sisäterä',
          ohje_leikkija: 'Potkaise palloa seinään 20 kertaa sisäjalalla.',
          ohje_rakentaja: 'Sisäteräsyöttö seinään 20× — pallo palaa suoraan.',
          ohje_showcase: 'Inside foot pass 20× — tarkkuus + tukijalan asento.',
          tavoite: { tyyppi: 'toistot', maara: 20 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Parhaat syöttäjät harjoittelevat satoja sisäteräpasseja päivässä.',
            legenda: 'Syötön klassikko potkaisi satoja sisäteräpasseja päivässä jo lapsena.',
            suomi:   'Suomalaisvalmentajat: "Sisäterä on syötön perusta — ei pikaratkaisu."'
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
            nyky:    'Huiput: "Tukijalka tekee passin, ei potkujalka."',
            legenda: 'Syötön klassikko: "Suuri osa syötöstä on jo ennen kosketusta."',
            suomi:   'Suomalaisvalmentajat: "Tukijalan virhe = passin virhe."'
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
            nyky:    'Parhaat syöttäjät yltävät tarkkaan pitkään passiin kymmenien metrien päähän.',
            legenda: 'Syötön klassikon tavaramerkki oli kaareva pitkä passi.',
            suomi:   'Suomalaisvalmentajat: "Pitkä passi avaa pelin — siksi treeni joka päivä."'
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
            nyky:    'Parhaat takapuolustajat keräävät kauden aikana syöttöpisteitä ennätystahtiin.',
            legenda: 'Syötön klassikon tavaramerkki oli kaareva passi.',
            suomi:   'Suomalaisvalmentajat: "Kierre lähtee tukijalasta, ei potkujalasta."'
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
            legenda: 'Pelinrakentajamestari näki vapaat syöttölinjat joka kosketuksen aikana.',
            suomi:   'Suomalaisvalmentajat: "Syöttö alkaa pään kääntämisestä, ei potkusta."'
          }
        },
        {
          id: 'tre-va-3',
          otsikko: 'Mielessä — syöttö',
          ohje_leikkija: 'Kuvittele että teet maaliin syötön kaverille.',
          ohje_rakentaja: 'Mielikuva: assist-syöttö 30 m matkalta — kohde + kaari.',
          ohje_showcase: 'Visualisointi: defense-splitting pass — vector + timing.',
          tavoite: { tyyppi: 'mielikuva', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Huiput: "Mielessäni näen passin ennen kuin pallo tulee."',
            legenda: 'Syötön klassikko harjoitteli mielikuvaa ennen jokaista peliä.',
            suomi:   'Suomalaisvalmentajat: "Mielikuva on ilmainen treeni, joka iltaan."'
          }
        }
      ],
      ilta: [
        {
          id: 'tre-il-1',
          otsikko: 'Maagiset syötöt',
          ohje_leikkija: 'Katso 30 s syöttöklippiä. Miltä syötöt näyttivät?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 syöttötekniikka.',
          ohje_showcase: 'Analyysi 30s — pass type + decision context.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat oppivat avaussyötön tekniikan jo varhain akatemiassa.',
            legenda: 'Syötön klassikon vapaapotkut ja kaaret ovat opetusmateriaalia yhä.',
            suomi:   'Suomalaisten syöttäjien tilastot ovat olleet maajoukkueen kärkeä.'
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
            nyky:    'Huiput kirjaavat parhaat syötöt muistiin joka pelistä.',
            legenda: 'Syötön klassikko: "Yksi hyvä syöttö per peli muistetaan vuosia."',
            suomi:   'Suomalaisvalmentajat: "Uskalla yrittää myös vaikeampaa syöttöä."'
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
            nyky:    'Huiput: "Mieti syöttö ennen kuin saat pallon."',
            legenda: 'Syötön klassikko: "Joka päivä yksi syöttö, jota ei vielä ole tehnyt."',
            suomi:   'Suomalaisvalmentajat: "Yksi rohkea syöttö per peli — siinä kehittyminen."'
          }
        }
      ]
    },

    // ───────── VK 7 — MAALINTEKO (Titan) ─────────
    kane: {
      aamu: [
        {
          id: 'kan-aa-1',
          otsikko: 'Titanin rauhallinen lopetus',
          ohje_leikkija: 'Potkaise pallo seinään 10 kertaa rauhallisesti.',
          ohje_rakentaja: 'Hallittu maalipotku 10× seinään — sijoitus ennen vauhtia.',
          ohje_showcase: 'Composed finish 10× — accuracy edellä, low velocity.',
          tavoite: { tyyppi: 'toistot', maara: 10 },
          kesto_s: 90,
          tiesitko: {
            nyky:    'Parhaat maalintekijät osuvat usein heti kentälle tultuaan — valmius on huipussa.',
            legenda: 'Maalinteon mestari: "Maali on rauhallisuuden, ei voiman ratkaisu."',
            suomi:   'Suomalaisvalmentajat: "Hallittu kosketus voittaa kovaan kaiverretun."'
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
            nyky:    'Moni huippumaalintekijä treenasi heikon jalan kuntoon teininä, tunteja viikossa.',
            legenda: 'Maalinteon mestari treenasi heikomman jalan säännöllisesti omalla ajallaan.',
            suomi:   'Suomalaisvalmentajat: "Heikko jalka on tukijalan apu — ei vihollinen."'
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
            nyky:    'Parhaat maalintekijät tekevät useimmat maalinsa vain parilla kosketuksella.',
            legenda: 'Maalinteon mestari: "Maalintekijä on tehokas, ei tyylikäs."',
            suomi:   'Suomalaisvalmentajat: "Maalintekijä päättää laukauksen ennen kosketusta."'
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
            nyky:    'Maalintekijät kokeilevat varvaspotkua jo akatemiassa — se on nopein laukaus.',
            legenda: 'Klassikkohyökkääjä ratkaisi arvokisafinaalin yllättävällä varvaspotkulla.',
            suomi:   'Suomalaismaalintekijä on tehnyt varvaspotkulla maalin ulkomaisessa liigassa.'
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
            nyky:    'Parhaat vilkaisevat maalivahdin asentoa juuri ennen laukausta.',
            legenda: 'Maalinteon mestari: "Lue maalivahti — älä yritä yllättää."',
            suomi:   'Suomalaisvalmentajat: "Maalivahti tekee päätöksen ennen sinua."'
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
            nyky:    'Huiput visualisoivat maaleja ennen jokaista ottelua.',
            legenda: 'Maalinteon mestari: "Olen tehnyt jokaisen maalini päässäni ensin."',
            suomi:   'Suomalaisvalmentajat: "Mielikuvitus on maalintekijän paras ase."'
          }
        }
      ],
      ilta: [
        {
          id: 'kan-il-1',
          otsikko: 'Maalitähtihetket',
          ohje_leikkija: 'Katso 30 s maaliklippiä. Miten hän osuu?',
          ohje_rakentaja: 'Klippi 30s — tunnista 1 toistuva maalintekotapa.',
          ohje_showcase: 'Klippi-analyysi — finishing patterns + body shape.',
          tavoite: { tyyppi: 'video', maara: 1 },
          kesto_s: 60,
          tiesitko: {
            nyky:    'Parhaat maalintekijät tekevät kymmeniä maaleja kaudessa, vuodesta toiseen.',
            legenda: 'Maalinteon mestari teki uransa aikana satoja sarjamaaleja.',
            suomi:   'Suomalaismaalintekijöiden maalitahti on yltänyt maajoukkuetasolle.'
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
            nyky:    'Huiput: "Yksi hyvä laukaus opettaa enemmän kuin kymmenen huonoa."',
            legenda: 'Maalinteon mestari kirjasi laukauksensa muistiin joka pelistä.',
            suomi:   'Suomalaisvalmentajat: "Yksi maali voi muuttaa pelaajan uran."'
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
            nyky:    'Huiput kirjaavat maalitavoitteet muistiin joka päivä.',
            legenda: 'Maalinteon mestari: "Aamulla muutama maali mielessä — illalla yksi lisää."',
            suomi:   'Suomalaisvalmentajat: "Yksi maali per peli — siinä on tavoite."'
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
