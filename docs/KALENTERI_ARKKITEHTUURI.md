# TalentMaster™ — Kalenteriarkkitehtuuri
## VP:n seuranjohtamistyökalu · Suunnitteludokumentti
## Päivitetty 2026-06-07

> **Lähtökohta:** SJK:n VP:n palaute — kalenteri on tärkein työkalu seuran johtamiseen.
> Tämä ei ole pelkkä tapahtumakalenteri vaan **seuran operatiivinen selkäranka**,
> jonka läpi VP johtaa testaamista, mentorointia, palavereita ja harjoitusohjelmaa.

---

## 1. KANSAINVÄLINEN VERTAILU — miten huippujärjestelmät ratkaisevat tämän

### A. Kitman Labs Intelligence Platform (Premier League, MLS, Rugby)

**Lähestymistapa:** Yksi jaettu kalenteri koko organisaatiolle — valmennuspäällikkö, lääkärit, fysiikkavalmentajat
ja operatiivinen henkilöstö näkevät saman kalenterin roolipohjaisilla oikeuksilla.

- Kalenteri on "operatiivinen selkäranka": harjoitukset, ottelut, palaverit, matkat, testit — kaikki samassa
- Tapahtumat linkittyvät suoraan pelaajadataan (kuormitus, valmius, testitulokset)
- **iCal-tilauslinkit:** tapahtumat näkyvissä Google/Outlook-kalenterissa read-only
- 150+ integraatiota (GPS, voimalevyt, lääkintä) — kalenteri yhdistää datan aikaan
- **Vahvuus:** kokonaisvaltaisin, mutta suunnattu ammattilaisjoukkueille (hinta + kompleksisuus)

**TM:n oppi:** Jaettu kalenteri roolipohjaisilla näkymillä. Tapahtumat linkittyvät pelaajadataan.

