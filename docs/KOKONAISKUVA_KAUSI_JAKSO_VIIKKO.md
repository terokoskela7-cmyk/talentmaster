# Kokonaiskuva: kausi, jakso, viikko ja pelaaja · 11.10.2026

**Mihin tämä vastaa:** kaksi sessiota rakentaa samaan aikaan kalenteria (35), kehitystyöpöytää (22, 34), seuran pulssia (23, 33) ja mittareiden yhtä totuutta. Tämä dokumentti niputtaa ne yhdeksi järjestelmäksi: mitä kerroksia on, kuka omistaa minkäkin tiedon, mistä funktiosta se luetaan, missä järjestyksessä palat valmistuvat ja mitkä vartijat pitävät kokonaisuuden kasassa. Lähteet: mockupit 12, 13, 14, 15, 22, 25, 26, 28, 33, 34, 35; CLAUDE.md §41; lisäbriiffi 11.10.

## 1 · Kerrosmalli: kuusi kerrosta, kaksi omistajaa, yksi suunta

Tieto valuu ylhäältä alas. Ylempi kerros esitäyttää, alempi voi poiketa, ja poikkeama näkyy ylös (15 §1). Mikään kerros ei kirjoita ylöspäin.

| # | Kerros | Omistaja | Rytmi | Tallennuspaikka | Mistä se näkyy |
|---|---|---|---|---|---|
| 1 | **Seuran linja** (ikävaiheet, teemat, harjoitepankki, viikkopohjat, taitomatriisi) | VP, UTJ | kerran vuodessa, Excel-tuonti | `valmennuslinja/{lohko}`, `harjoitepankki` | Seuran linja -sivu · Kalenteri · Viikkopohjat |
| 2 | **Kausi** (vaiheet siirtymä, valmistava, kilpailu; tauot) | VP | kerran kaudessa | `valmennuslinja/kausisuunnitelma_{kausi}` · tauot `kalenteri` tyyppi `seuran_tauko` | Kalenteri · Kausi |
| 3 | **Vuosikello** (teemat viikkoina) | VP, seuran linjasta | kerran kaudessa | `valmennuslinja/teemat.jaksot[]` | Kalenteri · Kausi · esivalitsee jakson teeman |
| 4 | **Joukkuejakso** (neljä aluetta, viikkotavoitteet, katselmusikkuna) | valmentaja tai VP | 3–12 vk | `joukkueet/{jid}.jaksofokus` | Jaksotyökalu (31) · Kalenterin Silmukka-kerros nauhana · Koti ja Tilanne |
| 5 | **Viikko ja päivä** (harjoitukset, ottelut, osat, alueet, ryhmät, läsnäolo, kuorma) | valmentaja; aika ja paikka voivat tulla lähteestä | viikoittain | `kalenteri/{id}` + `lasnaolijat` + `henkilokunta/muistiinpanot` | Kalenteri · Viikko (= joukkueen viikko, D194) · valmentajan Tänään |
| 6 | **Pelaajan jakso ja viikko** (ydinvahvuus, tukitavoite, osat a–e, viikkokatsaus, oma fokus) | valmentaja hyväksyy, pelaaja valitsee | jakson mittaan | `pelaajat/{pid}` (jaksofokus-kopio, viikkokatsaukset) | Kehitystyöpöytä (22) · pelaajan Kenttä ja Viikko (09) |

Kalenteri on kerrosten 2, 3 ja 5 **koti** ja kerrosten 4 ja 6 **ikkuna**: se näyttää jaksot ja katselmusikkunat, mutta ei tallenna niitä.

## 2 · Yksi lähde per tieto

Jokaisella tiedolla on yksi tallennuspaikka ja yksi funktio, josta kaikki lukevat. Taulukko on sopimus sessioiden välillä: uutta lukutapaa ei kirjoiteta HTML:ään.

