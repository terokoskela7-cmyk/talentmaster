# TalentMaster™ — Kehityssuunnitelma (Roadmap)
## Päivitetty 2026-06-15

---

## 🚦 LIVE-TILA 2026-06-15 (Firestoresta luettu — aiemmat tilatekstit olivat jäljessä)

**Vaihe: pilotin käyttöönotto.** Rakennus + analyysimallit (TKI/H-H/FLEI/PHV) lukittu ja testattu;
nyt datankeruu + perheiden adoptio.

- ✅ **Excel → Firestore -tuontityökalu TOIMII** (ent. "kriittisin pullonkaula" → ratkaistu). Pelaajia tuotu:
  **sjk 61 · grifk 145 · sibbovargarna 223 · palloiirot 67 · kpv 34.**
- ✅ **`d1_taso` recalcHH ajettu SJK:lle** (58/61) → Master D1/D2-KPI näkyy. (CLAUDE.md §26.)
- 🟢 **SJK-rekisteröinti käynnistyi tänään:** 58 huoltajakutsua → **6/61 suostumus annettu** (PIN generoitu suostumuksessa).
- ⚠️ **PIN cross-club-törmäys:** seurataan `scripts/check_pin_collisions.js`:llä — 0 törmäystä 06-15 (rakennekorjaus myöhemmin).
- 🔴 **Datan kypsyys vaihtelee:** SJK = H-H (d1/d2/hh/tsi, EI TKI/FLEI/PHV) · Sibbo = TKI-only (214) · KPV = vain Topias ·
  palloiirot/grifk = pelkät rosterit, 0 mittausta. Ks. CLAUDE.md §30 seuradatakartta.

**Lähin työ:** SJK kasvumittaus (PHV 0/61) · `recalcHH` muille kun H-H-data tulee · ADAR-pikakenttien kirjoituspiste.

---

## ✅ TEHTY — A7 Harjoitepankki: kanoonisuus + characterization-testit (2026-06-15)
- [x] **A7 Vaihe 0 — kanoonisuus lukittu:** `src/lib/harjoitelogiikka_v4.js` (2139r, vanha stub) → re-export rootiin (`module.exports = require('../../harjoitelogiikka_v4.js')`). Kanon-kommentti root-tiedostoon. Root (2803r, Jun 9) = ainoa totuus; Pelaaja_v7 lataa Pagesista `?v=6`.
- [x] **A7 Vaihe 1 — characterization-testit:** `tests/harjoitelogiikka.characterization.test.js` (21 testiä). Pinnaa `valitsePaivanHarjoite`/`laskeTekninenKehityskohde`/`generoiMiksiteksti`/`generoimTehtavat` + invariantit ennen refaktorointia. **3 spec-korjausta todellisuuteen:** (1) `lahde:'ikavaihe'`+`varmuus:'oletus'` (ei `lahde:'oletus'`); (2) `generoiMiksiteksti(null)` heittää (siksi Pelaaja_v7:1719 try/catch); (3) ADAR-override vaatii numeerisen `adar_pisteet<40` (ei `{ac}`-objektia). Vitest: **167 testiä vihreänä** (146 vanhaa + 21 uutta).
- [ ] **A7 Vaihe 2** (seuraava, ei vielä) — konvention yhtenäistys: `ohje_*` → nested `ohje:{}`, `phv+phv_xp` → `phv:{ohje,xp}`. Characterization-testit turvaverkko.
- [ ] **A7 Vaihe 3** — datan co-location (T/D/S/T_KOHDE → `HARJOITTEET[id]`).
- [ ] **A7 Vaihe 4** — dead coden poisto: R5 `HARJOITEPANKKI`+`generoimTehtavatV2` (0 HTML-kutsua), `generoimViikoOhjelma` (ei exported, 0 kutsuja), `src/lib`-stub (re-export riittää). Korkein riski → viimeisenä.

---

