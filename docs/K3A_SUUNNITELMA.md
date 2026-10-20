# K3a — Anna pelaajan valita + Hylkää valinta uudelle Kehitystyöpöytä-sivulle (erä 74)

Lähde: `.briefit/CODE_BRIEF_K3_KEHITYSTYOPOYTA.md` (K3a, inventaario #1 ja #2). Kaista: Tero. Lipun `liput.kehitystyopoyta_v2` takana; ilman lippua mikään ei muutu. Ei uusia Firestore-kenttiä, ei Rules-muutoksia.

## Suunnitelma (kirjoitettu ennen koodia)
1. **Anna pelaajan valita** (Tänään ⋯, Polku ⋯): `anna_valita` avaa uuden sivun Sulje jakso -sheetin (`lib/tm_kt_arviointi.js`) K3-tarjousosio auki. Sama lib kuin Masterissa ja VP:ssä: `tmKkSheetHTML` + `opts.k3` -> `tmTarjousOsioHTML`, kirjoitus `tmKkTallennus` (tarjous + sulku = yksi batch, `ydinvahvuus_valinta` pois). Ehdotukset (`tmJaksoEhdotukset` -> `tmTarjousKortit`) kootaan sivun glue-koodissa samoilla syötteillä kuin Masterissa (`TM_NAYTTO_LOHKOT.ttItems`, `tmKonseptiResolvoi`, `TM_ARVIOINTI_SILTA`); varsinainen logiikka on jo libissä.
2. Tavallinen "Sulje jakso" pysyy ilman K3-osiota (D248); osio tulee vain, kun valmentaja valitsee "Anna pelaajan valita".
3. **Ehto:** `anna_valita` on käytettävissä vain kun ydinvahvuuden kuvaus on asetettu (`tmJaksoTila` ennallaan). Valikon harmaaseen riviin lisätään lyhyt syy (valinnainen `opts.syyT`, jotta Masterin ja VP:n DOM ei muutu).
4. **Hylkää valinta** (`valinta_tehty`): uusi `lib/tm_kt_hylkaa.js` (sheet-kuori) käyttää olemassa olevia `tmHylkaaAlku` / `tmHylkaaSheetHTML` / `tmHylkaaTallennus`; kirjoitus yksi `update`: `jaksofokus` + `ydinvahvuus_valinta` delete (kuten Masterissa).
5. **Vaihe 0 -kytkin Hylkää-sheetissä:** "Näytä myös pelaajalle" oletus pois (`tmHylkaaAlku` ctx.kytkin, vain uusi sivu; Master/VP ei välitä kytkintä -> käytös ennallaan). Pois = perustelua ei tallenneta pelaajan luettavaan `jaksofokus.hylatty.perustelu`-kenttään. Sisäinen tallennuspaikka on avoin kysymys (ks. PR:n avoimet kysymykset), koska se vaatisi uuden kentän.
6. **Reititys:** `lib/tm_kt_sivu.js` `TOIMI_REITIT`: `anna_valita`, `hylkaa` -> `sheet`. `_ktToimi` kutsuu sheetit; tila päivittyy `_nayta()`:lla heti tallennuksen jälkeen (Tänään-signaali ja Polun jaksokortti ilman latausta).
7. **Tekstit:** uudet avaimet erään 74 (`docs/i18n/sv_kaannoserae_74_gemini.json` + kopio `.briefit/`), `LIB_SV_ODOTTAA`. Code ei kirjoita ruotsia.
8. **Testit:** lib-yksikkötestit; selaintestit (valmentaja + VP): tarjous lähtee uudelta sivulta, pelaajan valinta näkyy, hylkäys palauttaa valintatilaan, ilman kuvausta toiminto pois; Master/VP-testit ennallaan. Kuvat 390 tumma + 1280 vaalea.

## Poikkeamat briefistä
- Ehdotusten syötteiden kokoaminen jää sivun glueen (kuten `tm_kt_jakso.js` tekee `tmKtPp`:lle), ei Masterin/VP:n koodin siirtoa: Masterin ja VP:n syötteet eroavat (`_devIkaSp` / `_dimIkaSp`, VP kanonisoi nimet) ja niiden koskeminen rikkoisi "Master ja VP ennallaan" -ehdon. Ydinlogiikka (`tmJaksoEhdotukset`, `tmTarjousKortit`, `tmTarjousOlio`) on jo yhteinen lib.

## Merge-muistiinpano
Jos tämä PR mergetään K3b:n (tai K1b:n) kanssa: merge mainista (ei rebasea), aja `node scripts/lib_versiot.js --kirjoita` ja `node scripts/kuoret_kasvukatto.js --kirjoita`, nosta `?v`- ja SW-versiot.
