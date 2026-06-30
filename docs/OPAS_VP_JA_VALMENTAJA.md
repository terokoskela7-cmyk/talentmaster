# TalentMaster™ — Pelikirja valmennuspäällikölle ja valmentajalle

> Käyttöönotto-opas pilottiseuroille. Tavoite: että data alkaa **elää** ja hyödyttää arjen toimintaa.
> Kohde: valmennuspäällikkö (VP) + valmentaja. Versio 2026-06-29. Sisältö = pohja sekä jaettavalle
> onboarding-materiaalille että in-app-aloitusoppaalle (Vaihe 2).
>
> **Päivitys 2026-06-29 (verifioitu live):** joukkueen syvänäkymä on nyt nelivälilehtinen (Pelaajat ·
> Tuki · Yhteenveto · **Tavoitetaso**), mukana **per-testi-radar + taso-3-tavoite** (MyEWay-tyylinen),
> **kohortti-valitsin** (Paras / Top-5 / Top-10 / Koko joukkue) ja kevennetty Yhteenveto (yksi painopiste +
> datapolku-CTA:t). "Erityistuki"-merkki on nyt **"Kehityskohde"** (§28-neutraali). Sovellus avautuu
> Carbon-tummana oletuksena (vaalea teema valitsimessa). Ks. §1.2.
>
> **TILA-huomio (lue ennen jakelua):** tämä pelikirja kuvaa pilotin live-toiminnot CLAUDE.md §17–34:n
> mukaisesti. Ennen jakelua oikeille valmentajille ominaisuusnimet kannattaa verifioida live-UI:ta vasten
> (designer ajaa Chrome-passin) — UI-tekstit ja nav-nimet voivat poiketa pienesti.
> **ADAR poistettu käytöstä (2026-06):** peliäly/pelihavainto (D4) säilyy käsitteenä ja pelaajaraportin
> pelihavainto-lähteenä. Pelihavainto-työkalu on käytössä; ADAR-pikakorttiin/-Visioniin ei viitata.
> **Termistö:** ei englanninkielisiä lyhenteitä käyttäjäpinnassa (ei MDT, Signs, Samples, SEO) — vain
> suomenkieliset itsensä selittävät nimet (§14).

---

## 0. YDINAJATUS — "Näin data herää"

TalentMaster ei tuota arvoa tyhjänä järjestelmänä. Arvo syntyy kun **datapolku sulkeutuu**:

> **Rosteri → suostumus → mittaus → pikakentät täyttyvät → dashboard herää → toimenpide → seuranta**

Jokainen vaihe avaa seuraavan. Ilman pelaajia ei ole mittauksia; ilman mittauksia dashboard on tyhjä;
ilman dashboardia ei synny toimenpiteitä. **VP omistaa polun alkupään** (rosteri, suostumukset, mittausrytmi);
**valmentaja tuottaa elävän datan** (testit, havainnot, arvioinnit, viestit). Kun molemmat tekevät osansa,
näkymät täyttyvät itsestään — pikakentät päivittyvät automaattisesti jokaisesta tallennetusta mittauksesta.

Tämän oppaan kaksi osaa kuvaavat saman loopin kahdesta roolista.

---

# OSA 1 — VALMENNUSPÄÄLLIKKÖ: Näin johdat TalentMasterilla

Roolisi on **nähdä kokonaisuus ja ohjata**: et kirjaa yksittäisiä testituloksia, vaan johdat seuraa,
joukkueita, valmentajia, pelaajia ja perheitä datan kautta. Näet **aina kaiken** oman seurasi osalta.

> **VP-näkymän välilehdet:** 🏠 Koti · 👥 Joukkueet · 🧑‍🏫 Valmentajat · 📊 Raportit · ⋯ Lisää
> (Pelaajat, Kalenteri, Reviewit ym.). Pelaajien tuonti ja huoltajakutsut tehdään erillisessä
> **Seurahallinta**-näkymässä.

## 1.1 Seuran johtaminen — käynnistä datapolku

Tämä on ensimmäinen ja tärkein tehtäväsi. Ilman tätä mikään muu ei herää.

1. **Tuo pelaajat järjestelmään.** Seurahallinnassa (Tuo Excel): lataa seuran joukkuepohja, täytä pelaajat,
   tuo takaisin. Pelaaja saa tilan *pilotti*. Duplikaattisuoja estää tuplakirjaukset.
