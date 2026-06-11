# Tehtävä: TK_LAJIVIITTEET-päivitys + UUSI TK_LAJITASOT (1–5) — data 2023–2025

> Tausta: alueviitteet perustuivat 3 PDF-kisaan (FC Lahti + TuPS + ONS). Nyt
> käytössä Palloliiton tuloskooste 2023–2025: ~60 kilpailua / 4 aluetta,
> 3 477 uniikkia pelaajaa validoinnin jälkeen. Datapuoli on JO AJETTU —
> `docs/tk_lajiviitteet.js` on regeneroitu (sisältää nyt MYÖS uuden
> TK_LAJITASOT-vakion) ja lähdetiedostot ovat repossa.
> Tämä tehtävä = inline-kopioiden synkka + tkLajiTaso-funktio + labelit +
> testit + dokit + commit.

## Jo tehty (ÄLÄ tee uudelleen, mutta committaa)

- `docs/data/taitokisa_alue_2023.csv` / `_2024.csv` / `_2025.csv` — raakadata
- `docs/data/taitokisa_alue_2023_2025.json` — aggregaatti (rivit CSV:issä)
- `docs/data/parse_taitokisa_csv.py` — uusi generaattori (korvaa
  parse_taitokisa_alue.py:n aluelähteenä; vuosipäivitys = lisää uusi CSV + aja)
- `docs/tk_lajiviitteet.js` — regeneroitu (SSOT). Muutokset alueluokissa:
  - **P8/T8 kiristyivät selvästi** (pooli 433/139 pelaajaa ent. 1–2 seuran kisat):
    esim. P8 syöttö 29.5→23.2, KL 20.2→16.2; T8 syöttö 35.1→28.9
  - **P11**: ponnauttelu 21.9→16.8, KL 15.2→12.5
  - **P13 lähes ennallaan** (vahvistus, n 7→20) · **T13** KL 11.0→14.1 (vanha
    arvo tuli 11 pelaajan otoksesta), muuten ±0
  - Valtakunnalliset luokat (P9/P10/P12, T9–T12) ENNALLAAN — lähdejako säilyy

## Osatehtävä A — Inline-kopioiden synkka (3 tiedostoa)

Kopioi `docs/tk_lajiviitteet.js`:n TK_LAJIVIITTEET- JA TK_LAJITASOT-arvot
TÄSMÄLLEEN (synkronointikommentit säilyttäen) näihin:
1. `docs/testit_indeksit.js` (canonical funktiokirjasto — Pelaaja_v7 lataa tämän)
2. `TalentMaster_Excel_Tuonti.html` (inline-kopio)
3. `TalentMaster_VP_v25.html` (inline-kopio)
Vain nämä vakiot — älä koske TK_KOKONAISRAJAT/muihin funktioihin.

## Osatehtävä A2 — UUSI kanoninen funktio tkLajiTaso (testit_indeksit.js)

```javascript
// TK-lajitaso 1–5 kilpailukohorttia vasten (TK_LAJITASOT, rajat P20/P40/P60/P80).
// STRICT < — tasan rajalla alempi taso (sama konventio kuin tkLaskeMerkki §23).
// Degeneroituneet rajat (esim. P11 ponnauttelu [37.4,40,40,40] — 60 % kohortista
// maksimiajassa) romahduttavat välitasot luonnostaan: 40.0 → taso 1. Tarkoituksellista.
// Palauttaa null jos ikäluokkaa/lajia ei ole (ika<8, >13) — EI interpolointia.
function tkLajiTaso(laji, arvo, ika, sp) {
  var lk = TK_LAJITASOT[sp] && TK_LAJITASOT[sp][ika];
  var r = lk && lk[laji];
  if (!r || arvo == null) return null;
  if (arvo < r[0]) return 5;
  if (arvo < r[1]) return 4;
  if (arvo < r[2]) return 3;
  if (arvo < r[3]) return 2;
  return 1;
}
```
+ export muiden kanonisten funktioiden rinnalle + inline-kopiot samoihin 3
tiedostoon kuin vakiot. **Vitest:** uusi describe-ryhmä (rajatapaukset: tasan
rajalla, cap-arvo 40/60 → 1, tuntematon ikä → null, P11 ponnauttelu -degeneraatio).

**Roolirajaus (EHDOTON):** TK_LAJITASOT = valmentajan/VP:n populaatioviite +
tuleva D2/OVR-input. Pelaajalle tasolukua EI näytetä (§7.22) — pelaajan
tavoiterivit jatkavat tkLajiViite-pohjaisina. H-H-tulokset arvioidaan edelleen
FINAL2024-normilla, TK-tulokset näillä — ei ristiin (§30). UI-kytkennät
(VP-syvänäkymä, Master TKI-detail, D2) EIVÄT kuulu tähän tehtävään — vain
vakio + funktio + testit, kytkennät speksataan erikseen.

