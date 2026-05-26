# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
# Päivitetty: 2026-05-26

---

## Projektin tila

TalentMaster on jalkapallon pelaajankehitysalusta (SaaS, multi-tenant). Firebase-backend toimii Blaze-suunnitelmalla. Pilottiseurat ovat aktiivisia — SJK Juniorit on tuotu järjestelmään (40 pelaajaa, 4 joukkuetta). Seurahallinta on refaktoroitu ja tuotantovalmis. Talenttiohjelma-arkkitehtuuri on suunniteltu ja dokumentoitu.

**Tilanne 2026-05-26:** Työkansio on GitHub Desktop -klooni `talentmaster-github` (vanha `talentmaster-main` = lukuarkisto; git CLI ei PATH:lla mutta bundled `git.exe` toimii commit/push). Tekniikkakilpailu on **täysin aikapohjainen** (TK_KOKONAISRAJAT, TKI nelivyöhyke). Excel-tuonti tukee monisuoritusparsintaa (`_1/_2/_3`) ja **Palloliiton PDF-tuonti** (pdf.js) on toteutettu. PalloID-haku korjattu **kentällä** (where tunniste/palloID), ei doc-ID:llä. TKI näkyy VP_v22 pelaajalistassa ja Master_v16 kehityskortilla (pikakentät). **Rules v2.9 deployattu Consolesta** (biologinen_ika + seura-tapahtumat + vp_kalenteri). Khamis-Roche edelleen LUKITTU (`KR_KERTOIMET_PUUTTUU`) kunnes verifioidut Pediatrics 1995 erratum -kertoimet saadaan.

**Filosofia:** *"Pelaaja ensin, hallinto vahvistaa"*
**Kilpailupositiointi:** *"Transfermarkt shows what. TalentMasterID shows how."*

---

## Tämän session työ (2026-05-26)

### Rakennettu tänään
- **Bio-ikä PHV (Mirwald)** + KR-lukitus (`KR_KERTOIMET_PUUTTUU`) + vanhempien pituudet rekisteröinnissä; `src/lib/tm_bioika.js` laajennettu (Excel-verifioitu, ei kopioitu).
- **Testaus_v9 tekniikkakilpailu aikapohjaiseksi:** `TK_KOKONAISRAJAT` (kokonaistulosrajat s, ei lajikohtaiset), **TKI nelivyöhyke** (80–99 / 60–80 / 40–60 / 0–40), K1–K5-korjaukset, kasvumittausprotokolla.
- **Tekniikkaprofiili-kortti Pelaaja_v7:ään** (TKI + merkki + vahvuudet/kehityskohteet).
- **Excel-tuonti monisuoritusparsinta** (`_1/_2/_3` → paras): kuljetus-laukaus `{y1:{raaka,vahennys,netto}, paras}`, pituuspotku `{oikea, vasen, paras_m, metrit, aikabonus_s}`. Pohja generoi PalloID-sarakkeen tekstinä.
- **Palloliiton PDF-tuonti** (pdf.js CDN 3.11.174, ei npm): nimiyhdistys (`sukunimi`+`etunimi` where), `lahde:'palloliitto_pdf'`, EI luo uusia pelaajia automaattisesti.
- **PalloID-bugi korjattu:** haku kentällä (`where tunniste/palloID`), tallennus löydetyn dokumentin oikeaan UID:hen. Pelaajan Firebase doc-ID ≠ PalloID.
- **VP_v22 kalenteri:** viikkonäkymä, statusbadget (Tuleva/Kesken/Valmis), luettavat joukkuenimet, Testaus_v9-deep-linkit, mentorointi-pikalisäys; Rules vp_kalenteri + tapahtumat.
- **Master_v16 kalenteri:** all-day-chipit + tuntiruudukko, värikoodit (protokolla), nappiselkeytys, joukkuesuodatin-korjaus; hardkoodatun demo-datan gattaus (`_renderAdar`, komentopaletti, tilastot).
- **VP_v22 kerros 1:** kausipalkki dynaaminen (`_laskeKausi()`), signaalihehku-CSS (crit/warn box-shadow), KPI-kontekstitekstit, emojit → CSS-pisteet.
- **TKI VP_v22 pelaajalistaan** (FLEI | TKI | Signaali | PHV, pikakentästä) **+ Master_v16 kehityskortille** (TKI + vahvuus/kehityskohde pikakentistä).
- **Rules v2.9 deployattu Firebase Consolesta** (biologinen_ika, seura-tason tapahtumat, vp_kalenteri).
- **Yhtenäinen mittaristoarkkitehtuuri (§34):** jokainen datasetti → pikakentät + joukkue-KPI + suunta + kattavuussignaali. **H-H pikakentät** (`hh_viimeisin{lin30m,cmj,mas}`, `hh_pvm`, `hh_taso` Eerikkilä-normeista, `hhLaskeTaso` inline Excel_Tuontiin). **ADAR pikakentät** (`adar_viimeisin{a,d,ac,r,yht}`, `adar_vahvin/heikoin` — helper `paivitaAdarPikakentat` Master_v16:ssa). **Neliosainen joukkuepulssi** (FLEI · TKI · H-H · ADAR, ka+kattavuus+suunta). **Kattavuussignaalit S6–S9** (TKI/H-H/FLEI < 40 %, ADAR-havainnointi < 30 %).
- **PDF-parserin kalibrointi (4 bugia):** positiopohjainen sarakekartoitus (poisti x-lähikartoituksen numerofuusion), nimen erotus sijasta + seuraNimi-poistolla, lukumääräpohjainen sarakemappi (P12 10 num / P9-P11 7 num), lopputulos = viimeinen numero.
- **PDF monipöytätuki + duplikaattisuojaus:** **jonotusmalli + sija-reset** tunnistaa P12+P10+P9 samasta PDF:stä (kaikki otsikot ensin → data, taulukkoraja = sija palautuu 1:een). Duplikaatti = `{pvm}_tekniikkakilpailu_{ikäluokka}` jo tallennettu → 🟡 esikatselussa [Ohita]/[Korvaa], ohitus **vain tallennuksessa** (kaikki rivit näkyvät).
- **CDN-versiovaroitus:** `PDF_VERSIO`-vakio + raw.githubusercontent.com-vertailu → amber-banneri jos ladattu versio vanhempi kuin mainin tuorein (vain GitHub Pages -hostilla).
- **VP joukkueen syvänäkymä:** pulssikortin klikkaus → modaali, 3 välilehteä (Tekniikka TKI-ranking · Tuki kehityskohteittain · Yhteenveto) + CTA-napit (Testaus_v9 / Pelaajat). Vain ladatusta `_pelaajat`-datasta.
- **Master_v16 demo-datan siivous (audit + fix):** `DEMO`-objekti todettu jo hyvin gatetuksi (`_demo`-lippu kaikissa render-funktioissa, kirjautuneet saavat Firestore-datan + siistit tyhjätilat). Korjatut jäänteet: (1) poistettu kuollut `openPelaaja()` (ei kutsuttu mistään, osoitti olemattomaan `Pelaaja v4.html`:hen), (2) ADAR-drillin pelaajachipit gatettu (`_demo`-tilassa DEMO.players, muuten `_pelaajatData` — kirjautunut 0 pelaajalla näki ennen demonimet), (3) title+otsikkokommentti v13→v16. **Demo-tila itse säilyy** (tarkoituksellinen — "Kokeile demona →").

