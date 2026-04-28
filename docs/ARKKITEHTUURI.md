# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-04-28

---

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon pelaajankehitykseen. Asiakas on seura, ei yksittäinen valmentaja.

**Filosofia:** "Pelaaja ensin, hallinto vahvistaa" — järjestelmä rakentuu lapsen kehitystarpeesta ylöspäin.

**Kolme ydinlausumaa:**
1. Millaisia pelaajia seuranne kehittää?
2. Miten tiedätte valmentajien toteuttavan coaching linea?
3. Kasvavatko pelaajanne — ja mistä tiedätte?

---

## Seitsemän kerroksen arkkitehtuuri

```
Kerros 1: Pelaaja / Pelaaja v7     ← pelaajan arjen työkalu
Kerros 2: Valmentaja / Master v9   ← kenttähavainto + ADAR
Kerros 3: Game IQ / D4 / ADAR     ← kognitiivinen kehitys
Kerros 4: IDP-kortti v3            ← yksilöllinen kehityskortti
Kerros 5: IDP-aktivointi (3 reittiä) ← aktivointilogiikka
Kerros 6: VP / johtamisjärjestelmä ← seuran johtaminen
Kerros 7: Fyysinen → teknis-taktinen ← lopullinen tavoite
```

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla, IIFE-pattern) | GitHub Pages (Fastly CDN ~10min) |
| Tietokanta | Firebase Firestore | `eur3` multi-region |
| Autentikointi | Firebase Auth + Custom Claims | Email/Password + anonyymi |
| Cloud Functions | Node.js, europe-west1 | Firebase Blaze |
| Excel-lukeminen | SheetJS 0.18.5 (client-side, vain luku) | Selain |
| Excel-generointi | openpyxl (server-side, Cloud Function) | Firebase |
| Sähköposti | Nodemailer + Gmail | Cloud Functions |
| Harjoitelogiikka | harjoitelogiikka_v4.js (1887 riviä) | GitHub Pages |
| Kielimoduuli | tm_lang.js (fi/sv/en, 144 käännöstä) | GitHub Pages |
| Normitaulukot | tm_eerikkila_normit.js | GitHub Pages |

**KRIITTINEN:** `firebase.app().functions('europe-west1')` — `firebase.functions()` → us-central1 (väärä, hiljaa epäonnistuu).

---

