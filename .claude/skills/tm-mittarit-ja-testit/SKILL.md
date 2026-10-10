---
name: tm-mittarit-ja-testit
description: >-
  TalentMasterin testit, mittarit ja indeksit: testausinfra (Testaus_v9, Excel-kiertokulku, testi-ID:t, MAS-korjaus, alustaherkkyys), tekniikkakilpailu ja TKI, Excel-tuonti ja Palloliiton PDF-parseri, pikakentät ja mittaristoarkkitehtuuri (pari-invariantti, H-H-normit, d1/d2), suljettu kehityssilmukka (detail-paneelit, delta), KPI Master Architecture, TK per-laji viitetasot ja TKI-analyysimalli. Lataa AINA ennen kuin muutat testi-, indeksi-, normi-, tuonti-, recalc- tai pikakenttäkoodia (tm_eerikkila_normit, testit_indeksit, Excel_Tuonti, Testaus_v9, recalcHH).
---

# tm-mittarit-ja-testit

> Siirretty juuren CLAUDE.md:stä 29.9.2026 (laiska lataus). Osiot SELLAISENAAN, alkuperäisellä numeroinnilla — ristiviittaukset (§N) toimivat. Ehdottomat säännöt sekä tietosuoja- ja turvasäännöt ovat juuressa (CLAUDE.md §0, §7, §12, §38, §39) ja voittavat ristiriidassa.

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

**SM-tasot (SM-juoksu, SM-pallo) ja TSI.** Normit: `EERIKKILA_NORMIT.sm_juoksu` / `.sm_pallo` (Palloliitto FINAL2024), `eerikkilaTaso(arvo, testi, ika, sukup)` → 1–5 kronologisen iän (`normiIka`, testihetken ikä) ja sukupuolen mukaan.
**Tasojen merkitys:** 1 = alle kansallisen keskitason · 2 = hieman alle ("selkeä kehityskohde", `VP_v25:15681`) · 3 = kansallinen keskitaso · 4 = hyvä · 5 = kansainvälinen kärkitaso. **Lähde:** Palloliiton fyysis-teknisten ominaisuustestien tavoitetasot FINAL2024 (pojat ja miehet, tytöt ja naiset) sekä H-H-testimanuaali 2024. Tallennettuja `sm_juoksu_taso`/`sm_pallo_taso`-kenttiä EI lueta (tuonti laski ne joukkueen nimen iällä): tasot lasketaan raakatuloksista (`sm_juoksu_viimeisin`, `sm_pallo_viimeisin`).
**TSI** (`sm_pallo − sm_juoksu`, s) on diagnostinen luku; "pallo hidastaa" -ajatus toteutetaan **tasovertailuna**, ei sekuntirajana. **Tekniikkaluokitus** (`lib/tm_tekniikka.js`, ketju TKI → SM-tasot): TKI < 40 → "alle ikätason"; muuten SM-pallon taso = 1 **ja SM-juoksun taso ≥ 2** → "alle ikätason"; SM-pallon taso ≥ 2 tasoa SM-juoksun tasoa alempana → "pallo hidastaa suunnanmuutoksissa"; **molemmat tasolla 1 → "nopeus ja tekniikka samalla tasolla"**, ei kehityskohde eikä lasketa joukkueluokitukseen (§28: hitautta ei tehdä kehityskohteeksi tekniikan nimellä). Vanhuusraja 15 kk mittarikohtaisesti; puuttuva testipäivä = "päivä tuntematon", ei tuore. Ks. `docs/TEKNIIKKA_MAARITELMA.md`.
**Ansat:** `eerikkilaTaso` leikkaa iän hiljaa 10–19:ään (alle 10 → ei SM-tasoa, 20+ → avain `'M'`/`'N'`), käyttää tyttöjen normia kaikelle muulle kuin sukupuolelle `'M'` (normalisoi `normSukupuoliMN`:llä; tuntematon → ei tasoa) ja palauttaa **0**, kun arvo puuttuu (0 = ei tasoa, ei tasoa 1). Pelaajan `sukupuoli`-kenttä puuttuu usein → sukupuoli joukkuenimen `P`/`T`-tunnuksesta; ilman sitä ei SM-tasoa ja pelaaja on "ei tekniikkadataa" (syy "sukupuoli puuttuu").

