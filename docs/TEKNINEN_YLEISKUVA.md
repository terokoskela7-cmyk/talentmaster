# TalentMaster™ — Tekninen yleiskuva (kehittäjän onboarding)

> Tarkoitus: uusi kehittäjä ymmärtää **mitä on rakennettu, miten ja miksi** — ja pääsee tuottavaksi nopeasti.
> Laadittu 2026-06-30. Tämä on *kartta*; **ehdoton totuus on `CLAUDE.md`** (master-briefing + invariantit) ja
> sen viittaamat kanoniset docit. Käytettävyys/UX: `OPAS_VP_JA_VALMENTAJA.md` + `OPAS_PERHE.md`.
>
> Lukujärjestys uudelle kehittäjälle: (1) tämä doc · (2) `CLAUDE.md` kokonaan · (3) `KPI_MASTER_ARCHITECTURE.md`
> (mittarit/indeksit) · (4) `SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md` (velka + suunta) · (5) UX-oppaat.

---

## 0. Kokeile itse heti (demo — ei kirjautumista)

Nopein tapa saada käsituntuma. Demo lataa seeditetyn datan ilman kirjautumista (vartija sallii demon vain
ei-kirjautuneelle → oikea data ei vuoda). Pohja: `https://terokoskela7-cmyk.github.io/talentmaster/`

| Rooli | Miten | Polku |
|---|---|---|
| **Valmennuspäällikkö** | Kirjautumisruudulla **"Kokeile demona →"** | `TalentMaster_VP_v25.html` |
| **Valmentaja** | Kirjautumisruudulla **"Kokeile demona →"** (demo-seura KPV) | `TalentMaster_Master_v16.html` |
| **Pelaaja** | URL-parametri `?demo=1` | `TalentMaster_Pelaaja_v7.html?demo=1` |
| **Vanhempi** | URL-parametri `?demo=1` | `TalentMaster_Vanhempi_v2.html?demo=1` |

> **Oikea data** vaatii super-admin-Google-tilin tai seuratunnukset — näitä eikä oikeita pelaaja-PIN-koodeja
> jaeta (alaikäisdata + GDPR). Tutustuminen tehdään demolla.
> Suositeltu järjestys: **demo → UX-oppaat (`OPAS_PERHE` + `OPAS_VP_JA_VALMENTAJA`) → tämä doc → `CLAUDE.md`.**

---

## 1. Mikä tuote on

Suomalainen jalkapallon **talenttiarviointi- ja kehitysseuranta-SaaS**. Filosofia: *"Pelaaja ensin, hallinto
vahvistaa"* — rakentuu lapsen kehitystarpeista ylöspäin. Erottautujat joita kilpailijoilla (esim. MyEWay) ei ole:
**RAE-ikäharhan korjaus**, **biologinen ikä / herkkyysvaiheet (PHV)**, **pitkittäinen kehitysvauhti**, ja
**lapsiturvallinen pinta** (lapselle ei näytetä lukuja/vertailua).

Kaksi tuotetta samalla koodipohjalla:
- **Club (B2B):** seurat, valmennuspäälliköt, valmentajat, pelaajat, perheet. Pilotissa nyt.
- **Solo / Player™ (B2C):** perhe maksaa suoraan; pelaaja seuraneutraali. Erillinen, jakaa metodologian.

---

## 2. Teknologiapino (ÄLÄ muuta ilman lupaa — CLAUDE.md §2)

| Kerros | Teknologia | Kriittinen huomio |
|---|---|---|
| Frontend | **Vanilla JS (IIFE), multi-HTML** | Ei frameworkeja. Jokainen rooli = oma iso HTML-tiedosto. |
| Tietokanta | **Firebase Firestore `eur3`** multi-region | eur3 ≠ europe-west1. |
| Auth | Firebase Auth + **Custom Claims** + Google Sign-In | Pelaaja = Anonymous Auth + PIN. |
| Cloud Functions | **Node 22, `europe-west1`** | `firebase.app().functions('europe-west1')` — EI `firebase.functions()` (→ us-central1, hiljainen fail). |
| Storage | Firebase Storage, europe-west1 | Kenttähavaintokuvat. |
| Hosting | **GitHub Pages + Fastly CDN** | ~10 min cache → versionhallinta `?v=N` / `?cb=`. |
| Sähköposti | **SendGrid** Cloud Functionissa | Firebase Extension ei toimi eur3:ssa. SPF/DKIM/DMARC kunnossa. |

