# Vaihe 0 — Pelaajan modulaarinen Auth ilman popupRedirectResolveria (28.11.2026, vain suunnitelma — EI koodia)

Tausta: `docs/KYLMA_AVAUS_DIAGNOOSI.md` §19.5. gapi-A/B (`ab_2026-11-26T20-26-01`, esto `apis.google.com`, reititys molemmille puolille, kirjautunut = true), **Pelaaja, puhelin, kylmä:** auth-haun alku **−781 ms** (−781 / −785 / −922), interaktiivinen **−666 ms** (−706 / −756 / −529) → merkitsevä. Pelaajan kylmä polku odottaa `apis.google.com`-latausta (compat-Authin oletuksena mukaan tuleva `popupRedirectResolver` alustaa gapi-iframen heti Authin käynnistyessä) ennen kuin `onAuthStateChanged` laukeaa. Pelaaja ei käytä popup-/redirect-kirjautumista lainkaan → resolveria ei tarvita.

> **Päivitys 28.11.2026:** §3 A ja E on nyt **kokeilla hylätty**, PR-jako ja riskit täsmennetty → §8. Yhteissuunnitelma kattavuuden kanssa: `docs/VAIHE0_PELAAJA_TTI_YHTEISSUUNNITELMA.md`.

**Merkinnät:** *repo* = luettu koodista tässä repossa (tarkistettu); *SDK* = Firebase JS SDK:n rakenteesta (muistinvarainen / dokumentoitu, **ei tarkistettu tässä repossa tai ajossa** → prototyypillä varmistettava ennen kuin päätöksiä tehdään).

## 1. Nykytila (repo)

| Asia | Tila |
|---|---|
| Firebase-SDK | **compat 9.22.1**, gstatic-CDN, ei bundleria: `firebase-app-compat`, `-app-check-compat`, `-auth-compat`, `-firestore-compat`, `-functions-compat` (`TalentMaster_Pelaaja_v7.html`) |
| App | **nimetty app `'tm-pelaaja'`** (`firebase.initializeApp(cfg,'tm-pelaaja')`, ~4543): oletusappia ei alusteta lainkaan; `window._fbApp/_auth/_db` tästä |
| Auth-käyttö | `app.auth()` → `onAuthStateChanged`, `signInWithCustomToken` (PIN/linkki → `pelaajaKirjaudu`), `signInWithEmailAndPassword` (sähköpostikirjautuminen), `signOut`, `currentUser.getIdToken(true)`. **Ei** popupia, redirectiä, `getRedirectResult`ia, Google-/muuta providerta (grep: 0 osumaa) |
| Firestore | `app.firestore()` compat: 29× `window._db.collection(…)`, 1× `batch`, 76× `.collection(/.doc(`-kutsua, 7× `onSnapshot` |
| Functions | `window._fbApp.functions('europe-west1').httpsCallable(…)` (compat) |
| App Check | `tmAppCheckAktivoi(app)` heti initin jälkeen (compat, `lib/tm_appcheck.js`) — §38: aktivointi ennen ensimmäistä backend-kutsua |
| SW | `sw_pelaaja.js` allowlist: `gstatic.com/firebasejs/` (versioitu URL, cache-first) |
| Vanhempi_v2 | sama compat-malli (`_vApp.auth()`, `firebase-auth-compat.js` 9.22.1) → sama pullonkaula, oma PR |

## 2. Miksi ei voi vain "ottaa resolveria pois"

*SDK:* compat-Auth (`firebase-auth-compat.js`) alustaa Authin selainympäristön oletuksilla, joihin kuuluu `browserPopupRedirectResolver`; resolverin `_initialize` ajetaan Authin käynnistyksessä ja lataa gapi-iframen (`apis.google.com/js/api.js` + `__/auth/iframe`). Compat-API ei tarjoa vipua "ilman resolveria". Modulaarinen `initializeAuth(app, { persistence: […] })` **ilman** `popupRedirectResolver`-kenttää ei lataa gapia (resolveri on valinnainen; vain `signInWithPopup/Redirect` vaatii sen). *Mitattu (repo/A/B):* esto `apis.google.com` → −0,78 s.

