# TalentMaster™ — Kehityssuunnitelma (Roadmap)
## Päivitetty 2026-04-09

---

## ✅ TEHTY (Sprint 1–3, ennen 2026-04-08)

### Firebase-infrastruktuuri
- [x] Firebase-projekti `talentmaster-pilot` (Blaze)
- [x] Firestore `eur3` multi-region
- [x] Firebase Auth — Email/Password + Custom Claims
- [x] 8 pilottiseuraa Firestoreen (fcl, kpv, palloiirot, yvies, sjk, grifk, vifk, hjk)
- [x] `luoKayttaja` — setCustomUserClaims, sama email eri rooli OK
- [x] Firestore Security Rules — tietosuoja rakenteellisesti
- [x] Cloud Functions (7 kpl) europe-west1
- [x] Sähköposti: Nodemailer + Gmail (ei SendGrid — eur3-yhteensopivuusongelma)

### Sivut — tuotannossa GitHubissa
- [x] `TalentMaster_VP_v18.html` — VP-dashboard
- [x] `TalentMaster_Master_v9.html` — Valmentajan näkymä
- [x] `TalentMaster_Seura.html` — Seurahallinta (UTF-8 korjattu)
- [x] `TalentMaster_Vanhempi.html` — Huoltajan sivu
- [x] `TalentMaster_Pelaaja_v1.html` — Stage-badge, jaksoinfo, popup, fiilinki-lukitus, v4
- [x] `TalentMaster_IDP_Kortti_v3.html` — IDP-kortti (toimii KPV:llä)
- [x] `TalentMaster_Rekisterointi_Suostumus.html` — fi/sv/en kielituki
- [x] `TalentMaster_UTJ_v1.html` — Kasvattisuppilo-aikajana
- [x] `TalentMaster_Kortit.html` — FIRE/ICON/MILESTONE/TOTY + WOW-animaatio
- [x] `TalentMaster_Admin.html` — Super Admin -hallinta
- [x] `TalentMaster_ADAR_Koulutus.html` — ADAR-protokolla, neljän hetken malli

### JavaScript-kirjastot (GitHubissa)
- [x] `harjoitelogiikka_v4.js` — leikkija/rakentaja/showcase, DIAG, Stage 1–5, YouTube
- [x] `hpp_rehab_protokollat.js` — 25 kuntoutusprotokollaa
- [x] `tm_testipankki.js` — 64 testiä, 8 protokollaa, FLEI (5 ketjua)
- [x] `tm_ketju_matriisi.js` — fascia ↔ testi ↔ pallotekniikka
- [x] `tm_lang.js` — fi/sv/en, 144 käännöstä
- [x] `tm_import.js`, `tm_empty_state.js`, `testit_indeksit.js`

### Testikerrosjärjestelmä
- [x] Kolme kerrosta: Tekniikkakilpailut / H-H ominaisuustestit / Harjoitettavuuskartoitus
- [x] TKI (biologiseen ikään normalisoitu), TSI, EI, FVP, OVR laskentakaavat
- [x] FLEI 5 ketjua: SBL/SFL/LL/DIAG/DFL — DIAG korvaa SL+FL (Wilke 2016)
- [x] PHV-laskenta: Mirwald 2002 (pojat) — tytöt Sprint 5

### Pelaajaprosessi (testattu)
- [x] VP lähettää rekisteröintikutsun → huoltaja saa sähköpostin
- [x] Suostumuslomake → pelaaja aktiivinen Firestoressä
- [x] Vanhemman sivu + Pelaajan sivu aukeavat oikein
- [x] Salasanalinkki sähköpostissa

---

## ✅ TEHTY (Sprint 4 — 2026-04-08 → 2026-04-09)

### VP v18 — Valmentajat-tabi (merkittävä uudistus)
- [x] Henkilöstö + Valmennus yhdistetty → yksi **Valmentajat**-välilehti
- [x] Näkymä 1 👤: kortit joukkue-grid muodossa (hover, väriviiva roolin mukaan)
- [x] Näkymä 2 📊: harjoitteluseuranta Power BI -inspiroitu
- [x] `_avaaValmentajaPopup` siirretty globaaliksi (oli nested — ReferenceError)
- [x] `window._vpKayntiBadge/Viimeisin/RooliNimet/JData` — cache popup-toimintoa varten
- [x] `nimiToUid`-kartta — UID-mismatch mentoroinnit ↔ kayttajat
- [x] `_tavoitteetLadattu`, `_henkilostoLadattu` globaalit muuttujat lisätty
- [x] Lazy-loading: `valmentajat:` (oli `henkilosto:` + `valmennus:`)
- [x] Historia max 10 käyntiä, minikriteeripalkisto + toimenpide per käynti

