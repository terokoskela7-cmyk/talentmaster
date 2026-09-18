# Code-brief — i18n V5 · VP_v25 **alaerä V7: Raportointi (master-suunnitelma + ala-erät)**

> **Konteksti:** V3–V6 mainissa, live-verifioitu. **5 vartijaa + resolves-scanner** guardaa alusta.
> Raportointi on **iso klusteri (3 segmenttiä + tekstiraportti, ~14186–16100)** → EI yhtenä committina.
> **Ala-erät per segmentti** (kuten Masterin IDP Erä 1/2/3): jokainen oma commit · lint 0 · 5 vartijaa 0 · verifiointi ennen seuraavaa.
> Staattinen shell @2503–2539 (page-title + 3 segmenttinappia `Pelaajaraportti/Harjoittelun laatu/Joukkueäly`) on **jo 0A:ssa.**

## Ala-erät (kukin oma commit + render-gate RANGES + verify)
| Erä | Segmentti / alue | Rivit (n.) | Ydin |
|---|---|---|---|
| **V7a** | MDT-raportti / Pelaajaraportti (`_mdt*`) | **14186–14550** | profiili (johtaja/valmentaja/vanhempi-paneelit), tavoitteet, FA-lista, `_mdtOsaNimi`/`_mdtTilaBadge` |
| **V7b** | Reviewit + VP-tuloskortti (`_review*` · `vpAvaaHarjoitusarviointi`/`_vpTk*`) | **14552–~15185** | MDT-tarkistusrytmi + tuloskortti (⚠ vahvista yläraja `_hlEsc`@15193 alle) |
| **V7c** | Harjoittelun laatu (`_hl*`) | **15189–~15685** | harjoitusarviointi-raportti, `_HL_KRIT_A/B` kriteerilabelit, kansallinen vertailu |
| **V7d** | Joukkueäly (`renderJoukkuealy`) | **paikanna** (`_rapSeg` kutsuu 15205; def puuttui greptistä — etsi/luo) | team-intelligence-raportti |
| **V7e** | Nominees-dashboard + tekstiraportti (`renderRaportointi` + `lahetaRaportti`) | **15886–~16080** | rap-KPI:t, nominees-lista, **`lahetaRaportti` L.push-tekstiraportti** (kopioitava kausikooste) |

**Suositus:** aja V7a→V7e järjestyksessä; verifioin jokaisen (5 vartijaa + skanni + live). Voit myös niputtaa mergen (kaikki V7a-e → yksi PR) — mutta commitit erillään.

## 🔒 Object-property-display-mapit → MEMBER_DISPLAY (KRIITTINEN, gate-sokea)
Nämä ovat member-näyttöjä (gate ei näe) → reititä map-ARVOT + LISÄÄ `MEMBER_DISPLAY`-listaan:
- **`_mdtOsaNimi` @14242** (V7a): `{kiihdytys:'Kiihdytys', maksinopeus:'Maksiminopeus', voima:'Voima', ketteryys:'Ketteryys', suunnanmuutos:'Suunnanmuutos', aerobinen:'Aerobinen'}[k]` → arvot `vpT()`. Käyttö @14291.
- **`_mdtTilaBadge` @14247** (V7a): `{kaynnissa:['Käynnissä',…], saavutettu:['Saavutettu',…], kesken:['Kesken',…]}[tila]` → **avain=enum fi**, näyttö `x[0]` → `vpT(x[0])`.
- **`_HL_KRIT_A` @15189 / `_HL_KRIT_B` @15190** (V7c): kriteerilabelit (a1:'Innostavuus'…b7:'Vuorovaikutus') → arvot `vpT()`; käyttö `_hlKritLabel`@15194 + `_HL_KRIT_A[k]`@15460.

**MEMBER_DISPLAY-lisäykset (V6:n `IDP_TILA_LBL`-rivin perään):**
```
{ expr:'_mdtOsaNimi(k)',            ranges:[[14286,14295]] },   // V7a fyys-osanimet (jos renderissä bare)
{ expr:'_mdtTilaBadge',            ranges:[[14247,14252]] },   // V7a tila-badge (näyttö x[0] vpT)
{ expr:'_HL_KRIT_A[k]',            ranges:[[15455,15470]] },   // V7c kriteerilabelit
{ expr:'_hlKritLabel(k)',          ranges:[[15280,15685]] },   // V7c
```
(Säädä rangit todellisiin render-siteihin; pinnaa routed-muoto kuten V5/V6.)

## 🔒 render-gate RANGES -lisäykset (per erä, EKSAKTIT)
Nykyinen: `[[8040,9221],[12600,13750],[11661,12400],[3777,3865],[7885,7910]]`. Lisää:
- V7a: `[14186,14550]` · V7b: `[14552,15185]` · V7c: `[15189,15685]` · V7d: `[<joukkuealy-alku>,<loppu>]` · V7e: `[15886,16080]`
**V7:n jälkeen (V7d-rangi paikannettuna):** `[…, [14186,14550],[14552,15185],[15189,15685],[<jä>],[15886,16080]]`.

