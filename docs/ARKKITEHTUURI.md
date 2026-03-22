# TalentMaster™ — Järjestelmäarkkitehtuuri
# Päivitetty 2026-03-22

---

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa muiden lajien)
talenttiarviointiin ja pelaajien kehitysseurantaan. Asiakas on seura, ei yksittäinen valmentaja.
Järjestelmä rakentuu Palloliiton virallisen Huippusuoritusmallin (Huuhkaja-Helmaripolku) varaan.

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

## Firebase-projekti

- **Projekti:** `talentmaster-pilot`
- **Spark plan** (ilmainen) — riittää pilottivaiheeseen
- **Firestore sijainti:** europe-west1 (Frankfurt)

---

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

    pelaajat/{palloId}              ← UUSI — pelaajaprofiilit (kts. rakenne alla)
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

---

## Pelaajaprofiilin Firestore-rakenne

Polku: `seurat/{seuraId}/pelaajat/{palloId}`

PalloID on dokumentin avain — se on Palloliiton pelaajatunniste ja koko järjestelmän
universaali pelaajatunniste. Sama PalloID linkittää pelaajan kaikkiin testeihin,
kartoituksiin ja kehitysdataan yli kausien.

```javascript
{
  // ── PERUSTIEDOT ──────────────────────────────────────────────────────────
  palloID:        "34650191",       // Palloliiton tunniste = dokumentin id
  nimi:           "Matti Meikäläinen",
  etunimi:        "Matti",
  sukunimi:       "Meikäläinen",
  syntymaaika:    timestamp,        // Tarkkuus päivä — lasketaan ikä ja RAE tästä
  sukupuoli:      "P",              // "P" | "T"
  joukkue:        "KPV U15",
  seuraId:        "kpv",
  aktiivinen:     true,

  // ── SUOSTUMUS (GDPR) ─────────────────────────────────────────────────────
  suostumus: {
    annettu:      timestamp,
    huoltaja:     "Etunimi Sukunimi",
    versio:       "2026-v1",
    ip:           null              // ei tallenneta
  },

  // ── BIOLOGINEN IKÄ ───────────────────────────────────────────────────────
  // Koko biologinenIka-osio on arkaluonteinen (GDPR erityissuoja alaikäisillä).
  // Pääsy Permission Matrixin mukaan.
  biologinenIka: {

    // Mirwald-raakamitat — tallennetaan AINA mittauksesta
    // Raakamitat säilytetään vaikka laskentamenetelmä muuttuisi tulevaisuudessa
    mirwald: {
      pituus:         163.0,        // cm, seisomapituus ilman kenkiä
      istumapituus:   77.1,         // cm, mitattu arvo (penkin päältä)
      penkinkorkeus:  40.0,         // cm, käytetyn penkin korkeus lattiasta
      // Kokonaisistumapituus = istumapituus + penkinkorkeus (lasketaan automaattisesti)
      paino:          50.0,         // kg
      aidinPituus:    165.0,        // cm, vapaaehtoinen — parantaa tarkkuutta
      isanPituus:     178.0,        // cm, vapaaehtoinen — parantaa tarkkuutta
      mittauspvm:     timestamp,
      arvioija:       "uid"
    },

    // Lasketut arvot — johdetaan raakamittoista automaattisesti
    maturityOffset: -1.34,          // Mirwald-kaavan tulos (vuotta)
                                    // Negatiivinen = ennen PHV-huippua
                                    // 0 = PHV-huippu
                                    // Positiivinen = kasvupyrähdyksen jälkeen

    phvIka:   14.6,                 // Age at PHV = kronologinen ikä - maturityOffset
                                    // Tämä on se arvo jonka Palloliitto tarkistaa
                                    // yli-ikäisyyssäännössä

    phvTila:  "PHV-huippu",         // "Varhainen" (offset < -1.0)
                                    // "PHV-huippu" (offset -1.0 – 0.5)
                                    // "Post-PHV" (offset > 0.5)

    krono:    13.2,                 // Kronologinen ikä mittaushetkellä (vuotta desimaalina)
    bio:      11.86,                // Biologinen ikä = krono + maturityOffset
                                    // HUOM: bio ja phvIka ovat ERI asioita:
                                    // bio kertoo miten "vanha" pelaaja ON NYT biologisesti
                                    // phvIka kertoo MILLOIN kasvupyrähdys tapahtuu

    rae:      "Q1",                 // Relative Age Effect — syntymäkvartaali
                                    // Lasketaan automaattisesti syntymäajasta:
                                    // Q1 = tammikuu–maaliskuu (ikäluokan "vanhimmat")
                                    // Q2 = huhtikuu–kesäkuu
                                    // Q3 = heinäkuu–syyskuu
                                    // Q4 = lokakuu–joulukuu (ikäluokan "nuorimmat")

    aikuisPit: 182,                 // Ennustettu aikuispituus (cm), Khamis-Roche
    nytPit:    155,                 // Nykyinen pituus mittaushetkellä (cm)

    // Palloliiton yli-ikäisyyssääntö — lasketaan automaattisesti phvIka:sta
    yliIkaisyys: {
      tulos:    "KYLLÄ",            // "KYLLÄ" = saa pelata alemmassa ikäluokassa
                                    // "EI" = ei täytä sääntöä
                                    // "Ei tietoja" = mittauksia ei ole tehty
      raja:     14.30,              // Käytetty kuukausikohtainen raja (Palloliiton taulukko)
      laskettu: timestamp
    },

    // ── TANNERIN KEHITYSVAIHE — ERITYISTAPAUKSET ─────────────────────────
    // ⚠️ Tanner-tieto on kliininen terveystieto.
    //
    // MIKSI PIILOTETTU:
    // Tannerin kehitysvaihe (T1–T5) vaatii asiantuntijan arvion —
    // lääkärin tai terveydenhoitajan fyysisen tutkimuksen. Sitä EI
    // voi laskea kaavalla eikä valmentaja voi sitä kirjata.
    // Normaalissa valmennustyössä Mirwald + PHV-tila riittää täysin.
    //
    // MILLOIN KÄYTETÄÄN:
    // Vain erityistapauksissa, esim. urheilulääkärin lausunnon yhteydessä,
    // tai kun pelaajalla on epätyypillinen kasvukäyrä ja tarkempi kliininen
    // arvio on tarpeen. Aktivoidaan UI:ssa erillisestä
    // "Näytä kliiniset tiedot" -valinnasta (vain VP ja Fysioterapeutti).
    //
    // GDPR: Tanner-kenttä on erityisen arkaluonteinen terveystieto.
    // Tallennusoikeus: vain Fysioterapeutti tai VP erityisluvalla.
    // Audit trail pakollinen: kuka kirjasi, milloin, millä perusteella.
    tannerVaihe:    null,           // T1–T5 | null (useimmiten null)
    tannerArvioija: null,           // Firebase UID — kuka on arvioinut
    tannerPvm:      null            // Milloin arvioitu
  },

  // ── METATIEDOT ───────────────────────────────────────────────────────────
  luotu:      timestamp,
  muokattu:   timestamp,
  luonutUid:  "uid",
  tuontitapa: "excel"               // "excel" | "manuaalinen" | "api"
}
```

