# TalentMaster™ — Session Summary
# Briefingi uusia Claude-sessioita varten
# Päivitetty: 2026-06-03

---

## Projektin tila

TalentMaster on jalkapallon pelaajankehitysalusta (SaaS, multi-tenant). Firebase-backend toimii Blaze-suunnitelmalla. Pilottiseurat ovat aktiivisia — SJK Juniorit on tuotu järjestelmään (40 pelaajaa, 4 joukkuetta). Seurahallinta on refaktoroitu ja tuotantovalmis. Talenttiohjelma-arkkitehtuuri on suunniteltu ja dokumentoitu.

**Tilanne 2026-05-26:** Työkansio on GitHub Desktop -klooni `talentmaster-github` (vanha `talentmaster-main` = lukuarkisto; git CLI ei PATH:lla mutta bundled `git.exe` toimii commit/push). Tekniikkakilpailu on **täysin aikapohjainen** (TK_KOKONAISRAJAT, TKI nelivyöhyke). Excel-tuonti tukee monisuoritusparsintaa (`_1/_2/_3`) ja **Palloliiton PDF-tuonti** (pdf.js) on toteutettu. PalloID-haku korjattu **kentällä** (where tunniste/palloID), ei doc-ID:llä. TKI näkyy VP_v22 pelaajalistassa ja Master_v16 kehityskortilla (pikakentät). **Rules v2.9 deployattu Consolesta** (biologinen_ika + seura-tapahtumat + vp_kalenteri). Khamis-Roche edelleen LUKITTU (`KR_KERTOIMET_PUUTTUU`) kunnes verifioidut Pediatrics 1995 erratum -kertoimet saadaan.

**Filosofia:** *"Pelaaja ensin, hallinto vahvistaa"*
**Kilpailupositiointi:** *"Transfermarkt shows what. TalentMasterID shows how."*

---

## Sessio 2026-06-04 (Mac) — 10m/5m+FVP, ⓘ-testitulkinta, 5D-radar, Sibbo-tasapaino, signaalitriage

> VP_v25-jatkokehitys. Kaikki diff-tarkistettu + node-syntaksitarkistus ennen committia.

- **10m/5m split-ajat + kiihdytysprofiili** (`0082000`,`1f5ffff`): `hh_viimeisin += lin10m/lin5m` (Excel), `recalcHHsplits`-backfill (SJK 38/40), VP Fyysinen-välilehti näyttää 5m/10m Eerikkilä-tasot. `lib/tm_eerikkila_normit.js` ladattu VP:hen. **FVP** (5m+30m) + **`laskeKiihdytysprofiili(t10,t30)`** (10m+30m-fallback, lentävä väliaika): <1.35 kiihdytys · 1.35–1.50 tasapainoinen · >1.50 huippunopeus.
- **ⓘ-testitulkinta** (`c964125`): `TM_TESTI_OHJEET`-sanakirja + `_tmInfo`-overlay + `_tmIBtn` — koulutus rakennettuna näkymään (mitä mittaa + tulkinta + valmennusvihje), 13 mittaria.
- **5D-tutkakaavio** (`f34281d`,`7a56151`,`2fa4fa5`): `_tmRadar5D` kevyt SVG (ei kirjastoja). Korvasi hero-rivin pelaajan pikakatsauksessa JA joukkueen syvänäkymässä. D1/D2/D4 mitattu, **D3/D5 "tulossa"** (katkoviiva). Koodi lukee `d3_taso`/`d5_taso` jo defensiivisesti.
- **Pelaajat-välilehti** (`f34281d`): TKI-sarake → **Tekninen** (`_tekninenSoluVP`: TKI > TSI/D2, aina 1–5).
- **Sibbo-tasapaino** (`e68a1be`): TKI-only-seura sai 0 toimenpidettä → `TP_SIGNAALIT += tki_alhainen/tki_lahella_merkkia/flei_kartoitus_puuttuu`. **`_tarvitseeTuki(p)`**: tuen tarve = MITATTU heikko (FLEI<50/H-H<2.5), ei puuttuva data (loppui valekriittiset Erityistuki-tagit).
- **Signaalitriage** (`66ded9a`): signaaliväsymys → konsolidointi (sama ryhmä monessa joukkueessa → 1 kortti + erittely) + kolmiportainen hierarkia (KRIITTISET auki · Seuranta suljettu · Onnistumiset suljettu). Sibbo 8 riviä → 2 näkyvää + 2 otsikkoa.