## ✅ TEHTY — B2 Sentry observability (2026-06-15)
- [x] **Virheseuranta onboarding-kriittisiin 3 appiin** (Pelaaja_v7 · Vanhempi_v2 · Rekisterointi_Suostumus) + jaettu `tm_sentry.js`. Commitit: `1e8cb59` (perus + PII-skrubi) → `723f062` (email-mask + SRI) → `6c4c5a5` (EU-DSN + deploy).
- [x] **SDK:** Sentry Browser **v10.58.0**, errors-only `bundle.min.js` CDN:stä + **SRI-integrity** (verifioitu palvellusta tiedostosta, ei docsista kopioitu). **EU-region** (`ingest.de.sentry.io`, org talentmasterid).
- [x] **Privacy-invariantit:** `tracesSampleRate:0` (VAIN virheet — EI performance-tracingia, EI Session Replayta → siksi EI Loader Scriptiä joka kytkisi replayn) · `sendDefaultPii:false`. Tietoinen valinta alaikäisdatassa (§33 B4).
- [x] **PII-skrubi** (beforeSend/beforeBreadcrumb): deny-list `email|nimi|etunimi|sukunimi|huoltaja|pin|puhelin|osoite` → `[redacted]`; email-regex → `[email]`; 4-num → `****`; `user` → vain `{id}`; query/cookies/headers pois; **skrubin heittäessä event PUDOTETAAN** (PII-turva > virhenäkyvyys). Sallitut tagit vain pseudonyymit `app/seuraId/rooli/uid` (`window.tmSentryContext`).
- [x] **GUARD:** Sentry undefined / DSN placeholder → kaikki no-op, appi ei kaadu (offline-first PWA säilyy).
- [x] **SW:** `sw_pelaaja` v6→v7, `sw_vanhempi` v4→v5; `tm_sentry.js` allowlistissa; Sentry CDN+ingest pass-through (ei cachea).
- [x] **VERIFIOITU TUOTANNOSSA:** testievent saapui EU-dashboardiin; PII-skrubi todennettu ("login fail email [email] pin ****").
- [ ] Avoinna (§33): B1 frontend moduuleiksi · B3 tenant-self-service · B4 GDPR-syvyys (retention/oikeus-unohtua/audit/field-level).

---

## ✅ TEHTY — TKI-analyysiketju + SW-korjaus (2026-06-10/11)
- [x] **TKI-analyysimalli VAIHE 1** (CLAUDE.md §34, `docs/TKI_ANALYYSIMALLI.md`): `TK_LAJIVIITTEET` (per-laji eliittiviite, P8–13 + T8–13, `_lahde` valtak./alueellinen) + funktiot `tkLajiViite`/`tkLajiGapit`/`tkSekuntibudjetti`/`tkVaadittuVuosivauhti`/`tkAbsDelta` + Vitest (119 testiä).
- [x] **Pikakentät** `tk_lajit_viimeisin` + `tk_kokonaistulos_*` 4 kirjoituspisteeseen (Excel/PDF/recalc×2, `_tkLajitPikakentat`). T13 pronssi 130→135.
- [x] **Suljettu ketju — kolme yleisöä:** VP_v25 syvänäkymä-analytiikka (histogrammi · per-laji joukkueprofiili · lähellä merkkiä · kehitysvauhti · Tuki gap+ryhmäjako+taantuma · radar→dimensiokortti · _jspModal per-laji) · valmentaja Master TKI-detail · pelaaja MINÄ-tavoiterivit + TÄNÄÄN-saate (lapsen kieli, §7.22).
- [x] **UI-typografia**: Master detail-paneelit + VP joukkuekortit luettavuusasteikko.
- [x] **SW-cachebugi korjattu** (§27.4): allowlist-periaate — Pelaaja/Vanhempi-SW ei enää kaappaa muiden appien sivuja (oli juurisyy "vanha versio ajossa" -ongelmiin). Cache v2/v3, network-first oma HTML.
- [x] **Bugi**: "Laske TKI uudelleen" huomioi nyt historiapohja-tuonnit (laskee kokonaistuloksen testit-mapista).

