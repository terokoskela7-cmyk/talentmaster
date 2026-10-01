/* sv-ODOTUSLISTA (lib/tm_lang.js). Claude/Code ei kirjoita ruotsia (CLAUDE.md §0) — uudet avaimet
   tehdään fi + en, sv tulee Geminin kautta. Kattavuustestit ohittavat VAIN nämä avaimet;
   tests/tm_lang_sv_odotuslista.test.js varmistaa, että lista on elävä (sv saapui → poista rivi). */
module.exports = [
  // Tyhjä 1.10.2026: Gemini-ruotsinnokset vietiin tm_lang.js:ään (Claude outputs/sv_kaannokset_2026-10-01.json).
  // Korttisivun otsikko (seuran kielellä tulostettavat kortit, 1.10.2026)
  'seura.kortit_otsikko',
  // EI VIETY (1.10.2026): Geminin sv käyttää {gen}-muuttujaa, jonka koodi täyttää SUOMEN genetiivillä
  // (_genetiivi → "Topiaksen") ja jota V1-B2-sääntö kieltää sv/en-teksteissä. Odottaa Teron/Geminin uutta versiota.
  'vanhempi.kirj_jakoteksti',
  // Kortti + PIN-vihje (1.10.2026)
  'pelaaja.pin4_vihje',
];
