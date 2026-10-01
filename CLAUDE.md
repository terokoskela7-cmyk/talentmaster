# CLAUDE.md — TalentMaster™ Master Briefing

> Ensimmäinen tiedosto jonka liität uuteen Claude-sessioon. Keskittyy **teknisiin invariantteihin**.
> Strategia, RAE-tiede, kansainvälistyminen, bisnesmalli, sprintit ja avoimet tehtävät: **`docs/STRATEGIA.md`**.
> Operatiivinen roadmap-historia: `docs/ROADMAP.md`. Solo-tuotteen täysi kuvaus: `docs/ARKKITEHTUURI.md §11`.
> Viimeksi päivitetty: 2026-09-29 — **tiivistys:** sovellus-, mittari-, biologia- ja infrayksityiskohdat ovat laiskoissa taidoissa (`.claude/skills/tm-*`, ks. §40). Muutoshistoria on git-lokissa.

---

## 0. ÄLÄ KOSKAAN — ehdottomat säännöt (voittavat kaiken muun)

**Työnkulku**
- **Claude/Code ei pushaa mainiin eikä mergeä.** Jokainen muutos omalle haaralle `origin/main`in päältä → PR. Tero mergeää.
- **Git-historiaa ei kirjoiteta uudelleen:** ei force-pushia, ei rebasea jaetulle haaralle, ei `commit --amend`ia pushattuun.
- **Ruotsinkieliset tekstit vain Geminin kautta.** Claude/Code ei kirjoita sv-käännöksiä eikä sv-luonnoksia; uudet sv-avaimet jätetään tyhjiksi / odotuslistalle.
- **ÄLÄ aja `npm run version:bump` feature-haaroissa** — `bump-version.yml` hoitaa sen mainissa (§33 taidossa `tm-infra`).
- **ÄLÄ vaihda GitHub Pages -lähdettä "branch"-tilaan** — lähde on "GitHub Actions" (`deploy-pages.yml`).

**Testaus ja data**
- **Toiminta varmistetaan seurakäyttäjällä, ei SA:lla.** SA näkee kaiken, joten SA-testi ei todista oikeuksia.
- **Suojatut alaikäiset: vain luku.** Ainoa sallittu testipelaaja kirjoituksille ja kirjautumiselle on **Topias** (§10).
- **Pikakenttäpari päivitetään atomisesti** (`hh_viimeisin`+`hh_pvm`, `tki_viimeisin`+`tki_pvm` jne. samasta testituloksesta) — §26 taidossa `tm-mittarit-ja-testit`.

