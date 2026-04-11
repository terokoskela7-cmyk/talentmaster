# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-11)

TalentMaster on jalkapallon talenttiarviointialusta — 8 pilottiseuraa, Firebase Blaze.
Kehitys etenee kahdella rinnakkaisella haaralla:
1. **Seurajärjestelmä** (VP/Valmentaja/Pelaaja) — tuotannossa
2. **Solo-versio** (TalentMaster Player™) — uusi tuotehaarake, rakennettu tässä sessiossa

---

## GitHub-repositorio
```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---

## Sivuarkkitehtuuri (2026-04-11)

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

### Solo-versio — TalentMaster Player™ (uusi, ⏳ PENDING GitHubiin)
| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_Player_Home.html` | Onboarding: splash → nimi → syntymäaika → kortti | ⏳ PENDING |
| `TalentMaster_Solo_Profiili.html` | Profiili: tekniikkakilpailu, kotimittarit, fyysinen, pelaajaprofiili | ⏳ PENDING |
| `TalentMaster_Solo_Arviointi.html` | Alkuarviointi 3-kerrosta: tausta, tekniikka Y/N, mittaukset | ⏳ PENDING |
| `TalentMaster_Kortti_Demo.html` | Korttityypit: Starter/Sharp/Elite, pelipaikka-ikonit | ⏳ PENDING |

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

## Pilottiseurat (8 kpl) — tila 2026-04-11
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

## TÄMÄN SESSION TUOTOKSET (2026-04-10 → 2026-04-11)

### Solo-versio — TalentMaster Player™

#### TalentMaster_Player_Home.html — onboarding
**Filosofia (UX-määrittely v1.0):**
- WOW-efekti = omistajuuden tunne, ei animaatiot
- Rekisteröityminen ei tunnu lomakkeelta — tuntuu peliltä
- Sähköposti + salasana VIIMEISENÄ (psykologinen sitoutuminen ensin)

**Rakenne — 3 screeniä:**
```
S0: Splash
  - Kultainen TM-logo nousee pimeydestä (scale(0)rotate(-15deg) → scale(1))
  - Kolme pulssoivaa kultarengasta ympärillä
  - "Tee se mitä ammattilaiset tekevät. Joka päivä." — "Joka päivä" kultaisena
  - CTA: "Aloita — se on ilmainen" + shimmer-efekti napissa
  - Particle-kenttä (52 hiukkasta, sininen/kulta/teal)

S1: Nimi
  - Vain etunimi — heti kun kirjoitettu:
    "Hei [Nimi] — tehdään sinulle oma kortti."
  - Enter-nappi jatkaa suoraan

S2: Syntymäaika
  - Vuosi: scroll-wheel (rullattava, snap, kultainen valittu)
  - Kuukausi: 3×4 grid, klikattavat napit
  - "Luo korttini →" → suoraan korttipaljastumiseen

sCard: FIFA-kortin paljastuminen
  - t=300ms: kortti nousee alhaalta (translateY(64px) → 0)
  - t=900ms: 3D-flip (rotateY(180deg) → 0)
  - t=1900ms: kultainen burst välähtää + tausta syttyy
  - t=2.2-5.1s: kolme lausetta peräkkäin:
    "Tämä on sinun korttisi, [Nimi]."
    "Se muuttuu sitä mukaa kun sinä muutut."
    "Aloitetaan."
    → koodi kultaisena isolla: TMP-XXXX
    → "Tämä on sinun koodisi. Jaa se kavereille."
  - t=5.8s: "Aloita harjoittelu →" nappi
  - Tallentuu: localStorage tm_player_code + tm_solo_profiili
```

**FIFA-kortin rakenne:**
- Pyöreäkulmainen suorakaide (sama muoto kuin kuva 1, Mäkinen-kortti)
- Kehys: 3px gradient-reunus (FFE566→F5B700→C88000→7A4D00)
- Tausta: syväsininen, radial gradient yläosasta
- Pelipaikka-badge + tähdet oikeassa yläkulmassa
- OVR iso (76px Barlow Condensed 900), kultainen gradient + drop-shadow
- Pelaajan nimi isolla
- 6 statistiikkaa 3+3 gridissä
- XP-palkki alareunassa
- Shimmer-pyyhkäisy silmättömänä loopina

