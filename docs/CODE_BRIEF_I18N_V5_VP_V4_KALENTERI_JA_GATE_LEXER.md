# Code-brief — i18n V5 · VP_v25 **alaerä V4: Kalenteri sv + PAKOLLINEN gate-lexer-kovennus (vaihe 0)**

> **Konteksti:** V3 (Joukkue-syvänäkymä) + korjaus + decision-C mainissa/mergessä. Committattu VP render-gate
> (`tests/idp_i18n_v5_vp_render_dom.test.js`) guardaa V3-alueen (`RANGES=[[8040,9221]]`). V4 vie kalenteri-pinnan
> ruotsiksi **JA** kovettaa gaten ennen kuin se on V4:n ensisijainen vartija — dokumentoitu blind-spot (`variable + 'fi-suffiksi'`)
> on liian laaja jätettäväksi. **Vaihe 0 (lexer) tehdään ENNEN V4-reititystä**, muuten V4 rakentuu vartijan varaan jossa on reikä.

---

## VAIHE 0 (PAKOLLINEN, ENSIN) — gate-lexer-kovennus (AST-pohjainen)

### Juurisyy (analysoitu)
Nykyinen gate skannaa **konkatenoitua lähdekoodia rivi kerrallaan**: se poimii `>text<`- ja `title=`-spanit RAA'ASTA
lähteestä ja pudottaa `codeLike`-suodattimella kaiken missä on `' + '`. Tästä seuraa **kaksi vikaa yhtä aikaa**:
1. **Blind-spot:** `'…>' + d.tkTaso + '/5 alue</span>'` → poimittu span `' + d.tkTaso + '/5 alue` sisältää `' + '` → ohitetaan.
   Koko `muuttuja + 'fi-suffiksi'` -luokka jää vartioimatta (ei vain harvinaisuus — kaikki yksikå․suffixnäytöt).
2. **122 väärää positiivista** (Coden yritys): naiivi `' + '`-tokenisointi pareutuu väärin `vpT('…')`-kutsujen sisällä.

**Molemmat johtuvat samasta virheestä: gate operoi konkatenoidulla LÄHDETEKSTILÄ, ei yksittäisten
string-literaalien ARVOILLA.** `' + '` on JS-syntaksia literaalien VÄLISSÄ — se ei koskaan esiinny literaalin arvon SISÄLLÄ.

### Ratkaisu — skannaa AST-literaalien arvot, ei lähderivejä
`acorn` on jo repossa (8.17.0). Rakenna gate uudelleen näin:

1. **Parsi** VP-pääscriptin lähde (`RLO..RHI`) AST:ksi: `acorn.parse(src, {ecmaVersion:'latest', locations:true})`.
   Jos parse heittää (yksittäinen syntaksinikotus), lisää `acorn-loose` (`npm i -D acorn-loose`) ja `parse`→`LooseParser`.
2. **Kävele AST** (pieni rekursiivinen walk, ei tarvitse acorn-walkia): kerää
   - **ROUTED-joukko:** jokainen `CallExpression` jonka `callee.name ∈ {vpT, vpTToimenpide}` → sen argumenttien
     `Literal`(string)- ja `TemplateLiteral`-quasi-arvot. **AST-eksakti** → poistaa paren-matching-hauraudet (ei enää 122 FP).
   - **KANDIDAATIT:** kaikki muut `Literal`(string) + `TemplateLiteral`-quasit RANGES-alueilla (per solmun `loc.start.line`).
3. **Kandidaatti = vuoto jos**, literaalin ARVON `v` osalta (ei lähderivin):
   - `v` sisältää näyttötekstiä: joko koko `v` on fi-sana-teksti (esim. `/5 alue`, `Avaa pelaajat`), TAI `v`:stä löytyy
     `>([^<>]*)<` / `title="([^"]*)"` / `placeholder="([^"]*)"` jonka sisältö on fi-sanaa. **Poiminta tapahtuu yksittäisen
     literaalin arvosta** → `'/5 alue'` on oma literaali arvoltaan `/5 alue` (puhdas, ei `' + '`-saastetta).
   - EIKÄ `v` (tai poimittu pala) ole ROUTED-joukossa · EIKÄ allowlistissa (lib-nimet · tuotetermit · lyhenteet/yksiköt) ·
     EIKÄ pelkkää lyhennettä/koodia (`hasWord`-heuristiikka ennallaan).
