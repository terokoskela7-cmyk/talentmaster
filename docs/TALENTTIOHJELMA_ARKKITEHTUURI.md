# TalentMaster™ — Talenttitunnistuksen arkkitehtuuri
# Päivitetty: 2026-05-09

---

## 1. Testimatriisi — kolme kerrosta

TalentMaster käyttää kolmea testikerrosta jotka toimivat omissa ikäikkunoissaan
mutta rakentuvat toistensa päälle. Seura voi valita tehdäänkö kaikki kerrokset
vai vain osa — järjestelmä toimii myös osittaisella datalla.

| Testikerros | Ikärajat | Testit | Patteristot |
|---|---|---|---|
| **Tekniikkakilpailut (TK)** | 8–13v | Ponnauttelu, syöttö, pujottelu, kuljetus-laukaus, pituuspotku (U12–13) | Yksi |
| **H-H ominaisuustestit** | 10–19v | Lineaarinopeus (5/10/30m), SM-juoksu, SM-pallo, CMJ, kasirata (laaja), MAS (laaja), pujottelu+syöttö (laaja) | Kevyt + Laaja |
| **Harjoitettavuuskartoitus** | 10–19v | FLEI-ketjut (5 kpl), liikelaajuudet, PHV | U10/U12/U15/U19 |

**Kriittinen huomio SM-juoksu ja SM-pallo:** Nämä ovat H-H patteriston
**suunnanmuutostestejä** (nopeus-kategoria), eivät erillisiä lajitekniikatestejä.
SM-juoksu mittaa suunnanmuutosnopeutta ilman palloa, SM-pallo saman pallon
kanssa. Molemmat kuuluvat sekä kevyeen että laajaan patteristoon —
ne ovat ne kaksi testiä jotka jokainen seura tekee aina.

### H-H viitetasot

Taso 3 = hyvä kansallinen taso
Taso 4 = erittäin hyvä (top 25%, kansainvälinen kynnys)
Taso 5 = kansainvälinen taso (top 10%)

---

## 2. TSI — kriittisin yksittäinen talentti-indikaattori

**TSI (Tekniikka-Nopeus-Indeksi) = SM-pallo − SM-juoksu**

TSI kertoo yhdellä luvulla kuinka paljon pallonhallinta hidastaa pelaajan
luontaista liikkumisnopeutta. Mitä pienempi ero, sitä paremmin pallo
"kulkee jalassa" täydessä vauhdissa ilman kognitiivista kuormaa.

| TSI-arvo | Tulkinta |
|---|---|
| ≤ 0.5s | Erinomainen — pallonhallinta ei hidasta merkittävästi |
| 0.5–1.0s | Hyvä |
| 1.0–1.5s | Kehittyvä |
| > 1.5s | Prioriteetti |

**Tutkimusnäyttö:** Liikanen & Törmä 2025 (N=1843, Suomi) osoittaa että
SM-pallo erotteli ammattilaisiksi yltäneet +8%. Kevennyshyppy ei ennustanut
menestystä lainkaan. Tämä on vastointuitiviinen löydös: pelissä kuljetetaan
palloa täydessä vauhdissa koko ajan — TSI mittaa juuri sitä.

TSI on jo laskettuna `hhLaskeMetrikat()`-funktiossa (`testit_indeksit.js`).

---

## 3. Kehitysvauhti — tärkeämpi kuin hetkellinen taso

Kansainvälinen tutkimuskonsensus (Hollanti 2022, N=110, 4v pitkittäistutkimus):
kehitysvauhti ennustaa akatemiavalintaa paremmin kuin yksittäinen testitulos.
Pelaaja joka kehittyy nopeimmin on parempi valinta kuin pelaaja joka on jo hyvä
mutta kehittyy hitaasti.

**Järjestelmässä:** `kehitysvauhti` = % per kuukausi, lasketaan
`testit_indeksit.js`:ssä ensimmäisestä mittauksesta viimeisimpään.

