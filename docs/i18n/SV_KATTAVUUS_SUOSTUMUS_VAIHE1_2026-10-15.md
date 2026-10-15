# sv-kattavuusraportti — suostumuslomake vaihe 1 (staattinen markup), 15.10.2026

Kaista: **Tero** (HTML + sw). Generoitu `node tools/i18n/sv_kattavuus.mjs --md=…` PR:n jälkeen; uusi staattinen markup-skanneri (`tools/i18n/sv_staattinen_markup.mjs`) mukana suostumusnäkymässä (Rekisterointi_Suostumus.html). **Suostumussivun kovakoodattuja tekstejä: 0** (ennen reititystä markup-skanneri: 71 → ks. PR). Erä 55 (59 riviä, sv tyhjä) = rivi "odottaa". Huoltajakutsu.html:n `<title>` (1) on rajattu pois (ei tämän PR:n sivu).

## Taulukko

| Näkymä | fi-avaimia | ok | puuttuu sv | odottaa palautusta (lähetetty erä) | palautettu, ei viety koodiin | kovakoodattu (staattinen; sv puuttuu / vain reititys) | kovakoodattu (ajonaik., UI) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Pelaaja_v7 | 718 | 718 | **0** | 0 | 0 | **0** (0 / 0) | 4 (+ data? 3) |
| Vanhempi_v2 | 416 | 416 | **0** | 0 | 0 | **0** (0 / 0) | 7 (+ data? 11) |
| Master_v16 (valmentaja) | 1659 | 1659 | **0** | 0 | 0 | **0** (0 / 0) | 15 (+ data? 16) |
| VP_v25 | 3328 | 3328 | **0** | 0 | 0 | **0** (0 / 0) | 15 (+ data? 7) |
| ADAR_Pikakortti + Pelihavainto_Kentta | 572 | 572 | **0** | 0 | 0 | **0** (0 / 0) | 1 (+ data? 0) |
| Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP) | 62 | 62 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu) | 173 | 114 | **0** | 59 | 0 | **0** (0 / 0) | – |
| Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075) | 119 | 119 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Kehitystyöpöytä (Kehitystyopoyta.html) | 158 | 158 | **0** | 0 | 0 | **0** (0 / 0) | – |

_fi-avaimia = tm_lang-ryhmän / lib-FI-karttojen / reititinkartan (masterT, vpT, tmHT, phT) avaimet, jotka näkymä lataa. "odottaa" = rivi on lähetetyssä erässä (ei yhtään: 51 ja 52 vietiin tässä PR:ssä), palautus puuttuu. Sama lib-avain voi näkyä usealla näkymällä._

## Odottaa palautusta (lähetetyt erät: ei yhtään)

- **Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu)**: tm_lang 59

## Palautettu Geminiltä, ei viety koodiin


## Puuttuu sv (ei lähetettynä odottavassa erässä, ei palautettuna) → erä 53


## Kovakoodattu suomi (ei i18n-reittiä) — staattinen, tiedosto:rivi

### Pelaaja_v7 — 0

### Vanhempi_v2 — 0

### Master_v16 (valmentaja) — 0

### VP_v25 — 0

### ADAR_Pikakortti + Pelihavainto_Kentta — 0

### Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP) — 0

### Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu) — 0

### Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075) — 0

### Kehitystyöpöytä (Kehitystyopoyta.html) — 0

## Kovakoodattu suomi sv-tilassa — ajonaikainen läpiajo (demo-data, 2026-10-15)

### Pelaaja_v7 — UI 4, data? 3, prototyyppinäkymät (ei Sibbo-polkua) 62
- `TalentMaster_Pelaaja_v7.html:2664` [pelaaja/card] [sv on, vain reititys] Joukkueharjoitus
- `TalentMaster_Pelaaja_v7.html:2661` [pelaaja/card] [sv puuttuu] Ottelu vs FC Naapuri
- `TalentMaster_Pelaaja_v7.html:2664` [pelaaja/card] [sv puuttuu] Nopeustestit
- `lib/tm-microcycles.js:20` [pelaaja/pin] [sv on, vain reititys] Maalinteko

### Vanhempi_v2 — UI 7, data? 11
- `lib/tm_master_i18n.js:285` [vanhempi/u19/koti] [sv puuttuu] Live · Joukkue
- `TalentMaster_Vanhempi_v2.html:206` [vanhempi/u19/kortti] [sv on, vain reititys] Joukkue
- `TalentMaster_Vanhempi_v2.html:505` [vanhempi/u19/koti] [sv on, vain reititys] Joukkueharjoitus
- `TalentMaster_Vanhempi_v2.html:505` [vanhempi/u19/koti] [sv puuttuu] Ottelu vs FC Naapuri
- `TalentMaster_Vanhempi_v2.html:505` [vanhempi/u19/koti] [sv puuttuu] Nopeustestit
- `TalentMaster_Vanhempi_v2.html:148` [vanhempi/u19/kortti] [sv on, vain reititys] Pelaaja
- `TalentMaster_Vanhempi_v2.html:101` [vanhempi/u19/kortti] [sv on, vain reititys] Streak