**Kolme korttityyppiä:**
```
⭐   Starter  — sininen (lähtötaso, OVR 40-50)
⭐⭐  Sharp   — kultainen (kehittyvä, OVR 51-65)
⭐⭐⭐ Elite  — platina/hopea (huipputaso, OVR 66+)
```

#### TalentMaster_Solo_Profiili.html — pelaajan profiilisivu
**5 collapsible-osiota:**

1. **Pelaajaprofiili** — chippeillä (ei lomake):
   - Pelipaikka: MV/PUO/LP/KK/HKK/LH/HYÖ
   - Kokemus: aloitin juuri / 1-2v / 3-4v / 5+v
   - Treenikerrat: 0/1-2/3-4/5+
   - Vaikein asia: ketjuvalinta SBL/LL/DFL/SFL/DIAG

2. **Tekniikkakilpailutulokset** — ydin:
   - Kilpailuvuosi (chip-valinta)
   - Kokonaistulos sekunteina + merkki (kulta/hopea/pronssi)
   - Lajit erikseen (valinnainen): ponnauttelu, syöttäminen, pujottelu,
     kuljetus-laukaus, pituuspotku (vain 12-13v)
   - Ponnauttelu-ohje vaihtuu automaattisesti iän mukaan:
     - P13-11/T13-12: vuorojaloin 4× + vuororeisin 4× + päällä 4× — 3×
     - P10/T11: vuorojaloin 4× + vuororeisin 4× + päällä 1× — 3×
     - P9/T10-9: vuorojaloin 4× + vuororeisin 2× — 2× (ei päätä)
     - P/T8: vuorojaloin 10×
   - Kaikki testit sekunteina (pienempi parempi), pituuspotku metreissä
   - Tuloshistoria vuosittain

3. **Fyysinen testi** (valinnainen):
   - Vauhditon pituushyppy (cm), 5-loikka (m)
   - Naruhypyt 15s (kpl), 30m sprintti (s)

4. **Kotimittarit** (3 kk seuranta):
   - Ponnautusluku (kpl), seinäsyöttöputki (kpl), driblausaika (s)
   - Tallentaa päivämäärän, näyttää milloin seuraava mittaus

5. **Seuran testitulokset** (automaattinen Firestoresta):
   - FLEI + ketjupisteet kun seura käyttää TalentMasteria
   - PlayerCode näkyy jaettavaksi

**Tallentuu:** localStorage `tm_solo_profiili` + `tm_tkk_historia`

#### TalentMaster_Solo_Arviointi.html — alkuarviointi
**3 kerrosta, 13 screeniä:**

Kerros 1 — Tausta (4 kysymystä):
- Syntymävuosi+kuukausi → ikä + RAE-huomio (tammikuu/joulukuu)
- Harjoittelukokemus
- Treenikerrat viikossa
- Vaikein asia pelissä → FLEI-ketjun valinta

Kerros 2 — Tekniset Y/N (kokeile itse ennen kuin vastaat):
1. Kuljettaminen 20m silmät ylhäällä
2. Vastaanotto seinästä 5m, 3/5 hallitusti
3. Syöttö reppu 15m, 3/5 osuu
4. Cruyff-käännös molemmin puolin
5. Laukaus: maali TAI kaveri/vanhempi 10m päässä kädet edessä → 3/5

Kerros 3 — Kolme mittausta (lähtötaso, palataan 3 kk päästä):
- Ponnautusluku, seinäsyöttöputki, driblausaika

**Tulos:**
- FIFA-kortti OVR-arvolla (40-78)
- T-mesosykli kalenterin mukaan (Kaka/Affelay/Ronaldo/Beckham)
- D-harjoite ketjuvalinnan mukaan
- PHV-varoitus 11-13-vuotiaille automaattisesti

#### TalentMaster_Kortti_Demo.html — korttidemo
- Standalone demo kolmesta korttityypistä
- Starter/Sharp/Elite napista → koko värimaailma vaihtuu
- Pelipaikka-ikonit: ⚽ HYÖ / ⚡ KHK / ⚙️ KK / 🛡️ PUO / 🧤 MV
- Kipinät + burst joka variantinvaihdossa
- Fontti: Barlow Condensed 900 (FIFA-tyylinen mutta oma identiteetti)