2. **Kutsu huoltajat (suostumus).** Massakutsu lähettää huoltajille suostumuspyynnön → tila *odottaa* →
   huoltajan hyväksyttyä *annettu* + pelaajan PIN generoituu. **Suostumus on portti:** ilman sitä
   syntymäaika ei täyty, eikä RAE-näkyvyys, biologinen ikä tai perheviestintä aktivoidu.
3. **Seuraa suostumussuppiloa.** Tuotu → kutsuttu → annettu. Tavoite go-liveen on **konversio > 70 %**.
   Jos konversio jää alle, lähetä lempeä muistutus (kutsumuistutus-toiminto, frekvenssikatto suojaa
   perheitä turhalta painostukselta).
4. **Seuraa datakypsyyttä.** Montako pelaajaa on testattu / havainnoitu / mitattu (PHV). Tämä kertoo
   onko joukkue valmis siihen että dashboard tuottaa luotettavaa kuvaa.

**Johtamiskysymys:** *"Onko datapolkuni auki?"* — jos suostumuskonversio on matala tai mittauksia ei ole,
kaikki muu odottaa. Aloita tästä.

## 1.2 Joukkueiden johtaminen — lue pulssi, tartu signaaleihin

Kun mittauksia alkaa kertyä, joukkuetason näkymät heräävät:

- **Joukkuepulssi** (neliosainen per joukkue): Kehon valmius · TKI (tekniikka) · H-H-taso (fyysinen) ·
  pelihavainto. Kukin näyttää keskiarvon + kattavuuden (montako mitattu / koko joukkue) + suunnan (↑/→/↓).
  Kattavuus kertoo *kuinka luotettava* luku on — pieni n = ole varovainen tulkinnassa.
- **Signaalit** nostavat esiin sen mihin pitää tarttua: matala indeksi joukkueessa, valmentaja joka ei
  kirjaa, joukkue jota ei havainnoida tarpeeksi.
- **Syntymäkvartaali-rakenne (RAE).** Näet onko joukkue vinoutunut vanhimpiin (Q1 yliedustus = valitaanko
  taitoa vai ikää?) ja jäävätkö nuorimmat (Q4) lupaukset näkymättä. Tämä on TalentMasterin tieteellinen
  erottautuja — *"muut mittaavat, me korjaamme ikäharhan"*. Aktivoituu kun huoltajat ovat rekisteröineet
  (syntymäaika täyttyy).
- **Joukkueen syvänäkymä:** klikkaa pulssikorttia → modaali jossa **neljä välilehteä**, kukin vastaa eri kysymykseen:
  - **Yhteenveto** — *yhden silmäyksen tilannekuva.* KPI (D1 fyysinen / D2 tekninen + suunta), **yksi painopiste**
    (suurin etäisyys tavoitteeseen → suora "Luo tekniikkateema" / "Avaa Tuki"), ja **datapolku-CTA:t** (esim.
    "Pelihavainto 0/28 → Avaa työkalu") jotka kääntävät puuttuvan datan toimenpiteeksi. *Mistä aloitan?*
  - **Tavoitetaso** — *missä olemme vs kansallinen taso 3.* Per ominaisuus (nopeus, suunnanmuutos, tekniikka)
    tasojakauma 1–5 + "tasolla ≥3: X/N" + **per-testi-radar** (joukkueen profiili + taso-3-tavoiterengas, kuten
    MyEWayssa). Tekniikkakilpailu-seuroilla (esim. Sibbo) tavoite on **TKI ≥ 60** taso-3:n sijaan — sama näkymä,
    oikea asteikko. Etäisyys tasoon 3 ohjaa harjoittelun ohjelmointia. *Mitä kehitämme?*
  - **Tuki** — *valmiit harjoitusryhmät.* Pelaajat ryhmitelty kehityskohteittain (esim. "syöttö-ryhmä (13)")
    tarvejärjestyksessä + kopioi-leikepöydälle + **"Luo harjoitustapahtuma"**. *Miten — kenet treenaan yhdessä?*
  - **Pelaajat** — *hakemisto.* Per-pelaaja-tasot (H-H, D1, tekninen lähdemerkinnällä, pelihavainto, PHV).
    Klikkaa pelaaja → per-pelaaja-kortti (5D-profiili + per-testi-detalji, skrollaa loppuun). *Kuka?*
