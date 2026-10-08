# sv-läpiajo · PR 2 — perheet (Pelaaja_v7 + Vanhempi_v2)

Kaista: Tero · 8.10.2026 · brief `docs/CODE_BRIEF_I18N_SV_LAPIAJO.md` (PR 2) · päätökset Tero 8.10.

## 1. Tulos lyhyesti

| | ennen (PR 1:n mittaus) | nyt |
|---|---|---|
| Pelaaja_v7 — suomenkielisiä tekstejä sv-tilassa, uniikkeja | 162 (ui 150, data? 12) | **69** (ui 62, data? 7) — kaikki jäljellä olevat ovat dev-scene-prototyyppinäkymiä, demo-dataa tai demo-ilmoitusten tapahtumanimiä (ks. §6) |
| Vanhempi_v2 — sama | 30 (ui 18, data? 12) | **18** — demo-data + IKA-oletukset (`Pelaaja`/`Joukkue`, ylikirjoitetaan oikealla datalla) + `Streak` |
| Pelaaja: tuotantopolun näkymät (tanaan, mina, meista, pin, train, card, valinta) | 24 / 72 / 7 / 8 / 8 / 37 / 8 | 5 / 1 / 0 / 0 / 0 / 6 / 1 (loput = demo-tapahtumat + `SOS`-koodi + `Kenttä`-aria) |
| Reititettyjä kutsupaikkoja (`T`/`_pT`/`t` literaaliavaimella) | Pelaaja 90, Vanhempi 214 | Pelaaja **610**, Vanhempi **241** |
| Uusia avaimia (fi + en kirjoitettu, sv Geminille) | — | tm_lang `pelaaja` 396 · `vanhempi` 18 · `yleiset` 4 → **418 riviä** |
| Gemini-erä 2 (`docs/i18n/sv_kaannoserae_2.json`) | — | **467 riviä**: tm_lang 418 · lib_adar_nimet 8 · lib.rubriikit 35 · lib.tm_kentta 6 |

fi-renderöinti on **tavutarkasti ennallaan** (todennettu kolmella tavalla, §5).

## 2. Luetut renderöintifunktiot (brief: koti, kalenteri, klippi — luettu lähteestä, ei vain demo-ajosta)

**Vanhempi_v2** — koti: `rKoti`, `_kotiU12`, `_kotiU15`, `_kotiU19`, `_renderLiveFeed`, `_tarinaOtsikko`, `_tarinaKuvaus`, `_viikkoRivitHtml`, `_valmentajaUusinHtml`, `_valmentajaListaHtml`. Kalenteri: `_vanhLataaKalenteri`, `_vanhTapahtumatHTML`, `_vanhTapahtumaKortti`, `_vanhLogistiikkaChipit`, `_vanhSaatavuusHTML`, `_vanhMerkitseLasna`, `_vanhNotifHTML`, `_vanhNotifTap`, `_vanhMerkitseLuettu`, `_vanhDemoKalenteri`/`_vanhDemoNotif`. Klippi: `_vKpHTML`, `_vKpSisalto`, `_vKpPiirra`, `_vKpLataa`, `_vKpO` + `lib/tm_klippi_perhe.js` (sen FI-avaimet ovat kaikki jaetussa libikartassa, 38/38). Lisäksi `rLogin`, `rViikko`, `rKirjaa`, `rValmentaja`, `rVanhempiTekniikka`, `rVanhempiEnnatykset`, `rKortti`, `rAsetukset`, `rTabs`, `_naytaVanhTervetulo`, PWA-kehote.

**Pelaaja_v7** — kalenteri: `_p7EvPvm`, `_p7EvKuuluu`, `_p7LataaKalenteri`, `_p7AikatauluHTML`, `_p7AikatauluKortti`, `_p7PelaajaviestiHTML`, `_p7LogistiikkaChipit`, `_p7SaatavuusHTML`, `_p7MerkitseLasna`, `_p7NotifHTML`, `_p7NotifTap`, `_p7MerkitseLuettu`, `_p7LataaNotif`, `_p7DemoKalenteri`/`_p7DemoNotif`. Muut: kaikki `r*`-renderöijät (rA1, rA1Kentta, rValinta, rMina, rMinaHero, rMinaProfiili, rMinaKehitysvaihe, rMinaMAS, rMinaFyysinenTavoite, rMinaTekniikkaprofiili, rMinaSitoumus, rMinaItsearvio, rMinaAsetukset, rMinaEdistyminen, rMeista, rTIntro/rTEx/rTDone, rAdar, rRPE, naytaFcOverlay, `_fcKorttiData`, `_kk*`-kokoelma/ennätykset, `_synttariBanner`, kirjautuminen/PIN, toastit).

## 3. Ilmoitusteksti (vaihtoehto A)

