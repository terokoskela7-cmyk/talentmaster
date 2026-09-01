# Code-brief — i18n VAIHE 5 · **VAIHE 0 (perusta): jaettu `lib/tm_i18n_common.js` + glossaari-SSOT + VP-dedupe**

> **Konteksti:** Henkilöstöpinnan sv-käännös laajenee 1 sivusta (VP) neljään (VP, Valmentaja/Master, Seura, myöhemmin
> Admin/Testaus/Excel). Kaikki käyttävät samaa lähdeteksti-getter-mallia (`data-i18n="<suomi>"` + `vpT(fi)`-tyylinen
> resolvinti + sweep). **Ongelma:** jaetut stringit (Spara/Avbryt/roolit/lukitut glossaaritermit) ajautuvat eri
> käännöksiin eri sivuilla. Löydetty jo: **"Kehon valmius" esiintyy neljänä sv-varianttina** — jopa `tm_vp_i18n.js`:n
> sisällä on sekä "Kroppslig beredskap" ETTÄ "kroppens beredskap" (rivi ~2242).
>
> **Ratkaisu (tämä PR):** yksi jaettu lähdeteksti-lib `lib/tm_i18n_common.js` jonka **kaikki henkilöstösivut lataavat**,
> sisältää **vain jaetut stringit + lukitun glossaarin** (arvot konformoivat `tm_lang.js`:ään = syvin glossaari-SSOT).
> Sivukohtaiset kartat (`tm_vp_i18n.js`, tuleva `tm_master_i18n.js`, `tm_seura_i18n.js`) sisältävät vain sivukohtaisen
> body-tekstin. **Konsistenssitesti** kaataa buildin jos jaettu avain määritellään sivukartassa uudelleen tai lukittu
> termi käännetään eri tavalla. Retrofitataan VP käyttämään commonia (dedupe). **Tämä on perusta jonka päälle VP jatkuu
> ja Valmentaja + Seura wirataan rinnakkain omina PR:inään.**
>
> **EI tässä PR:ssä:** Master/Seura wiraus (omat briiffit). Vain common-lib + VP-retrofit + testi.

---

## A) `lib/tm_i18n_common.js` (UUSI)

Lähdeteksti-avaimin, sama muoto kuin `tm_vp_i18n.js` (`{ sv:{fi→sv}, en:{fi→en} }`) + jaetut resolvi-/sweep-helperit.

