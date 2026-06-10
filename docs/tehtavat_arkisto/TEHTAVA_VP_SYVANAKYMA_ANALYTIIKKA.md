# Tehtävä: VP_v25 joukkue-syvänäkymän analytiikkalaajennos (Tuki + Yhteenveto)

> Edellytys: TKI VAIHE 1 (commit 3e47a68) + UI-typografiatehtävä
> (`docs/TEHTAVA_UI_DETAIL_JA_JOUKKUEKORTTI.md`) ajettu ensin.
> Speksi: `docs/TKI_ANALYYSIMALLI.md` §5.1. Data on populoitu: Sibbolla 214
> pelaajalla `tk_lajit_viimeisin` + `tk_kokonaistulos_viimeisin` + `tki_edellinen` (95).
> Tiedosto: `TalentMaster_VP_v25.html`. Ankkurit: `avaaJoukkueSyvanakyma` (r. ~3289),
> Yhteenveto-sisältö t3 (r. ~3384), tabit (r. ~3466), `_jsvLuoTapahtuma` (r. ~3248).

## Osatehtävä 0 — TK_LAJIVIITTEET-resynkronointi (TEE ENSIN)

`docs/tk_lajiviitteet.js` on regeneroitu VAIHE 1:n jälkeen (2026-06-10): lisätty
alueelliset viitteet **P8 (n=20) · P11 (n=20) · P13 (n=7) · T8 (n=18) · T13 (n=11)**
+ `_lahde`-kenttä ('valtakunnallinen'|'alueellinen') jokaiseen ikäluokkaan.
Kattavuus on nyt TÄYSI: P8–P13 ja T8–T13.
`docs/testit_indeksit.js` (ja mahdolliset inline-kopiot) sisältävät VANHAN version.
LISÄKSI: korjaa `TK_KOKONAISRAJAT` T13 pronssi 130 → **135** (kaksi riippumatonta
alueellista PDF:ää vahvistaa; ks. TKI_ANALYYSIMALLI.md §8.8) + päivitä siihen
liittyvät testit.

1. Kopioi uusi `TK_LAJIVIITTEET` docs/tk_lajiviitteet.js → docs/testit_indeksit.js
   (korvaa vanha vakio kommentteineen) + päivitä inline-kopiot (Master_v16 jne.)
   samalla synkronointikommentilla.
2. `tkLajiViite()` palauttaa jatkossa myös `_lahde`-tiedon.
3. Master_v16 TKI-detail: viite-otsikko luetaan `_lahde`-kentästä —
   'valtakunnallinen' → "Loppukilpailutaso 2023–25" ·
   'alueellinen' → "Alueellinen huipputaso 2025 (suuntaa-antava)".
4. Tarkista Vitest-testit: P11/P13 eivät enää palauta null → päivitä testiodotukset
   (P11 testattiin null-casena VAIHE 1:ssä). Lisää uusi null-case: T13 / ika 14.

## ⚠️ DATARAJOITE (päivitetty 2026-06-10, v2)

`TK_LAJIVIITTEET` kattaa nyt KAIKKI ikäluokat: **P8–P13 ja T8–T13.**
- `tkLajiViite()` palauttaa silti null kun ika < 8 tai > 13 → per-laji-viitevertailu
  "—", **EI fallbackia, EI interpolointia, EI extrapolointia**.
- Viite-label AINA dynaaminen `_lahde`-kentästä (ks. Osatehtävä 0.3).
- n<10 (P13 n=7) → "(suuntaa-antava, n=X)" -merkintä.
- `tkSekuntibudjetti` TOIMII 13-vuotiaille (TK_KOKONAISRAJAT kattaa 8–13) — budjetti-
  ja mitalianalyysi näytetään aina kun ikä 8–13.
- Ikä/sp johdetaan kuten muuallakin VP:ssä: `syntymaVuosi` → fallback joukkuenimestä
  ("P13" → 13/M).

## Osatehtävä A — Yhteenveto-välilehti (t3) uusiksi

Korvaa nykyinen ohut sisältö (mitalilaskuri + yleisin vahvuus/kehityskohde +
kattavuus) viidellä lohkolla. Kaikki lasketaan modaalin jo lataamasta
pelaajadatasta (pikakentät) — EI uusia Firestore-kyselyjä (§26).

### A1. TKI-jakauma histogrammina
Bucketit 0–20 / 20–40 / 40–60 / 60–80 / 80+ vaakapalkkeina (n + osuus).
Mitalilaskuri (🥇🥈🥉) säilyy yhtenä rivinä histogrammin alla.

### A2. Per-laji joukkueprofiili (VAIHE 1:n ydinhyöty)
Per laji (ponnauttelu/syöttö/pujottelu/kuljetus-laukaus, + pituuspotku_bonus jos ≥12v):
joukkueen ka (`tk_lajit_viimeisin`-kentistä) vs `tkLajiViite().hyva` → palkki + gap:
```
Ponnauttelu   ka 18.4s   hyvä ≤16.2s   +2.2s  ████████░░  ← kauimpana
Kulj-laukaus  ka 14.9s   hyvä ≤14.5s   +0.4s  ██████████  ★ lähimpänä
```
Värit: gap ≤0 teal · 0–20% amber-neutraali · >20% viitteestä red.
Pituuspotku_bonus käänteinen (suurempi=parempi). Viite puuttuu → arvo ilman palkkia.
Tämä KORVAA "Yleisin vahvuus/kehityskohde" -rivit (kvantifioitu versio samasta).

