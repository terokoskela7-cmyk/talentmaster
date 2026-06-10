// TK_LAJIVIITTEET — per-laji viitetasot valtakunnallisista loppukilpailuista 2023–2025.
// Generoitu automaattisesti PDF-tuloksista (84 riviä, summavalidointi 0 virhettä).
// erinomainen = finalistien P25 · hyva = P50 · kehitettävä = > hyva (ei tallenneta).
// pituuspotku_bonus: SUUREMPI = parempi (erinomainen = P75).
// EI MITALI — mitali jaetaan vain kokonaisajasta (CLAUDE.md §31).
// kuljetus_laukaus = NETTOTULOS (raaka − vähennykset), sama kuin testit.kuljetus_laukaus.tulos.
// P11 puuttuu: n=2 (vain 2023) — ei riittävä otos. Radat ikäluokkakohtaisia -> EI interpolointia.
const TK_LAJIVIITTEET = {
  P: {
    9: { // n=16, vuodet 2023+2024+2025
      syotto: { erinomainen: 23.0, hyva: 23.7 },
      pujottelu: { erinomainen: 27.4, hyva: 28.3 },
      ponnauttelu: { erinomainen: 5.1, hyva: 6.2 },
      kuljetus_laukaus: { erinomainen: 16.8, hyva: 18.5 },
      _n: 16,
    },
    10: { // n=8, vuodet 2023+2024+2025
      syotto: { erinomainen: 36.4, hyva: 37.2 },
      pujottelu: { erinomainen: 25.7, hyva: 26.2 },
      ponnauttelu: { erinomainen: 12.1, hyva: 13.1 },
      kuljetus_laukaus: { erinomainen: 10.7, hyva: 13.8 },
      _n: 8,
    },
    // 11: poistettu — n=2 < 5
    12: { // n=12, vuodet 2023+2024+2025
      syotto: { erinomainen: 34.0, hyva: 34.8 },
      pujottelu: { erinomainen: 24.2, hyva: 24.9 },
      ponnauttelu: { erinomainen: 15.2, hyva: 16.2 },
      kuljetus_laukaus: { erinomainen: 13.5, hyva: 14.5 },
      pituuspotku_bonus: { erinomainen: 13.2, hyva: 12.4 },
      _n: 12,
    },
  },
  T: {
    9: { // n=18, vuodet 2023+2024+2025
      syotto: { erinomainen: 25.8, hyva: 27.0 },
      pujottelu: { erinomainen: 29.3, hyva: 30.7 },
      ponnauttelu: { erinomainen: 7.7, hyva: 10.0 },
      kuljetus_laukaus: { erinomainen: 23.1, hyva: 24.4 },
      _n: 18,
    },
    10: { // n=13, vuodet 2023+2024+2025
      syotto: { erinomainen: 44.3, hyva: 44.6 },
      pujottelu: { erinomainen: 28.9, hyva: 30.3 },
      ponnauttelu: { erinomainen: 6.1, hyva: 6.6 },
      kuljetus_laukaus: { erinomainen: 20.9, hyva: 22.5 },
      _n: 13,
    },
    11: { // n=8, vuodet 2023+2024+2025
      syotto: { erinomainen: 39.9, hyva: 41.2 },
      pujottelu: { erinomainen: 26.6, hyva: 27.4 },
      ponnauttelu: { erinomainen: 13.2, hyva: 15.1 },
      kuljetus_laukaus: { erinomainen: 14.7, hyva: 17.4 },
      _n: 8,
    },
    12: { // n=7, vuodet 2023+2025
      syotto: { erinomainen: 36.5, hyva: 37.0 },
      pujottelu: { erinomainen: 25.8, hyva: 26.7 },
      ponnauttelu: { erinomainen: 19.5, hyva: 22.0 },
      kuljetus_laukaus: { erinomainen: 13.4, hyva: 16.4 },
      pituuspotku_bonus: { erinomainen: 12.2, hyva: 10.8 },
      _n: 7,
    },
  },
};
