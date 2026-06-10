// TK_LAJIVIITTEET — per-laji viitetasot.
// Lähteet: _lahde 'valtakunnallinen' = loppukilpailut 2023–2025 (84 riviä, summavalidointi 0 virhettä)
//          _lahde 'alueellinen'      = alueelliset kilpailut: Eteläinen 2025 (FC Lahti + TuPS) +
//                                      Pohjoinen 2024 (ONS) — top-20 kokonaisajalla per ikä/sp.
//          P8, P11 ja 13-v eivät ole valtakunnallisissa → alueellinen lähde (TKI_ANALYYSIMALLI.md §8.7).
// erinomainen = kohortin P25 · hyva = P50 · kehitettävä = > hyva. pituuspotku_bonus: SUUREMPI=parempi (P75/P50).
// EI MITALI — mitali jaetaan vain kokonaisajasta (CLAUDE.md §31). kuljetus_laukaus = NETTO.
// EI interpolointia puuttuville ikäluokille — radat ovat ikäluokkakohtaisia.
const TK_LAJIVIITTEET = {
  P: {
    8: { // n=20, alueelliset 2024–25, top-20
      syotto: { erinomainen: 29.5, hyva: 31.4 },
      pujottelu: { erinomainen: 32.5, hyva: 34.5 },
      ponnauttelu: { erinomainen: 6.2, hyva: 8.0 },
      kuljetus_laukaus: { erinomainen: 20.2, hyva: 24.7 },
      _n: 20, _lahde: 'alueellinen',
    },
    9: { // n=16, vuodet 2023+2024+2025
      syotto: { erinomainen: 23.0, hyva: 23.7 },
      pujottelu: { erinomainen: 27.4, hyva: 28.3 },
      ponnauttelu: { erinomainen: 5.1, hyva: 6.2 },
      kuljetus_laukaus: { erinomainen: 16.8, hyva: 18.5 },
      _n: 16, _lahde: 'valtakunnallinen',
    },
    10: { // n=8, vuodet 2023+2024+2025
      syotto: { erinomainen: 36.4, hyva: 37.2 },
      pujottelu: { erinomainen: 25.7, hyva: 26.2 },
      ponnauttelu: { erinomainen: 12.1, hyva: 13.1 },
      kuljetus_laukaus: { erinomainen: 10.7, hyva: 13.8 },
      _n: 8, _lahde: 'valtakunnallinen',
    },
    11: { // n=20, alueelliset 2024–25, top-20
      syotto: { erinomainen: 36.2, hyva: 38.5 },
      pujottelu: { erinomainen: 26.4, hyva: 26.8 },
      ponnauttelu: { erinomainen: 21.9, hyva: 27.4 },
      kuljetus_laukaus: { erinomainen: 15.2, hyva: 16.9 },
      _n: 20, _lahde: 'alueellinen',
    },
    12: { // n=12, vuodet 2023+2024+2025
      syotto: { erinomainen: 34.0, hyva: 34.8 },
      pujottelu: { erinomainen: 24.2, hyva: 24.9 },
      ponnauttelu: { erinomainen: 15.2, hyva: 16.2 },
      kuljetus_laukaus: { erinomainen: 13.5, hyva: 14.5 },
      pituuspotku_bonus: { erinomainen: 13.2, hyva: 12.4 },
      _n: 12, _lahde: 'valtakunnallinen',
    },
    13: { // n=7, alueelliset 2024–25, top-20
      syotto: { erinomainen: 35.5, hyva: 36.8 },
      pujottelu: { erinomainen: 24.0, hyva: 25.3 },
      ponnauttelu: { erinomainen: 17.0, hyva: 19.8 },
      kuljetus_laukaus: { erinomainen: 11.5, hyva: 12.6 },
      pituuspotku_bonus: { erinomainen: 14.7, hyva: 12.8 },
      _n: 7, _lahde: 'alueellinen',
    },
  },
  T: {
    8: { // n=18, alueelliset 2024–25, top-20
      syotto: { erinomainen: 35.1, hyva: 38.5 },
      pujottelu: { erinomainen: 36.3, hyva: 40.0 },
      ponnauttelu: { erinomainen: 8.6, hyva: 11.1 },
      kuljetus_laukaus: { erinomainen: 27.3, hyva: 29.9 },
      _n: 18, _lahde: 'alueellinen',
    },
    9: { // n=18, vuodet 2023+2024+2025
      syotto: { erinomainen: 25.8, hyva: 27.0 },
      pujottelu: { erinomainen: 29.3, hyva: 30.7 },
      ponnauttelu: { erinomainen: 7.7, hyva: 10.0 },
      kuljetus_laukaus: { erinomainen: 23.1, hyva: 24.4 },
      _n: 18, _lahde: 'valtakunnallinen',
    },
    10: { // n=13, vuodet 2023+2024+2025
      syotto: { erinomainen: 44.3, hyva: 44.6 },
      pujottelu: { erinomainen: 28.9, hyva: 30.3 },
      ponnauttelu: { erinomainen: 6.1, hyva: 6.6 },
      kuljetus_laukaus: { erinomainen: 20.9, hyva: 22.5 },
      _n: 13, _lahde: 'valtakunnallinen',
    },
    11: { // n=8, vuodet 2023+2024+2025
      syotto: { erinomainen: 39.9, hyva: 41.2 },
      pujottelu: { erinomainen: 26.6, hyva: 27.4 },
      ponnauttelu: { erinomainen: 13.2, hyva: 15.1 },
      kuljetus_laukaus: { erinomainen: 14.7, hyva: 17.4 },
      _n: 8, _lahde: 'valtakunnallinen',
    },
    12: { // n=7, vuodet 2023+2025
      syotto: { erinomainen: 36.5, hyva: 37.0 },
      pujottelu: { erinomainen: 25.8, hyva: 26.7 },
      ponnauttelu: { erinomainen: 19.5, hyva: 22.0 },
      kuljetus_laukaus: { erinomainen: 13.4, hyva: 16.4 },
      pituuspotku_bonus: { erinomainen: 12.2, hyva: 10.8 },
      _n: 7, _lahde: 'valtakunnallinen',
    },
    13: { // n=11, alueelliset 2024–25, top-20
      syotto: { erinomainen: 34.0, hyva: 35.3 },
      pujottelu: { erinomainen: 24.6, hyva: 25.4 },
      ponnauttelu: { erinomainen: 17.4, hyva: 19.5 },
      kuljetus_laukaus: { erinomainen: 11.0, hyva: 14.3 },
      pituuspotku_bonus: { erinomainen: 13.4, hyva: 12.4 },
      _n: 11, _lahde: 'alueellinen',
    },
  },
};
