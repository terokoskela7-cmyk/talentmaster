# CODE BRIEF · B4 — Pelaajan ja huoltajan kalenteri palvelimelta · ennen 1.11.2026

**Kaista: Tero** (`functions/`, Rules, Pelaaja_v7, Vanhempi_v2, SW). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Linja:** ROADMAP D (tietosuoja ja data), kalenterissa 20.–31.10. Seuraava tietosuojakorjaus P0-kalenterin (v3.48/v3.52) jälkeen.
**Miksi nyt:** Sibbo saa ryhmät 1.11. Ryhmätapahtumat ja "vain henkilökunta" -tapahtumat (R1, `nakyvyys:'henkilokunta'`) yleistyvät, ja ne ovat nyt pelaajan luettavissa.

## Ongelma (nykytila 8.10.)

- `seurat/{sid}/kalenteri/{id}`: `allow read` sisältää `onPelaajanSeura(sid)`. **Pelaajatoken lukee seuran koko kalenterin**, myös toisten joukkueiden ja ryhmien tapahtumat, henkilökunnan palaverit ja kentät kuten `luoja_uid`, `lasnaolo_kooste`, `valmentaja_rpe`.
- Suodatus tehdään selaimessa: Pelaaja_v7 `_p7EvKuuluu` (joukkue, `pelaajat_id`, `nakyvyys`) ja Vanhempi_v2 vastaava. Rules-kommentti: "Joukkue-/roster-suodatus tehdään APPISSA". Selain voi siis lukea kaiken, mitä Rules sallii.
- Pelaaja_v7 ja Vanhempi_v2 tekevät `.collection('kalenteri').get()` ilman rajausta (koko historia, kasvaa joka viikko).
- Huoltajan pääsy: selvitä, millä tunnisteella Vanhempi_v2 lukee kalenterin nyt (`onLapsenHuoltaja` ei ole kalenterin read-ehdossa; `onKirjautunut() && onOmaSeura` vaatii `seuraId`-claimin). Raportoi ennen koodausta.

## Tavoite

Pelaaja ja huoltaja saavat **vain ne tapahtumat, jotka koskevat pelaajaa**, ja **vain kentät, joita näkymä tarvitsee**. Rules ei enää anna pelaajalle eikä huoltajalle lukuoikeutta koko kalenteriin.

## Ehdotus: callable (PM:n suositus)

`haePelaajanKalenteri({ seuraId, pelaajaId })` · europe-west1 · App Check · palauttaa tulevat tapahtumat:

- **Oikeus:** `kuittausPaatos(auth, seuraId, pelaajaId)` tai vastaava (pelaaja itse tai lapsen huoltaja palvelimella tarkistettuna). Pelkkä `context.auth` ei riitä. Henkilökunta ei tarvitse tätä (lukee kalenterin suoraan).
- **Rajaus palvelimella:** sama sääntö kuin `tmNakyyPelaajalle` (`lib/tm_ryhmat.js`) + joukkuejäsenyys **`tmPelaajanJoukkueet`** (§7.18, ei nimivertailua) + `pelaajat_id` + ryhmät. Jaettu `lib/`-logiikka funktioihin samalla sync-tavalla kuin S1 (`functions/jaettu_lib.json` + vartija). Selaimen `_p7EvKuuluu` ja Vanhemman vastine poistuvat tai kutsuvat samaa lib-funktiota.
- **Aikaikkuna:** `pvm >= tänään (Helsinki) − 1 pv` ja ≤ +60 pv (tai nykyinen näkymän tarve, raportoi). Ei koko historiaa.
- **Kenttien sallittulista:** palautetaan vain näkymän käyttämät kentät (nimi, tyyppi, pvm/aika/paattyy, paikka, logistiikka, pelaajaviesti, treeniteema…). **Ei** `luoja_uid`, `muokkaaja_uid`, `lasnaolo_kooste`, `valmentaja_rpe*`, `pelaajat_id` (muut pelaajat), henkilökunnan kenttiä. Listaa lopullinen sallittulista PR:ssä; vartijatesti.
- **Oma saatavuus** (`lasnaolijat/{pid}`) voidaan palauttaa samassa vastauksessa → selaimen 5 erillistä lukua poistuu.
- Vastaus: `{ tapahtumat:[…], laskettu }`. Ei nimiä muista pelaajista.

