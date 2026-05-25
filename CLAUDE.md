# CLAUDE.md — TalentMaster™ Master Briefing

> Tämä tiedosto on ensimmäinen asia jonka liität uuteen Claude-sessioon.
> Se korvaa kaikki aiemmat SESSION_SUMMARY.md -tiedostot.
> Viimeksi päivitetty: 2026-05-15

---

## 1. PROJEKTI LYHYESTI

**TalentMaster™** on suomalainen jalkapallon talenttiarviointiin ja pelaajien kehitysseurantaan
tarkoitettu SaaS-alusta. Rakentaja: Tero Koskela, Palloliiton kansallisen ohjelman johtaja.
Filosofia: *"Pelaaja ensin, hallinto vahvistaa"* — järjestelmä rakentuu lapsen kehitystarpeista
ylöspäin, ei hallinnosta alaspäin.

**GitHub:** `terokoskela7-cmyk/talentmaster`
**GitHub Pages:** `https://terokoskela7-cmyk.github.io/talentmaster/`
**Domain:** talentmasterid.com (ostettu)

---

## 2. TEKNINEN STACK — ÄLÄ MUUTA ILMAN LUPAA

| Kerros | Teknologia | Huomio |
|---|---|---|
| Frontend | Vanilla JS (IIFE), multi-HTML | Ei frameworkeja |
| Tietokanta | Firebase Firestore **eur3** multi-region | eur3 ≠ europe-west1 |
| Auth | Firebase Authentication + Custom Claims + **Google Sign-In** | SA kirjautuu Googlella |
| Cloud Functions | Node.js **europe-west1** | Aina tämä region |
| Storage | Firebase Storage, europe-west1 | ADAR Vision -kuvat |
| Hosting | GitHub Pages + Fastly CDN | ~10 min cache, käytä `?v=N` |
| Sähköposti | Nodemailer Cloud Functionissa | Firebase Extension incompatible with eur3 |

### Firebase-config (Blaze plan)
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

### Cloud Functions — KRIITTINEN SÄÄNTÖ
```javascript
// OIKEIN — aina näin:
firebase.app().functions('europe-west1').httpsCallable('functionName')
// VÄÄRIN — älä koskaan näin:
firebase.functions().httpsCallable('functionName')
// firebase.functions() menee us-central1 → hiljaa epäonnistuu
```

---

## 3. SUPER-ADMIN — EI KOSKAAN RIKO

- **Sähköposti:** talentmasterid@gmail.com
- **UID:** `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
- **Rooli-string:** `super_admin` (alaviiva — ei välilyöntiä, ei superadmin)
- Super-admin näkee **aina** kaiken — kaikki seurat, kaikki näkymät, kaikki funktiot
- Super-admin-tunnistus: `adminSnap.exists` (ei kentän arvo)
- Jokainen koodimuutos testattava: "Toimiiko tämä super-adminilla?"

### Super admin erikoistilanteet
- **ADAR Pikakortti:** Super adminilla ei ole `seuraId` Custom Claimissä
  → `_naytaSuperAdminSeuraValitsin()` avautuu automaattisesti
  → `_vahvistaSeuraValinta()` asettaa `window._tmSeuraId` + lataa pelaajat
- **Seurahallinta:** Super admin näkee seuravalitsimen topbarissa
  → `avaaNaviNakyma(sivu)` välittää `?seura=X&tm_ref=seura`

---

## 4. ROOLIRAKENNE

```
super_admin           → TalentMaster (Tero)
vp                    → Valmennuspäällikkö per seura
seurasihteeri
urheilutoimenjohtaja
valmentaja
talenttivalmentaja
fysiikkavalmentaja
fysioterapeutti
testivastaava
pelaaja               → PIN-kirjautuminen (Anonymous Auth)
vanhempi
```

**Kolmiportainen hallinto:**
1. Platform (super_admin)
2. Seuran hallinto (vp, seurasihteeri, urheilutoimenjohtaja)
3. Operatiivinen (valmentaja, fysiikkavalmentaja jne.)

---

## 5. DESIGN-JÄRJESTELMÄ — CANONICAL TOKENS (2026-04-30)

```
Tausta:    #111110  (Carbon — EI #06090F)
Kortit:    #161614
Syvä:      #1C1C1A
Teal:      #28B090  (ainoa aksentti — EI #3EC9A7)
Sininen:   #2A5DB0  (sekundääri — EI #4A7ED9)
Amber:     #E0A040  (varoitukset, pilotti)
```

**Fontit:**
- Otsikot/KPI: `Cormorant Garamond` 300/400/600 (EI Playfair Display)
- Body/UI: `DM Sans` 400/500/600

**rgba-vastaavuudet:**
- `rgba(42,93,176,X)` = --blue
- `rgba(40,176,144,X)` = --teal

**VANHA — EI KOSKAAN:** `Playfair Display`, `#3EC9A7`, `#4A7ED9`, `#06090F`

**Periaate:** Mobile-first. Korkein aktivointivipunen: tyhjän tilan design.

---

## 6. MOBIILI — KRIITTINEN BUGI HISTORIASSA

**ÄLÄ KOSKAAN tee näin:**
```css
/* VÄÄRIN — display:none tappaa transform-animaation */
@media(max-width:768px) { .sivupalkki { display:none; } }
@media(max-width:768px) { .sivupalkki.auki { transform:translateX(0); } }
```

**OIKEIN — slide-in:**
```css
@media(max-width:768px) {
  #hamburgeri { display:flex !important; }
  .sivupalkki { transform:translateX(-100%); transition:transform .25s; }
  .sivupalkki.auki { transform:translateX(0); }
  #sivupalkkiOverlay.auki { display:block !important; }
}
```

**Vain YKSI `@media(max-width:768px)` per tiedosto.** Kaksi lohkoa kumoaa toisen.
Ongelma löytyi: Seura.html:ssä oli kaksi lohkoa — ensimmäinen `display:none` kumosi
toisen `translateX`. Admin.html toimi heti koska vain yksi lohko.

---

## 7. AVAINTIEDOSTOT GITHUBISSA (2026-04-30)

| Tiedosto | Rooli | Tila |
|---|---|---|
| `TalentMaster_Seura.html` | Seurahallinta (VP, sihteeri, UTJ) | ✅ v9+ mobiili OK |
| `TalentMaster_Admin.html` | Super Admin -hallintapaneeli | ✅ Tilastot + mobiili |
| `TalentMaster_VP_v20.html` | VP strateginen dashboard | Arkisto |
| `TalentMaster_VP_v21.html` | VP Firebase-pohjainen | Arkisto |
| `TalentMaster_VP_v22.html` | VP — sivupalkki + mentorointi + Sprint 3 (signaalit/BQ/IDP) | ✅ Sprint 3 valmis 2026-05-13 |
| `TalentMaster_Master_v15.html` | Valmentajan näkymä | Arkisto |
| `TalentMaster_Master_v16.html` | Valmentajan näkymä + Testit-työtila | ✅ UUSIN 2026-05-02 |
| `TalentMaster_ADAR_Pikakortti.html` | Kenttähavainto + ADAR Vision | ✅ |
| `TalentMaster_Pelaaja_v7.html` | Pelaajan mobiiliapp | ✅ korjattu 2026-05-01 |
| `TalentMaster_Vanhempi_v2.html` | Vanhemman näkymä | ⚠️ Kovakoodattu nimi |
| `TalentMaster_IDP_Kortti_v4.html` | IDP-kortti | ✅ UUSIN 2026-05-01 |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake | ✅ |
| `TalentMaster_Testaus_v8.html` | Kenttätestauslomake | ⚠️ Arkistoidaan kun v9 testattu pilottiseuralla |
| `TalentMaster_Testaus_v9.html` | Yhdistetty kenttätestaustyökalu — wizard + korttinäkymä + offline-ensin (yhdistää v8 + Harjoitettavuus_v4) | ✅ Valmis 2026-05-14 (3112 riviä) |
| `TalentMaster_Excel_Tuonti.html` | Massatuontityökalu VP:lle — Sprint 3.1 (historiapohja-moodi + writeBatch + TKI + PalloID-ristiintarkistus) | ✅ Sprint 3.1 valmis 2026-05-13 |
| `TalentMaster_Harjoitettavuus_Lomake_v4.html` | Harjoitettavuuskartoituslomake | ⚠️ Arkistoidaan kun v9 testattu pilottiseuralla |
| `TalentMaster_Pelaajarekisteri.xlsx` | Excel-rekisteripohja | ✅ |
| `functions/index.js` | 7 Cloud Functionia + aiProxy | ✅ |
| `tm_admin/firestore.rules` | Security Rules v2.7 — CONSOLESTA (idp_jono + meta/phv_snapshot + testitulokset + joukkueet/{id}/kalenteri) | ✅ Deployattu 2026-05-14 |
| `src/lib/tm_bioika.js` | Biologisen iän laskenta — Mirwald 2002 PHV + yli-ikäisyyssääntö (Excel-verifioitu identtiseksi) | ✅ 287 riviä |
| `tm_eerikkila_normit.js` | Eerikkilä-normitaulukot | ✅ |
| `tm_lang.js` | fi/sv/en, 144 käännöstä | ✅ |
| `harjoitelogiikka_v4.js` | Harjoitusohjelman generointi (144KB) | ⚠️ Tarkista onko GitHubissa |
| `tm-profile.js` | Pelaajaprofiilin laskentamoottori | ⚠️ Tarkista onko GitHubissa |
| `tm-kortit.js` | Gamification — idolikortit | ⚠️ Tarkista onko GitHubissa |

---

## 8. PILOTTISEURAT (8 kpl)

| ID | Seura | VP-sähköposti | Huomio |
|---|---|---|---|
| fcl | FC Lahti Juniorit | vp.fcl@talentmaster.fi | |
| kpv | KPV | rasmus_broberg@icloud.com | **HUOM:** vp.kpv ei ole Authissa — oikea tili on rasmus_broberg@icloud.com |
| palloiirot | Pallo-Iirot | vp.palloiirot@talentmaster.fi | |
| yvies | Ylöjärven Ilves | vp.yvies@talentmaster.fi | |
| sjk | SJK Juniorit | vp.sjk@talentmaster.fi | 1. tyttöjoukkueet mukana |
| grifk | GrIFK | vp.grifk@talentmaster.fi | kieliKartta: sv |
| vifk | VIFK | vp.vifk@talentmaster.fi | kieliKartta: sv |
| hjk | HJK Juniorit | vp.hjk@talentmaster.fi | |
| sibbovargarna | Sibbo-Vargarna | — | sv-kieli |
| eps | EPS (Espoon PS) | — | Teams-puhelu Heini PENDING |

---

## 9. TESTIPELAAJA: TOPIAS KOSKELA (KPV)

```
Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I
                                         ↑↑ KAKSI u:ta! m93GBdOaGCUuenMiCL0I
PIN: 9278
syntymaVuosi: 2013  (syntymäpäivä: 15.3.2013)
sukupuoli: "M"      (EI "poika")
joukkue: "KPV U13"
seuraId: "kpv"
huoltajaEmail: "TeroKoskela7@gmail.com"
tunniste (PalloID): "34650191"
flei_viimeisin: 62
sbl:2.16  sfl:2.30  ll:2.10  diag:2.40  dfl:2.20
Heikoin ketju: LL (55%) → harjoitteet ohjautuvat lateraaliketjulle
isDemoUser: false — oikea Firestore-data
```

---

## 10. FIRESTORE-RAKENNE — LUKITTU 2026-04-30

Neljä pääkokoelmaa + erilliskerrokset. Rakenne on päätetty.

