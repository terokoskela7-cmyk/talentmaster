# Pelaajan ja huoltajan kortit: mitä näkyy nyt ja mitä on suunniteltu

> **Selvitys 4.10.2026** (vain dokumentaatio, ei koodimuutoksia). Pohja: `origin/main` @ `b8fc1ec8`.
> Lähteet: `TalentMaster_Pelaaja_v7.html`, `TalentMaster_Vanhempi_v2.html`, `lib/tm-kortit.js`, `docs/KORTTI_VISIO.md`,
> `docs/KORTTI_KATALOGI.md`, `docs/CODE_OHJE_MINA_KORTIT_KESKIOON.md`, `docs/CODE_OHJE_KEHITYSKORTTI_KAANTO_JA_TASOMALLI.md`,
> `docs/CODE_BRIEF_P722_TASO_XP_PELAAJA.md`, `docs/OPAS_PERHE.md`, CLAUDE.md §7.22 sekä taidot `tm-sovellukset` (§16, §36, §37)
> ja `tm-kehitysbiologia` (§25, §28). Kirjoittajat haettu kenttänimillä kaikista sovelluksista ja libeistä.
> Rivinumerot viittaavat tähän committiin. Lyhenne `P7:n` tarkoittaa `TalentMaster_Pelaaja_v7.html:n` ja `V2:n` `TalentMaster_Vanhempi_v2.html:n`.
>
> **Tuotantodata:** tätä dokumenttia kirjoitettaessa tuotantoa ei luettu. Topiaksen tarkat kentät saadaan
> lukuskriptillä `scripts/diag_pelaaja_kortit.js` (§2).

---

## 0. Tiivistelmä

1. **Ennätys ei näy, koska Pikakirjaus ei kirjoita `ennatykset`-kenttää.** Kenttää kirjoittavat vain Testaus_v9 ja Excel_Tuonti.
   Pelaaja, jonka 30 m on kirjattu Pikakirjauksella, näkee tekstin *"Ei ennätyksiä vielä — tee testi, niin voitat itsesi!"*, vaikka testi on juuri tehty.
   **Korjaus on työn alla** rinnakkaisessa PR:ssä `feat/pelaaja-oma-ennatys`.
2. **"Huippuvauhtia" ja Nopeus-legenda ovat ristiriidassa.** Sama 30 m:n huipputaso sytyttää "Huippuvauhtia"-tekstin, mutta Nopeus-legendan
   ansaintafunktio kutsuu `hhLaskeTaso('lin30m', …, 'M')`. Pelaaja-appissa funktio odottaa avaimia `'30m'` ja `'P'`/`'T'`, joten se palauttaa
   `null`. **Nopeus-legenda ei voi syttyä kenellekään** (P7:n :2821). Kokoelmassa lapselle näkyy samalla lukittu polku *"30 m huipputaso →"*,
   vaikka hän on jo saavuttanut sen.
3. **§7.22-rikkeitä on elävissä appeissa:**
   - Tänään-näkymän kultakortti näyttää kaikille ikävaiheille luvun `flei×0,9+10` tekstillä *"Kehittyy kohti huippua"* (P7:n :1158).
   - Tekniikkaprofiili näyttää TKI-luvun sekä pelaajalle (P7:n :2125) että huoltajalle (V2:n :1188).
   - Rakentajan (U13–15) kortilla näkyy "taso X/5" jokaisessa osa-alueessa.
   - Huoltajan kausikortissa on "Kortti 0–99" -numero.

   Tarkemmin kohdassa §5.
4. **Elite-taso on saavuttamaton.** Elite vaatii 5 mitattua osa-aluetta, mutta SOS (D5) on aina "seura avaa" eikä se koskaan laske mukaan
   (P7:n :5195). Siksi enintään 4/5 on mahdollinen, ja Sharp-pelaaja näkee pysyvästi tekstin *"Kohti Elite"*.
5. **Kolme kokoelmakorttia ei voi syttyä:** Piilohelmi, X-Factor ja Nopeus-legenda. Lisäksi `signaali`-merkki, huoltajan
   kortti-, Stage- ja treenimäärä sekä MAS-trendi ovat datakatkoksen takana (§4).

---

## 1. Korttitaulukko

### 1.0 Ikävaiheet ja yhteiset määritelmät

| Mikä | Missä | Sääntö |
|---|---|---|
| Pelaajan ikävaihe | `_laskeStage` P7:n :4497 | `phv_tila` = `'PH'`/`'huippu'` → `1_leikkija`. Muuten ikä = kuluva vuosi − `syntymaVuosi`: ≤12 → `1_leikkija`, 13–15 → `2_rakentaja`, 16+ → `3_showcase` |
| Kortin ikävyöhyke | `_fcKorttiData` P7:n :5224–5225 | sama `_laskeStage` → leikkija / rakentaja / showcase |
| Huoltajan ikäryhmä | `_kasitteleLapsi` V2:n :1618–1619 | vain `syntymaVuosi`: ≤12 → `u12`, ≤15 → `u15`, muuten `u19` (PHV ei vaikuta) |
| Rooli | — | Pelaaja_v7 = PIN-kirjautunut pelaaja (anonyymi auth). Vanhempi_v2 = huoltaja. Muut roolit eivät näe näitä näkymiä |

**Kirjoittajien lyhenteet** (kenttä → mikä sovellus tai lib kirjoittaa sen pelaajadokumenttiin):

