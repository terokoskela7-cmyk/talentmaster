# K4b — Kehityskeskustelu uudelle sivulle (erä 84)

Lähde: `.briefit/CODE_BRIEF_KTP_VALMIIKSI_K4C_K4B_K1E.md` osio K4b + PM:n vastaus vaiheeseen 0 (21.10.2026). Kaista: Tero. Ei Rules-muutoksia. Tehty origin/mainin päältä (ei pinottu).

## Tavoite
Uudella Kehitystyöpöytä-sivulla (`TalentMaster_Kehitystyopoyta.html`) on pitkä sheet (D100) "Kehityskeskustelu", jolla valmentaja tai VP kirjaa keskustelun sisäisesti. Vanha puoli (Master, VP) jää ennalleen.

## Päätökset (PM)
1. Vain sisäinen: ei "Näytä myös pelaajalle" -kytkintä, ei uutta pelaajadokumentin kenttää, ei pelaajanäkymää (tulee myöhemmin K4b2:na).
2. Neljä aluetta (ent. Nelikulma) vain lukuna olemassa olevasta datasta (`jaksofokus.domeeni` + `jaksofokus_historia[].domeeni`, sama lähde kuin VP:n Reviewit-rivi). Laskenta siirretään libiin (`TM_KT_KESKUSTELU.tmKeNelikulma`); VP:n `_vpNelikulma` delegoi siihen.
3. `review_viimeisin_tyyppi: 'kehityskeskustelu'`; rytmi nollautuu `tmKirjaaKatselmus`-kirjoituksella → `tmRytmi` (sovellus + push samaa mieltä; pariteettitesti).
4. Sama `reviewit/{pvm}`-dokumentti kuin jakson yhteenvedolla, eri kentät (merge): `sovitut_sisainen`, `kk_*`. Ei kosketa `lause_sisainen`, `kevyt`, `hylkays_sisainen`.
5. Sisääntulot: (a) Tänään-rytmikortin "Kirjaa kehityskeskustelu" (`keskustelu: true`, sama `tmRytmi`-sääntö kuin kortilla), (b) Polun Kehityssuunnitelma-otsikon viereinen toissijainen nappi, (c) Jakson yhteenveto -ikkunan "Kehityskeskustelu"-nappi (`syvennaFn`) avaa oikean keskustelun; ⋯-valikon 'syvenna' samaan sheettiin.
6. Kausitavoitteen ehto uudella sivulla: voimassa oleva tavoite (`tmKtPolkuKausi != null`). Ehdotus/luonnos: "Kauden tavoite odottaa hyväksyntää" + nappi joka avaa kausitavoite-sheetin (Aktivoi). Ei tavoitetta: toimintaohje + "Aseta kauden tavoite" (avaa `_kausiSheet`).
7. Pelaajaraportti-linkki = sama `_avaaPelaajaraportti` kuin Profiilin "Pelaajaraportti ↗".
8. Historian rivi "Kehityskeskustelu {pvm}" + sisäinen teksti + tekijän rooli (VP/valmentaja).
9. Kirjoittajat: valmentaja ja VP (`_voiKirjoittaa`); D3-kirjoitukset ennallaan.
10. Luonnos: D100-sheetin muistiluonnos + per pelaaja selaimen tallennukseen (try/catch), tyhjennetään tallennuksen jälkeen.

## Sheetin rakenne
1. Kauden tavoite ja jaksot lyhyesti (henkilökunnalle)
2. Pelaajan oma arvio vs valmentajien arvio (`renderD3VertailuHTML`, `d3_viimeisin.pisteet`) + "Hyvä aihe keskusteluun" (erot ≥ 1.5) + pelihavaintojen määrä
3. Neljä aluetta (nykyinen fokus / arvioitu / ei arvioitu)
4. Sovitut asiat ja seuraava askel (vapaa teksti, pakollinen)
5. Kauden tavoitteen tarkistus: pidetään / muutetaan (muutetaan → tallennuksen jälkeen avautuu kausitavoite-sheet)
6. Pelaajaraportti ↗

## Kirjoitus (YKSI batch)
- `reviewit/{pvm}` (set merge): `tyyppi:'kehityskeskustelu'`, `pvm`, `sovitut_sisainen {teksti, lahde, uid, tallennettu}`, `kk_tallennettu`, `kk_kausitavoite ('pidetaan'|'muutetaan')?`, `kk_tekija_uid`, `kk_tekija_rooli`.
- Pelaajadokumentti (set merge): `review_viimeisin_pvm`, `review_viimeisin_tyyppi:'kehityskeskustelu'` (aiempaa myöhäisempi pvm säilyy, `tmKirjaaKatselmus`).
- Poikkeama PM:n sanamuodosta: tekijä tallennetaan `kk_tekija_uid`/`kk_tekija_rooli`, koska `tekija_uid`/`tekija_rooli` ovat vanhojen polkujen kenttiä samassa dokumentissa (merge ei saa ylikirjoittaa toisen kenttiä).

## Koodi
- `lib/tm_kt_keskustelu.js` (logiikka, HTML, tekstit FI, historiarivit, kausitila) ja `lib/tm_kt_keskustelu_sheet.js` (sheet-ohjain). Kuori vain kytkee (`TalentMaster_Kehitystyopoyta.html`).
- `lib/tm_kt_polku.js`: otsikkonappi + Historian keskusteluriville; `lib/tm_kt_arviointi.js`: `syvennaFn`; `lib/tm_kt_sivu.js`: reitit; `TalentMaster_VP_v25.html`: `_vpNelikulma` delegoi libiin.
- i18n erä 84: FI-avaimet, sv tyhjä (`docs/i18n/sv_kaannoserae_84_gemini.json`, ODOTTAVAT_ERAT, LIB_SV_ODOTTAA).

## Testit
Kirjoitus + rytmin nollaus (pariteetti push), kausitila-haarat, sisäinen teksti ei pelaajalle (Rules-emulaattori, olemassa olevat polut), luonnos säilyy sulkiessa, ei kauden tavoitetta → ohje, sanasto (k1d_sanasto), Historia, selaintesti, kuvat 1280 + 390 (`docs/ui-kuvat/k4b/`).
