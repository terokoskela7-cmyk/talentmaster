# CODE — P1b: Trendi — Mittauksen sparklinet + Aloitus-radarin edellinen-haamu (READ-ONLY)

**Tyyppi:** UI/luku — sytyttää P2:n sparkline-säiliöt + lisää radar-haamun. **Ei kirjoitusta, ei Rules, ei uutta kenttää, ei migraatiota.** **Yksi PR** (Code voi halutessaan jakaa: A radar-haamu · B sparklinet).
**Kohde:** `TalentMaster_VP_v25.html` — `_avaaPerPelaajaPikakatsaus` (Mittaus-sparkline-säiliöt P2:sta) + Aloitus-radar (`_tmRadar5D`).
**Design-totuus:** tiekartta **P1b** + Mittaus-lähdesivun sparkline-säiliöt (P2) + Aloitus-synteesin trendinuolet.

## Löydös (perusta — lue tämä ensin)

Trendidata **on jo olemassa**, kahdessa muodossa. **Älä keksi historiaa, älä lisää kirjoituskenttiä — lue mitä on:**

1. **Pikakentät (synkroninen, kortin datassa jo):** `hh_taso_edellinen` (+ `_pvm`), `tki_edellinen`, `tsi_edellinen`, `tk_kokonaistulos_edellinen`. Excel-tuonti vangitsee edellisen tason aidolla uudella testillä (pvm-vahti) ennen ylikirjoitusta. → **2-piste-trendi (nuoli + haamu) heti**, ilman alikokoelmakyselyä. Pelaajilla joilla on 2 mittausta, nämä ovat olemassa.
2. **`testitulokset`-alikokoelma (async):** `seurat/{sid}/pelaajat/{pid}/testitulokset/{pvm}_{protokolla}`, docit `{ testauspvm, protokolla, testit:{ lin30m, cmj, mas, … } }`. Excel-tuonti kirjoittaa jokaisen testipäivän tänne. **Luku sallittu:** Rules `testitulokset` read = `onOmaSeura` → VP lukee, **ei Rules-muutosta**. → **aito monipiste-per-testi-historia** (N testipäivää) sparklineihin.

**Kaksi datapolkua → kaksi osaa:** radar-haamu synkronisesti pikakentistä; Mittauksen per-testi-sparklinet async `testitulokset`:sta. Molemmat **read-only**.

## Mitä tehdään

### A. Aloitus-radarin edellinen-haamu + suuntanuolet (synkroninen, pikakentät)
Aloitus-narratiivin 5D-radar (`_tmRadar5D`, P1:ssä lisätty `lahdePisteet`). `_tmRadar5D` **tukee jo `opts.overlay` + `opts.overlayVari`** (käytössä ikävertailussa) — käytä sitä haamulle, **ei radar-API-muutosta**.
- **Edellinen 5D (haamu):** rakenna `overlay`-taulukko dims-järjestyksessä edellisistä tasoista **jotka ovat olemassa**:
  - D1 ← `hh_taso_edellinen`
  - D2 ← johdа `tki_edellinen`:stä samalla logiikalla kuin nykytila (`laskeD2Taso`/`_tkiTaso` — sama muunnos kuin `d2`).
  - D3/D4/D5 ← **ei edellinen-pikakenttää olemassa** → jätä `null`/nykyarvo (ei haamua sille piikille). **Graceful:** haamu piirtyy vain D1/D2:lle. (Täysi 5D-haamu = myöhempi vaihe kun D3/D4/D5-snapshotit ovat.)
  - `overlayVari`: haalea (esim. `var(--ink3)`), katkoviiva jos helppo — "menneen" tuntu.
- **Suuntanuolet per ulottuvuus:** legendaan/piikin viereen ↑ (nyt > edellinen) · → (=) · ↓ (<), kynnys ±0.05. Vain dimeille joilla edellinen on (D1/D2). §28: absoluuttinen parannus positiivinen ei punainen — noudata olemassaolevaa väri-logiikkaa (`hh_taso_edellinen`-nuolet muualla koodissa, esim. rivi ~13228 `deltaHtml`).
- **Tyhjä → ei haamua/nuolta** (pehmeä, kuten P2).

### B. Mittauksen per-testi-sparklinet (async, `testitulokset`)
Sytytä P2:n `.mcard-spark`-säiliöt (30m/CMJ/MAS + TKI) aidosta historiasta.
- **Lataus kortin avautuessa (progressiivinen parannus):** `_avaaPerPelaajaPikakatsaus`:ssa käynnistä best-effort async-haku:
  ```js
  db.collection('seurat').doc(_seuraId).collection('pelaajat').doc(p.id)
    .collection('testitulokset').get().then(...).catch(function(){ /* jätä tyhjäksi */ });
  ```
  **Kortti renderöityy heti pikakentistä (P2 ennallaan); sparklinet injektoidaan säiliöihin kun haku valmistuu.** Anna säiliöille id:t (esim. `id="_spark_30m"`) ja täytä `el.innerHTML = _tmSpark(sarja, {pienempiParempi})` latauksen resolvatessa. Virhe/tyhjä → säiliö jää tyhjäksi (kuten nyt).
