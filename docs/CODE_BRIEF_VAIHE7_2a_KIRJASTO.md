# Code-brief — Vaihe 7.2a: Ohjelmakirjasto (deterministinen, EI analytiikkaa/AI:ta)

> **Lähde:** koko spec `docs/CODE_TASK_VAIHE7_2_OHJELMAKIRJASTO.md`. Tämä brief rajaa toteutuksen **vain 7.2a:han** (§8-porrastus): deterministinen kirjasto — tallenna/uudelleenkäytä/versioi ohjelmat, liitä jaksoon, kevyt N-laskuri, rules. **EI per-ohjelma-aggregaattianalytiikkaa (7.2b), EI AI:ta (7.2c).** Kohde: **VP_v25 + Master_v16**. Rakentuu V7:n `ohjelma`-slotin (§2c) päälle — moottoria (`tm_fyysteemat.js` / `tm_jaksokooste.js`) EI muuteta.

## 0. Miksi 7.2a nyt — ja miksi `ohjelma_id` kytkettävä oikein heti
7.2a tuottaa arvoa päivästä 1: fysiikkavalmentaja/fysioterapeutti saa yksilölliset ohjelmat **kirjastoon** ja uudelleenkäyttöön. Yhtä tärkeää: SJK:lla on jo muutamalla pelaajalla 2. mittaus ja joillakin kasvumittaus → **annos–vaste-dataa alkaa kertyä nyt**. Siksi 7.2a:n kriittinen tehtävä on kytkeä `jaksofokus.ohjelma.ohjelma_id` oikein, jotta tuo kertyvä data laskeutuu **valmiiksi ryhmiteltynä** ohjelmittain. 7.2a EI vielä laske aggregaattia (se on 7.2b) — se vain varmistaa että ryhmittelyavain on paikallaan ja historia eheä. Väärin kytketty `ohjelma_id` nyt = 7.2b:n trendi rikki myöhemmin.

## 1. Datamalli — `seurat/{seuraId}/ohjelmat/{id}` (VARATTU §11)
```
ohjelmat/{id}
  nimi, tyyppi: 'nopeus_voima'|'perusvoima'|'kuntoutus'|'nopeus'|'liikkuvuus'|'muu',
  kuvaus,                          // vapaa yhteenveto — EI terveysyksityiskohtia (§2c/GDPR Art. 9)
  kesto_vk,
  vaiheet: [ { vaihe, viikot, intensiteetti, nimi, ohje, mittari, harjoitteet:[hpp_ex_id|vapaa] } ],
  versio (int), edellinen_versio_id,   // muokkaus → UUSI doc, ei ylikirjoita
  laatija_uid, laatija_rooli, luotu, paivitetty,
  arkistoitu: bool                 // pehmeä poisto — EI kovaa deletea
```
- **Liitos pelaajaan (additiivinen, ei migraatiota):** `jaksofokus.ohjelma.ohjelma_id` = viittaus. Koko `ohjelma`-objekti **kopioidaan silti** jaksofokukseen (denormalisointi → jakso itsenäinen vaikka kirjasto-ohjelmaa muokataan/arkistoidaan). V7:n sulku kirjoittaa jo `ohjelma`-snapshotin `jaksofokus_historia`-riville (§2c) → **lisää vain `ohjelma_id` mukaan siihen snapshotiin** (ei muuta historia-rakennetta).
- **Versiointi:** editointi luo **uuden doc-id:n** (`versio+1`, `edellinen_versio_id`), ei ylikirjoita. Käynnissä/suljetut jaksot pitävät ajetun version (snapshot). Kirjasto näyttää oletuksena uusimman ei-arkistoidun.

