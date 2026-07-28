# CODE_OHJE — Korjaus: Kehityskaari (desimaalit + tasainen-nuoli) & VP Syväanalyysi -selkeys

**Tyyppi:** näyttö-korjaus (ei dataskeemaa) · **Kohteet:** `lib/tm_kehityskaari.js`,
`TalentMaster_VP_v25.html` (`_jsvPerLajiHTML`), `TalentMaster_Master_v16.html` (sisar-lohko).
**Base:** `main`. **Pieni PR.** · **Riippuvuus:** Trendi Vaihe 2 (#277) tuotannossa.

Kaksi erillistä, pientä korjausta Teron livehavainnoista. Osa 1 = Kehityskaari (Vaihe 2 render).
Osa 2 = VP-pelaajakortin **Syväanalyysi → Tekniikka lajeittain** (olemassa oleva, ei Vaihe 2).

---

## OSA 1 — Kehityskaari (`lib/tm_kehityskaari.js`)

Kaksi bugia Aleksi Rajalan (Sibbo) elävästä kortista. Molemmat ovat **render-tason** korjauksia
lib-tiedostossa → korjaus osuu kerralla VP:hen, Masteriin ja Pelaajaan (kaikki lukevat samaa libiä).

### Bug 1.1 — Näytä raaka-arvot max 2 desimaaliin
Nyt rivi näyttää tallennetun raaka-arvon sellaisenaan: **"30 m 6.179→5.377"** (3 desimaalia),
**"8.207→7.337"**. Halutaan max 2: **"6.18→5.38"**, **"8.21→7.34"**.

Lähde: `_testiRivi`:ssä
```js
var arvoTxt = suunta.ensimmainen + '→' + suunta.viimeinen;
```
`ensimmainen`/`viimeinen` ovat pyöristämättömiä raaka-arvoja. Sama koskee **jaksofokus-sidoksen**
`sidos.ennen + '→' + sidos.jalkeen` -tekstiä ja mahdollisia muita raaka-arvojen näyttökohtia
`tmKaariRenderFull`/`tmKaariRenderPelaaja`:ssa.

**Toteutus:** lisää pieni muotoilija ja käytä sitä KAIKISSA näytettävissä raaka-arvoissa:
```js
// max 2 desimaalia, turhat nollat pois: 6.179→6.18, 40→40, 146.6→146.6, 5.3→5.3
function _fmt(x) { return (typeof x === 'number' && isFinite(x)) ? String(Math.round(x * 100) / 100) : String(x); }
```
- `arvoTxt = _fmt(suunta.ensimmainen) + '→' + _fmt(suunta.viimeinen);`
- jaksosidos: `_fmt(sidos.ennen) + '→' + _fmt(sidos.jalkeen)`
- Taso-rivit (`taso 1→1` yms.) ovat kokonaislukuja → ei muutosta, mutta jos ajat ne saman `_fmt`:n
  läpi, ei haittaa.
- **⚡ kehitysnopeus** on jo 2 desimaalissa (`Math.round(nop.perKausi*100)/100`) → jätä ennalleen.
- **ÄLÄ** muuta `tmKaariSuunta`/`tmKaariNopeus`-funktioiden palautusarvoja (delta ym. pysyvät
  tarkkana laskennassa) — pyöristys on **vain näyttöketjussa**.

### Bug 1.2 — Tasainen arvo (Δ=0) näyttää punaisen ↓ — pitää olla neutraali →
Aleksilla **"Ponnauttelu 40→40 ↓"** ja **"D1 fyysinen taso 1→1 ↓"**: arvo ei muuttunut, mutta
näytetään punaisella alanuolella (= "huononsi"). Väärin — muuttumaton ei ole lasku.

Juurisyy: `tmKaariSuunta` palauttaa Δ=0-tapauksessa `{ suunta:'flat', parani:false }`, ja `_nuoli`
tulkitsee `parani === false` → punainen ↓ (ei erottele flatia laskusta):
```js
function _nuoli(avain, suunta, phvTila) {
  var neutraaliPre = PHV_HERKKA[avain] && PRE_PHV[phvTila];
  if (suunta.parani === true) return { merkki: '↑', vari: 'var(--teal,#28B090)' };
  if (suunta.parani === false) {            // ← flat putoaa tähän → punainen ↓
    if (neutraaliPre) return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };
    return { merkki: '↓', vari: '#C94040' };
  }
  return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };
}
```

**Toteutus (kirurginen, testiturvallinen):** lisää `_nuoli`:n alkuun flat-tarkistus. Älä muuta
`tmKaariSuunta`:n sopimusta (vitestit nojaavat siihen):
```js
function _nuoli(avain, suunta, phvTila) {
  if (suunta.suunta === 'flat') return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };  // Δ=0: ei nousu eikä lasku
  var neutraaliPre = PHV_HERKKA[avain] && PRE_PHV[phvTila];
  if (suunta.parani === true)  return { merkki: '↑', vari: 'var(--teal,#28B090)' };
  if (suunta.parani === false) return neutraaliPre ? { merkki:'→', vari:'var(--ink3,#8C8B86)' } : { merkki:'↓', vari:'#C94040' };
  return { merkki: '→', vari: 'var(--ink3,#8C8B86)' };
}
```

### HUOM — Ponnauttelu ON aikalaji (ei muutosta, dokumentoitu tässä)
Aiemmassa katselmoinnissa epäilin virheellisesti että Ponnauttelu olisi määrälaji (isompi parempi).
**Tero vahvisti: ponnauttelu on aikalaji** (pienempi parempi), ja koodi on **jo oikein**:
`PIENEMPI_PAREMPI.ponnauttelu = true` (lib) ja `_JSV_TKLAJIT`:ssa `kaant:false`, kenttä
`ponnauttelu_s`. **Älä muuta ponnauttelun suuntalogiikkaa** — "40→40 ↓" oli pelkkä flat-bugi (1.2),
ei väärä suunta.

### L2 (vitest)
- **Desimaali:** `tmKaariRenderFull` pelaajalla jolla `lin30m: 6.179 → 5.377` → tuotettu HTML
  sisältää `6.18` ja `5.38`, EI `6.179`/`5.377`.
- **Flat:** sarja jossa kaksi yhtä suurta pistettä (esim. `[{ms:1,arvo:40},{ms:2,arvo:40}]`) →
  render-HTML sisältää `→` eikä punaista `↓` kyseisellä rivillä. (Testaa render-tason kautta, koska
  `_nuoli` ei ole exportattu — tai lisää `_nuoli` API:in testattavaksi.) `tmKaariSuunta(...).suunta`
  pysyy `'flat'`.
- Aiemmat #277-testit vihreinä (~861). Ei regressiota.

### `?v=`-bump
Lib muuttui → nosta `?v=` **VP_v25 + Master_v16 + Pelaaja_v7** lib-`<script src>`:ssä (kaikki kolme
lataavat `tm_kehityskaari.js`:n).

---

## OSA 2 — VP Syväanalyysi "Tekniikka lajeittain" -selkeys

**Kohde:** `TalentMaster_VP_v25.html` → `_jsvPerLajiHTML` (~rivi 7263) ja sen data `_jsvLajiData`
(~7239). **Sisar-lohko:** `Master_v16` (~5140, `tkLajiGapit`-silmukka) — sama selkeytys sinne.
Pelaaja-appiin **ei** kosketa (§7.22, pelaaja ei näe kovia gap-lukuja).

### Ongelma (Teron havainto)
VP-pelaajakortin ▸ Syväanalyysi → **Tekniikka lajeittain / Alueellinen huipputaso 2023–25** näyttää
per laji: `arvo` · `hyvä ≤X` · `+gap s` · `T-merkki`. Tero: *"jotenkin sekavasti esitetyt luvut —
mitä punainen ja keltainen tarkoittaa?"* Syyt:

1. **Kaksi eri väriasteikkoa samalla rivillä, ilman selitettä.**
   - **`+Xs`-luvun väri** (`_jsvPerLajiHTML`: `vari = (gap<=0)?teal : (gapPct<=0.20?amber:red)`):
     ero **alueelliseen huipputasoon** (2023–25 elite-viite). Vihreä ★ = saavutettu; keltainen =
     ≤20 % päässä; punainen = >20 % päässä.
   - **`T`-merkki** (`_jsvTasoVari5(tkTaso)`): **Eerikkilän valtakunnallinen taso 1–5** (eri asteikko!)
     — T4–T5 vihreä = kärki, T2 punainen = matala.
   - → Ristiriitainen näkymä on **odotettu mutta selittämätön**: esim. Ponnauttelu punainen **+12.7s**
     mutta vihreä **T4**. Selitys: Eerikkilä-taso 4 on valtakunnallisesti hyvä, mutta "alueellinen
     huipputaso" on paljon tiukempi eliittiraja → voi olla vahva kansallisesti ja silti kaukana
     alueellisesta kärjestä. Käyttäjä ei voi tietää tätä ilman selitettä.

2. **Yksikkövirhe:** `gapTxt = '+' + d.gap + 's'` ja `d.arvo + 's'` kovakoodaavat sekunnin. Mutta
   **`pituuspotku_bonus` on `kaant:true`** (ei aikalaji — pituus/bonus, isompi parempi). Silti näkyy
   "Pituuspotku (bonus) 6s … hyvä ≥13.2s +7.2s" → sekunti on väärä yksikkö tälle lajille.

3. **Ahdas asettelu:** flex-sarakkeiden kiinteät leveydet (`.jsv-an-ka` 60px, `.jsv-an-viite` 88px,
   `.jsv-an-gap` 48px + badge) puristuvat kapeassa modaalissa lähes kiinni toisiinsa → luvut lukevat
   "yhteen juoksevana". Kaipaa hengitystilaa / hallitumpaa rivitystä.

### Työ

**2.1 Selite kahdelle asteikolle (tärkein).** Lisää `_jsvPerLajiHTML`:ään otsikon/`_jsvViiteLabel`:n
alle **yksi rivi** joka avaa värikoodauksen (design-lukko: `.jsv-an-lahde`-tyyli, hiusviiva, ink3).
Esim.:
> `+s` = ero alueelliseen huipputasoon (🟡 lähellä ≤20 % · 🔴 kaukana >20 % · ★ saavutettu) · **T** =
> Eerikkilä-taso 1–5 (valtakunnallinen, eri asteikko)

Master_v16:lla on jo `Taso 1–5 ℹ️`-vihje T-merkille; **lisää vastaava gap-väriselite molempiin** niin
että molemmat asteikot ovat selitetty samassa paikassa. Pidä teksti lyhyenä, molemmat teemat.

**2.2 Korjaa yksikkö kaant-lajeille.** `pituuspotku_bonus` (ja muut `kaant:true`) EIVÄT ole sekunteja
→ älä kovakoodaa `'s'`. Lisää lajimetaan yksikkö (esim. `_JSV_TKLAJIT`-riville `yks`) ja käytä sitä
sekä `arvo`- että `+gap`-tekstissä; kaant-lajille pudota `'s'` (tai oikea yksikkö, esim. `m` jos
pituus). **Varmista todellinen yksikkö** ennen kuin merkitset — kenttä on `pituuspotku_bonus_s` mutta
`kaant:true` + `≥`-vertailu viittaa etäisyyteen/pisteeseen, ei aikaan. Jos yksikkö on epävarma, jätä
pelkkä luku ilman `'s'`-liitettä kaant-lajeille.

**2.3 Asettelu.** Väljennä riviä niin ettei se lue yhteen juoksevana: erota selkeästi **laji + arvo**
vs **viite (hyvä ≤X)** vs **+gap** vs **T-merkki** (esim. viite omalle himmeämmälle rivilleen/kohtaan,
tai `gap`-sarakkeelle marginaali). Säilytä design-lukko (hiusviivat, teal-aksentti, DM Mono luvuille,
ei täyttövärejä). Molemmat teemat renderöityvät.

**Rajaus:** ei muuta laskentaa (gap/gapPct/tkTaso ennallaan) — vain **selite, yksikkö ja asettelu**.
Ei kosketa Pelaaja-appiin.

### L2 / verifiointi (Osa 2)
- Kevyt: jos lisäät yksikkö-metaa, unit-testi että `pituuspotku_bonus` ei tuota `'s'`-liitettä.
- Pääosin **L3-visuaalinen** (render-only): VP-pelaajakortti (Aleksi/Sibbo tai Topias) → ▸ Syväanalyysi
  → selite näkyy, pituuspotku ilman väärää `'s'`, rivit luettavia, molemmat teemat.

---

## Definition of Done
- **L1:** `_fmt` max-2-desimaalia kaikkiin näytettäviin raaka-arvoihin (arvoTxt + jaksosidos);
  `_nuoli` flat→neutraali →; ponnauttelu ennallaan. VP+Master Syväanalyysi: väriselite (2 asteikkoa),
  kaant-yksikkö korjattu, asettelu väljennetty.
- **L2:** vitest desimaali (6.18/5.38) + flat (→ ei ↓); ~861+ vihreä, ei regressiota.
- **L3 (elävä, molemmat teemat):**
  - Kehityskaari: Aleksi 30 m **6.18→5.38 ↑**, ketteryys **8.21→7.34 ↑**; Ponnauttelu 40→40 **→**
    (ei punaista ↓); D1 taso 1→1 **→**.
  - VP Syväanalyysi: väriselite näkyy; pituuspotku ei näytä väärää `'s'`; rivit luettavia.
- Pieni PR (render). Lataa VP/Master/Pelaaja uudelleen deployn jälkeen (`?v=`-bump).
