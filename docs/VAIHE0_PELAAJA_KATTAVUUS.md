# Vaihe 0 — Pelaajan kattavuus: mitkä skriptit voi viedä pois auth-polulta (28.11.2026, vain selvitys — EI koodia)

Tavoite: Pelaajan TTI 7,7 → < 5 s (`docs/KYLMA_AVAUS_DIAGNOOSI.md` §19.7). Käyttövalmius = auth-haun alku (5,9 s) + ~1,8 s, ja auth alkaa vasta kun **kaikki** skriptit on ladattu ja ajettu (`_initFirebase()` on `DOMContentLoaded`issa; deferatut skriptit ajetaan ennen sitä). Tämä dokumentti kertoo, mitkä skriptit eivät kuulu kirjautumisen / ensimmäisen näkymän polulle, ja arvioi hyödyn. Yhteissuunnitelma modulaarisen Authin kanssa: `docs/VAIHE0_PELAAJA_TTI_YHTEISSUUNNITELMA.md`.

**Merkinnät:** *mitattu* = ajettu tässä selvityksessä oikealla Chromella; *staattinen* = luettu koodista (grep/viiteanalyysi, ei ajettu); *arvio* = laskettu; *vahvistettava* = vaatii Teron staging-ajon (§5).

## 1. Mitä mitattiin (ja mitä ei)

*Mitattu (paikallinen, ei stagingia, ei tunnuksia):* Pelaajan **deploy-muoto** (`tests/helpers/deploy_muoto.mjs`: pääskripti + P6 irrotettuna, kaikki defer), oikea Chrome (390 px), **oikea Firebase-compat-SDK** `node_modules`ista, verkko estetty, V8-block-kattavuus (`page.coverage`) + `kattavuus_skriptit.js`:n oma analyysi (`analysoi`, sama luokitus). Näkymä: **kirjautumisnäkymä (PIN-pad) + sivun kotinäkymän staattinen kuori**; auth ei etene (ei tunnusta).

*Ei mitattu:* kirjautunut **Tänään-näkymä oikealla datalla** (Firestore-luvut → renderöinti → mitkä funktiot ajetaan). Kattavuusskripti (`--sivu=pelaaja`) tukee sitä jo: kirjautuu PIN-tunnuksella (`pelaajaKirjaudu` → custom token) ja avaa sivun kirjautuneena — se vaatii stagingin ja tokenin → Teron ajo (§5). Tämän dokumentin Tänään-arviot ovat siksi **staattisia ja vahvistettavia**.

*Tulos (mitattu, login-näkymä):* 63 omaa skriptiä, 669 kt gz (gzip-6, paikallinen; tuotannon br pienempi). **EI_KUTSUTTU 34 kpl / 336 kt gz**, KAYTOSSA 29 kpl / 333 kt gz. SDK:t (compat 9.22.1, gz-6: app 9 + app-check 7 + auth 37 + firestore 98 + functions 3 = **154 kt**) ja Sentry-CDN tulevat tämän päälle. Skriptilataus A/B 28.11.: koodattu 788 kt.

> EI_KUTSUTTU ≠ turvallisesti siirrettävissä (kattavuusskriptin oma varoitus): ylätason sivuvaikutus (rekisteröinti, `window`-asetus) ajettiin silti; ja login-näkymässä ei-kutsuttu voi olla Tänään-näkymän tarvitsema. Siksi ryhmittely alla on kaksivaiheinen: mitattu login-tulos + staattinen viiteanalyysi (pääskriptin viitteet kirjaston julkisiin nimiin, `typeof`-vartioidut viitteet).

## 2. Ryhmät (gz kt = paikallinen gzip-6)

