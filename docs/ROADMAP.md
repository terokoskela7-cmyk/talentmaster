# TalentMaster™ — Kehityssuunnitelma (Roadmap)
## Päivitetty 2026-04-11

---

## ✅ TEHTY — Sprint 1–3 (ennen 2026-04-08)

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
- [x] `TalentMaster_Pelaaja_v1.html` — Stage-badge, fiilinki-lukitus, v4-logiikka
- [x] `TalentMaster_IDP_Kortti_v3.html` — toimii KPV:llä
- [x] `TalentMaster_Rekisterointi_Suostumus.html` — fi/sv/en kielituki
- [x] `TalentMaster_UTJ_v1.html` — Kasvattisuppilo-aikajana
- [x] `TalentMaster_Kortit.html` — FIRE/ICON/MILESTONE/TOTY + WOW
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

## ✅ TEHTY — Sprint 4 (2026-04-08 → 2026-04-11)

### VP v18 — Valmentajat-tabi
- [x] Henkilöstö + Valmennus yhdistetty → yksi **Valmentajat**-välilehti
- [x] Näkymä 1 👤: kortit joukkue-grid, hover, väriviiva roolittain
- [x] Näkymä 2 📊: harjoitteluseuranta Power BI -inspiroitu
- [x] `_avaaValmentajaPopup` globaaliksi (oli nested → ReferenceError)
- [x] `window._vpKayntiBadge/Viimeisin/RooliNimet/JData` — cache
- [x] `nimiToUid`-kartta — UID-mismatch mentoroinnit ↔ kayttajat
- [x] Historia max 10 käyntiä, minikriteeripalkisto + toimenpide
- [x] Lazy-loading: `valmentajat:` (oli `henkilosto:` + `valmennus:`)
- [x] `lataaHSSeuranta()` — KPI-rivi + 7 kriteeriä + trendi SVG + valmentajasuodatin

### SJK Juniorit — pilottilaajennus
- [x] Palaveri 2026-04-08: mukaan U15P + U14/15T + talenttipelaajat
- [x] Ensimmäinen seura jolla tyttöjoukkue pilotissa

### Excel-tuontipohja
- [x] `TalentMaster_Testidatan_Tuontipohja.xlsx` (5 välilehteä)
  - 0_OHJEET, 1_Pelaajat, 2_HH_Testit, 3_Harjoitettavuus, 4_Tekniikkakilpailut
  - FLEI% ja paras-tulos automaattiset kaavat, validointi

### Pelihavainto-arkkitehtuuri (suunniteltu, ei koodattu)
- [x] TIPS-malli (Ajax + TM-adaptoitu), 5. kriteeri = IDP-kytkös
- [x] 3-tasoinen rakenne dokumentoitu
- [x] Firestore-rakenne (`pelihavainnot`-kokoelma) suunniteltu
- [x] `TalentMaster_Pelihavainto_Demo.html` — offline-demo Palloliiton palaveriin

### Palloliiton yhteistyö
- [x] Head of Talent -tapaaminen 2026-04-09
- [x] Positioning: TalentMaster = Myeway:n toiminnallinen pari

### Solo-versio — TalentMaster Player™ (uusi tuotehaarake)
- [x] `TalentMaster_Player_Home.html` — splash + nimi + syntymäaika + kortti-reveal
  - Kultainen TM-logo animoituu pimeydestä
  - 3D-flip korttipaljastuminen burst-efektillä + kipinöillä
  - Tekstitarina: "Tämä on sinun korttisi, [Nimi]." — kolme lausetta
  - PlayerCode TMP-XXXX tallennetaan localStorage
- [x] `TalentMaster_Solo_Profiili.html` — pelaajan profiilisivu
  - Tekniikkakilpailutulokset (Palloliitto 2023 säännöt, ikäluokittain)
  - Kotimittarit (3 kk seuranta: ponnautusluku, seinäsyöttöputki, driblausaika)
  - Fyysinen testi (valinnainen: pituushyppy, 5-loikka, naruhypyt, sprintti)
  - Pelaajaprofiili (pelipaikka, kokemus, treenikerrat, ketjuvalinta)
  - Seuran testitulokset (automaattinen Firestoresta kun seura käyttää TM:ää)