- **Kohortti-valitsin (syvänäkymän yläosa):** Paras · Top-5 · Top-10 · **Koko joukkue**. Vaihtamalla näet
  esim. **5 parhaan (talenttiytimen) tason ja kehityksen erikseen** koko joukkueesta — joukkueen keskiarvo
  laahaa heikoimpien vetämänä, mutta ytimen kehityskaari kertoo onnistuuko talenttikehitys. Ydin valitaan
  vakaalla kokonaistasolla (sama 5 pelaajaa kaikissa ominaisuuksissa).
- **Kehityskohde-merkki:** korvaa aiemman "Erityistuki"-termin. Liputtaa vain aidon huolen — pre-PHV-iässä
  matala *fyysinen* on biologisesti odotettua (neutraali), joten merkki perustuu tekniseen kehityskohteeseen
  tai kehon valmiuteen, ei karkeaan fyysiseen tasoon. Liputtaa joukkueen heikoimman ~20 %:n (priorisointi),
  ei kaikkia.

**Johtamiskysymys:** *"Mikä joukkue tarvitsee huomiotani tällä viikolla?"* — anna signaalien ohjata.
Periaate: **Tilanne** kertoo *missä* tarttua · **Tavoitetaso** *mitä* kehittää · **Tuki** *miten* (ryhmä +
tapahtuma) · **Pelaajat** *kuka*.

## 1.3 Valmentajien johtaminen — havainnoi, kalibroi, mentoroi

TalentMaster tekee valmentajakehityksestä yhtä mitattavaa kuin pelaajakehityksestä.

- **Harjoitusarviointi — kaksi mallia, sinä täytät molemmat.**
  - **Malli A (Palloliiton harjoituslaatu):** sinä arvioit harjoituksen laadun — QA- ja datankeruutyökalu
    (vertailu tavoitelukuihin, valmentajapalaute). Vain VP. Malli A:lla ei ole itsearvioparia.
  - **Malli B (valmennustaidot):** sama malli täytetään **kahdesti** — valmentaja tekee **itsearvion**
    omasta työstään, ja sinä teet **havainnoinnin** samasta harjoituksesta.
- **Kalibraatio = kahden Malli B:n ero.** Kun samasta harjoituksesta on sekä valmentajan B-itsearvio että
  sinun B-havainnointisi, järjestelmä laskee kuilun per kriteeri (itsearvio − havainnointi). Se paljastaa
  missä valmentajan itsekäsitys ja ulkoinen arvio eroavat → mentoroinnin lähtökohta, ei tuomio.
- **Roolijako (lukittu):** valmentaja näkee vain oman B-itsearvionsa + kalibraation + saamansa
  laadullisen palautteen. Valmentaja **ei näe omaa Malli A -numeroaan** — A on sinun linssisi
  (Harjoittelun laatu -dashboard + coach-paneeli). Tämä erottaa harjoituksen laadun QA:n (A) valmentajan
  kehittämisestä (B + reflektio).
- **VAI+ (valmentajan aktiivisuusindeksi).** Viisiosainen: havainnot, käynnit, harjoittelu, kontakti,
  kehitys. Kertoo kuka valmentajista on aktiivinen ja kuka tarvitsee tukea.
- **Mentorointi-loop.** Lähetä valmentajalle viesti suoraan järjestelmässä → se näkyy hänen Viestit-välilehdellään.
  Ei sähköpostia, ei Slackia — keskustelu pysyy kontekstissa.
- **Coach-paneeli:** valmentajan profiili (lisenssitaso, CPD-tunnit, koulutukset), VAI+, harjoituslaatu
  ja mentorointihistoria yhdessä näkymässä.

**Johtamiskysymys:** *"Kehittyvätkö valmentajani — ja tukevatko he pelaajaa oikein?"*

## 1.4 Pelaajien johtaminen — tunnista lupaus, suojaa herkkyysvaihe

- **IDP-jono ja talentit.** Näet ketkä ovat talenttiohjelmassa ja kenen yksilöllinen kehityssuunnitelma
  kaipaa huomiota.
- **Signaalit — biologinen totuus käyttöliittymänä:**
  - **Hidden Gem (piilohelmi):** korkea tekniikka + matala fysiikka → lupaus jonka fysiikka tulee perässä
    (erityisesti ennen kasvupyrähdystä). Älä karsi häntä fysiikan perusteella.
  - **Kultaikkuna:** nuorella pelaajalla tekniikan herkkyysvaihe on auki (~≤12 v) — sama harjoittelu
    tuottaa moninkertaisen vaikutuksen nyt. Tämä ohjaa mihin panostaa juuri nyt.
  - **Underdog (RAE):** ikäluokan nuorin joka silti pärjää → poikkeuksellinen pitkän tähtäimen lupaus.
