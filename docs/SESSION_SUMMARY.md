# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-03-31)

TalentMaster on jalkapallon talenttiarviointialusta. 7 aktiivista pilottiseuraa:
FC Lahti Juniorit, KPV, Pallo-Iirot, Ylöjärven Ilves, SJK Juniorit, GrIFK, HJK Juniorit.
Lisäksi testiseuroja: FC Vaasa, FC Kokkola, Demo FC.

Tässä sessiossa: VP v18 rakennettu, auth-bugit korjattu, Master v9 rakennettu,
Harjoitettavuus-lomakkeen bugikorjaukset (vaihe 7+8 + tallennusflow), Pelaaja v1
rakennettu pelillisenä kokemuksena FIFA-kortilla + streak + haasteet + fiilinki,
suuri käyttäjätutkimus + koulutusyhdistelmä analysoitu ja peilattu v9/v18:aan.

---

## GitHub

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

## Tärkeimmät tiedostot GitHubissa

| Tiedosto | Kuvaus | Tila |
|---|---|---|
| TalentMaster_VP_v17.html | VP-dashboard VANHA, pysyy rinnalla | Toimii |
| TalentMaster_VP_v18.html | VP-dashboard UUSI | GitHubissa |
| TalentMaster_Admin.html | Admin super adminille | Korjattu |
| TalentMaster_Seura.html | Seura-hallinta VP:lle | Korjattu |
| TalentMaster_Master_v8.html | Valmentajan näkymä VANHA | GitHubissa |
| TalentMaster_Master_v9.html | Valmentajan näkymä UUSI v18-tyyli | GitHubissa |
| TalentMaster_Harjoitettavuus_Lomake.html | Testausflow 8 vaihetta | Korjattu |
| TalentMaster_Pelaaja_v1.html | Pelaajan pelillinen näkymä UUSI | GitHubissa |
| TalentMaster_SJK_Demo_v2.html | SJK-myyntidemo | GitHubissa |
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

## Käyttäjät

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

TÄRKEÄÄ: Super Admin UID on pvKJoVywWfTouQQgoxggUmGYD0E2.
admins-dokumentissa tarvitaan MOLEMMAT: superAdmin: true JA rooli: "super_admin".

---

## Tässä sessiossa tehdyt työt

### 1. VP v18 (TalentMaster_VP_v18.html)
Auth — 5 kriittistä bugia korjattu ennen julkaisua:
- _tunnistaudu(user) eristetty omaksi funktioksi — yksi onAuthStateChanged
- kirjauduSisaan kutsuu _tunnistaudu suoraan, ei rekisteröi uutta kuuntelijaa
- asetaSeura(null) null-guard
- joukkueet: .get() + JS-sort (ei orderBy jarjestys)
- _kirjautuminenKesken asetetaan ENNEN signInWithEmailAndPassword

3-tasoinen VP-tunnistus: vp_uid → kayttajat collectionGroup → Claims

7 tabia: Tilanne nyt, Kartoitukset, Kalenteri, Henkilöstö, Tavoitteet, Valmennus,
Pelaajapolut, Kausirakenne

Uudet Firestore-kokoelmat:
- seurat/{id}/mentoroinnit/ — VP:n käyntimuistiinpanot
- seurat/{id}/hyvinvointi/ — valmentajan viikoittainen joukkuetila
- seurat/{id}/kausirakenne/ — kauden avaintapahtumat tehdyksi-merkintöineen

22 visuaalista korjausta (badget 11px, min-height 44px, hover-efektit, info-box-viivat)

Super Admin: dropdown headeriin, kaikki seurat _kaikki_seurat-listaan

### 2. Master v9 (TalentMaster_Master_v9.html)
Rakennettu alusta v18-tyylillä, SJK-demon valmentajanäkymän pohjalta.

4 tabia:
- Tänään: alkuverryttely 20 min rakenne, yksilöllinen ohje heikoimman ketjun mukaan
  (lasketaan automaattisesti Firestoresta), "Sanot näin pelaajille" per ketju,
  3 pelaaja-alertia (PHV/matala FLEI/kehittyvä), harjoituksen kirjaus sliderilla
