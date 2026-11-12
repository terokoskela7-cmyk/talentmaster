# Vaihe 0 -selvitys: Masterin lataus + sivujen koko puhelimella (12.11.2026)

Vain selvitys, ei koodimuutoksia. Pohja: staging-mittaus 12.11. (500 pelaajan seura, kylmä mediaani, työpöytä / puhelin Slow 4G + CPU 4×) ja staattinen luku repon tiedostoista (`TalentMaster_*.html`, `lib/`, `firebase.json`).
PM päättää numeroiduista kohdista (P1–P8).

**Rehellisyysmerkintä:** mittauksen kenttä `tavut` on vain kokonaissumma; resurssikohtaista erittelyä ei ole. Alla olevat tavuluvut on laskettu staattisesti (gzip repon tiedostoista, SDK:t gstatic/CDN-vastauksista `curl`illa). Staattinen summa jää ~0,4–0,5 MB mitattua pienemmäksi (ks. 2.2) → P1.

---

## 1. Masterin lataus (11,8 s / 42 s, 2 499 lukua, 4,5 MB)

### 1.1 Mitä Master lukee avauksessa (`TalentMaster_Master_v16.html`)

Kirjautumisen jälkeen (rivit ~2540–2600) ajetaan `_lataaPelaajat()` + `_lataaTestitapahtumat()`; `_lataaPelaajat()` käynnistää loput.

| Lähde | Lukuja (500 pelaajan seura) | Rivi | Tarvitaanko heti? |
|---|---:|---|---|
| `admins/{uid}`, `kayttajat/{uid}`, `seurat/{id}` (+`liput/julkiset`), `joukkueet` | ~5–25 | 2540–2741 | Kyllä (rooli, seura, joukkuevalitsin) |
| **`pelaajat`** – koko seura jos `_joukkue` tyhjä (`col.get()`); muuten 2 kyselyä joukkueelle | **500** (≈25 omalle joukkueelle) | 2762–2785 | Kyllä, mutta vain *oma joukkue* |
| **`sisainen`-collectionGroup** (`tmSisainenLataaJaYhdista`) + terveys-collectionGroup roolin mukaan | **~500 + ~500** | lib/tm_sisainen.js 372/388 | Ei heti – näytetään pelaajakortissa |
| **`_lataaKirjaukset()`** – yksi kysely *per pelaaja* (`kirjaukset`, `limit(7)`, erissä 20) | 500 kyselyä, ≤3 500 lukua; osuu ~1 400 | 2928–2965 | Ei heti – 14 pv syöte, näytetään max 100 |
| `testitapahtumat` (limit 50), `viestit` (limit 20, onSnapshot), `klipit` onSnapshot, `konseptit` | ~70–100 | 2810, 3020, 7152, 2916 | Testit: kyllä (Tänään); muut: ei |
| `_lataaCoachActivity()` – havainnot per pelaaja (30 ensimmäistä) | ≤31 kyselyä | 4932–4957 | Ei (vain kun välilehti avataan, rivi 4920) |
| `_ohjLaskeN()` → **toinen koko `pelaajat`-luku** (ohjelmakirjaston N) | **+500** | 7264–7293 | Ei – vain Ohjelmat-näkymä |
| `harjoitepankki`, `konfiguraatio/*`, `valmennuslinja/*` | pieni | 7921–7961 | Vain jakson aloituksessa |

Summa osuu likimain mitattuun 2 499:ään (pelaajat 500 + sisainen ~500 + kirjaukset ~1 400 + pienet). **Tarkka erittely puuttuu** — instrumentointi laskee kokonaissumman; Pelaaja-sivun mittauksessa on jo `luvut`-erittely kokoelmittain, sama pitäisi saada Masteriin (P1).

Huomio: mittausrooli `talenttivalmentaja` ei rajaa joukkuetta → koko seura (500). Tosi valmentaja näkee oman joukkueen (~25 pelaajaa) → lukumäärä on silloin murto-osa. **Mittaus kuvaa pahinta tapausta**, ei tyypillistä valmentajaa. Onko talenttivalmentajan oletusnäkymä oikeasti koko seura? (P2)