| Lyhenne | Kirjoittaja | Kirjoituskohta |
|---|---|---|
| **PK** | Pikakirjaus (VP_v25:17391, Master_v16:3971) | `lib/tm_pikakirjaus.js:276` → `lib/tm_pikakentat.js:114` `tmLaskePikakentat`: `hh_viimeisin`, `hh_pvm`, `hh_taso`, `d1_*`, `d2_*`, `tki_viimeisin`, `tki_pvm`, `tki_merkki`, `tk_lajit_viimeisin`, `tk_kokonaistulos_viimeisin`, `hh_historia`, `tki_historia`. **Ei** `ennatykset`, vahvuus- ja kehityskohdekenttiä, `*_edellinen`-kenttiä eikä `mas_kmh`:ta. Testitulosdokumentin protokolla on `'pikakirjaus'` (:93) |
| **T9** | Testaus_v9 | `_v6TallennaPelaajienKentat` :3089: `ennatykset` (:2921), historiat (:2933), pikakentät kuten PK (:3016). Kasvumittaus kirjoittaa `phv_tila` (:3216) ja `biologinenIka_viimeisin` (:3215) |
| **EX** | Excel_Tuonti | `profiiliUpdate` :3124–3282 (lähes kaikki pikakentät, myös `tki_vahvuus`/`tki_kehityskohde`, `*_edellinen`, `mas_kmh`, `sm_pallo_viimeisin`, `rae_kvartaali`, `ennatykset`). recalcHH :4369–4399 kirjoittaa `hh_vahvuus` ja `hh_kehityskohde`. `tekninen_varhaiskehitys` :4924. `testitulokset`-dokumentit protokollalla (:3087, :3112) |
| **TTM** | Testituonti_Master | `ttTallennaPelaaja` :1358–1382: vain `flei_viimeisin`, `flei_pvm`, `flei_historia` ja `phv_tila`. Tulokset menevät `testitapahtumat/{id}/tulokset`-kokoelmaan, eivät pelaajan pikakenttiin |
| **HL** | Harjoitettavuus_Lomake_v4 | `flei_viimeisin` :2321, `phv_tila` :2335 |
| **ADAR** | ADAR_Pikakortti ja Master_v16 | `lib/tm_pelialy_yksilo.js:297–299`: `adar_viimeisin`, `adar_havaintoja`, `adar_pvm` |
| **VP/MA** | VP_v25 / Master_v16 | `idp_tila`/`idp_fokus` (Master :6940, VP :7127, `lib/tm_idp.js:593`), `jaksofokus` (Master, VP, Pelihavainto_Kentta), `d3_viimeisin` (Master :10042, VP :15224) |
| **P7** | Pelaaja itse | `streak` kirjauksen yhteydessä (:4682), D3-itsearvio (:2637), `idp_kausi.pelaaja_sitoumus` ja `idp_sitoumus_pvm` (:2755) |

### 1.1 Pelaaja_v7: TÄNÄÄN-välilehti (`rA1` :962)

| Kortti | Lukee | Näkyvyysehto | Kun data puuttuu | Kirjoittaja |
|---|---|---|---|---|
| Putkiviesti + signaalimerkki (:966–970, `_signaaliLabel` :6067) | `streak` (laskettu `kirjaukset`-alikokoelmasta :5863–5876), `signaali` | merkki näkyy, jos `signaali` ∈ {`x-factor`, `gem`, `phv`} tai putki ≥ 7 | merkki piilossa | putki: P7. **`signaali`: ei tuotantokirjoittajaa** (vain demo-fc ja VP-demodata, jotka käyttävät eri arvoja `xfactor`/`hidden`) |
| RAE Q4 -kortti (:972–985) | `rae_kvartaali` tai laskettuna `syntymaaika`:sta | kvartaali = Q4 | piilossa | EX :3240/:4398, `scripts/backfill_rae.js`. Varalla lasketaan syntymäajasta |
| D-kortti "Tänään" (:988–1025) | `valitsePaivanHarjoite` (kehityskohteet `tki_*`/`hh_*`) | aina | varalla FLEI-ohjelma | ks. kehityskohteet |
| S-kortti "Kohdennettu kehitys" (:1029–1060) | `flei_viimeisin` | FLEI on olemassa | piilossa | EX :3124, TTM :1369, HL :2321 |
| T-kortti Bola Siempre (:1063–1080) | ikävaihe | aina | — | — |
| **Kultakortti-OVR** (:1155–1167) | `flei_viimeisin` | **aina, kaikki ikävaiheet** | näyttää luvun **10** | FLEI: EX, TTM, HL |

### 1.2 Pelaaja_v7: MINÄ, kärki (`rMina` :3115)

| Kortti | Lukee | Näkyvyysehto | Kun data puuttuu | Kirjoittaja |
|---|---|---|---|---|
| **Hero-kortti** (`rMinaHero` :2895) ja **flip-kortti** (`naytaFcOverlay` :5282, data `_fcKorttiData` :5159) | FYS `d1_taso` (+`phv_tila`) · TEK `tki_viimeisin`/`d2_taso` · PSY `d3_viimeisin` · ÄLY `adar_viimeisin` + `adar_havaintoja`≥3 · SOS – · tier · `tki_edellinen`, `hh_taso(_edellinen)` (↗-siru) · piirteet `tki_merkki`, `tekninen_varhaiskehitys`, `hidden_gem`, putki | aina. **Showcase** ja ≥3 mitattua → OVR-luku. **Rakentaja** → kehityskaarirengas *"N / M mitattu"* ja per osa-alue **taso X/5** (:2910, :5297, :5320–5365). **Leikkijä** → *"Kortti rakentuu"* ja ✓ | ⏳ *"Tulossa — valmentaja mittaa"* (FYS/TEK/ÄLY) · 🔒 *"Seura avaa myöhemmin"* (PSY/SOS) · 🌱 PRE/LAH-tilassa FYS | `d1`/`d2`/`tki`: PK, T9, EX · `d3`: P7, VP/MA · `adar`: ADAR · **SOS: ei kirjoittajaa** |
| **Korttikokoelma-nauha** (`rMinaKokoelma` :3041, `_kkStripKortit` :2981, rekisteri `KORTTI_KATALOGI` :2795) | ks. alla | aina, kun kortteja on | lukittu kortti näyttää avautumispolun | ks. alla |

**Kokoelman kortit** (`KORTTI_KATALOGI`, P7:n :2795–2834). Kaikki toimivat kaikissa ikävaiheissa.