* `functions/kalenteri_notif.js` kirjoittaa uusiin dokumentteihin **`ilmoitus: { tyyppi: 'huomenna'|'peruttu'|'muutos', nimi, aika, paikka }`** (rajattu 120/8 merkkiin; vain nimi/aika/paikka, GDPR kuten ennen). `teksti` (suomi) kirjoitetaan **edelleen** varakäyttöön — additiivinen, ei rules-muutosta (`notifikaatiot`: CF kirjoittaa, client päivittää vain `luettu`).
* `lib/tm_kalenteri_ilmoitus.js`: `tmIlmoitusRivi(n, tapahtumat, nyt, t)` kokoaa rungon `t()`:llä (`tmIlmoitusKoosta`, avaimet `yleiset.ilm_klo/ilm_peruttu/ilm_muutos/ilm_tapahtuma`). Pelaaja ja Vanhempi välittävät `t`:n. **Vanhat dokumentit (vain `teksti`) näytetään muuttumattomina**, samoin kutsu ilman `t`:tä. fi-tulos on tavutarkasti sama kuin CF:n vanha teksti (testi).
* Testit: `functions/test/kalenteri_notif.test.js` (+4), `tests/p0_4_kalenteri_ilmoitus_client.test.js` (+7: fi-pariteetti, en, sv-fallback, peruttu/muutos, nimi puuttuu, vanha doc, ei-`t`).
* Huomio: uudet `yleiset.ilm_*`-rivit saavat sv:n vasta Gemini-erästä → siihen asti sv-tilassa tulee en-fallback (`Cancelled: …`). Läpiajo näyttää tämän demo-ilmoituksissa.

## 4. ADAR-nimikanoni (perheet näkevät)

`lib/tm_pelialy_yksilo.js`: uusi `tmAdarNimet(rooli, tr)` (additiivinen; `TM_ADAR_NIMET` ennallaan = fi-oletus). Pelaajan `rAdar` käyttää sitä `_p7K1T`:llä (avaimet `adar_nimi_<rooli>_<a|d|ac|r>`: sv jaetusta libikartasta, en `tm_lang pelaaja.adar_nimi_pelaaja_*`). Valmentajan nimet (`adar_nimi_valmentaja_*`) ovat valmiina VP/Master/pikakortin PR 3–4:lle ja mukana erässä. Testit `tests/adar_nimet_kaannos.test.js`.

Samalla kortin tasokuvaukset (`lib/tm_adar_rubriikki.js`, `lib/tm_kortti_rubriikit.js`; näkyvät kortin takapuolella lapselle) reititettiin `_p7RubT`:llä jaettuun libikarttaan (avain = fi-teksti): 35 riviä erässä osiona `lib.rubriikit`; Kenttä-komponentin kääntämättömät avaimet (`lib.tm_kentta`, 6 riviä).

## 5. Todennus ja uudet portit

* **fi-regressio**: läpiajo `--kieli=fi --dump` ennen/jälkeen: Pelaaja 0/12 ja Vanhempi 0/19 näkymää eroa. Harnessi tehtiin deterministiseksi (kiinteä kello, siemennetty `Math.random`, tervetulo-ikkuna kiinni, toisto kunnes kaksi ajoa täsmää) — ilman sitä demo-sivun satunnaisuus (synttäribonus, päivän harjoite) tuotti vääriä eroja.
* **`tools/i18n/fi_ekvivalenssi.mjs`**: linearisoi jokaisen merkkijonoketjun (`a + 'x' + b`, template) ja korvaa `T('avain', …)` fi-tekstillä; vertaa `origin/main`iin ylätason lauseittain. Jäljellä vain tunnetut rakennemuutokset (ternary kahtia, siirretyt vakiot, uudet apufunktiot). Löysi kaksi oikeaa virhettä, jotka läpiajo ja yksikkötestit missasivat: *koodimuunnos pudotti `📲`-emojin PWA-kehotteesta* (korjattu) ja *välilyönnit* (korjattu koodimuunnoksessa).
* **Varjostusvartija** (`tools/i18n/sv_staattinen.mjs --varjostus`, mukana portissa): ensimmäinen koodimuunnosversio tuotti 5 `T('…')`-kutsua funktioon `_tekTavoiteSaate`, jossa `const T = window.TM_TESTIT` varjostaa reitittimen → TypeError/TDZ tuotannossa. Yksikkötestit eivät huomanneet. Korjaus: aliakset `_pT`/`_pt` (määritelty reitittimen vieressä); vartija estää toiston.
* **`tests/i18n_reititys_portti.test.js`**: Pelaaja_v7 + Vanhempi_v2 eivät saa sisältää reitittämätöntä suomea (acorn-skanneri `tools/i18n/sv_staattinen.mjs`; poikkeukset perusteluineen `tools/i18n/sv_staattinen_sallitut.json`) eikä varjostettuja reititinkutsuja; negatiivitestit.
* `tests/i18n_gemini_era2.test.js`: erä on elävä — jokainen odotuslistan avain, kirjaston rubriikkiteksti ja Kenttä-avain on erässä; fi/en täsmäävät. Pohjan päivitys: `node scripts/i18n_luo_gemini_era.cjs` (säilyttää jo täytetyt sv:t).
* Koodimuunnos `scripts/i18n_reititys_codemod.mjs` (uudelleenkäytettävä PR 3–4:ssä; `--kuiva`/`--kirjoita`), testiapuri `tests/helpers/pelaaja_t.mjs` (hiekkalaatikoille `T/_pT/_pt` fi-kielellä; `laajennaT` lähdetason väitteille).
* Koko sarja: `npm test` 7386 ✓ · `functions/` 157 ✓ · `npm run test:rules` ✓ · `npm run lint` ✓.

