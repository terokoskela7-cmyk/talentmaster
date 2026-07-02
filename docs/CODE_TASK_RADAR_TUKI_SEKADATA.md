# Code-tehtävä: Tekniikkaradar + Tuki katoavat kun joukkueella on harvaa H-H-dataa (VP_v25)

> Lähde: live-verify 2026-07-03 (Claude + Tero), Sibbo. Firestoresta luettu koko Sibbon pelaajakanta.
> Rajaus: **VP_v25 joukkuesyvänäkymä** (`avaaJoukkueSyvanakyma`) — Tilanne-välilehden **radar** (`_jsvRadarBlokki` → `tavoiteRadarAkselit` lib:ssä) + **Tuki**-välilehti (`_jsvTukiHTML`). §26 (pikakentät, ei alikokoelmakyselyjä). **EI arviointilogiikkaa** — puhtaasti radar-/ryhmittelyn valintalogiikka.
> **EI liity PR #66:een** (datan tuoreus) — erillinen, ennestään ollut esitysbugi jonka Sibbon T2014 H-H-tuonti paljasti.

## 1. Oire (käyttäjän raportoima)
Sibbon **kaikilla** joukkueilla on TKI-tulokset → tekniikkaradar (Ponn./Syöttö/Pujottelu/Kulj-lauk.) + Tuki-ryhmät näkyvät normaalisti. **Poikkeus:** joukkueet joilla on MYÖS H-H-testejä (T2014-tuonti) → radar katoaa ("Radar näkyy kun ≥3 testiakselia mitattu") ja Tuki-välilehti näyttää suuren "Ei tietoa (N)" -ryhmän. Eli **H-H-datan lisääminen rikkoi ennen toimineen tekniikkanäkymän.**

## 2. Vaikutusalue (live-data 2026-07-03, `seurat/sibbovargarna/pelaajat`)
12 joukkuetta, kaikilla TKI. **3 joukkuetta rikki** — täsmälleen ne joihin T2014 H-H-tuonti osui:

| Joukkue | n | H-H-pelaajia | TKI-pelaajia | H-H-akselit (todelliset arvot) | Radar-tyyppi | Radar toimii |
|---|---|---|---|---|---|---|
| P8/P9/P10/P11/P12/P13/T8/T9/T10 | — | 0 | kaikki | 0 | TK | ✅ |
| **T11** | 6 | 3 | 5 | 2 (lin10m, lin30m) | HH | ❌ |
| **T12** | 24 | 21 | 9 | 2 (lin10m, lin30m) | HH | ❌ |
| **T13** | 8 | **1** | 5 | 2 (lin10m, lin30m) | HH | ❌ |

**Huom T13:** yksi ainoa H-H-pelaaja (1/8) tappaa radarin koko joukkueelta.

## 3. Juurisyy (kaksi erillistä funktiota, sama periaatevirhe)

### 3.1 Radar — `tavoiteRadarAkselit(pelaajat)` (`lib/tm_eerikkila_normit.js`)
```js
var onHH = pelaajat.some(p => p.hh_viimeisin && Object.keys(p.hh_viimeisin).length);
var onTK = pelaajat.some(p => p.tk_lajit_viimeisin);
var tyyppi = onHH ? 'hh' : (onTK ? 'tk' : null);   // ← H-H VOITTAA AINA, jos yksikin pelaaja
var kand = (tyyppi === 'hh') ? _RADAR_HH_AKSELIT : _RADAR_TK_AKSELIT;
// ... laskee akselit joilla dataa ...
if (akselit.length < 3) return null;   // ← <3 → radar piiloon
```
- `onHH` on tosi jos **yksikin** pelaaja on H-H-testattu → tyyppi lukittuu `'hh'`:ksi.
- `_RADAR_HH_AKSELIT` = 10 fyysistä akselia (lin5m/lin10m/lin30m/sm_juoksu/sm_pallo/syotto/pujottelu/cmj/mas/kasirata).
- Sibbon T2014 H-H sisältää **todelliset arvot vain lin10m + lin30m** (cmj/mas-avaimet ovat mukana mutta **null**, kasirataa ei ole) → **2 akselia < 3** → `null` → radar piiloon.
- **Rikas TKI (4 TK-lajia) jää käyttämättä**, koska H-H-tyyppi on jo valittu — fallbackia TK:hon ei ole.

