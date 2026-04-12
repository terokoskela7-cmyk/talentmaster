# TalentMaster™ — Master Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-12)

TalentMaster on jalkapallon talenttiarviointialusta — 8 pilottiseuraa, Firebase Blaze.
Kehitys etenee kahdella rinnakkaisella haaralla:
1. **Seurajärjestelmä** (VP/Valmentaja/Pelaaja) — tuotannossa
2. **Solo-versio** (TalentMaster Player™) — uusi tuotehaarake, rakennettu 2026-04-10

---

## GitHub-repositorio
```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---

## Sivuarkkitehtuuri (2026-04-12)

### Seurajärjestelmä
| Sivu | Tiedosto | Rooli | Tila |
|---|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp | ✅ tuotannossa |
| Urheilutoimenjohtaja | `TalentMaster_UTJ_v1.html` | urheilutoimenjohtaja | ✅ tuotannossa |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja | ✅ tuotannossa |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri/utj/vp | ✅ tuotannossa |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja | ✅ tuotannossa |
| Pelaaja | `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ ⚠ lag-bugi |
| IDP-kortti | `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ tuotannossa |
| Suostumuslomake | `TalentMaster_Rekisterointi_Suostumus.html` | huoltaja | ✅ tuotannossa |
| Keräilykortit | `TalentMaster_Kortit.html` | pelaaja | ✅ tuotannossa |
| Admin | `TalentMaster_Admin.html` | super_admin | ✅ tuotannossa |
| ADAR-koulutus | `TalentMaster_ADAR_Koulutus.html` | valmentaja | ✅ tuotannossa |
| Markkinointi | `TalentMaster_Koukutus.html` | — | ⏳ PENDING |
| Coaching tool | `TalentMaster_Valmentaja_Matriisi.html` | valmentaja | ⏳ PENDING |
| Pelihavainto demo | `TalentMaster_Pelihavainto_Demo.html` | demo | ⚠ EI GitHubissa |

### Solo-versio — TalentMaster Player™ (⏳ PENDING GitHubiin)
| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_Player_Home.html` | Onboarding: splash → nimi → syntymäaika → kortti | ⏳ PENDING |
| `TalentMaster_Solo_Profiili.html` | Profiili: tekniikkakilpailu, kotimittarit, fyysinen, pelaajaprofiili | ⏳ PENDING |
| `TalentMaster_Solo_Arviointi.html` | Alkuarviointi 3-kerrosta: tausta, tekniikka Y/N, mittaukset | ⏳ PENDING |
| `TalentMaster_Kortti_Demo.html` | Korttityypit: Starter/Sharp/Elite, pelipaikka-ikonit | ⏳ PENDING |

### Demo- ja myyntitiedostot (rakennettu 2026-04-12, EI GitHubissa)
| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `talentmaster_demo_en.html` | Kansainvälinen myyntidemo — 5 näyttöä, englanniksi | ✅ Valmis, bugit korjattu |
| `talentmaster_player_demo.html` | 3 perspektiiviä: Pelaaja/Valmentaja/SD, FIFA-kortti | ✅ Valmis, bugit korjattu |
| `hjk_pitch_v2.html` | HJK pitch uudistettu — 6 diaa, 3 perspektiiviä, FI/EN | ✅ Tuorein versio |
| `hammarby_talentmaster_analyysi.html` | Strateginen analyysi Hammarby × TalentMaster | ✅ Valmis |
| `fcn_talentmaster_proposal.html` | Co-development ehdotus FCN × TalentMaster | ✅ Valmis |
| `eps_unified_v2.html` | EPS-dashboard vaalea teema, 7 välilehteä | ✅ Tuorein EPS-versio |
| `eps_utj_dashboard.html` | UTJ-näkymä Heinille | ✅ Valmis |
| `eps_idp_ottelu.html` | IDP-otteluesitys | ✅ Valmis |
| `tm_dna_dashboard.html` | VP-dashboard DNA-painotuksilla | ✅ Valmis |
| `tm_dna_builder.html` | DNA-rakennustyökalu | ✅ Valmis |

