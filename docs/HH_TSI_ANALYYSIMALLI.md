# H-H/TSI-ANALYYSIMALLI — fyysiset ominaisuudet + tekniikka-nopeus
# Speksi · 2026-06-11 · TKI_ANALYYSIMALLI.md:n sisarmalli (sama taso→kohde→määrä→vauhti)
# Kohde: SJK (61 pelaajaa, P14–T16, H-H-data) — yleistyy kaikille H-H-seuroille.

---

## 0. KESKEINEN ERO TKI-MALLIIN — PHV-SUODATIN (§28, EHDOTON)

Tekniikassa heikko tulos = kehityskohde. Fysiikassa EI välttämättä:
**pre-PHV heikko 30m/MAS/CMJ on biologisesti odotettua — EI kehityskohde, EI
laske talenttiarviota** (§28.3). Ilman PHV-dataa fyysistä vajetta EI saa tulkita
voimanpuutteeksi (§28.2, FVP-invariantti).

**SJK:lla ei ole PHV-dataa (0/61).** Malli toimii silti kolmiportaisesti:

| Tila | Mitä saa näyttää | Mitä EI saa |
|---|---|---|
| PHV mitattu | täysi diagnoosi + kuormarajoitin (PH-tila) | — |
| Ei PHV:tä, **ikäoletus täyttyy** (ks. alla) | gap + kehityskohde "(ikäoletus)"-merkinnällä | varma voimadiagnoosi |
| Ei PHV:tä, ikäoletus ei täyty | gapit mittaustosiasioina, EI suositusta | voima-/nopeusjohtopäätös |

**Ikäoletus (PÄÄTETTÄVÄ — ehdotus):** T ≥ 13 v ja P ≥ 15 v → "todennäköisesti
post-PHV" (tyttöjen PHV ~12.0, poikien ~13.8 + 1v marginaali). SJK:n ikäluokista
tämä kattaa T14–T16 ja P15–P16 kokonaan; **P14 jää varovaisuusvyöhykkeelle**
(myöhäiskehittyjä voi olla kesken kasvupyrähdyksen).
→ ⚠️ VAHVA OPERATIIVINEN SUOSITUS: aja SJK:lle kasvumittaus (Testaus_v9
`kasvumittaus`-protokolla, ~3–4 min/pelaaja) → PHV-data avaa täydet tulkinnat
JA kuormarajoittimen (PH-tila). U13–15: 3×/v (§25).

---

## 1. VIITEKEHYKSET

| # | Viitekehys | Datalähde | Kysymys |
|---|---|---|---|
| A | **Eerikkilä-tasot 1–5** | `EERIKKILA_NORMIT` (FINAL2024, SSOT §26) | "Millä tasolla suhteessa ikäluokkaan?" — toimii sekä populaationormina että kynnyksinä (taso 4–5 = eliitti) |
| B | **TSI-vyöhykkeet** | kiinteät (§30): ≤0 🔥 · 0–0.5 ✅ · 0.5–1.0 kehitettävä · >1.0 ⚠️ · >1.5 🔴 | "Paljonko pallo hidastaa?" |
| C | **PHV-konteksti** | `phv_tila` / ikäoletus | "Onko vaje biologinen vai todellinen?" |

Huom: toisin kuin TK:ssa, H-H:ssa EI tarvita erillistä eliittiviitettä —
Eerikkilä-taulukko sisältää jo koko skaalan (taso-kynnykset = "viitetasot").
MAS: data km/h, normi m/s → ÷3.6 laskennassa (§30 — toistuva bugiluokka).

## 2. ANALYYSIKETJU

### 2.1 TASO — `hh_taso` (1–5 ka) + per-testi tasot. Olemassa.

### 2.2 KOHDE — heikoin testi, PHV-suodatettuna
Per testi: `eerikkilaTaso(arvo, testi, ika, sp)`. Kehityskohde = alin taso,
MUTTA: 30m/MAS/CMJ-vaje ilman post-PHV-varmuutta → "seurattava" (ei "kehitä").
SM-pallo/TSI-vaje = AINA validi kehityskohde (tekniikka, ei PHV-riippuvainen).
→ Käytännössä: ilman PHV-dataa pallollinen kehityskohde priorisoituu — mikä on
myös §28:n hengen mukaista (tekniikkaikkuna).