## 3. Vaihtoehdot

**A. Vain Auth modulaariseksi, loput compatiksi (sekakäyttö)** — pienin muutos, mutta *SDK:*
CDN-compat ja CDN-ESM ovat **eri @firebase/app-kopioita** → komponenttirekisteri ei ole yhteinen: modulaarinen `getAuth/initializeAuth` ei löydä compat-appia eikä compat-Firestore saa modulaarista Authia (`auth-internal`-komponentti). Ilman bundleria (importmap/ESM-CDN kaikille) sekakäyttö on **todennäköisesti ei toimiva**. Vaatii prototyypin ennen kuin hylätään.

**B. Koko Pelaajan Firebase modulaariseksi (app, app-check, auth, firestore, functions)** — toimiva, mutta laaja:
- `window._db.collection(…).doc(…).get()` → `getDoc(doc(db,…))`, `onSnapshot`, `writeBatch` jne.: ≥ 76 kutsupaikkaa + libit, jotka saavat `_db`:n (compat-API-oletus). Jaetut libit (`lib/*.js`) odottavat compat-muotoista `db`:tä → joko adapteri (compat-muotoinen kääre modulaarisen päälle, `tm_firestore_compat_kaare.js`) tai libien muutos.
- App Check: `initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(KEY) })` — §38:n modular-polku on jo olemassa (`tm_videopankki_admin`, `TM_LiikehallintaMatrix_v2`), `initializeAppCheck` heittää jos sama appi alustetaan kahdesti → yksi alustuspolku.
- SW: ESM-tiedostot gstatic-URL:eilla → `gstatic.com/firebasejs/`-allowlist-sääntö kattaa (ei muutosta); `type="module"` ei ole `defer`-yhteensopiva samalla tavalla (moduulit ovat oletuksena deferred, mutta järjestys vs. klassiset skriptit pitää testata deploy-muodossa).
- Hyöty bundle-kokoon: modulaarinen on pienempi vain jos tree-shake (bundleri) — CDN-ESM:llä ei välttämättä (sama SDK-koodi); **ei oleteta kokovoittoa**, vain gapi-viive pois.

**C. Compat säilyy, lataus viivästetään**: `firebase.auth()` kutsutaan vasta kun resolver-lataus on ohi — ei auta, koska auth on juuri se joka odottaa.

**D. Estetään gapi-lataus kontrolloidusti** (CSP/`page.route`-tyyppinen esto tuotannossa ei ole mahdollinen; verkkotason esto vain testissä) — **ei vaihtoehto**, vain mittausmenetelmä.

**E. Seuraava compat-SDK-versio** (10.x/11.x): *SDK:* ei tiedetä, onko resolver compatissa valinnainen; tarkistettava julkaisumuistiinpanoista. Edullinen tarkistus ennen B:tä.

## 4. Suositus

1. **Prototyyppi (pieni, kertakäyttöinen, ei tuotantokoodia): A:n toimivuus** — yksi sivu, jossa compat-Firestore `'tm-pelaaja'`-appissa + modulaarinen Auth samalla underlying-appilla (ESM + `app._delegate`-temppu?). Odotus: ei toimi (§3 A); 1–2 h mittaus. **Samalla E:** compat 10.x/11.x:n resolver-käytös.
2. Jos A ja E kaatuvat → **B kahdessa vaiheessa**, jokainen oma PR + A/B (`--sivut=pelaaja --profiilit=puhelin`, esto `apis.google.com` poistuu tarpeettomaksi):
   - **B1: Firestore/Functions-adapteri** (compat-muotoinen kääre) + modulaarinen app + App Check + Auth yhdessä; libit ennallaan adapterin kautta. Hyväksymisehdot: auth-haun alku −0,7 s (gapi-A/B:n taso), interaktiivinen −0,6 s, kirjautumispolut (PIN, kutsulinkki, sähköposti, uloskirjaus, istunnon palautus) ennallaan.
   - **B2: adapterin purku** kutsupaikoittain (vain jos hyödyllistä; ei pakollinen).
