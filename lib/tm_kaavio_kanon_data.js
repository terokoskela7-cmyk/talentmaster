/* tm_kaavio_kanon_data.js — KANONISEN KAAVIOKIRJASTON TOTUUSLÄHDE.
 *
 * Kanoninen /kaaviot/{avain} oli TYHJÄ: valmentaja avasi taktiikkataulun ilman yhtään mallia.
 * Nämä ovat ne kaaviot jotka on oikeasti PIIRRETTY — spec-geometria, ei pelkkä konseptiteksti.
 *
 * ⚠ MITTAKAAVA, jotta odotus on oikea: lib/tm_teknistaktiset.js sisältää 109 KONSEPTIA
 * (cue/KPI/dim), mutta niissä ei ole piirrosgeometriaa. Piirrettyjä speksejä on 20.
 * Loput konseptit ovat PIIRTÄMISTEHTÄVÄ (sisältötyö), eivät tämän tiedoston puute.
 *
 * TÄMÄ TIEDOSTO ON LÄHDE, FIRESTORE ON KOPIO. Data asui aiemmin versioimattomassa
 * `Claude outputs/`-kansiossa (specs.json + specs_yp.json + specs_jp.json), jota ei ole gitissä
 * → se ei voi olla totuuslähde. Uusi piirretty kaavio lisätään TÄHÄN ja ingest ajetaan uudelleen:
 *   node scripts/ingest_kaaviot_kanon.js --dry-run     (tarkista)
 *   node scripts/ingest_kaaviot_kanon.js               (kirjoita; vaatii SA-tunnukset)
 *
 * §32: kanonin selitteet ovat KURATOITUA master-sisältöä → kolmikielisiä (fi/sv/en). Tämä on eri
 * asia kuin valmentajan oma selite (#530), joka on vapaatekstiä omalla kielellä — kanon jaetaan
 * seurojen yli, joten se tehdään kunnolla kolmella kielellä.
 *
 * §6: jokainen spec validoidaan validoiKaavio():lla ennen kirjoitusta (ingest + testi).
 * Kanon EI ole review-silmukassa: ei statusta eikä hyväksyntää — ne ovat read-only viitteitä,
 * joiden yli seura voi tehdä omansa samalla avaimella (override voittaa pankissa).
 */
