# Kehityskaari K4 — Pelaaja-kortti: §7.22 kannustava variantti (rooli='pelaaja') · Code-brief

> **Miksi:** Sama komponentti pelaajan/perheen kortissa **eri kielellä (§7.22):** vain **oma absoluuttinen parannus positiivisena** —
> EI ikänormin laskua, EI TKI-lukua, EI vertailua/rankingia, EI prosenttipisteitä. Design-kartan pelaaja-rivi: "−8 s parani 🚀".
> **Varmistettu:** `tmKehityskaari(el, data, { rooli:'pelaaja' })` **on jo toteutettu** — piirtää vain abs+ ("Oma parannus: +X — hyvää työtä!"),
> ei normia/ref-viivaa/tdd:tä. Pelaajassa on nyt vanha `tmKaariRenderPelaaja` + `idpPelaajaKaari` (Pelaaja_v7 ~2036) + TKI/MAS-trendi (~1761).
> **Tämä brief = migraatio KISS-komponenttiin (rooli='pelaaja') + yhtenäistys.** Pelaaja_v7 → **SW-cache-versio nostettava (§27)**. Ei `?v`.

## CODE-SÄÄNNÖT
- **Poikkeama = ilmoita ENNEN.** Reuse `tmKehityskaari` rooli='pelaaja'. **Älä koske:** pelaajan kirjaus/kalenteri/itsearvio-logiikkaan · moottoriin.
- **§7.22 (ehdoton):** pelaaja EI näe normia, tasolukua, vertailua, kuormaa/ACWR:ää. Vain oma abs+ tai neutraali "seuraava mittaus näyttää edistymän".
- **GDPR:** ei terveyssyytä. **Ikävaihe-rekisteri (§ ääni):** Rakentaja (U13–15) pehmeä "kehityskaista" · Showcase (U16–19) oma käyrä suoremmin.

## MUUTOS 1 — korvaa pelaajan kaari KISS-komponentilla (rooli='pelaaja')
`idpPelaajaKaari`/`tmKaariRenderPelaaja`-kohdassa (Pelaaja_v7 ~2036) → **`tmKehityskaari(el, data, { ominaisuus, rooli:'pelaaja' })`** per näytettävä ominaisuus.
- **data:** `historia:[{arvo,pvm}]`, `deltaAbs` = oma absoluuttinen parannus (positiivinen suunta), `yksikko`. **ÄLÄ syötä** `normiHistoria`/`normiTaso`/`deltaNormi` pelaajalle (komponentti ohittaa ne rooli='pelaaja':ssa, mutta älä silti lähetä normidataa pelaajan pintaan).
- Näytä **vain paranevat/positiiviset** (kuten `tmKaariRenderPelaaja` "parannukset"): TKI "−8 s parani 🚀", ei TKI-lukua eikä ikänormin laskua.
- **Ikävaihe:** valitse sanamuoto ikävaiheesta (Rakentaja/Showcase) — reuse olemassa oleva ääni-rekisteri jos on; muuten kannustava oletus.

## MUUTOS 2 — yhtenäistä olemassa oleva TKI/MAS-trendi (~1761) samaan komponenttiin
Nykyinen "Kokonaistuloksesi on parantunut X s 🚀" (~1761) + `mas_historia` (~1478) → **ohjaa saman `tmKehityskaari` rooli='pelaaja':n läpi**,
ettei pelaajassa ole kahta eri trendityyliä. (Jos yhdistäminen kasvaa isoksi → **ilmoita ENNEN**, tee vähintään uudet käyttöpaikat komponentilla.)

## MUUTOS 3 — SW-cache §27
Pelaaja_v7 HTML muuttuu → **nosta `sw_pelaaja.js` CACHE-versio** (nykyinen `tm-pelaaja-v10` → `v11`). `lib/tm_kehityskaari.js` on jo `?v=3` Pelaajassa —
jos komponenttiin tehtiin K1-lisäyksiä (esim. `opts.kompakti`), **nosta myös `?v`** Pelaajan puolella yhtenäisyyden vuoksi.

## INVARIANTIT + DoD
- **§7.22 tiukka:** pelaajan kaari = vain oma abs+; ei normia/tasolukua/vertailua/kuormaa. Verifioi rendattu HTML: **ei sisällä** "taso X/5", TKI-lukua, ref-viivaa, tdd-paneelia.
- **Reuse:** `tmKehityskaari` rooli='pelaaja'; ei uutta pelaajakohtaista sparklinea. Moottori koskematon.
- **Ikävaihe:** kannustava sävy; Rakentaja pehmeämpi. **GDPR:** ei terveyssyytä. **Brändi:** teal, 0 pinkkiä, molemmat teemat.
- **§27:** SW-versio nostettu → pelaajat saavat päivityksen.
- **LIVE:** avaa pelaajan kortti (synteettinen ≥3 pistettä) → kaari näyttää "+X parani", **ei** normia/tasolukua · 1-piste → "seuraava mittaus näyttää edistymän" · molemmat teemat · SW-versio nostettu. Vitest + eslint vihreä.

## EI TÄSSÄ
- ADAR-kaari (K5). Perheen erillisnäkymä (jos eri kuin pelaaja) — erikseen jos tarve.
