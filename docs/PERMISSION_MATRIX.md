# TalentMaster™ — Permission Matrix
# Päivitetty: 2026-04-09

## Merkinnät

RW = Luku + kirjoitus
R  = Vain luku
R* = Rajoitettu luku (yksinkertaistettu tai anonymisoitu näkymä)
–  = Ei pääsyä

---

## Roolit, kerrokset ja pakettitasot

### Hallintakerros
Super Admin (TalentMaster-taso), Seuran Admin (sihteeri/TJ), VP (Adminin varamies)

### Johtamiskerros
VP (operatiivinen + strateginen), UTJ (vain strateginen — ei operatiivisia kirjoitusoikeuksia)

### Kenttäkerros
Valmentaja, Testivastaava, Talenttivalmentaja, Fysiikkavalmentaja, Fysioterapeutti

### Pelaaja- ja huoltajakerros
Pelaaja, Vanhempi/Huoltaja (VAN)

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
| Vanhempi/Huoltaja (VAN) | ✅ | ✅ | ✅ |

---

## Käyttäjähallinta (kutsut, roolit, paketit)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RWD kaikki seurat | Luo uudet seurat |
| Seuran Admin | RWD oma seura | Kutsuu valmentajia ja muita |
| VP | RW oma seura | Varamies — täydet admin-oikeudet |
| UTJ | – | Ei käyttäjähallintaoikeuksia |
| Kaikki muut | – | |

Käyttäjä ei voi muuttaa omaa rooliaan tai pakettitasoaan —
Security Rules estää tämän rakenteellisesti.

---

## Pelaajadata (nimi, syntymäaika, seura, joukkue)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | Oma seura |
| VP | RW | Oma seura |
| UTJ | R | Vain aggregoitu kuva |
| Valmentaja | R | Vain oma joukkue (UI-rajoitus) |
| Talenttivalmentaja | R | Kaikki seuran pelaajat |
| Fysiikkavalmentaja | R | |
| Fysioterapeutti | R | |
| Testivastaava | R | |
| Pelaaja | R | Vain oma profiili |
| Vanhempi (VAN) | R | Vain lapsen profiili |

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

Uusi tapahtuma saa alkaa vain tilasta "suunniteltu".
**Kokoelmanimi Firestoressa: `testitapahtumat` (EI `tapahtumat`)**

---

## Testitulokset (H-H testit, harjoitettavuus, tekniikkakilpailut)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | |
| VP | RW | Voi tuoda historiadata Excel-pohjalla |
| UTJ | R | Vain aggregoitu — ei yksittäisiä tuloksia |
| Valmentaja | RW | Voi kirjata tuloksia |
| Testivastaava | RW | Pääasiallinen tulosten kirjaaja |
| Fysiikkavalmentaja | RW | |
| Talenttivalmentaja | R | |
| Fysioterapeutti | R | |
| Pelaaja | R | Omat tulokset — EI kirjoitusoikeutta |
| Vanhempi | R* | Yksinkertaistettu |

**Testidatan tuontiprosessi:**
Excel-pohja (`TalentMaster_Testidatan_Tuontipohja.xlsx`) →
SheetJS luku selaimessa → Cloud Function kirjoitus Firestoreen.
VP:llä oikeus tuoda historiadata ennen suostumuslomakkeita.

**Excel-pohja sisältää:**
- Lehti 1: Pelaajien perustiedot + PHV-data
- Lehti 2: H-H ominaisuustestit (nopeus/ketteryys/voima/tekniikka/kestävyys)
- Lehti 3: Harjoitettavuuskartoitus (U12: 9 testiä / U15: 13 testiä, FLEI% automaattinen)
- Lehti 4: Tekniikkakilpailut (syöttö + pujottelu + ponnauttelu)

---

## Biologinen ikä ja PHV-data (arkaluonteinen)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| Seuran Admin | RW | |
| VP | RW | |
| UTJ | R | Vain aggregoitu — ei yksittäisiä |
| Valmentaja | R | Oma joukkue |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | RW | |
| Fysioterapeutti | R | |
| Testivastaava | R | |
| Pelaaja | R* | Selkokielinen: "kasvupyrähdyksen loppuvaihe" |
| Vanhempi | R* | Selkokielinen + kuormitusrajoitukset |