## Osatehtävä B — Lähdelabelit

Grep `Alueellinen huipputaso` (VP_v25 + Master_v16 + mahd. muut):
"Alueellinen huipputaso 2024–25 (suuntaa-antava)" →
**"Alueellinen huipputaso 2023–25"** — pudota "(suuntaa-antava)", koska n=20 ja
pooli 139–490/luokka ei ole enää suuntaa-antava vaan kattava. `_n<10`-suffiksin
logiikka saa jäädä (ei enää laukea, kaikki _n=20). Valtakunnallinen-label ennallaan.

## Osatehtävä C — Testit

`tests/tki_analyysimalli.test.js` viittaa TK_LAJIVIITTEET-arvoihin — päivitä
odotukset uusiin arvoihin (lue arvot tk_lajiviitteet.js:stä, älä keksi).
Jos testit lukevat vakion suoraan moduulista eikä kovakoodattuna, varmista vain
että `npm test` on vihreä.

## Osatehtävä D — Dokumentit

1. `docs/TKI_ANALYYSIMALLI.md` §8.7 (+ lähde-osio): alueellinen lähde =
   "Palloliiton tuloskooste 2023–2025, ~60 kilpailua / 4 aluetta, dedup per
   pelaaja, summavalidointi + järkevyyssuodatus, top-20 kokonaisajalla".
   Lisää päätöskirjaus §8:aan: koko historia 2013–2022 EI viitteisiin (taso
   noussut → vanha data löysentäisi tavoitteita); 2013– data varattu
   trendi-/seura-analyysiin (tuleva).
   LISÄKSI uusi alakohta TK_LAJITASOT:ista: neljäs vertailutaso = populaatio-
   viite kilpailukohorttia vasten (1–5, P20/P40/P60/P80, koko pooli ei top-20),
   otosvaraus (kilpailuihin osallistuneet ≠ väestönormi) + cap-saturaatio
   (maksimiajat → taso 1, välitasot voivat degeneroitua nuorimmissa) +
   empiirinen ankkurointi: FINAL2024 H-H taso 3 ≈ eliittiviitteen erinomainen,
   H-H taso 2 ≈ kohortin P20 (todennettu pujottelu+syöttö P10–P13, desimaalin
   tarkkuudella).
2. `CLAUDE.md` §34: päivitä TK_LAJIVIITTEET-lähdekuvaus + label-rivi
   (valtakunnallinen→"Loppukilpailutaso 2023–25" · alueellinen→"Alueellinen
   huipputaso 2023–25") + generointiriviksi `parse_taitokisa_csv.py` +
   lyhyt TK_LAJITASOT-kirjaus (1–5 kilpailukohortista, tkLajiTaso STRICT <,
   pelaajalle ei tasolukua, H-H↔TK ei ristiin §30).
3. `docs/data/parse_taitokisa_alue.py` — lisää alkuun kommentti
   "# SUPERSEDED: aluelähde on parse_taitokisa_csv.py (2026-06-11). Säilytetty PDF-parsintaesimerkkinä."

## Rajoitukset — ÄLÄ RIKO

- Mitali jaetaan VAIN kokonaisajasta (§31) — viitteet eivät ole merkkirajoja
- §7.22: pelaajan tavoiterivit lukevat tkLajiViite():tä — arvopäivitys riittää,
  tekstilogiikkaan ei kosketa
- Pelaaja_v7 SW: testit_indeksit.js on versioitu (?v=) → nosta versio + SW-cache
  tarvittaessa (§27.4) + `npm run version:bump`

## Verifiointi

1. `node -e` -diff: kaikki 4 kopiota identtiset SEKÄ TK_LAJIVIITTEET- ETTÄ
   TK_LAJITASOT-vakiosta (vertailuskripti: require/parsii kaikki 4, JSON.stringify)
2. `npm test` vihreä (sis. uudet tkLajiTaso-testit)
3. Selaimessa: VP_v25 joukkue-Yhteenveto (Sibbo P10) → eliittiviite-label
   "Alueellinen huipputaso 2023–25" ei näy P10:llä (valtak.) mutta näkyy P13:lla;
   Pelaaja (Topias) MINÄ-tavoiterivit renderöityvät ennallaan
4. Konsolissa: `tkLajiTaso('pujottelu', 26.4, 11, 'P')` → 5 ·
   `tkLajiTaso('ponnauttelu', 40.0, 11, 'P')` → 1 · `tkLajiTaso('syotto', 30, 7, 'P')` → null
5. Commit: "TK_LAJIVIITTEET 2023–25 (CSV-kooste, 3477 pelaajaa) + TK_LAJITASOT
   1–5 + tkLajiTaso + inline-synkka + labelit" + push