| Tieto | Tallennuspaikka | Funktio (lib) | Lukijat | Tila |
|---|---|---|---|---|
| Pelimuoto 5v5 / 8v8 / 11v11 | `joukkueet/{jid}.pelimuoto` (D173) | suoraan kentästä; `tmPohjaJoukkueelle` käyttää | ydinvahvuuden aluejako (34, D172–D173), viikkopohjan valinta (35), kuormaprofiili D26 | toinen sessio lisää kentän ja Rulesin (PR B, marraskuu) |
| ISO-viikko | – | `TM_VIIKKO.tmIsoViikkoNro` | kaikki neljä sovellusta | valmis (D140) |
| Tauko | `kalenteri`, tyyppi `seuran_tauko` | `tmOnTauko`, `tmTaukopaivat` | signaalit, eskalointi 7 pv, katselmusikkunat, Täytä viikko, jaksojen viikot, Kodin palsta | K35-1 (D193) |
| Seuraava tapahtuma | `kalenteri` | `tmSeuraavaTapahtuma` | kehitystyöpöydän "Treenattiinko?", valmentajan Tänään (D142), pelaajan Viikko | K35-1 |
| Tapahtuman tyyppi, kerros, merkki | – | `lib/tm_kalenteri_tyypit.js` | Master, VP, Pelaaja, Vanhempi, Koti | K35-1 (D186) |
| Tuodun tapahtuman omistajuus | `kalenteri.lahde`, `lahde_id` | `tmKalSaaMuokata` | luonti, muokkaus, synkat | K35-1 (D181) |
| Jakso ja sen viikko (vk 3/6) | `joukkueet.jaksofokus` | `tmJaksoTila` (toinen sessio, sama kuin S1) | jaksokortti, kalenterin Silmukka, pulssi | valmis |
| Viikkotavoite | `jaksofokus.viikot[]` | `tmJfViikko` | joukkueen viikko, pelaajan "Tällä viikolla" | valmis (D36) |
| Jakson teema | vuosikello → jaksofokus | `tmJoukkueenTeema` (`tm_jakso_malli.js`) | Täytä viikko, harjoituksen teema, teemakattavuus | valmis |
| Viikkopohja | `valmennuslinja/viikkopohjat`; Palloliiton oletus `docs/data/spl_viikkopohjat_2023.json` | `tmTaytaViikko` | Täytä viikko (joukkue tai ryhmä), VP:n poikkeamat | K35-3 (D183) |
| Testitulosten ikä | pikakentät `*_pvm` | `tm_nakyma_ryhmat.js` VANHA_KK 15, MUISTUTUS_KK 12; `tmTestijaksoEhdotus` | D1/D2-kortit, Tilanne, kausinäkymän testijaksorivi | valmis + K35-1 |
| Toteutunut läsnäolo | `lasnaolijat/{pid}.tila` | K2a | kooste, kuorma, dropout (K5) | valmis |
| Ennakkoilmoitus | `lasnaolijat/{pid}.saatavuus` + rooli | K2b | valmentajan viikko, perhe | valmis; rooli lisätään (D189) |
| Kuorma | `valmentaja_rpe` + pelaajien kirjaukset | `tm_kuorma_rinnakkain.js` | valmentajan ja VP:n viikko, vain henkilökunta | K35-11 (D188) |
| Pelaajan ilmoitukset | `notifikaatiot` (funktiot) + `viestit` (ihminen) | `lib/tm_sinulle.js` | pelaajan ja huoltajan "Sinulle" | K35-6 (D192) |

## 3 · Omistajuus: kuka saa muuttaa mitä

