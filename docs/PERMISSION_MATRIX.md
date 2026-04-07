# TalentMaster™ — Permission Matrix
# Päivitetty: 2026-04-07

## Merkinnät

RW = Luku + kirjoitus
R  = Vain luku
R* = Rajoitettu luku (yksinkertaistettu tai anonymisoitu näkymä)
–  = Ei pääsyä

---

## Roolit, kerrokset ja pakettitasot

Roolimalli on kolmikerroksinen. Sama henkilö voi kantaa useita rooleja
pienemmissä seuroissa.

### Hallintakerros
Super Admin (TalentMaster-taso), Seuran Admin (sihteeri/TJ), VP (Adminin varamies)

### Johtamiskerros
VP (operatiivinen + strateginen), UTJ (vain strateginen — ei operatiivisia kirjoitusoikeuksia)
Jos seurassa ei ole UTJ:tä, VP kattaa strategisen tason yksin.

### Kenttäkerros
Valmentaja, Testivastaava, Talenttivalmentaja, Fysiikkavalmentaja, Fysioterapeutti

### Pelaaja- ja huoltajakerros
Pelaaja, Vanhempi/Huoltaja

### Raportointikerros (tuleva)
Hallitus/Puheenjohtaja — aggregoitu kuukausiraportti, ei yksittäisiä pelaajatietoja

---

## Pakettitasot ja roolien saatavuus

| Rooli | Perustaso | Kehitystaso | Huipputaso |
|---|---|---|---|
| Super Admin | ✅ | ✅ | ✅ |
| Seuran Admin | ✅ | ✅ | ✅ |
| Valmennuspäällikkö (VP) | ✅ | ✅ | ✅ |
| UTJ | – | ✅ | ✅ |
| Valmentaja | ✅ | ✅ | ✅ |
| Testivastaava | ✅ | ✅ | ✅ |
| Talenttivalmentaja | – | ✅ | ✅ |
| Fysiikkavalmentaja | – | ✅ | ✅ |
| Fysioterapeutti | – | – | ✅ |
| Pelaaja | ✅ | ✅ | ✅ |
| Vanhempi/Huoltaja | ✅ | ✅ | ✅ |

---

## Käyttäjähallinta (kutsut, roolit, paketit)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD kaikki seurat | Luo uudet seurat |
| Seuran Admin | RWD oma seura | Kutsuu valmentajia ja muita |
| VP | RW oma seura | Varamies — täydet admin-oikeudet varalta |
| UTJ | – | Ei käyttäjähallintaoikeuksia |
| Kaikki muut | – | |

Käyttäjä ei voi muuttaa omaa rooliaan, joukkueitaan tai pakettitasoaan —
Security Rules estää tämän vaikka käyttäjä muokkaisi omaa dokumenttiaan.

---

## Pelaajadata (nimi, syntymäaika, seura, joukkue)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | Oma seura |
| VP | RW | Oma seura |
| UTJ | R | Oma seura — vain aggregoitu kuva |
| Valmentaja | R | Vain oma joukkue (UI-rajoitus) |
| Talenttivalmentaja | R | Kaikki seuran pelaajat |
| Fysiikkavalmentaja | R | |
| Fysioterapeutti | R | |
| Testivastaava | R | |
| Pelaaja | R | Vain oma profiili |
| Vanhempi | R | Vain lapsen profiili |

---

## Testitapahtumat (kalenteri, luonti, tilan hallinta)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | Oma seura |
| VP | RW | Kaikki joukkueet seurassa |
| UTJ | R | Näkee tapahtumakalenterin |
| Valmentaja | RW | Voi luoda oman joukkueensa tapahtumia |
| Testivastaava | RW | Voi luoda ja täyttää tapahtumia |
| Fysiikkavalmentaja | RW | |
| Talenttivalmentaja | R | |
| Fysioterapeutti | R | |
| Pelaaja | – | |
| Vanhempi | – | |

