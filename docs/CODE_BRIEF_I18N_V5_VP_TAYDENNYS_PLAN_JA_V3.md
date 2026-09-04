# Code-brief — i18n V5 · **VP_v25 -täydennys: kokonaissuunnitelma + alaerä V3 (Joukkue-syvänäkymä)**

> **Konteksti:** i18n-ohjelma: Pelaaja/Vanhempi 100 % · **Master_v16 100 % sv + committattu render-gate** (juuri suljettu).
> VP_v25 on **V2-tasolla**: Tilanne/koti · toimenpiteet · Pelaajat + common tehty (`vpT` toimii, `tm_vp_i18n.js?v=9`,
> `tm_i18n_common.js?v=2`). **Tämä raita vie VP:n loppuun samalla todistetulla kaavalla kuin Master.** VP on iso
> (~16 000 riviä) → alaerät per näkymä, lint-puhdas per commit, render-gate DoD:na.

## Kokonaissuunnitelma — alaerät (kukin oma commit, lint EXIT 0, ei merge ennen verifiointia)
| Alaerä | Pinta | Funktiot (rivi n.) |
|---|---|---|
| **V3** (tämä) | Joukkue-syvänäkymä | `_jsv*`-klusteri **8040–9220** + `avaaJoukkueSyvanakyma` **9221** |
| V4 | Kalenteri | `renderKalenteri` **12637** (+ KALENTERI_TYYPIT-selite, §1 enum) |
| V5 | Valmentajat | `renderValmentajat` **11661** + `avaaCoachPanel` **11867** + `_cmTab` **12190** |
| V6 | IDP-jono | `renderIdpJono` **3777** |
| V7 | Raportointi | `renderRaportointi` **15885** |
| V8 | Työkalut + Asetukset | `avaaBioBanding` **4174** · Metodologia/Kalibraatio/Kriteeristö/Benchmark |
| **G** | **VP render-gate** | `tests/idp_i18n_v5_vp_render_dom.test.js` — **rakenna V3:n JÄLKEEN**, guardaa V4–V8 |

**Suositus gatesta:** älä jätä dead-lastiksi kuten Masterissa — rakenna se **V3:n jälkeen** (kun on 1 reititetty iso pinta) niin se nappaa V4–V8:n vuodot heti (Masterissa gate paljasti `>text<`-aukon jonka `'...'`-probe missasi). Malli: Master `tests/idp_i18n_v5_master_render_dom.test.js` (source-scanner, "routed = literaali minkä tahansa `vpT(...)`-argin alueella", allowlist demo §3/§7-lib/enum/tuotetermit).

## Arkkitehtuuri (sama kuin Master)
- Dynaaminen render → **`vpT(fi)`** (§7.1 ei nested template literaleja; concat `+ vpT('x') + '</div>'`, ei jäänne-`' + '`).
- **[K]-kartta voittaa** (common + `tm_vp_i18n.js`). Uudet avaimet **dup-checkillä** (`if key in map`) → `tm_vp_i18n.js?v=9→10…`.
- **Kohinasuodatin:** muuttujanimet · console-tagit · demo (§3) · enum-**arvot** + vertailut EI reititetä.
- **§7-raja:** lib-lähtöinen curriculum/taksonomia-teksti (tm_arviointi_taksonomia/tm_fyysteemat/tm_teknistaktiset `nimi_fi`) jää fi → gate-allowlist (sama kuin Master; lib-curriculum-sv on oma raita).