## 6. Mitä EI ole reititetty (ja miksi)

* **Dev-scene-prototyypit** (`rHaptic`, `rOffline`, `rParent`, `rVapaa`, `rVapaaDone`, `rHaaste`, `_renderTeema`, `_renderV1V1`, `_renderOmat`): avautuvat vain demo-tilan scene-barista (`#sBar`, `data-s=`), eivät käyttäjälle — allowlistattu perusteluineen. **Tarkistakaa**: jos jokin näistä (esim. `rVapaa` "Oma treeni") on tarkoitus tuoda tuotantoon, ne pitää reitittää ensin.
* Kuollut koodi: `rJoukkue`, `rTestit`, `rKortti`, `rAikajana` (ei kutsupaikkaa).
* Harjoitepankki (`PANKKI`/`WHY`): kulkee HARJOITE_I18N-reittiä (oma erä, V4-A).
* Demo-data: tapahtumanimet (Joukkueharjoitus, Nopeustestit), henkilönimet, `IKA`-oletukset (`Pelaaja`/`Joukkue`, `_kasitteleLapsi` ylikirjoittaa).
* Päivämäärien numeromuoto (`5.10.`) ja `toLocaleDateString('fi-FI')` Vanhempi_v2:ssa (2 paikkaa: viikkorivit, `_viikkoRivitHtml`/päivä): muoto ei seuraa kieltä. Viikonpäivälyhenteet **seuraavat** nyt kieltä (`Su Ma …` fi ennallaan; sv/en Intl). Ehdotus: oma pieni PR (`tmPvmFmt`).
* Kirjastotekstit, joita Pelaaja/Vanhempi eivät renderöi (tm_tukitavoitteet, tm_idp, tm_teknistaktiset yms.): kuuluvat Master/VP-PR:iin.
* `tm-microcycles`-kirjaston idoli-/teemanimet (`Maestro`, `Vastaanotto`, `rohkea joka paikassa` fallback-oletus reititetty; kirjaston oma teema-sisältö ei).

## 7. Havaittuja ennestään olevia asioita (ei korjattu tässä)

* `_tarkistaSignaalit`: `teksti:'${_streak} päivän putki'` on yksinkertaisissa lainausmerkeissä (ei interpolaatiota). Kenttää ei näytetä (vain `signaalit[0].tyyppi` kirjataan) → ei näkyvä bugi; allowlistattu.
* `tm_kentta`: tilasana `nyt` kulkee `_p7K1T`:n kautta `pelaaja.nyt` ("Nyt:") -avaimeen, koska se on olemassa — fi-tagi voi näyttää "Nyt:" eikä "nyt". Ei muutettu (fi-renderöinti ennallaan); `lib.tm_kentta` sv-rivi `nyt` kuitenkin voittaa sv-tilassa.

## 8. Päätettävää / huomioitavaa

1. **sv-fallback**: kunnes Gemini-erä 2 on viety, uudet avaimet näkyvät sv-tilassa **englanniksi** (`t()`: sv → en → fi). Vaihtoehto: sv → fi (erillinen pieni muutos `tm_lang.js`:ään). Ei muutettu — ehdotan pitämään en-fallback, koska se on useimmille suomenruotsalaisille luettavampi kuin suomi.
2. Tämä PR bumppaa `tm_lang` v34 (kaikki 7 sivua), `tm_kalenteri_ilmoitus` v2, `tm_pelialy_yksilo` +1 (4 sivua), SW-cachet `tm-pelaaja-v83`, `tm-vanhempi-v54`, `tm-adar-v11` (§27.4).
3. Deploy: `functions/kalenteri_notif.js` muuttuu → CF-deploy tarvitaan, jotta uudet ilmoitukset kantavat `ilmoitus`-rakenteen. Ennen deployta clientit toimivat (vanha `teksti`).
4. Gemini-erä 2 viimeistään 20.10. Mukaan tulevat vielä PR 3–4:n rivit sekä #892:n jäännökset (`ts_otsikko`, Klubb→Förening, "Kehityskaari (kausifokus)", VP×Master 110).
