# TalentMaster™ — Järjestelmäarkkitehtuuri
# Päivitetty: 2026-03-25
# Muutokset edelliseen versioon:
#   - Blaze-plan (ei enää Spark)
#   - Cloud Functions lisätty tekniseen stackiin
#   - Kolmitasoinen hallintamalli dokumentoitu
#   - TalentMaster_Seura.html lisätty URL-listaan
#   - Firestore-rakenne päivitetty (pelaajat, kutsut, sopimukset, tapahtumat)
#   - Custom Claims -arkkitehtuuri kirjattu
#   - Joukkueet-taulukko (useampi joukkue per valmentaja) kirjattu
#   - Käyttäjälista päivitetty (7 VP + HJK)
#   - Datavirta päivitetty Custom Claims -arkkitehtuurille

---

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa muiden
lajien) talenttiarviointiin ja pelaajien kehitysseurantaan. Asiakas on seura,
ei yksittäinen valmentaja. Järjestelmä noudattaa kolmitasoista hallintamallia:
TalentMaster Platform → Seuran hallinto → Operatiivinen työ.

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla) | GitHub Pages |
| Tietokanta | Firebase Firestore | europe-west1 |
| Autentikointi | Firebase Authentication | Email/Password |
| Palvelinlogiikka | Firebase Cloud Functions (Node.js) | europe-west1 |
| Sähköposti | Gmail + Nodemailer (Cloud Functionsin kautta) | — |
| Excel-käsittely | openpyxl (Python, pohjan luonti) | GitHub Actions |
| Mobiili | Responsiivinen HTML/CSS (390px+) | Kaikki näkymät |
| Deploy-putki | GitHub Actions | — |
| Historiallinen data | tm_data.js (staattinen, väistyvä) | GitHub Pages |

---

## Firebase-projekti

Projekti: talentmaster-pilot — Blaze plan (pay-as-you-go)
Tietokanta: Firestore, europe-west1 (Frankfurt)
Auth: Email/Password käytössä

Blaze-plan mahdollistaa: Cloud Functions, collectionGroup-kyselyt,
ulkoiset verkkopalvelut (Gmail), rajattomat Firestore-lukukirjoitukset.

---

## Kolmitasoinen hallintamalli

Kolmitasoinen rakenne vastaa alan standardia (PlayMetrics, 360Player).
Se on suunniteltu niin, että seurat voivat toimia täysin itsenäisesti
ilman TalentMaster-ylläpitäjän apua kaikkien perustoimintojen osalta.

Taso 1 — TalentMaster Platform (TalentMaster_Admin.html):
  Super-admin hallinnoi seuroja, paketteja ja laskutusta. Näkee kaikkien
  seurojen aggregoidun datan. Pilotin aikana voi toimia minkä tahansa
  seuran kontekstissa seuravalitsimella.

Taso 2 — Seuran hallinto (TalentMaster_Seura.html):
  VP, sihteeri ja UTJ hallinnoivat kaiken seuraan liittyvän: pelaajien
  rekisteröinti, joukkueet, valmentajien kutsuminen, sopimukset,
  Palloliiton kriteerit. Toimii itsenäisesti ilman Tason 1 apua.

Taso 3 — Operatiivinen työ (TalentMaster_Master_v8.html):
  Valmentajat, testivastaavat, fysiikkavalmentajat jne. Päivittäinen
  kirjaaminen, testitulokset, kehitysseuranta. Ei hallinnoi mitään.

---

## GitHub Pages URL:t

```
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v8.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_VP_v17.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html
```

---

## Firebase Authentication -käyttäjät

| Sähköposti | Rooli (Firestore) | Seura |
|---|---|---|
| talentmasterid@gmail.com | super_admin | Kaikki |
| vp.fcl@talentmaster.fi | vp | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | vp | KPV |
| vp.palloiirot@talentmaster.fi | vp | Pallo-Iirot |
| vp.yvies@talentmaster.fi | vp | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | vp | SJK Juniorit |
| vp.grifk@talentmaster.fi | vp | GrIFK |
| vp.hjk@talentmaster.fi | vp | HJK Juniorit |

Huomio: super-adminin rooli Firestoressä on "super_admin" (alaviivalla).
Kaikki SALLITUT_ROOLIT-tarkistukset hyväksyvät molemmat muodot.
VP-salasanojen kaava: TM_[SEURA]_2026! — vaihdetaan ennen pilottia.

---

## Firestore-tietokantarakenne

