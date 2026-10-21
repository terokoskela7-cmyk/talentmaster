# K4c — Kaikki mittaukset historiaksi (D102 jatko, erä 83)

Lähde: `.briefit/CODE_BRIEF_KTP_VALMIIKSI_K4C_K4B_K1E.md` (osio K4c). Kaista: **Tero** (HTML + sivun reititin). Lipun `liput.kehitystyopoyta_v2` takana; ilman lippua mikään ei muutu. **Ei uusia Firestore-kenttiä, ei Rules-muutoksia, ei kirjoituksia** (näkymä on lukuvain). Näkymä on henkilökunnan näkymä (valmentaja, VP, johto): pelaaja- ja perhe-app eivät muutu (§7.22).

## Mockup
Briefin mockuppia ("Profiili-canvas, taulut 'Kaikki mittaukset · 1280 vaalea · 30 m auki' ja '… 390 tumma'") **ei löydy repossa** (haettu `docs/design/**`, `docs/mockups/`, `.briefit/`, koko repo grepillä). Toteutus noudattaa briefin tekstimäärittelyä ja K4a:n visuaalista kieltä (mockup 22 + Profiilin todistekortit). Puute raportoidaan PR:ssä; Tero tarkistaa ulkoasun KPV:llä ennen mergeä.

## Mitä rakennetaan
1. **Koko ruudun sheet** (D100) Profiilista: nappi "Näytä kaikki mittaukset" (korvaa vanhan avattavan K2-raakalistan) ja korttien "Näytä testihistoria". `‹ Profiili` palaa. Esc ja selaimen paluu sulkevat.
2. **URL-tila**: `#pelaaja/{pid}/profiili/mittaukset[/{osio}[/{testi}]]` (`lib/tm_hash_reititin.js` laajenee taaksepäin yhteensopivasti: vanhat osoitteet parsiutuvat entisellään, uusi kenttä `mittaukset` vain kun suffiksi on). Avaus = uusi historiamerkintä (selaimen paluu sulkee sheetin), rivin avaus ja ankkuri korvaavat merkinnän. Suora osoite avaa sheetin oikeaan osioon ja testin riville.
3. **Kiinteä otsikkorivi**: nimi · joukkue · ikä; suodatin **Tämä kausi / Kaikki** (kausi = seuran kausimalli, `tm_arviointi_historia.tmKausiAlku`; Suomi = kalenterivuosi); ankkurit Kasvu ja kypsyys · Fyysinen · Tekninen · Peli · Kehon valmius (< 720 px vaakavieritteiset sirut).
4. **Yksi taulukko per osio**: Testi · Viimeisin · Taso (testin oma asteikko, puolipiste .5) · Edellinen · Muutos (↗ parani / ↘ huononi / –; väri vain kun parempi) · Päivä (+ "yli 3 kk" / "yli 6 kk", sama `_ikaLuokka` kuin kortit) · Mittauksia.
5. **Rivin napautus avaa historian** (ei laajennusta jos 1 mittaus): käyrä (SVG) + kaikki mittauskerrat (päivä, tulos, taso testihetken iästä, lähde). **Ajoissa asteikko käännetty (ylös = parempi)** + lause "Pienempi aika on parempi". Alle 2 kk väli → "Kehitysnopeutta ei arvioida" (`tmKaariNopeus.lyhytVali`, sama teksti `tc_kayra_lyhyt`).
6. **Peli**: ADAR ikätason ulottuvuudet (`tmAdarBand`), keskiarvo (`tmAdarYht`, sama kuin tasonauha), edellinen + muutos, arvioijakohtaiset sarakkeet (vain kun ristiinarvio on auki: `tmAdarRistiinarvioAvoin`, SA ohittaa, muuten lukkorivi — ei DOM-vuotoa), havaintojen määrä, viimeisin päivä; lukitut ulottuvuudet "ei arvioida tällä portaalla". Alataulukko **Psyykkinen arvio** (D3, viisi ulottuvuutta, valmentajan ja VP:n arvio; **pelaajan oma arvio ei tähän**: rivi "Pelaajan oma arvio ja valmentajien erot näkyvät kehityskeskustelussa" → K4b).
7. **Kasvu ja kypsyys** tyhjänä: katkoviivakortti "Ei kasvumittauksia · Suunnittele kasvumittaus". Datalla: yksi rivi/mittaus (kasvupyrähdyksen tila, ikä, kasvutahti).
8. **Kehon valmius**: prosentti + historia (`flei_historia`) + rivi "Eniten tukea: {alue} · näkyy {missa}" (K4a2:n sanat `tc_alue_*`, sama `laskeKetjuProfiili`-lähde, ei ketjuprosentteja); matala (< 40 %) → ohjaus fysioterapeutille kuten kortilla.
9. **Pois**: D1/D2-yhteenvetokortit, kasvumittausvaroitus, jaksolista, D3-kalibraatio, harjoittelu, toinen peliälylohko, emojit, ⭐. Selitteet ⓘ:n taakse. Vanha Master-raakalista säilyy Masterissa (lippu pois); Kehitystyöpöytä ei enää hae `testitapahtumat`-kokoelmaa Profiilissa.