- **TKI (tekniikka) ja H-H (fyysinen).** Indeksit kertovat tason; kehitysvauhti (delta) kertoo
  kehittyykö pelaaja — ei vain missä hän on nyt. **Tärkeä periaate:** kehitys mitataan absoluuttisesta
  parannuksesta, ei pelkästä indeksiluvusta (vaatimus kovenee iän myötä).
- **PHV / biologinen ikä.** Kasvupyrähdyksen vaihe ohittaa kronologisen iän kaikessa tulkinnassa.
  Kasvupyrähdyksessä oleva pelaaja tarvitsee kuormarajoituksen — tämä suojaa loukkaantumisilta.

**Johtamiskysymys:** *"Tunnistanko lupaukset oikein — myös ne jotka eivät vielä näytä fyysisesti
valmiilta?"*

## 1.5 Perheiden johtaminen — suostumus ja oikea viestintä

- **Suostumusprosessi** on sekä lakisääteinen (alaikäisten data, GDPR) että luottamuksen perusta.
  Selkeä kutsu + matala kynnys = korkea konversio.
- **Perheviestintä noudattaa lapsen suojaa:** vanhemmalle ei näytetä tasolukuja, percentiilejä eikä
  vertailua muihin lapsiin — vaan vahvuus ensin, prosessikehu ja konkreettiset tukivinkit. Tämä estää
  että data muuttuu kotona painostukseksi. Varmista että valmentajasi viestivät tässä hengessä.

**Johtamiskysymys:** *"Kokeeko perhe TalentMasterin tukena vai arvosteluna?"* — tavoite on tuki.

## 1.6 VP:n ehdotettu rytmi

- **Viikoittain:** lue joukkuepulssit + signaalit → valitse 1–2 kohdetta. Lähetä mentorointiviesti
  valmentajalle jota kävit katsomassa.
- **Harjoituskäynnillä:** tee harjoitusarviointi (malli A). Pyydä valmentajaa tekemään itsearvio (B)
  samasta harjoituksesta → katso kalibraatio yhdessä.
- **Kuukausittain:** tarkista suostumuskonversio + datakypsyys. Onko jokin joukkue jäänyt jälkeen
  mittauksissa?
- **Kausittain:** IDP-katselmus, talenttiohjelman koostaminen, kehitysvauhdin koonti (2. mittausten myötä).

---

# OSA 2 — VALMENTAJA: Näin teet TalentMasterilla arjessa

Roolisi on **tuottaa elävää dataa ja sulkea silmukka pelaajalle ja perheelle**. Näet oman joukkueesi
pelaajat, teet havainnot ja testit, ja viestit eteenpäin. Itsearviosi on **sinun oma kehityksesi
työkalu** — valmennuspäällikkö ei käytä sitä arvosteluun.

> **Valmentajan välilehdet:** 🏠 Koti · 👤 Pelaajat · 👁 Havainnot · ✉️ Viestit · ⋯ Lisää (Tänään,
> Pulssi, Kehitys, Kausi, Kalenteri, Testit, Itsearvio / Valmentajana kehittyminen). Uudelle käyttäjälle
> on **"Aloita tästä"** -kohta.

## 2.1 Itsearvio + reflektio + CPD — oma kehittymisesi

- **Itsearvio (malli B = valmennustaidot):** arvioi omaa pedagogiikkaasi, palautteen antoa, harjoituksen
  organisointia. Tämä on sinua varten — näet oman kehityskäyräsi. Et arvioi harjoituksiasi numeerisesti
  (malli A) — se on valmennuspäällikön työkalu.
- **Kalibraatio.** Kun valmennuspäällikkö havainnoi saman harjoituksen (hän täyttää saman malli B:n
  havainnointina), näet **oman itsearviosi ja hänen havaintonsa eron** per kriteeri. Tämä ei ole arvostelu
  vaan peili itsetuntemukseen ja mentoroinnin lähtökohta.
