# CODE_OHJE — Trendi Vaihe 1: mittaushistorian selkäranka (hh_historia + tki_historia)

**Tyyppi:** datakerros (uusi pikakenttä + kertatäyttö + kirjoitus tallennuksessa) · **Base:** `main`.
**Design-referenssi:** "Kehitystrendit — design map" + `TRENDIT_JA_TASOT_KOLME_TASOA_v2.md`.
**Laajuus:** VAIN selkäranka (data). Näyttö (Kehityskaari-sparkline) on **Vaihe 2, eri PR** — älä tee sitä tässä.

## Miksi

Trendi puuttuu kaikilta kolmelta tasolta koska mittauksia ei tallenneta **aikasarjaksi**: nyt on vain
`hh_taso` + yksi `hh_taso_edellinen`. Raaka data (päivätyt `testitulokset`-dokumentit) on tallessa mutta
mikään ei lue sitä trendiksi. Malli on jo olemassa: **`flei_historia[]` + `_kpiFleiTrendi()`** tekee tämän
FLEI:lle. Peilataan sama H-H:lle ja TKI:lle. Tämä yksi selkäranka avaa yksilö-, joukkue- ja seuratrendin.

**Kriittinen: testijoukosta riippumaton.** Seurat mittaavat eri asioita — Sibbo: `kasirata` + `lin30m`;
SJK: `lin10m` + `lin30m` + `cmj` + `sm_juoksu` + `sm_pallo`; osalla `mas`. Snapshot tallentaa **vain
mitatut avaimet** (§26 "näytä mitä on"), ei fabrikoi nulleja. Sama koodi kattaa kaikki seurat.

## Kanoniset periaatteet (design mapista)

- **Suuntaa EI tallenneta** — se luetaan näytöllä per testi kanonisesta `pienempi_parempi`-lipusta
  (`Testaus_v9` `PROTOKOLLAT`). Historia tallentaa raa'at arvot sellaisenaan. (Aikatesti: pienempi = parempi.)
- **Kehitysnopeutta EI tallenneta** — se lasketaan näytöllä Δ / Δt päivätyistä pisteistä. Siksi jokaisella
  snapshotilla on **pvm**.
- **Kova katto** — array säilyttää **viimeiset 20 mittausta** (pvm-järjestys). Vanhemmat pudotetaan
  arraysta — **ei häviä dataa:** `testitulokset`-dokumentit ovat totuuden lähde ja "deep history" voidaan
  aina rakentaa niistä uudelleen.

## Työ

### 1a — Jaettu lib + kertatäyttö (PR 1)

**Uusi `lib/tm_historia.js`** (dual-export, vitest-katettu — sama kuvio kuin `tm_adar_rubriikki.js`):

```js
// Puhtaat, testattavat funktiot — ei Firestorea, ei DOMia.
// tmHhSnapshot(pvm, { hh_taso, d1_taso, d2_taso, hv }) → { pvm, ...vain mitatut avaimet }
//   hv = hh_viimeisin. Kopioi VAIN olemassa olevat numeeriset avaimet (lin5m,lin10m,lin30m,cmj,mas,
//   kasirata,sm_juoksu,sm_pallo,pujottelu,syotto) + tasot jos != null. Ei null-avaimia.
// tmHistoriaLisaa(arr, snapshot, cap=20) → uusi array:
//   upsert pvm:llä (sama pvm korvaa, ei duplikaattia → idempotentti re-import), lajittele pvm nousevaan,
//   leikkaa viimeiset `cap`. Palauttaa uuden arrayn (ei mutatoi).
// tmTkiSnapshot(pvm, { tki, tkLajit }) → { pvm, tki, ...per-laji } (vain mitatut).
```

**Kertatäyttö `backfillHistoria(seuraId, dryRun=true)`** (`TalentMaster_Excel_Tuonti.html`, SA-only
konsoli, malli: `recalcHH`): lue jokaisen pelaajan `seurat/{seuraId}/pelaajat/{id}/testitulokset`-dokumentit,
rakenna `hh_historia` (H-H-patteristot) ja `tki_historia` (tekniikkakilpailu) `tm_historia`-libillä, kirjoita
pelaajadokumenttiin (batch, merge). **Idempotentti** — rakentaa aina lähteestä uudelleen. dryRun tulostaa
montako pistettä per pelaaja.

