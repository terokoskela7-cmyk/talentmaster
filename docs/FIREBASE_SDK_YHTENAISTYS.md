# Firebase SDK -versioiden yhtenäistys — suunnitelma

> **Suunnitelma + päätökset.** Laadittu 3.10.2026, päätökset kirjattu samana päivänä (§0); luvut laskettu repon `main`-tilasta
> (`archive/` ohitettu — siellä on vanhoja versioita, joita ei tarjoilla eikä yhtenäistetä).

## 0. Päätökset (Tero, 3.10.2026)

1. **Kohdeversio 10.7.1** kaikille compat-sivuille. **Modular-sivut pysyvät 10.12.0:ssa.**
2. **Aikataulu:** erä 0 nyt. **Erät 1–6 alkavat vasta, kun päivämääräkorjauksen PR 2 (`fix/tama-paiva-tallennus`) on mergetty.**
   - Erät 1–3: **yksi arkipäivä per erä.**
   - Erät 4–5: **kahden päivän välein**; **erää 5 (Rekisteröinti_Suostumus) ei tehdä päivänä, jolloin huoltajakutsuja lähtee.**
   - Erä 6: **viikon varoajan jälkeen** (kun erät 3–5 ovat olleet viikon ilman verified-%-laskua).
3. **Revert-kriteeri:** verified-% laskee **yli 2 %-yksikköä** TAI siirretystä sivusta tulee **yksikin uusi App Check- tai permission-denied-virhe Sentryyn**. **Toimenpide on ENSIN revert-PR; un-enforce vain viimeisenä keinona** (se on projektinlaajuinen). (§5 päivitetty tähän muotoon.)
4. **`auth/invalid-credential`-tuki Pelaaja_v7:n virheviestikarttaan omana pienenä PR:nä nyt** (PR #728), ei erässä 6.

**Tila:** erä 0 = portti `tests/firebase_sdk_versio.test.js` + CLAUDE.md §38 -korjaus + tämä dokumentti (ei SDK-muutoksia). `MIGRAATIOLISTA`ssa 12 sivua (erä 1: 3 · erä 2: 3 · erä 3: 2 · erä 4: 1 · erä 5: 1 · erä 6: 2).

## TL;DR

- **Nykytila:** 23 elävää sivua, 5 compat-versiota (9.22.0 · 9.22.1 · 9.22.2 · 9.23.0 · 10.7.1) + modular 10.12.0 (2 sivua). Yksikään tiedosto ei sekoita versioita sisällään.
- **Suositus: yksi compat-versio kaikille 21 compat-sivulle = `10.7.1`.** Se on jo tuotannossa isoimmalla apilla (VP) ja 9 muulla sivulla, joten 9 sivua ei muutu lainkaan; 12 sivua siirtyy 9.x → 10.7.1.
  Modular-sivut jäävät `10.12.0`:aan (oma erillinen kohdeversio; ei downgradea).
- **Toteutus 6 erässä** (+ erä 0: portti ilman SDK-muutoksia), yksi PR per erä, matalimmasta riskistä korkeimpaan: PWA:t (Pelaaja_v7, Vanhempi_v2) viimeisenä. Aikataulu ja revert-kriteeri: §0.
- **Myöhempi askel (oma päätös):** siirto uudempaan versioon (10.14.1 tai 12.x) vasta, kun kaikki ovat samassa versiossa — silloin se on yhden vakion vaihto + yksi regressiokierros eikä 5 erillistä.

✅ **Korjattu erässä 0:** CLAUDE.md §38 sanoi "compat (18 appia)"; todellinen luku on **21 compat-sivua** (+ 2 modular = 23; `tests/appcheck_kytkenta.test.js` laskee saman).

---

## 1. Inventaario

Versio luettu jokaisen sivun `gstatic.com/firebasejs/<versio>/firebase-*.js`-skriptitageista; kaikilla sivuilla kaikki moduulit ovat samaa versiota (varmistettu skriptillä).
Analytics-moduulia ei ladata missään elävässä sivussa. Service workerit (`sw_pelaaja.js`, `sw_vanhempi.js`, `sw_adar.js`) eivät lataa SDK:ta: ne vain cachettavat sivun pyytämät `gstatic.com/firebasejs/`-URL:t (cache-first allowlist).
"Kutsujen" määrä = lähdekoodin esiintymät (`.collection(`/`.doc(`, `httpsCallable(`, kirjautumiskutsut, Storage, `onSnapshot(`); suuntaa-antava, ei ajonaikainen. Modular-sivujen luvut ovat aliarvioita (modular-syntaksi `getDoc`/`setDoc` ei kuulu laskentaan).

| Tiedosto | Versio | Tyyppi | Ladatut SDK-moduulit | Firestore (`collection`+`doc`) | Callable | Auth | Storage | `onSnapshot` | ≈ yht. |
|---|---|---|---|---:|---:|---:|---:|---:|---:|
| ~~`TalentMaster_IDP_Kortti_v4.html`~~ | 9.22.0 → 10.7.1 (erä 1) | compat | app, app-check, auth, firestore | 29 | 0 | 1 | 0 | 0 | 30 — **arkistoitu 2026-10** (`archive/`), elävät compat-sivut 21 → 20 |
| `TalentMaster_Seura.html` | 9.22.0 | compat | app, app-check, auth, firestore, functions, storage | 185 | 13 | 16 | 2 | 1 | 217 |
| `TalentMaster_ADAR_Pikakortti.html` | 9.22.1 | compat | app, app-check, auth, firestore | 20 | 0 | 4 | 0 | 2 | 26 |
| `TalentMaster_Admin.html` | 9.22.1 | compat | app, app-check, auth, firestore, functions | 84 | 6 | 10 | 0 | 1 | 101 |
| `TalentMaster_Master_v16.html` | 9.22.1 | compat | app, app-check, auth, firestore, storage | 313 | 0 | 29 | 0 | 2 | 344 |
| `TalentMaster_Pelaaja_v7.html` | 9.22.1 | compat | app, app-check, auth, firestore, functions | 148 | 2 | 17 | 0 | 1 | 168 |
| `TalentMaster_UTJ_v1.html` | 9.22.1 | compat | app, app-check, auth, firestore | 28 | 0 | 5 | 0 | 0 | 33 |
| `TalentMaster_Valmennusapuri.html` | 9.22.1 | compat | app, app-check, auth, functions | 0 | 1 | 8 | 0 | 0 | 9 |
| `TalentMaster_Vanhempi_v2.html` | 9.22.1 | compat | app, app-check, auth, firestore, functions | 56 | 1 | 7 | 0 | 0 | 64 |
| `TalentMaster_Excel_Tuonti.html` | 9.22.2 | compat | app, app-check, auth, firestore | 156 | 0 | 19 | 0 | 0 | 175 |
| `TalentMaster_Testituonti_Master.html` | 9.22.2 | compat | app, app-check, auth, firestore | 29 | 0 | 3 | 0 | 0 | 32 |
| `TalentMaster_Rekisterointi_Suostumus.html` | 9.23.0 | compat | app, app-check, firestore, functions | 2 | 1 | 0 | 0 | 0 | 3 |
| `TalentMaster_Harjoitettavuus_Lomake_v4.html` | 10.7.1 | compat | app, app-check, auth, firestore | 43 | 0 | 3 | 0 | 0 | 46 |
| `TalentMaster_Pelihavainto_Kentta.html` | 10.7.1 | compat | app, app-check, auth, firestore | 22 | 0 | 3 | 0 | 0 | 25 |
| `TalentMaster_Player_Home.html` | 10.7.1 | compat | app, app-check, auth, firestore, functions | 14 | 2 | 7 | 0 | 2 | 25 |
| `TalentMaster_Solo_Koti.html` | 10.7.1 | compat | app, app-check, auth, firestore | 6 | 0 | 2 | 0 | 0 | 8 |
| `TalentMaster_Solo_Lupa.html` | 10.7.1 | compat | app, app-check, auth, firestore, functions | 6 | 1 | 5 | 0 | 0 | 12 |
| `TalentMaster_Solo_Profiili.html` | 10.7.1 | compat | app, app-check, auth, firestore | 2 | 0 | 1 | 0 | 0 | 3 |
| `TalentMaster_Testaus_v9.html` | 10.7.1 | compat | app, app-check, auth, firestore | 70 | 0 | 4 | 0 | 0 | 74 |
| `TalentMaster_VP_v25.html` | 10.7.1 | compat | app, app-check, auth, firestore, functions, storage | 441 | 2 | 35 | 0 | 1 | 479 |
| `TalentMaster_Valmentajakortti.html` | 10.7.1 | compat | app, app-check, auth, firestore | 22 | 0 | 3 | 0 | 0 | 25 |
| `TM_LiikehallintaMatrix_v2.html` | 10.12.0 | modular | app, app-check, firestore | 2 | 0 | 0 | 0 | 0 | 2 |
| `tm_videopankki_admin.html` | 10.12.0 | modular | app, app-check, auth, firestore | 2 | 0 | 3 | 0 | 0 | 5 |

Yhteenveto: **9.22.0** ×2 · **9.22.1** ×7 · **9.22.2** ×2 · **9.23.0** ×1 · **10.7.1** ×9 (kaikki compat) · **10.12.0** ×2 (modular). Kaikki compat-sivut lataavat `app-check-compat`:n **samalla versiolla** kuin `app-compat`:n (§38).

`archive/`: vanhat sivut (VP_v19–v22, Master_v15, Testaus/Testaus_v8 ym.) ohitetaan; eivät ole Hostingissa/Pagesissa tarjoiltavina, eikä niitä päivitetä.

---

## 2. Kohdeversio

### Mitä on saatavilla (tarkistettu 3.10.2026)
- npm `firebase@latest` = **12.19.0** (9.9.2026). Compat-tiedostot (`firebase-{app,app-check,auth,firestore,functions,storage}-compat.js`) ovat CDN:ssä (gstatic) vastaavasti 12.19.0:lle, 11.10.0:lle, 10.14.1:lle ja 10.7.1:lle (HTTP 200).
- Compat on yhä julkaistu 12.x:ssä (`@firebase/app-compat@0.5.x`, `auth-compat@0.6.x`, `firestore-compat@0.4.x`). Luetuissa release noteissa (11.0.0, 12.0.0) ei ole compatin poistoilmoitusta; compat on kuitenkin nimensä mukaisesti yhteensopivuuskerros modular-API:n rinnalla, joten sen pitkän aikavälin tulevaisuutta ei voi pitää varmana (ei todennettu tässä).
- `firebase-firestore-compat.js` raakakoko: 9.22.1 ≈ 339 kB · 10.7.1 ≈ 340 kB · 10.14.1 ≈ 344 kB · **12.19.0 ≈ 548 kB** (+61 %). Pelaaja/Vanhempi ovat puhelin-PWA:ita → iso hyppy 12.x:ään maksaa latausaikaa ja dataa.

### Mitä 9.x → 10.x rikkoo compat-API:ssa (luettu firebase-js-sdk:n CHANGELOGeista)
- **Firestore 3.x → 4.0** (firebase 10.0.0): vain **TypeScript-tyypitys** (`FirestoreDataConverter`, `updateDoc`-tyypit). Ei ajonaikaista API-muutosta compat-puolella.
- **Auth 0.x → 1.0** (10.0.0): `RecaptchaVerifier`-parametrien järjestys (modular; compat-kääre säilyttää oman signatuurinsa) ja React Native -entry — ei vaikuta tähän repoon.
- **Auth 1.5.0:** `INVALID_LOGIN_CREDENTIALS` näkyy virhekoodina **`auth/invalid-credential`**. Sovelluskohtainen vaikutus: ks. §3 (Pelaaja_v7 ei käsittele tätä koodia).
- **`enablePersistence({synchronizeTabs})`** (vain ADAR_Pikakortti käyttää): metodi on compat-tiedostossa tallella kaikissa tarkistetuissa versioissa (9.22.1, 10.7.1, 10.14.1, 12.19.0; merkkijonohaku tiedostosta). Firestoren IndexedDB-formaatin muutos oli jo firestore 3.4.7:ssä (v9-sarjan alkupuoli, selvästi ennen 9.22) — ei 9.22 → 10.x -välillä.
- **`auth.setPersistence(LOCAL)`** (Admin, Seura, ADAR): ennallaan.
- **Firestore-ajonaikaiset korjaukset 4.x:ssä** (hyödyt uudemmasta): fetch-streamien käyttöönotto (4.2.0) peruttiin jumittavien kyselyiden takia (4.3.2) — 10.7.1 on tämän perumisen **jälkeen**; "Backend didn't respond within 10 seconds" -virheiden esto (4.6.1, ≥10.12); multi-tab-persistencen korjaukset (4.6.3, 4.7.2; ≥10.12–10.14) — relevantteja vain ADAR:lle.
- **Versio 11.0.0:** ES5-bundlet poistettu, **vähimmäisvaatimus ES2017**. **12.0.0:** build-kohde ES2020, Node ≥20 (vain Node-paketit). → vanhat iOS/Android-selaimet voivat tippua pois 11+:ssa. 10.x pysyy ES5-yhteensopivana.

### Vaihtoehdot
| Vaihtoehto | Muuttuvat sivut | Plussat | Miinukset |
|---|---|---|---|
| **A. 10.7.1 (suositus)** | 12 / 21 | Jo tuotannossa isoimmalla apilla (VP: ~440 Firestore-viitettä) ja 8 muulla; pienin muutosjoukko; ES5-yhteensopiva; ei kokokasvua | Ei saa 4.6.x/4.7.x-korjauksia (multi-tab, 10 s -virheet) — ei vaikuta tunnettuihin ongelmiin |
| B. 10.14.1 (viimeinen 10.x) | 21 / 21 (myös VP) | Uusimmat 10.x-korjaukset; ES5 | Kaikki sivut muuttuvat, myös jo vakaa VP; ei tuotantotodistetta |
| C. 11.10.0 | 21 / 21 | — | ES2017-raja ilman selvää hyötyä |
| D. 12.19.0 | 21 / 21 | Uusin | +61 % Firestore-compat-koko; ES2020; compat-kerroksen tulevaisuus epävarma; suurin regressioriski |

**Suositus A.** Perustelu: tavoite on *yhtenäisyys*, ei uusin versio — A poistaa 4 vanhaa versiota pienimmällä muutosjoukolla ja jo koetellulla versiolla. Uudemmasta versiosta päätetään erikseen, kun yhtenäisyys on saavutettu (silloin versio-bump koskee 21 sivua yhdellä vakiolla ja yhdellä regressiokierroksella).

**Modular (Matrix, videopankki-admin):** pysyvät `10.12.0`:ssa. Syy: modular ja compat ovat eri API-kerroksia, eri sivuilla; 10.12.0 ei ole 10.7.1:tä vanhempi eikä sitä pidä laskea alas. Ne ovat pieniä (1–2 Firestore-viitettä), ja `initializeAppCheck` on jo versiosidonnainen (§38). Kun kaikki compat-sivut myöhemmin nostetaan yhdessä, modular nostetaan samaan major.minor-versioon.

---

## 3. Riskit sovelluskohtaisesti

**App Check (§38)**
- `firebase-app-check-compat.js`:n versio **vaihtuu samassa muutoksessa** kuin `app-compat` (sama versionumero joka tiedostossa; `firebase_storage_ladattu`-portti vahtii saman asian Storagelle).
- Aktivoinnin järjestys **ei saa muuttua**: `firebase.initializeApp()` → `tmAppCheckAktivoi()` → vasta sitten ensimmäinen Auth/Firestore/Functions/Storage-kutsu. Muutos on pelkkä versionumero skriptitagin URL:ssä, ei tagien järjestyksessä eikä alustuskoodissa.
- ENFORCE on päällä (2.10.2026): epäonnistunut aktivointi = hylätyt kutsut. Siksi jokaisen erän jälkeen mitataan verified-% (§5).
- `lib/tm_appcheck.js` ei ota kantaa versioon (kommentti sanoo "9.22.x / 9.23.0 / 10.7.1" → päivitetään erässä 0).

**PWA (Pelaaja_v7, Vanhempi_v2; sama pätee `sw_adar.js`:ään ja ADAR_Pikakortti.html:ään)**
- SW-allowlist cachettaa `gstatic.com/firebasejs/`-URL:t cache-first. Uusi versio = **uusi URL = uusi cache-merkintä**; vanhan version tiedostot jäävät nykyiseen cacheen kunnes SW:n `CACHE`-nimi vaihtuu (activate poistaa muut cachet).
- **Arvio: SW:n `CACHE`-versiota EI tarvitse nostaa toimivuuden vuoksi.** HTML haetaan network-first ja `SHELL` päivittyy ensimmäisellä verkkolatauksella; uudet SDK-URLit cachettuvat ensimmäisellä pyynnöllä. Jos `CACHE`-nimi nostetaan, vanha shell + vanha SDK poistuvat activate-vaiheessa → **ennen ensimmäistä verkkolatausta offline-käynnistys ei toimi** (ei cachea ollenkaan). Nosto on siis riski, ei hyöty.
- Siivous (vanhat 9.22.1-tiedostot ~1 MB cachessa) voidaan tehdä myöhemmin erillisellä `CACHE`-nostolla, kun uusi versio on ollut tuotannossa viikon ja puhelimet ovat päivittyneet (§27.4: nosto vain tietoisena päätöksenä).
- ADAR: `sw_adar.js` käyttää etuliite-allowlistiä (`https://www.gstatic.com/firebasejs/`) → sama logiikka.
- Testattava puhelimella: SW päivittyy, sivu avautuu verkossa uudella SDK:lla, sen jälkeen **lentokonetila-avaus** toimii (uudet SDK-tiedostot cachessa).

**Offline-persistence / IndexedDB**
- Firestore `enablePersistence` käytössä vain **ADAR_Pikakortti.html** (`synchronizeTabs:true`). Admin ja Seura ovat poistaneet sen (IndexedDB-konflikti Auth-sessionin kanssa, 2026-03-27); Pelaaja/Vanhempi eivät käytä Firestore-persistenceä (offline hoituu SW:llä).
- Firestoren IndexedDB-skeema ei muutu 9.22 → 10.7.1 (changelog: formaattimuutos oli firestore 3.4.7:ssä, ennen 9.22:ta). Auth `setPersistence(LOCAL)` ennallaan. Silti **ADAR kuuluu omaan erään**: sama SDK, mutta vanha cache + uusi SDK kokeillaan oikealla laitteella (offline-kirjoitus, monta välilehteä).

**Auth-virhekoodit (Auth 1.5.0)** — *ratkaistu erillisellä PR:llä #728 (päätös §0.4), ei erässä 6*
- `auth/invalid-credential` (väärä sähköposti tai salasana). Admin, Seura, Vanhempi, VP ja `tm_auth.js` käsittelevät sen. **Pelaaja_v7** käsittelee vain `wrong-password` ja `user-not-found` (rivit ~952–953) → 10.x:ssä väärä salasana voi tulla uudella koodilla ja näkyä yleisviestinä. Korjattu omana pienenä PR:nä (#728): `auth/invalid-credential` → sama viesti kuin `wrong-password`. Erässä 6 tarkistetaan silti väärän salasanan viesti puhelimella.
- `Solo_Lupa` (10.7.1) luo tilin `auth/user-not-found`-koodilla — ei muutu tässä suunnitelmassa.

**Kirjautumistavat**
- Google-popup (`signInWithPopup`): Master, Valmennusapuri (+ jo 10.7.1:ssä VP, Testaus, Solo_Lupa, Player_Home). Testataan selaimissa, joissa kolmannen osapuolen storage on rajattu (Safari).
- `signInWithCustomToken` (Pelaaja_v7, Player_Home): pelaajaKirjaudu-polku testataan erässä 6.

**Sentry ja CSP (`firebase.json`)**
- CSP sallii `https://www.gstatic.com` (script-src) kaikille versioille, joten URL-muutos ei riko sitä. `connect-src` kattaa `*.googleapis.com`, `firestore.googleapis.com`, `identitytoolkit`/`securetoken`, `*.cloudfunctions.net`, reCAPTCHA — 10.x käyttää samoja päätepisteitä.
- Sentry (`browser.sentry-cdn.com`, `*.ingest.de.sentry.io`) on erillinen skripti eikä riipu Firebase-versiosta. Tarkistettava joka erässä: konsolissa ei CSP-rikkomuksia ja testivirhe näkyy Sentryssä (`app`-tagi).
- Pages ei palauta CSP:tä (vain Hosting) → testaa Hosting-preview-kanavalla (`*--*.web.app`), ei pelkästään Pagesissa.

---

## 4. Toteutusjärjestys (matalin → korkein riski, yksi PR per erä)

| Erä | Sisältö | Muuttuu | Peruste |
|---|---|---|---|
| **0** | Portti-testi `tests/firebase_sdk_versio.test.js` (§6) + CLAUDE.md §38 -korjaus (21 compat) + tämä dokumentti. **Ei SDK-muutoksia.** (`lib/tm_appcheck.js`:n versiokommentti päivitetään erässä 1.) | — | Portti ensin: estää uuden hajaantumisen ja pakottaa erät etenemään |
| **1** | Sisäiset työkalut: `UTJ_v1`, `Testituonti_Master`, `IDP_Kortti_v4` (arkistoitu 2026-10) | 9.22.1 / 9.22.2 / 9.22.0 → 10.7.1 | Ei tuotantokäyttäjiä / harva käyttö; ei PWA:ta |
| **2** | Henkilöstön työkalut: `Admin`, `Excel_Tuonti`, `Valmennusapuri` | 9.22.1 / 9.22.2 → 10.7.1 | SA/johto-käyttö, ei pelaajia; Excel_Tuonti kirjoittaa paljon (batch) → testataan Topiaksella + testidatalla |
| **3** | Ydin-henkilöstöapit: `Seura`, `Master_v16` | 9.22.0 / 9.22.1 → 10.7.1 | Suurimmat käyttömäärät (~110 / ~170 collection-kutsua), kaikki seurat; Google-popup (Master) |
| **4** | `ADAR_Pikakortti` (+ `sw_adar.js`) | 9.22.1 → 10.7.1 | PWA + `enablePersistence` + SW; erillinen offline-testi |
| **5** | `Rekisterointi_Suostumus` | 9.23.0 → 10.7.1 | Julkinen, kirjautumaton, GDPR-kriittinen suostumuslomake (`vahvistaSuostumus`); pieni (3 SDK-moduulia) mutta virhe = suostumus ei tallennu |
| **6** | `Pelaaja_v7` + `Vanhempi_v2` | 9.22.1 → 10.7.1 | Alaikäiset + huoltajat, PWA, custom token + Auth-virhekoodit; viimeisenä kun versio on todennettu muualla |

Solo-sivut (`Solo_Koti/Lupa/Profiili`, `Player_Home`), `VP_v25`, `Testaus_v9`, `Harjoitettavuus_Lomake_v4`, `Pelihavainto_Kentta`, `Valmentajakortti` ovat jo 10.7.1:ssä — ei muutoksia.
**Aikataulu (päätös §0):** erät 1–6 vasta kun PR 2 (päivämäärät) on mergetty · erät 1–3 yksi arkipäivä per erä · erät 4–5 kahden päivän välein, erää 5 ei päivänä jolloin huoltajakutsuja lähtee · erä 6 viikon varoajan jälkeen.

---

## 5. Testisuunnitelma per erä

**Yhteinen kaikille erille**
1. **Savutesti SEURAKÄYTTÄJÄLLÄ, ei SA:lla** (CLAUDE.md §0: SA näkee kaiken → ei todista oikeuksia). Henkilöstöerät: VP- tai valmentajatunnus KPV:ssä.
2. **Kirjoitukset vain Topiakselle** (KPV, doc-ID `m93GBdOaGCUuenMiCL0I` — kaksi u:ta). Muut alaikäiset: vain luku.
3. **App Check -mittari ennen ja jälkeen:** `firebaseappcheck.googleapis.com/services/verification_count`, label `security` (`VALID` vs `MISSING_*`), per palvelu (Firestore, Functions, Storage, Identity Toolkit). Perustaso = edelliset 7 päivää (sama viikonpäivä-/kellonaikaprofiili); mittaus 24 h erän tuotantoon menon jälkeen. **Revert-kriteeri (päätös §0.3):** verified-% laskee **yli 2 %-yksikköä** TAI siirretystä sivusta tulee **yksikin uusi App Check- tai permission-denied-virhe Sentryyn** (seuranta: Sentry-haku sivun `app`-tagilla + `permission-denied`/`appCheck`-virheet ennen/jälkeen). **Toimenpide: ENSIN revert-PR** (URL-muutos palautuu); **un-enforce (§38) vain viimeisenä keinona**, koska se on projektinlaajuinen ja avaa kaikki apit.
4. **Konsoli:** ei CSP-rikkomuksia, ei `firebase.*` is not a function / ReferenceError; Sentry-testivirhe näkyy oikealla `app`-tagilla ilman henkilötietoja.
5. **Hosting-preview-kanava** ennen mergeä (CSP + oikea domain + App Check debug-token tarvittaessa, §38).
6. Autom. testit: koko `npm test` + portti (§6) vihreä.

**Erä 1–2 (työkalut):** kirjautuminen · pääsivun lataus · yksi lukunäkymä · yksi kirjoitus (Topias) · Excel_Tuonti: kuiva-ajo + yksi rivi Topiaksen testidataan.
**Erä 3 (Seura, Master):** kirjautuminen (sähköposti + Google-popup Masterissa) · pelaajalista · kutsun lähetys (`lahetaRekisteriKutsu`, 1 viesti omaan osoitteeseen) · kirjaus Topiakselle · Master: äänipalautteen Storage-lataus (`firebase.storage`, `firebase_storage_ladattu`-portti) · `onSnapshot`-ilmoituskello.
**Erä 4 (ADAR):** havainnon tallennus Topiakselle · **lentokonetila:** havainto offline → verkko takaisin → synkronoituu · kaksi välilehteä (`synchronizeTabs`) · SW päivittyy.
**Erä 5 (Rekisteröinti):** koko suostumusflow Topiaksen testikutsulla (kutsuId-linkki) → `vahvistaSuostumus` → suostumus + audit-rivi + PIN-sähköposti huoltajalle; vanha linkki (hEmail) ja uusi linkki (ilman) molemmat; virhetila (väärä sähköposti → selkeä ohje).
**Erä 6 (Pelaaja, Vanhempi) — puhelintesti pakollinen:** iOS Safari + Android Chrome · PWA asennettu kotinäytölle · `pelaajaKirjaudu` (PalloID + PIN, ja linkki + PIN) · kirjaus Topiakselle · streak päivittyy · **väärä salasana/PIN -viesti** (Auth-virhekoodit) · huoltajan sisäänkirjautuminen + lapsen kirjaus (Topias) · **offline-avaus lentokonetilassa** päivityksen jälkeen · SW:n päivitys (vanha asiakas → uusi) · pelaajalle ei näy rajattua dataa.

**Palautus:** jokainen erä = yksi PR → **revert-PR** palauttaa vanhat skriptitagit (URL-muutos on ainoa muutos). Dataa ei migroida eikä skeemoja muuteta, joten rollback ei vaadi datatoimia; asiakkaiden SW-cache pitää molempien versioiden tiedostot rinnakkain (uusi URL = uusi merkintä), joten palautus toimii myös offline-asiakkailla. Erä 6:ssa revert ei nosta SW:n `CACHE`-versiota (ks. §3).

---

## 6. Portti — TOTEUTETTU erässä 0 (`tests/firebase_sdk_versio.test.js`)

> Toteutus noudattaa alla olevaa kuvausta: `KOHDEVERSIO='10.7.1'`, `MODULAR_VERSIO='10.12.0'`, `MIGRAATIOLISTA` = 12 sivua erä-numeroineen ja nykyversioineen; failaa jos listan ulkopuolinen sivu poikkeaa tai listan sivu on jo siirretty. Erän PR päivittää sivun version ja poistaa rivin listalta (sekä päivittää testin lukumääräassertiot).

Uusi `tests/firebase_sdk_versio.test.js` (vrt. `tests/appcheck_kytkenta.test.js`: kohdejoukko **johdetaan datasta**, ei kovakoodata):
- Kohdejoukko = juuren `*.html`, jotka lataavat `firebase-app(-compat).js` (sama johto kuin App Check -portissa).
- Vakiot testin alussa: `COMPAT_VERSIO = '10.7.1'`, `MODULAR_VERSIO = '10.12.0'`, ja **`MIGRAATIOLISTA`** = sivut, jotka ovat vielä vanhassa versiossa (erä-numeroineen ja kommentteineen). Erän PR poistaa sivunsa listalta samassa muutoksessa kuin vaihtaa version.
- Testit:
  1. Jokainen compat-sivu: kaikki `firebase-*-compat.js`-skriptit **samassa versiossa** (ei sekoitusta sivun sisällä; kattaa myös `app-check-compat`).
  2. Sivu, joka ei ole `MIGRAATIOLISTA`:lla, on versiossa `COMPAT_VERSIO` (modular: `MODULAR_VERSIO`) → **uusi appi väärällä versiolla punertaa**.
  3. Sivu, joka on `MIGRAATIOLISTA`:lla mutta jo kohdeversiossa → punertaa ("poista listalta") → lista ei jää elämään.
  4. Elävä joukko = 21 compat + 2 modular (sama luku kuin App Check -portissa, jotta tiedoston lisäys/poisto näkyy molemmissa).
  5. Ei-vacuous: kohdejoukko ≥ 20 ja `MIGRAATIOLISTA`-merkinnät löytyvät oikeasti sivuilta.
- Kun lista on tyhjä (erän 6 jälkeen), portti on ehdoton: yksikin eri versio punertaa.
- Olemassa olevat versiosidonnaiset testit päivitetään erissä: `tests/vaihe0_pr1_pelaaja_kirjautuminen.test.js` odottaa kovakoodattua `firebasejs/9.22.1/firebase-functions-compat.js` (erä 6: vaihdetaan vertaamaan `COMPAT_VERSIO`:on); `firebase_storage_ladattu` on jo versioneutraali (vertaa app ↔ storage).

---

## 7. Keskitetty versio yhteen paikkaan? (esim. `lib/tm_firebase_sdk.js`-loaderi)

Ehdotus: yksi `lib/`-skripti, joka kirjoittaa SDK-skriptitagit sivulle (`document.write`) `COMPAT_VERSIO`-vakion mukaan.

| Hyödyt | Haitat |
|---|---|
| Versionosto = yksi rivi, ei 21 sivun muokkausta | **Ei build-vaihetta:** ladattava synkronisesti (`document.write`) jotta App Checkin järjestys säilyy; `document.write` on vanhentunut ja blokkaava; async-lataus rikkoisi "initin jälkeen, ennen ensimmäistä kutsua" -säännön |
| Sekaversio mahdoton rakenteellisesti | **Yksi pisteen vika:** virheellinen vakio rikkoo kaikki 21 sivua kerralla; nykyinen malli rajaa virheen yhteen sivuun/erään |
| | Staattiset portit lakkaavat näkemästä SDK:ta: `appcheck_kytkenta` johtaa kohdejoukon regexillä `firebase-app(-compat)?\.js` HTML:stä, `firebase_storage_ladattu` tarkistaa `firebase-storage-compat`:n HTML:stä → molemmat pitäisi kirjoittaa uusiksi |
| | PWA: loaderin on oltava SW-allowlistillä (`/lib/…`) ja cachessa, muuten offline-käynnistys kaatuu; lisäpyyntö + lisävirhepinta |
| | Nykyinen näkyvyys ("katsot sivun lähdettä, näet version") katoaa; SRI/CSP-tarkistus vaikeutuu |

**Suositus: älä keskitä loaderiin nyt.** Saman hyödyn saa pienemmällä riskillä: pidä skriptitagit sivuilla ja keskitä **versio-totuus portti-testin vakioon** (§6) — versionosto on silloin yksi vakio + yksi sed-muutos koko repoon, ja portti todistaa että kaikki on tehty. Loaderia kannattaa harkita uudelleen vasta jos repoon tulee build-vaihe.

---

## 8. Päätökset (ratkaistu 3.10.2026, ks. §0)

1. ~~Kohdeversio~~ → **10.7.1** (hyväksytty).
2. ~~Aikataulu~~ → ks. §0.2.
3. ~~Revert-kriteeri~~ → ks. §0.3. **Avoin:** kuka seuraa App Check -mittaria ja Sentryä erien jälkeen (ehdotus: erän tekijä + Tero, 24 h).
4. ~~`invalid-credential`~~ → PR #728.
