# Pikakortti design-korjaukset 16.10.2026 — mittaukset ja kuvat

Mittaus: Playwright + Chrome, viewport 390×844, deviceScaleFactor 2, testipelaajat (porras 1: Topias, 10 v, nostoehdotus; porras 4: Sara, 17 v). Kirjautumisbanneri piilotettu kuvista. Skripti ei ole repossa (kertakäyttöinen); sama logiikka kuin `tests/adar_pikakortti_v2.test.js`:n `aja()`.

| Mittaus | Ennen | Jälkeen |
|---|---:|---:|
| Sivun korkeus, porras 4, kaikki 4 ulottuvuutta valittuna, vinkit kiinni (px) | 1523 | **1404** (−119, −7,8 %) |
| sama, kaikki 4 vinkkiä auki (px) | 1523 | 1523 |
| Porras 1, ehdotus näkyvissä, A valittu (px) | 909 | 887 |
| Tallenna-painike, tumma teema | #28B090 + tumma teksti | #1A7A5E + #FBFAF6 (kontrasti 5,04:1) |
| Tallenna-painike, vaalea teema | #1A7A5E | #1A7A5E (ennallaan) |
| Yläotsikko | "Pelihavainto · Showcase/Leikkijä" | "Pelihavainto" |
| Ulottuvuuskoodi `.dim-k` otsikossa | 4 kpl (A D Ac R) | 0; yhteenvedossa AC |
| Nostoehdotuksen desimaalit | 2.5 · 3 · 2.5 | 2,5 · 3 · 2,5 (fi ja sv) |
| Vaakavieritys 390 px | ei | ei |
| Viestikenttä ↔ alapalkki (viewport 390×440 = näppäimistö auki, kenttä fokuksessa) | ei päällekkäisyyttä (0 px) | ei päällekkäisyyttä (0 px) |

Viestikentän peittymistä ei saatu toistettua (Chromen viewport-kutistus ei ole sama kuin iOS/Android-ohjelmistonäppäimistö) → `padding-bottom` / `scrollIntoView` EI lisätty. Oikea laitetarkistus (iOS Safari + Android Chrome) jää Teron puhelimelle.

Kuvat: `ennen_*` = origin/main (#1083 jälkeen), `jalkeen_*` = tämä PR.