---

## AIEMMAT SESSION TUOTOKSET (2026-04-08 → 2026-04-09)

### VP v18 — Valmentajat-tabi
```
Valmentajat-tabi (korvasi: Henkilöstö + Valmennus)
  ├── 👤 Valmentajat: kortit grid, hover, väriviiva roolittain
  └── 📊 Osaaminen: lataaHSSeuranta() — KPI + 7 kriteeriä + trendi + suodatin
```
**Kriittiset korjaukset:**
- `_avaaValmentajaPopup` → globaali (oli nested → ReferenceError)
- `window._vpKayntiBadge/Viimeisin/RooliNimet/JData` → cache
- `nimiToUid`-kartta: UID-mismatch mentoroinnit ↔ kayttajat
- `_tavoitteetLadattu`, `_henkilostoLadattu` globaalit lisätty

### Testidatan tuontipohja
`TalentMaster_Testidatan_Tuontipohja.xlsx` (5 välilehteä):
- 0_OHJEET, 1_Pelaajat, 2_HH_Testit, 3_Harjoitettavuus, 4_Tekniikkakilpailut
- FLEI% automaattinen, validointi, TSI automaattinen

### Pelihavainto-arkkitehtuuri (suunniteltu, Sprint 5)
```
TIPS: T=Tekninen / I=Pelikuva / P=Persoona / S=Nopeus / +IDP-kytkös
3 tasoa: Valmentaja 24h → Pelaaja 48h → VP näkee molemmat + FLEI+PHV
KV-perusta: Ajax TIPS, GPAI, EPPP
Demo: TalentMaster_Pelihavainto_Demo.html (offline, ei GitHubissa)
```

### Palloliiton yhteistyö (2026-04-09)
- Head of Talent -tapaaminen
- Positioning: TalentMaster = Myeway:n toiminnallinen pari (ei kilpailija)
- Laukauskarttaa ei rakenneta — linkki Palloliiton BI:hin riittää

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

**T-mesosykli kalenteripohjainen (Kaka/Affelay/Ronaldo/Beckham):**
```
Syys/Tammi: Vastaanottaminen — Kaka-sarja
Loka/Helmi: Dribbeli — Affelay-sarja
Marras/Maalis: 1v1-liikkeet — Ronaldo-sarja
Joulu/Huhti: Syöttäminen — Beckham-sarja
Mikrosykli (Noordster): Vk1 hidas → Vk2 nopeutuu → Vk3 vastustaja → Vk4 mittaus → Vk5 REPEAT
```

---

## FLEI — 5 ketjua (pysyvä, Wilke 2016)
| Ketju | Avain | Emoji | Selite |
|---|---|---|---|
| Vauhtiketju | `sbl` | ⚡ | Nopeus, räjähtävyys |
| Lähtöketju | `sfl` | 🦵 | Kiihdytys, pysähtyminen |
| Sivuketju | `ll` | ↔️ | Suunnanmuutos, feintit |
| Kiertoketju | `diag` | 🔄 | Syöttö, laukaus (korvaa SL+FL) |
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
26. Solo-pelaajat: `players/{id}` (ei seurahierarkiassa) — `seuraId: null`

---

## Avoimet bugit (2026-04-11)
| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Pelaaja-sivu lagaa / ei toimi | TalentMaster_Pelaaja_v1.html | 🔴 Korkea |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v1.html | 🟡 Keski |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 Keski |

---

## PX Sprint -analyysi (Player Experience) — 2026-04-11

Analysoitu ulkopuolinen suunnitelma "TalentMaster PX Sprint". Kolme asiaa
jotka kannattaa ottaa mukaan, muut jo olemassa tai liian aikaisia.

### ✅ Otetaan mukaan heti

