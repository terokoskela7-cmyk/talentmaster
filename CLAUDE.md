# CLAUDE.md — TalentMaster™ Master Briefing

> Ensimmäinen tiedosto jonka liität uuteen Claude-sessioon. Keskittyy **teknisiin invariantteihin**.
> Strategia, RAE-tiede, kansainvälistyminen, bisnesmalli, sprintit ja avoimet tehtävät: **`docs/STRATEGIA.md`**.
> Operatiivinen roadmap-historia: `docs/ROADMAP.md`. Solo-tuotteen täysi kuvaus: `docs/ARKKITEHTUURI.md §11`.
> Viimeksi päivitetty: 2026-06-15 (B2 Sentry deployattu + verifioitu §33 · ADAR kenttävalmis + pikakentät §26/§32 · live-tila §9 + §26 `d1_taso` VALMIS + §29/§30 seuradatakartta live-luvuilla · edellinen 06-11: §34 TKI-analyysimalli · §16/§19/§23/§24/§26/§27/§31 synkronointi · tehtäväarkisto)

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
23. **orderBy-kenttä AINA sama kuin write-kenttä.** Pelaaja_v7 kirjoittaa `paivitetty`, Master_v16 kysyi `fiilinki_paivitetty` → 0 tulosta. Firestore palauttaa tyhjän tuloksen orderBy-kentällä jota ei ole — ei virheilmoitusta. Timestamp-kenttä: käytä `.toDate()` ennen `.getTime()` (serverTimestamp → Firestore Timestamp-objekti, ei ISO-string)
24. **Security Rules -kenttänimet = koodi-kenttänimet.** Rules lukee `vastaanottajaUid`/`lahettajaUid` → kirjoittavan koodin PAKKO asettaa nämä kentät (ei pelkkä `to`/`from`). Tarkista Rules ENNEN kirjoituskoodia
25. **`harjoitelogiikka_v4.js` — root on ainoa totuus (A7 2026-06-15).** `src/lib/`-versio on re-export rootiin, EI itsenäinen tiedosto. Pelaaja_v7 lataa rootin Pagesista `?v=6`. `generoimTehtavatV2` + `generoimViikoOhjelma` = dead code (0 HTML-kutsua, ei module.exports) — älä käytä. `valitsePaivanHarjoite(pelaaja, pankki, pvm)` — jos `pankki.T` puuttuu (kuten `window.PANKKI`-stub), funktio ignoroi argumentin ja käyttää sisäistä PANKKIa. `generoiMiksiteksti(p, null, iv)` HEITTÄÄ — kietoa aina try/catchiin. `laskeTekninenKehityskohde` ei-datalle: `{lahde:'ikavaihe', varmuus:'oletus'}` (ei `lahde:'oletus'`). ADAR-override: `adar_pisteet < 40` NUMERONA (ei `{ac}`-objektina). Characterization-testit: `tests/harjoitelogiikka.characterization.test.js` (21 testiä) — aja ennen muutoksia.

---

## 8. AVAINTIEDOSTOT GITHUBISSA

| Tiedosto | Rooli | Tila |
|---|---|---|
| `TalentMaster_Seura.html` | Seurahallinta (VP, sihteeri, UTJ) | ✅ mobiili OK |
| `TalentMaster_Admin.html` | Super Admin -hallintapaneeli | ✅ |
| `TalentMaster_VP_v25.html` | **VP-dashboard — KANONINEN JULKINEN (2026-06-15 päätös)** | ✅ kaikki nav-linkit → v25 (Admin/Seura/Testaus_v9/UTJ/tm_dna_builder). Vaihe 1+2+3 valmis; Firebase = v22-rakenne. `?seura=` URL:sta |
| `TalentMaster_VP_v22.html` | VP-dashboard (vanha tuotanto, §19) | ⚠️ korvattu v25:llä julkisena; säilytetään toistaiseksi varalla, ei enää nav-linkkien kohde |
| `TalentMaster_Master_v16.html` | Valmentajan näkymä + Testit-työtila + VP-viestit Inbox | ✅ uusin |
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
| `tm_admin/firestore.rules` | Security Rules **v3.3** (Consolesta) | ⏳ v3.3 odottaa Console-deployta (kirjaus-permissionit PÄÄTÖS 1+2) |
| `src/lib/tm_bioika.js` | Bio-ikä — Mirwald 2002 PHV (Excel-verifioitu) + KR-runko (lukittu) | ✅ §25 |
| `docs/testit_indeksit.js` | Canonical TKI/TSI/FLEI-laskenta + TKI-analyysimalli (§34) | ✅ §23/§34 |
| `docs/TKI_ANALYYSIMALLI.md` | Kanoninen TKI-analyysimalli (3 viitekehystä + kehitysvauhti) | ✅ §34 |
| `docs/tk_lajiviitteet.js` | Generoitu `TK_LAJIVIITTEET` (SSOT mergelle, älä poista) | ✅ §34 |
| `docs/data/taitokisa_*.json` + `parse_taitokisa*.py` | TK-viitedatan raakadata + parserit (vuosipäivitys) | ✅ §34 |
| `tm_eerikkila_normit.js` (`lib/`-alla) | Eerikkilä-normitaulukot | ✅ |
| `tm_lang.js` | fi/sv/en, 144 käännöstä | ✅ |
| `harjoitelogiikka_v4.js` | **CANONICAL** harjoitegeneraattori (2803r) — Pelaaja_v7 lataa Pagesista `?v=6` | ✅ §A7 |
| `src/lib/harjoitelogiikka_v4.js` | Re-export rootiin (`module.exports = require('../../harjoitelogiikka_v4.js')`) — EI muokata | ✅ §A7 |
| `tm-profile.js` · `tm-kortit.js` | Generointi/profiili/kortit | ⚠️ tarkista GitHub |

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

> **PILOTIN LIVE-TILA (2026-06-15) — Firestoresta luettu, dokumentit olivat jäljessä:**
> Excel-tuonti TOIMII (ent. "kriittisin pullonkaula" ratkaistu). Pelaajia tuotu: **sjk 61 · grifk 145 ·
> sibbovargarna 223 · palloiirot 67 · kpv 34**. Datan kypsyys vaihtelee paljon — ks. §30 seuradatakartta.
> **SJK-rekisteröinti käynnistyi tänään:** 58 huoltajakutsua → 6/61 antanut suostumuksen (PIN generoitu).
> Vaihe = **pilotin käyttöönotto** (rakennus + analyysimallit lukittu, nyt datankeruu + adoptio).
> **PIN cross-club-törmäysriski:** seurataan `scripts/check_pin_collisions.js`:llä (0 törmäystä 06-15).

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

  kayttajat/{uid}/: email, rooli, etunimi, sukunimi, seuraId, aktiivinen,
    lisenssitaso 'grassroots'|'c'|'b'|'a'|'pro' (UEFA-hierarkia, kv-mapattavissa DFB/FA/AFC),
    erikoistuminen (vapaa teksti), cpd_tunnit_kausi (int), koulutukset [{nimi,vuosi}],
    profiili_paivitetty (ISO-string)
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
| `vaihdaKayttajanRooli` | Vaihtaa käyttäjän roolin: `seurat/{seuraId}/kayttajat/{uid}.rooli` update + `setCustomUserClaims` + `revokeRefreshTokens` + vp_uid-hallinta. Params `{uid, seuraId, uusiRooli}`, sallitut `vp`/`valmentaja`/`talenttivalmentaja`/`seura_admin`. Authz `tarkistaOikeus` |
| `vahvistaSuostumus` | Suostumuksen vahvistus + Auth-luonti + reset-linkki. Admin SDK varmentaa huoltajaEmail-täsmäyksen (permission-denied jos ei) → kirjoittaa palvelinpuolella KOKO kutsuflow'n (suostumusTila 'annettu' + aux-kentät tila/antaja/bio-pituudet + kutsut→'hyvaksytty') koska Rekisterointi_Suostumus.html on autentikoimaton → haeOrLuoHuoltajaAuth → passwordResetLink. Kirjoittaa myös huoltajaEmail (vahvistus), syntymaaika+syntymaVuosi, sukupuoli (P/T→M/N), suostumukset[] + suostumus{}-objekti. Params: seuraId/pelaajaId/hEmail/suostumusTeksti/antaja/bioPituudet/kutsuId/syntyma/sukupuoli/suostumukset/suostumusMap/antajaRooli/aikaleima |