Uusi tapahtuma saa alkaa vain tilasta "suunniteltu" — Security Rules pakottaa tämän.
Tapahtuman vastuuhenkilö voi päivittää tapahtumaa vaikka ei olisi hallintakerros.

---

## Testitulokset (Mirwald, Khamis-Roche, H-H testit, harjoitettavuus)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | |
| VP | RW | |
| UTJ | R | Vain aggregoitu — ei yksittäisiä tuloksia |
| Valmentaja | RW | Voi kirjata tuloksia |
| Testivastaava | RW | Pääasiallinen tulosten kirjaaja |
| Fysiikkavalmentaja | RW | |
| Talenttivalmentaja | R | |
| Fysioterapeutti | R | |
| Pelaaja | R | Omat tulokset — EI kirjoitusoikeutta testituloksiin (vain kirjaukset/{pvm}) |
| Vanhempi | R* | Yksinkertaistettu |

---

## Biologinen ikä ja PHV-data (arkaluonteinen)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | |
| VP | RW | |
| UTJ | R | Vain seuratason aggregoitu — ei yksittäisiä |
| Valmentaja | R | Oma joukkue |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | RW | |
| Fysioterapeutti | R | |
| Testivastaava | R | |
| Pelaaja | R* | Selkokielinen: "kasvupyrähdyksen loppuvaihe" |
| Vanhempi | R* | Selkokielinen + kuormitusrajoitukset |

---

## RAE-analyysi (syntymäkuukausijakauma)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | R | |
| Seuran Admin | R | |
| VP | R | Koko seura + talenttiryhmävertailu |
| UTJ | R | Seuratason aggregoitu kuva |
| Valmentaja | R | Oma joukkue |
| Kaikki muut | – | |

---

## ADAR-pisteet ja Game IQ

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | |
| Valmentaja | RW | Kirjaa ADAR-pisteitä kentällä |
| Talenttivalmentaja | RW | Pääasiallinen arvioija |
| Fysiikkavalmentaja | R* | |
| Fysioterapeutti | R* | |
| Testivastaava | – | |
| Pelaaja | R* | Selkokielinen palaute |
| Vanhempi | – | |
| UTJ | – | |

---

## Harjoitteluseuranta (SPL 7 kriteeriä)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Valmentaja | R | Oma joukkue |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | R* | Vain fyysinen osuus |
| UTJ | R | Aggregoitu |
| Kaikki muut | – | |

---

## Vamma- ja kuntoutusdata (terveystieto — erityinen suoja)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | |
| UTJ | R | |
| Valmentaja | R* | Vain "ei kontaktia tällä viikolla" -taso |
| Talenttivalmentaja | R* | |
| Fysiikkavalmentaja | R | |
| Fysioterapeutti | RW | Ainoa joka kirjoittaa vammadataan |
| Testivastaava | – | |
| Pelaaja | R | Oma kuntoutussuunnitelma |
| Vanhempi | R | Lapsen kuntoutustiedot |

---

## Talenttiohjelma ja nimeämiset (IDP-aktivointi, KORI)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | |
| Valmentaja | R* | Näkee onko pelaaja ohjelmassa |
| Talenttivalmentaja | RW | |
| UTJ | R | Kokonaiskuva ohjelman laajuudesta |
| Fysiikkavalmentaja | – | |
| Fysioterapeutti | – | |
| Testivastaava | – | |
| Pelaaja | – | |
| Vanhempi | – | |

---

## Omatoimiharjoitekirjaukset (kirjaukset/{pvm}) — UUSI 2026-04-07

Pelaaja tallentaa omaa päivittäistä harjoitteluaan Firestoreen.
Tämä on ainoa kokoelma johon pelaajalla on kirjoitusoikeus.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | Aggregoitu näkymä — ei yksittäisiä kirjauksia |
| UTJ | R | Vain aggregoitu harjoitteluseuranta |
| Valmentaja | R | Oma joukkue — streak + fiilinki-trendit |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | R | |
| Fysioterapeutti | R | Kuormaseuranta + fiilinki PHV-pelaajilla |
| Testivastaava | – | |
| Pelaaja | **RW** | **Kirjoittaa VAIN omaan kirjaukset/{pvm}:ään** |
| Vanhempi | R | Lapsen streak + fiilinki |