**Turva ja tietosuoja**
- **Tunnukset repon ulkopuolella; API-avaimet eivät koskaan selaimeen** (Secret Manager + `runWith({secrets})`, §39).
- **§7.22 lapselle:** ei XP/progressbaria/loss aversion -kieltä, ei tasolukuja, ei vertailua muihin, ei TKI-laskua pelaajalle eikä vanhemmalle.
- **Rules:** jokainen alikokoelma oma `match`-blokki (§7.15), muutos = versio + changelog + Rules-testi, deploy vain CI:llä (§12).
- **Uusi appi joka koskee backendiin → App Check pakollinen** (§38).
- **Service Worker cachettaa vain omat tiedostonsa** (allowlist, §27.4).
- **Ei anonyymiä pääsyä Rulesiin eikä callableihin.** Suljettu v3.28:ssa (Vaihe 0 / PR 3). Pelaajan pääsy = `onPelaajaItse` / `onPelaajanSeura`, Solo-lapsen = `onSoloLapsiItse`; callableissa pelkkä `context.auth` ei riitä.
- **Ei uusia tekoälykutsuja EU:n ulkopuolelle.** Käytä Bedrock EU:ta (`tarkistaBedrockEU`) tai muuta EU-reittiä. Suora OpenAI tai Anthropic vain kehityslipun takana.

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
Projekti `talentmaster-pilot`. Konfiguraatio on sama jokaisen sovellus-HTML:n alussa (`firebaseConfig`) — kopioi sieltä, älä kirjoita käsin.

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
9. **Firestore Rules deployataan CI:llä** — `.github/workflows/deploy-rules.yml` ajaa main-pushissa emulaattoritestit (`tests/rules`) ja sen jälkeen `firebase deploy --only firestore:rules,firestore:indexes,storage`. EI käsin Consolesta (vanha 403-ohje on historiaa).
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
| `tm_admin/firestore.rules` | Security Rules **v3.31** — deploy CI:llä (`deploy-rules.yml`, main-push, emulaattoritestit ensin) | ✅ §12 |
| `lib/tm_bioika.js` | Bio-ikä — Mirwald 2002 PHV (Excel-verifioitu) + KR-runko (lukittu) | ✅ §25 |
| `docs/testit_indeksit.js` | Canonical TKI/TSI/FLEI-laskenta + TKI-analyysimalli (§34) | ✅ §23/§34 |
| `docs/TKI_ANALYYSIMALLI.md` | Kanoninen TKI-analyysimalli (3 viitekehystä + kehitysvauhti) | ✅ §34 |
| `docs/tk_lajiviitteet.js` | Generoitu `TK_LAJIVIITTEET` (SSOT mergelle, älä poista) | ✅ §34 |
| `docs/data/taitokisa_*.json` + `parse_taitokisa*.py` | TK-viitedatan raakadata + parserit (vuosipäivitys) | ✅ §34 |
| `docs/KALENTERI_ARKKITEHTUURI.md` | Kanoninen kalenteri-arkkitehtuuri + K1–K6-suunnitelma + kv-benchmarkit | ✅ §35 (K1 valmis) |
| `docs/KORTTI_VISIO.md` · `docs/KORTTI_KATALOGI.md` | Keräilykortti-visio + datavetoinen rekisteri (Vaihe 0–1.5 rakennettu) | ✅ §36 |
| `docs/OPAS_VP_JA_VALMENTAJA.md` · `docs/OPAS_PERHE.md` | Käyttäjäoppaat (henkilöstö · perhe) | ✅ §37 |
| `docs/INAPP_ALOITUSOPAS_SPEC.md` · `docs/MDT_RAPORTTI_SPEC.md` · `docs/SUOSTUMUS_INTEGRITEETTI_2026-06-23.md` | In-app-opas + Pelaajaraportti-roolit + suostumus-integriteetti | ✅ §37/§33 |
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
| yilves | Ylöjärven Ilves | lauri.veittikoski@ylojarvenilves.fi | **seuraId `yilves`** (EI `yvies` — vanha placeholder, älä käytä); VP Lauri Veittikoski |
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

## 12. FIRESTORE SECURITY RULES — `tm_admin/firestore.rules` v3.31

**DEPLOY = CI** (`.github/workflows/deploy-rules.yml`): main-pushissa ensin emulaattoritestit (`npm run test:rules`, Java ≥21), sitten deploy. Nykyversio **v3.31** (v3.31: kayttajat-pääsykentät + poisto vain palvelimella · v3.30: PIN vain palvelimella · v3.29: playerCodes list suljettu · Vaihe 0 / PR 3: **anonyymi pääsy suljettu** — ei `onAnonymous`-funktiota, vartijatesti estää paluun). Jokainen muutos: versio + changelog tiedoston alkuun + Rules-testi. Sääntöjä EI muokata Consolesta.

