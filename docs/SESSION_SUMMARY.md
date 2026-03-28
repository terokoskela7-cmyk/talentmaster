# TalentMaster™ — Session Summary
# Päivitetty: 2026-03-28 (ilta) — yhdistetty 27.3. + 28.3. sessiot

---

## Projektin tila

TalentMaster on jalkapallon talenttiarviointialusta 7 pilottiseuralle + demo-fc.
Firebase-backend toimii (Blaze). Tänään (28.3.) rakennettiin koko rekisteröintipolku:
seurahallinta → Excel-tuonti → sähköpostikutsu → huoltajan suostumuslomake.

Strateginen avaus: Palloliiton koulutusyhteistyöesittely valmis.

---

## GitHub & hosting

  Repo:   https://github.com/terokoskela7-cmyk/talentmaster
  Pages:  https://terokoskela7-cmyk.github.io/talentmaster/

### Tiedostot

  TalentMaster_Seura.html                    Seura-admin näkymä             AKTIIVINEN
  TalentMaster_Admin.html                    Super Admin, kaikki seurat     AKTIIVINEN
  TalentMaster_Rekisterointi_Suostumus.html  Huoltajan suostumuslomake      AKTIIVINEN (Security Rules fix puuttuu)
  TalentMaster_VP_v17.html                   VP-dashboard, analytiikka      AKTIIVINEN
  TalentMaster_IDP_Kortti_v3.html            Pelaajan kehityskortti         AKTIIVINEN
  TalentMaster_Master_v7.html                Valmentajan näkymä             AKTIIVINEN, ei Firebase-int.
  TalentMaster_Koulutuskokonaisuus_Palloliitto.html  Palloliiton esittely   AKTIIVINEN
  TalentMaster_Harjoitettavuus.xlsx          U12/U15/U19 kartoituslomake    VIE GITHUBIIN jos ei vielä
  TalentMaster_BioIka.xlsx                   Mirwald + yli-ikäisyyssääntö   VIE GITHUBIIN jos ei vielä
  TalentMaster_HH_Testit.xlsx                H+H-testipaketti               SUUNNITELTU
  hpp_rehab_protokollat.js                   25 kuntoutusprotokollaa        AKTIIVINEN
  functions/index.js                         Cloud Functions, Nodemailer    DEPLOYTTU 28.3.
  firebase.json                              Firebase projektin config       LUOTU 28.3.
  tm_admin/firestore.rules                   Security Rules v2              AKTIIVINEN
  .github/workflows/deploy_functions.yml     GitHub Actions, CF deploy      TOIMII

---

## Firebase

  Projekti:   talentmaster-pilot (Blaze)
  Firestore:  europe-west1 / eur3 (multi-region)
  Auth:       Email/Password + Custom Claims
  Functions:  Node.js 20, europe-west1

  firebaseConfig:
    apiKey:            "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo"
    authDomain:        "talentmaster-pilot.firebaseapp.com"
    projectId:         "talentmaster-pilot"
    storageBucket:     "talentmaster-pilot.firebasestorage.app"
    messagingSenderId: "872561784446"
    appId:             "1:872561784446:web:05c4c7996dfd46ddd14a2f"

### Käyttäjät

  talentmasterid@gmail.com     dqUzvJA61Wb9fgj5UiK0riSA4NI2   Super Admin   Kaikki
  vp.kpv@talentmaster.fi       jIbW7q8nLggswTjefkYuSvtneH92   VP            KPV
  vp.fcl@talentmaster.fi       dpYcfa154ZOHshZzHrVaTZ2iTHE3   VP            FC Lahti Juniorit
  vp.palloiirot@talentmaster.fi fBf1c60rjXTPxYlsV03EfrHZ2xM2  VP            Pallo-Iirot
  vp.yvies@talentmaster.fi     U21RwOm7OYdrAQB8wTXXlDQksEk2   VP            Ylöjärven Ilves
  vp.sjk@talentmaster.fi       1eHyfKsuTSRAAsPu9kRZ22E4hwo2   VP            SJK Juniorit
  vp.grifk@talentmaster.fi     lBCx0ivDYVWLmxD9TGKsvYrFrlo1   VP            GrIFK
  vp.demo@talentmaster.fi      (demo-fc)                       VP            Demo FC

  Demo FC kirjautuminen: vp.demo@talentmaster.fi / TM_Demo_2026!
  IDP-linkit:
    Aleksi: ...IDP_Kortti_v3.html?seuraId=demo-fc&pelaajaId=demo-p001
    Eeli:   ...?seuraId=demo-fc&pelaajaId=demo-p002
    Matias: ...?seuraId=demo-fc&pelaajaId=demo-p003

