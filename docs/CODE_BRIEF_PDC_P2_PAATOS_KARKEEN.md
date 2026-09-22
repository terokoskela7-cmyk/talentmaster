# PDC P2 — nosta päätös kortin kärkeen (decision-first) · Code-brief

> **Tila:** UX-parannus, additiivinen. **Yksi PR puhtaasta mainista** (base `f49deab4b`). Ei pinoamista.
> Ei rules-, ei datamalli-, ei kyselymuutosta. **Ei uutta dataa** — kaikki luetaan pikakentistä ja jo
> ladatusta `p._idpTavoite`:sta samoilla kanonisilla funktioilla joita kortti käyttää muutenkin.
>
> **Lähde (SSOT):** `Claude outputs/ANALYYSI_PLAYER_DEVELOPMENT_CARD_UX_AUDIT.md` **§2.3 + §P2**.
> Tämä brief on kirjoitettu auditin pohjalta + lähdeverifioinnilla; auditin sanamuoto on alla sellaisenaan.
> Ristiriidassa **audit voittaa**.

## Auditin määrittely (§P2, sanatarkasti)

> *"Yksi rivi heti signature-rivin alle: **tämän palaverin toimenpide** — review myöhässä/erääntyy · IDP jumissa
> (8 vk) · sitoumus vahvistamatta · ei jaksofokusta · ei X-Factoria. Teal vain kun toimenpide tarvitaan; muuten
> hiljainen. (Kaikki luvut ovat jo kortilla — tämä on olemassa olevan datan nosto, ei uutta kyselyä.)"*

Perustelu §2.3: *"read-only PDC avautuu dataan … ja vasta kaiken alla review-status. Kehityspalaverissa VP:n pitäisi
nähdä heti 'mikä on tämän pelaajan päätös nyt'. Nyt se pitää kaivaa."*

## CODE-SÄÄNNÖT (protokolla)
- Poikkeama = ilmoita ENNEN · **reuse yli reimplementoinnin** · älä koske review-/IDP-/jaksofokus-logiikkaan:
  P2 vain LUKEE niitä.
- `vpT()` kääri **vain tekstin, ei markkupia** (`tests/i18n_markup_avaimet.test.js`).
- Inline-handlerit: ei kaksoisescapea (`tests/inline_handler_parse_portti.test.js` vartioi).
- Ei `?v`-nostoa, ei Rules-deployta, ei migraatiota.

---

## 1. SIJAINTI (verifioitu lähteestä, rivit @ main `f49deab`)

`_renderMDTProfiili` (15592) rakentaa signature-rivin **kahtena haarana** (15661–15668):

```js
if (scout) { h += '<div class="pdc-sig">' + … Scouting-näkymä … }
else       { h += '<div class="pdc-sig">' + … Nykyfokus / Ei asetettua jaksofokusta … }
```

**P2-rivi tulee heti if/else-lohkon jälkeen** → näkyy molemmissa linsseissä (sama pelaaja, sama avoin toimenpide).
CSS lisätään samaan inline-`<style>`-lohkoon `.pdc-sig`-säännön viereen (~15632).

## 2. DATALÄHTEET — kaikki olemassa, mitään ei lasketa uudelleen

| Signaali | Kanoninen lähde | Todennettu |
|---|---|---|
| Review myöhässä / erääntymässä | `laskeReviewKadenssi(p, nyt)` → `{status:'myohassa'\|'eraantymassa'\|'ajantasalla'\|'ei_reviewia', ylimaaraPv, eraantyyPvm}` | `lib/tm_eerikkila_normit.js:837`; PDC kutsuu jo tätä review-rivissään |
| Tavoite jumissa 8 vk | `idpJumissa(tavoite, nyt)` — *"8 VIIKON SÄÄNTÖ (kv-malli): tavoite jumissa jos luonnista >56 vrk EIKÄ merkittävää edistystä"* | `lib/tm_idp.js:343–352`; työpöydän status-nauha käyttää jo (`_vpKehStatusHTML`) |
| Sitoumus vahvistamatta | `_rvcSitoumusOdottaa(p)` — `idp_sitoumus_pvm` && `idp_sitoumus_vahv_jakso !== jaksofokus.alkoi` | VP ~16028, bulk-signaali (§26, ei alikokoelmakyselyä) |
| Ei jaksofokusta | `p.jaksofokus.konsepti_nimi` puuttuu | sama kenttä jota signature-rivi jo lukee |
| X-Factor | `p.signaali === 'xfactor'` | PDC:n `talBadge` lukee jo |

