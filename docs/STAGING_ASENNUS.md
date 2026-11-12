# Staging-projektin asennus (projekti 06, Teron askeleet)

Kohde: `talentmaster-staging`. PM:n päätökset P1–P12: `.briefit/projektit/06-staging-ja-kuormamittaus/VAIHE0.md`. Kaikki data on synteettistä; tuotantodataa ei kopioida (GDPR). **Avaimia ei luoda** (P9): GitHub kirjautuu Workload Identity Federationilla.

Ajoreitti: tee A (Console), B (gcloud), C (GitHub), sitten aja **Actions → Deploy Staging**. Kerro Claude Codelle vasta kun C on tehty.

## A. Console (käsin, kerran)

1. **Projekti.** Firebase Console → Add project → ID `talentmaster-staging` (ei Google Analyticsia).
2. **Laskutus.** Liitä Blaze-laskutustili (Functions 1st gen, Secret Manager ja Scheduler vaativat sen).
3. **Firestore.** Create database, Native mode, **sijainti `eur3`** (sama kuin tuotanto; ei muutettavissa jälkikäteen). Aloita production-säännöillä; CI deployaa oikeat.
4. **Storage.** Get started, oletusbucket **`europe-west1`** — **tee "Get started" LOPPUUN Consolessa** (hyväksy ehdot ja luo bucket). Pelkkä `firebasestorage.googleapis.com`-API:n enablointi ei riitä: ilman oletusbucketia rules-deploy kaatuu (`Firebase Storage has not been set up on project`). Tarkista, että Storage-sivulla näkyy bucket.
5. **Authentication.** Get started → Sign-in method: ota käyttöön samat tavat kuin tuotannossa (tarkista tuotannon Console: Email/Password, Google). Settings → Authorized domains: lisää `talentmaster-staging.web.app` ja `talentmaster-staging.firebaseapp.com`. Peilaa tuotannon salasanapolitiikka ja sähköpostipohjat (suomennokset).
6. **Hosting.** Get started (site-id `talentmaster-staging`).
7. **Web-sovellus.** Project settings → Your apps → Add app (Web), nimi `talentmaster-staging-web`. Kopioi `apiKey`, `appId`, `messagingSenderId` (näitä käytetään C-kohdassa; ne ovat julkisia web-konfiguraation arvoja, eivät salaisuuksia). **Rajaa API-avain** (Google Cloud Console → APIs & Services → Credentials): HTTP referrer `talentmaster-staging.web.app/*`, `talentmaster-staging--*.web.app/*`, `talentmaster-staging.firebaseapp.com/*`, `localhost/*`.
8. **App Check (P4).** Google Cloud Console → reCAPTCHA Enterprise → Create key: Website, **score-based**, domainit `talentmaster-staging.web.app` ja `talentmaster-staging.firebaseapp.com` (+ `talentmaster-staging--kuorma-*.web.app` jos sallittu; muuten debug-token riittää). Firebase Console → App Check → Apps: rekisteröi web-sovellus reCAPTCHA Enterprise -avaimella → **älä vielä pakota (Enforce) palveluita**; mittausvaiheessa tarvitaan vain tokenit. Luo **debug-token** (Manage debug tokens) ja tallenna se **vain** GitHubin Environment-secretiin `STAGING_APPCHECK_DEBUG_TOKEN` (ei muualle; mittaus PR 3). Site key (julkinen) → C-kohdan `STAGING_APPCHECK_SITE_KEY`.
9. **Budjettihälytys (P8).** Billing → Budgets & alerts → Create: koko `talentmaster-staging`-projekti, **25 € / kk**, hälytykset 50 / 90 / 100 %. (Komento B-kohdassa.)

## B. gcloud (kopioi–liitä; kirjaudu ensin `gcloud auth login`)