**Tunnistetyypit (vain nämä avaavat dataa):**
- **Henkilökunta** — sähköposti/Google, claim `seuraId` + `rooli` → `onOmaSeura` / `onJohtoRooli` / `onValmentajaRooli`
- **Seuran pelaaja** — `pelaajaKirjaudu` (PalloID + PIN tai linkki `{seuraId, pelaajaId}` + PIN; PIN 4 tai 6 numeroa, lukitus myös pelaajakohtainen `p_` yli reittien) → custom token `{ rooli:'pelaaja', pelaajaSeuraId, pelaajaId }` → `onPelaajaItse(sid, pid)` / `onPelaajanSeura(sid)`. ⚠ claim on `pelaajaSeuraId`, EI `seuraId` (muuten `onOmaSeura` avaisi koko seuran).
- **Huoltaja** — sähköposti → `onLapsenHuoltaja` (pelaajan `huoltajaEmail`)
- **Solo-vanhempi** — `players.parent_uid == auth.uid`; **Solo-lapsi** — `soloLapsiKirjaudu` → `{ rooli:'solo_lapsi', soloPlayerId }` → `onSoloLapsiItse`
- **SA** — `admins/{uid}` tai claim `super_admin`
- **Anonyymi** — EI mitään pelaaja-/Solo-dataa. Läpäisee vain roolittomat `onKirjautunut()`-ehdot (errors create, kaaviot-luku, playerCodes get) kunnes Anonymous-provider suljetaan Consolesta.
- **Henkilökunnan pääsy (v3.31, P0):** deaktivointi/aktivointi/poisto/roolinvaihto VAIN callableilla (`deaktivioiKayttaja` / `aktivoiKayttaja` / `poistaKayttaja` / `vaihdaKayttajanRooli`): Auth `disabled` + claimit + token-mitätöinti + `vp_uid` samassa. Rules eivät tarkista `aktiivinen`-kenttää — pääsy katkeaa vain Authista.
- **Callablet:** `context.auth` EI riitä → `tarkistaOikeus` (henkilökunta) tai `authz_paatos.tunnisteTyyppi` / `kuittausPaatos`.
- **PIN VAIN PALVELIMELLA (v3.30, PR 4):** selain ei kirjoita `pin`-kenttää (myös SA) eikä Solon `child_pin`:iä. PIN asetetaan `asetaPelaajanPin` / `luoPinitSeuralle` / `vahvistaSuostumus` / `soloHyvaksyLupa` -funktioissa, jotka kirjoittavat hajautuksen (`_pelaajaPin` / `_soloPin`) ja selväkielisen jakokopion samassa erässä. Oikeus: johto/SA koko seura, joukkueen valmentaja oma joukkue. Uudet PIN:t 6 numeroa (`crypto.randomInt`, ei triviaaleja).

**KRIITTISIN MUISTISÄÄNTÖ:** Rules EI periydy alikokoelmiin. Jokainen alikokoelma vaatii oman `match`-blokin.
`match /seurat/{id} { allow read }` sallii vain SEURADOKUMENTIN. (v2.0:n puuttuva `seurat/{id}/pelaajat/`
-blokki aiheutti KAIKKI permission-deniedit koko sessiossa.)

