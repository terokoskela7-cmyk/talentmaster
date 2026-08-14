# Mittaus — kevyt luettavuuspassi (2-sarakkeen pienimmät elementit) · Code-brief

> **Miksi:** #359 vei Mittauksen v4-kartan 2-sarakkeeseen (rail-vapaa). Fonttikoot täsmäävät karttaan, mutta rail-vapaa
> leventää sarakkeet (~600px) ja 2-sarakkeen tiiviys tekee pienimmästä **mono-tekstistä** himmeän/pientä (Tero: "teksti
> tuntuu pieneltä/epäselvältä"). **Kevyt, bränditurvallinen luettavuuspassi** pienimpiin elementteihin — ei rakennemuutosta,
> ei uutta dataa, pelkkä CSS-fonttikoko + rivikorkeus.
> **Luonne:** CSS-only, ~4 riviä. Ei `?v`.

## CODE-SÄÄNNÖT (protokolla — jokaiseen briiffiin)
- **Poikkeama = ilmoita ennen, älä toteuta eri versiota yksin.** Reuse yli reimplementoinnin. Älä lisää porttia/ehtoa jota ei pyydetty.

---

## MUUTOKSET (CSS, `.mit-*`-lohko rivit ~1462–1472)

| Elementti | Nyt | → | Huom |
|---|---|---|---|
| `.mit-meta` (tagit "taso 1/5 · alle ikäluokan…") | `font-size: 9.5px` | **10.5px** | mono; nostetaan luettavuus |
| `.mit-trh .tn` (testinimi "30 m maksiminopeus") | `font-size: 11px` | **11.5px** | mono |
| `.mit-mean` ("mitä tarkoittaa" -rivi) | `font-size: 12.5px` | **13px** | sans |
| `.mit-meta` `line-height` | `1.6` | **1.7** | ilmavampi |
| `.mit-mean` `line-height` | `1.45` | **1.5** | ilmavampi |

**EI muuteta:** hero `.tval` (40px) · per-testi-arvo `.mit-trh .tv` (17px) · `.mit-tname` · synth/lens/fresh · palkit ·
2-sarake-rakenne · rail-vapaus. Vain yllä olevat 5 arvoa.

## INVARIANTIT + DoD

- **Brändilukko §5:** vain fonttikoko/rivikorkeus muuttuu — DM Mono / DM Sans / teal / `var(--border)` / kulmat ennallaan.
  **Molemmat teemat.**
- **Ei rakennemuutosta:** mit-cols + mit-hero/mit-trow-rakenne + f1/f2-sisältö ennallaan. Ei datamuutosta.
- **LIVE ennen valmista:** Mittaus 2-sarakkeessa → tagit/testinimi/"mitä tarkoittaa" luettavampia, mutta ilme pysyy KISS
  (ei liian iso). Molemmat teemat. Vitest + eslint vihreä. Ei `?v`.