### 2.3 MÄÄRÄ — yksikköbudjetti seuraavaan tasoon
Gap seuraavaan Eerikkilä-tasokynnykseen testin omissa yksiköissä:
```
30m   4.34 s  → taso 4 vaatii ≤ 4.21 s  → −0.13 s
CMJ   35.5 cm → taso 4 vaatii ≥ 38.0 cm → +2.5 cm
TSI   +1.40 s → tavoite < 0.50 s        → −0.90 s   ← prioriteetti (pallo)
```
Uusi funktio `hhSeuraavaTaso(testi, arvo, ika, sp)` → `{nykyinenTaso,
seuraavaTaso, kynnys, gap}` | null (taso 5 → "huipputaso — ylläpito").

### 2.4 VAUHTI — liikkuva maali (Eerikkilä-normit kiristyvät iän myötä)
`hhVaadittuVuosivauhti(testi, ika, sp, taso)` = saman tason kynnysero ika vs
ika+1 normitaulukosta (esim. 30m taso-3: 15v 4.40 s → 16v 4.31 s → vaadittu
−0.09 s/v). Sama kaksoisdelta-invariantti kuin TKI:ssä (§3.2): abs-parannus JA
tasodelta erikseen; tasolaskua ei punaisena jos abs parani.
Delta-infra on jo (`hh_taso_edellinen`, pvm-vahti) — SJK:lla 0/61 → syttyy
seuraavasta testikierroksesta automaattisesti.

## 3. ROOLINÄKYMÄT

### 3.1 VP (syvänäkymä, Fyysinen/D1-osio — sama pattern kuin TKI-Yhteenveto)
- **Tasojakauma-histogrammi** (1–5) per joukkue + hh_taso ka.
- **Per-testi joukkueprofiili:** ka vs taso-3-kynnys → palkki + gap
  ("30m ka 4.52 s · taso-3 ≤4.40 s · −0.12 s ← kauimpana").
- **Kehityskohde-klusterointi:** "12/20 pelaajalla heikoin testi 30m →
  nopeusteema" — PHV-suodatettuna (ilman PHV:tä: "ilman kasvudataa — varmista
  kasvumittauksella" -merkintä).
- **TSI-jakauma:** vyöhykkeittäin + 🔴 >1.5 s -lista (PALLO ⚠️ -signaali on jo).
- **Lähellä tasoa:** "5 pelaajaa ≤0.05 s päässä taso 4:stä (30m)".
- **Vauhti** kun `_edellinen` syttyy: "n/N paransi · normi kiristyy X/v".
- **Kasvumittaus-CTA** kun PHV-kattavuus < 50 %: "Aja kasvumittaus → tulkinnat
  tarkentuvat" → linkki Testaus_v9.

### 3.2 Valmentaja (Master H-H detail — laajennos VAIHE 1:een)
Nykyinen: taso + arvo + normi + suunta. Lisää: **gap seuraavaan tasoon** -sarake
+ yksikköbudjetti-rivi (2–3 suurinta) + PHV-disclaimer-rivi kun phv_tila puuttuu
("Fyysiset kehityskohteet varmistuvat kasvumittauksella") + vauhtirivi (delta).
TSI-detailiin: TSI-delta kun `tsi_edellinen` on (uusi pikakenttä, ks. §4).

### 3.3 Pelaaja (Pelaaja_v7 — sama §7.22-kehys kuin tekniikkatavoite)
- **TSI-tavoite ensisijainen** (pallollinen — aina turvallinen, ei PHV-riskiä):
  "🎯 Pallo mukaan vauhtiin: SM-pallo 9.2 s → tavoite 8.8 s".
- Nopeus/voima/kestävyystavoite VAIN post-PHV-varmuudella (PHV mitattu tai
  ikäoletus): "💨 30m: 4.34 s → tavoite 4.25 s".
- Ilman varmuutta fyysisistä EI tavoitetta — vain vahvuus jos taso ≥ 4
  ("⭐ Nopeus on vahvuutesi!").
- EI koskaan: "olet hidas", PHV/kasvu-selityksiä lapselle, tasolukuja punaisena.

## 4. DATARAKENNE — uutta

