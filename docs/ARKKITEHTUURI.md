# TalentMaster™ — Järjestelmäarkkitehtuuri
*Päivitetty 2026-03-27 — sisältää fascia-linjat, pelaajan identiteettiprofiili, 70/30-malli, kotitehtävät, seuran identiteetti*

---

## Yleiskuva ja filosofia

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa muiden lajien) talenttiarviointiin ja pelaajien kehitysseurantaan. Asiakas on seura, ei yksittäinen valmentaja. Perusfilosofia: **"Pelaaja ensin, hallinto vahvistaa."**

Järjestelmä perustuu kolmeen tutkimusankkuriin:
- Forsman 2013 (JY, N=509): ponnauttelu + pujottelu + päätöksenteko erottelivat lahjakkaita U11–U14
- Liikanen & Törmä 2025 (N=1843): ketteryys erotteli ammattilaiset (p=0.001), CMJ ei
- Philippaerts 2006: PHV-huipulla motorinen koordinaatio heikkenee, ylikuormitusriski 2.8×

**Yksinkertaistusperiaate:** Taustalla pyörii monimutkainen järjestelmä (FLEI, fascia-linjat, PHV, RAE, 70/30, auto-ohjelma), mutta asiakkaalle näytetään aina yksinkertainen toimenpide:
- VP: "Kolme pelaajaa tarvitsee huomiotasi tänään"
- Valmentaja: "Tee tämä harjoite. Näin. Nyt."
- Pelaaja: "OVR nousi. Streak jatkuu. Yksi tehtävä kotiin."
- Vanhempi: "Lapsesi kehittyy. Tässä yksi asia kotiin."

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla) | GitHub Pages |
| Tietokanta | Firebase Firestore | europe-west1 |
| Autentikointi | Firebase Authentication | Email/Password |
| Pelaajadata (historia) | tm_data.js (staattinen) | GitHub Pages |
| Admin-skriptit | Node.js + Firebase Admin SDK | GitHub Actions |

---

