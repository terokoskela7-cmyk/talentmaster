# TalentMaster™ — Master Session Summary
# Briefingi uusia Claude-sessioita varten
## Projektin tila (päivitetty 2026-04-13)

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

## Sivuarkkitehtuuri (2026-04-13)

### Seurajärjestelmä
| Sivu | Tiedosto | Rooli | Tila |
|---|---|---|---|
| Valmennuspäällikkö | `TalentMaster_VP_v18.html` | vp | ✅ tuotannossa |
| Urheilutoimenjohtaja | `TalentMaster_UTJ_v2.html` | urheilutoimenjohtaja | ✅ tuotannossa (v2 korvaa v1) |
| Valmentaja | `TalentMaster_Master_v9.html` | valmentaja | ✅ tuotannossa |
| Seurahallinta | `TalentMaster_Seura.html` | seurasihteeri/utj/vp | ✅ tuotannossa |
| Vanhempi | `TalentMaster_Vanhempi.html` | huoltaja | ✅ tuotannossa |
| Pelaaja | `TalentMaster_Pelaaja_v1.html` | pelaaja | ✅ ⚠ lag-bugi |
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

### Myynti- ja esitystiedostot (GitHubissa 2026-04-13)
| Tiedosto | Kuvaus | Tila |
|---|---|---|
| `tm_pitch_en.html` | Englanninkielinen pitch — U8→Pro, 5D Framework, 10 osiota | ✅ GitHubissa |
| `tm_pitch.html` | Suomenkielinen pitch | ✅ GitHubissa |
| `tm_brand.html` | Brändikirja: logo, värit, typografia, komponentit | ✅ GitHubissa |
| `TalentMaster_Palloliitto_2026.pptx` | 9-dia PowerPoint Palloliiton palaveriin | ✅ GitHubissa |
| `TalentMaster_UTJ_v2.html` | UTJ-dashboard v2: DNA-välilehti, CSI, AI-signaali | ✅ GitHubissa |
| `tm_dna_builder.html` | DNA-rakennustyökalu | ✅ GitHubissa |
| `tm_dna_opas.html` | DNA-opas | ✅ GitHubissa |
| `tm_filosofia_kirjasto.html` | Filosofiakirjasto | ✅ GitHubissa |
| `eps_unified_v2.html` | EPS-dashboard vaalea teema, 7 välilehteä | ✅ GitHubissa |
| `hammarby_talentmaster_analyysi_1.html` | Strateginen analyysi Hammarby × TalentMaster | ✅ GitHubissa |
| `talentmaster_player_demo_1.html` | 3 perspektiiviä: Pelaaja/Valmentaja/SD | ✅ GitHubissa |

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

## Pilottiseurat (9 kpl) — tila 2026-04-13
| SeuraId | Seura | Tila | Huomio |
|---|---|---|---|
| `fcl` | FC Lahti Juniorit | ✅ tunnukset | — |
| `kpv` | KPV Kokkola | ✅ tunnukset | Testipelaaja TM-MN67OLDO |
| `palloiirot` | Pallo-Iirot | ✅ tunnukset | — |
| `yvies` | Ylöjärven Ilves | ✅ tunnukset | — |
| `sjk` | SJK Juniorit | ✅ **laajennettu** | U15P+U14/15T+talentit, **1. tyttöjoukkue** |
| `grifk` | GrIFK | ✅ tunnukset | sv-kieli |
| `vifk` | VIFK | ✅ tunnukset | sv-kieli |
| `hjk` | HJK Juniorit | ✅ tunnukset | — |
| `eps` | EPS (Espoon Palloseura) | ✅ tunnukset | Heini, Teams-puhelu PENDING |
| `demo` | FC Demo | ✅ testikäyttö | Super Admin |

**Kaikilla seuroilla:** tunnukset luotu, testidataa ei vielä Firestoressä.
Kriittisin pullonkaula: Excel → Firestore tuontityökalu puuttuu.

---

## Brändi-identiteetti (lukittu)
- `--carbon: #1C1C1A` · `--bone: #F2EFE6` · `--teal: #1A7A5E` · `--slate: #8C8B83`
- Fontit: **Cormorant Garamond** (display/otsikot) + **DM Sans** (body/UI)
- Logo: kehä-SVG (3 kehää + teal-piste + pystyviiva)
- **Non-Negotiables:** Barlow Condensed poistettu kaikista tiedostoista

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

---

## Avoimet bugit (2026-04-13)
| Bugi | Tiedosto | Prioriteetti |
|---|---|---|
| Pelaaja-sivu lagaa / ei toimi | TalentMaster_Pelaaja_v1.html | 🔴 Korkea |
| Fiilinki-kysely väärä U13-vaiheessa | TalentMaster_Pelaaja_v1.html | 🟡 Keski |
| joukkueNimi tallentuu ID:nä | Rekisterointi_Suostumus.html | 🟡 Keski |
| SPF/DKIM puuttuu — roskapostiin | Cloud Functions / Gmail | 🔴 Korkea |
| VP-dashboard delta/trendit puuttuu | TalentMaster_VP_v18.html | 🟡 Keski |

