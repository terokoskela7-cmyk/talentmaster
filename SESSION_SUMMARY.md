# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
# Päivitetty: 2026-05-12 (ilta)

---

## Projektin tila

TalentMaster on jalkapallon pelaajankehitysalusta (SaaS, multi-tenant). Firebase-backend
toimii Blaze-suunnitelmalla. Pilottiseurat aktiivisia, ~316 pelaajaa järjestelmässä.
Repositorio siivottu Claude Codella. Pelaajan app (v7) on läpikäynyt merkittävän
uudistuksen — se on nyt arkkitehtuurisesti puhdas, brand-periaatteiden mukainen, ja
sisältää Palloliiton liikuntaseurantalogiikan.

**Filosofia:** "Pelaaja ensin, hallinto vahvistaa."
**Kilpailupositiointi:** "Transfermarkt shows what. TalentMasterID shows how."
**Palloliiton myyntiargumentti:** "TalentMasterilla täytätte Palloliiton
liikuntaseurantavelvoitteen automaattisesti — ilman erillistä Excel-taulukkoa."

---

## GitHub

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

Deployment: manuaalinen tiedostolataus GitHub-webin kautta (palomuuri estää Git CLI).
CDN-cache: Fastly ~10 min. Testaa aina ?v=N.
Cloud Functions deploy: automaattinen kun functions/** muuttuu main-branchissa.
Rules-deploy: Firebase Console → Firestore → Rules → liitä → Julkaise (EI GitHub Actionsilla).

---

## Firebase

Projekti: talentmaster-pilot (Blaze). Tietokanta: Firestore eur3 multi-region.
Auth: Email/Password + Anonymous (PIN) + Google Sign-In (SA). Functions: europe-west1 AINA.

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

---

## Käyttäjät

SA: talentmasterid@gmail.com / UID: dqUzvJA61Wb9fgj5UiK0riSA4NI2 (Google Sign-In)
VP GrIFK: vp.grifk@talentmaster.fi / UID: lBCx0ivDYVWLmxD9TGKsvYrFrlo1
VP SJK: vp.sjk@talentmaster.fi / UID: 1eHyfKsuTSRAAsPu9kRZ22E4hwo2
VP Pallo-Iirot: vp.palloiirot@talentmaster.fi / UID: fBf1c60rjXTPxYlsV03EfrHZ2xM2

---

## Testipelaaja: Topias Koskela (KPV)

Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I — KAKSI u:ta!
PIN: 9278 / syntymaVuosi: 2013 / sukupuoli: "M"
huoltajaEmail: "TeroKoskela7@gmail.com" / flei_viimeisin: 62

---

## Pilottiseurojen tila (2026-05-12)

KPV: 34 ✅ | SJK: 40 ✅ | GrIFK: 162 ✅ (tuotu 2026-05-12) | Pallo-Iirot: 67 ✅
Demo: 13. Yhteensä ~316 pelaajaa.

---

## Kirjausrakenne Firestoressä (LUKITTU — päivitetty 2026-05-12)

```
pelaajat/{id}/kirjaukset/{pvm}   ← pvm = YYYY-MM-DD PAIKALLISELLA ajalla (_paivaIso)
  tyyppi:      'T'|'D'|'S'|'P'|'jalkapallo'|'muu_urheilu'|'lepo'
  tehty:       bool
  kesto_min:   number
  rpe:         number|null        ← null takautuvissa
  fiilinki:    number|null        ← null takautuvissa
  aika:        'ilta'|'aamu'|'paiva'|null
  lahde:       'manuaalinen'|'catapult'|'polar'|'taso'
  lahde_id:    string|null
  kirjaustapa: 'heti'|'jalkikateen'|'auto'    ← UUSI 2026-05-12
  takautuva:   {tyyppi, kesto_min, lisatty}   ← UUSI, vain jos doc oli jo olemassa
```

KRIITTINEN: Käytä _paivaIso(d) -helperia kaikkialle — EI toISOString().slice(0,10).
Syy: UTC-aikavirhe EET-vyöhykkeellä klo 22+ tallentaa väärän päivän.

---

## Tuotantotiedostot (kanoninen lista 2026-05-12)

TalentMaster_Seura.html ✅ linkit korjattu
TalentMaster_Admin.html ✅
TalentMaster_VP_v22.html ✅ mobiilituki + tm:logout
TalentMaster_Master_v16.html ✅
TalentMaster_ADAR_Pikakortti.html ✅
TalentMaster_Pelaaja_v7.html ✅ SUURI UUDISTUS 2026-05-12 (paikallisesti valmis, ei vielä GitHubissa)
TalentMaster_Vanhempi_v2.html ⚠️ kovakoodattu nimi (P3 auki)
TalentMaster_IDP_Kortti_v4.html ✅
TalentMaster_Rekisterointi_Suostumus.html ✅
TalentMaster_Testaus_v8.html ✅
TalentMaster_Excel_Tuonti.html ✅
TalentMaster_Harjoitettavuus_Lomake_v4.html ✅
functions/index.js ✅ deploattu 2026-05-12
tm_admin/firestore.rules ✅ v2.3 deploattu
tm_why_lauseet.js ✅ v1.3 D-lauseet positiivisiksi

archive/-kansiossa (ei käytössä): Master_v9*, v12, v15, VP_v19*, v20, v21,
Pelaaja_v3*, v4, v4_auth, Harjoitettavuus_Lomake, v3, IDP_Kortti_v3.
(* = edelleen live viittausten takia, arkistoidaan myöhemmin)

---

## Sessio 2026-05-12 — Mitä tehtiin

### Repositorion siivous (Claude Code)
9 HTML arkistoitu, 8 rikkinäistä linkkiä korjattu functions/index.js:ssä
(Master_v9→v16, VP→v22, Pelaaja_v1→v7, Vanhempi→v2). deploy_functions.yml
auto-trigger lisätty. VP_v22 mobiilituki + tm:logout. Deploattu onnistuneesti ✅.

### Security Rules v2.3
kehut-alikokoelma, onLapsenHuoltaja get()-kuvio, .lower()-vertailu.
Testattu live: ✅ huoltaja näkee Topiaksen, ✅ PIN toimii, ✅ tuntematon deny.

### GrIFK 162 pelaajaa tuotu
8 joukkuetta P7–P13, T11, T13. Excel-pohja generoitu Python+openpyxl:lla.

### Claude Code -asennus
Versio 2.1.138, C:\Users\TeroKoskela\.local\bin\claude.exe.
Claude Max + Opus 4.7 + 1M context. Git puuttuu (palomuuri) → Desktop ei toimi.
Projekti: C:\Users\TeroKoskela\talentmaster\talentmaster-main\

### Pelaajan app v7 — suuri uudistus (PAIKALLISESTI VALMIS, EI VIELÄ GITHUBISSA)

Vaihe 1 — Tekninen velka: P6-käynnistymisbugi korjattu (window._p7Pelaaja
PIN-callbackiin), kehut-alikokoelma Security Rulesiin, duplikaatti-P6 poistettu,
rCard() mockup poistettu → naytaFcOverlay(), 'KPV U13' → '—'.

Vaihe A — Siivous: Demo-napit gated, 'Anton' → '', 'P14·MUSTA' → '—',
"Muuta tänään" poistettu, FIFA-kortti dynaamiseksi, XP poistettu UI:sta.

Vaihe B1 — Bottom navigation: 3 tabia TÄNÄÄN/MINÄ/MEISTÄ, suomi-ID:t,
default aina 'tanaan', rMeista-stub.

70/30-rakenne: D-kortti iso (gradient-teal) → S-kortti pienempi → T-kortti
kevyin (dashed). Kaikki kirjaavat tyyppi D/S/T. XP Firestoreen mutta EI UI:hin.

Positiivinen psykologia: Streak 4 tilaa positiivisesti kehystettynä.
"✓ Tehty — hyvä työ, {etunimi}!" FIFA: "Kehittyy kohti huippua".
tm_why_lauseet.js v1.3: D-lauseet vahvuus-kehykseen (ei loss aversion).

Takautuva liikuntakirjaus + Palloliiton viikkologiikka:
_paivaIso() aikavyöhykekorjaus 5 paikkaan. kirjaustapa-kenttä.
Uudet tyypit: jalkapallo, muu_urheilu, lepo. takautuva-alikenttä konfliktistrategiana.
laskePalloliittoViikot() funktio. "+ Lisää mennyt päivä" modal.

### ADAR-tiedostojen analyysi
4 tiedostoa analysoitu — kaikki offline (localStorage, ei Firestore).
CoachProfile.html pisimmälle: sertifikaattitasot + RAE-kalibrointi valmiina.
Firebase-integraatio Sprint 4+.

### Dokumentit päivitetty
KOMMUNIKAATIOFLOW.md, TALENTTIOHJELMA_ARKKITEHTUURI.md (luvut 11-15 lisätty),
CLAUDE.md (integraatioarkkitehtuuri, brand-invariantit).

---

## Brand-invariantit (uudet 2026-05-12)

§17:28 — UI ei näytä XP-lukuja, progressbarsia eikä loss aversion -kieltä.
XP Firestoreen AI-agenttia varten, ei renderöidä. Streak positiivisesti
kehystettynä 4 tilassa. Peruste: Seligman PERMA + Deci & Ryan SDT.

§17:29 — _paivaIso(d) AINA päivämääriin. EI toISOString().slice(0,10).

§17:30 — kirjaustapa-kenttä pakollinen uusissa kirjauksissa.
takautuva-alikenttä konfliktistrategiana — ei ylikirjoita olemassa olevaa.

---

## Avoimet tehtävät prioriteettijärjestyksessä

### 🔴 VÄLITÖN — Push GitHubiin

Kaikki muutokset ovat paikallisella koneella. Vie GitHubiin:
1. TalentMaster_Pelaaja_v7.html (isoin muutos)
2. TalentMaster_VP_v22.html
3. TalentMaster_Seura.html
4. tm_why_lauseet.js (v1.3)
5. tm_admin/firestore.rules (v2.3)
6. CLAUDE.md (uudet invariantit)
7. functions/index.js
8. .github/workflows/deploy_functions.yml
9. archive/-kansio (9 tiedostoa)
10. docs/TALENTTIOHJELMA_ARKKITEHTUURI.md

Deployaa Security Rules v2.3 Firebase Consolesta manuaalisesti.

### 🔴 Sprint 2 — Minä-tabi + kriittiset bugit

Ensin korjattava kaksi bugia Pelaaja v7:ssä:
a) Streak-ristiriita: header "8 pv" mutta teksti "Aloita tänään" (streak==0).
   _pelaaja.streak on undefined — synkronoi _lataaCStreak:n tulos streak-viestiin.
b) S-kortti ei renderöidy DOM:ssa — vain D ja T näkyvät. Tarkista rA1():n
   S-kortin renderöintiehto.

Sen jälkeen rMina-laajennus kuudella aliosiolla:
rMinaProfiili (nimi, ikäluokka, pelipaikka, joukkue, PalloID),
rMinaFLEI (5 pylvästä, heikoin korostettuna),
rMinaStreak (streak + 30pv aktiivisuuskalenteri),
rMinaTestit (testitulokset Firestoresta),
rMinaKortti (FIFA-esikatselu + overlay-nappi),
rMinaAsetukset (kieli, logout, "Jaa linkki vanhemmalle").

Palloliitto-progress Minä-tabissa: laskePalloliittoViikot() on valmis,
tarvitaan vain UI joka näyttää X/20 viikkoa + deadline 31.12.2026.

Harjoitteen popup-ohjekortti: pelaaja napauttaa harjoitteen nimeä →
overlay jossa suomenkielinen nimi, mielikuva leikkijoille, toistot, kesto.
PANKKIin lisättävä: kesto_min, toistot, ohje_lyhyt, mielikuva.

Fiilinki ikäfaasikohtaiseksi:
leikkija: "Miltä tänään tuntuu?" + 3 emojia (😴🙂🤩)
rakentaja: "Miten keho tuntuu tänään?" + 5 emojia
showcase: "Valmius tänään?" + 5 + kuormitushallintateksti

### 🟡 Sprint 3

Meistä-tabi: joukkueen jäsenet, valmentajat, viestit, P6-havainnot, kalenteri.
Kaverihaaste (T-tyyppi, läsnäolohaaste — EI suoritushaaste).
Valmentajan asettama haaste.
Pelaajan omat tavoitteet (lyhyt/kausi/unelma). Firestore: pelaajat/{id}/tavoitteet/{id}.
P3 — Vanhemman app: where('huoltajaEmail','==',email) → oikea nimi.

Palloliiton liikuntaseurannan hallinta VP:lle:
seurat/{id}: palloliitto_seuranta: bool, palloliitto_malli: 'kevyt'|'vaativa'
pelaajat/{id}: palloliitto_seuranta: bool
VP aktivoi joukkuekohtaisesti Seura.html:ssä.
VP-dashboardissa joukkuekohtainen seurantaraportti.

TMBus → Firestore-bridge push-notifikaatioille (cross-device).

### 🟢 Sprint 4-5

TASO-kalenteri + pelidata, iCal-vienti, testidatan tuontirakenne.
GrIFKin taitokilpailutulokset 2025 Firestoreen.
Kausittainen raportti pelaajalle ja vanhemmalle.
ADAR Firebase-integraatio (CoachProfile → Firestore ensin).

### Sprint 6-8

AI-kehitysnarratiivi, Behavioural Science -agentti (vaatii 4vk dataa),
kehityshaaste talenttiohjelmaan, unelma-ankkuri.

---

## Arkkitehtuurin invariantit (kriittiset)

1. SA UID dqUzvJA61Wb9fgj5UiK0riSA4NI2 — Google Sign-In, tunnistus adminSnap.exists
2. Cloud Functions AINA europe-west1 eksplisiittisesti
3. super_admin (alaviiva) — ei superAdmin
4. FLEI = 5 ketjua: SBL, SFL, LL, DIAG, DFL. Normalisointi (arvo-1)/2×100
5. serverTimestamp() EI array:n sisällä → new Date().toISOString()
6. Firestore Rules: allow create JA allow update molemmat
7. testitapahtumat (EI tapahtumat)
8. Nested template literals → string concatenation (+) AINA
9. PIN login: await user.getIdToken(true) ennen Firestore-kirjoitusta
10. huoltajaEmail .lower()-vertailu Security Rulesissa AINA
11. functions/index.js → automaattinen deploy push:lla (functions/**)
12. tm_auth.js juuri = TmAuth.* (tuotanto). src/lib/ = TM.* (ei adoptoitu). ÄLÄ sekoita.
13. _paivaIso(d) AINA päivämääriin — ei toISOString().slice(0,10)
14. XP tallennetaan Firestoreen mutta EI renderöidä pelaajalle
15. Streak aina positiivisesti kehystettynä — ei loss aversion -kieltä
16. kirjaustapa-kenttä pakollinen uusissa kirjauksissa
17. takautuva-alikenttä konfliktistrategiana — ei ylikirjoita
18. Tapahtumat-skeema: seurat/{id}/tapahtumat/{id} (ei joukkueet/{id}/tapahtumat)
19. Kaverihaaste = aina T-tyyppi (läsnäolohaaste, ei suoritushaaste)
20. Palloliitto-seuranta tallentaa kirjaustapa-kentän — takautuvatkin lasketaan

---

## Claude Code -ohjeet

cd C:\Users\TeroKoskela\talentmaster\talentmaster-main
claude

Versio 2.1.138, Claude Max + Opus 4.7 + 1M context. CLAUDE.md luetaan automaattisesti.

---

## Aloita uusi sessio näin

Jatketaan TalentMaster-pilottia. SESSION_SUMMARY.md on liitetty.
Ensimmäinen tehtävä: [kirjoita tehtävä tähän]

Live:  https://terokoskela7-cmyk.github.io/talentmaster/
Admin: https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
SA:    talentmasterid@gmail.com (Google Sign-In)
PIN:   9278 (Topias Koskela, KPV)

Claude Code: cd C:\Users\TeroKoskela\talentmaster\talentmaster-main → claude
