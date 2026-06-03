# CLAUDE.md — TalentMaster™ Master Briefing

> Ensimmäinen tiedosto jonka liität uuteen Claude-sessioon. Keskittyy **teknisiin invariantteihin**.
> Strategia, RAE-tiede, kansainvälistyminen, bisnesmalli, sprintit ja avoimet tehtävät: **`docs/STRATEGIA.md`**.
> Operatiivinen roadmap-historia: `docs/ROADMAP.md`. Solo-tuotteen täysi kuvaus: `docs/ARKKITEHTUURI.md §11`.
> Viimeksi päivitetty: 2026-06-04 (+ §28 kehitysikkunat — signaloinnin biologinen perusta)

---

## 1. PROJEKTI

**TalentMaster™** — suomalainen jalkapallon talenttiarviointi- ja kehitysseuranta-SaaS.
Rakentaja: Tero Koskela, Palloliiton kansallisen ohjelman johtaja.
Filosofia: *"Pelaaja ensin, hallinto vahvistaa"* — rakentuu lapsen kehitystarpeista ylöspäin.

- **GitHub:** `terokoskela7-cmyk/talentmaster`
- **GitHub Pages:** `https://terokoskela7-cmyk.github.io/talentmaster/`
- **Domain:** talentmasterid.com

---

## 2. TEKNINEN STACK — ÄLÄ MUUTA ILMAN LUPAA

| Kerros | Teknologia | Huomio |
|---|---|---|
| Frontend | Vanilla JS (IIFE), multi-HTML | Ei frameworkeja |
| Tietokanta | Firebase Firestore **eur3** multi-region | eur3 ≠ europe-west1 |
| Auth | Firebase Auth + Custom Claims + **Google Sign-In** | SA kirjautuu Googlella |
| Cloud Functions | Node.js **europe-west1** | Aina tämä region |
| Storage | Firebase Storage, europe-west1 | ADAR Vision -kuvat |
| Hosting | GitHub Pages + Fastly CDN | ~10 min cache, käytä `?v=N` |
| Sähköposti | Nodemailer Cloud Functionissa | Firebase Extension incompatible eur3 |

### Firebase-config (Blaze plan)
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

### Cloud Functions — KRIITTINEN SÄÄNTÖ
```javascript
firebase.app().functions('europe-west1').httpsCallable('functionName')  // OIKEIN
firebase.functions().httpsCallable('functionName')  // VÄÄRIN → us-central1 → hiljaa epäonnistuu
```

---

## 3. SUPER-ADMIN — EI KOSKAAN RIKO

- **Sähköposti:** talentmasterid@gmail.com · **UID:** `dqUzvJA61Wb9fgj5UiK0riSA4NI2`
- **Rooli-string:** `super_admin` (alaviiva — ei `superadmin`, ei välilyöntiä)
- Näkee **aina** kaiken. Tunnistus: `adminSnap.exists` (ei kentän arvo). Kirjautuu **Google Sign-In:llä**.
- Jokainen koodimuutos testattava: "Toimiiko tämä super-adminilla?"

**Erikoistilanteet — SA:lla ei ole `seuraId` Custom Claimissä:**
- ADAR Pikakortti: `_naytaSuperAdminSeuraValitsin()` aukeaa auto → `_vahvistaSeuraValinta()` asettaa `window._tmSeuraId` + lataa pelaajat
- Seurahallinta: seuravalitsin topbarissa → `avaaNaviNakyma(sivu)` välittää `?seura=X&tm_ref=seura`
- **Automaattinen seurahaku palauttaa satunnaisen seuran → seuranvalitsin AINA pakollinen.**

---

## 4. ROOLIRAKENNE — kolmiportainen hallinto

```
super_admin           → TalentMaster (Tero)              [1. Platform]
vp, seurasihteeri, urheilutoimenjohtaja                  [2. Seuran hallinto]
valmentaja, talenttivalmentaja, fysiikkavalmentaja,
  fysioterapeutti, testivastaava                         [3. Operatiivinen]
pelaaja               → PIN-kirjautuminen (Anonymous Auth)
vanhempi
```

---

## 5. DESIGN-TOKENIT — CANONICAL (2026-04-30)

```
Tausta:  #111110 (Carbon, EI #06090F)   Kortit: #161614   Syvä: #1C1C1A
Teal:    #28B090 (ainoa aksentti, EI #3EC9A7)
Sininen: #2A5DB0 (sekundääri, EI #4A7ED9)   Amber: #E0A040 (varoitukset, pilotti)
rgba(42,93,176,X)=--blue · rgba(40,176,144,X)=--teal
```
**Fontit:** Otsikot/KPI `Cormorant Garamond` 300/400/600 (EI Playfair Display) · Body/UI `DM Sans` 400/500/600.
**EI KOSKAAN:** `Playfair Display`, `#3EC9A7`, `#4A7ED9`, `#06090F`.
**Periaate:** Mobile-first. Korkein aktivointivipu: tyhjän tilan design.

---

## 6. MOBIILI — KRIITTINEN BUGI (älä toista)

`display:none` tappaa transform-animaation. Käytä slide-iniä, ja **vain YKSI `@media(max-width:768px)`
per tiedosto** (kaksi lohkoa kumoaa toisen — Seura.html:n bugi oli juuri tämä).
```css
@media(max-width:768px) {
  #hamburgeri { display:flex !important; }
  .sivupalkki { transform:translateX(-100%); transition:transform .25s; }
  .sivupalkki.auki { transform:translateX(0); }
  #sivupalkkiOverlay.auki { display:block !important; }
}
```

---

## 7. KRIITTISET PERIAATTEET — ÄLÄ TOISTA NÄITÄ VIRHEITÄ

1. **Nested template literals** rikkovat scriptin (Python-generoinnin double-encoding) → **string concatenation `+` aina** (mm. Admin tilastot-funktio, Pelaaja_v7 synttäri)
2. **`getIdToken(true)`** pakollinen ennen Firestore-kirjoitusta (sessio vanhentuu → permission-denied)
3. **`super_admin`** (underscore), ei `superadmin`
4. **CF:** `firebase.app().functions('europe-west1')`, EI `firebase.functions()`
5. **`display:none` tappaa transform** → `translateX(-100%)`; yksi `@media(max-width:768px)` per tiedosto
6. **`serverTimestamp()` ei toimi array:n sisällä** → `new Date().toISOString()`
7. **FLEI raakadata 1–3** Firestoreen — normalisointi koodissa, ei tallennettuna
8. **Topias doc-ID:** `m93GBdOaGCUuenMiCL0I` — KAKSI u:ta (m93GBdOaGCU**u**enMiCL0I)
9. **Firestore Rules Consolesta** — ei GitHub Actionsilla (403)
10. **Bundler-template:** raw JSON-string indeksihaku, EI `json.loads()`+`json.dumps()`
11. **`syntymaVuosi` numerona** — `syntymaaika` on Timestamp erikseen; syntymäpäivä `Date.UTC()`, ei `new Date(string)`
12. **`sukupuoli: "M"/"N"`** Firestoressa — ei "poika"/"tyttö". Excel käyttää P/T → muunna aina (P→M, T→N)
13. **PalloID = KENTTÄ** (`tunniste`/`palloID`), EI doc-ID (doc-ID on Firebase UID). Hae `where('tunniste','==',String(palloId))`, ei `.doc(palloId)`. Kopioidaan havaintoihin `palloId`-nimellä. Ks. §11/§24
14. **`media[]` taulukko** — video samaan rakenteeseen tulevaisuudessa
15. **Firestore Rules EI periydy alikokoelmiin** — jokainen alikokoelma oma `match`-blokki. Tarvitaan sekä `allow create` että `allow update` (set-merge käyttää updatea jos doc on)
16. **`testitapahtumat`** EI `tapahtumat` — väärä nimi estää datan löytymisen
17. **IIFE-scope:** HTML `onclick=` kutsuu vain `window._`-globaaleja → sisäiset funktiot `window.fn = function fn()`
18. **`joukkueet[]` + `joukkue`** — pelaajalla molemmat. **Kyselyt aina kaksoiskyselynä Promise.all-rinnakkain:** `where('joukkue','==',nimi)` + `where('joukkueet','array-contains',id)`, yhdistä `Map`illa doc-ID:n perusteella. EI datamigraatiota — molemmat rakenteet säilyvät rinnakkain pysyvästi. Yhden kentän kysely jättäisi puolet pelaajista pois
19. **Excel-sarakeotsikoissa EI sulkeita** — "PalloID (vapaaehtoinen)" rikkoo tuonnin (`etsiSarake` `startsWith`)
20. **`lataaSeurat` = `onSnapshot`**, ei `.get()` (reaaliaikainen)
21. **Joukkueet-kokoelma:** Seura.html luo `.doc(id)`-metodilla (siisti ID), Admin ei enää luo joukkueita — näytä molemmat lähteet rinnakkain
22. **XP/progressbar/loss aversion -kieltä EI renderöidä pelaajalle.** XP tallennetaan Firestoreen vain AI-agentille. Streak aina positiivisesti kehystettynä 4 tilassa (0pv / 1–6 / 7–13 / 14+). Peruste: Seligman PERMA + Deci & Ryan SDT (intrinsic > extrinsic); Kahneman loss aversion → pitkällä aikavälillä ahdistusta

