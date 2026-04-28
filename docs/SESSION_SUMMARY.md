# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-04-28)

TalentMaster on jalkapallon pelaajankehitysalusta 8 aktiivisella pilottiseuralla. Firebase-backend toimii. Pelaajan app (v7) on toiminnassa KPV:llä — Topias Koskela (KPV U13) on ensimmäinen oikea testipelaaja, PIN 9278 toimii, `isDemoUser: false`. Seurahallinta (`TalentMaster_Seura.html`) on pääasiallinen admin-rajapinta VP:lle.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot (tila 2026-04-28)

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_Seura.html` | Seurahallinta (VP, sihteeri, super admin) | ✅ Aktiivinen |
| `TalentMaster_Pelaaja_v7.html` | Pelaajan mobiiliapp | ✅ v=24, toimii |
| `TalentMaster_Vanhempi_v2.html` | Vanhemman näkymä | ⚠️ Kovakoodattu nimi |
| `TalentMaster_IDP_Kortti_v3.html` | IDP-kehityskortti | ✅ Toimii |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake | ✅ Toimii |
| `TalentMaster_Master_v9.html` | Valmentajan näkymä | ✅ Aktiivinen |
| `tm_eerikkila_normit.js` | Eerikkilä-normitaulukot (P10–M, T10–N) | ✅ GitHubissa |
| `tm_import.js` | Excel-tuontikokoonpano | ✅ GitHubissa |
| `tm_empty_state.js` | Onboarding-tyhjätila | ✅ GitHubissa |
| `tm_lang.js` | Kielituki fi/sv/en (144 käännöstä) | ✅ GitHubissa |
| `functions/index.js` | 6 Cloud Functionia | ✅ Deployattu |
| `tm_admin/firestore.rules` | Security Rules | ✅ GitHubissa |
| `TalentMaster_Pelaajarekisteri.xlsx` | Excel-rekisteripohja | ✅ GitHubissa |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore, `eur3` (multi-region)
- **Cloud Functions:** `europe-west1`
- **Auth:** Email/Password + anonyymi (pelaajan kirjaukset)

### Konfiguraatio
```javascript
const firebaseConfig = {
  apiKey:            'AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo',
  authDomain:        'talentmaster-pilot.firebaseapp.com',
  projectId:         'talentmaster-pilot',
  storageBucket:     'talentmaster-pilot.firebasestorage.app',
  messagingSenderId: '872561784446',
  appId:             '1:872561784446:web:05c4c7996dfd46ddd14a2f',
};
// Cloud Functions: firebase.app().functions('europe-west1')
// KRIITTINEN: firebase.functions() → us-central1 (VÄÄRÄ, hiljaa epäonnistuu)
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
| vp.vifk@talentmaster.fi | — | VP | VIFK |
| vp.hjk@talentmaster.fi | — | VP | HJK Juniorit |

### Firestore-kokoelmat (aktiiviset)
```
seurat/{seuraId}/
  _meta/
  joukkueet/{joukkueId}
  pelaajat/{pelaajaId}          ← pääkokoelma
    kirjaukset/{pvm}            ← pelaajan päivittäiset kirjaukset
    omatoimi_ohjelmat/
    havainnot/
  kayttajat/{uid}               ← seuran henkilöstö
  kutsut/{kutsuId}              ← rekisteröintikutsut
  tapahtumat/

admins/{uid}                    ← super admin
```

---

## Testipelaaja: Topias Koskela (KPV)

```
Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I  (kaksi u:ta!)
PIN: 9278
syntymaVuosi: 2013  (syntymäpäivä: 15.3.2013)
sukupuoli: "M"
joukkue: "KPV U13"
seuraId: "kpv"
huoltajaEmail: "TeroKoskela7@gmail.com"
flei_viimeisin: 62
sbl: 2.16  sfl: 2.30  ll: 2.10  diag: 2.40  dfl: 2.20
Heikoin ketju: LL (55%) → harjoitteet ohjautuvat LL-ketjulle
isDemoUser: false — oikea Firestore-data
```

