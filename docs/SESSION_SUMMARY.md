# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-03-27)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 6 aktiivista pilottiseuraa. Firebase-backend toimii (Blaze-plan). Kaikki 6 tiedostoa GitHubissa. Kehitys on vaiheessa jossa fascia-linja -integraatio Firestoreen rakennetaan seuraavaksi.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot (kaikki GitHubissa, bugikorjattu 2026-03-27)

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard | Bugikorjattu ✅ |
| `TalentMaster_Seura.html` | Seuran hallintanäkymä | Bugikorjattu ✅ |
| `TalentMaster_IDP_Kortti_v3.html` | Pelaajan kehityskortti | Bugikorjattu ✅ |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake | Bugikorjattu ✅ |
| `TalentMaster_Admin.html` | Super-admin näkymä | Toimii |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä | Toimii |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | Toimii |
| `functions/index.js` | 6 Cloud Functionia | Toimii |

### Bugikorjaukset 2026-03-27 (11 korjausta)
- Seura.html: enablePersistence poistettu, _seuraLadataan-lippu lisätty
- IDP_Kortti_v3.html: 3× orderBy .catch() lisätty
- Rekisterointi_Suostumus.html: pelaajaId validointi + .trim()
- VP_v17.html: kyrillinen kirjain korjattu, nappi-bugi, querySelector, 2× orderBy .catch()

---

## Firebase

- **Projekti:** `talentmaster-pilot`
- **Plan:** Blaze (pay-as-you-go, käytännössä ilmainen pilotissa)
- **Tietokanta:** Firestore, europe-west1
- **Auth:** Email/Password käytössä

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

---

## Kokonaisarkkitehtuuri — 7 kerrosta

**Kerros 1 — Raakadata:** harjoitettavuus (FLEI), H-H testit (Palloliiton manuaali 2024), SM-pallo (kaksoismerkitys: fyys+tekn), ADAR/Game IQ

**Kerros 2 — Fascia-linjat (HPP ELITE -viitekehys):**
- SBL = Vauhtiketju (10m, CMJ, Nordic)
- SFL = Lähtöketju (CMJ vapaa, Thomas, hip thrust)
- LL = Suunnanmuutosketju (T-test, 505, Y-balance)
- SL = Kiertoketju (RST, rotaatio, SM-pallo)
- DFL = Hallintaketju (deep squat, SEBT, dead bug, lankku)
- FL = Yhdistelmäketju (diagonal throw, SL hop, seinäsyöttö)

**Kerros 3 — Pelaajan identiteettiprofiili (Firestore-ankkuri):**
PalloID · Firebase UID · ikä · biologinen ikä (Mirwald 2002) · PHV-vaihe · positio · RAE-kvartiili · FLEI% · ketjupisteet (6 linjaa) · TSI · ADAR · IDP-taso · X-Factor-signaali · profiilityyppi · D1-D5 · kehitysvauhti

**Kerros 4 — Toimenpide-ohjaus:**
- Auto-ohjelma: 1p → fascia-linja → aktivointi + taso 1 harjoite + kenttäcue
- IDP-aktivointi 3 reittiä: manuaalinen / FLEI<40% / X-Factor
- X-Factor: kaikki ketjut ≥2 → signaali → KORI-kriteerit Palloliitolle

**Kerros 5 — Kotitehtävät (rakennetaan):**
Pallollinen tekninen + fyysinen liikkuvuus per liikeketju. Streak-mekaniikka (Duolingo-efekti). Forsman 2013: omatoiminen harjoittelu erotteli lahjakkaita kaikissa ikäluokissa.

**Kerros 6 — Näkymät:**
- Pelaaja: vahvuudet selkokielellä, streak, XP, profiilityyppi (Railgun/Maestro/Shadowstep/Titan)
- Vanhempi: FLEI selkokielellä, kotitehtävät, PHV-kuormitusrajoitukset
- Valmentaja: joukkueen heikoin ketju, kenttäcue, 4 hetken malli
- VP/Seura: FLEI-jakauma, kehitysvauhti, KORI-kriteeri, talenttiohjelma-tila

**Kerros 7 — Seuran identiteetti ja valmennuslinja (rakennetaan):**
Seura määrittelee tavoitteensa ("nopea, taitava, älykäs") → järjestelmä mittaa automaattisesti ketjupisteet, TSI, ADAR yli ajan → VP näkee "tuotammeko millaisia pelaajia kuin tavoittelemme?"

---

## 70/30-harjoitteluohjelmointi

Koskee alkurutiinia (20-30 min ennen kenttäharjoitusta):
- **70% yhteinen:** kaikki 5 liikeketjua aktivoidaan, tekninen pääharjoite kiertää 2 heikointa ketjua/vk
- **30% yksilöllinen:** pelaajan heikoin liikeketju (1p → fascia-linja → harjoite + cue)
- Kenttäharjoitus on täysin valmentajan — TM ei koske siihen

