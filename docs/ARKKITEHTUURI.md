# TalentMaster™ — Järjestelmäarkkitehtuuri
## Päivitetty 2026-03-29

---

## Yleiskuva

TalentMaster on multi-tenant SaaS-alusta jalkapallon (ja tulevaisuudessa
muiden lajien) talenttiarviointiin ja pelaajakehityksen johtamiseen.
Asiakas on seura, ei yksittäinen valmentaja. Filosofia: "Pelaaja ensin,
hallinto vahvistaa" — järjestelmä on rakennettu lapsen kehitystarpeesta
ylöspäin, ei hallinnon tarpeesta alaspäin.

---

## Tekninen stack

| Kerros | Teknologia | Sijainti |
|---|---|---|
| Frontend | HTML/CSS/JavaScript (vanilla, IIFE-pattern) | GitHub Pages |
| Tietokanta | Firebase Firestore | europe-west1 (Frankfurt) |
| Autentikointi | Firebase Auth + Custom Claims | Email/Password |
| Cloud Functions | Node.js, europe-west1 | Firebase Blaze |
| Admin-skriptit | Node.js + Firebase Admin SDK | GitHub Actions |
| Excel-lukeminen | SheetJS 0.18.5 (client-side) | Selain |
| Excel-generointi | openpyxl (server-side, Cloud Function) | Firebase |
| Sähköposti | Nodemailer + Gmail | Cloud Functions |

---

## Seitsemän kerroksen arkkitehtuuri

```
Kerros 1:  Pelaaja / Master v7                    ← pelaajan arjen työkalu
Kerros 2:  Valmentaja / kenttähavainto + ADAR     ← valmentajan kirjaukset
Kerros 3:  Game IQ / D4 / koulutusmoduuli         ← kognitiivinen kehitys
Kerros 4:  IDP-kortti v3                          ← yksilöllinen kehityskortti
Kerros 5:  IDP-aktivointi (3 reittiä / 3 tasoa)   ← aktivointilogiikka
Kerros 6:  VP / hallintajärjestelmä               ← seuran johtaminen
Kerros 7:  Fyysinen → teknis-taktinen integraatio ← lopullinen tavoite
```

Kaikki kerrokset kytkeytyvät Firestoreen yhteiseen datarakenteeseen.

---

