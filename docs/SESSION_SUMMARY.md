# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten

## Projektin tila (päivitetty 2026-04-04)

TalentMaster on jalkapallon talenttiarviointialusta — 7 pilottiseuraa (KPV, FC Lahti Juniorit, SJK Juniorit, GrIFK, HJK Juniorit, Pallo-Iirot, Ylöjärven Ilves), Firebase Blaze. Harjoitelogiikka v3 rakennettu. Pelaajaprosessi testattu alusta loppuun. Seura.html merkittävästi paranneltu tässä sessiossa.

---

## GitHub-repositorio

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---

## Sivuarkkitehtuuri (vahvistettu 2026-04-04)

| Sivu | Tiedosto | Rooli |
|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja + kenttäroolit |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri, urheilutoimenjohtaja, vp, super_admin |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja |
| Pelaaja | `TalentMaster_Pelaaja_v1.html` | pelaaja |
| IDP-kortti | `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi |
| Suostumuslomake | `TalentMaster_Rekisterointi_Suostumus.html` | anonyymi/huoltaja |

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore, `eur3` multi-region
- **Auth:** Email/Password
- **Functions:** `europe-west1`, 6 funktiota deployattu

### Konfiguraatio
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
```

Super Admin: `talentmasterid@gmail.com` / UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`

### Käyttäjät

| Sähköposti | UID | Rooli | Seura |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Kaikki |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.kpv@talentmaster.fi | jIbW7q8nLggswTjefkYuSvtneH92 | VP | KPV |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

### Testipelaaja (KPV)
- **Nimi:** Topias Koskela, **pelaajaId:** `rtQdrYf7J6CVEKjOUThI`
- **huoltajaEmail:** `terokoskela7@gmail.com`, **suostumusTila:** `annettu`, **tila:** `aktiivinen`

---

## Cloud Functions — 6 deployattu (europe-west1)

| Funktio | Kuvaus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Lähettää rekisteröintikutsun huoltajalle | ✅ |
| `luoKayttaja` | Luo Auth-tunnuksen + custom claims + salasanalinkin | ✅ |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjän | ✅ |
| `lahetaPelaajaSivuLinkki` | Lähettää linkit vanhemman/pelaajan sivulle | ✅ |
| `tasoHaeSeuranOttelut` | Hakee ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU POIS — vaatii Cloud Scheduler Admin -roolin SA:lle IAM-konsolissa |

### roolitusUrl (luoKayttaja) — continueUrl salasanalinkissä
```javascript
const roolitusUrl = {
  valmentaja: 'TalentMaster_Master_v9.html',
  talenttivalmentaja: 'TalentMaster_Master_v9.html',
  fysiikkavalmentaja: 'TalentMaster_Master_v9.html',
  fysioterapeutti: 'TalentMaster_Master_v9.html',
  testivastaava: 'TalentMaster_Master_v9.html',
  vp: 'TalentMaster_VP_v18.html',
  seurasihteeri: 'TalentMaster_Seura.html',
  urheilutoimenjohtaja: 'TalentMaster_Seura.html',
};
```

---

## PENDING — avoimet asiat

- `TalentMaster_Seura.html` uusin versio (170 240 merkkiä) GitHubiin — **KRIITTINEN**
- `TalentMaster_VP_v18.html` → GitHub — PENDING
- `harjoitelogiikka_v3.js` → GitHub — PENDING
- Cloud Scheduler API aktivointi: https://console.cloud.google.com/apis/library/cloudscheduler.googleapis.com?project=talentmaster-pilot
- Muiden seurojen `palloliittoKori` + `tmTaso` Firestoreen (fcl, palloiirot, yvies, sjk, grifk) — KPV lisätty
- Kutsu-dokumentin `hyvaksytty`-päivitys suostumuslomakkeesta — suostumuslomake ei vielä päivitä kutsu-dokumenttia
- Vanhemman sivu: tallennusohje näkyy joka kerta (localStorage-rajoitus), padding-bottom 120px → 40px

---

## Pelaajaprosessi — toimii alusta loppuun (testattu 2026-04-04)

1. VP lähettää rekisteröintikutsun Seura.html:stä → sähköposti huoltajalle ✅
2. Pelaaja tallentuu Firestoreen (`suostumusTila: "odottaa"`) ✅
3. Vanhempi täyttää suostumuslomakkeen → `suostumusTila: "annettu"`, `tila: "aktiivinen"` ✅
4. Vanhemman sivu aukeaa oikein ✅
5. Pelaajan sivu aukeaa oikein ✅
6. Sähköposti vanhemmalle salasanalinkillä lähetetty ✅

Firestore Rules päivitetty Firebase-konsolissa suoraan (GitHub Actions saa 403 Rules-deployssa):
```
|| (resource.data.suostumusTila == 'odottaa'
    && request.resource.data.suostumusTila == 'annettu')
