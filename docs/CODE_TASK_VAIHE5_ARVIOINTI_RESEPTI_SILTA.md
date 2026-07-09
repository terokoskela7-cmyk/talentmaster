# Vaihe 5 — Arviointi → resepti -silta: heikoin havaittu → ehdotettu jaksofokus

> Sulkee ketjun **alkupäästä**: tähän asti jaksofokus (4a) on ollut käsivalinta. Silta tekee **arvioinnista fokuksen ehdottajan** — VP/valmentaja arvioi pelaajan Palloliitto-taksonomialla (1–5), ja järjestelmä ehdottaa **heikoimman havaitun ominaisuuden** perusteella vastaavan OMA_VERSIO-konseptin jaksofokukseksi (konsepti→cue→harjoite). Ihminen vahvistaa — ei automaattikirjoitusta. Kohde: **VP_v25** (+ Master 4a-source). §29 (suljettu silmukka) · `ARVIOINTIKEHYS_VS_CURRICULUM §3` · §4 · §26 · §28 · §7b. Visuaali: `docs/mockups/vaihe5_arviointi_silta_mockup.html`.

## 0. Periaate
Kaksi kehystä pidettiin erillään (arviointi = "mitä osaa", curriculum = "mitä harjoitellaan"). Ne kohtaavat **yhdessä pisteessä**: heikoin arvioitu D2/D4-ominaisuus → ehdotettu harjoiteltava konsepti. Tämä ei yhdistä kehyksiä (asteikot pysyvät erillään, §3-invariantti) — se vain **kääntää arviointituloksen reseptiksi**. Ehdotus, ei pakko: VP/valmentaja hyväksyy (§4 roolimalli). Ei koskaan auto-aseta jaksofokusta.

## 1. Mäppäys — Palloliitto-ominaisuus → OMA-konsepti(t) ( INTELLEKTUAALINEN YDIN, Teron vahvistettava)
Uusi PURE-lib `lib/tm_arviointi_silta.js`: `SILTA_MAP = { palloliitto_avain: [oma_konsepti_avain, ...] }`. **Vain D2 (teknis-taktinen) + D4 (peliäly→joukkuetaktinen) mäppäytyvät** — D1 (fyysinen), D3 (psyyke), D5 (sosiaalinen) EIVÄT tuota teknis-taktista konseptia (D1 → fyysinen treeniteema erikseen; jätetään sillan ulkopuolelle).

**Ehdotettu mäppäysluonnos (Teron domain-review vahvistaa/korjaa parit):**
| Palloliitto-ominaisuus (D2) | → OMA-konsepti (avain) |
|---|---|
| `dribbling` Kuljetus ahtaassa | `y_h4` (harhautus/1v1) + pelipaikkakuljetus |
| `running_with_ball` Kuljetus tilaan | `y_h3` (porttikuljetus/tilaan) |
| `ball_control` Pallonhallinta | `y_h1` (ensimmäinen kosketus) |
| `ball_protection` Pallon suojaus | `y_h5` (suojaus paineessa) |
| `short_passing` Lyhyt syöttö | `y_h2` (syöttö eteenpäin) |
| `link_up` Yhteispeli | `y_h6` (tukipeli/tarjoutuminen) |
| `finishing` Viimeistely | `y_h9` (viimeistely/laukaus) |
| `scanning`/havainnointi (jos taksonomiassa) | `y_h0` (havainnointi) |
| D4 `vision`/`decision_making` Peliäly | relevantti `TM_TT_JOUKKUE`-teema |

> Parit johdettu konseptien nimistä/pelitilanteista — **Tero (Palloliiton ohjelmajohtaja) validoi ennen lukitusta.** Puuttuvalle parille → ei ehdotusta (graceful, ei pakoteta). Sama pelitilannepohja kuin cue-pankissa (§34 aliasointi) → mäppäys on koodi, ei uutta sisältöä.

## 2. Silta-funktio (PURE, dual-export, Vitest)
`tmSiltaEhdota(arviointi_havaittu, ctx)` → `ctx = {vaihe, ika, positio, phv_tila}`:
1. Etsi **heikoimmat** arvioidut ominaisuudet (`arviointi_havaittu[avain]` pienin 1–5; ohita N/A).
2. Mäppää `SILTA_MAP`-kautta konsepti(e)ksi; suodata **vaihe-gatingilla** (`tmTtVaihe`/`tmTtItems` — youth vs pelipaikka; §28: pre-PHV suosii teknisiä konsepteja, D2 on juuri oikea ikkuna).
3. Palauta järjestetty lista `[{palloliitto_avain, palloliitto_nimi, arvo, konsepti_avain, konsepti_nimi, syy}]` (heikoin ensin, max ~3). `syy` = "Heikoin havaittu: Kuljetus (2/5)".
4. §28-vahti: älä ehdota D1-riippuvaista teemaa pre-PHV heikon fyysisen perusteella (silta koskee vain D2/D4 → yleensä turvallista).

