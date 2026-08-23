# Code-brief — Sopimukset viralliseksi Word-tiedostoksi (SJK + Sibbo)

> **Tehtävä:** generoi viimeistellyistä markdown-sopimuksista **viralliset, muokattavat .docx-tiedostot** toistettavalla
> pipelinellä (editoi .md → aja skripti → docx päivittyy). Ei sisältömuutoksia sopimustekstiin — vain muotoilu/vienti.
> **Kohde:** `docs/SOPIMUS_SIBBO_2026.md` (Taso 1) + `docs/SOPIMUS_SJK_2026.md` (Taso 2). Molemmat sisältävät jo
> **perustajaseura-ehdot (70 €/kk lukittu, §6)** — käytä niitä sellaisenaan. Valinnaisesti myös `docs/LASKUTUSAIKATAULU_2026.md`.

## Toteutus
- **Työkalu:** `pandoc` + **reference-doc-templaatti** (`--reference-doc`). Ei käsin-Word-editointia — pipeline on toistettava.
- **Skripti:** `scripts/build_sopimukset.sh` (tai `.js`), joka ajaa:
  ```
  pandoc docs/SOPIMUS_SIBBO_2026.md  --reference-doc=docs/templates/tm_sopimus_referenssi.docx -o docs/sopimukset/SOPIMUS_SIBBO_2026.docx
  pandoc docs/SOPIMUS_SJK_2026.md    --reference-doc=docs/templates/tm_sopimus_referenssi.docx -o docs/sopimukset/SOPIMUS_SJK_2026.docx
  ```
- **Referenssitemplaatti** `docs/templates/tm_sopimus_referenssi.docx` — luo se niin että ulkoasu on virallinen ja
  siisti: selkeä otsikkohierarkia (H1/H2/H3), luettava leipäteksti (esim. Calibri/Times 11 pt), kohtuulliset marginaalit,
  taulukkotyyli hinnastoille. **Ei brändivärikikkailua** — asiallinen sopimusdokumentti. (Templaatti = tyylit, ei sisältöä.)
- **Ulostulo:** `docs/sopimukset/*.docx`. Committaa **sekä skripti + templaatti että generoidut .docx:t** (jotta Tero voi
  avata heti; jatkossa .md-muokkaus + skriptin ajo päivittää ne).

## Vaatimukset / DoD
- **Teksti verbatim .md:stä** — ei sanamuoto-, hinta- eikä numeromuutoksia. §6 perustajaehdot + 70 € + 24 kk mukana.
- Avautuu puhtaasti **Wordissa ja Pagesissa**: otsikot, kappaleet, **taulukot (hinnasto)** ja allekirjoitusrivit renderöityvät.
- **`[TÄYDENNÄ]`-kentät säilyvät näkyvinä** (mielellään korostettuna esim. lihavointi/keltainen) → Tero täyttää Wordissa.
- Emoji/erikoismerkit (§, €, →) renderöityvät oikein (UTF-8).
- Skripti on **idempotentti** ja dokumentoitu (README-rivi tai kommentti: "aja `bash scripts/build_sopimukset.sh`").
- **Ei sovelluskoodin muutoksia** (ei HTML/lib/tm_*), ei `?v`-bumppia, ei vitest-tarvetta — tämä on docs/tooling-tehtävä.
- Jos `pandoc` ei ole CI:ssä/ympäristössä → mainitse asennuskomento README:ssä (esim. `brew install pandoc`); älä lisää raskasta riippuvuutta repoon.

## Verifiointi (Claude L3)
Avaan generoidun .docx:n ja tarkistan: teksti täsmää .md:hen (70 € · §6 perustaja · 24 kk), taulukot + allekirjoitusrivit
ehjät, `[TÄYDENNÄ]` näkyvissä, avautuu Wordissa. Poikkeama = ilmoita ENNEN.

## EI TÄSSÄ
- Sopimusten sisällön muutokset (tulevat erikseen jos tarve). Tietosuojaseloste-/palvelukuvaus-liitteet (omat tiedostot).