| id | Ansainta (pikakenttä) | Kirjoittaja | Tila |
|---|---|---|---|
| `legend_tekniikka` :2818 | `tki_merkki === 'kulta'` | PK (TKI vain 8–13 v), T9, EX | toimii |
| `legend_nopeus` :2820 | `hhLaskeTaso('lin30m', …, 'M'/'N') >= 5` | PK, T9, EX | **🔴 ei voi syttyä** (avainvirhe, §4) |
| `idol` :2822 | `_fcKorttiData(p).idoli` on tosi | — | **ansaittu aina**. Idolin oletus on `'Maestro'` (:5245), joten otsikon *"· uusi 🔥"* (:3053) näkyy pysyvästi |
| `rare_piilohelmi` :2827 | `hidden_gem` | **ei kirjoittajaa** | 🔴 ei voi syttyä |
| `rare_varhais` :2829 | `tekninen_varhaiskehitys` | EX (recalc :4924) | syttyy vain Excel-recalcin jälkeen |
| `rare_xfactor` :2831 | `x_factor` | **ei kirjoittajaa** | 🔴 ei voi syttyä |
| `ach_ensitreeni` :2803 | putki > 0 tai kirjauksia > 0 | P7 | toimii |
| `ach_liekki7` / `ach_liekki14` | putki ≥ 7 / ≥ 14 | P7 | toimii |
| `ach_synttari` | `_onkoSynttari` (:4231; varalla 15.6.) | rekisteröinti | lukittu muina päivinä |
| `ach_ekamittaus` | `tki_viimeisin` / `hh_viimeisin` / `flei_viimeisin` | PK, T9, EX, TTM, HL | toimii |
| `merkki_*` ×4 :2810–2813 | `tk_lajit_viimeisin.<laji>_s` + `tkLajiViite` | PK*, T9, EX | toimii (*PK laskee TKI:n vain, jos TKI-funktiot on ladattu) |
| liekki (nykytila) | putki | P7 | toimii |

### 1.3 Pelaaja_v7: MINÄ, kokoontaittuvat ryhmät

| Ryhmä → kortti | Lukee | Näkyvyysehto | Kun data puuttuu | Kirjoittaja |
|---|---|---|---|---|
| 🎯 **Kausitavoite** (`rMinaTavoite` :2476) | `idp_kausi` (lataus), `idp_fokus`, `idp_tila` | tavoite on olemassa | *"Kausitavoite tulossa"* (:2485) | VP/MA, `lib/tm_idp.js:593` |
| 🎯 **Sitoumus** (`rMinaSitoumus` :2663) | fokus (`idp_fokus` / `jaksofokus`), `idp_kausi.pelaaja_sitoumus` | aina | ohje *"Kun sinulle asetetaan jaksofokus…"* | fokus: VP/MA. Sitoumus: P7 |
| ⚡ **Tekniikkaprofiili** (`rMinaTekniikkaprofiili` :2098, data `_lataaTekniikka` :1516) | **`testitulokset`-alikokoelma** (protokolla `tekniikkakilpailu`) → TKI, merkki, lajipalkit, trendi. Rivit: `tki_vahvuus`, `tki_kehityskohde`, `tk_lajit_viimeisin`, `tk_kokonaistulos_*` | tekniikkakilpailudokumentti on olemassa | H-H-syöttö/pujottelu sekunteina tai *"Mittaukset tulossa"* (:2114) | kilpailudokumentit vain **EX** (:3087/:3901). PK kirjoittaa protokollalla `pikakirjaus` ja T9 `testitapahtumiin` → profiili näyttää "tulossa", vaikka TKI-pikakentät on asetettu |
| ⚡ **Vauhti & pallo** (`rMinaFyysinenTavoite` :1754) | `hh_viimeisin`, `hh_vahvuus`, `hh_kehityskohde`, `sm_pallo_viimeisin`, `hh_taso`, `hh_taso_edellinen`/`hh_historia` | `hh_viimeisin` on olemassa | piilossa. *"Nopeustestit tulossa"* (:1819) vain, jos kaikki arvot ovat tyhjiä | `hh_viimeisin`: PK, T9, EX. `hh_vahvuus`/`hh_kehityskohde`: **vain EX recalcHH** |
| ⚡ **Juoksumoottori/MAS** (`rMinaMAS` :1563) | `mas_kmh` tai `hh_viimeisin.mas`, `mas_ms`, `mas_historia` | MAS on olemassa | piilossa | `mas_kmh`: EX :3169. `hh.mas`: PK, T9, EX. **`mas_historia`: ei kirjoittajaa** (showcase-trendi ei syty) |
| ⚡ **Kehitysvaihe** (`rMinaKehitysvaihe` :1462) | `phv_tila`, `biologinenIka_viimeisin` (`mittauspaiva`, `yli_ikaisyys`) | `phv_tila` on olemassa | koko kortti piilossa. Biologinen ikä -rivi näyttää **aina** *"Tulossa myöhemmin"* (:1505) | `phv_tila`: T9 :3216, EX :3172, TTM :1375, HL :2335. `biologinenIka_viimeisin`: vain T9 :3215 |
| ⚡ **Konseptifokus** (`rMinaKonseptiFokus` :2078) | `jaksofokus.konsepti_avain`, varalla `tki_kehityskohde` → oletus `y_h1` | aina | oletuskonsepti | VP/MA, Pelihavainto_Kentta |
| 💬 **Itsearvio** (`rMinaItsearvio` :2567) | `d3_viimeisin` | aina (toimintapiste, kun tekemättä) | tyhjä lomake | P7 :2637, VP/MA |
| 🏅 **Liekki + lepopäivä** (`rMinaEdistyminen` :3067) | putki, kirjausmäärä | aina | *"Aloita putki tänään"* | P7 |
| 🏅 **Ennätykset** (`_kkEnnatyksetHTML` :2870) | `ennatykset` (leikkijällä enintään 4) | aina | *"Ei ennätyksiä vielä — tee testi, niin voitat itsesi!"* (:2876) | T9 :2921, EX :3282. **PK ei kirjoita (korjauksessa)** |
| 🏅 **Kehityskaari** (`rMinaKehityskaari` :3028, `lib/tm_kehityskaari.js:466`) | `hh_historia`, `tki_historia`, `flei_historia`, `adar_viimeisin`/`adar_edellinen` | jokin historia on olemassa | piilossa, tai *"täyttyy kun ≥2 mittausta"* | PK, T9, EX, ADAR |
| ⚙️ Profiili (:1392) ja Asetukset (:2186) | perustiedot | aina | Asetuksissa *"Tulossa pian — ilmoitukset, jaa linkki vanhemmalle"* (:2205) | — |

**MEISTÄ-välilehti** (`rMeista` :3844): *Valmentajalta*-viestit (:3886) sekä kovakoodattu *"Sisältö tulossa — Joukkue, valmentajat, kalenteri — Vaihe B3"* (:3851).

**Kuollut koodi** (ei kutsujia, ei näy käyttäjälle): `rKortti` :1326 (vanha kortti-välilehti), `rTestit` :1251, `rJoukkue` :1182, `rAdar` :6082, `rAikajana` :6162, `rRPE` :6005 ja `_rMinaStub` :2173. `rParent` (:3430) on kovakoodattu demonäkymä. `lib/tm-kortit.js` (idoli- ja saavutuskortit localStorageen) **ei lataudu yhteenkään elävään sivuun**. Se on rinnakkainen, käyttämätön korttimalli, jossa on eri tasonimet (Nouseva/Lahjakas/Tähti/Legenda) ja 15 omaa saavutusta.

