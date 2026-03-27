# TalentMaster™ — Järjestelmäarkkitehtuuri
# Päivitetty: 2026-03-27

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa muiden
lajien) talenttiarviointiin ja pelaajien kehitysseurantaan. Asiakas on seura,
ei yksittäinen valmentaja. Järjestelmä rakentuu "pelaaja ensin" -filosofialle:
Master v7/v8 motivaatiomoottori tulee ensin, VP-hallinto vahvistaa sitä.

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla) | GitHub Pages |
| Tietokanta | Firebase Firestore | europe-west1 |
| Autentikointi | Firebase Authentication | Email/Password |
| Cloud Functions | Node.js (europe-west1) | Firebase |
| Sähköposti | Gmail/Nodemailer | Cloud Functions |
| Pelaajadata (historia) | tm_data.js (staattinen) | GitHub Pages |
| Admin-skriptit | Node.js + Firebase Admin SDK | GitHub Actions |
| CI/CD | GitHub Actions | workflow_dispatch |

Huom: Paikallinen terminaali on palomuurin takana — kaikki deploymentit
tapahtuvat GitHub Actionsin kautta FIREBASE_SERVICE_ACCOUNT-secretillä.
Ei koskaan committata serviceAccountKey.json-tiedostoa repoon.

---

## Firebase-projekti

- Projekti: talentmaster-pilot (Blaze plan)
- Firestore sijainti: europe-west1 (Frankfurt)

---

## Rooliarkkitehtuuri (uudistettu 2026-03-27)

Roolimalli on kolmikerroksinen. Sama henkilö voi kantaa useita rooleja —
pienessä seurassa VP on usein samaan aikaan hallintakerroksen varamies,
operatiivinen ja strateginen johtaja. Isossa seurassa nämä ovat eri henkilöitä.

### Hallintakerros — rekisterin hallinta

Super Admin on TalentMaster-tason rooli joka näkee kaikkien seurojen datan.
Tunnistetaan admins/{uid}-dokumentin olemassaolosta.

Seuran Admin (käytännössä sihteeri tai TJ) hallitsee seuran rekisteriä —
lisää pelaajia, valmentajia ja muita käyttäjiä järjestelmään. Tallennetaan
seuradokumenttiin admin_uid-kenttään.

VP on Seuran Adminin varamies ja hänellä on aina admin-oikeudet varalta.
Pienissä seuroissa joissa erillistä sihteetriä ei ole, VP hoitaa kaiken.

### Johtamiskerros — urheilutoiminnan johtaminen

VP on sekä operatiivinen että strateginen johtaja. Operatiivisella tasolla
hän tekee päätöksiä yksittäisistä pelaajista — IDP-aktivoinnit, talenttiohjelma,
klinikan käynnistys. Strategisella tasolla hän näkee koko seuran kehityskuvan,
trendit ja Palloliiton benchmarkin. Jos seurassa ei ole UTJ:tä, VP kattaa
strategisen tason yksin.

UTJ (Urheilutoiminnanjohtaja) näkee vain strategisen kokonaiskuvan —
seuran kehitysindeksit, testausasteet, ikäluokkarakenne — mutta ei tee
operatiivisia kirjoituksia. UTJ:n utj_uid-kenttä on null jos seurassa
ei ole UTJ:tä nimetty.

### Kenttäkerros — päivittäinen työ pelaajien kanssa

Kenttäkerroksen roolit tallennetaan seurat/{seuraId}/kayttajat/{uid}/
alikokoelmaan koska niitä voi olla kymmeniä per seura. Joukkuesidonnnaisuus
määräytyy joukkueet-taulukosta — tyhjä taulukko tarkoittaa, että käyttäjä
näkee kaikki seuran joukkueet.

Roolit ovat: valmentaja, testivastaava, talenttivalmentaja,
fysiikkavalmentaja ja fysioterapeutti.

### Pelaaja- ja huoltajakerros

Pelaaja näkee vain oman profiilинsa. Huoltaja näkee lapsensa profiilin
huoltaja_uid-kentän kautta. Molemmat saavat selkokielisen version
teknisestä datasta.

### Raportointikerros (tuleva)

Hallitus ja puheenjohtaja saavat aggregoidun kuukausiraportin ilman pääsyä
yksittäisiin pelaajatietoihin. Ei vielä rakennettu.

### Pakettitasot

| Paketti | Roolit | Max pelaajia |
|---|---|---|
| Perustaso | VP, seuran_admin, valmentaja, testivastaava, pelaaja, huoltaja | 100 |
| Kehitystaso | + utj, talenttivalmentaja, fysiikkavalmentaja | 300 |
| Huipputaso | Kaikki roolit | Rajaton |

---

## Firestore-tietokantarakenne (päivitetty 2026-03-27)

admins/{uid}/
  email, rooli, superAdmin, luotu

