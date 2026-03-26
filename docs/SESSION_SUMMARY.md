# TalentMaster™ — Session Summary LOPULLINEN
## 26.3.2026 — Kattava briefingi seuraavaa sessiota varten

---

## Projektin filosofia — tämä on kaiken perusta

"Pelaaja ensin, hallinto vahvistaa." TalentMaster on rakennettu lapsen ja nuoren kehitystarpeesta ylöspäin — ei hallinnosta alaspäin. Master v7:n motivaatiomoottori, leikkijä-tila, streak, haasteet ja koulutusmoduulit ovat syntyneet ensin. Vasta nyt palataan hallinnolliseen kerrokseen. Tämä on täsmälleen päinvastainen järjestys kuin useimmissa urheilujärjestelmissä, ja se on TalentMasterin rakenteellinen kilpailuetu.

---

## Kokonaisarkkitehtuuri — 7 kerrosta

Kaikki seitsemän kerrosta yhdistyvät yhteen Firestore-tietokantaan. Kerrokset eivät ole hierarkia vaan verkosto — jokainen kerros tuottaa dataa jota muut kerrokset lukevat.

**Kerros 1 — Pelaaja / Master v7:** Motivaatiomoottori jossa streak, XP, tasonousu, haasteet, leikkijä-tila U8–U12 YouTube-videoilla ja viikkokalenteri. Tämä on se koukku joka saa pelaajan avaamaan sovelluksen joka aamu. Kaikki tämä data elää tällä hetkellä localStorage:ssa — siirto Firestoreen on Sprint 3:n kriittisin tekninen tehtävä.

**Kerros 2 — Valmentaja / kenttähavainto + ADAR:** Neljän hetken malli (aamu, ennen harjoitusta, aikana, jälkeen). Kenttähavainto kolmella napautuksella: vahvistus, kehityshavainto, erityinen hetki. ADAR-arviointi (Arvioi–Päätä–Toteuta–Arvioi) on valmentajan kognitiivinen arviointityökalu joka tuottaa Game IQ -dataa. Kirjaus kentällä 10 sekunnissa — ei toimistolla.

**Kerros 3 — Game IQ / D4 / koulutusmoduuli:** Kognitiivinen dimensio on koko järjestelmän strategisin osa. Pre-scanning, päätöksenteko paineessa, inhibitiokyky ja Error Recovery. Vaeyens 2007 osoitti tämän erottavan eliittipelaajat subeliitistä paremmin kuin fyysinen suorituskyky. Master v7:ssä on jo täydellinen koulutusmoduuli ADAR-protokollalla U10–U19, harjoitteilla ja sertifikaatilla. Valmentaja antaa ADAR-pisteitä suoraan appissa — ne tarvitsevat vain Firebase-integraation.

**Kerros 4 — IDP-kortti v3:** Diagnostinen työkalu joka yhdistää TalentID-profiilin, hallintaketjut jalkapallotermein, klinikkaprotokollat (25 kpl, PHV-huomiot, kielletyt, paluu-kriteerit), pelipaikkaharjoitteet U13+ ja kehityskaaren. Toimii KPV:llä tänään — Topias Koskela aukeaa "Tiedot"-napista.

**Kerros 5 — IDP-aktivointi, kolme reittiä:** Manuaalinen pyyntö (valmentaja/TV/VP napista) tuottaa perus-IDP:n. Automaattisignaali (X-Factor: TalentID +8p/kausi, Hidden Gem: biologinen < kronologinen) tuottaa laajennetun IDP:n. Talenttiohjelma (Palloliiton KORI-kriteerit, 20+20 pelaajaa/seura) tuottaa talenttikortin. Firestore-kenttä `idp_taso` arvoilla "perus"/"laajennettu"/"talentti" hallitsee tason.

**Kerros 6 — VP / johtamisjärjestelmä:** Seura.html näyttää seuran KPIt, kehitystrendin, IDP-ehdotukset hyväksyttäväksi, Excel-tuonnin massakutsulla ja valmentajien mentorointitilanteen. VP ei hallinnoi 400 pelaajaa — järjestelmä nostaa ne jotka tarvitsevat huomiota.

**Kerros 7 — Fyysinen → teknis-taktinen integraatio:** Kolmivaiheinen polku. Vaihe 1 (nyt) on alkurutiinin 70/30 viidellä ketjulla ilman pelipaikkayhteyttä. Vaihe 2 (IDP vapautuu, Sprint 4) on pelipaikka + ketju yhdistettynä — laitahyökkääjän SM-ketjuharjoite on 1v1 laidalla eikä irrallinen pujottelu. Vaihe 3 (2026–2027) on täysi DFB-malli jossa heikoin ketju + pelipaikka + pelitilanne kytketään automaattisesti yhteen — transfer peliin.