### Roadmap — Sprint B & C (VP_v25-dashboard-track, käyttäjän määrittely 2026-06-04)
> **Biologinen perusta lukittu** (CLAUDE.md §28 + STRATEGIA §2.1): kehitysikkunat = herkkyysvaiheet. Hidden Gem -kynnykset perustuvat näihin, EI mielivaltaisiin lukuihin. **Koodaa Hidden Gem vasta kun §28 invariantit luettu.** Avainsäännöt: korkea D2 + matala D1 = AITO gem vain PRE-PHV (post-PHV fysiikka ei tule automaattisesti); FVP sidottava PHV-tilaan (ilman PHV-dataa ei voimajohtopäätöstä); pre-PHV heikko 30m/MAS/CMJ = neutraali ei negatiivinen; korkea FLEI + korkea D2 pre-PHV = kullankimpale (oma merkki/paino).

**SPRINT B — Hidden Gem -ydin TOTEUTETTU 2026-06-04** (`93f0979` luokitin + `09c7a44` backfill):
- `laskeHiddenGem(p)` + `_hgBadge` + `_onTalenttisuositus` VP_v25:ssä — Pelaajat-taulukko + talenttisuositus-suodatin näyttävät lasketun HG:n (ehdokas/vahvistettu/eliitti/FLEI/kullankimpale). Kynnykset D2≥3.5/D1≤2.5/erotus≥1.0 (kalibroitavissa).
- `recalcVarhaiskehitys(seuraId, dryRun)` Excel_Tuonti SA-konsoli — eliittiportaan pikakenttä `tekninen_varhaiskehitys` testituloksista.
- **KÄYTTÄJÄN AJO:** `recalcVarhaiskehitys('sibbovargarna', true)` → `false` (Sibbon eliitit näkyviin).
- **Kesken:** HG-badge per-pelaaja-popupiin/radariin, DI/Raportointi-laskurit lukemaan laskettua HG:tä (nyt yhä `p.signaali`), kynnyskalibrointi 300+ pelaajalla.

**SPRINT B (alkup. määrittely):**
- **Hidden Gem -logiikka** — korkea D2 + matala D1 + PRE-PHV (myöhäiskypsyvä lahjakkuus: tekninen ikkuna ~6–13 v käytetty, fyysinen nousuvara biologisesti edessä). **Kolmiportainen vahvistus:**
  1. **Ehdokas** = korkea D2 + matala D1 (poikkileikkaus, toimii nyt pilottidatalla).
  2. **Vahvistettu** = + PRE-PHV (fyysinen nousuvara edessä; vaatii bio-ikädatan).
  3. **Tekninen varhaiskehitys vahvistettu** = + tekniikkakilpailun **kulta/hopea U8–U12** (longitudinaalinen: tekninen ohjelma rakentui plastisimmassa ikkunassa → motorinen automatisaatio → vapauttaa kognition peliälylle). **Vahvin signaali**, eri luokka kuin pelkkä korkea D2 tänään. Ks. CLAUDE.md §28 invariantti 5.
  - **Toteutus:** pikakenttä `tekninen_varhaiskehitys: {merkki, ika, pvm}` (null jos ei) — laske tuonnissa/recalcissa `testitulokset/`-alikokoelmasta (paras kulta/hopea, ika 8–12). EI alikokoelmakyselyä renderöinnissä (§26).
  - Korvaa/tarkentaa nykyisen FLEI-pohjaisen Hidden Gemin (`HIDDEN_GEM_FLEI`). Esimerkkiprofiilit SJK: Vakkila Sara (D2 4.5, tasapainoinen huippu), Lahti Eeli (SM-juoksu 5 / SM-pallo 3, D2 4 — HUOM: nopeus-on-tekniikka-jäljessä = TSI-kehityskohde, ei def-mukainen Hidden Gem), Nieminen Onni-Matti (D2 1.5, pallo hidastaa).
- **Kehitysvauhti-laskenta** — aktivoituu kun `hh_taso_edellinen`-pikakenttä täyttyy 2. mittauksesta.
- **PHV + RAE -integraatio.**

**SPRINT C (kun dataa enemmän):**
- **AI-insight** (aiProxy → narratiivi).
- **Historiatrendit sparkline-kaavioina.**
- **Toimenpiteiden seuranta** (kuinka moni toteutui).