4. **RANGES-rajaus** solmun `loc.start.line`:llä (sama inkrementaalinen malli: V4 lisää oman alueensa).

### Miksi tämä on todistettavasti oikein
- **Blind-spot korjaantuu:** `'…>' + d.tkTaso + vpT('/5 alue') + '</span>'` — `'/5 alue'` on `vpT`:n argumentti → ROUTED.
  Jos joku poistaa reitityksen → `'/5 alue'` on irrallinen literaali (arvo `/5 alue`, ei `' + '`) → ei ROUTED → **vuoto napataan.**
  (Nykyinen gate ei nappaa tätä; uusi nappaa — tämä on juuri se negatiivitesti joka nyt menee läpi väärin.)
- **122 FP poistuu:** ROUTED tulee AST-solmusta (`vpT`-callin arg), ei tekstihausta → `vpT('a' + b)`-tyyliset eivät pareudu väärin.
- **Osittais-konkatenaatiovuoto napataan bonuksena:** `'<button>Luo ' + x + ' teema'` → literaali `'<button>Luo '` sisältää
  `>Luo ` (fi) eikä ole vpT-arg → vuoto. Oikein.

### Vaihe 0 DoD
- Uusi AST-gate vihreä nykyisellä `RANGES=[[8040,9221]]` (V3 pysyy 0).
- **Negatiivitesti (kaksi muotoa, molemmat failaavat):** (a) `>Full text<` yhdessä stringissä; (b) `var + 'fi-suffiksi'`
  (esim. palauta `d.tkTaso + '/5 alue'` → gate FAILAA rivillä 8373). Palauta → vihreä. **Tämä on kovennuksen hyväksyntäkriteeri.**
- Aja gate koko suitella → **0 uutta väärää positiivista** (jos jää, kavenna näyttöteksti-heuristiikkaa, ÄLÄ allowlistaa aitoja vuotoja).
- Poista stale docstring-maininta C_ALLOW-provisorista (rivit 12–13) — ei enää totta.

---

## VAIHE 1 — Kalenteri sv (analysoitu skooppi)

### ⚠ Skooppi = KOKO kalenteriklusteri (ei vain renderKalenteri — Masterin Erä 2 -oppi: per-funktio-skooppaus aliarvioi)
| Alue | Rivit (n.) | Sisältö |
|---|---|---|
| `renderKalenteri` | **12637–~12760** | kuukausi- + listanäkymä, tapahtumakortit, `cal-mode`/`cal-legend`, tila-pillit, "Ei tapahtumia", "✕ Sulje", "📝 Täytä lomake" |
| `KALENTERI_TYYPIT` näyttö | **12822–12833** | `.nimi`-kentät (Testitapahtuma/Ottelu/Harjoitus/…/Muu) — näkyy `meta.nimi`-kautta monessa kohtaa |
| `avaaUusiTapahtuma` -modaali | **~12760–13110** | "Uusi tapahtuma", "Tallentuu seuran kalenteriin", tyyppi-select (`meta.ikoni + ' ' + meta.nimi`), toastit (`… lisätty`) |
| `suljeTapahtuma` · `avaaTapahtumaV9` + kortti-helperit | **12789 · 13550 · 13681 · 13738** | tapahtuman sulku/avaus, `meta`-käyttö korteissa |

