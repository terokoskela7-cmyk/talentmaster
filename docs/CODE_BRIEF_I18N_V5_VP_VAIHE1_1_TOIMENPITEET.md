# Code-brief — i18n VAIHE 5 · VP_v25 · **VAIHE 1.1 (täydennys): Toimenpiteet-osio sv**

> **Konteksti:** V1 (Tilanne + Koti) on mainissa ja verifioitu — reititetty pinta kääntyy oikein, fi-regressio ehjä,
> vitest 21/21, lint EXIT 0. **Live-verifioinnissa löytyi YKSI aukko** jota V1-gate ei kattanut: Tilanne-näkymän
> **Toimenpiteet-osio (section 05)** rakentuu kokonaan ilman `vpT()`/`data-i18n`:ää → sv-VP näkee sen suomeksi.
>
> **Miksi tämä on skoopissa:** `#toimenpiteet-lista` on `<div id="ws-tilanne">`:n sisällä (rivi ~2352), ja
> `_alustaToimenpiteet()` ajetaan oikeille (ei-demo) seuroille → osio on Tilanne-laskeutumissivun näkyvä
> lippulaivalohko ("TalentMaster ehdottaa — sinä päätät"). V1:n DoD oli *"Tilanne 100 % sv"*. Tämä alijärjestelmä
> (`TP_SIGNAALIT`/`generoimToimenpideEhdotukset`/`dedupToimenpiteet`/`renderToimenpiteet`/`_tpKorttiHtml`/`_muokkaaToimenpide`)
> jäi V1-briiffin funktiolistan ulkopuolelle (se ei ole `renderTilanne`:n kutsuma vaan boottaa erikseen rivillä ~2932),
> siksi gate ei osunut siihen. **Tämä patch sulkee sen.** Ei uutta logiikkaa — vain reititys.

---

## ⚠️ KRIITTINEN INVARIANTTI (lue ensin) — `teksti` on SEKÄ näkyvä ETTÄ tallennettu

`TP_SIGNAALIT[].tarkista()` tuottaa `teksti`-kentän, joka:
1. **kirjoitetaan Firestoreen** (`tallennaToimenpide` → `seurat/{sid}/toimenpiteet/{id}.teksti`, rivi ~17297), ja
2. **näytetään** kortissa (`_tpKorttiHtml` → `.tp-teksti`, rivi ~17421) JA muokkausmodaalissa "alkuperäisenä ehdotuksena"
   (`_muokkaaToimenpide` → `.tp-alkup-teksti`, rivi ~17528).

→ **ÄLÄ käännä `teksti`:ä generointihetkellä.** Jos sv-teksti tallentuu Firestoreen, (a) fi-VP näkisi myöhemmin sv:n,
ja (b) sama dokumentti vuotaisi kielen tietokantaan (sama fork-break-luokka kuin lib-forkin pelipaikat/DIAGNOOSI_RE).
**Kanoninen `teksti` pysyy suomeksi tietokannassa. Käännä VAIN näyttöhetkellä.**

### Toteutusmalli (suositus): käännä display-hetkellä tail-mäppäyksellä
`teksti`-kaava on aina **`{joukkuePrefix} — {muuttuva häntä}`** (em-viiva ` — ` erottaa). Häntiä on **äärellinen,
kiinteä joukko** (alla). → lisää helper `vpTToimenpide(teksti)`:
- Splittaa ensimmäisestä ` — `:stä → `prefix` (joukkuenimi/"Kaikki joukkueet", **säilytä sellaisenaan**) + `häntä`.
- Häntä sisältää joskus luvun alussa (`3 pelaajaa alle…`). Eristä johtava `\d+ ` numero-osa (säilytä), käännä loput
  `vpT()`:llä kiinteästä häntäkartasta.
- Palauta `prefix + ' — ' + [luku] + vpT(hännänKiintaOsa)`.
- Kutsu `_tpKorttiHtml`:ssä: `_jsvEsc(vpTToimenpide(g.teksti || ''))` (esc säilyy). Muokkausmodaalin "alkuperäinen"
  (`.tp-alkup-teksti`) — Code valitsee: joko myös `vpTToimenpide` (näytä käännettynä) TAI jätä fi (se on nimenomaan
  "TalentMasterin alkuperäinen ehdotus" → fi on perusteltua). **Suositus: käännä sekin** yhtenäisyyden vuoksi.