### Tuleva sprintti — "Bola sempre" -silta (mittaa → tunnista → määrää → toista)
- **TUKI → päivittäinen harjoite (A, käyttäjä prio):** joukkueen `tki_kehityskohde` (heikoin laji, esim. syöttö 8/14) → konkreettinen päivittäinen harjoitesuositus → kytkeytyy **Pelaaja_v7 T-kirjaukseen** ("bola sempre" = pallo joka päivä) **ja IDP-korttiin**. Periaate jo §14:ssä ("T-harjoite joka päivä", "S kohdistuu heikoimpaan ketjuun") — puuttuu silta kehityskohteesta päivittäiseen harjoitteeseen. Loop: tekniikkakilpailu (mittaa) → TUKI (tunnista heikoin) → harjoitemääräys (bola sempre) → T-kirjaus (toista) → seur. kilpailu (mittaa uudelleen). Konteksti: tekniikan herkkyysikkuna 6–13 v (§28) — U8–12 matala D2 = kiireellinen mutta korjattavissa, ikkuna vielä auki.

### Backlog (UI-hienosäätö, ei sidottu sprinttiin)
- **Toimenpiteet-paneeli: eräpäiväpohjainen lajittelu** (EI signaalien kolmiportaista hierarkiaa). Peruste: signaali (hero-insightin "aamukatse") ≠ toimenpide (jo syntynyt reaktio). Tärkeys = eräpäivä + vastuuhenkilö + tila, ei kriittinen/seuranta. Tarve: erääntyneet ylös → tulevat viikot → kuitatut piiloon.
- **D3 Psyykkinen + D5 Sosiaalinen -datankeruu** (5D-radar täyttyy automaattisesti kun `d3_taso`/`d5_taso` syntyvät).
- **Ruotsinkieliset sivut** — GrIFK/VIFK/Sibbo tulokset tuodaan suomeksi (parseri OK nyt), mutta käyttöliittymän sv-lokalisointi tärkeä tulevaisuudessa. PDF-parserin `IKAOTSIKKO`-regex laajennettava F=Flickor kun sv-tulosteita tulee.

---

## Sessio 2026-06-03 (Mac) — SJK H-H-tuonti, MAS/TSI/SM-tasot, VP_v25 Sprint A+B, universaali testiarkkitehtuuri

> **Iso sessio.** Päämuutokset: Excel-tuonnin nimi-yhdistys (SJK ilman PalloID:tä), MAS-aika→nopeus, recalc-työkalut (HH/TSI/SM-tasot), VP_v25:n koko etusivu-uudistus (dimensiopopup, mobiili-first, 2×2-grid, hero-insight, toimenpiteet), Master_v16 auth-fix, ja **universaali testirekisteri** (Sprint B). Kaikki diff-tarkistettu ennen committia.

### 1. Excel-tuonti: nimi-yhdistys + MAS + recalcHH
- **`yhdistaPelaajaXlsxNimella`** (historia-moodi, kun PalloID puuttuu): `where(sukunimi)+where(etunimi)` → 1 auto · 2+ manuaalivalinta (`asetaXlsxPelaaja`) · 0 ei_loydy. Kokeilee myös käänteisen nimijärjestyksen. **Validointi relaksoitu:** historia-moodissa PalloID ei pakollinen jos nimet löytyvät. (SJK: 40 pelaajaa, vain nimet.)
- **`parseMasAika`**: "4,40 min"/"4.40"/"4:40" → m/s + km/h. **`testit.mas` = km/h** (HH_NORMIT_PIKA on km/h → HH-taso laskee oikein). `mas_aika_s/mas_nopeus_ms/mas_kmh` talteen.
- **`recalcHH(seuraId, dryRun)`** (SA-konsoli, Excel_Tuonti): laskee `hh_taso` olemassa olevasta `hh_viimeisin`:stä kun tuonnin ika/sp puuttui. **cmj→hyppy_cj remap** pakollinen. Ikä/sp joukkuenimestä.

