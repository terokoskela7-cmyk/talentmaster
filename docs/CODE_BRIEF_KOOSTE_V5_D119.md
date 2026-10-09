# CODE BRIEF · Kooste v5 — Käyttö 7 pv = harjoite merkitty (D119)

**Kaista: Tero** (`functions/`). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Päätös:** D119 lukittu 9.10.2026 (Tero). Se muuttaa D65:n Käyttö-määritelmän: pulssin Käyttö-sarake laskee pelaajat, jotka **merkitsivät harjoitteen tehdyksi** 7 päivän aikana. Viikkokatsaus näkyy vain Viikkokatsaus-sarakkeessa. Design: `docs/design/idp-v2/23_seuran_pulssi_v2.html` (D119).
**Ajoitus:** ennen S2-näkymää. S2:n Käyttö-sarake lukee tämän PR:n kentän.

## Mitä tehdään

Kooste v5 lisää **uudet kentät** ja jättää vanhat ennalleen. Vanhaa `n_toiminto_7`:ää ei poisteta eikä muuteta, joten PM voi verrata lukuja oikealla datalla ennen kuin näkymä otetaan käyttöön.

| Kenttä (joukkue + `yhteensa`, uniikit pelaajat) | Merkitys |
|---|---|
| `n_harjoite_7` | pelaajia, joilla on harjoitekirjaus 7 pv:n ikkunassa (D119, pulssin Käyttö) |
| `n_harjoite_30` | sama 30 pv:n ikkunassa (PM:n datatarkistus, ei näkymään) |

**Harjoitekirjaus** = `seurat/{s}/pelaajat/{p}/kirjaukset/{pvm}`, jossa kaikki seuraavat pätevät:
- `tehty === true`
- `lahde === 'pelaaja'` (Pelaaja_v7:n kirjoittama; ei valmentajan, `catapult`/`polar`/`taso`-lähteitä)
- `kirjaustapa !== 'auto'` (`heti` ja `jalkikateen` kelpaavat)
- `tyyppi` on `T`, `D`, `S` tai `P` (ohjelman harjoite). Ei `jalkapallo`, `muu_urheilu`, `lepo`.
- Dokumentti, jossa on vain `jakso_kuittaus` (U12-huoltaja) ilman `tehty`-kenttää, ei ole harjoitekirjaus.
- `takautuva`-alikenttä olemassa olevassa päivädokumentissa: lasketaan, jos `takautuva.tyyppi` on T/D/S/P (päivä = dokumentti-id).

Päivä = dokumentti-id (`YYYY-MM-DD`, Helsingin päivä), ikkuna sama kuin nykyisillä mittareilla (`arvioHetki`, `IKKUNA_PV`). Kirjaukset luetaan jo `keraaOma`-silmukassa: **ei uusia kyselyjä**, vain uusi lista `p.harjoite` samasta snapshotista.

## Ennallaan
- `n_toiminto_7`, `TOIMINTO_LAHTEET`, `n_perhe_kuittaus_7` (Leikkijä-rivi D71 lukee yhä tätä), `n_aktiivinen_*`, RSVP-säännöt (S1.1).
- D69/D70-kynnykset koskevat Käyttöä kuten ennen (näkymän asia, ei koosteen).
- Ei Rules-muutosta, ei uutta funktiota, ei uutta indeksiä.

## Tekninen
- `lib/tm_seuran_kooste.js` + `functions/tm_seuran_kooste.js`: sync-vartija pitää ne samoina. Otsakkeeseen "VERSIO 5" ja kenttien kuvaus.
- `functions/seuran_kooste.js`: `keraaOma` kerää `p.harjoite` kirjaukset-snapshotista. Lisää `HARJOITE_TYYPIT = ['T','D','S','P']` exportteihin.
- Kenttien nimet täsmälleen kuten yllä (S2-näkymä lukee ne).

## Testit (`functions/test/seuran_kooste.test.js` + lib-testi)
1. `tehty` T-kirjaus ikkunassa → `n_harjoite_7` = 1, `n_toiminto_7` ei muutu.
2. Pelkkä viikkokatsaus → `n_harjoite_7` = 0, `n_toiminto_7` = 1.
3. `lahde: 'catapult'`, `kirjaustapa: 'auto'`, `tyyppi: 'lepo'` ja `'jalkapallo'` → ei laske.
4. Dokumentti, jossa vain `jakso_kuittaus` → ei harjoite, mutta `n_perhe_kuittaus_7` ennallaan.
5. `takautuva` T → laskee.
6. 8 päivää vanha kirjaus → `n_harjoite_7` = 0, `n_harjoite_30` = 1.
7. Pelaaja kahdessa joukkueessa → molempiin, `yhteensa` kerran (§7.18).
8. Aikavyöhyke: aja testit myös `TZ=UTC` (CI on UTC).

Aja koko sarja (myös `functions/`) ja raportoi PR:ssä **sekä `Test Files`- että `Tests`-rivi**.

## Deployn jälkeen (Tero)
Tero ajaa koosteen päivityksen ("Päivitä nyt" / `paivitaKasittelija`) KPV:lle, Sibbolle ja SJK:lle. PM lukee `n_harjoite_30` / `n_pelaajat` ja `n_harjoite_7` vs `n_toiminto_7`. Jos harjoitekirjauksia ei juuri ole, S2:n Käyttö-sarake käyttää 1.12. asti `n_toiminto_7`:ää ja vaihtuu R1:ssä (PM päättää datasta, kirjataan 07:ään).

## Ei tässä
- S2-näkymän muutokset (oma PR, `docs/CODE_BRIEF_S2_SEURAN_PULSSI.md`).
- `n_toiminto_7`:n poisto (vasta kun S2 ei enää lue sitä).
- Valmentajan "huomioitu"-reaktio (D119: suunnitellaan erikseen valmentajakorttiin).