- **Reflektiopäiväkirja:** kirjoita tai **nauhoita ääneen** ajatuksesi harjoituksen jälkeen. Litterointi
  tapahtuu automaattisesti. Päiväkirja on **yksityinen** — vain sinä (ja super-admin tukea varten) näet sen.
- **CPD-todiste:** reflektiot ja arvioinnit kokoavat näytön jatkuvasta ammatillisesta kehittymisestä —
  hyödyllinen lisenssien ylläpitoon.

## 2.2 Testaus kentällä — mittaa, ja data herää

- **Testaustyökalu (Testaus_v9):** suunnittele tapahtuma toimistossa (protokolla + joukkue + osallistujat),
  testaa kentällä korttinäkymällä yksi pelaaja kerrallaan. **Toimii offline** — tulokset tallentuvat
  paikallisesti ja synkkaavat kun verkko palaa.
- Indeksit (TKI, kehon valmius, H-H-taso) lasketaan automaattisesti, ja **pikakentät päivittyvät** →
  VP:n joukkuepulssi ja pelaajan oma näkymä heräävät heti.
- Jos seuralla on historiallista testidataa, se tuodaan Excel-tuonnilla (myös Palloliiton
  tekniikkakilpailu-PDF:t).

## 2.3 Havainnot — pelihavainto (peliäly / D4), näe se mitä mittari ei näe

> Master-näkymässä tämä on **Havainnot**-välilehti.

- Mittaus kertoo fysiikan ja tekniikan, mutta **peliälyä (D4) ei mitata kellolla**. Kirjaat
  pelitilanteesta laadullisen havainnon (havainnointi, päätöksenteko, toiminta, reagointi) — se täydentää
  mittausdataa ja on **pelaajaraportin pelihavainto-lähde** (ks. OSA 3).
- Havaintosi näkyvät pelaajan näkymässä **omalla, kannustavalla kielellään** — sinä hyväksyt viestin ennen
  kuin pelaaja näkee sen.

> **Huom (2026-06):** aiempi ADAR-pikakortti on poistettu käytöstä. Pelihavainnon kirjaustyökalun nykytila
> varmistetaan live-UI:sta ennen tämän osan jakelua (ks. TILA-huomio).

## 2.4 Viestit pelaajalle ja perheelle — sulje silmukka

- Kun kirjaat havainnon tai lähetät viestin, se näkyy pelaajan ja vanhemman sovelluksessa.
  **Pelaajalle ei koskaan näytetä raakalukuja, vertailua tai pisteiden laskua** — vain kannustava,
  lapsen kielellä kirjoitettu viesti (vahvuus ensin, seuraava askel saavutettavana).
- Pelaaja kirjaa omat harjoituksensa ja fiiliksensä → ne näkyvät sinun **Viestit-välilehdelläsi**.
- Vanhempi voi lähettää lapselle kehun → se näkyy pelaajan kotinäkymässä. Perhe on osa kehitystiimiä.
- **Sinä omistat omien pelaajiesi kehityksen** — kirjaat heille palautetta ja tavoitteita, VP tuo
  kokonaiskuvan, ja keskustelette näkökulmista yhdessä. Avaa pelaajalta **📋 Pelaajaraportti + tavoitteet**:
  näet raportin (Mittaus / Ottelu / Pelihavainto + vahvuus / kehityskohde / resepti) ja kirjaat tavoitteita
  + palautetta. Tavoitteet näkyvät myös valmennuspäällikölle.

## 2.5 Viestit — yksi syöte

Master-näkymän **Viestit**-välilehti kokoaa: pelaajien omatoimiset kirjaukset (fiilis + harjoittelu) + VP:n
mentorointiviestit. Voit reagoida ja viestiä perheelle suoraan jokaisesta kortista.

## 2.6 Valmentajan ehdotettu rytmi

- **Joka harjoitus:** havainnoi (ADAR), tarvittaessa viesti pelaajalle. Reflektoi lyhyesti jälkeenpäin.
- **Testipäivänä:** Testaus_v9 kentällä, merkitse valmiiksi → data synkkaa.
- **Viikoittain:** lue Viestit (pelaajien kirjaukset), tee oma itsearvio jos kävit ohjatun harjoituksen.
- **VP:n käynnin yhteydessä:** tee itsearvio samasta harjoituksesta → kalibraatiokeskustelu.

---

# OSA 3 — Pelaajaraportti ja VP–valmentaja-yhteistyö

