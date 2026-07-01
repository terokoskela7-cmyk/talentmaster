# Code-tehtävä: Joukkueen syvänäkymä-modaalin selkeytys (VP "Tilanne")

> Valmis brieffi Code-agentille. Rajaus: **VAIN VP_v25:n joukkueen syvänäkymä-modaali** (`avaaJoukkueSyvanakyma` + per-pelaaja `_jspModal`, §19). EI pulssikortteja (oma brief `CODE_TASK_PULSSIKORTIT_UI.md`), EI Masteria, EI muita sivuja.
> Tavoite: nykyinen popup on **liian pieni ja epäselvä** (käyttäjäpalaute 2026-07-01). Radar on hyvä idea mutta hukkuu; välilehdet toistavat samaa dataa.
> Visuaalinen tavoite: chat-mockupit 2026-07-01 (`syvanakyma_tilanne_yhdistetty` + `radar_dual_ikaluokka_kehitysvaihe`). **Suunta B valittu** (yhdistä Yhteenveto+Tavoitetaso).

## Periaate — informaatioarkkitehtuuri (tärkein)
**Vasen sarake = pysyvä "tuloskortti" (vitals). Välilehdet = eri linssit siihen — ne LISÄÄVÄT tietoa, eivät toista tuloskorttia.** Nykyongelma: D1/D2 näkyy sekä vasemmalla että toistuu välilehdissä → sekava, tiheä, "hämärä".

## 5 muutosta

### 1. ⭐ Yhdistä välilehdet: 4 → 3
Nykyiset **Yhteenveto + Tavoitetaso** ovat lähes samaa (molemmat = taso vs. viite). **Yhdistä yhdeksi "Tilanne"-välilehdeksi.** Lopputulos: **Tilanne · Tuki · Pelaajat** (3 välilehteä).
- **Tilanne** = radar hero + painopiste + (collapse) per-testi-jakaumat + datapolku.
- **Tuki** (§19, ennallaan) = gap-järjestys + harjoitusryhmäjako + aito taantuma -merkki.
- **Pelaajat** (§19, ennallaan) = pelaajalista + deltat + per-pelaaja `_jspModal`.

### 2. Radar isommaksi + selkeämmäksi (hero)
- Radar = **Tilanne-välilehden pääelementti**, isompi (nykyinen on liian pieni). Selkeät akselinimet (10m, 30m, SM-j., SM-p., CMJ, MAS), luettava kokoluokka.
- **Teal-täyttö** joukkueen taso (`--teal`), **katkoviiva-monikulmio tavoite taso 3** (himmeä). §5-brändi.
- Vasemman "tuloskortin" D1/D2 EI toistu radarin vieressä tekstinä — radar ON se visualisointi.

### 3. ⭐ Dual-taso: Ikäluokka ↔ Kehitysvaihe -toggle radariin
> Kuluttaa `kehitysvaiheTaso`-funktiota (`CODE_TASK_BIOBANDING_V2.md`). **Riippuvuus:** jos V2-taulukoita/PHV:tä ei ole → **graceful degradation**: toggle piilossa, vain ikäluokka-radar (SJK:n TKI/H-H-only-pelaajat toimivat ennallaan).
- Toggle `Ikäluokka | Kehitysvaihe | Molemmat` radarin yllä.
- **Kehitysvaihe-overlay vain 3 akselille** (lin.nopeus 10m/30m, CMJ, MAS — s.19 rajaus). Muut akselit (SM-j./SM-p.) näyttävät vain ikäluokka-arvon → merkitse osittaisuus (himmeä akselinimi tai pieni alaviite "kehitysvaihe: nopeus/CMJ/MAS").
- Molemmat-tilassa: 2 monikulmiota — ikäluokka (`--blue` viiva) + kehitysvaihe (`--teal` täyttö). Legenda: ● ikäluokka · ● kehitysvaihe · - - tavoite.
- **§28-turva:** kehitysvaihe-linssi on juuri se joka näyttää myöhäiskypsyjän oikeudenmukaisesti — ei "heikko", vaan ajallaan omalle kehitysvaiheelleen. Mikrokopio kun offset saatavilla + pre-PHV.

