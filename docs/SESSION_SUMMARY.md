# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-04-01)

TalentMaster on jalkapallon talenttiarviointialusta. Firebase-backend toimii, Cloud Functions toimii, koko rekisteröinti- ja kutsupolku toimii end-to-end. Pilotissa 7 seuraa. Tänään rakennettiin koko pelaaja/vanhempi-käyttäjäpolku alusta loppuun ja testattiin onnistuneesti KPV:n Topias Koskelalla.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Aktiiviset tiedostot (2026-04-01)

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_Seura.html` | VP/sihteeri/UTJ seurahallinta | Aktiivinen |
| `TalentMaster_VP_v18.html` | VP-dashboard (kartoitukset, kalenteri, hälytykset) | Aktiivinen |
| `TalentMaster_Master_v9.html` | Valmentajan kenttänäkymä | Aktiivinen |
| `TalentMaster_Rekisterointi_Suostumus.html` | Huoltajan suostumuslomake | Aktiivinen |
| `TalentMaster_IDP_Kortti_v3.html` | Pelaajan kehityskortti | Aktiivinen (KPV toimii) |
| `TalentMaster_Pelaaja_v1.html` | PELAAJAN OMA SIVU — gamified FIFA-kortti, streak, XP | UUSI |
| `TalentMaster_Vanhempi.html` | VANHEMMAN SIVU — selkokielinen kehityssivu | UUSI |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | Aktiivinen |
| `functions/index.js` | 5 Cloud Funktiota | Aktiivinen |
| `tm_admin/firestore.rules` | Security Rules | Aktiivinen |

---

## Firebase

- Projekti: talentmaster-pilot (Blaze plan)
- Tietokanta: Firestore, eur3 multi-region
- Cloud Functions: europe-west1
- Auth: Email/Password

### Konfiguraatio
```javascript
const firebaseConfig = {
  apiKey:            "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain:        "talentmaster-pilot.firebaseapp.com",
  projectId:         "talentmaster-pilot",
  storageBucket:     "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId:             "1:872561784446:web:05c4c7996dfd46ddd14a2f",
};
```

### Käyttäjät

| Sähköposti | UID | Rooli | Seura |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Kaikki |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

KPV VP salasana: TM_KPV_2026!
Super Admin salasana: 123456

### Cloud Functions (5 kpl, kaikki toimivat)

| Funktio | Kuvaus |
|---|---|
| lahetaRekisteriKutsu | Lähettää rekisteröintikutsun huoltajalle |
| lahetaHuoltajaKutsu | Lähettää huoltajakutsun |
| lahetaPelaajaSivuLinkki | Lähettää kaksi linkkiä: vanhemman sivu + pelaajan sivu |
| luoKayttaja | Luo Firebase Auth -tilin |
| deaktivioiKayttaja | Deaktivoi käyttäjän |

KRIITTINEN: functions/.env pitää olla GitHubissa (tyhjät arvot) — CI korvaa ne.
require('dotenv') EI SAA olla index.js:ssä — kaataa buildin.
Gmail App Password: 16 merkkiä, ilman välilyöntejä, OIKEALLE Gmail-tilille.

---

## Koko kutsupolku (toimii end-to-end)

```
1. VP avaa Seura.html → Joukkue → Kutsu pelaaja
2. Täyttää: etunimi, sukunimi, huoltajan sähköposti, joukkue, PalloID (valinnainen)
3. Paina "Lähetä sähköpostilla" → lahetaRekisteriKutsu Cloud Function
   → Sähköposti 1: rekisteröintilinkki huoltajalle

4. Huoltaja täyttää suostumuslomakkeen (TalentMaster_Rekisterointi_Suostumus.html)
   → 6 suostumusta, PalloID valinnainen
   → Tallentuu Firestoreen: seurat/kpv/pelaajat/{id}

5. Automaattisesti: lahetaPelaajaSivuLinkki Cloud Function
   → Sähköposti 2: kaksi nappia
     Vanhemman sivu → TalentMaster_Vanhempi.html?pelaajaId=...&seuraId=kpv
     Pelaajan oma sivu → TalentMaster_Pelaaja_v1.html?pelaajaId=...&seuraId=kpv

