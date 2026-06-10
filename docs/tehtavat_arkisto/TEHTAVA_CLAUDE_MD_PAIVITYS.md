# Tehtävä: CLAUDE.md + dokumentaation synkronointi (2026-06-11 muutosaalto)

> Commitit 37b01de…80cb332 toivat ison muutosaallon jota CLAUDE.md ei tunne.
> Seuraava Claude-sessio ilman näitä päivityksiä toistaa vanhoja virheitä.
> PUHDAS DOKUMENTAATIOTEHTÄVÄ — ei koodimuutoksia. Tyyli: CLAUDE.md on tiivis
> invarianttidokumentti — kirjoita samalla tiheydellä kuin olemassa olevat §:t.

## 1. UUSI §34 — TKI-ANALYYSIMALLI (kanoninen viite docs/TKI_ANALYYSIMALLI.md)

Tiivistä §34:ään (täysi doc voittaa ristiriidassa, sama pattern kuin §30):
- Kolme viitekehystä: A mitaliraja (TK_KOKONAISRAJAT, vain kokonaisaika) ·
  B eliittiviite (`TK_LAJIVIITTEET`, per-laji, EI mitali) · C populaationormi
  (H-H 1–3). A=taso, B=kohde+määrä, C=pohja.
- `TK_LAJIVIITTEET[sp][ika][laji] = {erinomainen, hyva}` + `_n` + `_lahde:
  'valtakunnallinen'|'alueellinen'`. Kattavuus P8–P13, T8–T13 (T8 alueellinen).
  Lähteet: valtak. loppukilpailut 2023–25 (9/10/12v + T11) · alueelliset
  Eteläinen 2025 ×2 + Pohjoinen 2024 (P8/P11/P13/T8/T13, top-20 kokonaisajalla).
  UI-label AINA `_lahde`-kentästä. EI interpolointia. Päivitys:
  `docs/data/parse_taitokisa.py` (valtak.) + `parse_taitokisa_alue.py` (alue,
  LAHTEET-lista).
- Kanoniset funktiot (testit_indeksit.js): `tkLajiViite` · `tkLajiGapit` ·
  `tkSekuntibudjetti` · `tkVaadittuVuosivauhti` (9→10 null, rata muuttuu) ·
  `tkAbsDelta` (validius + pituuspotkubonus-osuus).
- **Kaksi deltaa -invariantti (§3.2):** abs-delta JA TKI-delta aina erikseen;
  TKI-laskua EI punaisena jos abs parani; pelaajalle TKI-laskua ei näytetä lainkaan.
- Vaadittu vuosivauhti ~5–10 s/v; P11→P12 −20 s sis. pituuspotkubonuksen.

## 2. §26 PIKAKENTÄT — lisää taulukkoon TK-rivi

`tk_lajit_viimeisin {ponnauttelu_s, syotto_s, pujottelu_s, kuljetus_laukaus_s
(NETTO), pituuspotku_bonus_s (vain ≥12v)}` · `tk_lajit_pvm` ·
`tk_kokonaistulos_viimeisin/_edellinen/_edellinen_pvm` (pvm-vahti; recalc EI
vangitse edellistä). Kirjoituspisteet: Excel-tuonti, PDF-tuonti, recalc ×2
(`_tkLajitPikakentat`-helper).

## 3. §23/§31 — korjaukset ja toteutumat

- §23: **TK_KOKONAISRAJAT T13 pronssi = 135** (oli 130; kaksi riippumatonta
  alueellista PDF:ää vahvisti). Korjattu koodiin 3 kopioon.
- §31: Sprint 5 -kohta "per-laji viitetasot rakennetaan" → ✅ TOTEUTETTU
  (TK_LAJIVIITTEET). Päivitä teksti: per-laji-taso on VIITETASO loppukilpailu-/
  aluedatasta, ei mitali (tämä invariantti säilyy).

## 4. §24 — recalc hyväksyy historiapohja-docit

Lisää: `_adminLaskeTkiUudelleen` + `recalcIkaluokasta` hyväksyvät docin jossa
`kokonaistulos_s` TAI (`protokolla=='tekniikkakilpailu'` && testit-map) —
kokonaistulos lasketaan kanonisella `laskeKokonaistulos`-funktiolla puuttuessa.
(80cb332; aiempi suodatus ohitti historiapohja-tuonnit hiljaa.)

## 5. §19 VP_v25 + §16 Pelaaja_v7 — tilapäivitykset

- §19: syvänäkymä-analytiikka (TKI-histogrammi · per-laji joukkueprofiili
  viitteillä · lähellä merkkiä · kehitysvauhti · treeniteema-CTA · Tuki gap-
  järjestys + ryhmäjako + aito taantuma -merkki · radar <3 dim → dimensiokortti ·
  _jspModal Tekninen per-laji+budjetti+delta). Joukkuekorttien TKI-fallback-
  suunta + pelaajalistan delta-badget (ff36a4a).
- §16: MINÄ→Tekniikkaprofiili tavoiterivit (★vahvuus · 🎯sekuntitavoite:
  gap≤3s→hyvä-viite, muuten −3 s/0.5 s · 🏅mitalimatka vain ≤15 s, positiivinen ·
  📈abs-parannus vain >0 · 🔥kultaikkuna ≤12 v ilman uhkakehystä) + TÄNÄÄN
  T-saate kehityskohteesta. Pelaaja lataa testit_indeksit.js:n (TM_TESTIT) —
  ei inline-duplikaattia. SW v3.

## 6. §27.4 SW — varmista että allowlist-kirjaus on ajan tasalla

be75c5c päivitti jo §27.4:ää — tarkista että siinä on: allowlist-periaate,
network-first oma HTML, cache v2/v3, activate siivoaa KAIKKI vieraat cachet,
precache-polkujen 404 estää installin (FC-bonuslöydös). Lisää puuttuvat.

## 7. §8 AVAINTIEDOSTOT — uudet rivit

`docs/TKI_ANALYYSIMALLI.md` (kanoninen analyysimalli + kehitysvauhti) ·
`docs/tk_lajiviitteet.js` (generoitu vakio, SSOT-lähde mergelle) ·
`docs/data/taitokisa_2023_2025.json` + `taitokisa_alue_2024_2025.json` (raakadata)
· `docs/data/parse_taitokisa*.py` (parserit, vuosipäivitys).

## 8. Siivous

- `docs/TEHTAVA_*.md` (7 kpl) = suoritettuja tehtäväprompteja → siirrä
  `docs/tehtavat_arkisto/`-kansioon (git mv, säilytä historia).
- `docs/ROADMAP.md`: lisää 2026-06-10/11 -merkintä (TKI-analyysiketju VP +
  valmentaja + pelaaja; SW-korjaus).
- Päivitä CLAUDE.md:n otsikon "Viimeksi päivitetty" -rivi.

## Verifiointi

1. Lue muutettu CLAUDE.md läpi ja tarkista ristiviittaukset (§-numerot eivät
   mene päällekkäin; §34 on vapaa).
2. `git mv`-siirrot eivät riko mitään viittausta (grep TEHTAVA_ koodista — ei
   pitäisi löytyä).
3. Commit: "docs: CLAUDE.md §34 TKI-analyysimalli + §16/§19/§23/§24/§26/§27/§31
   synkronointi + tehtäväarkisto" + push. Ei version:bumpia (ei app-muutoksia).