3. **Vanhempi_v2** samalla mallilla vasta Pelaajan jälkeen (oma PR, sama adapteri).

## 5. Selvitettävät (vastaukset ≠ vielä varmoja)

| Kysymys | Vastaus tällä hetkellä |
|---|---|
| Compat- ja modular-instanssien rinnakkaiselo | *SDK:* ei jaa app-rekisteriä CDN:llä → A todennäköisesti ei toimi; **varmistettava prototyypillä** |
| Firestore compat tarvitsee saman Auth-tilan | *SDK:* kyllä (`auth-internal` samasta appista) → Auth ja Firestore samaan SDK-perheeseen |
| App Check | modular-polku olemassa (§38); aktivointi initin jälkeen, ennen ensimmäistä kutsua; yksi alustuspolku (kahdesti = heitto) |
| SW-allowlist | gstatic-sääntö kattaa ESM-URL:t (*repo*); irrotetut `tm_pelaaja_main/p6.js` jo allowlistissä (perf/pelaaja-defer) |
| Kirjautumisen palautus (IndexedDB-istunto) | `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })` ennallaan säilyttää nykyisen tallennuksen *(SDK; sama storage-avain `firebase:authUser:<apiKey>:tm-pelaaja` → olemassa olevat istunnot säilyvät — **vahvistettava**: väärä persistenssijärjestys kirjaa kaikki ulos)* |
| `onAuthStateChanged`-semantiikka | sama; `_authTilaSelvilla`/15 s PIN-varakeino (repo ~5635) ennallaan |
| Pelaajatoken (custom token, claim `pelaajaSeuraId`) | ei muutu (palvelin); `signInWithCustomToken` modulaarisena identtinen |
| Sentry/CSP | `connect-src`/`script-src` gstatic jo sallittu (Hosting-CSP); ei uusia originejä |
| Rules / palvelin | ei muutosta |

## 6. Riskit
- **Istuntojen menetys** (persistenssi/storage-avain) — kaikki pelaajat kirjautuvat uudelleen PIN:llä: lapsille/vanhemmille häiritsevä → portti: istunnonpalautustesti selaimessa (kirjaudu → sulje → avaa uudelleen) ennen julkaisua.
- **Hiljainen offline-regressio:** SW:n cache-first + ESM-importit; offline-avaus (kenttäkäyttö) testattava `sw_paivitys_selain`-tyyppisesti.
- **Adapterin vuodot:** compat-API-oletuksia (esim. `snap.docs`, `FieldValue`, `Timestamp`) on kymmeniä; adapterille kattava yksikkötesti ennen käyttöönottoa.

## 7. Mittaus (kun toteutus valmis)
`ab_vuorotellen.js --sivut=pelaaja --profiilit=puhelin` (ilman estoa; vanha vs. uusi kanava): auth-haun alku, interaktiivinen, Firestore-luvut; hyväksyntä: ≥ −0,6 s interaktiivinen johdonmukaisesti kaikilla kierroksilla.

## 8. Täsmennys 28.11.2026 — kokeilla varmistetut väitteet, PR-jako ja riskit

*Merkinnät:* **kokeilla varmistettu** = ajettu tässä selvityksessä oikealla Chromella ja oikealla gstatic-SDK:lla (kokeet olivat kertakäyttöisiä skriptejä, eivät repossa); *SDK-selitys* = muistinvarainen, ei tarkistettu lähdekoodista; *vahvistettava* = vaatii toteutusvaiheen testin.

### 8.1 Kaksi hylkäystä (§3 A ja E) — nyt mitattu, ei oletus