### Avoimet askeleet
- **PDF-tuonti oikealla datalla loppuun:** parseri kalibroitu Sibbon kolmen taulukon rakenteelle (jono + sija-reset). **Riippuvuus:** jonotusmalli olettaa että jokainen ikäluokka alkaa **sijalla 1** — jos jokin tuloste ei resetoi rankingia, P10/P9 voivat sulautua (konsoli varoittaa jos jono jää vajaaksi). Testaa GrIFK/muut tulosteet.
- **ADAR-pikakenttien KIRJOITUS auki:** `paivitaAdarPikakentat()` valmis Master_v16:ssa, mutta Master-drilli on UI-mockup (ei persistoi). Varsinainen ADAR-kirjaus on `ADAR_Pikakortti.html` `saveCard()` (bundler) → helper kytkettävä sinne, jotta ADAR-pikakentät täyttyvät kentältä. Lukupuoli (joukkuepulssi + S9 + syvänäkymä) toimii heti kun kentät ovat.
- **GitHub Pages deploy:** varmista **Settings → Pages → Source = main / (root)** ja että Actions "pages build and deployment" on vihreä — buildi jumitti kertaalleen. Jos live ei päivity, vika on tässä (ei gitissä; kaikki commitit ovat mainissa).
- **Raportointi-näkymä:** "Lähetä HoT:lle" on vain `toast()` — oikea toteutus puuttuu.
- **3 uutta signaalia** Tilanne-näkymään: BQ-bias, fiilinki, kuormahuippu (S6–S9 kattavuus jo tehty).
- ✅ **Master_v16 hardkoodattu demo-data** — audit tehty + jäänteet korjattu (`0a9d084`). Demo-data oli jo hyvin gatettu; ei laajaa poistettavaa. **Huom:** ADAR-drilli on yhä ei-persistoiva mockup — varsinainen kirjauspiste on `ADAR_Pikakortti.html` `saveCard()` (sama riippuvuus kuin ADAR-pikakenttien KIRJOITUS yllä).
- **KR-kertoimet** (Pediatrics 1995 erratum) — `laskeKR()` lukittu kunnes verifioidut kertoimet + `KR_VERIFIOITU=true`.

### Tämän session commitit (talentmaster-github, main)
`907dc33` Excel-pohjageneraattori → `d0cc5e4` monisuoritus + PDF-tuonti → `3810c7c` PalloID string-muunnos → `6e1bb6c` PalloID kenttähaku → `c222642` TKI pelaajalistaan + pikakentät → `0a628ae` VP_v22 kerros 1 → `01b78d9` dokumentit → `5e634ea` mittaristoarkkitehtuuri (§34) → `7329cab` PDF positiokorjaus → `8490fc7` PDF monipöytä + dup → `4aa9e91` dup-näkyvyys → `149d1e7` PDF jono + sija-reset → `1d9924a` CDN-varoitus → `fe9dab0` VP joukkueen syvänäkymä → `0a9d084` Master_v16 demo-siivous. (välissä cache-bust/versio-choreja).

---

## GitHub

```
https://github.com/terokoskela7-cmyk/talentmaster
https://terokoskela7-cmyk.github.io/talentmaster/
```