---

## ✅ TEHTY — Suljettu kehityssilmukka, Sprint 4 (2026-06)
- [x] **VAIHE 1 — detail-paneelit** (Master_v16 Kehitys): KPI-klikkaus → Eerikkilä-normivertailu (H-H/TSI/TKI) + suositus. `eerikkilaNormiarvo`, MAS-yksikkökorjaus km/h↔m/s.
- [x] **VAIHE 2 — kehitysvauhti/delta**: `hh_taso_edellinen`/`tki_edellinen` (pvm-vahti, vain uusi testi) → Master KPI-badge ↑/↓ + VP pulssikortti "(n/N parantunut)".
- [ ] **VAIHE 3 — kehitysikkunat** (motorinen/PHV/voima biologinen konteksti detail-paneeliin)
- [ ] **VAIHE 4 — reseptimalli** (valmentajan hyväksyntä → Pelaaja_v7 KOTI, suljettu silmukka)
- [x] Roolinvaihto: Seura-pudotusvalikko → `vaihdaKayttajanRooli`-CF + VP rooli-sync. Master Kehitys data-tietoiseksi + AINA Firestore (ei demo) + joukkue case-insensitive. (Ks. CLAUDE.md §29.)

---

## ✅ TEHTY — Sprint 1–3 (ennen 2026-04-08)

### Firebase-infrastruktuuri
- [x] Firebase-projekti `talentmaster-pilot` (Blaze)
- [x] Firestore `eur3` multi-region
- [x] Firebase Auth — Email/Password + Custom Claims
- [x] 8 pilottiseuraa Firestoreen (fcl, kpv, palloiirot, yvies, sjk, grifk, vifk, hjk)
- [x] `luoKayttaja` — setCustomUserClaims, sama email eri rooli OK
- [x] Firestore Security Rules — tietosuoja rakenteellisesti
- [x] Cloud Functions (7 kpl) europe-west1
- [x] Sähköposti: Nodemailer + Gmail (ei SendGrid — eur3-yhteensopivuusongelma)

### Sivut — tuotannossa GitHubissa
- [x] `TalentMaster_VP_v18.html` — VP-dashboard
- [x] `TalentMaster_Master_v9.html` — Valmentajan näkymä
- [x] `TalentMaster_Seura.html` — Seurahallinta (UTF-8 korjattu)
- [x] `TalentMaster_Vanhempi.html` — Huoltajan sivu
- [x] `TalentMaster_IDP_Kortti_v3.html` — toimii KPV:llä
- [x] `TalentMaster_Rekisterointi_Suostumus.html` — fi/sv/en kielituki
- [x] `TalentMaster_UTJ_v1.html` — Kasvattisuppilo-aikajana
- [x] `TalentMaster_Kortit.html` — FIRE/ICON/MILESTONE/TOTY + WOW
- [x] `TalentMaster_Admin.html` — Super Admin -hallinta
- [x] `TalentMaster_ADAR_Koulutus.html` — ADAR-protokolla, neljän hetken malli

### JavaScript-kirjastot (GitHubissa)
- [x] `harjoitelogiikka_v4.js` — leikkija/rakentaja/showcase, DIAG, Stage 1–5, YouTube
- [x] `hpp_rehab_protokollat.js` — 25 kuntoutusprotokollaa
- [x] `tm_testipankki.js` — 64 testiä, 8 protokollaa, FLEI (5 ketjua)
- [x] `tm_ketju_matriisi.js` — fascia ↔ testi ↔ pallotekniikka
- [x] `tm_lang.js` — fi/sv/en, 144 käännöstä
- [x] `tm_import.js`, `tm_empty_state.js`, `testit_indeksit.js`

