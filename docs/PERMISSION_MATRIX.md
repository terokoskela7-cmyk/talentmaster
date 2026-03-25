# TalentMaster™ — Permission Matrix
# Päivitetty: 2026-03-25
# Muutokset edelliseen versioon:
#   - Seurasihteeri lisätty omana roolinaan (Perustasolta alkaen)
#   - Rekisteröintiprosessi lisätty omana datatyyppinään
#   - Deaktivointi vs. poisto selvennetty
#   - Joukkueet-taulukko (useampi joukkue per valmentaja) kirjattu
#   - Talenttivalmentajan joukkueeton näkyvyys selvennetty

---

## Merkinnät

RW  = Luku + kirjoitus
R   = Vain luku
R*  = Rajoitettu luku (yksinkertaistettu tai suodatettu näkymä)
D   = Poisto-oikeus (delete — peruuttamaton toimenpide)
–   = Ei pääsyä

---

## Kolmitasoinen hallintamalli

### Taso 1 — TalentMaster Platform
Super Admin (Tero / TalentMaster-ylläpitäjä) on ainoa rooli joka näkee kaikkien
seurojen datan. Hän hallinnoi seuroja, paketteja ja laskutusta. Pilotin aikana hän
toimii minkä tahansa seuran kontekstissa seuravalitsimella auttaakseen käyttöönotossa.
Tunniste Firestoressä: rooli = "super_admin" (alaviivalla).

### Taso 2 — Seuran hallinto
Valmennuspäällikkö (VP) johtaa seuran valmennustoimintaa. Hänellä on laajat
kirjoitusoikeudet ja hän vastaa valmentajien kutsumisesta ja pelaajien rekisteröinnistä.

Urheilutoimenjohtaja (UTJ) vastaa seuran operatiivisesta kokonaisuudesta.
Käyttäjähallintaoikeudet kuten VP:llä mutta hänellä on myös poisto-oikeus (D).

Seurasihteeri hoitaa pelaajien rekisteröinnin, sopimusdokumentaation ja viestinnän
vanhemmille. Hänellä EI ole pääsyä valmennukselliseen kehitysdataan (testit, biologinen
ikä, ADAR) — ainoastaan rekisteröintiin ja perustietoihin. Tämä on GDPR:n minimaalisen
tietotarpeen periaate käytännössä.

### Taso 3 — Operatiivinen työ
Valmentaja, talenttivalmentaja, fysiikkavalmentaja, fysioterapeutti, testivastaava.
Käyttävät järjestelmää päivittäin. Eivät hallinnoi käyttäjiä eivätkä näe muiden
seurojen dataa. Valmentajalla voi olla useita joukkueita (joukkueet[]-taulukko).

### Käyttäjät ilman sisäänkirjautumistunnuksia
Pelaaja ja vanhempi käyttävät järjestelmää omien tunnustensa kautta — pelaaja näkee
oman kehityspolkunsa, vanhempi näkee lapsensa datan. Tunnukset luodaan kun
rekisteröinti- ja GDPR-prosessi on valmistunut.

---

## Roolit ja pakettitasot

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

Seurasihteeri on lisätty Perustasolta alkaen koska rekisteröinti on seuran perustarve.

---

## Datatyypit ja oikeudet

### Pelaajadata (nimi, syntymäaika, seura, joukkue, PalloID)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | Kaikki seurat |
| VP | RW | Oma seura |
| Seurasihteeri | RW | Oma seura — rekisteröinti ja perustietojen ylläpito |
| Valmentaja | R | Vain omat joukkueet (joukkueet[]-listan mukaan) |
| Talenttivalmentaja | R | Kaikki seuran pelaajat — ei joukkuerajausta |
| Fysiikkavalmentaja | R | Kaikki seuran pelaajat |
| Fysioterapeutti | R | Kaikki seuran pelaajat |
| Testivastaava | R | Kaikki seuran pelaajat |
| Pelaaja | R | Vain oma profiili |
| Vanhempi | R | Vain lapsen profiili |

Joukkueet-arkkitehtuuri: valmentajalla voi olla useita joukkueita.
Firestoressä: joukkue: "u14" (vanha, yhteensopivuus) + joukkueet: ["u14","u12"] (uusi).
Custom Claims JWT:ssä: joukkue + joukkueet molemmat — Security Rules tarkistaa molemmat.
Talenttivalmentajalla ei joukkuerajausta lainkaan — rooli antaa laajan näkyvyyden.

