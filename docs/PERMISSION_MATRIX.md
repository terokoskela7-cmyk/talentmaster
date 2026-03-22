# TalentMaster™ — Permission Matrix

## Merkinnät
- **RW** = Luku + kirjoitus
- **R** = Vain luku
- **R*** = Rajoitettu luku (yksinkertaistettu näkymä)
- **–** = Ei pääsyä

## Roolit ja pakettitasot

| Rooli | Perustaso | Kehitystaso | Huipputaso |
|---|---|---|---|
| Valmennuspäällikkö (VP) | ✅ | ✅ | ✅ |
| Valmentaja | ✅ | ✅ | ✅ |
| Testivastaava | ✅ | ✅ | ✅ |
| Talenttivalmentaja | – | ✅ | ✅ |
| Fysiikkavalmentaja | – | ✅ | ✅ |
| Fysioterapeutti | – | – | ✅ |
| Urheilutoimenjohtaja | – | ✅ | ✅ |
| Pelaaja | ✅ | ✅ | ✅ |
| Vanhempi | ✅ | ✅ | ✅ |

---

## Datatyypit ja oikeudet

### Pelaajadata (nimi, syntymäaika, seura, joukkue)
| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
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
| VP | RW |
| Valmentaja | R* (onko pelaaja ohjelmassa) |
| Talenttivalmentaja | RW |
| Fysiikkavalmentaja | – |
| Fysioterapeutti | – |
| Testivastaava | – |
| Pelaaja | – |
| Vanhempi | – |

### Käyttäjähallinta (kutsut, roolit, paketit)
| Rooli | Oikeus |
|---|---|
| Super Admin | RWD |
| Urheilutoimenjohtaja | RWD (oma seura) |
| VP | RW (oma seura) |
| Kaikki muut | – |

---

## Tietosuojahuomiot

### GDPR-kriittiset datatyypit
1. **Pelaajien henkilötiedot** — nimi, syntymäaika vaativat suostumuksen
2. **Biologinen ikä** — fysiologinen tieto, erityinen suoja alaikäisillä
3. **Vammadata** — terveystieto, vaatii erillisen suostumuksen
4. **ADAR-pisteet** — psykologinen arviointi, ammattilaisten välinen tieto

### Huoltajan oikeudet
- Alaikäisen pelaajan data vaatii huoltajan suostumuksen
- Huoltajalla on oikeus nähdä lapsensa data
- Huoltajalla on oikeus pyytää datan poistoa
- Suostumus dokumentoitava Firestoreen

### Seurojen välinen eristys
- Firestore Security Rules estää seurojen ristiinluvun rakenteellisesti
- Jokainen seura on oma "saarekkeensa" `seurat/{seuraId}` -polun alla
- Super-admin on ainoa käyttäjä joka näkee kaikkien seurojen datan
