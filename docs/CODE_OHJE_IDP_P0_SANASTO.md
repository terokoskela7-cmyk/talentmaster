# CODE — P0: Jaksofokus-seed ↔ arviointitaksonomia -sanastolinjaus

**Tyyppi:** datasisältö (ei skeemamuutos) + testit + cache-bump. **Yksi PR.**
**Kohde:** `lib/tm_jaksofokus.js` (`TM_JF_KONSEPTIT`) · `tests/tm_jaksofokus.test.js` · cache `?v=` (VP + Master).
**Design-totuus:** tiekartta-artefakti *"IDP-kortti — toteutustiekartta"* vaihe **P0**. Tämä ohje on itsenäinen.

## Miksi

Jaksofokuksen seed-konseptit (`TM_JF_KONSEPTIT`) ja arviointitaksonomia (`lib/tm_arviointi_taksonomia.js`) ovat kaksi eri sanastoa samoille ulottuvuuksille. Kaksi konkreettista virhettä:

- **Johtajuus & Kommunikaatio** ovat JF-seedissä `sosiaalinen`-domeenissa, mutta taksonomiassa ne ovat **D3** (kategoria `psykologia`). D3 on se ulottuvuus jolla on kolmiomittaus (pelaajan itsearvio × valmentaja × VP + varmuus-lippu) — johtajuus/kommunikaatio kuuluvat sinne.
- **Pelin lukeminen** on JF-seedissä `psyykkinen`, mutta se on **D4 Peliälyä** (football sense), ei D3. Se ei kuulu psyykkinen-seediin lainkaan (D4 tulee teknis-taktisen currikulasta).

**Päätös:** jaksofokuksen `psyykkinen`- ja `sosiaalinen`-seedien konseptit vedetään **suoraan arviointitaksonomiasta** — sama `avain` kummassakin → arviosta noussut heikkous (taksonomia-kohta ≤2) mäppäytyy suoraan oikean domeenin jaksofokus-konseptiin. Yksi sanasto per ulottuvuus.

**Validoitu virallista lähdettä vasten (Palloliitto-arviointilomake):** D3 = *Competitiveness* + *Psychological factors* + *Training mentality* (12 kohtaa, täsmää 1:1). **Leadership & Communication ovat lomakkeessa "Psychological factors" -otsikon alla → D3** (ei sosiaalinen). Asteikko lomakkeessa **P/A/G/VG/E** (= 1–5; UI-labelit P3:ssa). Huom: **D5 Sosiaalinen ei ole Palloliittoa** — se on TM:n 5D-laajennus (2 kohtaa: Joukkuerooli, Vuorovaikutus); seed on siksi ohut suunnitellusti.

## Mitä tehdään

Korvaa `TM_JF_KONSEPTIT`-olion `psyykkinen`- ja `sosiaalinen`-taulukot alla olevilla. **Avaimet ja nimet = taksonomian D3/D5-kohdat** (`tm_arviointi_taksonomia.js`); `kuvaus` + `cue` on tässä valmiiksi kirjoitettu (Rakentaja-ääni: cue on avaava kysymys, ei käsky). **`koodi`-kenttä poistetaan** (tarpeeton; writer `_vpJfAsetaKehitysFokus` käyttää `k.koodi || null` → toimii ilman).

```js
var TM_JF_KONSEPTIT = {
  // ── D3 Psyykkinen (Henkinen) — avaimet = taksonomia D3 (kategoriat: kilpailullisuus · psykologia · harjoitusasenne) ──
  psyykkinen: [
    { avain: 'scoring_drive',    nimi: 'Maalinteon halu',    kuvaus: 'Haluaa tehdä ja luoda maaleja, hakee ratkaisua paikasta.',        cue: 'Missä paikassa uskot tekeväsi eniten maaleja?' },
    { avain: 'attitude',         nimi: 'Asenne',             kuvaus: 'Suhtautuminen harjoitteluun ja peliin — ryhti ja sinnikkyys.',    cue: 'Mikä sai sinut yrittämään kovemmin viime pelissä?' },
    { avain: 'work_ethic',       nimi: 'Työmoraali',         kuvaus: 'Tekee työn loppuun myös kun on rankkaa.',                        cue: 'Milloin teit enemmän kuin oli pakko?' },
    { avain: 'consistency',      nimi: 'Tasaisuus',          kuvaus: 'Suoritustaso pysyy samana pelistä toiseen.',                     cue: 'Mikä auttaa sinua onnistumaan joka kerta samoin?' },
    { avain: 'leadership',       nimi: 'Johtajuus',          kuvaus: 'Ottaa vastuuta, näyttää suuntaa ja kannustaa joukkuetta.',       cue: 'Miten autoit joukkuettasi viime pelissä?' },
    { avain: 'communication',    nimi: 'Kommunikaatio',      kuvaus: 'Ohjaa ja tukee pelikavereita äänellä ja elekielellä.',           cue: 'Mitä sanoit kaverille ennen ratkaisua?' },
    { avain: 'confidence',       nimi: 'Itseluottamus',      kuvaus: 'Uskoo omiin ratkaisuihinsa myös paineessa.',                     cue: 'Milloin viimeksi uskalsit yrittää vaikeaa ratkaisua?' },
    { avain: 'body_language',    nimi: 'Kehonkieli',         kuvaus: 'Ryhti ja eleet viestivät valmiutta ja rohkeutta.',               cue: 'Miltä kehosi näyttää, kun peli sujuu parhaiten?' },
    { avain: 'training_load',    nimi: 'Kuorman sieto',      kuvaus: 'Jaksaa harjoitella ja palautuu kuormituksesta.',                 cue: 'Mikä auttaa sinua palautumaan kovan viikon jälkeen?' },
    { avain: 'desire_improve',   nimi: 'Kehittymisen halu',  kuvaus: 'Haluaa tulla paremmaksi ja hakee palautetta.',                   cue: 'Mitä haluaisit oppia seuraavaksi?' },
    { avain: 'inner_motivation', nimi: 'Sisäinen motivaatio',kuvaus: 'Tekee itsensä vuoksi, ei vain ulkoisesta paineesta.',            cue: 'Miksi haluat kehittyä juuri tässä?' },
    { avain: 'learning_ability', nimi: 'Oppimiskyky',        kuvaus: 'Ottaa ohjeen vastaan ja soveltaa sen peliin nopeasti.',          cue: 'Mitä opit viime harjoituksesta?' }
  ],
  // ── D5 Sosiaalinen — avaimet = taksonomia D5 (kaksi kohtaa; malli on tämä, ei keksitä lisää) ──
  sosiaalinen: [
    { avain: 'team_role',          nimi: 'Joukkuerooli',  kuvaus: 'Tuntee roolinsa joukkueessa ja täyttää sen.',                cue: 'Mikä on tärkein tehtäväsi joukkueessa?' },
    { avain: 'social_interaction', nimi: 'Vuorovaikutus', kuvaus: 'Toimii rakentavasti kavereiden ja valmentajien kanssa.',     cue: 'Miten sait kaverin mukaan viime harjoituksessa?' }
  ]
};
```

