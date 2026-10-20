# K4a — Profiili-välilehti ja todistekortit (D102, erä 79)

Lähde: `.briefit/CODE_BRIEF_K4A_PROFIILI_TODISTEKORTIT.md`. Kaista: Tero. Lipun `liput.kehitystyopoyta_v2` takana; ilman lippua mikään ei muutu. **Ei uusia Firestore-kenttiä, ei Rules-muutoksia.** Pelaaja- ja perhe-app eivät muutu (§7.22). Design SSOT: Teron hyväksymä mockup (4 artboardia: 1280 vaalea Topias, 390 tumma, 390 vähän dataa, 390 SJK).

## Suunnitelma (kirjoitettu ennen koodia)
1. **Uusi `lib/tm_todistekortit.js`** (puhtaat funktiot, dual-export `TM_TODISTEKORTIT`). Syöte: pelaajadokumentti (pikakentät: `hh_viimeisin`, `hh_historia`, `tki_*`, `tk_lajit_viimeisin`, `sm_*_viimeisin`, `adar_viimeisin/edellinen/havaintoja/arvioijia`, `d3_viimeisin`, `flei_*`, `biologinenIka_viimeisin`, `jaksofokus(_historia)`) + konteksti (nyt, PHV `tmPhvTila`, ikä/sp, `perTestTasot`). Tuloste: yhteenveto (vahvuus · kehityskohde · puuttuu), tasonauha (5 riviä), kortit (5 tai yksi "Mittauskierros puuttuu"), luvut. Tasot lasketaan **olemassa olevalla** `perTestTasot` / `eerikkilaTaso`-ketjulla (testihetken ikä, ei nykyikä); ei toista tasologiikkaa.
2. **Tulkintalauseet avaimista** (`22_TULKINTASAANNOT.md`): FI-oletusmap `tc_*` + `{parametri}`-paikat, `c.t(avain)` ensin (sv Gemini-erästä), ei kovakoodattuja lauseita. KIELLETYT-portti lauseille (testi).
3. **Pisteet = testin oma asteikko**: `perTestTasot.asteikko` (Eerikkilä 5, H-H syöttö/pujottelu 3, ADAR 3, D3 5). Puolikas taso → puolikas piste (`.puoli`), ei alaspäin pyöristystä. TK-lajitaso 1–5 nykyisellä `tkLajiTaso`-muunnoksella (muunnos on olemassa, ei raportoitavaa).
4. **Trendi** vain kun samasta lähteestä ≥ 2 pistettä: `hh_historia` / `tki_historia` / `flei_historia` (kynnykset: taso ±0,5, FLEI ±5); ADAR `adar_edellinen` → `adar_viimeisin` (±0,5). Ei pikakentän historiasta mukaan (säännöt).
5. **Tyhjät kortit**: ≥ 3 tyhjää → yksi "Mittauskierros puuttuu" (puuttuvat listana, yksi nappi). Datan ikä ≤ 3 kk normaali, 3–6 kk amber, > 6 kk ainoa toiminto "Päivitä mittaus" (§14).
6. **PHV kerran** `tmPhvTila`:sta: PRE/LAH/tuntematon → heikointa ei nimetä kehityskohteeksi (§28), PH → kuormahuomio (§25), POST/AN normaali. Yhteenvedon Vahvuus/Kehityskohde lasketaan **samoista korttirivisistä** (ei omaa logiikkaa).
7. **Fokuskortti** = jakson aiheeseen liittyvä osa-alue (`jaksofokus.konsepti_avain`): fyysinen = `ohjelma:*`/fyysinen domeeni; tekninen = `y_h1–h5, y_h9` (haltuunotto, syöttäminen, tempokuljetus, harhauttaminen, pallon suojaaminen, viimeistely); peli = `y_h0, y_h6–h8, y_p1–p4`. Ei jaksoa / tuntematon avain → ei fokuskorttia. Fokuskortti ylimpänä, koko leveys, "Jakson fokus · {aihe}" -merkki.
8. **Pelaajan oma näkemys** (Peli-kortti, yksi lause, ei lukuja): (a) D3 `pisteet[dim]` pelaaja vs valmentaja, ero ≥ 1,5 (säännöt); (b) `jaksofokus_historia` uusin rivi jossa `arvio_itse` ja `arvio_valmentaja` (ero ≥ 1; `kalibraatio_ero` on itseisarvo, joten suunta luetaan arvoista). Lause: "{Etunimi} arvioi {aihe} vahvemmaksi/varovaisemmaksi kuin valmentajat."
9. **Välilehti ja reitti**: `lib/tm_hash_reititin.js` VALILEHDET `['tanaan','polku','profiili']` + vanha `naytto` → ohjautuu `profiili`:in (alias, sama `#pelaaja/{pid}/…`). `lib/tm_kehitystyopoyta.js`: välilehden nimi **Profiili** (`kt_profiili`), silmin-tilassa pois (A8) kuten Näyttö. Kehys `tmNayttoKehysHTML` saa todistekorttien paikkaan korttien HTML:n, "Näytä kaikki mittaukset" **suljettuna oletuksena** (K2:n lohkot sellaisinaan).
10. **Mobiili (säiliö < 720 px)**: tasonauha ilman kattavuussaraketta; fokuskortti auki, muut yhden rivin tiivistelminä (otsikko · lyhyt lause · trendi · ▸), avautuvat napautuksella (`<details>`). Pelaajaraportti ↗ tasonauhan alla.
11. **Kehitysvauhdin korjaus** (`tm_kehityskaari.js` `tmKaariNopeus`): mittausten väli < 60 pv → ei `perVuosi`/`perKausi` (palauttaa `{delta, dtVuodet, perVuosi:null, perKausi:null, lyhytVali:true}`); `_testiRivi` näyttää eron ("3,17 → 3,08 s · 2 mittausta") + "Kehitysnopeutta ei arvioida: mittausten väli alle 2 kk". Sama lib → Master ja vanha näkymä saavat korjauksen. Testit 1 pv / 59 pv / 60 pv / 1 v.
12. **Tekstit** erään 79 (`scripts/i18n_luo_gemini_era79.mjs` → `docs/i18n/sv_kaannoserae_79_gemini.json` + kopio `.briefit/`), `LIB_SV_ODOTTAA`. Code ei kirjoita ruotsia.
13. **Testit**: lib-yksikkötestit (7 sääntötestiä, asteikot 5/3, ei normia, tekniikkanäyte, ≥ 3 tyhjää, fokuskortti, PHV, itsearvioero, 60 pv), selaintesti 390 + 1280, molemmat teemat, fi + sv, valmentaja + VP, fixturet (Topias · SJK-tyyppi · Testi Pelaaja), lukumäärä oletusnäkymässä ≤ 30, silmin → välilehti pois.

