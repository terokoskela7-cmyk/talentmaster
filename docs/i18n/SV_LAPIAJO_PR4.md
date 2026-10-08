# sv-läpiajo PR 4 — ADAR, Pelihavainto, VP ja Seura (kaista: Tero)

Brief: `docs/CODE_BRIEF_I18N_SV_LAPIAJO.md` + PM-lisäys 8.10. Code ei kirjoita ruotsia; uudet avaimet ovat odotuslistalla (Gemini-erä 2).

## Mitä tehtiin
| Alue | Tulos |
|---|---|
| **ADAR-pikakortti** | Kaikki ulottuvuustekstit (kysymykset, tasokuvaukset, vinkit, vaihtoehdot, verbit, partitiivit, ikävaihe-selitteet) → `lib/tm_adar_tekstit.js` (FI-kartta, polkuavaimet `adar_A_q`, `adar_A_d1` …; sv `tmLibT`-reittiä). Nimet `tmAdarNimet('valmentaja', tmLibT)` = sama kanoni kuin pelaajalla/vanhemmalla. Kieli seuran asetuksesta (`_adarKieliAlusta` → `tmKieliInitSeura`). Staattinen skanneri: 0 reitittämätöntä. `sw_adar.js` allowlist + cache `tm-adar-v13`. Bundler-template: ADAR-tiedostossa ei ole bundler-templatea (ei `__bundler`-lohkoa), §7.10 ei kosketa. fi-teksti todennettu alkuperäisiä vasten (`tests/fixtures/adar_ph_tekstit_alkup.json`). |
| **Pelihavainto_Kentta** | `phT` osoittaa jaettuun `tmHT`-karttaan (`lib/tm_henkilosto_i18n.js`); kieli seuran asetuksesta. |
| **Master Ottelutarkkailut** | Jo reititetty PR 3:ssa (`masterT`); mitattu: 0 reitittämätöntä. |
| **VP_v25** | 307 → 0 reitittämätöntä (ei-sallitun). ~190 `vpT`-reititystä (codemod `--tekstiavain` + käsin: kulutuskohtareititys taulukoille `_PHV_LABEL`, `_VP_POS_NIMI`, `_ONB_VP`, `_VP_OHJ_PHV_NIMI` …; Teron 8.10. löydökset: **Kirjaa kentällä, pikakirjaus (Pikakirjaus-kortin kuvaus), Excel-pohja, tester-rivit** reititetty). Allowlist perusteluin: demo-data, Firestoreen tallennettavat toimenpidetekstit (invariantti, ks. alla), logiikka-avaimet. |
| **Seura** | 605 → 159 reitittämätöntä (`tmHT`, 458 reititystä + `_tk` tunnistettu reitittimeksi). Päätös 1.10.: Seurahallinta pysyy suomeksi → **kielenvaihtoa EI kytketty** (`tmKieliInitSeura` ei kutsuta); reititys valmistaa sivun sv:lle, kun päätös muuttuu. Jäännös 159 riviä: `docs/i18n/seura_reitittamatta_jaljella.tsv` (suurin osa lauseen paloja joissa sisällä muuttujia → vaativat käsin tehtävän paikkamerkkiavaimen; ei allowlistattu). Kasvukatto-testi: jäännös saa vain pienentyä. |

## Korjaukset, jotka testit nappasivat (koodin virheet, ei vain harness)
- `tarkista`/`dedupToimenpiteet`: codemod oli kietonut Firestoreen TALLENNETTAVAN toimenpiteen tekstin `vpT`:hen (invariantti `idp_i18n_v5_vp_vaihe1`: generointipolku ei kutsu vpT). Palautettu fi:ksi.
- `_jaPelipaikkaSyvyys`: logiikka-avain `'Keskikenttä'` oli reititetty (vertailu `_JA_POSRYHMA`-arvoihin olisi rikkoutunut sv:ssä). Palautettu; näyttö reititetään kulutuskohdassa `vpT(r.ryhma)`.
- Seura: `huomio: 'Kumottu kirjaus'` (tallennettu data) ja Excel-`etsiSarake`-otsikot palautettu fi:ksi; `_tk(avain, fi)` -fallbackit eivät tuplareititetä.
- Codemodin markup-katkelmat avaimina (`'" onclick=…'`, `'= keskustelun avaus…'`) korjattu käsin lause-avaimiksi paikkamerkein.