### 1.2 Mikä tarvitaan heti, mikä ei

Heti (Tänään-näkymä): käyttäjä + seura + joukkueet, **oman joukkueen** pelaajat (nimi, numero, jakso, PHV), avoimet testit, viestit (20).
Voi odottaa: `sisainen`/terveys (vain avattaessa pelaajakortti), 14 pv kirjaussyöte (näkyy `_kirjauksetLadattu`-lipun takana), ohjelma-N, valmentaja-aktiviteetti, harjoitepankki.

Lisäksi: Master latautuu **kolmesta syystä raskaaksi** myös ilman Firestorea: inline-JS 702 kt + HTML 844 kt + 135 skriptiä (3,2 MB raakana, ~1,0 MB gzip) + xlsx.full.min.js (315 kt gzip, CDN) — 4,5 MB kokonaisuus selittyy tällä + SDK:illa; 42 s puhelimella on pääosin **tavumäärä × 200 kB/s**, ei lukuja (ks. 2).

### 1.3 Vaihtoehdot

| | A. Rajaus oman joukkueen pelaajiin heti + muut pyynnöstä | B. Laiska lataus välilehdittäin | C. Palvelinkooste (kuten VP:n `kooste/{vvvv-Www}`) | D. Sivutus (`limit`+`startAfter`) |
|---|---|---|---|---|
| Vaikutus lukuihin | 2 499 → ~100–400 valmentajalla; talenttivalmentajalla ei apua jos oletus = koko seura | `sisainen`, kirjaukset, ohjelma-N pois avauksesta: −2 000 | Syöte/koonti 1 dokumentista; −1 400 (kirjaukset) | Auttaa vain pitkiin listoihin; pelaajalistaa tarvitaan kokonaisena haulle/suodattimille |
| Vaikutus tavuihin/aikaan | Ei vaikuta JS-painoon | Ei vaikuta JS-painoon | Ei vaikuta JS-painoon | – |
| Riski | Pieni; `tmKanonisoiJoukkue`-logiikka on jo | Pieni–keskisuuri: näkymät olettavat `_pelaajatData`/`_kirjaukset` valmiiksi (§26-vahdit) | Keskisuuri: uusi funktio + Rules + takaisinlasku; syöte ei saa vuotaa nimiä (VP-kooste on vain lukumääriä) | Keskisuuri: sisäinen järjestys/suodatus ja `Promise.all`-erät |
| Työ | S | M | L | M |

**Suositus (PM päättää, P3):** B ensin (poista `sisainen`, `_lataaKirjaukset`, `_ohjLaskeN`, coach-aktiviteetti avauspolulta; käynnistä vasta näkymän avautuessa tai `requestIdleCallback`), sitten A (joukkuerajaus oletukseksi), C vain jos kirjaussyöte pitää säilyttää heti nähtävänä. D ei tuo tässä mitään. Arvio: luvut 2 499 → alle 600 (A+B) ilman uutta palvelinkoodia. Tavuongelmaa tämä ei ratkaise.

**Tavoitteen asetus (P4):** 2 000 lukua/avaus -raja (P11) on kirjattu *koko seuran* pahimmalle roolille; tarkennetaanko raja roolikohtaiseksi (valmentaja vs. talenttivalmentaja)?

---

## 2. Sivujen koko puhelimella

### 2.1 Mitattu: aika ≈ 5,9 s / MB

Slow 4G -kuristus = 200 kB/s + 150 ms viive. Mittauksissa: 1,4–1,5 MB → 8,2–8,8 s; 2,6 MB → 17,8 s; 4,5 MB → 42 s (CPU 4× lisää loppupäähän). **5 s -raja ≈ 0,7–0,8 MB kylmänä** (sisältää viiveet). Kehitystyöpöytä tekee 4 lukua mutta on 8,8 s → ongelma on kokonaan tavuissa, ei datassa.

### 2.2 Mistä megatavut tulevat (gzip, staattinen laskenta)