**Trendi-kynnysarvot:**
- Nouseva: > +5% muutos
- Tasainen: −5% – +5%
- Laskeva: < −5% muutos

---

## 4. Fysiikan rooli eri ikävaiheissa

### U8–U12: tekniikka ja vapaa leikki — fysiikkaa ei mitata talenttitunnistuksessa

Tässä ikäluokassa fysiikan mittaaminen talenttitunnistuksessa on
harhaanjohtavaa kahdesta syystä. Biologinen kehitys vaihtelee niin paljon
että kaksi saman ikäistä lasta voi olla kehitysiässä kaksi vuotta erillään.
Lisäksi RAE on suurimmillaan juuri tässä ikäluokassa — Q1-syntynyt on aina
fyysisesti edellä, mutta se kertoo syntymäkuukaudesta eikä potentiaalista.

Painopiste: päivittäinen pallokosketus, motoristen automaatioratojen
rakentaminen (Walker 2017 + Côté 2007). Tekniikkakilpailut mittaavat
teknistä kehitystä — tämä on luotettava indikaattori koska se ei ole yhtä
voimakkaasti sidottu biologiseen kypsyyteen kuin nopeus tai voima.

### U10–U13: fysiikka mukaan rinnalle, tekniikka silti tärkein

H-H testit alkavat 10-vuotiaana. PHV-mittaus osana jokaista kartoitusta.
Fysiikan tulos luetaan aina PHV-tila taustalla. Tekniikkakilpailu jatkuu
rinnalla 13-vuotiaaksi. TSI on tässä ikäluokassa jo merkityksellinen luku.

### U13–U15: PHV dominoi tulkintaa — kriittisin vaihe

PHV-huipulla olevan pelaajan fysiikkamittaukset ovat täysin eri asteikolla
kuin pre-PHV tai post-PHV pelaajalla. PHV-status ohittaa ikäluokan kaikissa
tulkinnoissa. Kuormitusrajoitin automaattisesti 60% PHV-huipulla.

Tässä ikäluokassa **biologinen Hidden Gem** on yleisin ja tärkein tunnistus-
kohde: pre-PHV pelaaja joka häviää fyysisessä vertailussa ikätovereilleen
mutta jonka tekninen kehitysvauhti on korkea. Hän katoaa nykyisistä
järjestelmistä koska hän ei pärjää fyysisessä vertailussa.

Talenttinimitys alkaa 13-vuotiaasta.

### U15–U19: fysiikka täysimittainen työkalu

H-H tasot 3–5 ovat nyt aidosti vertailukelpoisia kansalliseen ja
kansainväliseen normistoon. Pelipaikkakohtainen spesifikaatio alkaa.
Taktinen ja psykologinen integraatio hallitsee kehitystä.

---

## 5. Hidden Gem™ — neljä tyyppiä

Hidden Gem on pelaaja jonka potentiaali on **piilossa jonkin ulkoisen
tekijän takana**. Hän ei välttämättä näytä tänään parhaalta — hän kehittyy
nopeimmin ja hänen biologinen ikänsä tai syntymäkuukautensa on haitannut
tunnistamista.

### 5.1 Motorinen HG (U8–12v)

Pallolliset top 25% ikäluokassaan, FLEI ≥ 60%, oppimiskyky 3/3.
Ei fysiikkamittausta — merkki on tekninen kehitysvauhti yhdistettynä
liikehallintaan. Kehitysaikajänne 6–12 kuukautta ennen varmistusta.

### 5.2 Biologinen HG (U12–15v) — tärkein tyyppi

Pre-PHV-pelaaja + ≥ 20 persentiiliä eroa biologisen ja kronologisen iän
välillä + pallolliset ≥ taso 3–4 + TSI ≤ 0.5s.

Käytännössä: pieni, teknisesti taitava, biologisesti jäljessä ikätovereitaan.
Klassinen Hidden Gem joka katoaa nykyisistä järjestelmistä koska hän ei
pärjää fyysisessä vertailussa. Forsman 2013 (N=509, Suomi) vahvistaa:
Q4-syntyneet menetetään systemaattisesti ilman korjausta.

