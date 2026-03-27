# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-03-27

---

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon talenttiarviointiin ja pelaajien kehitysseurantaan. Asiakas on seura, ei yksittäinen valmentaja. Filosofia: *"Pelaaja ensin, hallinto vahvistaa."*

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla) | GitHub Pages |
| Tietokanta | Firebase Firestore | europe-west1 |
| Autentikointi | Firebase Authentication | Email/Password |
| Cloud Functions | Node.js (europe-west1) | Firebase |
| Sähköposti | Gmail/Nodemailer | Cloud Functions |
| Admin-skriptit | Node.js + Firebase Admin SDK | GitHub Actions |
| CI/CD | GitHub Actions (`FIREBASE_SERVICE_ACCOUNT` secret) | GitHub |
| Pelaajadata (historia) | tm_data.js (staattinen) | GitHub Pages |

**Firebase plan:** Blaze (maksullinen) — tarvitaan Cloud Functions ja sähköpostilähetys

---

## Firestore-tietokantarakenne

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/                        ← fcl, kpv, palloiirot, yvies, sjk, grifk, hjk, demo-fc
    id, nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    ominaisuudet[], roolit[]
    max_pelaajia, tilastot{}
    luotu

    joukkueet/{joukkueId}
    kirjaukset/{kirjausId}          ← VP:n harjoitteluseurantakirjaukset
    kartoitukset/{kartoitusId}      ← Harjoitettavuuskartoitukset U12/U15/U19 + bio-ikä
    testit/{testiId}                ← H-H-testit, tekniikkakilpailut
    havainnot/{havaintoId}          ← Valmentajan kenttähavainnot (TULOSSA)
    adar/{adarId}                   ← Game IQ / ADAR-arvioinnit (TULOSSA Firebase-integraatio)
    kuorma/{kuormaId}               ← RPE ja kuormaseuranta
    vammat/{vammaId}                ← Kuntoutusdata (arkaluonteinen)
    kayttajat/{kayttajaId}          ← Seuran käyttäjät ja roolit

    pelaajat/{pelaajaId}            ← PalloID on dokumentin ID
      nimi, syntymäaika, joukkue
      flei_viimeisin                ← Päivittyy kartoituksen tuonnin yhteydessä
      phv_ika, phv_tila             ← Bio-ikä-kartoituksesta
      bio_ika, yliikaisyys_ok       ← Yli-ikäisyyssäännön tulos
      streak, havainnot             ← Master v7 motivaatiomoottori
      idp_kausi, adar               ← IDP ja Game IQ
      idp_taso, ketjut              ← IDP-aktivointi ja hallintaketjut
      arviointi_tyyppi              ← 'quick_scan' / 'deep_assessment' per dimensio (TULEVA)

kirjaukset/                         ← Vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/                 ← Vanha rakenne (yhteensopivuus)
kirjaukset_tapahtumat/              ← Vanha rakenne (yhteensopivuus)
```

---

## Datavirrat

### Kirjautuminen
```
Käyttäjä syöttää sähköpostin + salasanan
  → Firebase Auth tunnistaa käyttäjän
  → Firestore hakee seura-dokumentin (vp_uid == user.uid)
  → initDash() asettaa oikean seuran
  → Session-load hakee seuran kirjaukset Firebasesta
  → LocalStorage päivittyy välimuistina
```

### Testipaketti-datavirta (kaksi polkua)
```
POLKU A — Harjoitettavuuskartoitus
  Valmentaja/testivastaava täyttää TalentMaster_Harjoitettavuus.xlsx
    → U12/U15/U19 välilehti → pisteet 1-3 per testi
    → FLEI-%, FLEI-taso, kuormarajoitin laskevat automaattisesti
  VP lataa Excel VP-dashboardin tuonti-tabiin
    → SheetJS lukee tiedoston
    → Tunnistaa ikäluokan välilehden nimestä
    → Kirjoittaa kartoitukset/-kokoelmaan
    → Päivittää pelaajan flei_viimeisin-kentän

