# Code-brief — 7.2b: Per-ohjelma-analytiikka (fysiikkaohjelmakirjasto)

> **Lähde:** `docs/CODE_TASK_VAIHE7_2_OHJELMAKIRJASTO.md` §4 + §8 (7.2b). Rakentaa 7.2a:n (PR #136: kirjasto + editori +
> `tm_ohjelma.js` + kevyt N-laskuri) päälle **per-ohjelma-analytiikan**: "mikä ohjelma toimii kenelle". Kohde: uusi
> **`lib/tm_ohjelma_analytiikka.js`** + näkymä Master_v16 (fysiikkavalmentaja) + VP_v25 (oversight). **Prosessirehellinen:**
> delta vain mitatuista (§29), aggregaatti on-demand (§26). **Ei AI:ta** (= 7.2c, portitettu erikseen). Ei sääntömuutosta
> (lukee olemassa olevia `jaksofokus_historia`-rivejä).

## 0. Mitä 7.2a jo toimitti (älä toista)
`lib/tm_ohjelma.js` (tmOhjelmaValidoi/Versioi/Templaatista), editori + kirjasto Masterissa, ohjelman liittäminen jaksoon,
kevyt **"ajettu N pelaajalla"** -laskuri. **7.2b rikastaa tämän N-laskurin täydeksi analytiikaksi.**

## 1. PURE-lib `lib/tm_ohjelma_analytiikka.js` (§4, dual-export, Vitest)
`tmOhjelmaKooste(ohjelma_id, pelaajaHistoriat)` → kooste-objekti:
```
{ n,                    // montako suljettua jaksoa tällä ohjelmalla (ohjelma.ohjelma_id === id)
  ka_delta,             // keskimääräinen delta — VAIN riveiltä joilla delta_mitattu != null (§29)
  toteuma_pct,          // toteuma-% (tehty/tavoite harjoitukset), ka
  tulosjakauma,         // { parani, ennallaan, vaihda }  (lkm)
  phv_erittely,         // per PHV-vaihe: { PRE:{n,ka_delta}, PH:{...}, POST:{...}, ... }
  mitattu_n, yhteensa_n // "N/M mitattu" -näyttöä varten (rehellisyys: kaikkia ei ole mitattu)
}
```
- **Lähde:** `jaksofokus_historia`-rivit (kaikilta seuran pelaajilta) joilla `ohjelma && ohjelma.ohjelma_id === id`.
- **§29 (prosessirehellisyys):** `ka_delta` lasketaan **vain** riveiltä joilla mitattu delta on olemassa; muut → `mitattu_n/yhteensa_n`
  = "N/M mitattu". Ei keksitä deltaa mittaamattomille.
- **0-pelaajaa-tapaus:** `n:0` → kooste palauttaa nollat/tyhjät siististi (ei kaadu).
- **PURE:** EI Firestore/DOM. Pelaajahistoriat injektoidaan (kutsuja lukee). Testattava stubeilla.
- **Additiivinen tulevaisuus (K5):** `kuorma_kooste` (GPS/Catapult) lisättävissä koosteeseen erikseen (dose ≠ response —
  kuorma täydentää toteumaa, ei korvaa deltaa). Ei nyt, mutta jätä rakenne laajennettavaksi.

## 2. Näkymä (Master_v16 fysiikkavalmentaja · VP_v25 oversight)
- **Kirjaston ohjelmakortti** → laajenna nykyinen "ajettu N pelaajalla" muotoon:
  "ajettu **N** pelaajalla · ka delta **X** · toteuma **Y %** · tulos: parani A / ennallaan B / vaihda C" + **PHV-erittely**
  (ikä/kasvuvaihe: mikä ohjelma toimii kenelle).
- **§26-vahti (kriittinen):** aggregaatti on **on-demand** — EI render-polulla. VP/fysiikkavalmentaja avaa koosteen erikseen
  (nappi "Näytä analytiikka"), joka lukee seuran pelaajat **kerran** ja ajaa `tmOhjelmaKooste`n. Ei per-kortti-kyselyä
  render-vaiheessa (muuten N korttia = N kyselyä).
- **Rehellisyysmerkki:** jos `mitattu_n < yhteensa_n`, näytä "N/M mitattu" — ei anneta ymmärtää että kaikki on mitattu.
- **Näkyvyys:** sama gate kuin 7.2a kirjasto/editori (seuralla fysiikkavalmentaja/fysioterapeutti-rooli tai konfiguraatio).

## 3. Rajaus (EI 7.2b:ssä)
- **7.2c (AI-ohjelma-analyysi)** — EI. Spec §8 portittaa sen: vaatii (a) 7.2b-datasetin + (b) fysiikkavalmentaja-pilotin.
  Rakennetaan vasta kun dataa on kertynyt. (Ei koneellista valmennusneuvoa tyhjään datasettiin.)
- Ei muutosta V7-jaksomoottoriin, ei datamalliin (lukee olemassa olevaa historiaa).
- Kuormaevidenssi (K5/GPS) → additiivinen myöhemmin.

## 4. Verifiointi + DoD
- **Vitest (`tm_ohjelma_analytiikka.js`):** kooste n/ka_delta/toteuma_pct oikein; **delta vain mitatuista (§29)**;
  0-pelaajaa-tapaus; phv_erittely oikein; mitattu_n/yhteensa_n "N/M mitattu".
- **Live (Master fysiikkavalmentaja + VP):** editori → tallenna kirjastoon → liitä pelaajalle jaksossa → sulje jakso →
  avaa ohjelmakortin analytiikka (on-demand) → N=1 (+ delta jos mitattu, muuten "0/1 mitattu") → PHV-erittely näkyy.
  Versioi ohjelma → vanha jakso pitää ajetun version (7.2a) → analytiikka ryhmittyy oikein ohjelma_id:llä.
- **GDPR:** analytiikka ei näytä diagnooseja (vain harjoitus/toteuma/delta). Kuntoutus-ohjelma ennallaan.
- `npm test` + lint + selain. **Rules: ei muutosta** (lukee jaksofokus_historia, jo sallittu; jos yllättäen estyy → raportoi).
- Branch `feat/vaihe7_2b-analytiikka`. **Merge vasta kun Tero sanoo "live".**
