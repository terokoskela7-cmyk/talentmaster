# TM-kielivahti · Vaihe 0 — Kartoitus (fi + sv)

**Tyyppi:** pelkkä kartta. Ei korjauksia, ei sovelluskoodin muutoksia.
**Pohja:** `origin/main` a6129f20 (8.10.2026). **Kaista:** Tero (config + docs; ei sovelluskoodia).
**Tuotokset:** tämä tiedosto · `tools/i18n/kielivahti.config.json` · `docs/i18n/termisto.fi-sv.json` · `docs/i18n/kartoitus-puutteet.json` (täydet puutelistat, koneluettava).

> **Hyväksymiskriteeri — vastaus Teron kysymykseen "montako avainta puuttuu sv:stä tänään ja missä":**
> **58** tm_lang-avainta (kaikki tunnettuja, odotuslistalla) · **~258** sovellusliittymän suomenkielistä literaalia, joilla ei ole sv-riviä (VP 193 + Master 65) · **5** `data-i18n`-otsikkoa (VP 3 + Master 2) · **317** libien fi-oletusavainta, joille ei ole sv-reittiä lainkaan.
> Luvut ovat *yläraja-arvioita* (regex-poiminta; menetelmä §8). Suurin yksittäinen löydös on kuitenkin rakenteellinen, ei määrällinen: **§5 — libien tekstit eivät käänny ruotsiksi missään sovelluksessa.**

---

## 1. Tiivistys

| # | Lähdetyyppi (purkaja) | Tiedostot | Kielet | Avaimia fi | sv | Puuttuu sv | Tila |
|---|---|---|---|---:|---:|---:|---|
| 1 | `tm_lang` — sisäkkäinen objekti | `lib/tm_lang.js` | fi · sv · en | 635 | 577 | **58** | kaikki odotuslistalla (`tests/tm_lang_sv_odotuslista.cjs`) |
| 2a | `merkkijonokartta` — jaettu henkilöstö | `lib/tm_i18n_common.js` | sv · en | (avain = fi-teksti) | 205 | — | gate: ei päällekkäisyyttä sivukarttojen kanssa |
| 2b | `merkkijonokartta` — VP_v25 | `lib/tm_vp_i18n.js` | sv · en | 2 606 reititettyä literaalia | 3 248 | **193** | gate vain kuratoiduilla rivialueilla (`RANGES`) |
| 2c | `merkkijonokartta` — Master_v16 | `lib/tm_master_i18n.js` | sv · en | 1 056 reititettyä literaalia | 1 406 | **65** | gate (`i18n_master_kaantamattomat`) |
| 3 | `lib_fi` — fi-oletusmapit libeissä | 9 libiä | vain fi | 317 | **0 (ei reittiä)** | **317** | ei gatea, ei sv-polkua |
| 4 | `harjoite_i18n` | `harjoitelogiikka_v4.js` | fi (kooditeksti) · sv | — | 346 lehteä | ei mitattu | oma getter-kerros |
| 5 | `curriculum_sidecar` | `lib/tm_teknistaktiset_sv.js` | sv | 1 261 | 1 261 | 0 | 100 %; **render-kytkentä tekemättä** (Vaihe B, oma erä) |
| 6 | Gemini-odotuslistat | `docs/*_SV_KAANNOKSET.md` | — | — | — | (R1 ~39 + R6.4 100 avainta, PR:ssä) | käsin ylläpidetty |

`en` on tm_lang:ssa täydellinen (635/635) ja kartoissa "myöhemmin" — **en ei kuulu tähän vaiheeseen**; locales-lista on kuitenkin yleinen (`["fi","sv"]`), joten en = yksi rivi lisää.

---

## 2. Lähdetyyppi 1 — `tm_lang` (pelaaja, perhe, seura, suostumus)

**Rakenne:** `lib/tm_lang.js` → `const TM_LANG = { fi:{ ryhmä:{ avain:'…' } }, sv:{…}, en:{…} }`. Avain = pisteytetty polku (`vanhempi.koti_otsikko`). Haku `t('polku')`, fallback sv → en → fi. Muuttujat `{nimi}`.

