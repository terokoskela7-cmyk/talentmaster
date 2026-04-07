# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-04-07)

TalentMaster on jalkapallon talenttiarviointialusta — 7 pilottiseuraa (KPV, FC Lahti Juniorit, SJK Juniorit, GrIFK, VIFK, Pallo-Iirot, Ylöjärven Ilves), Firebase Blaze. Pelaajaprosessi testattu alusta loppuun. Valmentajan näkymä v9 tuotannossa. Pelaaja-sivu merkittävästi päivitetty: harjoitelogiikka v4 (kolme kielitasoa, DIAG-ketju, Everton Stage 1–5), jaksoinfo-palkki, Stage-badge, ohjeet-popup ja fiilinki-lukitus. Uudet näkymät: UTJ v1 (kasvattisuppilo) ja keräilykortit spesiaalikorttiluokilla + WOW-animaatio.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---

## Sivuarkkitehtuuri (vahvistettu 2026-04-07)

| Sivu | Tiedosto | Rooli | Tila |
|---|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp | ✅ tuotannossa |
| Urheilutoimenjohtaja | `TalentMaster_UTJ_v1.html` | urheilutoimenjohtaja | ✅ UUSI — PENDING |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja + kenttäroolit | ✅ tuotannossa |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri, utj, vp, super_admin | ✅ tuotannossa |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja | ✅ tuotannossa |
| Pelaaja | `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ päivitetty — PENDING |
| IDP-kortti | `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ tuotannossa |
| Suostumuslomake | `TalentMaster_Rekisterointi_Suostumus.html` | anonyymi/huoltaja | ✅ tuotannossa |
| Keräilykortit | `TalentMaster_Kortit.html` | pelaaja | ✅ UUSI + spesiaalikortit — PENDING |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore, `eur3` multi-region
- **Auth:** Email/Password
- **Functions:** `europe-west1`, 6 funktiota deployattu

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

