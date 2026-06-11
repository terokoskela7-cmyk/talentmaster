# Tehtävä: H-H/TSI-analyysimalli VAIHE 2 — VP syvänäkymän Fyysinen-osio

> Speksi: `docs/HH_TSI_ANALYYSIMALLI.md` §3.1 (lue §0 PHV-suodatin + §7 päätökset).
> Edellytys: VAIHE 1 ajettu (2e213ef) + recalcHH ajettu SJK:lle — pikakentät
> populoitu: d1_taso 58 · hh_kehityskohde 58 (P14: 6× sm_pallo, 0 fyysistä ✅) ·
> hh_vahvuus 25 · tsi_viimeisin 56. Tiedosto: `TalentMaster_VP_v25.html`.
> UUDELLEENKÄYTÄ TKI-Yhteenvedon helpereitä/CSS:ää (jsv-an-*) — älä duplikoi.
> Pelaaja-näkymä (VAIHE 3) EI kuulu tähän.

## Sijoitus

Joukkue-syvänäkymä (`avaaJoukkueSyvanakyma`): TKI-analytiikka asuu
Yhteenveto-välilehdessä. Fyysinen osio lisätään SAMAAN Yhteenveto-välilehteen
TKI-lohkojen jälkeen omalla väliotsikolla ("FYYSINEN (H-H)") — EI uutta tabia
(VP:n syvänäkymässä on jo 3 tabia; neljäs hajottaisi). Data-tietoinen: koko
osio renderöityy vain jos joukkueessa on H-H-dataa (SJK ✅, Sibbo ❌ → ei osiota).
Vastaavasti TKI-lohkot jäävät pois kun TK-dataa ei ole (toimii jo) — SJK:lla
Yhteenveto näyttää siis vain Fyysisen osion.

## Osatehtävä A — Yhteenveto: FYYSINEN-lohkot

### A1. Tasojakauma
hh_taso-histogrammi tasoittain 1–5 (samat palkki-helperit kuin TKI-histogrammi)
+ ka + kattavuus "n=58/61". Värit: ≥3.5 teal · 2.5–3.4 amber · <2.5 red (sama
vari5-logiikka kuin joukkuekorteissa).

### A2. Per-testi joukkueprofiili
Per testi (lin10m/lin30m/cmj/mas + sm_juoksu/sm_pallo): joukkueen ka vs
taso-3-kynnys (`eerikkilaNormiarvo` tai hhSeuraavaTaso-kynnykset) → palkki + gap:
```
30m      ka 4.52 s   taso-3 ≤4.40 s   −0.12 s   ████░░  ← kauimpana
CMJ      ka 36.1 cm  taso-3 ≥35.0 cm  +1.1 cm   ██████  ★
MAS      ka 15.2 km/h taso-3 ≥15.8    −0.6      ████░   (n=33/56)
```
- MAS: ÷3.6 laskentaan, km/h näyttöön (§30) — ÄLÄ laske ka:ta sekayksiköillä.
- Kattavuus per testi näkyviin kun < 80 % ("n=33/56").
- Ikä/sp joukkuetasolla: joukkuenimestä (sama kuin lyhennaNimi-logiikka).

### A3. Kehityskohde-klusterointi
`hh_kehityskohde`-pikakentistä: "13/19 pelaajalla heikoin 30m → nopeusteema" —
suurin klusteri ensin, max 3 riviä. PHV-konteksti mukaan:
- Jos joukkueen phvVarmuus on ikäoletus-tasoa (ei mitattua PHV:tä) → rivin perään
  "(ikäoletus)". Joukkue jossa epavarma-pelaajia (P14): "+ N pelaajaa odottaa
  kasvumittausta" -rivi.
- sm_pallo-klusteri → teema "pallollinen nopeus", ei "tekniikkavaje"-sanaa.

### A4. TSI-jakauma
`tsi_viimeisin`-vyöhykkeittäin (≤0 🔥 / 0–0.5 ✅ / 0.5–1.0 / >1.0 ⚠️ / >1.5 🔴)
vaakapalkkeina + 🔴-pelaajien laajennettava nimilista (sama laajennuspattern
kuin TKI:n "lähellä merkkiä").