**Käyttökohdat:** Pelaaja_v7 `T()` / `_p7K1T` (`pelaaja.*`, 109 avainta) · Vanhempi_v2 `t('vanhempi.*')` (258) · Seura `data-tm-k` (16 elementtiä, `seura.*` 41) · Rekisteröinti/Suostumus `data-i18n="suostumus.*"` (32) · Pelihavainto_Kentta `data-i18n` (18, fi-teksti-avaimia → jaettu kartta).

| Ryhmä | fi | sv | puuttuu |
|---|---:|---:|---:|
| yleiset · auth · nav · joukkueet · pelaajat · mittarit · kortti · kaavio · konseptikortti · rekisterointi · henkilosto · yhteenveto · email | 173 | 173 | 0 |
| `seura` | 41 | 31 | 10 |
| `suostumus` | 41 | 35 | 6 |
| `alusta` (§22-alustasanasto) | 13 | **0** | 13 |
| `pelaaja` | 109 | 95 | 14 |
| `vanhempi` | 258 | 243 | 15 |
| **Yhteensä** | **635** | **577** | **58** |

- Kaikki 58 ovat `tests/tm_lang_sv_odotuslista.cjs`:ssä (nimetty "odottaa Geminiä"); testi `tm_lang_sv_odotuslista.test.js` pitää listan elävänä. **Vaihe A:n pitää käyttää tätä listaa "tunnettuina puutteina"**, ei kaataa CI:tä sen vuoksi.
- `alusta.*` — koko ryhmä (13) ilman sv:tä: näkyy kortin alustanimessä.
- **Placeholder-erot (7 avainta, tarkoituksellisia):** `{gen}` (suomen genetiivi) puuttuu sv/en-teksteistä V1-B2-säännön mukaan (`vanhempi.kortti_matka_otsikko`, `huoltaja_otsikko`, `hero_tyhja`, `synttari_tanaan`, `synttari_viikolla`, `tek_mittaukset_tulossa`, `tek_vahvin_laji`). **Vaihe A:n muuttujavertailu ei saa merkitä näitä virheeksi** → `{gen}` sallittu fi-only-muuttuja. Lisäksi `vanhempi.kirj_jakoteksti` on odotuslistalla koska Geminin sv käytti `{gen}`:ia.
- Sv identtinen fi:n kanssa vain kahdessa: `yleiset.sovellus_nimi`, `kortti.streak` (molemmat oikein).
- Tyhjiä sv-arvoja: 0. Ylimääräisiä sv-avaimia (ei fi:ssä): 0.

## 3. Lähdetyyppi 2 — merkkijonokartat (VP, Master, jaettu)

**Rakenne:** `var TM_VP_I18N = { sv:{ 'fi-teksti': 'sv-teksti' }, en:{…} }` (sama Master/common). **Ei fi-lohkoa — avain ON suomenkielinen teksti.** Haku `vpT('…')` / `masterT('…')`; DOM-elementit `data-i18n="…"` / `data-i18n-title="…"` (`vpLokalisoi` / `masterLokalisoi`). Puuttuva rivi → fi-fallback (hiljainen).

| Kartta | sv-rivejä | sv=avain (identtinen) | tyhjä | Sovelluksen reititetyt literaalit | Ilman sv-riviä |
|---|---:|---:|---:|---:|---:|
| `TM_I18N_COMMON` | 205 | 1 | 0 | — | — |
| `TM_VP_I18N` | 3 248 | 26 | 1 | 2 606 | **193** |
| `TM_MASTER_I18N` | 1 406 | 18 | 0 | 1 056 | **65** |

