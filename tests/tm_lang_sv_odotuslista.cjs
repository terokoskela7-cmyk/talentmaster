/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // Kirjautumisen helpotus (30.9.2026)
  'pelaaja.syota_pin_koodisi',
  'pelaaja.kirjaudu_palloidlla',
  'vanhempi.kirj_ohje',
  'vanhempi.kirj_palloid_puuttuu',
  'vanhempi.kirj_jaa_linkki',
  'vanhempi.kirj_avaa_sivu',
  'vanhempi.kirj_jakoteksti',
  'vanhempi.toast_linkki_kopioitu',
  'vanhempi.toast_kopioitu',
  'vanhempi.toast_kopioi_kasin',
  'vanhempi.ikavaihe_v',
  // Lapsenvaihdin (1.10.2026)
  'vanhempi.lapsi_valitse',
  // Pelaaja ilman verkkoa (1.10.2026)
  'pelaaja.ei_yhteytta_kirjaus',
  // Excel-pohja ja tuonnin ohje (1.10.2026)
  'seura.lataa_excel_pohja',
  'seura.tuo_pelaajat_excelista',
  'seura.excel_pohja_ladattu',
  'seura.excel_tuo_nappi',
  'seura.excel_ohje_otsikko',
  'seura.excel_ohje_kuvaus',
  'seura.excel_v1_otsikko',
  'seura.excel_v1_teksti',
  'seura.excel_v1_tagi_asetukset',
  'seura.excel_v1_tagi_esimerkki',
  'seura.excel_v2_otsikko',
  'seura.excel_v2_teksti',
  'seura.excel_tagi_syntymavuosi',
  'seura.excel_tagi_joukkue',
  'seura.excel_v3_otsikko',
  'seura.excel_v3_teksti',
  'seura.excel_v3_tagi_esikatselu',
  'seura.excel_v3_tagi_tuo',
];
