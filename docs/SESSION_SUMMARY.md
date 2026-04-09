# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-09)

TalentMaster on jalkapallon talenttiarviointialusta — 8 pilottiseuraa, Firebase Blaze. SJK laajensi 2026-04-08: U15P + U14/15T + talenttipelaajat — ensimmäinen seura tyttöjoukkueella. VP v18 merkittävä uudistus: Henkilöstö+Valmennus → Valmentajat-tabi, harjoitteluseuranta Power BI -inspiroitu yhteenvedolla+suodattimella. Pelihavainto-arkkitehtuuri (TIPS+IDP) suunniteltu. Excel-tuontipohja rakennettu SJK-pilotin käynnistämiseksi. Palloliiton Head of Talent -tapaaminen 2026-04-09.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---

## Sivuarkkitehtuuri (2026-04-09)

| Sivu | Tiedosto | Rooli | Tila |
|---|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp | ✅ tuotannossa |
| Urheilutoimenjohtaja | `TalentMaster_UTJ_v1.html` | urheilutoimenjohtaja | ✅ tuotannossa |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja + kenttäroolit | ✅ tuotannossa |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri, utj, vp, super_admin | ✅ tuotannossa |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja | ✅ tuotannossa |
| Pelaaja | `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ tuotannossa ⚠ lag-bugi |
| IDP-kortti | `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ tuotannossa |
| Suostumuslomake | `TalentMaster_Rekisterointi_Suostumus.html` | anonyymi/huoltaja | ✅ tuotannossa |
| Keräilykortit | `TalentMaster_Kortit.html` | pelaaja | ✅ tuotannossa |
| Admin | `TalentMaster_Admin.html` | super_admin | ✅ tuotannossa |
| ADAR-koulutus | `TalentMaster_ADAR_Koulutus.html` | valmentaja | ✅ tuotannossa |
| Markkinointi | `TalentMaster_Koukutus.html` | — | ⏳ PENDING |
| Coaching tool | `TalentMaster_Valmentaja_Matriisi.html` | valmentaja | ⏳ PENDING |
| Pelihavainto demo | `TalentMaster_Pelihavainto_Demo.html` | demo | ⚠ EI GitHubissa |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze)
- **Firestore:** `eur3` multi-region
- **Auth:** Email/Password + Custom Claims
- **Functions:** `europe-west1`, 7 kpl
- **Sähköposti:** Nodemailer + Gmail (ei SendGrid — eur3-ongelma)

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

**Super Admin:** `talentmasterid@gmail.com` / UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
**Tunnistus:** `adminSnap.exists` — EI custom claims -arvoista

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

### Testipelaaja (KPV)
- **pelaajaId:** `m93GBdOaGCUuenMiCL0I` / lyhyt: `TM-MN67OLDO`
- **huoltaja:** `terokoskela7@gmail.com`
- **tila:** aktiivinen, suostumus annettu
- **URL:** `?pelaajaId=m93GBdOaGCUuenMiCL0I&seuraId=kpv`

---

## Cloud Functions — 7 deployattu (europe-west1)

| Funktio | Kuvaus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit + salasananollaus | ✅ |
| `tasoHaeSeuranOttelut` | Ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU |

---

## Pilottiseurat (8 kpl) — tila 2026-04-09

| SeuraId | Seura | Tila | Huomio |
|---|---|---|---|
| `fcl` | FC Lahti Juniorit | ✅ tunnukset | — |
| `kpv` | KPV Kokkola | ✅ tunnukset | Testipelaaja TM-MN67OLDO |
| `palloiirot` | Pallo-Iirot | ✅ tunnukset | — |
| `yvies` | Ylöjärven Ilves | ✅ tunnukset | — |
| `sjk` | SJK Juniorit | ✅ **laajennettu** | U15P+U14/15T+talentit, **1. tyttöjoukkue** |
| `grifk` | GrIFK | ✅ tunnukset | sv-kieli |
| `vifk` | VIFK | ✅ tunnukset | sv-kieli |
| `hjk` | HJK Juniorit | ✅ tunnukset | — |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin |

**Kaikilla seuroilla:** tunnukset luotu, testidataa ei vielä Firestoressä.
Kriittisin pullonkaula: Excel → Firestore tuontityökalu puuttuu.

---

