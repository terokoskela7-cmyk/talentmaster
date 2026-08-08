# CODE — Testit-hub P2: Pikakirjaus (1–N pelaajaa, tapahtumaton) + oikea testipäivä

**Osa Testit-teemaa** (master: `docs/CODE_OHJE_TESTIT_TEEMA_ROADMAP.md`). **Nojaa Kenttätyökalu Vaihe 1:een**
(pikakenttälaskenta) **ja P1.2:een** (testivalitsin/`KATALOGI_META`). **Kaksi pinottua PR:ää — P2.0 (VALMIS) → P2.1.**
**Roolit:** vp · testivastaava · fysiikkavalmentaja · valmentaja (valmentaja omiin pelaajiinsa).

## Periaate (Teron linjaus)
Kevyt "kirjaa tulos" -lomake **yhdelle tai usealle pelaajalle** ilman tapahtumaa/kalenteria. **Kriittistä: käyttäjä
voi kirjata OIKEAN testipäivän** (esim. viime kuulta), ei pelkkää tätä päivää. Sama testijoukko kaikille valituille.

---

## PR P2.0 — Jaettu pikakenttä-lib `lib/tm_pikakentat.js` ✅ VALMIS (verifioitu, mergetty)
`tmLaskePikakentat(pelaajaDoc, tulokset, pvm) → upd`. Uskollinen Vaihe 1 -ekstraktio + **viimeisin-vartija**
(`saaHH`/`saaTKI`: jos pvm < olemassa oleva `*_pvm`, ei ylikirjoita `*_viimeisin`/`*_taso`; per-patteristo erikseen).
Testaus_v9/Excel_Tuonti eivät muuttuneet (migraatio = Vaihe 3). **P2.1 ja P-EDIT käyttävät tätä libiä.**

---

## PR P2.1 — Pikakirjaus-lomake (VP-hub + Master)
"Pikakirjaus"-kortti (P0:ssa "tulossa") → oikea lomake. Sijainti: **VP_v25 hub** (`ws-testit`) + **Master_v16**.
**Lataa `lib/tm_pikakentat.js` molempiin** (`<script src>` + `?v=1`).

### Flow
1. **Valitse joukkue** → sen pelaajat rastittaviksi (VP `_pelaajat` joukkuesuodattimella; §18 kaksoiskysely
   `joukkue`/`joukkueet[]`). Rastita **1–N pelaajaa** ("valitse kaikki" -pikavalinta).
2. **Valitse testit** — P1.2:n joustava valitsin. Nosta `KATALOGI_META` + valitsinlogiikka **jaettuun libiin
   `lib/tm_testikatalogi.js`** (Excel_Tuonti + tämä käyttävät samaa); jos ekstraktio liian iso → replikoi +
   "⚠ PIDÄ SYNKASSA Excel_Tuonti KATALOGI_META" -kommentti. Sama testijoukko kaikille valituille.
3. **📅 Testipäivä** — kenttä, **oletus tänään, muutettavissa** (esim. viime kuun päivä). **Tärkein yksityiskohta
   (Teron korostus):** ohjaa `*_pvm`:n JA `normiIka`:n. Pakollinen, näkyvä — älä piilota. Pikakentän `*_pvm` =
   todellinen testipäivä, EI kirjaushetki (VP näyttää "viimeksi testattu" tästä → ei saa valehdella tuoreudesta).
4. **Syöttöruudukko:** rivi per pelaaja × sarake per testi. Alustaherkille alusta-valinta (§22) kun mukana.
5. **Tallenna kerralla** — per pelaaja, best-effort (yksi epäonnistuminen ei kaada erää):
   - **Hae pelaajadoc** (pikakentät `hh_pvm`/`tki_pvm`/`hh_viimeisin`/`d2_*` viimeisin-vartijaa varten).
   - Kirjoita **tapahtumaton** `seurat/{sid}/pelaajat/{pid}/testitulokset/{pvm}_{protokolla}` (protokolla `'pikakirjaus'`;
     §22 Moodi B: `testit`-map + `testauspvm` + `lahde:'pikakirjaus'`). **Upsert** samalla doc-id:llä → saman päivän
     uudelleensyöttö = korjaus.
   - `hh_historia`/`tki_historia` (testipäivän pvm) — kuten Vaihe 1.
   - **Pikakentät:** `var upd = TM_PIKAKENTAT.tmLaskePikakentat(pelaajaDoc, tulokset, testipäivä); if (Object.keys(upd).length) ref.update(upd);`
     → viimeisin-vartija hoituu libissä (backdatattu tulos ei ylikirjoita uudempaa). §26 pari-invariantti automaattisesti.
   - Toast "N pelaajan tulokset tallennettu".

### Reunaehdot
- **Ikä/pvm testipäivästä** (`normiIka` libissä), EI Date.now.
- **Ei uutta laskentaa/Rules-tarvetta** (samat kirjoitusroolit; testitulos-polkuun johto+valmentajaroolit jo kirjoittavat).
- **§7.22:** VP/valmentaja-pinta. **Design-lukko + molemmat teemat** (VP-hubissa).
- `tulokset`-muoto = Vaihe 1 `_tulokset`-muoto (test-id → arvo / {tulos|paras} / kuljetus-objekti) — sama minkä lib odottaa.
- Offline-ensin = valinnainen (nice-to-have), ei pakollinen.

### Definition of Done P2.1
- **L1:** joukkue → 1–N pelaajan monivalinta + testivalitsin + **testipäivä-kenttä** + syöttöruudukko; Tallenna
  kirjoittaa per pelaaja `testitulokset`-dokin (upsert) + historian + pikakentät (`TM_PIKAKENTAT`, viimeisin-vartija);
  ikä testipäivästä. Master + VP hub.
- **L2 (vitest):** testipäivä→`normiIka`/`*_pvm`; monen pelaajan erä (kukin oma doc); upsert samalla pvm:llä ei duplikaatti.
- **L3 (elävä):** joukkue + 3 pelaajaa + "30 m", **aseta testipäiväksi viime kuun päivä** → Tallenna → (a) kaikilla
  `hh_viimeisin.lin30m` + `hh_pvm = valittu pvm` (ei tänään) näkyy VP:llä ilman recalcia; (b) pelaajalla jolla oli JO
  uudempi 30 m → vanha kirjautuu historiaan/testituloksiin mutta `hh_viimeisin`/`hh_taso` **säilyy uudempana**
  (viimeisin-vartija). Molemmat teemat.
- Keskikokoinen PR (oma, erillään P2.0:sta).

## Huom Codelle
- Testipäivä = tämän vaiheen tärkein yksityiskohta. Viimeisin-vartija tulee libistä — **älä replikoi sitä lomakkeeseen**,
  kutsu `tmLaskePikakentat`:ia.
- Raportoi ennen mergeä; L3 (elävä, viime kuun pvm + viimeisin-vartija) verifioidaan selaimessa.