### 3.2 Tuki — `_jsvTukiHTML(pelaajat, ...)` (`TalentMaster_VP_v25.html` ~4187)
```js
const onTK = pelaajat.some(p => p.tki_viimeisin != null || p.tk_lajit_viimeisin);
pelaajat.forEach(p => { const k = onTK ? (p.tki_kehityskohde || '__ei') : null; if (k) (ryhmat[k]...).push(p); });
// '__ei' → otsikko 'Ei tietoa'
```
- Ryhmittely TKI-kehityskohteen mukaan. Pelaajat joilla ei TKI-kehityskohdetta → **"Ei tietoa"**.
- T12: 9 TKI → "Syöttö-ryhmä (9)", loput 15 → **"Ei tietoa (15)"** — vaikka 21/24 on H-H-data.
- Label harhaanjohtava: "Ei tietoa" tarkoittaa **"ei TKI-kehityskohdetta"**, ei "ei mitään dataa". Osittais-TK-joukkueella iso ämpäri näyttää rikkinäiseltä.

### 3.3 Tuontibugi — `kasirata` katoaa `hh_viimeisin`-pikakentästä (`Excel_Tuonti.html` ~2803)
```js
const lin30m = num('lin30m'), cmj = num('hyppy_cj'), mas = num('mas');
const lin10m = num('lin10m'), lin5m = num('lin5m');   // ← kasirata EI mukana
if (lin30m != null || cmj != null || mas != null) {
  hhViimeisin = { lin30m: lin30m, cmj: cmj, mas: mas };   // ← cmj/mas AINA mukana (null jos puuttuu)
  if (lin10m != null) hhViimeisin.lin10m = lin10m;
  // ← kasirata jää kirjoittamatta
}
```
- **`kasirata` (ketteryys, LL/D1) oli lähdedatassa** mutta rakentaja ei lue sitä → **ei tallennu `hh_viimeisin`:iin.**
- Todennettu live: T12 `hh_viimeisin` = { lin30m, **cmj:null, mas:null**, lin10m } — kirjoittaa null-avaimet cmj/mas (joita lähteessä EI ollut) mutta pudottaa **todellisen kasiratan**.
- **Raaka kasirata on tallessa** `testitulokset`-alikokoelmassa (esim. Moilanen `2024-01-30_hh_laaja` → `testit.kasirata = {paras:7.825}`) → **korjattavissa backfillillä, ei uudelleentuontia.**
- Seuraus: kasirata katoaa radarista (→ vain 2 akselia), `d1_taso`-laskennasta (`laskeD1Joustava` lukee `hh_viimeisin`), ennätyksistä (§36) — kaikkialta.

### 3.4 Yhteinen periaatevirhe
Radar/Tuki olettavat joukkueen olevan **joko** H-H- **tai** TK-joukkue. Sibbon T-joukkueet ovat **sekadataa**: rikas TKI kaikilla + harva H-H (vain 10m/30m tallentuneena — kasirata katosi tuonnissa) osalla. Harva H-H **ohittaa** rikkaan TK:n → tekniikkanäkymä rikkoutuu.

## 4. Korjaus

### Osa A — Radar: valitse RIKKAIN patteristo, ei "H-H aina jos edes yksi" (`lib/tm_eerikkila_normit.js`)
Muuta `tavoiteRadarAkselit` valitsemaan **eniten akseleita tuottava kelvollinen patteristo**:
- Laske akselit **molemmille** tyypeille (hh + tk).
- Valinta: **rikkain (eniten akseleita) joka yltää ≥3:een.** Tasapelissä 'hh' (fyysinen primaari).
  - SJK (HH 5+ akselia, TK 0) → **'hh'** (fyysinen radar, ennallaan).
  - Sibbo T-joukkueet (HH 2–3 akselia, TK 4 lajia) → **'tk'** (tekniikkaradar) → **tämä on käyttäjän vaatima "tekniikkakisaradar kaikilla Sibbon joukkueilla".**