### 1.4 Vanhempi_v2 (huoltaja)

| Kortti | Lukee | Näkyvyysehto | Kun data puuttuu | Kirjoittaja |
|---|---|---|---|---|
| Koti: tarina ja kehunapit (`rKoti` :641) | uusin kirjaus | aina | neutraali tervehdys | P7 / huoltaja |
| Koti U12: viikon kirjaukset, valmentajan viesti, vinkki (:692) | `kirjaukset`, valmentajan viestit | `u12` | tyhjä tila | P7, valmentaja |
| Koti U15: viikkorivit (:730) | `kirjaukset` | `u15` | tyhjä tila | P7 |
| Koti U19: **Kehityskaari** (:757–765) | ei mitään | `u19` | **aina** *"Kehityskaari ja kuukausikooste näkyvät kun seuran data on kirjattu"* | **ei toteutusta** |
| Viikko (`rViikko` :882) | `kirjaukset` | aina | tyhjä tila | P7 |
| Viestit (`rValmentaja` :1129) | valmentajan viestit | aina | tyhjä tila | valmentaja |
| **Kausikortti** (`rKortti` :1247) | `kortti`, `pelinumero`, `streak`, `treeneja_kausi`, `stage`, `signaali` | aina | `kortti` **"—"**, `treeneja_kausi` 0, Stage "—". Kausi on kovakoodattu **"2025/26"** (:1253). Jaa-nappi ei tee mitään (:1318) | `streak`: P7. **`kortti`, `treeneja_kausi`, `stage`, `pelinumero`, `signaali`: ei tuotantokirjoittajaa** |
| **Tekniikkaprofiili + Miten tukea** (`rVanhempiTekniikka` :1169) | `tk_lajit_viimeisin`, `tki_viimeisin`, `tki_merkki`, `tki_vahvuus`, `tki_kehityskohde`, `tk_kokonaistulos_viimeisin`, `tk_lajit_pvm` | `tk_lajit_viimeisin` ja `tki_viimeisin` | *"Mittaukset tulossa — täältä näet sitten {nimen} vahvuudet…"* | PK, T9, EX (vahvuus ja kehityskohde vain EX) |

Huoltaja **ei näe** kehitysvaihetta, ennätyksiä, kokoelmaa, vauhtia, MAS:ia eikä konseptifokusta.

---

## 2. Topiaksen nykytila

**Tunnistus:** `seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I` (CLAUDE.md §7.8, kaksi u:ta). Testipelaaja, `sukupuoli: "M"`,
`syntymaVuosi: 2013` (`docs/ARKKITEHTUURI.md` §Testipelaaja). Vuonna 2026 hän on **13-vuotias**, joten pelaajan ikävaihe on
**`2_rakentaja`** ja huoltajan ikäryhmä **`u15`** (kumpikaan ei muutu, koska `phv_tila` ei ole `PH`).

### 2.1 Mitä Teron havainnot kertovat datasta (päätelty koodista)

| Havainto | Mistä se tulee | Mitä se kertoo datasta |
|---|---|---|
| **"Huippuvauhtia"** | Vauhti & pallo (P7:n :1803–1813) | `hh_viimeisin` on olemassa. Tavoiteriviä ei muodostunut, eli `hh_kehityskohde` puuttuu (PK ei kirjoita sitä) tai sen kynnys on jo ylitetty, eikä `sm_pallo_viimeisin`:llä ole tavoitetta. Vähintään yksi H-H-arvo, todennäköisesti Pikakirjauksen **30 m**, on Eerikkilä-normissa **ylimmällä tasolla** 13-vuotiaalle pojalle (`hhSeuraavaTaso` palauttaa `seuraavaTaso: null`). *"Kehityit"*-riviä ei tullut, koska aiempaa mittausta ei ole |
| **Kehitysvaihe: "Kasvuvaihe / Kehittynyt vaihe" ±0.5 v** | `rMinaKehitysvaihe` :1462–1509 | `phv_tila === 'AN'` (jälki-PHV, offset > +1,0). ⚠️ AN 13-vuotiaana tarkoittaa kasvupyrähdystä alle 12-vuotiaana. Se on mahdollista mutta harvinaista, joten arvon alkuperä kannattaa tarkistaa: tuliko se Excel-/Testituonti-sarakkeesta vai Testaus_v9:n kasvumittauksesta? Jos *"Mitattu pp.kk"* -riviä ei näkynyt, `biologinenIka_viimeisin` puuttuu. Silloin arvo on tullut EX-, TTM- tai HL-sarakkeesta eikä Mirwald-mittauksesta. ±0.5 v näkyy aina kovakoodattuna |
| **"Biologinen ikä – Tulossa myöhemmin"** | :1502–1506, kovakoodattu | Ei kerro datasta mitään. Rivi näkyy aina, kun `phv_tila` on olemassa. Khamis-Roche on lukittu (`lib/tm_bioika.js:78` `KR_VERIFIOITU = false`) ja bio-banding V2 on lykätty (päätös 1.7.2026), joten **aikataulua ei ole** |
| **Ennätys ei näkynyt** | `_kkEnnatyksetHTML` :2870–2876 | `ennatykset` puuttuu tai siinä ei ole `lin30m`:ää. Pikakirjaus ei kirjoita kenttää (`lib/tm_pikakirjaus.js:276–288`, `lib/tm_pikakentat.js:114`). **Korjauksessa: PR `feat/pelaaja-oma-ennatys`** |

**Mitä Topias todennäköisesti näkee lisäksi** (päätelty samasta datasta ja `ARKKITEHTUURI.md`:n `flei_viimeisin: 62`:sta. Varmista skriptillä):