var TM_KAAVIO_KANON = [
  {
    "avain": "j_p1",
    "arkkityyppi": "joukkuepuolustus_roolit",
    "suunta": "ylos",
    "pelimuoto": "11v11",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "PUOLUSTAA YHDESSÄ JA ROOLIJAKO",
      "sv": "ATT FÖRSVARA TILLSAMMANS OCH ROLLFÖRDELNING",
      "en": "DEFENDING TOGETHER & ROLES"
    },
    "tilanne": {
      "fi": "joukkue puolustaa – yksi painaa, muut jakavat roolit selustaan.",
      "sv": "laget försvarar – en pressar, övriga fördelar roller.",
      "en": "the team defends – one presses, the others share roles behind."
    },
    "pelaajat": [
      {
        "id": "P",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 54,
        "korostus": true
      },
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 66
      },
      {
        "id": "M1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 34,
        "y": 58
      },
      {
        "id": "M2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 66,
        "y": 58
      },
      {
        "id": "L1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 26,
        "y": 68
      },
      {
        "id": "L2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 74,
        "y": 68
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 46,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 66,
        "y": 44
      },
      {
        "id": "A3",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 34,
        "y": 44
      }
    ],
    "peittovarjot": [
      {
        "id": "pv1",
        "from": "P",
        "to": "A"
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 22,
        "y": 54,
        "t": {
          "fi": "Yksi painaa, muut tukevat rooleittain",
          "sv": "En pressar, övriga stöttar enligt roll",
          "en": "One presses, the rest support by role"
        }
      }
    ]
  },
  {
    "avain": "j_p2",
    "arkkityyppi": "tasapaino",
    "suunta": "ylos",
    "pelimuoto": "11v11",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "TASAPAINO PELIN KESKUKSEN YMPÄRILLÄ",
      "sv": "BALANS KRING SPELCENTRUM",
      "en": "BALANCE AROUND THE BALL"
    },
    "tilanne": {
      "fi": "pallo on laidalla – tiivistä palloa kohti, säilytä tasapaino heikolle puolelle.",
      "sv": "bollen är på kanten – komprimera mot boll, håll balansen.",
      "en": "the ball is wide – compress ballside, keep weak-side balance."
    },
    "pelaajat": [
      {
        "id": "P",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 26,
        "y": 54,
        "korostus": true
      },
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 38,
        "y": 62
      },
      {
        "id": "M",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 52,
        "y": 58
      },
      {
        "id": "BAL",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 72,
        "y": 60,
        "korostus": true
      },
      {
        "id": "L1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 32,
        "y": 70
      },
      {
        "id": "L2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 64,
        "y": 70
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 22,
        "y": 48,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 44
      },
      {
        "id": "A3",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 76,
        "y": 46
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 78,
        "y": 56,
        "t": {
          "fi": "Tasapaino heikolle puolelle",
          "sv": "Balans på svaga sidan",
          "en": "Balance on the weak side"
        }
      }
    ]
  },
  {
    "avain": "j_p3",
    "arkkityyppi": "tukilinja",
    "suunta": "ylos",
    "pelimuoto": "11v11",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "TUKILINJA",
      "sv": "UNDERSTÖDSLINJE",
      "en": "SUPPORT LINE"
    },
    "tilanne": {
      "fi": "ensimmäinen linja painaa – toinen linja suojaa sen selustan.",
      "sv": "första linjen pressar – andra linjen täcker ryggen.",
      "en": "the first line presses – the second line covers behind it."
    },
    "pelaajat": [
      {
        "id": "F1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 40,
        "y": 52,
        "korostus": true
      },
      {
        "id": "F2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 62,
        "y": 52
      },
      {
        "id": "S1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 30,
        "y": 66
      },
      {
        "id": "S2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 66
      },
      {
        "id": "S3",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 70,
        "y": 66
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 44,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 38,
        "y": 42
      }
    ],
    "peittovarjot": [
      {
        "id": "pv1",
        "from": "F1",
        "to": "A2"
      }
    ],
    "korkeuslinjat": [
      {
        "id": "k1",
        "y": 60
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 74,
        "y": 63,
        "t": {
          "fi": "Toinen linja suojaa selustan",
          "sv": "Andra linjen täcker ryggen",
          "en": "Second line covers behind"
        }
      }
    ]
  },
  {
    "avain": "j_p4",
    "arkkityyppi": "alivoima",
    "suunta": "ylos",
    "pelimuoto": "11v11",
    "nakyma": "puolustuskolmannes",
    "nimi": {
      "fi": "ALIVOIMAN TASAAMINEN",
      "sv": "ATT UTJÄMNA NUMERÄRT UNDERLÄGE",
      "en": "EVENING A NUMERICAL DISADVANTAGE"
    },
    "tilanne": {
      "fi": "puolustajia vähemmän kuin hyökkääjiä – hidasta ja ohjaa, tasaa alivoima ajalla.",
      "sv": "färre försvarare än anfallare – fördröj och styr, jämna ut med tid.",
      "en": "fewer defenders than attackers – delay and steer, even it out with time."
    },
    "pelaajat": [
      {
        "id": "D",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 58,
        "korostus": true
      },
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 42,
        "y": 68
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 46,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 66,
        "y": 46
      },
      {
        "id": "A3",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 34,
        "y": 46
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "ref": "D"
        },
        "to": {
          "x": 50,
          "y": 52
        }
      }
    ],
    "peittovarjot": [
      {
        "id": "pv1",
        "from": "D",
        "to": "A2"
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 24,
        "y": 56,
        "t": {
          "fi": "Hidasta, ohjaa, odota apua",
          "sv": "Fördröj, styr, invänta hjälp",
          "en": "Delay, steer, wait for help"
        }
      }
    ]
  },
  {
    "avain": "j_p5",
    "arkkityyppi": "paitsiolinja",
    "suunta": "ylos",
    "pelimuoto": "11v11",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "PUOLUSTAA PAITSIOLINJALLA",
      "sv": "FÖRSVARA MED OFFSIDELINJE",
      "en": "DEFENDING WITH THE OFFSIDE LINE"
    },
    "tilanne": {
      "fi": "tasainen puolustuslinja – pidä linja ja astu yhtenä, paitsio on ase.",
      "sv": "platt försvarslinje – håll linjen och stig som en, offside är ett vapen.",
      "en": "a flat back line – hold the line and step as one, offside is a weapon."
    },
    "pelaajat": [
      {
        "id": "B1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 22,
        "y": 58
      },
      {
        "id": "B2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 40,
        "y": 58,
        "korostus": true
      },
      {
        "id": "B3",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 60,
        "y": 58
      },
      {
        "id": "B4",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 78,
        "y": 58
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 40,
        "pallo": true
      },
      {
        "id": "R",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 55,
        "y": 50
      }
    ],
    "korkeuslinjat": [
      {
        "id": "k1",
        "y": 58
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "ref": "R"
        },
        "to": {
          "x": 58,
          "y": 64
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 24,
        "y": 54,
        "t": {
          "fi": "Pidä linja, astu yhtenä",
          "sv": "Håll linjen, stig som en",
          "en": "Hold the line, step as one"
        }
      }
    ]
  },
  {
    "avain": "j_p6",
    "arkkityyppi": "lagpress",
    "suunta": "ylos",
    "pelimuoto": "11v11",
    "nakyma": "hyokkayskolmannes",
    "nimi": {
      "fi": "LAGPRESS JA PRÄSSILAUKAISIMET",
      "sv": "LAGPRESS OCH PRESSTRIGGERS",
      "en": "TEAM PRESS & PRESS TRIGGERS"
    },
    "tilanne": {
      "fi": "laukaisin (takasyöttö) → prässi yhtenä, peitä takatila.",
      "sv": "trigger (bakåtpassning) → pressa som en, täck ytan bakom.",
      "en": "trigger (back-pass) → press as one, cover the space behind."
    },
    "pelaajat": [
      {
        "id": "P1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 40,
        "korostus": true
      },
      {
        "id": "P2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 34,
        "y": 46
      },
      {
        "id": "P3",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 66,
        "y": 46
      },
      {
        "id": "M",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 54
      },
      {
        "id": "L1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 32,
        "y": 58
      },
      {
        "id": "L2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 68,
        "y": 58
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 32,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 30,
        "y": 30
      },
      {
        "id": "A3",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 70,
        "y": 30
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "syotto",
        "from": {
          "ref": "A2"
        },
        "to": {
          "ref": "A"
        }
      },
      {
        "id": "m2",
        "tyyppi": "juoksu",
        "from": {
          "ref": "P1"
        },
        "to": {
          "x": 50,
          "y": 36
        }
      }
    ],
    "peittovarjot": [
      {
        "id": "pv1",
        "from": "P1",
        "to": "A2"
      }
    ],
    "korkeuslinjat": [
      {
        "id": "k1",
        "y": 52
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 24,
        "y": 50,
        "t": {
          "fi": "Laukaisin → prässi yhtenä",
          "sv": "Trigger → pressa som en",
          "en": "Trigger → press as one"
        }
      }
    ]
  },
  {
    "avain": "y_h0",
    "arkkityyppi": "havainnointi",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "ORIENTOITUMINEN JA HAVAINNOINTI",
      "sv": "ORIENTERING OCH AVLÄSNING",
      "en": "SCANNING & PERCEPTION"
    },
    "tilanne": {
      "fi": "kaikki alkaa tiedosta – 99 % pelistä tapahtuu ilman palloa.",
      "sv": "allt börjar med information – 99 % av spelet sker utan boll.",
      "en": "everything starts with information – 99% of play happens off the ball."
    },
    "pelaajat": [
      {
        "id": "M",
        "joukkue": "oma",
        "rooli": "vastaanottaja",
        "x": 46,
        "y": 56,
        "avoin": -70,
        "korostus": true
      },
      {
        "id": "P",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 40,
        "y": 76,
        "pallo": true
      },
      {
        "id": "O1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 64,
        "y": 50
      },
      {
        "id": "O2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 28,
        "y": 52
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 52,
        "y": 49
      }
    ],
    "cone": {
      "half": 58,
      "r": 14
    },
    "vyohyke": {
      "x": 33,
      "y": 48,
      "w": 30,
      "h": 16
    },
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "syotto",
        "from": {
          "ref": "P"
        },
        "to": {
          "ref": "M"
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 60,
        "y": 62,
        "t": {
          "fi": "Skannaa ennen vastaanottoa",
          "sv": "Skanna före mottagning",
          "en": "Scan before receiving"
        }
      }
    ]
  },
  {
    "avain": "y_h1",
    "arkkityyppi": "vastaanotto",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "VASTAANOTTO",
      "sv": "MOTTAGNING",
      "en": "RECEIVING"
    },
    "tilanne": {
      "fi": "ensikosketus ratkaisee kuka omistaa seuraavan sekunnin.",
      "sv": "förstatouchen avgör vem som äger nästa sekund.",
      "en": "the first touch decides who owns the next second."
    },
    "pelaajat": [
      {
        "id": "M",
        "joukkue": "oma",
        "rooli": "vastaanottaja",
        "x": 52,
        "y": 54,
        "avoin": -55,
        "korostus": true
      },
      {
        "id": "P",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 50,
        "y": 76,
        "pallo": true
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 56,
        "y": 47
      }
    ],
    "cone": {
      "half": 52,
      "r": 11
    },
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "syotto",
        "from": {
          "ref": "P"
        },
        "to": {
          "ref": "M"
        }
      },
      {
        "id": "m2",
        "tyyppi": "kuljetus",
        "from": {
          "ref": "M"
        },
        "to": {
          "x": 40,
          "y": 44
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 30,
        "y": 42,
        "t": {
          "fi": "Ensikosketus paineesta pois",
          "sv": "Förstatouch bort från pressen",
          "en": "First touch away from pressure"
        }
      }
    ]
  },
  {
    "avain": "y_h2",
    "arkkityyppi": "syottopeli",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "hyokkayskolmannes",
    "nimi": {
      "fi": "SYÖTTÖPELI",
      "sv": "PASSNINGSSPEL",
      "en": "PASSING PLAY"
    },
    "tilanne": {
      "fi": "syöttö on havainnon toteutus – ei pelkkä tekniikkasuoritus.",
      "sv": "en passning är förverkligandet av ett synintryck.",
      "en": "a pass is a perception made real – not a pure technique drill."
    },
    "pelaajat": [
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 44,
        "y": 60,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "A",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 62,
        "y": 42,
        "korostus": true
      },
      {
        "id": "T",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 28,
        "y": 58
      },
      {
        "id": "V1",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 46,
        "y": 51
      },
      {
        "id": "V2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 60,
        "y": 51
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "syotto",
        "from": {
          "ref": "C"
        },
        "to": {
          "ref": "A"
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 64,
        "y": 48,
        "t": {
          "fi": "Syöttö linjan taakse",
          "sv": "Passning bakom linjen",
          "en": "Pass behind the line"
        }
      }
    ]
  },
  {
    "avain": "y_h3",
    "arkkityyppi": "kuljetus",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "TEMPON VETO",
      "sv": "TEMPODRIVNING",
      "en": "DRIVING TEMPO"
    },
    "tilanne": {
      "fi": "tilaa edessä tai tarve sitoa vastustaja – kuljetus on väline.",
      "sv": "yta framför eller behov av att binda motståndare.",
      "en": "space ahead or a need to commit a defender – driving is a means."
    },
    "pelaajat": [
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 40,
        "y": 70,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "O",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 66,
        "y": 52
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 40
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "kuljetus",
        "from": {
          "ref": "C"
        },
        "to": {
          "x": 48,
          "y": 50
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 52,
        "y": 55,
        "t": {
          "fi": "Kuljeta tilaan, sido vastustaja",
          "sv": "Driv in i ytan, bind motståndaren",
          "en": "Drive into space, commit the defender"
        }
      }
    ]
  },
  {
    "avain": "y_h4",
    "arkkityyppi": "haastaminen",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "hyokkayskolmannes",
    "nimi": {
      "fi": "FINTIT JA HAASTAMINEN",
      "sv": "FINTER OCH UTMANINGAR",
      "en": "FEINTS & 1v1"
    },
    "tilanne": {
      "fi": "puolustaja edessä eikä syöttöväylää auki – 1v1 on ratkaistava itse.",
      "sv": "försvarare framför och ingen passningsväg öppen – 1v1 måste lösas på egen hand.",
      "en": "a defender ahead and no pass lane open – the 1v1 must be solved alone."
    },
    "pelaajat": [
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 40,
        "y": 40,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 44,
        "y": 30
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "kuljetus",
        "from": {
          "ref": "C"
        },
        "to": {
          "x": 56,
          "y": 24
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 58,
        "y": 30,
        "t": {
          "fi": "Haasta 1v1, vie ohi",
          "sv": "Utmana 1v1, ta dig förbi",
          "en": "Take on the 1v1, get past"
        }
      }
    ]
  },
  {
    "avain": "y_h5",
    "arkkityyppi": "suojaaminen",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "PALLON SUOJAAMINEN",
      "sv": "BOLLTÄCKNING",
      "en": "SHIELDING THE BALL"
    },
    "tilanne": {
      "fi": "kovan paineen alla eikä eteenpäin väylää – pallo pidetään joukkueella.",
      "sv": "under hård press och ingen framåtriktad väg – bollen ska behållas inom laget.",
      "en": "under heavy press and no forward path – keep the ball within the team."
    },
    "pelaajat": [
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 50,
        "y": 58,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "S",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 74
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 50
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "syotto",
        "from": {
          "ref": "C"
        },
        "to": {
          "ref": "S"
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 34,
        "y": 56,
        "t": {
          "fi": "Suojaa pallo vartalolla",
          "sv": "Skydda bollen med kroppen",
          "en": "Shield the ball with your body"
        }
      }
    ]
  },
  {
    "avain": "y_h6",
    "arkkityyppi": "tuki",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "TUEN TARJOAMINEN",
      "sv": "ERBJUDA UNDERSTÖD",
      "en": "OFFERING SUPPORT"
    },
    "tilanne": {
      "fi": "pallollinen tarvitsee vaihtoehtoja – tuki on yhteispelin peruskivi.",
      "sv": "bollhållaren behöver alternativ – understöd är lagspelets grundsten.",
      "en": "the ball carrier needs options – support is the cornerstone of team play."
    },
    "pelaajat": [
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 50,
        "y": 62,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "S1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 34,
        "y": 54
      },
      {
        "id": "S2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 66,
        "y": 56
      },
      {
        "id": "S3",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 76
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 50
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "syotto",
        "from": {
          "ref": "C"
        },
        "to": {
          "ref": "S1"
        }
      },
      {
        "id": "m2",
        "tyyppi": "syotto",
        "from": {
          "ref": "C"
        },
        "to": {
          "ref": "S2"
        }
      },
      {
        "id": "m3",
        "tyyppi": "syotto",
        "from": {
          "ref": "C"
        },
        "to": {
          "ref": "S3"
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 24,
        "y": 58,
        "t": {
          "fi": "Tarjoa kulma – kolmio",
          "sv": "Erbjud en vinkel – triangel",
          "en": "Offer an angle – triangle"
        }
      }
    ]
  },
  {
    "avain": "y_h7",
    "arkkityyppi": "irtautuminen",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "hyokkayskolmannes",
    "nimi": {
      "fi": "IRTAUTUMINEN MERKINNÄSTÄ",
      "sv": "FRIGÖRELSE FRÅN MARKERING",
      "en": "GETTING FREE FROM MARKING"
    },
    "tilanne": {
      "fi": "tiukassa merkinnässä – tila ansaitaan liikkeellä.",
      "sv": "tätt markerad – yta måste förtjänas genom rörelse.",
      "en": "tightly marked – space must be earned through movement."
    },
    "pelaajat": [
      {
        "id": "M",
        "joukkue": "oma",
        "rooli": "vastaanottaja",
        "x": 48,
        "y": 58,
        "avoin": -80,
        "korostus": true
      },
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 44,
        "y": 74,
        "pallo": true
      },
      {
        "id": "V",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 56,
        "y": 46
      }
    ],
    "cone": {
      "half": 48,
      "r": 10
    },
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "x": 58,
          "y": 44
        },
        "to": {
          "ref": "M"
        }
      },
      {
        "id": "m2",
        "tyyppi": "syotto",
        "from": {
          "ref": "C"
        },
        "to": {
          "ref": "M"
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 60,
        "y": 40,
        "t": {
          "fi": "Valeliike syvään, tule lyhyeen",
          "sv": "Finta djupt, kom kort",
          "en": "Fake deep, come short"
        }
      }
    ]
  },
  {
    "avain": "y_h8",
    "arkkityyppi": "tilanavaus",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "keskikentta",
    "nimi": {
      "fi": "LEVEYS JA SYVYYS",
      "sv": "SPEL PÅ BREDD OCH DJUP",
      "en": "WIDTH & DEPTH"
    },
    "tilanne": {
      "fi": "joukkue hyökkää – tilat luodaan yhdessä.",
      "sv": "laget anfaller – ytor skapas tillsammans.",
      "en": "the team attacks – space is created together."
    },
    "pelaajat": [
      {
        "id": "C",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 50,
        "y": 64,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "W1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 9,
        "y": 58
      },
      {
        "id": "W2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 91,
        "y": 58
      },
      {
        "id": "D",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 40,
        "korostus": true
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "ref": "D"
        },
        "to": {
          "x": 50,
          "y": 26
        }
      },
      {
        "id": "m2",
        "tyyppi": "juoksu",
        "from": {
          "ref": "W2"
        },
        "to": {
          "x": 91,
          "y": 42
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 30,
        "y": 70,
        "t": {
          "fi": "Leveys + syvyys avaa tilaa",
          "sv": "Bredd + djup öppnar ytor",
          "en": "Width + depth open space"
        }
      }
    ]
  },
  {
    "avain": "y_h9",
    "arkkityyppi": "viimeistely",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "hyokkayskolmannes",
    "nimi": {
      "fi": "VIIMEISTELY",
      "sv": "AVSLUT",
      "en": "FINISHING"
    },
    "tilanne": {
      "fi": "maali on näköpiirissä – hyökkäys on viimeisteltävä.",
      "sv": "målet är inom synhåll – anfallet ska avslutas.",
      "en": "the goal is in sight – the attack must be finished."
    },
    "pelaajat": [
      {
        "id": "A",
        "joukkue": "oma",
        "rooli": "syöttäjä",
        "x": 50,
        "y": 18,
        "pallo": true,
        "korostus": true
      },
      {
        "id": "S",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 32,
        "y": 22
      },
      {
        "id": "MV",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 6,
        "gk": true
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "laukaus",
        "from": {
          "ref": "A"
        },
        "to": {
          "x": 46,
          "y": 1
        }
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 62,
        "y": 16,
        "t": {
          "fi": "Viimeistele, katse maaliin",
          "sv": "Avsluta, blicken mot mål",
          "en": "Finish, eyes on goal"
        }
      }
    ]
  },
  {
    "avain": "y_p1",
    "arkkityyppi": "1v1_puolustus",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "puolustuskolmannes",
    "nimi": {
      "fi": "1v1-PUOLUSTAMINEN",
      "sv": "1v1-FÖRSVARSSPEL",
      "en": "1v1 DEFENDING"
    },
    "tilanne": {
      "fi": "pallollinen vastassa – puolustuspelin peruskivi.",
      "sv": "bollhållare emot sig – försvarsspelets grundsten.",
      "en": "a ball carrier in front of you – the cornerstone of defending."
    },
    "pelaajat": [
      {
        "id": "D",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 57,
        "korostus": true
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 43,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 68,
        "y": 40
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "ref": "D"
        },
        "to": {
          "x": 50,
          "y": 50
        }
      }
    ],
    "peittovarjot": [
      {
        "id": "pv1",
        "from": "D",
        "to": "A2"
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 30,
        "y": 54,
        "t": {
          "fi": "Hidasta, ohjaa laidalle",
          "sv": "Fördröj, styr mot kanten",
          "en": "Delay, show to the touchline"
        }
      }
    ]
  },
  {
    "avain": "y_p2",
    "arkkityyppi": "merkinta",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "puolustuskolmannes",
    "nimi": {
      "fi": "MERKINTÄ",
      "sv": "MARKERING",
      "en": "MARKING"
    },
    "tilanne": {
      "fi": "oma vastustaja ilman palloa – merkintä on valmiutta, ei paikallaan seisomista.",
      "sv": "egen motståndare utan boll – markering handlar om beredskap.",
      "en": "your opponent off the ball – marking is readiness, not standing still."
    },
    "pelaajat": [
      {
        "id": "D",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 52,
        "avoin": -90,
        "korostus": true
      },
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 46,
        "y": 40
      },
      {
        "id": "BC",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 26,
        "y": 36,
        "pallo": true
      }
    ],
    "liikkeet": [],
    "selitteet": [
      {
        "id": "s1",
        "x": 62,
        "y": 48,
        "t": {
          "fi": "Goal-side, näe pallo + pelaaja",
          "sv": "Goal-side, se boll + spelare",
          "en": "Goal-side, see ball + player"
        }
      }
    ]
  },
  {
    "avain": "y_p3",
    "arkkityyppi": "puolustustuki",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "puolustuskolmannes",
    "nimi": {
      "fi": "TUKI PUOLUSTUSPELISSÄ",
      "sv": "UNDERSTÖD I FÖRSVARSSPEL",
      "en": "DEFENSIVE COVER"
    },
    "tilanne": {
      "fi": "joukkuekaveri prässää – sinä olet vakuutus.",
      "sv": "lagkamraten sätter press – du är försäkringen.",
      "en": "your teammate presses – you are the insurance."
    },
    "pelaajat": [
      {
        "id": "A",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 50,
        "y": 42,
        "pallo": true
      },
      {
        "id": "D1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 50,
        "y": 53
      },
      {
        "id": "D2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 38,
        "y": 63,
        "korostus": true
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "ref": "D1"
        },
        "to": {
          "x": 50,
          "y": 47
        }
      }
    ],
    "peittovarjot": [
      {
        "id": "pv1",
        "from": "D1",
        "to": "A"
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 22,
        "y": 60,
        "t": {
          "fi": "Tue prässääjää, ota syvyys",
          "sv": "Stötta pressaren, ge djup",
          "en": "Cover the presser, hold depth"
        }
      }
    ]
  },
  {
    "avain": "y_p4",
    "arkkityyppi": "tilanpuolustus",
    "suunta": "ylos",
    "pelimuoto": "8v8",
    "nakyma": "puolustuskolmannes",
    "nimi": {
      "fi": "TILAN PUOLUSTAMINEN JA MERKINNÄN LUOVUTUS",
      "sv": "FÖRSVARA YTA OCH ÖVERLÄMNING AV MARKERING",
      "en": "DEFENDING SPACE & HANDOVER"
    },
    "tilanne": {
      "fi": "vastustajat vaihtavat paikkoja – vastuu koskee tilaa, ei vain pelaajaa.",
      "sv": "motståndarna byter positioner – ansvaret gäller ytan.",
      "en": "opponents swap positions – responsibility is the space, not just the player."
    },
    "pelaajat": [
      {
        "id": "A1",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 40,
        "y": 40,
        "pallo": true
      },
      {
        "id": "A2",
        "joukkue": "vastustaja",
        "rooli": "paine",
        "x": 60,
        "y": 40
      },
      {
        "id": "D1",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 42,
        "y": 55
      },
      {
        "id": "D2",
        "joukkue": "oma",
        "rooli": "vaihtoehto",
        "x": 60,
        "y": 55,
        "korostus": true
      }
    ],
    "liikkeet": [
      {
        "id": "m1",
        "tyyppi": "juoksu",
        "from": {
          "ref": "A1"
        },
        "to": {
          "x": 62,
          "y": 46
        }
      },
      {
        "id": "m2",
        "tyyppi": "juoksu",
        "from": {
          "ref": "A2"
        },
        "to": {
          "x": 40,
          "y": 46
        }
      }
    ],
    "korkeuslinjat": [
      {
        "id": "k1",
        "y": 50
      }
    ],
    "selitteet": [
      {
        "id": "s1",
        "x": 24,
        "y": 62,
        "t": {
          "fi": "Puolusta tilaa, luovuta merkintä",
          "sv": "Försvara ytan, lämna över",
          "en": "Defend the space, hand over"
        }
      }
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) module.exports = { TM_KAAVIO_KANON: TM_KAAVIO_KANON };
if (typeof window !== 'undefined') window.TM_KAAVIO_KANON = TM_KAAVIO_KANON;