| Sivu | HTML+inline (gz ≈) | Paikalliset lib-skriptit (kpl, raaka → gz) | Firebase SDK (gz) | Muut ulkoiset | Mitattu |
|---|---|---|---|---|---:|
| Testaus | ~45 kt | 17 → 332 kt → 108 kt | 4 kpl ~157 kt | fontit | 4,7 s |
| **Kehitystyöpöytä** | ~25 kt | **105 → 2 573 kt → 815 kt** | 5 kpl ~170 kt (v10.7.1: firestore 101, auth 39, storage 13, app 9, appcheck 8) | Sentry 30 kt, fontit | 1,5 MB / 8,8 s |
| Seura | ~40 kt | 32 → 1 040 kt → 322 kt | 6 kpl (v9.22.0) | xlsx **315 kt**, Sentry 30 kt | 10,1 s |
| VP | ~420 kt (**inline-JS 1,58 MB raakana, CSS 176 kt**) | 123 → 2 972 kt → 952 kt | 6 kpl | tabler-icons-webfont (CDN), Sentry, fontit | 2,6 MB / 17,8 s |
| Master | ~200 kt (inline-JS 702 kt, CSS 82 kt) | 135 → 3 204 kt → 1 011 kt | 6 kpl (v9.22.1) | xlsx 315 kt, Sentry, fontit | 4,5 MB / 42 s |
| Pelaaja | ~110 kt | 63 → 1 908 kt → 587 kt | 5 kpl | Sentry, fontit | 1,4 MB / 8,2 s |

Kehitystyöpöydän staattinen summa: 815 + 170 + 30 + 25 ≈ **1,04 MB** vs mitattu 1,5 MB → ~0,45 MB selittämättä; todennäköisimmin **Google Fonts** (3 perhettä: Cormorant Garamond ×5 leikkausta, DM Sans ×4, DM Mono ×2, `display=swap`; jokainen leikkaus oma woff2) ja mahdollisesti ei-pakatut vastaukset. Ei kuvia, ei data-URI:ta (img-tageja 0–2) → **kuvat eivät ole syy**.

**Pääsyyt, suuruusjärjestyksessä:**
1. **Oma JS ~60–70 % tavuista.** Kehitystyöpöytä lataa 105 skriptiä (815 kt gz) 4 lukua tekevälle sivulle. Skripteissä ei ole `defer`/`async` (0 kpl) → jokainen blokkaa jäsennyksen.
2. **Kielipaketit ladataan aina kaikkina kielinä:** `tm_lang` 72, `tm_master_i18n` 38, `tm_lib_i18n` 35, `tm_teknistaktiset` 36 + `_sv` 34, `tm_eerikkila_normit` 42, `tm_i18n_common` 6 = **267 kt gz Kehitystyöpöydällä** (33 % sen lib-painosta); VP lisäksi `tm_vp_i18n` 101 kt gz. Pelkkä fi+käyttäjän kieli tuottaisi noin puolet.
3. **Firebase compat-SDK:t ~160–170 kt gz** (firestore-compat 101 kt on suurin; modulaarinen SDK olisi ~40–60 % pienempi, mutta vaatii build-työkalun).
4. **Ulkoiset kertaluonteiset:** xlsx 315 kt (Seura, Master – tarvitaan vain tuonnissa), Sentry 30 kt, tabler-icons (VP), Google Fonts.
5. **Pelaaja/VP/Master inline-JS** (413 / 1 582 / 702 kt raakana): ei välimuistiin eikä osiin jaettavissa ilman build-vaihetta; selaimen jäsennys + CPU 4× kasvattaa aikaa tavujen lisäksi.
6. **Välimuisti:** `Cache-Control: no-cache` (firebase.json) → toistokäynti tarkistaa jokaisen tiedoston (304), mutta lämmin latausaika on jo ok; kylmä (ensikäynti/vanhempi puhelimessa) on raja-arvon ongelma.

### 2.3 Nopein kevennys ilman build-työkalua

Kaikki alla tehtävissä käsin/skripteillä nykyisellä rakenteella; arviot Kehitystyöpöydälle (1,5 MB):