### 5.3 Pelipaikka-HG (U15–17v)

Pelipaikkakohtaiset avainominaisuudet ≥ taso 3 + 5RM 2/5 kriteerillä
vihreällä + Game IQ ≥ 12p. Pelaaja joka on kehittynyt vahvasti omilla
pelipaikan avainominaisuuksilla mutta ei kaikessa.

### 5.4 Marginaali-HG (U17–19v)

GPS-pelidata ylittää H-H testitulokset + DVI nouseva ≥ 3 dimensiossa +
Game IQ ADAR ≥ 30p. Pelaaja joka tekee ottelussa enemmän kuin testi ennustaisi.

---

## 6. X-Factor™ — neljä tyyppiä

X-Factor on pelaaja jolla on jo yksi **poikkeuksellinen erottuvuus** jota
kehitysohjelma voi viedä huipputasolle. Hän on jo hyvä — hän kehittyy
vieläkin nopeammin jollakin erityisalueella.

| Tyyppi | Ikä | Avainketju | Kehitystavoite |
|---|---|---|---|
| Nopeus-XF | U12+ | Takaketju (SBL) | 30m taso 5, EI ≥15%, pudotushypyt |
| Tekniikka-XF | U12+ | Kiertoketju (DIAG) | TSI paranee ≥0.3s, SM-pallo paineessa |
| Game IQ -XF | U13+ | Kierto + syvä | ADAR ≥80%, skannaus + Honey Trap |
| Psykologinen XF | Kaikki | Syväketju (DFL) | Error Recovery, resilience kaikissa ikäluokissa |

---

## 7. Signaalilogiikka — automaattiset kynnysarvot

Järjestelmä laukaisee signaalin kun ehdot täyttyvät. Signaali ei tee
päätöstä — se nostaa pelaajan valmentajan ja VP:n huomion kohteeksi.

### Hidden Gem -signaali (kaikki kolme ehtoa täytyttävä)

**Ehto 1 — Tekninen kehitysvauhti:**
TSI paranee ≥ 0.3s kahdessa peräkkäisessä mittauksessa TAI SM-pallo
kehitysvauhti > +2% per kuukausi.

**Ehto 2 — Biologinen konteksti:**
RAE-kvartiili Q3 tai Q4 TAI PHV-tila = pre-PHV tai varhainen PHV-huippu.

**Ehto 3 — Hetkellinen taso alle mediaanin:**
H-H OVR ≤ ikäluokan mediaani. (Pelaaja ei ole jo top-pelaaja — silloin
kyse on X-Factorista.)

### X-Factor -signaali

H-H OVR ≥ taso 4 (top 25%) JA jokin yksittäinen testi taso 5
JA kehitysvauhti nouseva (> +5% muutos viimeisessä mittauksessa).

### Miksi kaksi erillistä signaalia

Hidden Gem ja X-Factor tunnistava täysin eri pelaajatyypit ja johtavat
eri toimenpiteisiin. HG-pelaaja tarvitsee biologisen iän korjausta ja
erityishuomiota koska hänet on vaarassa menettää. XF-pelaaja tarvitsee
kiireellisesti resursseja jotta poikkeuksellinen erottuvuus kehittyy
maksimaalisesti. Sama automaattinen nosto molemmille, mutta eri syystä.

---

## 8. Talenttiohjelma — vahvistettu prosessi

### Tasot

Taso 1 (Perus IDP) käynnistyy kaikille pelaajille automaattisesti.
Taso 2 (Laajennettu IDP + talenttinimitys) vaatii vahvistetun prosessin,
alkaa 13-vuotiaasta. Taso 3 (Palloliiton lista) on erillinen —
TalentMaster toimii tietolähteenä mutta ei päätä valinnasta.

### Vahvistusprosessi