- **Sarjan rakennus:** suodata `protokolla==='hh'`, järjestä `testauspvm`-nousevasti → poimi per metriikka `testit.lin30m` / `.cmj` / `.mas`. TKI: `protokolla==='tekniikkakilpailu'` (kokonaistulos/indeksi per pvm) — reuse Pelaaja_v7:n luentamalli (rivi ~1360, `tk`-sarja).
- **Kynnys ≥2 pistettä** (ei ≥3): käyttäjällä on 2 mittauksen pelaajia. Laske `_tmSpark` piirtämään 2 pisteestä (lyhyt viiva). **Päivitä `_tmSpark`:n `pts.length < 3` → `< 2`.** Sparkfoot: "N testiä · ↑/→/↓".
- **Per-testi-trendinuoli:** P2 jätti ydinkortin `trend`-slotin tyhjäksi (ei per-testi-edellinen-pikakenttää). Nyt sarjasta: ensimmäinen vs viimeinen (tai kaksi viimeistä) → nuoli, **pienempi-parempi huomioiden** (30m → arvo pienenee = ↑). Injektoi samaan säiliöön kuin sparkline.
- **Aggregaatti H-H & TKI:** näillä on jo 2-piste-nuoli (pikakentät, P2). Lisää sparkline testituloshistoriasta jos ≥2 pistettä; muuten pidä nuoli.

## Reunaehdot
- **Read-only:** ei kirjoitusta, ei uutta Firestore-kenttää, **ei Rules-muutosta** (`testitulokset` luku = `onOmaSeura`, jo sallittu), ei datamigraatiota. Data on jo olemassa (pikakentät + alikokoelma).
- **Ei fabrikointia:** <2 pistettä → ei sparklinea/nuolta/haamua sille metriikalle. Puuttuva edellinen → ei haamua sille piikille.
- **Progressiivinen parannus:** kortti EI saa odottaa async-hakua renderöityäkseen. Radar-haamu on synkroninen (pikakentät); sparklinet täyttyvät jälkikäteen. Yksi `testitulokset`-luku per kortin avaus (on-demand-modaali, ei listanäkymä) → OK, ei lataa koko seuraa.
- **Pienempi-parempi:** 30m / TSI / suunnanmuutos — käännä suunta + väri (arvo pienenee = nouseva/teal). `_tmSpark` tukee jo `opts.pienempiParempi`; käytä sitä + samaa käännöstä nuolissa.
- **§28 kypsyysneutraali:** trendi ei maalaa kypsyysgeitattua pre-PHV-laskua punaisella; noudata olemassaolevaa delta-väri-logiikkaa (abs-parannus positiivinen ei punainen).
- **Cache:** `_tmSpark`-kynnysmuutos + uusi trendinlaskenta **inline VP-HTML:ssä** → **ei `?v`-bumppia**. (Jos teet jaetun lib-helperin → bump VP + Master.)
- **Brändi:** DS-tokenit, molemmat teemat, hiusviivat, teal/amber/ink3 suuntavärit. Haamu = haalea, ei kilpaile nykyviivan kanssa.
- **Alaikäiset read-only** (Eino·Leo·Emil) — luku muutenkin, ei kirjoitusriskiä; **Topias testi-OK**. Testaa mieluiten pelaajalla jolla on ≥2 testipäivää (Tero: näitä on).

## EI tässä (myöhemmät)
- **Täysi 5D-radar-haamu (D3/D4/D5 edellinen)** → vaatii D3/D4/D5-snapshot-mekanismin (oma vaihe). Nyt vain D1/D2-haamu (missä edellinen on).
- **Kirjoituspuolen historia-arrayt / snapshot-kentät** → ei tarpeen (testitulokset kattaa per-testi-historian; pikakentät kattavat aggregaatti-2-pisteen). Ei lisätä.

## DoD
1. Aloitus-radarissa edellinen-haamu (`overlay`) D1/D2:lle pikakentistä + suuntanuolet (↑→↓); D3/D4/D5 graceful (ei haamua ilman edellistä). Tyhjä → ei haamua.
2. Kortin avaus lataa `testitulokset` async best-effort; kortti renderöityy heti, sparklinet injektoidaan kun data saapuu; virhe/tyhjä → säiliöt jäävät tyhjiksi.
3. Mittaus 30m/CMJ/MAS-korteissa aito sparkline (≥2 pistettä) + per-testi-trendinuoli; pienempi-parempi oikein (30m ↓aika = ↑trendi).
4. TKI-kortissa sparkline/nuoli tekniikkahistoriasta.
5. `_tmSpark`-kynnys ≥2 (ei ≥3); 2 pistettä piirtää lyhyen viivan + sparkfoot "N testiä · suunta".
6. **Ei kirjoitusta / Rules / uutta kenttää / migraatiota.** Read-only. Ei cache-bumppia (inline).
7. Renderöityy molemmissa teemoissa + mobiili; 0 konsolivirhettä. **Verifioi live pelaajalla jolla ≥2 testipäivää.**
8. (Jos trendinlaskennalle tehdään puhdas funktio → lisää vitest; muuten live-verifiointi riittää.)
9. Pieni/keskikokoinen PR; kuvaus linkkaa tiekartta P1b:hen + Mittaus-lähdesivuun. **Verifioi live ennen mergeä.**