### Cloud Functions (deployttu 28.3.)

  lahetaRekisteriKutsu   Lähettää suostumuslinkin huoltajalle (Nodemailer)   TOIMII
  luoKayttaja            Luo Auth-tilin + salasanasähköposti                 TOIMII
  lahetaHuoltajaKutsu    Legacy, yhteensopivuus                              OLEMASSA
  deaktivioiKayttaja     Deaktivoi käyttäjätilin                             OLEMASSA

  Gmail App Password → GitHub Secret: GMAIL_APP_PASSWORD
  Sähköposti lähetetään: talentmasterid@gmail.com

  GitHub Actions workflow:
    .github/workflows/deploy_functions.yml
    Käynnistys: Actions → "TalentMaster — Deploy Functions" → Run workflow
    Secrets: FIREBASE_SERVICE_ACCOUNT, GMAIL_EMAIL, GMAIL_APP_PASSWORD

---

## Firestore-rakenne

  seurat/{seuraId}/
    pelaajat/{autoId}/      etunimi, sukunimi, joukkue, huoltajaEmail,
                            vammahistoria, suostumus, kutsuId, tuotu
                            (tulevaisuudessa: flei_viimeisin, phv_ika, phv_tila)
    kutsut/{kutsuId}/       tyyppi, hEmail, pelaajaNimi, linkki, tila, luotu
    kayttajat/{uid}/        valmentajat, VP, henkilöstö
    joukkueet/{id}/         joukkueen tiedot
    kartoitukset/{id}/      harjoitettavuuskartoitukset (TULOSSA)
    tapahtumat/{id}/        audit-trail

  admins/{uid}/             Super Admin -dokumentit
  audit/{id}/               järjestelmätason tapahtumat

---

## Rekisteröintipolku (rakennettu 28.3.)

  1. VP kirjautuu Seura-näkymään
  2. Onboarding: "Lataa rekisteripohja"
       → Excel latautuu + tuontimodaali aukeaa automaattisesti
  3. VP täyttää Excel: Etunimi, Sukunimi, Joukkue, HuoltajanEmail
  4. "Tuo + lähetä kutsut"
       → Pelaajat → seurat/{id}/pelaajat/
       → lahetaRekisteriKutsu lähettää HTML-sähköpostin per huoltaja
  5. Huoltaja saa sähköpostin, henkilökohtainen linkki
  6. Huoltaja täyttää TalentMaster_Rekisterointi_Suostumus.html
       → Perustiedot (syntymäaika, sukupuoli, vammahistoria)
       → Suostumukset (pakolliset + vapaaehtoiset)
  7. Suostumus + tiedot → seurat/{id}/pelaajat/{id}/ → pelaaja aktivoituu

---

## Testipaketit (rakennettu 27.3.)

### TalentMaster_Harjoitettavuus.xlsx
  U12: 9 testiä, 27p max
  U15: 13 testiä, 39p max, PHV-varoitus
  U19: 8 testiä, 24p max
  Laskee: FLEI-%, FLEI-taso, kuormarajoitin, auto-ohjelma (fascia → harjoitekirjasto)
  VP_v17 hakee: .../TalentMaster_Harjoitettavuus.xlsx