```bash
# --- muuttujat ---
export PROJECT_ID=talentmaster-staging
export REPO=terokoskela7-cmyk/talentmaster
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
echo "Projektinumero: $PROJECT_NUMBER"   # tarkista, että ei ole tuotannon numero 872561784446
test "$PROJECT_NUMBER" != "872561784446" && echo OK-eri-projekti

# --- API:t ---
# (gcloud services enable ottaa käyttöön enintään 20 palvelua / komento; 25 palvelua → kaksi komentoa.)
# Deploy-tili EI saa ottaa API:a käyttöön itse, joten kaikki, mitä firebase-tools (15.x) deployssa yrittää enabloida, pitää olla jo päällä:
#   rules+storage → firestore, firebaserules, firebasestorage (storage-deploy hakee oletusbucketin) · functions → cloudfunctions, cloudbuild, artifactregistry, cloudbilling (Firebase tarkistaa laskutuksen functions-deployssa),
#   cloudscheduler (SDK:n requiredAPIs ajastetuille; pubsub) ja secretmanager (secrets: SENDGRID_API_KEY, VALVONTA_VASTAANOTTAJA) · hosting → firebasehosting
#   · Scheduler-pause (gcloud) → cloudscheduler. runtimeconfig tarkistetaan vain (ei enabloida; functions.config() ei käytössä). Kaikki funktiot ovat gcfv1 → run/eventarc
#   eivät ole deployn vaatimus, mutta ne pidetään päällä (Cloud Run -pohjaiset v1-ajot ja mahdolliset v2-siirrot).
gcloud services enable --project $PROJECT_ID \
  firebase.googleapis.com firestore.googleapis.com firebaserules.googleapis.com firebasehosting.googleapis.com \
  cloudfunctions.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com run.googleapis.com \
  cloudscheduler.googleapis.com secretmanager.googleapis.com eventarc.googleapis.com pubsub.googleapis.com
gcloud services enable --project $PROJECT_ID \
  identitytoolkit.googleapis.com firebaseappcheck.googleapis.com recaptchaenterprise.googleapis.com \
  iamcredentials.googleapis.com sts.googleapis.com iam.googleapis.com cloudresourcemanager.googleapis.com \
  serviceusage.googleapis.com monitoring.googleapis.com logging.googleapis.com billingbudgets.googleapis.com firebasestorage.googleapis.com \
  cloudbilling.googleapis.com

# --- deploy-palvelutili (ei avaimia) ---
gcloud iam service-accounts create staging-deploy --project $PROJECT_ID --display-name="GitHub staging deploy (WIF)"
export DEPLOY_SA=staging-deploy@$PROJECT_ID.iam.gserviceaccount.com

# vähimmät roolit (ensimmäinen deploy voi paljastaa puuttuvan roolin: lisää virheilmoituksen nimeämä rooli, älä Owner/Editor)
for ROLE in roles/cloudfunctions.admin roles/iam.serviceAccountUser roles/firebaserules.admin roles/firebasehosting.admin \
            roles/datastore.indexAdmin roles/cloudscheduler.admin roles/secretmanager.viewer roles/artifactregistry.writer \
            roles/cloudbuild.builds.editor roles/run.admin roles/serviceusage.serviceUsageConsumer roles/firebase.viewer; do
  gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$DEPLOY_SA" --role="$ROLE" --condition=None --quiet >/dev/null
done

# --- Workload Identity Federation: vain tämä repo + Environment `staging` ---
gcloud iam workload-identity-pools create github --project $PROJECT_ID --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc github-oidc --project $PROJECT_ID --location=global --workload-identity-pool=github \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='$REPO' && assertion.sub=='repo:${REPO}:environment:staging'"
gcloud iam service-accounts add-iam-policy-binding $DEPLOY_SA --project $PROJECT_ID --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"

# GitHub-muuttujiin (C-kohta):
echo "STAGING_WIF_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-oidc"
echo "STAGING_DEPLOY_SA=$DEPLOY_SA"

# --- Functionsin salaisuudet: DUMMY-arvot (deploy vaatii, että secretit ovat olemassa; oikeaa sähköpostia/AI:ta ei käytetä, P6) ---
# LISTA = kaikki koodin runWith({ secrets }) -nimet (functions/*.js). Vartijatesti tests/staging_salaisuudet_ohje.test.js kaatuu, jos koodiin tulee uusi salaisuus eikä sitä ole tässä.
# VALVONTA_VASTAANOTTAJA: dummy on kelvollinen osoitemuoto (muuten valvonta lokittaisi vastaanottaja_puuttuu); staging ei lähetä oikeaa postia (sahkoposti_esto).
for S in SENDGRID_API_KEY ANTHROPIC_API_KEY AWS_BEDROCK_ACCESS_KEY_ID AWS_BEDROCK_SECRET_ACCESS_KEY VALVONTA_VASTAANOTTAJA; do
  case $S in VALVONTA_VASTAANOTTAJA) V='staging-ei-kaytossa@example.com';; *) V='staging-ei-kaytossa';; esac
  printf '%s' "$V" | gcloud secrets create $S --project $PROJECT_ID --replication-policy=automatic --data-file=-
  # luonti + oikeus AINA yhdessä: ajotili (<projekti>@appspot) tarvitsee secretAccessor; CI ei saa asettaa sitä itse (setIamPolicy 403) → CI-esitarkistus kaatuu ilman tätä
  gcloud secrets add-iam-policy-binding $S --project $PROJECT_ID --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" --role=roles/secretmanager.secretAccessor
done
# CI tarkistaa ennen functions-deployta (scripts/tarkista_salaisuudet.js), että jokainen koodin salaisuus on olemassa, sillä on versio ja ajotilillä on secretAccessor. Uusi salaisuus: docs/SECRET_MANAGER_MIGRAATIO.md "Uusi salaisuus".

# --- Ajotili saa allekirjoittaa custom-tokenit (pelaajan PalloID+PIN-kirjautuminen: createCustomToken → iam.serviceAccounts.signBlob) ---
# Ilman tätä pelaajan kirjautuminen kaatuu virheeseen iam.serviceAccounts.signBlob. Rooli annetaan ajotilille itselleen (Tero ajaa):
gcloud iam service-accounts add-iam-policy-binding $PROJECT_ID@appspot.gserviceaccount.com --project $PROJECT_ID \
  --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" --role=roles/iam.serviceAccountTokenCreator

# --- Budjetti 25 € (korvaa BILLING_ACCOUNT_ID; `gcloud billing accounts list`) ---
# --billing-project=$PROJECT_ID: ilman sitä gcloud käyttää oletusprojektia (tuotanto) kiintiö-/API-projektina.
gcloud billing budgets create --billing-project=$PROJECT_ID --billing-account=BILLING_ACCOUNT_ID --display-name="talentmaster-staging 25 EUR" \
  --budget-amount=25EUR --filter-projects=projects/$PROJECT_ID \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0

# --- Claude Codelle lukuoikeus mittaukseen (PR 3; korvaa oma tunnuksesi) ---
# gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:SINUN_SÄHKÖPOSTI" --role=roles/monitoring.viewer
```