---

## Firebase
- **Projekti:** `talentmaster-pilot` (Blaze)
- **Firestore:** `eur3` multi-region
- **Auth:** Email/Password + Custom Claims
- **Functions:** `europe-west1`, 7 kpl
- **Sähköposti:** Nodemailer + Gmail

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

## Pilottiseurat (8 kpl) — tila 2026-04-12
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
| `eps` | EPS (Espoon Palloseura) | ✅ tunnukset | Heini yhteyshenkilö, Teams-puhelu PENDING |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin |

**Kaikilla seuroilla:** tunnukset luotu, testidataa ei vielä Firestoressä.
Kriittisin pullonkaula: Excel → Firestore tuontityökalu puuttuu.

---

## KANSAINVÄLINEN LAAJENTUMINEN — ANALYSOITU 2026-04-12

### Hammarby IF — kolme dokumenttia analysoitu
**Dokumentit:**
1. `HammarbyIF_GirlsAcademy_IndividualDevelopment.pdf`
2. `Eerikkilä_january_2026_JoR.pdf` — poikaakatemian itsearviointi 2018–2025
3. `HammarbyIF_GirlsAcademy_Transition.pdf`

**Hammarbyn numerot:**
- 2018: 0,89% oman kasvatuksen peliaika Allsvenskanissa (viimeinen sija)
- 2025: 20,6% (Ruotsin ykkönen)
- 2021–2024: 48 pelaajaa Superettaniin/Allsvenskaniin/vastaavaan
- Transferit: Erabi +50 MSEK, Gül +50 MSEK, Adjei +60 MSEK, Swedberg +50 MSEK

**Hammarbyn 5 pilaria → TalentMaster-vastaavuus:**
| Pilari | TalentMaster |
|---|---|
| Style of Play | DNA-konfiguraatio |
| Role Profile | Pelipaikka-KPI |
| Team Training | Kausikaari (osittain) |
| IDP | Pelihavainto + IDP-kortti |
| **Player Pathway** | **PUUTTUU — suurin mahdollisuus** |

**Mitä Hammarbylta puuttuu (= TM:n mahdollisuus):**
- Biologinen ikä — ei RAE-korjausta
- Staattinen siirtymädokumentti — Excel manuaalisesti kerran kuussa
- Raportoivat palaverit — data ei korvaa palavereita
- Kehitysnopeus (DVI) — ei näy kuka kehittyy nopeammin

**Mitä TalentMaster oppii Hammarbylta:**
- Faasiajattelu: Foundation (8–11) / Learning (12–13) / Developing (14–15) / Transition (16–19)
- Player Care -moduuli — psykologinen taso 2×/kk (puuttuu TM:stä)
- Harjoitushavainto — sama ADAR-rakenne harjoituskontekstissa
- Harjoitussuunnitelma pelaajalle etukäteen
- Tulokset-KPI:t — "montako siirtyi ylemmälle tasolle"

**Yhteydenotto:**
- Magnus Bodsgård, Head of Academy
- magnus.bodsgard@hammarbyungdom.se | +46 702 095 474
- Viesti: ruotsiksi, tunnistava ei myyvä, pilotti yhdelle joukkueelle

### FC Nordsjælland — viisi dokumenttia analysoitu
**Dokumentit:**
1. `Club Presentation (2).pdf` — 29 sivua, akatemiaesittely
2. `Data and Research Department.pdf` — 8 sivua, data-infrastruktuuri
3. `Opl%C3%A6g Finske FA.pdf` — 18 sivua, U17 viikko-ohjelma
4. `Presentation Finnish FA.pdf` — 28 sivua, metodologia
5. `Thomas Arvedsen, Finish FA.pdf` — 37 sivua, videoanalyysi

