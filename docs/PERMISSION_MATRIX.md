# TalentMaster™ — Permission Matrix
# Päivitetty: 2026-03-24
# Muutokset edelliseen versioon:
#   1. Seurasihteeri lisätty omana roolinaan
#   2. Rekisteröintiprosessi lisätty omana datatyyppinään
#   3. Deaktivointi vs. poisto selvennetty
#   4. Pakettitasojen logiikka tarkennettu

## Merkinnät

RW  = Luku + kirjoitus
R   = Vain luku
R*  = Rajoitettu luku (yksinkertaistettu tai suodatettu näkymä)
D   = Poisto-oikeus (delete)
–   = Ei pääsyä

---

## Roolit — kuvaukset ja vastuut

### Taso 1: Platform-hallinta (TalentMaster)
Super Admin (Tero / TalentMaster-ylläpitäjä) on ainoa rooli joka näkee kaikkien
seurojen datan. Hän hallinnoi seuroja, paketteja ja laskutusta. Pilotin aikana hän
voi toimia minkä tahansa seuran kontekstissa auttaakseen seuraa käyttöönottovaiheessa.

### Taso 2: Seuran hallinto
Valmennuspäällikkö (VP) johtaa seuran valmennustoimintaa. Hänellä on laajat
kirjoitusoikeudet seuran dataan ja hän vastaa valmentajien kutsumisesta sekä
pelaajien rekisteröinnistä omassa seurassaan.

Urheilutoimenjohtaja (UTJ) vastaa seuran operatiivisesta toiminnasta. Hänellä on
samat käyttäjähallintaoikeudet kuin VP:llä mutta hän ei välttämättä osallistu
päivittäiseen valmennukselliseen dataan.

Seurasihteeri on hallinnollinen rooli joka hoitaa pelaajien rekisteröinnin,
sopimusdokumentaation ja viestinnän vanhemmille. Hänellä EI ole pääsyä
valmennukselliseen kehitysdataan (testit, biologinen ikä, ADAR) — ainoastaan
rekisteröintiin ja perustietoihin liittyviin toimintoihin. Tämä on GDPR-periaatteen
mukainen minimaalinen tietotarve.

### Taso 3: Operatiivinen työ
Talenttivalmentaja, Fysiikkavalmentaja, Fysioterapeutti, Testivastaava ja Valmentaja
käyttävät järjestelmää päivittäin omaan erityisalaansa liittyen. He eivät hallinnoi
käyttäjiä eivätkä näe muiden joukkueiden tai seurojen dataa.

### Käyttäjät ilman tunnuksia järjestelmässä
Pelaaja ja Vanhempi käyttävät järjestelmää omien tunnustensa kautta — pelaaja
näkee oman kehityspolkunsa, vanhempi näkee lapsensa datan. Nämä tunnukset luodaan
vasta kun rekisteröinti- ja GDPR-prosessi on valmistunut.

---

## Roolit ja pakettitasot

Pakettitaso määrää mitkä roolit seuralle voidaan aktivoida. Perustasolla seura
saa käyttöönsä perusvalmennusroolit. Kehitystasolla lisätään erityisosaajat.
Huipputasolla kaikki roolit ovat käytössä.

| Rooli | Perustaso | Kehitystaso | Huipputaso |
|---|---|---|---|
| Valmennuspäällikkö (VP) | ✅ | ✅ | ✅ |
| Seurasihteeri | ✅ | ✅ | ✅ |
| Valmentaja | ✅ | ✅ | ✅ |
| Testivastaava | ✅ | ✅ | ✅ |
| Talenttivalmentaja | – | ✅ | ✅ |
| Fysiikkavalmentaja | – | ✅ | ✅ |
| Fysioterapeutti | – | – | ✅ |
| Urheilutoimenjohtaja | – | ✅ | ✅ |
| Pelaaja | ✅ | ✅ | ✅ |
| Vanhempi | ✅ | ✅ | ✅ |

Huomio: Seurasihteeri on lisätty Perustasolta alkaen, koska pelaajien rekisteröinti
on seuran perustarve riippumatta pakettitasosta.