```js
/* TalentMaster — jaettu henkilöstö-i18n (Vaihe 0). Vain JAETUT stringit + lukittu glossaari.
   Arvot konformoivat tm_lang.js:ään (glossaari-SSOT). Sivukohtaiset kartat EIVÄT saa määritellä näitä avaimia uudelleen. */
var TM_I18N_COMMON = {
  sv: {
    /* — Yleisnapit / -toiminnot — */
    'Tallenna':'Spara', 'Peruuta':'Avbryt', 'Sulje':'Stäng', 'Takaisin':'Tillbaka',
    'Poista':'Ta bort', 'Muokkaa':'Redigera', 'Lähetä':'Skicka', 'Kopioi':'Kopiera',
    'Lataa':'Ladda ner', 'Hae nimellä...':'Sök på namn...', 'Sulje':'Stäng',
    /* — Kirjautuminen / chrome — */
    'Kirjaudu ulos':'Logga ut', 'Kirjaudu sisään':'Logga in', 'Sähköposti':'E-post',
    'Salasana':'Lösenord', 'Asetukset':'Inställningar', 'Avaa valikko':'Öppna menyn',
    /* — Roolit (näyttönimet; enum-roolistringit 'vp'/'valmentaja' EIVÄT tänne) — */
    'Valmentaja':'Tränare', 'Talenttivalmentaja':'Talangtränare', 'Fysiikkavalmentaja':'Fystränare',
    'Testivastaava':'Testansvarig', 'Fysioterapeutti':'Fysioterapeut', 'Seurasihteeri':'Klubbsekreterare',
    'Urheilutoimenjohtaja':'Sportchef', 'Valmennuspäällikkö':'Utvecklingsansvarig', 'Super Admin':'Super Admin',
    /* — Perusnavigointi / -entiteetit — */
    'Pelaajat':'Spelare', 'Pelaaja':'Spelare', 'Joukkueet':'Lag', 'Joukkue':'Lag',
    'Henkilöstö':'Personal', 'Kalenteri':'Kalender', 'Raportointi':'Rapportering',
    /* — LUKITTU GLOSSAARI (konformi tm_lang.js) — */
    'Kehon valmius':'Kroppslig beredskap',   // EI Kroppens/Kroppsberedskap
    'Slalom':'Slalom', 'Jonglering':'Jonglering', 'Passning':'Passning',
    'Föring och skott':'Föring och skott', 'Längdspark':'Längdspark'
    // … täydennä sääntö-B:n mukaan
  },
  en: {
    'Tallenna':'Save', 'Peruuta':'Cancel', 'Sulje':'Close', 'Takaisin':'Back',
    'Poista':'Delete', 'Muokkaa':'Edit', 'Kirjaudu ulos':'Log out', 'Asetukset':'Settings',
    'Kehon valmius':'Physical readiness'
    // … additiivinen; puuttuva → fi-fallback
  }
};

// Geneerinen resolvi: COMMON VOITTAA (lukittu glossaari), sitten sivukartta, muuten fi.
function tmI18nResolve(fi, pageMap) {
  if (fi == null) return fi;
  var k; try { k = (typeof tmNykyinenKieli === 'function' && tmNykyinenKieli()) || 'fi'; } catch (e) { k = 'fi'; }
  if (k === 'fi') return fi;
  var c = TM_I18N_COMMON[k]; if (c && typeof c[fi] === 'string') return c[fi];
  var p = pageMap && pageMap[k]; if (p && typeof p[fi] === 'string') return p[fi];
  return fi;
}

// Geneerinen sweep: sivun lokalisoi delegoi tänne oma pageMap-argumentti mukana.
function tmLokalisoiCommon(root, pageMap) {
  var scope = root || document;
  scope.querySelectorAll('[data-i18n]').forEach(function (el) { var fi = el.getAttribute('data-i18n'); if (fi) el.textContent = tmI18nResolve(fi, pageMap); });
  scope.querySelectorAll('[data-i18n-ph]').forEach(function (el) { var fi = el.getAttribute('data-i18n-ph'); if (fi) el.setAttribute('placeholder', tmI18nResolve(fi, pageMap)); });
  scope.querySelectorAll('[data-i18n-title]').forEach(function (el) { var fi = el.getAttribute('data-i18n-title'); if (fi) el.setAttribute('title', tmI18nResolve(fi, pageMap)); });
}

if (typeof window !== 'undefined') { window.TM_I18N_COMMON = TM_I18N_COMMON; window.tmI18nResolve = tmI18nResolve; window.tmLokalisoiCommon = tmLokalisoiCommon; }
if (typeof module !== 'undefined' && module.exports) { module.exports = { TM_I18N_COMMON: TM_I18N_COMMON, tmI18nResolve: tmI18nResolve, tmLokalisoiCommon: tmLokalisoiCommon }; }
```

> Yllä oleva sv-lista on **siemen** — täydennä sääntö-B:llä. Arvot ON tarkistettava `tm_lang.js`:ää vasten (testi C2).

---

## B) Mikä kuuluu commoniin — SÄÄNTÖ

Stringi kuuluu `tm_i18n_common.js`:iin jos **jokin näistä**:
1. **Lukittu glossaari- tai lajitermi** (Kehon valmius, Slalom, Jonglering, Passning, Föring och skott, Längdspark, TKI/H-H = ennallaan lyhenteinä).
2. **Roolin näyttönimi** (Tränare, Talangtränare, Sportchef, Utvecklingsansvarig … — EI enum-roolistring `'vp'`/`'valmentaja'`).
3. **Yleinen UI-napti/-labeli joka esiintyy sanatarkasti ≥2 henkilöstösivulla** (Spara, Avbryt, Stäng, Ta bort, Redigera, Ladda ner, Sök, E-post, Lösenord, Logga ut, Inställningar, perusnavi Spelare/Lag/Personal/Kalender/Rapportering).

