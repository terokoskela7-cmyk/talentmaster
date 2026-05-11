# TalentMaster™ — Kommunikaatioflow ja ohjelmangenerointi
# Päivitetty: 2026-05-11

---

## WHY — Miksi TalentMaster on olemassa

Jalkapallossa tehdään joka päivä päätöksiä pelaajien kehityksestä ilman luotettavaa dataa.
Valmentaja valitsee talentin silmämääräisesti. Vanhempi ei tiedä kehittyykö lapsi.
Pelaaja ei tiedä mitä harjoitella kotona. Seura ei tiedä missä sen parhaat lahjakkuudet ovat.

Nämä päätökset ovat liian tärkeitä tehtäväksi näin.

**TalentMaster tekee kehityksen näkyväksi** — pelaajalle, vanhemmalle, valmentajalle ja seuralle.
Jokainen saa oman kielensä, oman näkymänsä, oman merkityksensä.
Data on taustalla. Merkitys on edessä.

*"Pelaaja ensin, hallinto vahvistaa."*
*"Transfermarkt shows what. TalentMasterID shows how."*

---

## Ohjelmangenerointi — neljä kerrosta

Pelaajan yksilöllinen ohjelma syntyy neljän datakerroksen yhdistelmästä.
Yksikään kerros yksin ei riitä — niiden yhdistelmä on se mitä muut eivät tee.

### Kerros 1 — FLEI (Harjoitettavuuskartoitus, 10–19v)
Viisi liikehallintaketjua: SBL, SFL, LL, DIAG, DFL.
Kertoo kehon valmiustilan ja heikoimman ketjun.

```
→ Ohjaa: S-harjoitteen KOHTEEN (aina heikoin ketju)
→ Ohjaa: kuormituksen (PHV-rajoitin automaattisesti)
→ Klinikka: jos FLEI < 40% → automaattinen lähetys
```

### Kerros 2 — H-H ominaisuustestit (10–19v)
Fysiikka (lineaarinopeus, CMJ, MAS) ja pallolliset (SM-juoksu, SM-pallo, TSI).
Kertoo suorituskykyprofiilin ja kehitysvauhdin.

```
→ Ohjaa: S-harjoitteen INTENSITEETIN (taso suhteessa normiin)
→ Ohjaa: talenttitunnistuksen (HG/XF-signaali)
→ TSI = SM-pallo − SM-juoksu → tekniikkaindeksi
→ H-H taso 3 = kansallinen, taso 4–5 = kansainvälinen
```

### Kerros 3 — Tekniikkakilpailut (8–13v)
Pallolliset taidot ilman fysiikan vaikutusta: ponnauttelu, syöttö, pujottelu, kuljetus.
Kertoo motorisen perustan ja teknisen kehitysvauhdin.

```
→ Ohjaa: T-harjoitteen SISÄLLÖN (mitä tekniikkaa kehitetään)
→ Ei fysiikkaa — puhtaasti tekninen kehitys
→ Kehitysvauhti tärkeämpi kuin hetkellinen taso
```

### Kerros 4 — Bola Siempre (kaikki ikäluokat, joka päivä)
*"Pallo joka päivä."* Ei vaadi kenttää, joukkuetta eikä valmentajaa.
Tämä on se mikä erottaa 10 000 tunnin pelaajan 5 000 tunnin pelaajasta.

```
T-harjoite = pallollinen omatoimiharjoitus
  Myös lepopäivinä (tekniikka vaatii päivittäistä toistoa)
  10–30 minuuttia riittää
  Pelipaikan mukaan personoitu (KH eri kuin HY)
  Ikävaiheen kieli: leikkija (U8-12) / rakentaja (U13-15) / showcase (U16+)
```

### Yhteenveto — miten ohjelma rakentuu

```
FLEI (heikoin ketju)     → S-harjoite: mitä kehoa korjataan
H-H (taso + TSI)         → S-harjoite: millä intensiteetillä
Tekniikkakilpailu (alle 13v) → T-harjoite: mitä tekniikkaa
Bola Siempre (aina)      → T-harjoite: joka päivä

D-harjoite = joukkueharjoitus (valmentajan ohjaama)
P-harjoite = peli (TASO-data, otteludata)

70% kokonaisvaltainen (kaikki ketjut, joukkueharjoitus)
30% kohdennettu (heikoin ketju, yksilöllinen)
```

---

## Kommunikaatioflow — kolme roolia, kolme kieltä

### Perusongelma joka pitää ratkaista

Salzburgin tutkimus (2022) osoittaa: päivittäisten kyselyiden täyttäminen laskee
dramaattisesti ajan myötä — myös motivoituneilla U17-eliittipelaajilla.
Suomalaisessa seurassa haaste on kymmenkertainen.

**Ratkaisu:** Jokainen rooli saa juuri sen informaation jota hän tarvitsee,
omalla kielellään, oikeaan aikaan. Ei dataa datan vuoksi.

---

### Pelaaja — toimintakehote, ei mittarit

