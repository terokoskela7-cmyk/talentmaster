# Muutoslista — sessio 2026-06-17…18 (VP + valmentaja + raportit)

> Koonti tämän session muutoksista. Kaikki deployattu origin/main + live-Chrome-verifioitu (ellei toisin mainita).
> Periaatteet läpi: pikakentät (§26), ei alikokoelmakyselyjä, data-tietoinen (§29 "näytä mitä on"), Carbon (§5), string concat (§7.1),
> yksi `@media 768px`/tiedosto (§17), "data-informed, not data-driven". Lib `tm_eerikkila_normit.js` ?v=15 → **18**. Vitest 206 → **225**.

---

## A. VALMENTAJA (Master_v16) — tämän session alkuosa

| # | Muutos | Tila |
|---|---|---|
| A1 | **Näkymäredesignit** (Koti severity-priorisointi · Havainnot · Kehitys · Kausi · TÄNÄÄN) | ✅ live |
| A2 | **ADAR → "Peliäly"/"pelihavainto"** kaikessa valmentaja-UI:ssa (Havainnot "Peliälyhavainnot", Kausi-kattavuus, narratiivit…) | ✅ live |
| A3 | **Demo-vuotojen korjaus** (SA/valmentaja näki demo-pelaajia) — demo-guard-pattern kaikkiin demo-aktivointeihin | ✅ live |
| A4 | **Sibbo / TKI-only Kausi-datanäkyvyys** — D2 + "Taso ≥3" johdetaan TKI:stä (`laskeD2Joustava`), D1 tyhjätila TKI-seuralle | ✅ live |
| A5 | **Floor-binnaus** Kausi-histogrammeihin (`Math.round`→`Math.floor`) → histogrammi = "Taso ≥3" = modaali johdonmukaisia | ✅ live |
| A6 | **Klikattavat tasokortit** (`_avaaKausiPelaajat` D1/D2/Taso≥3 → pelaajalista heikoin-ensin + raaka-arvot + tap-through Kehitykseen) | ✅ live |
| A7 | **D1 osaindeksit** — `laskeD1Osaindeksit` (Kiihdytys/Maksiminopeus/Voima/Ketteryys/Aerobinen); kortti = profiili, modaali = per-pelaaja chipit (nopeus vs MAS erotettu) | ✅ live |

## B. VALMENNUSPÄÄLLIKKÖ (VP_v25)

| # | Muutos | Tila |
|---|---|---|
| B1 | **Syvänäkymän mobiilipinous** — pelaajataulukko ensin, radar/KPI alle (CSS `order`) | ✅ live (commit 6362e9d) |
| B2 | **Koti-strippi korttien alle** + **"Muistuta odottavia" → `lahetaMuistutukset`-CF-flow** | ✅ live (6362e9d) |
| B3 | **Syvänäkymä: floor-binnaus + Profiili testeittäin ryhmitelty osaindekseihin** (Kiihdytys/Maksiminopeus/Voima/Ketteryys/Aerobinen) + SM-testit pois fyysisestä ("Suunnanmuutos D1→D2 silta") | ✅ live |
| B4 | **Tilanne-tason poikkeuskehys** — `laskeJoukkuePoikkeamat` (6 tyyppiä, PHV §28 -porrastus) + roll-up "Joukkueiden poikkeamat" + pulssikortti-liput | ✅ live |
| B5 | **Poikkeama-roll-up teemakonsolidointi** (25 riviä → ~6 teemariviä "Aerobinen · 5/6 joukkuetta", drill-chipit) | ✅ live |
| B6 | **Valmentajan kalibrointi (P0a)** — `laskeValmentajaKalibraatio` (RAE-valintabias + D3-kuilu vs VP + pelihavainto-leniency) → coach-modaalin 5. välilehti "Kalibraatio" + coach-kortti-chip | ✅ live (tyhjä-polku; populoitu RUNTIME) |
| B7 | **MDT-raportti (P0b-1)** — Raportit-alanäkymä: pelaajavalitsin → yhden sivun profiili (Signs/Samples/SEO + erimielisyys + 5D) + johtaja/valmentaja-skinit + talenttisignaali (Hidden Gem/X-Factor) + PDF/MDT-palaveritila | ✅ live (rakenne; erimielisyys/talentti RUNTIME) |

