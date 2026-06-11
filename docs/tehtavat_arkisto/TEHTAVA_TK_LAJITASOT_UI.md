# Tehtävä: TK_LAJITASOT UI-kytkentä — VP-syvänäkymä + Master TKI-detail + D2-input

> Edellytykset valmiina: TK_LAJITASOT-vakio + tkLajiTaso (STRICT <) ovat
> SSOT:ssa (docs/tk_lajiviitteet.js), testit_indeksit.js:ssä ja VP_v25-inlinessa
> (commitit 70c646a/0dab3c6). Speksi: TKI_ANALYYSIMALLI.md §8.7 item 10.
> Periaate: tasot lasketaan LENNOSSA `tk_lajit_viimeisin`-pikakentistä —
> EI uutta taso-pikakenttää näyttöön (§26: raakadata tallessa, indeksit koodissa).
> Ainoa persistoitava = D2-input (osatehtävä C).

## Laji-mapping (pikakenttä ↔ TK_LAJITASOT-avain)

`tk_lajit_viimeisin.syotto_s` → `syotto` · `pujottelu_s` → `pujottelu` ·
`ponnauttelu_s` → `ponnauttelu` · `kuljetus_laukaus_s` (NETTO ✓) →
`kuljetus_laukaus`. `pituuspotku_bonus_s` EI saa tasoa (ei TK_LAJITASOT:issa).
Ikä + sukupuoli (P/T) TÄSMÄLLEEN samalla logiikalla kuin olemassa olevat
per-laji-eliittiviitehelperit (`_jsvPerLajiHTML` ym.) — älä keksi uutta
ikäpäättelyä. Ika<8/>13 → tkLajiTaso palauttaa null → elementti jätetään pois.

## Osatehtävä A — VP_v25 joukkue-syvänäkymä

### A1. Yhteenveto: tasojakauma per-laji-profiiliin
Nykyinen per-laji joukkueprofiili (ka vs eliittiviite) saa rinnalleen
tasojakauman: per laji minipalkit tasoittain 1–5 (montako pelaajaa kullakin
tasolla, tkLajiTaso lennossa per pelaaja) + joukkueen ka-taso yhdellä
desimaalilla. Uudelleenkäytä jsv-histogrammihelpereitä (sama pattern kuin
TKI-/hh_taso-jakaumat) — älä duplikoi CSS:ää. Värit vari5-logiikalla.
Selite kerran osion alle: "Taso = sijoittuminen kilpailukohortissa 2023–25
(3 = kisaajien keskitaso)" — teksti TM_SELITTEET:stä (ks. alla).

### A2. Per-pelaaja `_jspModal` Tekninen
Per-laji-riveille (jaettu `_jsvPerLajiHTML`) taso-badge: "T3"-tyylinen pieni
merkki arvon perään, vari5-väri, title-tooltip TM_SELITTEET.tk_lajitaso.
Badge vain kun taso != null. Ei muuta riviin — eliittiviite/gap ennallaan.

## Osatehtävä B — Master_v16 TKI-detail

`_buildTKIDetail`-per-laji-taulukkoon uusi sarake "Taso" (1–5, vari5-väri) +
ℹ️ sarakeotsikossa → TM_SELITTEET.tk_lajitaso. Master lataa testit_indeksit.js:n
— käytä `TM_TESTIT.tkLajiTaso`/`TM_TESTIT.TK_LAJITASOT` (varmista että molemmat
ovat TM_TESTIT-globaalissa; lisää exportit jos puuttuvat). Ikä/sp samoin kuin
detailin nykyinen TK_MERKKIRAJAT/viite-logiikka.

## Osatehtävä C — D2-input (recalc-työkalut, Excel_Tuonti)

1. **Kanoninen funktio** `laskeD2Tekninen(tkLajit, ika, sp)` →
   testit_indeksit.js (+ inline-kopio Excel_Tuontiin synkronointikommentilla):
   - tkLajit = tk_lajit_viimeisin-muotoinen objekti (laji-mapping yllä)
   - laskee tkLajiTason saatavilla oleville lajeille; **vaatii ≥2 lajia**,
     muuten null (yksi laji ei riitä D2-arvioon)
   - palauttaa keskiarvon 1 desimaalilla (1.0–5.0)