### Testitulokset (nopeus, ketteryys, kevennyshyppy, PHV)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Seurasihteeri | – | Ei valmennuksellista tarvetta |
| Valmentaja | R | Omat joukkueet |
| Talenttivalmentaja | R | Kaikki seuran pelaajat |
| Fysiikkavalmentaja | RW | Omistaa tämän data-alueen |
| Testivastaava | RW | |
| Pelaaja | R | Omat tulokset |
| Vanhempi | R* | Yksinkertaistettu — "hyvä / kehittyy / tavoite" |

### Biologinen ikä ja PHV-data ⚠️ Arkaluonteinen

Fysiologinen mittaus joka kertoo pelaajan kasvun vaiheen. Erityinen suoja
alle 18-vuotiaille (GDPR erityiskategoria). Vaatii erillisen vapaaehtoisen suostumuksen.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Seurasihteeri | – | Ei tarvetta — hallinnollinen rooli |
| Valmentaja | R | Omat joukkueet |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | RW | |
| Fysioterapeutti | R | |
| Testivastaava | R | |
| Pelaaja | R* | Selkokielinen: "kasvupyrähdyksen loppuvaihe" |
| Vanhempi | R* | Selkokielinen + kuormitusrajoitukset |

### ADAR-pisteet ja Game IQ

Psykologinen arviointimenetelmä — ammattilaisten välinen tieto.
Pelaajalle näytetään vain selkokielinen palaute, ei numeroita.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | Ei kirjoitusoikeutta |
| Seurasihteeri | – | |
| Valmentaja | R | Omat joukkueet |
| Talenttivalmentaja | RW | Omistaa tämän data-alueen |
| Fysiikkavalmentaja | R* | Vain fyysiseen kehitykseen liittyvä osuus |
| Fysioterapeutti | R* | Vain kuntoutukseen liittyvä osuus |
| Testivastaava | – | |
| Pelaaja | R* | Selkokielinen palaute, ei numeroita |
| Vanhempi | – | |

### Harjoitteluseuranta (SPL 7 kriteeriä)

Valmentaja tekee kirjaukset (RW omiin kirjauksiin) mutta ei muokkaa
toisten kirjauksia (R muiden kirjauksiin). Security Rules toteuttaa tämän.

| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| VP | RW |
| Seurasihteeri | – |
| Valmentaja | R muiden + RW omat kirjaukset |
| Talenttivalmentaja | R |
| Fysiikkavalmentaja | R* (fyysinen osuus) |
| Fysioterapeutti | – |
| Testivastaava | – |
| Pelaaja | – |
| Vanhempi | – |

### Vamma- ja kuntoutusdata ⚠️ Terveystieto

GDPR:n erityiskategoria. Vaatii erillisen suostumuksen. Käsittelijällä
pitää olla ammatillinen peruste.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | |
| Seurasihteeri | – | |
| Valmentaja | R* | Vain "ei kontaktia tällä viikolla" -taso, ei diagnooseja |
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
| Valmentaja | R* | Vain tieto onko pelaaja ohjelmassa |
| Talenttivalmentaja | RW | Omistaa tämän prosessin |
| Muut operatiiviset | – | |
| Pelaaja | – | Tieto tulee IDP-kortin kautta selkokielisenä |
| Vanhempi | – | |

### Rekisteröintiprosessi ja kutsulinkki

Sisältää: kutsulinkin luominen, Excel-pohjan lataus, suostumusten keräys,
massakutsujen lähettäminen, suostumusseuranta.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD | Kaikki seurat — pilotin aikana auttaa seuroja |
| VP | RW | Oma seura |
| Seurasihteeri | RW | Oma seura — tämä on hänen päätehtävänsä |
| Urheilutoimenjohtaja | RWD | Oma seura |
| Valmentaja | – | |
| Muut operatiiviset | – | |
| Pelaaja / Vanhempi | R | Oma suostumusstatus |

Kutsulinkin rakenne:
/TalentMaster_Rekisterointi_Suostumus.html?seuraId=kpv&seura=KPV&joukkue=U14&etunimi=Matti&hEmail=huoltaja@email.fi

