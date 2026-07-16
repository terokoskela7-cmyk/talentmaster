# CODE — P2: Mittaus — mitattu-välilehti design-totuuteen (kortti­ruudukko + §28-portti + trendi olemassa­olevasta)

**Tyyppi:** UI-refaktorointi (display-only, ei uutta dataa). **Yksi PR.**
**Kohde:** `TalentMaster_VP_v25.html` — Mittaus-välilehti `_jspTab1`, eli funktion `_avaaPerPelaajaPikakatsaus` lohkot **f1 (Fyysinen)** ja **f2 (Tekninen)** + niiden koonti (`_jspTab1`-rivi).
**Design-totuus:** hyväksytty *"Mittaus + Arviointi — lähdesivut"* -kartta, Mittaus-paneeli (D1 + D2). Tiekartta **P2**. Ohje on itsenäinen.

## Periaate

Mittaus = **kova data, lukittu** ("kukaan ei arvioi näitä"). Nykyinen Mittaus on jo sisällöllisesti oikea (per-testi 1–5 taso, §28-geittaus, radar, normivertailu, TSI/TKI). **P2 vie sen design-totuuden visuaaliseen muotoon** — rivilistasta **korttiruudukkoon** — ja tekee kolme asiaa näkyväksi: (1) **H-H-koontikortti**, (2) **lisädiagnostiikka erotettu** ("ei H-H:ssa"), (3) **§28-kypsyysportti omana laatikkona**. Trendi renderöidään **vain olemassaolevasta 2-piste-datasta** (nuoli). Monipisteinen sparkline-data (testihistoria) tulee **P1b:ssä** — P2 rakentaa sparkline-säiliön, joka syttyy automaattisesti kun historia on olemassa.

**Kaikki laskenta on jo olemassa — sitä EI kirjoiteta uudelleen.** Uudelleenkäytä: `hhLaskeTaso` / `eerikkilaTaso` / `tasoOf` / `tasoEk` / `laskeD2Taso` / `laskeTSI` / `kypsyysTila` / `onNeutraaliPrePHV` / `_tmRadar5D` / normivertailu (`eerikkilaNormiarvo`) / `_fmtTestiArvo`. P2 muuttaa **vain esitystavan**.

## Mitä tehdään

### 1. D1 Fyysinen — korttiruudukko + H-H-koontikortti
Korvaa nykyinen `friv`-rivilista **korttiruudukolla** (design-totuuden `.mrow` / `.mcard` / `.mtotal`). Kolme **H-H-ydintestiä** omina kortteina + koontikortti:

- **Ydinkortit (3):** `30 m` · `CMJ` · `MAS`. Jokainen kortti:
  - **1–5 kehitystaso** -badge (nykyinen `tasoOf('30m'/'cmj'/'mas', …)`; PHV-korjattu, aina).
  - Raaka-arvo + yksikkö (`_fmtTestiArvo`).
  - **Trendinuoli + delta** (↑/→/↓) — ks. kohta 4.
  - **Sparkline-säiliö** (SVG) — ks. kohta 4 (renderöi vain jos historiaa; muuten pois).
  - Alaviite: `kehitystaso · norm 16+` (muistuttaa että normivertailu on Showcase 16+, kehitystaso aina).
- **H-H-koontikortti** (`.mtotal`): otsikko "H-H taso", arvo = `p.hh_taso` (d1), alle "30m·CMJ·MAS → keskiarvo".
- **§28-geittaus säilyy per kortti:** gated-testit (30m/CMJ/MAS) käyttävät `kypsyysTila`/`_kt`-logiikkaa: `kasvu` → 🌱 badge, `epavarma` → himmennetty taso-luku, `normaali` → `hhTasoVari`. **Älä pudota tätä** — se on jo `friv`:ssä, siirrä korttiin.

### 2. Lisädiagnostiikka — erotettu osio ("ei H-H:ssa · ilman palloa")
Design-totuuden `.diaglabel` + `.diag`-kortit. Erillinen otsikoitu rivi **"Lisädiagnostiikka · ei H-H:ssa (ilman palloa)"** ja sen alle diagnostiikka­kortit **niistä testeistä joita on** (§26 näytä-mitä-on):
- **5–10 m kiihdytys** (jos `hv.lin5m`/`hv.lin10m`) — "räjähtävä lähtö".
- **Suunnanmuutos** (jos `hv.sm_juoksu` — ilman palloa, 505-tyyppi) — "ilman palloa".
- **Ketteryys** (jos `hv.kasirata` — T-testi) — "reaktiivinen".
- Diagnostiikkakortit **eivät näytä 1–5 H-H-tasoa** (ne eivät nosta H-H:ta) — pieni `diagnostiikka`-tag + arvo + lyhyt selite. (Nopeus 5m/10m/kasirata-taso saa jäädä syväanalyysin normivertailuun kuten nyt.)