Valmentaja tekee ehdotuksen järjestelmässä perusteluineen. VP tai
talenttivalmentaja näkee datanäkymän (FLEI, ADAR, D-profiilit,
RAE-korjattu sijoitus, kehitystrendi) ja joko vahvistaa tai hylkää.
Molempien toiminto tallentuu auditointipolkuun. 30 päivän aikaraja —
järjestelmä muistuttaa jos ehdotus jää roikkumaan.

### Tunnistamissignaalit ennen ehdotusta

Kolme signaalia jotka valmentaja näkee ennen kuin tekee ehdotuksen.
Kehitystrendi on tärkeämpi kuin hetkellinen taso. FLEI + ADAR -kehitys
kertoo kokonaisvalmiudesta. RAE-korjattu sijoitus joukkueessa paljastaa
biologisesta alijäämästä huolimatta kehittyvät pelaajat.

### Poistuminen talenttiohjelmasta

Ei automaattista pudotusta yhden mittauksen perusteella.
Kehittyminen ei ole suoraviivaista — tämä on kirjattu järjestelmään
periaatteena. VP:n aktiivinen päätös + perustelu tallentuu.

### Seurakoko ja kiintiöt

Palloliiton kori 1/2 vaatii 20+20 talenttivalintaa. Pienessä seurassa
realistinen määrä voi olla 5 — järjestelmä suosittelee dataperusteisen
määrän eikä pakota 20:een. Iso seura (HJK, SJK) voi löytää 35.

---

## 9. Kansainvälinen benchmarkkiyhteenveto

Kaikki johtavat akatemiat (Ajax, Barcelona, Englanti PL, Saksa DFB)
tunnistavat RAE-ongelman. Kukaan ei ole rakentanut skaalautuvaa alustaa
joka korjaa sen automaattisesti jokaiselle pelaajalle.

Ajaxin TIPS-malli (Tekniikka, Peliäly, Persoonallisuus, Nopeus) vastaa
TalentMasterin D2+D4+D3+D1-dimensioita. Ajax vähentää RAE:ta implisiittisesti
koska ei arvioi pelkästään fysiikalla — mutta heillä ei ole RAE-korjausta
eksplisiittisenä laskentana.

Englannin PL-akatemiat ovat ottaneet bio-bandingin käyttöön vuodesta 2018.
Se auttaa fyysistä kehitystä mutta ei korjaa RAE:ta systemaattisesti
kaikessa muussa valinnassa. Q4-pelaajilla on korkein markkinaarvo seniorina —
tämä tukee "underdog-hypoteesia" suoraan.

Saksan DFB tiedostaa ongelman. Järjestelmällistä automaattista korjausta
ei ole. Nuorten Bundesligassa RAE on tilastollisesti merkittävä (p < 0.001).

**TalentMasterin positio:** Ainoa tunnettu alusta joka laskee RAE-korjauksen
automaattisesti jokaiselle pelaajalle ja kytkee sen suoraan
talenttiohjelmavalintaan.

---

## 10. Kytkös koodiin

```
testit_indeksit.js
  hhLaskeTaso()         → taso 1-5 per testi
  hhLaskeMetrikat()     → TSI, EI, FVP
  hhLaskeOVR()          → kokonaisindeksi 0-100
  laskeHHTrendi()       → kehitysvauhti % per kuukausi
  laskeADARPisteet()    → onXFactorSignaali, onHiddenGemSignaali

Firestore
  seurat/{id}/testit/{testId}
    tyyppi: 'hh' | 'tekniikka' | 'harjoitettavuus'
    kehitysvauhti: number (% per kuukausi)
    tsi: number
    ovr: number
    hidden_gem_signaali: bool
    x_factor_signaali: bool
```

**Seuraava kehitysaskel (P7):** IDP-aktivointilogiikka lukee nämä signaalit
ja käynnistää vahvistusprosessin automaattisesti. Valmentaja saa ilmoituksen:
"Pelaaja X täyttää Hidden Gem -kriteerit — haluatko tehdä ehdotuksen?"