Deployment: **bundled git.exe** (GitHub Desktopin mukana) toimii commit/push (git CLI ei PATH:lla). GitHub Desktop synkronoi paikallisen kloonin automaattisesti — **älä muokkaa samaa tiedostoa webissä ja CLI:llä yhtä aikaa** (ristiriitariski).
CDN-cache: GitHub Pages käyttää Fastly CDN:ää (~10 min). Pakota tuore: `?v=N` tai kova päivitys. `raw.githubusercontent.com` ohittaa CDN:n mutta näyttää **lähdekoodin** (text/plain), ei renderöityä sovellusta. Sivulla on CDN-versiovaroitusbanneri (vertaa `PDF_VERSIO` rawiin).

---

## Firebase

- **Projekti:** `talentmaster-pilot` (Blaze plan)
- **Tietokanta:** Firestore `eur3` multi-region
- **Auth:** Email/Password + Anonymous (PIN) + **Google Sign-In** (SA käyttää)
- **Functions:** `europe-west1` — AINA eksplisiittisesti

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
// KRIITTINEN: firebase.app().functions('europe-west1') — EI firebase.functions() (→ us-central1, hiljaa epäonnistuu)
```

---

## Käyttäjät

| Sähköposti | UID | Rooli | Huomio |
|---|---|---|---|
| talentmasterid@gmail.com | dqUzvJA61Wb9fgj5UiK0riSA4NI2 | Super Admin | Google Sign-In |
| rasmus_broberg@icloud.com | YPOLkJE2BCeoUXZtXDD6L56... | VP KPV | vp.kpv EI ole Authissa |
| vp.fcl@talentmaster.fi | dpYcfa154ZOHshZzHrVaTZ2iTHE3 | VP | FC Lahti Juniorit |
| vp.palloiirot@talentmaster.fi | fBf1c60rjXTPxYlsV03EfrHZ2xM2 | VP | Pallo-Iirot |
| vp.yvies@talentmaster.fi | U21RwOm7OYdrAQB8wTXXlDQksEk2 | VP | Ylöjärven Ilves |
| vp.sjk@talentmaster.fi | 1eHyfKsuTSRAAsPu9kRZ22E4hwo2 | VP | SJK Juniorit |
| vp.grifk@talentmaster.fi | lBCx0ivDYVWLmxD9TGKsvYrFrlo1 | VP | GrIFK |

---

## Firestore-rakenne

```
seurat/{seuraId}/
  pelaajat/{pelaajaId}
    joukkueet: ["sjk_u13", "sjk_u15"]   ← uusi 2026-05-09, ID-viittaukset
    joukkue:   "SJK U13"                 ← backward compat, ensisijainen
    talenttiOhjelma: bool                ← uusi 2026-05-09
    talenttiTaso:    "perus"|"laajennettu"
    talenttiAlku:    Timestamp
    talenttiAktivoi: uid
    kirjaukset/{pvm}                     ← pelaajan päivittäiset kirjaukset (LUKITTU rakenne alla)
    havainnot/{havaintoId}               ← valmentajan kenttähavainnot
    omatoimi_ohjelmat/
  joukkueet/{joukkueId}                  ← Seura.html luo .doc(id)-metodilla (siisti ID)
  kayttajat/{uid}
  kutsut/{kutsuId}

admins/{uid}
testitapahtumat/                         ← EI tapahtumat — testidataa
```

**Kirjausrakenne Firestoressä (LUKITTU — AI-moduulit riippuvat tästä):**
```
pelaajat/{id}/kirjaukset/{pvm}
  tyyppi:    'T'|'D'|'S'|'P'
  tehty:     bool
  kesto_min: number
  rpe:       number
  fiilinki:  number
  aika:      'ilta'|'aamu'|'paiva'
