# Code-brief — i18n V5 · VP_v25 **alaerä V7b: Reviewit + VP-tuloskortti [14552–15185]**

> **Konteksti:** V3–V7a mainissa, **live-verifioitu tuotannossa**. V7a-live paljasti gaten kaksi sokeaa pistettä →
> **gate kovennettu kahdesti tässä kierroksessa** (perit vahvemman gaten):
> 1. **`idrow`-luokka** → `SETTER_FNS`-joukkoon lisätty `idrow` (display-helper jonka MOLEMMAT argumentit ovat näyttöä).
> 2. **Ternaary-sokea piste** → `inDisplayContext` kävelee nyt myös `ConditionalExpression`in läpi
>    (`cond ? ' · fi ' + x : ''` markup-ketjussa oli näkymätön; koski sekä `+`-ketjua että 0B `.textContent`-vartijaa).
>
> **Kova oppi:** source-scanner + gate EIVÄT korvaa live-tarkistusta. Helper-arg-display ja ternaary-nested-display
> vuotavat kunnes ne on **(a) reititetty JA (b) rekisteröity vartijaan**. V7b:ssä on **useita display-helpereitä** — nämä
> ovat kriittisin osa (§0 alla). Aja live pelaajavalinnalla, älä luota pelkkään gate-vihreään.

## Scope (analysoitu; iso klusteri → HARKITSE 2 committia)
| Osa | Alue (n.) | Ydin |
|---|---|---|
| **Reviewit** (`renderReviewit`@14863 · cockpit `_vpCockpit*`@14979+ · fp/kpi-KPI:t · review-tagit) | 14552–~14976 · 14979–15185 | MDT-tarkistusrytmi, KPI-nauha, suodatinpainikkeet, cockpit-rivit, jaksofokus-toimenpide |
| **VP-tuloskortti** (`renderVPTuloskortti`@14628 · `_vpKohorttiRivi`@14657 · segmentti/tavoite-modaalit @14676–14735) | 14603–14735 | kohortti-tuloskortti (vihreä/amber/punainen), segmentti/tavoite-asetus |

**Yläraja-lukko:** V7b **loppuu 15185**. `_hlEsc`@15193 + `_HL_KRIT_*`@15189 kuuluvat **V7c:hen** — ÄLÄ mene yli 15185.
**Suositus:** VP-tuloskortti (14603–14735) omana committina, Reviewit+cockpit (14842–15185) toisena. Molemmat gate 0 ennen seuraavaa.

---

## §0 (KRIITTINEN, ENSIN) — display-helper-rekisteröinnit (V7a-live-oppi)
V7b:ssä on **funktio-arg-display-helpereitä** kuten V7a:n `idrow`. Niiden raaka fi-label-argumentti on **gatelle näkymätön**
kunnes helper on `SETTER_FNS`-joukossa. **Reititä label-argumentit `vpT`:llä JA lisää helper `SETTER_FNS`:iin** (tiedosto
`tests/idp_i18n_v5_vp_render_dom.test.js`, rivi ~116 — nyt `['toast','_setTxt','_dSet','idrow']`):

| Helper | Rivi | Muoto | Toimenpide |
|---|---|---|---|
| **`kpi`** | 14897 | `kpi(label, v, cls, sub)` → `<div class="kpi-label">'+l+'</div>` | reititä `l` + `sub`; **lisää `'kpi'`** SETTER_FNS:iin |
| **`fp`** | 14919 | `fp(key, label, amber)` → suodatinnappi | reititä `label` (EI `key` — enum); **lisää `'fp'`** |
| **`set`** | 14868 | `set(id, v){ e.textContent=v }` | jos kutsutaan literaali-fi:llä → reititä; 0B kattaa `.textContent=` sisällä, mutta call-site-literaali tarvitsee `'set'` SETTER_FNS:iin JOS siihen annetaan fi-literaali |

**Inline `<span class="k">…</span>`-labelit** (esim. `Toimenpide`@15010–15011) sisältävät markupin → **gate nappaa ne jo**
(markupPieces). Reititä silti: `<span class="k">' + vpT('Toimenpide') + '</span>`.

