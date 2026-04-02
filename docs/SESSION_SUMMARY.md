# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-02)

TalentMaster on jalkapallon talenttiarviointialusta jossa on **7 aktiivista pilottiseuraa**.
Rekisteröintiketju toimii end-to-end. Vanhemman sivu on tuotantovalmis AI-chatilla.
Seuraava fokus: VP-dashboardin KPI-näkymät ja valmentajan kartoitusnäkymä.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot (ajantasainen lista)

| Tiedosto | Versio | Kuvaus |
|---|---|---|
| `TalentMaster_Seura.html` | aktiivinen | Seurahallinta (VP/sihteeri) |
| `TalentMaster_VP_v18.html` | v18 | VP-dashboard |
| `TalentMaster_Master_v9.html` | v9 | Valmentajan näkymä |
| `TalentMaster_Pelaaja_v1.html` | v1 | Pelaajan gamifioitu sivu |
| `TalentMaster_Vanhempi.html` | v2 (2026-04-02) | Vanhemman sivu + AI chat ✅ |
| `TalentMaster_IDP_Kortti_v3.html` | v3 | IDP-kortti (toimii KPV:llä) |
| `TalentMaster_Rekisterointi_Suostumus.html` | aktiivinen | GDPR-suostumuslomake |
| `hpp_rehab_protokollat.js` | aktiivinen | 25 kuntoutusprotokolaa |
| `functions/index.js` | aktiivinen | Cloud Functions (SendGrid) |
| `tm_import.js` | aktiivinen | Excel-tuonti komponentti |
| `tm_empty_state.js` | aktiivinen | Tyhjän tilan komponentti |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore `eur3` multi-region
- **Auth:** Email/Password
- **Functions:** `europe-west1` — 5 funktiota deployattu
- **Sähköposti:** SendGrid HTTP API (ei Nodemailer)

### Firebase-konfiguraatio
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

### Firestore-rakenne
```
seurat/{seuraId}/
  pelaajat/{pelaajaId}    — pelaajadokumentti
  joukkueet/{joukkueId}   — joukkueet (nimi, ikaryhma, jarjestys)
  kayttajat/{uid}         — henkilöstö
  kutsut/{kutsuId}        — rekisteröintikutsut
  kartoitukset/{id}       — harjoitettavuuskartoitukset
  havainnot/{id}          — valmentajan havainnot
  tapahtumat/{id}         — tulevat tapahtumat
  sopimukset/kriteerit    — Palloliiton korit
admins/{uid}              — super-admin dokumentti
```

### GitHub Secrets (Cloud Functions deploy)
- `SENDGRID_API_KEY` — SendGrid API
- `SENDGRID_FROM_EMAIL` — talentmasterid@gmail.com
- `FIREBASE_SERVICE_ACCOUNT` — Service Account JSON

---

## Pilottiseura: Topias Koskela (KPV) — testattu toimivaksi

Rekisteröintiketju testattu onnistuneesti 2026-04-02:
1. VP lähetti rekisteröintikutsun Seura.html:stä → sähköposti tuli (SendGrid) ✅
2. Huoltaja täytti suostumuslomakkeen → Firestore päivittyi ✅
3. Sähköpostista tuli "Aseta salasana" -linkki ✅
4. Salasanan asettamisen jälkeen ohjautui automaattisesti vanhemman sivulle ✅
5. Vanhemman sivu näyttää Topiaksen tiedot oikein ✅
6. Pelaajasivulinkki toimii vanhemman sivun alaosassa ✅

**Testipelaaja:** Topias Koskela, KPV U13, syntymävuosi 2013, pelaajaId: `SDxaLlkLDTXpF4IgI8lG`
**Testisähköposti:** terokoskela7@gmail.com (huoltaja)

---

## Tämän session saavutukset (2026-04-02)

### 1. SendGrid-integraatio (valmis ✅)
- Siirrytty Nodemailer+Gmail → SendGrid HTTP API
- Single Sender Verified: `talentmasterid@gmail.com`
- Cloud Functions v11 deployattu, kaikki 5 funktiota vihreänä
- GitHub Actions workflow päivitetty Service Account -autentikoinnilla

### 2. Rekisteröintiketjun korjaukset (valmis ✅)
- `joukkueNimi`-bugi: `kpv_u13` → "KPV U13" (haetaan Firestoresta)
- Duplikaattipelaaja-bugi: Seura.html tarkistaa ensin onko sama email jo rekisterissä
- `TalentMaster_Rekisterointi_Suostumus.html`: bugi jossa fallback loi kutsupäivityksen kahdesti
- Password reset -bugi: `generatePasswordResetLink` + salasananappi sähköpostiin

### 3. Vanhemman sivu v2 (valmis ✅)
**Korjaukset:**
- Tallennusohje näyttää huoltajan oman sähköpostin (ei kovakoodattua VP-osoitetta)
- Otsikot: "Vahvuudet" ja "Harjoitteluvalmius" (ei nimeä + taivutusongelmia)
- `_fleiSelitys()` ja `_vahvuudetHtml()` — poistettu nimimuoto yleisemmäksi
- Pelaajasivulinkki sivun alaosaan (dynaaminen, rakentuu URL-parametreista)
- Kirjaudu ulos nollataan linkki oikein