---

## Datatyypit ja oikeudet

### Pelaajadata (nimi, syntymäaika, seura, joukkue)

Pelaajan perustiedot ovat ne tiedot jotka huoltaja syöttää rekisteröintilomakkeella.
Ne ovat myös kaikkein laajimmin jaettuja tietoja — lähes kaikilla rooleilla on
lukuoikeus, koska pelaajan nimi ja joukkue ovat tarpeen päivittäisessä työssä.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | Kaikki seurat |
| VP | RW | Oma seura |
| Seurasihteeri | RW | Oma seura — rekisteröinti ja perustietojen ylläpito |
| Valmentaja | R | Vain oma joukkue |
| Talenttivalmentaja | R | Kaikki seuran pelaajat |
| Fysiikkavalmentaja | R | Kaikki seuran pelaajat |
| Fysioterapeutti | R | Kaikki seuran pelaajat |
| Testivastaava | R | Kaikki seuran pelaajat |
| Pelaaja | R | Vain oma profiili |
| Vanhempi | R | Vain lapsen profiili |


### Testitulokset (nopeus, ketteryys, kevennyshyppy)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Seurasihteeri | – | Ei valmennuksellista tarvetta |
| Valmentaja | R | Oma joukkue |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | RW | |
| Testivastaava | RW | |
| Pelaaja | R | Omat tulokset |
| Vanhempi | R* | Yksinkertaistettu — "hyvä / kehittyy / tavoite" |


### Biologinen ikä ja PHV-data ⚠️ Arkaluonteinen

Biologinen ikä on fysiologinen mittaus joka kertoo pelaajan kasvun vaiheen.
Se on erityisen arkaluonteinen alle 18-vuotiaiden kohdalla (GDPR erityiskategoria).
Tämän datan näkeminen vaatii erillisen suostumuksen rekisteröintilomakkeella.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Seurasihteeri | – | Ei tarvetta — hallinnollinen rooli |
| Valmentaja | R | Oma joukkue |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | RW | |
| Fysioterapeutti | R | |
| Testivastaava | R | |
| Pelaaja | R* | Selkokielinen: "kasvupyrähdyksen loppuvaihe" |
| Vanhempi | R* | Selkokielinen + kuormitusrajoitukset |


### ADAR-pisteet ja Game IQ

ADAR on psykologinen arviointimenetelmä. Tämä on ammattilaisten välinen tieto
jota ei jaeta suoraan pelaajalle numeroina — pelaaja saa selkokielisen palautteen.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | Ei kirjoitusoikeutta — talenttivalmentajan vastuualue |
| Seurasihteeri | – | |
| Valmentaja | R | Oma joukkue |
| Talenttivalmentaja | RW | Omistaa tämän data-alueen |
| Fysiikkavalmentaja | R* | Vain fyysiseen kehitykseen liittyvä osuus |
| Fysioterapeutti | R* | Vain kuntoutukseen liittyvä osuus |
| Testivastaava | – | |
| Pelaaja | R* | Selkokielinen palaute, ei numeroita |
| Vanhempi | – | |


### Harjoitteluseuranta (SPL 7 kriteeriä)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Seurasihteeri | – | |
| Valmentaja | R | Oma joukkue — valmentaja tekee kirjaukset, ei muokkaa niitä |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | R* | Vain fyysinen osuus |
| Fysioterapeutti | – | |
| Testivastaava | – | |
| Pelaaja | – | |
| Vanhempi | – | |

Huomio: Valmentaja tekee harjoituskirjaukset (kirjoitusoikeus kirjauksiin), mutta
hän ei muokkaa toisen valmentajan kirjauksia. Tämä on tärkeä ero — yllä oleva R
tarkoittaa "luku muiden kirjauksiin", mutta valmentajalla on RW omiin kirjauksiinsa.
Tämä tarkennus tehdään Security Rules -tasolla.


### Vamma- ja kuntoutusdata ⚠️ Terveystieto