**Negatiivitesti per uusi helper:** `kpi('Raakalabel', vpT('x'))` → gate failaa `Raakalabel`:sta; `kpi(vpT('OKlabel'), vpT('x'))` → ei. (Kuten idrow-negatiivitesti rivillä ~206.)

---

## §1 enum-raja (PYSYY fi — ÄLÄ reititä)
- **Review-status-enumit:** `myohassa`, `ei_reviewia`, `ontime`/`onTime`, `eraantymassa` — käytetään `r.status==='myohassa'`-vertailuissa + Firestore. Näyttö reititetään, **avain fi**.
- **Tuloskortti-väri-enumit:** `_vpTkVari(s)` / `_vpTkMerkki(s)`: `'vihrea'`/`'amber'`/`'punainen'` — enum-avaimet, emoji-arvot → EI reititetä.
- **`REVIEW_TAGIT`-avaimet**@14729 + dimensiot (`D1`–`D5`) → avaimet fi/koodi; **tag-näyttö-tekstit** (jos näytetään) reititä.
- **Suodatin-key-argumentit** `fp('huomiota',…)`, `_reviewStatusF`-arvot, `_vpKohortti`-arvot → enum, EI reititetä.
- **jaksofokus/domeeni-data:** `p.jaksofokus.domeeni`, `konsepti_nimi`, `harjoite`, `cue` → **käyttäjä/lib-data**, EI reititetä (Cue verbatim).
- pelaaja/valmentaja-nimet · joukkue · id:t · pvm · Firestore-arvot.

## Object-property-display → `MEMBER_DISPLAY` (gate-sokea; lisää jos löytyy)
Jos status/tag renderöityy map-arvona (esim. `STATUS_LBL[r.status]`), reititä map-ARVOT + **lisää `MEMBER_DISPLAY`-listaan**
(`tests/idp_i18n_v5_vp_render_dom.test.js`, V6:n `IDP_TILA_LBL`-rivin perään) alueineen. Pinnaa routed-muoto kuten V5/V6/V7a.

## 🔒 _rvcIkavaihe@14825 — faasi (avaimet JO kartassa V7a-fixistä)
`_rvcIkavaihe(ika)` = `ika<=12?'Leikkijä':ika<=15?'Rakentaja':'Showcase'` — **lokaali display** (ei enum). Reititä arvot:
`? vpT('Leikkijä') : ika<=15 ? vpT('Rakentaja') : vpT('Showcase')`. **Avaimet valmiina:** Leikkijä→Lekare · Rakentaja→Byggare · Showcase (verbatim, ei avainta). (Sama korjaus jonka tein 14422:een — tämä on sen sisko 14825:ssä.)

## Analysoidut raa'at fi-näyttösitet (reititä; ei tyhjentävä — gate paljastaa loput)
- **KPI-labelit** @14898–14901: `Vaatii huomiota` · `Itsearvio eroaa VP:stä` · `Odottaa vahvistusta` · `Ajan tasalla` + subit (`… myöhässä` · `… erääntymässä` · `käsittele palaverissa` · `pelaaja sitoutui → vahvista`).
- **fp-suodatinnapit** @14922: `Vaatii huomiota` · `Itsearvioero` · `Odottaa vahvistusta` · `hyvinvointi…`.
- **Toimenpide** @15010–15011 (×2, inline span).
- **cockpit-napit** @15022–15023: `✓ V…` (Vahvista) ym.
- **renderVPTuloskortti** @14628+ : kohortti-otsikot, väri-legenda-tekstit, segmentti/tavoite-modaalien otsikot/napit/placeholderit.