**Rules (seuraava vapaa versio, nyt v3.55):**
- `kalenteri/{id}` read: poista `onPelaajanSeura(seuraId)`. Henkilökunta ja SA ennallaan.
- Huoltajan mahdollinen nykyinen polku suljetaan samoin (selvityksen mukaan).
- `lasnaolijat/{pid}`: pelaajan ja huoltajan oman vastauksen kirjoitus ja luku **ennallaan** (ei muutosta, testi todistaa).
- Testit: pelaajatoken ei lue `kalenteri`-dokumenttia (get eikä list), henkilökunta lukee, pelaaja kirjoittaa oman läsnäolonsa, ei toisen.

**Vaihtoehto (raportoi, jos callable ei sovi):** Rules-rajattu kysely (`pelaajat_id array-contains` + `joukkueet array-contains-any` + `nakyvyys`-ehto). Edellyttää, että jokaisella tapahtumalla on `joukkueet[]` ja eksplisiittinen `nakyvyys` (vanhojen palaveritapahtumien täydennys = tuotantodata → Tero ajaa) eikä rajaa kenttiä. Siksi PM suosittaa callablea.

## Selain

- Pelaaja_v7 `_p7LataaKalenteri` ja Vanhempi_v2 vastaava → callable. Latch-logiikka (ei latchia ennen kuin auth valmis) säilyy. Virhe/offline → näytetään viimeksi saatu lista muistista, jos sellainen on; muuten nykyinen tyhjän tilan teksti.
- **Kasvukatto (R0):** Pelaaja_v7:llä vapaata ~100 riviä, Vanhempi_v2:lla ~41. Logiikka `lib/`-moduuliin; kuoreen vain kutsu. Poistuva suodatuskoodi pienentää kuoria.
- `notifKalenteriMuutos` ja pelaajan notifikaatiot: ennallaan; tarkista, ettei mikään niistä nojaa pelaajan suoraan kalenteriluvun oikeuteen.
- SW: cache-versio ylös, jos Pelaajan tai Vanhemman HTML/JS muuttuu (§27.4). ?v-versiot.
- Tekstit reitityksen kautta; uudet avaimet odotuslistalle (ei omaa ruotsia).

## Testit

- Callablen puhdas päätösfunktio fixtuureilla: oma joukkue, toinen joukkue, pelaaja kahdessa joukkueessa (§7.18), ryhmätapahtuma (pelaaja ryhmässä / ei), `pelaajat_id`, `nakyvyys:'henkilokunta'`, vanha palaveri ilman kenttää, poistettu, mennyt, ikkunan rajat (Helsingin päivä, `functions/helsinki_paiva.js`).
- Kenttävartija: palautetussa tapahtumassa ei kiellettyjä kenttiä.
- Oikeudet: pelaaja itse ✓, toinen pelaaja ✗, huoltaja (email täsmää) ✓, väärä huoltaja ✗, henkilökunnan token ilman pelaajasuhdetta ✗ (tai ohjaus suoraan lukuun), anonyymi ✗, App Check puuttuu ✗.
- Rules v3.55 -testit yllä. Koko sarja (myös `functions/`), sv-läpiajo, suomenkielinen renderöintivertailu.
- **Käsin (Tero):** nimetty KPV-testipelaaja (esim. Toppari Testi) näkee oman joukkueensa ja ryhmänsä tapahtumat, ei henkilökunnan palaveria; huoltajana sama; valmentajan näkymä ennallaan. Varmistus seurakäyttäjällä, ei SA:lla.

## Ennen koodausta raportoi

1. Huoltajan nykyinen lukupolku kalenteriin (tunniste, claim, Rules-ehto).
2. Callable vai Rules-rajattu kysely: valinta ja perustelu. Lukumäärä per avaus (arvio).
3. Näkymien todella käyttämät kentät → sallittulista.
4. Kasvukatto: arvio riveistä Pelaaja_v7:ssä ja Vanhempi_v2:ssa.

## Aikataulu

PR viimeistään **27.10.**, jotta deploy ja Teron käsitesti ehtivät ennen 1.11. Deployjärjestys: funktio ensin, sitten selain, Rules-kiristys viimeisenä (kun uusi selainversio on käytössä). Rules-kiristyksen voi tehdä erillisenä pienenä PR:nä heti selainversion jälkeen.

## Ei tässä

Henkilökunnan kalenterin muutokset · Admin/VP-kalenteri · iCal-syöte (oma riskinsä, kirjataan jos löytyy sama ongelma) · S2.
