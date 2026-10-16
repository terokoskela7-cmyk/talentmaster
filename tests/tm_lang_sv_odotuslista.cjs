/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // Sibbo-viimeistely 16.10.: tietosuojaikkunan muuttunut + 2 uutta avainta (erä 56; sv Geminiltä, palautus Teron tarkistuksen kautta). Vanha sv poistettu rek_ts_sijainti_teksti:stä (väitti ettei tietoja siirretä EU:n ulkopuolelle).
  'suostumus.rek_ts_sijainti_teksti',
  'suostumus.rek_ts_sailytysaika_90pv',
  'suostumus.rek_ts_koko_otsikko',
  // Tyhjä 15.10.2026: sv-erä 54 (suostumus.* 24 riviä) vietiin scripts/i18n_vie_sv_era54.cjs:llä. Uusi avain → fi + en, sv Geminiltä → lisää tähän kunnes sv saapuu.
];