- **Tästä seuraa:** merkkijonokartan puute **ei näy kartasta itsestään** (kartta ei tiedä, mitä sovellus kysyy). Purkajan pitää poimia sovelluksen literaalit (`vpT('…')`, `masterT('…')`, `data-i18n`) ja verrata karttaan — tämä on Vaihe A:n vaikein purkaja (iso HTML; template literalit ja konkatenaatio tuottavat puolikkaita literaaleja).
- **Nykyiset 193 + 65** (täysi lista `kartoitus-puutteet.json`): pääosin viimeisimpien ominaisuuksien tekstejä (ryhmät, mediaviesti/viestit, jakson aloitus, ydinvahvuus — esim. "Jakso nyt", "Aloita jakso Polussa …", "Viesti pelaajalle", "Ydinvahvuus", "Havainnot ja viestit"). Joukossa on joitain koodinpätkiä, jotka regex poimi (suodatettu pois ilmeisimmät).
- **`data-i18n` ilman sv:tä:** VP 3 ("Ryhmät", "⭐ Underdog", "Maalivahdit, talenttiryhmä ja muut ryhmät joukkueiden yli") · Master 2 ("＋ klippi", "Ottelutarkkailut").
- **Olemassa oleva gate on osittainen:** `tests/idp_i18n_v5_vp_render_dom.test.js` (resolvi-portti) tarkistaa vain kuratoidut `RANGES`-rivialueet ja `i18n_master_kaantamattomat` vain Masterin render-JS:n. Uusi koodi näiden ulkopuolella ei ole vahdissa → siksi 193/65.
- **VP- ja Master-kartta ovat osin kopioita:** 385 samaa fi-avainta molemmissa kartoissa, joista **110:lla sv eroaa** (esim. "✓ Käytä jaksossa" → *Använd i perioden* vs *Använd i period*; "Tallenna review" → *Spara granskning* vs *Spara review*; "(demo — ei kirjoitettu)" → *ej skrivet* vs *inte skriven*). Dedupe-invariantti suojaa vain common × sivukartta, ei VP × Master. Täysi lista `kartoitus-puutteet.json` → `vp_ja_master_kartoissa_eri_sv`.

## 4. Lähdetyyppi 4–5 — harjoitesisältö ja curriculum

- **`HARJOITE_I18N.sv`** (`harjoitelogiikka_v4.js`, root = ainoa totuus): kartat `sisalto` 130 · `pelaaja` 183 · `miksi_*` 23 · `kohde_otsikko` 5 · `kohde_nimet` 5 → 346 lehteä. Rakenne on fi-teksti → sv + getterit (`k !== 'fi' && HARJOITE_I18N[k]`); puuttuva → fi. Puutteita ei mitattu tässä vaiheessa (vaatii harjoitepankin literaalien poiminnan).
- **Curriculum** (`lib/tm_teknistaktiset.js` → `lib/tm_teknistaktiset_sv.js`, putki `scripts/i18n_curriculum.cjs`, README `docs/i18n/README.md`): **1 261 / 1 261 käännetty** (rikssvenska); portti `i18n_curriculum_sidecar`. **Render-kytkentä on tekemättä** (oma erä) — eli käännökset ovat olemassa, mutta kenttä ei vielä näytä niitä.

## 5. Lähdetyyppi 3 — libien fi-oletusmapit (**päälöydös**)

Libit (`lib/tm_*.js`) ovat puhtaita ja kielineutraaleja: ne sisältävät `var FI = { avain:'fi-oletus' }` ja hakevat tekstin `opts.t(avain)` → adapteri → fi-oletus. **9 libiä, 317 avainta:**

| Lib | Avaimia | Ladataan sovelluksissa |
|---|---:|---|
| `tm_mediaviesti.js` | 100 | Master, VP |
| `tm_ryhmat.js` | 39 | VP |
| `tm_reitin_valinta.js` | 40 | Master, VP, Pelaaja |
| `tm_kevyt_katselmus.js` | 37 | Master, VP |
| `tm_kehitystyopoyta.js` | 31 | Master, VP |
| `tm_tanaan_signaali.js` | 27 | Master, VP |
| `tm_viikkokatsaus.js` | 24 | Master, VP, Pelaaja |
| `tm_tanaan_kentta.js` | 16 | Master, VP, Pelaaja |
| `tm_taman_tueksi.js` | 3 | Master, VP, Pelaaja |