**Yhdistävä Firestore-data:** `streak`, `havainnot`, `idp_kausi`, `adar`, `idp_taso`, `ketjut` — nämä kuusi kenttää/kokoelmaa ovat se silta joka tekee seitsemästä erillisestä kerroksesta yhden toimivan kokonaisuuden.

---

## GitHub-tila — mitä on nyt valmiina

Kaikki kuusi tiedostoa on GitHubissa ja toiminnassa. `TalentMaster_Seura.html` on päivitetty Excel-tuonnilla ja onboarding-logiikalla. `TalentMaster_IDP_Kortti_v3.html` toimii KPV:llä. `hpp_rehab_protokollat.js` sisältää 25 protokollaa. `tm_import.js` ja `tm_empty_state.js` ovat integroituna Seura-näkymään. `functions/index.js` on deployattu kuudella Cloud Functionilla.

**Firebase:** `talentmaster-pilot`, Blaze-plan, europe-west1. Deploy GitHub Actionsin kautta: "TalentMaster — Firebase Setup" → `deploy_functions`.

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAp471lOIntzP33p9bIW3y4KbeEyBt5kIo",
  authDomain: "talentmaster-pilot.firebaseapp.com",
  projectId: "talentmaster-pilot",
  storageBucket: "talentmaster-pilot.firebasestorage.app",
  messagingSenderId: "872561784446",
  appId: "1:872561784446:web:05c4c7996dfd46ddd14a2f"
};
```

---

## Master v7 — mitä siellä on JO valmiina (ei saa rakentaa uudelleen)

Master v7 on 12 238 riviä. Nämä asiat ovat valmiita ja odottavat vain Firebase-integraatiota.

`rakennaPelaajIDP()` rakentaa nelikerroksisen harjoitesuunnitelman automaattisesti — kerrokset hpp (HPP ELITE), perf (suorituskyky), ball (pallollinen) ja kog (ADAR). `laskeTKIKetjut()` tunnistaa heikoimman ja vahvimman ketjun ja rakentaa 70-20-10-logiikalla päivän ohjelman. Haaste-järjestelmä on täydellinen: streak-haaste, treeni-haaste, visa-haaste, OVR-haaste, jaettava 6-merkkinen haaste-koodi. Leikkijä-tila U8–U10 tähti-järjestelmällä ja YouTube-videolinkeillä on valmis. Coach Dashboard kuudella tabilla (NYT/ANALYYSI/VIIKKO/MERKINNÄT/KOULUTUS/ASETUKSET) on valmis.

`KOULUTUS_MODUULIT` sisältää kuusi täyttä koulutuskokonaisuutta sertifikaatteineen: Vauhtiketju, Tekniikkakilpailut, Harjoitettavuuskartoitus, Psykologinen dimensio, Kognitiivinen dimensio (Game IQ) ja Sosiaalinen dimensio. Jokainen kolmessa vaiheessa (Ymmärrys → Osaaminen → Soveltaminen) ikäluokkakohtaisine harjoitteineen ja tenttikysymyksineen.

**Kriittinen ongelma:** Kaikki Master v7:n data — streak, XP, ADAR-pisteet, haasteet, coach-merkinnät — elää localStorage:ssa. Siirto Firestoreen on Sprint 3:n tärkein tekninen päätös.

---

## Kolme kytkentää jotka rakentaan — tärkeysjärjestyksessä

**Kytkentä 1 — Valmentajan kenttähavainto Firestoreen (KORKEIN PRIORITEETTI):** Tämä on koukku joka saa pelaajan avaamaan sovelluksen. `tallennaPlusMerkinta()` kirjoittaa tällä hetkellä vain localStorage:en. Muutos: lisätään `db.collection('havainnot').add({...})`. Master tarkistaa käynnistyessään 48h sisällä tulleet havainnot ja näyttää ne Tänään-tabin yläosassa: "Valmentajasi kirjasi eilen — Vauhtiketju paranee, jatka samaan malliin." Kolme havaintotyyppiä: vahvistus (→ pelaajalle), kehityshavainto (→ IDP-kortille), erityinen hetki (→ VP:n IDP-ehdotusjonoon). ADAR-kommentit tallentuvat `adar`-kokoelmaan, koska ne ovat järjestelmän arvokkain data.

**Kytkentä 2 — idp_kausi-dokumentti:** Yksi Firestore-dokumentti `seurat/{id}/pelaajat/{id}/idp_kausi` jossa VP tai valmentaja asettaa `vahvistettava_ketju` ja `kehitettava_ketju`. Master lukee tämän ennen päivän ohjelman rakentamista. Pelaaja näkee: "Tänään: Vauhtiketju — tämä on sinun kauden 70%-harjoitteesi."

**Kytkentä 3 — Streak Firestoreen:** Kun streak siirtyy pois localStorage:sta, joukkueen taulukko näyttää oikeat luvut, joukkuehaasteet toimivat oikeasti ja VP näkee aktiviteettiasteen reaaliajassa.

---

## IDP-kortin 6 puuttuvaa elementtiä — Sprint 4

Kortissa on vahva diagnostinen kerros. Puuttuu pelaajan oma "minun kauteni" -lause ja tavoite (ownership), konkreettiset viikkoharjoitteet annostuksineen ja YouTube-linkit nuoremmille, omalla ajalla tehtävät harjoitteet ("3 harjoitetta, 15 min kotona"), tavoitteet rakenteessa lähtötaso/tavoite/pvm/tapa + välietapit, kehityskaari vähintään 3 kauden historiallisena janana, ja valmentaja–pelaaja-dialogi (havainto → kommentti → yhteinen toimenpide).

---

## Kansainvälinen tutkimuspohja — valinnat ovat linjassa

Käyttäjätutkimus (N=1843, Liikanen & Törmä 2025 + kansainväliset verrokit) vahvistaa kaikki tänään tehdyt arkkitehtuurivaLinnat. KNVB Coaching Moments: valmentajat jotka saivat visuaalisen muistutuksen pelaajan kehityskäyrästä antoivat 40% enemmän yksilöllisiä interventioita — peruste kenttähavainnon 10 sekunnin filosofialle. Ajax N=400: IDP:n merkittävin muuttuja ei ollut sisältö vaan se, että kolme eri tahoa katsoi sitä säännöllisesti — peruste kolmitahoiselle aktivointilogiikalle. Forsman 2013 N=509: omatoiminen harjoittelu erotteli lahjakkaita kaikissa ikäluokissa — peruste streak-mekaniikalle. Côté 2007: deliberate play alle 12-vuotiaille — peruste leikkijä-tilalle. 70/30 koskee alkurutiinia — ei koko harjoitusta, kenttäharjoitus on aina valmentajan.

Yksi tärkeä tarkennus: käyttäjätutkimuksessa on viisi liikeketjua (Vauhtiketju, Lähtöketju, SM-ketju, Hallintaketju, Peliälyketju) kun IDP-kortissa on kuusi HPP ELITE -termein. SM-ketju on laajempi kuin pelkkä Suunnanmuutosketju — se kattaa pallonhallinnan ja teknisen tarkkuuden. Tämä terminologia pitää yhtenäistää ennen kuin käyttäjille näytetään molempia näkymiä.

---

## Avoimet tehtävät — prioriteettijärjestys

**Välittömästi ennen pilottia:** Poista testitietueet Firestoresta: "Tero Koskela" (1976, U13) ja "Tero KOsklea" (2014, KPV U12). Rakenna `TalentMaster_Pelaajarekisteri_Pohja.xlsx` — välilehti "Pelaajat", sarakkeet A–H, data rivi 5 alkaen. Yhtenäistä ketjuterminologia IDP-kortin ja käyttäjätutkimuksen välillä.

**Sprint 3:** Valmentajan kenttähavainto Firestoreen (koukku). `idp_kausi`-dokumentti (kytkentä IDP:stä Masteriin). KPV:n pilottidatan tuonti Excel-pohjan kautta. Pelipaikkakenttä seurahallintaan. IDP-aktivointiehdotukset VP:n jonoon (X-Factor + Hidden Gem -automaatti).

**Sprint 4–5:** IDP-kortin 6 puuttuvaa elementtiä. Master v8 valmentajan kirjausnäkymä Firebase-integraatiolla. Streak Firestoreen. Talenttiohjelma-kokoelma + KORI-kriteerit. tm_nav.js integraatio kun Master_v8 ja Pelaaja-näkymä valmiina.

---

## Tunnetut ratkaisut — ei saa unohtaa

Firestore Rules vaatii sekä `allow create` että `allow update` pelaajille — `.set({merge:true})` käyttää updatea jos dokumentti on olemassa. Syntymäaika parsitaan `Date.UTC(v, kk-1, pv)` eikä `new Date(string)`. `onAuthStateChanged`-silmukka estetään `_kirjautuminenKesken`-lipulla. SheetJS ei kirjoita Excel-tyylejä ilman Pro-lisenssiä — käytä openpyxl Cloud Functionissa. `TalentMaster_IDP_Kortti_v3.html` ja `hpp_rehab_protokollat.js` täytyy aina olla samassa hakemistossa.
