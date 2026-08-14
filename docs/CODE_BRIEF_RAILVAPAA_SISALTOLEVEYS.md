# Visuaalinen selkeys — rail-vapaan sisällön leveyskatto (kartan mitta) · Code-brief

> **Miksi:** Rail-vapaat tabit (Aloitus · Mittaus · Arviointi) venyttävät sisällön `.jsp-box`:n mukaan **~1240px:iin**,
> koska rail-vapaalle sisällölle EI ole leveyskattoa. Mutta **jokainen design-kartta rajaa sisällön** (Aloitus 1040 ·
> Mittaus/Arviointi/Kehitys 940 · Viikko 860). → sisältö on ~25–30 % leveämpi kuin suunniteltu → "leveät laatikot,
> pieni teksti, tyhjät reunat" (Teron havainto). Rail poistettiin oikein, mutta sisältöä ei rajattu kartan mittaan.
> Best-app-käytäntö (Stripe/Linear/Notion/StatsBomb) = sisällön lukumitta rajattu, ei reunasta reunaan.
> **Kartat (SSOT):** `.wrap` max-width per tab (yllä). **Luonne:** CSS-only, ei rakennemuutosta, ei uutta dataa. Ei `?v`.

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN · reuse yli reimplementoinnin · älä keksi ehtoa · älä koske sisältölogiikkaan/koneistoon.

---

## MUUTOS — rajaa rail-vapaan sisältö keskitettynä (CSS)

**Vain rail-vapailla tabeilla** (`.jsp-grid.jsp-railvapaa`): rajaa sisältökolumnin (`.jsp-right`) leveys ja keskitä.
Ei-rail-vapaat tabit (rail näkyvissä, ~880px) EIVÄT saa kattoa — ne ovat jo mukavan levyisiä.

**Suositus (yksi arvo, yksinkertaisin):**
```css
.jsp-grid.jsp-railvapaa > .jsp-right { max-width: 960px; margin-left: auto; margin-right: auto; width: 100%; }
```
960px on lähellä kaikkia karttoja (940–1040). Korjaa "leveä + pieni" kerralla kaikilla rail-vapailla tabeilla.

**TAI per-tab tarkka (kartan mitta):** jos halutaan täsmälleen kartat — käytä aktiivisen tabin mukaista kattoa
(Aloitus/tab0 → 1040 · Mittaus/tab1 + Arviointi/tab2 → 940). Toteutus esim. `.jsp-right` sisäisiin tab-diveihin
(`#_jspTab0 { max-width:1040px } #_jspTab1,#_jspTab2 { max-width:940px }` + `margin:0 auto`) — tai CSS-muuttuja per tab.
**Valitse Teron ohjeen mukaan; oletus 960px yksi arvo, ellei toisin sanota.**

**Reunaehdot:**
- **2-sarakeasettelut säilyvät** (`.idp-cols` Aloitus · `.mit-cols` Mittaus D1|D2) — ne mahtuvat katon sisään (kartatkin
  ovat 2-sarakkeisia näissä mitoissa). Älä muuta niitä.
- **Tab-nav + kaikki sisältö keskittyvät** katon mukana (nav on `.jsp-right`:n sisällä — OK).
- **Mobiili (@media ~1000px):** `.jsp-box` on jo täysleveä; katto `max-width` ei haittaa (`width:100%` + 96vw hoitaa).
- **Ei-rail-vapaat tabit (Kehitys/Viikko, rail näkyvissä):** ei kattoa, ennallaan.

---

## INVARIANTIT + DoD
- **Kartta-mitta:** rail-vapaa sisältö ≤ ~960px (tai per-tab 1040/940), keskitetty — ei enää 1240px-venytystä.
- **Ei datahukkaa / ei rakennemuutosta:** vain leveys + keskitys. 2-sarakkeet, kaikki lohkot, arviointikoneisto ennallaan.
- **Brändi §5** · molemmat teemat · mobiili pinoutuu ennallaan.
- **LIVE ennen valmista (protokolla):**
  - **Aloitus/Mittaus/Arviointi:** sisältö keskitetty ~960px, ei venytystä; teksti lukeutuu oikeassa mitassa;
    Kehon valmius -palkit lyhenemmät/vertailtavat; arviointirivit tiiviimmät.
  - **2-sarakkeet** (Aloitus narratiivi|tutka · Mittaus D1|D2) ehjät katon sisällä.
  - **Kehitys/Viikko** (rail näkyvissä) ennallaan.
  - Molemmat teemat · kapea (mobiili) täysleveä. Vitest + eslint vihreä. Ei `?v`.

## EI TÄSSÄ (mahdollinen jatko)
Kehon valmius -palkit + tulkinta ("Mitä testit tarkoittavat") vierekkäin 2-sarakkeeseen = erillinen pieni pariutus jos Tero haluaa.
Type-scale hienosäätö kun mitta on korjattu (arvioidaan katon jälkeen — usein tarpeeton kun leveys on oikea).
