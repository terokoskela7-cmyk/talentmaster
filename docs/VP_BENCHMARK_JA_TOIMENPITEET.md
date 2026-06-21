# VP Valmentajat & Raportit — kansainvälinen benchmark + toimenpidesuunnitelma

> 2026-06-18. Benchmarkattu kansainväliset jalkapalloakatemia-/AMS-ohjelmistot (Kitman Labs, Smartabase, Hudl/Wyscout,
> PlayerData, Zone7, AiSCOUT, CoachNow, Spond) + EPPP/FA-viitekehykset, peilattu TalentMasterin nykyisiin Valmentajat- ja
> Raportit-näkymiin → priorisoitu toimenpidelista. Liittyy: MOAT_JA_TULEVAISUUSKESTAVYYS.md · §19 (VP) · §32 (viestiketju) · §34 (yksi totuus, kolme kehystä) · §7.22.

---

## 1. BENCHMARK — mitä kansainväliset ohjelmistot tekevät

| Ohjelmisto | Kategoria | Olennaista VP/valmentaja/raportit-suunnittelulle |
|---|---|---|
| **Kitman Labs (iP)** | Eliitti-AMS (Premier League) | Pipeline-rollup ikäryhmittäin; IDP 5 ulottuvuudella; **pelaajakortti = status + trendi + vertais­benchmark**; My iP self-service-dashboardit; coach-development-seuranta |
| **Smartabase (Teamworks)** | Konfiguroitava AMS | Roolipohjaiset dashboardit + lupiin sidotut lomakkeet; automaattiset hälytykset |
| **Hudl Lens / Wyscout** | Video + IDP-metodi | IDP 4 vaihetta (profiili→3–5 prioriteettia→menetelmät→review); **review-sykli kk/kvartaali, kaksisuuntainen, edistys juhlitaan** |
| **PlayerData** | GPS/kuorma | Kuorma/valmius valmentajan näkymässä; nuorisoturvallinen progressio |
| **Zone7** | AI-loukkaantumisriski | **Ei pelkkä lippu — joka hälytys tuo toimenpidesuosituksen** (load-recommendation) |
| **AiSCOUT** | Talent-ID puhelimella | Standardoitu suoritusdata puhelimesta (vrt. TKI) |
| **CoachNow / Spond** | Valmennusviestintä / grassroots | Async video­palaute + harjoituskirjasto; huoltajanäkyvyys + viestintä |
| **Frontiers 2025 (akateeminen MDT-työkalu)** | Tutkimus | **Paras UX-blueprint:** yhden sivun pelaajaprofiili = **signs + samples + SEO** rinnakkain, väri­koodattu kypsyyden mukaan, säädettävä pituussuuntainen aikaikkuna, MDT-palaverin artefakti |

**Viitekehykset:** FA 4-corner (Tekninen/Fyysinen/Psyykkinen/Sosiaalinen) — TalentMasterin 5D on tämän **superset**.
EPPP: 3 vaihetta (Foundation/Youth/Pro), **multidisciplinaarinen review 4×/kausi**, ISO-auditointi 3v sykli, kvartaali-loukkaantumisraportointi. LTAD/bio-banding/RAE = kypsyyden mukaan ryhmittely.

**Läpileikkaava periaate (toistuu sekä kaupallisissa että tutkimuksessa):** *"data-informed, not data-driven"* — ohjelmiston
tehtävä on tuoda esiin pituussuuntainen, monitieteinen näyttö joka **haastaa valmentajan biaksen ja kehystää MDT-keskustelun**,
ei tuota verdiktiä. **Ei yhtä "talenttipistettä".**

---

## 2. TÄRKEIMMÄT BEST-PRACTICE -PATTERNIT (3 roolia)

**Valmennuspäällikkö:**
1. Portfolio-rollup → drill-down (kohortti-KPI:t + kattavuus n/koko + poikkeusliput ensin). ✅ *meillä on (pulssi + poikkeuskehys).*
2. **Pelaajakortti: status + trendi + benchmark** (Kitmanin kanoninen kuvio).
3. **Pituussuuntainen aikaikkuna ensiluokkaisena kontrollina** (6vk/kvartaali/kausi/vuosi) joka skooppaa kaiken.
4. **MDT-palaveritila** — yhden sivun profiili (signs+samples+SEO rinnakkain, kypsyysväritetty) projisoitavaksi 4×/kausi-reviewissä.
5. **Valmentajan kalibrointi** — valmentajan subjektiivisen arvion (SEO/ADAR) ja objektiivisen datan (signs) varianssi + RAE/kypsyysbias per valmentaja.
6. Maturity-fair-toggle fyysisiin (kronologinen ↔ bio-banded/PHV). ✅ *PHV-logiikka meillä; toggle puuttuu.*

