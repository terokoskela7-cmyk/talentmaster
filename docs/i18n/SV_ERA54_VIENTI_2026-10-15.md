# Sv-erän 54 vienti (15.10.2026)

Kaista: **Tero** (HTML-`?v`, `lib/`, `sw_*.js`, `scripts/`). #1078 mergattiin ennen palautusta, joten vienti on oma PR (origin/mainin päällä). Code ei kirjoita ruotsia (§0): sv kopioitu palautuksesta (`.sv_palautukset/sv_kaannoserae_54_palautus.json` → `docs/i18n/`) merkki merkiltä, vienti verifioitu.

- `scripts/i18n_vie_sv_era54.cjs`: tm_lang suostumus.* 24 → `lib/tm_lang.js` · `lib.tm_harjoitusarviointi` 34 (avain = fi) → `TM_LIB_I18N` · `master_kartta` 3 (ikävaiheet) → `TM_MASTER_I18N` · vientipohja 4 (kuittaus-aliakset `Ändrad`/`Ta bort`… + OHJE-rivi 5) → `scripts/vientipohja_sv.json`. Idempotentti, testi `tests/i18n_era54_vienti.test.js`.
- sv-vientipohja käyttää nyt ruotsinkielisiä kuittaus-näyttöarvoja; tallennettava arvo pysyy OK · Muutettu · Poista (tuonti hyväksyy kummankin).
- Odotuslistat tyhjennetty (`tm_lang_sv_odotuslista.cjs`, `i18n_sv_era_lib.test.js`); kattavuustyökalun odottavat erät = ei yhtään.
- Bumpit: `tm_lang.js` 40→41 (10 sivua) + SW `tm-pelaaja-v106`, `tm-vanhempi-v71` · `tm_lib_i18n.js` 8→9 · `tm_master_i18n.js` 34→35 · lib_versiot-fixturet.
- Testit: `npm test` 521 tiedostoa vihreää (lib-kokokatot nostettu vain tämän viennin verran), lint ok. Baselinea ei päivitetty.
- Kuvat uudelleen: `docs/ui-kuvat/sibbo-sv/04-*`, `04b-*`, `07-*` (lomake ja validointitoast nyt kokonaan sv; vain datan/ruudun staattinen osa suomeksi, ks. alla).

## Kattavuus

## Taulukko

| Näkymä | fi-avaimia | ok | puuttuu sv | odottaa palautusta (lähetetty erä) | palautettu, ei viety koodiin | kovakoodattu (staattinen; sv puuttuu / vain reititys) | kovakoodattu (ajonaik., UI) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Pelaaja_v7 | 718 | 718 | **0** | 0 | 0 | **0** (0 / 0) | 4 (+ data? 3) |
| Vanhempi_v2 | 416 | 416 | **0** | 0 | 0 | **0** (0 / 0) | 7 (+ data? 11) |
| Master_v16 (valmentaja) | 1659 | 1659 | **0** | 0 | 0 | **0** (0 / 0) | 15 (+ data? 16) |
| VP_v25 | 3328 | 3328 | **0** | 0 | 0 | **0** (0 / 0) | 15 (+ data? 7) |
| ADAR_Pikakortti + Pelihavainto_Kentta | 572 | 572 | **0** | 0 | 0 | **0** (0 / 0) | 1 (+ data? 0) |
| Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP) | 62 | 62 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu) | 114 | 114 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075) | 119 | 119 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Kehitystyöpöytä (Kehitystyopoyta.html) | 158 | 158 | **0** | 0 | 0 | **0** (0 / 0) | – |

_fi-avaimia = tm_lang-ryhmän / lib-FI-karttojen / reititinkartan (masterT, vpT, tmHT, phT) avaimet, jotka näkymä lataa. "odottaa" = rivi on lähetetyssä erässä (ei yhtään: 51 ja 52 vietiin tässä PR:ssä), palautus puuttuu. Sama lib-avain voi näkyä usealla näkymällä._


Harjoitusarviointi, Suostumus ja Kehitystyöpöytä: **ok, puuttuu 0, odottaa 0, kovakoodattu 0**.

## Avoin
Suostumussivun vaihe 1 staattinen markup (otsikko, kenttien nimet, ryhmäotsikot, "Seuraava" …) on edelleen suomeksi → seuraava PR (tm_lang-avaimet, erä 55), kuten sovittu.
