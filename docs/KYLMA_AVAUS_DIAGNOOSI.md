# Masterin kylmä avaus puhelimella — diagnoosi (PR B, vain diagnoosi)

Päiväys 2026-11-13 · lähtötilanne #1284 (staging, master_v2): puhelin kylmä ~13,3 s / lämmin ~5,1 s (raja 10 s). Ei muutoksia sovellukseen.
Mittaus: `scripts/kuorma/kylma_aikajana.js` (paikallinen, gzip-pakattu, Chrome 390×844, Slow 4G 1,6 Mbit/s + 150 ms, CPU 4×; `fast` = ilman verkkokuristusta). Mittaa kirjautumattoman kuoren (ennen datalukuja); kirjautumisen jälkeen `mittaa_sivut.js` (stagingissa).

## 1. Päälöydös: kylmä avaus on TAVUVETOINEN, ei CPU-vetoinen
| | kuristettu (Slow 4G, CPU 4×) | ilman verkkokuristusta (CPU 4×) |
|---|---|---|
| FCP = kirjautumisnäkymä | **8,9 s** | 0,43–0,67 s |
| siirretyt tavut | 1 562 kt (paikalliset 1 287 + ulkoiset 276) | 1 916 kt (+ reCAPTCHA 353) |
| JS compile+evaluate yht. | ~0,2–0,4 s | ~0,38 s |
| pitkät taskit | 1–3 kpl, yht. 56–293 ms, pisin 167 ms | |

Verkko on ~95 % kuoren latausajasta. Ennen interaktiivisuutta **ajetaan**: 145 synkronista `<script src>` (ei yhtään `defer`/`async`) + 200 kt (gz) sivun oma inline-skripti; ensimmäinen piirto odottaa kaikkia → FCP ≈ koko latausaika.

## 2. Tavut (gz, mitattu Chromella tai repon tiedostoista)
- HTML 242 kt, josta **inline-pääskripti 200 kt** (722 kt raakana). Ei välimuistiin (HTML revalidoidaan) → joka avauksella uudelleen, myös lämpimänä.
- 145 paikallista skriptiä yht. 1 043 kt gz. Suurimmat: harjoitelogiikka_v4 72 · tm_lang 72 · tm_eerikkila_normit 42 · tm_master_i18n 38 · tm_teknistaktiset 36 · tm_kaavio_ui 36 · tm_lib_i18n 35 · tm_teknistaktiset_sv 34 · tm_kehitystyopoyta 22 · testit_indeksit 20.
- Ulkoiset: Firebase compat-SDK:t 9.22.1 (firestore 99, auth 37, storage 13, app 10, app-check 8, functions 3 kt), Sentry 30 kt (synkroninen), 2 fonttia 74 kt (Google Fonts), **reCAPTCHA Enterprise 353 kt**.

## 3. reCAPTCHA (A1 — päätetty tehdä erikseen, EI toteutettu täällä)
`enterprise.js` (1 kt) → `recaptcha__fi.js` **353 kt** (18 % kaikista kylmän avauksen tavuista) + anchor-iframe + evaluate ~0,2 s (CPU 4×). Gate: App Check -token tarvitaan ennen ensimmäistä Firestore/Functions-kutsua → kriittisellä polulla. Arvio puhelinprofiililla: 353 kt ÷ 1,6 Mbit/s ≈ **1,8 s** + ~0,2 s evaluate ≈ **~2 s**. (Malli; vahvista stagingissa A/B-ajolla.)

## 4. Ehdotus: mitä ladataan laiskasti (säästö = gz-kt × ~5 ms/kt @ 1,6 Mbit/s + evaluate)
| # | Osa | gz kt | Säästö | Ehto / riski |
|---|---|---|---|---|
| L1 | sv/en-kielipaketit: tm_lang:n sv+en-osuus (~48), tm_master_i18n 38, tm_lib_i18n 35, tm_teknistaktiset_sv 34 | ~155 | **~0,8 s** | Ladataan vain kun tallennettu kieli ≠ fi, ENNEN ensirenderiä (masterT on synkroninen). Kielen vaihto → lataa + renderöi. Keskisuuri riski, hyvä testattavuus (render-gate-testit olemassa). |
| L2 | Tab-/data-lib: tm_eerikkila_normit 42, testit_indeksit 20, tm_teknistaktiset 36, tm_kehityskaari 16, tm-microcycles 16 | ~130 | **~0,65 s** | Ladataan kun Testit/profiili/kehityskaari-näkymä avataan. Tarkistettava jokaisen globaalin ensikäyttö (jotkut renderöityvät Kotiin). |
| L3 | Taktiikkataulun kaaviokoodi: tm_kaavio_ui 36, tm_kaavio_editori 7, tm_xt 6 | ~49 | **~0,25 s** | Vain jos taulu avautuu vain modaalin/iframen kautta (K1b/7); tarkista suora käyttö. |
| L4 | harjoitelogiikka_v4 | 72 | **~0,36 s** | Tarkista, mikä Master-näkymä sitä tarvitsee avauksessa (3 viitettä). |
| L5 | Kolmannet osapuolet: Sentry 30 (synkroninen → `async` kirjautumisen jälkeen), firebase-storage 13 + functions 3 (ensikäytöllä) | ~46 | **~0,25 s** | Sentryn virhekeruu alkaa hieman myöhemmin. |
| L6 | Inline-pääskripti ulos versioituun tiedostoon (`?v` = sisältötiiviste deployssa, QG-2) | 200 (lämmin) | **~1,0 s lämpimänä**, kylmänä 0 | Cache + V8 code cache. Iso mekaaninen muutos (Master-HTML = Teron kaista); pariksi `defer`-kuori → FCP ~1 s. |

