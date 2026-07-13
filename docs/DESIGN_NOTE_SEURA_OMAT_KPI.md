# Suunnitteluhuomio (eteenpäin) — seuran omat KPI-mittarit / arvioinnit

> **Ei toteutusbrief — kirjattu vaatimus tulevaisuutta varten (Tero 2026-07).** Kun TalentMaster laajenee, **seuran tulee
> voida luoda myös omia pelaajan KPI-mittareita / arviointeja**, koska **seuran DNA / identiteetti on erilainen**. Tämä
> dokumentti kaappaa vaatimuksen + miten se istuu nykyarkkitehtuuriin, ettei myöhempi työ maalaa nurkkaan. Toteutus vasta
> kun laajennutaan / seura pyytää.

## 1. Vaatimus
Eri seuroilla on eri pelifilosofia ja arvot (esim. 1v1-dominanssi, hallinta, rohkeus, seuran omat "core values"). Yhden
kiinteän taksonomian (Palloliitto 57 kohdetta) ei pidä olla ainoa vaihtoehto. Seuran pitää voida **määritellä omia
arviointikohteita / KPI-mittareita**, jotka näkyvät ja käyttäytyvät kuten muutkin arvioinnit.

## 2. Miten tämä istuu nykyarkkitehtuuriin (foothold on jo olemassa)
- **Brändijako (PR #156) parametrisoi jo "kehyksen":** Arviointi-otsikossa `kehysAvain === 'palloliitto' ? 'Palloliitto
  Player Development Card' : kehys.nimi` + `_vpArvValitseKehys(...)`-valitsin. Eli **arviointikehys on jo valittava** — ei
  kovakoodattu Palloliittoon.
- ⇒ **Seuran oma kehys = kolmas kehystyyppi** samassa slotissa: `palloliitto` · `talentmaster` · **`seura:{sid}`**.
  Kolme brändiä/kehystä: Palloliiton virallinen kortti · TM:n oma analytiikkakerros · **seuran oma identiteettikerros**.

## 3. Suuntaviivat (kun toteutetaan — ei nyt)
- **Datamalli:** seurakohtainen kehys `seurat/{sid}/arviointikehys/{avain}` → lista KPI-kohteita
  `{ avain, nimi, dimensio (tai oma ryhmä), asteikko (esim. 1–5 / 1–3 / boolean), mitattavissa, kuvaus, kysymykset }`.
  Additiivinen — ei korvaa Palloliitto/TM-kehyksiä, vaan lisättävissä niiden rinnalle.
- **Renderöinti:** sama Arviointi-koneisto (I2:n lähderyhmät + provenance) — seuran kohteet provenance-merkillä
  **"SEURA · <nimi>"** (kolmas väri Palloliitto/TM:n rinnalle). Ei uutta erillistä näkymää.
- **Kytkös IDP:hen:** seuran oma KPI voi olla IDP-tavoitteen lähde kuten muutkin (resolver `tm_kehityspolku`:
  seura-KPI → seuran oma konsepti/harjoite, tai laadullinen jos ei kartoitettu). Asiantuntijan valta säilyy.
- **Hallinta (governance):** kuka määrittelee seuran KPI:t — VP / seura-admin. Versiointi + auditointi (kuka muutti, milloin).
- **Guardrailit:** §7.22 (pelaajaturva) pätee edelleen — seuran omat mittarit eivät saa vuotaa raakana pelaajalle
  epäasianmukaisesti. GDPR: ei terveys-/diagnoosikenttiä KPI-määrittelyyn (kuten 7.2 kuntoutus).
- **Firestore-säännöt:** seurakohtainen kirjoitus (oman seuran johto/VP) — Console-deploy erikseen. Tenant-eristys kriittinen.
- **Kv-avoimuus:** sama mekanismi tukee myös muita virallisia kehyksiä (esim. muun maan liiton kortti) — `kehysAvain` on jo geneerinen.

## 4. Miksi tämä kannattaa muistaa nyt (vaikkei rakenneta)
- **Ei paineta nurkkaan:** kun rakennetaan lisää arviointi-/IDP-logiikkaa, pidetään `kehysAvain`/taksonomia **parametrisena**
  (ei kovakoodata Palloliittoa) → seuran oma kehys on myöhemmin *lisäys*, ei uudelleenkirjoitus.
- **Myyntiargumentti + seura-sitoutuminen:** seura näkee oman identiteettinsä työkalussa → vahvempi omistajuus.
- **Luonteva jatko brändijaolle:** brändijako teki näkyväksi "kuka omistaa minkä" (Palloliitto vs TM) — seurakerros on tämän
  kolmas taso.

## 5. Status
**Kirjattu vaatimus / arkkitehtuurisuunta.** Ei toteutusbrief. Revisit: kun laajennutaan useampaan seuraan TAI ensimmäinen
seura pyytää omia mittareita. Silloin: (1) tämän pohjalta spec, (2) mockup, (3) brief. Prioriteetti Teron päätettävissä.
