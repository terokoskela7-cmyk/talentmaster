# VP-tuloskortti / governance-auditointiraportti — spec (Review-kadenssi Vaihe 2)

> Scoping 2026-06-19 (Tero). Re-keskitetty VP:n **kehitysjohtamisen** arviointiin (ei seuran admin-checklista). Kahdelle yleisölle:
> seuran hallitus/ohjaus + liiton audit (EPPP/PGAAC-tyyli). Pohja: Admin "🛰️ Pilotin tila" (`renderPilotinTila`, §33).
> Benchmark: `VP_ARVIOINTI_JA_KADENSSI.md` · `VP_BENCHMARK_JA_TOIMENPITEET.md §7`. Copilot-arvio integroitu (alla §Refinements).
> Periaate: pikakentät (§26), ei alikokoelmakyselyjä renderissä, data-tietoinen (datagate), Carbon §5, string concat §7.1, §17.

---

## 1. RAPORTOINTIHIERARKIA & YLEISÖ

VP:n yläpuolella: **UTJ (urheilutoimenjohtaja)** niissä seuroissa joilla rooli on, muuten **toiminnanjohtaja/hallitus**. Lisäksi **liitto** (ulkoinen audit).
- **Lukuoikeus:** super-admin + `onJohtoRooli` (vp/urheilutoimenjohtaja/seurasihteeri → kattaa UTJ:n) + VP read-only oma seura.
- **Arvioinnin objektiivisuus:** tuloskortin "verdikti" kuuluu ylätasolle (UTJ/hallitus/liitto), ei VP:n omaan muokkaukseen. VP näkee → läpinäkyvyys.
- **Sijainti:** Admin "Pilotin tila" -laajennus (super-admin/johto) + VP read-only -näkymä omasta seurasta.

## 2. RAKENNE — kaksi puoliskoa, ylätason verdikti

**Ylätaso:** `Audit-valmius` (montako aluetta vihreä /4) + `Tavoitteiden toteuma` (saavutettu /N). Board-ready yhdellä silmäyksellä.

**Auditointi & compliance (liitto):** alueet I + IV (+ compliance-viite Pilotin tilaan).
**Kehitys & strategia (hallitus):** alueet II + III + V.

| Alue | KPI:t (max 4–5 näkyvää, loput drill-down) | Datalähde | Tila |
|---|---|---|---|
| **I · Prosessikuri** (VP:n suora vastuu) | MDR-kattavuus % · …ajan tasalla % · IDP-tuoreus % · kvartaalipotentiaali | `review_*`-pikakentät (Vaihe 1) | ✅ |
| **II · Pelaajakehitys** | Taso ≥3 -osuus · talenttisignaalit (HG/X-Factor → ohjelmaan) · hyvinvointiliput (Kehon valmius<40 / PHV-kuorma) · tekninen varhaiskehitys · testikattavuus · **Peliäly (D4) -kattavuus** | d1/d2/hh/tki · laskeHiddenGem · flei/phv · adar_havaintoja | ✅ (peliäly ✅ kun adar-dataa) |
| **III · Valmentajavaikuttavuus** | VAI+ ka. · mentorointi-kattavuus · review-vastuu · lisenssi/CPD-kattavuus · kalibraatio | _vai · mentorointiPvt · reviewit · lisenssitaso/cpd · laskeValmentajaKalibraatio | ✅ (kalibraatio ✅ kun dataa) |
| **IV · Reiluus (RAE)** | Q-jakauma · ikäharha (Q1>40%) · underdog-lkm · **toimenpideaste** (underdog joilla talenttiOhjelma/IDP/review) | rae_kvartaali · talenttiOhjelma · reviewit | ✅ |
| **V · Strategiset tavoitteet** | **tavoite vs toteuma** per tavoite, jokainen **tägätty alueeseen I–IV** | `konfiguraatio/tavoitteet/{kausi}` + em. KPI:t | ✅ rakennettavissa |

**Compliance (GDPR/suostumus/rekisteröintikonversio):** seuratason mittari → **viiterivi "ks. Pilotin tila"**, ei duplikoida. Liiton audit saa sen sieltä.

**Output (datagate, monikausi-placeholderit, ei blokkaa):** kehitysvauhti-% **per D1/D2/D4** · RAE Q1-trendi · pipeline-eteneminen · peliminuutit/otteludata (TASO §20) · harjoituslaatu (SPL, **P1-riippuvainen** "Arvioi harjoitus").

## 3. TAVOITE VS TOTEUMA (V) — mekanismi

