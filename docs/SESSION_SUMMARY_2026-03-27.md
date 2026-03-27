# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-03-27)

TalentMaster on jalkapallon talenttiarviointialusta. Firebase-backend toimii (Blaze-plan), 7 pilottiseuraa + demo-fc aktiivisena. Kehitys on vaiheessa jossa rakennetaan testipaketti-Excel-pohjat (harjoitettavuus + bio-ikä), VP-dashboardin tuontilogiikkaa ja Palloliiton koulutusyhteistyötä.

**Strateginen avaus 27.3.2026:** Palloliiton Head of TalentID -tapaamiseen on valmisteltu koulutuskokonaisuus-esittelydokumentti. Suomessa ei ole tällaista koulutusrakennetta — tämä on merkittävä mahdollisuus.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard | ✅ Toimii, KRT-tab |
| `TalentMaster_Seura.html` | Seuran hallintanäkymä | ✅ Toimii |
| `TalentMaster_IDP_Kortti_v3.html` | Pelaajan kehityskortti | ✅ Tiedot-nappi linkitetty |
| `TalentMaster_Admin.html` | Admin-näkymä | ✅ Toimii |
| `TalentMaster_Rekisterointi_Suostumus.html` | Huoltajan suostumus | ✅ |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä | ✅ |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | ✅ |
| `functions/index.js` | 6 Cloud Functionia | ✅ |
| `tm_admin/firestore.rules` | Security Rules v2 | ✅ |
| `TalentMaster_Harjoitettavuus.xlsx` | U12/U15/U19 kartoituslomake | ⚠️ VIE GITHUBIIN |
| `TalentMaster_BioIka.xlsx` | Mirwald + yli-ikäisyyssääntö | ⚠️ VIE GITHUBIIN |
| `TalentMaster_Koulutuskokonaisuus_Palloliitto.html` | Palloliiton esittely | ⚠️ VIE GITHUBIIN |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore, europe-west1

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
| vp.demo@talentmaster.fi | (demo-fc) | VP | Demo FC |

### Demo FC — demo-tunnukset
- **Kirjautuminen:** `vp.demo@talentmaster.fi` / `TM_Demo_2026!`
- IDP Aleksi: `...TalentMaster_IDP_Kortti_v3.html?seuraId=demo-fc&pelaajaId=demo-p001`
- IDP Eeli: `...?seuraId=demo-fc&pelaajaId=demo-p002`
- IDP Matias: `...?seuraId=demo-fc&pelaajaId=demo-p003`

---

## TÄNÄÄN TEHTY (2026-03-27)

### 1. TalentMaster_Harjoitettavuus.xlsx ✅
- Rakennettu HPP ELITE v9 välilehdistä 16/17/18
- U12 (9 testiä, 27p max), U15 (13 testiä, 39p max, PHV-varoitus), U19 (8 testiä, 24p max)
- FLEI-%, FLEI-taso, kuormarajoitin laskevat automaattisesti
- Auto-ohjelma-välilehti (fascia → harjoitekirjasto)
- VP_v17.html hakee: `https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Harjoitettavuus.xlsx`

### 2. TalentMaster_BioIka.xlsx ✅
- Mirwald 2002 -kaava pojille JA tytöille (eri kertoimet)
- Syötteet: pituus×2, paino×2, istumapituus, syntymäpäivä, testipäivä
- Ikä, jalkojen pituus, maturity offset, PHV-ikä, PHV-tila — kaikki automaattisia
- Yli-ikäisyyssääntö: VLOOKUP syntymäkuukauden mukaan → KYLLA/EI automaattisesti
- Kynnykset pojat: tammikuu 14.97 → joulukuu 14.05
- Kynnykset tytöt: tammikuu 13.07 → joulukuu 12.15
- Validointi: testaa Person 1 (poika, 163cm, 50kg, istuma 117.1cm) → PHV-ikä ~14.60
- VP_v17.html hakee: `https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_BioIka.xlsx`

### 3. Arkkitehtuuripäätökset ✅
- Bio-ikä = erillinen kartoitus (ei osa harjoitettavuuskartoitusta) — eri rytmi, tekijä, käyttötarkoitus
- Firestore-kentät: `phv_ika`, `phv_tila`, `bio_ika`, `yliikaisyys_ok`
- Testipaketti: Polku A (harjoitettavuus, koko joukkue) + Polku B (bio-ikä, yksittäinen pelaaja)
- Painotukset (40/25/15/10/10) oikeat kun fyysinen biologisesti normalisoitu — ei muuteta