### TalentMaster_BioIka.xlsx
  Mirwald 2002 -kaava: pojat JA tytöt (eri kertoimet, IF-haara D{r}="P")
  Syötteet: pituus×2, paino×2, istumapituus, syntymäpäivä, testipäivä
  Laskee: ikä, jalkojen pituus, maturity offset, PHV-ikä, PHV-tila
  Yli-ikäisyyssääntö: VLOOKUP syntymäkuukauden mukaan → KYLLA/EI
    Pojat: tammikuu 14.97 → joulukuu 14.05
    Tytöt: tammikuu 13.07 → joulukuu 12.15
  Validointi: Person 1 (poika, 163cm, 50kg, istuma 117.1cm) → PHV-ikä ~14.60
  VP_v17 hakee: .../TalentMaster_BioIka.xlsx

### Arkkitehtuuripäätös
  Bio-ikä = erillinen kartoitus (eri rytmi, tekijä, käyttötarkoitus kuin harjoitettavuus)
  Firestore-kentät: phv_ika, phv_tila, bio_ika, yliikaisyys_ok
  Testipaketti:
    Polku A — harjoitettavuus (koko joukkue)
    Polku B — bio-ikä (yksittäinen pelaaja)
  Painotukset (40/25/15/10/10) pysyvät — fyysinen biologisesti normalisoitu

---

## Palloliiton koulutusyhteistyö (27.3.)

  TalentMaster_Koulutuskokonaisuus_Palloliitto.html — valmis esittely

  Rakenne (4 kohtausta):
    Lähtökohta → Koulutus → TalentID → Yhteistyöehdotus

  Koulutustasot:
    Taso 1: Pelaajan kehityksen arviointi
    Taso 2: Oikeudenmukainen arviointi
    Taso 3: Kehityksen johtaminen tiedolla (VEAT-loppunäyttö instrumentoituna)
    Moduuli A: Pelin ymmärtäminen (Game IQ)
    Moduuli B: Talentin tunnistaminen (TalentID/Hidden Gem)

  Pilottiehdotus: 3 seuraa, 1 kausi, VEAT-välitehtävät
  Suomessa ei vastaavaa rakennetta → strateginen mahdollisuus

---

## KRIITTINEN BUGI — KORJAA ENSIN

### Security Rules: huoltajan tallennus estetty

  Ongelma:
    Huoltaja (ei kirjautunut) yrittää kirjoittaa seurat/kpv/pelaajat/
    Security Rules vaatii kirjautumisen → Missing or insufficient permissions

  Ratkaisu — Firebase Console → Firestore → Rules:

    // MUUTA:
    allow create: if onHallinta(seuraId);

    // TÄHÄN:
    allow create: if onHallinta(seuraId) || request.auth == null;

  Paina Publish.

---

## Toimivat asiat (28.3. lopussa)

  VP kirjautuu Seura-näkymään sähköpostilla
  Super Admin näkee kaikki seurat
  Henkilöstön kutsu — 1 sähköposti, ei duplikaattia
  Salasana-nappi lähettää uuden reset-linkin
  Excel-tuonti tunnistaa otsikkorivin dynaamisesti (rivi 5 pohja-tiedostossa)
  Onboarding: lataa pohja + avaa tuontimodaali automaattisesti
  lahetaRekisteriKutsu lähettää HTML-sähköpostin
  WhatsApp-numero muodostuu oikein (+358...)
  Rekisteröintilomake: toStep2, toStep3 toimivat
  Vammahistoria-kenttä lomakkeessa
  Biologisen iän info-teksti suostumuslomakkeessa
  "Tuo Firestoreen" -nappi poistettu (jäljellä vain "Tuo + lähetä kutsut")

---

## Prioriteettijärjestys — seuraavat sessiot

### Sprint 1 — heti (ennen pilottia)

  1. Security Rules fix (yllä, 5 min, KRIITTINEN)
  2. Testaa koko polku uudelleen KPV:llä
  3. Kutsu-statusseuranta Sopimukset-välilehdelle
       → Lista: "Odottaa" / "Suostumus annettu" / "Vanhentunut"
       → Lähetä uudelleen -toiminto
  4. Vie GitHubiin jos puuttuu: Harjoitettavuus.xlsx, BioIka.xlsx

