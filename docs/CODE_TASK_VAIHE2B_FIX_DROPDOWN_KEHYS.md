# Vaihe 2b — korjaus (tallennus) + dropdown (pääteema) + arviointikehyksen avoimuus (kv)

> Lähde: live-verify 2026-07-03 (Claude + Tero). Kohde: `TalentMaster_VP_v25.html` (`_vpTallennaHavaittu` ~3768, `_vpArviointiHTML`) + `lib/tm_arviointi_taksonomia.js`. §26 · §5 · §7.22.

## 1. KORJAUS (kriittinen — tallennus kaatuu nyt)
Konsolivirhe: `Invalid document reference … seurat/{sid}/pelaajat/{pid}/arviointi/2026/27 has 7 segments`. Juurisyy: **`kausi`-arvo sisältää "/" ("2026/27")** ja koodi tekee `.collection('arviointi').doc(kausi)` → Firestore tulkitsee "/":n polkuerottimeksi → pariton (7) segmentti → ei dokumentti.
**Korjaus:** puhdista kausi-doc-ID: `var kausiId = String(kausi).replace(/[\/\\]/g,'-');` → `.doc(kausiId)` (→ "2026-27"). Sama vartija kaikkiin doc-ID:ihin joihin voi tulla "/" (§11-invariantti: ei "/" doc-ID:hin). Verifioi: havaittu-klikkaus → tallentuu ilman virhettä, pikakenttä `arviointi_havaittu` päivittyy.

## 2. DROPDOWN — pääteema → valinnat (57 kohdetta navigoitavaksi)
Nyt kaikki 57 kohdetta litteänä listana. Muuta **pääteema-valinnaksi**:
- **Pääteema-dropdown** (`<select>`): teemat = dimensio + kategoria (esim. "D1 · Liike", "D2 · Syöttö", "D4 · Peliäly"). Lista johdetaan taksonomiasta (`dim`+`kategoria` → teema-avain).
- Valittu teema → näytä vain sen kohteet (mitattu lukittu / havaittu 1–5 + N/A). Per-teema kattavuus.
- Säilytä per-dim kattavuuskooste (yhteenveto) esim. teeman ylle tai 5D-radariin.
Referenssi: mockup 2026-07-03 (pääteema-dropdown + valinnat).

## 3. ARVIOINTIKEHYS — avoin/vaihdettavissa (kansainvälisyys)
Eri maa/liitto arvioi omilla KPI-mittareilla → taksonomia ei saa olla kovakoodattu yhteen kehykseen.
- **Kehysrekisteri** (`lib/tm_arviointi_taksonomia.js`): kääri nykyinen Palloliitto-lista rekisteriin `ARVIOINTI_KEHYKSET = { palloliitto: { nimi, asteikko, taksonomia:[...] }, … }`. Oletus `'palloliitto'`. Asteikko (1–5 P/A/G/VG/E) on **kehyskohtainen** (toinen maa voi käyttää eri skaalaa).
- **Aktiivinen kehys seurakonfiguraatiosta:** `seurat/{sid}/konfiguraatio/arviointi.kehys` (oletus 'palloliitto'). UI lukee aktiivisen kehyksen taksonomian.
- **UI:** kehys-dropdown Arviointi-välilehden ylle (näyttää aktiivisen; SA voi vaihtaa esikatseluun). Tallennettu arvio merkitsee kehyksen: `arviointi/{kausiId}` doc + pikakenttä sisältää `kehys`-kentän → eri kehysten arviot eivät sekoitu.
- **Ei uusia kehyksiä nyt** — vain rakenne auki (Palloliitto ainoa toteutettu; "muu liitto" = tuleva). Tärkeintä: taksonomia = data, kehysavaimella haettava.

## 4. Vaiheistus
- **2b-fix:** kausi-doc-ID-korjaus (heti — tuotantobugi).
- **2b-dropdown:** pääteema-`<select>` + suodatus.
- **2b-kehys:** kehysrekisteri + seurakonfiguraatio-luku + `kehys`-kenttä arvioon (rakenne auki, Palloliitto oletus).

## 5. Invariantit
§26 pikakentät · §5 app-tokenit (natiivi `<select>` teema-tyylillä) · §7.22 (havaittu = aikuisten työkalu) · Palloliitto-taksonomia = oletusstandardi (ei poisteta) · doc-ID ilman "/" (§11) · lib-muutos → nosta lib `?v` · ei version.json-bumppia. Testit: kausi-sanitointi · teema-ryhmittely taksonomiasta · kehysrekisteri (oletus palloliitto). npm test + lint.