Vammadata on GDPR:n erityiskategoriaa (terveystieto). Se vaatii erillisen
suostumuksen rekisteröintilomakkeella. Tätä dataa käsittelevällä henkilöllä
pitää olla ammatillinen peruste käsittelyyn.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | Ei kirjoitusoikeutta — fysioterapeutin vastuualue |
| Seurasihteeri | – | |
| Valmentaja | R* | Vain "ei kontaktia tällä viikolla" -taso — ei diagnooseja |
| Talenttivalmentaja | R* | Vain kuormitusrajoitukset |
| Fysiikkavalmentaja | R | |
| Fysioterapeutti | RW | Omistaa tämän data-alueen |
| Testivastaava | – | |
| Pelaaja | R | Oma kuntoutussuunnitelma |
| Vanhempi | R | Lapsen kuntoutustiedot |


### Talenttiohjelma ja nimeämiset

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Seurasihteeri | – | |
| Valmentaja | R* | Vain tieto onko pelaaja ohjelmassa — ei yksityiskohtia |
| Talenttivalmentaja | RW | Omistaa tämän prosessin |
| Fysiikkavalmentaja | – | |
| Fysioterapeutti | – | |
| Testivastaava | – | |
| Pelaaja | – | Tieto tulee IDP-kortin kautta selkokielisenä |
| Vanhempi | – | |


### Rekisteröintiprosessi ja kutsulinkki (UUSI)

Rekisteröintiprosessi tarkoittaa kaikkea pelaajan lisäämiseen liittyvää: kutsulinkin
luominen ja lähettäminen vanhemmalle, suostumusten keräys, pelaajan perustietojen
syöttö järjestelmään. Tämä on seurasihteerin ydintehtävä.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD | Voi tehdä kaikille seuroille pilotin aikana |
| VP | RW | Oma seura |
| Seurasihteeri | RW | Oma seura — tämä on hänen päätehtävänsä |
| Urheilutoimenjohtaja | RWD | Oma seura |
| Valmentaja | – | Valmentaja ei hallinnoi rekisteröintejä |
| Muut operatiiviset | – | |
| Pelaaja / Vanhempi | R | Voi katsoa oman suostumuksensa tilan |

Kutsulinkin rakenne: /TalentMaster_Rekisterointi_Suostumus.html
?kutsuId=xxx&seuraId=kpv&seura=KPV&joukkue=U14&etunimi=Matti&hEmail=huoltaja@email.fi

Suostumusdokumentti tallentuu: seurat/{seuraId}/pelaajat/{pelaajaId}/suostumus


### Käyttäjähallinta (kutsut, roolit, paketit)

Käyttäjähallinta tarkoittaa muiden käyttäjätunnusten luomista, muokkaamista ja
deaktivointia. Tämä on kriittinen erottelu: vain muutama rooli saa koskea muiden
tunnuksiin.

Tärkeä erottelu: DEAKTIVOINTI vs. POISTO

Deaktivointi (aktiivinen: false) tarkoittaa että käyttäjä ei voi enää kirjautua,
mutta hänen tietonsa säilyvät järjestelmässä. Tämä on turvallinen toimenpide
ja VP voi tehdä sen. Poistetulle käyttäjälle voidaan myös palauttaa pääsy.

Poisto tarkoittaa tietojen pysyvää poistamista sekä Firebase Authista että
Firestoresta. Tämä on peruuttamaton toimenpide ja GDPR:n kannalta se voidaan
tehdä vain rekisteröidyn nimenomaisesta pyynnöstä (right to erasure). Vain
Super Admin ja UTJ voivat tehdä varsinaisia poistoja.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD | Luo, muokkaa, deaktivoi, poistaa — kaikki seurat |
| Urheilutoimenjohtaja | RWD | Luo, muokkaa, deaktivoi, poistaa — oma seura |
| VP | RW | Luo ja muokkaa — ei poisto-oikeutta, voi deaktivoida |
| Seurasihteeri | R | Näkee käyttäjälistan — ei luo eikä muokkaa tunnuksia |
| Kaikki muut | – | |

