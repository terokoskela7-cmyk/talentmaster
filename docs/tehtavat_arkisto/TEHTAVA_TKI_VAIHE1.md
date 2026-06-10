# Tehtävä: TKI-analyysimalli VAIHE 1 — TK_LAJIVIITTEET käyttöön

> Speksi: `docs/TKI_ANALYYSIMALLI.md` (lue ensin kokonaan). Data on valmiina —
> tämä tehtävä on integrointi + funktiot + pikakentät + valmentajan detail-paneeli.
> Pelaaja_v7- ja VP-näkymät EIVÄT kuulu tähän tehtävään (vaihe 2).

## Konteksti

Valtakunnalliset loppukilpailutulokset 2023–2025 on parsittu (84 riviä, summavalidointi
0 virhettä). Tuotokset valmiina:
- `docs/tk_lajiviitteet.js` — TK_LAJIVIITTEET-vakio (per-laji viitetasot, syntaksi tarkistettu)
- `docs/data/taitokisa_2023_2025.json` — raakadata
- `docs/data/parse_taitokisa.py` — parseri vuosipäivityksiin

## Osatehtävä A — Merge TK_LAJIVIITTEET → testit_indeksit.js

1. Kopioi `TK_LAJIVIITTEET`-vakio tiedostosta `docs/tk_lajiviitteet.js` tiedostoon
   `docs/testit_indeksit.js` (kommentteineen — ne dokumentoivat lähteen ja rajaukset).
2. Lisää exporttiin (sama pattern kuin TK_KOKONAISRAJAT).
3. ÄLÄ poista `docs/tk_lajiviitteet.js` — se jää generoiduksi lähteeksi.

## Osatehtävä B — Uudet funktiot + Vitest-testit

Lisää `docs/testit_indeksit.js`:ään (ja testit `tests/`-hakemistoon, A2-infra on jo):

```javascript
tkLajiViite(laji, ika, sp)
// → { erinomainen, hyva, n } | null
// null jos ikä/sp/laji puuttuu (esim. P11, ika>13, pituuspotku_bonus ika<12).
// EI interpolointia puuttuville i'ille — radat ovat ikäluokkakohtaisia.

tkLajiGapit(tkLajit, ika, sp)
// tkLajit = { ponnauttelu_s, syotto_s, pujottelu_s, kuljetus_laukaus_s, pituuspotku_bonus_s }
// → [ { laji, arvo, viite, gap_s, taso: 'erinomainen'|'hyva'|'kehitettava' } ]
//   järjestettynä gap_s laskevasti (suurin kehityspotentiaali ensin).
// gap_s = max(0, arvo − viite.hyva) aikalajeille (pienempi=parempi).
// pituuspotku_bonus KÄÄNTEINEN: suurempi=parempi → gap_s = max(0, viite.hyva − arvo).
// kuljetus_laukaus_s = NETTOTULOS (raaka − vähennykset).

tkSekuntibudjetti(kokonaistulos, ika, sp)
// → { tavoite: 'kulta'|'hopea'|'pronssi', gap_s } | null
// Seuraava SAAVUTTAMATON mitalitaso: jos tulos < kulta → null (huipulla, ylläpito).
// Mitalivertailu < EI <= (§23). ika 8–13, muuten null.

tkVaadittuVuosivauhti(ika, sp, taso)
// → s/v (positiivinen = rajat kovenevat) | null
// = TK_KOKONAISRAJAT[sp][ika][taso] − TK_KOKONAISRAJAT[sp][ika+1][taso]
// null jos: ika+1 > 13, TAI siirtymä 9→10 (rata muuttuu, rajat löystyvät — ei validi).

tkAbsDelta(kokonaisNyt, kokonaisEd, ikaNyt, ikaEd, bonusNyt, bonusEd)
// → { abs_s, validi: bool, bonus_osuus_s }
// abs_s = kokonaisEd − kokonaisNyt (+ = parani).
// validi = false jos ikäpari ylittää 9→10-rajan tai ika ei 8–13.
// bonus_osuus_s = (bonusNyt||0) − (bonusEd||0) — kuinka suuri osa parannuksesta
// tuli pituuspotkubonuksesta (P11→P12-siirtymän kommunikointi, speksi §3.3.2).
```

**Vitest-testit (vähintään):** tkLajiViite P12/T12/P11(null)/pituuspotku-ikäraja ·
tkLajiGapit järjestys + käänteinen pituuspotku + puuttuvat lajit · tkSekuntibudjetti
rajatapaukset (tasan rajalla EI mitalia → tavoite on se taso) · tkVaadittuVuosivauhti
9→10 null + 11→12 = 20 (P/hopea) · tkAbsDelta validius + bonusosuus.
Aja `npm test` — kaikki vihreät (85 vanhaa + uudet).

## Osatehtävä C — Pikakentät TK-tuontiin + recalciin

Tiedosto: `TalentMaster_Excel_Tuonti.html` (Excel-tuonti + PDF-tuonti + recalc-työkalut).

Uudet pikakentät pelaajadokumenttiin (merge:true), kirjoitus KAIKISSA kolmessa
TK-kirjoituspisteessä (Excel-tallennus, PDF-tallennus, recalc-funktiot):

