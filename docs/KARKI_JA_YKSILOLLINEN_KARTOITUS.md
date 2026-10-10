# Fyysinen heikkous: "Kärkipelaajat", "Fyysiset testit alle ikätason" ja "Yksilöllinen ohjelma" — kartoitus, päätökset ja luvut

> **Tila: päätökset kirjattu, luvut laskettu, ei toteutusta.** Toteutus PR 3:ssa (`lib/tm_fyysinen.js`, VP-kytkentä, Kärkipelaajien poisto, Master) vasta tämän mergen jälkeen.
> Luvut: `node scripts/diag_fyysinen.cjs [seura sjk|kpv | ika <seura>]` ja `node scripts/diag_karki_yksilo.cjs [seura …]` (vain luku, ei nimiä). Pohja `origin/main`, 10.10.2026.
> Tämä dokumentti korvaa aiemman version (ehdotus "poista kaikki Eerikkilä-pohjainen") Teron korjauksella alla.

## 0. Päätökset (Tero, 10.10.2026)

**Rajaus (korjaus aiempaan tulkintaan).** "Eerikkilä-tasoa ei käytetä heikkoutena" koskee **vain** Eerikkilän **tekniikkatestejä** (syöttö ja pujottelu, 3-portainen, otanta valtakunnan huippu) sekä `d2_taso`:a, kun se on johdettu niistä. **H-H-fyysiset tasot (1–5) ja SM-tasot ovat päteviä heikkouden mittareita**: taso 1 = alle kansallisen keskitason (Palloliitto FINAL2024). Sama rajaus on kirjattu `docs/TEKNIIKKA_MAARITELMA.md`:ään (P1, §2.1, §6).

1. **"Kärkipelaajien taso alle ikätason" -huomio poistetaan.** Se on yhdistelmä (max(D1, H-H, D2)), joka toistaa sekä tekniikan että fyysisen arvion.
2. **"Fyysiset testit alle ikätason" -huomio ja ehdotus `hh_taso_alhainen` ("Yksilöllinen ohjelma") yhtenäistetään samalla tavalla kuin tekniikka: uusi `lib/tm_fyysinen.js`.**
   - Tasot lasketaan **raakatuloksista** testihetken iällä (`normiIka`) ja sukupuolella; tallennettuja `d1_taso`/`hh_taso`-kenttiä ei lueta (ikäperusteen tarkistus §2).
   - **Pelaaja on kehityskohde, kun hänellä on vähintään yksi H-H-fyysinen testi tasolla 1.**
   - **§28 pre-PHV-neutraalius:** heikko 30 m, MAS tai CMJ ei tee kehityskohdetta PRE- tai LAH-vaiheen pelaajasta eikä pelaajasta, jonka PHV-tila on tuntematon. Käytetään `tmPhvTila`:a ja `idpKypsyysEstetty`:ä (`TM_KOTI_LUVUT.kypsyysEstetty`), sääntöä ei kirjoiteta uudelleen.
   - Joukkuesääntö, vanhuusraja 15 kk, "päivä tuntematon", "sukupuoli puuttuu", "otos pieni" ja "ei fyysistä dataa" samat kuin tekniikassa; joukkuesääntö jaetaan yhteiseen apufunktioon.
   - Huomio ja ehdotus antavat saman joukkuemäärän; kytkentätesti samalla mallilla kuin `tests/tm_tekniikka_kytkenta.test.js`.
3. **Ei muutoksia tässä sarjassa:** alaraja, profiilipoikkeama, taso laskenut, kuormitus (`suunta_lasku`), hajonta — kirjattu §5:een myöhempää katselmusta varten.
4. **Master:** D2-väritys `tm_tekniikka.js`:stä, D1 `tm_fyysinen.js`:stä (§28:n mukaan). Komposiitista poistetaan Eerikkilän tekniikkatestien heikkouskäyttö.

## 1. Kartoitus — nykytila

