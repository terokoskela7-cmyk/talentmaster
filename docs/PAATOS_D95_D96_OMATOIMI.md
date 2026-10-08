# D95–D96 · Omatoimiharjoittelu: kenen kanssa ja pariharjoitteet · ehdotus 9.10.2026

Molemmat ovat **ehdotuksia**. Tero lukitsee. Liittyvät: D55 (mediaviesti), D71 (Leikkijä-rivi, perheen kuittaus), §7.22, §25.
Esitys: omatoimiharjoittelun dia ("Harjoittelu jatkuu kentän ulkopuolella – yhdessä").

## D95 · Omatoimikirjaus: kenen kanssa

**Ehdotus:** omatoimiharjoitteen kirjaukseen yksi vapaaehtoinen valinta **Kenen kanssa? Yksin · Kaverin kanssa · Perheen kanssa.** Ei pakollinen.
**Peruste:** "yhdessä" on omatoimiharjoittelun lupaus, ja Pulssin Leikkijä-rivi (D71) tarvitsee perheen oikeaa tekemistä, ei pelkkää käyntiä sovelluksessa.

**Data**
- `seurat/{sid}/pelaajat/{pid}/kirjaukset/{pvm}.kenen_kanssa: 'yksin' | 'kaveri' | 'perhe'` (puuttuu = ei valittu). Olemassa oleva kokoelma.
- Kirjaus on päiväkohtainen: valinta koskee päivää. Jos samana päivänä on kaksi omatoimiharjoitetta, viimeisin valinta jää voimaan (hyväksytään v1:ssä).
- Ei kaverin nimeämistä eikä toisen pelaajan merkitsemistä v1:ssä (toisesta lapsesta ei kerätä tietoa).
- Video vain linkkinä (R6.4, D55).

**Kuka näkee mitä**
| Rooli | Näkee |
|---|---|
| Pelaaja | oman valintansa, ei lukuja eikä vertailua (§7.22) |
| Huoltaja | oman lapsen viikko sanoin ("harjoitteli pihalla perheen kanssa"), ei lukumääriä |
| Valmentaja / VP | joukkuetaso ("Omatoimi tehty 14/18", "Yhdessä tehty 9"); pelaajarivillä valinta |
| Pulssi (D71) | Leikkijä-rivin "perhe mukana" (ks. alla) |

**PM:n tarkennukset (9.10.)**
1. **Huoltajan "teimme yhdessä" jo v1:ssä:** Rulesissa on `onU12Huoltaja`, ja U12-huoltaja kuittaa jo jakson kotitehtävän (`jakso_kuittaus`, v3.37). Huoltajan `kenen_kanssa:'perhe'` kulkee samaa polkua. Ehdot: `email_verified` ja `suostumusTila == 'annettu'` (sama linja kuin B4).
2. **D71 tarkentuu:** "perhe mukana" = kirjaukset, joissa `kenen_kanssa == 'perhe'` **tai** huoltajan kuittaus. Kooste v4:n `n_perhe_kuittaus_7` määritellään näin (S2-briiffi päivitetään lukitsemisen jälkeen).
3. **Rules:** pelaajan `kirjaukset/{pvm}`-kirjoituksella ei nyt ole kenttärajausta → `kenen_kanssa` enum-validointi on uusi tarkistus; huoltajan kirjoitus vain `kenen_kanssa` (+ aikaleima). Seuraava vapaa versio + changelog + testit.
4. Huoltajan *luku* `kirjaukset`-kokoelmaan (`onLapsenHuoltaja`) on nyt ilman suostumustarkistusta: kiristetään samalla linjalla kuin B4 (ei estä D95:tä).

**Rajat:** fyysinen omatoimiharjoite kulkee §25:n kuormarajoittimen kautta. sv-avaimet tyhjiksi, käännös Geminin kautta.

**Testit (vähintään):** pelaaja kirjoittaa omaansa ✓, toisen ✗ · enumin ulkopuolinen arvo ✗ · U12-huoltaja kirjoittaa `perhe` ✓, ilman suostumusta ✗, väärä huoltaja ✗ · valmentaja/VP näkee joukkuesumman, toinen seura ✗ · pelaajan ja huoltajan näkymässä ei lukumääriä.

## D96 · Pariharjoitteet: kaveri harjoittelee omaa tavoitettaan

**Havainto (Tero 9.10.):** Topiaksen appissa näkyi syöttöharjoite kaverin liikkeeseen. Sen voisi tehdä kaverin kanssa, jolla on sama kotitehtävä. Tai jos tavoite on kuljettaminen tai ohittaminen, kaverilla voi olla sama tavoite tai vastakkainen, esim. puolustaminen. Silloin kaveri ei ole vain seurana, vaan molemmat harjoittelevat omaa juttuaan.

**Raja:** pelaajan kehityskohde on hänen omaa tietoaan. Sovellus ei kerro pelaajalle toisen lapsen tavoitetta ("Ainolla on sama tavoite") eikä vertaa pelaajia (§7.22).

**Ehdotus kahdessa vaiheessa**
1. **Harjoitteen pariroolit (v1):** harjoitepankin harjoitteeseen valinnainen pariversio, esim. `pari: { a: 'syöttää liikkeeseen', b: 'liikkuu' }` tai `{ a: 'hyökkää 1v1', b: 'puolustaa' }`. Pelaaja näkee: "Tämän voi tehdä kaverin kanssa: sinä syötät, kaveri liikkuu." Pelaaja valitsee kaverin itse; kenenkään tietoja ei näytetä toiselle. Kirjaus = D95 "kaverin kanssa". Pariversio kuuluu harjoitepankin hyväksyntään (`tila: 'hyvaksytty'`, v3.41).
2. **Valmentajan parit (seuraava vaihe):** valmentaja näkee joukkueen kehityskohteet jo nyt ja voi muodostaa viikon parit: sama tavoite tai toisiaan täydentävät roolit. Pelaajalle näkyy vain "Tämän viikon harjoituskaveri: Leo", ei syytä. Myöhemmin järjestelmä voi *ehdottaa* pareja valmentajalle, mutta ihminen päättää. Valmentajalle voi näkyä "pareittain tehty", kun pari on hänen muodostamansa.

**Avoimet Terolle:** v1:n pariroolien määrä harjoitepankissa (kuka kirjoittaa: seura vai TM-pohja) · näkyykö valmentajan muodostama pari huoltajalle (ehdotus: kyllä, pelkkä kaverin etunimi) · ryhmät (R1) vs. parit: pari on kevyempi kuin ryhmä, ei kalenteria eikä läsnäoloa.