**1. "Why"-lause jokaiseen harjoitekorttiin**
Nykyinen koodi näyttää harjoitteen nimen + ohjeen. Puuttuu yksi lause
joka kertoo miksi tämä auttaa pelissä. Pieni muutos, iso vaikutus motivaatioon.
```
Ennen: "Sivuttaisliike + spurtti — 5 toistoa/puoli"
Jälkeen: "Sivuttaisliike + spurtti — auttaa sinua voittamaan 1v1-tilanteet"
```
Toteutus: lisää `why`-kenttä `harjoitelogiikka_v4.js`:n harjoite-objekteihin.
Ikätasokohtainen teksti: leikkija = "auttaa ohittamaan pelaajan",
rakentaja = "tekee sinusta vaikeamman puolustaa",
showcase = "ratkaisee tilanteita kovassa tempossa".

**2. Onnistumismittarit — käytetään OrsaSport-pilotin arvioinnissa**
```
Day 1:  80% ymmärtää mitä tehdä ilman selitystä
Day 3:  50% avaa appin uudestaan
Day 7:  30% tekee 3 päivän streakin
```
Testikysymykset 5-10 pelaajalle: "Ymmärsitkö mitä tehdä?" /
"Kauanko kesti aloittaa?" / "Avaatko huomenna uudestaan?"

### 📋 Tallennettu Sprint 6-8:aan — AI Copy Agent

Prompti on kirjoitettu valmiiksi ja sopii suoraan TalentMasterin
AI-agentin toteutukseen (Sprint 6-8). Ikäjaottelu identtinen
`leikkija/rakentaja/showcase`-jaon kanssa.

```
You are a youth football coach.
Write a short message (max 2 sentences).

Rules:
- simple language, no jargon
- explain why this matters in a game
- adapt tone by age:
  10-12: playful
  13-15: encouraging
  16-19: performance-focused

Input:
Age: {age}
Focus: {focus}         ← heikoin FLEI-ketju
Last feedback: {feedback}   ← valmentajan viimeisin havainto
Streak: {streak}
```

Output-esimerkit:
- 11v: "Pidä pallo lähellä ja kokeile eri suuntia ⚽ Tämä auttaa sinua ohittamaan pelaajan pelissä!"
- 14v: "Nopea suunnanmuutos tekee sinusta vaikeamman puolustaa. Tämä näkyy suoraan 1v1-tilanteissa."
- 17v: "Explosiivinen suunnanmuutos ratkaisee tilanteita kovassa pelitempossa. Tee tämä huolellisesti."

**Aktivointihetket (triggerit) kun aika on oikea:**
- Streak katkeamassa
- 3 päivän putki saavutettu
- Fiilinki matala 2 päivää peräkkäin
- Uusi viikko (fresh start)
- PHV-huippu

### ❌ EI rakenneta vielä
- Daily Summary Builder Cloud Function → `generoimTehtavat()` tekee jo tämän
- AI-agentti → Sprint 6-8, vasta kun pelaajat käyttävät appia 3 päivää putkeen
- Monimutkainen trigger-logiikka → turha ennen kuin lag-bugi on korjattu

---

## Seuraavaan sessioon (tärkeysjärjestyksessä)
1. 🔴 Pelaaja-sivu lag-bugi — tutkimatta
2. 🔴 Lisää "why"-lause harjoitekortteihin (`harjoitelogiikka_v4.js`)
3. 🔴 Solo-versio deploy GitHubiin (4 tiedostoa)
4. 🔴 SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
5. 🔴 Excel → Firestore tuontityökalu
6. 🟡 Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
7. 🟡 Tyttöjen PHV-kaava (ennen U14/15T-aktivointia)
8. 🟡 Fiilinki ikävaihekysely-bugi
9. 🟡 Solo Firebase-integraatio (players-kokoelma)
10. 🟢 Pending deploy: Koukutus.html + Valmentaja_Matriisi.html
11. 🟢 Streak-historia Firestoreen (nyt localStoragessa)

---

## Avoimet tekniset asiat
- **Cloud Scheduler API:** console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot
- **Rules-deploy:** Firebase-konsoli (GitHub Actions → 403)
- **CDN cache:** ~10min — `?v=N` + tarkista raw.githubusercontent.com
- **Tyttöjen PHV:** Mirwald eri parametrit — pakollinen ennen SJK U14/15T
- **Palloliiton Power BI:** https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9
