# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-03-27)

TalentMaster on jalkapallon talenttiarviointialusta jossa on 8 aktiivista pilottiseuraa.
Firebase-backend on rakennettu ja toimii. Tässä sessiossa uudistettiin koko
rooliarkkitehtuuri kolmikerroksiseksi, kirjoitettiin Security Rules täysin uudelleen,
suunniteltiin testitapahtuma-schema ja rakennettiin RAE + biologinen ikä
-signaalimoduuli VP-näkymään.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_VP_v17.html` | VP-dashboard — AKTIIVINEN versio | Toimii, tm_ylaikaisyys integrointi KESKEN |
| `TalentMaster_Admin.html` | Super Admin -näkymä | Toimii |
| `TalentMaster_Seura.html` | Seuran hallintanäkymä | Toimii |
| `TalentMaster_Master_v7.html` | Valmentajan näkymä (vanha) | Toimii |
| `TalentMaster_Master_v8.html` | Valmentajan näkymä (uusi) | Kehitysvaihe |
| `TalentMaster_IDP_Kortti_v3.html` | Pelaajan kehityskortti | Toimii (KPV/Topias testattu) |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake | Toimii |
| `tm_ylaikaisyys.js` | RAE + biologinen ikä signaalimoduuli | UUSI — ei vielä integroitu VP:hen |
| `tm_admin/firestore.rules` | Security Rules | UUDISTETTU 2026-03-27 |
| `tm_admin/setup_seurat.js` | Seurojen Firebase-alustus | UUDISTETTU 2026-03-27 |
| `tm_admin/setup_admin.js` | Super-admin setup | Toimii |
| `tm_data.js` | 2417 pelaajaa, 30 seuraa (historia) | Staattinen |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | Toimii |

### GitHub Actions -workflowt

| Workflow | Kuvaus | Tila |
|---|---|---|
| `.github/workflows/setup_firebase.yml` | Firebase-toiminnot | Päivitetty Node 20 + @v4 |
| `.github/workflows/seed_kartoitukset.yml` | Testidatan lisäys/poisto | Toimii (@v4 jo valmiiksi) |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore, europe-west1
- **Auth:** Email/Password käytössä

### Konfiguraatio
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

### Firebase-käyttäjät

| Sähköposti | UID | Rooli | Seura |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

### Pilottiseurat Firestoressä (8 kpl — ajettu setup_seurat 2026-03-27)

| seuraId | Nimi | Paketti |
|---|---|---|
| fcl | FC Lahti Juniorit | kehitystaso |
| kpv | KPV | kehitystaso |
| palloiirot | Pallo-Iirot | perustaso |
| yvies | Ylöjärven Ilves | perustaso |
| sjk | SJK Juniorit | kehitystaso |
| grifk | GrIFK | perustaso |
| hjk | HJK Juniorit | huipputaso |
| demo-fc | Demo FC | kehitystaso |

### Firestore-kokoelmarakenne (päivitetty 2026-03-27)

```
admins/{uid}                         — Super Admin -tunnistus

seurat/{seuraId}/                    — Seuradokumentti (uusi rakenne)
  kayttajat/{uid}/                   — Kenttäkerroksen roolit
  joukkueet/{joukkueId}/             — Joukkueet
  pelaajat/{palloId}/                — Pelaajaprofiilit (PalloID = doc ID)
  tapahtumat/{tapahtumaId}/          — Testitapahtumat (uusi schema, ei vielä UI)
    tulokset/{palloId}/              — Testitulokset per pelaaja
  kartoitukset/{id}/                 — Harjoitettavuuskartoitukset
  testit/{id}/                       — H-H polun fyysiset testit
  tekniikka/{id}/                    — Tekniikkakilpailut
  adar/{id}/                         — Game IQ / ADAR
  vammat/{id}/                       — Kuntoutusdata (arkaluonteinen)
  kuorma/{id}/                       — RPE-kuormaseuranta
  kirjaukset/{id}/                   — VP:n harjoitteluseurantakirjaukset