## Firestore-tietokantarakenne (päivitetty)

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/                          ← fcl, kpv, palloiirot, yvies, sjk, grifk
    id, nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    max_pelaajia, tilastot{}
    luotu

    ─── SEURAN IDENTITEETTI JA VALMENNUSLINJA (UUSI) ──────────────────────
    identiteetti/
      pelitapa: string              ← "nopea, tekninen, proaktiivinen"
      prioriteettiominaisuudet: []  ← ["nopeus", "1v1-taito", "peliäly"]
      valmennuslinja/
        ydinlause: string           ← "Kehitämme älykkäitä, nopeita ja taitavia pelaajia"
        prioriteettiketjut: []      ← ["SBL", "SL", "DFL"] — mihin seuran harjoittelu painottuu
        ikäluokkakohtainen: {
          U12: { painopiste, paaharjoite, mittari }
          U15: { painopiste, paaharjoite, mittari }
          U19: { painopiste, paaharjoite, mittari }
        }
      tavoitemittarit: {
        nopeus:    { mittari: "10m sprint", tavoite_U15: "<1.78s", tavoite_U19: "<1.72s" }
        tekniikka: { mittari: "TSI", tavoite: "≤0.3s" }
        pelialy:   { mittari: "ADAR", tavoite_U15: "≥8/12", tavoite_U19: "≥10/12" }
      }
      pelaajapolustaValmistuneet: []  ← seurataan millaisia pelaajia tuotetaan
    ────────────────────────────────────────────────────────────────────────

    joukkueet/{joukkueId}
    kirjaukset/{kirjausId}            ← VP:n harjoitteluseurantakirjaukset

    pelaajat/{pelaajaId}/             ← PELAAJAN IDENTITEETTIPROFIILI (UUSI)
      palloID: string                 ← Palloliiton tunniste
      firebase_uid: string
      nimi, syntymäaika, sukupuoli
      joukkue, positio
      biologinen_ika: number          ← Mirwald 2002
      PHV_vaihe: string               ← "pre-PHV" | "PHV-huippu" | "post-PHV" | "vakaa"
      RAE_kvartiili: string           ← Q1 | Q2 | Q3 | Q4
      FLEI_pct: number                ← 0-100, harjoitettavuusindeksi
      flei_viimeisin: { pct, taso, pvm, ikäluokka }
      flei_historia: []               ← [{pct, pvm, kausi}]
      ketjupisteet: {                 ← FASCIA-LINJAT (UUSI - KRIITTINEN)
        SBL: number                   ← Vauhtiketju 0-3
        SFL: number                   ← Lähtöketju 0-3
        LL:  number                   ← Suunnanmuutosketju 0-3
        SL:  number                   ← Kiertoketju 0-3
        DFL: number                   ← Hallintaketju 0-3
        FL:  number                   ← Yhdistelmäketju 0-3
        heikoin: string               ← automaattisesti laskettu
        vahvin: string                ← automaattisesti laskettu
        paivitetty: timestamp
      }
      TSI: number                     ← Tekniikkaindeksi (SM-pallo - SM-juoksu, sekunteina)
      ADAR_pisteet: number            ← 0-12
      IDP_taso: string                ← "perus" | "laajennettu" | "talenttikortti"
      X_Factor_signaali: boolean
      X_Factor_tyyppi: string         ← "Nopeus-XF" | "Räjähtävyys-XF" | "Tekniikka-XF" | "GameIQ-XF"
      profiilityyppi: string          ← "Railgun" | "Maestro" | "Shadowstep" | "Titan"
      profiili_mastery: string        ← "Basic" | "Sharp" | "Elite" | "Signature"
      D1_fyysinen: number             ← max 40p
      D2_tekninen: number             ← max 25p
      D3_psykologinen: number         ← max 15p
      D4_kognitiivinen: number        ← max 10p
      D5_sosiaalinen: number          ← max 10p
      D_yhteensa: number              ← D1+D2+D3+D4+D5 + PHV-mod + RAE-korjaus
      harjoitettavuus_historia: []
      hh_historia: []
      tekniikka_historia: []
      kotitehtava_streak: number      ← päivien putki
      kotitehtava_viimeisin: timestamp

    kartoitukset/{kartoitusId}/       ← Harjoitettavuuskartoitukset U12/U15/U19
      pelaajaId, joukkueId
      pvm, ikäluokka, sukupuoli
      testit: {
        [testiNimi]: {
          tulos: number
          pisteet: number             ← 1-3
          fascia_linja: string        ← UUSI: "SBL" | "SFL" | "LL" | "SL" | "DFL" | "FL"
          viitearvo_alaraja: number
          viitearvo_yläraja: number
        }
      }
      FLEI_pct: number
      FLEI_taso: string               ← "hyvä" | "kehitys" | "prioriteetti"
      ketjupisteet_yhteenveto: {}     ← lasketaan kartoituksesta
      auto_ohjelma: {                 ← UUSI: automaattinen harjoitesuositus
        heikoin_ketju: string
        aktivointi: string
        taso1_harjoite: string
        kenttacue: string
        PHV_kuormaperiaate: string
      }

    testit/{testiId}/                 ← H-H polku -mittaukset
      pelaajaId, joukkueId
      pvm, testaaja
      mittaukset: {
        sprint_10m, sprint_30m       ← fascia_linja: "SBL"
        CMJ, SJ                      ← fascia_linja: "SBL"/"SFL"
        kasirata                     ← fascia_linja: "LL"
        SM_juoksu                    ← fascia_linja: "LL"/"SL"
        SM_pallo                     ← fascia_linja: "SL" (fyys.) + TSI (tekn.)
        pujottelu                    ← fascia_linja: "SL"/"FL"
        syotto                       ← fascia_linja: "FL"
        MAS_1200m                    ← kestävyys
      }
      TSI: number                     ← laskettu: SM_pallo - SM_juoksu
      fascia_profiilit: {}            ← testit ryhmiteltynä linjoittain

    tekniikka/{kilpailuId}/
      TSI_indeksi: number
      tekniikka_XF: boolean

    adar/{adarId}/                    ← Game IQ / ADAR-arvioinnit
    kuorma/{kuormaId}/                ← RPE ja kuormaseuranta
    vammat/{vammaId}/                 ← arkaluonteinen