**MAS-käännöskorjaus `−20.3 s`** (MyE.Way-pariteetti, 2026-07-01): `MAS m/s = 1200 / (kokonaissek − 20.3)`,
`km/h = ms × 3.6`. Verifioitu 2 MyE.Way-referenssipisteellä. **Kolme kopiota** eri arvoilla ennen korjausta →
yhtenäistetty: `Excel_Tuonti.html` (`MAS_KAANNOSKORJAUS_S`, ent. 20) · `tm_testipankki.js` (`TM_LASKE_MAS`, oli jo
oikein) · `Testituonti_Master.html` (`masAikaKmh`, oli korjaamaton — elävä, Master_v16 `_avaaTuonti`). **Tekninen
velka:** single-source + re-export (sama kuin PHV-vakio); lisäksi Excel_Tuonti pyöristää ms:n ENNEN ×3.6 (→ MyE.Way-tarkka),
Testituonti_Master pyöristää vasta lopuksi (ero ≤0.01 km/h pyöristysrajalla, ei korjauksesta). **PÄÄTÖS 2026-07-01:
vanhaa MAS-dataa EI lasketa uudelleen** (SJK poikien 04-01 MAS −20-perustalla, ero ≤0.05 km/h). Regressio: `tests/mas_myeway.test.js`.

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

## 26. MITTARISTOARKKITEHTUURI

**Periaate:** jokainen Firestoreen tallennettu testidatasetti tuottaa automaattisesti **(1) pikakentät**
pelaajadokumenttiin, **(2) joukkuetason KPI:t** VP-dashboardiin (ka + kattavuus n/koko), **(3) suunnan**
(↑/→/↓ kun ≥2 mittausta), **(4) kattavuussignaalin** kun kattavuus heikko. Pikakentät luetaan dashboardissa
suoraan pelaajadokumentista — **ei alikokoelmakyselyjä renderöinnissä.**