| Väite | Koe | Tulos |
|---|---|---|
| **A. Sekakäyttö:** compat-app (`firebase-app-compat` + `firebase-firestore-compat` 9.22.1) + modulaarinen `firebase-auth.js` (ESM, 9.22.1) samalla appilla | `initializeAuth(app._delegate, { persistence: [indexedDBLocalPersistence] })` ja `getAuth(app._delegate)` compat-apin delegaattiin | **EI TOIMI — kokeilla varmistettu:** `Component auth has not been registered yet` (molemmat). *SDK-selitys:* ESM-auth rekisteröi komponenttinsa omaan `@firebase/app`-kopioonsa, ei compat-bundlen rekisteriin. → **A hylätty.** |
| **E. Uudempi compat-SDK poistaa gapi-latauksen** | Compat `app().auth()` + `onAuthStateChanged`, `apis.google.com` estetty, pyynnöt kirjattu; versiot 9.22.1, 10.14.1, 11.10.0, 12.0.0 | **Kaikissa versioissa `apis.google.com/js/api.js` pyydetään heti — kokeilla varmistettu — mobiili-UA:lla (iPhone/Safari-profiili); työpöytä-UA:lla ei lainkaan.** *SDK-selitys:* resolverin alustus on proaktiivinen vain mobiili/Safari/iOS-selaimilla. → **E hylätty** (versionosto ei auta). |

**Seuraus:** (1) koko Firebase-kerros on siirrettävä modulaariseksi yhdessä (**B**); (2) hyöty (gapi −0,7 s, KYLMA_AVAUS §19.5) koskee **kaikkia pelaajia, koska pelaajat käyttävät puhelinta** — mutta ei työpöytäkäyttäjiä (desktop A/B ei näytä gapi-viivettä); (3) mahdollinen "sisäinen" kiertotie (compat-Authin `provider.initialize({ options })` ilman resolveria) vaatisi SDK:n sisäisten persistence-luokkien käsittelyä eikä ole julkinen API → **ei suositella.**

### 8.2 Kutsupaikkojen inventaario (Pelaaja_v7, repo; laskettu tekstihauilla koko HTML:stä, sis. kommentit → ylärajoja)

`.collection(` 99 · `.doc(` 87 · `.get()` 29 · `.set(` 12 · `.add(` 9 · `.where(` 9 · `.limit(` 7 · `.update(` 4 · `.orderBy(` 4 · `.batch()` 2 · `onSnapshot(` 1 tekstihaku (7 `onSnapshot`-sanaa) · `FieldValue.serverTimestamp` 8 · `Timestamp.fromDate` 3 · `FieldPath` 5 (`documentId` 1) · `httpsCallable(` 5 · `getIdToken` 15 · `currentUser` 16 · `signInWithCustomToken` 3 · `signInWithEmailAndPassword` 1 · `signOut(` 3. Ei `runTransaction`ia, `collectionGroup`ia, `delete()`a. *(Edellinen arvio "76 kutsupaikkaa" oli liian pieni; todellinen laajuus ~190 `.collection/.doc`-esiintymää + libit, joille `_db` annetaan: vähintään 2 `lib/`-tiedostoa lukee `_db`:tä suoraan, lisäksi libit saavat `db`:n parametrina.)*

**Johtopäätös:** kutsupintaa on paljon mutta se on suppea (get/set/add/update/batch/where/orderBy/limit/onSnapshot + 3 FieldValue/Timestamp-apua) → compat-muotoinen **adapteri** (kääre modulaarisen SDK:n päälle) on toteutettavissa ja yksikkötestattavissa; yksittäisten kutsupaikkojen kirjoittaminen uudelleen ei ole tarpeen ensimmäisessä vaiheessa.

### 8.3 Ehdotettu PR-jako (jokainen oma PR origin/mainista, vuorotteleva A/B vanha vs. uusi; kaista Tero)