**FCN:n numerot:**
- €92M transfereissa 2015→ (Kudus, Emre Mor, Kamaldeen, Adingra...)
- Nuorin edustusjoukkue Euroopassa (ka. 20,9v)
- Nr. 12 Euroopassa oman kasvatuksen pelaajien siirroissa top-5 liigaan
- Data-tiimi: Lasse Ishøi (PhD), Franek Liszka, Christian Rønsholt

**FCN:n 5 analyysialustaa (ei integroituja):**
Spiideo + VEO + Hudl + ProSoccerData + Wyscout
→ Thomas Arvedsen koostaa neljännesvuosiraportit käsin viidestä järjestelmästä

**FCN:n 4 KPI:tä (joukkuetaso):**
1. CONTROL — omistus vs. muodostelmalinja
2. HIGH PRESSING — PPDA vs. puoliskon palautukset
3. GOALSEEKING — xG vs. syötöt viimeiseen kolmannekseen
4. EFFECTIVE — xG vs. maalit

**FCN:n aukot (= TM:n mahdollisuus):**
- **Biologinen ikä** — kaikki data kronologisella iällä, ei RAE-korjausta
- **Kehityspolku 8v→edustus** — ei yhtenäistä dataketjua ikäluokkien välillä
- **Character development** — 4 kokopäiväistä (psykologi, kulttuurijohtaja, player care, koulutus) mutta ei dataakerrosta
- **Integraatio** — 5 alustaa, 0 integraatiota keskenään

**Co-development -ehdotus (3 vaihetta):**
| Vaihe | Sisältö | Kesto | Vetäjä |
|---|---|---|---|
| I — Research Partnership | Biologinen ikä -validaatio, yhteinen tutkimusjulkaisu | 1–6 kk | Lasse Ishøi + TM |
| II — Pilot Programme | U17 yksi kausi, Character-moduuli, unified player file | 4–12 kk | Thomas Arvedsen |
| III — Platform Partnership | Koko akatemia, FCN DNA konfiguraatio, nordinen referenssi | 10–24 kk | Mikkel Hemmersam |

**Mitä rakennetaan yhdessä:**
1. Biologinen ikä -korjausmoottori (FCN data + TM Mirwald/Khamis-Roche)
2. Character Development -moduuli (Stine Lyhnen kanssa)
3. Unified Player Development File (korvaa manuaalisen neljännesvuosiraportin)
4. Transfer Trajectory Report (DVI + DNA match ostajaseuraan)
5. FCN DNA -konfiguraatio nordiselle markkinalle

**Ensimmäinen yhteydenotto:**
- Lasse Ishøi — Head of Sport & Data Science (EI myyntipitch — tutkimuskysymys)
- Thomas Arvedsen — Head of Academy Analysis (operatiivinen: "mitä jos raportti generoituisi itse?")

---

## DEMO-ARKKITEHTUURI — RAKENNETTU 2026-04-12

### talentmaster_demo_en.html — kansainvälinen myyntityökalu
5 näyttöä, englanniksi, interaktiivinen:
1. **The Problem** — 2.1% → 21.4% homegrown (teoreettinen), €8.4M transferit
2. **Academy Overview** — UTJ-dashboard, DNA-ring, KPI-grid, transition-lista automaattinen
3. **Hidden Gem** — Joonas vs Mikael: bio-ikä −1.4v, RAE Q4, 18kk aiempi tunnistus
4. **Match Review** — KPI → ADAR → Pelaajan arvio, live DNA-feedback
5. **CTA** — "Your philosophy, made visible"

### talentmaster_player_demo.html — 3 perspektiiviä
- 🎮 **Player**: FIFA-kortti (kulta, taso 7), XP-palkki, streak-badget, IDP, viikkohaasteet
- 📋 **Coach**: joukkuetaulukko FLEI+DNA, otteluvalmistelu, nopea KPI-kirjaus, Team DNA radar
- 📊 **Sporting Director**: 4 KPI:tä, live-aktiviteettifeed, valmentajien aktiivisuusmatriisi, Hidden Gem -pipeline, transition-lista