Yksittäisen pelaajan kokonaiskuva kootaan **Pelaajaraporttiin** (VP-näkymän **Raportit**-välilehti).
Se on *esitettävä raportti*, ei selausnäkymä — yksi sivu per pelaaja, vietävissä PDF:ksi. Eri asia kuin
IDP-kortti: **raportti kertoo mitä data sanoo, IDP-kortti mitä tehdään seuraavaksi.**

## 3.1 Mikä pelaajaraportti on

Kolme lähdettä rinnakkain, värikoodattuna — periaate **"data-informed, not data-driven"**:

- **Mittaus (objektiivinen):** fyysinen (H-H / D1), tekninen (TKI), kehon valmius, PHV / bio-ikä. Testidata.
- **Ottelu (pelisuoritus):** TASO-pelidata (minuutit, arvosana). Pilotissa usein vielä tyhjä.
- **Pelihavainto (subjektiivinen):** valmentajan arvio peliälystä (D4). Vähän havaintoja → merkitään epävarmaksi.

Lisäksi: 5D-profiili (D1–D5), talenttisignaalit (Hidden Gem vaiheineen, X-Factor) ja RAE / kypsyys-reiluus.

**Erimielisyys on arvo, ei virhe.** Kun lähteet eroavat — esim. mittaus näyttää vahvaa tekniikkaa mutta
pelihavainto on niukkaa tai otteludataa ei ole — raportti **nostaa ristiriidan esiin** eikä anna tuomiota.
Se on kehotus: *"vahvista pelitilanteessa."* Tämä on suora vastalääke silmämääräiselle talenttivalinnalle.

## 3.2 Kolme skiniä — sama data, eri kieli

**Raportti on VP:n työkalu.** VP avaa sen ja **vaihtaa skiniä** (näkökulmaa) tilanteen mukaan. Skinit eivät
ole roolikohtaisia kirjautumisia — kaikki kolme ovat saman raportin kehyksiä, jotka VP valitsee:

- **Johtaja (VP):** kalibraatio (valmentaja / VP / pelaaja -näkökulmat + kuilu), RAE-reiluus,
  talenttisignaali perusteluineen, päätös- / muistiinpanokenttä. VP:n oletusnäkymä.
- **Valmentaja:** vahvuus + kehityskohde per laji, **resepti** (seuraava harjoitusteema), per-testi-detalji.
  VP avaa tämän kun käy raporttia läpi valmentajan kanssa (kehityspalaveri).
- **Vanhempi:** lapsiturvallinen laadullinen näkymä (ei tasolukuja / vertailua) — vahvuus ensin, yksi
  saavutettava askel, miten tukea kotona. VP tuottaa tästä vanhemmalle PDF:n.

> **Rooliperiaate (päätös 2026-06-23):** valmentajalla on oikeus omiin pelaajiinsa — hän kirjaa heille
> tavoitteita ja palautetta ja näkee oman joukkueensa pelaajaraportit (Valmentaja-skin). VP näkee kaikki,
> tuo kokonaiskuvan ja reiluuden, ja **VP ja valmentaja keskustelevat näkökulmista** (kehityspalaveri).
> *Pelaaja ensin, hallinto vahvistaa.*
>
> - **Rakennettu (2026-06-23):** valmentajalla on **oma pääsy Pelaajaraporttiin** Master-näkymässä
>   (📋 Pelaajaraportti + tavoitteet, oman joukkueen pelaajat) + **jäsennelty tavoitteiden kirjaus**
>   omille pelaajille. Lisäksi palaute ja havainnot (Havainnot, Viestit).
> - **Vaihe 2.1 (tulossa):** VP-puolen tavoitenäyttö (johto näkee valmentajan kirjaamat tavoitteet
>   raportin Johtaja-skinissä).

## 3.3 Näin VP ja valmentaja tekevät yhteistyötä

Yhteistyö ei ole raporttien lähettelyä vaan **jaettua tulkintaa saman datan äärellä**:

1. **Kehityspalaveri (4×/kausi):** pelaajaraportti projisoidaan ruudulle. VP katsoo
   Johtaja-skinillä (kokonaiskuva, talentit, reiluus), valmentaja Valmentaja-skinillä (vahvuus /
   kehityskohde / resepti). Sama pelaaja, kaksi näkökulmaa → yhteinen päätös. Sekä VP että valmentaja
   voivat avata raportin (valmentaja oman joukkueensa pelaajista); kehityspalaverissa katsotaan yhdessä.
   Erimielisyyspalkki ohjaa keskustelun oikeaan kohtaan.
