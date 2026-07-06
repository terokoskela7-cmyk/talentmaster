# Vaihe 3b — Review-sykli + kehityskaari (IDP-ydin, seuranta)

> Lähde: co-design 2026-07-03. Jatkaa 3a:ta (kausitavoite luotu + VP-valinta livenä). Datamalli = `IDP_YDIN_SPEC.md §3 arvio-objekti + §4 elinkaari` (kanoninen, älä toista). Tämä spec lisää: PINNAN, FLOW'N, KEHITYSKAARI-UI:n, ELINKAAREN, PIKAKENTÄT. Mockup: `docs/mockups/vaihe3b_review_kehityskaari_mockup.html`. §29 (kaksi deltaa) · §26 · §7.22 · §32 · §5.

## 0. Malli (benchmarkattu — periodisaatio + Nordsjælland/Hammarby, 2026-07-03)
Pelaajan **elävä tarina** = kolme kerrosta, kaksi review-tiheyttä (diagrammi `docs/mockups/pelaajan_tarina_selkaranka.html`). Termit lukittu periodisaatiostandardiin (kansainvälinen uskottavuus):
- **Makrosykli** (kausi → 2–5 v) = iso tavoite / suunta = juoni (IDP-ydin 3a + Vaihe 5).
- **Kehityskaari / monitorointi** (2–4×/v) = objektiiviset mittauspisteet (testit) jotka *ohjaavat* makroa = virstanpylväät → **tämä on 3b:n ydin (data on jo olemassa, helpoin)**.
- **Mesosykli** (jakso 4–6 vk) + **mikrosykli** (viikko) = jaksotavoitteet + tiheä dialogi = luvut → **EI 3b:ssä**; kytkeytyy Vaihe 4:ään (teknis-taktinen) + §35 kalenteri + §A7 harjoitelogiikka.
Review-rytmi (Nordsjælland Right to Dream -presedenssi): meso-review tiheämpi (kk/2 vk), makro/mittaus-review harvempi (kvartaali/2–4×/v).

**IDENTITEETTI-INVARIANTTI (Teron linjaus — EHDOTON):** story + review = **kehys**; **seuraidentiteetin KPI:t = plug-in**. Se mitä kehityskaari ja jaksot mittaavat luetaan konfiguraatiosta (`ARVIOINTI_KEHYKSET` + `seurat/{sid}/konfiguraatio/{kpi_painotukset|mittarit|idp_template}`), EI kovakoodata. Eri seura/maa (eri pelifilosofia/DNA) kytkee omat KPI:nsä ilman koodimuutosta. Hammarby-presedenssi: IDP = DNA:n jalkautusväline. 3b lukee mittarit kehyksestä (fokus/mittari tulee jo 3a:sta kehyskohtaisena) — **ei uusia kovakoodattuja metriikoita**.

## 1. Ydin
3a teki tavoitteesta *asetetun*. 3b tekee siitä *seurattavan*: **periodinen review** (kehityskaari/monitorointi) jossa (1) pelaaja arvioi edistymän ensin, (2) mittaus/arvio uusitaan → DVI-suunta, (3) valmentaja vastaa. Jokainen review = piste `arviot[]`-listaan → **kehityskaari** (timeline). Tämä sulkee kehityssilmukan (§29).

## 2. Pinta
- **VP_v25 kausitavoite-kortti** (3a:n jatko): aktiiviselle tavoitteelle **"＋ Kirjaa review"** + **kehityskaari-timeline** kortin alaosaan.
- **Master_v16 Pelaajaraportti (§37):** valmentaja kirjaa review'n omiin pelaajiin (sama data). VP näkee.
- **3b:ssä review-kirjaus on aikuisnäkymä** (VP/valmentaja kirjaa myös pelaajan itsearvion proxynä review-palaverissa). **3c** antaa pelaajalle oman syötön (self-arvio) + perhepeilin — ei tässä.