### Sprint 2 — huhtikuu (ennen KORI-deadlinea 20.4.)

  5. Valmentajan kenttähavainto → Firestore
       → 10 sek kirjaus kentällä, 3 tyyppiä:
         vahvistus / kehityshavainto / erityinen hetki
  6. VP-näkymä: yli-ikäisyyssignaalikortti
       → pelaajat joilla yliikaisyys_ok === true
  7. KORI-kriteerit VP-dashboardiin (julki 20.4. jälkeen)
  8. Tuontilogiikka: SheetJS → kartoitukset-kokoelma + pelaajan flei_viimeisin

### Sprint 3 — kesäkuu (ennen KORI-nimeämisiä)

  9.  Master v8 — valmentajan mobiilnäkymä
  10. VP:n vuosikello — tavoitteet + seuranta
  11. Palloliiton koulutusyhteistyö — tapaaminen + neuvottelu

### Myöhemmin

  12. Game IQ Firebase-integraatio (adar/-kokoelma olemassa)
  13. TalentMaster_HH_Testit.xlsx — kolmas testipaketti
  14. Pelaaja-näkymä
  15. Excel-pohjan automaattinen joukkuetäyttö (openpyxl Cloud Function)
  16. tm_nav.js integrointi (vasta Master v8 + Pelaaja-näkymä valmis)

---

## Tekniset muistiinpanot

### Kriittiset ratkaisut

  1.  Firestore Rules: allow create JA allow update molemmat tarvitaan
  2.  Syntymäaika: Date.UTC() — ei new Date(string)
  3.  onAuthStateChanged-silmukka: _kirjautuminenKesken-lippu
  4.  GitHub Pages CDN: Ctrl+Shift+R hard reload tai incognito
  5.  Firebase custom claims: kirjaudu ulos+sisään aktivoinnin jälkeen
  6.  Firebase functions region: AINA europe-west1, EI us-central1
        firebase.functions() → us-central1 (VÄÄRÄ)
        firebase.app().functions('europe-west1') → OIKEA
  7.  Firestore alikokoelmat: poista orderBy, järjestele JS:ssä
  8.  Security Rules VP: kolme tunnistustapaa (super-admin / custom claim / vp_uid)
  9.  FIREBASE_SERVICE_ACCOUNT: kokeile JSON.parse, sitten base64
  10. Syntaksivirhe: .catch() irrallaan puolipisteisen lauseen jälkeen → kaataa koko JS
  11. GitHub-editori + äöå → rikkoo UTF-8 → kirjoita tiedostot Claudella, ei editorissa
  12. Firestore eur3 → Firebase Email Extension ei tue → käytä Nodemailer
  13. sendPasswordResetEmail: älä kutsu erikseen jos Cloud Function lähettää jo
  14. Mirwald-kaava Excelissä: pojat/tytöt IF-haara D{r}="P"
  15. Yli-ikäisyys VLOOKUP: MONTH(syntymäpäivä) → kynnysarvo-taulukko
  16. VP_v17 KRT-tab: krtLaskeKetjupisteet() + krtLaskeAutoOhjelma() tallentavat automaattisesti
  17. tm_nav.js: lisätään VASTA Master_v8 + Pelaaja-näkymä valmis

### Arkkitehtuuriperiaatteet

  "Pelaaja ensin, hallinto vahvistaa"
  Minimaalinen data rekisteröinnissä — muut tiedot huoltaja täyttää
  Kutsu aina henkilökohtainen linkki — ei yleistä rekisteröintisivua
  Super Admin (talentmasterid@gmail.com) näkee aina kaiken — absoluuttinen periaate
  Bio-ikä ja harjoitettavuus ovat erilliset kartoituspolut (eri rytmi, tekijä)
  Painotukset (40/25/15/10/10) pysyvät — fyysinen normalisoitu biologisesti
