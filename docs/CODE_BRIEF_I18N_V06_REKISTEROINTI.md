# Code-brief — i18n VAIHE 0.6 · Rekisteröintilomakkeen kehys + vaihe-1

> **Konteksti:** V0.5 (#398) käänsi suostumuskortin (vaihe 2). Live-tarkastus paljasti että
> `TalentMaster_Rekisterointi_Suostumus.html`:n **koko muu lomake on yhä suomeksi ruotsi-tilassakin** — otsikko,
> vaihe-labelit, vaihe-1 (pelaajan tiedot + vammahistoria + biologisen iän arviointi), kortin otsikko "SUOSTUMUKSET"
> ja "Seuraava"-nappi. Ruotsinkielinen EIF-perhe näkee pitkän suomenkielisen lomakkeen ennen ruotsinkielistä
> suostumuskorttia. **Tehtävä: käännä loput lomakkeesta → sv/en**, jotta EIF saa yhtenäisen ruotsinkielisen rekisteröinnin.
>
> **Käännöslinjaus (sama kuin V1):** kaikki sv-tekstit tuotantoon; ruotsiseurat auttavat hiomaan. **Poikkeus:**
> "Miksi tätä kysytään?" -selitetekstit + vammahistoria/biologinen-ikä-kuvaukset koskettavat tietojenkäsittelyn
> perustelua → **Tero vilkaisee sv-sanamuodot** (kevyt, ei juristiporttia kuten V0.5-suostumus). Merkitse ne briiffiin.

## Laajuus — kaikki paitsi jo-käännetty suostumuskortti
V0.5 käänsi `suostumus.*`-avaimet (vaihe-2 kortti). Tämä kääntää **kaiken muun näkyvän** vaiheessa 1 + lomakkeen kehys.
**Avainkategoria:** `rekisterointi.*` (uusi) + uudelleenkäytä `yleiset.*` (esim. Takaisin/Seuraava jos jo olemassa) missä sopii.

### Irrotettavat pinnat → `t('rekisterointi.*')`
- **Kehys:** ala-otsikko "Rekisteröinti ja Tietosuojasuostumus"; vaihe-labelit "Perustiedot" · "Suostumus" · "Valmis"; suostumuskortin otsikko "SUOSTUMUKSET" (vaihe-2 kortin `🔒`-header).
- **PELAAJAN TIEDOT:** osion otsikko; kentät Etunimi/Sukunimi/Syntymäaika/Sukupuoli + **placeholderit** ("esim. Mikael/Korhonen", "pp.kk.vvvv"); "Sähköposti (yli 18v)" + placeholder + apuriteksti ("Raportit toimitetaan tähän — alle 18v käytetään huoltajan osoitetta"); **sukupuoli-dropdownin optiot** ("-- valitse --", "Poika / Mies", "Tyttö / Nainen", "Muu / En halua kertoa").
- **JOUKKUE:** osion otsikko; Joukkue/Seura/PalloID-labelit + placeholderit + "PalloID löytyy Palloliiton pelaajasivulta…" -apuriteksti.
- **VAMMAHISTORIA:** osion otsikko; **"Miksi tätä kysytään?"** + selITE ("Tieto auttaa varmistamaan että testit ovat turvallisia…") *(Tero-vilkaisu sv)*; textarea-placeholder; "Vapaaehtoinen".
- **BIOLOGISEN IÄN ARVIOINTI (VAPAAEHTOINEN):** osion otsikko; "Miksi tätä kysytään?" + selITE *(Tero-vilkaisu sv)*; "Isän pituus (cm)" / "Äidin pituus (cm)" + placeholderit; "Ei tiedossa" (×2 checkbox); "Pelaaja on adoptoitu tai biologisten vanhempien tietoja ei ole saatavilla".
- **Navigointi:** "Seuraava"-nappi (+ mahdollinen "Takaisin" muissa vaiheissa).
- **Vaihe 3 / onnistuminen:** jos jotain jäi V0.5:n ulkopuolelle (tarkista "Valmis"-vaiheen tekstit).

## Toteutus (sama kuvio kuin V0.5)
- **Lisää `rekisterointi.*`-avaimet `lib/tm_lang.js`:ään** (fi+sv+en). fi = normalisoitu (ä/ö). Uudelleenkäytä `yleiset.*`/`auth.*` missä sopii.
- **Kytkentä:** käytä samaa `data-i18n`-mekanismia + `_rekKaanna()` jonka V0.5 rakensi — laajenna se kattamaan vaihe-1:n elementit (lisää `data-i18n`-attribuutit). **Placeholderit:** koska `_rekKaanna` asettaa `textContent`in, placeholdereille tarvitaan oma käsittely (esim. `data-i18n-ph`-attribuutti → `el.placeholder = t(...)`). **Dropdown-optiot:** `<option>`-tekstit `data-i18n`:llä tai rakenna optiot `t()`:llä.
- **Kielivalitsin jo olemassa** (V0.5) — vaihtaa nyt myös nämä uudet tekstit kun `_rekKaanna` laajennettu.
- **Kertaa V0.5-kutsut:** `_rekKaanna()` kutsutaan latauksessa + kielivaihdossa + `tmKieliInitSeura`-jälkeen; varmista että se ajetaan myös vaiheenvaihdossa (step 1→2→3) jos vaihe-2/3 DOM rakennetaan dynaamisesti.

## Vartijat
- **§7.1** string-concat `+`, ei nested template literaleja.
- **Cache-bust:** nosta `lib/tm_lang.js ?v=2 → ?v=3` Rekisteröinnin script-tagissa (uudet avaimet). (Rekisteröinnillä ei omaa SW-cachea kuten Pelaaja/Vanhempi — ei SW-bumppia; jos Sentry-SW koskee, ei silti tarvetta.)
- **Logiikka koskematon:** `chkConsent`/`toStep1/2/3`/validointi/`vahvistaSuostumus`-kutsu ennallaan — vain näkyvä teksti + placeholderit + optiot `t()`:hen.
- **Suomi ehjä:** fallback sv→en→fi; fi-lomake toimii ennallaan.
- **§5:** 0 kiellettyä väriä, teal `#28B090`.

## DoD
- Ruotsi-tilassa **koko rekisteröintilomake sv** (otsikko + vaihe-labelit + vaihe-1 kaikki osiot + placeholderit + dropdown + "Seuraava" + "SUOSTUMUKSET"-kortin otsikko) — ei enää suomenkielisiä jäänteitä ruotsi-/englanti-tilassa.
- Kielivalitsin vaihtaa koko lomakkeen; huoltajan valinta säilyy; fi-regressio ehjä.
- Vitest (uudet `rekisterointi.*` fi/sv/en täydelliset, sv 0 puuttuvaa) + eslint vihreä. `?v=3`.

## Verifiointi (Claude L3)
Live headless + selain: rekisteröinti sv/en → **kaikki vaihe-1 + kehys kääntyy**, placeholderit + dropdown-optiot sv, "Seuraava" sv, suostumuskortti sv (V0.5 ennallaan), fi-regressio ehjä, 0 kiellettyä väriä. **Poikkeama = ilmoita ENNEN.**

## EI TÄSSÄ
- Suostumuskortin (`suostumus.*`) tekstit — jo V0.5:ssä.
- Tietosuojaselosteen (`showPrivacy()`-modaali) sisältö — oma taski jos tarvitaan (isompi lakiteksti).
