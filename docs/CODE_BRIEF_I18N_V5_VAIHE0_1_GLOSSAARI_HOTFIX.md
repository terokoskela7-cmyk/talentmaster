# Code-brief — i18n VAIHE 0.1 (glossaari-hotfix): roolinimi-kanoni + Längdspark-jäänne + drift-testin laajennus

> **Konteksti:** Vaihe 0 (jaettu `tm_i18n_common.js` + dedupe) on mainissa ja verifioitu. Verifioinnissa jäi **kaksi
> pientä glossaari-asiaa** jotka pitää sulkea ENNEN Raita B:tä (Valmentaja), jotta common on puhdas SSOT kun Master
> wirataan sen päälle. Pieni, tarkka, matalariskinen PR.

## 1) Roolinimi-kanoni: Valmennuspäällikkö → **Utvecklingsansvarig** (Teron päätös)
Nyt VP-sivukartassa on `'Valmennuspäällikkö': 'Träningsansvarig'` (rivi ~81), mutta kanoni on **Utvecklingsansvarig**
(Kimin Seura-kartta + seed käyttävät tätä; VP:n "Träningsansvarig" on kapeampi ja jäisi driftiksi Master/Seura-wirauksessa).

- **`lib/tm_i18n_common.js`** — lisää rooleihin (sv): `'Valmennuspäällikkö': 'Utvecklingsansvarig'`.
  (en: `'Valmennuspäällikkö': 'Development Lead'` — additiivinen; puuttuva → fi.) Jos VP:ssä esiintyy myös
  `'Valmennuspäällikkö (VP)'`-muoto, lisää common-pariksi `'Valmennuspäällikkö (VP)': 'Utvecklingsansvarig (VP)'`.
- **`lib/tm_vp_i18n.js`** — **poista** `'Valmennuspäällikkö': 'Träningsansvarig'` (sv) [ja mahdollinen en-vastine] →
  resolvoituu nyt commonista (dedupe-invariantti VP∩common=∅ säilyy). Näkyvä arvo VP:ssä muuttuu
  Träningsansvarig → **Utvecklingsansvarig** (tarkoitettu muutos).

## 2) Lajitermi-jäänne (VP rivi ~954): Långspark → **Längdspark**
`'Pituuspotku (bonus)': 'Långspark (bonus)'` → **`'Pituuspotku (bonus)': 'Längdspark (bonus)'`** (ä, ei å).
Perusavain `'Pituuspotku': 'Längdspark'` on jo oikein commonissa; tämä "(bonus)"-variantti jäi Vaihe 0:ssa korjaamatta.
Tarkista samalla ettei muita `Långspark`/`Framdrift-skott`/`Dribbling`(arvona)/`Utkast`(Ponnauttelun käännöksenä) -jäänteitä ole
sivukartassa (aktiivisina arvoina — kommentit ja `Utkast`=Luonnos ovat OK).

## 3) Drift-vartija-testin laajennus (`tests/i18n_common.test.js`, C3)
Nykyinen C3 kattaa vain kroppens-perheen → Långspark-jäänne pääsi läpi. **Laajenna kielletyt variantit** koskemaan
myös lajitermejä ja roolikanonia. Skannaa `lib/tm_i18n_common.js` + `lib/tm_vp_i18n.js` (+ tulevat `*_i18n.js`)
**aktiivisista arvoista** (`: 'sv'` -puoli, ei kommentit) → 0 osumaa seuraaviin **arvoina**:
- Glossaari: `Kroppens beredskap` · `Kroppsberedskap` · `kroppens beredskap`
- Lajit: `Långspark` (kanoni Längdspark) · `Framdrift-skott` (kanoni Föring och skott) · `Dribbling` (kanoni Slalom, kun **arvo** eikä kommentti) · `Utkast` **vain** kun se on `Ponnauttelu`-avaimen arvo (Luonnos→Utkast on sallittu)
- Roolit: `Träningsansvarig` (kanoni Utvecklingsansvarig)

> Toteuta niin että tarkistetaan **arvopuoli** (regex `:\s*'[^']*<kielletty>'` tai parsittu objekti), ei kommenttirivejä
> — muuten common rivin 25 kommentti "EI Dribbling" laukaisisi väärän failin. Lisää myös C2-glossaari-konformiin
> assertio: `TM_I18N_COMMON.sv['Valmennuspäällikkö'] === 'Utvecklingsansvarig'`.

## Cache-bust (§27.4)
- `tm_i18n_common.js` sisältö muuttuu → **`?v=1 → ?v=2`** VP-HTML:ssä.
- `tm_vp_i18n.js` sisältö muuttuu (poisto + Längdspark) → **`?v=6 → ?v=7`**.
- Muut sivut eivät vielä lataa commonia → ei muutosta niihin. version.json auto-bump mainissa.

## Vartijat / DoD
- Dedupe-invariantti säilyy: **VP ∩ common = ∅** (sv+en) — testi C1 vihreä.
- fi-regressio ehjä; ainoat näkyvät sv-muutokset: VP:n roolinimi (Utvecklingsansvarig) + Pituuspotku-bonus-labeli (Längdspark).
- Vitest: C1–C4 + laajennettu C3 + uusi roolikanoni-assertio vihreät. `npm run lint` EXIT 0. `npm test` regressioton.

## Verifiointi (Claude)
1. Grep `Långspark|Framdrift-skott|Träningsansvarig` **arvoina** koko `lib/*_i18n*.js` + VP-HTML → 0.
2. Resolvi-todiste: `vpT('Valmennuspäällikkö')` sv → `Utvecklingsansvarig`; `vpT('Pituuspotku (bonus)')` sv → `Längdspark (bonus)`.
3. Dedupe: VP∩common=∅ ennallaan. L2 lint + npm test.

## Seuraava
Tämän jälkeen common on puhdas kanoni → **Raita B (Valmentaja/Master_v16 wiraus)** avautuu commonin päälle, ja VP jatkaa V2:ta.
