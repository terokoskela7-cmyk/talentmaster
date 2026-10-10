# Tekniikka heikko — yksi määritelmä (kartoitus + ehdotus)

> **Tila: ehdotus, ei toteutusta.** Tero päättää rajat (§6) ennen kuin mitään koodia kirjoitetaan.
> Taustataito: `tm-mittarit-ja-testit` (§23 TKI · §26 mittaristo/normiIka · §30 TSI · §34). Päivitetty 10.10.2026, pohja `origin/main` (#974).
> Luvut §5: `node scripts/diag_tekniikka_maaritelma.cjs` (demo-fixturet, offline) ja `… kpv` (KPV:n oikea data, vain `.get()`, tulosteessa ei nimiä).

## 0. Tiivistys

VP näkee samasta asiasta kaksi lukua, koska **kaksi eri sääntöä** vastaa kysymykseen "onko joukkueen tekniikka heikko":

| | Huomio "Tekniikka alle ikätason · N joukkuetta" | Ehdotus "Tekniikkaharjoittelua N joukkueelle" |
|---|---|---|
| Mittari | **D2-taso 1–5** (`d2_taso`, varalla TKI/20) | **TKI 0–100** (`tki_viimeisin`) |
| Raja | joukkueen **keskiarvo < 3** | pelaajan **TKI < 40** |
| Joukkueehto | keskiarvo yli kaikkien joilla D2; **yksikin pelaaja riittää** | **≥ 2 pelaajaa** (ei osuutta) |
| Vanha data | joukkueen mittauspäivä < 12 kk, muuten "mittaus vanha"; pelaajia ei suodateta | ei mitään: 35 kk vanha TKI kelpaa |

Ne eivät ole saman asian kaksi pyöristystä: skaalat eivät vastaa toisiaan. D2 < 3 vastaa TKI/20-varalaskennassa TKI:tä < 60, ei < 40. Lisäksi TKI-pohjaista D2:ta ei edes käytetä, jos pelaajalla on `d2_taso` (TK-lajitasot tai H-H), jolloin D2 ja TKI voivat osoittaa eri suuntiin samalla pelaajalla.

**Suositus:** yksi lib-funktio (`lib/tm_tekniikka.js`), pelaajakohtainen mittariketju TKI → TSI → Eerikkilän tekniikkataso, joukkueluokka "alle ikätason", kun ≥ 1/3 mitatuista on rajan alla ja mitattuja on ≥ 5. Sekä huomio että ehdotus lukevat saman tuloksen, joten luvut ovat aina samat.

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

## 2. Ehdotus: yksi jaettu funktio

**Tiedosto:** `lib/tm_tekniikka.js`, dual-export kuten muut libit (`window.TM_TEKNIIKKA` + `module.exports`). Ei riippuvuutta DOM:iin eikä Firestoreen.

### 2.1 Pelaajan mittari — `tmTekniikkaMittari(p, opts)`

Ketju samassa järjestyksessä kuin nykyisissä teknisissä näkymissä (§1 #6): **TKI → TSI → Eerikkilän tekniikkataso**. Ensimmäinen mittari, jolla pelaajalla on *tuore* arvo, ratkaisee. Palauttaa `{ mittari, arvo, heikko, pvm, ikaKk }` tai `null`.

| # | Mittari | Lähde | Normi-ikä | Heikko kun | Huom |
|---|---|---|---|---|---|
| 1 | **TKI** (0–100) | `tki_viimeisin`, `tki_pvm` | TKI on jo ikäluokan mukainen (`TK_KOKONAISRAJAT[sp][ika]`, ikä = kilpailuvuosi − syntymävuosi, §23/§24). Ei uutta ikälaskentaa | **TKI < 40** | 8–13 v. Pronssiraja on ikäluokkakohtainen, joten raja 40 on "alle ikäluokan pronssitason" |
| 2 | **TSI** (s) | `tsi_viimeisin` = `sm_pallo − sm_juoksu` | absoluuttinen, ei ikänormia (§30) | **TSI > 1,5 s** | Sama raja kuin §30 "TSI > 1,5 s → PALLO ⚠️" ja `laskeTekninenKehityskohde`. Tyypillinen hyvä pelaaja 0,3–0,6 s |
| 3 | **Eerikkilän tekniikkataso** (1–5) | `laskeD2HH(hh_viimeisin, normiIka(syntymaVuosi, hh_pvm), sp)` (syöttö + pujottelu, 3-portaiset normalisoituina 1–5) | **`normiIka(syntymaVuosi, testipvm)`** | **taso < 3,0** | Taso 3 = ikäluokan keskitaso (`eerikkilaNormiarvo`). Varalla tallennettu `d2_taso`, jos `d2_lahde` on `hh` tai `tk` |

Pelaaja ilman yhtäkään tuoretta mittaria ei ole "mitattu" (ei heikko eikä ok).

### 2.2 Joukkue — `tmJoukkueTekniikka(pelaajat, joukkueDocs, joukkueId, nytMs, opts)`

- **Jäsenyys:** `tmPelaajanJoukkueet(p, joukkueDocs)` (`lib/tm_joukkue.js:144`). Ei `p.joukkue`-vertailua; vartija `tests/joukkuejasenyys_yksi_saanto.test.js` kattaa jo tämän. Monijoukkueinen pelaaja lasketaan jokaiseen joukkueeseensa.
- **Mitatut** = pelaajat, joilla on ketjun mukainen mittari ja mittaus on alle 12 kk vanha (`MITTAUS_TASOTON_KK`, D141). Vanhat lasketaan erikseen `vanhoja`-lukuun, eivät mitattuihin eivätkä heikkoihin.
- **Luokka:**
  - `mitattu < 5` → **ei luokkaa** (`luokka: null`). Näytetään "mitattu x/y", ei väitettä.
  - `heikkoja / mitattu ≥ 1/3` → **`alle`** ("Tekniikka alle ikätason").
  - muuten `ok`.
- **Palautus:** `{ yht, mitattu, vanhoja, heikkoja, luokka, lahteet: {TKI:n, TSI:n, EERIKKILA:n}, uusinPvm, mediaaniKk, vanhinKk }`.
- **Datan ikä näytetään** (kaikissa kohdissa, joissa luokka näytetään): "mitattu 8/12 · mediaani 3 kk · lähde TKI". Jos vanhin käytetty mittaus on > 6 kk (`MITTAUS_VANHA_KK`), rivillä on lisäksi "vanhin X kk".
- **Joukkueen tila ≠ pelaajan tila:** luokka näytetään vain henkilökunnalle (VP, valmentaja). Pelaajalle tai huoltajalle ei näytetä mitään tästä (§7.22).

### 2.3 Kuka kutsuu

| Nykyinen kohta | Muutos |
|---|---|
| #1 Huomio (`laskeJoukkuePoikkeamat`, tekniikka-dimensio) | `alle_normin`/`tekniikka` syntyy `tmJoukkueTekniikka(...).luokka === 'alle'`. Vakavuus: amber; punainen vain jos ≥ 1/2 mitatuista heikkoja. D2-ka jää joukkuekorttiin tasona, ei huomion perusteeksi |
| #2 Ehdotus (`tki_alhainen`) | sama funktio; signaalin id säilyy (historia ja dedup D134), teksti: "{N} pelaajaa alle ikätason ({mittari}). Fokusoi tekniikkaharjoittelu." |
| #3 Poikkeamalista, `jk-status` | seuraa #1:tä |
| #4 `_pLvl` | käyttää `tmTekniikkaMittari`:n arvoa, poistuu oma TKI→taso-muunnos |
| #5 `teknHeikoimmat20` | ennallaan (suhteellinen kehityskohde, eri kysymys); lisätään sama minimi (n ≥ 5) vasta erikseen päätettynä |
| #6 `laskeTekninenKehityskohde` | ennallaan (valitsee kohteen) |
| #7 Master | `d2Val` ennallaan (taso); Masterin joukkuehuomio lukee samaa funktiota, kun sellainen lisätään |
| #8 "Lähellä pronssia" | ennallaan (35–54 ilman merkkiä); poistetaan päällekkäisyys: luetellaan vain pelaajat, jotka eivät ole jo "heikkoja" (TKI 40–54) |

### 2.4 Testit (toteutusvaiheessa)

Yksikkötestit: ketjun prioriteetti (TKI voittaa TSI:n ja Eerikkilän), raja-arvot (39,9 / 40 · 1,5 / 1,51 · 2,9 / 3,0), `normiIka` testipäivästä (2025-testi 2026 näkymässä), vanhat pois (11,9 / 12 kk), `mitattu 4` ei luokkaa, `5` luokan, tasan 1/3, monijoukkueinen pelaaja kahdessa joukkueessa, pelaajat ilman mittaria. Pariteetti: huomio ja ehdotus saavat saman joukkuejoukon samasta syötteestä. Portti: `laskeD2Joustava`:n TKI/20-haaraa ei saa käyttää luokitteluun.

## 3. Rajat ja perustelut

| Mittari | Ehdotettu raja | Peruste | Vaihtoehto |
|---|---|---|---|
| TKI | **< 40** | Pronssin alle = nelivyöhykkeen alin (0–40, §23). Sama kuin nykyinen ehdotus, joten ehdotus ei muutu | < 45: ottaisi mukaan "lähellä pronssia" -joukon; ei suositella, koska #8 hoitaa heidät |
| TSI | **> 1,5 s** | §30 PALLO ⚠️ ja `laskeTekninenKehityskohde` käyttävät jo 1,5 s | > 1,0 s: herkempi, mutta hyvän pelaajan normaali ero on 0,3–0,6 s |
| Eerikkilä-taso | **< 3,0** | Taso 3 = ikäluokan keskitaso; sama raja kuin nykyinen `alle_normin` (ka < 3). Taso on diskreetti (1–5, kahden 3-portaisen testin ka), joten 2,5 ja 3,0 antavat saman joukon | < 2,0: vain heikoimman portaan pelaajat |
| Osuus | **≥ 1/3 mitatuista** | Nykyinen "≥ 2 pelaajaa" vastaa 1/3:aa, kun mitattuja on 5–6; osuus skaalautuu isoihin joukkueisiin (33 pelaajan T18) | ≥ 1/4 tai ≥ 1/2 |
| Minimi | **5 mitattua** | Sama kuin `MIN_N` (`lib/tm_mittarit.js:70`: alle viiden ryhmän prosenttia ei näytetä) | 3 (kattavuusportti D125 käyttää 70 %:a pelaajista) |
| Datan ikä | **< 12 kk** | `MITTAUS_TASOTON_KK` (D141): yli 12 kk ei ole tasoväite | 6 kk (`MITTAUS_VANHA_KK`) |

## 4. Mitä tämä ei tee

- Ei muuta D2-tasoa (1–5), joka näytetään joukkuekortilla ja Masterin histogrammissa. Taso ja "onko heikko" ovat eri kysymyksiä.
- Ei kirjoita Firestoreen eikä muuta pikakenttiä (§26 pari-invariantti ennallaan). Kaikki lasketaan lennossa.
- Ei tuo uutta ruotsia tai englantia koodiin: uudet merkkijonot menevät Geminille (`LIB_SV_ODOTTAA`), `{n}`-paikanvaraajat säilyvät.
- Ei koske pelaajan näkymiä (§7.22) eikä PHV-porttia: tekniikka ei ole kypsyysgated (§28 koskee vain fyysisiä).

## 5. Luvut ennen ja jälkeen

Ennen = nykyiset säännöt (#1 ja #2), jälkeen = §2:n ehdotus, samoilla pelaajilla ja joukkueilla. Joukkue = `tmPelaajanJoukkueet`. Aikaleima 10.10.2026.

### 5.1 Demo-fixturet (`tests/fixtures/vp/`)

| Fixture | Joukkueita (pelaajia > 0) | Huomio nyt | Ehdotus nyt | **Uusi: alle ikätason** | Ei luokkaa (< 5 mitattua) | Ok |
|---|---:|---:|---:|---:|---:|---:|
| pilotti | 15 | 3 | 2 | **2** (P12, P14) | 12 | 1 |
| kypsa | 9 | **9** | **1** | **1** (P15) | 1 | 7 |
| kuormitus | 40 | 8 | 0 | **0** | 32 | 8 |

Kypsa-fixture toistaa raportoidun ristiriidan: "9 joukkuetta" huomiossa, "1 joukkue" ehdotuksessa. **Fixture-varoitus:** `tests/helpers/vp_fixture.cjs:41` antaa jokaiselle TKI-pelaajalle `d2_taso = 2` TKI:stä riippumatta (esim. P13 Pilotti: TKI 44, D2 2). Fixture siis liioittelee huomiota; oikea data (§5.2) osoittaa saman rakenteellisen eron. Fixture kannattaa korjata toteutuksessa niin, että `d2_taso` johdetaan TKI:stä (tai jätetään pois).

### 5.2 KPV:n oikea data (vain luku, 160 pelaajaa, 15 joukkuetta joilla pelaajia)

Pelaajia mittarin mukaan: **TKI tuore 66 · TKI ≥ 12 kk vanha 60 · ei mittausta 34**. Yhtään TSI- tai H-H-mittausta ei ole, joten ketjun kaksi viimeistä lenkkiä toimivat KPV:llä vain testeissä.

| | Joukkueita | Joukkueet |
|---|---:|---|
| Huomio nyt ("Tekniikka alle ikätason") | **3** | T13, T14, T15 |
| Ehdotus nyt ("Tekniikkaharjoittelua") | **10** | T9, T12, T13, T14, T15, P10, P12, P13, P14, P15 |
| **Uusi: alle ikätason** | **1** | P12 (5/9 mitatuista < 40) |
| Uusi: ei luokkaa (< 5 tuoretta mittaa) | 7 | T11, T14, T15, T18, P13, P14, P15 |
| Uusi: ok | 7 | P9, T9, T10, T12, T13, P10, P11 |

Havaintoja:

- **Ehdotus oli KPV:llä yli kolminkertainen huomioon verrattuna** (10 vs 3), vaikka fixtureilla suhde on päinvastainen. Ristiriita ei ole vain fixture-ilmiö.
- Suurin ero syntyy **vanhasta datasta**: T14:llä 6 pelaajan TKI on vanha (vanhin 35 kk) ja tuoreita on 2; T15:llä kaikkien 10 pelaajan TKI on yli 12 kk vanha. Uusi sääntö ei luokittele näitä, vaan näyttää "ei luokkaa — mittaus vanha".
- **P12** on ainoa joukkue, jolla tuoreita mittauksia on tarpeeksi (9) ja ≥ 1/3 on rajan alla (5/9).
- Taulukon täydellinen tuloste: `node scripts/diag_tekniikka_maaritelma.cjs kpv`.

> Joukkuelistat ovat ajon 10.10.2026 tuloste; luvut muuttuvat, kun KPV tuo uutta dataa.

## 6. Päätettävää Terolle ennen toteutusta

1. **Ketju:** hyväksytäänkö TKI → TSI → Eerikkilä sellaisenaan? Seuraus: TK-lajitasoista johdettu `d2_taso` (`d2_lahde = tk`) ei ole ketjussa erikseen, koska TKI kattaa saman datan. Teron 8.10.2026 päätös "D2: lajikohtainen ensin" koskee D2-*tasoa*, ei tätä luokittelua.
2. **Rajat:** TKI < 40 · TSI > 1,5 s · Eerikkilä < 3,0 (§3).
3. **Joukkueehto:** ≥ 1/3 mitatuista ja ≥ 5 mitattua. Alle viiden mitatun joukkue ei saa luokkaa — KPV:llä tämä koskee 7 joukkuetta 15:stä; onko se oikea tulos vai halutaanko pienemmälle joukkueelle oma lause ("2 mitattua, molemmat alle")?
4. **Vanhuus:** 12 kk (D141) vai 6 kk. KPV:llä raja 12 kk poistaa 60 pelaajan TKI:n luokittelusta.
5. **Nimi:** "Tekniikka alle ikätason" kaikille mittareille (TKI-raja on ikäluokan pronssi, Eerikkilä-raja ikäluokan keskitaso, TSI absoluuttinen — TSI-perusteinen rivi ei tarkkaan ottaen ole "ikätaso").
6. **Ehdotuksen id ja teksti:** säilytetäänkö `tki_alhainen` (historia, dedup, sv-käännökset `lib/tm_vp_i18n.js:2258, 3719`) vai nimetään `tekniikka_alle`? Teksti "TKI < 40" muuttuu joka tapauksessa; uusi sv-teksti kulkee Geminin kautta.
7. **Fixturen `d2_taso`-oletus** korjataan toteutuksen yhteydessä.

## 7. Toteutusjako (kun rajat on päätetty)

| PR | Sisältö | Kaista |
|---|---|---|
| 1 | `lib/tm_tekniikka.js` + yksikkötestit + vartija (huomio ja ehdotus lukevat samaa) | auto (lib ilman näkyvää muutosta) |
| 2 | Kytkentä: `laskeJoukkuePoikkeamat` tekniikka-dimensio, `TP_SIGNAALIT` `tki_alhainen`, `_pLvl`, datan iän rivi, sv-avaimet tyhjinä Geminille | **Tero** (VP_v25.html) |
| 3 | Fixture-korjaus ja Master-joukkuehuomio (jos halutaan) | Tero |

Tässä PR:ssä on vain dokumentti ja diagnostiikkaskripti (`scripts/diag_tekniikka_maaritelma.cjs`, vain luku).