---

## 11. Pelaajan app — kehitysarkkitehtuuri (2026-05-12)

### KOTI-näkymän 70/30-rakenne

KOTI-näkymä toteuttaa 70/30-periaatteen kolmena hierarkkisena korttina.
Visuaalinen hierarkia ohjaa käyttäytymistä — D-kortti on suurin, S-kortti
pienempi, T-kortti kevyin. Tämä kertoo pelaajalle ilman sanoja mikä on
tärkeintä.

D-kortti "Tänään" (70%) on pääohjelma. Lähde on `_luoOhjelma(p).tHarjoite`
(PANKKI, päivärotaatio). Why-lause: `getWhyLause(ketju, 'D', stage)`.
Kirjaus: `tyyppi:'D'`, konteksti:'paivan_ohjelma'. Tyyli: gradient-teal,
solidi reuna, 18px otsikko.

S-kortti "Kohdennettu kehitys" (30%) on yksilöllinen kohdennusharjoite.
L�hde on `_luoOhjelma(p).sHarjoite` (heikoin FLEI-ketju). Why-lause:
`getSHarjoiteWhy(flei_normalisoitu, stage)` — HUOM: flei normalisointi
(arvo-1)/2×100 ennen kutsua. Kirjaus: `tyyppi:'S'`, konteksti:'kohdennettu'.
Tyyli: subtle teal-tausta, 0.5px reuna, 15px otsikko.

T-kortti "⚽ Pallo joka päivä" on Bola Siempre — invariantti vakio joka
pätee joka päivä riippumatta muusta ohjelmasta. Why-lause: `getTHarjoiteWhy(stage)`
ikäfaasin mukaan. Kirjaus: `tyyppi:'T'`, konteksti:'bola_siempre'. Tyyli:
3% teal-tausta, dashed reuna, 14px otsikko — kevyin visuaalisesti. Ei XP-
lukuja näkyviin (tallennetaan Firestoreen mutta piilotetaan UI:sta).

XP tallennetaan Firestoreen tulevia AI-moduuleja varten (D+60, S+30, T+20)
mutta ei näytetä pelaajalle. Overjustification effect: ulkoiset palkkiot
heikentävät sisäistä motivaatiota pitkällä aikavälillä (Deci & Ryan 1985).

---

### 12. Streak — kaksi käyttökontekstia

Streak on järjestelmässä kahdella eri tasolla ja ne palvelevat eri tarkoituksia.

Pelaajalle streak on jatkuvuuden mittari — "7 päivän putki" kertoo konkreettisesti
mitä hän on saavuttanut. Se ei ole palkintojärjestelmä vaan kehitysjärjestelmä.
Yksi kirjaus per päivä riittää (T, D tai S) — kaikki kolme voi tehdä samana
päivänä mutta streak nousee silti vain yhdellä. Streak on jo Firestoressa
(v5, `_lataaCStreak()`), ei localStoragessa.

Valmentajalle streak on diagnostinen työkalu. VP-dashboardissa näkyy
joukkueen streak-jakauma: montako pelaajaa on aktiivisia tällä viikolla,
kenen streak on katkennut. Tätä ei esitetä rankinginä — se on työkalu joka
auttaa valmentajaa tunnistamaan ketkä tarvitsevat tukea ennen kuin ongelma
kasvaa. Tärkeä periaate: streak-tieto on valmentajalle yksityinen diagnostiikka,
ei julkinen vertailutaulu pelaajien välillä.

Firestore-rakenne on jo olemassa: `streak` ja `streak_paivitetty` pelaajan
päädokumentissa. VP-näkymään lisätään aggregoitu luku: `aktiivisia_viikolla`
(streak ≥ 1 viimeisen 7 päivän aikana) per joukkue.

---

### 13. Haasteet — neljä ulottuvuutta

Haaste-ominaisuus rakentuu neljään erilliseen ulottuvuuteen jotka toteutetaan
eri sprinteissä prioriteettijärjestyksessä.