---

## 8. AVAINTIEDOSTOT GITHUBISSA

| Tiedosto | Rooli | Tila |
|---|---|---|
| `TalentMaster_Seura.html` | Seurahallinta (VP, sihteeri, UTJ) | ✅ mobiili OK |
| `TalentMaster_Admin.html` | Super Admin -hallintapaneeli | ✅ |
| `TalentMaster_VP_v22.html` | VP-dashboard (signaalit/BQ/IDP) | ✅ tuotanto, tila §19 |
| `TalentMaster_VP_v25.html` | VP-dashboard v24-design (migraatio v22→v24) | ⏳ Vaihe 1+2+3 valmis (TKI-benchmark, `edae410`); omat luokkanimet `greeting-*`/`joukkue-taulukko`, ei spec'in. Firebase = v22. `?seura=` luetaan URL:sta |
| `TalentMaster_Master_v16.html` | Valmentajan näkymä + Testit-työtila | ✅ uusin |
| `TalentMaster_ADAR_Pikakortti.html` | Kenttähavainto + ADAR Vision (bundler) | ✅ |
| `TalentMaster_Pelaaja_v7.html` | Pelaajan mobiiliapp (v=25) | ✅ |
| `TalentMaster_Vanhempi_v2.html` | Vanhemman näkymä | ⚠️ kovakoodattu nimi |
| `TalentMaster_Player_Home.html` | **Solo** onboarding (splash→nimi→syntymä→FIFA-kortti) | ✅ Sprint 4 |
| `TalentMaster_Solo_Profiili.html` | **Solo** pelaajaprofiili + seuralinkitys (PlayerCode) | ✅ Sprint 4 |
| `TalentMaster_Kortti_Demo.html` | **Solo** FIFA-korttitasot Starter/Sharp/Elite | ✅ Sprint 4 |
| `TalentMaster_Solo_Arviointi.html` | **Solo** alkuarviointi (3-kerroksinen) | ⏳ PENDING |
| `TalentMaster_IDP_Kortti_v4.html` | IDP-kortti | ✅ |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake | ✅ |
| `TalentMaster_Testaus_v9.html` | Yhdistetty kenttätestaustyökalu (v8 + Harjoitettavuus_v4) | ✅ 3112 riviä, §22 |
| `TalentMaster_Excel_Tuonti.html` | Massatuonti + Palloliiton PDF-parseri | ✅ §24 |
| `TalentMaster_Testaus_v8.html` · `..._Harjoitettavuus_Lomake_v4.html` | Edeltäjät | ⚠️ arkistoidaan kun v9 pilottitestattu |
| `TalentMaster_VP_v20/v21.html` · `..._Master_v15.html` | Vanhat versiot | Arkisto |
| `functions/index.js` | 7 Cloud Functionia + aiProxy | ✅ §13 |
| `tm_admin/firestore.rules` | Security Rules **v2.9** (Consolesta) | ✅ deployattu 2026-05-26 |
| `src/lib/tm_bioika.js` | Bio-ikä — Mirwald 2002 PHV (Excel-verifioitu) + KR-runko (lukittu) | ✅ §25 |
| `docs/testit_indeksit.js` | Canonical TKI/TSI/FLEI-laskenta | ✅ §23 |
| `tm_eerikkila_normit.js` | Eerikkilä-normitaulukot | ✅ |
| `tm_lang.js` | fi/sv/en, 144 käännöstä | ✅ |
| `harjoitelogiikka_v4.js` · `tm-profile.js` · `tm-kortit.js` | Generointi/profiili/kortit | ⚠️ tarkista GitHub |

> **Solo (B2C "Player™")** — erillinen Club-tuotteesta. Solo-pelaaja → `players/{playerId}` (**litteä**,
> `seuraId: null`), data localStoragessa (`tm_solo_profiili`, `tm_tkk_historia`, `tm_player_code`).
> **Silta:** PlayerCode `TMP-XXXX` → pelaaja jakaa seuralle → testitulokset valuvat Solo-profiiliin + `seuraId` täyttyy.
> Sama tekniikkakilpailu-/FLEI-metodologia. Stripe 4,99 €/kk + OrsaSport-pilotti Sprint 6–8. Täysi kuvaus: `docs/ARKKITEHTUURI.md §11`.

---

## 9. PILOTTISEURAT (8 + 2)

| ID | Seura | VP-sähköposti | Huomio |
|---|---|---|---|
| fcl | FC Lahti Juniorit | vp.fcl@talentmaster.fi | |
| kpv | KPV | **rasmus_broberg@icloud.com** | vp.kpv EI ole Authissa — oikea tili on rasmus_broberg |
| palloiirot | Pallo-Iirot | vp.palloiirot@talentmaster.fi | |
| yvies | Ylöjärven Ilves | vp.yvies@talentmaster.fi | |
| sjk | SJK Juniorit | vp.sjk@talentmaster.fi | tyttöjoukkueet mukana |
| grifk | GrIFK | vp.grifk@talentmaster.fi | kieliKartta: sv |
| vifk | VIFK | vp.vifk@talentmaster.fi | kieliKartta: sv |
| hjk | HJK Juniorit | vp.hjk@talentmaster.fi | |
| sibbovargarna | Sibbo-Vargarna | — | sv-kieli |
| eps | EPS (Espoon PS) | — | Teams Heini PENDING |

---

## 10. TESTIPELAAJA: TOPIAS KOSKELA (KPV)

```
Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I   ← KAKSI u:ta, doc-ID = Firebase UID (EI PalloID)
PIN: 9278   syntymaVuosi: 2013 (15.3.2013)   sukupuoli: "M"   joukkue: "KPV U13"   seuraId: "kpv"
huoltajaEmail: "TeroKoskela7@gmail.com"
tunniste (PalloID): "12345678"  ← TESTIARVO (string), KENTTÄ ei doc-ID
flei_viimeisin: 62   sbl:2.16 sfl:2.30 ll:2.10 diag:2.40 dfl:2.20   → heikoin LL (55%)
isDemoUser: false — oikea Firestore-data
```
PalloID-haku: `where('tunniste','==',String(palloId))` → fallback `where('palloID','==',...)` → legacy doc-ID.
`.doc(palloId)` palauttaa "not found" rekisteröidyille. Ks. §24.

---

## 11. FIRESTORE-RAKENNE — LUKITTU

Neljä pääkokoelmaa + erilliskerrokset. **Rakenne on päätetty.**

### Pelaajat — pääkokoelma (Solo / seuraneutraali)
```
pelaajat/{palloID}
  palloID, nimi, syntyma, sukupuoli, kansalaisuus
  suostumukset/{perus|terveys|benchmark}: {ok, pvm, versio}
  kirjaukset/{pv}: tyyppi 'T'|'D'|'S'|'P'|'jalkapallo'|'muu_urheilu'|'lepo', tehty, kesto_min,
    rpe 1-10, fiilinki 1-5, aika ilta|aamu|paiva,
    kirjaustapa 'heti'|'jalkikateen'|'auto', takautuva {tyyppi, kesto_min, lisatty}
  idp_kausi/{vuosi}, ohjelmat/{id}, terveys/{id} (GDPR Art. 9, oma suostumus)
  streak_historia[], joukkuetreenit[]
```

