// tm_teknistaktiset.js — GENEROITU (docs/data/parse_oma_versio.py). ÄLÄ MUOKKAA KÄSIN.
// Lähde: OMA_VERSIO-curriculum (docs/data/OMA_VERSIO_*.md). Aja parseri uudelleen kun curriculum päivittyy.
// §0a kanoninen · §0c suomi · suomalaiskoodit (T/LP/KK/KY/KH/LA/MV) · KPI-arviointi 1–3 (EI 1/3/5).

var TM_TT_PELIPAIKAT = {
  "MV": {
    "nimi": "Maalivahti",
    "numerot": [
      1
    ]
  },
  "LP": {
    "nimi": "Laitapuolustaja",
    "numerot": [
      2,
      3
    ]
  },
  "T": {
    "nimi": "Toppari",
    "numerot": [
      4,
      5
    ]
  },
  "KK": {
    "nimi": "Keskikenttäpelaaja",
    "numerot": [
      6,
      8
    ]
  },
  "KY": {
    "nimi": "Kymppi",
    "numerot": [
      10
    ]
  },
  "LA": {
    "nimi": "Laituri",
    "numerot": [
      7,
      11
    ]
  },
  "KH": {
    "nimi": "Keskushyökkääjä",
    "numerot": [
      9
    ]
  }
};
var TM_TT_PELIMUODOT = [
  "3v3",
  "5v5",
  "8v8",
  "11v11"
];
var TM_TT_ASTEIKKO = {
  "max": 3,
  "tasot": {
    "1": "Ei näy pelissä",
    "2": "Näkyy ohjatusti",
    "3": "Näkyy itsenäisesti"
  }
};

var TM_TT_YOUTH = [
  {
    "avain": "y_h0",
    "koodi": "Y-H0",
    "nimi": "HAVAINNOINTI",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "kaikki alkaa tiedosta – 99 % pelistä tapahtuu ilman palloa.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Sijoitu diagonaalisesti: näet enemmän pelaajia ja tilaa yhdellä katseella"
      },
      {
        "koodi": "b",
        "teksti": "Pidä peliasento avoimena: suljettu asento pakottaa arvaamaan"
      },
      {
        "koodi": "c",
        "teksti": "Rytmitä skannaus pallon mukaan: pallo kaukana → joukkueen tilat; pallo lähestyy → seuraava syöttösuunta ja lähin vastustaja; pallo tulossa → suora vastustajasi"
      },
      {
        "koodi": "d",
        "teksti": "Puolustaessa katso kolme asiaa: oma vartioitava, vaarallisin tila selustassasi ja pallollisen paine"
      }
    ],
    "kysymykset": [
      "Mitä näit ennen kuin pallo tuli sinulle?",
      "Missä lähin vastustaja oli, kun otit pallon?",
      "Milloin viimeksi käänsit päätäsi?"
    ],
    "painotus": "perusvaihe (miten) → yhteispelivaihe (milloin ja mitä)",
    "jatkuu": [],
    "pelaaja_miksi": "Kun katsot ympärille ennen kuin pallo tulee, tiedät jo mihin pelaat – ehdit ennen muita."
  },
  {
    "avain": "y_h1",
    "koodi": "Y-H1",
    "nimi": "HALTUUNOTTO",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "ensimmäinen kosketus ratkaisee, kuka omistaa seuraavan sekunnin.",
    "pelimuoto": [
      "5v5",
      "8v8"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Käännä pää pallon ollessa matkalla: tiedät minne suuntaat ennen kosketusta"
      },
      {
        "koodi": "b",
        "teksti": "Valitse: hyökkää palloa vastaan (50/50, tilan voitto) tai anna tulla (ohitus, kova syöttö vapaassa tilassa)"
      },
      {
        "koodi": "c",
        "teksti": "Ota pallo optimihetkellä, älä helpoimmalla: myöhäinen kosketus antaa puolustajalle edun"
      },
      {
        "koodi": "d",
        "teksti": "Suuntaa ensimmäinen kosketus seuraavaan toimintoon tai pois vastustajalta: kosketus on päätös, ei pysäytys"
      },
      {
        "koodi": "e",
        "teksti": "Käytä molempia jalkoja ja pehmeitä pintoja: pallo ei pysähdy, peli ei pysähdy"
      }
    ],
    "kysymykset": [
      "Minne ensimmäinen kosketuksesi vei pallon – ja miksi?",
      "Olisitko voinut ottaa pallon aikaisemmin/aggressiivisemmin?",
      "Mihin toimintoon kosketuksesi kytkeytyi?"
    ],
    "painotus": "perusvaihe (tekniikka, molemmat jalat) → yhteispelivaihe (suuntaus ja ajoitus paineessa)",
    "jatkuu": [],
    "pelaaja_miksi": "Kun ensimmäinen kosketus menee oikeaan suuntaan, olet askeleen edellä puolustajaa."
  },
  {
    "avain": "y_h2",
    "koodi": "Y-H2",
    "nimi": "SYÖTTÄMINEN",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "syöttö on havainnon toteutus – ei tekniikkasuoritus.",
    "pelimuoto": [
      "8v8",
      "5v5"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Kerää tieto ennen syöttöä: ennakoitu syöttö on aina nopein"
      },
      {
        "koodi": "b",
        "teksti": "Priorisoi syöttösuunnat: murtava ensin, etenevä sitten, säilyttävä viimeisenä"
      },
      {
        "koodi": "c",
        "teksti": "Mitoita voima aikomuksen mukaan: kova syöttö murtaa, pehmeä houkuttelee"
      },
      {
        "koodi": "d",
        "teksti": "Syötä etuun: oikea jalka, oikea tila, vastaanottajan liike huomioiden"
      },
      {
        "koodi": "e",
        "teksti": "Piilota aikomus keholla: harhauttava syöttö ohittaa myös lukijan, ei vain prässääjän"
      },
      {
        "koodi": "f",
        "teksti": "Syötä ja liiku: syöttö ei pääty joukkuetoverin jalkaan, se jatkuu tukena"
      },
      {
        "koodi": "g",
        "teksti": "Vaihtele lyhyttä ja pitkää: liikutettu puolustus aukeaa – pitkä pallo vain edulla"
      }
    ],
    "kysymykset": [
      "Miksi valitsit juuri tuon syötön?",
      "Kumpaan jalkaan / mihin tilaan kaveri halusi pallon?",
      "Minne liikuit syöttösi jälkeen?"
    ],
    "painotus": "perusvaihe (tekniikka ja voima) → yhteispelivaihe (valinnat ja ajoitus)",
    "jatkuu": [
      "T-H3",
      "LP-H3",
      "KK-H4",
      "KY-H4",
      "MV-H1"
    ],
    "pelaaja_miksi": "Hyvä syöttö vie joukkueen eteenpäin ja yllättää vastustajan."
  },
  {
    "avain": "y_h3",
    "koodi": "Y-H3",
    "nimi": "TEMPOKULJETUS",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "tila edessä tai tarve sitoa vastustaja – kuljetus on väline, ei tavoite.",
    "pelimuoto": [
      "5v5",
      "8v8"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Pidä pää ylhäällä kuljettaessasi: tieto ratkaisee reitin ja seuraavan valinnan"
      },
      {
        "koodi": "b",
        "teksti": "Sido pallon etäisyys tilanteeseen: lähelle kun puolustaja on lähellä, kauas kun tila aukeaa"
      },
      {
        "koodi": "c",
        "teksti": "Vaihda suuntaa ja rytmiä: ennustettava kuljettaja on helppo riistettävä"
      },
      {
        "koodi": "d",
        "teksti": "Suojaa kuljetus kauemmalla jalalla: keho puolustajan ja pallon väliin"
      },
      {
        "koodi": "e",
        "teksti": "Valitse syöttö tai kuljetus tilanteesta: tila kiinni → syötä; joukkuetoveri paremmassa asemassa → syötä; 2v1 → kuljeta kohti puolustajaa ja vapauta"
      }
    ],
    "kysymykset": [
      "Milloin kannattaa kuljettaa ja milloin syöttää?",
      "Ketä kuljetuksesi sitoi – ja kuka vapautui?",
      "Miksi pidit pallon lähellä / työnsit sen kauas?"
    ],
    "painotus": "perusvaihe (ydin) → yhteispelivaihe (2v1-päätökset)",
    "jatkuu": [
      "T-H4",
      "LA-H4"
    ],
    "pelaaja_miksi": "Kun kuljetat pää ylhäällä, näet milloin viedä palloa ja milloin syöttää kaverille."
  },
  {
    "avain": "y_h4",
    "koodi": "Y-H4",
    "nimi": "HARHAUTTAMINEN",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "puolustaja edessä eikä syöttöä tarjolla – 1v1 on ratkaistava itse.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "ika": [
      10,
      13
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Harhauta ennen kontaktia: liikuta puolustaja ensin, ohita sitten"
      },
      {
        "koodi": "b",
        "teksti": "Ohita suuntaavalla kosketuksella ja rytminvaihdolla: nopeusero ratkaisee, ei temppu"
      },
      {
        "koodi": "c",
        "teksti": "Anna väärää tietoa keholla: puolustaja lukee lantiota, ei jalkoja"
      },
      {
        "koodi": "d",
        "teksti": "Suojaa etu ohituksen jälkeen: leikkaa vastustajan eteen, äläkä anna ohitetun palata"
      }
    ],
    "kysymykset": [
      "Kummalle puolelle puolustaja antoi tilaa?",
      "Mikä sai puolustajan liikkeelle harhautuksessasi?",
      "Mitä teit heti ohituksen jälkeen?"
    ],
    "painotus": "yhteispelivaihe (10–13)",
    "jatkuu": [
      "LA-H4",
      "KH-H5"
    ],
    "pelaaja_miksi": "Kun harhautat, pääset puolustajan ohi ja saat tilaa tehdä maali tai syöttö."
  },
  {
    "avain": "y_h5",
    "koodi": "Y-H5",
    "nimi": "PALLON SUOJAAMINEN",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "paine päällä eikä etenemissuuntaa – pallo pidetään joukkueella.",
    "pelimuoto": [
      "5v5",
      "8v8"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Laita keho pallon ja vastustajan väliin ja lantio alas: matala painopiste kestää kontaktin"
      },
      {
        "koodi": "b",
        "teksti": "Pidä pää ylhäällä suojatessa: suojaaminen on välivaihe, ei päämäärä"
      },
      {
        "koodi": "c",
        "teksti": "Käänny pienillä kosketuksilla avoimeen tilaan: kääntö kytkee suojauksen seuraavaan toimintoon"
      },
      {
        "koodi": "d",
        "teksti": "Käytä syöttöä suojana: seinäsyöttö ostaa aikaa ja säilyttää pallon"
      }
    ],
    "kysymykset": [
      "Missä kehosi oli suhteessa vastustajaan?",
      "Näitkö suojatessasi, minne voit syöttää?",
      "Mihin tilaan käännyit – miksi sinne?"
    ],
    "painotus": "perusvaihe (a–b) → yhteispelivaihe (c–d)",
    "jatkuu": [
      "KH-H3"
    ],
    "pelaaja_miksi": "Kun suojaat pallon kehollasi, se pysyy joukkueella vaikka vastustaja painaa."
  },
  {
    "avain": "y_h6",
    "koodi": "Y-H6",
    "nimi": "TUEN TARJOAMINEN",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "pallollinen tarvitsee pelattavan – tuki on joukkuepelin perusyksikkö.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Älä juokse kohti palloa ilman syytä: tilan pienentäminen tappaa syöttölinjan"
      },
      {
        "koodi": "b",
        "teksti": "Näyttäydy vapaassa tilassa oikeassa peliasennossa: tuki on olemassa vain, jos pallollinen näkee sen"
      },
      {
        "koodi": "c",
        "teksti": "Pyydä palloa diagonaalisesta sijainnista: diagonaali avaa peliasennon ja jatkon ensimmäisellä kosketuksella"
      },
      {
        "koodi": "d",
        "teksti": "Tarjoa eri syöttölinja kuin muut: kaksi pelaajaa samalla linjalla on yksi pelattava"
      },
      {
        "koodi": "e",
        "teksti": "Auta sieltä, mistä ohitat oman vastustajasi – tai anna hätätuki"
      },
      {
        "koodi": "f",
        "teksti": "Ennakoi ja valmistele seuraava tuki pallon liikkuessa: tuki alkaa ennen kuin palloa tarvitaan"
      }
    ],
    "kysymykset": [
      "Näkeekö pallollinen sinut nyt?",
      "Kuka muu on samalla syöttölinjalla kanssasi?",
      "Mistä voisit auttaa niin, että ohitat oman vastustajasi?"
    ],
    "painotus": "perusvaihe (a–b) → yhteispelivaihe (c–f)",
    "jatkuu": [
      "T-H2",
      "LP-H2",
      "KK-H2",
      "KK-H3",
      "KY-H2",
      "KH-H3",
      "LA-H3",
      "MV-H2"
    ],
    "pelaaja_miksi": "Kun näyttäydyt vapaana, kaverisi saa aina pelattavan eikä menetä palloa."
  },
  {
    "avain": "y_h7",
    "koodi": "Y-H7",
    "nimi": "VARTIOINNISTA IRTAANTUMINEN",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "vartija kiinni – tila on ansaittava liikkeellä.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "ika": [
      10,
      12
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Lähde diagonaalista kohti selustaa: selusta on vaikein vartioida ja helpoin ajoittaa pallon rataan"
      },
      {
        "koodi": "b",
        "teksti": "Priorisoi hyödylliset alueet: irtaannu sinne, mistä peli etenee"
      },
      {
        "koodi": "c",
        "teksti": "Ajoita liike pallollisen mahdollisuuksiin: liike alkaa, kun syöttäjä pystyy syöttämään"
      },
      {
        "koodi": "d",
        "teksti": "Käytä vastaliikettä ja rytminvaihtoa: 3–4 askelta väärään suuntaan riittää"
      },
      {
        "koodi": "e",
        "teksti": "Vuorottele irtaantumista ja tukea: ennustettava liikkuja on helppo vartioitava"
      }
    ],
    "kysymykset": [
      "Minne puolustaja katsoi, kun lähdit?",
      "Miksi lähdit juuri sillä hetkellä?",
      "Mihin suuntaan liikuit ensin – ja minne halusit pallon?"
    ],
    "painotus": "yhteispelivaihe (perusta 10–12, syvennys 12–14)",
    "jatkuu": [
      "KH-H2",
      "LA-H2",
      "KY-H2"
    ],
    "pelaaja_miksi": "Kun irtaudut vartijastasi, saat tilaa ja pääset pelaamaan vapaana."
  },
  {
    "avain": "y_h8",
    "koodi": "Y-H8",
    "nimi": "LEVEYTEEN JA SYVYYTEEN PELAAMINEN",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "joukkue hyökkää – tilat luodaan yhdessä.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "ika": [
      10,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Anna joukkueelle leveys ja syvyys hyökätessä: iso kenttä venyttää puolustuksen"
      },
      {
        "koodi": "b",
        "teksti": "Tunnista, kenelle tila syntyy: leveys voi olla syöttöä varten tai tilan raivaamista muille"
      },
      {
        "koodi": "c",
        "teksti": "Kavenna viimeistelyalueilla: päädyssä leveys muuttuu läsnäoloksi boksissa"
      }
    ],
    "kysymykset": [
      "Kuka venyttää kenttää, jos sinä kavennat?",
      "Kenelle tilasi syntyi?",
      "Milloin leveys auttaa enemmän kuin syvyys?"
    ],
    "painotus": "yhteispelivaihe",
    "jatkuu": [
      "LA-H1",
      "KH-H1",
      "LP-H5"
    ],
    "pelaaja_miksi": "Kun teet kentästä ison, vastustajan on vaikea puolustaa ja tilaa syntyy kavereille."
  },
  {
    "avain": "y_h9",
    "koodi": "Y-H9",
    "nimi": "VIIMEISTELY",
    "dim": "hyokkays",
    "faasi": "hyokkays",
    "pelitilanne": "maali on näkyvissä – hyökkäys päätetään.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Laukaise rohkeasti, kun näet maalin: yritys on perusvaiheessa aina oikea ratkaisu"
      },
      {
        "koodi": "b",
        "teksti": "Viimeistele molemmilla jaloilla, liikkeestä ja ensimmäisellä: peli ei anna aikaa asetteluun"
      },
      {
        "koodi": "c",
        "teksti": "Valitse laukaus tai syöttö tilanteesta: maalivahti ja puolustaja kertovat vastauksen"
      },
      {
        "koodi": "d",
        "teksti": "Sijoita tai laukaise voimalla maalivahdin sijainnin mukaan: katso ennen viimeistelyä"
      },
      {
        "koodi": "e",
        "teksti": "Ryntää irtopalloihin jokaisen laukauksen jälkeen: toinen aalto tekee maalit"
      }
    ],
    "kysymykset": [
      "Laukaus vai syöttö – mitä maalivahti ja puolustaja antoivat sinulle?",
      "Minne liikuit laukauksen jälkeen?",
      "Miksi valitsit sijoittamisen / voiman?"
    ],
    "painotus": "perusvaihe (a–b, rohkeus) → yhteispelivaihe (c–e, valinnat)",
    "jatkuu": [
      "KH-H4",
      "LA-H6",
      "KY-H5"
    ],
    "pelaaja_miksi": "Kun uskallat laukoa nähdessäsi maalin, teet maaleja – yritys on aina oikea."
  },
  {
    "avain": "y_p1",
    "koodi": "Y-P1",
    "nimi": "1v1-PUOLUSTAMINEN",
    "dim": "puolustus",
    "faasi": "puolustus",
    "pelitilanne": "pallollinen vastassa – puolustamisen perusyksikkö.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Älä tule ohitetuksi: viivytä, jos pallollisen tilanne on vakaa – riisto on mahdollisuus, ohittumattomuus velvollisuus"
      },
      {
        "koodi": "b",
        "teksti": "Puolusta maalin ja vastustajan välissä ja ohjaa haluttuun suuntaan: suunnattu puolustus on joukkueen puolustusta"
      },
      {
        "koodi": "c",
        "teksti": "Lähesty nopeasti, pysähdy ajoissa (~1 m): pienennä vastustajan aika ja tila – älä ohi omasta vauhdistasi"
      },
      {
        "koodi": "d",
        "teksti": "Puolusta matalassa asennossa aktiivisilla jaloilla: reaktio lähtee asennosta"
      },
      {
        "koodi": "e",
        "teksti": "Häiritse kontaktilla: kädet tuntevat, keho työntää sivuttain, jalat katkovat"
      },
      {
        "koodi": "f",
        "teksti": "Puolusta seinäsyöttö tilaa suojaten: ensiaskeleet taakse ja katkaise juoksurata"
      },
      {
        "koodi": "g",
        "teksti": "Jatka ohituksen jälkeen: toinen yritys pelastaa tilanteita"
      }
    ],
    "kysymykset": [
      "Milloin pysähdyit – liian aikaisin vai liian myöhään?",
      "Mihin suuntaan ohjasit vastustajaa – miksi?",
      "Mitä teit, kun sinut ohitettiin?"
    ],
    "painotus": "perusvaihe (a, d, g) → yhteispelivaihe (b, c, e, f + vyöhykkeen ja vastustajan tilanteen mukaan)",
    "jatkuu": [],
    "pelaaja_miksi": "Kun et anna ohittaa itseäsi, pysäytät hyökkäyksen ja voit riistää pallon."
  },
  {
    "avain": "y_p2",
    "koodi": "Y-P2",
    "nimi": "VARTIOINTI",
    "dim": "puolustus",
    "faasi": "puolustus",
    "pelitilanne": "oma vastustaja ilman palloa – vartiointi on valmiutta, ei seisomista.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "ika": [
      6,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Asetu puolustuskolmioon: oman maalin ja vastustajan väliin niin, että näet pallon ja vartioitavan samaan aikaan"
      },
      {
        "koodi": "b",
        "teksti": "Estä selustaan pääsy: selusta ensin, katko vasta sitten"
      },
      {
        "koodi": "c",
        "teksti": "Säädä etäisyys kahden ehdon mukaan: ehdit vartioitavaan ja pysyt linjassa joukkuetovereihisi"
      },
      {
        "koodi": "d",
        "teksti": "Tiivistä omaa maalia lähestyttäessä: boksissa vartiointi on kosketusetäisyyttä"
      },
      {
        "koodi": "e",
        "teksti": "Pudota omalla kaistallasi, kun sinut ohitetaan: paluu on osa vartiointia"
      }
    ],
    "kysymykset": [
      "Näitkö pallon ja oman pelaajasi samaan aikaan?",
      "Pääsikö vastustaja selkäsi taakse – miksi?",
      "Miten säädit etäisyyttä, kun pallo liikkui?"
    ],
    "painotus": "perusvaihe (a–b) → yhteispelivaihe (c–e)",
    "jatkuu": [],
    "pelaaja_miksi": "Kun näet pallon ja vartioitavasi samaan aikaan, ehdit väliin ennen kuin vaara syntyy."
  },
  {
    "avain": "y_p3",
    "koodi": "Y-P3",
    "nimi": "VARMISTAMINEN",
    "dim": "puolustus",
    "faasi": "puolustus",
    "pelitilanne": "joukkuetoveri prässää – sinä olet vakuutus.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "ika": [
      10,
      12
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Asetu prässäävän joukkuetoverin taakse diagonaaliin: autat ohituksessa ja suljet samalla syöttölinjan"
      },
      {
        "koodi": "b",
        "teksti": "Pidä optimietäisyys: liian lähellä yksi ohitus vie kaksi puolustajaa, liian kaukana et auta ketään"
      },
      {
        "koodi": "c",
        "teksti": "Vartioi omaa pelaajaasi samalla kun varmistat: varmistus on kaksoistehtävä (2v2)"
      },
      {
        "koodi": "d",
        "teksti": "Lue pallollisen paine: kova prässi → kiinni omassa vartioitavassa; ei prässiä → painota varmistusta"
      },
      {
        "koodi": "e",
        "teksti": "Mene apuun heti, kun joukkuetoveri ohitetaan: sekunnin viive kaksinkertaistaa vastustajan tilan"
      }
    ],
    "kysymykset": [
      "Missä olit, kun joukkuetoverisi prässäsi?",
      "Ketä sinä vartioit samalla, kun varmistit?",
      "Minkä syöttölinjan suljit sijainnillasi?"
    ],
    "painotus": "yhteispelivaihe (perusta 10–12, syvennys 12–14)",
    "jatkuu": [],
    "pelaaja_miksi": "Kun olet kaverisi tukena, yksi ohitus ei riitä vastustajalle – autatte toisianne."
  },
  {
    "avain": "y_p4",
    "koodi": "Y-P4",
    "nimi": "TILAN PUOLUSTAMINEN JA MERKKAUKSEN VAIHTO",
    "dim": "puolustus",
    "faasi": "puolustus",
    "pelitilanne": "vastustajat vaihtavat paikkoja – vastuu on tilasta, ei vain pelaajasta.",
    "pelimuoto": [
      "11v11"
    ],
    "ika": [
      10,
      14
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Puolusta tilaa, älä vain pelaajaa: vaarallisin ei aina ole oma vartioitava"
      },
      {
        "koodi": "b",
        "teksti": "Vaihda merkkaus ääneen: sopimaton vaihto on kahden pelaajan virhe"
      },
      {
        "koodi": "c",
        "teksti": "Pidä linjaetäisyydet: tilavastuu on linjan yhteinen"
      },
      {
        "koodi": "d",
        "teksti": "Pudota kaistallesi ohitettuna: tilavastuu palaa ennen pelaajavastuuta"
      }
    ],
    "kysymykset": [
      "Kumpi oli juuri nyt vaarallisempi: pelaajasi vai tilasi?",
      "Kerroitko merkkauksen vaihdosta kaverillesi?",
      "Mihin pudotit, kun sinut ohitettiin?"
    ],
    "painotus": "yhteispelivaihe (10–14) – silta aluepuolustukseen",
    "jatkuu": [],
    "pelaaja_miksi": "Kun puolustat tilaa etkä vain pelaajaa, vaarallisin paikka pysyy tukossa."
  }
];