### VP v18 — Harjoitteluseuranta-yhteenveto
- [x] `lataaHSSeuranta()` — KPI-rivi + 7 kriteeriä palkeina + trendi SVG + per valmentaja
- [x] Tavoiteviiva merkitty (Power BI -tyyli)
- [x] Heikoin kriteeri korostetaan automaattisesti
- [x] Valmentajasuodatinnapit — suodattaa kaikki luvut
- [x] `window._hsAktFiltteri` — suodatin säilyy

### SJK Juniorit — pilottilaajennus
- [x] Palaveri 2026-04-08: mukaan U15P + U14/15T + talenttipelaajat
- [x] Ensimmäinen seura jolla tyttöjoukkue pilotissa

### Testidatan tuontirakenne
- [x] `TalentMaster_Testidatan_Tuontipohja.xlsx` rakennettu (5 välilehteä)
  - 0_OHJEET, 1_Pelaajat, 2_HH_Testit, 3_Harjoitettavuus, 4_Tekniikkakilpailut
  - FLEI% ja paras-tulos automaattiset kaavat
  - Validointi (pisteet 1-3, medaali Kulta/Hopea/Pronssi)

### Pelihavainto-arkkitehtuuri (suunniteltu)
- [x] TIPS-malli (Ajax + TM-adaptoitu), 5. kriteeri = IDP-kytkös
- [x] 3-tasoinen rakenne: Taso 1 / Taso 2 / Taso 3
- [x] Prosessikaavio + Firestore-rakenne dokumentoitu
- [x] KV-viitekehys: Ajax TIPS, GPAI, Premier League EPPP analysoitu
- [x] `TalentMaster_Pelihavainto_Demo.html` — offline-demo Palloliiton palaveriin

### Palloliiton yhteistyö
- [x] Head of Talent -tapaaminen 2026-04-09
- [x] Positioning: TalentMaster = Myeway:n toiminnallinen pari

### Dokumentaatio
- [x] `ARKKITEHTUURI.md` päivitetty 2026-04-09
- [x] `PERMISSION_MATRIX.md` päivitetty 2026-04-09
- [x] `ROADMAP.md` päivitetty 2026-04-09

---

## 🔄 KESKEN / SEURAAVAKSI (Sprint 4 jatkuu)

### Kriittiset bugit — korkea prioriteetti
- [ ] **🔴 Pelaaja-sivu lagaa / ei toimi** — tutkimatta
- [ ] **🟡 Fiilinki-kysely väärä U13-vaiheessa** — ikävaihe-tunnistus puuttuu
- [ ] **🟡 joukkueNimi tallentuu ID:nä** — Rekisterointi_Suostumus.html

### SJK-käyttöönotto
- [ ] SJK VP:lle tunnukset Admin-näkymästä
- [ ] Joukkueet Firestoreen: U15P, U14T, U15T, Talenttipelaajat
- [ ] Pelaajat rekisteröidään ilman suostumuslomaketta
- [ ] SJK VP toimittaa testidatan Excel-tuontipohjan muodossa

### Excel → Firestore tuontityökalu
- [ ] SheetJS lukee Excel-pohjan selaimessa
- [ ] Cloud Function kirjoittaa Firestoreen oikeaan rakenteeseen
- [ ] VP tarkistaa → sitten suostumuslomakkeet

### Muut Sprint 4
- [ ] Valmentajakorttiraportti-linkki Kartoitukset-välilehdelle
- [ ] Palloliiton laukausstatistiikka-linkki kalenteri-tapahtumaan
- [ ] Streak-historia Firestoreen (nyt localStoragessa)
- [ ] `TalentMaster_Koukutus.html` GitHubiin ⏳
- [ ] `TalentMaster_Valmentaja_Matriisi.html` GitHubiin ⏳

---

## 📋 TULOSSA (Sprint 5)

