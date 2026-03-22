# TalentMaster™ — Järjestelmäarkkitehtuuri

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa muiden lajien) talenttiarviointiin ja pelaajien kehitysseurantaan. Asiakas on seura, ei yksittäinen valmentaja.

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla) | GitHub Pages |
| Tietokanta | Firebase Firestore | europe-west1 |
| Autentikointi | Firebase Authentication | Email/Password |
| Pelaajadata (historia) | tm_data.js (staattinen) | GitHub Pages |
| Admin-skriptit | Node.js + Firebase Admin SDK | GitHub Actions |

## Firebase-projekti

- **Projekti:** `talentmaster-pilot`
- **Spark plan** (ilmainen) — riittää pilottivaiheeseen
- **Firestore sijainti:** europe-west1 (Frankfurt)

## Firestore-tietokantarakenne

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/                        ← fcl, kpv, palloiirot, yvies, sjk, grifk
    id, nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    ominaisuudet[], roolit[]
    max_pelaajia, tilastot{}
    luotu

    joukkueet/{joukkueId}
    kirjaukset/{kirjausId}          ← VP:n harjoitteluseurantakirjaukset
    testit/{testiId}                ← Mittaustulokset
    kartoitukset/{kartoitusId}      ← Harjoitettavuuskartoitukset U12/U15/U19
    tekniikka/{kilpailuId}          ← Tekniikkakilpailutulokset
    adar/{adarId}                   ← Game IQ / ADAR-arvioinnit
    kuorma/{kuormaId}               ← RPE ja kuormaseuranta
    vammat/{vammaId}                ← Kuntoutusdata (arkaluonteinen)
    kayttajat/{kayttajaId}          ← Seuran käyttäjät ja roolit

kirjaukset/                         ← Vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/                 ← Vanha rakenne (yhteensopivuus)
kirjaukset_tapahtumat/              ← Vanha rakenne (yhteensopivuus)
```

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

Salasanat: `TM_[SEURA]_2026!` — vaihdetaan oikeisiin ennen pilottia

## GitHub Pages URL:t

```
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_VP_v17.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v7.html
```

## Pelaajadata: kaksi lähdettä

### 1. Historiallinen data (tm_data.js)
- 2417 pelaajaa, 30 seuraa, kaudet 2017-2020
- Staattinen tiedosto, latautuu selaimeen
- Ei sisällä pilottiseuroja (FC Lahti, KPV jne.)

### 2. Reaaliaikainen data (Firebase)
- Pilottiseurojen uusi data
- Harjoitteluseurantakirjaukset
- Testituokset ja kartoitukset
- Kirjautuneen käyttäjän seura tunnistetaan automaattisesti

## Datavirta: kirjautuminen

```
Käyttäjä syöttää sähköpostin + salasanan
  → Firebase Auth tunnistaa käyttäjän
  → Firestore hakee seura-dokumentin (vp_uid == user.uid)
  → initDash() asettaa oikean seuran
  → Session-load hakee seuran kirjaukset Firebasesta
  → LocalStorage päivittyy välimuistina
```

## Security Rules -logiikka

- **Super-admin** (`talentmasterid@gmail.com`): lukee kaiken
- **Seuran VP**: lukee ja kirjoittaa oman seuransa kaiken datan
- **Seuran jäsen** (valmentaja jne.): lukee oman seuransa datan, kirjoittaa rajoitetusti
- **Ei kirjautunut**: ei pääsyä mihinkään

## Pakettitasot

| Paketti | Roolit | Max pelaajia | Ominaisuudet |
|---|---|---|---|
| Perustaso | VP, valmentaja, testivastaava | 100 | Kirjaukset, testit, profiilit |
| Kehitystaso | + talenttivalmentaja, fysiikkavalmentaja | 300 | + ADAR, biologinen ikä, talenttiohjelma |
| Huipputaso | Kaikki roolit | Rajaton | Kaikki ominaisuudet |

## Roolit (8 kpl)

1. Super Admin (TalentMaster)
2. Valmennuspäällikkö (VP)
3. Urheilutoimenjohtaja
4. Talenttivalmentaja
5. Fysiikkavalmentaja
6. Fysioterapeutti
7. Testivastaava
8. Valmentaja
9. Pelaaja
10. Vanhempi
