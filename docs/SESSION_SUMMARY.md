# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-04-06)

TalentMaster on jalkapallon talenttiarviointialusta — 7 pilottiseuraa (KPV, FC Lahti Juniorit, SJK Juniorit, GrIFK, HJK Juniorit, Pallo-Iirot, Ylöjärven Ilves), Firebase Blaze. Pelaajaprosessi testattu alusta loppuun. Valmentajan näkymä v9 rakennettu. Testiindeksijärjestelmä valmis. Teknis-fyysinen kokonaisuus (testipankki, ketjumatriisi, valmentajatyökalu, koukutus) rakennettu tässä sessiossa.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---

## Sivuarkkitehtuuri (vahvistettu 2026-04-06)

| Sivu | Tiedosto | Rooli |
|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja + kenttäroolit |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri, urheilutoimenjohtaja, vp, super_admin |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja |
| Pelaaja | `TalentMaster_Pelaaja_v1.html` | pelaaja |
| IDP-kortti | `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi |
| Suostumuslomake | `TalentMaster_Rekisterointi_Suostumus.html` | anonyymi/huoltaja |

### Koulutus- ja koukutustiedostot (uudet 2026-04-06)

| Tiedosto | Tarkoitus | GitHub |
|---|---|---|
| `TalentMaster_Valmentaja_Matriisi.html` | Valmentajan 5-välilehtinen työkalu | PENDING |
| `TalentMaster_Koukutus.html` | Koukutus 3 kohderyhmälle | PENDING |
| `TalentMaster_Ketju_Matriisi.html` | Tekninen matriisikortti (vanhempi) | PENDING |

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
- **Nimi:** Topias Koskela, **pelaajaId:** `rtQdrYf7J6CVEKjOUThI`
- **huoltajaEmail:** `terokoskela7@gmail.com`, **suostumusTila:** `annettu`, **tila:** `aktiivinen`

---

## Cloud Functions — 6 deployattu (europe-west1)

| Funktio | Kuvaus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Lähettää rekisteröintikutsun huoltajalle | ✅ |
| `luoKayttaja` | Luo Auth-tunnuksen + custom claims + salasanalinkin | ✅ setCustomUserClaims lisätty 2026-04-04 |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjän | ✅ |
| `lahetaPelaajaSivuLinkki` | Lähettää linkit vanhemman/pelaajan sivulle | ✅ |
| `tasoHaeSeuranOttelut` | Hakee ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU — vaatii Cloud Scheduler Admin SA:lle IAM-konsolissa |

---

## GitHub-tiedostot — tila 2026-04-06

### GitHubissa ✅
| Tiedosto | Päivitetty |
|---|---|
| `tm_testipankki.js` | Apr 6, 2026 |
| `TalentMaster_Master_v9.html` | Apr 5, 2026 |
| `TalentMaster_VP_v18.html` | Apr 5, 2026 |
| `TalentMaster_Seura.html` | Apr 5, 2026 |
| `TalentMaster_Vanhempi.html` | Apr 4, 2026 |
| `TalentMaster_Pelaaja_v1.html` | Apr 5, 2026 |
| `TalentMaster_Rekisterointi_Suostumus.html` | Apr 4, 2026 |
| `TalentMaster_IDP_Kortti_v3.html` | Mar 27, 2026 |
| `harjoitelogiikka_v3.js` | Apr 4, 2026 |
| `hpp_rehab_protokollat.js` | Mar 26, 2026 |
| `functions/index.js` | Apr 4, 2026 |
| `tm_admin/firestore.rules` | Apr 4, 2026 |
| `TalentMaster_BioIka.xlsx` | Mar 27, 2026 |
| `TalentMaster_Harjoitettavuus.xlsx` | Mar 29, 2026 |

### PENDING — lataa GitHubiin
| Tiedosto | Sisältö |
|---|---|
| `tm_ketju_matriisi.js` | Fascia-ketju ↔ testi ↔ pallotekniikka matriisi + 4 apufunktiota |
| `TalentMaster_Valmentaja_Matriisi.html` | Valmentajan 5-välilehtinen työkalu |
| `TalentMaster_Koukutus.html` | Koukutus 3 kohderyhmälle |
| `TalentMaster_Ketju_Matriisi.html` | Tekninen matriisikortti |

---

## TÄMÄN SESSION TUOTOKSET (2026-04-06)

### tm_testipankki.js ✅ GitHubissa
- 64 testiä, 8 protokollaa, 6 apufunktiota
- **KRIITTINEN MUUTOS:** FLEI 6 ketjua → 5 ketjua. SL + FL yhdistetty `hpp_diag`-ketjuksi
- Protokollat: `harjoitettavuus` / `harjoitettavuus_u12` / `harjoitettavuus_u15` / `harjoitettavuus_u19` / `hh_laaja` / `hh_suppea` / `vifk_p13` / `tekniikkakilpailu`
- Apufunktiot: `TM_LASKE_FLEI()` / `TM_LASKE_FLEI_KEHONPAINO()` / `TM_LASKE_MAS()` / `TM_LASKE_BIOIKA()` / `TM_LASKE_MERKKI()` / `TM_PITUUSPOTKU_VAHENNYS()`

### tm_ketju_matriisi.js (PENDING)
- 5 fascia-ketjua: SBL / SFL / LL / DIAG (SL+FL) / DFL
- `TM_KETJU_MATRIISI` — ketjukohtaiset testit + pallotekniikka + jalkapalloesimerkit
- `TM_PALLOTEKNIIKKA` — 5 tekniikkalajia + `miksi_paivittain` + `harjoite_cue`
- Apufunktiot: `TM_TESTIN_KETJUT()` / `TM_KETJUN_TESTIT()` / `TM_TEKNIIKAN_KETJUT()` / `TM_KETJUN_TEKNIIKAT()`

### TalentMaster_Valmentaja_Matriisi.html (PENDING)
5 välilehteä:
1. ⚽ Tekniikka-opas — lajit + ketjut + kenttäohje + ongelma→ratkaisu
2. 📊 Matriisi — tekniikka × ketju taulukko hover-selityksillä
3. 💪 Fysiikkaohjelma — U8–U19 ikävaihekortit + 3+1-malli + D/S/P-omatoimiohjelma
4. 📅 Päivittäinen pallo — konkreettiset harjoitteet
5. 🔍 Ongelma → Ratkaisu — 6 yleisintä ongelmaa

### TalentMaster_Koukutus.html (PENDING)
Kolme kohderyhmää scroll-navigoinnilla:
- Valmentaja: potku-esimerkki + 3+1-malli + ikäprogressiopalkit
- VP: sudenkuoppa-ilmiö + tiistai-kysymys + IDP kotiin
- VEAT: 3h moduuli aikajana + VEAT-tehtävä

---

## FLEI — 5 ketjua (päivitetty 2026-04-06, EI enää 6)

| Ketju | Testi | Emoji | Wilke 2016 |
|---|---|---|---|
| SBL — Takaketju | `hpp_sbl` | ⚡ | ⭐⭐⭐ |
| SFL — Etuketju | `hpp_sfl` | 🦵 | ⭐ toiminnallinen |
| LL — Sivuketju | `hpp_ll` | ↔️ | ⭐⭐ |
| DIAG — Diagonaali (SL+FL) | `hpp_diag` | 🔄⬡ | ⭐⭐⭐ |
| DFL — Hallintaketju | `hpp_dfl` | 🏗️ | ⭐⭐ |

`TM_LASKE_FLEI()` palauttaa: `{ flei, ketjut, heikoin, heikoinArvo }`
Heikoin → ohjaa S-harjoitteen + 30% alkurutiinin ryhmän

---

## Pallotekniikka ↔ ketjut

| Tekniikka | Pääketju | Avustava | Tutkimusnäyttö |
|---|---|---|---|
| Ponnauttelu | 🏗️ DFL + 🔄⬡ DIAG | ↔️ LL | Forsman 2013 — erotteli kaikissa U11-U14 |
| Syöttö | 🔄⬡ DIAG | 🦵 SFL + 🏗️ DFL | Liikanen 2025 +13% ammattilaisennustaja |
| Pujottelu | ↔️ LL | 🔄⬡ DIAG + 🏗️ DFL | Liikanen 2025 +9% |
| Kuljetus-laukaus | 🔄⬡ DIAG + 🦵 SFL | ⚡ SBL | Thomas-testi → hip flexor kireys → potku ei lennä |
| Pituuspotku | ⚡ SBL | 🔄⬡ DIAG + 🦵 SFL | Palloliiton protokolla vasta U12+ |

---

## 70/30 — kaksi tasoa

**Joukkueen alkurutiini (20–30 min):**
- 70% = kaikki yhdessä (kyykkyistunta + lantionnosto + lateraaliloikka + lankkukierto)
- 30% = 3 ryhmää (nopeus W/ST/FB · hallinta CDM/CAM · voima CD) — FLEI ohjaa

**Pelaajan omatoimiohjelma kotona:**
- D päivittäin = 70% vahvuuksien ylläpito
- S lepopäivänä = 30% heikoin ketju

**Ikäprogressio:** U8–U12 leikki → U12–U15 rakenne alkaa → U15–U17 tasapuoli → U17+ yksilö johtaa

---

## Kansainväliset esimerkit (fysiikkavalmentaja-kysymys)

- **Ajax:** Soccer Aerobics 30 min alkuverryttelynä — integroitu aktivointi, ei erillinen fysiikkaohjelma U12 asti
- **KNVB:** Kouluttaa valmentajat — ei lisää henkilöstöä pieniin seuroihin
- **Premier League EPPP:** Multidisiplinääriset tiimit — epärelevantti vertailukohta suomalaisille seuroille
- **Johtopäätös:** TalentMaster + harjoitettavuuskartoitus + ketjumatriisi riittää U8–U15. U16+ lisäkuormat vaativat silmän.

---

## Pelaajaprosessi — toimii alusta loppuun (testattu 2026-04-04)

1. VP lähettää rekisteröintikutsun Seura.html:stä → sähköposti huoltajalle ✅
2. Pelaaja tallentuu Firestoreen (`suostumusTila: "odottaa"`) ✅
3. Vanhempi täyttää suostumuslomakkeen → `suostumusTila: "annettu"`, `tila: "aktiivinen"` ✅
4. Vanhemman sivu aukeaa oikein ✅
5. Pelaajan sivu aukeaa oikein ✅
6. Sähköposti vanhemmalle salasanalinkillä lähetetty ✅

---

## Avoimet tehtävät
- videoBank Firestoreen täyttäminen videopankki-adminin kautta on se mitä tarvitaan ennen kuin pelaajien omatoimiohjelmat näyttävät videoita.

## Kriittiset periaatteet (EI muuteta koskaan)

1. Super Admin `dqUzvJA61Wb9fgj5UiK0riSA4NI2` — pääsy kaikkialle aina
2. S-harjoite = AINA heikoin ketju, ei profiiliin
3. T-harjoite = joka päivä, myös lepopäivät
4. PHV ohittaa Stagen
5. 70/30 koskee alkurutiinia — kenttäharjoitus on valmentajan
6. 70/30 toimii kahdella tasolla: joukkueen alkurutiini JA pelaajan omatoimiohjelma kotona
7. FLEI = 5 ketjua (SBL/SFL/LL/DIAG/DFL) — EI 6 (SL+FL yhdistetty)
8. `super_admin` (underscore) canonical — `normalizeRooli()` hoitaa vanhat
9. Firestore Rules: `allow create` JA `allow update`
10. Älä testaa VP-dashboardia ja Admin-näkymää samassa selainistunnossa
11. GitHub Pages Fastly CDN — `?v=N` cache-busting jokaisen latauksen jälkeen
12. `onAuthStateChanged`-loop estetty `_kirjautuminenKesken`-flagilla
13. `onSnapshot`-kuuntelijat siivottava ennen `signOut()`-kutsua
14. `setCustomUserClaims` pakollinen `luoKayttaja`-funktiossa
15. Soveltava testaus: `kattavuus`-kenttä (0–1) tallennetaan aina indeksin rinnalla
16. DIAG = SL+FL yhdistettynä — älä erota niitä takaisin
