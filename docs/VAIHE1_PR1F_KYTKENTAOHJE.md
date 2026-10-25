# Vaihe 1 · PR 1f — `idp_pelaaja/{vuosi}` (kytkentäohje)

Lähde: inventaarion löydös 7 + PM_VASTAUS kohta 2 (`idp_kausi` mukaan vaiheeseen 1). Ongelma: `idp_kausi/{vuosi}.tavoitteet[]` on pelaajan luettavissa ja sisältää A-sisältöä (`perustelu.teksti`, `kypsyysvaroitus`, `ankkuri_7030`, `mittari`, `lahto`, `tavoitearvo`, `arviot[].arvo`). Pelaaja-UI muuntaa ne §7.22-muotoon, mutta raakadata on luettavissa.

## Päätökset (Tero, 26.10.2026)

1. **Rules additiivisesti nyt; `idp_kausi` suljetaan pelaajalta VASTA siivouksessa lipun käännön jälkeen.** CI deployaa Rulesit main-pushista, joten `idp_kausi`n kavennus jo tässä sarjassa veisi nykyiseltä P7:ltä tavoitteen ja sitoumuksen heti mergessä (lippu on pois → P7 lukee vielä `idp_kausi`sta). Siivouksessa (oma PR + Rules-versio): (a) `idp_kausi` read vain henkilökunnalle (`onPelaajaItse`-haara pois), (b) pelaajan `pelaaja_sitoumus`-create/update-haarat pois `idp_kausi`sta, (c) raakatavoitteiden poisto ei koske `idp_kausi`ta (se on henkilökunnan A-data). **Järjestys: lippu päälle + migraatio + P7 lukee/kirjoittaa `idp_pelaaja`an → vasta sitten Rules-kavennus.**
2. **Sitoumus siirtyy `idp_pelaaja`an** (pelaaja kirjoittaa `pelaaja_sitoumus`en sinne; valmentajan vahvistus `vahvistettu_*` samaan paikkaan). **Dual-write `idp_kausi`in säilyy siivoukseen asti** (henkilökunnan lukijat, VP:n vahvistuspolku ja vanhat klientit toimivat ennallaan).
3. **Jako 1f-1 → 1f-2 → 1f-3, ei pinottuna** (jokainen `origin/mainin` päälle; seuraava aloitetaan vasta kun edellinen on mergetty).

## Tietomalli

`seurat/{sid}/pelaajat/{pid}/idp_pelaaja/{vuosi}` = `{ tavoitteet: [puhdistettu tavoite], pelaaja_sitoumus, paivitetty }`

Puhdistettu tavoite (`tmIdpTavoiteJaa`, `lib/tm_idp_pelaaja_dok.js`): `{ status, fokus:{nimi}, kuvaus, pelaajan_tavoite, perustelu:{pelilause}, mitattava, arviot:[{ win, pelaajan_note }] }` — **ei yhtään lukua** (testi vartioi: ei number-arvoja, ei avaimia mittari/lahto/tavoitearvo/ankkuri_7030/kypsyysvaroitus/arvo/pvm/luotu/perustelu.teksti). `hylatty` ja `vaihdettu` jätetään pois (P7 ei niitä näytä). Muut tilat (`ehdotettu`, `aktiivinen`, `jatkuu`, `saavutettu`) säilyvät, jotta P7:n valinta (`idpValitseKausidokista`, voimassa ennen ehdotusta) toimii identtisesti. `win` ja `mitattava` lasketaan samalla säännöllä kuin `tmPelaajaKaari`; `tmPelaajaKaari` lukee ne valmiina → §7.22-näkymä on **identtinen** raa'alla ja puhdistetulla tavoitteella (testi, 10 varianttia, fi + käännösavain-kääntäjä).

Henkilökunnan raaka tavoite pysyy `idp_kausi`ssa (A, vain henkilökunta siivouksen jälkeen).

## Rules v3.71 (tämä PR, additiivinen)

`idp_pelaaja/{vuosi}`: read = SA | oman seuran johto/valmentaja | **pelaaja itse | lapsen huoltaja**. create/update = SA | oman seuran valmentaja | johto; pelaaja itse vain `pelaaja_sitoumus` (+ `paivitetty`) eikä `vahvistettu_pvm` voi muuttua (sama vartija kuin `idp_kausi`ssa). delete = SA. `idp_kausi` **ennallaan** (testi vartioi: pelaaja lukee ja kirjoittaa sitoumuksensa vielä; huoltaja ei lue). Testit: `tests/rules/firestore.rules.test.js` ("IDP pelaajalle"), tekstitarkistus `tests/idp_pelaaja_dok.test.js`.

