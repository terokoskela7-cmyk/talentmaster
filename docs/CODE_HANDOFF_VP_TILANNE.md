# Code-saate: VP Tilanne — TSI/COD + syvänäkymä-modaali (2 tehtävää)

> Yhdistetty toimeksianto Code-agentille. Kaksi peräkkäistä tehtävää samalla VP-alueella (VP_v25 Tilanne). Tee **järjestyksessä**, kumpikin **oma feature branch → PR → merge**. Ei versionbumppia (auto-bump mainissa).

## Yhteinen konteksti
- Rakentuu PR #54 (pulssikortit) + PR #55 (skooppivalitsin + Talentit-lista) päälle — molemmat jo mainissa.
- **Riippuvuus valmiina mainissa:** `docs/kehitysvaihe_tavoitetasot.js` (`TM_KEHITYSVAIHE.kehitysvaiheTaso`, PR #55:ssä korjattu validiksi). Molemmat tehtävät käyttävät sitä.
- **Kaikki data pikakentistä** (§26) — EI alikokoelmakyselyjä renderöinnissä.
- **Brändi §5** (teal #28B090 / amber #E0A040 / red; DM Sans / Cormorant), **tumma + vaalea teema** (token-turva kuten PR #54/#55), **mobiili §6** (yksi `@media`), **§7.22/§28** (VP-työkalu; matala pre-PHV-fyysinen neutraali, ei punainen). ESLint no-undef puhdas (§60), `npm test` + CI vihreät.

## Järjestys

### 1. TSI + suunnanmuutos (COD) Talentit-listaan — `docs/CODE_TASK_VP_TALENTIT_TSI_COD.md` ✅ VALMIS (mainissa, live-verifioitu)
Lisätty Talentit-listaan Suunnanmuutos-sarake (`sm_juoksu` → `sm_pallo` · `tsi_viimeisin`, §21-väri) + kommenttikorjaus `testit_indeksit.js` rivi 440.

### 2. Syvänäkymä-modaali — KAKSIVAIHEINEN (Tero valitsi vaihtoehto 1)
**PR A ensin — `docs/CODE_TASK_SYVANAKYMA_PR_A.md`** (turvallinen ydin, additiivinen): dual-radar-overlay (Ikäluokka ↔ Kehitysvaihe -toggle, graceful) + COD/TSI per-pelaaja. EI rakennemuutosta. Harness-verify; Claude ajaa live-tarkistuksen mergen jälkeen.

**PR B sitten — `docs/CODE_TASK_SYVANAKYMA_UI.md`** (rakennemuutos): välilehtien yhdistäminen 4→3, radar hero, lean vasen, painopiste/collapse/datapolku. Tehdään vasta kun PR A on mainissa ja Claude+Tero ovat live-tarkistaneet A:n.

## Ei tähän pakettiin (myöhempi §28-kierros, erikseen)
- Pulssikorttien "Aerobinen alle normin" -signaalin väri (punainen → amber/neutraali pre/circa-PHV-joukkueilla, §28) — signaalilogiikka, ei tässä.
- Tilanteen alaosan FYYSINEN/TEKNINEN/VALMIUS/PELI-kortit (yhä punaiset) — sama §28-kierros.
- Bio-banding V2 kehitysvaihe-tavoitetasotaulukoiden lopullinen käyttö laajemmin (odottaa Eerikkilän 2 solun vahvistusta).

## Verifiointi (molemmat)
Screenshot SJK-datalla, tumma + vaalea teema. Tehtävä 1: Suunnanmuutos-sarake värikoodattuna, "—" ilman SM-dataa. Tehtävä 2: 3 välilehteä, iso radar, dual-toggle (näkyy kun PHV-dataa; piilossa muuten), ei D1/D2-toistoa, COD/TSI per pelaaja. Reaali-appi vaatii Firebase-authin → suositellaan käyttäjän in-browser-viimeistely.
