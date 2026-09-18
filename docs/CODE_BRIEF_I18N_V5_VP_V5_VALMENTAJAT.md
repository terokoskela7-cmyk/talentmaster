# Code-brief — i18n V5 · VP_v25 **alaerä V5: Valmentajat sv + 2 pakollista vartija-laajennusta**

> **Konteksti:** V3 (Joukkue-syvänäkymä) · V4 (Kalenteri, +2 live-korjausta) mainissa ja **live-verifioitu tuotannossa
> (demo sv → 0 fi-chrome)**. Kolmen vartijan malli paikoillaan: AST-gate (literaalit) · resolves-scanner (kartta) ·
> object-property-guard (member-näytöt, `RANGES`+`MEMBER_DISPLAY`). **V4:n live paljasti kaksi luokkaa joita mikään
> vartija ei vielä näe** → V5 rakentaa ne (staattinen-DOM + `.textContent=`) ENNEN/OSANA reititystä.

---

## VAIHE 0 (PAKOLLINEN, ENSIN) — kaksi vartija-laajennusta (V4-live-opit)

### 0A — VP staattinen-DOM-vartija (neljäs vartija)
V4-livessä kalenterin **staattinen työkalupalkki** (kovakoodattu fi ilman `data-i18n`) vuoti — mikään kolmesta
vartijasta ei nähnyt sitä (ne skannaavat JS-renderiä, ei staattista bodyä). Masterilla on tämä vartija; VP:llä ei.
**Portaa `tests/idp_i18n_v5_master_static_dom.test.js` → `tests/idp_i18n_v5_vp_static_dom.test.js`:**
- Jäsennä staattinen `<body>` (regex TAI kevyt HTML-parse), kävele tekstisolmut + `title=`/`placeholder=`.
- **Failaa jos näkyvä staattinen fi-tekstisolmu EIKÄ `data-i18n`/`data-i18n-ph`/`data-i18n-title` -tagia** (eikä allowlist).
- Allowlist: demo (§3) · tuotetermit · lyhenteet/indeksit · dynaamisesti täytetyt `<span id=…></span>` (tyhjät) ·
  **kalenterin Excel-pohjan protokollanimet** (`Tekniikkakilpailu`, `HH-testi laaja`, `HH-testi suppea`, `Harjoitettavuus U12/U15/U19`) —
  **Teron päätös: pidetään fi:nä toistaiseksi → allowlist; muutetaan myöhemmin EIF-palautteen mukaisesti.** Merkitse allowlistiin `// EIF-pending`.
- Negatiivitesti: poista yksi `data-i18n` → failaa → palauta → vihreä.

### 0B — AST-gate `.textContent=` / `_setTxt` / `_dSet` -luokka
V4-livessä viikko-otsikko (`labelEl.textContent = 'Viikko ' + …`) vuoti — AST-gate katsoi vain markup/toast-kontekstia.
**Laajenna `scanLeaks` display-konteksti:** literaali on näyttöä myös kun se on
- `AssignmentExpression`in oikea puoli jossa vasen on `*.textContent`/`*.innerText`/`*.innerHTML` (fi-literaali-konkatenaatiossa), TAI
- argumentti kutsussa `_setTxt(id, …)` / `_dSet(id, …)` (näyttö-setterit).
- Negatiivitesti: `el.textContent = 'Testivuoto ' + x` alueella → failaa.

**DoD (vaihe 0):** molemmat vartijat vihreät nykyisillä alueilla (V3+V4 pysyvät 0) · molemmat negatiivitestattu · 0 uutta FP.

---

## VAIHE 1 — Valmentajat sv (analysoitu skooppi = KOKO coach-klusteri)

| Alue | Rivit (n.) | Sisältö |
|---|---|---|
| **Staattinen shell** | **2386–~2410** | `#ws-valmentajat` page-title (jo `data-i18n`), **alaotsikko + napit/suodattimet AUDITOI** (V4-oppi: staattinen shell vuoti) |
| `renderValmentajat` | **11661–~11860** | rosteri, rooli-nimet (11692), KPI:t, tila-badget |
| `avaaCoachPanel` | **11867–~12185** | coach-paneeli, `rooliLabel` (11874), CPD/lisenssi, välilehdet |
| `_cmTab` | **12190–~12400** | coach-modaalin välilehdet |
| Rooli-tietoinen rosteri | **14578 · 14870+** | `coachRoolit` (enum-arvot, fi) · oversight |

