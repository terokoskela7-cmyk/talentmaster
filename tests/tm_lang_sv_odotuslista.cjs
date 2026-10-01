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
  // Tulosta kortit: ikkuna ensin (1.10.2026)
  'seura.kortit_valmistellaan',
  'seura.kortit_luodaan',
  'seura.kortit_qr',
  'seura.kortit_ponnahdus_estetty',
  'seura.kortit_tulosta_nappi',
  'seura.kortit_peruuta',
  'seura.kortit_virhe',
  'seura.kortit_ei_tulostettavaa',
  // Kortti + PIN-vihje (1.10.2026)
  'pelaaja.pin4_vihje',
  // Suostumuslomake: syntymäaika kolmella valikolla (1.10.2026)
  'suostumus.syn_paiva',
  'suostumus.syn_kuukausi',
  'suostumus.syn_vuosi',
  'suostumus.syn_tarkista',
  // Suostumuslomake: vanha linkki ilman pelaajan tunnistetta (Rules v3.33, 2.10.2026)
  'suostumus.pyyda_uusi_kutsu',
  // Suostumuksen uusiminen näkyväksi (2.10.2026)
  'seura.uusinta_vahvistus',
  'suostumus.uusinta_selite',
];