**Ongelma (varmistettu ajamalla):** adapterit välittävät libille `t: vpT` / `t: masterT` / `_p7K1T` ja libi kysyy **avaimella** (`ts_kuorma`, `mv_otsikko`). Mutta kartat on avainnettu **fi-tekstillä**, eivät avaimella → `vpT('ts_kuorma')` palauttaa sv-tilassakin `ts_kuorma` → libi putoaa fi-oletukseen. Pelaajassa `_p7K1T('k4_…')` → `t('pelaaja.k4_…')` → tm_lang:ssa ei ole riviä. **Tulos: kaikki 317 libiteksti näkyy suomeksi sv-käyttäjälle** — mukaan lukien Pelaajan Tänään-kortit (K1–K4), reitin valinta ja kaikki uudet ominaisuudet (R1, R6.4). Mikään gate ei näe tätä, koska avaimet eivät esiinny missään kartassa.

Lisäksi PR #888 tuo uuden libin `tm_klippi_perhe.js` (+34 avainta, Pelaaja + Vanhempi) ja #887 laajentaa `tm_ryhmat.js`:ää — samalla puutteella.

> **PÄÄTÖS A RATKAISTU 8.10.2026 → vaihtoehto 2 (jaettu `lib/tm_lib_i18n.js`), toteutettu sv-käännöserän viennissä (`docs/CODE_BRIEF_I18N_SV_ERA_2026-10-08.md`, `scripts/i18n_vie_sv_era.cjs`).** Adapterit (`vpT`, `masterT`, Pelaaja `_p7K1T`, Vanhempi `_vKpT`) katsovat karttaa ensin (`tmLibT`); portti `tests/i18n_sv_era_lib.test.js`. Alla alkuperäinen perustelu.

**Avoin päätös A (Teron/PM:n ennen Vaihe A:ta):** missä libien sv-rivit asuvat?
1. *Avainrivit karttoihin* — `'mv_otsikko': 'Lägg till klipp'` suoraan `tm_vp_i18n.js` / `tm_master_i18n.js` / `tm_lang.js` (`pelaaja.<avain>`, `vanhempi.<avain>`). Nolla koodimuutosta libeihin; sama rivi monistuu 3–4 karttaan.
2. *Yksi jaettu libikartta* (`tm_lib_i18n.js`, `TM_LIB_I18N.sv`, avain = lib-avain) + adapterit hakevat siitä. Yksi paikka; vaatii adapterimuutoksen.
3. *Libi kantaa itse sv:n* (`SV = {…}` libissä) — rikkoo "Code ei kirjoita ruotsia" -periaatteen työnkulun (Gemini-erä muokkaisi lib-tiedostoja).
Kielivahti-purkaja `lib_fi` toteutetaan vasta valinnan jälkeen; konfigissa tyyppi on jo varattu.

## 6. Merkintä- ja termistökäytäntö nykyisessä koodissa

- **Odotuslistamekanismi on jo olemassa** (tm_lang: `tests/tm_lang_sv_odotuslista.cjs`). Kielivahdin `⟨SV⟩`-paikkamerkki on *uusi* — nykyiset kartat eivät tunne sitä (`⟨SV⟩`-merkittyjä rivejä: **0** kaikissa kartoissa). Vaihe A:n pitää hyväksyä sekä odotuslista että `⟨SV⟩`; Vaihe B/C voi myöhemmin yhtenäistää.
- **Termistö** (`docs/i18n/termisto.fi-sv.json`): 49 termiä löytyi jo molemmilla kielillä (sovittu 43, **ristiriita 6**), 36 domeenitermiä ilman sv-vastinetta koodissa (mm. Kausitavoite, X-Factor, Hidden Gem, Ydinvahvuus, Vahvuus, Reitti, Ryhmä, Talenttiohjelma, Vastuuhenkilö, Klippi).
  - **Ristiriidat (päätettävä ennen Gemini-erää):** *Seura* (förening / Klubben / Klubb) · *Valmennuspäällikkö* (Fotbollsutvecklare [kanoni V8] vs tm_lang `henkilosto.roolit.vp` = Träningschef) · *Urheilutoimenjohtaja* (Sportchef / Idrottschef) · *Fysiikkavalmentaja* (Fystränare / Fysträner) · *Kehityskaari* (Utvecklingsbåge / Utvecklingskurva) · *Tänään* (Idag / i dag).
  - **"ase" ei ole termistössä:** briiffin esimerkkilistassa mainittu "ase" on poistettu sanasto (D54, 5.10.2026: henkilökunta "ydinvahvuus", pelaaja/huoltaja "vahvuus"). Termistö kirjaa sen `kielletyt`-listalle.

