# sv-läpiajo · PR 3 — Master (Master_v16 + jakson tilakone + curriculum + päivämääräapuri)

Kaista: Tero (koskee `*.html`, `functions/`-kopiota) · 8.10.2026 · päätökset #902/#903 (Tero).

## 1. Tulos
| | ennen | nyt |
|---|---|---|
| Master sv-läpiajo, uniikkeja suomenkielisiä tekstejä | 109 (ui 83, data? 26) | **37** (ui 18, data? 19) — kaikki jäljellä olevat: sv-rivi odottaa Gemini-erää (osio `master_kartta`), demo-henkilöiden/paikkojen nimet tai demo-lainaukset |
| fi-renderöinti (14 Master-näkymää, 1543 tekstiä, `--kieli=fi --dump`) | — | **byte-identtinen** origin/mainiin nähden |
| Gemini-erä 2 | 467 riviä | 541 (+72, osio `master_kartta`) |
| Staattinen portti | Pelaaja + Vanhempi | **+ Master_v16** (`tests/i18n_reititys_portti.test.js`) |
| CI | | `npm test` 7414 ✓ · functions ✓ · lint ✓ (paikallisesti, kunkin paluuarvo tarkistettu) |

## 2. Mitä tehtiin
* **Päivämääräapuri** `tmPvmLocale(kieli)` / `tmPvmFmt(d, muoto, kieli)` (`lib/tm_lang.js`): fi→`fi-FI` (ennallaan), sv→`sv-FI`, en→`en-GB`. Vanhempi_v2: 3 kohtaa (viikkorivit, päivä, viikonpäivälyhenne). **Master ei käytä `toLocaleDateString`ia lainkaan** (päivät kulkevat `masterT`-avaimilla: kuukaudet/viikonpäivät) → apuria ei tarvittu siellä. Jäljellä `fi-FI`: VP 9, Seura 4, muut sivut → PR 4.
* **Jakson tilakone** (`lib/tm_aloita_jakso.js`, kopio `functions/`): `teksti` (fi) ennallaan palvelimelle/S1:lle. Yhdistelmätekstit (`Jakso käynnissä · vk n/yht`, `Pelaaja valitsi X`) saivat käännettävän mallin (`muoto`+`arvot`), ja `tmJaksoTeksti(rivitila, t)` kääntää sen. Kuluttajat: kehitystyöpöytä (otsikkorivi + Tänään), joukkoaloitus.
* **Curriculum-sidecar Masteriin** (`lib/tm_tt_sv_valinta.js`, uusi, pure + testattu): kielivalinta **vain näyttöön**. Kirjoituspolut (`jaksofokus.konsepti_nimi`, `syote`, Firestore) käyttävät edelleen fi-funktioita `_mTtItems`/`_mKonseptiByAvain` → ruotsi ei vuoda dataan (testi lukitsee). Seuran oma teksti (`_seura_kentat`) ei käänny. Klippi/kehityskeskustelu-`osat` jätettiin fi:ksi tarkoituksella (voivat päätyä tallennettuun dataan).
* **Masterin reititys** (~140 kohtaa `masterT`): Tänään (toimenpiteet, mittarit, signaali, ADAR-syöte), Kehitys (narratiivi, pinfo), Kausi (säsong), Kalenteri (demo-tapahtumat, omatoiminen-kortit), Testit (protokollanimet), toastit, lataustekstit, modaalit (ohjelmaeditori, sulje jakso, IDP-review), valmentajan kehitys (oma arviointi, CPD), kausi-pelaajalista, drill-signaali, `syy`-koodit, toastin "Peru". Staattinen HTML: `data-i18n`, uusi **`data-i18n-aria`** (jaettu sweep `tm_i18n_common.js`).
* **Sallitut (perusteltu `tools/i18n/sv_staattinen_sallitut.json`)**: datataulukot jotka reititetään kulutuskohdassa (DEMO, PROTOKOLLAT, CP_BASE, …) — rakenne lukittu `tests/i18n_master_pr3_reititys.test.js`:ssä; Excel-pohjan sisältö (`_generoiExcel`, odottaa Excel-päätöstä (1)/(2), sarakeotsikot ovat tuonnin avaimia §7.19).

## 3. Päätettävää / huomioitavaa
1. **Gemini-erä 2** sisältää nyt Masterin 72 riviä (osio `master_kartta`, osa lauseen paloja: `" pelaajaa vahvistettu"`, `"Seuraava fokus ("`). Vienti Masterin karttaan: `scripts/i18n_vie_sv_era.cjs` tukee `master_kartta`-osiota (tarkista osionimi erä 2:n vientiä varten). Kunnes sv saapuu, nämä näkyvät sv-tilassa suomeksi (Masterissa ei en-fallbackia).
2. `#sbRole`-oletusteksti "Valmentaja" (demo) jätettiin: `data-i18n` ylikirjoittaisi kielenvaihdossa oikean roolin (esim. Super Admin). Oikea kirjautuminen asettaa roolin `masterT`:llä.
3. Demo-paikannimet (Kokkolan jalkapallostadion, Eteläkenttä) ja -henkilöt ovat dataa → ei käännetä.
4. Cache-bumppi: `tm_lang` v35 (7 sivua), `tm_i18n_common` v11, `tm_aloita_jakso` v10, `tm_kehitystyopoyta` v4, `tm_joukkoaloitus` v4; SW `tm-pelaaja-v84`, `tm-vanhempi-v55`, `tm-adar-v12`.
5. Deploy: `functions/tm_aloita_jakso.js` muuttuu (identtinen lib-kopio, ei toiminnallista eroa `teksti`-kentissä; lisäkentät `muoto`/`arvot`) → functions-deploy ok mutta ei pakollinen.
