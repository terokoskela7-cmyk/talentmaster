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

### 3.1 — `_jsvPerLajiHTML` (VP) — SÄILYTÄ kompakti muoto (kuva 1) + lisää valtakunnallinen taso
**Tero: valmentajan tekniikkaprofiili-popup (kuva 1) on tiivis ja hyvä → ÄLÄ muuta layoutia leveäksi tauluksi.**
Säilytä nykyinen kompakti kaksirivinen muoto (nimi · aika · huipputaso ≤X · +gap · T-merkki) ja **lisää
toinen taso-merkki: valtakunnallinen (Eerikkilä 1–3) syötölle & pujottelulle** T-merkin viereen.

Per laji (kompakti, kuva 1 -tiheys — EI väljennystä):
- Rivi 1: laji · aika (oik.) · **`Alue T?/5`** · **`Valtak ?/3`** (jälkimmäinen VAIN syöttö/pujottelu)
- Rivi 2 (himmeä): huipputaso ≤X · +gap ←

- **Alueellinen (nykyinen T-merkki, ennallaan):** `d.tkTaso` /5 (`tkLajiTaso`), väri `_jsvTasoVari5(d.tkTaso)`.
  Merkitse selitteessä **"Alue"** (nyt pelkkä "T").
- **Valtakunnallinen (UUSI merkki):** `eerikkilaTaso(arvo, laji, ika, sp)` /3 **VAIN jos laji ∈ {syotto,pujottelu}
  ja tulos 1–3**; muille lajeille **ei toista merkkiä lainkaan** (ei "—"-täytettä joka rikkoo tiheyden — jätä pois).
  - **Protokolla (§23/§26-invariantti):** käytä syöttö/pujottelu-mittausta jolle **Eerikkilä-H-H-normi on
    kalibroitu** — `hv.syotto`/`hv.pujottelu` (sama laskenta kuin olemassa oleva "Lajitekniikka (H-H, taso 1–3)"
    ~9358). Sama rata, eri protokolla — **älä sekoita TK-kilpailuarvoa H-H-normiin.** Jos H-H-mittaus puuttuu →
    ei valtakunnallista merkkiä (ei laske TK-arvosta).
  - Erota merkit visuaalisesti: **Alue** = nykyinen tyyli · **Valtak** = eri reunaväri/tausta + "V"-etuliite tai
    pikkulabel, ettei /5 ja /3 sekoitu.
- **ⓘ-tooltipit:** Alue = `TM_SELITTEET.tk_lajitaso`; Valtak = "Eerikkilä-lajitekniikka 1–3, 3 = valtakunnan
  kärki. Vain syöttö & pujottelu (Eerikkilä ei testaa muita)."
- **Selite-rivi:** "**Alue** = TK-lajitaso 1–5 (kilpailukohortti, kaikki lajit) · **Valtak** = Eerikkilä 1–3
  (vain syöttö & pujottelu)."

### 3.2 — Mitalirivin korjaus (`_jsvBudjettiRivi`)
Nyt: `"⏱ Pronssiin puuttuu 1s → ponnauttelu 18.9s · syöttö 10.6s"` — sekoittaa **kokonaisaika­eron pronssiin (1 s)**
ja **per-laji-eron alueen huippuun (18.9 s)** samalle riville → näyttää ristiriitaiselta. Korjaa: näytä **vain
kokonaisaikaero + lajien nimet ilman sekunteja**:
> ⏱ Pronssitaso — kokonaisaika **1 s** päässä · suurin aikasäästö: ponnauttelu, syöttö
Per-laji-sekunnit ovat taulussa (matka kärkeen) — ei toisteta eri viitteellä.

### 3.3 — Master-sisar (`Master_v16` ~5140, tekniikkaprofiili-popup = kuva 1)
Sama kompakti muoto ennallaan + **lisää valtakunnallinen Eerikkilä-merkki** (syöttö/pujottelu) + mitalirivin
korjaus Masterin omaan tkLajiGapit-lohkoon. Kuva 1 on jo hyvä — vain toinen taso-merkki + mitalirivi muuttuvat.
Pelaaja_v7:ää **ei** koske (§7.22 — ei kovia lukuja pelaajalle).

## Reunaehdot
- **Ei laskentamuutosta, ei skeemaa.** `tkLajiTaso`/`eerikkilaTaso`/`d.gap` luetaan olemassa olevasta laskennasta.
- **Eerikkilä vain syöttö/pujottelu** — muille "—". Älä pakota 1–3:a lajille jolla ei ole kynnyksiä, äläkä
  nimeä TK-lajitasoa Eerikkiläksi.
- **Design-lukko + molemmat teemat** — säilytä kuva 1 -tiheys (DM Mono luvuille, hiusviivat, teal/amber/red taso-värit).
- **`?v=`-bump** muutettuihin appeihin.

## Definition of Done
- **L1:** `_jsvPerLajiHTML` (VP) + Master-sisar **säilyttävät kompaktin kuva 1 -muodon** ja lisäävät toisen
  taso-merkin: **Alue** (TK-lajitaso 1–5, kaikki lajit) + **Valtak** (Eerikkilä 1–3, VAIN syöttö/pujottelu H-H-arvosta;
  muille ei merkkiä); selite "Alue/Valtak"; mitalirivi vain kokonaisaika + lajinimet (ei per-laji-sekunteja).
- **L2 (vitest):** syöttö/pujottelu → valtakunnallinen 1–3 näkyy; ponnauttelu/kuljetus-laukaus → "—" (ei
  Eerikkilä-tasoa); alueellinen TK 1–5 kaikille; matka kärkeen = `d.gap`. ~870+ vihreä.
- **L3 (elävä, molemmat teemat):** tekniikkaprofiili (kompakti, kuva 1 -tiheys) näyttää syötölle/pujottelulle
  **Alue + Valtak** -merkit, ponnauttelulle/kuljetus-laukaukselle vain Alue; mitalirivi selkeä (1 s ei sekoitu
  18.9 s:aan); pysyy tiiviinä (ei "ilmavaa").
- Pieni PR. Lataa VP/Master uudelleen deployn jälkeen.