### Master_v16 (valmentaja) — UI 15, data? 16
- `TalentMaster_Master_v16.html:2199` [master/today] [sv on, vain reititys] +1.4 vs. baseline
- `TalentMaster_Master_v16.html:2206` [master/today] [sv puuttuu] "3v2-hetki 67'. Uskalsi vaikean syötön, luki tilanteen oikein. Jatka tätä peliotetta."
- `TalentMaster_Master_v16.html:5621` [master/today] [sv on, vain reititys] ★ X-FACTOR
- `TalentMaster_Master_v16.html:2211` [master/today] [sv puuttuu] "Käännöksen nopeus paranee näkyvästi. Teki kaksi hyvää ohitusta oikealta laidalta."
- `TalentMaster_Master_v16.html:5626` [master/today] [sv on, vain reititys] VIDEO
- `TalentMaster_Master_v16.html:2216` [master/today] [sv puuttuu] "Väsymys näkyi asennossa. Ei jaksanut juosta takaisin puolustamaan viimeisessä viidenneksessä."
- `TalentMaster_Master_v16.html:1805` [master/cal] [sv on, vain reititys] Ottelu
- `TalentMaster_Master_v16.html:1649` [master/cal] [sv on, vain reititys] Harjoitus
- `TalentMaster_Master_v16.html:1780` [master/cal] [sv on, vain reititys] Testitapahtuma
- `lib/tm_kalenteri_tyypit.js:21` [master/cal] [sv on, vain reititys] Valmentajapalaveri
- `TalentMaster_Master_v16.html:11005` [master/cal] [sv puuttuu] Joukkueen vapaa
- `lib/tm_kalenteri_kuukausi.js:47` [master/cal] [sv puuttuu] Ei tapahtumia tässä kuussa.
- `TalentMaster_Master_v16.html:2313` [master/testit] [sv on, vain reititys] Kokkolan jalkapallostadion
- `TalentMaster_Master_v16.html:3075` [master/testit] [sv puuttuu] Harjoitettavuuskartoitus U13–15
- `TalentMaster_Master_v16.html:2320` [master/testit] [sv on, vain reititys] Eteläkenttä

### VP_v25 — UI 15, data? 7
- `TalentMaster_VP_v25.html:2689` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Ilmoitukset
- `lib/tm_eerikkila_normit.js:507` [vp/_vpOhjKirjastoModal('','')] [sv puuttuu] Suhteellinen ikävaikutus — syntymäkvartaali (Q1 alkuvuosi … Q4 loppuvuosi). Saman ikäluokan Q4 on bi
- `TalentMaster_VP_v25.html:5561` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Pre-PHV
- `TalentMaster_VP_v25.html:5563` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Post-PHV
- `TalentMaster_VP_v25.html:55` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Pikakirjaus
- `TalentMaster_VP_v25.html:3093` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Excel-pohja
- `TalentMaster_VP_v25.html:18593` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Historiatuonti
- `TalentMaster_VP_v25.html:18593` [vp/_vpOhjKirjastoModal('','')] [sv on, vain reititys] Palloliiton PDF
- `TalentMaster_VP_v25.html:4276` [vp/tilanne] [sv on, vain reititys] Top-10
- `TalentMaster_VP_v25.html:4276` [vp/tilanne] [sv on, vain reititys] Top-5
- `TalentMaster_VP_v25.html:3021` [vp/pelaajat] [sv on, vain reititys] ⭐ Underdog
- `TalentMaster_VP_v25.html:21960` [vp/kalenteri] [sv on, vain reititys] Kevään harjoitettavuus
- `TalentMaster_VP_v25.html:17335` [vp/kalenteri] [sv on, vain reititys] Kesken
- `TalentMaster_VP_v25.html:21961` [vp/kalenteri] [sv on, vain reititys] Tekniikkakilpailu U12
- `TalentMaster_VP_v25.html:11201` [vp/kalenteri] [sv on, vain reititys] Paikka

### ADAR_Pikakortti + Pelihavainto_Kentta — UI 1, data? 0
- `TalentMaster_Pelihavainto_Kentta.html:14` [pelihavainto/kentta] [sv on, vain reititys] Kohdennettu pelihavainto

