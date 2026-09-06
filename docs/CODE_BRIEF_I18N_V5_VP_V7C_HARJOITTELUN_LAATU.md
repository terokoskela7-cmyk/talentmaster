# Code-brief — i18n V5 · VP_v25 **alaerä V7c: Harjoittelun laatu (`_hl*`) [15189–~15690]**

> **Konteksti:** V3–V7b mainissa, **live-verifioitu tuotannossa** (?v=22). V7b-live nappasi **16 vuotoa joita gate ei nähnyt** —
> kaikki *epäsuoran displayn* luokkia. Perit vahvemman gaten (kaikki alla), mutta **kova opetus pätee: gate-vihreä EI riitä.
> Live-tarkistus on pakollinen portti.** V7c:ssä on paljon näitä samoja luokkia (kriteerilabelit, label-funktiot, plural-helperit,
> select-rakentaja, ternaary→textContent) → ne on lueteltu §2:ssa etukäteen. **Reititä JA rekisteröi JA aja live.**

## Peritty gate (älä pura — laajenna vain)
`tests/idp_i18n_v5_vp_render_dom.test.js` sisältää jo:
- **per-occurrence render-gate** (AST, char-range) · **staattinen-DOM** · **object-property `MEMBER_DISPLAY`** · **`.textContent`/0B** · **resolves-scanner**
- `SETTER_FNS = {toast,_setTxt,_dSet,idrow,kpi,fp,set}` (display-arg-helperit, molemmat/label-argit näyttöä)
- `inDisplayContext` kävelee **ConditionalExpression**in läpi (ternaary-haara markup-ketjussa)
- `DISPLAY_PROPS = {teksti}` (object-property badge-arvot) · `codeish += rgba/hsla/gradient/calc + /--/` (CSS/BEM) · `PRODUCT = [Uu]nderdog|…`

## §0 (KRIITTINEN, ENSIN) — kaksi gate-korjausta
### 0A — PRODUCT-allowlist: koko-literaali, EI osajono (V7b-live-oppi)
V7b-livessä `'Underdog-toimenpideaste (%)'` **vuoti tuotantoon** koska `PRODUCT.test(piece)` on **substring-haku**: "Underdog" mätsäsi ja koko labelin fi-osa (`toimenpideaste`) jäi vartioimatta. **Korjaa:** piece on allowlistattu VAIN jos **poistettuasi tuotetermit + lyhenteet + erottimet/numerot siitä EI jää fi-sanaa**:
```
const stripAllow = (t) => t.replace(PRODUCT_G, ' ').replace(ABBR_G, ' ').replace(/[·—–\-/:()%.,+&; 0-9]|&amp;|&nbsp;/g, ' ');
// vuoto jos: hasWord(stripAllow(piece))  (eli tuotetermin JÄLKEEN jää suomea)
```
(Nykyinen `PRODUCT.test(p)`-ohitus korvataan tällä. `PRODUCT_G`/`ABBR_G` = samat termit `g`-flagilla.) **Negatiivitesti:** `'Underdog-toimenpideaste'` → FAIL (fi jää); `'Underdog'` yksin → OK (ei jää); `'Player Development Card'` → OK.

### 0B — `DISPLAY_PROPS={teksti}` FP-vahti
`teksti:`-prop laukaisee display-tarkistuksen. V7c:ssä on Firestore-kirjoitus `.add({ teksti: teksti, … })`@~15676 — siinä `teksti` on **muuttuja, ei literaali** → gate ei flagaa (OK). MUTTA jos gate flagaa jonkin `teksti:'…fi…'`-literaalin joka on **dataa (DB-write), ei näyttöä**, ÄLÄ allowlistaa sokeasti — varmista onko se näyttöä. (Todennäköisesti ei osu V7c:ssä; heads-up.)

---

## Scope (analysoitu) — Harjoittelun laatu -raportti
| Alue | Rivit (n.) | Sisältö |
|---|---|---|
| Kriteerilabelit + mallinvaihto | 15188–15240 | `_HL_KRIT_A/B`, `_hlKritLabel`, `_hlMalli`, `_hlVaihdaMalli`, vertailunapit |
| Suodattimet | 15243–15267 | `_hlRenderSuodattimet` (`sel`-rakentaja + `<option>`-tekstit), `_hlOpts`, `_hlSuodata` |
| Pääraportti + kalibraatio | 15280–15410 | `_hlRender`, `_hlKalibraatioHTML`, gate-tyhjät, delta-värit |
| Trendi-kaavio | 15411–15425 | `_hlPiirraTrendi` (Chart.js — dataset-label `'Seura'`, akselit) |
| Modaalit + parinmuodostus | 15426–~15690 | `_hlAvaaSeuraTavoiteB`/`_hlAvaaBenchmark`/`_hlAvaaTapahtuma`/`_hlRenderTapahtuma`/`_hlKalibTyhjaViesti`/`_hlEhdotaPari`/`_hlPariBlokki`/`_hlVahvistaPari`/`_hlTorjuPari`/`_hlLinkitaManuaali`/`_hlLisaaPalaute` |

