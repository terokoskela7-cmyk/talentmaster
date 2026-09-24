# Pelianalytiikka: taktiikkataulun uhka-arvo, pelaajaraportti ja kenttätyökalu

> **Kenelle:** TalentMasterin kehityssessio (Code/Cowork), jolla on pääsy repoon.
> **Mistä:** suunnittelusessio 23.–24.9.2026 (Tero + Claude). Tämä doc kokoaa koko session päätökset ja
> suunnitelmat yhteen, jotta toteutus voi jatkua toisessa sessiossa ilman alkuperäistä keskustelua.
> **Mukana tulee:** patch-sarja `pelianalytiikka-2026-09.patch` (git am), joka tuo tämän docin,
> mockupin ja kolme mainista puuttuvaa commitia + lint-korjauksen.

---

## 0. Tila nyt ja ensimmäinen toimenpide

**✅ Mainin CI on vihreä.** Kun tämä doc kirjoitettiin, `npm run lint` kaatui viiteen no-undef-virheeseen
(`kaavioPX`/`kaavioPY`/`XT_SARAKKEET`) PR #620:n jäljiltä. **PR #621 korjasi ne toisella tavalla:** globaalien
keräin jäsentää nyt espreellä (monideklaraattori `var XT_RIVIT = 8, XT_SARAKKEET = 12;` tunnistetaan), ja
`kaavioPX`/`kaavioPY` kulkevat julkaistun rajapinnan `TM_KAAVIO_RENDER.kaavioPX/kaavioPY` kautta sekä
kerroksessa että prototyypissä. Lintin löytämä implisiittinen riippuvuus on siis jo korjattu mainissa.
Huom: se ei heittänyt ReferenceErroria, koska `tm_kaavio_render.js` fanauttaa kenttänsä windowiin.

**PR #620 sisälsi vain ensimmäisen neljästä commitista.** Mainista puuttuvat:
käyttöönottosuunnitelma (`docs/XT_KAYTTOONOTTO.md`), pelaajaraportin mplsoccer-prototyyppi sekä
pienkenttäprofiili + menetysriski.

**Patch-sarja on rakennettu `origin/main`:n (642d682) päälle.** Koska #621 ehti korjata lint-ongelman ensin,
**commitit 1 ja 5 törmäävät mainiin eikä niitä viedä sisään** (ks. sisäänvienti alla):

| # | Commit | Sisältö |
|---|---|---|
| 1 | `fix(xt): lint no-undef` | `TM_KAAVIO_RENDER`-koordinaatit, `XT_SARAKKEET` omalle var-rivilleen, ?v=2 |
| 2 | `docs(xt): käyttöönottosuunnitelma` | `docs/XT_KAYTTOONOTTO.md`, prototyypistä pois pelipaikkojen välinen vertailupalkki |
| 3 | `proto(pelaajaraportti): mplsoccer PyPizza` | `docs/prototyypit/pelaajaraportti_pizza.py` |
| 4 | `feat(xt): pienkenttäprofiili + menetysriski` | 5v5/8v8-metrimuunnos, käänteinen uhka, riskikartta editoriin, testit |
| 5 | `chore(xt): cache-bust ?v=3` | |
| 6 | `docs(pelianalytiikka): …` | tämä doc + kenttätyökalun mockup |

