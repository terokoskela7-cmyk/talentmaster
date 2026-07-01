# BP4 — Ansaintamalli + Go-To-Market (KÄRKI)

> **Business-suunnittelu, osa 4/5.** Markon tunnistama **heikoin lenkki: kuka maksaa, miksi, ja miten.** Tämä doc vastaa siihen konkreettisesti.
> Laadittu 2026-07-01. Rakentuu: BP1 (markkinatarve + maksuhalukkuus §5–6), BP2 (liiketoimintamalli). Luvut BP5:ssä. **EI sijoitusneuvonta.**
> Konteksti: monikanava, kärki B2B (seura maksaa + perii perheiltä), lisäksi Solo B2C 4,99 €/kk. Maantiede Suomi-first → Pohjoismaat → EU.

---

## 0. Ydinvastaus heikoimpaan lenkkiin

**Kuka maksaa?** Ensisijaisesti **seura** (B2B) — ja siirtää kustannuksen perheille jäsenmaksun osana. Toissijaisesti **perhe suoraan** (Solo B2C). Kolmanneksi **liitto/akatemia** (B2B2C, iso sopimus).

**Miksi maksaa?** Jokaisella maksajalla on eri ostoperuste (ks. §2). Seura ostaa **kilpailuedun + GDPR-suojan + perheiden pysyvyyden**; perhe ostaa **lapsen kehityksen näkyvyyden turvallisesti**; liitto ostaa **kansallisen kehityskuvan + polkuvahvistuksen**.

**Miten maksaa?** Seura: koostettu kuukausilasku (50 €/kk + 2,5 €/aktiivipelaaja), seura perii perheiltä. Perhe (Solo): suoraveloitus/kortti, vuosihinta johtavana. Liitto: vuosilisenssi, per-player-in-programme.

**Miten myydään?** Beachhead = Suomen pilottiseurat → referenssitulokset → seuralta seuralle + liittokanava → Pohjoismaat. Solo skaalaa itsepalveluna perheille PlayerCode-sillan kautta.

---

## 1. Ansaintamalli — kolme tulovirtaa

### 1.1 B2B Club (kärki, ~70–80 % tavoiteliikevaihdosta)
| Erä | Hinta | Logiikka |
|---|---|---|
| Seuralisenssi | 50 €/kk (alv 0 %) | Kiinteä pohja, kattaa alustan; ankkuroitu Nimenhuuto↔Sportlyzer-väliin |
| Aktiivipelaajamaksu | 2,5 €/kk/aktiivipelaaja | Skaalautuu käytön mukaan; **paras akatemia-/talenttitasona** (ks. §5 riski) |

**Laskutus:** koostettu kuukausilasku seuralle; seura perii perheiltä jäsenmaksun osana. **Aktiivipelaaja** = voimassa oleva huoltajan suostumus + aktiivinen joukkue; laskenta kk:n lopun tilanteesta.

### 1.2 B2C Solo (skaalautuva pitkä häntä)
- **4,99 €/kk tai ~49–59 €/v** (johda vuosihinnalla — verrokit työntävät vuosimallia retentioon).
- Perhe maksaa suoraan; itsepalvelu-onboarding; **PlayerCode-silta** → data valuu seuralle jos pelaaja jakaa.
- Alle jokaisen kuluttajaverrokin (Techne 9,99 $, Trace 25 $) → aggressiivinen adoptiohinta, varaa nostaa.

### 1.3 B2B2C Liitto/akatemia (iso sopimus, korkea uskottavuus)
- Custom vuosilisenssi (viisi–kuusinumeroinen), ankkuroitu **per-player-in-programme** -talouteen (vrt. Catapult 180 $/pelaaja, PlayerData ~110 €/pelaaja).
- Perustajan liittorooli = suora pääsy + uskottavuus. Tämä kanava voi validoida koko kategorian nopeasti.