| Ryhmä | Skriptit | gz kt | Peruste | Luokka |
|---|---|---|---|---|
| **K1 Kielipaketti-malli** — fi-käyttäjä ei tarvitse (malli: `tm_lang_sv/en` ovat jo `type=text/plain data-tm-kielipaketti` + latausvalinta, §19.6) | `lib/tm_lib_i18n.js` 35,6 (sv-kartta kirjastojen FI-avaimille; login-näkymässä `tmLibT` kutsutaan 2×, 99 % tavuista dataa), `lib/tm_teknistaktiset_sv.js` 34,7 (100 % dataa, 0 funktiota), `lib/tm_tt_sv_valinta.js` 2,1 | **72,4** | *mitattu* data/ei-kutsuttu; *staattinen*: pääskripti käyttää `window.tmLibT` / `TM_TT_SV` `typeof`-vartioituna (`_p7K1T`, rivi ~1313) — **vahvistettava**: kaikki lukupaikat (myös libit) kestävät puuttumisen fi-tilassa | **Matala riski**, sama malli kuin jo toteutettu |
| **K2 Näkymäkohtaiset** — avataan vasta navigoinnista, ei Tänään-polulla | `lib/tm_teknistaktiset.js` 36,9 (konseptikortti; 97 % dataa), `lib/tm_eerikkila_normit.js` 42,6 + `docs/testit_indeksit.js` 20,5 (normit/testitasot; datataulukot), `lib/tm_kehityskaari.js` 17 (Kehitys-näkymä), IDP/Tavoitteet: `tm_idp` 13,3 + `tm_idp_pelaaja` 3,7 + `tm_idp_pelaaja_dok` 3,1 + `tm_tukitavoitteet` 12,7 + `tm_joukkuejakso` 10,7 + `tm_taman_tueksi` 3,6 + `tm_pelialy_yksilo` 9,5 | **173,6** | *mitattu*: login-näkymässä 0–1 funktiota kutsuttu; *staattinen*: pääskriptin viitteet näihin ovat näkymäfunktioissa (Kehitys/Tavoitteet/Testit/Konsepti) — **vahvistettava kirjautuneella ajolla** (Tänään voi käyttää esim. `tmAdarBand`, `tmPhvTila` — tarkistettava) | **Keskiriski**: jokainen erä tarvitsee `typeof`-vartion + selaintestin deploy-muodossa (malli Master L2 / `tm_laiska_kirjastot.js`) |
| **K2b Media/klippi** | `tm_mediaviesti` 14,3 (rekisteröi `REKISTERIT` ylätasolla → sivuvaikutus), `tm_klippi_perhe` 7,1, `tm_reitin_valinta` 7,0 | 28,4 | *mitattu*: mediaviesti 3/43 funktiota ajettu (rekisteröinti); muut 0 | **Korkeampi riski** (sivuvaikutus); myöhemmin |
| **K3 Pidä (boot + Tänään)** | pääskripti 123,6; `harjoitelogiikka_v4` 73,2 (HARJOITEPANKKI/`generoiMiksiteksti` — Tänäänin harjoitevalinta; 47 viitettä pääskriptissä); `tm_lang` 27,2; `tm-microcycles` 16,5; `tm_appcheck` 3,9; `tm_verkko` 1,5; `tm_liput`; `tm_viikko`; `tm_tanaan_kentta` 5,8 + `tm_kentta`/`kentta_spec`/`kaavio_*`/`tm_piirros`/`konsepti_resolve` (Tänään-kenttä); `tm_phv_tila`; `tm_normisto`; `tm_koti_luvut`; `tm_viikkokatsaus`; `tm_ennatykset`; kalenteri/ilmoitus; harjoituskertymä | ~330 | *staattinen*: Tänään-polun kirjastoja; `harjoitelogiikka_v4` on login-näkymässä ei-kutsuttu mutta 75,9 % ylätason dataa (`KETJUT`, `_ikatyyppi`) jota Tänään tarvitsee | Pysyy; ks. §3 vaihtoehto B |
| **K0 Demo** | `tm-demo.js` 3,5 (aktiivinen vain `?demo`) | 3,5 | *mitattu*: 0/24 funktiota (+ `?demo`-portti koodissa) | Triviaali: lataa vain `?demo`-polulla |