`OPENAI_API_KEY`: Google Cloud Secret Manager + GitHub Actions Secrets. API-avaimet ei ikinä selaimessa.
**Reset-linkin continueUrl (HOLD 2026-06-02):** `generatePasswordResetLink(email, {url, handleCodeInApp:false})` — `url` PAKOLLINEN (ilman → 500). Käyttäjä laskeutuu Firebasen reset-sivulle, sitten `url`. Yhtenäistä `url` halutuksi landingiksi `luoKayttaja`/`lahetaResetLinkki`/`lahetaPelaajaSivuLinkki`-funktioissa.

**Roolinvaihto-invariantit:**
- Roolinvaihto AINA `vaihdaKayttajanRooli`-CF:n kautta — ei suoraan Firestoreen.
- CF tekee aina: `Firestore.update` + `setCustomUserClaims` + `revokeRefreshTokens`.
- Ilman `setCustomUserClaims` Rules ei näe muutosta (Rules lukee `request.auth.token.rooli`-claimia).
- `revokeRefreshTokens` yksin EI pudota aktiivisia sessioita — defensiivinen UI-tarkistus (claims vs Firestore `kayttajat.rooli`, onAuthStateChanged) on välttämätön pari. Toteutettu VP_v25:ssä.
- `tarkistaOikeus` lukee `vp_uid`:tä eikä pelkkiä claimseja — stale `vp_uid` voi antaa palvelinpuolen VP-oikeudet demotoinnin jälkeen ~hetken. Tietoinen kompromissi, korjataan omassa sprintissä.

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

**Tekniikkatavoite (MINÄ → Tekniikkaprofiili, 2026-06-11, §34/§5.3):** tavoiterivit pikakentistä (§26) lapsen kielellä —
⭐vahvuus (`tki_vahvuus`; "kärkitasoa" vain jos taso erinomainen, `tkLajiViite`) · 🎯seuraava askel (välitavoite: gap≤3s→`viite.hyva`,
muuten arvo−3s/0.5s tarkkuus — **saavutettava askel, ei koko matka**) · 🏅mitalimatka VAIN positiivisena ja vain ≤15s · 📈abs-parannus
VAIN >0 · 🔥kultaikkuna ≤12v ILMAN uhkakehystä. Tyhjätila "Tekniikkakisa tulossa" (ei "Ei tuloksia"). TÄNÄÄN-T-kortti saa saatteen
kehityskohteesta (`_tekTavoiteSaate`). **§7.22-EHDOTON:** ei XP/progressbaria/loss aversion -kieltä ("menetät/putoat/sulkeutuu"),
ei vertailua muihin, **TKI-laskua EI näytetä pelaajalle lainkaan** (vain abs-parannus kun positiivinen, §34 §3.2). Pelaaja lataa
`docs/testit_indeksit.js` → funktiot `window.TM_TESTIT`:stä, EI inline-kopiota. SW `tm-pelaaja-v3` (§27.4).

**Perheviestintä (Vanhempi_v2 Kortti-tab, 2026-06-11, §34/§5.4):** vanhemmalle SAMA §7.22-kehys kuin pelaajalle +
"miten tukea" -kerros (`rVanhempiTekniikka`, `TUKIVINKIT`). Ei tasolukuja (T1–T5)/percentiilejä, ei vertailua muihin,
ei TKI-laskua/punaisia deltoja vanhemmallekaan — **painostusmekanismi**: lapsi ei ahdistu datasta vaan vanhemman
paineesta. AINA: vahvuus ensin · prosessikehu (Dweck) · autonomiaa tukevat vinkit (Deci & Ryan SDT). Data pikakentistä
(§26), `tkLajiViite`/`tkSekuntibudjetti` `window.TM_TESTIT`:stä (lib script-tagilla, ei inline). SW `tm-vanhempi-v4`.

**Kirjausrakenne:** `pelaajat/{id}/kirjaukset/{pvm}` — tyyppi 'T'|'D'|'S'|'P' (Tekniikka/Dual/Strength/Peli),
tehty, xp, kesto_min, rpe 1-10, fiilinki 1-5, aika ilta|aamu|paiva.

**Syntymäpäiväyllätys:** `_onkoSynttari(p)` / `_synttariKonfetti()` / `_synttariBanner(p)` —
**string concatenation `+`** (nested template literals rikkoivat parserin → musta ruutu v=23:ssa).

**PHV-kehitysvaihekortti:** lukee `phv_tila` (§25); KR-rivi "Tulossa myöhemmin".

### P6 — Valmentajan havainto + viesti → Pelaajan näkymä (✅ 2026-06-07)
```javascript
_p6KaynnistakuuntelIja(seuraId, pelaajaId)  // onSnapshot: tila=='valmis' && pelaaja_lukenut==false
// → "1 uutta" merkki → _avaaHavainnot() overlay narratiivilla (ei pisteitä) → _p6Luetuksi(): pelaaja_lukenut:true
// PIN success asettaa window._p7Pelaaja = {seuraId, pelaajaId} → kuuntelija käynnistyy
```
**Valmentajan viestit:** `tyyppi:'valmentaja_viesti'` + `tila:'valmis'` → P6-kuuntelija näkee automaattisesti.
Fallback: `h.teksti` (viesti) || `h.narratiivi` (ADAR). Tekijä: `h.valmentajaNimi` || `h.tekija_nimi`.

