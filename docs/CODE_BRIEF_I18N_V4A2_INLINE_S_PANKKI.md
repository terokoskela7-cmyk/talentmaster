# Code-brief — i18n VAIHE 4-A2 · Pelaaja_v7:n inline S-pankki + kohdennettu kehitys -kortti → sv

> **Konteksti (V4-A jatko):** V4-A käänsi T-harjoitteen + miksi (`valitsePaivanHarjoite`/`generoiMiksiteksti`,
> harjoitelogiikka_v4.js) → sv. Live-verifioinnissa löytyi **aukko:** pelaajan kotinäytön **S-kortti
> ("KOHDENNETTU KEHITYS", heikoin FLEI-ketju)** hakee sisältönsä **erillisestä, Pelaaja_v7:ään kovakoodatusta
> `HARJOITEPANKKI v5` -pankista** (`_luoOhjelma`), EI harjoitelogiikasta — joten se jää suomeksi sv-tilassa.
> Ruotsalainen pelaaja näkee T-kortin ruotsiksi mutta S-kortin (nimi/kuvaus/perustelu) suomeksi.
> **Tehtävä: käännä S-kortin (ja D-kortti-fallbackin) reachable-sisältö → sv, samalla HARJOITE_I18N-getterillä jonka V4-A rakensi.**

## Reachable-joukko (pelaajalle näkyvä, käännettävä)
1. **Inline `HARJOITEPANKKI v5`** Pelaaja_v7:ssä (~rivit 5040–5115): FLEI-ketjujen harjoitteet, kukin `{nimi, kuvaus, kesto, taso, tyyppi}` (~40 kpl). Käännä `nimi` + `kuvaus`. (kesto/taso/tyyppi = ei käännöstä.)
2. **Lämmittelyt** `_luoOhjelma`:ssa (~5154–5156): `leikkija`/`rakentaja`/`showcase` → `{nimi, kuvaus}`.
3. **Perustelulauseet:** `getSHarjoiteWhy(flei, stage)` → `{ketju, lause}` (S-kortin `sw.lause`) + `getWhyLause(ketju, tyyppi, stage)` (D-kortin `dWhy`). Käännä kaikki niiden fi-lauseet.
4. **Kortin kehys:** "Kohdennettu kehitys" -otsikko (rivi ~937) + D-kortin (`_dKortti`) otsikko/kehys. `sw.ketju` (esim. "LL") on ketjukoodi — EI käännöstä (tai käytä KETJUT-lyhyt-nimeä jos halutaan; ei pakollinen).

**Valmis sv-käännöskartta toimitettu** (`CODE_BRIEF_I18N_V4A2_SV_REFERENSSI.js`, `var HARJOITE_I18N_SV = { '<fi>': '<sv>', ... }`) — käytä sitä sisältönä, ei tarvitse kääntää itse. **206 uniikkia fi→sv-paria**, node-validoitu (syntaksi OK, 0 tyhjää, 0 identtistä fi=sv). Kattavuus verifioitu lähdekoodia vasten: **65 inline-harjoitetta** (nimi+kuvaus) + **3 lämmittelyä** + lämmittelyn D-why + **45 WHY_LAUSEET** (`getWhyLause`/`getSHarjoiteWhy`) + **21 `getTHarjoiteWhy`** + UI-otsikot ("Kohdennettu kehitys"→"Riktad utveckling", "Näin teet"→"Så här gör du", "Harjoite päivittyy"→"Övningen uppdateras") = 0 puuttuvaa reachable-pinnalla. §7.22-skannaus sv-arvoista: 0 tasolukua/vertailua/uhkaa.