| # | Toimenpide | Säästö (gz) | Työ | Riski |
|---|---|---:|---|---|
| a | **xlsx lazy-load** (injektoi `<script>` vasta tuontinäkymässä) – Seura, Master | −315 kt Seura/Master | S | Pieni |
| b | **Kielipaketit vain tarvittavalle kielelle** (`tm_lang`, `*_i18n`, `teknistaktiset_sv` ladataan dynaamisesti kielen mukaan; fi oletus sivulla, en/sv haetaan) | −100…−130 kt Kehitys; −200 kt VP/Master | M | Keskisuuri: `masterT`-kutsut ennen latausta → vartija/render-gate (§i18n-render-gate) |
| c | **Käyttämättömien skriptien poisto sivulta** – tarkista Kehitystyöpöydän 105:stä, mitä oikeasti kutsutaan (`typeof`-ajoanalyysi/coverage) | −200…−400 kt arvio | M | Keskisuuri: piilokutsut |
| d | **`defer`** kaikille omille lib-skripteille (järjestys säilyy) + `preconnect` fonteille | Ei tavuja; −1…−2 s FCP/TTI-parannus | S | Keskisuuri: inline-koodi olettaa globaalit heti → testattava sivu kerrallaan |
| e | **Fontit:** 11 → 4–5 leikkausta (poista kursiivit/painot joita ei käytetä) tai oma-hostattu woff2-osajoukko (latin) | −100…−250 kt | S–M | Pieni (ulkoasun tarkistus) |
| f | **Sentry lataus `defer`/idle** (ei blokkaa) – 30 kt | −30 kt, parempi TTI | S | Pieni |
| g | **Firebase SDK:** pudota `storage-compat` (13 kt) sivuilta jotka eivät lataa tiedostoja; `functions-compat` vain jos kutsuu | −15…−25 kt | S | Pieni |
| h | **Hosting-vastausten Brotli** – Firebase Hosting tarjoaa jo gzip/brotli automaattisesti; tarkista `curl -H 'Accept-Encoding: br'` että .js saa Brotlin | −10…−15 % | XS | – |

Realistinen tulos ilman buildia (a–h Kehitystyöpöydälle): 1,5 → ~0,8–0,9 MB → ~5 s puhelimella; **5 s alle pääsy ei ole varmaa** ilman lisäksi c:n täyttä toteutusta. VP (2,6 MB), Master (4,5 MB) ja Seura eivät mahdu 5 sekuntiin ilman rakenteellista muutosta (inline-JS ei jaa osiin).

### 2.4 Mitä Vite-siirto toisi

| Hyöty | Arvio |
|---|---|
| Modulaarinen Firebase SDK (v10 modular, tree-shaking) | −80…−120 kt gz / sivu |
| Minifiointi (inline-JS 1,58 MB VP:ssä on lähes varmasti minifioimaton) | −40…−60 % raakakoko; gz −25…−35 % |
| Koodin jako (route/välilehti-chunkit, dynamic `import()`), kielipaketit omiksi chunkeikseen | Sivukohtainen kerta-ajo 0,3–0,6 MB; Master ~1,2 MB |
| Sisältötiivisteet tiedostonimiin (nykyinen §27.4-deploy-tiiviste on jo osittain tätä) → `immutable`-välimuisti, toistokäynti 0 pyyntöä | Lämmin käynti lähes 0 |
| Yksi bundle/sivu: pyyntöjä 100+ → 3–5 | Latenssivero (150 ms/rinnakkaisjono) pienenee |

Hinta: koko repo (HTML-inline-skriptit, `window.*`-globaalit, 135 skriptiä järjestysriippuvuuksineen, `tests/` jotka lukevat HTML:ää regexillä, bundler-templatet, SW-cache, `lib/`-jaettu VP/Master/Pelaaja) pitää muuntaa moduuleiksi — arvio **L–XL (viikkoja)** ja suuri regressioriski (muistissa: HTML-inline-script-muutokset ovat aiheuttaneet P0 mustan ruudun; vartijat/regex-testit nojaavat nykyiseen rakenteeseen). Hyöty suurin Mastarille/VP:lle, vähäisin Kehitystyöpöydälle.

