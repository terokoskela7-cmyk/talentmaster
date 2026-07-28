# CODE_OHJE — Selkeys 3/3: Tekniikka = alueellinen + valtakunnallinen taso

**Tyyppi:** näyttö (uudelleenjärjestely) · **Kohteet:** `TalentMaster_VP_v25.html` (`_jsvPerLajiHTML` ~7265,
`_jsvBudjettiRivi` ~7298) + `TalentMaster_Master_v16.html` (tkLajiGapit-lohko ~5140). **Base:** `main`.
**Pieni PR.** **Design-referenssi:** artefakti `tm-pelaajakortti-selkeys` (osa 03).

## Periaate (Teron päätös)
VP:n JA valmentajan pitää nähdä per laji **kaksi tasoa**: alueellinen ja valtakunnallinen. Nykyinen
"huipputaso ≤X · +Ys · T-merkki" sekoittaa *ajan* ja *tason*. Korjaus: **per-laji-taulu, kaksi nimettyä
taso-saraketta + matka kärkeen sekunteina** (ei "huipputaso"-sanaa joka luetaan tasoksi).

## Datan totuus (vahvistettu koodista + Tero)
- **Alueellinen taso = TK-lajitaso 1–5** (`tkLajiTaso(laji,arvo,ika,sp)`, kilpailukohortti 2023–25) — **kaikilla**
  lajeilla (ponnauttelu, syöttö, pujottelu, kuljetus-laukaus). Jo kytketty.
- **Valtakunnallinen taso = Eerikkilä-lajitekniikka 1–3** (`eerikkilaTaso(arvo,laji,ika,sp)`, `asteikko:3`) —
  **VAIN syöttö & pujottelu** (Eerikkilä ei testaa ponnauttelua/kuljetus-laukausta; nämä → "—", **oikein**).
  Tavoitetasot vain ikään 15 asti.
- **Matka kärkeen (alueellinen)** = `d.gap` (`_jsvLajiData`, ero alueelliseen huipputasoon sekunteina) — jo laskettu.

## Työ

### 3.1 — `_jsvPerLajiHTML` → per-laji-taulu (VP)
Korvaa nykyinen kaksirivinen +gap/T-merkki-render **taululla** (design osa 03):

| Laji | Aika | Alueellinen taso `ⓘ` | Valtakunnallinen taso `ⓘ` |
|---|---|---|---|
| Syöttö | 48.1 s | **3/5** · kärkeen −2.1 s | **2/3** · tasoon 3 −Y s |
| Ponnauttelu | 40 s | **1/5** | — *Eerikkilä ei testaa* |

- **Aika:** `_fmtTestiArvo(d.arvo, 's')`.
- **Alueellinen taso:** `d.tkTaso` + `/5`, väri `_jsvTasoVari5(d.tkTaso)`; alle himmeä "kärkeen −`d.gap` s"
  (jos `d.gap>0`; jos ≤0 → "★ kärjessä").
- **Valtakunnallinen taso:** `eerikkilaTaso(d.arvo, d.laji, ika, sp)` **jos laji ∈ {syotto,pujottelu} ja tulos 1–3**
  → `N/3` + himmeä "tasoon 3 −Y s" (Y = `d.arvo − taso3-kynnys`, sama kaava kuin kehityskortin "→ taso N+1");
  muuten **"— *Eerikkilä ei testaa*"** (ink3). Ei keksitä Eerikkilä-tasoa lajille jolla ei ole kynnyksiä.
- **ⓘ-tooltipit:** alueellinen = `TM_SELITTEET.tk_lajitaso`; valtakunnallinen = "Eerikkilä-lajitekniikka 1–3,
  3 = valtakunnan kärki. Vain syöttö & pujottelu."
- **Selite-rivi** taulun alle: "Alueellinen = TK-lajitaso 1–5 (kaikki lajit) · Valtakunnallinen = Eerikkilä 1–3
  (vain syöttö & pujottelu)."

### 3.2 — Mitalirivin korjaus (`_jsvBudjettiRivi`)
Nyt: `"⏱ Pronssiin puuttuu 1s → ponnauttelu 18.9s · syöttö 10.6s"` — sekoittaa **kokonaisaika­eron pronssiin (1 s)**
ja **per-laji-eron alueen huippuun (18.9 s)** samalle riville → näyttää ristiriitaiselta. Korjaa: näytä **vain
kokonaisaikaero + lajien nimet ilman sekunteja**:
> ⏱ Pronssitaso — kokonaisaika **1 s** päässä · suurin aikasäästö: ponnauttelu, syöttö
Per-laji-sekunnit ovat taulussa (matka kärkeen) — ei toisteta eri viitteellä.

### 3.3 — Master-sisar (`Master_v16` ~5140)
Sama taulu-rakenne + mitalirivin korjaus Masterin omaan tkLajiGapit-lohkoon (design-lukko molemmat teemat).
Master näyttää saman kahden tason taulun. Pelaaja_v7:ää **ei** koske (§7.22 — ei kovia lukuja pelaajalle).

## Reunaehdot
- **Ei laskentamuutosta, ei skeemaa.** `tkLajiTaso`/`eerikkilaTaso`/`d.gap` luetaan olemassa olevasta laskennasta.
- **Eerikkilä vain syöttö/pujottelu** — muille "—". Älä pakota 1–3:a lajille jolla ei ole kynnyksiä, äläkä
  nimeä TK-lajitasoa Eerikkiläksi.
- **Design-lukko + molemmat teemat** (taulukko, DM Mono luvuille, hiusviivat, teal/amber/red taso-värit).
- **`?v=`-bump** muutettuihin appeihin.

## Definition of Done
- **L1:** `_jsvPerLajiHTML` (VP) + Master-sisar renderöivät per-laji-taulun: Aika · Alueellinen taso (TK 1–5 +
  matka kärkeen) · Valtakunnallinen taso (Eerikkilä 1–3 vain syöttö/pujottelu, muuten "—"); mitalirivi vain
  kokonaisaika + lajinimet (ei per-laji-sekunteja).
- **L2 (vitest):** syöttö/pujottelu → valtakunnallinen 1–3 näkyy; ponnauttelu/kuljetus-laukaus → "—" (ei
  Eerikkilä-tasoa); alueellinen TK 1–5 kaikille; matka kärkeen = `d.gap`. ~870+ vihreä.
- **L3 (elävä, molemmat teemat):** tekniikkataulu näyttää molemmat tasot; syöttö/pujottelu molemmat, ponnauttelu/
  kuljetus-laukaus vain alueellinen + "—"; mitalirivi selkeä (1 s ei sekoitu 18.9 s:aan); luettava, ei run-on.
- Pieni PR. Lataa VP/Master uudelleen deployn jälkeen.
