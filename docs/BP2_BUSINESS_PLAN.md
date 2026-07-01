# BP2 — TalentMaster™ Business Plan (kaupallinen)

> **Business-suunnittelu, osa 2/5.** Rakentuu markkinapohjalle **[BP1_EUROOPAN_MARKKINATARVE.md]**. Ansaintamalli + GTM syvennetään BP4:ssä, luvut BP5:ssä; tämä doc antaa kaupallisen kokonaiskuvan + sijoittajavalmiin rungon.
> Laadittu 2026-07-01. **Sijoittajavalmis muoto, hybridirahoitusstrategialla** (bootstrap pilottituloilla + Business Finland ei-laimentava tuki → sijoituskierros myöhemmin vahvuudesta, omistus säilyttäen). **EI sijoitusneuvonta.**
> Avoimet luvut: **[TARKENNA]** = tarkennettava alkuperäislähteestä/kirjanpitäjältä.

---

## 1. Executive Summary

**TalentMaster™ on suomalainen jalkapallon talenttiarviointi- ja kehitysseuranta-SaaS**, joka muuntaa hajanaiset testitulokset kypsyys- ja ikävinouma-korjatuiksi kehitysindekseiksi — ja tekee ne turvallisesti näkyviksi valmentajalle, valmennuspäällikölle, pelaajalle ja perheelle. Filosofia: *"Pelaaja ensin, hallinto vahvistaa."*

**Ongelma.** Nuorten jalkapallossa lahjakkuutta valitaan systemaattisesti väärin: suhteellinen ikävinouma (RAE) ja biologisen kypsymisen ajoitus suosivat aikaisin syntyneitä ja aikaisin kypsyviä — vaikka *fyysinen etu nyt ei ennusta lahjakkuutta myöhemmin*. Samaan aikaan dropout on korkea (21–27 %), vertailu ja vanhempien paine ovat johtavia syitä, ja kehityshistoria katoaa seuranvaihdossa. Seuroilla on halu dataohjattuun kehitykseen, mutta ei osaamista, työkaluja eikä GDPR-kyvykkyyttä alaikäisten terveysdataan.

**Ratkaisu.** TalentMaster laskee automaattisesti biologisen iän (PHV/Mirwald), soveltaa RAE-korjausta, ja esittää tulokset lapselle turvallisesti (ei ranking-lukuja, ei vertailua muihin). Pelaajan kehitysdata muodostaa **"urheilijan digitaalisen passin"**, joka seuraa pelaajaa seurasta toiseen. TalentMasterID Oy toimii rekisterinpitäjänä → seura saa valmiiksi jäsennellyn näkymän ilman omaa GDPR-taakkaa.

**Markkina.** Urheiluanalytiikan ohjelmistomarkkina ~5,5 mrd USD (2025, +20 % CAGR); lähin tuoteproxy (talent-ID-SW) ~1,4–2,2 mrd (2024). Erillistä nuorten kehityspassi -markkinaa ei ole vielä mitattu → **kategorian luonti**. Kilpailullinen leikkauspiste (nuorisokehitys + kypsyys/RAE-korjaus + lapsiturvallisuus + seurojen-yli-passi) on **tyhjä**.

**Liiketoimintamalli (monikanava).** Kärki **B2B**: seura maksaa 50 €/kk + 2,5 €/aktiivipelaaja/kk ja perii perheiltä osana jäsenmaksua. Lisäksi **Solo B2C** 4,99 €/kk (perhe suoraan). Mahdollinen **B2B2C** liitto/akatemiakanava (perustaja on Palloliiton kansallisen ohjelman johtaja).

**Traction.** Live-pilotti **8+2 pilottiseuraa**; pelaajia tuotu tuotantoon (SJK 61, GrIFK 145, Sibbo-Vargarna 223, Pallo-Iirot 67, KPV 34); rakennusvaihe ohi, käyttöönotto- ja datankeruuvaihe käynnissä. GDPR-tekniikka (RTBF + export) rakennettu ja verifioitu.