| PR | Sisältö | Koodimuutos tuotannossa? | Hyväksymisehto |
|---|---|---|---|
| **M0** (docs/selvitys) | Tämä §8 + adapterin API-spesifikaatio (täsmälleen yllä olevat kutsut + palautusmuodot: `DocumentSnapshot.exists`, `.data()`, `QuerySnapshot.docs/.empty/.size`, `onSnapshot(next,error)`, `batch().set/update/commit`) | ei | PM hyväksyy suunnitelman |
| **M1** | `lib/tm_firestore_kaare.js` (compat-muotoinen adapteri modulaarisen `firebase/firestore`-API:n päälle) + **offline-yksikkötestit** (käyttäytyminen = compat-muoto; testataan emulaattorilla tai tynkä-SDK:lla). **Ei kytketty mihinkään** | ei (kuollut koodi) | kaikki §8.2:n kutsut testattu adapterin läpi |
| **M2** | Pelaaja_v7: SDK-tagit → modulaariset ESM-importit (`app`, `app-check`, `auth`, `firestore`, `functions`; sama versio kuin nyt, `9.22.1`) → `window.TM_FB`; `_initFirebase()` käyttää `initializeApp` + `initializeAppCheck` + `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })` **ilman** `popupRedirectResolver`ia + adapteri `_db`:lle; kirjautumispolut (§8.4) ennallaan; SW-allowlist ennallaan (ESM-URLit `gstatic.com/firebasejs/` kattaa) | **kyllä (Tero)** | A/B: auth-haun alku **≥ −0,6 s** johdonmukaisesti puhelimella; interaktiivinen ≥ −0,5 s; desktop ei regressiota; kaikki §8.4 testit vihreinä |
| **M3** | Vanhempi_v2 samalla adapterilla (`_vApp = initializeApp(cfg,'tm-vanhempi')`, sama SDK-pino, `signInWithEmailAndPassword`; ei popupia/redirectiä) | kyllä (Tero) | oma A/B (`--sivut=vanhempi`) + sama testisetti |
| **M4** (valinnainen) | Adapterin purku kutsupaikoittain | kyllä | vain jos hyödyllistä |

**Ennen M2:ta (portti):** *istunnonpalautus*: nykyinen kirjautuneen pelaajan istunto pitää säilyä päivityksen yli (§8.4). Kokeet tehdään **samalla originilla** (peräkkäiset deployt samaan kanavaan) — eri esikatselukanavat ovat eri originit eikä istunto siirry niiden välillä, joten kanavien A/B ei testaa tätä.

### 8.4 Riskit ja testit (PM:n pyytämät: PIN/linkki, App Check, SW, Vanhempi)

