// TK_LAJIVIITTEET — per-laji viitetasot.
// Lähteet: _lahde 'valtakunnallinen' = loppukilpailut 2023–2025 (PDF, summavalidointi 0 virhettä)
//          _lahde 'alueellinen'      = alueelliset kilpailut 2023–2025 (Palloliiton tuloskooste,
//                                      ~60 kilpailua / 4 aluetta) — top-20 kokonaisajalla per ikä/sp,
//                                      dedup per pelaaja, summavalidointi + järkevyyssuodatus.
//          P8, P11 ja 13-v eivät ole valtakunnallisissa → alueellinen lähde (TKI_ANALYYSIMALLI.md §8.7).
// erinomainen = kohortin P25 · hyva = P50 · kehitettävä = > hyva. pituuspotku_bonus: SUUREMPI=parempi (P75/P50).
// EI MITALI — mitali jaetaan vain kokonaisajasta (CLAUDE.md §31). kuljetus_laukaus = NETTO.
// EI interpolointia puuttuville ikäluokille — radat ovat ikäluokkakohtaisia.
// Generointi: docs/data/parse_taitokisa_csv.py (vuosipäivitys: lisää uusi vuosi-CSV → aja uudelleen).
const TK_LAJIVIITTEET = {
  P: {
    8: { // n=20 (pool 433), alueelliset 2023–25, top-20
      syotto: { erinomainen: 23.2, hyva: 24.9 },
      pujottelu: { erinomainen: 29.2, hyva: 30.2 },
      ponnauttelu: { erinomainen: 5.1, hyva: 6.5 },
      kuljetus_laukaus: { erinomainen: 16.2, hyva: 16.6 },
      _n: 20, _lahde: 'alueellinen',
    },
    9: { // n=16, loppukilpailut [2023, 2024, 2025]
      syotto: { erinomainen: 23.0, hyva: 23.7 },
      pujottelu: { erinomainen: 27.4, hyva: 28.3 },
      ponnauttelu: { erinomainen: 5.1, hyva: 6.2 },
      kuljetus_laukaus: { erinomainen: 16.8, hyva: 18.5 },
      _n: 16, _lahde: 'valtakunnallinen',
    },
    10: { // n=8, loppukilpailut [2023, 2024, 2025]
      syotto: { erinomainen: 36.4, hyva: 37.2 },
      pujottelu: { erinomainen: 25.7, hyva: 26.2 },
      ponnauttelu: { erinomainen: 12.1, hyva: 13.1 },
      kuljetus_laukaus: { erinomainen: 10.7, hyva: 13.8 },
      _n: 8, _lahde: 'valtakunnallinen',
    },
    11: { // n=20 (pool 410), alueelliset 2023–25, top-20
      syotto: { erinomainen: 36.2, hyva: 37.5 },
      pujottelu: { erinomainen: 25.7, hyva: 26.4 },
      ponnauttelu: { erinomainen: 16.8, hyva: 21.1 },
      kuljetus_laukaus: { erinomainen: 12.5, hyva: 14.1 },
      _n: 20, _lahde: 'alueellinen',
    },
    12: { // n=12, loppukilpailut [2023, 2024, 2025]
      syotto: { erinomainen: 34.0, hyva: 34.8 },
      pujottelu: { erinomainen: 24.2, hyva: 24.9 },
      ponnauttelu: { erinomainen: 15.2, hyva: 16.2 },
      kuljetus_laukaus: { erinomainen: 13.5, hyva: 14.5 },
      pituuspotku_bonus: { erinomainen: 13.2, hyva: 12.4 },
      _n: 12, _lahde: 'valtakunnallinen',
    },
    13: { // n=20 (pool 176), alueelliset 2023–25, top-20
      syotto: { erinomainen: 34.6, hyva: 35.6 },
      pujottelu: { erinomainen: 24.8, hyva: 25.3 },
      ponnauttelu: { erinomainen: 17.8, hyva: 19.1 },
      kuljetus_laukaus: { erinomainen: 11.3, hyva: 12.3 },
      pituuspotku_bonus: { erinomainen: 14.6, hyva: 13.2 },
      _n: 20, _lahde: 'alueellinen',
    },
  },
  T: {
    8: { // n=20 (pool 139), alueelliset 2023–25, top-20
      syotto: { erinomainen: 28.9, hyva: 30.6 },
      pujottelu: { erinomainen: 32.7, hyva: 35.0 },
      ponnauttelu: { erinomainen: 6.9, hyva: 8.7 },
      kuljetus_laukaus: { erinomainen: 24.1, hyva: 25.8 },
      _n: 20, _lahde: 'alueellinen',
    },
    9: { // n=18, loppukilpailut [2023, 2024, 2025]
      syotto: { erinomainen: 25.8, hyva: 27.0 },
      pujottelu: { erinomainen: 29.3, hyva: 30.7 },
      ponnauttelu: { erinomainen: 7.7, hyva: 10.0 },
      kuljetus_laukaus: { erinomainen: 23.1, hyva: 24.4 },
      _n: 18, _lahde: 'valtakunnallinen',
    },
    10: { // n=13, loppukilpailut [2023, 2024, 2025]
      syotto: { erinomainen: 44.3, hyva: 44.6 },
      pujottelu: { erinomainen: 28.9, hyva: 30.3 },
      ponnauttelu: { erinomainen: 6.1, hyva: 6.6 },
      kuljetus_laukaus: { erinomainen: 20.9, hyva: 22.5 },
      _n: 13, _lahde: 'valtakunnallinen',
    },
    11: { // n=8, loppukilpailut [2023, 2024, 2025]
      syotto: { erinomainen: 39.9, hyva: 41.2 },
      pujottelu: { erinomainen: 26.6, hyva: 27.4 },
      ponnauttelu: { erinomainen: 13.2, hyva: 15.1 },
      kuljetus_laukaus: { erinomainen: 14.7, hyva: 17.4 },
      _n: 8, _lahde: 'valtakunnallinen',
    },
    12: { // n=7, loppukilpailut [2023, 2025]
      syotto: { erinomainen: 36.5, hyva: 37.0 },
      pujottelu: { erinomainen: 25.8, hyva: 26.7 },
      ponnauttelu: { erinomainen: 19.5, hyva: 22.0 },
      kuljetus_laukaus: { erinomainen: 13.4, hyva: 16.4 },
      pituuspotku_bonus: { erinomainen: 12.2, hyva: 10.8 },
      _n: 7, _lahde: 'valtakunnallinen',
    },
    13: { // n=20 (pool 144), alueelliset 2023–25, top-20
      syotto: { erinomainen: 34.8, hyva: 37.0 },
      pujottelu: { erinomainen: 24.6, hyva: 25.6 },
      ponnauttelu: { erinomainen: 17.4, hyva: 19.4 },
      kuljetus_laukaus: { erinomainen: 14.1, hyva: 15.9 },
      pituuspotku_bonus: { erinomainen: 13.2, hyva: 11.8 },
      _n: 20, _lahde: 'alueellinen',
    },
  },
};