## 7. Konfiguraatio (`tools/i18n/kielivahti.config.json`)

- `locales: ["fi","sv"]`, `source: "fi"` — kielet lista; en = yksi rivi.
- `kohteet: [{ glob, tyyppi }]` — 7 kohdetta, tyypit: `tm_lang` · `merkkijonokartta` (+ `lukija` joka kertoo, mistä HTML:stä literaalit poimitaan) · `lib_fi` · `harjoite_i18n` · `curriculum_sidecar`. Jokaisella tyypillä on `tyypit.<nimi>`-kuvaus, jonka Vaihe A:n purkaja toteuttaa.
- `tunnetutPuutteet.tm_lang` osoittaa olemassa olevaan odotuslistaan; `paikkamerkki` määrittelee `⟨SV⟩`-muodon; `ohita` rajaa `archive/`, `docs/`, `tests/`.
- `rajaukset`: D16 (seurojen oma valmennuslinja = dataa) ja reitittämätön kovakoodattu suomi (ei mitattavissa ilman AST-skannausta) eivät ole piirissä.

## 8. Menetelmä ja rajaukset (uusinta)

Luvut on laskettu kertaluonteisella Node-skriptillä (`vm`-ajo kartoille; regex `vpT('…')`/`masterT('…')`/`data-i18n="…"` HTML:stä; skripti ei ole repossa, Vaihe A:n `tarkista.mjs` korvaa sen). Rajaukset:
- **VP/Master-puutteet ovat yläraja-arvioita:** regex voi poimia puolikkaita literaaleja (konkatenaatio) ja koodinpätkiä; toisaalta se ei näe dynaamisesti muodostettuja avaimia (`vpT(muuttuja)`).
- **Reitittämätön kovakoodattu suomi** (esim. Pelaaja_v7:n renderöintikoodissa, joka ei käytä `T()`:tä) ei näy missään luvussa. Pelaaja_v7:ssä on vain 12 suoraa `t()/T()`-kutsua ja Vanhempi_v2:ssa 31 — suurin osa näkymästä on joko lib-tekstiä (§5) tai kovakoodattua. Tämän mittaaminen on oma työnsä.
- Ei oikeaa pelaajadataa missään tuotoksessa (vain käyttöliittymätekstit).
- Ei korjauksia. Seuraava vaihe (A) vasta, kun tämä on mergetty ja Tero on katsonut luvut.

## 9. Ehdotus Vaihe A:lle (tämän kartan perusteella)

1. **Purkajat tyypeittäin** kuten `tyypit`; aloita `tm_lang` (helppo, 58 tunnettua puutetta) ja `merkkijonokartta`; `lib_fi` vasta kun päätös A on tehty.
2. `{gen}`-poikkeus muuttujavertailuun; odotuslista = "tunnettu puute" (varoitus).
3. **Ensimmäinen CI-vihreä** vaatii joko (a) puutteiden korjauksen (58 + ~258 + 5) erillisinä PR:inä tai (b) baseline-tiedoston ("tunnetut puutteet") josta vain *uudet* puutteet kaatavat CI:n — suosittelen (b) ja korjaus vaiheittain.
4. VP × Master -kartan 110 eroavaa riviä: yhtenäistä erikseen (Gemini/Tero), älä Vaihe A:ssa.
