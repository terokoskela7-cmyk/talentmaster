# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-22)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 6 pilottiseuraa. Firebase-backend on rakennettu ja toimii. Harjoitettavuuskartoituslomake (U12/U15/U19) on rakennettu VP-dashboardiin ja toimii tuotannossa — KPV:llä on 6 testipelaajaa Firestoressä ja lomake tallentaa oikein. Sarjakirjaus (usean pelaajan testaus peräkkäin) on lisätty. Seuraava iso kehitysvaihe on pelaajaprofiilit CSV-tuonnilla ja testipäiväkalenteri.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus |
|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard — AKTIIVINEN versio (6603 riviä) |
| `TalentMaster_Admin.html` | Admin-näkymä |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä |
| `tm_data.js` | 2417 pelaajaa, 30 seuraa (historia) |
| `tm_admin/setup_seurat.js` | Seurojen Firebase-alustus |
| `tm_admin/setup_admin.js` | Super-admin setup |
| `tm_admin/firestore.rules` | Security Rules |
| `tm_admin/scripts/kartoitus_schema.js` | Harjoitettavuuskartoituksen Firestore-schema |

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
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

### Firestore Security Rules — tärkeä korjaus 2026-03-22
Seurat-kokoelman read-sääntöön lisättiin `resource.data.vp_uid == request.auth.uid`
jotta VP voi hakea oman seuransa dokumentin kirjautumisen yhteydessä.
Ilman tätä query `.where('vp_uid', '==', uid)` epäonnistui permission denied -virheellä
koska Firestore ei voi evaluoida `onSeuranVP(seuraId)` ennen kuin seuraId tiedetään.

```javascript
match /seurat/{seuraId} {
  allow read: if onSuperAdmin()
              || onSeuranVP(seuraId)
              || (onKirjautunut() && resource.data.vp_uid == request.auth.uid);
  allow write: if onSuperAdmin();
  // ... alikokoelmat ennallaan
}
```

### Firestore-kokoelmat
- `seurat/` — 6 pilottiseuraa (fcl, kpv, palloiirot, yvies, sjk, grifk)
- `seurat/kpv/kartoitukset/` — 6 testipelaajaa (poistetaan kun oikea data tulee)
- `admins/` — super-admin dokumentti
- `kirjaukset/`, `kirjaukset_joukkue/`, `kirjaukset_tapahtumat/` — vanha rakenne

---

## Harjoitettavuuskartoitus — VALMIS ✅

Rakennettu VP-dashboardiin (TalentMaster_VP_v17.html). Toimii tuotannossa.

### Ominaisuudet
- U12 (9 testiä), U15 (10 testiä, 2 vaihtoehtoista), U19 (13 testiä + Brzycki 1RM)
- Ikäluokka lasketaan automaattisesti syntymävuodesta
- Numeeriset testit pisteyttyvät automaattisesti viitearvoista (1-3)
- Laadulliset testit (valakyykky jne.) valitaan manuaalisesti 1/2/3-painikkeilla
- U19 voimatestit: Brzycki-kaavalla lasketaan rel. 1RM automaattisesti
- FLEI-prosentti ja kuormarajoitin lasketaan yhteenvedossa
- PHV-huippu saa aina 60% kuormarajoituksen
- Tallennus: `seurat/{seuraId}/kartoitukset/{auto-id}`
- Lista-näkymässä kortit ryhmitellään ikäluokittain, FLEI värikoodattuna

### Sarjakirjaus — VALMIS ✅
Kun pelaaja tallennetaan, modal ei sulkeudu vaan näyttää:
- Onnistumisbanneri + FLEI-tulos
- "Seuraava pelaaja →" -nappi (säilyttää joukkueen, ikäluokan, päivämäärän, arvioijan)
- "Sulje lista" -nappi
- Lista tällä sessiolla testatuista pelaajista FLEI-väreineen
- Kontekstimuistutus (joukkue · ikäluokka · päivämäärä)

### Sarjakirjauksen arkkitehtuuri
`_krtSarja`-objekti on täysin yleinen eikä sisällä harjoitettavuuskartoitukselle
spesifistä logiikkaa. Sama rakenne toimii tulevissa testityypeissä
(tekniikkakilpailut, H-H-polku) ilman muutoksia.

---

## Käyttäjäflow — onboarding uudelle seuralle

Tunnistettu tämän session aikana. Kuusi vaihetta ja niiden väliset puuttuvat askeleet:

1. **Seura tulee mukaan** → Admin luo seuran Firestore-dokumentin
2. **Käyttäjät ja roolit** → VP:lle luodaan tunnukset, valmentajatunnukset (puuttuu vielä)
3. **⚠️ PUUTTUU: Seuran konfigurointi** → Joukkueet, paketti, onboarding-prosessi Admin-näkymässä
4. **Suostumuslomake** → Tehty, mutta GDPR-dokumentointi Firestoreen puuttuu
5. **⚠️ PUUTTUU: Suostumuksen tallennus** → Milloin, kuka, mitä dataa saa käsitellä
6. **Pelaajat tuodaan CSV:llä** → Luo pelaajaprofiilit joukkueen alle
7. **⚠️ PUUTTUU: Pelaajan aktivointi** → Miten pelaaja/vanhempi saa omat tunnuksensa

---

## Pelaajaprofiilin arkkitehtuuri — SUUNNITELTU, EI TOTEUTETTU

### Perusperiaate (päätetty 2026-03-22)
PalloID on se "avain" jolla kaikki lomakkeet tunnistavat pelaajan.
Kun pelaaja valitaan testilomakkeeseen, **kaikki tiedot täyttyvät automaattisesti**
profiilista — nimi, syntymävuosi, joukkue, kehonpaino, PHV-tila.
Valmentaja ei kirjoita samoja tietoja uudelleen. Tämä on koko järjestelmän
tärkein käytettävyysperiaate kentällä.

### Firestore-rakenne (suunniteltu)
```
seurat/{seuraId}/pelaajat/{palloId}/
  palloID:        "34650191"
  nimi:           "Matti Meikäläinen"
  syntymavuosi:   2011
  sukupuoli:      "P"
  joukkue:        "KPV U15"
  kehonpaino:     58.5          // kg, viimeisin mitattu
  kehonpainoPvm:  timestamp
  biologinenIka:  {             // Mirwald / Khamis-Roche tulokset
    menetelma:    "mirwald",
    maturityOffset: -0.8,       // kk kasvupyrähdyksen huipusta
    phvTila:      "PHV-huippu",
    mitattu:      timestamp,
    arvioija:     "uid"
  }
  suostumus: {
    annettu:      timestamp,
    huoltaja:     "Etunimi Sukunimi",
    versio:       "2026-v1"
  }
```

### PHV-tila ja biologinen ikä (päätetty 2026-03-22)
PHV-tila EI ole manuaalinen dropdown — se lasketaan tieteellisesti
Mirwald- tai Khamis-Roche-menetelmällä (pituus, paino, istumapituus,
vanhempien pituudet). Tulos tallennetaan pelaajan profiiliin.
Kun harjoitettavuuskartoituslomake avataan ja pelaaja tunnistetaan PalloID:llä,
lomake hakee PHV-tilan profiilista automaattisesti ja näyttää milloin
mittaus on tehty ("PHV-huippu — mitattu 15.1.2026, Mirwald").

### Kehonpaino-automaatti (päätetty 2026-03-22)
U19 voimatesteissä kehonpaino täyttyy automaattisesti profiilista.
Valmentaja voi ylikirjoittaa jos paino on muuttunut.
Uusi paino tallentuu profiiliin mittauspäivämäärällä.

---

## Testipäiväkalenteri — SUUNNITELTU, EI TOTEUTETTU

### Konsepti (päätetty 2026-03-22)
Testipäiväkalenteri on työnkulun alku. Se yhdistää:
- Testipäivän luominen (päivämäärä, joukkue, ikäluokka, testityyppi)
- Osallistujalistan hallinta (ketkä pelaajat osallistuvat)
- Tulostettava osallistujalista kentälle (PDF, tyhjät rivit tulosten kirjaamiseen)
- Linkitys kartoitusdokumentteihin (tulokset kiinnittyvät testipäivään)

### Firestore-rakenne (suunniteltu)
```
seurat/{seuraId}/testipaivat/{testipaivaId}/
  pvm:          timestamp
  joukkue:      "KPV U15"
  ikäluokka:    "U15"
  tyyppi:       "harjoitettavuus" | "tekniikkakilpailu" | "hh_polku"
  arvioija:     "uid"
  osallistujat: ["palloId1", "palloId2", ...]
  kartoitukset: ["kartoitusId1", "kartoitusId2", ...]  // linkit tuloksiin
  tila:         "suunniteltu" | "kaynnissa" | "valmis"
```