## Firebase-projekti

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Firestore sijainti:** europe-west1
- **Super Admin:** `talentmasterid@gmail.com` (UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`)
  — ABSOLUUTTINEN PERIAATE: Super Adminilla on aina pääsy kaikkeen.
  Tämä ei saa koskaan rikkoutua koodipäivityksissä.

---

## Firestore-tietokantarakenne (täydellinen)

```
admins/
  {uid}/
    email, rooli, superAdmin, luotu

seurat/
  {seuraId}/                          ← fcl, kpv, palloiirot, yvies, sjk, grifk
    id, nimi, laji, paketti
    vp_uid, vp_email
    kaupunki, maa, aktiivinen
    ominaisuudet[], roolit[]
    max_pelaajia, tilastot{}
    tavoiteprofiili{}                 ← UUSI: seuran valmennuslinjan tavoitedimensiot
    luotu

    joukkueet/{joukkueId}

    pelaajat/{pelaajaId}/
      etunimi, sukunimi, syntymapaiva
      palloID, seura, joukkue
      biologinen_ika{}                ← Mirwald-laskenta
      flei_profiili{}                 ← LAI/TCI/MTI/IVI + kokonaisindeksi
      tki{}                           ← UUSI: TKI-indeksi (Syöttö×0.40 + Pujottelu×0.30 + SM-pallo×0.30)
      tsi{}                           ← TSI: SM-juoksu − SM-pallo (sekunteina)

      testit/{testiId}                ← H-H ominaisuustestit
      kartoitukset/{kartoitusId}      ← Harjoitettavuuskartoitukset U12/U15/U19
      tekniikka/{kilpailuId}          ← Tekniikkakilpailutulokset (sisältää TKI-laskenta)
      adar/{adarId}                   ← Game IQ / ADAR-arvioinnit (4 vaihetta + pisteet)
      havainnot/{havaintoId}          ← Valmentajan kenttähavainnot (narratiivi + dimensiopisteet)
      idp_kausi/{kaudenId}            ← IDP-kausikohtaiset tavoitteet ja tila
      idp_taso/{tasomenId}            ← IDP-taso (perus/laajennettu/talent)
      ketjut/{ketjuId}                ← Liikeketjupisteet per testikerros
      streak/{streakId}               ← Omatoimiharjoittelun streak-seuranta
      kuorma/{kuormaId}               ← RPE ja kuormaseuranta (A:C-suhde)
      vammat/{vammaId}                ← Kuntoutusdata (arkaluonteinen — strict rules)

      omatoimi_ohjelmat/{ohjelmaId}/  ← UUSI: generoidut omatoimiohjelmat
        luotu, ikäluokka
        flei_profiili{}, heikoin_ketju, phv_tila
        harjoitteet[]:
          { tyyppi: "D"|"S"|"P"|"T", ketju, nimi, kuvaus, kesto_min, toistot }
        seuraava_tarkistus            ← 6 viikkoa luomisesta

      d3_profiili/{profiiliId}/       ← UUSI: Psykologinen dimensio (Fulham-integraatio)
        luotu, kausi
        inner_drive: 1–5
        coachability: 1–5
        resilience: 1–5
        focus: 1–5
        emotional_control: 1–5
        arviointilahde: "self"|"haastattelu"|"coach_obs"
        valmentajan_narratiivi: ""

    kirjaukset/{kirjausId}            ← VP:n harjoitteluseurantakirjaukset
    testit/{testiId}                  ← Joukkuetason mittaustulokset
    kartoitukset/{kartoitusId}        ← Joukkueen harjoitettavuuskartoitukset
    tekniikka/{kilpailuId}            ← Joukkueen tekniikkakilpailutulokset
    adar/{adarId}                     ← Joukkueen ADAR-arvioinnit
    kuorma/{kuormaId}                 ← Joukkueen RPE ja kuormaseuranta
    vammat/{vammaId}                  ← Joukkueen kuntoutusdata

    identiteettiprofiili/{kaudenId}/  ← UUSI: Seuran aggregoitu pelaajaprofiilin kehitys
      kausi: "2026"
      ikäluokat: {
        "U10-U12": { d1: 62, d2: 58, d3: 45, d4: 41, d5: 55, tki: 67, n: 34 },
        "U13-U15": { d1: 71, d2: 64, d3: 52, d4: 58, d5: 61, tki: 72, n: 28 },
        ...
      }
      vs_tavoiteprofiili: { d1: +4, d2: -6, d3: -12, d4: +3, d5: +1 }
      laskettu: timestamp

kirjaukset/                           ← Vanha rakenne (yhteensopivuus)
kirjaukset_joukkue/
kirjaukset_tapahtumat/
```

---

## Uudet mittarit ja niiden laskentalogiikka

### TKI — Tekninen taitoindeksi
```
TKI = (Syöttö_normalisoitu × 0.40) + (Pujottelu_normalisoitu × 0.30) + (SM-pallo_normalisoitu × 0.30)
→ tulos normalisoitu 0–100 biologisen ikäluokan normiin
```
Painotukset: Liikanen & Törmä 2025. Jokainen komponentti normalisoidaan
biologiseen ikäluokan normiin ennen yhdistämistä. Tallennetaan pelaajan
`tki`-kenttään ja `tekniikka/{kilpailuId}`:iin.

**Ero TSI:hin:** TSI = SM-juoksu − SM-pallo (sekunteina) — kertoo onko
tekniikka pullonkaula suhteessa nopeuteen. TKI = absoluuttinen tekninen
taso suhteessa biologiseen ikäluokkaan.

### FLEI — Fascia Load Efficiency Index
```
FLEI = LAI (35%) + TCI (25%) + MTI (20%) + IVI (20%) → 0–100
```
0–20 matala riski | 21–40 pieniä kehitystarpeita | 41–60 kohonnut riski |
61–80 korkea riski (kuorma −20%) | 81–100 kriittinen (välitön interventio)

### Seuran identiteettiprofiili
Aggregoitu kausikohtainen kuva seuran pelaajien viiden dimension kehityksestä.
Lasketaan: kaikkien pelaajien dimensiopisteet per ikäluokka → vertaus
seuran tavoiteprofiiliin (`seurat/{seuraId}/tavoiteprofiili`) → delta tallennetaan
`identiteettiprofiili/{kaudenId}`:iin. Lasketaan 2× kaudessa.

---

## Omatoimiharjoitegeneraattori

Generoi kolmen (+1) tyypin harjoite-ehdotuksen pelaajan FLEI-profiilin,
ikäluokan ja PHV-tilan perusteella:

| Tyyppi | Milloin | Kesto | Periaate |
|---|---|---|---|
| T — Tekninen | Joka päivä | 15–30 min | Kultaikkuna — päivittäinen pallokosketus |
| D — Päivittäinen | Joka päivä | 5–10 min | Liikkuvuus + hermoston nopea toiminta |
| S — Täydentävä | Vapaa-/lepopäivä | 15–20 min | Pelaajan heikoin liikeketju |
| P — Progressiivinen | 2–3×/vk | 20–30 min | 6 viikon nousujohteinen jakso |

**Prioriteettijärjestys useammassa punaisessa lipussa:**
DFL ensin (hallintaketju = kaikken pohja) → pelipaikan kriittisin ketju → lyhyen aikavälin hyöty.

**Ikärajoitukset:**
- U8–12: vain T + D (ei intensiivistä intervallia)
- U12–15: T + D + S + P (kehonpaino, ei maitohapollista)
- U15+: kaikki tyypit täydellä jaksotuslogiikalla
- PHV-huippu: P-harjoitteen intensiteetti max 60% ikäluokasta riippumatta

---

## D3-psykologinen dimensio (Fulham FC -integraatio)

Viisi ominaisuutta jotka kytkeytyvät suoraan ADAR-mittareihin:

| Ominaisuus | ADAR-kytkös | Firestore-kenttä |
|---|---|---|
| Inner Drive | DVI-pohja | `inner_drive` |
| Coachability | DVI — reagointi palautteeseen | `coachability` |
| Resilience | Re-assess — palautumisaika virheestä | `resilience` |
| Focus | Assess — skannaustaajuus | `focus` |
| Emotional Control | Act — tekninen laatu paineessa | `emotional_control` |

Kolmitasoinen profilointi: itsearviointilomake (kirjallinen) + haastattelu
(suullinen) + valmentajan observointi (toiminnallinen). Tehdään 2× kaudessa.
Lomake alkaa U13-ikäluokasta. Ei deselektiota yksin D3:n perusteella.

---

## Security Rules -logiikka

- **Super-admin:** lukee ja kirjoittaa kaiken kaikista seuroista
- **Seuran VP:** lukee ja kirjoittaa oman seuransa kaiken datan
- **Valmentaja:** lukee oman seuransa datan, kirjoittaa havainnot + ADAR
- **Fysioterapeutti:** lukee + kirjoittaa vammat/{vammaId} (strict)
- **Pelaaja:** lukee oman profiilinsa — ei kirjoitusoikeutta testituloksiin
- **Vanhempi:** lukee lapsen profiilin pelkistetysti
- **Ei kirjautunut:** ei pääsyä mihinkään

**KRIITTINEN:** `vammat`-kokoelmalle tiukemmat säännöt — vain
fysioterapeutti + VP + super_admin pääsevät käsiksi arkaluonteiseen dataan.
`d3_profiili`-kokoelma: pelaaja omistaa oman datansa — seuran johto näkee
vain aggregaattitason, ei yksittäisten pelaajien vastauksia.

---

## Custom Claims -roolit

```javascript
// Kaikki roolit (underscore-muodossa Firestoressä ja Custom Claimseissa)
super_admin | vp | seurasihteeri | urheilutoimenjohtaja |
valmentaja | talenttivalmentaja | fysiikkavalmentaja |
fysioterapeutti | testivastaava | pelaaja | vanhempi

// normalizeRooli() tm_nav.js:ssä hoitaa camelCase → underscore muunnoksen
// (vanhoissa näkymissä käytettiin superAdmin, nyt super_admin)
```

---

## Cloud Functions (6 kpl, deployed europe-west1)

| Funktio | Tarkoitus |
|---|---|
| `lahetaHuoltajaKutsu` | Vanhempien kutsuminen sähköpostitse |
| `luoKayttaja` | Uuden käyttäjän luonti Admin SDK:lla |
| `asetaCustomClaim` | Roolien asettaminen Custom Claimseihin |
| `lahetaSalasananVaihto` | Password reset -sähköposti |
| `haeSeuraData` | Seuradatan haku server-side |
| `generoiExcel` | Excel-tiedoston generointi openpyxl:llä (tulossa) |

---

## Pakettitasot

| Paketti | Roolit | Max pelaajia | Ominaisuudet |
|---|---|---|---|
| Perustaso | VP, valmentaja, testivastaava | 100 | Kirjaukset, testit, TKI, profiilit |
| Kehitystaso | + talenttivalmentaja, fysiikkavalmentaja | 300 | + ADAR, biologinen ikä, talenttiohjelma, D3-profiili |
| Huipputaso | Kaikki roolit | Rajaton | Kaikki + identiteettiprofiili + omatoimigeneraattori |

---

## GitHub Pages URL:t

```
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_VP_v17.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Master_v7.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_IDP_Kortti_v3.html
https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Rekisterointi_Suostumus.html
```

---

## Kriittiset tunnettuja ratkaisuja

1. Firestore Rules: `allow create` JA `allow update` — `set({merge:true})` käyttää update jos doc olemassa
2. Syntymäpäivän parsinta: `Date.UTC(y, m-1, d)` — EI `new Date(string)`
3. `onAuthStateChanged` loop: estetty `_kirjautuminenKesken`-flagilla
4. SheetJS ei kirjoita tyylejä ilman Pro — Excel-validoinnit siirretty import-vaiheeseen
5. Näkymien vaihto: `style.display = 'none'` EI classList (CSS specificity-ongelma)
6. Testaus: ÄLÄ testaa VP-dashboardia ja Adminia samassa selaimessa (yksi auth/projekti/selain)
7. Hidas yhteys: `onAuthStateChanged` laukeaa ennen JS-funktioiden definointia — käytä `_odotaJaSiirryDashboardiin()` polling-looppia
8. GitHub Pages CDN: vaatii hard reload `Ctrl+Shift+R` uuden version näkemiseen
9. `tm_nav.js` logout: lähettää `tm:logout` → 50ms odotus → `signOut()`. Kaikki `onSnapshot`-kuuntelijat: `window.addEventListener('tm:logout', () => { unsubscribe && unsubscribe(); })`
10. Roolinimet: `super_admin` (underscore) Firestoressä ja Custom Claimseissa. `normalizeRooli()` hoitaa vanhojen camelCase-arvojen muunnoksen
11. openpyxl pakollinen Excel DataValidation-pudotuslistoille — SheetJS 0.18.5 ei tue
12. Testaus aina GitHub Pages -URL:lla — file:// protokolla estää Firebase-kirjoitukset