var TM_TT_FUNDAMENTIT = {
  "MV": [
    {
      "avain": "mv_p1",
      "koodi": "MV-P1",
      "nimi": "SYVYYSSIJAINTI JA SELUSTAN HALLINTA",
      "faasi": "puolustus",
      "pelitilanne": "peli liikkuu – maalivahdin peruspaikka elää puolustuslinjan mukana.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä oikea syvyys suhteessa puolustuslinjaan: korkea linja, korkea maalivahti – selustan tila on sinun vastuualueesi"
        },
        {
          "koodi": "b",
          "teksti": "Säädä sijaintiasi jatkuvasti pallon sijainnin, laukaisu-uhan ja selustauhan tasapainon mukaan: oikea paikka tekee torjunnasta helpon ja katkosta mahdollisen"
        },
        {
          "koodi": "c",
          "teksti": "Ennakoi ja katkaise syötöt puolustuslinjan taakse, rohkeasti myös rangaistusalueen ulkopuolella: ensimmäinen kosketus vie pallon pois vaara-alueelta"
        },
        {
          "koodi": "d",
          "teksti": "Palauta perussijainti välittömästi tilanteen vaihtuessa: maalivahdin myöhässä oleva paluu on selittämätön maali"
        }
      ],
      "kysymykset": [
        "Missä seisoit suhteessa linjaan – miksi?",
        "Milloin viimeksi korjasit paikkaasi, vaikka pallo ei liikkunut sinua kohti?",
        "Kenen vastuulla selusta oli?",
        "Milloin viimeksi lähdit katkaisemaan selustasyötön – mikä sen ratkaisi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_p2",
      "koodi": "MV-P2",
      "nimi": "PELIN OHJAAMINEN ÄÄNELLÄ",
      "faasi": "puolustus",
      "pelitilanne": "koko ottelu – maalivahti on ainoa, joka näkee kaiken.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ohjaa puolustuslinjan syvyyttä ja sijoittumista jatkuvasti: hiljainen maalivahti hukkaa joukkueen suurimman tiedollisen edun"
        },
        {
          "koodi": "b",
          "teksti": "Osoita merkkausvastuut ja vapaat pelaajat ennen kuin vaara syntyy: tieto on arvokasta vain ajoissa annettuna"
        },
        {
          "koodi": "c",
          "teksti": "Ohjaa joukkueen prässiä: milloin painetaan, milloin pudotaan – maalivahti näkee prässin aukot ensimmäisenä"
        }
      ],
      "kysymykset": [
        "Mitä käskyjä annoit viimeisen minuutin aikana?",
        "Kenet osoitit vapaaksi ennen kuin vaara syntyi?",
        "Milloin käskit prässätä tai pudottaa?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_p3",
      "koodi": "MV-P3",
      "nimi": "MAALINTEON ESTÄMINEN",
      "faasi": "puolustus",
      "pelitilanne": "laukaus tulee – sijoittuminen tekee torjunnasta helpon.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Kavenna kulma oikea-aikaisella liikkeellä ja ole paikallaan laukaisuhetkellä: liikkuva maalivahti ei saa painoa torjuntaan"
        },
        {
          "koodi": "b",
          "teksti": "Ohjaa irtopallot sivulle tai yli, ei koskaan eteen keskelle: torjunnan suunta on osa torjuntaa"
        },
        {
          "koodi": "c",
          "teksti": "1v1: kavenna tilaa kun pallo on irti hyökkääjän jalasta, pysy pystyssä mahdollisimman pitkään – kaatuva maalivahti on ohitettu maalivahti"
        },
        {
          "koodi": "d",
          "teksti": "Jatka puolustamista, kunnes tilanne on ohi: valmius toiseen ja kolmanteen torjuntaan"
        }
      ],
      "kysymykset": [
        "Olitko paikallaan laukaisuhetkellä?",
        "Minne torjuntasi ohjautui?",
        "Kuinka pitkään pysyit pystyssä 1v1:ssä?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_p4",
      "koodi": "MV-P4",
      "nimi": "RANGAISTUSALUEEN ILMATILAN HALLINTA",
      "faasi": "puolustus",
      "pelitilanne": "keskitys tulee – päätös tehdään kerran ja siihen sitoudutaan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tee lähtöpäätös ajoissa ja sitoutuneesti: väliin tai maalille, ei puolivälin ratkaisuja – epäröinti kaataa sekä maalivahdin että puolustajan"
        },
        {
          "koodi": "b",
          "teksti": "Ota kiinni aina kun mahdollista, nyrkkää pitkälle ja sivulle kun et: kiinniotto lopettaa tilanteen, nyrkkäys vain siirtää sitä"
        },
        {
          "koodi": "c",
          "teksti": "Sijoitu keskityslinjaan nähden niin, että katat sekä ykkös- että kakkostolpan uhan"
        },
        {
          "koodi": "d",
          "teksti": "Huuda \"OMA!\" tai \"ULOS!\" selkeästi ja ajoissa: huuto sitoo koko puolustuksen yhteen ratkaisuun"
        }
      ],
      "kysymykset": [
        "Milloin teit lähtöpäätöksen – sitouduitko siihen?",
        "Miksi nyrkkäsit etkä ottanut kiinni?",
        "Kuuluiko huutosi – mitä puolustajat tekivät sen jälkeen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_p5",
      "koodi": "MV-P5",
      "nimi": "JATKOTILANTEET",
      "faasi": "puolustus",
      "pelitilanne": "torjunta, purkupallo tai kamppailu – tilanne jatkuu.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Nouse ja asemoidu uudelleen välittömästi torjunnan jälkeen: toinen aalto tulee sekunneissa"
        },
        {
          "koodi": "b",
          "teksti": "Ennakoi purkupallot ja pudotukset rangaistusalueen edustalla: irtopallo boksin reunalla on laukaus ilman vartijaa"
        },
        {
          "koodi": "c",
          "teksti": "Ennakoi oman joukkueen menetykset ja korjaa sijaintiasi jo ennen vastustajan hyökkäystä: sweeper-valmius alkaa ennen tarvetta"
        }
      ],
      "kysymykset": [
        "Missä olit valmiina toiseen laukaukseen?",
        "Minne purkupallo putosi – ennakoitko sen?",
        "Missä seisoit, kun oma joukkue menetti pallon?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_h0",
      "koodi": "MV-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "takaisinsyöttö lähestyy – maalivahdilla on eniten aikaa ja paras näkymä, käytä ne.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Muodosta tilannekuva vastustajan prässiryhmityksestä jo ennen kuin saat pallon: ratkaisu on valmiina ennen palloa"
        },
        {
          "koodi": "b",
          "teksti": "Avoin peliasento ja ensimmäisen kosketuksen suuntaus pelattavaan suuntaan: yksi kosketus väärään suuntaan kutsuu prässin"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa vapaat pelaajat ja tilat ennen jokaista takaisinsyöttöä: paniikki syntyy tiedon puutteesta, ei paineesta"
        }
      ],
      "kysymykset": [
        "Millainen vastustajan prässi oli ennen kuin sait pallon?",
        "Mihin suuntasit ensimmäisen kosketuksen – miksi?",
        "Ketkä olivat vapaana ennen takaisinsyöttöä?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_h1",
      "koodi": "MV-H1",
      "nimi": "PELIN AVAAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "maalivahti pallossa – avausvalinta tehdään vastustajan prässin mukaan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Avaa maasyötöllä toppareille tai laitapuolustajille, kun tilaa on: lyhyt avaus säilyttää pallon ja vetää vastustajan prässiin"
        },
        {
          "koodi": "b",
          "teksti": "Käytä pitkää avausta aseena: kohdennettu avaus valittuun kamppailuun tai selustaan – hyvä pitkä avaus ohittaa koko prässin"
        },
        {
          "koodi": "c",
          "teksti": "Valitse lyhyt tai pitkä vastustajan prässin mukaan: älä pakota avausta prässiin, äläkä pitkää ilman osoitetta"
        }
      ],
      "kysymykset": [
        "Miksi avasit lyhyen tai pitkän?",
        "Mihin kamppailuun pitkä avauksesi kohdistui?",
        "Oliko avauksellesi vaihtoehtoa – pakotitko sen prässiin?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_h2",
      "koodi": "MV-H2",
      "nimi": "YLIMÄÄRÄINEN PELAAJA RAKENTELUSSA",
      "faasi": "hyokkays",
      "pelitilanne": "oma joukkue rakentaa – maalivahti luo +1-ylivoiman.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa jatkuva tukivaihtoehto toppareille: maalivahti tekee kahdesta topparista kolme pelaajaa"
        },
        {
          "koodi": "b",
          "teksti": "Ole aina turvallinen ulospääsy pallolliselle (hätätuki): pelko kaikkoaa, kun takana on pelattava"
        },
        {
          "koodi": "c",
          "teksti": "Sijoitu niin, että syöttökulmat molemmille toppareille ovat auki: suoraan pallollisen taakse asettuva maalivahti tarjoaa vain yhden linjan"
        }
      ],
      "kysymykset": [
        "Olitko pelattavissa koko rakentelun ajan?",
        "Montako syöttökulmaa sijaintisi tarjosi?",
        "Milloin toppari käytti sinua hätätukena?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_h3",
      "koodi": "MV-H3",
      "nimi": "TILANTEENVAIHDON KÄYNNISTÄMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "pallonvoitto – vastahyökkäys alkaa maalivahdista.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Käynnistä vastahyökkäys nopealla heitolla tai syötöllä ensimmäiseen aaltoon: maalivahdin käsi on tarkin pitkä syöttö"
        },
        {
          "koodi": "b",
          "teksti": "Tunnista tilanne: vastahyökkäysmahdollisuus vai pelin rauhoittaminen – väärä valinta hukkaa joko edun tai pallon"
        }
      ],
      "kysymykset": [
        "Kuinka nopeasti pallo lähti pallonvoiton jälkeen?",
        "Miksi käynnistit tai rauhoitit?",
        "Minne ensimmäinen aalto juoksi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_h4",
      "koodi": "MV-H4",
      "nimi": "PELIN RYTMIN HALLINTA",
      "faasi": "hyokkays",
      "pelitilanne": "ottelun tilanne elää – maalivahti säätelee tempoa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Nopeuta, kun etu on tarjolla; rauhoita, kun joukkue tarvitsee hengähdyksen: rytmi on maalivahdin työkalu, ei sattumaa"
        },
        {
          "koodi": "b",
          "teksti": "Pidä pallo joukkueella paineen alla ilman riskiä: ei pakotettuja avauksia keskelle"
        }
      ],
      "kysymykset": [
        "Mikä ottelutilanne oli – miten rytmisi palveli sitä?",
        "Missä tilanteessa otit riskin – miksi?",
        "Kenen aloitteesta tempo muuttui?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "mv_h5",
      "koodi": "MV-H5",
      "nimi": "SIJOITTUMINEN JOUKKUEEN HALLITESSA",
      "faasi": "hyokkays",
      "pelitilanne": "peli on vastustajan päädyssä – maalivahti pelaa silti.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Nouse korkealle joukkueen hyökätessä: lyhennä etäisyys puolustuslinjaan ja ole pelattavissa – alas jäänyt maalivahti pelaa joukkueensa 10 vastaan 11"
        },
        {
          "koodi": "b",
          "teksti": "Turvaa selusta ennakoivasti: sweeper-valmius heti menetyksen tapahtuessa – siirtymä hyökkäyksestä puolustukseen on maalivahdilla yksi askel"
        }
      ],
      "kysymykset": [
        "Kuinka kaukana olit linjasta joukkueen hyökätessä?",
        "Olitko pelattavissa takaisinsyötölle?",
        "Kuinka nopeasti siirryit sweeper-valmiuteen menetyksessä?"
      ],
      "harjoitteet": []
    }
  ],
  "LP": [
    {
      "avain": "lp_p1",
      "koodi": "LP-P1",
      "nimi": "PUOLUSTUSLINJAN TASAPAINO LAIDALLA",
      "faasi": "puolustus",
      "pelitilanne": "joukkue puolustaa ryhmittyneenä – laitapuolustaja on linjan pääty, jonka virhe näkyy heti selustassa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä linjan leveys- ja syvyystasapaino omalta laidaltasi: linjan pääty määrittää koko linjan muodon"
        },
        {
          "koodi": "b",
          "teksti": "Elä keskustopparin liikkeen mukana: kun hän astuu ylös, sinä tasapainotat – kahden vierekkäisen pelaajan ei pidä koskaan liikkua samaan suuntaan sokkona"
        },
        {
          "koodi": "c",
          "teksti": "Järjestäydy uudelleen heti tilanteen rikkoutuessa: laidan aukko on vastustajan helpoin reitti boksiin"
        }
      ],
      "kysymykset": [
        "Kuka liikutti laidan linjaa – sinä vai toppari?",
        "Milloin olit eri korkeudella kuin topparisi – miksi?",
        "Miten korjasit linjan tilanteen rikkoutuessa?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_p2",
      "koodi": "LP-P2",
      "nimi": "VARTIOINTI LAIDALLA",
      "faasi": "puolustus",
      "pelitilanne": "vastustajan laituri tai nouseva pelaaja hakee palloa laidalta tai selustasta.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu oikeassa peliasennossa (rintamasuunta ja kehon asento siten, että pystyt reagoimaan nopeasti joka suuntaan) ja pidä pallo ja vastustaja näkökentässäsi"
        },
        {
          "koodi": "b",
          "teksti": "Tunnista merkattava pelaaja ja korjaa tai mukauta omaa sijoittumistasi jatkuvasti: vartiointi on liikkuva tehtävä, ei paikka"
        },
        {
          "koodi": "c",
          "teksti": "Pienennä tilaa, kun vartioitavalla pelaajalla on mahdollisuus osallistua peliin: myöhässä tehty painostus on pelkkä saattaminen"
        },
        {
          "koodi": "d",
          "teksti": "Säilytä valppaus merkattavasta myös oman joukkueen hyökätessä: laituri karkaa juuri sillä hetkellä, kun katsot vain palloa"
        }
      ],
      "kysymykset": [
        "Näitkö laiturisi ja pallon samaan aikaan?",
        "Ehditkö pienentää tilan ennen vastaanottoa?",
        "Missä vartioitavasi oli oman hyökkäyksenne aikana?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_p3",
      "koodi": "LP-P3",
      "nimi": "SELUSTAN HALLINTA JA VARMISTAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "keskustoppari prässää tai vastustaja hakee syöttöä laidan selustaan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Varmista keskustopparia, joka prässää pallollista pelaajaa: kulma ja etäisyys niin, että katat sekä ohituksen että syötön"
        },
        {
          "koodi": "b",
          "teksti": "Pudota nopeasti alemmas ennakoiden syötöt tyhjään tilaan: lähde ennen syöttöä, älä sen jälkeen"
        },
        {
          "koodi": "c",
          "teksti": "Seuraa miesvartioinnilla hyökkääjien vapaat juoksut syvyyteen: päästä irti vasta, kun vastuu on siirretty ääneen"
        }
      ],
      "kysymykset": [
        "Missä kulmassa varmistit topparia?",
        "Mistä tiesit pudottaa tyhjään tilaan?",
        "Kenelle luovutit syvyysjuoksijan – sanoitko sen ääneen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_p4",
      "koodi": "LP-P4",
      "nimi": "KAKSINKAMPPAILUT JA OHJAAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "laitapuolustaja kohtaa pallollisen 1v1 – laidalla sivuraja on lisäpuolustaja.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Älä anna vastustajan ohittaa itseäsi, kun prässäät pallollista pelaajaa: ohitettu laitapuolustaja jättää koko laidan auki"
        },
        {
          "koodi": "b",
          "teksti": "Ohjaa vastustaja (puolustuksen kannalta) edullisille alueille: kohti sivurajaa tai varmistusta, pois sisäkaistalta"
        },
        {
          "koodi": "c",
          "teksti": "Estä pelaajan eteneminen syötön jälkeen: älä päästä syöttäjää liikkeelle syöttönsä perään"
        },
        {
          "koodi": "d",
          "teksti": "Kamppailun jälkeen pelaa tai pura tietoisesti: voitettu pallo ilman jatkoratkaisua palaa vastustajalle"
        }
      ],
      "kysymykset": [
        "Mihin suuntaan ohjasit vastustajaa – miksi sinne?",
        "Miten estit syöttäjän etenemisen syötön jälkeen?",
        "Mitä teit voitetulla pallolla?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_p5",
      "koodi": "LP-P5",
      "nimi": "RANGAISTUSALUEEN PUOLUSTAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "keskitys tai läpimurto uhkaa – laitapuolustajalla on kaksi roolia laidasta riippuen.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Älä valu puolustamaan rangaistusalueen sisälle, kun pallo on keskikaistalla, ja poistu rangaistusalueelta, kun oma joukkue pystyy siivoamaan pallon pois vaara-alueelta"
        },
        {
          "koodi": "b",
          "teksti": "Pallonpuoleisena sijoitu keskityslinjalle ja pudota asemastasi alaspäin niin nopeasti kuin mahdollista, kun keskitys selustaan on mahdollinen"
        },
        {
          "koodi": "c",
          "teksti": "Vastakkaisella laidalla kavenna ja ota miesvartiointi viimeistelemään tulevasta pelaajasta: takatolpan saapuja on laitapuolustajan yleisin virhe"
        },
        {
          "koodi": "d",
          "teksti": "Jatka puolustamista, jos keskitys ylittää meidät, ja pelaa irtopallot: keskitys ei pääty ensimmäiseen puolustussuoritukseen"
        },
        {
          "koodi": "e",
          "teksti": "Vaara-alueilla miesvartiointi ja tilanteiden päättämisen esto (laukaus tai viimeistely): kosketusetäisyys ratkaisee"
        }
      ],
      "kysymykset": [
        "Kumpi rooli sinulla oli – pallonpuoleinen vai kaventava?",
        "Kuka otti takatolpan tulijan?",
        "Miten tilanne jatkui ensimmäisen puolustussuorituksen jälkeen?",
        "Pysyitkö kosketusetäisyydellä vartioitavastasi vaara-alueella?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_p6",
      "koodi": "LP-P6",
      "nimi": "JATKOTILANTEET JA TILANTEENVAIHTO",
      "faasi": "puolustus",
      "pelitilanne": "laukaus, ilmapallo tai pallonmenetys synnyttää seuraavan tilanteen.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Kun hyökkääjä laukoo, ennakoi maalivahdin torjunnasta irtoava pallo: takatolpan irtopallo on laitapuolustajan vastuualue"
        },
        {
          "koodi": "b",
          "teksti": "Kun keskustoppari tai puolustava keskikenttäpelaaja hyppää ilmapallokamppailuun, pudota alemmas ja siirry kohti keskikaistaa"
        },
        {
          "koodi": "c",
          "teksti": "Pallonvoiton jälkeen tunnista heti: käynnistänkö vastahyökkäyksen etenemällä vai turvaanko pallon – laidan tila on usein ensimmäinen ulospääsy"
        }
      ],
      "kysymykset": [
        "Minne laukauksen irtopallo putosi – olitko valmiina?",
        "Minne siirryit ilmapallokamppailun aikana?",
        "Mikä oli ensimmäinen ratkaisusi pallonvoiton jälkeen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_h0",
      "koodi": "LP-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "aina – laita antaa selkäsuojan, joten oikea peliasento avaa lähes koko kentän.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu diagonaalisesti suhteessa etu- ja takalinjoihin: näet sekä avauksen että kohteet"
        },
        {
          "koodi": "b",
          "teksti": "Avoin peliasento kohti kenttää: laitapuolustajan ei koskaan tarvitse vastaanottaa sokkona"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa ennen palloa: sisäkaistat, oma laituri ja vastustajan prässääjä – ratkaisu valmiina ennen vastaanottoa"
        }
      ],
      "kysymykset": [
        "Mitkä sisäkaistat olivat auki ennen vastaanottoasi?",
        "Missä prässääjäsi oli, kun pallo lähti sinulle?",
        "Mitä laiturisi teki, kun sait pallon?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_h1",
      "koodi": "LP-H1",
      "nimi": "HYÖKKÄYSTASAPAINO JA REST DEFENCE",
      "faasi": "hyokkays",
      "pelitilanne": "joukkue hallitsee palloa – laitapuolustajan korkeus on joukkueen riskisäädin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tasapainota linja leveyssuunnassa ja pidä syvyystasapaino joukkueen edetessä"
        },
        {
          "koodi": "b",
          "teksti": "Sido nousukorkeutesi laituriin ja keskustoppareihin: joku turvaa aina laidan selustan – nousu ilman sopimusta on joukkueen riski, ei sinun"
        }
      ],
      "kysymykset": [
        "Oliko noususi sovittu – kuka turvasi selustan?",
        "Missä olit, kun pallo menetettiin?",
        "Miten leveytesi palveli joukkuetta tässä vaiheessa?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_h2",
      "koodi": "LP-H2",
      "nimi": "TUKIPELAAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "rakentelu etenee laidan kautta – laitapuolustaja on pelin ensimmäinen leveä tukipiste.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa diagonaalinen tuki pallolliselle pelaajalle: suora linja topparin kanssa on helpoin prässättävä"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa tuki toisesta linjasta palloa hakemaan tuleville pelaajille: liikkuva vastaanottaja tarvitsee valmiin tukikulman"
        }
      ],
      "kysymykset": [
        "Oliko tukikulmasi diagonaalinen vai suora – miksi?",
        "Kenelle avasit linjan liikkeelläsi?",
        "Näkikö pallollinen sinut paineen alla?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_h3",
      "koodi": "LP-H3",
      "nimi": "SYÖTTÖPELI LAIDALTA",
      "faasi": "hyokkays",
      "pelitilanne": "laitapuolustaja pallossa – laita on ahdas, joten syötön laatu ratkaisee.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Rakenna maasyötöillä: rullaava syöttö oikeaan jalkaan antaa vastaanottajalle edun ahtaassakin tilassa"
        },
        {
          "koodi": "b",
          "teksti": "Syötä sisäkaistalle aina, kun linja aukeaa: sisään pelattu pallo ohittaa prässin, laitaa pitkin pelattu siirtää sen"
        }
      ],
      "kysymykset": [
        "Miksi pelasit laitaa pitkin tai sisään?",
        "Kumpaan jalkaan syötit laiturille?",
        "Minkä linjan syöttösi ohitti?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_h4",
      "koodi": "LP-H4",
      "nimi": "EDUN LUOMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "vastustaja ryhmittynyt – laitapuolustaja rikkoo rakenteen valinnoillaan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Etsi sisäkaistojen pelaajia, joilla on etu vastustajaansa nähden: sisäkaistan etu on arvokkain"
        },
        {
          "koodi": "b",
          "teksti": "Käännä pelin suunta, kun oma laita ruuhkautuu: kääntö laitapuolustajan kautta on nopein reitti heikolle puolelle"
        },
        {
          "koodi": "c",
          "teksti": "Syötä pallo laiturille tai keskikenttäpelaajalle niin, että hän saa edun omalla puolellaan (syöttö etuun)"
        }
      ],
      "kysymykset": [
        "Kenellä sisäkaistalla oli etu – näitkö sen?",
        "Milloin käänsit pelin – oliko se oikea hetki?",
        "Antoiko syöttösi vastaanottajalle edun – mistä sen näki?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "lp_h5",
      "koodi": "LP-H5",
      "nimi": "MUKAAN NOUSEMINEN JA LAITAYHTEISTYÖ",
      "faasi": "hyokkays",
      "pelitilanne": "hyökkäys etenee – laitapuolustajan nousu luo laidan ylivoiman.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Nouse mukaan (hyökkäykseen) hyödyntääksesi syntyneen vapaan tilan: nousu on vastaus tilaan, ei tottumus"
        },
        {
          "koodi": "b",
          "teksti": "Hae ylivoimatilannetta tai ratkaise tasavoimatilanne: 2v1 laidalla syntyy vain, jos nousut on ajoitettu laiturin liikkeeseen"
        },
        {
          "koodi": "c",
          "teksti": "Sovi työnjako laiturin kanssa: ohitusjuoksu (overlap) kun laituri tulee sisään, sisäkaistanousu (underlap) kun laituri pysyy leveänä"
        },
        {
          "koodi": "d",
          "teksti": "Keskitä liikkeestä niin, että kärki saa edun: matala, korkea tai kääntökeskitys tilanteen mukaan"
        }
      ],
      "kysymykset": [
        "Miksi nousit juuri silloin – mihin tilaan?",
        "Oliko nousu overlap vai underlap – mikä sen ratkaisi?",
        "Kenen liikkeeseen keskityksesi tähtäsi? ---"
      ],
      "harjoitteet": []
    }
  ],
  "T": [
    {
      "avain": "t_p1",
      "koodi": "T-P1",
      "nimi": "PUOLUSTUSLINJAN JOHTAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "joukkue puolustaa ryhmittyneenä – linjan on elettävä yhtenä yksikkönä ja jonkun on johdettava sitä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä linjan korkeus ja leveys jatkuvassa liikkeessä pallon, tilan ja vastustajan mukaan: paikalleen jäävä linja aukeaa aina välistä"
        },
        {
          "koodi": "b",
          "teksti": "Sido linjan syvyys prässiin: kun palloon on paine, linja nousee – kun ei ole, linja pudottaa, eikä selusta aukea"
        },
        {
          "koodi": "c",
          "teksti": "Järjestä linja uudelleen heti tilanteen rikkoutuessa: ensimmäinen korjausliike ratkaisee, ehtiikö vastustaja hyödyntää epäjärjestyksen"
        },
        {
          "koodi": "d",
          "teksti": "Johda linjaa äänellä koko ottelun ajan: nosto, pudotus, paitsiolinja ja vartiointivastuut – toppari näkee pelin, jota muut eivät näe"
        }
      ],
      "kysymykset": [
        "Miksi linja nousi tai putosi juuri nyt – kuka sen päätti?",
        "Mitä käskyjä annoit viimeisen minuutin aikana?",
        "Milloin linjanne oli viimeksi eri korkeuksilla – mistä se johtui?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_p2",
      "koodi": "T-P2",
      "nimi": "VARTIOINTI JA VÄLITILOJEN HALLINTA",
      "faasi": "puolustus",
      "pelitilanne": "vastustaja pyrkii saamaan kärkipelaajan tai välitilaan pudottautuvan pelaajan pelattavaksi.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu oikeassa peliasennossa (rintamasuunta ja kehon asento siten, että pystyt reagoimaan nopeasti joka suuntaan): pidä pallo ja vartioitava samassa näkökentässä – jos näet vain toisen, toinen yllättää"
        },
        {
          "koodi": "b",
          "teksti": "Sijoitu vartioitavaan nähden niin, että ehdit sekä katkoon eteen että kääntymään syvyysjuoksuun: etäisyys on aina tietoinen valinta"
        },
        {
          "koodi": "c",
          "teksti": "Pienennä välitila ennen syöttöä, älä sen jälkeen: kun vastustaja voi vastaanottaa linjojen välissä, reagointi on jo myöhässä"
        },
        {
          "koodi": "d",
          "teksti": "Säilytä vartiointivalmius myös oman joukkueen hallitessa palloa: tilanteenvaihto alkaa ennen menetystä, ja topparin peruspaikka on joukkueen vakuutus"
        }
      ],
      "kysymykset": [
        "Näitkö pallon ja vartioitavasi samaan aikaan koko tilanteen ajan?",
        "Milloin pienensit välitilan – ennen syöttöä vai sen jälkeen?",
        "Missä vartioitavasi oli, kun oma joukkueesi hyökkäsi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_p3",
      "koodi": "T-P3",
      "nimi": "SELUSTAN JA TILAN HALLINTA",
      "faasi": "puolustus",
      "pelitilanne": "pallollista prässätään tai vastustaja hakee syöttöä puolustuslinjan taakse.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Varmista prässäävää joukkuetoveria oikealla kulmalla ja etäisyydellä: kata sekä ohituskuljetus että syöttö selustaan – väärä kulma auttaa vain toista"
        },
        {
          "koodi": "b",
          "teksti": "Pudota selustaan ennakoiden aina, kun syöttö linjan taakse on mahdollinen: lähde pallollisen kosketuksesta, älä syötöstä"
        },
        {
          "koodi": "c",
          "teksti": "Jaa topparien työnjako ääneen: ensimmäinen estää vapaat juoksut selustaansa, toinen ottaa miesvartioinnin väliin liikkuvasta hyökkääjästä"
        },
        {
          "koodi": "d",
          "teksti": "Viivytä perääntyen alivoimassa: voitat aikaa palaaville – vastustajan paras ase on kiire, älä anna sitä ryntäämällä"
        }
      ],
      "kysymykset": [
        "Missä kulmassa varmistit prässääjää – mitä pystyit kattamaan?",
        "Mistä tiesit lähteä selustaan – pallosta vai juoksijasta?",
        "Kumpi toppareista otti väliin tulijan – sovittiinko se ääneen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_p4",
      "koodi": "T-P4",
      "nimi": "KAKSINKAMPPAILUT",
      "faasi": "puolustus",
      "pelitilanne": "toppari kohtaa hyökkääjän 1v1 maassa tai ilmassa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Prässää pallollista ilman ohitetuksi tulemista: hidasta viimeiset metrit, matala asento, ohjaa heikompaan suuntaan – ohitettu toppari on poissa pelistä"
        },
        {
          "koodi": "b",
          "teksti": "Pudota nopeasti alemmas katkaisemaan yhdistely, kun hyökkääjä pelaa seinäsyötön: seuraa tilaa, älä palloa"
        },
        {
          "koodi": "c",
          "teksti": "Voita ilmakamppailut ennakoimalla pallon putoamispiste: ota asema ennen hyppyä – kamppailu ratkeaa ennen ponnistusta"
        },
        {
          "koodi": "d",
          "teksti": "Pelaa tai pura tietoisesti kamppailun jälkeen: voitto ilman jatkotoimintoa on vain uusi irtopallo"
        }
      ],
      "kysymykset": [
        "Miksi hidastit tai et hidastanut ennen kontaktia?",
        "Mistä näit pallon putoamispisteen ennen hyppyä?",
        "Mitä teit heti kamppailun jälkeen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_p5",
      "koodi": "T-P5",
      "nimi": "RANGAISTUSALUEEN PUOLUSTAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "pallo laidalla tai keskustassa lähellä omaa maalia – keskitys, läpimurto tai laukaus uhkaa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Älä valu puolustamaan rangaistusalueen sisälle, kun pallo on keskellä rangaistusalueen ulkopuolella: alas jääminen kutsuu vaaran boksiin"
        },
        {
          "koodi": "b",
          "teksti": "Nosta linja jokaisesta taaksepäin menevästä pallosta ja purkupallosta: vapautettu alue on paras puolustaja"
        },
        {
          "koodi": "c",
          "teksti": "Pudota nopeasti, kun keskitys puolustuslinjan ja maalivahdin väliin on mahdollinen, ja kata ykköstolpan alue: väli ja etutolppa ovat topparin vastuualueet"
        },
        {
          "koodi": "d",
          "teksti": "Vartioi rangaistusalueella miesvastuulla: näe pallo ja mies, pysy kosketusetäisyydellä maalintekijästä koko keskityksen ajan"
        },
        {
          "koodi": "e",
          "teksti": "Estä laukaukset ja puolusta tilanne loppuun: blokki, kakkostolppa maalivahdin 1v1:ssä ja irtopallo kuuluvat samaan tilanteeseen"
        }
      ],
      "kysymykset": [
        "Miksi olit tai et ollut boksissa, kun pallo oli keskellä?",
        "Kuka kattoi ykköstolpan – entä kakkostolpan?",
        "Näitkö pallon ja maalintekijän koko keskityksen ajan?",
        "Puolustitko tilanteen loppuun – blokki, kakkostolppa, irtopallo?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_p6",
      "koodi": "T-P6",
      "nimi": "JATKOTILANTEET JA TILANTEENVAIHTO",
      "faasi": "puolustus",
      "pelitilanne": "tilanne ei pääty – torjunta, purkupallo, pääpallo tai pallonmenetys synnyttää seuraavan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ennakoi maalivahdin mahdollinen purkupallo ja torjunnasta irtoava pallo: siirry oikeaan paikkaan ennen kuin pallo irtoaa"
        },
        {
          "koodi": "b",
          "teksti": "Pudota alemmas (varmistamaan), kun toinen keskustoppari tai puolustava keskikenttäpelaaja menee pääpallo- tai ilmapallotilanteeseen pallon tullessa keskikaistaa pitkin"
        },
        {
          "koodi": "c",
          "teksti": "Valitse pallonvoiton jälkeen tietoisesti: pelattava eteenpäin jos on, varma ulospääsy jos ei – paniikkipurku on lahja vastustajalle"
        }
      ],
      "kysymykset": [
        "Minne torjunta tai purku todennäköisimmin irtoaa – olitko siellä?",
        "Kuka varmisti pääpallokamppailun?",
        "Mikä oli ensimmäinen ratkaisusi pallonvoiton jälkeen – miksi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_h0",
      "koodi": "T-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "aina – ennen jokaista vastaanottoa ja jokaisen pelitilanteen välissä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu diagonaalisesti suhteessa etu- ja takalinjoihin: suora linja piilottaa puolet kentästä"
        },
        {
          "koodi": "b",
          "teksti": "Pidä peliasento avoimena kohti kenttää: yksi vilkaisu kattaa mahdollisimman paljon"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa ennen palloa, älä pallon kanssa: pään käännöt ennen vastaanottoa ja sen aikana – ratkaisu on tehty ennen ensimmäistä kosketusta"
        }
      ],
      "kysymykset": [
        "Mitä näit ennen vastaanottoa – kerro kolme asiaa?",
        "Missä prässääjä oli, kun pallo lähti sinulle?",
        "Kumpaan suuntaan peliasentosi avautui – miksi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_h1",
      "koodi": "T-H1",
      "nimi": "RAKENTELUN TASAPAINO JA REST DEFENCE",
      "faasi": "hyokkays",
      "pelitilanne": "oma joukkue hallitsee palloa ja etenee – topparin sijainti määrittää sekä rakentelun että menetyksen jälkeisen hetken.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä rakentelussa leveys ja syvyys, jotka antavat syöttökulmat ja aikaa: liian kapea tai korkea asema tukkii oman pelin"
        },
        {
          "koodi": "b",
          "teksti": "Nouse joukkueen mukana rest defence -asema säilyttäen: etäisyys kärkeen, varmistus laidoille ja valmius tilanteenvaihtoon – hyökkäyksen aikana toppari puolustaa asemallaan"
        }
      ],
      "kysymykset": [
        "Mistä syöttökulmasi syntyivät – leveydestä vai syvyydestä?",
        "Jos pallo katoaa nyt, kuka juoksee ensimmäisenä selustaanne?",
        "Miksi nousit tai et noussut joukkueen mukana?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_h2",
      "koodi": "T-H2",
      "nimi": "TUKIPELAAMINEN JA SYÖTTÖKULMAT",
      "faasi": "hyokkays",
      "pelitilanne": "pallollinen tarvitsee pelattavan – toppari on rakentelun tukiranka.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa diagonaalinen tuki pallolliselle jokaisessa tilanteessa: suora tukikulma on helpoin prässätä"
        },
        {
          "koodi": "b",
          "teksti": "Liiku tukeen niin, että pelin kääntö kauttasi on aina mahdollinen: toppari on käännön solmukohta, ei pääteasema"
        }
      ],
      "kysymykset": [
        "Näkikö pallollinen sinut koko ajan?",
        "Pystyikö peli kääntymään kauttasi – miksi tai miksi ei?",
        "Missä olit suhteessa prässilinjaan tukea antaessasi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_h3",
      "koodi": "T-H3",
      "nimi": "SYÖTTÖPELI – MAASYÖTÖT JA MURTAVA PITKÄ PELI",
      "faasi": "hyokkays",
      "pelitilanne": "toppari pallossa, vastustaja ryhmittyneenä tai prässissä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Rakenna maasyötöillä: rullaava syöttö oikealla voimalla oikeaan jalkaan antaa vastaanottajalle edun – ilmapallo hidastaa kaiken"
        },
        {
          "koodi": "b",
          "teksti": "Käytä pitkää korkeaa syöttöä aseena, ei hätäratkaisuna: kohdennettu avaus valittuun kamppailuun tai selustaan rikkoo vastustajan rakenteen"
        },
        {
          "koodi": "c",
          "teksti": "Valitse syöttö vastustajan prässin mukaan: prässilinjan ohi lyhyellä, yli pitkällä – älä pakota kumpaakaan"
        }
      ],
      "kysymykset": [
        "Miksi valitsit lyhyen tai pitkän?",
        "Kumpaan jalkaan syötit – oliko se vastaanottajan etu?",
        "Minkä prässilinjan syöttösi ohitti?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "t_h4",
      "koodi": "T-H4",
      "nimi": "EDUN LUOMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "vastustaja on ryhmittynyt – jonkun on rikottava ensimmäinen linja.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Käännä pelin suunta, kun oma laita on ruuhkassa: kääntö on topparin tehokkain tapa siirtää etu toiselle laidalle"
        },
        {
          "koodi": "b",
          "teksti": "Hae kolmatta pelaajaa: syöttö tukipelaajalle ja jatko välistä ohittaa prässin, jota suora syöttö ei ohita"
        },
        {
          "koodi": "c",
          "teksti": "Sido vastustaja kuljettamalla rohkeasti kohti prässääjää ja vapauta joukkuetoveri: kuljetus ilman sitomista on vain riski"
        },
        {
          "koodi": "d",
          "teksti": "Liity seuraavalle linjalle, kun tila aukeaa: yllättävä nousu luo ylivoiman, jota vastustaja ei ole ryhmittynyt puolustamaan"
        }
      ],
      "kysymykset": [
        "Ketä kuljetuksesi sitoi – kuka vapautui?",
        "Milloin kääntö oli mahdollinen – käytitkö sen?",
        "Missä kolmas pelaaja oli, kun syötit tukeen? ---"
      ],
      "harjoitteet": []
    }
  ],
  "KK": [
    {
      "avain": "kk_p1",
      "koodi": "KK-P1",
      "nimi": "KESKUSTAN HALLINTA JA LINJAN TASAPAINO",
      "faasi": "puolustus",
      "pelitilanne": "keskusta on kentän arvokkain alue – keskikenttälinjan etäisyydet ratkaisevat, pääseekö vastustaja pelaamaan linjojen välistä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä tasapaino leveyssuunnassa keskikentän keskialueella: kahden keskikenttäpelaajan väli on vastustajan ensimmäinen kohde"
        },
        {
          "koodi": "b",
          "teksti": "Pidä puolustuksellinen tasapaino syvyyssuunnassa: liian korkealle noussut keskikenttä jättää topparit kahden tulen väliin"
        },
        {
          "koodi": "c",
          "teksti": "Tasapainota linja uudelleen tilanteen rikkoutuessa: keskustan aukko korjataan ensin, laita vasta sitten"
        }
      ],
      "kysymykset": [
        "Kuinka suuri väli sinun ja toisen keskikenttäpelaajan välillä oli?",
        "Miksi keskikenttänne nousi tai putosi?",
        "Kumpi korjattiin ensin – keskusta vai laita?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_p2",
      "koodi": "KK-P2",
      "nimi": "VARTIOINTI JA SYÖTTÖLINJOJEN SULKEMINEN",
      "faasi": "puolustus",
      "pelitilanne": "vastustaja rakentaa – keskikenttäpelaaja puolustaa sekä pelaajaa että syöttölinjaa samaan aikaan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu oikeassa peliasennossa niin, että pidät näkökentässäsi joukkuetoverit, suoran vastustajasi ja keskustassa olevan kärkipelaajan: selkäsi takana oleva on aina vaarallisin"
        },
        {
          "koodi": "b",
          "teksti": "Sijoitu oikein suhteessa vastustajan sijaintiin: vartiointi elää jokaisen syötön mukana"
        },
        {
          "koodi": "c",
          "teksti": "Vähennä vastustajan syöttövaihtoehtoja organisoidussa prässissä: peittokulma sulkee linjan, juoksu ilman kulmaa avaa sen"
        }
      ],
      "kysymykset": [
        "Ketkä kolme näit samaan aikaan?",
        "Minkä syöttölinjan peittosi sulki?",
        "Kuka oli selkäsi takana – tiesitkö sen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_p3",
      "koodi": "KK-P3",
      "nimi": "VARMISTAMINEN JA PUDOTTAUTUMINEN",
      "faasi": "puolustus",
      "pelitilanne": "keskikenttäpelaaja paikkaa kahta linjaa – omaa ja puolustuslinjaa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Varmista keskikenttälinjassa tai puolustuslinjassa pallon puolella: varmistus on valinta, joka tehdään joka tilanteessa uudelleen"
        },
        {
          "koodi": "b",
          "teksti": "Puolusta taaksepäin (pudota), jos syöttö ylittää oman pelilinjamme: ylitetty pelaaja ei ole poissa pelistä, hän on matkalla varmistukseen"
        },
        {
          "koodi": "c",
          "teksti": "Seuraa keskikenttäpelaajan syvyysjuoksuja tämän liikkuessa laidalle: luovuta vastuu vasta ääneen sopien"
        },
        {
          "koodi": "d",
          "teksti": "Ota keskustopparin rooli keskityspuolustuksessa, jos puolustuslinjassa on epätasapaino: ja puolusta takaviistoon tulevat syötöt rangaistusalueen reunalle (cut-back on nykyfutiksen vaarallisin keskitys)"
        }
      ],
      "kysymykset": [
        "Kumpaa linjaa varmistit – miksi?",
        "Pudotitko ennen vai jälkeen linjan ylityksen?",
        "Milloin pudottauduit topparilinjaan – mikä sen laukaisi?",
        "Kuka puolusti rangaistusalueen reunan (takaviistosyötöt) – olitko siellä?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_p4",
      "koodi": "KK-P4",
      "nimi": "KAKSINKAMPPAILUT KESKUSTASSA",
      "faasi": "puolustus",
      "pelitilanne": "pallollinen keskialueella – aloite ratkaisee, kumpi sanelee tilanteen.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Prässää pallollista niin, ettei hän saa tilanteen aloitetta itselleen: keskustassa sekunnin epäröinti avaa syöttölinjan"
        },
        {
          "koodi": "b",
          "teksti": "Estä eteenpäin suuntautuvat syötöt keskustassa: pakota peli taakse tai sivulle, se on keskikenttäpuolustuksen voitto"
        },
        {
          "koodi": "c",
          "teksti": "Kamppailun jälkeen pelaa ensimmäinen syöttö eteenpäin, jos linja on auki: voitettu pallo keskustassa on paras hyökkäyksen alku"
        }
      ],
      "kysymykset": [
        "Saiko pallollinen aloitteen – mistä sen huomasi?",
        "Minkä etenemissyötön estit?",
        "Mitä teit voitetulla pallolla keskustassa?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_p5",
      "koodi": "KK-P5",
      "nimi": "RANGAISTUSALUEEN PUOLUSTAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "puolustus on painunut alas – keskikenttäpelaaja puolustaa boksin reunaa ja tarvittaessa kuin toppari.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Poistu rangaistusalueelta, kun pystymme siivoamaan pallon pois päätyalueelta: alue vapautetaan yhdessä"
        },
        {
          "koodi": "b",
          "teksti": "Toimi vaara-alueilla kuten keskustoppari: miesvartiointi, blokit ja tilanteiden loppuun puolustaminen"
        }
      ],
      "kysymykset": [
        "Milloin poistuit rangaistusalueelta – yhdessä vai yksin?",
        "Kenet otit vaara-alueella – miesvastuu vai tila?",
        "Puolustitko tilanteen loppuun?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_p6",
      "koodi": "KK-P6",
      "nimi": "JATKOTILANTEET JA VASTAPRÄSSI",
      "faasi": "puolustus",
      "pelitilanne": "peli vaihtaa suuntaa – keskikenttäpelaaja on vastaprässin ensimmäinen lenkki.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ennakoi syötöt omalla pelialueellasi tai vartioimallesi pelaajalle: katko keskustassa on suora hyökkäys"
        },
        {
          "koodi": "b",
          "teksti": "Ennakoi pallonmenetyksen mahdollisuus oman joukkueen rakentaessa: sijoitu valmiiksi niin, että menetys ei yllätä"
        },
        {
          "koodi": "c",
          "teksti": "Menetyksen hetkellä prässää välittömästi, jos olet lähin: viisi ensimmäistä sekuntia ratkaisevat, syntyykö vastustajalle vastahyökkäys"
        }
      ],
      "kysymykset": [
        "Minkä syötön katkaisit – mistä ennakoit sen?",
        "Missä olit, kun oma joukkue menetti pallon?",
        "Ehditkö prässiin viidessä sekunnissa?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_h0",
      "koodi": "KK-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "keskikenttäpelaaja pelaa 360 asteen ympäristössä – skannaus on hänelle kriittisempi kuin kenellekään muulle.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu diagonaalisesti suhteessa etu- ja takalinjoihin: suorassa linjassa puolet kentästä katoaa"
        },
        {
          "koodi": "b",
          "teksti": "Avoin peliasento: vastaanotto suljetussa asennossa pakottaa pelaamaan taakse"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa ennen palloa korkealla frekvenssillä: ratkaisu on valmiina ennen ensimmäistä kosketusta, ja siksi ehdit pelata eteenpäin paineessakin"
        }
      ],
      "kysymykset": [
        "Montako kertaa skannasit ennen vastaanottoa?",
        "Mitä takanasi oli – tiesitkö sen ilman katsetta?",
        "Miksi pelasit eteen tai taakse ensimmäisellä?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_h1",
      "koodi": "KK-H1",
      "nimi": "HYÖKKÄYSTASAPAINO",
      "faasi": "hyokkays",
      "pelitilanne": "joukkue hallitsee palloa – keskikenttäpelaajan sijainti turvaa sekä pelin jatkuvuuden että menetyksen jälkeisen hetken.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tasapainon säilyttäminen ryhmityksessä: älä ajaudu samaan linjaan syöttäjän kanssa"
        },
        {
          "koodi": "b",
          "teksti": "Diagonaalinen sijoittuminen suhteessa etu- ja takalinjoihin: diagonaali luo aina kaksi syöttölinjaa, suora vain yhden"
        },
        {
          "koodi": "c",
          "teksti": "Varmista joukkueen puolustuksellinen tasapaino hyökkäyksen aikana: joku kolmesta keskikenttäpelaajasta turvaa aina keskustan"
        }
      ],
      "kysymykset": [
        "Olitko syöttäjän kanssa samalla linjalla – miksi?",
        "Montako syöttölinjaa sijaintisi loi?",
        "Kuka turvasi keskustan, kun hyökkäsitte?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_h2",
      "koodi": "KK-H2",
      "nimi": "MUODON SISÄSSÄ PELAAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "vastustaja prässää – tuet muodon sisällä rikkovat prässin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa tuki pelin sisällä (muodon sisässä pelaaminen): vastaanotto vastustajan linjojen välissä siirtää koko pelin ylös"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa tuki niin, että saat edun suoraan vastustajaasi nähden: tuki ilman etua siirtää prässin vain itsellesi"
        },
        {
          "koodi": "c",
          "teksti": "Tarjoa tuki pelin jatkuvuuden takaamiseksi: pallolla on aina oltava vähintään kaksi suuntaa"
        },
        {
          "koodi": "d",
          "teksti": "Tarjoa hätätuki pallolliselle paineen alla: hätätuki on lupaus: olen aina pelattavissa"
        },
        {
          "koodi": "e",
          "teksti": "Avaa syöttölinjoja muille pelaajilla omalla liikkeelläsi: liike ilman palloa on syöttö jota ei näy tilastoissa"
        }
      ],
      "kysymykset": [
        "Missä välissä otit vastaan – kenen selän takana?",
        "Saitko edun tuellasi – keneen nähden?",
        "Kenelle liikkeesi avasi syöttölinjan?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_h3",
      "koodi": "KK-H3",
      "nimi": "PELIN AVAAMISEN VARMISTAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "avausvaihe kulkee keskikentän kautta tai epäonnistuu.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa jatkuvuustuki ensimmäisen linjan pelaajille (toppareille): avaus ilman keskikentän tukea on pakotettu pitkä pallo"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa tuki toisen linjan pelaajille: porras porrasta ylemmäs, ei kahta kerralla"
        },
        {
          "koodi": "c",
          "teksti": "Tarjoa tuki tarvittaessa oman pelipaikan ulkopuolelta: avausvaiheen tarve määrää paikan, ei ryhmityskaavio"
        }
      ],
      "kysymykset": [
        "Milloin topparit tarvitsivat sinua – näitkö sen ajoissa?",
        "Missä portaassa tuit avausta?",
        "Miksi liikuit pelipaikkasi ulkopuolelle?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kk_h4",
      "koodi": "KK-H4",
      "nimi": "PELIN ORGANISOINTI",
      "faasi": "hyokkays",
      "pelitilanne": "keskikenttäpelaaja pallossa – hän rytmittää koko joukkueen pelin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Suosi syöttöpeliä kuljettamisen sijaan: syöttö liikkuu aina kuljetusta nopeammin"
        },
        {
          "koodi": "b",
          "teksti": "Hae etenevää peliä minimoiden pallonmenetyksen riski: eteneminen ja riski punnitaan jokaisessa syötössä"
        },
        {
          "koodi": "c",
          "teksti": "Ohjaa peli edullisille alueille ja liikuta palloa, kun edullisia alueita ei ole tarjolla: sivuttaissyöttö ei ole epäonnistuminen, se on etsimistä"
        },
        {
          "koodi": "d",
          "teksti": "Syötä niin, että vastaanottaja saa edun (syöttö etuun): oikea jalka, oikea voima, oikea hetki"
        },
        {
          "koodi": "e",
          "teksti": "Tarjoa jatkuvuus pelille syötön jälkeen (liike syötön jälkeen): syöttö ja seisominen on puolikas suoritus"
        }
      ],
      "kysymykset": [
        "Miksi syötit etkä kuljettanut?",
        "Vieikö syöttösi peliä eteenpäin – millä riskillä?",
        "Minne liikuit syöttösi jälkeen? ---"
      ],
      "harjoitteet": []
    }
  ],
  "KY": [
    {
      "avain": "ky_p1",
      "koodi": "KY-P1",
      "nimi": "TASAPAINO JA PUOLUSTUSVASTUUN TUNNISTAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "joukkue puolustaa – kymppi valitsee jatkuvasti prässin ja tasapainon välillä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä tasapaino leveys- ja syvyyssuunnassa keskikentän keskialueella: kymppi joka karkaa prässiin ilman perustetta jättää kasin yksin"
        },
        {
          "koodi": "b",
          "teksti": "Sijoitu oikeassa peliasennossa ja tunnista puolustukselliset edut ja haitat: ketä kannattaa painostaa, kenet jättää"
        },
        {
          "koodi": "c",
          "teksti": "Hyödynnä saavutettu etu ja vältä epäedulliset tilanteet: prässää kun etu on sinulla, pudota kun ei ole"
        }
      ],
      "kysymykset": [
        "Miksi lähdit tai et lähtenyt prässiin?",
        "Missä kasi oli, kun prässäsit?",
        "Mikä etu sinulla oli, kun painostit?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_p2",
      "koodi": "KY-P2",
      "nimi": "KESKUSTAN JA KÄÄNNÖN SULKEMINEN",
      "faasi": "puolustus",
      "pelitilanne": "vastustaja rakentaa – kympin puolustustyö suuntaa vastustajan pelin laitoihin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Estä syötöt pelaajille, jotka pelaavat sisäkaistoilla ja meitä syvempänä: keskustan halkaisu on vaarallisin syöttö"
        },
        {
          "koodi": "b",
          "teksti": "Estä vastustajan mahdollisuus kääntää peliä sisätuen kautta: peitä kääntöreitti, niin peli lukittuu laitaan"
        },
        {
          "koodi": "c",
          "teksti": "Puolusta taaksepäin (pudota), kun syöttö ylittää meidät: ylityksen jälkeen tehtäväsi on tiivistää, ei katsoa"
        }
      ],
      "kysymykset": [
        "Minkä sisäkaistasyötön estit?",
        "Mistä vastustajan kääntö kulki – suljitko sen?",
        "Mitä teit, kun pallo ylitti sinut?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_p3",
      "koodi": "KY-P3",
      "nimi": "ALOITTEEN VIEMINEN JA VASTAPRÄSSI",
      "faasi": "puolustus",
      "pelitilanne": "pallollinen kympin alueella tai pallo juuri menetetty.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Seuraa pallollista niin, ettei hän saa tilanteen aloitetta itselleen: ohjaava läsnäolo pakottaa virheeseen"
        },
        {
          "koodi": "b",
          "teksti": "Prässää välittömästi, kun joukkueemme menettää pallon lähellämme (vastaprässi): kymppi on ylimpänä keskikenttäpelaajana vastaprässin käynnistäjä"
        }
      ],
      "kysymykset": [
        "Saiko pallollinen aloitteen sinua vastaan?",
        "Kuinka nopeasti prässäsit menetyksen jälkeen?",
        "Minkä virheen läsnäolosi pakotti?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_p4",
      "koodi": "KY-P4",
      "nimi": "VASTAHYÖKKÄYSVALMIUS",
      "faasi": "puolustus",
      "pelitilanne": "pallonvoitto lähestyy – kymppi valmistautuu jo puolustaessaan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa tuki syvyyteen tilanteenvaihdon käynnistämiseksi: ensimmäinen pelattava on oltava olemassa ennen pallonvoittoa"
        },
        {
          "koodi": "b",
          "teksti": "Takaa vastahyökkäyksen jatkuvuus: ensimmäinen syöttösuunta purkupallolle ja toinen aalto perässä"
        }
      ],
      "kysymykset": [
        "Missä olit pallonvoiton hetkellä – olitko pelattavissa?",
        "Mikä oli ensimmäinen syöttösuunta purkupallolle?",
        "Kuka lähti toiseen aaltoon?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_p5",
      "koodi": "KY-P5",
      "nimi": "JATKOTILANTEET",
      "faasi": "puolustus",
      "pelitilanne": "irtopallot ja katkot rangaistusalueen edustalla.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ennakoi syötöt omalla pelialueellasi: katko kympin alueella kääntyy sekunnissa hyökkäykseksi"
        },
        {
          "koodi": "b",
          "teksti": "Ennakoi irtopallot oman rangaistusalueen edustalla: toisen aallon laukaus estetään olemalla paikalla ennen palloa"
        }
      ],
      "kysymykset": [
        "Minne irtopallo putosi – ennakoitko sen?",
        "Minkä katkon teit omalla alueellasi?",
        "Estikö sijaintisi toisen aallon laukauksen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_h0",
      "koodi": "KY-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "kymppi pelaa ahtaimmissa tiloissa – ratkaisu on tehtävä ennen palloa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu diagonaalisesti suhteessa etu- ja takalinjoihin: diagonaali pitää sekä pallon että selustan näkyvissä"
        },
        {
          "koodi": "b",
          "teksti": "Avoin peliasento: taskussa suljettu asento tarkoittaa pakkoa pelata taakse"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa korkealla frekvenssillä ennen vastaanottoa ja sen aikana: tieto vartijan sijainnista ratkaisee, voitko kääntyä"
        }
      ],
      "kysymykset": [
        "Missä vartijasi oli ennen vastaanottoa – käännyitkö siksi?",
        "Montako kertaa skannasit taskussa?",
        "Mihin suuntaan peliasentosi avautui?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_h1",
      "koodi": "KY-H1",
      "nimi": "SISÄKAISTOJEN TASAPAINO",
      "faasi": "hyokkays",
      "pelitilanne": "joukkue hyökkää asemiin – kymppi hallitsee sisäkaistojen tiloja.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tasapainota sisäkaistojen tilat: kaista ei saa tyhjentyä eikä ruuhkautua sinun liikkeesi takia"
        },
        {
          "koodi": "b",
          "teksti": "Diagonaalinen sijoittuminen suhteessa etu- ja takalinjoihin: samaan linjaan kärjen kanssa asettuva kymppi katoaa pelistä"
        },
        {
          "koodi": "c",
          "teksti": "Tasapainota tilat joukkueen organisaation ehdoilla: pelipaikan saa jättää, kun joukkueen rakenne säilyy – vapaus on ansaittua, ei oletus"
        }
      ],
      "kysymykset": [
        "Tyhjenikö tai ruuhkautuiko kaista liikkeesi takia?",
        "Olitko kärjen kanssa samalla linjalla – miksi?",
        "Miksi jätit pelipaikkasi – säilyikö joukkueen rakenne?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_h2",
      "koodi": "KY-H2",
      "nimi": "TASKUPELAAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "vastustajan keskikenttä- ja puolustuslinjan väli – kympin koti.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa tuki vastustajan keskikenttä- ja puolustuslinjan välissä (\"taskuissa\"): näy pallolliselle, pysy piilossa vartijalta"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa tuki niin, että saat edun lähimpään vastustajaan nähden: puoli metriä taskussa on enemmän kuin kymmenen laidassa"
        },
        {
          "koodi": "c",
          "teksti": "Tarjoa tuki pelin jatkuvuuden takaamiseksi ja hätätuki tarvittaessa, myös selkä kohti vastustajan maalia"
        },
        {
          "koodi": "d",
          "teksti": "Tee vapaita juoksuja syvyyteen saadaksesi edun tai luodaksesi epätasapainoa: pudottautumisen ja syvyysjuoksun vuorottelu tekee sinusta lukukelvottoman"
        }
      ],
      "kysymykset": [
        "Näkikö pallollinen sinut – näkikö vartijasi?",
        "Minkä edun tukesi antoi?",
        "Milloin valitsit syvyysjuoksun pudottautumisen sijaan?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_h3",
      "koodi": "KY-H3",
      "nimi": "AVAUKSEN TUKEMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "oma joukkue avaa peliä – kymppi tunnistaa, milloin pudottautua.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa tuki toisen linjan pelaajille pudottautumalla: ylivoima avaukseen syntyy kympin pudottautumisesta"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa tuki tarvittaessa oman pelipaikan ulkopuolelta: avausvaiheen hätä ei katso ryhmityskaaviota"
        }
      ],
      "kysymykset": [
        "Milloin avaus tarvitsi sinua – mistä sen näki?",
        "Minkä ylivoiman pudottautumisesi loi?",
        "Miksi liikuit pelipaikkasi ulkopuolelle?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_h4",
      "koodi": "KY-H4",
      "nimi": "VIIMEISEN KOLMANNEKSEN ORGANISOINTI",
      "faasi": "hyokkays",
      "pelitilanne": "kymppi pallossa hyökkäysalueella – hän on murtavan syötön ensisijainen antaja.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Hae tai pyri edistämään peliä: kympin ensimmäinen katse on aina eteenpäin"
        },
        {
          "koodi": "b",
          "teksti": "Ohjaa peli edullisille alueille ja liikuta palloa, kun edullisia alueita ei ole tunnistettavissa"
        },
        {
          "koodi": "c",
          "teksti": "Syötä niin, että joukkuetoveri saa edun (syöttö etuun): murtava syöttö annetaan liikkeeseen, ei jalkaan"
        },
        {
          "koodi": "d",
          "teksti": "Tarjoa jatkuvuus pelille syötön jälkeen (liike syötön jälkeen): seinäsyötön toinen puolisko on kympin tavaramerkki"
        }
      ],
      "kysymykset": [
        "Oliko ensimmäinen katseesi eteenpäin?",
        "Annoitko syötön liikkeeseen vai jalkaan – miksi?",
        "Minne liikuit syöttösi jälkeen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "ky_h5",
      "koodi": "KY-H5",
      "nimi": "BOKSIIN LIIKKUMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "hyökkäys etenee laidalle tai keskitysasemiin – kymppi täyttää boksin toisen aallon.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Hyökkää tyhjiin tiloihin joukkuetoverin keskittäessä: rankkaripisteen tila ja takatolppa ovat kympin alueet"
        },
        {
          "koodi": "b",
          "teksti": "Saavu toisessa aallossa rangaistusalueen reunalle: irtopallot ja pudotukset ovat kympin maalipaikkoja"
        }
      ],
      "kysymykset": [
        "Mihin tilaan hyökkäsit keskityksessä?",
        "Missä olit, kun laukaus lähti – ehditkö toiseen aaltoon?",
        "Miksi ajoituksesi onnistui tai myöhästyi? ---"
      ],
      "harjoitteet": []
    }
  ],
  "LA": [
    {
      "avain": "la_p1",
      "koodi": "LA-P1",
      "nimi": "TASAPAINO LAIDALLA",
      "faasi": "puolustus",
      "pelitilanne": "joukkue puolustaa – laituri on ryhmityksen laidan ylin lenkki.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ylläpidä leveys- ja syvyystasapaino laidalla: oikea peruspaikka estää laitapuolustajaa joutumasta 1v2-alivoimatilanteeseen"
        },
        {
          "koodi": "b",
          "teksti": "Sido puolustuskorkeus joukkueen linjaan: ylös jääminen on vastahyökkäysvaltti vain, jos se on joukkueen yhteinen taktinen valinta"
        }
      ],
      "kysymykset": [
        "Missä korkeudessa puolustit – joukkueen valinta vai omasi?",
        "Joutuiko laitapuolustajasi 1v2-tilanteeseen – miksi?",
        "Milloin palasit ryhmitykseen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_p2",
      "koodi": "LA-P2",
      "nimi": "VARTIOINTI JA LAIDAN SULKEMINEN",
      "faasi": "puolustus",
      "pelitilanne": "vastustajan laitapuolustaja tai laituri rakentaa laidalla.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tunnista merkattava pelaaja ja peitä syöttölinjat: laidan sulkeminen alkaa syötön estämisestä, ei vasta kaksinkamppailusta"
        },
        {
          "koodi": "b",
          "teksti": "Sulje syötöt sisäkaistoille peittokulmalla: laiturin tärkein puolustustehtävä on pitää keskusta ja sisäkaista kiinni"
        },
        {
          "koodi": "c",
          "teksti": "Kavenna painottomalta puolelta: kun pallo on vastakkaisella laidalla, sisään kaventaminen tekee joukkueen ryhmityksestä kompaktin"
        }
      ],
      "kysymykset": [
        "Minkä syöttölinjan peittosi sulki?",
        "Pysyikö sisäkaista kiinni?",
        "Kavensitko painottomalta puolelta – kuinka pitkälle?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_p3",
      "koodi": "LA-P3",
      "nimi": "PUDOTTAMINEN JA NOUSUJEN SEURAAMINEN",
      "faasi": "puolustus",
      "pelitilanne": "vastustajan laitapuolustaja nousee tai pallo ylittää laiturin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Puolusta taaksepäin (pudota) heti, kun pallo ohittaa sinut: laiturin nopea paluu palauttaa laidalle tasavoiman (2v2)"
        },
        {
          "koodi": "b",
          "teksti": "Seuraa vastustajan laitapuolustajan nousut: laitapuolustajan vapaa nousu selustaan on puolustuslinjan yleisin maalia edeltävä virhe"
        }
      ],
      "kysymykset": [
        "Pudotitko heti, kun pallo ohitti sinut?",
        "Seurasitko laitapuolustajan nousun – kuinka pitkälle?",
        "Syntyikö laidalle tasavoima paluullasi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_p4",
      "koodi": "LA-P4",
      "nimi": "KAKSINKAMPPAILUT JA VASTAPRÄSSI",
      "faasi": "puolustus",
      "pelitilanne": "pallollinen vastustaja laiturin alueella tai pallo on juuri menetetty.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Prässää ohjaavasti ilman helppoja ohituksia: pakota vastustaja kohti sivurajaa tai joukkueen varmistusta"
        },
        {
          "koodi": "b",
          "teksti": "Reagoi välittömästi pallonmenetykseen (vastaprässi): laidalla aggressiivinen vastaprässi lukitsee vastustajan sivurajaan ja estää pelin avaamisen"
        }
      ],
      "kysymykset": [
        "Mihin suuntaan ohjasit vastustajan?",
        "Kuinka nopeasti vastaprässäsit?",
        "Lukittuiko vastustaja sivurajaan?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_p5",
      "koodi": "LA-P5",
      "nimi": "VASTAHYÖKKÄYSASE JA JATKOTILANTEET",
      "faasi": "puolustus",
      "pelitilanne": "pallonvoitto – laituri on joukkueen nopein tie eteenpäin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Hyökkää syvyyteen painottomalta puolelta: takatolpalle oikea-aikaisesti saapuva laituri viimeistelee vastahyökkäykset"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa etenemistuki pallon puolella: toimi ensimmäisenä syöttösuuntana purkupallolle ennen pystyjuoksua"
        },
        {
          "koodi": "c",
          "teksti": "Lue katkon mahdollisuudet ennakoivasti: riisto tai irtopallo laidalla on suorin tie 1v1-tilanteeseen haavoittuvaa puolustusta vastaan"
        }
      ],
      "kysymykset": [
        "Milloin lähdit syvyyteen pallonvoitossa?",
        "Olitko ensimmäinen syöttösuunta purkupallolle?",
        "Minkä katkon laidalla ennakoit?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h0",
      "koodi": "LA-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "havainnointi ennen pallon vastaanottamista ja sen aikana.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu diagonaalisesti sivurajan tuntumaan: laita antaa selkäsuojan, ja avoin peliasento kentälle päin avaa koko pelikentän"
        },
        {
          "koodi": "b",
          "teksti": "Skannaa vastustajan laitapuolustajan etäisyys ja asento: havainto määrittää, haastatko suoraan, pyydätkö palloa jalkaan vai juoksetko selustaan"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa rangaistusalueen tilanne ennen keskitystä: keskittäminen ilman havaintoa omista pelaajista on vain toivepallo"
        }
      ],
      "kysymykset": [
        "Missä laitapuolustaja oli – etäisyys ja asento?",
        "Mitä boksissa oli ennen keskitystäsi?",
        "Mitä valitsit havainnon perusteella – haaston, jalkaan pyynnön vai selustajuoksun?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h1",
      "koodi": "LA-H1",
      "nimi": "LEVEYDEN HALLINTA",
      "faasi": "hyokkays",
      "pelitilanne": "joukkue rakentaa – laituri venyttää vastustajan ryhmityksen.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Venytä vastustajan puolustuslinjaa sivurajassa kiinni pysymällä: maksimaalinen leveys avaa keskikentälle ja sisäkaistoille tilaa muille"
        },
        {
          "koodi": "b",
          "teksti": "Kavenna boksia kohti viimeistelyvyöhykkeellä: hyökkäyksen edetessä päätyyn leveys muuttuu maalintekouhaksi rangaistusalueen sisällä"
        },
        {
          "koodi": "c",
          "teksti": "Palauta hyökkäysleveys ensimmäisen toiminnon jälkeen: leveys ei ole pysyvä paikka, vaan jatkuva tehtävä, joka alkaa jokaisen peliasennon jälkeen uudelleen"
        }
      ],
      "kysymykset": [
        "Olitko rajassa kiinni, kun rakensitte?",
        "Milloin kavensit – oliko se viimeistelyvyöhyke?",
        "Palautitko leveyden ensimmäisen toiminnon jälkeen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h2",
      "koodi": "LA-H2",
      "nimi": "VAPAAT JUOKSUT",
      "faasi": "hyokkays",
      "pelitilanne": "pallollinen etsii syöttökohdetta – laiturin liike määrää syötön.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Uhkaa selustaa pystyjuoksuilla: räjähtävä juoksu linjan taakse on suorin ja vaarallisin reitti maalipaikkaan"
        },
        {
          "koodi": "b",
          "teksti": "Jatka liikettä syötön jälkeen: tarjoa välitön seinä- tai tukisyöttösuunta, sillä liike ja hyökkäys eivät lopu omaan syöttöön"
        },
        {
          "koodi": "c",
          "teksti": "Luo tilaa joukkuetoverille omalla liikkeelläsi: esimerkiksi sisäänleikkauksella vedät vastustajan laitapuolustajan mukaasi ja raivaat tilaa oman laitapuolustajasi nousulle"
        },
        {
          "koodi": "d",
          "teksti": "Vaihtele selustajuoksuja ja jalkaan tulemista: luo oma tilasi irtaantumiseen – ennustettava laituri on helppo vartioitava"
        }
      ],
      "kysymykset": [
        "Minkä juoksun teit – selustaan vai jalkaan?",
        "Jatkuiko liikkeesi syötön jälkeen?",
        "Kenen tilan liikkeesi raivasi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h3",
      "koodi": "LA-H3",
      "nimi": "TUKIPELAAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "rakenteluvaihe vaatii laituria pelattavaksi.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa luotettava syöttösuunta laidalla: laituri toimii pelinteon kiintopisteenä, johon prässin alainen joukkue voi aina tukeutua"
        },
        {
          "koodi": "b",
          "teksti": "Liiku pelattavaksi sisäkaistan taskuihin: puolustuslinjan väliin astuva laituri sekoittaa vastustajan merkkauksen ja luo tilaa laidalle"
        }
      ],
      "kysymykset": [
        "Olitko pelattavissa, kun joukkue oli prässissä?",
        "Milloin astuit taskuun – mitä laidalle syntyi?",
        "Näkikö pallollinen sinut?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h4",
      "koodi": "LA-H4",
      "nimi": "1v1 JA EDUN LUOMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "laituri vastaan laitapuolustaja – laiturin ydinase.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ohita puolustaja suuntaavalla ensimmäisellä kosketuksella: laadukas haltuunotto luo edun ennen kuin varsinainen kaksinkamppailu alkaa"
        },
        {
          "koodi": "b",
          "teksti": "Haasta puolustaja, kun sinulla on tila- tai vauhtietu: tunnista hetket, jolloin etu on sinulla – älä haasta alivoimaisena tai paikoiltaan ilman tukea"
        },
        {
          "koodi": "c",
          "teksti": "Sido vastustaja itseesi luodaksesi 2v1-tilanteen: kun houkuttelet puolustajan kimppuusi, vapautat syöttölinjan taustalta nousevalle laitapuolustajalle"
        },
        {
          "koodi": "d",
          "teksti": "Kierrätä pallo, jos etua ei ole mahdollista saavuttaa: pakotettu tai väkinäinen haasto johtaa harhaan ja pallonmenetykseen"
        }
      ],
      "kysymykset": [
        "Loiko ensimmäinen kosketuksesi edun?",
        "Miksi haastoit tai kierrätit – mikä etu sinulla oli?",
        "Kenet houkuttelit itseesi – kuka vapautui?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h5",
      "koodi": "LA-H5",
      "nimi": "KESKITTÄMINEN JA TAKATOLPPA",
      "faasi": "hyokkays",
      "pelitilanne": "laituri pääsee keskitysasemaan tai peli etenee vastakkaista laitaa.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Keskitä laatu edellä kärjen liikkeen mukaan: valitse keskityksen alue, voima ja korkeus hyökkääjän juoksulinjan, älä tuurin perusteella"
        },
        {
          "koodi": "b",
          "teksti": "Täytä takatolppa, kun pallo on vastakkaisella laidalla: painottoman puolen laituri on boksiin leikatessaan joukkueen tärkeimpiä maalintekijöitä"
        }
      ],
      "kysymykset": [
        "Kenen liikkeeseen keskitit?",
        "Olitko takatolpalla, kun pallo oli vastakkaisella laidalla?",
        "Mikä keskitystyyppi – matala, korkea vai kääntö – ja miksi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "la_h6",
      "koodi": "LA-H6",
      "nimi": "VIIMEISTELY JA JATKOTILANTEET",
      "faasi": "hyokkays",
      "pelitilanne": "laituri rangaistusalueella tai sen rajalla.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Hae ratkaisua rohkeasti boksissa: sisäänleikkaus ja laukaus takatolppaa kohti ovat laiturin perusaseita"
        },
        {
          "koodi": "b",
          "teksti": "Syötä paremmassa asemassa olevalle joukkuetoverille: lue maalivahdin ja toppareiden sijoittuminen – syötä takaviistoon tai poikittain, jos oma kulma suljetaan"
        },
        {
          "koodi": "c",
          "teksti": "Ennakoi irtopallot ja maalivahdin torjunnat: älä jää katselemaan laukausta, vaan ryntää toiseen aaltoon ja kakkospalloihin"
        }
      ],
      "kysymykset": [
        "Miksi laukaisit tai syötit boksissa?",
        "Mitä maalivahti antoi sinulle?",
        "Minne ryntäsit laukauksen jälkeen? ---"
      ],
      "harjoitteet": []
    }
  ],
  "KH": [
    {
      "avain": "kh_p1",
      "koodi": "KH-P1",
      "nimi": "ENSIMMÄISEN PRÄSSILINJAN TASAPAINO",
      "faasi": "puolustus",
      "pelitilanne": "joukkue puolustaa – kärki on ensimmäinen puolustaja ja sitoo ryhmityksen yhteen.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Pidä hyökkäyksen keskustan tasapaino syvyys- ja leveyssuunnassa: kärki joka irtoaa ryhmityksestä tekee joukkueesta 10 puolustajan sijasta 9"
        },
        {
          "koodi": "b",
          "teksti": "Sido etäisyytesi keskikenttään: kun linjat ovat kiinni toisissaan, vastustajalla ei ole välitilaa – kun ne repeävät, kympin alue aukeaa"
        }
      ],
      "kysymykset": [
        "Mikä oli etäisyytesi keskikenttään puolustaessa?",
        "Milloin irtosit ryhmityksestä – miksi?",
        "Minkä välitilan linjojen repeäminen avasi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_p2",
      "koodi": "KH-P2",
      "nimi": "OHJAAVA PRÄSSI",
      "faasi": "puolustus",
      "pelitilanne": "vastustajan topparit avaavat – kärjen prässi tekee avauksesta ennustettavan.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Ohjaa vastustajan peli laidalle kaartavalla prässillä (yhden kärjen ryhmitys): suora juoksu palloon sulkee vain yhden linjan, kaartava sulkee kaksi"
        },
        {
          "koodi": "b",
          "teksti": "Kärkiparissa toinen prässää ja toinen varmistaa tai peittää: kaksi kärkeä ilman työnjakoa on yksi kärki"
        },
        {
          "koodi": "c",
          "teksti": "Estä keskustopparin eteneminen pallon kanssa: vapaasti kuljettava toppari saa keskikentän valinnat eteensä ilmaiseksi"
        },
        {
          "koodi": "d",
          "teksti": "Seuraa pallollista ohjaten ja älä anna vastustajan ohittaa itseäsi helposti: kärjen ohitus prässissä avaa koko keskikentän"
        }
      ],
      "kysymykset": [
        "Mihin suuntaan prässisi ohjasi avauksen?",
        "Miten jaoitte työn kärkiparina?",
        "Pääsikö toppari etenemään pallon kanssa – miksi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_p3",
      "koodi": "KH-P3",
      "nimi": "KESKUSTAN JA KÄÄNNÖN SULKEMINEN",
      "faasi": "puolustus",
      "pelitilanne": "vastustaja pyrkii pelaamaan prässin läpi tai kääntämään pelin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Estä syötöt sisäkaistojen pelaajille peittokulmallasi: prässin arvo on siinä, mitä se sulkee, ei siinä miltä se näyttää"
        },
        {
          "koodi": "b",
          "teksti": "Estä vastustajan pelinkääntö: lukitse peli sille laidalle, jonne joukkue on ryhmittynyt"
        },
        {
          "koodi": "c",
          "teksti": "Puolusta taaksepäin (pudota), jos pallo ylittää meidät: kärjen puolustustyö ei pääty ohitukseen"
        }
      ],
      "kysymykset": [
        "Minkä sisäkaistasyötön peittosi esti?",
        "Pääsikö vastustaja kääntämään pelin – mistä?",
        "Mitä teit, kun pallo ylitti sinut?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_p4",
      "koodi": "KH-P4",
      "nimi": "VASTAPRÄSSI JA PRÄSSÄYSTRIGGERIT",
      "faasi": "puolustus",
      "pelitilanne": "pallo menetetään tai vastustaja epäonnistuu – hetki kestää sekunnin.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Prässää välittömästi, kun joukkueemme menettää pallon (vastaprässi): lähimpänä oleva kärki ehtii ennen kuin vastustaja nostaa katseensa"
        },
        {
          "koodi": "b",
          "teksti": "Ennakoi prässäysmahdollisuudet: huono kosketus, selkä pelisuuntaan -vastaanotto, pomppiva pallo – triggeri käynnistää koko joukkueen prässin"
        },
        {
          "koodi": "c",
          "teksti": "Ennakoi pallonmenetyksen mahdollisuudet jo oman joukkueen hyökätessä: ensimmäinen puolustaja valmistautuu ennen menetystä"
        }
      ],
      "kysymykset": [
        "Kuinka nopeasti reagoit menetykseen?",
        "Minkä triggerin näit – huono kosketus, selkä pelisuuntaan vai pomppu?",
        "Ennakoitko menetyksen jo hyökätessänne?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_p5",
      "koodi": "KH-P5",
      "nimi": "VASTAHYÖKKÄYKSEN KÄYNNISTÄMINEN",
      "faasi": "puolustus",
      "pelitilanne": "pallonvoitto omalla puoliskolla – kärki on ulospääsy.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa tuki syvyyteen tilanteenvaihdon käynnistämiseksi: purkupallolla on aina oltava osoite"
        },
        {
          "koodi": "b",
          "teksti": "Voita tai suojaa ensimmäinen pallo ja pidä se joukkueella: vastahyökkäys kuolee, jos ensimmäinen kosketus karkaa"
        }
      ],
      "kysymykset": [
        "Olitko pelattavissa pallonvoiton hetkellä?",
        "Pysyikö ensimmäinen pallo joukkueella?",
        "Suuntautuiko tukesi syvyyteen vai jalkaan – miksi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_h0",
      "koodi": "KH-H0",
      "nimi": "SKANNAUS JA TILANNEKUVA",
      "faasi": "hyokkays",
      "pelitilanne": "kärki pelaa useimmin selkä maalille ja vartija selässä – tieto ratkaisee, voiko kääntyä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Sijoitu diagonaalisesti suhteessa pallolliseen pelaajaan: näet sekä pallon että selustan"
        },
        {
          "koodi": "b",
          "teksti": "Avoin peliasento aina kun mahdollista: suljetussa asennossa pelaat vain sen minkä muistat"
        },
        {
          "koodi": "c",
          "teksti": "Skannaa ennen vastaanottoa: vartijan etäisyys ja asento kertovat, käännytkö vai pudotatko"
        }
      ],
      "kysymykset": [
        "Missä vartijasi oli ennen vastaanottoa?",
        "Käännyitkö vai pudotitko – mikä sen ratkaisi?",
        "Mitä näit viimeisellä skannauksella?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_h1",
      "koodi": "KH-H1",
      "nimi": "SYVYYDEN TUOTTAMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "joukkue hyökkää asemiin – kärjen syvyysuhka luo tilat kaikille muille.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Varmista hyökkäyksen syvyys: pelaa paitsiolinjalla ja venytä vastustajan puolustuslinjaa – ilman syvyysuhkaa koko joukkueen tilat katoavat"
        },
        {
          "koodi": "b",
          "teksti": "Palauta hyökkäyksen tasapaino liikkeidesi jälkeen: pudottautunut kärki palaa syvyyteen ennen seuraavaa tilannetta"
        }
      ],
      "kysymykset": [
        "Venyikö puolustuslinja sinun takiasi?",
        "Milloin palasit syvyyteen pudottautumisen jälkeen?",
        "Kenen tila syntyi syvyysuhastasi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_h2",
      "koodi": "KH-H2",
      "nimi": "VAPAAT JUOKSUT JA TILAN LUOMINEN",
      "faasi": "hyokkays",
      "pelitilanne": "pallollinen etsii murtavaa syöttöä – kärjen liike on syötön edellytys.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tee vapaita juoksuja kohti maalia päästäksesi puolustajan selustaan: selusta on ainoa tila, jota toppari ei voi puolustaa kasvot palloon päin"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoudu tueksi luodaksesi oman syöttömahdollisuutesi ja luo itsellesi syöttölinja liikkeelläsi"
        },
        {
          "koodi": "c",
          "teksti": "Tee vapaa juoksu syötön jälkeen: seinäsyötön jatko ja paluu peliin erottavat kärjen, jota voi vartioida, kärjestä jota ei voi"
        },
        {
          "koodi": "d",
          "teksti": "Luo tilaa joukkuetovereille omalla liikkeelläsi: kärjen väärään suuntaan lähtevä juoksu vie topparin mukanaan"
        },
        {
          "koodi": "e",
          "teksti": "Vaihtele juoksujesi suuntaa ja ajoitusta (selusta / jalkoihin / ristiin): vaihtelu tekee sinusta lukukelvottoman"
        }
      ],
      "kysymykset": [
        "Minkä juoksun teit – selusta, jalkoihin vai ristiin?",
        "Minne liikuit syöttösi jälkeen?",
        "Kenen tilan juoksusi raivasi?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_h3",
      "koodi": "KH-H3",
      "nimi": "SELKÄ MAALILLE -PELI",
      "faasi": "hyokkays",
      "pelitilanne": "syöttö tulee kärkeen paineen alla – kärki liittää joukkueen hyökkäykseen.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Tarjoa jatkuvuustuki ensimmäisen linjan pelaajille pudottautumalla: kärki on rakentelun ylin tukipiste"
        },
        {
          "koodi": "b",
          "teksti": "Pidä pallo joukkueella paineen alla: keho väliin, matala painopiste, yksinkertainen jatko – pidetty pallo nostaa koko joukkueen"
        },
        {
          "koodi": "c",
          "teksti": "Tarjoa tuki tarvittaessa oman pelipaikan ulkopuolelta: laidalta tai syvältä, jos tilanne vaatii"
        }
      ],
      "kysymykset": [
        "Pysyikö pallo sinulla paineen alla – miksi?",
        "Mihin pudottauduit – kenen väliin?",
        "Mikä oli jatkoratkaisusi pidon jälkeen?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_h4",
      "koodi": "KH-H4",
      "nimi": "BOKSIPELAAMINEN – KESKITYKSET JA VIIMEISTELY",
      "faasi": "hyokkays",
      "pelitilanne": "pallo etenee keskitysasemiin tai boksiin – kärjen ydinaluetta.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Hyökkää keskityksiin liikkumalla kohti rangaistusaluetta ja sen sisälle: juoksuradat (ykköstolppa, kakkostolppa, rankkaripiste) vaihdellen ja ajoitus myöhään"
        },
        {
          "koodi": "b",
          "teksti": "Tarjoa takatuki (pudottautuen), kun pallollinen pääsee päätyrajalle: cut-back on tilastollisesti tehokkain keskitys"
        },
        {
          "koodi": "c",
          "teksti": "Laukaise kohti maalia, kun paikka on: epäröinti on boksissa suurin virhe"
        },
        {
          "koodi": "d",
          "teksti": "Hyökkää maalille rangaistusalueen sisällä: maalintekijä liikkuu kohti maalia, ei odota siellä"
        },
        {
          "koodi": "e",
          "teksti": "Syötä pallo paremmassa paikassa olevalle joukkuetoverille: viimeistelyvalinta on itsekkyyden ja epäitsekkyyden tasapaino, joka arvioidaan tilanteesta"
        }
      ],
      "kysymykset": [
        "Mikä juoksuratasi oli – ykköstolppa, kakkostolppa vai rankkaripiste?",
        "Miksi laukaisit tai syötit?",
        "Milloin lähdit – liian aikaisin vai myöhään?"
      ],
      "harjoitteet": []
    },
    {
      "avain": "kh_h5",
      "koodi": "KH-H5",
      "nimi": "EDUN HYÖDYNTÄMINEN JA JATKOTILANTEET",
      "faasi": "hyokkays",
      "pelitilanne": "etu on syntynyt tai tilanne jatkuu – kärki elää näistä hetkistä.",
      "kpi": [
        {
          "koodi": "a",
          "teksti": "Hyödynnä yksilöllinen etu (1v1) ja joukkueen etu (ylivoima) välittömästi: etu vanhenee sekunneissa"
        },
        {
          "koodi": "b",
          "teksti": "Ennakoi syötöt ja purkupallot, maalivahdin torjunnasta irtoavat pallot ja pudotukset pääpallokamppailuista: suuri osa maaleista syntyy toisesta aallosta"
        },
        {
          "koodi": "c",
          "teksti": "Jatka jokaista tilannetta loppuun: \"haaskalinnun vaisto\" on ennakointia, ei tuuria"
        }
      ],
      "kysymykset": [
        "Minkä edun sait – käytitkö sen heti?",
        "Minne torjunta irtosi – olitko siellä?",
        "Jatkuiko tilanteesi loppuun asti? ---"
      ],
      "harjoitteet": []
    }
  ]
};