**Kirjauksen kentät:**
- `tyyppi`: 'T'|'D'|'S'|'P'
- `tehty`: bool, `kesto_min`, `xp`
- `fiilinki`: 1–5 (mieliala)
- `uni`: 1–3 (mini-Hooper, U13+)
- `lihaskunto`: 1–3 (mini-Hooper, U13+)
- `fiilinki_paivitetty`: ISO-timestamp — **lukitusavain** (1 kirjaus/pv, ei voi muuttaa)

**Security Rules -logiikka:**
```javascript
// Pelaaja kirjoittaa vain omaan dokumenttiinsa
allow write: if request.auth.token.rooli == 'pelaaja'
  && resource.data.pelaajaId == request.auth.uid
  && !('fiilinki_paivitettu' in resource.data)  // ei voi ylikirjoittaa
```

---

## Keräilykortit (TalentMaster_Kortit.html) — UUSI 2026-04-07

Keräilykortit ovat pelaajan motivaatiotyökalu. Ne eivät tallennu Firestoreen
toistaiseksi — data on staattista. Tulevaisuudessa Milestone-kortit
kytkeytyvät automaattisesti pelaajan kirjaus- ja streakdataan.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Pelaaja | R | Näkee kaikki kortit, avaa lukitut saavuttamalla kynnysarvot |
| Vanhempi | R | Näkee lapsen korttikokoelman |
| Valmentaja | – | Ei tarvetta korttikokoelmaan |
| VP / UTJ | – | |

**Milestone-korttien kynnysarvot (tuleva Firebase-kytkös):**
- 30-päivän streak → "30 PÄIVÄN PUTKI" -kortti
- FLEI ≥ 80p → "FLEI 80+" -kortti
- PHV läpikäynyt (`phv_tila` muuttunut AN→KV) → "PHV-selviytymiskortti"
- KORI-status → "Seuran kasvatti" -kortti

---

## Strateginen raportointi (UTJ ja hallitus)

| Rooli | Oikeus | Sisältö |
|---|---|---|
| Super Admin | R kaikki seurat | Täysi näkymä |
| VP | R oma seura | Operatiivinen + strateginen |
| UTJ | R oma seura | Vain aggregoitu — ei yksittäisiä pelaajatietoja |
| Hallitus/Puheenjohtaja | R* | Kuukausiraportti (tuleva ominaisuus) |
| Kaikki muut | – | |

Strateginen data luetaan seuradokumentin tilastot-kentästä joka päivitetään
automaattisesti tapahtumien valmistuessa. Tämä estää kalliit reaaliaikaiset
kyselyt jokaisen raporttinäkymän latauksen yhteydessä.

---

## Tietosuojahuomiot (GDPR)

GDPR-kriittiset datatyypit ovat pelaajien henkilötiedot (nimi, syntymäaika —
vaativat suostumuksen), biologinen ikä (fysiologinen tieto, erityinen suoja
alaikäisillä), vammadata (terveystieto, vaatii erillisen suostumuksen),
ADAR-pisteet (psykologinen arviointi, ammattilaisten välinen tieto) ja
**fiilinki/uni/lihaskunto-data** (hyvinvointitieto, pelaajan itsensä tuottama —
lukitusmekanismi estää jälkikäteisen muuttamisen, ISO-timestamp kirjataan).

Huoltajan oikeudet: alaikäisen pelaajan data vaatii huoltajan suostumuksen.
Huoltajalla on oikeus nähdä lapsensa data, pyytää datan poistoa, ja
suostumus dokumentoidaan Firestoreen.

Seurojen välinen eristys: Firestore Security Rules estää seurojen
ristiinluvun rakenteellisesti. Jokainen seura on oma saarekkeensa
seurat/{seuraId}-polun alla. Super Admin on ainoa käyttäjä joka
näkee kaikkien seurojen datan.