L1–L5 yhteensä **~2,3 s** (kylmä). L6 vaikuttaa lämpimään (5,1 → ~4 s) ja FCP:hen, ei kylmään TTI:hin.

## 5. Mitä tämä tarkoittaa 10 s rajalle
13,3 s − 2,3 s (L1–L5) = **~11,0 s** → raja EI alitu pelkällä laiskalatauksella. 11,0 − ~2 s (reCAPTCHA, A1) = **~9 s** → alittuu. PR A:n lukujen vähennys (547 → ~175) tuo lisäksi lukuaaltojen pituutta; sen sekuntivaikutusta ei ole mitattu. Suositus: A1 + L1 + L5 ensin (suurin säästö/riski), sitten L2–L4 yksi kerrallaan, L6 erikseen.

## 6. Rajaukset / avoimet
- Mittaus on kirjautumaton kuori; kirjautumisen jälkeinen renderöinti (400+ pelaajaa, Koti) ei mukana → TTI-vaikutus todennettava `mittaa_sivut.js`:llä stagingissa jokaisen L-osan jälkeen.
- Säästöt ovat mallilaskentaa (5 ms/kt), eivät mitattuja muutoksen jälkeen.
- Ulkoisten SDK:iden versiopäivitys/modulaarinen SDK (firestore 99 kt) on oma, isompi aihe — ei ehdotettu tässä.

## 7. A1 + Kehitystyöpöydän "lämmin = kylmä" (14.11.2026, PR perf/a1-appcheck-laiska)

### 7.1 Miksi Kehitystyöpöydän lämmin avaus = kylmä (~10 s / ~10 s) — MITTARIVIKA
`mittaa_sivut.js` avaa lämpimän avauksen samalla URL:lla kuin kylmän (`page.goto(url)` samassa sivussa). Kehitystyöpöydän URL sisältää hashin (`…Kehitystyopoyta.html#pelaaja/<id>/tanaan`); identtinen URL + fragmentti on selaimelle **same-document-navigointi**: sivua ei ladata uudelleen. Todennettu Chromella: `performance.timeOrigin` ei muutu toisessa `goto`ssa (ilman hashia muuttuu). Silloin lämmin "avaus" luki ensimmäisen dokumentin `__tmM`-mittarit → sama luku. Masterilla (ei hashia) lämmin on oikea uudelleenlataus, siksi 3× ero.
Korjaus: lämmin avaus käyttää `uusiDokumentti: true` → `about:blank` ensin, sitten URL (HTTP-välimuisti säilyy). Testi `tests/kuorma_mittaus_selain.test.js` (HTML-lataukset 1 → 1 vanhalla tavalla, → 2 uudella). **Todellista lämmintä Kehitystyöpöydän lukua ei vielä tunneta** — mitattava uudelleen korjatulla mittarilla. Cache-otsakkeet, SW-allowlist ja ?v-tiivisteet eivät olleet selitys (ei ollut mitä selittää: dokumenttia ei ladattu).

### 7.2 A1 — reCAPTCHA ei saa kuormittaa lämmintä avausta
Vika koodissa: `ReCaptchaEnterpriseProvider.initialize()` lataa reCAPTCHA-skriptin (~353 kt) **heti `activate()`ssa**, vaikka IndexedDB:ssä olisi voimassa oleva App Check -token (SDK lukee tokenin, mutta skripti ladataan silti). Lämpimässä avauksessa skripti on turha.
Ratkaisu (`lib/tm_appcheck.js`, yksi paikka): provider-instanssin `initialize` siirretään ensimmäiseen `provider.getToken()`-kutsuun. SDK kutsuu sitä vain kun voimassa olevaa tokenia ei ole tai proaktiivinen uusinta erääntyy (SDK: 50 % TTL + 5 min). Aktivoinnin jälkeen `getToken(false)`-esihaku lukee välimuistin tai, jos tokenia ei ole, käynnistää reCAPTCHAn heti (kylmä = sama aloitushetki kuin ennen) ja kirjoittaa konsoliin `[AppCheck] tokenia ei saatu …` jos tokenia ei saada (ENFORCE hylkäisi kutsut). Kääre ei keksi tokenia eikä ohita `getToken`ia; ENFORCE ei muutu. Jos providerin sisäinen rajapinta puuttuu → eager-varapolku + varoitus.
Todennus: `tests/appcheck_laiska.test.js` (yksikkö) ja `tests/appcheck_laiska_selain.test.js` (oikea SDK Chromessa: voimassa oleva token → 0 reCAPTCHA-pyyntöä; ei tokenia → ladataan; kääreetön vertailu lataa myös tokenin kanssa).
**Vaikutus riippuu TTL:stä:** SDK uusii tokenin 50 % TTL:n jälkeen. Oletus-TTL 1 h → uusinta ~35 min kohdalla → lämmin avaus > 35 min tauon jälkeen lataa reCAPTCHAn joka tapauksessa. **TTL 24 h (päätös 12.11.) on Consolen asetus (App Check → Apps → reCAPTCHA Enterprise → Token TTL), ei koodia — Teron toimenpide**; vasta sen jälkeen lämmin hyöty ulottuu yli ~12 h.
**Stagingin mittausvinkki:** staging käyttää debug-tokenia (SDK ei kutsu silloin providerin `getToken`ia) → reCAPTCHAa ei ladata lainkaan; mittaus näyttää siis ylärajan lämpimän hyödyn, ei tuotannon kylmää ensikäyntiä.