var TM_TT_JOUKKUE = [
  {
    "avain": "j_h1",
    "koodi": "J-H1",
    "nimi": "RAKENTAMINEN JA PELIN AVAUS PAINEESSA",
    "ryhma": "hyokkays",
    "pelitilanne": "oma joukkue aloittaa pelin takaa vastustajan prässiä vastaan – ensimmäinen kolmannes on ylitettävä hallitusti.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Avatkaa peli takaa rauhassa ja houkutelkaa prässi: prässiin sitoutunut vastustaja jättää tilaa selustaansa"
      },
      {
        "koodi": "b",
        "teksti": "Luokaa rakenteluun ylimääräinen pelaaja (maalivahti tai laskeutuva keskikenttäpelaaja): yksi vapaa pelaaja rikkoo prässin matematiikan"
      },
      {
        "koodi": "c",
        "teksti": "Ohittakaa ensimmäinen prässilinja lyhyellä pelillä tai kohdennetulla pitkällä: pakotettu pitkä pallo on lahja, valittu pitkä pallo on ase"
      },
      {
        "koodi": "d",
        "teksti": "Säilyttäkää kärsivällisyys ja tasapaino avatessa: menetys omalla kolmanneksella on kentän suurin yksittäinen riski"
      }
    ],
    "kysymykset": [
      "Miten houkuttelitte prässin – syntyikö tilaa selustaan?",
      "Kuka oli ylimääräinen pelaaja rakentelussa?",
      "Ohititteko ensimmäisen linjan hallitusti vai pakotitteko pitkän?"
    ],
    "konseptipeli": "Avauspeli – 3 topparia + MV avaa 2 hyökkääjää vastaan; piste hallitusta keskilinjan ylityksestä, menetys omalla alueella = vastustajalle 2 pistettä. 7v5 rakenteluvyöhykkeellä.",
    "yksilo": [
      "Y-H0",
      "Y-H1",
      "Y-H2"
    ],
    "pelipaikat": [
      "MV-H1",
      "MV-H2",
      "T-H1",
      "T-H3",
      "KK-H3",
      "LP-H0"
    ]
  },
  {
    "avain": "j_h2",
    "koodi": "J-H2",
    "nimi": "HYÖKKÄYSRYHMITYS JA TILAN TASAPAINO",
    "ryhma": "hyokkays",
    "pelitilanne": "oma joukkue hallitsee palloa – kenttä täytetään niin, että jokaisella on oma tila ja tehtävä.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Täyttäkää kentän kaistat ja syvyystasot ilman päällekkäisyyksiä: kaksi pelaajaa samassa tilassa on yksi pelaaja vähemmän muualla"
      },
      {
        "koodi": "b",
        "teksti": "Pitäkää leveys ja syvyys suurena rakentelussa: iso kenttä hajottaa vastustajan, pieni tukehduttaa oman pelin"
      },
      {
        "koodi": "c",
        "teksti": "Tasapainottakaa hyökkäystila jokaisen liikkeen jälkeen: ryhmitys ei ole kaavio vaan tehtävien verkko, joka korjataan jatkuvasti"
      },
      {
        "koodi": "d",
        "teksti": "Sopikaa, kuka tasapainottaa, kun joku jättää paikkansa: vapaus liikkua ansaitaan joukkuetoverin korjauksella"
      }
    ],
    "kysymykset": [
      "Kuka oli samassa tilassa kanssasi – kumman piti väistyä?",
      "Mikä kaista oli tyhjä – kenen vastuulla se oli?",
      "Kuka tasapainotti, kun joukkuetoveri lähti paikaltaan?"
    ],
    "konseptipeli": "Kaistapeli – kenttä viiteen pystykaistaan, enintään yksi pelaaja/kaista; maali vain jos ryhmitys oli tasapainossa laukaisuhetkellä. 7v7.",
    "yksilo": [
      "Y-H8",
      "Y-H6",
      "Y-H0"
    ],
    "pelipaikat": []
  },
  {
    "avain": "j_h3",
    "koodi": "J-H3",
    "nimi": "YHDESSÄ ETENEMINEN JA PALLON LIIKUTTAMINEN",
    "ryhma": "hyokkays",
    "pelitilanne": "joukkue etenee kohti vastustajan maalia – pallo liikkuu ja kaikki osallistuvat.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Osallistukaa jokaiseen hyökkäykseen aktiivisesti: hyökkäys ilman palloa on liikettä, ei katsomista"
      },
      {
        "koodi": "b",
        "teksti": "Liikuttakaa palloa edun löytämiseksi: sivuttaissyöttö ei ole tavoite vaan etsintä – etu näkyy ennen syöttöä"
      },
      {
        "koodi": "c",
        "teksti": "Edetkää porrastaen linjojen mukana: etäisyydet säilyvät ja tuki on aina olemassa"
      },
      {
        "koodi": "d",
        "teksti": "Vaihtakaa pelin suuntaa ennen kuin vastustaja ehtii ryhmittyä: heikko puoli on auki vain hetken"
      }
    ],
    "kysymykset": [
      "Löysittekö edun liikuttamalla palloa vai odottamalla?",
      "Kuka ei osallistunut viime hyökkäykseen – miksi?",
      "Milloin suunnanvaihto oli auki – käytittekö sen?"
    ],
    "konseptipeli": "Suunnanvaihtopeli – leveä kenttä, kaksi pikkumaalia/pääty; suunnanvaihdon jälkeen tehty maali 2 pistettä, muut 1. 6v6.",
    "yksilo": [
      "Y-H2",
      "Y-H6",
      "Y-H3"
    ],
    "pelipaikat": [
      "T-H3",
      "T-H4",
      "LP-H3",
      "LP-H4",
      "KK-H4",
      "KY-H4",
      "MV-H4"
    ]
  },
  {
    "avain": "j_h4",
    "koodi": "J-H4",
    "nimi": "YLIVOIMAN LUOMINEN JA LINJAN OHITTAMINEN",
    "ryhma": "hyokkays",
    "pelitilanne": "vastustaja on ryhmittynyt – etu luodaan paikallisesti ja peli viedään seuraavalle linjalle.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Luokaa ylivoima pallon alueelle: 2v1 syntyy tuella, sitovalla kuljetuksella tai kolmannella pelaajalla"
      },
      {
        "koodi": "b",
        "teksti": "Pelatkaa linjan ohi heti, kun ylivoima on olemassa: luotu etu vanhenee sekunneissa"
      },
      {
        "koodi": "c",
        "teksti": "Edetkää seuraavalle linjalle yhdessä: ohitettu linja on etu vain, jos joukkue seuraa mukana"
      }
    ],
    "kysymykset": [
      "Missä teillä oli ylivoima – käytittekö sen?",
      "Mikä linja ohitettiin – mitä tapahtui heti sen jälkeen?",
      "Kuka loi edun – tuki, sitova kuljetus vai kolmas pelaaja?"
    ],
    "konseptipeli": "Linjapeli – kenttä kolmessa vyöhykkeessä; eteneminen vain ylivoiman kautta, suora pitkä pallo = menetys. 6v6+2.",
    "yksilo": [
      "Y-H3",
      "Y-H6",
      "Y-H2"
    ],
    "pelipaikat": [
      "T-H4",
      "LP-H4",
      "LP-H5",
      "KK-H2",
      "KY-H2",
      "KH-H2",
      "LA-H4"
    ]
  },
  {
    "avain": "j_h5",
    "koodi": "J-H5",
    "nimi": "VIIMEISTELY JA MAALINTEKOPAIKAT",
    "ryhma": "hyokkays",
    "pelitilanne": "peli on viimeisellä kolmanneksella – maalintekopaikkoja luodaan ja viimeistellään.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Täyttäkää boksi oikeilla juoksuilla: ykköstolppa, kakkostolppa ja rankkaripiste katettava jokaisessa keskityksessä"
      },
      {
        "koodi": "b",
        "teksti": "Ajoittakaa hyökkäys maalintekopaikkaan, älkää palloon: liian aikainen juoksu paljastaa, liian myöhäinen myöhästyy"
      },
      {
        "koodi": "c",
        "teksti": "Valitkaa viimeistelytapa tilanteen mukaan: nopea laukaus ennen puolustuksen järjestäytymistä, kärsivällisyys kun aikaa on"
      },
      {
        "koodi": "d",
        "teksti": "Reagoikaa irtopalloihin ja jatkotilanteisiin: maali syntyy usein toisesta aallosta – laukaus ei ole tilanteen loppu"
      }
    ],
    "kysymykset": [
      "Katettiinko kaikki kolme maalintekopistettä?",
      "Ajoititko juoksun palloon vai paikkaan?",
      "Kuka oli valmiina irtopallolle laukauksen jälkeen?"
    ],
    "konseptipeli": "Boksipeli – keskitykset laidoilta; piste vain jos ≥2 pelaajaa boksissa eri tolpilla laukaisuhetkellä, irtopallomaali 2 pistettä. 8v8.",
    "yksilo": [
      "Y-H9",
      "Y-H7",
      "Y-H8"
    ],
    "pelipaikat": [
      "KH-H4",
      "LA-H5",
      "LA-H6",
      "KY-H5",
      "LP-H5"
    ]
  },
  {
    "avain": "j_h6",
    "koodi": "J-H6",
    "nimi": "PUOLUSTUKSELLINEN VALPPAUS HYÖKÄTESSÄ (rest defence)",
    "ryhma": "hyokkays",
    "pelitilanne": "oma joukkue hyökkää – menetys tulee aina, ja siihen valmistaudutaan hyökkäyksen aikana.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Säilyttäkää puolustusorganisaatio hyökkäyksen aikana: sovittu määrä pelaajia pallolinjan takana joka hetki"
      },
      {
        "koodi": "b",
        "teksti": "Sopikaa nousut: jokaista nousua vastaa joukkuetoverin tasapainotus"
      },
      {
        "koodi": "c",
        "teksti": "Valmistautukaa vastaprässiin ennen menetystä: etäisyys palloon menetyshetkellä ratkaisee viiden sekunnin onnistumisen"
      }
    ],
    "kysymykset": [
      "Montako pelaajaa oli pallolinjan takana menetyshetkellä?",
      "Kuka tasapainotti nousun?",
      "Kuinka nopeasti ensimmäinen prässi syntyi menetyksestä?"
    ],
    "konseptipeli": "Menetyspeli – menettänyt joukkue saa 2 pistettä voittaessaan pallon takaisin 5 sekunnissa; puolustava pisteen päästessään rajatun linjan yli ennen sitä. 7v7.",
    "yksilo": [
      "Y-P4",
      "Y-H0"
    ],
    "pelipaikat": [
      "T-H1",
      "LP-H1",
      "KK-H1",
      "KH-P4"
    ]
  },
  {
    "avain": "j_p1",
    "koodi": "J-P1",
    "nimi": "YHDESSÄ PUOLUSTAMINEN JA VASTUUNJAKO",
    "ryhma": "puolustus",
    "pelitilanne": "vastustajalla on pallo – jokainen puolustaa ja jokaisella on nimetty vastuu.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Osallistukaa puolustamiseen kaikki: pallollisen prässi, vartiointi tai tilavastuu – kenelläkään ei ole taukoa"
      },
      {
        "koodi": "b",
        "teksti": "Jakakaa vastuut ääneen: jokaisella vastustajalla on nimetty vastuupelaaja tai tila"
      },
      {
        "koodi": "c",
        "teksti": "Vaihtakaa vastuita tilanteen mukaan kommunikoiden: vaihto ilman ääntä on kahden pelaajan virhe"
      }
    ],
    "kysymykset": [
      "Kuka puolusti pallollista – kuka vartioi, kuka otti tilan?",
      "Kenen vastuulla maalintekijä oli?",
      "Kuulitko vastuunvaihdon – kuka sen sanoi?"
    ],
    "konseptipeli": "Vastuupeli – jokaiselle puolustajalle nimetty vastuuhyökkääjä; oman vastuun tekemä maali on miinuspiste, vaihto vain ääneen sanottuna. 5v5.",
    "yksilo": [
      "Y-P1",
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P2",
      "LP-P2",
      "KK-P2",
      "KY-P1",
      "KH-P2",
      "LA-P2"
    ]
  },
  {
    "avain": "j_p2",
    "koodi": "J-P2",
    "nimi": "PELIKESKUSTAN TASAPAINO",
    "ryhma": "puolustus",
    "pelitilanne": "joukkue puolustaa ryhmittyneenä – leveys ja syvyys pienennetään pallon ympärille.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Pienentäkää joukkueen leveys ja syvyys puolustaessa: kompakti ryhmitys sulkee keskustan, hajanainen avaa sen"
      },
      {
        "koodi": "b",
        "teksti": "Siirtäkää koko ryhmitys pallon liikkeen mukaan: yksi siirtyvä pelaaja on aukko, siirtyvä joukkue on seinä"
      },
      {
        "koodi": "c",
        "teksti": "Suojatkaa keskusta ennen laitaa: laidan kautta tuleva vaara on hitaampi kuin keskustan halkaisu"
      }
    ],
    "kysymykset": [
      "Kuinka leveä ryhmityksenne oli, kun pallo oli laidalla?",
      "Siirtyikö koko joukkue vai vain lähin pelaaja?",
      "Pääsikö vastustaja keskustan läpi – mistä?"
    ],
    "konseptipeli": "Kompaktipeli – puolustava joukkue saa pisteen jokaisesta katkosta, joka syntyy ryhmityksen ollessa merkityn alueen (n. 30×25 m) sisällä. 8v8.",
    "yksilo": [
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": []
  },
  {
    "avain": "j_p3",
    "koodi": "J-P3",
    "nimi": "VARMISTUSLINJA",
    "ryhma": "puolustus",
    "pelitilanne": "pallollista prässätään – jokaisen prässin takana on toinen linja.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Rakentakaa jokaisen prässin taakse varmistuslinja: yksi prässää, linja varmistaa"
      },
      {
        "koodi": "b",
        "teksti": "Porrastakaa varmistukset syvyyteen: toinen linja pienentää ohituksen arvon, kolmas poistaa sen"
      },
      {
        "koodi": "c",
        "teksti": "Palauttakaa varmistuslinja heti ohituksen jälkeen: ohitus ei ole kriisi, jos seuraava linja on valmis"
      }
    ],
    "kysymykset": [
      "Kuka varmisti prässääjää – missä kulmassa?",
      "Mitä tapahtui, kun ensimmäinen prässääjä ohitettiin?",
      "Montako linjaa vastustajan piti ohittaa päästäkseen maalille?"
    ],
    "konseptipeli": "Porraspeli – hyökkääjät piste jokaisesta ohitetusta linjasta, puolustajat piste kun ohitus pysähtyy varmistukseen. 4v4+4.",
    "yksilo": [
      "Y-P3"
    ],
    "pelipaikat": [
      "T-P3",
      "LP-P3",
      "KK-P3",
      "KY-P2",
      "KH-P2"
    ]
  },
  {
    "avain": "j_p4",
    "koodi": "J-P4",
    "nimi": "ALIVOIMAN TASAAMINEN",
    "ryhma": "puolustus",
    "pelitilanne": "vastustajalla on hetkellinen ylivoima – aika ja tila myydään kalliilla.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Viivyttäkää alivoimassa: älkää riistäkö vaan hidastakaa – jokainen voitettu sekunti tuo palaajan"
      },
      {
        "koodi": "b",
        "teksti": "Suojatkaa keskusta ja maali, luovuttakaa laita: alivoimassa puolustetaan arvokkainta tilaa"
      },
      {
        "koodi": "c",
        "teksti": "Palatkaa täydellä teholla pallolinjan taakse: alivoima on väliaikainen vain, jos paluu on välitön"
      }
    ],
    "kysymykset": [
      "Kuinka monta sekuntia viivytitte – kuka ehti palata?",
      "Minne ohjasitte pallollisen alivoimassa?",
      "Kuka palasi täydellä teholla – kuka ei?"
    ],
    "konseptipeli": "Aaltopeli – hyökkäys alkaa 3v2, kolmas puolustaja lähtee 3 s viiveellä; puolustus piste, jos maalia ei synny ennen palaajan ehtimistä. 3v2+1.",
    "yksilo": [
      "Y-P1",
      "Y-P2"
    ],
    "pelipaikat": [
      "T-P3",
      "KK-P3",
      "LA-P3"
    ]
  },
  {
    "avain": "j_p5",
    "koodi": "J-P5",
    "nimi": "PAITSIOLINJALLA PUOLUSTAMINEN",
    "ryhma": "puolustus",
    "pelitilanne": "puolustuslinja käyttää paitsiosääntöä aseena.",
    "pelimuoto": [
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Puolustakaa yhtenäisellä linjalla ja nostakaa yhdessä: paitsiolinja toimii vain, jos kaikki nousevat samalla hetkellä"
      },
      {
        "koodi": "b",
        "teksti": "Sopikaa noston laukaisijat: takaisinsyöttö, purku ja prässin syttyminen nostavat linjan – yksi ääni johtaa"
      },
      {
        "koodi": "c",
        "teksti": "Tunnistakaa, milloin linja ei saa nousta: pallollinen vapaana = pudota, älä nosta"
      }
    ],
    "kysymykset": [
      "Kuka johti noston – nousiko koko linja?",
      "Mikä laukaisi noston – oliko se oikea hetki?",
      "Miksi linja nousi, vaikka pallollinen oli vapaa?"
    ],
    "konseptipeli": "Linjanostopeli – puolustava linja piste onnistuneesta nostosta/paitsiosta, hyökkäävä selustaan pääsystä; valmentaja paitsiotuomarina. 6v6 + MV.",
    "yksilo": [
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P1",
      "T-P5",
      "LP-P1",
      "MV-P2"
    ]
  },
  {
    "avain": "j_p6",
    "koodi": "J-P6",
    "nimi": "JOUKKUEPRÄSSI JA PRÄSSÄYSTRIGGERIT",
    "ryhma": "puolustus",
    "pelitilanne": "joukkue riistää pallon aktiivisesti asettuneesta puolustuksesta – prässi on koko joukkueen yhtäaikainen toiminto, ei yksilön juoksu.",
    "pelimuoto": [
      "8v8",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Määrittäkää puolustuskorkeus yhdessä (korkea, keski vai matala): koko joukkue puolustaa samalta korkeudelta – hajanainen korkeus avaa linjojen välit"
      },
      {
        "koodi": "b",
        "teksti": "Käynnistäkää prässi yhteisestä triggeristä: huono kosketus, selkä pelisuuntaan, taakse menevä pallo tai heikko jalka – yksi lähtee, kaikki seuraavat"
      },
      {
        "koodi": "c",
        "teksti": "Ohjatkaa prässi suuntaan ja sulkekaa pakotie: prässi ilman ohjausta on juoksua, ohjattu prässi on ansa"
      },
      {
        "koodi": "d",
        "teksti": "Sitoutukaa prässiin kollektiivisesti tai olkaa käynnistämättä: yksi jättäytyvä pelaaja rikkoo koko prässin"
      }
    ],
    "kysymykset": [
      "Miltä korkeudelta puolustitte – oliko koko joukkue samalla?",
      "Mikä trigger käynnisti prässin – oliko se oikea hetki?",
      "Sitoutuiko koko joukkue vai jäikö joku?"
    ],
    "konseptipeli": "Triggerpeli – sääntö määrää triggerin (esim. taakse menevä pallo); puolustava joukkue 2 pistettä pallonvoitosta 6 sekunnissa triggeristä, hyökkäävä piste jos selviää prässistä. 8v8.",
    "yksilo": [
      "Y-P1",
      "Y-P2",
      "Y-H0"
    ],
    "pelipaikat": [
      "KH-P2",
      "KH-P4",
      "KY-P3",
      "LA-P4",
      "KK-P6"
    ]
  },
  {
    "avain": "j_s1",
    "koodi": "J-S1",
    "nimi": "TILANTEENVAIHTO HYÖKKÄYKSESTÄ PUOLUSTUKSEEN (vastaprässi menetyshetkellä)",
    "ryhma": "siirtyma",
    "pelitilanne": "pallo menetetään – koko joukkueen peliaikomus vaihtuu sekunnissa. (Vrt. J-P6 = organisoitu prässi asettuneesta puolustuksesta.)",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Vaihtakaa peliaikomus välittömästi menetyksestä: ensimmäinen sekunti ratkaisee koko tilanteenvaihdon"
      },
      {
        "koodi": "b",
        "teksti": "Lähin prässää, muut järjestyvät: vastaprässi ja paluu ovat yksi liike, eivät kaksi vaihtoehtoa"
      },
      {
        "koodi": "c",
        "teksti": "Palatkaa sisäkautta pallolinjan taakse: keskusta suojataan ensin, pallo saadaan kiinni myöhemmin"
      }
    ],
    "kysymykset": [
      "Kuinka nopeasti aikomus vaihtui – kuka reagoi ensimmäisenä?",
      "Kuka prässäsi, ketkä palasivat?",
      "Palasitteko sisäkautta vai palloa kohti?"
    ],
    "konseptipeli": "Aikomuspeli – menetyksen jälkeen 5 s vastaprässi-ikkuna (pallonvoitto ikkunassa = 2 pistettä); jos vastustaja selviää, peli jatkuu maaleille. 6v6.",
    "yksilo": [
      "Y-P1",
      "Y-H0",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P6",
      "LP-P6",
      "KK-P6",
      "KY-P3",
      "KH-P4",
      "LA-P4"
    ]
  },
  {
    "avain": "j_s2",
    "koodi": "J-S2",
    "nimi": "TILANTEENVAIHTO PUOLUSTUKSESTA HYÖKKÄYKSEEN",
    "ryhma": "siirtyma",
    "pelitilanne": "pallo voitetaan – ensimmäinen ratkaisu määrää hyökkäyksen arvon.",
    "pelimuoto": [
      "5v5",
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Vaihtakaa aikomus ennen kuin vastustaja ehtii: voittohetkellä vastustaja on hetken järjestäytymätön"
      },
      {
        "koodi": "b",
        "teksti": "Pelatkaa ensimmäinen syöttö eteenpäin, jos linja on auki – varmistakaa pallo, jos ei ole: suora hyökkäys on arvokkain, menetetty pallo kallein"
      },
      {
        "koodi": "c",
        "teksti": "Täyttäkää aallot: ensimmäinen syvyyteen, toinen tueksi, kolmas tasapainoon"
      }
    ],
    "kysymykset": [
      "Mikä oli ensimmäinen ratkaisu pallonvoiton jälkeen – miksi?",
      "Kuka lähti syvyyteen – kuka turvasi?",
      "Ehtikö vastustaja järjestäytyä – miksi?"
    ],
    "konseptipeli": "Voittopeli – pallonvoitosta 8 s aikaa päättää hyökkäys laukaukseen (2 pistettä); ajan ylittyessä maali 1 piste. 7v7.",
    "yksilo": [
      "Y-H0",
      "Y-H2",
      "Y-H7"
    ],
    "pelipaikat": [
      "KH-P5",
      "KY-P4",
      "LA-P5",
      "MV-H3",
      "T-P6",
      "LP-P6"
    ]
  },
  {
    "avain": "j_e1",
    "koodi": "J-E1",
    "nimi": "HYÖKKÄÄVÄT ERIKOISTILANTEET",
    "ryhma": "erikoistilanne",
    "pelitilanne": "kulma, vapaapotku tai sivurajaheitto oman hyökkäyksen hyväksi – harjoiteltu tilanne on ilmainen maalintekopaikka.",
    "pelimuoto": [
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Sopikaa roolit ja liikkeet ennen tilannetta: erikoistilanne on ainoa hetki, jonka voitte suunnitella täysin"
      },
      {
        "koodi": "b",
        "teksti": "Luokaa liikkeellä tilaa ja ylivoimaa maalintekoalueelle: blokit, ristijuoksut ja ajoitus ratkaisevat"
      },
      {
        "koodi": "c",
        "teksti": "Varautukaa toiseen aaltoon ja irtopalloon: suuri osa erikoistilannemaaleista syntyy jatkosta"
      },
      {
        "koodi": "d",
        "teksti": "Säilyttäkää tasapaino vastahyökkäystä vastaan: kulmaan ei mennä koko joukkueella"
      }
    ],
    "kysymykset": [
      "Toteutuiko sovittu liike?",
      "Kuka varautui toiseen aaltoon?",
      "Oliko tasapaino vastahyökkäystä vastaan kunnossa?"
    ],
    "konseptipeli": "Erikoistilannesarja – harjoiteltu kulma/vapaapotku + jatkotilanne; valmentaja pisteyttää roolien toteutumisen ja tasapainon (ei vain maalia).",
    "yksilo": [
      "Y-H9",
      "Y-H7"
    ],
    "pelipaikat": [
      "KH-H4",
      "T-P4",
      "T-P5"
    ]
  },
  {
    "avain": "j_e2",
    "koodi": "J-E2",
    "nimi": "PUOLUSTAVAT ERIKOISTILANTEET",
    "ryhma": "erikoistilanne",
    "pelitilanne": "vastustajan kulma, vapaapotku tai sivurajaheitto – organisoitu puolustus estää ilmaisen maalin.",
    "pelimuoto": [
      "11v11"
    ],
    "kpi": [
      {
        "koodi": "a",
        "teksti": "Valitkaa ja toteuttakaa puolustustapa (mies, alue tai yhdistelmä) johdonmukaisesti: sekava vastuu on erikoistilanteen suurin riski"
      },
      {
        "koodi": "b",
        "teksti": "Kattakaa tolpat ja vaara-alueet sovitusti: jokaisella on paikka ja vastuu ennen palloa"
      },
      {
        "koodi": "c",
        "teksti": "Puolustakaa tilanne loppuun: torjunta, blokki ja irtopallo kuuluvat samaan tilanteeseen"
      },
      {
        "koodi": "d",
        "teksti": "Käynnistäkää vastahyökkäys pallonvoitosta: puolustettu erikoistilanne on paras vastahyökkäyshetki"
      }
    ],
    "kysymykset": [
      "Mikä oli puolustustapa – toteutuiko se?",
      "Katettiinko tolpat ja vaara-alueet?",
      "Käynnistittekö vastahyökkäyksen pallonvoitosta?"
    ],
    "konseptipeli": "Puolustus + purku – vastustajan kulmapuolustus + välitön vastahyökkäys pallonvoitosta (2 pistettä onnistuneesta purusta + keskilinjan ylityksestä).",
    "yksilo": [
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P4",
      "T-P5",
      "MV-P4",
      "LP-P5"
    ]
  }
];