- Joukkue: spider-kaavio + FLEI-jakauma + pelaajalista
- Kirjaukset: harjoitushistoria kuormittavuudella
- Kehitys: FLEI-trendi kaudella testipäivittäin

Auth: onAuthStateChanged → _tunnistaudu (sama pattern kuin v18)
3-tasoinen: Claims → kayttajat collectionGroup → vp_uid

Kirjaukset tallentuvat: seurat/{id}/joukkueet/{id}/harjoituskirjaukset/

### 3. Harjoitettavuus-lomake (TalentMaster_Harjoitettavuus_Lomake.html)
Neljä bugikorjausta:

1. Auto-ikäluokka: joukkueSelect onchange → autoIkaluokka() → U13 mapautuu U15:een automaattisesti

2. Pelaajien haku 3-tasoisena:
   - Taso 1: joukkueet/{id}/pelaajat/ (oikea rakenne)
   - Taso 2: seurat/{id}/pelaajat/?joukkueId== (KPV:n nykyinen rakenne)
   - Taso 3: kaikki seuran pelaajat (viimesijainen fallback)
   KPV:n pelaajat ovat seurat/kpv/pelaajat/ (juurikokoelma) — Taso 2 löytää ne

3. Tallennus → flow ei jatkanut: tpTallennaKaikkiPiste() ei kutsunut
   suljeTestipistemoodi() eikä asetaVaihe(7) → korjattu:
   - tpTallennaKaikkiPiste(): tallentaa → suljeTestipistemoodi() → asetaVaihe(7)
   - tallennaKaikki(): tallentaa → automaattinen asetaVaihe(7)
   - "Kaikki pisteet valmiit" -nappi → tpTallennaKaikkiPiste() (ei pelkkä sulje)

4. Vaihe 7 (Tarkastelu) + Vaihe 8 (Palaute) rakennettu:
   - Vaihe 7: FLEI-kortit per pelaaja, ketjupisteet, PHV-huomiot, yhteenveto
   - Vaihe 8: kuormittavuus-slider 1-10, havainto-tekstikenttä, seuraava pvm
   - Palaute tallentuu tapahtumat/{id}/palautteet/ + tapahtuma → tila: valmis

5. Lisää pelaaja -ominaisuus: hakumodaali nimellä/syntymävuodella, etsii
   kaikista seuran pelaajista, ikäluokka lasketaan automaattisesti

### 4. Pelaaja v1 (TalentMaster_Pelaaja_v1.html) — UUSI
Pelillinen kokemus FIFA-kortilla ja gamification-mekaniikoilla.

Kirjautuminen:
- Sähköposti + salasana (Firebase Auth)
- Kolme demo-profiilia napilla: ⚡ Aleksi (84% FLEI, streak 14), 📈 Eeli (61%, PHV),
  🛡️ Mikko (52%, beginner) — ei vaadi tunnuksia

5 tabia:
- Tänään: Hero-kortti (OVR + streak kompaktina), fiilinki 😫😕😐🙂🔥,
  kotitehtävät T+D+S (+XP per tehtävä), päivän kysely (+10 XP), valmentajan havainto
- Korttini: FIFA-kortti (6 stat-kenttää, mastery-taso, XP-palkki), ketjubaarit,
  saavutukset 8 kpl, profiiliteksti pelityylillä
- Haasteet: viikon haasteet progress-barein, valmistuneet saavutukset
- Kehitys: SVG-kehitysaikajana polyline:llä, OVR-muutos kaudella, XP-historia
- Suunnitelma (IDP): 70/30-selitys, 12 viikon tavoitteet ruksattavina,
  12 kk suunta, valmentajan arvio

