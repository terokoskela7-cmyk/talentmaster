# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-03-31)

TalentMaster on jalkapallon talenttiarviointialusta. 7 aktiivista pilottiseuraa:
FC Lahti Juniorit, KPV, Pallo-Iirot, Ylöjärven Ilves, SJK Juniorit, GrIFK, HJK Juniorit.
Lisäksi luotu testiseuroja: FC Vaasa, FC Kokkola, Demo FC.

Tässä sessiossa rakennettu VP v18, korjattu Admin.html ja Seura.html,
testattu onboarding-virta läpi, analysoitu SJK-demo ja tehty integraatiopäätös.

---

## GitHub

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

### Tärkeimmät tiedostot

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| TalentMaster_VP_v17.html | VP-dashboard VANHA, pysyy rinnalla | Toimii |
| TalentMaster_VP_v18.html | VP-dashboard UUSI, tässä sessiossa | GitHubissa |
| TalentMaster_Admin.html | Admin super adminille | Korjattu |
| TalentMaster_Seura.html | Seura-hallinta VP:lle | Korjattu |
| TalentMaster_Master_v8.html | Valmentajan näkymä | GitHubissa |
| TalentMaster_IDP_Kortti_v3.html | Pelaajan IDP | GitHubissa |
| TalentMaster_SJK_Demo_v2.html | SJK-myyntidemo kovakoodatulla datalla | GitHubissa |
| functions/index.js | Cloud Functions 6 kpl | Deploy #6 |
| tm_admin/firestore.rules | Security Rules | Deployattu |

---

## Firebase

- Projekti: talentmaster-pilot (Blaze plan)
- Firestore: eur3 multi-region
- Cloud Functions: europe-west1, Node.js

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain:        "talentmaster-pilot.firebaseapp.com",
  projectId:         "talentmaster-pilot",
  storageBucket:     "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId:             "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