- [x] `TalentMaster_Solo_Arviointi.html` — alkuarviointi 3-kerrosta
  - Kerros 1: tausta (ikä, kokemus, treenikerrat, vaikein asia)
  - Kerros 2: tekniset Y/N (kuljettaminen, vastaanotto, syöttö, Cruyff, laukaus)
  - Kerros 3: kotimittaukset (lähtötaso, palataan 3 kk päästä)
- [x] `TalentMaster_Kortti_Demo.html` — korttityypit demo
  - ⭐ Starter (sininen), ⭐⭐ Sharp (kultainen), ⭐⭐⭐ Elite (platina)
  - Pelipaikka-ikonit: ⚽ HYÖ / ⚡ KHK / ⚙️ KK / 🛡️ PUO / 🧤 MV
  - Shimmer, burst, kipinät, XP-palkki

### Dokumentaatio (päivitetty 2026-04-11)
- [x] `ARKKITEHTUURI.md` — täysin uudelleenkirjoitettu (127 → 510 riviä)
- [x] `ROADMAP.md` — tämä tiedosto

---

## 🔄 KESKEN — Sprint 4 jatkuu

### Kriittiset bugit
- [ ] **🔴 Pelaaja-sivu lagaa / ei toimi** — `TalentMaster_Pelaaja_v1.html`, tutkimatta
- [ ] **🟡 Fiilinki-kysely väärä U13-vaiheessa** — ikävaihe-tunnistus + leikkija-kieli
- [ ] **🟡 joukkueNimi tallentuu ID:nä** — `Rekisterointi_Suostumus.html`

### SJK-käyttöönotto
- [ ] SJK VP:lle tunnukset Admin-näkymästä
- [ ] Joukkueet Firestoreen: U15P, U14T, U15T, Talenttipelaajat
- [ ] Pelaajat rekisteröidään (ilman suostumusta aluksi)
- [ ] SJK toimittaa testidatan Excel-tuontipohjan muodossa

### Excel → Firestore tuontityökalu
- [ ] SheetJS lukee Excel-pohjan selaimessa
- [ ] Cloud Function kirjoittaa Firestoreen oikeaan rakenteeseen
- [ ] VP tarkistaa → sitten suostumuslomakkeet + pelaajatunnukset

### Pending deploy GitHubiin
- [ ] `TalentMaster_Koukutus.html` — 3-yleisön engagement ⏳
- [ ] `TalentMaster_Valmentaja_Matriisi.html` — 5-tabi coaching tool ⏳
- [ ] `TalentMaster_Player_Home.html` — Solo onboarding ⏳
- [ ] `TalentMaster_Solo_Profiili.html` — Solo profiili ⏳
- [ ] `TalentMaster_Solo_Arviointi.html` — Solo alkuarviointi ⏳
- [ ] `TalentMaster_Kortti_Demo.html` — Korttidemo ⏳

### Muut Sprint 4
- [ ] Streak-historia Firestoreen (nyt localStoragessa)
- [ ] Palloliiton laukausstatistiikka-linkki kalenteri-tapahtumaan
- [ ] Automaattinen salasananpalautus `lahetaPelaajaSivuLinkki`-funktiossa

---

## 📋 TULOSSA — Sprint 5

### Pelihavainto Taso 1 + 2
- [ ] TIPS-lomake valmentajalle Master-näkymässä
  - 5 numerokenttää (T/I/P/S + IDP-kytkös) + vapaa havainto
- [ ] Pelaajan itsearviointi: 3 num + fiilinki + 1 lause
- [ ] Pelaaja näkee valmentajan arvion VASTA oman jälkeen (EPPP-malli)
- [ ] Tallentuu `pelaajat/{id}/pelihavainnot/{otteluId}`