**Lähde jaetuille pareille:** poimi `tm_vp_i18n.js`:n (sv+en) ja Kimin Seura-kartan (`docs/SEURA_SV_KAANNOSMUISTI.json`) **leikkaus** — sanatarkasti molemmissa esiintyvät fi-avaimet ovat selvästi jaettuja. Ne + yllä olevat kategoriat = common-joukko. Jos epävarma, jätä sivukarttaan (common on konservatiivinen: vain varmasti jaetut).

---

## C) VP-retrofit (dedupe + delegointi)

1. **Latausjärjestys VP-HTML:ssä** (rivi ~18–19): `tm_lang.js` → **`tm_i18n_common.js`** → `tm_vp_i18n.js`. Common **ennen** sivukarttaa/gettereitä.
   ```html
   <script src="lib/tm_lang.js?v=1"></script>
   <script src="lib/tm_i18n_common.js?v=1"></script>   <!-- UUSI -->
   <script src="lib/tm_vp_i18n.js?v=5"></script>       <!-- ?v=4 → 5 (dedupe muuttaa sisältöä) -->
   ```
2. **`vpT(fi)` → delegoi:** `function vpT(fi){ return (typeof tmI18nResolve==='function') ? tmI18nResolve(fi, TM_VP_I18N) : fi; }`
   (guard säilyttää fi-fallbackin jos common ei lataudu.)
3. **`vpLokalisoi(root)` → delegoi:** `tmLokalisoiCommon(root, TM_VP_I18N);` (poista vanha sisäinen sweep-body, korvaa delegoinnilla).
4. **Dedupe:** poista `TM_VP_I18N.sv`:stä JA `.en`:stä kaikki avaimet jotka nyt ovat `TM_I18N_COMMON`:ssa (ne resolvoituvat commonista). **Korjaa samalla driftit** — poista VP:n "kroppens beredskap" -variantti (rivi ~2242) ja muut Kehon valmius -poikkeamat; common tarjoaa kanonin "Kroppslig beredskap".
   - Jos VP-kartan **arvo** poikkesi commonista (esim. eri sv jollekin napille), **common voittaa** → poista VP:n rivi. Jos poikkeama on tahallinen VP-erityismerkitys, jätä VP-karttaan mutta **eri fi-avaimella** (ei törmää testiin).
5. **Sisältövartija:** VP:n fi-regressio + sv-toiminta identtinen käyttäjälle (common+VP yhdessä tuottavat saman lopputuloksen kuin ennen). Ei uusia näkyviä muutoksia — vain lähde siirtyy.

---

## D) Konsistenssi-Vitest (`tests/i18n_common.test.js`, UUSI)

1. **Ei avainpäällekkäisyyttä:** `keys(TM_VP_I18N.sv) ∩ keys(TM_I18N_COMMON.sv) === ∅` (sama `en`). → pakottaa dedupen + estää sivukarttaa määrittelemästä jaettua avainta uudelleen. **Tämä testi ajetaan myös tuleville sivukartoille** (Master/Seura) kun ne tulevat.
2. **Glossaari-konformi `tm_lang.js`:ään (C2):** lataa `tm_lang.js`; varmista `TM_I18N_COMMON.sv['Kehon valmius'] === 'Kroppslig beredskap'` (= tm_lang `sv.…kehon_valmius`), ja keskeiset napit (Tallenna→Spara, Peruuta→Avbryt, Sulje→Stäng, Poista→Ta bort, Muokkaa→Redigera, Takaisin→Tillbaka, Kirjaudu ulos→Logga ut, Asetukset→Inställningar).
3. **Drift-vartija:** skannaa `lib/tm_i18n_common.js` + `lib/tm_vp_i18n.js` (+ myöhemmin muut `*_i18n.js`) → **0 osumaa** kiellettyihin variantteihin `/Kroppens beredskap|Kroppsberedskap|kroppsberedskap/` (kanoni on vain "Kroppslig beredskap").
4. **Resolvi-semantiikka:** `tmI18nResolve('Tallenna', {})` fi-tilassa → `'Tallenna'`; sv-tilassa → `'Spara'` (commonista); tuntematon avain → fi; `pageMap` voittaa vain kun common ei määrittele.

