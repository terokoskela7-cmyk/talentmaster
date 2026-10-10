# Ohje Geminille — sv-käännöskooste

Tiedosto: `docs/i18n/sv_kaannoserae_kooste.json`. Tämä ohje kuuluu sen mukaan. Kooste kokoaa erien 2, 4–11, s11 ja 12–14 kaikki
tyhjät `sv`-kentät yhteen (444 riviä; sama suomenkielinen teksti vain kerran).

## 1. Tehtävä ja tiedostomuoto

1. Täytä jokaiseen tyhjään `"sv"`-kenttään ruotsinkielinen käännös.
2. Älä muuta rivien id-tunnuksia (`r001` …), `fi`-arvoja, `avaimet`-listoja tai muita kenttiä. Älä lisää tai poista rivejä. Palauta koko JSON samassa järjestyksessä.
3. `nakyma`, `lukija`, `kayttoyhteys`, `koodissa`, `en` ja `viite_sv` ovat vain apuna: ne kertovat, missä teksti näkyy ja kuka sen lukee. Älä käännä niitä.
4. Jos rivi on epäselvä tai näyttää koodinpätkältä, jätä `sv` tyhjäksi ja kirjoita kenttä `"kysymys"` samaan objektiin. Tuonti kaatuu tyhjään riviin, joten kysymys tulee aina Terolle.
5. Tuonti tarkistaa: jokainen rivi on mukana eikä ylimääräisiä ole, `fi` on ennallaan, `sv` ei ole tyhjä, paikanvaraajat ja HTML-tagit ovat samat kuin suomessa, ja rivin alku- ja loppuvälilyönnit ovat samat.

## 2. Merkit, jotka säilyvät sellaisinaan

- Paikanvaraajat `{n}`, `{nimi}`, `{vk}`, `{a}`, `{b}`, `{pros}`, `{pv}`, `{aika}` jne. täsmälleen samoin kirjoitettuina. Sanajärjestyksen saa muuttaa, paikanvaraajia ei saa lisätä, poistaa eikä kääntää.
- Poikkeus `{gen}`: sitä ei käytetä sv-teksteissä (koodi täyttää sen suomen genetiivillä). Jos `fi`-tekstissä on `{gen}`, muotoile sv-lause ilman sitä.
- Emojit, nuolet (→, ▷, ›), symbolit (＋, ✓, ✎, ⭐, 🎯 jne.), lyhenteet (PHV, ADAR, H-H, IDP, 5D, D4, VP, FU) ja HTML-entiteetit (`&amp;`, `&quot;`) sellaisinaan.
- Luvut, prosentit, §-viittaukset ja koodit (esim. `1v1`, `4v4+3`) sellaisinaan.
- **Alku- ja loppuvälilyönnit säilyvät.** Osa riveistä on lauseen paloja (esim. `" pelaajaa vahvistettu"`, `"Seuraava fokus ("`), jotka koodi liittää muuhun tekstiin. Käännä pala niin, että liitettävä jatko (luku, nimi, sulku) toimii.
- Tyyli: tekstit ovat käyttöliittymätekstejä — lyhyitä. Säilytä suomen välimerkit ja isot/pienet alkukirjaimet silloin, kun ne ovat osa tyyliä (otsikko vs. lause).

## 3. Kieli ja sävy

- Standardiruotsi (rikssvenska), kuten aiemmissa TalentMaster-erissä. Kohdeseura on suomenruotsalainen Sibbo-Vargarna, joten seuran ja roolien nimissä noudatetaan alla olevaa termistöä.
- **Henkilökunnan tekstit** (VP, valmentaja; `lukija` sisältää "henkilökunta"): asiallinen valmennuskieli, ammattimainen ja tiivis. Jalkapallovalmennuksen termit. Valmentajaa tuetaan, häntä ei arvostella: ei syyttävää eikä käskevää sävyä, vaikka teksti kertoo puutteesta (esim. "mittaus puuttuu" on havainto, ei moite).
- **Huoltajan tekstit** (`lukija` sisältää "huoltaja"): selkeä, lämmin ja kohtelias; ei hallinnollista jargonia. Virhe- ja tilaviesteissä kerrotaan, mitä käyttäjä voi tehdä seuraavaksi.
- **Lapselle (pelaajalle) näkyvät tekstit** (`lukija` sisältää "pelaaja"): lyhyt, lämmin, lapselle ymmärrettävä kieli. Lisäksi §7.22-rajat alla.
- Pidä samat termit samoina koko koosteessa. Käytä ENSIN termistön käännöksiä; jos termi puuttuu, valitse yksi muoto ja käytä sitä joka rivillä.