**Valmentaja:**
7. "Tänään"-triage: kuka tarvitsee minua → miksi → mitä tehdä → kirjaa. ✅ *Master_v16 lähellä.*
8. Sessiosuunnittelu sidottuna IDP-prioriteetteihin + harjoituskirjasto.
9. IDP-review-wizard (profiili→3–5 prioriteettia→menetelmät→review, edistys juhlitaan). ✅ *suljettu kehityssilmukka olemassa.*
10. Async video/ääni-palaute pelaajalle/vanhemmalle. ⚠️ *havainto/ADAR-kortti on, media-palaute puuttuu.*
11. Normikonteksti inline jokaisessa tuloksessa. ✅ *taso/Normi-sarake tehty.*

**Raportit:**
12. **Kolme raporttiskiniä yhdestä datasta** (johtaja/valmentaja/vanhempi) — toggle, ei uudelleenrakennusta. (= §34 yksi totuus, kolme kehystä.)
13. **Vanhempiraportin suojat sääntöinä** (ei tasolukuja/percentiilejä, vahvuus ensin, prosessikehu, "miten tukea"). ✅ *§7.22 — koodattava raporttipohjaksi.*
14. **Raportti = elävä palaveriartefakti**, sitten A4/PDF-vienti. ✅ *A4-print Masterissa.*
15. Governance-paketti: kvartaalikoonti kattavuus-%/suostumussuppilo/audit-hälytykset (board/liitto, read-only).
16. **Joka poikkeama tuo toimenpidesuosituksen** (Zone7). ✅ *poikkeuskehys + harjoitelogiikka.*

---

## 3. NYKYTILA — TalentMaster Valmentajat & Raportit (audit)

