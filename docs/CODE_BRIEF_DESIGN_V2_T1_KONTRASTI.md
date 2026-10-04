# CODE BRIEF · Design V2 · T1: kontrasti ja tekstin paino, kaikki viisi sovellusta

**Tavoite:** tekstit näkyvät molemmissa teemoissa. Palaute pilottiseuroista: "tekstit eivät näy kunnolla". Tämä PR korjaa kontrastin **tokeneilla**. Layoutia, rakennetta tai näkymien järjestystä ei muuteta (ne tulevat R6.5:ssä).

**SSOT:** Design V2 · Luettavuus ensin (artifact, 4.10.2026). Sääntö 3: kaiken tekstin kontrasti ≥ 4,5:1 (WCAG AA).

## 1. Mitattu lähtötilanne (live-tokenit, WCAG 2.x -kaava)

| App · teema | Token | Arvo nyt | Tausta | Kontrasti |
|---|---|---|---|---|
| VP_v25 · vaalea | `--ink3` | rgba(28,28,26,.55) | #F2EFE6 | **3,69** ✗ |
| VP_v25 · vaalea | `--ink2` | rgba(28,28,26,.62) | #F2EFE6 | 4,57 (raja) |
| VP_v25 · vaalea | `--teal` (tekstinä 296×) | #28B090 | #FFFFFF | **2,73** ✗ |
| VP_v25 · vaalea | `--amber` (tekstinä 93×) | #E0A040 | #FFFFFF | **2,26** ✗ |
| VP_v25 · tumma | `--ink3` | #6B82A8 | #1C1C1A | **4,38** ✗ |
| Master_v16 · vaalea | `--ink3` | rgba(28,28,26,.55) | #F2EFE6 | **3,69** ✗ |
| Master_v16 · vaalea | `--amber` | #7A5A10 | #FFFFFF | 6,37 ✓ |
| Master_v16 · tumma | `--ink3` | rgba(242,239,230,.55) | #1C1C1A | 5,35 ✓ |
| Pelaaja_v7 · tumma | `--ink3` | #8BA0BC | #111110 | 7,06 ✓ |
| Pelaaja_v7 · tumma | `--teal` (tekstinä 82×) | #1A7A5E | #1E1E1C | **3,17** ✗ |
| Vanhempi_v2 · tumma | `--teal` (tekstinä 4×) | #1A7A5E | #1E1E1C | **3,17** ✗ |
| Vanhempi_v2 · tumma | `--ink3` | #8BA0BC | #111110 | 7,06 ✓ |
| Seura · tumma | `--ink3` | rgba(232,238,248,.55) | #1C1C1A | 5,31 ✓ |
| Seura · tumma | `--amber` | #E0A040 | #1C1C1A | 7,54 ✓ |

Teemat: VP_v25 ja Master_v16 tumma + vaalea. Seura, Pelaaja_v7 ja Vanhempi_v2 vain tumma.

