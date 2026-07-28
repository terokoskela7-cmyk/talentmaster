# CODE_OHJE — Selkeys 1/3: desimaalit + §28 kasvumittaus-ohjaus

**Tyyppi:** näyttökorjaus · **Kohteet:** `TalentMaster_VP_v25.html`, `lib/tm_eerikkila_normit.js`
(`renderKehityskorttiHTML`, kutsuu VP + Master). **Base:** `main`. **Pieni PR.**
**Design-referenssi:** artefakti `tm-pelaajakortti-selkeys` (osa 00–01).
**Riippumaton** briiffeistä 2 ja 3 — tämä voidaan tehdä ja verifioida ensin.

## Periaate (Teron päätös)
Pelaaja tarvitsee kehityskohteet **vaikka kasvumittausta ei ole tehty**. §28 ei hoideta *piilottamalla*
lukua, vaan **näyttämällä taso + kehityskohde aina ja ohjaamalla kasvumittaukseen** (adoptio: VP/valmentaja
oppii tekemään mittauksen). Kaikki luvut max 2 desimaalia.

## Työ

### 1.1 — Desimaalit: max 2, kaikkialla
Juuri-offender: **`_vpStatTiivisteHTML`** (VP ~4991, "Erottava ase" -laatikon 30 m/CMJ/MAS-tiivistys):
```js
else h += '... margin-top:2px">' + esc(c.arvo) + '<span ...> ' + esc(c.yks) + '</span></div>'
```
`esc(c.arvo)` näyttää raaka-arvon (4.937 → 3 desimaalia). **Käytä `_fmtTestiArvo(c.arvo, c.yks)`** (lib,
's'→2 des, 'cm'/'km/h'→1 des) sen sijaan — sama muotoilija jota Mittaus-taulu jo käyttää.
- **Sweep:** etsi muut kohdat joissa raaka testiarvo (`hv.*`, `c.arvo`, `p.*_viimeisin`) konkatenoidaan
  näyttöön **ilman** `_fmtTestiArvo`:a → ohjaa muotoilijan läpi. Ei muuteta laskentaa, vain näyttö.

### 1.2 — Kasvumittaus-ohjaus (§28, kehityskortti + Mittaus)
Kun pelaajalta **puuttuu kasvumittaus/PHV** (`phv_tila == null`), lisää **näkyvä, toiminnallinen ohjaus**
fyysisen osion yläosaan (sekä `renderKehityskorttiHTML` että VP Mittaus-välilehti). Käytä olemassa olevaa
"Kasvumittaus puuttuu" -sanomaa (VP ~7469, amber) + Testaus-linkkiä:
> ⚠️ **Kasvumittaus puuttuu** — fyysiset arviot perustuvat ikäoletukseen. Tee kasvumittaus
> (Testaus, ~3 min/pelaaja) → kehityskohteet tarkentuvat ja PHV-korjaus huomioi kypsyyden.
> **[→ Tee kasvumittaus]**

- **Taso + kehityskohde näkyvät silti** — ohjaus EI korvaa niitä, se selittää ne. `renderKehityskorttiHTML`
  näyttää jo tason harmaana + 🌱 (#279) — säilytä; lisää vain tämä osion-tason ohjaus.

### 1.3 — Poista "kypsyysdataa puuttuu" -piilotus Mittaus-normivertailusta
VP Mittaus-normivertailu (~9238): nyt `epav`-tilassa tulkinta piilotetaan → `"kypsyysdataa puuttuu"`, ja
kasirata/10m (`gated:false`) näyttävät silti "kehityskohde" → **epäjohdonmukaista** (osa piilottaa, osa ei).
Teron linjan mukaan: **näytä tulkinta aina**, mutta pre-PHV-kehityskohteelle **pehmeä lisä** eikä piilotus:
- Poista `epav → "kypsyysdataa puuttuu"` -haara.
- Pre-PHV (kun `phv_tila == null` / neutraali) kehityskohde-tulkinta muotoon:
  `kehityskohde · tarkentuu kasvumittauksella` (ei kova punainen leima; ink3/amber-sävy).
- "olet edellä" ennallaan. Osion §28-konteksti tulee 1.2:n ohjauksesta.

## Reunaehdot
- **§7.22:** Pelaaja_v7 ei kutsu `renderKehityskorttiHTML`:ää → ei muutu. Ei tasolukuja pelaajalle.
- **Ei laskentamuutosta, ei skeemaa, ei Rules-muutosta.** Vain näyttö + muotoilu.
- **Design-lukko + molemmat teemat** (amber-ohjaus = `--amber-dim`/`--amber-brd`, ei täyttöväriä).
- **`?v=`-bump** jos `tm_eerikkila_normit.js` muuttuu (VP + Master).

## Definition of Done
- **L1:** `_vpStatTiivisteHTML` (+ sweepatut kohdat) käyttävät `_fmtTestiArvo` → max 2 des; kasvumittaus-ohjaus
  näkyy kun PHV puuttuu (kehityskortti + Mittaus); "kypsyysdataa puuttuu" -piilotus poistettu, pre-PHV-kehityskohde
  pehmeänä "tarkentuu kasvumittauksella".
- **L2 (vitest):** `_fmtTestiArvo` 2 des seconds; Mittaus-tulkinta näkyy pre-PHV:lläkin (ei "kypsyysdataa puuttuu");
  kehityskohde-tulkinta säilyy. ~870+ vihreä, ei regressiota.
- **L3 (elävä, molemmat teemat, esim. Oliver Backström P12):** "Erottava ase" 30 m näyttää **4.94** (ei 4.937);
  fyysisessä näkyy kasvumittaus-ohjaus + Testaus-linkki; kehityskohteet + tasot näkyvät; Mittaus näyttää tulkinnan
  (ei "kypsyysdataa puuttuu").
- Pieni PR. Lataa VP/Master uudelleen deployn jälkeen.
