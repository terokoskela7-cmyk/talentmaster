# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-04-02)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 7 aktiivista pilottiseuraa. Firebase Blaze-plan, GitHub Pages (Fastly CDN), vanilla JS. Kaikki perusnäkymät toimivat tuotannossa. Tässä sessiossa rakennettiin TASO-integraatio (Palloliiton tulospalvelu) ja korjattiin useita VP v18 -bugeja.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Aktiiviset tiedostot (viimeisimmät versiot)

| Tiedosto | Versio | Kuvaus |
|---|---|---|
| `TalentMaster_VP_v18.html` | v18 | VP-dashboard — AKTIIVINEN |
| `TalentMaster_Master_v9.html` | v9 | Valmentajan näkymä |
| `TalentMaster_Seura.html` | v7+ | Seurahallinta (VP/sihteeri) |
| `TalentMaster_Rekisterointi_Suostumus.html` | — | Huoltajan suostumuslomake |
| `TalentMaster_IDP_Kortti_v3.html` | v3 | IDP-kortti (toimii KPV:llä) |
| `TalentMaster_Pelaaja_v1.html` | v1 | Pelaajan gamified näkymä |
| `functions/index.js` | — | Cloud Functions (7 kpl) |
| `hpp_rehab_protokollat.js` | — | 25 kuntoutusprotokollaa |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore `eur3` multi-region
- **Auth:** Email/Password
- **Functions:** Node.js 22, `europe-west1`
- **Sähköposti:** SendGrid HTTP API

### Konfiguraatio
```javascript
const firebaseConfig = {
  apiKey:            "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain:        "talentmaster-pilot.firebaseapp.com",
  projectId:         "talentmaster-pilot",
  storageBucket:     "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId:             "1:872561784446:web:05c4c7996dfd46ddd14a2f"
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
- `seurat/{id}` — 7 pilottiseuraa
- `seurat/{id}/tapahtumat/taso_{match_id}` — TASO-ottelut (lahde: "taso") **UUSI**
- `admins/` — super-admin dokumentti
- `seurat/{id}/pelaajat/` — pelaajat palloID-kentällä

---

## Cloud Functions (functions/index.js) — 7 kpl

| Funktio | Tyyppi | Kuvaus |
|---|---|---|
| `lahetaRekisteriKutsu` | callable | Lähettää huoltajalle rekisteröintilinkin |
| `lahetaHuoltajaKutsu` | callable | Vanhempi yhteensopivuus |
| `luoKayttaja` | callable | Luo valmentajan/VP:n Firebase Auth + Firestore |
| `deaktivioiKayttaja` | callable | Deaktivoi käyttäjän |
| `lahetaPelaajaSivuLinkki` | callable | Lähettää pelaajasivun linkin huoltajalle |
| `tasoHaeMaatcheck` | cron 06:00 | **UUSI** Hakee ottelut kaikille seuroille päivittäin |
| `tasoHaeSeuranOttelut` | callable | **UUSI** VP triggeröi otteluhaun heti Seura.html:stä |

---

## TASO-integraatio (UUSI 2026-04-02)

### Miten toimii
```
VP kirjautuu taso.palloliitto.fi pääkäyttäjänä
  → Valikko → Rajapinta → hyväksy käyttöehdot → kopioi API-avain
  → Tallentaa avaimen + club_id:n Seura.html:n TASO-asetuksiin (kerran)

Cloud Function tasoHaeMaatcheck (cron klo 06:00)
  → Hakee kaikki seurat joilla taso_api_key
  → GET /getClub → joukkueet → GET /getMatches per joukkue
  → Upsert Firestoreen: seurat/{id}/tapahtumat/taso_{match_id}

VP v18 kalenteri näyttää ottelut automaattisesti
```

### Firestore-kentät seuradokumentissa
```javascript
seurat/{seuraId}/ {
  taso_api_key:        "abc123",   // VP tallentaa kerran
  taso_club_id:        "2970",     // Palloliiton seura-numero
  taso_viimeisin_haku: timestamp,
  taso_ottelut_lkm:    47,
}
```

### Ottelutapahtuman rakenne
```javascript
seurat/{id}/tapahtumat/taso_{match_id}/ {
  tyyppi: "ottelu", lahde: "taso",
  taso_ottelu_id: "12345",
  nimi: "KPV U15 – FC Lahti U15",
  pvm: "2026-05-10", aika: "14:00",
  kotiJoukkue, vierasJoukkue, kentta, sarja, tulos, tila
}
```

### TASO REST API
- Base URL: `https://spl.torneopal.fi/taso/rest/`
- Avain: seuran pääkäyttäjä → TASO → Rajapinta → hyväksy käyttöehdot
- Endpointit: `getClub`, `getMatches`, `getTeams`, `getVenues`, `getDistricts`
- Kausi-formaatti: `"2025-2026"` tai `"2026"`
- `match_id` on uniikki → Firestore-doc-ID `taso_{match_id}`