### Seurat — operatiivinen hallinto
```
seurat/{seuraId}/
  nimi, laji, paketti, maa, kieli, kaupunki, kotisivu, yhteystiedot, aktiivinen, luotu, paivitetty

  pelaajat/{pelaajaId}/                          ← doc-ID = Firebase UID
    etunimi, sukunimi, syntymaVuosi (numero), syntymaaika (Timestamp), sukupuoli "M"/"N"
    joukkue, pelipaikka, positio, palloId/tunniste (synonyymit), huoltajaEmail, pin (4 num)
    suostumusTila 'pilotti'|'odottaa'|'annettu', suostumusTunniste
    lahde 'excel_tuonti'|'kutsu'|'manuaalinen', isDemoUser: false
    flei_viimeisin (0-100), sbl/sfl/ll/diag/dfl (1.0-3.0 raakadata)
    joukkueet: ["sjk_u13", ...]   // ID-viittaukset (uusi)   joukkue: "SJK U13"  // ensisijainen (backward compat)
    talenttiOhjelma: bool, talenttiTaso "perus"|"laajennettu" (KORI poistettu), talenttiAlku, talenttiAktivoi
    // Pikakentät (§26): tki_*, hh_*, flei_*, phv_tila, biologinenIka_viimeisin, adar_*, isa_pituus_cm/aiti_pituus_cm

    havainnot/{havaintoId}/    ← ADAR
      tyyppi 'adar', adar_taso 1|2|3, pisteet {A,D,Act,R}, narratiivi
      palloId, pelaajaId, seuraId, valmentajaUid, tila 'valmis'|'luonnos', pelaaja_lukenut bool
      ai_narratiivi, ai_luottamus 'matala'
      media: [{tyyppi, storage_url, download_url, otettu: ISO-string}], luotu: ISO-string
    kirjaukset/{pvm}/   (kuten pääkokoelma + lahde 'manuaalinen'|'catapult'|'polar'|'taso' pakollinen, lahde_id)
    biologinen_ika/{pvm}/   (§25)   testitulokset/{pvm}_{protokolla}/   (§23 historiapohja)   pelidata/{otteluId}/ (TASO, §20)

  kayttajat/{uid}/: email, rooli, etunimi, sukunimi, seuraId, aktiivinen
  joukkueet/{joukkueId}/, kutsut/, havainnot/, adar/, tapahtumat/{otteluId} (ottelut), vp_kalenteri/
  valmentajat/{uid}/kontribuutio/{palloID}, valmentajat/{uid}/tuloskortti/
  alumni/{palloID}/, konfiguraatio/{paketti|kpi_painotukset|mittarit|idp_template|viestinta}
  kpi/spl_united_valinnat/{kausi}, rekisteri/{palloID} (viittaus, ei kopio), viestit/{valmentajaUid} (mentorointi)
```

### Erilliskerrokset
```
benchmarks/{maa}/{ikäluokka}/{ominaisuus}: n, keskiarvo, mediaani, p25, p75, p90   (anonyymi, opt-in, n≥30)
marketplace/{palloID}: scout_window_avautuu (15v), eu_siirto_mahdollinen (16v, FIFA Art.19),
  taysis_ikaisyys (18v), huoltaja_hyvaksyy, paasynot/{scoutId}/
palloliitto/kayttajat/{uid}, palloliitto/ohjelmat/{id}/pelaajat/{palloID} + palautteet/{palloID}/{pvm}
admins/{uid}: email, rooli, superAdmin, luotu
```

---

## 12. FIRESTORE SECURITY RULES — `tm_admin/firestore.rules` v2.9

**DEPLOATAAN Firebase Consolesta — EI GitHub Actionsilla (403).** Konsoli → Firestore → Rules → liitä → Julkaise.
✅ v2.9 deployattu 2026-05-26 (`biologinen_ika`, seura-tason `tapahtumat`, `vp_kalenteri`).

**KRIITTISIN MUISTISÄÄNTÖ:** Rules EI periydy alikokoelmiin. Jokainen alikokoelma vaatii oman `match`-blokin.
`match /seurat/{id} { allow read }` sallii vain SEURADOKUMENTIN. (v2.0:n puuttuva `seurat/{id}/pelaajat/`
-blokki aiheutti KAIKKI permission-deniedit koko sessiossa.)

### Funktiot + keskeiset blokit
```javascript
onAnonymous()   // PIN-kirjautuminen — lukee pelaajat + havainnot
onSuperAdmin()  // custom claim super_admin TAI admins/{uid} exists  ← ei tarvitse Custom Claimsia
onOmaSeura(id)  // custom claim seuraId
onJohtoRooli()  // vp|urheilutoimenjohtaja|seurasihteeri
onValmentajaRooli() // + valmentaja|talenttivalmentaja|...   onOmanSeuranValmentaja(seuraId)

seurat/{id}/kayttajat/{uid}:           read: onSuperAdmin() || (onOmaSeura() && onJohtoRooli()) || oma UID
seurat/{id}/pelaajat/{pid}:            read: onSuperAdmin()||onSeuranJasen;  write: onSuperAdmin()||onHallinto||valmentajaroolit
seurat/{id}/pelaajat/{pid}/havainnot/{hid}:  read: onSuperAdmin()||onOmaSeura()||onAnonymous();  write: onOmanSeuranValmentaja()||onSuperAdmin()  ← ADAR Pikakortti
seurat/{id}/pelaajat/{pid}/kirjaukset/{pv}:  päivittäiset harjoituskirjaukset
seurat/{id}/pelaajat/{pid}/biologinen_ika/{pvm}:  read: SA||onSeuranJasen||onHuoltaja;  create/update: SA||onOmanSeuranValmentaja;  delete: SA
seurat/{id}/testitapahtumat/{tid}/tulokset/{pid}:  testauslomake + kenttätyökalu kirjoittavat
```

**Custom Claim -ongelma (ei kriittinen):** claim-arvo on `rooli:'superadmin'` (ilman alaviivaa), pitäisi olla
`super_admin`. Vaikuttaa vain rooli-tarkistaviin Rules-funktioihin; `onSuperAdmin()` käyttää `exists(admins/uid)`
joten SA toimii silti. Korjaus: `setCustomUserClaims({rooli:'super_admin', ...})`.

**Opittua:** `onAuthStateChanged`-loop → `_kirjautuminenKesken`-lippu. `onSnapshot` → `window._XxxUnsubscribe`-pattern.
Logout → dispatch `tm:logout` → odota 50 ms → `signOut()`.

---

## 13. CLOUD FUNCTIONS (europe-west1)

| Funktio | Kuvaus |
|---|---|
| `lahetaRekisteriKutsu` | Yksittäinen kutsu huoltajalle |
| `luoKayttaja` | Luo Firebase Auth -käyttäjän (sama email eri rooli OK) |
| `lahetaHuoltajaKutsu` | Massakutsu huoltajille |
| `deaktivioiKayttaja` | Pehmeä poisto — data säilyy |
| `lahetaPelaajaSivuLinkki` | Linkki pelaajan näkymään |
| `haeOrLuoHuoltajaAuth` | Huoltajan autentikointi |
| `aiProxy` | AI-välitys: GPT-4o Vision, Whisper, narratiivi |
| `tasoHaeSeuranOttelut` | TASO-integraatio (deployattu) |
| `lahetaResetLinkki` | Henkilöstön salasana-reset-linkki (authz: SA/seuran johto `tarkistaOikeus`, kohde-email seuran kayttajat:issa) — ei datakirjoitusta |

`OPENAI_API_KEY`: Google Cloud Secret Manager + GitHub Actions Secrets. API-avaimet ei ikinä selaimessa.
**Reset-linkin continueUrl (HOLD 2026-06-02):** `generatePasswordResetLink(email, {url, handleCodeInApp:false})` — `url` PAKOLLINEN (ilman → 500). Käyttäjä laskeutuu Firebasen reset-sivulle, sitten `url`. Yhtenäistä `url` halutuksi landingiksi `luoKayttaja`/`lahetaResetLinkki`/`lahetaPelaajaSivuLinkki`-funktioissa.

---

## 14. METODOLOGIA — ÄLÄ MUUTA ILMAN LUPAA

**5D Framework:** D1 Fyysinen · D2 Tekninen · D3 Psykologinen · D4 Peliäly · D5 Sosiaalinen.

**FLEI — 5 ketjua (TARKKA):** ⚡SBL · 🦵SFL · ↔️LL · 🔄DIAG · 🏗️DFL.
- DIAG korvaa SL+FL pysyvästi (Wilke et al. 2016)
- S-harjoite kohdistuu **aina heikoimman ketjun** mukaan (ei pelaajaprofiiliin); T-harjoite joka päivä, myös lepopäivinä
- FLEI < 40 → automaattinen klinikkalähetys
- **Raakadata 1–3 asteikolla** (sbl:2.16 jne.). Normalisointi koodissa: `(arvo-1)/2*100` → 0–100 %. Default puuttuvalle 2.0 (50 %). `flei_viimeisin` = keskiarvo normalisoituna

**Eerikkilä-normit (`tm_eerikkila_normit.js`):** `eerikkilaTaso(arvo, testi, ika, sukupuoli)` → 1–5
(tekniikkatestit pujottelu/syöttö 3-portainen, muut 11 testiä 5-portainen). Tallennetaan AINA raakadata,
taso lasketaan lennossa. pienempi=parempi: nopeustestit, pujottelu, syöttö · suurempi=parempi: hyppy_cj, mas.

**Pelaajaprofiilit:** Railgun · Maestro · Shadowstep · Titan.
**Ikävaiheryhmät:** 10–12 Competitor/leikkijä · 13–15 Builder/rakentaja · 16–19 Showcase Pro.
**Biologinen ikä:** Mirwald 2002 (PHV); PHV-status ohittaa Stage-luokituksen (§25).
**RAE-korjaus** = oletusarvo kaikkialla (tausta + tiede: `docs/STRATEGIA.md §2`).

**Terminologia (julkinen kieli):** FLEI → kehon valmiusindeksi · fascia-linja → liikehallintaketju ·
jousitusindeksi → kimmovoima-indeksi · D4 → peliäly.

---

## 15. ADAR PIKAKORTTI — `TalentMaster_ADAR_Pikakortti.html`