Super Admin: `talentmasterid@gmail.com` / UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`

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
- **Nimi:** Topias Koskela
- **pelaajaId:** `m93GBdOaGCUuenMiCL0I` (vahvistettu Firestoresta tässä sessiossa)
- **huoltajaEmail:** `terokoskela7@gmail.com`
- **suostumusTila:** `annettu`, **tila:** `aktiivinen`
- **Pelaaja-sivu URL:** `?pelaajaId=m93GBdOaGCUuenMiCL0I&seuraId=kpv`

---

## Cloud Functions — 6 deployattu (europe-west1)

| Funktio | Kuvaus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit vanhemman/pelaajan sivulle | ✅ |
| `tasoHaeSeuranOttelut` | Ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU — vaatii Cloud Scheduler |

---

## GitHub-tiedostot — tila 2026-04-07

### GitHubissa ✅
| Tiedosto | Päivitetty |
|---|---|
| `TalentMaster_Master_v9.html` | Apr 5, 2026 |
| `TalentMaster_VP_v18.html` | Apr 5, 2026 |
| `TalentMaster_Seura.html` | Apr 5, 2026 |
| `TalentMaster_Vanhempi.html` | Apr 4, 2026 |
| `TalentMaster_IDP_Kortti_v3.html` | Mar 27, 2026 |
| `TalentMaster_Rekisterointi_Suostumus.html` | Apr 4, 2026 |
| `tm_testipankki.js` | Apr 6, 2026 |
| `harjoitelogiikka_v3.js` | Apr 4, 2026 |
| `tm_ketju_matriisi.js` | Apr 6, 2026 |
| `hpp_rehab_protokollat.js` | Mar 26, 2026 |
| `functions/index.js` | Apr 4, 2026 |
| `tm_admin/firestore.rules` | Apr 4, 2026 |
| `tm_import.js` + `tm_empty_state.js` | Apr 5, 2026 |
| `tm_lang.js` | Apr 5, 2026 |

### PENDING deploy — lataa GitHubiin

**Järjestys tärkeä — `harjoitelogiikka_v4.js` ENSIN:**

| Tiedosto | Sisältö | Prioriteetti |
|---|---|---|
| `harjoitelogiikka_v4.js` | UUSI — kolme kielitasoa, DIAG, Stage 1–5, YouTube embed | 🔴 Ensin |
| `TalentMaster_Pelaaja_v1.html` | Stage, jaksoinfo, popup, fiilinki-lukitus, v4-integraatio | 🔴 Kriittinen |
| `TalentMaster_UTJ_v1.html` | UUSI — kasvattisuppilo + Firestore | 🟡 Korkea |
| `TalentMaster_Kortit.html` | UUSI spesiaalikortit + WOW-animaatio | 🟡 Korkea |
| `ARKKITEHTUURI.md` | Päivitetty 2026-04-07 | 🟢 Dokumentaatio |
| `PERMISSION_MATRIX.md` | Päivitetty 2026-04-07 | 🟢 Dokumentaatio |
| `ROADMAP.md` | Päivitetty 2026-04-07 | 🟢 Dokumentaatio |
| `SESSION_SUMMARY.md` | Tämä tiedosto | 🟢 Dokumentaatio |

---

## TÄMÄN SESSION TUOTOKSET (2026-04-07)

### harjoitelogiikka_v4.js — UUSI (1887 riviä)
Korvaa v3:n. Harjoitesisältö eriytetty omaan tiedostoon — pelaaja-sivu delegoi `<script src>`:lla.

- **Kolme kielitasoa:** `leikkija` (U8–12) / `rakentaja` (U13–15) / `showcase` (U16+)
- **Everton Stage 1–5:** kehonpaino → toistoja → vastus → kuorma → pelispesifi
- **PANKKI-rakenne:** `PANKKI.T / PANKKI.D / PANKKI.S` + stage-arrayt per harjoite
- **5 liikeketjua:** `diag` on canonical (SL+FL), `sl` poistunut
- **YouTube embed:** `youtube.com/embed/{ID}?rel=0` jokaisessa harjoitteessa
- **Pallotekniikka-yhteys:** `pallo_yhteys`-kenttä DIAG-harjoitteissa
- **Julkinen API:** `_ikatyyppi()` / `_laskeStage()` / `_ohje()` / `_valitseStage()` / `laskeKetjuProfiili()` / `ytUrl()` / `generoimTehtavat()` / `generoimViikoOhjelma()`

### TalentMaster_Pelaaja_v1.html — merkittävä päivitys
- Harjoitelogiikka v4 integroitu `<script src>`:lla
- **Jaksoinfo-palkki:** `laskeMissaJaksossa()` → "🔥 Huipentuma-jakso · Vk 7/8"
- **Stage-badge + parametrit:** "S3 — Lisähaaste · Sarjat: 3×12/jalka · Tempo: dynaaminen"
- **"Miksi juuri nyt?":** selkokielinen perustelu harjoitekorteissa
- **Progressio-preview:** "Seuraava askel (S4): ..."
- **Ohjeet-popup:** `avaaOhjePopupPelaaja()` — popup ruudun keskellä
- **Fiilinki-lukitus:** `_tarkistaFiilinki()` Firestoresta + `_lukitseFiilinki()` + "✓ Kirjattu tänään" -badge
- **`_pelaajaViikonNumero()`:** oma toteutus, ei riippuvuutta Master v9:stä
- **DIAG-ketju:** `sl` → `diag` korjattu kaikissa kartoissa

### TalentMaster_UTJ_v1.html — UUSI
- Kasvattisuppilo SVG-viivakaavio (2 viivaa: kasvatteja / VL+Ykkönen)
- Hover-tooltip, nuoli-jatko, fallback demo-data
- Firestore: `utj_data/{kausi}` → `{kasvatteja, vlYkk, minuuttia, seurat[]}`

### TalentMaster_Kortit.html — UUSI + spesiaalikortit
- **Perussarjat:** Huuhkajat / Helmarit / Veikkausliiga 2025 (16 korttia)
- **Spesiaalikorttiluokat:**
  - 🔥 FIRE — läpimurtokortit (oranssipunainen glow, 1.8s)
  - 💎 ICON — holografinen legendakortti (violetti-sininen, 3-värikiero)
  - ⭐ MILESTONE — pelaajan kehityskortti (kulta, starPulse, `milestoneInfo`)
  - 🌟 TOTY — kauden parhaat (platinanvalkoinen)
- **WOW-avausanimaatio:** flash-burst + 22 partikkelia + 3D flip (cubic-bezier) + labelSlide

---

## 8-viikon jaksotuslogiikka

```javascript
JAKSO_RAKENNE = {
  pohja:      { viikot:'1-3', stageModif:0, emoji:'🌱', vari:'#00D4AA' },
  kehitys:    { viikot:'4-6', stageModif:1, emoji:'📈', vari:'#FFB020' },
  huipentuma: { viikot:'7-8', stageModif:2, emoji:'🔥', vari:'#A855F7' },
}
// Sykli: kalenteriviikko % 8 → 1-8
// stageModif lisätään FLEI-pohjaiseen Stage-laskentaan
// PHV-rajoite: phv_tila === 'PH' → max Stage 2
```

---

## FLEI — 5 ketjua (EI enää 6, pysyvä 2026-04-06)

| Ketju | Avain | Emoji | Wilke 2016 |
|---|---|---|---|
| Takaketju | `sbl` | ⚡ | ⭐⭐⭐ |
| Lähtöketju | `sfl` | 🦵 | ⭐ |
| Sivuketju | `ll` | ↔️ | ⭐⭐ |
| Diagonaaliketju (SL+FL) | `diag` | 🔄⬡ | ⭐⭐⭐ |
| Hallintaketju | `dfl` | 🏗️ | ⭐⭐ |

Firestore-kenttä: `flei_ketjut: {SBL, SFL, LL, DIAG, DFL}` (isolla)
`laskeKetjuProfiili(pelaaja)` hoitaa backward-compat vanhoille SL/FL-kentille.

---

## Kriittiset periaatteet (EI muuteta koskaan)

1. Super Admin `dqUzvJA61Wb9fgj5UiK0riSA4NI2` — pääsy kaikkialle aina
2. S-harjoite = AINA heikoin ketju, ei profiiliin
3. T-harjoite = joka päivä, myös lepopäivät
4. PHV ohittaa Stagen (max Stage 2)
5. 70/30 koskee sekä joukkueen alkurutiinia ETTÄ pelaajan omatoimiohjelmaa
6. FLEI = 5 ketjua (SBL/SFL/LL/DIAG/DFL) — SL+FL yhdistettynä pysyvästi
7. `diag` on ainoa canonical ketjuavain — `sl` poistunut
8. `super_admin` (underscore) canonical — `normalizeRooli()` hoitaa vanhat
9. Firestore Rules: `allow create` JA `allow update`
10. Älä testaa VP ja Admin samassa selainistunnossa
11. GitHub Pages Fastly CDN — `?v=N` cache-busting jokaisen latauksen jälkeen
12. `onAuthStateChanged`-loop estetty `_kirjautuminenKesken`-flagilla
13. `onSnapshot`-kuuntelijat siivottava ennen `signOut()` — `tm:logout`-event
14. `setCustomUserClaims` pakollinen `luoKayttaja`:ssa
15. Soveltava testaus: `kattavuus`-kenttä (0–1) aina indeksin rinnalla
16. `_pelaaja` on `let`-muuttuja skoopin sisällä — EI `window._pelaaja`
17. `harjoitelogiikka_v4.js` ladataan `<script src>`:lla ennen pääscriptejä
18. YouTube embed: `youtube.com/embed/{ID}?rel=0` — ei watch-URL:ia
19. Fiilinki-lukitus: tarkista `fiilinki_paivitetty` Firestoresta ennen renderöintiä

---

## Avoimet tehtävät (seuraavaan sessioon)

### Kriittisin
- [ ] Testisyöttölomake Master v9:ään (kartoitukset-välilehti)
- [ ] Harjoitettavuuslomake lukee `tapahtumaId` URL:sta

### Korkea prioriteetti
- [ ] Kenttähavainto → Firestore (`havainnot`-kokoelma) — UI valmis, tallennus puuttuu
- [ ] ADAR-pisteet → Firestore (`adar`-kokoelma, ei `havainnot`)
- [ ] Streak-historia Firestoreen (nyt localStoragessa)

### Normaali
- [ ] IDP-aktivointilogiikka (3 reittiä, 3 tasoa)
- [ ] Valmentajatunnukset joukkuekohtaisilla oikeuksilla
- [ ] Bio-ikälomake → `maturity_offset` + `phv_tila` Firestoreen
- [ ] videoBank Firestoreen (tarvitaan ennen videoiden näyttämistä)
- [ ] Milestone-kortit ← Firebase-kytkös (streak + FLEI automaattisesti)
- [ ] joukkueNimi tallentuu ID:nä eikä display-nimenä — bugi rekisteröinnissä

### Tekniset avoimet
- Cloud Scheduler API aktivointi (tasoHaeMaatcheck)
- Rules-deploy: käytä Firebase-konsolia — GitHub Actions saa 403