Huomio: Seurasihteeri näkee käyttäjälistan (esim. voi tarkistaa onko vanhempi
jo rekisteröitynyt), mutta hän ei luo uusia tunnuksia järjestelmään. Seurasihteerin
työkalu on rekisteröintilinkki, ei käyttäjänluontilomake.


### Sopimukset ja Palloliiton kriteerit (UUSI)

Sopimukset tarkoittavat seuran sisäisiä kausisuunnitelmia, valmentajasopimuksia
ja muita hallinnollisia dokumentteja. Palloliiton kriteerit ovat ne tavoitteet
ja standardit joihin seuran valmennustoimintaa verrataan.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | Omistaa tämän alueen seuratasolla |
| Seurasihteeri | RW | Hallinnoi sopimusdokumentaatiota |
| Urheilutoimenjohtaja | RW | |
| Valmentaja | R | Näkee omat sopimuksensa ja kriteerit |
| Muut operatiiviset | R | Vain omat asiaan liittyvät dokumentit |
| Pelaaja / Vanhempi | – | |

---

## Tietosuojahuomiot

### GDPR-kriittiset datatyypit

Neljä datatyyppiä vaatii erityistä huomiota GDPR:n näkökulmasta. Pelaajien
henkilötiedot (nimi, syntymäaika) vaativat rekisteröinnin yhteydessä annettavan
suostumuksen. Biologinen ikä on fysiologinen tieto jolla on erityinen suoja
alaikäisten kohdalla — se vaatii erillisen vapaaehtoisen suostumuksen lomakkeella.
Vammadata on terveystietoa joka vaatii oman erillisen suostumuksensa. ADAR-pisteet
ovat psykologisen arvioinnin tuloksia jotka ovat ammattilaisten välistä tietoa.

### Suostumushierarkia

Pakollinen suostumus (kaikki tarvitsevat): tietojen tallentaminen rekisteriin
ja tietosuojaselosteen lukeminen. Ilman näitä pelaajaa ei voi lisätä järjestelmään.

Vapaaehtoinen suostumus (erikseen pyydettävä): fyysinen testaaminen ja kehitysseuranta,
biologisen iän arviointi, kehitystietojen jakaminen seuran valmentajille, anonymisoitu
data palvelun kehittämiseen. Jokainen näistä voidaan myöntää tai hylätä erikseen.
Kieltäytyminen ei estä järjestelmän käyttöä perustasolla.

### Huoltajan oikeudet

Alaikäisen pelaajan kaikki data vaatii huoltajan suostumuksen — ei pelkästään
arkaluonteinen data. Huoltajalla on oikeus milloin tahansa nähdä kaikki lapsestaan
tallennetut tiedot, pyytää niiden oikaisemista ja pyytää niiden poistoa. Suostumus
voidaan peruuttaa milloin tahansa — tämä ei vaikuta aiemmin tehtyyn käsittelyyn
mutta estää uuden datan keräämisen. Kaikki suostumukset tallentuvat Firestoreen
aikaleimalla ja antajan nimellä dokumentoituina.

### Seurojen välinen eristys

Firestore Security Rules rakentaa rakenteellisen esteen seurojen välille — jokainen
seura on oma "saarekkeensa" seurat/{seuraId}-polun alla. Kukaan VP tai valmentaja
ei voi vahingossakaan lukea toisen seuran dataa, koska Security Rules tarkistaa
token.seuraId-kentän jokaisessa pyynnössä. Super Admin on ainoa poikkeus.

### Seurasihteerin erityinen tietosuoja-asema

Seurasihteeri käsittelee suuria määriä henkilötietoja (rekisteröinnit, sopimukset,
yhteystiedot) mutta hänellä on tarkoituksellisesti rajoitettu pääsy valmennukselliseen
kehitysdataan. Tämä on minimaalisen tietotarpeen periaate käytännössä — sihteeri
saa nähdä juuri sen minkä hallinnollinen työ vaatii, ei enemmän.