### 1b — Kirjoitus tallennuksessa (PR 2)

Liitä snapshot **jokaiseen H-H-tallennukseen** `tmHistoriaLisaa`:lla (upsert pvm:llä → ei tuplia
re-importissa):
- `TalentMaster_Excel_Tuonti.html` → `tallennaFirestoreen` (siellä missä `profiiliUpdate.hh_viimeisin` /
  `hh_taso` / `d1_taso` kirjoitetaan) → `profiiliUpdate.hh_historia = tmHistoriaLisaa(p._firestoreData?.hh_historia||[], tmHhSnapshot(pvmIso,{...}))`.
  Sama TKI:lle (`profiiliUpdate.tki_historia`).
- `TalentMaster_Excel_Tuonti.html` → `recalcHH` (backfill-vara: kirjoittaa jo hh_viimeisin/tasot).
- `TalentMaster_Testaus_v9.html` → online-H-H-tallennuspolku (etsi missä `testitulokset` + hh-pikakentät
  kirjoitetaan) → sama snapshot-liitos.

## Reunaehdot

- **Vain data, ei näyttöä.** Ei Kehityskaari-renderiä (Vaihe 2). Ei muuta pelaajan/valmentajan UI:ta.
- **Oikeiden alaikäisten data:** kertatäyttö on **additiivinen ja idempotentti** (rakentaa `testitulokset`-
  lähteestä) — ei muuta/poista mittauksia. Topias Koskela = sanktioitu testipelaaja.
- **Rules:** `hh_historia` / `tki_historia` kirjoitetaan samaan pelaajadokumenttiin samoilla poluilla kuin
  `hh_taso` jo nyt → **tarkista** että `firestore.rules` sallii nämä kentät (jos kenttä-whitelist, lisää ne;
  jos ei, ei muutosta). Testaa emulaattorilla.
- **§26:** vain mitatut avaimet — ei null-avaimia snapshotiin.
- **Testijoukko-agnostinen:** toimii Sibbo (kasirata+30m) JA SJK (10m/30m/cmj/sm_juoksu/sm_pallo) -datalla.
- **Kova katto 20**, upsert pvm:llä (idempotentti). `testitulokset` = arkisto/totuus.
- **`?v=`-bump** kaikkiin appeihin jotka lataavat `lib/tm_historia.js` (uusi lib) — versiointi kuntoon.

## Definition of Done

- **L1:** uusi `lib/tm_historia.js`; snapshot-liitos import- (+recalcHH) ja Testaus_v9-tallennuspoluissa;
  `backfillHistoria`; `?v=`-bumpit. Ei UI-render-muutosta.
- **L2:** vitest `tm_historia`:lle — snapshot ottaa vain mitatut avaimet; `tmHistoriaLisaa` upsert pvm:llä
  (ei duplikaattia), lajittelu, katko 20:een; TKI-snapshot. Emulaattori-Rules vihreä. Muut ~790 vihreä.
- **L3 (elävä, SA-konsoli):**
  - `backfillHistoria('sibbovargarna', true)` dry-run → Aleksi Rajalalla **4 pistettä**
    (30m: 6.18/5.72/5.33/5.38 · kasirata: 8.21/7.71/7.60/7.34).
  - Aja oikeasti → `pelaajat/.../hh_historia` sisältää 4 päivättyä snapshotia, vain mitatut avaimet.
  - **SJK-pelaaja** (esim. Kaarle Kotila): `hh_historia` sisältää *hänen* avaimensa (lin10m/lin30m/cmj/
    sm_juoksu/sm_pallo) — todistaa testijoukko-agnostisuuden.
  - Katto: pelaaja jolla >20 mittausta → array = 20 uusinta. Re-run → ei duplikaatteja (idempotentti).
- Kaksi pientä PR:ää (1a lib+backfill, 1b write-on-save), molemmat verifioitu ennen Vaihe 2:ta.