### 3. §28-kypsyysportti — oma laatikko
Kun pelaaja on PHV-herkässä ikkunassa (`onNeutraaliPrePHV(p)` tai gated-testi `epavarma`/`kasvu`), näytä design-totuuden **`.gate`-laatikko** (🌱): lyhyt teksti "Heikko fyysinen ei nouse kehitystavoitteeksi ennen PHV:tä, eikä normivertailua näytetä ennen Showcase-ikää (16+) — vain kehityskaista." **Ehdollinen:** jos pelaaja ei ole herkässä ikkunassa (esim. Showcase 16+ / post-PHV), älä näytä laatikkoa. Reuse olemassaoleva `_preP`/`kypsyysTila` — ei uutta luokittelua.

### 4. Trendi — olemassaolevasta 2-piste-datasta (EI fabrikoida)
Nykyinen "Kehitysvauhti" (H-H-taso delta `hh_taso_edellinen`:stä) on haudattuna syväanalyysiin. **Nosta se korttitasolle nuolena:**
- **Trendinuoli per kortti:** `↑ +Δ` (teal) · `→ 0` (neutraali) · `↓ −Δ` (amber) — laskettuna **vain** olemassaolevista `_edellinen`-pikakentistä:
  - 30m/CMJ/MAS → toistaiseksi **ei per-testi-_edellinen-arvoa** → näytä H-H-tason nuoli koontikortissa (`hh_taso_edellinen` → `hh_taso`), ja ydinkorteissa nuoli **vain jos** per-testihistoria on olemassa (P1b). Tyhjä → ei nuolta (pehmeä).
  - **Älä keksi** väli­pisteitä. Ei dataa → ei nuolta.
- **Sparkline-helper** (uusi, pieni, inline VP-HTML:ssä — EI lib-tiedostoon → **ei cache-bumpia**):
  - `_tmSpark(points)` → palauttaa `<svg class="jsp-spark">…<polyline points="…"/></svg>` normalisoiden pisteet 0–100 × 0–20 -viewBoxiin. Suunta-väri: nouseva=teal, laskeva=amber, tasainen=ink3 (**huomioi pienempi-parempi-mittarit**: 30m/suunnanmuutos → pienenevä arvo = nouseva trendi).
  - **Renderöi sparkline vain jos ≥3 pisteen historia on olemassa.** Tänään ainoa aito monipiste­lähde on `flei_historia[]` (FLEI-kortissa, Tekninen-syväanalyysi) — käytä sitä sparklinen elävänä esimerkkinä. 30m/CMJ/MAS/TKI/TSI **eivät saa sparklinea vielä** (ei historiaa) → näytä pelkkä nuoli tai ei mitään. **P1b lisää historian → sparkline syttyy automaattisesti samaan säiliöön.**
- **Sparkfoot** (design `.sparkfoot`): "N testiä" + suuntamerkki — näytä vain kun sparkline renderöityy.

### 5. D2 Tekninen — TKI/TSI-kortit + per-taito + D2-koontikortti
Korvaa nykyinen f2-taulukko design-totuuden `.mrow.d2b`-ruudukolla:
- **TKI-kortti:** tag `TKI · n/5` (nykyinen `_tkiMerkkiVP` / `laskeD2Taso`), arvo `tki_viimeisin` (p), trendinuoli `tki_edellinen`→`tki_viimeisin`, sparkline-säiliö (tyhjä kunnes P1b).
- **TSI-kortti:** tag `TSI · n/5` (jos johdettavissa), arvo = TSI (nykyinen `laskeTSI(sm_juoksu, sm_pallo)` tai `tsi_viimeisin`), selite "suunnanmuutos pallon kanssa". TSI:llä **ei ole `_edellinen`-kenttää** → ei nuolta (graceful). §21-väri säilyy.
- **Per-taito (TKI)** -kortti: Kuljetus/Syöttö/Vastaanotto/Viimeistely **jos** `p.tk_lajit_viimeisin` sisältää lajit; muuten näytä nykyinen syöttö/pujottelu (H-H 1–3) tai jätä kortti pois (graceful — älä keksi taitoja).
- **D2-koontikortti** (`.mtotal`): "D2 taso" = `laskeD2Taso(p)`, alle "→ radar D2".
- **Suunnanmuutos (ilman → pallolla)** -rivi ja TKI-merkki säilyvät (siirrä korttien alle tai syväanalyysiin — älä poista).

