# Kehityskaari K5a — Pelaajan peliäly-kaari (ADAR ajassa, dimensioittain) · Code-brief

> **Miksi:** ADAR-peliäly puuttuu Kehityskaaresta (koodin oma TODO). Design-kartta = **4 dimensiota ajassa**
> (Havaitse/Päätä/Toimi/Arvioi), konsensuksena. KV-pohja: skannaus-/havainto-toiminta-sykli (Jordet) — scan→decide→execute→review.
> **Perusta on jo olemassa:** `tmAdarKonsensus(havainnot, ikä)` (monen arvioijan konsensus + `yhtenevyysTaso`, anti-anchoring, §4-ikäportitus) +
> KISS-renderöijä `tmKehityskaari(el, data, { ominaisuus:'adar' })`. **Puuttuu vain AIKA-ulottuvuus + dimensio-render.**
> **Koskee VP_v25 (täysi) + Pelaaja_v7 (§7.22-variantti).** Reuse yli reimplementoinnin. Ei `?v` (VP); Pelaaja SW-nosto §27.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** Reuse `tmAdarKonsensus` + `tmKehityskaari`. **Älä koske:** konsensuslaskentaan · anti-anchoring-gateen · ristiinarvioon · muihin kaariin.
- **§28:** ikävaihe (U11-kynnys ≠ U16); vertaa saman ikävaiheen sisällä. **§7.22:** pelaaja EI näe tasolukuja/arvioijia/vertailua.

## MUUTOS 1 — pure-fn `tmAdarKaari(havainnot, ikä)` (aikasarja konsensuksesta)
Uusi funktio `lib/tm_kehityskaari.js`:iin (tai `tm_pelialy_yksilo.js`:ään — **ilmoita ENNEN kumpi**):
- Bucketoi havainnot ajassa (per katselmusjakso TAI liukuva ikkuna) → kukin bucket `tmAdarKonsensus`:n läpi → **per-dimensio aikasarja** `{ a:[{pvm,arvo}], d:[…], ac:[…], r:[…] }`.
- Reuse olemassa olevaa konsensus- + ikäporituslogiikkaa (älä laske uudestaan).
- **Datataso-vartija:** <2 bucketia → lähtöpiste (ei viivaa).

> **⚠ Datan saatavuus (tarkista ENNEN):** aikasarja vaatii **kaikki havainnot pvm:llä** (ei vain "uusin per arvioija"). Jos `adar_arvioijat`
> säilyttää vain tuoreimman per uid → tarvitaan raakahavaintojen historia (alikokoelma) TAI snapshot katselmuksen sulkuhetkellä. **Kerro kumpi tilanne on / ilmoita ENNEN.**

## MUUTOS 2 — VP-render: ADAR dimensioittain `tmKehityskaari`:iin
`ominaisuus:'adar'` + **`data.dimensiot:{ a,d,ac,r }`** (kukin oma mini-trendi) → **yksi kortti, 4 dimensio-riviä** (design-kartta Track A).
- Sijoitus: Arviointi/Mittaus (D4-lohko). Kukin dimensio: mini-sparkline + `ennen→jälkeen`-delta + suunta.
- **§28-vartija-teksti** näkyy ("U11 ≠ U16 · saman ikävaiheen sisällä").
- (Komponentissa on nyt yhden-viivan ADAR + TODO — **lisää `data.dimensiot`-haara**; tämä on se VAIHE 2 -päätös: **dimensiot komponentin sisään**.)

## MUUTOS 3 — Pelaaja_v7: §7.22 kannustava variantti
`tmKehityskaari(el, data, { ominaisuus:'adar', rooli:'pelaaja' })`:
- **Vain oma kasvu kannustavasti** ("Huomaat tilanteet aiemmin kuin ennen"), EI tasolukuja, EI arvioijien nimiä, EI konsensuslukua, EI vertailua muihin.
- Ikävaihe-sävy: Rakentaja pehmeämpi · Showcase suorempi (reuse ääni-rekisteri).
- **SW-nosto §27** (Pelaaja_v7 HTML muuttuu).

## INVARIANTIT + DoD
- **KV-pohjainen:** 4 dimensiota = scan→decide→execute→review; konsensus useasta arvioijasta; ikäportitettu §28. Reuse `tmAdarKonsensus`.
- **Datataso rehellinen:** <2 bucketia → lähtöpiste, ei keksittyä viivaa. **§28:** ei vuosivertailua yli ikävaiheiden.
- **§7.22 tiukka (pelaaja):** ei tasolukuja/arvioijia/vertailua/rankingia — verifioi rendattu HTML. **Brändi §5:** teal aksentti, 0 pinkkiä, molemmat teemat.
- **LIVE:** VP: pelaaja ≥3 havaintokierrosta → 4 dimensiotrendiä yhtenä korttina, §28-teksti · Pelaaja-app: kannustava ilman lukuja · 1 kierros → lähtöpiste. Molemmat teemat. Vitest + eslint vihreä. Pelaaja SW §27.

## EI TÄSSÄ
- Valmennusosaamisen kaari → **K5b**. Alusta-normalisointi (ei koske ADARia).