### A3. Lähellä merkkiä
`tkSekuntibudjetti(tk_kokonaistulos_viimeisin, ika, sp)` per pelaaja →
"7 pelaajaa ≤10 s päässä pronssista · 2 ≤10 s hopeasta". Klikkaus → listaa nimet
(laajenna/supista, ei uutta modaalia). Vain ika 8–13.

### A4. Kehitysvauhti
Pelaajista joilla `tki_edellinen != null`: parantuneet (TKI-delta > 0) / ennallaan /
laskeneet + `tkVaadittuVuosivauhti`-konteksti:
```
Kehitysvauhti: 23/40 paransi TKI:tä · ikäluokkavaatimus kovenee 5 s/v
```
HUOM §3.2-invariantti: jos abs-delta saatavilla (tk_kokonaistulos_edellinen),
ilmoita myös "X paransi kokonaisaikaa". Ei punaista pelkästä TKI-laskusta.

### A5. Treeniteema-suositus + CTA-kytkös
Suurin per-laji-gap (A2) → "Suositus: ponnauttelu-teema 2 vko (28/49 kehityskohde)".
"Luo harjoitustapahtuma" -nappi (`_jsvLuoTapahtuma`) saa esitäytetyn teeman
(välitä laji parametrina; jos tapahtumalomake ei tue esitäyttöä, lisää teema
tapahtuman nimen oletukseksi).

## Osatehtävä B — Tuki-välilehti

Nykyinen: ryhmittely kehityskohteittain. Laajenna:
1. **Gap-määrä per pelaaja:** rivillä nimi + lajin arvo + gap hyvä-viitteeseen
   ("Rämäkkö · ponnauttelu 40.0s · +26.9s"), ryhmän sisällä järjestys gap laskevasti
   — suurin tuen tarve ylimpänä. Viite puuttuu (13v) → järjestä lajin arvon mukaan.
2. **Harjoitusryhmäjako:** ryhmät = kehityskohde-lajit, otsikkona "Ponnauttelu-ryhmä
   (28)" — kopioitava lista (📋-nappi → clipboard, nimet rivinvaihdoin).
3. **Aito taantuma -merkki:** TKI-delta < 0 JA abs-delta < 0 (kun molemmat
   saatavilla) → punainen piste + tooltip "Kokonaisaika heikkeni edellisestä".
   Pelkkä TKI-lasku abs-parannuksella → EI hälytystä (§3.2).

## Osatehtävä C — Radar data-tietoiseksi (vasen sarake)

Kun vain D2 on saatavilla (kuten Sibbo: 4/5 akselia "tulossa"), radar vie puolet
modaalista tyhjänä. Korjaus: jos saatavilla < 3 dimensiota → korvaa radar kompaktilla
dimensiokortilla (saatavilla olevat arvot + yksi rivi "D1/D3/D4/D5 tulossa").
Radar renderöidään kun ≥3 dimensiota (linjassa OVR-periaatteen §1.8 kanssa).

## Rajoitukset — ÄLÄ RIKO

- §7.1 string concatenation · §5 design-tokenit · §26 ei alikokoelmakyselyjä
- VP:n omat luokkanimet (jsv-*) — skoopatut tyylit #_jsvModal:iin kuten nyt
- Kanoniset funktiot: jos `tkLajiViite`/`tkLajiGapit`/`tkSekuntibudjetti`/
  `tkVaadittuVuosivauhti` eivät ole VP_v25:ssä, kopioi inline `docs/testit_indeksit.js`:stä
  samalla synkronointikommentilla kuin muut inline-kopiot
- EI viitetaso-fallbackia puuttuville ikäluokille (ks. datarajoite yllä)
- Mitali vain kokonaisajasta; per-laji = "loppukilpailuviite" (§31)
- Yksi @media(max-width:768px) per tiedosto (§6) — modaali on jo responsiivinen
  (r. ~1421), varmista uudet lohkot toimivat kapealla

## Verifiointi

1. Inline-syntaksi (vm.Script) — 0 virhettä
2. Selaimessa (Chrome MCP):
   - Sibbo P10: A2-palkit viitteillä ("Loppukilpailutaso 2023–25") + A3 + A4 näkyvät
   - Sibbo P13: A2-palkit viitteillä, label "Alueellinen huipputaso 2024–25
     (suuntaa-antava, n=7)"; budjetti toimii
   - 14v+ joukkue / ika ei 8–13: laji-keskiarvot ILMAN viitepalkkia, ei kaadu
   - SJK (ei TK-dataa): Yhteenveto näyttää H-H-pohjaisen sisällön / "ei TK-dataa"
     -tilan siististi, ei kaadu
   - Tuki: gap-järjestys + kopiointinappi toimii
3. `npm test` vihreä
4. Commit + push + `npm run version:bump`
