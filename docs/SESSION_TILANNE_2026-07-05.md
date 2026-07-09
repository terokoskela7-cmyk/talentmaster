# Sessiotilanne — 2026-07-05 (handoff uuteen chattiin)

> Tiivistelmä missä mennään. Lue tämä + CLAUDE.md aloittaessasi. Työnkulku: jokainen vaihe = spec + mockup (`docs/` + `docs/mockups/`) → Tero committoi/mergeää → Code toteuttaa haaralle → **haaratason verifiointi (git+vm-sandbox)** → Tero sanoo "live" (mergeää) → **selain-tarkistus deployatusta mainista**.

## Teknis-taktinen valmennusketju — VAIHEET (pääprojekti)
Ketju: **arviointi → (silta) → jaksofokus → teemakeskittymä → teemaharjoitus → läsnäolo → pelaaja näkee cue → jakson sulku → seuraava fokus.**

| Vaihe | Sisältö | Tila |
|---|---|---|
| **4a** | Valmentajan toimintakortti (konsepti→cue→harjoite), jaksofokus | ✅ LIVE |
| **4b** | Pelaajan cue-kerros (`tmTtPelaaja`, §0b jaettu ymmärrys) | ✅ LIVE |
| **4c** | VP jaksofokus-oversight (`tm_jaksofokus.js`, kattavuus+teemakeskittymä) | ✅ LIVE |
| **4d** | Kalenteri ohjausjärjestelmänä — treeniteema (`tm_treeniteema.js`) + reitityskorjaus (treeniteema→harjoitus, ei Testaus_v9) | ✅ LIVE |
| **5** | Arviointi→resepti-silta (`tm_arviointi_silta.js`, heikoin D2 → ehdotettu konsepti) | ✅ LIVE |
| **6** | Silmukan sulku (jakson vaikutus + itsearvio+valmentaja/VP-arvio+kalibraatio+video-valmius → seuraava fokus). **Geneerinen jaksosykli-moottori** (`domeeni`-tagi). Roolit: joukkuevalmentaja omat / talenttivalmentaja talentit / VP oversight | ⏳ **spec+mockup valmis, Code toteuttaa** haaralla `feat/vaihe6-silmukan-sulku`. Spec: `docs/CODE_TASK_VAIHE6_SILMUKAN_SULKU.md` |
| **7** | Fysiikkajakso — sama moottori, D1-fokus + **mitattu delta** (H-H) + **§28 PHV-portti** + fysiikkavalmentaja/fysioterapeutti. Rakenne: treeniteema→toteutuma→subjektiivinen/mitattu arvio | 📋 Suunniteltu (§8 Vaihe 6 -specissä), oma spec+mockup myöhemmin |

**Vaihe 6 keskeiset invariantit:** prosessirehellinen (4vk tekniikka ei näytä mitattavaa deltaa → ei "onnistui/epäonnistui"); `jaksofokus_historia[]`-pikakenttä; kalibraatio = itse vs aikuinen (VP-työkalu, EI pelaajalle syyllistävänä §7.22); video = `media[]`-placeholder (§15). PURE-lib `tm_jaksokooste.js`.

## Muut avoimet
- **`docs/pages-deploy-note`** — CLAUDE.md §33 -kirjaus Pages-deploy-korjauksesta. ⏳ odottaa mergeä (pieni).
- **Silta 5.1** — D4 peliäly → joukkuetaktinen teema (rajattu pois Vaihe 5:stä).
- **K5** kuorma/dropout (4d/K2 tuottaa raakadatan) · **4b-family** perheen peilinäkymä · **K6** iCal-vienti — myöhemmin.

## Deploy (KORJATTU tässä sessiossa — §33)
Pages-lähde = **"GitHub Actions"** (EI "branch") + `.github/workflows/deploy-pages.yml` `concurrency`-ryhmällä (PR #127 mainissa). Korjasi "Multiple artifacts named github-pages" -failin (vanha dynaaminen build + bump-commit → 2 artifaktia). **ÄLÄ vaihda Pages-lähdettä takaisin branch-tilaan.** Deploy ajaa vain kerran/merge (merge-commitista; bump-commit `[skip ci]` skippaa). Verifioitu: version.json päivittyy.

## Avoin tukiasia — Miko Alho (SJK P15, PalloID 35006508, doc `XzEf5AyDWmfSRxDms25k`)
Äiti kysyi PINiä. Juurisyy: **`suostumusTila: "odottaa"`** — PIN aktivoituu vasta kun suostumus annettu. 2 kutsua → **s.jaana@gmail.com**, kumpaakaan ei hyväksytty. Toimet (Tero tekee — alaikäisdata, suostumus-integriteetti §13, EI automaattista suostumusta): (1) varmista äidin oikea sähköposti vs s.jaana@gmail.com; (2) korjaa `huoltajaEmail` tarvittaessa + lähetä suostumuskutsu uudelleen; (3) äiti hyväksyy linkin → PIN aktivoituu ja näkyy.

## Ympäristö-muistutukset
- Sandboxin `git fetch` on ajoittain epävakaa (access-virhe) — verifioi tarvittaessa yksittäisen refin fetchillä tai pyydä Teroa ajamaan tarkistuskomento. **Code on raportoinut "valmista" myös kun koodi puuttui haarasta (#116, #120) — verifioi AINA haaratasolla (git show/vm-sandbox) ennen "live".**
- Selain-tarkistus: Chrome MCP kirjautuneena → lataa `?cb=`-cache-bustilla, tarkista deployatun libin funktiot + logiikka.
- Kaikki vastaukset suomeksi, tiiviisti.
