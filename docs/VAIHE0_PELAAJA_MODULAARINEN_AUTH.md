# Vaihe 0 — Pelaajan modulaarinen Auth ilman popupRedirectResolveria (28.11.2026, vain suunnitelma — EI koodia)

Tausta: `docs/KYLMA_AVAUS_DIAGNOOSI.md` §19.5. gapi-A/B (`ab_2026-11-26T20-26-01`, esto `apis.google.com`, reititys molemmille puolille, kirjautunut = true), **Pelaaja, puhelin, kylmä:** auth-haun alku **−781 ms** (−781 / −785 / −922), interaktiivinen **−666 ms** (−706 / −756 / −529) → merkitsevä. Pelaajan kylmä polku odottaa `apis.google.com`-latausta (compat-Authin oletuksena mukaan tuleva `popupRedirectResolver` alustaa gapi-iframen heti Authin käynnistyessä) ennen kuin `onAuthStateChanged` laukeaa. Pelaaja ei käytä popup-/redirect-kirjautumista lainkaan → resolveria ei tarvita.

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