> Testi tarvitsee `tmNykyinenKieli`-stubin (kuten olemassa olevat vp-testit) kielen vaihtoon.

---

## Vartijat
- **fi ei rikkoudu; fallback ehdoton** (common puuttuu → `vpT` palauttaa fi). **§5:** ei väri-/tyylimuutoksia (vain i18n-lähde).
- **Enum/roolistringit EIVÄT commoniin:** vain **näyttönimet**. `'vp'`/`'valmentaja'`/`'pilotti'` jne. pysyvät koodissa.
- **§7.1:** ei nested template literaleja. Common = puhdas dataobjekti + 2 helperiä.
- **`tm_lang.js` on glossaari-SSOT** — jos common ja tm_lang ovat ristiriidassa, **tm_lang voittaa** (korjaa common). Perhepinta (avainpohjainen) ei muutu.

## Cache-bust (§27.4)
- **Uusi `lib/tm_i18n_common.js`** → lisää `?v=1` VP-HTML:ään. **`tm_vp_i18n.js?v=4 → ?v=5`** (dedupe = sisältömuutos).
- Muut henkilöstösivut (Master/Seura) lataavat commonin **omissa wiraus-PR:issään** (Raita B/C) — EI tässä.
- version.json auto-bump mainissa (§33) — ei feature-haarassa.

## DoD (Vaihe 0)
- `lib/tm_i18n_common.js` olemassa (sv+en, jaettu joukko + lukittu glossaari, `tm_lang.js`-konformi) + resolvi/sweep-helperit.
- VP lataa commonin (`?v=1`) ennen sivukarttaa; `vpT`/`vpLokalisoi` delegoivat; VP-kartta dedupattu (0 päällekkäistä avainta commonin kanssa); driftit korjattu.
- Vitest: 4 testiryhmää vihreät (ei-päällekkäisyys · glossaari-konformi · drift-vartija · resolvi-semantiikka). `npm run lint` EXIT 0.
- **VP:n näkyvä sv/fi identtinen käyttäjälle ennen/jälkeen** (vain lähde siirtyi).

## Verifiointi (Claude)
1. Diff: common-joukko järkevä (vain jaettu), VP-kartta kutistui vastaavasti, driftit poissa.
2. L2: lint + koko vitest (uusi i18n_common + olemassa olevat vp-testit 21/21 ehjät).
3. L3 render-diffi: VP sv-tilassa — otetaan otos common-termeistä (Logga ut, Spara, Tränare, Kroppslig beredskap) + VP-spesifeistä → kaikki kääntyvät, fi ennallaan. Erityisesti: "Kehon valmius" renderöityy **Kroppslig beredskap** kaikkialla VP:ssä (ei enää variantteja).
4. Glossaari-portti: grep koko VP + common → 0 kiellettyä varianttia.

## Seuraava (Vaihe 0:n jälkeen — VP + Valmentaja aktiivinen pari)
- **Raita A — VP** jatkaa V1.1 (Toimenpiteet) → V2–V7, käyttäen commonia.
- **Raita B — Valmentaja (Master_v16)** wirataan: lataa `tm_lang.js` + `tm_i18n_common.js` + uusi `tm_master_i18n.js` (Kimin Master-kartasta), `masterT(fi)=tmI18nResolve(fi,TM_MASTER_I18N)` + `tmLokalisoiCommon(root,TM_MASTER_I18N)`. Sama ei-päällekkäisyystesti Master-kartalle.