6. Vanhempi avaa vanhemman sivun → kirjautuu sähköpostilla tai PalloID:llä
7. Pelaaja avaa pelaajan sivun → kirjautuu sähköpostilla tai PalloID:llä
```

---

## Uudet sivut tässä sessiossa

### TalentMaster_Vanhempi.html

Tarkoitus: Vanhemman selkokielinen näkymä — ei teknistä jargonaa.
Malli: SJK Demo v2 vanhempi-näkymä (Aleksi-demosivu)
Identiteetti: "Vanhemman sivu" badge topbarissa ja loginissa

Sisältö:
- Pelaajan profiilikortti (OVR, pelaajatyyppi selitettynä)
- Vahvuudet + "harjoittelemme nyt" kehityskohde
- FLEI-palkki selitettynä vanhemmalle arkikielellä
- PHV-kasvupyrähdystieto automaattisesti
- Kotitehtävät tarkoilla ohjeilla (15 min kotipihalla/olohuoneessa)
- "Sinun roolisi tukijana" — tutkimuspohjainen kommunikaationeuvonta
- Valmentajan havainto selitettynä arkikielellä
- Seuraavat tapahtumat kalenterissa
- Vanhemman opas — 5 koulutusmateriaalia

Kirjautuminen: sähköposti TAI PalloID (numero 5-10 merkkiä)
Laitekohtainen tallennusohje (iOS/Android/Desktop) ensimmäisellä kirjautumisella

### TalentMaster_Pelaaja_v1.html

Tarkoitus: Pelaajan gamified FIFA-kortti-näkymä.
Identiteetti: "Pelaajan sivu" badge topbarissa (keltainen/gold)

Sisältö:
- FIFA-kortti (OVR, pelaajaprofiili, ketjupisteet)
- Streak + freeze-mekaniikka
- XP-tasot: Basic → Kilpailija → Sharp → Elite → Signature
- Fiilinki-emoji widget
- Kotitehtävät + XP-palkinnot
- Viikkokalenteri, kehitysaikajana
- Friend challenge -koodit

Kirjautuminen: sama kuin vanhemman sivu

---

## PalloID-arkkitehtuuri (toteutettu)

PalloID on vain tunniste — ei vaadi integraatioita Palloliiton kanssa.
Rajapintaintegraatio tarvitaan vasta kun siirretään dataa liitolta.

palloID-kenttä pelaajadokumentissa Firestoressa.

Lisätään kahdella reitillä:
1. Rekisteröintilomake (valinnainen kenttä)
2. Seura.html muokkaa-modaali (VP täyttää jälkikäteen, tallennaMusokkausPelaaja)

Kirjautumislogiikka:
```javascript
// Numero 5-10 merkkiä = PalloID
if (/^[0-9]{5,10}$/.test(syote)) {
  // Hae seurat: ['kpv','fcl','palloiirot','yvies','sjk','grifk']
  // seurat/{id}/pelaajat where palloID == syote
  // → huoltajaEmail → signInWithEmailAndPassword(email, pass)
}
```

---

## Monijoukkue-arkkitehtuuri (toteutettu)

Pelaajadokumentin rakenne:
```javascript
{
  joukkue:     "kpv_u15",        // pääjoukkue ID
  joukkueNimi: "KPV U15",        // pääjoukkue näyttönimi
  joukkueet: [
    { id: "kpv_u15", nimi: "KPV U15", rooli: "pää" },
    { id: "kpv_u13", nimi: "KPV U13", rooli: "lisä" },
  ]
}
```

TÄRKEÄÄ: Kartoitukset sidottu pelaajaId:hen — EI joukkueeseen.
Joukkuesiirto = vain joukkue-kentän päivitys. Testidata ei liiku.

Seura.html joukkuehallinta-modaali:
- Pääjoukkue (dropdown) + lisäjoukkueet (checkboxit)
- Pelaaja näkyy molempien joukkueiden listassa
- vahvistaJoukkueVaihto() tallentaa joukkue + joukkueet-taulukon

---

## Firestore-rakenne (täydellinen 2026-04-01)

```
admins/{uid}

seurat/{seuraId}/
  pelaajat/{pelaajaId}/
    etunimi, sukunimi, nimi
    joukkue, joukkueNimi
    joukkueet: [{id, nimi, rooli}]
    palloID
    huoltajaEmail
    syntymaaika, syntymavuosi, sukupuoli
    suostumusTila: 'odottaa'|'annettu'
    tila: 'aktiivinen'|'ei-aktiivinen'
    rekisterointiId: 'TM-XXXXXXX'
    pelaajaLinkki
    pelaajaLinkLahetetty
    suostumus: { aikaleima, hyvaksytyt: {...} }
    luotu, muokattu

  kartoitukset/{kartoitusId}/
    pelaajaId             ← sidottu pelaajaan, EI joukkueeseen
    joukkueId             ← missä joukkueessa kartoitushetkellä

  joukkueet/{joukkueId}/
  tapahtumat/{tapahtumaId}/
  kutsut/{kutsuId}/
  suostumukset/{suostumusId}/
  havainnot/{havaintoId}/

