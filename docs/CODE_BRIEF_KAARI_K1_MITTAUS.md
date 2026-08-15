# Kehityskaari K1 — Mittaus: kytke KISS-komponentti (tmKehityskaari) per ominaisuus · Code-brief

> **Miksi (varmistettu koodista):** KISS-renderöijä `tmKehityskaari(el, data, opts)` on **jo täysin toteutettu** `lib/tm_kehityskaari.js`:ssä
> (v4) design-kartan mukaan — vartijat mukana: **alustavartija §22** (`tmKaariAlustaSuodata`), **datataso 1/2/≥3** (`tmKaariDatataso`),
> **kaksi deltaa §34** (`tmKaariKaksiDeltaa`), **rooli='pelaaja' → vain oma abs+ §7.22**. **MUTTA sitä ei kutsuta mistään** — vain `<script src>`.
> Sen sijaan vanha renderöijä `tmKaariRenderFull(p, ctx)` on kytketty (VP ~11210, "🗺 Kehityskaari · mihin suuntaan", `f4`-analyysilohko).
> **Tämä brief = kytkentä + migraatio:** vaihda Mittauksen kaari vanhasta `tmKaariRenderFull`:sta uuteen **per-ominaisuus `tmKehityskaari`**-korttiin
> (design-kartta). Ei uutta moottoria. **VP-only. Ei `?v`.**
> **Koti:** Mittaus on komponentin primääripaikka (siellä jo per-testi-sparklinet). Fyysinen · FLEI · TKI (kaksi deltaa). **ADAR EI tässä** (K5/VAIHE 2 — ks. GAP-note).

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** **Reuse `tm_kehityskaari.js`:n `tmKehityskaari`** yli reimplementoinnin — älä kirjoita uutta sparklinea/korttia.
  **Älä koske:** moottorin laskentaan (`tmKaariSarja/Suunta/Nopeus/JaksoSidos`) · §29-kehitysvauhtiin · morfosykliin · muihin välilehtiin.
- **§7.22:** VP/valmentaja-näkymä → normi + kaksi deltaa saa näkyä. **§22:** vertailu vain saman alustan sisällä. **§28:** pre-PHV suunta ei rankaisu.

## MUUTOS 1 — korvaa `tmKaariRenderFull`-kutsu (VP ~11210) per-ominaisuus KISS-korteilla
Nykyinen `f4 += … tmKaariRenderFull(p, _ksCtx)` → tilalle **kolme `tmKehityskaari`-kutsua** (kukin oma `el`-säiliö):
```
// säiliöt (esim.) <div id="_kaariFyys"></div><div id="_kaariFlei"></div><div id="_kaariTki"></div>
tmKehityskaari(elFyys, dataFyys, { ominaisuus:'fyysinen', rooli:'vp', onCta: avaaMittausHistoria });
tmKehityskaari(elFlei, dataFlei, { ominaisuus:'flei',     rooli:'vp' });
tmKehityskaari(elTki,  dataTki,  { ominaisuus:'tki',      rooli:'vp' });
```
- **`tmKehityskaari(el, data, opts)` on DOM-renderöijä** (kirjoittaa `el.innerHTML`, injektoi CSS:n `_kkInject`, sitoo `onCta`). Kutsu **renderin JÄLKEEN** kun säiliöt ovat DOM:ssa (tai anna funktio joka ajaa mount-vaiheessa — sama kuvio kuin Mittauksen async-sparklinet). **Ilmoita ENNEN** jos Mittaus-lohko on puhdas string-HTML (silloin tarvitaan mount-hook, ei innerHTML-merkkijono).

## MUUTOS 2 — `data`-objektin mappaus per ominaisuus (kutsuja kokoaa)
`tmKehityskaari` odottaa: `data = { historia:[{arvo, pvm, alusta?}], arvo, yksikko, pienempiParempi, deltaAbs, deltaNormi, normiHistoria, normiTaso }`.
- **Fyysinen:** yhdistä `hh_historia` (30m/CMJ) + `mas_historia` (MAS erillinen array!) → valitse näytettävä avain (oletus tuorein mitattu / heikoin) → `historia:[{arvo,pvm,alusta}]`, `pienempiParempi` = aikatesti true / hyppy·mas false (`tmKaariPienempiParempi(avain)`), `alusta` = fyysisen alustalippu.
- **FLEI:** `flei_historia[]` (kenttä `flei`) → `historia`, `pienempiParempi:false`, `yksikko:'/100'`.
- **TKI (kaksi deltaa):** `tki_historia[]` (kenttä `tki`) → `historia`; **`normiHistoria`** = ikänormi-vaatimus per piste (sama pituus kuin historia) → komponentti piirtää ref-viivan + `tdd`-paneelin. `deltaAbs` = absoluuttisen suorituksen muutos (positiivinen = parani), `deltaNormi` = TKI-luvun muutos. **§34: abs+ → ei punaista.**
- **Suunta/delta:** laske `tmKaariSuunta`/`tmKaariNopeus`:lla (älä keksi) ja syötä `deltaAbs`.

## MUUTOS 3 — vanhan renderöijän kohtalo
- **Poista `tmKaariRenderFull`-kutsu** Mittauksesta (KISS korvaa). Jätä funktio kirjastoon toistaiseksi (muut mahdolliset kutsujat) mutta **merkitse deprecated** kommentilla, TAI poista jos ei muita kutsujia (grep varmistaa — nyt ainoa kutsu on ~11210). **Ilmoita ENNEN kumpi.**

## INVARIANTIT + DoD
- **Reuse:** kaikki renderöinti `tmKehityskaari`:sta; ei uutta sparklinea. Moottorilaskenta koskematon.
- **Datataso rehellinen:** 1 mittaus → lähtöpiste (ei viivaa) · 2 → suunta · ≥3 → kaari (komponentti hoitaa `tmKaariDatataso`:lla). Ei keksittyä viivaa.
- **§34/§22/§28:** TKI abs+ ei punaisena · alustavartija-teksti näkyy fyysisessä · pre-PHV suunta ei rankaisu.
- **Brändi §5:** teal ainoa aksentti, hiusviivat, terävät kulmat, **0 pinkkiä**. Molemmat teemat (dark/light) renderöityvät (komponentti käyttää `var(--*)`).
- **LIVE ennen valmista:** avaa Mittaus pelaajalla jolla ≥3 hh/tki/flei-pistettä → 3 KISS-korttia renderöityvät · TKI näyttää kaksi deltaa (ref-viiva + tdd) · fyysinen näyttää alustavartijan · 1-piste-pelaaja → lähtöpiste-tila. Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ
- **ADAR-kaari** (dimensioittain) — koodin oma TODO (VAIHE 2), tarvitsee `adar_historia`-lähteen → **K5 + GAP-note**.
- Aloitus-siru · Katselmus-jaksosidos · Pelaaja-variantti — omat briffit (K3/K2/K4).
