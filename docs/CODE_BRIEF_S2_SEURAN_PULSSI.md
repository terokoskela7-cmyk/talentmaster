# CODE BRIEF · S2 — Seuran pulssi VP_v25:n etusivulle (17, 20) · käyttöön 1.12.2026

**Kaista: Tero** (VP_v25, `lib/`). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Design:** `docs/design/idp-v2/20_seuran_pulssi_s2.html` (mockup demodatalla) + `17_seuran_kooste.html` (D40–D45 lukittu). **D65, D66 ja D68–D75 lukittu 8.10.** (sparri). **D67 avoin:** pulssi kytketään Kenttä-lippuun, lipun laajennusta tarkastellaan viikoittain (1.11. ensimmäinen tavoite). Raportoi PR:ssä, mitä kohtaa noudatat.
**Aloitus:** joukkuejäsenyys-PR:n jälkeen (sama VP_v25; `tmPelaajanJoukkueet` + koosteen `yhteensa` ovat edellytys). Tavoite noin 25.10. aloitus, valmis viimeistään 20.11., jolloin 1.12. asti jää korjausaikaa.
**Data:** S1/S1.1-kooste on valmis tuotannossa. S2 tarvitsee **kooste v4** (alla): uudet lukumäärät ja joukkueen asetukset. Ei uutta funktiota; Rules-muutos vain, jos `joukkueet.tyyppi` ei jo ole johdon kirjoitettavissa. Kehitys ja testit **fixtuureilla / demodatalla** (Teron linjaus 8.10.: ei odoteta oikeaa dataa).

## Tilanne 9.10.2026 (PM) — näkymä-PR alkaa nyt