## 4. §7.22-rajat lapselle näkyviin teksteihin

Lapsen kieli on TalentMasterin tuoteperiaate (CLAUDE.md §0, §7.22; peruste Seligman PERMA ja Deci & Ryan). Tämän koosteen rivit ovat nyt henkilökunnan ja huoltajan tekstejä, mutta jos rivin `lukija` sisältää "pelaaja", käännökseen pätee:

- **Ei XP:tä, pisteitä, progress bar -kieltä eikä tasolukuja.** Älä lisää numeroita tai tasoja, joita suomessa ei ole; älä käännä sanaa "taso" pisteasteikoksi.
- **Ei vertailua muihin** (ei ranking, sijoitus, "parempi kuin", "muita jäljessä", "keskimääräistä heikompi").
- **Ei menettämisen kieltä** (loss aversion): ei "menetät", "putoat", "kadotat", "streak katkeaa", "jäät jälkeen", ei syyllistävää kehotusta. Kehystä aina positiivisesti: mitä on jo tehty ja mitä voi tehdä seuraavaksi.
- **Ei TKI-laskua** pelaajalle eikä huoltajalle.
- **Vahvuudet sanoin.** Pelaajan ja huoltajan teksteissä käytetään sanaa "Vahvuus" (ei "Ydinvahvuus"), henkilökunnalla "Ydinvahvuus". Sanaa "ase" ei käytetä koskaan (D54).
- **Pre-PHV-pelaajan matala fyysinen arvo on neutraali** (§28): älä kehystä sitä puutteeksi.
- Alle 16-vuotiaalle edistyminen kerrotaan sanoin, ei luvuin.
- Lyhyet virkkeet, ei vaikeita sivistyssanoja, ei ironiaa.

Jos suomenkielinen rivi itse rikkoo jotain näistä (esim. sisältää vertailun), älä korjaa sitä käännöksessä — käännä uskollisesti ja kirjoita `"kysymys"`-kenttään huomio.

## 5. Termistö

Alla oleva termistö on kopioitu erän 12 `termisto`-osiosta (sama kuin aiemmissa erissä); ruotsia ei ole lisätty tähän ohjeeseen. **Lukitut ja päätetyt ovat valmiita — käytä sellaisinaan.** "Käännettävät" ovat ehdotuksia, jotka Tero vahvistaa lähetyksen yhteydessä; jos perustellusti poikkeat, kirjoita syy `"kysymys"`-kenttään.

Vältettävä: **ase** (D54).

### 5.1 Lukitut termit

| fi | sv |
|---|---|
| Jaksofokus | Periodfokus |
| Jakso | Period |
| Kausi | Säsong |
| Tavoite | Mål |
| Joukkue | Lag |
| Pelaaja | Spelare |
| Valmentaja | Tränare |
| Talenttivalmentaja | Talangtränare |
| Vanhempi | Förälder |
| Kalenteri | Kalender |
| Läsnäolo | Närvaro |
| Harjoitus | Träning |
| Ottelu | Match |
| Testi | Test |
| Testit | Tester |
| Havainnot | Observationer |
| Arviointi | Bedömning |
| Kehitystilanne | Utvecklingsläge |
| Kehityskohde | Utvecklingsområde |
| Kehitys | Utveckling |
| Katselmus | Granskning |
| Sitoumus | Åtagande |
| Palaveri | Möte |
| Pelipaikka | Position |
| Maalivahti | Målvakt |
| Potentiaali | Potential |
| Peliäly | Spelintelligens |
| Tekniikka | Teknik |
| Taito | Färdighet |
| Kehon valmius | Kroppslig beredskap |
| Suostumus | Samtycke |
| Viestit | Meddelanden |
| Seurasihteeri | Klubbsekreterare |
| Testivastaava | Testansvarig |
| Fysioterapeutti | Fysioterapeut |
| Leikkijä | Lekare |
| Rakentaja | Byggare |
| Harjoite | Övning |
| Konsepti | Koncept |
| Pelitilanne | Spelsituation |
| Kortti | Kort |
| Super Admin | Super Admin |
| Showcase | Showcase |

