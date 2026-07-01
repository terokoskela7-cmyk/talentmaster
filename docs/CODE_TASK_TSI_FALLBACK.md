# Code-tehtävä: VP syvänäkymä per-pelaaja — 2 korjausta (tab-clip + TSI-fallback)

> Rajaus: **VAIN VP_v25.html `_jspModal`** (per-pelaaja). Kaksi korjausta samaan pikku-PR:ään. Molemmat live-verifioitu 2026-07-01 oikealla SJK-datalla.

---

## KORJAUS 1 (PRIORITEETTI) — dimensiovälilehtien sisältö leikkautuu 36px:iin

**Oire:** per-pelaaja-modaalin alaosan välilehdet (Fyysinen/Tekninen/Peli/Kehitys) näyttävät tyhjiltä — "ei näy ollenkaan".
**Juurisyy (DOM-mitattu):** tab-sisältökontti (`_jspTab0..3`:n vanhempi, VP_v25 ~rivi 5307: `<div style="padding:18px 24px;overflow-y:auto;flex:1">`) on `flex:1 1 0%` + `overflow-y:auto` **modaalin sisällä joka on itse `display:flex; flex-direction:column; overflow-y:auto`**. Kun PR B lisäsi sisältöä (Tilanne-kehityskortti + D3-kalibraatio) tab-palkin YLÄpuolelle, flex:1-kontti litistyi minimikorkeuteen (`offsetHeight 36px` vaikka `scrollHeight 495px`) → sisältö leikkautuu 36px siivuun.
**Verifioitu:** aktiivinen Tekninen-välilehti = sisältöä `scrollHeight 459px`, mutta näkyvissä vain 36px.

**Korjaus:** poista tab-sisältökontista `flex:1` ja `overflow-y:auto` → `<div style="padding:18px 24px">`. Kontti kasvaa sisällön korkuiseksi, ja ulompi modaali (`max-height:90vh; overflow-y:auto`) hoitaa koko skrollauksen. Testaa että kaikki 4 välilehteä näkyvät kokonaan (Fyysinen: friv-rivit + MAS-syväanalyysi; Tekninen: SM + TSI + TKI + FLEI; Peli: ADAR/tyhjä; Kehitys: PHV + pvm:t). Modaali skrollaa yhtenä (§77 sticky-header pysyy).
**Regressiosuoja:** varmista ettei modaali menetä skrollausta pitkällä sisällöllä (sticky-otsikko + footer ennallaan).

---

## KORJAUS 2 — TSI-rivi laskettava lennossa kun pikakenttä puuttuu (VP_v25)

> Pieni korjaus. Live-verifioitu 2026-07-01: PR B:n jälkeen TSI-erotusrivi EI näy per-pelaaja-modaalissa (esim. SJK P15 Ebah, Runo) vaikka raa'at `SM-juoksu` 7.62 s + `SM-pallo` 8.67 s näkyvät. Syy: TSI-rivi nojaa pelkkään `tsi_viimeisin`-pikakenttään, joka on null osalle pelaajista — vaikka raakadata (`hh_viimeisin.sm_pallo/sm_juoksu`) on olemassa.
> Korjaus: laske TSI lennossa raakadatasta kun pikakenttä puuttuu → rivi näkyy AINA kun molemmat raaka-SM-arvot ovat. Rajaus: **VAIN VP_v25.html**, kaksi kohtaa.

## Juurisyy (koodi)
- **Per-pelaaja `_jspModal`** (VP_v25 ~rivi 5140): `const tsi = (p.tsi_viimeisin != null) ? p.tsi_viimeisin : null;` → rivi 5158 renderöi TSI-rivin vain `tsi != null` -ehdolla.
- **Talenttilista `_talenttiCod`** (VP_v25 ~rivi 8956): `const smj = hh.sm_juoksu, smp = hh.sm_pallo, tsi = p.tsi_viimeisin;` → rivi 8962 näyttää TSI:n vain kun `tsi` truthy. Sama aukko (raakojen `smj/smp` vieressä).

Molemmissa raaka `sm_pallo` ja `sm_juoksu` ovat jo käsillä → erotus on triviaali.

## Korjaus (molempiin kohtiin sama fallback)
Kun `tsi_viimeisin` on null, laske `sm_pallo − sm_juoksu` `hh_viimeisin`:stä:

```js
// TSI: pikakenttä ensin, muuten laske raakadatasta (sm_pallo − sm_juoksu)
let tsi = (p.tsi_viimeisin != null) ? p.tsi_viimeisin : null;
if (tsi == null) {
  const hv = p.hh_viimeisin;
  if (hv && hv.sm_pallo != null && hv.sm_juoksu != null) {
    tsi = Math.round((hv.sm_pallo - hv.sm_juoksu) * 100) / 100;
  }
}
```
- **Käytä kanonista `laskeTSI(sm_juoksu, sm_pallo)`** (`lib/tm_eerikkila_normit.js`, jos ladattu VP:hen) sen sijaan että kirjoitat oman pyöristyksen — pitää §22-määritelmän yhdessä paikassa. Jos lib ei ole VP:ssä, inline yllä oleva (sama kaava `sm_pallo − sm_juoksu`, 2 desimaalia).
- Talenttilistassa (`_talenttiCod` ~8956) `smj/smp` ovat jo muuttujina → `tsi = (p.tsi_viimeisin != null) ? p.tsi_viimeisin : (smj != null && smp != null ? Math.round((smp - smj) * 100) / 100 : null);`
- **§21-väri ja "TSI (pallon hidastus)" -otsikko ennallaan** — vain arvon lähde muuttuu (pikakenttä → fallback).
- Graceful: jos raakadataakaan ei ole (`sm_pallo`/`sm_juoksu` null) → TSI edelleen piiloon/"—" kuten nyt.

## Guardrailit
- **Rajaus:** vain nuo 2 TSI-lukukohtaa VP_v25:ssä. Ei muuta laskentaa, ei muita näkymiä.
- **Ei ylikirjoita pikakenttää** — fallback on vain renderöinnissä (lennossa), ei kirjoiteta Firestoreen. (Pikakentän pysyvä täyttö on erillinen recalcTSI-asia, ei tässä.)
- §22-invariantti: `TSI = sm_pallo − sm_juoksu` (positiivinen = pallo hidastaa). Älä käännä etumerkkiä.
- Brändi/teema/§7.22 ennallaan. Ei versionbumppia.

## Verifiointi
- Vitest jos helppo: fallback-laskenta (sm_pallo 8.67, sm_juoksu 7.62 → 1.05).
- Claude ajaa live-tarkistuksen mergen jälkeen: SJK P15 Ebah (Runo) → TSI-rivi "TSI (pallon hidastus) +1.05 s" näkyy per-pelaaja-modaalissa; talenttilistassa TSI näkyy myös niille joilla pikakenttä oli null mutta raakadata on.
- `npm test` + lint + CI vihreät.

## Ei tähän
- recalcTSI-ajo pikakentän pysyvään täyttöön (vaihtoehtoinen tie, ei valittu).
- Feature branch → PR → merge.
