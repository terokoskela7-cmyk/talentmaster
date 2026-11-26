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

## 8. Mittausmenetelmä: ennen/jälkeen-vertailu AINA vuorottelevalla A/B:llä (17.11.2026)

**Sääntö.** Suorituskykymuutoksen vaikutus todennetaan `scripts/kuorma/ab_vuorotellen.js`:llä: **A = main → esikatselukanava `kuorma`, B = muutos (PR-haara) → `kuorma-b`**, mitattuna samalla koneella samassa ikkunassa, järjestys vuorotellen (AB/BA/AB). Eri päivinä tai eri kellonaikoina tehtyjä yksittäisiä mittauksia **ei verrata keskenään** — staging-ympäristön vuorokausivaihtelu on suurempi kuin tyypillinen muutos.

Ajo (token vain ympäristömuuttujasta; Tero ajaa `! node`):
```
STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/ab_vuorotellen.js \
  --a=https://talentmaster-staging--kuorma-<tunniste>.web.app --b=https://talentmaster-staging--kuorma-b-<tunniste>.web.app \
  --kierrokset=3 --sivut=master --profiilit=tyopoyta --toistot=3
```
Deploy: `deploy-staging.yml`, hosting + kanava `kuorma` (main) ja `kuorma-b` (PR-haara). Tulkinta: muutos on syy vain jos B−A on samaa suuntaa myös kierroksilla, joilla järjestys on käännetty; ~0 tai vaihtuva suunta = kohinaa/ajankohtaa. Tulos: `mittaus_tulokset/ab_<aika>/yhteenveto.json`.

