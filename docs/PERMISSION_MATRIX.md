# TalentMaster™ — Permission Matrix
## Päivitetty: 2026-03-23

---

## ⚡ Arkkitehtuuriperiaate: Roolit ovat oikeuksia, ei pakollisia henkilöitä

Yksi käyttäjä voi kantaa useita rooleja. Firestoreen tallennetaan taulukko:
```javascript
kayttajat/{uid}/
  roolit: ["vp", "sihteeri"]   // useita mahdollisia
  seura:  "fcl"
```

Pienessä seurassa VP saa automaattisesti myös sihteerin oikeudet.
Isossa seurassa VP kutsuu erillisen sihteerin — sama UID tai eri henkilö.

---

## Roolit ja niiden oikeudet

| Rooli | Koodi | Kuka tyypillisesti | Paketti |
|---|---|---|---|
| Super Admin | `super_admin` | TalentMaster (Tero) | – |
| Valmennuspäällikkö | `vp` | VP, akatemiajohtaja | Kaikki |
| Seurasihteeri | `sihteeri` | Sihteeri tai VP itse | Kaikki |
| Urheilutoimenjohtaja | `utj` | Toiminnanjohtaja | Kehitys+ |
| Talenttivalmentaja | `talenttikoach` | Talenttivalmentaja | Kehitys+ |
| Fysiikkavalmentaja | `fysiikka` | Fysiikkavalmentaja | Kehitys+ |
| Fysioterapeutti | `fysio` | Fysioterapeutti | Huippu |
| Testivastaava | `testi` | Testivastaava | Kaikki |
| Valmentaja | `valmentaja` | Joukkuevalmentaja | Kaikki |
| Pelaaja | `pelaaja` | Pelaaja itse | Kaikki |
| Vanhempi | `vanhempi` | Huoltaja | Kaikki |

---

## Merkinnät
- **RW** = Luku + kirjoitus
- **R** = Vain luku
- **R*** = Rajoitettu luku (yksinkertaistettu näkymä)
- **–** = Ei pääsyä

---

## Käyttäjähallinta (kutsut, roolit, paketit)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD kaikki seurat | Luo seurat, VP:t, sihteerit |
| Seurasihteeri | RWD oma seura | Kutsuu valmentajat, tuo datan |
| VP | RW oma seura | Vain jos ei erillistä sihteeriä |
| UTJ | RW oma seura | – |
| Kaikki muut | – | – |

> **Käytännössä:** Super Admin luo seuran + VP:n + Sihteerin tunnukset.
> Jos pienessä seurassa VP == Sihteeri, sama henkilö saa molemmat roolit.

---

## Joukkuehallinta

| Rooli | Oikeus |
|---|---|
| Super Admin | RW kaikki |
| Seurasihteeri | RW oma seura |
| VP | R + luo tarvittaessa |
| Valmentaja | R (vain omat joukkueet) |
| Muut | – |

---

## Data-import (Excel/CSV → Firestore)

| Rooli | Oikeus |
|---|---|
| Super Admin | RW kaikki |
| Seurasihteeri | RW oma seura |
| VP | R (ei import-oikeutta) |
| Muut | – |

---

## Pelaajadata (nimi, syntymäaika, seura, joukkue)

| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| VP | RW |
| Seurasihteeri | RW (rekisteröinti) |
| Valmentaja | R (vain oma joukkue) |
| Talenttivalmentaja | R (kaikki seuran pelaajat) |
| Fysiikkavalmentaja | R |
| Fysioterapeutti | R |
| Testivastaava | R |
| Pelaaja | R (vain oma profiili) |
| Vanhempi | R (vain lapsen profiili) |

---

## Testitulokset (nopeus, ketteryys, kevennyshyppy)

| Rooli | Oikeus |
|---|---|
| Super Admin | RW |
| VP | RW |
| Fysiikkavalmentaja | RW |
| Testivastaava | RW |
| Valmentaja | R (oma joukkue) |
| Talenttivalmentaja | R |
| Pelaaja | R (omat tulokset) |
| Vanhempi | R* (yksinkertaistettu) |

---

## Biologinen ikä ja PHV-data ⚠️ Arkaluonteinen

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

---

## ADAR-pisteet ja Game IQ

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

---

## Harjoitteluseuranta (SPL 7 kriteeriä)

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

---

## Vamma- ja kuntoutusdata ⚠️ Terveystieto

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

---

## Talenttiohjelma ja nimeämiset

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

---

## Tietosuojahuomiot

### GDPR-kriittiset datatyypit
1. **Pelaajien henkilötiedot** — nimi, syntymäaika vaativat suostumuksen
2. **Biologinen ikä** — fysiologinen tieto, erityinen suoja alaikäisillä
3. **Vammadata** — terveystieto, vaatii erillisen suostumuksen
4. **ADAR-pisteet** — psykologinen arviointi, ammattilaisten välinen tieto

### GDPR-suostumusten hallinta
- Seurasihteeri tallentaa suostumukset Firestoreen
- Huoltajan suostumus alaikäiselle pakollinen ennen datan tallennusta
- Suostumuksen voi peruuttaa → data poistettava

### Huoltajan oikeudet
- Alaikäisen pelaajan data vaatii huoltajan suostumuksen
- Huoltajalla on oikeus nähdä lapsensa data
- Huoltajalla on oikeus pyytää datan poistoa

### Seurojen välinen eristys
- Firestore Security Rules estää seurojen ristiinluvun rakenteellisesti
- Jokainen seura on oma "saarekkeensa" `seurat/{seuraId}` -polun alla
- Super-admin on ainoa käyttäjä joka näkee kaikkien seurojen datan