### UI-komponentti (taso_seura_ui.html)
Lisätään Seura.html:n asetukset-osioon. Sisältää:
- API-avain (password-kenttä, tallennetaan salattuna) + club_id -lomake
- "Hae ottelut nyt" -nappi → kutsuu `tasoHaeSeuranOttelut`
- Tila-badge (Ei konfiguroitu / Konfiguroitu)
- Viimeisin haku -info

---

## PalloID — tilanne

- Rekisteröintilomakkeessa kenttä `id="i_pid"` ✅
- Tallentuu Firestoreen `palloID`-kenttään ✅
- Seura.html lukee `p.palloID || p.palloid || p.palloId` ✅
- Jos palloID tiedetään, käytetään pelaajan Firestore-doc-ID:nä ✅
- Vaihe 2: palloID linkittää pelaajan TASO-ottelukokoonpanoihin

---

## Tässä sessiossa korjatut bugit

### VP v18 — puuttuvat funktiot (kaikki lisätty)
- `kirjauduUlos()` — puuttui, "Kirjaudu ulos" kaatoi ReferenceError
- `naytaTabi(nimi, btn)` — tab-navigointi + lazy loading
- `avaaUusiTapahtuma()` — kalenteri-napin toiminta
- `_vpValitseTyyppi()` — tapahtuman tyypin valinta modalissa
- `_vpAvaaLuoModal()` / `_vpAvaaLuoModalPvm()` — modaalien avaus
- `_vpAvaaDetModal()` — tapahtuman detaili-modaali
- `_vpMuutaTila()` — tapahtuman tilan muutos
- `_vpNaytaMitaSeuraavaksi()` — onnistumisviesti

### Master v9 — superadmin kirjautuminen korjattu
```javascript
if (!sallitutRoolit.includes(rooli) && rooli !== 'vp'
    && rooli !== 'superadmin' && rooli !== 'super_admin') {
```

---

## Tiedostot joita EI OLE vielä deployttu

| Tiedosto | Mitä pitää tehdä |
|---|---|
| `TalentMaster_VP_v18.html` | Korvaa GitHubissa (outputs-kansiossa) |
| `functions/index.js` | Korvaa GitHubissa → GitHub Actions deploy |
| `taso_seura_ui.html` | Lisää Seura.html:ään (outputs-kansiossa) |

Master v9 on jo deployttu suoraan GitHubissa.

---

## Seuraavat prioriteetit

1. **Deploy** — `VP_v18.html` + `functions/index.js` GitHubiin → Actions
2. **KPV API-avain** — Pyydä Topias Koskelalta → testaa TASO-integraatio
3. **Seura.html TASO-UI** — `taso_seura_ui.html` integrointi
4. **Valmentajan kartoitusnäkymä** — kriittisin puute ennen pilotin laajentamista
5. **VP v18 KPI-mittarit** — Delta 30pv, ikäluokat-taulukko

---

## Teknisiä muistiinpanoja

**Firebase:**
- Super-admin: `admins/{uid}` dokumentin olemassaolo riittää (ei tarvita kenttiä)
- `onAuthStateChanged` double-fire estetään `_kirjautuminenKesken`-lipulla
- TASO-avain tallennetaan selväkielisenä seuradokumenttiin (riittävä pilotissa)
- Batch max 500 → TASO käyttää 400 per erä

**GitHub Pages / CDN:**
- Fastly CDN — `?v=N` cache-busting tai odota ~10min
- Tarkista: `https://raw.githubusercontent.com/terokoskela7-cmyk/talentmaster/main/[tiedosto]?nc=[timestamp]`
- MCP file_upload epäonnistuu >100KB tiedostoille → käytä present_files + manuaalinen upload

**Jopox-analyysi:**
- Seurahallintajärjestelmä (Hilla Group), 9,90 €/kk/joukkue
- Ei julkista APIa — kalenteri integroituu TASO:on (sama lähde)
- TalentMaster ja Jopox täydentävät: Jopox = hallinto, TalentMaster = kehitys

---

## Identiteetti-arkkitehtuuri

- Firebase UID = ankkuri johon kaikki data kiinnittyy
- PalloID = Palloliiton lisätunniste (`palloID`-kenttä)
- Vaihe 2: PalloID linkittää TASO-ottelukokoonpanoihin
- Vaihe 3: SporttiID = universaali urheilija-ID yli lajirajojen

---