### Pelaajat — pääkokoelma
```
pelaajat/{palloID}
  palloID, nimi, syntyma, sukupuoli, kansalaisuus

  suostumukset/
    perus: {ok, pvm, versio}
    terveys: {ok, pvm, versio}
    benchmark: {ok, pvm, versio}

  kirjaukset/{pv}
    tyyppi: 'T'|'D'|'S'|'P'|'jalkapallo'|'muu_urheilu'|'lepo'
    tehty: bool, kesto_min, rpe: 1-10
    kirjaustapa: 'heti'|'jalkikateen'|'auto'    ← lisätty 2026-05-12 (takautuva-tuki)
    takautuva: { tyyppi, kesto_min, lisatty }    ← valinnainen — jos pvm-doc oli jo olemassa
    fiilinki: 1-5, aika: ilta|aamu|paiva

  idp_kausi/{vuosi}
  ohjelmat/{id}
  terveys/{id}          ← GDPR Art. 9, oma suostumus
  streak_historia[], joukkuetreenit[]
```

### Seurat — operatiivinen hallinto
```
seurat/{seuraId}/
  nimi, laji, paketti, maa, kieli
  kaupunki, kotisivu, yhteystiedot
  aktiivinen, luotu, paivitetty

  pelaajat/{pelaajaId}/
    etunimi, sukunimi
    syntymaVuosi (numero), syntymaaika (Timestamp)
    sukupuoli "M"/"N"
    joukkue, pelipaikka, positio
    palloId / tunniste    ← synonyymit
    huoltajaEmail
    pin (4 numeroa)
    suostumusTila: 'pilotti'|'odottaa'|'annettu'
    suostumusTunniste
    lahde: 'excel_tuonti'|'kutsu'|'manuaalinen'
    isDemoUser: false
    flei_viimeisin (0-100)
    sbl, sfl, ll, diag, dfl (1.0-3.0 raakadata)

    // Joukkueet — uusi arkkitehtuuri 2026-05-09
    joukkueet: ["sjk_u13", "sjk_u15"]  // ID-viittaukset, tukee useaan joukkueeseen
    joukkue: "SJK U13"                  // Ensisijainen joukkue (backward compat)

    // Talenttiohjelma — 2026-05-09
    talenttiOhjelma: bool               // true = pelaaja talenttiohjelmassa
    talenttiTaso: "perus"|"laajennettu" // Ohjelmanintensiteetti (KORI poistettu)
    talenttiAlku: Timestamp             // Milloin aktivoitu
    talenttiAktivoi: uid                // Kuka aktivoi

    havainnot/{havaintoId}/    ← ADAR-havainnot
      tyyppi: 'adar'
      adar_taso: 1|2|3
      pisteet: {A, D, Act, R}
      narratiivi
      palloId, pelaajaId, seuraId, valmentajaUid
      tila: 'valmis'|'luonnos'
      pelaaja_lukenut: false|true
      ai_narratiivi, ai_luottamus: 'matala'
      media: [{tyyppi, storage_url, download_url, otettu: ISO-string}]
      luotu: ISO-string

    kirjaukset/{pvm}/
      tyyppi: 'T'|'D'|'S'|'P'|'jalkapallo'|'muu_urheilu'|'lepo'
      tehty, xp, kesto_min, rpe: 1-10
      fiilinki: 1-5, aika: ilta|aamu|paiva
      lahde: 'manuaalinen'|'catapult'|'polar'|'taso'   ← pakollinen, integraatioekosysteemi
      lahde_id: string|null                               ← alkuperäinen ID lähejärjestelmässä
      kirjaustapa: 'heti'|'jalkikateen'|'auto'            ← lisätty 2026-05-12 (takautuva-tuki)
      takautuva: { tyyppi, kesto_min, lisatty }           ← valinnainen — jos pvm-doc oli jo olemassa

  kayttajat/{uid}/
    email, rooli, etunimi, sukunimi
    seuraId, aktiivinen

  joukkueet/{joukkueId}/
  kutsut/{kutsuId}/
  havainnot/{havaintoId}/
  adar/{adarId}/
  kayttajat/{uid}/

  valmentajat/{uid}/kontribuutio/{palloID}
  valmentajat/{uid}/tuloskortti/

  alumni/{palloID}/
  konfiguraatio/
    paketti/, kpi_painotukset/, mittarit/, idp_template/, viestinta/

  kpi/
    spl_united_valinnat/{kausi}

  rekisteri/{palloID}/    ← viittaus, ei kopio
```

### Benchmarks (anonymisoitu, opt-in, n≥30)
```
benchmarks/{maa}/{ikäluokka}/{ominaisuus}
  n, keskiarvo, mediaani, p25, p75, p90
```

### Marketplace (scout-pääsy, 15v+)
```
marketplace/{palloID}
  scout_window_avautuu: timestamp  ← 15v
  eu_siirto_mahdollinen: timestamp ← 16v (FIFA Art. 19)
  taysis_ikaisyys: timestamp       ← 18v
  huoltaja_hyvaksyy: bool
  paasynot/{scoutId}/
```

### Palloliitto (oma kerros)
```
palloliitto/
  kayttajat/{uid}/
  ohjelmat/{ohjelmaId}/
    pelaajat/{palloID}/
    palautteet/{palloID}/{pvm}/
```

### Admins
```
admins/{uid}/
  email, rooli, superAdmin, luotu
```

---

## 11. FIRESTORE SECURITY RULES — KRIITTINEN

**DEPLOATAAN Firebase Consolesta — EI GitHub Actionsilla (403)**
Konsoli → Firestore → Rules → liitä → Julkaise

### Yhdistetty versio (2026-04-30) sisältää:
```javascript
function onAnonymous()  // PIN-kirjautuminen — voi lukea pelaajat + havainnot
function onSuperAdmin() // custom claim super_admin TAI admins/{uid} exists
function onOmaSeura(id) // custom claim seuraId
function onJohtoRooli() // vp|urheilutoimenjohtaja|seurasihteeri
function onValmentajaRooli() // + valmentaja|talenttivalmentaja|...
function onOmanSeuranValmentaja(seuraId)

// Kriittinen: kayttajat-alikokoelma VP:lle (korjaa Henkilöstö-näkymän)
seurat/{id}/kayttajat/{uid}:
  read: onSuperAdmin() || (onOmaSeura() && onJohtoRooli()) || oma UID

// Havainnot pelaajatasolla
seurat/{id}/pelaajat/{pid}/havainnot/{hid}:
  read: onSuperAdmin() || onOmaSeura() || onAnonymous()
  write: onOmanSeuranValmentaja() || onSuperAdmin()
```

### Opittu kantapään kautta:
1. Security Rules: tarvitaan **sekä** `allow create` **että** `allow update`
   (set() merge-optionilla käyttää update jos doc exists)
2. Syntymäpäivä: `Date.UTC()` — ei `new Date(string)` (aikavyöhyke-ongelmat)
3. `onAuthStateChanged` loop: käytä `_kirjautuminenKesken`-lippua
4. `onSnapshot`-kuuntelijat: `window._XxxUnsubscribe`-pattern
5. Logout: dispatcha `tm:logout` → odota 50ms → signOut()

---

## 12. ADAR PIKAKORTTI — ARKKITEHTUURI (2026-04-30)

### Bundler-rakenne (offline-käyttö kentällä)
- Fontit + Firebase SDK inlineina base64/gzip-pakattuna
- Script-tyypit: `__bundler/manifest`, `__bundler/ext_resources`, `__bundler/template`
- Päälogiikka on JSON-enkoodattuna `__bundler/template` -skriptissä

### KRIITTINEN: Bundler-template muokkausperiaate
```python
# OIKEIN — operoidaan raw JSON-stringillä indeksihaulla:
idx = template_raw.find("etsittava_teksti")
start = idx  # tai etsi lähempi rajakohta
template_raw = template_raw[:start] + uusi_teksti + template_raw[end:]

# VÄÄRIN — rikkoo tiedoston:
template_html = json.loads(template_raw)
# ... muutoksia ...
template_raw = json.dumps(template_html)  # double-encoding korruptoi
```

### Firebase-muuttujat
```javascript
window._tmDB      // Firestore
window._tmAuth    // Auth
window._tmSeuraId // Seuran ID (asetetaan kirjautumisen yhteydessä)
window._tmRooli   // Käyttäjän rooli
window._pelaajaMap // {pelaajaId: {tunniste, nimi, joukkue}}
```

### Firestore-polku havainnoille
```
seurat/{seuraId}/pelaajat/{pelaajaId}/havainnot/{id}
```

### saveCard() — kriittiset kentät
```javascript
await havaintoRef.set({
  palloId,            // PalloID Palloliiton rekisteristä
  pelaajaId,          // Firebase-dokumentin ID
  seuraId,
  valmentajaUid: firebase.auth().currentUser?.uid,
  tila: 'valmis',     // Pelaaja-näkymä kuuntelee tätä
  pelaaja_lukenut: false,
  luotu: new Date().toISOString(),
  // ADAR-pisteet, narratiivi jne.
});
```

### ADAR Vision
- Kuva → Storage: `seurat/{id}/havainnot/{id}/media_0.jpg`
- `media[]` taulukko — ei yksittäinen kenttä (video lisätään myöhemmin)
- `otettu: new Date().toISOString()` — EI serverTimestamp() (array-rajoitus!)
- `_pyydaAINarratiivi()` → aiProxy → GPT-4o Vision → `ai_narratiivi .update()`
- `ai_luottamus: 'matala'` aina — ihminen hyväksyy ennen kuin pelaaja näkee

### Pikatila (3-vaiheinen)
```javascript
_pikaValitsePelaaja(id, nimi, seuraId, btn)  // Vaihe 1
_pikaAdar(vaihe, btn)                         // Vaihe 2
_pikaSetPiste(piste, btn)                     // Vaihe 3
_pikaTallenna()                               // → tila:'luonnos' (ei heti 'valmis')
```

### Kontrastikorjaukset (WCAG AA 2026-04-30)
| Elementti | Ennen | Jälkeen | Kontrasti |
|---|---|---|---|
| Info-palkki teksti | rgba(94,201,168,.6) | #0C5940 | 1.4:1 → 5.2:1 |
| .mf-label (TILANNE/PVM) | 9px / opacity .30 | 11px / opacity .70 | |
| .sbd (nappi-kuvaus) | 10px / opacity .70 | 11px / opacity .85 | |
| s3.selected | #5EC9A8 | #3DB898 | 4.1:1 → 5.0:1 |

---

## 13. PELAAJAN APP (TalentMaster_Pelaaja_v7.html) — v=25

### Kirjautuminen
```javascript
_kirjauduPinilla(pin)
// → Firebase Anonymous Auth
// → Firestore-haku seurat/{id}/pelaajat jossa pin == arvo
// → _kaynnistaAppUI()
```

### PIN-kirjautuminen + getIdToken(true)
```javascript
// PAKOLLINEN ennen Firestore-kirjoitusta jos sessio voi olla vanhentunut:
await user.getIdToken(true);
// Ilman tätä: permission-denied pitkän tauon jälkeen
```

### Kirjausrakenne
```javascript
pelaajat/{id}/kirjaukset/{pvm}: {
  tyyppi: 'T'|'D'|'S'|'P',  // Tekniikka/Dual/Strength/Peli
  tehty: bool,
  xp: numero,
  kesto_min: numero,
  rpe: 1-10,
  fiilinki: 1-5,
  aika: 'ilta'|'aamu'|'paiva'
}
```

### Syntymäpäiväyllätys (v=24)
```javascript
_onkoSynttari(p)      // vertaa syntymaaika.getMonth()+getDate() nykyiseen
_synttariKonfetti()   // Canvas-animaatio: 60 palaa, 2s
_synttariBanner(p)    // HTML-banneri: nimi, ikä, bonustehtävä

// KRIITTINEN: käyttää string concatenationia (+)
// Nested template literals `` `...${...`...`}...` `` rikkovat parserin
// → koko script kaatuu → musta ruutu (oli v=23:n vika)
```

### sBar — kehittäjänavigaatio (display:none)
Näkyy vain kehittäjälle. Konsepteja:
```
A1 KOTI     ✅ Tuotanto
A2 Signal   🔵 Konsepti
A3 Today-Grid 🔵
B  Harjoitus + video 🔵
C  FIFA OVR-kortti  🔵
G  Haptics/ääni     🔵
H  Offline/SW       🔵
I  Vanhempi-konsepti 🔵
J  Oma treeni       🔵
K  Haaste           🔵
```