### 5.2 Päätetyt termit

| fi | sv |
|---|---|
| Seura | Förening |
| Valmennuspäällikkö | Fotbollsutvecklare (lyhenne FU) |
| Urheilutoimenjohtaja | Sportchef |
| Fysiikkavalmentaja | Fystränare |
| Kehityskaari | Utvecklingskurva |
| Tänään | Idag (otsikko) / idag (lauseessa) |

### 5.3 Käännettävät (ehdotus)

| fi | sv | huom |
|---|---|---|
| Kausitavoite | Säsongsmål | |
| X-Factor | X-Factor | |
| Hidden Gem | Hidden Gem | |
| Ydinvahvuus | Kärnstyrka | |
| Vahvuus | Styrka | |
| Reitti | Väg | |
| Tukitavoite | Stödmål | |
| Kenttä | Plan | |
| Ryhmä | Grupp | |
| Ryhmät | Grupper | |
| Huoltaja | Vårdnadshavare | |
| Perhe | Familj | |
| Havainto | Observation | |
| Arvio | Bedömning | |
| Polku | Stig | |
| Näyttö | Prestation | |
| Viikkokatsaus | Veckoöversikt | |
| Kevyt katselmus | Lätt granskning | |
| Kokous | Möte | |
| Maalivahdit | Målvakter | |
| Talenttiohjelma | Talangprogram | |
| Kuorma | Belastning | |
| Biologinen ikä | Biologisk ålder | |
| Vastuuhenkilö | Ansvarsperson | |
| Ydinjoukko | Kärntrupp | |
| Viesti | Meddelande | |
| Klippi | Klipp | |
| Kuittaus | Kvittering | |
| Vahvuudet | Styrkor | |
| Kausisuunnitelma | Säsongsplan | |
| Joukkuejakso | Lagperiod | |
| Omatoiminen | Egen träning | |
| Kotiharjoite | Hemövning | |
| Pikakortti | Snabbkort | |
| Ennätys | Rekord | |
| Mitali | Medalj | |
| Havainnointi | Observation | ADAR A (assess). Valmentajan ja pelaajan käytössä sama nimi; ks. lib_adar_nimet. Ei sama kuin "Havainto" (yksittäinen kirjaus = Observation). |
| Päätös / Päätöksenteko | Beslut / Beslutsfattande | ADAR D (decide): valmentajan näkymässä "Päätös", pelaajan näkymässä "Päätöksenteko" — jos ruotsissa riittää yksi muoto, sano se; muuten kaksi. |
| Toteutus | Aktion | ADAR Act. |
| Palautuminen | Återhämtning | ADAR R (reassess/palautuminen virheestä). Ei fyysinen palautuminen (lepo) — ADAR-yhteydessä kyse on pelillisestä palautumisesta virheen jälkeen. |
| Pelihavainto | Spelobservation | Kenttätyökalun ja havaintokirjauksen nimi (ADAR-kenttäkirjaus + ottelun aikainen kirjaus). Huom. Teron 8.10. löydös: rivi "spelobservation" on väärässä paikassa — käytä tätä päätettyä termiä. |
| Otteluhavainnointi | Matchobservation | Ottelun aikainen kirjaus (eleet, ketjut, puoliajan läpikäynti): työkalu "Seuraan ottelua". |
| Ottelutarkkailu | Matchgranskning | Masterin Ottelutarkkailut-näkymä (valmentajan tekemät otteluhavainnot jälkikäteen luettavina). |

## 6. Esimerkki rivistä

```json
"r005": {
 "fi": "…",
 "sv": "",
 "nakyma": "VP Koti — Seuran pulssi",
 "lukija": ["henkilökunta (VP)"],
 "kayttoyhteys": "…",
 "avaimet": [{"era": "5", "osio": "lib.tm_seuran_pulssi", "avain": "…"}]
}
```

Täytetään vain `"sv"`. Muu pysyy.