> **Vaihtoehto B (siistimpi, isompi):** tallenna `teksti` sijaan `{signaali, joukkue, n}` ja rakenna virke vasta
> renderissä `vpT(template).replace('{j}',…).replace('{n}',…)`. **EI suositella tässä patchissa** — vaatii
> Firestore-skeeman muutoksen + olemassa olevien `toimenpiteet`-dokkien migraation. Pidä V1.1 matalariskisenä (malli A).

### Kiinteät hännät (fi → sv) — `TP_SIGNAALIT` (per-joukkue) + `dedupToimenpiteet` (aggregaatti)
Nämä ovat kaikki mahdolliset hännät (rivit 17309/17314/17320/17327/17332/17338 + dedup 17395–17406). Numero-osa `{n}`
säilytetään, muu käännetään:

| fi-häntä (numero-osan jälkeen) | sv |
|---|---|
| `pelaajaa alle Eerikkilä-tason (H-H < 2.5). Aloita yksilöllinen harjoitusohjelma.` | `spelare under Eerikkilä-nivå (H-H < 2,5). Starta ett individuellt träningsprogram.` |
| `H-H taso laskussa {n} pelaajalla. Tarkista kuormitus.` | `H-H-nivån sjunker hos {n} spelare. Kontrollera belastningen.` |
| `tekniikkamittaukset puuttuvat kaikilta pelaajilta. Suunnittele tekniikkakilpailu.` | `tekniska mätningar saknas för alla spelare. Planera en tekniktävling.` |
| `pelaajaa alle pronssitason (TKI < 40). Fokusoi tekniikkaharjoittelu yleisimpään kehityskohteeseen.` | `spelare under bronsnivå (TKI < 40). Fokusera teknikträningen på det vanligaste utvecklingsområdet.` |
| `pelaajaa lähellä pronssia (TKI 35–54). Kohdenna omatoimiharjoittelu — merkki on saavutettavissa seuraavassa kilpailussa.` | `spelare nära brons (TKI 35–54). Rikta egenträningen — märket är nåbart i nästa tävling.` |
| `harjoitettavuuskartoitus (kehon valmius) tekemättä. Varaa kartoituspäivä, jotta harjoittelua voi yksilöllistää.` | `träningsbarhetskartläggning (kroppslig beredskap) ogjord. Boka en kartläggningsdag så att träningen kan individualiseras.` |
| **Aggregaatti (`dedupToimenpiteet`):** `Kaikki joukkueet — tekniikkamittaukset puuttuvat {n}:lta joukkueelta. Suunnittele tekniikkakilpailu.` | `Alla lag — tekniska mätningar saknas för {n} lag. Planera en tekniktävling.` |
| `pelaajia alle Eerikkilä-tason. Aloita yksilöllinen ohjelma.` | `spelare under Eerikkilä-nivå. Starta ett individuellt program.` |
| `H-H taso laskussa. Tarkista kuormitus.` | `H-H-nivån sjunker. Kontrollera belastningen.` |
| `pelaajia alle pronssitason (TKI < 40). Fokusoi tekniikkaharjoittelu.` | `spelare under bronsnivå (TKI < 40). Fokusera teknikträningen.` |
| `pelaajia lähellä pronssia. Kohdenna omatoimiharjoittelu, merkki saavutettavissa.` | `spelare nära brons. Rikta egenträningen, märket är nåbart.` |
| `Kaikki joukkueet — harjoitettavuuskartoitus (kehon valmius) tekemättä {n}:lta joukkueelta. Varaa kartoituspäivä.` | `Alla lag — träningsbarhetskartläggning (kroppslig beredskap) ogjord för {n} lag. Boka en kartläggningsdag.` |

> **Glossaari (§14/§34, KANONINEN):** `kehon valmius → kroppslig beredskap` (EI "kroppens"). H-H / TKI / Eerikkilä
> = ennallaan. `Kaikki joukkueet → Alla lag`. Desimaalipilkku ruotsiksi (2,5 ei 2.5) tekstissä.
> **`{joukkue}`-prefix ja luvut säilytetään verbatim** (eivät käänny).

---

## Skooppi 2 — Staattinen osion otsikko (`data-i18n`, ws-tilanne rivit ~2349–2352)

