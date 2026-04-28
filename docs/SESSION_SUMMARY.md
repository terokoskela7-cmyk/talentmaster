[SESSION_SUMMARY.md](https://github.com/user-attachments/files/27151266/SESSION_SUMMARY.md)
# TalentMaster™ — Master Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-19)
TalentMaster on jalkapallon talenttiarviointialusta — 8 pilottiseuraa + EPS (tulossa), Firebase Blaze.
Kehitys etenee kahdella rinnakkaisella haaralla:
1. **Seurajärjestelmä** (VP/Valmentaja/Pelaaja) — tuotannossa
2. **Solo-versio** (TalentMaster Player™) — uusi tuotehaarake, rakennettu 2026-04-10
**Palloliiton palaveri 2026-04-13:** Fyysisen suorituskyvyn johtaja.
Esitysmateriaali: `tm_pitch_en.html` + `TalentMaster_Palloliitto_2026.pptx`

---
## GitHub-repositorio
```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

---
## Sivuarkkitehtuuri (2026-04-19)
### Seurajärjestelmä
| Sivu | Tiedosto | Rooli | Tila |
|---|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp | ✅ tuotannossa |
| Urheilutoimenjohtaja | `TalentMaster_UTJ_v2.html` | urheilutoimenjohtaja | ✅ tuotannossa |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja | ✅ tuotannossa |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri/utj/vp | ✅ tuotannossa |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja | ✅ tuotannossa |
| Pelaaja | `TalentMaster_Pelaaja_v3.html` | pelaaja | ✅ **v3 käytössä** — Guardian 100% |
| IDP-kortti | `TalentMaster_IDP_Kortti_v3.html` | valmentaja/pelaaja/vanhempi | ✅ tuotannossa |
| Suostumuslomake | `TalentMaster_Rekisterointi_Suostumus.html` | huoltaja | ✅ tuotannossa |
| Keräilykortit | `TalentMaster_Kortit.html` | pelaaja | ✅ tuotannossa |
| Admin | `TalentMaster_Admin.html` | super_admin | ✅ tuotannossa |
| ADAR-koulutus | `TalentMaster_ADAR_Koulutus.html` | valmentaja | ✅ tuotannossa |
| Markkinointi | `TalentMaster_Koukutus.html` | — | ⏳ PENDING |
| Coaching tool | `TalentMaster_Valmentaja_Matriisi.html` | valmentaja | ✅ GitHubissa |
| Pelihavainto demo | `TalentMaster_Pelihavainto_Demo.html` | demo | ⚠ EI GitHubissa |

### Solo-versio — TalentMaster Player™
| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `TalentMaster_Player_Home.html` | Onboarding: splash → nimi → syntymäaika → kortti | ✅ GitHubissa |
| `TalentMaster_Solo_Profiili.html` | Profiili: tekniikkakilpailu, kotimittarit, fyysinen | ✅ GitHubissa |
| `TalentMaster_Solo_Arviointi.html` | Alkuarviointi 3-kerrosta | ⏳ PENDING |
| `TalentMaster_Kortti_Demo.html` | Korttityypit: Starter/Sharp/Elite | ✅ GitHubissa |

### Myynti- ja esitystiedostot (GitHubissa)
| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `tm_pitch_en.html` | Englanninkielinen pitch — U8→Pro, 5D Framework, 10 osiota | ✅ GitHubissa |
| `tm_pitch.html` | Suomenkielinen pitch | ✅ GitHubissa |
| `tm_brand.html` | Brändikirja: logo, värit, typografia, komponentit | ✅ GitHubissa |
| `TalentMaster_Palloliitto_2026.pptx` | 9-dia PowerPoint Palloliiton palaveriin | ✅ GitHubissa |
| `TalentMaster_UTJ_v2.html` | UTJ-dashboard v2: DNA-välilehti, CSI, AI-signaali | ✅ GitHubissa |

---
## TalentMaster 5D Framework™
| Dimensio | Paino | Mittarit |
|---|---|---|
| D1 Physical | **40%** | Sprint · PHV (Mirwald 2002) · FLEI · MAS test · COD |
| D2 Technical | **25%** | First touch · passing · technique competitions · daily T-drill |
| D3 Psychological | **15%** | Growth mindset · FLEI trainability · Dweck 2006 |
| D4 Cognitive | **10%** | ADAR · space reading · Game IQ |
| D5 Social | **10%** | SDT (Deci & Ryan) · coachability · team role |

**OVR-kaava:** `(D1×0.40)+(D2×0.25)+(D3×0.15)+(D4×0.10)+(D5×0.10)`
**RAE-korjaus:** Q1 ×0.92 / Q2 ×0.96 / Q3 ×1.02 / Q4 ×1.06
**DVI (Development Velocity Index):** Kuka kehittyy nopeammin kuin normit ennustavat

---
## Firebase
- **Projekti:** `talentmaster-pilot` (Blaze)
- **Firestore:** `eur3` multi-region
- **Auth:** Email/Password + Custom Claims
- **Functions:** `europe-west1`, 7 kpl
- **Sähköposti:** Nodemailer + Gmail

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
**Super Admin:** `talentmasterid@gmail.com` / UID: `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
**Tunnistus:** `adminSnap.exists` — EI custom claims -arvoista

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
- **pelaajaId:** `m93GBdOaGCUuenMiCL0I` / lyhyt: `TM-MN67OLDO`
- **URL:** `?pelaajaId=m93GBdOaGCUuenMiCL0I&seuraId=kpv`

---
## Cloud Functions — 7 deployattu (europe-west1)
| Funktio | Kuvaus | Tila |
|---|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle | ✅ |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki | ✅ |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu | ✅ |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä | ✅ |
| `lahetaPelaajaSivuLinkki` | Linkit + salasananollaus | ✅ |
| `tasoHaeSeuranOttelut` | Ottelut TASO API:sta | ✅ |
| `tasoHaeMaatcheck` | TASO cron klo 06:00 | ❌ KOMMENTOITU |

---
## Pilottiseurat (9 kpl) — tila 2026-04-19
| SeuraId | Seura | Tila | Huomio |
|---|---|---|---|
| `fcl` | FC Lahti Juniorit | ✅ tunnukset | — |
| `kpv` | KPV Kokkola | ✅ tunnukset | Testipelaaja TM-MN67OLDO |
| `palloiirot` | Pallo-Iirot | ✅ tunnukset | — |
| `yvies` | Ylöjärven Ilves | ✅ tunnukset | — |
| `sjk` | SJK Juniorit | ✅ **laajennettu** | U15P+U14/15T+talentit, 1. tyttöjoukkue |
| `grifk` | GrIFK | ✅ tunnukset | sv-kieli |
| `vifk` | VIFK | ✅ tunnukset | sv-kieli |
| `hjk` | HJK Juniorit | ✅ tunnukset | — |
| `eps` | EPS (Espoon Palloseura) | ✅ tunnukset | Heini, Teams-puhelu PENDING |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin |

**Kaikilla seuroilla:** tunnukset luotu, testidataa ei vielä Firestoressä.
Kriittisin pullonkaula: Excel → Firestore tuontityökalu puuttuu.

---
## Firestore Security Rules — tila 2026-04-19
**Versio:** Julkaistu Firebase Consolessa 2026-04-19 klo ~9:15 + päivitys huoltajafix ~17:00
**117 riviä** — täydellinen uudelleenkirjoitus

### Tässä sessiossa korjatut kriittiset bugit:
- `omatoimi_ohjelmat` — puuttui kokonaan, nyt suojattu oikein
- `onValmentaja()` + `onOmaPelaaja()` helper-funktiot lisätty
- `pelaajat` UPDATE: `seuraId`-validointi cross-tenant-eston lisäämiseksi
- `kirjaukset`: pelaajaId-guard — pelaaja kirjaa vain omalle tililleen
- `harjoitukset`: rajattu valmentaja-rooleihin (ennen: kaikki seuran jäsenet)
- `errors/`: lisätty error monitoring -kokoelma
- **HUOLTAJAFIX:** `resource.data.huoltajaEmail == request.auth.token.email`
  — vanhempi pääsee lukemaan lapsensa pelaajat/havainnot/tapahtumat
- `tapahtumat` read: avattu kaikille kirjautuneille

### Firestore-indeksit — tila 2026-04-19
| Kokoelma | Kentät | Status |
|---|---|---|
| havainnot | joukkue ASC · luotu DESC · __name__ | ✅ Enabled |
| kartoitukset | luseurald ASC · luotu DESC · __name__ | ✅ Enabled |
| kartoitukset | pelaajaId ASC · luotu DESC · __name__ | ✅ Enabled |
| pelaajat | joukkue ASC · sukunimi ASC · __name__ | ✅ Enabled |
| **pelaajat** | **seura ASC · joukkue ASC · __name__** | ✅ **Enabled — UUSI 2026-04-19** |
| tapahtumat | tyyppi ASC · pvm DESC · __name__ | ✅ Enabled |

---
## Pelaaja-sivu v3 — tila 2026-04-19
**Tiedosto:** `TalentMaster_Pelaaja_v3.html` (v1 korvattu, lag-bugi historiaa)
**Guardian:** ✅ 44/44 — 100%

### Tässä sessiossa lisätyt ominaisuudet:
- Bottom nav: position fixed, ⚡Tänään/📅Viikko/👤Minä/📈Kehitys
- `_tmOdotaHarjoitelogiikka()` — R2 latausjärjestys-guard (pollaa 150ms, max 3s)
- `_tmNaytaFirestoreVirhe()` — R4 UI error state (toast + 📡 fallback-kortti)
- `_cacheAseta()` / `_cacheLue()` / `_haeSeuraCached()` — sessionStorage-cache
  → seurat-kutsut 15/sessio → 1/sessio, säästö ~40% Firestore-luvuista
- `window.onerror → Firestore errors/` — error monitoring tuotannossa
- `_suodataStreakViesti()` tyyppiturvaus (null/undefined/numero)
- `harjoitelogiikka_v4.js` defer-attribuutti
- Patch duplikaattisuoja (`_tmPatchDone`)
- Catch-blokit: kaikki tyhjät korjattu

---
## Vanhempi-sivu — tila 2026-04-19
**Tiedosto:** `TalentMaster_Vanhempi.html`
**Guardian:** ✅ 46/46 — 100%

### Kirjautumisbugi — korjattu (Rules-puoli, 2026-04-19)
**Ongelma:** Huoltaja sai "Tiliä ei löydy" vaikka Auth-kirjautuminen onnistui.
**Juurisyy:** Uudet Rules vaativat `onSeuranJasen(seuraId)` mutta huoltajalla
ei ole `seuraId` Custom Claimia — Firestore hylkäsi `pelaajat`-kyselyt.
**Korjaus:** `resource.data.huoltajaEmail == request.auth.token.email` lisätty
`pelaajat`, `havainnot`, ja `tapahtumat` read-sääntöihin.
**Status:** Rules julkaistu — testaamatta oikealla huoltajatilillä.

---
## TM Guardian — runtime-tarkastusjärjestelmä
**Tiedosto:** `/home/claude/tm_ci/guardian.js` (62 staattista tarkistusta)
**Runtime-tarkastus:** JavaScript-tarkistukset suoraan selaimessa Chrome MCP:llä

| Sivu | Kategoriat | Tulos |
|---|---|---|
| Pelaaja v3 | Värit·Nav·Näkymä·Funktiot·Firebase·Harjoitelogiikka·Cache·Monitoring·Tyyppiturvaus | ✅ 44/44 — 100% |
| Vanhempi | Värit·Näkymät·Login·Funktiot·Firebase·Kirjautumislogiikka·AI Chat·Monikielisyys | ✅ 46/46 — 100% |

---
## Skaalaus — 2000 pelaajan valmius
### Live-mittaus (2026-04-19):
- Firestore reads/sessio: **36** (ennen cache), **~22** (cachen jälkeen)
- 2000 pelaajaa × 3 sessiota/pv = **216 000 reads/pv** → **$3.89/kk**
- harjoitelogiikka_v4.js: 38 KB, cache-control max-age=600 (PENDING: versioitu nimi)

### Tehty:
- Composite-indeksi `pelaajat: seura + joukkue` → Enabled
- SessionStorage-cache → ~40% reads vähenevät
- Error monitoring → tuotantovirheet näkyvissä Firebase Consolessa

### Vielä tehtävä (ennen 1000 pelaajaa):
- harjoitelogiikka_v4.js: versioitu tiedostonimi → ikuinen cache (max-age=600 nyt)

---
## JavaScript-kirjastot (GitHubissa)
| Kirjasto | Kuvaus | Tila |
|---|---|---|
| `harjoitelogiikka_v4.js` | leikkija/rakentaja/showcase, DIAG, Stage 1–5 | ✅ |
| `hpp_rehab_protokollat.js` | 25 kuntoutusprotokollaa | ✅ |
| `tm_testipankki.js` | 64 testiä, 8 protokollaa, FLEI (5 ketjua) | ✅ |
| `tm_ketju_matriisi.js` | fascia ↔ testi ↔ pallotekniikka | ✅ |
| `tm_lang.js` | fi/sv/en, 144 käännöstä | ✅ |
| `tm_import.js`, `tm_empty_state.js` | Import + tyhjä tila | ✅ |
| `tm_bioika.js` | Biologinen ikä, Mirwald 2002 | ✅ |

---
## FLEI — 5 ketjua (pysyvä, Wilke 2016)
| Ketju | Avain | Emoji |
|---|---|---|
| Vauhtiketju | `sbl` | ⚡ |
| Lähtöketju | `sfl` | 🦵 |
| Sivuketju | `ll` | ↔️ |
| Kiertoketju | `diag` | 🔄 |
| Hallintaketju | `dfl` | 🏗️ |

Firestore: `flei_ketjut: {SBL, SFL, LL, DIAG, DFL}` (isolla)

---
## Brändi-identiteetti (lukittu)
- `--carbon: #1C1C1A` · `--bone: #F2EFE6` · `--teal: #1A7A5E` · `--slate: #8C8B83`
- Pelaaja-sivu: `--bg:#111110` · `--bg2:#161614` · `--teal:#1A7A5E` · `--text:#F2EFE6`
- Fontit: **Cormorant Garamond** (display/otsikot) + **DM Sans** (body/UI)
- Logo: kehä-SVG (3 kehää + teal-piste + pystyviiva)
- **Non-Negotiables:** Barlow Condensed poistettu kaikista tiedostoista

---
## Kriittiset periaatteet (EI muuteta koskaan)
1. Super Admin `dqUzvJA61Wb9fgj5UiK0riSA4NI2` — pääsy kaikkialle aina
2. S-harjoite = heikoin ketju, ei profiiliin
3. T-harjoite = joka päivä, myös lepopäivät
4. PHV ohittaa Stagen (max Stage 2 kun PH)
5. 70/30: joukkueen alkurutiini JA pelaajan omatoimiohjelma
6. FLEI = 5 ketjua pysyvästi (SBL/SFL/LL/DIAG/DFL)
7. `diag` canonical — `sl`/`fl` poistunut
8. `super_admin` underscore canonical
9. Firestore Rules: `allow create` JA `allow update`
10. Ei VP + Admin samassa selainistunnossa
11. CDN: `?v=N` + tarkista raw.githubusercontent.com ensin
12. `onAuthStateChanged` loop: `_kirjautuminenKesken`-flag
13. `onSnapshot`: siivoa `tm:logout` + 50ms
14. `setCustomUserClaims` pakollinen `luoKayttaja`:ssa
15. `_pelaaja` on `let` — EI `window._pelaaja`
16. `harjoitelogiikka_v4.js` ennen pääscriptejä
17. YouTube: `embed/{ID}?rel=0`
18. Fiilinki-lukitus: `fiilinki_paivitettu` ennen renderöintiä
19. Super admin: `adminSnap.exists`
20. `huoltajaEmail` aina `.toLowerCase()`
21. Firebase Functions: AINA `firebase.app().functions('europe-west1')`
22. `testitapahtumat` oikea kokoelmanimi (EI `tapahtumat`)
23. `_avaaValmentajaPopup` GLOBAALI — EI nested
24. `nimiToUid`: UID-mismatch mentoroinnit ↔ kayttajat
25. `joukkueNimi`: display name, ei ID (bugi auki)
26. Solo-pelaajat: `players/{id}` (ei seurahierarkiassa) — `seuraId: null`
27. Chart.js: AINA `Chart.getChart()` + destroy + redraw, EI `_init` guard
28. Chart.js `display:none`-näyttö: `setTimeout(50–100ms)` ennen init-kutsua
29. Syntymäpäivä: `Date.UTC(y,m-1,d)` — EI `new Date(string)`
30. Näkymien vaihto: `style.display` EI `classList`
31. `openpyxl` pakollinen Excel-tyyleille
32. Suostumuslomake: kutsuflow=`.update()`, uusi=`.set()`
33. Testaus AINA GitHub Pages URL:lla — `file://` estää Firebase
34. **UUSI 2026-04-19:** Huoltajan luku: `resource.data.huoltajaEmail == request.auth.token.email`
35. **UUSI 2026-04-19:** SessionStorage cache TTL 30min — `_cacheAseta` / `_cacheLue`
36. **UUSI 2026-04-19:** Pelaaja-sivu: `_tmOdotaHarjoitelogiikka()` guard ennen harjoitekutsuja

---
## Avoimet bugit (2026-04-19)
| Bugi | Tiedosto | Prioriteetti | Huomio |
|---|---|---|---|
| ~~Pelaaja-sivu lagaa~~ | ~~TalentMaster_Pelaaja_v1.html~~ | — | **Korvattu v3:lla, lag poistunut** |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v3.html | 🟡 Keski | Ei katsottu |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 Keski | — |
| SPF/DKIM puuttuu — roskapostiin | Cloud Functions / Gmail | 🔴 Korkea | — |
| VP-dashboard delta/trendit puuttuu | TalentMaster_VP_v18.html | 🟡 Keski | — |
| Huoltajan kirjautuminen — testaamatta | TalentMaster_Vanhempi.html | 🔴 Korkea | Rules OK, ei vahvistettu |

---
## Seuraavaan sessioon (tärkeysjärjestyksessä)
1. 🔴 **Testaa huoltajan kirjautuminen** oikealla tilillä — Rules ok mutta testaamatta
2. 🔴 **SPF/DKIM** — sähköpostit roskapostiin
3. 🔴 **SJK-käyttöönotto**: VP-tunnukset + joukkueet + pelaajat
4. 🔴 **Teams-puhelu Heinille** (EPS) — 16 kysymystä valmiina
5. 🟡 **Excel → Firestore tuontityökalu** — kriittisin pullonkaula pilotille
6. 🟡 **Pelihavainto Taso 1** (TIPS-lomake Master-näkymässä)
7. 🟡 **Tyttöjen PHV-kaava** (ennen U14/15T-aktivointia)
8. 🟡 **Fiilinki ikävaihekysely-bugi** (U13 leikkija-kieli)
9. 🟡 **harjoitelogiikka_v4.js versioitu tiedostonimi** (cache max-age → ikuinen)
10. 🟡 **"Why"-lause harjoitekortteihin** (`harjoitelogiikka_v4.js`)
11. 🟡 **Solo Firebase-integraatio** (players-kokoelma)
12. 🟡 **Player Care -moduuli** (Hammarby/FCN-oppiminen)
13. 🟢 **Hammarby-yhteydenotto** (Magnus Bodsgård, ruotsiksi)
14. 🟢 **FCN-yhteydenotto** (Lasse Ishøi, tutkimuskysymys)
15. 🟢 **Streak-historia Firestoreen** (nyt localStoragessa)

---
## HAMMARBY × TALENTMASTER — SIMULAATIO
### hammarby_simulation.html — GitHubissa
**Viisi pilaria:**
| Pilari | Hammarby | TalentMaster | Tila |
|---|---|---|---|
| Style of Play | 41-sivuinen PDF, manuaalinen | DNA Builder + 5 sakara | ✅ Rakennettu |
| Role Profile | Positiokohtaiset KPI:t, intuitio | 5D + OVR + RAE-korjaus | ✅ Rakennettu |
| IDP 3 tasoa | Kokous / harjoitukset / Player Care | IDP Card + TIPS + Player Care | 2/3 ✅ |
| Transition | Kuukausittainen Excel, AHA-palaverit | Live Transition View | 🔨 Sprint 5 |
| Team Training | Harjoitussuunnitelma + havainnointi | Training ADAR + DVI-trendi | 🔨 Sprint 5 |

**Sprint 5:** Training ADAR · Player Care -loki · Live Transition View · Weekly focus
**Sprint 6:** Result KPI:t · Phase-based KPI library
**Kontakti:** Magnus Bodsgård · magnus.bodsgard@hammarbyungdom.se · +46 702 095 474

---
## Tekniset vakiot
- Firebase: `talentmaster-pilot` / `europe-west1`
- Super Admin: `talentmasterid@gmail.com` / `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
- GitHub: `terokoskela7-cmyk.github.io/talentmaster/`
- Tuorein Pelaaja: `TalentMaster_Pelaaja_v3.html`
- Tuorein VP: `TalentMaster_VP_v18.html`
- Tuorein Valmentaja: `TalentMaster_Master_v9.html`
- Tuorein UTJ: `TalentMaster_UTJ_v2.html`
- Tuorein pitch: `tm_pitch_en.html` (englanti) / `tm_pitch.html` (suomi)
- Palloliiton Power BI: https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9

---
## Sessio 2026-04-19 (ilta) — lisäykset

### Security Rules — KRIITTINEN KORJAUS
**Ongelma löydetty:** Super Admin ei päässyt VP-sivulle.
**Juurisyy:** `onSuperAdmin()` tarkisti vain `token.rooli == 'super_admin'` mutta:
- VP_v18 asettaa `_rooli = 'superadmin'` (yhteen, ei underscoreä)
- Pelaaja/Vanhempi käyttää `claims.super_admin || claims.superAdmin`
- Custom Claimeja ei välttämättä asetettu

**Korjaus:** `onSuperAdmin()` hyväksyy nyt 4 tapaa:
```javascript
function onSuperAdmin() {
  return onKirjautunut() && (
    request.auth.token.rooli == 'super_admin' ||
    request.auth.token.rooli == 'superadmin' ||
    request.auth.token.super_admin == true ||
    exists(/databases/$(database)/documents/admins/$(request.auth.uid))
  );
}
```
**Tiedosto:** `/mnt/user-data/outputs/firestore.rules` — LADATTAVA GitHubiin + julkaistavaksi Firebase Consolessa.

**Lisäykset Rules:iin:** `hh_tulokset/`, `tekniikkatulokset/`, `testitapahtumat/`, catch-all `/{alikokoelma}/{docId}` seuran alla.

---
### Testidatan tuontipohja v4 — VALMIS
**Tiedosto:** `TM_Testidatan_Tuontipohja_v4.xlsx` (88 KB, 9 välilehteä)
**Guardian:** 63/63 — 100%

**Välilehdet:**
- `1_Pelaajat` — PalloID + Testipäivämäärä pakolliset
- `2_HH_Testit` — nopeus 3 yritystä (5m/10m/30m samasta juoksusta), SJ 3 yrit, CMJ 3 yrit
- `3a_Harjoitettavuus_U10-12` — 9 testiä, max 27p (Palloliiton 2026 manuaali)
- `3b_Harjoitettavuus_U13-15` — 10 testiä, max 30p
- `3c_Harjoitettavuus_U15-19` — 13 testiä 5RM kuormitustestit, max 39p
- `4a_Tekniikka_P-T13-12` — 5 lajia + pituuspotku, merkkirajat automaattinen
- `4b_Tekniikka_P-T11-9` — 4 lajia
- `4c_Tekniikka_P-T8` — 4 lajia, ponnauttelu vain jaloin, maali 5.5m

**Tekniikkakilpailun laskentalogiikka:**
- Kokonaistulos = parhaiden aikojen SUMMA (pienempi = parempi)
- Ponnauttelu-ohjesarake vaihtelee automaattisesti ikäluokan mukaan
- Kuljetus-laukaus: tarkkuusvähennykset −5/−2/−3/−1, ylilaukaus +10s
- Pituuspotku: 5m=1s aikabonus, max −20s
- Merkki per ikäluokka (12 eri rajaa)

---
### Dataflow-arkkitehtuuripäätökset (pysyvät)
1. **PalloID** = universaali pelaaja-ankkuri (Palloliiton pysyvä tunniste)
2. **Testipäivämäärä** = pakollinen linkki pelaaja+data+ajankohta
3. **tapahtumaId** = valinnainen (null ok historiassa)
4. Raakadata litteässä kokoelmassa `kartoitukset/` palloID+pvm indeksoituna
5. Historia: `where('palloID','==',id).orderBy('pvm','asc')`
6. Excel-tuonti: `lahde:'excel_tuonti'`, `tapahtumaId:null`

---
### TalentMaster Project Agent v2
- Rakennettu claude.ai Artifact -muotoon (toimii tässä chatissa)
- CORS-ongelma: GitHub Pages ei voi kutsua Anthropic API:a suoraan
- Ratkaisu: Käytä tätä claude.ai-projektia — se on se agentti
- Firebase Cloud Function proxy mahdollistaa käytön myös GitHubista (Sprint 5+)

---
### Seuraavaan sessioon (PRIORISOITU)
1. 🔴 Testaa Security Rules — kirjaudu super adminilla VP-sivulle
2. 🔴 Julkaise firestore.rules Firebase Consolessa
3. 🔴 KPV-datan tuonti Excelin v4 pohjalla
4. 🔴 Kenttätyökalun datavirta-fix: kirjoita `kartoitukset/` eikä `testitapahtumat/`
5. 🟡 SPF/DKIM DNS-korjaus (alle tunti, kriittinen sähköposteille)
6. 🟡 Tyttöjen PHV-kaava ennen SJK U14/15T-aktivointia
7. 🟡 Huoltajan kirjautuminen — testattava oikealla tilillä

---

## Sessio 2026-04-28 — Design Studio + Avoimet rajapinnat

### TalentMaster Design Studio
- Rakennettu: `TalentMaster_Studio.html` — AI-pohjainen suunnittelu+koodaustyökalu
- Kaksi agenttia: UX Advisor (300 tok) + Senior Coder (8000 tok) — erilliset API-kutsut
- 24 pikanapit: First Login Flows (4 roolia), Pelaajan näkymä, Testit & Indeksit, Valmentaja & Johto, UX-strategia
- Julkaisu: claude.ai Artifact (ei GitHub Pages — CORS-ongelma Anthropic API:n kanssa)
- Tunnettu ongelma: koodit voivat katketa jos komponentti on erittäin iso (8000 tok raja)

### Avoimet rajapinnat — pysyvä arkkitehtuuripäätös
**Periaate:** TalentMaster on avoin ekosysteemi — kaksi ohjelmaa voi "puhua" keskenään.

**Provider-agnostic AI (tm_ai.js):**
- Yksi abstraktiokerros: `TM_AI.call()` — ei suoraa Anthropic/OpenAI-kutsua UI:ssa
- Provider vaihdettavissa configista: 'anthropic' | 'openai' | 'gemini'
- Firebase Cloud Function = pakollinen AI-proxy (europe-west1) — API-avaimet ei selaimessa

**OpenAI-integraatiot (tuleva):**
- GPT-4o vision: valmentaja kuvaa → AI analysoi ADAR-kriteerit automaattisesti
- Whisper: äänikirjaus kentällä → teksti → Firestore
- Assistants API: pelaajan pitkäaikainen kehitysnarratiiivi (thread per pelaaja)

**UX-filosofia:**
- AI näkymätön kunnes relevantti — ei "AI-powered"-badgeja
- Käyttäjä ei tiedä mikä LLM taustalla — hän kokee vain tuloksen
- API-first: jokainen näkymä suunniteltu niin että data haettavissa myös ulkoa

### Seuraavaan sessioon
- Design Studio toimii — testaa komponentteja käytännössä
- AI-proxy Cloud Function rakentaminen kun Studio siirtyy GitHubiin
- Provider-agnostic tm_ai.js kirjoittaminen (Sprint 6 prep)