2. **Harjoitusarviointi + kalibraatio:** VP havainnoi harjoituksen (malli A), valmentaja tekee itsearvion
   (malli B). Kalibraatio näyttää missä käsitykset eroavat → mentoroinnin lähtökohta.
3. **Mentorointi-loop:** VP:n viesti → valmentajan Viestit-välilehti. Jatkuva, kontekstissa pysyvä dialogi kausien yli.
4. **Talenttipäätös:** Hidden Gem / X-Factor -signaali → VP:n vahvistus. Valmentajan kenttähavainto +
   VP:n strateginen kuva yhdessä → talenttiohjelmaan.
5. **Pelaajalle ja perheelle päin:** valmentaja omistaa päivittäisen viestinnän (havainto → pelaaja),
   VP varmistaa että koko seura viestii lapsiturvallisesti.

**Roolijako lyhyesti:** valmentaja tuntee pelaajan arjessa ja tuottaa havainnon; VP näkee kokonaiskuvan,
reiluuden ja kauden kaaren. Pelaajaraportti on paikka jossa nämä kaksi kohtaavat saman pelaajan äärellä.

---

# OSA 4 — "Näin data herää" -looppi (yhteinen muistikortti)

| Vaihe | Kuka | Toiminto | Mikä herää |
|---|---|---|---|
| 1. Rosteri | VP | Tuo pelaajat (Excel) | Pelaajalista |
| 2. Suostumus | VP → perhe | Massakutsu → huoltaja hyväksyy | PIN, syntymäaika, RAE, perheviestintä |
| 3. Mittaus | Valmentaja | Testaus_v9 + pelihavainnot | Pikakentät (TKI, valmius, H-H, pelihavainto) |
| 4. Dashboard | (automaattinen) | Pikakentät täyttyvät | Joukkuepulssi, signaalit, syvänäkymä |
| 5. Toimenpide | VP + valmentaja | Mentorointi, IDP, pelaajaviesti | Suljettu kehityssilmukka |
| 6. Seuranta | molemmat | 2. mittaus | Kehitysvauhti (delta) näkyviin |

**Tärkein viesti molemmille rooleille:** dashboard ei ole tyhjä siksi että järjestelmä ei toimi, vaan
siksi että polku ei ole vielä auki. Avaa polku, niin näkymät täyttyvät itsestään.

---

# OSA 5 — Vaihe 2: in-app-kerros (suunnitelma, ei vielä rakennettu)

Tämän pelikirjan sisältö viedään järjestelmän sisään muotoon **checklist + selittävä opas yhdessä**
(käyttäjän valinta 2026-06-23):

- **Edistymis-checklist (datavetoinen):** roolikohtainen "Näin pääset alkuun" joka **lukee pikakentät**
  ja näyttää oikean tilan — "Tuo pelaajat ✓ · Kutsu huoltajat (6/61) · Tee 1. testi · Katso joukkuepulssi".
  Sama moottori kuin Admin "Pilotin tila" (§33). Ohjaa seuraavan teon eikä vain selitä.
- **Selittävä opas-paneeli:** OSA 1 / OSA 2 -sisältö roolin mukaan, avattavissa milloin tahansa
  ("Näin johdat" / "Näin teet").
- **Olemassa olevan hyödyntäminen:** Master-näkymässä on jo **"Aloita tästä"** -kohta → laajenna sitä,
  älä rakenna tyhjästä.
- **Kontekstuaalinen ℹ️ (`TM_SELITTEET`):** jo olemassa — laajennetaan kattavuutta, mikrotason apu
  yksittäisille luvuille/napeille.

**Periaatteet (kun rakennetaan):** pikakentät (§26, ei uusia kyselyitä) · §7.22 (ei pelaajalle lukuja) ·
Carbon §5 · yksi `@media` §17 · roolitietoinen (VP näkee OSA 1, valmentaja OSA 2). Ei "kysy/AI-Q&A"
ensimmäisessä vaiheessa — se kuuluu myöhempään AI-agenttivaiheeseen (Sprint 6).

> **Status:** sisältö (OSA 1–4) valmis ja jaettavissa heti onboarding-materiaalina. In-app-kerros (OSA 5)
> = oma rakennusvaihe; mockup → komento → live-verify kun työjonoon valitaan.