## 3. Review-objekti (IDP_YDIN §3) + flow
```
arvio = { pvm, arvo(mitattu/uusittu, null jos ei mitattu), pelaajan_arvio(1–5),
          pelaajan_note, valmentajan_kommentti, dvi_suunta('up'|'flat'|'down'), kirjaaja_uid }
```
**Kirjausflow (modaali "Kirjaa review"):**
1. **Pelaaja arvioi ensin** — `pelaajan_arvio` 1–5 + `pelaajan_note` (VP kirjaa palaverissa / 3c:ssä pelaaja itse). Pelaaja johtaa.
2. **Mittaus/arvio** — `arvo` (uusi testitulos TAI havaittu 1–5). Voi olla tyhjä (pelkkä fiilis-review).
3. **DVI** — `dvi_suunta` johdetaan `arvo` vs edellinen `arvo`/`lahto` (§29 kehitysvauhti). Näytä **kaksi deltaa erikseen** (abs-parannus + normivauhti); **abs positiivinen ei koskaan punainen**.
4. **Valmentaja vastaa** — `valmentajan_kommentti` (kaksisuuntainen).
→ push `arviot[]`:iin, päivitä pikakentät, re-render kehityskaari.

## 4. Kehityskaari (timeline-UI, mockup)
Pystytimeline: lähtö → per review piste. Kukin piste: pvm · mitattu arvo (+ DVI-nuoli §29-värillä: up teal / flat harmaa / **down amber, EI punainen jos abs silti parani**) · pelaajan itsearvio (1–5 pisteinä) · pelaajan note · valmentajan kommentti. Tavoitevyöhyke-viiva (≤/≥ tavoitearvo). Vapaa-yksikkö-tavoitteelle (3a): ei mitattua palkkia → review = pelaajan_arvio + kommentit (kvalitatiivinen kaari).

## 5. Elinkaari (IDP_YDIN §4)
`aktiivinen` → reviewit kertyvät → **VP/valmentaja merkitsee:** `saavutettu` (tavoitearvo saavutettu/ylitetty) TAI `jatkuu` (uusi `tavoitearvo`, sama fokus, arviot säilyvät) TAI `hylatty` (fokus vaihtui). Napit kortilla. `jatkuu` = nostaa riman, kaari jatkuu samalle fokukselle.

## 6. Pikakentät (§26)
- `idp_edistyma` päivittyy reviewissä: mitattaville "X %" (matka lähtö→tavoite), havaituille/vapaille "review N" tai "n/N". Lista + kortti lukevat ilman alikokoelmakyselyä.
- `idp_viim_review` (pvm) → lista voi näyttää "review myöhässä" (rytmi §7).
- Koko `arviot[]` elää `idp_kausi/{vuosi}.tavoitteet[]`-dokissa (ei uutta alikokoelmaa, ei Rules-muutosta — idp_kausi jo v3.10). §7.6: pvm = ISO-string arrayssa.

## 7. Rytmi + muistutus
`arvio_pvm` (3a asetti ~6 vk) koittaa → lista/kortti merkkaa "review nyt". **Automaattimuistutus = 3c** (`lahetaMuistutukset`-pattern). 3b vain surfacaa "review myöhässä" -merkin pikakentästä.

## 8. §7.22
Aikuisnäkymä = mitatut luvut + DVI + itsearvio. **Pelaajapeili (3c):** vain oma kaari positiivisena (abs-parannus, prosessikehu), EI normivauhtia/punaisia deltoja/vertailua. 3b ei renderöi pelaajalle.

## 9. Vaiheistus + invariantit
3b = review-kirjaus + kehityskaari-UI (makro/monitorointi 2–4×/v) + elinkaari (saavutettu/jatkuu) + pikakentät. **Mesosykli/mikrosykli (jaksotaso) EI kuulu 3b:hen** — se on Vaihe 4 + kalenteri. §0 identiteetti-invariantti (mittarit kehyksestä, ei kovakoodattua metriikkaa; eri seura/maa kytkee omat KPI:nsä) · §29 kaksi deltaa (abs erillään normivauhdista; abs+ ei punainen) · §26 · §7.22 · §32 (olemassa olevat viestipolut, ei uutta infraa) · §5 · ei version.json-bumppia · ei Rules-muutosta. Testit: DVI-suunta (up/flat/down + abs+ ei-down-väri), edistymä-% laskenta, elinkaari saavutettu/jatkuu (jatkuu säilyttää arviot), vapaa-yksikkö kvalitatiivinen review. `npm test` + lint. Live: SJK-tavoite → Kirjaa review (pelaaja-arvio + mittaus + kommentti) → kehityskaari kasvaa → jatkuu nostaa riman.
