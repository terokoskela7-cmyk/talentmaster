# I1 — Teknis-taktinen parseri: OMA_VERSIO-md → `lib/tm_teknistaktiset.js`

> Vaihe 4:n **edellytys**: sisältö dataksi. Parsii kanoniset OMA_VERSIO-curriculum-md:t (yksilö + pelipaikat + joukkue + cue-pankki) → generoitu SSOT-lib. Datamalli = `DATAMALLI_TEKNISTAKTINEN.md` (§0a lukittu: OMA_VERSIO kanoninen, 1–3 KPI-arviointi, suomalaiskoodit). Sama pattern kuin `docs/data/parse_taitokisa*.py` → `tk_lajiviitteet.js` (§34). §26 · §30 (data → indeksit koodissa).

## 1. Ydin
Curriculum on nyt md-tiedostoina — koodi ei voi lukea niitä ajossa. Parseri (Python) → **`lib/tm_teknistaktiset.js`** (generoitu, versioitu). Vaihe 4 + arviointi lukevat libistä. **Ei käsin ylläpidettävä** — md = lähde, lib = totuus koodissa. Vuosipäivitys: aja parseri uudelleen.

## 2. Syötteet (docs/data/ — committoi md:t ensin)
- **7 pelipaikkaa:** `OMA_VERSIO_pilotti_Toppari.md` · `_Laitapuolustaja` · `_Keskikenttapelaaja` · `_Kymppi` · `_Keskushyokkaaja` · `_Laituri` · `_Maalivahti.md` (teema → pelitilanne → KPI-taulukko a/b/c…).
- **Yksilövaihe:** `OMA_VERSIO_Yksilovaihe_ja_silta.md` (14 Y-konseptia + "Painotus/Pelimuoto/Jatkuu:[koodit]" + silta: tarkistuslista/siltataulukko/kausimalli/konseptipelit).
- **Cue-pankki:** `OMA_VERSIO_Kysymyspankki_pelipaikat.md` (+ `docs/data/kysymyspankki_pelipaikat.md`) — 3–4 kysymystä/teema, 1:1 teemakoodeihin.
- **Joukkuetaktinen:** `OMA_VERSIO_Joukkuetaktiset.md` (16 teemaa J-H/J-P/J-S/J-E + kytkentämatriisi).
- **Harjoitteet (pelipaikka):** Excel `Master_kokonaisuus.xlsx` Harjoitepankki (92) → **alias-silta** (CB→T, FB→LP, MID→KK, AMID→KY, ST→KH, WI→LA, GK→MV; teemamäppäys ks. `docs/data/kysymyspankki_pelipaikat.md`).

## 3. Ulostulo — `lib/tm_teknistaktiset.js` (rakenne DATAMALLI:n mukaan)
```js
TM_TT_PELIPAIKAT = { MV:{nimi,numerot:[1]}, LP:{…,[2,3]}, T:{…,[4,5]}, KK:{…,[6,8]}, KY:{…,[10]}, LA:{…,[7,11]}, KH:{…,[9]} }
TM_TT_PELIMUODOT = ['3v3','5v5','8v8','11v11']
TM_TT_ASTEIKKO   = { max:3, tasot:{1:'Ei näy pelissä',2:'Näkyy ohjatusti',3:'Näkyy itsenäisesti'} }   // per-KPI, EI 1/3/5

TM_TT_YOUTH = [ { avain, koodi:'Y-H0', nimi, dim, faasi, ika, pelitilanne, pelimuoto:[…],
                  kpi:[{koodi:'a', teksti}], kysymykset:[…], painotus, jatkuu:['T-H2','LP-H2',…] }, … 14 ]

TM_TT_FUNDAMENTIT = { T:[ { avain:'t_p1', koodi:'T-P1', faasi:'puolustus', nimi, pelitilanne,
                            kpi:[{koodi:'a', teksti}], kysymykset:[…], harjoitteet:['T-P1'] }, … ], LP:[…], … 7 pelipaikkaa }

TM_TT_JOUKKUE = [ { avain, koodi:'J-H1', ryhma:'hyokkays'|'puolustus'|'siirtyma'|'erikoistilanne', nimi, pelitilanne,
                    kpi:[…], kysymykset:[…], konseptipeli, yksilo:['Y-H0',…], pelipaikat:['MV-H1',…] }, … 16 ]

TM_TT_HARJOITTEET = { 'T-P1':{ pelipaikka, teema, painopisteet }, … Excelistä aliaksella; youth konseptipelit erikseen }
TM_TT_KYTKENTA    = { 'J-H1':{ yksilo:[…], pelipaikat:[…] }, … }   // joukkue↔yksilö↔pelipaikka (matriisi)
```
Apurit: `tmTtItems(pelaaja)` (vaihe-gating), `tmTtVaihe(p)` ('perus'|'yhteispeli'|'silta'|'pelipaikka'), `tmTtKysymykset(avain)`, `tmTtHarjoitteet(avain)`, `tmTtNorm5(taso)` (1–3→1–5, 5D/IDP §26). Selain-globaalit + `module.exports` (Vitest).

## 4. Parseri
`docs/data/parse_oma_versio.py` — lukee md:t (otsikkotasot `### KOODI:` → teema, `| a |` → KPI, `*Yksilökonseptit:*` → linkit, `**Cue…**` → kysymykset, `**Konseptipeli:**`) + Excel Harjoitepankki. Idempotentti, kirjoittaa `lib/tm_teknistaktiset.js`. Ajetaan kun curriculum päivittyy. **§15-tyyppinen huom:** md-parsinta regexillä/rivipohjaisesti (ei kovakoodattua sisältöä koodiin).

## 5. Invariantit + verifiointi
§30 (raakadata → lib, ei kovakoodattua UI:ta) · §26 pikakentät · §0a (OMA_VERSIO kanoninen, 1–3, KPI=kriteeri, ei 1/3/5) · §0b jaettu ymmärrys · §0c peli-linkitys (pelitilanne+pelimuoto) · suomalaiskoodit + numeroaliakset · kieli suomi (parseri poistaa mahd. englanti-sulkeet). **Vitest** (`tests/tm_teknistaktiset.test.js`): 14 youth-konseptia · 7 pelipaikkaa täydet · 16 joukkueteemaa · cue 1:1 (ei orpoja) · kytkentämatriisi molempiin suuntiin · `tmTtNorm5` (1→1,2→3,3→5) · vaihe-gating. `npm test` + lint. **Ei UI:ta tässä** — vain lib + parseri + testit (Vaihe 4 rakentaa UI:n).

## 6. Jälkeen
I1 valmis → **Vaihe 4a** (valmentajan konsepti→cue→harjoite -kortti) + harjoittelun suunnittelu → kalenteri.
