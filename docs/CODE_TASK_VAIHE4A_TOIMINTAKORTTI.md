# Vaihe 4a — Valmentajan toimintakortti: konsepti → cue → harjoite

> Toiminnan kerros (KEHITYSTYON_VAIHEET aukko #1): data → resepti. Rakentuu I1:n (`lib/tm_teknistaktiset.js`, livenä) + IDP-ytimen (3a/3b) päälle. Täysi spec: `CODE_TASK_VAIHE4_TOIMINNAN_KERROS.md`. Visuaali: `docs/mockups/vaihe4_toimintakortti_mockup.html`. Kohde: **Master_v16** (valmentaja omistaa kentän). §7b · §26 · §28 · §7.22.

## 0. Edellytys (aja ensin)
`docs/data/Master_kokonaisuus.xlsx` on nyt repossa → **aja parseri uudelleen** `python3 docs/data/parse_oma_versio.py` → `lib/tm_teknistaktiset.js` `TM_TT_HARJOITTEET` täyttyy pelipaikkaharjoitteilla (92, aliaksella). Committoi regeneroitu lib. (Youth-konseptipelit ovat jo mukana.)

## 1. Ydin — 3 palan kortti
Valmentaja avaa pelaajan → näkee **jaksofokuksen** → sen alla **konsepti → cue → harjoite** (mockupin mukainen). Kaikki sisältö **`lib/tm_teknistaktiset.js`:stä** (I1), ei kovakoodattua. Lataa lib Master_v16:een (`?v=1`).

## 2. Konseptin valinta (jaksofokus)
- Lähde: IDP-fokus (`idp_fokus` §3a) TAI arvioinnin heikoin (`arviointi_havaittu`/`tt_heikoin`) TAI valmentajan valinta (`tmTtItems(p)` → dropdown).
- **Vaihe-gating (`tmTtVaihe(p)` §0a):** perus/yhteispeli → youth-konsepti (pelipaikaton); pelipaikkavaihe + `positio` → pelipaikkafundamentti. **§28-kypsyysvahti** (ei-fyysinen etusijalle ilman PHV:tä, kuten 3a).
- Yksi konsepti/jakso (ei ylikuormita).

## 3. Kortin sisältö (libistä)
- **Konsepti:** `nimi` + `pelitilanne` + KPI-konseptit (a/b/c…) + `pelimuoto` (3v3→11v11). §7b: aina pelitilanteen kautta.
- **Cue:** `tmTtKysymykset(avain)` — 3 ohjaavaa kysymystä (valmentaja kentällä + pelin jälkeen).
- **Harjoite:** `tmTtHarjoitteet(avain)` (pelipaikka → Harjoitepankki; youth → konseptipeli). Auto-nosto kun arvio heikko.
- Napit: "Vie jakson treeniin" (→ jaksofokus + myöh. kalenteri 4d) · "Havainnoi → review" (→ 3b).

## 4. Jaksofokus + silmukka (§26)
- Pikakenttä pelaajadokkiin: `jaksofokus: {konsepti_avain, alkoi, kesto_vk, lahde}` → **täyttää aloitusnäkymän jaksofokus-placeholderin** (VP §B). Historia idp_kausi/jakso.
- Silmukka: konsepti+cue+harjoite → treenit → valmentaja havainnoi → 3b-review + arviointi → seuraava jakso. Ei uutta raskasta infraa.

## 5. §7.22
Master = valmentaja-aikuisnäkymä (KPI/kriteerit näkyvät). Pelaajan cue-kerros = 4b (Pelaaja_v7, jaettu ymmärrys §0b — ei tässä). Älä renderöi tasolukuja pelaajalle.

## 6. Rajaus (EI tässä)
Harjoittelun suunnittelu → kalenteri (4d) · joukkuetaktinen suunnittelu (4e) · pelaaja/perhe cue (4b) · VP-oversight (4c). **4a = valmentajan yksilö-toimintakortti + jaksofokus.**

## 7. Invariantit + verifiointi
§7b (pelitilanne+pelimuoto näkyvät) · §26 (jaksofokus pikakenttä, sisältö libistä) · §28 (kypsyysvahti) · §7.22 (aikuisnäkymä) · §5 · valmentaja omistaa kentän (ehdotus, ei pakko) · ei version.json-bumppia · lib `?v` Masteriin. Vitest jos apurilogiikkaa (konseptivalinta/§28-vahti). Live: Master SJK-pelaaja → jaksofokus + konsepti→cue→harjoite libistä, "Vie treeniin" asettaa `jaksofokus`-pikakentän → näkyy VP-aloitusnäkymässä. `npm test` + lint.
