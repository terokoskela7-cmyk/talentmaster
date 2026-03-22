# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-22)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 6 pilottiseuraa. Firebase-backend on rakennettu ja toimii. Harjoitettavuuskartoituslomake (U12/U15/U19) on rakennettu VP-dashboardiin ja toimii tuotannossa — KPV:llä on 6 testipelaajaa Firestoressä. Sarjakirjaus on lisätty. Excel-pelaajapohja on valmis sisältäen Mirwald-laskennan ja Palloliiton yli-ikäisyyssäännön automaattisesti. Seuraava iso kehitysvaihe on tuontitoiminto VP-dashboardiin joka lukee Excel-pohjan ja tallentaa pelaajaprofiilit Firestoreen.

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
| `tm_admin/scripts/kartoitus_schema.js` | Harjoitettavuuskartoituksen Firestore-schema |
| `TalentMaster_Pelaajapohja.xlsx` | Excel-pohja pelaajien tuontiin (Mirwald + yli-ikäisyys) |

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

### Security Rules — korjaus 2026-03-22
Seurat-kokoelman read-sääntöön lisättiin `resource.data.vp_uid == request.auth.uid`
jotta VP voi hakea oman seuransa dokumentin kirjautumisen yhteydessä ilman
permission denied -virhettä. VP:n seuraId haetaan oikein `snap.docs[0].id`:llä
(ei `snap.docs[0].data().id`).

### Firestore-kokoelmat
`seurat/` sisältää 6 pilottiseuraa. `seurat/kpv/kartoitukset/` sisältää 6
testipelaajaa jotka poistetaan kun oikea data tulee. `seurat/{id}/pelaajat/`
on tulossa Excel-tuonnin myötä. Vanhat rakenteet `kirjaukset/`,
`kirjaukset_joukkue/` ja `kirjaukset_tapahtumat/` säilytetään yhteensopivuuden vuoksi.

---

## Harjoitettavuuskartoitus — VALMIS ✅

Toimii tuotannossa KPV:llä. Kattaa U12 (9 testiä), U15 (10 testiä, 2
vaihtoehtoista) ja U19 (13 testiä + Brzycki 1RM). Ikäluokka lasketaan
automaattisesti syntymävuodesta. FLEI-prosentti ja kuormarajoitin lasketaan
yhteenvedossa. PHV-huippu saa aina 60% kuormarajoituksen. Tallennus menee
polkuun `seurat/{seuraId}/kartoitukset/{auto-id}`.

Sarjakirjaus toimii `_krtSarja`-objektilla joka muistaa joukkueen, ikäluokan,
päivämäärän ja arvioijan pelaajalta toiselle. Sama rakenne sopii myös
tekniikkakilpailuihin ja H-H-polun testeihin.

---

## Excel-pelaajapohja — VALMIS ✅

Neljä välilehteä: ohjesivu + U12, U15, U19 (50 riviä/välilehti). Sarakkeet
värikoodattu (sininen = pakollinen, vihreä = Mirwald, keltainen = automaattinen,
violetti = PHV/yli-ikäisyys). Mirwald-kaava laskee maturity offsetin, PHV-tilan
ja PHV-iän automaattisesti. Palloliiton yli-ikäisyyssääntö lasketaan VLOOKUP-
kaavalla — tulos on "✅ KYLLÄ" tai "❌ EI". Kaikki 4 Palloliiton virallista
esimerkkiä testattu ja täsmäävät.

---

## Biologisen iän arkkitehtuuri — PÄÄTETTY 2026-03-22

Täydellinen kuvaus on ARKKITEHTUURI.md:ssä. Tässä tiivistelmä tärkeimmistä
päätöksistä jotka vaikuttavat tulevaan kehitykseen.

### PHV-ikä vs. biologinen ikä — eri asioita

Biologinen ikä (bio) = kronologinen ikä + maturity offset. Se kertoo miten
"vanha" pelaaja on biologisesti nyt. PHV-ikä (phvIka) = kronologinen ikä -
maturity offset. Se kertoo milloin kasvupyrähdys tapahtuu. Palloliitto käyttää
PHV-ikää yli-ikäisyyssäännössä. Valmentaja tarvitsee biologisen iän
harjoituskuorman päätöksiin. Molemmat tallennetaan pelaajan profiiliin.

### Tanner-vaiheen erityisasema (päätetty 2026-03-22)