**Rahoitusstrategia (hybridi).** Bootstrap pilottituloilla + Business Finland ei-laimentava tuki → kasvata todistettu adoptio + data → nosta sijoituskierros myöhemmin vahvuudesta, omistus mahdollisimman pitkälle säilyttäen. Suunnitelmat kirjoitetaan sijoittajavalmiiksi.

---

## 2. Yritys ja tuote

**Yritys:** TalentMasterID Oy · Y-tunnus 3616734-7 · Kotipaikka Vaasa · Perustaja Tero Koskela (Palloliiton kansallisen ohjelman johtaja).

**Tuoteperhe:**
- **Club (B2B):** seuran hallinto (VP/sihteeri/UTJ) + valmentaja + pelaaja + perhe. Testaus, mittaus, kehitysseuranta, biologinen ikä, kehitysindeksit, kalenteri + läsnäolo, roolien välinen viestintä.
- **Solo "Player™" (B2C):** perheen suora tuote — pelaajaprofiili, tekniikkaseuranta, FIFA-tyylinen kehityskortti, PlayerCode-silta seuraan (data valuu Solo-profiiliin kun pelaaja jakaa seuralle).

**Tekninen kypsyys (todentaa toteutuskyvyn):** Vanilla JS multi-HTML; Firebase Firestore (EU-alue) + Cloud Functions (europe-west1); GitHub Pages + CDN. Kanoninen metodologia lukittu (5D-viitekehys, FLEI-kehon valmiusindeksi, TKI-tekniikkaindeksi, PHV bio-ikä, Eerikkilä-normit). 85+ automaattitestiä + Rules-testit + CI + virhemonitorointi (EU). GDPR-tekniikka rakennettu ja live-verifioitu.

---

## 3. Ongelma ja ratkaisu (arvolupaus per rooli)

| Rooli | Ongelma tänään | TalentMasterin arvo |
|---|---|---|
| **Valmennuspäällikkö (VP)** | Ei kokonaiskuvaa seuran talenttitilanteesta; kalibrointi valmentajien välillä puuttuu; GDPR-vastuu pelottaa | Joukkuepulssi + talenttisignaalit + kalibraatiopaja; rekisterinpitäjyys TM:llä → ei GDPR-taakkaa |
| **Valmentaja** | Raakatulokset eivät kerro kehittyykö pelaaja; kypsyys/RAE-vinouma piilossa | Kypsyystietoiset indeksit + kehitysvauhti + "suljettu kehityssilmukka" (testi→diagnoosi→resepti→seuranta) |
| **Pelaaja** | Vertailu muihin ahdistaa; numero-grindi | Turvallinen kehys (ei rankingia/vertailua), positiiviset tavoiterivit, keräilykortit |
| **Perhe** | Painostusmekanismi; ei ymmärrystä miten tukea | Sama turvallinen kehys + "miten tukea" -kerros; autonomiaa tukeva viestintä |
| **Liitto/akatemia** | Hajanainen data, ei kansallista kehityskuvaa | Aggregoitu, normalisoitu, kypsyystietoinen kehitysdata polulle |

**Tieteellinen perusta (erottaa "mielipiteestä"):** RAE-korjaus + herkkyysikkunat + PHV ovat dokumentoituja (ks. BP1 §2/§4). Tuote on tieteen käyttöliittymä, ei markkinointiväite.

---

## 4. Markkina (tiivistys — täysi BP1)

TAM (Eurooppa) >60 M rekisteröityä pelaajaa / satoja tuhansia seuroja; SAM (Pohjoismaat + digikypsä EU) ~1,5–2 M pelaajaa / ~5 000+ seuraa; SOM (Suomi 3 v) ~1 000 seuraa / ~90–110k nuorta (est.) × penetraatio × ARPU. Bottom-up perustellaan **pilotin todellisilla konversio-/aktivaatioluvuilla**. Kasvua ajaa kyvykkyysvaje + bio-age/RAE:n valtavirtaistuminen + GDPR-paine. Kilpailullinen leikkauspiste tyhjä. **[TARKENNA BP1:n merkityt luvut.]**