---

## Biologisen iän käsitteiden selitykset

Nämä käsitteet sekoitetaan helposti keskenään. Tässä tarkat määritelmät.

**Maturity Offset** on Mirwald-kaavan raakulos, joka kertoo kuinka monta vuotta pelaaja
on kasvupyrähdyksensä huipusta. Negatiivinen arvo tarkoittaa että huippu on vielä edessä,
positiivinen että se on jo ohitettu. Se on se "perusluku" josta kaikki muu lasketaan.

**PHV-ikä (age at PHV)** kertoo missä iässä pelaajan kasvupyrähdys tapahtuu.
Laskukaava on `kronologinen ikä − maturity offset`. Tätä lukua Palloliitto käyttää
yli-ikäisyyssäännössä. Jos 13,3-vuotiaan offset on −1,3, hänen PHV-ikänsä on 14,6 —
eli hän saavuttaa kasvupyrähdyksensä 14,6-vuotiaana.

**Biologinen ikä** kertoo miten "vanha" pelaaja on biologisesti tällä hetkellä.
Laskukaava on `kronologinen ikä + maturity offset`. Jos offset on −1,3, pelaaja on
biologisesti 1,3 vuotta nuorempi kuin kronologinen ikä antaa ymmärtää. Tätä käyttää
valmentaja harjoituksen kuorman suunnittelussa.

**RAE (Relative Age Effect)** kuvaa sitä epätasa-arvoa, joka syntyy kun tammikuussa
syntynyt pelaaja on lähes vuoden "vanhempi" kuin joulukuussa syntynyt samassa
ikäluokassa. Q1-pelaajat ovat yliedustettuja huippujoukkueissa juuri siksi, että
he näyttävät paremmilta nuorina — ei siksi, että he olisivat lahjakkaampia.
TalentMaster näyttää tämän tiedon valmentajalle jotta piilotettuja talenteja tunnistetaan.