```html
<h2 class="section-title">Toimen<em>piteet</em></h2>
<span class="section-hint">TalentMaster ehdottaa — sinä päätät</span>
```
- **`<h2>`-gotcha:** `vpLokalisoi()` asettaa `textContent` → **pyyhkii inline-`<em>`:n**. ÄLÄ laita `data-i18n`:iä
  suoraan `<h2>`:een jos haluat säilyttää teal-`<em>`-korostuksen. Vaihtoehdot (Code valitsee):
  (a) hyväksy tasainen otsikko: `<h2 class="section-title" data-i18n="Toimenpiteet">Toimenpiteet</h2>` (menetä `<em>`), TAI
  (b) säilytä korostus: kääri `<span data-i18n="Toimenpiteet">Toimenpiteet</span>` ja tyylitä span (ei `<em>` sisällä).
  Muut V1-osiootsikot käyttävät samaa `<em>`-kuviota → jos valitset (a), harkitse yhtenäisyyttä (ei pakko tässä patchissa).
- **Vihje:** `<span class="section-hint" data-i18n="TalentMaster ehdottaa — sinä päätät">…</span>` (plain, ei gotchaa).
- sv-arvot: `Toimenpiteet → Åtgärder` · `TalentMaster ehdottaa — sinä päätät → TalentMaster föreslår — du beslutar`.
  (Molemmat lisättävä karttaan; `data-i18n` toimii koska `vpLokalisoi()` ajetaan boottauksessa + kielenvaihdossa.)

---

## Skooppi 3 — Dynaaminen render (`vpT()` JS:ssä)

### `renderToimenpiteet` (~17432) + `_tpKorttiHtml` (~17414)
| Kohta | fi | sv | Huom |
|---|---|---|---|
| Tyhjätila 17434 | `Ei avoimia toimenpiteitä — hyvä työ.` | `Inga öppna åtgärder — bra jobbat.` | `vpT()` |
| Ryhmäotsikko (`TP_PRIO_META.nimi` 17380) | `Kiireinen` · `Suunnittele` | `Brådskande` · `Planera` | reititä `m.nimi` renderissä: `vpT(m.nimi || '')` |
| Kortti-napit 17422–17424 | `Kuittaa` · `Muokkaa` · `Hylkää`(title) | `Kvittera` · `Redigera` · `Avvisa` | `vpT()`; **säilytä `<i class="ti …">`-ikonit** (innerHTML, älä textContent) |
| "Näytä kaikki" 17456 | `Näytä kaikki {n} toimenpidettä →` | `Visa alla {n} åtgärder →` | template: `vpT('Näytä kaikki {n} toimenpidettä →').replace('{n}', dedup.length)` |
| Kortin `teksti` 17421 | (ks. INVARIANTTI yllä) | | `vpTToimenpide(g.teksti)` |

### `_alustaToimenpiteet` placeholderit (~17471–17480)
| fi | sv |
|---|---|
| `Toimenpiteet näkyvät kirjautuneessa seurassa.` | `Åtgärder visas i en inloggad förening.` |
| `Toimenpiteitä ei voitu ladata — tarkista että Rules v3.1 on deployattu.` | `Åtgärderna kunde inte laddas — kontrollera att Rules v3.1 är deployad.` |

### Muokkausmodaali `_muokkaaToimenpide` (~17513–17532) + toastit
| fi | sv |
|---|---|
| `Muokkaa toimenpidettä` (otsikko) | `Redigera åtgärd` |
| `TalentMasterin ehdotus` (label) | `TalentMasters förslag` |
| `Kirjoita oma versio...` (placeholder) | `Skriv din egen version...` |
| `Tallenna` · `Peruuta` | `Spara` · `Avbryt` |
| `Oma versio tallennettu` (toast) | `Egen version sparad` |
| `Tallennus epäonnistui` | `Sparandet misslyckades` |

### `_kuittaa` / `_hylkaa` toastit (~17496, 17501, 17511)
| fi | sv |
|---|---|
| `{n} toimenpidettä kuitattu` (template) | `{n} åtgärder kvitterade` |
| `Toimenpide kuitattu` | `Åtgärd kvitterad` |
| `Kuittaus epäonnistui` | `Kvitteringen misslyckades` |
| `Hylkäys epäonnistui` | `Avvisningen misslyckades` |

> `placeholder`-attribuutti textareassa (`Kirjoita oma versio...`): koska modaali rakennetaan `innerHTML`-stringinä
> dynaamisesti, reititä `vpT()`:llä stringiin (ei `data-i18n-ph`, joka vaatisi vpLokalisoi-sweepin modaalille).

---

## ⛔ ÄLÄ reititä
- Signaali-id:t / enumit: `hh_taso_alhainen`, `suunta_lasku`, `tkk_puuttuu`, `tki_alhainen`, `tki_lahella_merkkia`,
  `flei_kartoitus_puuttuu`, `kiireinen`/`suunnittele` (prioriteettiavaimet), `automaattinen`, `ehdotus`/`muokattu`/`hylatty` (tila).