### Perhekehu ← Vanhempi (✅ toteutettu)
```javascript
_haePerhekehu()  // lukee seurat/{sid}/pelaajat/{pid}/kehut, luotu >= 48h, nahty==false
// → hav-card KOTI-näkymässä → _kuittaaKehu() → nahty:true
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

**Syvänäkymä-analytiikka (VP_v25, 2026-06-11, §34):** joukkue-syvänäkymä (`avaaJoukkueSyvanakyma`) Yhteenveto-välilehti = TKI-histogrammi +
per-laji joukkueprofiili vs `tkLajiViite`-eliittiviite (label AINA `_lahde`-kentästä) + "lähellä merkkiä" (`tkSekuntibudjetti`) + kehitysvauhti
(abs + TKI, §3.2) + treeniteema-CTA (`_jsvLuoTapahtuma` esitäyttö). **Tuki**-välilehti = gap-järjestys + harjoitusryhmäjako (📋 leikepöytä) +
**aito taantuma -merkki (TKI<0 JA abs<0)**. Radar <3 dim → kompakti dimensiokortti. Per-pelaaja `_jspModal` Tekninen = per-laji + sekuntibudjetti
+ delta/vauhti + kultaikkuna (jaetut `_jsvPerLajiHTML`/`_jsvBudjettiRivi`; TSI-rivi piiloon kun ei SM-dataa). Joukkuekorttien suunta = H-H
ensisijainen → **TKI-fallback** (`lahde`-kenttä) → "2. mittaus puuttuu" vasta kun molemmat puuttuvat; pelaajalistan delta-badget (H-H + TKI).
Kanoniset TKI-funktiot + `TK_LAJIVIITTEET`/`TK_KOKONAISRAJAT` **inline-kopioituna VP:hen** (synkassa testit_indeksit.js:ään; `jsv-an-*` globaalit → toimivat myös `_jspModal`issa).

**Mentorointi-loop (natiivi):** VP → `seurat/{id}/viestit/` (kentät `lahettajaUid`, `vastaanottajaUid`, `teksti`, `aika`, `luettu`) → valmentajan Inbox (Master_v16 `_kuunteleVpViestit` onSnapshot). Ei sähköpostia/Slackia.

**Tekninen tila (2026-06-07):**
- **Kausipalkki dynaaminen:** `_laskeKausi(nyt)` — yksi totuuslähde (kevät 1.4–30.6, syksy 1.8–28.2). Ei kovakoodattua.
- **Pelaajalista-sarakkeet:** FLEI | TKI | Signaali | PHV. TKI pikakentästä `tki_viimeisin` (`_tkiSoluVP`), merkki `tki_merkki`-kentästä. Ei alikokoelmakyselyjä.
- **Signaalihehku:** `.signal-card.crit/.alert` → box-shadow rgba(201,64,64,.15); `.warn` → rgba(204,138,58,.12). Emojit → CSS-pisteet `.sig-dot--crit/--warn`.
- **KPI-kontekstitekstit** (vain ladatusta datasta): Pelaajia → joukkuejakauma · FLEI ka. → ↑/↓ trendi (`flei_historia`) · Avoimet testit → "vanhin X pv sitten".
- **Neliosainen joukkuepulssi** `renderTeamPulse` (§26) + **kattavuussignaalit S6–S9** `renderSignals` (§26).
- **Joukkueen syvänäkymä** `avaaJoukkueSyvanakyma`: pulssikortin klikkaus → modaali 3 välilehteä (Tekniikka TKI-ranking · Tuki ryhmittely kehityskohteittain · Yhteenveto TKI-jakauma). Vain pikakentistä. (Korvasi `avaaJoukkueTrendiModal`:n.)
- **VAI+ (5-komponenttinen):** ADAR 30% · Käynnit 20% · Harjoittelu 20% · Kontakti 15% · **Kehitys 15%** (joukkueen TKI/H-H Δ pelaajadatasta). Profiilipaneeli: UEFA-lisenssitaso (Grassroots/C/B/A/Pro) + erikoistuminen + CPD-tunnit + koulutushistoria. Lisenssibadge coach-kortissa.
- **Coach-modaali (2026-06-07):** `avaaCoachPanel(id)` → dynaaminen center-modal (`#coachModal`) 4 välilehteä: Profiili (lisenssi+CPD+koulutukset) | VAI+ (5 progress bar + hälytykset + kehitysinfo) | Harjoituslaatu (SPL 7 kriteeriä) | Mentorointi (viesti+historia). `_cmTab(idx)` vaihtaa tabit. Seuraa `avaaJoukkueSyvanakyma`-patternia. `suljePaneeli()` = `modal.remove()`.
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
`_laskeVahvuudetJaKehityskohteet` + **TKI-analyysimalli (§34):** `tkLajiViite` · `tkLajiGapit` · `tkSekuntibudjetti` ·
`tkVaadittuVuosivauhti` · `tkAbsDelta`. Inline-kopiot Testaus_v9 + Excel_Tuonti (+ VP_v25 analyysifunktiot, synkronointikommentilla).
**KORJAUS 2026-06-11: `TK_KOKONAISRAJAT` T13 pronssi = 135** (oli 130; kaksi riippumatonta alueellista PDF:ää vahvisti, TKI_ANALYYSIMALLI.md §8.8).
Korjattu 3 kopioon (testit_indeksit + Excel_Tuonti + VP_v25). Päivitä Vitest-odotukset jos muutat.

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
- **Molemmat recalc-funktiot hyväksyvät historiapohja-docit (KORJAUS 80cb332):** suodatin = `kokonaistulos_s != null` **TAI**
  (`protokolla=='tekniikkakilpailu'` && ei-tyhjä `testit`-map). Kokonaistulos lasketaan kanonisella `laskeKokonaistulos(d.testit, ika, sp)`:lla
  kun litteä `kokonaistulos_s` puuttuu (§22 Moodi B -tuonnit eivät enää ohitu hiljaa). pvm-vahti + `_edellinen`-logiikka ennallaan.

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
| **TKI** | `tki_viimeisin` · `tki_pvm` · `tki_merkki` (kulta/hopea/pronssi) · `tki_vahvuus` · `tki_kehityskohde` (laji-id) · `tki_edellinen`(+`_pvm`) | ✅ Excel/PDF |
| **TK-lajit** (§34) | `tk_lajit_viimeisin {ponnauttelu_s, syotto_s, pujottelu_s, kuljetus_laukaus_s (NETTO), pituuspotku_bonus_s (vain ≥12v)}` · `tk_lajit_pvm` · `tk_kokonaistulos_viimeisin/_edellinen/_edellinen_pvm` (pvm-vahti; **recalc EI vangitse edellistä**) | ✅ Excel/PDF/recalc×2 (`_tkLajitPikakentat`) |
| **H-H** | `hh_viimeisin {lin30m, cmj, mas}` · `hh_pvm` · `hh_taso` (1–5, `laskeHHTaso` Eerikkilä) | ✅ Excel (hh_laaja/suppea) |
| **FLEI** | `flei_viimeisin` · `flei_pvm` · `flei_historia[]` | ✅ (odottaa kenttädataa) |
| **PHV** | `phv_tila` · `biologinenIka_viimeisin` (offset + pvm) | ✅ Testaus_v9 |
| **ADAR** | `adar_viimeisin {a,d,ac,r,yht,pvm}` · `adar_pvm` · `adar_havaintoja` · `adar_vahvin` · `adar_heikoin` | ✅ kytketty: ADAR_Pikakortti `saveCard()` kirjoittaa (kanoninen replika Master-helperistä, 2026-06-15) |

