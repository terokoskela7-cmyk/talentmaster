# CODE — Kortti: ÄLY (peliäly / ADAR) tasokohtainen kehityskuvaus + kannustava seuraava askel

**Tyyppi:** UI (kuluttaja, Pelaaja_v7 kortin kääntöpuoli) + olemassa olevan ADAR-rubriikin uudelleenkäyttö. **Ei Rules-/skeemamuutosta.**
**Kohde:** `TalentMaster_Pelaaja_v7.html` → `naytaFcOverlay` kortin kääntöpuolen `bar()` (rakentaja/leikkija -haara).
**Lähde (rubriikki):** pelihavainnointi-työkalun VALMIIT ADAR-tasokuvaukset — `TalentMaster_ADAR_Pikakortti.html` ja/tai pelihavainto-arviointi `TalentMaster_VP_v25.html` / `TalentMaster_Master_v16.html`. Paikanna kanoninen tasokuvaus-rubriikki; ÄLÄ kirjoita uutta copya.

## Bugi / puute (verifioitu livenä, Topias U13)
Kortin kääntöpuoli näyttää rakentaja/leikkija-tilassa **geneerisen** rivin per osa-alue:
> "Nyt taso 1/5 · seuraavaan: taso 2/5"

Se on pelkkä numero. ÄLY (peliäly, D4) tasolla 1 pelaaja ei saa tietää **mitä se tarkoittaa** ("alat havainnoida peliä") eikä **mitä tehdä seuraavaksi** ("käännä päätä, katso ympärille ennen kuin saat pallon"). Palaute: numero yksin ei ohjaa kehitystä.

## Korjaus
1. **Käytä pelihavainnointi-työkalun VALMIITA ADAR-tasokuvauksia yhtenä totuutena.** Paikanna rubriikki (yllä mainitut tiedostot); jos se ei ole jaettavissa suoraan, ekstraktoi kanoniset tasotekstit **jaettuun rakenteeseen** jota sekä työkalu että kortti voivat käyttää — **ei kahdennettua/uutta copya** (yksi lähde).
2. **Kortin kääntöpuolella ÄLY-rivi** näyttää tasonumeron sijaan/lisäksi:
   - **"Nyt: [ADAR taso X kuvaus]"** — esim. taso 1: "Alat havainnoida peliä 👀"
   - **"Seuraava askel: [ADAR taso X+1 kuvaus / vinkki]"** — esim. "Käännä päätä ja katso ympärille ennen kuin saat pallon."
   - Tasonumero pysyy pienenä/toissijaisena; **kuvaus on pääosassa**.
3. **Sävy:** rakentaja/leikkija — kannustava, kehityssuuntautunut. **§7.22:** oma taso + oma seuraava askel (kriteeripohjainen), EI vertailua muihin, ei percentiiliä.
4. Huipputaso (taso 5) → "huipputasolla — pidä yllä ja monipuolista" (ei "seuraavaa").
5. **Fallback:** jos jollekin tasolle ei ole kuvausta, pehmeä paluu nykyiseen geneeriseen ("seuraavaan: taso X+1/5").

## Skope
- **ÄLY / peliäly ensin** (siellä ADAR-kuvaukset valmiina). Sama kuvio voidaan laajentaa muihin 5D-osa-alueisiin myöhemmin, jos/kun niiden pelaajalle sopivat tasokuvaukset ovat olemassa. Älä keksi muiden osa-alueiden copya tässä.

## Reunaehdot & DoD
- Ei Rules-/skeemamuutosta. Kuluttaja-render, read-only. Kääntökorjaus (OSA A) + tasomalli (OSA B) ennallaan.
- **DoD:** Topias (U13) ÄLY 1 → kääntöpuoli näyttää **oikean pelihavainnointi/ADAR-tason kuvauksen + kannustavan seuraavan askeleen**, ei pelkkää "1/5"-lukua. Copy tulee yhdestä lähteestä (ei kahdennettu). 790 vitest vihreä, 0 konsolivirhettä.
- **Verifioi live (Topias):** avaa kortti → kääntöpuoli → ÄLY-rivi näyttää "Alat havainnoida peliä" + "Seuraava askel: …". Muut osa-alueet ennallaan (geneerinen), kunnes niille tehdään sama.