**Tyttöpelaajat (SJK U14/15T — uusi 2026-04-09):**
Mirwald-kaava eri parametrit tytöille. Tarkistettava Sprint 5:ssä
ennen tyttöjoukkueen täysaktivointia.

---

## RAE-analyysi (syntymäkuukausijakauma)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | R | |
| Seuran Admin | R | |
| VP | R | Koko seura + talenttiryhmävertailu |
| UTJ | R | Aggregoitu kuva |
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

**Tärkeä:** ADAR-pisteet tallennetaan `adar`-kokoelmaan,
EI `havainnot`-kokoelmaan.

---

## Harjoitteluseuranta — VP:n kenttäkäyntikirjaukset (SPL 7 kriteeriä)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | RW | Kirjaa kenttäkäynnit valmentajien harjoituksiin |
| Valmentaja | R | Näkee omat arviointinsa |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | R* | Vain fyysinen osuus |
| UTJ | R | Aggregoitu — harjoitteluseuranta-yhteenveto |
| Kaikki muut | – | |

**7 kriteeriä (asteikko 1-10, tavoite suluissa):**
1. Valmennuksen toiminta on innostavaa (8)
2. Pelaajat liikkeessä harjoitusajasta (8)
3. Toistot — pallokosketukset (7)
4. Toistot — teknis-taktinen (7)
5. Pelaajat yrittävät täysillä (8)
6. Toiminta pelin vaatimusten mukaan (7)
7. Seuran painopiste näkyy (7)

**Firestore:** `seurat/{id}/mentoroinnit/{id}`
**VP-näkymässä:** Power BI -inspiroitu yhteenveto suodattimella per valmentaja.
Heikoin kriteeri korostetaan automaattisesti.

---

## Pelihavainto-arviointi (TULEVA — Sprint 5)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | Molemmat arviot rinnakkain + FLEI/PHV-konteksti |
| Valmentaja | RW | TIPS-arvio 24h sisällä ottelusta |
| Talenttivalmentaja | RW | |
| Pelaaja | RW | Oma arvio 48h sisällä — näkee valmentajan VASTA oman jälkeen |
| Vanhempi | R* | Pelkistetty kehitysnäkymä |
| UTJ | R | Aggregoitu joukkuetaso |
| Muut | – | |

**TIPS-kriteerit (1-10):**
- T = Tekninen suoritus paineessa (D2)
- I = Pelikuva — Game IQ (D4)
- P = Persoona — intensiteetti (D3)
- S = Suorituksen nopeus (D1+D4)
- \+ IDP-tavoitteen toteutuminen (TM-uniikki 5. kriteeri)

**Ikävaiheen adaptaatio:**
- Leikkija U8-12: ei numeroita, kuvakysymykset
- Rakentaja U13-16: TIPS 1-10 + IDP + vapaa havainto
- Showcase U17-19: TIPS + positiokohtainen + vertailu

**Periaate (EPPP-malli):** Pelaaja ei näe valmentajan arviota ennen
omaa arviointia. Ero on arvokas data kehityskeskusteluun.

**Taso 3 (VP-kontekstidata — TM-uniikki):**
FLEI-profiili + PHV-tila + biologinen ikä + syntymäkvartaali (RAE)
näkyvät suoraan TIPS-arvion vierellä. Mikään muu järjestelmä ei tee tätä.

**Firestore:** `pelaajat/{id}/pelihavainnot/{otteluId}`

---

## Omatoimiharjoitekirjaukset (kirjaukset/{pvm})

Pelaaja tallentaa päivittäistä harjoitteluaan. Ainoa kokoelma
johon pelaajalla on kirjoitusoikeus.

| Rooli | Oikeus | Huomio |
|---|---|---|
| Super Admin | RW | |
| VP | R | Aggregoitu — ei yksittäisiä kirjauksia |
| UTJ | R | Vain aggregoitu |
| Valmentaja | R | Streak + fiilinki-trendit, oma joukkue |
| Talenttivalmentaja | R | |
| Fysiikkavalmentaja | R | |
| Fysioterapeutti | R | Kuormaseuranta PHV-pelaajilla |
| Testivastaava | – | |
| Pelaaja | **RW** | Kirjoittaa VAIN omaan kirjaukset/{pvm}:ään |
| Vanhempi | R | Lapsen streak + fiilinki |

