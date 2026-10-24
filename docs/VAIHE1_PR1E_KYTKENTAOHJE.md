# Vaihe 1 · PR 1e (viipale S4) — ADAR-sisäiset, arviointikooste, kypsyys, talentti/terveys, signaali → sisainen/tiedot · kytkentäohje (Teron kaista)

Jaettu kolmeen PR:ään (PM hyväksyi 24.10.): **1e-1 perusta + tuoja-korjaus** (tämä) → **1e-2 CF:t** → **1e-3 selain**. Jokainen PR tehdään `origin/mainin` päälle (ei pinoamista). **Yksi yhteinen lippu `RYHMAT.s4.kirjoitus`** (oletus pois) ohjaa kaikkia viittä ryhmää — kirjoitusta JA dual-readia.

## Kolme kytkettävää lippua (kaikki pois, kytketään samassa järjestyksessä)

| # | Lippu (`lib/tm_sisainen.js`) | Kattaa | Kytkentä-PR |
|---|---|---|---|
| 1 | `RYHMAT.jaksofokus_sisainen.kirjoitus` | jaksofokus + historia (S1, #1132) | oma pieni PR + Functions-deploy |
| 2 | `RYHMAT.henkilokunta.kirjoitus` | henkilökunnan kentät (S2, 1c) | oma pieni PR + Functions-deploy |
| 3 | `RYHMAT.s4.kirjoitus` | adar_sisainen · arviointi · kypsyys_sisainen · talentti_terveys · signaali (S4, 1e) | oma pieni PR + Functions-deploy |

`functions/sisainen_luku.js` (`liputPaalla`) lukee kaikki kolme samasta jaetusta kopiosta (`functions/tm_sisainen.js` = `lib/tm_sisainen.js`); CF:llä ei ole omaa lippua. Opts-ohitukset testeille: `jaksofokus`: `deps.kirjoitus`, `henkilokuntaKirjoitus`, `s4Kirjoitus`.

## 1e-1: mitä tässä PR:ssä on

- **Rekisteri** (`lib/tm_sisainen.js`): viisi `s4`-ryhmää (`erillinen`, `kytketty:false`, ei omia lippuja) + lippuobjekti `RYHMAT.s4`.
  - **adar_sisainen** (12 + 1): `adar_arvioijat`, `adar_arvioijia`, `adar_yhtenevyys`, `adar_yhtenevyys_taso`, `adar_dim_konsensus`, `adar_vahvin`, `adar_tilanne_jakauma`, `adar_vaihe_jakauma`, `adar_otos_jakauma`, `adar_ottelupohja`, `adar_luotettavuus`, `havainto_viimeisin_pvm` + johdettu `havainto_porras_hist`.
  - **arviointi** (6): `arviointi_havaittu`, `arviointi_pvm`, `arviointi_kehys`, `arviointi_kooste`, `potentiaali_kooste`, `arviointi_kooste_pvm`.
  - **kypsyys_sisainen** (14): `kasvutahti_cm_v`, `kasvutahti_vyohyke`, `maturity_offset`, `kehitysvaihe_kaista`, `kronologinen_ika`, `phv_raaka`, `phv_huom`, `phv_ongelma`, `phv_ilmoitettu_ph`, `phv_ei_mitattu` + vanhempien pituudet `isa_pituus_cm`, `aiti_pituus_cm`, `vanhempi_pituus_pvm`, `vanhempi_pituus_puuttuu` (ryhmä `perhe` yhdistetty tähän).
  - **talentti_terveys** (10): `talenttiOhjelma`, `talenttiTaso`, `talenttiAlku`, `talenttiAktivoi`, `talenttiPaattyi`, `kaytettavyys`, `loukkaantuminen_tyyppi/_alue/_pvm`, `paluu_arvio`.
  - **signaali** (1, jaettu arvo): ks. alla.
  - **JÄÄVÄT pelaajadokumenttiin (B)**: `adar_viimeisin`, `adar_edellinen`, `adar_heikoin`, `havainto_porras`, `phv_tila`, `phv_tila_koodi`, `phv_ika`, `biologinenIka_viimeisin`. Testi vahtii, ettei yksikään ole S4-listalla.
- **signaali**: `phv` jää pelaajalle (P7 `_signaaliLabel`). Talenttisignaalit `xfactor`, `x-factor`, `hidden-gem` → sisainen. **Lisäys briiffiin: myös `hidden`** — Master_v16 käyttää arvoa `'hidden'` (Piilohelmi) ja VP/Master lukevat sen; ilman sitä Piilohelmi-signaali jäisi pelaajan luettavaksi. `tmSignaaliJaa(arvo)` = puhdas jako; uusia kirjoittajia ei ole → migraatio tekee jaon. Lukijat saavat yhdistetyn muodon dual-readista (sisainen voittaa lipun ollessa päällä).
- **havainto_porras_ehdotus.hist**: P7:n lukija (`_ehdHist`, Pelaaja_v7.html:6577) käyttää vain `hist.length` (onko ≥ 3 havaintoa → "uusi taito" -sanatila, §7.22); `ehdotus.valmis/seuraava` menee rubriikille (`adarCtx.ehdotus`). Pelaaja ei näe raakapisteitä → **ratkaisu: hist (≤ 3 raakapistettä 1–3) siirtyy `sisainen.havainto_porras_hist`:iin, pelaajalle jää `{valmis, seuraava, hist_n}`** (`tmPorrasEhdotusJaa`). Dual-write-aikana pelaajadokumentti pitää myös `hist`:in (vanha muoto). Dual-read palauttaa `ehdotus.hist`:in staffille (VP, `tm_naytto_lohkot`).
  - **Seuraa 1e-3:ssa**: P7 lukee `hist_n ?? hist.length`; kirjoittajat (`tm_pelialy_yksilo.js` → Master `paivitaAdarPikakentat`, Pikakortti) kirjoittavat `hist_n`. **PR 2:n siivous laskee `hist_n`:n vanhoille dokumenteille ennen `hist`:in poistoa pelaajadokumentista.**
- **Kirjoitusapuri**: `tmS4Osa` / `tmS4Kirjoita` / `tmS4Lisaa` / `tmS4Varapolulla` = sama nelikko kuin henkilokunta (`_erillinen`-tehdas, yksi toteutus). Lippu pois → null / pelkkä pelaajan update.
- **Rules v3.70** (ADDITIIVINEN — ei kiristä mitään):
  - **Testivastaava** saa kirjoittaa `sisainen/tiedot`:iin vain kasvumittauksen avaimet (`kasvutahti_cm_v`, `kasvutahti_vyohyke`, `maturity_offset`, `kehitysvaihe_kaista`, `kronologinen_ika`, `phv_raaka`, `phv_huom`, `phv_ongelma`) + `seuraId`/`paivitetty`. Testaus_v9 kirjoittaa nämä pelaajadokumenttiin jo nyt. Mikään muu S4-ryhmä, d3, henkilokunta tai jaksofokus ei.
  - **Johto** (vp, utj, seurasihteeri) saa kirjoittaa vain `tuojaUid` + `seuraId`/`paivitetty` (Seuran pelaajaluonti/Excel-tuonti).
  - Molemmissa vaaditaan, että **vähintään yksi sallittu avain muuttuu** (`hasAny`): tyhjä muutosjoukko (no-op-merge) ei oikeuta kirjoitukseen. Löytyi emulaattoritestissä: ilman tätä seurasihteeri olisi voinut tehdä no-op-mergen.
  - Lukija-rajaus ennallaan: `sisainen/tiedot` luetaan vain SA | oman seuran henkilökunta. **Huom (GDPR art. 9):** `loukkaantuminen_*` ja `kaytettavyys` siirtyvät samaan dokumenttiin kuin muut → lukija on **kaikki oman seuran henkilökuntaroolit** (myös seurasihteeri ja testivastaava), ei vain terveys-/valmennusroolit. Kenttätason lukurajaus vaatisi oman alikokoelman/dokumentin — ei tässä PR:ssä; PM päättää, halutaanko `sisainen/terveys` erikseen.
- **Migraatio** `scripts/migroi_sisainen_s4.js` (dry-run oletuksena, `--kirjoita` + `KIRJOITA`, idempotentti, vain kopioi; samat kolme sääntöä kuin henkilokunta: puuttuva yksikkö kopioidaan · sisainen voittaa · vanhentunut korvataan). Päivämäärälliset yksiköt: adar (`havainto_viimeisin_pvm`), arviointi (`arviointi_kooste_pvm` | `arviointi_pvm`). Signaali: vain talenttiarvot; `phv` ei kopioidu. `hist` → `havainto_porras_hist`. Tuloste vain lukumääriä (ei nimiä/id:itä/terveystietoa). **Ei ajettu.**
- **tuoja-korjaus (ei lippua)**:
  - Seura kirjoittaa `tuojaUid`:in (uid, ei sähköpostia) `sisainen/tiedot`:iin molemmissa luontipaikoissa (`_tmKirjaaTuoja`: lisäys-lomake + Excel-tuonti). `tuoja`-sähköposti ei ole pelaajadokumentissa enää (poistettu jo aiemmin; testi vahtii). Virhe `sisainen`-kirjoituksessa ei peruuta pelaajan luontia (metatieto) → `console.warn`.
  - Testaus_v9: `mittaaja: email` pois `biologinen_ika`-dokumentista, `kirjaaja: uid` pois `testitulokset`-dokumentista. Excel_Tuonti, Testituonti_Master, Harjoitettavuus_Lomake_v4, `lib/tm_pikakirjaus.js`: `tuojaUid`/`tallensiUid` pois. Syy: näitä alikokoelmia (`testitulokset`, `biologinen_ika`, `testitapahtumat/*/tulokset`) lukevat pelaaja ja huoltaja. Vanhojen dokumenttien siivous PR 2:ssa. Kenttien lukijoita ei ollut (grep).
  - `lib/tm_pikakirjaus.js`: `?v` 6 → 7 (Master, VP). `lib/tm_sisainen.js`: `?v` 8 → 9 (Master, VP, Kehitystyopoyta).

## Havainnot lukijoista (1e-2/1e-3:a varten)

- **Pelaaja/Vanhempi (HTML)** eivät viittaa yhteenkään siirrettävään S4-kenttään (grep-portti `tests/sisainen_s4.test.js`). Jaetut libit joissa S4-kenttänimiä: `tm_phv_tila.js` (`bio.maturity_offset` = `biologinenIka_viimeisin`-alaolio → B), `tm_tukitavoitteet.js` + `tm_idp.js` (`arviointi_havaittu/_pvm`; henkilökunnan ehdotinlogiikka, P7 ei kutsu kandidaattifunktioita), `tm_eerikkila_normit.js` (`talenttiOhjelma`, henkilökunnan KPI), `tm_pelialy_yksilo.js` (`adar_*`-pikakenttien LASKENTA; kirjoittajat Master/Pikakortti). `TalentMaster_Rekisterointi_Suostumus.html` LÄHETTÄÄ vanhempien pituudet CF:lle (`vahvistaSuostumus`), ei lue.
- **Kirjoittajat** (1e-2 CF): `arviointikertaOnWrite` (index.js:2329) → arviointi-ryhmä; `vahvistaSuostumus` (index.js:1226–1245) → vanhempien pituudet. (1e-3 selain): Testaus_v9 kasvumittaus (T9:3252–3262), Master/Pikakortti ADAR-pikakentät, Excel-/Testituonti (phv_raaka/phv_huom/phv_ongelma, talentti*), loukkaantumis-/käytettävyyskirjaukset, `tm_kt_*` (kehitysvaihe_kaista).
- **Lukijat** (dual-read hoitaa): VP:3997, `tm_seuraava_askel.js:150`, `tm_kehitystilanne.js:178`, `tm_eerikkila_normit.js:1104` (signaali), VP:6376 + `tm_naytto_lohkot.js:226` (ehdotus.hist).

## Kytkentäjärjestys (kun 1e-1 → 1e-3 on mergetty)

1. Merge 1e-1 (Rules v3.70 deployataan CI:llä main-pushista; tarkista ajo). Ei muutosta selaimessa, paitsi tuoja-korjaus (Seura, Testaus, Excel).
2. Merge 1e-2, **`firebase deploy --only functions`** (lista 1e-2:n raportissa). Lippu pois.
3. Merge 1e-3 (selaimen kirjoittajat + P7 `hist_n`-luku, lippu pois).
4. Dry-run: `node scripts/migroi_sisainen_s4.js` → luvut PM:lle. (Teron kaista, ADC.)
5. PM kuittaa. **Lippu `RYHMAT.s4.kirjoitus` päälle samassa vaiheessa selaimessa JA CF:ssä** — oma pieni PR + Functions-deploy. Kolmen lipun yhteinen järjestys: jaksofokus → henkilokunta → s4 (kukin oma PR, väli smoke).
6. Migraatio heti perään: `--kirjoita` (+ `KIRJOITA`). Dry-run uudelleen: odotus `kopioi: 0`, `vanhentunut: 0`.
7. Smoke KPV-testipelaajilla (vain nimetyt): kasvumittaus (testivastaava), ADAR-havainto (porrasehdotus + Pelaaja_v7 "uusi taito"), arviointi, talenttiohjelman aktivointi, signaali.
8. Viikon kuluttua dry-run uudelleen → vasta sitten PR 2.

Peruutus: lippu pois (selain + CF) palauttaa luvun ja kirjoituksen yhdessä; pelaajadokumentti on koko ajan täydellinen. Ei toimi PR 2:n jälkeen.