audit/                    ← Cloud Functions audit trail
```

---

## Firestore Security Rules — muutokset 2026-04-01

- pelaajat: allow delete lisätty (super admin + VP)
- kartoitukset seuratasolla lisätty (puuttui kokonaan)
- suostumukset lisätty (rekisteröintilomake ilman auth)
- pelaajat read sallittu ilman auth (URL-parametrikirjautuminen)

---

## Teknisiä opittuja asioita

### Cloud Functions .env
- functions/.env GitHubissa tyhjillä arvoilla, CI korvaa Secreteillä
- require('dotenv').config() EI saa olla index.js:ssä
- Gmail App Password: oikealle tilille, 16 merkkiä, ei välilyöntejä
- Diagnostiikka: console.log('[Nodemailer] GMAIL_EMAIL:', email.substring(0,5))
- Cloud Logs osoitteessa console.cloud.google.com

### Duplikaattipelaaja-bugi (korjattu)
- Syy: kutsulinkissä ei ollut pelaajaId → lomake loi uuden dokumentin
- Korjaus: tila._rekPelaajaId tallennetaan modalin avauksessa
- Kutsulinkki sisältää pelaajaId URL-parametrina
- Rekisteröintilomake käyttää merge:true + pelaajaId-parametria

### Fastly CDN
- GitHub Pages cachettaa aggressiivisesti (~10 min)
- Cache-bust: ?v=N tai tarkista raw.githubusercontent.com ennen Pages-URL:ia

---

## Seuraavat prioriteetit

### VP-dashboard
1. TEHTY: Tänään-osio (hälytykset + fiilinki + quick actions)
2. TEKEMÄTTÄ: Delta 30pv + ikäluokat-taulukko (trenditieto seurajohtajalle)
3. TEKEMÄTTÄ: Valmentajien aktiivisuus -näkymä (viimeksi kirjannut, pelaajamerkinnät)
4. TEKEMÄTTÄ: X Factor + Hidden Gem -lista (lahjakkuusidentifiointi visuaalisena)

### Muut avoinna olevat
- Valmentajan kenttähavainto → Firestore (puuttuu vielä)
- IDP-aktivointilogiikka
- Coach view: Kartoitukset-tabi Masteriin
- Automaattinen tapahtumatila → valmis tallennuksessa

---

## Avoimet ongelmat

- Sähköpostit menevät roskapostiin: normaali uusilla lähettäjillä. Korjaus: SPF/DKIM tai SendGrid
- joukkueNimi tallentuu tunnuksena (kpv_u13) eikä näyttönimenä (KPV U13) rekisteröintilomakkeesta. Pitää hakea joukkuelistan nimestä.
- lahetaPelaajaSivuLinkki: ehtolause voi jättää linkin lähettämättä jos tallennettuId on null. Korjaus tehty (|| rid) mutta ei testattu täysin.

---

## Pilottiseurat

| Seura | VP-sähköposti | Huomio |
|---|---|---|
| KPV | vp.kpv@talentmaster.fi | Aktiivisin pilotti, Topias Koskela testipelaaja |
| FC Lahti Juniorit | vp.fcl@talentmaster.fi | |
| Pallo-Iirot | vp.palloiirot@talentmaster.fi | |
| Ylöjärven Ilves | vp.yvies@talentmaster.fi | |
| SJK Juniorit | vp.sjk@talentmaster.fi | |
| GrIFK | vp.grifk@talentmaster.fi | |
| HJK Juniorit | — | Tulossa |

Pilottikontakti: Topias Koskela KPV:llä (IDP-kortti v3 toimii, kutsupolku testattu)

---

## Pelaajan sivu — kehitysideat (kirjattu 2026-04-01)

### FIFA-kortti isona näytölle / popup
- Kortti isona ruudulle kännykällä — popup kun pelaaja klikkaa korttia
- Erityisen hienon näköinen — tärkeä WOW-efekti
- Spesiaalikortteja kehitetään (kultainen, hopea, erikoisversiot)

### Keräilykortit — STRATEGINEN TUOTEOMINAISUUS
Pelaajille ilmestyy keräilykortteja sitä mukaan kun taidot kehittyvät.
Kortit ovat oikeita jalkapalloilijoita joilla on samanlaiset ominaisuudet:
- Maajoukkueen pelaajia (esim. "Sinulla on sama nopeus kuin Litmanen!")
- Veikkausliigan pelaajia
- Oman seuran edustusjoukkueen pelaajia
- Logiikka: kun pelaajan ketjupisteet ylittävät tietyn kynnyksen → kortti freilataan

Esimerkki:
  Topias saa 85% vauhtiketjussa → ilmestyy "Tim Sparv" -kortti
  "Sinulla on sama räjähtävyys kuin Tim Sparvilla!"

Tämä on erittäin motivoiva mekanismi nuorille pelaajille.
Erottaa TalentMasterin täysin kilpailijoista.
Kytkös HPP ELITE -profiileihin (Railgun = nopeus jne.)

### Tekninen toteutus (myöhemmin)
- Korttikirjasto: pelaaja + ominaisuudet + kuva
- Trigger: kartoitustulos ylittää kynnysarvon → unlock
- Animaatio: kortti "paljastuu" dramaattisesti
- Tallentuu Firestoreen: pelaaja.kortit: [{id, avatttu, pvm}]
- Korttien jakomahdollisuus someen
