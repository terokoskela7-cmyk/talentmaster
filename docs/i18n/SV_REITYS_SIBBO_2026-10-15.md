# Sibbo-reititys (#1077:n jatko) — 15.10.2026

Kaista: **Tero** (HTML, `lib/`, `sw_*.js`, `scripts/`). Ei skeema-, Rules- eikä datamuutoksia. `functions/` ei muuttunut (functions-testejä ei ajettu). Code ei kirjoita ruotsia (§0): kaikki sv-rivit ovat Geminin palautuksista, uudet avaimet jäivät tyhjiksi erään 54.

## Mitä tehtiin (brief → toteutus)

| Brieffin kohta | Toteutus |
|---|---|
| Erän 53 vienti | `scripts/i18n_vie_sv_era53_19.cjs`: `lib.tm_kt_sivu` 15 + `lib.tm_kt_havainto` 14 → `TM_LIB_I18N`, `master_kartta` 8 → `TM_MASTER_I18N`, `kovakoodatut.harjoitusarviointi` 22 → `TM_LIB_I18N` (avain = fi-teksti), vientipohja 33 → `scripts/vientipohja_sv.json` (`i18n_vie_sv_vientipohja.cjs`), `kovakoodatut.suostumus` 23 → `tm_lang` (suostumus.*). Erät 43 ja 45 eivät ole erillisinä: ne olivat erässä 53 ja on nyt viety. |
| Erän 19 VP-rivit | Samassa skriptissä: palautuksen `vp_kartta` → `TM_VP_I18N` (42 riviä; raportin 37 + 5 joita `vpT`-poiminta ei näe). |
| Harjoitusarviointilomake | `lib/tm_harjoitusarviointi.js`: kaikki tekstit `_T()`:n kautta (`opts.t`); Master antaa `t: masterT`, VP `t: vpT`. Kriteeritaulut reititetään kulutuskohdassa. |
| Suostumuslomakkeen viestit | `TalentMaster_Rekisterointi_Suostumus.html`: 47 kohtaa `_st('suostumus.avain', 'alkuperäinen fi')`; 47 uutta `tm_lang`-avainta (fi + en + sv kun palautuksessa). Varateksti = alkuperäinen suomi → fi-tuloste ennallaan myös jos tm_lang on vanha välimuistissa. |
| Kehitystyöpöytä 8 riviä | 7 toastia olivat jo `TT()`-reitillä (skanneri ei tuntenut `TT`:tä); ikävaihe ("Leikkijä" …) kulkee nyt `tmKtKehysHTML`:n `opts.t`:n kautta kaikilla kolmella sivulla. |
| Kuittaus-aliakset | `scripts/vientipohja_kieli.js`: pudotusvalikon näyttöarvot (`kuit_ok/muutettu/poista`) kielitaulussa; **tallennettava arvo pysyy OK · Muutettu · Poista**. Tuonti hyväksyy kummankin kielen arvon (sekaisin käytettynä myös). Kunnes erä 54 on viety, sv-pohjassa näkyvät suomenkieliset arvot (valinnaiset tekstit, ei virhettä). |
| Erä 54 | `docs/i18n/sv_kaannoserae_54_gemini.json`, 65 riviä: tm_lang 24, `lib.tm_harjoitusarviointi` 34, `master_kartta` 3 (ikävaiheet), vientipohja 4 (kuittaus-aliakset + OHJE-rivi 5). Ei toista erän 53 rivejä (testi). |
| Cache-bumpit | `tm_lang.js` 39→40 (10 sivua) + `sw_pelaaja.js` v104→v105, `sw_vanhempi.js` v69→v70 · `tm_lib_i18n.js` 7→8 · `tm_master_i18n.js` 33→34 · `tm_vp_i18n.js` 95→96 · `tm_harjoitusarviointi.js` 6→7 · `tm_kehitystyopoyta.js` 31→32 · `lib_versiot*.json`. |

**"Näyttö"-termi:** Gemini käytti muotoa "Prestationen" (erä 53, Kehitystyöpöytä). Termistön päätetty muoto on **Prestation** (`termisto.fi-sv.json`, tila "sovittu"); "Prestationen" on sama sana määräisessä muodossa lauseessa → yhdenmukainen, ei korjattavaa.

## Pariteetti (fi-tuloste täsmälleen ennallaan) — `tests/sibbo_reititys.test.js`

- **Harjoitusarviointilomake:** renderöity HTML kuudella kokoonpanolla (malli A lapsuus/nuoruus, malli B itsearvio/havainnointi, ilman listoja, toggle) on **tavutarkasti sama** kuin alkuperäisellä libillä (sha256, `origin/main@d399475a`); `t` = identiteetti → sama HTML; merkkiadapterilla (`⟦…⟧`) jokainen näkyvä teksti kulkee `t()`:n läpi.
- **Suostumuslomake:** jokaisen `_st`-kutsun varateksti = `tm_lang.fi` = alkuperäinen teksti; kaikki 47 kohtaa katettu; staattinen skanneri 0 löydöstä. Sandbox-testit (`suostumus_vamma_antaja`, `_ilmoitus`, `_kovennus_v333`, `avoimet_kutsut`, `vaihe0_pr3_callablet`) ajavat funktiot oikeasti.
- **Vientipohja:** fi-xlsx sisällöltään identtinen refaktoroinnin jälkeen (hajautus puretusta zipistä; deflate-tavut vaihtelevat CI:ssä).

## Kattavuusraportti (ajettu uudelleen)

