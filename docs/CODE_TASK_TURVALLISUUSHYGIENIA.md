# Code-tehtävä: turvallisuushygienia (tekninen arvio 2026-07-01)

> Valmis brieffi Code-agentille. Lähde: 2. koodarin tekninen arvio. Nämä ovat **repo-puolen** korjaukset.
> ⚠️ **Console-toimet EIVÄT kuulu Codelle** (tekee Tero): (a) `vp.demo@talentmaster.fi` disablointi/rotatointi Firebase Consolessa, (b) API-avaimen domain-rajoitus Google Cloud Consolessa, (c) Sentry allowed origins, (d) App Check -aktivointi. Nämä listattu vain kontekstiksi §5.

## P0 — Demo-salasana pois reposta (5 tiedostoa)
`TM_Demo_2026!` esiintyy: `docs/demo_setup_ohjeet.md`, `tm_admin/setup_demo_fc.js`, `tm_admin/check_demo.js`, `tm_admin/check_all_users.js`, `tm_admin/firestore_rules_check.js`.
- **Poista plaintext-salasana kaikista 5:stä.** Skripteissä lue ympäristömuuttujasta: `const DEMO_PW = process.env.TM_DEMO_PW;` (+ guard jos puuttuu). Dokumentissa korvaa placeholderilla `[SALASANA — ei versionhallintaan]`.
- **⚠️ KRIITTINEN HUOMIO briefiin:** tiedostoista poisto EI riitä — salasana jää **git-historiaan**. Todellinen korjaus = **tilin disablointi/rotatointi Consolessa** (Tero, erikseen). Kirjaa tämä PR-kuvaukseen ettei kukaan luule file-editiä riittäväksi.
- Älä koske skriptien muuhun logiikkaan.

## P0 — functions/.env pois versionhallinnasta
- `git rm --cached functions/.env` (säilytä lokaali tiedosto).
- Lisää `.gitignore`:en `functions/.env`.
- Luo `functions/.env.example` sisältäen vain ei-salaiset avaimet mallina: `SENDGRID_FROM_EMAIL=noreply@talentmasterid.com`.
- Varmista ettei muita salaisuuksia ole `.env`:ssä (nyt vain FROM_EMAIL, ei-salainen — OK).

## P1 — npm audit CI:hin
- Lisää `.github/workflows/`-CI:hin steppi `npm audit --audit-level=high` (ei blokkaava aluksi, `continue-on-error: true`, tai erillinen job). Tavoite: näkyvyys haavoittuvuuksiin.

## P2 — Super-admin UID/email (tutki ensin, älä riko)
> Arvioija yliarvioi ("HIGH") — UID EI ole kirjautumistunnus. Mutta henkilökohtaisen gmailin poisto on hygieniaa.
- **Tutki `config.js` `superAdminUid`-käyttö** (grep viittaukset). Jos koodi lukee sitä → **ÄLÄ poista** (rikkoisi SA-tunnistuksen); UID ei ole salaisuus. Jos ei käytössä → poista.
- **Poista henkilökohtainen `talentmasterid@gmail.com`** paikoista joissa se on pelkkää dokumentaatiota eikä toiminnallisesti tarpeen (esim. SESSION_SUMMARY.md). CLAUDE.md §3 SA-viite: korvaa geneerisellä ("super-admin-tili") jos ei riko mitään; älä poista jos se on invarianttien ymmärryksen kannalta olennainen — käytä harkintaa, jätä kommentti PR:ään.
- Ei pakko tehdä kaikkea; prioriteetti = poistaa plaintext-salasana (P0), tämä on siistimistä.

## Guardrailit
- Ei toiminnallisia muutoksia (vain salaisuuksien/hygienian siivous).
- `superAdminUid`: älä riko viittauksia — tutki ennen poistoa.
- Demo-salasanan file-poisto ≠ tilin korjaus (Console erikseen) — kirjaa PR:ään.
- Feature branch → PR → merge. Ei versionbumppia.

## §5 Console-toimet (Tero, EI Code) — muistilista
1. 🔴 Disabloi/rotatoi `vp.demo@talentmaster.fi` + tarkista audit-loki.
2. 🟠 API-avaimen HTTP-referrer-rajoitus (`terokoskela7-cmyk.github.io`, `talentmasterid.com`).
3. Sentry: allowed origins.
4. (Harkinta) Firebase App Check — erillinen isompi tehtävä (SDK-init appeihin) jos päätetään.