var TM_TT_HARJOITTEET = {
  "Y-H0": {
    "konseptipeli": "Possessiopeli skannaussäännöllä: pään käännyttävä ennen vastaanottoa; värikoodit (nimeä valmentajan näyttämä väri vastaanoton yhteydessä)",
    "pelimuoto": "4v4+3"
  },
  "Y-H1": {
    "konseptipeli": "Suuntapeli: piste vain, kun ensimmäinen kosketus vie avattuun tilaan tai ohittaa puolustajan",
    "pelimuoto": "3v3–5v5"
  },
  "Y-H2": {
    "konseptipeli": "Kolmen pelisuunnan peli: murtava syöttö 2 p, etenevä 1 p, säilyttävä 0 p – prioriteettikartta pisteytyksenä",
    "pelimuoto": "4v4+2"
  },
  "Y-H3": {
    "konseptipeli": "Porttikuljetuspeli: portista kuljetus 1 p, mutta 2v1-tilanteessa vapauttava syöttö 2 p – syötä vai kuljeta -päätös",
    "pelimuoto": "3v3"
  },
  "Y-H4": {
    "konseptipeli": "1v1-kenttä kahdella pikkumaalilla: ohitus harhautuksella tuo lisäpisteen, suoja ohituksen jälkeen pakollinen",
    "pelimuoto": "1v1–2v2"
  },
  "Y-H5": {
    "konseptipeli": "Pitopeli: 5 sekunnin suojaus paineessa 1 p, kääntö avoimeen tilaan suojauksesta 2 p",
    "pelimuoto": "2v2+1"
  },
  "Y-H6": {
    "konseptipeli": "Tukipeli: piste vain diagonaalituesta vastaanotetusta pallosta; kaksi pelaajaa samalla syöttölinjalla nollaa hyökkäyksen",
    "pelimuoto": "4v2 → 6v4"
  },
  "Y-H7": {
    "konseptipeli": "Selustapeli syvyysalueilla: syöttö irtaantuneelle linjan taakse 2 p; vastaliike ennen lähtöä tuo lisäpisteen",
    "pelimuoto": "5v5 + päätyalueet"
  },
  "Y-H8": {
    "konseptipeli": "Leveyskaistapeli: maali hyväksytään vain, kun molemmat laitakaistat ovat miehitettyinä hyökkäyksen aikana",
    "pelimuoto": "7v7"
  },
  "Y-H9": {
    "konseptipeli": "Päätöspeli: jokainen hyökkäys on päätettävä laukaukseen 8 sekunnissa; irtopallosta tehty maali 2 p",
    "pelimuoto": "4v4 maalein"
  },
  "Y-P1": {
    "konseptipeli": "Viivytyspeli: puolustaja voittaa, jos kestää 6 sekuntia ohittamatta; riisto tuo lisäpisteen",
    "pelimuoto": "1v1"
  },
  "Y-P2": {
    "konseptipeli": "Kolmiopeli: puolustaja saa pisteen, jos näkee pallon ja vartioitavan samaan aikaan (valmentaja testaa värimerkillä)",
    "pelimuoto": "3v3"
  },
  "Y-P3": {
    "konseptipeli": "Varmistuspeli: riisto varmistajan avulla 2 p, yksin 1 p – varmistuskulma ja etäisyys ratkaisevat",
    "pelimuoto": "2v2"
  },
  "Y-P4": {
    "konseptipeli": "Paikanvaihtopeli: hyökkääjät vaihtavat paikkoja jatkuvasti; puolustus saa pisteen ääneen sovitusta merkkauksen vaihdosta",
    "pelimuoto": "4v4"
  },
  "T-P1": [
    {
      "pelipaikka": "Toppari",
      "teema": "Puolustustasapaino",
      "painopisteet": "Linjapuolustusharjoitteet 4v4–8v8 isolla kentällä; videoklipit omista otteluista (linjan syvyys/leveys); kommunikaatiovastuun antaminen harjoituspeleissä"
    }
  ],
  "T-P2": [
    {
      "pelipaikka": "Toppari",
      "teema": "Merkkaus & skannaus",
      "painopisteet": "Pienpelit merkkaussäännöillä (mies–mies boksissa); skannausfrekvenssin laskenta videolta; 2v2+2 välitilapuolustus"
    }
  ],
  "T-P3": [
    {
      "pelipaikka": "Toppari",
      "teema": "Tilan puolustaminen",
      "painopisteet": "2v2/3v3 syvyysjuoksuilla; varmistusharjoitteet (prässi + kouvraus pareittain); alivoimapuolustus 2v3, 3v4 viivyttäen"
    }
  ],
  "T-P4": [
    {
      "pelipaikka": "Toppari",
      "teema": "Pallollisen puolustaminen",
      "painopisteet": "Toistuvat 1v1-tilanteet eri lähtöasetelmilla (kasvot/selkä, vauhdista); prässitekniikka: lähestymiskulma, asento, ajoitus"
    }
  ],
  "T-P5": [
    {
      "pelipaikka": "Toppari",
      "teema": "Boksin vapauttaminen",
      "painopisteet": "Pelinomaiset linjannostoharjoitteet takaisinsyötöistä ja purkupalloista; paitsiolinjan yhteispeli MV:n kanssa"
    }
  ],
  "T-P6": [
    {
      "pelipaikka": "Toppari",
      "teema": "Keskityksen puolustaminen",
      "painopisteet": "Keskityspuolustus 4v4–6v6 boksissa (tolppavastuut); pääpallokamppailut kuormitettuna; MV-yhteistyö väliin tulevissa palloissa"
    }
  ],
  "T-P7": [
    {
      "pelipaikka": "Toppari",
      "teema": "Vaara-alueet",
      "painopisteet": "Blokkausharjoitteet; 1v1 boksissa loppuun asti -sääntö pienpeleissä; toistot väsyneenä (pelinomainen kuormitus)"
    }
  ],
  "T-P8": [
    {
      "pelipaikka": "Toppari",
      "teema": "Ennakointi",
      "painopisteet": "Reaktio- ja irtopallopelit; video: mitä tapahtuu 2 s laukauksen/pääpallon jälkeen"
    }
  ],
  "T-H0": [
    {
      "pelipaikka": "Toppari",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Rondot ja possessiopelit skannaussäännöllä (esim. pään käännyttävä 2× ennen vastaanottoa); värikoodipelit (valmentaja näyttää värin, pelaajan nimettävä se vastaanoton yhteydessä); skannausfrekvenssin laskenta videolta (huipputaso ~0,5 s välein ennen vastaanottoa)"
    }
  ],
  "T-H1": [
    {
      "pelipaikka": "Toppari",
      "teema": "Hyökkäystasapaino & tuet",
      "painopisteet": "Rakentelupelit 4v2 → 8v6 prässiä vastaan; sijoittuminen nousussa (rest defence)"
    }
  ],
  "T-H2": [
    {
      "pelipaikka": "Toppari",
      "teema": "Hyökkäystasapaino & tuet",
      "painopisteet": "Rakentelupelit 4v2 → 8v6 prässiä vastaan; sijoittuminen nousussa (rest defence)"
    }
  ],
  "T-H3": [
    {
      "pelipaikka": "Toppari",
      "teema": "Varmistavat syötöt",
      "painopisteet": "Syöttötekniikka molemmilla jaloilla (matala 15–35 m, pitkä diagonaali 40–60 m); rakentelu numeraalisessa alivoimassa"
    }
  ],
  "T-H4": [
    {
      "pelipaikka": "Toppari",
      "teema": "Ylivoiman luonti",
      "painopisteet": "Kuljetus ensimmäistä prässääjää vastaan pienpeleissä (sido ja syötä); kolmannen pelaajan kuviot; pelinkääntöharjoitteet leveisiin pelaajiin"
    }
  ],
  "LP-P1": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Puolustustasapaino",
      "painopisteet": "Linjapuolustusharjoitteet 4v4–8v8; videoanalyysi omista otteluista (linjan tasapaino laidan näkökulmasta); kommunikaatio keskustopparin kanssa"
    }
  ],
  "LP-P2": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Merkkaus & valppaus",
      "painopisteet": "Pienpelit merkkaussäännöillä; 2v2 laidalla laiturin liikkeitä vastaan; \"valppausharjoitteet\" – puolustusasema oman joukkueen hyökätessä (rest defence -pelit)"
    }
  ],
  "LP-P3": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Tilan puolustaminen",
      "painopisteet": "Varmistusharjoitteet keskustopparin kanssa pareittain; syvyysjuoksujen seuraaminen 1v1/2v2; pudottamisen ajoitus selustasyöttöjä vastaan"
    }
  ],
  "LP-P4": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Pallollisen puolustaminen",
      "painopisteet": "Toistuvat 1v1-tilanteet laidalla (ohjaaminen sivurajaan); prässitekniikka: lähestymiskulma, asento, ajoitus; 2v2 seinäsyöttöjä vastaan"
    }
  ],
  "LP-P5": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Rangaistusalueen vapauttaminen",
      "painopisteet": "Pelinomaiset linjannosto- ja poistumisharjoitteet purkupallojen jälkeen; paitsiolinjan yhteispeli"
    }
  ],
  "LP-P6": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Keskityksen puolustaminen",
      "painopisteet": "Keskityspuolustus molemmissa rooleissa (pallonpuoleinen/kaventava); 1v1 rangaistusalueella viimeistelijää vastaan; irtopallojen pelaaminen keskityksen jälkeen"
    }
  ],
  "LP-P7": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Vaara-alueet",
      "painopisteet": "Miesvartiointiharjoitteet rangaistusalueella; \"puolusta loppuun asti\" -sääntö pienpeleissä"
    }
  ],
  "LP-P8": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Ennakointi",
      "painopisteet": "Reaktio- ja irtopallopelit; video: oma asema laukausten ja ilmapallokamppailujen aikana"
    }
  ],
  "LP-H0": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Rondot ja possessiopelit skannaussäännöllä; värikoodipelit; skannausfrekvenssin laskenta videolta"
    }
  ],
  "LP-H1": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Hyökkäystasapaino",
      "painopisteet": "Rakentelupelit, joissa laitapuolustajan nousu vapautettu/rajoitettu; tilanteenvaihtopelit menetyksen jälkeen"
    }
  ],
  "LP-H2": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Tuet & varmistavat syötöt",
      "painopisteet": "4v2 → 8v6 rakentelupelit prässiä vastaan; syöttötekniikka molemmilla jaloilla; vastaanotto avoimella peliasennolla paineessa"
    }
  ],
  "LP-H3": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Tuet & varmistavat syötöt",
      "painopisteet": "4v2 → 8v6 rakentelupelit prässiä vastaan; syöttötekniikka molemmilla jaloilla; vastaanotto avoimella peliasennolla paineessa"
    }
  ],
  "LP-H4": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Ylivoiman luominen",
      "painopisteet": "Pelinkääntöharjoitteet; syöttö sisäkaistalle kuvioina (laituri sisään – laitapuolustaja ohi); syöttö etuun -harjoitteet liikkuvaan pelaajaan"
    }
  ],
  "LP-H5": [
    {
      "pelipaikka": "Laitapuolustaja",
      "teema": "Hyökkäykseen mukaan nouseminen",
      "painopisteet": "2v1-tilanteiden luominen laidalle pienpeleissä; mukaan nousun ajoitusharjoitteet (nousu vasta 2. tai 3. syötöllä); keskitykset ja kääntökeskitykset liikkeestä"
    }
  ],
  "KK-P1": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Puolustustasapaino",
      "painopisteet": "Keskikenttälinjan liikkumisharjoitteet (3 pelaajan linja palloa vastaan); 8v8-pelit keskustan sulkemissäännöillä; video: etäisyydet linjassa"
    }
  ],
  "KK-P2": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Merkkaus & syöttölinjojen sulkeminen",
      "painopisteet": "Varjostusharjoitteet (peitä kärki, prässää pallollista); 4v4+3 prässipelit peittokulmasäännöillä; organisoidun prässin kuviot joukkueharjoituksissa"
    }
  ],
  "KK-P3": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Tilan puolustaminen",
      "painopisteet": "Varmistus- ja pudottautumisharjoitteet kahden linjan välissä; 3v3 syvyysjuoksuilla laidoille; \"linja ylitetty → pudota\" -reaktiopelit"
    }
  ],
  "KK-P4": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Pallollisen puolustaminen",
      "painopisteet": "1v1 keskialueella (prässi ilman ohitusta); 2v2 keskustassa etenemissyöttöjen estäminen; kaksinkamppailut ahtaassa tilassa"
    }
  ],
  "KK-P5": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Rangaistusalueen vapauttaminen & keskitykset",
      "painopisteet": "Keskityspuolustus, jossa MID pudottautuu topparilinjaan; takaviistosyöttöjen puolustaminen rangaistusalueen reunalla (cut-back-tilanteet)"
    }
  ],
  "KK-P6": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Rangaistusalueen vapauttaminen & keskitykset",
      "painopisteet": "Keskityspuolustus, jossa MID pudottautuu topparilinjaan; takaviistosyöttöjen puolustaminen rangaistusalueen reunalla (cut-back-tilanteet)"
    }
  ],
  "KK-P7": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Puolustaminen vaara-alueilla",
      "painopisteet": "Miesvartiointi- ja blokkausharjoitteet rangaistusalueella; \"toimi topparina\" -roolipelit pienpeleissä"
    }
  ],
  "KK-P8": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Ennakointi & tilanteenvaihto",
      "painopisteet": "Katkopelit (rondo, jossa keskimmäinen palkitaan katkosta); vastaprässipelit 5 s -säännöllä menetyksen jälkeen; video: reagointi menetyksiin"
    }
  ],
  "KK-H0": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Rondot ja possessiopelit skannaussäännöllä (pään käännyttävä 2× ennen vastaanottoa); värikoodipelit; skannausfrekvenssin laskenta videolta"
    }
  ],
  "KK-H1": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Hyökkäystasapaino",
      "painopisteet": "Possessiopelit sijoittumissäännöillä (ei samaan linjaan syöttäjän kanssa); rest defence -roolit hyökkäysharjoitteissa"
    }
  ],
  "KK-H2": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Tukien tarjoaminen",
      "painopisteet": "Pelit linjojen välissä pelaamisesta (4v4+3 välitilapelaajilla); hätätuki- ja jatkuvuustukikuviot; kolmannen pelaajan yhdistelmät"
    }
  ],
  "KK-H3": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Pelin avaamisen varmistaminen",
      "painopisteet": "Avauspelikuviot maalivahdilta ja toppareilta prässiä vastaan (6v4 → 8v6); liike vastustajan prässilinjojen väliin"
    }
  ],
  "KK-H4": [
    {
      "pelipaikka": "Keskikenttäpelaaja",
      "teema": "Hyökkäyspelin organisointi",
      "painopisteet": "Suuntapossessiot (eteneminen pisteytetään); yhden–kahden kosketuksen pelit; syöttö etuun -harjoitteet liikkuvaan vastaanottajaan; \"syötä ja liiku\" -säännöt"
    }
  ],
  "KY-P1": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Puolustustasapaino",
      "painopisteet": "Keskikenttälinjan liikkumisharjoitteet; 8v8-pelit, joissa AMID:n prässi/tasapaino-valintaa arvioidaan; video: etäisyys kuutosiin/kaseihin"
    }
  ],
  "KY-P2": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Puolustettavan tunnistaminen",
      "painopisteet": "Prässipelit vaihtuvilla vastuilla (4v4+3); tilannekuvaharjoitteet videolta: kuka on vaarallisin pelattava"
    }
  ],
  "KY-P3": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Tilan puolustaminen",
      "painopisteet": "Peittokulmaharjoitteet (estä sisäkaistasyöttö prässin aikana); rondo, jossa keskustan halkaisusyötöstä lisäpiste vastustajalle; pelinkäännön estopelit"
    }
  ],
  "KY-P4": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Pallollisen puolustaminen & vastaprässi",
      "painopisteet": "1v1 aloitteen viemisestä; 5 sekunnin vastaprässisääntö kaikissa pienpeleissä; menetys → lähin prässää -reaktiopelit"
    }
  ],
  "KY-P5": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Vastahyökkäyksiin valmistautuminen",
      "painopisteet": "Tilanteenvaihtopelit (voitto → 3 syötön eteneminen 6 sekunnissa); purkupallon jälkeinen ensimmäinen tuki -kuviot"
    }
  ],
  "KY-P6": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Jatkotilanteiden ennakointi",
      "painopisteet": "Katko- ja irtopallopelit rangaistusalueen edustalla; toisen aallon laukaukset ja pallonhallinnan jatkaminen"
    }
  ],
  "KY-H0": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Rondot skannaussäännöllä; värikoodipelit ahtaassa tilassa; vastaanotto + kääntyminen paineen alla (mies selässä)"
    }
  ],
  "KY-H1": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Hyökkäystasapaino",
      "painopisteet": "Possessiopelit sisäkaistavyöhykkeillä (max 1 pelaaja / kaista); asemanvaihtokuviot laiturin ja kärjen kanssa säännöillä"
    }
  ],
  "KY-H2": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Tukien tarjoaminen (taskut)",
      "painopisteet": "4v4+3 välitilapelaajilla; \"näy pallolliselle, piilossa vartijalta\" -harjoitteet; vastaanotto taskussa + ratkaisu eteenpäin; syvyysjuoksu vs. pudottautuminen -valintapelit"
    }
  ],
  "KY-H3": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Pelin avaamisen varmistaminen",
      "painopisteet": "Avauspelikuviot, joissa AMID pudottautuu ylivoiman luomiseksi; prässinpurkupelit 6v4 → 8v6"
    }
  ],
  "KY-H4": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Hyökkäyspelin organisointi",
      "painopisteet": "Suuntapossessiot etenemispisteillä; viimeisen kolmanneksen kuviot (syöttö etuun, kolmannen pelaajan juoksut); yhden–kahden kosketuksen pelit ahtaassa"
    }
  ],
  "KY-H5": [
    {
      "pelipaikka": "Hyökkäävä keskikenttäpelaaja",
      "teema": "Laitapallot ja keskitykset",
      "painopisteet": "Keskityskuviot, joissa AMID ajoittaa juoksun rangaistusalueelle (kakkosaalto, rankkaripisteen tila); viimeistely keskityksistä liikkeestä"
    }
  ],
  "KH-P1": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Puolustustasapaino",
      "painopisteet": "Joukkueen puolustusryhmitysharjoitteet, joissa kärjen etäisyys keskikenttään mitataan; video: sijainti joukkueen puolustaessa"
    }
  ],
  "KH-P2": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Merkkaus & prässin ohjaaminen",
      "painopisteet": "Prässikuviot avausta vastaan (ohjaus laidalle, kaarva juoksu); kärkiparin yhteistyöharjoitteet (toinen prässää, toinen varmistaa/peittää)"
    }
  ],
  "KH-P3": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Tilan puolustaminen",
      "painopisteet": "Peittokulmaharjoitteet (estä syöttö sisään prässin aikana); pelinkäännön estopelit; pudottaminen ylityksen jälkeen -reaktiopelit"
    }
  ],
  "KH-P4": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Pallollisen puolustaminen & vastaprässi",
      "painopisteet": "1v1 ohjaava prässi topparia vastaan; 5 sekunnin vastaprässisääntö pienpeleissä"
    }
  ],
  "KH-P5": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Vastahyökkäyksiin valmistautuminen",
      "painopisteet": "Tilanteenvaihtopelit: pallonvoitto → kärki tarjoutuu syvyyteen 2 sekunnissa; pitkän purkupallon kilpailutilanteet"
    }
  ],
  "KH-P6": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Jatkotilanteiden ennakointi (puolustus)",
      "painopisteet": "Prässäystriggerien tunnistus videolta (huono kosketus, selkä pelisuuntaan -vastaanotto); reaktioprässipelit"
    }
  ],
  "KH-H0": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Vastaanotot vartija selässä skannaussäännöllä; värikoodipelit selkä maalille; kääntymisharjoitteet paineen alla"
    }
  ],
  "KH-H1": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Tilan luominen ja syvyys",
      "painopisteet": "Paitsiolinjalla pelaamisen harjoitteet (ajoitus, kaarevat juoksut); syvyysjuoksu vs. pudottautuminen -valintapelit"
    }
  ],
  "KH-H2": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Hyökkäyksen liikuttaminen",
      "painopisteet": "Juoksuratakuviot (selusta, jalkoihin, ristiin); liike syötön jälkeen -säännöt pienpeleissä; tilan luominen laiturille/kympille kuvioina"
    }
  ],
  "KH-H3": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Tukien tarjoaminen",
      "painopisteet": "Selkä maalille -pito ja seinäsyötöt paineen alla; pudottautuminen + kolmannen pelaajan juoksu -kuviot"
    }
  ],
  "KH-H4": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Laitapallot ja keskitykset",
      "painopisteet": "Keskitysten viimeistely eri juoksuradoilla (1. tolppa, 2. tolppa, rankkaripiste, takatuki); ajoitusharjoitteet keskittäjän kanssa"
    }
  ],
  "KH-H5": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Hyökkääminen rangaistusalueella",
      "painopisteet": "Viimeistelyharjoitteet eri lähtötilanteista (kääntyen, ensimmäisellä, ilmasta); laukaus/syöttö-valintapelit 2v1-maalintekotilanteissa"
    }
  ],
  "KH-H6": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Edun hyödyntäminen",
      "painopisteet": "1v1-viimeistelytilanteet topparia ja maalivahtia vastaan; ylivoimatilanteiden (2v1, 3v2) ratkaisupelit toistoina"
    }
  ],
  "KH-H7": [
    {
      "pelipaikka": "Keskushyökkääjä",
      "teema": "Jatkotilanteet",
      "painopisteet": "Torjunnasta irtoavien pallojen viimeistely; pudotusten ennakointi pääpallokamppailuissa; toisen aallon laukaukset"
    }
  ],
  "LA-P1": [
    {
      "pelipaikka": "Laituri",
      "teema": "Puolustustasapaino",
      "painopisteet": "Ryhmityspelit, joissa laiturin puolustussijainti arvioidaan; video: etäisyys laitapuolustajaan ja keskikenttään puolustusvaiheessa"
    }
  ],
  "LA-P2": [
    {
      "pelipaikka": "Laituri",
      "teema": "Merkkaus & vastaanoton esto",
      "painopisteet": "Varjostusharjoitteet laidalla; 2v2 laidan puolustaminen (laituri + laitapuolustaja vastustajan paria vastaan)"
    }
  ],
  "LA-P3": [
    {
      "pelipaikka": "Laituri",
      "teema": "Tilan puolustaminen",
      "painopisteet": "Peittokulmaharjoitteet (sisäkaista kiinni); nousevan laitapuolustajan seuraaminen -tilannepelit; kaventaminen vastakkaisen laidan hyökkäyksissä"
    }
  ],
  "LA-P4": [
    {
      "pelipaikka": "Laituri",
      "teema": "Pallollisen puolustaminen & vastaprässi",
      "painopisteet": "1v1-puolustus laidalla; 5 sekunnin vastaprässisääntö pienpeleissä"
    }
  ],
  "LA-P5": [
    {
      "pelipaikka": "Laituri",
      "teema": "Vastahyökkäykset",
      "painopisteet": "Tilanteenvaihtopelit: voitto → syvyysjuoksu 3 sekunnissa; ensimmäisen ja toisen aallon juoksuratakuviot molemmilta laidoilta"
    }
  ],
  "LA-P6": [
    {
      "pelipaikka": "Laituri",
      "teema": "Jatkotilanteiden ennakointi (puolustus)",
      "painopisteet": "Prässäystriggerien tunnistus videolta; reaktioprässipelit laidalla"
    }
  ],
  "LA-H0": [
    {
      "pelipaikka": "Laituri",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Rondot ja laitapelit skannaussäännöllä; \"missä laitapuolustaja?\" -värikoodipelit ennen vastaanottoa"
    }
  ],
  "LA-H1": [
    {
      "pelipaikka": "Laituri",
      "teema": "Leveyden takaaminen",
      "painopisteet": "Possessiopelit leveyssäännöillä (laituri rajassa kiinni); kaventamisen ajoitusharjoitteet viimeistelyalueille tultaessa"
    }
  ],
  "LA-H2": [
    {
      "pelipaikka": "Laituri",
      "teema": "Hyökkäyksen liikuttaminen",
      "painopisteet": "Juoksuratakuviot (selusta, jalkaan, syötön jälkeen); asemanvaihdot laitapuolustajan kanssa (overlap/underlap-kuviot)"
    }
  ],
  "LA-H3": [
    {
      "pelipaikka": "Laituri",
      "teema": "Tukien tarjoaminen",
      "painopisteet": "Sisäkaistatuki-kuviot (laituri sisään, laitapuolustaja leveäksi); jatkuvuustuet rakentelupeleissä"
    }
  ],
  "LA-H4": [
    {
      "pelipaikka": "Laituri",
      "teema": "Laitapallot ja keskitykset",
      "painopisteet": "Keskitysharjoitteet liikkeestä eri alueille (1. tolppa, rankkaripiste, takatolppa, kääntökeskitys); takatolpan liittymiset vastakkaiselta laidalta"
    }
  ],
  "LA-H5": [
    {
      "pelipaikka": "Laituri",
      "teema": "Hyökkääminen rangaistusalueella",
      "painopisteet": "Viimeistely sisäänleikkauksista ja keskityksistä; laukaus/syöttö-valintapelit; heikomman jalan viimeistelytoistot"
    }
  ],
  "LA-H6": [
    {
      "pelipaikka": "Laituri",
      "teema": "Edun hyödyntäminen (1v1)",
      "painopisteet": "1v1-haastot eri lähtötilanteista (vauhdista, paikaltaan, sisään/ulos); suuntaava ensimmäinen kosketus -harjoitteet; 2v1-tilanteiden luominen laidalla (houkuttele ja syötä)"
    }
  ],
  "LA-H7": [
    {
      "pelipaikka": "Laituri",
      "teema": "Jatkotilanteet",
      "painopisteet": "Toisen aallon laukaukset; takatolpan irtopallot keskityksistä; torjunnasta irtoavien pallojen viimeistely"
    }
  ],
  "MV-P1": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Puolustustasapaino (syvyyssijainti)",
      "painopisteet": "Sijoittumisharjoitteet pelin siirtyessä (pallo laidalta laidalle, linja nousee/laskee); video: etäisyys puolustuslinjaan eri pelitilanteissa"
    }
  ],
  "MV-P2": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Selustan puolustaminen (sweeper)",
      "painopisteet": "Selustasyöttöjen katkaisuharjoitteet juoksukilpailuna hyökkääjää vastaan; pelaaminen jalalla rangaistusalueen ulkopuolella paineessa; lähtöpäätösharjoitteet (lähde/jää)"
    }
  ],
  "MV-P3": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Pelin ohjaaminen",
      "painopisteet": "Pienpelit, joissa maalivahti johtaa puolustuslinjaa äänellä (linja liikkuu vain käskystä); video-oppiminen: oman kommunikaation määrä ja laatu ottelussa"
    }
  ],
  "MV-P4": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Maalinteon estäminen",
      "painopisteet": "Torjuntatekniikka eri korkeuksiin ja etäisyyksiin toistoina; kulmankavennusradat; 1v1-tilanteet eri lähtöasetelmista; toisen torjunnan reaktioharjoitteet"
    }
  ],
  "MV-P5": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Keskitysten hallinta",
      "painopisteet": "Ilmapalloharjoitteet ruuhkassa (kontakti sallittu); lähtöpäätöspelit vaihtelevilla keskityksillä; kommunikaatio + kiinniotto/nyrkkäys-valinta"
    }
  ],
  "MV-P6": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Jatkotilanteiden ennakointi",
      "painopisteet": "Torjunta → nouse → asemoidu -sarjat; irtopallo- ja pudotusreaktiopelit rangaistusalueen edustalla"
    }
  ],
  "MV-H0": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Tiedon kerääminen (skannaus)",
      "painopisteet": "Takaisinsyöttöharjoitteet prässiä vastaan skannaussäännöllä; värikoodipelit ennen vastaanottoa; tilannekuvaharjoitteet videolta"
    }
  ],
  "MV-H1": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Pelin avaaminen",
      "painopisteet": "Avaustekniikka molemmilla jaloilla (lyhyt 10–30 m, keskipitkä 30–50 m, pitkä 50+ m); avausvalintapelit elävää prässiä vastaan (6v4 + MV)"
    }
  ],
  "MV-H2": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Tukien tarjoaminen",
      "painopisteet": "Rakentelupelit, joissa maalivahti on pakollinen +1 (topparit eivät saa edetä ilman MV-tukea); syöttökulmaharjoitteet"
    }
  ],
  "MV-H3": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Tilanteenvaihdon käynnistäminen",
      "painopisteet": "Torjunta/kiinniotto → heitto ensimmäiseen aaltoon -sarjat; vastahyökkäyspelit, joissa hyökkäys alkaa maalivahdista"
    }
  ],
  "MV-H4": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Pelin rytmin hallinta",
      "painopisteet": "Pelinomaiset skenaarioharjoitteet (johdossa 1–0, tarve rauhoittaa / tappiolla, tarve nopeuttaa); pallonpito paineen alla ilman riskialueita"
    }
  ],
  "MV-H5": [
    {
      "pelipaikka": "Maalivahti",
      "teema": "Sijoittuminen hallinnassa",
      "painopisteet": "Rest defence -harjoitteet: MV:n sijainti joukkueen hyökätessä + reaktio menetykseen (sweeper-valmius)"
    }
  ]
};