### 6. Säilytettävät (ÄLÄ poista)
- **Per-testi-radar** (Fyysinen `_fysRadar` + Tekninen `_tekRadar`) — pidä, ne ovat design-totuudessakin ("→ radar D2").
- **▸ Syväanalyysi -reveal** (normivertailu, sub-indeksit EI/FVP/Profiili, MAS-vyöhykkeet, FLEI, TKI-kehitysvauhti) — pidä ennallaan revealin takana. P2 ei kosketa sisältöä, vain nostaa koontiluvut korttitasolle.
- **`_jspVaihda`-navigaatio, tab-rakenne, `_mSub`/`_mErot`-koonti** — ennallaan.

## EI tässä (seuraavat vaiheet)
- **Testihistoria / monipiste-sparkline-data** (per-testi `hh_historia` / 5D-snapshot kirjoitus) → **P1b**. P2 rakentaa säiliön; P1b täyttää datan (+ Rules jos alikokoelma, + kirjoituspolku testien tallennuksessa).
- **Aloitus-radarin edellinen-haamu + suuntanuolet** → **P1b** (sama snapshot-mekanismi).
- **Normivertailun laajennus / uudet testiprotokollat** → ei tässä.

## Reunaehdot
- **Display-only:** ei uutta Firestore-kenttää, **ei Rules-muutosta**, ei datamigraatiota, ei kirjoituspolkua. P2 lukee vain olemassaolevia kenttiä (`hh_viimeisin`, `hh_taso`, `hh_taso_edellinen`, `tki_viimeisin`, `tki_edellinen`, `tk_lajit_viimeisin`, `flei_historia`, `d2_taso`, `phv_tila`).
- **Ei fabrikointia:** puuttuva data → pehmeä tyhjä (ei nuolta, ei sparklinea, kortti jätetään pois). Sama §26-periaate kuin nyt.
- **§28 säilyy:** gated-testit kypsyysneutraaleja (`kypsyysTila`); normivertailu vain Showcase 16+ (jo syväanalyysissä — älä siirrä normivertailua korttitasolle pre-16).
- **Cache:** ei lib-muutosta (`_tmSpark` inline VP-HTML:ssä) → **ei `?v`-bumppia**.
- **Brändi:** DS-tokenit, molemmat teemat, Cormorant/DM Sans/DM Mono, hiusviivat, teal-aksentti, terävät kulmat. Kortit = design-totuuden `.mcard`-tyyli (ei uusia värejä).
- **Alaikäiset read-only** (Eino·Leo·Emil) — Mittaus on muutenkin luku; **Topias = testi-OK**. (P2 ei kirjoita → ei kirjoitusriskiä.)
- **Mobiili §6:** korttiruudukko pinoutuu (`.jsp-grid`/media-query kuten nyt); testaa kapea leveys.
- **D3/D5-käsitteet eivät kliinistä tietoa** (ei koske Mittausta, mutta pysyy voimassa).

## DoD
1. D1 Fyysinen = korttiruudukko (30m/CMJ/MAS-kortit + H-H-koontikortti); per kortti 1–5 taso + arvo; §28-geittaus säilyy (🌱/himmennys/normaali).
2. Lisädiagnostiikka erotettu omaan osioon ("ei H-H:ssa · ilman palloa") — vain testeistä joita on.
3. §28-kypsyysporttilaatikko näkyy vain herkässä ikkunassa; muuten piilossa.
4. Trendinuoli olemassaolevasta 2-piste-datasta (H-H-taso koontikortissa; TKI-kortissa); tyhjä = ei nuolta. Sparkline-säiliö renderöityy ≥3 pisteestä (FLEI tänään), muuten pois — ei fabrikointia.
5. D2 Tekninen = TKI/TSI-kortit + per-taito (jos dataa) + D2-koontikortti; TSI ilman nuolta (ei _edellinen).
6. Radar + ▸ Syväanalyysi + navigaatio säilyvät; ei poistettu laskentaa.
7. Renderöityy molemmissa teemoissa (screenshot molemmista) + mobiilileveys; ei konsolivirheitä.
8. Ei Rules-muutosta, ei uutta kenttää, ei migraatiota, ei cache-bumppia (pelkkä VP-HTML).
9. Pieni/keskikokoinen PR; kuvaus linkkaa Mittaus-lähdesivuun + tiekartta P2. **Verifioi live ennen mergeä.**