## Taulukko

| Näkymä | fi-avaimia | ok | puuttuu sv | odottaa palautusta (lähetetty erä) | palautettu, ei viety koodiin | kovakoodattu (staattinen; sv puuttuu / vain reititys) | kovakoodattu (ajonaik., UI) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Pelaaja_v7 | 718 | 718 | **0** | 0 | 0 | **0** (0 / 0) | 4 (+ data? 3) |
| Vanhempi_v2 | 416 | 416 | **0** | 0 | 0 | **0** (0 / 0) | 7 (+ data? 11) |
| Master_v16 (valmentaja) | 1659 | 1659 | **0** | 0 | 0 | **0** (0 / 0) | 15 (+ data? 16) |
| VP_v25 | 3328 | 3328 | **0** | 0 | 0 | **0** (0 / 0) | 15 (+ data? 7) |
| ADAR_Pikakortti + Pelihavainto_Kentta | 572 | 572 | **0** | 0 | 0 | **0** (0 / 0) | 1 (+ data? 0) |
| Harjoitusarviointi (lib/tm_harjoitusarviointi.js, Master + VP) | 62 | 28 | **0** | 34 | 0 | **0** (0 / 0) | – |
| Suostumus- ja kutsuflow (Rekisterointi_Suostumus, Huoltajakutsu) | 114 | 90 | **0** | 24 | 0 | **0** (0 / 0) | – |
| Toimintakortti + kasvupyrähdys-fysiikka (#1073–1075) | 119 | 119 | **0** | 0 | 0 | **0** (0 / 0) | – |
| Kehitystyöpöytä (Kehitystyopoyta.html) | 158 | 155 | **0** | 3 | 0 | **0** (0 / 0) | – |

_fi-avaimia = tm_lang-ryhmän / lib-FI-karttojen / reititinkartan (masterT, vpT, tmHT, phT) avaimet, jotka näkymä lataa. "odottaa" = rivi on lähetetyssä erässä (54), palautus puuttuu. Sama lib-avain voi näkyä usealla näkymällä._



Harjoitusarviointi, Suostumus ja Kehitystyöpöytä: **ok / odottaa erää 54, puuttuu 0, kovakoodattu 0**. "odottaa" = rivi on erässä 54 (lähettämättä vielä).

## Löydökset ja avoimet

1. **Suostumussivun vaihe 1 (Perustiedot) on STAATTISELTA osaltaan suomeksi sv-tilassa** — tämä ei kuulunut briefin 46 riviin, koska skanneri lukee vain JS-literaalit, ei HTML-markupia. Kuvissa `04-suostumus-*` ja `04b-*`: sivun otsikko ("Rekisteröinti ja Tietosuojasuostumus"), vaiheiden nimet, kenttien nimet ja placeholderit (Etunimi, Sukunimi, Sähköposti …), ryhmäotsikot ("Pelaajan tiedot", "Joukkue", "Biologisen iän arviointi" + selite, "Ei tiedossa", adoptiohuomautus), "Seuraava", PalloID-ohje, päivä/kuukausi-aria-labelit. Vaiheen 2 suostumusruudut (`suostumus.*` data-i18n, 25 avainta) ja tämän PR:n dynaamiset viestit ovat sv:nä (tai en-varalla, kohta 2). **Ehdotus:** oma pieni reititys-PR (data-i18n + noin 30 avainta, erä 55) ennen 1.11. — tämä on huoltajan ensimmäinen näkymä, ja ilman sitä sv-lomake on sekakielinen.
2. **sv→en→fi-varaketju:** `tm_lang`-avaimet joille sv puuttuu (24, erä 54) näkyvät sv-tilassa **englanniksi** kunnes erä 54 on viety (esim. "Fill in the required fields (marked *)" kuvassa 04b). Harjoitusarviointilomakkeen 34 riviä ja ikävaiheet jäävät **suomeksi** (libin/Masterin ketju ei käytä en-varaa).
3. **Läpiajo:** koko ajo uudelleen (virheitä 0). `--tarkista` raportoi 28 baselinen ulkopuolista suomenkielistä tekstiä; ne ovat pääosin demo-dataa ("Joukkueharjoitus", "Nopeustestit", "Inställt: …"-ilmoitukset), jotka näkyvät nyt koska huoltajan etusivu enää ei kaadu (#1077). Baselinea ei päivitetty.
4. Kuittaus-aliasten OHJE-rivi 5 (`ohje_5v`) tulee erästä 54; siihen asti sv-OHJE mainitsee suomenkieliset arvot (sopii, koska pudotusvalikossa on samat).

## Kuvat

`docs/ui-kuvat/sibbo-sv/` (24 WebP, 390/1280, tumma; VP/Master myös vaalea): `07-harjoitusarviointi-*` (lomake nyt pääosin sv; jäljellä erän 54 rivit) ja `04-suostumus-*` + uusi `04b-suostumus-validointiviesti-*` (dynaaminen toast). `index.md`, `jaanteet.json`.

## Seuraavat (kun erä 54 palaa)

`.sv_palautukset/sv_kaannoserae_54_palautus.json` → vienti: tm_lang (24), `TM_LIB_I18N` (34, avain = fi-teksti), `TM_MASTER_I18N` (3), `scripts/vientipohja_sv.json` (4: kuittaus-aliakset + ohje_5v). Odotuslistat (`tm_lang_sv_odotuslista.cjs`, `i18n_sv_era_lib.test.js`) tyhjenevät samalla.
