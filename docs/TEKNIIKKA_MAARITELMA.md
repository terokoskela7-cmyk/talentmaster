# Tekniikka heikko — yksi määritelmä (kartoitus + ehdotus)

> **Tila: ehdotus, ei toteutusta.** Päivitetty Teron lopullisten päätösten (10.10.2026) mukaan: ketju **TKI → TSI**, TSI-raja normiviitteestä (§3), Eerikkilän tekniikkataso ja `d2_taso` pois heikkouden mittarista. Tero mergeää #975:n tämän jälkeen; toteutus PR 1–3 vasta sen jälkeen.
> Taustataito: `tm-mittarit-ja-testit` (§23 TKI · §26 mittaristo/normiIka · §30 TSI · §34). Päivitetty 10.10.2026, pohja `origin/main` (#974).
> Luvut §5: `node scripts/diag_tekniikka_maaritelma.cjs` (fixturet, offline) · `… kpv [--seura=sjk]` (oikea data, vain `.get()`, ei nimiä) · `… tsi sjk` (TSI-jakauma). Kaikki vain luku.

## 0. Tiivistys

VP näkee samasta asiasta kaksi lukua, koska **kaksi eri sääntöä** vastaa kysymykseen "onko joukkueen tekniikka heikko":

| | Huomio "Tekniikka alle ikätason · N joukkuetta" | Ehdotus "Tekniikkaharjoittelua N joukkueelle" |
|---|---|---|
| Mittari | **D2-taso 1–5** (`d2_taso`, varalla TKI/20) | **TKI 0–100** (`tki_viimeisin`) |
| Raja | joukkueen **keskiarvo < 3** | pelaajan **TKI < 40** |
| Joukkueehto | keskiarvo yli kaikkien joilla D2; **yksikin pelaaja riittää** | **≥ 2 pelaajaa** (ei osuutta) |
| Vanha data | joukkueen mittauspäivä < 12 kk, muuten "mittaus vanha"; pelaajia ei suodateta | ei mitään: 35 kk vanha TKI kelpaa |

Ne eivät ole saman asian kaksi pyöristystä: skaalat eivät vastaa toisiaan. D2 < 3 vastaa TKI/20-varalaskennassa TKI:tä < 60, ei < 40. Lisäksi TKI-pohjaista D2:ta ei edes käytetä, jos pelaajalla on `d2_taso` (TK-lajitasot tai H-H), jolloin D2 ja TKI voivat osoittaa eri suuntiin samalla pelaajalla.

**Ratkaisu (Teron päätökset 10.10.2026):** yksi lib-funktio (`lib/tm_tekniikka.js`), pelaajakohtainen ketju TKI → TSI (TKI < 40; TSI ≥ viite + 0,3 s, viite = SM-pallo taso 3 − SM-juoksu taso 3 iän ja sukupuolen mukaan), mittarikohtainen vanhuusraja 15 kk, joukkueluokka "tekniikka kehityskohteena" syineen sekä "ei tekniikkadataa · N joukkuetta". Huomio ja ehdotus lukevat saman tuloksen. Päätökset ja ratkaistut kysymykset §6:ssa; yhä avoimet K8, K11–K14.

## 1. Kartoitus — kaikki kohdat, joissa tekniikka luokitellaan heikoksi

Rivit viittaavat `origin/main`iin 10.10.2026. "Joukkue" = miten pelaaja liitetään joukkueeseen.

| # | Kohta | Mittari | Raja | Data | Montako pelaajaa joukkueessa | Joukkue | Vanha data |
|---|---|---|---|---|---|---|---|
| **1** | **Huomio "Tekniikka alle ikätason"** — `lib/tm_vp_tilanne.js:133–149` (`_huomiot`), nimi `:373`. Syöte: `laskeJoukkuePoikkeamat` (`lib/tm_eerikkila_normit.js:615`), tekniikka-dimensio `tmJoukkueD2` (`lib/tm_mittarit.js:43`) | D2-taso 1–5 | joukkueen **ka < 3** → `alle_normin`; < 2,5 punainen, muuten amber | pelaajan `d2_taso` (kirjoitetaan tuonnissa: TK-lajitasojen ka `tk`, H-H syöttö/pujottelu `hh`, `sm_pallo`); jos puuttuu → TKI/20. H-H lasketaan lennossa vain jos ikä annetaan — tässä polussa ei anneta, joten H-H-haara ohitetaan | **ei minimiä**: `minN: 1` (`tm_eerikkila_normit.js:640`); ka yli niiden joilla on D2; ei osuutta | `_pRyhmiteltyJoukkueittain` → `_jNimet` → `tmPelaajanJoukkueet` ✓ | Rivi muuttuu "mittaus vanha" -tyyppiseksi, kun joukkueen **viimeisin mittauspäivä** (hh/tki/**flei**, `tm_vp_tilanne.js:69–75`) on ≥ 12 kk (`MITTAUS_TASOTON_KK`). Tuore FLEI-mittaus peittää vanhan tekniikkamittauksen. Yksittäisiä pelaajia ei suodateta iän mukaan |
| **2** | **Ehdotus "Tekniikkaharjoittelua"** (`tki_alhainen`) — `TalentMaster_VP_v25.html:23000–23004`, teksti `:23081`, kirjoitus `generoimToimenpideEhdotukset` `:23030`; Tilanteen otsikko `lib/tm_vp_tilanne.js:164` | TKI 0–100 | pelaajan **TKI < 40** (pronssin alle) | pelaajan pikakenttä `tki_viimeisin` (8–13-v.) | **≥ 2 pelaajaa**, ei osuutta eikä mitattujen minimiä | `_pOnJoukkueessa` → `_jNimet` ✓ | **Ei suodatusta**: viimeisin TKI kelpaa iästä riippumatta. Estää saman ehdotuksen 14 pv (D134) |
| **3** | **Poikkeamalista + joukkuekortin status** — `VP_v25:22692` (`renderPoikkeamat`), `:22849–22870` (`jk-status`) | D2-taso (sama kuin #1) | sama kuin #1 | sama kuin #1 | sama kuin #1 | ✓ | ei |
| **4** | **"Lähimpänä tavoitetta"** (joukkuesyvänäkymä) — `VP_v25:13670–13680` (`_pLvl`) | pelaajan ka: `lin30m` taso, `sm_juoksu` taso, D2 | pelaajan ka **< 3** | `laskeD2Joustava` mutta TKI-haarassa **oma muunnos**: `TKI ≥ 60 ? 3,5 : TKI/20` — kolmas tapa muuttaa TKI tasoksi | top 3 pelaajaa, ei joukkueluokkaa | joukkueen pelaajat | `_jsvPelaajaIka` käyttää `normiIka(…, testipvm)` ✓; datan ikää ei suodateta |
| **5** | **Joukkueen heikoin ~20 % (Kehityskohde)** — `lib/tm_eerikkila_normit.js:592` (`teknHeikoimmat20`), `VP_v25:13697`, `:23284`, `:23487` | D2-taso, tasatilanne raaka syöttö+pujottelu | **suhteellinen**: heikoin `ceil(0,2·n)` | vain tallennettu `d2_taso` (ei TKI-varaa) | ≥ 1 (`max(1, ceil(0,2·n))`), ei minimiä | ✓ | ei |
| **6** | **Yksilön tekniikan kehityskohde** — `harjoitelogiikka_v4.js:2720` (`laskeTekninenKehityskohde`), `lib/tm_idp.js:86`, `:230` | **ketju** `tki_kehityskohde` → `tsi_viimeisin` → `hh_taso` → oletus | TSI > 1,5 s pallonhallinta · ≥ 0,8 koordinaatio · muuten nopeus; H-H < 2,0 koordinaatio | pelaajan pikakentät | yksilö, ei joukkueluokkaa | — | ei. **Tämä on ketju, jota ehdotus tarkoittaa**, mutta se valitsee *kohteen*, ei sano onko tekniikka heikko |
| **7** | **Masterin Kehitys** — `TalentMaster_Master_v16.html:9745` (`d2Val`), `:5102`, `:9619`, `:9695` | D2-taso | histogrammi; väri ka < 3 punainen, ≥ 3 amber, ≥ 4 teal | `laskeD2Joustava(p, ika, sp)` — **ikä annetaan**, joten H-H-haara on päällä (eri kuin #1) | koko joukkue, ei minimiä | joukkueen pelaajat | `_devIkaSp` käyttää testipäivää |
| **8** | **"Lähellä pronssia" (TKI 35–54, ei merkkiä)** — `VP_v25:4488` (S5), `:23005–23009` (`tki_lahella_merkkia`) | TKI | 35 ≤ TKI < 55 ja ei `tki_merkki` | `tki_viimeisin`, `tki_merkki` | ≥ 2 pelaajaa | ✓ | ei. Päällekkäinen #2:n kanssa välillä 35–39 |
| **9** | **TKI-bändit "< 40 prioriteetti · 40–59 kehitys · ≥ 60 hyvä"** — `VP_v25:13429` (histogrammi); Master TKI-detail (§30 `_buildTKIDetail`); kultaikkuna = ikä ≤ 12 ja TKI < 40 (§30) | TKI | < 40 / 40–59 / ≥ 60 | `tki_viimeisin` | yksilö/histogrammi | — | ei |
| 10 | Tilanteen kattavuus ja vanhuus: `tkk_puuttuu` (`VP_v25:22992`), TKI-kattavuussignaali S4 (`:4473–4482`) | TKI läsnäolo | TKI puuttuu kaikilta / kattavuus < raja | `tki_viimeisin == null` | kaikki / osuus | ✓ | — (ei luokittelu vaan kattavuus; ei muutu) |

Tarkistamatta (ei tässä kartoituksessa): Pelaaja_v7 ja Vanhempi_v2 eivät luokittele joukkuetta; pelaajalle tekniikkaa ei koskaan näytetä luokkana tai lukuna (§7.22). VP_v25-Yhteenvedon TK-lajiviitteet (`tkLajiGapit`) kertovat *mikä laji*, eivät *onko heikko*, joten ne eivät kuulu tähän.

### Mitä kartoitus osoittaa

1. **Kolme mittakaavaa samalle TKI-datalle:** TKI/20 (`laskeD2Joustava`), `TKI ≥ 60 ? 3,5 : TKI/20` (`_pLvl`) ja TKI < 40 suoraan (#2). Kolme eri rajaa: TKI/20 antaa tason 3 kohdassa TKI 60, `_pLvl` hyppää 60:ssä suoraan tasolle 3,5, ja ehdotus käyttää TKI < 40.
2. **Kaksi eri D2-laskentaa:** VP:n joukkue-D2 (`tmJoukkueD2`) ei välitä ikää → H-H ohitetaan. Masterin D2 välittää → H-H mukana. Sama joukkue voi saada eri D2:n eri näkymissä.
3. **Joukkueehto ei ole yhtenäinen:** yksi pelaaja (#1), kaksi pelaajaa (#2), 20 % (#5), kokonaan ilman ehtoa (#7).
4. **Vanhan datan käsittely puuttuu pelaajatasolta:** vain #1 reagoi, ja silloinkin joukkueen *mikä tahansa* mittaus (FLEI mukaan lukien) nollaa vanhuuden.
5. **Ikä:** TKI lasketaan tuonnissa testivuoden iällä ✓, H-H `normiIka`:lla ✓; poikkeamalaskenta kuitenkin antaa `laskeJoukkuePoikkeamat`:lle joukkueen nimestä luetun iän (`_jsvJoukkueIkaSp`), ei pelaajan testihetken ikää.
6. **TKI esiintyy vain 8–13-vuotiailla** (`tkLaskeTKI`, §23). Yli 13-vuotiaiden joukkueille kumpikaan nykyinen sääntö ei käytä TKI:tä ellei D2 ole tallennettu — tekniikka-arvio jää H-H:n / `d2_taso`:n varaan.

### 1.1 `d2_taso`, `sm_juoksu_taso`, `sm_pallo_taso` — lähteet ja heikkouskäytöt

**Mistä ne lasketaan (kirjoitus, `TalentMaster_Excel_Tuonti.html`, `lib/tm_pikakentat.js`, `Testaus_v9`):**

| Kenttä | Lähde ja asteikko | Normi-ikä tallennettaessa | Rivit |
|---|---|---|---|
| `sm_juoksu_taso`, `sm_pallo_taso` | `eerikkilaTaso(sm_juoksu / sm_pallo, …)` 1–5, **valtakunnallinen** Eerikkilä-normi | joukkuenimen ikä (`P14` → 14), ei `normiIka(testipvm)` | `Excel_Tuonti:3270–3281`, `:4786` (`recalcSMtasot`) |
| `d2_taso`, `d2_lahde = sm_pallo` | `= sm_pallo_taso` (fallback H-H:n jälkeen) | sama | `Excel_Tuonti:3311–3316` |
| `d2_taso`, `d2_lahde = hh` | `laskeD2HH`: Eerikkilä syöttö + pujottelu, 3-portaiset normalisoituna 1–5, **valtakunnallinen** | `normiIka` ✓ | `lib/tm_eerikkila_normit.js:1173`, `Excel_Tuonti:3303` |
| `d2_taso`, `d2_lahde = tk` | `laskeD2Tekninen`: `TK_LAJITASOT` (P20/P40/P60/P80 **alueellisesta kilpailupoolista**, sama TK-data kuin TKI) | tuonnin ikä | `docs/testit_indeksit.js:894–924`, `Excel_Tuonti:3288`, `:4102` |
| `d2_taso`, `d2_lahde = sm` | vanha SM-johdettu | — | `lib/tm_eerikkila_normit.js:1193` |
| TKI/20 | **ei tallenneta**; `laskeD2Joustava` johtaa lukuhetkellä, jos `d2_taso` puuttuu | — | `lib/tm_eerikkila_normit.js:1223` |

**Tuotannon todellisuus (vain luku):** KPV: `d2_taso` 126 pelaajalla, **kaikilla `tk`** (alueellinen kilpailupooli, ei valtakunnallista testiä); `sm_*_taso` 0. SJK: `d2_taso` 57 pelaajalla, **`sm_pallo` 43 + `hh` 14** (kaikki valtakunnallisia); `sm_*_taso` 56. Eli briiffin taulukon kysymys "d2_taso: selvitä lähde" saa vastauksen: **se on kolmen eri vertailukohdan sekoitus**, ja seurasta riippuu, mikä dominoi. Briiffin säännön mukaan (valtakunnalliset testit eivät mittaa heikkoutta) `sm_pallo`- ja `hh`-lähteiset arvot eivät kelpaa; `tk`-lähteinen on sisällöltään TKI:n sisarluku samoista lajeista, joten sekin jää pois ketjusta (TKI kattaa saman datan oikealla asteikolla).

**Kohdat, joissa niitä käytetään heikkouden mittarina** (`d2_taso` suoraan tai `laskeD2Taso/Joustava/Tulos`, `tmJoukkueD2`):

| # | Tiedosto:rivi | Käyttö | Korjaus |
|---|---|---|---|
| a | `lib/tm_eerikkila_normit.js:640` → `lib/tm_mittarit.js:43` | joukkueen D2-ka < 3 → huomio "Tekniikka alle ikätason" (#1) | PR 2: korvataan `tmJoukkueTekniikka` |
| b | `lib/tm_eerikkila_normit.js:631` (`comp = max(d1, hh, d2)`) | "sisäinen hajonta" (≤ 2) ja "talenttiydin alle normin" (ka < 3,0) samassa funktiossa | PR 3: D2 pois komposiitista tai erillinen päätös (ei tekniikka-väite, mutta d2 vaikuttaa) |
| c | `lib/tm_eerikkila_normit.js:593–596`; `VP_v25:13697`, `:23284`, `:23487` | joukkueen heikoin ~20 % (`teknHeikoimmat20`, kehityskohde-lippu pelaajalle) | PR 3: suhteellinen järjestys d2:sta → TKI/TSI-ketjun arvo |
| d | `lib/tm_eerikkila_normit.js:896–907` (`_tasoLvl`) | komposiittitaso ja "taso ≥ 3 -osuus" | ei tekniikkaväite; PR 3:ssa tarkistetaan |
| e | `VP_v25:22849–22870` (`jk-status`), `:22692` | seuraa (a):ta | PR 2 |
| f | `VP_v25:13677` (`_pLvl`) | "Lähimpänä tavoitetta" (ka < 3, sis. TKI-muunnos) | PR 2/3 |
| g | `VP_v25:13144`, `:13864–13880`, `:22319–22326`, `:23303` | joukkueen D2-ka, väritys, "Tekninen"-solu | **taso-näyttöjä** — jäävät, mutta väri/"alle" ei saa viitata heikkouteen ilman ketjua |
| h | `TalentMaster_Master_v16.html:9619`, `:9695`, `:9745`, `:5102` | Masterin Kehitys: D2-histogrammi, väri < 3 punainen | PR 3 |
| i | `VP_v25:13690` | potentiaali: d2 − d1 ≥ 1 (vahvuus, ei heikkous) | ei muutosta |
| j | `lib/tm_idp.js:230` | vahvin dimensio (vahvuus) | ei muutosta |

`sm_juoksu_taso` / `sm_pallo_taso`: kirjoitus `Excel_Tuonti:3280–3281`, `:4786`; näyttö `Master_v16:5939–5940`, `VP_v25:15942–15945`, `:15955–15956`. **Heikkouskäyttö on vain epäsuora** (`sm_pallo_taso` → `d2_taso` → kohdat a–h); ei suoraa joukkueluokitusta. Näyttörivien mahdollinen tasovärjäys tarkistetaan PR 3:ssa.

### 1.2 TKI:n tasomuunnokset — mikä jää, mikä poistetaan

| # | Muunnos | Rivi | Käyttö |
|---|---|---|---|
| 1 | `TKI/20` (kanoninen) | `lib/tm_eerikkila_normit.js:1223` (`laskeD2Joustava`); sama kaava `:1577` | D2-**taso** varana, kun `d2_taso` puuttuu |
| 2 | `TKI ≥ 60 ? 3,5 : TKI/20` | `VP_v25:13677` (`_pLvl`) | "Lähimpänä tavoitetta" |
| 3 | `TKI/20` (kopio) | `VP_v25:22087` (`_dimNorm5Tki`), `:8456`, `:16114`, `Pelaaja_v7:5713` | 5D-kortti, edellinen-arvo, pelaajan kortti |
| (4) | TKI omalla asteikolla (≥ 60 / 40–59 / < 40) | `VP_v25:13409`, `:13429` | profiili; **ei muunnos** |

**Ehdotus:** (1) jää ainoana taso-**näyttö**varana (sama kaava, yksi paikka), eikä sitä käytetä luokitteluun. (2) poistetaan (hyppy 59 → 60 antaa 2,95 → 3,5 ilman perustetta); `_pLvl` lukee (1):n. (3) kopiot delegoidaan (1):lle. (4) on oikea malli: TKI omalla asteikollaan. Heikkouden luokittelu ei käytä mitään muunnosta: `TKI < 40` suoraan. Vartija: testi, joka kaatuu, jos `tki … / 20` esiintyy muualla kuin (1):ssä.

## 2. Määritelmä (Teron lopulliset päätökset 10.10.2026)

**Tiedosto:** `lib/tm_tekniikka.js`, dual-export (`window.TM_TEKNIIKKA` + `module.exports`), ei DOM- eikä Firestore-riippuvuutta. Käyttäjät: VP_v25:n huomio ja ehdotus, Tilanne, seuran pulssi, myöhemmin Master. Vain henkilökunnan näkymä: pelaajalle ja huoltajalle ei luokitusta eikä lukuja (§7.22).

### 2.1 Testien luonne

| Mittari | Mitä se on | Heikkouden mittari |
|---|---|---|
| **TKI 0–100** | Alueellinen tekniikkakilpailu (syöttö, pujottelu, ponnauttelu, kuljetus-laukaus, pituuspotku), 8–13-vuotiaat | **Kyllä** — syy "alle ikätason" |
| **TSI** = `sm_pallo − sm_juoksu` | Taito pallon kanssa suunnanmuutoksissa omaan juoksuun verrattuna. SM-testit H-H-manuaalissa, normit järjestelmässä (Palloliitto FINAL2024) | **Kyllä** — syy "pallo hidastaa suunnanmuutoksissa" |
| `sm_juoksu_taso`, `sm_pallo_taso` | yksittäisten SM-testien tasot | Ei suoraan; normeja käytetään vain TSI-viitteen laskentaan |
| Eerikkilän tekniikkataso (syöttö, pujottelu 1–3) | valtakunnallinen, otanta valtakunnan huippu | **Ei koskaan**; taso 3 voi myöhemmin olla myönteinen signaali (oma tehtävä) |
| `d2_taso` | sekalähde (KPV `tk`, SJK `sm_pallo` + `hh`) | **Ei**; §1.1:n kahdeksan heikkouskäyttöä korvataan jaetulla funktiolla |

### 2.2 Pelaajan luokitus — `tmTekniikkaMittari(p, nytMs)`

Ketju **TKI → TSI**; ensimmäinen käytettävissä oleva (tuore) mittari ratkaisee.

1. **TKI** (`tki_pvm` alle 15 kk): kehityskohde, kun `TKI < 40`. Syy `alle ikätason`. Luokitus käyttää TKI:tä suoraan (ei tasomuunnosta).
2. muuten **TSI** (`tsi_pvm` alle 15 kk): `viite(ikä, sukupuoli) = SM-pallo taso 3 − SM-juoksu taso 3` rekisteristä (`eerikkilaNormiarvo`); kehityskohde, kun **`TSI ≥ viite + 0,3 s`**. Ikä `normiIka(syntymaVuosi, tsi_pvm)`, sukupuoli `"M"`/`"N"`. Syy `pallo hidastaa suunnanmuutoksissa`.
3. muuten **ei tekniikkadataa**: pelaajalla on vain Eerikkilä-tekniikka tai yksittäisiä SM-tasoja, vanha tulos tai ei mitään.

**Vanhuus 15 kk mittarikohtaisesti.** Vanhempi tulos ei vaikuta luokitukseen. Palautus sisältää `vanhat: ['TKI']`, ja pelaajan kohdalla näytetään "TKI yli vuoden vanha" / "TSI yli vuoden vanha". Tuore FLEI tai muu mittaus ei peitä: ikä luetaan vain `tki_pvm`/`tsi_pvm`:stä (ei joukkueen "viimeisin mittaus" -päivästä).

**Normit rekisteristä, ei koodiin kopioituna.** `lib/tm_tekniikka.js` lukee `EERIKKILA_NORMIT.sm_pallo` ja `.sm_juoksu` (`eerikkilaNormiarvo`). Kaksi rajausta, jotka funktion on tehtävä itse (`eerikkilaNormiarvo` ei tee niitä, ks. K12): ikä < 10 → ei viitettä; ikä ≥ 20 → avain `"M"`/`"N"` (aikuiset).

### 2.3 Joukkue — `tmJoukkueTekniikka(pelaajat, joukkueDocs, joukkueId, nytMs)`

- Jäsenyys `tmPelaajanJoukkueet` (`lib/tm_joukkue.js:144`). Ryhmät eivät ole joukkueita.
- **Tekniikka kehityskohteena**, kun `heikkoja / mitattu ≥ 1/3` ja `mitattu ≥ 5`, **tai** `heikkoja / kaikki joukkueen pelaajat ≥ 1/2` (K10 vahvistettu).
- **Syy** = se (TKI tai TSI), joka koskee useampaa heikkoa pelaajaa; tasatilanteessa TKI.
- **"Otos pieni"** -merkintä, kun mitattuja on alle 8.
- **Ilman luokkaa** (`mitattu = 0`, tai `1–4` eikä puolen ehto täyty): näkyy VP:lle "ei tekniikkadataa · N joukkuetta"; ei piiloteta. Koskee myös 14+-joukkueita, joilla ei ole SM-testejä (K2 hyväksytty). Rivi ohjaa VP:tä Testipäivät-askeleeseen.
- Palautus: `{ yht, mitattu, heikkoja, vanhoja, luokka, syy, otosPieni, lahteet, uusinPvm, mediaaniKk }`.

### 2.4 Näkymät ja tekstit

- **Kodin huomio:** "Tekniikka kehityskohteena · N joukkuetta", rivillä joukkueen syy ("alle ikätason" tai "pallo hidastaa suunnanmuutoksissa"). Datan ikä näkyy ("mitattu 8/12 · mediaani 3 kk").
- **Ehdotus** käyttää samaa funktiota ja antaa samalle datalle saman joukkuemäärän (testi). Tunniste **`tki_alhainen` säilyy**; vain teksti muuttuu, ja tunnisteen viereen kommentti, että se kattaa koko ketjun (TKI → TSI).
- **Seuran pulssi (K9):** vain lukumäärä ja linkki Tilanteeseen; joukkuerivejä ei toisteta (D150).
- Uudet **sv-avaimet tyhjinä uuteen erään**; ruotsia ei kirjoiteta.

## 3. TSI-viitetaulukko (taso 3 − taso 3)

Rekisteri tarkistettu (`node scripts/diag_tekniikka_maaritelma.cjs viite`): `EERIKKILA_NORMIT.sm_juoksu` ja `.sm_pallo` sisältävät kaikki neljä tasorajaa (taso 5–2) jokaiselle iälle **10–19** ja avaimille **M** (miehet) ja **N** (naiset), molemmille sukupuolille; arvot ovat aidosti nousevia (ei aukkoja tai ristiriitoja). Ikiä 8–9 ei ole (TSI ei luokittele; TKI kattaa 8–13). Viite = `eerikkilaNormiarvo('sm_pallo') − eerikkilaNormiarvo('sm_juoksu')`; `eerikkilaNormiarvo` palauttaa taso 3:n rajan (`rajat[2]`, hitain arvo joka on vielä taso 3).

| Ikä | Pojat: pallo | juoksu | **viite** | **raja (+0,3)** | Tytöt: pallo | juoksu | **viite** | **raja (+0,3)** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10,58 | 9,09 | **1,49** | **1,79** | 11,39 | 9,30 | **2,09** | **2,39** |
| 11 | 10,14 | 8,73 | **1,41** | **1,71** | 10,83 | 8,99 | **1,84** | **2,14** |
| 12 | 9,86 | 8,45 | **1,41** | **1,71** | 10,40 | 8,70 | **1,70** | **2,00** |
| 13 | 9,56 | 8,22 | **1,34** | **1,64** | 10,12 | 8,51 | **1,61** | **1,91** |
| 14 | 9,28 | 8,08 | **1,20** | **1,50** | 9,74 | 8,42 | **1,32** | **1,62** |
| 15 | 9,02 | 7,82 | **1,20** | **1,50** | 9,51 | 8,39 | **1,12** | **1,42** |
| 16 | 8,74 | 7,61 | **1,13** | **1,43** | 9,35 | 8,28 | **1,07** | **1,37** |
| 17 | 8,60 | 7,52 | **1,08** | **1,38** | 9,32 | 8,25 | **1,07** | **1,37** |
| 18 | 8,52 | 7,45 | **1,07** | **1,37** | 9,27 | 8,20 | **1,07** | **1,37** |
| 19 | 8,44 | 7,38 | **1,06** | **1,36** | 9,22 | 8,15 | **1,07** | **1,37** |
| M / N | 8,34 | 7,29 | **1,05** | **1,35** | 9,15 | 8,08 | **1,07** | **1,37** |

Erotus taso 3:lla: pojilla **1,05–1,49 s**, tytöillä **1,07–2,09 s** (Teron esimerkit täsmäävät: P14 9,28 − 8,08 = 1,20 s; T12 10,40 − 8,70 = 1,70 s).

**SJK:n TSI-data suhteessa viitteisiin** (56 arvoa, ikä `normiIka(syntymaVuosi, tsi_pvm)`, vain luku):

| Ryhmä | n | viite | raja | p50 | rajan ylittäviä |
|---|---:|---:|---:|---:|---:|
| P14 | 11 | 1,20 | 1,50 | 1,56 | 6 |
| T14 | 9 | 1,32 | 1,62 | 1,56 | 3 |
| P15 | 22 | 1,20 | 1,50 | 1,29 | 7 |
| T15 | 2 | 1,12 | 1,42 | 1,38 | 1 |
| P16 | 8 | 1,13 | 1,43 | 1,18 | 0 |
| T16 | 4 | 1,07 | 1,37 | 1,40 | 4 |

Yhteensä 21 / 56 (38 %) ylittää rajan. Ryhmät ovat pelaajan iän mukaan, eivät joukkueen: esim. T14-joukkueessa on myös 15–16-vuotiaita tyttöjä, siksi joukkuetaulukko (§5.3) ja tämä taulukko eivät ole samoja lukuja.

## 4. Mitä tämä ei tee

- Ei muuta D2-tasoa (1–5) tai sen näyttöä; taso ja "kehityskohde" ovat eri kysymyksiä.
- Ei kirjoita Firestoreen eikä muuta pikakenttiä. Ei koske Rulesiin eikä `functions/`-tiedostoihin. Ei kirjoita ruotsia.
- Ei korjaa `sm_*_taso`:n tallennusikää (oma tehtävä, §6 K11); ei tee Eerikkilän tekniikkatasosta myönteistä signaalia (oma tehtävä).

## 5. Luvut: nykyinen huomio · nykyinen ehdotus · uusi määritelmä

Uusi määritelmä = §2 (TSI-viite + 0,3 s, vanhuus 15 kk). Joukkue = `tmPelaajanJoukkueet`; ajo 10.10.2026, vain luku. "Ilman luokkaa" = 0 mitattua ("ei tekniikkadataa") tai 1–4 mitattua eikä puolen ehto täyty. "Otos pieni" = luokiteltu, mutta mitattuja < 8.

### 5.1 Yhteenveto

| Aineisto | Joukkueita (pelaajia > 0) | Huomio nyt | Ehdotus nyt | **Uusi: kehityskohteena** | ok | **ilman luokkaa** (josta 0 mitattua) | **otos pieni** (luokitelluista) |
|---|---:|---:|---:|---:|---:|---:|---:|
| **KPV** | 15 | 3 | 10 | **1** | 7 | **7** (5) | 4 |
| **SJK** | 6 | 5 | 0 | **4** | 2 | **0** (0) | 4 |
| fixture pilotti | 15 | 3 | 2 | 2 | 1 | 12 (12) | 0 |
| fixture kypsa | 9 | 9 | 1 | 1 | 7 | 1 (0) | 0 |
| fixture kuormitus | 40 | 8 | 0 | 0 | 8 | 32 (32) | 4 |

Fixture-luvut ovat keinotekoisia: `tests/helpers/vp_fixture.cjs:41` antaa kaikille TKI-pelaajille `d2_taso = 2` ja saman TKI:n koko joukkueelle, eikä yhtään TSI:tä. PR 1 korjaa tämän.

### 5.2 KPV (TKI tuore 66 · TKI ≥ 15 kk 60 · ei mittausta 34; TSI 0; `d2_taso` 126 kpl, kaikki `tk`)

| Joukkue | Huomio nyt | Ehdotus nyt | Uusi (mitattu/heikkoja/vanhoja) |
|---|---|---|---|
| P12 | ei | kyllä (7) | **kehityskohde** (9/5/5), alle ikätason |
| T13 | kyllä | kyllä | ok, otos pieni (5/1/3) |
| T14 | kyllä | kyllä | ilman luokkaa (2/0/6) |
| T15 | kyllä | kyllä | **ei tekniikkadataa** (0/0/10) |
| P13 | ei | kyllä (8) | ilman luokkaa (4/2/8) |
| P14, P15 | ei | kyllä (5, 4) | **ei tekniikkadataa** (0/0/6, 0/0/8) |
| T11, T18 | ei | ei | **ei tekniikkadataa** |
| T12 | ei | kyllä (3) | ok, otos pieni (5/1/5) |
| T10, P11 | ei | ei | ok, otos pieni (6/1/2, 7/1/2) |
| T9, P10 | ei | kyllä (3, 3) | ok (10/3/0) |
| P9 | ei | ei | ok (8/0/0) |

Ehdotus laukeaa 10 joukkueelle, koska se laskee yli 3 vuotta vanhan TKI:n. Huomion kolme joukkuetta (T13–T15) tulevat `tk`-lähteisestä `d2_taso`:sta, jonka ikää ei tarkisteta.

### 5.3 SJK (TKI 0; TSI 56; `d2_taso` 57 kpl: `sm_pallo` 43, `hh` 14)

| Joukkue | Pel. | Huomio nyt | Uusi (mitattu/heikkoja) |
|---|---:|---|---|
| P14 | 7 | kyllä | **kehityskohde**, otos pieni (6/2 = 33 %) · pallo hidastaa |
| P15 | 20 | kyllä | ok (19/6 = 32 %) |
| P16 | 7 | ei | ok, otos pieni (5/0) |
| T14 | 14 | kyllä | **kehityskohde** (14/7) · pallo hidastaa |
| T15 | 6 | kyllä | **kehityskohde**, otos pieni (5/2) · pallo hidastaa |
| T16 | 7 | kyllä | **kehityskohde**, otos pieni (7/4) · pallo hidastaa |

Nykyinen ehdotus ei voi laueta SJK:lla (ei TKI:tä), vaikka huomio laukeaa viidelle joukkueelle `sm_pallo`/`hh`-lähteisestä `d2_taso`:sta. P14 (2/6) ja P15 (6/19) ovat kolmasosan rajalla: yksi pelaaja muuttaa tuloksen. Neljästä kehityskohteesta kolme on otos pieni.

## 6. Päätökset ja avoimet kysymykset

### 6.1 Kirjatut päätökset (Tero, 10.10.2026)

- **P1.** Ketju TKI → TSI; Eerikkilän tekniikkataso, `sm_*_taso` (suoraan) ja `d2_taso` eivät ole heikkouden mittareita. `d2_taso`:n kahdeksan heikkouskäyttöä (§1.1 a–h) korvataan jaetulla funktiolla.
- **P2.** TKI < 40 → "alle ikätason". TKI-tasomuunnoksista jää vain `laskeD2Joustava`:n `TKI/20`, ja vain näyttöön (§1.2).
- **P3.** TSI-viite = SM-pallo taso 3 − SM-juoksu taso 3 rekisteristä (iän ja sukupuolen mukaan); kehityskohde kun TSI ≥ viite + 0,3 s. Normit luetaan rekisteristä.
- **P4.** Normi-ikä `normiIka` testihetkestä; sukupuoli `"M"`/`"N"`.
- **P5.** Vanhuus 15 kk mittarikohtaisesti; vanha tulos ei luokita ja näytetään pelaajalla ("TKI/TSI yli vuoden vanha"); tuore FLEI/muu mittaus ei peitä.
- **P6.** Pelaaja, jolla on vain Eerikkilä-tekniikka tai yksittäisiä SM-tasoja, on "ei tekniikkadataa".
- **P7.** Joukkue: `tmPelaajanJoukkueet`; kehityskohde kun ≥ 1/3 mitatuista (≥ 5 mitattua) tai ≥ 1/2 kaikista joukkueen pelaajista; syy = useampaa koskeva (TKI/TSI); "otos pieni" kun mitattuja < 8; "ei tekniikkadataa · N joukkuetta" näkyy.
- **P8.** Huomio "Tekniikka kehityskohteena · N joukkuetta" + syy; `tki_alhainen` säilyy, vain teksti muuttuu + kommentti; pulssi vain lukumäärä + linkki Tilanteeseen (D150); sv-avaimet tyhjinä uuteen erään; ei lukuja pelaajalle/huoltajalle.

### 6.2 Ratkaistut kysymykset

| # | Kysymys | Ratkaisu |
|---|---|---|
| K1 | `d2_taso` sekalähde | Ratkaistu: ei heikkouden mittari (P1) |
| K2 | TKI vain 8–13 v., TSI-dataa vain SJK:n 14–16 v. | **Hyväksytty**: 14+-joukkueet ilman SM-testejä jäävät "ei tekniikkadataa" ja ohjaavat Testipäivät-askeleeseen |
| K3 | TSI-raja | **Ratkaistu**: viite + 0,3 s (§3), ei SJK:n prosenttipistettä |
| K4 | Suhteellinen (prosenttipiste) raja | **Hylätty**: raja on normiviite, ei kohortin kolmannes |
| K5 | Taidon §22 "hyvä pelaaja menettää 0,3–0,6 s" | **Ratkaistu**: väärä; korjattu viitetaulukon pohjalta (`tm-mittarit-ja-testit` §22). SJK:n pienin TSI 0,79 s, mediaani 1,35 s ja 38 % yli 1,5 s ovat viitteiden (1,05–2,09 s) suuruusluokkaa |
| K6 | Sukupuolen ja iän sekoittuminen | **Ratkaistu**: viite on ikä × sukupuoli, ei yhteistä rajaa |
| K7 | `tki_alhainen` ei lauennut SJK:lla | **Ratkaistu**: ehdotus käyttää samaa ketjua (TSI kattaa SJK:n) |
| K9 | Seuran pulssi | **Ratkaistu**: vain lukumäärä + linkki (P8) |
| K10 | "puolet joukkueen pelaajista" | **Vahvistettu**: puolet *kaikista* joukkueen pelaajista |

### 6.3 Yhä avoimet / uudet

- **K8. `tsi_pvm`:n luotettavuus.** `recalcTSI` kirjoittaa `tsi_pvm = m.pvm || tmPaivaIso(new Date())` (`Excel_Tuonti:4715`). SJK:lla kaikki 56 päivää ovat maalis–huhtikuulta (24.3., 27.3., 1.4.), joten varapäiviä ei ole, mutta toisella seuralla recalc voisi tuottaa "tuoreen" päivän vanhalle testille. PR 1: luokitus lukee `tsi_pvm`:n sellaisenaan; varapäivän tunnistus (esim. `tsi_recalc` ilman testipäivää) päätetään toteutuksessa.
- **K11. `sm_*_taso`:n tallennusikä** (`Excel_Tuonti:3272–3276`: joukkuenimen ikä, ei `normiIka`). Ei vaikuta tähän luokitukseen (viite lasketaan lennossa `normiIka`:lla), mutta erillinen kartoitus ja korjausehdotus tehdään omana tehtävänään (datan uudelleenlaskenta on Teron ajo).
- **K12 (uusi). `eerikkilaNormiarvo` ei rajaa ikää.** Funktio leikkaa iän väliin 10–19 (`Math.min(19, Math.max(10, round))`) ja hyväksyy aikuisille vain literaalin `"M"`/`"N"`. Ikä 8–9 saisi siis hiljaa ikäluokan 10 viitteen ja ikä 20+ ikäluokan 19:n. `lib/tm_tekniikka.js` ei saa luottaa siihen: ikä < 10 → ei viitettä (TSI ei luokita), ikä ≥ 20 → avain `"M"`/`"N"`. Yksikkötesti kattaa rajat (9 / 10 / 19 / 20).
- **K13 (uusi). Viitteen merkitys.** Viite on kahden taso-3-rajan erotus (hitain arvo, joka on vielä taso 3, kummallekin testille), ei "keskipelaajan" mitattu erotus. Se vastaa Teron esimerkkejä (P14 1,20 s; T12 1,70 s) ja on sellaisenaan päätös, mutta tarkoittaa, että SJK:n ryhmien mediaanit ovat kaikki viitteen yläpuolella (P14 ja T16 myös rajan yläpuolella) ja 38 % SJK:n TSI-pelaajista ylittää rajan. Jos tulos tuntuu tiukalta tai löysältä, marginaalia (0,3 s) säädetään yhdestä vakiosta.
- **K14 (uusi). Taidon §30 TSI-raja.** `tm-mittarit-ja-testit` §30 ("TSI > 1,5 s → PALLO ⚠️") ja `harjoitelogiikka_v4.js:2731` (`laskeTekninenKehityskohde`: TSI > 1,5 → pallonhallinta) käyttävät yhä yhtä rajaa 1,5 s kaikille. Koodi on oma kohteensa (valitsee harjoitekohteen, ei joukkueluokkaa); pidetään ennallaan tässä sarjassa. §30:n rivi on nyt ristiriidassa uuden määritelmän kanssa — kirjataan, ei muuteta, kunnes päätät, yhtenäistetäänkö kohdevalinta samaan viitteeseen.

## 7. Toteutusjako (vasta #975:n mergen jälkeen)

| PR | Sisältö | Kaista |
|---|---|---|
| 1 | `lib/tm_tekniikka.js` + yksikkötestit: raja-arvot molemmille sukupuolille (TKI 39,9/40; TSI viite+0,29/+0,30; ikä 9/10/19/20), vanhuusraja (14,9/15 kk), "ei tekniikkadataa", "otos pieni" (7/8), puolen ehto, syyn valinta. **Fixture-korjaus**: realistiset TKI- ja SM-arvot (TSI), ei vakiota `d2_taso = 2`. Vartija: `tki / 20` vain yhdessä paikassa | auto |
| 2 | `VP_v25`: huomio, ehdotus (`tki_alhainen`, uusi teksti + kommentti), Tilanne ja pulssi kytketään jaettuun funktioon. Testi: huomio ja ehdotus antavat samalle datalle saman joukkuemäärän. Laatuportin kuvat, `?v=`-versiot ja pseudokielitesti päivitetään. Uudet sv-avaimet tyhjinä uuteen erään | Tero |
| 3 | Master käyttää samaa funktiota; VP ja Master saavat iän samalla tavalla; `d2_taso`:n muut heikkouskäytöt korjataan §1.1:n mukaan; TKI-muunnokset 2–3 poistetaan (§1.2) | Tero |

Erilliset tehtävät (ei tähän sarjaan): `sm_*_taso`:n tallennusikä (K11), Eerikkilän tekniikkatason myönteinen signaali.

Rajaukset: ei kirjoituksia tuotantodataan (laskelmat vain lukien), ei Rules- eikä `functions/`-muutoksia, ei ruotsinkielisiä tekstejä.