### P6 — Valmentajan havainto → Pelaajan näkymä (AVOIN)
```javascript
_p6KaynnistakuuntelIja(seuraId, pelaajaId)
// onSnapshot: tila=='valmis' && pelaaja_lukenut==false
// → näyttää "1 uutta" merkin
// → _avaaHavainnot(): overlay narratiivilla (ei pisteitä)
// → _p6Luetuksi(): pelaaja_lukenut: true

// ONGELMA: PIN-callback ei aseta window._p7Pelaaja
// → kuuntelija ei käynnisty automaattisesti
// KORJAUS TARVITAAN: PIN success → window._p7Pelaaja = {seuraId, pelaajaId}
```

---

## 14. SEURAHALLINTA (TalentMaster_Seura.html)

### Toiminnot
- Yhteenveto: 4 KPI-korttia + Pilottibanner + Suostumus-%
- Pelaajat: suodattimet (Kaikki/Pilotti/Kutsu/Rekisteröity/Ilman PalloID) + nimihaku
- Joukkueet, Henkilöstö, Sopimukset
- Tuo Excel: xlsx GitHubista → SheetJS → Firestore
- Massakutsu: xlsx-pohja + Cloud Function `lahetaHuoltajaKutsu`
- Pilottiprosessi: 1) Tuo → `pilotti` | 2) Kutsu → `odottaa` | 3) Suostumus → `annettu`

### Muokkausmodaali (päivitetty 2026-05-09)
Kentät: etunimi, sukunimi, syntymäpäivä (→ syntymaVuosi auto), sukupuoli (M/N),
joukkueet (checkboxit — monta joukkuetta mahdollinen), pelipaikka, huoltajaEmail, palloID.
Talenttiohjelma-toggle: perus / laajennettu.
Super admin lisäksi: sbl, sfl, ll, diag, dfl (FLEI-ketjut 1.0–3.0).

### Joukkueen nimen muokkaus (2026-05-09)
`avaaJoukkueMuokkaus(id, nimi, ikaryhma, vuosi)` — avaa modaalin.
`tallennaJoukkueMuutos(joukkueId, vanhanimi)` — päivittää joukkueet-kokoelman dokumentin
JA ajaa batch-päivityksen kaikille pelaajille joilla vanha nimi sekä joukkue- että joukkueet[]-kentässä.

### Excel-pohja dynaaminen (2026-05-09)
`lataaRekisteriPohja()` hakee seuran joukkueet Firestoresta ja generoi Excelin SheetJS:llä lennossa.
Joukkue-sarake sisältää valmiiksi oikeat joukkuenimet dropdownissa — ei käsin täyttämistä.
Tiedostonimi: `TalentMaster_{SeuraId}_{pvm}.xlsx`

### Duplikaattisuoja tuonnissa (2026-05-09)
Kaksi tasoa: 1) palloID-tarkistus Firestoresta, 2) etunimi+sukunimi+joukkue-yhdistelmä.
Ohitetut pelaajat näkyvät `⏭`-merkillä edistymispalkissa, lasketaan `ohitettu`-laskuriin (ei virheisiin).
Loppuyhteenveto: `X tuotu · Y ohitettu (jo järjestelmässä) · Z epäonnistui`

### Talentit-välilehti (2026-05-09)
Uusi navigointikohde. Hakee kaikki `talenttiOhjelma: true` -pelaajat seurasta.
Ryhmittää perus/laajennettu-tasoihin. KPI-kortit: yhteensä + laajennettu-määrä.

---

## 15. ADMIN-NÄKYMÄ (TalentMaster_Admin.html)

### Toiminnot (päivitetty 2026-05-09)
- Seurat: muokkaa + poista + "+ Lisää seura" -modaali (`avaaLisaaSeuraModal`)
- Käyttäjät: ✏️ Hallinnoi → roolinmuutos + salasana-reset + PIN + deaktivointi
- Joukkueet: dynaaminen data pelaajista + kokoelmasta — "+ Lisää joukkue" POISTETTU (käytä Seura.html)
- Tilastot: KPI-kortit + seurakohtainen taulukko suostumuspalkilla
- Massakutsu: VAIHE 1 — tallentaa `suostumusTila:'odottaa'`, EI lähetä sähköpostia (kaksivaiheinen)

### Massakutsu-arkkitehtuuri (MUUTTUNUT 2026-05-08)
Vaihe 1: Excel → Firestoreen. Napin teksti: "💾 Tuo pelaajat järjestelmään".
Iso amber-varoituslaatikko: "VAIHE 1/2 — EI suostumuspyyntöjä tässä vaiheessa."
Vaihe 2 (tuleva): "Lähetä suostumuspyynnöt" -nappi kun kaikki näkymät tarkastettu.

### KRIITTINEN: Tilastot-funktio
```javascript
// OIKEIN — string concatenation:
const html = '<div>' + muuttuja + '</div>';

// VÄÄRIN — template literals admin tilastot-funktiossa:
const html = `<div>${muuttuja}</div>`;
// Syy: Python-generoinnissa double-encoding rikkoo nested template literaalit
```

---

## 16. METODOLOGIA — ÄLÄ MUUTA ILMAN LUPAA

### 5D Framework
- D1 Fyysinen | D2 Tekninen | D3 Psykologinen | D4 Peliäly | D5 Sosiaalinen

### FLEI — 5 ketjua (TARKKA, EI MUUTA)
- ⚡ SBL | 🦵 SFL | ↔️ LL | 🔄 DIAG | 🏗️ DFL
- DIAG korvaa SL+FL pysyvästi (Wilke et al. 2016)
- S-harjoite kohdistuu **aina heikoimman ketjun** mukaan (ei pelaajaprofiiliin)
- T-harjoite joka päivä, myös lepopäivinä
- FLEI < 40 → automaattinen klinikkalähetys

### FLEI-raakadata
```javascript
// Tallennetaan 1-3 asteikolla:
sbl: 2.16, sfl: 2.30, ll: 2.10, diag: 2.40, dfl: 2.20
// flei_viimeisin lasketaan auto: 62 = keskiarvo normalisoituna

// Normalisointi: (arvo-1)/2*100 = 0-100%
// ll: 2.10 → (2.10-1)/2*100 = 55% → heikoin ketju
// Default puuttuvalle: 2.0 (50%)
```

### Eerikkilä-normit (tm_eerikkila_normit.js)
```javascript
eerikkilaTaso(arvo, testi, ika, sukupuoli) // → 1-5 (tekniikka 1-3)
// Tallennetaan AINA raakadata — taso lasketaan lennossa
// Tekniikkatestit (pujottelu, syöttö): 3-portainen
// Muut 11 testiä: 5-portainen
// pienempi=parempi: nopeustestit, pujottelu, syöttö
// suurempi=parempi: hyppy_cj, mas
```

### Pelaajaprofiilit
Railgun | Maestro | Shadowstep | Titan

### Ikävaiheryhmät
- 10–12: Competitor / leikkija
- 13–15: Builder / rakentaja
- 16–19: Showcase Pro

### Biologinen ikä
- Mirwald 2002 (PHV)
- PHV-status ohittaa Stage-luokituksen

### Terminologia (julkinen kieli)
| Tekninen | Julkinen |
|---|---|
| FLEI | kehon valmiusindeksi |
| fascia-linja | liikehallintaketju |
| jousitusindeksi | kimmovoima-indeksi |
| D4 | peliäly |

---

## 17. KRIITTISET PERIAATTEET — ÄLÄ TOISTA NÄITÄ VIRHEITÄ

1. **Nested template literals** rikkovat scriptin → **string concatenation** (+) aina
2. **`getIdToken(true)`** pakollinen ennen Firestore-kirjoitusta (sessio vanhentuu)
3. **`super_admin` (underscore)** — ei `superadmin`
4. **CF:** `firebase.app().functions('europe-west1')` — EI `firebase.functions()`
5. **`display:none` tappaa transform** → käytä `translateX(-100%)`
6. **Yksi `@media(max-width:768px)` per tiedosto** — kaksi lohkoa kumoaa toisen
7. **`serverTimestamp()` ei toimi array:n sisällä** → `new Date().toISOString()`
8. **FLEI raakadata 1-3** — normalisointi koodissa, ei tallennettuna
9. **Topias ID:** `m93GBdOaGCUuenMiCL0I` — KAKSI u:ta (m93GBdOaGCU**u**enMiCL0I)
10. **Firestore rules Consolesta** — ei GitHub Actionsilla (403)
11. **Bundler-template:** raw JSON-string indeksihaku, EI json.loads()+json.dumps()
12. **`syntymaVuosi` numerona** — `syntymaaika` on Timestamp erikseen
13. **`sukupuoli: "M"/"N"`** — ei "poika"/"tyttö"
14. **Raakadata Firestoreen** — normalisointi koodissa
15. **Security Rules:** tarvitaan sekä `allow create` että `allow update`
16. **PalloID:** kenttänimi `tunniste` pelaajadokumentissa, kopioidaan `palloId`-nimellä havaintoihin
17. **`media[]` taulukko** — tulevaisuudessa video samaan rakenteeseen
18. **`seurat/{id}/pelaajat/` tarvitsee oman Rules-blokin** — EI periydy automaattisesti
19. **`testitapahtumat` EI `tapahtumat`** — väärä nimi estää kaiken datan löytymisen
20. **Super admin seuranvalitsin AINA** — Custom Claimissa ei seuraId:tä, joten automaattinen haku palauttaa satunnaisen seuran
21. **IIFE-scope:** HTML `onclick=` kutsuu vain `window._`-globaaleja — sisäiset funktiot vaativat `window.fn = function fn()`
22. **Sukupuoli-konversio:** Excel käyttää P/T, Firestore käyttää M/N — eri asiat, muunna aina
23. **joukkueet[] + joukkue** — pelaajalla molemmat kentät. `joukkueet` = ID-lista (uusi), `joukkue` = ensisijainen nimi (backward compat). **Kyselyt aina kaksoiskyselynä Promise.all-rinnakkain:** `where('joukkue','==',joukkueNimi)` + `where('joukkueet','array-contains',joukkueId)`. Yhdistä `Map`-tietorakenteella uniikit pelaajat dokumentti-ID:n perusteella. **EI datamigraatiota** — Excel-tuonnin pelaajilla on vain `joukkue`-string, Seura.html:n pelaajilla `joukkueet`-array; molemmat rakenteet ovat oikein omassa kontekstissaan ja säilyvät rinnakkain pysyvästi. Yhden kentän kysely jättäisi puolet pelaajista pois — bugi joka vaikuttaa kaikkiin seuroihin systemaattisesti
24. **Excel-sarakenimi "PalloID (vapaaehtoinen)"** rikkoo tuonnin — etsiSarake käyttää `startsWith` haun (`palloidvapaaehtoinen`.startsWith(`palloid`)), mutta sarakeotsikoissa EI pidä olla sulkeita
25. **`lataaSeurat` = `onSnapshot`-kuuntelija** — EI `.get()` — päivittyy reaaliajassa
26. **Joukkueet-kokoelma vs. pelaajadata** — Seura.html luo joukkueet `.doc(id)`-metodilla (siisti ID), Admin ei enää luo joukkueita. Näytä molemmat lähteet rinnakkain.
27. **SA kirjautuu Google Sign-In:llä** (ei email/salasana) — aktivoitu 2026-05-08
28. UI ei näytä XP-lukuja eikä progressbarsia, eikä loss 
aversion -kieltä missään tilassa. XP tallennetaan Firestoreen 
AI-agentti varten mutta ei renderöidä pelaajalle. Streak 
näytetään aina positiivisesti kehystettynä neljässä tilassa 
(0pv / 1–6pv / 7–13pv / 14+pv). Peruste: Seligman PERMA + 
Deci & Ryan SDT — intrinsic motivation > extrinsic 
gamification. Kahneman loss aversion luo lyhytaikaista painetta 
mutta pitkällä aikavälillä ahdistusta.
---

