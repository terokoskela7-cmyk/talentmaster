/* ════════════════════════════════════════════════════════════════════════
   tm_mittaukset_fi.js — K4c (erä 83): "Kaikki mittaukset" -sheetin FI-tekstit (avaimet mk_*). Erillään logiikasta (lib ≤ ~500 riviä).
   Osa teksteistä tulee K4a:n avaimista (tc_*: osioiden ja testien nimet, tyhjät tilat, lähteet, Kehon valmiuden alueet) — YKSI paikka, ei kopioita.
   sv: Gemini-erä 83 (docs/i18n/sv_kaannoserae_83_gemini.json) → lib/tm_lib_i18n.js; sv-arvot kirjoittaa PM, ei Code (CLAUDE.md §0). Dual-export: module.exports || window.TM_MITTAUKSET_FI.
════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';
  var FI = {
    mk_otsikko: 'Kaikki mittaukset', kn_kaikki: 'Näytä kaikki mittaukset', mk_aria_sheet: 'Kaikki mittaukset: {nimi}', mk_takaisin: 'Profiili', mk_ika_v: '{n} v',
    mk_suodatin_aria: 'Aikaväli', mk_kausi: 'Tämä kausi', mk_kaikki: 'Kaikki', mk_osiot_aria: 'Osiot',
    mk_ei_kaudella: 'Ei mittauksia tällä kaudella. Valitse Kaikki, niin näet aiemmat mittaukset.',
    mk_c_testi: 'Testi', mk_c_viimeisin: 'Viimeisin', mk_c_taso: 'Taso', mk_c_edellinen: 'Edellinen', mk_c_muutos: 'Muutos', mk_c_paiva: 'Päivä', mk_c_mittauksia: 'Mittauksia',
    mk_c_ulottuvuus: 'Ulottuvuus', mk_c_tulos: 'Tulos', mk_c_lahde: 'Lähde', mk_c_valmentaja: 'Valmentajat', mk_c_vp: 'VP',
    mk_n_mittaus: '{n} mittaus', mk_n_mittausta: '{n} mittausta', mk_yli3: 'yli 3 kk', mk_yli6: 'yli 6 kk', mk_paiva_puuttuu: 'päivä puuttuu',
    mk_muutos_up: 'parani', mk_muutos_down: 'huononi', mk_muutos_flat: 'ei muutosta', mk_muutos_ei: 'ei vertailua',
    mk_avaa_historia: 'Avaa historia: {nimi}', mk_historia_otsikko: 'Mittaushistoria', mk_kayra_aria: 'Kehityskäyrä: {nimi}',
    mk_pienempi_parempi: 'Pienempi aika on parempi', mk_suurempi_parempi: 'Suurempi tulos on parempi', mk_akseli_parempi: 'parempi', mk_akseli_heikompi: 'heikompi',
    mk_edellinen_rivi: 'Edellinen {raaka} · {n}', mk_taso_testihetki: 'Taso on laskettu mittaushetken iästä.',
    mk_ei_tasoa: 'ei tasoa', mk_lahde: 'Lähde: {lahde}',
    mk_kasvu_tyhja: 'Ei kasvumittauksia', mk_kasvu_tyhja_ohje: 'Kasvumittaus kertoo, missä vaiheessa pelaajan kasvu on. Sen avulla fysiikkatestit tulkitaan oikein.',
    mk_p_keskiarvo: 'Keskiarvo', mk_p_lukittu: 'ei arvioida tällä portaalla', mk_p_lukko: 'Arvioi ensin: näet muiden arviot oman tallennuksen jälkeen ({n} tässä kuussa).',
    mk_p_meta: '{maara} · viimeisin {pvm}', mk_arvioija: 'Arvioija', mk_p_oma: 'Pelaajan oma arvio ja valmentajien erot näkyvät kehityskeskustelussa',
    mk_d3_otsikko: 'Psyykkinen arvio', mk_d3_ohje: 'Valmentajan ja VP:n arvio asteikolla 1–5.', mk_d3_tyhja: 'Psyykkistä arviota ei ole vielä tehty.',
    mk_k_tuki: 'Eniten tukea: {alue} · näkyy {missa}',
    mk_i_aria: 'Mitä tämä tarkoittaa?',
    mk_i_taso: 'Taso kertoo, missä pelaaja on ikäistensä joukossa mittaushetkellä. Pisteet ovat testin oman asteikon mukaan, esimerkiksi 4 / 5. Puolikas piste näkyy kuten 4,5.',
    mk_i_muutos: 'Muutos vertaa viimeisintä mittausta edelliseen. Nuoli ylös tarkoittaa parempaa tulosta, myös aikatesteissä, joissa pienempi aika on parempi. Väri näkyy vain, kun tulos parani.',
    mk_i_paiva: 'Merkintä "yli 3 kk" tai "yli 6 kk" kertoo, että viimeisin mittaus alkaa olla vanha. Uusi mittaus antaa luotettavamman kuvan.',
    mk_i_peli: 'Pelihavainnot ovat valmentajien arvioita pelitilanteista asteikolla 1–3. Muiden arvioijien omat arviot näkyvät vasta, kun olet itse arvioinut tässä kuussa.',
    mk_i_keho: 'Kehon valmius on pelaajan liikehallinnan ja kehon kantokyvyn mittaus. Prosentti muutetaan viiden pisteen asteikolle.'
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = FI; else root.TM_MITTAUKSET_FI = FI;
})(typeof window !== 'undefined' ? window : this);