### 4. Lean vasen "tuloskortti" (poista toisto)
Vasen sarake = tiivis pysyvä vitals-kortti, sama kaikilla 3 välilehdellä:
- **D1 / D2** teal-palkkeina + tavoite-tikki tasolla 3 (§28-värikalibrointi kuten pulssikortit: pre-PHV neutraali, EI punainen).
- **Kattavuus n/N** (esim. 6/7).
- **Hidden Gem** -merkki jos laukeaa (§28/§30-kynnys, ei muuteta laskentaa).
- **PHV-note** jos joukkueella kehitysvaihedataa ("kehitysvaihe: X pre / Y circa / Z post").
- **EI** toista radarin/painopisteen sisältöä.

### 5. Painopiste + collapse + datapolku (Tilanne-välilehden alaosa)
- **Painopiste-lohko** radarin alla: heikoin ominaisuus + etäisyys tavoitteeseen + teal-CTA:t (`Luo tekniikkateema` esitäyttö + `Tuki-ryhmät`). §28-note kun pre-PHV.
- **Per-testi-jakaumat COLLAPSE** ("Näytä per-testi jakaumat ▸", oletus kiinni) → radar hengittää; numerot yhden klikin päässä. (Nykyinen TKI-histogrammi + per-laji siirtyy tänne collapsen alle.)
- **Datapolku-lohko** kompaktina: kattavuus (Pelihavainto/PHV/Suostumus) + CTA-linkit tyhjiin (§75-tyhjätila-CTA-periaate).

## Guardrailit
- **Rajaus ehdoton:** vain `avaaJoukkueSyvanakyma` + `_jspModal` (VP_v25). Ei pulssikortit, ei Master, ei muut.
- **Laskenta ei muutu** — pikakenttä-arkkitehtuuri (§26), TKI/H-H/D1/D2/kohortti-logiikka (`valitseKohortti` §76), analyysifunktiot (`_jsvPerLajiHTML` ym.) ennallaan. Vain layout + välilehtien yhdistäminen + radar + dual-toggle-kytkentä.
- **Dual-taso = additiivinen:** jos `kehitysvaiheTaso` puuttuu (ei V2-taulukoita / ei PHV) → toggle piilossa, kaikki muu toimii. Ei saa rikkoa nykyistä ikäluokka-näkymää.
- **§28-invariantti:** pre-PHV matala fyysinen = neutraali (teal/harmaa), ei punainen. Punainen vain aito taantuma (TKI<0 JA abs<0) / FLEI<40.
- **§7.22:** VP/valmentaja-työkalu; kehitysvaihe-taso ei ole lapsinäkymä.
- **Brändi §5:** `--teal` #28B090, `--blue` #2A5DB0, `--amber` #E0A040; carbon #111110 / kortti #161614; DM Sans / Cormorant. Tumma teema oletus (§77).
- **Modaali skrollaa** (§77-korjaus: `_jspModal` overflow:auto + sticky) — älä riko. Iso radar ei saa aiheuttaa leikkautumista mobiilissa (§6: yksi `@media`).
- Ei uusia riippuvuuksia (radar SVG kuten nyt). Ei versionbumppia (auto-bump mainissa).

## Verifiointi
- **Screenshot ennen/jälkeen** SJK-datalla (P14/P15 joilla PHV:tä 8 pelaajalla → dual-toggle näkyy; Sibbo TKI-only → toggle piilossa, ikäluokka-radar ehjä).
- Katso: 3 välilehteä (ei 4), iso luettava radar, ei D1/D2-toistoa vasen↔radar, collapse kiinni oletuksena, dual-toggle vain kun dataa.
- Tumma + (jos tuettu) vaalea teema; modaali skrollaa; ei konsolivirheitä (ESLint no-undef §60).

## Ei tähän (myöhemmin, erikseen)
- Kehitysvaihe-tavoitetasotaulukoiden täyttö = `CODE_TASK_BIOBANDING_V2.md` (gate: Tero hankkii Palloliiton taulukot). Tämä UI-brief tekee kytkennän + graceful degradation; taulukot tulevat V2:sta.
- Master-sivun sama dual-toggle (§29 detail) = oma kierros.
- Feature branch → PR → merge.
