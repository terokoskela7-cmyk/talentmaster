# R1.4-korjaus — tutka oikeaan sarakkeeseen + rail piiloon (v7-match) · Code-brief

> **Miksi:** #354 teki `.idp-cols` 2-sarakkeen oikein (1.5fr/1fr), mutta poikkesi hyväksytystä v7-suunnitelmasta kahdessa
> kohtaa: (1) **tutka jäi pois oikeasta sarakkeesta** (live-varmennus: `.idp-col-r` ei sisällä `_tmRadar5D`-svg:tä),
> (2) **railia ei piilotettu** (`aloitus-mode` puuttuu) → live on 3-sarakkeinen (rail+tutka | narratiivi | stat+kaari),
> ei v7:n kahta. Coden peruste ("ei toisteta tutkaa") oli looginen mutta rikkoi v7-matchin. **Oikea ratkaisu poistaa
> toiston toisin päin: tutka oikean sarakkeen ylälaitaan + rail piiloon Aloituksessa.**
> **Kartta (SSOT):** `docs/idp_design/IDP_KORTTI_KISS_design_kartta_v7.html` — `.col-r` = **5D-tutka (ylhäällä) + Suunnitelman kaari (alla)**, ei erillistä railia.
> **Luonne:** viimeistely #354:n päälle — sijoittelu. Ei uutta dataa. Ei `?v`-bumppia. Verifiointi: LIVE molemmilla teemoilla, kartta vieressä.

---

## KORJAUS 1 — tutka oikean sarakkeen ylälaitaan (`.idp-col-r`)

`.idp-col-r` alkaa nyt stat+kaarella. **Lisää 5D-tutka sen ylimmäksi elementiksi** (ennen statia/kaarta), v7:n mukaan:
- Otsikko "5D-profiili · tutka" + tutka `window._tmRadar5D(radarDims, opts)`.
- **radarDims-lähde:** sama dimensiodata kuin railissa (modaalin kokoonpano ~rivi 10695 rakentaa `radarDims`:
  D4 Peliäly · D3 Psyykkinen · D5 Sosiaalinen · D2 Tekninen · D1 Fyysinen, "peli edellä" -järjestys). **Reuse, älä toisinna
  logiikkaa:** poimi radarDims-rakennus pieneen apuriin (esim. `_vpRadarDims(p)`) jota sekä rail että `.idp-col-r` kutsuvat —
  yksi totuus. Jos `_vpIdpNarratiiviHTML` ei saa dimensioita suoraan, apuri laskee ne p:stä (`p.d4_taso`/`d4`, `p.d3_taso`,
  `laskeD5Taso(p)`, `p.d2_*`, `p.d1_*` — samat kutsut kuin rivillä 10695).
- **Tyhjä tutka (§30 OVR-portti, <3 ulottuvuutta):** dimensiolista + mittaa-CTA, EI valheellista nollamuotoa (v7 `.radar-c.st`).

## KORJAUS 2 — rail piiloon Aloituksessa (`aloitus-mode`)

Ilman tätä tutka olisi kahdesti (rail + oikea sarake). v7:ssä ei ole railia Aloituksessa → piilota se:
- **`_jspVaihda(n)`** (rivi ~7595): `n===0` → `document.querySelector('.jsp-grid').classList.add('aloitus-mode')`;
  muuten `.remove('aloitus-mode')`. (Säilytä `_jsvAktiiviTab`.) Alkurenderissä Aloitus on aktiivinen → varmista että
  `aloitus-mode` on päällä myös modaalin auettua (lisää luokka `.jsp-grid`:iin suoraan kun tab 0 on default).
- **CSS:** `.jsp-grid.aloitus-mode { grid-template-columns: 1fr; }` + `.jsp-grid.aloitus-mode .jsp-left { display: none; }`.
- **Muut 4 välilehteä ennallaan:** vaihto Aloitus→Mittaus poistaa `aloitus-mode` → rail (nimi · tutka · Kypsyys/PHV ·
  signaalit · D1/D2) palaa. Vaihto takaisin Aloitukseen → rail piiloon. Testaa molemmat suunnat.

**Seuraus (sovittu, kartan mukainen):** Kypsyys/PHV + signaalit + D1/D2-kortit eivät näy Aloituksessa (säilyvät muilla
välilehdillä, mm. Mittaus). Tutka näkyy Aloituksessa oikeassa sarakkeessa, muilla railissa — ei kadonnut, ei toistu.

---

## INVARIANTIT + DoD

- **v7-match:** Aloitus = 2 saraketta (narratiivi 1.5fr | **tutka ylhäällä + Suunnitelman kaari alla** 1fr), **ei railia**.
- **Ei toistoa:** tutka tasan kerran Aloituksessa (oikea sarake); rail piilossa → ei duplikaattia. radarDims yhdestä apurista.
- **Ei datahukkaa:** kaikki #354:n idp-cols-sisältö säilyy; vain tutka lisätään col-r:n ylälaitaan + rail togglaa.
- **Brändi §5** (Cormorant ei-bold · teal · `var(--border)` ei `--border2` · terävät kulmat · molemmat teemat) · mobiili
  pinoutuu (`@media 1000px` → 1 sarake, tutka+kaari narratiivin alle).
- **LIVE ennen valmista:** (a) Aloitus 2-sarake, **tutka oikean sarakkeen ylälaidassa**, kaari sen alla, rail pois;
  (b) vaihto Mittaukseen → rail + Kypsyys/PHV palaa; takaisin Aloitukseen → rail pois; (c) tyhjä tutka → dimensiolista+CTA;
  (d) molemmat teemat + kapea (mobiili) modaali. Vitest + eslint vihreä. Ei `?v`-bumppia.
