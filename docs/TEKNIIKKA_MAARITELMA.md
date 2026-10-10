# Tekniikka heikko — yksi määritelmä (kartoitus + ehdotus)

> **Tila: ehdotus, ei toteutusta.** Teron lopullinen versio 10.10.2026 (korvaa aiemmat): ketju **TKI → SM-tasot**, tasovertailu raakatuloksista `normiIka`:lla, ei sekuntirajaa. Hylätty: TSI-viite + 0,3 s, marginaali, 1,6 s, SJK-jakaumaraja, linjaus "SM-tasot eivät kelpaa". Tero mergeää #975:n tämän jälkeen; toteutus PR 1–4 vasta sen jälkeen.
> Taustataito: `tm-mittarit-ja-testit` (§23 TKI · §26 mittaristo/normiIka · §30 TSI · §34). Päivitetty 10.10.2026, pohja `origin/main` (#974).
> Luvut §5: `node scripts/diag_tekniikka_maaritelma.cjs` (fixturet, offline) · `… kpv [--seura=sjk]` · `… sm sjk` (SM-tasojen jakauma) · `… pvm [seura]` (`*_pvm`-kentät, K8). Oikea data vain `.get()`, ei nimiä; kaikki vain luku.

## 0. Tiivistys

VP näkee samasta asiasta kaksi lukua, koska **kaksi eri sääntöä** vastaa kysymykseen "onko joukkueen tekniikka heikko":

| | Huomio "Tekniikka alle ikätason · N joukkuetta" | Ehdotus "Tekniikkaharjoittelua N joukkueelle" |
|---|---|---|
| Mittari | **D2-taso 1–5** (`d2_taso`, varalla TKI/20) | **TKI 0–100** (`tki_viimeisin`) |
| Raja | joukkueen **keskiarvo < 3** | pelaajan **TKI < 40** |
| Joukkueehto | keskiarvo yli kaikkien joilla D2; **yksikin pelaaja riittää** | **≥ 2 pelaajaa** (ei osuutta) |
| Vanha data | joukkueen mittauspäivä < 12 kk, muuten "mittaus vanha"; pelaajia ei suodateta | ei mitään: 35 kk vanha TKI kelpaa |

Ne eivät ole saman asian kaksi pyöristystä: skaalat eivät vastaa toisiaan. D2 < 3 vastaa TKI/20-varalaskennassa TKI:tä < 60, ei < 40. Lisäksi TKI-pohjaista D2:ta ei edes käytetä, jos pelaajalla on `d2_taso` (TK-lajitasot tai H-H), jolloin D2 ja TKI voivat osoittaa eri suuntiin samalla pelaajalla.

**Ratkaisu (Teron lopullinen versio):** yksi lib-funktio (`lib/tm_tekniikka.js`), pelaajakohtainen ketju TKI → SM-tasot (TKI < 40 → "alle ikätason"; SM-pallon taso 1 ja SM-juoksun taso ≥ 2 → "alle ikätason" (molemmat 1 → "nopeus ja tekniikka samalla tasolla", ei lasketa); SM-pallo ≥ 2 tasoa SM-juoksun alla → "pallo hidastaa suunnanmuutoksissa"), tasot raakatuloksista `normiIka`:lla, mittarikohtainen vanhuusraja 15 kk, "päivä tuntematon" ei ole tuore, joukkueluokka "tekniikka kehityskohteena" syineen sekä "ei tekniikkadataa · N joukkuetta". Huomio ja ehdotus lukevat saman tuloksen. Päätökset ja ratkaistut kysymykset §6:ssa; avoimet: erilliset tehtävät K8, K11, K17 (§7) ja PR 4 (K14).

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

**Tuotannon todellisuus (vain luku):** KPV: `d2_taso` 126 pelaajalla, **kaikilla `tk`** (alueellinen kilpailupooli, ei valtakunnallista testiä); `sm_*_taso` 0. SJK: `d2_taso` 57 pelaajalla, **`sm_pallo` 43 + `hh` 14** (kaikki valtakunnallisia); `sm_*_taso` 56. Eli briiffin taulukon kysymys "d2_taso: selvitä lähde" saa vastauksen: **se on kolmen eri vertailukohdan sekoitus**, ja seurasta riippuu, mikä dominoi. `d2_taso` jää pois heikkouden mittarista sekalähteenä (Teron päätös). SM-tasot lasketaan raakatuloksista uudelleen eikä tallennettuja `sm_*_taso`-kenttiä lueta; `tk`-lähteinen `d2_taso` on TKI:n sisarluku samoista lajeista, joten TKI kattaa sen oikealla asteikolla.

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

## 2. Määritelmä (Teron lopullinen versio 10.10.2026)

> **Rajaus (Tero 10.10.2026, koko dokumentti):** "Eerikkilä-tasoa ei käytetä heikkoutena" koskee **vain Eerikkilän tekniikkatestejä** (syöttö ja pujottelu) ja niistä johdettua `d2_taso`:a. H-H-fyysiset tasot (1–5) ja SM-tasot ovat päteviä; fyysinen luokitus on oma määritelmänsä (`docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md`).
> Tämä korvaa aiemmat versiot. **Hylätty:** TSI-viite "taso 3 − taso 3 + 0,3 s", marginaalin kalibrointi, kiinteä raja 1,6 s, SJK-jakaumasta johdettu raja sekä linjaus, jonka mukaan SM-testien tasot eivät kelpaa heikkouden mittariksi.

**Tiedosto:** `lib/tm_tekniikka.js`, dual-export (`window.TM_TEKNIIKKA` + `module.exports`), ei DOM- eikä Firestore-riippuvuutta. Käyttäjät: VP_v25:n huomio ja ehdotus, Tilanne, seuran pulssi, myöhemmin Master. Vain henkilökunnan näkymä: pelaajalle ja huoltajalle ei luokitusta, tasoja eikä lukuja (§7.22).

### 2.1 Testien luonne

| Mittari | Mitä se on | Heikkouden mittari |
|---|---|---|
| **TKI 0–100** | Alueellinen tekniikkakilpailu (syöttö, pujottelu, ponnauttelu, kuljetus-laukaus, pituuspotku), 8–13-vuotiaat | **Kyllä** — TKI < 40 → "alle ikätason" |
| **SM-juoksu, SM-pallo** | H-H-manuaalin testit; normit järjestelmässä (`EERIKKILA_NORMIT.sm_juoksu` / `.sm_pallo`, Palloliitto FINAL2024). Tasot 1–5 kronologisen iän ja sukupuolen mukaan (§3) | **Kyllä**, kun tasot lasketaan raakatuloksista oikealla iällä |
| **TSI** = SM-pallo − SM-juoksu | Taito pallon kanssa suunnanmuutoksissa omaan juoksuun verrattuna | Ajatus toteutetaan **tasovertailuna** (SM-pallon taso vs. SM-juoksun taso), ei sekuntirajana |
| Eerikkilän **tekniikka**taso (syöttö, pujottelu 1–3) | valtakunnallinen, otanta valtakunnan huippu | **Ei koskaan** (rajaus: vain nämä tekniikkatestit ja niistä johdettu `d2_taso`; H-H-fyysiset tasot ja SM-tasot ovat päteviä); taso 3 voi myöhemmin olla myönteinen signaali (oma tehtävä) |
| `d2_taso` | sekalähde (KPV `tk`, SJK `sm_pallo` + `hh`) | **Ei**; §1.1:n kahdeksan heikkouskäyttöä korvataan jaetulla funktiolla |
| Tallennetut `sm_juoksu_taso`, `sm_pallo_taso` | laskettu joukkueen nimen iällä | **Ei lueta**; tasot lasketaan uudelleen raakatuloksista |

### 2.2 Pelaajan luokitus — `tmTekniikkaMittari(p, nytMs)`

Ketju **TKI → SM-tasot**; ensimmäinen käytettävissä oleva (tuore) mittari ratkaisee.

1. **TKI** (`tki_pvm` alle 15 kk): kehityskohde, kun `TKI < 40`. Syy `alle ikätason`. Luokitus käyttää TKI:tä suoraan.
2. muuten **SM-tasot** (kun TKI:tä ei ole tai se ei ole tuore), tasot raakatuloksista (`sm_pallo_viimeisin`, `sm_juoksu_viimeisin`), `normiIka` testihetkestä, sukupuoli `"M"`/`"N"`:
   - SM-pallon taso = **1** ja SM-juoksun taso **≥ 2** → kehityskohde, syy `alle ikätason`;
   - SM-pallon taso = 1 ja SM-juoksun taso = **1** → **ei kehityskohde**; pelaajan kohdalla näkyy "nopeus ja tekniikka samalla tasolla", eikä häntä lasketa tekniikan joukkueluokitukseen (ei mitattuihin, ei kehityskohteisiin). Peruste: pre-PHV-neutraalius (§28), hitautta ei tehdä kehityskohteeksi tekniikan nimellä;
   - SM-pallon taso **vähintään 2 tasoa SM-juoksun tasoa alempana** → kehityskohde, syy `pallo hidastaa suunnanmuutoksissa`;
   - muuten ei kehityskohde. Jos SM-juoksu puuttuu, tason 1 sääntöä ei voi vahvistaa (juoksun taso ≥ 2 vaaditaan): sama neutraali tila, huomautus "SM-juoksu puuttuu".
3. muuten **ei tekniikkadataa**: ei TKI:tä eikä SM-testejä (myös pelkkä Eerikkilän tekniikkatulos), tai SM-testi mutta **sukupuoli puuttuu** (K17: ei SM-tasoa; syy "sukupuoli puuttuu" näkyy diagnostiikassa), tai tulos vanha / päivä tuntematon.

**Ikärajat (K12).** Alle 10-vuotiaalla ei ole SM-tasoa (heillä luokitus tulee TKI:stä); 20 vuotta täyttäneet käyttävät `"M"`/`"N"`-normia. `lib/tm_tekniikka.js` ei luota `eerikkilaTaso`/`eerikkilaNormiarvo`:n hiljaiseen leikkaukseen 10–19 vuoteen, ja funktioon tulee varoittava kommentti. Yksikkötestit: iät 9, 10, 19, 20. `eerikkilaTaso` palauttaa **0**, kun arvo puuttuu: 0 = ei tasoa, ei koskaan "taso 1".

**Vanhuus 15 kk mittarikohtaisesti.** Vanhempi tulos ei vaikuta luokitukseen. Pelaajan kohdalla näkyy "TKI yli vuoden vanha" tai "SM-testi yli vuoden vanha" (`vanhat`). Tuore FLEI tai muu mittaus ei peitä: ikä luetaan vain tekniikkamittarin omasta päivästä (`tki_pvm`; SM-testeillä `tsi_pvm`).

**Testipäivä (K8).** Päivä on aina testipäivä, ei koskaan tämä päivä. Puuttuva (tyhjä, `null`, virheellinen) päivä on tila **"päivä tuntematon"**, ei tuore: mittari ei luokita, ja pelaajan kohdalla näytetään "päivä tuntematon". Kartoitus §6.3.

### 2.3 Joukkue — `tmJoukkueTekniikka(pelaajat, joukkueDocs, joukkueId, nytMs)`

- Jäsenyys `tmPelaajanJoukkueet` (`lib/tm_joukkue.js:144`). Ryhmät eivät ole joukkueita.
- **Tekniikka kehityskohteena**, kun `kehityskohteita / mitattu ≥ 1/3` ja `mitattu ≥ 5`, **tai** `kehityskohteita / kaikki joukkueen pelaajat ≥ 1/2` (K10).
- **Syy** = se (`alle ikätason` / `pallo hidastaa suunnanmuutoksissa`), joka koskee useampaa pelaajaa; tasatilanteessa `alle ikätason`.
- **Neutraalit** (SM-pallo 1 ja SM-juoksu 1) eivät kuulu mitattuihin eivätkä kehityskohteisiin, mutta ne lasketaan "kaikkiin joukkueen pelaajiin" puolen ehdossa. Raja-ehdot lasketaan kokonaisluvuilla (`3 · kehityskohteita ≥ mitattu`), ei liukuluvuilla: SJK:n P15 on täsmälleen 5 / 15.
- **"Otos pieni"** -merkintä, kun mitattuja on alle 8.
- **Ilman luokkaa** (`mitattu = 0`, tai `1–4` eikä puolen ehto täyty): "ei tekniikkadataa · N joukkuetta" näkyy VP:lle, ei piiloteta. Koskee myös 14+-joukkueita, joilla ei ole SM-testejä (K2). Rivi ohjaa VP:tä Testipäivät-askeleeseen.
- Palautus: `{ yht, mitattu, kehityskohteita, vanhoja, paivaTuntematon, neutraaleja, sukupuoliPuuttuu, luokka, syy, syyJako, otosPieni, lahteet, uusinPvm, mediaaniKk }`.

### 2.4 Näkymät ja tekstit

- **Kodin huomio:** "Tekniikka kehityskohteena · N joukkuetta", rivillä joukkueen syy. Ehdotus käyttää samaa funktiota ja antaa samalle datalle saman joukkuemäärän (testi).
- **Ehdotus:** tunniste **`tki_alhainen` säilyy**; vain teksti muuttuu, ja tunnisteen viereen kommentti, että se kattaa koko ketjun.
- **Seuran pulssi (K9):** vain lukumäärä ja linkki Tilanteeseen; joukkuerivejä ei toisteta (D150).
- **sv-avaimet** tyhjinä uuteen erään; ruotsia ei kirjoiteta.

## 3. SM-tasot — normit, merkitys ja datan reunaehdot

**Normit** `EERIKKILA_NORMIT.sm_juoksu` ja `.sm_pallo` (`lib/tm_eerikkila_normit.js`): neljä rajaa per ikä (10–19, `"M"`/`"N"`) ja sukupuoli; pienempi aika on parempi; `arvo ≤ raja[0]` → taso 5, `≤ raja[1]` → 4, `≤ raja[2]` → 3, `≤ raja[3]` → 2, muuten 1. Rekisteri on täydellinen: kaikki ikäluokat 10–19 ja `M`/`N` molemmille testeille ja sukupuolille, rajat aidosti nousevia (tarkistettu).

**Tasojen merkitys:** 1 = alle kansallisen keskitason, 2 = hieman alle, 3 = kansallinen keskitaso (`lib/tm_eerikkila_normit.js`: "taso-3-kynnys = ikäluokan keskitaso"), 4 = hyvä, 5 = kansainvälinen kärkitaso. Lähde: Palloliiton tavoitetasot FINAL2024 ja H-H-testimanuaali 2024 (K16).

**Reunaehdot, jotka `lib/tm_tekniikka.js` hoitaa itse (K12 ratkaistu):**

| Ansa | Koodissa | Ratkaisu |
|---|---|---|
| Ikä leikataan 10–19:ään | `eerikkilaTaso` `Math.min(19, Math.max(10, round))` | ikä < 10 → ei SM-tasoa; ikä ≥ 20 → avain `"M"`/`"N"` |
| Sukupuoli: kaikki paitsi `'M'` on tyttö | `eerikkilaTaso`: `sukup === 'M' ? pojat : tytot` (`eerikkilaNormiarvo` hyväksyy `M`/`P`) | normalisointi `normSukupuoliMN` → `"M"`/`"N"`; tuntematon → ei SM-tasoa, ei arvausta |
| Puuttuva arvo | `eerikkilaTaso` → `0` | 0 = ei tasoa |
| `sukupuoli`-kenttä puuttuu | SJK 20 / 61 (15 puuttuu + 5 tyhjää), Sibbo 208 / 246, Pallo-Iirot 71 / 71, KPV 31 / 160 | **K17 hyväksytty:** sukupuoli joukkuenimen P- tai T-tunnuksesta (`P14` → `M`, `T14` → `N`); ilman sitä ei SM-tasoa ja pelaaja on "ei tekniikkadataa", syy "sukupuoli puuttuu" diagnostiikassa |

**SM-pallon taso 1 ja SM-juoksun taso (K15 ratkaistu).** SM-pallo sisältää juoksuvauhdin. SJK:lla 19 pelaajalla SM-pallon taso on 1; heistä **6:lla myös SM-juoksun taso on 1** ja 13:lla enintään 2. Päätös: tason 1 sääntö koskee vain pelaajaa, jonka SM-juoksun taso on ≥ 2; jos molemmat ovat 1, kyse on hitaudesta eikä tekniikasta (§28), ja pelaaja jää luokituksen ulkopuolelle ("nopeus ja tekniikka samalla tasolla"). Kyseiset 6 SJK-pelaajaa eivät siis ole tekniikan kehityskohteita eivätkä nosta joukkueen osuutta.

**Lähde (K16).** Tasojen ja rajojen lähde on Palloliiton fyysis-teknisten ominaisuustestien tavoitetasot **FINAL2024** (pojat ja miehet; tytöt ja naiset) sekä **H-H-testimanuaali 2024**. Asteikko: 1 = alle kansallisen keskitason … 5 = kansainvälinen kärkitaso. Repon kuvaus tasosta 2 ("hieman alle kansallisen keskitason — selkeä kehityskohde", `VP_v25:15681`) säilyy.

## 4. Mitä tämä ei tee

- Ei muuta D2-tasoa (1–5) tai sen näyttöä; taso ja "kehityskohde" ovat eri kysymyksiä.
- Ei kirjoita Firestoreen eikä muuta pikakenttiä. Ei koske Rulesiin eikä `functions/`-tiedostoihin. Ei kirjoita ruotsia.
- Ei korjaa `*_pvm`-kenttien kirjoitusta (K8) eikä `sm_*_taso`:n tallennusikää (K11): erilliset tehtävät (§6.3, §7).

## 5. Luvut: nykyinen huomio · nykyinen ehdotus · uusi määritelmä

Uusi määritelmä = §2. Joukkue = `tmPelaajanJoukkueet`; ajo 10.10.2026, vain luku (`node scripts/diag_tekniikka_maaritelma.cjs [kpv --seura=…]`). SM-tasot raakatuloksista `normiIka(testipvm)`:lla; sukupuoli kentästä, puuttuessa joukkuenimen P/T-tunnuksesta; K15: SM-pallo 1 + SM-juoksu 1 = neutraali (ei lasketa). "Ilman luokkaa" = 0 mitattua ("ei tekniikkadataa") tai 1–4 mitattua eikä puolen ehto täyty. "Otos pieni" = luokiteltu, mutta mitattuja < 8.

### 5.1 Yhteenveto

| Aineisto | Joukkueita (pelaajia > 0) | Huomio nyt | Ehdotus nyt | **Uusi: kehityskohteena** | josta syy *alle ikätason* / *pallo hidastaa* | ok | **ilman luokkaa** (josta ei tekniikkadataa) | **otos pieni** |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| **KPV** | 15 | 3 | 10 | **1** | 1 / 0 | 7 | **7** (5) | 4 |
| **SJK** | 6 | 5 | 0 | **2** | 2 / 0 | 3 | **1** (0) | 3 |
| fixture pilotti | 15 | 3 | 2 | 2 | 2 / 0 | 1 | 12 (12) | 0 |
| fixture kypsa | 9 | 9 | 1 | 1 | 1 / 0 | 7 | 1 (0) | 0 |
| fixture kuormitus | 40 | 8 | 0 | 0 | 0 / 0 | 8 | 32 (32) | 4 |

Fixturet sisältävät vain TKI:tä (ei SM-raakatuloksia), joten niiden syy on aina *alle ikätason*. Lisäksi `tests/helpers/vp_fixture.cjs:41` antaa kaikille TKI-pelaajille `d2_taso = 2` ja saman TKI:n koko joukkueelle. PR 1 korjaa molemmat.

### 5.2 KPV (TKI tuore 66 · TKI ≥ 15 kk 60 · ei mittausta 34; SM-testejä 0; `d2_taso` 126 kpl, kaikki `tk`)

Pelaajaosuudet (mitattu 66 / 160): **alle ikätason 17 (26 % mitatuista)**, ok 49, pallo hidastaa 0.

| Joukkue | Huomio nyt | Ehdotus nyt | Uusi (mitattu/kehityskohteita/vanhoja) |
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

### 5.3 SJK (TKI 0; SM-pallo 56 pelaajalla; `d2_taso` 57 kpl: `sm_pallo` 43, `hh` 14; "sukupuoli puuttuu" -pelaajia 0, koska joukkuenimi antaa sukupuolen)

**Pelaajat (61), K15-sääntö:**

| | Pelaajia | Osuus luokitelluista (50) |
|---|---:|---:|
| **Alle ikätason** (SM-pallo 1 ja SM-juoksu ≥ 2) | 13 | 26 % |
| **Pallo hidastaa** (ero ≥ 2 tasoa) | 3 | 6 % |
| Ok | 34 | 68 % |
| *Nopeus ja tekniikka samalla tasolla* (SM-pallo 1 ja SM-juoksu 1; ei lasketa) | 6 | — |
| *Ei dataa* (ei mittausta) | 5 | — |

Ennen K15:tä 19 pelaajaa oli "alle ikätason" (34 % 56:sta); kuusi heistä oli hitaita, ei teknisesti heikkoja. Vertailu, "pallo hidastaa" yhden tason erolla: alle ikätason 13, pallo hidastaa 13, ok 24, neutraali 6.

SM-tasojen jakauma (raakatuloksista, `normiIka`): SM-pallo `{1: 19, 2: 12, 3: 19, 4: 6}`, SM-juoksu `{1: 6, 2: 17, 3: 23, 4: 6, 5: 4}`.

**Joukkueet:**

| Joukkue | Pel. | Huomio nyt | Uusi, ero 2 tasoa (mitattu / kehityskohteita) | Vertailu, ero 1 taso |
|---|---:|---|---|---|
| P14 | 7 | kyllä | ok, otos pieni (6/0) | kehityskohde, otos pieni (6/2), pallo hidastaa |
| P15 | 20 | kyllä | **kehityskohde** (15/5 = täsmälleen 1/3; 4 neutraalia), alle ikätason | kehityskohde (15/6) |
| P16 | 7 | ei | ok, otos pieni (5/1) | kehityskohde, otos pieni (5/2), pallo hidastaa |
| T14 | 14 | kyllä | ok (13/4 = 31 %; 1 neutraali) | kehityskohde (13/8) |
| T15 | 6 | kyllä | **ilman luokkaa** (4 mitattua, 2 kehityskohdetta = 33 % kaikista pelaajista; 1 neutraali) | kehityskohde, otos pieni (4/3) |
| T16 | 7 | kyllä | **kehityskohde**, otos pieni (7/4), alle ikätason (2) = pallo hidastaa (2) → tasatilanne: alle ikätason | kehityskohde, otos pieni (7/5), pallo hidastaa |
| **Yhteensä** | 6 | 5 | **2 kehityskohdetta, 3 ok, 1 ilman luokkaa** | 6 kehityskohdetta |

Nykyinen ehdotus ei voi laueta SJK:lla (ei TKI:tä). K15 pudottaa SJK:n kehityskohdejoukkueet 4:stä 2:een, ja T15 jää ilman luokkaa. P15 on täsmälleen kolmasosan rajalla (5 / 15): tulos on herkkä yhdelle pelaajalle. Kahdesta kehityskohteesta toinen (T16) on otos pieni; "ok"-joukkueista P14 ja P16 ovat otos pieni.

## 6. Päätökset ja avoimet kysymykset

### 6.1 Kirjatut päätökset (Tero, 10.10.2026, lopullinen versio)

- **P1.** Ketju TKI → SM-tasot. **Rajaus (Tero 10.10.2026):** "Eerikkilä-tasoa ei käytetä heikkoutena" koskee VAIN Eerikkilän **tekniikkatestejä** (syöttö ja pujottelu, 3-portainen, otanta valtakunnan huippu) ja `d2_taso`:a, kun se on johdettu niistä. **H-H-fyysiset tasot (1–5) ja SM-tasot ovat päteviä heikkouden mittareita** (taso 1 = alle kansallisen keskitason, Palloliitto FINAL2024); fyysinen luokitus: `docs/KARKI_JA_YKSILOLLINEN_KARTOITUS.md` (`lib/tm_fyysinen.js`). Eerikkilän tekniikkataso ja `d2_taso` eivät ole heikkouden mittareita; §1.1:n kahdeksan `d2_taso`-käyttöä korvataan jaetulla funktiolla. Tallennettuja `sm_*_taso`-kenttiä ei lueta.
- **P2.** TKI < 40 → "alle ikätason"; TKI:n tasomuunnoksista jää vain `laskeD2Joustava`:n `TKI/20`, ja vain näyttöön (§1.2).
- **P3.** SM-pallon taso 1 ja SM-juoksun taso ≥ 2 → "alle ikätason"; SM-pallon taso ≥ 2 tasoa SM-juoksun alla → "pallo hidastaa suunnanmuutoksissa"; molemmat tasolla 1 → "nopeus ja tekniikka samalla tasolla", ei kehityskohde eikä lasketa joukkueluokitukseen (§28). Tasot raakatuloksista, `normiIka` testihetkestä, sukupuoli `"M"`/`"N"`.
- **P4.** Ikärajat: < 10 ei SM-tasoa; ≥ 20 `"M"`/`"N"`; testit 9/10/19/20 (K12).
- **P5.** Vanhuus 15 kk mittarikohtaisesti; vanha tulos ei luokita ja näytetään pelaajalla ("TKI/SM-testi yli vuoden vanha"); tuore FLEI/muu mittaus ei peitä.
- **P6.** Testipäivä on aina testipäivä, ei koskaan tämä päivä; puuttuva päivä = "päivä tuntematon", ei tuore (K8).
- **P7.** Ei TKI:tä eikä SM-testejä (myös pelkkä Eerikkilän tekniikkatulos) = ei tekniikkadataa. Pelaaja, jonka sukupuolta ei voi päätellä (kenttä tai joukkuenimen P/T), kuuluu samaan joukkoon; syy "sukupuoli puuttuu" näkyy diagnostiikassa (K17).
- **P8.** Joukkue: `tmPelaajanJoukkueet`; kehityskohde kun ≥ 1/3 mitatuista (≥ 5 mitattua) tai ≥ 1/2 kaikista joukkueen pelaajista; syy = useampaa koskeva; "otos pieni" kun mitattuja < 8; "ei tekniikkadataa · N joukkuetta" näkyy (myös 14+ ilman SM-testejä).
- **P9.** Huomio "Tekniikka kehityskohteena · N joukkuetta" + syy; `tki_alhainen` säilyy, teksti muuttuu + kommentti; pulssi vain lukumäärä + linkki (D150); sv-avaimet tyhjinä uuteen erään; ei lukuja pelaajalle/huoltajalle.

### 6.2 Ratkaistut kysymykset

| # | Kysymys | Tila |
|---|---|---|
| K1 | `d2_taso` sekalähde | Ratkaistu (P1) |
| K2 | TKI vain 8–13 v., SM-dataa vain osalla | **Hyväksytty**; 14+ ilman SM-testejä = "ei tekniikkadataa" ja ohjaa Testipäivät-askeleeseen |
| K3 | TSI-raja | **Raukesi**: sekuntirajaa ei ole; tasovertailu (P3) |
| K4 | Suhteellinen raja | **Hylätty** |
| K5 | Taidon §22 väärä lukema | **Ratkaistu**: §22 kirjoitettu uudelleen tasojen merkityksellä ja SM-luokituksella; viite- ja marginaaliteksti poistettu |
| K6 | Sukupuolen ja iän sekoittuminen | **Ratkaistu**: tasot lasketaan iän ja sukupuolen mukaan normeista |
| K7 | `tki_alhainen` ei lauennut SJK:lla | **Ratkaistu**: sama ketju (SM-tasot kattavat SJK:n) |
| K9 | Seuran pulssi | **Ratkaistu**: lukumäärä + linkki |
| K10 | "puolet pelaajista" | **Vahvistettu**: puolet kaikista joukkueen pelaajista |
| K15 | SM-pallo 1 sekoittaa tekniikan ja hitauden | **Ratkaistu**: kehityskohde vain jos SM-juoksu ≥ 2; molemmat 1 → neutraali (P3) |
| K16 | Tasojen lähde ja merkitys | **Ratkaistu**: Palloliiton tavoitetasot FINAL2024 + H-H-testimanuaali 2024; 1 = alle kansallisen keskitason … 5 = kansainvälinen kärkitaso; repon "taso 2 = hieman alle" säilyy |
| K17 | `sukupuoli`-kenttä puuttuu | **Ratkaistu**: vara joukkuenimen P/T; ilman sitä "ei tekniikkadataa" (syy diagnostiikassa); datan täydennys erillinen tehtävä (§7) |
| K12 | `eerikkilaNormiarvo`/`eerikkilaTaso` ei rajaa ikää | **Ratkaistu**: lib rajaa itse (§3); lisäksi löytyi sukupuolianta ja 0-paluuarvo, samassa taulukossa |
| K13 | Viitteen merkitys | **Raukesi**: viite hylätty |

### 6.3 K8 — onko testipäiväongelma myös `tki_pvm`:ssä ja `hh_pvm`:ssä? **Kyllä, rakenteellisesti.**

Päivän varapolut kirjoitussivuilla (vain kartoitus, ei korjausta):

| Kirjoitus | Rivi | Varapolku | Kirjoittaa |
|---|---|---|---|
| Excel-tuonti (`prosessoiExcel`) | `Excel_Tuonti:3127–3131` | TestiPvm → **kausi-ankkuri** (`_kausiPvm(meta.kausi)`) → **`2026-01-20` (Wallsport) kun TestiPvm on virheellinen** → **tänään**, kun TestiPvm on tyhjä eikä kausea voi lukea | `hh_pvm` (`:3214`), `tsi_pvm` (`:3260`) |
| PDF-tuonti (`tallennaPdfFirestoreen`) | `Excel_Tuonti:3744` (`_pdfValittuPvm`), `:3938`, `:4005` | pdf-päivä → `pdfData.pvm` → **tänään** | `tki_pvm`, `testauspvm` |
| `recalcTSI` | `Excel_Tuonti:4715` | `m.pvm \|\| tmPaivaIso(new Date())` = **tänään** | `tsi_pvm` (+ `tsi_recalc: true`) |
| Pikakirjaus / Testaus_v9 | `lib/tm_pikakentat.js:150`, `Testaus_v9:~3060` | `pvm` puuttuu → **tänään** | `hh_pvm`, `tki_pvm` |
| TKI-recalc | `Excel_Tuonti:4090`, `:4225` | `''` (tyhjä) | `tki_pvm` — oikea tapa: tyhjä = tuntematon |

Kaikki varapäivät ovat tallennettuna **samassa muodossa kuin oikea testipäivä** (merkintää ei ole; vain `tsi_recalc` merkitsee recalcin), joten niitä ei voi jälkikäteen erottaa. Tuotantodatan päivät (vain luku, `pvm`-komento):

| Seura | `tki_pvm` | `hh_pvm` | `tsi_pvm` | Huomio |
|---|---|---|---|---|
| KPV | 126 arvoa, 6 eri päivää, ei tyhjiä | 5 arvoa; **4 kpl 2026-10-09** | — | 4 `hh_pvm`-päivää eilen: mahdollisesti tuontipäivä, ei todennettavissa |
| Sibbo | 214; 2025-10-06 ×67, 2026-05-27 ×62, 2026-06-01 ×60 | 64; 6 päivää | — | ei tyhjiä |
| SJK | — | 59; 2026-06-02 ×40, 06-09 ×14 | 56; 24.3., 27.3., 1.4.; **38 recalc-kirjoittamaa** | recalc-päivät silti maalis–huhtikuulta |
| Pallo-Iirot | — | 28; 3 päivää | 13; 2026-02-08, recalc 0 | |
| demo-fc | — | 38; kaikki 2026-04-14 | — | |

Ei tyhjiä päiviä eikä yhtään `2026-01-20`-varapäivää. Suora näyttö "tänään"-varapäivistä puuttuu, mutta KPV:n neljä `hh_pvm`-arvoa 9.10. on vahvistamaton epäilys. **Vaikutus uuteen luokitukseen:** `tki_pvm` ja `tsi_pvm` ratkaisevat vanhuuden, joten varapäivä voisi näyttää vanhan testin tuoreena. Luokitus käsittelee tyhjän päivän tilana "päivä tuntematon" (P6), mutta ei voi tunnistaa kirjoitettua varapäivää; juurikorjaus (kirjoita tyhjä tai erillinen `*_pvm_lahde` varapolulla) on §7:n erillinen tehtävä; **tähän sarjaan ei muutoksia** (Tero 10.10.2026). `hh_pvm` ei vaikuta tähän luokitukseen.

### 6.4 Yhä avoimet (eivät estä PR 1:tä)

- **K11. `sm_*_taso`:n tallennusikä** — **tila: vahvistettu datasta, ei korjattu.** Tuonti tallentaa tason joukkuenimen iällä (`Excel_Tuonti:3272–3276`), ei `normiIka(testipvm)`:llä. SJK:lla tallennettu `sm_*_taso` eroaa raakatuloksista nyt lasketusta **9 pelaajalla 56:sta (16 %)**. Uusi luokitus ei lue tallennettua tasoa (P1), joten ei vaikutusta tähän sarjaan. Kartoitus ja korjausehdotus omana tehtävänään; uudelleenlaskenta on Teron ajo.
- **K14.** Harjoitelogiikan kohdevalinta (`harjoitelogiikka_v4.js:2731`, TSI > 1,5 s) ja taidon §30:n rivi yhtenäistetään samaan SM-tasoluokitukseen — **PR 4** (§7). **Toteutettu PR 4:ssä:** ketju P1 TKI-laji → P2 SM-tasot (`tm_tekniikka.js`) → P3 H-H (`tm_fyysinen.js`, §28) → P4 oletus; TSI-sekuntirajat ja tallennettu `hh_taso` pois. Välitapaukset (ei kehityskohdetta): tasapaino / pallo 1 tason jäljessä → koordinaatio, pallo juoksua edellä → nopeus.

## 7. Toteutusjako (vasta #975:n mergen jälkeen)

| PR | Sisältö | Kaista |
|---|---|---|
| 1 | `lib/tm_tekniikka.js` + yksikkötestit: molemmat sukupuolet; tasorajat ja kahden tason ero (1 / 2 / 3 tasoa); ikärajat 9, 10, 19, 20; vanhuusraja (14,9 / 15 kk) ja "päivä tuntematon"; ei tekniikkadataa; otos pieni (7 / 8); puolen ehto; syyn valinta; `eerikkilaTaso`-nolla ei ole taso. **Fixture-korjaus**: realistiset TKI- ja SM-raakatulokset, ei vakiota `d2_taso = 2`. Vartija: `tki / 20` vain yhdessä paikassa | auto |
| 2 | `VP_v25`: huomio, ehdotus (`tki_alhainen`, uusi teksti + kommentti), Tilanne ja pulssi jaettuun funktioon. Testi: huomio ja ehdotus antavat samalle datalle saman joukkuemäärän. Laatuportin kuvat, `?v=`-versiot ja pseudokielitesti päivitetään. Uudet sv-avaimet tyhjinä uuteen erään | Tero |
| 3 | Master käyttää samaa funktiota; VP ja Master saavat iän samalla tavalla; `d2_taso`:n muut heikkouskäytöt korjataan §1.1:n mukaan; TKI-muunnokset 2–3 poistetaan (§1.2) | Tero |
| 4 (K14) | `harjoitelogiikka_v4.js:2731` kohdevalinta yhtenäistetään SM-tasoluokitukseen. Characterization-testit (`tests/harjoitelogiikka.characterization.test.js`) ennen ja jälkeen; raportti, miten pelaajien kohdevalinta muuttuu (lukumäärät, ei nimiä). Taidon §30:n rivi päivitetään samassa PR:ssä | Tero |

**Erilliset tehtävät (ei tähän sarjaan):**

1. **`*_pvm`-varapäivät (K8):** juurikorjausehdotus §6.3:n kirjoitussivuille; datan uudelleenlaskenta on Teron ajo.
2. **`sm_*_taso`:n tallennusikä (K11):** kartoitus ja korjausehdotus; uudelleenlaskenta Teron ajo.
3. **Puuttuva sukupuoli (K17):** kuiva-ajo (vain luku), joka johtaa puuttuvan `sukupuoli`-kentän pelaajan joukkueen nimen P/T-tunnuksesta **seuroittain** (lukumäärät, ei nimiä) ja listaa joukkueet, joista sukupuolta ei voi johtaa (esim. Sibbon "2014 Blå"). Tulostus: per seura pelaajia yhteensä / kenttä puuttuu / johdettavissa / ei johdettavissa, sekä ei-johdettavien joukkueiden nimet. Kirjoitusajo (kentän täydennys) on Teron. Nykytilan karkeat luvut: sukupuoli puuttuu tai on tyhjä SJK:lla 20 / 61, Sibbolla 208 / 246, Pallo-Iirolla 71 / 71, KPV:llä 31 / 160. Siihen asti pelaaja ilman sukupuolta (kenttä ja joukkuenimi) on tekniikkaluokituksessa "ei tekniikkadataa" (syy "sukupuoli puuttuu").
4. Eerikkilän tekniikkataso 3 myönteiseksi signaaliksi — myöhemmin.
5. Kehitysvaiheen mukainen tasovertailu (alle 16-vuotiaat, vaatii mitatun PHV:n) — myöhemmin.

Rajaukset: ei kirjoituksia tuotantodataan (laskelmat vain lukien), ei Rules- eikä `functions/`-muutoksia, ei ruotsinkielisiä tekstejä.

## 8. Rajat, normisto ja skaalautuvuus (PR 3b)

Tässä dokumentissa mainitut rajat (TKI < 40, 1/3, 5 mitattua tai puolet, 15 kk, kahden tason ero, otos pieni < 8) ovat `lib/tm_normisto.js`:n arvoja, eivät koodiin hajautettuja vakioita: TKI-raja ja kahden tason ero ovat normiston oletuksia (seura voi säätää: TKI 25–55, tasoero 1–3), mutta 5 mitattua, otos pieni < 8, kolmasosa ja 15 kk ovat **lukittuja luotettavuusehtoja** (menetelmä, kuten §28 ja §7.22). Tarkemmin ja kolmen kerroksen malli: `docs/NORMISTO_JA_SEURAN_LINJA.md`.

**Palvelinkooste otetaan käyttöön, kun seurassa on yli noin 1 000 pelaajaa tai kun Network-taso tulee. Ei toteuteta nyt.** Libit ajautuvat Nodessa sellaisenaan (testattu: 2 000 pelaajaa × 80 joukkuetta ≈ 35 ms).