**Uusi: AI chat -ominaisuus (täysin uusi)**
- Kelluva chat-ikkuna — mobiilissa alhaalta, desktop ≥680px oikeaan alakulmaan
- FAB-nappi kun chat suljettuna
- **Kolme kieltä:** suomi (oletus), ruotsi (GrIFK automaattisesti), englanti — manuaalinen vaihto FI/SV/EN napeilla
- **Pelaajan konteksti AI:lle:** nimi, ikä, joukkue, PHV-tila, profiili, FLEI% välitetään systeemiohjeeseen
- **Kontekstuaaliset aihekorttikysymykset:** räätälöity pelaajan iän ja PHV-tilan mukaan (esim. 12v → "Milloin kasvupyrähdys alkaa?")
- **Nappi-feedback:** "Kysy" → "Lähetetään..." / "Skickar..." / "Sending..."
- **LocalStorage-sessio:** historia säilyy 24h per pelaaja (`tm_chat_{pelaajaId}`)
- **Tervetuloviesti:** ensimmäisellä avaamisella, mainitsee pelaajan nimen
- **Virheenkäsittely:** verkkovirhe vs. API-ongelma eritelty, kielikohtaiset viestit
- API: `claude-sonnet-4-20250514`, max 12 viestiä kontekstissa, max_tokens 1000

---

## Seuraavat prioriteetit

### Kriittistä ennen pilotin laajentamista:
1. **Lomakkeen joukkuekenttä** — `TalentMaster_Rekisterointi_Suostumus.html` näyttää `kpv_u13` tunnuksena (eri paikka kuin Cloud Functions)
2. **Node.js 20 → 22** — vanhenee 30.4.2026, päivitä `functions/package.json` `"engines": {"node": "22"}`

### Seuraava kehitysfokus:
3. **VP-dashboard KPI-mittarit** — Delta 30pv, ikäluokat-taulukko, valmentajien aktiivisuus
4. **X Factor + Hidden Gem -lista** — algoritminen tunnistus VP-dashboardiin
5. **Valmentajan kartoitusnäkymä** — Coach näkee kartoitustulokset Master v9:ssä (kriittisin puute ennen pilottia)
6. **Domain `talentmaster.fi`** — osta pilotin jälkeen, lisää SendGrid DNS-tietueet

### Horizon:
- Game IQ -moduuli (ADAR) → Firebase-integraatio
- Club KPI dashboard
- Palloliitto-yhteistyö

---

## Teknisiä muistiinpanoja (2026-04-02)

### Duplikaattipelaaja-bugi (korjattu)
**Syy:** `lahetaRekisteriSahkoposti()` loi aina uuden pelaajadokumentin.
**Korjaus `TalentMaster_Seura.html`:**
```javascript
// Tarkistetaan ensin onko pelaaja jo olemassa saman sähköpostin perusteella
if (!pelaajaId && tila._rekHEmail) {
  const olemassa = await db.collection('seurat').doc(tila.seuraId)
    .collection('pelaajat')
    .where('huoltajaEmail', '==', tila._rekHEmail.toLowerCase())
    .limit(1).get();
  if (!olemassa.empty) pelaajaId = olemassa.docs[0].id;
}
```

### SendGrid yksittäinen lähettäjä
- Verified sender: `talentmasterid@gmail.com` (TalentMasterID)
- Domain `talentmaster.fi` lisää toimitusvarmuutta — osta ennen pilotin laajentamista
- Sähköpostit menevät roskapostiin ilman omaa domainia (odotettavaa)

### Vanhemman sivu — kielimääritys
```javascript
var RUOTSINKIELISET = ['grifk'];
function _maaritaKieli(sid) { return RUOTSINKIELISET.includes(sid) ? 'sv' : 'fi'; }
```
GrIFK → automaattisesti ruotsi. Muut → suomi. Manuaalivaihto FI/SV/EN.

### HJK Juniorit lisätty
7. pilottiseura (lisätty userMemories:iin, ei vielä Firestoreen).

---

## Vanhemman sivu — AI chat systeemiohje rakenne

```
Olet TalentMaster vanhemman opas -assistentti...
Pelaajan tiedot: [nimi, ikä, joukkue, seura, PHV-tila, profiili, FLEI%]
Erikoisosaamista: motivaatio, PHV, ravitsemus, uni, vanhemman rooli, pettymykset
[kieliohje: suomi/svenska/English, max 3 kpl, ei teknistä jargonia]
Et ole lääkäri — suosittele ammattilaista vakavissa asioissa.
```

---

## Bisnesmalli

- Kiinteä seuralisenssi 200-500€/kausi (MRR)
- IDP raportti aukeaa kehitystasolta
- maksu 2€ per pelaaja
- Klinikka kertamaksuna
- Paketit: Perustaso / Kehitystaso / Huipputaso
- **Palloliitto-yhteistyö:** esitys tehty, merkittävä strateginen mahdollisuus

---

## HPP ELITE -yhteys

- Google Sheets ID: `1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M`
- 25 kuntoutusprotokolaa `hpp_rehab_protokollat.js`:ssä
- Integroitavissa fysioterapeutin näkymän kautta myöhemmin