## 🔒 Jaettu sv-kanoni — käytä `docs/CODE_BRIEF_I18N_V5_MASTER_IDP_ERA1_EDITORI_TOIMINTAKORTTI.md`:n sanastoa
VP:n syvänäkymä jakaa Masterin domain-termit — **älä keksi uusia, käytä Master-briefin lukittua sanastoa + B-listaa:**
Kausitavoite→Säsongsmål · Jaksofokus→Periodfokus · Kehon valmius→Kroppslig beredskap (common) · Syöttö→Passning (common) ·
roolit (Tränare/Talangtränare/Fystränare/**Utvecklingsansvarig**, common) · **§29 kaksi deltaa → Två deltan; abs+ ei koskaan punainen → abs+ blir aldrig röd** · **§28 kypsyysvahti → §28-mognadsvakt** · D1 Fyysinen→D1 Fysisk · D2 Tekninen→D2 Teknisk · Kestävyys→Uthållighet (jos ei lib-lähtöinen).

---

## Alaerä V3 — Joukkue-syvänäkymä (`_jsv*` 8040–9220 + `avaaJoukkueSyvanakyma` 9221)

Syvänäkymä-modaali = 3 välilehteä **Tilanne · Tuki · Pelaajat** (`_jsvTilanneHTML` 9028 · `_jsvTukiHTML` 8698 · pelaajat-lista). Reititä `vpT`:llä:
- **Radar + taso** (`_jsvRadarBlokki` 8935 · `_jsvRadarSisalto` 9184 · `_jsvRadarWrapSisalto` 8948): 5D-akselilabelit (D1 Fyysinen…D5 Sosiaalinen), Ikäluokka/Kehitysvaihe/Molemmat-toggle, "PHV-vaihe" §28.
- **Per-laji + budjetti** (`_jsvPerLajiHTML` 8336 · `_jsvBudjettiRivi` 8393 · `_jsvLajiData` 8312 · `_jsvViiteLabel` 8296): laji-nimet (common: Syöttö→Passning ym.), viite-labelit ("Loppukilpailutaso"/"Alueellinen huipputaso" — §34), sekuntibudjetti, "lähellä merkkiä".
- **Fyysinen / Yhteenveto / Tuki** (`_jsvFyysinenHTML` 8437 · `_jsvYhteenvetoHTML` 8574 · `_jsvTukiHTML` 8698): TKI-histogrammi, gap-järjestys, harjoitusryhmäjako, kehitysvauhti (**§29 kaksi deltaa — abs+ blir aldrig röd**), aito-taantuma-merkki, kypsyysvihjeet (**§28**).
- **Tavoite/Tilanne** (`_jsvTavoiteHTML` 9058 · `_jsvTilanneHTML` 9028): painopiste-CTA, datapolku, per-testi-jakaumat.
- **Widgetit/toastit** (`_jsvTeemaWidgetHTML` 8105 · `_jsvLuoMittaus` 8058 · `_jsvLuoHarjoitus` 8085 · `_jsvKopioiRyhma` 8287): treeniteema-valitsin, "Luo tapahtuma/mittaus", "Kopioi ryhmä", toastit.

### ⛔ ÄLÄ reititä (V3)
`_jsvEsc`-muuttujat · tki/taso-**arvot** · radar-akseli-**avaimet** koodissa · laji-id:t · demo-pelaajanimet · `_lahde`-kentät (näyttö vs avain) · **§7 lib-lajinimet** (jos `nimi_fi` tm_fyysteemat/taksonomiasta → allowlist). Tuotetermit (X-Factor/Hidden Gem/Underdog) + indeksilyhenteet (TKI/TSI/H-H/PHV/D1–D5) verbatim.

### Domain-invariantit (V3) — säilytä merkitys
- **§29 kaksi deltaa:** abs-delta ja TKI/taso-delta erikseen; "abs+ blir aldrig röd" (sama kuin Master).
- **§28 kypsyyskorjaus:** "pre-PHV — biologisesti odotettua, ei kehityskohde" · "PHV-vaihe" · maturity-toggle — käännä säilyttäen §28-kehys (mognadsvakt/förväntad).
- **Data-tuoreus** (§17): "eri mittausajankohdat — vertaa varoen" · "yli 6 kk vanha" · "📍 päivitä mittaus" — säilytä varoitusmerkitys.

### Portit + DoD (V3)
- Syvänäkymä-modaali (3 välilehteä + radar + per-laji + fyysinen/tuki/yhteenveto) sv-tilassa 100 %; §29/§28 merkitys ehjä.
- Uudet avaimet dup-checkillä → `?v` +1. [K]-kartta voittaa. Jaettu kanoni eksaktisti.
- **lint EXIT 0 ENNEN committia** (Masterissa 2 musta-ruutua + 1 vajaa-map). **Resolvi-todiste KAIKILLE V3-avaimille** (`R(k)!==k`) — älä väitä "hoidettu" ilman.
- C1 (VP∩common=∅) · dup 0 · suite vihreä · fi-regressio ehjä · inline-parse 0.

### Verifiointi (Claude, V3-commitin jälkeen)
1. lint EXIT 0 · C1 ∅ · dup 0 · suite.
2. Syvänäkymä-alueen (_jsv* 8040–9220) `vpT`-avaimet 0 resolvoituu fi:ksi.
3. Live: avaa joukkue-syvänäkymä sv:ssä → 3 välilehteä + radar + per-laji 0 näkyvää fi-avainta (pl. §7 lib-lajinimet).
4. Domain: §29 kaksi deltaa · §28 kypsyys · data-tuoreus säilyneet.

## Seuraava
V3 verifioitu → V4 Kalenteri (+ rakenna VP render-gate). Sitten V5→V6→V7→V8 → gate 0 → **VP_v25 100 % sv.**
