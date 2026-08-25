# Code-brief — i18n VAIHE 4-A · Harjoitesisältö (harjoite-"miksi" + harjoitepankki) → sv

> **Konteksti:** Perhepinnan *kehys* on ruotsiksi (V1-A/A2 pelaaja, V1-B/B2 vanhempi, V0.5 suostumus, V0.6 rekisteröinti).
> Mutta pelaajan **päivittäinen TÄNÄÄN-sisältö on yhä suomeksi** — harjoitteen nimi, "Näin teet" -ohje, tarina,
> "🎯 miksi tämä" -lause. Live-tarkastuksessa EIF-perhe näkisi ruotsinkielisen kehyksen mutta suomenkielisen
> päivätehtävän. **Tehtävä: käännä `harjoitelogiikka_v4.js`:n generoitu harjoitesisältö → sv.** Tämä on suurin
> jäljellä oleva perheelle näkyvä aukko.
>
> **V4 jaettu kahtia — TÄMÄ = V4-A (harjoitesisältö, koodigeneroitu, ei AI).** V4-B (ADAR-narratiivi, aiProxy/LLM,
> `kieli`-param Cloud Functioniin) = **oma erillinen briiffi myöhemmin** — ÄLÄ koske aiProxyyn/ADAR-narratiiviin tässä.
>
> **Kieli:** **sv nyt** (EIF-tarve). **en samalla arkkitehtuurilla myöhemmin** — rakenna niin että en on triviaali lisäys (sama getter + content-map).

## Käännöslinjaus (sama kuin V1)
Kaikki sv-tekstit **tuotantoon**; ruotsiseurat auttavat hiomaan käytössä. Harjoitesisältö **ei ole lakitekstiä** →
ei juristiporttia. Tee paras jalkapallo-sv (oikeat lajitermit: syöttö→passning, pujottelu→driblingsbana, ponnauttelu→jonglering,
kuljetus→dribbling jne.), vie tuotantoon, iteroi palautteen mukaan. **Kaikki sv-sisältö yhdessä paikassa** (`harjoitelogiikka_v4.js`)
jotta korjaus = yhden tiedoston muutos.

## Laajuus — käännettävä sisältö `harjoitelogiikka_v4.js`:ssä (~480 merkkijonoa)
Koko generoitu, pelaajalle renderöityvä teksti:
- **HARJOITEPANKKI-harjoitteet:** `nimi` (~138) · `ohje_leikkija`/`ohje_rakentaja`/`ohje_showcase` (~186) · `cue` (~114) · `tarina` (~18) · `viikkotavoite` (~26).
- **`MIKSI_LAUSE2`-matriisi** (5 kohdetta × 3 ikävaihetta = 15 lausetta).
- **`generoiMiksiteksti`:n inline-lauseet:** l1 (lahde-haarat: tki/tsi/hh/oletus × ikävaihe) + l3 (leikkija/muu). ~8 lausetta.
- **`KOHDE_NIMET`** (pallonhallinta/koordinaatio/nopeus/syöttö/ponnauttelu — näkyvät miksi-lauseessa).

**EI tässä:** logiikka (kehityskohteen valinta, päiväindeksi, mesosykli), testinormit, KPI-luvut. Vain näkyvä teksti.

## Arkkitehtuuri — kielitietoinen getter + erillinen sv-content-kerros (ÄLÄ turmele fi-pankkia)
**Periaate:** fi-HARJOITEPANKKI säilyy rakenteen totuuslähteenä. Älä täytä sitä inline `_sv`-kentillä (~480 → lukukelvoton).
Sen sijaan:
1. **Erillinen sv-käännöskerros** avaimitettuna harjoitteeseen. Jos harjoitteilla ei ole vakaata `id`-kenttää,
   **lisää stabiili avain** (esim. `id`/`avain` per harjoite) TAI kartoita `nimi`-avaimella — **Code päättää siistimmän,
   ilmoita ENNEN jos vaatii rakennemuutoksen fi-pankkiin.** Rakenne esim.:
   ```
   var HARJOITE_SV = { '<avain>': { nimi, ohje_leikkija, ohje_rakentaja, ohje_showcase, cue, tarina, viikkotavoite }, ... };
   ```
2. **Kielitietoiset getterit** lukevat `tmNykyinenKieli()` (tm_lang.js jo ladattu Pelaajaan) → sv-override jos on, muuten fi:
   - **`_ohjeIkavaiheelle(h, iv)`** → palauttaa sv-ohjeen kun kieli sv (sama ikävaihe-fallback-logiikka, vain lähde vaihtuu).
   - **`valitsePaivanHarjoite`:n paluuarvo** (`nimi`/`cue`/`tarina`/`viikkotavoite`) → sv-arvot kun kieli sv.
   - **`generoiMiksiteksti`** → l1/l3 + `MIKSI_LAUSE2` + `KOHDE_NIMET` sv-variantit (lisää sv-rinnakkaismatriisit).
