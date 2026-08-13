# TalentMaster™ — DESIGN-LINJA (pysyvä ohjaava sääntö)

> **Päätös (Tero, 2026-08):** *Kaikki tulevat uudistukset noudattavat uutta KISS-visuaalidesigniä. Kaikki välilehdet.*
> Design-kartat on tehty juuri tätä varten — ne ovat SSOT ("single source of truth") kunkin välilehden ilmeelle ja
> informaatioarkkitehtuurille. **"Tehdään täsmälleen se mitä on suunniteltu."**

## Mitä tämä tarkoittaa käytännössä

Jokainen uusi feature, korjaus tai uudelleensuunnittelu (kaikki briiffit Codelle) **verrataan ensin vastaavaan
design-karttaan** ja toteutetaan sen mukaiseksi — ilme, asettelu, sarakerakenne, komponenttihierarkia, tyhjän tilan
käsittely. Ei ad-hoc-asettelua joka ajautuu kartasta.

## Design-kartat (SSOT per välilehti) · `docs/idp_design/`

| Välilehti | Kartta |
|---|---|
| **Aloitus** (IDP-kortti) | `IDP_KORTTI_KISS_design_kartta_v7.html` |
| **Mittaus** | `MITTAUS_KISS_design_kartta_v4.html` |
| **Arviointi** | `ARVIOINTI_KISS_design_kartta_v4.html` |
| **Kehitys** | `KEHITYS_KISS_design_kartta_v2.html` |
| **Viikko** | `VIIKKO_KISS_design_kartta_v1.html` |
| Kehityskaari | `KEHITYSKAARI_KISS_design_kartta_v1.html` |
| Kypsyys · PHV | `KYPSYYS_PHV_design_kartta_v1.html` |

## Prosessi (design-first)

1. **Ennen briiffiä:** lue kohteen design-kartta. Tunnista ero live vs kartta.
2. **Rehellinen tyhjä säilyy:** kartta näyttää usein *täytetyn* tilan; live näyttää aidon datan. Erot jotka johtuvat
   puuttuvasta datasta (esim. per-osa-näkyvyys ennen R4-kaappausta) EIVÄT ole poikkeamia — ne täyttyvät kun data tulee.
   Vain *rakenteelliset/esitykselliset* erot korjataan.
3. **Brändilukko §5 aina:** Cormorant Garamond (ei bold) · DM Sans · DM Mono · teal ainoa aksentti (#1A7A5E light /
   #28B090 dark) · amber vain varoitus/reflektio · `var(--border)`-hiusviivat (EI `--border2`) · terävät kulmat ·
   semanttinen emoji · molemmat teemat.
4. **Verifiointi:** L1 diff · L2 Vitest+eslint · L3 live molemmilla teemoilla — kartta vieressä.

## Nykytila (2026-08)

- **Aloitus:** konsepti-ydin + silta-alkuperä + KISS-ilme livenä (R1.2/R1.3, PR #348/#349/#352). **Seuraava:
  2-sarakeasettelu v7:n mukaiseksi** (narratiivi 1.5fr | 5D-tutka + Suunnitelman kaari 1fr; Aloitus-kohtainen, muut
  välilehdet pitävät jaetun railin) — R1.4. Täytetty tila (näkyvyys-pallot + Konsepti %) = R4 Kehitys.
- **Mittaus:** v4-tulkintakehys livenä (R2). **Muut välilehdet (Arviointi/Kehitys/Viikko): relayout karttoihinsa vielä tekemättä.**