### 🔒 §1 enum-raja + object-property-rooli-display (KRIITTINEN)
Rooli-**avaimet** (`'valmentaja'`,`'talenttivalmentaja'`,`'fysiikkavalmentaja'`,`'testivastaava'`,`'vp'`,`'seurasihteeri'`,
`'urheilutoimenjohtaja'`,`'fysioterapeutti'`) ovat enum-**arvoja** (`v.rooli==='vp'`, `coachRoolit`-array, Firestore/Custom
Claims) → **PYSYVÄT fi.** Reititä **vain näyttö**. Rooli-näyttö tulee **object-property-mapeista** (guard-luokka!):
- **4287** `ROOLIM = { valmentaja:'Valmentaja', talenttivalmentaja:'Talenttiv.', vp:'VP', urheilutoimenjohtaja:'UTJ', fysiikkavalmentaja:'Fys.val.', fysioterapeutti:'Fysiot.' }` → `ROOLIM[a.rooli]`
- **6876–6877** `{ valmentaja:{lbl:'valmentaja'}, vp:{lbl:'VP'}, talenttivalmentaja:{lbl:'talenttivalm.'} }` → `.lbl`
- **11692–11693** `{ valmentaja:'Valmentaja', … }` (renderValmentajat)
- **11874** `rooliLabel = {valmentaja:'Valmentaja',…,vp:'Valmennuspäällikkö',seurasihteeri:'Seurasihteeri'}[v.rooli]`

**Reititä map-ARVOT `vpT`:llä** (esim. `ROOLIM = { valmentaja: vpT('Valmentaja'), … }`) TAI kääri use-site `vpT(ROOLIM[a.rooli])`.
**LISÄÄ jokainen näihin object-property-guardin `MEMBER_DISPLAY`-listaan** (`ROOLIM[a.rooli]`, `rooliLabel`, `.lbl`-mapit
alueineen) — se on juuri se vartija joka nappaa jos reititys unohtuu. Enum-avaimet + `coachRoolit`-array EI reititetä.

### 🔒 Lukittu rooli-sv-glossaari (käytä eksaktisti; ⚠ = vahvista Terolta)
```
valmentaja/Valmentaja            → Tränare
talenttivalmentaja/Talenttiv.    → Talangtränare / Talangtr.
fysiikkavalmentaja/Fys.val.      → Fystränare / Fystr.
fysioterapeutti/Fysiot.          → Fysioterapeut / Fysiot.
vp/Valmennuspäällikkö            → Utvecklingsansvarig (UA)   [LUKITTU]
testivastaava                    → Testansvarig
seurasihteeri                    → Föreningssekreterare       ⚠
urheilutoimenjohtaja/UTJ         → Sportchef / SC             ⚠
Arvioija (fallback)              → Bedömare
```

### ⛔ ÄLÄ reititä
Rooli-**avaimet** + `coachRoolit`-array + `v.rooli===`-vertailut · Custom-Claims-rooli-**arvot** · demo-valmentajanimet
(Matti Korhonen ym., §3) · id:t · Firestore-arvot · lyhenteet/indeksit · tuotetermit. §7 lib-teksti fi.

### Domain-invariantit
Roolihierarkia + oversight-logiikka säilyy (VP/UA näkee kaikki, valmentaja omat). CPD/lisenssi-kehys ehjä.

## VAIHE 2 — lisää V5-alueet vartijoihin
- render-gate `RANGES += [[11661, 12400]]` (coach-klusteri; säädä ylärajaa _cmTab-lopun mukaan).
- object-property-guard `MEMBER_DISPLAY += { expr:'ROOLIM[a.rooli]', ranges:[…] }`, `rooliLabel`, `.lbl`-mapit.
- staattinen-DOM-vartija kattaa `#ws-valmentajat`-shellin automaattisesti (koko body).

