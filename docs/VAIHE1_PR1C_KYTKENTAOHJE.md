# Vaihe 1 · PR 1c (viipale S2) — henkilökunnan kenttäryhmä → sisainen/tiedot · kytkentäohje (Teron kaista)

Jaettu kolmeen PR:ään (PM hyväksyi 24.10.): **1c-1 perusta** (tämä) → **1c-2 CF:t** → **1c-3 selain**. Lippu `RYHMAT.henkilokunta.kirjoitus` on pois, kunnes kaikki kolme on mergetty ja Functions on deployattu.

## 1c-1: mitä tässä PR:ssä on

- **Rekisteri** (`lib/tm_sisainen.js`): ryhmä `henkilokunta`, 15 kenttää: `vastuuhenkilo`, `tukitarve`, `scout_potentiaali` (+`_taso`, `_huomiot`, `_pvm`, `_arvioija`), `talentti_ehdotus`, `review_viimeisin_pvm`, `review_viimeisin_tyyppi`, `review_tagit`, `idp_edistyma`, `idp_lahde`, `idp_viim_review`, `idp_dvi`.
  - `signaali` jää kytkemättömään ryhmään `staff_paatokset` (viipale 1e). **P7 lukee `signaali`-arvon `'phv'`** (`_signaaliLabel`, PH-pelaajalle näytettävä merkki) → 1e:ssä kenttä pitää jakaa: pelaajalle näkyvä `phv` pelaajadokumenttiin, talenttisignaalit (`xfactor`/`gem`) sisainen:iin. Muita lukijoita: `tm_eerikkila_normit`, `tm_kehitystilanne`, `tm_koti_luvut`, `tm_seuraava_askel` (kaikki henkilökunta).
  - `tavoitteet` = C (PM 24.10.): ei rekisterissä, jää pelaajadokumenttiin, PR 2 siivoaa. Ryhmät `review` ja `idp_sisainen` poistettiin (kentät siirtyivät `henkilokunta`-ryhmään tai C:hen).