### Funktiot + keskeiset blokit
```javascript
onPelaajaItse(sid, pid) / onPelaajanSeura(sid)  // pelaajatoken (v3.25) — anonyymi poistettu v3.28
onSoloLapsiItse(playerId)                       // Solo-lapsen token (v3.26)
onSuperAdmin()  // custom claim super_admin TAI admins/{uid} exists  ← ei tarvitse Custom Claimsia
onOmaSeura(id)  // custom claim seuraId
onJohtoRooli()  // vp|urheilutoimenjohtaja|seurasihteeri
onValmentajaRooli() // + valmentaja|talenttivalmentaja|...   onOmanSeuranValmentaja(seuraId)

seurat/{id}/kayttajat/{uid}:           read: onSuperAdmin() || (onOmaSeura() && onJohtoRooli()) || oma UID
seurat/{id}/pelaajat/{pid}:            read: onSuperAdmin()||onSeuranJasen;  write: onSuperAdmin()||onHallinto||valmentajaroolit
seurat/{id}/pelaajat/{pid}/havainnot/{hid}:  read: onSuperAdmin()||onOmaSeura()||(onPelaajaItse()||onLapsenHuoltaja() && nakyvyys=='pelaaja');  write: onOmanSeuranValmentaja()||onSuperAdmin()  ← ADAR Pikakortti
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

**Invariantit (siirretty otsakkeen muutoshistoriasta 29.9.2026, sanatarkasti):**
- **JOUKKUENIMI-INVARIANTTI (kausi-vuosi):** ikäluokan T/P-numero = `year(nyt) − syntymävuosi` (kausi 2026: 2014→T12 · 2015→T11 · 2013→T13). ⚠ ERI KUIN testivuoden numero — 9 olemassa olevaa Sibbo-pelaajaa + roster korjattu tähän
- **METODOLOGIA-INVARIANTTI (vahvistettu):** H-H/TKI-taso = **tilannekuva testihetken iästä** (`normiIka(syntymaVuosi, testipvm)` §26, idempotentti), EI vanheneta nykyikään — 2025-tulos = "taso X ikäisekseen 2025", ei nykytila. **Datan ikä ESITETTÄVÄ** ettei valmentaja luule nykytasoksi

**Terminologia (julkinen kieli):** FLEI → kehon valmiusindeksi · fascia-linja → liikehallintaketju ·
jousitusindeksi → kimmovoima-indeksi · D4 → peliäly.

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
5. **Security Rules:** vain `tm_admin/firestore.rules` → PR → CI deployaa (§7.9, §12). Consolea ei käytetä.
6. **Chrome MCP:** Firestore-kirjoitukset app-tabista (Firebase alustettu)

---

## 38. APP CHECK — reCAPTCHA Enterprise (V2, monitoring-vaihe)

**Provider = reCAPTCHA Enterprise, EI klassinen v3** (Firebase vanhensi v3:n). Ero koodissa: `activate()`
ottaa **provider-instanssin**, ei avainmerkkijonoa.
```js
firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(KEY), true)  // OIKEIN
firebase.appCheck().activate(KEY, true)                                                      // v3-muoto, EI toimi
```

**`lib/tm_appcheck.js` = site keyn AINOA esiintymä.** Avain on julkinen (kuuluu clientiin); suoja on
domain-verifiointi + attestointi, ei salassapito. Portti `tests/appcheck_kytkenta.test.js` failaa jos
avain kopioidaan toiseen tiedostoon.

**Kaksi aktivointipolkua, yksi avain:**
- **compat (18 appia):** `<script>` app-check-compat **appin OMALLA SDK-versiolla** (repossa viisi:
  10.7.1 / 9.23.0 / 9.22.0-2) → `lib/tm_appcheck.js?v=1` → `tmAppCheckAktivoi()` **heti initin jälkeen**.
  ⚠ **ÄLÄ kovakoodaa yhtä versiota** — se olisi sekaversio 10 apissa.
- **modular (2 appia:** `tm_videopankki_admin.html`, `TM_LiikehallintaMatrix_v2.html`**):**
  `initializeAppCheck(app, {provider:new ReCaptchaEnterpriseProvider(window.TM_APPCHECK_SITE_KEY), …})`,
  avain luetaan jaetusta moduulista. `initializeAppCheck` **heittää jos sama appi aktivoidaan kahdesti**
  → matrixilla yksi alustuspolku `tmMatrixApp()` promise-cachella.

**JÄRJESTYS ON PAKOTTAVA:** aktivointi initin jälkeen ja **ennen ensimmäistä** Firestore/Auth/Functions/
Storage-kutsua — App Check ei liity jälkikäteen jo luotuun palveluinstanssiin.

**Uusi appi joka koskee backendiin → App Check PAKOLLINEN.** Portti johtaa kohdejoukon datasta (kaikki
`firebase-app`in lataavat juuritiedostot), joten uusi kytkemätön appi punertaa sen automaattisesti.

**Debug-token (reaali-backendia vasten ajavat smoket):** `localStorage.tm_appcheck_debug = '<token>'` tai
`self.FIREBASE_APPCHECK_DEBUG_TOKEN`. **Toimii VAIN ei-tuotantoisilla hosteilla** (localhost + Hosting
preview-kanavat `*--*.web.app`) — repossa ei ole build-vaihetta joka strippaisi koodin, joten rajaus on
ajonaikainen ettei vuotanut token ole Pagesissa ohituskeino. Token on rekisteröitävä Console → App Check →
Apps → Manage debug tokens. Emulaattori-sääntötestit (`npm run test:rules`) eivät koske App Checkiin.

**CSP (vain firebase.json / Hosting — Pages ei palauta CSP:tä):** reCAPTCHA Enterprise vaatii
`script-src` + `frame-src` + **`connect-src`** `https://www.google.com` (enterprise.js, haastekehys ja
`/recaptcha/enterprise/clr`-XHR ovat kolme eri direktiiviä — token myönnetään vaikka clr estyisi, joten
puute EI näy tokenin puuttumisena vaan vain konsolissa).