### Testikerrosjärjestelmä
- [x] Kolme kerrosta: Tekniikkakilpailut / H-H ominaisuustestit / Harjoitettavuuskartoitus
- [x] TKI (biologiseen ikään normalisoitu), TSI, EI, FVP, OVR laskentakaavat
- [x] FLEI 5 ketjua: SBL/SFL/LL/DIAG/DFL — DIAG korvaa SL+FL (Wilke 2016)
- [x] PHV-laskenta: Mirwald 2002 (pojat) — tytöt Sprint 5

### Pelaajaprosessi (testattu)
- [x] VP lähettää rekisteröintikutsun → huoltaja saa sähköpostin
- [x] Suostumuslomake → pelaaja aktiivinen Firestoressä
- [x] Vanhemman sivu + Pelaajan sivu aukeavat oikein
- [x] Salasanalinkki sähköpostissa

---

## ✅ TEHTY — Sprint 4 (2026-04-08 → 2026-04-11)

### VP v18 — Valmentajat-tabi
- [x] Henkilöstö + Valmennus yhdistetty → yksi **Valmentajat**-välilehti
- [x] Näkymä 1 👤: kortit joukkue-grid, hover, väriviiva roolittain
- [x] Näkymä 2 📊: harjoitteluseuranta Power BI -inspiroitu
- [x] `_avaaValmentajaPopup` globaaliksi (oli nested → ReferenceError)
- [x] `window._vpKayntiBadge/Viimeisin/RooliNimet/JData` — cache
- [x] `nimiToUid`-kartta — UID-mismatch mentoroinnit ↔ kayttajat
- [x] Historia max 10 käyntiä, minikriteeripalkisto + toimenpide
- [x] Lazy-loading: `valmentajat:` (oli `henkilosto:` + `valmennus:`)
- [x] `lataaHSSeuranta()` — KPI-rivi + 7 kriteeriä + trendi SVG + valmentajasuodatin

### SJK Juniorit — pilottilaajennus
- [x] Palaveri 2026-04-08: mukaan U15P + U14/15T + talenttipelaajat
- [x] Ensimmäinen seura jolla tyttöjoukkue pilotissa

### Excel-tuontipohja
- [x] `TalentMaster_Testidatan_Tuontipohja.xlsx` (5 välilehteä)
  - 0_OHJEET, 1_Pelaajat, 2_HH_Testit, 3_Harjoitettavuus, 4_Tekniikkakilpailut
  - FLEI% ja paras-tulos automaattiset kaavat, validointi

### Pelihavainto-arkkitehtuuri (suunniteltu, ei koodattu)
- [x] TIPS-malli (Ajax + TM-adaptoitu), 5. kriteeri = IDP-kytkös
- [x] 3-tasoinen rakenne dokumentoitu
- [x] Firestore-rakenne (`pelihavainnot`-kokoelma) suunniteltu
- [x] `TalentMaster_Pelihavainto_Demo.html` — offline-demo Palloliiton palaveriin

### Palloliiton yhteistyö
- [x] Head of Talent -tapaaminen 2026-04-09
- [x] Positioning: TalentMaster = Myeway:n toiminnallinen pari

### Solo-versio — TalentMaster Player™ (uusi tuotehaarake)
- [x] `TalentMaster_Player_Home.html` — splash + nimi + syntymäaika + kortti-reveal
- [x] `TalentMaster_Solo_Profiili.html` — pelaajan profiilisivu
- [x] `TalentMaster_Solo_Arviointi.html` — alkuarviointi 3-kerrosta
- [x] `TalentMaster_Kortti_Demo.html` — korttityypit demo

### Dokumentaatio (päivitetty 2026-04-11)
- [x] `ARKKITEHTUURI.md` — täysin uudelleenkirjoitettu (127 → 510 riviä)

---

## ✅ TEHTY — Sprint 4 jatko (2026-04-19)

