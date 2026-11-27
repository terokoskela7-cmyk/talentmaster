# Omalta palvelimelta ladattavat fontit (D11, lukittu 5.10.2026)

Alaikäisten IP-osoitteet eivät saa mennä Googlelle → fontit EIVÄT tule Google Fontsista vaan tästä kansiosta.

| Tiedosto | Lähde | Huom |
|---|---|---|
| `archivo-latin-wdth-normal.woff2` | npm `@fontsource-variable/archivo@5.3.0` (`files/archivo-latin-wdth-normal.woff2`) | YKSI muuttuva tiedosto, akselit wght 100–900 + wdth 62–125 %; latin-osajoukko (U+0000–00FF → ä, ö, å). Käyttö: Pelaaja_v7 + Vanhempi_v2 (pelaaja-app: Archivo display, muualla Cormorant). |
| `archivo-OFL-LICENSE.txt` | sama paketti | SIL Open Font License |

Päivitys: `npm pack @fontsource-variable/archivo`, kopioi sama tiedostonimi, nosta SW-cachet (sw_pelaaja.js, sw_vanhempi.js).

## Pelaaja_v7:n muut fontit (perf-PR, 26.11.2026)

Pelaaja ei enää lataa mitään Google Fontsista (aiemmin Cormorant, DM Sans, DM Mono, Barlow Condensed → Googlen CSS + gstatic). Kaikki latin-osajoukkoina (ä ö å), `@font-face` inline Pelaaja_v7:n `<style>`issa, `font-display:swap`.

| Tiedosto | Paketti (5.3.0) | Huom |
|---|---|---|
| `cormorant-garamond-latin-wght-{normal,italic}.woff2` | `@fontsource-variable/cormorant-garamond` | muuttuva wght 300–700 |
| `dm-sans-latin-wght-normal.woff2` | `@fontsource-variable/dm-sans` | muuttuva wght; preload Pelaajan `<head>`issa |
| `dm-mono-latin-{400,500}-normal.woff2` | `@fontsource/dm-mono` | |
| `barlow-condensed-latin-{700,800,900}-normal.woff2` | `@fontsource/barlow-condensed` | |
| `*-OFL-LICENSE.txt` | samat paketit | SIL OFL |

Vanhempi_v2, Master, VP ym. käyttävät yhä Google Fontsia — omat PR:t.