## Portit + DoD (V5)
- **Vaihe 0:** staattinen-DOM-vartija + `.textContent=`-laajennus committattu & molemmat negatiivitestattu · V3/V4 pysyvät 0.
- **Vaihe 1–2:** coach-klusteri sv livenä · rooli-näyttö sv (map-arvot) · enum-avaimet fi · kaikki 4 vartijaa vihreät alueilla.
- Uudet avaimet dup-checkillä → `?v=13→14`. [K]-kartta voittaa. Lukittu glossaari eksaktisti. ⚠-termit PR-kuvaukseen.
- **lint EXIT 0 ENNEN committia** · resolvi-todiste kaikille uusille avaimille (`R(k)!==k`) · C1 ∅ · sv-dup 0 · suite vihreä · inline-parse 0.

## Verifiointi (Claude)
1. **Vaihe 0:** staattinen-DOM + `.textContent=`-negatiivitestit failaavat oikein; V3/V4 pysyvät 0.
2. Kaikki 4 vartijaa 0 alueilla · lint 0 · C1 ∅ · sv-dup 0 · suite · ?v=14 · resolvi uusille.
3. Riippumaton skanni coach-klusterista → 0 raakaa fi (literaalit + object-property + staattinen shell).
4. **Live (demo sv):** avaa Valmentajat + coach-paneeli + välilehdet → rooli-nimet sv (Tränare/Talangtränare/Fystränare/UA),
   0 näkyvää fi-avainta shellissä; enum-avaimet ehjät (`v.rooli===` toimii). ⚠-rooli-termit tarkistus Teron kanssa.

## Seuraava
V5 kaikki 4 vartijaa 0 → merge → V6 IDP-jono (renderIdpJono 3777). Vartijat guardaavat alusta.

---

## ⚖️ PÄÄTÖS 0A (Tero, lukittu): KOKO-BODY staattinen-DOM-reititys + koko-body-vartija
Code osui aitoon ristiriitaan (koko body vs "V5=Valmentajat"). Ratkaisu: staattinen shell on **yksi yhtenäinen lohko
[2063–2677], ei per-render-erä** → reititä KOKO staattinen chrome nyt kertaheitolla; vartija koko-body (kuten Master).
Per-erä-malli hylätty: se jättäisi ~39 staattista vuotoa liven+vartioimatta ja toistuisi joka live-checkissä → vartija ei estäisi luokkaa.

**Skooppi (Clauden riippumaton skanni, body [2063–2677]):** 64 staattista fi-kandidaattia ilman `data-i18n`:
- **54 jo [K]-kartassa** → pelkkä `data-i18n`-kääre (0 uutta avainta).
- **~7 uutta avainta** (lukittu ehdotus; ⚠ = vahvista talentmaster-domain-skillistä + Terolta):
  `Metodologia→Metodologi` · `Kalibraatio→Kalibrering` · `Kriteeristö→Kriterier` · `Benchmark→Benchmark` (verbatim) ·
  `▸ Näytä tuloskortti→▸ Visa resultatkort` · **⚠ `Joukkueäly`** (tarkista domain: signaali/D-ulottuvuus? ehdotus `Lagintelligens`) ·
  **⚠ `Katselmus-cockpit · EPPP-rytmi ≥12 v 6 vk · 9–11 v`** (`Granskningscockpit · EPPP-rytm ≥12 år 6 v · 9–11 år`; EPPP verbatim).
- **Tuotetermit allowlistiin verbatim:** `Talent`/`Master` (brändi TalentMaster™), `Hidden Gem`, `X-Factor`, `Underdog`.

**Vartija (0A):** koko-body static-DOM (Master-portti), allowlist = demo(§3) · tuotetermit · lyhenteet/indeksit ·
EIF-protokollanimet (`// EIF-pending`) · dynaamisesti täytetyt tyhjät `<span id>`. Reititä kaikki 64 → vartija vihreä.
**Tämä korjaa myös V4-kalenterin staattisen shellin retroaktiivisesti** (alkuperäinen motivaatio).

**Järjestys V5:ssä:** (0B ✓ jo tehty) → **0A koko-body staattinen** → Valmentajat-dynaaminen (renderValmentajat/avaaCoachPanel/_cmTab + roolimapit) → 4 vartijaa 0.
