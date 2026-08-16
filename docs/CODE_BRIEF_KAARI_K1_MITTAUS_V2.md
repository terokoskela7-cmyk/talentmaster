# Kehityskaari K1 (v2) — Mittaus: FLEI kaareen + alusta-per-piste §22-vartija · Code-brief

> **KORVAA aiemman K1-luonnoksen.** Recon (main, K5a:n jälkeen) paljasti että suuri osa alkuperäisestä K1:stä on JO toteutunut:
> `tmKaariRenderFull(p, ctx)` on jo Kehityskaaren string-renderöijä (fyysinen + tekninen sparkline-rivit `_testiRivi`), **TKI kaksi
> deltaa (§34) on jo** (divergenssi-selitys "ikävaatimus kovenee"), **jaksofokus-sidos on jo** (`tmKaariJaksoSidos`), ja **K5a ADAR-lohko
> on integroitu**. → **Älä teetä näitä uudelleen.**
> **Kaksi aitoa aukkoa jää:** (1) **FLEI** renderöi yhä **erillisenä orpo-sparklinena** (VP ~16369 `_fleiSpark`/`_tmSpark`), EI osana kaarta.
> (2) **Alusta-per-piste §22-vartija puuttuu** — alusta on vain pelaajatasolla (`p.hh_alusta`), ei historiapisteessä → nopeus/ketteryyskäyrä
> voi sekoittaa nurmi+halli (Teron vahvistama korjaus: kaikki pisteet tallennetaan, alusta merkitään pisteeseen, vaihto huomioidaan).
> **Malli (K5a-kuri):** string-helperit `tmKaariRenderFull`:n sisällä (kuten `tmKaariAdarBlokki`), **EI DOM-`tmKehityskaari(el)`:ää**
> (tmKaariRenderFull palauttaa stringin). Reuse yli reimplementoinnin.

## CODE-SÄÄNNÖT (protokolla)
- **Poikkeama = ilmoita ENNEN.** **Älä koske:** olemassa olevaan §34-kaksideltaan · jaksofokus-sidokseen · K5a ADAR-lohkoon · konsensuslaskentaan · fyysisten/teknisten `_testiRivi`-renderiin (paitsi alusta-merkki).
- **§22:** vertailu vain saman alustan sisällä. **§28:** pre-PHV suunta ei rankaisu (ennallaan). **§7.22:** pelaajapinta ennallaan (K4 hoitaa variantin).

## MUUTOS 1 — FLEI kaareen (poista orpo-sparkline)
`tmKaariRenderFull` lukee nyt vain `hh_historia`/`tki_historia`. Lisää **FLEI-lohko** `flei_historia`:sta (kenttä `.flei`, suurempi parempi):
- Uusi string-helper (esim. `tmKaariFleiBlokki(fleiHistoria, ctx)`) samaan tyyliin kuin muut rivit → sarja + suunta (`tmKaariSuunta`/`tmKaariNopeus`, reuse) + datataso-vartija (≥2).
- Sijoita "Kehon valmius · FLEI" fyysisten yhteyteen (ennen koostetta). Otsikko **"Kehon valmius"** (ei FLEI-jargonia pelaajapinnassa; VP saa nähdä).
- **Poista päällekkäisyys:** kun FLEI on kaaressa, Mittauksen erillinen `_fleiSpark`-kortti (~16369) joko poistetaan tai jätetään vain nykyarvoksi (ei tuplakäyrää). **Ilmoita ENNEN kumpi** (suositus: erillinen kortti näyttää nykyarvon + linkin kaareen, ei omaa trendiä).

## MUUTOS 2 — alusta-per-piste §22-vartija (Teron vahvistama)
**2a. Kaappaus:** `tmHhSnapshot` (lib/tm_historia.js) kopioi **`alusta`** snapshotiin (nopeus/ketteryystestien pisteille). Vanha data ilman alustaa → `null` (taaksepäinyhteensopiva: null = "ei tietoa" = nykytila).
**2b. Käyrä huomioi vaihdon:** nopeus/ketteryyssarjoissa (`lin5m/lin10m/lin30m/kasirata/sm_juoksu/sm_pallo`) — kun peräkkäisten pisteiden `alusta` eroaa:
- **Älä poista pistettä** (kaikki tallennetaan, kuten Tero sanoi) → **merkitse vaihto** hienovaraisesti (esim. katkoviiva-segmentti tai pieni mono-merkki "· alusta vaihtui" pisteessä, ink3, ei väriä).
- Suunta/delta lasketaan **vain saman alustan pisteistä** (vertailukelpoinen segmentti) TAI näytä varoitusteksti kun sekoittunut. **Ilmoita ENNEN** kumpi (suositus: laske delta viimeisestä saman-alustan-parista; sekaraita → "▲ eri alustoja, vertailu vain saman sisällä §22").
**2c. Normalisointi-koukku:** jätä selkeä paikka (kommentti + funktio-stub esim. `_alustaNormi(arvo, alustaFrom, alustaTo)` joka nyt palauttaa arvon sellaisenaan) — Tero selvittää yleisen muuntokaavan myöhemmin; kun se tulee, vain stub täytetään. **EI keksitä kerrointa nyt.**

## INVARIANTIT + DoD
- **FLEI on osa kaarta** (ei orpo-sparkline); ei tuplakäyrää. Reuse `tmKaariSuunta`/`Nopeus`. Datataso ≥2.
- **§22 aito:** alusta pisteessä; nopeus/ketteryys-delta vain saman alustan sisällä; vaihto merkitään, **pisteitä ei poisteta**; normalisointi-stub paikallaan (ei kovakoodattua kerrointa).
- **Ei regressiota:** §34-kaksidelta · jaksofokus-sidos · K5a ADAR · fyysiset/tekniset rivit · §28 ennallaan. Molemmat teemat. **0 pinkkiä.**
- **Taaksepäinyhteensopiva:** vanha `hh_historia` ilman `alusta`-kenttää → null → "kaikki samalla viivalla" (nykykäytös, ei kaadu). FLEI-dokit ilman dataa → honest-empty.
- **LIVE ennen valmista (molemmat teemat):**
  - Pelaaja jolla ≥2 FLEI-pistettä → "Kehon valmius" -käyrä kaaressa (ei erillistä tuplaa).
  - Nopeussarja jossa alusta vaihtuu (nurmi→halli) → vaihto merkitty, delta vain saman alustan sisältä, ei kaadu; kaikki pisteet näkyvissä.
  - Vanha data ilman alustaa → nykykäytös (ei muutu). Vitest + eslint vihreä. Ei `?v` (VP); jos tm_historia.js muuttuu → tarkista lataajat.

## EI TÄSSÄ (omat briffit)
- **K2 Katselmus** — jaksofokus-sidos on jo `tmKaariRenderFull`:ssa; K2 tuo sen sulku-modaaliin (erillinen).
- **K3 Aloitus-siru + Kehitys-evidenssi + nimikorjaus** (TASO 3 "Kehityskaari" → "Jaksohistoria").
- **K4 Pelaaja §7.22 -variantti** (tmKaariRenderPelaaja; K5a jo lisäsi ADAR-pelaajahaaran).
- Alustan **normalisointikaava** (kun Tero toimittaa) — täyttää `_alustaNormi`-stubin.