## 🔒 Kanoninen sv (⚠ = vahvista talentmaster-domain / Terolta; tarkista [K]-kartta ENSIN — kartta voittaa)
```
# Review-KPI:t
Vaatii huomiota → Kräver uppmärksamhet     Itsearvio eroaa VP:stä → Självbedömning avviker från UA
Odottaa vahvistusta → Väntar på bekräftelse  Ajan tasalla → Uppdaterad
Itsearvioero → Självbedömningsdiff          … myöhässä → … försenad    … erääntymässä → … förfaller
käsittele palaverissa → hantera på mötet    pelaaja sitoutui → vahvista → spelaren åtog sig → bekräfta
# cockpit / toimenpide
Toimenpide → Åtgärd    ✓ Vahvista → ✓ Bekräfta    (jaksofokuksen harjoite → periodfokusets övning) ⚠
# VP-tuloskortti (⚠ domain: kohortti-kalibrointi)
VP-tuloskortti → UA-resultatkort    Kohortti → Kohort    Segmentti → Segment    Tavoite → Mål
vihreä/amber/punainen (näyttö, jos tekstinä) → grön/gul/röd    Aseta segmentit → Ange segment    Aseta tavoitteet → Ange mål
```
(D3-kalibraatio: `VP`→`UA`-lukko säilyy. `valmentaja`→`tränare`.)

## render-gate RANGES + DoD
1. **render-gate** `RANGES += [[14552, 15185]]` → nykyinen loppuu `[14186,14550]`:iin; lisää V7b-alue perään.
2. **Portit (per commit):** lint EXIT 0 · resolvi-todiste uusille avaimille (`R(k)!==k`) · C1 VP∩common=∅ · sv-dup 0 · suite vihreä · inline-parse 0 · **5 vartijaa 0** (uudet helperit SETTER_FNS:issä + negatiivitestattu) · `?v` +1.
3. **DoD:** Reviewit + VP-tuloskortti sv livenä · enum-avaimet (status/väri/tag) + `fp`-key-argit fi · helper-label-argit reititetty **JA** rekisteröity · `_rvcIkavaihe` sv.

## Domain-invariantit (SÄILYTÄ)
- **Review-elinkaari:** status-logiikka (`myohassa`/`ontime`/`ei_reviewia`) + katselmusvuoro→jakson sulku (`_vpSuljeJakso`, YKSI kohde, §S1) ehjä — vain näyttö kääntyy.
- **VP-tuloskortti-kohortti:** kalibrointilogiikka (vihreä/amber/punainen kynnykset) säilyy — väri-enum EI muutu.
- **jaksofokus/domeeni:** meso-fokus-data (harjoite/cue/konsepti) fi/lib — EI reititetä. §28-kehys + D3-roolit (VP→UA) ehjät.

## Verifiointi (Claude, per commit)
1. 5 vartijaa 0 · riippumaton per-occurrence + object-property + **helper-arg-skanni** V7b-alueelta → 0 (pl. tuotetermit) · lint 0 · C1 ∅ · sv-dup 0 · resolvi.
2. **Live (demo sv) — PAKOLLINEN, pelaajavalinnalla:** avaa Raportit → (Reviewit-cockpit) + VP-tuloskortti → **valitse pelaaja/kohortti** → 0 näkyvää fi (pl. tuotetermit); KPI:t/fp-napit/Toimenpide/cockpit sv; enum-vertailut ehjät (`r.status==='myohassa'`, `_vpTkVari('vihrea')`). Tämä nappaa helper/ternaary-luokat joita source-scanner rakenteellisesti missaa.
3. Domain: review-elinkaari · tuloskortti-kalibrointi · D3-roolit (VP→UA) · §28.

## Jatko-merkinnät (EI V7b — kirjattu seurantaan)
- `_rvcIkavaihe` reititys tehdään tässä (14825) — sen sisar 14422 hoidettu V7a-fixissä.
- **3576** `sub: … ' · Valmius ' + flei + ' · ei talenttiohjelmassa'` (V7a-ulkopuolinen sub-line, sama fi-luokka) → myöhempi erä.
- Pre-existing sv-dup `'Kirjaudu Google-tilillä'` (idempotentti) → poista ohimennen.

## Seuraava
V7b (a–b) 5 vartijaa 0 → merge + live → **V7c Harjoittelun laatu** (`_hl*` 15189–~15685 · `_HL_KRIT_A/B`→MEMBER_DISPLAY) → V7d Joukkueäly → V7e Nominees+tekstiraportti.
