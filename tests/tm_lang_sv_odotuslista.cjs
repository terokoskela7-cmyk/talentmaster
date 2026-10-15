/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // Sibbo-reititys 15.10.2026: suostumuslomakkeen uudet avaimet joille sv ei vielä ole (erä 54)
  'suostumus.virhe_pakolliset',
  'suostumus.tallennetaan',
  'suostumus.kutsu_alku',
  'suostumus.kutsu_seuralta',
  'suostumus.kuitti_tunnus',
  'suostumus.kuitti_nimi',
  'suostumus.kuitti_seura',
  'suostumus.kuitti_joukkue',
  'suostumus.kuitti_vuotta',
  'suostumus.kuitti_suostumukset',
  'suostumus.kuitti_aikaleima',
  'suostumus.kuitti_tallennettu',
  'suostumus.kuitti_rekisteriin',
  'suostumus.kuitti_tila',
  'suostumus.tunnukset_lahetetty',
  'suostumus.osoitteeseen',
  'suostumus.sahkopostiisi',
  'suostumus.linkki_7pv_loppu',
  'suostumus.linkki_1h',
  'suostumus.linkki_vanhemman_sivu',
  'suostumus.linkki_unohdin',
  'suostumus.lahetys_virhe_loppu',
  'suostumus.pyyda_seuraa',
  'suostumus.tallennus_virhe',
  // Tyhjä 8.10.2026 (PR 5): Gemini-erä 2 (sv_kaannoserae_2.json, 418 tm_lang-riviä) vietiin scripts/i18n_vie_sv_era2.cjs:llä.
  // Uusi avain → fi + en, sv Geminiltä → lisää rivi tähän kunnes sv saapuu.
  // sv-erä 3 (10.10.2026): vanhempi.vahvista_* (10) ja huoltajakutsu.* (14) vietiin scripts/i18n_vie_sv_era3.cjs:llä — lista tyhjä.
];