### Bundler-rakenne (offline kentällä)
Fontit + Firebase SDK inlinena base64/gzip. Script-tyypit `__bundler/manifest`, `__bundler/ext_resources`,
`__bundler/template`. Päälogiikka on JSON-enkoodattuna `__bundler/template` -skriptissä.
```python
# OIKEIN — raw JSON-string indeksihaulla:
idx = template_raw.find("etsittava"); template_raw = template_raw[:start] + uusi + template_raw[end:]
# VÄÄRIN — json.loads()+json.dumps() → double-encoding korruptoi tiedoston
```

### Firebase-muuttujat
`window._tmDB` (Firestore) · `_tmAuth` · `_tmSeuraId` · `_tmRooli` · `_pelaajaMap {pelaajaId:{tunniste,nimi,joukkue}}`

### saveCard() → `seurat/{seuraId}/pelaajat/{pelaajaId}/havainnot/{id}`
```javascript
await havaintoRef.set({
  palloId, pelaajaId, seuraId, valmentajaUid: firebase.auth().currentUser?.uid,
  tila: 'valmis',          // Pelaaja-näkymä kuuntelee tätä
  pelaaja_lukenut: false, luotu: new Date().toISOString(),
  // ADAR-pisteet, narratiivi jne.
});
```

### ADAR Vision
- Kuva → Storage `seurat/{id}/havainnot/{id}/media_0.jpg`; `media[]` taulukko (video myöhemmin)
- `otettu: new Date().toISOString()` — EI serverTimestamp() (array-rajoitus!)
- `_pyydaAINarratiivi()` → aiProxy → GPT-4o Vision → `ai_narratiivi .update()`; `ai_luottamus:'matala'` aina (ihminen hyväksyy ennen kuin pelaaja näkee)

### Pikatila (3-vaiheinen)
`_pikaValitsePelaaja(id,nimi,seuraId,btn)` → `_pikaAdar(vaihe,btn)` → `_pikaSetPiste(piste,btn)` → `_pikaTallenna()` (→ `tila:'luonnos'`).

---

## 16. PELAAJAN APP — `TalentMaster_Pelaaja_v7.html` (v=25)

**Kirjautuminen:** `_kirjauduPinilla(pin)` → Anonymous Auth → haku `seurat/{id}/pelaajat` jossa `pin==arvo` → `_kaynnistaAppUI()`.
**`getIdToken(true)`** pakollinen ennen Firestore-kirjoitusta (sessio vanhentuu).

**Kirjausrakenne:** `pelaajat/{id}/kirjaukset/{pvm}` — tyyppi 'T'|'D'|'S'|'P' (Tekniikka/Dual/Strength/Peli),
tehty, xp, kesto_min, rpe 1-10, fiilinki 1-5, aika ilta|aamu|paiva.

**Syntymäpäiväyllätys:** `_onkoSynttari(p)` / `_synttariKonfetti()` / `_synttariBanner(p)` —
**string concatenation `+`** (nested template literals rikkoivat parserin → musta ruutu v=23:ssa).

**PHV-kehitysvaihekortti:** lukee `phv_tila` (§25); KR-rivi "Tulossa myöhemmin".

### P6 — Valmentajan havainto → Pelaajan näkymä (AVOIN)
```javascript
_p6KaynnistakuuntelIja(seuraId, pelaajaId)  // onSnapshot: tila=='valmis' && pelaaja_lukenut==false
// → "1 uutta" merkki → _avaaHavainnot() overlay narratiivilla (ei pisteitä) → _p6Luetuksi(): pelaaja_lukenut:true
// ONGELMA: PIN-callback ei aseta window._p7Pelaaja → kuuntelija ei käynnisty.
// KORJAUS: PIN success → window._p7Pelaaja = {seuraId, pelaajaId}
```

---

## 17. SEURAHALLINTA — `TalentMaster_Seura.html`

**Toiminnot:** Yhteenveto (4 KPI + pilottibanner + suostumus-%) · Pelaajat (suodattimet
Kaikki/Pilotti/Kutsu/Rekisteröity/Ilman PalloID + nimihaku) · Joukkueet · Henkilöstö · Sopimukset ·
Tuo Excel (xlsx GitHubista → SheetJS → Firestore) · Massakutsu (`lahetaHuoltajaKutsu`) ·
Talentit-välilehti (`talenttiOhjelma:true`, ryhmittely perus/laajennettu).
**Pilottiprosessi:** 1) Tuo → `pilotti` · 2) Kutsu → `odottaa` · 3) Suostumus → `annettu`.

**Muokkausmodaali:** etunimi, sukunimi, syntymäpäivä (→ syntymaVuosi auto), sukupuoli M/N, joukkueet
(checkboxit, monta), pelipaikka, huoltajaEmail, palloID, talenttiohjelma-toggle. SA lisäksi: sbl/sfl/ll/diag/dfl (1.0–3.0).

**Joukkueen nimen muokkaus:** `avaaJoukkueMuokkaus(id,nimi,ikaryhma,vuosi)` / `tallennaJoukkueMuutos(joukkueId,vanhanimi)`
— päivittää joukkueet-kokoelman dokumentin JA batch-päivittää kaikki pelaajat (sekä `joukkue`- että `joukkueet[]`-kenttä).

**Excel-pohja dynaaminen:** `lataaRekisteriPohja()` hakee seuran joukkueet Firestoresta, generoi Excelin
SheetJS:llä, joukkue-sarakkeessa valmis dropdown. Tiedosto `TalentMaster_{SeuraId}_{pvm}.xlsx`.

**Duplikaattisuoja tuonnissa:** 1) palloID-tarkistus, 2) etunimi+sukunimi+joukkue. Ohitetut `⏭`-merkillä
(`ohitettu`-laskuriin, ei virheisiin). Yhteenveto: `X tuotu · Y ohitettu · Z epäonnistui`.

---

## 18. ADMIN-NÄKYMÄ — `TalentMaster_Admin.html`

**Toiminnot:** Seurat (muokkaa/poista/"+Lisää seura" `avaaLisaaSeuraModal`) · Käyttäjät
(✏️ Hallinnoi → roolinmuutos + salasana-reset + PIN + deaktivointi) · Joukkueet (dynaaminen,
"+Lisää joukkue" POISTETTU → käytä Seura.html) · Tilastot (KPI + seurataulukko suostumuspalkilla) · Massakutsu.

**Massakutsu = kaksivaiheinen:** Vaihe 1 tallentaa `suostumusTila:'odottaa'`, EI lähetä sähköpostia.
Nappi "💾 Tuo pelaajat järjestelmään" + amber-varoitus "VAIHE 1/2". Vaihe 2 (tuleva): "Lähetä suostumuspyynnöt".

**KRIITTINEN:** Tilastot-funktio käyttää **string concatenationia** (`'<div>'+x+'</div>'`), EI template literaleja
(Python-generoinnin double-encoding rikkoo nested-literaalit).

---

## 19. VP_v22 — TILA (`TalentMaster_VP_v22.html`)

**Työtilat:** Tilanne (kauden jakso + joukkuepulssi + signaalit + IDP-jono) · Valmentajat (profiilit +
mentorointi-paneeli + kalibraatiopaja + kehitysindeksit) · Pelaajat (IDP-jono + 6 suodatinta + taulukko) ·
Kalenteri (testitapahtumat + linkki Testaus) · Raportointi (Head of Talent -koosto + talenttisuositukset).
**Työkalut:** Arvioi harjoitus (Sprint 4). **Asetukset:** Metodologia · Kalibraatio · Kriteeristö · Benchmark.

**Mentorointi-loop (natiivi):** VP → `seurat/{id}/viestit/{valmentajaUid}` → valmentajan Inbox. Ei sähköpostia/Slackia.

**Tekninen tila (2026-05-26):**
- **Kausipalkki dynaaminen:** `_laskeKausi(nyt)` — yksi totuuslähde (kevät 1.4–30.6, syksy 1.8–28.2). Ei kovakoodattua.
- **Pelaajalista-sarakkeet:** FLEI | TKI | Signaali | PHV. TKI pikakentästä `tki_viimeisin` (`_tkiSoluVP`), merkki `tki_merkki`-kentästä. Ei alikokoelmakyselyjä.
- **Signaalihehku:** `.signal-card.crit/.alert` → box-shadow rgba(201,64,64,.15); `.warn` → rgba(204,138,58,.12). Emojit → CSS-pisteet `.sig-dot--crit/--warn`.
- **KPI-kontekstitekstit** (vain ladatusta datasta): Pelaajia → joukkuejakauma · FLEI ka. → ↑/↓ trendi (`flei_historia`) · Avoimet testit → "vanhin X pv sitten".
- **Neliosainen joukkuepulssi** `renderTeamPulse` (§26) + **kattavuussignaalit S6–S9** `renderSignals` (§26).
- **Joukkueen syvänäkymä** `avaaJoukkueSyvanakyma`: pulssikortin klikkaus → modaali 3 välilehteä (Tekniikka TKI-ranking · Tuki ryhmittely kehityskohteittain · Yhteenveto TKI-jakauma). Vain pikakentistä. (Korvasi `avaaJoukkueTrendiModal`:n.)
- **Avoin:** Raportointi "Lähetä HoT:lle" = vain `toast()`.