**Miksi monikanava toimii yhdessä:** rekisterinpitäjä-malli (Malli A) mahdollistaa saman datan + passin kaikissa kanavissa ilman per-seura-DPA:ita → kanavat ruokkivat toisiaan (seurapelaaja voi jatkaa Solona, Solo-perhe tuo seuran mukaan).

---

## 2. Kuka maksaa & miksi — ostoperuste per maksaja

### 2.1 Seura (B2B — ensisijainen maksaja)
**Kuka päättää:** valmennuspäällikkö (VP) / seuran johto. **Budjetti:** seuralla on jo digibudjetti (MyClub ~9 €/50 jäs, Nimenhuuto, Jopox).

**Miksi ostaa (3 vipua):**
1. **Kilpailuetu talentissa** — kypsyys/RAE-korjattu arviointi löytää lahjakkuudet joita muut hukkaavat (myöhäiskypsyjät); seura pitää pelaajat joita muuten menettäisi.
2. **GDPR-suoja ilman taakkaa** — TM rekisterinpitäjänä → seuran ei tarvitse tehdä DPIA:ta alaikäisten terveysdatasta, pyörittää suostumusprosesseja eikä ottaa juridista vastuuta. **Useimmat seurat huokaisevat helpotuksesta** (ei resursseja/osaamista).
3. **Perheiden pysyvyys + arvo** — perhenäkymä + turvallinen kehitysseuranta vähentää dropoutia (perhe kokee saavansa vastinetta jäsenmaksulle) → seuran retentio paranee.

**Miksi maksuhalukkuus riittää:** kustannus siirtyy perheille (2,5 €/pelaaja ≈ kahvikupin hinta/kk jäsenmaksussa); seura ei kanna nettokustannusta, saa kilpailuedun + GDPR-suojan "ilmaiseksi".

### 2.2 Perhe (B2C Solo — ja B2B:n lopullinen maksaja)
**Kuka päättää:** vanhempi. **Konteksti:** Suomessa perhe maksaa jo ~1 000–2 600 €/v lapsen jalkapallosta; 32 % maksaisi mieluiten lisää paremmasta seurateknologiasta; 82 % odottaa paljon, vain 44 % tyytyväisiä (BP1 §5c).

**Miksi ostaa:** näkee lapsen kehityksen **turvallisesti** (ei vertailua, ei painostusta), saa "miten tukea" -ohjeet, lapsen oma FIFA-kortti + keräilykortit motivoivat. 4,99 €/kk = <5 % vuosikuluista → helppo lisäosto.

### 2.3 Liitto/akatemia (B2B2C)
**Kuka päättää:** liiton kehitysjohto / akatemian johtaja. **Miksi ostaa:** kansallinen/akatemiatason kehityskuva, polkuvahvistus, normalisoitu kypsyystietoinen data. Perustajan liittorooli tekee tästä lämpimän kanavan.

---

## 3. Go-To-Market — vaiheittainen liike

### Vaihe 0 (nyt) — Pilotti → referenssi
- 8+2 pilottiseuraa live; ~500+ pelaajaa. **Tehtävä:** muunna pilotit *maksaviksi referensseiksi* — kerää konversio-/aktivaatiodata (suostumus-% → go-live), kerää seuran/valmentajan/perheen palaute + tarina.
- **Portti maksulliseen:** Sibbo-malli (50 €/kk + 2,5 €/aktiivipelaaja pilotin jälkeen) — pilotti maksuton pelaajamaksun osalta, jatko maksullinen.
- **KPI:** ≥1 seura konvertoituu maksavaksi + ≥3 seuran referenssitarina.

### Vaihe 1 (0–12 kk) — Suomi-beachhead
- **Myyntiliike:** seuralta seuralle (referenssivetoinen) + liittokanava (perustajan verkosto). Kohde: Suomen ~1 000 seurasta digikypsimmät kilpa-/akatemiaseurat.
- **Solo-käynnistys:** avaa B2C perheille (itsepalvelu, matala hinta), PlayerCode-silta pilottiseuroista.
- **KPI:** X maksavaa seuraa, Y Solo-tilausta, retentio, NPS. **[TARKENNA tavoitteet BP5:ssä.]**