```

---

## TalentMaster_Seura.html — muutokset tässä sessiossa

Uusin versio (170 240 merkkiä) ladattu käyttäjän selaimeen. **Tulee ladata GitHubiin ennen testausta.**

**Muutos 1 — renderSopimukset() uusittu.** Vanha Palloliiton kolme koria -checklist poistettu. Tilalle TalentMaster-taso (lukee `tmTaso` Firestoresta), Palloliiton kori (lukee `palloliittoKori`, vain informatiivinen) ja GDPR-suostumustilanne (lukee `suostumusTila` pelaajat-kokoelmasta — EI kutsut-kokoelmasta). Turhat funktiot `toggleKriteeri`, `renderKriteeriUI`, `paivitaKoriPalkki`, `lataaKriteeritTila` poistettu.

**Muutos 2 — kutsuId kulkee rekisteröintilinkin mukana.** Kutsu luodaan `doc().id`-menetelmällä. `kutsuId` lisätään URL-parametreihin jotta suostumuslomake voi päivittää oikean kutsun tilaksi `hyvaksytty`.

**Muutos 3 — Joukkueen monivalinta pelaajalle.** `avaaVaihdaJoukkuePelaajaModal()` muutettu `<select>` → checkbox-lista. Tukee useita joukkueita. Tallentaa `joukkueet[]` (uusi) ja `joukkue` (vanha yhteensopivuus). Hakee nykyiset joukkueet Firestoresta ennen avaamista.

**Muutos 4 — Sopimukset-välilehden tila oikeasta kokoelmasta.** Lukee `pelaajat.suostumusTila` eikä `kutsut.tila`.

---

## TalentMaster-tasot vs. Palloliiton korit — arkkitehtuuriselkeys

**TalentMaster-tasot** = tuotelisenssi: Perustaso (rekisteri+kutsut), Kehitystaso (+FLEI+IDP+PHV), Huipputaso (+talenttitunnistus+biologinen ikä+5D).

**Palloliiton korit** = seuran ja Palloliiton sopimustaso — TalentMaster vain näyttää tiedon. Kori 1 → Perustaso, Kori 2 → Kehitystaso, Kori 3 → Huipputaso. Myyntiargumentti.

KPV:lle lisätty Firestoreen: `{ palloliittoKori: '1', tmTaso: 'perustaso' }`.

---

## Pelaajadatan rakenne (vahvistettu)

```javascript
// seurat/{seuraId}/pelaajat/{pelaajaId}
{
  etunimi, sukunimi,
  joukkue: 'kpv_u13',         // ensisijainen (vanha yhteensopivuus)
  joukkueet: ['kpv_u13'],     // kaikki joukkueet (uusi rakenne)
  seuraId, huoltajaEmail, pelaajaId,
  suostumusTila: 'odottaa' | 'annettu',
  tila: 'aktiivinen' | null,
  syntymaaika, palloID,
  tuotu, tuoja, muokattu, muokkaajaUid,
}
```

Joukkueen kaksikenttäinen rakenne on tarkoituksellinen: `joukkue` (string) säilyy yhteensopivuuden vuoksi, `joukkueet` (array) mahdollistaa usean joukkueen jäsenyyden ja on oikea rakenne harjoitettavuuskartoitushauille sekä testidatan seurannalle.

---

## Harjoitelogiikka v3 — tärkeät rakenteet

### 70/30-periaate (EI muuteta)
70% KOKONAISVALTAINEN (kaikki 5 liikeketjua), 30% KOHDENNETTU (AINA heikoin ketju — EI profiiliin). Koskee alkurutiinia (20–30 min). Kenttäharjoitus on valmentajan.

| Tyyppi | Milloin | Kesto | Tarkoitus |
|---|---|---|---|
| T | Joka päivä — MYÖS LEPOPÄIVÄT | 15–30 min | Pallokosketus — kultaikkuna |
| D | Joka päivä | 5–10 min | Liikkuvuus + hermoston ylläpito |
| S | Vapaa-/lepopäivä | 15–20 min | Pelaajan HEIKOIN ketju |
| P | 2–3×/vk | 20–30 min | 6 vk nousujohteinen jakso |

### T-harjoitteen filosofia
Tekninen taito = hermostollinen automatisoituminen → EI vaadi lepoa. Tauko heikentää automaatioratoja. Kultaikkuna 8–12v (Nevanlinna 2014): sama tulos vaatii murrosiän jälkeen moninkertaisen työn. Ajax/Benfica/La Masia: daily touches. U8–U12: EI mittausta, EI pakottamista. U15+: T muuttuu pelipaikkakohtaiseksi. T ei poistu koskaan ohjelmasta.

### Muut periaatteet
Viikkokierto: parillinen vk → heikoin, pariton → toiseksi heikoin. Ikäkohtainen kieli: leikkija/rakentaja/showcase. Everton Stage 1→5. PHV ohittaa Stagen. Everton-lisäykset: laskeutuminen (ACL), YJ-loikat, karhukävely.

### 6 viikon P-jakso (Nevanlinna 2014)
Vk 1–2: Valmistava (60–70%) → Vk 3–4: Kehittävä (75–85%) → Vk 5–6: Huipentava (90–100%).

### Funktiot (harjoitelogiikka_v3.js)
```javascript
generoimTehtavat(pelaaja)        // T+D+S
generoimTehtavatV2(pelaaja)      // + P (U15+)
generoimViikoOhjelma(pelaaja)    // 7 päivän ohjelma
laskeKetjuProfiili(pelaaja)      // heikoin/vahvin/järjestys
_laskeStage(pelaaja)             // Stage 1-5
_ikatyyppi(ika)                  // leikkija/rakentaja/showcase
ytUrl(id) / ytThumbnail(id)      // YouTube apufunktiot
```

---

## PIN-kirjautuminen (Pelaaja v1/v2)

```javascript
_haeKaikkiSeurat()     // Firestoresta — toimii uusille seuroille
pinTarkista()          // pelaajat.where('pin','==','1234')
_tarkistaPinSessio()   // sessio 30 päivää localStorage
kirjauduUlos()         // tyhjentää Firebase + PIN
```

URL-parametri `?seura=kpv` nopeuttaa hakua.

---

## AI Behavioural Science -agentti (Sprint 6–8)

Arkkitehtuuri: Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä. Puhuu VAIN oikeaan aikaan (streak katkeamassa, 3pv putki, fiilinki matala, uusi viikko, PHV-huippu). Periaatteet: Habit loop (Duhigg), Implementation intention (Gollwitzer), Loss aversion, Social proof, Temptation bundling (Milkman), Fresh start effect. Vaatii min 2–4vk dataa.

### Harjoitekirjauksen Firestore-rakenne (tee oikein Sprint 3:ssa ennen agentin rakentamista)
```
seurat/{seuraId}/pelaajat/{pelaajaId}/kirjaukset/{pvm}/
  tyyppi: 'T'|'D'|'S'|'P'
  tehty: bool
  kesto_min, rpe: 1-10
  aika: 'ilta'|'aamu'|'paiva'
  fiilinki: 1-5