## "spelobservation väärässä paikassa" (Teron 8.10. löydös)
Rivit ja käyttökohdat: `docs/i18n/spelobservation_rivit.tsv` (52 riviä: kartta · fi-avain · sv · käyttökohdat tiedosto:rivi). Havainto: *pelihavainto* tarkoittaa koodissa kahta eri asiaa — (1) peliäly/D4:n lähde (ADAR-havainto, "Pelihavainto 30%", "Peliäly · pelihavainto (ADAR 1–3)") ja (2) **kenttätyökalun nimi** ("Avaa Pelihavainto", "· Pelihavainto", Pelihavainto-valinta). Kaikki on käännetty samalla sanalla *spelobservation*, joten työkalun nimi ja arviointilähde sekoittuvat. Korjaus tulee Gemini-erässä: termistöön lisätty `Pelihavainto`, `Otteluhavainnointi`, `Ottelutarkkailu` (+ ADAR-termit) — Gemini päättää erottelun; rivit 52 kpl ovat vp_kartta/master-kartassa jo käännettyinä, joten ne korvataan vasta viennissä (Tero hyväksyy ennen).

## Gemini-erä 2 (`docs/i18n/sv_kaannoserae_2.json`) — 1331 riviä, sv tyhjä
`tm_lang` 418 · `lib_adar_nimet` 8 · `lib.rubriikit` 35 · `lib.tm_kentta` 8 · `master_kartta` 72 · **`vp_kartta` 69 · `henkilosto_kartta` 490 · `lib.tm_adar_tekstit` 60 · `lib.tm_pelihavainto_valinta` 5 · `lib.tm_havaintohistoria` 5 · `lib.tm_tanaan_signaali` 1 (ts_otsikko)** · jäännökset: **`jaannos.seura_forening` 48** (Klubb→Förening; nykyinen_sv viitteeksi) · **`jaannos.kausifokus` 4** (Kehityskaari (kausifokus)) · **`jaannos.vp_master` 108** (sama fi eri sv:llä VP:ssä ja Masterissa; briiffissä 110; mitattu nyt 108 — eron syytä ei selvitetty). Termistölisäykset `termisto.kaannettava`: Havainnointi · Päätös / Päätöksenteko · Toteutus · Palautuminen · Pelihavainto · Otteluhavainnointi · Ottelutarkkailu. Generaattori: `node scripts/i18n_luo_gemini_era.cjs` (idempotentti; kattavuus lukittu `tests/i18n_pr4_henkilosto.test.js` + `tests/i18n_gemini_era2.test.js`). S1.1:n 15 riviä (`sv_kaannoserae_s11.json`) pysyvät omana tiedostonaan (2 päällekkäistä riviä).
**Vienti:** `jaannos.*`-osioiden vienti (ylikirjoittaa olemassa olevan sv:n) ja `henkilosto_kartta`/`lib.tm_*`-osiot tehdään vasta Geminin paluun jälkeen (`scripts/i18n_vie_sv_era.cjs`-laajennus); osioiden `_konteksti` ja `kohde`-kentät kertovat kohdekartan. Tämä PR ei vie ruotsia koodiin.

## Luvut (komento · tulos)
| Ajo | Tulos |
|---|---|
| `npm run lint` | exit 0 |
| `TM_CHROME_TESTS=0 npm test` (juuri) | exit 0 · 391 tiedostoa · **7512 läpi**, 5 skip (ennen: 7442 läpi + 70 kaatui harnessien/koodin takia kun reititys oli tehty — korjattu, ks. yllä) |
| `functions/ npm test` | exit 0 · 166/166 |
| `npm run test:rules` (Java 21) | exit 0 · 710/710 |
| `node scripts/sync_functions_lib.js --tarkista` | exit 0 · kopiot ajan tasalla (5) |
| Staattinen skanneri (reitittämätöntä fi:tä) | VP 307 → 0 · ADAR 115 → 0 · Pelihavainto 94 → 0 (phT) · **Seura 605 → 159** |
| sv-läpiajo (`tools/i18n/sv_lapiajo.mjs`, demo-data, 64 näkymää) | uniikkeja fi-tekstejä sv-tilassa **184 → 171** (PR 4:n osuus; committed baseline 258 oli ennen PR 3:a). VP 37→28, ADAR 14→11; Seura/Pelihavainto ennallaan koska sv-kartta on tyhjä kunnes Gemini-erä viedään — sv-tila näyttää oikein fi-fallbackin. virheet [] |
| fi-regressio (`--kieli=fi --dump`, origin/main vs haara, 64 näkymää) | **0 eroa** kaikissa näkymissä |

Huom: ruotsi ei vielä muutu käyttäjälle ADARissa/Seurassa/Pelihavainnossa — tämä PR valmistaa reitityksen ja erän; sv ilmestyy kun erä viedään (Tero ajaa käsikokeilun ennen 1.11.).