- **Repo:** `terokoskela7-cmyk/talentmaster` · **Pages:** `https://terokoskela7-cmyk.github.io/talentmaster/` · **Domain:** talentmasterid.com
- **Firebase-projekti:** `talentmaster-pilot` (Blaze). API-avaimet **Secret Managerissa** (`runWith({secrets})`), ei selaimessa, ei plaintext-envissä.

---

## 3. Roolirakenne (kolmiportainen hallinto)

```
super_admin                                   → TalentMaster (Tero). Näkee AINA kaiken. Google Sign-In.
vp · seurasihteeri · urheilutoimenjohtaja     → seuran hallinto
valmentaja · talenttivalmentaja · fysiikka… · fysioterapeutti · testivastaava → operatiivinen
pelaaja                                        → PIN-kirjautuminen (Anonymous Auth)
vanhempi
```
- **`super_admin`** = alaviiva (EI `superadmin`). Tunnistus Rulesissa `exists(admins/{uid})`, ei claim-arvo.
- SA:lla ei ole `seuraId`-claimia → seuranvalitsin on AINA pakollinen (automaattihaku palauttaa satunnaisen seuran).

---

## 4. Repo-rakenne — avaintiedostot

### Rooli-sovellukset (HTML, juuressa)
| Tiedosto | Rooli |
|---|---|
| `TalentMaster_Admin.html` | Super Admin -paneeli (seurat, käyttäjät, tilastot, **Pilotin tila** -komentokeskus, audit-loki) |
| `TalentMaster_Seura.html` | Seurahallinta (VP/sihteeri/UTJ): tuonti, massakutsut, joukkueet, henkilöstö |
| `TalentMaster_VP_v25.html` | **VP-dashboard — KANONINEN.** Joukkuepulssi, signaalit, syvänäkymä (4 välilehteä), raportit, kalenteri |
| `TalentMaster_Master_v16.html` | Valmentajan näkymä + testityötila + VP-viestit-inbox + harjoitusarviointi |
| `TalentMaster_Pelaaja_v7.html` | Pelaajan mobiiliapp (PIN). **§7.22-pinta** |
| `TalentMaster_Vanhempi_v2.html` | Vanhemman näkymä (kehu, kortti, viestit, kirjaa) |
| `TalentMaster_ADAR_Pikakortti.html` | Kenttähavainto (peliäly/D4) — **bundler-tiedosto** (offline, fontit+SDK inline) |
| `TalentMaster_Testaus_v9.html` | Kenttätestaustyökalu (offline-ensin, wizard + korttinäkymä) |
| `TalentMaster_Excel_Tuonti.html` | Massatuonti + Palloliiton PDF-parseri + `recalcHH`/recalc-työkalut |
| `TalentMaster_Rekisterointi_Suostumus.html` | GDPR-suostumuslomake (autentikoimaton → CF varmentaa) |
| `TalentMaster_Player_Home / _Solo_Profiili / _Kortti_Demo` | **Solo**-tuote |

> Versionumero tiedostonimessä (v25/v16/v7) on historiallinen — **nav-linkit osoittavat kanonisiin** (VP_v25, Master_v16).
> Repo-siivous (vanhojen versioiden poisto) on §33-velkalistalla (A6).