**Suositus (P6):** tee a, e, f, g, h + d (sivu kerrallaan) nyt, mittaa uudelleen; Vite-päätös vasta tuloksen jälkeen. Jos VP/Master/Seura halutaan <5 s, Vite (tai vähintään minifiointi + inline-JS:n ulos tiedostoiksi) on käytännössä ainoa tie → erillinen suunnitteluprojekti.

---

## 3. Päätettävät kohdat (PM)

- **P1.** Lisätäänkö mittaukseen resurssikohtainen erittely (CDP `Network.loadingFinished`: url, koodattu/purettu koko, tyyppi) ja Masterin `luvut` kokoelmittain? Ilman sitä c-kohdan ja fonttiarvion luvut jäävät arvioiksi. Suositus: kyllä, pieni PR.
- **P2.** Onko talenttivalmentajan oletusnäkymä koko seura vai oma joukkue? Ratkaisee, onko 2 499 lukua oikea mittari vai pahin tapaus.
- **P3.** Masterin lukumäärän tie: B → A (suositus) vai C (palvelinkooste)?
- **P4.** P11-rajan 2 000 lukua/avaus tarkennus roolikohtaiseksi?
- **P5.** Kielipakettien dynaaminen lataus (2.3 b): hyväksytäänkö i18n-render-gate-riski, vai pidetäänkö fi-bundle mukana ja haetaan vain en/sv?
- **P6.** Sivukoon järjestys: kevennys a–h ensin, Vite-päätös mittauksen jälkeen (suositus) vai Vite-suunnittelu heti?
- **P7.** Mitkä sivut kuuluvat 5 s -vaatimukseen puhelimella (pelaaja = kyllä; VP/Master = työpöytäkäyttöön, puhelinraja ei koske)? Jos Master/VP:lle riittää työpöytä < 2 s, Vite-tarve pienenee.
- **P8.** Pitääkö 5 aiemmin mitattua sivua (Testaus, Kehitystyöpöytä, Seura, VP, Master) mitata uudelleen? Kyllä: `sivut.json` ylikirjoittui (korjaus PR #1269); luvut ovat Teron viestissä, mutta raakadata + Monitoring read_count -ikkuna ovat kadonneet. Uudelleenmittaus ~25 min (5 sivua × 2 profiilia × 5 toistoa) kun #1269 on mergetty, tai ajettava vanhalla skriptillä eri `--ulos`-tiedostoihin.

---

## 4. PM:n päätökset (12.11.2026)

| # | Päätös | Toteutus |
|---|---|---|
| P1 | Kyllä: resurssierittely + Masterin luvut kokoelmittain | PR #1271 (mittaa_sivut + raportti §3b/§3c) |
| P2 | Talenttivalmentajan oletus = oma joukkue + talenttiohjelma; koko seura suodattimesta | Masterin latauksen A-vaihe (oma PR) |
| P3 | B → A; C vasta tarvittaessa | Master-PR:t: ensin laiska lataus, sitten joukkuerajaus |
| P4 | Lukuja/avaus: 2 000 henkilökunta, 200 pelaaja ja huoltaja | `mittaus_lib.js` RAJAT (#1271) |
| P5 | fi aina mukana; sv/en ladataan dynaamisesti ENNEN renderiä | i18n-render-gate säilyy; osa kevennystä b |
| P6 | Kevennykset a–h ensin; Vite mittauksen jälkeen | Kehitystyöpöytä ensin (oma PR), sitten muut sivut |
| P7 | Puhelin < 5 s: Pelaaja, Vanhempi, Testaus, Kehitystyöpöytä. VP/Master/Seura: työpöytä < 2 s, puhelin < 10 s | `mittaus_lib.js` RAJAT (#1271) |
| P8 | Kyllä: 5 sivua mitataan uudelleen | Tero ajaa, kun #1271 on mergetty (resurssierittely mukaan) |

Huom. P2 muuttaa mittausta: mittausrooli `talenttivalmentaja` ei enää lataa koko seuraa oletuksena, joten Masterin lukuluku laskee jo ennen B-vaihetta; verrataan P8-uudelleenmittaukseen.
