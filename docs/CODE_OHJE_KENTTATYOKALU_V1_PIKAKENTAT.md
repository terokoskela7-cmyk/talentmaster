# CODE — Kenttätyökalu Vaihe 1: Testaus_v9 kirjoittaa pikakentät + tasot valmiiksi-merkinnässä

**Tyyppi:** Datakirjoituksen korjaus (pikakentät §26) — **ei uutta laskentaa, ei skeemaa, ei Rules-muutosta.** **Pieni PR.**
**Kohde:** `TalentMaster_Testaus_v9.html` — `_v6MerkitseValmiiksi` (~2959) + `_v6TallennaHistoria` (~2932) + lib-lataus.
**Tausta-analyysi:** `docs/ANALYYSI_YHDEN_TESTITULOKSEN_KIRJAUS.md` (Aukko B).

## Ongelma (verifioitu)
Kun kentällä painetaan "Merkitse tapahtuma valmiiksi", `_v6MerkitseValmiiksi` kirjoittaa vain: testitapahtuman
`tila:'valmis'`, `ennatykset` (PB, `_v6TallennaEnnatykset`), `hh_historia`/`tki_historia` (aikasarja,
`_v6TallennaHistoria`) ja PHV (vain `kasvumittaus`-protokolla). **Se EI kirjoita** `hh_viimeisin`/`hh_pvm`/`hh_taso`/
`d1_taso`/`d2_taso`/`tki_viimeisin`/`tki_pvm`/`tki_merkki`/`tk_lajit_viimeisin`/`tk_kokonaistulos_viimeisin` — juuri
niitä pikakenttiä (§26) joita VP- ja valmentaja-dashboard lukee. **Seuraus:** kentällä kirjattu tulos **ei näy
mittaristossa** ennen erillistä `recalcHH`-ajoa. Tämä korjaa sen: tulokset näkyvät heti.

## Juurisyy koodissa
- Testaus_v9 **ei lataa** `lib/tm_eerikkila_normit.js`:ää → H-H-tasoja (`eerikkilaTaso`/`laskeD1Joustava`/`laskeD2HH`/
  `laskeHHTaso`/`normiIka`) ei ole saatavilla → tasot jäävät laskematta (koodikommentti riveillä 2930–2931
  toteaa tämän).
- TKI-laskenta **on jo inline** (`tkLaskeTKI` ~1194, `laskeKokonaistulos`, `tkLaskeMerkki`; käytössä kenttänäkymän
  reaaliaikaisessa TKI:ssä ~2141) → sitä voi käyttää suoraan.

## Työ

### 1.1 — Lataa Eerikkilä-lib Testaus_v9:ään
Lisää `<head>`-lohkoon (muiden lib-scriptien viereen, ~rivi 16):
```html
<script src="lib/tm_eerikkila_normit.js?v=1"></script>
```
→ tuo `normiIka`, `eerikkilaTaso`, `laskeD1Joustava`, `laskeD2HH`, `laskeHHTaso` (samat funktiot jotka Excel_Tuonti
+ VP + Master jo käyttävät). **Ei muuta laskentaa** — vain lataa olemassa oleva SSOT-lib.

### 1.2 — Kirjoita pikakentät valmiiksi-merkinnässä
Laajenna nykyistä per-pelaaja-silmukkaa (`_v6TallennaHistoria` lukee jo `_tulokset[pl.id]`:n, rakentaa `hv`/`tkLajit`
HH_MAP/TK_MAP:illa ja tekee `ref.get()`:n → `d`). Lisää **samaan silmukkaan** (tai uusi `_v6TallennaPikakentat()`
jonka `_v6MerkitseValmiiksi` kutsuu best-effort try/catchissa historian rinnalla) pikakenttien laskenta + kirjoitus.

**Kirjoita samat pikakentät jotka Excel_Tuonnin `prosessoiExcel`/`recalcHH` kirjoittaa** (§26 — täsmää olemassa
olevaan, älä keksi uusia):
- **H-H:** `hh_viimeisin` (**MERGE** uudet testiavaimet olemassa olevaan — 30 m -kirjaus ei saa pyyhkiä `cmj`:tä),
  `hh_pvm`, `hh_taso` (`laskeHHTaso` lin30m/cmj/mas), `d1_taso`/`d1_lahde`/`d1_kattavuus` (`laskeD1Joustava`),
  `d2_taso`/`d2_lahde`/`d2_kattavuus` (`laskeD2HH`/joustava, kun syöttö/pujottelu-H-H mukana).
- **TKI:** `tk_lajit_viimeisin` (§26-muoto) + `tk_lajit_pvm`, `tk_kokonaistulos_viimeisin`, `tki_viimeisin`/`tki_pvm`,
  `tki_merkki` (`tkLaskeMerkki` kokonaistuloksesta), `tki_vahvuus`/`tki_kehityskohde` (jos laskettavissa inline-funktioilla).
  TKI vain ika 8–13 (muuten null, kuten kanoni).
- **Ikä/sukupuoli:** `normiIka(d.syntymaVuosi, pvm)` + `d.sukupuoli` (lue `d`:stä jonka `ref.get()` jo hakee; sama
  IKAKONVENTIO §26 kuin Excel/recalc — EI Date.now()).
- **§26 PARI-INVARIANTTI:** jokainen `*_viimeisin` kirjoitetaan **yhdessä** oman `*_pvm`:n kanssa, tapahtuman
  `pvm`:stä (sama `pvm` kuin historia käyttää). Atomisesti samaan `.update()`-kutsuun.