**Kaverihaaste (Sprint 2 — läsnäolohaaste)** on yksinkertaisin ja tärkein.
Pelaaja lähettää joukkuekaverille "Treenaa tänään" -haasteen. Haaste on aina
T-tyyppi (Bola Siempre) koska se on ikä- ja kehitysvaiheesta riippumaton —
jokainen pelaaja voi haastaa kaverin riippumatta siitä onko hän U8 tai U16.
Suoritushaasteet (ole nopeampi kuin minä) on tarkoituksella poistettu koska
ne luovat epäterveellistä vertailua eri kehitysvaiheessa olevien pelaajien
välillä.

Firestore-rakenne: `seurat/{seuraId}/haasteet/{haasteId}` — kentät:
lahettajaId, vastaanottajaId, tyyppi ('T'), viesti (max 50 merkkiä),
luotu (Timestamp), tila ('lahetetty'|'hyvaksytty'|'suoritettu'|'vanhentunut'),
vanhenee (48h luomisesta). Security Rules: pelaaja voi luoda ja lukea
haasteet joissa on osapuolena, päivittää tilan omissaan.

**Valmentajan asettama haaste (Sprint 3)** kytkee P6-viestinnän jatkuvaksi
kehitysohjelmaksi. Valmentaja voi lähettää koko joukkueelle tai yksittäiselle
pelaajalle spesifisen kehitystehtävän viikoksi tai kuukaudeksi. Tämä ei
korvaa ADAR-havaintoa — se täydentää sitä. Havainto kertoo mitä tapahtui,
haaste kertoo mitä tehdään seuraavaksi.

**Joukkuehaaste (Sprint 3)** luo kollektiivisen motivaation ilman yksilöllistä
vertailua. "Joukkueen yhteinen streak tällä viikolla on 87 päivää, tavoite
on 100." Jokainen pelaajan kirjaus kasvattaa yhteistä lukua. Tämä on
sosiaalinen haaste joka ei nolaa yhtäkään yksittäistä pelaajaa.

**Kehityshaaste — talenttiohjelmaan kytketty (Sprint 6-8)** aktivoituu kun
Hidden Gem tai X-Factor -signaali laukeaa. Järjestelmä asettaa automaattisen
haasteen: "sinun TSI-kehityksesi on poikkeuksellinen — pidä se yllä seuraavat
30 päivää." Tämä kytkee talenttitunnistuksen suoraan pelaajan arkiseen
tekemiseen.

---

### 14. Pelaajan omat tavoitteet — yhteinen kehityssuunnitelma

Tämä ei ole talenttiohjelma-ominaisuus vaan kaikkien pelaajien oikeus.
Tavoiteasetanta on osa jokaisen pelaajan kehitystä ikäluokasta ja tasosta
riippumatta — se on se hetki jolloin pelaajasta tulee oman kehityksensä
aktiivinen osapuoli eikä passiivinen tarkkailtava.

**Filosofia:** Valmentaja ei aseta tavoitteita pelaajalle — he asettavat
ne yhdessä. Tämä perustuu itsemääräytymisteorian (Deci & Ryan) autonomia-
periaatteeseen: ihminen sitoutuu tavoitteisiin joihin hän on itse vaikuttanut
huomattavasti voimakkaammin kuin ulkoapäin annettuihin tavoitteisiin.
Gollwitzerin implementation intention -tutkimus vahvistaa: kun tavoite
kirjoitetaan eksplisiittisesti ("teen X tilanteessa Y"), saavuttamisen
todennäköisyys kasvaa merkittävästi.

**Kolme tavoitetasoa:**

Lyhyen aikavälin tavoite (2–4 viikkoa) on konkreettinen tekeminen: "teen
S-harjoitteen kolme kertaa tällä viikolla" tai "pidän 14 päivän putken yllä."
Tämä kytkeytyy suoraan päivittäiseen kirjauslogiikkaan ja streak-seurantaan.
Pelaaja asettaa tämän itse, valmentaja voi kommentoida.