Functions-deploy luo myös Scheduler-ajot — **us-central1:een** (funktiot ovat europe-west1:ssä, mutta Firebasen ajastukset eivät; sama kuin tuotannossa), sijainti us-central1, nimi `firebase-schedule-<funktio>-europe-west1` (pääte = funktion alue). Ensimmäisen deployn jälkeen työnkulku **pausettaa** ne; mittauksessa ne ajetaan käsin (`gcloud scheduler jobs run <nimi> --location=us-central1 --project talentmaster-staging`).

## C. GitHub

Settings → Environments → **New environment `staging`** (ei pakollista hyväksyjää). Environment variables (julkisia arvoja; kohdan A.7/A.8/B tulosteet):

| Muuttuja | Arvo |
|---|---|
| `STAGING_WIF_PROVIDER` | B-kohdan tuloste |
| `STAGING_DEPLOY_SA` | `staging-deploy@talentmaster-staging.iam.gserviceaccount.com` |
| `STAGING_API_KEY` | web-sovelluksen `apiKey` |
| `STAGING_APP_ID` | web-sovelluksen `appId` |
| `STAGING_SENDER_ID` | `messagingSenderId` |
| `STAGING_APPCHECK_SITE_KEY` | reCAPTCHA Enterprise site key (staging) |