## Firebase-projekti

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Firestore:** `eur3` multi-region
- **Functions:** `europe-west1`
- **Super Admin:** `talentmasterid@gmail.com` (UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`)
- **Super admin tunnistus:** `adminSnap.exists` — EI custom claims -arvoista

**ABSOLUUTTINEN PERIAATE:** Super Adminilla on aina pääsy kaikkeen. Ei saa koskaan rikkoutua.

---

## Pilottiseurat (10 kpl) — tila 2026-04-28

| SeuraId | Seura | Tila | Huomio |
|---|---|---|---|
| `fcl` | FC Lahti Juniorit | ✅ aktiivinen | — |
| `kpv` | KPV Kokkola | ✅ aktiivinen | Topias Koskela, PIN 9278, testattu live |
| `palloiirot` | Pallo-Iirot | ✅ aktiivinen | — |
| `yvies` | Ylöjärven Ilves | ✅ aktiivinen | — |
| `sjk` | SJK Juniorit | ✅ laajennettu | U15P + U14/15T + talenttipelaajat, 1. tyttöjoukkue |
| `grifk` | GrIFK | ✅ aktiivinen | sv-kieli |
| `vifk` | VIFK | ✅ aktiivinen | sv-kieli |
| `hjk` | HJK Juniorit | ✅ aktiivinen | Head of Talent -tuote |
| `eps` | EPS (Espoon Palloseura) | ✅ tunnukset | Heini, Teams-puhelu PENDING |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin demo-seura |

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
      nimi, ikaryhma, vuosi, jarjestys

    kayttajat/{uid}
      uid, email, etunimi, sukunimi
      rooli, seuraId, joukkueet[]
      claimsAsetettu, aktiivinen

    pelaajat/{pelaajaId}/
      etunimi, sukunimi, nimi
      sukupuoli: "M"|"N"           ← EI "poika"/"tyttö"
      syntymaaika: Timestamp
      syntymaVuosi: number         ← numero erikseen, PHV-laskentaan
      joukkue: string              ← display name, EI ID
      joukkueet: string[]
      seuraId: string
      pelipaikka: string           ← "KH", "TK", "HY" jne.
      positio: string              ← yhteensopivuus (= pelipaikka)
      palloID: string
      huoltajaEmail: string        ← AINA .toLowerCase()
      pin: string                  ← 4 numeroa, pelaajan kirjautuminen
      suostumusTila: 'odottaa'|'annettu'
      tila: 'aktiivinen'
      kaytettavyys: 'aktiivinen'|'loukkaantunut'|'kuntoutuksessa'|'tauko'
      biologinen_ika{}             ← Mirwald 2002
      phv_tila: 'PH'|'KV'|'AN'

      // FLEI — harjoitettavuuskartoitus
      // Raakadata 1.0–3.0, normalisointi (arvo-1)/2×100 = %
      sbl, sfl, ll, diag, dfl: number
      flei_viimeisin: number       ← 0–100%, lasketaan koodissa
      flei_ketjut{}                ← {SBL, SFL, LL, DIAG, DFL} 0-100 (isolla)

      // HuHe/Eerikkilä-testit — AINA raakadata, taso lasketaan lennossa
      huhe_5m_s, huhe_10m_s, huhe_20m_s, huhe_30m_s: number
      huhe_kasirata_s, huhe_smjuoksu_s, huhe_smpallo_s: number
      huhe_cj_cm, huhe_sj_cm: number
      huhe_mas_ms: number
      huhe_pituus_cm, huhe_paino_kg, huhe_istumapituus_cm: number

      // Tekniikka (raakadata, sekunteja)
      tekniikka_pujottelu_s, tekniikka_syotto_s: number

      // 5D-arviointi
      d1, d2, d3, d4, d5: number  ← 0–100
      taso, xp, streak: number
      pelaajaProfiili: 'Railgun'|'Maestro'|'Shadowstep'|'Titan'

      kirjaukset/{pvm}/            ← 'YYYY-MM-DD'
        tyyppi: 'T'|'D'|'S'|'P'
        tehty: bool, kesto_min, rpe: 1-10
        aika: 'ilta'|'aamu'|'paiva'
        fiilinki: 1-5
        fiilinki_paivitetty: ISO-ts  ← lukitusavain
        xp, konteksti, paivitetty

      havainnot/{havaintoId}       ← valmentajan kenttähavainnot
      adar/{adarId}                ← Game IQ (EI havainnot-kokoelmaan)
      idp_kausi/{kaudenId}
      testit/{testiId}             ← H-H ominaisuustestit
      kartoitukset/{kartoitusId}   ← harjoitettavuus, FLEI
      tekniikka/{kilpailuId}       ← tekniikkakilpailut
      pelihavainnot/{otteluId}/    ← Sprint 5
      mentoroinnit/{id}/           ← VP:n käynnit
      omatoimi_ohjelmat/

    kutsut/{kutsuId}
    tapahtumat/

testitapahtumat/    ← OIKEA NIMI (EI 'tapahtumat')
kirjaukset/         ← vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/

players/{playerId}  ← Solo-pelaajat (EI seurahierarkiassa)
  nimi, synVuosi, synKuukausi
  pp, kokemus, treeni, ketju
  playerCode: 'TMP-XXXX'
  seuraId: null → täytetään kun seura liittyy
```

---

## Testipelaaja: Topias Koskela (KPV)

```
Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I  ← KAKSI u:ta!
PIN: 9278   (testattu 2026-04-28, isDemoUser: false)
sukupuoli:     "M"
syntymaVuosi:  2013  (syntymäpäivä: 15.3.2013)
sbl: 2.16  sfl: 2.30  ll: 2.10  diag: 2.40  dfl: 2.20
flei_viimeisin: 62
Heikoin ketju: LL (55%) → harjoitteet ohjautuvat LL-ketjulle
```

---

## Sivuarkkitehtuuri — tila 2026-04-28

### Seurajärjestelmä

| Tiedosto | Rooli | GitHub | Huomio |
|---|---|---|---|
| `TalentMaster_VP_v18.html` | vp | ✅ | Valmentajat-tabi, harjoitteluseuranta, kortit grid |
| `TalentMaster_Master_v9.html` | valmentaja | ✅ | — |
| `TalentMaster_Seura.html` | seurasihteeri/utj/vp | ✅ | Muokkausmodaali laajennettu 2026-04-28 |
| `TalentMaster_Pelaaja_v7.html` | pelaaja | ✅ v=24 | Syntymäpäiväyllätys, toimii |
| `TalentMaster_Vanhempi.html` | huoltaja | ✅ | ⚠️ Nimi kovakoodattu (P3 auki) |
| `TalentMaster_IDP_Kortti_v3.html` | val/pel/van | ✅ | Toimii KPV:llä |
| `TalentMaster_Rekisterointi_Suostumus.html` | huoltaja | ✅ | fi/sv/en |
| `TalentMaster_Kortit.html` | pelaaja | ✅ | FIRE/ICON/MILESTONE/TOTY + WOW |
| `TalentMaster_UTJ_v2.html` | utj | ✅ | DNA, CSI, 6 välilehteä |
| `TalentMaster_Admin.html` | super_admin | ✅ | — |
| `TalentMaster_ADAR_Koulutus.html` | valmentaja | ✅ | — |
| `TalentMaster_Valmentaja_Matriisi.html` | koulutus | ✅ | 5-tabi coaching tool |
| `TalentMaster_Pelihavainto_Demo.html` | demo | ⚠️ EI GitHubissa | Palloliiton offline-demo |

### Solo-versio (TalentMaster Player™)

| Tiedosto | GitHub | Huomio |
|---|---|---|
| `TalentMaster_Player_Home.html` | ✅ | Splash → nimi → syntymäaika → kortti |
| `TalentMaster_Solo_Profiili.html` | ✅ | Tkk-tulokset, kotimittarit, profiili |
| `TalentMaster_Solo_Arviointi.html` | ⏳ PENDING | Alkuarviointi 3-kerrosta |
| `TalentMaster_Kortti_Demo.html` | ✅ | Starter/Sharp/Elite |

### JavaScript-kirjastot

| Kirjasto | Kuvaus | Tila |
|---|---|---|
| `harjoitelogiikka_v4.js` | leikkija/rakentaja/showcase, DIAG, Stage 1–5 | ✅ |
| `tm_eerikkila_normit.js` | Eerikkilä-normit P10–M / T10–N, 11 testiä | ✅ 2026-04-28 |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | ✅ |
| `tm_testipankki.js` | 64 testiä, 8 protokollaa | ✅ |
| `tm_ketju_matriisi.js` | fascia ↔ testi ↔ pallotekniikka | ✅ |
| `tm_lang.js` | fi/sv/en, 144 käännöstä | ✅ |
| `tm_import.js`, `tm_empty_state.js` | Import + tyhjä tila | ✅ |
| `tm_bioika.js` | Biologinen ikä, Mirwald 2002 | ✅ |

---

## Cloud Functions — 7 deployattu (europe-west1)

| Funktio | Tarkoitus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit + salasananollaus | ✅ |
| `tasoHaeSeuranOttelut` | TASO API | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU |

---

## TalentMaster 5D Framework™

| Dimensio | Avain | Paino | Mittarit |
|---|---|---|---|
| Physical | D1 | **40%** | Sprint · PHV (Mirwald 2002) · FLEI · MAS · COD |
| Technical | D2 | **25%** | First touch · passing · tekniikkakilpailut · daily T |
| Psychological | D3 | **15%** | Growth mindset · FLEI trainability · Dweck 2006 |
| Cognitive | D4 | **10%** | ADAR · space reading · Game IQ |
| Social | D5 | **10%** | SDT (Deci & Ryan) · coachability · team role |

**OVR-kaava:** `(D1×0.40)+(D2×0.25)+(D3×0.15)+(D4×0.10)+(D5×0.10)`
**RAE-korjaus:** Q1 ×0.92 / Q2 ×0.96 / Q3 ×1.02 / Q4 ×1.06
**DVI:** DVI > +0.15 = X-Factor / DVI < 0 korkea raw = Hidden Gem at risk

---

## FLEI — 5 faskiaketjua (pysyvä, Wilke 2016)

| Ketju | Avain | Emoji | Firestore-kenttä |
|---|---|---|---|
| Vauhtiketju | SBL | ⚡ | `sbl` (1–3) |
| Lähtöketju | SFL | 🦵 | `sfl` (1–3) |
| Sivuketju | LL | ↔️ | `ll` (1–3) |
| Kiertoketju | DIAG | 🔄 | `diag` (1–3) — korvaa SL+FL pysyvästi |
| Hallintaketju | DFL | 🏗️ | `dfl` (1–3) |

**Normalisointi:** `(raaka_1_3 - 1) / 2 * 100` = prosentti 0–100
**Default:** `2.0` (50%) = ikäluokan normi
**S-harjoite** = aina heikoimmalle ketjulle (EI profiiliin)
**flei_ketjut{}** tallentuu isolla: `{SBL, SFL, LL, DIAG, DFL}` (0–100)

---

## Eerikkilä-normitaulukot (`tm_eerikkila_normit.js`)

Lähde: Eerikkilä–Palloliitto 2024. **Tallennetaan aina raakadata, taso lasketaan lennossa.**

```javascript
eerikkilaTaso(arvo, testi, ika, sukupuoli) // → 1–5 (tai 1–3 tekniikalle)
eerikkilaProfiilit(pelaaja)                // → {nopeus_30m: 3, hyppy_cj: 4, ...}
laskeEI(cj_cm, sj_cm)                     // elastisuusindeksi (CMJ−SJ)
laskeFVP(n5m_s, n30m_s)                   // voima-nopeus-profiili
laskeTSI(smjuoksu_s, smpallo_s)           // tekniikka-nopeus-indeksi
```

| Testi | Yksikkö | Asteikko | Huom |
|---|---|---|---|
| nopeus_5m, 10m, 20m, 30m | sekuntia | 1–5 | pienempi=parempi |
| kasirata, sm_juoksu, sm_pallo | sekuntia | 1–5 | pienempi=parempi |
| hyppy_cj (CMJ) | cm | 1–5 | suurempi=parempi |
| mas | m/s | 1–5 | suurempi=parempi |
| pujottelu, syotto | sekuntia | **1–3** | pienempi=parempi |

---

## Pelaajan app — arkkitehtuuri (v7, v=24)

### Kirjautuminen
```
PIN → seurat/{seuraId}/pelaajat WHERE pin=={pin} → _pelaaja muistiin
```

### Avaintoiminnot
- `_kaynnistaAppUI()` — renderöi KOTI, kutsuu harjoitelogiikan
- `_laskeFlei(p)` — laskee FLEI-prosentit raakadatasta (sbl/sfl/ll/diag/dfl)
- `_heikoinKetju()` — palauttaa heikoimmn ketjun (S-harjoitteen perusta)
- `_tarkistaSignaalit()` — X-Factor / Hidden Gem -tarkistus
- `_tallennaKirjaus()` — tallentaa kirjauksen Firestoreen
- `_onkoSynttari(p)` — tarkistaa syntymäpäivä, laukaisee yllätyksen

### Syntymäpäiväyllätys (lisätty 2026-04-28)
```javascript
_onkoSynttari(p)     // syntymaaika.getMonth()+getDate() == tänään
_synttariKonfetti()  // Canvas: 60 palaa, 2s animaatio
_synttariBanner(p)   // Banneri: nimi, ikä, bonustehtävä (3 satunnaista)
```
**KRIITTINEN:** Käyttää **string concatenationia** (`+`) — EI nested template literaaleja.
Nested backtick kaataa koko JavaScript-parserin → musta ruutu.

### Piilotettu scene-bar (sBar, `display:none`)

Kehitysnavigaatio — ei näy normaalikäyttäjälle:

| Nappi | Nimi | Tila |
|---|---|---|
| D · PIN | PIN-kirjautuminen | ✅ Tuotanto |
| A1 | KOTI (normaali) | ✅ Tuotanto |
| A2 | Signal / CTA-versio | 🔵 Konsepti |
| A3 | Today-Grid | 🔵 Konsepti |
| B | Harjoitus + valmentajavideo | 🔵 Konsepti |
| C | FIFA-tyylinen pelaajakortti (OVR 87) | 🔵 Konsepti, ei Firebase |
| G | Haptics / ääni | 🔵 Konsepti |
| H | Offline / Service Worker | 🔵 Konsepti |
| I | Vanhempi: viikkotarina+kalenteri+kehuviesti | 🔵 Konsepti |
| J | Oma treeni | 🔵 Konsepti |
| K | Haaste | 🔵 Konsepti |

---

## Seurahallinta — arkkitehtuuri (Seura.html)

### Roolit jotka pääsevät sisään
`superadmin`, `super_admin`, `vp`, `seurasihteeri`, `urheilutoimenjohtaja`

### Muokkausmodaali (päivitetty 2026-04-28)
**VP + sihteeri:** etunimi, sukunimi, syntymäpäivä (→ syntymaVuosi auto), sukupuoli (M/N),
joukkue, pelipaikka, huoltajaEmail, palloID.
**Super admin lisäksi:** sbl, sfl, ll, diag, dfl (1–3, flei_viimeisin lasketaan auto).

### PIN-hallinta
```javascript
luoPelaajaPIN(pelaajaId)      // generoi 4-numeroisen → syötekenttään
tallennaPelaajaPIN(pelaajaId) // validoi → duplikaattitarkistus → Firestore
```
**KRIITTINEN:** `await user.getIdToken(true)` pakollinen ennen kirjoitusta.
Auth-sessio voi vanhentua → `permission-denied` ilman tätä.

---

## Harjoitelogiikka v4

### 5 liikeketjua — DIAG pysyvästi (Wilke 2016)
```
sbl → ⚡ Vauhtiketju
sfl → 🦵 Lähtöketju
ll  → ↔️ Sivuketju
diag → 🔄 Kiertoketju  (korvaa SL+FL pysyvästi)
dfl → 🏗️ Hallintaketju
```

### Kielitasot
```
leikkija  U8-12:  "leiki", "kokeile"
rakentaja U13-15: "tee näin" + perustelu
showcase  U16-19: termit + "mittaa" + "kirjaa"
```

### Stage-laskenta
```
harjoitettavuus_pisteet → Stage 1–5
PHV-rajoite: phv_tila==='PH' → max Stage 2
8-vk jakso: Pohja(+0) / Kehitys(+1) / Huipentuma(+2)
```

### T-harjoite — mesosykli (kalenteripohjainen)
```
Syys/Tammi:  Vastaanottaminen — Kaka-sarja
Loka/Helmi:  Dribbeli — Affelay-sarja
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

### TIPS (Ajax + TM-lisä)
```
T = Tekninen suoritus paineessa (D2)
I = Pelikuva — Game IQ (D4)
P = Persoona — intensiteetti (D3)
S = Suorituksen nopeus (D1+D4)
+ IDP-tavoitteen toteutuminen (TM-uniikki)
```

### Järjestys (EPPP-malli)
```
Valmentaja kirjaa 24h → Pelaaja arvioi 48h →
Pelaaja näkee valmentajan arvion VASTA oman jälkeen →
VP: molemmat + FLEI + PHV + bio-ikä + RAE → IDP päivittyy
```

---

## VP v18 — Valmentajat-tabi

```
tab: Valmentajat
├── 👤 Valmentajat-näkymä
│   ├── joukkue-grid korttimuoto
│   └── Klikkaus → _avaaValmentajaPopup() [GLOBAALI — EI nested]
└── 📊 Osaaminen-näkymä
    ├── ADAR-linkki
    ├── lataaHSSeuranta() — KPI-rivi + kriteeripalkistot + trendi SVG
    └── Per valmentaja + suodatin
```

---

## Solo-versio (TalentMaster Player™)

### Rekisteröitymisvirta
```
Splash → Nimi → Syntymäaika → FIFA-kortin paljastuminen → Profiili
```

### FIFA-kortti
```
⭐    Starter — sininen
⭐⭐  Sharp — kultainen
⭐⭐⭐ Elite — platina
PlayerCode: TMP-XXXX
```

Tallennetaan `players/{id}` (ei seurahierarkiassa). `seuraId: null` → täytetään kun seura liittyy.

---

## Avoimet rajapinnat — API-arkkitehtuuri

### Provider-agnostic AI (tm_ai.js)
```javascript
const TM_AI = {
  provider: 'anthropic', // 'openai' | 'anthropic' | 'gemini'
  async call(prompt, context) { ... }
};
// Kaikki AI-kutsut TM_AI.call() kautta — EI suoraa fetch() UI:ssa
```

### Firebase Cloud Function = pakollinen AI-proxy
API-avaimet EIVÄT koskaan selaimessa. Kaikki AI-kutsut Cloud Functionin kautta.

### AI-providerit
| Provider | Malli | Käyttötapaus |
|---|---|---|
| Anthropic | claude-sonnet-4 | Behavioural science -agentti |
| OpenAI | gpt-4o vision | Pelihavainto: kuva → ADAR-analyysi |
| OpenAI | whisper-1 | Äänikirjaus kentällä → Firestore |
| OpenAI | Assistants API | Pelaajan kehitysnarratiiivi (thread/pelaaja) |
| Google | Gemini | Vaihtoehto configista |

### Behavioural Science -agentti (Sprint 6–8)
```
Firestore-muutos → Cloud Function → Anthropic API → pelaajan näkymä
```
AI puhuu vain: putki vaarassa (3pv), streak-virstanpylväs (7/14/30pv), paluu tauolta.
Kielletty: painostaminen, päivittäiset viestit, punaiset varoitukset.

### UX-filosofia
- AI näkymätön kunnes relevantti — ei "AI-powered"-badgeja
- LLM-agnostinen — käyttäjä kokee vain tuloksen
- API-first design — data haettavissa myös ulkoa

---

## Design Studio (TalentMaster_Studio.html)

- UX Advisor (300 tok) + Senior Coder (8000 tok) — erilliset API-kutsut
- 24 pikanapia: First Login Flows (4 roolia), Pelaajan näkymä, Testit & Indeksit jne.
- Julkaistu claude.ai Artifact — ei GitHub Pages (CORS Anthropic API)

---

## Brändi-identiteetti (lukittu)

```
--carbon: #1C1C1A   (pääväri tumma)
--bone:   #F2EFE6   (pääväri vaalea)
--teal:   #1A7A5E   (aksentti, CTA)
--slate:  #8C8B83   (sekundäärinen teksti)
```
- **Display:** Cormorant Garamond
- **Body:** DM Sans
- **Logo:** kehä-SVG — 3 kehää + teal-piste + pystyviiva
- **Non-Negotiable:** Barlow Condensed poistettu kaikista tiedostoista

---

## Security Rules

```
super_admin    → kaikkeen aina
vp             → oma seura, kaikki
valmentaja     → luku oma seura, kirjoitus havainnot/harjoitukset
urheilutoimenjohtaja → aggregoitu data
fysioterapeutti → vammat strict
pelaaja        → oma profiili + kirjaukset/{pvm}
vanhempi       → lapsen profiili (resource.data.huoltajaEmail == auth.token.email)
anonyymi       → vain suostumusTila=='odottaa'
```

**onSuperAdmin()** hyväksyy 4 tapaa:
```javascript
request.auth.token.rooli == 'super_admin' ||
request.auth.token.rooli == 'superadmin' ||
request.auth.token.super_admin == true ||
exists(/databases/$(database)/documents/admins/$(request.auth.uid))
```

---

## Sprint-suunnitelma

### Sprint 4 (valmis — 2026-04-13)
- [x] VP v18: Valmentajat-tabi, harjoitteluseuranta, valmentajakortit
- [x] SJK pilottiin (U15P + U14/15T + talentit)
- [x] Excel-tuontipohja v4 (testit + kartoitus + tekniikka)
- [x] Solo-versio: onboarding + kortti + profiili
- [x] tm_pitch_en.html + Palloliitto_2026.pptx
- [x] UTJ_v2.html — UTJ-dashboard v2
- [x] tm_brand.html — brändikirja
- [x] Palloliiton palaveri (fyysisen suorituskyvyn johtaja, Apr 13)

### Sprint 4b (valmis — 2026-04-28)
- [x] Eerikkilä-normitaulukot (tm_eerikkila_normit.js) — kaikki 11 testiä P10–M / T10–N
- [x] Testipelaaja Topias Koskela P2: sukupuoli, syntymaVuosi, FLEI-ketjut kaikki
- [x] Seura.html muokkausmodaali: syntymäpäivä, pelipaikka, FLEI (super admin)
- [x] Seura.html PIN-hallinta: luoPelaajaPIN + tallennaPelaajaPIN + getIdToken(true)
- [x] Pelaaja v7 v=24: syntymäpäiväyllätys (konfetti + banneri + bonustehtävä)
- [x] Security Rules: onSuperAdmin() 4-tapa tunnistus

### Sprint 5 (seuraava)
- [ ] **P3:** Vanhemman app kovakoodattu nimi → Firestore-haku
- [ ] **P4:** Firestore-säännöt: huoltajaEmail-vertailu vanhemmalle
- [ ] **P5:** Fiilinki ikäfaasikohtaiseksi (leikkija-kieli U13)
- [ ] **P6:** Valmentajan kenttähavainto → Firestore → pelaajan näkymä
- [ ] **P7:** IDP-aktivointilogiikka (3 reittiä)
- [ ] Testaa huoltajan kirjautuminen oikealla tilillä
- [ ] SPF/DKIM — sähköpostit roskapostiin
- [ ] SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
- [ ] Excel → Firestore tuontityökalu (kriittisin pullonkaula)
- [ ] Tyttöjen PHV-kaava (ennen U14/15T-aktivointia)
- [ ] Pelihavainto Taso 1 (TIPS Master-näkymässä)

### Sprint 6–8
- [ ] AI Behavioural Science -agentti
- [ ] Pelihavainto Taso 2–3
- [ ] Player Care -moduuli (Hammarby-oppi)
- [ ] Live Transition View
- [ ] Solo-versio: Firebase-integraatio + Google Sign-In
- [ ] Milestone-kortit Firestoresta

---

## Kriittiset tunnetut ratkaisut (40 kpl)

1. Firestore Rules: `allow create` JA `allow update` pakollinen
2. Syntymäpäivä: `Date.UTC(y,m-1,d)` — EI `new Date(string)` (timezone-bugi)
3. onAuthStateChanged loop: `_kirjautuminenKesken`-flag
4. SheetJS: ei tyylejä ilman Pro — openpyxl server-side
5. Näkymien vaihto: `style.display` EI classList (CSS specificity)
6. Ei VP + Admin samassa selaimessa
7. onSnapshot: siivoa `tm:logout` + 50ms ennen signOut()
8. GitHub Pages CDN: ~10min — `?v=N` + tarkista raw.githubusercontent.com
9. Roolinimet: `super_admin` underscore canonical
10. openpyxl pakollinen Excel-tyyleille
11. Testaus: AINA GitHub Pages URL — file:// estää Firebase Auth
12. setCustomUserClaims pakollinen luoKayttaja:ssa
13. Rules-deploy: Firebase-konsoli — EI GitHub Actions (403)
14. Suostumuslomake: kutsuflow=`.update()`, uusi=`.set()`
15. `_pelaaja` on `let` — EI `window._pelaaja`
16. harjoitelogiikka_v4.js ennen pääscriptejä
17. DIAG-ketju: `diag` — `sl`/`fl` poistunut pysyvästi
18. YouTube: `embed/{ID}?rel=0`
19. Fiilinki-lukitus: `fiilinki_paivitetty` ennen renderöintiä
20. Super admin: `adminSnap.exists` EI claims-arvoista
21. `huoltajaEmail`: aina `.toLowerCase()`
22. Firebase Functions: AINA `firebase.app().functions('europe-west1')`
23. `testitapahtumat`: oikea kokoelmanimi (EI `tapahtumat`)
24. `_avaaValmentajaPopup`: GLOBAALI — EI nested
25. `nimiToUid`-kartta: UID-mismatch mentoroinnit ↔ kayttajat
26. `joukkueNimi`: tallenna display name, ei ID (bugi auki)
27. Chart.js: AINA `Chart.getChart()` + destroy + redraw, EI `_init` guard
28. Chart.js `display:none`-näyttö: `setTimeout(50–100ms)` ennen init
29. Syntymäpäivä: `Date.UTC(y,m-1,d)` — EI `new Date(string)`
30. Näkymien vaihto: `style.display` EI `classList`
31. `openpyxl` pakollinen Excel-tyyleille
32. Suostumuslomake: kutsuflow=`.update()`, uusi=`.set()`
33. Testaus AINA GitHub Pages URL:lla
34. Huoltajan luku: `resource.data.huoltajaEmail == request.auth.token.email`
35. SessionStorage cache TTL 30min — `_cacheAseta` / `_cacheLue`
36. Pelaaja-sivu: `_tmOdotaHarjoitelogiikka()` guard ennen harjoitekutsuja
37. **Nested template literals rikkovat scriptin** → käytä string concatenationia (`+`)
38. **`getIdToken(true)` pakollinen** ennen Firestore-kirjoitusta (sessio vanhentuu)
39. **FLEI raakadata 1–3** Firestoreen, normalisointi `(arvo-1)/2×100` koodissa
40. **Topias dokumentti-ID:** `m93GBdOaGCUuenMiCL0I` — **kaksi u:ta**

---

## Avoimet bugit (2026-04-28)

| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Vanhemman app kovakoodattu nimi | TalentMaster_Vanhempi.html | 🔴 P3 |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v7.html | 🟡 P5 |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 |
| SPF/DKIM puuttuu — roskapostiin | Cloud Functions / Gmail | 🔴 |
| Huoltajan kirjautuminen — testaamatta oikealla tilillä | TalentMaster_Vanhempi.html | 🔴 |
| Automaattinen salasanaresetointi lahetaPelaajaSivuLinkki:ssä | functions/index.js | 🟡 P8 |

---

## Palloliiton yhteistyö

- **Palaveri Head of Talent:** 2026-04-09
- **Palaveri Fyysisen suorituskyvyn johtaja:** 2026-04-13
- **Positioning:** Myeway = passiivinen dashboard. TalentMaster = aktiivinen kehitystyökalu.
- **TM:n uniikki lisäarvo:** Yhdistää pelisuorituksen biologiseen ikään + FLEI + IDP + RAE