## 2. PURE-lib `lib/tm_ohjelma.js` (§34 — dual-export, Vitest, EI Firestore/DOM)
- `tmOhjelmaValidoi(o)` → `{ok, virheet[]}`: pakolliset kentät (nimi, tyyppi, ≥1 vaihe), vaiheiden intensiteetti-järkevyys (0–100 %, nouseva/looginen), **GDPR-vahti**: hylkää jos `kuvaus`/`harjoitteet` sisältää diagnoosikuvion (ks. §8).
- `tmOhjelmaVersioi(vanha, muutokset)` → uusi versio-objekti (`versio+1`, `edellinen_versio_id = vanha.id`, `luotu`/`paivitetty` säilyttäen laatija-tiedot).
- `tmOhjelmaTemplaatista(tyyppi)` → esitäyttö: **lainaa V7:n `tmOhjelmaTemplaatti`** (`tm_fyysteemat.js` / `TM_OHJELMA_TEMPLAATIT`) + Everton 6 vk plyo (`EVERTON_LISAYKSET.loikat.ll.P_lisays`) + HPP-rehab-protokolla (`src/lib/hpp_rehab_protokollat.js`) rakennepohjina.
- Dual-export (CommonJS + selain-global, V6/V7-malli). Vitest-kattavuus §10.

## 3. Ohjelmaeditori (Master_v16 rakentaa; VP_v25 oversight)
- **Kentät:** nimi · tyyppi (**custom-dropdown §37**) · kuvaus · kesto_vk · **viikko-ohjelma** (lisää vaihe: nimi, viikkoväli, intensiteetti %, ohje, mittari, harjoitteet). Harjoitteet joko **HPP_EXERCISES-viittaus** (valikko `src/lib/hpp_rehab_protokollat.js`:stä) tai vapaateksti.
- **"Uusi kirjastosta / valmiista":** `tmOhjelmaTemplaatista(tyyppi)`-esitäyttö → fysiikkavalmentaja muokkaa → **Tallenna kirjastoon** (`ohjelmat/{id}` create) TAI **Tallenna uutena versiona** (`tmOhjelmaVersioi` → uusi doc).
- **Arkistoi:** asettaa `arkistoitu:true` (pehmeä). Kova delete estetty rulesissa (§6).
- Editori ajaa `tmOhjelmaValidoi` ennen tallennusta; näyttää virheet inline. VP näkee editorin read/oversight-tilassa; fysiikkavalmentaja/fysioterapeutti kirjoittaa.

## 4. Ohjelman liittäminen jaksoon (rakentaja-polku, §10.2 — kevyt polku ennallaan)
- Fyysisen jaksofokuksen asetuksessa (D1-siltamodaali / manuaalinen): **kevyt polku näyttää templaatit kuten V7 (muuttumaton)**; **rakentaja-polku näyttää LISÄKSI "Kirjastosta"** → valitse tallennettu ohjelma → `jaksofokus.ohjelma = {ohjelma_id, ...kopio}`.
- **Sulku/historia = V7 sellaisenaan.** Ainoa lisäys: `ohjelma_id` kulkee snapshotissa mukaan (§1). Moottori (`tm_fyysteemat` / jaksokooste) ei muutu.

## 5. Kevyt N-laskuri (AINOA analytiikka 7.2a:ssa)
- Kirjaston ohjelmakortti näyttää **vain**: "ajettu **N** pelaajalla" (N = eri pelaajat joilla `jaksofokus.ohjelma.ohjelma_id === id` tai historia-rivi samalla id:llä).
- **§26-vahti:** laskuri on **on-demand** kun kirjasto avataan — lukee seuran pelaajat **kerran**, EI per-kortti-kyselyä, EI render-polulla. Pelkkä lukumäärä.
- **EI** ka-deltaa, toteumaa, tulosjakaumaa, PHV-erittelyä — ne ovat 7.2b. (Jätä `tm_ohjelma_analytiikka.js` kokonaan tekemättä tässä vaiheessa.)