---

## 20. INTEGRAATIOARKKITEHTUURI — ekosysteemistrategia

Platform johon datalähteet konvergoivat; lock-in tulee datasta, ei sopimuksista.

**`lahde`-kenttä kaikkialle:** `lahde: 'manuaalinen'|'catapult'|'polar'|'taso'|'wyscout'|'palloliiton_api'`,
`lahde_id: string|null` (synkronointi + deduplikointi).

**TASO (osittain):** `tasoHaeSeuranOttelut` deployattu (passit, laukaukset, minuutit, arvosanat).
Puuttuva (Sprint 4–5): valmentaja lataa TASO-datan kalenteriin → kohderakenne:
```
seurat/{id}/tapahtumat/{otteluId}: tyyppi 'ottelu', vastustaja, pvm, joukkue, taso_ottelu_id
pelaajat/{id}/pelidata/{otteluId}: minuutit, laukaukset, passit, taso_arvosana, lahde 'taso', lahde_id
```
**iCal-vienti (Sprint 5):** CF → `/api/kalenteri/{seuraId}/{joukkue}.ics` → Google/Outlook/Apple.

**Prioriteetti:** 🔴 TASO→kalenteri+pelidata (4–5) · 🟡 iCal (5) · 🟡 Catapult/Polar (6–7) ·
🟢 Palloliiton API (8+) · 🟢 Wyscout/InStat (8+).

---

## 21. AI-ARKKITEHTUURI

**Behavioural Science -agentti (Sprint 6–8):** `Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä`.
Triggerit: streak katkeaa · 3pv streak · fiilinki matala 2pv · uusi viikko · PHV-huippu.
Käyttäytymistiede: habit loop (Duhigg), implementation intention (Gollwitzer), loss aversion, temptation bundling (Milkman).
Tekninen: `tm_ai.js` provider-agnostic wrapper, `TM_AI.call()` — ei suoria API-kutsuja UI:sta, CF = AI-proxy (API-avaimet ei selaimessa).

**RAG:** Firebase Vector Search (beta) tai Pinecone — aktivoidaan kun **500+ pelaajaa** usealta kaudelta, ei aiemmin.

**MCP / Open API:** Palloliiton MCP-server on jo (`jsvirtane/tulospalvelu-mcp`); TM rakentaa oman.
`llms.txt`: api.talentmasterid.com/llms.txt. Versiointi `/v1/`, OpenAPI 3.1.
Auth: API-avain (seurat) · OAuth 2.0 PKCE (scoutit) · JWT (Palloliitto). Rate: 1000/100/10000 per h.

---

## 22. TESTAUSINFRASTRUKTUURI

### Testikerrokset
| Kerros | Tiedosto | Käyttötapa | Firestore-polku |
|---|---|---|---|
| **Yhdistetty** | `Testaus_v9.html` | Wizard + korttinäkymä + offline-ensin (v8 + Harjoitettavuus) | `testitapahtumat/{id}/tulokset/{pid}` + `joukkueet/{jid}/kalenteri/{kid}` |
| Massatuonti | `Excel_Tuonti.html` | Historiallinen data + Palloliiton PDF (§24) | `testitulokset/`, `testitapahtumat/.../tulokset/` |

> v8 + Harjoitettavuus_v4 arkistoidaan kun pilottiseura on testannut v9:n.

### Testaus_v9 — kolme sovellusta yhdessä tiedostossa
1. **Suunnittelu** (toimistossa, vaiheet 1–4): protokolla + alusta + joukkue + osallistujat + ryhmäjako
2. **Kenttänäkymä** (testipäivänä, vaihe 5): korttinäkymä yksi pelaaja kerrallaan · rotaatio ·
   **offline-ensin (localStorage→Firestore)** · vihreä välähdys 800 ms · 1–3 p pisteytys · ℹ-kenttäohjeet ·
   Palloliiton kuljetus-laukaus-erikoissyöttö (raaka + 4 rangaistuskenttää + auto-tulos) · reaaliaikainen TKI + merkki
3. **Tarkastelu** (jälkeen, vaiheet 6–8): sync-status per pelaaja · "Merkitse valmiiksi" · FLEI/TKI/TSI värikoodattu taulukko · A4-print per pelaaja (Carbon→valkoinen)

**Kalenteri-kirjoitus = kaksi polkua:** `testitapahtumat/{id}` (POLKU 1) + `joukkueet/{jid}/kalenteri/{kid}`
(POLKU 2, try-catch best-effort; vaati Rules v2.7 kalenteri-blokin).
**Offline-ensin:** kentällä localStorageen, synkka taustalla kun verkko auki.

### Excel-kiertokulku (testit ilman nettiä)
VP luo tapahtuman → valitsee protokollan + aktiiviset testit + pelaajat → `testitapahtumat/{id}` →
"📥 Excel" generoi SheetJS:llä (pelaajat esitäytetty, vain valitut testit, ohjeet-lehti + tapahtuma-ID
metadatana, tiedosto `TM_2026-syksy_kpv-u15_20260915.xlsx`) → testaaja täyttää kentällä → VP lataa
Excel-tuontiin (PalloID pakollinen, P/T → M/N, esikatselu, batch write).

### Tapahtuma-Firestore-rakenne (lukittu)
```javascript
testitapahtumat/{tapahtumaId} {
  nimi, protokolla: "hh_laaja"|"vapaa", aktiiviset_testit: ["lin_5m", ...],  // VP valitsi
  // vapaa-moodissa: omat_testit_meta: [{id, nimi, yksikko}, ...]
  kausi: "2026-syksy", pvm_alku, joukkue, arvioija, tila: "suunniteltu"|"avoin"|"valmis",
  pelaajatData: [{id, etunimi, sukunimi, tunniste, phv_tila}],
  tulokset/{pelaajaId} { testit: {lin_5m: 1.12, ...}, testauspvm, kausi, tunniste }
}
```

### Testi-ID:t (Firestore + Excel + indeksilaskenta)
| ID | Selitys | Yks | Ketju | Logiikka |
|---|---|---|---|---|
| `lin_5m`/`lin_10m`/`lin_30m` | Lineaarinopeus (30m = TSI:n perusta) | s | SBL | pienempi=parempi |
| `505_oikea`/`505_vasen` | 5-0-5 ketteryys per puoli | s | LL | pienempi |
| `kasirata` | Ketteryyskasirata (kahdeksikko) | s | LL | pienempi |
| `sm_juoksu` | Suunnanmuutos ilman palloa | s | DIAG | pienempi |
| `sm_pallo` | Suunnanmuutos pallolla (lajitekniikka) | s | DIAG | pienempi |
| `hyppy_cj`/`hyppy_sj` | Kevennyshyppy (CMJ) / staattinen (SJ) | cm | SFL | suurempi |
| `mas` | MAS-juoksutesti (max aerobinen nopeus) | km/h | SFL | suurempi |
| `pujottelu`(`_hh`) | Pujottelu | s | LL | pienempi |
| `syotto`(`_hh`) | Syöttö | s | DIAG | pienempi |
| `ponnauttelu` | Ponnauttelu (sarjan suoritusaika) | s | DFL | pienempi |
| `kuljetus_laukaus` | Kuljetus-laukaus (tarkkuusvähennyksin) | s | DIAG | pienempi |
| `pituuspotku` | Pituuspotku (aikabonus metrit/5, max 20s) | m | SBL | suurempi |

**TSI (Tekninen suunnanmuutos-indeksi)** = `sm_pallo − sm_juoksu`. Positiivinen → fysiikka > tekniikka;
lähellä nollaa → tekniikka vahva. Hyvä pelaaja häviää ~0.3–0.6 s pallon kanssa; selvästi enemmän → lajitekniikkavaje.

**Alustaherkkyys (`ALUSTAHERKAT_TESTIT`):** juoksu- ja ketteryystestit (`lin_*`, `505_*`, `kasirata`,
`sm_*`, `kuljetus_laukaus`, `pujottelu*`, `syotto*`, `mas`) vaativat alusta-tiedon (tulokset eivät vertailukelpoisia
eri alustoilla). Liikkuvuus-/harjoitettavuustestit (kyykky, lankku jne.) eivät ole alustaherkkiä.

