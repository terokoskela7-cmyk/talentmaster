# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-04-07

---

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa
muiden lajien) talenttiarviointiin ja pelaajakehityksen johtamiseen.
Asiakas on seura, ei yksittäinen valmentaja.

**Filosofia:** "Pelaaja ensin, hallinto vahvistaa" — järjestelmä on
rakennettu lapsen kehitystarpeesta ylöspäin, ei hallinnon tarpeesta alaspäin.

---

## Seitsemän kerroksen arkkitehtuuri

```
Kerros 1:  Pelaaja / Pelaaja v1              ← pelaajan arjen työkalu
Kerros 2:  Valmentaja / Master v9            ← kenttähavainto + ADAR
Kerros 3:  Game IQ / D4 / ADAR-moduuli      ← kognitiivinen kehitys
Kerros 4:  IDP-kortti v3                    ← yksilöllinen kehityskortti
Kerros 5:  IDP-aktivointi (3 reittiä)       ← aktivointilogiikka
Kerros 6:  VP / johtamisjärjestelmä         ← seuran johtaminen
Kerros 7:  Fyysinen → teknis-taktinen       ← lopullinen tavoite
```

Kaikki kerrokset kytkeytyvät Firestoreen yhteiseen datarakenteeseen.

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla, IIFE-pattern) | GitHub Pages |
| Tietokanta | Firebase Firestore | `eur3` multi-region |
| Autentikointi | Firebase Auth + Custom Claims | Email/Password |
| Cloud Functions | Node.js, europe-west1 | Firebase Blaze |
| Admin-skriptit | Node.js + Firebase Admin SDK | GitHub Actions |
| Excel-lukeminen | SheetJS 0.18.5 (client-side) | Selain |
| Excel-generointi | openpyxl (server-side, Cloud Function) | Firebase |
| Sähköposti | SendGrid HTTP API | Cloud Functions |
| Testiindeksit | testit_indeksit.js (1210 riviä) | GitHub Pages |
| Testipankki | tm_testipankki.js (64 testiä, 5 FLEI-ketjua) | GitHub Pages |
| Ketjumatriisi | tm_ketju_matriisi.js (fascia ↔ testi ↔ pallotekniikka) | GitHub Pages |
| **Harjoitelogiikka** | **harjoitelogiikka_v4.js (1887 riviä) — UUSI 2026-04-07** | **GitHub Pages** |

---

