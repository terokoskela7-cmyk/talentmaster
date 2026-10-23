# K4e · kohta 2, vaihe 0: Pelaajaraportti Master ↔ VP (vertailu PM:lle)

**Ei koodia tästä kohdasta ennen PM:n kuittausta.** Vertailu on tehty koodista (main `b9156f4f`): Master `_avaaPelaajaraportti` (`TalentMaster_Master_v16.html` ~rivit 8539–8680) ja VP `_renderMDTProfiili` (`TalentMaster_VP_v25.html` ~19369–19532 + apurit 19073–19270). Lähtökohta briiffistä: **VP:n versio on pohja, Masterista otetaan vain se, mitä VP:stä puuttuu.**

## 1. Taulukko

| Osio | Master | VP | Ehdotus |
|---|---|---|---|
| Avaus / paikka | Modaali `#prModal`, nappi pinfo-kortissa ("Pelaajaraportti + tavoitteet") ja Näyttö-lohkossa; vain valitun pelaajan | Raportointi-työtila → Pelaajaraportti-segmentti, pelaajavalitsin `<select>` (`_mdtValitse`); lisäksi pelaajamodaali (`_avaaPerPelaajaPikakatsaus`) on erillinen asia | **Yhdistä:** yksi raportti Profiilissa, painike "Pelaajaraportti + tavoitteet". Masterin ja VP:n vanhat napit avaavat samaa lipulla |
| Otsikko / identiteetti | Nimi, joukkue, ikä, pelipaikka, PHV-chip, RAE-chip (+ Underdog) | Hero: nimi, joukkue, ikä, viimeisin testi (+ vanhuusvaroitus), PHV-chip, RAE-chip, X-Factor / Hidden Gem -merkki, ikävaihe (Leikkijä/Rakentaja/Showcase) | **Ota VP** |
| Linssi | Ei | Kehitys / Scouting (Scouting: talent-status, potentiaali read-only) | **Ota VP.** Avoin: näkyykö Scouting-linssi valmentajalle vai vain johdolle (kysymys 3) |
| Päätöslause ja jakso | Ei | Signaalilause, päätöslause (`tarkista_ehdotus`), "Jakso nyt", Kehityssuunnitelman tila | **Ota VP** |
| 5D-profiili | Ei radaria; "Mittaus"-kortti: Kehon valmius, TKI, H-H, D1, D2 raakalukuina | `_tmRadar5D` + D1–D5 -pisteet + pelipaikka-SVG | **Ota VP.** Masterin raakalukurivit **jätä** (VP:n Mittaukset-kappale ja Profiilin todistekortit kattavat) |
| Lähdekaistat (spec §0: Mittaus / Ottelu / Pelihavainto) | 3 korttia; Ottelu on kovakoodattu "Ei dataa" (TASO-pelidataa ei integroitu) | Ei omaa Ottelu-kaistaa; Pelihavainto = Peliäly·ADAR-kappale | **Jätä** Masterin tyhjä Ottelu-kortti; Pelihavainto säilyy VP:n kappaleena |
| Vahvuus / Kehityskohde / Resepti | `tki_vahvuus`, `tki_kehityskohde`, resepti-lause (vain TKI) | Kehityssuunnitelma (`_vpKehSuunnitelmaHTML`, read-only), Kehityskaari, FA 1–5, Terveys (käytettävyys-merkki) | **Ota VP.** Masterin TKI-rivit **jätä**: Profiilin yhteenveto (Vahvuus/Kehityskohde) kattaa |
| D3 | Ei raportissa (D3 on vanhassa pinfo-kortissa) | Kappale Psyykkinen = `renderD3VertailuHTML` (itse × valmentaja × VP) | **Yhdistä:** raportin Psyykkinen-kappale käyttää kohdan 1 mallia (`tm_d3_kortti.js`), yksi lähde |
| **Tavoitteet** | Lista + lisäys: teksti ≤ 300, tavoitepvm, tila `kaynnissa`/`saavutettu`/`kesken` (select). **Kirjoittaa** `seurat/{sid}/pelaajat/{pid}/tavoitteet/{id}` `{teksti, tavoitepvm, tila, valmentajaUid, valmentajaNimi, luotu: serverTimestamp}` + pikakenttä `tavoite_aktiivinen_kpl` (count tila=kaynnissa, `set merge` pelaajadokumenttiin) + `_tmLaskuri(uid,'tavoitteet')` | Ei näytä eikä kirjoita. `_mdtLataaTavoitteet` lukee saman polun (`orderBy luotu`), mutta `_mdtTavoitteetHTML` on vain käyttämättömässä `_mdtJohtajaPaneeli`ssa | **Ota Masterista** (VP:ssä ei ole). **Sama polku ja sama muoto: tallennuspolku ei muutu.** Master ja VP eivät tallenna eri paikkoihin (VP ei tallenna tavoitteita lainkaan). Katso kysymys 1 |
| Oikeudet (tavoitteet) | UI: `_prVoiNahda` (SA, talenttivalmentaja, VP, UTJ kaikki; muut oman joukkueen). Rules: read `onOmaSeura`, create/update SA tai `onOmanSeuranValmentaja`, delete SA tai johto; A5-vartija `luotu` | Raportti on read-only | Uusi sivu: `_voiKirjoittaa` (`tmPelaajaOikeus`) kuten muu sivu. Kysymys 2 |
| Kehityskeskustelun merkintä | Ei | "Merkitse kehityskeskustelu tehdyksi": yksi batch `reviewit/{pvm}` + pikakentät `review_viimeisin_pvm/-tyyppi` (+ `review_tagit`) `tmKirjaaKatselmus`-libin kautta; "Päätös / huomiot" -kenttä tallentuu merkintään (`paatos`); review-status (ajantasalla / erääntymässä / myöhässä) | **Ota VP** (sama polku, ei muutosta). Rules: reviewit create johto + oman seuran valmentaja + SA |
| Palaveritila (koko ruutu) | Ei | `_mdtPalaveritila` | **Jätä pois:** uusi sivu on jo koko ruudun näkymä |
| Tulostus / PDF | Ei | "Vie PDF" = `window.print()` + `@media print` (rajaa `#mdtProfiili`, valkoiset tokenit) | **Ota;** uusi sivu tarvitsee oman print-CSS:n (ei kopioida VP:n kovakoodattuja värejä) |
| Vanhempi-skin / vanhempiviesti (`_mdtVanhDraft`, `vanhempiRaporttiTekstit`) | Ei | Koodi on, mutta nykyinen raportti ei kutsu sitä (skin-valitsin poistunut) | **Jätä** (§7.22; kuollutta koodia, ei siirretä) |
| Muu Raportointi (tilannekuva, talenttisuositukset, "Lähetä Head of Talentille", Joukkueäly) | Ei | Samalla sivulla, mutta ei pelaajaraportti | **Jää VP:hen ennalleen** |
| Datalähteet | `_pelaajatData` (pikakentät §26) + `tavoitteet`-alikokoelman luku | `_pelaajat` + `_idpTavoite` + `reviewit` | Uusi: pelaajadokumentti (sis. sisainen-yhdistys) → D3 uudesta paikasta; tavoitteet alikokoelmasta kuten nyt |
| fi/sv-avaimet | `masterT`, avain = suomiteksti (`tm_master_i18n.js`); tarkistin: Tavoitteet-rivin avaimille on sv | `vpT` (`tm_vp_i18n.js`); tarkistin: "Vie PDF", "Kehityspalaveri", D3-kalibraatio, "Päätös / huomiot…" -avaimille on sv | Uusi lib saa omat `FI`-avaimet; **sv Geminiltä** (odotuslistaan, kuten K4e-kortin 23 avainta). Olemassa olevat sv-tekstit kierrätetään avaimilla, ei kirjoiteta uudelleen |

