# Code-brief — i18n V5 · VP_v25 **V3-korjauserä (reitittämättömät use-sitet) + committattu VP render-gate (step G)**

> **Konteksti:** V3 (5fec8a0, `i18n/v5-vp-v3`) verifioitu. Automaattiportit vihreät: **lint EXIT 0 · suite 1640 · C1
> VP∩common=∅ · ?v=10 · resolvi-todiste 141/141** (strip-variant-korjaus pitää — myös välilyönnilliset avaimet
> resolvoituvat) · §29 "abs+ aldrig röd" + §28-kehys ehjät. **MUTTA** riippumaton reitittämättömien literaalien skanni
> (`>text<` + `title="…"`-luokka) paljasti **11 varmaa raakaa fi-vuotoa + 2 data-lähtöistä** `_jsv*`-alueella. Sama vuotoluokka
> kuin Masterin B2-livessä: **resolvi-todiste ei nappaa tätä** (se todistaa vain että REITITETYT avaimet resolvoituvat, ei
> että kaikki literaalit on reititetty). **→ V3:a EI mergetä ennen näiden reititystä + committattua gatea.**

## A) Reititä nämä use-sitet (kartta-arvot enimmäkseen jo olemassa → pelkkä `vpT`-kääre; jos `vpT(x)===x` → lisää avain dup-checkillä)
| Rivi | Raaka fi (näyttö) | Pinta | sv (kanoni / vahvista) |
|---|---|---|---|
| **8354** | `<b>alue</b> = kilpailukohortti 1–5 · <b>valtak.</b> = Eerikkilä 1–3 (syöttö/pujottelu)<br>` | per-laji lähde-selite (seur. rivi 8355 ON jo vpT) | `<b>område</b> = tävlingskohort 1–5 · <b>riksv.</b> = Eerikkilä 1–3 (passning/dribbling) |
| **8378** | `title="Eerikkilä-lajitekniikka 1–3, 3 = valtakunnan kärki. Vain syöttö & pujottelu (Eerikkilä ei testaa muita)."` | valtak-badge tooltip | `title="Eerikkilä-grenteknik 1–3, 3 = rikstopp. Endast passning & dribbling (Eerikkilä testar inga andra)."` |
| **8628** | `>Luo tekniikkateema →</button>` | fyysinen/yhteenveto CTA | `Skapa teknikstema →` (vahvista teema-fraseeraus) |
| **8629** | `>Avaa Tuki-ryhmät →</button>` | CTA | `Öppna Stödgrupper →` |
| **8690** | `>Tasot &amp; jakaumat →</span>` | toggle | `Nivåer & fördelningar →` |
| **8691** | `>Pelaajat →</span>` | toggle | `Spelare →` (common) |
| **8735** | `title="Kopioi nimet leikepöydälle"` | kopioi-ryhmä nappi | `title="Kopiera namn till urklipp"` |
| **8777** | `title="Kopioi nimet leikepöydälle"` (2. esiintymä) | sama | sama |
| **9045** | `>📋 Luo tekniikkateema<` (sisar 9046 ON jo vpT!) | radar/tuki CTA | `📋 Skapa teknikstema` |
| **9078** | `>Avaa pelaajat</span>` | toggle | `Öppna spelare` |
| **9179** | `>→ Pelaajakohtainen näkymä (Pelaajat-välilehti)</span>` | toggle | `→ Spelarspecifik vy (fliken Spelare)` |

**Huom sisar-epäjohdonmukaisuudet:** 9045 raaka vs 9046 vpT-käärritty · 8629 raaka vs 8628 sen vieressä — molemmat samassa napparyhmässä. Kääri **kaikki** samat napit.

## B) Data-lähtöiset render-sitet (näytetään raakana; matalampi prioriteetti — vahvista Terolta)
1. **`_jsvLajiData.nimi`** (8306+: `nimi:'Syöttö'/'Pujottelu'/…`) → renderöityy `~8402` `.toLowerCase()` + `join(', ')` ("suurin aikasäästö: syöttö, pujottelu"). sv-tilassa näkyy fi-lajinimiä. **Ratkaisu:** kääri näyttö `vpT`:llä (common: Syöttö→Passning, Pujottelu→Dribbling) render-sitessä, ÄLÄ `nimi`-datakenttää. Tarkista `.toLowerCase()`-ketju (sv-vastineet eri isot/pienet).
2. **`_JSV_HH_TEEMA`** (8436: `mas:'kestävyys'`, `sm_pallo:'pallollinen nopeus'` ym.) → `~8531` `+ teema + vpT('-teema')` → "kestävyys-teema" raakana. Teema-arvot **eivät ole kartassa**. **Ratkaisu:** näyttö-map teema-arvoille (`nopeus→snabbhet · nopeusvoima→snabbstyrka · kestävyys→uthållighet · ketteryys→smidighet · pallollinen nopeus→bollförd snabbhet`), reititä display, pidä datakoodit fi.

## C) Borderline (vahvista, älä oleta)
- **8373 `/5 alue` · 8378 `/3 valtak.`** — taso-suffiksit numeron perässä ("3/5 alue", "2/3 valtak."). Jos näyttö → `/5 omr.` / `/3 riksv.`; jos halutaan lyhenteinä ennallaan → allowlist. **Kysy Terolta.**

## D) 🔒 Committattu VP render-gate — RAKENNA NYT (step G, ei dead-last)
Tämä vuotoluokka (`>text<` + `title=`) on **täsmälleen** se minkä committattu gate nappaa ja resolvi-todiste ei. Malli: Master
`tests/idp_i18n_v5_master_render_dom.test.js`. Luo **`tests/idp_i18n_v5_vp_render_dom.test.js`** (source-scanner):
- Skannaa `TalentMaster_VP_v25.html` render-alueet: **failaa jos näkyvä `>…<`-tekstisolmu TAI `title=`/`placeholder=`-attribuutti sisältää fi-sanan eikä ole minkään `vpT(...)`-argin alueella.**
- **Allowlist:** demo · §7 lib-lajinimet (`nimi_fi` tm_arviointi_taksonomia/tm_fyysteemat/tm_teknistaktiset) · enum-**arvot** · tuotetermit (X-Factor/Hidden Gem/Underdog) · lyhenteet (TKI/TSI/H-H/PHV/D1–D5/RPE/ADAR/CPD/DVI/meso/Cue).
- **Negatiivitestaa:** poista yhden stringin reititys → gate failaa → palauta → vihreä (ei tyhjää läpimenoa).
- Aja gate → reititä A+B kunnes **gate = 0**. Se = V3:n oikea DoD.

## E) Pre-existing hygienia (EI V3:n regressio — korjaa ohimennen)
`lib/tm_vp_i18n.js` **duplikaattiavain** `'Ikävaihe-odotetut (ei kiireellisiä)'` sv-lohkossa rivit **10 JA 2227** (identtinen arvo → idempotentti, ei driftiä, mutta dup-check ohitti). Poista toinen.

## Portit + DoD (V3-korjaus)
- A:n 11 use-sitea + B:n 2 data-sitea sv livenä. **Committattu VP render-gate = 0** (allowlist demo/§7/enum/tuotetermit).
- Uudet avaimet dup-checkillä → `?v=10→11`. [K]-kartta voittaa. Kanoni eksaktisti. §29/§28 ehjät.
- **lint EXIT 0 ENNEN committia** · resolvi-todiste kaikille uusille avaimille · C1 ∅ · dup 0 (ml. E) · suite vihreä · inline-parse 0.

## Verifiointi (Claude, korjauksen jälkeen)
1. Committattu VP render-gate 0 · lint 0 · C1 ∅ · dup 0 · suite.
2. Sama riippumaton `>text<`/`title=`-skanni `_jsv*`-alueen yli → 0 raakaa fi-literaalia (pl. allowlist).
3. Live: joukkue-syvänäkymä sv → Tilanne/Tuki/Pelaajat + radar + per-laji 0 näkyvää fi-avainta.
4. §29 "abs+ aldrig röd" · §28 kehys · data-tuoreus ehjät.

## Seuraava
V3 gate=0 → merge → V4 Kalenteri (VP render-gate guardaa nyt V4–V8 alusta asti).