kirjaukset/                          — Vanha rakenne (yhteensopivuus, ei enää kirjoiteta)
kirjaukset_joukkue/                  — Vanha rakenne
kirjaukset_tapahtumat/               — Vanha rakenne
```

---

## Rooliarkkitehtuuri (uudistettu 2026-03-27)

Kolmikerroksinen malli jossa sama henkilö voi kantaa useita rooleja
(pienessä seurassa VP on usein myös Admin ja strateginen johtaja).

**Hallintakerros** vastaa rekisterin hallinnasta. Seuran Admin (sihteeri/TJ)
lisää käyttäjiä ja hallitsee pelaajadataa. VP on Adminin varamies ja hänellä
on aina admin-oikeudet varalta. Super Admin näkee kaikkien seurojen datan.

**Johtamiskerros** vastaa urheilutoiminnan johtamisesta. VP:llä on sekä
operatiivinen että strateginen johtamisnäkymä — jos seurassa ei ole UTJ:tä,
VP kattaa strategisen tason yksin. UTJ (Urheilutoiminnanjohtaja) näkee vain
strategisen kokonaiskuvan ilman operatiivisia kirjoitusoikeuksia.

**Kenttäkerros** hoitaa päivittäisen työn pelaajien kanssa. Roolit tallennetaan
`kayttajat`-alikokoelmaan: valmentaja, testivastaava, talenttivalmentaja,
fysiikkavalmentaja ja fysioterapeutti. Joukkuesidonnnaisuus määräytyy
`joukkueet`-taulukosta (tyhjä = näkee kaikki seuran joukkueet).

**Pelaaja- ja huoltajakerros**: pelaaja näkee oman profiilинsa, huoltaja
lapsensa profiilin `huoltaja_uid`-kentän kautta.

**Raportointikerros** (tuleva): hallitus/puheenjohtaja saa aggregoidun
kuukausiraportin — ei pääsyä yksittäisiin pelaajatietoihin.

### Seuradokumentin uudet kentät

```javascript
{
  admin_uid:   null | "uid",   // Seuran Admin — null jos sama kuin VP
  admin_email: null | "email",
  vp_uid:      "uid",
  vp_email:    "email",
  utj_uid:     null | "uid",   // null = VP kattaa strategisen tason
  utj_email:   null | "email",
  tilastot: {                  // Aggregoitu — päivitetään tapahtumien yhteydessä
    pelaajia, joukkueita, kartoituksia,
    testattuMirwald, testattuHH, aktiivisiaIdp,
    viimeisinTapahtuma, kausi
  }
}
```

---

## tm_ylaikaisyys.js — RAE + biologinen ikä (rakennettu 2026-03-27)

### Kaksi signaalipolkua

**RAE-analyysi** aktivoituu kaikille pelaajille joilla on `syntymapaivamaara`
Firestore Timestampina. Laskee Q1–Q4-jakautuman (Q1=tammi-maaliskuu...
Q4=loka-joulukuu), Q1/Q4-suhdeluvun ja vinouma-asteen. Vertaa koko joukkueen
RAE:ta FLEI ≥ 75 talenttiryhmän RAE:hen — jos talenttiryhmässä Q1-painotus on
merkittävästi vahvempi, järjestelmä hälyttää biologisen edun vaikutuksesta
valintaan.

**Mirwald-biologinen ikä** aktivoituu VAIN kun `biologinenIka.mirwald`-
mittaukset löytyvät pelaajan Firestore-dokumentista (pituus + istumapituus +
paino). Laskee maturity offset -arvon Mirwald 2002 -kaavalla ja vertaa
Palloliiton kuukausittaisiin kynnysarvoihin. Poikkeuslupa-signaali laukeaa
kun PHV-ikä ≥ kynnysarvo — VP voi hakea Palloliitolta lupaa pelaajan
siirtämiseksi biologisesti sopivampaan ikäluokkaan (tuleva 2027-sääntö).

Palloliiton kynnysarvot: pojat 14.05–14.97 ja tytöt 12.15–13.07 syntymäkuukauden
mukaan (tammikuussa syntyneen kynnys korkein, joulukuussa matalin).

### Integrointi VP_v17:ään — TEKEMÄTTÄ

Lisätään `_lataaPilottiDashboard()`-funktion loppuun:

```html
<script src="tm_ylaikaisyys.js"></script>
```

```html
<div id="tm-ylaikaisyys-kortti" style="padding:0 32px 20px"></div>
```

```javascript
// _lataaPilottiDashboard()-funktion loppuun, heti ennen sulkevaa }
if (_fbOnline && _fbDb && seuraId) {
  _fbDb.collection('seurat').doc(seuraId)
    .collection('pelaajat').limit(200).get()
    .then(function(pelSnap) {
      if (!pelSnap || pelSnap.empty) return;
      var pelaajat = [];
      pelSnap.forEach(function(doc) { pelaajat.push(doc.data()); });
      if (typeof tmYlaikaisyysAlusta === 'function') tmYlaikaisyysAlusta(pelaajat);
    })
    .catch(function(e) { console.warn('[VP] RAE-analyysi epäonnistui:', e.message); });
}
```

---

## Testitapahtuma-schema (suunniteltu, UI rakentamatta)

Tapahtumalla on kolmiportainen rakenne ja elinkaari:
`suunniteltu → kaynnissa → odottaa_tarkistusta → valmis`.
Vain `valmis`-tila vaikuttaa analyyseihin. Security Rules pakottaa
uuden tapahtuman alkamaan aina `suunniteltu`-tilasta.

Tuetut testityypit: `mirwald`, `khamis_roche`, `harjoitettavuus`,
`hh_testit`, `tekniikkakilpailu` (tulossa).

Kaksi syöttötapaa: suora monisyöttö järjestelmässä (pelaajat valmiiksi
listalla) ja Excel-pohja joka generoidaan tapahtumasta (PalloID:t mukana).
Molemmat johtavat samaan tapahtumadokumenttiin.

---

## Pelaajan tunnistuslogiikka

PalloID on Firestoren dokumentin ID (`seurat/{seuraId}/pelaajat/{palloId}`).
Koska kenttäolosuhteet ovat epätäydelliset (Mirwald otetaan usein eri
kerralla kuin harjoitettavuuskartoitus), data kertyy palasina.
Tuontikoodi käyttää `set({...}, {merge:true})` joka päivittää olemassa olevan
dokumentin tai luo uuden — duplikaatteja ei synny.

Fallback-logiikka: jos PalloID puuttuu Excel-riviltä, haetaan syntymäajan
ja nimen yhdistelmällä. Jos ei löydy, luodaan väliaikainen dokumentti
merkinnällä `palloIdPuuttuu: true` — järjestelmä ei hylkää dataa.

### PHV-termistön epäyhtenäisyys (korjattava)

VP_v17 käyttää: `'Varhainen'` / `'PHV-huippu'` / `'Post-PHV'`
Excel-pohja käyttää: `'Pre-PHV'` / `'PHV'` / `'Post-PHV'`
Tuontikoodin pitää normalisoida termi Firestoreen kirjoitettaessa.

---

## Bisnesmalli

Kiinteä seuralisenssi 200–400€/kausi (MRR), per-pelaaja raportti
(skaalautuva), klinikka kertamaksuna. Paketit: Perustaso (max 100p) /
Kehitystaso (max 300p) / Huipputaso (rajaton).

---

## PIN-koodit (demo-käyttö)

| PIN | Rooli | Seura |
|---|---|---|
| 5555 | Demo VP | — |
| 6666 | VP | FC Lahti Juniorit |
| 7777 | VP | SJK Juniorit |
| 8888 | UJ | Demo |
| 9012 | Valmentaja | Master v7 |

---

## Tunnettuja ongelmia

`TalentMaster_Admin.html` tunnistaa käyttäjät `admins`-kokoelmasta eikä
vielä hyödynnä seuradokumentin uusia kenttiä (`admin_uid`, `utj_uid`) —
toimii edelleen mutta ei tue uutta rooliarkkitehtuuria täysin.
LocalStorage ja Firebase voivat olla epäsynkronissa eri laitteilla —
ratkeaa kun siirrytään kokonaan Firebase-pohjaiseen dataan.

---

## Seuraavat tehtävät (tärkeysjärjestyksessä)

1. `tm_ylaikaisyys.js` integrointi VP_v17:ään — kolme koodimuutosta, ohjeet yllä
2. Testitapahtuman luontinäkymä VP-näkymään tai Seura-näkymään
3. Monisyöttölomake testivastaavalle (Mirwald + Khamis-Roche reaaliaikainen laskenta)
4. Testivastaajan oma kirjautumispolku ja näkymä
5. UTJ-näkymä — strateginen koontinäkymä aggregoidulla datalla
6. Pelaajan ja huoltajan kirjautumispolut
7. Hallitusraportointi — kuukausiraportti ilman yksilötietoja

---

## Avaintiedot muihin sessioihin

### VP_v17:n kaksi käynnistyspolkua
`initDash()` käynnistää tm_data.js-pohjaisen näkymän historiadatalle.
`_lataaPilottiDashboard()` käynnistää Firebase-pohjaisen näkymän
pilottiseuroille. Signaalimoduuli lisätään jälkimmäiseen (ohjeet yllä).

### VP_v17 käyttää bioIka.krono-kenttää yli 8 kohdassa
`biologinenIka`-objekti tallennetaan Firestoreen raakamittauksina mutta
PHV-ikää ei lasketa automaattisesti. `tmLaskeMirwaldPelaajaDoc()` (tm_ylaikaisyys.js)
hoitaa laskennan — kutsutaan Excel-tuonnin yhteydessä.

### HPP ELITE -yhteys
Google Sheets ID: `1-UPKKPbibbAguiRsY8RzeRoWQAJBANTthgNy3AA3e5M`
28 välilehteä. Integrointi TalentMasteriin fysioterapeutin näkymän kautta.

### Palloliiton Power BI benchmark
`https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9`
Seuran passinomistajat vs. TalentMasteriin rekisteröityneet.