### Pelaaja-sivu v3 — täydellinen uudelleenkirjoitus
- [x] `TalentMaster_Pelaaja_v3.html` — korvaa v1:n (lag-bugi historiaa)
- [x] Bottom nav: position fixed, ⚡Tänään / 📅Viikko / 👤Minä / 📈Kehitys
- [x] R2: `_tmOdotaHarjoitelogiikka()` — latausjärjestys-guard (pollaa 150ms, max 3s)
- [x] R4: `_tmNaytaFirestoreVirhe()` — UI error state + 📡 fallback-kortti
- [x] SessionStorage-cache: `_cacheAseta` / `_cacheLue` / `_haeSeuraCached`
  — seurat-kutsut 15/sessio → ~1/sessio, säästö ~40% Firestore-luvuista
- [x] Error monitoring: `window.onerror → Firestore errors/` — tuotantovirheet näkyvissä
- [x] `_suodataStreakViesti()` tyyppiturvaus (null/undefined/numero)
- [x] `harjoitelogiikka_v4.js` defer-attribuutti
- [x] TM Guardian: ✅ 44/44 — 100%

### Firestore Security Rules — täydellinen uudelleenkirjoitus (117 riviä)
- [x] `omatoimi_ohjelmat` — lisätty (puuttui kokonaan, oli täysin auki)
- [x] `onValmentaja()` + `onOmaPelaaja()` helper-funktiot
- [x] `pelaajat` UPDATE: `seuraId`-validointi cross-tenant-estolle
- [x] `kirjaukset`: pelaajaId-guard — pelaaja kirjaa vain omalle tililleen
- [x] `harjoitukset`: rajattu valmentaja-rooleihin (ennen: kaikki seuran jäsenet)
- [x] `errors/`: error monitoring -kokoelma lisätty
- [x] **Huoltajafix:** `resource.data.huoltajaEmail == request.auth.token.email`
  — vanhempi pääsee lukemaan lapsensa pelaajat/havainnot/tapahtumat
- [x] `tapahtumat` read: avattu kaikille kirjautuneille

### Firestore composite-indeksi
- [x] `pelaajat: seura ASC · joukkue ASC` — Enabled
  — estää full scan 200+ pelaajalla, hakuaika ms vs. 3–8s ilman

### TM Guardian — runtime-tarkastusjärjestelmä
- [x] Pelaaja v3: ✅ 44/44 — 100%
- [x] Vanhempi: ✅ 46/46 — 100%
- [x] Kategoriat: värit · nav · näkymä · funktiot · Firebase · harjoitelogiikka · cache · monitoring · tyyppiturvaus

---

## 🔄 KESKEN — Sprint 4 jatkuu

### Kriittiset bugit
- [ ] **🔴 SPF/DKIM puuttuu** — sähköpostit menevät roskapostiin, katkaisee pelaajaprosessin
- [ ] **🔴 Huoltajan kirjautuminen testaamatta** — Rules OK, ei vahvistettu oikealla tilillä
- [ ] **🟡 Fiilinki-kysely väärä U13-vaiheessa** — ikävaihe-tunnistus + leikkija-kieli
- [ ] **🟡 joukkueNimi tallentuu ID:nä** — `Rekisterointi_Suostumus.html`

### SJK-käyttöönotto
- [ ] SJK VP:lle tunnukset Admin-näkymästä
- [ ] Joukkueet Firestoreen: U15P, U14T, U15T, Talenttipelaajat
- [ ] Pelaajat rekisteröidään (ilman suostumusta aluksi)
- [ ] SJK toimittaa testidatan Excel-tuontipohjan muodossa

