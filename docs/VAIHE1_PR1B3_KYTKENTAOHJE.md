# Vaihe 1 · PR 1b-3 — jakson elinkaari → sisainen/tiedot · kytkentäohje (Teron kaista)

Tila tässä PR:ssä: **lippu pois** (`RYHMAT.jaksofokus_sisainen.kirjoitus = false`). Selainkäytös ei muutu mergen jälkeenkään. Tämä ohje kertoo, missä järjestyksessä lippu kytketään ja migraatio ajetaan.

## Mitä PR tekee

| Kirjoituspaikka | Ennen | Nyt (lippu päällä) |
|---|---|---|
| Master `_mKirjoitaJaksofokus` (aloitus, vaihto, Viedä treeniin, fyysinen fokus, ohjelma, IDP-aktivointi, sulku-polku) | `update(upd)` | `tmJaksofokusElinkaariKirjoita`: YKSI batch (pelaaja + sisainen) |
| Master `_kvkKirjoita` (kevyt katselmus, jakson sulku, Hylkää valinta) | batch (pelaaja + reviewit) | sama batch + sisainen |
| VP `_vpJfKirjoita` (`elinkaari`-argumentti) ← `_vpKirjoitaJaksofokus`, `_vpAloitaJaksoTallenna` | `update(upd)` | sama |
| VP `_kvkKirjoita` | batch | sama |
| KT (`tm_kt_jakso` aloitus, `tm_kt_arviointi` sulku, `tm_kt_hylkaa`) | update / batch | sama |
| Pelaajadokumentti | — | **kirjoitetaan täsmälleen kuten ennen** (dual-write); A-osat poistuvat vasta PR 2:ssa |

Sisainen-puolen säännöt (`lib/tm_sisainen.js`):
- `jaksofokus_sisainen` **korvataan kokonaan** (`mergeFields`) joka jaksonvaihdossa ja sulussa; ei A-osia / jaksofokus null → kenttä poistetaan. Edellisen jakson A-osat eivät jää voittamaan dual-readissa.
- Mukana leima `jakso_avain` (`<alkoi>_<konsepti_avain>`). Dual-read **ohittaa** sisainen-osat, jos leima on eri jaksolta kuin julkinen `jaksofokus` (vanha välimuisti-Master voi vaihtaa jakson vain pelaajadokumenttiin).
- `historia_sisainen.<alkoi>_<konsepti_avain>` lisätään riveittäin (vanhoihin ei kosketa). Julkiselle riville jää B/C ja `lause`.
- Kaikki 9 A-kenttää: `osa_havainnot`, `osa_havainnot_vk` (1b-2 osapäivityksinä), `tavoite_tarkenteet`, `onnistumiskriteeri`, `linkitetyt`, `tavoite_alue`, `valitavoite_idx`, `poikkeama`, `oma_jakso` (kokonaisen jaksofokuksen mukana). `asetti` ja `lahde` jäävät pelaajadokumenttiin (PM 23.10.).
- Rules: **ei muutosta** (v3.68 kattaa; uusi Rules-testi vahvistaa `set + mergeFields + deleteField` -muodon valmentajalle, VP:lle, fysioterapeutille ja kieltää muilta).
- `permission-denied` (Rules ei käytössä) → uusi batch ilman sisainen:iä, `console.warn`; käyttäjä ei näe virhettä, data tallentuu vanhaan kenttään.

## Migraatioskriptin muutos (scripts/migroi_sisainen_jaksofokus.js)

Kaksi korjausta, jotka kytkentä tekee tarpeellisiksi (dry-run oletuksena ennallaan, vain kopioi, ei poista):
1. **Syvä täydennys** karttamaisille kentille (`osa_havainnot`, `osa_havainnot_vk`, `d3_snapshot`…). Dual-write luo sisainen:iin vain uudet lehdet; ilman täydennystä vanhemmat lehdet jäisivät piiloon, koska sisainen voittaa. Ristiriidassa sisainen voittaa (`eroaa`).
2. **Vanhentunut `jaksofokus_sisainen`** (leima ≠ nykyinen jakso) korvataan nykyisen jakson A-osilla. Jos nykyisellä jaksolla ei ole A-osia, skripti ei voi poistaa kenttää → raportoi `vanhentunut` (siivoaa PR 2).
Uusi tulosteluku: `vanhentunut`.