## 18. CLOUD FUNCTIONS (europe-west1)

| Funktio | Kuvaus |
|---|---|
| `lahetaRekisteriKutsu` | Yksittäinen kutsu huoltajalle |
| `luoKayttaja` | Luo Firebase Auth -käyttäjän (sama email eri rooli OK) |
| `lahetaHuoltajaKutsu` | Massakutsu huoltajille |
| `deaktivioiKayttaja` | Pehmeä poisto — data säilyy |
| `lahetaPelaajaSivuLinkki` | Linkki pelaajan näkymään |
| `haeOrLuoHuoltajaAuth` | Huoltajan autentikointi |
| `aiProxy` | AI-välitys: GPT-4o Vision, Whisper, narratiivi |

`OPENAI_API_KEY`: Google Cloud Secret Manager + GitHub Actions Secrets

---

## INTEGRAATIOARKKITEHTUURI — Ekosysteemistrategia (2026-05-11)

TalentMaster on platform johon datalähteet konvergoivat. Lock-in tulee datasta,
ei sopimuksista. Kun kaikki pelaajan data on yhdessä paikassa, vaihtaminen
vaatii massiivisen datansiirtoprojektin.

### Arkkitehtuuriperiaate — `lahde`-kenttä kaikkialle
Kaikki ulkoisesta lähteestä tuleva data merkitään:
```javascript
lahde:    'manuaalinen'|'catapult'|'polar'|'taso'|'wyscout'|'palloliiton_api'
lahde_id: string|null  // alkuperäinen ID → synkronointi + deduplikointi
```

### TASO-integraatio (osittain toteutettu)
Cloud Function `tasoHaeSeuranOttelut` on deployattu. TASO tarjoaa
pelaajakohtaisen pelidatan (passit, laukaukset, minuutit, arvosanat).

**Puuttuva — Sprint 4-5:**
- Valmentaja lataa TASO-datan suoraan kalenteriin joukkueen otteluista
- Pelaajakohtainen data: `pelaajat/{id}/pelidata/{otteluId}`
- Kalenterissa ottelu-ikonista avautuu TASO-data rinnakkain TM-datan kanssa

**Kohderakenne:**
```
seurat/{id}/tapahtumat/{otteluId}
  tyyppi: 'ottelu', vastustaja, pvm, joukkue
  taso_ottelu_id: string   ← synkronointi

pelaajat/{id}/pelidata/{otteluId}
  minuutit, laukaukset, passit, taso_arvosana
  lahde: 'taso', lahde_id: string
```

### Kalenteri-integraatio — iCal-vienti (Sprint 5)
Valmentaja näkee yhdessä kalenterissa: harjoitukset + ottelut TASO:sta + testipäivät.
iCal-vienti: Cloud Function → `/api/kalenteri/{seuraId}/{joukkue}.ics`
→ Google Calendar / Outlook / Apple Calendar.

### Integraatioprioriteettijärjestys
| Integraatio | Prioriteetti | Sprint |
|---|---|---|
| TASO → kalenteri + pelidata | 🔴 | 4-5 |
| iCal-vienti | 🟡 | 5 |
| Catapult (GPS) | 🟡 | 6-7 |
| Polar (syke) | 🟡 | 6-7 |
| Palloliiton API (PalloID-linkitys) | 🟢 | 8+ |
| Wyscout / InStat (videoanalyysi) | 🟢 | 8+ |

---

## 19. AI-ARKKITEHTUURI

### Behavioural Science -agentti (Sprint 6–8)
```
Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä
```
**Triggerit:** streak katkeaa | 3pv streak | fiilinki matala 2pv | uusi viikko | PHV-huippu

**Käyttäytymistiede:** habit loop (Duhigg), implementation intention (Gollwitzer),
loss aversion, temptation bundling (Milkman)

**Tekninen toteutus:**
- `tm_ai.js` — provider-agnostic wrapper
- `TM_AI.call()` — ei suoria API-kutsuja UI:sta
- Cloud Function = AI-proxy (europe-west1), API-avaimet ei ikinä selaimessa

### RAG — pelaajan historia AI:n muistina
- Firebase Vector Search (beta) tai Pinecone
- Aktivoidaan kun 500+ pelaajaa usealta kaudelta — ei aiemmin

### MCP-arkkitehtuuri
- Palloliiton MCP-server on jo olemassa (`jsvirtane/tulospalvelu-mcp`)
- TalentMasterID rakentaa oman MCP-serverin
- `llms.txt`: api.talentmasterid.com/llms.txt

### Open API -periaatteet
- Versiointi URL:ssa: `/v1/`, `/v2/`
- OpenAPI 3.1
- Autentikointi: API-avain (seurat) · OAuth 2.0 PKCE (scoutit) · JWT (Palloliitto)
- Rate limiting: seurat 1000/h · scoutit 100/h · Palloliitto 10000/h

---

## 20. AVOIMET TEHTÄVÄT (päivitetty 2026-05-15)

### KRIITTISET — pilottivalmius
- [x] **Security Rules v2.7 deploy** Firebase Consolesta ✅ 2026-05-14
- [x] **VP_v22 + Excel_Tuonti + Testaus_v8 + Rules + CLAUDE.md GitHubiin** ✅ 2026-05-14
- [ ] **Vie GitHubiin:** TalentMaster_Testaus_v9.html (paikallisesti valmis)
- [ ] **Testaus_v9 pilottitesti** — KPV/GrIFK kokeilee → palautteen jälkeen v8 ja Harjoitettavuus_v4 arkistoidaan
- [ ] **P6-käynnistys:** PIN-callback → `window._p7Pelaaja = {seuraId, pelaajaId}`
- [ ] **Streak → Firestore** — pakollinen ennen AI-moduuleja (nyt localStoragessa)
- [ ] **Testaa VP_v22 KPV:llä** — kirjaudu rasmus_broberg@icloud.com

### TÄRKEÄT
- [ ] **P3 Vanhemman app:** "Eemeli" → `where('huoltajaEmail','==',email)`
- [ ] **P4 Firestore Rules vanhemmalle:** `resource.data.huoltajaEmail == request.auth.token.email`
- [ ] **P5 Fiilinki ikäfaasikohtaiseksi:** U13 → leikkija-kieli
- [ ] **Suostumusprosessi vaihe 2:** "Lähetä suostumuspyynnöt" -nappi Admin-sivulle
- [ ] **SPF/DKIM** — sähköpostit menevät roskapostiin
- [ ] **Tyttöjen PHV-kaava** ennen U14/15T-aktivointia (SJK)
- [ ] **AI-narratiivi debug:** `ai_narratiivi` tyhjä vaikka kuva tallentuu

### SEURAAVAT SPRINNIT
- [ ] **HH-testit Excel-kierto** — testaa KPV:llä end-to-end
- [x] **Harjoitettavuuslomake → Testaus-integraatio** ✅ Testaus_v9 yhdistää molemmat 2026-05-14
- [ ] **IDP-aktivointilogiikka (P7):** 3 reittiä (manuaalinen/X-Factor/KORI)
- [ ] **Firestore kirjausrakenne lukitaan** → AI agent -aktivointi
- [ ] **RAG** kun 500+ pelaajaa
- [ ] **Bio-ikä — kasvumittausprotokolla v9:ään** (3 testiä: pituus 2×, paino 2×, istumapituus 1× + `laskentatapa: 'keskiarvo'` -lippu + tm_bioika.js inline — Mirwald valmis, ks. §30)
- [ ] **Vanhempien pituuskentät suostumuslomakkeeseen** — kerätään Khamis-Roche -laskentaa varten (Sprint 4, ks. §30)
- [ ] **Khamis-Roche -implementointi** — Pediatrics 1995 erratum -kertoimet verifioitava (Sprint 4)

---

## 21. KANSAINVÄLISTYMINEN — OIKEA JÄRJESTYS

**Ensin suomi vakaaksi, sitten kansainvälinen.**
Referenssi tarvitaan: "meillä on 8 suomalaista seuraa ja 300+ pelaajaa."

### Ota käytäntöön heti (ei vaadi erillistä sprinttiä):
- CSS logical properties (`margin-inline-start` ei `margin-left`) kaikessa uudessa koodissa
- RTL-valmius tulevaisuudessa ilmaiseksi

### Ota talteen Q3 2026:
- i18n-engine (tm_lang.js namespace-pohjaiseksi)
- Token-pohjainen white-label: `data-theme="bundesliga"` Firestore-konfiguraatiosta
- 5D-painotusten kalibrointi per markkina Firestoressä

### Ota talteen Q4 2026+:
- Saksan pilotti — referenssi + metodologia + kulttuurinen kalibrointi
- RAG kun dataa riittävästi


### RAE = kansainvälinen erottautumistekijä (Morganti 2025)

TalentMaster on ainoa tunnettu alusta joka korjaa RAE:n systemaattisesti.
Kilpailijat (Catapult, VALD, Smartabase) mittaavat. TalentMaster korjaa.
- OR 4.38: BQ1-pelaajat 4.4× todennäköisemmin U17-maajoukkueessa kuin BQ4
- OR 2.80: BQ4-pelaajat 2.8× todennäköisemmin senioritasolla kuin U17-tasolla
- *"Raising awareness does not contribute to eradication"* — systeminen korjaus pakollinen

### Akateeminen kumppanuus = varsinainen kv-avain
KIHU-yhteistyö on jo olemassa. Seuraava askel:
peer-reviewed artikkeli FLEI-metodologiasta (Journal of Sports Sciences / Science & Football).
Yksi artikkeli avaa enemmän ovia liitoille kuin kymmenen pilottiseuraa.

### Arkkitehtuurivelka — ei tehdä nyt, kirjataan
`seurat/{id}/pelaajat/{pelaajaId}` — data kiinni seurassa.
GDPR Art. 20 + kv-skaalaus vaatii tulevaisuudessa `pelaajat/{palloID}` ylätasolle.

### PalloID = kilpailuetu kansainvälisesti
Suomi on ainoa maa jossa pelaajan kehitysrekisteri + liittodata + seurarekisteri
linkittyvät yhdellä tunnisteella. TalentMasterID voi rakentaa muiden maiden liitoille
saman infrastruktuurin. FIFA Art. 19bis compliance on B2G-tuote liitoille.

---

## 22. BISNESMALLI

| Tuote | Asiakas | Hinta |
|---|---|---|
| Solo | Pelaaja + perhe | 4–7€/kk |
| Club | Seurat | 400€/kausi + 2€/pelaaja/kk |
| Network | Palloliitto, liitot, UEFA | B2G-lisenssi |
| Scout | Scoutit, agentit | Transaktio per pääsy |

**Kilpailijat:** Catapult, VALD, Smartabase, Kitman Labs, PlayMetrics, 360Player, Playbook365

**Key advisor:** Marko Kauppinen — "Think Global, Act Local"

**FIFA ikäpisteet:**
| Ikä | Tapahtuma |
|---|---|
| 15v | Scout window avautuu |
| 16v | EU/ETA-siirto (FIFA Art. 19) |
| 18v | Täysi omistajuus — pelaaja ottaa datan hallinnan |

---

## 23. TESTAUSINFRASTRUKTUURI — LISÄTTY 2026-05-01

### Testikerrosjärjestelmä (4 kerrosta — v9 yhdistää v8 + Harjoitettavuus)

| Kerros | Tiedosto | Käyttötapa | Firestore-polku |
|---|---|---|---|
| **Yhdistetty (UUSI)** | `TalentMaster_Testaus_v9.html` | **Wizard + korttinäkymä + offline-ensin — yhdistää v8 + Harjoitettavuus_v4** | `testitapahtumat/{id}/tulokset/{pelaajaId}` + `joukkueet/{jid}/kalenteri/{kid}` |
| Kenttätestaus | `TalentMaster_Testaus_v8.html` | Reaaliaikainen kirjaus testipäivänä | `testitapahtumat/{id}/tulokset/{pelaajaId}` |
| Harjoitettavuus | `TalentMaster_Harjoitettavuus_Lomake_v4.html` | U12/U15/U19 protokolla | `testitapahtumat/{id}/tulokset/` + `kartoitukset/` fallback |
| Massatuonti | `TalentMaster_Excel_Tuonti.html` | Historiallinen data kerralla | `testit/`, `kartoitukset/`, `tekniikka/` |