## 3. Hyöty (arvio — vahvistettava A/B:llä)

Hyötymalli: **~0,5 s / 100 kt gz ennen authia** (KYLMA_AVAUS §19.3). Sanity-tarkistus: puhelinprofiilin kuristus on 1,6 Mbit/s ≈ 200 kB/s → 790 kt koodattua ≈ 4,0 s siirtoaikaa; auth-haun alku on 5,9 s, eli kaistavoittoinen malli on realistinen (loppu = RTT:t + CPU 4×). Tuotannon oikea mobiiliyhteys voi olla nopeampi tai hitaampi; profiili on **synteettinen**.

| Vaihtoehto | Pois auth-polulta | Arvio auth-haun alku | Arvio TTI | Huomio |
|---|---|---|---|---|
| **A. K1** | 72 kt | 5,9 → ~5,5 s | 7,7 → ~7,3 s | matala riski, nopea; vain fi-käyttäjille (sv/en lataa paketit kuten nyt) |
| **A+. K1 + K2** | ~246 kt | → ~4,7 s | → ~6,5 s | K2 vahvistettava Tänään-ajolla; erinä ~100 kt (§4) |
| **A++. K1 + K2 + K2b + K0** | ~278 kt | → ~4,5 s | → ~6,3 s | K2b riskialtis |
| **B. Kaksivaiheinen lataus** (auth ennen kirjastoja): vaihe 1 = SDK + `tm_appcheck` + `tm_lang` + pääskripti (+P6) ≈ 154 + 4 + 27 + 128 ≈ **~310 kt gz**; vaihe 2 = loput kirjastot ladataan taustalla kun auth-haku on jo käynnissä; Tänään-render odottaa vaiheen 2 Tänään-kirjastot (~150 kt) | ~480 kt | → ~3,5 s | → ~5,3 s (TTI ≈ auth + ~1,8 s, mutta Tänään-kirjastot ehtivät rinnakkain) | **suurin vipu, suurin riski** — pääskriptin ylätason riippuvuudet kirjastoihin selvitettävä (§4) |

Laskuesimerkki B: kaista ~200 kB/s → vaihe 1 ~1,6 s siirtoa + RTT:t + CPU ≈ auth alkaa ~3,5 s (nyt 5,9 s). Vaihe 2 (~480 kt ≈ 2,4 s) kilpailee samasta kaistasta auth/Firestore-pyyntöjen kanssa, mutta ne ovat pieniä; Tänään-kirjastot (~150 kt ≈ 0,75 s) ehtivät ennen Firestore-vastausta (~1,8 s auth-alun jälkeen). **Epävarmuus ±1 s** — tämä on hypoteesi, ei lupaus.

**Mikä EI riitä yksin:** A+ → TTI ~6,5 s. Alle 5 s vaatii joko B:n tai A+ ja modulaarisen Authin (−0,7 s, `VAIHE0_PELAAJA_MODULAARINEN_AUTH.md`) ja lisäksi lisää tavuja pois (SDK:t 154 kt on suurin yksittäinen erä). Ks. yhteissuunnitelma.

## 4. Toteutus erinä (kun päätetty; jokainen oma PR + A/B)