**ENFORCE = projektinlaajuinen per palvelu, ei per ympäristö.** Esiehto: **kaikki elävät apit → main →
Pages** ja monitoring näyttää tervettä verified-liikennettä. Mittari
`firebaseappcheck.googleapis.com/services/verification_count`, label `security`: `VALID` = verified,
`MISSING_*` = ei tokenia. Flippaa palvelu kerrallaan (Firestore → Functions → Storage), **un-enforce heti
jos verified% tippuu.**

---

## 39. TIETOSUOJA (GDPR) — alaikäisten data EU:ssa

> Pysyy juuressa (ei laiskassa taidossa). Yksityiskohdat: `tm-infra` §33 (B2/B4), `tm-sovellukset` §13.

- **Data EU:ssa:** Firestore `eur3`, Cloud Functions `europe-west1`, Storage `europe-west1` (§2). Uusi ulkoinen palvelu → EU-sijainti tai Teron hyväksyntä + alihankkijalista.
- **API-avaimet Secret Managerissa** (`SENDGRID_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`, `runWith({secrets})`), luetaan vain funktiossa `process.env`:stä. EI plaintext-env-vareja, EI CI:n `.env`-injektiota, EI koskaan selaimeen.
- **CI-deploy ei lue `functions/.env`:iä** → jokainen EI-salainen asetus tarvitsee oletusarvon koodiin (`process.env.X || 'oletus'`), ks. `tm-sovellukset` §13.
- **Sentry:** errors-only, EU-region (`ingest.de.sentry.io`), EI Session Replayta, `beforeSend`/`beforeBreadcrumb` PII-skrubi (nimet, email, huoltaja, PIN, puhelin, osoite → redacted), `sendDefaultPii:false`. Skrubin heitto → event drop.
- **Suostumus-integriteetti:** `suostumusTila` EI KOSKAAN `annettu` → `odottaa`. Suostumus vahvistetaan palvelimella (`vahvistaSuostumus`, huoltajaEmail-täsmäys).
- **Audit-loki ei ole client-luettava** (luku vain SA-gatetun `haeAuditLoki`-funktion kautta).
- **Kielletyt kentät pelaajalle näkyvissä dokumenteissa** (esim. `pisteet`/`narratiivi` kenttätarkkailuissa) ja `nakyvyys`-rajaus havainnoissa ovat Rules-tason sääntöjä — älä kierrä niitä clientissa.
- **B4-suunta:** retention, oikeus tulla unohdetuksi, audit, field-level Rules (§33).

## 40. LAISKAT TAIDOT — yksityiskohdat ladataan tarvittaessa

| Taito | Osiot (alkuperäinen numerointi) | Lataa kun |
|---|---|---|
| `.claude/skills/tm-mittarit-ja-testit` | §22 testausinfra · §23 TK & TKI · §24 Excel/PDF · §26 mittaristo · §29 kehityssilmukka · §30 KPI Master · §31 TK per-laji · §34 TKI-analyysimalli | testi-, indeksi-, normi-, tuonti- tai pikakenttäkoodi |
| `.claude/skills/tm-kehitysbiologia` | §25 biologinen ikä · §28 kehitysikkunat | PHV, bio-banding, talentti-signaalit |
| `.claude/skills/tm-sovellukset` | §13 Cloud Functions · §15 ADAR · §16 Pelaaja · §17 Seura · §18 Admin · §19 VP_v25 · §20 integraatiot · §21 AI · §32 viestiketju · §35 kalenteri · §36 kortit · §37 julkinen kieli | sovellus- tai funktiomuutos |
| `.claude/skills/tm-infra` | §33 skaalautuvuus, deploy-työnkulku, SaaS-suunta | CI, versiointi, Pages, Sentry, CF-runtime |

