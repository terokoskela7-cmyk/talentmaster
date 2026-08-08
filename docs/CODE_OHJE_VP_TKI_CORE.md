# CODE-OHJE: VP-TKI pariteetti — `lib/tm_tki_core.js` (lisätään P2.1-haaraan ennen mergeä)

## Tausta ja vaatimus

Tuotevaatimus (Tero): **VP:n Pikakirjauksella kirjaama tulos pitää päivittyä pelaajalle täysimääräisesti — myös TKI.**

Nykytila P2.1:ssä (graceful degradation): VP laskee vain H-H-pikakentät. Kun VP kirjaa
tekniikkakilpailun, tallentuu vain raaka `testitulokset/{pvm}_pikakirjaus`. **`tki_viimeisin`,
`tki_merkki` ja `tki_historia` jäävät kirjautumatta** (varmistettu: `_lisaaHistoria` kirjoittaa
tki_historian vain jos `upd.tki_viimeisin != null`). Automaattista jälkilaskentaa ei ole:
`recalcHH` laskee vain `hh_taso`:n `hh_viimeisin`:stä, ei TKI:tä, eikä sitä kutsuta avattaessa.

→ Tämä ohje korjaa sen: VP saa TKI:n täydellä pariteetilla Masterin kanssa. **Lisää tämä
P2.1-haaraan; älä mergeä P2.1:tä ennen tätä** (jotta livenä ei näy harhaanjohtavaa "TKI hoituu
Masterissa" -välitilaa).

## Juurisyy (miksi VP ei voi ladata `docs/testit_indeksit.js`:ää)

`docs/testit_indeksit.js` on **käärimätön**: se julistaa top-level `const TK_KOKONAISRAJAT`
(rivi 301), `const HH_NORMIT` (36) jne. suoraan globaaliin. VP:llä on **jo oma inline
`const TK_KOKONAISRAJAT`** (`TalentMaster_VP_v25.html` ~rivi 7154, "TKI-analyysimalli VAIHE 1").
Jos VP lataisi testit_indeksit.js:n → *"Identifier 'TK_KOKONAISRAJAT' has already been declared"*
→ SyntaxError → VP kaatuu. Master lataa testit_indeksit.js:n (rivi 32) koska sillä ei ole
törmääviä nimiä.

## Ratkaisu: `lib/tm_tki_core.js` (IIFE, ei bare-global-vuotoa)

Vie TKI-pikakentän tarvitsema **kanoninen ydin** IIFE:n sisään ja altista se
`window.TM_TESTIT`-nimiavaruuteen. `tm_pikakentat.js:n _resolve` lukee **jo** TM_TESTIT:n
(`f('laskeKokonaistulos', T)`, `T = g.TM_TESTIT`) → **`tm_pikakentat.js`:ään ei tule muutosta.**

### Extraktio-scope (tarkka, transitiivinen sulkeuma — pieni)

Kopioi `docs/testit_indeksit.js`:stä **byte-uskollisesti** (älä muuta laskentaa):

- Data: **`TK_KOKONAISRAJAT`** (rivi ~301) — ainoa tarvittava taulu.
- Funktiot: **`laskeKokonaistulos`** (~551), **`tkLaskeTKI`** (~517), **`tkLaskeMerkki`** (~500),
  **`tkPituuspotkuBonus`** (~544).

Riippuvuudet (varmistettu): `laskeKokonaistulos → tkPituuspotkuBonus`;
`tkLaskeTKI`/`tkLaskeMerkki → TK_KOKONAISRAJAT`; `tkPituuspotkuBonus` = puhdas kaava.
**Ei** tarvita `HH_NORMIT`, `TK_LAJIVIITTEET`, `TK_LAJITASOT`, `TK_LAJIT_META`.

### Runko

```js
/* tm_tki_core.js — TKI-ytimen kanoninen extrakti (VP-TKI pariteetti).
   ⚠ PIDÄ SYNKASSA: docs/testit_indeksit.js (TK_KOKONAISRAJAT + laskeKokonaistulos/
   tkLaskeTKI/tkLaskeMerkki/tkPituuspotkuBonus). Vaihe 3 konsolidoi (testit_indeksit.js
   → lataa tämä; yksi lähde). IIFE → ei bare-global-törmäystä (VP:n inline-TKI säilyy). */
(function (global) {
  'use strict';
  var TK_KOKONAISRAJAT = { /* byte-kopio testit_indeksit.js:stä */ };
  function tkPituuspotkuBonus(metrit) { /* … */ }
  function laskeKokonaistulos(testit, ika, sp) { /* … */ }
  function tkLaskeTKI(kokonaistulos, ika, sp, rajatOverride) { /* … */ }
  function tkLaskeMerkki(kokonaistulos, ika, sp, rajatOverride) { /* … */ }

  var API = { laskeKokonaistulos: laskeKokonaistulos, tkLaskeTKI: tkLaskeTKI,
              tkLaskeMerkki: tkLaskeMerkki, tkPituuspotkuBonus: tkPituuspotkuBonus };
  // Altista TM_TESTIT-nimiavaruuteen (tm_pikakentat._resolve lukee tämän). ÄLÄ ylikirjoita
  // olemassa olevaa TM_TESTIT:iä jos se on jo (esim. Master) — täydennä puuttuvat.
  if (global) {
    global.TM_TESTIT = global.TM_TESTIT || {};
    Object.keys(API).forEach(function (k) { if (typeof global.TM_TESTIT[k] !== 'function') global.TM_TESTIT[k] = API[k]; });
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
```

## Kytkentä

- **VP** (`TalentMaster_VP_v25.html`): lataa `tm_tki_core.js` **ennen** `tm_pikakentat.js`:ää
  (rivi ~20 edelle). Päivitä rivin 20 kommentti: VP = **H-H + TKI** (tm_tki_core.js).
- **Master**: **ei muutosta** (saa TKI:n testit_indeksit.js:stä). Vaihe 3 voi siirtää Masterinkin
  tm_tki_core.js:ään. Jos lataat sen myöhemmin Masteriin, `TM_TESTIT ||= {}` -guardi estää
  ylikirjoituksen — ei törmäystä.
- **`tm_pikakentat.js`: ei muutosta.**
- **VP:n inline-TKI** (~7108–7189): jätä ennalleen (palvelee VP:n omaa analyysinäkymää; IIFE ei
  törmää siihen). Merkitse tunnetuksi duplikaatiksi → Vaihe 3 ohjaa VP-analyysin tm_tki_core.js:ään.

## `tm_pikakirjaus.js` — huomautuksen poisto

Kun VP laskee nyt TKI:n, rivien ~174–179 huomautus ("TKI lasketaan vain jos TKI-funktiot
ladattu (Master)…") on vanhentunut ja harhaanjohtava → **poista se** (tai jätä vain jos
`TM_PIKAKENTAT` puuttuu kokonaan). `_lisaaHistoria` kirjoittaa `tki_historia`:n automaattisesti
kun `upd.tki_viimeisin` täyttyy — ei koodimuutosta (VP lataa jo `tm_historia.js`, rivi 19).

## Verifiointi (DoD)

1. **vitest `tests/tm_tki_core.test.js`** (uusi): `require` sekä `tm_tki_core.js` että
   `docs/testit_indeksit.js`, ja aja **matriisi** (ikä 8–13, sp P/T, useita lajiyhdistelmiä sis.
   pituuspotku ikä≥12) → `laskeKokonaistulos/tkLaskeTKI/tkLaskeMerkki/tkPituuspotkuBonus`
   **identtiset** molemmista lähteistä. Byte-identtisyys on kova vaatimus.
2. **Identity-harness** (laajenna olemassa olevaa): `tmLaskePikakentat` VP-depeillä (tm_tki_core
   → TM_TESTIT) === Master-depeillä (testit_indeksit) samalla inputilla → identtinen **koko upd**,
   ml. `tki_viimeisin`, `tki_merkki`, `tk_lajit_viimeisin`, `tk_kokonaistulos_viimeisin`.
3. **Suite vihreä** (nykyiset + uudet).
4. **Live (Tero/Claude, deployn jälkeen)**: VP Pikakirjaus → tekniikkakilpailu Topiakselle
   taannehtivalla testipäivällä → **`tki_viimeisin` + `tki_merkki` + `tki_historia` päivittyy
   pelaajalle** (näkyy VP-mittaristossa ilman Masteria); H-H-vartija ja pari-invariantti ok.

## Rajat

- Ei skeema-/Rules-muutosta. Ei uusia kirjoitusrooleja.
- **Ei pushia mainiin.** PR/haara (sama P2.1-haara). Tero mergeää ja deployaa.
- Pidä TKI-laskenta byte-uskollisena — **älä paranna kaavoja tässä**. Konsolidointi = Vaihe 3.
