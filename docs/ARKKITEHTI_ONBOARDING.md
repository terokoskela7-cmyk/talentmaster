# Arkkitehdin onboarding — TalentMaster™ (2026-07-02)

> Tervetuloa. Tämä on "aloita tästä" -dokumentti. Rooli: **infra-migraatio (GitHub Pages → Firebase Hosting) + koodin modularisointi.** Malli: **rinnakkainen** — pilottifeaturet jatkuvat samaan aikaan (brief → koodi → CI → live-verify oikealla pilottidatalla). Tämä dokumentti suojaa tuotteen ja bisneslogiikan siirtymän aikana.
> Kaikkein tärkein tiedosto: **`CLAUDE.md`** — se on domain-logiikan ja invarianttien ainoa totuuslähde. Lue se ensin. Alla oleva on kartta + migraation pelisäännöt.

## 0. Ydinperiaate migraatiolle
**Strangler, ei big-bang.** Migroi inkrementaalisti pilottia jäädyttämättä. `lib/`-domain-logiikka on jo framework-riippumaton + Vitest-testattu → se on kruununjalokivi, säilytä testit. Älä kirjoita bisneslogiikkaa uudelleen — kääri ja siirrä.

## 1. Repo-kartta (täysi luettelo: CLAUDE.md §8)
- **Roolikohtaiset HTML-monoliitit** (Vanilla JS IIFE, ei build-työkaluja): `TalentMaster_VP_v25.html` (VP-dashboard, kanoninen), `_Master_v16` (valmentaja), `_Pelaaja_v7`, `_Vanhempi_v2`, `_Seura`, `_Admin`, `_Excel_Tuonti`, `_Testaus_v9`, `_ADAR_Pikakortti` (bundler).
- **`lib/`** — domain-logiikka, framework-riippumaton, testattu: `tm_eerikkila_normit.js` (normit + indeksit SSOT), `tm_bioika.js` (Mirwald/PHV), `tm_kalenteri.js`, `harjoitelogiikka_v4.js` (juuressa), ym.
- **`docs/`** — kanoniset speksit + indeksilaskenta (`testit_indeksit.js`, `kehitysvaihe_tavoitetasot.js`) + kaikki CODE_TASK-briefit.
- **`functions/`** — Cloud Functions (Node 22, **europe-west1**).
- **`tm_admin/firestore.rules`** — Security Rules (deployataan **Consolesta**, ei CI:llä).
- **`tests/`** — Vitest (421 testiä: indeksit + eerikkilä + rules + regressiot) + CI `.github/workflows/`.

## 2. Säilytettävät invariantit (EIVÄT saa hävitä migraatiossa)
Nämä ovat **bisneslogiikkaa/kompleksisuutta, ei toteutusdetaljia** — jokainen on maksettu bugilla. Täysi lista CLAUDE.md §7/§11/§12/§26.
- **Backend-sijainnit:** Firestore **eur3** (≠ europe-west1), Cloud Functions **europe-west1** (`firebase.app().functions('europe-west1')`, EI `firebase.functions()`). Storage europe-west1.
- **Pikakenttä-arkkitehtuuri (§26):** raakadata Firestoreen, indeksit lennossa; dashboardit lukevat **pikakentät** (esim. `hh_viimeisin`, `tki_viimeisin`, `phv_tila`) — **EI alikokoelmakyselyjä renderöinnissä.** Pikakentät kirjoitetaan tuonnissa/recalcissa.
- **§7.22 — lapsinäkymä:** pelaajalle EI numeroita/vertailua/rankingia/XP:tä. §28 — pre-PHV matala fyysinen = neutraali, ei negatiivinen.
- **Metodologia-invariantit:** TSI = `sm_pallo − sm_juoksu` (§22), MAS km/h→m/s ÷3.6, Mirwald-vakiot MyE.Way-pariteetti, kehitysvaihe-taso vain fyysisille testeille (§34). Nämä ovat verifioituja lukuja — ei arvattavia.
- **Rules Consolesta**, ei GitHub Actionsilla (403). Rules-kenttänimet = koodin kenttänimet.
- **Secret Manager** API-avaimille (§13), ei plaintext-env.
- **Super-admin** `super_admin` (alaviiva), tunnistus `admins/{uid}` exists.
- **Domain-lib on SSOT:** normit `tm_eerikkila_normit.js`, älä duplikoi. `src/lib`-kopiot ovat re-exportteja (§A6) — kanonisoi migraatiossa, älä haaraa.

## 3. Nykytila + kehityssilmukka
- **Pilotti live:** SJK (n=61, H-H+TKI+PHV ~8), Sibbo (TKI), + rosterit. Datankeruu käynnissä.
- **Kehityssilmukka (säilytä tämä):** kirjallinen brief (`docs/CODE_TASK_*.md`) → koodi → **CI-portit** (Vitest + ESLint no-undef inline-vartija §60 + Rules-testit) → **live-verify oikealla pilottidatalla** (selain + Firestore-luku). Tämä ketju nappasi tällä viikolla 3 oikeaa bugia ennen käyttäjää (tab-clip 36px, TSI-fallback, hh_pvm-drift).
- **CI/automaatio:** Vitest + Rules-testit (Java-emulaattori), versio-bump automaattinen mainissa (`bump-version.yml`, `[skip ci]`), N1 backup + N2 kustannushälytys + N3 branch protection + N4 rules-deploy.
- **Cache:** GitHub Pages ~10 min + `?v=`/`APP_VERSION`-reload-pakotus. **Firebase Hosting korvaa tämän paremmalla cache-kontrollilla** — huomioi migraatiossa.