### Käyttäjähallinta (tunnusten luonti, roolit, paketit)

Tärkeä erottelu: DEAKTIVOINTI vs. POISTO.

Deaktivointi (aktiivinen: false) on turvallinen toimenpide — käyttäjä ei voi
kirjautua mutta tiedot säilyvät. VP voi tehdä tämän.

Poisto (Firebase Auth + Firestore) on peruuttamaton. Tehdään vain rekisteröidyn
nimenomaisesta pyynnöstä (GDPR right to erasure). Vain Super Admin ja UTJ voivat poistaa.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD | Luo, muokkaa, deaktivoi, poistaa — kaikki seurat |
| Urheilutoimenjohtaja | RWD | Oma seura |
| VP | RW | Luo ja muokkaa — voi deaktivoida, ei poisto-oikeutta |
| Seurasihteeri | R | Näkee käyttäjälistan, ei luo tunnuksia |
| Kaikki muut | – | |

### Sopimukset ja Palloliiton kriteerit

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | Omistaa seuran kriteeriseurannan |
| Seurasihteeri | RW | Hallinnoi sopimusdokumentaatiota |
| Urheilutoimenjohtaja | RW | |
| Valmentaja | R | Näkee kriteerit ja omat sopimuksensa |
| Muut operatiiviset | R | |
| Pelaaja / Vanhempi | – | |

---

## Pelaajan etusivun oikeudet

Pelaajan etusivu on rakennettu niin, että jokainen elementti vaatii
eri oikeustason. Tämä on tärkeä ymmärtää arkkitehtuurin kannalta.

Päivän tehtävä: valmentaja kirjoittaa (RW), pelaaja lukee ja kuittaa (R + kuittaus).
Kehityssignaali: järjestelmä generoi testituloksista automaattisesti, pelaaja lukee (R*).
Valmentajan viesti: valmentaja kirjoittaa (RW), pelaaja lukee (R), vanhempi lukee (R).
Streak ja eteneminen: järjestelmä laskee automaattisesti pelaajan toiminnasta.
Tavoitejakso: talenttivalmentaja tai VP asettaa (RW), pelaaja lukee ja edistyy (R + toiminta).

Pelaajan kirjoitusoikeudet ovat rajoitetut mutta tärkeät:
  Tehtävän kuittaus tehdyksi, päivän viesti valmentajalle, oma treenikirjaus.
  Pelaaja ei muokkaa omia testituloksiaan, kehityssignaalejaan eikä tasonsa laskentaa.

Vanhemman näkymä on yksinkertaistettu versio pelaajan näkymästä (R*):
  Näkee kehityssuunnan, tavoitejakson edistymisen ja valmentajan viestit.
  Ei näe raakadataa (testituloksia numeroina) vaan selkokielisen version.

## Suostumushierarkia (GDPR)

Pakollinen suostumus (kaikki tarvitsevat):
  tietojen tallentaminen rekisteriin + tietosuojaselosteen lukeminen.
  Ilman näitä pelaajaa ei voi lisätä järjestelmään.

Vapaaehtoinen suostumus (erikseen pyydettävä):
  fyysinen testaaminen + biologisen iän arviointi + kehitystietojen jakaminen
  seuran valmentajille + anonymisoitu data palvelun kehittämiseen.
  Kieltäytyminen ei estä peruskäyttöä.

Huoltajan oikeudet alaikäisen osalta:
  Kaikki data vaatii huoltajan suostumuksen. Huoltajalla on oikeus milloin
  tahansa nähdä, oikaista ja pyytää poistamaan lapsen tiedot. Suostumuksen
  voi peruuttaa — tämä ei vaikuta aiemmin tehtyyn käsittelyyn mutta estää
  uuden datan keräämisen. Kaikki suostumukset tallennetaan Firestoreen
  aikaleimalla ja antajan nimellä.

---

## Seurojen välinen eristys

Firestore Security Rules rakentaa rakenteellisen esteen seurojen välille.
Jokainen seura on oma "saarekkeensa" seurat/{seuraId}-polun alla. VP tai
valmentaja ei voi edes vahingossa lukea toisen seuran dataa, koska Security
Rules tarkistaa request.auth.token.seuraId-kentän jokaisessa pyynnössä.
Super Admin on ainoa poikkeus — hänellä ei ole seuraId-rajausta.