## Linkitykset — jokaisen kohde tarkistettu koodista

| Toiminto | Kohde | Tila |
|---|---|---|
| Suunnittele mittaus / kasvumittaus / Päivitä mittaus | `_msFyysSuunnitteleMittaus` (Master) = `TalentMaster_Testaus_v9.html?seura=…&joukkue=…` uudessa välilehdessä. | **Olemassa, mutta ei "pelaaja valmiina":** Testaus lukee vain `seura`, `joukkue` ja `t` (tapahtuma); Masterin lähettämä `teema=hh_laaja` ei vaikuta mihinkään. Linkki = sama URL (ei uutta toimintoa). Kasvumittauksen protokolla valitaan Testauksessa. **Raportoidaan.** |
| Pelaajaraportti ↗ | `_avaaPelaajaraportti` on Masterissa (modaali); uudella sivulla `window._avaaPelaajaraportti` ohjaa jo Masterin `#pelaaja/{pid}/naytto` -näkymään (K2:n shim). | Olemassa; S-hyppy Masteriin. Näkyvyys: sivu päästää vain pelaajat joihin oikeus on (`tmPelaajaOikeus`) = Masterin `_prVoiNahda`. |
| "{Kehityskohde} seuraavan jakson aiheeksi" | Ei jaksoa → `_jaksoSheet().avaa(pid, esivalintaAvain)` (`tm_kt_jakso.js`, parametri on jo olemassa) uudella sivulla. Jakso käynnissä → nappi "Kehityskohde: {aihe}" → Polku-välilehti (`_ktValilehti`), ei tallenna mitään. | **Esivalinta ilman uutta kenttää, ei tallennusta.** Kehityskohteen (testilaji) → konseptin avain -taulukko: `syotto → y_h2`. Muille lajeille (pujottelu, ponnauttelu, kuljetus-laukaus) ei yksiselitteistä konseptia → nappi "Aloita jakso" ilman esivalintaa ja ilman aiheen nimeämistä napissa. **Raportoidaan.** |
| Avaa jakso Polussa | `_ktValilehti(pid,'polku')` (`#pelaaja/{pid}/polku`) | Olemassa. |
| Näytä testihistoria | avaa `<details data-kn-kaikki>` ja vierittää Kehityskaari-lohkoon (K2-lohko) | Olemassa (K2). |
| Ota … puheeksi · kysymykset pelaajalle | Tänään-välilehti, toimintokortin "Kysy pelaajalta" (`kt_tk_kysy`, `tm_kt_toimintakortti.js`) | Olemassa. |
| Merkitse pelihavainto | `window._ktHavaintoLisaa(pid)` (sheet uudella sivulla, ei Master-hyppyä) | Olemassa, parempi kuin `?toiminto=havainto`-hyppy. |
| Suunnittele mittauskierros (koonti) | sama kuin Suunnittele mittaus | Olemassa. |

## Poikkeamat briefistä (ennakkoon)
- Briefin "fokuskortti ylimpänä, muut 2×2": fokuskortti voi olla mikä tahansa viidestä; 2×2-ruudukkoon jää loput neljä. Jos fokuskorttia ei ole, kortit tulevat kanonisessa järjestyksessä 2×2:na (Fyysinen, Tekninen / Peli, Kehon valmius / Kasvu).
- Briefi: "enintään 3 testiriviä"; mockupin fokuskortti näyttää 4. **Mockup voittaa:** fokuskortti näyttää enintään 4 riviä, muut 3; 390 px:ssä 3 + "+ n testiä kaikissa mittauksissa".

## Merge-muistiinpano
Merge mainista (ei rebasea), aja `node scripts/lib_versiot.js --kirjoita` ja `node scripts/kuoret_kasvukatto.js --kirjoita`, nosta `?v`- ja SW-versiot.
