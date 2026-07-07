# Arviointikehys (Palloliitto) vs. valmennuskehys (OMA_VERSIO curriculum) — suhde

> Päätös 2026-07-05 (Tero). Selventää mitä VP-arviointi-välisivun **Palloliitto-pääteemoille** tehdään suhteessa nyt rakennettuun omaan teknis-taktiseen curriculumiin (`lib/tm_teknistaktiset.js`, Vaihe 4a). §14 · §26 · §34 · §37 · DATAMALLI_TEKNISTAKTINEN §0a/§0b.

## 1. Kaksi kerrosta — eri kysymys, ei päällekkäisyyttä
| | **Palloliitto-taksonomia** | **OMA_VERSIO teknistaktinen** |
|---|---|---|
| Tiedosto | `lib/tm_arviointi_taksonomia.js` | `lib/tm_teknistaktiset.js` |
| Rooli | **Arviointikehys** (profilointi) | **Valmennuskehys / curriculum** (resepti) |
| Kysymys | *Mitä pelaaja osaa?* | *Mitä harjoitellaan?* |
| Sisältö | ~50 ominaisuutta D1–D5 (Kiihdytys, Kuljetus, Syöttö, Viimeistely, Näkemys…) | 14 youth-konseptia + 7 pelipaikkaa × teemat + 16 joukkuetaktista + cue + harjoite |
| Asteikko | mitattu 🟢 + havaittu 🔵 **1–5** | KPI **1–3** (kriteeri) |
| Käyttäjä | VP / talenttivalmentaja (arvioi) | valmentaja (opettaa → toimintakortti/jaksofokus) |
| Sijainti | VP_v25 Arviointi-välilehti | Master_v16 + VP_v25 toimintakortti (4a) |

## 2. Päätös — SÄILYTETÄÄN ERILLISINÄ (ei yhdistetä, ei korvata)
- **Palloliitto-taksonomia pysyy arviointi-välisivun oletuskehyksenä** (`ARVIOINTI_KEHYS_OLETUS='palloliitto'`). Se on talenttivalmentajan virallinen profilointimalli (kv-avoin kehysrekisteri `ARVIOINTI_KEHYKSET`). **Ei muuteta sisältöä, ei korvata omalla.**
- **OMA_VERSIO teknistaktinen EI tuoda arviointikehykseksi.** Eri asteikko (1–3 vs 1–5) + eri tarkoitus (curriculum ≠ ominaisuusprofiili). Sen paikka on toiminnan kerros (jaksofokus, toimintakortti) — ei ominaisuusarviointi.
- Molemmat ovat oletuksia rinnakkain: **arviointi = Palloliitto**, **valmennus/tekeminen = OMA_VERSIO**. Tämä toteuttaa Teron linjauksen: "Palloliiton malli = talenttivalmentajien arviointi; oma malli = johdonmukaiset harjoitteet ja kysymykset."

## 3. Silta (SUUNNITELTU, EI 4b) — arviointi → resepti -kytkentä
Kerrokset kohtaavat yhdessä pisteessä: kun VP/valmentaja **arvioi** pelaajan heikoksi jossain Palloliitto-pääteemassa (esim. D2 `dribbling`, `short_passing`, `finishing`), järjestelmä **ehdottaa vastaavan OMA_VERSIO-konseptin + cue + harjoite** jaksofokukseksi. Näin arviointi ruokkii curriculumia (suljettu ketju §29 arviointi→diagnoosi→resepti).
- **Toteutus:** mäppäystaulukko `PALLOLIITTO_PAATEEMA → OMA_VERSIO_KONSEPTI` (esim. `dribbling → Y-H*/T-*-kuljetuskonsepti`). Molemmat käyttävät jo samaa pelitilannepohjaista cue-pankkia (aliasointi-oivallus §34) → mäppäys on koodi-taso, ei uutta sisältöä.
- **Sijainti:** VP-arviointi-välisivun "heikoin havaittu" → toimintakortti-CTA (4a jaksofokus). Luonteva **4c/4d**-alue tai oma "silta"-työ. **EI rakenneta 4b:ssä.**
- Invariantit: §26 (pikakentät `arviointi_havaittu`/`tt_heikoin` → jo olemassa) · §7.22 (pelaajalle ei tasolukuja) · §34 (cue jaettu).

## 4. Yhteenveto (yhdellä lauseella)
Palloliitto-taksonomia **arvioi** (mitä osaa, 1–5), OMA_VERSIO curriculum **ohjaa tekemisen** (mitä harjoitellaan, konsepti→cue→harjoite); ne pysyvät erillisinä ja kohtaavat vain suunnitellussa **silta-kytkennässä** (arviointi → jaksofokus-ehdotus, myöhempi vaihe).
