# Ikäkonvention yhtenäistäminen (§24/§26) — spec

> Scoping 2026-06-17. Päätös: yksi kanoninen norminhaun ikä koko järjestelmään + tarkka syntymäaika RAE-kvartaaliin.
> Liittyy: §24 (TKI ikäluokka) · §26 (pikakentät, ikälähde-epäjohdonmukaisuus) · §14 (RAE-korjaus) · §25 (bio-ikä) · §30 (RAE-kertoimet).
> Korvaa hajautetun 1.7.-oletuksen (`laskeIka`) ja joukkuenimi-arvauksen yhdellä `normiIka()`-funktiolla.

---

## 1. ONGELMA

Ikä lasketaan kahdella tavalla jotka eroavat jopa vuoden:
- **Ikäluokka (§24, oikea normeille):** `kilpailuvuosi − syntymäVuosi` (2015-synt. 2025 = P10). Eerikkilä/FINAL2024/TK-normit on järjestetty tämän mukaan. **TKI-pää käyttää jo tätä.**
- **Kronologinen 1.7.-oletus (`laskeIka`, väärä normeille):** kevättesti ennen 1.7. → −1 (2015-synt. 10.6.2025 → 9). Tätä käyttää **recalcHH + Excel-tuonti (H-H/fyysinen polku)**.

**Seuraukset (todettu):** recalcHH:n uudelleenajo voi siirtää tasoja (ei idempotentti); Pallo-Iirot skooraisi P9:ää vasten vaikka kilpaili P10:ssä; import vs recalc voivat antaa eri tason; valmentajan detail näyttää nykyiän (esim. 11) kun tallennettu on testihetken ikä (10).

**Faktatausta (Firestore 2026-06-17):** SJK 26 rekisteröidyllä on nyt tarkka `syntymaaika` + `syntymaVuosi` (aiemmin useimmilla ei → tasot laskettiin joukkuenimestä). Tarkka syntymäaika mahdollistaa myös RAE-kvartaalin.

---

## 2. PÄÄTÖKSET (2026-06-17, Tero)

1. **Norminhaun ikä = ikäluokka = `year(testipvm) − syntymäVuosi`** (ei 1.7.-vähennystä). Normit ovat ikäluokkapohjaisia → vuosi riittää, tarkkaa pp.kk ei käytetä norminhakuun.
2. **Per-test-näyttö = testihetken ikäluokka.** 2025 tehty testi 2015-syntyiselle näkyy aina P10:nä, myös 2026 katsottuna → näytetty taso = tallennettu taso.
3. **RAE-kvartaali mukaan tähän passiin:** `syntymaaika` → Q1–Q4 (syntymäkuukausi) → RAE-korjauskertoimet (§30: Q1 0.92 · Q2 0.96 · Q3 1.02 · Q4 1.06).

---

## 3. KAKSI ERILLISTÄ IKÄKÄSITETTÄ (kanonisoidaan)

| Käsite | Käyttö | Laskenta | Tyyppi |
|---|---|---|---|
| **`normiIka`** | Eerikkilä/TK/H-H-normihaku | `year(testipvm) − syntymaVuosi` | kokonaisluku (ikäluokka) |
| **`bioIkaDesimaali`** | Mirwald/PHV (§25) | `(testipvm − syntymaaika) / 365.25` | desimaali (kronologinen) |
| **`raeKvartaali`** | RAE-korjaus (§14/§30) | `syntymaaika`-kuukausi → Q1–Q4 | Q1/Q2/Q3/Q4 |

`bioIkaDesimaali` käyttää **tarkkaa `syntymaaika`a** kun on, muuten 1.7.-oletus. Pysyy erillään normihausta — älä sekoita.

---

## 4. KANONINEN `normiIka(syntymaVuosi, pvm, joukkue?)` (lib)

```
jos syntymaVuosi != null JA pvm != null  → year(pvm) − syntymaVuosi
jos syntymaVuosi != null JA pvm == null  → currentYear − syntymaVuosi   // näkymä "nyt"
jos syntymaVuosi == null                  → fallback joukkuenimen ikäluokkaan ("SJK P14"→14)
palauttaa kokonaisluvun (tai null jos mikään ei onnistu)
```

`raeKvartaali(syntymaaika)` → kuukausi 1–3 = Q1 · 4–6 = Q2 · 7–9 = Q3 · 10–12 = Q4 (Jan-1-katkaisu, suomalainen ikäluokkajako). Korjauskerroin `RAE_KERROIN[Q]` (§30).

---

## 5. MUUTOSKOHTEET (korvaa 1.7.-logiikan + joukkuearvaukset)

| Kohde | Tiedosto | Muutos |
|---|---|---|
| `laskeIka` (norminhaku) | Excel_Tuonti | → `normiIka`, poista 1.7.-vähennys norminhausta (bio-ika säilyy desimaalina erikseen) |
| recalcHH ikäjohto (~3902–3918) | Excel_Tuonti | → `normiIka(syntymaVuosi, hh_pvm)`; idempotentti |
| `perTestTasot`-kutsut | lib + Master/VP | ikä `normiIka`:sta (testipvm:stä) |
| `_devIkaSp` | Master | johda **testipäivästä** (`hh_pvm`/`tki_pvm`), EI `Date.now()` |
| `_jsvJoukkueIkaSp` | VP | per-pelaaja `normiIka`; joukkueaggregaatti voi käyttää joukkuenimeä |
| detail-paneelit (`_buildHHDetail` ym.) | Master | `normiIka` |
| RAE | lib + talent/OVR-laskenta | `raeKvartaali` + kerroin; pikakenttä `rae_kvartaali` |

TKI-pää (§24) on jo oikein → ei muuteta.

---

## 6. RE-BACKFILL — ennakkoehto + sekvenssi

`normiIka` ottaa testivuoden `hh_pvm`:stä → **hh_pvm pitää olla oikea ennen re-backfilliä.**

1. **Pallo-Iirot:** hh_pvm korjattu (10.6.2025) → `normiIka = 2025−2015 = 10` ✓ (korjaa P9→P10).
2. **SJK:** tuotu ennen findCol-korjausta → hh_pvm todennäköisesti väärä (tuontipäivä). **Korjaa SJK:n oikea testipäivä ✎ Korjaa-napilla ENNEN re-backfilliä.**
3. Muut seurat: tarkista hh_pvm per seura ennen ajoa.
4. Aja `recalcHH(seuraId, false, true)` per seura **vasta kun hh_pvm on oikea.** recalcHH on nyt idempotentti → turvallinen toistaa.

---

## 7. VERIFIOINTI + DOKUMENTOINTI

- Vitest: `normiIka` (testivuosi−syntymäVuosi; pvm puuttuu → currentYear; syntymaVuosi puuttuu → joukkue-fallback), `raeKvartaali` (kk→Q rajat), bio-ika säilyy desimaalina.
- recalcHH-idempotenssitesti (sama tulos kahdella ajolla).
- CLAUDE.md §24/§26 päivitys: ikälähde-epäjohdonmukaisuus → ratkaistu, `normiIka` kanoninen.
- Riski: muuttaa tallennettuja H-H/fyysisiä tasoja kerran (tietoinen, dokumentoitu). TKI-data ei muutu.