---

## Pelaajan app — Piilotettu scene-bar (sBar, display:none)

Scene-bar näkyy vain kun `sBar.style.display = 'flex'` — se on kehittäjänavigaatio
rakentamattomiin tai ei-tuotantovalmiisiin konsepteihin:

| Nappi | Nimi | Tila |
|---|---|---|
| D · PIN | PIN-kirjautuminen | ✅ Toimii |
| A1 | KOTI (normaali näkymä) | ✅ Tuotanto |
| A2 | Signal / CTA-versio | 🔵 Konsepti |
| A3 | Today-Grid | 🔵 Konsepti |
| B | Harjoitus + valmentajavideo | 🔵 Konsepti |
| C | FIFA-tyylinen pelaajakortti (OVR 87) | 🔵 Konsepti, ei Firebase |
| G | Haptics / ääni | 🔵 Konsepti |
| H | Offline / Service Worker | 🔵 Konsepti |
| I | Vanhempi (viikkotarina, kalenteri, kehuviesti) | 🔵 Konsepti |
| J | Oma treeni | 🔵 Konsepti |
| K | Haaste | 🔵 Konsepti |

---

## Pelaajan app — Toiminnassa (A1 KOTI)

- **Kirjautuminen:** PIN → `_kirjauduPinilla(pin)` → Firestore-haku `seurat/{id}/pelaajat`
- **FLEI-harjoite:** Heikoin ketju ohjaa harjoitteen valintaa automaattisesti
- **Streak:** Kirjaukset `pelaajat/{id}/kirjaukset/{pvm}`, streak lasketaan historiasta
- **Kirjausrakenne:** `{tyyppi:'T'|'D'|'S'|'P', tehty:bool, xp, kesto_min, rpe, fiilinki, aika:'ilta'|'aamu'|'paiva'}`
- **Syntymäpäiväyllätys:** `_onkoSynttari()` tarkistaa joka kirjautumisessa. Jos tänään synttärit: konfetti (`_synttariKonfetti()`) + banneri (`_synttariBanner()`) + bonustehtävä

---

## Seurahallinta — Toiminnot

- Pelaajien rekisteröintikutsu (sähköposti + WhatsApp)
- Excel-tuonti (SheetJS, client-side)
- Joukkuehallinta
- Henkilöstöhallinta (kutsu valmentaja → Cloud Function `luoKayttaja`)
- Pelaajamodaali: Tiedot, muokkaus, PIN-hallinta, käytettävyys, joukkueen vaihto, poisto

### Muokkausmodaali (VP + super admin)
Kentät: etunimi, sukunimi, syntymäpäivä (→ syntymaVuosi auto), sukupuoli (M/N),
joukkue, pelipaikka, huoltajaEmail, palloID.
Super admin lisäksi: sbl, sfl, ll, diag, dfl (1–3 asteikko, flei_viimeisin lasketaan auto).

### PIN-hallinta
`luoPelaajaPIN()` — generoi 4-numeroisen. `tallennaPelaajaPIN()` — validoi, tarkistaa
duplikaatit, tallentaa. **VAATII `getIdToken(true)` ennen kirjoitusta** (Auth-session
voi vanhentua pitkän tauon jälkeen → `permission-denied`).

---

## Eerikkilä-normitaulukot (`tm_eerikkila_normit.js`)

11 testiä, pojat P10–M ja tytöt T10–N. Tallennetaan **aina raakadata** Firestoreen,
taso lasketaan lennossa `eerikkilaTaso(arvo, testi, ika, sukupuoli)`.