| | **A. Huomio "Kärkipelaajien taso alle ikätason"** (`kind: karki`) → **poistuu** | **B. Huomio "Fyysiset testit alle ikätason"** (`kind: fyysinen`) → `tm_fyysinen` | **C. Ehdotus "Yksilöllinen ohjelma" (`hh_taso_alhainen`)** → `tm_fyysinen` |
|---|---|---|---|
| Missä | `tm_vp_tilanne.js:141, 155, 219, 398–399, 412`; syöte `laskeJoukkuePoikkeamat` `talenttiydin` (`tm_eerikkila_normit.js:683–695`) | `tm_vp_tilanne.js:141, 155`; syöte `laskeJoukkuePoikkeamat` `alle_normin` fyysiset osa-alueet (`tm_eerikkila_normit.js:646–654`) + `poikkeamaPortti` (`tm_koti_luvut.js:183–193`) | `TalentMaster_VP_v25.html:22997–23001` (`TP_SIGNAALIT`), teksti `:23093`, `tm_vp_tilanne.js:171` |
| Mittari | `comp = max(d1_taso, hh_taso, D2)` (`:632`); D2 = `d2_taso` (sekalähde) tai **TKI/20** | joukkueen **osa-alueen ka** (kiihdytys, maksinopeus, voima, ketteryys, aerobinen) raakatuloksista `laskeD1Osaindeksit(hh_viimeisin, ikä, sp)`, mutta **ikä ja sukupuoli luetaan joukkueen nimestä** (`_jsvJoukkueIkaSp`), ei pelaajan testihetken iästä | tallennettu `hh_taso` (lin30m/cmj/mas) |
| Raja | kärkijoukon ka < 3,0 | osa-alueen ka < 3 (< 2,5 punainen); pre-PHV amber | `hh_taso < 2,5` |
| Joukkue-ehto | top-N (5/10) + `talenttiOhjelma`; yksi arvioitu pelaaja riittää | joukkueen keskiarvo; ei minimiä; **§28-portti: estetty, jos enemmistö (n·2 > yht) ei salli tulkintaa** | **≥ 2 pelaajaa**, ei osuutta, **ei §28-porttia** |
| Vanha data | joukkueen viimeisin mittauspäivä (hh/tki/flei) ≥ 12 kk → "mittaus vanha"; tuore FLEI peittää | sama (joukkueen viimeisin mittauspäivä) | **ei mitään** |
| Joukkue | `tmPelaajanJoukkueet` ✓ | ✓ | `_pOnJoukkueessa` (`tmPelaajanJoukkueet`-pohjainen) ✓ |

Havainnot:
1. **Huomio ja ehdotus ovat suoraan ristiriidassa §28:n kanssa.** SJK:lla PHV-tila on tuntematon 53 pelaajalla 61:stä, joten huomio B on §28:n takia **0 joukkuetta**, mutta ehdotus C laukeaa **5 joukkueelle** samoilla pelaajilla (se ei tunne portteja).
2. **Kärki (A) on osin tekniikkaa:** kypsän fixturen 4 joukkuetta (P10, P11, P12, T12) ja KPV:n T14 syntyvät kokonaan `D2`:sta (TKI/20 tai `d2_taso`), ei fyysisistä testeistä. Kypsän fixturen ehdotus "2 joukkuetta" on käsin annettu speksi (fixturessa ei ole H-H-dataa; oikea sääntö antaa 0).
3. **Kolme eri joukkuejoukkoa samalle datalle** (SJK): kärki 4 (P15, P16, T14, T15), fyysiset 0 (§28), yksilöllinen 5 (P14, P15, P16, T14, T15).

## 2. Ikäperuste: tallennetut `hh_taso` ja `d1_taso`

Kirjoituspaikat: Excel-tuonti `TalentMaster_Excel_Tuonti.html:3058–3066, 3100` (ikä = `laskeIka(syntymaVuosi, testipvm)` = `normiIka`, varalla joukkuenimen ikä), `recalcHH` (`normiIka`), `Testaus_v9`/`lib/tm_pikakentat.js` (`normiIka`). Eli **ikäperuste on koodissa oikea** (`normiIka` testipäivästä) — toisin kuin `sm_*_taso` (K11: joukkuenimen ikä). Varmistus datasta (`node scripts/diag_fyysinen.cjs ika <seura>`): tallennettu taso verrattuna raakatuloksesta lasketun kanssa kahdella ikäperusteella:

| Seura | hh_taso: sama kuin `normiIka`-laskenta | hh_taso: sama vain joukkuenimen iällä | d1_taso: ero molemmilla | Ei laskettavissa (sukupuoli/ikä) |
|---|---|---|---|---|
| SJK (58) | 58 (ikä sama molemmilla) | 0 | **4 / 54** | 0 |
| KPV (5) | 5 | 0 | 0 | 0 |
| Pallo-Iirot (28) | 28 (joista 3 vain `normiIka`-perusteella: 14:llä joukkuenimen ja `normiIka`-ikä eroavat) | **0** | 0 | 0 |
| Sibbo (63) | 53 (joista 9 vain `normiIka`) | **0** | 0 | 10 (sukupuoli puuttuu, ei P/T-tunnusta) |

**Johtopäätös:** tallennettu `hh_taso`/`d1_taso` seuraa oikeaa ikäperustetta (`normiIka`) eikä joukkuenimen ikää — ikäperuste ei ole syy välttää niitä. Silti ne **eivät kelpaa heikkouden luokitukseen**: (a) `hh_taso` käyttää vain lin30m/cmj/mas (ei 5 m, 10 m, käsirata, SM-juoksu), (b) SJK:n `d1_taso` poikkeaa raakatuloksesta lasketusta 4 pelaajalla 54:stä (7 %; tallennettu arvo on jäänyt jälkeen myöhemmästä testilisäyksestä), (c) laskenta vaatii sukupuolen, jonka ne lukevat vain kentästä, (d) tallennettu taso ei tunne vanhuutta eikä "päivä tuntematon" -tilaa. Raakatuloksista laskeminen (`tm_fyysinen`) korjaa kaikki. Päätös pysyy: tallennettuja ei lueta.

**Testipäivä:** H-H-testit yhdistetään `hh_viimeisin`-mapiin eri päiviltä; päiväkenttiä on `hh_pvm` (viimeisin H-H-testi *tekniikka mukaan lukien*) ja `testipaivat.fyysinen_hh` (fyysinen patteristo; SJK 58 / Sibbo 63 pelaajalla; SJK:lla 9 pelaajalla ≠ `hh_pvm`). `tm_fyysinen` käyttää `testipaivat.fyysinen_hh`:ta, varalla `hh_pvm`:ää (KPV: ei `fyysinen_hh`:ta). **Rajoitus:** yksittäisen testin oma päivä ei ole tallessa, joten 15 kk:n raja koskee koko fyysistä patteristoa (viimeisin päivä), ei yksittäistä testiä (§6 F3).

## 3. Uusi määritelmä: `lib/tm_fyysinen.js` (ehdotus toteutukseen)

**Pelaaja** — `tmFyysinenPelaaja(p, nytMs)`:
- **Testit** (`HH_TESTI_MAP`, ei tekniikka): `lin5m`, `lin10m` (kiihdytys), `lin30m` (maksinopeus), `cmj` (voima), `mas` (aerobinen), `kasirata` (ketteryys), `sm_juoksu` (suunnanmuutos). Ei `sm_pallo`/`pujottelu`/`syotto` (tekniikka, `tm_tekniikka`).
- **Taso** raakatuloksesta: `eerikkilaTaso(arvo (MAS ÷ 3,6), testi, ikä, sp)`; ikä `normiIka(syntymaVuosi, testipäivä)`, < 10 → ei tasoa, ≥ 20 → `M`/`N`; sukupuoli kuten tekniikassa (kenttä → P/T-tunnus → muuten ei tasoa, "sukupuoli puuttuu"); 0 = ei tasoa.
- **Kehityskohde**, kun ≥ 1 testi on tasolla 1 **eikä kaikkia tason 1 testejä neutraloida §28:lla**. Neutraloitu testi: osa-alueen kypsyysvahti `TM_KOTI_LUVUT.kypsyysEstetty(osaAlue, p)` (= `idpKypsyysEstetty` + `tmPhvTila`; PRE/LAH tai PHV tuntematon → gated-osa-alueet kiihdytys, maksinopeus, voima, aerobinen). Ei gated: ketteryys (käsirata), suunnanmuutos (`sm_juoksu`).
- **Tilat:** `kehityskohde` · `ok` · `neutraali` (tason 1 testit vain §28:n alla; ei mitattu, kuuluu joukkueen kokonaismäärään) · `ei_dataa` (syyt: `ei_mittausta`, `vanha`, `paiva_tuntematon`, `sukupuoli_puuttuu`, `ika_puuttuu`, `ika_alle_10`).
- **Vanhuus** 15 kk ja "päivä tuntematon" kuten `tm_tekniikka.tmTekniikkaPvmTila` (jaettu).