var TM_TT_KYTKENTA = {
  "J-H1": {
    "yksilo": [
      "Y-H0",
      "Y-H1",
      "Y-H2"
    ],
    "pelipaikat": [
      "MV-H1",
      "MV-H2",
      "T-H1",
      "T-H3",
      "KK-H3",
      "LP-H0"
    ]
  },
  "J-H2": {
    "yksilo": [
      "Y-H8",
      "Y-H6",
      "Y-H0"
    ],
    "pelipaikat": []
  },
  "J-H3": {
    "yksilo": [
      "Y-H2",
      "Y-H6",
      "Y-H3"
    ],
    "pelipaikat": [
      "T-H3",
      "T-H4",
      "LP-H3",
      "LP-H4",
      "KK-H4",
      "KY-H4",
      "MV-H4"
    ]
  },
  "J-H4": {
    "yksilo": [
      "Y-H3",
      "Y-H6",
      "Y-H2"
    ],
    "pelipaikat": [
      "T-H4",
      "LP-H4",
      "LP-H5",
      "KK-H2",
      "KY-H2",
      "KH-H2",
      "LA-H4"
    ]
  },
  "J-H5": {
    "yksilo": [
      "Y-H9",
      "Y-H7",
      "Y-H8"
    ],
    "pelipaikat": [
      "KH-H4",
      "LA-H5",
      "LA-H6",
      "KY-H5",
      "LP-H5"
    ]
  },
  "J-H6": {
    "yksilo": [
      "Y-P4",
      "Y-H0"
    ],
    "pelipaikat": [
      "T-H1",
      "LP-H1",
      "KK-H1",
      "KH-P4"
    ]
  },
  "J-P1": {
    "yksilo": [
      "Y-P1",
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P2",
      "LP-P2",
      "KK-P2",
      "KY-P1",
      "KH-P2",
      "LA-P2"
    ]
  },
  "J-P2": {
    "yksilo": [
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": []
  },
  "J-P3": {
    "yksilo": [
      "Y-P3"
    ],
    "pelipaikat": [
      "T-P3",
      "LP-P3",
      "KK-P3",
      "KY-P2",
      "KH-P2"
    ]
  },
  "J-P4": {
    "yksilo": [
      "Y-P1",
      "Y-P2"
    ],
    "pelipaikat": [
      "T-P3",
      "KK-P3",
      "LA-P3"
    ]
  },
  "J-P5": {
    "yksilo": [
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P1",
      "T-P5",
      "LP-P1",
      "MV-P2"
    ]
  },
  "J-P6": {
    "yksilo": [
      "Y-P1",
      "Y-P2",
      "Y-H0"
    ],
    "pelipaikat": [
      "KH-P2",
      "KH-P4",
      "KY-P3",
      "LA-P4",
      "KK-P6"
    ]
  },
  "J-S1": {
    "yksilo": [
      "Y-P1",
      "Y-H0",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P6",
      "LP-P6",
      "KK-P6",
      "KY-P3",
      "KH-P4",
      "LA-P4"
    ]
  },
  "J-S2": {
    "yksilo": [
      "Y-H0",
      "Y-H2",
      "Y-H7"
    ],
    "pelipaikat": [
      "KH-P5",
      "KY-P4",
      "LA-P5",
      "MV-H3",
      "T-P6",
      "LP-P6"
    ]
  },
  "J-E1": {
    "yksilo": [
      "Y-H9",
      "Y-H7"
    ],
    "pelipaikat": [
      "KH-H4",
      "T-P4",
      "T-P5"
    ]
  },
  "J-E2": {
    "yksilo": [
      "Y-P2",
      "Y-P4"
    ],
    "pelipaikat": [
      "T-P4",
      "T-P5",
      "MV-P4",
      "LP-P5"
    ]
  },
  "_kaanteinen": {
    "Y-H0": [
      "J-H1",
      "J-H2",
      "J-H6",
      "J-P6",
      "J-S1",
      "J-S2"
    ],
    "Y-H1": [
      "J-H1"
    ],
    "Y-H2": [
      "J-H1",
      "J-H3",
      "J-H4",
      "J-S2"
    ],
    "MV-H1": [
      "J-H1"
    ],
    "MV-H2": [
      "J-H1"
    ],
    "T-H1": [
      "J-H1",
      "J-H6"
    ],
    "T-H3": [
      "J-H1",
      "J-H3"
    ],
    "KK-H3": [
      "J-H1"
    ],
    "LP-H0": [
      "J-H1"
    ],
    "Y-H8": [
      "J-H2",
      "J-H5"
    ],
    "Y-H6": [
      "J-H2",
      "J-H3",
      "J-H4"
    ],
    "Y-H3": [
      "J-H3",
      "J-H4"
    ],
    "T-H4": [
      "J-H3",
      "J-H4"
    ],
    "LP-H3": [
      "J-H3"
    ],
    "LP-H4": [
      "J-H3",
      "J-H4"
    ],
    "KK-H4": [
      "J-H3"
    ],
    "KY-H4": [
      "J-H3"
    ],
    "MV-H4": [
      "J-H3"
    ],
    "LP-H5": [
      "J-H4",
      "J-H5"
    ],
    "KK-H2": [
      "J-H4"
    ],
    "KY-H2": [
      "J-H4"
    ],
    "KH-H2": [
      "J-H4"
    ],
    "LA-H4": [
      "J-H4"
    ],
    "Y-H9": [
      "J-H5",
      "J-E1"
    ],
    "Y-H7": [
      "J-H5",
      "J-S2",
      "J-E1"
    ],
    "KH-H4": [
      "J-H5",
      "J-E1"
    ],
    "LA-H5": [
      "J-H5"
    ],
    "LA-H6": [
      "J-H5"
    ],
    "KY-H5": [
      "J-H5"
    ],
    "Y-P4": [
      "J-H6",
      "J-P1",
      "J-P2",
      "J-P5",
      "J-S1",
      "J-E2"
    ],
    "LP-H1": [
      "J-H6"
    ],
    "KK-H1": [
      "J-H6"
    ],
    "KH-P4": [
      "J-H6",
      "J-P6",
      "J-S1"
    ],
    "Y-P1": [
      "J-P1",
      "J-P4",
      "J-P6",
      "J-S1"
    ],
    "Y-P2": [
      "J-P1",
      "J-P2",
      "J-P4",
      "J-P5",
      "J-P6",
      "J-E2"
    ],
    "T-P2": [
      "J-P1"
    ],
    "LP-P2": [
      "J-P1"
    ],
    "KK-P2": [
      "J-P1"
    ],
    "KY-P1": [
      "J-P1"
    ],
    "KH-P2": [
      "J-P1",
      "J-P3",
      "J-P6"
    ],
    "LA-P2": [
      "J-P1"
    ],
    "Y-P3": [
      "J-P3"
    ],
    "T-P3": [
      "J-P3",
      "J-P4"
    ],
    "LP-P3": [
      "J-P3"
    ],
    "KK-P3": [
      "J-P3",
      "J-P4"
    ],
    "KY-P2": [
      "J-P3"
    ],
    "LA-P3": [
      "J-P4"
    ],
    "T-P1": [
      "J-P5"
    ],
    "T-P5": [
      "J-P5",
      "J-E1",
      "J-E2"
    ],
    "LP-P1": [
      "J-P5"
    ],
    "MV-P2": [
      "J-P5"
    ],
    "KY-P3": [
      "J-P6",
      "J-S1"
    ],
    "LA-P4": [
      "J-P6",
      "J-S1"
    ],
    "KK-P6": [
      "J-P6",
      "J-S1"
    ],
    "T-P6": [
      "J-S1",
      "J-S2"
    ],
    "LP-P6": [
      "J-S1",
      "J-S2"
    ],
    "KH-P5": [
      "J-S2"
    ],
    "KY-P4": [
      "J-S2"
    ],
    "LA-P5": [
      "J-S2"
    ],
    "MV-H3": [
      "J-S2"
    ],
    "T-P4": [
      "J-E1",
      "J-E2"
    ],
    "MV-P4": [
      "J-E2"
    ],
    "LP-P5": [
      "J-E2"
    ]
  }
};


// ── Apurit (§26/§30) ──
// tmTtNorm5: KPI-taso 1–3 → 5D/IDP-skaala 1–5 (1→1, 2→3, 3→5). EI muuta arviointiasteikkoa (§0a).
function tmTtNorm5(taso) {
  if (taso == null || isNaN(taso)) return null;
  var t = Math.max(1, Math.min(3, Number(taso)));
  return (t - 1) * 2 + 1;
}

// tmTtVaihe: pelaajan teknis-taktinen vaihe iästä/pelipaikasta. 'perus'|'yhteispeli'|'silta'|'pelipaikka'.
function tmTtVaihe(p) {
  p = p || {};
  if (p.tt_vaihe) return p.tt_vaihe;
  var ika = p.ika;
  if (ika == null && p.syntymaVuosi != null) {   // syntymaVuosi voittaa (kronologinen ikäluokka)
    var v = (p.nyt_vuosi || new Date().getFullYear());
    ika = v - p.syntymaVuosi;
  }
  // §26 joukkuenimi-fallback (sama regex kuin normiIka): 'SJK P15' → 15. Bio-ikä (PHV) pidetään erillään.
  if (ika == null && p.joukkue) {
    var jm = String(p.joukkue).match(/\b([PTU])\s?(\d{1,2})\b/i);
    if (jm) ika = parseInt(jm[2], 10);
  }
  if (ika == null) return 'yhteispeli';
  if (ika <= 9) return 'perus';        // §0a: ≤9 perus · 10–13 yhteispeli · 14 silta · ≥15 pelipaikka
  if (ika <= 13) return 'yhteispeli';
  if (ika <= 14) return 'silta';
  return 'pelipaikka';
}

// tmTtItems: vaihe-gating → arvioitavat teemat. Perus/yhteispeli/silta = 14 youth; pelipaikka = youth + aktiivisen pelipaikan fundamentit.
function tmTtItems(pelaaja) {
  var vaihe = tmTtVaihe(pelaaja || {});
  if (vaihe !== 'pelipaikka') return TM_TT_YOUTH.slice();
  var pos = (pelaaja && (pelaaja.tt_positio_aktiivinen || pelaaja.positio)) || null;
  var fund = (pos && TM_TT_FUNDAMENTIT[pos]) ? TM_TT_FUNDAMENTIT[pos] : [];
  return TM_TT_YOUTH.slice().concat(fund);
}

// tmTtKysymykset: teeman avaimen (t_p1 / y_h0 / j_h1) kysymykset (cue). [] jos ei lähdettä.
function tmTtKysymykset(avainTaiKoodi) {
  var a = String(avainTaiKoodi || '').toLowerCase().replace(/-/g, '_');
  var kaikki = TM_TT_YOUTH.concat(TM_TT_JOUKKUE);
  for (var i = 0; i < kaikki.length; i++) if (kaikki[i].avain === a) return kaikki[i].kysymykset || [];
  for (var pos in TM_TT_FUNDAMENTIT) {
    var arr = TM_TT_FUNDAMENTIT[pos];
    for (var j = 0; j < arr.length; j++) if (arr[j].avain === a) return arr[j].kysymykset || [];
  }
  return [];
}

// tmTtHarjoitteet: teeman harjoitteet (youth konseptipeli tai pelipaikka Excel-harjoite). [] jos ei.
function tmTtHarjoitteet(avainTaiKoodi) {
  var koodi = String(avainTaiKoodi || '').toUpperCase().replace(/_/g, '-');
  var h = TM_TT_HARJOITTEET[koodi];
  if (!h) return [];
  return Array.isArray(h) ? h : [h];
}

// tmTtPelaaja (Vaihe 4b §0b/§7.22): PELAAJATURVALLINEN konsepti — { otsikko, mika, miksi, cue, koe }.
// EI KOSKAAN kriteerejä/KPI-listaa/tasolukuja pelaajapinnalle. cue = 1 kysymys; koe = 1 harjoitteen lyhyt nimi.
function _ttKonseptipeliNimi(teksti) {
  if (!teksti) return '';
  var s = String(teksti).split(':')[0].split('–')[0].split('(')[0].trim();
  return s.length > 42 ? s.slice(0, 42).trim() : s;   // vain nimi, ei ohjeteksti-tulvaa
}
function tmTtPelaaja(avainTaiKoodi) {
  var a = String(avainTaiKoodi || '').toLowerCase().replace(/-/g, '_');
  var item = null, i, pos, arr, j;
  for (i = 0; i < TM_TT_YOUTH.length; i++) { if (TM_TT_YOUTH[i].avain === a) { item = TM_TT_YOUTH[i]; break; } }
  if (!item) { for (pos in TM_TT_FUNDAMENTIT) { arr = TM_TT_FUNDAMENTIT[pos]; for (j = 0; j < arr.length; j++) { if (arr[j].avain === a) { item = arr[j]; break; } } if (item) break; } }
  if (!item) return null;
  var cue = (item.kysymykset && item.kysymykset.length) ? item.kysymykset[0] : '';
  var koe = '';
  var h = TM_TT_HARJOITTEET[item.koodi];
  if (h) { var hh = Array.isArray(h) ? h[0] : h; koe = hh.konseptipeli ? _ttKonseptipeliNimi(hh.konseptipeli) : (hh.teema || ''); }
  var miksi = item.pelaaja_miksi || '';
  if (!miksi) miksi = item.pelitilanne ? ('Kun opit tämän, pelaat paremmin juuri tässä tilanteessa.') : '';   // graceful fallback (pelipaikkateemat)
  return { otsikko: item.nimi, mika: item.pelitilanne || '', miksi: miksi, cue: cue, koe: koe };
}


// ── Vienti: selain-globaalit + module.exports (Vitest) ──
var TM_TT_API = {
  TM_TT_PELIPAIKAT: TM_TT_PELIPAIKAT, TM_TT_PELIMUODOT: TM_TT_PELIMUODOT, TM_TT_ASTEIKKO: TM_TT_ASTEIKKO,
  TM_TT_YOUTH: TM_TT_YOUTH, TM_TT_FUNDAMENTIT: TM_TT_FUNDAMENTIT, TM_TT_JOUKKUE: TM_TT_JOUKKUE,
  TM_TT_HARJOITTEET: TM_TT_HARJOITTEET, TM_TT_KYTKENTA: TM_TT_KYTKENTA,
  tmTtNorm5: tmTtNorm5, tmTtVaihe: tmTtVaihe, tmTtItems: tmTtItems,
  tmTtKysymykset: tmTtKysymykset, tmTtHarjoitteet: tmTtHarjoitteet, tmTtPelaaja: tmTtPelaaja
};
if (typeof module !== 'undefined' && module.exports) module.exports = TM_TT_API;
if (typeof window !== 'undefined') { for (var _k in TM_TT_API) { try { window[_k] = TM_TT_API[_k]; } catch (e) {} } }