### 🔒 §1 enum-raja (KRIITTINEN — sama kuin Master _prTilaBadge)
`KALENTERI_TYYPIT`-**avaimet** (`'ottelu'`, `'harjoitus'`, `'testitapahtuma'`, …) ovat enum-**arvoja**: käytetään
`t.tyyppi === 'ottelu'` -vertailuissa + Firestoressa → **PYSYVÄT fi. ÄLÄ reititä avaimia.**
Reititä **vain näyttö** z.nimi`-kentästä: kääri käyttö `vpT(meta.nimi)` render-siteissä (12600/12728/12865/13106/13550/13681),
ÄLÄ muuta `KALENTERI_TYYPIT`-objektin `nimi`-dataa. `.nimi`-arvot lisätään karttaan display-map-avaimiksi.

### 🔒 Kanoninen sv (tarkista ENSIN [K]-kartasta — kartta voittaa; nämä ehdotukset uusille)
```
# KALENTERI_TYYPIT.nimi (display; enum-avain pysyy fi)
Testitapahtuma → Testtillfälle    Ottelu → Match           Harjoitus → Träning
Valmentajapalaveri → Tränarmöte   Jaksopalaveri → Periodmöte   Tiimipalaveri → Teammöte
Mentorointitapaaminen → Mentorsmöte   Kalibraatiopaja → Kalibreringsworkshop
IDP-seuranta → IDP-uppföljning    Talenttileiri → Talangläger   Muu → Annat
# näkymävalitsin + tyhjä + napit
Kausi → Säsong    Kuukausi → Månad    Ei tapahtumia → Inga händelser
Uusi tapahtuma → Ny händelse    Tallentuu seuran kalenteriin → Sparas i föreningens kalender
✕ Sulje → ✕ Stäng    📝 Täytä lomake → 📝 Fyll i formulär    {nimi} lisätty → {nimi} tillagd
```
> ⚠ **B2-legend vs enum-nimi:** aiempi B2-brief listasi `Joukkueharjoitus→Lagträning`; tässä enum on `Harjoitus→Träning`.
> Tarkista [K]-kartasta kumpi on jo olemassa ja käytä sitä (dup-check). Ilmoita PR:ssä jos legend/enum eroaa.

### ⛔ ÄLÄ reititä
`KALENTERI_TYYPIT`-**avaimet** · `t.tyyppi`/`status`-enumit vertailuissa · id:t · pvm-arvot · demo · Firestore-arvot ·
lyhenteet/lajinimet (§7 lib) · tuotetermit. Aika-/pvm-templatet §6 placeholderilla (`.replace('{n}',x)`).

### Domain-invariantit
Tapahtumatyypit ovat seuran kalenteriterminologiaa — pidä merkitys (Testitapahtuma = testitilaisuus, ei "koe"). §6 aikamuodot.

## VAIHE 2 — lisää V4-alue gaten RANGES-listaan
`RANGES = [[8040,9221], [12600, 13750]]` (kalenteriklusteri). Aja **AST-gate** → reititä kunnes 0.

## Portit + DoD (V4)
- **Vaihe 0:** AST-gate korvaa rivipohjaisen · molemmat negatiivimuodot failaavat · V3-alue 0 · 0 uutta FP.
- **Vaihe 1–2:** kalenteriklusteri sv livenä · §1 enum-avaimet fi · `.nimi` reititetty display-mapilla · gate 0 alueella `[12600,13750]`.
- Uudet avaimet dup-checkillä → `?v=12→13`. [K]-kartta voittaa. Kanoni eksaktisti.
- **lint EXIT 0 ENNEN committia** · resolvi-todiste kaikille uusille avaimille (`R(k)!==k`) · C1 ∅ · sv-dup 0 · suite vihreä · inline-parse 0.

## Verifiointi (Claude)
1. **Vaihe 0:** aja oma negatiivitesti molemmilla muodoilla (ml. `var + '/5 alue'` → FAIL); FP-skanni; V3 pysyy 0.
2. AST-gate 0 alueilla [8040,9221]+[12600,13750] · lint 0 · C1 ∅ · sv-dup 0 · suite · ?v=13.
3. Riippumaton literaali-arvo-skanni kalenteriklusterista → 0 raakaa fi (pl. allowlist).
4. Live: Kalenteri sv → kuukausi/lista/legend/uusi-tapahtuma-modaali 0 näkyvää fi-avainta; enum-avaimet ehjät (`t.tyyppi===` toimii).

## Seuraava
V4 gate=0 → merge → V5 Valmentajat (renderValmentajat 11661 + avaaCoachPanel 11867 + _cmTab 12190). AST-gate guardaa alusta.