### Excel → Firestore tuontityökalu ✅ RATKAISTU (ent. kriittisin pullonkaula)
- [x] SheetJS lukee Excel-pohjan selaimessa (`TalentMaster_Excel_Tuonti.html`, CLAUDE.md §24)
- [x] Kirjoittaa Firestoreen oikeaan rakenteeseen (selaimessa, PalloID-haku kentällä; ei openpyxl-CF:ää)
- [x] Käytetty tuotannossa: ~500 pelaajaa tuotu (sjk/grifk/sibbo/palloiirot/kpv)
- [x] Palloliiton PDF-parseri (tekniikkakilpailut) + monipöytätuki + duplikaattisuoja

### Pending deploy GitHubiin
- [ ] `TalentMaster_Koukutus.html` — 3-yleisön engagement ⏳
- [ ] `TalentMaster_Valmentaja_Matriisi.html` — 5-tabi coaching tool ⏳
- [ ] `TalentMaster_Player_Home.html` — Solo onboarding ⏳
- [ ] `TalentMaster_Solo_Profiili.html` — Solo profiili ⏳
- [ ] `TalentMaster_Solo_Arviointi.html` — Solo alkuarviointi ⏳
- [ ] `TalentMaster_Kortti_Demo.html` — Korttidemo ⏳

### Muut Sprint 4
- [ ] Streak-historia Firestoreen (nyt localStoragessa — pakollinen ennen AI-agenttia)
- [ ] Palloliiton laukausstatistiikka-linkki kalenteri-tapahtumaan
- [ ] Automaattinen salasananpalautus `lahetaPelaajaSivuLinkki`-funktiossa
- [ ] harjoitelogiikka_v4.js versioitu tiedostonimi → ikuinen cache (nyt max-age=600)

---

## 📋 TULOSSA — Sprint 5

### Pelihavainto Taso 1 + 2
- [ ] TIPS-lomake valmentajalle Master-näkymässä
  - 5 numerokenttää (T/I/P/S + IDP-kytkös) + vapaa havainto
- [ ] Pelaajan itsearviointi: 3 num + fiilinki + 1 lause
- [ ] Pelaaja näkee valmentajan arvion VASTA oman jälkeen (EPPP-malli)
- [ ] Tallentuu `pelaajat/{id}/pelihavainnot/{otteluId}`

### SJK — aktivointi (kun data OK)
- [ ] Suostumuslomakkeet huoltajille
- [ ] Pelaajatunnukset aktivoidaan
- [x] **Tyttöjen PHV-kaava** ✅ TEHTY — `tm_bioika.js` erilliset Mirwald 2002 -kaavat pojille (Table 1, offset −9.236)
  ja tytöille (Table 2, offset −9.376); `normSukupuoli` N→T. Jäljellä vain **mittaus** (SJK kasvumittaus 0/61).

### Infrastruktuuri
- [ ] Kenttähavainto → Firestore (`havainnot`-kokoelma)
- [ ] ADAR-pisteet → Firestore (`adar`-kokoelma, EI `havainnot`)
- [ ] Valmentajatunnukset joukkuekohtaisilla oikeuksilla
- [ ] Ottelujälkianalyysi-lomake VP:lle

### Solo-versio jatkokehitys
- [ ] Firebase-integraatio (`players`-kokoelma)
- [ ] Google Sign-In
- [ ] PlayerCode → seuralinkitys (kun seura käyttää TM:ää, tulokset yhdistyvät)

---

## 🎯 SPRINT 6–8

### Pelihavainto Taso 3
- [ ] FLEI + pelihavainto rinnakkain VP:n näkymässä
- [ ] IDP-tavoitteen toteutuminen pelissä kausien yli
- [ ] Valmentajan vs. pelaajan arvio — trendi

### AI Behavioural Science -agentti
- [ ] Firestore trigger → Cloud Function → Anthropic API → pelaajan näkymä
- [ ] Aktivoituu: streak katkeamassa / 3 pv putki / fiilinki matala 2 pv /
  uusi viikko / PHV-huippu
- [ ] Ikäkohtainen ääni: leikkija / rakentaja / showcase
- [ ] **Vaatii min 2–4 vk kirjausdataa Firestoressä** — streak → Firestore heti Sprint 4

