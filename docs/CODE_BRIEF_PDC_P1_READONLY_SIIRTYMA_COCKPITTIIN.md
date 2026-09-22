# PDC P1 — read-only-siirtymä cockpittiin (haarauma B2) · Code-brief

> **Tila:** Bugikorjaus + arkkitehtuurilukko. **Yksi PR puhtaasta mainista** (base = main #607:n mergen jälkeen).
> Ei rules-, ei datamalli-, ei kyselymuutosta. Ei uusia i18n-avaimia (kaikki labelit ovat jo sv-kartassa).
>
> **Ydin yhdellä lauseella:** Pelaajaraportti (PDC) on määritelty read-onlyksi, mutta sen Kehityssuunnitelma-kappaleessa
> on **kolme muokkausnappia jotka eivät toimi PDC:ssä** — kaksi avaa modaalin joka jää **palaveritilan alle**, ja
> kolmas **injektoi editorin read-only-raporttiin**. P1 vaihtaa kaikki kolme **siirtymäksi cockpittiin** (per-pelaaja-työpöytä).
>
> **Katselmuspäätös (haarauma B2):** palaverinaikainen muokkaus siirtyy työpöytään. **Jos pilotissa ilmenee että
> VP:t haluavat säätää fokusta kesken palaverin, suunta käännetään** (säilytä nappi + korjaa modaalin z-index ja
> palaverin päällekkäisyys). Tämä brief toteuttaa P1:n; B2-paluu on erillinen PR eikä sitä valmistella tässä.

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN · **reuse yli reimplementoinnin** (siirtymä on jo olemassa, ks. §2) · älä koske
  jaksofokus-moottoriin, IDP-logiikkaan, tavoite-ehdotukseen (`idpEhdotaTavoite`) eikä palaveritilan CSS:ään.
- `vpT()` kääri **vain tekstin, ei markkupia** (`tests/i18n_markup_avaimet.test.js`). Tässä PR:ssä ei tarvita uusia avaimia.
- Yksi PR, yksi polku. **Älä lisää toista siirtymäfunktiota** — §2:n helperi on ainoa.

---

## 1. JUURISYY (verifioitu lähteestä `TalentMaster_VP_v25.html`, rivinumerot @ main 654f80f)

PDC renderöi kehityssuunnitelman read-only-tilassa:

```js
// 15688 — ainoa read-only-kutsu koko tiedostossa
if (_mdtChap === 'idp') chap = _vpKehSuunnitelmaHTML(p, { editori: false });
// 6707 — moodilippu
const _inlineEditori = !opts || opts.editori !== false;
```

Muut kaksi kutsua ovat **ilman `opts`:ia** eli editori-tilassa: 12616 rakentaa työpöydän Kehitys-välilehden
`_jspModal`in sisällä (12492), ja 6106 on `_vpKausitavoiteReRender`:n fallback — joka on juuri L3:n vuotoreitti.
**Read-only-haara = yksinomaan PDC.**
Silti read-only-haarasta pääsee kolmeen muokkaustoimintoon:

| # | Rivi | Nappi | Kutsuu | Mitä PDC:ssä TODELLA tapahtuu |
|---|---|---|---|---|
| **L1** | **6629** (`_vpTyopoytaJaksofokusHTML`) | `✎ Muokkaa jaksofokus` | `_jfOhjaa(pid)` | `#_jfInlineEditor` ei ole mountattu PDC:ssä → `_jfOhjaa` putoaa **modaali-varareittiin** (`_jfModal`, `.sh-overlay` **z 300**) |
| **L2** | **6741** (`_vpKehSuunnitelmaHTML`, tyhjä tila) | `＋ Aseta jaksofokus` | `_jfOhjaa(pid)` | sama modaali-varareitti |
| **L3** | **6728** (`_vpKehSuunnitelmaHTML`, tyhjä tila) | `＋ Tee kausitavoite` | `_vpEhdotaTavoite(pid)` | rakentaa luonnoksen → `_vpKausitavoiteReRender()` → slot `#_jspKausitavoite` puuttuu → **fallback 6101–6106 kutsuu `_vpKehSuunnitelmaHTML(p)` ILMAN opts** → editori-haara renderöityy **read-only-raportin sisään** |

### 1.1 Miksi L1/L2 näyttää käyttäjälle siltä että "mitään ei tapahdu"

Palaveritila on koko ruudun peittävä kiinteä kerros:

| Kerros | Lähde | z-index |
|---|---|---|
| `.mdt-palaveri` (palaveritila) | 2211 | **500** |
| `#_jspModal` (cockpit / per-pelaaja-työpöytä) | 12492 | **320** |
| `_jfModal` = `.sh-overlay` (jaksofokus-modaalin varareitti) | 827, 8287 (ei `zIndex`-overridea) | **300** |

**300 < 500 ja 320 < 500.** Palaveritilassa modaali *avautuu* mutta jää overlayn alle: Esc-kuuntelija ja fokusloukku
ovat elossa, mutta mitään ei näy → näyttää jumilta. Sama koskee työpöytää: **siirtymä cockpittiin on pakko sulkea
palaveritila ensin**, muuten P1 vaihtaa yhden näkymättömän modaalin toiseen näkymättömään työpöytään.

### 1.2 L3 rikkoo lisäksi eksplisiittisen invariantin

Rivin 6705–6706 kommentti sanoo suoraan: *"Pelaajaraportti (PDC, `opts.editori===false`) käyttää read-only-yhteenvetoa
→ **ei duplikaatti-slot-ID:itä, ei editoria raportissa**."* L3:n fallback-polku tekee täsmälleen sen mitä kommentti kieltää.
Nykyinen portti (`tests/idp_kehitys_v2_tyopoyta.test.js:83`) tarkistaa vain että **lippu välitetään** — ei sitä mitä
read-only-haarasta pääsee tekemään. Siksi tämä luokka läpäisi.

---

## 2. KORJAUS — yksi jaettu siirtymä, todistetun reitin mukaan

**Älä keksi uutta reittiä.** Tiedostossa on jo toimiva ennakkotapaus: `_vpTapahtumaAvaaKortti` (15153), jonka
kommentti kiteyttää invariantin — *"Asettaa joukkuelistan `_jsvPelaajat`:iin (kuten syvänäkymä)"*:

```js
window._jsvPelaajat = ctx.pelaajat;                    // 1. lista jota avaaja indeksoi
_vpTapahtumaSulje();                                   // 2. lähtönäkymän overlay kiinni
_avaaPerPelaajaPikakatsaus(idx, ctx.joukkue);          // 3. työpöytä auki
setTimeout(function () { _jspVaihda(1); }, 0);         // 4. välilehti vasta mountin jälkeen
```

### 2.1 Uusi helperi (lisää `_vpTyopoytaJaksofokusHTML`:n lähelle, ~6610)

```js
/* P1 — PDC (read-only) → cockpit. Raportista EI muokata: siirrytään työpöydälle, jossa inline-editori on.
   Järjestys on pakottava (ks. brief §1.1 + §2): palaveri kiinni → lista → avaus → välilehti. */
window._pdcSiirryCockpittiin = function (pid, tab) {
  var lista = _pelaajat || [];
  var idx = lista.findIndex(function (x) { return x.id === pid; });
  if (idx < 0) {                                   // EI hiljaista väärää pelaajaa (ks. §2.2)
    if (typeof toast === 'function') toast(vpT('Pelaajaa ei löytynyt.'), 'error');
    return;
  }
  // 1) Palaveritila kiinni ENNEN avausta — .mdt-palaveri (z 500) peittäisi työpöydän (z 320).
  //    Vartioitu sulku, EI toggle: _mdtPalaveritila() kiinni-tilassa AVAISI palaverin.
  if (_mdtPalaveri && typeof _mdtPalaveritila === 'function') _mdtPalaveritila();
  // 2) Indeksi ja lista samasta taulukosta — _avaaPerPelaajaPikakatsaus indeksoi _jsvPelaajat:ia.
  window._jsvPelaajat = lista;
  // 3) Työpöytä auki  4) välilehti vasta mountin jälkeen (_jspVaihda ennen mounttia = no-op).
  if (typeof _avaaPerPelaajaPikakatsaus === 'function') _avaaPerPelaajaPikakatsaus(idx, lista[idx].joukkue || '');
  if (typeof _jspVaihda === 'function') setTimeout(function () { _jspVaihda(tab == null ? 3 : tab); }, 0);
};
```

### 2.2 Miksi kohta 2 on koko korjauksen kriittisin rivi (= "oikea pelaaja")

`_avaaPerPelaajaPikakatsaus(idx, joukkue)` (12037) **ei ota pelaajaa vaan indeksin**, ja indeksoi
**`window._jsvPelaajat`**:ia — ei `_pelaajat`:ia. `_jsvPelaajat` asetetaan neljässä eri paikassa eri sisällöllä
(4286 `kaikki` · 10328 joukkueen lista **sukunimen mukaan lajiteltuna** · 15155 tapahtuman lista · 19328 `filtered`).
Lisäksi avaaja **kiertää indeksin ympäri**:

```js
idx = ((idx % nP) + nP) % nP;   // 12041 — ei koskaan epäonnistu äänekkäästi
```

→ Jos indeksi resolvoidaan yhdestä listasta ja sovelletaan toiseen, **avautuu väärä pelaaja hiljaa**, ei virhettä.
Tämä ei ole teoreettista: **nykyinen `_reviewCockpitAvaa` (16026–16030) tekee juuri näin** — `findIndex` `_pelaajat`:sta,
avaus `_jsvPelaajat`:sta, eikä aseta listaa välissä. Se on sama latentti vika, ja koska P1:n hyväksyntä sisältää
"oikea pelaaja", **se korjataan tässä PR:ssä delegoimalla** (yksi polku, ei kahta):

```js
// 16026–16030 — ENNEN: oma idx-resolvointi + avaus (väärä pelaaja jos _jsvPelaajat ≠ _pelaajat)
// JÄLKEEN:
window._reviewCockpitAvaa = function (pid, tab) { _pdcSiirryCockpittiin(pid, tab == null ? 3 : tab); };
```

**Tietoinen seuraus (hyväksytty):** siirtymän jälkeen työpöydän pelaajaselaus (edellinen/seuraava) kattaa koko
seuran rosterin joukkueen sijasta, koska `_jsvPelaajat` asetetaan `_pelaajat`:ksi. Tämä on sama kauppa jonka
`_vpTapahtumaAvaaKortti` jo tekee, ja vastaa PDC:n omaa skooppia (pelaajavalitsin listaa koko seuran).
Listan palautus sulkemisen yhteydessä **ei kuulu P1:een** — älä lisää sitä.

### 2.3 Kolme nappia → siirtymä (labelit: **ei uusia i18n-avaimia**)

| # | Rivi | ENNEN | JÄLKEEN |
|---|---|---|---|
| L1 | 6629 | `_jfOhjaa('<pid>')` + `vpT('✎ Muokkaa jaksofokus')` | `_pdcSiirryCockpittiin('<pid>',3)` + `vpT('→ Kehitä jaksofokusta')` |
| L2 | 6741 | `_jfOhjaa('<pid>')` | `_pdcSiirryCockpittiin('<pid>',3)` — **label ennallaan** (`＋ Aseta jaksofokus`) |
| L3 | 6728 | `_vpEhdotaTavoite('<pid>')` | `_pdcSiirryCockpittiin('<pid>',3)` — **label ennallaan** (`＋ Tee kausitavoite`) |

`event.stopPropagation();` säilyy kaikissa (napit ovat haitarin `acc-head`-klikkialueen sisällä — ilman sitä
haitari togglaa siirtymän alla). Tyylit, `jsp-kt-btn primary` -luokat ja aputekstit ennallaan.

**sv-katevyys on jo olemassa** — verifioitu `lib/tm_vp_i18n.js`: `＋ Tee kausitavoite` (81) · `＋ Aseta jaksofokus` (83) ·
`→ Kehitä jaksofokusta` (1010). Älä lisää avaimia. `✎ Muokkaa jaksofokus` (955) jää orvoksi — **jätä se karttaan**
(B2-paluu tarvitsee sen; yksikään testi ei vaadi avainten käyttöä).

---

## 3. ÄLÄ KOSKE

- **`_jfOhjaa` (8260) itse** — sen inline-haara on oikea ja käytössä työpöydässä; vain PDC:n kutsujat vaihtuvat.
  Modaali-varareitti **jää paikalleen** (se on oikea reitti muista näkymistä, esim. 8863 sulkumodaali).
- **`_vpKausitavoiteReRender` (6097) + sen fallback** — L3:n korjauksen jälkeen fallbackiin ei enää päädytä
  PDC:stä. Fallback on oikea editoripoluille. Portti §4.2 vartioi lopputuloksen, ei toteutusta.
- **`_vpJfInlineHTML` / inline-editori / `_vpKehSuunnitelmaHTML`:n editori-haara** — työpöydän toiminta ennallaan.
- **`.mdt-palaveri`-CSS ja z-indeksit** — P1 ei nosta työpöytää palaverin yli, vaan sulkee palaverin. Z-indeksien
  muuttaminen on B2-haaran työtä.
- **`_mdtPalaveritila` (15408)** — kutsu sitä, älä muuta sitä.
- **PDC:n muut kappaleet** (psyy/mittaukset/pelialy/kaari/fa/terveys) ja `✓ Merkitse review tehdyksi` — ennallaan.

---

## 4. VARTIJA (uusi tiedosto `tests/pdc_readonly_siirtyma.test.js`)

Nykyinen portti tarkisti vain lipun välityksen, joten **tämä portti tarkistaa mitä read-only-haarasta pääsee tekemään**.
Neljä hyväksyntäkohtaa = neljä testiryhmää. Ryhmien 2–4 on **ajettava helperi**, ei greppi: järjestys ja
väärä-pelaaja-ansa eivät näy tekstistä.

### 4.1 Ajettava harness (suositeltu toteutus)
Pura `window._pdcSiirryCockpittiin = function (...) {...}` lähteestä (sulkulaskuri, kuten
`tests/vp_raportointi_infografiikka.test.js`:n `funktio()`), evaluoi `Function`-konstruktorilla ja injektoi tyngät,
jotka **kirjaavat kutsujärjestyksen**: `_pelaajat`, `_jsvPelaajat`, `_mdtPalaveri`, `_mdtPalaveritila`,
`_avaaPerPelaajaPikakatsaus`, `_jspVaihda`, `toast`, `vpT`.

### 4.2 EI MODAALIA PDC:llä
- `_vpTyopoytaJaksofokusHTML`- ja `_vpKehSuunnitelmaHTML`-rungoista: read-only-haara **ei sisällä** `_jfOhjaa(`
  eikä `_vpEhdotaTavoite(`, ja **sisältää** `_pdcSiirryCockpittiin(`.
- `_vpKehSuunnitelmaHTML`:n editori-haara sisältää yhä `_vpJfInlineHTML(p)` (ei vahinkoregressiota työpöytään).
- **EI VACUOUS:** sama runko sisältää yhä `const _inlineEditori = !opts || opts.editori !== false;`.

### 4.3 OIKEA PELAAJA (väärä-pelaaja-ansa)
Aja helperi tilassa jossa `window._jsvPelaajat` on **tarkoituksella eri lista eri järjestyksessä** kuin `_pelaajat`
(esim. käänteinen). Assertoi että `_avaaPerPelaajaPikakatsaus` sai indeksin **jonka kohdalla `_jsvPelaajat[idx].id === pid`
kutsuhetkellä**. Assertoi myös: tuntematon `pid` → **avaajaa ei kutsuta lainkaan** (ei modulo-kiertoa).

### 4.4 JÄRJESTYS
Yhdestä ajosta kirjattu sekvenssi on **täsmälleen**: `palaveri_kiinni` → `_jsvPelaajat` asetettu → `avaa` → (tick) → `_jspVaihda(3)`.
- `_jsvPelaajat` on asetettu **ennen** avaajaa (jos jälkeen, avaaja luki vanhan listan).
- `_jspVaihda` **ei** ole kutsuttu synkronisesti — vasta `setTimeout`-tickin jälkeen.

### 4.5 PALAVERI SULKEUTUU
- `_mdtPalaveri = true` → `_mdtPalaveritila` kutsuttu **kerran**, ja **ennen** avaajaa.
- `_mdtPalaveri = false` → `_mdtPalaveritila` **ei** kutsuttu (toggle avaisi palaverin).
- **Z-lukko:** lue CSS-lähteestä `.mdt-palaveri`- ja `#_jspModal`-z-indeksit ja assertoi `palaveri > tyopoyta`.
  Tämä pitää sulun *perustelun* elossa: jos joku myöhemmin nostaa työpöydän palaverin yli, portti kertoo että
  P1:n oletus muuttui (B2-haara).

### 4.6 Mutaatiomatriisi — aja jokainen, vahvista punainen ENNEN lukitsemista

| Mutaatio lähteeseen | Punertuu |
|---|---|
| L1/L2 takaisin `_jfOhjaa(pid)` | 4.2 |
| L3 takaisin `_vpEhdotaTavoite(pid)` | 4.2 |
| poista rivi `window._jsvPelaajat = lista;` | 4.3 + 4.4 |
| siirrä `window._jsvPelaajat = lista;` avaajan **jälkeen** | 4.4 (ja 4.3 kun listat eroavat) |
| `if (_mdtPalaveri) _mdtPalaveritila();` → ehdoton `_mdtPalaveritila();` | 4.5 (kiinni-tapaus) |
| poista palaverin sulku kokonaan | 4.5 |
| `setTimeout(_jspVaihda…)` → synkroninen kutsu | 4.4 |
| `if (idx < 0) return;` pois | 4.3 (tuntematon pid) |

---

## 5. HYVÄKSYNTÄ

1. **Ei modaalia PDC:llä:** PDC:n Kehityssuunnitelmasta ei aukea `_jfModal` eikä editori renderöidy raporttiin
   (L1·L2·L3 kaikki siirtymiä). Työpöydän oma inline-editori ennallaan.
2. **Oikea pelaaja:** siirtymä avaa aina sen pelaajan jonka raportti oli auki, myös kun `_jsvPelaajat` on eri
   lista/järjestys; tuntematon pid → toast, ei hiljaista kiertoa. `_reviewCockpitAvaa` delegoi samaan polkuun.
3. **Järjestys:** palaveri kiinni → lista → avaus → välilehti (3 = Kehitys), välilehti vasta mountin jälkeen.
4. **Palaveri sulkeutuu:** palaveritilassa siirtymä sulkee palaverin (vartioitu sulku, ei toggle); kiinni-tilassa
   palaveria ei avata. Z-lukko dokumentoi miksi.
5. **Vartija vihreä ja ei-vacuous:** §4.6:n jokainen mutaatio punertaa nimetyn testin.
6. **Ei uusia i18n-avaimia**; fi + sv renderöityvät molemmissa teemoissa ennallaan (vain handler + yksi label vaihtui).
7. `npm test` + `npm run lint` vihreä. Olemassa oleva `tests/idp_kehitys_v2_tyopoyta.test.js:83` pysyy vihreänä.

**Deploy:** `TalentMaster_VP_v25.html` (helperi + 3 nappia + `_reviewCockpitAvaa`-delegointi) + uusi vartijatesti.
Ei `?v`-nostoa, ei Rules-deployta, ei migraatiota.

---

*Ydin: PDC on read-only, mutta sen kolme muokkausnappia joko avaavat modaalin palaveritilan alle (z 300/320 < 500)
tai injektoivat editorin raporttiin (`_vpKausitavoiteReRender`-fallback ilman `opts`). P1 vaihtaa kaikki kolme
yhdeksi siirtymäksi cockpittiin `_vpTapahtumaAvaaKortti`-mallin mukaan: palaveri kiinni → `_jsvPelaajat` → avaus →
välilehti. Kriittisin rivi on listan asetus: avaaja indeksoi `_jsvPelaajat`:ia ja kiertää indeksin modulolla, joten
ilman sitä avautuu väärä pelaaja hiljaa. Vartija ajaa helperin tyngillä ja mittaa järjestyksen — greppi ei riitä.*
