# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-22)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 4 aktiivista pilottiseuraa tulossa. Firebase-backend on rakennettu ja toimii. Kehitys on vaiheessa jossa pelaajadata pitää tuoda Firebaseen ja admin-näkymää laajentaa.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus |
|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard — AKTIIVINEN versio |
| `TalentMaster_Admin.html` | Admin-näkymä — UUSI |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä |
| `tm_data.js` | 2417 pelaajaa, 30 seuraa (historia) |
| `tm_admin/setup_seurat.js` | Seurojen Firebase-alustus |
| `tm_admin/setup_admin.js` | Super-admin setup |
| `tm_admin/firestore.rules` | Security Rules |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Spark plan, ilmainen)
- **Tietokanta:** Firestore, europe-west1
- **Auth:** Email/Password käytössä

### Konfiguraatio (VP-dashboardissa ja Admin-näkymässä)
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
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

### Firestore-kokoelmat
- `seurat/` — 6 pilottiseuraa (fcl, kpv, palloiirot, yvies, sjk, grifk)
- `admins/` — super-admin dokumentti
- `kirjaukset/`, `kirjaukset_joukkue/`, `kirjaukset_tapahtumat/` — vanha rakenne

---

## PIN-koodit (demo-käyttö)

| PIN | Rooli | Seura |
|---|---|---|
| 5555 | Demo VP | - |
| 6666 | VP | FC Lahti Juniorit |
| 7777 | VP | SJK Juniorit |
| 8888 | UJ | Demo |
| 9012 | Valmentaja | Master v7 |

---

## Seuraavat tehtävät (tärkeysjärjestyksessä)

1. **Pilottidatan tuonti Firebaseen**
   - KPV: harjoitettavuuskartoitukset (HPP ELITE Excel)
   - Pallo-Iirot: 3 joukkueen data
   - Ylöjärven Ilves: testidata + tekniikkakilpailut
   - Tarvitaan Excel→Firebase tuontiskripti

2. **Admin-näkymän laajennus**
   - VP:n kutsuminen sähköpostitse (Firebase createUser + reset password)
   - Seuran tietojen muokkaus
   - Data-tuonti Excel/CSV → Firestore

3. **VP-dashboard: musta ruutu -ongelma**
   - Kun seura ei ole tm_data.js:ssä, näytetään tervetuloa-näkymä
   - Super-admin näkee kaikki seurat

4. **Tietosuoja**
   - GDPR-suostumuslomake ennen pilottia
   - Dokumentoitu suostumus Firestoreen

---

## Tunnettuja ongelmia

- VP kirjautuu sähköpostilla → seura tunnistetaan oikein → mutta jos seura ei ole tm_data.js:ssä, dashboard on musta. Korjattu dynaamisella seuralisäyksellä mutta tervetuloa-näkymä puuttuu.
- Super-admin ei näe kaikkia seuroja VP-dashboardissa — se näyttää vain tm_data.js:n seurat + oman seuransa.
- LocalStorage ja Firebase voivat olla epäsynkronissa eri laitteilla — ratkeaa kun siirrytään kokonaan Firebase-pohjaiseen dataan.

---

## HPP ELITE -yhteys

HPP ELITE on erillinen Excel-pohjainen kuntoutus- ja harjoitekirjasto.
- **Google Sheets ID:** `1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M`
- 28 välilehteä: asiakasrekisteri, käyntiloki, vammakirjasto, harjoitekirjasto jne.
- Tulevaisuudessa integroidaan TalentMasteriin fysioterapeutin näkymän kautta

---

## Bisnesmalli

- Kiinteä seuralisenssi 200-400€/kausi (MRR)
- Per-pelaaja raportti (skaalautuva)
- Klinikka kertamaksuna
- Paketit: Perustaso / Kehitystaso / Huipputaso

---

## Identiteetti-arkkitehtuuri (PalloID / SporttiID)

### Nykytila
- `tm_data.js`:ssä jokaisella pelaajalla on `palloID`-kenttä (Palloliiton tunniste)
- Firestoren pelaajadokumenteissa tulee olla sama kenttä
- Käyttäjätaulun rakenne tukee useita identiteettejä

### Suunniteltu rakenne Firestoressä
```javascript
kayttajat/{firebase_uid}/
  email:     "pelaaja@gmail.com"
  palloID:   "34650191"          // Palloliiton tunniste
  sporttiID: null                // Tulossa — universaali urheilija-ID
  rooli:     "pelaaja"
  seura:     "fcl"
```

### Identiteetin federaatio (tuleva)
- **Vaihe 1 (nyt):** Sähköposti + manuaalinen PalloID-syöttö profiilissa
- **Vaihe 2 (Palloliitto-yhteistyö):** "Kirjaudu PalloID:llä" -nappi → OAuth
- **Vaihe 3 (SporttiID):** Universaali urheilija-ID yli lajirajojen

### Lajilaajennus
Kun salibandy, jääkiekko tai koripallo tulee mukaan:
- Seuradokumenttiin `laji`-kenttä (jo olemassa)
- Liiton ID-tunniste per laji (salibandyliitto, jääkiekkoliitto, koripalloliitto)
- SporttiID yhdistää kaikki lajit yhteen tunnisteeseen

### Huomio arkkitehtuurissa
PalloID ja SporttiID eivät korvaa Firebase UID:ta — ne ovat lisätunnisteet
jotka linkitetään Firebase UID:hin. Firebase UID on aina se "ankkuri"
johon kaikki muu data kiinnittyy.

---

## Muut tiedostot — tila ja suunnitelma

### TalentMaster_TalentID_v1.html
- **Mitä on:** Seuran lahjakkuuskartta-näkymä, PIN 1234, 2284 riviä
- **Tila:** Toimiva mutta ei Firebase-integraatiota
- **Seuraava askel:** Lisää Firebase-auth samalla tavalla kuin VP v17:ään
- **Prioriteetti:** Keskisuuri — tärkeä seuratasolla mutta ei kriittinen pilotille

### TalentMaster_IDP_Kortti.html ⭐ Strategisesti tärkeä
- **Mitä on:** Pelaajan Individual Development Plan -kortti, 827 riviä
- **Sisältö:** Rooli-toggle (pelaaja/valmentaja/vanhempi), demo-pelaajat, kehityskortti
- **Tila:** Prototyyppi, ei Firebase-integraatiota
- **Merkitys:** Tämä on se näkymä jonka pelaaja ja vanhempi tulevat käyttämään
  - Pelaaja näkee oman kehityspolkunsa
  - Vanhempi näkee lapsen kehityksen selkokielellä
  - Valmentaja voi tehdä merkintöjä
- **Kytkös permission matriisiin:** Pelaaja R*, Vanhempi R*, Valmentaja RW
- **Seuraava askel:** Integroitava Firebase-autentikointiin kun pelaajatunnukset rakennetaan
- **Prioriteetti:** Korkea — tarvitaan pilottien laajentamiseen pelaajatasolle

### TalentMaster_VP.html
- **Mitä on:** VP-dashboardin vanhempi versio ilman Firebasea
- **Tila:** Korvattu v17:llä
- **Toimenpide:** Voidaan poistaa GitHubista tai siirtää arkistoon