### 8.1 Esimerkkitapaus 15.–17.11.2026: näennäinen +2 s "regressio" oli ajankohta
- 15.11. vertailtiin A1:tä (#1293) mainiin yksittäisillä ajoilla eri kellonaikoina (a_main 11:16 vs c_ilman_a1 20:22 UTC): A1 näytti hidastavan noin 2 s. #1293 revertattiin varmuuden vuoksi (5cfe1501).
- 17.11. A/B-ajo (`ab_2026-11-17T18-13-33`, 3 kierrosta AB/BA/AB): B−A-erot kohinaa — kylmä A 2,6 s / B 2,4 s, lämmin 1,96 / 1,93 s. A1 ei hidasta ja säästää 0,36 MB.
- Johtopäätös: aiempi "regressio" oli staging-ympäristön vuorokausivaihtelua, ei muutosta. Opetus: yksittäinen eri-päivän vertailu antoi väärän syyn ja aiheutti turhan revertin.

## 9. L4/L5-esidiagnoosi: mitä ladataan ENNEN kuin auth käynnistyy (18.11.2026, vain diagnoosi — ei toteutusta)

Lähtö: L3 (#1303) mergetty; A/B 17.11. (`ab_2026-11-17T20-00-03`) puhelin kylmä −0,34 s (3/3 kierrosta samaan suuntaan), ei regressiota. Havainto: puhelimella auth-haun alku ~7,4 s, FCP ~9,3 s; työpöydällä 0,25 / 1,9 s.

**Mittaus ja sen rajat.** Paikallinen, gzip-pakattu palvelin, Chrome 390×844, Slow 4G 1,6 Mbit/s + 150 ms, CPU 4× (sama profiili kuin `kylma_aikajana.js`), main `d22521d4`. 2 kuristettua + 2 kuristamatonta ajoa; init-hetki = `firebase.initializeApp`-kutsun `performance.now()`. Ulkoiset (gstatic, reCAPTCHA) haettiin oikeasti verkosta. Luvut ovat **malli, eivät staging-A/B-mittaus** — jokainen muutos todennetaan `ab_vuorotellen.js`:llä (§8). Kertaluonteinen mittausskripti ei ole repossa; L4-PR lisää `kylma_aikajana.js`:ään `init_ms`-kentän ja skriptikohtaisen vesiputouksen.

### 9.1 Päälöydös: auth käynnistyy vasta kun KAIKKI 138 skriptiä on haettu ja ajettu
| | kuristettu | kuristamaton |
|---|---|---|
| `initializeApp` (= auth/App Check alkaa) | **7,10–7,16 s** | 0,31 s |
| FCP | 7,2–7,3 s | 0,44 s |
| skriptejä + HTML ennen initiä | 138 kpl, **1 171 kt gz** | — |
| aika per kt ennen initiä | **~6,1 ms/kt** (siirto ~5,1 + RTT/CPU) | |
| JS compile+evaluate yht. (CPU 4×) | ~360 ms, josta reCAPTCHA 201, inline-pääskripti 81, Firebase Auth 23 | |

Verkko on ~98 % ajasta (CPU ~0,36 s). Rakenne: `<head>` + body sisältää 126 synkronista `<script src>` (117 `lib/`), Sentry, kuusi Firebase-SDK:ta ja **yhden 239 kt (gz) inline-pääskriptin (rivit 2172–11673)**, joka on dokumentin viimeinen skripti. `firebase.initializeApp` + `tmAppCheckAktivoi()` + `firebase.auth()` + `onAuthStateChanged` ovat sen rivejä 2186–2372, joten ne odottavat (a) kaikkia edeltäviä skriptejä ja (b) koko HTML:n latausta. reCAPTCHA (353 kt) alkaa vasta initistä ja valmistuu ~9,5 s kohdalla (kylmä; vastaa havaittua FCP ~9,3 s — yhteys on havainto, ei todistettu).

Tavuryhmät ennen initiä: paikalliset lib-skriptit 730 kt (129 kpl) · Firebase-SDK:t 522 kt (7) · HTML/inline-pääskripti 239 kt · Sentry 32 kt (2).

### 9.2 Top 15 koon mukaan (gz kt; "valmis" = siirto valmis ms navigoinnin alusta, jaettu kaista; CPU = compile+evaluate ms @ 4×)
| # | Skripti | gz kt | ≈ aika (kt × 5,1 ms) | valmis | CPU |
|---|---|---|---|---|---|
| 1 | reCAPTCHA `recaptcha__fi.js` (initin JÄLKEEN, vain kylmä) | 352 | 1,8 s | 9 479 | 201 |
| 2 | `TalentMaster_Master_v16.html` (inline-pääskripti) | 239 | 1,2 s | 4 949 | 81 |
| 3 | firebase-firestore-compat | 99 | 0,5 s | 3 388 | 8 |
| 4 | `lib/tm_lang.js` | 73 | 0,37 s | 3 246 | 9 |
| 5 | firebase-auth-compat | 37 | 0,19 s | 1 895 | 23 |
| 6 | `lib/tm_kaavio_ui.js` | 37 | 0,19 s | 3 995 | 0 |
| 7 | Sentry `bundle.min.js` | 30 | 0,15 s | 1 649 | 2 |
| 8 | `lib/tm_kehitystyopoyta.js` | 22 | 0,11 s | 6 567 | 0 |
| 9 | `lib/tm_sisainen.js` | 15 | 0,08 s | 5 436 | 0 |
| 10 | `lib/tm_naytto_lohkot.js` | 15 | 0,08 s | 4 281 | 0 |
| 11 | `lib/tm_mediaviesti.js` | 14,5 | 0,07 s | 1 535 | 0 |
| 12 | `lib/tm_idp.js` | 13,5 | 0,07 s | 3 696 | 1 |
| 13 | firebase-storage-compat | 13 | 0,07 s | 1 018 | 1 |
| 14 | `lib/tm_tukitavoitteet.js` | 13 | 0,07 s | 4 694 | 0 |
| 15 | `lib/tm_aloita_jakso.js` | 12 | 0,06 s | 5 038 | 0 |

Huom: skriptikohtainen kesto ei ole additiivinen (kaista jaetaan, selain hakee rinnan) — oikea hinta on kt × ~5–6 ms/kt. CPU-sarake osoittaa, että yksikään lib ei ole CPU-ongelma; vain tavut ratkaisevat. L1–L3 jo laiskat (`text/plain`) eivät ole listalla.

### 9.3 Mikä auth-polulla OIKEASTI tarvitaan
- **Auth + App Check -käynnistys:** firebase-app 9,6 + app-check 7,7 + auth 37,3 + `tm_appcheck` 3,5 = **~58 kt**; `onAuthStateChanged`-callback tarvitsee lisäksi `tmKieliPaketit` (2,3), `TM_ISTUNTO` (2,6) ja `masterT` (`tm_lang` 73) = **~135 kt** → malli ~0,8 s siirto vs. nyt 1 171 kt / 7,1 s.
- **Ensimmäinen Koti-piirto (kirjautunut):** lisäksi Firestore-SDK 99 + pääskripti 239 + kirjastot, joita Koti kutsuu. **Demo-käynnistyksen funktiokattavuus** (Chrome precise coverage, `loginDemo()`, Koti piirtyi): **22/130 lib-skriptiä (168 kt, josta tm_lang 73) kutsuttiin; 108 skriptiä / 564 kt ei kutsuttu lainkaan** (suurimmat: tm_kaavio_ui 37, tm_kehitystyopoyta 22, tm_sisainen 15, tm_mediaviesti 14,5, tm_idp 13,5, tm_tukitavoitteet 13, tm_aloita_jakso 12). Rajaus: demo ≠ oikea tili (rooli, data, välilehdet) → **yläraja** siirrettävälle; todellinen "käytössä bootissa" -lista kerätään vaiheessa 0 (alla).
- **Inline-pääskriptin top-level-riippuvuudet libeihin** (AST-ajo, suorittuvat synkronisesti latauksessa): vain `firebase`, `tmAppCheckAktivoi` (rivi 2186–2189), `masterT` (7413, `_OHJ_PHV_NIMI`), `tmReflektio.mount` (9316), `window.TM_KEHITYSTYOPOYTA` (6832), `window.TM_NAYTTO_LOHKOT.D3_DIMS` (10984). Muu lib-käyttö on funktioiden sisällä (kutsuhetkellä). Toiseen suuntaan: libit eivät voi riippua pääskriptistä latausaikana (ne ladataan ennen sitä). Tämä tekee vaiheistuksesta mahdollisen: kuusi kohtaa pitää tehdä laiskoiksi tai siirtää.

### 9.4 Ehdotettu rakenne (vaiheittain, jokainen oma PR, jokainen A/B:llä)
**Vaihe 0 — mittaus (ei sovelluskoodia):** (a) `kylma_aikajana.js`: `init_ms` + vesiputous; (b) "ensikäyttö"-keruu stagingissa oikeilla rooleilla (esim. coverage-ajo tai kevyt ensikäyttö-laskuri stagingissa kirjautuneena valmentaja/VP/pelaaja-tileillä) → todellinen boot-lista; (c) vartijatesti: inline-pääskriptin top-level-lib-viitteet (yllä oleva AST-ajo) = tunnettu lista, uusi viite hälyttää.

**Vaihe 1 — pääskripti ulos (= L6) + `defer`:** inline 239 kt → `tm_master_main.js` (`<script src defer>`, viimeisenä; `?v` tulee `versiotiiviste.js`:stä automaattisesti, joten QG-2 ei vaadi mitään; Masterilla ei ole service workeria → SW-allowlist ei koske, mutta tarkista `sw_*.js`-allowlistit ettei mikään nimeä Masteria). Pääskripti on jo dokumentin viimeinen eikä sen jälkeen ole DOM:ia → `defer` on DOM-ekvivalentti. Hyöty: **lämmin −~1,2 s** (HTML 239 → ~12 kt; V8 code cache), kylmä ~0. Pienin riski; tämä on järkevä ensimmäinen PR.

**Vaihe 2 — `<head>` ei-blokkaavaksi:** kolme välissä olevaa inline-lohkoa (rivit 90–138 `TM_KAAVIO_HOST`, 235–239 `__TM_SEURA`, 241–255 `_lataaDemoScript`) → pieniin ulkoisiin `defer`-tiedostoihin samoihin kohtiin (inline ei voi `defer`ata; järjestys "ennen tm_kaavio_ui / ennen tm-bus" säilyy). Sitten kaikki `lib/`-skriptit + SDK:t `defer`. Dokumentin järjestys säilyy → suoritusjärjestys säilyy. Hyöty: **FCP (kirjautumisnäkymä) ~7,2 s → ~1,5–2,5 s** (HTML + fonttiCSS, malli), mutta init ei vielä aikaistu (pääskripti ajetaan edelleen viimeisenä). Käyttäjä näkee kirjautumisen aiemmin → **onclick-ikkuna** (alla).

**Vaihe 3 — boot-skripti ensin (varsinainen auth-ensin):** `tm_boot.js` (`defer`, heti firebase-app/app-check/auth + `tm_appcheck` + `tm_istunto` + `tm_kieli_paketit` jälkeen): `_FB`, `initializeApp`, `tmAppCheckAktivoi()`, `_auth`; pääskriptiin jää `onAuthStateChanged`-rekisteröinti ja `_db = firebase.firestore()` (const-nimet säilyvät globaaleina lexical-scopessa skriptien välillä → `typeof _db` -vartijat toimivat). Firebase kutsuu uuden kuuntelijan heti nykyisellä tilalla → tapahtumaa ei menetä. Resurssiprioriteetti: boot-ketju `fetchpriority="high"` + `<link rel="preload">`, muut `low`. Hyöty: **init 7,1 s → ~1,5–2 s**; reCAPTCHA:n RTT-ketju (enterprise.js → recaptcha__fi.js → anchor → token, ~0,6–0,8 s tyhjäkäyntiä) menee päällekkäin kirjastojen haun kanssa.

**Vaihe 4 — lib-paketti 2 boottiin ei-kriittisenä (L4/L5-laajennus):** ne ~108 skriptiä, joita ensipiirto ei kutsu, ladataan olemassa olevalla `tmLaiska`-ketjulla (a) ensipiirron JÄLKEEN idle-hetkellä tai (b) portin kautta (`data-portit`). Tämä on olemassa oleva L2/L3-mekanismi (typeof-vartio + `_paivitaKaikkiNakymat` + ReferenceError-itseparanus), mutta se vaatii: kuusi top-level-kohtaa (9.3) laiskoiksi (`_OHJ_PHV_NIMI` getteriksi, `tmReflektio.mount` + `_ktHk` + `_D3_DIMS` kutsuhetkelle). L4 = `harjoitelogiikka_v4` oli jo L3; L5 = Sentry `async` + storage/functions ensikäytöllä (46 kt, ~0,25 s).

### 9.5 Säästöarvio puhelimella (kylmä, malli ~5–6 ms/kt; vahvistettava A/B:llä)
| Vaihe | Vaikutus | Arvio |
|---|---|---|
| 1 pääskripti ulos | lämmin | −1,2 s (kylmä ~0) |
| 2 `defer` + inline-lohkot ulos | FCP (login) | 7,2 → ~2 s; TTI ei muutu |
| 3 boot ensin | init-hetki | 7,1 → ~2 s; reCAPTCHA-RTT päällekkäin ≈ −0,6 s |
| 4 paketti 2 jälkeen | ensipiirron tavut | ≤ 564 kt ≈ ≤ 2,9 s (yläraja); **realistinen 50–70 % = 1,5–2,0 s** + L5 0,25 s |
| **Yhteensä kylmä TTI** | | **~2,3–3 s** (vaihe 3+4), + FCP-parannus vaiheesta 2 |

Tämä on sama suuruusluokka kuin §5:n L1–L5 (2,3 s) — vaiheet 3–4 ovat käytännössä niiden loppuosa; **uutta on että auth/App Check/reCAPTCHA siirtyvät kriittiseltä polulta rinnakkaiseksi** ja FCP irtoaa TTI:stä. Pelkkä uudelleenjärjestys ei vähennä tavuja (kaista on pullonkaula): säästö syntyy vain siitä, mitä ei haeta ennen ensipiirtoa, ja tyhjäkäyntien (RTT-ketjut) päällekkäistämisestä.

### 9.6 Riskit ja huomioitavat riippuvuudet
1. **App Check -järjestys:** `tmAppCheckAktivoi()` on ajettava initin jälkeen ja ENNEN ensimmäistä Firestore/Functions/Storage-kutsua. Vaiheessa 3 se pysyy `tm_boot.js`:ssä heti initin perässä; `_db`/Firestore-kutsut ovat pääskriptissä, joka ajetaan myöhemmin → järjestys vain vahvistuu. Älä jaa App Check -aktivointia kahteen paikkaan. A1:n laiska `initialize` (§7.2) säilyy sellaisenaan.
2. **onclick-handlerit (§7.17), 245 inline `on*`-attribuuttia + generoidut merkkijonot:** kutsuvat `window.fn`-funktioita. Vaiheissa 2–3 kirjautumisnäkymä on interaktiivinen ennen pääskriptiä → kirjautumisnapit (`login`, `kirjauduGooglella`, `_unohditSalasana`, `loginDemo`) voivat tuottaa ReferenceErrorin. Ratkaisu: napit `disabled` kunnes `window.__tmMainValmis` (ms-luokkaa vaiheessa 2, lib-kaistalla vaiheessa 3) TAI hyvin pieni jonotus-tynkä `tm_boot.js`:ssä (`window.login = (...a) => jono.push(['login', a])`, korvataan pääskriptissä + toistetaan). Myöhemmin ladattavien pakettien funktioille: `tmLaiska`-portit (olemassa), ei per-lib-tynkiä.
3. **IIFE-/lataus-järjestys:** `tm_kaavio_ui` vaatii `TM_KAAVIO_HOST`:in ennen itseään; `tm-bus` vaatii `__TM_SEURA`:n; Sentry ennen Firebase-SDK:ta (kommentti rivillä 40). `defer` säilyttää dokumenttijärjestyksen, mutta inline-lohkojen siirto ulos on pakollinen (ks. vaihe 2) — muuten ne ajettaisiin ennen deferattuja libejä.
4. **`_paivitaKaikkiNakymat` ei piirrä Polkua/Kehitystyöpöytää uudelleen** (renderit: koti, havainnot, inbox, pulse, dev, today, coachSelf, testit, cal, season) → laiskasti ladatun kirjaston jälkeen Polku jää vanhaksi (ks. §10 — jo nyt todellinen löydös). Vaiheeseen 4 kuuluu `_ktPaivita()` mukaan uudelleenpiirtoon.
5. **QG-2 / SW:** `versiotiiviste.js` lisää `?v` jokaiseen paikalliseen `<script src>`:hen ja `data-tm-laiska`-tagiin → uusi `tm_master_main.js`, `tm_boot.js` ja asetustiedostot saavat tiivisteen automaattisesti. Masterilla ei ole SW:tä; Pelaaja/Vanhempi/ADAR-SW:ien cachenimi lasketaan omasta kuorisivusta → ei kosketa niitä, jos muutos rajataan Masteriin. Vaiheen 1 PR:ssä lisätään testi: pääskripti-tiedosto saa `?v` deployssa.
6. **Testit:** olemassa olevat testit lukevat Master-HTML:n inline-skriptiä (`masterSivu()` vm-ajo, render-gate-skannerit, i18n-testit) → ne on ajettava uuden tiedoston yli (vaihe 1 laajentaa lukijan; HTML-muutokselle myös `npm run lint` + live-selain `typeof`-tarkistus, koska `npx eslint` yksittäistiedostolle ei nappaa inline-parse-virhettä).
7. **Sentry** `async` myöhästyttää virhekeruun alkua (L5); `window.onerror`-puskuri `tm_sentry.js`:ssä jos halutaan ensisekunnit mukaan.

### 9.7 Suositus
Vaihe 0 → 1 (L6, pieni, lämmin −1,2 s, avaa mahdollisuuden 2–4) → 2 → 3 → 4, kukin A/B:llä (`ab_vuorotellen.js`, §8). Älä tee 3:a ennen 2:ta (ilman `defer`-kuorta boot-skripti ei aikaista mitään). Päätös Terolle/PM:lle: vaihe 4:n boot-lista kerätään oikeilla rooleilla (vaihe 0b) ennen kuin mitään lib-skriptiä siirretään pois synkroniselta polulta.

## 10. Resepti-lohko (`lib/tm_naytto_lohkot.js`, `_reseptiHtml`) — kuollutta koodia vai ei? (18.11.2026, korjattu PM-tarkistuksen jälkeen)

**Johtopäätös: EI kuollutta koodia — ei poisteta. Ei L3-regressiota.** (Ensimmäinen versio tästä osiosta väitti L3:n piilottaneen Reseptin Polusta; se oli väärin: sekoitin Masterin vanhan näkymän ja uuden Kehitystyöpöytä-sivun. PM tarkisti 18.11. klo 00.25: Resepti toimii tuotannossa L3:n jälkeen.)

**Käyttäjät:**
| Paikka | Näkymä | Resepti |
|---|---|---|
| `TalentMaster_Master_v16.html` `_ktPolkuHTML` (rivi 6844–6847) ja `_renderPinfoFirestore` (8646) | **vanha Master-näkymä: Tänään · Polku · Näyttö** | näkyy (tarkistettu tuotannossa, KPV-testipelaaja, Polku, sivun uudelleenlataus) |
| `TalentMaster_Kehitystyopoyta.html` (valmentaja_v2: Tänään · Polku · Profiili) | uusi näkymä | **ei koskaan** — sivu lataa libin mutta kutsuu vain `tmNayttoDevIkaSp`, `D3_DIMS`, `tmNayttoTtApu`, `ttItems`; ei `tmNayttoOsat`ia (rivin 607 kommentti) |

**Ehdot (`tm_naytto_lohkot.js:327–331`):** `typeof valitsePaivanHarjoite === 'function'` (L3: laiska kirjasto; latautuu ensimmäisellä `tmLaiska`-portilla, jonka jälkeen näkymät piirtyvät uudelleen) · `laskeTekninenKehityskohde(p).lahde !== 'oletus'` (TKI/SM/H-H-dataa) · `!c.vainNaytto`. Pieni huomio: `_paivitaKaikkiNakymat` ei piirrä `_kt*`-Polkua uudelleen kirjastolatauksen jälkeen, joten ensimmäinen Polku-piirto ennen yhtään porttia voi olla ilman Reseptiä; käytännössä portti laukeaa ennen kuin Polkuun mennään, eikä tämä ole havaittu ongelma.

**Testikattavuus:** `tests/v4b1_naytto.test.js:53–56` käyttää `_mPinfoOsat`-tynkää → ei kata oikeaa `tmNayttoOsat` + laiska-kirjasto -ketjua. Ei kiireellistä.

**Mistä Resepti valitaan ja miksi se voi poiketa jaksofokuksesta:** ks. `docs/PAIVAN_HARJOITE_LAHTEET.md`.

## 11. Vaihe 1 toteutettu: pääskripti ulos DEPLOYSSA (18.11.2026, PR perf/l6-master-paaskripti-ulos)

**Toteutus.** `scripts/versiotiiviste.js` irrottaa Masterin viimeisen ison inline-skriptin julkaisussa tiedostoon `tm_master_main.js` ja korvaa sen `<script src="tm_master_main.js?v=<tiiviste>" defer>`. Repossa lähde pysyy inline: 227 testiä skannaa Master-HTML:n lähdettä (lähdetason jako vaatisi niiden siirron `kuoren_lahde.js`:n `lueKuori()`-polulle kuten Seura S1–S4 — oma, isompi sarja). Sama periaate kuin `?v`: repo ei sisällä deploy-artefaktia. Kaikki neljä deploy-polkua (Pages, Hosting live, savutesti-kanava, staging/kuorma/kuorma-b) ajavat jo `versiotiiviste.js --kirjoita`; staging-konfiguraatio korvataan ENNEN sitä, joten irrotettu tiedosto sisältää stagingin Firebase-asetukset. Tulos: HTML 239 → 38 kt gz, `tm_master_main.js` 202,5 kt gz.

**Vartijat.** `tests/l6_paaskripti_ulos.test.js`: irrotus tavu tavulta palautettavissa alkuperäiseksi; `?v` = tiedoston tiiviste; js kääntyy; idempotentti (toinen ajo ei muuta); repo ennallaan. `tests/l6_paaskripti_ulos_selain.test.js` (Chrome): sama harness ajetaan inline- ja deploy-muodolla → samat globaalit, probe ok, samat sivuvirheet.

**DOM-ekvivalenssi.** Skripti on dokumentin viimeinen (ei DOM:ia sen jälkeen); `defer` ajaa sen jäsennyksen jälkeen ennen `DOMContentLoaded`ia ja kaikkien synkronisten skriptien jälkeen — sama järjestys kuin ennen. CSP sallii (`script-src 'self'`).

**Odotus A/B:lle (rehellinen).** Kylmä puhelin: **~0** — kaikki synkroniset libit ajetaan edelleen ennen pääskriptiä ja tavut ovat samat. Lämmin: aiempi arvio −1,2 s (§4 L6) oletti, että HTML ladataan kokonaan joka avauksella. Hosting palvelee HTML:n `no-cache` + ETagilla → muuttumaton HTML = 304; koko 239 kt ladataan vain kun jokin `?v` (mikä tahansa lib) on muuttunut deployssa. Hyöty = (a) deployn jälkeinen ensiavaus hakee 38 kt eikä 239 kt silloin kun pääskripti ei muuttunut, (b) pääskripti on V8 code cache -kelpoinen (inline-skripti ei ole). Odota lämpimässä pientä (~0,1–0,3 s) hyötyä ja A/B:ssä lähes kohinaa; **isompi arvo on se, että vaihe 2 (`defer` kaikille) on nyt mahdollinen**. Mittaus: §8-komento (`--sivut=master --profiilit=tyopoyta`), A = main (`kuorma`), B = tämä PR (`kuorma-b`).

## 12. Vaihe 2 toteutettu: kaikki skriptit `defer`, head-lohkot ulos, kirjautumisnapit tynkinä (21.11.2026, PR perf/master-kylma-avaus-v2)

**Toteutus (deploy-muunnos, repo ennallaan — sama periaate kuin §11).** `scripts/versiotiiviste.js` (`LYKKAYS`, `lykkaaSivu`, `lisaaDefer`) tekee Masterille julkaisussa:
1. **Kaikki ajettavat `<script src>` → `defer`** (139 kpl; `type="text/plain"`-laiskatagit ennallaan). Dokumenttijärjestys säilyy → suoritusjärjestys säilyy; DOMContentLoaded odottaa deferattuja kuten ennenkin.
2. **Head-lohkot ulos** → `tm_master_alku.js` (defer, ensimmäisen lohkon paikalle): taktiikkataulun host-adapteri (`TM_KAAVIO_HOST`), `__TM_SEURA`, `_lataaDemoScript`. Kaikki ovat lib-riippumattomia latausaikana (host lukee globaalit vasta kutsuhetkellä), joten "ennen tm_kaavio_ui / ennen tm-bus" säilyy. `tm-demo.js`-viite saa `?v`:n myös alku-tiedostossa. Neljä pientä inline-lohkoa jää tarkoituksella (versiotarkistus, `tm-auth-odottaa`-luokka, `tm-upotettu`-luokka, `TM_SENTRY`-asetus): ne ovat ensimmäistä maalausta varten tai asetuksia, eivät lib-kutsuja.
3. **Kirjautumisnapit:** inline-lohko asettaa luokan `tm-main-odottaa` (napit `pointer-events:none`) ja no-op-tynkät `login`, `kirjauduGooglella`, `loginDemo`, `_unohditSalasana`. Pääskripti poistaa luokan heti `'use strict'`-rivin jälkeen: funktiodeklaraatiot on silloin jo nostettu eikä tapahtumia ehdi väliin, joten tynkä korvautuu oikeilla funktioilla (selaintesti todentaa: ennen pääskriptiä tynkä, sen jälkeen `async function`).
4. **App Check -järjestys säilyy:** `firebase.initializeApp` → `tmAppCheckAktivoi()` → ensimmäinen Firestore/Functions/Storage-kutsu ovat edelleen pääskriptin alussa; `tm_appcheck.js` ja SDK:t (app → app-check → auth) ovat sitä ennen. Vartija `tests/l6_defer.test.js`.
5. **QG-2 / CSP / SW:** uusi tiedosto saa `?v`:n sisällöstä (kaikki deploy-polut ajavat `versiotiiviste.js --kirjoita`); Hosting-CSP `script-src 'self' 'unsafe-inline'` sallii omat tiedostot ja inline-lohkot; `firebase.json ignore` ei estä juuritiedostoja; yksikään SW ei nimeä Masterin tiedostoja. `tarkistaJulkaisu` tarkistaa myös alku-tiedoston dynaamiset lataukset.

**Päälöydös mittauksessa: pelkkä `defer` ei riitä FCP:hen.** K1b piilottaa kirjautumislomakkeen (`html.tm-auth-odottaa #sLogin{display:none}`) kunnes istunnon tila on selvillä, ja odotustilan spinneri on `body::after` ilman tekstiä → **ei laske FCP:ksi**. Siksi ennen tätä PR:ää FCP = kirjautumisen näkymisen hetki = auth-vastaus (§9.1). Korjaus: odotustilassa piirtyy sanamerkki (`html.tm-auth-odottaa body::before{content:"TalentMaster™"}`, tekstinä → FCP). **K1b säilyy** (lomaketta ei näytetä ennen kuin istunto tiedetään; kirjautunut käyttäjä ei näe kirjautumisvilausta). Kirjautumislomakkeen aikaistaminen vaatisi K1b:n päätöksen uudelleenavausta tai vaihetta 3 (auth/init aikaisemmaksi).

**Paikallinen malli (`kylma_aikajana.js`, gzip-palvelin, ei stagingia; yksi ajo/kohta → EI A/B-todiste):**
| | puhelin (Slow 4G, CPU 4×) FCP | puhelin init_ms | työpöytä FCP | työpöytä init_ms |
|---|---|---|---|---|
| repo (sync, main) | 7 184 | 7 209 | 208 | 168 |
| deploy-muoto (tämä PR) | **440** | 7 659 | **88** | 176 |

`init_ms` (firebase.initializeApp) EI parane tässä vaiheessa (puhelin +0,45 s yhden ajon kohinassa; selittyy sillä, että pääskripti latautuu nyt rinnan kaikkien libien kanssa jaetulla kaistalla) — sen aikaistaminen on vaihe 3 (boot ensin). Vaihe 2 siirtää vain FCP:n irti TTI:stä. **Hyväksyntä A/B:llä, ei tästä taulukosta.**

**Mittaustyökalu.** `scripts/kuorma/kylma_aikajana.js` raportoi nyt `init_ms` (initializeApp-kutsun hetki, firebase-globaalin setterillä), `dcl_ms`, `skriptit_defer` ja `vesiputous` (jokaiselle skriptille haun alku/valmis, koko, ajon alku ja kesto, defer/async); `--deploy` palvelee deploy-muotoisen puun muistista (`versiotiiviste.js laske`) eikä repon lähdettä.

**A/B (Tero ajaa `! `):** A = main → `kuorma`, B = tämä PR → `kuorma-b` (deploy-staging.yml molemmille):
```
STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/ab_vuorotellen.js \
  --a=https://talentmaster-staging--kuorma-<tunniste>.web.app --b=https://talentmaster-staging--kuorma-b-<tunniste>.web.app \
  --kierrokset=3 --sivut=master --profiilit=tyopoyta,puhelin --toistot=3
```
Odotus: FCP puhelin kylmä −6 s…−7 s (B−A samaan suuntaan myös käännetyillä kierroksilla); `auth`-haun alku ja TTI ~0 (ei regressiota > kohina; ± 0,5 s sallittu).

## 13. #1313:n jälkihavainnot tuotannossa + vaiheen 3 suunnitelma (21.11.2026, PR fix/master-appcheck-kerran-ja-kausi)

### 13.1 App Check "×2" (SA, Master, tuotanto 21.11. klo 12.20)
**Mitä tutkittiin (deploy-muoto = `versiotiiviste.js laske` palveltuna http:llä, ei lähdemuoto):** Master-deploy-puussa `lib/tm_appcheck.js` ladataan kerran, `tmAppCheckAktivoi()` kutsutaan kerran (vain `tm_master_main.js`; `tm_master_alku.js` ja HTML:n inline-lohkot 0 kutsua); muita Master-kutsujia ei ole. Yksi dokumentti → täsmälleen yksi `aktivoitu` + yksi `reCAPTCHA ladataan` -rivi sekä lähde- että deploy-muodossa (testi `tests/l7_appcheck_kausi_selain.test.js`). Tuplaa ei siis synny yhdessä dokumentissa → #1313 ei lisännyt toista kutsua.
**Ainoa toistettu tuplaus = kaksi dokumenttia:** versiotarkistus (`version.json` ≠ APP_VERSION) tekee `location.replace(…?_v=…)`. Jos ensimmäinen dokumentti ehtii ajaa pääskriptin ennen vastausta, se aktivoi App Checkin ja sitten uusi dokumentti aktivoi omansa (App Check on sidottu dokumenttiin, toista ei voi jättää pois). Konsolin "Preserve log" / sama sekunti näyttää tämän kahtena rivinä, jotka molemmat sanovat "ylin ikkuna" — **iframe-selitys ei tarvita**. Toistettu: palvelin vastaa version.json:iin 2,5 s viiveellä ja eri versiolla → 2 paria (`?_v=999`-dokumentti toinen).
**Korjaus (havaittavuus, ei käyttäytymismuutos):** aktivointi- ja reCAPTCHA-rivit kertovat nyt `dok <id>` (per dokumentti) ja `nav <type>` (navigation | reload | …). Sama dok-id kahdesti = oikea bugi; eri dok-id = kaksi dokumenttia. Seuraava tuotantoloki ratkaisee asian ilman arvailua. **Pyyntö Terolle:** kun ×2 toistuu, kopioi molemmat rivit + osoitepalkin URL (`?_v=` mukana?).
**Ei tehty tarkoituksella:** aktivoinnin viivästämistä version.json-vastaukseen asti (viivästäisi kaikkia kutsuja kylmässä avauksessa; huonompi kuin kaksi riviä reloadissa).

### 13.2 `[render season] _NM(...).laskeTaso3Osuus is not a function` ×4
Syy: `_paivitaKaikkiNakymat` kutsuu `renderSeason`ia ennen kuin laiska `lib/tm_eerikkila_normit.js` (L2) on ladattu; `tmTaso3`/`tmTasoLvl` kutsuvat `_NM().laskeTaso3Osuus`. Korjaus: `TM_NAKYMA_RYHMAT.tmNormitValmiit()` (lib/tm_nakyma_ryhmat.js, additiivinen) + `renderSeason` palaa heti kirjautuneen haarassa kunnes normit ovat ladattu → ei heittoa, ei varoitusta. Piirto: L2-portti (`setWs` → `varmista()`) lataa kirjastot ja kutsuu `_paivitaKaikkiNakymat` → Kausi piirtyy latauksen jälkeen (testi: `seasonSub` "Kausi 2026/27 · N pelaajaa"; testi kaatuu ilman korjausta).

### 13.3 Vaihe 3 — suunnitelma (EI toteutusta; toteutus vasta kun vaiheen 2 A/B on ajettu)
**Tavoite:** `firebase.initializeApp` + App Check -aktivointi + `onAuthStateChanged`-rekisteröinti aikaisemmaksi (`init_ms` 7,1–7,6 s → ~1,5–2 s puhelin kylmä), koska pääskripti (239 kt) ajetaan nyt vasta kaikkien ~139 skriptin jälkeen.
**Nykytila (koodista):** `TalentMaster_Master_v16.html` pääskriptin alku (rivit ~2175–2192): `_FB`, `firebase.initializeApp(_FB)`, `tmAppCheckAktivoi()`, `const _auth`, `const _db`; `_auth.onAuthStateChanged(async user => { await window.tmKieliPaketit.valmiit(); … })` ~2375. Muut `firebase.auth()`-kutsut käyttäjätoiminnoissa.
**Muutos (deploy-aikainen, sama periaate kuin vaiheet 1–2; lähde pysyy inline):**
1. `LYKKAYS`-sääntö irrottaa pääskriptin alusta *boot-lohkon* (`'use strict'` … `const _db = firebase.firestore();`, ~20 riviä) omaksi `tm_master_boot.js`-tiedostokseen, joka sijoitetaan heti SDK:iden (`firebase-app/auth/firestore/app-check-compat`) + `tm_appcheck.js` + `tm_istunto.js` jälkeen, ennen muita lib-skriptejä. `_auth`/`_db` ovat `const` → jakautuvat classic-skriptien kesken lexical-scopessa; pääskripti viittaa niihin kuten ennen (`typeof _db` -vartijat ok). **Riski:** `const`-uudelleenmäärittely jos lohko jää myös pääskriptiin → deploy-vartija: lohko täsmälleen yhdessä paikassa (sama idempotenssi- ja EI HUKKAA -testi kuin vaiheessa 2).
2. **App Check -järjestys säilyy rakenteellisesti:** `initializeApp` → `tmAppCheckAktivoi()` samassa boot-tiedostossa peräkkäin, ennen mitään backend-kutsua (testi: boot-tiedostossa initializeApp < tmAppCheckAktivoi < `firebase.auth()`; pääskriptissä ei enää kutsua; L7:n "kerran" -vartija päivitetään boot-tiedostoon).
3. **`onAuthStateChanged` pysyy pääskriptissä** (riippuu `tmKieliPaketit.valmiit()`, `TM_ISTUNTO`, koko tilasta) — mutta kutsu `_auth.onAuthStateChanged` saa heti nykyisen tilan, joten tapahtumaa ei menetä. Auth-tilan *esihaku* boot-vaiheessa: `_auth.onAuthStateChanged(function(u){ window.__tmAuthEnsin = {u:u}; })` K1b-luokan (`tm-auth-odottaa`) poistoon vasta kun lomake/kuori voi piirtyä — **ei muuteta K1b:n käyttäytymistä** (päätös Terolle erikseen, ks. §12).
4. **Resurssiprioriteetti:** boot-ketju (SDK:t, tm_appcheck, boot) `<link rel="preload" as="script">` + `fetchpriority="high"`; muut deferit `low`. Mitataan erikseen, koska HTTP/2-prioriteetti vaihtelee (H2 vs H3, CDN).
5. reCAPTCHA-RTT (enterprise.js → anchor → token) alkaa heti aktivoinnista → menee päällekkäin lib-latauksen kanssa (~−0,6 s).
**Mitattava (ennen mergeä!):** `init_ms`, `app_check_token_ms` (lisää aikajanaan: ensimmäinen `getToken`-valmis), FCP, TTI, `auth`-haun alku; A/B `ab_vuorotellen.js` `--profiilit=tyopoyta,puhelin`, 3 kierrosta × 3 toistoa. Hyväksyntä: `init_ms` puhelin kylmä ≥ −3 s, TTI ei regressiota > 0,5 s, FCP ei regressiota. **A/B-mittaus ENNEN mergeä** (vaihe 2 mergattiin ilman — ei toisteta).
**Testit:** (a) deploy-rakenne: boot ennen kaikkia lib-skriptejä ja pääskriptiä, init/aktivointi vain boot-tiedostossa, `_auth`/`_db` vain kerran; (b) selain (deploy-muoto): `typeof _db/_auth` DCL:ssä, ei ReferenceErroria, App Check kerran per dokumentti (L7), login-tynkien vapautus; (c) EI HUKKAA -regressio: käänteismuunnos = lähde; (d) QG-2: `?v` boot-tiedostolle, `tarkistaJulkaisu`.
**Rollback:** `LYKKAYS`-sääntöön yksi lippu (boot pois → vaiheen 2 muoto); ei datan/rules-muutoksia.
**Avoimet:** (1) kuuluuko `tm_kieli_paketit`/`tm_istunto` bootiin vai pääskriptiin (kielipaketti odotetaan `onAuthStateChanged`issa — todennäköisesti jää pääskriptiin); (2) K1b-päätös (näytetäänkö lomake ennen auth-tilaa) — vaikuttaa FCP:hen, ei init_ms:ään.

## 14. A/B 22.11.2026 (#1315 boot ensin): puhelinajo "ei kirjaudu" — diagnoosi (vain diagnoosi + mittausvartijat)

**Tulos jonka piti selittyä:** `ab_2026-11-22T07-56-42` (3 kierrosta × 3 toistoa, Master): B (PR #1315) puhelinprofiililla 9/9 avausta: 0 lukua, 0,11 MB, `kirjautunut=false`, "Firestore-instrumentointi ei kiinnittynyt". Työpöytä toimi (121 lukua). #1315 suljettu, ei mergetty (haara `perf/master-boot-ensin` säilytetty).

**Syy 1 (varmistettu datasta): mittari päätti avauksen ennen kuin sivun skriptit ehtivät ajaa — SDK ei ollut "lataamatta", se oli vielä matkalla.**
`mittaaAvaus` lopettaa kun `fcp != null` ∧ avoimia Firestore-lukuja 0 ∧ `laskeInteraktiivinen` (2 s ikkunassa ei pitkiä tehtäviä). Slow 4G (200 kt/s) + CPU 4×: B:n FCP tulee 0,45 s kohdalla (shell piirtyy, `defer`-skriptit vielä latauksessa), sen jälkeen 2 s ei yhtään pitkää tehtävää, koska CPU odottaa verkkoa → "rauhoittunut" hetkellä FCP, **tti_ms = fcp_ms = 464** (9/9), silmukka päättyy ~2,5 s kohdalla. Todisteet samassa JSONissa:
- `tti_ms == fcp_ms` kaikissa 9 B-puhelinavauksessa; `merkit` ilman `dash_nakyy`/`auth_odottaa_pois`; `ajat.auth_haku = null`, `tm_lang = null`, `firestore_ensimmainen = null`.
- Skriptejä koodattuna vain 77 kt / 140 pyyntöä (Script-ryhmä), `tm_master_alku.js` ja `tm_sentry.js` 0 tavua (kesken); `tm_master_boot.js` 428 t ehti. Firestore-compat-SDK ei ollut ehtinyt ajaa → `firebase.firestore`-nimiavaruutta ei vielä ollut → `kiinnitetty=false`.
- A (main) puhelimella: FCP = `dash_nakyy` ≈ 9,6 s eli FCP tuli vasta kun kaikki oli ajettu → sama sääntö ei laukea ennen aikojaan. Työpöydällä lataus on nopea ja CPU-työ osuu 2 s ikkunaan → B näyttää oikeat luvut.
→ "Firebase compat-SDK ei lataudu boot-versiossa" EI pidä: tuotantosivu ei rikkoutunut, mittarin lopetusehto vain olettaa että FCP jälkeinen hiljaisuus = valmis. Boot-ensin-muutos (shell piirtyy ennen skriptejä) paljasti vian; se ei sitä aiheuttanut. Paikallinen malli (`kylma_aikajana.js --deploy`, sama puhelinprofiili) näytti B:n kirjautumisnäkymän 9,0 s kohdalla ja `init_ms` 2,05 s — sivu toimii.

**Syy 2 (varmistettu datasta, todennäköisesti isompi kuin syy 1): A ja B eivät olleet samaa deploy-muotoa.**
A:n Document = 196 kt br / 902 kt purettu ja resurssilistassa EI ole `tm_master_main.js`, `tm_master_alku.js`, `tm_sentry.js` → A:n kanavalla pääskripti oli yhä inline HTML:ssä (deploy-muunnos #1307/#1313 ei ollut ajettu). B:n Document = 34 kt br / 156 kt purettu (+ irrotetut tiedostot). Siksi A:n FCP on 1,9 s (työpöytä) / 9,7 s (puhelin) — inline-skripti estää ensipiirron — ja B:n 0,26 / 0,46 s. "Vain FCP parani" ei siis ole B:n ansio vaan vertailu inline- vs. irrotettu-muotoon; TTI-ero työpöydällä (−53 ms, kohinaa) on silti B vs. A samoilla ehdoilla vain jos A olisi ollut deployattu muunnoksen läpi. **Tämän A/B:n mitään lukua ei voi käyttää boot-ensin-päätökseen.** (Päätelmä resurssilistasta: `top`-lista on kokojärjestyksessä, ~750 kt:n pääskripti puuttuisi A:sta jos se olisi tiedosto; ei vahvistettu A-kanavan HTML:stä itsestään — kanava voi olla jo poistunut.)

**Vartijat (tämä PR, `scripts/kuorma/`):**
1. `mittaa_sivut.js` `mittaaAvaus`: lopetus vasta kun yhtään Script/Document/Stylesheet-latausta ei ole kesken (`mittaus_lib.odottavatLataukset`; Fetch/WebSocket ei lasketa, Firestore Listen pysyy auki). Selainregressiotesti: hidas (3 s) skripti → mittaus ei pääty ennen sen ajoa.
2. Kirjautuneella tilalla (`odotaKirjautunut`) `kirjautunut=false` avauksen lopussa = virhe `mittaus ei valmis` → `main` keskeyttää (exit 1) kuten uudelleenohjausvartija; **ei raportoida nollalukuja hiljaa**.
3. `ab_vuorotellen.js`: jos A:n ja B:n dokumentin purettu koko samalla profiilla eroaa > 2× (`dokumenttiKokoVaroitus`), tulostuu ⚠ "kanavat eivät ole samaa deploy-muotoa". Tämä olisi napannut Syyn 2 (5,8×) ensimmäisellä kierroksella.

**Oppi (sama virhe ei saa toistua):** (a) A/B-mittarin "rauhoittunut"-ehto ei saa luottaa CPU-hiljaisuuteen hitaalla verkolla; (b) ennen A/B:tä varmista että molemmat kanavat ovat saman deploy-muunnoksen tuotos (HTML-koko, `tm_master_main.js` löytyy molemmista) — mittari varoittaa nyt; (c) 0 lukua + `tti == fcp` on aina mittausvika, ei tulos.

**Seuraavat:** boot-ensin (#1315) on mitattava uudelleen vasta kun (1) tämä vartija on mainissa ja (2) A ja B on deployattu samalla muunnoksella. Ei vielä päätöstä boot-ensin-muutoksen kohtalosta.

## 15. Seuraava työ: tavujen vähentäminen — kattavuuslista (kerätään kirjautuneella valmentajalla)

Lähtökohta §9: demo-kattavuudella 108 lib-skriptiä / 564 kt gz ei kutsuttu ensipiirrossa (yläraja: demo ≠ oikea tili). Nyt oikea lista: `scripts/kuorma/kattavuus_skriptit.js` (V8 precise coverage, kirjautunut valmentaja stagingissa, puhelinprofiili Slow 4G + CPU 4×, lopetus vasta kun lataukset valmiit — §14 vartija). Ajo (Tero):
```
! STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/kattavuus_skriptit.js --url=https://talentmaster-staging--<kanava>.web.app --seura=1 --profiili=puhelin --era-kt=100
```
Tulostaa `mittaus_tulokset/kattavuus_<aika>/kattavuus.{txt,json}`: per skripti luokka (EI_KUTSUTTU / VAHAN / KAYTOSSA), gz kt, käytetty %, **ylätaso %** (ajettu ylätason koodi ilman funktioita = rekisteröinnit/sivuvaikutukset, jotka ajettiin silti), ylätason nimet, sekä **eräehdotus** (EI_KUTSUTTU, iso ensin, ~100 kt/erä). Kanava pitää olla deployattu saman deploy-muunnoksen läpi kuin vertailukanava (§14).

**Tulkinta:** EI_KUTSUTTU ≠ turvallisesti siirrettävissä. Erän skriptit tarvitsevat (a) typeof-vartion kutsujissa tai tmLaiska-portin, (b) ylätason sivuvaikutusten tarkistuksen (`ylataso_pct`, nimet; §9.3 kuusi tunnettua top-level-kohtaa), (c) oman A/B:n (mitattu §14-vartijoilla, samat deploy-muodot) ennen mergeä. Kattavuus on yhden roolin (valmentaja, Koti) yhden avauksen näkymä: muut välilehdet/roolit kutsuvat siirrettyjä skriptejä käyttäjän toiminnasta → siksi laiska lataus ensikäytöllä, ei poisto. Toteutusta ei ole; erät ehdotetaan kun oikea lista on kerätty.

## 16. Erä 1 toteutettu (laiskaksi, tmLaiska) + KAYTOSSA-selvitys + tm_lang-jako (22.11.2026, PR perf/laiska-era1-kaavio)

**Kattavuus 22.11. (`kattavuus_2026-11-22T10-14-53`, Master, puhelin, talenttivalmentaja):** EI_KUTSUTTU 13 kpl / 106 kt; KAYTOSSA 119 / 859 kt.

### 16.1 Erä 1: 8 skriptiä / 73,2 kt (br) siirretty — 3 jätetty pois perustellusti

Siirretty (Master, `type="text/plain" data-tm-laiska`, HTML-järjestys = latausjärjestys ennallaan): tm_kaavio_ui 32,6 · tm_kaavio_editori 8,6 · tm_xt 7,3 · tm_kaavio_render 5,9 · tm_kaavio_policy 5,4 · tm_kaavio_validate 4,9 · tm_xt_kerros 4,8 · tm_pelihavainto_valinta 3,7. `tm_master_alku.js` (erä 2, globaalit) ja `tm_kaavio_konsepti` EI siirretty (PM-ohje).

**Jätetty pois (ei turvallinen ilman erillistä fail-safe-työtä): tm_idp 13,5 · tm_arviointi_taksonomia 8,2 · tm_piirros 5,5 = 27,2 kt.** Syy: niiden kuluttajat putoavat HILJAA varapolulle kun lib puuttuu, eikä kutsu laukaise latausta (typeof-vartija ≠ ReferenceError → itseparannus ei toimi):
- **tm_idp → §28-kypsyysvahti avautuu vääriin päin.** `tm_koti_luvut.js:182` (`if (!avain || typeof I.idpKypsyysEstetty !== 'function') return false;`) ja `tm_tukitavoitteet.js:190` (`I.idpKypsyysEstetty(...)` → TypeError/falsy) → PRE/LAH-pelaajan fyysinen heikkous tulkittaisiin tavallisena. Polku on data-riippuvainen (`tm_fyysinen.js:88` kun testitaso ≤ FYS_TASO_RAJA; `tm_nakyma_ryhmat.js:120`) — kattavuusajon datalla ei laukea (siksi 0 kutsua), toisella seuralla laukeaa Kodin ensipiirrossa. Lisäksi `_mIdp*`-käsittelijät (Master-inline 7846–8602) `return` hiljaa jos `typeof idp… !== 'function'`.
- **tm_arviointi_taksonomia:** `tmTaksonomiaByAvain`/`tmTeemat`/`tmKehys` luetaan `typeof`-vartioituna tm_idp_lomake/tm_tukitavoitteet/tm_kehityspolku/tm_pelialy_yksilo:ssa → silent degrade (IDP-fokusvalinta tyhjä).
- **tm_piirros:** `_ttKorttiHTML` (Master 6462, synkroninen HTML) kutsuu `tmPelipaikkaKartta`/`tmPositioNormalisoi` typeof-vartioituna → pelipaikkakartta puuttuisi pelaajanäkymästä eikä mikään piirrä sitä uudelleen.
**Polku mukaan (Erä 1b, oma PR):** fail-safe-kutsukohtiin (`kypsyysEstetty` → konservatiivinen `true` + `tmLaiska.varmista()`; `_ttKorttiHTML`/`_mIdp*` → lataus + uudelleenpiirto) + testit; tai tynkä + ladattu-portti ennen pelaajakortin/IDP:n avausta. Ei tässä PR:ssä, koska muuttaa jaettuja kirjastoja (VP käyttää samoja).

**Mekanismi (`lib/tm_laiska_kirjastot.js`):** uusi **tynkä** `+nimi` `data-portit`issa: kirjasto on itse laiska → globaali tynkä (typeof 'function') lataa erän ja kutsuu SITTEN oikeaa funktiota samoilla argumenteilla; kirjasto korvaa tynkän latautuessaan. Vanha `portti()` ei kelpaa, koska se kietoo jo olemassa olevan funktion — ja `avaaKaaviopankki` OLI tm_kaavio_ui.js:n sisällä. Tynkät: `+avaaKaaviopankki`, `+_kaavioUusiLomake`, `+tmKaavioLiitaHavaintoon`, `+tmPhAvaaValinta` (kaikki typeof-vartioidut kutsujat Masterissa: `_hkLiita` 5488, `_avaaPikakorttiIframe` 11309 → tynkä on 'function' → oikea polku, ei varapolkua). `tm_havainto_kaavio.piirraThumb`: jos render-lib puuttuu ja tmLaiska ei valmis → lataa ja piirrä uudelleen (ei hiljaista tyhjää).

**Tarkistetut typeof-vartiot / ylätason sivuvaikutukset (8 skriptiä):** `_kaavioTallentamattomia` (typeof → false = oikein, ei avattua taulua) ; `tm_kt_sivu`/`tm_valmentaja_nav` kutsuvat `avaaKaaviopankki`a nimellä (tynkä) ; `drawSpec`/`TM_KAAVIO_RENDER` vain tm_havainto_kaavio + tm_xt_kerros (käsitelty) ; ylätasolla ei DOM-/kuuntelijasivuvaikutuksia (grep: ei top-level document/addEventListener/setInterval; vain nimimäärittelyt) ; muut libit eivät lue näitä latausvaiheessa (kuluttajakartta: vain funktio-kutsut käyttöhetkellä). `tm_kaavio_validate`:n `ROOLIT`/`TYYPIT` -osumat muissa libeissä ovat niiden omia paikallisia nimiä.

**Testit:** `l2_era1_kaavio_selain` (oikea Master Chromessa): avaus ei lataa yhtään erän skriptiä, 4 tynkää ovat funktioita, kaavio-globaaleja ei ole, ei pageerroria; `avaaKaaviopankki()` ensikäytöllä lataa erän HTML-järjestyksessä ja tynkä korvautuu. Päivitetty: l2/l3 portti-listat, pelihavainto-kenttä (Master laiska). Läpi: 1 645 testiä (kaavio, l2/l3/l6/l7, versiotiiviste, i18n, havainto, pelihavainto, vp_navi, sw …); `sw_paivitys_selain`: kolme testiä vihreää, afterAll-koukku aikakatkaisi (selaimen sulku, ei liity muutokseen — ajetaan uudelleen CI:ssä).
**Ei varmistettu stagingissa:** taktiikkataulu/kaavio/IDP-kortti/pelihavainto ensiavauksella oikealla datalla — A/B + käsin tarkistus ennen mergeä. `--rooli=valmentaja1`/VP-kattavuus: komennot alla.

### 16.2 Kattavuustyökalun korjaus: IIFE/UMD-kääre ei ole "kutsu"
`kattavuus_skriptit.js` (#1316) laski skriptin kääre-IIFE:n kutsutuksi funktioksi → "KAYTOSSA 1/N" oli lähes aina pelkkä kääre (EI oikea kutsu). Korjattu: ≥ 80 % skriptistä kattava funktio ei ole kutsu (testi). Lisäksi `kutsutut_nimet` (nimetyt kutsutut funktiot) ja `--rooli=` / `--era=` (erätarkistus: ✗ jos erän skripti on KAYTOSSA/VAHAN avauksessa; "EI_LADATTU" = OK).
**Vahvistus (Node, vm, pelkkä lataus ilman kutsuja):** 115 KAYTOSSA-libin latausaikaisten funktiokutsujen määrä vs. kattavuusajon `kutsuttuja`: **82 skriptiä / 448 kt (br) täsmää tasan (real ≤ load) → avauksessa ei yhtään API-kutsua, vain latausaikaista (kääre + rekisteröinti)**. Loput 33 / 186 kt kutsutaan oikeasti. (Node-ympäristö ≠ Chrome → todennäköisesti ylärajaa; varmistus: seuraava kattavuusajo tallentaa `kutsutut_nimet`.)

### 16.3 Selvitys (ei toteutusta): KAYTOSSA-kirjastot — mikä kutsu, voiko siirtää (isoin ensin)
**Ei avauskutsua (kutsut = vain latausaikaisia; ehdokkaita laiskaksi, kt br):** tm_sisainen 14,8 (`_erillinen`×3 latauksessa) · tm_naytto_lohkot 14,5 · tm_mediaviesti 14,3 · tm_tukitavoitteet 12,9 · tm_aloita_jakso 12,2 · tm_joukkuejakso 11,0 · tm_pelialy_yksilo 10,1 · tm_idp_lomake 9,9 · tm_pikakirjaus 9,6 (`_themed`×2) · tm_pikakentat 9,3 · tm_viikkopohja 9,2 · tm-prescription 8,9 · tm_jakso_malli 8,7 · tm_harjoitusarviointi 8,5 · tm_tanaan_signaali 8,5 · tm_kevyt_katselmus 8,3 · tm_arviointi_historia 7,9 · tm_reitin_valinta 7,7 · tm_tekniikka 7,5 · tm_kentta 7,5 · tm-methodology 7,1 · tm_seuraava_askel 6,7 · … (yht. 82 kpl / 448 kt; koko lista: ajo `kattavuus_skriptit.js`, rivit EI_KUTSUTTU uudella luokituksella).
**Riski per kirjasto = kuluttajat, ei kattavuus.** Sama fail-open-kysymys kuin 16.1: moni näistä on `typeof`-vartioitu/`g('nimi')`-luettu kuluttajissa (tm_tukitavoitteet, tm_idp_lomake, tm_aloita_jakso, tm_koti_luvut-polku) → ne vaativat tynkä/portti ENNEN käyttäjän polkua tai fail-safe, ei pelkkää tagimuutosta. Turvallisimmat (käyttäjän toiminto avaa moduulin, ei laskenta kuluttajan sisällä): modaali-/lomakemoduulit — tm_aloita_jakso, tm_joukkuejakso, tm_pikakirjaus, tm_mediaviesti, tm_idp_lomake, tm_harjoitusarviointi, tm_kevyt_katselmus (~76 kt). Laskenta-/data-libit (tm_tukitavoitteet, tm_jakso_malli, tm_arviointi_historia, tm_fyysinen, tm_phv_tila) ovat riskialtteimpia (§28/§29 vartijat).
**Oikeasti kutsutut (ei siirretä; kutsu = Koti-piirto):** tm_kehitystyopoyta 21,3 (real 2/load 1: yksi avauskutsu → todennäköisesti `tmKtCss`/CSS-injektio; nimi ei ole varmennettu — kattavuusajon `kutsutut_nimet` kertoo; jos vain CSS, voidaan eriyttää omaan pieneen tiedostoon ja loput 20 kt laiskaksi) · tm_ryhmat 9,9 (+1) · tm_joukkue 8,5 · tm_kalenteri_nakyma 7,3 (+19) · tm_koti_luvut 6,9 (+3) · tm_valmentaja_nav 6,9 (+24) · tm_reflektio 6,7 (+1) · tm_valmentaja_koti 6,7 (+25) · tm_kt_sivu 6,7 (+2) · tm_nakyma_ryhmat 6,5 (+3) · tm_konsepti_resolve 6,3 (+3) · tm_kalenteri_malli 6,2 (+4) · tm_harjoituskertyma 5,8 (+2) · … Ne, joilla vain +1 (tm_kehitystyopoyta, tm_ryhmat, tm_reflektio): selvitä kutsuttu funktio → jos se on yksi kevyt funktio, kutsu siirretään avauksen jälkeen tai funktio kopioidaan ohueen stubiin; muuten pysyvät.

### 16.4 tm_lang.js: sv/en-osien erottaminen — arvio
`lib/tm_lang.js` 230 kt raakana, **52,0 kt br** (= suurin yksittäinen lib). Rakenne: fi-taulu 72 kt raaka (21,0 br) · **sv 71,6 kt (21,8 br)** · **en 79,0 kt (23,0 br)** · moottori 217 riviä (t, tmAsetaKieli, tmNykyinenKieli, tmTuetutKielet …). → **fi-käyttäjän säästö ≈ 44,8 kt br** (sv + en pois; 86 % tm_lang:sta). Mekanismi on jo olemassa: `tm_kieli_paketit.js` (`data-tm-kielipaketti`, ladataan kun kieli ≠ fi, render-gate ennen ensirenderiä) — sv/en-taulut → `lib/tm_lang_sv.js`/`tm_lang_en.js`, jotka asettavat `TM_LANG.sv = {…}`.
**Riskit/työ:** (1) `TM_LANG` on `const` yhdessä tiedostossa → `TM_LANG.sv`/`.en` asetus erillisillä skripteillä toimii (ei uudelleenmääritystä), mutta `tmTuetutKielet()` = `Object.keys(TM_LANG)` (rivi ~3958) palauttaisi vain ['fi'] ennen pakettia → kovakoodattava ['fi','sv','en']. (2) `t()`-fallback sv→en→fi säilyy (puuttuva taulu = fi), kielenvaihto käyttää jo `tmKieliPaketit.vaihda` -porttia (lataus ennen renderiä). (3) `tmEmailRekisteriKutsu`/`tmRooli` lukevat `TM_LANG[kieli]?.email` — sähköpostiteksti ei-fi-kielellä tarvitsee paketin ladatuksi (Admin/Seura: tarkistettava). (4) Sama tiedosto on 7+ sivulla (Master, VP, Seura, Pelaaja, Kehitystyöpöytä, Vanhempi, ADAR…): jako joko repossa (kaikki sivut saavat paketti-tagit) tai deploy-muunnoksena Masterille ensin (kuten pääskripti). (5) Testit: i18n-testit (`TM_LANG.sv`-avainpariteetti) lukevat tm_lang.js:ää suoraan → päivitettävä lukemaan paketit. Arvio: 1–2 PR:ää; suurin yksittäinen kt-säästö jonosta (44,8 kt, ei fail-open-riskiä data-logiikassa — pahin virhe on teksti suomeksi).

### 16.5 Seuraava (Teron ajettavaksi): kattavuus valmentaja1:llä ja VP:llä
```
! STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/kattavuus_skriptit.js --url=https://talentmaster-staging--kuorma-b-<tunniste>.web.app --sivu=master --rooli=valmentaja1 --profiili=puhelin --era=lib/tm_kaavio_ui.js,lib/tm_kaavio_editori.js,lib/tm_xt.js,lib/tm_kaavio_render.js,lib/tm_kaavio_policy.js,lib/tm_kaavio_validate.js,lib/tm_xt_kerros.js,lib/tm_pelihavainto_valinta.js
! STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/kattavuus_skriptit.js --url=… --sivu=vp --profiili=puhelin --era=<sama>
```
Odotus: Masterissa kaikki erän skriptit `EI_LADATTU` (✓); VP:ssä (ei muutettu) ne ovat ladattuja — jos EI_KUTSUTTU myös siellä, sama laiska-muutos on mahdollinen VP:lle erikseen.

### 16.6 CI-korjaukset (#1317) ja päätökset 22.11.
- **Erä 1b (tm_idp, tm_arviointi_taksonomia, tm_piirros) EI toteuteta** (PM-päätös): §28-kypsyysvahdin hiljainen pettäminen ei ole 27 kt:n arvoinen. Ne pysyvät eager-skripteinä.
- **`v_koti_b_selain` "REITIT lipun päällä": today → 'cal' (odotettu 'koti').** Ei reitityksen muutos: `setWs(≠koti)` on tmLaiska-portin takana (`setWs!koti`), joten ensimmäinen kutsu odottaa laiskan ryhmän latausta ja suoritetaan vasta sen jälkeen; testi lukee aktiivisen näkymän heti kutsun jälkeen → kilpailu latauksen kanssa. **Toistuu mainillakin** kun CPU kuristetaan 25× (CDP): main 1/5 läpi, #1317 ennen korjausta 0/5; normaalilla kuormalla 10/10 sekä mainilla että haaralla (siksi paikallisesti vihreä, CI:ssä hitaampi kone punainen). Erän 8 skriptiä kasvatti portin odottamaa ryhmää (5 → 13 tiedostoa) ja paheensi kilpailua.
  Korjaus kahdella tasolla: (1) **laiskat ryhmät** (`data-tm-ryhma="kaavio"`): erä on oma ryhmänsä, tynkä `+nimi@kaavio` lataa vain sen; `setWs`-portin (oletusryhmä) lataus pysyy kuten mainissa — välilehden vaihto ei maksa erän tavuja (testattu), ja kaavio avaus ei lataa oletusryhmää (testattu); ReferenceError-itseparannus lataa kaikki ryhmät. (2) **testin determinismi**: `kaynnista` esilataa laiskan ryhmän ennen kuin testi kutsuu `setWs`. Tulokset (REITIT-testi, CPU 25×, 5 ajoa): main 1/5 · #1317 ennen 0/5 · ryhmäjako ilman testikorjausta 3/5 · ryhmäjako + determinismi **5/5**; normaali kuorma 10 ajoa: **10/10**.
- `l2_era1_kaavio_selain.test.js` lisätty `.github/chrome_testit.txt`:iin (chrome_testit_ci_vartija).
- Kattavuusajo tallentaa funktioiden nimet: `kutsutut_nimet` (nimetön kutsuttu funktio = `(anon@offset) lähdepätkä`) JSONiin ja `KUTSUT:`-sarake tekstiraporttiin riveille joilla ≤ 4 kutsua → tm_kehitystyopoyta:n yksi avauskutsu selviää seuraavassa ajossa.
- **Seuraavat erät (kumpikin oma PR + A/B):** (a) tm_lang.js sv/en kielipaketteihin (~45 kt, 7 sivua, §16.4); (b) modaali-/lomakemoduulit (~76 kt, §16.3).

### 16.7 A/B-tulos (#1317, `ab_2026-11-23T19-39-20`, kierrokset AB/BA/AB)
| mittari | A (main) → B (Erä 1) |
|---|---|
| tavut, työpöytä | 1,38 → 1,31 Mt |
| tavut, puhelin | 1,41 → 1,34 Mt |
| puhelin, kylmä: auth-haun alku | **−404 ms** (kierrokset −410 / −404 / −368; johdonmukainen) |
| puhelin, kylmä: interaktiivinen | 11 090 → 10 782 ms (−308 ms; kohinan sisällä) |
| työpöytä, lämmin | ei eroa |

Ei taantumaa. **Arvio:** ~0,55 s / 100 kt ennen authia puhelimella → alle 10 s interaktiiviseen vaatii vielä ~200 kt.

## 17. A/B 22.11. (kuorma-b, #1317): puhelin "ei kirjautunut" = mittarivika (ikkuna), ei sovellusvika
`ab_2026-11-22T13-28-33`: B puhelin → `mittaus ei valmis (kirjautunut=false)`; A puhelin "interaktiivinen 0,4–0,5 s" 121 luvulla. Tero todensi käsin (iPhone 12 Pro + Slow 4G): kirjautuminen ja Master toimivat. #1316:n lataus­vartija ei riittänyt: kun kaikki skriptit on ladattu mutta auth/App Check vielä kesken, CPU on joutilas ja "rauhoittunut" laukeaa jo FCP:n kohdalla.
Korjaus (`mittaa_sivut.js`, `mittaus_lib.js`): (1) `odotaKirjautunut` → silmukka ei pääty ennen kuin `currentUser` on olemassa (aikarajaan 90 s asti); (2) `laskeInteraktiivinen({alaraja})`: TTI ≥ kirjautumisen hetki (`auth_odottaa_pois`-merkki, muuten havaintohetki) → TTI ei voi olla FCP; (3) selaintesti: kirjautuminen 3 s FCP:n jälkeen → TTI ≥ 2,8 s. Aiemmat A:n puhelin-TTI-luvut (0,4–0,5 s) ovat virheellisiä.

## 18. Erä 2 toteutettu (modaali-/lomakemoduulit → ryhmä `modaalit`, 25.11.2026, PR perf/laiska-era2-modaalit)

**Siirretty (Master, `type="text/plain" data-tm-laiska data-tm-ryhma="modaalit"`, HTML-järjestys säilyy):** tm_idp_lomake 8,8 · tm_pikakirjaus 8,5 · tm_harjoitusarviointi 7,4 = **24,7 kt br** (gz 28,2 kt). Erä on OMA ryhmänsä, jotta käyttö ei vedä oletusryhmää (harjoitelogiikka 72 kt gz ym.) mukaan.
**Käyttöpolut (kaikki varmistavat ryhmän ENNEN kutsua, ei hiljaista varapolkua):**
- `_masterPikakirjaus` (async): `varmista('modaalit')` ennen `TM_PIKAKIRJAUS.avaa`.
- `avaaHarjoitusarviointi`: `varmista('modaalit')` ennen `TM_HARJOITUS.avaa` (oletusryhmän portti säilyy); `_cpdTodistePDF`: sama ennen `_brandiVars` (muuten PDF:n brändiväri olisi hiljaa teal-vara).
- IDP-kortti (`_mIdpReRender`/`_mIdpLataa`): KT-sivun Polku-välilehti ja pelaajamodaali (`_renderPinfoFirestore`) odottavat ryhmän (`_mIdpPelaaja === p` -vartija vanhentunutta kutsua vastaan). Ryhmän lataus piirtää näkymät uudelleen (`_paivitaKaikkiNakymat`).
**EI siirretty (tarkistettu, jäävät eager) — Erä 2:n alkuperäisestä 76 kt:n listasta:**
- **tm_joukkuejakso 11,0 + tm_aloita_jakso 12,2:** `renderKotiV2` (Koti) kutsuu `window.TM_JOUKKUEJAKSO.tmJoukkueenJakso(...)` suoraan ilman vartijaa → TypeError (itseparannus nappaa vain ReferenceErrorin); tm_aloita_jakso vaatii joukkuejakson (`_req`) ja `_ktKehys`/tm_tanaan_signaali/tm_joukkoaloitus lukevat sitä Kodin/KT-sivun piirrossa.
- **tm_kevyt_katselmus 8,3:** `_ktSigCtx` (KT-signaali) → `_kvkProfiiliLataa` palaa hiljaa jos lib puuttuu → profiili jää oletukseksi `oto`; `_mJjRender` lukee profiilin samasta datasta. Hiljainen degrade, ei lataustriggeriä.
- **tm_mediaviesti 14,3:** `_getInboxEvents` (Koti/Inbox) ohittaa klippirivit hiljaa jos `TM_MEDIAVIESTI` puuttuu; `_mvKuuntele`-listener, KT-sivun Polku (`_mvLataaKlipit`) ja V4 ⋯ "Lisää klippi" ovat usean eri portin takana. Vaatii oman fail-safe-työn (listener-trigger + KT-polku) → ehdotus Erä 2b, oma PR.
**Testit:** `tests/l2_era2_modaalit_selain.test.js` (oikea Master Chromessa; lisätty `.github/chrome_testit.txt`): avaus ei lataa erää eikä anna pageerroria · `_masterPikakirjaus()` lataa ryhmän HTML-järjestyksessä, oletusryhmä ei lataudu · `setWs(cal)` lataa ryhmän vain jos IDP-kortti on piirretty · staattinen: kaikki polut varmistavat ryhmän.
**Ei varmistettu stagingissa:** pikakirjaus/itsearvio/CPD-PDF/IDP-kortti ensiavauksella oikealla datalla + A/B (§14-vartijat, samat deploy-muodot) ennen mergeä. Odotus: ~25 kt br ≈ 0,14 s ennen authia puhelimella (0,55 s / 100 kt, §16.7).
