# CODE BRIEF · S2 — VP:n Koti = Seuran pulssi (mockupit 23 + 25) · valmis 20.11.2026

**Kaista: Tero** (VP_v25, `lib/`). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Tämä briiffi korvaa** `docs/CODE_BRIEF_S2_SEURAN_PULSSI.md`:n kohdat "Mitä S2 tekee" ja "Etusivun inventaario" (ne kuvaavat mockupin 20 versiota). Kooste v4/v5, lukitut päätökset D65–D75 (D65:n Käyttö muutettu D119:llä) ja testiosio pätevät edelleen.
**Design:** `docs/design/idp-v2/23_seuran_pulssi_v2.html` (pulssitaulukko, tilat, mobiili) + `25_vp_koti_tilanne.html` (Kodin rakenne). Visuaalinen kieli = mockup 22 (CLAUDE.md §5). Raportoi PR:ssä, mitä mockupin kohtaa kukin osa noudattaa. Jos mockup ja tämä briiffi ovat ristiriidassa tai mockup ei kata tilannetta → kysy, älä keksi.
**Valmiina:** P0-luvut (#949, `lib/tm_koti_luvut.js`: yksi laskuri, kattavuusportti D125, D134-rajaus) · kooste v5 (#950, `n_harjoite_7`) · datatarkistus 9.10. (#952).
**Aikataulu:** aloitus nyt. Kaksi PR:ää (alla), molemmat valmiit viimeistään 20.11. PM tarkistaa oikealla datalla ~15.11.

## PR 1 — pulssitaulukko ja Kodin rakenne

### Kodin järjestys (D122, mockup 25)
1. **Käyttöönottonauha** vain käyttöönottotilassa (D69): suostumus `n_suostumus / n_pelaajat` kunnes ≥ 90 %, toimenpide "Muistuta perheitä". Suostumus eriteltynä `tm_koti_luvut.suostumus()`:lla (sama luku kuin P0).
2. **Tulkintalause** (D109): esim. "7/9 joukkuetta jaksolla. 3 asiaa tälle viikolle." Kattavuusportti D125 pätee (`tm_koti_luvut.kattavuus`): alle rajan vain "mitattu X/Y".
3. **Tarvitsee huomiota** (D73, D115, D118): enintään 3 `.ev.sig`-korttia D73:n järjestyksessä, loput "+N muuta → Tilanne". Vain asiat, jotka VP voi ratkaista tällä viikolla; testisyklin asiat eivät ole viikkosignaaleja (D118). Sanoitus valmentajan tukena ("Tue valmentajaa: …"). Laskuri = `tm_koti_luvut.toimenpideMaara` (yksi luku kaikkialla).
4. **Joukkueiden viikko** = pulssitaulukko (alla).
5. **Tulossa 14 pv** (olemassa olevasta kalenterista, vain otsikot ja päivät).
- **Oikea palsta (leveä näyttö):** Tänään + Tulossa. Tauot ja Viestit-osio eivät ole S2:ssa (R1).
- Ei mittauksia, ei pelaajanimiä, ei kausilukuja Kodissa (D122). RAE ja mittaukset Tilanteeseen.

### Pulssitaulukko (mockup 23)
- **Koko seura -rivi** koosteen `yhteensa`-kentästä (uniikit pelaajat), joukkuerivit ikäjärjestyksessä (D42), ei lajittelua mittarin mukaan.
- **Sarakkeet:** Joukkue (ikävaihe, pelaajamäärä, kilpa/harraste, ammatti/oto) · Jakso · Pelaajat jaksolla · Viikkokatsaus · Katselmus ajallaan · **Käyttö 7 pv = `n_harjoite_7`** (D119). **Ei "tulossa"-saraketta** (D110), ei suostumussaraketta.
- **Leikkijä (D71):** Käyttö = `n_perhe_kuittaus_7`, alaotsikko "perhe mukana"; viikkokatsaus "ei Leikkijällä", katselmus "—".
- **Liikennevalo = muotomerkki + luku** (D112): ● tavoitteessa · ▲ alle tavoitteen (≥ 75 %) · ■ selvästi alle · ○ pieni joukkue tai käyttöönotto. Luku aina näkyvissä. Tavoitteet D45/D65/D70/D72 kuten vanha briiffi (yksi `lib/`-taulukko, jonka S3 korvaa). Oto: katselmus enintään ▲.
- **Pieni joukkue < 5** (D116): lukumäärä "3/4", ei prosenttia, merkkiä eikä trendiä.
- **Käyttöönottotila** (D69): 4 ensimmäistä viikkoa ○ kaikille, käytön portaat sen jälkeen.
- **Trendi** (D111): vain Viikkokatsaus- ja Käyttö-sarakkeissa sekä seura-rivillä, 4 viikkoa minipalkkeina, "laskeva 3 vk" -merkki. Lukufunktio `tmKayttoasteLueKoosteet` tai sen yleistys, **ei** `documentId(), 'desc'` (vaatii indeksin, vartija). `arvio: true` -viikot himmennettyinä.
- **Datan ikä** (D113): otsikossa DM Monolla "laskettu ma 06.00 · vk 41". Yli 8 päivää vanha kooste → amber-nauha ja merkit neutraaleiksi. Hiljainen "Päivitä"-linkki otsikossa (`paivitaSeuranKooste`, johto/SA).
- **Rauhallinen viikko** (D114): ei signaaleja → `.ev.sig.n` "Ei toimenpiteitä tällä viikolla" + seuraava tapahtuma + tarkistuslause "Tarkistettu N joukkuetta, 0 poikkeamaa. Kooste laskettu …".
- **Rytmi, ei laatu** (D117): taulukon alle yksi lause.
- **Porautuminen** (D121): joukkueen nimi avaa nykyisen tiiminäkymän. Ei uutta näkymää.
- **Mobiili 390 px** (D74, mockup 23 §2): ensin "x/y joukkuetta jaksolla", sitten poikkeamakortit ikäjärjestyksessä, tavoitteessa olevat haitarissa. Ei vaakavieritystä.
- **Kenttä-lippu** (D67): pulssi näkyy vain lippuseuroille; ilman lippua Koti ennallaan (snapshot-testi).

### Tilanne (D120, D121)
- Nykyinen "04 Joukkueiden pulssi" → **"Mittaustilanne"** (korvaa vanhan briiffin nimen "Joukkueiden testitaso"). Sana "pulssi" tarkoittaa jatkossa vain viikkosilmukkaa.
- Kodista poistuvat kortit (Sovelluksen käyttö lippuseuroilla, RAE, vanha suostumussuppilo) siirtyvät Tilanteeseen tai poistuvat mockupin 25 §4 "Mitä poistui ja minne" -taulukon mukaan. Poistuvan koodin pois samassa PR:ssä (kasvukatto R0).

## PR 2 — signaalien kuittaus (Kuittaa / Ensi viikolla, D124)

- Jokaisessa Tarvitsee huomiota -kortissa yksi täytetty toimenpidenappi + katkoviivarivillä "Kuittaa" ja "Ensi viikolla".
- **Tallennus olemassa olevaan `seurat/{s}/toimenpiteet`-kokoelmaan** (Rules: johto/SA lukee ja kirjoittaa, ei kenttärajausta → ei Rules-muutosta): `{ tyyppi: 'pulssi', signaali: <D73-tyyppi>, joukkue: <joukkueId>, tila: 'kuitattu' | 'siirretty', palaa_vk: '2026-W42' | null, kuitattu_pvm, kuitattu_uid, luotu }`. Ei Asia-kokoelmaa (R1).
- Siirretty signaali piiloon kunnes `palaa_vk`; kuitattu piiloon kunnes signaalin ehto muuttuu (sama dedup-periaate kuin `tm_koti_luvut.ehdotusEste`).
- Laskuri päivittyy heti (sama `toimenpideMaara`).

## Tekniikka ja rajat
- Renderöinti `lib/tm_seuran_pulssi.js`:ään (puhdas `tmPulssiRivit(koosteet, tavoitteet, opts)` + HTML-funktio). VP_v25:een vain kytkentä.
- Tekstit `vpT`/kirjastokartan kautta, uudet sv-avaimet uuteen Gemini-erään (`docs/i18n/sv_kaannoserae_5.json`), ei omaa ruotsia.
- Design V2 -tokenit, ei uusia tokeneita. VP: Cormorant + DM Sans + DM Mono.
- Ei `functions/`- eikä Rules-muutoksia. Ei pelaajanimiä eikä pelaaja-ID:itä Kodissa (§7.22).
- Testaa KPV:n VP-tunnuksella ja valmentajalla (§0), ei SA:lla. Jos tunnuksia ei ole, fixtuurit + Tero tarkistaa.

## Testit
Vanhan briiffin testiosio pätee, lisäksi:
- Muotomerkit ● ▲ ■ ○ rajoilla (täsmälleen tavoite, 75 %, pieni joukkue, käyttöönotto).
- Ei "tulossa"-saraketta; trendi vain kahdessa sarakkeessa.
- Datan ikä > 8 pv → neutraali; rauhallinen viikko → tarkistuslause.
- Käyttö lukee `n_harjoite_7`; Leikkijä `n_perhe_kuittaus_7`; v4-kooste ilman v5-kenttiä → "—".
- Kattavuusportti tulkintalauseessa.
- PR 2: kuittaus ja siirto kirjoittavat oikeat kentät; siirretty palaa oikealla viikolla; laskuri sama kolmessa paikassa.
- Mobiili 390 px ilman vaakavieritystä. Koko sarja oletus-TZ:llä ja `TZ=UTC`, raportoi `Test Files` ja `Tests`.

## Ei tässä (R1, tammikuu)
Navigaatio v3 (D135) · Joukkueet ja ryhmät (D136) · Asia-kokoelma, kuittausdialogi, Viestit (D127–D133) · kalenterin kerrokset ja tauot (D131) · Kenttä joukkuerivillä (D126), ellei kevyt `tm_kentta`-kytkentä mahdu PR 1:een ilman lisätyötä (päätä ja raportoi).