Gamification-logiikka:
- Streak: päivälaskuri, viikonpäivä-indikaattorit (MA-SU), freeze-suojat
- XP-tasot: Basic (1-2) → Kilpailija (3-4) → Sharp (5-6) → Elite (7-8) → Signature (9-10)
- Mastery-nimet myös FIFA-kortissa
- Rating (OVR) lasketaan: FLEI×0.5 + ketjuKa/3×40 + XP-bonus
- Fiilinki tallentaa 5 XP + personoitu viesti per emoji

Konseptista (TalentMaster_Pelaaja_Konsepti__1_.html) otettu mukaan:
- Fiilinki-widget 5 emojilla (anonyymi valmentajalle)
- Mastery-tasonimet Basic→Sharp→Elite→Signature
- SVG kehitysaikajana polyline + OVR-muutos
- Kompakti hero-kortti: OVR iso + avatar + streak + XP yhdessä
- Showcase CV -konsepti (Sprint 3:ssa toteutettava)

Ikäluokkakohtainen filosofia:
- 10-12v (Leikkijä/Kilpailija): FIFA-kortti, streak, haasteet — matala kynnys
- 13-15v (Rakentaja): ketjubaarit, IDP-tavoitteet, mastery-nimet
- 16-19v (Showcase Pro): CV-paketti, kehitystarina portfoliona (tulossa)

### 5. Käyttäjätutkimus + Koulutus v38 — Analyysi

Kriittiset puutteet tunnistettu v9:stä ja v18:sta:
1. ADAR-pikakortti puuttuu v9:stä (viides liikeketju = kognitiivinen)
2. "Merkitse kenet näit" -toiminto puuttuu v9:stä (neljän hetken malli)
3. Kehitysvauhti (DVI) ei omana KPI:na v18:ssa
4. RAE-korjaus (Q4-pelaajat) puuttuu molemmista
5. T-harjoite (tekninen päivittäinen pallokosketus) puuttuu pelaajan näkymästä

---

## Avoimet ongelmat

| Ongelma | Prioriteetti | Ratkaisu |
|---|---|---|
| Gmail App Password saattaa olla vanhentunut | Korkea | Tarkista Functions Logs tai vaihda SendGridiin |
| Custom Claims ei asetu automaattisesti | Korkea | onDocumentCreated-triggeri functions/index.js:ään |
| VP v18 + Master v9 ei testattu live-datalla | Korkea | Testaa super admin + KPV:n VP ensi sessiossa |
| Pelaaja v1 demo-tila — ei Firebase-kirjautumista | Korkea | Pelaajatunnukset kun IDP-aktivointi valmis |
| ADAR-pikakortti puuttuu v9:stä | Korkea | Lisätään seuraavassa sessiossa |

---

## Firestore-rakenne (kaikki kokoelmat)

```
seurat/{seuraId}/
  id, nimi, laji, paketti, aktiivinen, vp_uid, vp_email, luotu

  tapahtumat/{id}
    nimi, tyyppi, joukkueId, joukkueNimi, pvm, tila
    palautteet/{id}: kuormittavuus, havainto, seuraavaPvm

  joukkueet/{id}/
    nimi, jarjestys, ikäluokka
    pelaajat/{id}: etunimi, sukunimi, syntymaVuosi, phv_tila, flei_viimeisin,
                   idp_aktiivinen, talenttisuositus, uid
    kartoitukset/{id}: pelaajaId, nimi, flei_pct, tulokset, testipvm
    harjoituskirjaukset/{id}: havainto, kuormittavuus, pvm, kirjasiUid  ← UUSI v9

  kayttajat/{uid}: etunimi, sukunimi, email, rooli, seuraId, joukkueId,
                   aktiivinen, claimsAsetettu, uid

  kriteerit/{key}: taytetty, paivitetty

  mentoroinnit/{id}: valmentajaUid, muistiinpano, kirjaaja, pvm  ← UUSI v18
  hyvinvointi/{id}: joukkueId, energia, mieliala, motivaatio (1-5), pvm  ← UUSI v18
  kausirakenne/{key}: tehty, paivitetty  ← UUSI v18

admins/{uid}: superAdmin: true, rooli: "super_admin", claimsAsetettu: true
```