---

## Seuraavaan sessioon (tärkeysjärjestyksessä)
1. 🔴 Pelaaja-sivu lag-bugi — tutkimatta
2. 🔴 SPF/DKIM — sähköpostit roskapostiin
3. 🔴 SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
4. 🔴 Teams-puhelu Heinille (EPS) — 16 kysymystä valmiina
5. 🟡 Excel → Firestore tuontityökalu
6. 🟡 Pelihavainto Taso 1 (TIPS-lomake Master-näkymässä)
7. 🟡 Tyttöjen PHV-kaava (ennen U14/15T-aktivointia)
8. 🟡 Fiilinki ikävaihekysely-bugi
9. 🟡 "Why"-lause harjoitekortteihin (`harjoitelogiikka_v4.js`)
10. 🟡 Solo Firebase-integraatio (players-kokoelma)
11. 🟡 Player Care -moduuli (Hammarby/FCN-oppiminen)
12. 🟢 Hammarby-yhteydenotto (Magnus Bodsgård, ruotsiksi)
13. 🟢 FCN-yhteydenotto (Lasse Ishøi, tutkimuskysymys)
14. 🟢 Streak-historia Firestoreen (nyt localStoragessa)

---

---

## HAMMARBY × TALENTMASTER — SIMULAATIO (2026-04-13)

### hammarby_simulation.html — GitHubissa
Interaktiivinen demonstraatiosivu: 5 pilaria rinnakkain, Hammarby vs. TalentMaster.
Käytetään sisäiseen valmisteluun ennen Magnus Bodsgård -yhteydenottoa.

**Viisi pilaria:**
| Pilari | Hammarby | TalentMaster | Tila |
|---|---|---|---|
| Style of Play | 41-sivuinen PDF, manuaalinen | DNA Builder + 5 sakara | ✅ Rakennettu |
| Role Profile | Positiokohtaiset KPI:t, intuitio | 5D + OVR + RAE-korjaus | ✅ Rakennettu |
| IDP 3 tasoa | Kokous / harjoitukset / Player Care | IDP Card + TIPS + Player Care | 2/3 ✅ |
| Transition | Kuukausittainen Excel, AHA-palaverit | Live Transition View | 🔨 Sprint 5 |
| Team Training | Harjoitussuunnitelma + havainnointi | Training ADAR + DVI-trendi | 🔨 Sprint 5 |

### Hammarbyn analyysi → omat kehitysprioriteetit

**Sprint 5 — Hammarbyn gap:eista johdetut lisäykset:**
1. **Training ADAR** — `tyyppi: 'harjoitus'|'ottelu'` → harjoitushavainto käyttöön
2. **Player Care -loki** — "Käyty — pvm" valmentajan näkymässä, 21pv hälytys
3. **Live Transition View** — UTJ_v2 + readiness score (FLEI + DVI + DNA-vastaavuus)
4. **Weekly focus** — "Tämän viikon fokus" pelaaja/vanhempi-näkymässä, kytketty IDP:hen

**Sprint 6 — Strategiset lisäykset:**
5. **Result KPI:t** — "montako siirtyi ylemmälle tasolle / sai sopimuksen"
6. **Phase-based KPI library** — Foundation/Learning/Developing/Transition (Hammarbyn faasimalli)

### Hammarbyn lähestymisstratategia
- **Ei myyntipitch** — tunnistava kysymys: "Haluaisimme oppia"
- **Demo heidän systeemistään** — "Miten teidän kuukausittainen siirtymädokumentti toimii?"
- **Pilotti yhdelle joukkueelle** — yksi kausi, selkeä mittari
- **Kontakti:** Magnus Bodsgård · magnus.bodsgard@hammarbyungdom.se · +46 702 095 474
- **Kriittinen havainto:** Hammarby ei ole asiakas — he ovat referenssi

---

## Tekniset vakiot
- Firebase: `talentmaster-pilot` / `europe-west1`
- Super Admin: `talentmasterid@gmail.com` / `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
- GitHub: `terokoskela7-cmyk.github.io/talentmaster/`
- Tuorein VP: `TalentMaster_VP_v18.html`
- Tuorein Valmentaja: `TalentMaster_Master_v9.html`
- Tuorein UTJ: `TalentMaster_UTJ_v2.html`
- Tuorein pitch: `tm_pitch_en.html` (englanti) / `tm_pitch.html` (suomi)
- Palloliiton Power BI: https://app.powerbi.com/view?r=eyJrIjoiOWZhZGExZTMtODRhMC00NmI1LTk2N2QtNGU5OThkNjg2Mjk1IiwidCI6IjQ2OTM4YzQyLTk2MDgtNDU4ZC1iMjVlLTg3MTMzNjJhOTk5MSIsImMiOjh9