3. **Fallback sv→fi EHDOTON:** puuttuva sv-avain → fi näkyy, ei tyhjää, ei kaadu. Sama pattern kuin `t()`.
4. **`tmNykyinenKieli`-luku turvattava node-testeissä** (lib ladataan myös Vitestissä) — jos `tmNykyinenKieli` ei ole määritelty (node ilman tm_langia), oletus 'fi' (getterit eivät kaadu).

## Vartijat
- **§7.1 string-concat `+`** — EI nested template literaleja (Pelaaja_v7/lib-parseri). sv-sisältö saa sisältää normaalit lainausmerkit, ei riko templatea.
- **§7.22 EHDOTON sv-sisällössä:** harjoitesisältö on jo fi:ssä §7.22-turvallista (vahvuus/prosessi, ei uhkaa). **Ruotsi ei saa tuoda:**
  ei tasolukuja/percentiilejä, ei vertailua muihin ("bättre än"), ei uhka-/menetyskehystä ("du tappar/annars"), ei XP-kieltä.
  Tarinat (`tarina`) = motivoivia, autonomiaa tukevia (Deci & Ryan) — säilytä sävy sv:ssä.
- **fi ei rikkoudu:** fi-pankki + fi-output **muuttumattomat** (fallback). **Characterization-testit `tests/harjoitelogiikka.characterization.test.js` (21) PYSYVÄT vihreinä** — aja ne ennen ja jälkeen; jos fi-output muuttuu, olet rikkonut jotain.
- **Kanoninen root (§A7):** muokkaa VAIN `harjoitelogiikka_v4.js` (root). `src/lib/harjoitelogiikka_v4.js` on re-export — EI koske.
- **generoiMiksiteksti HEITTÄÄ ei-datalla (§25)** — Pelaaja kietoo try/catchiin; älä muuta heittokäyttäytymistä, vain lisää kielihaara.
- **Cache-bust:** nosta **`harjoitelogiikka_v4.js ?v=6 → ?v=7`** Pelaaja_v7:n script-tagissa (lib-sisältö muuttuu). **SW-bump `sw_pelaaja.js` CACHE-versio** (Pelaaja-HTML muuttuu ?v:n takia). tm_lang.js ei muutu tässä.
- **§5:** ei väri-/fonttimuutoksia (lib = logiikka+sisältö, ei UI-tyyliä).

## Tarkista myös (Pelaaja_v7-puoli, pieni)
- TÄNÄÄN-T-kortin saate "🎯 Tämä vie kohti tavoitettasi: **syöttö** alle 35.5 s" — kehys on Pelaaja_v7 (`_tekTavoiteSaate`, §16, oletettu jo V1-A:ssa sv), mutta **laji­nimi** ("syöttö") voi tulla data/lib-kohteesta. Varmista että lajinimi renderöityy sv kun kieli sv (KOHDE_NIMET sv riittänee). Jos saate-kehys on vielä fi, merkitse — se on pieni Pelaaja_v7-lisäys, ei tämän briiffin ydin.

## DoD
- Ruotsi-tilassa pelaajan **TÄNÄÄN-tehtävä täysin sv:** harjoitteen nimi, "Näin teet"-ohje, tarina, viikkotavoite, cue, "miksi"-lauseet (3), kohde-nimi — ei suomenkielisiä jäänteitä sv-tilassa.
- **fi-regressio ehjä** (characterization 21 vihreä, fi-output identtinen). Fallback sv→fi ei kaada puuttuvalla avaimella.
- §7.22 säilyy sv:ssä (ei tasolukuja/vertailua/uhkaa). §7.1 ehjä.
- Vitest vihreä (uudet sv-kattavuustestit: jokaiselle fi-harjoiteavaimelle sv-vastine TAI dokumentoitu fallback; MIKSI_LAUSE2/KOHDE_NIMET sv täydelliset). `harjoitelogiikka_v4.js ?v=7` + SW-cache bumpattu.

## Verifiointi (Claude L3)
Live headless, molemmat teemat, **fi + sv:** kirjaudu pelaajana (tai demo) → TÄNÄÄN-kortti — sv-tilassa **kaikki** teksti sv
(nimi + Näin teet + tarina + miksi + cue), fi-tilassa ennallaan; kielivaihto vaihtaa sisällön; fallback ei kaada; 0 tasolukua/XP/vertailua sv-sisällössä (§7.22-regex-skannaus). **Poikkeama = ilmoita ENNEN.**

## Seuraava (V4-B, oma briiffi)
ADAR-narratiivi sv: `aiProxy` (functions/index.js) saa `kieli`-parametrin → GPT-4o generoi ruotsiksi; kutsuja
(ADAR_Pikakortti `_pyydaAINarratiivi` / Master) välittää pelaajan/seuran kielen. Eri riski (backend + LLM + secret-deploy) → erillinen PR.