```
tk_lajit_viimeisin: { ponnauttelu_s, syotto_s, pujottelu_s,
                      kuljetus_laukaus_s,        // NETTO (tulos, ei raaka)
                      pituuspotku_bonus_s }      // vain ika>=12, muuten ei kenttää
tk_lajit_pvm: string (YYYY-MM-DD)
tk_kokonaistulos_viimeisin: number (s)
tk_kokonaistulos_edellinen: number|null
tk_kokonaistulos_edellinen_pvm: string|null
```

- `_edellinen` vangitaan VAIN aidolla uudella testillä — **pvm-vahti**
  `vanhaPvm !== uusiPvm` (sama pattern kuin §29 VAIHE 2 `tki_edellinen`).
- **recalc EI vangitse edellistä** (norm-migraatio ≠ kehitys, §29).
- Kun recalc ajetaan ja TK-tulosta ei ole → nollaa pikakentät (null), sama
  periaate kuin `tki_viimeisin`-recalcissa (§24).
- Ikä: pelaajan `syntymaVuosi` + testituloksen `pvm`-vuosi; fallback `ikaluokka`-
  kentästä (§24 recalc-säännöt). Puuttuvat arvot → kenttä pois, ei 0.

## Osatehtävä D — Master_v16 TKI-detail laajennos

Tiedosto: `TalentMaster_Master_v16.html`, funktio `_buildTKIDetail` (§29 VAIHE 1).

Lisää nykyiseen paneeliin (speksi §5.2 esimerkki):
1. **Per-laji-rivit:** arvo · viitetaso (`tkLajiViite`) · gap sekunteina · merkintä
   ★ (taso erinomainen) / ← (suurin gap = kehityskohde). Lähde `tk_lajit_viimeisin`-
   pikakentästä — EI alikokoelmakyselyä (§26). Jos pikakenttä puuttuu → näytä
   nykyinen paneeli ennallaan (data-tietoinen UI, periaate 7).
2. **Sekuntibudjetti-rivi:** `tkSekuntibudjetti` + 2–3 suurinta `tkLajiGapit`-riviä:
   "Pronssiin puuttuu 9.4 s → pujottelu 3.5 s · ponnauttelu 3.8 s".
3. **Vauhtirivi** (kun `tk_kokonaistulos_edellinen` on): abs-delta + vaadittu vauhti:
   "Parani 6.0 s ✅ · ikäluokkavaatimus kovenee 5 s/v". Jos bonus_osuus_s > 0,
   lisää "(josta pituuspotkubonus X s)".
4. Otsikoi viitetasot **"Loppukilpailutaso 2023–25"** — EI "mitaliraja" (per-laji-
   mitaleja ei ole, §31). Jos `_n < 10` → lisää "(suuntaa-antava, n=X)".
5. Kultaikkuna-konteksti (≤12 🔥 / 13–14 ⚡ / ≥15 📊) — lisää jos ei vielä ole.

## Rajoitukset — ÄLÄ RIKO

- §7.1: string concatenation `+`, EI nested template literals
- §5: design-tokenit `var(--teal)` / `var(--red)` / `var(--ink3)` / `var(--amber)`
- §31: mitali VAIN kokonaisajasta — per-laji = "viitetaso", ei koskaan "mitali"
- §23: mitalivertailu `<` ei `<=`; TKI vain ika 8–13
- §26: detail-paneelit lukevat VAIN pikakentistä, ei alikokoelmakyselyjä
- §29: recalc ei vangitse `_edellinen`-kenttiä; pvm-vahti tuonnissa
- P11: ei viitetasoa → "—", EI interpolointia
- Suunta: kaikki aikalajit pienempi=parempi; pituuspotku_bonus suurempi=parempi
- Canonical-funktiot vain `docs/testit_indeksit.js`:ään; inline-kopiot HTML:iin
  samalla synkronointikommentilla kuin tkLaskeTKI:llä

## Verifiointi

1. `npm test` — kaikki testit vihreät (vanhat 85 + uudet)
2. `node --check docs/testit_indeksit.js` — 0 virhettä
3. Inline-scriptien syntaksi: Excel_Tuonti + Master_v16 (vm.Script-tarkistus)
4. Skenaariot ajatuksessa:
   - Sibbo P10 -pelaaja (TKI on, ei H-H): per-laji-rivit + budjetti näkyvät
   - P11-pelaaja: viitetasosarake "—", paneeli ei kaadu
   - Kulta-pelaaja: budjetti → "huipputaso — ylläpito"
   - P12 toinen mittaus: vauhtirivi + bonusosuus näkyy
   - Pelaaja ilman tk_lajit_viimeisin-kenttää (vanha data ennen recalcia):
     paneeli toimii kuten ennen
5. Commit: "TKI VAIHE 1: TK_LAJIVIITTEET + gap/budjetti/vauhti-funktiot +
   pikakentät + Master TKI-detail" + push. Aja `npm run version:bump` (§33).
6. Muistutus käyttäjälle lopuksi: aja **↻ Laske TKI uudelleen** -recalc Sibbolle
   ja KPV:lle jotta `tk_lajit_viimeisin` populoituu.
