# Valvonta: `seuraId`- ja joukkueviitekenttien inventaario (projekti 07 / PR 1)

Tehty koodista (`grep` kirjoituskohdista, `tm_admin/firestore.rules`, `firestore.indexes.json`), 10.11.2026. Tuotantoa ei ole luettu. Lähde valvonnan tarkistuksille E1 ja E3 (`lib/tm_valvonta.js`: `VIITEKENTAT`, `SEURAID_KOKOELMAT`).

## 1. Missä `seuraId` tallentuu dokumenttiin

| Kokoelma | Polku | Kirjoittaja | Valvonta |
|---|---|---|---|
| `kayttajat` | `seurat/{sid}/kayttajat/{uid}` | `functions/kayttajahallinta.js` (`luoKayttaja`, rivi ~165: `rooli, seuraId`) | **E3** |
| `sisainen` | `seurat/{sid}/pelaajat/{pid}/sisainen/*` | `functions/tm_sisainen.js` (rivit 209, 224: `seuraId: sid`); indeksi `sisainen.seuraId` | **E3** |
| `havainnot` (ADAR) | `seurat/{sid}/pelaajat/{pid}/havainnot/*` ja `seurat/{sid}/havainnot` | ADAR Pikakortti (selain), kenttä `seuraId` tulee `seura_id`-arvosta | **E3** |
| `huoltajakutsut` | ylätaso | `functions/huoltajakutsu.js` (`seuraId, pelaajaId`) | Ei polkua, johon verrata. Ei v1:ssä |
| `valmennusapuri_budjetti` | ylätaso | `functions/valmennusapuri.js` (rivi ~891) | Ei v1:ssä |
| `laskutus`-snapshotit | ylätaso | `functions/laskutus_kuukausi.js`, `tm_laskutus.js` | Ei v1:ssä |
| kalenterin iCal-tilaukset | ylätaso | `functions/kalenteri_ical.js` | Ei v1:ssä |
| `players` (Solo) | ylätaso | `seuraId: null` (Solo), täyttyy PlayerCode-sillalla | Ei seurapolkua |
| `kaaviot` | `seurat/{sid}/kaaviot` | `lib/tm_kaavio_ui.js`: UI lisää `seuraId`-kentän luonnokseen (rivi ~1036); **tallentuuko dokumenttiin, tarkistetaan PR 2:n ajossa** | Ei v1:ssä |

Muissa seurapolun alla olevissa kokoelmissa (`toimenpiteet`, `pelaajat`, `kalenteri`, `viestit`, `seuranta_kuittaukset`, `harjoitusarvioinnit`…) **ei ole `seuraId`-kenttää**: seura ilmenee vain polusta. Siksi E1 vertaa joukkueviitettä seuran joukkueisiin, ei `seuraId`:tä.

Rules vertaa `seuraId`:tä vain Solo-pelaajan `players`-päivityksessä (`request.resource.data.seuraId == resource.data.seuraId`). Seurapolun dokumentin kentän ja polun ristiriitaa ei estä mikään, joten E3 on datatason tarkistus.

## 2. Joukkueviitekentät (E1)

`VIITEKENTAT` kokoelmittain. Viite on nimi tai id; vertailu tehdään normalisoituna (`normJoukkue`: kirjainkoko, `_`/`-` → väli) ja id:llä.

| Kokoelma | Kentät | Lähde |
|---|---|---|
| `pelaajat` | `joukkue`, `joukkueNimi`, `joukkueId`, `joukkueet[]` | CLAUDE.md §7.18, `laajuus_vieraat_toimenpiteet.js` |
| `toimenpiteet` | `joukkue` | `siivoa_toimenpide_tuplat.js` |
| `kalenteri` | `joukkue`, `joukkue_nimi`, `joukkueet[]` | `lib/tm_kalenteri_malli.js` (rivi 47) |
| `seuranta_kuittaukset` | `joukkue` | laajuusskripti |
| `viestit`, `kooste_joukkue`, `havainnot`, `harjoitusarvioinnit`, `mentoroinnit` | `joukkue` | **oletus**, ei vielä varmistettu koodista |

**Avoin (PR 2):** viimeisen rivin kokoelmien kentät varmistetaan baseline-ajossa. Jos kenttä on väärä, E1 antaa 0 ilman virhettä, joten PR 2:n ajossa tarkistetaan, että jokaisessa kokoelmassa on vähintään yksi dokumentti, jossa jokin `VIITEKENTAT`-kenttä esiintyy.

## 3. Muut tarkistukset ja niiden kentät

- **E2** pelaaja-id: dokumentin id `pelaajat`-kokoelmassa. Aktiivisuus: `arkistoitu`, `poistettu`, `aktiivinen:false`, `tila` arkistoitu/poistettu.
- **E5** `seuranta_kuittaukset.valmentaja_uid` vs. `kayttajat`-dokumenttien id:t.
- **E6** `tunniste` / `palloId` / `palloID` (§7.13).
- **M2** `pelaajaId` / `pelaaja_id` kokoelmissa `seuranta_kuittaukset`, `toimenpiteet`, `viestit`.
