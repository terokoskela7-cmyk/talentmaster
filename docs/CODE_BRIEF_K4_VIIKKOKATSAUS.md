# CODE BRIEF · K4 — Viikkokatsaus ja jakson päätös (Pelaaja_v7 + henkilökunnan näkymä)

**Kaista: Tero** (Pelaaja_v7, Master_v16, VP_v25 ja `lib/`). PR-kuvauksen ensimmäinen rivi on "Kaista: Tero".

**Design:**
- `10_pelaaja_v7_kentta_suunnitelma.html` K4 (runko)
- `09_pelaaja_kentta.html` ("Sunnuntai · viikkokatsaus" -näkymä, lohkotaulukko)
- `12_jaksologiikka.html` (D21: kevyt katselmus kahden viikon ikkunassa)

Raportoi PR:ssä, mitä kohtaa kustakin noudatat.

**Edellytykset:** K1 (#852–#856) on mergetty. K1 jätti valmiiksi sunnuntain koukun (`#k1-sunnuntai`, tila `'sunnuntai'` funktiossa `tmTanaanTila`).

**Lippu:** kaikki uusi toimii vain, kun `TM_LIPUT.tmKenttaLippu` on päällä. Ilman lippua kaikki on ennallaan (snapshot-testi kuten K1).

**Ennen koodausta raportoi kolme asiaa:**
- **(a)** Onko v7:ssä nykyinen viikon check-in, jonka K4 korvaa lipun takana? Mistä se kirjoittaa ja mikä sitä lukee?
- **(b)** Onko jakson päätökselle jo olemassa valmentajan lause pelaajalle? Tarkista `jaksofokus_historia`-rivit, `reviewit/{pvm}` (`tmKirjaaKatselmus`) ja `tm_jakso_malli`n katselmus. Jos lause on jo olemassa, käytä sitä. Jos ei, katso kohta B.
- **(c)** Mitkä lukijat käsittelevät `kirjaukset/{pvm}`-dokumenttia: putki, kalenteri, Masterin aikajana ja kuormaseuranta? Kestääkö jokainen niistä dokumentin, jossa on pelkkä `viikkokatsaus` ilman `tyyppi`- ja `tehty`-kenttiä?

## A · Sunnuntain viikkokatsaus (pelaaja)

**Milloin näkyy:**
- Vain sunnuntaina (`tmPaivaIso()`, paikallinen päivä, §7.26), kun jakso on käynnissä ja ikävaihe ei ole Leikkijä (Leikkijä tulee K5:ssä).
- Vain kerran viikossa. Kun vastaus on tallennettu, kortin tilalle tulee kiitosrivi, ja seuraavalla avauksella kortti ei enää näy.
- Jos sunnuntai jää väliin, maanantaina ei muistuteta (§7.22: ei menetyksen pelkoa, ei putken katkeamista).

**Sisältö:**
- Tänään-sivun kärkeen kortti "Miten osat näkyivät pelissä?" ja alle lyhyt rivi siitä, että vastaus näkyy valmentajan katselmuksessa (09).
- Yksi kysymys per jakson osa, enintään kolme. Osat haetaan samalla tavalla kuin K1:ssä: ensin `jaksofokus.osat`, sitten konsepti ja sen kpi-tekstit. Jos osia ei ole, kysytään yksi yleiskysymys jaksosta.
- Vastausvaihtoehdot ovat kolme nappia (pill3): **Onnistui usein · Joskus · Ei vielä**. Ei lukuja, asteikkoa eikä vertailua.
- Valinnainen vapaa lause, enintään 140 merkkiä, KIELLETYT-vartijan läpi (`lib/tm_kielletyt.js`).

**Data:** tallennus `kirjaukset/{sunnuntain pvm}.viikkokatsaus` set-mergellä:

```
{
  vk,
  jakso_alkoi,
  vastaukset: [{ osa: 'A', teksti, arvo: 'usein' | 'joskus' | 'ei_viela' }],
  lause?,
  tallennettu   // ISO-aika; serverTimestamp ei toimi taulukossa, §7.6
}
```

- `teksti` on kopio osan tekstistä, koska konsepti voi myöhemmin muuttua.
- **Ei** kirjoiteta `tyyppi`-, `tehty`-, `lahde`- eikä putkikenttiä. Kohdan (c) perusteella lukijat korjataan ohittamaan dokumentti, jossa on pelkkä `viikkokatsaus`, tai valitaan toinen polku. Raportoi valinta.
- Rules ennallaan, jos pelaajan oma `kirjaukset`-luonti ja -päivitys riittävät (v3.42, `onPelaajaItse`). Tarkista emulaattoritestillä.

## B · Jakson päätös: "Hyvä jakso" ja valmentajan lause

- Kun jakso on päättynyt, Tänään näyttää kortin "Hyvä jakso", jossa on valmentajan lause pelaajalle. Kortti näkyy siihen asti, kunnes uusi jakso alkaa (K3 vie siitä valintaan). Siihen asti kortissa ei ole nappia.
- Jos lausetta ei vielä ole (kohta b), henkilökunnan katselmukseen lisätään valinnainen kenttä "Lause pelaajalle":
  - enintään 140 merkkiä
  - KIELLETYT-vartija
  - ei lukuja eikä mittausmuotoja (sama tarkistus kuin K1:n perustelussa)
  - kirjoitetaan samaan atomiseen kirjoitukseen kuin katselmus
- Kentän paikka: jakson historiariviin (`jaksofokus_historia`) tai pelaajadokumentin pikakenttään, jos historiarivi ei ole pelaajan luettavissa. Raportoi valinta ennen toteutusta.
- Lause jää myös Minä-välilehden jaksolistaan. Jos jaksolistaa ei vielä ole (K2), lause näkyy vain Tänään-kortissa, ja jaksolista tulee K2:ssa.
- Jos lausetta ei ole, kortissa lukee pelkkä "Hyvä jakso, [jakson nimi] tehty".

## C · Henkilökunta näkee viikkokatsaukset

- Masterin pelaajakortin jaksonäkymään (ja VP:hen samalla komponentilla) tulee osio "Pelaajan viikkokatsaukset". Siinä on kuluvan jakson viikot, ja jokaisella viikolla osa → vastaus sekä lause, jos pelaaja kirjoitti sellaisen.
- Lyhyt tiivistelmä katselmusikkunaan, esimerkiksi "A: usein 3/4 viikkoa". Henkilökunta saa nähdä luvut, pelaaja ei (§7.22).
- Joukkueen yhteenveto (montako vastasi) jää myöhemmäksi, ei tässä.

## Kieli ja ulkoasu

- Kaikki uudet tekstit `tm_lang`- tai `masterT`-avaimiksi (fi). Ruotsinkieliset avaimet jätetään määrittelemättä, ja ne listataan PR:ään Geminin listalle.
- Pelaajalle vain T1- ja Kenttä-tokenit. Archivo vain näyttöteksteihin. Ei hex-värejä.
- Uudet ja muuttuneet lib-tiedostot saavat `?v`-bumpin. Portti `tests/lib_versiot.test.js` vahtii tätä; aja `node scripts/lib_versiot.js --kirjoita`.
- Jos SW-strategia muuttuu, nostetaan myös SW-cache.

## Testit

- Puhtaat funktiot:
  - näkyvyys (sunnuntai, jakso käynnissä, ei Leikkijä, ei jo vastattu)
  - kysymykset osista (0–3 osaa, yleiskysymys)
  - tallennusolio
  - KIELLETYT-tarkistus lauseelle
  - jakson päätöskortin tila (lause / ei lausetta / uusi jakso alkanut)
  - henkilökunnan tiivistelmä
- §7.22-portti: pelaajan HTML:ssä ei lukuja, X/5-muotoja eikä vertailua.
- Lukijoiden regressiotestit kohdan (c) mukaan: putki ja kalenteri eivät muutu, kun dokumentissa on pelkkä viikkokatsaus.
- Rules-emulaattori: pelaaja kirjoittaa oman viikkokatsauksensa, mutta toisen pelaajan katsausta ei. Huoltaja ei kirjoita katsausta (K5 erikseen).
- Käsin, KPV U13, lippu päällä:
  - simuloitu sunnuntai (testipäivä-injektio, ei järjestelmän kellon muutosta)
  - vastaus → kiitos → kortti ei enää näy
  - päättynyt jakso lauseen kanssa ja ilman lausetta
  - Masterissa valmentajana ja VP:nä
  - mobiili 390 px
- Koko sarja viimeisen main-mergen jälkeen.

## Ei tässä

- Reitin valinta ja seuraavaan jaksoon siirtyminen (K3)
- Minä-kenttä ja jaksolista (K2)
- Leikkijä ja huoltaja (K5)
- joukkueen viikkokatsausyhteenveto
- muistutukset ja notifikaatiot