```
tsi_edellinen: number|null + tsi_edellinen_pvm    ← pvm-vahti, kuten muut
d1_taso: number (1–5)                              ← §26 TODO TOTEUTETAAN NYT:
  recalcHH laskee ka(lin10m/lin30m/cmj/mas/kasirata-tasot) → Master M3 (D1/D2)
  herää henkiin (d2_taso on jo 56 pelaajalla)
hh_kehityskohde: string|null  ← heikoin testi-id, PHV-suodatettu (null jos
  ei voida päätellä luotettavasti); hh_vahvuus: string|null (korkein taso ≥4)
```
Uudet funktiot (testit_indeksit.js + Vitest): `hhSeuraavaTaso` ·
`hhVaadittuVuosivauhti` · `hhKehityskohde(hh_viimeisin, ika, sp, phvTila)`
(sisältää PHV-suodattimen — EI UI-koodiin hajautettuna).
Ikä/sp SJK:lle: joukkuenimi-fallback (syntymaVuosi vain 6/61, sukupuoli 14/61
— "SJK P15" → 15/M). Sama kuin recalcHH jo tekee (§26 ikälähde-huomio).

## 5. SJK-DATAKARTTA (mitattu 2026-06-11, 61 pelaajaa)

| Data | Kattavuus | Seuraus |
|---|---|---|
| lin10m/lin30m | 56 | ✅ ydin toimii |
| CMJ | 54 · MAS 33 | ✅ / MAS-osio osittainen |
| SM-juoksu/SM-pallo/TSI/d2 | 56 | ✅ TSI-analytiikka täysi |
| lin5m, SJ | 0 | ❌ EI/FVP/VNE ei laskettavissa → suositus: lisää laajaan H-H:hon seuraavalla kierroksella |
| hh_taso_edellinen, tsi_edellinen | 0 | delta syttyy 2. kierroksesta |
| phv_tila | 0 | §0-suodatin käytössä; kasvumittaus-suositus |
| syntymaVuosi 6 · sukupuoli 14 | joukkuenimi-fallback pakollinen |

## 6. TOTEUTUSJÄRJESTYS (ehdotus — sama vaiheistus kuin TKI:ssä)

1. **VAIHE 1:** funktiot (`hhSeuraavaTaso`/`hhVaadittuVuosivauhti`/
   `hhKehityskohde`) + Vitest · `d1_taso` + `hh_kehityskohde/vahvuus` +
   `tsi_edellinen` recalcHH:hon · Master H-H/TSI-detail-laajennos
2. **VAIHE 2:** VP syvänäkymän Fyysinen-osio (3.1) — uudelleenkäyttäen TKI-
   Yhteenvedon helpereitä/CSS:ää
3. **VAIHE 3:** Pelaaja_v7 fyysinen/TSI-tavoite (3.3)
4. **Operatiivinen (ei koodia):** SJK kasvumittaus + laaja H-H (lin5m+SJ) +
   sukupuoli/syntymaVuosi-täydennys seuraavan testauksen yhteydessä

## 7. PÄÄTÖKSET (2026-06-11)

1. ✅ PÄÄTETTY: **Ikäoletus käyttöön** — T ≥ 13.0 / P ≥ 15.0 → post-PHV-oletus
   "(ikäoletus)"-merkinnällä. `hhKehityskohde` ottaa iän DESIMAALINA ja käyttää
   tarkinta saatavilla olevaa lähdettä: syntymaaika → syntymaVuosi → joukkuenimi.
   **SJK:n syntymäajat saadaan ~2 vk sisällä** → tarkkuus paranee automaattisesti
   ilman koodimuutosta (osa P14-joukkueen pelaajista voi olla jo ≥15.0 v).
   HUOM: syntymäaika EI korvaa PHV:tä — kasvumittaus (Testaus_v9) on edelleen
   ainoa tie täysiin diagnooseihin + kuormarajoittimeen. Suositus: kasvumittaus
   samaan hallintorutistukseen syntymäaikojen keruun kanssa.
2. MAS-kattavuus 33/56: näytetään joukkue-ka + "n=33/56" (data-tietoinen UI).
3. recalcHH ikälähde-korjaus (§26) tehdään samassa ajossa kuin d1_taso.