## 4. Migraatiosekvenssi (ehdotus, strangler)

### A. Firebase Hosting (GitHub Pages →)
1. **Rinnakkaishosting ensin:** deploy sama sisältö Firebase Hostingiin, verifioi (auth, CF-kutsut europe-west1, Firestore eur3, SW-scope) ennen DNS-cutoveria. GitHub Pages pysyy kunnes Hosting todettu.
2. **Voitot:** security headers (CSP), **App Check** (§33 auki), atominen deploy, selkeä cache-kontrolli (korvaa `?v=`-kikan), DPA. Sama ekosysteemi (Firebase) → vähemmän liikkuvia osia.
3. **SW/PWA-scope** (`/talentmaster/`) muuttuu juureen Hostingissa → päivitä `sw_*.js` allowlist + manifest-polut (§27.4). Testaa offline-first pilottikäyttäjillä.
4. **DNS-cutover** talentmasterid.com viimeisenä, kun Hosting verifioitu.

### B. Modularisointi (Vite/strangler, §33 B1)
1. **`lib`-first:** domain-lib on jo eristetty + testattu → ensimmäinen TS-migraation kohde (arvioija oikeassa: dokumentoidut bugit = juuri TS:n kiinniottamaa luokkaa). Säilytä Vitest-kattavuus.
2. **Roolikohtaiset HTML:t** kääritään moduuleiksi asteittain (yksi rooli kerrallaan), ei kerralla. Aloita vähiten muuttuvasta; VP_v25/Master ovat aktiivisimman featuretyön alla → migroi ne **koordinoidusti** (ks. §5).
3. Älä poista `?v=`-versiointia ennen kuin Hosting-cache + moduulibuild korvaavat sen.

## 5. Rinnakkaistyön koordinointi (kriittisin osa)
Pilottifeaturet jatkuvat samaan aikaan → estä törmäykset:
- **Haarautuminen:** arkkitehti tekee infra/migraatiotyön omilla haaroilla; feature-PR:t (Code) jatkuvat. **Älä muokkaa samaa tiedostoa samanaikaisesti.** Aktiivisimmat feature-tiedostot juuri nyt: `TalentMaster_VP_v25.html`, `docs/*.js`-indeksit.
- **Freeze-ikkuna:** kun migroit tietyn tiedoston moduuliksi, ilmoita → feature-työ siihen tiedostoon tauolle sen ajaksi. Lyhyet ikkunat, ei koko repon jäädytystä.
- **CLAUDE.md pidetään ajan tasalla molemmin puolin** — se on jaettu totuuslähde. Migraatiopäätökset kirjataan §33:een.
- **CI-portit suojaavat molempia:** kaikki PR:t läpi Vitest + lint + (Rules-testit). Älä ohita portteja migraation aikana — ne ovat turvaverkko.
- **Live-verify säilyy:** kun infra muuttuu (Hosting), aja sama live-verify oikealla pilottidatalla ennen cutoveria.
- **Versio-bump automaatio** (`bump-version.yml`) — älä käsin-bumppaa (juurisyy #53). Jos Hosting muuttaa versiointimallia, päivitä workflow.

## 6. EI-riko-checklist (nopea)
- [ ] Cloud Functions pysyvät **europe-west1**, Firestore **eur3**.
- [ ] Pikakenttä-arkkitehtuuri (§26) säilyy — ei alikokoelmakyselyjä renderöinnissä.
- [ ] `lib/`-domain-logiikan Vitest-testit vihreät migraation jälkeen.
- [ ] §7.22 lapsinäkymä + §28 pre-PHV-neutraalius ennallaan.
- [ ] Rules Consolesta, kenttänimet = koodi.
- [ ] SW-scope + offline-first toimii Hostingissa.
- [ ] Auth (Google Sign-In SA + Anonymous PIN pelaaja) toimii uudella hostilla.
- [ ] Secret Manager -avaimet, ei plaintextiä.

## 7. Peritty tekninen velka (§33 — arkkitehdin reviiri)
- **B1 frontend moduuleiksi** (Vite/strangler) — nyt käynnissä.
- **Firebase Hosting** — nyt käynnissä.
- App Check -aktivointi (Hosting-yhteydessä luonteva).
- 1st-gen → v2 Cloud Functions -migraatio (Node 22 tehty).
- Single-source `src/lib`-duplikaattien kanonisointi (§A6).
- Avoimet datakorjaukset: `hh_pvm`-drift-backfill (`docs/CODE_TASK_VP_SYVANAKYMA_KORJAUSPAKETTI.md` P0) — koordinoi kumpi ajaa.

## 8. Kontaktit / totuuslähteet
- **Domain + invariantit:** `CLAUDE.md` (+ `docs/`-kanoniset: KPI_MASTER_ARCHITECTURE, TKI_ANALYYSIMALLI, KALENTERI, BIOBANDING, SKAALAUTUVUUS_JA_TEKNINEN_VELKA).
- **Tuote + metodologia:** Tero (perustaja, Palloliiton ohjelmajohtaja).
- **Featuretyön ketju:** brief (`docs/CODE_TASK_*`) → Code → CI → live-verify.