### 2. VP_v25 etusivu-uudistus (iso, monta committia)
- **H-H-sarake** joukkuepulssiin + pelaajalistaan (`hhTasoVari`, pikakentät).
- **Kaksikerroksinen dimensiopopup:** Kerros 1 (joukkue) → klikkaus → Kerros 2 (`_avaaPerPelaajaPikakatsaus`, 4 dimensiovälilehteä Fyysinen/Tekninen/Peli/Kehitys, ← edell./seur.→ nav).
- **Mobiili-first** (yksi `@media`): typografia, pulssi 3→4-saraketta, pelaajakortit, touch 44–48px, Tabler-tab-ikonit (CDN `@tabler/icons-webfont@3`), Fyysinen-testirivit (hh-testirivi) + hero D-kortit.
- **2×2-grid:** KPI-kortit (`keh-*`, EI `kpi-*` koska kpi-rivi varattu) + joukkuekortit (`jk-grid`) + kompakti toimenpidelista.
- **Sprint A:** `laskeHeroInsight` (5 sääntöä, hero-summary), joukkuekortit suunnalla (`laskeJoukkueSuunta`, vaatii `hh_taso_edellinen` jota ei vielä kirjoiteta → "2. mittaus puuttuu"), **toimenpiteet** (Firestore `toimenpiteet`-kokoelma: auto-ehdotus→kuittaus/muokkaus/hylkäys, dedup signaaleittain + prioriteettiryhmät + max 3).
- **4 UI-korjausta:** signaalimobiili, pulssi-kontrasti (juurisyy: `rivi-ei-dataa` opacity dimmaa H-H-only-rivit → korjattu), dynaaminen FLEI-kortti (3 tilaa). **SUHDE KANSALLISEEN H-H-fallback** (`_suhdeKansalliseen`: ≥3 TKI → benchmark, ≥3 H-H → Eerikkilä-%).

### 3. Master_v16 auth-fix — Joakim (Sibbo testivastaava) ~30s uloskirjautuminen
Juurisyy: `getIdTokenResult(false)` palautti vanhan tokenin → `claims.seuraId` tyhjä → **`seuraIdToUse='kpv'` (väärä fallback)** → KPV-luku → permission-denied → 8s auth-timeout. **Korjaus:** `(false→true)` tuore token + **kpv-fallback poistettu** (puuttuva seuraId → `naytaVirhe` + signOut). SA turvassa (admins-haara palaa ennen guardia).

### 4. TSI + SM-tasot + EI (§22: TSI = SM-pallo − SM-juoksu)
- **`recalcTSI`** + Excel profiiliUpdate `tsi_viimeisin`/`sm_juoksu_viimeisin`/`sm_pallo_viimeisin`. VP popup lukee `tsi_viimeisin` (§19).
- **`recalcSMtasot`**: SM-juoksu/SM-pallo Eerikkilä-tasot (1–5) + `d2_taso` (ka.) + `ei_viimeisin` (CMJ−SJ). Avaimet `sm_juoksu`/`sm_pallo` (EI `_s`).
- **Tekninen-mittarin prioriteetti TKI > TSI/D2 > —** läpi KOKO VP_v25:n (KPI-kortti, joukkuekortti D2-rivi, joukkue/pelaaja-hero, popup-pelaajataulukko). SM-pohjainen → ¹-merkintä + footnote. Skaalautuu TKI:hin kun se täyttyy.

### 5. Universaali testiarkkitehtuuri (Sprint B) — `lib/tm_eerikkila_normit.js`
**Mittaus universaali, normi paikallinen.** `UNIVERSAALI_TESTIREKISTERI` (13 testiä, D1/D2/D4, kv-aliakset DE/NL/EN, pikakentät) + `KOMPOSIITTI_INDIKAATTORIT` (hh_taso/tsi/ei) + `NORMIREKISTERI` (FI nyt; DFB/KNVB tuleva) + `NORMI_OLETUS`. `eerikkilaProfiilit` refaktoroitu rekisteripohjaiseksi. **lib ladataan nyt Excel_Tuontiin `<script>`-tagilla** (eerikkilaTaso globaaliksi). Testaus_v9 hyppy-id:t kanonisoitu (`cm_jump→hyppy_cj`, `sj_jump→hyppy_sj`) → EI laskee kenttämittauksista.

### Keskeiset committit (uusin viim.)
nimi-yhdistys → MAS → recalcHH → H-H-sarake → dimensiopopup → mobiili-first → 4 UI-korjausta → SUHDE/kehityskortti → Sprint A (hero/kortit/toimenpiteet `f66bf9d`/`5e1c417`) → Rules v3.1 `d534f4b` → 2×2-grid `494cd5b` → toimenpide-dedup `d993157` → Master_v16 auth `08d7938` → TSI `0f242ce` → Sprint B (`a7c3b4d` lib · `8fc0bf8` Excel · `5b80cbb` VP/rules/Testaus) → KPI/D2-fallback `0f3977c` → joukkuekortit D1+D2 `e9ab245` → popup Tekninen-sarake `eb9933a`.

