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

## 14. Vaihe 3 toteutettu: boot-tiedosto ensin (21.11.2026, PR perf/master-boot-ensin)

**Toteutus (deploy-muunnos, repo ennallaan — kuten §11–12).** `scripts/versiotiiviste.js`: `LYKKAYS[Master].boot` (`erotaBoot`, `siirraBoot`, `esilataus`).
1. **`tm_master_boot.js`** (~0,6 kt) = pääskriptin lohko `const _FB` … `const _auth = firebase.auth();`: config, `firebase.initializeApp`, `tmAppCheckAktivoi()`, `_auth`. Pääskriptiin jää merkkikommentti; `onAuthStateChanged` pysyy pääskriptissä.
2. **Poikkeama §13.3:sta (tarkoituksella):** `const _db = firebase.firestore();` JÄÄ pääskriptiin. Syy: boot-ketjuun ei tarvitse Firestore-SDK:ta (99 kt gz ≈ 0,5 s puhelimella); App Check on silloin silti aktivoitu ennen ensimmäistä Firestore-kutsua. `typeof _db` -vartijat toimivat (pääskripti on viimeinen).
3. **Järjestys:** app → app-check → auth → `lib/tm_appcheck.js` (siirretty tagi; riippumaton muista libeistä) → `tm_master_boot.js` → Firestore/Functions/Storage-SDK:t → muut libit → pääskripti.
4. **Prioriteetti:** nuo viisi (app, app-check, auth, tm_appcheck, boot) `fetchpriority="high"` + `<link rel="preload" as="script">` samalla href:llä heti `<meta charset>`in jälkeen. Muille ei `low`-attribuuttia (deferattu skripti on jo oletuksena low).
5. **Vartijat:** deploy kaatuu jos lohkon rajat eivät löydy täsmälleen kerran / järjestys initializeApp < tmAppCheckAktivoi < auth rikkoutuu / lohko riippuu Firestoresta tai tilasta. Testit `tests/l8_boot_ensin.test.js` (yksiköt, rakenne, EI HUKKAA, rollback, selain: initializeApp ajetaan ENNEN libejä ja pääskriptiä, `_auth/_db` globaaleina, App Check kerran per dokumentti).
6. **Rollback:** `LYKKAYS[Master].boot = null` → vaiheen 2 muoto (testattu).
7. **Mittarit A/B:hen:** `ab_vuorotellen.js` raportoi nyt myös `init` (`merkit.init` = initializeApp-hetki) ja `act` (App Check -vaihdon valmistuminen); `kylma_aikajana.js` `app_check_token_ms`.

**Paikallinen malli (`kylma_aikajana.js --deploy`, puhelin Slow 4G + CPU 4×, 2 ajoa/kohta, EI A/B-todiste):**
| | init_ms | FCP | dcl_ms | login näkyy | siirretty (enc_kt) |
|---|---|---|---|---|---|
| main (vaihe 2) | 7 551–7 562 | 440–444 | 7 586–7 598 | 7 716–7 727 | 1 251 |
| tämä PR | **2 055–2 056** | 460–468 | 8 940 | 9 030–9 036 | 1 606 |

**Rehellinen havainto — hyväksyntäkriteeri "TTI ei regressiota > 0,5 s" voi pettää ensikävijällä.** `init_ms` paranee ~5,5 s, mutta ilman voimassa olevaa App Check -tokenia reCAPTCHA (353 kt) alkaa nyt ~2 s kohdalla ja kilpailee kaistasta kirjastojen kanssa → pääskripti valmistuu ~1,4 s myöhemmin (malli; +355 kt siirtyi mittausikkunassa). Aiemmin reCAPTCHA haettiin vasta initin jälkeen (~7,5 s), TTI:n jälkeen. **Staging-A/B (debug-token) EI näe tätä**, koska debug-token ohittaa reCAPTCHA:n latauksen; samoin voimassa oleva token (lämmin / palaava käyttäjä) ohittaa sen. Vaikutus koskee: ensikäynti / vanhentunut token. Hyöty vastaavasti: token valmis ennen kuin pääskripti tekee ensimmäisen Firestore-kutsun (data aikaisemmin).
Vaihtoehto jos Tero haluaa suojata ensikävijän TTI:n: pidä `tmAppCheckAktivoi()` pääskriptissä (init + auth boot-tiedostossa) — mutta silloin Auth-kutsut lähtevät ennen aktivointia (§9.6 kohta 1 kieltää) ja RTT-päällekkäisyys (~0,6 s) katoaa. Ei toteutettu; päätös Terolle.

**A/B (Tero ajaa `! `):** A = main → `kuorma`, B = tämä PR → `kuorma-b`:
```
STAGING_APPCHECK_DEBUG_TOKEN=<token> node scripts/kuorma/ab_vuorotellen.js \
  --a=https://talentmaster-staging--kuorma-<tunniste>.web.app --b=https://talentmaster-staging--kuorma-b-<tunniste>.web.app \
  --kierrokset=3 --sivut=master --profiilit=tyopoyta,puhelin --toistot=3
```
Hyväksyntä (§13.3): `init` puhelin kylmä ≥ −3 s; TTI ei regressiota > 0,5 s; FCP ei regressiota. Lisäksi (ei A/B:llä): ensikävijän TTI ilman tokenia mitataan `kylma_aikajana.js --deploy` ilman debug-tokenia (yllä oleva malli).


## 15. Vaihe 3 jatko (#1315): reCAPTCHA ei kilpaile pääskriptin kanssa

