# TalentMaster™ — Permission Matrix
# Päivitetty 2026-03-22 — lisätty Seuran Admin -rooli

## Merkinnät
- **RW** = Luku + kirjoitus
- **RWD** = Luku + kirjoitus + poisto
- **R** = Vain luku
- **R*** = Rajoitettu luku (yksinkertaistettu näkymä)
- **–** = Ei pääsyä

---

## Roolien jako kolmeen vastuualueeseen

Roolit on jaettu kolmeen selkeään vastuualueeseen jotka eivät sekoitu keskenään.

**Tekninen ylläpito** kuuluu Super Adminille (TalentMaster). Hän hallitsee
kaikkia seuroja, pakettitasoja ja järjestelmätason asetuksia. Ei ole
kenenkään seuran jäsen.

**Hallinnollinen ylläpito** kuuluu Seuran Adminille (seurasihteeri tai
vastaava). Hän hoitaa oman seuransa organisaatiorakenteen: joukkueet,
käyttäjäkutsut ja roolit. Ei katso valmennuksellista dataa.

**Operatiivinen käyttö** kuuluu kaikille muille rooleille — VP, valmentajat,
testivastaavat, pelaajat, vanhemmat. He käyttävät järjestelmää päivittäin
mutta eivät hallinnoi rakennetta.

---

## Roolit ja pakettitasot

| Rooli | Perustaso | Kehitystaso | Huipputaso |
|---|---|---|---|
| Super Admin (TalentMaster) | ✅ | ✅ | ✅ |
| **Seuran Admin** (uusi) | ✅ | ✅ | ✅ |
| Valmennuspäällikkö (VP) | ✅ | ✅ | ✅ |
| Urheilutoimenjohtaja | – | ✅ | ✅ |
| Valmentaja | ✅ | ✅ | ✅ |
| Testivastaava | ✅ | ✅ | ✅ |
| Talenttivalmentaja | – | ✅ | ✅ |
| Fysiikkavalmentaja | – | ✅ | ✅ |
| Fysioterapeutti | – | – | ✅ |
| Pelaaja | ✅ | ✅ | ✅ |
| Vanhempi | ✅ | ✅ | ✅ |

---

## Seuran Admin — täydellinen kuvaus

### Mitä Seuran Admin tekee
Seuran Admin on seurasihteerin tai toiminnanjohtajan rooli. Hänen
vastuullaan on organisaatiorakenteen ylläpito — ei valmennuksellinen
työ. Käytännön tehtävät ovat seuraavat.

Hän luo joukkueet seuran alle ennen kuin pelaajia voidaan tuoda
järjestelmään. Hän kutsuu käyttäjät oikeisiin rooleihinsa sähköpostilla.
Hän hallitsee pelaajien tuontia Excel-pohjasta ja varmistaa että pelaajat
kiinnittyvät oikeisiin joukkueisiin. Hän ylläpitää seuran perustietoja
(yhteystiedot, logo, kaupunki). Hän voi deaktivoida käyttäjiä jotka ovat
poistuneet seurasta.

### Mitä Seuran Admin ei tee
Hän ei näe muiden seurojen dataa. Hän ei muuta pakettitasoja tai
laskutustietoja (Super Adminin tehtävä). Hän ei katso valmennuksellista
dataa kuten ADAR-pisteitä, harjoitteluseurantaa tai talenttiohjelmatietoja.
Hän ei tee valmennuksellisia päätöksiä.

### Onboarding-järjestys seuran lisätessä TalentMasteria
Oikea järjestys on hierarkkinen — jokainen vaihe luo pohjan seuraavalle.

Vaihe 1: Super Admin luo seuran Firestoreen ja asettaa pakettitason.
Vaihe 2: Super Admin luo Seuran Admin -tunnuksen ja lähettää kutsun.
Vaihe 3: Seuran Admin kirjautuu ja luo joukkueet (U12, U15, U19 jne.).
Vaihe 4: Seuran Admin kutsuu VP:n ja valmentajat oikeisiin rooleihinsa.
Vaihe 5: Seuran Admin tuo pelaajat Excel-pohjalla joukkueisiin.
Vaihe 6: VP ja valmentajat alkavat käyttää järjestelmää operatiivisesti.

---

## Organisaatiorakenne ja hierarkia

### Joukkue on pelaajan "koti" järjestelmässä
Joukkue ei ole pelkkä tekstikenttä — se on oma dokumenttinsa Firestoressä.
Pelaaja viittaa joukkueeseen joukkueId:llä eikä nimellä. Tämä mahdollistaa
sen että Firestore Security Rules voi tarkistaa "kuuluuko tämä pelaaja
tähän valmentajaan" luotettavasti. Joukkueet pitää siis luoda ENNEN
pelaajien tuontia.

### Firestore-rakenne joukkueelle
```
seurat/{seuraId}/joukkueet/{joukkueId}/
  nimi:           "KPV U15"
  ikäluokka:      "U15"
  sukupuoli:      "P"       // "P" | "T" | "seka"
  kausi:          "2026"
  valmentajat:    ["uid1", "uid2"]   // Firebase UID:t
  pelaajaMaara:   0         // päivittyy automaattisesti
  aktiivinen:     true
  luotu:          timestamp
  luonutUid:      "admin_uid"
```