## Arkkitehtuuri (CLAUDE.md §41: logiikka libiin, lib ≤ ~500 riviä)
- `lib/tm_mittaukset.js` — **malli** (`tmMittauksetMalli(p, c)`), PURE. Rivit, tasot ja trendit kutsuvat K4a:n sääntöjä (`tmTodisteMalli` + sen `_apu`-apurit: `perTestTasot`, `_ikaLuokka`, `_trendi`, `_fmtRaaka`): sama data ja samat säännöt kuin kortit, ei toista tasologiikkaa. Historian taso testihetken iästä (`normiIka(syntymaVuosi, pvm)`).
- `lib/tm_mittaukset_html.js` — HTML + CSS (vain sivun tokenit, ei hex-värejä, `--fs-*`).
- `lib/tm_mittaukset_fi.js` — FI-tekstit `mk_*`; sv Gemini-erästä 83 (`docs/i18n/sv_kaannoserae_83_gemini.json`, sv tyhjä; PM kirjoittaa).
- Sivun liima (`TalentMaster_Kehitystyopoyta.html`): avaa/sulje, suodatin, ankkuri, rivin avaus, URL-synkka (~40 riviä, ei logiikkaa).
- `lib/tm_naytto_lohkot.js`: `tmNayttoKehysHTML` saa `c.kaikkiLinkki` (nappi avattavan tilalle); ilman sitä vanha käytös.

## Datalähteet (ei uusia kenttiä)
| Osio | Viimeisin | Historia | Taso |
|---|---|---|---|
| Fyysinen | `hh_viimeisin` + `hh_pvm` | `hh_historia[]` (lin5m/10m/30m, cmj, sj, mas, kasirata) | `perTestTasot` (Eerikkilä, asteikko 5), historiassa testihetken iästä |
| Tekninen (TK) | `tk_lajit_viimeisin` + `tki_pvm` | `tki_historia[]` (`_s`-aliakset normalisoidaan `tmKaariNormalisoiTk`) | `tkLajiTaso` 1–5 |
| Tekninen (H-H) | `hh_viimeisin.syotto/pujottelu` | `hh_historia[]` | Eerikkilä 3-porrasta |
| Tekninen (seuran oma) | `sm_juoksu_viimeisin`, `sm_pallo_viimeisin` | ei historiaa → "1 mittaus" | ei tasoa (ei normia), pallorata − juoksurata |
| Peli | `adar_viimeisin`, `adar_havaintoja`, `adar_arvioijat[]` | `adar_edellinen` (2 pistettä) | ADAR 0–3; ikätason ulottuvuudet `tmAdarBand(ika, havainto_porras)` |
| Psyykkinen arvio | `d3_viimeisin.pisteet[dim].valmentaja/vp`, `.pvm` | ei historiaa | 1–5 |
| Kasvu ja kypsyys | `biologinenIka_viimeisin`, `kasvutahti_cm_v` | ei historiaa | ei tasoa |
| Kehon valmius | `flei_viimeisin`, `flei_pvm` | `flei_historia[]` | % → 5 pisteen asteikko (puolipiste) |

## Toimintokartta (D158): nappi → avautuu → kirjoittaa → rooli
| Nappi | Avautuu | Kirjoittaa | Rooli |
|---|---|---|---|
| Profiili: Näytä kaikki mittaukset | koko ruudun sheet | ei mitään | valmentaja (oma joukkue), VP, johto, SA |
| Kortti: Näytä testihistoria | sheet + osio + testin rivi auki | ei mitään | sama |
| ‹ Profiili / Esc / selaimen paluu | sulkee sheetin | ei mitään | sama |
| Tämä kausi / Kaikki | suodattaa osiot | ei mitään | sama |
| Ankkurisirut | vierittää osioon | ei mitään | sama |
| Rivin napautus | historia (käyrä + mittauskerrat) | ei mitään | sama |
| Suunnittele kasvumittaus (tyhjä Kasvu) | Testaus uudessa välilehdessä (sama kuin kortit) | ei mitään tässä | sama |
| ⓘ | selite | ei mitään | sama |

## Testit
Lib-yksikkö (Topias: 30 m kaksi mittausta → käyrä ylöspäin + "Kehitysnopeutta ei arvioida"; tyhjä pelaaja; SJK d1/d2; Sibbo käsirata + 30 m; suodatin; ristiinarvion lukko; ei kiellettyjä sanoja), reititin (parse/rakenna, vanhat osoitteet ennallaan), selain 1280 + 390 (ankkuri, syvälinkki, sirut, paluu, ei emojeita/⭐/"D1"/"D2"/"PHV"/"ketju" näkyvässä tekstissä), sv-erä 83 -rakenne, versio- ja lib-vartijat. Kuvat `docs/ui-kuvat/k4c/` (1280 vaalea, 390 tumma rivi auki, ennen/jälkeen).

## Merge
Järjestys K1e → K4c → K4b. Myöhempi mergeää mainin, ajaa `node scripts/lib_versiot.js --kirjoita` ja nostaa `?v`.
