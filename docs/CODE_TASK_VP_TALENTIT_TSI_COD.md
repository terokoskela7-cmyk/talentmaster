# Code-tehtävä: TSI + suunnanmuutos (COD) Talentit-listaan (jatko PR #55)

> Valmis brieffi Code-agentille. Rajaus: **VAIN VP_v25.html Talentit-lista** (`renderTilanne`in Talentit-lohko, PR #55). Pieni jatko: lisää suunnanmuutos-sarake. EI muuta.
> Peruste (Tero): TSI erottaa lajitekniikan fysiikasta ja on **keskeinen talenttiarvioinnin mittari**. Suunnanmuutos pallolla ja ilman palloa ovat molemmat tärkeitä ominaisuuksia, mutta niitä ei tällä hetkellä näytetä listassa. Data on jo pikakentissä.

## Data (kaikki pikakentistä, §26 — EI alikokoelmakyselyjä)
- **SM-juoksu** (suunnanmuutos ilman palloa) = `hh_viimeisin.sm_juoksu` (persistoitu #69).
- **SM-pallo** (suunnanmuutos pallolla) = `hh_viimeisin.sm_pallo` (persistoitu #69).
- **TSI** = `tsi_viimeisin` (pikakenttä = `sm_pallo − sm_juoksu`, §22). ÄLÄ laske uudelleen — lue pikakenttä.
- Saatavuus: SJK:lla useimmilla on (§30 hh_viimeisin/tsi). Puuttuville → "—".

## Muutos — yksi uusi sarake Talentit-listaan
Lisää sarake **"Suunnanmuutos"** (tai "COD") D2:n/TKI:n jälkeen, ennen "Ikäluokka → Kehitysvaihe" -saraketta (looginen ryhmä teknisten mittareiden kanssa). Yksi kompakti solu per pelaaja:

```
ilman 7.4 s · pallolla 8.6 s · TSI +1.2 s
```
- Esitä tiiviisti (mahtuu sarakkeeseen). Ehdotus: kaksi pientä lukua + TSI korostettuna, esim.
  `7.4 → 8.6` (juoksu → pallo, harmaa) ja alle/vieressä `TSI +1.2` (värikoodattu).
- **TSI-väri (§21-kynnykset, canonical):** ≤0.5 s teal (tekniikka erittäin vahva) · 0.5–1.5 s amber/neutraali (normaali kansallinen taso) · >1.5 s red-huomio (fysiikka edellä tekniikkaa). Käytä brändin `--teal`/`--amber`/`--red`.
- **Graceful:** jos `sm_juoksu`/`sm_pallo`/`tsi_viimeisin` puuttuu → "—" (kuten TKI/kehitysvaihe-sarakkeet nyt). Ei kaadu, ei tyhjää HTML:ää.
- Otsikkorivin tooltip/ali-teksti: "Suunnanmuutos ilman palloa / pallolla · TSI = pallon hidastus (pieni = vahva tekniikka)".

## Guardrailit
- **Rajaus ehdoton:** vain Talentit-listan sarake VP_v25:ssä. Ei KPI-kortteja, ei syvänäkymää, ei muita näkymiä/sivuja.
- **Kaikki pikakentistä** (§26). Ei uutta laskentaa — `tsi_viimeisin` sellaisenaan; raa'at `hh_viimeisin.sm_*`.
- **Ei muuta talenttilistan logiikkaa** (skooppi, dual-taso, vauhti, Hidden Gem PR #55 ennallaan) — vain uusi sarake.
- **§7.22/§28:** VP/valmentaja-työkalu; TSI on tekninen mittari (ei kypsyys-gitattu). Ei lapsinäkymään.
- **Brändi §5** (teal/amber/red, DM Sans); **mobiili §6** — leveä taulukko: varmista ettei riko mobiililayoutia (harkitse sarakkeen piilotus/tiivistys kapealla, olemassa oleva taulukon responsiivisuus). **Tumma + vaalea teema** (token-turva kuten PR #54/#55). Ei versionbumppia.

## Samalla (pieni siisteyskorjaus, sama TSI-alue)
- **`docs/testit_indeksit.js` rivi 440:** kommentti "TSI = SM-juoksu − SM-pallo" on **väärinpäin** — alla oleva koodi laskee oikein `sm_pallo − sm_juoksu`. Korjaa kommentti vastaamaan koodia (estää että joku "korjaa" koodin väärän kommentin mukaan ja kääntää etumerkin). Vain kommentti, EI koodimuutosta.

## Verifiointi
- Screenshot SJK-datalla: Talentit-listassa Suunnanmuutos-sarake näyttää juoksu/pallo + TSI värikoodattuna talenteille joilla SM-data; "—" muille. Tumma + vaalea teema. Ei konsolivirheitä; ESLint no-undef puhdas (§60). `npm test` + CI vihreät.

## Ei tähän (erikseen)
- TSI/COD syvänäkymän per-pelaaja-tuloskorttiin → lisätään `CODE_TASK_SYVANAKYMA_UI.md`:hen (sama dual-taso-kierros).
- Tekninen KPI-kortin SM-keskiarvot (juoksu/pallo ka) — jos halutaan myöhemmin.
- Feature branch → PR → merge.