```

---

## Testipelaaja: Topias Koskela (KPV)

```
Dokumentti: seurat/kpv/pelaajat/m93GBdOaGCUuenMiCL0I  ← KAKSI u:ta!
PIN:            9278
syntymaVuosi:   2013 (15.3.2013)
sukupuoli:      "M"   (EI "poika")
joukkue:        "KPV U13"
seuraId:        "kpv"
tunniste:       "12345678"   ← PalloID-kenttä (TESTIARVO, ei oikea — 34650191 kuuluu toiselle pelaajalle)
huoltajaEmail:  "TeroKoskela7@gmail.com"
flei_viimeisin: 62
sbl:2.16  sfl:2.30  ll:2.10 (HEIKOIN 55%)  diag:2.40  dfl:2.20
isDemoUser:     false
```

---

## Pilottiseurojen tila (2026-05-11)

| Seura | ID | Pelaajia | Joukkueet | Tila |
|---|---|---|---|---|
| FC Demo | demo | 13 | demo_u13, demo_u15, demo_u17 | Demo-data |
| KPV | kpv | 34 | KPV T18 (33), KPV U13 (1) | ✅ Aktiivinen pilotti |
| SJK Juniorit | sjk | 40 | SJK P14(6), P16(14), T14(9), T16(11) | ✅ Tuotu 2026-05-09 |
| GrIFK | grifk | 0 | — | Seura luotu |
| Pallo-Iirot | palloiirot | 0 | — | Seura luotu |
| Sibbo-Vargarna | sibbovargarna | 0 | — | Seura luotu |
| VIFK | vifk | 0 | — | Seura luotu |

SJK:n T14/T16 tytöt merkitty talenttiohjelma laajennettu-tasolle tuonnin yhteydessä.

---

## Tiedostojen tila (2026-05-15)

| Tiedosto | Tila |
|---|---|
| `TalentMaster_Testaus_v9.html` | ✅ GitHubissa + livenä — **+ kasvumittausprotokolla (PHV) 2026-05-25** |
| `TalentMaster_Testaus_v8.html` | ⚠️ Arkistoidaan kun v9 testattu pilottiseuralla |
| `TalentMaster_Harjoitettavuus_Lomake_v4.html` | ⚠️ Arkistoidaan kun v9 testattu pilottiseuralla |
| `TalentMaster_VP_v22.html` | ✅ GitHubissa — Sprint 3 valmis (signaalit + BQ-stack + IDP-jono) |
| `TalentMaster_Excel_Tuonti.html` | ✅ GitHubissa — Sprint 3.1 (historiapohja + writeBatch + TKI + PalloID-ristiintarkistus) |
| `TalentMaster_Admin.html` | ✅ GitHubissa |
| `TalentMaster_Seura.html` | ✅ GitHubissa |
| `TalentMaster_Master_v16.html` | ✅ GitHubissa |
| `TalentMaster_Pelaajarekisteri.xlsx` | ✅ GitHubissa |
| `CLAUDE.md` | ✅ GitHubissa — päivitetty 2026-05-15 (§30 Bio-ikä-arkkitehtuuri) |
| `SESSION_SUMMARY.md` | ✅ Päivitetty 2026-05-15 |
| `docs/TALENTTIOHJELMA_ARKKITEHTUURI.md` | ✅ GitHubissa |
| `TalentMaster_Pelaaja_v7.html` | ✅ GitHubissa (v=24) |
| `TalentMaster_ADAR_Pikakortti.html` | ✅ GitHubissa |
| `TalentMaster_Vanhempi_v2.html` | ⚠️ Kovakoodattu nimi — P3 auki |
| `tm_eerikkila_normit.js` | ✅ GitHubissa |
| `tm_lang.js` | ✅ fi/sv/en, 144 käännöstä |
| `src/lib/tm_bioika.js` | ✅ Mirwald PHV (Excel-verifioitu) + **KR-runko gatettu** (`laskeKR`→`KR_KERTOIMET_PUUTTUU`) + sukupuoli N→T -korjaus (2026-05-25) |
| `functions/index.js` | ✅ 7 Cloud Functionia + aiProxy deployattu |
| `tm_admin/firestore.rules` | **v2.8 2026-05-25** (+ pelaajat/{id}/biologinen_ika) — ⏳ deployaa Consolesta (v2.7 deployattu 2026-05-14) |

---

## Sessio 2026-05-25 — Bio-ikä PHV + työkansion vaihto

**Työkansio vaihdettu:** virallinen työrepo on nyt GitHub Desktop -klooni `C:\Users\TeroKoskela\talentmaster\talentmaster-github` (remote terokoskela7-cmyk/talentmaster). Vanha `talentmaster-main` (purettu ZIP) = lukuarkisto, ei muokata. Git CLI ei PATH:lla, mutta GitHub Desktopin bundlattu git.exe toimii commit/pushiin.

**Bio-ikä PHV toteutettu** (commit f6d7769, 5 tiedostoa):
- **`src/lib/tm_bioika.js` laajennettu** (EI uutta tiedostoa, §30): `laskeKR()`-runko gatettu palauttamaan `{ error:'KR_KERTOIMET_PUUTTUU' }` (laskee silti midparentin, Epstein-korjauksen isä −1.5/äiti −1.0, fallback 179/166, virhemarginaalin); apufunktiot `laskeIkaDesimaalinen`, `estimoiPuuttuvaVanhempi`, `BIOIKA_VAROITUKSET`. **Bugikorjaus:** sukupuoli `'N'`→`'T'` (tyttö laski aiemmin poikien Mirwald-kaavalla).
- **`TalentMaster_Testaus_v9.html`:** uusi `kasvumittaus`-protokolla (pituus 2× + paino 2× + istumapituus 1×, `laskentatapa:'keskiarvo'`), `_v5SyotaYritys` osaa keskiarvon, "Merkitse valmiiksi" laskee PHV:n (Mirwald) ja tallentaa kahteen polkuun: `pelaajat/{id}/biologinen_ika/{pvm}` + pelaajadoc-pikakentät (`phv_tila`, `biologinenIka_viimeisin`). Lataa `src/lib/tm_bioika.js`.
- **`TalentMaster_Rekisterointi_Suostumus.html`:** vapaaehtoinen vanhempien pituuskortti (isä/äiti cm + ei tiedossa/adoptoitu, pehmeä varoitus <150/>200, ei estä) → `isa_pituus_cm`/`aiti_pituus_cm`/`vanhempi_pituus_puuttuu`/`vanhempi_pituus_pvm` molempiin tallennuspolkuihin.
- **`TalentMaster_Pelaaja_v7.html`:** `rMinaKehitysvaihe()`-kortti (PHV-värikoodit, ±0.5v aina näkyvissä, KR-rivi "Tulossa myöhemmin", piiloon jos ei mittausta); `_laskeStage`/signaalit yhtenäistetty lukemaan koodi `'PH'` (+ vanha 'huippu'/'PHV').
- **Rules v2.7 → v2.8:** `match /seurat/{sid}/pelaajat/{pid}/biologinen_ika/{mittausPvm}`. ⏳ Deployaa Firebase Consolesta ennen kentällä käyttöä.

**phv_tila canonical = PRE/LAH/PH/POST/AN.** KR-numerolaskenta integraatiovalmis mutta lukittu: avoimesta verkosta ei saatu verifioituja kerrointaulukoita (vain malli/yksiköt/yksi datapiste). Tarvitaan Pediatrics 1995 erratum -kertoimet (imperiaaliset, ikäkohtaiset 4–17.5v) → `KR_KERTOIMET` + `KR_VERIFIOITU=true`. **Testaamatta ajamalla** (node ei käytettävissä) — testaa kasvumittaus end-to-end super_adminilla.

---

## Sessio 2026-05-12 → 2026-05-15 (Sprint 1+2+3 yhdessä)

### Sprint 3 — VP_v22 Tilanne-näkymä (johtamisjärjestelmä, 2026-05-13)
`renderSignals(seuraId)` — 5 prioritisoitua signaaliperhettä dynaamisesti Firestore-pohjaisena. `renderTeamPulse` + BQ-stack (Morganti 2025 RAE) joukkuekorttiin: Q1/Q2/Q3/Q4 palkki + Underdog-laskuri (BQ4 + FLEI ≥ 60). IDP-jono Firestore-pohjaiseksi (`'odottaa'`-tila + hylkäysmodaali + audit-trail). `meta/phv_snapshot` -kirjoitusoptimointi (vain muuttuneet arvot). CLAUDE.md §17 #23 — joukkuetunnisteen kaksirakenteisuus dokumentoitu.

### Sprint 3.1 — Excel_Tuonti historiapohja-moodi (2026-05-13)
Kaksi moodia: A) tapahtumapohjainen (ennallaan), B) historiapohjainen vanhalle Exceldatalle ilman tapahtuma-ID:tä. `pelaajat/{palloID}/testitulokset/{pvm}_{protokolla}` -uusi alikokoelma. WriteBatch (400/erä) atominen kirjoitus. TKI-laskenta tuonnin yhteydessä (tkLaskeMerkki + tkLaskeTKI + TK_MERKKIRAJAT inline). PalloID-ristiintarkistus Promise.all-rinnakkaisesti + 3-ryhmäluokitus. Monikielinen tunnistus: SpelareID = PalloID (sv), PlayerID/Spieler-ID = fallback. Kausi-dropdown automaattisilla vaihtoehdoilla. Bugfix: `serverTimestamp()` arrayn sisällä → `new Date().toISOString()` (CLAUDE.md §17 #7).

### Testaus_v8 — useita iteraatioita (2026-05-13–14)
Pelaajahaku Promise.all-kaksoiskysely (joukkue-nimi + joukkueet-array). Lineaarinopeus 3 erillisenä testinä (lin_5m, lin_10m, lin_30m). Vapaa testivalinta 4 kategoriaa + omat testit. `_haeProto(tap)`-yhtenäistys 13 paikassa. Paikka-kentän neutralisointi + seuran kotihalli-fallback. Oikeat harjoitettavuustestit `VAPAA_TESTIPANKKI`:ssa. ℹ-tooltip kenttäohjeineen (`TESTI_OHJEET` 20 testille). Testialusta-dropdown 8 vaihtoehdolla + pakollisuus juoksutesteille. Kasirata → "Ketteryys — kasirata" + TSI-kaava CLAUDE.md §23:een.

### Testaus_v9 — strateginen yhdistäminen (2026-05-14) ⭐
**3112 riviä, kolmen sovelluksen kokonaisuus yhden tiedoston sisällä:**
- **Sovellus 1 — Suunnittelu** (vaiheet 1–4): protokolla + alusta + joukkue + osallistujat + ryhmäjako
- **Sovellus 2 — Kenttänäkymä** (vaihe 5): korttinäkymä yksi pelaaja kerrallaan · rotaatio · **offline-ensin (localStorage→Firestore)** · välitön vahvistus (vihreä välähdys 800ms) · 1–3p pisteytys · ℹ-modaali kenttäohjeineen · Palloliiton virallinen kuljetus-laukaus-erikoissyöttö (raaka + 4 rangaistuskenttää + auto-tulos) · reaaliaikainen TKI + merkki
- **Sovellus 3 — Tarkastelu** (vaiheet 6–8): sync-status per pelaaja · "Merkitse valmiiksi" · FLEI/TKI/TSI värikoodattu taulukko · **A4-print per pelaaja** print-CSS:llä

Kalenteri-kirjoitus kahteen polkuun: `testitapahtumat/{id}` (POLKU 1) + `joukkueet/{jid}/kalenteri/{kid}` (POLKU 2, try-catch). Jälkimmäinen vaati Rules v2.7:n kalenteri-alikokoelmablokin.

**Rinnakkainen v8:n ja Harjoitettavuus_v4:n kanssa kunnes pilotti vahvistaa — sitten molemmat arkistoidaan.**

### Firestore Rules v2.7 deployattu (2026-05-14)
Versiopolku tässä sessiossa: v2.4 → v2.5 → v2.6 → v2.7. Kriittisin lisäys: `joukkueet/{id}/kalenteri/{kid}` -alikokoelmablokki (Testaus_v9 vaati). Lisäksi: `idp_jono` `'odottaa'`-tila, `meta/phv_snapshot` -kanava, `pelaajat/{pid}/testitulokset/{pvm}_{proto}` historiapohjalle, `errors/` luonti PIN-sessioista.

### Bio-ikä-analyysi (2026-05-14, read-only)
`tm_bioika.js` 287 riviä ja `TalentMaster_BioIka.xlsx` (purettu ZIP-XML-tasolla) käyttävät **IDENTTISIÄ Mirwald 2002 -kaavoja** — vertailtu kerrointasolla, 11 kerrointa pojat+tytöt + 5 PHV-tilan kynnystä + 12 kk × 2 sukupuolta yli-ikäisyystaulukko. Khamis-Roche ei käytössä — intentionaalisesti poistettu, koska alkuperäiset 1994-kertoimet eivät verifioitavissa.

### Bio-ikä-arkkitehtuuri lukittu (2026-05-15)
Eerikkilän/Palloliiton MyEWay-linjauksen pohjalta päätös: **molemmat menetelmät rinnakkain, eivät kilpaile**. PHV (Mirwald) → "mitä nyt tapahtuu?" → harjoittelun ohjaus. KR → "kuinka kypsä suhteessa muihin?" → bio-banding. KR:n implementaatio Sprint 4:ään: Pediatrics 1995 erratum -kertoimet, lineaarinen interpolointi puolen vuoden intervallien välillä, vanhempien pituudet suostumuslomakkeelta. Fallback THL FinRavinto 2017: isät 179 cm, äidit 166 cm (korjaa aiemmin käytetyn yläkanttiin olevan 181/168 cm). Ks. CLAUDE.md §30.

---

## Sessioiden yhteenveto — mitä tehty (05-08 + 05-09)

### Admin-sivu v2 (05-08)
Massakutsu uudelleenrakennettu: tallentaa `suostumusTila:'odottaa'`, EI sähköpostia. Joukkueet-sivu dynaaminen. `palloID` (iso I) korjattu. `lataaSeurat` muutettu `onSnapshot`-kuuntelijaksi. Nappi muutettu: "💾 Tuo pelaajat järjestelmään" + iso amber-varoituslaatikko VAIHE 1/2.

### Master v16 (05-08)
`onAuthStateChanged` korjattu (`_kirjautuminenKesken` poistettu). Google Sign-In lisätty. SA:n joukkuevalitsin dynaamiseksi. Kalenteri- ja testitapahtumabugi korjattu.

### Seurahallinta Seura.html (05-09) — isot muutokset
Joukkueet[]-arkkitehtuuri: pelaajalla nyt `joukkueet[]` (ID-viittaukset) + `joukkue` (backward compat). Muokkausmodaalin dropdown → checkboxit (useaan joukkueeseen). Joukkueen nimen muokkaus + batch-päivitys kaikille pelaajille. Talenttiohjelma-toggle + perus/laajennettu-valinta. KORI poistettu. Uusi Talentit-välilehti. Excel-pohja dynaaminen (SheetJS + Firestore-joukkueet). Duplikaattisuoja kahdella tasolla (palloID + nimi+joukkue). Joukkuesuodatus dynaamisilla nappuloilla. `suodataPelaajat` refaktoroitu kolmeksi erilliseksi funktioksi (`pelaajaRivi`, `paivitaNappienUlkoasu`, `renderPelaajaLista`).

### SJK-pelaajat tuotu (05-09)
40 pelaajaa, 4 joukkuetta. T14/T16 nimikorjaus batch-päivityksellä konsolista. PalloID-duplikaatti korjattu. Tyttöjen talenttiohjelma asetettu.

### Talenttitunnistuksen arkkitehtuuri dokumentoitu (05-09)
Täydellinen kuvaus: `docs/TALENTTIOHJELMA_ARKKITEHTUURI.md`. Ks. lyhyennos alla.

---

## Massakutsu — kaksivaiheinen prosessi (TÄRKEÄ)

Vaihe 1 nyt: Excel → Firestoreen `suostumusTila:'odottaa'`. EI sähköpostia.
Vaihe 2 tuleva: "Lähetä suostumuspyynnöt" -nappi kun kaikki näkymät tarkastettu.

---

## Kenttänimien canonical

| Oikein | Väärin |
|---|---|
| `palloID` (iso I) | `palloId` |
| `joukkue` (string) + `joukkueet` (array) | `joukkueNimi` |
| `suostumusTila` | `suostumus` |
| `syntymaVuosi` (integer) | `syntymavuosi` |
| `sukupuoli: "M"/"N"` | `"poika"/"tyttö"` |
| `super_admin` (alaviiva) | `superAdmin` |
| `testitapahtumat` (kokoelma) | `tapahtumat` |
| `tunniste` (PalloID Firestoressä) | `palloId` |

---

## Cloud Functions (7 kpl, europe-west1)

| Funktio | Tarkoitus |
|---|---|
| `lahetaRekisteriKutsu` | Rekisteröintikutsu huoltajalle |
| `luoKayttaja` | Auth + Firestore + custom claims + salasanalinkki |
| `lahetaHuoltajaKutsu` | Huoltajan suostumuskutsu |
| `deaktivioiKayttaja` | Deaktivoi käyttäjä |
| `lahetaPelaajaSivuLinkki` | Linkit + salasananollaus |
| `tasoHaeSeuranOttelut` | TASO API |
| `aiProxy` | AI-kutsujen välittäjä (Anthropic/OpenAI/Gemini) |

---

## Eerikkilä-normitaulukot (`tm_eerikkila_normit.js`)

11 testiä, pojat P10–M ja tytöt T10–N. **Tallennetaan AINA raakadata Firestoreen, taso lasketaan lennossa.**

```javascript
eerikkilaTaso(arvo, testi, ika, sukupuoli)  // → 1–5 (tai 1–3 tekniikalle)
eerikkilaProfiilit(pelaaja)                  // → {nopeus_30m: 3, hyppy_cj: 4, ...}
laskeEI(cj_cm, sj_cm)                       // elastisuusindeksi (CMJ−SJ)
laskeFVP(n5m_s, n30m_s)                     // voima-nopeus-profiili
laskeTSI(smjuoksu_s, smpallo_s)             // tekniikka-nopeus-indeksi ← kriittisin talentti-indikaattori
```

Tekniikkatestit (pujottelu, syöttö): 3-portainen asteikko. Muut: 5-portainen.

---

## Talenttitunnistus — avainasiat (täydellinen kuvaus docs/TALENTTIOHJELMA_ARKKITEHTUURI.md)

**TSI** (SM-pallo − SM-juoksu) on kriittisin yksittäinen talentti-indikaattori. SM-juoksu ja SM-pallo ovat H-H patteriston suunnanmuutostestejä — eivät erillisiä lajitekniikatestejä. H-H taso 3 = kansallinen, taso 4–5 = kansainvälinen.

**Kehitysvauhti on tärkeämpi kuin hetkellinen taso** — tämä on kansainvälisen tutkimuksen konsensus.

**Hidden Gem** = kehitysvauhti nouseva + biologinen alijäämä (Q3/Q4 tai pre-PHV) + taso alle mediaanin. **X-Factor** = jo korkea taso (≥4) + poikkeuksellinen erottuvuus yhdellä osa-alueella.

**Talenttiohjelma-prosessi:** Valmentaja ehdottaa → VP/TV vahvistaa datalla → 30pv aikaraja → kahden roolin hyväksyntä tallennetaan. Poistuminen vaatii VP:n aktiivisen päätöksen + perustelun. Talenttinimitys alkaa 13v:sta. Pienessä seurassa voi olla vain 5 talenttia — järjestelmä suosittelee realistisen määrän eikä pakota 20:een.

---

## Avoimet tehtävät (2026-05-15)

**Välittömät pilottivalmiuteen:**
- ⏳ Vie `TalentMaster_Testaus_v9.html` GitHubiin (manuaalinen web-UI)
- ⏳ Pilottitesti Testaus_v9: KPV/GrIFK kokeilee → palautteen jälkeen v8 ja Harjoitettavuus_v4 arkistoidaan
- ⏳ VP_v22 testaus KPV:llä (`rasmus_broberg@icloud.com`)

**Bio-ikä — tehty 2026-05-25:**
- ✅ Vanhempien pituuskentät rekisteröintilomakkeeseen (`isa_pituus_cm`/`aiti_pituus_cm` + ei tiedossa/adoptoitu)
- ✅ Kasvumittausprotokolla Testaus_v9:ään (pituus 2× + paino 2× + istumapituus 1× + `laskentatapa:'keskiarvo'`, PHV-tallennus pikakentät + `biologinen_ika/{pvm}`)
- ✅ Rules v2.8 sisältää `biologinen_ika`-alikokoelmablokin
- ✅ PHV-kehitysvaihekortti Pelaaja_v7:ään

**Bio-ikä — vielä auki:**
- ⏳ **Deployaa Rules v2.8 Consolesta** (muuten biologinen_ika-kirjoitus kaatuu)
- ⏳ **Khamis-Roche -kertoimet:** `laskeKR()` lukittu (`KR_KERTOIMET_PUUTTUU`). Tarvitaan verifioidut Pediatrics 1995 erratum -kertoimet (imperiaaliset, ikäkohtaiset). Avointa verkkoa ei voitu verifioida 2026-05-25 → lähde julkaisusta tai Eerikkilä/MyEWaystä. Kun saatu → täytä `KR_KERTOIMET` + `KR_VERIFIOITU=true`.
- ⏳ **Testaa kasvumittaus end-to-end** super_adminilla (koodi testaamatta ajamalla)

**Kriittiset ennen laajentumista:**

| # | Tehtävä | Prioriteetti |
|---|---|---|
| P3 | Vanhemman app: kovakoodattu "Eemeli" → `where('huoltajaEmail','==',email)` | 🔴 |
| P4 | Firestore Rules vanhemmalle: `resource.data.huoltajaEmail == request.auth.token.email` | 🔴 |
| P6 | Valmentajan kenttähavainto → Firestore → pelaajan näkymä (ketju puuttuu) | 🔴 |
| — | Streak → Firestore — pakollinen ennen AI-moduuleja | 🔴 |
| — | Suostumusprosessi vaihe 2 — "Lähetä suostumuspyynnöt" -nappi | 🟡 |
| P5 | Fiilinki ikäfaasikohtaiseksi (U13 leikkija-kieli) | 🟡 |
| P7 | IDP-aktivointilogiikka (3 reittiä: manuaalinen/HG-signaali/XF-signaali) | 🟡 |
| — | RAE BQ-jakauma VP_v22:ssa | ✅ Sprint 3 |
| — | Tyttöjen PHV-kaava ennen SJK U14/15T -aktivointia | 🟡 (KR tarkempi tytöillä, 4.3 cm vs. poikien 5.6 cm) |
| — | SPF/DKIM — sähköpostit roskapostiin | 🟡 |

---

## Arkkitehtuurin invariantit — ei saa koskaan rikkoa

1. **SA** (`talentmasterid@gmail.com`, UID:`dqUzvJA61Wb9fgj5UiK0riSA4NI2`) — Google Sign-In, tunnistus `adminSnap.exists`
2. **Cloud Functions** AINA `europe-west1` eksplisiittisesti — `firebase.functions()` menee `us-central1`
3. **Rooli canonical:** `super_admin` (alaviiva, ei camelCase)
4. **FLEI = 5 ketjua:** SBL, SFL, LL, DIAG, DFL. Asteikko 1–3, normalisointi `(arvo-1)/2×100`. Default `2.0` (50%) kun ei dataa.
5. **`serverTimestamp()`** EI array:n sisällä → käytä `new Date().toISOString()`
6. **Firestore Rules:** `allow create` JA `allow update` molemmat pakollisia
7. **Firestore Rules** EI periydy alikokoelmiin — jokainen vaatii oman blokin
8. **`testitapahtumat`** EI `tapahtumat` testien kokoelmana
9. **Joukkueet:** Seura.html luo `.doc(id)`:llä (siisti ID), Admin ei luo joukkueita
10. **Massakutsu** = datantuonti vain — EI sähköpostia (vaihe 2 erikseen)
11. **Nested template literals** rikkovat parserin → string concatenation (`+`)
12. **PIN login:** `await user.getIdToken(true)` ennen Firestore-kirjoitusta
13. **GitHub CDN** ~10 min → `?v=N` + tarkista `raw.githubusercontent.com`
14. **`palloID`** isolla I kaikkialla — `tunniste`-kenttä tallentaa PalloID:n pelaajadokumenttiin
15. **Anonyymeillä Auth-käyttäjillä** (PIN) oltava eksplisiittinen pääsy Security Rules:ssa
16. **`window._pelaajaMap`** välimuistittaa `{tunniste, nimi, joukkue}` per Firebase ID
17. **Raakadata Firestoreen** — normalisointi koodissa. Älä tallenna `taso:3`, tallenna `arvo:4.42s`
18. **`syntymaVuosi`** numerona — `syntymaaika` on Timestamp erikseen
19. **`Date.UTC(y, m-1, d)`** päivämääräjäsentämiseen — EI `new Date(string)`
20. **Topias dokumentti-ID:** `m93GBdOaGCUuenMiCL0I` — **kaksi u:ta**
21. **`joukkueet[]` + `joukkue`** molemmat pelaajalla — uusi array + backward compat string
22. **Excel-sarakeotsikoissa EI suluissa olevaa tekstiä** — rikkoo `etsiSarake` (vaikka `startsWith` korjaa)
23. **SA kirjautuu Google Sign-In:llä** — ei email/salasana
24. **Bio-ikä-arkkitehtuuri:** PHV (Mirwald) ja KR (Khamis-Roche) eivät kilpaile — molemmat tarvitaan eri tarkoituksiin. Mirwald `tm_bioika.js`:ssä on Excel-verifioitu auktoritatiivinen. KR Sprint 4: Pediatrics 1995 erratum -kertoimet, ei alkuperäisiä 1994-kertoimia. Ks. CLAUDE.md §30.
25. **Testaus_v9 on uusin yhdistetty kenttätyökalu** — v8 ja Harjoitettavuus_v4 arkistoidaan pilotin jälkeen. Älä korjaile v8:aa — kaikki uusi v9:ään.

---

## AI-arkkitehtuuri (Sprint 6–8)

Kaikki AI-kutsut: `TM_AI.call()` → `aiProxy` Cloud Function (europe-west1) → provider. API-avaimet EIVÄT koskaan selaimessa.

Rakentamisjärjestys: 1) Pelihavainto AI (GPT-4o Vision → ADAR), 2) Äänikirjaus (Whisper-1 → Firestore), 3) Kehitysnarratiivi (Assistants API, thread per pelaaja), 4) Behavioural Science -agentti (Anthropic, vaatii 2–4 vk kirjausdataa).

Kriittisin riski: Streak → Firestore liian myöhään → Moduuli 4 ei ehdi aktivoitua pilottikauden aikana.

---

## Pelaajan app — Piilotettu scene-bar (`display:none`)

Kehitysnavigaatio — näkyy vain SA:lle/kehittäjälle. Tuotannossa vain D·PIN ja A1 KOTI.

| Nappi | Nimi | Tila |
|---|---|---|
| D · PIN | PIN-kirjautuminen | ✅ Tuotanto |
| A1 | KOTI | ✅ Tuotanto |
| A2 | Signal / CTA-versio | 🔵 Konsepti |
| B | Harjoitus + valmentajavideo | 🔵 Konsepti |
| C | FIFA-tyylinen pelaajakortti (OVR 87) | 🔵 Konsepti |
| I | Vanhempi (viikkotarina, kalenteri, kehuviesti) | 🔵 Konsepti |

Seuraavaksi rakentaa: C (OVR-kortti) ja I (Vanhempi-konsepti).

---

## Aloita uusi sessio näin

```
Jatketaan TalentMaster-pilottia. SESSION_SUMMARY.md on liitetty.
Ensimmäinen tehtävä: [kirjoita tehtävä tähän]

Live:  https://terokoskela7-cmyk.github.io/talentmaster/
Admin: https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Admin.html
Seura: https://terokoskela7-cmyk.github.io/talentmaster/TalentMaster_Seura.html
SA:    talentmasterid@gmail.com (Google Sign-In)
PIN:   9278 (Topias Koskela, KPV)
```