### Testaus_v9 — kolmen sovelluksen rakenne (2026-05-14)

V9 on rinnakkainen v8:n + Harjoitettavuus_v4:n kanssa kunnes pilottiseura on testannut, sen jälkeen molemmat arkistoidaan.

| # | Sovellus | Vaiheet | Avainominaisuudet |
|---|---|---|---|
| 1 | **Suunnittelu** (toimistossa) | 1–4 | Protokolla + alusta + joukkue + osallistujat + ryhmäjako (myös harjoitettavuudelle) |
| 2 | **Kenttänäkymä** (testipäivänä) | 5 | Korttinäkymä yksi pelaaja kerrallaan · rotaatio · **offline-ensin (localStorage→Firestore)** · välitön vahvistus (vihreä välähdys 800ms) · 1–3p pisteytys · ℹ-modaali kenttäohjeineen · **Palloliiton virallinen kuljetus-laukaus-erikoissyöttö** (raaka + 4 rangaistuskenttää + auto-tulos) · reaaliaikainen TKI + merkki tekniikkakilpailulle |
| 3 | **Tarkastelu** (jälkeen) | 6–8 | Sync-status per pelaaja · "Merkitse valmiiksi" -nappi · FLEI/TKI/TSI värikoodattu taulukko · **A4-print per pelaaja** print-CSS:llä (Carbon → valkoinen) |

**Kalenteri-kirjoitus:** v9 luo testitapahtuman **kahteen paikkaan** — `testitapahtumat/{id}` (POLKU 1) + `joukkueet/{jid}/kalenteri/{kid}` (POLKU 2, try-catch). Jälkimmäinen vaati Rules v2.7:n kalenteri-alikokoelmablokin. POLKU 2 on best-effort: jos epäonnistuu, testitapahtuma on silti tallennettu.

**Offline-ensin -arkkitehtuuri:** kentällä syötetty data tallennetaan ensin localStorageen, synkronoidaan taustalla Firestoreen kun verkko on auki. Kenttätyöskentely ei kaadu vaikka verkko olisi epävarma.

### Excel-kiertokulku (testit ilman nettiä kentällä)
```
VP luo tapahtuma (Testaus_v8)
  → valitsee protokollan + aktiiviset testit + pelaajat
  → tapahtuma tallennetaan: testitapahtumat/{id}
     {aktiiviset_testit:[...], pelaajatData:[...], kausi:'2026-syksy', ...}

Testipäivänä: VP klikkaa "📥 Excel" tapahtumakortista
  → SheetJS generoi Excelin selaimessa
  → Pelaajat esitäytetty, vain valitut testit sarakkeina
  → Tiedostonimi: TM_2026-syksy_kpv-u15_20260915.xlsx
  → Ohjeet-lehti + tapahtuma-ID metadatana

Testaaja täyttää Excelin kentällä (ei nettiä)

VP lataa täytetyn Excelin Excel-tuontityökaluun
  → Validointi: PalloID pakollinen, sukupuoli P/T → M/N
  → Esikatselu ennen kirjoitusta
  → Firestore batch write
```

### Tekniikkakilpailu — 5 lajia (U8–U13)
| Laji | Yritykset | Erikoislogiikka |
|---|---|---|
| Ponnauttelu | 2 | Parempi aika |
| Syöttö pujotellen | 2 | Parempi aika |
| Pujottelu | 2 | Parempi aika |
| Kuljetus-laukaus | 2 | Raaka-aika − tarkkuusvähennykset |
| Pituuspotku | 2+2 (oik+vas) | metrit/5 → aikabonus, max 20s, vain U12–13 |

**Kuljetus-laukaus vähennykset:**
- Nurkka ilmassa: −5s
- Nurkka maata: −2s
- Keski ilmassa: −3s
- Keski maata: −1s

### Tapahtuma-Firestore-rakenne (lukittu)
```javascript
testitapahtumat/{tapahtumaId} {
  nimi: "HH-testi laaja — Syksy 2026",
  protokolla: "hh_laaja",  // tai "vapaa" — vapaa testivalinta (Sprint X)
  aktiiviset_testit: ["lin_5m", "lin_10m", "lin_30m", "hyppy_cj", "mas"],  // VP valitsi
  // Vapaa-moodissa lisäksi:
  // omat_testit_meta: [{id:"muu_knee_to_wall", nimi:"Knee-to-wall", yksikko:"cm"}, ...]
  kausi: "2026-syksy",
  pvm_alku: "2026-09-15",
  joukkue: "kpv_u15",
  arvioija: "Matti Korhonen",
  tila: "suunniteltu"|"avoin"|"valmis",
  pelaajatData: [{id, etunimi, sukunimi, tunniste(PalloID), phv_tila}],

  tulokset/{pelaajaId} {
    testit: { lin_5m: 1.12, lin_10m: 1.94, lin_30m: 4.21, hyppy_cj: 38.5, ... },
    testauspvm: "2026-09-16",  // pelaajan oma päivä
    kausi: "2026-syksy",
    tunniste: "34650191"  // PalloID
  }
}
```

### Testi-ID:t — selitykset

Sisäiset testi-ID:t (käytetään Firestoressa, Excel-pohjissa ja indeksilaskennassa):

| ID | Selitys | Yksikkö | Ketju | Logiikka |
|---|---|---|---|---|
| `lin_5m` | Lineaarinopeus 5m — räjähtävä kiihdytys | s | SBL | pienempi = parempi |
| `lin_10m` | Lineaarinopeus 10m — kiihdytysvaiheen maksimi | s | SBL | pienempi = parempi |
| `lin_30m` | Lineaarinopeus 30m — maksiminopeus (TSI:n perusta) | s | SBL | pienempi = parempi |
| `505_oikea` / `505_vasen` | 5-0-5 -ketteryystesti per puoli | s | LL | pienempi = parempi |
| **`kasirata`** | **Ketteryyskasirata — kahdeksikkorata** | s | LL | pienempi = parempi |
| **`sm_juoksu`** | **Suunnanmuutos-juoksu (SM-juoksu) ilman palloa** | s | DIAG | pienempi = parempi |
| **`sm_pallo`** | **Suunnanmuutos pallolla (SM-pallo) — lajitekniikka** | s | DIAG | pienempi = parempi |
| `hyppy_cj` / `hyppy_sj` | Kevennyshyppy (CMJ) / Staattinen hyppy (SJ) | cm | SFL | suurempi = parempi |
| `mas` | MAS-juoksutesti — maksimaalinen aerobinen nopeus | km/h | SFL | suurempi = parempi |
| `pujottelu` / `pujottelu_hh` | Pujottelu (tekniikkakilpailu / HH-laji) | s | LL | pienempi = parempi |
| `syotto` / `syotto_hh` | Syöttö pujotellen (tekniikkakilpailu / HH-laji) | s | DIAG | pienempi = parempi |
| `ponnauttelu` | Ponnauttelu — pallonkäsittely | krt/30s | DFL | suurempi = parempi |
| `kuljetus_laukaus` | Kuljetus-laukaus (tarkkuusvähennyksin) | s | DIAG | pienempi = parempi |
| `pituuspotku` | Pituuspotku — aikabonus = metrit/5 (max 20s) | m | SBL | suurempi = parempi |

**TSI-indeksi (Tekninen suunnanmuutos-indeksi):**
```
TSI = sm_pallo − sm_juoksu
```
TSI mittaa pelaajan **lajitekniikkaa suhteessa fyysiseen suunnanmuutoskykyyn**:
- **Positiivinen TSI** → pelaaja menettää aikaa pallon kanssa enemmän kuin ilman → fysiikka vahvempi kuin tekniikka
- **Negatiivinen TSI** (lähellä nollaa) → pallonhallinta ei juurikaan hidasta → tekniikka vahvempi
- TSI-tulkinta on suuntaa-antava: hyvä pelaaja häviää ~0.3–0.6 s pallon kanssa; selvästi enemmän → lajitekniikkavaje

**Alustaherkkyys (Testaus_v8.html `ALUSTAHERKAT_TESTIT`):**
Juoksu- ja ketteryystestit (`lin_*`, `505_*`, `kasirata`, `sm_juoksu`, `sm_pallo`, `kuljetus_laukaus`, `pujottelu*`, `syotto*`, `mas`) vaativat alusta-tiedon, koska tulokset eivät ole vertailukelpoisia eri alustoilla. Liikkuvuus- ja harjoitettavuustestit (kyykky, lankku, etunojapunnerrus jne.) eivät ole alustaherkkiä.

### Historiapohja-tuonti (Sprint 3.1, 2026-05-13)

Excel_Tuonti.html tukee kahta moodia:

**Moodi A — Tapahtumapohjainen** (default): vaatii Tapahtuma-ID:n, tallentaa
`seurat/{sid}/testitapahtumat/{tid}/tulokset/{palloID}` — kuten ennenkin.

**Moodi B — Historiapohjainen** (uusi): EI vaadi tapahtumaa. Tallentaa
seuraan vapaaseen alikokoelmaan:

```javascript
seurat/{sid}/pelaajat/{palloID}/testitulokset/{pvm}_{protokolla} {
  testit: { ponnauttelu: 48, syotto: 22, pujottelu: 13.5, ... },
  kausi: "2025-syksy",
  protokolla: "tekniikkakilpailu"|"hh_laaja"|"harjoitettavuus_u12",
  lahde: "historiapohja",
  testauspvm: "2025-09-15",      // _paivaIso-muodossa
  tuotu: "2026-05-13T08:42:00Z",
  tuojaUid: "<vp-uid>",
  flei_pct: 67,                   // jos protokolla 1-3 / num
  tki: 72,                        // jos protokolla=tekniikkakilpailu + ikä≤13
  phv_tila: "AN"|"PH"|"VA"|"",
  tallennettu: serverTimestamp()
}
```

**Doc-ID-konventio:** `{pvm}_{protokolla}` — esim.
`2025-09-15_tekniikkakilpailu`. Tämä estää konfliktit kun sama pelaaja
tekee useita protokollia samana päivänä.

**Pelaajaprofiilin päivitys** (`pelaajat/{palloID}` -dokumentti):
päivitetään VAIN jos PalloID löytyy Firestoresta esikatselun
ristiintarkistuksessa. Tunnistamattomat ja tyhjät PalloID:t voi tuoda
mutta vain `testitulokset`-alikokoelmaan — profiilia ei luoda eikä
päivitetä (review-jono jälkikäteen).