### Pelihavainto Taso 1 + 2
- [ ] TIPS-lomake valmentajalle Master-näkymässä (5 num + IDP + vapaa havainto)
- [ ] Pelaajan itsearviointi: 3 num + fiilinki + 1 lause
- [ ] Pelaaja näkee valmentajan arvion VASTA oman jälkeen
- [ ] Tallentuu `pelaajat/{id}/pelihavainnot/{otteluId}`

### SJK — aktivointi
- [ ] Suostumuslomakkeet huoltajille (kun data OK)
- [ ] Pelaajatunnukset aktivoidaan
- [ ] Tyttöjen PHV-kaava (Mirwald eri parametrit) — ennen U14/15T-aktivointia

### Muut Sprint 5
- [ ] Kenttähavainto → Firestore (`havainnot`-kokoelma)
- [ ] ADAR-pisteiden tallennus (`adar`-kokoelma, EI `havainnot`)
- [ ] Valmentajatunnukset joukkuekohtaisilla oikeuksilla
- [ ] Ottelujälkianalyysi-lomake VP:lle

---

## 🎯 SPRINT 6–8

### Pelihavainto Taso 3
- [ ] FLEI + pelihavainto rinnakkain
- [ ] IDP-tavoitteen toteutuminen pelissä kausien yli
- [ ] Valmentajan vs. pelaajan arvio trendi

### AI Behavioural Science -agentti
- [ ] Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä
- [ ] Aktivoituu: streak katkeamassa, 3pv putki, fiilinki matala 2pv, uusi viikko, PHV-huippu
- [ ] Ikäkohtainen ääni: leikkija/rakentaja/showcase
- [ ] Vaatii min 2–4vk kirjausdataa

### Muut
- [ ] Klinikkamoduuli (FLEI < 40% → automaattinen)
- [ ] Milestone-kortit Firestoresta
- [ ] Laskutusintegraatio

---

## 🎯 PILOTTISEUROJEN TILA (2026-04-09)

| Seura | Tunnukset | Data | Pelaajat | Seuraava askel |
|---|---|---|---|---|
| KPV | ✅ | 🟡 Harjoitettavuus puuttuu | 🟡 Testipelaaja | Testidatan tuonti |
| FC Lahti | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |
| Pallo-Iirot | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti (3 joukkuetta) |
| Ylöjärven Ilves | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |
| SJK Juniorit | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | VP-tunnukset → joukkueet → data |
| GrIFK | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |
| VIFK | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti (sv) |
| HJK Juniorit | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |

**Kriittisin pullonkaula kaikilla seuroilla:** testidatan tuonti Firestoreen.
Excel-pohja on valmis — tuontityökalu puuttuu (Sprint 4).

---

## Avoimet tekniset asiat

- **Cloud Scheduler API** aktivointi: https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot
- **Rules-deploy:** Firebase-konsoli suoraan (GitHub Actions → 403)
- **CDN cache:** ~10min — `?v=N` + tarkista raw.githubusercontent.com
- **`_pelaaja`** on `let` — EI `window._pelaaja`
- **`harjoitelogiikka_v4.js`** ennen pääscriptejä
- **DIAG:** `sl`-avain poistunut, käytä `diag`
- **`testitapahtumat`** oikea kokoelmanimi (EI `tapahtumat`)
- **`_avaaValmentajaPopup`** GLOBAALI — ei saa olla nested
- **Firebase Functions:** AINA `europe-west1` eksplisiittisesti
- **Tyttöjen PHV:** Mirwald eri parametrit — tarkistettava ennen SJK U14/15T-aktivointia

---

## PENDING DEPLOY (2026-04-09)

| Tiedosto | Sisältö | Prioriteetti |
|---|---|---|
| `TalentMaster_Koukutus.html` | 3-yleisön engagement | 🟡 |
| `TalentMaster_Valmentaja_Matriisi.html` | 5-tabi coaching tool | 🟡 |
| `ARKKITEHTUURI.md` | Päivitetty 2026-04-09 | 🟢 |
| `PERMISSION_MATRIX.md` | Päivitetty 2026-04-09 | 🟢 |
| `ROADMAP.md` | Tämä tiedosto | 🟢 |

**EI GitHubissa (paikallisia):**
- `TalentMaster_Pelihavainto_Demo.html` — Palloliiton offline-demo
- `TalentMaster_Testidatan_Tuontipohja.xlsx` — toimitetaan VP:lle sähköpostitse