- `joukkue`-nimet ja luvut (interpoloidut) — säilytä verbatim.
- `_tpPvm` `toLocaleDateString('fi-FI', …)` — numeerinen pp.kk on käytännössä identtinen sv-FI:ssä; **matala prio**,
  voit halutessasi vaihtaa dynaamiseksi (`tmNykyinenKieli()==='sv'?'sv-FI':'fi-FI'`), mutta ei pakollinen tässä.
- CSS-luokat / element-id:t / onclick-funktionimet / `console.warn`-tagit (`[toimenpiteet]` ym.) / `.ti ti-*`-ikonit.

## Käännösmuisti
Osalla stringeistä (`Kiireinen`, `Kuittaa`, `Hylkää`, `TalentMaster ehdottaa — sinä päätät`) **on jo sv Kimin kartassa**
(mutta koodi ei kutsu `vpT()`:tä → renderöi silti fi). Käytä olemassa olevaa sv:tä jos avain on jo `TM_VP_I18N`:ssä
(plain-text-muodossa); muuten lisää yllä olevat sv-arvot. **Lisää kaikki uudet parit myös `docs/VP_SV_KAANNOSMUISTI.json`:iin**
(kasvava SSOT). Häntäkartan avaimet = fi-häntä sanatarkasti.

## Vartijat
- **fi-regressio ehdoton:** fi-tila identtinen. `teksti` pysyy fi:nä Firestoressa (INVARIANTTI). `vpT()`/`vpTToimenpide()`
  fi-haara palauttaa fi:n → ei tyhjää.
- **§7.1:** `+`-konkatenointi, ei nested template literaleja. **§5:** ei väri-/tyylimuutoksia (ikonit + `<em>` säilytettävä).
- **Glossaari:** kroppslig beredskap · Alla lag · desimaalipilkku sv-teksteissä.

## Cache-bust (§27.4)
`lib/tm_vp_i18n.js` muuttuu (uudet plain-avaimet + `vpTToimenpide`-häntäkartta jos sijoitat sen libiin) →
**bumppaa VP `tm_vp_i18n.js?v=4 → ?v=5`** (rivi ~19). version.json auto-bump mainissa (§33) — ei feature-haarassa.

## DoD (Vaihe 1.1)
- **Toimenpiteet-osio (section 05) sv-tilassa 100 % ruotsiksi**: otsikko + vihje · ryhmäotsikot (Brådskande/Planera) ·
  kaikki `teksti`-hännät (per-joukkue + aggregaatti) · korttinapit (Kvittera/Redigera/Avvisa) · "Visa alla N åtgärder →" ·
  tyhjätila · placeholderit · muokkausmodaali (otsikko/label/placeholder/napit) · kaikki toastit.
- **`teksti` pysyy fi:nä Firestoressa** (varmista: generointi ei kutsu vpT:tä; käännös vain renderissä).
- fi-regressio ehjä · en-fallback fi (tai additiivinen jos lisäät). Vitest: laajenna V1-testiä (häntäkartan avainkattavuus +
  `vpTToimenpide` prefix-säilytys + fi-fallback). `npm run lint` EXIT 0.

## Verifiointi (Claude, 4-kerrosportti)
1. Kielineutraali gate: Toimenpiteet-alijärjestelmästä (17287–17560 + ws-tilanne rivi ~2349) 0 reitittämätöntä näkyvää.
2. `vpTToimenpide` render-todiste: syöte `'SJK P12 — 3 pelaajaa alle Eerikkilä-tason (H-H < 2.5). Aloita yksilöllinen harjoitusohjelma.'`
   → sv `'SJK P12 — 3 spelare under Eerikkilä-nivå (H-H < 2,5). Starta ett individuellt träningsprogram.'` (prefix + luku säilyy).
3. Toast/alert/placeholder-audit (kuittaa/hylkää/muokkaa).
4. **Firestore-invariantti:** varmista headlessillä että generointi tallentaa fi-`teksti`:n (ei sv) — kielen ei saa vuotaa tietokantaan.

## Rajaus (EI V1.1:ssä)
V2–V7-näkymät. Demo-tilan Tilanne-tervehdys (Code raportoi V1:ssä — erillinen fake-data-polku, pieni lisä myöhemmin).
Vaihtoehto B (strukturoitu `{signaali,joukkue,n}` + skeema-migraatio) — vasta jos halutaan siistimpi malli erikseen.