## TÄMÄN SESSION TUOTOKSET (2026-04-08 → 2026-04-09)

### VP v18 — Valmentajat-tabi

**Muutos:** Henkilöstö + Valmennus → yksi **Valmentajat**-välilehti, kaksi sisäistä näkymää.

```
Valmentajat-tabi
  ├── 👤 Valmentajat
  │     ├── Kortit joukkue-grid muodossa
  │     └── Klikkaus → _avaaValmentajaPopup() [GLOBAALI]
  └── 📊 Osaaminen
        ├── ADAR-linkki (kompakti)
        ├── lataaHSSeuranta() — Power BI -inspiroitu
        │     ├── KPI-rivi (hs-ka, käyntejä, valmentajia)
        │     ├── 7 kriteeriä vaakapalkeina (tavoiteviiva)
        │     ├── Trendi SVG
        │     ├── Per valmentaja
        │     └── Suodatinnapit [Kaikki][Sari K.][Mikko V.]
        └── Käyntiaktiivisuus + hyvinvointi
```

**Kriittiset bugikorjaukset:**
- `_avaaValmentajaPopup` siirretty globaaliksi (oli nested → ReferenceError)
- `window._vpKayntiBadge/Viimeisin/RooliNimet/JData` cache-objektit
- `nimiToUid`-kartta: UID-mismatch mentoroinnit ↔ kayttajat
- `_tavoitteetLadattu`, `_henkilostoLadattu` globaalit lisätty
- Lazy-loading: `valmentajat:` (oli `henkilosto:` + `valmennus:`)

### Testidatan tuontipohja

`TalentMaster_Testidatan_Tuontipohja.xlsx` (5 välilehteä):
- `0_OHJEET` — VP:n käyttöohjeet
- `1_Pelaajat` — perustiedot + PHV-data
- `2_HH_Testit` — nopeus/ketteryys/voima/tekniikka/kestävyys, TSI automaattinen
- `3_Harjoitettavuus` — pisteet 1-3, FLEI% automaattinen kaavalla
- `4_Tekniikkakilpailut` — syöttö+pujottelu+ponnauttelu, paras automaattinen

**SJK-käyttöönottoprosessi:**
1. VP-tunnukset Admin-näkymästä
2. Joukkueet Firestoreen
3. Pelaajat rekisteröidään (ilman suostumusta)
4. VP toimittaa testidatan Excel-pohjalle
5. Tuontityökalu: Excel → Firestore
6. VP tarkistaa → sitten suostumuslomakkeet

### Pelihavainto-arkkitehtuuri (suunniteltu, Sprint 5)

**TIPS-malli:**
- T = Tekninen suoritus paineessa (D2)
- I = Pelikuva — Game IQ (D4)
- P = Persoona — intensiteetti (D3)
- S = Suorituksen nopeus (D1+D4)
- \+ IDP-tavoitteen toteutuminen (TM-uniikki)

**3 tasoa:**
- Taso 1: Valmentaja kirjaa 24h sisällä (Master-näkymä)
- Taso 2: Pelaaja arvioi 48h sisällä — näkee valmentajan VASTA oman jälkeen
- Taso 3: VP näkee molemmat + FLEI/PHV/bio-ikä/RAE vierellä (TM-uniikki)

**KV-perusta:** Ajax TIPS, GPAI, Premier League EPPP

**Demo rakennettu:** `TalentMaster_Pelihavainto_Demo.html`
- 3-vaiheinen prosessi, spider chart (5D), H-H testitulokset, PHV-konteksti
- Offline — ei GitHubissa

### Palloliiton yhteistyö (2026-04-09)
- Head of Talent -tapaaminen
- Positioning: TalentMaster = Myeway:n toiminnallinen pari
- Laukauskarttaa ei rakenneta — linkki Palloliiton BI:hin riittää

### Dokumentaatio
- `ARKKITEHTUURI.md`, `PERMISSION_MATRIX.md`, `ROADMAP.md` päivitetty 2026-04-09

---

## JavaScript-kirjastot

### harjoitelogiikka_v4.js (1887 riviä) — GitHubissa

**Kolme kielitasoa:**
```
leikkija  U8-12:  "leiki", "kokeile"
rakentaja U13-15: "tee näin" + perustelu
showcase  U16+:   termit + "mittaa" + "kirjaa"
```