POLKU B — Bio-ikä-kartoitus (erillinen, yksittäinen pelaaja)
  Fysiikkavalmentaja/valmentaja mittaa harjoituksen yhteydessä (5 min):
    pituus × 2, paino × 2, istumapituus, syntymäpäivä
    → TalentMaster_BioIka.xlsx laskee Mirwald-kaavalla PHV-iän
    → Yli-ikäisyyssääntö tarkistetaan automaattisesti (VLOOKUP)
  Tulos tallennetaan pelaajan profiiliin:
    phv_ika, phv_tila, bio_ika, yliikaisyys_ok
  VP näkee signaalin dashboardissa:
    yliikaisyys_ok === true → "Poikkeuslupa mahdollinen" -kortti
```

### Onboarding-ketju
```
Super Admin luo seura + joukkueet
  → Seuran Admin täyttää Excel-pohja pelaajilla
  → Järjestelmä tuo pelaajat (PalloID = dokumentin ID)
  → Huoltaja saa suostumuslomake-linkin sähköpostilla (Cloud Function)
  → Pelaajan profiili aktivoituu suostumuksen jälkeen
```

---

## Security Rules — kolmitasoinen tunnistus

```javascript
// VP tunnistetaan kolmella tavalla (tärkeysjärjestyksessä):
// 1. Super-admin (talentmasterid@gmail.com) — lukee kaiken
// 2. Custom claim: request.auth.token.seuraId + rooli
// 3. vp_uid seura-dokumentissa: resource.data.vp_uid == request.auth.uid
```

Tiedosto: `tm_admin/firestore.rules` (Security Rules v2)

---

## GitHub Pages URL:t

```
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_VP_v17.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v7.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_IDP_Kortti_v3.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Harjoitettavuus.xlsx
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_BioIka.xlsx
```

---

## Pelaajadata: kaksi lähdettä

### 1. Historiallinen data (tm_data.js)
- 2417 pelaajaa, 30 seuraa, kaudet 2017-2020
- Staattinen tiedosto, latautuu selaimeen
- Ei sisällä pilottiseuroja

### 2. Reaaliaikainen data (Firebase)
- Pilottiseurojen data — PalloID on Firestore-dokumentin ID
- Kartoitukset, bio-ikä, havainnot, kirjaukset
- Kirjautuneen käyttäjän seura tunnistetaan automaattisesti

---

## 7-kerrosinen järjestelmäarkkitehtuuri

```
1. Pelaaja / Master v7          ← motivaatiomoottori (streak, havainnot)
2. Valmentaja / kenttähavainto  ← ADAR + 10s havaintomalli (TULOSSA)
3. Game IQ / D4 / koulutus      ← ADAR-protokolla ikäluokittain (Firebase TULOSSA)
4. IDP-kortti v3                ← 70% vahvuudet / 30% heikkoudet
5. IDP-aktivointi               ← 3 reittiä: manuaalinen / auto-signaali / KORI
6. VP / johtamisjärjestelmä     ← tiedolla johtaminen
7. Fyysinen → teknis-taktinen   ← FLEI + bio-ikä + kehityskaari
```

Kaikki kerrokset yhdistyvät Firestore-kenttiin:
`streak`, `havainnot`, `idp_kausi`, `adar`, `idp_taso`, `ketjut`

---

## Testipaketti-Excel-pohjaksi

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_Harjoitettavuus.xlsx` | U12/U15/U19 kartoituslomake, FLEI-kaavat | ✅ Valmis |
| `TalentMaster_BioIka.xlsx` | Mirwald + yli-ikäisyyssääntö | ✅ Valmis |
| `TalentMaster_HH_Testit.xlsx` | H-H-testimanuaalin testit | ⚠️ Ei vielä rakennettu |
| `TalentMaster_Pelaajapohja.xlsx` | Pelaajatietolomake (dynaaminen) | ⚠️ Ei vielä rakennettu |