## Arkkitehtuuri — laajenna V4-A:n HARJOITE_I18N-getteriä (ei uutta järjestelmää)
V4-A rakensi `HARJOITE_I18N`-kartan (fi-merkkijono → sv) + kielitietoisen getterin `harjoitelogiikka_v4.js`:ään
(`tmNykyinenKieli()` → sv-override → fi-fallback). Se on globaali (Pelaaja lataa harjoitelogiikan). **Uudelleenkäytä sitä:**
1. **Laajenna `HARJOITE_I18N`** näillä uusilla fi→sv-pareilla (inline-pankki + lämmittelyt + why-lauseet). Yksi kartta, yksi getter.
2. **Kytke Pelaaja_v7:n S-kortti + D-kortti + `_luoOhjelma`-output kääntymään getterillä:** kun `sHarjoite.nimi`/`.kuvaus`,
   `sw.lause`, `dWhy`, lämmittely-nimi/kuvaus renderöidään, käänny globaalilla getterillä (esim. `window.tmHarjoiteKaanna(fiStr)`
   tai vastaava jonka V4-A altisti). Jos V4-A:n getter ei ole vielä globaalisti kutsuttavissa Pelaajasta mielivaltaiselle
   merkkijonolle, **altista pieni `tmHarjoiteKaanna(s)`-apuri** (lukee HARJOITE_I18N + tmNykyinenKieli, fi-fallback).
3. **"Kohdennettu kehitys" -otsikko + D-kortti-kehys:** UI-tekstiä → **`tm_lang.js`** (`t('pelaaja.kohdennettu_kehitys')` tms.),
   TAI HARJOITE_I18N jos halutaan pitää kaikki yhdessä. Code valitsee — pieni harkinta, ilmoita jos epäselvä.
4. **Fallback sv→fi EHDOTON:** puuttuva sv → fi näkyy, ei tyhjää. Suomi ei rikkoudu.

## Vartijat
- **§7.1 string-concat `+`** — S/D-kortti käyttää jo `+`-konkatenointia (rivit 934–946); säilytä. Ei nested template literaleja.
- **§7.22 EHDOTON:** inline-pankin sisältö on jo §7.22-turvallista fi:ssä; sv ei saa tuoda tasolukuja/vertailua/uhkaa. Why-lauseet motivoivia, ei menetyskehystä.
- **fi ei rikkoudu:** fi-pankki + fi-render ennallaan (fallback). Characterization-testit (21) + V4-A:n uudet testit pysyvät vihreinä.
- **Kanoninen root (§A7):** HARJOITE_I18N asuu `harjoitelogiikka_v4.js`:ssä (root). `src/lib`-versio re-export — EI koske.
- **Cache-bust:** `harjoitelogiikka_v4.js` muuttuu (HARJOITE_I18N kasvaa) → nosta **`?v=10 → ?v=11`** Pelaajassa. Pelaaja_v7 HTML muuttuu (render-kytkentä) → **SW-bump `sw_pelaaja.js` v16 → v17**. tm_lang.js jos koskettu → bumppaa senkin `?v`.
- **§5:** ei väri-/fonttimuutoksia.

## DoD
- Ruotsi-tilassa pelaajan kotinäytön **S-kortti täysin sv:** "KOHDENNETTU KEHITYS"-otsikko + harjoitteen nimi + kuvaus + perustelu (sw.lause) — ei suomenkielisiä jäänteitä. Sama D-kortti-fallbackille (nimi/kuvaus/dWhy) + lämmittelyt.
- fi-regressio ehjä (fallback sv→fi). §7.22 säilyy. §7.1 ehjä.
- Vitest + eslint vihreä (uudet inline-pankki/why fi/sv-kattavuustestit). `harjoitelogiikka_v4.js ?v=11` + SW v17.

## Verifiointi (Claude L3)
Live headless, molemmat teemat, fi + sv: kirjaudu pelaajana jolla on FLEI-data (S-kortti renderöityy) → **S-kortti täysin sv**
(otsikko + nimi + kuvaus + perustelu), fi-tilassa ennallaan; kielivaihto vaihtaa; fallback ei kaada; 0 tasolukua/vertailua sv-sisällössä.
Skannaus: ei jäljelle jäänyttä suomea reachable-S/D-pinnalla sv-tilassa. **Poikkeama = ilmoita ENNEN.**

## HUOM — reachable-rajaus (kuten V4-A)
Käännetään VAIN se mitä pelaaja oikeasti näkee (S/D-kortti + lämmittely + why). Inline-pankissa voi olla harjoitteita
joita nykyinen `_luoOhjelma`-valinta ei koskaan surfacea kaikille — käännä silti koko inline-pankki (se on pieni ja
valinta vaihtuu ketjun/stagen mukaan, joten kaikki ovat potentiaalisesti reachable). Jos löydät ETTÄ jokin osa on
selvästi dead (ei kutsupolkua), ilmoita äläkä käännä turhaan.