- **Tänään:** kultakortti **"66 · Kehittyy kohti huippua"** (62 × 0,9 + 10). Raaka OVR-tyyppinen luku rakentajalle (§5). S-kortti näkyy, koska FLEI on olemassa.
- **Hero:** rakentajan kehityskaarirengas. FYS näyttää "taso X/5", jos PK on kirjoittanut `d1_taso`:n. TEK on ⏳, ellei `d2_taso`:a tai TKI:tä ole. PSY on 🔒, kunnes hän tekee itsearvion (itsearvio avaa PSY:n, vaikka kortti sanoo *"seura avaa"*). ÄLY on ⏳ tai "varhainen" (<3 ADAR-havaintoa). SOS on 🔒. Tier on todennäköisesti **Starter** (<3 mitattua).
- **Kokoelma:** ★ Idoli (aina) ja ● Ensimmäinen mittaus. **Nopeus-legenda lukittuna** polulla *"30 m huipputaso →"*, vaikka sama 30 m antoi "Huippuvauhtia". Tekniikkamerkit ovat lukossa, ellei TK-lajeja ole kirjattu. Otsikossa *"· uusi 🔥"* pysyvästi.
- **Tekniikkaprofiili:** *"Mittaukset tulossa"*, ellei `testitulokset`-kokoelmassa ole `tekniikkakilpailu`-dokumenttia.
- **Huoltaja (u15):** kausikortti, jossa "—", Streak, Treenejä 0 ja Stage "—". Tekniikkaprofiili *"Mittaukset tulossa"*, ellei `tk_lajit_viimeisin`:ää ole.

### 2.2 Tarkka kenttälista — Tero ajaa

Skripti `scripts/diag_pelaaja_kortit.js` on **pelkkä lukutyökalu**: siinä on vain `.get()`-kutsuja, ei yhtään `set`-, `update`-, `delete`-, `batch`- tai `add`-kutsua. Tunnistus tehdään gcloud ADC:llä samaan tapaan kuin muissa `scripts/diag_*.js`-skripteissä, ei palvelutilin avaimella. Normilaskenta ladataan samoista libeistä kuin selaimessa (`lib/tm_eerikkila_normit.js` ja `docs/testit_indeksit.js` vm-sandboxissa).

```
Tero ajaa:  ! node scripts/diag_pelaaja_kortit.js
(muu pelaaja: --seura=kpv --etunimi=X --sukunimi=Y  tai  --id=<docId>)
```

Tuloste: (1) korttien pikakentät whitelistillä, ilman PIN:iä, sähköposteja, huoltajatietoja ja vapaatekstejä, (2) alikokoelmien määrät
(`testitulokset` protokollittain ja pikakirjausdokumenttien testit, `kirjaukset` ja laskettu putki, `biologinen_ika`, `idp_kausi`), (3) jokaisen kortin tila
**NÄKYY / TULOSSA / TYHJÄ / PIILO / LUKITTU / ANSAITTU** perusteineen ja P7- tai V2-rivinumeroineen. Nopeus-legendasta tulostetaan sekä koodin palauttama arvo
(`null`) että oikeilla avaimilla laskettu taso.

> **Paikka ajon tulokselle** (Tero liittää tähän tai PR-kommenttiin):
> ```
> (tyhjä — täytetään ajon jälkeen)
> ```

---

## 3. Suunnitelma vs. toteutus

| Lupaus (lähde) | Tila | Huom |
|---|---|---|
| Vaihe 0 tasokortti Starter/Sharp/Elite (KATALOGI) | ⚠️ rakennettu, osin rikki | **Elite on saavuttamaton** (SOS ei koskaan laske). KATALOGIN `tasot` (P7:n :2797, `_kkMitattuja`: hh/tki/flei/d1/d2) ja näytetty tier (`_fcKorttiData`: FYS/TEK/PSY/ÄLY/SOS) laskevat "mitatun" **eri tavoin**. `tasot`-rekisteriä ei renderöidä |
| OVR vain showcase (U16+), U12:lle ei OVR-lukua (§16, §36, TASOMALLI Osa B) | ❌ ristiriita | Hero ja flip noudattavat sääntöä, **mutta Tänään-kultakortti (:1158) näyttää luvun kaikille** |
| Vaihe 1 saavutukset: 1. treeni, 7/14 pv liekki, synttäri, 1. mittaus, **oma ennätys** (KATALOGI) | ⚠️ osittain | `ach_omaennatys` **puuttuu koodista** (katalogissa 5 saavutusta, docissa 6) |
| Vaihe 1 tekniikkamerkit pronssi→hopea→kulta | ✅ | Docin "paransi → hopea" on toteutettu viitetasona (`hyva`), ei omana parannuksena |
| Vaihe 1 liekki-lepo (ei nollaudu, paluu juhlitaan) | ✅ (UI) | Luku `_laskeStreak` (:5833) nollaa putken silti. Lepo on kerronnallinen "palannut"-tila |
| Lepopäivä-merkki omana korttina (VISIO §4, KATALOGI) | ❌ | Vain tekstilaatikko *"Lepopäivä kuuluu kasvuun"* (:3079), ei kerättävää korttia |
| Vaihe 1.5 ennätykset: päivitetään **kaikissa** kirjoituspisteissä, `uusi_ennatys`-lippu pack-openiin (KATALOGI) | ⚠️ | Toteutettu T9:ssä ja EX:ssä. **PK puuttuu (korjauksessa).** TTM ei kirjoita H-H-pikakenttiä lainkaan. `uudet[]` lasketaan, mutta lippua ei tallenneta eikä pack-open-hetkeä ole. Ennätysnimi `mas` = *"Maksiminopeus"* (:2862) on väärin: MAS on aerobinen kestävyys (muualla *"Kestävyys"*) |
| Vaihe 2 legendat (Maestro, Railgun, Shadowstep, Titan, Myöhäänkukkija, Sisukas) | ❌ | Rakennettu vain `legend_tekniikka`, `legend_nopeus` (rikki) ja `idol`. **Sisukas** ("arvostetuin", tuotteen filosofia) puuttuu |
| Harvinaiset Piilohelmi / Varhaiskehittäjä / X-Factor | ⚠️ | Kaksi kolmesta ilman kirjoittajaa (§4) |
| Idoli = **lapsen oma valinta**, ei TalentMasterin attribuoima (VISIO §9, päätös 23.6.) | ❌ ristiriita | Idoli tulee viikkoteemasta (`laskeViikkoTeema`, oletus Maestro) ja näkyy *"Unelma: Kuin X"* (:5403) sekä aina ansaittuna korttina. "Minun tavoitteeni" tallentuu vain localStorageen (`_fcAsetaTavoite`) |
| X-Factor/talenttisignaalit vain valmentajalle/VP:lle (MINÄ-ohje §IA, TASOMALLI §7.22-vartijat) | ❌ ristiriita | Pelaajalla `rare_xfactor`- ja `rare_piilohelmi`-kortit, piirre *"💎 Piilohelmi"* (:5259) ja `_signaaliLabel` *"⚡ X-Factor"* (:6070). Huoltajalla *"★ X-Factor / ◆ Hidden Gem"* (V2:n :1290–1297). Lepotilassa vain siksi, että dataa ei synny. **Demo-fc kirjoittaa `signaali: 'xfactor'`** → huoltajan demo näyttää X-Factor-merkin. MINÄ-ohje on myös itsensä kanssa ristiriidassa: §B listaa X-Factorin pelaajan keräilykortiksi ja §IA kieltää sen |
| Vaihe 3 tähtikokoelma, Vaihe 4 pack-opening ja kausilegendat | ❌ ei aloitettu | Docissa merkitty jäljellä oleviksi, linjassa |
| Huoltajan "Kortti (0–99)" (OPAS_PERHE §1.3, V2-sanasto) | ❌ datakatkos + §7.22 | Kenttää `kortti` ei kirjoita mikään → aina "—". Lisäksi 0–99-kokonaisluku huoltajalle on §16:n "ei tasolukuja vanhemmallekaan" vastainen |
| Huoltajan U16+ kehityskaari ja kuukausikooste | ❌ | Pysyvä tyhjä tila, ei toteutusta |
| Pelaajan Tekniikkaprofiili §5.3: "TKI-laskua EI näytetä lainkaan", parannus vain kun positiivinen (§16, §34) | ❌ ristiriita | TKI-luku näkyy isona, ja negatiivinen trendi *"Kokonaisaikasi on kasvanut X s"* näkyy (:2165) |
| Pikakentät renderöinnissä, ei alikokoelmakyselyjä (§26, §36) | ⚠️ | Tekniikkaprofiili lukee `testitulokset`-alikokoelman (:1516) → näyttää eri tilan kuin pikakentistä renderöivät hero, merkit ja huoltajan tekniikkaprofiili |
| `lib/tm-kortit.js` (idoli 7×5, ~15 saavutusta, OMA kortti) | ⚠️ orpo | Ei ladata mihinkään. Joko arkistoon tai integroidaan katalogiin. Kaksi rinnakkaista korttimallia hämmentää |