**Yläraja-lukko:** V7c **loppuu ~15690** (`_hlLisaaPalaute`-lohkon loppuun). `renderJoukkuealy`@15770 = **V7d** — ÄLÄ mene sinne. Vahvista tarkka loppurivi (viimeinen `_hl`-funktio ennen 15770).

---

## §1 enum-raja (PYSYY fi — ÄLÄ reititä)
- **`_hlMalli`-arvot:** `'palloliitto'` · `'valmennustaidot'` · `'pelaajataidot'` — vertailuissa `_hlMalli === 'valmennustaidot'` + Firestore → **avaimet fi.**
- **Kriteeriavaimet `a1–a7` / `b1–b7`** (`_HL_KRIT_A/B`, `_hlKritLabel(k)`, `_hlMax`, `_hlOverall*`) → avaimet fi; **arvot (labelit) reititetään.**
- **`<option value="…">`-arvot:** `'lapsuus'/'nuoruus'` · `'3kk'/'6kk'/'12kk'` · `'kuukausi'/'viikko'/'kausi'` · `'itsearvio'/'havainnointi'` → **value=enum fi**, näyttöteksti reititä.
- pelaaja/valmentaja/joukkue-nimet (`_hlEsc(j)`, `vset[u]`) · id:t · pvm · `.add({teksti})`-datakirjoitus · Firestore-arvot.