**Valmentajat (`renderValmentajat` + `avaaCoachPanel`):**
- ✅ Coach-grid: **VAI+** (5-komponenttinen aktiivisuusindeksi), mentorointistatus (pv viim. mentoroinnista), lisenssibadge (UEFA), sähköposti.
- ✅ Coach-modaali 4 välilehteä: Profiili (lisenssi/CPD/koulutukset) · VAI+ · Harjoituslaatu (SPL 7 kriteeriä) · Mentorointi (natiivi viestiketju §32).
- ⚠️ **"Arvioi harjoitus" = stub** ("tulossa pilottiin").
- ❌ **Valmentajan kalibrointi puuttuu** — ei valmentaja-SEO vs objektiivinen-data -varianssia eikä RAE/kypsyysbias-näkymää. (Tämä on benchmarkin #5 ja **vahvin yksittäinen VP-best-practice.** Palaset olemassa: VAI+, D3-kalibraatio (malli A), RAE-pikakenttä, renderKalib.)

**Raportit (`renderRaportointi` + `lahetaRaportti`):**
- ✅ KPI-koonti (pelaajat/FLEI ka/talentit/Hidden Gem) + talenttisuosituslista.
- ✅ HoT-tekstikoonti (`lahetaRaportti`): kausikooste + RAE/taso≥3 (§30) + signaalit + vapaat huomiot → kopioitava.
- ✅ A4-print per pelaaja (Master/Testaus).
- ❌ **Vain yksi raporttityyppi** (HoT-teksti). Puuttuu: pelaajan kehitysraportti (signs+samples+SEO yhden sivun profiili) · **vanhempiraportti** suojineen · MDT-palaveritila · **kolme skiniä yhdestä datasta** · PDF-vienti näistä · pituussuuntainen aikaikkuna.

---

## 4. GAP — mitä meillä JO on vs mitä puuttuu

**Edellä benchmarkia (säilytä):** poikkeuskehys + pulssi-rollup · PHV/RAE-reiluuslogiikka *sovellettuna* (harvalla kilpailijalla) · kansalliset normit sisäänrakennettuna · suljettu kehityssilmukka · offline-kenttätyökalut · §7.22-lapsisuojat · "toimenpide joka lipulle".

**Puuttuu (best-practice-vajeet, prioriteettijärjestyksessä):**
- **P0a — Valmentajan kalibrointi** (Valmentajat): SEO/ADAR vs objektiivinen-data -varianssi + RAE-bias per valmentaja. Korkein VP-arvo, palaset valmiina.
- **P0b — MDT-profiili + kolme raporttiskiniä** (Raportit): signs+samples+SEO yhden sivun profiili, esitettävä elävänä + PDF, johtaja/valmentaja/vanhempi-kehykset (§34 + §7.22).
- **P1a — Pituussuuntainen aikaikkuna** (läpileikkaava): gate ≥2 mittausta (kuten §30 roadmap).
- **P1b — "Arvioi harjoitus"** un-stub: SPL-kriteerit + harjoituskirjasto.
- **P2 — Governance-paketti** (kvartaalikoonti) + vanhempiraportin jakelu.

**Strateginen pikavoitto:** **5D → FA 4-corner -kartoitus** näkyväksi (kv-tunnistettavuus) — pieni työ, iso uskottavuusarvo liitoille/kv-yleisölle.

---

## 5. TOIMENPIDESUUNNITELMA (priorisoitu)

| Prio | Toimenpide | Näkymä | Miksi | Pohja olemassa |
|---|---|---|---|---|
| 🔴 P0a | **Valmentajan kalibrointipaneeli** — ADAR/SEO vs signs varianssi + RAE-bias per valmentaja | Valmentajat | Vahvin VP-best-practice; debiasaa valinnan | VAI+, D3-kalibraatio, RAE, renderKalib |
| 🔴 P0b | **MDT-profiili + 3 raporttiskiniä** (signs+samples+SEO, johtaja/valmentaja/vanhempi) + PDF | Raportit | §34 operationalisoituna; vanhempisuojat; kv-best-practice | A4-print, §7.22, §34, pikakentät |
| 🟡 P1a | **Pituussuuntainen aikaikkuna** -kontrolli (gate ≥2 mittausta) | Läpileikkaava | Kehitysvauhti = ydinarvo | `*_edellinen`-deltat, §30 |
| 🟡 P1b | **"Arvioi harjoitus"** un-stub (SPL + harjoituskirjasto) | Valmentajat | Sessiolaatu sidottuna IDP:hen | SPL 7 kriteeriä |
| 🟢 P2 | **Governance-paketti** (kvartaalikoonti, read-only) + vanhempiraportin jakelu | Raportit | Compliance/liittouskottavuus | Pilotin tila, audit-loki |
| 🟢 P2 | **5D → 4-corner -kartoitus** näkyväksi | Läpileikkaava | Kv-tunnistettavuus | 5D olemassa |

**Periaate kaikkeen:** "data-informed, not data-driven" — ei yhtä talenttipistettä; työkalu kehystää MDT-keskustelun, ihminen päättää.

---

## 6. SEKVENSSI

1. Tämä doc + priorisointi-sign-off.
2. **P0a** valmentajan kalibrointi (oma kierros: scoping → komento → live-verify).
3. **P0b** MDT-profiili + 3 skiniä (oma kierros).
4. P1/P2 erikseen.

> Lähteet (agentti-benchmark): kitmanlabs.com/platform/talent-development · hudl.com/blog/hudl-lens-individual-development-plans ·
> frontiersin.org/.../fpsyg.2025.1636386 · premierleague.com/.../eppp · zone7.ai · scienceforsport.com/bio-banding.

---

## 7. AVOIMET KYSYMYKSET (muistiin)

**Miten seuran VP:tä / valmennuspäällikköä itseään arvioidaan?** (2026-06-18) Kalibrointi (P0a) arvioi valmentajia — mutta
kuka arvioi VP:n? Benchmark: urheilujohtajaa mitataan pääosin **viipeellisillä + prosessimittareilla**:
1. **Pipeline-tulokset** — montako akatemiapelaajaa etenee seuraavaan vaiheeseen / edustukseen (longitudinaalinen, lagging).
2. **Valmentajien kehitys** — VAI+ + kalibraation lähentyminen ajassa (paraniko valmentajakunta).
3. **Prosessikuri** — MDT-reviewit 4×/kausi, IDP-/testikattavuus, suostumus/compliance.
4. **Talent-ID-reiluus** — väheneekö ohjelman oma RAE-vinouma ajassa (seuran Q-jakauma paranee).
5. **Kohorttien kehitysvauhti** — taso≥3-kasvu, kehitysvauhti-% (§30).

Kuluttaja = liitto (Palloliitto) / seuran hallitus / super-admin → luonteva sijainti **super-admin-taso tai P2-governance-paketti**,
ei VP:n oma näkymä (objektiivisuus). Vaatii pitkittäisdataa (gate: ≥useampi kausi/mittaus). Kytkeytyy: P2 governance · §30 longitudinaali-roadmap · §33 B-suunta.
**Ei rakenneta nyt** — kirjattu kun datamäärä + kausihistoria riittää. Periaate säilyy: "data-informed, not data-driven" (myös VP:n arvioinnissa).
