# Tekniikka heikko — yksi määritelmä (kartoitus + ehdotus)

> **Tila: ehdotus, ei toteutusta.** Päivitetty Teron briiffin (10.10.2026, "yhdistetyt päätökset") mukaan: mittariketju on **TKI → TSI**, Eerikkilän tekniikkataso ja `d2_taso` jäävät pois heikkouden mittarista. Tero päättää TSI-rajan (§6) ennen toteutusta; #975 mergataan sen jälkeen.
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

**Suositus (päivitetty):** yksi lib-funktio (`lib/tm_tekniikka.js`), pelaajakohtainen ketju TKI → TSI, mittarikohtainen vanhuusraja 15 kk, joukkueluokka "tekniikka kehityskohteena" ja syy ("alle ikätason" / "pallo hidastaa suunnanmuutoksissa"). Sekä huomio että ehdotus lukevat saman tuloksen. Datan perusteella kolme asiaa vaatii Teron päätöstä ennen toteutusta: TSI-raja (§6 K3–K5), TKI:n puuttuminen yli 13-vuotiailta (§6 K2) ja "seuran pulssi" -kohteen sisältö (§6 K9).

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

## 2. Määritelmä (Teron briiffi 10.10.2026)

**Tiedosto:** `lib/tm_tekniikka.js`, dual-export (`window.TM_TEKNIIKKA` + `module.exports`), ei DOM- eikä Firestore-riippuvuutta. Käyttäjät: VP_v25:n huomio ja ehdotus, Tilanne, seuran pulssi, myöhemmin Master.

### 2.1 Testien luonne

| Mittari | Vertailukohta | Heikkouden mittari |
|---|---|---|
| **TKI 0–100** (alueellinen tekniikkakilpailu) | ikäluokan pronssiraja (`TK_KOKONAISRAJAT`) | **Kyllä** — ainoa "alle ikätason" -lähde |
| **TSI** (`sm_pallo − sm_juoksu`) | pelaajan oma juoksu | **Kyllä** — syy "pallo hidastaa suunnanmuutoksissa" |
| `sm_juoksu_taso`, `sm_pallo_taso` | valtakunnallinen normi | Ei |
| Eerikkilän tekniikkataso (syöttö, pujottelu 1–3) | valtakunnan huippu | Ei (myöhemmin mahdollisesti myönteinen signaali, oma tehtävä) |
| `d2_taso` | sekoitus (§1.1) | Ei |

### 2.2 Pelaajan luokitus — `tmTekniikkaMittari(p, nytMs)`

Ketju, **mittarikohtainen** vanhuus (15 kk): ensimmäinen *tuore* mittari ratkaisee.

1. **TKI** tuore (`tki_pvm` alle 15 kk): heikko, kun `TKI < 40`. Syy `alle ikätason`.
2. muuten **TSI** tuore (`tsi_pvm` alle 15 kk) ja ikäluokalla on raja: heikko, kun `TSI > raja(normiIka(syntymaVuosi, tsi_pvm))`. Syy `pallo hidastaa suunnanmuutoksissa`.
3. muuten **ei tekniikkadataa** (kuuluu joukkoon, jos pelaajalla on vain valtakunnallisia testejä, vanha tulos tai ei mitään).

Vanha mittari (≥ 15 kk) ei vaikuta luokitukseen. Palautus sisältää `vanhat: ['TKI']`, jolloin pelaajan kohdalla näytetään "TKI yli vuoden vanha". Muu mittaus (FLEI, H-H) ei päivitä eikä peitä tekniikan omaa päivämäärää, koska ikä luetaan vain `tki_pvm`/`tsi_pvm`:stä.

### 2.3 Joukkue — `tmJoukkueTekniikka(pelaajat, joukkueDocs, joukkueId, nytMs)`