**Mitä pelaaja tarvitsee:** Selkeä tehtävä tänään. Merkitys miksi.
Tieto siitä että kehittyy. Ei lukuja.

**Mitä pelaaja EI tarvitse:** FLEI-prosentit, H-H tasot, normatiiviset vertailut.
Nämä ovat aikuisten työkaluja.

**Kommunikaation periaatteet pelaajalle:**
- Yksi asia tänään — ei lista
- Konkreettinen tekeminen — ei tavoite
- Positiivinen kehystetty — "tämä on sinun salaisin aseesi" ei "tässä on heikkoutesi"
- Aikaikkuna — "2 viikkoa" antaa merkityksen

**Esimerkki — ikävaiheen kielellä:**

*Leikkija (U8-12):*
```
"Tänään: käytä 10 minuuttia pallolla. Keksi 3 uutta tapaa
kuljettaa. Mikä tuntuu siistimmältä kuin eilen?"
```

*Rakentaja (U13-15):*
```
"Tänään: 15 min lateraaliliike + pallon käsittely täydessä
vauhdissa. Miksi: SM-pallosi kehittyy nopeimmin juuri nyt.
Treenaa tätä 2 viikkoa — sitten näet eron testissä."
```

*Showcase (U16+):*
```
"Viikon fokus: suunnanmuutos pallon kanssa (TSI-kehitys).
Videoi yksi sarja pe-harjoituksesta. Valmentaja katsoo ma."
```

**Fiilinki-kirjaus — miksi yksi nappi:**
Salzburg oppi: pitkä lomake = väsyminen. TalentMasterissa pelaaja
painaa yhden napin (1-5) + valinnainen teksti. Ei enempää.

---

### Vanhempi — kehityskertomus, ei mittarit

**Mitä vanhempi tarvitsee:** Vastaus yhteen kysymykseen — kehittyykö lapseni?
Tunne siitä että seura välittää. Tieto mitä hän voi teukea kotona.

**Mitä vanhempi EI tarvitse:** Testituloksia, FLEI-ketjuja, TSI-arvoja.
Nämä vaativat kontekstin jota vanhemmalla ei ole.

**Kommunikaation periaatteet vanhemmalle:**
- Kertomus, ei raportti
- Vertaa lapseen itseensä — ei muihin pelaajiin
- Konkreettinen tuki kotiin — mitä hän voi tehdä
- Positiiviset merkit etusijalla — haasteet kehykset kasvuksi

**Esimerkki — vanhemman viikkoyhteenveto:**
```
"Mikaelin viikko:

✓ Harjoitteli omatoimisesti 5/7 päivää — hienoa!
↑ Isoin kehitys tällä hetkellä: pallonhallinta täydessä
  vauhdissa parantuu selvästi
→ Mitä voit tukea: kannusta palloa kotipihalle — 10 min
  vapaa leikki pallon kanssa on tärkeintä tässä iässä

Seuraava mittauspiste: 3 viikon päästä"
```

**PHV-viesti vanhemmalle (arkaluonteinen, selkokielinen):**
```
"Mikael on kasvupyrähdyksen loppuvaiheessa. Tämä tarkoittaa
että koordinaatio voi tuntua hetkellisesti hankalammalta —
se on täysin normaalia ja menee ohi. Kuormitus on nyt
rajoitettu automaattisesti ohjelmassa."
```
*Ei prosentteja. Ei teknisiä termejä. Vain merkitys.*

---

### Valmentaja — poikkeamat ja signaalit, ei raportit

**Mitä valmentaja tarvitsee:** Tieto siitä kuka tarvitsee huomiota tänään.
Nopea kuva joukkueen tilasta. Ei yksittäisiä numeroita.

**Mitä valmentaja EI tarvitse:** 20 pelaajan yksityiskohtaiset raportit joka viikko.
Hänellä ei ole aikaa lukea niitä.

**Kommunikaation periaatteet valmentajalle:**
- Poikkeamat ensin — normaali on näkymätön
- Joukkuetaso → yksilötaso (ei toisin päin)
- Toimintakehote — mitä tehdä tällä tiedolla
- Tiivistetty — max 3 asiaa kerralla

**Esimerkki — valmentajan päivänäkymä:**
```
⚠ Kuormitushuomio: 3 pelaajaa fiilinki < 2 kolmena
  peräkkäisenä päivänä → tarkista harjoituskuorma
  (Mikael V, Olli K, Lasse T)

⭐ Hidden Gem -signaali: Mikael Virtanen
  TSI parantunut 0.4s viimeisessä mittauksessa
  Q4-syntynyt, pre-PHV → katso tarkemmin

✓ Joukkueen streak-keskiarvo: 4.2/7 pv — hyvä viikko
```

**ADAR-havainto → pelaajalle:**
Valmentaja kirjaa kentällä havainnon. Pelaaja näkee sen
omalla kielellään seuraavana kirjautumisena:
```
Valmentajan kirjaama: "Dual-task rondo: hyvä skannaus,
päätös hidastuu paineessa"

Pelaajalle näkyy: "Valmentajasi huomasi tänään: näet
hyvin mitä ympärillä tapahtuu — seuraava haaste on
tehdä päätös nopeammin kun paine kasvaa. Harjoitellaan!"
```