kirjaukset/                           ← Vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/
```

---

## Pelaajan identiteettiprofiili — 7-kerroksinen arkkitehtuuri

Kerros 1 — Raakadata: harjoitettavuus (FLEI), H-H testit, SM-pallo/tekniikka, ADAR/Game IQ → Firestore

Kerros 2 — Fascia-linjat (HPP ELITE -viitekehys): testit tulkitaan 6 fascia-linjan kautta. SBL=Vauhtiketju, SFL=Lähtöketju, LL=Suunnanmuutosketju, SL=Kiertoketju, DFL=Hallintaketju, FL=Yhdistelmäketju

Kerros 3 — Identiteettiprofiili (Firestore-ankkuri): PalloID + Firebase UID + ikä + biologinen ikä + PHV + positio + RAE + FLEI + ketjupisteet + TSI + ADAR + IDP-taso + X-Factor + D1-D5

Kerros 4 — Toimenpide-ohjaus:
- Auto-ohjelma: 1p → fascia-linja → harjoite + kenttäcue valmentajalle
- IDP-aktivointi: 3 reittiä (manuaalinen / FLEI<40% klinikka / X-Factor)
- X-Factor/Talenttiohjelma: kaikki ketjut ≥2 → signaali → KORI-kriteerit

Kerros 5 — Kotitehtävät (UUSI): pallollinen tekninen + fyysinen liikkuvuus per liikeketju, streak-mekaniikka

Kerros 6 — Näkymät: pelaaja/vanhempi/valmentaja/VP eri kielellä

Kerros 7 — Seuran identiteetti: valmennuslinja + tavoitemittarit → tuottaako seura millaisia pelaajia

---

## 70/30-harjoitteluohjelmointi

70/30 koskee **alkurutiinia** — ei koko harjoitusta. Alkurutiini = 20-30 min ennen kenttäharjoitusta.

70% yhteinen: kaikki 5 liikeketjua aktivoidaan joka harjoituksessa. Tekninen pääharjoite kiertää joukkueen 2 heikointa ketjua viikottain.

30% yksilöllinen: pelaajan HEIKOIN liikeketju (FLEI 1p-tulos) → 1p → fascia-linja → aktivointi + taso 1 harjoite + kenttäcue. Neurofysiologinen peruste: siirtovaikutus heikosta osaamisesta peliin vaatii integraatiota, ei eristystä.

Kenttäharjoitus on täysin valmentajan suunnittelema — TalentMaster ei koske siihen.

Ikäluokkakohtaiset kuormaperiaatteet:
- U12: 100% kehonpaino, DFL ensin, kaikki pallolla, deliberate play
- U15: MAX 60% kuorma PHV-huipulla, SLR-flossing pakollinen, SBL+SFL ensin
- U19: normaali progressio, 5RM voimatestit, positiokohtainen fascia-painotus

---

## SM-pallo — kaksoismerkitys

H-H testi (fyysinen): SL-ketjun räjähtävyys + suunnanmuutos pallon kanssa. Rata 10m, 2 hyväksyttyä suoritusta.

Tekniikkaindeksi (TSI): `TSI = SM-pallo-aika − SM-juoksu-aika`. TSI ≤ 0.3s = pallo ei hidastu = Tekniikka-XF.

---

## Seuran identiteetti ja valmennuslinja — uusi moduuli

Ajattelun perusta: Ajax/FCN/Benfica kaikki kertovat selkeästi "millainen seura olemme ja millaisia pelaajia tuotamme". TalentMaster mahdollistaa tämän mittauksella:

1. Seura määrittelee tavoitteensa: "kehitämme nopeita, teknisiä, älykkäitä pelaajia"
2. Järjestelmä mittaa automaattisesti: miten joukkueen ketjupisteet, TSI ja ADAR kehittyvät yli ajan
3. VP näkee: "ovatko tulokset linjassa tavoitteemme kanssa?"
4. Kehityskaari: millaisia pelaajia on lähdössä pelaajapolulta — vastaavatko he seuran identiteettiä?

Mittarit tavoitteille:
- "Nopea" → 10m sprint -jakauma ikäluokittain, kehitysvauhti
- "Taitava" → TSI-jakauma, pujottelu, SM-pallo
- "Älykäs" → ADAR-pistetaso, pre-scanning -havainnot

---

## Kansainvälinen vertailu — TalentMasterin asemointi

| Malli | Vahvuus | Miksi TM eroaa |
|---|---|---|
| Ajax TIPS | 4D-malli, identiteetti | Vain ammattilaisille, ei seuratyökalua |
| FCN Right to Dream | Kehitysvauhti, peliminuutit | Ei pienille seuroille, ei vanhemmille |
| Benfica 360° | IDP + lab + data | 200 henkilöstöä, ei skaalaudu |
| TalentMaster | VP+valmentaja+pelaaja+vanhempi samassa | UNIIKKI: toimii pienelle seuralle |

TalentMasterin kilpailuetu: maailmassa ei ole järjestelmää joka yhdistää kaikki neljä roolia samaan alustaan pienelle seuralle suomalaisella evidenssipohjalla.

---

## Firebase Authentication -käyttäjät

| Sähköposti | Rooli | Seura |
|---|---|---|
| talentmasterid@gmail.com | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | Valmennuspäällikkö | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | Valmennuspäällikkö | KPV |
| vp.palloiirot@talentmaster.fi | Valmennuspäällikkö | Pallo-Iirot |
| vp.yvies@talentmaster.fi | Valmennuspäällikkö | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | Valmennuspäällikkö | SJK Juniorit |
| vp.grifk@talentmaster.fi | Valmennuspäällikkö | GrIFK |

---

## Tunnetut ratkaisut ja bugit (2026-03-27)

1. Firestore Rules pelaajille vaatii allow create JA allow update
2. Suostumuslomakkeen syntymäaika parsitaan Date.UTC:llä ei new Date(string):llä
3. onAuthStateChanged-silmukka estetään _kirjautuminenKesken-lipulla
4. enablePersistence poistettu — aiheutti IndexedDB-konfliktin
5. SheetJS ei kirjoita Excel-tyylejä ilman Pro-lisenssiä
6. tm_nav.js lisätään VASTA kun Master_v8 + Pelaaja-näkymä valmis (topbar-konflikti)# TalentMaster™ — Järjestelmäarkkitehtuuri
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
