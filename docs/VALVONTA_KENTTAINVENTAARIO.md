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
| `pelaajat` | `joukkue`, `joukkueNimi`, `joukkueId`, `joukkueet[]`, `joukkueetNimet[]` | CLAUDE.md §7.18; `joukkueetNimet` lisätty baseline-ajon perusteella (5,7 % dokumenteista) |
| `toimenpiteet` | `joukkue` (tila `korvattu` ohitetaan: historiaa, ei elävä viite) | `siivoa_toimenpide_tuplat.js`; baseline: 100 % |
| `kalenteri` | `joukkue` (id tai nimi), `joukkueet[]` ensisijaisia; `joukkue_nimi` toissijainen: luetaan vain jos tunnisteita ei ole, ja `A · B` pilkotaan (usean joukkueen tapahtuma, `tmKenelleDoc`); F1 lasketaan vain joukkuetapahtumista (`harjoitus`/`ottelu`, ei aamutreeni, ei kohde ryhmä/pelaajat/henkilökunta, `JOUKKUEPAKKO` lib/tm_ryhmat.js) | `lib/tm_kalenteri_malli.js`, `lib/tm_ryhmat.js` (`tmKenelleDoc`); seuratason tapahtuma ilman joukkuetta on sallittu |
| `viestit`, `mentoroinnit` | `joukkueId` | baseline: viestit 73 %, mentoroinnit 100 % (aiempi oletus `joukkue` oli väärä) |
| `kooste_joukkue` | dokumentin id `{joukkueId}_{vvvv-Www}` (joukkueId = id ilman loppua `_vvvv-Www`) | `functions/seuran_kooste.js`; kentällä `joukkue` ei ole arvoa |
| `harjoitusarvioinnit`, `havainnot` | `joukkue` (nimi tai id; Master kirjoittaa valinnan nimenä, varapolku id:nä) | baseline: harjoitusarvioinnit 100 % |
| ~~`seuranta_kuittaukset`~~ | pois E1:stä ja F1:stä: E5 (`valmentaja_uid` vs. `kayttajat`) kattaa | PM 10.11. |

**K2 poistettu (PR 2b):** avointen ehdotusten seurakohtainen raja 50 poistui, kun VP:n ehdotushaku ei enää leikkaa (#1242; `diag_hiljaiset_rajat.js`-rekisteri). K1 (yli 6 avointa joukkuetta kohden = tuplaepäily) säilyy.

**Kenttävahti F1 (PR 2):** viimeisen rivin kokoelmien kentät ovat arvauksia. Jos kokoelmassa on dokumentteja mutta alle 50 %:lla on yhtään oletetuista kentistä (tai 0 %:lla), tarkistus palauttaa VAROITUS: kenttä puuttuu (kokoelma, osuus) eikä hiljaista nollaa. `node scripts/valvonta_aja.js` tulostaa baseline-ajossa osion "Kenttävahti (F1)": jokaisen oletetun kentän osuuden, kokoelman todelliset joukkue-nimiset kentät ja rivin "LISÄÄ INVENTAARIOON?", kun datassa on kenttä, jota ei ole `VIITEKENTAT`-listalla. Inventaario (tämä taulukko ja `VIITEKENTAT`) korjataan sen mukaan; kokoelma, jossa kenttää ei kuulu olla (esim. viestit ilman joukkuetta), poistetaan listalta tai kirjataan sallittujen listaan perusteluineen.

## 3. Muut tarkistukset ja niiden kentät

- **E2** pelaaja-id: dokumentin id `pelaajat`-kokoelmassa. Aktiivisuus: `arkistoitu`, `poistettu`, `aktiivinen:false`, `tila` arkistoitu/poistettu.
- **E5** `seuranta_kuittaukset.valmentaja_uid` vs. `kayttajat`-dokumenttien id:t.
- **E6** `tunniste` / `palloId` / `palloID` (§7.13).
- **M2** `pelaajaId` / `pelaaja_id` kokoelmissa `seuranta_kuittaukset`, `toimenpiteet`, `viestit`.

## 4. PR 2c: baseline 2:n jälkeiset täsmennykset (10.11.)

- **E1c (kirjoitusasu):** orpo viite, joka on oman joukkueen id tai nimi kirjoitettuna eri tavalla (kirjainkoko, välimerkit, välilyönnit, diakriitit ohitetaan: `nimiAvain`), lasketaan E1b:n sijaan koodiin **E1c = WARN** (ei ERRORia, ei E1b:n 10 %:n massavirhettä). E1b jää oikeille orvoille (joukkuetta ei löydy mistään muodosta).
- **Aliaslista `functions/valvonta_aliakset.json`:** `{seura, alias, joukkue (id), perustelu ≥ 10 merkkiä, paiva}`. Aliaksella (normalisoitu `normJoukkue`) löytyvä viite on E1:ssä OK. Alias vaikuttaa vain, jos kohdejoukkue on olemassa kyseisessä seurassa. Lista kasvaa vain PR:llä. Luonnos kirjoitusasu-pareista: `! node scripts/diag_valvonta_luonne.js --alias-luonnos` (perustelu tyhjä → PM täyttää).
- **Paikallinen pariluettelo:** `diag_valvonta_luonne.js` tulostaa orpo arvo → lähin oma joukkue (nimet vain Teron paikallisessa tulosteessa; raportit, audit ja sähköposti sisältävät edelleen vain seura-id:n, koodin, kokoelman ja luvun).
- **K1 = suurin yhden joukkueen avointen ehdotusten määrä seurassa** (ei joukkueiden lukumäärä). Sibbo 8/73: 73 avointa ehdotusta, joista suurimman yksittäisen joukkueen alla 8 (WARN, kun ≥ 7). Ryhmäavain on nyt joukkueen id: id ja nimi (myös kirjoitusasuvariantti) ovat sama ryhmä; muut arvot normalisoidaan (`normJoukkue`). `diag_valvonta_luonne.js` K1-erittely näyttää ryhmäkoot ja yli 6:n ryhmien raaka-arvot.
- **Kalenterin F1 (41,8 %):** koodin mukaan joukkueettomat harjoitukset ja ottelut eivät ole seuratason tapahtumia: `tmTapahtumaVaatiiJoukkueen` (lib/tm_ryhmat.js, K35-12 #3a) vaatii joukkueen harjoitukselle ja ottelulle (poikkeus aamutreeni sekä ryhmä-/pelaaja-/henkilökuntakohde, jotka F1 jo rajaa pois), ja TASO-synkka (`functions/kalenteri_taso.js`) liittää joukkueen aina. Seuratason tapahtumat ovat muita tyyppejä (`seuran_tauko`, `muu`…). Joukkueeton harjoitus/ottelu on siis joko vanha dokumentti ennen K35-12:ta tai kirjoitettu kentällä, jota F1 ei tunne. F1 pysyy WARNina, kunnes `diag_valvonta_luonne.js`:n "Kalenterin F1" -erittely (tyyppi, lähde, kohde, ajankohta) ratkaisee asian.
- **E6:** `scripts/korjaa_testitunniste.js` (kirjoittava, kuiva-ajo oletus, vain KPV:n §10-testipelaaja) ja `scripts/diag_e6_vertailu.js` (vain luku: samannimiset dokumentit samassa seurassa).