### Jaettu domain-logiikka (`lib/` = kanoninen, ladataan kaikkialla)
**Tämä on tärkein arkkitehtuuriratkaisu:** liiketoimintalogiikka on **Firebase-riippumattomissa, testatuissa moduuleissa.**
| Moduuli | Vastuu |
|---|---|
| `docs/testit_indeksit.js` | Kanoninen TKI/TSI/FLEI-laskenta + TK-lajiviitteet (`window.TM_TESTIT`) |
| `lib/tm_eerikkila_normit.js` | Eerikkilä-normit (fyysiset tasot 1–5), `normiIka`, RAE-kerroin, D1/D2-joustava laskenta |
| `harjoitelogiikka_v4.js` (root) | **Kanoninen** harjoitegeneraattori (Pelaaja_v7 lataa Pagesista) |
| `lib/tm_kalenteri.js` | Toistuvuus/occurrence-logiikka (jaettu VP + Master) |
| `src/lib/tm_bioika.js` | Bio-ikä (Mirwald 2002 PHV, Excel-verifioitu). **Auktoritatiivinen — älä kopioi.** |
| `lib/tm_lang.js` · `lib/tm_sentry.js` | fi/sv/en käännökset · Sentry-wrapper (PII-skrubi) |

> **Re-export-pattern:** `src/lib/X.js` = `module.exports = require('../../lib/X.js')` tai juuri. **Juuri/`lib/` on totuus**,
> `src/lib/` on monessa tapauksessa re-export (grep ennen muokkausta — älä muokkaa duplikaattia). §33 A6 reconciliointi kesken.

### Backend
- `functions/index.js` — **18 Cloud Functionia** (kutsut, suostumus, AI-proxy, TASO, roolinvaihto, muistutukset, audit-loki). `firebase-functions` v6, Node 22, 1st-gen (`/v1`-import). v2-migraatio §33-listalla.
- `functions/authz_paatos.js` — **`tarkistaOikeus`** (kanoninen palvelinpuolen valtuutus; lukee roolit + `vp_uid`).
- `tm_admin/firestore.rules` — Security Rules (**deploy Consolesta tai CI N4**, EI GitHub Actionsilla suoraan).
- `firestore.indexes.json` — indeksit koodina (totuus, deployattu).

### Testit + CI
- `tests/*.test.js` — **Vitest** (`npm test`), ~348 testiä (indeksit + eerikkilä + …). `tests/rules/` = Rules-testit (`@firebase/rules-unit-testing`, vaatii Java ≥21 + emulaattori, `npm run test:rules`).
- `.github/workflows/test.yml` — CI: unit-tests + rules-tests. `bump-version.yml` — auto-bump mainissa `[skip ci]`.

---

## 5. Tietomalli (LUKITTU — CLAUDE.md §11)

Neljä pääkokoelmaa + erilliskerrokset.
```
pelaajat/{palloID}                         ← Solo / seuraneutraali (litteä, seuraId:null)
seurat/{seuraId}/
  pelaajat/{pelaajaId}                      ← doc-ID = Firebase UID (EI PalloID!)
    + pikakentät (ks. alla)
    havainnot/{id}   kirjaukset/{pvm}   testitulokset/{pvm_protokolla}   biologinen_ika/{pvm}   pelidata/{otteluId}
  kayttajat/{uid}   joukkueet/{id}   kalenteri/{id}   testitapahtumat/{id}/tulokset/{pid}   viestit/{id}
benchmarks/ · marketplace/ · palloliitto/ · admins/{uid}
```

### Pikakenttä-arkkitehtuuri (§26) — ydinkäsite, opi tämä ensin
Jokainen Firestoreen tallennettu testidatasetti tuottaa automaattisesti **litteät "pikakentät"** pelaajadokumenttiin
(esim. `tki_viimeisin`, `hh_viimeisin{}`, `flei_viimeisin`, `phv_tila`, `d1_taso`, `d2_taso`, `adar_viimeisin{}`,
`suostumusTila`). **Dashboardit (VP/Master/Admin) lukevat näitä pikakenttiä suoraan — EI alikokoelmakyselyjä
renderöinnissä.** Raakadata säilyy alikokoelmissa; indeksit lasketaan kirjoitushetkellä `lib/`-funktioilla.
→ Jos lisäät mittarin: kirjoita raakadata alikokoelmaan **JA** päivitä pikakentät (Excel_Tuonti/recalc/Testaus_v9).