## Kytkentäjärjestys

Periaate: **lippu ensin, migraatio heti perään.** Jos migraatio ajetaan lipun ollessa pois, sisainen jää jälkeen jokaisesta uudesta kirjoituksesta ja voittaa silti luvussa.

1. **Merge tämä PR** (lippu pois). Varmista livenä bundlen vaihtuminen hash-vertailulla (`tm_sisainen.js?v=5`), älä merkkijonolla.
2. **Rules:** v3.68 on jo livenä (#1130). Tarkista CI:n `deploy-rules` -ajo main-pushille; tässä PR:ssä ei Rules-muutosta.
3. **Dry-run:** `node scripts/migroi_sisainen_jaksofokus.js` → luvut PM:lle (`kopioi`, `eroaa`, `vanhentunut`, `rivia_ilman_avainta`). Älä kirjoita vielä.
4. **PM kuittaa** luvut.
5. **Lippu päälle** (oma pieni PR, 1 rivi): `RYHMAT.jaksofokus_sisainen.kirjoitus: true` + `tm_sisainen.js ?v` ylös kolmessa sivussa + `node scripts/lib_versiot.js --kirjoita` + testin "lippu pois" -tarkistus käännetään. Tero mergeää.
6. **Odota ~15 min** (Pages/CDN) ja että henkilökunta lataa sivun uudelleen. Vanhat välilehdet kirjoittavat yhä vain pelaajadokumenttiin; leima suojaa jaksonvaihdoilta, migraatio paikkaa loput.
7. **Migraatio heti perään** (hiljaiseen aikaan, ei harjoitusaikaan): `node scripts/migroi_sisainen_jaksofokus.js --kirjoita` (+ `KIRJOITA`). Ajaa **uudelleen** samalla komennolla ilman `--kirjoita`: odotus `kopioi: 0`, `vanhentunut: 0`. `eroaa` > 0 = sisainen ja pelaajadokumentti ovat eri mieltä samasta lehdestä (sisainen voitti); PM päättää, onko syytä tutkia.
8. **Smoke KPV-testipelaajilla** (CLAUDE.md §10, vain nimetyt): Masterissa ja VP:ssä aloita jakso (tavoite_alue + linkitetyt), kirjaa havainto, sulje jakso uudella fokuksella; tarkista Firebase Consolen luku-näkymästä, että `sisainen/tiedot` seurasi (`jaksofokus_sisainen`, `historia_sisainen`) ja että pelaajan Tänään näyttää saman kuin ennen.
9. **Viikon kuluttua:** dry-run uudelleen, odotus `kopioi: 0`, `vanhentunut: 0`. Vasta sitten PR 2 (A-osien poisto pelaajadokumentista).

## Peruutus

Lippu pois (`kirjoitus: false`) + `?v` ylös palauttaa kirjoitukset pelkkään pelaajadokumenttiin, ja pelaajadokumentti on koko ajan täydellinen. **Luku ei kuitenkaan palaudu itsestään:** dual-read antaa sisainen:lle etusijan, joten lipun sulkemisen jälkeen sisainen alkaa jäädä jälkeen. Siksi peruutus on käytännössä "korjaa eteenpäin" (lippu pysyy päällä, virhe korjataan); jos lippu on pakko sulkea pidemmäksi aikaa, tarvitaan erillinen sisainen-jaksoosien tyhjennysskripti (ei tässä PR:ssä).

## Testit

- `tests/sisainen_jakso_elinkaari.test.js`: jako/leima, kirjoitus (lippu pois/päällä, batch, varapolku, `taydenna`), runtime **oikealla Master- ja VP-sivukoodilla** (vm + muistinvarainen Firestore): aloitus → havainto → sulku, lippu pois = identtinen vanhan Masterin kanssa, lippu päällä = yhdistetty luku täysi dokumentti joka vaiheessa (myös A-siivotulla pelaajadokumentilla), sekakäyttö (vanha Master + uusi sivu), migraation uudelleenajo; **P7 Tänään-snapshot** (sormenjälki, täysi vs A-siivottu pelaajadokumentti).
- `tests/rules/sisainen.rules.test.js`: +2 testiä (mergeFields + deleteField).