## Pilottiseurat (7 kpl)

| ID | Seura | Tila |
|---|---|---|
| kpv | KPV | Aktiivinen — tärkein pilotti, Topias Koskela yhteyshenkilö |
| fcl | FC Lahti Juniorit | Aktiivinen |
| palloiirot | Pallo-Iirot | Aktiivinen |
| yvies | Ylöjärven Ilves | Aktiivinen |
| sjk | SJK Juniorit | Aktiivinen |
| grifk | GrIFK | Aktiivinen |
| hjk | HJK Juniorit | Tulossa |

---

## Bisnesmalli

- Kiinteä seuralisenssi 200–400 €/kausi (MRR)
- Per-pelaaja raportti (skaalautuva)
- Klinikka kertamaksuna
- Paketit: Perustaso / Kehitystaso / Huipputaso
- Palloliitto-yhteistyö: esitys tehty, merkittävä strateginen mahdollisuus

---

## Gamification-analyysi ja Pelaaja-appin kehityssuunta (2026-04-02)

### Tutkimuslöydökset
- Gen Z (10–19v) käyttää mobiilia 2× enemmän kuin yli 45-vuotiaat
- 65% Gen Z:sta pelaa yli 3h/pv — pelimekaniikka on heille normaali tapa toimia
- Gen Z:lle toimivat: streak (tottumus), näkyvä edistyminen (OVR/XP), sosiaalinen kilpailu
- Passiivinen data ei muuta käyttäytymistä — tarvitaan aktiivinen toimintasilmukka
- Jokainen lisäaskel onboardingissa kasvattaa poistumaa 20%
- Gamifioitu onboarding kasvattaa tehtävien suoritusastetta 135%

### Pelaaja v1 — mitä on jo oikein
- Streak + freeze-mekaniikka ✅
- XP-tasot (Basic → Kilpailija → Sharp → Elite → Signature) ✅
- FIFA-korttityylinen hero-card (OVR/avatar) ✅
- Kaverihaasteet (6-merkkiset koodit, 4 tyyppiä) ✅
- Fiilinki-emoji (anonyymi mielialakirjaus) ✅
- Kehityskorttien lunastus harvinaisuusprosentilla ✅

### Kriittisin puute — toimintasilmukka puuttuu
Valmentaja ei voi asettaa tehtäviä eikä pelaaja voi kuitata niitä.
Tämä on se pala joka saa pelaajan avaamaan appin **joka päivä**.

### Sprint-suunnitelma

**Sprint 1 — Päivittäinen mikrotehtävä (seuraava sessio)**
```
Master v9: valmentaja asettaa "Päivän tehtävä" joukkueelle
  → Firestore: seurat/{id}/joukkueet/{jId}/paivan_tehtava/{pvm}

Pelaaja v1: tehtäväkortti hero-kortin alla
  "📋 Tänään: 3×10 pallokosketusta seinää vasten"
  [Merkitse tehty] → +30 XP → streak kasvaa
```
Toteutustapa: **itsenäiset komponentit** (ei suoraa tiedostomuokkausta)
— vähemmän bugeja koska liitoskohdat ovat tarkat ja pienet

**Sprint 2 — Joukkueen viikkohaaste**
```
Automaattinen joka maanantai joukkueelle:
"KPV U15 — tavoite: 80% kirjaa harjoituksen tällä viikolla"
Tilanne näkyy kaikille pelaajille reaaliajassa
```

**Sprint 3 — PWA push-ilmoitukset**
```
Muistutus klo 16:30: "Hei Mikael 🔥 Streak 7 päivää — jatka tänään!"
Vaatii PWA-manifesti + service worker
```

### Firestore-rakenne Sprint 1:lle
```javascript
// Valmentaja kirjoittaa:
seurat/{seuraId}/joukkueet/{joukkueId}/paivan_tehtava/{pvm}/ {
  teksti: "3×10 pallokosketusta seinää vasten",
  xp: 30,
  asettanut: valmentajaUid,
  asetettu: timestamp,
  pvm: "2026-05-10"
}

// Pelaaja kuittaa:
seurat/{seuraId}/pelaajat/{pelaajaId}/tehtava_kuitattu/{pvm}/ {
  kuitattu: timestamp,
  xp_saatu: 30
}
```

### Seuraavan session aloitus
Tero tuo Pelaaja v1:stä ja Master v9:stä nämä kohdat:
1. Hero-kortin sulkevan `</div>`:n ympäriltä ~5 riviä
2. JS-lohkon alun (`const _db` tai `firebase.firestore()`)
3. Master v9:stä ensimmäisen tabi-osion alku

Näiden perusteella rakennetaan tarkat komponentit ilman bugiriskiä.