### Pelaajatunniste — yleinen kompastuskivi (§13/§24)
**PalloID on KENTTÄ** (`tunniste`/`palloID`), EI doc-ID. Doc-ID = Firebase UID. Hae aina
`where('tunniste','==',String(id))`, ei `.doc(id)`. `.doc(palloId)` palauttaa "not found" rekisteröidyille.

### Joukkue-kysely — aina kaksoiskysely (§18)
Pelaajalla on **sekä** `joukkue` (nimi, string) **että** `joukkueet[]` (ID-viittaukset). Kysy molemmilla
`Promise.all`-rinnakkain ja yhdistä `Map`illa doc-ID:n perusteella — yhden kentän kysely jättää puolet pois.
Joukkuenimi case-sensitive → tarvittaessa client-suodatus.

---

## 6. Metodologia koodissa (älä muuta ilman lupaa — §14)

| Käsite | Toteutus |
|---|---|
| **5D** | D1 Fyysinen · D2 Tekninen · D3 Psyykkinen · D4 Peliäly · D5 Sosiaalinen |
| **FLEI** (kehon valmius) | 5 ketjua (SBL/SFL/LL/DIAG/DFL), **raakadata 1–3**, normalisointi `(arvo-1)/2*100` = 0–100 %. <40 % → klinikka |
| **Eerikkilä-normit** | `eerikkilaTaso(arvo,testi,ika,sp)` → 1–5 (tekniikkatestit 1–3). Tallenna raaka, laske taso lennossa |
| **TKI** (tekniikka) | Aikapohjainen, mitali VAIN kokonaistuloksesta (`TK_KOKONAISRAJAT`). Ikä 8–13 |
| **TSI** | `sm_pallo − sm_juoksu` (pienempi = tekniikka vahva) |
| **D2-lähde** | prioriteetti TKI → TK → H-H → sm_pallo (sm_juoksu EI KOSKAAN D2:ssa — se on D1) |
| **PHV / bio-ikä** | Mirwald 2002. **PHV-status ohittaa kronologisen iän aina.** `PH`-tila → kuormarajoitin |
| **RAE-korjaus** | oletusarvo kaikkialla. Q1 0.92 · Q2 0.96 · Q3 1.02 · Q4 1.06 |
| **Kehitysikkunat (§28)** | taito ~6–13 v (pre-PHV kriittinen) · fysiikka post-PHV. **Pre-PHV heikko fysiikka = NEUTRAALI, ei kehityskohde** |

> **MAS-yksikkö-ansa:** data on **km/h**, Eerikkilä-normi **m/s** → `eerikkilaTaso(mas/3.6,…)`. Ilman muunnosta MAS näyttää aina tasoa 5.

---

## 7. Turvallisuus & valtuutus

- **Rules eivät periydy alikokoelmiin** — jokainen alikokoelma oma `match`-blokki (puuttuva blokki = permission-denied).
- Funktiot: `onSuperAdmin()` (`exists(admins/uid)`) · `onOmaSeura(id)` (claim) · `onJohtoRooli()` · `onValmentajaRooli()` · `onAnonymous()` (pelaaja-PIN).
- **Rules-kenttänimet = koodin kenttänimet.** Esim. `viestit/` Rules lukee `lahettajaUid`/`vastaanottajaUid` → koodin PAKKO kirjoittaa nämä.
- Palvelinpuolen valtuutus side-effekteille: `tarkistaOikeus` (`functions/authz_paatos.js`).
- **Roolinvaihto AINA `vaihdaKayttajanRooli`-CF:n kautta** (Firestore update + `setCustomUserClaims` + `revokeRefreshTokens`).

---

## 8. KRIITTISET INVARIANTIT — "älä toista näitä virheitä" (§7)