VP_v17.html hakee pohjat GitHubista, lukee SheetJS:llä ja kirjoittaa Firestoreen.
**Tuontilogiikka Firestoreen puuttuu** — seuraavan sprintin tehtävä.

---

## Pakettitasot

| Paketti | Roolit | Max pelaajia | Ominaisuudet |
|---|---|---|---|
| Perustaso | VP, valmentaja, testivastaava | 100 | Kirjaukset, kartoitukset, profiilit |
| Kehitystaso | + talenttivalmentaja, fysiikkavalmentaja | 300 | + bio-ikä, Game IQ, talenttiohjelma |
| Huipputaso | Kaikki roolit | Rajaton | Kaikki + delta-analyysi, DVI |

---

## Roolit (10 kpl)

1. Super Admin (TalentMaster)
2. Valmennuspäällikkö (VP)
3. Urheilutoimenjohtaja
4. Talenttivalmentaja
5. Fysiikkavalmentaja
6. Fysioterapeutti
7. Testivastaava
8. Valmentaja
9. Pelaaja
10. Vanhempi

---

## 5D-viitekehys

| Dimensio | Paino | Mittarit |
|---|---|---|
| D1 Fyysinen | 40% | Harjoitettavuuskartoitus + bio-ikä (Mirwald) |
| D2 Tekninen | 25% | H-H-testit + tekniikkakilpailut |
| D3 Kognitiivinen (Game IQ) | 15% | ADAR-arvioinnit (Firebase TULOSSA) |
| D4 Psykologinen | 10% | Valmentajan arvio + kyselyt |
| D5 Sosiaalinen | 10% | Peer review + havainnointi |

**Huom:** Painotukset oikeat KUN D1 on biologisesti normalisoitu Mirwald-kaavalla.
Quick Scan™ tuottaa alustavat arvot, Deep Assessment vahvistaa.

---

## Bio-ikä ja yli-ikäisyyssääntö

### Mirwald 2002 -kaava
```
Pojat: Maturity offset = -9.236 + 0.0002708*(jalka*istuma)
       - 0.001663*(ika*jalka) + 0.007216*(ika*istuma) + 0.02292*(paino/pituus*100)
Tyto: Maturity offset = -9.376 + 0.0001882*(jalka*istuma)
       + 0.0022*(ika*jalka) + 0.005841*(ika*istuma)
       - 0.002658*(ika*paino) + 0.07693*(paino/pituus*100)
PHV-ika = kronologinen ika - maturity offset
```

### Yli-ikäisyyssääntö (Palloliitto)
- Kynnys = APHV − 0.75 vuotta per syntymäkuukausi
- Pojat: tammikuu 14.97 → joulukuu 14.05
- Tytöt: tammikuu 13.07 → joulukuu 12.15
- Jos PHV-ikä ≥ kynnys → `yliikaisyys_ok: true` → VP-signaali

---

## Navigaatiostrategia

- `tm_import.js` + `tm_empty_state.js` integroitu NYT
- `tm_nav.js` siirretty myöhemmäksi — lisätään VASTA kun Master v8 + Pelaaja-näkymä valmis
  - Syy: tm_nav lisää oman topbarin body-alkuun → konflikti olemassa olevien topbarien kanssa
  - ja kaksinkertaiset `onAuthStateChanged`-kuuntelijat

---

## Deployment-prosessi

```
1. Muutos tehty paikallisesti / GitHub web-editorissa
2. Commit + push → main-branch
3. GitHub Actions käynnistyy automaattisesti
4. Firebase Functions deploy: setup_firebase.yml → deploy_functions
5. GitHub Pages: automaattinen deploy main-branchista
6. Muistettava: GitHub Pages käyttää Fastly CDN → Ctrl+Shift+R hard reload
```

**Palomuuri:** Työkoneella palomuuri estää Git/CLI-komennot → kaikki deployments GitHub Actionsin kautta `FIREBASE_SERVICE_ACCOUNT`-secretillä. Ei koskaan committoi `serviceAccountKey.json` julkiseen repoon.