```
admins/
  {uid}/
    email, rooli ("super_admin"), superAdmin (true), luotu

seurat/
  {seuraId}/              ← fcl, kpv, palloiirot, yvies, sjk, grifk, hjk
    nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    luotu

    joukkueet/{joukkueId}/
      nimi, ikaryhma, vuosi, jarjestys, aktiivinen

    kayttajat/{uid}/
      email, rooli, etunimi, sukunimi
      joukkue: "u14"              ← vanha kenttä (yhteensopivuus Master v8)
      joukkueet: ["u14", "u12"]   ← uusi kenttä (useampi joukkue)
      joukkueNimi, joukkueetNimet
      aktiivinen, claimsAsetettu, luotu

    pelaajat/{pelaajaId}/
      etunimi, sukunimi, nimi, syntymaaika, joukkue, palloID, laji, positio
      suostumus: { annettu, antaja, antajaRooli, versio, hyväksytyt, aikaleima }
      huoltaja: { etunimi, sukunimi, email, puhelin }
      aktiivinen, luotu

    kirjaukset/{kirjausId}/       ← Harjoituskirjaukset (valmentaja)
    testit/{testiId}/             ← Mittaustulokset
      d1_fyysinen: {}, d2_tekninen: {}, d3_psykologinen: {}
      d4_kognitiivinen: {}, d5_sosiaalinen: {}
      ovr, kehitysvauhti, phv_vaihe, rae_korjaus, flei
      profiilityyppi (railgun/maestro/shadowstep/titan)
      mastery (basic/sharp/elite/signature)
    kartoitukset/{kartoitusId}/   ← Harjoitettavuuskartoitukset
    tekniikka/{kilpailuId}/       ← Tekniikkakilpailutulokset
    adar/{adarId}/                ← Game IQ / ADAR-arvioinnit
    kuorma/{kuormaId}/            ← RPE ja kuormaseuranta
    vammat/{vammaId}/             ← Kuntoutusdata (arkaluonteinen)
    kutsut/{kutsuId}/             ← Rekisteröintikutsut vanhemmille
      hEmail, linkki, joukkue, lahetetty, tila ("lahetetty"/"hyvaksytty"), lahettaja
    sopimukset/kriteerit          ← Palloliiton kori-kriteerit
      kori1_0: true/false, kori1_1: true/false ... kori3_5: true/false, paivitetty
    tapahtumat/{id}/              ← Auditointi
      tyyppi, lataaja/lahettaja, aika

kirjaukset/                       ← Vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/
```

---

## Custom Claims -arkkitehtuuri

Custom Claims on JWT-tokeniin tallennettu tieto käyttäjän roolista ja seurasta.
Se on TalentMasterin autorisoinnin ydin — jokainen Firestore-pyyntö tarkistaa
tokenin ennen kuin antaa pääsyn dataan.

Tokenin rakenne:
```javascript
{
  // Kaikille rooleille
  rooli:    "valmentaja",          // tai "vp", "super_admin" jne.
  seuraId:  "kpv",                 // null super-adminille

  // Valmentajatasoille (valmentaja, testivastaava, fysiikkavalmentaja, fysioterapeutti)
  joukkue:   "kpv_u14",            // ensimmäinen joukkue (yhteensopivuus)
  joukkueet: ["kpv_u14","kpv_u12"],// kaikki joukkueet (uusi rakenne)

  // Talenttivalmentajalla ei joukkuerajausta — näkee kaikki seuran pelaajat

  // Super-adminille
  superAdmin: true,
  seuraId:    null,                // ei seurarajausta
  joukkue:    null,
  joukkueet:  []
}
```

Cloud Functions asettaa Claims automaattisesti:
  asetaClaimsUudelle: triggeröityy kun uusi kayttajat-dokumentti luodaan
  paivitaClaimsRoolimuutoksessa: triggeröityy kun rooli tai joukkueet muuttuu
  asetaSuperAdminClaims: triggeröityy kun admins/-kokoelmaan lisätään dokumentti

---

## Datavirta: kirjautuminen (Custom Claims -arkkitehtuurilla)

```
Käyttäjä syöttää sähköpostin + salasanan
  → Firebase Auth kirjaa käyttäjän sisään
  → onAuthStateChanged laukeaa
  → getIdTokenResult(true) hakee tuoreen JWT-tokenin Custom Claimeineen
  → Claims sisältää: rooli, seuraId, joukkue(et)
  → Jos rooli on "super_admin": haetaan kaikki seurat Firestoresta
  → Jos rooli on "vp"/"sihteeri": haetaan oma seura seuraId:n perusteella
  → Jos rooli on "valmentaja": haetaan omat joukkueet joukkueet[]:n perusteella
  → Näytetään oikea näkymä — käyttäjä ei koskaan pääse väärään dataan
```