// TK_LAJITASOT — populaatiotasot 1–5 KOKO kilpailupoolista (ei top-20).
// Rajat = kohortin P20/P40/P60/P80. taso 5 = paras 20 % · taso 3 = kohortin keskitaso · taso 1 = hitain 20 %.
// Logiikka STRICT <: taso=5 jos arvo<r[0], 4 jos <r[1], 3 jos <r[2], 2 jos <r[3], muuten 1
// (tasan rajalla alempi taso — sama konventio kuin tkLaskeMerkki; maksimiajat 40/60 s → taso 1).
// Otos = kilpailuihin osallistuneet (kilpailukohortti, EI väestönormi) — dokumentoi UI:ssa.
// Käyttö: valmentaja/VP + D2/OVR-input. Pelaajalle EI tasolukua (§7.22).
// H-H pujottelu/syöttö arvioidaan FINAL2024-normilla, TK-tulos näillä — ei ristiin (§30).
const TK_LAJITASOT = {
  P: {
    8: { // pooli n=433
      syotto: [29.6, 32.6, 36.6, 43.6],
      pujottelu: [33.5, 35.9, 39.0, 43.1],
      ponnauttelu: [7.9, 10.0, 13.2, 21.8],
      kuljetus_laukaus: [22.1, 26.0, 29.0, 33.0],
      _n: 433,
    },
    9: { // pooli n=459
      syotto: [25.9, 29.0, 32.1, 38.0],
      pujottelu: [30.5, 32.5, 35.4, 38.6],
      ponnauttelu: [11.1, 16.0, 24.9, 40.0],
      kuljetus_laukaus: [22.0, 25.0, 27.4, 30.9],
      _n: 459,
    },
    10: { // pooli n=490
      syotto: [44.1, 48.0, 53.7, 60.0],
      pujottelu: [29.2, 31.0, 33.0, 35.2],
      ponnauttelu: [28.7, 40.0, 40.0, 40.0],
      kuljetus_laukaus: [20.0, 23.1, 25.9, 29.0],
      _n: 490,
    },
    11: { // pooli n=410
      syotto: [42.2, 45.9, 49.6, 56.3],
      pujottelu: [28.0, 29.7, 31.3, 33.7],
      ponnauttelu: [37.4, 40.0, 40.0, 40.0],
      kuljetus_laukaus: [18.2, 21.0, 23.5, 27.6],
      _n: 410,
    },
    12: { // pooli n=309
      syotto: [39.3, 42.0, 46.3, 50.6],
      pujottelu: [26.9, 28.2, 29.9, 31.8],
      ponnauttelu: [29.0, 40.0, 40.0, 40.0],
      kuljetus_laukaus: [15.9, 18.8, 21.1, 24.6],
      _n: 309,
    },
    13: { // pooli n=176
      syotto: [38.8, 41.0, 44.0, 50.1],
      pujottelu: [26.7, 28.0, 29.2, 32.2],
      ponnauttelu: [25.9, 35.0, 40.0, 40.0],
      kuljetus_laukaus: [15.0, 18.1, 21.0, 25.0],
      _n: 176,
    },
  },
  T: {
    8: { // pooli n=139
      syotto: [33.8, 37.7, 41.9, 46.4],
      pujottelu: [37.0, 40.5, 42.2, 48.8],
      ponnauttelu: [9.6, 13.2, 22.0, 35.6],
      kuljetus_laukaus: [26.1, 28.3, 31.4, 34.3],
      _n: 139,
    },
    9: { // pooli n=204
      syotto: [29.8, 32.9, 36.3, 42.5],
      pujottelu: [33.6, 36.0, 38.8, 42.7],
      ponnauttelu: [17.7, 26.0, 40.0, 40.0],
      kuljetus_laukaus: [25.4, 27.7, 30.1, 33.1],
      _n: 204,
    },
    10: { // pooli n=203
      syotto: [48.7, 53.0, 56.5, 60.0],
      pujottelu: [31.3, 33.5, 35.5, 37.5],
      ponnauttelu: [11.3, 16.3, 26.2, 40.0],
      kuljetus_laukaus: [23.5, 25.6, 27.7, 30.2],
      _n: 203,
    },
    11: { // pooli n=274
      syotto: [45.1, 48.3, 52.0, 58.7],
      pujottelu: [29.2, 31.1, 32.9, 35.8],
      ponnauttelu: [29.0, 40.0, 40.0, 40.0],
      kuljetus_laukaus: [19.9, 22.7, 25.4, 28.4],
      _n: 274,
    },
    12: { // pooli n=236
      syotto: [41.2, 44.5, 49.7, 54.4],
      pujottelu: [27.8, 29.5, 31.1, 33.4],
      ponnauttelu: [34.5, 40.0, 40.0, 40.0],
      kuljetus_laukaus: [17.5, 19.5, 21.9, 25.4],
      _n: 236,
    },
    13: { // pooli n=144
      syotto: [39.2, 42.7, 46.3, 52.2],
      pujottelu: [27.5, 28.5, 29.9, 32.8],
      ponnauttelu: [31.9, 40.0, 40.0, 40.0],
      kuljetus_laukaus: [15.2, 18.5, 21.3, 24.4],
      _n: 144,
    },
  },
};
if (typeof module !== 'undefined') module.exports = { TK_LAJIVIITTEET, TK_LAJITASOT };
