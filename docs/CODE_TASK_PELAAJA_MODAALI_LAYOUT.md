# Code-tehtävä: Pelaaja-modaalin (Pikakatsaus) layout — kaksisarakkeinen dashboard (VP_v25)

> Lähde: live-verify + mockup 2026-07-03 (Claude + Tero). PÄÄTÖS: **Vaihtoehto B (kaksisarakkeinen)**.
> Rajaus: VAIN `TalentMaster_VP_v25.html` `_avaaPerPelaajaPikakatsaus` (`_jspModal`, ~5125–5450) — **puhdas layout/CSS, EI dataa/logiikkaa/laskentaa**. §5 tokenit (app: `var(--bg2/--ink/--ink3/--teal/--border)`), §6 (yksi `@media(max-width:768px)`).

## Oire
Per-pelaaja-modaali tuntuu ahtaalta: (1) sisäboxi vain **640 px** (`_jspModal` ~5374), (2) 5D-radar puristettu **220 px** oikeaan kulmaan (~5400) iso tyhjä tila nimen vieressä, (3) akselinimet tungeksivat pientä radaria, (4) sisältö pitkä pystyvirta → paljon vieritystä. (Kuvan "Copilot"-nappi = selaimen elementti, EI appia → ei koske tätä.)

## Tavoite — Vaihtoehto B (kaksisarakkeinen)
Työpöydällä kaksi saraketta; profiili pysyy näkyvissä kun testejä selaa. Mobiilissa sarakkeet pinoutuvat (= pystyvirta).

```
┌──────────────────────────────────────────────┐
│ ← Sibbo-Vargarna T12                       ×  │  (sticky header, ennallaan)
├───────────────────┬──────────────────────────┤
│ VASEN (~290px)    │ OIKEA (1fr)               │
│ • Nimi + 5D-prof. │ • Välilehdet Fyysinen/    │
│ • ISO 5D-radar    │   Tekninen/Peli/Kehitys   │
│   (~290px)        │ • per-testi-palkit        │
│ • Ikävaihe-banneri│   (väljemmät rivit)       │
│ • D1/D2-kortit    │ • Kiihdytysprofiili-saate │
├───────────────────┴──────────────────────────┤
│               ← Edellinen · Seuraava →        │  (nav, ennallaan)
└──────────────────────────────────────────────┘
```

## Muutokset (layout)
1. **Levennä modaali** (`_jspModal` sisäbox ~5374): `width:640px` → **`width:min(1040px, 96vw)`** (työpöytä). max-height/overflow ennallaan.
2. **Kaksisarakkeinen runko:** korvaa nykyinen pystyvirta (hero-rivi → banneri → D1/D2 → per-testi → tabs) **CSS-gridillä** `grid-template-columns: 290px 1fr; gap: 22px` (sisällön wrapper, headerin ja nav:n väliin).
   - **Vasen sarake:** nimi + "5D-profiili (1–5)" + badget (Hidden Gem/RAE) + **5D-radar** + ikävaihe-banneri + **D1/D2-kortit**. (Kokoa nykyiset hero-rivin + D1/D2-osat tähän.)
   - **Oikea sarake:** per-testi-välilehdet (Fyysinen/Tekninen/Peli/Kehitys) + palkit + Kiihdytysprofiili-saate.
3. **Suurenna 5D-radar** (~5400): `width:220px` → **~290px**; `window._tmRadar5D(radarDims, {maxW: 290})` (funktio tukee `maxW`-optiota, ks. 4683/5061). Radar keskitettynä vasempaan sarakkeeseen → akselinimet hengittävät.
4. **Väljennä per-testi-palkit:** rivin pystypadding ~10–12px, tasomerkki selkeänä pillinä (nyk. logiikka/värit §5 ennallaan — vain väljyys).
5. **Nav (Edellinen/Seuraava ~5443)** pysyy modaalin pohjalla koko leveydeltä.

## Mobiili (§6 — yksi @media-lohko)
`@media(max-width:768px)`: grid → **yksi sarake** (`grid-template-columns:1fr`), radar takaisin ~220–240px keskitettynä, modaali täysleveä (jo olemassa `.jsv-box`-mobiilisääntö rivi 1581 — varmista ettei per-pelaaja-modaali riko sitä). = käytännössä Vaihtoehto A mobiilissa.

## Rajaus / EI tähän
- EI dataa/laskentaa: samat kentät, samat arvot (radarDims, friv-rivit, tabs) — vain uudelleenasettelu.
- EI Copilot-nappia (ei appissa).
- Arvioi (VP)- ja D3-kalibraatio-osiot pysyvät (sijainti: luonteva oikean sarakkeen loppuun tai nav:n viereen — Coden harkinta, dokumentoi).
- EI muita modaaleja (joukkuesyvänäkymä `.jsv-box` 920px ennallaan).

## Guardrailit
- §5 app-tokenit (`var(--bg2/--ink/--teal/--amber/--border)`), ei kiellettyjä. §6 yksi @media/tiedosto. §7.22 ei koske (VP-facing). Arviointi/data ennallaan.
- HTML-only muutos → version.json auto-bump mainissa hoitaa cachen (EI käsin bumppia, EI lib-?v:tä — lib ei muutu).
- Live-verify (SA, Sibbo T12/T13): työpöytä = kaksi saraketta, iso radar, väljät palkit; mobiili = pinottu; Edellinen/Seuraava toimii; ei leikkautumista.