### hjk_pitch_v2.html — HJK pitch uudistettu
6 diaa scroll-snap, Barlow Condensed -fontti, **täysi FI/EN kielivalinta (80+ tekstielementtiä)**:
| Dia | Sisältö |
|---|---|
| 1 | Hero — FIFA-kortti, hover-efekti |
| 2 | Haaste — 0%, 10+ valmentajanvaihtoa |
| 3 | **UUSI: Kolme perspektiiviä** — sama tab-rakenne kuin player demo |
| 4 | DNA Match — identiteettikortti, "muistuttaa Atomua" |
| 5 | Pipeline — 8v→VL, 3 feature-korttia |
| 6 | CTA — HJK PILOTTI 2025 |

### Chart.js bugikorjaus — MUISTA JATKOSSA
**Ongelma:** `_init` guard tai `display:none` → canvas 0-dimensiot → kaavio tyhjä
**Ratkaisu:** `Chart.getChart(ctx)` + `existing.destroy()` + `new Chart()` + `setTimeout(50–100ms)`
**EI koskaan:** `_init` guard

---

## TUOTEPOHDINTA — ROADMAP (PRIORITEETTIJÄRJESTYS)

### 🔴 Kriittiset — estää tuotannon
- [ ] SPF/DKIM puuttuu — sähköpostit menevät roskapostiin
- [ ] `joukkueNimi` tallentuu ID:nä, ei display-nimenä
- [ ] VP-dashboard delta/trendit rakentamatta
- [ ] Pelaaja-sivu lag-bugi (`TalentMaster_Pelaaja_v1.html`)
- [ ] Teams-puhelu Heinille (EPS) — 16 kysymystä valmiina

### 🟡 Tärkeät — Hammarbyn ja FCN:n analyysin pohjalta
- [ ] **Harjoitushavainto-moduuli** — sama ADAR-rakenne harjoituksissa
- [ ] **Player Care -moduuli** — psykologinen taso 2×/kk
- [ ] **Transition-näkymä** — dynaaminen "valmis ylemmälle tasolle" (korvaa Excel)
- [ ] **Harjoitussuunnitelma pelaajalle etukäteen** — IDP-tavoite + viikon fokus
- [ ] "Why"-lause jokaiseen harjoitekorttiin (`harjoitelogiikka_v4.js`)
- [ ] Solo-versio deploy GitHubiin (4 tiedostoa)
- [ ] SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
- [ ] Excel → Firestore tuontityökalu

### 🔵 Strategiset
- [ ] **Tulokset-KPI:t** — "montako siirtyi ylemmälle tasolle"
- [ ] **Faasikohtainen KPI-kirjasto** — Foundation → Learning → Developing → Transition
- [ ] **Transfer Trajectory Report** — DVI + DNA match ostajaseuraan (FCN-co-dev)
- [ ] **Character Development -moduuli** (FCN co-dev, Stine Lyhne)
- [ ] DNA-pulssimittari VP:n KPI-gridiin
- [ ] Firestore-integraatio DNA-konfiguraatiolle
- [ ] Showcase Pro -moduuli (17–19v)
- [ ] Tyttöjen PHV-kaava (ennen SJK U14/15T-aktivointia)
- [ ] Streak-historia Firestoreen (nyt localStoragessa)

### Strategiset yhteydenotot — prioriteettijärjestys
1. **Heini (EPS)** — Teams-puhelu, 16 kysymystä valmiina — HETI
2. **Magnus Bodsgård (Hammarby)** — ruotsiksi, tunnistava, pilotti yhdelle joukkueelle
3. **Lasse Ishøi (FCN)** — englanniksi, tutkimuskysymys biologisesta iästä

---

## JavaScript-kirjastot