1. **K1** — `tm_lib_i18n` + `tm_teknistaktiset_sv` + `tm_tt_sv_valinta` kielipaketti-malliin (`type=text/plain data-tm-kielipaketti`, olemassa oleva latausvalinta; sv/en lataavat ennen käynnistyskoodia kuten nyt). Testit: deploy-muoto fi/sv/en — sama PIN-näkymän teksti, ei uusia sivuvirheitä, sv-käännökset (`tmLibT`) toimivat sv-tilassa; `i18n`-vartijat/sv-baseline ennallaan.
2. **K2 erä 1** (`tm_teknistaktiset` + `tm_kehityskaari` + `testit_indeksit` + `eerikkila_normit`, ~117 kt) → laiska ryhmä (malli Master L2): latautuu klikkauksesta tai idlessä; `typeof`-vartiot; deploy-muodon selaintesti avaa näkymän ja tarkistaa sisällön. Erä 2 = IDP/Tavoitteet-ryhmä.
3. **B-prototyyppi** (ensin selvitys, ei merge): (a) staattinen skannaus — mitä pääskriptin **ylätaso** (ei funktioiden sisus) lukee kirjastoista ennen `DOMContentLoaded`ia; (b) deploy-muodon selaintesti jossa pääskripti ajetaan *ennen* kirjastoja ja `_initFirebase` + `onAuthStateChanged` käynnistyy; (c) A/B (`--sivut=pelaaja --profiilit=puhelin`).
4. **K0** — `tm-demo.js` vain `?demo`-polulla (3,5 kt; voi mennä K1:n kanssa samaan PR:ään, jos testi kattaa).

SW (`sw_pelaaja.js`): jokainen laiskasti ladattava kirjasto on jo allowlistissä polulla (kuten nyt); uusia polkuja ei tule. Offline-avaus: laiska ryhmä ei saa jäädä lataamatta offlinessa → SW-testi laajennettava (ryhmät esilatautuvat SW-cacheen kuten Masterin L2).

## 5. Teron ajo (tarvittaessa) — kirjautunut Tänään-kattavuus

Token vain `read -s` + `export` (ei komentoriville):

```
read -s STAGING_APPCHECK_DEBUG_TOKEN; export STAGING_APPCHECK_DEBUG_TOKEN
node scripts/kuorma/kattavuus_skriptit.js --url=https://talentmaster-staging--kuorma-b-<tunniste>.web.app --sivu=pelaaja --profiili=puhelin --seura=1 --lisaodotus=6000 --ulos=mittaus_tulokset/kattavuus_pelaaja
```

Tarvitsee pelaajatunnuksen `.briefit/staging_tunnukset.txt`:ssä (`generoi_aineisto.js --pin-pelaaja`). Tulos: `kattavuus_pelaaja/kattavuus.json` — luokat EI_KUTSUTTU / VAHAN / KAYTOSSA **Tänään-näkymälle oikealla datalla**; vahvistaa K2:n ja K3:n rajan. Rajoitus: skripti avaa vain kirjautuneen aloitusnäkymän (ei klikkaa muihin näkymiin) → "näkymäkohtainen" tarkoittaa "ei kutsuttu Tänäänissä", ei "käytetty muualla" (se tulee viiteanalyysista). Kirjautumisnäkymän kattavuus (PIN, ennen authia) on jo mitattu paikallisesti (§1) — skripti ei tue kirjautumatonta ajoa (vaatii tunnuksen).

## 6. Riskit ja avoimet

- **Mittausprofiili ≠ tuotanto:** staging käyttää App Check -debug-tokenia → ei reCAPTCHA Enterprise -latausta. Tuotannon kylmällä avauksella (ei tokenia) reCAPTCHA (~353 kt gz, `tm_appcheck.js` A1) latautuu ensimmäisessä backend-kutsussa → oikea ensikäynti on hitaampi kuin A/B näyttää; kirjaston poisto auth-polulta auttaa silti samassa suhteessa.
- **Ylätason sivuvaikutukset** (rekisteröinti `window`-asetuksina) → jokainen erä typeof-vartioilla + deploy-muodon testillä; `tm_mediaviesti` erikseen.
- **Pelaajalla ei ole laiskoja portteja nyt** (§19.6) → laiska-malli on uusi infrastruktuuri Pelaajalle (#1328-oppi: portit `DOMContentLoaded`issa, testit deploy-muodossa).
- Ei kosketa: PIN/kutsulinkki, SW-päivitys, sv-tekstit (K1 vain siirtää lataushetkeä).