### SJK — aktivointi (kun data OK)
- [ ] Suostumuslomakkeet huoltajille
- [ ] Pelaajatunnukset aktivoidaan
- [ ] **Tyttöjen PHV-kaava** (Mirwald eri parametrit) — pakollinen ennen U14/15T

### Infrastruktuuri
- [ ] Kenttähavainto → Firestore (`havainnot`-kokoelma)
- [ ] ADAR-pisteet → Firestore (`adar`-kokoelma, EI `havainnot`)
- [ ] Valmentajatunnukset joukkuekohtaisilla oikeuksilla
- [ ] Ottelujälkianalyysi-lomake VP:lle

### Solo-versio jatkokehitys
- [ ] Firebase-integraatio (`players`-kokoelma)
- [ ] Google Sign-In
- [ ] PlayerCode → seuralinkitys (kun seura käyttää TM:ää, tulokset yhdistyvät)

---

## 🎯 SPRINT 6–8

### Pelihavainto Taso 3
- [ ] FLEI + pelihavainto rinnakkain VP:n näkymässä
- [ ] IDP-tavoitteen toteutuminen pelissä kausien yli
- [ ] Valmentajan vs. pelaajan arvio — trendi

### AI Behavioural Science -agentti
- [ ] Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä
- [ ] Aktivoituu: streak katkeamassa / 3 pv putki / fiilinki matala 2 pv /
  uusi viikko / PHV-huippu
- [ ] Ikäkohtainen ääni: leikkija / rakentaja / showcase
- [ ] Vaatii min 2–4 vk kirjausdataa

### Solo-versio kaupallistaminen
- [ ] Stripe-maksut (4,99€/kk tai 34,99€/kausi)
- [ ] OrsaSport-pilottilanseeraus
- [ ] Pelihaaste-mekanismi (PlayerCode-haasteet)

### Muut
- [ ] Klinikkamoduuli (FLEI < 40% → automaattinen)
- [ ] Milestone-kortit Firestoresta
- [ ] Laskutusintegraatio seurajärjestelmään

---

## 🏟️ Pilottiseurojen tila (2026-04-11)

| Seura | Tunnukset | Data | Pelaajat | Seuraava askel |
|---|---|---|---|---|
| KPV | ✅ | 🟡 Harjoitettavuus puuttuu | 🟡 Testipelaaja (Topias) | Testidatan tuonti |
| FC Lahti | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |
| Pallo-Iirot | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Tuonti (3 joukkuetta) |
| Ylöjärven Ilves | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |
| SJK Juniorit | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | VP-tunnukset → joukkueet → data |
| GrIFK | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti (sv) |
| VIFK | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti (sv) |
| HJK Juniorit | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Testidatan tuonti |

**Kriittisin pullonkaula kaikilla seuroilla:** testidatan tuonti Firestoreen.
Excel-pohja on valmis — tuontityökalu puuttuu (Sprint 4).

---

## ⚙️ Avoimet tekniset muistettavat

- **Rules-deploy:** Firebase-konsoli suoraan (GitHub Actions → 403)
- **CDN cache:** ~10 min — `?v=N` + tarkista `raw.githubusercontent.com` ensin
- **`_pelaaja`** on `let` — EI `window._pelaaja`
- **`harjoitelogiikka_v4.js`** ladattava ennen pääscriptejä
- **DIAG:** `sl`-avain poistunut, käytä `diag`
- **`testitapahtumat`** oikea kokoelmanimi (EI `tapahtumat`)
- **`_avaaValmentajaPopup`** GLOBAALI — ei saa olla nested funktio
- **Firebase Functions:** AINA `europe-west1` eksplisiittisesti
- **Tyttöjen PHV:** Mirwald eri parametrit — tarkistettava ennen SJK U14/15T
- **Cloud Scheduler API:** aktivoi tarvittaessa Firebase-konsolista
- **Ei VP + Admin samassa selaimessa** (Firebase yksi auth-sessio per projekti)
