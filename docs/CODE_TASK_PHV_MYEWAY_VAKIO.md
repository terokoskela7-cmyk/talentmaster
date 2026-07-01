# Code-tehtävä: PHV poikien vakio → MyE.Way-pariteetti (−9.236 → −9.3236)

> Laadittu 2026-07-01. Valmis brieffi Code-agentille. Kevyt, matala riski, mutta koskee **kolmea kopiota** — kaikki päivitettävä yhtenäisesti.
> Tausta: SJK-akatemiapilotin PHV-data ristiintarkistettu MyE.Way'tä (Palloliiton live-tuote) vastaan.

## Tausta / miksi
MyE.Way käyttää poikien Mirwald-kaavassa vakiota **−9.3236**, meillä on **−9.236** (julkaistu Mirwald 2002 -arvo). Ero = **0,088 v (~1 kk), vain pojilla.** Tyttöjen vakio (−9.376) on jo identtinen MyE.Way'n kanssa.

**Verifioitu kahdella riippumattomalla MyE.Way-referenssipisteellä** (istumapituus = mitattu − jakkara):
| Pelaaja | Sp | pituus | istumap | paino | ika | MyE.Way offset | MyE.Way PHV-ikä |
|---|---|---|---|---|---|---|---|
| Aamos Järvinen (P2012) | P | 146.1 | 73.4 | 36.2 | 13.94 | **−1.61** | 15.55 |
| Felissa Kalinko (T2015) | T | 142.8 | 73.0 | 32.8 | 10.55 | −1.45 (tytöt) | 12.0 |

Meidän koodi **−9.3236**:lla tuottaa Aamokselle offset −1.61 / PHV 15.55 (täsmää); **−9.236**:lla −1.53 / 15.47 (ei täsmää). Tyttö täsmää jo nyt.

**Päätös:** linjataan poikien vakio −9.3236:een → meidän PHV täsmää MyE.Way'hin bitilleen (SJK + Palloliiton ekosysteemi käyttää MyE.Way'tä; täsmäävät luvut = luottamus). Ero julkaistuun Mirwald-arvoon dokumentoidaan.

## Muutokset — poikien vakio −9.236 → −9.3236 KOLMESSA tiedostossa
⚠️ Kaava on kopioitu kolmeen paikkaan. **Päivitä kaikki**, muuten PHV eroaa koodipolun mukaan.

1. **`src/lib/tm_bioika.js:127`** — `offset = -9.236` → `offset = -9.3236` (kanoninen)
2. **`src/lib/tm_testipankki.js:1583`** — `offset = -9.236` → `offset = -9.3236`
3. **`src/lib/tm_ylaikaisyys.js:196`** — `return -9.236` → `return -9.3236`

**ÄLÄ muuta** tyttöjen vakiota (−9.376, rivit tm_bioika:134 / tm_testipankki:1590 / tm_ylaikaisyys:202) — jo oikein.

> Tekninen velka (kirjaa, älä korjaa nyt): sama Mirwald-kaava kolmena kopiona → tulisi single-source `tm_bioika.js`:ään ja muut re-exportiksi. Erillinen refaktorointi.

## Testit
- Aja `npm test`. Päivitä **poikien** PHV-odotusarvot jotka siirtyvät +0.088 (tyttöodotukset ennallaan).
- **Lisää regressiotesti** (lukitsee MyE.Way-pariteetin) `tests/`-kansioon, esim. `tests/bioika_myeway.test.js`:
  ```js
  // Pojat, −9.3236 → MyE.Way-pariteetti
  expect(laskeMirwald({ika:13.94,pituus:146.1,paino:36.2,istumapituus:73.4,sukupuoli:'P'}).maturity_offset)
    .toBeCloseTo(-1.61, 2);   // MyE.Way: Aamos Järvinen P2012
  // Tytöt, −9.376 (jo oikein)
  expect(laskeMirwald({ika:10.55,pituus:142.8,paino:32.8,istumapituus:73.0,sukupuoli:'T'}).maturity_offset)
    .toBeCloseTo(-1.45, 2);   // MyE.Way: Felissa Kalinko T2015
  ```

## Dokumentaatio
- **`src/lib/tm_bioika.js` rivi ~108** — kommentti "Kaava on identtinen BioIkä-Excelin sarakkeen P kanssa" tarkennettava: poikien vakio linjattu **MyE.Way'hin (−9.3236)** 2026-07-01; eroaa julkaistusta Mirwald 2002 -arvosta (−9.236) 0.088 v; tytöt ennallaan.
- **`CLAUDE.md` §25** — lisää rivi: *"Poikien Mirwald-vakio −9.3236 (MyE.Way-pariteetti, 2026-07-01, verifioitu 2 referenssipisteellä); tytöt −9.376. Kolme kopiota: tm_bioika/tm_testipankki/tm_ylaikaisyys — päivitettävä yhdessä."*

## Verifiointi ennen commitointia
1. `npm test` vihreä (ml. uusi regressiotesti).
2. Grep-tarkistus: `grep -rn "9\.236" src/` palauttaa **vain** girls-vakiot (−9.376), ei enää −9.236.
3. Node-sanity: `laskeMirwald({ika:13.94,pituus:146.1,paino:36.2,istumapituus:73.4,sukupuoli:'P'})` → offset ≈ −1.61.

## Guardrails
- Vain poikien vakio; tytöt ei kosketa.
- Kaikki 3 kopiota samaan arvoon.
- Ei muita bio-logiikan muutoksia (istumapituus, ikä, PHV-tilakoodit ennallaan).
- Feature branch → PR → merge (tavallinen docs/koodi-PR, ei versionbumppia).