| Testi | Yksikkö | Asteikko | Huom |
|---|---|---|---|
| nopeus_5m, 10m, 20m, 30m | sekuntia | 1–5 | pienempi=parempi |
| kasirata, sm_juoksu, sm_pallo | sekuntia | 1–5 | pienempi=parempi |
| hyppy_cj | cm | 1–5 | suurempi=parempi |
| mas | m/s | 1–5 | suurempi=parempi |
| pujottelu, syotto | sekuntia | **1–3** | pienempi=parempi |

---

## Avoimet tehtävät (prioriteettijärjestyksessä)

### P3 — Vanhemman app (30 min)
`TalentMaster_Vanhempi_v2.html` näyttää kovakoodatun nimen "Eemeli".
Korjaus: `where('huoltajaEmail', '==', user.email)` → `etunimi`.
Samalla lisätään syntymäpäivä-kehuviesti vanhemmalle.

### P4 — Firestore-säännöt vanhemmalle
`request.auth.token.email == resource.data.huoltajaEmail`
Vanhempi saa nähdä vain oman lapsensa datan. Vaatii `huoltajaEmail`-kentän (nyt kunnossa).

### P5 — Fiilinki ikäfaasikohtaiseksi
U13-pelaajalle pitää näkyä "leikkija"-kieli. Ikäfaasi laskettava ennen renderiä.

### P6 — Valmentajan kenttähavainto → Firestore → pelaajan näkymä
Ketju puuttuu kokonaan. Valmentaja kirjaa havainnon → Firestore → näkyy pelaajan app.

### P7 — IDP-aktivointilogiikka
Kolme reittiä: manuaalinen pyyntö, automaattisignaali (X-Factor), talenttiohjelma (KORI).

### P8 — Automaattinen salasanaresetointi `lahetaPelaajaSivuLinkki`-funktiossa
Kriittinen käytettävyyspuute — pelaaja ei pääse sisään ilman PIN:iä jos se katoaa.

---

## Kriittiset arkkitehtuuripäätökset (pysyvät)

- **Raakadata Firestoreen, normalisointi koodissa.** Jos tallennat `taso:3` etkä `arvo:4.42s`, menetät joustavuuden.
- **FLEI asteikko 1–3** → normalisointi `(arvo-1)/2×100` = 0–100%. Default `2.0` (50%) kun ei dataa.
- **`sukupuoli: "M"/"N"`** — ei "poika"/"tyttö"
- **`syntymaVuosi` numerona** Firestoressä — `syntymaaika` on Timestamp erikseen
- **Topias dokumentti-ID:** `m93GBdOaGCUuenMiCL0I` — **kaksi u:ta** (m93GBdOaGCU**u**enMiCL0I)
- **Cloud Functions:** aina `europe-west1` — `firebase.functions()` menee `us-central1`
- **`getIdToken(true)`** ennen Firestore-kirjoitusta jos sessio voi olla vanhentunut
- **Syntymäpäiväkoodi:** EI nested template literaaleja — käytä string concatenationia

---

## Tunnettuja bugeja (auki)

| Bugi | Tila |
|---|---|
| Fiilinki-kysely väärä kieli U13 | Auki (P5) |
| `joukkueNimi` tallentuu ID:nä eikä näyttönimenä | Auki |
| Automaattinen salasanaresetointi `lahetaPelaajaSivuLinkki`:ssä puuttuu | Auki (P8) |
| Vanhemman app kovakoodattu nimi | Auki (P3) |

---

## Pilottiseurat (8 kpl, 2026-04-28)

FC Lahti Juniorit, KPV (testiavain), Pallo-Iirot, Ylöjärven Ilves,
SJK Juniorit (U15 pojat + U14/15 tytöt + talent — 1. tyttöjoukkue),
GrIFK, VIFK, HJK Juniorit.

---

## Sessio 2026-04-28 — Pelaajadata + Seurahallinta + Syntymäpäiväyllätys

### P2 VALMIS — Testipelaaja Topias Koskela (KPV)

**Dokumentti:** `seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I` (**kaksi u:ta**)