```

### Käyttäjät

| Sähköposti | UID | Rooli | Seura |
|---|---|---|---|
| talentmasterid@gmail.com | pvKJoVywWfTouQQgoxggUmGYD0E2 | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |
| TeroKoskela7@gmail.com | 9cdMBpObEZg575Rth3vgSBPpliA2 | VP | FC Kokkola (testitunnus) |

TÄRKEÄÄ: Super Admin UID muuttui — uusi UID on pvKJoVywWfTouQQgoxggUmGYD0E2.
admins-dokumentissa on nyt superAdmin: true JA rooli: "super_admin" — molemmat tarvitaan.

---

## Tässä sessiossa tehdyt työt (2026-03-31)

### Admin.html — korjaukset

- Muokkaa/poista-funktiot lisätty JS-globaaliin scopeen (puuttuivat kokonaan)
- avaaSeuraVP ohjaa Seura.html:ään (ei enää VP v17)
- Uuden seuran luonti samassa modalissa VP:n kanssa (lopullinenSeuraId-logiikka)
- Roolivalikko optgroup-ryhmillä: Johto / Valmennus / Tuki
- VP:n kutsu asettaa automaattisesti vp_uid + vp_email seuradokumenttiin

### Seura.html — auth-fallback

Ongelma: !SALLITUT_ROOLIT.includes(rooli) hylkäsi VP:n ennen fallback-koodia.
Korjaus — 2-tasoinen fallback ENNEN hylkäystarkistusta:
1. vp_uid === user.uid seuradokumentissa
2. kayttajat collectionGroup (kattaa sihteeri, UTJ, useampi VP)

Uudet KPI-kortit yhteenvetoon: kartoituksia, FLEI-ka, tapahtumat, Palloliiton korit.

### VP v18 — rakennettu alusta

Auth — 5 bugia korjattu:

B1: kirjauduSisaan rekisteröi uuden onAuthStateChanged -> kutsui asetaSeura(null)
    Korjaus: _tunnistaudu(cred.user) suoraan, ei uutta kuuntelijaa

B2: asetaSeura(null) kaatui Firestoreen
    Korjaus: null-guard funktion alussa

B3: Super admin jumittui ensimmäiseen seuraan
    Korjaus: seura-dropdown headeriin, _kaikki_seurat-lista

B4: orderBy('jarjestys') kaatui puuttuvaan kenttään
    Korjaus: .get() + JS-sort (fallback 99)

B5: _kirjautuminenKesken asetettiin liian myöhään
    Korjaus: asetetaan ennen signInWithEmailAndPassword

3-tasoinen VP-tunnistus:
1. vp_uid seuradokumentissa (nopein)
2. kayttajat-alikokoelma collectionGroup
3. Custom Claims tokenista

7 tabia ja niiden sisältö:

Tilanne nyt: Banner, KPI-kortit (pelaajat/FLEI/IDP/X-Factor), automaattiset alertit,
             FLEI-jakauma ikäluokittain, valmennuslinja-toteutuma

Kartoitukset: Taulukko FLEI-badgeineen, klinikkasuositus jos FLEI < 40

Kalenteri: onSnapshot-tapahtumat tila-badgeineen

Henkilöstö: Valmentajat rooleineen ja claimsAsetettu-tiloineen

Tavoitteet: Palloliiton 3 koria, 18 kriteeriä, tallentuvat Firestoreen per kriteeri

Valmennus: Mentor-kortit (käyntihistoria per valmentaja, VP merkitsee käynnin)
           + Hyvinvointiyhteenveto joukkueittain (energia/mieliala/motivaatio/palautuminen)

Pelaajapolut: Suodatettava lista — IDP puuttuu / talenttisuositus / erityistuki / siirtopäätös
              Ohjetekstit viittauksilla Côté 2007, Forsman 2013

Kausirakenne: Koko kausi tammikuusta marraskuuhun avaintapahtumineen
              (kartoitukset, IDP-päivitykset, talenttisuositukset, mentoroinnit, siirtopäätökset)
              Tapahtumat merkittävissä tehdyksi → tallentuu Firestoreen

Automaattiset alertit:
- Punainen: PHV-varoitus (phv_tila: 'PH' joukkueen pelaajista)
- Keltainen: Matala FLEI (>30% joukkueen pelaajista FLEI < 50, heikoin ketju lasketaan)
- Vihreä: X-Factor/Hidden Gem (FLEI noussut >=15p + arvo >=70)
- Sininen: Ei kartoituksia → ohjataan kalenteriin

Ohjetekstit (info-box) kaikissa uusissa osioissa:
- Valmentajien seuranta: "Valmentaja selittää 40% kehityserosta..."
- Hyvinvointi: "Jos >30% pelaajista matala → kevennä harjoittelua"
- Pelaajapolut: tutkimusviittaukset Côté 2007, Forsman 2013
- Kausirakenne: "Kehitys tapahtuu rakenteellisesti, ei sattumanvaraisesti"

22 visuaalista korjausta:
- Kaikki 10px-badget -> 11px (luettavuusminimum tummalla taustalla)
- Tab-napit min-height 44px (Apple/Google mobiilisuositus)
- Banner: vasemmalle sininen korostusviiva
- Info-box: vasemmalle 3px sininen viiva (erottaa ohjeen datasta)
- KPI hover: sininen box-shadow
- Myöhässä/kiireinen aikajana: taustaväri reunan lisäksi
- Mobiili <500px: gstatus ja ae-kuvaus piilotetaan

Uudet Firestore-kokoelmat VP v18:lle:
- seurat/{id}/mentoroinnit/ — VP:n käyntimuistiinpanot valmentajista
- seurat/{id}/hyvinvointi/ — valmentajan viikoittainen joukkuetila-arvio
- seurat/{id}/kausirakenne/ — kauden avaintapahtumat tehdyksi-merkintöineen

### Onboarding-virta testattu

FC Kokkola testiseuralla dokumentoitu toimivaksi:
Admin luo seuran + VP -> Cloud Function luo Auth-tilin -> salasanavaihto onnistui
-> VP kirjautuu Seura.html -> fallback tunnistaa vp_uid:llä -> pääsee sisään.

"Odottaa"-tila näkyy Admin-näkymässä (Custom Claims puuttuu) mutta ei estä kirjautumista v18:ssa.

### admins-dokumentti korjattu

Super Admin UID muuttui. Lisätty kentät superAdmin: true ja rooli: "super_admin".
Cloud Function tarkistaa molemmat — pelkkä dokumentin olemassaolo ei riitä luoKayttaja-kutsussa.

### SJK-demo analysoitu + integraatiopäätös

Demo esitelty SJK:lle 2026-03-31. Päätetty integroida tuotantoon 4 sprintin suunnitelmalla.

Kansainväliset parhaat käytännöt analysoitu: Ajax TIPS-malli, KNVB, KINEXON,
GPS-kuormatutkimus (Frontiers 2025). Tunnistettu 5 puuttuvaa ominaisuutta jotka
kaikki rakennettiin v18:aan: valmentajienseuranta, hyvinvointi, pelaajapolut,
kausirakenne, ohjetekstit selityksineen.

Sprint-suunnitelma:
- Sprint 1: VP v18 (valmis)
- Sprint 2: Pelaaja-näkymä + FIFA-kortti Firestoresta
- Sprint 3: Valmentaja Master v8:ssa (harjoitussuunnitelma joukkueen datasta)
- Sprint 4: Vanhempi-näkymä (selkokielinen, huoltajille)

---

## Avoimet ongelmat

| Ongelma | Prioriteetti | Ratkaisu |
|---|---|---|
| Gmail App Password saattaa olla vanhentunut | Korkea | Tarkista Functions Logs / vaihda SendGridiin |
| Custom Claims ei asetu automaattisesti | Korkea | onDocumentCreated-triggeri functions/index.js:ään |
| VP v18 ei testattu live-datalla | Korkea | Testaa super admin + KPV:n VP ensi sessiossa |
| FC Vaasa ja HJK ilman VP:tä | Matala | Testiseuroja, voidaan poistaa |

---

## Firestore-rakenne

```
seurat/{seuraId}/
  id, nimi, laji, paketti, aktiivinen, vp_uid, vp_email, luotu

  tapahtumat/{id}
    nimi, tyyppi, joukkueId, joukkueNimi, pvm, tila

  joukkueet/{id}/
    nimi, jarjestys, ikäluokka, siirtymisvuosi

    pelaajat/{id}
      etunimi, sukunimi, syntymaVuosi, phv_tila (AN/PH/VA),
      idp_aktiivinen, talenttisuositus, uid

    kartoitukset/{id}
      pelaaja_id, nimi, flei (tai flei_pisteet), profiili,
      pvm, sbl, sfl, ll, sl, dfl, flei_nousu

  kayttajat/{uid}
    etunimi, sukunimi, email, rooli, joukkueNimi, seuraId,
    aktiivinen, claimsAsetettu, uid, lisenssi, kehitystavoite

  kriteerit/{key}           kori1_0 ... kori3_5 (18 kpl)
    taytetty: bool, paivitetty: timestamp

  mentoroinnit/{id}         UUSI v18
    valmentajaUid, valmentajaNimi, muistiinpano, kirjaaja, pvm

  hyvinvointi/{id}          UUSI v18
    joukkueId, joukkueNimi, energia, mieliala,
    motivaatio, palautuminen (1-5), pvm

  kausirakenne/{key}        UUSI v18
    tehty: bool, paivitetty: timestamp