> **⚠️ PARI-INVARIANTTI — arvo + pvm päivitetään AINA atomisesti samasta testituloksesta (2026-07-02):**
> pikakenttä-pari `hh_viimeisin` + `hh_pvm` (samoin `tki_viimeisin`/`tki_pvm`, `tk_lajit_viimeisin`/`tk_lajit_pvm`,
> `flei_viimeisin`/`flei_pvm`) kirjoitetaan **yhdessä**, samasta test-docin pvm:stä. **Juurisyy-bugi:** `recalcHHsplits`
> (+ `recalcHH` sm-persistointi) päivittivät `hh_viimeisin`-ARVOT muttei `hh_pvm`:ää → SJK:lla ~76 % pelaajista väärä
> "viimeisin testi" -pvm (arvot tuoreita, pvm jäi 1.4.). Väärä `hh_pvm` rikkoo §29-kehitysvauhdin pvm-vahdin +
> "vanhin testi X pv" -signaalit (§17/§18). **Korjattu:** `recalcHHsplits` kirjoittaa nyt `hh_pvm`:n lähde-testistä;
> **`korjaaHhPvm(seuraId, dryRun=true)`** (Excel_Tuonti admin, `recalcHH`-perheen vieressä) reconciloi `hh_pvm` =
> **VIIMEISIN (max) vaikuttanut H-H-testipäivä** (A-semantiikka: "milloin viimeksi testattiin"; fyysinen TAI
> H-H-tekniikka syöttö/pujottelu, EI TKI). **EI backdate** — merge-pelaaja (fys 5.6. + tekn 9.6.) → `hh_pvm` 9.6.
> Idempotentti, EI koske arvoihin. Backfill ajettu käsin 46 pelaajalle (SJK 45 + palloiirot 1), 0 ristiriitaa.
> Aja `korjaaHhPvm` kaikille pilottiseuroille + uusien seurojen tuonnin jälkeen. **Per-patteristo-pvm:t** (fyysinen/tekniikka/TKI/PHV erikseen) = pikakenttä `testipaivat` (§ per-pelaaja-detalji).

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
> **✅ IKÄLÄHDE-EPÄJOHDONMUKAISUUS — RATKAISTU (§24/§26, 2026-06-17, docs/IKAKONVENTIO_SPEC.md):**
> Aiemmin recalcHH + Excel-tuonti käyttivät eri ikää (joukkuenimi vs 1.7.-kronologinen) → eri `hh_taso` samalle
> pelaajalle. **Yksi kanoninen `normiIka(syntymaVuosi, pvm, joukkue)` lib:ssä** (`tm_eerikkila_normit.js`):
> **norminhaun ikä = ikäluokka = `year(testipvm) − syntymaVuosi`** (EI 1.7.-vähennystä — normit ovat ikäluokkapohjaisia).
> Pvm puuttuu → currentYear; syntymaVuosi puuttuu → joukkuenimi-fallback. **Bio-ika (Mirwald/PHV §25) pidetään
> erillään desimaalina** (`syntymaaika`/365.25, EI normiIka:n läpi). Korvattu: Excel `laskeIka` (→normiIka), recalcHH
> ikäjohto (idempotentti — ika deterministinen tallennetuista kentistä), `perTestTasot`-kutsut, `_devIkaSp` (Master,
> testipvm:stä ei Date.now()), `_dimIkaSp`/`_jsvPelaajaIka` (VP, per-pelaaja). TKI-pää (§24) oli jo oikein → ei muutettu.
> **RAE (§14/§30):** `raeKvartaali(syntymaaika)` → pikakenttä `rae_kvartaali` (tuonti+recalc) + `RAE_KERROIN`
> {Q1:0.92·Q2:0.96·Q3:1.02·Q4:1.06} lib:ssä valmiina; **sovelluskohta talent/OVR-laskennassa = TODO** (ei keksitty OVR-logiikkaa).
> Vitest: normiIka (3 haaraa) · raeKvartaali (Q-rajat) · idempotenssi · bio erillään. **Re-backfill = erillinen
> runtime-vaihe** vasta kun seurojen `hh_pvm` on korjattu (SJK: korjaa testipäivä ✎-napilla ensin; spec §6).
>
> **✅ VALMIS (2026-06-15): `recalcHH` tallentaa `d1_taso`:n.** `recalcHH` (Excel_Tuonti.html:3877–3916) laskee ja
> kirjoittaa `d1_taso`:n `merge`-setillä. **Ajettu SJK:lle: 58/61 pelaajalla `d1_taso` + `d2_taso` 56** → Master_v16
> Kehitys-näkymän D1/D2-KPI näkyy nyt SJK:lle. **`d1_taso` = D1-fyysisen dimension taso (1–5) = keskiarvo Eerikkilä-tasoista**
> testeistä `lin10m, lin30m, cmj, mas (÷3.6 → m/s), kasirata` — vain niistä jotka pelaajalla on, pyöristys 1 des, null jos 0 testiä.
> **HUOM:** laajempi kuin `hh_taso` (joka käyttää vain `lin30m/cmj/mas`). Ei johdeta lennossa raakadatasta (`hh_viimeisin` =
> raa'at arvot, ei tasoja) — fabrikoitu taso rikkoisi "näytä mitä on" -periaatteen. **Aja muille seuroille kun H-H-data tuodaan**
> (06-15: vain SJK:lla H-H-mittaukset; grifk/palloiirot rosterit ilman testidataa, Sibbo TKI-only). `d1_lahde`/`d1_pvm` ei vielä erikseen.
>
> **✅ JOUSTAVA INDEKSILASKENTA (2026-06-17, §30/§14):** indeksit lasketaan *niistä testeistä jotka on tehty* — ei vaadita kiinteää
> patteria (ulkomaiset/erilaiset testit: esim. Pallo-Iirot P10 = H-H 10m/30m + syöttö/pujottelu, ei cmj/mas/TKI). **Kanoniset funktiot
> `lib/tm_eerikkila_normit.js`** (ladattu KAIKISSA: Excel_Tuonti + Master/VP/Pelaaja/Vanhempi → ei kopioita):
> `laskeD1Joustava(hh,ika,sp)` (fyysisten H-H-tasojen ka, sm_pallo pois), `laskeD2HH(hh,ika,sp)` (**D2 myös syöttö/pujottelusta**:
> ka `eerikkilaTaso` 3-portaisista 1–3 → normalisoitu 1–5 kaavalla `(t-1)*2+1`), `laskeD2Joustava(p,ika,sp)` (prioriteetti TKI→H-H→d2_taso).
> **Kirjoitus:** `prosessoiExcel` (~2967) + `recalcHH` (~3905, käyttää kanonisia) → pikakentät `d1_taso/d1_lahde/d1_kattavuus`
> + `d2_taso/d2_lahde('tki'|'sm'|'hh'|'tk')/d2_kattavuus`. recalcHH **backfillaa jo tuodun H-H-datan** (aja `recalcHH(seuraId,false,true)`).
> TKI/SM/TK-pelaajat ennallaan (H-H vain lisätty fallbackiksi). **Luku:** näkymät lukevat pikakentät + näyttävät **lähteen ja kattavuuden**
> (§29: "näytä mitä on") — Master MITTARI 1 fallback `d1_taso`, MITTARI 3 D2-lähdemerkintä; VP `_d2Lahde`/`laskeJoukkueD2`/hero/solu
> tunnistavat 'hh'/'tk'; Pelaaja FIFA-kortti lukee `d2_taso` (norm5) + `rMinaTekniikkaprofiili` näyttää H-H syöttö/pujottelun **lapsen
> kielellä sekunteina (§7.22: EI tasolukuja pelaajalle)**. Testit: `tests/eerikkila_normit.test.js` (15 uutta). **Vaihe 2:** kansainvälinen
> testi→dimensio-mäppäys (ei-Eerikkilä-testit).

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

**🔭 ROADMAP — seuratason longitudinaalikoonti (gate = ≥2 mittausta/pelaaja, useampi kausi):** kun pituussuuntaista dataa
on tarpeeksi, seuran laajuinen koonti kahdesta kysymyksestä — **(1) kehitysvauhti-%** = kuinka moni kehittynyt vähintään
ikäluokkavaatimuksen mukaisesti (aggregoi `hh_taso_edellinen`/`tki_edellinen`/`tk_kokonaistulos_edellinen`-deltat yli joukkueiden;
**§3.2/§34-invariantti: vauhti abs-parannuksesta, EI pelkästä TKI-laskusta**) · **(2) taso-≥3-osuus** = montako pelaajaa
normitaso ≥3 (`hh_taso`/`d1_taso`/`d2_taso` + `perTestTasot`-helper §8, laske `≥3`-osuus poolista). **EI uutta arkkitehtuuria** —
`perTestTasot` (§8) + delta-kentät (§29) ovat rakennuspalikat; luonteva sijainti Admin "Pilotin tila" (§33) tai VP-raportointi.
Kytkeytyy §29 suljettuun kehityssilmukkaan. Ei rakenneta ennen kuin datamäärä riittää (pullonkaula = datapisteet, ei koodi).

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

## 34. TKI-ANALYYSIMALLI — kolme viitekehystä + kehitysvauhti (2026-06)

> **Täysi kanoninen doc: [`docs/TKI_ANALYYSIMALLI.md`](docs/TKI_ANALYYSIMALLI.md)** — viitekehykset, roolinäkymät (VP/valmentaja/pelaaja),
> kehitysvauhti, H-H-triangulaatio, datalähteet. **Ristiriidassa täysi doc voittaa** (sama pattern kuin §30). Tämä §34 = tislaus.
> Täydentää §23 (TKI aikapohjainen) + §31 (per-laji = viite, ei mitali) + §26 (pikakentät). Suljettu ketju: sama totuus VP:lle, valmentajalle ja pelaajalle.

**Kolme viitekehystä — sama tulos, kolme vertailua:**
- **A Kriteeriviite (mitali):** `TK_KOKONAISRAJAT[sp][ika]` — 🥇🥈🥉 **VAIN kokonaisajasta**. Kertoo TASON.
- **B Eliittiviite (per-laji):** `TK_LAJIVIITTEET[sp][ika][laji] = {erinomainen, hyva}` + `_n` + `_lahde`. **EI mitali** (§31). Kertoo KOHTEEN + MÄÄRÄN (sekunteina).
- **C Populaatioviite (H-H):** FINAL2024 3-portainen (`eerikkilaTaso`, vain pujottelu+syöttö). Kertoo POHJAN.

**PR G (4.10.2026) — KAKSI RINNAKKAISTA LÄHDETTÄ (korvaa alla olevan sekalähteen):** `TK_LAJIVIITTEET_ALUE` (alueellinen top-20, KAIKKI P8–13/T8–13) + `TK_LAJIVIITTEET_VALTAK` (loppukilpailut, vain ikäluokat joilla finaalidataa; P11 n=2) + alias `TK_LAJIVIITTEET = ALUE`. `tkLajiViite(laji, ika, sp, [lahde])` oletus `'alueellinen'`, EI fallbackia lähteestä toiseen. **Lapsen/huoltajan tavoite, merkit, kärkitaso + gapit AINA alueellisesta**; valtakunnallinen vain henkilökunnalle "Loppukilpailutaso 2023–25 (n=X)" -merkinnällä (VP `_jsvPerLajiHTML`, Master `_buildTKIDetail`). Generaattori `parse_taitokisa_csv.py` kirjoittaa saman lohkon `docs/tk_lajiviitteet.js` + `docs/testit_indeksit.js` + `VP_v25` merkkien `// <<< TK_VIITTEET_GEN` väliin (pariteetti: `tests/tk_protokolla_viitelahde.test.js`). **H-H vs TK pujottelu/syöttö erotellaan TUNNISTEELLA** (`pujottelu_hh` / `pujottelu` + `<laji>_protokolla` + dokin protokolla → `lib/tm_testikatalogi.js tmTestiProtokollaId/tmTkHhNormalisoi`), ei mittakaavalla.

*Historia (ennen PR G):* **`TK_LAJIVIITTEET` (testit_indeksit.js + inline-kopiot Excel/VP):** kattavuus **P8–P13, T8–T13**. erinomainen=P25 · hyva=P50 ·
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

---
