# Tehtävä: VP_v25 TKI-delta joukkuekortteihin + pelaajatason delta-analyysi

## Konteksti

Sibbo-Vargarnalle on nyt tuotu **kaksi tekniikkakilpailutulosta** (2025-10-06 + 2026-05-27/06-01).
`recalcIkaluokasta` on ajettu → pelaajien pikakentät `tki_edellinen` ja `tki_edellinen_pvm` ovat
populoituneet Firestoreen. Esim:

```
Morris Rönkkö: tki_viimeisin=24, tki_edellinen=35, tki_edellinen_pvm="2025-10-06"
Benjamin Lindström: tki_viimeisin=11, tki_edellinen=29
Elmeri Juurikkamäki: tki_viimeisin=12, tki_edellinen=23
```

**Ongelma:** VP_v25 joukkuekortit näyttävät aina "↻ 2. mittaus puuttuu" koska `laskeJoukkueSuunta`
(rivi ~5662) tarkistaa VAIN `hh_taso` + `hh_taso_edellinen`. Sibbo-datassa ei ole H-H-tuloksia →
suunta palautuu aina `ensimmainen_mittaus`. TKI-delta on olemassa mutta sitä ei näytetä.

Pelaajatason taulukossa (Pelaajat-työtila) TKI-sarake näyttää vain numeron + mitalin,
ei deltaa edelliseen.

## Tiedosto

`TalentMaster_VP_v25.html`

## Tehtävä 1: Joukkuekorttien suunta — lisää TKI-delta

### Nykyinen `laskeJoukkueSuunta` (rivi ~5662)

```javascript
function laskeJoukkueSuunta(joukkuePelaajat) {
  const ps = joukkuePelaajat.filter(function(p){ return p.hh_taso != null && p.hh_taso_edellinen != null; });
  if (ps.length === 0) return { symboli: null, delta: null, tila: 'ensimmainen_mittaus', ... };
  // ... H-H delta laskenta
}
```

### Muutos: yhdistetty suunta (H-H + TKI)

Jos H-H-delta löytyy → näytä se kuten nyt. Jos EI → fallback TKI-deltaan.
Joukkuekortin badge-logiikka (rivi ~5733):

```
if (suunta.tila === 'ensimmainen_mittaus') {
  // Tässä nyt näyttää "2. mittaus puuttuu" — KORJAA:
  // Jos TKI-delta löytyy, näytä se (eri teksti: "TKI" eikä "H-H")
}
```

**Toteutus:**

1. Laajenna `laskeJoukkueSuunta` ottamaan TKI-delta huomioon fallbackina:
   - Ensisijainen: `hh_taso` vs `hh_taso_edellinen` (kuten nyt)
   - Fallback: `tki_viimeisin` vs `tki_edellinen`
   - Palauta uusi kenttä `lahde: 'hh'|'tki'` jotta kortin teksti kertoo kumpi
   - TKI-delta: `tki_viimeisin - tki_edellinen` (positiivinen = parantunut, koska TKI 0-100)

2. Päivitä joukkuekortin renderöinti (rivi ~5733):
   - Jos `suunta.lahde === 'tki'`: näytä "↑ +5 TKI (8/15 parantunut)" (eikä "H-H")
   - Jos `suunta.lahde === 'hh'`: kuten nyt "↑ +0.3 H-H (12/20 parantunut)"
   - Vain jos MOLEMMAT puuttuvat → "2. mittaus puuttuu"

## Tehtävä 2: Pelaajalistan TKI-solu — delta näkyviin

### Nykyinen `_tkiSoluVP` (rivi ~6095) ja `_tekninenSoluVP` (rivi ~6110)

Näyttää vain numeron + mitalin, ei deltaa.

### Muutos: lisää delta-badge

Kun `p.tki_edellinen != null`:
- Laske `delta = p.tki_viimeisin - p.tki_edellinen`
- Näytä nuoli: `delta > 0` → `↑` vihreä · `delta < 0` → `↓` punainen · `0` → `→` harmaa
- Esim: `<strong>24</strong> 🥉 <span style="color:var(--teal);font-size:11px">↑+5</span>`

Sama logiikka `_tekninenSoluVP`:hin (D2-taso → ei suoraa deltaa, mutta TKI-delta tooltip).

## Tehtävä 3: Pelaajalistan H-H-solu — delta näkyviin (symmetria)

### Nykyinen `_hhSoluVP` (rivi ~6120)

Näyttää vain tason (1–5), ei deltaa.

### Muutos

Kun `p.hh_taso_edellinen != null`:
- `delta = p.hh_taso - p.hh_taso_edellinen`
- Nuoli kuten TKI: `↑` / `↓` / `→` + 1 desimaali
- Esim: `<strong style="color:#28B090">3.2</strong> <span style="font-size:11px;color:var(--teal)">↑+0.4</span>`

## Rajoitukset — ÄLÄ RIKO

- §7: **String concatenation `+`**, EI template literals (nested breaks)
- §5: Design-tokenit: `--teal` (#28B090) vihreä, `--red` / `var(--red)` punainen, `--ink3` harmaa
- VP_v25 käyttää omia luokkanimiä `jk-*`, `greeting-*` jne. Älä tuo v22:n luokkia
- Firestore-kenttänimet: `tki_viimeisin`, `tki_edellinen`, `tki_edellinen_pvm`, `hh_taso`, `hh_taso_edellinen`
- `node --check TalentMaster_VP_v25.html` pitää mennä läpi
- Testaa ajatuksessa: SJK (H-H mutta ei TKI), Sibbo (TKI mutta ei H-H), KPV/Demo (molemmat)

## Verifiointi

1. `node --check TalentMaster_VP_v25.html` — 0 virhettä
2. Sibbo joukkuekortit: TKI-suunta näkyy (ei "2. mittaus puuttuu")
3. SJK joukkuekortit: H-H-suunta näkyy kuten ennen
4. Pelaajalista: TKI- ja H-H-sarakkeet näyttävät deltan kun edellinen mittaus löytyy