Lähteet: [Kitman Labs Platform](https://www.kitmanlabs.com/platform/) · [Operations](https://www.kitmanlabs.com/blog/sports-operations-platform/)

### B. Teamworks Hub (NCAA, NFL, Premier League)

**Lähestymistapa:** "Operating System for Sports" — viestintä + kalenteri + matkustus + compliance yhdessä.

- **Rajattomat kalenterit** per joukkue/osasto — kaikki tapahtumat otteluista yhteisöpalveluun
- **Calendar Sign-Ups** (2026): henkilöstö varaa omia aikoja esiasetetusta saatavuudesta (1:1 tai 1:N)
  — VP asettaa mentorointi-ajat, valmentajat varaavat oman slottinsa
- Push-notifikaatiot + automaattiset muistutukset peruutuksista
- **Kaksisuuntainen kalenterisynkka** ulkoisiin kalentereihin (Google, Outlook, iCal)
- Laajentunut AMS:ksi: harjoituspäiväkirjat, compliance, akateeminen seuranta

**TM:n oppi:** Calendar Sign-Ups (mentorointi-aikojen varaus). Kaksisuuntainen synkka ulkoisiin kalentereihin.

Lähteet: [Teamworks Hub](https://teamworks.com/hub/) · [Calendar Sign-Ups](https://teamworks.com/blog/new-calendar-feature-reservable-slots/) · [AMS](https://teamworks.com/ams/)

### C. 360Player (jalkapalloakatemiat, Eurooppa + Pohjois-Amerikka)

**Lähestymistapa:** Jalkapalloakatemioille suunniteltu — kalenteri + harjoitussisältö + viestintä.

- Kalenteri hallitsee kaikkia tapahtumia, kutsuja ja läsnäoloa yhdessä paikassa
- **Harjoitussuunnitelma liitetään tapahtumaan** — valmentajat/pelaajat näkevät sisällön etukäteen
- 100+ valmista harjoitusdrillliä + omat kirjastot (Seura / Joukkue / Henkilökohtainen)
- **Resurssinhallinta:** kentät, välineet, tilat — näkee mitä on vapaana
- **Aikataulutyökalu:** rakentaa viikko-ohjelmat nopeasti, estää päällekkäisyydet
- Push-ilmoitukset muutoksista suoraan puhelimeen

**TM:n oppi:** Harjoitussuunnitelma linkittyy kalenteritapahtumaan. Resurssien (kenttien) hallinta.

Lähteet: [Scheduling](https://en-us.360player.com/product/scheduling) · [Training & Methodology](https://en-us.360player.com/product/training-and-methodology) · [Academy Software](https://en-us.360player.com/solutions/software-for-academies)

### D. PlayMetrics (nuorisoseurat, USA)

**Lähestymistapa:** "Club Operating System" — rekisteröinti + maksaminen + kalenteri yhdessä.

- Vanhemmat näkevät **kaikkien lastensa** aikataulut yhdessä näkymässä
- **Automaattinen kalenterisynkka:** muutokset päivittyvät vanhempien henkilökohtaisiin kalentereihin
- Ottelutiedot (saapumisaika, peliasu, paikka) → automaattinen push-notifikaatio
- Valmentajat hallitsevat joukkuekalenteria ja läsnäoloa

**TM:n oppi:** Vanhempien konsolidoitu näkymä. Automaattinen synkka henkilökohtaisiin kalentereihin.

Lähteet: [PlayMetrics Calendar](https://playmetrics.com/calendar) · [Team Management](https://home.playmetrics.com/clubs/team-management)

### E. Catapult AMS + Smartabase/Teamworks AMS

**Lähestymistapa:** Data-driven — kalenteri palvelee kuormituksen hallintaa ja valmennuksen jaksotusta.

- Kalenteritapahtumat linkittyvät GPS/kuormitusdataan → "mikä harjoitus, millä kuormalla, mikä vaikutus"
- Google Maps -integraatio tapahtumapaikkoihin
- **No-code lomakerakentaja** (Smartabase): kalenteritapahtumaan liitetään räätälöity tiedonkeruulomake
  — esim. "kasvumittaus" tai "harjoitettavuuskartoitus" suoraan tapahtumasta

**TM:n oppi:** Tapahtumaan liitetty lomake (TM:ssä jo Testaus_v9). Kuormitusdata tapahtumaan.

Lähteet: [Catapult AMS](https://www.catapult.com/solutions/athlete-monitoring) · [Smartabase AMS](https://smartabase.com/solutions/college-sports/)

---

## 2. SYNTEESI — TalentMasterin erottautuminen

| Ominaisuus | Kilpailijat | TalentMaster-etu |
|------------|-------------|------------------|
| Jaettu kalenteri | Kaikilla | Sama — perusominaisuus |
| Harjoitussuunnitelma → tapahtuma | 360Player, Catapult | TM: FLEI-ketjukohtainen harjoitus → tapahtuma (yksilöllistetty) |
| iCal/Google/Outlook | Kitman, Teamworks, PlayMetrics | Sama — perusominaisuus |
| Testien vuosikello | Ei kenelläkään valmiina | **TM: biologiseen ikään perustuva testausrytmi** (PHV-vaihe ohjaa) |
| Mentorointi-aikojen varaus | Teamworks (2026) | TM: VP→valmentaja mentorointi-loop yhdistettynä kalenteriin |
| Kehitysikkunat × kalenteri | Ei kenelläkään | **TM: §28 herkkyysvaiheet → automaattinen harjoituskausipainotus** |
| MyClub-integraatio | Ei kenelläkään (Suomi-spesifi) | **TM: ainoa joka tuo MyClub-harjoitukset → kehityskontekstiin** |
| Vanhempien konsolidoitu näkymä | PlayMetrics | TM: lapsen kalenteri + FLEI/kehitystieto samassa |

**TalentMasterin kilpailuetu ei ole kalenteri itsessään, vaan se mitä kalenteri yhdistää:**
kehitysbiologia (PHV) + testausrytmi + mentorointi + harjoitusten personointi.
Kukaan muu ei yhdistä näitä kolmea kerrosta kalenteriin.

---

## 3. TAPAHTUMATYYPIT — Firestore-rakenne

### 3.1 Tyyppihierarkia

```
TAPAHTUMATYYPPI                  KUKA LUO      KUKA NÄKEE           TOISTUVUUS
─────────────────────────────────────────────────────────────────────────────────
harjoitus                        MyClub/manu    valmentaja+pelaaja   viikoittainen
ottelu                           TASO/manu      kaikki               kauden mukaan
testitapahtuma                   VP             valmentaja+pelaaja   vuosikello
kasvumittaus                     VP             valmentaja           vuosikello (PHV)
valmentajapalaveri               VP             valmentajat          kuukausittain
tiimipalaveri                    VP             valmentaja+pelaajat  2-viikottain
jaksopalaveri                    VP             VP+valmentaja        kausittain (3×)
mentorointitapaaminen            VP             VP+valmentaja        kuukausittain
kalibraatiopaja                  VP             VP+valmentajat       kausittain (2×)
IDP-seuranta                     VP             VP+valmentaja        kvartaali
talenttileiri                    VP             VP+valmentajat+sel.  kausittain
muu                              kuka tahansa   määriteltävissä      vapaa
```

### 3.2 Firestore-rakenne (ehdotus)

```javascript
// Pääkokoelma — seuratason kalenteri
seurat/{seuraId}/kalenteri/{tapahtumaId} {
  // Peruskenttä
  nimi: string,                          // "U15 H-H testaus" / "VP-Matti mentorointi"
  tyyppi: 'harjoitus'|'ottelu'|'testitapahtuma'|'kasvumittaus'|
          'valmentajapalaveri'|'tiimipalaveri'|'jaksopalaveri'|
          'mentorointitapaaminen'|'kalibraatiopaja'|'idp_seuranta'|
          'talenttileiri'|'muu',
  
  // Aika
  alkaa: Timestamp,
  paattyy: Timestamp,
  koko_paiva: boolean,                   // false default
  
  // Kohdistus
  joukkue: string|null,                  // "SJK U15" (null = seurataso)
  joukkueet: string[],                   // useampi joukkue (talenttileiri)
  osallistujat_uid: string[],            // valmentaja-UID:t (palaveri/mentorointi)
  pelaajat_id: string[],                 // pelaaja-ID:t (testi/leiri)
  
  // Paikka
  paikka: string|null,                   // "Seinäjoen jalkapallostadion"
  paikka_id: string|null,               // MyClub venue_id (linkki)
  
  // Linkitykset
  testitapahtuma_id: string|null,        // → seurat/{id}/testitapahtumat/{tid}
  myclub_event_id: number|null,          // MyClub API event.id (synkka-ankkuri)
  taso_ottelu_id: string|null,           // TASO-integraatio
  
  // Toistuvuus
  toistuvuus: null|{
    tyyppi: 'viikoittain'|'2_viikottain'|'kuukausittain'|'kausittain',
    paiva: number,                       // 0=su, 1=ma, ... 6=la
    paattyy: Timestamp|null
  },
  toistuvuus_sarja_id: string|null,      // ryhmittää toistuvat tapahtumat
  
  // Metadata
  luoja_uid: string,
  luotu: Timestamp,
  paivitetty: Timestamp,
  muokkaaja_uid: string|null,          // AUDIT: kuka viimeksi muokkasi (KIMI K2)
  tila: 'suunniteltu'|'vahvistettu'|'peruttu'|'valmis',
  poistettu: boolean,                   // SOFT-DELETE: true = piilotettu, data säilyy (KIMI K2)
  poistettu_uid: string|null,          // kuka poisti
  poistettu_pvm: Timestamp|null,
  muistiinpanot: string|null,
  
  // Integraatio
  lahde: 'manuaalinen'|'myclub'|'taso'|'ical_tuonti',
  lahde_id: string|null,                // dedup: myclub_{event_id} / taso_{id}
  viimeisin_synkka: Timestamp|null
}

// Läsnäolo (alikokoelma)
seurat/{seuraId}/kalenteri/{tapahtumaId}/lasnaolijat/{uid_tai_pelaajaId} {
  tila: 'kutsuttu'|'vahvistettu'|'peruttu'|'ei_vastausta',
  rooli: 'valmentaja'|'pelaaja'|'vp'|'muu',
  paivitetty: Timestamp
}
```

### 3.3 Olemassa olevien rakenteiden yhdistäminen

```
NYKYINEN RAKENNE                          → KALENTERIN SUHDE
────────────────────────────────────────────────────────────────
seurat/{id}/testitapahtumat/{tid}          → kalenteri/{id}.testitapahtuma_id = tid
                                             (kalenteri = "milloin", testitapahtuma = "mitä testataan")
seurat/{id}/tapahtumat/{otteluId}          → kalenteri/{id}.taso_ottelu_id = otteluId
                                             (TASO-ottelut näkyvät kalenterissa)
seurat/{id}/joukkueet/{jid}/kalenteri/{k}  → MIGRAATIO: siirretään pääkalenteriin
                                             joukkue-kenttään joukkueen ID
seurat/{id}/viestit/{valmentajaUid}        → mentorointitapaaminen linkittää viestiin
                                             (ei korvaa — kalenteri = "milloin", viesti = "mitä")
```

---

## 4. INTEGRAATIOARKKITEHTUURI

### 4.1 MyClub API -integraatio

**MyClub API v2.8** — REST, autentikointi `X-myClub-token`, rate limit 300/h.

```
MYCLUB                                    TALENTMASTER
─────────────────────────────────────────────────────────
GET /groups                      →        Joukkue-mapping: myclub_group_id ↔ TM joukkueId
GET /events?group_id=X           →        Harjoitukset → kalenteri/{id} (lahde:'myclub')
  &start_date=...&end_date=...
  &include_participants=true
GET /events?updated_after=T      →        Inkrementaalinen synkka (polling)
GET /other/venues                →        Paikkamapping
GET /other/event_categories      →        Tyyppi-tunnistus (harjoitus vs. muu)
```

**Synkkamekanismi (Cloud Function, cron 15 min):**

```javascript
// CF: myClubSyncEvents (europe-west1, cron tai manual trigger)
// 1. Lue seurat/{seuraId}/konfiguraatio/myclub → {token, domain, group_mapping, viimeisin_synkka}
// 2. GET /events?updated_after=viimeisin_synkka&include_participants=true
// 3. Per event:
//    a) Etsi kalenteri/ jossa lahde_id == 'myclub_' + event.id
//    b) Jos löytyy → päivitä (nimi, aika, paikka, osallistujat)
//    c) Jos ei → luo uusi (tyyppi = event_category → 'harjoitus'|'ottelu'|'muu')
// 4. Tallenna viimeisin_synkka = now
```

**Rajoitukset:**
- MyClub EI tarjoa iCal-feedejä eikä webhookeja → polling ainoa vaihtoehto
- API ei tue toistuvien tapahtumien luontia (vain yksittäiset)
- Rate limit 300/h riittää 4 seuralle × 5 joukkuetta × 15 min polling = ~20 kyselyä/h
- API-tunnus on lisäpalvelu — seuran pitää tilata se erikseen MyClubista

**MyClub API -dokumentaatio:** [taikala.github.io/myclub-api-docs/fi](https://taikala.github.io/myclub-api-docs/fi) ·
[myclub.fi/ominaisuudet/api](https://www.myclub.fi/ominaisuudet/api/)

### 4.2 TASO-integraatio (olemassa oleva)

`tasoHaeSeuranOttelut` CF on jo deployattu. Ottelut → `seurat/{id}/tapahtumat/{otteluId}`.
Kalenteriintegraatio: ottelut näkyvät automaattisesti kalenterissa `lahde:'taso'`.

### 4.3 iCal-vienti (TalentMaster → ulkoiset kalenterit)

```
CF: kalenteriIcalFeed (europe-west1, HTTPS)
URL: https://europe-west1-talentmaster-pilot.cloudfunctions.net/kalenteriIcal
     ?seura={seuraId}&joukkue={joukkueId}&token={ical_token}

→ Palauttaa .ics-tiedoston (RFC 5545)
→ Google Calendar / Outlook / Apple Calendar tilaa URL:n
→ Read-only (iCal-standardi ei tue kaksisuuntaista)
→ ical_token = seuraspesifinen, ei Firebase Auth (kalenterisovellus ei kirjaudu)
```

**iCal-token:** `seurat/{seuraId}/konfiguraatio/ical_token` — generoidaan kerran,
uusitaan pyynnöstä. Ei henkilökohtainen (joukkuekohtainen).

### 4.4 Google Calendar / Outlook -kaksisuuntainen synkka (Sprint 7+)

Vaatii OAuth 2.0 per käyttäjä — merkittävästi monimutkaisempi kuin iCal.
Ei pilottivaiheen prioriteetti. Ks. Teamworks-malli: iCal ensin, kaksisuuntainen myöhemmin.

---

## 5. VP:N VUOSIKELLO — testaamisen ja johtamisen rytmi

### 5.1 Vuosikellon rakenne (biologisesti ohjattu)

```
                    KEVÄTKAUSI                              SYKSYKAUSI
         Tammi  Helmi  Maalis  Huhti  Touko  Kesä    Heinä  Elo    Syys   Loka   Marras  Joulu
         ─────────────────────────────────────────    ──────────────────────────────────────────
TESTIT   ░░░░░  ░░░░░  ░░HH░░  ░░TK░  ░░░░░  ░░░    ░░░░░  ░░HH░  ░░TK░  ░░HH░  ░░░░░░  ░░░░
KASVU    ░░░░░  ░░KM░░  ░░░░░  ░░░░░  ░░KM░  ░░░    ░░░░░  ░░KM░  ░░░░░  ░░░░░  ░░KM░░  ░░░░
FLEI     ░░FL░  ░░░░░  ░░░░░  ░░░░░  ░░FL░  ░░░    ░░FL░  ░░░░░  ░░░░░  ░░░░░  ░░FL░░  ░░░░
MENTOR   ░░M░░  ░░M░░  ░░M░░  ░░M░░  ░░M░░  ░░░    ░░M░░  ░░M░░  ░░M░░  ░░M░░  ░░M░░░  ░░░░
JAKSO    ░░░░░  ░░░░░  ░░░░░  ░░J░░  ░░░░░  ░░░    ░░░░░  ░░░░░  ░░J░░  ░░░░░  ░░░░░░  ░░J░
KALIB    ░░░░░  ░░░░░  ░░K░░  ░░░░░  ░░░░░  ░░░    ░░░░░  ░░░░░  ░░K░░  ░░░░░  ░░░░░░  ░░░░
IDP      ░░░░░  ░░░░░  ░░░░░  ░░I░░  ░░░░░  ░░░    ░░░░░  ░░░░░  ░░░░░  ░░I░░  ░░░░░░  ░░░░

HH = H-H ominaisuustestit · TK = Tekniikkakilpailu · KM = Kasvumittaus (PHV)
FL = FLEI harjoitettavuuskartoitus · M = Mentorointi · J = Jaksopalaveri
K = Kalibraatiopaja · I = IDP-seuranta
```

### 5.2 PHV-ohjattu testausrytmi (§25 + §28)

| Kehitysvaihe | Kasvumittaus | H-H testit | Logiikka |
|---|---|---|---|
| PRE (ennen kasvupyrähdystä) | 2×/vuosi | 2×/vuosi | Koordinaatio > voima, FLEI kriittinen |
| LÄH/PH (pyrähdyksessä) | **3×/vuosi** | 2×/vuosi + kuormitusseuranta | Loukkaantumisriski korkea |
| POST/AN (jälkeen) | 1–2×/vuosi | 2×/vuosi | Voima/nopeus relevantteja nyt |

**Automaattinen vuosikelloehdotus:** VP asettaa joukkueen → TM ehdottaa testauskalenterin
perustuen joukkueen ikärakenteeseen ja PHV-jakaumaan. VP hyväksyy/muokkaa → tapahtumat syntyvät.

### 5.3 Mentorointikalenteri

```
VP asettaa saatavuuden (Teamworks Calendar Sign-Ups -malli):
  - "Maanantai 14–17, Keskiviikko 9–12" → 30 min slotit
  - Valmentaja varaa slotin → TM luo mentorointitapaaminen-tapahtuman
  - Tapaamisen jälkeen VP kirjoittaa muistiinpanon → seurat/{id}/viestit/{uid}
  - Valmentajan kontribuutio-korttiin merkitään "mentoroitu" (Master_v16 Valmentajat-tabi)
```

---

## 6. KÄYTTÖLIITTYMÄ — VP:n kalenterinäkymä

### 6.1 Näkymät

| Näkymä | Kuvaus | Käyttötilanne | MVP |
|--------|--------|---------------|-----|
| **Kuukausi** | Grid, tapahtumat värikoodeilla | Kokonaiskuva, vuosikellon hahmotus | ✅ |
| **Viikko** | Aikajana per päivä | Päällekkäisyyksien havaitseminen | ✅ |
| **Päivä** | Yksi päivä, tunnit + tapahtumat | Päällekkäisyydet, operatiivinen työ | ✅ (KIMI K6) |
| **Joukkue** | Yhden joukkueen kalenteri + testauksen etenemispalkki | Valmentajapalaverin valmistelu | ⏳ |
| **Vuosikello** | Lista/Gantt (ei ympyrädiagrammi MVP:ssä) | Strateginen suunnittelu | ⏳ lista-MVP |

### 6.2 Värikoodit (tapahtumatyyppi → väri)

4 väriä × ikonit erottavat saman värin tapahtumat (KIMI U1):
```
harjoitus            → var(--ink3) harmaa    ⚽  (MyClub-data, taustalla)
ottelu               → var(--blue) sininen   🏟️  (TASO-data)
testitapahtuma       → var(--teal) teal      🧪  (TM-ydindata)
kasvumittaus         → var(--teal) teal      📏  (TM-ydindata, eri ikoni)
valmentajapalaveri   → var(--amber) amber    👥  (johtaminen)
mentorointitapaaminen→ var(--amber) amber    🧑‍🏫  (johtaminen, eri ikoni)
jaksopalaveri        → rgba(255,255,255,.6)  📋  (milestone)
kalibraatiopaja      → rgba(255,255,255,.6)  🎯  (milestone, eri ikoni)
muu                  → var(--ink2)           ○   (neutraali)
```

### 6.3 Kalenteritapahtuman kortti (UI-spec)

```
┌─ Testitapahtuma ──────────────────────────────────┐
│ ● H-H Ominaisuustestit                      teal │
│ SJK U15 · 15.9.2026 klo 16:00–18:00              │
│ Seinäjoen jalkapallostadion                       │
│                                                    │
│ Protokolla: hh_laaja · 18 pelaajaa                │
│ ░░░░░░░░░░░░░░░░░░░░ 0/18 valmis                 │
│                                                    │
│ [Avaa Testaus_v9 →]  [📥 Excel]  [✏️ Muokkaa]    │
└───────────────────────────────────────────────────┘

┌─ Mentorointitapaaminen ───────────────────────────┐
│ ● VP → Matti Valmentaja                    amber  │
│ Ma 16.9.2026 klo 14:30–15:00                      │
│                                                    │
│ Aihe: U15 syyskauden tavoitteet                   │
│ Edellinen: 19.8.2026 (4 viikkoa sitten)           │
│                                                    │
│ [Avaa mentorointi-viesti →]  [✏️ Muokkaa]         │
└───────────────────────────────────────────────────┘

┌─ MyClub-harjoitus ────────────────────────────────┐
│ ○ U15 Harjoitus                            harmaa │
│ Ti 17.9.2026 klo 17:00–18:30                      │
│ Nurmikenttä 2                                     │
│                                                    │
│ 16/18 läsnä (MyClub)                              │
│ Lähde: MyClub · Synkattu 10 min sitten            │
└───────────────────────────────────────────────────┘
```

---

## 7. TIETOTURVA JA OIKEUDET

### 7.1 Firestore Security Rules (`seurat/{id}/kalenteri/{kid}`)

```javascript
match /seurat/{seuraId}/kalenteri/{tapahtumaId} {
  // Kaikki seuran jäsenet näkevät kalenterin
  allow read: if onSuperAdmin() || onOmaSeura(seuraId);
  
  // VP ja johto luovat/muokkaavat
  allow create, update: if onSuperAdmin() || (onOmaSeura(seuraId) && onJohtoRooli());
  
  // Valmentaja: vain muistiinpanot-kenttä omissa tapahtumissa (KIMI K1)
  allow update: if onOmaSeura(seuraId) && onValmentajaRooli()
    && resource.data.osallistujat_uid.hasAny([request.auth.uid])
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['muistiinpanot', 'paivitetty', 'muokkaaja_uid']);
  
  // Valmentaja: VAIN muistiinpanot + oma läsnäolo (field-level, KIMI K1)
  // Täysi update-oikeus vain johdolla — valmentaja ei voi muuttaa aikaa/paikkaa/osallistujia
  
  // Soft-delete: VP/johto merkitsee poistettu:true (KIMI K2, ei oikeaa deletea)
  allow delete: if onSuperAdmin() || (onOmaSeura(seuraId) && onJohtoRooli());
  
  // Läsnäolijat
  match /lasnaolijat/{osallistujaId} {
    allow read: if onSuperAdmin() || onOmaSeura(seuraId);
    allow write: if onSuperAdmin() || (onOmaSeura(seuraId) && onJohtoRooli())
      || (onOmaSeura(seuraId) && request.auth.uid == osallistujaId);
  }
}
```

### 7.2 MyClub API -tunnusten tallennus

```javascript
// seurat/{seuraId}/konfiguraatio/myclub (SA-only read/write)
{
  token: 'SALATTU',        // Cloud Function dekryptaa; EI koskaan selaimeen
  domain: 'sjk.myclub.fi',
  group_mapping: {         // MyClub group_id → TM joukkueId
    '34': 'sjk_u15',
    '35': 'sjk_u14t'
  },
  viimeisin_synkka: Timestamp,
  aktiivinen: true
}
```

**API-avain tallennetaan Google Cloud Secret Manageriin** (kuten OpenAI-avain).
Firestore-kenttä `token` on vain viite/hash, ei selväkielinen avain.

---

## 8. TOTEUTUSJÄRJESTYS (MVP-rajattu, KIMI K4/K5 perusteella)

> **MVP-periaate:** Vaihe 1–2 = pilottivalmis. Vaihe 3+ = pilotin palautteen jälkeen.
> **Legacy-migraatio (KIMI K8):** dual-write 2 vkoa — kirjoita sekä vanhaan
> `joukkueet/{jid}/kalenteri/` ETTÄ uuteen `seurat/{id}/kalenteri/`, sitten siirry uuteen.

### Vaihe 0 — Valmistelu (vko 24, ennen koodausta)
- [ ] Korjaa Security Rules -draft (K1: yhtenäistä roolifunktiot, field-level valmentajalle)
- [ ] Lisää audit-kentät Firestore-malliin (K2: muokkaaja_uid, soft-delete) ✅ TEHTY
- [ ] Päätä MyClub API -tilaus: kysy SJK:lta tilaako lisäpalvelun
- [ ] Suunnittele dual-write migraatiostrategia (K8)

### Vaihe 1 — MVP Peruskalenteri (Sprint 5, vko 25–27)
- [ ] Firestore-rakenne `seurat/{id}/kalenteri/{kid}` + composite-indeksit
- [ ] Security Rules kalenteri-blokki (korjattu versio)
- [ ] Dual-write migraatio käyntiin (legacy-kalenteri rinnalla 2 vkoa)
- [ ] VP Kalenteri-välilehti: kuukausi + viikko + **päivä**-näkymä
- [ ] Tapahtuman luonti (manuaalinen): testitapahtuma, palaveri, mentorointi, muu
- [ ] Testitapahtuma → linkki Testaus_v9:ään (`testitapahtuma_id`)
- [ ] Olemassa oleva `testitapahtumat/` näkyy kalenterissa
- [ ] **MyClub manual import** (KIMI K5: siirretty Vaihe 4:stä tähän):
  VP syöttää MyClub group_mapping → CF hakee tapahtumat kerran → näyttää kalenterissa

### Vaihe 2 — iCal-vienti + Outlook/Google (Sprint 5–6, vko 27–28)
- [ ] CF `kalenteriIcal` → .ics per joukkue/seura
- [ ] Google Calendar / Outlook tilausohje VP:lle
- [ ] ical_token generointi + uusiminen Admin-näkymässä

### Vaihe 3 — Vuosikello + mentorointi (Sprint 6, vko 29–30)
- [ ] Vuosikellonäkymä **listana** ensin (Gantt myöhemmin, ei ympyrädiagrammi — KIMI U2)
- [ ] Staattinen testausmallipohja per joukkue (ei PHV-wizard vielä)
- [ ] Mentorointislottien hallinta (VP asettaa saatavuuden)
- [ ] Valmentajan slottivaraus
- [ ] Mentorointi-viestien linkitys kalenteritapahtumaan
- [ ] FCM push-notifikaatiot: tapahtumamuutokset + mentorointi-vahvistukset (KIMI K7)

### Vaihe 4 — MyClub auto-synkka (Sprint 7, vko 31–33)
- [ ] CF `myClubSyncEvents` (polling 15 min + exponential backoff retry)
- [ ] Inkrementaalinen synkka (`updated_after`)
- [ ] Läsnäolodatan tuonti (MyClub participations → TM)
- [ ] Cloud Monitoring -alertti synkkavirheistä

### Vaihe 5 — Jatkokehitys (Sprint 8+)
- [ ] "Luo testauskalenteri" -wizard: joukkue → PHV-jakauma → testausehdotus
- [ ] Vuosikello Gantt-näkymä (jos lista riittää, ei tehdä)
- [ ] Kaksisuuntainen Google/Outlook (OAuth 2.0 per käyttäjä)
- [ ] Vanhempien kalenterinäkymä (vaatii Vanhempi_v2 Firebase-migraation)
- [ ] Konfliktin tunnistus (päällekkäinen aika, resurssikonflikti)

---

## 9. RISKIT JA PÄÄTÖKSET

| Riski / Päätös | Analyysi | Ehdotus |
|----------------|----------|---------|
| MyClub API lisäpalvelu | Seurat joutuvat tilaamaan erikseen → ei kaikilla | Tee MyClub optionaaliseksi; manuaalinen syöttö aina fallback |
| MyClub rate limit 300/h | 8 seuraa × 5 joukkuetta × 4/h = 160 → mahtuu | Yksi CF per seura, staggered cron |
| Toistuvien tapahtumien hallinta | MyClub API ei tue toistuvia → TM:n oma logiikka | `toistuvuus`-kenttä + `toistuvuus_sarja_id` ryhmittelyyn |
| Kaksisuuntainen synkka | OAuth per käyttäjä = monimutkainen + GDPR | Aloita iCal (read-only, yksinkertainen), kaksisuuntainen Sprint 8+ |
| Legacy-kalenteri (K8) | Testaus_v9 kirjoittaa `joukkueet/{jid}/kalenteri/` | Dual-write 2 vkoa, sitten siirry pääkalenteriin |
| TASO-ottelut | CF `tasoHaeSeuranOttelut` deployattu | Ottelut → kalenteri automaattisesti `lahde:'taso'` |
| Soft-delete vs. hard delete (K2) | Vahingossa poistettu tapahtuma = data menetetty | `poistettu:true` + `poistettu_uid/pvm`, ei oikeaa deletea |
| Valmentajan oikeudet (K1) | Liian laaja update voi muuttaa aikaa/paikkaa | Field-level Rules: vain muistiinpanot + oma läsnäolo |
| Firestore composite-indeksit | Kuukausinäkymä: `alkaa` range + `joukkue` + `poistettu` | Suunnittele indeksit Vaihe 0:ssa |

### Avoimet päätökset (vaatii keskustelun)

1. ~~**MyClub-priorisointi**~~ → **PÄÄTETTY:** Manual import Vaihe 1:ssä (SJK:n VP:n palaute).
   Auto-synkka Vaihe 4:ssä. SJK:lta kysyttävä: tilaako MyClub API -lisäpalvelun.

2. **Kalenterin sijainti UI:ssa:** VP_v22 Kalenteri-tabi (nykyinen tyhjä) vai erillinen sivu?
   Ehdotus: VP_v22/v25 Kalenteri-tabi (yhdenmukainen navigaatio).

3. **Valmentajan kalenterinäkymä:** Näkeekö valmentaja Master_v16:ssa oman joukkueensa kalenterin?
   Ehdotus: kyllä — Master_v16 Kalenteri-välilehti (jo olemassa, tyhjä).

4. **Vanhempien kalenterinäkymä:** PlayMetrics-malli (konsolidoitu näkymä kaikille lapsille)?
   Ehdotus: Sprint 8+ (vaatii Vanhempi_v2 Firebase-migraation ensin).

5. **Oletusnäkymä kirjautuessa:** Kuukausi vai viikko?
   Ehdotus: viikko (operatiivisin, VP:n Tänään-tabi on jo dashboard).

---

---

## 10. KIMI-ANALYYSIN KÄSITTELY (2026-06-07)

> Nelikulmainen arviointi: 32 löydöstä, 8 kriittistä. Alla päätökset.

| KIMI # | Löydös | Päätös | Peruste |
|--------|--------|--------|---------|
| **K1** | Security Rules kovakoodattu 'vp' + valmentajan liian laaja update | ✅ **Korjattu** §7.1:een | Oikea — yhtenäisyys + field-level |
| **K2** | Audit trail + soft-delete puuttuu | ✅ **Korjattu** §3.2:een | Oikea — vahingossa poisto = pysyvä menetys |
| **K3** | DLQ + Pub/Sub + Circuit Breaker | ❌ **Hylätty** (exponential backoff kyllä) | Overengineering solo-pilotille |
| **K4** | Aikataulu liian tiukka, MVP puuttuu | ✅ **Korjattu** §8:aan | Oikea — MVP-rajaus tehty |
| **K5** | MyClub liian myöhään | ✅ **Siirretty** Vaihe 1:een (manual import) | SJK:n VP:n suora palaute |
| **K6** | Päivänäkymä puuttuu | ✅ **Lisätty** §6.1:een | Oikea — operatiivinen tarve |
| **K7** | Push-notifikaatiot puuttuvat | ⏳ **Vaihe 3** (FCM) | Totta, mutta ei MVP-blocker |
| **K8** | Legacy-migraatio | ✅ **Lisätty** §8 Vaihe 0 | Oikea — dual-write strategia |
| **T1** | iCal-token GDPR-riski | ❌ **Hylätty** | Joukkuekalenteri ei sisällä henkilötietoja |
| **T5** | joukkue vs joukkueet dual-kenttä | ⚠️ **Tiedostettu** | Sama strategia kuin pelaajilla (§7/18): molemmat rinnakkain |
| **U1** | Värikoodaus: samat värit eri tyypeille | ✅ **Korjattu** §6.2: 4 väriä × ikonit | Oikea |
| **U2** | Vuosikello ympyrä liian monimutkainen | ✅ **Lista ensin** §8 Vaihe 3 | Oikea — Gantt/ympyrä myöhemmin |
| **C1** | Puuttuu Spond, Heja, SoccerLAB | ❌ **Hylätty** | Viestintä/video ≠ talent development |
| **C2** | "Operatiivinen selkäranka" ylimitoitettu | ❌ **Hylätty** | Asiakkaan (SJK VP) oma sana |

---

*Kalenteriarkkitehtuuri · TalentMaster™ · 2026-06-07 (päivitetty KIMI-analyysin jälkeen)*
*Tutkimuslähteet: Kitman Labs, Teamworks, 360Player, PlayMetrics, Catapult/Smartabase, MyClub API v2.8*