**Julkinen API:**
```javascript
_ikatyyppi(ika)         → 'leikkija'|'rakentaja'|'showcase'
_laskeStage(pelaaja)    → 1-5
_ohje(harj, ityyppi)    → ohjeteksti kielitasolla
laskeKetjuProfiili(pel) → {heikoin, vahvin, jarjestys, arvot}
ytUrl(id)               → 'https://www.youtube.com/embed/{id}?rel=0'
generoimTehtavat(pel)   → [{id, tyyppi, label, ohje, yt, stage, ...}]
```

---

## FLEI — 5 ketjua (pysyvä)

| Ketju | Avain | Emoji | Selite |
|---|---|---|---|
| Vauhtiketju | `sbl` | ⚡ | Nopeus, räjähtävyys |
| Lähtöketju | `sfl` | 🦵 | Kiihdytys, pysähtyminen |
| Sivuketju | `ll` | ↔️ | Suunnanmuutos, feintit |
| Kiertoketju | `diag` | 🔄 | Syöttö, laukaus (SL+FL, Wilke 2016) |
| Hallintaketju | `dfl` | 🏗️ | Keskivartalo, hallinta |

Firestore: `flei_ketjut: {SBL, SFL, LL, DIAG, DFL}` (isolla)

---

## Kriittiset periaatteet (EI muuteta koskaan)

1. Super Admin `dqUzvJA61Wb9fgj5UiK0riSA4NI2` — pääsy kaikkialle aina
2. S-harjoite = heikoin ketju, ei profiiliin
3. T-harjoite = joka päivä, myös lepopäivät
4. PHV ohittaa Stagen (max Stage 2 kun PH)
5. 70/30: joukkueen alkurutiini JA pelaajan omatoimiohjelma
6. FLEI = 5 ketjua pysyvästi (SBL/SFL/LL/DIAG/DFL)
7. `diag` canonical — `sl`/`fl` poistunut
8. `super_admin` underscore canonical
9. Firestore Rules: `allow create` JA `allow update`
10. Ei VP + Admin samassa selainistunnossa
11. CDN: `?v=N` + tarkista raw.githubusercontent.com ensin
12. `onAuthStateChanged` loop: `_kirjautuminenKesken`-flag
13. `onSnapshot`: siivoa `tm:logout` + 50ms
14. `setCustomUserClaims` pakollinen `luoKayttaja`:ssa
15. `_pelaaja` on `let` — EI `window._pelaaja`
16. `harjoitelogiikka_v4.js` ennen pääscriptejä
17. YouTube: `embed/{ID}?rel=0`
18. Fiilinki-lukitus: `fiilinki_paivitetty` ennen renderöintiä
19. Super admin: `adminSnap.exists`
20. `huoltajaEmail` aina `.toLowerCase()`
21. Firebase Functions: AINA `firebase.app().functions('europe-west1')`
22. `testitapahtumat` oikea kokoelmanimi (EI `tapahtumat`)
23. `_avaaValmentajaPopup` GLOBAALI — EI nested
24. `nimiToUid`: UID-mismatch mentoroinnit ↔ kayttajat
25. `joukkueNimi`: display name, ei ID (bugi auki)

---

## Avoimet bugit (2026-04-09)

| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Pelaaja-sivu lagaa / ei toimi | TalentMaster_Pelaaja_v1.html | 🔴 Korkea |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v1.html | 🟡 Keski |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 Keski |

---

## Seuraavaan sessioon (tärkeysjärjestyksessä)

1. 🔴 Pelaaja-sivu lag-bugi — tutkimatta
2. 🔴 SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
3. 🔴 Excel → Firestore tuontityökalu
4. 🟡 Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
5. 🟡 Tyttöjen PHV-kaava (ennen U14/15T-aktivointia)
6. 🟡 Fiilinki ikävaihekysely-bugi
7. 🟢 Pending deploy: Koukutus.html + Valmentaja_Matriisi.html

---

## Avoimet tekniset asiat

- **Cloud Scheduler API:** console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot
- **Rules-deploy:** Firebase-konsoli (GitHub Actions → 403)
- **CDN cache:** ~10min — `?v=N` + tarkista raw.githubusercontent.com
- **Tyttöjen PHV:** Mirwald eri parametrit — tarkistettava ennen U14/15T-aktivointia
- **Palloliiton Power BI:** https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9
