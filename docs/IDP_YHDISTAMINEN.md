# IDP-korttien yhdistäminen: selvitys ja suunnitelma

> 3.10.2026 · vain selvitys, ei koodimuutoksia · kohde: yksi IDP (`idp_kausi` + `lib/tm_idp.js`)
> Vanha kortti: `TalentMaster_IDP_Kortti_v4.html` (1926 riviä). Uusi IDP: `seurat/{sid}/pelaajat/{pid}/idp_kausi/{vuosi}` + `lib/tm_idp.js`.

## Tiivistelmä

- **Vanha kortti ei ole koskaan auennut.** Vika ei johdu SDK-erästä 1 (#735), vaan kortin omasta bugista, joka on ollut mukana ensimmäisestä versiosta (1.5.2026) asti (§0).
- **Vanhaa korttia ei käytä kukaan.** Siihen linkittää kaksi nappia (Seura ja UTJ). Mikään Cloud Function tai sähköpostipohja ei lähetä siihen linkkejä, eikä token-linkkejä ole koskaan luotu (§2).
- **Ennen poistoa uuteen IDP:hen ei tarvitse siirtää mitään** (§3.2). Kuntoutusprotokollat ovat terveystietoa, joten ne kuuluvat omaan päätökseensä eivätkä IDP:hen.
- **Suositus:** Seuran nappi ohjataan VP_v25:n pelaajanäkymän Kehitys-välilehdelle. Sitä varten VP_v25:een lisätään URL-sisääntulo `?seura=&pelaaja=&nakyma=kehitys`. UTJ:n nappi poistetaan, koska UTJ:llä on jo "VP-näkymä"-nappi. Valmentaja käyttää edelleen Masterin IDP-korttia (§3).
- **Työmäärä:** 2 PR:ää: (1) ohjaus ja (2) poisto (§5).

---

## 0. Vikaselvitys: "kehityskortti ei aukea"

**Oire:** Seura → Pelaajat → Topias → "📋 Avaa kehityskortti (IDP)" avaa uuden välilehden, mutta kortti ei aukea.

**Syy:** kortin renderöinti kaatuu aina. Funktio `renderHeroFlei` (r. 1311) asettaa tekstin elementtiin `$('heroFleiL')` (r. 1322 ja r. 1325), mutta HTML:ssä ei ole elementtiä, jonka id on `heroFleiL`. Rivillä 344 on vain `<div class="hero-flei-l">` ilman id:tä. Tästä seuraa `TypeError: Cannot set properties of null` rivillä 1325 jokaisella render-polulla:
- Kun kirjautunut käyttäjä lukee pelaajan, `lataa()` kutsuu `render()`:iä, joka kaatuu. Virhe otetaan kiinni rivillä 1194, ja sen jälkeen kutsutaan `renderDemo()`, joka kutsuu `render()`:iä uudelleen ja kaatuu samaan kohtaan.
- Ruudulle jää teksti "Ladataan kehityskorttia..." pysyvästi.

`git log -S` osoittaa, että `heroFleiL`-viittaukset ovat olleet mukana ensimmäisestä commitista `878baa6` (1.5.2026) asti, eikä `id="heroFleiL"` ole ollut missään versiossa. **Kortti ei siis ole auennut kenellekään.**

**#735 ei aiheuttanut vikaa.** Ajoin saman URLin (`?seuraId=kpv&pelaajaId=m93GBdOaGCUuenMiCL0I`) headless-Chromessa (DevTools-protokolla, paikallinen palvelin) mainin versiolla (SDK 10.7.1) ja #735:tä edeltävällä versiolla (`8874b0a^`, SDK 9.22.0):

| Polku | 10.7.1 (main) | 9.22.0 (ennen #735) |
|---|---|---|
| Kirjautumaton, ei parametreja | "Pääsy estetty: Kirjaudu sisään…" | sama |
| Render-polku (`&rooli=vanhempi` → lataa → permission-denied → renderDemo → render) | `TypeError … (setting 'textContent')` r. 1325, jää "Ladataan kehityskorttia..." | **sama poikkeus samalla rivillä** |

Kirjautunut polku päätyy samaan `render()`-kutsuun, joten tulos on sama SDK-versiosta riippumatta.

**Muut tarkistetut syyt:**
- **Popup-esto ei estä.** `window.open` kutsutaan suoraan napin `onclick`-käsittelijässä modaalin sulkemisen kanssa samassa käyttäjäeleessä (Seura.html r. 4830–4832), joten selain sallii sen.
- **Auth-istunto välilehtien välillä:** kortti luottaa saman originin istuntoon (`onAuthStateChanged`, ei omaa kirjautumista). Seura käyttää persistenssiä `LOCAL` ja SDK:ta 9.22.0, kortti nyt SDK:ta 10.7.1. Versioiden välistä istunnon siirtoa en saanut todennettua emulaattorilla, koska projektissa ei ole Auth-emulaattorin konfiguraatiota. Tällä ei ole merkitystä, koska kortti kaatuu joka tapauksessa. Jos istuntoa ei olisi, oire olisi eri: teksti "Pääsy estetty".
- **Kirjastojen lataus toimii.** `lib/hpp_rehab_protokollat.js`, `lib/tm_ketju_matriisi.js` ja `lib/tm_appcheck.js` palauttavat 200.
- **App Check:** headless-ajossa reCAPTCHA-vaihto palauttaa 403. Tämä on headless-ympäristön ominaisuus, ja App Check on monitoring-tilassa (§38), joten se ei estä Firestore-lukua. Sama tulos tuli molemmilla SDK-versioilla.
- **CSP:** talentmasterid.com palauttaa CSP:n, joka sallii `www.gstatic.com`:n, eikä konsolissa ollut CSP-virheitä. Pages ei palauta CSP:tä.

**Muut viat, jotka estäisivät kortin käytön, vaikka kaatuminen korjattaisiin:**
1. **Testitulokset eivät latautuisi.** Kysely `testitapahtumat.where('pelaajat','array-contains',pid).orderBy('pvm','desc')` vaatii komposiitti-indeksin, jota ei ole tiedostossa `firestore.indexes.json`. Virhe otetaan kiinni, joten testihistoria ja uusin tulos jäävät aina tyhjiksi.
2. **Huoltaja ja pelaaja eivät saisi dataa.** Vanhempi- ja pelaajanäkymä (`?rooli=`, `?token=`) toimivat vain kirjautumatta, ja anonyymi pääsy suljettiin säännöissä v3.28 (anonymous-provider suljettiin Consolesta 2.10.2026). `?token=` ei validoi mitään, se vain asettaa roolin `vanhempi`.
3. **Roolit menevät väärin.** Kirjautunut käyttäjä ilman rooli-claimia saa roolin `vp` ja staff-näkymän (r. 1120). Talenttivalmentaja, UTJ, seurasihteeri ja fysioterapeutti putoavat vanhempinäkymään (r. 1283).
4. **§7.22 rikkoutuu.** Vanhempi ja pelaaja näkisivät Tilanne-paneelin: TalentID-luvun, PHV:n ("loukkaantumisriski 2×") ja punaisen "Kehitys ↓" -merkinnän.
5. **Kenttiä ei kirjoiteta enää mihinkään.** Kortti lukee kenttiä `d1..d5` (0–100), `flei`, `flei_ketjut`, `dvi`/`dvilvl`, `syntymakk` ja `suostumus.annettu`, joten se näyttäisi nollia oikeallakin datalla.
6. **PHV on laskettu väärin.** Kaava on `ikä − 14,0`, ei Mirwald. Merkintä "AN — ennen pyrähdystä" on väärin, koska kanonisesti AN tarkoittaa jälki-PHV:tä.
7. **Havainnon kirjoitus jää näkymättömäksi.** Kirjoituksesta puuttuvat `nakyvyys`, `tila` ja `valmentajaUid`, ja siihen tallennetaan valmentajan sähköposti (PII).
8. **UTJ:n nappi ei välitä parametreja.** Kortti avautuu oletuksella `kpv/demo`.

**Johtopäätös:** vika on vanha. Korjausta ei kannata tehdä, koska kortti poistetaan (§4). #735:tä ei tarvitse revertoida.

---

## 1. Ominaisuusvertailu

### 1.1 Mitä vanhassa kortissa on (selkokielellä)

Kuvat on otettu paikallisesta kopiosta, johon puuttuva elementti lisättiin. Data on kortin omaa kovakoodattua demodataa ("Demo Pelaaja, KPV U14"), ei oikean pelaajan tietoja. Kuvat: `docs/kuvat/idp_vanha/`.

Kortti on mobiilimittainen yhden pelaajan sivu. Yläpalkissa on rooli (VP/Valmentaja/Vanhempi), ja yläosassa nimi, joukkue, ikä, pelipaikka ja iso "Valmius™"-luku (kehon valmius). Sivulla on neljä välilehteä:

| Välilehti | Mitä näkyy | Kuva |
|---|---|---|
| **Tilanne** | 5D-profiili hämähäkkikaaviona ja luvut D1–D4 · TalentID™-luku ("Long-term potential") · GDPR-suostumushuomautus · PHV-kortti (kronologinen ja biologinen ikä) · DVI-kehitysvauhti · Hidden Gem / RAE -merkit · hälytykset | `idp_vanha_tilanne.png` |
| **Ketjut** | Viisi liikehallintaketjua (SBL/SFL/LL/DIAG/DFL) haitarina: taso ja selitys | `idp_vanha_ketjut.png` |
| **Kehitys** | Valmentajan havaintolomake (tekninen/fyysinen/taktinen/henkinen) · 10 viimeisintä havaintoa · uusin testitulos ja testihistoria · 70/30-jako · "Minun kauteni" -tavoitelause, jota pelaaja ja valmentaja voivat muokata | `idp_vanha_kehitys.png` |
| **Harjoite** | Pelipaikkavalinta ja pelipaikkaharjoite · alkurutiini heikoimman ketjun mukaan ("Ohjeet & video") · T-harjoitteet (pallotekniikka, ikäryhmittäin kovakoodattu) · **"Aktivoi klinikkaprotokolla"**: kuntoutusprotokollat oireen mukaan (akuutti / subakuutti / paluu, kielletyt liikkeet, paluukriteerit). Protokolla aktivoituu automaattisesti, jos valmius < 40 | `idp_vanha_harjoite.png` |
| **Vanhempi-näkymä** | Valmiusteksti, kehitystrendi ↑/↓, läsnäolo-% ja viimeisin havainto | `idp_vanha_vanhempi.png` |

Tärkeää: kortissa ei ole IDP-tavoitteita. Siinä ei ole kausitavoitetta, välitavoitteita, mittaria, arvioita eikä sitoumusta. Se ei lue `idp_kausi`a eikä käytä `lib/tm_idp.js`:ää. Nimestään huolimatta se on pelaajaprofiili ja harjoiteopas, ei kehityssuunnitelma.

### 1.2 Mitä uudessa IDP:ssä on

**Data:** `idp_kausi/{vuosi}`:
- `tavoitteet[]`: fokus, mittari, lähtö, tavoitearvo, aikaraami, perustelu, 70/30-ankkuri ja pelaajan oma tavoite. Status voi olla ehdotettu / aktiivinen / jatkuu / saavutettu / hylätty / vaihdettu, tyyppi heikkous / vahvuus / pelipaikka.
- `arviot[]` ja `valitavoitteet[]`.
- `pelaaja_sitoumus`: pelaaja kirjoittaa, valmentaja tai VP vahvistaa.
- Pelaajadokkiin kirjoitetaan pikakentät `idp_tila`, `idp_fokus`, `idp_edistyma`, `idp_viim_review`, `idp_dvi` ja `idp_sitoumus_*`.

**Säännöt:**
- **Luku:** johto, valmentajaroolit ja pelaaja itse.
- **Kirjoitus:** valmentajaroolit, johto ja SA. Pelaaja saa kirjoittaa vain `pelaaja_sitoumus`-kentän.
- **Huoltaja:** ei lukuoikeutta.

| Sovellus | IDP-näkymä | Roolit |
|---|---|---|
| **VP_v25** | Pelaajanäkymä (`_jspModal`), Kehitys-välilehti: kauden tavoite, "Nyt harjoitellaan" (jaksofokus) ja aiemmat jaksot sekä sitoumuksen vahvistus. Aloitus-välilehdellä on IDP-narratiivi. Pelaajaraportti (MDT) tulostettavana | vp, UTJ, seurasihteeri; valmentaja ja talenttivalmentaja omaan joukkueeseensa |
| **Master_v16** | IDP-kortti `#_mIdpCard` pelaajan kehitysnäkymässä: ehdotus, fokus, välitavoitteet, review ja elinkaari | valmentaja omaan joukkueeseen; talenttivalmentaja, vp ja UTJ kaikkiin pelaajiin |
| **Pelaaja_v7** | "Sinun matka": tavoite lapsen kielellä ilman lukuja, ja oma sitoumus | pelaaja |
| **Seura** | Ei IDP-näkymää. Kehitystilanne lukee `idp_kausi`a vain KPI-lukuihin | – |
| **Vanhempi_v2, UTJ_v1** | Ei IDP:tä | – |

**URL-sisääntuloa ei ole.** VP_v25 lukee URL:sta vain `?seura=`, ja Master ei lue URL-parametreja ollenkaan. VP:ssä on kuitenkin valmis funktio `window._pdcSiirryCockpittiin(pid, tab)`, joka avaa pelaajanäkymän halutulle välilehdelle (oletus 3 = Kehitys).

### 1.3 Vertailu: vanha ja uusi

| Ominaisuus | Vanha kortti | Uusi IDP / muu uusi näkymä | Puuttuuko uudesta? |
|---|---|---|---|
| Kausitavoite, välitavoitteet, arviot, sitoumus | ei ole | VP + Master + Pelaaja | – |
| 5D-profiili | spider, legacy-kentät 0–100 (näyttää nollaa) | VP-pelaajanäkymä (5D-radar, D1/D2-tasot) | ei puutu |
| Kehon valmius / ketjut | Ketjut-välilehti (inline `KETJU_DATA`, näyttää nollaa) | VP:n Mittaus-välilehti: kehon valmius (`renderFleiKortti`) | ei puutu IDP:n kannalta |
| Liikeketjumatriisi `lib/tm_ketju_matriisi.js` | ladataan, mutta **ei käytetä** | – | ei siirrettävää |
| Kuntoutusprotokollat `lib/hpp_rehab_protokollat.js` | klinikkaprotokolla Harjoite-välilehdellä | ei ole | **puuttuu**, mutta ei kuulu IDP:hen (terveystietoa, GDPR art. 9), ks. §3.2 |
| Havainnot | lomake ja 10 viimeistä (ei aikajanaa) | VP:n havaintohistoria, Masterin havaintohistoria, ADAR Pikakortti | ei puutu |
| Testitulokset | uusin ja historia (indeksi puuttuu → aina tyhjä) | VP:n kehityskaari (`hh/tki/flei_historia`) | ei puutu |
| PHV | väärä kaava (ikä − 14) | `tmKypsyys`-siru ja täysi näkymä VP:ssä; IDP:n kypsyysportti (§28) | ei puutu |
| Pelaajan oma tavoitelause | `omaTavoitelause` (vain tämä kortti) | `tavoitteet[].pelaajan_tavoite` + sitoumus | ei puutu |
| Pelipaikka-, alku- ja T-harjoitteet | kovakoodattu kortissa | Pelaaja_v7 + `harjoitelogiikka_v4.js` (Tänään-tehtävät) | ei puutu IDP:n kannalta |
| Vanhempi-näkymä | `?rooli=vanhempi` / `?token=` (ei toimi v3.28:n jälkeen, rikkoo §7.22) | ei IDP:tä vanhemmalle (säännöt eivät salli luettaessa `idp_kausi`a) | **puuttuu**, oma päätös, ks. §3.3 |
| `?rooli=` / `?token=` -linkit | ei validointia, ei token-kokoelmaa, kukaan ei generoi | – | ei siirrettävää |
| Tulostettava kortti | ei | MDT-raportti (`_mdtPrint`) | ei puutu |

---

## 2. Kuka vanhaa korttia käyttää tänään

**Sovellukset (elävä koodi):**
- `TalentMaster_Seura.html:4832`: pelaajamodaalin nappi "📋 Avaa kehityskortti (IDP)", parametrit `?seuraId=&pelaajaId=`. Kortti kaatuu (§0).
- `TalentMaster_UTJ_v1.html:266`: sivupalkin "IDP-kortti ↗" ilman parametreja. Avaa `kpv/demo`, ja muiden kuin KPV:n henkilöstö saa tekstin "Ei oikeutta".

**Cloud Functions ja sähköpostipohjat: ei viittauksia.** `functions/` rakentaa linkkejä vain seuraaviin:
- Rekisteröinti_Suostumus
- Pelaaja_v7
- Vanhempi_v2
- Seura
- Solo_Lupa
- Master/Seura-ohjaus

`?token=`-linkkejä korttiin ei ole koskaan lähetetty. Token-kokoelmaa ei ole, eikä säännöissä ole sellaista. **Poiston jälkeen mikään lähetetty linkki ei rikkoudu.** Mahdollinen kirjanmerkki palauttaa Hostingissa 404, mikä on sama lopputulos kuin nyt, sillä kortti ei aukea nytkään.

**Service workerit, manifestit, firebase.json ja workflow't: ei viittauksia.** Kortti tarjoillaan Hostingissa, koska se ei ole ignore-listalla.

**Testit:**
- `tests/idp_kortti_libit.test.js`: koko tiedosto koskee korttia.
- `tests/firebase_sdk_versio.test.js:52,54,92,98`: sivumäärät ja erä 1 -teksti.
- `tests/appcheck_kytkenta.test.js:46–49`: sivumäärät.

**Muut viittaukset:**
- `CLAUDE.md:173` (avaintiedostotaulukko).
- `tm_admin/firestore.rules:1450`: vain kommentti ("IDP_Kortti_v4 lukee tätä"). Itse sääntö on yleinen.
- Arkisto: `archive/TalentMaster_VP_v19.html` (linkki v4:ään) ja `archive/TalentMaster_IDP_Kortti_v3.html`.
- `src/lib/constants.js`: vanhentunut v3-migraatiotaulukko.

**Dokumentit:**
- ARKKITEHTUURI:201 (v3) ja :225–227 (kirjastot)
- ROADMAP:80, 89–91
- USER_FLOWS:113, 188
- IDP_YDIN_SPEC:3
- CODE_BRIEF_IDP_MODAALI_UUDELLEENSUUNNITTELU:3
- IDP_KORTTI_MAAILMANLUOKKA:3
- VISIO_PELAAJAKEHITYKSEN_SELKARANKA:59
- CODE_TASK_PELAAJAT_LISTA_V1:18
- FIREBASE_SDK_YHTENAISTYS:38, 137
- SKAALAUTUVUUS_JA_TEKNINEN_VELKA:106
- demo_setup_ohjeet:182 (v3-demolinkki)
- CODE_BRIEF_IDP_KORTTI_AUKOT, CODE_TASK_VAIHE7_FYSIIKKAJAKSO ja A7_HARJOITEPANKKI_ANALYYSI: kirjastot tulevina suunnitelmina

**Kirjastot `lib/hpp_rehab_protokollat.js` ja `lib/tm_ketju_matriisi.js`:** niitä ei lataa mikään muu elävä tiedosto. Vaihe 7:n (fysiikkajakso) suunnitelmat viittaavat niihin, joten ne jätetään `lib/`:iin.

---

## 3. Ehdotus

### 3.1 Mihin napit ohjataan

**Suositus:**

| Nappi | Kuka painaa | Uusi kohde |
|---|---|---|
| Seura → pelaajamodaali → "Avaa kehityssuunnitelma (IDP)" | VP, UTJ, seurasihteeri (Seuran käyttäjät) | **VP_v25:n pelaajanäkymä, Kehitys-välilehti:** `TalentMaster_VP_v25.html?seura={sid}&pelaaja={pid}&nakyma=kehitys` |
| UTJ_v1 → "IDP-kortti ↗" | UTJ | **Poistetaan.** UTJ:llä on jo "VP-näkymä"-nappi, ja IDP on pelaajakohtainen, joten parametriton nappi ei voi osoittaa mihinkään järkevään |
| (ei muutosta) | valmentaja, talenttivalmentaja | Masterin IDP-kortti pelaajan kehitysnäkymässä, kuten nyt |

**Perustelut:**
- **Rooli ratkaisee kohteen.** Seuran käyttäjät ovat johtoa, ja heidän IDP-työkalunsa on VP_v25: se tuntee roolit (`_vpVoiMuokata`) ja näyttää myös sitoumuksen vahvistuksen ja Pelaajaraportin. Valmentajat eivät käytä Seuraa, joten Masteriin ei tarvita uutta reittiä.
- **IDP:tä on yksi.** Data on yhdessä paikassa (`idp_kausi`) ja logiikka yhdessä kirjastossa (`lib/tm_idp.js`). Kaksi käyttöliittymää (VP ja Master) on rooleittain, ja molemmat käyttävät samaa kirjastoa. Vanhan kortin poisto jättää yhden IDP:n.
- **Seura-muutos on yksi rivi:** `window.open`-URLin vaihto (r. 4832), ja napin teksti samalla rivillä tai seuraavalla.
- **VP_v25:een tarvitaan pieni lisäys:** URL-sisääntulo. Kun seura ja pelaajat on ladattu, ja jos `?pelaaja=` on annettu, kutsutaan `_pdcSiirryCockpittiin(pid, nakyma === 'kehitys' ? 3 : 0)`. Vuorovaikutteista uutta ei tarvita, koska funktio on jo olemassa.

### 3.2 Mitä siirretään ennen poistoa

**Ei mitään.** Mikään vanhan kortin ominaisuus ei ole toiminut (§0), ja jokaiselle IDP:hen kuuluvalle on jo uusi vastine (§1.3). Kaksi asiaa jää tietoisesti pois IDP:stä:

1. **Kuntoutusprotokollat** (`lib/hpp_rehab_protokollat.js`): oireen mukainen kuntoutus on terveystietoa (GDPR art. 9, oma suostumus, §11 `terveys/`). Sitä ei liitetä IDP:hen, jonka johto ja valmentajat lukevat. Kirjasto jää `lib/`:iin Vaihe 7:n (fysiikkajakso) ja mahdollisen fysioterapeuttinäkymän käyttöön. **Päätös tarvitaan erikseen:** halutaanko kuntoutusnäkymä ja kenelle (fysioterapeutti?).
2. **Liikeketjumatriisi** (`lib/tm_ketju_matriisi.js`): kortti ei käyttänyt sitä. Kirjasto jää `lib/`:iin. Kehon valmius näkyy jo VP:n Mittaus-välilehdellä.

### 3.3 Avoin aukko, ei poiston este: IDP vanhemmalle

Uudessa IDP:ssä ei ole huoltajanäkymää, ja säännöt eivät anna huoltajalle lukuoikeutta `idp_kausi`in. Vanhan kortin vanhempinäkymä ei toiminut eikä noudattanut §7.22:ta. Jos huoltaja halutaan mukaan, oikea paikka on Vanhempi_v2: sama "Sinun matka" -kehys kuin Pelaaja_v7:ssä ja "miten tukea" -vinkit (§16 perheviestintä). Lisäksi tarvitaan sääntömuutos (`onLapsenHuoltaja` → `idp_kausi` read). Tämä on oma tehtävänsä.

---

## 4. Poistosuunnitelma

1. **Siirto:** `git mv TalentMaster_IDP_Kortti_v4.html archive/`. Hosting ignoroi `archive/**`, joten sivu lakkaa tarjoiltumasta. Pages tarjoilee sen yhä polusta `/archive/…`, mutta mikään ei linkitä sinne.
2. **Testit:**
   - `tests/idp_kortti_libit.test.js`: poistetaan. Vaihtoehtoisesti kirjastojen globaalitarkistus siirretään kirjastotestiksi, jos kirjastot halutaan pitää vartioituina. Suositus: siirto, koska `lib/` jää.
   - `tests/firebase_sdk_versio.test.js`:
     - `COMPAT.length` 21 → 20
     - `KAIKKI.length` 23 → 22
     - listan ulkopuoliset compat-sivut (r. 98) 12 → 11
     - erä 1 -otsikko (r. 92): IDP_Kortti_v4 → "arkistoitu"
   - `tests/appcheck_kytkenta.test.js`: compat 21 → 20 ja scope 23 → 22.
3. **Koodi:** UTJ_v1 r. 266 -nappi poistetaan. Seuran nappi on ohjattu jo PR 1:ssä.
4. **Rules:** kommentti r. 1450 ("IDP_Kortti_v4 lukee tätä") päivitetään seuraavassa sääntömuutoksessa. Pelkkä kommentti ei ansaitse versionnostoa.
5. **CLAUDE.md:** §8-taulukon rivi päivitetään muotoon "arkistoitu 2026-10, korvattu VP_v25:n pelaajanäkymällä ja Masterin IDP-kortilla (`idp_kausi` + `lib/tm_idp.js`)".
6. **Dokumentit:**
   - IDP_YDIN_SPEC, CODE_BRIEF_IDP_MODAALI_UUDELLEENSUUNNITTELU ja IDP_KORTTI_MAAILMANLUOKKA: merkintä "kohde arkistoitu → toteutus VP_v25/Master (`lib/tm_idp.js`)".
   - ARKKITEHTUURI (§ taulukko + kirjastot), ROADMAP, USER_FLOWS, CODE_TASK_PELAAJAT_LISTA_V1 ("Ehdota" → VP:n pelaajanäkymä tai idp_kausi-luonti), FIREBASE_SDK_YHTENAISTYS, VISIO_PELAAJAKEHITYKSEN_SELKARANKA §5.5, SKAALAUTUVUUS_JA_TEKNINEN_VELKA:106 ja demo_setup_ohjeet:182.
7. **`src/lib/constants.js`:** v3-migraatiotaulukko on kuollutta koodia, `src/` ei tarjoillu. Siivotaan erikseen A6-siivouksessa, ei tässä.

---

## 5. Arvio: PR:t ja järjestys

| # | PR | Sisältö | Riippuvuus |
|---|---|---|---|
| **1** | **Ohjaus uuteen IDP:hen** | <ul><li>VP_v25: URL-sisääntulo `?pelaaja=&nakyma=kehitys` (`_pdcSiirryCockpittiin`) ja testi</li><li>Seura.html: **yksi rivi** (`window.open`-URL r. 4832, napin teksti "Avaa kehityssuunnitelma (IDP)")</li><li>UTJ_v1: IDP-kortti-nappi pois</li><li>Tarkistus seurakäyttäjällä (VP), ei SA:lla</li></ul> | – |
| **2** | **Vanhan kortin arkistointi** | `git mv` → `archive/`, testit (§4.2), CLAUDE.md ja dokumentit (§4.6) | PR 1 mergetty, jottei mikään nappi osoita 404:ään |
| (3) | IDP vanhemmalle (valinnainen) | Vanhempi_v2-näkymä + sääntö `onLapsenHuoltaja` → `idp_kausi` read | Teron päätös (§3.3) |
| (4) | Kuntoutusnäkymä (valinnainen) | `hpp_rehab_protokollat.js` + terveystiedon suostumus, ei IDP:hen | Teron päätös (§3.2) |

**Yhteensä 2 PR:ää** yhteen IDP:hen. Kohdat 3 ja 4 ovat erillisiä tuotepäätöksiä.