### Historiapohja-tuonti (Excel_Tuonti, kaksi moodia)
- **Moodi A — Tapahtumapohjainen** (default): vaatii Tapahtuma-ID:n → `seurat/{sid}/testitapahtumat/{tid}/tulokset/{palloID}`.
- **Moodi B — Historiapohjainen**: EI vaadi tapahtumaa → `seurat/{sid}/pelaajat/{palloID}/testitulokset/{pvm}_{protokolla}`:
```javascript
{ testit: {ponnauttelu:48, ...}, kausi, protokolla: "tekniikkakilpailu"|"hh_laaja"|"harjoitettavuus_u12",
  lahde: "historiapohja", testauspvm, tuotu, tuojaUid, flei_pct, tki, phv_tila, tallennettu: serverTimestamp() }
```
Doc-ID `{pvm}_{protokolla}` (estää konfliktit usean protokollan samana päivänä).
**Pelaajaprofiili päivitetään VAIN jos PalloID löytyy** ristiintarkistuksessa; tunnistamattomat → vain
`testitulokset`-alikokoelmaan (review-jono). **WriteBatch** atomisuus max 400 dok/erä (raja 500);
`flei_historia`-array käyttää `new Date().toISOString()` (ei serverTimestamp arrayssa).

### Pelaajatunniste-arkkitehtuuri (kv-valmius)
Tunnistearvo `tunniste`/legacy `palloID` -kentässä + `tunnistetyyppi`-metakenttä (audit-jälki):
`'palloID'` (Suomi, virallinen) · `'tunniste'` (seuran/järjestelmän oma: Excel `Tunniste`/`PlayerID`/`SpelareID`/`Spieler-ID`) · `'muu'` (fallback).
Excel-tuonti tunnistaa sarakkeet monikielisesti, prioriteetti PalloID → järjestelmätunnisteet. Sama Firestore-rakenne
palvelee koti- + kv-dataa ilman migraatiota. Kv-laajennus tarvitsee maakohtaisen
`seurat/{sid}/konfiguraatio/tunnistetyyppi: 'DFB-ID'|'NIF-ID'|...` + saksankielinen otsikkohaku (Sprint 3.2).

---

## 23. TEKNIIKKAKILPAILU & TKI — AIKAPOHJAINEN (canonical: `docs/testit_indeksit.js`)

**Kaikki 5 lajia mitataan sekunteina, pienempi = parempi** (TK_LAJIT_META kaikki `kaanteinen:true`).
Ei lajikohtaisia merkkirajoja — käytössä **`TK_KOKONAISRAJAT`** (kokonaistulosrajat sekunteina per ikä+sukupuoli 8–13).

| Laji | Yritykset | Yks | Erikoislogiikka |
|---|---|---|---|
| Ponnauttelu | 2 | s | Sarjan suoritusaika, paras (pienin) |
| Syöttö | 2 | s | Paras aika. Näyttönimi yhtenäisesti **"Syöttö"** (ent. "Syöttö pujotellen"); sisäinen id `syotto` |
| Pujottelu | 2 | s | Paras aika |
| Kuljetus-laukaus | 2 | s | Raaka − tarkkuusvähennykset (+ ennenaikaiset ×10 s) |
| Pituuspotku | 2+2 (oik+vas) | m | metrit/5 → aikabonus (max 20 s) **vähennetään** kokonaisajasta, vain U12–13 |

**Kuljetus-laukaus vähennykset:** Nurkka ilmassa −5 s · Nurkka maata −2 s · Keski ilmassa −3 s · Keski maata −1 s.

**Kokonaistulos** = ponnauttelu + syotto + pujottelu + kuljetus_laukaus.tulos − pituuspotku-aikabonus (ika ≥ 12).

**TKI — nelivyöhyke kokonaistuloksesta** (EI lajeittain), lasketaan vain ika 8–13 (muuten TKI=null):
- Kulta (≤ kultaraja): **80–99** — `ideaali = Math.min(rajat.kulta*0.5, kokonaistulos*0.5)` → sileä gradientti, ei litisty 99:ään
- Kulta–hopea: **60–80** · Hopea–pronssi: **40–60** · Pronssin alle: **0–40** (vertailupohja pronssi×1.5)

**Merkki AINA kokonaistuloksesta** `tkLaskeMerkki(kokonaistulos, ika, sp, rajatOverride?)` — käyttää `<` (ei `<=`;
tasan rajalla EI merkkiä), 4. param = testitulokseen tallennettu `merkkirajat`, muuten `TK_KOKONAISRAJAT`.
Renderöinti (`_tkiMerkkiM`/`_tkiMerkkiVP`) lukee **VAIN `tki_merkki`-kentästä** (`const m = merkkiKentta || null`,
ei TKI-johdettua fallbackia). Recalc kirjoittaa `tki_merkki:null` myös puuttuessa → ylikirjoittaa vanhan väärän.

**Canonical-funktiot** `docs/testit_indeksit.js`: `tkLaskeMerkki` · `tkLaskeTKI` · `laskeKokonaistulos` ·
`_laskeVahvuudetJaKehityskohteet`. Inline-kopiot Testaus_v9 + Excel_Tuonti.

**TKI-benchmark (VP_v25):** `TK_KANSALLINEN_BENCHMARK` -vakio (valtak. tekniikkakilpailut 2022–2025), **P ja T erikseen**
(esim. P10=85, T12=87). `lyhennaNimi(nimi)` → benchmark-avain; ei avainta → palkki "—". Taso: ≥80 erinomainen · ≥60 hyvä · ≥40 kehitys · <40 prioriteetti.

---

## 24. EXCEL-TUONTI & PALLOLIITON PDF-PARSERI — `TalentMaster_Excel_Tuonti.html`

Kaksi tuontityyppiä: 📊 Excel ja 📄 Palloliiton PDF. **Kahden lähteen periaate:** kenttätyökalu (Testaus_v9) =
seuran kontrolliharjoitus; Palloliiton PDF = virallinen kilpailu. Molemmat näkyvät Pelaaja_v7 Tekniikkaprofiilissa lähdemerkinnällä.

### PalloID-haku — KENTÄLLÄ, EI doc-ID:llä (KRIITTINEN)
Doc-ID on Firebase UID, EI PalloID. `_haePelaajaPalloIdilla(palloIdStr)`:
1. `where('tunniste','==',String(palloId)).limit(1)` — ensisijainen
2. `where('palloID','==',String(palloId))` — fallback
3. `.doc(palloIdStr)` — legacy (vanhat tuonnit joissa doc-ID oli PalloID)

Tallennus käyttää löydetyn dokumentin oikeaa ID:tä (`_firestoreDocId`). `.doc(palloId)` palautti ennen aina
"not found" rekisteröidyille — se oli juurisyy. PalloID **aina** `String(palloId).trim()`; pohjageneraattori
pakottaa A-sarakkeen tekstimuotoon (`t:'s'`, `z:'@'`) — `_pohjaPakotaTekstisarake`.

### Monisuoritusparsinta (`_1/_2/_3`)
`_pohjaHeaderMap()` kääntää otsikot `{testId, kind, yritys}`-metaksi (eksakti), fallback `tunnistaTestiId()` +
suffiksin riisunta. Per testiryhmä: skalaari (`laskeParas`) → `p.testit` (validointi/TKI); rakenne → `p.testitRakenne`.
- Kuljetus-laukaus: `{y1:{raaka,vahennys,netto}, y2:{...}, paras, tulos}` (netto=raaka−vähennys, paras=min)
- Pituuspotku: `{oikea:{y1,y2,paras}, vasen:{...}, paras_m, metrit, aikabonus_s}` (`metrit` → `laskeKokonaistulos` lukee bonuksen)

Tallennus kirjoittaa TKI + `merkki` testitulokset-dokumenttiin + pikakentät pelaajaan (§26). TK-aikavalidointi
lievennetty: >200 s / <1 s → keltainen varoitus, ei estä tallennusta. Excel-pohjan sarake `Syotto_s` (ei `Syotto_pujotellen_s`).

### Palloliiton PDF — `PDF_VERSIO = 'kaksipassi-v5'` (pdf.js 3.11.174 CDN, ei npm)
**Rivinparsinta POSITIOPOHJAINEN** (`_pdfParsiPelaajarivi`), EI x-lähikartoitus (vanha x-nearest konkatenoi
sarakkeet → 10× liian suuri). Solut x-järjestyksessä → tokenit → numerot. Sija/viiva strippataan nimen alusta;
seuranimi poistetaan (`PDF_SEURANIMET` + valittu `seuraNimi`); `ES`→null; syntymävuosi (`\d{4}`) erotellaan nimestä.

**P12 sarakekartoitus — LOPPUANKKUROINTI:** `lopputulos = nums[n-1]`, `ponnauttelu = nums[n-2]` (vakaa kaikille
ikäluokille); etu vakaa (kl_aika/vah/tulos, syotto, pujottelu = 0–4); pituuspotku = väliin (5..n-3) jäävät
(vain P12–P13, ehto `ctx.ika>=12 && n>=8`). Korvasi hauraan `onU12 = n>=10`-ehdon.
**O+V "X+Y"-muoto:** pituuspotkun yhdistelmäsolu (esim. "18+26") puretaan **kahdeksi** numeroksi (pp_o, pp_v).

