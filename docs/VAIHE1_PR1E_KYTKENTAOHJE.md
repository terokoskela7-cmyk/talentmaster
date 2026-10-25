# Vaihe 1 · PR 1e (viipale S4) — ADAR-sisäiset, arviointikooste, kypsyys, talentti, signaali → sisainen/tiedot; terveys → sisainen/terveys · kytkentäohje (Teron kaista)

Jaettu kolmeen PR:ään (PM hyväksyi 24.10.): **1e-1 perusta + tuoja-korjaus** (tämä) → **1e-2 CF:t** → **1e-3 selain**. Jokainen PR tehdään `origin/mainin` päälle (ei pinoamista). **Yksi yhteinen lippu `RYHMAT.s4.kirjoitus`** (oletus pois) ohjaa kaikkia kuutta ryhmää — kirjoitusta JA dual-readia.

## Kolme kytkettävää lippua (kaikki pois, kytketään samassa järjestyksessä)

| # | Lippu (`lib/tm_sisainen.js`) | Kattaa | Kytkentä-PR |
|---|---|---|---|
| 1 | `RYHMAT.jaksofokus_sisainen.kirjoitus` | jaksofokus + historia (S1, #1132) | oma pieni PR + Functions-deploy |
| 2 | `RYHMAT.henkilokunta.kirjoitus` | henkilökunnan kentät (S2, 1c) | oma pieni PR + Functions-deploy |
| 3 | `RYHMAT.s4.kirjoitus` | adar_sisainen · arviointi · kypsyys_sisainen · talentti · terveys (oma dokumentti) · signaali (S4, 1e) | oma pieni PR + Functions-deploy |

**Yhteinen kytkentäjärjestys (kukin oma pieni PR + Functions-deploy, väli smoke KPV-testipelaajilla):** 1 → `jaksofokus_sisainen` (S1) → 2 → `henkilokunta` (S2) → 3 → `s4` (S4). Kukin lippu ohjaa kirjoituksen JA dual-readin; peruutus = lippu pois (selain + CF yhdessä). Edellytys jokaiselle: kyseisen viipaleen kirjoittaja- ja lukija-PR:t mergetty (S4: 1e-1 → 1e-2 → 1e-3a → 1e-3b), Rules deployattu, migraation dry-run luettu. Lippuja EI käännetä samassa PR:ssä.

`functions/sisainen_luku.js` (`liputPaalla`) lukee kaikki kolme samasta jaetusta kopiosta (`functions/tm_sisainen.js` = `lib/tm_sisainen.js`); CF:llä ei ole omaa lippua. Opts-ohitukset testeille: `jaksofokus`: `deps.kirjoitus`, `henkilokuntaKirjoitus`, `s4Kirjoitus`.

## 1e-1: mitä tässä PR:ssä on

- **Rekisteri** (`lib/tm_sisainen.js`): kuusi `s4`-ryhmää (`erillinen`, `kytketty:false`, ei omia lippuja; `terveys` omalla dokumentilla) + lippuobjekti `RYHMAT.s4`.
  - **adar_sisainen** (12 + 1): `adar_arvioijat`, `adar_arvioijia`, `adar_yhtenevyys`, `adar_yhtenevyys_taso`, `adar_dim_konsensus`, `adar_vahvin`, `adar_tilanne_jakauma`, `adar_vaihe_jakauma`, `adar_otos_jakauma`, `adar_ottelupohja`, `adar_luotettavuus`, `havainto_viimeisin_pvm` + johdettu `havainto_porras_hist`.
  - **arviointi** (6): `arviointi_havaittu`, `arviointi_pvm`, `arviointi_kehys`, `arviointi_kooste`, `potentiaali_kooste`, `arviointi_kooste_pvm`.
  - **kypsyys_sisainen** (14): `kasvutahti_cm_v`, `kasvutahti_vyohyke`, `maturity_offset`, `kehitysvaihe_kaista`, `kronologinen_ika`, `phv_raaka`, `phv_huom`, `phv_ongelma`, `phv_ilmoitettu_ph`, `phv_ei_mitattu` + vanhempien pituudet `isa_pituus_cm`, `aiti_pituus_cm`, `vanhempi_pituus_pvm`, `vanhempi_pituus_puuttuu` (ryhmä `perhe` yhdistetty tähän).
  - **talentti** (5, `sisainen/tiedot`): `talenttiOhjelma`, `talenttiTaso`, `talenttiAlku`, `talenttiAktivoi`, `talenttiPaattyi`.
  - **terveys** (5, **oma dokumentti `sisainen/terveys`**, PM 25.10. / #1137-katselmointi; GDPR art. 9): `kaytettavyys`, `loukkaantuminen_tyyppi`, `loukkaantuminen_alue`, `loukkaantuminen_pvm`, `paluu_arvio`. Ryhmä korvaa aiemman `talentti_terveys`-ryhmän terveysosan. Seuraavain on **`terveysSeuraId`** (ei `seuraId`), jotta tiedot-joukkolataus (`where seuraId == sid`) ei osu terveys-dokumentteihin ja kaadu niiden rajattuun lukuun.
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
  - Lukija-rajaus `sisainen/tiedot`: ennallaan (SA | oman seuran henkilökunta).
  - **`sisainen/terveys` (PM 25.10.)** — terveystieto omaan dokumenttiin, rajattu lukijajoukko:
    - **Lukijat:** SA · oman seuran `vp`, `urheilutoimenjohtaja`, `fysioterapeutti`, `talenttivalmentaja` · oman seuran `valmentaja`, jonka joukkue on pelaajan `joukkueet[]`:ssä. **Eivät:** seurasihteeri, testivastaava, fysiikkavalmentaja, pelaaja, huoltaja.
    - **Kirjoittajat:** SA · `onOmanJoukkueenValmentaja` (valmentaja oma joukkue, talenttivalmentaja, vp, utj) = nykyiset pelaajadokumentin kirjoittajat · oman seuran `fysioterapeutti` (PM 25.10., ei joukkuerajausta). Vain terveys-avaimet + `terveysSeuraId` (== polun sid) + `paivitetty`. Delete vain SA.
    - **`sisainen/tiedot` hylkää terveys-avaimet** kaikilta (myös SA:lta; Admin SDK -migraatio ohittaa Rulesin) → terveystieto ei voi päätyä laajemmin luettavaan dokumenttiin.
    - **collectionGroup:** tiedot-kysely ennallaan; terveys-kysely `where terveysSeuraId == sid` vain SA | vp | utj | fysioterapeutti | talenttivalmentaja. Valmentajan joukkuerajausta ei voi ilmaista collectionGroup-säännössä → valmentaja lukee terveyden **pelaajakohtaisilla get:illä** (`opts.terveysLuku = [pelaajaId, …]`, oman joukkueen idt). **Uusi indeksi:** `sisainen.terveysSeuraId` COLLECTION_GROUP (`firestore.indexes.json`) — deployataan CI:llä Rulesin mukana; ilman sitä terveys-joukkolataus palauttaa virheen (ei kaada, vanha kenttä varalla).
    - **Dual-read:** `tmSisainenLataaSeura(db, sid, { s4Kirjoitus?, terveysLuku })` hakee terveyden vain kun S4-lippu on päällä JA `terveysLuku` annettu (`tmTerveysLuvunTapa(rooli)`: 'seura' | 'pelaajat' | null). Lukijalla ilman oikeutta ei yritetä lainkaan. Puuttuva/ei-luettava terveys-dokumentti → vanha kenttä pelaajadokumentista varalla (kunnes PR 2:n siivous). Kutsupaikat (VP:4003, Master:2791, Kehitystyopoyta:761) kytketään 1e-3:ssa rooli mukaan.
    - **Kirjoitusapuri:** `tmTerveysOsa` / `tmTerveysKirjoita` / `tmTerveysLisaa` / `tmTerveysVarapolulla` (sama nelikko, sama S4-lippu, dokumentti `terveys`); `tmS4*`-apurit eivät koske terveyskenttiin.
- **Migraatio** `scripts/migroi_sisainen_s4.js` (dry-run oletuksena, `--kirjoita` + `KIRJOITA`, idempotentti, vain kopioi; samat kolme sääntöä kuin henkilokunta: puuttuva yksikkö kopioidaan · sisainen voittaa · vanhentunut korvataan). Terveyskentät kopioidaan omaan dokumenttiinsa `sisainen/terveys` (seuraavain `terveysSeuraId`; tuloste: `terveys_kopioi`/`terveys_kenttia`/`terveys_eroaa` — vain lukumääriä). Päivämäärälliset yksiköt: adar (`havainto_viimeisin_pvm`), arviointi (`arviointi_kooste_pvm` | `arviointi_pvm`). Signaali: vain talenttiarvot; `phv` ei kopioidu. `hist` → `havainto_porras_hist`. Tuloste vain lukumääriä (ei nimiä/id:itä/terveystietoa). **Ei ajettu.**
- **tuoja-korjaus (ei lippua)**:
  - Seura kirjoittaa `tuojaUid`:in (uid, ei sähköpostia) `sisainen/tiedot`:iin molemmissa luontipaikoissa (`_tmKirjaaTuoja`: lisäys-lomake + Excel-tuonti). `tuoja`-sähköposti ei ole pelaajadokumentissa enää (poistettu jo aiemmin; testi vahtii). Virhe `sisainen`-kirjoituksessa ei peruuta pelaajan luontia (metatieto) → `console.warn`.
  - Testaus_v9: `mittaaja: email` pois `biologinen_ika`-dokumentista, `kirjaaja: uid` pois `testitulokset`-dokumentista. Excel_Tuonti, Testituonti_Master, Harjoitettavuus_Lomake_v4, `lib/tm_pikakirjaus.js`: `tuojaUid`/`tallensiUid` pois. Syy: näitä alikokoelmia (`testitulokset`, `biologinen_ika`, `testitapahtumat/*/tulokset`) lukevat pelaaja ja huoltaja. Vanhojen dokumenttien siivous PR 2:ssa. Kenttien lukijoita ei ollut (grep).
  - `lib/tm_pikakirjaus.js`: `?v` 6 → 7 (Master, VP). `lib/tm_sisainen.js`: `?v` 8 → 9 (Master, VP, Kehitystyopoyta).

## 1e-2: CF-kirjoittajat ja CF-lukijat (tämä PR; lippu edelleen POIS → käytös ennallaan)

- **arviointikertaOnWrite** (`functions/index.js`): koostekentät (`arviointi_kooste`, `potentiaali_kooste`, `arviointi_kooste_pvm`) kirjoitetaan YHDESSÄ batchissa pelaajadokumenttiin (`set` + `mergeFields`, kuten ennen) JA `tmSisainen.tmS4Lisaa`:lla `sisainen/tiedot`:iin (`mergeFields` → ikkunasta pudonnut kohde ei jää karttaan sisainen-puolellakaan). Lippu pois → `tmS4Lisaa` palauttaa false, batchissa vain pelaajakirjoitus. Virhe → `console.error`, trigger palauttaa null (kuten ennen).
- **vahvistaSuostumus**: pelaajan `update` on nyt batch; lippu päällä samaan batchiin sisainen-kirjoitus S4-kentille jotka `paivitys`-oliossa ovat (vain `isa_pituus_cm`, `aiti_pituus_cm`, `vanhempi_pituus_pvm`, `vanhempi_pituus_puuttuu`; suostumus-/PIN-/huoltajakentät eivät). Batch = kaikki tai ei mitään: suostumus ei voi tallentua ilman sisainen-kopiota (Admin SDK ohittaa Rulesin → ei permission-denied-varapolkua). **Dual-read:** puuttuu-lippu lasketaan tallennetusta pituudesta `sisainenLuku.yhdistaYksi`:llä (sisainen voittaa lipun ollessa päällä; lippu pois → ei lisälukua).
- **CF-lukijat (inventaario):** grep S4-kentistä `functions/`-koodissa löytää lukijaksi vain `vahvistaSuostumus`:n (isa/aiti-pituus). `tm_ryhmat.js` (`talenttiOhjelma`) saa pelaajat kutsujilta, jotka eivät lue sitä CF:ssä (kalenteri-iCal: ryhmän jäsenyys `pelaajat_id`:stä). Muut `sisainenLuku`-kutsujat (`notifReviewEraantyy`, `notifValintaOdottaa`, `seuran_kooste`) lukevat henkilokunta-/jaksofokus-/D3-kenttiä, eivät S4:ää; ne saavat S4-yhdistyksen automaattisesti jaetun libin kautta kun lippu käännetään. **Terveyskentille (`sisainen/terveys`) ei ole CF-kirjoittajaa eikä -lukijaa** → `sisainen_luku.js` ei lataa terveyttä (tahallaan; lisättävä vasta jos CF-lukija ilmaantuu).
- **Testit:** `tests/sisainen_s4_cf.test.js` (vm-sandbox, oikea `index.js`-lähde + oikeat moduulit): lippu pois/päällä molemmille CF:ille, dual-read, batchin atomisuus, ei tyhjää sisainen-dokumenttia. Vanhojen vahvistaSuostumus-harnessien sandboxiin lisätty `sisainenLuku` + `tmSisainen` (nimet = tuotannon muuttujat).
- **DEPLOY-LISTA (Teron kaista; ei tässä PR:ssä, merge ei deployaa Functionsia):** `firebase deploy --only functions:arviointikertaOnWrite,functions:vahvistaSuostumus`. Lippu pois → toiminta ennallaan, deploy turvallinen. **Lipun käännön yhteydessä** (oma PR, lib-muutos `RYHMAT.s4.kirjoitus = true`) kaikki `tm_sisainen.js`:ää kutsuvat funktiot samaan deployhin, jotta CF- ja selainlippu ovat samat: `arviointikertaOnWrite`, `vahvistaSuostumus`, `notifReviewEraantyy`, `notifValintaOdottaa`, `laskeSeuranKooste`, `laskeSeuranKoosteMa`, `paivitaSeuranKooste` (+ muut 1c/1b-vaiheen deployt, jos vielä tekemättä).

## 1e-3 jaettu kahteen (PM hyväksyi): 1e-3a lukupuoli + apurit → 1e-3b kirjoittajat

Jokainen `origin/mainin` päälle, ei pinoamista: **1e-3b aloitetaan vasta kun 1e-3a on mergetty** (tarvitsee sen apurit; P7 osaa `hist_n`:n ennen kuin mikään kirjoittaa sitä).

### 1e-3a (tämä PR; lippu POIS → käytös ennallaan)

- **Uudet apurit** (`lib/tm_sisainen.js` = `functions/tm_sisainen.js`, `?v` 10 → 11 VP/Master/Kehitystyöpöytä):
  - **Syvä kenttä** `RYHMAT.arviointi.syva = ['arviointi_havaittu']`: `tmS4Osa/Kirjoita/Lisaa` kirjoittavat sen **pistepoluin** (`arviointi_havaittu.<avain>`), ei koko kartan korvauksena. Syy: VP kirjoittaa pelaajalle `set+merge` yksi avain kerrallaan; `mergeFields: ['arviointi_havaittu']` olisi pyyhkinyt muut avaimet. Avain jossa `. ~ * / [ ]` jää pois sisainen-puolelta (pelaajadokumentti saa sen aina).
  - **`tmAdarS4Valmista(kentat, deps)`** → `{ upd, lisa }`: lippu päällä pelaajalle `havainto_porras_ehdotus` + `hist_n` (hist säilyy dual-write-ajan), raakapisteet `havainto_porras_hist` vain sisainen-puolelle (`deps.lisa`; **ei pelaajadokumenttiin**). Lippu pois → sama olio, `lisa: null`.
  - **`tmS4Sisainen` / `tmTerveysSisainen(db, sid, pid, upd, deps)`**: VAIN sisainen-dokumentti omana kirjoituksenaan (Pikakortin havainnon jälkeen, luontipolut). **Ei koskaan heitä** (permission-denied, verkko → `{ ok: false }` + `console.warn`); `deps.hiljainen: false` heittää. Puuttuva kopio paikataan migraation uudelleenajossa.
  - **`tmTerveysLukuOpts(rooli, lista)`**: lataus-opts roolin mukaan (`tmTerveysLuvunTapa`): koko seura (SA, vp, utj, fysioterapeutti, talenttivalmentaja) → `'seura'`; valmentaja → oman joukkueen idt (lista = jo ladatut pelaajat); **seurasihteeri, testivastaava, fysiikkavalmentaja ym. → `{}` = terveyttä ei yritetä lukea**. `superadmin`-claim-kirjoitusasu hyväksytään SA:ksi.
- **Lukijat**: VP (`lataaPelaajat`), Master (`_pelaajatData`), Kehitystyöpöytä kutsuvat `tmSisainenLataaJaYhdista(…, tmTerveysLukuOpts(rooli, lista))`. Lippu pois → ei terveyskyselyä (kuten ennen). Signaalin lukijat (VP, `tm_seuraava_askel`, `tm_kehitystilanne`, `tm_eerikkila_normit`, Master) saavat jo yhdistetyn listan; testi vahtii, että tulos on identtinen kun talenttisignaali on siirtynyt sisaiseen, ja että `'phv'` jää pelaajalle.
- **P7 (Pelaaja_v7)**: `_ehdN = hist_n ?? hist.length` (pelaaja näkee vain määrän). Snapshot-testi: `rAdar()` tuottaa täsmälleen saman kortin vanhalla `{hist}`- ja uudella `{hist_n}`-muodolla, n = 0…3.
- **Testi**: `tests/sisainen_s4_selain_lukijat.test.js`.

### 1e-3b (seuraava PR): kirjoittajat

Pikakortti (3 paikkaa), Master `paivitaAdarPikakentat`, VP `_vpTallennaHavaittu` (tx), Testaus_v9 kasvumittaus, Seura (terveys, talentti-muokkaus, Excel-luonti). **Pikakortti: sisainen-kirjoitus OMANA batchinaan havainnon JÄLKEEN** (`tmS4Sisainen`), ei samassa batchissa — havainto ei saa koskaan hylkäytyä sisainen-osan takia. Testi: sisainen-batch permission-denied → havainto silti tallessa. `phv_raaka/phv_huom/phv_ongelma` eivät ole kirjoitettuja kenttiä (Excel-/Testituonti vain laskee ne virheilmoituksiin; kirjoittaa vain `phv_tila`, joka on B) → niille ei kirjoittajaa.

## ⚠ PR 2 -varoitus: where-kyselyjen kentät eivät saa poistua pelaajadokumentista ennen kuin kyselyt on muutettu

Dual-write pitää S4-kentät pelaajadokumentissa, joten kyselyt toimivat. PR 2:n siivous (kenttien poisto pelaajadokumentista) rikkoisi hiljaa kaikki `where(<S4-kenttä>, …)`-kyselyt — Firestore palauttaa tyhjän tuloksen, ei virhettä. Nykyiset kyselyt (grep 25.10.2026):

| Kenttä | Paikka |
|---|---|
| `talenttiOhjelma == true` | `Master_v16` :10169 (roster-kaksoiskysely) ja :10508 (talentti-id:t ryhmille) · `Seura` :2519 (Talentit-näkymä) · `VP_v25` :18125 (ryhmän talenttijäsenet) |

Lisäksi **ei-kyselynä** mutta samalla riskillä: sivut jotka lukevat S4-kenttiä suoraan pelaajalistasta ilman dual-readia (Seura, Pikakortti, Testaus, `tm_kt_sivu`; `tm_ryhmat.js` sääntöryhmä `talenttiOhjelma === true`, Seuran `kaytettavyys`-merkit). **Ennen PR 2:ta:** (1) muuta kyselyt (esim. collectionGroup `sisainen` where `talenttiOhjelma == true` + indeksi, tai oma pikakenttä joka jää pelaajalle) tai ratkaise että kenttä jää pelaajalle; (2) kytke dual-read em. sivuille; (3) PR 2:n kenttälista poistaa vain kentät joille kumpikaan ei päde. Grep-portti PR 2:een: `where('<kenttä>'` kaikille `tmS4Kentat()`-kentille.

## Havainnot lukijoista (1e-2/1e-3:a varten)

- **Pelaaja/Vanhempi (HTML)** eivät viittaa yhteenkään siirrettävään S4-kenttään (grep-portti `tests/sisainen_s4.test.js`). Jaetut libit joissa S4-kenttänimiä: `tm_phv_tila.js` (`bio.maturity_offset` = `biologinenIka_viimeisin`-alaolio → B), `tm_tukitavoitteet.js` + `tm_idp.js` (`arviointi_havaittu/_pvm`; henkilökunnan ehdotinlogiikka, P7 ei kutsu kandidaattifunktioita), `tm_eerikkila_normit.js` (`talenttiOhjelma`, henkilökunnan KPI), `tm_pelialy_yksilo.js` (`adar_*`-pikakenttien LASKENTA; kirjoittajat Master/Pikakortti). `TalentMaster_Rekisterointi_Suostumus.html` LÄHETTÄÄ vanhempien pituudet CF:lle (`vahvistaSuostumus`), ei lue.
- **Kirjoittajat** (1e-2 CF): `arviointikertaOnWrite` (index.js:2329) → arviointi-ryhmä; `vahvistaSuostumus` (index.js:1226–1245) → vanhempien pituudet. (1e-3 selain): Testaus_v9 kasvumittaus (T9:3252–3262), Master/Pikakortti ADAR-pikakentät, Excel-/Testituonti (phv_raaka/phv_huom/phv_ongelma, talentti*), loukkaantumis-/käytettävyyskirjaukset, `tm_kt_*` (kehitysvaihe_kaista).
- **Lukijat** (dual-read hoitaa): VP:3997, `tm_seuraava_askel.js:150`, `tm_kehitystilanne.js:178`, `tm_eerikkila_normit.js:1104` (signaali), VP:6376 + `tm_naytto_lohkot.js:226` (ehdotus.hist).

## Kytkentäjärjestys (kun 1e-1 → 1e-3 on mergetty)

1. Merge 1e-1 (Rules v3.70 deployataan CI:llä main-pushista; tarkista ajo). Ei muutosta selaimessa, paitsi tuoja-korjaus (Seura, Testaus, Excel).
2. Merge 1e-2, **`firebase deploy --only functions`** (lista 1e-2:n raportissa). Lippu pois.
3. Merge 1e-3a (lukupuoli, apurit, P7 `hist_n`-luku; lippu pois), sen jälkeen 1e-3b (selaimen kirjoittajat; lippu pois).
4. Dry-run: `node scripts/migroi_sisainen_s4.js` → luvut PM:lle. (Teron kaista, ADC.)
5. PM kuittaa. **Lippu `RYHMAT.s4.kirjoitus` päälle samassa vaiheessa selaimessa JA CF:ssä** — oma pieni PR + Functions-deploy. Kolmen lipun yhteinen järjestys: jaksofokus → henkilokunta → s4 (kukin oma PR, väli smoke).
6. Migraatio heti perään: `--kirjoita` (+ `KIRJOITA`). Dry-run uudelleen: odotus `kopioi: 0`, `vanhentunut: 0`.
7. Smoke KPV-testipelaajilla (vain nimetyt): kasvumittaus (testivastaava), ADAR-havainto (porrasehdotus + Pelaaja_v7 "uusi taito"), arviointi, talenttiohjelman aktivointi, signaali.
8. Viikon kuluttua dry-run uudelleen → vasta sitten PR 2.

Peruutus: lippu pois (selain + CF) palauttaa luvun ja kirjoituksen yhdessä; pelaajadokumentti on koko ajan täydellinen. Ei toimi PR 2:n jälkeen.