`seurat/{sid}/konfiguraatio/tavoitteet` dok: `{ kausi: { mittariId: {tavoite, alue:'I'|'II'|'III'|'IV'} } }`. Esim. `{ taso3_pct:{tavoite:40,alue:'II'}, mdr_ontime_pct:{tavoite:80,alue:'I'}, rae_q1_max:{tavoite:35,alue:'IV'} }`.
- VP/super-admin asettaa ("Aseta kausitavoitteet" -modaali). Kortti vertaa toteuman pikakentistä → ✓/✗ + status.
- **Pakote:** jokainen tavoite kuuluu alueeseen I–IV (estää irrallisen strategian — Copilot D).
- Rules: `konfiguraatio/tavoitteet` write = SA || (onOmaSeura && onJohtoRooli).

## 4. COPILOT-ARVION INTEGRAATIO (lukitut päätökset)

- **A1 (uudelleenkehystetty):** "decision-making" = **D4/Peliäly + pelialtistus (TASO)** — surfataan II:een, EI uutta rinnakkaista mittaria.
- **A2:** kehitysvauhti **per ulottuvuus** (D1/D2/D4) — datagate-placeholder.
- **B:** harjoitussisällön laatu = **SPL (§19), P1-gated** ("Arvioi harjoitus" un-stub) → III:een kun rakennettu.
- **C:** **toimenpideaste** reiluuteen — lukittu (operatiivinen, ei vain raportointi).
- **D:** strategiatavoitteet **tägätty alueisiin I–IV** — lukittu.
- **UI-kuri:** max 4–5 KPI/alue, loput drill-down.

## 5. PDF & VIENTI

Selain-print (`@media print`, Carbon→valkoinen) → governance-paketti hallitukselle/liitolle. Kausivalitsin. Yksi PDF molemmille yleisöille.

## 6. VAIHEISTUS (lukittu toteutusjärjestys)

1. **I + II + III datavalmiit KPI:t** (II: + Peliäly-kattavuus) — max 4–5/alue. Pohja: Pilotin tila -laajennus + VP read-only.
2. **V tavoite-vs-toteuma + `konfiguraatio/tavoitteet`** (tägätty I–IV) + "Aseta kausitavoitteet".
3. **IV reiluus + toimenpideaste.**
4. **PDF** (hallitus/liitto).
5. **Datagate-placeholderit** (kehitysvauhti/D · RAE-trendi · pipeline · peliminuutit · harjoituslaatu/P1) — ei blokkaa.

## 6b. KOHORTTI / SEGMENTOINTI (2026-06-19) — akatemia/kilpa vs harraste

**Ongelma:** taso≥3:n sokea aggregointi yli kaikkien joukkueiden on väärin — akatemia/kilpa ja harraste ovat eri tarkoitusta.
Oikea mittatikku: **akatemia/kilpa → taso≥3** (kansallinen normi) · **harraste → kehitysvauhti + osallistuminen** (ei taso≥3-tuomiota).

**Päätökset (lukitut):** segmentointi **klubikonfiguraatiosta** (valitse joukkueet) · oletus **akatemia→taso≥3, harraste→kehitysvauhti, valittavissa**.

1. **Kanoninen `laskeTaso3Osuus(pelaajat, opts)`** lib:iin — yksi määritelmä **kaikkialle** (Master Kausi + VP-tuloskortti) → korjaa 26%/53%-ristiriidan. lvl(p) = max{`d1_taso`, `hh_taso`, `d2_taso`, TKI→d2 (`laskeD2Joustava`)} ≥3; nimittäjä = pelaajat joilla lvl≠null. `opts.joukkueet` (valinnainen) rajaa kohorttiin.
2. **Segmentti-konfiguraatio:** `seurat/{sid}/konfiguraatio/segmentit` `{ akatemia: ['SJK P14', …] }` (akatemia/kilpa-joukkueiden lista; loput = harraste). VP asettaa **"Merkitse akatemia-/kilpajoukkueet"** -monivalinnasta. Rules: konfiguraatio-write (jo katettu).
3. **Tuloskortti II — kohortti-valitsin + metriikka:** taso≥3-% **akatemia-kohortista** (oletus, label "akatemia: N joukkuetta") · kehitysvauhti-% **kaikista/harraste** (datagate). Valitsin: Akatemia/kilpa · Kaikki · (lista konfiguraatiosta). **Segmentit tyhjä → oletus "Kaikki" + vihje** "Merkitse akatemia-joukkueet tarkempaa arviota varten".
4. **Master Kausi** käyttää samaa `laskeTaso3Osuus`:ia → sama luku samalla scopella.
5. **Tavoitteet (V):** taso≥3-tavoite vertaa akatemia-kohortin taso≥3-%:iin. (Kohorttikohtaiset tavoitteet = mahdollinen jatko.)

## 7. VERIFIOINTI

new Function 0 virhettä · npm test vihreä (uudet KPI-/tavoite-laskennat) · §17-grep=1 · RUNTIME+LIVE (SA: Admin Pilotin tila -laajennus + VP read-only · ylätason verdikti · alueet I–V datavalmiilta osin · tavoiteasetus · PDF · compliance-viite). Datagate näyttää "tulossa", ei kaadu. "ADAR"→"peliäly"-termi.