**Lähtökohta (Teron päätös):** ei-tokenia-tapaus ei ole harvinainen (TTL 24 h, SDK uusii 50 %:ssa → kerran päivässä avaava valmentaja on lähes aina ilman voimassa olevaa tokenia). +1,4 s TTI ei kelpaa; `tmAppCheckAktivoi()` pysyy boot-tiedostossa (§9.6).

**Muutos (`lib/tm_appcheck.js`, yksi paikka):** kylmän tokenin reCAPTCHA-lataus (provider.initialize, 353 kt) odottaa nyt `DOMContentLoaded` + 1 makrotehtävä, eli kunnes kaikki `defer`-skriptit (pääskripti viimeisenä) on ajettu. `initializeApp` → `tmAppCheckAktivoi()` → auth käynnistyvät boot-vaiheessa heti kuten ennenkin; vain SDK:n ulkoinen skriptinlisäys siirtyy. Ensimmäinen backend-kutsu (Firestore/Auth/Functions) odottaa tokenia kuten ennenkin (`provider.getToken` ratkeaa vasta latauksen ja vaihdon jälkeen). Portti on auki heti jos dokumentti on jo jäsennetty (muut kuin boot-ajoitetut sivut, node-testit) → ei muutosta niissä. Voimassa oleva token: reCAPTCHAa ei ladata lainkaan (A1 ennallaan). ENFORCE-turva ennallaan (kääre ei keksi tokenia). `fetchpriority=low` ei ole mahdollinen: skriptin lisää SDK itse (`document.createElement('script')`), emme hallitse sen attribuutteja; ajoitus on tehokkaampi keino joka tapauksessa (ei lainkaan kilpailua ennen pääskriptiä).

**Malli** (`kylma_aikajana.js --deploy --token=voimassa|ei`, puhelin: Slow 4G 1,6 Mbit/s + 150 ms, CPU 4×; 2 ajoa/solu; ms):

| tapaus | auth-alku (`initializeApp`) | kuori/TTI (login näkyvissä) | 1. backend-kutsu mahdollinen* | enc kt |
|---|---|---|---|---|
| (a) voimassa token — PR | 2055–2077 | 7733–7827 | 7733–7827 | 1251 |
| (a) voimassa token — main | 7603–7639 | 7714–7732 | 7714–7732 | 1250 |
| (b) ei tokenia — PR | 2051–2066 | 7713–7715 | 10208–10250 | 1605 |
| (b) ei tokenia — main | 7570–7603 | 7718–7722 | 10226–10267 | 1604 |

\* `appCheck().getToken(false)`:n ratkeamishetki kuoren tultua näkyviin = milloin ensimmäinen Firestore-kutsu voisi lähteä (mallissa ei kirjautumista → ei oikeaa Firestorea; token-vaihto epäonnistuu localhostilla → tulos "virhe", mutta ratkeamisaika on todellinen latausviive).

**Tulos rehellisesti:** (b) ei huonompi kuin main (TTI −5…+0 ms, 1. backend −41…+24 ms; vaatimus ≤ +0,5 s täyttyy selvästi). Edellisen version +1,4 s poistui. (a): auth-alku paranee ~5,5 s, mutta **TTI/kuori ja 1. backend-kutsu eivät parane paikallisessa mallissa** (+19…+95 ms, kohinan sisällä) — pullonkaula on pääskriptin ja kirjastojen tavut (1,25 Mt), ei auth-alku. Auth-alun hyöty näkyy vasta kirjautuneella käyttäjällä (istunnon palautus ~5 s aiemmin) → sitä malli ei kata (ei kirjautumista); se on A/B-mittauksen asia (staging, kirjautuneena: mittarit `init`, `auth`, `Firestore`, TTI). "(a) parempi kuin main" on siis osoitettu auth-alulle, ei vielä TTI:lle.

**Tapauksen (b) mittaus stagingissa:** `ab_vuorotellen.js --ilman-tokenia` (+ `mittaa_sivut.js --ilman-tokenia`): ei debug-tokenia (reCAPTCHA latautuu oikeasti), ja kirjautumisen aikana saatu App Check -token poistetaan storageStatesta (`firebase-app-check-database`) → kylmä avaus alkaa ilman tokenia. Ehto: stagingin App Check ei saa olla **enforce**-tilassa — `docs/STAGING_ASENNUS.md` kohta 8 ohjeistaa "älä pakota", mutta nykytilaa ei voi lukea repon kautta → **Teron tarkistettava Firebase Console → App Check → palvelut (Unenforced)**. Jos enforce on päällä, kirjautuminen/Firestore hylätään ja ajo päättyy virheeseen (ei hiljaista väärää lukua). Lisäksi kanava-domainin pitää kelvata reCAPTCHA-avaimelle, muuten token-vaihto epäonnistuu (lataus silti tapahtuu → latausviive mitataan oikein, mutta vaihto-osuus ei). Lämmin-rivi ei ole tässä tilassa puhdas tapaus (a), koska token on saatu vasta kylmässä avauksessa; (a) mitataan ennallaan debug-tokenilla.

**A/B-komennot:** (a) kuten §14. (b): `node scripts/kuorma/ab_vuorotellen.js --a=<kuorma> --b=<kuorma-b> --kierrokset=3 --sivut=master --profiilit=tyopoyta,puhelin --toistot=3 --ilman-tokenia` (STAGING_APPCHECK_DEBUG_TOKEN ei tarvita).