### A5. Kasvumittaus-CTA
Kun joukkueen PHV-kattavuus < 50 % (SJK: 0 %): amber-infolaatikko
"Kasvumittaus puuttuu — fyysiset kehityskohteet perustuvat ikäoletukseen.
Mittaa: Testaus_v9 → kasvumittaus (~3 min/pelaaja)." EI uhkakieltä, yksi rivi.

### A6. Treeniteema-CTA-kytkös
Suurin A3-klusteri → "Luo harjoitustapahtuma" esitäytöllä (sama `_jsvTreema`-
mekanismi kuin TKI:ssä — laajenna tukemaan H-H-teemoja).

## Osatehtävä B — Tuki-välilehti: fyysinen ulottuvuus

Nykyinen Tuki ryhmittelee TK-kehityskohteittain. Lisää H-H-ryhmät SAMAAN
listaan kun `hh_kehityskohde` on (SJK: TK-ryhmiä ei ole → vain H-H-ryhmät):
- Ryhmäotsikko: "30m-ryhmä (13)" + 📋-kopiointinappi (sama helper).
- Rivillä: nimi · testin arvo · gap seuraavaan tasoon (`hhSeuraavaTaso`) —
  järjestys gap laskevasti.
- `hh_kehityskohde === null` (P14 ilman sm_palloa) → ryhmä "Odottaa
  kasvumittausta (N)" listan loppuun — EI "ei kehityskohdetta" -kieltä.

## Osatehtävä C — Pelaajalistan H-H-laajennus (pieni)

Pelaajat-välilehden taulukkoon (syvänäkymän sisällä): D1-sarake (`d1_taso`,
hhTasoVari-väri) jos ei jo ole. Päätaulukon (Pelaajat-työtila) `_hhSoluVP`
EI muutu tässä.

## Osatehtävä D — getIdToken-korjaus (§7.2, pieni mutta pakollinen)

`recalcHH`:n (ja recalcIkaluokasta/_adminLaskeTkiUudelleen jos puuttuu) alkuun:
`await firebase.auth().currentUser.getIdToken(true)` ennen kirjoituksia.
Tausta: 2026-06-11 ajo kaatui 58/58 permission-denied — vanhentunut sessio.

## Rajoitukset — ÄLÄ RIKO

- §26 vain pikakentät, ei alikokoelmakyselyjä · EERIKKILA_NORMIT/lib-funktiot =
  SSOT (lib on jo ladattu VP:hen ?v=3) · MAS km/h↔m/s
- PHV-suodatin: ÄLÄ päättele kehityskohteita UI:ssa — käytä VAIN
  `hh_kehityskohde`-pikakenttää (suodatin asuu hhKehityskohde-funktiossa)
- §7.1 string concat · §5 tokenit · §6 yksi @media · jsv-*-luokat skoopattuna
- Typografia: 37b01de-taso (arvot ≥14px, ei alle 11px)
- Data-tietoinen UI: SJK = vain Fyysinen · Sibbo = vain TKI · ei tyhjiä lohkoja

## Verifiointi

1. Inline-syntaksi (vm.Script) + `npm test` vihreä (D-kohdan muutos ei riko)
2. Selaimessa:
   - SJK P15 -syvänäkymä: A1–A6 renderöityvät; klusterit täsmäävät dataan
     (P15: lin30m 13 · mas 3 · lin10m 2 · cmj 1); kasvumittaus-CTA näkyy
   - SJK P14: klusteri "sm_pallo 6" + ei fyysisiä; Tuki ilman null-ryhmää
     (kaikilla P14:llä on kohde)
   - SJK P16: mas-klusteri kärjessä (5/7), MAS-arvot km/h-järkeviä
   - Sibbo P10: Fyysinen-osio EI renderöidy, TKI-osiot ennallaan
   - Tuki: H-H-ryhmät + kopiointi toimii
3. Commit: "HH VAIHE 2: VP syvänäkymän Fyysinen-osio + Tuki H-H-ryhmät +
   getIdToken-korjaus" + push + `npm run version:bump`