| Alue | Kalenterisessio | Kehitystyöpöytäsessio | Yhteinen sääntö |
|---|---|---|---|
| `lib/tm_kalenteri_*`, `tm_viikkopohja`, `tm_sinulle` | omistaa | lukee | muutos vain omistajan PR:ssä |
| `tm_nakyma_ryhmat`, `tm_testipaiva`, `tmTasoVari`, `tm_kehitystyopoyta`, Kenttä (`tm_kentta`) | lukee | omistaa | kalenteri ei lisää omia tasorajoja eikä värejä; testitapahtuman luonti (D198) kirjoittaa vain `kalenteri`a, testipäivän tulkinta pysyy `tm_testipaiva`ssa |
| Master_v16 kalenterilohko L9870–11048 | omistaa | ei koske | vasta #995:n jälkeen |
| Master_v16 Tänään, kehitystyöpöytä | ei koske | omistaa | `tmSeuraavaTapahtuma` tulee libistä, ei Masterin kalenterilohkosta |
| VP_v25 kalenterilohko L17218–18571 | omistaa (vain K35-2-tason korjaukset ennen R1:tä) | ei koske | isot näkymät R1:n Kalenteri-sivulle |
| `functions/kalenteri_notif.js`, uudet synkat, iCal | omistaa | ei koske | Teron kaista |
| `viestit`-kokoelma, "Muistuta pelaajaa" | ei koske | omistaa | D192 |
| ROADMAP, 22:n päätöslista, README-rivit | yksi rivi per mockup | yksi rivi per mockup | yksi avoin PR per tiedosto |
| D-numerot | D180–D199 | D172–D176 käytössä, D177–D179 ja D200→ vapaana | D108 viikkohavainto, D109–D121 mockupin 23 |

## 4 · Riippuvuusketju ja kriittinen polku

```
K35-1 libit (auto) ──► toisen session Tänään: "Treenattiinko?" lähde, tauko signaaleissa   [ennen 1.11.]
        │
        ├──► K35-2 Masterin napit ja ruudukko (Tero)                                     [ennen 1.11., #995:n jälkeen]
        │
pelimuoto-kenttä + Rules (toinen sessio PR B) ──► K35-3 tmTaytaViikko ──► K35-4 demolataus  [marraskuu]
                                                        │
TASO-ottelut K35-5 ───────────────────────────────────┴──► K35-6 Täytä viikko Masteriin  [marraskuu]
                                                                      │
R1 VP_v25:n jako ──────────────────────────────────────────────────► K35-8 VP:n Kalenteri-sivu [joulukuu]
D190-kuittaus ───► K35-7 iCal-vienti                                                       [joulukuu]
K5 kuorma ───────► K35-11 kuorma rinnakkain
```

Kriittinen polku ennen 1.11. on lyhyt: **K35-1**. Se on pelkkää libiä, auto-kaistaa, eikä riipu kenestäkään. Kaikki muu kalenterityö odottaa joko #995:tä, pelimuotoa tai R1:tä. Siksi K35-1 tehdään heti ja K35-2 heti #995:n mergen jälkeen.

## 5 · Pelaajan näkökulma: kaikki valuu yhteen viikkoon

Pelaaja ei näe kerroksia. Hän näkee yhden viikon (09, D32):

| Pelaajan ruudulla | Mistä se tulee | Mitä ei näytetä (§7.22) |
|---|---|---|
| "Tällä viikolla: syöttö paineessa" | viikkotavoite (kerros 4) | vaiheen nimi, kuormataso |
| ma / ke / to harjoitus, aika, paikka | kalenteri (kerros 5), `haePelaajanKalenteri` | MD-tunniste, tavoitekuorma |
| "Sinun fokus: vasen jalka" | pelaajan jakso (kerros 6), osa b | tasoluvut, vertailu |
| "Lisäharjoitus · Tempokuljetus" | ryhmän tapahtuma, neutraali nimi | ryhmän vertaileva nimi |
| Tulossa / En pääse | `saatavuus` | – |
| Kotona: ketteryysrata A | joukkuejakson kotiharjoite | – |
| Sinulle: viikon ohjelma, muutos, valmentajan viesti | `notifikaatiot` + `viestit` (D192) | – |
| Lisää kalenteriini | iCal-syöte (D190) | nimet, terveystiedot |

