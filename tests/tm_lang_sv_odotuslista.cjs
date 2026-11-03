/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // erä 94 (B9 suostumuksen peruminen, 3.11.2026): sv kirjoittaa PM (.sv_palautukset/), vienti poistaa rivit
  'pelaaja.suostumus_peruttu', 'vanhempi.suostumus_annettu_pvm', 'vanhempi.suostumus_ei_annettu', 'vanhempi.suostumus_otsikko', 'vanhempi.suostumus_peru', 'vanhempi.suostumus_peru_selite', 'vanhempi.suostumus_peru_vahvista', 'vanhempi.suostumus_peru_virhe', 'vanhempi.suostumus_peruttu_koti', 'vanhempi.suostumus_peruttu_ohje', 'vanhempi.suostumus_peruttu_pvm', 'vanhempi.suostumus_peruttu_toast', 'vanhempi.suostumus_peruuta',
  // Tyhjä 15.10.2026: sv-erä 54 (suostumus.* 24 riviä) vietiin scripts/i18n_vie_sv_era54.cjs:llä. Uusi avain → fi + en, sv Geminiltä → lisää tähän kunnes sv saapuu.
];