---

## 4. Datakatkokset — kortit, jotka eivät voi syttyä

| Kortti / elementti | Lukee | Miksi ei syty | Missä |
|---|---|---|---|
| **Nopeus-legenda** | `hh_viimeisin.lin30m` | Ansainta kutsuu `hhLaskeTaso('lin30m', v, ika, 'M'/'N')`. Pelaajalla funktio on `docs/testit_indeksit.js:390`, jonka normiavaimet ovat `'30m'` ja sukupuoliavaimet `'P'`/`'T'` → `null`. Varmistettu ajamalla: `('lin30m',4.0,13,'M') → null`, `('30m',4.0,13,'P') → 5`. Tytöillä `'N'` putoaisi lisäksi poikien normeihin | P7:n :2821 |
| **Piilohelmi** (◆ ja piirre) | `hidden_gem` | Ei kirjoittajaa missään (VP laskee Hidden Gemin `laskeHiddenGem`illä, mutta ei tallenna pikakenttää) | P7:n :2828, :5259 |
| **X-Factor** (◆) | `x_factor` | Ei kirjoittajaa | P7:n :2832 |
| **Signaalimerkki** (Tänään) + huoltajan X-Factor/Hidden Gem | `signaali` | Ei tuotantokirjoittajaa. Arvot ovat myös keskenään ristiriitaisia: P7 odottaa `x-factor`/`gem`/`phv`, V2 ja demo `xfactor`/`hidden` | P7:n :6067, V2:n :1290 |
| **Elite-taso** | 5 mitattua osa-aluetta | SOS ei koskaan laske (`counts:false` aina) → enintään 4 | P7:n :5195, :5238 |
| **SOS (D5)** | — | Ei datalähdettä eikä kirjoittajaa. Aina 🔒 "seura avaa" | P7:n :5195 |
| **MAS-trendi** (showcase) | `mas_historia` | Ei kirjoittajaa | P7:n :1594 |
| **Huoltajan kortti-, Stage-, treenejä- ja pelinumerokentät** | `kortti`, `stage`, `treeneja_kausi`, `pelinumero` | Ei kirjoittajaa → "—"/0 | V2:n :1265–1279 |
| **Huoltajan U16+ kehityskaari** | — | Ei toteutusta | V2:n :757–765 |
| **Ennätykset Pikakirjauksella** | `ennatykset` | PK ei kirjoita → **korjauksessa (`feat/pelaaja-oma-ennatys`)** | `lib/tm_pikakirjaus.js:276` |
| **Tekniikkaprofiili PK:n tai T9:n TK-tuloksilla** | `testitulokset`, protokolla `tekniikkakilpailu` | Vain EX kirjoittaa tällaisia dokumentteja. PK kirjoittaa `pikakirjaus` ja T9 `testitapahtumat` → "tulossa", vaikka `tki_*` on asetettu | P7:n :1516–1523 |
| **Ehdolliset (syttyvät vain Excel-tuonnilla)** | `hh_vahvuus`, `hh_kehityskohde`, `tki_vahvuus`, `tki_kehityskohde`, `*_edellinen`, `tekninen_varhaiskehitys`, `mas_kmh` | Vain EX (ja recalcHH). PK- ja T9-polulla Vauhti & pallo -tavoiterivi, ⭐-vahvuus, 📈-parannusrivit (osin), ↗-siru ja Varhaiskehittäjä eivät syty | ks. §1.0 |
| **Biologinen ikä** | KR | Lukittu tieteellisesti (`KR_VERIFIOITU=false`), V2 lykätty | P7:n :1505 |

---

## 5. §7.22-tarkistus (pelaaja ja huoltaja)

§7.22 ja §16: ei XP:tä, progressbaria eikä loss aversion -kieltä, ei tasolukuja, ei vertailua muihin, ei TKI-laskua pelaajalle eikä vanhemmalle.
Huom: `docs/CODE_OHJE_KEHITYSKORTTI_KAANTO_JA_TASOMALLI.md` Osa B (7/2026) **salli tarkoituksella** rakentajalle (U13–15) osa-aluekohtaisen "taso X/5 · seuraavaan"
-tiedon itseen vertaavana. Se on **suoraan ristiriidassa** §16:n ("ei tasolukuja T1–T5"), `CODE_BRIEF_P722_TASO_XP_PELAAJA.md`:n ("ei tasolukuja (… raaka hh_taso 1–5)")
ja CLAUDE.md:n tiiviin säännön kanssa. Ristiriita pitää ratkaista päätöksellä (§7, kohta 3).