Tarkistettu ennen luovutusta: `npm run lint` puhdas, `npx vitest run` (ilman rules-testejä) 196 tiedostoa /
3241 testiä vihreänä. **Sisäänvienti (näin se tehtiin):** `-3` ja kaksi ohitusta — commit 1 pysähtyy
konfliktiin tiedostossa `lib/tm_xt_kerros.js`, koska #621 muutti samat rivit, ja commit 5 (cache-bust)
pysähtyy samasta syystä. Molemmat ohitetaan `--skip`:llä, ja versionostot tehdään omana committina, koska
commit 4 muutti `tm_kaavio_ui.js`:ää ja `tm_i18n_common.js`:ää nostamatta niiden `?v=`-numeroita.
Commitit 2, 3, 4 ja 6 menevät läpi; kerroksessa säilyy **mainin** `_xtkPX`/`_xtkPY` (#621).

```bash
git checkout main && git pull
git checkout -b feat/pelianalytiikka
git am pelianalytiikka-2026-09.patch
npm run lint && npm test
git push -u origin feat/pelianalytiikka   # → PR mainiin
```

Jos haluat CI:n vihreäksi heti ennen muuta: commit 1 on itsenäinen ja voi mennä omana PR:nä.

**Ennen mergeä (ei ole tehty):** live-tarkistus editorin uhka-arvotilassa kirjautuneena VP:nä, valmentajana
ja SA:na, molemmissa teemoissa ja mobiilissa. Tarkista erityisesti "Riskikartta"-tila 11v11-kaaviossa ja
pienkenttäprofiili 8v8-kaaviossa.

---

## 1. Kokonaisuus: kolme osaa, yksi arvokieli

| Osa | Mitä | Tila |
|---|---|---|
| **A. Taktiikkataulu + uhka-arvo** | xT-kerros editoriin, pienkenttäprofiili, menetysriski | Rakennettu (patch) — live-verify puuttuu |
| **B. Pelaajaraportti** | Pizza-profiili 5D:stä + DNA Match, PDF + JS-komponentti | Mockupit + palvelinprototyyppi, ei tuotantokoodia |
| **C. Arvomallit** | Puolustusarvo, maaliodotusarvo (xG); VAEP arvioitu ja hylätty | Suunniteltu, laskenta mockupissa |
| **D. Kenttätyökalu (pelihavainto)** | Yhden pelaajan puoliajan tarkkailu 5–10 tilanteella | **Toteutettava** — tämän docin pääosa (§5) |

Kaikki arvot lasketaan **samasta avoimesta Singh 12×8 -ruudukosta** (`lib/tm_xt.js`), paitsi xG, jolla on oma
geometrinen malli. Tallennetaan aina raakakoordinaatit + malli-id, arvot lasketaan lennossa (§26-periaate).

---

## 2. Osa A — Taktiikkataulu ja uhka-arvo (rakennettu)

Täysi suunnitelma ja invariantit: **`docs/XT_KAYTTOONOTTO.md`** (tulee patchissa). Tiivistelmä:

- `lib/tm_xt.js` (puhdas): `xtArvo(x, y, suunta, pelimuoto)`, `xtLiikeArvo`, `xtKaavioAnalyysi(spec)`,
  `xtHavaintoYhteenveto`, `xtProfiili`, `xtMenetysriski`, `xtMenetyspiste`, `xtRiskiOletuksena`.
- `lib/tm_xt_kerros.js` (DOM): uhkakartta, liikkeiden arvot, riskikartta. **Ei kirjoita speciin.**
- Editori (`lib/tm_kaavio_ui.js`): Pois / Liikkeiden arvot / Uhkakartta / Riskikartta.
- **Pienkenttäprofiili:** 5v5 = 30×40 m, 8v8 = 40×60 m. Piste muunnetaan metreiksi ja haetaan 11v11-ruudukosta
  samalla etäisyydellä maalista. 3v3:lle ei profiilia (palauttaa null). Malli-id `singh_12x8_v1+pienkentta_m_v1`.
- **Menetysriski:** vastustajan uhka-arvo menetyspisteessä. Korkea ≥ 5, kohonnut ≥ 2 uhkapistettä, muuten
  matala. Riskikartta oletuksena päällä vain 11v11:ssä.

**Invariantit (EHDOTON):** ei vertailua pelipaikkojen yli (T-H3 +0,5 vs KY-H2 +8,4 on eri asia) · uhka-arvo
ei ole konseptin arvosana · puolustuskonseptit eivät saa xT:tä (niille puolustusarvo, §4) · ei lukuja
pelaajalle eikä huoltajalle (§7.22) · lisenssimaininta (Karun Singh 2018, open_xt_12x8_v1).

**Datakytkös, jota ei saa rikkoa:** Master_v16 `paivitaAdarPikakentat` suodattaa `h.pisteet`-kentän
perusteella → **xT-/kenttätyökaludokumentit eivät saa käyttää `pisteet`-kenttää.** Pelaaja_v7
`_p6NakyyPelaajalle` näyttää vain dokumentit, joissa on `narratiivi`/`teksti` → raakamerkinnät eivät vuoda
pelaajalle, kunhan niissä ei ole näitä kenttiä.

Avoimet päätökset Terolle: `docs/XT_KAYTTOONOTTO.md` §8.

---

## 3. Osa B — Pelaajaraportti (mplsoccer-tyyli)

**Tavoite:** 5D-profiili pizza-kaaviona pelaajakortille, VP-dashboardiin ja PDF-raporttiin, sekä DNA Match
(Railgun / Maestro / Shadowstep / Titan, §14).

**Lukitut suunnittelupäätökset:**
- Asteikko on **taso 1–5**, ei persentiilejä. Normit ovat tasoja; pizza ei keksi persentiilejä.
- Lähde näkyy muodossa: **täytetty** = mittaus · **ääriviiva** = pelihavainto · **katkoviiva** = ottelu/xT.
- ✦ X-Factor = mitattu taso 5 · 🌱 kehityskaista (§28): pre-PHV-fyysisiä ei esitetä kehityskohteena.
- Normirengas tasolla 3, **piilotetaan PH-tilassa** (§28).
- §7.22: pelaajalle ja huoltajalle ei numeroita eikä vertailua.
- Riskilause ("menetys riskialueella") neutraalilla ink2-värillä, ei punaisella.

**DNA Match — Clauden ehdotus, Teron hyväksyttävä:**
templatit (D1–D5) ja painot, match = 100 · (1 − √(Σ w·d²) / 4):

| Tyyppi | Templaatti | Painot |
|---|---|---|
| Railgun | 5,3,3,3,3 | .40,.15,.15,.15,.15 |
| Maestro | 3,4,3,5,4 | .10,.25,.10,.40,.15 |
| Shadowstep | 4,5,3,4,3 | .20,.40,.10,.20,.10 |
| Titan | 5,3,5,3,4 | .35,.10,.30,.10,.15 |

**Tekninen suunta:**
- **JS-komponentti ensin** (pelaajakortti + VP): SVG, samat tokenit, vanilla JS, string concatenation.
- **PDF:** prototyyppi `docs/prototyypit/pelaajaraportti_pizza.py` todistaa mplsoccer PyPizzan toimivan samasta
  datasopimuksesta. **Python-CF vaatii Teron luvan (§2: CF:t ovat Node.js).** Vaihtoehto ilman Pythonia: sama
  SVG → PDF Node-CF:ssä.
- Mockupit (Claude Design -canvas): https://claude.ai/artifact/6WWiAJmXUqe26AxhYBnsf8 — Pizza, raportin sivu 2,
  VP-pelaajakortti, VP-joukkue, Rakentaja U14, anatomia.

---

## 4. Osa C — Arvomallit: puolustusarvo ja maaliodotusarvo

**VAEP arvioitu ja hylätty tuotantoon** (socceraction): vaatii täydellisen tapahtumavirran (kolmen toiminnon
ikkuna), ammattilaisliigan kokoisen koulutusdatan ja ikäluokkakohtaiset mallit, ja on musta laatikko.
Ideasta otetaan käyttöön ydin: **jokaisella teolla on arvo**, mutta kolmesta selitettävästä mallista:

| Malli | Teko | Laskenta |
|---|---|---|
| Uhka-arvo | syöttö perille, kuljetus | `xt(loppu) − xt(alku)` (olemassa) |
| **Puolustusarvo** | riisto (katkaisu, taklaus, irtopallo), voitettu 1v1 puolustuksessa | vastustajan uhka-arvo pisteessä, jossa pallo voitettiin |
| Menetysriski | menetys, syöttö ei perille, hävitty 1v1 | vastustajan uhka-arvo menetyspisteessä (olemassa) |
| **Maaliodotusarvo (xG)** | laukaisu | `1 / (1 + e^−(b0 + b1·kulma + b2·etäisyys))` |

**Vastustajan uhka-arvo pisteessä** = `xt({len: 100 − len, wid: 100 − wid})` (sama ruudukko peilattuna).
Tämä on jo `xtMenetysriski`n logiikka; puolustusarvo on sama luku positiivisena tekona.

**xG-geometria (Soccermatics-malli):** X = etäisyys maaliviivasta (m), C = sivuttaisetäisyys keskeltä (m),
`kulma = atan2(7,32·X, X² + C² − 13,44)` (negatiivinen → +π), `etäisyys = √(X² + C²)`.
- Mockupissa esimerkkikertoimet `b0 = 0, b1 = 1,6, b2 = −0,12` → rangaistuspiste ≈ 0,43, boksin raja keskeltä
  ≈ 0,18, 25 m ≈ 0,07. **Ei tuotantokertoimia.**
- Tuotantokertoimet sovitetaan logistisella regressiolla julkisesta laukaisudatasta (StatsBomb Open Data:
  sijainti + maali/ei). **Tarkista StatsBombin lisenssiehdot ja attribuutio ennen käyttöä.** Kertoimet
  tallennetaan vakioiksi + malli-id (esim. `xg_geom_v1`), ei ajonaikaista riippuvuutta.
- **Varaus (§28 henki):** xG mittaa paikan laatua, ei viimeistelytaitoa. "Maalit vs. xG" -erotusta ei
  näytetä pelaajalle eikä huoltajalle, eikä huti hyvästä paikasta ole negatiivinen signaali.

Pienkentällä kaikki uhka-arvolaskut kulkevat `xtProfiili`/metrimuunnoksen kautta. xG:n metrit lasketaan
pelimuodon kenttäkoosta (`XT_KENTTAKOOT`), 11v11 = 105 × 68 m.

---

## 5. Osa D — Kohdennettu pelihavainto: kenttätyökalu (TOTEUTETTAVA)

**Toimiva mockup:** https://claude.ai/artifact/SwzsUXTsqEEUGtvimL1FcQ (versio 5) ja sama tiedosto repossa
`docs/prototyypit/pelihavainto_kenttatyokalu_mockup.html` (avautuu selaimessa, kaikki logiikka inline).
**Mockup on UX:n ja laskennan referenssi.** Tuotantokoodi kirjoitetaan uudelleen repon konventioilla.

### 5.1 Mitä tämä on (ja mitä ei)

- **Yksi pelaaja, yksi puoliaika, 5–10 tilannetta.** Ei koko pelin tapahtumatallennin. Tarkkailija valitsee
  pelaajan etukäteen ja kirjaa vain tämän pelaajan merkittävät hetket.
- Tarkkailija voi olla valmentaja, apuvalmentaja tai talenttivalmentaja. Kymmenen merkintää puoliajassa
  onnistuu yhdeltä ihmiseltä.
- **Tarkoitus: talenttien tunnistus ja ADAR-arvion konkreettinen näyttö.** D4 (peliäly) on tähän asti ollut
  vain subjektiivinen ADAR-arvio. Nämä tilanteet ankkuroivat sen: "arvioin tasolle 4, ja tässä kolme
  tilannetta, jotka tukevat sitä".
- **Pieni otos on tarkoituksellinen.** Tulos esitetään aina tilanne + arvo, ei tilastona. Ei koskaan
  pelaajavertailua.

### 5.2 Näyttö ja eleet (kentällä)

**Näkymä:**
- **Vaakakenttä tarkkailijan silmin.** Asetukset ennen puoliaikaa: puoliaika (1./2. → hyökkäyssuunta kääntyy
  automaattisesti) ja seisomapaikka (pääkatsomon puoli / vastakkainen laita → pystyakseli peilautuu).
  Hyökkäyssuunta näkyy aina nuolena.
- **Ei ruudukkoa näkyvissä**, vain kenttämerkinnät. Napautus kohdistetaan silti 12×8-ruutuun.
- **Koko näyttö:** kenttä täyttää vaakanäytön, oikeassa reunassa isot napit 📌 Hetki ja ↶ Kumoa.
  Pystyasennossa kehotus kääntää puhelin. Yritä `requestFullscreen` + `screen.orientation.lock('landscape')`
  + `navigator.wakeLock` — kaikki valinnaisia, hylkäys ei saa kaataa mitään.
- **Yläpalkki:** pelaajan nimi, numero, pelipaikka, **jaksofokus** (esim. "📍 1v1-hyökkäys laidalla"),
  ☀ ulkotila (korkeakontrastinen vaalea), ottelukello.

**Eleet:**

| Ele | Tulos |
|---|---|
| **Pyyhkäisy** | eteneminen → loppupisteeseen valinta: Syöttö perille / Syöttö ei perille / Kuljetus |
| **Pidä (~380 ms) + pyyhkäise** | juoksu ilman palloa (potentiaali, ei summata luotuun uhkaan) |
| **Napautus** | valikko: 🎯 Laukaisu / 🛡️ Riisto / ↩ Menetys / ⚔ 1v1 |
| **📌 Hetki** | pelkkä aikaleima, täydennetään tauolla |

**Valitsimet aukeavat viuhkana sormen viereen** (ylä- tai alapuolelle sen mukaan, kummalla on tilaa). Uusi ele
kentällä sulkee avoimen valitsimen ja tallentaa sen oletuksella. ✕ peruu.

**Ketjut:**
- **Kuljetus → lopputuote** (4 s): Syöttö (seuraava pyyhkäisy = ketjun syöttö, jolloin valinta on vain
  Perillä / Ei perillä) · Laukaisu (→ tulos) · Menetys (menetys kuljetuksen päähän) · Rikottiin · Säilyi.
- **1v1** (napautus → ⚔): yksi valinta = rooli + tulos: Hyökkäys *Ohitti ✓ / Ei ohittanut* · Puolustus
  *Voitti pallon / Viivytti / Ohitettiin*.
- **Onnistunut ohitus → mitä seurasi** (4 s): Syöttö · Kuljetus (seuraava pyyhkäisy = ketjun kuljetus, sitten
  sen lopputuote) · Laukaisu · Menetys · Säilyi.
- **Riisto tai voitettu puolustus-1v1 → riiston jälkeen** (4 s, 6 valintaa kahdessa rivissä): Syöttö (seuraava
  pyyhkäisy = ketjun syöttö → Perillä / Ei perillä) · Kuljetus (seuraava pyyhkäisy = ketjun kuljetus → lopputuote) ·
  **Säilyi omilla** (pallo jäi joukkueelle ilman pelaajan omaa etenevää tekoa, esim. lyhyt pallo lähimmälle tai
  irtopallo kaverille) · **Selvitys** (tarkoituksellinen pois potkaisu) · Menetys (heti takaisin vastustajalle,
  menetys riistopisteeseen → reaktiokysely) · Rikottiin. Riiston tapa (katkaisu / taklaus / irtopallo) valitaan
  tauolla, ei kentällä.
- **Laukaisu → tulos** (4 s): Maali / Torjuttu / Ohi / Blokattu.
- **Aikaraja 4 s:** jos ei valintaa, merkintä tallentuu ilman tyyppiä/lopputuotetta ja jää täydennettäväksi.
  (Pyyhkäisy ilman valintaa → tyyppi `etenee`.) Aikaraja on validoitava oikeassa ottelussa.
- Ketjun jäsenet (`ketju: <juuren id>`) eivät kasvata tilannelaskuria eivätkä saa omaa numeroa kentällä.

**Valitsin, jossa on 6 vaihtoehtoa, asetellaan 2 × 3 -ruudukoksi** sormen ylä- tai alapuolelle (viuhka menee
päällekkäin kapealla näytöllä). 3–5 vaihtoehtoa = viuhka.

**Palaute:** värähdys (`navigator.vibrate(15)`, try/catch) jokaisesta tallennuksesta. Toast "Syöttö ✓ · 11:30 ·
Kumoa" 5 s. Kumoa poistaa viimeisimmän merkinnän.

> **PR-C: ORVOT KETJUN JÄSENET.** Jos ketjun juuri poistetaan (Kumoa tai korjaus tauolla), sen
> jatkomerkinnät jäävät ilman juurta. `lib/tm_pelihavainto.js` käsittelee tilanteen turvallisesti
> (rikkinäinen `ketju`-viittaus → `_phJuuri` palauttaa `null`), joten ne **putoavat tilannelaskurista**
> — mutta niiden uhka-arvo lasketaan yhä `luotuUhka`-summaan, koska teko tapahtui. Kenttätyökalun on
> siksi juuren poiston yhteydessä joko poistettava jatkomerkinnät samalla kertaa tai kytkettävä ne
> uudelleen uuteen juureen. Lib ei voi päättää tätä puolesta: kumpikin on kelvollinen tulkinta.

**Reaktiokysely (ADAR Reassess), 5 s:** heti menetyksen, epäonnistuneen syötön tai hävityn hyökkäys-1v1:n
jälkeen: "Reagoiko heti menetyksen jälkeen? ✓ Reagoi heti / ✗ Jäi". Kun pelaaja ohitetaan puolustuksessa:
"Palautuiko heti? ✓ Palautui / ✗ Jäi". Ei vastausta → `reaktio: 'ei'` (ei kirjattu). Uusi ele kentällä sulkee
kyselyn samoin. **Ikäraja (Teron päätös 24.9.2026): kysely on käytössä KAIKILLA ikätasoilla, myös U8–12.**
Peruste: reaktiosta saadaan tietoa pelaajan käyttäytymisen muutoksesta ajan mittaan, ja se on arvokkainta
seurata jo nuorimmista. Tämä on tietoinen poikkeus `tmAdarIkaTier`-jaosta (Reassess vasta U16+): kenttätyökalu
kirjaa reaktion aina, ADAR-pikakortin dimensiojakoon ei kosketa. U8–12:lla reaktio kirjataan havaintona
(✓/✗-lukumäärät ajan yli), ei lukuna eikä arvosanana kenellekään.

### 5.3 Puoliajan läpikäynti (tauolla, ~60 s)

Lista kaikista merkinnöistä aikajärjestyksessä, ketjut sisennettynä (↳). Per merkintä:
- tyyppi, sijainti sanoina ("hyökkäyskolmannes, oikea laita"), arvo + malli ("+3,1 uhka-arvo",
  "korkea menetysriski", "0,16 maaliodotusarvo").
- korjattavat valinnat: syöttö Perillä ✓/✗ · kuljetuksen Lopputuote · 1v1 Tulos · Reaktio/Palautui ·
  **Skannasi ennen vastaanottoa ✓/✗** (ADAR Assess, vain juurisyötöt ja -kuljetukset) ·
  **Ohitti matkalla ✓** (kuljetus, jos ei jo 1v1-ketjussa) · riistolle **Miten** (katkaisu / taklaus / irtopallo) ja
  **Riiston jälkeen** (6 vaihtoehtoa, korjattavissa) · konsepti (pelipaikan konseptit, `TM_TT_*`) ·
  🎙 äänimuistiinpano (käytä olemassa olevaa `lib/tm_aani.js` / `tmReflektio`).
- 📌 Hetki → valitse tyyppi (sijainti jää puuttumaan, `eiSijaintia: true`, arvoa ei lasketa).

### 5.4 Yhteenveto ja ADAR-tuki

Luvut (vain valmentaja/VP):
- **1v1 hyökkäys** onnistuneet / yritykset (ohitti + rikottiin + kuljetuksen "ohitti matkalla").
- **1v1 puolustus** voitti / kaikki (+ viivytti n, ohitettiin n).
- **Riistot** n (riistot + voitetut puolustus-1v1:t) + puolustusarvo.
- **Riiston jälkeen (siirtymä):** pallo säilyi x/y · eteni heti n · menetys heti n · selvitys n (erikseen) ·
  siirtymän uhka-arvo. Ks. §5.4.1.
- **Luotu uhka** (syötöt perille + kuljetukset; josta riistoista alkaneet) · **Syötöt perille** x/y ·
  kuljetukset n → lopputuotteet · **Maaliodotusarvo** (summa, n laukaisua).
- **Menetykset** (sis. epäonnistuneet syötöt ja hävityt 1v1:t), joista korkealla riskillä.

ADAR-rivit (ankkuroivat arvion, eivät korvaa sitä):
- **Ennen palloa:** juoksut ilman palloa, skannasi x/y.
- **Pallon kanssa:** 1v1 ohitti x/y · syötöt x/y perille · kuljetukset → lopputuotteet.
- **Puolustaminen:** 1v1 voitti x/y · riistot n.
- **Riiston jälkeen:** pallo säilyi x/y · eteni heti n · menetys heti n · selvitys n · siirtymän uhka.
- **Menetyksen jälkeen:** reagoi heti x/y (menetykset + ohitetuksi tuleminen). Kaikilla ikätasoilla; kehityssuunta
  näkyy, kun samaa pelaajaa on tarkkailtu useammassa ottelussa (käyttäytymisen muutos).

#### 5.4.1 Riiston jälkeinen siirtymä — laskusäännöt

Juuri = `riisto` tai `kaksinpeli` (`rooli:'puolustus'`, `tulos:'voitti'`), jolla on `jatko`.

| `jatko` | Säilyi? | Eteni heti? | Huom |
|---|---|---|---|
| `syotto` | ketjun syöttö `perilla !== false` | syötön uhka-arvo ≥ 0,5 (`XT_RAJA_ETENEE`) | ei perillä → menetys |
| `kuljetus` | ketjun kuljetuksen `lopputuote !== 'menetys'` | kuljetuksen uhka-arvo ≥ 0,5 | |
| `sailyi`, `rikottiin` | kyllä | ei | |
| `menetys` | ei | ei | lasketaan myös "menetys heti" |
| `selvitys` | **ei nimittäjässä** | ei | näytetään erikseen, ei virhe |
| `null` (aikaraja) | ei lasketa | | täydennetään tauolla |

- **Säilytysosuus** = säilyi / (säilyi + menetetty). Selvitys jätetään pois, koska oman boksin selvitys on usein
  oikea ratkaisu (sama periaate kuin `xtLuokka`: kuvaus, ei arvosana).
- **Siirtymän uhka-arvo** = kaikkien ketjun jäsenten (syötöt perille + kuljetukset) uhka-arvojen summa, kun ketjun
  juuri on riisto tai voitettu 1v1. Ketju kuljetaan `ketju`-viittauksia ylöspäin juureen.
- **Tulkinta talenttien tunnistukseen:** ensimmäinen teko riiston jälkeen kertoo, katsoiko pelaaja eteenpäin jo
  ennen riistoa (Assess) ja kuinka nopeasti hän päätti (Decide). Toistuva "eteni heti" on vahva peliäly-signaali.
  Yksittäinen luku ei ole mitään: vain kehityssuunta useamman ottelun yli.
- **Ei pelaajalle eikä huoltajalle** lukuina (§7.22). Pelipaikan huomioiminen: keskuspuolustajalla säilyttävä
  ratkaisu on usein oikea, eikä etenemisosuutta verrata pelipaikkojen yli.

### 5.5 Ikätasot (`tmAdarIkaTier`, `lib/tm_arviointi_taksonomia.js`)

| Taso | Kirjaus | Luvut | Reaktiokysely |
|---|---|---|---|
| U8–12 | tilanteet + 1v1-tulokset | ei kenellekään | **kyllä** (Teron päätös 24.9.) |
| U13–15 | kaikki | valmentaja/VP | **kyllä** (Teron päätös 24.9.) |
| U16+ | kaikki | valmentaja/VP | kyllä |

Pienkenttäprofiili valitaan ottelun pelimuodosta (5v5/8v8/11v11).

### 5.6 Datamalli

**Suositus: yksi dokumentti per pelaaja per puoliaika olemassa olevaan havainnot-kokoelmaan.** Ei uutta
Rules-blokkia (havainnot: valmentaja kirjoittaa, SA/oma seura lukee, §12), ei alikokoelmakyselyjä
renderöinnissä, ja merkintöjä on enintään ~10.

```
seurat/{sid}/pelaajat/{pid}/havainnot/{hid}
  tyyppi: 'kenttatarkkailu'
  palloId, pelaajaId, seuraId, valmentajaUid
  tila: 'luonnos' | 'valmis'          // 'valmis' vasta kun liitetty pelihavaintoon
  luotu: serverTimestamp()
  ottelu: { kalenteriId|null, vastustaja|null, pvm: 'YYYY-MM-DD', pelimuoto: '11v11'|'8v8'|'5v5' }
  puoliaika: 1|2
  suunta: { hyokkaysOikealle: bool, seisoo: 'lahi'|'kauko' }   // vain näyttöä varten; data on aina kanonisessa muodossa
  ikataso: 'u812'|'u1315'|'u16'
  jaksofokus: string|null             // kopio hetkestä
  malli: { xt: 'singh_12x8_v1[+pienkentta_m_v1]', xg: 'xg_geom_v0_esimerkki' }   // v1 vasta kalibroinnin jalkeen
  merkinnat: [ {                      // ARRAY → EI serverTimestamp() (§7.6), käytä sekunteja
      id, t: <sekunnit ottelun alusta>, tyyppi:
        'syotto'|'kuljetus'|'etenee'|'juoksu'|'riisto'|'laukaus'|'menetys'|'kaksinpeli'|'hetki',
      alku?: {len, wid}, loppu?: {len, wid}, piste?: {len, wid},   // 0–100, len = omasta maalista
      perilla?: bool|null, lopputuote?: 'syotto'|'laukaus'|'menetys'|'rikottiin'|'sailyi'|null,
      rooli?: 'hyokkays'|'puolustus',
      tulos?: 'ohitti'|'rikottiin'|'ei_ohittanut'          // rooli 'hyokkays'   (PH_KAKSINPELI_TULOS)
            | 'voitti'|'viivytti'|'ohitettiin'|null,       // rooli 'puolustus'
      tapa?: 'katkaisu'|'taklaus'|'irtopallo'|null,              // vain riisto
      jatko?: 'syotto'|'kuljetus'|'laukaus'|'menetys'|'sailyi'|'selvitys'|'rikottiin'|null,  // ohitus- ja riistojuurille
      ohitus?: bool, reaktio?: 'heti'|'jai'|'ei'|null, skannasi?: bool|null,
      ketju?: <juuren id>, eiSijaintia?: bool, konsepti?: string, aani?: {storage_url}|null
  } ]
```

**Koordinaatit:** tallennetaan **kanonisessa muodossa** `len` (0 = oma maali … 100 = vastustajan maali) ja `wid`
(0 = hyökkääjän vasen laita … 100 = oikea). Näyttö hoitaa kääntämisen puoliajan ja seisomapaikan mukaan.
Taktiikkataulun speciin (Opta, `suunta:'ylos'`) muunnos: `x = wid`, `y = 100 − len`.

**EHDOTTOMAT kentät, joita EI käytetä:** `pisteet` (Master `paivitaAdarPikakentat` lukisi sen ADAR-pisteinä),
`narratiivi` ja `teksti` raakadokumentissa (Pelaaja_v7 näyttäisi sen pelaajalle). Pelaajalle näkyvä teksti
syntyy vain valmentajan kirjoittamasta pelihavainnosta.

**Laskettuja arvoja ei tallenneta.** Ne lasketaan lennossa (`lib/tm_pelihavainto.js`), jotta kertoimien
päivitys (xG-kalibrointi, nuorten oma ruudukko, XT_KAYTTOONOTTO Vaihe 4) ei vaadi datamigraatiota.

**Offline-first:** merkinnät ensin localStorageen (kuten Testaus_v9), synkronointi Firestoreen kun verkko on.
`getIdToken(true)` ennen kirjoitusta (§7.2). CF-kutsuja ei tarvita.

### 5.7 Tiedostot

| Tiedosto | Sisältö |
|---|---|
| `lib/tm_pelihavainto.js` (uusi, puhdas, dual export) | kanoninen ↔ Opta-muunnos, `phArvo(merkinta, pelimuoto)` (uhka-arvo / puolustusarvo / menetysriski / xG), `phXg(piste, pelimuoto)`, `phYhteenveto(dok)` (§5.4 luvut + ADAR-rivit), `phVyohyke(piste)` (sanallinen sijainti), `phIkataso(ika)` → käyttää `tmAdarIkaTier`. Käyttää `lib/tm_xt.js`:ää, ei kopioi ruudukkoa. |
| `tests/pelihavainto.test.js` | ks. §5.8 |
| `TalentMaster_Pelihavainto_Kentta.html` (uusi) | kenttätyökalu + puoliajan läpikäynti. Mobile-first, vaaka. Käynnistys `?seuraId=&pelaajaId=` (+ SA:lle seuravalitsin, §3). |
| ADAR-pikakortti + Master_v16 + VP_v25 | launcher-linkki "Kohdennettu pelihavainto" (kuten ADAR-kenttätyökalu, §26) |
| Master_v16 pelaajanäkymä | läpikäydyt kenttätarkkailut pelihavainnon rinnalle (luku havainnot-kokoelmasta, `tyyppi=='kenttatarkkailu'`) |
| `lib/tm_i18n_common.js` | sv-käännökset (GrIFK, VIFK, Sibbo) |
| `sw_*` | jos sivu tulee PWA:han: allowlist + cache-versio (§27.4) |

Konventiot: vanilla JS, **string concatenation** (§7.1), `window.fn` HTML-onclickeille (§7.17),
TalentMaster-tokenit molemmille teemoille, yksi `@media(max-width:768px)` per tiedosto (§6), App Check (§38),
`?v=N` cache-bust, **ei `npm run version:bump`ia feature-haarassa**.

### 5.8 Testit (vähintään)

- Kanoninen ↔ näyttö: puoliaika 1/2 × seisomapaikka lähi/kauko → sama kanoninen piste (4 yhdistelmää).
- Uhka-arvo: syöttö perille = `xt(loppu) − xt(alku)`; syöttö ei perille ei kasvata luotua uhkaa.
- Puolustusarvo = menetysriskin peililuku samassa pisteessä.
- Menetysriskin rajat 2 / 5 uhkapistettä.
- xG: monotoninen (lähempänä > kauempana, keskeltä > sivusta), rangaistuspisteen arvo kertoimista.
- Pienkenttä: 8v8-piste samalla metrietäisyydellä maalista = 11v11-arvo; 3v3 → null.
- Riiston jälkeen: jokainen §5.4.1-taulukon rivi; selvitys ei vaikuta säilytysosuuteen; ketjun kuljetus → syöttö
  lasketaan siirtymän uhkaan kerran; ketjuton `jatko:'syotto'` (ei vielä pyyhkäisty) ei kaada laskentaa.
- Yhteenveto: ketjut eivät tuplaa tilannelaskuria; "ohitti matkalla" ei tuplaa 1v1-ketjun ohitusta;
  `eiSijaintia`-merkinnät lasketaan lukumääriin mutta eivät arvoihin.
- Ikätasot: U8–12 → ei lukuja, mutta reaktiokysely päällä · kaikilla tasoilla reaktio kirjataan (ei `tmAdarIkaTier`-porttia).
- Dokumentti ei sisällä `pisteet`/`narratiivi`/`teksti`-kenttiä (regressiovartija).

> **Regressiovartija `pisteet`/`narratiivi`/`teksti` (EHDOTTOMAT kentät, §5.6) kuuluu PR-C:hen tai PR-D:hen**,
> koska tallennus tehdään niissä — Vaihe 1:n lib ei kirjoita Firestoreen. Kirjaa se niiden briiffiin.


### 5.9 Vaiheistus

| Vaihe | Sisältö | Valmis kun |
|---|---|---|
| **1** | `lib/tm_pelihavainto.js` + testit | lint + vitest vihreä |
| **2** | Kenttätyökalu (kirjaus + läpikäynti + localStorage), ei Firestorea | Tero testannut omalla puhelimella koko näytöllä |
| **3** | Firestore-tallennus havainnot-kokoelmaan + launcherit | SA + valmentaja kirjoittavat, pelaaja ei näe (live-verify) |
| **4** | Master/VP-näkymä ja kytkös pelihavaintoon/ADAR-narratiiviin | 1 pilottijoukkue, 4 viikkoa |
| **5** | xG-kertoimien kalibrointi (lisenssi tarkistettu) | kertoimet + malli-id `xg_geom_v1` |

---

## 6. Muut session havainnot (taustaksi)

- **awesome-sports-analytics** (jeff3388): lähinnä SEO-lista, ei suoraa hyötyä.
- **Expected-Threat-Model** (bsobkowicz1096): ei lisenssiä, ei tuotantolaatuinen. Opit: pelkkä sijainti riittää,
  alle ~2 m kuljetukset kohinaa (harkitse minimipituutta), domain shift aikuisdatasta junioreihin.
- **ClubElo** kattaa Suomesta vain eurocup-seurat (KuPS, HJK, Ilves, VPS) → ei hyötyä; vastustajan tasolle
  oma Elo TASO-otteludatasta, jos joskus tarvitaan.
- **StatsBomb Open Data:** ei suomalaisia sarjoja, mutta hyvä kalibrointiaineisto (xG, 360-data).
  **PySport**-hakemisto: mplsoccer (käytössä), kloppy, socceraction (VAEP), soccer_xg.

---

## 7. Avoimet päätökset Terolle

1. ~~Reaktiokyselyn ikäraja~~ **Päätetty 24.9.:** kysely kaikilla ikätasoilla, myös U8–12 (ks. §5.2).
2. **4 sekunnin aikaraja** valitsimille — validoidaan oikeassa ottelussa.
3. **DNA Match -templatit ja painot** (§3) — Clauden ehdotus, ei hyväksytty.
4. **Python-CF pelaajaraportin PDF:lle** vai Node-toteutus (§2 vaatii luvan).
5. `docs/XT_KAYTTOONOTTO.md` §8 (konseptien xT-mittarit, pelaajan näkyvyys U16+, VAI+-laskenta, epäonnistunut
   teko, live vs. video).
