# CODE BRIEF · VP Koti ja Tilanne v2 + laatuportti (mockupit 30, 33)

**Kaista: Tero** (VP_v25, `lib/`, `tests/`, `scripts/`). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Miksi:** Tero 10.10.: "En tunnista tätä TalentMasteriksi." Livenä KPV:llä Tilanteessa oli 18 nappia, viisi korttityyliä, konekieltä ("Tekniikka · Tekniikka alle normin (2.3) → tekniikkateema") ja selaimen oletusnapit (vanha `tm_kt_komponentit.js?v=1` välimuistissa). Vertailukuvat oli otettu tyhjällä demodatalla, joten virheet eivät näkyneet ennen tuotantoa.
**Design (SSOT):**
- Koti: `docs/design/idp-v2/33_koti_vaiheet_laatuportti.html` (vaiheet, laatuportti, typografia). Mockup 32 on tausta; jos ne eroavat, 33 voittaa.
- Tilanne: `docs/design/idp-v2/30_tilanne_v2.html` + D169-typografia (33 §6) + D170.
- Toimintokartta (mitä jokainen nappi avaa): `31_jaksojen_suunnittelu.html` §5.
- Päätökset D147–D152, D159–D170 (`07_avoimet_paatokset.html`). Tero lukitsee ennen PR B:tä.
**Järjestys:** neljä PR:ää, yksi kerrallaan tuoreen mainin päältä, ei pinoja. S2c PR 3 (Joukkueet ja ryhmät) ja S2b odottavat näiden jälkeen.
**Kenttä-lippu:** kuten ennen. Ilman lippua VP_v25 ennallaan (snapshot).

## PR A — Laatuportti ja tokenit (D168, D169) + pikakorjaukset · ensin
Tämä estää saman virheen toistumisen. Ei näkymämuutoksia paitsi tokenit ja korjaukset alla.
1. **Versiohash (D168):** jokaisen VP_v25:n, Master_v16:n, Pelaaja_v7:n ja Vanhempi_v2:n lataaman `lib/*.js`- ja CSS-tiedoston `?v=` on tiedoston sisällön hash (8 merkkiä). `npm run versiot` päivittää viitteet. Vartijatesti laskee hashin ja kaatuu, jos tiedosto muuttui mutta viite ei. Korjaa samalla nykyiset vanhentuneet viitteet (`tm_kt_komponentit.js`, `tm_vp_tilanne.js`, `tm_vp_navi.js`, `tm_seuran_pulssi.js` ym.).
2. **Fontti- ja kontrastitokenit (D169):** `--fs-h1` 40 (mobiili 32) · `--fs-h2` 26 · `--fs-lead` 16 · `--fs-body` 14 · `--fs-meta` 12.5 · `--fs-eb` 11 VP_v25:n `:root`iin. Vaalean teeman `--amber` `#9A6512 → #845510`. Kirjaa asteikko myös CLAUDE.md §5:een ja mockupin 22 design-dokumenttiin (docs-osuus samassa PR:ssä, kaista Tero koska HTML muuttuu).
3. **Design-testit (D168), koskevat vain lipun takana olevia uusia näkymiä (`tm_seuran_pulssi`, `tm_vp_tilanne`, `tm_vp_navi`, `tm_kt_komponentit`):**
   - enintään yksi täytetty `.kt-btn` per renderöity näkymä (Koti, Tilanne);
   - vain sallitut `font-size`-arvot (`var(--fs-*)`) näiden libien CSS:ssä;
   - kielletyt UI-tekstit: `TKI <`, `→ ` + `teema`, `0 % · 0 %`, seuran nimi rivin alussa ("KPV P13"), osa-alueen toisto samassa rivissä;
   - prosenttia ei näytetä ilman otosta (D125): apufunktio + yksikkötesti.
4. **Fixture-tilat (D168)** `tests/fixtures/vp/`: `tyhja` (0 joukkuetta), `pilotti` (KPV:n kaltainen, anonymisoitu: 15 joukkuetta + 2 tyhjää, 1 jakso, 4/160 suostumusta, 6 huomiota, 4 ehdotusta joista yksi 14 joukkueelle), `kypsa` (FC Demo), `kuormitus` (40 joukkuetta, pitkät nimet, ruotsi). Ei oikeita nimiä.
5. **Kuvaskripti** `scripts/ui_kuvat.mjs` (Playwright, `/opt/pw-browsers/chromium` tai CI:n Chromium): Koti ja Tilanne × 4 tilaa × 390/1280 × tumma/vaalea = 32 kuvaa → `docs/ui-kuvat/<haara>/`. Jokaiseen näkymä-PR:ään kuvat ja linkit PR-kuvaukseen.
6. **Pikakorjaukset:** ehdotusten joukkuelistoista tuplat pois ja lyhyet tunnisteet D144:llä (livenä "P10, P11, P12, P10…").
- Testit: koko sarja oletus-TZ:llä ja `TZ=UTC`:llä; raportoi `Test Files` ja `Tests`.

