# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
# Päivitetty: 2026-05-11

---

## Projektin tila

TalentMaster on jalkapallon pelaajankehitysalusta (SaaS, multi-tenant). Firebase-backend toimii Blaze-suunnitelmalla. Pilottiseurat ovat aktiivisia — SJK Juniorit on tuotu järjestelmään (40 pelaajaa, 4 joukkuetta). Seurahallinta on refaktoroitu ja tuotantovalmis. Talenttiohjelma-arkkitehtuuri on suunniteltu ja dokumentoitu.

**Filosofia:** *"Pelaaja ensin, hallinto vahvistaa"*
**Kilpailupositiointi:** *"Transfermarkt shows what. TalentMasterID shows how."*

---

## GitHub

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

Deployment: manuaalinen tiedostolataus GitHub-webin kautta (palomuuri estää Git CLI).
CDN-cache: GitHub Pages käyttää Fastly CDN:ää (~10 min). Testaa aina `?v=N` + tarkista `raw.githubusercontent.com`.

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore `eur3` multi-region
- **Auth:** Email/Password + Anonymous (PIN) + **Google Sign-In** (SA käyttää)
- **Functions:** `europe-west1` — AINA eksplisiittisesti

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
// KRIITTINEN: firebase.app().functions('europe-west1') — EI firebase.functions() (→ us-central1, hiljaa epäonnistuu)
```

---

## Käyttäjät

| Sähköposti | UID | Rooli | Huomio |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Google Sign-In |
| rasmus_broberg@icloud.com | YPOLkJE2BCeoUXZtXDD6L56... | VP KPV | vp.kpv EI ole Authissa |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

---

## Firestore-rakenne

```
seurat/{seuraId}/
  pelaajat/{pelaajaId}
    joukkueet: ["sjk_u13", "sjk_u15"]   ← uusi 2026-05-09, ID-viittaukset
    joukkue:   "SJK U13"                 ← backward compat, ensisijainen
    talenttiOhjelma: bool                ← uusi 2026-05-09
    talenttiTaso:    "perus"|"laajennettu"
    talenttiAlku:    Timestamp
    talenttiAktivoi: uid
    kirjaukset/{pvm}                     ← pelaajan päivittäiset kirjaukset (LUKITTU rakenne alla)
    havainnot/{havaintoId}               ← valmentajan kenttähavainnot
    omatoimi_ohjelmat/
  joukkueet/{joukkueId}                  ← Seura.html luo .doc(id)-metodilla (siisti ID)
  kayttajat/{uid}
  kutsut/{kutsuId}

admins/{uid}
testitapahtumat/                         ← EI tapahtumat — testidataa
```

**Kirjausrakenne Firestoressä (LUKITTU — AI-moduulit riippuvat tästä):**
```
pelaajat/{id}/kirjaukset/{pvm}
  tyyppi:    'T'|'D'|'S'|'P'
  tehty:     bool
  kesto_min: number
  rpe:       number
  fiilinki:  number
  aika:      'ilta'|'aamu'|'paiva'