### harjoitelogiikka_v4.js — GitHubissa
```javascript
_ikatyyppi(ika)         → 'leikkija'|'rakentaja'|'showcase'
_laskeStage(pelaaja)    → 1-5
_ohje(harj, ityyppi)    → ohjeteksti kielitasolla
laskeKetjuProfiili(pel) → {heikoin, vahvin, jarjestys, arvot}
ytUrl(id)               → 'https://www.youtube.com/embed/{id}?rel=0'
generoimTehtavat(pel)   → [{id, tyyppi, label, ohje, yt, stage, ...}]
```

**T-mesosykli kalenteripohjainen:**
```
Syys/Tammi: Vastaanottaminen — Kaka-sarja
Loka/Helmi: Dribbeli — Affelay-sarja
Marras/Maalis: 1v1-liikkeet — Ronaldo-sarja
Joulu/Huhti: Syöttäminen — Beckham-sarja
```

---

## FLEI — 5 ketjua (pysyvä, Wilke 2016)
| Ketju | Avain | Emoji | Selite |
|---|---|---|---|
| Vauhtiketju | `sbl` | ⚡ | Nopeus, räjähtävyys |
| Lähtöketju | `sfl` | 🦵 | Kiihdytys, pysähtyminen |
| Sivuketju | `ll` | ↔️ | Suunnanmuutos, feintit |
| Kiertoketju | `diag` | 🔄 | Syöttö, laukaus |
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
18. Fiilinki-lukitus: `fiilinki_paivitettu` ennen renderöintiä
19. Super admin: `adminSnap.exists`
20. `huoltajaEmail` aina `.toLowerCase()`
21. Firebase Functions: AINA `firebase.app().functions('europe-west1')`
22. `testitapahtumat` oikea kokoelmanimi (EI `tapahtumat`)
23. `_avaaValmentajaPopup` GLOBAALI — EI nested
24. `nimiToUid`: UID-mismatch mentoroinnit ↔ kayttajat
25. `joukkueNimi`: display name, ei ID (bugi auki)
26. Solo-pelaajat: `players/{id}` (ei seurahierarkiassa) — `seuraId: null`
27. Chart.js: AINA `Chart.getChart()` + destroy + redraw, EI `_init` guard
28. Chart.js `display:none` -näyttö: `setTimeout(50–100ms)` ennen init-kutsua

---

## Avoimet bugit (2026-04-12)
| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Pelaaja-sivu lagaa / ei toimi | TalentMaster_Pelaaja_v1.html | 🔴 Korkea |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v1.html | 🟡 Keski |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 Keski |
| SPF/DKIM puuttuu — roskapostiin | Cloud Functions / Gmail | 🔴 Korkea |
| VP-dashboard delta/trendit puuttuu | TalentMaster_VP_v18.html | 🟡 Keski |

---

## Tekniset vakiot
- Firebase: `talentmaster-pilot` / `europe-west1`
- Super Admin: `talentmasterid@gmail.com` / `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
- EPS väri: `#004B87` (sininen, vaalea teema)
- HJK väri: `#005CB9` (tumma teema, Barlow Condensed)
- GitHub: `terokoskela7-cmyk.github.io/talentmaster/`
- Tuorein EPS dashboard: `eps_unified_v2.html`
- Tuorein HJK pitch: `hjk_pitch_v2.html`

## Avoimet tekniset asiat
- **Cloud Scheduler API:** console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot
- **Rules-deploy:** Firebase-konsoli (GitHub Actions → 403)
- **CDN cache:** ~10min — `?v=N` + tarkista raw.githubusercontent.com
- **Tyttöjen PHV:** Mirwald eri parametrit — pakollinen ennen SJK U14/15T
- **Palloliiton Power BI:** https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9