Vanha datavirta (VP-dashboard v17) käyttää Firestore-kyselyä (vp_uid == user.uid)
löytääkseen seuran. Custom Claims -arkkitehtuuri on nopeampi — seura löytyy
suoraan tokenista ilman Firestore-lukuja.

---

## Security Rules -logiikka

```javascript
// Esimerkki — valmentajan pääsy omaan joukkueeseensa
match /seurat/{seuraId}/pelaajat/{pelaajaId} {
  allow read: if request.auth != null
    && request.auth.token.seuraId == seuraId
    && (
      // Seura-tason roolit näkevät kaiken
      request.auth.token.rooli in ["vp", "seurasihteeri", "urheilutoimenjohtaja"]
      ||
      // Talenttivalmentaja näkee kaikki
      request.auth.token.rooli == "talenttivalmentaja"
      ||
      // Valmentaja näkee vain omat joukkueensa
      (request.auth.token.rooli == "valmentaja"
       && resource.data.joukkue in request.auth.token.joukkueet)
    );
}
```

Super-admin ohittaa kaikki seura- ja joukkuerajaukset superAdmin: true -kentän avulla.

---

## Pelaajadata: kaksi lähdettä

### 1. Historiallinen data (tm_data.js) — väistyvä
2417 pelaajaa, 30 seuraa, kaudet 2017-2020. Staattinen tiedosto, latautuu
selaimeen. Ei sisällä pilottiseuroja (FC Lahti, KPV jne.). Korvautuu
vähitellen Firestore-datalla — pidetään yhteensopivuuden vuoksi.

### 2. Reaaliaikainen data (Firebase Firestore) — pääroolissa
Pilottiseurojen uusi data. Harjoitteluseurantakirjaukset, testitulokset,
kartoitukset. Käyttäjän seura tunnistetaan Custom Claims -tokenista. Päivittyy
reaaliaikaisesti onSnapshot-kuuntelijan kautta — valmentaja näkee heti uudet
pelaajat ilman sivunlatausta.

---

## Pakettitasot

| Paketti | Roolit | Max pelaajia | Ominaisuudet |
|---|---|---|---|
| Perustaso | VP, sihteeri, valmentaja, testivastaava | 100 | Rekisteröinti, kirjaukset, testit, profiilit |
| Kehitystaso | + talenttivalmentaja, fysiikkavalmentaja, UTJ | 300 | + ADAR, biologinen ikä, talenttiohjelma |
| Huipputaso | Kaikki roolit | Rajaton | Kaikki ominaisuudet |

---

## Roolit

Super Admin (TalentMaster), Valmennuspäällikkö (VP), Seurasihteeri,
Urheilutoimenjohtaja (UTJ), Talenttivalmentaja, Fysiikkavalmentaja,
Fysioterapeutti, Testivastaava, Valmentaja, Pelaaja, Vanhempi.

Yhteensä 11 roolia — Seurasihteeri lisätty tänään 2026-03-25.

---

## Excel-rekisteripohja

Rakennettu openpyxl:lla Python-skriptillä (GitHub Actions tai lokaali).
SheetJS (JavaScript) ei tue DataValidation-dropdowneja luotettavasti.

Lataus selaimessa: fetch(GitHubista raw URL) → Blob → a.click()
Tiedostonimi: {SEURAID}_Pelaajarekisteri_{PÄIVÄMÄÄRÄ}.xlsx

Sihteerin prosessi:
  1. Lataa pohja Seura-näkymän Pelaajat-välilehdeltä
  2. Täytä Asetukset-välilehdelle seuran joukkueet → dropdown aktivoituu
  3. Täytä pelaajat Pelaajat-välilehdelle
  4. Lataa täytetty pohja takaisin → TULOSSA: tuontilogiikka + massakutsu

---

## TalentMaster-filosofia — tutkimuspohja arkkitehtuuripäätöksille

Jokainen tekninen rakennepäätös seuraa tutkimusevidenssiä. Tämä osio selittää
miksi järjestelmä on rakennettu niin kuin se on rakennettu.

