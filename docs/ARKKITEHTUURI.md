# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-04-05

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

---

## Firebase-projekti

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Firestore sijainti:** `eur3` multi-region
- **Super Admin:** `talentmasterid@gmail.com` (UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`)

**ABSOLUUTTINEN PERIAATE:** Super Adminilla on aina pääsy kaikkeen.
Tämä ei saa koskaan rikkoutua koodipäivityksissä.

---

## Firestore-tietokantarakenne (täydellinen)

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/                          ← fcl, kpv, palloiirot, yvies, sjk, grifk
    id, nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    ominaisuudet[], roolit[]
    max_pelaajia, tilastot{}
    tavoiteprofiili{}                 ← seuran valmennuslinjan tavoitedimensiot
    tmTaso: 'perustaso'|'kehitystaso'|'huipputaso'
    palloliittoKori: '1'|'2'|'3'     ← vain informatiivinen, TM näyttää
    luotu

    joukkueet/{joukkueId}

    kayttajat/{kayttajaId}            ← seuran käyttäjät + roolit + custom claims
      uid, email, etunimi, sukunimi
      rooli, seuraId
      joukkue, joukkueet[]
      aktiivinen, luotu, luonut_uid

    pelaajat/{pelaajaId}/
      etunimi, sukunimi, syntymaaika
      palloID, seuraId
      joukkue: string                 ← ensisijainen (yhteensopivuus)
      joukkueet: []                   ← kaikki joukkueet (uusi rakenne)
      suostumusTila: 'odottaa'|'annettu'
      tila: 'aktiivinen'|null
      huoltajaEmail
      biologinen_ika{}                ← Mirwald 2002 -laskenta
      phv_tila: 'PH'|'KV'|'normaali'
      flei_profiili{}                 ← LAI/TCI/MTI/IVI + kokonaisindeksi
      tki{}                           ← TKI-indeksi versioittain
      tsi{}                           ← TSI: SM-juoksu − SM-pallo
      tuotu, tuoja, muokattu, muokkaajaUid

      kirjaukset/{pvm}/               ← omatoimiharjoitekirjaukset
        tyyppi: 'T'|'D'|'S'|'P'
        tehty: bool
        kesto_min, rpe: 1-10
        aika: 'ilta'|'aamu'|'paiva'
        fiilinki: 1-5

      testit/{testiId}                ← H-H ominaisuustestit
      kartoitukset/{kartoitusId}      ← Harjoitettavuuskartoitukset U12/U15/U19
      tekniikka/{kilpailuId}          ← Tekniikkakilpailutulokset + TKI-laskenta
      adar/{adarId}                   ← Game IQ / ADAR (4 vaihetta + pisteet)
      havainnot/{havaintoId}          ← Valmentajan kenttähavainnot + dimensiopisteet
      idp_kausi/{kaudenId}            ← IDP-kausikohtaiset tavoitteet ja tila
      idp_taso/{tasomenId}            ← IDP-taso (perus/laajennettu/talent)
      ketjut/{ketjuId}                ← Liikeketjupisteet per testikerros
      streak/{streakId}               ← Omatoimiharjoittelun streak-seuranta
      kuorma/{kuormaId}               ← RPE ja kuormaseuranta (A:C-suhde)
      vammat/{vammaId}                ← Kuntoutusdata (arkaluonteinen — strict rules)

      omatoimi_ohjelmat/{ohjelmaId}/  ← generoidut omatoimiohjelmat
        luotu, ikäluokka
        flei_profiili{}, heikoin_ketju, phv_tila
        harjoitteet[]:
          { tyyppi: 'D'|'S'|'P'|'T', ketju, nimi, kuvaus, kesto_min, toistot }
        seuraava_tarkistus            ← 6 viikkoa luomisesta

      d3_profiili/{profiiliId}/       ← Psykologinen dimensio (Fulham-integraatio)
        luotu, kausi
        inner_drive: 1–5
        coachability: 1–5
        resilience: 1–5
        focus: 1–5
        emotional_control: 1–5
        arviointilahde: 'self'|'haastattelu'|'coach_obs'
        valmentajan_narratiivi: ""

    // Joukkuetason kokoelmat (valmentajan kirjaukset → VP näkee)
    harjoitukset/{pvmId}              ← RPE + läsnäolot + ohjelma + kommentti
    havainnot/{havaintoId}            ← ADAR + tunnisteet + onXFactor/onHiddenGem
    merkinnät/{merkintaId}            ← pikamerkintä (treeni/asenne/kehitys/tiimi)
    testit/{testiId}                  ← joukkuetason mittaustulokset
    kartoitukset/{kartoitusId}        ← joukkueen harjoitettavuuskartoitukset
    tekniikka/{kilpailuId}            ← joukkueen tekniikkakilpailutulokset
    adar/{adarId}                     ← joukkueen ADAR-arvioinnit
    kuorma/{kuormaId}                 ← joukkueen RPE ja kuormaseuranta
    vammat/{vammaId}                  ← joukkueen kuntoutusdata

    identiteettiprofiili/{kaudenId}/  ← seuran aggregoitu kehitys per kausi
      kausi: "2026"
      ikäluokat: {
        "U10-U12": { d1: 62, d2: 58, d3: 45, d4: 41, d5: 55, tki: 67, n: 34 },
        "U13-U15": { d1: 71, d2: 64, d3: 52, d4: 58, d5: 61, tki: 72, n: 28 },
      }
      vs_tavoiteprofiili: { d1: +4, d2: -6, d3: -12, d4: +3, d5: +1 }
      laskettu: timestamp

kirjaukset/                           ← Vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/
```

---

## Sivuarkkitehtuuri (vahvistettu 2026-04-05)

| Tiedosto | Rooli | Tila |
|---|---|---|
| `TalentMaster_VP_v18.html` | vp | ✅ rakennettu, PENDING deploy |
| `TalentMaster_Master_v9.html` | valmentaja + kenttäroolit | ✅ rakennettu 2026-04-04, PENDING deploy |
| `TalentMaster_Seura.html` | seurasihteeri, urheilutoimenjohtaja, vp, super_admin | ✅ päivitetty 2026-04-04, PENDING deploy |
| `TalentMaster_Vanhempi.html` | huoltaja | ✅ |
| `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ |
| `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ |
| `TalentMaster_Rekisterointi_Suostumus.html` | anonyymi/huoltaja | ✅ |

### GitHub Pages URL:t
```
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_VP_v18.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v9.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_IDP_Kortti_v3.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html
```

---

## Cloud Functions — 6 deployattu (europe-west1)

| Funktio | Tarkoitus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ setCustomUserClaims lisätty 2026-04-04 |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit vanhemman/pelaajan sivulle | ✅ |
| `tasoHaeSeuranOttelut` | Ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU — vaatii Cloud Scheduler Admin SA:lle |

**KRIITTINEN:** `luoKayttaja` kutsuu nyt `auth.setCustomUserClaims(uid, { rooli, seuraId })`.
Ilman tätä Firestore Rules ei tunnista valmentajaa (`request.auth.token.rooli` on tyhjä).

---

## Testikerrosjärjestelmä — testit_indeksit.js

Tiedosto valmis (1210 riviä), PENDING deploy GitHubiin.

### Kolme testikerrosta

| Kerros | Sisältö | Ikä | Indeksi |
|---|---|---|---|
| 1 — Tekniikkakilpailut | Ponnauttelu, syöttö, pujottelu, kuljetus-laukaus, pituuspotku | U8–U13 | TKI 0–100 |
| 2 — H-H ominaisuustestit | 30m, 5m, kasirata, CMJ, SM-juoksu, SM-pallo, pujottelu, MAS, syöttöpenkki | U10–U19 | OVR 0–100 + EI + FVP + TSI |
| 3 — Harjoitettavuuskartoitus | Voimatestit, liikkuvuus, liiketaidot | U10–U19 | FLEI 0–100% |

### Mittareiden laskentakaavat

**TKI — Tekninen taitoindeksi**
```
TKI-Perus    = (Syöttö×0.45) + (Pujottelu×0.35) + (Ponnauttelu×0.20)  ← kaikki seurat
TKI-Laajennettu = (Syöttö×0.40) + (Pujottelu×0.30) + (SM-pallo×0.30) ← kehitys+
→ normalisoitu 0–100 biologiseen ikään (Liikanen & Törmä 2025)
```

**TSI — Tekniikka-nopeus-indeksi**
```
TSI = SM-pallo − SM-juoksu (sekunteina)
≤0.5s = erinomainen | ≤1.0s = hyvä | ≤1.5s = kehittyvä | >1.5s = prioriteetti
Kertoo: onko tekniikka pullonkaula suhteessa nopeuteen
```

**FLEI — Fascia Load Efficiency Index**
```
FLEI = LAI (35%) + TCI (25%) + MTI (20%) + IVI (20%) → 0–100
0–20 matala riski | 21–40 pieniä kehitystarpeita |
41–60 kohonnut riski | 61–80 korkea riski (kuorma −20%) | 81–100 kriittinen
```

**EI — Elastisuusindeksi**
```
EI = CMJ − SJ (cm)
Tavoite: U12 ≥3cm | U14 ≥5cm | U18+ ≥8cm
SSC-hyödyntämiskyky — matala EI = kehitä eksentrinen + plyometria
```

**FVP — Voima-nopeus-profiili**
```
FVP = 5m / (30m/6)
<0.90 = nopeusprofiili | 0.90–1.10 = tasapainoinen | >1.10 = voimaprofiili
```

**OVR — Overall Rating**
```
OVR = painotettu keskiarvo H-H tasoista (taso 1–5 per testi) → 0–100
Painotukset: 30m×1.5, 5m×1.5, sm_pallo×1.3, pujottelu×1.3, kasirata×1.2, cmj×1.2, mas×1.0, syottopenkki×1.0
```

**Soveltava testaus:** `kattavuus`-kenttä (0–1) aina tuloksen rinnalla. Indeksit lasketaan niistä testeistä joita on tehty.

### Seuran identiteettiprofiili
Aggregoitu kausikohtainen kuva seuran pelaajien kehityksestä.
Kaikkien pelaajien dimensiopisteet per ikäluokka → vertaus seuran `tavoiteprofiiliin` → delta tallennetaan `identiteettiprofiili/{kaudenId}`:iin. Lasketaan 2× kaudessa.

---

## Omatoimiharjoitegeneraattori

| Tyyppi | Milloin | Kesto | Periaate |
|---|---|---|---|
| T — Tekninen | Joka päivä, MYÖS LEPOPÄIVÄT | 15–30 min | Kultaikkuna — päivittäinen pallokosketus |
| D — Päivittäinen | Joka päivä | 5–10 min | Liikkuvuus + hermoston nopea toiminta |
| S — Täydentävä | Vapaa-/lepopäivä | 15–20 min | AINA heikoin liikeketju (EI profiiliin) |
| P — Progressiivinen | 2–3×/vk | 20–30 min | 6 viikon nousujohteinen jakso |

**Ikärajoitukset:**
- U8–12: vain T + D (ei intensiivistä intervallia)
- U12–15: T + D + S + P (kehonpaino, ei maitohapollista)
- U15+: kaikki tyypit täydellä jaksotuslogiikalla
- PHV-huippu: P-harjoitteen intensiteetti MAX 60% ikäluokasta riippumatta

---

## D3-psykologinen dimensio (Fulham FC -integraatio)

Viisi ominaisuutta jotka kytkeytyvät suoraan ADAR-mittareihin:

| Ominaisuus | ADAR-kytkös | Firestore-kenttä |
|---|---|---|
| Inner Drive | DVI-pohja | `inner_drive` |
| Coachability | DVI — reagointi palautteeseen | `coachability` |
| Resilience | Re-assess — palautumisaika virheestä | `resilience` |
| Focus | Assess — skannaustaajuus | `focus` |
| Emotional Control | Act — tekninen laatu paineessa | `emotional_control` |

Kolmitasoinen profilointi: itsearviointilomake + haastattelu + valmentajan observointi.
Tehdään 2× kaudessa. Alkaa U13-ikäluokasta.

---

## Security Rules -logiikka

- **Super-admin:** lukee ja kirjoittaa kaiken kaikista seuroista
- **VP:** lukee ja kirjoittaa oman seuransa kaiken datan
- **Valmentaja:** lukee oman seuransa datan, kirjoittaa havainnot + harjoitukset + merkinnät
- **Fysioterapeutti:** lukee + kirjoittaa `vammat/{vammaId}` (strict)
- **Pelaaja:** lukee oman profiilinsa — ei kirjoitusoikeutta testituloksiin
- **Vanhempi:** lukee lapsen profiilin pelkistetysti
- **Ei kirjautunut:** ei pääsyä mihinkään

**KRIITTINEN:**
- `vammat`-kokoelma: vain fysioterapeutti + VP + super_admin
- `d3_profiili`-kokoelma: pelaaja omistaa oman datansa — johto näkee vain aggregaatin
- Anonyymi suostumuslomake: `allow read` kun `suostumusTila == 'odottaa'` + `allow update` vain suostumuskentille

---

## Custom Claims -roolit

```javascript
// Kaikki roolit (underscore-muodossa — CANONICAL)
super_admin | vp | seurasihteeri | urheilutoimenjohtaja |
valmentaja | talenttivalmentaja | fysiikkavalmentaja |
fysioterapeutti | testivastaava | pelaaja | vanhempi

// normalizeRooli() tm_nav.js:ssä hoitaa camelCase → underscore muunnoksen
```

`luoKayttaja` asettaa custom claims: `auth.setCustomUserClaims(uid, { rooli, seuraId })`
Pakollinen — ilman tätä Firestore Rules ei tunnista käyttäjää.

---

## Pakettitasot

| Paketti | Roolit | Max pelaajia | Ominaisuudet |
|---|---|---|---|
| Perustaso | VP, valmentaja, testivastaava | 100 | Rekisteri, TKI-Perus, FLEI, harjoitelogiiikka |
| Kehitystaso | + talenttivalmentaja, fysiikkavalmentaja | 300 | + H-H OVR, biologinen ikä, ADAR, IDP, D3-profiili |
| Huipputaso | Kaikki roolit | Rajaton | + identiteettiprofiili, klinikka, VNE, AI-agentti |

---

## Kriittiset tunnettuja ratkaisuja

1. Firestore Rules: `allow create` JA `allow update` — `set({merge:true})` käyttää update jos doc olemassa
2. Syntymäpäivän parsinta: `Date.UTC(y, m-1, d)` — EI `new Date(string)`
3. `onAuthStateChanged` loop: estetty `_kirjautuminenKesken`-flagilla
4. SheetJS ei kirjoita tyylejä ilman Pro — käytä openpyxl server-side
5. Näkymien vaihto: `style.display = 'none'` EI classList (CSS specificity-ongelma)
6. ÄLÄ testaa VP-dashboardia ja Admin-näkymää samassa selaimessa (yksi auth/projekti/selain)
7. `onSnapshot`-kuuntelijat siivottava ennen `signOut()` — tm_nav dispatches `tm:logout`, kaikki näkymät lisää `window.addEventListener('tm:logout', () => { unsubscribe && unsubscribe(); })`
8. GitHub Pages Fastly CDN: `?v=N` cache-busting jokaisen latauksen jälkeen
9. Roolinimet: `super_admin` (underscore) — `normalizeRooli()` hoitaa vanhat
10. openpyxl pakollinen Excel DataValidation-pudotuslistoille — SheetJS ei tue
11. Testaus aina GitHub Pages -URL:lla — file:// estää Firebase-kirjoitukset
12. `setCustomUserClaims` pakollinen `luoKayttaja`-funktiossa — ilman tätä Rules ei tunnista valmentajaa
13. Soveltava testaus: `kattavuus`-kenttä (0–1) tallennetaan aina indeksin rinnalla
14. Rules-deploy saa 403 GitHub Actionsista — käytä Firebase-konsolia suoraan
15. Suostumuslomake: kutsuflow=`.update()` 5 kentällä, uusi rekisteröinti=`.set()` kaikilla