Pääsyyt: VP:n ja valmentajan vaaleassa teemassa **teal- ja amber-tekstit** sekä `--ink3`. Pelaajan ja perheen sovelluksissa **tumma teal (#1A7A5E) tekstivärinä tummalla pohjalla**. Seuran sovelluksessa kontrasti on kunnossa, ongelma on vain pienet koot (T2).

## 2. Muutokset

Vain `:root[data-theme="light"]`- ja `:root[data-theme="dark"]`-lohkot (VP_v25 n. r. 148–200, Master_v16 n. r. 200–245). Ei koske `.tm-kaavio`-skoopattuja tokeneita.

### VP_v25 · vaalea
```css
--teal:  #1A7A5E;               /* oli #28B090 · 4,58–5,04:1 · brändin vaalean teeman teal */
--amber: #7A5A10;               /* oli #E0A040 · 6,37:1 · sama kuin Master_v16 vaalea */
--ink2:  rgba(28,28,26,.70);    /* oli .62 */
--ink3:  #66635A;               /* oli rgba(.55) · 5,2:1 */
```
### VP_v25 · tumma
```css
--ink3: #8296BA;                /* oli #6B82A8 · 5,7:1 · sininen sävy säilyy */
```
### Master_v16 · vaalea
```css
--ink3: #66635A;                /* oli rgba(.55) · 5,2:1 */
```
Tarkista Masterin vaalea `--teal`: jos se on #28B090, vaihda #1A7A5E samalla perusteella.

### Pelaaja_v7 ja Vanhempi_v2 · tumma
`--teal` (#1A7A5E) on tarkoitettu täytöksi, ei tekstiksi tummalla pohjalla. Vaihda **tekstiväri**:
```
color: var(--teal)  →  color: var(--teal-d)     /* #28B090 · ≈ 6,9:1 */
```
Pelaaja_v7: 82 kohtaa, Vanhempi_v2: 4 kohtaa. Älä muuta `background: var(--teal)` -täyttöjä (vaalea teksti teal-pohjalla on ≈ 4,9:1, kunnossa). Älä muuta `--teal`-tokenin arvoa.

### Seura
Ei tokenimuutoksia. Kontrasti on kunnossa.

### Tekstin paino (kaikki viisi)
Perusluokkien `font-weight: 300` → `400`, kun fonttikoko < 18 px (body, `.idp-*`, `.acc-*`, `.jsp-*` -tekstit). Cormorant-otsikot ≥ 24 px saavat jäädä 300:aan. Älä muuta inline-tyylejä massana tässä PR:ssä.

## 3. Varmistettavat sivuvaikutukset
- `--teal`/`--amber` toimivat myös täyttöinä (pisteet, palkit, napit). Vaaleassa teemassa tummempi sävy on brändin mukainen (design system: vaalea = #1A7A5E). Tarkista napit, joissa teksti on `--bg`-värinen teal-pohjalla: kontrastin pitää pysyä ≥ 4,5.
- Kovakoodatut `#28B090` (VP 23×, Master 21×) ja `#E0A040` (VP 14×, Master 5×) inline-tyyleissä **eivät** muutu tokenimuutoksella. Listaa ne PR-kuvaukseen, mutta älä korjaa tässä PR:ssä, ellei kyse ole tekstiväristä Aloitus- tai Kehitys-välilehdellä.
- i18n-avaimiin ei kosketa.

## 4. Testit
- Uusi `tests/design_v2_kontrasti.test.js`: lukee kaikkien viiden sovelluksen (VP_v25, Master_v16, Seura, Pelaaja_v7, Vanhempi_v2) `:root[data-theme=…]`-lohkot, laskee `--ink`, `--ink2`, `--ink3`, `--teal`, `--amber` -kontrastin teeman `--bg`- ja `--bg3`/`--card`-taustaa vasten (rgba sekoitetaan taustaan) ja vaatii ≥ 4,5. Testi estää regressiot jatkossa.
- Visuaalinen tarkistus: Topias (KPV U13, testipelaaja) VP-cockpit → Aloitus ja Kehitys, valmentajan Viestit (molemmat teemat), Topiaksen Pelaaja-app (Minä, Treeni) ja Perhe-app (Koti, Viestit), Seuran etusivu. Kuvakaappaukset PR:ään ennen/jälkeen.
- Staattinen tarkistus: `color: var(--teal)` ei saa esiintyä Pelaaja_v7:ssä eikä Vanhempi_v2:ssa (tekstinä vain `--teal-d`).
- Kaikki nykyiset testit läpi, lint OK.

## 5. Ei tässä PR:ssä (T2 / R6.5)
- Fonttikokojen nosto (VP: 801 inline-kokoa 9–11 px, Master: 335) → tehdään näkymäkohtaisesti, kun Tänään/Polku/Näyttö-rakenne toteutetaan.
- VP:n sinertävän palettiin (`--ink #E8EEF8`, `--ink2 #9AAAC4`) yhtenäistäminen design systemin bone/carbon-sävyihin → oma päätöksensä.
- Pienet 9–11 px tekstit kaikissa sovelluksissa (Seura 125, Pelaaja 212, Vanhempi 57) → T2.

## 6. Rollback
Pelkkä CSS-tokenimuutos, ei datamuutoksia. Revert palauttaa ennalleen.