### 4. Metodikirja-syväanalyysi ✅
- v3 + lisäosa luettu kokonaan
- Tutkimuspohja vahva: Höner 2021 (N=13 869), Triggs 2025 (55 tutkimusta), Johnston & Baker 2025
- Kriittinen jännite: Seura-tuote vs Elite-tuote — ratkaistaan koulutustasoin myöhemmin
- T6 Oppimiskyky/DVI-potentiaali on aito innovaatio — ei löydy muualta

### 5. TalentMaster_Koulutuskokonaisuus_Palloliitto.html ✅
- Sama visuaalinen tyyli kuin VEAT-esittely
- **4 kohtausta:** Lähtökohta → Koulutus → TalentID → Yhteistyöehdotus
- Täysin ilman teknistä sanastoa
- Koulutus joustavana: itsenäinen / lisämoduuli / VEAT-välitehtävä
- Taso 1: Pelaajan kehityksen arviointi
- Taso 2: Oikeudenmukainen arviointi
- Taso 3: Kehityksen johtaminen tiedolla (VEAT-loppunäyttö instrumentoituna)
- Moduuli A: Pelin ymmärtäminen (Game IQ sisältö)
- Moduuli B: Talentin tunnistaminen (TalentID/Hidden Gem sisältö)
- Pilottiehdotus: 3 seuraa, 1 kausi, VEAT-välitehtävät

---

## SEURAAVAT TEHTÄVÄT — PRIORISOITU

### VÄLITÖN (ennen seuraavaa sessiota)
1. Vie GitHubiin: `TalentMaster_Harjoitettavuus.xlsx`
2. Vie GitHubiin: `TalentMaster_BioIka.xlsx`
3. Vie GitHubiin: `TalentMaster_Koulutuskokonaisuus_Palloliitto.html`
4. Validoi BioIka.xlsx testaamalla Mirwald-esimerkkihenkilöillä

### SPRINT 3 — tekninen
5. VP-näkymä: yli-ikäisyys-signaalikortti (pelaajat joilla `yliikaisyys_ok === true`)
6. Tuontilogiikka Firestoreen — SheetJS → kartoitukset-kokoelma + pelaajan `flei_viimeisin`
7. Valmentajan kenttähavainto Firestoreen (10s, 3 tyyppiä: vahvistus/kehityshavainto/erityinen hetki)
8. `TalentMaster_HH_Testit.xlsx` — kolmas testipaketti-pohja

### SPRINT 4 — strateginen
9. Palloliiton Head of TalentID -tapaaminen (esittely valmis)
10. Pelaaja-linkitys: kartoitus → `flei_viimeisin` pelaajan profiiliin
11. Kehityskaari VP:lle: kevät vs. syksy Δ per fascia-linja

### MYÖHEMMIN
12. Game IQ Firebase-integraatio (`adar/`-kokoelma olemassa)
13. Master v8 (coach mobile) — prerequisite tm_nav.js:lle
14. Pelaaja-näkymä
15. Excel-pohjan automaattinen joukkuetäyttö (openpyxl Cloud Function)

---

## TUNNETUT RATKAISUT (päivitetty 27.3.2026)

1. Firestore Rules: `allow create` JA `allow update` molemmat tarvitaan
2. Syntymäaika: `Date.UTC()` — ei `new Date(string)`
3. `onAuthStateChanged`-silmukka: `_kirjautuminenKesken`-lippu
4. tm_nav.js: lisätään VASTA Master_v8 + Pelaaja-näkymä valmis
5. GitHub Pages CDN: `Ctrl+Shift+R` hard reload
6. Firebase custom claims: kirjaudu ulos+sisään aktivoinnin jälkeen
7. Firestore alikokoelmat: poista `orderBy`, järjestele JS:ssä
8. Security Rules: VP kolme tunnistustapaa (super-admin / custom claim / vp_uid)
9. FIREBASE_SERVICE_ACCOUNT: kokeile JSON.parse, sitten base64
10. Firebase-only seurat: rekisteröi `_seuraData`:han dynaamisesti
11. Mirwald-kaava Excelissä: pojat/tytöt IF-haara `D{r}="P"`
12. Yli-ikäisyys VLOOKUP: `MONTH(syntymäpäivä)` → kynnysarvo-taulukko
13. VP_v17 KRT-tab: `krtLaskeKetjupisteet()` + `krtLaskeAutoOhjelma()` tallentavat automaattisesti