### ⚠ Avoimet seuraavaan sessioon (tärkeät)
1. **DEPLOY Rules Consolesta:** `tm_admin/firestore.rules` **v3.2** (toimenpiteet v3.1 + konfiguraatio v3.2) — kunnes deployattu, toimenpiteet-kirjoitukset → permission-denied (graceful placeholder).
2. **Aja SA-konsolista (Excel_Tuonti, SJK):** `recalcTSI('sjk',false)` → `recalcSMtasot('sjk',false)` (recalcSMtasot lukee TSI:n SM-pikakentät; recalcHH jos hh_taso puuttuu). Tarkista dry-run ensin.
3. **`hh_taso_edellinen`** — suuntanuolet (↑↓→) aktivoituvat vasta kun tuonti kirjoittaa edellisen mittauksen pikakentän (nyt "2. mittaus puuttuu").
4. **`eerikkilaProfiilit`:** `hh_viimeisin_lin30m/cmj/mas` ovat flat-nimiä mutta data nested (`hh_viimeisin.{}`) → eivät resolvoidu; SM-testit (flat) toimivat.
5. **Testaus_v8** (arkistoitava) sisältää yhä `cm_jump`/`sj_jump` — kanonisoi jos v8 vielä käytössä.
6. Demo-dataan d2_taso/tsi jos halutaan TSI/D2 näkyviin demo-tilassa.
7. (Edellisestä) VP_v25 Vaihe 4 nominointikortit · FC Lahti P12 · GrIFK PDF · SendGrid ~400 kutsua.

---

## Sessio 2026-06-02 (Mac) — VP_v25 migraatio (Vaihe 1–3) + kutsuinfra + Sibbo-data

> **Ympäristö:** siirrytty Macille (`/Users/terokoskela/projects/talentmaster`). Node v26, git SSH toimii, `gh` CLI puuttuu (Actions-tila tarkistettu REST-API:lla). **Chrome-MCP** (chrome-devtools-mcp) asennettu local-scopeen. **Huom:** SA-visuaalitesti ei onnistu MCP:llä — Google estää automaatio-Sign-In:n + Chrome 148 estää oletusprofiilin remote-debugin → validointi koodiauditilla + demo-tilalla + käyttäjän omalla selaimella.

### 1. CLAUDE.md auditoitu + tiivistetty — `b2e77dd`
1742 → **747 riviä** (−57 %). Numerointi korjattu (tupla-§23 + numeroimaton osio → juokseva 1–27), 4 hajanaista footeria poistettu. Duplikaatit yhdistetty (RAE ×3, kv ×2, bio-ikä, TKI, Rules). **Strategia/RAE-tiede/sprintit/bisnesmalli eriytetty → `docs/STRATEGIA.md`** (uusi). Kaikki tekniset invariantit säilytetty.