- Jäsenyys `tmPelaajanJoukkueet` (`lib/tm_joukkue.js:144`). Ryhmät eivät ole joukkueita.
- **Kehityskohde**, kun `heikkoja / mitattu ≥ 1/3` ja `mitattu ≥ 5`, **tai** `heikkoja / joukkueen pelaajat ≥ 1/2`.
- **Syy** = se, joka koskee useampaa heikkoa pelaajaa; tasatilanteessa TKI.
- Ilman luokkaa: `mitattu = 0` → **"ei tekniikkadataa"**; `1–4` → **"liian vähän dataa"**; muuten `ok`. Molemmat näkyvät VP:lle ("ei tekniikkadataa · N joukkuetta"), ei piiloteta.
- Palautus: `{ yht, mitattu, heikkoja, vanhoja, luokka, syy, lahteet, uusinPvm, mediaaniKk }`.

### 2.4 Teksti ja tunnisteet

- Huomio: **"Tekniikka kehityskohteena · N joukkuetta"**, rivillä syy: "alle ikätason" tai "pallo hidastaa suunnanmuutoksissa". Datan ikä näkyy ("mitattu 8/12 · mediaani 3 kk").
- Ehdotuksen tunniste **`tki_alhainen` säilyy** (historia, dedup D134, sv-käännökset); tunnisteen viereen kommentti, että se kattaa koko ketjun (TKI → TSI). Vain teksti muuttuu.
- Uudet sv-avaimet tyhjinä Geminille. Luvut eivät mene pelaajalle eivätkä huoltajalle (§7.22).

## 3. TSI-raja — ehdotus SJK-datasta (Tero päättää)

SJK:n TSI (`node scripts/diag_tekniikka_maaritelma.cjs tsi sjk`, vain luku): **56 arvoa, vain ikäluokat 14–16**, kolme testipäivää (24.3., 27.3., 1.4.2026), `tsi_pvm` kaikilla testipäivä (ei "tänään"-varapäiviä: 38 arvoa on `recalcTSI`:n kirjoittamia, päivät silti maalis–huhtikuulta).

| Ikä (`normiIka`) | n | min | p25 | p50 | **p67** | p75 | p90 | max | > 1,5 s |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 14 | 20 | 1,13 | 1,31 | 1,56 | **1,59** | 1,73 | 2,40 | 4,75 | 60 % |
| 15 | 24 | 0,79 | 1,10 | 1,29 | **1,45** | 1,64 | 1,94 | 2,52 | 33 % |
| 16 | 12 | 1,05 | 1,15 | 1,20 | **1,36** | 1,39 | 1,40 | 1,56 | 8 % |
| yht | 56 | 0,79 | 1,17 | 1,35 | 1,55 | 1,58 | 1,93 | 4,75 | 38 % |

Heikoimman kolmanneksen alaraja (p67, pyöristetty 0,05:een) ikäluokittain: **14 → 1,60 · 15 → 1,45 · 16 → 1,35**. Muille ikäluokille ei ole dataa, joten TSI ei niitä luokittele (ks. K2).

Vaihtoehdot, SJK:n tulos (§5.3):

| Vaihtoehto | Raja | SJK: kehityskohteena |
|---|---|---|
| **A** (ehdotus, briiffin mukainen) | ikäluokittain p67: 1,60 / 1,45 / 1,35 | 3 joukkuetta (T14, T15, T16) |
| B | yksi raja 1,6 s | 1 joukkue (T14) |
| C | yksi raja 1,5 s (nykyinen §30 / `laskeTekninenKehityskohde`) | 3 joukkuetta (P14, T14, T15) |

Suositus: **A**, mutta merkitty väliaikaiseksi: ikäluokkarajat ovat 12–24 pelaajan otoksesta yhdeltä seuralta ja kolmelta testipäivältä, ja ne ovat *suhteellisia* (K4). Kun muiden seurojen TSI-dataa tulee, rajat lasketaan uudelleen yhdestä paikasta (`lib/tm_tekniikka.js` `TSI_RAJA`).

## 4. Mitä tämä ei tee

- Ei muuta D2-tasoa (1–5) tai sen näyttöä; taso ja "heikko" ovat eri kysymyksiä.
- Ei kirjoita Firestoreen eikä muuta pikakenttiä. Ei koske Rulesiin eikä `functions/`-tiedostoihin.
- Ei kirjoita ruotsia (uudet avaimet tyhjinä Geminille). Ei näytä lukuja pelaajalle tai huoltajalle (§7.22).