admins/{uid}
  superAdmin: true, rooli: "super_admin",
  claimsAsetettu: true, backfillAjettu: true
```

---

## Seuraavat tehtävät prioriteettijärjestyksessä

Heti ensi sessiossa:
1. Testaa VP v18 live — super admin + KPV:n VP
2. Tarkista Gmail App Password (Functions Logs)
3. Custom Claims -triggeri functions/index.js:ään

Sprint 2:
4. Pelaaja-näkymä + FIFA-kortti
5. IDP-kortti v3 pelaajatunnuksilla
6. FLEI yli ajan -kehityskaari

Sprint 3:
7. Valmentajan harjoitussuunnitelma heikoimman ketjun mukaan
8. Hyvinvointikysely Master-näkymään
9. ADAR-pisteet Firestoreen

Infrastruktuuri:
10. tm_nav.js integrointi VP v18:aan
11. Excel -> Firestore tuonti Admin-näkymään

---

## Arkkitehtuuriperiaatteet (kriittiset)

1. onAuthStateChanged rekisteröidään VAIN kerran — ei uutta kuuntelijaa per login
2. _kirjautuminenKesken asetetaan ENNEN async-operaatiota
3. admins/{uid} tunnistus .exists-kentällä — Cloud Function tarvitsee myös superAdmin: true
4. Joukkueet: .get() + JS-sort — EI orderBy('jarjestys') (kenttä voi puuttua)
5. VP-tunnistus 3 tasolla: vp_uid -> kayttajat collectionGroup -> Claims
6. Seura.html: VP-rooli haetaan ENNEN hylkäystarkistusta
7. Seura-vaihto: lazy-load flagit nollataan, _unsubKal() kutsutaan
8. Cache-busting: ?v=N URL-parametri (Fastly CDN)
9. Super Admin dropdown: _kaikki_seurat lista + header replaceWith(select)

---

## Design-system (v18)

Pääväri: #4A7ED9 (sininen), tausta: #06090F, kortit: #161D27
Fonttikoot: 32px KPI / 26px h1 / 19px stitle / 13-14px body / min 11px
Mobiili breakpointit: 800px / 700px / 500px
Kosketusalueet: tab min-height 44px, napit min 36px