---

## 5. Liiketoimintamalli ja hinnoittelu

### 5.1 Kanavat ja hinnat
| Kanava | Maksaja | Hinta | Peruste (BP1 §5–6) |
|---|---|---|---|
| **B2B Club (kärki)** | Seura (perii perheiltä jäsenmaksun osana) | 50 €/kk + 2,5 €/aktiivipelaaja/kk (alv 0 %) | Perusmaksu ankkuroitu Nimenhuuto↔Sportlyzer; per-player parhaiten akatemia-/talenttitasona |
| **B2C Solo** | Perhe suoraan | 4,99 €/kk (~60 €/v) | Alle jokaisen kuluttajaverrokin; <5 % perheen vuosikuluista. **Johda vuosihinnalla ~49–59 €/v.** |
| **B2B2C Liitto/akatemia** | Liitto/akatemia | Custom (viisi–kuusinumeroinen vuosilisenssi) | Ankkuroi per-player-in-programme; perustajan liittorooli = uskottavuus |

**Aktiivisen pelaajan määritelmä:** voimassa oleva huoltajan suostumus + kuuluu aktiiviseen joukkueeseen; lasketaan kuukauden lopun tilanteesta. Pelaajamaksu koostettuna seuran laskuun; seura vastaa perinnästä perheiltä.

### 5.2 Yksikkötalous (rakenne — luvut BP5)
- **ARPU-ankkurit:** B2B ~600 €/v perus + per-player-kertymä; B2C ~60 €/v.
- **Rajakustannus/pelaaja lähes nolla** (SaaS, EU-pilvi) → bruttokate korkea; päävipu = asiakashankinta + retentio.
- **Retentio-vipu = data + passi:** mitä enemmän kehityshistoriaa, sitä korkeampi vaihtokustannus (lock-in datasta, ei sopimuksesta).
- **[TARKENNA]** CAC, LTV, churn, katerakenne → BP5 + kirjanpitäjä.

### 5.3 Miksi hybridimalli sopii tähän
Pilottitulot + Business Finland kattavat kehityksen ilman aikaista laimennusta; data + adoptio kertyvät → sijoituskierros myöhemmin korkeammalla arvostuksella. Malli A -rekisterinpitäjyys tekee B2C-skaalauksen mahdolliseksi ilman per-seura-DPA:ita → kanavat eivät ole toisensa poissulkevia.

---

## 6. Go-To-Market (tiivistys — täysi BP4)
Kärki = **B2B seurojen kautta**, aloitus Suomen pilottiseuroista → referenssit → Pohjoismaat. Liitto/akatemiakanava perustajan verkoston kautta. Solo B2C skaalaa suoraan perheille (matala hinta, itsepalvelu, PlayerCode-silta seuroihin). Yksityiskohtainen kanavastrategia, myyntisuppilo, viestit ja "kuka maksaa, miksi, miten" = **BP4 (Markon tunnistama heikoin lenkki).**

---

## 7. Kilpailu ja erottautuminen (tiivistys — täysi BP1 §3–4)
Kenttä jakautuu eliittiprotyökaluihin (Wyscout/Kitman/Zone7), HW-wearableihin (Playermaker/PlayerData), video/analyysiin (Hudl) ja nuorisoseurahallintaan (Sportlyzer/MyE.Way). **Leikkauspiste — nuorisokehitys + kypsyys/RAE-korjaus + lapsiturvallisuus + pelaajan omistama passi — on tyhjä.** Puolustusvallit: (1) lukittu tieteellinen metodologia, (2) rekisterinpitäjä-malli + datalock-in, (3) perustajan liittoasema, (4) lapsi ensin -brändi.

---

## 8. Tiimi
Perustaja **Tero Koskela** — Palloliiton kansallisen ohjelman johtaja: domain-auktoriteetti + liittoverkosto + metodologinen uskottavuus (harvinainen yhdistelmä founder-market fit). Kehitys: yksinkehittäjä-malli + AI-avusteinen työnkulku (dokumentoitu toimintasuunnitelma toiselle kehittäjälle). **[TARKENNA]** advisory (esim. Marko — kontaktit + osaaminen), toinen kehittäjä, kirjanpitäjä/juristi.