## 5. Luvut: nykyinen huomio · nykyinen ehdotus · uusi määritelmä

Uusi määritelmä = §2 (TSI-raja A). "Ei tekniikkadataa" = 0 tuoretta mittaria; "liian vähän" = 1–4. Joukkue = `tmPelaajanJoukkueet`; ajo 10.10.2026.

### 5.1 Yhteenveto

| Aineisto | Joukkueita (pelaajia > 0) | Huomio nyt | Ehdotus nyt | **Uusi: kehityskohteena** | ok | liian vähän | **ei tekniikkadataa** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **KPV** (oikea data) | 15 | 3 | 10 | **1** (P12, alle ikätason) | 7 | 2 | **5** |
| **SJK** (oikea data) | 6 | 5 | 0 | **3** (T14, T15, T16: pallo hidastaa) | 3 | 0 | **0** |
| fixture pilotti | 15 | 3 | 2 | 2 | 1 | 0 | 12 |
| fixture kypsa | 9 | 9 | 1 | 1 | 7 | 1 | 0 |
| fixture kuormitus | 40 | 8 | 0 | 0 | 8 | 0 | 32 |

Fixture-luvut ovat keinotekoisia: `tests/helpers/vp_fixture.cjs:41` antaa kaikille TKI-pelaajille `d2_taso = 2` ja saman TKI:n koko joukkueelle, eikä yhtään TSI:tä. PR 1 korjaa tämän.

### 5.2 KPV

Pelaajia: TKI tuore 66 · TKI ≥ 15 kk vanha 60 · ei mittausta 34. `d2_taso` 126:lla, kaikilla `tk`. Ei TSI:tä, ei H-H:ta.

| Joukkue | Huomio nyt | Ehdotus nyt | Uusi (mitattu/heikkoja/vanhoja) |
|---|---|---|---|
| P12 | ei | kyllä (7) | **kehityskohde** (9/5/5): alle ikätason |
| T13, T14, T15 | kyllä | kyllä | ok (5/1/3) · liian vähän (2/0/6) · ei tekniikkadataa (0/0/10) |
| P13 | ei | kyllä (8) | liian vähän (4/2/8) |
| P14, P15 | ei | kyllä (5, 4) | ei tekniikkadataa (0/0/6, 0/0/8) |
| T12, T9, P10 | ei | kyllä (3) | ok |
| T11, T18 | ei | ei | ei tekniikkadataa |
| P9, T10, P11 | ei | ei | ok |

Ehdotus laukeaa 10 joukkueelle, koska se laskee 35 kk vanhan TKI:n. Huomion kolme joukkuetta (T13–T15) tulevat `tk`-lähteisestä `d2_taso`:sta, jonka ikää ei tarkisteta.

### 5.3 SJK

SJK:lla ei ole TKI:tä, joten nykyinen ehdotus ei voi laueta (0). Nykyinen huomio laukeaa 5 joukkueelle d2:n perusteella (`sm_pallo` 43, `hh` 14: valtakunnalliset testit, joita briiffin sääntö ei hyväksy).

| Joukkue | Pel. | Huomio nyt | Uusi A (mitattu/heikkoja) | B (1,6 s) | C (1,5 s) |
|---|---:|---|---|---|---|
| P14 | 7 | kyllä | ok (6/0) | ok | kehityskohde (6/2) |
| P15 | 20 | kyllä | ok (19/6 = 32 %) | ok | ok |
| P16 | 7 | ei | ok (5/0) | ok | ok |
| T14 | 14 | kyllä | **kehityskohde** (14/6) | kehityskohde | kehityskohde (14/10) |
| T15 | 6 | kyllä | **kehityskohde** (5/2) | ok | kehityskohde |
| T16 | 7 | kyllä | **kehityskohde** (7/4) | ok | ok |

P15 jää kolmasosan alle (6/19 = 31,6 %); yksi lisäpelaaja muuttaisi tuloksen. T15:n 5 mitattua on täsmälleen minimi.

## 6. Päätökset ja avoimet kysymykset

