# R1.4-korjaus 2 (KORVATTU) — tutka aina esillä: poista ≥3-portti · Code-brief

> **⚠ TÄMÄ KORVAA aiemman version** (joka lisäsi dimensiolista+CTA:n). **ÄLÄ tee dimensiolistaa.** Oikea korjaus on
> yksinkertaisempi: **poista portti**, tutka renderöityy aina.
>
> **Miksi:** Tero havaitsi että Aloituksen 5D-tutka näkyy vain osalle pelaajista (≥3 dim). Juurisyy: `_vpAloitusTutkaHTML`
> lisäsi `if (…<3) return ''` -portin (rivi 5776), jota **rail-tutka (rivi 10811, näkyy Mittauksella) ei koskaan ole
> porttinut** — se renderöi `_tmRadar5D`:n aina. Portti on "jostain jäänyt" epäjohdonmukaisuus. **Totuus (Tero):
> "tutka on koko ajan esillä ja täyttyy sitä mukaa kun testit tehdään tai arvioidaan."**
> **Luonne:** yhden rivin poisto + varmistus että sparse-data renderöityy siististi. Ei uutta dataa. Ei `?v`.

---

## KORJAUS

**Kohde:** `_vpAloitusTutkaHTML(p)`, rivi ~5776:
```
if (radarDims.filter(function (x) { return x.arvo != null; }).length < 3) return '';   // ← POISTA tämä rivi
```
**Poista portti kokonaan.** Tutka renderöityy aina — saadut dimensiot piirtyvät, puuttuvat ovat tyhjinä, ikäluokkanormin
kehä + akselit + labelit näkyvät → **profiili täyttyy sitä mukaa kun dataa tulee** (mittaus/arviointi). Sama käytös kuin
rail-tutkalla (rivi 10811), johon tämä nyt yhtenäistetään.

**Varmistus (ei uutta logiikkaa):**
- `_vpRadarNormiJaVaihe` + overlay + suunnat ajetaan nyt myös vajaadataisille — **sama polku kuin rail** jo tekee, joten
  ei uutta riskiä. Jos jokin apuri olettaa ≥3, käytä samaa graceful-käsittelyä kuin rail-tutka (line 10811 · `_radarOpts`).
- **Ei valheellista täyttä muotoa:** `_tmRadar5D` piirtää vain saadut pisteet + normikehän (nulls jäävät piirtymättä) —
  tämä on jo sen käytös railissa. Ei fabrikoida puuttuvia arvoja.
- 0 dimensiota (aivan uusi pelaaja) → tyhjä kehä + akselit + "profiili täyttyy" -henki (kuten rail); ei kaadu.

---

## INVARIANTIT + DoD

- **Johdonmukaisuus:** Aloitus-tutka renderöityy **identtisesti rail-tutkan kanssa** (Mittaus) — aina esillä, täyttyy datasta.
- **§26/§7.22:** vain aidot pikakenttä-arvot; puuttuvat jäävät tyhjiksi (ei fabrikointia).
- **Ei muuta muutu:** ≥3-dim-render + normi + suunnat + legenda + 2-sarake + rail-toggle ennallaan. Vain portti pois.
- **Brändi §5** · molemmat teemat.
- **LIVE ennen valmista** (arkkitehti verifioi molemmilla teemoilla):
  - **<3-dim-pelaaja** (esim. vain D1+D2) → tutka **näkyy** Aloituksen oikeassa sarakkeessa (osittain täyttyneenä),
    sama kuin Mittauksen railissa — EI enää tyhjää kohtaa.
  - **≥3-dim-pelaaja** → tutka ennallaan.
  - Aloitus- ja Mittaus-tutka näyttävät samalta samalle pelaajalle. Vitest + eslint vihreä.