## §1 ÄLÄ reititä (enum/data/koodi)
`tila`-enumit (`kaynnissa/saavutettu/kesken`) · `_hlMalli` (`valmennustaidot/pelaajataidot`) · kriteeri-**avaimet** (`a1–a7`,`b1–b7`) ·
`p.signaali` (`xfactor`) · pelaaja/valmentaja-nimet · joukkue · pvm · `_seuraId` · id:t · Firestore-arvot.
**Tuotetermit verbatim:** X-Factor · Hidden Gem · Underdog · RAE · TKI/H-H/PHV/D1–D5 · Q1–Q4 · `Cue` · `meso/makro/mikro`.

## Domain-invariantit (SÄILYTÄ MERKITYS)
- **§7.22-sävy:** `"Sinä vastaat sisällöstä — pidä sävy kannustavana, älä lisää tasolukuja/vertailuja."` — käännä säilyttäen ohjaava/neutraali sävy.
- **§28:** `"korkea D2 + matala D1 pre-PHV → fysiikka tulee 2–4 v"` · kypsyys-reiluus — säilytä §28-kehys.
- **RAE / syntymäkvartaali:** `"Q4 — ikäluokan nuorin, huomioi kypsyysetu"` / `"Q1 — ikäluokan vanhin…"` · underdog — säilytä RAE-merkitys (⭐ underdog verbatim/§34).
- **D3-kalibraatio (pelaaja · valmentaja · VP):** rooli-kolmikko — `VP`→`UA`-lukko (V5). "valmentaja"→"tränare".
- **Tekstiraportti (`lahetaRaportti`):** kausikooste kopioidaan → sv-tilassa sv. `'TALENTMASTER — RAPORTTI HEAD OF TALENTILLE'` · `'KAUSIKOOSTE'` · `'· Pelaajia:'` ym. reititä (tuotenimi TALENTMASTER verbatim). Iso lista L.push → oma huolellinen käännös V7e:ssä.

## 🔒 Kanoninen sv (uudet; ⚠ = vahvista talentmaster-domain / Terolta)
```
# _mdtOsaNimi (fyys-osat)
Kiihdytys→Acceleration · Maksiminopeus→Maxhastighet · Voima→Styrka · Ketteryys→Smidighet · Suunnanmuutos→Riktningsändring · Aerobinen→Aerob
# _mdtTilaBadge (tavoite-tila)
Käynnissä→Pågår · Saavutettu→Uppnått · Kesken→Ofärdigt
# _HL_KRIT_A (pelaajataidot)  ⚠ domain
Innostavuus→Entusiasm · Liikkeessä %→I rörelse % · Pallokosketukset→Bollkontakter · Teknis-takt. toistot→Teknisk-taktiska reps · Heittäytyminen→Insats · Maalinteko %→Målgörande % · Seuran oma (Q7)→Föreningens egen (Q7)
# _HL_KRIT_B (valmennustaidot)  ⚠ domain
Organisointi→Organisering · Tavoitteen selkeys→Målets tydlighet · Palaute (määrä)→Feedback (mängd) · Palaute (laatu)→Feedback (kvalitet) · Pedagogiikka→Pedagogik · Eriyttäminen→Differentiering · Vuorovaikutus→Interaktion
# yleiset raportointi-napit/otsikot
Peruuta→Avbryt (jo kartassa) · Valmis→Klar · Talenttisignaali→Talangsignal · Resepti — seuraava teema→Recept — nästa tema
Päätös / muistiinpano→Beslut / anteckning · Ladataan tavoitteita…→Laddar mål… · Muokkaa vanhempiviestiä→Redigera föräldrameddelande
— Valitse pelaaja —→— Välj spelare — · Johtaja · päätöksenteko→Ledare · beslutsfattande · Valmentaja · kehitys→Tränare · utveckling
```
(`Joukkueäly→Lagintelligens` jo V5:n 0A:ssa kartassa.)

## Portit + DoD (per V7-erä)
- Segmentti sv livenä · object-property-mapit `MEMBER_DISPLAY`:ssä · enum-avaimet + `_hlMalli`/krit-avaimet fi · **5 vartijaa 0** · per-occurrence-negatiivitesti pysyy.
- Uudet avaimet dup-checkillä → `?v` +1 per erä (tai kerran lopuksi jos niputat). [K]-kartta voittaa. ⚠-termit PR:ään.
- **lint EXIT 0 ENNEN committia** · resolvi-todiste uusille avaimille · C1 ∅ · sv-dup 0 · suite vihreä · inline-parse 0.

## Verifiointi (Claude, per erä)
1. 5 vartijaa 0 · riippumaton per-occurrence + object-property-skanni ko. alueelta → 0 (pl. tuotetermit) · lint 0 · C1 ∅ · sv-dup 0 · resolvi.
2. **Live (demo sv):** avaa Raportit → ko. segmentti → 0 näkyvää fi (pl. tuotetermit); enum-vertailut ehjät (`tila==='kaynnissa'`, `_hlMalli==='valmennustaidot'`).
3. Domain: §7.22-sävy · §28 · RAE/syntymäkvartaali · D3-kalibraatio-roolit säilyneet.

## Seuraava
V7 (a–e) 5 vartijaa 0 → merge → **V8 Työkalut + Asetukset** (avaaBioBanding 4174 · Metodologia/Kalibraatio/Kriteeristö/Benchmark) → gate koko VP = sv.