**Poistuvat vanhat avaimet** (retire): `rohkeus`, `keskittyminen`, `tunteiden_hallinta`, `pelin_lukeminen` (psyykkinen) · `johtajuus`, `kommunikaatio`, `joukkuepeli`, `ammattimaisuus` (sosiaalinen, vanhat avaimet — huom. `leadership`/`communication` korvaavat johtajuus/kommunikaatio D3:ssa).

### Muut muutokset

1. **Tarkista ristiviittaukset:** `git grep -nE "'(rohkeus|keskittyminen|tunteiden_hallinta|pelin_lukeminen|joukkuepeli|ammattimaisuus)'"` — jos jokin koodi (ei testi) viittaa vanhoihin avaimiin jaksofokus-konseptina, päivitä. (Odotus: ei osumia paitsi seed itse + testit.)
2. **Cache-bump:** `lib/tm_jaksofokus.js` sisältö muuttuu → `?v=4 → ?v=5` **molemmissa** lataavissa HTML:issä (VP_v25 + Master_v16).
3. **Testit** (`tests/tm_jaksofokus.test.js`): JF-1-testit viittaavat vanhoihin avaimiin/koodeihin — päivitä:
   - `tmJfKonsepti('psyykkinen', 'rohkeus')` → `tmJfKonsepti('psyykkinen', 'leadership').nimi === 'Johtajuus'` (tms. uusi avain).
   - `tmJfKonsepti('sosiaalinen', 'S1')` (koodi-haku) → poistuu koodit; hae avaimella `tmJfKonsepti('sosiaalinen', 'team_role')`.
   - `tmJfKonseptit('sosiaalinen').length >= 3` → **`=== 2`** (D5:ssä on 2 kohtaa).
   - `tmJfKonseptit('psyykkinen').length >= 3` → pysyy vihreänä (nyt 12).
   - Lisää: **avain-linjaustesti** — jokainen psyykkinen/sosiaalinen seed-`avain` löytyy myös arviointitaksonomiasta samalla `dim`:llä (D3/D5). Tämä lukitsee sanaston yhteen.

## Reunaehdot

- **Vain seed-sisältö muuttuu** — `tmJfVaihtaaDomeenin`, arkistointi, `_vpJfKehitysHTML`, writer eivät muutu. `konsepti_koodi` writerissa toimii `|| null` -haaralla.
- **Ei datamigraatiota:** olemassa oleva `p.jaksofokus`, jossa on vanha avain (esim. `johtajuus`), näyttää yhä tallennetun `konsepti_nimi`:n — pickerin esivalinta vain ei osu. JF-1/2 juuri julkaistu → tuskin yhtään psyykkinen/sosiaalinen-jaksofokusta olemassa; ei tarvetta migraatiolle. (Jos haluat siistin: erillinen data-fix myöhemmin, ei tässä.)
- **Alaikäiset read-only** (Eino·Leo·Emil); **Topias = testi-OK**.
- **Ei Rules-muutosta** (seed on kirjastodataa, ei Firestore-kenttä).
- **D3/D5 = kehityskonsepteja, EIVÄT kliinistä tietoa.**
- **Brändi:** ei UI-muutosta tässä (pelkkä data); picker renderöi uudet konseptit sellaisenaan.

## DoD

1. `TM_JF_KONSEPTIT` psyykkinen = 12 taksonomia-D3-avainta, sosiaalinen = 2 taksonomia-D5-avainta; koodit poistettu.
2. `git grep` vanhoista avaimista → ei koodiosumia (vain seed + päivitetyt testit).
3. Cache `?v=5` molemmissa HTML:issä.
4. Vitestit vihreinä; uusi avain-linjaustesti (seed ⊂ taksonomia per dim) mukana.
5. Editorin picker näyttää molemmissa domeeneissa oikeat konseptit (screenshot molemmat teemat).
6. Pieni PR; kuvaus linkkaa tiekartta P0:aan. **Verifioi live ennen mergeä.**