## 6. Roolit + Rules (header bump + **Console-deploy**, §12 — EI GitHub Actions)
- **Kirjoitus `seurat/{sid}/ohjelmat/{id}`:** `onOmanSeuranValmentaja` (sis. fysiikkavalmentaja) `||` `fysioterapeutti` (V7 §5 -klausuulin laajennus) `||` `onJohtoRooli`. **Luku:** oma seura. **Kova delete estetty** (vain `arkistoitu`-kenttä sallittu poistoon).
- `jaksofokus.ohjelma.ohjelma_id` kirjoittuu jaksofokuksen mukana — V7-klausuuli (`jaksofokus`-kenttä) kattaa jo, **varmista ettei uusi kenttä riko olemassa olevaa hasOnly/validointia**.
- **Rules-testit emulaattorilla** (V6/V7-opetus, `firebase emulators:exec`): fysiikkavalmentaja kirjoittaa ✓ · fysioterapeutti kirjoittaa ✓ · toisen seuran valmentaja → estetty ✓ · pelaaja/anon → estetty ✓ · kova delete → estetty ✓.
- Rules deploytaan **Firebase Consolesta** (ei Actionsista); merkkaa header-versio + kirjaa deploy PR-kuvaukseen.

## 7. Näkyvyys / kaksitasoisuus (§10.3)
- Kirjasto + editori + "Kirjastosta"-liitos näkyvät kun seuralla on `fysiikkavalmentaja`/`fysioterapeutti`-rooli TAI seura-konfiguraatio sen sallii. **OTO-valmentajan kevyt polku pysyy täysin ennallaan** (templaatit, ei kirjastoa).

## 8. GDPR Art. 9 (kuntoutus) — pakollinen vahti
- `kuvaus`/`harjoitteet` = **harjoitussisältöä** (esim. "eksentrinen takareisi 2×/vk"), **EI diagnooseja**. Vamma-/terveystieto → `terveys/`-alikokoelma erikseen (ei tämän briefin osa). `tmOhjelmaValidoi` + UI-huomio estävät diagnoosikentän ohjelmassa.

## 9. Rajaus (EI 7.2a:ssa — älä toteuta)
- **7.2b:** `tm_ohjelma_analytiikka.js`, `tmOhjelmaKooste`, ka-delta/toteuma/tulosjakauma/PHV-erittely-kortit. **EI nyt.**
- **7.2c:** `aiProxy`-ohjelma-arvio, `ai_arviot/{pvm}`, narratiivi. **EI nyt.**
- K5 kuorma (`kuorma_kooste`), pelaajan/perheen ohjelmanäkymä, AI auto-generointi, cross-club-benchmark — kaikki myöhempiä.

## 10. Verifiointi + DoD
- **Vitest `tm_ohjelma.js`:** validoi pakolliset + intensiteetti-järki; validoi hylkää diagnoosikuvion; versioi → uusi id + `edellinen_versio_id`; templaatista-esitäyttö kaikille tyypeille.
- **Rules emulaattorilla:** §6 viisi tapausta vihreänä (`firebase emulators:exec`).
- **Live VP_v25 + Master_v16 (selain-tarkistus):** editori → tallenna kirjastoon → näkyy kirjastossa → liitä pelaajalle jaksossa ("Kirjastosta") → `jaksofokus.ohjelma.ohjelma_id` tallentuu + kopio mukana → versioi ohjelma → vanha jakso pitää ajetun version → arkistoi → katoaa oletuslistalta, historia säilyy → N-laskuri näyttää oikean N:n → **kevyt OTO-polku ennallaan** (regressiotarkistus).
- **GDPR:** kuntoutus-ohjelma ei diagnooseja (validointi estää).
- `npm test` vihreä + lint puhdas + selain-tarkistus tehty. Rules Console-deploy kirjattu PR-kuvaukseen.
- **Merge vasta kun Tero sanoo "live".** Oma branch (esim. `feat/vaihe7_2a-kirjasto`), oma PR.

## 11. Työjärjestys Codelle
1. `lib/tm_ohjelma.js` (PURE) + Vitest ensin (validoi/versioi/templaatista).
2. Rules-laajennus `seurat/{sid}/ohjelmat/{id}` + emulaattoritestit (§6).
3. Editori Master_v16 (kentät, custom-dropdown, tallenna/versioi/arkistoi, validointi-inline).
4. "Kirjastosta"-liitos jaksofokukseen (rakentaja-polku) + `ohjelma_id` snapshotiin.
5. Kevyt N-laskuri (on-demand, §26).
6. VP_v25 oversight-näkymä (lue kirjasto + N).
7. Verifiointi §10 → raportoi git + emulaattori + selain -tasolla (ei "valmis" ilman koodia).
