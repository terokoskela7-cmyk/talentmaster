[ARKKITEHTUURI.md](https://github.com/user-attachments/files/27151254/ARKKITEHTUURI.md)
# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-04-13

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

---

## Tekninen stack

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

**Firebase Functions:** AINA `firebase.app().functions('europe-west1')` —
`firebase.functions()` → us-central1 (väärä)

---

## Firebase-projekti

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Firestore sijainti:** `eur3` multi-region
- **Super Admin:** `talentmasterid@gmail.com` (UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`)
- **Super admin tunnistus:** `adminSnap.exists` — EI custom claims -arvoista

**ABSOLUUTTINEN PERIAATE:** Super Adminilla on aina pääsy kaikkeen.
Ei saa koskaan rikkoutua.

---

## Pilottiseurat (9 kpl) — tila 2026-04-13

| SeuraId | Seura | Tila | Huomio |
|---|---|---|---|
| `fcl` | FC Lahti Juniorit | ✅ aktiivinen | — |
| `kpv` | KPV Kokkola | ✅ aktiivinen | Topias Koskela, test UID: TM-MN67OLDO |
| `palloiirot` | Pallo-Iirot | ✅ aktiivinen | — |
| `yvies` | Ylöjärven Ilves | ✅ aktiivinen | — |
| `sjk` | SJK Juniorit | ✅ laajennettu | U15P + U14/15T + talenttipelaajat |
| `grifk` | GrIFK | ✅ aktiivinen | sv-kieli |
| `vifk` | VIFK | ✅ aktiivinen | sv-kieli |
| `hjk` | HJK Juniorit | ✅ aktiivinen | — |
| `eps` | EPS (Espoon Palloseura) | ✅ tunnukset | Heini, Teams-puhelu PENDING |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin demo-seura |

**SJK-huomio:** Ensimmäinen seura jolla tyttöjoukkue mukana.
Tyttöjen PHV-kaava (Mirwald) eri parametrit — tarkistettava Sprint 5:ssä.

---

## Firestore-tietokantarakenne

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
        fiilinki_paivitetty: ISO-ts ← lukitusavain

      testit/{testiId}            ← H-H ominaisuustestit
      kartoitukset/{kartoitusId}  ← harjoitettavuus, FLEI
      tekniikka/{kilpailuId}      ← tekniikkakilpailut
      adar/{adarId}               ← Game IQ (EI havainnot-kokoelmaan)
      havainnot/{havaintoId}      ← valmentajan kenttähavainnot

      idp_kausi/{kaudenId}

      pelihavainnot/{otteluId}/   ← TULEVA Sprint 5
        tyyppi: 'valmentaja'|'pelaaja'
        tips_T, tips_I, tips_P, tips_S: 1-10
        idp_nakyiko: 'kylla'|'osittain'|'ei'
        havainto: string, fiilinki: 1-5
        otteluId, seuraId, joukkueId, pvm

    mentoroinnit/{id}/            ← VP:n harjoitteluseurantakäynnit
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
```

---

## Sivuarkkitehtuuri — tila 2026-04-13

### Seurajärjestelmä

| Tiedosto | Rooli | GitHub | Huomio |
|---|---|---|---|
| `TalentMaster_VP_v18.html` | vp | ✅ | Valmentajat-tabi, harjoitteluseuranta, kortit grid |
| `TalentMaster_Master_v9.html` | valmentaja | ✅ | — |
| `TalentMaster_Seura.html` | seurasihteeri/utj/vp | ✅ | UTF-8 korjattu |
| `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ | v4-logiikka, Stage, fiilinki-lukitus ⚠ lag-bugi |
| `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ | Toimii KPV:llä |
| `TalentMaster_Rekisterointi_Suostumus.html` | huoltaja | ✅ | fi/sv/en kielituki |
| `TalentMaster_Kortit.html` | pelaaja | ✅ | FIRE/ICON/MILESTONE/TOTY + WOW |
| `TalentMaster_Vanhempi.html` | huoltaja | ✅ | — |
| `TalentMaster_UTJ_v2.html` | urheilutoimenjohtaja | ✅ | DNA-välilehti, CSI, 6 välilehteä (korvaa v1) |
| `TalentMaster_Admin.html` | super_admin | ✅ | — |
| `TalentMaster_ADAR_Koulutus.html` | valmentaja | ✅ | — |
| `TalentMaster_Valmentaja_Matriisi.html` | koulutus | ✅ | 5-tabi coaching tool |
| `TalentMaster_Koukutus.html` | markkinointi | ⏳ PENDING | — |
| `TalentMaster_Pelihavainto_Demo.html` | demo | ⚠ EI GitHubissa | Palloliiton offline-demo |

### Solo-versio (TalentMaster Player™)

| Tiedosto | Rooli | GitHub | Huomio |
|---|---|---|---|
| `TalentMaster_Player_Home.html` | solo-pelaaja | ✅ | Onboarding: splash → nimi → syntymäaika → kortti |
| `TalentMaster_Solo_Profiili.html` | solo-pelaaja | ✅ | Profiili: tkk-tulokset, kotimittarit, pelaajaprofiili |
| `TalentMaster_Solo_Arviointi.html` | solo-pelaaja | ⏳ PENDING | Alkuarviointi 3-kerrosta |
| `TalentMaster_Kortti_Demo.html` | demo | ✅ | Korttityypit: Starter/Sharp/Elite |

### Myynti- ja esitystiedostot

| Tiedosto | GitHub | Huomio |
|---|---|---|
| `tm_pitch_en.html` | ✅ | Englanninkielinen pitch — U8→Pro, 5D Framework, 10 osiota |
| `tm_pitch.html` | ✅ | Suomenkielinen pitch |
| `tm_brand.html` | ✅ | Brändikirja: logo, värit, typografia, periaatteet |
| `TalentMaster_UTJ_v2.html` | ✅ | UTJ-dashboard v2 |
| `tm_dna_builder.html` | ✅ | DNA-rakennustyökalu |
| `tm_dna_opas.html` | ✅ | DNA-opas |
| `tm_filosofia_kirjasto.html` | ✅ | Filosofiakirjasto |
| `eps_unified_v2.html` | ✅ | EPS-dashboard, 7 välilehteä |
| `hammarby_talentmaster_analyysi_1.html` | ✅ | Strateginen analyysi |
| `hammarby_simulation.html` | ✅ | Interaktiivinen simulaatio — 5 pilaria Hammarby → TalentMaster |
| `talentmaster_player_demo_1.html` | ✅ | 3 perspektiiviä: Pelaaja/Valmentaja/SD |

---

## Cloud Functions — 7 deployattu (europe-west1)

| Funktio | Tarkoitus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ Sama email eri rooli OK |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit + salasananollaus | ✅ |
| `tasoHaeSeuranOttelut` | TASO API | ✅ |
| `tasoHaeMaatcheck` | TASO cron | ❌ KOMMENTOITU |

---

## TalentMaster 5D Framework™

| Dimensio | Avain | Paino | Mittarit |
|---|---|---|---|
| Physical | D1 | **40%** | Sprint · PHV (Mirwald 2002) · FLEI · MAS test · COD |
| Technical | D2 | **25%** | First touch · passing · technique competitions · daily T-drill |
| Psychological | D3 | **15%** | Growth mindset · FLEI trainability · Dweck 2006 |
| Cognitive | D4 | **10%** | ADAR · space reading · Game IQ |
| Social | D5 | **10%** | SDT (Deci & Ryan) · coachability · team role |

**OVR-kaava:** `(D1×0.40)+(D2×0.25)+(D3×0.15)+(D4×0.10)+(D5×0.10)`

**RAE-korjaus:** Q1 ×0.92 / Q2 ×0.96 / Q3 ×1.02 / Q4 ×1.06

**DVI (Development Velocity Index):** Kuka kehittyy nopeammin kuin normit ennustavat.
DVI > +0.15 = X-Factor signaali / DVI < 0 korkean raw-scoren kanssa = Hidden Gem at risk.

**PHV-vaiheet ja automaattikorjaus:**
- Pre-PHV: load builds, coordination window
- PHV peak: D1-paino laskee 10 pistettä automaattisesti, FLEI-kynnys madaltuu
- Post-PHV: load voi kasvaa, positional specialisation

---

## Brändi-identiteetti (lukittu)

```
--carbon:  #1C1C1A   (pääväri tumma)
--bone:    #F2EFE6   (pääväri vaalea)
--teal:    #1A7A5E   (aksentti, CTA)
--slate:   #8C8B83   (sekundäärinen teksti)
```

- **Display-fontti:** Cormorant Garamond (otsikot, numerot)
- **Body-fontti:** DM Sans (UI, leipäteksti)
- **Logo:** kehä-SVG — 3 kehää + teal-piste + pystyviiva
- **Non-Negotiable:** Barlow Condensed poistettu kaikista tiedostoista

---

## VP v18 — Valmentajat-tabi (2026-04-09)

### Rakenne
```
tab: Valmentajat  (korvasi: Henkilöstö + Valmennus)
  ├── 👤 Valmentajat-näkymä
  │     ├── joukkue-grid korttimuoto
  │     ├── Kortti: avatar + nimi + rooli + hs ka + käyntejä + badge
  │     └── Klikkaus → _avaaValmentajaPopup() [GLOBAALI — EI nested]
  └── 📊 Osaaminen-näkymä
        ├── ADAR-linkki (kompakti)
        ├── lataaHSSeuranta() — Power BI -inspiroitu
        │     ├── KPI-rivi (seuran hs-ka, käyntejä, valmentajia)
        │     ├── Kriteeripalkistot (tavoiteviiva)
        │     ├── Trendi SVG (polyline)
        │     ├── Per valmentaja
        │     └── Valmentajasuodatin [Kaikki][Sari K.][Mikko V.]
        └── Käyntiaktiivisuus + hyvinvointi
```

### Kriittiset korjaukset
- `_avaaValmentajaPopup` → globaali (oli nested)
- `window._vpKayntiBadge/Viimeisin/RooliNimet/JData` → cache
- `nimiToUid`-kartta: UID-mismatch korjaus
- Historia max 10 käyntiä, kriteeripalkki per käynti
- Lazy-loading: `valmentajat:` (oli `henkilosto:` + `valmennus:`)
- `_tavoitteetLadattu`, `_henkilostoLadattu` globaalit lisätty

---

## Harjoitelogiikka v4

### 5 liikeketjua — DIAG pysyvästi (Wilke 2016)
```javascript
sbl:  '⚡ Vauhtiketju'
sfl:  '🦵 Lähtöketju'
ll:   '↔️ Sivuketju'
diag: '🔄 Kiertoketju'   // korvaa SL+FL — Wilke et al. 2016
dfl:  '🏗️ Hallintaketju'
// Peliälyketju = D4, EI liikeketju
```

### Kielitasot
```
leikkija  U8-12:  "leiki", "kokeile"
rakentaja U13-15: "tee näin" + perustelu
showcase  U16-19: termit + "mittaa" + "kirjaa"
```

### Stage-laskenta
```
harjoitettavuus_pisteet → Stage 1-5
8-vk jakso: Pohja(+0) / Kehitys(+1) / Huipentuma(+2)
PHV-rajoite: phv_tila==='PH' → max Stage 2
```

### T-harjoite — mesosykli (kalenteripohjainen)
```
Makrosykli: 2 kierrosta/kausi (syys–joulu, tammi–huhti)
Mesosykli (1 kk = 1 tekninen teema):
  Syys/Tammi: Vastaanottaminen — Kaka-sarja
  Loka/Helmi: Dribbeli — Affelay-sarja
  Marras/Maalis: 1v1-liikkeet — Ronaldo-sarja
  Joulu/Huhti: Syöttäminen — Beckham-sarja
Mikrosykli (Noordster-progressio):
  Vk 1: ilman vastustajaa, hidas
  Vk 2: sama liike, nopeutuu
  Vk 3: passiivinen vastustaja
  Vk 4: mittaus + oma arvio
  Vk 5: REPEAT INDIVIDUAL NEED (Fulham)
```

---

## Pelihavainto — suunnitelma (Sprint 5)

### TIPS (Ajax-pohjainen + TM-lisä)
```
T = Tekninen suoritus paineessa   (D2)
I = Pelikuva — Game IQ            (D4)
P = Persoona — intensiteetti      (D3)
S = Suorituksen nopeus            (D1+D4)
+ IDP-tavoitteen toteutuminen     (TM-uniikki)
```

### Ikävaiheen adaptaatio
```
Leikkija U8-12:  ei numeroita, kuvakysymykset
Rakentaja U13-16: TIPS 1-10 + IDP + vapaa havainto
Showcase U17-19: TIPS + positiokohtainen + vertailu
```

### Järjestys (EPPP-malli)
```
Valmentaja kirjaa 24h → Pelaaja arvioi 48h
→ Pelaaja näkee valmentajan arvion VASTA oman jälkeen
→ VP: molemmat + konteksti (FLEI + PHV + bio-ikä + RAE)
→ Kehityskeskustelu → IDP päivittyy
```

### Taso 3 — uniikki lisäarvo
Arvioija näkee FLEI-profiilin, PHV-tilan, biologisen iän ja
syntymäkvartaalin suoraan TIPS-arvion vierellä.
Mikään muu järjestelmä ei tee tätä.

---

## Testidatan tuontirakenne (2026-04-09)

### Excel-pohja: `TalentMaster_Testidatan_Tuontipohja.xlsx`
```
0_OHJEET           — VP:n käyttöohjeet
1_Pelaajat         — perustiedot + PHV-data
2_HH_Testit        — nopeus / ketteryys / voima / tekniikka / kestävyys
3_Harjoitettavuus  — pisteet 1-3, FLEI% automaattinen
4_Tekniikkakilpailut — syöttö + pujottelu + ponnauttelu
```

### Tekniikkakilpailumittaukset (Palloliitto 2023)
```
Kaikki testit aikapohjaisia (sekunteja) paitsi pituuspotku (metrejä):
  Ponnauttelu:    aika + sarja ikäluokittain
  Syöttäminen:    aika aloituksesta viimeiseen osumaan (max 60s)
  Pujottelu:      aika lähdöstä maalilinjalle (max 60s)
  Kuljetus-laukaus: loppuaika tarkkuusvähennysten jälkeen (max 40s)
  Pituuspotku:    metriä (vain P/T 12-13), 5m = 1s vähennys
Kokonaistulos = kaikkien lajien aikojen summa (pienempi parempi)
Merkkirajat esim P13: kulta <75s, hopea <85s, pronssi <100s
```

### SJK-käyttöönottoprosessi
```
1. VP-tunnukset Admin-näkymästä
2. Joukkueet Firestoreen (U15P, U14T, U15T, Talentit)
3. Pelaajat rekisteröidään (ilman suostumusta)
4. SJK toimittaa testidatan Excel-pohjalle
5. Tuontityökalu: Excel → Firestore (Sprint 4)
6. VP + valmentajat tarkistavat datan
7. VASTA sitten suostumuslomakkeet + pelaajatunnukset
```

---

## Solo-versio (TalentMaster Player™)

### Filosofia
Sama "Pelaaja ensin" -filosofia seurajärjestelmän kanssa —
mutta pelaaja käyttää yksin ilman seuraa.
Solo-pelaajat tallennetaan `players/{id}` (ei seurahierarkiassa).
Linkitetään seuraan `seuraId`-kentällä myöhemmin.

### Rekisteröitymisvirta
```
Splash → Nimi → Syntymäaika → FIFA-kortin paljastuminen → Profiili
```

### FIFA-kortti
```
Korttityypit:
  ⭐   Starter  — sininen (lähtötaso)
  ⭐⭐  Sharp   — kultainen (kehittyvä)
  ⭐⭐⭐ Elite  — platina/hopea (huipputaso)
Pelipaikka-ikoni: ⚽ HYÖ / ⚡ KHK / ⚙️ KK / 🛡️ PUO / 🧤 MV
PlayerCode: TMP-XXXX — jaettavissa kavereille
```

---

## Security Rules

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

---

## Custom Claims

```javascript
super_admin | vp | seurasihteeri | urheilutoimenjohtaja |
valmentaja | talenttivalmentaja | fysiikkavalmentaja |
fysioterapeutti | testivastaava | pelaaja | vanhempi
// underscore CANONICAL — normalizeRooli() hoitaa vanhat
```

---

## Kriittiset tunnetut ratkaisut (33 kpl)

1. Firestore Rules: `allow create` JA `allow update` pakollinen
2. Syntymäpäivä: `Date.UTC(y,m-1,d)` — EI `new Date(string)`
3. onAuthStateChanged loop: `_kirjautuminenKesken`-flag
4. SheetJS: ei tyylejä — openpyxl server-side
5. Näkymien vaihto: `style.display` EI classList
6. Ei VP + Admin samassa selaimessa
7. onSnapshot: siivoa ennen signOut() — `tm:logout` + 50ms
8. GitHub Pages CDN: ~10min — `?v=N` + tarkista raw.githubusercontent.com
9. Roolinimet: `super_admin` underscore
10. openpyxl pakollinen Excel-tyyleille
11. Testaus: GitHub Pages URL — file:// estää Firebase
12. setCustomUserClaims pakollinen luoKayttaja:ssa
13. Rules-deploy: Firebase-konsoli (GitHub Actions → 403)
14. Suostumuslomake: kutsuflow=.update(), uusi=.set()
15. `_pelaaja` on `let` — EI `window._pelaaja`
16. harjoitelogiikka_v4.js ennen pääscriptejä
17. DIAG-ketju: `diag` — `sl` poistunut
18. YouTube: `embed/{ID}?rel=0`
19. Fiilinki-lukitus: `fiilinki_paivitetty` kirjaukset/{pvm}:stä
20. Super admin: `adminSnap.exists` EI claims-arvoista
21. huoltajaEmail: aina `.toLowerCase()`
22. Firebase Functions: AINA `europe-west1` eksplisiittisesti
23. testitapahtumat: oikea kokoelma (EI tapahtumat)
24. `_avaaValmentajaPopup`: GLOBAALI — EI nested
25. nimiToUid-kartta: UID-mismatch mentoroinnit ↔ kayttajat
26. joukkueNimi: tallenna display name, ei ID (bugi auki)
27. Chart.js: AINA `Chart.getChart()` + destroy + redraw, EI `_init` guard
28. Chart.js `display:none`-näyttö: `setTimeout(50–100ms)` ennen init-kutsua
29. Syntymäpäivä: `Date.UTC(y,m-1,d)` — EI `new Date(string)` (timezone-bugi)
30. Näkymien vaihto: `style.display` EI `classList` (ei flicker)
31. `openpyxl` pakollinen Excel-tyyleille — SheetJS ei tue server-side tyylejä
32. Suostumuslomake: kutsuflow=`.update()`, uusi pelaaja=`.set()` — eri polut
33. Testaus AINA GitHub Pages URL:lla — `file://` estää Firebase Auth kokonaan

---

## Avoimet bugit (2026-04-13)

| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Pelaaja-sivu lagaa | TalentMaster_Pelaaja_v1.html | 🔴 |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v1.html | 🟡 |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 |
| SPF/DKIM puuttuu — roskapostiin | Cloud Functions / Gmail | 🔴 |
| VP-dashboard delta/trendit puuttuu | TalentMaster_VP_v18.html | 🟡 |

---

## Sprint-suunnitelma

### Sprint 4 (valmis — 2026-04-13)
- [x] VP v18: Valmentajat-tabi yhdistetty
- [x] VP v18: Harjoitteluseuranta + suodatin
- [x] VP v18: Valmentajakortit grid
- [x] SJK pilottiin (U15P + U14/15T + talentit)
- [x] Excel-tuontipohja (testit + kartoitus + tekniikka)
- [x] Solo-versio: onboarding + kortti + profiilisivu (GitHubissa)
- [x] TalentMaster Player Card™ — Starter/Sharp/Elite -variantit
- [x] tm_pitch_en.html — englanninkielinen pitchdeck (5D Framework)
- [x] TalentMaster_Palloliitto_2026.pptx — 9-dia PowerPoint
- [x] TalentMaster_UTJ_v2.html — UTJ-dashboard v2
- [x] tm_brand.html — brändikirja
- [x] Palloliiton palaveri fyysisen suorituskyvyn johtajan kanssa (Apr 13)
- [ ] Pelaaja-sivu lag-bugi
- [ ] SJK VP-tunnukset + joukkueet
- [ ] Excel → Firestore tuontityökalu

### Sprint 5
- [ ] Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
- [ ] Training ADAR — `tyyppi: 'harjoitus'|'ottelu'` (Hammarby-oppi)
- [ ] Player Care -loki — "Käyty — pvm" + 21pv hälytys (Hammarby-oppi)
- [ ] Live Transition View — UTJ_v2 + readiness score (Hammarby-oppi)
- [ ] Weekly training focus — pelaaja/vanhempi-näkymä, IDP-kytketty (Hammarby-oppi)
- [ ] Pelihavainto Taso 2 (pelaajan itsearviointi)
- [ ] Suostumuslomakkeet SJK:lle (kun data OK)
- [ ] Tyttöjen PHV-kaava (Mirwald eri parametrit)
- [ ] Solo-versio: Firebase-integraatio (players-kokoelma)
- [ ] Solo-versio: Google Sign-In

### Sprint 6-8
- [ ] Pelihavainto Taso 3 (IDP-kytkös + FLEI-korrelaatio)
- [ ] Result KPI:t — "montako siirtyi ylemmälle tasolle" (Hammarby-oppi)
- [ ] Phase-based KPI library — Foundation/Learning/Developing/Transition (Hammarby-oppi)
- [ ] AI Behavioural Science -agentti
- [ ] Milestone-kortit Firestoresta
- [ ] Solo-versio: Stripe-maksut (4,99€/kk)

---

## Palloliiton yhteistyö

**Palaveri Head of Talent:** 2026-04-09
**Palaveri Fyysisen suorituskyvyn johtaja:** 2026-04-13

**Positioning:**
- Myeway = passiivinen dashboard (kerää dataa, ei johda toimenpiteisiin)
- TalentMaster = aktiivinen kehitystyökalu (ajaa toimintaa päivittäin)

**TM:n uniikki lisäarvo:**
- Yhdistää pelisuorituksen biologiseen ikään + FLEI + IDP
- 5D Framework + RAE-korjaus + DVI — mikään muu järjestelmä ei tee tätä
- Laukauskarttaa ei rakenneta — linkki Palloliiton BI:hin riittää

**Pilotti:** 9 seuraa (+ EPS tulossa), SJK laajentaa tyttöihin

---

## Avoimet rajapinnat — API-arkkitehtuuri (lisätty 2026-04-28)

> **Pysyvä periaate:** TalentMaster on avoin ekosysteemi. Avoimet rajapinnat mahdollistavat sen että kaksi erilaista ohjelmaa voivat "puhua" keskenään — ja kolmannet osapuolet voivat rakentaa uusia palveluita olemassa olevan tiedon päälle.

### Provider-agnostic AI-kerros (tm_ai.js)

Kaikki AI-kutsut kulkevat yhden abstraktiokerroksen kautta. EI koskaan suoraa OpenAI/Anthropic-kutsua UI-koodissa.

```javascript
// tm_ai.js
const TM_AI = {
  provider: 'anthropic', // 'openai' | 'anthropic' | 'gemini'
  async call(prompt, context) {
    if (this.provider === 'anthropic') return await tmCallAnthropic(prompt, context);
    if (this.provider === 'openai')    return await tmCallOpenAI(prompt, context);
    if (this.provider === 'gemini')    return await tmCallGemini(prompt, context);
  }
};
```

### Firebase Cloud Function = pakollinen AI-proxy

API-avaimet EIVÄT koskaan selaimessa. Kaikki AI-kutsut Cloud Functionin kautta (europe-west1).

```javascript
exports.tmAiProxy = functions.region('europe-west1').https.onCall(async (data) => {
  const { provider, prompt } = data;
  // API_KEY ympäristömuuttujassa — ei koodissa koskaan
});
```

### AI-providerit ja käyttötapaukset

| Provider | Malli | Käyttötapaus TalentMasterissa |
|---|---|---|
| Anthropic | claude-sonnet-4 | Behavioural science -agentti, Firestore-trigger → pelaajan näkymä |
| OpenAI | gpt-4o vision | Pelihavainto: valmentaja kuvaa → AI analysoi ADAR-kriteerit automaattisesti |
| OpenAI | whisper-1 | Äänikirjaus kentällä → teksti → Firestore |
| OpenAI | Assistants API | Pelaajan pitkäaikainen kehitysnarratiiivi (thread per pelaaja yli kausien) |
| Google | Gemini | Vaihtoehto — vaihdettavissa configista ilman UI-muutoksia |

### Behavioural Science -agentti (Sprint 6-8)

Trigger-ketju:
```
Firestore-muutos (kirjaus/putki/fiilinki)
  → Cloud Function (europe-west1)
    → Anthropic API
      → AI-viesti pelaajan näkymään
```

AI puhuu VAIN 3 tilanteessa (Behavior Playbook):
1. Putki vaarassa katketa (3 pv ilman kirjausta)
2. Streak-virstanpylväs (7/14/30 pv)
3. Pelaaja palaa tauolta

Kiellettyä AI:lta: painostaminen, päivittäiset viestit, "putkesi katkesi", punaiset varoitukset.

### UX-filosofia avoimille rajapinnoille

- **API-first design** — jokainen näkymä suunniteltu niin että data haettavissa myös ulkopuolelta
- **AI näkymätön** kunnes relevantti — ei "AI-powered"-badgeja missään
- **LLM-agnostinen** — käyttäjä ei tiedä eikä välitä mikä provider taustalla, hän kokee vain tuloksen
- **Saumattomat integraatiot** — kolmannen osapuolen data näkyy TalentMasterin UI:ssa ilman siirtymää

### Kooditason säännöt (pysyvät — sovelletaan jokaisessa komponentissa)

1. Kaikki AI-kutsut `TM_AI.call()` kautta — ei suoraa `fetch()` Anthropic/OpenAI UI:ssa
2. API-avaimet AINA Cloud Functionissa ympäristömuuttujana — ei koodissa koskaan
3. Cloud Functions region: **aina `europe-west1`** eksplisiittisesti
4. Provider vaihdettavissa yhdestä config-muuttujasta ilman UI-muutoksia
5. Behavior Playbook koodissa: ei punaista negatiivisille, streak puuttuva = harmaa

---

## Design Studio (lisätty 2026-04-28)

TalentMaster Design Studio on AI-pohjainen suunnittelu- ja koodaustyökalu:
- **UX Advisor** — tuntee ekosysteemin, roolit, Behavior Playbookin, lasten maailman
- **Senior Coder** — tuottaa valmiin HTML/CSS/JS:n suoraan GitHubiin

Arkkitehtuuri: kaksi erillistä API-kutsua per pyyntö:
1. UX-kutsu (300 tokens) — lyhyt suunnittelupäätös
2. Coder-kutsu (8000 tokens) — täydellinen HTML-tiedosto

Tiedosto: `TalentMaster_Studio.html` — julkaistu claude.ai Artifact -ympäristössä.
