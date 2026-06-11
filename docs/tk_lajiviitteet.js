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
if (typeof module !== 'undefined') module.exports = { TK_LAJIVIITTEET };
