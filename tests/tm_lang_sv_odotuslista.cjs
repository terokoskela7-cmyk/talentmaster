/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // Tyhjä 8.10.2026 (PR 5): Gemini-erä 2 (sv_kaannoserae_2.json, 418 tm_lang-riviä) vietiin scripts/i18n_vie_sv_era2.cjs:llä.
  // Uusi avain → fi + en, sv Geminiltä → lisää rivi tähän kunnes sv saapuu.
  // sv-erä 3 (10.10.2026): vanhempi.vahvista_* (10) ja huoltajakutsu.* (14) vietiin scripts/i18n_vie_sv_era3.cjs:llä — lista tyhjä.
];
