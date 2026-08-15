# R4-korjaus — Kehitys v2 viimeistely (4 aukkoa brief'istä) · Code-brief

> **Miksi:** R4 (#372, mainissa) toteutti ytimen erinomaisesti (rail-vapaa · otsikko · statusrivi · inline-focal editori),
> mutta neljä brief'in kohtaa jäi tekemättä (verifioitu L1/L3). Kaikki **kosmeettisia, ei toiminnallista muutosta** —
> pelkkä väri + kaksi alaviitelohkoa. **DoD "0 näkyvää pinkkiä (Kehitys + Aloitus)" ei täyty** ilman kohtaa 1.
> **Kartta (SSOT):** `docs/idp_design/KEHITYS_KISS_design_kartta_v2.html` (rolenote + pelifoot alalaidassa). **Ei `?v`.**

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN · reuse yli reimplementoinnin · älä koske arviointi-/editorikoneistoon. Vain väri + 2 lohkoa.

---

## MUUTOS 1 — Aloituksen off-palette-pinkki pois (brändilukko §5)
`_vpAloitusJaksofokusHTML`, **rivi ~7665** (`vpal-meta`):
```
oli:  <div class="vpal-meta" style="color:#c060a8">◎ Lähde: pelihavainto…
uusi: <div class="vpal-meta" style="color:var(--ink3)">◎ Lähde: pelihavainto…
```
◎-merkki säilyy (kantaa "lähde=pelihavainto"). **Grep-varmista: 0 näkyvää `c060a8`** Kehitys- + Aloitus-tabeissa.
(Jäljelle jäävät `c060a8` ovat vain Arviointin `_jspArvSelit`-tapin takana + info-tooltip-datassa — EI tässä.)

## MUUTOS 2 — siniset linkit tealiksi (teal ainoa aksentti, kuten Arviointi #371 ⓘ)
- **Rivi ~11009** D3-kalibraatio-linkki: `color:var(--blue)` → `color:var(--teal)`.
- **Rivi ~11012** diagnostiikka-toggle (`▸ Diagnostiikka (PHV · testipäivät)`): `color:var(--blue)` → `color:var(--teal)`.
Sininen säilyy vain sanktioituna sekundäärinä (esim. override-note) — ei linkkiaksenttina.

## MUUTOS 3 — rolenote (§37) + pelifoot `_kehExtra`:n loppuun (kartta `.rolenote` + `.pelifoot`)
Diagnostiikkalohkon JÄLKEEN, ennen `#_jspTab3`-sulkua. Hienovarainen (mono/ink3):
- **rolenote §37:** "Valmentaja omistaa operatiivisen jaksofokuksen (omat pelaajat) · talenttivalmentaja talentit · VP asettaa kausitavoitteen + oversight/override."
- **pelifoot:** "Peli edellä, muut mukana. Jaksofokus voi olla fyysinen, teknis-taktinen tai psyykkinen — peli on painotus. Aloitus lukee tämän ja linkkaa tänne; Arvioinnin silta syöttää ehdotuksen; Viikko vie jakson kentälle."

---

## INVARIANTIT + DoD
- **Brändilukko §5:** teal ainoa aksentti · **0 näkyvää pinkkiä** (Kehitys + Aloitus) · sininen vain sanktioitu sekundääri.
- **Ei toiminnallista muutosta:** vain väri + 2 alaviitelohkoa. Arviointi-/editorikoneisto ennallaan.
- **LIVE:** Aloitus-lähdechipit neutraalit (ei pinkkiä) · D3-linkki + diagnostiikka-toggle teal · rolenote + pelifoot Kehityksen
  alalaidassa · molemmat teemat. Vitest + eslint vihreä. Ei `?v`.