**MONIPÖYTÄTUKI — KAKSIPASSINEN PARSINTA:** sama PDF voi sisältää useita ikäluokkia (P12+P10+P9).
- **Passi 1:** etsii otsikkorivit (`IKAOTSIKKO = /^(T|P)(\d+)$/i`, koko rivi = täsmälleen "P12") → rivivälit
  `{ikaluokka, sukupuoli, ika, alku, loppu}`. **Dedup:** sama otsikko voi toistua sivunvaihdon yli (P9 sivuilla 1 JA 2)
  → osiot yhdistetään, duplikaattiotsikkorivit ohitetaan Passi 2:ssa.
- **Passi 2:** parsii osiot omalla **`ctx`-OBJEKTILLA** `{ikaluokka, ika, sukupuoli}` — **ctx PAKKO olla objekti**
  (string → `ctx.ika` undefined → P12-kartoitus 7-sarakkeiseksi + TKI laskematta). P12-minimi `nums.length >= 5`, muut >= 6.
- Testattu Sibbon tulosteella: P12 23 · P10 26 · P9 15 = 64 riviä, 62 yhdistyi nimellä, 0 duplikaattia ✅.

**Yhdistää nimellä:** `where('sukunimi','==')`+`where('etunimi','==')` → 1 auto, 2+ manuaalivalinta, 0 ei löydy.
**EI luo uusia pelaajia automaattisesti.** **Duplikaattisuojaus:** docKey `{pvm}_tekniikkakilpailu_{ikäluokka}`;
PalloID-yhdistämisen jälkeen `tarkistaDuplikaatit()` (Promise.all) → 🟡 "Tallennettu X · Uusi Y" + [Ohita]/[Korvaa]
(oletus Ohita; ohitus vain tallennuksessa `_pdfTallennetaanko`, kaikki rivit näkyvät esikatselussa).
**Tallennus:** per rivi oma `ikaluokka`/`sukupuoli`; litteät kentät (`syotto_s`…`kokonaistulos_s`) **+ `testit:{}`-map**
(Pelaaja_v7-renderöinti); `lahde:'palloliitto_pdf'`; TKI/merkki kanonisilla funktioilla per rivin `ika`.

### Admin-työkalut (SA only)
- **↻ Laske TKI uudelleen** (topbar): laskee `tki_viimeisin` + pikakentät uudelleen pelaajan viimeisimmästä
  tekniikkakilpailu-tuloksesta. **Ikä pelaajan `syntymaVuosi`-kentästä** (EI testituloksen ikäluokasta — ikäluokka =
  kilpailusarja), **kilpailuvuosi testituloksen `d.pvm`-kentästä** (ika = kilpailuvuosi − syntymaVuosi). Ei vaadi PDF:ää.
  Kun `tki == null` recalc **NOLLAA** `tki_viimeisin` + `tki_merkki` (poistaa vanhan väärän arvon).
- **`siivoaBugisetTulokset(seuraId, ikaluokka, maxKokonais, dryRun=true)`** konsolifunktio — poistaa testitulokset
  joissa `kokonaistulos_s < maxKokonais` (dry-run oletus listaa, `false` poistaa).
- **`recalcIkaluokasta(seuraId, joukkue, dryRun=true)`** (topbar-nappi + konsoli, SA): recalc kun **`syntymaVuosi` puuttuu**
  (esim. Sibbo). Johtaa iän+sp testituloksen **`ikaluokka`-kentästä** ("P10"→10/'P'), **OHITTAA tallennetun `merkkirajat`-kentän**
  (= P10→P9-bugin lähde) → `TK_KOKONAISRAJAT[sp][ika]`. Valitsee pelaajan **joukkueen** ikäluokkaa vastaavan tuloksen (ohittaa stray-docit).

**CDN-versiovaroitus:** `PDF_VERSIO` konsolissa + `_tarkistaCdnVersio()` vertaa raw.githubusercontent.com:iin (vain
github.io-hostilla) → amber-banneri jos vanha. Raw-linkki näyttää lähdekoodin (text/plain) — todellinen tuoreutus on `?v=`.

---

## 25. BIOLOGINEN IKÄ — `src/lib/tm_bioika.js`

### Kahden menetelmän jako (eivät kilpaile — Eerikkilä/Palloliitto MyEWay)
| Menetelmä | Kysymys | Käyttö | Tila |
|---|---|---|---|
| **PHV (Mirwald 2002)** | "Mitä pelaajassa tapahtuu nyt?" | Harjoittelun ohjaus, kuormarajoitin, loukkaantumisriski | ✅ Toteutettu |
| **Khamis-Roche (1995 erratum)** | "Kuinka kypsä suhteessa muihin?" | Bio-banding, ryhmittely, %PAH | ⏳ LUKITTU (`KR_KERTOIMET_PUUTTUU`) |

### PHV — Mirwald 2002 (Excel-verifioitu identtiseksi)
**Lähde:** Mirwald RL et al. Med Sci Sports Exerc 2002;34(4):689-694.
**Toteutus:** `laskeMirwald()` + `laskeBioIkaDokumentti()` + `bioIkaTallennusOperaatiot()`.
Verifioitu `TalentMaster_BioIka.xlsx`:stä ZIP-XML-tasolla (11 kerrointa identtiset, PHV-kynnykset, yli-ikäisyystaulukko).

**Pakolliset muuttujat:** `ika` (desimaali, `syntymapaiva` → `Date.UTC()`) · `pituus` (cm, 2× ka) ·
`paino` (kg, 2× ka) · `istumapituus` (cm, 1×, kriittinen) · `sukupuoli` `'P'`/`'T'` (erilliset kaavat).
Sukupuoli normalisoidaan: `M`→`P`, `N`→`T` (`normSukupuoli()`).
**Tulos:** `maturity_offset` (vuosia PHV-huipusta) · `phv_ika = ika − offset` · `phv_tila_koodi` · `yli_ikaisyys.poikkeuslupa`.

**PHV-tilakoodi (CANONICAL — käytä KAIKKIALLA):**
| Koodi | Merkitys | offset |
|---|---|---|
| `PRE` | Ennen kasvupyrähdystä | < −1.0 |
| `LAH` | Lähestyy | −1.0 … −0.5 |
| `PH` | Kasvupyrähdyksessä ⚠️ **VAROITUSTILA** | −0.5 … +0.5 |
| `POST` | Jälkeen | +0.5 … +1.0 |
| `AN` | Jälki-PHV | > +1.0 |

**EI** `pre_phv`/`circa_phv`/`huippu`/`PHV` (vanhat koodit vain backward-compat: Pelaaja_v7 `_laskeStage`/signaalit).
**`phv_tila === 'PH'` → kuormarajoitin:** voimaharjoittelu max 80 % 1RM, hyppyvolyymi −20 %, juoksuvolyymi seurattava.

### Khamis-Roche — LUKITTU (kertoimet verifioitava ennen aktivointia)
Alkuperäinen Khamis & Roche 1994 sisälsi **virheellisiä kertoimia** → käytettävä **Pediatrics 1995;95:457 erratum**
(selittää miksi KR oli aiemmin poistettu). `KR_VERIFIOITU = false` → `laskeKR()` palauttaa `{error:'KR_KERTOIMET_PUUTTUU'}`.
Aktivointi: lisää erratum-kertoimet `KR_KERTOIMET`:iin + `KR_VERIFIOITU = true`.
- Kertoimet **imperiaalisia** (tuumat/paunat) — muunna cm/kg ennen, tulos takaisin cm. Puolen vuoden intervallit → **lineaarinen interpolointi** murto-iille (4–17.5 v).
- **Midparent:** pojat `(isä+äiti+13)/2`, tytöt `(isä+äiti−13)/2`.
- **Vanhempien fallback** (puuttuville, THL FinRavinto 2017): isä **179 cm**, äiti **166 cm** (EI 181/168 — yläkanttiin → systemaattisesti liian suuret ennusteet). Epstein-korjaus (itseraportoinnin yliarviointi): isä −1.5 cm, äiti −1.0 cm. UI merkitsee AINA "arvio".
- **Virhe näytetään AINA:** 11–15 v ±2.5 cm, muu ±2.0 cm, +1.5 cm jos estimoitu. Tyttöjen KR tarkempi (keskivirhe 4.3 cm vs. pojat 5.6 cm). Etninen kalibrointi: Fels-aineisto (valkoihoiset pohjoisamerikkalaiset) → maahanmuuttajataustaisilla tarkkuus voi heiketä (rajoitus, ei este).