### 2. Kutsu-sprint (`9b0a48b`) varmistettu Macilla + WhatsApp-korjaus — `72b15cf`
Kutsu-CF (`9b0a48b`) varmistettu vihreäksi. Kutsu-/reset-WhatsApp **aina aktiivinen** (`wa.me/?text=` fallback) kaikissa virroissa (`72b15cf`).
- **Henkilöstön muokkausmodaali** (Seura Henkilöstö): etunimi/sukunimi/**puhelin** → `kayttajat/{uid}` (Rules sallii SA/johto) — `76aa3c2`. Tallennettu puhelin → WhatsApp suoraan `wa.me/<numero>`.
- **Uusi CF `lahetaResetLinkki`** (SA/johto-authz, `generatePasswordResetLink`, ei datakirjoitusta) → henkilöstön reset 3-nappi-jakona — `fe0e5ae`; 500-bugi (puuttui `url` actionCodeSettings:istä) korjattu — `c381f29`.
- Admin osoitti VP_v18:aan → korjattu v25:een; greeting tyhjä ennen kirjautumista; VP_v25 lukee `?seura=` URL:sta (SA avautuu oikealla seuralla) — `7f73220` · `22c2787`.

### 3. Mobiili + WCAG-kontrastit (6 näkymää) — `c135de6` · `3583f31` · `830b044`
`--ink3`-kontrasti nostettu AA-tasolle (~4.5–5:1), `::placeholder { opacity:1 }`, mobiilikorjaukset. **VP_v22 juurisyy** (`3583f31`): sidebar on `position:fixed` mutta `#main { margin-left:var(--sb) }` jäi → sisältö leikkautui mobiilissa → nollattu 768-lohkossa. **Master_v16** (`830b044`): light-teeman teal-teksti #28B090→**#1A7A5E** (2.8→4.7:1), kuollut `--slate` poistettu. Canonical §5 bg/accent-tokenit koskematta.

### 4. Sibbo-Vargarna data + TKI-recalc — `792f963` · `4454b46`  ✅ ajettu
3 PDF:ää tuotu (P8–P13 + T8–T13, ~158 pelaajaa). **P10 TKI-bugi** (P9-rajoilla → TKI 33 ≠ 54): juurisyy = väärä tallennettu `merkkirajat` + puuttuva `syntymaVuosi`. Työkalu `recalcIkaluokasta` (Excel_Tuonti, SA): johtaa iän+sp `ikaluokka`-kentästä, **OHITTAA** merkkirajat → `TK_KOKONAISRAJAT[sp][ika]`. **Ajettu: 147 pelaajaa, 0 virhettä** (`recalcIkaluokasta('sibbovargarna', null, false)`).

### 5. VP_v22 joukkuepulssi — `e4ec723`
Sibbo (vain TKI-dataa) näytti tyhjältä. Korjaus: tyhjät mittarit himmennetään (TKI näkyy), lyhyet nimet (`lyhennaNimi`, P/T säilyy), BQ piilotetaan kun syntymäaika puuttuu, pienet joukkueet (<3) merkitään.

### 6. VP_v25 migraatio (v22→v24-design) — `e1f6d3b` `2a36bee` `4468a3e` `edae410`
`cp v22 → v25`, **Firebase-koodi koskematon**. **Vaihe 1:** typografia + tokenit, topbar (breadcrumb/haku/kieli/profiili), greeting-hero, joukkuepulssi kortit→taulukko. **Vaihe 2:** signaalimoottori `renderSignaalit` (S1–S8, osio "02"), dynaaminen greeting + **kontekstiäly** `laskeKayttoVaihe` (1 ohjattu aloitus / 2 kasvava / 3 normaali), FLEI-signaali seuratasolle, järjestys P8→P13→T8→T13. **Vaihe 3:** **TKI-benchmark-taulukko** — `TK_KANSALLINEN_BENCHMARK` (valtak. tekniikkakilpailut 2022–2025, P/T erikseen), benchmark-palkki + ★ kansallinen-merkki, taso-badget, merkit/paras-sarakkeet. Validoitu chrome-MCP demossa. **Omat luokkanimet** (`greeting-*`/`joukkue-taulukko`), ei spec'in; v24-ref on bundler (`/tmp/vp_v24_ref.html`).

### Commitit
`b2e77dd` `72b15cf` `c135de6` `3583f31` `830b044` `792f963` `4454b46` `e4ec723` `e1f6d3b` `2a36bee` `4468a3e` `cc52515` `7f73220` `22c2787` `fe0e5ae` `c381f29` `76aa3c2` `edae410`

### Avoimet seuraavaan sessioon
1. **VP_v25 Vaihe 4:** nominointikortit (Hidden Gem / X-Factor / Erityistuki).
2. **FC Lahti P12** — pelaajat rekisteröitävä ENNEN PDF-tuontia.
3. **GrIFK** tekniikkatulokset — PDF-tuonti.
4. **SendGrid aktivointi** — ~400 huoltajakutsua jonossa.
5. **Reset continueUrl HOLD:** `lahetaResetLinkki` url = Seura.html; halutaanko VP_v25-landing? Yhtenäistä luoKayttaja/lahetaResetLinkki/lahetaPelaajaSivuLinkki.
6. **VP→Seura-linkki** VP_v25:een (puuttuu).
- SA-testi oikealla datalla: VP_v25 (Sibbo/KPV/SJK) + henkilöstön reset.

---

## Sessio 2026-06-01 — Käyttäjäkutsu: linkki aina + WhatsApp-jako  ✅ varmistettu Macilla (CF-deploy vihreä `9b0a48b`)

> **HANDOFF (kone vaihtui Windows → Mac):** tämä sprint on **committattu ja pushattu**, mutta
> deploy + selaintesti vielä tekemättä. Jatka tästä kun avaat Macin.

### Valmistui tässä sessiossa — commit `9b0a48b`
**Ongelma:** `luoKayttaja` loi käyttäjän (200) mutta SendGrid-sähköposti epäonnistui
("Maximum credits exceeded") → käyttäjä jäi ilman kirjautumislinkkiä.

**Ratkaisu — sama pattern kuin Rekisteröintikutsussa** (luo → generoi linkki → näytä jako-optiot):
- **`functions/index.js` `luoKayttaja`:** linkin generointi **eriytetty** sähköpostin lähetyksestä.
  Palauttaa nyt AINA `passwordResetLink` (+ `resetLinkki` backward-compat), `emailSent`,
  `emailError`, `email`, `rooli`, `etunimi`. SendGrid-virhe ei enää kaada linkin saantia.
- **`TalentMaster_Seura.html`** (kutsuModal / `tallennaKutsu`): puhelinkenttä (`kutsu_suuntakoodi`
  +358/46/47/45/372 + `kutsu_puhelin`), nappi **"Luo käyttäjätunnus"**, tuloskortti `#kutsuTulos`
  jako-napeilla 📧/💬/📋. Jako-funktiot `window._kutsuJaaSahkoposti/Whatsapp/Kopioi/Uusi`.
- **`TalentMaster_Admin.html`** (`luoUusiKayttaja`): sama puhelinkenttä (`uusiSuuntakoodi`/`uusiPuhelin`),
  jako-napit `#kayttajaOnnistui`-korttiin, `window._adminKutsu*`-funktiot.
- **Fallback molemmissa:** `data.passwordResetLink || data.resetLinkki` (Seura.html:3348, Admin.html:1488)
  → WhatsApp/jako toimii myös vanhalla CF:llä, ei odota redeployta.
- WhatsApp: `wa.me/<maakoodi+puhelin>` (johtonollat stripattu); sähköpostin tila-rivi `emailSent`-kentästä.

### Avoimet asiat (TEE MACILLA ENSIN)
1. **GitHub Actions deploy:** `deploy_functions.yml` triggeröityy `functions/**`-pushista →
   CF redeployaa automaattisesti (ei manuaalia). **Varmista että commitin `9b0a48b` ajo on vihreä:**
   https://github.com/terokoskela7-cmyk/talentmaster/actions/workflows/deploy_functions.yml
   — vasta sitten `emailSent`-tilanäyttö ("📧 lähetetty" / "⚠️ ei lähtenyt") toimii.
2. **Selaintesti SA:na** (talentmasterid@gmail.com, Google Sign-In): Seura.html + Admin.html →
   Kutsu uusi käyttäjä → täytä + puhelin → "Luo käyttäjätunnus" → tuloskortti näkyy? WhatsApp-nappi
   avaa oikean `wa.me`-linkin? Kopioi toimii? Muista `?v=N` (CDN ~10 min).

---

## Sessio 2026-05-27 — TKI-laskenta + PDF-parserin viimeistely

### Valmistui tässä sessiossa
- **PDF kaksipassi-parseri** (Sibbo: P12 23 · P10 26 · P9 15, 0 duplikaattia) — `54e2965`. Korvasi jonotusmalli+sija-reset-heuristiikan: Passi 1 kerää otsikot+indeksit, Passi 2 parsii osiot erikseen + dedup sivunvaihdon yli. Ks. CLAUDE.md §32.
- **P12 sarakekartoitus korjattu** — loppuankkurointi (`lopputulos=nums[n-1]`, `ponnauttelu=nums[n-2]`) + O+V pituuspotku **"X+Y"-muoto** (esim. "18+26") puretaan kahdeksi numeroksi — `5169010` + `0bee2c5`.
- **TKI-laskenta korjattu:** kultavyöhyke ei ylivuoda (`ideaali = Math.min(kulta*0.5, kokonaistulos*0.5)`), `tkLaskeMerkki` käyttää `<` ei `<=`, merkki lasketaan **aina kokonaistuloksesta** ei TKI:stä — `abbec43` + `a6b0244`.
- **Recalc kirjoittaa `tki_merkki: null`** myös kun merkki puuttuu → poistaa vanhan väärän merkin — `f6cd5da`.
- **Recalc syntymävuosikorjaus + null-nollaus + kilpailuvuosi pvm-kentästä** — recalc johtaa iän pelaajan `syntymaVuosi`-kentästä (ei testituloksen ikäluokasta), kilpailuvuosi luetaan `d.pvm`-kentästä, ja kun `tki == null` recalc **nollaa** `tki_viimeisin`/`tki_merkki` pelaajadokumentista (ei enää ohita pelaajaa) — `8e5957f` + `9ee081e`.
- **VP_v22 + Master_v16 merkki-fallback poistettu** — `_tkiMerkkiVP`/`_tkiMerkkiM` lukevat VAIN `tki_merkki`-kentästä (ei TKI-johdettua fallbackia) — `ab478f7`.
- **Admin: ↻ Laske TKI uudelleen** (SA-only nappi Excel-tuonnin topbarissa) — `tki_viimeisin` uudelleen viimeisimmästä testituloksesta — `e9c4dda`.
- **`siivoaBugisetTulokset(seuraId, ikaluokka, maxKokonais, dryRun=true)`** SA-konsolifunktio — poistaa testitulokset joissa kokonaistulos_s < maxKokonais (dry-run oletus) — `61ed4b7`.
- **Master_v16 testipalaute + harjoitusprioriteetti** — Testit→Tulokset (TKI-pikakentistä) + palautemodaali (`palautteet/{pvm}_tki`) + joukkueprioriteetti (`harjoitusprioriteetti/aktiivinen`) → Tänään-fokus — `8e78d1f`.
- **merkkirajat tallennetaan testitulokseen** + recalc käyttää niitä (`rajatOverride`) — `abb152c`.
- **"Syöttö pujotellen" → "Syöttö"** koko sovelluksessa (Master_v16, VP_v22, Testaus_v9, Testituonti_Master, docs/testit_indeksit.js, CLAUDE.md §23; Excel-otsikko `Syotto_s`) — `abbec43` + `87ae6d1`.
- ✅ **NUMS-debug-loki + kuolleet funktiot poistettu** (`_pdfNumeroitaRivilla`, `_tkiMerkki`), `PDF_VERSIO = 'kaksipassi-v5'` — `af43325`.
- ✅ **Firestore Rules v3.0 deployattu Consolesta** (`palautteet`, `harjoitusprioriteetti`) — Master_v16 testipalaute-toiminto on nyt testattavissa.

### Avoimet asiat (seuraava sessio)
- **GrIFK-tekniikkatulokset + Sibbon loput tulokset syötettävä** (PDF-tuonti) — dataa puuttuu vielä.
- **FC Lahti P12 — pelaajat rekisteröitävä ENNEN PDF-tuontia** (PDF EI luo pelaajia automaattisesti, yhdistää vain nimellä).
- **Osasuoritukset näkymiin** — pelaaja/valmentaja/VP: omat ajat per laji, delta edellisestä, ennätys.
- **ADAR-pikakenttien KIRJOITUS** — `paivitaAdarPikakentat()` valmis, kytkettävä `ADAR_Pikakortti.html` `saveCard()`:iin.
- **KR-kertoimet** (Pediatrics 1995 erratum) — `laskeKR()` lukittu kunnes verifioidut kertoimet.

### Commitit (uusin viimeisenä)
`8e78d1f` testipalaute+prioriteetti → `abb152c` merkkirajat tallennus → `7cf15df` dup korvaa-säilytys → `4f2e2ae` dup-toggle → `61ed4b7` siivoaBugiset + merkki `<` → `a6b0244` merkki kokonaistuloksesta → `87ae6d1` Syöttö-yhtenäistys → `5169010` P12 sarakekartoitus → `0bee2c5` X+Y pituuspotku → `e9c4dda` admin recalc → `af43325` siivous (v5) → `ab478f7` merkki-fallback pois → `f6cd5da` recalc kirjoittaa null → `8e5957f` recalc TKI syntymävuodesta → `9ee081e` recalc null-nollaus + kilpailuvuosi pvm-kentästä. (välissä PDF_VERSIO-bumppeja v1→v5 + GitHub-web-muokkauksia.)

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
- ✅ **PDF-tuonti VALMIS** (2026-05-26): parseri uudelleenkirjoitettu **kaksipassiseksi** (`kaksipassi-v3`) — Passi 1 etsii otsikot + rivivälit, **dedup** yhdistää sivunvaihdon yli toistuvat otsikot (P9 sivuilla 1+2), Passi 2 parsii kunkin osion `ctx`-OBJEKTILLA `{ikaluokka, ika, sukupuoli}` (string rikkoisi P12:n). Korvasi hauraan jono/sija-reset/sarakemäärä-heuristiikan. **Sibbo: P12 23 · P10 26 · P9 15 = 64 riviä, 62 yhdistyi nimellä, 0 duplikaattia.** Ks. CLAUDE.md §32. ⏳ Testaa silti GrIFK/muut tulosteet — `IKAOTSIKKO`-regex olettaa otsikkorivin tekstin = täsmälleen esim. "P12", ja kaksipassi olettaa otsikko→data-lomituksen (ei "kaikki otsikot ensin").
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
| `TalentMaster_Player_Home.html` | ✅ **Solo (B2C "Player™")** — onboarding (Sprint 4, 2026-05-29) |
| `TalentMaster_Solo_Profiili.html` | ✅ **Solo** — profiili + tkk-tulokset + kotimittarit + PlayerCode |
| `TalentMaster_Kortti_Demo.html` | ✅ **Solo** — FIFA-kortti Starter/Sharp/Elite |
| `TalentMaster_Solo_Arviointi.html` | ⏳ Solo-alkuarviointi PENDING (ROADMAP.md) |
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