Korjatut kentät:
```
sukupuoli:     "M"      (oli "poika" — rikkoi eerikkilaTaso()-funktion)
syntymaVuosi:  2013     (puuttui — tarvitaan ikäluokan normeille)
sbl:           2.16     (SBL 58% → (0.58×2)+1)
sfl:           2.30     (SFL 65%)
ll:            2.10     (LL 55% ← heikoin ketju)
diag:          2.40     (DIAG 70%)
dfl:           2.20     (DFL 60%)
flei_viimeisin: 62      (laskettu automaattisesti ketjujen keskiarvosta)
```

**PIN 9278 toimii.** `_kirjauduPinilla('9278')` → Topias Koskela, Taso 7, 140 XP, `isDemoUser: false`. Heikoin ketju LL → harjoitteet ohjautuvat lateraaliketjulle.

---

### Eerikkilä-normitaulukot (`tm_eerikkila_normit.js`) — GitHubissa

11 testiä, pojat P10–M ja tytöt T10–N. **Tallennetaan aina raakadata Firestoreen, taso lasketaan lennossa.**

```javascript
eerikkilaTaso(arvo, testi, ika, sukupuoli) // → 1–5 (tai 1–3 tekniikalle)
eerikkilaProfiilit(pelaaja)                 // → {nopeus_30m: 3, hyppy_cj: 4, ...}
laskeEI(cj_cm, sj_cm)                      // elastisuusindeksi (CMJ−SJ)
laskeFVP(n5m_s, n30m_s)                    // voima-nopeus-profiili
laskeTSI(smjuoksu_s, smpallo_s)            // tekniikka-nopeus-indeksi
```

Tekniikkatestit (pujottelu, syöttö) käyttävät 3-portaista asteikkoa, muut 5-portaista.

---

### Seura.html — Muokkausmodaali laajennettu

Aiemmin: etunimi, sukunimi, joukkue, sukupuoli, huoltajaEmail, palloID

**Lisätty:**
- **Syntymäpäivä** (`date`-kenttä) → tallentaa `syntymaaika` (Timestamp) + `syntymaVuosi` (numero) automaattisesti. VP ei enää tarvitse Consolea.
- **Pelipaikka** (tekstikenttä, esim. KH/TK/HY) → tallentuu `pelipaikka` ja `positio` yhteensopivuuden vuoksi
- **FLEI-kentät** (vain super admin) → sbl, sfl, ll, diag, dfl (1.0–3.0). `flei_viimeisin` lasketaan automaattisesti.

---

### Seura.html — PIN-toiminto

```javascript
luoPelaajaPIN(pelaajaId)      // generoi satunnaisen 4-numeroisen → syötekenttään
tallennaPelaajaPIN(pelaajaId) // validoi → duplikaattitarkistus → Firestore.update()
```

**KRIITTINEN:** Vaatii `await user.getIdToken(true)` ennen Firestore-kirjoitusta.
Auth-sessio vanhentuu pitkän tauon jälkeen → ilman tätä tulee `permission-denied`.

---

### Pelaaja v7 — Syntymäpäiväyllätys (v=24)

Kolme uutta funktiota `_kaynnistaAppUI`:n yhteydessä:

```javascript
_onkoSynttari(p)     // vertaa syntymaaika.getMonth()+getDate() nykyiseen → bool
_synttariKonfetti()  // Canvas-animaatio: 60 palaa, 2s, sitten canvas poistetaan
_synttariBanner(p)   // HTML-banneri: nimi, ikä, satunnainen bonustehtävä (3 vaihtoehtoa)
```

**Toimii joka vuosi automaattisesti.** Bannerikortit testattu live Topiaksella — konfetti + "Hyvää syntymäpäivää, 13v!" + bonustehtävä.