---

## Seuraavat tehtävät

Heti ensi sessiossa:
1. JÄIMME TÄHÄN: Testaa VP v18 + Master v9 live (super admin + KPV:n VP)
2. Lisää ADAR-pikakortti v9:ään (4 kohtaa, 1-3p, max 12p harjoituksessa)
3. Lisää "merkitse kenet näit" v9:ään (yksi nappi per pelaaja harjoituksessa)
4. Lisää kehitysvauhti (DVI) omana KPI:na v18:n banneriin
5. Korjaa Gmail App Password (Functions Logs)

Sprint 2:
6. Pelaajatunnukset — rekisteröinti pelaajille
7. IDP-kortti v3 pelaajatunnuksilla (Firebase-integraatio)
8. Pelaaja v1 → Firebase-data oikealta pelaajalta

Sprint 3:
9. Showcase CV-paketti (16-19v) — Luo raportti, Jaa seuralle
10. RAE-korjaus v18:aan (Q4-pelaajien automaattinen tunnistus)
11. Custom Claims -triggeri functions/index.js:ään

---

## Arkkitehtuuriperiaatteet (kriittiset)

1. onAuthStateChanged rekisteröidään VAIN kerran — ei uutta kuuntelijaa per login
2. _kirjautuminenKesken asetetaan ENNEN async-operaatiota
3. admins/{uid} tunnistus .exists — Cloud Function tarvitsee myös superAdmin: true
4. Joukkueet: .get() + JS-sort — EI orderBy('jarjestys') (kenttä voi puuttua)
5. VP-tunnistus 3 tasolla: vp_uid → kayttajat collectionGroup → Claims
6. Seura.html: VP-rooli haetaan ENNEN hylkäystarkistusta
7. Seura-vaihto: lazy-load flagit nollataan, _unsubKal() kutsutaan
8. Cache-busting: ?v=N URL-parametri (Fastly CDN)
9. Super Admin dropdown: _kaikki_seurat lista + header replaceWith(select)
10. Pelaajan haku 3-tasolla: joukkue/pelaajat → seura/pelaajat+joukkueId → kaikki

---

## Design-system

### VP v18 (sininen)
--accent: #4A7ED9, --teal: #00D4AA, --bg: #06090F

### Master v9 (vihreä/teal)
Sama kuin v18, tab-aktiivi: var(--teal)

### Pelaaja v1 (kulta)
--gold: #F5B700, --fire: #FF6B2B
Mastery-tasot: Basic (⚽) → Kilpailija (⚡) → Sharp (🌟) → Elite (💎) → Signature (👑)
FIFA-kortti: kulta-gradientti, Barlow Condensed 900

Kaikki: max-width 600px (pelaaja/valmentaja) / 1280px (VP), min-height 44px napit,
mobiili breakpointit 400/500/600/700/800px

---

## Bisnesmalli

- Kiinteä seuralisenssi 200-400€/kausi (MRR)
- Per-pelaaja raportti (skaalautuva)
- Klinikka kertamaksuna
- Paketit: Perustaso / Kehitystaso / Huipputaso
- Palloliitto-partnershipneuvottelut käynnissä
- Showcase Pro (16-19v CV-paketti) = lisäarvo vanhemmille + seuroille

---

## Pelaaja v1 — Ikäluokkafilosofia

10-12v (Leikkijä/Kilpailija): pelillisyys edellä, matala kynnys, T-harjoite tärkeintä
13-15v (Rakentaja): IDP-tavoitteet, ketjupisteet, 70/30 selitettynä, mastery-nimet
16-19v (Showcase Pro): CV-paketti seuroille, kehitystarina, ADAR-pisteet, Wyscout-vertailu

Kysymys jota ei vielä ratkaistu (konseptista löytyi):
"Haluaisitko itse valita harjoitteesi — vai mukavampaa kun järjestelmä kertoo?"
→ Pitää lisätä vaihto-nappi kotitehtävään (vaihda harjoite)