**WriteBatch:** Sprint 3.1 toteutti `db.batch()` -atomisuuden, max 400
dokumenttia per erä (Firestoren raja 500). Pelaajaprofiilin
`flei_historia`-array käyttää `new Date().toISOString()`-leimaa
(CLAUDE.md §17 #7 — serverTimestamp() ei toimi array:n sisällä).

**TKI-laskenta tuonnin yhteydessä:** Excel_Tuonti.html sisältää inlinen
kopion `tkLaskeMerkki` + `tkLaskeTKI` + `TK_MERKKIRAJAT` -funktioista
(`docs/testit_indeksit.js`). Lasketaan vain kun
`protokolla === 'tekniikkakilpailu'` JA pelaajan ikä on 8–13 (TK_MERKKIRAJAT
ei kata vanhempia → TKI=null on semanttisesti "ei mitattu").

### Pelaajatunniste-arkkitehtuuri (Sprint 3.1, 2026-05-13)

Pelaajan tunnistus on monitasoinen, koska eri maiden jalkapalloliitot
käyttävät eri formaatteja. TalentMaster säilyttää tunnistearvon yhdessä
kentässä ja erikseen `tunnistetyyppi`-metakentässä, jotta jälkikäteen
tiedetään mistä lähteestä tunniste on.

- **Suomi:** PalloID — Palloliiton virallinen tunniste, sama fi/sv-kielisille
  seuroille (GrIFK, VIFK, palloiirot)
- **Muut maat:** kukin liitto käyttää omaa tunnisteformaattiaan
  (DFB-ID, UEFA-ID, NIF-ID, jne.) — eivät vielä tiedossa eivätkä
  toteutettu, lisätään maakohtaisesti pilotin tullessa
- **Firestore-kenttä:** `tunniste` (tai legacy `palloID`) sisältää
  varsinaisen arvon. `tunnistetyyppi`-metakenttä on yksi seuraavista:
  - `'palloID'` — virallinen Palloliiton tunniste (Suomi)
  - `'tunniste'` — seuran oma tai muu järjestelmätunniste
    (Excel-sarake `Tunniste`, `PlayerID`, `SpelareID`, `Spieler-ID`)
  - `'muu'` — fallback, ei luotettavaa tunnistetta löytynyt
- **Excel-tuonti** (Excel_Tuonti.html): tunnistaa sarakkeet
  monikielisesti — `PalloID` / `Tunniste` / `PlayerID` / `SpelareID`
  / `Spieler-ID`. Sarake-prioriteetti: ensisijaisesti PalloID, fallback
  järjestelmätunnisteet. Tallentaa erikseen `tunnistetyyppi`-arvon
  tallennusdataan.
- **Kansainvälinen laajennus:** ennen ensimmäisen ei-suomalaisen seuran
  pilottia tarvitaan maakohtainen liitto-konfiguraatio
  (`seurat/{sid}/konfiguraatio/tunnistetyyppi: 'DFB-ID' | 'NIF-ID' | ...`)
  + monikielinen otsikkohaku Excel-tuontityökaluun. Sprint 3.1 lisäsi
  jo SV/EN-tunnistuksen otsikoille — saksankielinen `Dribbeln` /
  `Pass` / `Jonglieren` jää Sprint 3.2:een.

Tämä arkkitehtuuri mahdollistaa että sama Firestore-rakenne palvelee
kotimaista ja kansainvälistä dataa ilman migraatiota — `tunnistetyyppi`
toimii datan alkuperän audit-jälkenä.

---

## 24. SECURITY RULES — KRIITTISET MUUTOKSET 2026-05-01

### firestore.rules v2.1.0 — uudet alikokoelmat
Vanha v2.0 puuttui `seurat/{id}/pelaajat/`-alikokoelman — KAIKKI permission-denied
koko sessiossa johtui tästä yhdestä puutteesta. Firestore ei periydy alaspäin.

**Lisätyt alikokoelmat seurat/{seuraId}:n alle:**
```
seurat/{seuraId}/pelaajat/{pelaajaId}
  allow read: superAdmin() || onSeuranJasen()
  allow write: superAdmin() || onHallinto() || valmentajaroolit

seurat/{seuraId}/pelaajat/{pelaajaId}/havainnot/{havaintoId}
  → ADAR Pikakortti kirjoittaa tänne

seurat/{seuraId}/pelaajat/{pelaajaId}/kirjaukset/{pv}
  → päivittäiset harjoituskirjaukset

seurat/{seuraId}/testitapahtumat/{tapahtumaId}/tulokset/{pelaajaId}
  → testauslomake ja kenttätyökalu kirjoittavat
```

**KRIITTINEN MUISTISÄÄNTÖ:**
Firestore Security Rules EI periydy automaattisesti alikokoelmiin.
Jokainen alikokoelma vaatii oman `match`-blokin.
`match /seurat/{id} { allow read... }` sallii vain SEURADOKUMENTIN, ei alikokoelmia.

### Custom Claim -ongelma (ei vielä korjattu)
- Claim-arvo: `rooli: 'superadmin'` (ilman alaviivaa)
- Pitäisi olla: `rooli: 'super_admin'` (alaviivalla)
- Vaikutus: Rules-funktiot kuten `onVP()` eivät toimi super-adminilla jos ne tarkistavat roolin
- Korjaus: Cloud Function `setCustomUserClaims({rooli: 'super_admin', ...})`
- Ei kriittinen jos `superAdmin()` käyttää `exists(admins/uid)` — se ei tarvitse Custom Claimsia

---

## 25. TUNNETTU ONGELMA: TIEDOSTONIMISEKAANNUS

**Pelaaja v7 historia:**
GitHubissa `TalentMaster_Pelaaja_v7.html` oli pitkään ADAR Pikakortti väärällä nimellä.
Commit `0e58e48` ylikirjoitti sen edelleen ADAR-koodilla.
Oikea pelaaja-app löytyi nimellä `TalentMaster_Pelaaja_v7__5_.html` (paikallinen kopio).

**Ratkaisu 2026-05-01:**
- Oikea tiedosto ladattu outputs-kansioon nimellä `TalentMaster_Pelaaja_v7.html`
- Kolme korjausta: title v4→v7, värit canonical, `getIdToken(true)` lisätty

**Oppi:** Kun lataat tiedoston GitHubiin, tarkista aina että tiedostonimi vastaa sisältöä.
ADAR Pikakortti on `TalentMaster_ADAR_Pikakortti.html` — ei `TalentMaster_Pelaaja_v7.html`.

---

## 23. KEHITYSTYÖN PERIAATTEET

1. **Suunnittele ennen koodausta** — "tehdään ensin suunnitelma"
2. **Inkrementaalinen rakentaminen** — testaa jokaisen muutoksen jälkeen
3. **Tiedostojen jakelu:** `/mnt/user-data/outputs/` → `present_files` → GitHub
4. **CDN-cache:** ~10 min → käytä `?v=N`, tarkista `raw.githubusercontent.com`
5. **Security Rules:** Firebase Consolesta JA `tm_admin/firestore.rules` — erilliset
6. **Chrome MCP:** Firestore-kirjoitukset app-tabista (Firebase alustettu)
7. **Super admin testi:** jokainen koodimuutos testattava super-adminilla

---

*CLAUDE.md — TalentMaster™ — Päivitetty 2026-05-02*

---

## 26. RAE-KORJAUS — TIETEELLINEN PERUSTA (2026-05-02)

**Morganti et al. 2025** vahvistaa TalentMasterin RAE-moduulin matemaattisen perustan:

| Löydös | Luku | Merkitys TalentMasterille |
|---|---|---|
| OR BQ1 vs BQ4 UEFA U17:llä | **4.38** (95% CI: 3.52–5.46) | RAE-korjaus on matemaattisesti välttämätön |
| Joukkueet heikolla RAE → bottom 4 | **OR 5.67** | Valmentajalla insentivi syrjiä BQ4 — VP:n johtamiskysymys |
| BQ4 seniorille selviytyminen vs. U17 | **OR 2.80** (1.96–3.98) | Hidden Gem -logiikka on pitkän tähtäimen strategia |
| FIFA-pisteet korrelaatio RAE:hen | **r = .33** | Isompi kilpailu = pahempi RAE = kriittisempi korjata |

**Kriittisin löydös:** *"Raising awareness about RAEs does not contribute to their eradication from youth soccer."*
→ **Pelkkä tietoisuus ei riitä. Systeminen korjaus oletusarvona on ainoa ratkaisu.**

### Arkkitehtuuriperiaate — LUKITTU

**RAE-korjatut pisteet ovat OLETUSARVO kaikkialla.** Ei vaihtoehto.
- VP näkee RAE-korjatut FLEI:t ja kehitysindeksit ensisijaisesti
- Valmentaja näkee RAE-korjatun ADAR-pisteen pelaajan kortissa
- Raaka-arvo näytetään sekundäärisesti pienemmällä

### VP_v22:ssa puuttuu — lisätään seuraavassa sprintissä

1. **BQ-jakauma joukkuekorteissa** — Q1/Q2/Q3/Q4 palkki per joukkue
   - Jos Q1 > 40% → amber: "Joukkueella vahva RAE — tarkista valintakriteerit"
   - Jos Q4 > 25% → teal: "Joukkue hyvä Hidden Gem -tunnistuksessa"
2. **"BQ4-pelaajat" -filtteri** Pelaajat-näkymässä
3. **RAE-bias-indeksi** Kalibraatiopajassa — valmentajan skenaarioissa 2 BQ-tapausta

### Muissa näkymissä puuttuu

- **ADAR Pikakortti:** BQ-kvartiili-chip + "Underdog"-badge BQ4-pelaajille
- **Pelaaja_v7:** Motivaatioviesti BQ4-pelaajalle: "Myöhään syntyneet pelaajat jotka selviytyvät nuorisovaiheesta, menestyvät parhaiten senioritasolla." (Morganti 2025, Brustio 2024)
- **Raportointi (VP):** RAE-jakauma seurassa vs. pilottiseurat — vuosiraporttiin

### Tutkimusviitteet (kaikki validoitu)
- Morganti et al. 2025 — UEFA U17/EM 2024 RAE + turnausmenestys
- Brustio et al. 2024 — "underdog hypothesis" senioritasolle selviytyminen
- Vänttinen & KIHU 2015 — talent wastage, RAE Suomessa
- Mirwald 2002 — PHV/biologinen ikä (jo CLAUDE.md:ssä)

---

## 27. VALMENNUSPÄÄLLIKÖN NÄKYMÄ — VERSIOHISTORIA (2026-05-02)

| Versio | Tila | Keskeiset muutokset |
|---|---|---|
| VP_v19 | Arkisto | Vaalea teema, ei Firebase. Pelaajapolut-filtterit, Kausirakenne-tabi |
| VP_v20 | Arkisto | VP+TD yhdistetty rooli, Kalibraatiopaja, Benchmark |
| VP_v21 | Käytössä | Firebase live-data, tumma teema, React-pohjainen |
| **VP_v22** | **tuotanto — Sprint 3 valmis 2026-05-13** (signaalit + BQ-stack + IDP-jono) | Sivupalkki = Master_v16-pariteetti, mentorointi-loop, joukkuepulssi, VAI, dynaaminen renderSignals, RAE-BQ-jakauma + Underdog, IDP-jono Firestoressa |

### VP_v22 rakenne (canonical)
```
TYÖTILAT:
  Tilanne      — kauden jakso + joukkuepulssi + kriittiset signaalit + IDP-jono
  Valmentajat  — profiilit + mentorointi-paneeli + kalibraatiopaja + kehitysindeksit
  Pelaajat     — IDP-jono + suodattimet (6 kpl) + pelaajataulukko
  Kalenteri    — kaikki testitapahtumat + linkki Testaus_v8 + Harjoitettavuuslomake
  Raportointi  — Head of Talent -koosto + talenttisuositukset + lähetys

TYÖKALUT:
  Arvioi harjoitus  (Sprint 4)

ASETUKSET (sivupalkin pohja):
  Metodologia · Kalibraatio · Kriteeristö · Benchmark
```

### Valmentajan mentorointi-loop (natiivi TalentMasterissa)
VP kirjoittaa viestin valmentajalle → `seurat/{id}/viestit/{valmentajaUid}` → näkyy valmentajan Inboxissa.
Ei sähköpostia, ei Slack-linkkiä. Kaikki TalentMasterin sisällä.

### Sprint 4 -backlog (jää avoimeksi 2026-05-13 jälkeen)

| # | Tehtävä | Peruste |
|---|---|---|
| 1 | **`viimKirjausPvm`-aggregaattikenttä** pelaajadokumenttiin | renderSignals S5 tekee nyt N+1 -kyselyn `kirjaukset`-alikokoelmaan per PHV-pelaaja. Aggregaatti pelaajadokumenttiin (päivitetään kirjauksen yhteydessä) tekee tästä yhden kyselyn. |
| 2 | **`idp_jono` 'ehdotettu' → 'odottaa' migraatio** | Sprint 3 tukee molempia rinnakkain (IN-clause + Rules), mutta vanha data pitää siivota Cloud Functionilla `migrateIdpJonoTila`. |
| 3 | **`renderTalentCards()`** Tilanne-tabin loppuun | v24-referenssin `.talent`-osio: Hidden Gem / X-Factor / Erityistuki -kategoriakortit dynaamisesti `_pelaajat`-datasta. |
| 4 | **Underdog-filtteri Pelaajat-tabiin** | 7. filter-button `BQ4 + FLEI ≥ 60` Morganti 2025 -pohjainen (renderTeamPulse näyttää nyt vain laskurin per joukkue). |
| 5 | **i18n-engine (v24 I18N + t() + applyI18n)** | FI/EN/SV täydellinen — vaatii data-i18n-attribuuttien lisäyksen koko UI:hin. |
| 6 | **Filter-laskurit** suodatinnappuloihin | v24:n malli — chip-numero per kategoria. |

---

## 28. KANSAINVÄLISTYMINEN — PÄIVITETTY STRATEGIA (2026-05-02)

> Luku 21 säilyy, tämä täydentää sitä uusilla havainnoilla.

### RAE-korjaus = kansainvälinen erottautumistekijä

**Miksi DFB, KNVB, FA tai UEFA kiinnostuu TalentMasterista:**
Catapult, VALD, Smartabase — kukaan niistä ei korjaa RAE:tä systemaattisesti. Ne mittaavat.
TalentMaster korjaa. OR 4.38 ja OR 2.80 ovat myyntiargumentit joita ei voi kiistää.

### Kuusi kriittistä puutetta kansainväliseen skaalaan (prioriteettijärjestys)

| Prioriteetti | Ominaisuus | Miksi kriittinen | Sprint |
|---|---|---|---|
| 🔴 1 | **Monikielisyys EN/SE/DE** | Jokainen kv-demo kaatuu tähän | Sprint 3 |
| 🔴 2 | **Exportoitava pelaajaportti** | Skauttiyhteys vaatii | Sprint 4 |
| 🟡 3 | **PHV+RAE-korjattu ranking VP:ssä** | Akatemia-uskottavuus | Sprint 3 |
| 🟡 4 | **Vanhempien sitoutumisindeksi** | VEAT + eurooppalaiset akatemiat | Sprint 5 |
| 🟡 5 | **UEFA-lisenssikytky valmentajaprofiilissa** | DFB/FA-vaatimus | Sprint 5-6 |
| 🟢 6 | **Liittotason aggregaatti (Network-tuote)** | B2G, iso työ | Sprint 8-10 |

### Akateeminen kumppanuus = varsinainen kansainvälistymisavain

Liiton tai akatemian ostopäätös ei tapahdu myyntipuheen vaan **tieteellisen validoinnin** kautta.
KIHU-yhteistyö on jo olemassa (Vänttinen 2015). Seuraava askel:
peer-reviewed artikkeli FLEI-metodologiasta eurooppalaisessa lehdessä (Journal of Sports Sciences / Science & Football).
Yksi artikkeli avaa enemmän ovia kuin kymmenen pilottiseuraa.

### Pelaajan dataoikeudet — arkkitehtuuri-issue

Nykyinen rakenne: `seurat/{id}/pelaajat/{pelaajaId}` — data kiinni seurassa.
Kansainvälinen skaalaus + GDPR Art. 20 (oikeus siirtää data) vaatii pelaajan
datan seuraneutraalisuuden. Pitkän tähtäimen arkkitehtuuri:
`pelaajat/{palloID}` ylätasolle + seuraliitokset viitteillä.
**Ei tehdä nyt** — vaatii ison migraation — mutta kirjataan arkkitehtuurivelaksi.

### Sukupuolten tasa-arvo datassa (SJK-pilotti)

SJK on ensimmäinen seura jolla tyttöjoukkueet mukana. Eerikkilä-normit on eriytetty.
VP_v22:ssa ei vielä sukupuolikohtaisia kehitysindeksejä — lisätään Sprint 4.
UEFA asettanut naisten jalkapallon kehittämisen strategiseksi prioriteetiksi 2024–2028.

### PalloID = infrastruktuuri muille maille

Suomi ainoa maa: kehitysrekisteri + liittodata + seurarekisteri yhdellä tunnisteella.
TalentMasterID voi rakentaa muiden maiden liitoille saman infrastruktuurin.
FIFA Art. 19bis compliance (pelaajien rekisteröinti alle 18v) = B2G-tuote liitoille.

---

## 29. VP-SPRINTTISUUNNITELMA (2026-05–2026-12)

> Sprintti = 2 viikkoa. Pilotti käynnissä, kaikki kehitys testattava pilottiseuroilla.

### Sprint 1 — POHJA (2026-05-02–16) ✅ PÄÄOSIN VALMIS
**Tavoite:** VP_v22 pilottiseuroille, testausketju toimii

- [x] VP_v22.html GitHubiin — sivupalkki, mentorointi, joukkuepulssi
- [x] **Security Rules v2.7 deploy** Firebase Consolesta ✅ 2026-05-14
- [ ] **VP_v22 testaus KPV:llä** — kirjaudu rasmus_broberg@icloud.com, tarkista data
- [x] **Testausketju end-to-end:** Testaus_v9 yhdistää v8 + Harjoitettavuus_v4 + Excel-tuonnin ✅ 2026-05-14
- [x] **BONUS — Testaus_v9** 3112 riviä, yhdistää kolme sovellusta yhden tiedoston sisällä (Suunnittelu, Kenttänäkymä, Tarkastelu) ✅ 2026-05-14
- [x] **BONUS — Excel_Tuonti Sprint 3.1** historiapohja-moodi + writeBatch + TKI + PalloID-ristiintarkistus ✅ 2026-05-13
- [ ] **Valmentajat-kokoelma Firestoreen** — demo-data KPV:lle (Matti, Sari, Jari)
- [ ] **Viestit-kokoelma** — mentorointi-loop testaus VP → valmentaja Inbox

### Sprint 2 — RAE-NÄKYVYYS (2026-05-16–30)
**Tavoite:** RAE-korjaus näkyväksi VP:lle ja valmentajalle

- [ ] **BQ-jakauma joukkuekorteissa** VP_v22 Pelaajat-näkymässä
  - Q1/Q2/Q3/Q4 palkki per joukkue
  - Varoitus jos Q1 > 40%, palkinto jos Q4 > 25%
- [ ] **"BQ4-pelaajat" -filtteri** Pelaajat-suodattimiin (6. filtteri)
- [ ] **RAE-bias-skenaariot** Kalibraatiopajaan — 2 BQ-tapausta valmentajille
- [ ] **ADAR Pikakortti:** BQ-kvartiili-chip + "Underdog"-badge BQ4-pelaajille
- [ ] **Pelaaja_v7:** Motivaatioviesti BQ4-pelaajalle (Morganti 2025 -pohjainen)
- [ ] **VP_v22 Raportointi:** RAE-jakauma-osio Head of Talent -raportissa

### Sprint 3 — MONIKIELISYYS + PHV-RANKING (2026-05-30–06-13)
**Tavoite:** Ensimmäinen kv-demo mahdollinen

- [ ] **tm_lang.js namespace-pohjaiseksi** — VP_v22 käyttää tm_lang.js:ää
  - fi/sv/en VP_v22:lle (144 käännöstä → laajennettava)
  - kieliKartta: vifk→sv, grifk→sv automaattinen
- [ ] **VP_v22 language toggle** topbariin (FI/SV/EN)
- [ ] **PHV+RAE-korjattu FLEI-ranking** Pelaajat-taulukossa
  - Lisäsarake: "PHV-korj. FLEI" vs. raaka FLEI
  - Tooltip joka selittää korjauksen
- [ ] **VP_v22 mobiili** — sivupalkki slide-in mobiiliksi (CLAUDE.md §6 periaate)
- [ ] **GrIFK + VIFK testaus** ruotsinkielisellä UI:lla

### Sprint 4 — PELAAJAPORTTI + SUKUPUOLIDATA (2026-06-13–27)
**Tavoite:** Skautti-yhteistyö mahdollinen, SJK tyttöjoukkueet

- [ ] **Exportoitava pelaajaportti** — "Jaa profiili" -toiminto
  - PDF-generaatio: nimi, FLEI-trendi, ADAR-historia, PHV-tila, BQ-kvartiili, IDP-tavoitteet
  - Shareable link: `talentmasterid.com/pelaaja/{token}` (15v+ pelaajille)
  - Scout-tuote avautuu: `Scout`-tuote transaction-mallilla
- [ ] **Sukupuolikohtaiset kehitysindeksit** VP_v22 Pelaajat-näkymässä
  - Tyttöjoukkueet erillinen tarkastelu vs. pojat
  - Eerikkilä-normit T10–N automaattisesti oikealle sukupuolelle
- [ ] **Arvioi harjoitus -toiminto** VP_v22 Työkalut-valikossa
  - VP voi merkitä havaintoja valmentajan harjoituksista
  - Tallentuu `seurat/{id}/havainnot/{havaintoId}` tyyppi:'vp_arvio'
- [ ] **Master_v16 Testit-työtila → VP_v22 Kalenteri synkronointi** — sama data

### Sprint 5 — VANHEMMAT + UEFA-LISENSSI (2026-06-27–07-11)
**Tavoite:** Ekosysteemin neljäs kerros näkyväksi

- [ ] **Vanhempien sitoutumisindeksi** VP_v22 Pelaajat-näkymässä
  - Kuinka moni vanhempi on kirjautunut viim. 30pv
  - "Sitoutumisaste" per joukkue: korkea/kohtalainen/matala
  - Signaali Tilanne-näkymään jos joukkueessa < 40% vanhemmista aktiivisia
- [ ] **Vanhempi_v2 → Firebase** — kovakoodattu nimi poistetaan
  - `where('huoltajaEmail','==',email)` -logiikka
- [ ] **Valmentajaprofiili: koulutustaso** Valmentajat-kortissa
  - UEFA-lisenssitaso (Grassroots C / B / A / Pro)
  - Viimeisin koulutuspäivä
  - Pohja UEFA-lisenssikytkylle Q4:ssa
- [ ] **P3 Vanhemman app** — "Eemeli" → oikea Firestore-haku
- [ ] **P5 Fiilinki ikäfaasikohtaiseksi** — U13 leikkija-kieli

### Sprint 6 — AI-SIGNAALIMOOTTORI (2026-07-11–08-08)
**Tavoite:** Järjestelmä tunnistaa ja nostaa oleelliset asiat automaattisesti

> Vaatii: kirjausrakenne lukittu + min. 4 viikkoa dataa pilottiseuroilta

- [ ] **AI Behavioural Science agent aktivointi** (CLAUDE.md §19)
  - Firestore trigger → Cloud Function → Anthropic API → pelaajan Inbox
  - Aktivointihetket: streak-katkeaminen, 3pv streak, matala fiilinki 2pv peräkkäin
  - Ikäkohtainen ääni: leikkija (U8-12) / rakentaja (U13-15) / showcase (U16+)
- [ ] **VP:n signaalimoottori** Tilanne-näkymään
  - Automaattinen "Heili, joukkueessa tapahtui X" -signaali
  - Perustuu kirjaustiheysmuutoksiin, FLEI-laskuun, RAE-vinoutumaan
  - Ei kovakoodattuja signaaleja — AI tunnistaa poikkeamat
- [ ] **Streak → Firestore** (pois localStoragesta — pakollinen ennen AI-agenttia)
- [ ] **RAG-valmiuden testaus** — testataan kun 200+ pelaajaa datassa

### Sprint 7 — LIITTOTASO + BENCHMARK (2026-08-08–09-05)
**Tavoite:** Palloliiton ja Head of Talent -tason näkymä

- [ ] **Head of Talent -dashboard** (erillinen sivu tai VP:n Raportointi laajennus)
  - Aggregaatti kaikista pilottiseuroista
  - RAE-jakauma kansallisella tasolla vs. Morganti 2025 -referenssi
  - Tallenttisuositukset Palloliittolle
- [ ] **Palloliiton Power BI -integraatio** KPI-vertailu
  - `https://app.powerbi.com/...` passipassimäärät vs. TalentMaster-rekisteröidyt
- [ ] **Benchmark-tabi Asetuksiin** — Eerikkilä-normit visualisoituna
  - Oma seura vs. pilottiseurat (anonymisoitu)
  - Oma seura vs. kansainväliset normit (DFB, KNVB — julkiset viitearvot)
- [ ] **UEFA Grassroots Charter -raporttipohja** — vientiformaatti liitoille

### Sprint 8-10 — KANSAINVÄLINEN PILOTTI (Q4 2026)
**Tavoite:** Ensimmäinen kv-pilotti käynnistys (Baltia / Ruotsi)

- [ ] **White-label `data-theme`** Firestore-konfiguraatiosta
  - `data-theme="srl"` (Ruotsin liitto), `data-theme="eesti"` jne.
- [ ] **5D-painotusten kalibrointi per markkina** Firestoressä
- [ ] **DE/ET/LV-kielikäännökset** tm_lang.js:ään
- [ ] **Network-tuote MVP** — liittotason lisenssi, B2G-sopimuspohja
- [ ] **Business Finland Tempo -hakemus** (50-100k€ kv-laajentumiseen)
- [ ] **KIHU-yhteistyö** — peer-reviewed artikkeli FLEI-metodologiasta

---

*Lisäykset CLAUDE.md:hen — 2026-05-02*

---

## 30. BIOLOGINEN IKÄ — ARKKITEHTUURI (LUKITTU 2026-05-15)

### Kahden menetelmän jako — eivät kilpaile

| Menetelmä | Kysymys | Käyttötarkoitus | Tila |
|---|---|---|---|
| **PHV (Mirwald 2002)** | "Mitä pelaajassa tapahtuu nyt?" | Harjoittelun ohjaus, kuormarajoitin PHV-huipulla, loukkaantumisriski | ✅ Toteutettu — `src/lib/tm_bioika.js` |
| **Khamis-Roche (1995 erratum)** | "Kuinka kypsä pelaaja on suhteessa muihin?" | Bio-banding, ryhmittelypäätökset, kypsyysprosentti %PAH | ⏳ Sprint 4 — kertoimet verifioitava |

Tämä jako tuli Eerikkilän/Palloliiton virallisesta MyEWay-linjauksesta. **Ei pidä valita vain toista — molemmat tarvitaan**, mutta eri tarkoituksiin.

### PHV — Mirwald 2002 (Excel-verifioitu identtiseksi)

**Lähde:** Mirwald RL et al. Med Sci Sports Exerc 2002;34(4):689-694
**Toteutus:** `src/lib/tm_bioika.js` — `laskeMirwald()` + `laskeBioIkaDokumentti()` + `bioIkaTallennusOperaatiot()`
**Verifiointi:** `TalentMaster_BioIka.xlsx` purettu ZIP-XML-tasolla 2026-05-14 → kaikki 11 kerrointa identtiset (pojat 5 kerrointa, tytöt 6 kerrointa) + PHV-tilan kynnykset (5 kategoriaa) + yli-ikäisyystaulukko (12 kk × 2 sukupuolta).

**Tarvittavat muuttujat (kaikki pakolliset):**
- `ika` (vuosi, desimaali) — lasketaan `syntymapaiva`-kentästä `Date.UTC()`-jäsennyksellä
- `pituus` (cm) — seisomapituus, **2× mittausta keskiarvolla**
- `paino` (kg) — **2× mittausta keskiarvolla**
- `istumapituus` (cm) — **1× mittaus** (kriittinen — ilman tätä Mirwaldia ei voi laskea)
- `sukupuoli` (`'P'` / `'T'`) — erilliset kaavat pojille ja tytöille

**Tulosmuuttujat:**
- `maturity_offset` — vuosia PHV-huipusta (negatiivinen = ennen, positiivinen = jälkeen)
- `phv_ika = ika − offset`
- `phv_tila_koodi`: `PRE` (< −1.0v) · `LAH` (−1.0 .. −0.5v) · `PH` (±0.5v) · `POST` (+0.5 .. +1.0v) · `AN` (> +1.0v)
- `yli_ikaisyys.poikkeuslupa` — Palloliiton virallisen taulukon mukaan (sis. `tm_bioika.js`:ssä)

**`phv_tila === 'PH'` → kuormarajoitin aktivoituu:** voimaharjoittelu max 80% 1RM, hyppyvolyymi -20%, juoksuvolyymi seurattava.

### Khamis-Roche — Sprint 4 (kertoimet verifioitava)

**KRIITTINEN:** Alkuperäinen Khamis & Roche 1994 -julkaisu sisälsi **virheellisesti kirjattuja kertoimia**. Käytettävä **korjattua versiota**: Pediatrics 1995;95:457 erratum. Tämä selittää miksi KR oli aiemmin "intentionaalisesti poistettu" — eri kirjallisuuslähteissä oli eri versioita.

**Tarvittavat lisäykset:**
1. `kr_isa_cm` ja `kr_aiti_cm` pelaajadokumenttiin (kerätään suostumuslomakkeella)
2. KR-kertoimet 4 ikäryhmälle (4–9v, 9–14v, 14–18v) × 2 sukupuolta — puolen vuoden intervallit + lineaarinen interpolointi
3. `predicted_adult_height_cm` ja `pah_pct = pituus / predicted × 100` -laskenta
4. UI: pelaajakortissa "%PAH" -kypsyysprosentti PHV:n rinnalle

**Midparent height (sukupuolikorjattu):**
- Pojat: `(isa + aiti + 13) / 2`
- Tytöt: `(isa + aiti − 13) / 2`

**Fallback puuttuville vanhempien pituuksille** (THL FinRavinto 2017, 25–34v ikäryhmä):
- Isät: 179 cm (EI 181 — aiemmin käytetty arvo oli yläkanttiin)
- Äidit: 166 cm (EI 168)
- **Pakollinen:** UI merkitsee selvästi "arvio — vanhempien pituudet puuttuvat"

**Tyttöjen KR:** Julkaistu keskivirhe pojilla 5.6 cm, tytöillä 4.3 cm → KR on tytöillä tarkempi kuin pojilla. SJK U14/15T voidaan aktivoida KR:n osalta kunhan Erratum-kertoimet implementoitu.

**Etninen kalibrointi:** KR kehitettiin Fels Longitudinal Study -aineistosta (valkoihoiset pohjoisamerikkalaiset). Suomalainen populaatio on homogeeninen → KR toimii hyvin, mutta maahanmuuttajataustaisten pelaajien osalta tarkkuus voi heiketä. Ei estä käyttöä — kirjataan rajoituksena.

### Vanhempien pituuksien tiedonkeruu

**Päätös 2026-05-14:** Suostumuslomake on luontevin keruupiste. Huoltaja on jo lomakkeella, motivaatio täyttää on korkea (rekisteröinti edellyttää).

**Rekisteröintilomakkeeseen lisättävät kentät (Sprint 4):**
- "Isän pituus senttimetreinä (vapaaehtoinen, esim. 179)" — validointi 140–220 cm
- "Äidin pituus senttimetreinä (vapaaehtoinen, esim. 166)" — validointi 130–200 cm
- Pakollisia EIVÄT ole — adoptio, yksinhuoltajuus, biologinen vanhempi tuntematon. Null-arvoilla käytetään fallbackia merkillä "arvio".
- **GDPR:** Informointitekstiin lisättävä maininta — vanhempien pituutta käytetään biologisen kypsyyden arviointiin
- **Päivitettävyys:** Seura.html:n muokkausmodaaliin ja/tai Admin-näkymään lisätään kr_isa_cm / kr_aiti_cm -kentät myöhempää korjausta varten

### Firestore-rakenne

**Pelaajadokumentti** `seurat/{sid}/pelaajat/{pid}` — pikakentät (päivitetään uusimman mittauksen yhteydessä):
```
biologinenIka_viimeisin: { ... koko viimeisin mittausdokumentti ... }
phv_tila: 'PRE'|'LAH'|'PH'|'POST'|'AN'   // VP-näkymä lukee tästä
kr_isa_cm: number | null                  // Sprint 4
kr_aiti_cm: number | null                 // Sprint 4
```

**Mittaushistoria** `seurat/{sid}/pelaajat/{pid}/biologinen_ika/{mittauspvm}` — kasvun seuranta yli ajan. **TARVITSEE OMAN RULES-BLOKIN** (Firestore ei periydy alikokoelmiin):
```javascript
match /seurat/{seuraId}/pelaajat/{pelaajaId}/biologinen_ika/{mittausPvm} {
  allow read:   if onSuperAdmin() || onSeuranJasen(seuraId) || onHuoltaja();
  allow create: if onSuperAdmin() || onOmanSeuranValmentaja(seuraId);
  allow update: if onSuperAdmin() || onOmanSeuranValmentaja(seuraId);
  allow delete: if onSuperAdmin();
}
```

⚠️ **TARKISTA — onko tämä blokki Rules v2.7:ssä?** Jos ei, lisättävä ennen kasvumittausprotokollan aktivointia.

### Kasvumittausprotokolla Testaus_v9:ään (suunniteltu)

**PROTOKOLLAT-objektiin lisättävä:**
```javascript
kasvumittaus: {
  nimi: 'Kasvumittaus (Mirwald PHV)',
  ikäluokka: 'U10–U19',
  tyyppi: 'kasvu',
  testit: [
    { id: 'pituus',       nimi: 'Seisomapituus', yksikko: 'cm', yritykset: 2, laskentatapa: 'keskiarvo' },
    { id: 'paino',        nimi: 'Paino',         yksikko: 'kg', yritykset: 2, laskentatapa: 'keskiarvo' },
    { id: 'istumapituus', nimi: 'Istumapituus',  yksikko: 'cm', yritykset: 1 }
  ]
}
```

**KRIITTINEN bugi v9:n nykyisessä logiikassa:** `_v5SyotaYritys` laskee "parhaan" (pienin/suurin) eikä keskiarvoa. Kasvumittaukselle pitää lisätä uusi laskentatapa:
```javascript
if (testi.laskentatapa === 'keskiarvo' && arvot.length > 0) {
  obj.paras = +(arvot.reduce((a,b) => a+b, 0) / arvot.length).toFixed(2);
}
```

**Tallennus kahteen polkuun** (kuten testitapahtumat):
1. Alikokoelma `biologinen_ika/{mittauspvm}` — historia
2. Pelaajadokumentin pikakentät — VP:n nopea haku

**Mittausaika kentällä:** ~3–4 min / pelaaja → 20 pelaajan joukkue ~80 min, sopii yhteen treenisessioon.

**Mittausväli:** U10–U12 2×/v · U13–U15 3×/v (paras seuranta PHV-vaiheessa) · U16–U19 1–2×/v

### Periaate — älä toista näitä virheitä

- **Älä kopioi tm_bioika.js:ää uudelleen** — repon versio on auktoritatiivinen (287 riviä, Excel-verifioitu). Aiempien sessioiden aikana kirjoitettu kopio `laskeKaikki()` / `muodostaFirestoreData()` -APIlla on tarpeeton.
- **Älä lisää KR:tä ilman Erratum 1995 -kertoimien verifiointia** — virheellinen aikuispituusennuste on pahempi kuin ei ennustetta lainkaan
- **Älä unohda interpolointia** — KR-kertoimet on julkaistu puolen vuoden intervalleilla, murto-iille tarvitaan lineaarinen interpolointi
- **Älä käytä yläkanttiin olevaa fallbackia** vanhempien pituuksille — johtaa systemaattisesti liian suuriin ennusteisiin
- **Mittaa pituus ja paino 2×, istumapituus 1×** — Excelin protokolla, älä yksinkertaista

---

*Lisäykset CLAUDE.md:hen — §30 lisätty 2026-05-15 (sessio 2026-05-12 → 2026-05-15)*