## Seuraavaan sessioon (tärkeysjärjestyksessä)
1. 🔴 Pelaaja-sivu lag-bugi — tutkimatta
2. 🔴 SPF/DKIM — sähköpostit roskapostiin
3. 🔴 Lisää "why"-lause harjoitekortteihin (`harjoitelogiikka_v4.js`)
4. 🔴 Solo-versio deploy GitHubiin (4 tiedostoa)
5. 🔴 SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
6. 🔴 Teams-puhelu Heinille (EPS) — 16 kysymystä valmiina
7. 🟡 Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
8. 🟡 Tyttöjen PHV-kaava (ennen U14/15T-aktivointia)
9. 🟡 Fiilinki ikävaihekysely-bugi
10. 🟡 Solo Firebase-integraatio (players-kokoelma)
11. 🟡 Player Care -moduuli (Hammarby/FCN-oppiminen)
12. 🟡 Harjoitushavainto-moduuli (Hammarby-oppiminen)
13. 🟡 Transition-näkymä (dynaaminen, korvaa Excel)
14. 🟡 Excel → Firestore tuontityökalu
15. 🟢 Hammarby-yhteydenotto (Magnus Bodsgård, ruotsiksi)
16. 🟢 FCN-yhteydenotto (Lasse Ishøi, tutkimuskysymys)
17. 🟢 Pending deploy: Koukutus.html + Valmentaja_Matriisi.html
18. 🟢 Streak-historia Firestoreen (nyt localStoragessa)

---

## JÄRJESTELMÄARKKITEHTUURI — LISÄTTY 2026-04-12

### Seitsemän kerroksen arkkitehtuuri
```
Kerros 1:  Pelaaja / Pelaaja v1              ← pelaajan arjen työkalu
Kerros 2:  Valmentaja / Master v9            ← kenttähavainto + ADAR
Kerros 3:  Game IQ / D4 / ADAR-moduuli      ← kognitiivinen kehitys
Kerros 4:  IDP-kortti v3                    ← yksilöllinen kehityskortti
Kerros 5:  IDP-aktivointi (3 reittiä)       ← aktivointilogiikka
Kerros 6:  VP / johtamisjärjestelmä         ← seuran johtaminen
Kerros 7:  Fyysinen → teknis-taktinen       ← lopullinen tavoite
```

### Tekninen stack
| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla, IIFE-pattern) | GitHub Pages |
| Tietokanta | Firebase Firestore | `eur3` multi-region |
| Autentikointi | Firebase Auth + Custom Claims | Email/Password |
| Cloud Functions | Node.js, europe-west1 | Firebase Blaze |
| Excel-lukeminen | SheetJS 0.18.5 (client-side, vain luku) | Selain |
| Excel-generointi | openpyxl (server-side, Cloud Function) | Firebase |
| Sähköposti | Nodemailer + Gmail | Cloud Functions |
| Harjoitelogiikka | harjoitelogiikka_v4.js (1887 riviä) | GitHub Pages |
| Kielimoduuli | tm_lang.js (fi/sv/en, 144 käännöstä) | GitHub Pages |

---