> **⚠️ Normipäivitys 2026-06-05 (pojat + tytöt VALMIS):** Kaikki H-H-normit päivitetty Palloliiton
> **FINAL2024**-virallisiin arvoihin. Identtiset MyWayn kanssa. Koskee: 5m, 10m, 20m, 30m, kasirata,
> SM-juoksu, SM-pallo, CMJ, MAS, pujottelu (3-portainen), syöttö (3-portainen).
> **PAKOLLINEN: aja `recalcHH` kaikille pilottiseuroille ennen VP-näyttöä:** sjk, sibbo, kpv, grifk, palloiirot.
>
> **Normiarkkitehtuurin periaatteet (pysyvät):**
> 1. **`EERIKKILA_NORMIT` (`tm_eerikkila_normit.js`) on single source of truth** kaikille H-H-normeille.
> 2. **`HH_NORMIT_PIKA`** (Excel_Tuonti + VP_v25) sisältää vain 30m/CMJ/MAS — muut haetaan EERIKKILA-libistä.
> 3. **`testit_indeksit.js` `HH_NORMIT`** on täydellinen kopio kaikista testeistä, molemmat sukupuolet.
> 4. **10m ja 20m: EI `HH_NORMIT`:ssa** — EERIKKILA lib on ainoa lähde (VP lukee ne `eerikkilaTaso`:lla).
> 5. **H-H pujottelu/syöttö = 3-portainen normisto** (taso 1-3, vain P/T 10-15). TK pujottelu/syöttö = TKI-laskenta
>    + mitalit. Fyysisesti sama rata, eri protokolla ja normi. Sama tulos voidaan tallentaa molempiin.
> 6. **Tyttöjen PDF (FINAL2024) = sama normisto kuin pojilla**, eri raja-arvot.
>
> **INVARIANTTI — protokollavalinta (Excel-tuonti):** Pujottelu ja syöttö voivat olla H-H tai TK protokollalla
> — protokollavalinta pakollinen Excel-tuonnissa (esikatselun valintapaneeli; H-H → `hh_viimeisin.{pujottelu|syotto}`
> + `testit.{id}_protokolla:'hh'`; TK → TKI-laskenta + `'tk'`). **Ponnauttelu = aina TK. 10m/30m/CMJ = aina H-H.**
>
> Tekn. huom: `hhLaskeTaso` yleistetty taulukon pituuden mukaan (4→1-5, 2→1-3); 3-portaiset normalisoidaan
> OVR:ssä 5-portaiselle skaalalle (1→1, 2→3, 3→5). `hhLaskeTaso`-ikälookup cappaa 19:ään → M/N-rivit datassa
> valmiina mutta käyttöön vasta jos lookup laajennetaan; 3-portaiset 16+ → null (ei bogus-tasoa).
>
> **⚠️ IKÄLÄHDE-EPÄJOHDONMUKAISUUS (recalcHH vs Excel-tuonti, 2026-06):**
> - `recalcHH` käyttää iän lähteenä **JOUKKUENIMEÄ** (`"SJK P14"` → 14), EI syntymävuotta.
> - Excel-tuonti (`laskeIka`) käyttää **kronologista ikää** kun SyntymaVuosi-sarake on täytetty:
>   oletettu syntymäpäivä **1.7.**, kevättesti (ennen 1.7.) → nuorempi ikäluokka (esim. 2012-syntyinen
>   12.4.2026 → 13, ei 14). Ilman syntymävuotta → fallback joukkuenimeen kuten recalcHH.
> - **Seuraus:** recalcHH ja Excel-tuonti voivat antaa **eri `hh_tason`** samalle pelaajalle, jos syntymäkuukausi
>   on ennen/jälkeen 1.7. (esim. P14-joukkueen kevättestattu 2012-syntyinen → recalcHH 14, Excel-tuonti 13).
> - **Korjaus myöhemmin:** vie sama kronologinen logiikka `recalcHH`:hon kun syntymävuosi löytyy Firestoresta.
>
> **✅ VALMIS (2026-06-15): `recalcHH` tallentaa `d1_taso`:n.** `recalcHH` (Excel_Tuonti.html:3877–3916) laskee ja
> kirjoittaa `d1_taso`:n `merge`-setillä. **Ajettu SJK:lle: 58/61 pelaajalla `d1_taso` + `d2_taso` 56** → Master_v16
> Kehitys-näkymän D1/D2-KPI näkyy nyt SJK:lle. **`d1_taso` = D1-fyysisen dimension taso (1–5) = keskiarvo Eerikkilä-tasoista**
> testeistä `lin10m, lin30m, cmj, mas (÷3.6 → m/s), kasirata` — vain niistä jotka pelaajalla on, pyöristys 1 des, null jos 0 testiä.
> **HUOM:** laajempi kuin `hh_taso` (joka käyttää vain `lin30m/cmj/mas`). Ei johdeta lennossa raakadatasta (`hh_viimeisin` =
> raa'at arvot, ei tasoja) — fabrikoitu taso rikkoisi "näytä mitä on" -periaatteen. **Aja muille seuroille kun H-H-data tuodaan**
> (06-15: vain SJK:lla H-H-mittaukset; grifk/palloiirot rosterit ilman testidataa, Sibbo TKI-only). `d1_lahde`/`d1_pvm` ei vielä erikseen.

**Joukkuepulssi (`renderTeamPulse`):** neliosainen rivi per joukkue — **FLEI · TKI · H-H taso · ADAR ka.**,
kukin `ka` + `n=testattu/koko` + suunta (`_pulssiSuunta` flei_historiasta FLEI/TKI:lle; H-H/ADAR ei historiaa → ei nuolta).
ADAR ka. = `adar_viimeisin.yht` keskiarvo pelaajista joilla **≥3 havaintoa**.

**Kattavuussignaalit (`renderSignals`, vain ladatusta `_pelaajat`-datasta, ei uusia kyselyjä):**
- **S6** TKI < 40 % · **S7** H-H < 40 % · **S8** FLEI < 40 % → amber (vaativat ≥3 pelaajan joukkueen)
- **S9** ADAR: joukkue > 5 pelaajaa mutta < 30 % saanut ≥3 havaintoa viim. 30 pv → amber. **Eri kuin S1** (S1 = valmentaja ei kirjaa lainkaan; S9 = kirjaa mutta ei havainnoi tarpeeksi)

**ADAR — kirjoituspiste KYTKETTY (2026-06-15):** pikakentät viim. 10 havainnon dimensiokeskiarvosta. Kanoninen
logiikka `paivitaAdarPikakentat(pelaajaId)` Master_v16:ssa; **`ADAR_Pikakortti.html` `saveCard()` REPLIKOI sen
inline** (eri bundlattu tiedosto → ei voi kutsua Master-helperiä; pidä synkassa). `.get()` kaikki + client-sort
`_luotuToMs`:llä (EI komposiitti-indeksiä), vahvin/heikoin = `'assess'/'decide'/'act'/'reassess'`, `adar_pvm` ISO.
Master_v16:n `openDrill('adar')` OHJAA nyt Pikakorttiin (ei enää mockup). **Launcher:** Master sidebar + VP_v25
"Työkalut"→ADAR-kenttätyökalu, molemmat `?seuraId=`. Lukupuoli (joukkuepulssi + S9 + VAI+) toimii kun pikakentät täyttyvät.

---

## 27. KEHITYSTYÖN PERIAATTEET

1. **Suunnittele ennen koodausta** — "tehdään ensin suunnitelma"
2. **Inkrementaalinen** — testaa jokaisen muutoksen jälkeen, myös super-adminilla
3. **Tiedostojen jakelu:** outputs → GitHub
4. **CDN-cache** ~10 min → `?v=N`, tarkista `raw.githubusercontent.com`
   - **SW EI SAA CACHETTAA MUIDEN APPIEN SIVUJA — ALLOWLIST-PERIAATE (korjattu 2026-06-11).**
     Pelaaja/Vanhempi-SW:t jakavat scopen `/talentmaster/`. Aiempi Cache First -strategia cachetti
     KAIKKI scopen fetchit → VP/Master/Excel-sivut jäätyivät SW-cacheen (`?v=` ei auttanut, SW vastaa ennen verkkoa).
     Juurisyy mm. "recalc vanhalla Excel_Tuonnilla 2026-06-10". **Nyt:** `sw_pelaaja.js`/`sw_vanhempi.js`
     cachettaa VAIN omat tiedostot (allowlist: oma HTML network-first, oma manifest/ikonit/JS-moduulit +
     versioidut fontit/SDK cache-first). **Kaikki muu → `fetch` suoraan, EI cachea** (toisten appien sivut
     menevät tuoreena verkosta). `onOmaHtml`/`onAllowlist`-funktiot SW:ssä.
   - **PWA cache-versiot — nosta AINA kun HTML/SW-strategia päivittyy** (activate siivoaa kaikki muut cachet
     kuin nykyisen → poisoned cachet tyhjenevät käyttäjiltä SW-päivityksen yhteydessä; `skipWaiting`+`clients.claim`):
     · Pelaaja: `tm-pelaaja-v3` (`sw_pelaaja.js`) · Vanhempi: `tm-vanhempi-v2` (`sw_vanhempi.js`)
     · Nosta SW:n cache-versio kun SW-logiikka muuttuu. PWA-tiedostot: `manifest_pelaaja/vanhempi.json`,
     `sw_pelaaja/vanhempi.js`, `assets/pwa/icon-*.png`. Scope `/talentmaster/` (SW juuressa → ei kavennettavissa,
     allowlist hoitaa rajaamisen), polut absoluuttisia.
   - **PRECACHE-polkujen PAKKO palauttaa 200 — `cache.addAll` on ATOMINEN:** yksikin 404 kaataa koko installin → SW ei
     aktivoidu (FC-bonuslöydös: vanha PRECACHE viittasi `/talentmaster/tm_eerikkila_normit.js` joka on `lib/`-alla → 404).
     Pidä PRECACHE minimaalisena (vain oma shell-HTML); versioidut JS-moduulit allowlist cachettaa pyydettäessä.
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
5. **Varhainen tekniikkamitali = longitudinaalinen vahvistus (vahvin signaali).** Tekniikkakilpailun **kulta/hopea U8–U12** todistaa että tekninen ohjelma rakentui plastisimmassa ikkunassa → **motorinen automatisaatio** (taito siirtyy tietoisesta kontrollista alitajuntaan) → vapauttaa kognitiivista kapasiteettia peliälylle (D4) 3–5 v myöhemmin. *Palloliitto: "Peliä on mahdollista havainnoida tehokkaasti vasta kun motoriset suoritukset ovat saavuttaneet riittävän tason."* **Eri luokan löytö** kuin korkea D2 tänään (joka voi olla myöhäiskehitystä tai yksittäinen testipäivä). → Hidden Gem -porras "Tekninen varhaiskehitys vahvistettu".

**Toteutus:** tekniikkakilpailutulokset ovat `testitulokset/`-alikokoelmassa (`merkki`/`ika`/`pvm`), mutta §26 = ei alikokoelmakyselyjä renderöinnissä → **pikakenttä** `tekninen_varhaiskehitys: {merkki, ika, pvm}` (null jos ei) lasketaan tuonnissa/recalcissa pelaajan tekniikkakilpailuhistoriasta (paras kulta/hopea kun ika 8–12).

**Käytännön rajoite (2026-06):** pilottidatassa ei vielä PHV:tä → Hidden Gem porrastettava: **ehdokas** (korkea D2 + matala D1, toimii nyt) → **vahvistettu** (+ PRE-PHV, kun bio-ikä mitattu) → **varhaiskehitys vahvistettu** (+ tekniikkamitali U8–U12, longitudinaalinen).

---

## 29. SULJETTU KEHITYSSILMUKKA — Testi→Diagnoosi→Resepti→Seuranta (Master_v16 Kehitys, 2026-06)

> Suunnitelma 4 vaihetta: **1** detail-paneelit · **2** kehitysvauhti/delta · **3** kehitysikkunat · **4** reseptimalli. VAIHE 1–2 toteutettu.

**VAIHE 1 — detail-paneelit** (`_avaaDetail` → `_buildHHDetail`/`_buildTSIDetail`/`_buildTKIDetail`, modal `#detailModal`). KPI-kortin (H-H/TKI/TSI, →-vihje) klikkaus → mistä numero koostuu + Eerikkilä-normivertailu + suositus.
- Normit lennossa: `eerikkilaTaso` + uusi **`eerikkilaNormiarvo(testi,ika,sp)`** (taso-3 kynnys = ikäluokan keskitaso, "Normi"-sarake). `lib/tm_eerikkila_normit.js` ladataan Masteriin (`?v=1`).
- Ikä/sp: `syntymaVuosi` tai **joukkuenimi-fallback** ("SJK P15"→15/M) — pilottidatassa syntymaVuosi usein puuttuu.
- **⚠️ MAS-yksikkö:** data on **km/h**, Eerikkilä-normi **m/s** → `eerikkilaTaso(mas/3.6,…)` laskentaan, normi ×3.6 näyttöön. Ilman muunnosta MAS näyttää aina tasoa 5. (30m/CMJ/SM-juoksu ei muunnosta.)

**VAIHE 2 — kehitysvauhti (delta)** — "kertoo kehittyykö pelaaja, ei vain missä on".
- Uudet pelaajakentät **`hh_taso_edellinen`/`tki_edellinen`** (+`_pvm`). Vangitaan **vain aidolla uudella testillä** — **pvm-vahti** `vanhaPvm !== uusiPvm` (Excel-pää­tuonti `p._firestoreData`:sta + recalcIkaluokasta). Estää re-importin nolladeltan.
- **recalcHH EI vangitse edellistä** (laskee saman datan uudelleen = norm-migraatio, ei kehitys). Vangitseminen vain aidossa uuden testin tuonnissa.
- Näkymä: Master KPI-badge `_deltaBadge` (↑+ vihreä / ↓− punainen / → harmaa, H-H 1 des / TKI 0 des). VP `laskeJoukkueSuunta` (käytti jo `hh_taso_edellinen`) → pulssikortin H-H-suunta + **"(n/N parantunut)"**. Delta syttyy 2. testillä.

**Tämän kierroksen Kehitys-invariantit:**
- **renderDev kirjautuneena AINA Firestore** (`!_demo && _seuraId`, EI `_pelaajatData.length>0`) → tyhjällä datalla lataustila, ei demo-/TMBus-seediä tuotannossa.
- **Joukkue-haku case-insensitive fallback** (`_lataaPelaajat`): Firestore `where` on case-sensitive → "SIBBO-VARGARNA P10" ≠ "Sibbo-Vargarna P10" → 0 osumaa. Jos tarkka kysely = 0, hae kaikki seuran pelaajat + suodata clientissa case-insensitively (joukkue/joukkueet[]).
- **D1/D2-KPI näkyy kun `d1_taso`+`d2_taso` olemassa** — recalcHH kirjoittaa `d1_taso`:n (✅ ajettu SJK 2026-06-15, 58/61), §26. Seurat ilman H-H-recalcia → KPI piilossa (ei lennossa-johtoa raakadatasta).
- KPI-prioriteetti (`_renderPinfoFirestore`): M1 FLEI→H-H, M2 TKI→TSI, M3 D1/D2 (ei JOUKKUE). "Näytä mitä on, piilota mitä ei" — ei "Ei mittauksia".

---

## 30. KPI MASTER ARCHITECTURE — kanoninen viite indeksi-/mittari-/detail-työlle (2026-06-07)

> **Täysi kanoninen doc: [`docs/KPI_MASTER_ARCHITECTURE.md`](docs/KPI_MASTER_ARCHITECTURE.md)** — 17 testiä, 10 indeksiä,
> detail-spec, signaalit, seuradatakartta, Firestore-kenttäluettelo, tutkimusperusta. Ristiriidassa **täysi doc voittaa**.
> Tämä §30 = tiivistys avainluvuilla. Lue ennen kaikkea indeksi-/mittari-/detail-paneelityötä.

**11 arkkitehtuuriperiaatetta (pysyvät):** raakadata Firestoreen, indeksit lennossa · Eerikkilä = SSOT fyysinen (5-port) ·
TK-merkkirajat = SSOT tekninen · H-H pujottelu/syöttö = FINAL2024 3-port · mittaus universaali, normit lokaalit ·
sama testi + eri protokolla → **molemmat rinnakkain** · data-tietoinen UI · **OVR ei aktivoidu ennen ≥3 dimensiota** ·
**FLEI = pohjavalmiusindeksi, EI dimensio** · **RAE-korjaus** (Q1 0.92 · Q2 0.96 · Q3 1.02 · Q4 1.06) ·
**PHV ohittaa kronologisen iän AINA**.

**Raakadata = 17 testiä:** D1 fyysinen `hh_viimeisin.{lin5m,lin10m,lin30m,cmj,sj,mas,kasirata}` (Eerikkilä 5-port) ·
`sm_juoksu`(D1→D2-silta)/`sm_pallo`(D2) · H-H tekniikka `pujottelu/syotto` (FINAL2024 3-port) ·
TK U8–13 (ponnauttelu/syöttö/pujottelu/kulj-laukaus/pituuspotku, merkkirajat) · FLEI 5 ketjua (SBL/SFL/LL/DIAG/DFL, 1–3).
FLEI-normalisointi `(arvo-1)/2×100` = 0–100 %; **<40 % → klinikkalähetys**. **MAS tallennettu km/h, normi m/s → ÷3.6 laskentaan.**

**Johdetut indeksit — Kerros B (koodi valmis, UI puuttuu, `docs/testit_indeksit.js`):**
- **EI** = CMJ − SJ (näytä kun SJ saatavilla; tavoite ikäkohtainen, esim. ≥5 cm)
- **FVP** = Lin5m / (Lin30m/6) — <0.90 nopeus · >1.10 voima · väliin tasapainoinen
- **VNE** = EI+FVP+nopeus → Räjähdys/Jousi/Moottori/Rakentaja/Perusta
- **OVR** = D1·0.40+D2·0.25+D3·0.15+D4·0.10+D5·0.10 — **EI VIELÄ** (vaatii ≥3 dim) + RAE-korjaus myöhemmin

**Pujottelu/syöttö — kaksi protokollaa, yksi rata:** H-H = populaationormi ("vertaa kaikkiin ikäisiin",
`eerikkilaTaso` 3-port) · TK = huippukynnys ("mitalitasolla?", `TK_MERKKIRAJAT`/`tkLaskeMerkki`) → **molemmat rinnakkain**.

**Detail-paneelien laajennukset (VAIHE 1 jatko, §29):** H-H-detailiin **EI/FVP/VNE** kun laaja H-H (SJ+lin5m) ·
TSI-detailiin **H-H pujottelu/syöttö** (3-port) kun saatavilla · TKI-detailiin **per-laji TK_MERKKIRAJAT-kynnykset**
(kulta/hopea/pronssi näkyviin) + kultaikkuna-konteksti (≤12 🔥 auki · 13–14 ⚡ sulkeutuu · ≥15 📊 toistot).

**Signaalit (kynnykset):** Hidden Gem = **D2≥3.5 + D1≤2.5 + erotus≥1.0** · X-Factor = mikä tahansa testi taso 5 ·
Kehitysvauhti ↓ delta<−0.3 / ↑ >+0.5 · FLEI<40 % → KLINIKKA · TSI>1.5s → PALLO ⚠️ · Kultaikkuna = ikä≤12 + TKI<40.

**Normifunktiot (lennossa, EI tallenneta):** `eerikkilaTaso(arvo,testi,ika,sp)` 1–5/1–3 · `eerikkilaNormiarvo(testi,ika,sp)`
taso-3-kynnys · `tkLaskeMerkki` · `tkLaskeTKI` (syöttö·0.40+pujottelu·0.30+ponnauttelu·0.20+KL·0.10) ·
`laskeEI(cmj,sj,ika)` · `laskeFVP(m5,m30,paikka)` · `laskeVNE(...)` · `laskeTSI(smPallo,smJuoksu)`.

**Seuradatakartta (LIVE 2026-06-15, Firestoresta luettu):**
**SJK** (n=61) = `d1_taso`/`hh_taso` 58 · `d2_taso` 56 · hh_viimeisin/tsi — **EI TKI/FLEI/PHV** · recalcHH ajettu ·
**Sibbo** (n=223) = `tki_viimeisin` 214 (+ kehityskohde/vahvuus, merkki usein null) — **EI H-H/FLEI/PHV** ·
**KPV** (n=34) = vain Topias-testipelaaja (FLEI + ketjut + TKI + d2 + PHV, ei d1/hh) ·
**palloiirot** (n=67) / **grifk** (n=145) = **pelkät rosterit, 0 mittausta** (odottaa testidataa).
`d1_taso` ✅ ajettu SJK:lle (§26). Täysi kartta + Firestore-kenttäluettelo: canonical doc §8/§11.

**Tutkimusperusta (roadmap, canonical doc §9):** FIFA 11+ Kids (Sprint 5) · FMS+YBT+CMJ-seulonta (Sprint 5–6) ·
rotaatiotaito/DIAG-harjoitteet (Sprint 5) · bio-banding = kehitysikkunat (VAIHE 3) · quadrant/HRV (Sprint 6+).

---

## 31. TK PER-LAJI VIITETASOT (Sprint 5)

> (Numero §31, koska §29 on jo SULJETTU KEHITYSSILMUKKA — sisältö = käyttäjän "§29 TK per-laji"-linjaus.)

Tekniikkakilpailu = **kokonaisaikakilpailu**. Mitali jaetaan **VAIN kokonaisajasta** (`TK_KOKONAISRAJAT[sp][ika]`,
`tkLaskeMerkki(kokonaistulos, ika, sp)`). **Per-laji mitaleja EI OLE — SPL ei anna niitä.**

`docs/testit_indeksit.js`: **`TK_MERKKIRAJAT` per-laji EI OLE koodissa** — vanhat kommentit riveillä 290/299 ovat
harhaanjohtavia (kuvaavat rakennetta jota ei ole / viittaavat poistettuun dataan). Per-laji-kynnyksiä ei ole;
`TK_LAJIT_META` sisältää vain nimi/yksikkö/suunta. Per-laji-ulottuvuus joka on olemassa = **suhteellinen
vahvuus/kehityskohde** (lajin osuus kokonaisajasta, `_laskeVahvuudetJaKehityskohteet`).

**✅ TOTEUTETTU 2026-06 (§34):** per-laji viitetasot ovat **`TK_LAJIVIITTEET`** (testit_indeksit.js; P8–13 + T8–13,
`_lahde` valtakunnallinen/alueellinen). Per-laji-taso = **VIITETASO** loppukilpailu-/aluedatasta (`tkLajiViite` → erinomainen/hyvä/kehitettävä),
**EI mitali** — tämä invariantti SÄILYY (mitali jaetaan vain kokonaisajasta). TK-raaka-arvot tallennetaan pikakentiksi (`tk_lajit_viimeisin`, §26).
Sekuntibudjetti/gap/vauhti johdetaan näistä (§34). Eliittiviite näkyy VP-Yhteenvedossa, valmentajan TKI-detailissa ja pelaajan tavoiteriveissä.

**Detail (kokonaiskuva):** kokonaisaika-mitalirajat (🥇/🥈/🥉 `TK_KOKONAISRAJAT`) + per-laji-eliittiviite (`TK_LAJIVIITTEET`, §34) +
suhteellinen vahvuus/kehityskohde (★/←). Ks. myös §23 (TKI aikapohjainen) + §34 + canonical doc §3/§4.

---

## 32. VIESTIKETJU — roolien välinen kommunikaatio (2026-06-07)

> Kaikki viestintäpolut Firestore-pohjaisia (persistoituja). TMBus = demo-yhteensopivuus.
> Rules: `viestit/` (v2.3), `havainnot/` (v3.4) — molemmat livenä, ei deployta tarvita.

### Polut ja Firestore-rakenteet

| Suunta | Firestore-polku | Tyyppi/kenttä | Luku | Kirjoitus |
|---|---|---|---|---|
| **VP → Valmentaja** | `seurat/{sid}/viestit/{id}` | `lahettajaUid`, `vastaanottajaUid`, `teksti`, `aika`, `luettu`, `fromRole:'vp'` | Master_v16 `_kuunteleVpViestit()` (onSnapshot, `vastaanottajaUid==uid`) | VP_v25 `lahetaMentorointiViesti()` |
| **Valmentaja → Pelaaja+Vanhempi** | `seurat/{sid}/pelaajat/{pid}/havainnot/{id}` | `tyyppi:'valmentaja_viesti'`, `tila:'valmis'`, `teksti`, `valmentajaNimi`, `pelaaja_lukenut`, `vanhempi_lukenut` | Pelaaja_v7 `_p6KaynnistakuuntelIja` (onSnapshot) · Vanhempi_v2 `.where('tyyppi','==','valmentaja_viesti')` | Master_v16 `sendReply()` |
| **Pelaaja → Valmentaja** | `seurat/{sid}/pelaajat/{pid}/kirjaukset/{pvm}` | `tyyppi`, `kesto_min`, `fiilinki`, `rpe`, `lahde:'pelaaja'`, `paivitetty` (serverTimestamp) | Master_v16 `_lataaKirjaukset()` (`.orderBy('paivitetty')`) | Pelaaja_v7 `_tallennaKirjaus()` |
| **Vanhempi → Pelaaja** | `seurat/{sid}/pelaajat/{pid}/kehut/{id}` | `emoji`, `teksti`, `lahettaja:'Vanhempi'`, `luotu`, `nahty`, `kirjausId` | Pelaaja_v7 `_haePerhekehu()` (luotu>=48h, nahty==false) | Vanhempi_v2 `_lahetaKehu()` |
| **Vanhempi ← Valmentaja** | sama `havainnot/` kuin yllä | | Vanhempi_v2 Viestit-tab | (kuten yllä) |

### Master_v16 Inbox — yhdistetty syöte
`_getInboxEvents()` yhdistää `_kirjaukset` (pelaajien omatoimiset) + `_vpViestit` (VP:n mentorointi),
järjestää aikaleiman mukaan. VP-viestit purple-tagilla `note.to_coach`, pelaajien kirjaukset fiilis-emojilla.
Reaktiot (❤️💪⭐🔥) + "Viestitä perheelle →" -nappi jokaisessa kortissa.

### Korjatut bugit (2026-06-07)
- **`fiilinki_paivitetty` → `paivitetty`** (Master_v16): kirjaukset eivät näkyneet valmentajalle koska orderBy-kenttä ei ollut olemassa. Lisätty Timestamp `toDate()`-käsittely.
- **`from/to` → `lahettajaUid/vastaanottajaUid`** (VP_v25): Security Rules odottivat eri kenttänimiä kuin koodi kirjoitti.

### Ei toteutettu (tietoinen rajaus)
- ✅ ADAR-pikakenttien kirjoituspiste KYTKETTY (2026-06-15): ADAR_Pikakortti `saveCard()` replikoi kanonisen logiikan (§26)
- Sähköposti-/push-notifikaatiot — pilotissa ei tarvita, lisätään Sprint 6–7
- Pelaaja ei voi vastata valmentajalle (yksisuuntainen toistaiseksi)

## 33. SKAALAUTUVUUS & TEKNINEN VELKA — Sprint 6 + SaaS-suunta (2026-06-07)

Täysi suunnitelma: **`docs/SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md`** (kanoninen). Tislaus:

**Lähtötila:** datakerros (multi-tenant, server-authz, domain-logiikka) skaalautuu. Este avoimelle
kehitykselle = insinöörikuri puuttuu: 0 testiä, ei index-as-codea (lisätty nyt), Rules käsin Consolesta,
frontend 6 000-rivisiä monoliitteja, funktio-törmäyksiä. Tähänastiset bugit = **hiljaisia failit**.

**Sprint 6 (P0) — maksa ennen toista kehittäjää:**
- A1 ✅ VALMIS: `firestore.indexes.json` = täydellinen totuus (9 indeksiä + 1 field override, vedetty `firebase firestore:indexes`-dumpilla) + deployattu tuotantoon + `firebase.json` kytketty. Composite-queryt voivat nyt palata server-side-muotoon (luopua limit-ikkuna-kompromissista 333c36a/786f43e).
- A2 ✅ VALMIS: **Vitest** (`npm test`=`vitest run`), `tests/*.test.js` = 85 testiä vihreät (testit_indeksit 64 + eerikkila 21, sis. MAS km/h→m/s -saturaatioregressio) + CI `.github/workflows/test.yml` (`npm ci && npm test`). Root package.json oli väärin nimetty tsconfig → tsconfig.json. Lisää vielä: TSI-vyöhykerajat, Hidden Gem, ADAR.
- A3 ✅ VALMIS: `laskeEI/laskeFVP` eerikkilä-libissä → `_simple` + backward-compat alias (Master lataa molemmat→rikas objekti; VP vain eerikkilän→simple numero). `tkLaskeMerkki/tkLaskeTKI` saivat `rajatOverride`-paramin + `<=→<` (§23).
- A3 funktio-törmäysten purku (laskeEI ym. 2 tiedostossa, last-loaded-wins) — A2:n edellytys.
- A4 ✅ VALMIS: **Rules-testit** (`@firebase/rules-unit-testing` v5 + Vitest), `tests/rules/firestore.rules.test.js` = 69 testiä (10 describe-ryhmää: SA, tenant isolation, anon PIN, roolipohjainen kirjoitus, huoltaja, viestit, kehut-yksityisyys, kalenteri field-level, suostumukset, IDP-jono). CI `.github/workflows/test.yml` kaksi jobi: `unit-tests` (npm test, ei emulaattoria) + `rules-tests` (Java 21 + firebase emulators:exec). Ajo lokaali: `npm run test:rules` (vaatii Java ≥21). `npm test` excludaa rules-testit (ei tarvitse emulaattoria). HUOM: GitHub Actions 403 = Rules **deploy** ongelma (SA-rooli), ei koske emulaattori-testejä.
- A5 ✅ VALMIS: `luotu` kaksi vikaluokkaa korjattu — tyyppi-mismatch (Master ISO) + **puuttuva kenttä** (Pelaaja kirjaukset ilman luotua → 144 kirjausta näkymättömiä vanhemmille). Plan B kaikki 4 stepiä: (1) Rules-vartija `luotuLuontiKelpaa`/`luotuPaivitysKelpaa` (havainnot/kirjaukset/kehut, affectedKeys-update) + 6 rules-testiä. (2) writer-fix: Master 3498/3537→serverTimestamp, Pelaaja→`Timestamp.fromDate(new Date(pvm))` (TUOTEPÄÄTÖS luotu=treenipäivä, paivitetty=kirjaushetki); cascade `_luotuToMs()` 3861/3879/5508 + `adar_pvm` ISO-stringinä (VP-turva). (3) migraatio `scripts/migrate_luotu_a5.js` (REST, idempotentti): 145 docia (1 havainto + 144 kirjaus-backfill pvm:stä), 0 virhettä. (4) vartija deployattu (CLI), live-ruleset REST-varmistettu. **Myöhemmin:** sama `aika`-kentälle (mentoroinnit, VP+tm_import) — oma vartija+writer-fix.
- A6 repo-siivous: poista Master_v9/Pelaaja_v3, yhdistä tm_auth.js/tm-auth.js, versio pois tiedostonimestä.
  - **`src/lib`-duplikaattien reconciliointi (löydös 2026-06-15):** `lib/` = kanoninen + deployattu (Pelaaja lataa `lib/tm-microcycles.js?v=2`); `src/lib/`-puuta EI lataa kukaan (vain itseviittaavia kommentteja, ei vite.configia juuressa). `src/lib/tm-microcycles.js` (vanhempi placeholder) divergoi `lib/`-versiosta (uudempi: deps+PANKKI-injektio) jo ennen termikorjausta — **ei käyttäjävaikutusta** (Pelaaja saa lib/). Sama todennäk. `src/lib/tm-prescription.js`/`tm-kortit.js`/`tm-methodology.js`. **Korjaus kertaluontoisesti:** tee jokaisesta `src/lib/`-stale-duplikaatista re-export `lib/`-versioon (kuten `src/lib/harjoitelogiikka_v4.js`) TAI poista `src/lib` jos B1-Vite-migraatiota ei aloiteta. EI tiedosto kerrallaan. HUOM: `src/lib/tm_bioika.js` (§25) auktoritatiivinen — ei kosketa; `src/lib/harjoitelogiikka_v4.js` jo re-export.

**⚠ DEPLOY-TYÖNKULKU (versio-tarkistus):** GitHub Pages cachettaa HTML:n 10 min (max-age=600) → moni "ei toimi" on ollut cache. Ratkaisu: `version.json` + `APP_VERSION` jokaisessa apissa (Master/Pelaaja/Vanhempi), `<head>`-skripti pakottaa reloadin uudesta versiosta. **Ennen käyttäjille tärkeää pushia aja `npm run version:bump`** (leimaa version.json + apit) → selaimet hakevat tuoreen version automaattisesti. Jos unohtuu, käyttäjä näkee vanhaa ≤10 min tai hard-reloadiin asti.

**SaaS-suunta:** B1 frontend moduuleiksi (Vite, strangler) · **B2 observability ✅ VALMIS (2026-06-15)** · B3 tenant-self-service onboarding · **B4 GDPR (alaikäisten dataa EU — riski + kilpailuetu): retention, oikeus tulla unohdetuksi, audit, field-level Rules** · B5 suorituskyky/kustannus · B6 datamallin versiointi · B7 white-label/API/AI-insightit.
- **B2 ✅ VALMIS (2026-06-15):** Sentry Browser **v10.58.0** errors-only `bundle.min.js` (`tracesSampleRate:0`, EI Session Replayta → tietoisesti EI Loader Scriptiä joka kytkisi replayn; alaikäisdata), **EU-region** `ingest.de.sentry.io`. `beforeSend`/`beforeBreadcrumb` **PII-skrubi**: deny-list (`email|nimi|etunimi|sukunimi|huoltaja|pin|puhelin|osoite`→`[redacted]`) + email→`[email]` + 4-num→`****` + `user`→`{id}` + query/cookies/headers pois; `sendDefaultPii:false`; skrubin heitto→event drop. **GUARD** (Sentry/DSN puuttuu→no-op, offline-first säilyy). **SRI-integrity** (verifioitu palvellusta tiedostosta, ei docsista). **SW** `tm-pelaaja-v7`/`tm-vanhempi-v5`, `tm_sentry.js` allowlistissa, Sentry CDN+ingest pass-through. Scope: Pelaaja_v7/Vanhempi_v2/Rekisterointi + jaettu `tm_sentry.js` (`window.tmSentryContext` = pseudonyymitagit `app/seuraId/rooli/uid`). Commitit `1e8cb59`→`723f062`→`6c4c5a5`. **Verifioitu tuotannossa** (testievent EU-dashboardiin, PII todennettu).
- **Onboarding-integriteetti ✅ A tehty (2026-06-16):** ennaltaehkäisevä client-validointi (**warn-not-block**, ei uutta infraa, käyttää jo ladattua dataa) — dup `huoltajaEmail` (Seura+Admin massakutsu-confirm + Seuran pelaajatallennus `luoRekisteriLinkki` vs rosteri `_pelaajatKaikki`) · dup PalloID / nimi+joukkue + puuttuva PalloID (Excel_Tuonti-esikatselupaneeli; Excel = testidata, ei emailia). Operaattori kuittaa (sisarukset/jaettu email laillisia → ei pakkoesto). **B1 ✅ tehty (2026-06-16):** audit-loki laajennettu aukkoihin (`functions/index.js`: `huoltajakutsu_lahetetty`/`suostumus_annettu` = `info` + `suostumus_estetty_email_ristiriita` = **`alert`** = väärä-lapsi-yritys, best-effort `.catch`), uusi `haeAuditLoki`-callable (europe-west1, SA-gate `admins`-doc; severity-suodatus CF:ssä → **ei composite-indeksiä, ei index-deployta**) + Admin **"Audit-loki / Hälytykset"** -näkymä (read-only, alert amber-korostus, "vain hälytykset" -suodatin). Audit pysyy ei-client-luettavana (**EI Rules-deployta**). **B2 (Firestore-trigger client-kenttämuutoksille, esim. huoltajaEmail-vaihto) avoin.**

---

## 34. TKI-ANALYYSIMALLI — kolme viitekehystä + kehitysvauhti (2026-06)

> **Täysi kanoninen doc: [`docs/TKI_ANALYYSIMALLI.md`](docs/TKI_ANALYYSIMALLI.md)** — viitekehykset, roolinäkymät (VP/valmentaja/pelaaja),
> kehitysvauhti, H-H-triangulaatio, datalähteet. **Ristiriidassa täysi doc voittaa** (sama pattern kuin §30). Tämä §34 = tislaus.
> Täydentää §23 (TKI aikapohjainen) + §31 (per-laji = viite, ei mitali) + §26 (pikakentät). Suljettu ketju: sama totuus VP:lle, valmentajalle ja pelaajalle.

**Kolme viitekehystä — sama tulos, kolme vertailua:**
- **A Kriteeriviite (mitali):** `TK_KOKONAISRAJAT[sp][ika]` — 🥇🥈🥉 **VAIN kokonaisajasta**. Kertoo TASON.
- **B Eliittiviite (per-laji):** `TK_LAJIVIITTEET[sp][ika][laji] = {erinomainen, hyva}` + `_n` + `_lahde`. **EI mitali** (§31). Kertoo KOHTEEN + MÄÄRÄN (sekunteina).
- **C Populaatioviite (H-H):** FINAL2024 3-portainen (`eerikkilaTaso`, vain pujottelu+syöttö). Kertoo POHJAN.

**`TK_LAJIVIITTEET` (testit_indeksit.js + inline-kopiot Excel/VP):** kattavuus **P8–P13, T8–T13**. erinomainen=P25 · hyva=P50 ·
pituuspotku_bonus käänteinen (P75/P50). Lähteet: **valtakunnalliset** loppukilpailut 2023–25 (P9/P10/P12 + T9/T10/T11/T12) ·
**alueelliset** = Palloliiton tuloskooste 2023–25 (~60 kilpailua / 4 aluetta, 3 477 pelaajaa dedup, top-20 kokonaisajalla) (P8/P11/P13/T8/T13, kaikki _n=20).
**UI-label AINA `_lahde`-kentästä:** valtakunnallinen→"Loppukilpailutaso 2023–25" · alueellinen→"Alueellinen huipputaso 2023–25" · `_n<10`→"(n=X)" (ei enää laukea).
**EI interpolointia** puuttuville ikäluokille (`tkLajiViite` → null kun ika<8 / >13; radat ikäluokkakohtaisia). Vuosipäivitys:
`docs/data/parse_taitokisa.py` (valtak.) + **`parse_taitokisa_csv.py`** (alue, lisää uusi CSV) → regeneroi `docs/tk_lajiviitteet.js` → synkkaa inline-kopiot. **Koko historia 2013–22 EI viitteisiin** (taso noussut).

**`TK_LAJITASOT` (1–5 populaatioviite — neljäs vertailutaso, testit_indeksit.js + VP_v25):** kohortin P20/P40/P60/P80-rajat
KOKO kilpailupoolista (ei top-20). `tkLajiTaso(laji, arvo, ika, sp)` → 1–5 **STRICT <** (maksimiajat 40/60 s → taso 1;
välitasot voivat degeneroitua nuorimmissa). Valmentaja/VP-viite + tuleva D2/OVR-input — **pelaajalle EI tasolukua (§7.22)**;
H-H pujottelu/syöttö FINAL2024-normilla, TK-tulos TK_LAJITASOT:illa — **ei ristiin (§30)**. Otos = kilpailukohortti, ei väestönormi.

**Kanoniset funktiot (testit_indeksit.js, §23):** `tkLajiViite(laji,ika,sp)` →{erinomainen,hyva,n,lahde}|null · `tkLajiGapit(tkLajit,ika,sp)`
(järjestetty gap laskevasti) · `tkSekuntibudjetti(kokonaistulos,ika,sp)` →seuraava saavuttamaton mitali (`<` ei `<=`; <kulta→null) ·
`tkVaadittuVuosivauhti(ika,sp,taso)` (= `[ika]−[ika+1]`; **9→10 null** rata muuttuu; ika+1>13 null) · `tkAbsDelta(...)` →{abs_s, validi, bonus_osuus_s}.

**KAKSI DELTAA -INVARIANTTI (§3.2 — EHDOTON):** abs-delta (kehittyikö suoritus) JA TKI-delta (riittikö vauhti ikäluokkavaatimukseen)
näytetään AINA erikseen. **TKI-laskua EI saa näyttää punaisena jos abs-delta on positiivinen** (pelaaja kehittyy, vaatimus koveni enemmän).
**Pelaajalle TKI-laskua ei näytetä lainkaan** (§16/§7.22) — vain abs-parannus kun positiivinen. Vaadittu vuosivauhti ~5–10 s/v;
**P11→P12 −20 s** (sis. uuden pituuspotkubonuksen → `tkAbsDelta.bonus_osuus_s` erottaa aidon parannuksen bonuksesta).

**Roolinäkymät (sama data, kolme kieltä):** VP_v25 joukkue-Yhteenveto + Tuki (§19) · valmentaja Master TKI-detail (§29/§30) ·
pelaaja MINÄ-tavoiterivit + TÄNÄÄN-saate (§16). Kaikki pikakentistä (§26), ei alikokoelmakyselyjä.