70/30-malli koskee VAIN alkurutiinia (20-30 min ennen kenttäharjoitusta).
Kenttäharjoitus on täysin valmentajan — järjestelmä ei koske siihen.
Firestoreen kirjataan: joukkueen heikoin liikeketju (70%) ja pelaajan
henkilökohtaisesti heikoin (30%). Neljän hetken malli (KNVB-pohjainen)
ohjaa valmentajan päivää — aamu, ennen harjoitusta, aikana, jälkeen.

5D Framework Firestore-rakenteessa: jokainen testitulos tallennetaan
dimensioittain (D1-D5) erillisiin kenttiin jotta kehitysvauhti voidaan
laskea dimensiokohtaisesti. Kehitysvauhti = muutos suhteessa omaan
ikään, harjoitusmäärään ja aikaan — ei vertailu muihin.

PHV-modifikaattori (-3p kasvupyrähdyksen huipulla) on automaattinen
suoja ylikuormitukselta ja realistinen arviointi kriittisessä ikkunassa
(Philippaerts 2006: ylikuormitus PHV-huipulla lisää loukkaantumisriskiä 2,8×).

RAE-korjaus (Q1: ×0.92, Q4: ×1.06) tasoittaa syntymäkuukauden vinoutuman.
Forsman 2013: 75-85% valmentajien lahjakkaimmiksi nimeämistä 11-vuotiaista
oli syntynyt tammi-kesäkuussa — ilman korjausta arvioinnit ovat systemaattisesti
epäreiluja Q4-pelaajille.

FLEI™ (Fascia Load Efficiency Index): harjoitettavuusindeksi tallennetaan
erillisenä kenttänä Firestoreen. Yhdistyy automaattisesti PHV-vaiheeseen
loukkaantumisriskin ennustamisessa.

## Pelaajan mobiilietusivu — arkkitehtuuri

Pelaajan näkymä on TalentMasterin strategisesti tärkein yksittäinen osa.
Se ratkaisee sen, käyttääkö pelaaja järjestelmää vapaaehtoisesti vai pakosta.
Koko suunnitteluperiaate noudattaa "päivittäinen kehityksen ohjaussivu" -mallia —
ei analytiikkaraporttia.

Näkymän tekninen rakenne noudattaa samaa Firebase-arkkitehtuuria kuin muutkin
näkymät: Custom Claims autorisointi, Firestore reaaliaikaisena tietolähteenä,
onSnapshot-kuuntelijat jotka päivittävät UI:n automaattisesti kun valmentaja
lisää tehtävän tai kommenttia.

Pelaajan data Firestoressä:
  seurat/{seuraId}/pelaajat/{pelaajaId}/
    tehtavat/{id}/      — päivän tehtävä, tavoitejakso, deadline, tila
    kehitysdata/{id}/   — kehityssignaalit, trendipisteet
    valmentajaviestit/{id}/ — valmentajan kommentit, palautteet
    streak/             — aktiivisuuspäivät, level, XP

Onboarding-logiikka (ensimmäinen käyttökerta):
  1. Onboarding-kortit (Tämä ei ole arvosana → Kortti kehittyy → Yksityisyys)
  2. Ensimmäisen tavoitejakson valinta
  3. Etusivu muuttuu toiminnalliseksi — ei enää selittävä

V1 rakennettava komponenttijärjestys:
  Header (nimi + taso + streak) → Hero-kortti (päivän tehtävä, 1 CTA) →
  Tavoitejakso-kortti (edistyminen) → Kehityssignaali → Etenemiskortti

Navigaatio: Tänään | Kehitys | Joukkue | Tavoite
Visa integroituna Tänään- tai Tavoite-osioon — ei omaa tabbia.

Kriittisin suunnittelusääntö:
  Pelaajan pitää pystyä avaamaan etusivu ja tietää 3 sekunnissa,
  mikä hänen seuraava kehitysaskelensa on.

## Tulevaisuuden arkkitehtuurisuunta

Pilotin jälkeen kun maksavia asiakkaita on 20+ seuraa:
  Frontend: kirjoitetaan React-sovelluksena (yksi SPA kaikille rooleille)
  Backend: Firebase pysyy samana — Firestore, Auth, Cloud Functions
  Navigaatio: yhteinen tm_nav.js -komponentti jo ennen React-siirtymää

Kaikki nyt tehdyt arkkitehtuuripäätökset (Custom Claims, kolmitasoinen malli,
joukkueet-taulukko, Security Rules) toimivat React-sovelluksessa täsmälleen
samalla tavalla — vain frontend-kerros muuttuu.