## 2. Riippuvuudet ja koko (toteutusta varten)

VP:n raportti käyttää useita funktioita, jotka ovat **VP_v25.html:n sisällä, ei libeissä:** `_tmRadar5D`, `_vpKehSuunnitelmaHTML`, `_vpKehityskaariHTML`, `_vpPotentiaaliHTML`, `laskeD5Taso`, `_dimNorm5Adar`, `_hgBadge`, `_vpRaeChip`, `_mdtPelipaikkaSVG`, `_mdtFaLista`. Libeissä jo: `renderKehityskorttiHTML`, `laskeD1Osaindeksit`, `laskeReviewKadenssi`, `vanhempiRaporttiTekstit` (`tm_eerikkila_normit.js`), `laskeD2Taso` (`tm_mittarit.js`), `tmKirjaaKatselmus` (`tm_kehityssilmukka.js`).

"Yksi lib, ei kahta kopiota" tarkoittaa siis, että nuo VP-sisäiset apurit siirretään libiin tai raportti käyttää vain libissä jo olevia. En ole mitannut siirrettävien funktioiden rivimäärää. **Ehdotus vaiheistukseen (PM päättää):**
1. **Vaihe A:** `lib/tm_pelaajaraportti.js` + Profiilin painike; sisältö = otsikko/identiteetti, päätöslause, Psyykkinen (D3-kortin malli), Kehityssuunnitelma, Mittaukset (`renderKehityskorttiHTML`), Pelihavainto, **Tavoitteet (Masterista)**, kehityskeskustelun merkintä, print.
2. **Vaihe B:** radar, Kehityskaari, FA, Scouting-linssi ja potentiaali, kun niiden apurit on siirretty libiin.
3. Master- ja VP-napit ohjataan uuteen vasta kun Vaihe A kattaa Masterin nykyisen sisällön (Tavoitteet ja Kehityssuunnitelma).

## 3. Kysymykset PM:lle (vastaus ennen koodia)

1. **Tavoitteet vs. kehityssuunnitelma.** Masterin `tavoitteet`-alikokoelma (vapaamuotoinen valmentajan tavoite + tila) ja VP:n Kehityssuunnitelma (`idp_kausi` / `_idpTavoite`) ovat kaksi eri "tavoite"-käsitettä. Pidetäänkö molemmat raportissa (ehdotus), vai korvaako IDP Masterin vapaat tavoitteet? **Tallennuspolku pysyy ennallaan, ellet hyväksy muutosta.**
2. **VP ja `tavoitteet`-kirjoitus.** Rules sallii create/update vain `onOmanSeuranValmentaja`lle (+ SA). Tämän perusteella VP:n kirjoitus on epäselvä (VP-periaate: VP voi tehdä kaiken, minkä valmentaja voi). En ole tarkistanut, kattaako funktio VP:n. Tarkistan Rules-testistä toteutusvaiheessa; jos ei kata, se on Rules-muutos (Teron kaista), ei tämän PR:n asia.
3. **Scouting-linssi** (talent-status, potentiaali): näkyykö valmentajalle vai vain johdolle? Nyt se on VP:n (johdon) raportissa; Master ei sitä näytä.
4. **Print/PDF** on vain VP:ssä. Halutaanko sama myös valmentajalle?
5. **"Ottelu"-kaista** (spec §0) on Masterissa tyhjä "Ei dataa". Jätetäänkö pois, kunnes TASO-data integroidaan?

## 4. Ei tässä
Ei raportin koodia, ei Masterin eikä VP:n raporttinappien muutosta, ei vanhan näkymän poistoa. Lippu pois: kaikki ennallaan.