- **Miksi rikkain eikä "HH ensin ≥3":** vaikka kasirata-backfill (Osa C) nostaa Sibbon H-H:n 3 akseliin, käyttäjä haluaa **tekniikkaradarin** (johdonmukaisuus koko seuran yli). TK 4 > HH 3 → TK voittaa. "HH ensin ≥3" antaisi Sibbolle fyysisen radarin = ei-toivottu.
- **Palautusrakenne ennallaan** (`{tyyppi, akselit}`) → `_jsvRadarBlokki` + `_jsvRadarTaso` osaavat jo molemmat tyypit. Dual-taso-toggle (ika/keh) lukkiutuu 'keh':lle automaattisesti kun TK (kehitysvaihe vain fyysisille akseleille → `_kehSaatavilla=false` → 🔒). Graceful.
- **Tuleva laajennus (ei nyt):** kun joukkueella on molemmat ≥3, HH/TK-toggle radariin (kuten ika/keh) → näkee sekä fyysisen että teknisen. Kirjaa TODOksi.

### Osa C — Tuontikorjaus: `kasirata` mukaan + backfill (`Excel_Tuonti.html`)
1. **Writer-korjaus** (`prosessoiExcel` ~2803): lisää `const kasirata = num('kasirata');`, laajenna luontiportti (`... || lin10m != null || kasirata != null`) ja `if (kasirata != null) hhViimeisin.kasirata = kasirata;`. **Bonus:** kirjoita cmj/mas ehdollisesti (kuten lin10m) → ei enää null-avaimia hh_viimeisin:iin.
2. **Backfill jo tuoduille** (3 T-joukkuetta): laajenna `recalcHHsplits` (lukee jo tuoreimman testituloksen lin10m/lin5m:n hh_viimeisin:iin) lisäämään myös **kasirata** `testitulokset.testit.kasirata.paras`:sta → sitten `recalcHH(seuraId,false,true)` päivittää `d1_taso` (kasirata mukana). Raaka on tallessa (todennettu) → ei uudelleentuontia.
3. Vaikutus: T-joukkueiden H-H saa 3. akselin (10m/30m/**kasirata**) → fyysinen radar olisi mahdollinen (mutta Osa A pitää näkyvänä tekniikkaradarin, TK 4 > HH 3). `d1_taso` tarkentuu (ketteryys mukana, §26/§30).

### Osa B — Tuki: relabel + älä swallowaa H-H-datallisia (`TalentMaster_VP_v25.html` `_jsvTukiHTML`)
- Nimeä `'__ei'`-ryhmän otsikko **"Ei tietoa" → "Ei TKI-tulosta"** (täsmällinen: kertoo ettei TK-kehityskohdetta, ei "ei dataa").
- **Suodata H-H-datalliset pois `'__ei'`-ämpäristä**, jos ne näkyvät jo VAIHE 2:n H-H-ryhmissä (`hh_kehityskohde` / "Odottaa kasvumittausta") → ei tuplanäyttöä. Jos pelaajalla ei TKI- eikä H-H-kehityskohdetta, hän kuuluu H-H-osion "Odottaa kasvumittausta"-ryhmään, ei TKI:n "Ei tietoa"-ryhmään.
- Lopputulos T12:lle: "Syöttö-ryhmä (9)" (TKI) + H-H-ryhmät / "Odottaa kasvumittausta" — ei enää harhaanjohtavaa "Ei tietoa (15)".

### Guardrailit
- **Arviointi ennallaan** — vain radar-tyypin valinta + ryhmittelyn label/suodatus. Ei kosketa `eerikkilaTaso`/`tkLajiViite`/`normiIka`.
- §26: lue pikakentistä (`hh_viimeisin`/`tk_lajit_viimeisin`/`tki_kehityskohde`/`hh_kehityskohde`), ei alikokoelmakyselyjä.
- §5: teal/amber, ei uutta punaista. VP-facing → §7.22 ei koske.
- `tavoiteRadarAkselit` on **jaettu lib-funktio** — varmista ettei muita kutsujia (grep: vain VP_v25 `_jsvRadarBlokki`). Muutos on additiivinen (aiemmin toiminut H-H≥3 pysyy 'hh':na).
- Ei versionbumppia (Pages-cache + `?cb`). Feature branch → PR.

## 5. Liittyvä (sama sekadata-teema, eri tehtävä)
Joukkuesyvänäkymän header **"Viimeisin testi"** (VP_v25 ~4842) ja pulssikortit (`_joukkuePvm`) käyttävät **MAX(hh_pvm, tki_pvm, flei_pvm)** → näyttävät tuoreen TKI-pvm:n (esim. 27.5.2026) vaikka H-H on vanha (T12: uusin H-H 3.10.2025). Rikkoo `CODE_TASK_DATA_TUOREUS.md` Osa 1:n ("käytä sen patteriston pvm:ää jonka tasoa kortti näyttää"). = **PR #66:n skooppiaukko**, korjataan omana osanaan (Osa A' per-patteristo-pvm + 📍 laukeaa H-H:n vanhuudesta). Mainittu tässä koska sama juuri: sekadata + patteristojen sekoittaminen.

## 6. Datalöydös — VAHVISTETTU tuontibugi (nostettu Osa C:ksi)
Aiempi epäily "lähteessä vain 10m/30m" osoittautui **tuontibugiksi**. Alkuperäinen tuontitiedosto `Sibbo_T2014_HISTORIA_hh_laaja_tuonti.xlsx` (52 riviä) tarkastettu:
- **Sarakkeet joissa dataa: `Lin10m` (51) · `Lin30m` (51) · `Kasirata` (51)** — mitattu patteristo = **10m + 30m + kasirata (3 testiä)**.
- Tiedostossa OLI myös sarakkeet Lin5m/CMJ/SJ/MAS/SM/pujottelu/syöttö → kaikki tyhjiä (ei mitattu).
- `hh_viimeisin`-writer tallensi `{lin10m, lin30m, cmj:null, mas:null}` — **kirjoitti null-avaimet mittaamattomille cmj/mas mutta pudotti todella mitatun kasiratan.**
- **Seuraus:** ilman kasirataa 2 akselia (radar gated). Kasiratan kanssa **3 akselia → radar olisi toiminut alusta asti.** Tuontibugi on radarin katoamisen varsinainen juurisyy; Osa A (UI) tekee siitä lisäksi *tekniikkaradarin* käyttäjän toiveen mukaan.
- Raaka kasirata tallessa `testitulokset`:issa → Osa C:n backfill palauttaa sen. Ei uudelleentuontia. Alkuperäinen tiedosto arkistoitu (uploads).

## 7. Testit / verifiointi
- **Vitest** (`tests/eerikkila_normit.test.js`): `tavoiteRadarAkselit`
  - H-H 5 akselia + TK 0 → 'hh' (SJK, ennallaan).
  - H-H 2 akselia + TK 4 → **'tk'** (Sibbo nyt). H-H 3 + TK 4 → **'tk'** (Sibbo kasirata-backfillin jälkeen — rikkain voittaa).
  - H-H 4 + TK 3 → 'hh' (rikkain). H-H 0 + TK 4 → 'tk'. H-H 2 + TK 0 → null. Tyhjä/null → null.
  - Regressio: yksi H-H-pelaaja + muut TKI (T13, HH=1) → 'tk'. **Olemassa olevat testit (H-H-only 1–2 akselia → null) pysyvät** (ei TK-dataa → edelleen null).
- **Vitest — Osa C writer** (jos testattavissa erillään): kasirata mukana `hhViimeisin`:issä kun `testitSkalaari.kasirata != null`; cmj/mas ei null-avaimina kun puuttuu.
- **Live-verify** (Sibbo, SA): (1) T11/T12/T13 Tilanne → **tekniikkaradar** (Ponn./Syöttö/Pujottelu/Kulj-lauk.); (2) Tuki → "Ei TKI-tulosta" + H-H-ryhmät (ei "Ei tietoa (N)"); (3) Osa C backfill+recalcHH → T12 `hh_viimeisin.kasirata` täyttyy, `d1_taso` päivittyy; P-joukkueet + SJK ennallaan.

## 8. Ei tähän
- Arviointilogiikan muutos.
- H-H-radarin akselijoukon supistaminen (2 akselia ei saa piirtää harhaanjohtavaa "radaria" — ≥3-portti säilyy; ratkaisu on **fallback TK:hon**, ei portin madaltaminen).
- Per-patteristo-pvm (Osa 5, PR #66:n aukko) — oma tehtävä, ristiviite §5.