---

## Yleinen testauslogiikka — arkkitehtuuriperiaate

Kaikki testilajit (harjoitettavuuskartoitus, tekniikkakilpailut, H-H-polku)
ovat pohjimmiltaan sama asia: strukturoitu testaustapahtuma.
Sarjakirjaus, testipäiväkalenteri ja osallistujalista toimivat
täsmälleen samalla logiikalla testityypistä riippumatta.
"Mitä mitataan" on konfiguraatio, ei erillinen järjestelmä.

---

## Seuraavat tehtävät (tärkeysjärjestyksessä)

1. **CSV-tuonti pelaajille** — Excel-pohja + tuontiskripti Admin-näkymään
   - Yksi Excel-pohja, eri välilehdet ikäluokittain (U12/U15/U19)
   - PalloID on pelaajan tunniste
   - Luo `seurat/{seuraId}/pelaajat/`-kokoelman

2. **Pelaajaprofiilin automaattitäyttö lomakkeisiin**
   - Kun PalloID syötetään kartoituslomakkeeseen, haetaan profiili Firestoresta
   - Täytetään automaattisesti: nimi, syntymävuosi, joukkue, kehonpaino, PHV-tila
   - Sama logiikka kaikille testilomakkeille

3. **Mirwald/Khamis-Roche-laskenta**
   - Oma syöttölomake biologisen iän mittaukselle
   - Tallennetaan pelaajan profiiliin
   - PHV-tila poistuu manuaalisesta dropdownista → lasketaan automaattisesti

4. **Testipäiväkalenteri**
   - VP luo testipäivän, valitsee joukkueen ja pelaajat
   - Tulostettava osallistujalista PDF-muodossa
   - Sarjakirjaus käynnistyy testipäivästä — pelaajat valmiina listalla

5. **Admin-näkymän laajennus**
   - VP:n kutsuminen sähköpostitse
   - Seuran onboarding-prosessi (joukkueet, paketti, käyttäjät)
   - CSV-tuonti pelaajille

6. **GDPR-suostumuksen tallennus**
   - Suostumuspäivämäärä, huoltaja, versio tallennetaan pelaajan profiiliin
   - Audit trail: kuka muutti mitä milloin

7. **IDP-kortti (pelaajakortti) Firebase-integraatio**
   - TalentMaster_IDP_Kortti.html — prototyyppi valmiina
   - Lisätään Firebase-auth ja pelaajaprofiilin haku
   - Harjoitettavuuskartoituksen FLEI-trendi näkyy kortissa

---

## Tunnettuja ongelmia

- Super-admin ei näe kaikkia seuroja VP-dashboardissa (näyttää vain tm_data.js:n seurat)
- LocalStorage ja Firebase voivat olla epäsynkronissa eri laitteilla
- Testipelaajat KPV:llä pitää poistaa kun oikea data tulee

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

PalloID on kaiken perusta — se on se tunniste jolla eri lomakkeet,
testit ja raportit linkittyvät samaan pelaajaan. Firebase UID on
tekninen ankkuri, PalloID on urheilullinen identiteetti.

### Identiteetin federaatio (tuleva)
- **Vaihe 1 (nyt):** Sähköposti + manuaalinen PalloID-syöttö
- **Vaihe 2:** "Kirjaudu PalloID:llä" → Palloliiton OAuth
- **Vaihe 3:** SporttiID — universaali urheilija-ID yli lajirajojen

---

## Muut tiedostot — tila ja suunnitelma

### TalentMaster_TalentID_v1.html
- Seuran lahjakkuuskartta-näkymä, PIN 1234, 2284 riviä
- Toimiva mutta ei Firebase-integraatiota
- Prioriteetti: Keskisuuri

### TalentMaster_IDP_Kortti.html ⭐ Strategisesti tärkeä
- Pelaajan Individual Development Plan -kortti, 827 riviä
- Rooli-toggle (pelaaja/valmentaja/vanhempi), demo-pelaajat
- Prototyyppi, ei Firebase-integraatiota
- Tämä on se näkymä jonka pelaaja ja vanhempi tulevat käyttämään
- Prioriteetti: Korkea — tarvitaan kun pelaajatunnukset rakennetaan
- Harjoitettavuuskartoituksen FLEI-trendi tulee näkymään tässä

### TalentMaster_VP.html
- VP-dashboardin vanhempi versio ilman Firebasea
- Korvattu v17:llä — voidaan poistaa GitHubista