Ikäluokkakohtaisesti: U12=100% kehonpaino, U15=max 60% PHV-huipulla, U19=normaali progressio

---

## SM-pallo — kaksoismerkitys

H-H testi (fyysinen): SL-ketjun räjähtävyys + suunnanmuutos pallon kanssa. 10m rata, 2 suoritusta.
Tekniikkaindeksi: `TSI = SM-pallo - SM-juoksu`. TSI ≤ 0.3s = Tekniikka-XF.

---

## Harjoitettavuuskartoitus — viitearvot täsmäävät 72/72

U12: 9 testiä (5 laadullista + 4 numeerista), max 27p
U15: 10 testiä + vaihtoehtoistestit (testi4/testi6), max 30p
U19: 13 testiä (5 voimatestiä 5RM + 8 muuta), max 39p
FLEI-rajat: ≥75%=hyvä, 60-74%=kehitys, <60%=prioriteetti (TM-spesifinen)
Brzycki-kaava: `nostettu kuorma / (1.0278 - (0.0278 × toistot))`

---

## Seuran identiteetti ja valmennuslinja — konsepti

Kaikki maailman parhaat akatemiat (Ajax TIPS, FCN Right to Dream, Benfica 360°) kertovat selkeästi "millainen seura olemme ja millaisia pelaajia tuotamme." TalentMaster lisää konkreettiset mittarit tavoitteisiin:
- "Nopea" → 10m sprint -jakauma ikäluokittain + kehitysvauhti
- "Taitava" → TSI-jakauma + pujottelu + SM-pallo
- "Älykäs" → ADAR-pistetaso + pre-scanning -havainnot

Seura asettaa tavoitteet → järjestelmä seuraa automaattisesti → VP näkee kehityskaaren.

---

## Seuraavat tehtävät (tärkeysjärjestyksessä)

1. **KRIITTINEN: Fascia-kenttä Firestoreen** — lisätään `fascia_linja` kenttä kartoitusdatan jokaiselle testille, kytketään auto-ohjelma-logiikka (HPP ELITE 19_AUTO_OHJELMA)
2. **Pelaaja-linkitys** — kartoituksen tulokset kirjoitetaan myös pelaajan dokumenttiin (flei_viimeisin, ketjupisteet)
3. **TSI-laskenta** — SM-pallo - SM-juoksu → Tekniikka-XF-signaali
4. **Kotitehtävä-generaattori** — pallollinen + fyysinen per liikeketju, streak-mekaniikka
5. **Kehityskaari VP:lle** — kevät vs. syksy Δ per linja
6. **Seuran identiteettiprofiili** — valmennuslinja + tavoitemittarit + "millaisia pelaajia tuotamme"

---

## Tunnetut ratkaisut

1. Firestore Rules pelaajille vaatii allow create JA allow update (set+merge käyttää updatea)
2. Suostumuslomakkeen syntymäaika parsitaan Date.UTC:llä ei new Date(string):llä
3. onAuthStateChanged-silmukka estetään _kirjautuminenKesken-lipulla
4. enablePersistence poistettu — aiheutti IndexedDB-konfliktin
5. SheetJS ei kirjoita Excel-tyylejä ilman Pro-lisenssiä
6. tm_nav.js lisätään VASTA kun Master_v8 + Pelaaja-näkymä valmis (topbar-konflikti)

---

## HPP ELITE -tiedoston avaintiedot (Google Sheets ID: 1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M)

28 välilehteä. Kriittiset:
- `📚 11_FASCIA_OPAS` — 6 fascia-linjan käsikirja (anatomia, tunnistaminen, käsittely, progressio)
- `⚡ 12_PELAAJA_PROFIILI` — fascia-profiili + 14 pelipaikkakohtainen painotus + X-Factor-tunnistus
- `⚡ 19_AUTO_OHJELMA` — 1p testi → fascia-linja → aktivointi + taso 1 + cue, ikäluokkaperiaatteet
- `🧪 14_TESTIPATTERISTO` — kaikki testit fascia-linjoittain viitearvoilla
- `⚽ 27_TEKNIIKKAKILPAILUT` — TSI-indeksi
- `📈 20_KEHITYSKAARI` — kevät vs. syksy Δ-laskenta
- `⚙️ _KOODISTOT` — fascia-linja dropdown-arvot: SBL, SFL, LL, DFL, SL, FL, LPL

---

## Kansainvälinen vertailu — TalentMasterin asemointi

Ajax TIPS: 4D-malli, identiteetti — vain ammattilaisille. FCN Right to Dream: kehitysvauhti, peliminuutit — ei pienille seuroille. Benfica 360°: IDP + lab — 200 hlö henkilöstö. TalentMaster: VP+valmentaja+pelaaja+vanhempi samassa — UNIIKKI pienelle seuralle suomalaisella evidenssipohjalla.