**Joukkue** — `tmJoukkueFyysinen(...)`: `tmPelaajanJoukkueet`; kehityskohde kun ≥ 1/3 mitatuista (≥ 5) tai ≥ 1/2 kaikista; otos pieni < 8; ilman luokkaa → "ei fyysistä dataa · N joukkuetta". **Jaettu apufunktio** `tmJoukkueSaanto({ yht, mitattu, kehityskohteita })` (uusi pieni lib `lib/tm_joukkuesaanto.js`, kokonaisluvut, 5/15 riittää), jota sekä `tm_tekniikka` (refaktoroidaan, testit takaavat samat tulokset) että `tm_fyysinen` kutsuvat. Syyt: osa-alue(et), joissa tason 1 testit ovat (nopeus, kiihdytys, voima, kestävyys, ketteryys, suunnanmuutos) — ehdotus: yleisin osa-alue.

**Näkymät:** Tilanteen huomio "Fyysiset testit kehityskohteena · N joukkuetta" + syy (osa-alue), rivi "Ei fyysistä dataa · N joukkuetta" + linkki testijaksoon; ehdotuksen tunniste `hh_taso_alhainen` säilyy (kommentti, että kattaa koko fyysisen ketjun), teksti "Yksilöllinen ohjelma": perustelu "Fyysiset testit ovat kehityskohteena."; kärkirivi poistuu (`talenttiydin`-haara, `KL/KN/KIND_JARJ.karki`); Kodin pulssi: yksi rivi lukumäärällä + linkki (kuten tekniikka). Uudet sv-avaimet tyhjinä uuteen erään. Vain henkilökunnalle (§7.22).

**Master:** D2-väritys `tm_tekniikka.js`:stä, D1 `tm_fyysinen.js`:stä (§28); komposiitista (`_lvl`, `Master_v16:9619, 9695, 9745`; `tm_eerikkila_normit.js:632, 716`) poistetaan `D2`:n (`d2_taso`/TKI/20/Eerikkilän tekniikka) heikkouskäyttö.

## 4. Luvut

### 4.1 Joukkueet: nykyinen huomio ja ehdotus · uusi luokitus (SJK, KPV, fixturet)

| Aineisto | Joukkueita | Kärkihuomio nyt (poistuu) | **Fyysiset-huomio nyt** | **Yksilöllinen-ehdotus nyt** | **UUSI: kehityskohteena** | ok | ilman luokkaa (josta ei fyysistä dataa) | otos pieni |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **SJK** | 6 | 4 | **0** (§28 estää 5) | **5** | **2** (P15, T14) | 1 (T16) | **3** (0) — P14, P16, T15 | 2 |
| **KPV** | 15 | 1 | 0 (P15: alaraja-huomio) | 1 (P15) | **1** (P15, 4/4) | 0 | **14** (13) | 1 |
| fixture pilotti | 15 | 2 | 0 | 0 (speksi: 3) | 0 | 0 | 15 (15) | 0 |
| fixture kypsä | 9 | 4 | 0 | 0 (speksi: 2) | 0 | 0 | 9 (9) | 0 |
| fixture kuormitus | 40 | 8 | 0 | 0 (speksi: 7) | 0 | 0 | 40 (40) | 0 |

Fixtureilla ei ole H-H-dataa lainkaan (PHV tuntematon kaikilla), joten uusi sääntö antaa kaikille "ei fyysistä dataa". **PR 3 lisää fixtureihin realistiset H-H-raakatulokset** (kuten PR 1 TKI:lle/SM:lle) ja PHV-tiloja, jotta §28-neutralointi ja luokat näkyvät.