## PR B — Koti: Käynnistys-vaihe (D164, D165, D166, D167) · KPV:lle ensin
- **Vaihe** lasketaan koosteesta (`tm_koti_luvut`): Käynnistys kun alle 1/3 joukkueista (pelaajia > 0) on jaksolla, muuten Rytmi. Ei käsivalintaa.
- **Käynnistys (mockup 33):** otsikko "Kauden käynnistys: kolme askelta." + tulkintalause; askeleet
  1. Jaksot `a/b` → ainoa täytetty nappi **Aloita jaksot** (kunnes mockup 31:n työkalu on tehty: avaa jaksottomien ryhmän / yhden joukkueen näkymän kuten #966);
  2. Perheet mukana `suostumus/pelaajat` (koosteesta, ei arvausta) → linkki "Kutsu loput N →" (olemassa oleva kutsutoiminto);
  3. Testipäivät `varattu/joukkueet` → "Sovi päivät →" (testijakson modaali).
  Ensimmäinen keskeneräinen askel saa täytetyn napin, muut ovat linkkejä.
- Tällä viikolla -lista (signaalit + VP:tä odottavat viestit), Jaksolla nyt -rivit, Odottaa jaksoa -tunnisterivi, oikea palsta (Tänään, tauot, Tulossa 14 pv).
- **Pelaajadatan luvut riveillä (Katsaus, Käyttö) vain kattavuusportin yli** (D125, D139). Alle rajan rivillä "perheitä mukana 1/16", ei "0 %".
- **Esimerkkiseura (D167):** otsikkorivin linkki "Katso esimerkkiseura" avaa FC Demon omana tilanaan nauhalla "keksittyä dataa, ei sinun seurasi". Demo ei koskaan sekoitu oikeaan dataan.
- 0 pelaajan joukkueet eivät näy Kodissa (§7.18, `tmPelaajanJoukkueet`).

## PR C — Tilanne v2 (D147–D152, D170)
- Mockup 30 rakenne: otsikko + tulkintalause → neljä kysymyskorttia → (signaalikortti, ks. D170) → aikajana → huomiot joukkueittain + enintään 3 ehdotusta → Mittaus · Talentit · Syntymäkvartaalit → arkisto.
- **D170:** Käynnistys-vaiheessa Tilanteessa ei signaalikorttia ("Aloita jaksot" on Kodissa). Rytmi-vaiheessa signaali = jaksopalaverin valmius ("Kaksi katselmusta auki ennen palaveria" → Avaa esityslista).
- **Huomiot (D148):** yksi rivi per joukkue, selkokielinen lause, ikä/tila oikealla, koko rivi avaa joukkueen. Yli 12 kk vanha mittaus = "mittaus vanha · päivitä", ei tasona (D141).
- **Ehdotukset (D149):** teonsanaotsikko, perustelu yhdellä rivillä, uniikit tunnisteet + "+N", "Ota käyttöön" (reunanappi) + ⋯ (Muokkaa, Hylkää). Toiminnot toimintokartan (31 §5) mukaan.
- Typografia D169, yksi täytetty nappi (D147), tieto kerran (D150).
- Poista vanha koodi, jonka tämä korvaa (kasvukatto: VP_v25:ssä 77 riviä varaa; kaikki uusi `lib/tm_vp_tilanne.js`:ään).

## PR D — Koti: Rytmi-vaihe (D161, D162, D163, D166)
- Signaalikortti (tärkein asia) + Tällä viikolla -lista; joukkueet kolmella tasolla: ≤ 3 huomiokorttia, muut jaksolliset riveinä (tunniste, teema, "vk 3/6", kaksi lukua), jaksottomat tunnisteina; Käynnistyksen askeleet ohuena rivinä kunnes valmiit.
- Tekstirakenne D162 (yläotsikko aihe · joukkue, otsikko havainto, perustelu luku + tavoite + suunta + ikä, toiminto teonsana).

## Laatuportti jokaisessa PR:ssä (D168)
1. Kuvat 4 tilasta (390/1280, tumma/vaalea) PR:ssä, ero edelliseen korostettuna.
2. Taulukko: mockupin kohta → toteutus → poikkeamat; ja toimintokartta (toiminto → avautuu → kirjoittaa → rooli, D158).
3. **Tero hyväksyy kuvat ennen mergeä.** Näkymä-PR ei mene auto-kaistaan.
4. Deployn jälkeen tuotantokuva KPV:n Kodista ja Tilanteesta (Tero ottaa omalla VP-tunnuksellaan tai Code ohjeistaa).

## Rajat
- Ei `functions/`- eikä Rules-muutoksia. Jos jokin vaatii, raportoi ennen kiertotietä.
- Tekstit `vpT`:n kautta; uudet sv-avaimet uuteen Gemini-erään tyhjinä.
- Ei pelaajanimiä seuratason lohkoissa (§7.22).
- Testaus KPV:n VP-tunnuksella (Tero) ja fixtureilla, ei SA:lla.