streak_historia: []
joukkuetreenit: []
```

---

## Vuosiohjelma — automaattiset muutokset

`harjoitettavuus_pisteet` kasvaa → Stage nousee → harjoite vaikeutuu. Heikoin ketju vaihtuu → D ja S vaihtuvat automaattisesti. `phv_tila` muuttuu → kuormarajoitin aktivoituu/poistuu.

Kehitysnopeus (realistinen/kausi): Lankku 20s→55s · T-drill −0.4s · 5-loikka +50cm · Ponnauttelu +10/min.

---

## Tehtävälista — sprinteittäin

**Sprint 1–2 (nyt):** Lataa Seura.html + VP v18 + harjoitelogiikka_v3 GitHubiin. Aktivoi Cloud Scheduler API. Integroi PIN + harjoitelogiikka v3 Pelaaja v1:een. Streak + XP Firestoreen (nyt localStoragessa). Valmentajan päivän tehtävä → Firestore. videoBank Firestoreen.

**Sprint 3–5:** Harjoitekirjauksen Firestore-rakenne. Valmentajan kenttähavainto → Firestore (tärkein puuttuva valmentajaominaisuus). IDP-aktivointilogiikka. Kartoitukset-välilehti Master v9:ään.

**Sprint 6–8 (kun dataa 2–4 viikkoa):** AI Behavioural Science -agentti.

---

## Deploy-workflow

GitHub Actions, `deploy_functions.yml` (kolme valintaa: `functions`, `rules`, `kaikki`). Rules-deploy saa 403-virheen — käytä Firebase-konsolia suoraan. `tasoHaeMaatcheck` kommentoitu pois kunnes Cloud Scheduler Admin lisätty SA:lle.

---

## Kriittiset periaatteet (EI muuteta koskaan)

1. Super Admin `dqUzvJA61Wb9fgj5UiK0riSA4NI2` — pääsy kaikkialle aina
2. S-harjoite = AINA heikoin ketju, ei profiiliin
3. T-harjoite = joka päivä, myös lepopäivät
4. PHV ohittaa Stagen
5. 70/30 koskee alkurutiinia — kenttäharjoitus on valmentajan
6. `super_admin` (underscore) canonical — `normalizeRooli()` hoitaa vanhat
7. Firestore Rules: `allow create` JA `allow update`
8. Älä testaa VP-dashboardia ja Admin-näkymää samassa selainistunnossa
9. GitHub Pages Fastly CDN — `?v=N` cache-busting jokaisen latauksen jälkeen
10. `onAuthStateChanged`-loop estetty `_kirjautuminenKesken`-flagilla
11. `onSnapshot`-kuuntelijat siivottava ennen `signOut()`-kutsua

---

## Bisnesmalli

Kiinteä seuralisenssi 200–400€/kausi (MRR) + per-pelaaja raportti + klinikka kertamaksuna. Paketit: Perustaso / Kehitystaso / Huipputaso. Palloliiton Kori-taso korreloi TalentMaster-tason kanssa — myyntiargumentti.