Testi kokonaisuudelle: jos jokin kerros muuttuu (VP vaihtaa vaiheen, valmentaja siirtää harjoituksen, TASO peruu ottelun), pelaajan viikon pitää päivittyä ilman, että kukaan kirjoittaa pelaajalle erikseen.

## 6 · Vartijat: mikä pitää kokonaisuuden kasassa

| Vartija | Mitä se estää | Tila |
|---|---|---|
| `kalenteri_yksi_rekisteri.test.js` | uusi tyyppikartta HTML:ään | K35-1 |
| `joukkuejasenyys_yksi_saanto.test.js` | ryhmittely `p.joukkue`-kentällä | valmis |
| `viikko_yksi_kaava.test.js` | toinen viikkonumerokaava | valmis |
| `yksi_totuus_nakymat.test.js` + `html_logiikka_baseline` | tasorajat HTML:ssä | valmis |
| `lib_vartijat.test.js` | lib yli ~500 riviä, uutta raja- tai normilogiikkaa HTML:ään | valmis |
| `kuoret_kasvukatto.js` | VP_v25 ja Master kasvavat | valmis (R0) |
| uusi: `tauko_yksi_lahde.test.js` | `env.tauot`, `kausisuunnitelma.tauot`, `kalenteri/tauot` | K35-1 (D193) |
| uusi: `pelaaja_ei_kuormalukuja.test.js` | RPE, tavoitekuorma tai MD-tunniste pelaajan tai huoltajan DOM:ssa | K35-11 |
| `ui_laatuportti.test.js` | DM Mono väärässä paikassa, isot kirjaimet napeissa, kaksi täytettyä nappia | valmis; laajennetaan kalenteriin K35-2 |

## 7 · Roolit: kuka tekee mitä kalenterissa

Roolit CLAUDE.md §4:stä, ryhmänvetäjät (D136) ja hallitus (21). Mockup 35 kattaa neljä ensimmäistä; loput kirjataan tähän, jotta ne eivät jää R1:n jalkoihin.

| Rooli | Tekee kalenterissa | Näkee | Tila |
|---|---|---|---|
| VP, UTJ | kausi, viikkopohjat, lähteet, seuran viikko, poikkeamat, täysi CRUD | koko seura | katettu (35 §1, §4, §5, §8) |
| seurasihteeri | kuten VP (johto-rooli Rulesissa) | koko seura | katettu, ei omaa näkymää |
| valmentaja | joukkueen viikko, Täytä viikko, päivän suunnittelu, läsnäolo, kuorma | oma joukkue ja omat ryhmät | katettu (35 §2, §3, §6) |
| talenttivalmentaja, maalivahtivalmentaja (ryhmän vastaava) | suunnittelee ryhmän omat harjoitukset kuten valmentaja joukkueen: tapahtumat, päivän suunnittelu, läsnäolo, oma viikkopohja valinnainen | ryhmä valitsimessa (D136, D138) | D196 |
| fysiikkavalmentaja, fysioterapeutti | kuorman seuranta, kypsyysvahti, klinikkalähetys | henkilökunnan kuormanäkymä | **aukko → D197** |
| testivastaava | testijaksot ja testitapahtumat, Testaus_v9 | kausinäkymän testijaksorivi | **aukko → D198** |
| super_admin | kuten VP, seuravalitsin pakollinen (§3) | valittu seura | huomioitava K35-2, K35-8 |
| pelaaja | Tulossa / En pääse, Sinulle, iCal | oma viikko (B4) | katettu (35 §7) |
| huoltaja | Tulossa / En pääse lapsen puolesta, iCal | lapsen viikko (B4) | katettu (35 §7) |
| hallitus | ei mitään | kausivaiheet lukutilassa hallituksen sivulla (21) | ei kalenteria |