### 5.1 Selvät rikkeet

| # | Kuka näkee | Mitä | Missä |
|---|---|---|---|
| R1 | **Pelaaja, kaikki ikävaiheet (myös U12)** | Iso kultainen luku `round(flei×0,9+10)` + *"Kehittyy kohti huippua"*. OVR-tyylinen tasoluku ilman ikäportitusta. Ilman FLEI:tä se näyttää "10" | P7:n :1155–1167 (:1158) |
| R2 | **Pelaaja** | TKI-luku 40 px *"TKI"* -otsikolla | P7:n :2125–2126 |
| R3 | **Pelaaja** | Negatiivinen delta *"Kokonaisaikasi on kasvanut X s — jatketaan harjoittelua"* (ambra) | P7:n :2163–2166 |
| R4 | **Huoltaja** | TKI-luku 40 px *"TKI"* -otsikolla | V2:n :1188–1189 |
| R5 | **Huoltaja** | "Kortti 0–99" -kokonaisluku ja selite *"Kortti 0–99 kuvaa pelaajan kokonaiskehitystä…"* (luku on nyt aina "—", koska data puuttuu) | V2:n :1268, :1306 (`lib/tm_lang.js:623`), `docs/OPAS_PERHE.md:49` |
| R6 | **Pelaaja, showcase** | MAS-trendi *"↓ −0.xx m/s — lasku, tarkista kuormitus"* ja *"Ei muutosta — tarkista harjoitteluärsyke"*. Negatiivinen delta ja valmentajan kieli lapselle (lepotilassa, koska `mas_historia` puuttuu) | P7:n :1594–1603 |

### 5.2 Tasoluvut (Osa B -kompromissi vs. §16 — vaatii päätöksen)

| # | Kuka | Mitä | Missä |
|---|---|---|---|
| T1 | Pelaaja, rakentaja | Hero-statit "3/5" per osa-alue | P7:n :2910 |
| T2 | Pelaaja, rakentaja ja leikkijä | Flip-kortin etupuoli "X/5", takapuoli *"Nyt taso X/5 · seuraavaan: taso X+1/5"*, ÄLY/FYS/PSY *"taso X/5"* | P7:n :5297, :5320, :5347, :5358, :5364–5365 |
| T3 | Pelaaja, showcase | OVR-luku, 5D-arvot 0–99 ja arvopalkit (sallittu Osa B:ssä U16+:lle) | P7:n :2921–2923, :5306–5309, :5369 |

### 5.3 Vertailu ja normatiivinen kieli (rajatapaukset)

| # | Kuka | Mitä | Missä |
|---|---|---|---|
| V1 | Pelaaja ja huoltaja | Lajipalkit, joissa täyttö = `100 × erinomainen / arvo` eli suhde eliittiviitteeseen. Käytännössä edistymispalkki normia vasten | P7:n :2146–2157, V2:n :1224–1235 |
| V2 | Pelaaja | Tier-nimet Starter → Sharp → **Elite** ja *"🏆 Kohti Sharp/Elite"*, matka *"Seuraava: Elite"*. Hierarkkinen leima (rakentajalle näkyy, Elite saavuttamaton) | P7:n :2955, :5239–5240, :5411 |
| V3 | Pelaaja | *"Huippuvauhtia!"*, *"Olet tässä kärkitasoa"*: normin ylin taso, ei luku. Hyväksyttävä Osa B:n mukaan, mutta kyse on normatiivisesta vertailusta ikäryhmään | P7:n :1813, :1676 |
| V4 | Pelaaja ja huoltaja | X-Factor-, Piilohelmi- ja Hidden Gem -signaalit lapselle ja huoltajalle (ohjeiden mukaan vain valmentajalle). **Lepotilassa** datan puuttuessa, demossa näkyvissä | P7:n :2827–2832, :5259, :6070–6071; V2:n :1290–1297 |

### 5.4 XP, progressbar ja loss aversion

- **XP:** ei renderöidä missään. P7 tallentaa XP:n vain Firestoreen (:4677). `rTDone`- ja `rPin`-renderöinnit on siivottu (P722-brief). ✅
- **Progressbar:** XP-palkkia ei ole. Kehityskaarirengas *"N / M mitattu"* (P7:n :2928, :5376) ja kokoelmalaskuri *"ansaitut / kaikki"* (:3059) ovat keräilyn tai mittausten edistymää. Niissä ei ole tasoa eikä menetettävää, joten ne ovat hyväksyttäviä. Lajipalkit: ks. V1.
- **Loss aversion:** liekki on kehystetty positiivisesti (:2835–2841), ja "Lepopäivä kuuluu kasvuun" on kunnossa. Sanoja "menetät", "putoat" tai "sulkeutuu" ei löytynyt pelaaja- eikä huoltajapinnasta. ✅ Poikkeus: R3 ja R6 (negatiiviset deltat).
- **Vanha IDP-kortin "Valmius 74" / "top 30 %" huoltajalle:** **ei löydy** elävistä appeista (V2 ei näytä FLEI-lukua eikä persentiilejä; P7:n `rKortti` muutti valmiuden sanaksi ja on lisäksi kuollutta koodia). Lähin vastaava on R1: Tänään-kultakortin FLEI-pohjainen luku pelaajalle.

---

## 6. "Tulossa"-tekstit ja niiden suunnitelmat