**§26-invariantti säilyy:** ei alikokoelmakyselyjä renderöinnissä. `p._idpTavoite` on jo ladattu
(`_mdtLataaTavoitteet` pelaajaa valittaessa) — sitä lukevat jo Kehityssuunnitelma- ja Kehityskaari-kappaleet.

## 3. TOTEUTUS

### 3.1 Puhdas päätösfunktio (testattava ilman DOM:ia)

```js
window._pdcPaatos = function (p, nyt) { … }   // → { avain, tila, teksti, toimenpide } | null
```
- `tila: 'toimenpide'` → **teal**-korostus · `tila: 'hiljainen'` → `--ink3`, ei tealia, ei emojia.
- Palauttaa **yhden** (ylimmän) asian — ei listaa. "Yksi rivi", ei rimpsua.
- `nyt` injektoitavissa (deterministinen testi).

### 3.2 Prioriteetti — **auditin luettelojärjestys**, yksi taulukko

| # | Avain | Ehto | Rivi (fi) |
|---|---|---|---|
| 1 | `review_myohassa` | `rk.status === 'myohassa'` | "Review on **N pv myöhässä** — tee se tässä palaverissa." |
| 2 | `idp_jumissa` | `idpJumissa(t)` | "Kausitavoite ei ole edennyt **8 viikkoon** — päivitä tai vaihda." |
| 3 | `sitoumus` | `_rvcSitoumusOdottaa(p)` | "Pelaaja sitoutui — **vahvista sitoumus** tälle jaksolle." |
| 4 | `ei_jaksofokusta` | ei `jaksofokus.konsepti_nimi` | "Ei jaksofokusta — **aseta se** kehitystyöpöydässä." |
| 5 | `review_eraantymassa` | `rk.status === 'eraantymassa'` | "Review erääntyy **pp.kk.vvvv** — sovi ajankohta." |
| — | `xfactor` / `ei_xfactoria` | mikään yllä ei päde | *hiljainen:* "X-Factor tunnistettu — vahvista suunta." / "Ei avointa toimenpidettä — nimetkää kärkivahvuus." |

**Prioriteettilista on yksi taulukko koodissa** → järjestyksen muuttaminen on yhden rivin siirto.

### 3.3 KAKSI TULKINTAA jotka Coden on tiedettävä (auditti ei ratkaise näitä)

1. **Review on auditissa yksi kohta ("myöhässä/erääntyy"), tässä kahtena.** `myohassa` = kova deadline → #1;
   `eraantymassa` (≤14 pv) = pehmeä → #5. Perustelu: erääntymässä oleva review ei ole kiireellisempi kuin
   *puuttuva jaksofokus*. Jos haluat auditin kirjaimen, siirrä `review_eraantymassa` kohtaan 1b.
2. **"Ei X-Factoria" EI ole teal-toimenpide vaan hiljainen tila.** Perustelu: X-Factor on määritelmällisesti
   harvinainen, joten teal-toimenpiteenä se palaisi ~kaikilla pelaajilla → teal olisi taas päällä aina
   (juuri se teal-inflaatio jonka §2.4/P3 nimeää ongelmaksi) ja "muuten hiljainen" ei toteutuisi.
   Hiljaisessa tilassa rivi silti KERTOO jotain: joko X-Factor on tunnistettu tai kärkivahvuus on yhä nimeämättä.