## C. DOKUMENTIT (docs/)

- `MOAT_JA_TULEVAISUUSKESTAVYYS.md` — arkkitehdin moat-/tulevaisuuskartta.
- `POIKKEUSKEHYS_SPEC.md` — Tilanne-tason poikkeuskehys (B4/B5).
- `VP_BENCHMARK_JA_TOIMENPITEET.md` — kv-ohjelmistobenchmark + Valmentajat/Raportit-toimenpidesuunnitelma + §7 avoimet kysymykset (VP:n oma arviointi).
- `MDT_RAPORTTI_SPEC.md` — P0b MDT-raportti (B7).
- (D3_KALIBRAATIO_SPEC.md — aiempi, malli A; kytkeytyy B6:een.)

## D. LIB / TESTIT / VERSIO

- `lib/tm_eerikkila_normit.js`: uudet `laskeD1Osaindeksit` (?v=16) · `laskeJoukkuePoikkeamat` (?v=17) · `laskeValmentajaKalibraatio` (?v=18). Additiivisia — `laskeD1Joustava`/`d1_taso`-kooste ennallaan.
- Vitest 206 → **225** (+ osaindeksit, poikkeamat, kalibraatio). `version:bump` ajettu lib-lataajien cache-bustiin (Master/Pelaaja reload-piirissä; VP `?cb=`).

---

## E. AVOIMET / SEURAAVAT (priorisoitu)

| Prio | Asia | Huom |
|---|---|---|
| 🔴 | **P0b-2 — vanhempi-skini** (§7.22-suojat: ei tasolukuja/percentiilejä, vahvuus ensin, prosessikehu, "miten tukea") | MDT-raportin viimeinen skini |
| ℹ️ | **`syntymaaika` täyttyy vanhempi-rekisteröinnistä** (suostumusflow), ei tuonnista — dry-run 2026-06-18: 500/530 ilman DOB:ta (tuonti tuo rosterin ilman syntymäaikaa). **RAE-näkyvyys (BQ, underdog, kalibraation RAE-bias) aktivoituu adoptionmyötä** kun huoltajat rekisteröivät. SJK-rekisteröinti käynnissä → RAE kasvaa siellä ensin. Ei erillistä korjausta — luonnollinen seuraus käyttöönotosta | adoptio-gate |
| 🟢 | **RAE-backfill** (`rae_kvartaali` `syntymaaika`:sta) — `scripts/backfill_rae.js` idempotentti, dry-run tehty; vain 6 pelaajaa saisi (5 SJK + 1 KPV), loput ilman DOB:ta | apply suositeltu (6 dok) |
| 🟡 | P1 — pituussuuntainen aikaikkuna (gate ≥2 mittausta) · "Arvioi harjoitus" un-stub | §30 |
| 🟢 | P2 — governance-paketti · 5D→FA 4-corner -kartoitus · **VP:n oma arviointi** (benchmark §7) | longitudinaali |
| 🟢 | Kalibrointi/MDT populoitu live-verifiointi kun monilähteistä dataa kertyy | data-gate |

> **Yleishuomio:** monet uudet näkymät (kalibrointi, MDT-erimielisyys, poikkeuskehyksen rikkaus) realisoituvat täysin vasta kun
> pilottidataa (RAE-backfill, D3-arviot, pelihavainnot, 2. mittaus, TASO-otteludata) kertyy. Arkkitehtuuri + UI ovat valmiina —
> pullonkaula on datapisteet, ei koodi (MOAT-doc §4).