## FIRESTORE-RAKENNE — TÄYDELLINEN

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/
    id, nimi, laji, paketti, tmTaso, palloliittoKori
    vp_uid, vp_email, kaupunki, maa, aktiivinen

    joukkueet/{joukkueId}
      nimi, syntymavuosi, ikäluokka
      valmentajaUid, valmentajaNimi

    kayttajat/{kayttajaId}
      uid, email, etunimi, sukunimi
      rooli, seuraId, joukkue, joukkueet[]
      aktiivinen, luotu, luonut_uid

    pelaajat/{pelaajaId}/
      etunimi, sukunimi, syntymaaika
      palloID, seuraId, joukkue, joukkueet[]
      suostumusTila: 'odottaa'|'annettu'
      tila: 'aktiivinen'|null
      huoltajaEmail               ← AINA .toLowerCase()
      biologinen_ika{}            ← Mirwald 2002
      phv_tila: 'PH'|'KV'|'AN'
      flei_profiili{}
      flei_ketjut{}               ← {SBL, SFL, LL, DIAG, DFL} 0-100
      tki{}, tsi{}

      kirjaukset/{pvm}/           ← 'YYYY-MM-DD'
        tyyppi: 'T'|'D'|'S'|'P'
        tehty: bool, kesto_min, rpe: 1-10
        aika: 'ilta'|'aamu'|'paiva'
        fiilinki: 1-5
        uni: 1-3, lihaskunto: 1-3  ← mini-Hooper, U13+
        fiilinki_paivitettu: ISO-ts ← lukitusavain

      testit/{testiId}            ← H-H ominaisuustestit
      kartoitukset/{kartoitusId}  ← harjoitettavuus, FLEI
      tekniikka/{kilpailuId}      ← tekniikkakilpailut
      adar/{adarId}               ← Game IQ — EI havainnot-kokoelmaan!
      havainnot/{havaintoId}      ← valmentajan kenttähavainnot

      idp_kausi/{kaudenId}

      pelihavainnot/{otteluId}/   ← Sprint 5
        tyyppi: 'valmentaja'|'pelaaja'
        tips_T, tips_I, tips_P, tips_S: 1-10
        idp_nakyiko: 'kylla'|'osittain'|'ei'
        havainto: string, fiilinki: 1-5
        otteluId, seuraId, joukkueId, pvm

    mentoroinnit/{id}/
      valmentajaUid, valmentajaNimi, pvm, ikavaihe, splKa
      inno, liike, pallo, tekni, pelille, maali, seuraOma
      toimenpide, kirjaajaRooli, seuraId, luotu

utj_data/{kausi}/
  kasvatteja, vlYkk, minuuttia, seurat[]

testitapahtumat/         ← OIKEA NIMI (ei 'tapahtumat')
kirjaukset/              ← vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/

players/{playerId}       ← Solo-pelaajat (ei seurahierarkiassa)
  nimi, synVuosi, synKuukausi, email
  pp, kokemus, treeni, ketju
  tkkYht, tkkMerkki, tkkVuosi
  kotiPonn, kotiSeina, kotiDrip, kotiPvm
  playerCode: 'TMP-XXXX'
  seuraId: null → täytetään kun seura liittyy

  players/{id}/tkk_historia/{vuosi}
    yht, merkki, lajit: {ponn, syotto, pujottelu, kl, potku}

  players/{id}/kotimittarit/{pvm}
    ponn, seina, drip
