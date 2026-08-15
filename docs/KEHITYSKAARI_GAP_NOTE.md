# Kehityskaari — aukkoanalyysi (mitä emme olleet ottaneet huomioon)

Tarkastin koodin ennen briffejä. Tässä mitä löytyi — kaksi asiaa vaatii **sinun päätöksesi**, loput on huomioitu briffeissä K1–K4.

## Iso oivallus: komponentti on jo rakennettu, ei kytketty
`lib/tm_kehityskaari.js` (v4) sisältää **valmiin KISS-renderöijän `tmKehityskaari(el, data, opts)`** design-kartan mukaan —
vartijat mukana (**alustavartija §22, datataso 1/2/≥3, kaksi deltaa §34, rooli='pelaaja' §7.22**). **Mutta sitä ei kutsuta mistään.**
Kytkettynä on vanha `tmKaariRenderFull` (Mittaus ~11210). → Työ on **kytkentä + migraatio**, ei rakentaminen. Tämä pienentää K1–K4:n riskiä ja työmäärää.

## PÄÄTÖS 1 — ADAR-kaari: ei datalähdettä (K5 / VAIHE 2)
Design-kartta näyttää ADARin **dimensioittain** (Havaitse/Päätä/Toimi/Arvioi 2.1→2.4). Mutta:
- **`adar_historia`-kenttää ei ole** — ADAR/pelihavainto ei tallenna aikasarjaa. Komponentin oma kommentti: *"TODO (VAIHE 2): ominaisuus='adar'
  renderöi nyt yhden sparklinen … Design K2 = per-dimensio A/D/Ac/R -palkit."*
- **Kaksi alipäätöstä:**
  1. **Datalähde:** (a) uusi `adar_historia[]` (per-dimensio a/d/ac/r + pvm, kirjoitus pelihavainnosta jakson lopussa) VAI (b) johdetaan olemassa olevista pelihavainnoista lennossa?
  2. **Render:** (a) per-dimensio-kutsu (4× `tmKehityskaari`, kutsuja antaa yhden dimin) VAI (b) palkit komponentin sisään (`data.dimensiot:{a,d,ac,r}`)?
- **Suositus:** **lykkää ADAR omaan briffiin (K5)**, toimita fyysinen/FLEI/TKI ensin (K1). ADAR on ainoa sisääntulo jolla ei ole valmista dataa.
  → **Kerro kumman datalähteen + render-tavan haluat, niin kirjoitan K5:n.**

## PÄÄTÖS 2 — alustavartija (§22) on tällä hetkellä hampaaton kaarella
Komponentin §22-suodatin (`tmKaariAlustaSuodata`) suodattaa **per-piste `x.alusta`**:lla. Mutta `tmHhSnapshot` (tm_historia.js) **ei kopioi alustaa**
snapshotiin — alusta on vain pelaajatasolla (`p.hh_alusta`, tuorein). → Sekamittaushistoriassa (osa nurmi, osa halli) **vartija ei osaa erottaa pisteitä**.
- **Korjaus (pieni):** laajenna `tmHhSnapshot` kopioimaan `alusta` per snapshot (nopeus/ketteryystesteille). Sitten vanha data ilman alustaa = null → "kaikki samalla viivalla" (nykytila), uusi data alustallinen = suodattuu oikein.
- **Suositus:** tee tämä **K1:n prerequisiitiksi** (sama PR tai pieni erillinen), muuten §22-teksti näkyy mutta ei suodata. **Kerro haluatko sen K1:een vai omaksi mikrofixiksi.**

## Huomioitu jo briffeissä (ei vaadi päätöstä)
- **FLEI/MAS erillisinä arrayina** (`flei_historia`/`mas_historia`, eivät hh/tki:ssä) → K1 mappaa ne `data.historia`:ksi. OK.
- **DOM-renderöijä vs string-HTML:** `tmKehityskaari` kirjoittaa `el.innerHTML` (ei palauta merkkijonoa). Jos Mittaus-lohko on puhdas string → tarvitaan mount-hook. **Merkitty K1:een "ilmoita ENNEN".**
- **Nimitörmäys** ("Kehityskaari" = mitattu trendi VS jaksofokusten meso-historia) → K3 nimeää meso-historian "Jaksohistoriaksi".
- **Pelaaja §7.22** → K4 migroi rooli='pelaaja':aan + SW-nosto (§27).
- **Katselmus-silmukka** → K2 kytkee `tmKaariJaksoSidos`-deltan sulku-modaaliin.

## Toteutusjärjestys
**K1 Mittaus** (+alusta-prereq jos hyväksyt) → **K2 Katselmus** → **K3 Aloitus/Kehitys/nimi** → **K4 Pelaaja** → **K5 ADAR** (kun datapäätös tehty).
Kukin oma PR, L1/L2/L3-tarkastettuna.
