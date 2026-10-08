# CODE BRIEF · S2 — Seuran pulssi VP_v25:n etusivulle (17, 20) · käyttöön 1.12.2026

**Kaista: Tero** (VP_v25, `lib/`). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Design:** `docs/design/idp-v2/20_seuran_pulssi_s2.html` (mockup demodatalla) + `17_seuran_kooste.html` (D40–D45 lukittu). D65–D67 ovat ehdotuksia; Tero lukitsee ennen mergeä. Raportoi PR:ssä, mitä kohtaa noudatat.
**Aloitus:** joukkuejäsenyys-PR:n jälkeen (sama VP_v25; `tmPelaajanJoukkueet` + koosteen `yhteensa` ovat edellytys). Tavoite noin 25.10. aloitus, valmis viimeistään 20.11., jolloin 1.12. asti jää korjausaikaa.
**Data:** S1/S1.1-kooste on valmis tuotannossa. Ei uutta funktiota, ei Rules-muutosta (luku: johto + SA, v3.53). Kehitys ja testit **fixtuureilla / demodatalla** (Teron linjaus 8.10.: ei odoteta oikeaa dataa).

## Mitä S2 tekee

VP_v25:n **Koti** = Seuran pulssi, kun seuralla on Kenttä-lippu (D67). Ilman lippua Koti ennallaan.

1. **Pulssitaulukko** (mockup 20 · Näkymä):
   - Ensimmäinen rivi **Koko seura** koosteen `yhteensa`-kentästä (uniikit pelaajat), ei joukkueiden summana.
   - Joukkuerivit ikäjärjestyksessä, ei lajittelua mittarin mukaan (D42).
   - Sarakkeet: Joukkue (ikävaihe, pelaajamäärä) · Jakso (nimi + vk x/y, "kevyt jakso", "ei jaksoa") · Pelaajat jaksolla (+ "n valinta odottaa", "katselmus n") · Viikkokatsaus · Katselmus ajallaan · **Käyttö 7 pv** · **Suostumus** (D65) · Teema/Kuorma/Kypsyys harmaana "tulossa" (S4).
   - Leikkijä: viikkokatsaus "ei Leikkijällä"; Käyttö = huoltajien käynnit (`n_huoltaja_30`), alaotsikko "huoltajat".
   - Katselmusperusta 0 → "—" tai "jakso kesken", ei 0 %.
2. **Liikennevalot** (mockup · Tavoitetasot): TM-oletukset D45 + D65. Keltainen = ≥ 75 % tavoitteesta. **Pieni joukkue < 5 → lukumäärä (3/4), ei prosenttia eikä väriä.** Oletukset yhdessä `lib/`-taulukossa, jotta S3 (seuran omat tavoitteet `konfiguraatio/kooste_tavoitteet`) korvaa ne.
3. **Trendi:** neljä viimeisintä koostetta jaetulla lukufunktiolla (S1.1:n `tmKayttoasteLueKoosteet` tai sen yleistys, **ei laskevaa `documentId`-järjestystä**). Minipalkit ja "laskeva 3 vk" -merkintä, kun luku on laskenut kolme viikkoa peräkkäin. `arvio: true` -viikot himmennettyinä + selite.
4. **Porautuminen:** rivin klikkaus avaa joukkueen nykyisen tiiminäkymän (sama kuin nykyisen joukkuekortin klikkaus). Ei uutta näkymää S2:ssa.
5. **Tarvitsee huomiota:** nykyiset kriittiset signaalit pulssin alle, enintään 3, linkki "Kaikki signaalit ja poikkeamat → Tilanne". Lisäksi pulssista johdetut: joukkue ilman jaksoa ≥ 2 vk, katsaus laskeva 3 vk, katselmusikkuna sulkeutumassa ≤ 10 pv (ehdota rajat, raportoi).
6. **Päivitä nyt** -linkki (`paivitaSeuranKooste`, johto/SA, olemassa).
7. **Mobiili 390 px:** joukkueet kortteina (mockup · Mobiili): vain poikkeavat mittarit näkyvät, tavoitteessa olevat tiivistetään. Ei vaakavieritystä.

## Etusivun inventaario (D66, mockup · Inventaario)

| Nykyinen | S2:ssa |
|---|---|
| Aloita tästä -kortti | jää ylös |
| Kriittiset signaalit (Koti) | jää tiivistettynä pulssin alle (max 3) |
| Tuotu → kutsuttu → suostumus -nauha | poistuu (Suostumus-sarake) |
| Sovelluksen käyttö -kortti (S1.1) | poistuu lippuseuroilla (Käyttö + Suostumus -sarakkeet); jää ilman lippua |
| RAE-rakenne | siirtyy Tilanteeseen |
| Tilanne: "Joukkueiden pulssi" (D1/D2-kortit) | nimi → **"Joukkueiden testitaso"** (ei sekoitu Seuran pulssiin), sisältö ennallaan |
| Tilanne: poikkeamat, toimenpiteet, talentit, KPI, kausipalkki | ennallaan (R1 jakaa joulukuussa) |

## Tekninen

- **Renderöinti `lib/`-moduuliin** (esim. `lib/tm_seuran_pulssi.js`: puhdas `tmPulssiRivit(koosteet, tavoitteet, opts)` → rivimalli + `tmPulssiHTML`). **VP_v25:n kasvukatto (R0):** kuoreen vain kytkentä. Poistuvien korttien koodi pois samassa PR:ssä → VP pienenee.
- Tekstit `vpT`/kirjastokartan kautta, fi + Gemini-lista (sv). Ei omaa ruotsia.
- Design V2 -tokenit, Cormorant VP:llä, ei uusia tokeneita. Värisokeus: liikennevalon lisäksi aina luku (mockup).
- §7.22: henkilökunnan näkymä; pelaaja ja huoltaja eivät näe lukuja (Rules estää jo).

## Testit

- `tmPulssiRivit` fixtuureilla: kaikki mockupin rivit (Leikkijä, kilpa/harraste samassa ikäluokassa, pieni joukkue, ei jaksoa, katselmus kesken, laskeva trendi, `arvio`-viikot, vanha kooste ilman `yhteensa`ia → seuran rivi "≈" tai ilman prosenttia).
- Liikennevalorajat: täsmälleen tavoite, 75 %:n raja, pieni joukkue.
- Ei lajittelua mittarin mukaan (ikäjärjestys säilyy).
- Lippu pois → Koti ennallaan (snapshot).
- Mobiili 390 px: ei vaakavieritystä (selaintesti).
- Vartija: ei `documentId(), 'desc'`.
- Koko sarja + kasvukatto.

## Ei tässä

S3 tavoitetasolomake · S4 teema/kuorma/kypsyys + aikajana (D44) · Masterin valmentajanäkymä omille joukkueille (S2b) · hallitusraportti · ikäluokkanäkymä (2014 = P12 + Blå).