| Teksti | Missä | Ehto | Suunnitelma / aikataulu |
|---|---|---|---|
| *"Biologinen ikä — Tulossa myöhemmin"* | P7:n :1505 | aina, kun `phv_tila` on olemassa | KR lukittu (`tm_bioika.js:78`), bio-banding V2 lykätty 1.7.2026, kunnes Palloliiton KR-data on luotettavaa. **Ei aikataulua** |
| *"Kausitavoite tulossa"* | P7:n :2485 | ei `idp_*` | Valmentaja tai VP asettaa (IDP 3a/3b). Riippuu seurasta |
| *"⚽ Mittaukset tulossa — silloin näet tuloksesi täällä!"* (Tekniikkaprofiili) | P7:n :2114 | ei tekniikkakilpailudokumenttia | Seuran tekniikkakilpailu. Ei näy PK:n tai T9:n TK-tuloksilla (§4) |
| *"⚽ Nopeustestit tulossa"* | P7:n :1819 | `hh_viimeisin` olemassa, mutta kaikki arvot tyhjiä | Käytännössä harvinainen |
| ⏳ *"tulossa"* / *"Tulossa — valmentaja mittaa"* (FYS/TEK/ÄLY) | P7:n :2907, :5175–5193, :5304 | osa-aluetta ei ole mitattu | Seuran testaus. ÄLY vaatii ≥3 ADAR-havaintoa |
| 🔒 *"seura avaa"* / *"Seura avaa myöhemmin — ei sinusta kiinni"* (PSY/SOS) | P7:n :2906, :5187, :5195, :5303 | PSY: ei `d3_viimeisin` · SOS: aina | PSY avautuu jo pelaajan omalla itsearviolla (teksti on harhaanjohtava). **SOS: ei suunnitelmaa eikä datalähdettä** |
| *"Tulossa pian — ilmoitukset, jaa linkki vanhemmalle."* | P7:n :2205 | aina (Asetukset) | Ilmoitukset on osin toteutettu (c.4a). Linkin jakaminen on huoltajan puolella. Teksti on vanhentunut |
| *"Harjoitevideo tulossa"* | P7:n :3214 | aina harjoitusnäkymässä | Videopankki on admin-puolella (`tm_videopankki_admin.html`). Pelaajakytkentää ei ole suunniteltu |
| *"Sisältö tulossa — Joukkue, valmentajat, kalenteri — Vaihe B3."* | P7:n :3851 (i18n-avain `me_sisalto_tulossa` `lib/tm_lang.js:441` on käyttämättä) | aina MEISTÄ-välilehdellä | Kalenteri on jo TÄNÄÄN-välilehdellä. "Vaihe B3":lle ei löydy suunnitelmaa (ROADMAPin B3 on eri asia: tenant self-service) |
| *"⚽ Mittaukset tulossa — täältä näet sitten {nimen} vahvuudet…"* | V2:n :1177 (`lib/tm_lang.js:613`) | ei `tk_lajit`/`tki` | Seuran tekniikkatestaus |
| *"Kehityskaari ja kuukausikooste näkyvät kun seuran data on kirjattu."* | V2:n :763 (`lib/tm_lang.js:554`) | aina U16+ | **Ei toteutusta eikä suunnitelmaa** — lupaa jotain, mitä ei ole |
| *"Ei ennätyksiä vielä — tee testi…"* (ei "tulossa", mutta samaa luokkaa) | P7:n :2876 | ei `ennatykset` | PK-korjaus **korjauksessa** (`feat/pelaaja-oma-ennatys`) |

(Pelaaja- ja huoltajapinnan RSVP *"✓ Tulossa"* (P7:n :2420, V2:n :603) tarkoittaa osallistumista, ei puuttuvaa sisältöä.)

---

## 7. Suositus: 3–5 tärkeintä korjausta ennen seurakoulutuksia (tärkeysjärjestyksessä)

1. **Ennätykset kaikista kirjoituspisteistä**: viedään loppuun rinnakkainen PR `feat/pelaaja-oma-ennatys` (Pikakirjaus → `ennatykset`). Samalla:
   - korjataan `_kkEnnatysTiedot`-nimi `mas` = "Kestävyys" (ei "Maksiminopeus")
   - lisätään puuttuva `ach_omaennatys`-saavutus katalogiin.

   Koulutuksissa juuri Pikakirjaus on se, jota valmentajat käyttävät. Lapsi, joka juoksi 30 m, ei saa nähdä tekstiä "tee testi".
2. **§7.22-pikakorjaukset elävistä pinnoista (R1–R4):**
   - poistetaan Tänään-kultakortin FLEI-luku (:1155–1167) tai ikäportitetaan se showcaseen ja oikeaan OVR:ään
   - poistetaan TKI-luku pelaajalta (:2125) ja huoltajalta (V2:n :1188)
   - poistetaan negatiivinen trendirivi (:2165).

   Nämä ovat jo päätettyjä sääntöjä (§16 / §34 / P722), eivät uusia linjauksia, ja ne näkyvät heti jokaiselle koulutuksen esittelylaitteelle.
3. **Nopeus-legendan avainvirhe**: `hhLaskeTaso('30m', v, ika, 'P'/'T')` tai `hhSeuraavaTaso('lin30m', …)` samoin kuin "Huippuvauhtia" (P7:n :2821). Lisäksi regressiotesti, jossa sama 30 m -arvo sytyttää sekä "Huippuvauhtia"-tekstin että legendan. Pieni muutos, joka poistaa ristiriidan, jonka jokainen nopea lapsi huomaa.
4. **Rehelliset tyhjät tilat — pois kortit, jotka eivät voi syttyä:**
   - piilotetaan tai poistetaan lukitut `rare_piilohelmi` ja `rare_xfactor` (ne ovat myös vain valmentajalle tarkoitettuja signaaleja)
   - korjataan Elite-portti (SOS pois nimittäjästä samoin kuin renkaassa) tai piilotetaan "Kohti Elite"
   - poistetaan pysyvä "uusi 🔥" (idoli pois ansaituista tai lipuksi oikealle uudelle kortille)
   - huoltajan kausikortista pois "—"/0/"Stage"-kentät, joilla ei ole kirjoittajaa, kovakoodattu "2025/26" ja toimimaton jaa-nappi
   - U16+ kehityskaari-placeholder pois.

   Koulutuksissa perheille ei saa luvata sellaista, mitä data ei koskaan tuota.
5. **Päätös tasoluvuista rakentajalle (Tero/PM):** Osa B ("taso X/5" U13–15) vai §16/P722 ("ei tasolukuja"). Päätöksen jälkeen:
   - yhtenäistetään CLAUDE.md, taito `tm-sovellukset` ja koodi (hero :2910, flip :5297–5365)
   - poistetaan samalla huoltajan "Kortti 0–99" -sanasto (V2 ja `OPAS_PERHE.md`) tai vaihdetaan se laadulliseksi.

   Ilman päätöstä koulutusmateriaali ja sovellus puhuvat ristiin.

(Seuraavaksi, ei ennen koulutuksia: Tekniikkaprofiili pikakentistä alikokoelman sijaan, jotta PK:n ja T9:n TK-tulokset näkyvät · `lib/tm-kortit.js` arkistoon · idoli lapsen omaksi valinnaksi VISIO §9:n mukaan · Sisukas-legenda.)