### Vaihe 2 (12–24 kk) — Pohjoismaat + liittokanava
- Lokalisointi (ruotsi valmis, norja/tanska), Pohjoismaiden liitto-/seurakontaktit.
- Liitto/akatemia-sopimus (iso referenssi) → validoi kategorian.
- **KPI:** ensimmäinen Pohjoismaa-seura + liittosopimus; sijoituskierros vahvuudesta.

### Vaihe 3 (24 kk+) — EU-skaalaus
- Kategorian johtajuus ("nuorten pelaajan kehityspassi"); Solo B2C skaalaus EU-laajuisesti; API/white-label.

---

## 4. Myyntisuppilo ja kanavataktiikat

| Vaihe | B2B (seura) | B2C (Solo) |
|---|---|---|
| **Tietoisuus** | Liittokanava, referenssitarinat, valmennuspäällikkö-verkosto, jalkapallotapahtumat | PlayerCode-silta seuroista, sisältömarkkinointi (RAE/bio-age -tiede), app-storet |
| **Kiinnostus** | Demo (demotili), pilottitarjous, "GDPR-taakka pois" -viesti | Ilmainen kokeilu, lapsen FIFA-kortti -koukku |
| **Päätös** | Pilottisopimus → maksullinen jatko | Vuositilaus (johtava) |
| **Käyttöönotto** | VP-koulutus, Excel-tuonti, suostumusflow | Itsepalvelu-onboarding |
| **Laajennus** | Lisäjoukkueet, talenttitaso, per-player | Perhe suosittelee seuraa; seura ottaa Clubin |

**Kärkiviesti seuralle (Markon "miksi"):** *"Löydä lahjakkuudet jotka muut hukkaavat — ja anna GDPR-vastuu meille."*
**Kärkiviesti perheelle:** *"Näe lapsesi kehitys turvallisesti — ilman vertailua, ilman painetta."*

---

## 5. Hinnoittelun kriittinen riski + ratkaisu

**Riski:** 2,5 €/aktiivipelaaja/kk = 125 €/kk 50 pelaajalle = **>13× MyClubin** ~9 €/50-jäsen-ankkuri (BP1 §6). Ruohonjuuritasolla tämä voi hinnoitella ulos vapaaehtoisvetoiset seurat.

**Ratkaisu — porrastettu per-player:**
- **Grassroots-taso:** perusmaksu 50 €/kk kattaa perustoiminnot (kevyt kehitysseuranta) — **matala per-player tai sisältyvä pelaajakiintiö**.
- **Talentti-/akatemiataso:** täysi kypsyys/RAE-analytiikka + syvänäkymät → **2,5 €/pelaaja/kk** perustellusti (arvo jota MyClub/Spond eivät anna).
- **Peruste:** per-player myydään *lisäarvosta* (bio-age, RAE, passi), ei perushallinnosta. Näin vältetään törmäys inkumbenttiin ja hinta seuraa arvoa.

**Solo:** johda vuosihinnalla (~49–59 €/v), 4,99 €/kk mukavuustasona. Varaa nostaa kun arvo todistettu.

---

## 6. Mittarit (GTM-terveys)
- **B2B:** maksavat seurat, pilotti→maksu-konversio, per-seura ARPU, aktiivipelaaja-kertymä, seura-churn, VP-NPS.
- **B2C:** Solo-tilaukset, kokeilu→maksu-konversio, vuosi vs kk -jakauma, churn, PlayerCode-sillan käyttö.
- **Kanava:** referenssien tuottamat liidit, liittokanavan sopimukset.
- **Pohjoismainen erottautuja (myöhempi):** läsnäolo→kuorma→dropout-signaali (K5-kalenteri) = ainutlaatuinen retentioarvo.
- **[TARKENNA numerotavoitteet BP5:ssä.]**