### 4.2 Pelaajat (uusi sääntö, §28-neutralisoidut mukana)

| Seura | Pelaajia | PHV-tila | **Kehityskohde** | ok | **§28 neutraali** | ei dataa |
|---|---:|---|---:|---:|---:|---:|
| **SJK** | 61 | tuntematon 53 · AN 5 · PH 1 · POST 2 | **11** | 18 | **29** | 3 (ei mittausta) |
| **KPV** | 160 | tuntematon 160 | **4** (kaikki ketteryys: ei gated) | 1 | 0 | 155 (ei mittausta) |

SJK:lla **29 pelaajaa (48 %)** neutraloituu §28:lla, koska heillä tason 1 testit ovat vain kypsyysgated-testeissä (30 m, 5/10 m, CMJ, MAS) ja PHV on tuntematon. Siksi uusi sääntö löytää SJK:lta vain 2 kehityskohdejoukkuetta (P15: 8 kehityskohdetta 10 mitatusta; T14: 2 / 6), kun vanha ehdotus antoi 5. KPV:llä P15:n neljä kehityskohdepelaajaa ovat tason 1 ketteryydessä (käsirata, ei kypsyysgated).

### 4.3 Kärkipelaajat (poistuva): kypsä fixture 4, KPV 1, SJK 4

Kypsä fixture: P10 (ka 2,7), P11 (2,9), P12 (2,6), T12 (1,7) — kaikki vain TKI/20:stä. SJK: P15, P16, T14, T15. KPV: T14 (2,6; kokonaan `d2_taso` `tk`).

## 5. Ei muutoksia tässä sarjassa — kirjattu myöhempää katselmusta varten

| Kohta | Mittari · raja · joukkue-ehto | Rivi | Huomio katselmukseen |
|---|---|---|---|
| **Alarajalla** ("Fyysiset testit asteikon alarajalla") | osa-alueen joukkue-ka ≤ 1 (`D1_ALARAJA`; `eerikkilaTaso` palauttaa 1 kaikelle heikointa rajaa huonommalle) → "tarkista mittaus", vakavuus amber | `tm_koti_luvut.js:26, 187` | Tason 1 testi = sama asia kuin uusi kehityskohde-sääntö; päällekkäisyys uuden `tm_fyysinen`-säännön kanssa |
| **Profiilipoikkeama** (osa jää jälkeen) | heikoin osa ≥ 1,0 alle fyysisten osa-alueiden ka:n; amber | `tm_eerikkila_normit.js:655–666` | Suhteellinen; joukkuetaso, ei pelaajaa |
| **Taso laskenut** (`laskeva`) | ≥ 2 pelaajaa, joilla `hh_taso`-delta < −0,3 tai TKI-delta/20 < −0,3; punainen | `tm_eerikkila_normit.js:667–674` | Käyttää tallennettua `hh_taso`/`_edellinen`-paria ja **TKI/20-muunnosta** (PR 3 poistaa TKI-muunnokset, §1.2) |
| **Kuormitus** (ehdotus `suunta_lasku`, "Kuormituksen tarkistus") | ≥ 2 pelaajaa, `hh_taso − hh_taso_edellinen` < −0,3 | `TalentMaster_VP_v25.html:23002–23006`, `:23095` | Tallennettu `hh_taso`; ei §28/vanhuusporttia |
| **Hajonta** (`hajonta`) | ≥ 33 % pelaajista `comp` ≤ 2 ja `comp`-ka ≥ 2,5 | `tm_eerikkila_normit.js:675–682` | **Käyttää samaa `comp`-komposiittia kuin Kärkipelaajat** (sis. D2); kun D2 poistuu komposiitista (Master/PR 3), `hajonta` muuttuu — katselmoitava |

(Muut: `tki_lahella_merkkia` (TKI 35–54) ja `tkk_puuttuu` kuuluvat tekniikkaan/datapuutteisiin, ei tähän.)

## 6. Ristiriidat ja kysymykset (ennen toteutusta)

