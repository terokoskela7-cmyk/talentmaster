# Secret Manager -migraatio — API-avaimet plaintext-env-vareista Secret Manageriin

> 2026-06-23 (Tero). Syy: `notifKoosteEmail`:n Variables-välilehti paljasti `SENDGRID_API_KEY`/`ANTHROPIC_API_KEY`/`OPENAI_API_KEY`
> **selkokielisinä** (tavallisia env-vareja, "Secrets: None"). Plaintext-env-varit näkyvät kaikille joilla on projektipääsy + deploy-tulosteissa.
> Tavoite: avaimet **Secret Manageriin** (`runWith({secrets})`), pois plaintextista. Korvaa §13:n vanha ".env (CI)" -malli avainten osalta.
> Periaate: minä (designer) en käsittele avainarvoja. **Tero** asettaa secretit (arvot) + rotatoi. **Code** muokkaa koodin + CI-workflown. Deploy + verify.

---

## 0. AVAINTEN ROTAATIO (suositus, koska paljastuivat plaintextina)

Avaimet ovat olleet plaintextina näkyvissä (Console + tämän session transkripti). **Suositus: rotatoi ennen migraatiota** — luo uudet avaimet palveluntarjoajilla, käytä uusia arvoja secreteissä, mitätöi vanhat:
- **SendGrid:** dashboard → API Keys → luo uusi → mitätöi vanha.
- **OpenAI:** platform → API keys → uusi → revoke vanha.
- **Anthropic:** console → API keys → uusi → revoke vanha.
(Jos arvioit altistuksen matalaksi — oma sessio — voit migratoida nykyiset arvot; rotaatio on silti hyvä hygienia.)

## 1. SECRETIEN LUONTI — Tero (CLI, arvot eivät päädy minulle/koodiin)

Repo-juuressa (`firebase use talentmaster-pilot`):
```
firebase functions:secrets:set SENDGRID_API_KEY      # liitä (uusi) arvo promptiin
firebase functions:secrets:set OPENAI_API_KEY
firebase functions:secrets:set ANTHROPIC_API_KEY
# (GEMINI_API_KEY vain jos Gemini-provider on käytössä aiProxy:ssa)
```
Kukin luo Secret Manager -secretin + version. **SENDGRID_FROM_EMAIL EI ole salainen** → jää tavalliseksi env-variksi (.env / committed).

## 2. KOODIMUUTOS — Code

Funktiot lukevat avaimet edelleen `process.env.X`:stä — `runWith({secrets})` tuo ne ajonaikaiseen enviin. **Vain binding lisätään, lukukoodi ennallaan.**
- **aiProxy** → `.runWith({ secrets: ['OPENAI_API_KEY','ANTHROPIC_API_KEY' /*, 'GEMINI_API_KEY' jos käytössä*/], ...muut })`
- **Kaikki sähköpostia lähettävät funktiot** (käyttävät `lahetaSahkoposti` → `SENDGRID_API_KEY`): `lahetaRekisteriKutsu`, `lahetaHuoltajaKutsu`, `lahetaMuistutukset`, `lahetaResetLinkki`, `lahetaPelaajaSivuLinkki`, `vahvistaSuostumus`, `notifKoosteEmail` → `.runWith({ secrets:['SENDGRID_API_KEY'] })` (säilytä olemassa olevat runWith-asetukset).
- **CI-workflow `deploy_functions.yml`:** **poista** rivit jotka kirjoittavat `SENDGRID_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY` `.env`:hen (rivit ~28–34). **Säilytä** `SENDGRID_FROM_EMAIL` (ei-salainen). Deploy nojaa nyt Secret Manager -bindingiin.
- Tunnista funktiot jotka EIVÄT tarvitse avaimia → ei runWith-secretsiä niille (älä lisää turhia).

## 3. SEKVENSSI (riippuvuus!)

1. **Tero:** rotaatio (0) + `functions:secrets:set` (1) — **secretien PITÄÄ olla olemassa ennen runWith-deployta**, muuten deploy hylkää.
2. **Code:** koodi + workflow (2) → push.
3. **Deploy:** `firebase deploy --only functions` (CI tai Code) → binding aktivoituu, plaintext-env-varit poistuvat (koska CI ei enää kirjoita niitä .env:hen). HUOM: Cloud Scheduler -jobien IAM-403 voi toistua (ks. §IAM alla) — funktiot itse deployautuvat silti.
4. **Verify:** Console → funktio → Variables → avaimet **"Secrets"-osiossa** (viite, ei arvoa), EI enää "Runtime environment variables" -plaintextina. `SENDGRID_FROM_EMAIL` jää env-variksi.

## 4. IAM (liittyy, tehty/tehtävä erikseen)

CI-palvelutililtä puuttuu `cloudscheduler.jobs.update` → ajastettujen funktioiden (`notifKoosteEmail`/`notifReviewEraantyy`) jobi-päivitys 403. Anna CI-palvelutilille **Cloud Scheduler Admin** (`roles/cloudscheduler.admin`) IAM:ssa. Olemassa olevat jobit toimivat silti (laukeavat 07:00); rooli tarvitaan puhtaaseen tulevaan deployhin. Lisäksi runWith-secrets vaatii että funktion runtime-SA:lla on **Secret Manager Secret Accessor** secreteille — `firebase functions:secrets:set` + deploy hoitaa tämän yleensä automaattisesti; jos ei, anna rooli runtime-SA:lle.

## 5. VERIFIOINTI

- Console Variables: 3 avainta "Secrets"-osiossa, ei plaintextina. `SENDGRID_FROM_EMAIL` env-varina.
- Toiminnallinen: aiProxy (litterointi/narratiivi) toimii · sähköposti (kutsu / N2-kooste) lähtee (Logs `[SendGrid] ... OK`).
- Vanhat plaintext-env-varit poistuneet funktioilta.
- §13 päivitettävä: "avaimet Secret Managerissa (runWith), ei .env" — korjaa CLAUDE.md §13 + functions/index.js -kommentti (rivi 7 "EI Secret Manager runWith" vanhentuu).