---

### VP / Talenttivalmentaja — strateginen kuva

**Mitä VP tarvitsee:** Koko seuran kehityskuva yhdellä silmäyksellä.
Talentit tunnistettuina. Ongelmat ennen kuin ne kasvavat.

**Esimerkki — VP:n viikkonäkymä:**
```
TALENTIT (aktiiviset): 12 pelaajaa
  3 laajennettu-taso → kaikki kehittyvät odotusten mukaan
  1 Hidden Gem -signaali → ehdotus odottaa vahvistustasi

RAE-varoitus: SJK P16 — Q1/Q2-pelaajia 71%
  Riski: Q4-pelaajia saatetaan aliarvioida valinnoissa

KUORMITUS: 2 pelaajaa PHV-huipulla → automaattinen
  rajoitin käynnissä, tarkista joukkuevalmentaja
```

---

## Ohjelmangeneroinnin esteet ja ratkaisut

### Este 1: Fiilinki-kyselyn väsyminen
**Ongelma:** Päivittäinen kysely laskee ajan myötä (Salzburg 2022).
**Ratkaisu:** Yksi nappi (1-5) kirjautumisen yhteydessä. Ei erillistä lomaketta.
Optionaalinen teksti-kenttä — ei pakollinen. Gamification: streak näkyy.

### Este 2: Vanhempi ei avaa appia
**Ongelma:** Vanhempi ei muista kirjautua.
**Ratkaisu:** Push-notifikaatio kerran viikossa (maanantai-aamu).
Sähköposti varavaihtoehtona. Sisältö: 3 riviä — ei enempää.

### Este 3: Valmentajalla ei ole aikaa
**Ongelma:** Valmentaja unohtaa kirjata havainnon kentällä.
**Ratkaisu:** ADAR Pikakortti — 30 sekuntia, ei enempää.
Äänikirjaus tulossa (Whisper → Firestore) — ei tarvitse edes kirjoittaa.

### Este 4: Pelaaja ei ymmärrä miksi
**Ongelma:** 13-vuotias ei motivoidu "kehitysdatasta".
**Ratkaisu:** Merkitys ennen mittaria. "Tämä on sinun salaisin aseesi"
on tehokkaampi kuin "lateraaliketjusi on 55%". Bola siempre -filosofia
tekee harjoittelusta osan elämää, ei velvollisuutta.

---

## Kommunikaation rakennuspalikat järjestelmässä

### Mitä on jo rakennettu
- Fiilinki-kirjaus (1 nappi) pelaajan appissa
- Syntymäpäiväyllätys (konfetti + bonustehtävä) → merkitys
- Streak-seuranta → motivaatio
- ADAR Pikakortti valmentajalle → nopea kirjaus
- Valmentajan näkymä → poikkeamat

### Mitä rakennetaan seuraavaksi (prioriteettijärjestys)
1. Vanhemman näkymä — viikkokertomus (P3, kriittinen)
2. Valmentajan havainto → pelaajan näkymä (P6, kriittinen)
3. VP:n talenttinäkymä — poikkeamat + signaalit (Talentit-välilehti)
4. Ikävaiheen kieli automaattisesti (P5, U13 leikkija-kieli)
5. Push-notifikaatiot (Sprint 5)
6. Äänikirjaus Whisper → Firestore (Sprint 6)
7. AI-kehitysnarratiivi pelaajalle (Sprint 7)
8. Behavioural Science -agentti (Sprint 8, vaatii 4vk dataa)

---

## Brändiäänenkäyttö — kirjoitusohje eri rooleille

### Pelaajalle: rohkaiseva, konkreettinen, lyhyt
- Käytä "sinä" — ei "pelaaja"
- Verbejä, ei substantiiveja: "treenaa" ei "harjoittelu"
- Max 3 lausetta kerralla
- Ikävaiheen sanasto: leikkija/rakentaja/showcase

### Vanhemmalle: lämmin, selkeä, merkityksellinen
- Lapsen etunimi aina mukana
- Vertaa lapseen itseensä — ei tilastoihin
- Positiiviset merkit ensin, haasteet kasvukehyksessä
- Ei jalkapalloterminologiaa ilman selitystä

### Valmentajalle: tiivis, toimintakehote, ammattimainen
- Poikkeama ensin, konteksti sitten
- Yksi toimintakehote per huomio
- Luvut ovat OK — valmentaja ymmärtää kontekstin
- Ei selitellä — luota ammattitaitoon

### VP:lle: strateginen, kokonaiskuva, päätöstuki
- Trendit, ei yksittäiset tapaukset
- Riskit näkyviin ennen kuin ne kasvavat
- Kytkös Palloliiton vaatimuksiin (kori 1/2, 20+20)
- Auditoitava — kaikki päätökset tallentuvat perusteluineen
