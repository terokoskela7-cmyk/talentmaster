# Tehtävä: H-H/TSI-analyysimalli VAIHE 1 — funktiot + pikakentät + Master-detail

> Speksi: `docs/HH_TSI_ANALYYSIMALLI.md` (LUE KOKONAAN ENSIN — erityisesti §0
> PHV-suodatin ja §7 päätökset). TKI-mallin sisartoteutus fyysisille
> ominaisuuksille + TSI:lle. Kohdedata: SJK (61 pelaajaa, kattavuus speksin §5).
> VP-näkymä (VAIHE 2) ja Pelaaja (VAIHE 3) EIVÄT kuulu tähän.

## Osatehtävä A — Kanoniset funktiot (docs/testit_indeksit.js) + Vitest

```javascript
hhSeuraavaTaso(testi, arvo, ika, sp)
// → { nykyinenTaso, seuraavaTaso, kynnys, gap, yksikko } | null
// Gap testin omissa yksiköissä, suunta huomioiden (ajat: pienempi=parempi →
// gap = arvo − kynnys; CMJ/MAS: suurempi=parempi → gap = kynnys − arvo).
// Taso 5 → { ..., seuraavaTaso: null } ("huipputaso — ylläpito").
// MAS: arvo tulee km/h → ÷3.6 ennen eerikkilaTaso-kutsua, kynnys ×3.6 paluussa
// (§30 — toistuva bugiluokka, tee Vitest-testi juuri tästä).
// Kynnysarvot EERIKKILA_NORMIT-taulukosta (SSOT) — ei kovakoodattuja arvoja.

hhVaadittuVuosivauhti(testi, ika, sp, taso)
// → vaadittu parannus /v samaan tasoon ika→ika+1 normitaulukosta | null
// null jos ika+1 puuttuu normeista. Suunta kuten yllä.

hhKehityskohde(hh_viimeisin, ikaDesimaali, sp, phvTila)
// → { kehityskohde: testi-id|null, vahvuus: testi-id|null,
//     phvVarmuus: 'mitattu'|'ikaoletus'|'epavarma' }
// PHV-SUODATIN (§0, EHDOTON):
//  - phvTila 'POST'/'AN' → täysi: kehityskohde = alin taso mistä tahansa testistä
//  - phvTila 'PRE'/'LAH'/'PH' → 30m/MAS/CMJ/kasirata EI kehityskohteeksi
//    (sm_pallo aina sallittu); PH lisäksi → kuormarajoitin-lippu
//  - phvTila null → ikäoletus: sp 'T' && ika ≥ 13.0 TAI sp 'P' && ika ≥ 15.0
//    → kuten POST mutta phvVarmuus 'ikaoletus'; muuten 'epavarma' → vain
//    sm_pallo-pohjainen kehityskohde
//  - vahvuus: korkein taso, vain jos ≥ 4 (vahvuuden saa näyttää aina — ei PHV-riskiä)
// IKÄ DESIMAALINA: kutsuja johtaa parhaasta lähteestä syntymaaika → syntymaVuosi
//  → joukkuenimi (kokonaisluku). SJK:n syntymäajat tulevat ~2 vk — älä kovakoodaa
//  joukkuenimioletusta funktion sisään.
```
Vitest: MAS-yksikkömuunnos · gap-suunnat molempiin · taso 5 · ikäoletusrajat
(T12.9 epavarma / T13.0 ikaoletus / P14.9 epavarma / P15.0 ikaoletus) · PH-tila
suodattaa fyysiset · sm_pallo aina sallittu.

## Osatehtävä B — recalcHH-laajennos (uudet pikakentät)

Tiedosto: TalentMaster_Excel_Tuonti.html (recalcHH + H-H Excel-tuontipolku).

1. **`d1_taso`** (§26 TODO): ka saatavilla olevien D1-testien tasoista
   (lin10m/lin30m/cmj/mas/kasirata — EI sm_juoksu/sm_pallo, ne ovat D2-siltaa).
   Pyöristys 1 des. → Master_v16 M3 (D1/D2) herää (d2_taso on jo 56 pelaajalla).