## Firebase-projekti

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Firestore sijainti:** `eur3` multi-region
- **Super Admin:** `talentmasterid@gmail.com` (UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`)

**ABSOLUUTTINEN PERIAATE:** Super Adminilla on aina pääsy kaikkeen.
Tämä ei saa koskaan rikkoutua koodipäivityksissä.

---

## Firestore-tietokantarakenne

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/                          ← fcl, kpv, palloiirot, yvies, sjk, grifk, vifk
    id, nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    ominaisuudet[], roolit[]
    max_pelaajia, tilastot{}
    tavoiteprofiili{}
    tmTaso: 'perustaso'|'kehitystaso'|'huipputaso'
    palloliittoKori: '1'|'2'|'3'
    luotu

    joukkueet/{joukkueId}

    kayttajat/{kayttajaId}
      uid, email, etunimi, sukunimi
      rooli, seuraId
      joukkue, joukkueet[]
      aktiivinen, luotu, luonut_uid

    pelaajat/{pelaajaId}/
      etunimi, sukunimi, syntymaaika
      palloID, seuraId
      joukkue: string
      joukkueet: []
      suostumusTila: 'odottaa'|'annettu'
      tila: 'aktiivinen'|null
      huoltajaEmail
      biologinen_ika{}                ← Mirwald 2002
      phv_tila: 'PH'|'KV'|'AN'
      flei_profiili{}
      flei_ketjut{}                   ← {SBL, SFL, LL, DIAG, DFL} 0-100 — UUSI
      tki{}
      tsi{}

      kirjaukset/{pvm}/               ← avain = 'YYYY-MM-DD'
        tyyppi: 'T'|'D'|'S'|'P'
        tehty: bool
        kesto_min, rpe: 1-10
        aika: 'ilta'|'aamu'|'paiva'
        fiilinki: 1-5
        uni: 1-3                      ← mini-Hooper, U13+
        lihaskunto: 1-3               ← mini-Hooper, U13+
        fiilinki_paivitetty: ISO-ts   ← lukitusavain — UUSI

      testit/{testiId}
      kartoitukset/{kartoitusId}
      tekniikka/{kilpailuId}
      adar/{adarId}
      havainnot/{havaintoId}
      idp_kausi/{kaudenId}
      idp_taso/{tasomenId}
      ketjut/{ketjuId}
      streak/{streakId}
      kuorma/{kuormaId}
      vammat/{vammaId}
      omatoimi_ohjelmat/{ohjelmaId}/
      d3_profiili/{profiiliId}/

    harjoitukset/{pvmId}
    havainnot/{havaintoId}
    merkinnät/{merkintaId}
    testit/{testiId}
    kartoitukset/{kartoitusId}
    tekniikka/{kilpailuId}
    adar/{adarId}
    kuorma/{kuormaId}
    vammat/{vammaId}

    identiteettiprofiili/{kaudenId}/

// UUSI 2026-04-07
utj_data/{kausi}/
  kasvatteja: int
  vlYkk: int
  minuuttia: int
  seurat: []

kirjaukset/           ← vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/
```

---

## Sivuarkkitehtuuri (vahvistettu 2026-04-07)

| Tiedosto | Rooli | Tila | Huomio |
|---|---|---|---|
| `TalentMaster_VP_v18.html` | vp | ✅ tuotannossa | — |
| `TalentMaster_UTJ_v1.html` | urheilutoimenjohtaja | ✅ **UUSI** | kasvattisuppilo + Firestore |
| `TalentMaster_Master_v9.html` | valmentaja + kenttäroolit | ✅ tuotannossa | — |
| `TalentMaster_Seura.html` | seurasihteeri, utj, vp, super_admin | ✅ tuotannossa | — |
| `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ **merkittävästi päivitetty** | v4-logiikka + Stage + popup + fiilinki-lukitus |
| `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ tuotannossa | — |
| `TalentMaster_Rekisterointi_Suostumus.html` | anonyymi/huoltaja | ✅ tuotannossa | — |
| `TalentMaster_Kortit.html` | pelaaja (keräilykortit) | ✅ **UUSI + spesiaalikortit** | WOW-animaatio |
| `TalentMaster_Vanhempi.html` | huoltaja | ✅ tuotannossa | — |

---

## Cloud Functions — 6 deployattu (europe-west1)

| Funktio | Tarkoitus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit vanhemman/pelaajan sivulle | ✅ |
| `tasoHaeSeuranOttelut` | Ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU |

---

## Harjoitelogiikka v4 — arkkitehtuuri (UUSI 2026-04-07)

### Tiedosto: `harjoitelogiikka_v4.js` (1887 riviä)

Korvaa `harjoitelogiikka_v3.js`:n. Harjoitesisältö on erotettu omaan
JS-tiedostoon — `TalentMaster_Pelaaja_v1.html` delegoi kaiken `<script src>`:lla.

### Kolme kielitasoa
```
leikkija  (U8–U12):  "leiki", "kokeile" — konkreettinen, ei termejä
rakentaja (U13–U15): "tee näin", lyhyt perustelu
showcase  (U16–U19): termit ok, "mittaa", "kirjaa"
```

### 5 liikeketjua — DIAG korvaa SL+FL pysyvästi
```javascript
const KETJUT = {
  sbl:  '⚡ Vauhtiketju',      // SBL — takaketju
  sfl:  '🦵 Lähtöketju',       // SFL — lonkkaketju
  ll:   '↔️ Sivuketju',        // LL — lateraaliketju
  diag: '🔄 Diagonaaliketju',  // DIAG = SL+FL (Wilke 2016 ⭐⭐⭐)
  dfl:  '🏗️ Hallintaketju',    // DFL — syvä core
};
// 'pig' / Peliäly = D4-dimensio, EI liikeketju
// 'sl' ja 'fl' poistunut — laskeKetjuProfiili() hoitaa backward-yhteensopivuuden
```

### Stage-laskenta
```javascript
_laskeStage(pelaaja)
// 1. harjoitettavuus_pisteet → Stage 1-5
// 2. fallback: ikä (U10→1, U12→2, U14→3, U16→4, U18+→5)
// + 8-viikon jaksovaihe: Pohja+0 / Kehitys+1 / Huipentuma+2
// PHV-rajoite: phv_tila==='PH' → max Stage 2
```

### Julkinen API
```javascript
_ikatyyppi(ika)                       → 'leikkija'|'rakentaja'|'showcase'
_laskeStage(pelaaja)                  → 1-5
_ohje(harj, ityyppi)                  → ohjeteksti oikealla kielitasolla
_valitseStage(stage_tasot, stage)     → harjoiteobjekti
laskeKetjuProfiili(pelaaja)           → {heikoin, toiseksiHeikoin, vahvin, jarjestys, arvot}
ytUrl(id, haku)                       → 'https://www.youtube.com/embed/{id}?rel=0'
generoimTehtavat(pelaaja)             → [{id, tyyppi, label, ohje, yt, stage, ityyppi, ...}]
generoimViikoOhjelma(pelaaja, pvat)   → {ma:[], ti:[], ...}
```

---

## 8-viikon jaksotuslogiikka

```javascript
const JAKSO_RAKENNE = {
  pohja:      { viikot:'1-3', stageModif:0, emoji:'🌱', vari:'#00D4AA' },
  kehitys:    { viikot:'4-6', stageModif:1, emoji:'📈', vari:'#FFB020' },
  huipentuma: { viikot:'7-8', stageModif:2, emoji:'🔥', vari:'#A855F7' },
};
// Sykli: kalenteriviikko % 8 → 1-8
// stageModif lisätään FLEI-pohjaiseen Stage-laskentaan
```

---

## Pelaaja v1 — uudet ominaisuudet (2026-04-07)

| Ominaisuus | Kuvaus |
|---|---|
| Jaksoinfo-palkki | `laskeMissaJaksossa()` → "🔥 Huipentuma-jakso · Vk 7/8" tänään-näkymässä |
| Stage-badge | D-harjoitteessa: "S3 — Lisähaaste" + sarjat + tempo |
| Miksi juuri nyt? | Selkokielinen perustelu stage-valinalle |
| Progressio-preview | "Seuraava askel (S4): ..." |
| Ohjeet-popup | `avaaOhjePopupPelaaja()` — popup keskellä ruutua, ei alhaalta |
| Fiilinki-lukitus | Päiväkohtainen, Firestore-tarkistus + visuaalinen badge |
| Video-linkit | `youtube.com/embed/{ID}?rel=0` jokaisessa harjoitteessa |
| DIAG-ketju | `sl` → `diag` kaikissa kartoissa |

---

## Keräilykorttiarkkitehtuuri — `TalentMaster_Kortit.html`

### Perussarjat
```
KORTIT.huuhkajat[]      ← Suomen maajoukkue
KORTIT.helmarit[]       ← Naisten maajoukkue
KORTIT.veikkausliiga[]  ← Veikkausliiga 2025
```

### Spesiaalikorttiluokat (UUSI 2026-04-07)
```
🔥 FIRE      — läpimurtokortit    (oranssipunainen, 1.8s pulssi)
💎 ICON      — legendakortit      (holografinen violetti-sininen, kiertyy)
⭐ MILESTONE — kehityskortti      (kulta, starPulse, milestoneInfo)
🌟 TOTY      — kauden parhaat     (platinanvalkoinen, kirkkain)
```

### WOW-avausanimaatio
```
1. Flash-burst (radial gradient)
2. 22 partikkelia (CSS --px/--py muuttujat)
3. Kortti: rotateY(-90°→+15°→-8°→0°) cubic-bezier(.34,1.56,.64,1)
4. Otsikko liu'uu ylhäältä (labelSlide)
5. Sulje: taustaklik tai Esc
```

### Milestone-kortit ← Firestore (tuleva)
- 30-päivän streak → "30 PÄIVÄN PUTKI"
- FLEI ≥ 80 → "FLEI 80+"
- PHV läpikäynty → "PHV-selviytymiskortti"
- KORI-status → "Seuran kasvatti"

---

## UTJ v1 — Urheilutoimenjohtajan näkymä (UUSI 2026-04-07)

Erillinen näkymä UTJ:lle. Kasvattisuppilo-aikajanakaavio:
- 2 SVG-viivaa: kasvatteja (teal) + VL/Ykkönen (kulta)
- Firestore: `utj_data/{kausi}` → {kasvatteja, vlYkk, minuuttia, seurat[]}
- Fallback demo-data jos Firestore tyhjä

---

## Security Rules

- **super_admin:** kaikkeen
- **vp:** oma seura, kaikki
- **valmentaja:** lukee oman seuran, kirjoittaa havainnot + harjoitukset + merkinnät
- **urheilutoimenjohtaja:** aggregoitu seuradata, ei pelaajien yksilödata
- **fysioterapeutti:** `vammat` strict
- **pelaaja:** lukee oman profiilin, kirjoittaa `kirjaukset/{pvm}`
- **vanhempi:** lapsen profiili pelkistetysti
- **anonyymi:** vain `suostumusTila=='odottaa'`

---

## Custom Claims

```javascript
super_admin | vp | seurasihteeri | urheilutoimenjohtaja |
valmentaja | talenttivalmentaja | fysiikkavalmentaja |
fysioterapeutti | testivastaava | pelaaja | vanhempi
// underscore-muoto CANONICAL kaikkialla
```

---

## Kriittiset tunnetut ratkaisut

1. Firestore Rules: `allow create` JA `allow update` — `set({merge:true})` käyttää update jos doc olemassa
2. Syntymäpäivä: `Date.UTC(y, m-1, d)` — EI `new Date(string)`
3. `onAuthStateChanged` loop: estetty `_kirjautuminenKesken`-flagilla
4. SheetJS: ei tyylejä ilman Pro — käytä openpyxl server-side
5. Näkymien vaihto: `style.display = 'none'` EI classList
6. Ei VP + Admin samassa selaimessa
7. `onSnapshot`-kuuntelijat: siivoa ennen `signOut()` — `tm:logout` event
8. GitHub Pages CDN: `?v=N` cache-busting
9. Roolinimet: `super_admin` underscore — `normalizeRooli()` hoitaa vanhat
10. openpyxl pakollinen Excel DataValidationille
11. Testaus: aina GitHub Pages -URL — file:// estää Firebase-kirjoitukset
12. `setCustomUserClaims` pakollinen `luoKayttaja`:ssa
13. Soveltava testaus: `kattavuus`-kenttä (0–1) aina indeksin rinnalla
14. Rules-deploy: käytä Firebase-konsolia — GitHub Actions saa 403
15. Suostumuslomake: kutsuflow=`.update()`, uusi=`.set()`
16. **UUSI:** `_pelaaja` on `let`-muuttuja — EI `window._pelaaja`
17. **UUSI:** `harjoitelogiikka_v4.js` ladataan ennen pääscriptejä — järjestys kriittinen
18. **UUSI:** DIAG-ketju: käytä `diag` — `sl` poistunut. `laskeKetjuProfiili()` hoitaa backward-compat
19. **UUSI:** YouTube: `embed/{ID}?rel=0` — EI hakusanoja tai watch-URL:ia
20. **UUSI:** Fiilinki-lukitus: tarkista `fiilinki_paivitetty` kirjaukset/{pvm}:stä

---

## Tiedostot — tila 2026-04-07

### Tuotannossa GitHubissa
`TalentMaster_Seura.html`, `TalentMaster_Rekisterointi_Suostumus.html`,
`TalentMaster_IDP_Kortti_v3.html`, `hpp_rehab_protokollat.js`,
`functions/index.js`, `tm_admin/firestore.rules`,
`tm_import.js`, `tm_empty_state.js`, `tm_lang.js`,
`tm_testipankki.js`, `testit_indeksit.js`, `tm_ketju_matriisi.js`,
`TalentMaster_VP_v18.html`, `TalentMaster_Master_v9.html`

### PENDING deploy (tämä sessio)
| Tiedosto | Muutos |
|---|---|
| `TalentMaster_Pelaaja_v1.html` | v4-logiikka, Stage, popup, fiilinki-lukitus |
| `harjoitelogiikka_v4.js` | UUSI — korvaa v3:n |
| `TalentMaster_UTJ_v1.html` | UUSI — kasvattisuppilo |
| `TalentMaster_Kortit.html` | Spesiaalikortit + WOW |
