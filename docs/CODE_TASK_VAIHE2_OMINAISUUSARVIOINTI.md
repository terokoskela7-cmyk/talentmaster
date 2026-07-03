# Vaihe 2 — Ominaisuusarviointi: Palloliitto-taksonomia (mitattu + havaittu + ADAR)

> Lähde: co-design 2026-07-03. Osa `KEHITYSTYON_VAIHEET.md` (Vaihe 2) + `PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md`. **Yksilövaiheen ydin: arvioi ominaisuudet 1–5 (mitattu + havaittu), pohja Vaiheille 3–5.** Kohde: IDP-kortti / VP-pelaajakortti. §26 pikakentät · §5 · §7.22.

## 1. Tavoite
Renderöi Palloliiton koko arviointitaksonomia (1–5) yhtenä profiilina, jossa **mitattu** (TM-testit) ja **havaittu** (VP/valmentaja + ADAR) yhdistyvät samalla asteikolla, lähde merkittynä. Tuottaa täyden 4-corner/5D-profiilin.

## 2. Datamalli
### 2.1 Taksonomia (kanoninen avainlista — standardoitu, kansallinen)
`lib/tm_arviointi_taksonomia.js` (uusi): Palloliiton kohteet vakioavaimin, ryhmiteltynä 5D:hen + kcategory. Jokaisella: `{ avain, nimi_fi, nimi_en, dim, kategoria, mitattavissa: bool, testId?: string }`. (Lista = `PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md §3`; älä keksi omia — käytä Palloliiton.) `mitattavissa:true` + `testId` → arvo tulee testistä; muuten havaittu.

### 2.2 Havaittu-arvio (Firestore)
`seurat/{sid}/pelaajat/{pid}/arviointi/{kausi}` = `{ havaittu: { <avain>: { arvo:1–5, pvm, arvioija_uid, lahde:'silma'|'adar' } }, paivitetty }`.
**Pikakentät (§26, renderöintiin ilman alikokoelmakyselyä):** `arviointi_havaittu: { <avain>: arvo }` + `arviointi_pvm`.

### 2.3 Mitattu → 1–5 (olemassa)
Testit tuottavat jo `eerikkilaTaso`/TKI 1–5. Mäppää testi → taksonomia-avain (`testId`): esim. `lin30m`→speed, `kasirata`→mobility, `cmj`→power, `mas`→endurance, syöttö-TKI→syotto_lyhyt, pujottelu→kuljetus. Mitattu voittaa havaitun kun testi on (näytä molemmat jos halutaan, mutta lähde = mitattu).

## 3. Yhdistetty profiili (render)
- Per taksonomia-kohde: arvo 1–5 + **lähdemerkki** (🟢 mitattu / 🔵 havaittu). Corner-mockup 2026-07-03 = referenssi.
- Per dimensio (D1–D5): keskiarvo kohteista (mitattu+havaittu) → 5D-profiili + radar. Näytä kattavuus (montako arvioitu).
- **Kehitysfokus** = heikoin (mitattu tai havaittu) → syöttää Vaihe 3 kausitavoitteeseen (`idp_fokus`).

## 4. Arviointi-UI (VP/valmentaja syöttää havaitun)
- Corner-näkymässä (D1–D5): mitattavat auto-täytetty (testistä, lukittu), havaittavat = klikattava 1–5 -valitsin (P/A/G/VG/E). Tallennus → `arviointi/{kausi}` + pikakenttä.
- "En nähnyt / N/A" = validi (ei pakoteta arviota — Palloliitto-periaate). 
- Arvioija + pvm tallennetaan (audit).

## 5. ADAR-kytkös (havaittu-kanava)
ADAR-pikakentät (`adar_viimeisin` a/d/ac/r) mäppäytyvät peliäly-havaittuihin: assess→ennakointi/näkemys, decide→päätöksenteko, act→toteutus, reassess→sijoittuminen (tarkka mäppäys spec-liite). `lahde:'adar'`. ADAR täydentää, valmentaja voi yliajaa (`lahde:'silma'`).

## 6. Perustiedot-lisät
Lisää: **vahvempi jalka** (`vahvempi_jalka`: 'oikea'|'vasen'|'molemmat') + **toissijainen pelipaikka** (`positio_2`). Pieni lisäys pelaajan muokkausmodaaliin (Seura.html / VP).

## 7. §7.22 — kehys
Havaittu arvio (1 "Poor" jne.) = **aikuisten työkalu** (VP/valmentaja/scout). Pelaajalle/perheelle: EI "Poor"-leimaa, EI vertailua muihin → kehitysfokus positiivisena (kuten §16/§34 tekniikkatavoitteet). Renderöi eri kehyksellä rooleittain.

## 8. Vaiheistus (toteutus)
- **2a:** taksonomia-lib + mitattu→avain-mäppäys + render (mitattu-only, lähdemerkit) — lukua, ei uutta kirjoitusta.
- **2b:** havaittu-arvio-UI + Firestore + pikakentät (VP syöttää 1–5).
- **2c:** ADAR→havaittu-mäppäys.
- **2d:** perustiedot-lisät (vahvempi jalka, toissijainen pelipaikka).
- Kehitysfokus (`idp_fokus`) päivittyy heikoimmasta → Vaihe 3.

## 9. Code-brief (aloitus: 2a + 2b)
```
Lue: docs/CODE_TASK_VAIHE2_OMINAISUUSARVIOINTI.md + PALLOLIITTO_PELAAJAKORTTI_TAKSONOMIA.md.
2a: luo lib/tm_arviointi_taksonomia.js (Palloliiton kohteet vakioavaimin, 5D+kategoria, mitattavissa/testId).
    Renderöi IDP-/pelaajakortin corner-näkymään per-kohde 1–5 + lähdemerkki (mitattu testistä eerikkilaTaso/TKI).
2b: havaittu-arvio: VP/valmentaja klikkaa 1–5 havaittaville kohteille → seurat/{sid}/pelaajat/{pid}/arviointi/{kausi}
    + pikakenttä arviointi_havaittu (§26). "N/A" sallittu. Arvioija+pvm.
Invariantit: §26 pikakentät, §5 tokenit, §7.22 (havaittu = aikuisten työkalu), Palloliitto-taksonomia standardi.
Testit: taksonomia-lib (avaimet, dim-mäppäys), mitattu→avain. npm test + lint.
```
ADAR-mäppäys (2c) + perustiedot (2d) omina committeina.

## 10. Invariantit
Metodologia ennallaan · Palloliitto-taksonomia = standardi (ei omaa) · §26 · §5 · §7.22 · valmentaja omistaa kentän · GDPR §33 (havaittu arvio = henkilödataa).