Tuotannon secretejä (`FIREBASE_SA_KEY`, `FIREBASE_SERVICE_ACCOUNT*`) **ei** anneta staging-ympäristölle; `deploy-staging.yml` ei käytä yhtään `secrets.*`.

## D. Ensimmäinen deploy ja tarkistus

1. Actions → **Deploy Staging** → Run workflow: `rules` ✔, `functions` ✔, `hosting` ✔, kanava `live`. Työnkulku kaatuu heti, jos kohde ei ole `talentmaster-staging`, ja `scripts/staging_konfiguraatio.js` kaatuu, jos julkaistavaan joukkoon jäisi tuotannon arvo.
2. **Siivoussääntö Artifact Registryyn (kerran, ensimmäisen functions-deployn jälkeen).** Functions-deploy tekee kuvat `gcf-artifacts`-repoon, ja Firebase yrittää asettaa sille siivoussäännön. deploy-tunnuksella ei todennäköisesti ole siihen oikeutta (ei varmistettu), joten ajo päättyy virheeseen `could not set up cleanup policy in location europe-west1` (functionit deployataan silti). Aseta sääntö käsin omistajan tunnuksilla (repo syntyy vasta ensimmäisessä deployssa, joten aikaisemmin tämä ei onnistu):
   ```sh
   npx firebase functions:artifacts:setpolicy --project talentmaster-staging --location europe-west1 --days 1
   ```
   Poistaa yli 1 vuorokauden vanhat kuvat (ei kasvata laskua). Tuotannossa sama sääntö on jo (`firebase-functions-cleanup`, DELETE, olderThan 86400 s, tarkistettu 11.11.2026). Tarkistus (vain luku): `gcloud artifacts repositories describe gcf-artifacts --project talentmaster-staging --location europe-west1 --format="yaml(cleanupPolicies)"`.