2. **`hh_kehityskohde` + `hh_vahvuus`**: `hhKehityskohde`-funktiolla (PHV-
   suodatin pikakenttätasolla — EI UI:ssa hajautettuna).
3. **`tsi_edellinen` + `tsi_edellinen_pvm`**: pvm-vahti kuten tki_edellinen
   (§29 — vain aito uusi testi vangitsee; recalc EI vangitse).
4. **Ikälähde-korjaus (§26 epäjohdonmukaisuus):** recalcHH käyttämään samaa
   kronologista logiikkaa kuin Excel-tuonnin laskeIka (syntymaVuosi + oletus
   1.7. → fallback joukkuenimi). Syntymäaikojen saapuessa sama koodipolku
   tarkentuu itsestään.
5. recalc nollaa pikakentät kun H-H-dataa ei ole (sama periaate kuin TKI).

## Osatehtävä C — Master_v16 H-H- ja TSI-detail-laajennos

1. H-H-detail (`_buildHHDetail`): lisää **"Seuraava taso"-sarake** (gap,
   `hhSeuraavaTaso`) + **yksikköbudjetti-rivi** (2–3 suurinta gapia, vain
   PHV-sallitut testit — `hhKehityskohde`-tulosta kunnioittaen) +
   **PHV-rivi**: 'mitattu' → normaali; 'ikaoletus' → "(ikäoletus — kasvumittaus
   tarkentaa)"; 'epavarma' → "Fyysiset kehityskohteet varmistuvat
   kasvumittauksella" + vain SM-pallo-suositus.
2. TSI-detail (`_buildTSIDetail`): delta-rivi kun `tsi_edellinen` on
   ("TSI 1.40 s → 1.15 s ↑ parani 0.25 s") + vyöhykesiirtymä jos vaihtui.
3. Vauhtirivi H-H-detailiin kun `hh_taso_edellinen` on: abs + vaadittu
   (`hhVaadittuVuosivauhti`), §3.2-kaksoisdelta (ei punaista jos abs parani).

## Rajoitukset — ÄLÄ RIKO

- §28 PHV-invariantit (speksin §0-taulukko) — suodatin VAIN hhKehityskohde-
  funktiossa, ei kopioita UI:hin
- §26: EERIKKILA_NORMIT = SSOT, ei kovakoodattuja kynnyksiä · ei alikokoelma-
  kyselyjä renderöinnissä · MAS km/h↔m/s
- §29: recalc ei vangitse _edellinen; pvm-vahti vain aidossa tuonnissa
- §7.1 string concat · §5 tokenit · §6 yksi @media
- Inline-kopiot synkronointikommentilla; Master lataa testit_indeksit.js:n —
  tarkista käyttääkö TM_TESTIT-objektia vai inline-kopiota, seuraa olemassa
  olevaa patternia

## Verifiointi

1. `npm test` vihreä (uudet testit mukaan)
2. node --check testit_indeksit.js + vm-inline Excel/Master
3. Skenaariot:
   - SJK P15 -pelaaja (lin30m/cmj/mas, ei PHV:tä): ikaoletus → kehityskohde +
     budjetti + "(ikäoletus)"-merkintä
   - SJK P14: epavarma → vain SM-pallo-suositus + kasvumittaus-teksti
   - SJK T14: ikaoletus (T≥13)
   - MAS-pelaaja: gap näkyy km/h-yksikössä järkevänä (EI ×3.6-virhettä)
   - Pelaaja jolla taso 5 jossain testissä: "huipputaso" + vahvuus
   - KPV/Sibbo (ei H-H-dataa): detailit ennallaan, ei kaadu
4. Aja recalcHH SJK:lle (SA) → tarkista d1_taso + hh_kehityskohde populoituvat
   (~56 pelaajaa) ja Master M3-KPI näkyy
5. Commit + push + `npm run version:bump`