## 3. Näkyvyys (kolme pistettä, kaikki pikakentistä §26)
- **VP arviointi-välisivu (ensisijainen):** pelaajan arvioinnin alle **"Ehdota jaksofokus"** — heikoin havaittu + ehdotettu konsepti (konsepti→cue→harjoite-esikatselu) → **[Aseta jaksofokukseksi]** avaa `_vpTtKorttiHTML` esivalittuna (`lahde:'arviointi'`).
- **4c oversight:** talentti/pelaaja **ilman jaksofokusta** mutta jolla on arviointi → rivin ehdotus "Ehdota: Kuljetus" (silta) → yksi klik.
- **4a toimintakortti (Master):** konseptin valinnan lähde-vihje "Arvioinnin heikoin: Kuljetus" (spec 4a §2 mainitsi `arviointi_havaittu`/`tt_heikoin` — kytke siltaan).

## 4. Roolit + invariantit
§4 (VP/valmentaja/talenttivalmentaja ehdottaa+asettaa; ehdotus ≠ pakko) · §26 (`arviointi_havaittu` pikakenttä, ei alikokoelmakyselyä) · §28 (kypsyysvahti; pre-PHV = tekninen ikkuna) · §7b (konsepti pelitilannelähtöinen) · §34 (sisältö libistä) · **`ARVIOINTIKEHYS_VS_CURRICULUM §3` — kehyksiä EI yhdistetä, asteikot erillään; silta vain kääntää tuloksen ehdotukseksi** · §7.22 ei koske (VP/valmentaja) · §5 · custom-dropdown jos valinta · ei version.json-bumppia · lib `?v`.

## 4b. Kriittinen review — tarkennukset (2026-07-05, ennen rakennusta)
Loogisuus- ja käytettävyystarkistuksen tulokset — nämä ovat osa toteutusta:
1. **Järjestys ≠ pelkkä numeerinen minimi.** `tmSiltaEhdota` järjestää heikoin ensin, mutta **tasapelissä (sama arvo) suosii perustaitoja** (pallonhallinta/kosketus ennen viimeistelyä — prioriteettijärjestys `SILTA_PRIORITEETTI`). Näytä **top-3**, valmentaja valitsee (ihmisen arvio voittaa numeron).
2. **D2 → yksilön jaksofokus · D4 → 4d joukkue-treeniteema (EI yksilöfokus).** Peliäly-heikkous ehdotetaan joukkuetaktisena teemana (4d), ei yksilön jaksofokuksena — tasot pysyvät erillään. (D4-haara voi olla vaihe 5.1 jos halutaan pilkkoa.)
3. **Ei arviointia → ei ehdotusta.** Silta laukeaa vain kun `arviointi_havaittu`-mapissa on ≥1 D2-avain. Muuten olemassa olevat 4a-lähteet (`tki_kehityskohde`) hoitavat — ei tyhjää "ei ehdotusta" -tilaa, vaan silta yksinkertaisesti ei näy.
4. **Mitattu vs havaittu.** Silta käyttää **havaittua** (`arviointi_havaittu`, valmentajan holistinen 1–5). Jos samalla ominaisuudella on ristiriitainen mitattu (TKI), näytä molemmat lukemat ehdotuksessa — älä hiljaa ohita (läpinäkyvyys).
5. **Passiivinen, ei nalkuta.** Ehdotus näkyy vain kun **jaksofokus puuttuu**; kun se on asetettu (mistä tahansa lähteestä), silta-ehdotus katoaa. Ei toistuvaa hälytystä samasta.
6. **Top-3 kaikki yhdellä klikillä asetettavia** (ei vain #1). Kukin rivi → `_vpTtKorttiHTML` esivalittuna / suora `[Aseta]`.
7. **Visuaalinen syy→seuraus-side:** ehdotus sijoitetaan/linkitetään heikoimpaan riviin (mockup: erillinen sarake + "▸ Heikoin havaittu"-ankkuri; harkitse suoraa sijoittamista heikoimman rivin alle mobiilissa).

## 5. Rajaus (EI Vaihe 5:ssä)
- **Auto-jaksofokus** (ilman ihmisen vahvistusta) — EI, aina ehdotus + hyväksyntä.
- **D1-fyysinen resepti** (heikko fyysinen → fyysinen treeniteema) — oma polku, ei tässä.
- **K5 kuorma/dropout** · **4b-family** · **K6 iCal** — erikseen.
- Mäppäyksen laajentaminen kv-kehyksiin (muu kuin Palloliitto) — myöhemmin (`ARVIOINTI_KEHYKSET`-rekisteri tukee jo monikehyksisyyttä).

## 6. Verifiointi
Vitest `tm_arviointi_silta.js`: heikoin-haku (1–5, N/A ohitus), mäppäys (tunnettu pari → konsepti; tuntematon → tyhjä graceful), vaihe-gating, max-3-järjestys. Live VP_v25: arvioi pelaaja heikoksi (esim. dribbling 2/5) → "Ehdota jaksofokus" näyttää Kuljetus-konseptin + cue → [Aseta] kirjoittaa `jaksofokus` (`lahde:'arviointi'`) → näkyy 4c-oversightissa + pelaajan 4b-kortissa. `npm test` + lint. Chrome-devtools. **Merge vasta kun Tero sanoo "live".**