**Tannerin kehitysvaihe (T1–T5)** on kliininen arvio fyysisestä kypsyydestä.
Se vaatii asiantuntijan arvion eikä sitä voi laskea kaavalla. Käytetään vain
erityistapauksissa ja tallennetaan vain kun asiantuntija on arvion tehnyt.

---

## Palloliiton yli-ikäisyyssääntö — laskentalogiikka

Sääntö mahdollistaa biologisesti nuoremmalle pelaajalle luvan pelata alemmassa
ikäluokassa. Tarkistus perustuu PHV-ikään ja syntymäkuukauteen.

Raja vaihtelee kuukausittain siksi, että tammikuussa syntynyt on kalenterivuoden
perusteella lähes vuoden "vanhempi" kuin joulukuussa syntynyt samassa ikäluokassa.
Sääntö kompensoi tätä epätasa-arvoa — joulukuussa syntyneellä on matalampi kynnys.

```
Tulos = "KYLLÄ" jos PHV-ikä >= raja(syntymäkuukausi, sukupuoli)

Pojat:  Tammikuu=14.97, Helmikuu=14.88, ..., Joulukuu=14.05
Tytöt:  Tammikuu=13.07, Helmikuu=12.98, ..., Joulukuu=12.15
(Raja laskee n. 0.083 vuotta per kuukausi)
```

Lähde: Palloliiton virallinen Mirwald-PHV-Yli-ikäisyyssääntö -taulukko (2025).
Taulukko on tallennettu TalentMaster_Pelaajapohja.xlsx Ohjeet-välilehdelle
referenssisoluihin (rivit 50–61) ja lasketaan automaattisesti VLOOKUP-kaavalla.

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

Salasanat: `TM_[SEURA]_2026!` — vaihdetaan oikeisiin ennen pilottia

---

## GitHub Pages URL:t

```
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_VP_v17.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v7.html
```

---

## Pelaajadata: kaksi lähdettä

**Historiallinen data (tm_data.js)** sisältää 2417 pelaajaa 30 seurasta kausilta
2017–2020. Se on staattinen tiedosto joka latautuu selaimeen. Se ei sisällä
pilottiseuroja eikä biologisen iän dataa.

**Reaaliaikainen data (Firebase)** sisältää pilottiseurojen uuden datan:
harjoitteluseurantakirjaukset, testit, kartoitukset ja pelaajaprofiilit
biologisine ikineen. Tämä on järjestelmän tulevaisuus — tm_data.js migroi
vähitellen Firestoreen.

---

## Datavirta: kirjautuminen

```
Käyttäjä syöttää sähköpostin + salasanan
  → Firebase Auth tunnistaa käyttäjän
  → Firestore hakee seura-dokumentin (resource.data.vp_uid == user.uid)
  → initDash() asettaa oikean seuran
  → Session-load hakee seuran kirjaukset Firebasesta
  → LocalStorage päivittyy välimuistina
```

---

## Datavirta: pelaajan tunnistaminen lomakkeessa

```
Valmentaja syöttää PalloID:n testilomakkeeseen
  → Firestore hakee seurat/{seuraId}/pelaajat/{palloId}
  → Lomake täyttää automaattisesti: nimi, syntymäaika, joukkue,
    kehonpaino, PHV-tila, yli-ikäisyyssääntötulos
  → Valmentaja voi ylikirjoittaa kehonpainon jos se on muuttunut
  → Uusi paino tallentuu profiiliin mittauspäivämäärällä
```

---

## Security Rules -logiikka

**Super-admin** lukee kaiken. **Seuran VP** lukee ja kirjoittaa oman seuransa
kaiken datan. **Seuran jäsen** lukee oman seuransa datan ja kirjoittaa rajoitetusti.
**Ei kirjautunut** ei pääse mihinkään.

Tärkeä korjaus (2026-03-22): Seurat-kokoelman read-sääntöön lisätty
`resource.data.vp_uid == request.auth.uid` jotta VP:n kirjautumisessa tehtävä
seurahaun kysely toimii oikein.

---

## Pakettitasot

| Paketti | Roolit | Max pelaajia | Ominaisuudet |
|---|---|---|---|
| Perustaso | VP, valmentaja, testivastaava | 100 | Kirjaukset, testit, profiilit |
| Kehitystaso | + talenttivalmentaja, fysiikkavalmentaja | 300 | + ADAR, biologinen ikä, talenttiohjelma |
| Huipputaso | Kaikki roolit | Rajaton | Kaikki ominaisuudet + Tanner (erityistapaukset) |

---

## Roolit (10 kpl)

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
