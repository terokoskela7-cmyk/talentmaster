/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  'vanhempi.vahvista_sahkoposti_yleinen',   // email_verified (a), sv-erä 97 PM:lle
  // Tyhjä 15.10.2026: sv-erä 54 (suostumus.* 24 riviä) vietiin scripts/i18n_vie_sv_era54.cjs:llä. Uusi avain → fi + en, sv Geminiltä → lisää tähän kunnes sv saapuu.
];