### 3.4 Tyyli
- `.pdc-paatos` heti `.pdc-sig`:n alle; `margin:2px 0 6px`, `font-size:12.5px`, `max-width:640px`.
- **Toimenpide:** vasen teal-reunaviiva (2px) + `rgba(40,176,144,.07)` tausta + `--ink` teksti; korostus `<b>` tealilla.
- **Hiljainen:** ei taustaa, ei reunaa, `--ink3`.
- **§5:** teal on ainoa aksentti — **ei amberia/punaista** (myöhässä oleva review ei ole virhe vaan toimenpide).
- Pvm **pp.kk.vvvv** (`tmPvmFi`), ei ISO — CLAUDE.md-headerin pvm-invariantti.
- Näkyy myös printissä ja palaveritilassa (ei `mdt-no-print`): se on kortin tärkein rivi.

### 3.5 i18n
Uudet avaimet `lib/tm_vp_i18n.js`:ään **sv-käännöksineen**. Tekstit pilkottava niin että **markup ei mene
`vpT()`:n sisään** (numerot/pvm konkatenoidaan ulkopuolella).

## 4. ÄLÄ KOSKE
- `laskeReviewKadenssi` · `idpJumissa` · `_rvcSitoumusOdottaa` · `tmJfUmpeutunut` — P2 vain lukee.
- PDC:n alalaidan **review-status-rivi ja "✓ Merkitse review tehdyksi"** jäävät paikalleen (P2 ei siirrä
  toimintoja, vain nostaa *tiedon* kärkeen). Napin demotointi/teal-hierarkia = **P3**, eri tiketti.
- Signature-rivin oma sisältö (molemmat haarat) ennallaan.
- Palaveritilan CSS, z-indeksit, P1:n siirtymä.

## 5. VARTIJA (uusi `tests/pdc_paatos_karkeen.test.js`)
Päätösfunktio on puhdas → **aja se**, älä greppaa.
1. **Prioriteetti:** pelaaja joka täyttää monta ehtoa → palautuu ylin (testaa kaikki 5 paria).
2. **Jokainen ehto erikseen** → oikea `avain`, `tila:'toimenpide'`.
3. **Hiljainen tila:** ei yhtään ehtoa → `tila:'hiljainen'`; X-Factor erottuu ei-X-Factorista.
4. **Determinismi:** `nyt` injektoituna sama tulos; ei `Date.now()`-riippuvuutta testissä.
5. **Sijainti lähteessä:** `.pdc-paatos` renderöityy **signature-rivin jälkeen** (indeksivertailu), molemmissa linsseissä.
6. **§5-lukko:** rivin tyylissä ei `--amber`/`--red`.
7. **Ei uutta kyselyä:** päätösfunktion rungossa ei `.collection(`/`.get(`/`await`.

**Mutaatiomatriisi** (jokaisen punerrettava): prioriteettijärjestys sekoitettu · `tila` aina `'toimenpide'` ·
X-Factor-haara pois · `.pdc-paatos` signature-rivin *ennen* · amber tyyliin · `nyt` ohitettu `Date.now()`:lla.

## 6. HYVÄKSYNTÄ
1. Yksi rivi heti signature-rivin alla, molemmissa linsseissä.
2. Teal vain kun toimenpide; muuten hiljainen (ink3).
3. Ylin toimenpide auditin järjestyksessä; ei listaa.
4. Ei uutta dataa/kyselyä; §26 ennallaan.
5. fi + sv, molemmat teemat; vartija vihreä + mutaatiot punertavat.
6. `npm test` + `npm run lint` vihreä; P1-portti ja handler-parse-portti pysyvät vihreinä.

**Deploy:** `TalentMaster_VP_v25.html` + `lib/tm_vp_i18n.js` + uusi vartijatesti + tämä brief.

---

*Ydin: PDC avautuu dataan, ei päätökseen — review-status on vasta kaiken alla. P2 nostaa yhden rivin signature-rivin
alle: mikä on tämän pelaajan toimenpide nyt. Kaikki signaalit ovat jo kortilla, joten tämä on nosto, ei laskenta.
Teal varataan sille yhdelle asialle; kun mitään ei ole auki, rivi on hiljainen.*
