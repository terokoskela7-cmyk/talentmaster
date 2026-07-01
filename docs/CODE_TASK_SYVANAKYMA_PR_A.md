# Code-tehtävä: Syvänäkymä-modaali PR A — dual-radar-overlay + COD/TSI (turvallinen ydin)

> Valmis brieffi. Tämä on **PR A** kaksivaiheisesta syvänäkymä-remontista (Tero valitsi vaihtoehto 1). Rajaus: **VAIN additiiviset lisäykset** — EI välilehtien yhdistämistä, EI layout-remonttia. Ne ovat **PR B** (`CODE_TASK_SYVANAKYMA_UI.md`, tehdään erikseen kun Tero voi live-testata).
> Kohde: VP_v25.html `avaaJoukkueSyvanakyma` + per-pelaaja `_jspModal`. Kanoninen VP-dashboard → pienin mahdollinen blast-radius, ei rakennetta rikota.
> Riippuvuus mainissa: `docs/kehitysvaihe_tavoitetasot.js` (`TM_KEHITYSVAIHE.kehitysvaiheTaso`).

## Tee VAIN nämä 2

### 1. ⭐ Dual-radar-overlay (Ikäluokka ↔ Kehitysvaihe)
Lisää **olemassa olevaan radariin** (nykyinen sijainti + koko ennallaan — ÄLÄ suurenna/siirrä, se on PR B) toggle **`Ikäluokka | Kehitysvaihe | Molemmat`** radarin ylle.
- **Ikäluokka** (oletus) = nykyinen radar sellaisenaan (`_tmRadar5D`, ei muutosta).
- **Kehitysvaihe** = sama radar mutta arvot `kehitysvaiheTaso(arvo, testi, offset, sp)`-funktiolla **VAIN fyysisille akseleille** (lin-nopeus/CMJ/MAS; MAS ÷3.6). Muut akselit (SM-pallo/tekniset) → näytä ikäluokka-arvo + merkitse osittaisuus (himmeä akselinimi tai alaviite "kehitysvaihe: nopeus/CMJ/MAS").
- **Molemmat** = kaksi monikulmiota päällekkäin: ikäluokka (`--blue` viiva) + kehitysvaihe (`--teal` täyttö). Legenda: ● ikäluokka · ● kehitysvaihe · - - tavoite.
- Laajenna `_tmRadar5D` **additiivisella `opts.overlay`-sarjalla** (älä muuta nykyistä käyttäytymistä ilman overlayta).
- **Graceful degradation (PAKOLLINEN):** jos joukkueella ei PHV-offset-dataa TAI lib puuttuu → **toggle piilossa**, radar toimii ikäluokka-tilassa täsmälleen kuten nyt. (SJK: PHV vain ~8 pelaajalla → useimmilla joukkueilla toggle piiloutuu; se on OK.)
- §28: kehitysvaihe-linssi on juuri se joka näyttää myöhäiskypsyjän oikeudenmukaisesti — ei "heikko".

### 2. COD/TSI per-pelaaja (Tero-pyyntö)
Per-pelaaja `_jspModal`in Tekninen-osioon: näytä **suunnanmuutos** raakana + TSI.
- `hh_viimeisin.sm_juoksu` (ilman palloa) · `hh_viimeisin.sm_pallo` (pallolla) · `tsi_viimeisin` (erotus).
- TSI-väri §21: ≤0.5 s teal · 0.5–1.5 s amber/neutraali · >1.5 s red-huomio.
- Olemassa oleva TSI-rivi (§19) laajennetaan näyttämään myös raa'at juoksu/pallo. Pikakentistä (§26), graceful "—" kun puuttuu.

## ÄLÄ tee tässä (= PR B, erikseen)
- Välilehtien yhdistäminen 4→3 (Yhteenveto+Tavoitetaso → Tilanne).
- Radarin suurentaminen / hero-nosto / vasemman sarakkeen uudelleenjärjestely.
- Painopiste-lohko, jakaumien collapse, datapolku-remontti.
- **Nämä ovat rakennemuutoksia joita ei voi harness-testata luotettavasti → odottavat PR B:tä + live-tarkistusta.**

## Guardrailit
- **Rajaus ehdoton:** vain radar-overlay + COD/TSI-rivi. Modaalin rakenne, välilehdet, layout **ennallaan**.
- **Laskenta ei muutu** — pikakentät (§26), `kehitysvaiheTaso` lennossa (ei tallenneta). Kaikki analyysifunktiot (`_jsvPerLajiHTML` ym.) ennallaan.
- **Additiivisuus:** `_tmRadar5D` uusi käyttäytyminen VAIN `opts.overlay`-tilassa; ilman sitä pikselintarkasti nykyinen.
- **§28/§7.22, brändi §5, mobiili §6 (yksi @media), tumma+vaalea teema** (token-turva kuten PR #54/#55). Ei versionbumppia.
- Lib rikki/puuttuu → toggle piiloon, ei kaadu.

## Verifiointi
- **Code:** synteettinen harness molemmilla teemoilla — toggle näkyy kun overlay-dataa, radar toimii ennallaan ilman; COD/TSI-rivi värikoodattuna. `npm test` + lint + CI vihreät. Lib node-verifioitu.
- **Merge jälkeen (Claude + Tero):** Claude ajaa live-DOM-/kuvatarkistuksen SJK-datalla (kuten pulssikorteille) — varmistaa ettei kanonisen modaalin nykyinen rakenne rikkoutunut ja että overlay/COD/TSI näkyvät oikealla datalla.

## Ei tähän
- PR B (välilehdet + layout) = `CODE_TASK_SYVANAKYMA_UI.md`.
- Feature branch → PR → merge.