- **Lippu ohjaa kirjoitusta JA dual-readia** (kuten #1132): pois → vanha kenttä; päällä → sisainen voittaa kentittäin. D3 ja jaksofokus-ryhmät eivät riipu tästä lipusta. `opts.henkilokuntaKirjoitus` ohittaa rekisterin (testit, CF:n vakio 1c-2:ssa).
- **Kirjoitusapuri** `tmHenkilokuntaKirjoita` / `tmHenkilokuntaOsa`: YKSI batch (pelaajadokumentti kuten ennen + `sisainen/tiedot` `set` + `mergeFields`). mergeFields **korvaa kentän kokonaan** (map-kentissä ei syvää yhdistystä), välittää `FieldValue.delete`-sentinellin, `taydenna(batch)` lisäoperaatioille. `permission-denied` → uusi batch ilman sisainen:iä + `console.warn`. Kirjoittajia ei kytketä tässä PR:ssä.
- **Rules v3.69** (kiristää vain sisainen-kenttiä, ei kosketa nykyisiä kirjoituksia):
  - `scout_potentiaali*` sisainen:ssä vain SA | oman seuran johto (`onJohtoRooli`), sama rajaus kuin pelaajadokumentin FA-potentiaali.
  - `vastuuhenkilo` sisainen:ssä `vastuuhenkiloAsettaja` + `vastuuhenkiloMuotoKelpaa` (poisto sallittu asettajille), sama ehto kuin `vastuuhenkiloMuutosKelpaa` (v3.38).
  - Testivastaava ei kirjoita sisainen:iin (ei ennenkään; `onValmentajaRooli` ei sisällä sitä) — nyt testattu. Fysioterapeutti ennallaan (hasOnly jaksofokus-osat).
- **Migraatio** `scripts/migroi_sisainen_henkilokunta.js`: dry-run oletuksena, `--kirjoita` + `KIRJOITA`, idempotentti, vain kopioi.
  1. Yksikköä ei sisainen:ssä → kopioidaan.
  2. Molemmissa → **sisainen voittaa** ristiriidassa (`eroaa`), puuttuvat kentät ja karttojen lehdet täydennetään.
  3. **Vanhentunut**: pelaajadokumentin yksikön päivämäärä myöhäisempi kuin sisainen:n (`vastuuhenkilo.asetettu_pvm`, `tukitarve.merkitty_pvm`, `talentti_ehdotus.pvm`, `scout_potentiaali_pvm`, `review_viimeisin_pvm`, `idp_viim_review`) → yksikkö korvataan pelaajadokumentin arvoilla.
  - Rajaus: pelaajadokumentista poistettua kenttää (esim. vastuuhenkilön poisto vanhalla asiakkaalla) ei voi havaita → sisainen:stä ei poisteta; PR 2 -siivous.
  - Tuloste: vain lukumäärät seuroittain (`kopioi`, `eroaa`, `vanhentunut`, `jo_siirretty`, `ei_a`).

## Havainnot lukijoista (kartoitus 1c-2/1c-3:a varten)

- Pelaaja/Vanhempi/Rekisteröinti eivät lue yhtään siirrettävää kenttää (grep-portti testissä). Jaetut libit `tm_eerikkila_normit.js` ja `tm_idp.js` sisältävät henkilökunnan funktioita (`laskeReviewKadenssi`, `idpPikakentat` …), joita P7 ei kutsu — testi vahtii.
- CF:t, jotka lukevat kenttiä Admin SDK:lla pelaajadokumentista: `rytmi_notif.js` + `tm_rytmi.js` (`review_viimeisin_*`), `valinta_viesti.js` (`vastuuhenkilo`), `tm_aloita_jakso.js` (kirjoittaa `vastuuhenkilo`). `seuran_kooste.js`, `tm_joukkuejakso.js`, `tm_sitoumus.js`, `valmennusapuri.js` tarkistetaan 1c-2:ssa.
- Selaimen kirjoituspaikat (1c-3): Masterin ja VP:n vastuuhenkilön vaihto, VP:n scout-arvio ja IDP-tallennus, review-kirjaukset (`_vpKirjoitaReview`, Masterin K1f, `tm_kt_keskustelu_sheet`), jakson sulun `pikakentat` (`tm_kt_arviointi`, `_kvkKirjoita`, `tmJaksofokusElinkaariKirjoita`).

## Kytkentäjärjestys (kun 1c-1 → 1c-3 on mergetty)

1. Merge 1c-1 (Rules v3.69 deployataan CI:llä main-pushista; tarkista ajo). Ei muutosta selaimessa.
2. Merge 1c-2, **`firebase deploy --only functions`** (lista 1c-2:n raportissa). CF:t osaavat jo lukea yhdistetyn muodon; CF:n lippuvakio = pois.
3. Merge 1c-3 (selaimen kirjoittajat, lippu pois).
4. Dry-run: `node scripts/migroi_sisainen_henkilokunta.js` → luvut PM:lle.
5. PM kuittaa. **Lippu päälle samassa vaiheessa selaimessa JA CF:ssä** (1c-2:n testi kaatuu, jos arvot eroavat) — oma pieni PR + Functions-deploy.
6. Migraatio heti perään: `--kirjoita` (+ `KIRJOITA`). Dry-run uudelleen: odotus `kopioi: 0`, `vanhentunut: 0`.
7. Smoke KPV-testipelaajilla (vain nimetyt): vastuuhenkilön vaihto, tukitarve, scout-arvio, katselmus.
8. Viikon kuluttua dry-run uudelleen → vasta sitten PR 2.

Peruutus: lippu pois (selain + CF) palauttaa luvun ja kirjoituksen yhdessä; pelaajadokumentti on koko ajan täydellinen. Ei toimi PR 2:n jälkeen.

---

# 1c-2: Cloud Functions (dual-read)

## Mitä muuttui
- **`functions/sisainen_luku.js`** (uusi): `yhdistaLista(db, sid, rivit)` (YKSI `collectionGroup('sisainen').where('seuraId','==',sid)` per seura) ja `yhdistaYksi(db, sid, pid, data)` (yksi dokumenttiluku). Yhdistys on sama `tmSisainenYhdista` kuin selaimessa. **Lippu pois → ei lisälukuja**, data palautetaan sellaisenaan. Lukuvirhe (indeksi/oikeudet) → vanhat kentät + `console.warn`, ajo ei kaadu.
- **Jaetut kopiot** (`functions/jaettu_lib.json`): `tm_sisainen.js` ja `tm_d3_itsearvio.js` (tm_sisainen vaatii d3-riippuvuuden). Synkattu `node scripts/sync_functions_lib.js`; tavu tavulta -testi vahtii.
- **`functions/index.js`**: kaksi kutsupaikkaa (alla).

## Lipun ratkaisu (CF ↔ selain)
CF:llä **ei ole omaa lippuvakiota**. `sisainen_luku.js` lukee lipun (`RYHMAT.henkilokunta.kirjoitus` ja `RYHMAT.jaksofokus_sisainen.kirjoitus`) samasta, `lib/tm_sisainen.js`:n tavu tavulta kopiosta. Peruste: kaksi erillistä arvoa voisi erota (esim. selain kytketty, Functions deployaamatta); yksi lähde ei voi. Seuraus: **lipun kytkentä = yksi muutos `lib/tm_sisainen.js`:ään + `sync_functions_lib.js` + Functions-deploy samassa vaiheessa** — ilman deployta CF jää vanhaan lippuun (lukee vanhat kentät, jotka dual-write pitää ajan tasalla; ei virhettä). Testi `tests/functions_sisainen_lippu.test.js` kaatuu, jos kopio eroaa libistä, CF:n tulkinta eroaa RYHMAT-lipuista, CF:lle ilmestyy oma lippuvakio tai kutsupaikka puuttuu.

## Kartoitus: mitkä CF:t koskevat kenttiä
| Tiedosto / funktio | Kenttä | Ratkaisu |
|---|---|---|
| `index.js` **`notifReviewEraantyy`** (ajastettu) + `rytmi_notif.js` / `tm_rytmi.js` | `review_viimeisin_pvm/-tyyppi` | **MUUTETTU**: `yhdistaLista` ennen `rytmiNotifit`:ia |
| `index.js` **`notifValintaOdottaa`** (onUpdate pelaajat) + `valinta_viesti.js` | `vastuuhenkilo` | **MUUTETTU**: `yhdistaYksi` vasta kun päätös on olemassa (ei turhia lukuja) |
| `tm_aloita_jakso.js` (`tmAloitaJaksoKirjoitus` kirjoittaa `vastuuhenkilo`) | — | **Ei CF-kirjoittajaa**: funktiota kutsuu vain selain (`tm_kt_jakso`, VP) → dual-write tulee 1c-3:ssa; CF:t eivät kirjoita yhtään henkilokunta-kenttää (testi vahtii) |
| `seuran_kooste.js` / `tm_seuran_kooste.js` | `idp_sitoumus_pvm`, `d3_pvm`, `d3_itsearvio.pvm`, `streak_paivitetty` | Ei S2-kenttiä (`idp_sitoumus_*` = pelaajan oma B-kenttä). **Huom (1d:stä periytyvä):** `d3_pvm` kirjoitetaan nykyään vain sisainen:iin (#1129) → `seuran_kooste.js:102` ei näe sitä; `oma`-käyttöastelista menettää valmentajan D3-päivän (itsearvion pvm kattaa pelaajan oman). **Korjattu erillisessä PR:ssä** (`yhdistaLista(…, { aina: true })` kooste-ajossa: D3 ei ole lipun takana). Deploy: `laskeSeuranKooste`, `laskeSeuranKoosteMa`, `paivitaSeuranKooste` |
| `tm_sitoumus.js`, `valmennusapuri.js`, `tm_joukkuejakso.js` | — | Ei S2- eikä jaksofokus-A-kenttiä (tm_sitoumus: `idp_sitoumus_*`; tm_joukkuejakso kirjoittaa `joukkueet`-dokumenttia). Ei muutosta |
| `tm_rytmi.js` | `jaksofokus_historia[].sulkutapa/suljettu`, `jaksofokus.alkoi/kesto_vk` | B-kenttiä, jäävät pelaajadokumenttiin → 1b-lippu ei vaikuta CF:iin |

## Deploy-ohje (Tero)
Muuttuvat funktiot: **`notifReviewEraantyy`** ja **`notifValintaOdottaa`** (index.js:n kautta). Muut funktiot eivät käytä muuttuneita moduuleja, mutta `firebase deploy --only functions` päivittää kaikki; kohdennettu: 
`firebase deploy --only functions:notifReviewEraantyy,functions:notifValintaOdottaa`.
Lippu on pois, joten deploy on käytökseltään neutraali (ei lisälukuja). **Deploy ennen lipun kytkentää** (selaimen kirjoittajat, 1c-3, kytketään vasta kun CF osaa lukea). Tarkista deployn jälkeen lokista, ettei `[sisainen_luku]`/`joukkolataus`-varoituksia tule (indeksi `sisainen.seuraId` on olemassa: firestore.indexes.json).

## Rules
Ei muutosta 1c-2:ssa (kasvukatto 2400 riviä ennallaan; nosto ei tarvittu — 1c-3:kin tarvitsee Rules-rivejä vain jos sulun/IDP:n kirjoitus vaatii uusia ehtoja; ei näytä tarvitsevan).