## Lippu ja apurit (`lib/tm_idp_pelaaja_dok.js`)

Lippu `TM_IDP_PELAAJA_DOK.LIPPU.kirjoitus` (**oletus POIS**) ohjaa kirjoituksen JA dual-readin. Lippu pois → kirjoitus täsmälleen kuten ennen (testi: yksi `idp_kausi`-set, ei `idp_pelaaja`a).

- `tmIdpPelaajaLisaa(kohde, db, sid, pid, vuosi, tavoitteet, deps)` / `tmIdpPelaajaVarapolulla(deps, fn)` — henkilökunnan tavoitekirjoitus (batch/transaktio; `mergeFields: ['tavoitteet','paivitetty']` → `pelaaja_sitoumus` säilyy; permission-denied → vanha polku + varoitus).
- `tmIdpSitoumusKirjoita(db, sid, pid, vuosi, sit, deps)` — sitoumus (pelaaja JA henkilökunnan vahvistus): `idp_kausi` + `idp_pelaaja` yhdessä batchissa; permission-denied → vain `idp_kausi`.
- `tmIdpPelaajaValitse(pelaajaData, kausiData, deps)` — dual-read: lippu päällä `idp_pelaaja` voittaa, puuttuessa `idp_kausi`.

## Jako

| PR | Sisältö | Tila |
|---|---|---|
| **1f-1** (tämä) | lib, Rules v3.71, testit, kytkentäohje; `tm_idp_pelaaja.js` ymmärtää `win`/`mitattava` (P7 `?v=2`, `sw_pelaaja` v156). Ei kirjoittajia/lukijoita kytketty. | draft |
| **1f-2** | Henkilökunnan kirjoittajat + lukijat: Master, VP, Kehitystyöpöytä/`tm_idp_lomake` kirjoittavat tavoitteen ja elinkaaren molempiin; sitoumuksen vahvistus (Master:6842, VP:7507, Kehitystyöpöytä:521) → `tmIdpSitoumusKirjoita`; henkilökunnan sitoumuslukijat (VP:7349/7369, `tm_kehitystilanne:113`) dual-readiin; migraatioskripti `scripts/migroi_idp_pelaaja.js` (dry-run oletus, ADC, kuten `migroi_sisainen_s4.js`). | — |
| **1f-3** | Pelaajan puoli: P7 `_p7LataaTavoite` lukee `tmIdpPelaajaValitse`n kautta, `_p7TallennaSitoumus` (:3105) → `tmIdpSitoumusKirjoita`; `tm_idp_pelaaja_dok.js` P7:n skripteihin + `sw_pelaaja`; Vanhempi_v2 ei lue `idp_kausi`a (ei muutosta, vain Rules-oikeus on valmiina). | — |

## Kytkentäjärjestys (kun 1f-1 → 1f-3 on mergetty)

1. Merge 1f-1 (Rules v3.71 deployataan CI:llä main-pushista; tarkista ajo). Ei muutosta selaimessa.
2. Merge 1f-2, sitten 1f-3. Lippu pois.
3. Dry-run: `node scripts/migroi_idp_pelaaja.js` → luvut PM:lle (Teron kaista, ADC; `! node …`).
4. PM kuittaa. **Lippu `TM_IDP_PELAAJA_DOK.LIPPU.kirjoitus` päälle** (lib-muutos, oma pieni PR). Lippuja ei käännetä samassa PR:ssä.
5. Migraatio heti perään: `--kirjoita`. Dry-run uudelleen: odotus `kopioi: 0`.
6. Smoke KPV-testipelaajilla: tavoitteen asetus (VP/Master) → P7 "Sinun tavoite" + matka; sitoumus (pelaaja) → VP näkee; vahvistus (VP) → P7 näyttää "valmentaja vahvisti"; huoltaja ei näe lukuja.
7. **Siivous (oma PR + Rules-versio):** `idp_kausi` suljetaan pelaajalta, pelaajan `pelaaja_sitoumus`-kirjoitus `idp_kausi`ssa pois (ks. päätös 1).

## Huomiot

- **Huoltaja** ei lue `idp_kausi`a eikä `idp_pelaaja`a UI:ssa (Vanhempi_v2 ei viittaa kumpaankaan); Rules-lukuoikeus `idp_pelaaja`an on varattu tulevalle huoltajanäkymälle.
- **Rules-testit:** huoltajan luku vaatii seed-pelaajan (`huoltajaEmail`) — huoltajan token ei sisällä rooli-claimia.