Kauden tavoite (3–6 kuukautta) on kehityspainotus: "haluan parantaa
lateraaliliikettäni" tai "haluan nostaa TSI:täni 1.5s → 1.0s". Tämä vaatii
valmentajan osallistumisen koska se pitää kytkeä ohjelmaan — heikoin ketju,
testausaikataulu, seuranta. Valmentaja vahvistaa kauden tavoitteen samanlaisella
prosessilla kuin talenttiohjelma-ehdotuksen.

Pitkän aikavälin unelma (ei aikarajaa) on se miksi pelaaja pelaa jalkapalloa.
"Haluan pelata maajoukkueessa" tai "haluan pelata yliopistossa Saksassa."
Tämä ei ole mitattava tavoite — se on ankkuri joka antaa merkityksen kaikelle
muulle. Järjestelmä ei mittaa tätä, se vain tallentaa sen ja näyttää sen
pelaajalle itselleen silloin kun motivaatio on koetuksella.

**Firestore-rakenne:**
```
pelaajat/{id}/tavoitteet/{tavoiteId}
  tyyppi:        'lyhyt'|'kausi'|'unelma'
  kuvaus:        string (pelaajan omin sanoin, max 200 merkkiä)
  luotu:         Timestamp
  asettaja:      pelaajaId (aina pelaaja itse)
  vahvistaja:    valmentajaId (vaaditaan kausi-tavoitteille)
  tila:          'aktiivinen'|'saavutettu'|'muutettu'|'poistunut'
  saavutettu:    Timestamp|null
  liittyy_ketjuun: 'SBL'|'SFL'|'LL'|'DIAG'|'DFL'|null
  liittyy_testiin: 'tsi'|'smjuoksu'|'cmj'|null
```

**Ikävaiheen huomio:** Alle 13-vuotiaalle tavoite on aina lyhyen aikavälin
ja konkreettinen — "keksi 5 uutta pallotemppu tällä viikolla" eikä "paranna
TSI:täni." Kauden tavoitteet ja pitkän aikavälin unelmat ovat 13-vuotiaasta
eteenpäin. Tämä noudattaa samaa ikävaiheistusta kuin koko testimatriisi ja
ikäfaasikieli.

**Kytkös AI-moduuleihin (Sprint 6-8):** Behavioural Science -agentti lukee
pelaajan tavoitteet ja kalibroi viestinsä niihin. Jos pelaajan unelma on
"pelata Saksassa" ja hänen TSI-kehityksensä on nouseva, agentti kytkee
nämä yhteen: "sinun tekniikkasi kehittyy tällä hetkellä suuntaan joka
vie lähemmäs tuota unelmaa." Tämä on se hetki jolloin data muuttuu
merkitykseksi.

---

### 15. Rakentamisjärjestys — kokonaiskuva

Sprint 1 (nyt valmis): KOTI-näkymä puhdistettu, 70/30-rakenne toteutettu,
Bola Siempre integroitu, P6-käynnistys korjattu, kehut-säännöt lisätty.

Sprint 2 (seuraava): Bottom navigation (Tänään/Minä/Meistä), FIFA-kortti
oikealla datalla, FLEI-profiilikartta, kehitysaikajana, kaverihaaste
perusrakenne, streak VP-dashboardissa.

Sprint 3: Meistä-välilehti (valmentajan viesti, TASO-kalenteri, joukkuehaaste),
valmentajan asettama haaste, pelaajan omat tavoitteet (lyhyt + kausi),
TMBus-Firestore-bridge push-notifikaatioita varten.

Sprint 4-5: TASO-integraatio kalenteriin, iCal-vienti, tavoitteiden
seurantanäkymä pelaajalle ja valmentajalle.

Sprint 6-8: AI-kehitysnarratiivi, Behavioural Science -agentti, kehityshaaste
talenttiohjelmaan kytkettynä, pitkän aikavälin unelma-ankkuri.