## 🔒 Object-property-display → `MEMBER_DISPLAY` (gate-sokea; PAKOLLINEN)
Reititä map-ARVOT `vpT`:llä JA lisää `MEMBER_DISPLAY`-listaan (V6:n `IDP_TILA_LBL`-rivin perään; pinnaa routed-muoto):
```
{ expr: '_HL_KRIT_A[k]',   ranges: [[15455, 15470]] },   // benchmark-rivi
{ expr: '_hlKritLabel(k)', ranges: [[15280, 15690]] },   // _hlRender + kalibraatio + tapahtuma
```
- **`_HL_KRIT_A`@15189 / `_HL_KRIT_B`@15190:** reititä arvot `vpT('Innostavuus')` ym. → näyttö `_HL_KRIT_A[k]` / `_hlKritLabel(k)` resolvoituu.
- **`_hlKritLabel(k)`@15194** on `return (…)[k] || k` → **label-funktio (`return <fi>`-luokka, kuten V7b `_vpKohorttiLabel`)** → reititä: `return vpT((_hlMalli==='valmennustaidot'?_HL_KRIT_B:_HL_KRIT_A)[k] || k)`. (Kun map-arvot on vpT'd, tämä on kaksinkertainen — valitse **yksi paikka**: reititä map-arvot TAI use-site, äläkä molempia. **Suositus: reititä `_hlKritLabel`-return + `_HL_KRIT_A[k]`-use-sitet, jätä map-arvot fi:ksi dataksi** — johdonmukaista `IDP_TILA_LBL`-mallin kanssa.)

## §2 Epäsuora-display-luokat V7c:ssä (V7b-live-opit — reititä JA rekisteröi)
1. **Select-rakentaja `sel(id, label, opts)`@15247** — `label` on näyttö (bare-arg). **Lisää `'sel'` SETTER_FNS:iin** + reititä 6 labelia: `Joukkue` · `Ikävaihe` · `Valmentaja` · `Aikaväli` · `Arviointitapa` · `Trendi`. `<option>`-tekstit ovat markupissa → gate näkee, mutta reititä: `>Kaikki</option>` · `Lapsuus 5–11` · `Nuoruus 12–15` · `Koko historia` · `Viim. 3/6/12 kk` · `Kuukausi/Viikko/Kausi` · `Itsearvio/Havainnointi`.
2. **Plural-helperit `it(n)`@15546 / `hv(n)`@15547** — `n + ' itsearvio'+(n===1?'':'ta')`. Suomen taivutus ≠ ruotsi → **placeholder-template:** `vpT('{n} självbedömning').replace('{n}',n)` yks./mon. tai `vpT(n===1?'{n} itsearvio':'{n} itsearviota')`. (sv: självbedömning/självbedömningar · observation/observationer.)
3. **Ternaary→`.textContent`@15236** — `vbtn.textContent = m==='valmennustaidot' ? '⚙ Aseta seuran tavoitetaso' : '⚙ Aseta kansalliset vertailuarvot'` → kääri **molemmat haarat** `vpT()`:hen (0B + ternaary-kävely vartioi jälkeenpäin).
4. **Chart-label `'Seura'`@15417** (`label: 'Seura'`) → `vpT('Seura')`. `vertNimi`/`t.label` = data. Akselitikit `color:'#8A8A82'` = koodi.
5. **Modaali-otsikot/napit** (`_hlAvaa*`, `_hlRenderTapahtuma`, `_hlPariBlokki`, `_hlKalibTyhjaViesti`) — markup-literaalit → gate näkee, reititä normaalisti.

## 🔒 Kanoninen sv (⚠ = vahvista talentmaster-domain / Terolta; [K]-kartta voittaa — dup-check ENSIN)
```
# _HL_KRIT_A (pelaajataidot) ⚠ domain
Innostavuus→Entusiasm · Liikkeessä %→I rörelse % · Pallokosketukset→Bollkontakter
Teknis-takt. toistot→Teknisk-taktiska reps · Heittäytyminen→Insats · Maalinteko %→Målgörande % · Seuran oma (Q7)→Föreningens egen (Q7)
# _HL_KRIT_B (valmennustaidot) ⚠ domain
Organisointi→Organisering · Tavoitteen selkeys→Målets tydlighet · Palaute (määrä)→Feedback (mängd) · Palaute (laatu)→Feedback (kvalitet)
Pedagogiikka→Pedagogik · Eriyttäminen→Differentiering · Vuorovaikutus→Interaktion
# suodattimet
Joukkue→Lag (common) · Ikävaihe→Åldersfas · Valmentaja→Tränare · Aikaväli→Tidsintervall · Arviointitapa→Bedömningssätt · Trendi→Trend
Kaikki→Alla · Lapsuus 5–11→Barndom 5–11 · Nuoruus 12–15→Ungdom 12–15 · Koko historia→Hela historiken
Viim. 3 kk→Senaste 3 mån · Viim. 6 kk→Senaste 6 mån · Viim. 12 kk→Senaste 12 mån · Kuukausi→Månad · Viikko→Vecka · Kausi→Säsong
Itsearvio→Självbedömning · Havainnointi→Observation
# napit / kaavio / plural
⚙ Aseta seuran tavoitetaso→⚙ Ange föreningens målnivå · ⚙ Aseta kansalliset vertailuarvot→⚙ Ange nationella jämförvärden
Seura→Förening (chart-label) · {n} itsearvio(ta)→{n} självbedömning(ar) · {n} havainnointi(a)→{n} observation(er)
```
(`palloliitto/valmennustaidot/pelaajataidot` = enum, EI reititetä. `Palloliitto`-tuotenimi näyttönä → Bollförbundet, jo V7b-fix2-kartassa.)

## Domain-invariantit (SÄILYTÄ)
- **§7.22-sävy:** harjoittelun laatu -palaute on **kehittävää, ei rankaisevaa** — käännä ohjaava/kannustava sävy säilyttäen.
- **Malli-dikotomia:** pelaajataidot (A, 0–10, Palloliitto-benchmark) vs valmennustaidot (B, 1–5, seuran tavoitetaso) — logiikka + asteikot (`_hlMax`) ehjät, vain näyttö kääntyy.
- **Itsearvio vs havainnointi** -parinmuodostus (`_hlEhdotaPari`/`_hlVahvistaPari`) säilyttää merkityksen.

## render-gate RANGES + DoD
1. `RANGES += [[15189, 15690]]` (vahvista yläraja `_hlLisaaPalaute`-lopun mukaan; alle `renderJoukkuealy`@15770).
2. **MEMBER_DISPLAY** += `_HL_KRIT_A[k]`, `_hlKritLabel(k)`. **SETTER_FNS** += `sel`. **PRODUCT-korjaus 0A** + negatiivitestit.
3. **Portit:** lint 0 · resolvi uusille (`R(k)!==k`) · C1 ∅ · sv-dup 0 · suite vihreä · inline-parse 0 · **5 vartijaa 0** (uudet negatiivitestatut) · `?v` +1.

## Verifiointi (Claude, per commit)
1. 5 vartijaa 0 · **riippumaton acorn-skanni V7c-alueelta** (per-occurrence + object-property + helper-arg + `return <fi>` + plural-concat) → 0 aitoa (pl. tuotetermit, 0A-korjatulla logiikalla) · lint 0 · C1 ∅ · resolvi.
2. **Live (demo sv) — PAKOLLINEN:** Raportit → Harjoittelun laatu → **vaihda malli (pelaajataidot ↔ valmennustaidot)**, avaa suodattimet + kalibraatio + benchmark-modaali + tapahtuma → 0 näkyvää fi (pl. tuotetermit); kriteerilabelit sv (Entusiasm/Organisering…); enum-vertailut ehjät (`_hlMalli==='valmennustaidot'`, `<option value>` fi). Kaavio-label sv. Plural-tekstit oikein.
3. Domain: §7.22-sävy · malli-asteikot (0–10 vs 1–5) · itsearvio/havainnointi-pari.

## Seuraava
V7c 5 vartijaa 0 → merge + **live pelaajavalinnalla** → **V7d Joukkueäly** (`renderJoukkuealy` 15770–15884 · paikanna helper-luokat) → **V7e Nominees + tekstiraportti** (`lahetaRaportti` kausikooste). Sitten V8 Työkalut+Asetukset.

> **Muistutus (koko V7b-oppi tiivistettynä):** näyttöteksti vuotaa monta epäsuoraa reittiä — object-property-arvot, array-elementit, `.push()`, ternaary→var, `return <fi>`, label-funktiot, lib-data render-sitessä. Source-scanner + gate kattavat ne vain osittain (rekisteröidyt helperit + MEMBER_DISPLAY). **Loput nappaa vain live pelaajavalinnalla.** Aja se ennen kuin ilmoitat "valmis".