2. **Kirjoituspiste:** recalc-työkalut (`_adminLaskeTkiUudelleen`,
   `recalcIkaluokasta`) + Excel/PDF-tuonnin pikakenttäkirjoitus
   (`_tkLajitPikakentat`-polku) kirjoittavat:
   `d2_taso` + `d2_lahde:'tk'` + `d2_pvm` (testauspvm)
   **VAIN JOS** `d2_taso == null` TAI `d2_lahde == 'tk'`.
   **ÄLÄ KOSKAAN ylikirjoita H-H-pohjaista d2:ta** (SJK:n d2_taso on
   SM-testipohjainen, sillä ei ole d2_lahde-kenttää → null-lahde +
   olemassa oleva d2_taso = EI kirjoiteta). Tämä sääntö Vitest-testiin.
3. **OVR EI aktivoidu** — §30: vaatii ≥3 dimensiota. Tämä tehtävä tuottaa vain
   D2-inputin TK-datalla oleville pelaajille (Sibbo/KPV). Ei OVR-koodia.
4. **Vitest:** laskeD2Tekninen (2 lajia → ka, 1 laji → null, null-arvot
   ohitetaan, ika 7 → null) + kirjoitussääntö (mock-objektitasolla jos
   recalc-logiikka on testattavissa; muuten funktiotaso riittää).

## TM_SELITTEET (lib/tm_eerikkila_normit.js)

Uusi avain `tk_lajitaso`: "TK-lajitaso 1–5 kilpailukohorttia vasten
(2023–25, 3 477 pelaajaa): taso 3 = kisaajien keskitaso, taso 5 = paras 20 %.
Otos on kilpailuihin osallistuneet — ei väestönormi." Kaikki A/B-kohtien
selitteet lukevat tästä (yksi totuuslähde, ei copy-paste).

## Rajoitukset — ÄLÄ RIKO

- **§7.22:** Pelaaja_v7:ään EI kosketa — pelaajalle ei tasolukua missään
- **§30:** H-H-tulokset (pujottelu/syöttö H-H-protokollalla, `hh_viimeisin`)
  EIVÄT saa TK-tasoa — tkLajiTaso vain `tk_lajit_viimeisin`-arvoille
- **§26:** vain pikakentät, ei alikokoelmakyselyjä; ei uutta taso-pikakenttää
  (poikkeus: d2_taso/d2_lahde/d2_pvm — D2 on komposiitti-pikakenttä)
- §7.1 string concat · §5 tokenit · §6 yksi @media · typografia: arvot ≥14px
- Degeneroituneet tasot (P11 ponnauttelu) renderöityvät sellaisinaan — ei
  erikoiskäsittelyä, jakauma saa näyttää kaksihuippuiselta
- ?v-bumpit: VP_v25 + Master_v16 + testit_indeksit (?v=7→8) + Excel_Tuonti +
  `npm run version:bump`. Pelaajan SW-cacheversiota EI tarvitse nostaa
  (testit_indeksit on allowlist-cachessa versioparametrilla — ?v hoitaa).

## Verifiointi

1. `npm test` vihreä (uudet laskeD2Tekninen-testit mukana)
2. Selaimessa:
   - VP Sibbo P10 -syvänäkymä Yhteenveto: tasojakaumat 4 lajille, ka-tasot
     järkeviä (1.0–5.0); P13 sama; SJK (ei TK-dataa) → osio ei renderöidy
   - `_jspModal` Tekninen (Sibbo-pelaaja): taso-badget per laji, tooltip toimii
   - Master TKI-detail (Topias, KPV): Taso-sarake + ℹ️-selite
3. Konsolissa: `laskeD2Tekninen({pujottelu_s:28.0, syotto_s:42.2}, 11, 'P')`
   → 4.5 (P11: pujottelu 28.0 → taso 4 [ei <28.0], syöttö 42.2 → taso 4? —
   LASKE odotusarvot TK_LAJITASOT:ista äläkä luota tähän esimerkkiin sokeasti)
4. Recalc-sääntö: aja `_adminLaskeTkiUudelleen` KPV:lle → Topiakselle d2_taso +
   d2_lahde:'tk'; tarkista Firestoresta että yhdenkään SJK-pelaajan d2_taso
   EI muuttunut (heillä ei ajeta TK-recalcia, mutta varmista sääntö koodista)
5. Commit: "TK_LAJITASOT UI: VP-syvänäkymä tasojakaumat + Master TKI-detail
   Taso-sarake + laskeD2Tekninen D2-input" + push + version:bump