### Pelaajan viittaus joukkueeseen
```
seurat/{seuraId}/pelaajat/{palloId}/
  joukkueId:  "kpv_u15"     // viittaus joukkue-dokumenttiin
  joukkue:    "KPV U15"     // luettava nimi (säilyy näyttöä varten)
```

---

## Käyttäjähallinta — kuka voi kutsua ketä

| Rooli | Oikeus |
|---|---|
| Super Admin | Luo Seuran Admin -tunnuksia. Näkee kaikki seurat. |
| **Seuran Admin** | Kutsuu VP:n, valmentajat, testivastaavat, pelaajat. Luo joukkueet. |
| VP | Voi kutsua valmentajia ja testivastaavia omaan seuraan (jos paketin puitteissa). |
| Kaikki muut | Ei käyttäjähallintaoikeuksia. |

---

## Datatyypit ja oikeudet

### Organisaatiorakenne (joukkueet, roolit, käyttäjät)
| Rooli | Oikeus |
|---|---|
| Super Admin | RWD (kaikki seurat) |
| **Seuran Admin** | RWD (oma seura) |
| VP | R (oma seura) |
| Kaikki muut | – |

### Pelaajadata (nimi, syntymäaika, seura, joukkue)
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | RW (tuo ja ylläpitää pelaajia) |
| VP | RW |
| Valmentaja | R (vain oma joukkue) |
| Talenttivalmentaja | R (kaikki seuran pelaajat) |
| Fysiikkavalmentaja | R |
| Fysioterapeutti | R |
| Testivastaava | R |
| Pelaaja | R (vain oma profiili) |
| Vanhempi | R (vain lapsen profiili) |

### Testitulokset (nopeus, ketteryys, kevennyshyppy)
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | – (ei valmennuksellinen rooli) |
| VP | RW |
| Valmentaja | R (oma joukkue) |
| Talenttivalmentaja | R |
| Fysiikkavalmentaja | RW |
| Testivastaava | RW |
| Pelaaja | R (omat tulokset) |
| Vanhempi | R* (yksinkertaistettu) |

### Biologinen ikä ja PHV-data ⚠️ Arkaluonteinen
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | R (näkee PHV-tilan pelaajaa tuodessa) |
| VP | RW |
| Valmentaja | R (oma joukkue) |
| Talenttivalmentaja | R |
| Fysiikkavalmentaja | RW |
| Fysioterapeutti | R |
| Testivastaava | R |
| Pelaaja | R* (selkokielinen: "kasvupyrähdyksen loppuvaihe") |
| Vanhempi | R* (selkokielinen, kuormitusrajoitukset) |

### ADAR-pisteet ja Game IQ
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | – (ei valmennuksellinen rooli) |
| VP | R |
| Valmentaja | R (oma joukkue) |
| Talenttivalmentaja | RW |
| Fysiikkavalmentaja | R* |
| Fysioterapeutti | R* |
| Testivastaava | – |
| Pelaaja | R* (selkokielinen palaute) |
| Vanhempi | – |

### Harjoitteluseuranta (SPL 7 kriteeriä)
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | – |
| VP | RW |
| Valmentaja | R (oma joukkue) |
| Talenttivalmentaja | R |
| Fysiikkavalmentaja | R* (fyysinen osuus) |
| Fysioterapeutti | – |
| Testivastaava | – |
| Pelaaja | – |
| Vanhempi | – |

### Vamma- ja kuntoutusdata ⚠️ Terveystieto
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | – |
| VP | R |
| Valmentaja | R* (vain "ei kontaktia tällä viikolla" -taso) |
| Talenttivalmentaja | R* |
| Fysiikkavalmentaja | R |
| Fysioterapeutti | RW |
| Testivastaava | – |
| Pelaaja | R (oma kuntoutussuunnitelma) |
| Vanhempi | R (lapsen kuntoutustiedot) |

### Talenttiohjelma ja nimeämiset
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| **Seuran Admin** | – |
| VP | RW |
| Valmentaja | R* (onko pelaaja ohjelmassa) |
| Talenttivalmentaja | RW |
| Fysiikkavalmentaja | – |
| Fysioterapeutti | – |
| Testivastaava | – |
| Pelaaja | – |
| Vanhempi | – |

---

## Tietosuojahuomiot

### GDPR-kriittiset datatyypit
1. **Pelaajien henkilötiedot** — nimi, syntymäaika vaativat suostumuksen
2. **Biologinen ikä** — fysiologinen tieto, erityinen suoja alaikäisillä
3. **Vammadata** — terveystieto, vaatii erillisen suostumuksen
4. **ADAR-pisteet** — psykologinen arviointi, ammattilaisten välinen tieto

### Huoltajan oikeudet
Alaikäisen pelaajan data vaatii huoltajan suostumuksen. Huoltajalla on
oikeus nähdä lapsensa data, pyytää datan poistoa, ja suostumus on
dokumentoitava Firestoreen päivämäärällä, huoltajan nimellä ja versiolla.

### Seurojen välinen eristys
Firestore Security Rules estää seurojen ristiinluvun rakenteellisesti.
Jokainen seura on oma saarekkeensa `seurat/{seuraId}` -polun alla.
Seuran Admin näkee vain oman seuransa — Super Admin näkee kaikki.