seurat/{seuraId}/
  id, nimi, laji, paketti, kaupunki, aktiivinen
  admin_uid, admin_email          (Seuran Admin)
  vp_uid, vp_email                (VP — varamies adminille)
  utj_uid, utj_email              (null jos ei UTJ:tä)
  roolit[], ominaisuudet[], max_pelaajia
  tilastot {
    pelaajia, joukkueita, kartoituksia,
    testattuMirwald, testattuHH, aktiivisiaIdp,
    viimeisinTapahtuma, kausi
  }
  luotu, paivitetty

  kayttajat/{uid}/
    uid, email, nimi, rooli, joukkueet[], paketti, aktiivinen, luotu, kutsunutUid

  pelaajat/{palloId}/             (PalloID = dokumentin ID)
    etunimi, sukunimi, syntymapaivamaara (Timestamp)
    syntymavuosi, sukupuoli, joukkue, joukkueId
    palloId, huoltaja_uid
    biologinenIka { krono, bio, maturityOffset, phvIka, phvTila, mirwald{} }
    phvTila, phvIka, fleiProsentti
    viimeisinMirwald, viimeisinKartoitus

  joukkueet/{joukkueId}/
    nimi, ikaryhma, valmentaja, pelaajia

  tapahtumat/{tapahtumaId}/       (UUSI — schema suunniteltu 2026-03-27)
    seuraId, joukkueId, joukkueNimi
    tyyppi (mirwald|khamis_roche|harjoitettavuus|hh_testit|tekniikkakilpailu)
    ikaLuokka (U12|U15|U19 — harjoitettavuudelle)
    paiva (Timestamp — testipäivä, ei luontipäivä)
    tila (suunniteltu|kaynnissa|odottaa_tarkistusta|valmis)
    pelaajat[], pelaajaMaara, tuloksiaTallennettu
    vastuuUid, vastuuNimi, luonutUid, luonutNimi
    luotu, paivitetty, huomiot

    tulokset/{palloId}/           (Yksi dokumentti per pelaaja)
      pelaajaId, tapahtumaId, seuraId
      etunimi, sukunimi, syntymapaivamaara, sukupuoli
      pituus_1, pituus_2, pituus_ka
      istumapituus_1, istumapituus_2, istumapituus_ka
      paino_1, paino_2, paino_ka
      aidinPituus, isanPituus     (Khamis-Roche)
      testit{}                    (harjoitettavuus ja H-H — dynaaminen map)
      kronoIka, maturityOffset, phvIka, phvTila
      phvIka_kr, phvTila_kr       (Khamis-Roche rinnakkaisarvio)
      poikkeuslupa, poikkuuslupaKynnys, poikkeuslupaerotus
      yhteenveto{}, tallennettu, tallennettuUid, tila

  kartoitukset/{id}/              (Harjoitettavuuskartoitukset)
  testit/{id}/                    (H-H polun fyysiset testit)
  tekniikka/{id}/                 (Tekniikkakilpailutulokset)
  adar/{id}/                      (Game IQ / ADAR-arvioinnit)
  vammat/{id}/                    (Kuntoutusdata — arkaluonteinen)
  kuorma/{id}/                    (RPE-kuormaseuranta)
  kirjaukset/{id}/                (VP:n harjoitteluseurantakirjaukset)

kirjaukset/                       (Vanha rakenne — yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/

---

## Security Rules -logiikka (uudistettu 2026-03-27)

Säännöt on kirjoitettu apufunktiopohjaisesti — jokainen funktio vastaa
täsmälleen yhteen kysymykseen. Apufunktiot: onKirjautunut(), onSuperAdmin(),
onSeuranAdmin(seuraId), onVP(seuraId), onHallinta(seuraId) (= Admin TAI VP TAI
Super Admin), onUTJ(seuraId), onJohtaminen(seuraId) (= VP TAI UTJ TAI hallinta),
onSeuranJasen(seuraId), onRooli(seuraId, rooli), onSeuranKayttaja(seuraId).

"Deny by default" — kaikki on oletuksena kiellettyä. Vammadata on
erityissuojattu: kirjoitusoikeus VAIN fysioterapeutilla. Tapahtuman
luonti pakottaa tila: "suunniteltu" — estää ohitetun mittausprosessin.
Käyttäjä ei voi muuttaa omaa rooliaan, joukkueitaan tai pakettitasoaan.

---

## Kirjautumislogiikka

Käyttäjä kirjautuu sähköpostilla. Firebase Auth tunnistaa, jonka jälkeen
Firestore hakee seuradokumentin hierarkkisesti: (1) admin_uid tai vp_uid,
(2) utj_uid, (3) kayttajat-alikokoelma. Jos ei löydy mistään, kirjautuminen
epäonnistuu. VP_v17:ssä on kaksi käynnistyspolkua: initDash() historiadatalle
ja _lataaPilottiDashboard() pilottiseuroille.

---

## Pelaajan tunnistus ja datamalli

PalloID on Firestoren dokumentin ID — pysyvä ankkuri. Data kertyy palasina
ajan kuluessa (harjoitettavuus ja Mirwald otetaan eri päivinä). Tuontikoodi
käyttää set({...}, {merge:true}). Raakamittaukset tallennetaan tapahtuman
tulokset-alikokoelmaan (historia). Johdetut arvot kirjoitetaan pelaajan
perusprofiiliin kun tapahtuma merkitään valmiiksi.

---

## tm_ylaikaisyys.js (rakennettu 2026-03-27)

Itsenäinen moduuli joka liitetään VP_v17:ään script-tagilla.
Sisältää Mirwald 2002 -kaavan, Palloliiton kuukausittaiset kynnysarvot,
RAE-laskennan ja yhdistetyn UI-kortin. Julkinen API: tmYlaikaisyysAlusta(pelaajat)
ja tmLaskeMirwaldPelaajaDoc(mittaukset, syntymapvm).

---

## GitHub Pages ja kehityshuomioita

GitHub Pages käyttää Fastly CDN -välimuistia — vaatii Ctrl+Shift+R.
Älä testaa VP-dashboardia ja Admin-näkymää samassa selaimessa.
Firebase v9 modular SDK skoupaa db:n ES-moduuleihin — bulk-kirjoitukset
tehdään v8 compat SDK:lla. Syntymäpäivä parsitaan Date.UTC():lla.
SheetJS ei tue tyylejä ilman Pro-lisenssiä — käytetään openpyxl:ää.