- **Valmiina:** kooste v4 + Rules v3.56 `joukkueet.tyyppi` (#933) · S1.1 huoltajan RSVP käyttöasteeseen (#944). Näkymä-PR ei koske `functions/`-kansioon eikä Rulesiin.
- **`n_perhe_kuittaus_7` lähteet (lukittu 9.10.):** klippikuittaus + U12-huoltajan `jakso_kuittaus`. Viikkokatsauksessa ei ole perhe-lippua → ei lähde. Leikkijä-rivin alaotsikko "perhe mukana" lukee tätä.
- **Visuaalinen kieli = mockup 22 (CLAUDE.md §5, Tero 9.10.):** pulssin kortit, "Tarvitsee huomiota" -signaalit ja mobiilin poikkeamakortit tehdään 22:n komponenteilla (`.ev.sig`, `.q3`, `.osat`-rivilista, `.eb`). Taulukon solut ja liikennevalot mockupin 20 mukaan.
- **Joukkueen tyyppi -asetus (VP):** samaan paikkaan kuin valmentajaprofiili (D50). Rules sallii jo johdolle (v3.56).
- **Aikataulu:** aloitus nyt, valmis viimeistään 20.11. PM tarkistaa luvut oikealla datalla ~15.11.

## Mitä S2 tekee

VP_v25:n **Koti** = "Pulssi · viikko", kun seuralla on Kenttä-lippu (D67). Ilman lippua Koti ja Sovelluksen käyttö -kortti ennallaan. Tilanne-välilehti nimeksi "Tilanne · kausi" (D66).

1. **Pulssitaulukko** (mockup 20 · Näkymä):
   - Ensimmäinen rivi **Koko seura** koosteen `yhteensa`-kentästä (uniikit pelaajat), ei joukkueiden summana.
   - Joukkuerivit ikäjärjestyksessä, ei lajittelua mittarin mukaan (D42).
   - Sarakkeet = Kenttä-silmukan vaiheet (D75): Joukkue (ikävaihe, pelaajamäärä, kilpa/harraste, ammatti/oto) · Jakso (reitti) · Pelaajat jaksolla (oma reitti; "katselmus n", **ei "valinta odottaa"**, D68) · Viikkokatsaus (merkit) · Katselmus ajallaan (kevyt katselmus D47) · **Käyttö 7 pv** (silmukan toiminnot, D65) · Teema/Kuorma/Kypsyys harmaana "tulossa" (S4). **Suostumus ei ole sarake** (D65).
   - Leikkijä (D71): viikkokatsaus "ei Leikkijällä", katselmus "—"; Käyttö = perheen kuittaukset (`n_perhe_kuittaus_7`), alaotsikko "perhe mukana".
   - Katselmusperusta 0 → "—" tai "jakso kesken", ei 0 %.
2. **Liikennevalot** (mockup · Tavoitetasot): TM-oletukset D45 + D65 + D70 + D72. Keltainen = ≥ 75 % tavoitteesta. **Pieni joukkue < 5 → lukumäärä (3/4), ei prosenttia eikä väriä.**
   - Kilpa: jaksolla ≥ 90 · katsaus ≥ 70 · katselmus ≥ 90 · käyttö ≥ 50. **Harraste (D70):** katsaus ≥ 50, käyttö ≥ 30, muut samat.
   - **Oto-profiili (D72):** katselmus-sarake enintään keltainen (ei punaista). Ammatti saa punaisen.
   - Koko seura -rivi kilpaoletuksia vasten.
   - Oletukset yhdessä `lib/`-taulukossa, jotta S3 (seuran omat tavoitteet `konfiguraatio/kooste_tavoitteet`) korvaa ne.
   - Kieli: "alle tavoitteen", ei koskaan "heikko".
2b. **Käyttöönottotila (D69, mockup · Käyttöönottotila):**
   - Seuran 4 ensimmäistä pulssiviikkoa (ensimmäisestä koosteesta, jossa lippu päällä): ei värejä, vain luvut + trendi.
   - Sen jälkeen käytön tavoite portaittain kuukausittain: kilpa 25 → 40 → 50 %, harraste 15 → 25 → 30 % (harrasteen portaat PM-ehdotus, Tero voi muuttaa). Muut sarakkeet täysillä tavoitteilla heti.
   - **Suostumusnauha** pulssin yläreunassa (seuran `n_suostumus / yhteensa`) kunnes ≥ 90 %, sitten piiloon; toimenpide "Muistuta perheitä" (olemassa oleva suostumusmuistutus, jos on; muuten linkki Seuran kutsuihin, raportoi).
3. **Trendi:** neljä viimeisintä koostetta jaetulla lukufunktiolla (S1.1:n `tmKayttoasteLueKoosteet` tai sen yleistys, **ei laskevaa `documentId`-järjestystä**). Minipalkit ja "laskeva 3 vk" -merkintä, kun luku on laskenut kolme viikkoa peräkkäin. `arvio: true` -viikot himmennettyinä + selite.
4. **Porautuminen:** rivin klikkaus avaa joukkueen nykyisen tiiminäkymän (sama kuin nykyisen joukkuekortin klikkaus). Ei uutta näkymää S2:ssa.
5. **Tarvitsee huomiota (D73):** enintään 3, tässä järjestyksessä, jokaisella yksi toimenpide:
   1. ei jaksoa ≥ 2 vk → **Aloita jakso** (VP voi)
   2. katselmusikkuna ≤ 10 pv, **vain ammatti** → **Sulje jakso lauseella** (D47)
   3. viikkokatsaus laskenut 3 vk → **Viesti valmentajalle** (selitysrivi: "62 → 41 %, jakso vk 5/6")
   4. käyttö < 25 % (vasta käyttöönottotilan jälkeen) → **Viesti perheille**
   - Käyttöönottotilassa lisäksi suostumussignaali. Ei "valinta odottaa" (D68). Linkki "Kaikki signaalit ja poikkeamat → Tilanne · kausi". Nykyiset kriittiset signaalit Tilanteeseen.
6. **Päivitä nyt** -linkki (`paivitaSeuranKooste`, johto/SA, olemassa).
7. **Mobiili 390 px (D74):** ensimmäinen luku "x/y joukkuetta jaksolla", sitten poikkeamakortit ikäjärjestyksessä, jokaisessa yksi toimenpide. Tavoitteessa olevat tiivistetään. Ei vaakavieritystä.

## Etusivun inventaario (D66, mockup · Inventaario)

| Nykyinen | S2:ssa |
|---|---|
| Aloita tästä -kortti | jää ylös |
| Kriittiset signaalit (Koti) | jää tiivistettynä pulssin alle (max 3) |
| Tuotu → kutsuttu → suostumus -nauha | korvautuu pulssin suostumusnauhalla (käyttöönottotila, kunnes ≥ 90 %) |
| Sovelluksen käyttö -kortti (S1.1) | korvautuu Käyttö-sarakkeella lippuseuroilla; jää ilman lippua |
| RAE-rakenne | siirtyy Tilanteeseen |
| Tilanne: "Joukkueiden pulssi" (D1/D2-kortit) | nimi → **"Joukkueiden testitaso"**, sisältö ennallaan; välilehdet **"Pulssi · viikko"** ja **"Tilanne · kausi"** |
| Tilanne: poikkeamat, toimenpiteet, talentit, KPI, kausipalkki | ennallaan (R1 jakaa joulukuussa) |

## Kooste v4 (`functions/` + `lib/tm_seuran_kooste.js`, sama sync-vartija)

Joukkueittain uudet kentät, vain lukumääriä ja asetuksia:

| Kenttä | Laskenta |
|---|---|
| `tyyppi` | `joukkueet/{jid}.tyyppi` 'kilpa'\|'harraste', puuttuva → 'kilpa' (D70) |
| `profiili` | `joukkueet/{jid}.valmentajaprofiili` 'ammatti'\|'oto', puuttuva → 'oto' (D50, sama oletus kuin `tm_tanaan_signaali.js`) |
| `n_toiminto_7` | pelaaja tai huoltaja teki 7 pv:ssä silmukan toiminnon (D65): viikkokatsaus vastattu · `ydinvahvuus_valinta` · klippivastaus/-kuittaus (R6.4) · huoltajan kuittaus (`jakso_kuittaus` tms.). **Ei** `kirjaukset`, kalenterin `lasnaolijat` eikä kirjautuminen. Luettele lopulliset lähteet PR:ssä. |
| `n_perhe_kuittaus_7` | Leikkijä (D71): perheen kuittaus 7 pv:ssä (klippi "katsoimme yhdessä", viikkokatsaus perheen kanssa). Jos lähde puuttuu vielä, kenttä 0 ja raportoi. |

- `n_aktiivinen_7/30` (S1.1) jää Adminin Käyttöasteeseen ennalleen; pulssi käyttää `n_toiminto_7`:ää.
- Takaisinlaskenta (`arvio: true`) myös näille, jos lähteillä on päivämäärä.
- **Joukkueen asetukset (VP):** `tyyppi` asetetaan samassa paikassa kuin valmentajaprofiili (D50). Tarkista Rules: johto kirjoittaa `joukkueet/{jid}`; jos kenttärajaus estää, Rules-muutos + testi tähän PR:ään (versio seuraava vapaa).

## Tekninen

- **Renderöinti `lib/`-moduuliin** (esim. `lib/tm_seuran_pulssi.js`: puhdas `tmPulssiRivit(koosteet, tavoitteet, opts)` → rivimalli + `tmPulssiHTML`). **VP_v25:n kasvukatto (R0):** kuoreen vain kytkentä. Poistuvien korttien koodi pois samassa PR:ssä → VP pienenee.
- Tekstit `vpT`/kirjastokartan kautta, fi + Gemini-lista (sv). Ei omaa ruotsia.
- Design V2 -tokenit, Cormorant VP:llä, ei uusia tokeneita. Värisokeus: liikennevalon lisäksi aina luku (mockup).
- §7.22: henkilökunnan näkymä; pelaaja ja huoltaja eivät näe lukuja (Rules estää jo).

## Testit

- `tmPulssiRivit` fixtuureilla: kaikki mockupin rivit (Leikkijä perhe mukana, kilpa/harraste samassa ikäluokassa, pieni joukkue, ei jaksoa, katselmus kesken, laskeva trendi, `arvio`-viikot, vanha kooste ilman `yhteensa`ia tai v4-kenttiä → seuran rivi "≈" / sarake "—").
- Käyttöönottotila: viikot 1–4 ei värejä; portaat kuukausittain; suostumusnauha piiloon ≥ 90 %.
- Oto: katselmus ei koskaan punainen; ammatti voi olla.
- Harraste: omat oletukset; S3-tavoite korvaa.
- Tarvitsee huomiota: järjestys D73, max 3, ei valinta odottaa, käyttösignaali vasta käyttöönoton jälkeen, katselmussignaali vain ammatti.
- Kooste v4: `n_toiminto_7` ei laske kirjautumista, kirjauksia eikä läsnäoloa; tietosuojavartija (ei nimiä/ID:itä) edelleen vihreä.
- Liikennevalorajat: täsmälleen tavoite, 75 %:n raja, pieni joukkue.
- Ei lajittelua mittarin mukaan (ikäjärjestys säilyy).
- Lippu pois → Koti ennallaan (snapshot).
- Mobiili 390 px: ei vaakavieritystä (selaintesti).
- Vartija: ei `documentId(), 'desc'`.
- Koko sarja + kasvukatto.

## Ei tässä

S3 tavoitetasolomake · S4 teema/kuorma/kypsyys + aikajana (D44) · Masterin valmentajanäkymä omille joukkueille (S2b) · hallitusraportti · ikäluokkanäkymä (2014 = P12 + Blå).