### Solo-versio kaupallistaminen
- [ ] Stripe-maksut (4,99€/kk tai 34,99€/kausi)
- [ ] OrsaSport-pilottilanseeraus
- [ ] Pelihaaste-mekanismi (PlayerCode-haasteet)

### Muut
- [ ] Klinikkamoduuli (FLEI < 40% → automaattinen)
- [ ] Milestone-kortit Firestoresta
- [ ] Laskutusintegraatio seurajärjestelmään

---

## 🏟️ Pilottiseurojen tila (LIVE 2026-06-15, Firestoresta luettu)

| Seura | Tunnukset | Data (live) | Pelaajat | Seuraava askel |
|---|---|---|---|---|
| SJK Juniorit | ✅ | 🟢 H-H: d1/d2/hh/tsi (58/61), EI TKI/FLEI/PHV | 🟢 **61** (6 rekisteröity) | **Rekisteröinti käynnissä** · kasvumittaus (PHV) |
| Sibbo-Vargarna | ✅ | 🟡 TKI 214, EI H-H/FLEI/PHV | 🟢 **223** | recalc/merkit · H-H-mittaus |
| GrIFK | ✅ | 🔴 vain rosteri, 0 mittausta | 🟢 **145** | Testidatan tuonti (sv) |
| Pallo-Iirot | ✅ | 🔴 vain rosteri, 0 mittausta | 🟢 **67** | Testidatan tuonti |
| KPV | ✅ | 🟡 vain Topias (FLEI/TKI/PHV) | 🟡 **34** (1 testattu) | recalcHH joukkueille |
| FC Lahti | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Pelaajien tuonti |
| Ylöjärven Ilves | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Pelaajien tuonti |
| VIFK | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Pelaajien tuonti (sv) |
| HJK Juniorit | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Pelaajien tuonti |
| EPS | ✅ | 🔴 Ei dataa | 🔴 Ei pelaajia | Teams-puhelu Heini (PENDING) |

**Tuontipullonkaula ratkaistu** (ks. yllä). Datan kypsyys vaihtelee seuroittain — analyysimallit hoitavat tyhjätilat (§30).

**Aktiivinen mittari:** SJK-rekisteröintikonversio (6/61 → tavoite >70 % / viikko, PILOTTI_RUNBOOK go-live-kriteeri).

---

## ⚙️ Avoimet tekniset muistettavat

- **Rules-deploy:** Firebase-konsoli suoraan (GitHub Actions → 403)
- **CDN cache:** ~10 min — `?v=N` + tarkista `raw.githubusercontent.com` ensin
- **`_pelaaja`** on `let` — EI `window._pelaaja`
- **`harjoitelogiikka_v4.js`** ladattava ennen pääscriptejä (tai defer)
- **DIAG:** `sl`-avain poistunut, käytä `diag`
- **`testitapahtumat`** oikea kokoelmanimi (EI `tapahtumat`)
- **`_avaaValmentajaPopup`** GLOBAALI — ei saa olla nested funktio
- **Firebase Functions:** AINA `europe-west1` eksplisiittisesti
- **Tyttöjen PHV:** ✅ kaava tehty (`tm_bioika.js`, Mirwald Table 1/2) — jäljellä vain kasvumittaus
- **Cloud Scheduler API:** aktivoi tarvittaessa Firebase-konsolista
- **Ei VP + Admin samassa selaimessa** (Firebase yksi auth-sessio per projekti)
- **Huoltajaluku Rules:** `resource.data.huoltajaEmail == request.auth.token.email`
- **SessionStorage cache TTL:** 30 min — `_cacheAseta` / `_cacheLue`
- **Pelaaja-sivu guard:** `_tmOdotaHarjoitelogiikka()` ennen harjoitekutsuja
- **Streak → Firestore:** pakollinen ennen AI-agenttia (Sprint 6)
