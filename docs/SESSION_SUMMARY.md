# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-23)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 6 aktiivista pilottiseuraa. Firebase-backend on rakennettu ja toimii. Kehitys on vaiheessa jossa:
1. Admin-näkymää laajennetaan (sihteeri-roolin pohjalta)
2. Pelaajadata tuodaan Firebaseen pilottiseuroille
3. VP-dashboardin musta ruutu -ongelma korjataan

---

## ⚡ Sessiossa 2026-03-23 päätetty arkkitehtuuriperiaate

### Roolit ovat oikeuksia, ei pakollisia henkilöitä

Tämä on projektin tärkein rakenteellinen päätös. Perustuu kansainväliseen vertailuun
(Spond, 360Player, SportEasy, PlayHQ — kaikki toimivat samalla periaatteella).

**Käytännössä:**
- Firestoressa käyttäjällä on `roolit: ["vp", "sihteeri"]` — taulukko
- Pienessä seurassa VP saa molemmat roolit automaattisesti
- Isossa seurassa VP kutsuu erillisen sihteerin (eri henkilö, oma UID)
- Uusi rooli: **Seurasihteeri** (`sihteeri`) — vastaa käyttäjähallinnasta ja datantuonnista

**Sihteerin vastuut (irrotettu VP:ltä):**
- Joukkueiden luonti ja hallinta
- Valmentajien kutsuminen
- Excel/CSV → Firestore data-import
- GDPR-suostumusten hallinta
- Käyttäjätilien aktivointi/deaktivointi

**VP:n vastuut (puhtaasti valmennuksellinen):**
- Harjoitteluseuranta ja arvioinnit
- Talenttiohjelmat ja nimeämiset
- Raporttien tarkastelu
- Ei enää käyttäjähallintaa (ellei pienessä seurassa duaali-rooli)

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard | AKTIIVINEN |
| `TalentMaster_Admin.html` | Admin-näkymä | LAAJENNETTAVANA |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä | Toimiva |
| `tm_data.js` | 2417 pelaajaa, 30 seuraa (historia) | Staattinen |
| `tm_admin/setup_seurat.js` | Seurojen Firebase-alustus | Valmis |
| `tm_admin/setup_admin.js` | Super-admin setup | Valmis |
| `tm_admin/firestore.rules` | Security Rules | Päivitettävä (sihteeri-rooli) |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Spark plan, ilmainen)
- **Tietokanta:** Firestore, europe-west1
- **Auth:** Email/Password käytössä

### Konfiguraatio
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
```

### Käyttäjät

| Sähköposti | UID | Rooli | Seura |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | super_admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | vp | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | vp | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | vp | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | vp | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | vp | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | vp | GrIFK |

> **Huom:** Nykyiset VP-käyttäjät saavat pilottivaiheessa myös `sihteeri`-roolin
> kunnes seuroille nimetään erilliset sihteerit. Firestoressa:
> `roolit: ["vp", "sihteeri"]`

### Firestore-kokoelmat

```
admins/           — super-admin dokumentti
seurat/           — 6 pilottiseuraa (fcl, kpv, palloiirot, yvies, sjk, grifk)
  {seuraId}/
    joukkueet/
    kirjaukset/
    testit/
    kartoitukset/
    tekniikka/
    adar/
    kuorma/
    vammat/
    kayttajat/    — seuran käyttäjät + roolit (taulukko)
kirjaukset/       — vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/
```

### Käyttäjädokumentin uusi rakenne Firestoressä

```javascript
seurat/{seuraId}/kayttajat/{uid}/
  email:    "vp.fcl@talentmaster.fi"
  roolit:   ["vp", "sihteeri"]      // taulukko — ei enää yksi kenttä
  etunimi:  "Matti"
  sukunimi: "Virtanen"
  aktiivinen: true
  luotu:    timestamp
  viimeisin_kirjautuminen: timestamp