---

## 7. Miksi tämä ei ole enää "heikoin lenkki"
1. **Kuka maksaa** on selvä ja kolmiportainen — jokaisella oma budjetti + ostoperuste.
2. **Miksi** on eriytetty maksajittain (seura: etu+GDPR+pysyvyys; perhe: turvallinen näkyvyys; liitto: kehityskuva) — ei "yksi viesti kaikille".
3. **Miten** on konkreettinen (koostettu lasku + perintä perheiltä; Solo suoraveloitus; liitto vuosilisenssi) ja **teknisesti jo tuettu** (nykyinen Sibbo-malli toimii näin).
4. **Riski tunnistettu ja ratkaistu** (per-player porrastus).
5. **Kanava on olemassa** (perustajan liittoasema + live-pilotit) — ei kylmää starttia.

---

## 8. Kansainvälinen hinnoittelu — segmentti, ei maa (2026-07-01 tutkimus)

> Lähdepohja: web-tutkimus keskeisistä jalkapallomarkkinoista (ENG/DE/ES/FR/IT/NL + Pohjoismaat, 2023–25). Lähteet linkitetty.

### 8.1 Vastaväite intuitiolle: perheiden maksukyky ei ole korkeampi ulkomailla
**Suomi on perhemaksujen poikkeus (korkea), ei sääntö.** Ruohonjuuritason perhemaksut/v: Saksa **30–120 €** ([advance.football](https://www.advance.football/jugendfussball-blog/mitgliedsbeitrage-im-fussballverein)), Englanti **~120–360 €** ([Striver](https://striver.football/the-pathway/parents-guide-grassroots-football-uk)), Alankomaat **135–163 €** ([NMC Bright benchmark](https://www.nmcbright.nl/wp-content/uploads/2018/08/NMC-Bright-Benchmarkrapport-Vergoedingen-Amateurvoetbal-2023-2024-vDef.pdf)), Ranska **200–400 €**. Vain **Italia 800–1 300 €** ([Il Fatto Quotidiano 2024](https://www.ilfattoquotidiano.it/2024/07/14/scuole-calcio-ricchi-iscrivere-costo-euro-mappa-inchiesta-crisi/7621336/)) ja **Pohjoismaat** lähestyvät Suomen ~2 600 €/v. **Eurostatin hintatasoindeksi: Suomi = EU:n 4. kallein** → ostovoimalla useimmat markkinat ovat Suomen *alapuolella* (vain DK/NO selvästi yllä).

**Johtopäätös: puhdas maakerroin perhemaksuun on pieni (±25 %) ja enimmäkseen alaspäin. Vipu on segmentti.**

### 8.2 Missä raha on: instituutiot, ei perheet
- **Proakatemiat:** Englanti EPPP **Cat 1 min £2,5 M/v budjetti** (29 seuraa 2025/26, [PFSA](https://thepfsa.co.uk/understanding-the-english-football-academy-category-system-under-the-elite-player-performance-plan-eppp/)); Saksa DFL **252 M€/v** nuoriso+naiset ([DFL Wirtschaftsreport 24/25](https://www.dfl.de/de/aktuelles/dfl-wirtschaftsreport-2024/)); Alankomaat Ajax 12,5 M€ / PSV 9 M€ (~40 M€ Eredivisie); Espanja RFEF nuoriso 10,3 M€ + La Masia ~6 M€. Nämä ostavat jo 20 k€+/v analytiikkaa.
- **Pay-to-play-residenssit (erit. Espanja):** perhe maksaa **15 000–40 000 €/pelaaja/v** (Iconic Football Academy 16 200 €/kausi, käyttää GPS+videota, [fees](https://iconicfootballacademy.com/fees)) → **koko tutkimuksen korkein maksukyky.**
- **⚠ Kilpailuvaroitus (ENG):** Premier League tarjoaa akatemioille **ilmaisen pakollisen PMA-seurantatyökalun**; Hudl Sportscode hallitsee (78,5 % valmentaja-adoptio). Proakatemioissa erottauduttava PMA:n yläpuolella/ympärillä.

### 8.3 B2C-verrokit (validoi 4,99 € pohjaksi, näyttää varan)
Anytime Soccer ~4,98 $/kk (pohja); Techne Futbol 9,99 $/kk (vakava taso) → PRO 37,99 $/kk; Techne Families 60 $/kk (5 pelaajaa); Strava ajaa **per-maa-hinnoittelua** 8–12 €/kk ([Techne](https://technefutbol.com/pricing)). **4,99 € on vakava-app-välin pohjalla → premium-markkinoissa 7,99–11,99 € kestää.**

### 8.4 Suositus — hinnoittele segmentin mukaan, säädä ±25 % ostovoimalla
**B2B per-player/kk (Suomi 2,5 €):**
| Segmentti | Ankkuri |
|---|---|
| Ruohonjuuri/kilpaseura (DE, NL, FR, ES, IT) | **1,5–2,5 €** (Suomen tasolla/alle) |
| Elite-/sertifioitu akatemia (EPPP Cat 2–3, NLZ, RJO) | **4–7 €** (1,5–3×) |
| Cat 1 / huippuakatemia (ENG, DE, NL, ES) | **8–12 €** (3–5×) tai kiinteä 500–2 000 €/v/joukkue |
| Residenssiakatemia (ES, UK private) | **10–15 €** |

**B2C Solo/kk (Suomi 4,99 €):** DK/NO **7,99–9,99 €** · SE/NL/UK **5,99–7,99 €** · IT **5,99–6,99 €** · DE/FR/ES **4,99 €** (pidä pohja).

**Rakenne:**
1. **Pääakseli = segmentti** (ruohonjuuri / elite-akatemia / residenssi / B2C-perhe) — kattaa 3–5× hajonnan.
2. **Toissijainen = 3 maantieteellistä porrasta** ±25 % modifierina: Premium (DK, NO) · Standard (SE, NL, UK, DE, FR, FI) · Value (ES, IT).
3. **Lokalisoi per maa** (Strava/Paddle; Paddle: Pohjoismaiset SaaS-asiakkaat maksavat ~28 % USA:ta enemmän), tarkista kvartaaleittain.

**⚠ Epävarmuudet:** akatemioiden ohjelmistobudjeteista ei julkisia lukuja (Hudl/Wyscout-hinnat luottamuksellisia); UK PLI estimaatti; osa akatemialuvuista media-lähteisiä; Saksan 252 M€ niputtaa naisjoukkueet. Ruohonjuuritason seurasoftan WTP on aidosti matala kaikkialla → premium pitää **instituutio- ja residenssisegmenteissä**, ei ruohonjuurivolyymissä.

### 8.5 Vaikutus GTM-järjestykseen
Suomen jälkeen kaksi eri kansainvälistä liikettä: (a) **Elite-akatemiakanava** (ENG/DE/NL/ES) korkealla per-player/enterprise-hinnalla — mutta kilpailu (PMA/Hudl) kova → myy erottautujilla (RAE/bio-age/passi); (b) **Pohjoismaat + Italia** B2C-premiumilla + ruohonjuuri-B2B lähellä Suomen mallia. **Espanjan residenssiakatemiat = korkein WTP, harkitse kohdennettua pilottia.**

---

### Liittyvät dokumentit
BP1 (maksuhalukkuus §5–6) · BP2 (liiketoimintamalli) · BP3 (IPR) · BP5 (Financial Plan — muuntaa tämän numeroiksi). Hinnoittelu/sopimus: HINNOITTELU_LASKUTUS.md, SIBBO_PILOTTISOPIMUS.md. Kanava/oppaat: OPAS_VP_JA_VALMENTAJA.md, PILOTTI_KAYTTOONOTTO_2026.md.