```

---

## SECURITY RULES — ROOLIKOHTAINEN PÄÄSY

```
super_admin          → kaikkeen
vp                   → oma seura, kaikki
valmentaja           → luku oma seura, kirjoitus havainnot/harjoitukset
urheilutoimenjohtaja → aggregoitu data, ei yksilödata
fysioterapeutti      → vammat strict
pelaaja              → oma profiili + kirjaukset/{pvm}
vanhempi             → lapsen profiili pelkistetysti
anonyymi             → vain suostumusTila=='odottaa'
```

### Custom Claims — kanoninen lista
```
super_admin | vp | seurasihteeri | urheilutoimenjohtaja |
valmentaja | talenttivalmentaja | fysiikkavalmentaja |
fysioterapeutti | testivastaava | pelaaja | vanhempi
```
**underscore CANONICAL** — `normalizeRooli()` hoitaa vanhat muodot

---

## PELIHAVAINTO-ARKKITEHTUURI (Sprint 5)

### TIPS-rakenne (Ajax-pohja + TM-uniikki)
```
T = Tekninen suoritus paineessa   (D2)
I = Pelikuva — Game IQ            (D4)
P = Persoona — intensiteetti      (D3)
S = Suorituksen nopeus            (D1+D4)
+ IDP-tavoitteen toteutuminen     ← TM-uniikki, ei muualla
```

### Ikävaiheen adaptaatio
```
Leikkija U8-12:   ei numeroita, kuvakysymykset
Rakentaja U13-16: TIPS 1-10 + IDP + vapaa havainto
Showcase U17-19:  TIPS + positiokohtainen + vertailu
```

### Kirjaamisjärjestys (EPPP-malli)
```
Valmentaja kirjaa 24h sisällä ottelusta
→ Pelaaja arvioi 48h sisällä
→ Pelaaja näkee valmentajan arvion VASTA oman jälkeen
→ VP: molemmat + FLEI + PHV + bio-ikä + RAE kontekstina
→ Kehityskeskustelu → IDP päivittyy automaattisesti
```

**Taso 3 — TM:n uniikki lisäarvo:**
Arvioija näkee FLEI-profiilin, PHV-tilan, biologisen iän ja
syntymäkvartaalin suoraan TIPS-arvion vierellä.
Mikään muu järjestelmä ei tee tätä.

---

## SPRINT-SUUNNITELMA

### Sprint 4 (käynnissä — 2026-04-12)
- [x] VP v18: Valmentajat-tabi yhdistetty
- [x] VP v18: Harjoitteluseuranta + suodatin
- [x] VP v18: Valmentajakortit grid
- [x] SJK pilottiin (U15P + U14/15T + talentit)
- [x] Excel-tuontipohja (testit + kartoitus + tekniikka)
- [x] Solo-versio: onboarding + kortti + profiilisivu
- [x] TalentMaster Player Card™ — Starter/Sharp/Elite -variantit
- [ ] Pelaaja-sivu lag-bugi
- [ ] SJK VP-tunnukset + joukkueet
- [ ] Excel → Firestore tuontityökalu
- [ ] Palloliiton laukausstatistiikka-linkki kalenteriin

### Sprint 5
- [ ] Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
- [ ] Pelihavainto Taso 2 (pelaajan itsearviointi)
- [ ] Suostumuslomakkeet SJK:lle (kun data OK)
- [ ] Tyttöjen PHV-kaava (Mirwald eri parametrit)
- [ ] Solo-versio: Firebase-integraatio (players-kokoelma)
- [ ] Solo-versio: Google Sign-In

### Sprint 6–8
- [ ] Pelihavainto Taso 3 (IDP-kytkös + FLEI-korrelaatio)
- [ ] AI Behavioural Science -agentti
- [ ] Milestone-kortit Firestoresta
- [ ] Solo-versio: Stripe-maksut (4,99€/kk)

---

## LISÄTYT KRIITTISET TEKNISET RATKAISUT (27–31)

Lisätty arkkitehtuuridokumentista — puuttuivat master summarysta:

27. Chart.js: AINA `Chart.getChart()` + destroy + redraw, EI `_init` guard
28. Chart.js `display:none`-näyttö: `setTimeout(50–100ms)` ennen init-kutsua
29. **Syntymäpäivä: `Date.UTC(y,m-1,d)` — EI `new Date(string)` (timezone-bugi)**
30. **Näkymien vaihto: `style.display` EI `classList` (ei flicker)**
31. **`openpyxl` pakollinen Excel-tyyleille — SheetJS ei tue server-side tyylejä**
32. **Suostumuslomake: kutsuflow=`.update()`, uusi pelaaja=`.set()` — eri polut**
33. **Testaus AINA GitHub Pages URL:lla — `file://` estää Firebase Auth kokonaan**

### SJK-käyttöönottoprosessi (järjestys tärkeä)
```
1. VP-tunnukset Admin-näkymästä
2. Joukkueet Firestoreen (U15P, U14T, U15T, Talentit)
3. Pelaajat rekisteröidään (ilman suostumusta)
4. SJK toimittaa testidatan Excel-pohjalle
5. Tuontityökalu: Excel → Firestore (Sprint 4)
6. VP + valmentajat tarkistavat datan
7. VASTA sitten suostumuslomakkeet + pelaajatunnukset
```