## 8 · Päätökset, jotka tämä dokumentti lukitsee (ehdotus)

- **D192** Yksi ilmoitusnäkymä, kaksi lähdettä (35 §10).
- **D193** Tauolla on yksi lähde: `seuran_tauko` (35 §10).
- **D194** Joukkueen viikko on kalenterin viikkonäkymä (35 §10).
- **D195** Kerrosmalli ja omistajuustaulukko (tämän dokumentin §1–§3) ovat sopimus sessioiden välillä. Uusi tieto lisätään §2:n taulukkoon ennen kuin sitä luetaan mistään.
- **D196** Ryhmän viikko ja ryhmän vastaavan oikeus (Tero 11.10.). Ryhmän vastaava (`ryhmat/{rid}.vastuu_uid`) suunnittelee ryhmän omat harjoitukset samoilla työkaluilla kuin joukkueen valmentaja: luo, muokkaa ja poistaa ryhmän tapahtumat, avaa päivän suunnittelun (osat, alueet, harjoitteet seuran pankista) ja merkitsee läsnäolon. Ryhmällä voi olla oma viikkopohja (esim. maalivahdit 1 × vk), jolloin Täytä viikko toimii ryhmälle; ilman pohjaa tapahtumat lisätään pikalisäyksellä tai toistuvuudella. Täytä viikko tarkistaa joukkueen ja ryhmän ehdotukset toisiaan vasten (päällekkäisyys pelaajalla), ja molemmat vastaavat näkevät sen. Pelaajalle ryhmän tapahtuma näkyy neutraalilla nimellä (15 §4). Rules: nykyinen `ryhmanValmentajaTapahtumassa` sallii vain `pelaajat_id`- ja `jaadytetty`-päivityksen; vastaavalle tarvitaan luonti ja täysi muokkaus omiin ryhmän tapahtumiin (Teron kaista, K35-6:n yhteydessä).
- **D197** Kuorman ja kypsyysvahdin näkymä henkilökunnalle. Fysiikkavalmentaja ja fysioterapeutti saavat Kalenteri · Kuorma -välilehden (R1): joukkueet riveinä, viikot sarakkeina, solu = kuorma rinnakkain (D188), PH- ja tuntematon-pelaajat merkittyinä (§25), klinikkalähetys FLEI < 40 omana rivinään. Ei uutta dataa: luetaan `valmentaja_rpe`, pelaajien kirjaukset, `tmPhvTila` ja pikakentät. Terveystieto pysyy `terveys/`-kokoelmassa, ei kalenterissa.
- **D198** Testijakson suunnittelu kalenterista. "Suunnittele testijakso →" (Mittausaukot, Mittaustilanne, kausinäkymän testijaksorivi) avaa sheetin: joukkueet, protokolla, päivät `tmTestijaksoEhdotus`esta → luo `testitapahtuma`-tapahtumat (`testitapahtuma_id` linkittää Testaus_v9:ään, nykyinen malli). Luojat: johto ja testivastaava. Tulokset kirjataan edelleen Testaus_v9:ssä tai Excel-tuonnilla, ja testipäivä tulee tapahtumasta (`tm_testipaiva.js`: oikea päivä, ei arvio).

## 9 · Mitä seuraavaksi

1. Tero kuittaa D180–D198. D-numerointi on sovittu 11.10. (toinen sessio D172–D176).
2. Code: K35-1 heti (auto). Toinen sessio ottaa `tmSeuraavaTapahtuma`n ja `tmOnTauko`n käyttöön Tänään-korjauksissa.
3. PM: mockupin 35 osio 2 päivitetään D194:n mukaan (kenttäkuva päiväkorteissa, päivän suunnittelu, ryhmät ja teemakattavuus viikon alla) ja Palloliiton pohjat tarkistetaan valmennuslinjasta, kun Tero lataa sen.
4. K35-2 heti #995:n jälkeen. Loput järjestyksessä §4.
