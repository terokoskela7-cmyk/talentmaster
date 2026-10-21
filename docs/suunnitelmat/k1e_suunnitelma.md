# K1e — pikkukorjaukset (erä 85)

Brief: `.briefit/CODE_BRIEF_KTP_VALMIIKSI_K4C_K4B_K1E.md` osio K1e. Kaista: **Tero** (muuttaa `*.html`, `sw_*.js`). Ei Rules-muutoksia, ei uusia kenttiä, ei uusia toimintoja.

## Muutokset

1. **Kaaviopankin "katselmus" → hyväksyntä / kommentit.** Kaavion elinkaari on luonnos → hyväksytty, eli kyse ei ole jakson yhteenvedosta eikä kehityskeskustelusta; D250:n termit eivät sovi, joten käytetään "hyväksyntä" ja "kommentit". Tiedostot: `lib/tm_kaavio_ui.js` (6 näkyvää tekstiä), `lib/tm_i18n_common.js` (vanhat avaimet + niiden sv poistetaan, koska fi muuttuu; orpo avain "…tarkentaa katselmuksessa" pois), `TalentMaster_Master_v16.html` + `TalentMaster_VP_v25.html` (sivupalkin tooltip).
2. **ADAR-koulutus: R = Reagointi.** `TalentMaster_ADAR_Koulutus.html`: vaihe "Palaudu" → "Reagoi" (kirjain R, otsikot, selitys, harjoituspainikkeet, muistisääntö, JS-vertailu). Selitys: miten pelaaja reagoi tilanteen jälkeen; fyysinen palautuminen rajataan ADARin ulkopuolelle. Sisäinen tunniste `J` ja CSS-luokat säilyvät. Sivu ei kulje i18n:n kautta → ei sv-rivejä. Lisäksi "IDP-tarkastelun" → "kehityssuunnitelman tarkastelun".
3. **Profiili 390: "Testattu 4.10. · 2 vk".** `lib/tm_todistekortit_fi.js` (`tc_viimeisin_testi` + 4 uutta lyhyttä ikäavainta `tc_ika_lyh_*`), `lib/tm_todistekortit.js` (`_ikaLyhyt`; yli 11 kk vanhalla mittauksella vuosi mukaan). Vanha sv-rivi `tc_viimeisin_testi` poistetaan `lib/tm_lib_i18n.js`:stä (fi muuttui).
4. **Sanastotesti laajemmaksi.** `tests/k1d_sanasto.test.js`: kaaviopankin poikkeukset pois (+ `tm_kaavio_ui`/`tm_kaavio_policy` skannauksen piiriin), ADAR-koulutus sivulistaan, uudet kiellot "Palaudu" ja "palautuminen" ADAR-yhteydessä (fyysinen palautuminen muualla sallittu); negatiivitestit. (Kehitystyöpöytä-sivu oli jo listalla: katselmus, review, IDP, Syvennä, MDT, raportointi.)

## Tekstierä 85 (sv TYHJÄ, PM kirjoittaa)
`scripts/i18n_luo_gemini_era85.mjs` → `docs/i18n/sv_kaannoserae_85_gemini.json`: 12 riviä (7 kaaviopankki: osio `yhteiset_kartta`; 5 Profiili: osio `lib.tm_todistekortit`). Erä 85 → `tools/i18n/sv_kattavuus.mjs` `ODOTTAVAT_ERAT`; 5 lib-avainta → `LIB_SV_ODOTTAA` (`tests/i18n_sv_era_lib.test.js`). Kaaviopankin uudet tekstit putoavat ruotsissa suomeen kunnes sv on viety. ADAR-koulutus ei tuota rivejä.

## Versiot
?v-nostot: `tm_todistekortit_fi` 5→6, `tm_todistekortit` 3→4, `tm_lib_i18n` 30→31, `tm_i18n_common` 15→16, `tm_kaavio_ui` 8→9; `node scripts/lib_versiot.js --kirjoita`. SW-cachet (§27.4): `sw_pelaaja` v148→149, `sw_vanhempi` v104→105, `sw_adar` v50→51 (lataavat tm_lib_i18n / tm_i18n_common). `tm_lang.js` ei muutu. Ei `version:bump`ia.

## Testaus
- Uusi `tests/k1e_pikkukorjaukset.test.js` (sanasto kaaviopankissa, ADAR R = Reagoi, "Testattu"-muodot, erä 85) ja `tests/k1e_profiili_selain.test.js` (Chrome, 390 ja 360 px: rivi yhdellä rivillä, ei vaakavieritystä).
- Päivitetyt: `k1d_sanasto`, `kaavio_entry_point`, `kaavio_nakyvyys_roolilukko`, `kaavio_valintamalli`, `k4a_todistekortit`, `k4a_profiili_selain`, `k4a2_selkokieli`, `i18n_sv_era_lib`.
- Kohdennetut testit, `npm run lint`, `lib_versiot` + `kuoret_kasvukatto`, koko `npx vitest run` kerran lopuksi.
- Kuvat (390, Topias-fixture/Demo FC): `docs/ui-kuvat/k1e/`.