```

---

## PIN-koodit (demo-käyttö)

| PIN | Rooli | Seura |
|---|---|---|
| 5555 | Demo VP | – |
| 6666 | VP | FC Lahti Juniorit |
| 7777 | VP | SJK Juniorit |
| 8888 | UJ | Demo |
| 9012 | Valmentaja | Master v7 |

---

## Seuraavat tehtävät (tärkeysjärjestyksessä)

### 1. Admin-näkymän laajennus (KESKEN)
- [ ] Sihteeri-roolin mukainen käyttäjähallinta
  - Kutsu käyttäjiä (VP, Sihteeri, Valmentaja)
  - Roolien hallinta: lisää/poista oikeuksia
  - Deaktivoi käyttäjä
- [ ] Joukkueiden hallinta (Sihteerin näkymä)
  - Luo joukkue → Firestore
  - Lisää pelaajia joukkueeseen
  - Muokkaa joukkueen tietoja
- [ ] Seuran tietojen muokkaus (nimi, paketti, VP-email)

### 2. Data-import (KESKEN)
- [ ] CSV/Excel → Firestore tuontiskripti selainpohjaisena
- [ ] KPV: harjoitettavuuskartoitukset (HPP ELITE Excel)
- [ ] Pallo-Iirot: 3 joukkueen data
- [ ] Ylöjärven Ilves: testidata + tekniikkakilpailut

### 3. VP-dashboard: musta ruutu -ongelma (AVOIN)
- [ ] Kun seura ei ole tm_data.js:ssä → tervetuloa-näkymä
- [ ] Super-admin näkee kaikki seurat dropdownissa
- [ ] Seuran vaihto super-adminille

### 4. Security Rules päivitys (AVOIN)
- [ ] Lisää `sihteeri`-rooli Firestore Rulesiin
- [ ] Testaa roolien eristys

### 5. GDPR-suostumuslomake (AVOIN)
- [ ] Lomake pelaajille/huoltajille
- [ ] Suostumus tallennetaan Firestoreen
- [ ] Datan poistopyyntö-toiminto

---

## Tunnettuja ongelmia

- **Musta ruutu:** VP kirjautuu → seura tunnistetaan → jos seura ei ole tm_data.js:ssä, dashboard on musta. Dynaamisella seuralisäyksellä korjattu osittain, mutta tervetuloa-näkymä puuttuu.
- **Super-admin:** Ei näe kaikkia seuroja VP-dashboardissa — vain tm_data.js:n seurat + oman seuransa.
- **LocalStorage vs Firebase:** Epäsynkronointi eri laitteilla. Ratkeaa kun siirrytään kokonaan Firebase-pohjaiseen dataan.
- **Security Rules:** Sihteeri-rooli puuttuu vielä Firestore-säännöistä — lisättävä ennen tuotantoa.

---

## HPP ELITE -yhteys

HPP ELITE on erillinen Excel-pohjainen kuntoutus- ja harjoitekirjasto.
- **Google Sheets ID:** `1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M`
- 28 välilehteä: asiakasrekisteri, käyntiloki, vammakirjasto, harjoitekirjasto jne.
- Integroidaan TalentMasteriin fysioterapeutin näkymän kautta (Sprint 5+)

---

## Bisnesmalli

- Kiinteä seuralisenssi 200–400 €/kausi (MRR)
- Per-pelaaja raportti (skaalautuva)
- Klinikka kertamaksuna
- Paketit: Perustaso / Kehitystaso / Huipputaso

---

## Identiteetti-arkkitehtuuri (PalloID / SporttiID)

### Nykytila
- `tm_data.js`:ssä pelaajilla on `palloID`-kenttä (Palloliiton tunniste)
- Firestoren pelaajadokumenteissa tulee olla sama kenttä

### Suunniteltu rakenne
```javascript
kayttajat/{firebase_uid}/
  email:     "pelaaja@gmail.com"
  palloID:   "34650191"   // Palloliiton tunniste
  sporttiID: null         // Tulossa — universaali urheilija-ID
  roolit:    ["pelaaja"]
  seura:     "fcl"
```

### Identiteetin federaatio (tuleva)
- **Vaihe 1 (nyt):** Sähköposti + manuaalinen PalloID-syöttö
- **Vaihe 2:** "Kirjaudu PalloID:llä" → OAuth
- **Vaihe 3 (SporttiID):** Universaali urheilija-ID yli lajirajojen

> PalloID ja SporttiID eivät korvaa Firebase UID:ta — ne ovat lisätunnisteet.
> Firebase UID on aina "ankkuri" johon kaikki data kiinnittyy.

---

## Muut tiedostot

| Tiedosto | Kuvaus | Prioriteetti |
|---|---|---|
| `TalentMaster_TalentID_v1.html` | Seuran lahjakkuuskartta | Keskisuuri |
| `TalentMaster_IDP_Kortti.html` | Pelaajan IDP-kortti ⭐ | Korkea |
| `TalentMaster_VP.html` | VP-dashboardin vanha versio | Arkistoitava |

### TalentMaster_IDP_Kortti.html ⭐
- Pelaajan Individual Development Plan
- Rooli-toggle: pelaaja / valmentaja / vanhempi
- Kytkös permission matriisiin: Pelaaja R*, Vanhempi R*, Valmentaja RW
- Seuraava askel: Firebase-auth integraatio pelaajatunnusten rakentamisen yhteydessä
