# CODE BRIEF · T1 — Harjoitepankin tuonti v2 (KPV ensin, Pallo-Iirot seuraavaksi)

**Kaista: Tero** (`scripts/` datakirjoitus + `storage.rules` + `lib/`). PR-kuvauksen 1. rivi "Kaista: Tero". DRY-RUN oletuksena; `--apply` vain Teron hyväksynnällä.
**Design:** `14_joukkueen_viikko_kentta.html` D29 (harjoitepankin kentät ja hakuavaimet). Ei UI-muutoksia tässä PR:ssä.

## ⚠ Seuran aineisto EI repoon
Repo on julkinen. KPV:n ja Pallo-Iirojen harjoitetekstit ja kuvat ovat seuran omaa aineistoa. Tero antaa tiedostot paikallisesti (polku argumenttina). Niitä ei commitoida, ja testit käyttävät keksittyjä fixtureja. Lisää `.gitignore`en `aineisto/` tai vastaava, jos tarvitset paikallisen kansion.

## Syötteet
1. **KPV (nyt):** `kpv_harjoitteet.json` (89 harjoitetta, `meta` + `harjoitteet[]`) ja `kpv_harjoitteet_kuvat.zip` (81 kaaviokuvaa `kuvat/<id>.jpg`; ei valokuvia pelaajista). Kentät: id, nimi, pankki, teema, ryhma, tyyppi, ika[] (ikäkaistat "alle 8", "8–9", …), vuodet, jaksot ("Vuosi 1: 1, 4, 9"), pelaajat ("6 pelaajaa"), kesto, kentta ("10 x 20", "koko kenttä", tyhjä), intensiteetti, tavoite, jarjestely, kulku, valmennuspisteet, helpota, vaikeuta, tasot[] ({taso, ohje, mittari}), tags, huom, lahde, kuvat.
2. **Pallo-Iirot (kun Excel palaa):** `PalloIirot_harjoitepankki_tarkistettavaksi.xlsx`, välilehdet Harjoitteet (KUITTAUS, YLEINEN_KIRJASTO) ja Matriisi.

## Kohdeskeema `seurat/{sid}/harjoitepankki/{id}` (additiivinen, vanhat kentät ennallaan)
Nykyiset `nimi, lahde:'seura', tyyppi:'T', tila, kaytto, versio, lahde_viite` säilyvät (Rules v3.40–42). Lisäksi:
`pelikonteksti` (teema) · `painopiste` · `laatutekija` · `rakenne` (KPV `tyyppi` → Tekniikka, Kamppailupelit, Pienpelit, Lämmittely, Nopeus ja ketteryys; Pallo-Iirot → leikki, muokattu peli, …) · `maalinteko` · `pelaajamaara {min, max}` · `alue_m {pituus, leveys} | null` + `alue_teksti` (alkuperäinen; "koko kenttä" → `alue_m: null`, `alue_tyyppi: 'koko'`) · `kesto_min` · `tavoite` · `jarjestely` · `kulku` · `valmennuspisteet` · `helpota` · `vaikeuta` · `saannot` · `kysymykset[]` · `tasot[] {taso, ohje, mittari}` · `ika_min, ika_max` (johdettu: KPV:n ikäkaistoista tai Pallo-Iirojen koodeista G6 = 6 v, F9 = 9 v, …; alkuperäinen `ika_teksti`) · `vuosikello[] {vuosi, jaksot[]}` (KPV: "Vuosi 1: 1, 4, 9") · `tags[]` · `kuva_url` · `huom`.
- `kaytto` oletus `'joukkue'`. `koti` vain, jos lähde sanoo niin (KPV: ei).
- **ID:** lähteen id (`kpvh_01`, `pi_u9_04`), jotta uudelleenajo päivittää eikä tuplaa.
- **Tila:** KPV:n aineisto on seuran omaa, jo kuratoitua → `hyvaksytty`, `tarkistaja` argumentista. Poikkeus: `kpvh_88` (huom: SoccerTutor-kortti) → `luonnos` + `kolmas_osapuoli: true`; dry-run listaa sen. Pallo-Iirot: kuittauksen mukaan kuten SJK:n kaksi ajoa.
- **YLEINEN_KIRJASTO** (Pallo-Iirot): tallennetaan seuran dokumenttiin kenttänä `jako_lupa: true|false`. Kopiointia TM:n yleiseen kirjastoon EI tehdä tässä PR:ssä.

## Kuvat
- Storage-polku `seurat/{sid}/harjoitepankki/{id}.jpg`. **Storage Rules -lisäys:** luku oman seuran henkilökunnalle ja SA:lle, kirjoitus SA:lle (tuontiskripti Admin SDK:lla). Pelaajalle ei lukua tässä vaiheessa. Rules-testi.
- `kuva_url` = Storage-polku (ei julkista download-URL:ää). Sovellus hakee kuvan henkilökunnan tunnuksella.
- Pallo-Iirojen diakuvat renderöidään PPTX:stä samaan polkuun (Tero antaa PPTX:n). Tämä voi jäädä seuraavaan PR:ään, jos se kasvattaa tätä liikaa.

## Vanhat KPV-rivit
Firestoressa on 35 KPV:n harjoitepankkiriviä aiemmasta testituonnista. Dry-run listaa ne. `--apply` merkitsee ne `arkistoitu: true` (ei poistoa), jos Tero antaa `--arkistoi-vanhat`. Valikot jättävät arkistoidut pois (V1 tekee jo näin; tarkista).

## Lib
`lib/tm_harjoitepankki.js` (pure): `tmHarjoiteNormalisoi(rivi, lahdeMuoto)` → kohdeskeema. Siihen kuuluvat koon ja pelaajamäärän jäsennys sekä ikäkaista/koodi → `ika_min/max`. Lisäksi `tmHarjoiteHaku(pankki, {alue_m, pelikonteksti, painopiste, ika})` D29:n hakusäännöllä: koko ±30 % rajaa, konteksti ja painopiste ratkaisevat, ikä suodattaa; "koko kenttä" -harjoite osuu vain, kun aluetta ei ole annettu tai se on ≥ 60 × 40 m. Haku on vasta valmiina viikkonäkymää varten, käyttöön se tulee myöhemmin.

## Testit
- Normalisointi: kaikki KPV:n kenttämuodot ("10 x 20", "koko kenttä", tyhjä, "6 pelaajaa", "4v4+mv", ikäkaistat, "Vuosi 1: 1, 4, 9") ja Pallo-Iirojen muodot ("25-30m x 18-22m", "G7-F8").
- Haku: koko, konteksti ja ikä; arkistoidut pois.
- Rules: harjoitepankin uudet kentät eivät riko v3.40–42 -sääntöjä (pelaaja lukee yhä vain `hyvaksytty` + `koti`). Storage: toisen seuran henkilökunta ei lue.
- Dry-run-raportti: uudet / päivitetyt / arkistoitavat / luonnokseksi jäävät / jäsentymättömät kentät.
- Koko sarja.

## Raportoi
Dry-run-tuloste KPV:lle (montako hyväksytty, luonnos, arkistoitava, kuvia ladattavana), ja odota Teron hyväksyntää ennen `--apply`a.
