# CODE BRIEF · Kokonaisliikuntamäärän seuranta (Palloliiton päätös, Tero 10.10.2026)

**Kaista: Tero** (Pelaaja_v7, Vanhempi_v2, VP_v25, Rules). PR-kuvauksen ensimmäinen rivi: "Kaista: Tero".
**Päätös (Palloliitto, "edetään tällä"):** kokonaisliikuntamäärää seurataan 12 viikkoa (viikko = 7 täyttä päivää), 50 pelaajaa/huoltajaa. Pelaaja ja huoltaja täyttävät yhdessä: kumpi tahansa voi kirjata. Kirjaus päivittäisellä kyselyllä (muistutus + pudotusvalikko) tai harjoituspäiväkirjamerkinnällä. Valmentajat, pelaajat ja vanhemmat koulutetaan kokonaisliikunnan merkityksestä (Kori 3: puolikas tuki, 6 vk, 25 pelaajaa; koulutussisältö ei ole koodia).
**Teron tarkennukset 10.10.:**
- Pelaaja-appissa kotitehtävät tulevat jo automaattisesti; kun pelaaja merkitsee tehdyksi, se tallentuu. **Lisäksi kysytään, mitä muuta pelaaja teki** (jalkapallo, muu urheilu, lepo + kesto).
- Vanhemman appiin sama kirjaus (suunniteltu jo, ks. Vanhempi_v2 "Kirjaa"-näkymä ja mockup 09).
- **Raportissa näkyvät myös päivät, joille ei ole merkintää** (erotettuna lepopäivästä).
- **Kirjata voi myös takautuvasti.**

## Nykytila (luettu koodista 10.10.)
- Päivädokumentti `seurat/{s}/pelaajat/{p}/kirjaukset/{pvm}` + **`sessiot[]`**-taulukko (R5.2): Pelaaja_v7:n `_kirjaaHarjoite` lisää pelaajan session (`sk: 'pelaaja:'+tyyppi`) lukemalla ja yhdistämällä (RMW), valmentajan sessiot säilyvät. **Tämä on oikea paikka kokonaisliikunnalle.**
- **Aukko 1:** takautuva kirjaus (`_kirjaaTakautuva`) kirjoittaa yhden `takautuva`-alikentän eikä `sessiot[]`:iin → toinen takautuva kirjaus samalle päivälle ylikirjoittaa ensimmäisen.
- **Aukko 2:** Vanhempi_v2 kirjoittaa päivädokumenttiin `set(..., {merge:true})` ylätason `tyyppi`/`kesto_min`/`tehty` ilman `sessiot[]`:ia → voi korvata pelaajan saman päivän ylätason kentät.
- **Aukko 3:** Rules sallii huoltajan kirjauksen vain alle 12-vuotiaalle (`onU12Huoltaja`, `lahde: 'vanhempi'`).
- **Aukko 4:** ei rajattua seurantajaksoa, ei osallistujalistaa, ei raporttia, ei päivittäistä muistutusta (D63: ilmoitukset vain sovelluksessa).

## Toteutus (kolme PR:ää)

### PR A — yksi kirjausmalli (Pelaaja_v7 + Vanhempi_v2 + Rules)
- **Kaikki liikunta `sessiot[]`:iin**, yksi sessio per kirjaus: `{ sk, lahde: 'pelaaja'|'huoltaja'|'valmentaja', tyyppi: 'T'|'D'|'S'|'P'|'jalkapallo'|'muu_urheilu'|'lepo', kesto_min, kirjaustapa: 'heti'|'jalkikateen', kirjattu: ISO, kirjaaja_uid }` (`serverTimestamp` ei arrayssa, §7.6). `sk` yksilöi session (esim. `pelaaja:muu_urheilu:<aikaleima>`), jotta saman päivän useat kirjaukset säilyvät.
- **Jaettu kirjoitusydin** `lib/tm_kokonaisliikunta.js`:ään (`tmKlLisaaSessio(deps, sid, pid, pvm, sessio)`: luku → yhdistä → kirjoita, aikaraja ja virhe kutsujalle kuten P0 EHEYS). Pelaaja_v7:n kotitehtävä, "mitä muuta", takautuva ja Vanhempi_v2 käyttävät samaa ydintä. Vanhat ylätason kentät päivitetään yhteensopivuuden vuoksi vain, jos niitä ei vielä ole (kooste v5 lukee niitä).
- **Pelaaja_v7:** kotitehtävän kuittauksen jälkeen ja päivän näkymässä pieni "Mitä muuta teit tänään?" -valinta (tyyppi + kesto pudotusvalikosta). Takautuva modaali kirjoittaa `sessiot[]`:iin (ei enää `takautuva`-kenttää); vanhat `takautuva`-kentät luetaan raportissa sessioina.
- **Vanhempi_v2:** sama valinta valitulle lapselle (`lahde: 'huoltaja'`), myös takautuvasti. Ei ylätason kenttien ylikirjoitusta.
- **Rules (v3.57):** huoltaja (`onLapsenHuoltaja`) saa lisätä oman lapsensa päivädokumentin `sessiot[]`:iin session, jonka `lahde == 'huoltaja'` ja `kirjaaja_uid == auth.uid`, **kaiken ikäiselle**. Kenttärajaus: huoltaja muuttaa vain `sessiot`- ja `paivitetty`-kenttiä, ei poista toisten sessioita (vertaa vanhaan listaan). Rules-testit: huoltaja yli 12 v ✓, toisen lapsi ✗, toisen session poisto ✗, pelaajan kirjaus ennallaan ✓.

