# "Kärkipelaajien taso alle ikätason" ja "Yksilöllinen ohjelma" — kartoitus ja yhtenäistysehdotus

> **Tila: kartoitus ja ehdotus, ei toteutusta.** Tero päättää (§5) ennen kuin PR 3:een tulee mitään näistä. Pohja `origin/main` (#977, #978 auki), 10.10.2026.
> Luvut: `node scripts/diag_karki_yksilo.cjs` (fixturet, offline) ja `… seura kpv|sjk` (oikea data, vain `.get()`, ei nimiä). Taustat: `docs/TEKNIIKKA_MAARITELMA.md` (päätös: Eerikkilä-tasoa ei käytetä heikkouden perusteena missään).

## 0. Tiivistys

- **Sama ristiriita kuin tekniikassa.** Tilanteen huomio "Kärkipelaajien taso alle ikätason" ja ehdotus "Yksilöllinen ohjelma … Pelaajia alle Eerikkilä-tason" kuvaavat samaa fyysistä/H-H-dataa kolmella eri säännöllä (eri mittari, raja, joukkue-ehto, vanhan datan käsittely). SJK:lla: kärkihuomio 4 joukkuetta, "fyysiset testit alle ikätason" -huomio 5, yksilöllinen-ehdotus 5 — eri joukot.
- **Kypsän fixturen 4 vs. 2 ei ole sama asia kahdella tavalla laskettuna.** Huomion 4 joukkuetta (P10, P11, P12, T12) lasketaan pelaajadatasta, mutta *kokonaan TKI/20-muunnoksesta* (joukkueilla ei ole yhtään H-H- eikä D1-arvoa): "kärkipelaajat" on siis tekniikkaluokitus toisella nimellä, ja rikkoo TKI-muunnospäätöstä. Ehdotuksen 2 joukkuetta (`hh_taso_alhainen`) on fixturen **käsin annettu speksi** (`scripts/vp_fixturet_kirjoita.cjs`): fixturessa ei ole H-H-dataa, joten oikea sääntö antaa 0.
- **Ehdotus:** poistetaan kumpikin (kärkihuomio ja `hh_taso_alhainen`-ehdotus), koska ne eivät voi nojata muuhun kuin Eerikkilä-tasoon (kärki lisäksi tekniikan `d2_taso`/TKI/20:een) eikä yhteistä funktiota ole mihin tukeutua. Sama periaate koskee koko perhettä (§3 kohdat c–i); niistä tarvitaan Teron päätös (§5).

## 1. Kartoitus — kaksi kysyttyä kohtaa

| | **A. Huomio "Kärkipelaajien taso alle ikätason"** (`kind: karki`) | **B. Ehdotus "Yksilöllinen ohjelma … Pelaajia alle Eerikkilä-tason"** (`hh_taso_alhainen`) |
|---|---|---|
| Missä | Tilanne/Koti-huomio: `lib/tm_vp_tilanne.js:141, 155, 219, 398–399, 412`; syöte `laskeJoukkuePoikkeamat` tyyppi `talenttiydin` (`lib/tm_eerikkila_normit.js:683–695`) | VP_v25 `TP_SIGNAALIT` `TalentMaster_VP_v25.html:22997–23001`; näyttöteksti `:23093`; Tilanteen otsikko/perustelu `lib/tm_vp_tilanne.js:171` |
| Mittari | **komposiitti** `comp(p) = max(d1_taso, hh_taso, D2)` (`tm_eerikkila_normit.js:632`, `:716`); `D2 = _d2Taso(p)` = `laskeD2Joustava` **ilman ikää**: `d2_taso` (sekalähde `tk`/`sm_pallo`/`hh`) tai **TKI/20** | `hh_taso` (pikakenttä, Eerikkilän H-H-taso 1–5: lin30m/cmj/mas, `laskeHHTaso`) |
| Raja | joukkueen **kärkijoukon keskiarvo < 3,0** (`T.ydinKa`, `:618–619`) → `talenttiydin`, vakavuus punainen | **`hh_taso < 2,5`** |
| Joukkue-ehto | kärkijoukko = `topN` parasta `comp`:n mukaan (`topN` = 10, jos ≥ 15 pelaajaa, muuten 5) + kaikki `talenttiOhjelma === true`; **riittää yksi arvioitu pelaaja**; ei osuutta, ei minimiä | **≥ 2 pelaajaa** (ei osuutta, ei minimiä mitattuja) |
| Data | pikakentät `d1_taso`, `hh_taso`, `d2_taso`/`tki_viimeisin`; **ei §28-porttia** (`poikkeamaPortti` koskee vain fyysisiä osa-alueita, `lib/tm_koti_luvut.js:183–193`) | pikakenttä `hh_taso`; ei §28/PHV-porttia |
| Normi-ikä | tallennetut tasot (tuonnin ikä, K11); D2 luetaan ilman ikää | tallennettu taso (tuonnin ikä, K11) |
| Vanha data | vain joukkueen **viimeisin mittauspäivä (hh/tki/flei)**: ≥ 12 kk → "mittaus vanha" (`tm_vp_tilanne.js:141`); pelaajia ei suodateta iän mukaan; tuore FLEI peittää | **ei mitään** (viimeisin `hh_taso` kelpaa iästä riippumatta) |
| Joukkue | `fn.ryhmittely` → `tmPelaajanJoukkueet` ✓ | `_pOnJoukkueessa` (`_jNimet`, `tmPelaajanJoukkueet`-pohjainen) ✓ |
| Heikkouden mittarina | Eerikkilä (D1/H-H) **ja** tekniikka (`d2_taso`, TKI/20) | Eerikkilä (H-H) |

## 2. Luvut ennen muutosta (nykyiset säännöt, joukkue = `tmPelaajanJoukkueet`)

| Aineisto | Kärkihuomio | Fyysiset-huomio (alle normin) | Yksilöllinen-ehdotus (`hh_taso < 2,5`, ≥ 2) |
|---|---:|---:|---:|
| **SJK** (6 joukkuetta, hh_taso 58 pelaajalla) | **4** (P15, P16, T14, T15) | **5** (P14, P15, P16, T14, T15) | **5** (P14, P15, P16, T14, T15) |
| **KPV** (15 joukkuetta, hh_taso 5 pelaajalla) | **1** (T14, top-ka 2,6 — *kokonaan `d2_taso`:sta (`tk`), ei yhtään D1/H-H-arvoa*) | 1 (P15) | 1 (P15, 4 pel.) |
| fixture kypsä | **4** (P10, P11, P12, T12; ka 2,7 · 2,9 · 2,6 · 1,7; **vain TKI/20**) | 0 | **0** laskettuna · käsin annettu speksi: 2 |
| fixture pilotti | 2 | 0 | 0 laskettuna · speksi: 3 |
| fixture kuormitus | 8 | 0 | 0 laskettuna · speksi: 7 |

Havainnot:

1. **Kolme eri joukkuejoukkoa samalle datalle** (SJK): kärki ≠ fyysiset ≠ yksilöllinen; P14 on kahdessa mutta ei kärjessä, T16 ei missään. Ehdot: kärjessä *kärkijoukon* ka < 3, fyysisissä *osa-alueen* ka < 3 PHV-vahdilla, yksilöllisessä ≥ 2 pelaajaa < 2,5.
2. **Kärki on osin tekniikkaa:** KPV T14 ja kaikki kypsän fixturen neljä joukkuetta syntyvät `D2`:sta (`d2_taso` tai TKI/20), ei fyysisistä testeistä. Se rikkoo kaksi päätöstä: `d2_taso` ei ole heikkouden mittari ja TKI:tä ei muunneta tasoksi luokitteluun.
3. **Yksilöllinen-ehdotus ei huomioi kypsyyttä eikä datan ikää** (ei §28, ei vanhuusrajaa): 12-vuotiaan matala fyysinen taso on pre-PHV:llä neutraali (§28), mutta ehdotus laukeaa silti.
4. **Fixturen huomio ja ehdotus eivät ole samasta datasta:** ehdotuksen joukkueet ovat speksistä, huomion pelaajadatasta — tästä näkyvä "4 vs. 2".

## 3. Koko perhe: kohdat, joissa Eerikkilä-taso on heikkouden mittarina (Tilanne, Koti, VP)

| # | Kohta | Mittari · raja · ehto | Rivi |
|---|---|---|---|
| a | Huomio "Kärkipelaajien taso alle ikätason" | comp = max(d1, hh, D2), kärkijoukon ka < 3,0 | `tm_eerikkila_normit.js:683–695` |
| b | Ehdotus "Yksilöllinen ohjelma" | `hh_taso < 2,5`, ≥ 2 pelaajaa | `VP_v25:22997–23001` |
| c | Huomio "Fyysiset testit alle ikätason" | osa-alueen (kiihdytys, maksinopeus, voima, ketteryys, aerobinen) joukkue-ka < 3; < 2,5 punainen; pre-PHV amber; §28-portti | `tm_eerikkila_normit.js:646–654`, `tm_koti_luvut.js:183–193` |
| d | Huomio "Fyysiset testit asteikon alarajalla" | osa-alueen ka ≤ 1 (`D1_ALARAJA`) → "tarkista mittaus" | `tm_koti_luvut.js:26, 187` |
| e | Poikkeama `profiilipoikkeama` (osa jää jälkeen) | heikoin osa ≥ 1,0 alle fyysisten ka:n | `tm_eerikkila_normit.js:655–666` |
| f | Huomio "Taso laskenut" (`laskeva`) + ehdotus "Kuormituksen tarkistus" (`suunta_lasku`) | `hh_taso`-delta < −0,3 (tai TKI-delta/20), ≥ 2 pelaajaa | `tm_eerikkila_normit.js:667–674`, `VP_v25:23002–23006` |
| g | Poikkeama `hajonta` | ≥ 33 % pelaajista comp ≤ 2 ja ka ≥ 2,5 | `tm_eerikkila_normit.js:675–682` |
| h | Masterin Kehitys: D1/D2-histogrammit, väri < 3 punainen, `_lvl`/komposiitti | tasot < 3 | `Master_v16:9619, 9695, 9745` (PR 3) |
| i | VP joukkuekortti/syvänäkymä: D1-/komposiittivärit, "Lähimpänä tavoitetta" | ka < 3 | `VP_v25:13674–13690` (PR 3) |

(Ei heikkoutta: `tki_lahella_merkkia` TKI 35–54 on TKI-pohjainen ja kuuluu tekniikan ketjuun; `flei_kartoitus_puuttuu` ja `tkk_puuttuu` ovat datapuutteita.)

## 4. Vaihtoehdot

**Vaihtoehto A — poisto (suositus).** Poistetaan kärkihuomio (a) ja `hh_taso_alhainen`-ehdotus (b). Perustelu:
- (b) on puhdas Eerikkilä-H-H-sääntö, eikä sille ole korvaavaa mittaria; päätöksen mukaan sitä ei käytetä heikkouden perusteena.
- (a) on komposiitti, jossa on sekä Eerikkilä (D1/H-H) että tekniikka (`d2_taso`/TKI/20). Tekniikkaosan korvaa jo `lib/tm_tekniikka.js` (huomio + ehdotus + pulssi), joten (a) toistaisi tekniikkaluokitusta, ja fyysinen osa kuuluu samaan Eerikkilä-päätökseen kuin (b). Talentti-ID-huolta ei voi lukea tästä komposiitista luotettavasti: yhden pelaajan arvioitu `comp` riittää, eikä ikää tai kypsyyttä oteta huomioon.
- Yhteistä funktiota ei voi tehdä: sellainen vaatisi mittarin, joka ei ole Eerikkilä-taso eikä tekniikka. Sellaista ei ole (SM-testit ovat jo `tm_tekniikka`:ssa).

**Vaihtoehto B — yhteinen funktio** `lib/tm_fyysinen.js` (sama mittari, raja, joukkue-ehto ja vanhuus kaikissa fyysisissä huomioissa ja ehdotuksissa). Ei suositeltu: se säilyttäisi Eerikkilä-tasoon nojaavan heikkoudenluokituksen, vastoin päätöstä, ja tuottaisi uuden määritelmän ilman ratkaistua mittaria.

**Vaihtoehto C — vain näyttö.** Eerikkilä-tasot jäävät kuvaileviksi (joukkuekortin ka, histogrammi, "mitattu x/y") ilman "alle ikätason"/punaista/ehdotusta. Kohdat c–i päätetään samalla periaatteella.

### Seuraukset vaihtoehdosta A

- **Tilanne:** huomiot ovat tekniikka kehityskohteena, "ei tekniikkadataa", kehitys/laskeva ja fyysiset (jos c–g jäävät). Kärkirivi katoaa; `KL.karki`, `KN.karki`, `KIND_JARJ.karki` ja `talenttiydin`-haara pois (`tm_vp_tilanne.js`).
- **Ehdotukset:** `hh_taso_alhainen` pois `TP_SIGNAALIT`-listasta, `SIGNAALI_PRIORITEETTI`-kartasta, `_tpVari`:sta ja `EH_AIHE`:sta; vanhat avoimet ehdotusdokumentit vanhentuvat itsestään (D134, 14 pv) eikä niitä enää luoda. Näyttöteksti `:23093` pois.
- **Lib:** `talenttiydin`-haara pois `laskeJoukkuePoikkeamat`:sta (`:683–695`); `hajonta` (g) käyttää samaa `comp`:ia → päätetään yhdessä.
- **i18n:** poistuvat avaimet jäävät karttoihin (ei haittaa); uusia avaimia ei tule. Ei ruotsia.
- **Testit:** kärki-/yksilöllinen-testit poistetaan tai muutetaan "ei esiinny" -vartijoiksi; fixturen `huomiot`-speksin `talenttiydin`-rivit ja `hh_taso_alhainen`-ehdotukset pois (`scripts/vp_fixturet_kirjoita.cjs`); vartija, joka kaatuu, jos `hh_taso`/`d1_taso` esiintyy Tilanteen/Kodin heikkouslogiikassa.

## 5. Päätettävää Terolle

1. **Kärki ja yksilöllinen:** hyväksytäänkö poisto (A)? (suositus)
2. **Perhe (§3 c–g):** "Fyysiset testit alle ikätason", "alarajalla", `profiilipoikkeama`, "Taso laskenut" + "Kuormituksen tarkistus" (`suunta_lasku`), `hajonta` perustuvat kaikki Eerikkilä-tasoon. Sama periaate ("ei missään") johtaa niiden poistoon tai vain-näyttö-tilaan (C). Poistetaanko ne samassa PR:ssä vai erikseen? (Huomio: jos kaikki poistuvat, Tilanteen huomiot jäävät tekniikkaan ja "kehitys"-riviin; fyysistä heikkoutta ei näytetä lainkaan.)
3. **Termin rajaus:** "Eerikkilä-taso" = H-H-fyysiset tasot (`d1_taso`, `hh_taso`, osaindeksit) ja Eerikkilän tekniikkataso (syöttö/pujottelu). Eikö tämä koske SM-testien tasoja (`sm_pallo`/`sm_juoksu`), joita `lib/tm_tekniikka.js` käyttää raakatuloksista laskettuna? (Päätös 10.10.: SM-tasot kelpaavat — vahvistetaan.)
4. **Master (PR 3):** Masterin D1/D2-väritykset ja komposiitti (h) seuraavat samaa päätöstä (A: poisto/vain-näyttö).

## 6. Toteutus (kun päätetty)

PR 3:een (kaista Tero; VP_v25 + libit): poistot §4:n mukaan; fixture- ja testikorjaukset; Master samassa; kuvat + `?v=`-bumpit + lib_versiot. Rajaukset: ei kirjoituksia dataan, ei Rules-/functions-muutoksia, ei ruotsia.