**KRIITTINEN MUISTIO:** Syntymäpäiväkoodi käyttää **string concatenationia** (`+`) template literaalien sijaan. Nested template literaalit (`\`...\${...\`...\`}...\``) rikkovat JavaScript-parserin → koko script kaatuu → musta ruutu. Tämä oli v=23:n vika joka korjattiin v=24:ssä.

---

### Piilotettu scene-bar (sBar, `display:none`)

Kehitysnavigaatio joka näkyy vain super adminille/kehittäjälle. Sisältää rakennettuja konsepteja:

| Nappi | Nimi | Tila |
|---|---|---|
| D · PIN | PIN-kirjautuminen | ✅ Tuotanto |
| A1 | KOTI (normaali näkymä) | ✅ Tuotanto |
| A2 | Signal / CTA-versio KOTI:sta | 🔵 Konsepti |
| A3 | Today-Grid | 🔵 Konsepti |
| B | Harjoitus + valmentajavideo + perustelu | 🔵 Konsepti |
| C | FIFA-tyylinen pelaajakortti (OVR 87) | 🔵 Konsepti, ei Firebase |
| G | Haptics / ääni ("app tuntuu kentällä ilman näyttöä") | 🔵 Konsepti |
| H | Offline / Service Worker / skeleton-lataus | 🔵 Konsepti |
| I | Vanhempi: viikkotarina + kalenteri + kehuviesti + "Tuo kentälle" | 🔵 Konsepti |
| J | Oma treeni | 🔵 Konsepti |
| K | Haaste ("Keksi 3 pihaharjoitusta") | 🔵 Konsepti |

Strategisesti tärkeimmät seuraavaksi rakentaa: **C (OVR-kortti)** ja **I (Vanhempi-konsepti)**.

---

### Avoimet tehtävät (2026-04-28 jälkeen)

| # | Tehtävä | Prioriteetti |
|---|---|---|
| P3 | Vanhemman app: kovakoodattu "Eemeli" → `where('huoltajaEmail','==',email)` + syntymäpäivä-kehuviesti | 🔴 |
| P4 | Firestore-säännöt: `resource.data.huoltajaEmail == request.auth.token.email` vanhemmalle | 🔴 |
| P5 | Fiilinki ikäfaasikohtaiseksi: U13 leikkija-kieli | 🟡 |
| P6 | Valmentajan kenttähavainto → Firestore → pelaajan näkymä (ketju puuttuu kokonaan) | 🟡 |
| P7 | IDP-aktivointilogiikka (3 reittiä: manuaalinen/signaali/KORI) | 🟡 |
| P8 | Automaattinen salasanaresetointi `lahetaPelaajaSivuLinkki`:ssä | 🟡 |

**Aiemmat prioriteetit (GitHubin versio) edelleen voimassa:**
- 🔴 Testaa huoltajan kirjautuminen oikealla tilillä
- 🔴 SPF/DKIM — sähköpostit roskapostiin
- 🔴 SJK-käyttöönotto
- 🟡 Excel → Firestore tuontityökalu
- 🟡 Tyttöjen PHV-kaava ennen U14/15T-aktivointia

---

### Uudet kriittiset periaatteet (lisätään listaan)

**#37 Nested template literals rikkovat scriptin → käytä string concatenationia** (`+`) kun template literal on toisen sisällä.

**#38 `getIdToken(true)` pakollinen** ennen Firestore-kirjoitusta kun auth-sessio voi olla vanhentunut (pitkän tauon jälkeen → `permission-denied`).

**#39 FLEI raakadata** tallennetaan 1–3 asteikolla (`sbl`, `sfl`, `ll`, `diag`, `dfl`). Normalisointi `(arvo-1)/2×100` = 0–100%. Default `2.0` (50%) kun ei dataa.

**#40 Topias dokumentti-ID:** `m93GBdOaGCUuenMiCL0I` — **kaksi u:ta** (`m93GBdOaGCU**u**enMiCL0I`). Yhdellä u:lla on toinen dokumentti joka ei ole Topiaksen.
