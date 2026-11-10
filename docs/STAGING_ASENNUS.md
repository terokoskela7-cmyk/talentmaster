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
# (gcloud services enable ottaa käyttöön enintään 20 palvelua / komento; 24 palvelua → kaksi komentoa.)
# Deploy-tili EI saa ottaa API:a käyttöön itse, joten kaikki, mitä firebase-tools (15.x) deployssa yrittää enabloida, pitää olla jo päällä:
#   rules+storage → firestore, firebaserules, firebasestorage (storage-deploy hakee oletusbucketin) · functions → cloudfunctions, cloudbuild, artifactregistry,
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
  serviceusage.googleapis.com monitoring.googleapis.com logging.googleapis.com billingbudgets.googleapis.com firebasestorage.googleapis.com

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

# --- Budjetti 25 € (korvaa BILLING_ACCOUNT_ID; `gcloud billing accounts list`) ---
# --billing-project=$PROJECT_ID: ilman sitä gcloud käyttää oletusprojektia (tuotanto) kiintiö-/API-projektina.
gcloud billing budgets create --billing-project=$PROJECT_ID --billing-account=BILLING_ACCOUNT_ID --display-name="talentmaster-staging 25 EUR" \
  --budget-amount=25EUR --filter-projects=projects/$PROJECT_ID \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0

# --- Claude Codelle lukuoikeus mittaukseen (PR 3; korvaa oma tunnuksesi) ---
# gcloud projects add-iam-policy-binding $PROJECT_ID --member="user:SINUN_SÄHKÖPOSTI" --role=roles/monitoring.viewer
```

Functions-deploy luo myös Scheduler-ajot (europe-west1). Ensimmäisen deployn jälkeen työnkulku **pausettaa** ne; mittauksessa ne ajetaan käsin (`gcloud scheduler jobs run <nimi> --location=europe-west1 --project talentmaster-staging`).

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
2. Avaa `https://talentmaster-staging.web.app` → kirjautumissivu latautuu; selaimen konsolissa `firebase.app().options.projectId` = `talentmaster-staging`. Sentry on pois päältä (ei tapahtumia).
3. Kanava Playwright-mittausta varten (P4): sama työnkulku, kanava `kuorma` → URL muotoa `https://talentmaster-staging--kuorma-<tunniste>.web.app` (30 pv).
4. Kerro Claude Codelle → seuraava PR (generaattori). Sähköposti on estetty koodissa (`functions/sahkoposti_esto.js`, PR 0 (#1239) pitää olla mergattuna mainiin ennen stagingin functions-deployta, koska staging deployaa mainin koodin) ja avain on dummy.

## Siivous (P10)
Mittauksen jälkeen data poistetaan (generaattorin `--tyhjenna`, PR 2); infra jää. Budjettihälytys 25 €/kk seuraa kustannusta.
