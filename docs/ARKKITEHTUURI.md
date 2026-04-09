# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-04-09

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

**Firebase Functions:** AINA `firebase.app().functions('europe-west1')` — `firebase.functions()` → us-central1 (väärä)

---

## Firebase-projekti

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Firestore sijainti:** `eur3` multi-region
- **Super Admin:** `talentmasterid@gmail.com` (UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`)
- **Super admin tunnistus:** `adminSnap.exists` — EI custom claims -arvoista

**ABSOLUUTTINEN PERIAATE:** Super Adminilla on aina pääsy kaikkeen. Ei saa koskaan rikkoutua.

---

## Pilottiseurat (8 kpl) — tila 2026-04-09

| SeuraId | Seura | Tila | Huomio |
|---|---|---|---|
| `fcl` | FC Lahti Juniorit | ✅ aktiivinen | — |
| `kpv` | KPV Kokkola | ✅ aktiivinen | Topias Koskela, test UID: TM-MN67OLDO |
| `palloiirot` | Pallo-Iirot | ✅ aktiivinen | — |
| `yvies` | Ylöjärven Ilves | ✅ aktiivinen | — |
| `sjk` | SJK Juniorit | ✅ laajennettu | U15P + U14/15T + talenttipelaajat (2026-04-08) |
| `grifk` | GrIFK | ✅ aktiivinen | sv-kieli |
| `vifk` | VIFK | ✅ aktiivinen | sv-kieli |
| `hjk` | HJK Juniorit | ✅ aktiivinen | — |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin demo-seura |

**SJK-huomio:** Ensimmäinen seura jolla tyttöjoukkue mukana. Tyttöjen PHV-kaava (Mirwald) eri parametrit — tarkistettava Sprint 5:ssä.

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
```

---

## Sivuarkkitehtuuri — tila 2026-04-09

| Tiedosto | Rooli | GitHub | Viimeisin muutos |
|---|---|---|---|
| `TalentMaster_VP_v18.html` | vp | ✅ | Valmentajat-tabi, harjoitteluseuranta, kortit grid |
| `TalentMaster_Master_v9.html` | valmentaja | ✅ | — |
| `TalentMaster_Seura.html` | seurasihteeri/utj/vp | ✅ | UTF-8 korjattu |
| `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ | v4-logiikka, Stage, fiilinki-lukitus ⚠ lag-bugi |
| `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ | Toimii KPV:llä |
| `TalentMaster_Rekisterointi_Suostumus.html` | huoltaja | ✅ | fi/sv/en kielituki |
| `TalentMaster_Kortit.html` | pelaaja | ✅ | FIRE/ICON/MILESTONE/TOTY + WOW |
| `TalentMaster_Vanhempi.html` | huoltaja | ✅ | — |
| `TalentMaster_UTJ_v1.html` | urheilutoimenjohtaja | ✅ | Kasvattisuppilo |
| `TalentMaster_Admin.html` | super_admin | ✅ | — |
| `TalentMaster_ADAR_Koulutus.html` | valmentaja | ✅ | — |
| `TalentMaster_Koukutus.html` | markkinointi | ⏳ PENDING | — |
| `TalentMaster_Valmentaja_Matriisi.html` | koulutus | ⏳ PENDING | — |
| `TalentMaster_Pelihavainto_Demo.html` | demo | ⚠ EI GitHubissa | Palloliiton offline-demo |

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
diag: '🔄 Kiertoketju'   // korvaa SL+FL
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

## Testidatan tuontirakenne (UUSI 2026-04-09)

### Excel-pohja: `TalentMaster_Testidatan_Tuontipohja.xlsx`
```
0_OHJEET           — VP:n käyttöohjeet
1_Pelaajat         — perustiedot + PHV-data
2_HH_Testit        — nopeus / ketteryys / voima / tekniikka / kestävyys
3_Harjoitettavuus  — pisteet 1-3, FLEI% automaattinen
4_Tekniikkakilpailut — syöttö + pujottelu + ponnauttelu
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

## Security Rules

```
super_admin        → kaikkeen
vp                 → oma seura, kaikki
valmentaja         → luku oma seura, kirjoitus havainnot/harjoitukset
urheilutoimenjohtaja → aggregoitu data, ei yksilödata
fysioterapeutti    → vammat strict
pelaaja            → oma profiili + kirjaukset/{pvm}
vanhempi           → lapsen profiili pelkistetysti
anonyymi           → vain suostumusTila=='odottaa'
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

## Kriittiset tunnetut ratkaisut (26 kpl)

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

---

## Avoimet bugit (2026-04-09)

| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Pelaaja-sivu lagaa | TalentMaster_Pelaaja_v1.html | 🔴 |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v1.html | 🟡 |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 |

---

## Sprint-suunnitelma

### Sprint 4 (käynnissä)
- [x] VP v18: Valmentajat-tabi yhdistetty
- [x] VP v18: Harjoitteluseuranta + suodatin
- [x] VP v18: Valmentajakortit grid
- [x] SJK pilottiin (U15P + U14/15T + talentit)
- [x] Excel-tuontipohja (testit + kartoitus + tekniikka)
- [ ] Pelaaja-sivu lag-bugi
- [ ] SJK VP-tunnukset + joukkueet
- [ ] Excel → Firestore tuontityökalu
- [ ] Palloliiton laukausstatistiikka-linkki kalenteri-tapahtumaan

### Sprint 5
- [ ] Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
- [ ] Pelihavainto Taso 2 (pelaajan itsearviointi)
- [ ] Suostumuslomakkeet SJK:lle (kun data OK)
- [ ] Tyttöjen PHV-kaava (Mirwald eri parametrit)

### Sprint 6-8
- [ ] Pelihavainto Taso 3 (IDP-kytkös + FLEI-korrelaatio)
- [ ] AI Behavioural Science -agentti
- [ ] Milestone-kortit Firestoresta

---

## Palloliiton yhteistyö (2026-04-09)

**Palaveri Head of Talent:** 2026-04-09
**Positioning:**
- Myeway = passiivinen dashboard (kerää dataa, paljon lukuja ja analyysejä, mutta ei johda toimenpiteisiin) vaikea käyttää
- TalentMaster = aktiivinen kehitystyökalu (ajaa toimintaa)

**TM:n uniikki lisäarvo:**
- Yhdistää pelisuorituksen biologiseen ikään + FLEI + IDP
- Mikään olemassa oleva järjestelmä ei tee tätä
- Laukauskarttaa ei rakenneta — linkki Palloliiton BI:hin riittää

**Pilotti:** 8 seuraa, SJK laajentaa tyttöihin