| Riski | Miksi | Testi / vastatoimi |
|---|---|---|
| **PIN-kirjautuminen** | `pelaajaKirjaudu` (callable, `europe-west1`, App Check) → custom token → `signInWithCustomToken`; kutsutaan 3 paikasta | modulaarinen `httpsCallable(getFunctions(app,'europe-west1'),'pelaajaKirjaudu')` identtinen; PIN ei tallennu; `_authTilaSelvilla` + 15 s varakeino (`_goPin`) ennallaan. Testi: deploy-muodon selaintesti (`pelaaja_deploy_muoto_selain`-malli, oikea SDK, verkko estetty) laajennetaan: PIN-näkymä sama teksti fi/sv; staging-savutesti: PIN-kirjautuminen onnistuu, väärä PIN antaa nykyisen virheen |
| **Kutsulinkki** (`?seura=&p=`) | URL-parametrit luetaan ennen authia | ei muutu (parametrinluku ennen SDK:ta); olemassa oleva kutsulinkki-testi ajetaan modulaarisella polulla |
| **Istunnon menetys** (suurin) | Persistenssi/storage-avain: nimetty app `tm-pelaaja` → avain `firebase:authUser:<apiKey>:tm-pelaaja` IndexedDB:ssä (*SDK-selitys*: sama nimi+avain → sama tallennus compatilla ja modulaarisella). Väärä persistenssijärjestys → kaikki kirjautuvat ulos | `initializeAuth` persistence-järjestys `[indexedDBLocalPersistence, browserLocalPersistence]` (sama kuin compatin oletushierarkia ilman session-tallennusta — **vahvistettava**); **istunnonpalautustesti samalla originilla** (vanha build kirjautuu → uusi build avaa → pysyykö `currentUser`); ei julkaista ilman sitä |
| **App Check** | `initializeAppCheck` heittää jos sama appi alustetaan kahdesti; compat-versiossa `_tmAppCheckLaiska` (A1) ohittaa `provider.initialize/getToken` lykätäkseen reCAPTCHA Enterprise -latausta (~353 kt gz) | Aktivointi heti initin jälkeen ennen 1. backend-kutsua (§38, kuten nyt); **A1-laiskuus pitää portata** modulaariselle `ReCaptchaEnterpriseProvider`ille (sama `initialize/getToken`-rajapinta, *SDK-selitys* — **vahvistettava**) ja testata: lämmin avaus ei lataa reCAPTCHAa; debug-token (`self.FIREBASE_APPCHECK_DEBUG_TOKEN`) toimii stagingissa |
| **Service worker / offline** | `sw_pelaaja.js` cache-first allowlistille (`gstatic.com/firebasejs/` jo sallittu); ESM-moduulit importtaavat toisiaan suhteellisilla URL:eilla (`./firebase-app.js`) | Versio pinnattu (cache-avain vakaa); offline-avaus-testi (`pelaaja_offline`, `sw_paivitys_selain`) laajennetaan: ESM-URLit cachessa SW-asennuksen jälkeen; `type=module`-skriptien suoritusjärjestys deferattujen klassisten kanssa (*moduulit ovat deferred ja ajetaan dokumenttijärjestyksessä klassisten defer-skriptien kanssa*) testattava deploy-muodossa |
| **Adapterin vuodot** | compat-oletuksia (`snap.exists` ominaisuutena vs. modulaarinen `exists()`, `docs`, `FieldValue`, `Timestamp`) | M1:n yksikkötestit; compat-APIn tuntemattomat kutsut heittävät näkyvästi (ei hiljaista `undefined`ia, vrt. memory "älä niele virhettä") |
| **Jaetut libit** | libit ottavat `db`:n parametrina (compat-muoto) | adapteri palauttaa compat-muotoisen `db`:n → libit ennallaan |
| **Työpöytä** | hyöty vain mobiilille (§8.1) | desktop ei saa regressoida (A/B-profiili `tyopoyta`) |
| **Mittaus ≠ tuotanto** | staging debug-token → ei reCAPTCHA-latausta | tuotannon kylmä ensikäynti kuormittuu reCAPTCHA:lla (~353 kt gz, A1 lykkää ensimmäiseen backend-kutsuun) — A/B ei näytä sitä |

**Vanhempi_v2 samaa kuviota:** sama SDK-pino 9.22.1, nimetty app `tm-vanhempi`, `tmAppCheckAktivoi(_vApp)`, `signInWithEmailAndPassword` + `onAuthStateChanged`; ei popup/redirect-kirjautumista (grep) → sama adapteri ja sama gapi-hyöty puhelimella. Oma PR (M3) ja oma A/B Pelaajan jälkeen.

### 8.5 Yhteisvaikutus kattavuuden kanssa

Katso `docs/VAIHE0_PELAAJA_TTI_YHTEISSUUNNITELMA.md`: M2 (−0,7 s, mitattu gapi-A/B) ja kattavuus (K1+K2 ~−1,2 s, B −2,4 s; arvioita) eivät ole täysin additiivisia (gapi ja skriptit kilpailevat samasta kaistasta), mutta yhdessä < 5 s on realistinen vain jos kattavuuspuolelta tulee vähintään A+ ja M2, tai B.
