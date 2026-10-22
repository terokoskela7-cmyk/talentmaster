# Vaihe 1 (PR 1a + 1d): `sisainen/tiedot`-perusta + D3-jako — suunnitelma ja PR-kuvaus

**Kaista: Tero** (Rules + HTML + functions + scripts). **Draft-PR, ei mergeä, ei deployta.** Rules vain LUONNOKSENA (v3.66): Tero tarkistaa ja deployaa.
Tausta: pelaaja ja huoltaja lukevat koko `seurat/{sid}/pelaajat/{pid}`-dokumentin (R:1386), ja pelaaja voi kirjoittaa `d3_viimeisin`/`d3_taso`/`d3_pvm`/`d3_varmuus` (R:1408-1412). `d3_viimeisin.pisteet[dim]` sisältää samassa objektissa valmentajan, VP:n ja pelaajan pisteet → pelaaja voi **lukea ja väärentää** valmentajan D3-pisteet. PM:n järjestys: D3 ennen muita viipaleita (korkein riski).
Päätökset (Tero/PM 22.10.): `d3_taso`/`d3_pvm`/`d3_varmuus`/`d3_vp_pvm` = A (siirtyvät; demoseuran siemendataa osin, kirjoittajaa ei etsitä); `korjattu`/`korjaus` = C; `havainto_porras_ehdotus` kuuluu myöhempään viipaleeseen 1e (EI tässä); `tuoja`-korjaus on toisen agentin erillinen PR (ei kosketa Seura.html:n tuoja-rivejä).

## Mitä tässä PR:ssä tehdään
1. **`lib/tm_sisainen.js`** (pure): polku `seurat/{sid}/pelaajat/{pid}/sisainen/tiedot` (yksi dokumentti + `seuraId`), kenttäryhmärekisteri (kaikki A-ryhmät määritelty, vain `d3` kytketty), `tmSisainenYhdista` (dual-read: sisainen voittaa, vanha pelaajakenttä varalla), `tmSisainenJaa` (dual-write: A-kentät MOLEMPIIN), `tmSisainenKirjoita` (batch + varapolku jos Rules ei vielä salli), `tmSisainenLataaSeura` (yksi `collectionGroup('sisainen').where('seuraId','==',sid)`, ei N+1).
2. **`lib/tm_d3_itsearvio.js`** (pure; ainoa D3-lib jonka pelaaja-app lataa): pelaajan oma itsearvio `d3_itsearvio` `{pisteet:{dim:1..5}, pvm, jakso_alkoi}`, luku varapolulla vanhasta `d3_viimeisin.pisteet[dim].pelaaja` (vain `.pelaaja`), henkilökunnan yhdistys (itsearvio → `pisteet[dim].pelaaja`, `avg`, `d3_taso`, `d3_varmuus` lasketaan uudelleen).
3. **Rules-luonnos v3.66** (`tm_admin/firestore.rules`): `sisainen/{doc}` (luku `onOmaSeura` + SA; kirjoitus SA tai `onOmanJoukkueenValmentaja` + `seuraId == sid`), collectionGroup-sääntö `/{path=**}/sisainen/{d}` (luku `resource.data.seuraId == token.seuraId` tai SA), pelaajan hasOnly-listaan UUSI `d3_itsearvio` (muoto validoitu). **Vanhat `d3_*`-avaimet JÄÄVÄT pelaajalle sallituiksi siirtymän ajan (vanha Master/Sibbo + välimuistissa olevat vanhat Pelaaja-sivut); poisto vasta PR 2:ssa.** Indeksi: `firestore.indexes.json` fieldOverride `sisainen.seuraId` (COLLECTION_GROUP) — ilman sitä kysely hylätään tuotannossa (emulaattori ei pakota).
4. **Pelaaja_v7**: kirjoittaa VAIN `d3_itsearvio`; lukee itsearvion (varalla vanha `.pelaaja`); kortin PSY-osa pelaajan omasta itsearviosta (ei valmentajan pisteitä, ei vertailua; §7.22). Ei lataa `tm_sisainen.js`:ää.
5. **Master `_tallennaD3` + VP `_tallennaVpD3`**: DUAL-WRITE (`sisainen/tiedot` + vanha pelaajakenttä); Master ja VP lataavat sisaiset yhdellä kyselyllä ja yhdistävät muistiin → kaikki lukijat (tm_tukitavoitteet, tm_eerikkila_normit, radarit, kuilu) toimivat ennallaan. Kehitystyöpöytä (KT) käyttää samaa libiä jos lukee D3:a.
6. **functions/seuran_kooste.js**: `d3_pvm`-aktiivisuuspäivä + `d3_itsearvio.pvm` (pelaajan oma toiminto).
7. **Migraatioskripti `scripts/migroi_sisainen_d3.js`**: dry-run oletuksena, `--kirjoita` + vahvistus; ADC; idempotentti; vain lukumäärät. **EI AJETTU.**

## Toimintokartta (kuka kirjoittaa mitä minne → kuka lukee)
| Tieto | Kirjoittaja | Minne | Lukija |
|---|---|---|---|
| Pelaajan D3-itsearvio (B) | Pelaaja_v7 `_tallennaItsearvio` | `pelaajat/{pid}.d3_itsearvio` | Pelaaja_v7 (oma lomake, PSY-kortti); henkilökunta yhdistyksen kautta (`pisteet[dim].pelaaja`) |
| Valmentajan D3 (A) | Master `_tallennaD3` (dual) | `sisainen/tiedot.d3_viimeisin/_taso/_pvm/_varmuus` + vanha pelaajakenttä | Master/VP/libit yhdistetystä oliosta |
| VP:n D3-kalibraatio (A) | VP `_tallennaVpD3` (dual) | `sisainen/tiedot.d3_viimeisin` + `d3_vp_pvm` + vanha | VP-vertailu, kuilu-signaali |
| Seuran aktiivisuus | CF seuran_kooste | lukee `d3_pvm`, `d3_itsearvio.pvm` | Seuran pulssi |
| Vanha polku (siirtymä) | vanha Master/VP-välimuisti, vanha Pelaaja | `pelaajat/{pid}.d3_viimeisin` | yhdistys varapolulla |

## Siirtymä ilman katkoa
Koodi lukee `sisainen`:n ensin ja varalla vanhan; kirjoittaa molempiin. Jos Rules ei vielä salli `sisainen`-kirjoitusta (deploy-järjestys), `tmSisainenKirjoita` kirjoittaa vanhaan kenttään ja palauttaa `sisainenOhitettu` + `console.warn` (ei hiljaista virhettä: D3 tallentuu aina authoritatiiviseen vanhaan paikkaan). Seuraavat vaiheet: Tero ajaa migraation (dry-run → `--kirjoita`), tarkistus laskentaskriptillä, PR 2 poistaa vanhat kentät ja kiristää Rulesin (pelaajan `d3_*` pois).

## Testit
`tests/tm_sisainen.test.js`, `tests/tm_d3_itsearvio.test.js`, `tests/d3_jako_kirjoittajat.test.js` (P7 kirjoittaa vain `d3_itsearvio`; Master/VP kaksi paikkaa; pelaaja-app ei lataa tm_sisainen.js), `tests/migroi_sisainen_d3.test.js` (fake-Firestore), `tests/rules/sisainen.rules.test.js` (emulaattori).