```

---

## Testipelaaja: Topias Koskela (KPV)

```
Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I  ← KAKSI u:ta!
PIN:            9278
syntymaVuosi:   2013 (15.3.2013)
sukupuoli:      "M"   (EI "poika")
joukkue:        "KPV U13"
seuraId:        "kpv"
tunniste:       "34650191"   ← PalloID-kenttä
huoltajaEmail:  "TeroKoskela7@gmail.com"
flei_viimeisin: 62
sbl:2.16  sfl:2.30  ll:2.10 (HEIKOIN 55%)  diag:2.40  dfl:2.20
isDemoUser:     false
```

---

## Pilottiseurojen tila (2026-05-11)

| Seura | ID | Pelaajia | Joukkueet | Tila |
|---|---|---|---|---|
| FC Demo | demo | 13 | demo_u13, demo_u15, demo_u17 | Demo-data |
| KPV | kpv | 34 | KPV T18 (33), KPV U13 (1) | ✅ Aktiivinen pilotti |
| SJK Juniorit | sjk | 40 | SJK P14(6), P16(14), T14(9), T16(11) | ✅ Tuotu 2026-05-09 |
| GrIFK | grifk | 0 | — | Seura luotu |
| Pallo-Iirot | palloiirot | 0 | — | Seura luotu |
| Sibbo-Vargarna | sibbovargarna | 0 | — | Seura luotu |
| VIFK | vifk | 0 | — | Seura luotu |

SJK:n T14/T16 tytöt merkitty talenttiohjelma laajennettu-tasolle tuonnin yhteydessä.

---

## Tiedostojen tila

| Tiedosto | Tila |
|---|---|
| `TalentMaster_Admin.html` | ✅ Valmis — **vie GitHubiin** |
| `TalentMaster_Seura.html` | ✅ Valmis — **vie GitHubiin** |
| `TalentMaster_Master_v16.html` | ✅ Valmis — **vie GitHubiin** |
| `TalentMaster_Pelaajarekisteri.xlsx` | ✅ Valmis — **vie GitHubiin** |
| `CLAUDE.md` | ✅ Päivitetty 2026-05-09 — **vie GitHubiin** |
| `SESSION_SUMMARY.md` | ✅ Tämä tiedosto — **vie GitHubiin** |
| `docs/TALENTTIOHJELMA_ARKKITEHTUURI.md` | ✅ Uusi — **vie GitHubiin** (luo docs/-kansio) |
| `TalentMaster_VP_v22.html` | ✅ GitHubissa |
| `TalentMaster_Pelaaja_v7.html` | ✅ GitHubissa (v=24) |
| `TalentMaster_ADAR_Pikakortti.html` | ✅ GitHubissa |
| `TalentMaster_Vanhempi_v2.html` | ⚠️ Kovakoodattu nimi — P3 auki |
| `tm_eerikkila_normit.js` | ✅ GitHubissa |
| `tm_lang.js` | ✅ fi/sv/en, 144 käännöstä |
| `functions/index.js` | ✅ 7 Cloud Functionia + aiProxy deployattu |
| `tm_admin/firestore.rules` | ✅ v2.1.0 deployattu |

---

## Sessioiden yhteenveto — mitä tehty (05-08 + 05-09)

### Admin-sivu v2 (05-08)
Massakutsu uudelleenrakennettu: tallentaa `suostumusTila:'odottaa'`, EI sähköpostia. Joukkueet-sivu dynaaminen. `palloID` (iso I) korjattu. `lataaSeurat` muutettu `onSnapshot`-kuuntelijaksi. Nappi muutettu: "💾 Tuo pelaajat järjestelmään" + iso amber-varoituslaatikko VAIHE 1/2.

### Master v16 (05-08)
`onAuthStateChanged` korjattu (`_kirjautuminenKesken` poistettu). Google Sign-In lisätty. SA:n joukkuevalitsin dynaamiseksi. Kalenteri- ja testitapahtumabugi korjattu.

### Seurahallinta Seura.html (05-09) — isot muutokset
Joukkueet[]-arkkitehtuuri: pelaajalla nyt `joukkueet[]` (ID-viittaukset) + `joukkue` (backward compat). Muokkausmodaalin dropdown → checkboxit (useaan joukkueeseen). Joukkueen nimen muokkaus + batch-päivitys kaikille pelaajille. Talenttiohjelma-toggle + perus/laajennettu-valinta. KORI poistettu. Uusi Talentit-välilehti. Excel-pohja dynaaminen (SheetJS + Firestore-joukkueet). Duplikaattisuoja kahdella tasolla (palloID + nimi+joukkue). Joukkuesuodatus dynaamisilla nappuloilla. `suodataPelaajat` refaktoroitu kolmeksi erilliseksi funktioksi (`pelaajaRivi`, `paivitaNappienUlkoasu`, `renderPelaajaLista`).

### SJK-pelaajat tuotu (05-09)
40 pelaajaa, 4 joukkuetta. T14/T16 nimikorjaus batch-päivityksellä konsolista. PalloID-duplikaatti korjattu. Tyttöjen talenttiohjelma asetettu.

### Talenttitunnistuksen arkkitehtuuri dokumentoitu (05-09)
Täydellinen kuvaus: `docs/TALENTTIOHJELMA_ARKKITEHTUURI.md`. Ks. lyhyennos alla.

---

## Massakutsu — kaksivaiheinen prosessi (TÄRKEÄ)

Vaihe 1 nyt: Excel → Firestoreen `suostumusTila:'odottaa'`. EI sähköpostia.
Vaihe 2 tuleva: "Lähetä suostumuspyynnöt" -nappi kun kaikki näkymät tarkastettu.

---

## Kenttänimien canonical

| Oikein | Väärin |
|---|---|
| `palloID` (iso I) | `palloId` |
| `joukkue` (string) + `joukkueet` (array) | `joukkueNimi` |
| `suostumusTila` | `suostumus` |
| `syntymaVuosi` (integer) | `syntymavuosi` |
| `sukupuoli: "M"/"N"` | `"poika"/"tyttö"` |
| `super_admin` (alaviiva) | `superAdmin` |
| `testitapahtumat` (kokoelma) | `tapahtumat` |
| `tunniste` (PalloID Firestoressä) | `palloId` |

---

## Cloud Functions (7 kpl, europe-west1)

| Funktio | Tarkoitus |
|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä |
| `lahetaPelaajaSivuLinkki` | Linkit + salasananollaus |
| `tasoHaeSeuranOttelut` | TASO API |
| `aiProxy` | AI-kutsujen välittäjä (Anthropic/OpenAI/Gemini) |

---

## Eerikkilä-normitaulukot (`tm_eerikkila_normit.js`)

11 testiä, pojat P10–M ja tytöt T10–N. **Tallennetaan AINA raakadata Firestoreen, taso lasketaan lennossa.**

```javascript
eerikkilaTaso(arvo, testi, ika, sukupuoli)  // → 1–5 (tai 1–3 tekniikalle)
eerikkilaProfiilit(pelaaja)                  // → {nopeus_30m: 3, hyppy_cj: 4, ...}
laskeEI(cj_cm, sj_cm)                       // elastisuusindeksi (CMJ−SJ)
laskeFVP(n5m_s, n30m_s)                     // voima-nopeus-profiili
laskeTSI(smjuoksu_s, smpallo_s)             // tekniikka-nopeus-indeksi ← kriittisin talentti-indikaattori
```

Tekniikkatestit (pujottelu, syöttö): 3-portainen asteikko. Muut: 5-portainen.

---

## Talenttitunnistus — avainasiat (täydellinen kuvaus docs/TALENTTIOHJELMA_ARKKITEHTUURI.md)

**TSI** (SM-pallo − SM-juoksu) on kriittisin yksittäinen talentti-indikaattori. SM-juoksu ja SM-pallo ovat H-H patteriston suunnanmuutostestejä — eivät erillisiä lajitekniikatestejä. H-H taso 3 = kansallinen, taso 4–5 = kansainvälinen.

**Kehitysvauhti on tärkeämpi kuin hetkellinen taso** — tämä on kansainvälisen tutkimuksen konsensus.

**Hidden Gem** = kehitysvauhti nouseva + biologinen alijäämä (Q3/Q4 tai pre-PHV) + taso alle mediaanin. **X-Factor** = jo korkea taso (≥4) + poikkeuksellinen erottuvuus yhdellä osa-alueella.

**Talenttiohjelma-prosessi:** Valmentaja ehdottaa → VP/TV vahvistaa datalla → 30pv aikaraja → kahden roolin hyväksyntä tallennetaan. Poistuminen vaatii VP:n aktiivisen päätöksen + perustelun. Talenttinimitys alkaa 13v:sta. Pienessä seurassa voi olla vain 5 talenttia — järjestelmä suosittelee realistisen määrän eikä pakota 20:een.

---

## Avoimet tehtävät

**Välittömät:** Security Rules v2.3 deploy Firebase Consolesta. VP_v22 testaus KPV:llä (`rasmus_broberg@icloud.com`). Vie kaikki listatut tiedostot GitHubiin.

**Kriittiset ennen laajentumista:**

| # | Tehtävä | Prioriteetti |
|---|---|---|
| P3 | Vanhemman app: kovakoodattu "Eemeli" → `where('huoltajaEmail','==',email)` | 🔴 |
| P4 | Firestore Rules vanhemmalle: `resource.data.huoltajaEmail == request.auth.token.email` | 🔴 |
| P6 | Valmentajan kenttähavainto → Firestore → pelaajan näkymä (ketju puuttuu) | 🔴 |
| — | Streak → Firestore — pakollinen ennen AI-moduuleja | 🔴 |
| — | Suostumusprosessi vaihe 2 — "Lähetä suostumuspyynnöt" -nappi | 🟡 |
| — | Security Rules v2.3 deploy Firebase Consolesta | 🟡 |
| P5 | Fiilinki ikäfaasikohtaiseksi (U13 leikkija-kieli) | 🟡 |
| P7 | IDP-aktivointilogiikka (3 reittiä: manuaalinen/HG-signaali/XF-signaali) | 🟡 |
| — | RAE BQ-jakauma VP_v22:ssa | 🟡 |
| — | Tyttöjen PHV-kaava ennen SJK U14/15T -aktivointia | 🟡 |
| — | SPF/DKIM — sähköpostit roskapostiin | 🟡 |

---

## Arkkitehtuurin invariantit — ei saa koskaan rikkoa

1. **SA** (`talentmasterid@gmail.com`, UID:`dqUzvJA61Wb9fgj5UiK0riSA4NI2`) — Google Sign-In, tunnistus `adminSnap.exists`
2. **Cloud Functions** AINA `europe-west1` eksplisiittisesti — `firebase.functions()` menee `us-central1`
3. **Rooli canonical:** `super_admin` (alaviiva, ei camelCase)
4. **FLEI = 5 ketjua:** SBL, SFL, LL, DIAG, DFL. Asteikko 1–3, normalisointi `(arvo-1)/2×100`. Default `2.0` (50%) kun ei dataa.
5. **`serverTimestamp()`** EI array:n sisällä → käytä `new Date().toISOString()`
6. **Firestore Rules:** `allow create` JA `allow update` molemmat pakollisia
7. **Firestore Rules** EI periydy alikokoelmiin — jokainen vaatii oman blokin
8. **`testitapahtumat`** EI `tapahtumat` testien kokoelmana
9. **Joukkueet:** Seura.html luo `.doc(id)`:llä (siisti ID), Admin ei luo joukkueita
10. **Massakutsu** = datantuonti vain — EI sähköpostia (vaihe 2 erikseen)
11. **Nested template literals** rikkovat parserin → string concatenation (`+`)
12. **PIN login:** `await user.getIdToken(true)` ennen Firestore-kirjoitusta
13. **GitHub CDN** ~10 min → `?v=N` + tarkista `raw.githubusercontent.com`
14. **`palloID`** isolla I kaikkialla — `tunniste`-kenttä tallentaa PalloID:n pelaajadokumenttiin
15. **Anonyymeillä Auth-käyttäjillä** (PIN) oltava eksplisiittinen pääsy Security Rules:ssa
16. **`window._pelaajaMap`** välimuistittaa `{tunniste, nimi, joukkue}` per Firebase ID
17. **Raakadata Firestoreen** — normalisointi koodissa. Älä tallenna `taso:3`, tallenna `arvo:4.42s`
18. **`syntymaVuosi`** numerona — `syntymaaika` on Timestamp erikseen
19. **`Date.UTC(y, m-1, d)`** päivämääräjäsentämiseen — EI `new Date(string)`
20. **Topias dokumentti-ID:** `m93GBdOaGCUuenMiCL0I` — **kaksi u:ta**
21. **`joukkueet[]` + `joukkue`** molemmat pelaajalla — uusi array + backward compat string
22. **Excel-sarakeotsikoissa EI suluissa olevaa tekstiä** — rikkoo `etsiSarake` (vaikka `startsWith` korjaa)
23. **SA kirjautuu Google Sign-In:llä** — ei email/salasana

---

## AI-arkkitehtuuri (Sprint 6–8)

Kaikki AI-kutsut: `TM_AI.call()` → `aiProxy` Cloud Function (europe-west1) → provider. API-avaimet EIVÄT koskaan selaimessa.

Rakentamisjärjestys: 1) Pelihavainto AI (GPT-4o Vision → ADAR), 2) Äänikirjaus (Whisper-1 → Firestore), 3) Kehitysnarratiivi (Assistants API, thread per pelaaja), 4) Behavioural Science -agentti (Anthropic, vaatii 2–4 vk kirjausdataa).

Kriittisin riski: Streak → Firestore liian myöhään → Moduuli 4 ei ehdi aktivoitua pilottikauden aikana.

---

## Pelaajan app — Piilotettu scene-bar (`display:none`)

Kehitysnavigaatio — näkyy vain SA:lle/kehittäjälle. Tuotannossa vain D·PIN ja A1 KOTI.

| Nappi | Nimi | Tila |
|---|---|---|
| D · PIN | PIN-kirjautuminen | ✅ Tuotanto |
| A1 | KOTI | ✅ Tuotanto |
| A2 | Signal / CTA-versio | 🔵 Konsepti |
| B | Harjoitus + valmentajavideo | 🔵 Konsepti |
| C | FIFA-tyylinen pelaajakortti (OVR 87) | 🔵 Konsepti |
| I | Vanhempi (viikkotarina, kalenteri, kehuviesti) | 🔵 Konsepti |

Seuraavaksi rakentaa: C (OVR-kortti) ja I (Vanhempi-konsepti).

---

## Aloita uusi sessio näin

```
Jatketaan TalentMaster-pilottia. SESSION_SUMMARY.md on liitetty.
Ensimmäinen tehtävä: [kirjoita tehtävä tähän]

Live:  https://terokoskela7-cmyk.github.io/talentmaster/
Admin: https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
Seura: https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html
SA:    talentmasterid@gmail.com (Google Sign-In)
PIN:   9278 (Topias Koskela, KPV)
```