Nämä ovat opittuja, kalliita bugeja. Lue CLAUDE.md §7 kokonaan; tässä kärki:
1. **String concatenation `+`, EI nested template literals** (Python-generointi double-encodaa → musta ruutu).
2. **`getIdToken(true)`** ennen Firestore-kirjoitusta (sessio vanhenee → permission-denied).
3. **`super_admin`** (alaviiva). **CF-region** `europe-west1` aina.
4. **`display:none` tappaa transform-animaation** → `translateX(-100%)`; **vain yksi `@media(max-width:768px)` per tiedosto**.
5. **`serverTimestamp()` ei toimi arrayn sisällä** → `new Date().toISOString()`.
6. **`orderBy`-kenttä = write-kenttä** (Firestore palauttaa tyhjän ilman virhettä jos kenttää ei ole).
7. **Excel-sarakeotsikoissa EI sulkeita**; **sukupuoli `"M"/"N"`** Firestoressa (Excel P/T → muunna).
8. **§7.22 (lapsiturva):** pelaajalle/vanhemmalle EI lukuja, tasoja, vertailua muihin, eikä TKI-laskua. XP vain Firestoreen AI:lle. Streak aina positiivinen.

---

## 9. Kehitys- ja deploy-työnkulku

- **Feature-haara → PR → merge.** Tavalliset PR:t **eivät bumppaa versiota** (Pages-cache + `?cb` riittää); **auto-bump ajaa mainissa** mergen jälkeen (`bump-version.yml`, `[skip ci]`). Älä aja `version:bump` käsin.
- **Testit + CI portti** ennen tuotantoa (`npm test`). Branch protection mainissa (Malli A + admin-bypass).
- **Rules:** Consolesta tai CI (N4). **Functions:** `firebase deploy --only functions` terminaalista.
- **Cache:** "ei toimi" on usein Fastly-cache (~10 min). `?v=N` / `version.json`-pakotettu reload.
- **AI-avustaja tiimikaverina:** anna CLAUDE.md kontekstiksi, **testit ovat vartija**, älä mergeä lukematta.

---

## 10. Tila & suunta (2026-06)

- **Vaihe:** pilotin aktiivinen käyttöönotto (heinä–syys 2026). Rakennus + analyysimallit lukittu; fokus datankeruussa + adoptiossa.
- **Turvaverkko valmis:** backupit, kustannushälytys, branch protection, Rules-CI, Sentry, 348 testiä, auto-bump.
- **Pilottiseurat + data:** ks. `PILOTTI_KAYTTOONOTTO_2026.md`. Datakypsyys vaihtelee (SJK H-H, Sibbo TKI, KPV bio, GrIFK/Pallo-Iirot rosterit).
- **Suunta:** Horisontti 1 pitkittäinen kehitysvauhti + PHV · Horisontti 2 GDPR-tekniikka (RTBF+export) + laskutus + tenant self-service · Horisontti 3 AI-nudge + integraatiot + Solo. Ks. `YKSINKEHITTAJAN_TOIMINTASUUNNITELMA.md` + `SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md` (§33).

---

## 11. Uuden kehittäjän onboarding-checklist

**Ensimmäinen päivä:**
- [ ] Lue tämä doc + `CLAUDE.md` (erit. §2 stack, §7 invariantit, §11 tietomalli, §26 pikakentät).
- [ ] Kloonaa repo, `npm install`, `npm test` (vihreä?). Tutustu `tests/`-rakenteeseen.
- [ ] Avaa kanoniset sovellukset selaimessa (Pages): Admin, VP_v25, Master_v16, Pelaaja_v7. Kokeile super-adminilla.
- [ ] Lue UX-oppaat (`OPAS_VP_JA_VALMENTAJA.md`, `OPAS_PERHE.md`) — ymmärrä *kenelle* ja *miksi*.

**Ensimmäinen viikko:**
- [ ] Seuraa yksi pikakenttä päästä päähän: Excel_Tuonti → `recalcHH`/laskenta (`lib/`) → pikakenttä pelaajadokissa → VP-pulssi.
- [ ] Lue `KPI_MASTER_ARCHITECTURE.md` + `TKI_ANALYYSIMALLI.md` (mittarit/indeksit).
- [ ] Aja `npm run test:rules` (Java 21) — ymmärrä Rules-malli.
- [ ] Tee pieni muutos feature-haarassa → PR → näe CI-portit. Älä mergeä lukematta.

**Kultainen sääntö:** muutos kulkee testien + CI:n läpi ennen tuotantoa. §7.22-lapsiturva ja §7-invariantit eivät jousta.