---

## 9. Traction ja tiekartta
**Nyt:** 8+2 pilottiseuraa; ~500+ pelaajaa tuotu; metodologia + analyysimallit lukittu; GDPR-tekniikka verifioitu; suostumusflow + PIN-rekisteröinti live.
**Seuraava 6–12 kk:** pilottien datankeruu + adoptio (suostumus-% → go-live), Sibbo-sopimus (Malli A), juristin GDPR-vahvistus, referenssitulokset, Solo-tuotteen alkuarviointi.
**12–24 kk:** Pohjoismaat-laajennus, liitto/akatemiakanava, Solo B2C skaalaus, sijoituskierros vahvuudesta.

---

## 10. Rahoitus (tiivistys — täysi BP5)
**Hybridi:** (1) pilottitulot, (2) Business Finland ei-laimentava tuki (esim. Tempo/kehitysrahoitus — **[TARKENNA soveltuvuus]**), (3) mahdollinen sijoituskierros myöhemmin. Käyttökohteet: toinen kehittäjä, GDPR/juridiikka, myynti/GTM, Pohjoismaat-lokalisointi. Tarkat luvut, runway ja investointisuunnitelma = **BP5**.

---

## 11. Riskit ja lieventäminen
| Riski | Lieventäminen |
|---|---|
| **Kategorian luonti hidasta** (ei valmista markkinaa) | Beachhead-fokus (Suomi), referenssivetoinen kasvu, liittokanava nopeuttaa validointia |
| **GDPR / alaikäisten terveysdata** | Malli A rekisterinpitäjyys + tekninen RTBF/export valmis + juristin vahvistus + DPIA-harkinta (BP3/policy) |
| **Per-player-hinta grassroots-vastustus** | Siirrä per-player akatemia-/talenttitasoksi; grassroots perusmaksulla |
| **Yksinkehittäjä-pullonkaula** | Dokumentoitu arkkitehtuuri + testit + CI; toisen kehittäjän rekry rahoituksella |
| **Inkumbentti (MyClub/MyE.Way) reagoi** | Erottautuja-syvyys (bio-age/RAE/passi) + integroidu, älä korvaa hallintoa |
| **Rahoitus viivästyy** | Bootstrap-malli antaa runwayta; ei riippuvainen aikaisesta kierroksesta |

---

## 12. IPR (tiivistys — täysi BP3)
Suojattavat: metodologia (5D + RAE-korjaus + PHV-integraatio + herkkyysikkuna-signaalit), brändi (TalentMaster™, tuotenimet), tietokanta/data-oikeudet, lähdekoodi. IPR-strategia + patentti-/tavaramerkki-/liikesalaisuus-analyysi + suositeltavat toimet = **BP3** (edellyttää patenttiasiamiestä — en ole juristi).

---

## 13. Yhteenveto sijoittajalle
Todistettu ongelma + tieteellinen erottautuja + tyhjä kilpailullinen leikkauspiste + poikkeuksellinen founder-market fit + live-traction + kevyt hybridirahoitus, joka säilyttää omistuksen ja arvostuksen kasvupotentiaalin. **Kysyntä on kyvykkyysvaje; TalentMaster on sen käyttöliittymä.**

---

### Liittyvät dokumentit
BP1 (markkinatarve) · BP3 (IPR, seuraava) · BP4 (ansaintamalli + GTM) · BP5 (Financial Plan). Tekninen: CLAUDE.md, TEKNINEN_YLEISKUVA.md, YKSINKEHITTAJAN_TOIMINTASUUNNITELMA.md. GDPR: GDPR_POLICY_PLAN.md, TIETOSUOJASELOSTE_LUONNOS.md. Hinnoittelu/sopimus: HINNOITTELU_LASKUTUS.md, SIBBO_PILOTTISOPIMUS.md.
