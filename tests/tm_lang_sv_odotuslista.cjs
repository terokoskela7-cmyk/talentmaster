/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // Tyhjä 8.10.2026 (PR 5): Gemini-erä 2 (sv_kaannoserae_2.json, 418 tm_lang-riviä) vietiin scripts/i18n_vie_sv_era2.cjs:llä.
  // Uusi avain → fi + en, sv Geminiltä → lisää rivi tähän kunnes sv saapuu.
  // huoltajan sähköpostin vahvistus (Vanhempi_v2; 10.10.2026) — sv Geminiltä:
  'vanhempi.vahvista_sahkoposti',
  'vanhempi.vahvista_sahkoposti_ohje',
  'vanhempi.laheta_vahvistus_uudelleen',
  'vanhempi.olen_vahvistanut',
  'vanhempi.vahvistus_lahetetty',
  'vanhempi.vahvistus_odota',
  'vanhempi.vahvistus_ei_viela',
  'vanhempi.vahvistus_ei_onnistunut',
  'vanhempi.kalenteri_ei_latautunut',
  'vanhempi.yrita_uudelleen',
  // huoltajakutsu (TalentMaster_Huoltajakutsu.html; 10.10.2026) — sv Gemini-erä 3:ssa:
  'huoltajakutsu.avataan',
  'huoltajakutsu.ohjataan',
  'huoltajakutsu.vanhentunut_otsikko',
  'huoltajakutsu.vanhentunut_ohje',
  'huoltajakutsu.laheta_uusi',
  'huoltajakutsu.lahetetty',
  'huoltajakutsu.odota',
  'huoltajakutsu.raja',
  'huoltajakutsu.kaytetty_otsikko',
  'huoltajakutsu.kaytetty_ohje',
  'huoltajakutsu.kirjaudu',
  'huoltajakutsu.ei_loydy_otsikko',
  'huoltajakutsu.ei_loydy_ohje',
  'huoltajakutsu.virhe',
];