**Kirjatut päätökset (Tero, 10.10.2026)**

- P1. Ketju TKI → TSI; Eerikkilän tekniikkataso, `sm_*_taso` ja `d2_taso` eivät ole heikkouden mittareita.
- P2. TKI < 40 on raja; normi-ikä `normiIka` testihetkestä.
- P3. Vanhuusraja 15 kk, mittarikohtainen; vanha tulos ei vaikuta ja pelaajalla näkyy "TKI yli vuoden vanha". Tuore FLEI/muu mittaus ei peitä.
- P4. Joukkue: `tmPelaajanJoukkueet`; kehityskohde kun ≥ 1/3 mitatuista (mitattuja ≥ 5) tai ≥ 1/2 joukkueen pelaajista; syy = useampaa koskeva; "ei tekniikkadataa · N joukkuetta" näkyy.
- P5. Huomion teksti "Tekniikka kehityskohteena · N joukkuetta" + syy; `tki_alhainen` säilyy, teksti muuttuu.
- P6. Eerikkilän tekniikkatason myönteinen signaali on oma tehtävänsä.

**Päätettävää (TSI-raja ratkaisee #975:n mergen)**

- **K3. TSI-raja.** Ehdotus A (14 → 1,60 · 15 → 1,45 · 16 → 1,35), vaihtoehdot B (1,6) ja C (1,5) §3:ssa. Hyväksytäänkö A väliaikaisena?

**Ristiriidat briiffin ja datan välillä (kirjattu ennen toteutusta)**

- **K1. `d2_taso` ei ole yksi asia.** KPV: kaikki `tk` (alueellinen kilpailupooli); SJK: `sm_pallo` + `hh` (valtakunnallinen). Briiffin taulukko olettaa yhden lähteen. Ei ristiriita säännön kanssa (kaikki jää pois), mutta **nykyinen huomio on siis rakennettu kolmella eri vertailukohdalla**, mikä selittää ristiriidan laajuuden.
- **K2. TKI esiintyy vain 8–13-vuotiailla** (`tkLaskeTKI`). Yli 13-vuotiaiden joukkueilla ketjussa on vain TSI. TSI-dataa on SJK:lla 14–16-vuotiailta; KPV:llä sitä ei ole lainkaan, joten KPV:n P14, P15, T15 ja T18 jäävät tilaan **"ei tekniikkadataa"** ja T14 tilaan "liian vähän" (vanhat TKI:t, ei TSI:tä). Ikäluokille 8–13 ilman TKI:tä ja 17+ ilman TSI-rajaa ei ole luokitusta. Onko tämä haluttu tulos, vai lisätäänkö jokin toinen lähde (esim. TK-lajiaika) yli 13-vuotiaille?
- **K4. Prosenttipiste-raja on suhteellinen.** "Heikoimman kolmanneksen alaraja" tuottaa määritelmän mukaan ~33 % heikkoja *jokaisessa* ikäluokassa, ja joukkuesääntö "≥ 1/3" laukeaa silloin noin puolelle joukkueista (SJK: 3/6). Raja kuvaa SJK:n kohorttia, ei normia, eikä sitä voi käyttää toisessa seurassa sellaisenaan. Otos on 12–24 pelaajaa ikäluokkaa kohti ja yksi sessio.
- **K5. TSI:n tyypillinen taso poikkeaa taidon kuvauksesta.** Taito `tm-mittarit-ja-testit` (§22) sanoo hyvän pelaajan häviävän pallon kanssa 0,3–0,6 s ja rajaksi 1,5 s (§30). SJK:n pienin TSI on **0,79 s**, mediaani 1,35 s ja 38 % yli 1,5 s. Joko §22:n kuvaus on vanhentunut tai SJK:n SM-testin rata/protokolla eroaa; kumpikaan ei ole varmistettu. Taidon teksti päivitetään vasta päätöksen jälkeen.
- **K6. Sukupuolen ja iän sekoittuminen.** 14-vuotiailla poikien ja tyttöjen mediaani on sama (1,56), 16-vuotiailla tytöt 1,40 ja pojat 1,18 (n = 4 ja 8), 15-vuotiaita tyttöjä on 2. Sukupuolikohtaisia rajoja ei voi laskea tällä otoksella. SJK:n kolme "kehityskohde"-joukkuetta ovat kaikki tyttöjoukkueita; sama raja kaikille voi tuottaa sukupuolivinouman. Seurattava, kun dataa kertyy.
- **K7. Nykyinen ehdotus ei toimi SJK:lla lainkaan.** `tki_alhainen` vaatii TKI:n, SJK:lla sitä ei ole → ehdotus 0, vaikka huomio laukeaa 5 joukkueelle. Uusi ketju korjaa tämän (TSI), mutta ehdotuksen otsikko "Tekniikkaharjoittelua" ja teksti "alle pronssitason (TKI < 40)" on syytä vaihtaa syyn mukaan (kommentti `tki_alhainen`-tunnisteen vieressä).
- **K8. `tsi_pvm` luotettavuus.** `recalcTSI` kirjoittaa `tsi_pvm = m.pvm || tmPaivaIso(new Date())` (`Excel_Tuonti:4715`). SJK:lla kaikki päivät ovat maalis–huhtikuulta (ei varapäiviä), mutta muilla seuroilla recalc voisi antaa "tuoreen" TSI:n, joka on vanha. PR 1 voi vaatia, että luokitus käyttää `tsi_pvm`:ää vain, jos `tsi_recalc` ei ole asettanut sitä varapäivänä (tarkistettava toteutuksessa).
- **K9. "Seuran pulssi" ei luokittele tekniikkaa tällä hetkellä.** `lib/tm_seuran_pulssi.js` ja `lib/tm_vp_koti.js` eivät sisällä tekniikka-, TKI- eikä D2-luokitusta. Pulssin taulukossa (`VP_v25:22764` `renderTeamPulse`) TKI näkyy keskiarvona. Mitä pulssin pitää näyttää uudella määritelmällä: pelkkä luokka vai myös "mitattu x/y"? Ehdotus: sama rivi kuin huomiossa (luokka + mitattu x/y), ei uutta mittaria.
- **K10. "Vähintään puolet joukkueen pelaajista"** tulkittu: ≥ 1/2 *kaikista* joukkueen pelaajista on tuoreella mittarilla rajan alla (sallii alle 5 mitatun joukkueen). Vahvistetaan, ettei tarkoitettu "puolet mitatuista".
- **K11. Normi-ikä d2-/SM-kentissä.** `sm_*_taso` ja `d2_taso` (`sm_pallo`) tallennetaan joukkuenimen iällä (`Excel_Tuonti:3272–3276`), eivät `normiIka(testipvm)`:llä. Ei vaikutusta uuteen luokitukseen (ei käytetä), mutta ne kannattaa korjata, jos niitä jatkossa käytetään myönteisenä signaalina.

## 7. Toteutusjako (vasta #975:n mergen jälkeen)

| PR | Sisältö | Kaista |
|---|---|---|
| 1 | `lib/tm_tekniikka.js` (`TSI_RAJA`), yksikkötestit, **fixture-korjaus** (realistiset TKI-, TSI- ja `d2_taso`-arvot, ei vakiota `d2_taso = 2`), vartija: `tki / 20` vain yhdessä paikassa | auto |
| 2 | Kytkentä `VP_v25`: huomio, ehdotus (`tki_alhainen`, uusi teksti), Tilanne, pulssi (K9). Testi: huomio ja ehdotus antavat samalle datalle saman joukkuemäärän. Laatuportin kuvat ja `?v=`-versiot päivitetään. Uudet sv-avaimet tyhjinä | Tero |
| 3 | Master käyttää samaa funktiota; VP ja Master saavat ikätiedon samalla tavalla; kohtien a–h (§1.1) heikkouskäytöt korjataan; TKI-muunnokset 2–3 poistetaan (§1.2) | Tero |

Rajaukset: ei kirjoituksia tuotantodataan (laskelmat vain lukien), ei Rules- eikä `functions/`-muutoksia. Eerikkilän tekniikkatason myönteinen signaali on oma tehtävänsä.