### Firestore + kasvumittaus
- **Historia:** `seurat/{sid}/pelaajat/{pid}/biologinen_ika/{pvm}` (oma dok per mittauspäivä, oma Rules-blokki §12).
- **Bio-pikakentät pelaajadokumentissa:** `phv_tila` (koodi) + `biologinenIka_viimeisin` (koko viimeisin mittausdok). KR Sprint 4: `kr_isa_cm`/`kr_aiti_cm`.
- **Vanhempien pituudet** (rekisteröinnistä): `isa_pituus_cm` / `aiti_pituus_cm` / `vanhempi_pituus_puuttuu`. Validointi isä 140–220, äiti 130–200; vapaaehtoisia (adoptio/yksinhuoltaja). GDPR-informointi: käytetään biologisen kypsyyden arviointiin.
- **Kasvumittaus (Testaus_v9 `kasvumittaus`-protokolla):** pituus 2× + paino 2× (`laskentatapa:'keskiarvo'`) + istumapituus 1×.
  `_v5SyotaYritys`: jos `laskentatapa==='keskiarvo'` → `obj.paras` = yritysten keskiarvo (ei "paras"). PHV lasketaan +
  tallennetaan kahteen polkuun "Merkitse valmiiksi" -toiminnossa. Mittausaika ~3–4 min/pelaaja. Väli: U10–12 2×/v · U13–15 3×/v · U16–19 1–2×/v.
- **Älä kopioi `tm_bioika.js`:ää** — repon versio on auktoritatiivinen (287 riviä, Excel-verifioitu); laajenna sitä.

---

## 26. MITTARISTOARKKITEHTUURI

**Periaate:** jokainen Firestoreen tallennettu testidatasetti tuottaa automaattisesti **(1) pikakentät**
pelaajadokumenttiin, **(2) joukkuetason KPI:t** VP-dashboardiin (ka + kattavuus n/koko), **(3) suunnan**
(↑/→/↓ kun ≥2 mittausta), **(4) kattavuussignaalin** kun kattavuus heikko. Pikakentät luetaan dashboardissa
suoraan pelaajadokumentista — **ei alikokoelmakyselyjä renderöinnissä.**

| Datasetti | Pikakentät | Tila |
|---|---|---|
| **TKI** | `tki_viimeisin` · `tki_pvm` · `tki_merkki` (kulta/hopea/pronssi) · `tki_vahvuus` · `tki_kehityskohde` (laji-id) | ✅ Excel/PDF |
| **H-H** | `hh_viimeisin {lin30m, cmj, mas}` · `hh_pvm` · `hh_taso` (1–5, `laskeHHTaso` Eerikkilä) | ✅ Excel (hh_laaja/suppea) |
| **FLEI** | `flei_viimeisin` · `flei_pvm` · `flei_historia[]` | ✅ (odottaa kenttädataa) |
| **PHV** | `phv_tila` · `biologinenIka_viimeisin` (offset + pvm) | ✅ Testaus_v9 |
| **ADAR** | `adar_viimeisin {a,d,ac,r,yht,pvm}` · `adar_pvm` · `adar_havaintoja` · `adar_vahvin` · `adar_heikoin` | ⚠️ helper valmis, kirjoituspiste auki |

**Joukkuepulssi (`renderTeamPulse`):** neliosainen rivi per joukkue — **FLEI · TKI · H-H taso · ADAR ka.**,
kukin `ka` + `n=testattu/koko` + suunta (`_pulssiSuunta` flei_historiasta FLEI/TKI:lle; H-H/ADAR ei historiaa → ei nuolta).
ADAR ka. = `adar_viimeisin.yht` keskiarvo pelaajista joilla **≥3 havaintoa**.

**Kattavuussignaalit (`renderSignals`, vain ladatusta `_pelaajat`-datasta, ei uusia kyselyjä):**
- **S6** TKI < 40 % · **S7** H-H < 40 % · **S8** FLEI < 40 % → amber (vaativat ≥3 pelaajan joukkueen)
- **S9** ADAR: joukkue > 5 pelaajaa mutta < 30 % saanut ≥3 havaintoa viim. 30 pv → amber. **Eri kuin S1** (S1 = valmentaja ei kirjaa lainkaan; S9 = kirjaa mutta ei havainnoi tarpeeksi)

**ADAR — kirjoituspiste auki:** pikakentät viim. 10 havainnon keskiarvosta (`paivitaAdarPikakentat(pelaajaId)`
Master_v16:ssa). HUOM: Master_v16:n ADAR-drilli on UI-mockup (ei persistoi) — varsinainen kirjaus on
`ADAR_Pikakortti.html` `saveCard()`. Helper valmis kutsuttavaksi sieltä; kunnes kytketään, pikakentät eivät täyty
oikeasta kenttäkäytöstä. Lukupuoli (joukkuepulssi + S9) toimii heti kun pikakentät ovat olemassa.

---

## 27. KEHITYSTYÖN PERIAATTEET

1. **Suunnittele ennen koodausta** — "tehdään ensin suunnitelma"
2. **Inkrementaalinen** — testaa jokaisen muutoksen jälkeen, myös super-adminilla
3. **Tiedostojen jakelu:** outputs → GitHub
4. **CDN-cache** ~10 min → `?v=N`, tarkista `raw.githubusercontent.com`
5. **Security Rules:** Firebase Consolesta JA `tm_admin/firestore.rules` (erilliset)
6. **Chrome MCP:** Firestore-kirjoitukset app-tabista (Firebase alustettu)

---

## 28. KEHITYSIKKUNAT — herkkyysvaiheet (KOKO SIGNALOINNIN BIOLOGINEN PERUSTA)

> Hidden Gem, X-Factor, pikakenttäpainotukset ja VP:n toimenpide-ehdotukset ovat **kaikki tämän biologisen totuuden käyttöliittymä.** Täysi tieteellinen perustelu: `docs/STRATEGIA.md §2`. Liittyy §14 (metodologia) + §25 (PHV).

**Perusperiaate:** herkkyysikkuna ≠ "milloin ominaisuus on tärkeä", vaan **milloin sen kehittäminen on poikkeuksellisen herkkää** — sama harjoitusmäärä tuottaa moninkertaisen vaikutuksen. Ikkunan sulkeuduttua sama tulos vaatii 3–5× työn — tai jää saavuttamatta.

| Ominaisuus (mittari) | Herkkyysikkuna | Mekanismi | **Signaali-invariantti (koodi)** |
|---|---|---|---|
| **Taito/tekniikka** (D2: TSI, SM-pallo) | **~6–13 v (pre-PHV)** | hermoston plastisuus, motoriset ohjelmat | **TSI = kriittisin yksittäinen indikaattori** — paljastaa onko ikkuna käytetty. U14+ uusi perustaito 3–5× työ |
| **Koordinaatio/liikehallinta** (FLEI) | pre-PHV | faskiaalinen adaptoituvuus | matala FLEI pre-PHV = **vakava** (perustaidot jäivät rakentumatta). FLEI≥65 U12 = poikkeuksellinen. Post-PHV nousee hitaammin |
| **Kiihdytys 5–10m** (D1 osa) | **KAKSI ikkunaa:** ~7–13 (neuraalinen) + post-PHV (voima) | SSC, aktivaationopeus → myöh. lihasmassa | 5m/10m osittain harjoiteltavissa jo pre-PHV (poikkeus muista nopeusmittareista) |
| **Maksiminopeus 30m + aerobinen** (MAS) (D1) | **post-PHV** (P ~U14–18, T ~U12–16) | testosteroni/GH | **pre-PHV heikko 30m/MAS = NEUTRAALI, ei negatiivinen signaali** |
| **Voima** (CMJ, 5RM) | **post-PHV** | anaboliset hormonit | **CMJ pre-PHV = koordinaation mittari, EI voiman.** Post-PHV 3–4× voimakasvu |
| **Peliäly** (D4: ADAR) | laaja ~U10→U19 (kortikaalinen) | strateginen taso kypsyy myöhään | **ADAR-kynnykset ikävaihekohtaisia** — U11 ≠ U16, ei suoraa vertailua |

### Signaloinnin invariantit (Hidden Gem & FVP — ÄLÄ KOODAA ILMAN NÄITÄ)
1. **Hidden Gem on PHV-tilakohtainen.** korkea D2 + matala D1 **PRE-PHV** = aito gem (fysiikka tulee automaattisesti 2–4 v sisällä). **POST-PHV** sama profiili = fyysinen nousuvara EI enää tule automaattisesti → hyvä pelaaja, mutta ei "jalostamaton timantti". Sama luku, eri merkitys.
2. **FVP (5m/30m) tulkittava PHV-kontekstissa.** matala FVP pre-PHV = normaali (nopeusprofiili odotettu); post-PHV = aito voimanpuute. **Ilman PHV-dataa (Sibbo/SJK) FVP-arvoa EI saa tulkita voimaksi** — VP:lle näytettävä ilman voimajohtopäätöstä.
3. **Pre-PHV heikko 30m/MAS/CMJ ei laske talenttiarviota** — biologisesti odotettua, ei kehityskohde.
4. **Kullankimpale:** korkea FLEI + korkea D2 **pre-PHV** = molemmat kriittiset ikkunat käytetty samanaikaisesti → ansaitsee oman merkin/painokertoimen Hidden Gem -logiikassa.

**Käytännön rajoite (2026-06):** pilottidatassa ei vielä PHV:tä → Hidden Gem porrastettava: **ehdokas** (korkea D2 + matala D1, toimii nyt) → **vahvistettu** (+ PRE-PHV, kun bio-ikä mitattu).