- **F1. §28 neutraloi SJK:ssa 48 % pelaajista** (PHV tuntematon 53/61: vain 8 pelaajalla on mitattu PHV). Sääntö on Teron ("tuntematon → neutraali"), ja se on johdonmukainen olemassa olevan portin kanssa, mutta seuraus on, että fyysinen kehityskohde jää SJK:lla pieneksi ja nojaa ketteryyteen/SM-juoksuun. Ei estä toteutusta; kerrotaan, jotta tulos ei yllätä.
- **F2. Gate kattaa myös 5 m ja 10 m** (kiihdytys): `IDP_OSA_AVAIN`/`IDP_KYPSYYS_GATED` sisältää kiihdytyksen (Tero 7.10.2026, #837), vaikka päätös mainitsee vain 30 m, MAS ja CMJ. Käytämme olemassa olevaa vahtia sellaisenaan (ei uudelleenkirjoitusta); 5/10 m neutraloidaan siis samoin. Vahvistus pyydetään.
- **F3. Päivä per patteristo, ei per testi** (§2): 15 kk:n raja koskee fyysistä patteristoa (`testipaivat.fyysinen_hh`, varalla `hh_pvm`). Yksittäinen vanha testi uuden patteriston sisällä ei vanhene erikseen.
- **F4. `sm_juoksu` fyysisenä testinä:** `sm_juoksu` kuuluu H-H-fyysisiin testeihin (suunnanmuutos, ei gated), joten sen taso 1 tekee pelaajasta fyysisen kehityskohteen — vaikka tekniikkasäännössä (K15) SM-juoksu 1 + SM-pallo 1 on "nopeus ja tekniikka samalla tasolla", ei tekniikan kehityskohde. Kaksi sääntöä lukee saman SM-juoksu-arvon eri tavoin; se on tarkoituksellista (eri kysymys), mutta sama pelaaja voi olla fyysinen kehityskohde ja neutraali tekniikassa. Vahvistus pyydetään.
- **F5. Tallennettu `d1_taso` jäljessä** SJK:lla 4/54 (7 %) raakatuloksista lasketusta; muut `d1_taso`-käyttäjät (Master, VP-kortit, Hidden Gem) lukevat edelleen tallennetun. Ei tämän sarjan asia; kirjataan.
- **F6. Fixturen käsin annetut `huomiot`/`ehdotukset`-speksit** (`scripts/vp_fixturet_kirjoita.cjs`) sisältävät fyysisiä ja kärkirivejä: PR 3 poistaa kärki-/yksilöllinen-speksit ja johtaa ehdotuksen samasta funktiosta (kuten PR 2 teki tekniikalle).
- **F7. Uusi termi "kehityskohde" fyysiselle:** teksti "Fyysiset testit kehityskohteena" korvaa "alle ikätason" (tekniikan kanssa yhdenmukainen). Syy-teksti ehdotuksena osa-alue (nopeus, kiihdytys, voima, kestävyys, ketteryys, suunnanmuutos). Vahvistetaan toteutuksessa; sv tyhjinä.

## 7. Toteutus (PR 3, kun tämä on mergattu)

`lib/tm_joukkuesaanto.js` (jaettu), `lib/tm_fyysinen.js` + yksikkötestit (kaikki §3:n tilat, molemmat sukupuolet, tason 1 / PHV-neutralointi PRE/LAH/tuntematon/POST/AN, testit 9/10/19/20, vanhuus, päivä tuntematon, sukupuoli puuttuu, otos pieni, 5/15, §28-vartija: lib ei kirjoita sääntöä uudelleen), fixture-H-H-data, VP-kytkentä (huomio B, ehdotus C, Tilanne, pulssi), kärki-poisto, `tests/tm_fyysinen_kytkenta.test.js` (huomio = ehdotus = pulssi), Master (D2 `tm_tekniikka`, D1 `tm_fyysinen`, komposiitti), kuvat + `?v=`-bumpit + sv-erä. PR 4 (harjoitelogiikka, K14) ennallaan. Rajaukset: ei kirjoituksia dataan, ei Rules-/functions-muutoksia, ei ruotsia.