**Kentät:**
- `tyyppi`: 'T'|'D'|'S'|'P'
- `tehty`: bool, `kesto_min`, `rpe`: 1-10
- `fiilinki`: 1-5, `aika`: 'ilta'|'aamu'|'paiva'
- `uni`: 1-3, `lihaskunto`: 1-3 (mini-Hooper, U13+)
- `fiilinki_paivitetty`: ISO-timestamp — **lukitusavain** (1 kirjaus/pv, ei voi muuttaa)

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

**IDP-aktivoinnin 3 reittiä:**
1. Manuaalinen pyyntö (valmentaja/TV/VP)
2. Automaattisignaali (X-Factor / Hidden Gem)
3. Talenttiohjelma (KORI-kriteerit, 20+20/seura)

**IDP-tasot:**
- Perus: kaikki pelaajat
- Laajennettu: signaali/pyyntö
- Talenttikortti: KORI

---

## Keräilykortit (TalentMaster_Kortit.html)

| Rooli | Oikeus | Huomio |
|---|---|---|
| Pelaaja | R | Avaa lukitut saavuttamalla kynnysarvot |
| Vanhempi | R | Lapsen korttikokoelma |
| Valmentaja | – | |
| VP / UTJ | – | |

**Spesiaalikorttiluokat:**
- 🔥 FIRE — läpimurtokortit (oranssipunainen)
- 💎 ICON — legendakortit (holografinen)
- ⭐ MILESTONE — kehityskortit (kulta)
- 🌟 TOTY — kauden parhaat (platina)

**Milestone-kynnysarvot (tuleva Firebase-kytkös):**
- 30-päivän streak → "30 PÄIVÄN PUTKI"
- FLEI ≥ 80p → "FLEI 80+"
- PHV läpikäynyt → "PHV-selviytymiskortti"
- KORI-status → "Seuran kasvatti"

---

## Strateginen raportointi

| Rooli | Oikeus | Sisältö |
|---|---|---|
| Super Admin | R kaikki seurat | Täysi näkymä |
| VP | R oma seura | Operatiivinen + strateginen |
| UTJ | R oma seura | Vain aggregoitu — ei yksilödata |
| Hallitus/Puheenjohtaja | R* | Kuukausiraportti (tuleva) |
| Kaikki muut | – | |

---

## Kieliasetukset (tm_lang.js)

| Seura | Kieli | Asetus |
|---|---|---|
| fcl, kpv, palloiirot, yvies, sjk, hjk | fi | Oletus |
| grifk, vifk | sv | kieliKartta: vifk→sv, grifk→sv |
| Kaikki | en | Vaihtoehto |

---

## Tietosuojahuomiot (GDPR)

**GDPR-kriittiset datatyypit:**
- Pelaajien henkilötiedot — vaatii huoltajan suostumuksen
- Biologinen ikä — fysiologinen tieto, erityinen suoja alaikäisillä
- Vammadata — terveystieto, vaatii erillisen suostumuksen
- ADAR-pisteet — psykologinen arviointi
- Fiilinki/uni/lihaskunto — pelaajan itsensä tuottama hyvinvointitieto

**SJK-pilottiprosessi (2026-04-09):**
1. Pelaajat rekisteröidään ensin ilman suostumuslomaketta
2. VP + valmentajat tarkistavat testidatan
3. VASTA kun data OK → suostumuslomakkeet huoltajille
4. Suostumus: `suostumusTila: 'annettu'` Firestoreen

**Fiilinki-lukitusmekanismi:** `fiilinki_paivitetty` ISO-timestamp
estää jälkikäteisen muuttamisen. Security Rules tarkistaa ennen kirjoitusta.

**Seurojen välinen eristys:** `seurat/{seuraId}` on oma saareke.
Super Admin ainoa joka näkee kaikkien seurojen datan.

**Huoltajan oikeudet:** Oikeus nähdä lapsen data ja pyytää poistoa.