Tanner-vaihe (T1–T5) vaatii lääkärin tai terveydenhoitajan fyysisen arvion —
sitä ei voi laskea automaattisesti Mirwald-mittauksista. Se on piilotettu
käyttöliittymässä oletuksena ja näytetään vain erikseen pyydettäessä tai
Huipputaso-paketissa. Firestoreen tallennetaan aina kirjaajan UID ja
päivämäärä jotta tiedetään kuka ammattilainen arvion teki. GDPR:n kannalta
kyseessä on terveystieto joka vaatii erillisen suostumuksen.

### Firestore-rakenne pelaajan biologiselle iälle

```javascript
biologinenIka: {
  mirwald: {                    // raakamitat — tallennetaan aina
    pituus, istumapituus, penkinkorkeus, paino,
    aidinPituus, isanPituus,    // vapaaehtoiset
    mittauspvm, arvioija
  },
  maturityOffset: -1.34,        // Mirwald-kaavan tulos
  phvIka:         14.60,        // age at PHV = krono - offset (Palloliiton käyttämä)
  phvTila:       "PHV-huippu",  // Varhainen | PHV-huippu | Post-PHV
  krono:          13.26,        // kronologinen ikä mittaushetkellä
  bio:            11.92,        // biologinen ikä = krono + offset
  rae:            "Q3",         // syntymäkvartaali (lasketaan automaattisesti)
  yliIkaisyys: {                // Palloliiton sääntö (automaattinen)
    tulos: "KYLLÄ", raja: 14.30, laskettu: timestamp
  },
  nytPit:      155.0,           // nykyinen pituus
  aikuisPit:   182.0,           // ennustettu aikuispituus
  tannerVaihe: "T2",            // PIILOTETTU — vain asiantuntija kirjaa
  tannerKirjaaja, tannerPvm     // audit trail asiantuntijan arviolle
}
```

### Yhteys VP v16:n bioIka-rakenteeseen

V16:ssa on jo suunniteltu `bioIka`-objekti kentillä `krono`, `bio`, `phvEst`,
`aikuisPit`, `nytPit`, `tannerVaihe` ja `rae`. Tämä rakenne on linjassa
Palloliiton kanssa. `phvEst` vastaa PHV-ikää (age at PHV). Käytetään tätä
pohjana kun pelaajaprofiilit toteutetaan Firestoreen.

---

## Seuraavat tehtävät (tärkeysjärjestyksessä)

1. **Tuontitoiminto VP-dashboardiin** — Excel-pohjan lukeminen (SheetJS) ja
   pelaajaprofiilit Firestoreen. PalloID tunnistaa pelaajan — sama PalloID
   päivittää olemassa olevan dokumentin eikä luo kaksoiskappaleita.

2. **Automaattitäyttö kartoituslomakkeeseen** — Kun PalloID syötetään,
   haetaan profiili Firestoresta ja täytetään automaattisesti nimi,
   syntymävuosi, joukkue, kehonpaino ja PHV-tila.

3. **Mirwald-lomake VP-dashboardiin** — Erillinen syöttölomake biologisen
   iän mittaukselle, tallennetaan pelaajan profiiliin.

4. **Testipäiväkalenteri** — VP luo testipäivän, valitsee joukkueen ja
   pelaajat, tulostettava osallistujalista PDF-muodossa.

5. **Admin-näkymän laajennus** — Seuran onboarding-prosessi, VP:n kutsu.

6. **GDPR-suostumuksen tallennus** — Pvm, huoltaja, versio pelaajan profiiliin.

7. **IDP-kortti Firebase-integraatio** — Pelaajan kehityspolku kaikissa
   Huippusuoritusmallin dimensioissa, Tanner piilotettu oletuksena.

---

## Tunnettuja ongelmia

Super-admin ei näe kaikkia seuroja VP-dashboardissa (näyttää vain tm_data.js:n
seurat). LocalStorage ja Firebase voivat olla epäsynkronissa eri laitteilla.
KPV:n testipelaajat pitää poistaa kun oikea data tulee.

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

## VP-versioiden tila

V17 on aktiivinen versio (Firebase + kartoitus + sarjakirjaus). V16 on
arkistossa mutta arvokas — sisältää tekniikkakilpailut ja `bioIka`-rakenteen
jota käytetään referenssinä. Konsepti v4 on UI-prototyyppi tilannekuvanäkymästä
ja ADAR-hälytyksistä (ei logiikkaa). VP.html on vanhentunut ja voidaan poistaa.

---

## Bisnesmalli

Kiinteä seuralisenssi 200–400€/kausi (MRR), per-pelaaja raportti (skaalautuva),
klinikka kertamaksuna. Paketit: Perustaso / Kehitystaso / Huipputaso.
Tanner-vaihe kuuluu Huipputaso-pakettiin koska se vaatii asiantuntijan arvion.