- **Delta-vangitseminen (§29, valinnainen mutta suositeltu):** koska kenttäkirjaus = **aito uusi testi**, vangitse
  `hh_taso_edellinen`/`tki_edellinen` (+`_pvm`) **pvm-vahdilla** (`vanhaPvm !== uusiPvm`) kuten Excel-päätuonti — jotta
  kehitysvauhti (§29) syttyy. Jos tämä monimutkaistaa liikaa, se voi jäädä Vaihe 1b:hen — **merkitse selkeästi jos jätät pois.**

### 1.3 — Älä riko olemassa olevia kirjoituksia
`ennatykset` (`_v6TallennaEnnatykset`), `hh_historia`/`tki_historia` (`_v6TallennaHistoria`) ja PHV
(`_kasvuTallennaKaikkiPHV`) **säilyvät ennallaan** — pikakenttäkirjoitus tulee **niiden rinnalle**, best-effort
(try/catch, ei kaada valmiiksi-merkintää jos yksittäinen pelaaja epäonnistuu).

## Arkkitehtuurihuomio (yksi lähde)
Excel_Tuonti `prosessoiExcel`/`recalcHH` sisältää saman pikakenttälaskennan. **Vältä kolmatta divergoivaa kopiota.**
- **Suositus:** jos kohtuudella mahdollista, ekstraktoi jaettu apufunktio (esim. `lib/tm_pikakentat.js`
  `tmLaskePikakentat(pelaajaDoc, tulokset, pvm)`) jota **sekä Testaus_v9 että Excel_Tuonti** kutsuvat → yksi totuus.
- **Pragmaattinen fallback:** jos ekstraktio Excel_Tuonnin inline-logiikasta on liian iso tähän PR:ään, Testaus_v9 saa
  laskea pikakentät **kanonisilla leaf-funktioilla** (`laskeD1Joustava`/`laskeD2HH`/`laskeHHTaso`/`tkLaskeTKI`/
  `tkLaskeMerkki`/`laskeKokonaistulos`) inline, **selkeällä "PIDÄ SYNKASSA Excel_Tuonti/recalcHH:n kanssa" -kommentilla**
  (kuten TKI/ennätykset-inline-kopioissa jo on). Vaihe 3 konsolidoi.

## Reunaehdot
- **Ei uutta laskentaa, ei skeemaa, ei Rules-muutosta.** Kanoniset funktiot (`tm_eerikkila_normit.js` + inline-TKI).
- **§26 pari-invariantti** (arvo+pvm atomisesti); `hh_viimeisin` **merge**, ei ylikirjoitus.
- **§22 alustaherkkyys** ennallaan (tulokset tulevat jo kenttänäkymästä; ei muuteta syöttöä).
- **Offline:** valmiiksi-merkintä ajaa jo offline-synkan ensin (`_synkronoiOfflineData`) — pikakentät lasketaan
  synkatun datan päälle, ennallaan.
- **`?v=`-bump:** uusi `lib/tm_eerikkila_normit.js?v=1` Testaus_v9:ään (+ jos ekstraktoit `tm_pikakentat.js`, senkin).

## Definition of Done
- **L1:** Testaus_v9 lataa `tm_eerikkila_normit.js`:n; `_v6MerkitseValmiiksi` kirjoittaa per pelaaja täyden
  pikakenttäsetin (`hh_viimeisin` merge + `hh_pvm`/`hh_taso`/`d1_taso`/`d2_taso` + `tki_viimeisin`/`tki_pvm`/`tki_merkki`/
  `tk_lajit_viimeisin`/`tk_kokonaistulos_viimeisin`), §26 pari-invariantti; ennätykset/historia/PHV ennallaan; merge ei
  pyyhi muita testejä.
- **L2 (vitest):** jos jaettu `tmLaskePikakentat` ekstraktoidaan → testaa että se tuottaa samat pikakentät kuin
  Excel-referenssidata (H-H-taso, TKI/merkki, d1/d2), merge säilyttää olemassa olevat avaimet, TKI null kun ika<8/>13.
  Jos inline → lisää characterization-testi joka lukitsee yhden esimerkkipelaajan pikakenttätuloksen. ~893+ vihreä.
- **L3 (elävä):** luo Testaus_v9:ssä pieni tapahtuma (esim. 1 pelaaja, `lin_30m`), syötä arvo, "Merkitse valmiiksi"
  → **avaa VP_v25 / Master** samalla pelaajalla **ilman recalc-ajoa** → 30 m -tulos + H-H-taso näkyy mittaristossa
  (`hh_viimeisin`/`hh_taso` päivittyi). Aiemmin tämä vaati `recalcHH`:n — nyt ei. Molemmat teemat (näyttöpuoli).
- Pieni PR. **Verifioi että data näkyy VP:llä ilman recalcHH:ta** — se on tämän vaiheen koko pointti.

## Huom Codelle
- Tämä on **Vaihe 1** kolmiosaisesta suunnitelmasta (analyysidoc §4). **Vaihe 2** = kevyt "Pikakirjaus"-lomake
  (1–N pelaajaa, tapahtumaton `testitulokset`-polku) — **ei tässä PR:ssä.** Tämä vaihe korjaa vain olemassa olevan
  kenttätyökalun näkymättömyysongelman.