3. Avaa `https://talentmaster-staging.web.app` → kirjautumissivu latautuu; selaimen konsolissa `firebase.app().options.projectId` = `talentmaster-staging`. Sentry on pois päältä (ei tapahtumia).
4. Kanava Playwright-mittausta varten (P4): sama työnkulku, kanava `kuorma` → URL muotoa `https://talentmaster-staging--kuorma-<tunniste>.web.app` (30 pv).
5. Kerro Claude Codelle → seuraava PR (generaattori). Sähköposti on estetty koodissa (`functions/sahkoposti_esto.js`, PR 0 (#1239) pitää olla mergattuna mainiin ennen stagingin functions-deployta, koska staging deployaa mainin koodin) ja avain on dummy.

## Siivous (P10)
Mittauksen jälkeen data poistetaan (generaattorin `--tyhjenna`, PR 2); infra jää. Budjettihälytys 25 €/kk seuraa kustannusta.

## E. Synteettinen aineisto (projekti 06 PR 2; Tero ajaa `! node …`)

Generaattori: `scripts/kuorma/generoi_aineisto.js`. Aineisto on selvästi synteettistä (`Testi Pelaaja S01-00001`, tunniste `SYNT-…`, seurat `kuorma_seura_NN`, ei sähköposteja) ja deterministinen: sama `--siemen` → sama aineisto.

1. **Kerran:** ADC:n quota-projekti stagingiin (lukko kaatuu muuten, koska se vertaa ADC:tä `--projekti`-arvoon): `gcloud auth application-default set-quota-project talentmaster-staging`. Ympäristömuuttujat `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` / `FIREBASE_CONFIG` joko tyhjiä (unset) tai `talentmaster-staging`.
2. **Kuiva-ajo (oletus, ei kirjoita):** `! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging` → dokumenttimäärät kokoelmittain.
3. **Savuaineisto (2 seuraa, 1 000 pelaajaa, ~165 000 dokumenttia, arvio kirjoituskulu alle 1 $):** `! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --aja`
4. **Tyhjennys (P10):** kuiva-ajo `… --tyhjenna`, poisto `… --tyhjenna --aja`. Koskee vain seuroja, joiden id alkaa `kuorma_` ja joilla `synteettinen: true`.
5. Lukko hyväksyy vain `talentmaster-staging[-x]` ja emulaattorin `demo-kuorma`; mikä tahansa muu (tai ristiriitainen lähde) kaatuu ennen Admin SDK:n alustusta.

Savuaineisto (2a) ei sisällä kalenteria eikä henkilökuntaa; ne tulevat profiileissa `savu_taysi`/`taysi` (kohta F).



## F. Täysi aineisto (projekti 06 PR 2b; Tero ajaa `! node …`)

Profiilit: `savu` (2a, ennallaan, sha-vartija) · `savu_taysi` (2 seuraa, 1 000 pelaajaa + kaikki alla, ~255 000 dok. + 20 Auth-tiliä) · `taysi` (40 seuraa, 10 000 pelaajaa, ~2,5 milj. dok. + 400 tiliä). Lisäosat: kalenteri + `lasnaolijat` (2 harjoitusta/viikko/joukkue), `kayttajat` (10 hlöä/seura) + Auth-tilit, `toimenpiteet` (ehdotukset + pulssit), **3 kautta suurimmalle seuralle** (20 pelaajaa: kirjaukset/viikkokatsaukset/havainnot/testitulokset 2024–2026 + `kausikuvat/2024,2025`), `jaksofokus_historia` (3-kauden pelaajilla 120 riviä, muilla 4–8; joukkueilla 3).

1. **ADC-quota:** ei tarvitse muuttaa globaalia ADC:tä. Käytä erillistä gcloud-konfiguraatiota: `export CLOUDSDK_CONFIG=~/.config/gcloud-staging; gcloud auth application-default login; gcloud auth application-default set-quota-project talentmaster-staging; export GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud-staging/application_default_credentials.json` (lukko lukee quota-projektin juuri tästä tiedostosta). Tuotannon admin-skriptien oletus-ADC jää koskematta.
2. Kuiva-ajo: `! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --profiili=savu_taysi` (näyttää myös `auth-tilit`).
3. Kirjoitus: `… --profiili=savu_taysi --aja`. Auth-tilit `*@kuorma.test` (uid `kuorma_…`, claims rooli+seuraId, emailVerified); **salasanat vain** `.briefit/staging_tunnukset.txt` (0600, gitignorattu; `--tunnukset=<polku>` vaihtaa). Toinen ajo ei luo tilejä uudelleen.
4. **SA stagingiin:** kirjaudu staging-sovellukseen kerran Google-tilillä → `! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --sa-sahkoposti=<osoite>` (kuiva) → lisää `--aja` (kirjoittaa `admins/{uid}`).
5. **Tyhjennys:** `… --tyhjenna` (kuiva: seurat + Auth-tilit) → `… --tyhjenna --aja`. Poistaa seurat `kuorma_` + `synteettinen:true` JA Auth-tilit `@kuorma.test` + uid `kuorma_`. `admins/{uid}` ja muut tilit eivät kosketa.
6. **Datalataus ilman triggereitä (suositus; Tero 11.11.2026):** kertymä-triggerit (`kertymaKirjausOnWrite`, `kertymaLasnaolijaOnWrite`, `kertymaTapahtumaOnUpdate`) lukivat ennen rajattua päivitystä (PR #1265) 74–148 dokumenttia per kutsu (riippui seuran koosta); rajatun version jälkeen ~14 (ei riipu seuran koosta). Arvio massakirjoituksesta nykykoodilla: `taysi` noin $23 yhteensä (luvut ~$15), `savu_taysi` noin $2; vanhalla koodilla ~$112 / ~$17. Generaattori tulostaa arvion ennen `--aja`:a. Poisto kannattaa silti: kulu 0 ja nopeampi lataus. Järjestys:
   1. Poista triggerit stagingista (lukko: vain `talentmaster-staging[-x]`, kiinteä 4 funktion lista, ei tuotantoa): `! node scripts/kuorma/poista_triggerit.js --projekti=talentmaster-staging` (kuiva-ajo tulostaa komennon: `npx firebase functions:delete kertymaKirjausOnWrite kertymaLasnaolijaOnWrite kertymaTapahtumaOnUpdate notifKalenteriViikko --project talentmaster-staging --region europe-west1 --force`) → lisää `--aja`.
   2. Datalataus: `… generoi_aineisto.js --projekti=talentmaster-staging --profiili=<savu_taysi|taysi> --aja`.
   3. Kertymien backfill (vain staging, vain synteettiset seurat, lukko): `! node scripts/kuorma/taydenna_kertymat.js --projekti=talentmaster-staging` (kuiva) → `--aja`. Lukee tapahtumat ja läsnäolijat kerran per seura+kausi (~1 luku/dokumentti), ei pelaajakohtaisesti; laskenta sama lib kuin triggereissä (pariteettitesti). Kyselyt ajetaan rinnakkain (32) ja ajo tulostaa edistymisen seuroittain ja kausittain (läsnäolijat/kirjaukset, %, sekunnit) 5 s välein sekä kokonaiskeston; kuiva-ajokin lukee kaiken (~187 000 lukua `savu_taysi`:lla), joten odota ~minuutti eikä kymmeniä minuutteja. Ensimmäinen versio ajoi kyselyt peräkkäin (~7 400 verkkokierrosta → yli 10 min ilman tulostetta).
   (Poistolistassa on myös `kertymaTapahtumaOnUpdate`: se laukeaa vain päivityksestä, mutta uusinta-ajo (`--aja` olemassa olevaa aineistoa vasten) päivittää tapahtumadokumentit ja laukaisisi sen — kukin laukaisu laskee kaikkien joukkueen pelaajien korit.)
   4. Palauta triggerit: GitHub → Actions → **Deploy Staging** (functions) → Run workflow.
   Jos triggerit jätetään päälle, kulu = generaattorin tulosteen arvio (ARVIO: hinnat+kesto oletuksia; kalibroitu mittauksella ±15 %, vartija `tests/kuorma_trigger_mittaus.test.js`). Uusinta-ajo (ylikirjoitus) laukaisee lisäksi `onUpdate`-triggerit.

## G. Mittausajo (projekti 06 PR 3; Tero ajaa `! node …`)

Rajat: P11 (`scripts/kuorma/mittaus_lib.js` → `RAJAT`): interaktiivinen työpöytä < 2 s kaikilla; puhelin (Slow 4G) < 5 s Pelaaja/Vanhempi/Testaus/Kehitystyöpöytä ja < 10 s VP/Master/Seura (P7, 12.11.2026); lukuja/avaus < 2 000 henkilökunta ja < 200 pelaaja/huoltaja (P4); funktio < 270 s (40 seuralla), pelaajadokumentti < 250 kt, infrakustannus < 1 €/pelaaja/vuosi. Tulokset kirjoitetaan `mittaus_tulokset/` (gitignore); raportti `docs/MITTAUSRAPORTTI_STAGING.md` generoidaan niistä (sisältää kokoelmakohtaiset luvut ja resurssityyppikohtaiset tavut: 1. kylmä avaus/sivu×profiili, 15 suurinta resurssia puhelimella). **Ensin `savu_taysi`; täysi aineisto vasta kun putki toimii.**

1. **Hosting-kanava `kuorma`:** GitHub → Actions → Deploy Staging → hosting ✔, kanava `kuorma` → URL `https://talentmaster-staging--kuorma-<tunniste>.web.app` (kanavan hostille `lib/tm_appcheck.js` sallii debug-tokenin).
2. **Sivut** (Playwright + Chrome; tarvitsee `STAGING_APPCHECK_DEBUG_TOKEN` ympäristöön — GitHub Secretin arvo, rekisteröity staging-App Checkiin; ei repoon, ei tulosteeseen):
   `STAGING_APPCHECK_DEBUG_TOKEN='…' ! node scripts/kuorma/mittaa_sivut.js --url=https://talentmaster-staging--kuorma-<tunniste>.web.app --tunnukset=.briefit/staging_tunnukset.txt --kuiva` (suunnitelma) → ilman `--kuiva`.
   Seura, VP, Master, Kehitystyöpöytä, Testaus, Pelaaja × työpöytä + puhelin (Slow 4G, CPU 4×) × 5 toistoa (kylmä + lämmin) ≈ 120 avausta; edistyminen tulostuu avaus kerrallaan. Tunnukset: seura 1 (suurin, 500 pelaajaa) rooleilla vp / talenttivalmentaja / valmentaja1; salasanat vain muistiin. **Pelaaja** kirjautuu PalloID + PIN:llä (`pelaajaKirjaudu` → custom token, sama polku kuin Pelaaja_v7): luo tunnus ensin `! node scripts/kuorma/generoi_aineisto.js --projekti=talentmaster-staging --profiili=savu_taysi --vain-pinit` (kuiva) → `--aja` (tai `--pin-pelaaja` generoinnin mukana). Per seura 1 pelaaja (ikä ≥ 10), `suostumusTila:'annettu'`, normalisoitu `palloId` (`SYNT` + seura + nro; väliviivaton, koska kirjautumisfunktio poistaa väliviivat ja hakee tarkalla vastaavuudella), PIN-hajautus `_pelaajaPin`; PIN (6 num.) vain tunnustiedostoon riville `pelaaja.sNN@kuorma.test` (5. sarake PalloID). Rivi säilyy → toinen ajo ei vaihda PIN:iä. Jos riviä ei ole, pelaaja-sivu mitataan kirjautumattomana ja ajo varoittaa. `--tyhjenna` poistaa myös `_pelaajaPin/kuorma_…`-hajautukset ja pelaajien Auth-tilit (`pel_kuorma_…`). Tarvitsee `palloId`-kokoelmaryhmäindeksin stagingissa (`firestore.indexes.json`, kuten tuotannossa).
   Osa-ajo (`--sivut=pelaaja`) **yhdistyy** aiempaan `--ulos`-tiedostoon sivu×profiili-pareittain (sama isäntä/seura/toistot); sama pari korvataan, muut säilyvät. Aja `mittaa_monitoring.js` uudelleen osa-ajon jälkeen (monitoring-lohko nollautuu).
3. **Monitoring read_count** (muutaman minuutin viiveellä): `! node scripts/kuorma/mittaa_monitoring.js --projekti=talentmaster-staging --tulos=mittaus_tulokset/sivut.json` (laskutuksen totuus; instrumentoitu summa vertailuun).
4. **Ajastetut funktiot** (käsin Schedulerista, 3 ajoa/funktio): `! node scripts/kuorma/mittaa_funktiot.js --projekti=talentmaster-staging --profiili=savu_taysi` (kuiva) → `--aja` (+ `--kaikki` laskutus/notif*). Sitten muisti: `! node scripts/kuorma/mittaa_monitoring.js --projekti=talentmaster-staging --funktiot=mittaus_tulokset/funktiot.json`. `tasoHaeMaatcheck` on kommentoitu pois `functions/index.js`:stä → ei mitata. Ensimmäinen ajo voi olla kylmäkäynnistys (merkitty `*`).
5. **Dokumenttikoot:** `! node scripts/kuorma/mittaa_dokkoot.js --projekti=talentmaster-staging --aja` (lukee ~1 luku/dokumentti; `--offline=<profiili>` laskee generaattorin datasta ilman verkkoa).
6. **Raportti:** `node scripts/kuorma/mittaus_raportti.js --pelaajia=1000 --seuroja=2` → `docs/MITTAUSRAPORTTI_STAGING.md` (jokainen mittari vs. P11 + ensimmäiseksi pettävä kohta; savuaineistolla funktioiden 40 seuran luku on lineaarinen ekstrapolaatio, merkitty).