### PR B — seurantajakso ja raportti (VP_v25 + lib)
- **Seurantajakso** `seurat/{s}/seurannat/{id}`: `{ tyyppi: 'kokonaisliikunta', alku, loppu (alku + 12 × 7 pv), pelaajat: [pid] (enintään 50), luotu, luoja_uid }`. VP/UTJ luo ja valitsee pelaajat. Rules: johto lukee ja kirjoittaa, pelaaja/huoltaja lukee vain jakson, jolla on itse (jotta app tietää kysyä).
- **Raportti** `lib/tm_kokonaisliikunta.js` puhtaana: `tmKlRaportti(seuranta, paivadokumentit)` → pelaajittain jokainen päivä yhdellä tilalla: **merkitty** (minuutit tyypeittäin) · **lepo** · **ei merkintää**. Viikkosummat (min/vk), täyttöaste (merkittyjä päiviä / päiviä tähän asti), joukkue- ja seurakooste.
- **VP_v25:** raporttinäkymä mockup 22:n komponenteilla (`lib/tm_kt_komponentit.js`): ruudukko päivä × pelaaja (● merkitty · – lepo · ○ ei merkintää), viikkosummat, täyttöaste. Pelaajanimet näkyvät vain johdolle ja joukkueen valmentajalle.
- **Vienti Palloliitolle:** anonyymi CSV (ei nimiä, ei ID:itä: juokseva numero, ikäluokka, sukupuoli, päivittäiset minuutit tyypeittäin, merkintätila). **Vain kun Tero on vahvistanut rekisterinpitäjän ja luovutusperusteen** (avoin päätös alla).

### ~~PR C — päivittäinen muistutus~~ (pois, Tero 10.10.)
Erillistä muistutusta ei tehdä. Aktiivisuus näkyy päivittäin VP:n ja valmentajan näkymissä (Seuran pulssi, Kehitystyöpöytä), ja valmentaja ohjaa joukkuetta. PR B:n raporttiin lisätään joukkueen täyttöaste kuluvalta viikolta, jotta tämä toimii.

## Rajat ja periaatteet
- **§7.22 pelaajalle ja huoltajalle:** omat minuutit myönteisesti ("Tällä viikolla 6 liikuntapäivää"), ei vertailua muihin, ei "puuttui"-, "rikkoutui"- tai menetyskieltä. **"Ei merkintää" näkyy vain henkilökunnan raportissa.**
- Takautuva kirjaus sallitaan seurantajakson sisällä (ei vain 30 pv).
- Terveystieto (vammat, kivut) ei kuulu kirjaukseen (GDPR art. 9 → `terveys/`).
- Tekstit `t()`/`vpT`:n kautta, uudet sv-avaimet Gemini-erään tyhjinä.
- Testaus nimetyillä KPV-testipelaajilla (§0, §10), ei SA:lla.

## Päätökset (Tero 10.10.2026)
1. **Rekisteri:** KPV siirtää TalentMasterin kokonaisliikuntadatan Palloliiton rekisteriin; erillistä suostumusta ei kerätä. **Toteutusehdot (PM):** siirto perustuu seuran ja Palloliiton väliseen sopimukseen, johon TalentMaster liitetään käsittelijänä; seuran tietosuojaselosteeseen ja huoltajien tiedotteeseen maininta siirrosta; vienti vain seurantajakson pelaajista ja vain tarvittavat kentät (päivä, tyyppi, minuutit, rasitusemoji, merkintätila, ikäluokka, sukupuoli, PalloID jos rekisteri sitä vaatii); ei terveystietoa. Vientitoiminto vain SA:lle ja seuran johdolle, jokainen vienti audit-lokiin. **Ennen vientiä Tero vahvistaa kirjallisen sopimuksen ja vientikentät.**
2. **Muistutus:** ei erillistä muistutusta (PR C pois).
3. **Aikataulu:** seuranta alkaa **tammikuussa 2027**. PR A voidaan tehdä jo nyt (korjaa kirjausten tallennusaukot, jotka koskevat nykydataa); PR B joulukuussa.
4. **Rasitus:** käytetään olemassa olevia rasitusemojeja (`fiilinki` / kuormaemoji), ei uutta 1–10-asteikkoa. Sessioon `rasitus`-kenttä samasta emojiasteikosta.

## Testit
- Kirjoitusydin: useita sessioita samalle päivälle säilyy; pelaajan ja huoltajan kirjaukset rinnakkain; luku epäonnistuu → ei kirjoitusta.
- Takautuva: kaksi takautuvaa samalle päivälle → molemmat tallessa; vanha `takautuva`-kenttä luetaan.
- Raportti: merkitty / lepo / ei merkintää oikein; viikko = 7 täyttä päivää; täyttöaste; aikavyöhyke (`TZ=UTC` + oletus).
- Rules-testit (yllä). §7.22-vartija: pelaajan/huoltajan näkymässä ei sanoja "puuttui", "ei merkintää".
- Koko sarja, raportoi `Test Files` ja `Tests`.
