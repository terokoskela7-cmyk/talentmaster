# BP1 — Euroopan markkinatarve (konseptuaalinen kartoitus)

> **Business-suunnittelu, osa 1/5.** Markon sekvenssi: (1) **markkinatarve** → (2) Business Plan → (3) IPR → (4) ansaintamalli + GTM → (5) Financial Plan.
> Laadittu 2026-07-01. Lähdepohja: monilähteinen web-tutkimus (viisi rinnakkaista tutkimuskulmaa), lähteet linkitetty tekstiin.
> **EI juridinen eikä sijoitusneuvonta.** Markkinaluvut ovat kaupallisten tutkimustalojen estimaatteja — käytetty suuruusluokkina, ei tarkkoina arvoina. Bottom-up-luvut tarkennettava alkuperäislähteistä ennen sijoittajadekkiä (merkitty **[TARKENNA]**).
> Konteksti: hybridirahoitus (bootstrap pilottituloilla + Business Finland ei-laimentava tuki → sijoitus myöhemmin vahvuudesta), monikanava (kärki B2B: seura maksaa + perii perheiltä; lisäksi Solo B2C 4,99 €/kk; mahdollinen B2B2C liitto/akatemia), maantiede Suomi-first → Pohjoismaat → EU.

---

## 0. Tiivistelmä (yhden sivun ydin)

**Markkina on todellinen, kasvava ja kategoriana avoin.** Urheiluanalytiikan ohjelmistomarkkina on ~5–6 mrd USD (2025) ja kasvaa yli 20 % vuosivauhtia; lähin tuoteproxy (scouting/talent-ID-ohjelmistot) ~1,4–2,2 mrd USD (2024), ~14–20 % CAGR. **Mutta erillistä "nuorten kehitysseuranta-SaaS" -markkinaa ei ole vielä mitattu** — tämä on samaan aikaan datapuute ja positiointimahdollisuus (kategorian luonti).

**Tarve on kyvykkyysvaje.** Liitot ja akatemiat *haluavat* dataohjattua, kypsyys- ja RAE-korjattua talenttiarviointia, mutta valtaosalla (erityisesti eliittitason alapuolella) ei ole sisäistä analytiikkaosaamista eikä yhteistä mittaristoa. SaaS, joka muuntaa raakatestit normalisoiduiksi, kypsyystietoisiksi indekseiksi, myy suoraan tähän aukkoon.

**TalentMasterin neljä erottautujaa osuvat neljään todistettuun, huonosti palveltuun tarpeeseen:**
1. **RAE-korjaus** — suhteellinen ikävinouma on empiirisesti pysyvä (huippuliigoissa Q1 30,3 % vs. Q4 20,5 %, 2023–24) ja *itsensä kumoava* (myöhäissyntyiset selviytyjät pärjäävät urallaan paremmin) — mutta **yksikään tutkittu kaupallinen alusta ei rakenna RAE-korjausta pisteytykseensä**.
2. **Biologinen ikä / PHV** — kypsyysvinouma on vakava (U15/U16-valinnoista 0 % myöhäiskypsyjiä; *kaikki* top-5-liigan urat myöhäiskypsyjä-ryhmästä) ja bio-banding on FIFA:n ja liittojen (Premier League EPPP, Scottish FA) tukema korjaava käytäntö — mutta **ei ole edullista SaaS:ää, joka laskee kypsyysstatuksen (Mirwald/Khamis-Roche) tavallisille seuroille**.
3. **Lapsiturvallinen perhemuotoilu** — jalkapallon dropout on korkea (tytöt 26,8 %, pojat 21,4 %) ja vertailu/vanhempien paine ovat johtavia syitä — mutta **jokainen vakava alusta on valmentaja-/seura-/scout-lähtöinen**, ei lapsi ensin.
4. **Pelaajan omistama "urheilijan digitaalinen passi"** — kehityshistoria katoaa seuranvaihdossa; FIFA:n virallinen passi kattaa vain rekisteröinnin/korvaukset, ei kehitysdataa — **kukaan ei toimita kannettavaa, pelaajan omistamaa kehityskorttia, joka säilyy seuranvaihdon yli.**

**Hinnoittelun ankkurit ovat kunnossa.** Solo 4,99 €/kk on aggressiivisen matala vs. kuluttajaverrokit (9,99–25 $/kk) ja <5 % perheen vuosikuluista (Suomessa ~2 600 €/v kilpajalkapallo). B2B-perusmaksu 50 €/kk asettuu järkevästi Nimenhuudon ja Sportlyzerin väliin. **Yksi stressitestattava luku: 2,5 €/aktiivipelaaja/kk** — ruohonjuuritasolla se on ~13× MyClubin ankkuri; sopii paremmin akatemia-/talenttitasoksi kuin grassroots-oletukseksi (ks. §6).

**Suomi on kova, houkutteleva beachhead:** 167 325 rekisteröityä (2024, ennätys), ~1 000 seuraa, jalkapallo Suomen suurin joukkuelaji → hyvin määritelty, tavoitettava SAM, jonka perustajan liittorooli tekee uskottavaksi.

---

## 1. Markkinan koko — TAM / SAM / SOM

### 1.1 Ylätason konteksti (top-down, kaupalliset estimaatit)

> ⚠️ Tutkimustalojen luvut vaihtelevat 2–5× "saman" markkinan välillä. Käytä vaihteluvälejä + useaa lähdettä, älä yksittäistä pistelukua.

| Markkina | Koko | Kasvu (CAGR) | Lähde |
|---|---|---|---|
| Urheiluteknologia (laaja: HW+SW+palvelut) | 18,7–34 mrd USD (2024–25) → 61–83 mrd (2030–32) | ~15–22 % | [MarketsandMarkets](https://www.marketsandmarkets.com/Market-Reports/sports-technology-market-104958738.html) · [SNS Insider](https://www.snsinsider.com/reports/sports-technology-market-2356) |
| **Urheiluanalytiikka (lähin SW-emämarkkina)** | **~5,5–5,8 mrd USD (2025)** → 24–30 mrd (2032–34) | **~20–22 %** | [Fortune Business Insights](https://www.fortunebusinessinsights.com/sports-analytics-market-102217) · [Precedence Research](https://www.precedenceresearch.com/sports-analytics-market) |
| — josta ohjelmisto-osuus | ~62 % markkinasta (2024) | — | Fortune Business Insights |
| — "performance analysis & prediction" | >25 % käyttötapausosuus (2025) | — | (suoraan talent-ID/kehitys-adjakenssi) |
| Sports management SW (hallinto/roster) | 11,6 mrd USD (2024) → 19,3 mrd (2034) | ~5,2 % | [Market Research Future](https://www.marketresearchfuture.com/reports/sports-management-software-market-26526) |

**Tulkinta:** kasvava emämarkkina (analytiikka, +20 %) on todellinen; hitaampi "management"-markkina (+5 %) on hallinto-, ei performance-vetoinen — TalentMaster kuuluu nopeaan performance-/analytiikkapuoleen.

### 1.2 Lähin tuoteproxy: scouting/talent-ID-ohjelmistot

| Markkina | Koko | CAGR | Lähde |
|---|---|---|---|
| Scouting software (laaja) | 2,2 mrd USD (2024) → 8 mrd (2032) | ~20 % | [FutureDataStats](https://www.futuredatastats.com/scouting-software-market) |
| Sports scouting software (kapea) | 1,42 mrd USD (2024) → 4,13 mrd (2033) | 13,8 % | [Dataintelo](https://dataintelo.com/report/sports-scouting-software-market) |
| Football analysis software | ~522 M USD (2024) → ~1,18 mrd (2032) | ~12 % | [IntelMarketResearch](https://www.intelmarketresearch.com/Global-Football-Analysis%20-922) |

**Kriittinen huomio:** scouting-markkina yliedustaa *eliittirekrytointia* (proseurat etsivät lahjakkuuksia), kun taas TalentMaster on *kehitysseurantaa ruohonjuuri-/akatemianuorille* — whitespace samojen myötätuulien sisällä. CAGR (~14–20 %) on kelvollinen kasvuproxy; absoluuttinen koko **aliarvioi** TalentMasterin segmentin, koska grassroots-kehitystyökaluja tuskin lasketaan vielä mukaan.

### 1.3 Bottom-up-ankkurit (kovaa dataa)

**Suomi — Suomen Palloliitto:**
- **167 325 rekisteröityä pelaajaa + erotuomaria (marras 2024)** — ennätys; jalkapallo Suomen suurin joukkuelaji ([Palloliitto/Wikipedia](https://en.wikipedia.org/wiki/Football_Association_of_Finland)). *Luku niputtaa pelaajat + tuomarit.*
- **~1 000 jäsenseuraa.** Naispelaajia >38 000 (2022).
- Nuoriso-osuus: ei julkista ikäjakaumaa — planning-estimaatti **~55–65 % alle 18v (~90 000–110 000 nuorta)**. **[TARKENNA Palloliiton toimintakertomuksesta.]**

**Pohjoismaat:** ei yhtä konsolidoitua lukua — bottom-up per liitto (SvFF, NFF, DBU, KSÍ + Palloliitto). Estimaatti **~1,5–2 M pelaajaa, ~5 000+ seuraa**. **[TARKENNA per liitto.]**

**Eurooppa (UEFA, 55 liittoa):** 68 M katsojaa grassroots-otteluissa (2022/23, [UEFA landscape report](https://www.uefa.com/news-media/news/0285-18fa8cc305f4-17acfa3b2445-1000--new-uefa-landscape-report-shows-european-football-s-strength/)). Rekisteröityjen pelaajien autoritatiivisin lähde = **UEFA/CIES Demographic Study of Footballers in Europe** ([CIES Football Observatory](https://football-observatory.com/Demographic-profiling-of-players-clubs-and)). Planning-estimaatti **>60 M rekisteröityä, satoja tuhansia seuroja**. **[TARKENNA CIES-tutkimuksesta.]**

### 1.4 Miten TAM/SAM/SOM johdetaan (metodi dekkiä varten)

Tee **bottom-up (puolustettava)** ja ristiintarkista top-downilla.

1. **TAM (Eurooppa):** kaksi rinnakkaista laskentaa jotka ristiintarkistavat toisensa:
   - *seat-pohjainen:* UEFA-55:n nuoret pelaajat (~30–40 M est.) × vuosihinta/pelaajapaikka (Solo ~60 €/v; seura per-player vähemmän).
   - *seura-pohjainen:* Euroopan akatemiat/seurat × vuosilisenssi.
2. **SAM (Pohjoismaat + digikypsä Eurooppa):** rajaa liittoihin + markkinoihin joissa voit myydä/tukea (kieli, GDPR, liittokumppanuudet). Pohjoismaat ~1,5–2 M pelaajaa, ~5 000+ seuraa. Palloliitto-suhde tekee luvun uskottavaksi.
3. **SOM (Suomi-pilotti → 3 v):** ~1 000 seuraa, ~90–110k nuorta (est.) × realistinen penetraatio (esim. 5–15 % seuroista) × ARPU. **Live-pilotti (8+2 seuraa) antaa oikean konversio-/aktivaationimittäjän** — perustele penetraatio-% pilotin suostumus-/aktivaatiodatalla, älä käsivaralla.
4. **Top-down-tarkistus:** bottom-up-SAM:n pitäisi olla pieni, uskottava siivu (yksinumeroinen %) analytiikkaohjelmiston kasvusegmentistä. Jos bottom-up-SAM > koko scouting-markkina → tarkista oletukset.

---

## 2. Kysyntätrendit (miksi juuri nyt)

### 2.1 Data-analytiikka akatemioissa — valtavirtaistuu, mutta epätasaisesti
Vertaisarvioitu 2024-tutkimus (*Science and Medicine in Football*, [Tandfonline](https://www.tandfonline.com/doi/full/10.1080/24733938.2024.2341837)) MM-2022-liitoista + proseuroista: kyvykkyys on **heterogeenistä** — vain ~30 % liittovastaajista piti positiodatan tuloksia riittävän selkeinä; esteinä resurssit, sisäisen osaamisen puute, yhteisen mittaristotaksonomian puute. **Tämä on ydinkysyntäsignaali: halu korkea, sisäinen kyvykkyys matala → aukko jonka SaaS täyttää.** UEFA institutionalisoi dataa ([UEFA Intelligence Centre](https://www.uefa.com/development/our-support/intelligence-centre/)).

### 2.2 Bio-banding / biologinen ikä — eliitissä käytössä, leviää alaspäin
**Premier League EPPP** ajaa kausikohtaisia bio-banding-turnauksia (~12–15v, Khamis-Roche-menetelmä) — vahvin institutionaalinen esimerkki ([Premier League](https://www.premierleague.com/en/footballandcommunity/youth-development/eppp)). Bio-banding on "yhä suositumpi akatemiajalkapallossa" (pre-/circa-/post-PHV-jaottelu, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC9879534/)). Scottish FA + University of Bath käynnistivät "maailman suurimman kasvu- ja kypsyystutkimuksen" ([EurekAlert](https://www.eurekalert.org/news-releases/1093515)). FIFA julkaisee kypsyysasiantuntemusta ([FIFA Training Centre — Cumming](https://www.fifatrainingcentre.com/en/environment/science-explained/high-performance/talent-pathways/sean-cumming-on-maturation-in-youth-football.php)). **Menetelmät (Khamis-Roche, Mirwald) ovat juuri sitä, mitä pienemmiltä seuroilta puuttuu työkaluina.**

### 2.3 RAE-tietoisuus — korkea, liitot kokeilevat aktiivisesti
RAE on empiirisesti pysyvä: UEFA top-10 2023–24 Q1 30,3 % vs Q4 20,5 %; UK-akatemiat Q1 45,0 % vs Q4 9,8 % ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12398170/)). **KNVB (Alankomaat)** kokeilee neljää interventioperhettä (ikäluokkien muokkaus, kiertävät/siirretyt cut-off-päivät, ei-ikäpohjainen kategoriointi = kypsyys/bio-banding, [Frontiers/PMC 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12018424/)). US Soccer -oppitunti: **cut-off-muutokset yksin eivät vähennä RAE:ta**, vain siirtävät kenen etu — kysyntä ohjautuu *kypsyyspohjaisiin* ratkaisuihin.

### 2.4 Kuormitus-/hyvinvointiseuranta — tiede vahva, HW-portattu → SW-first on wedge
Nuorten kuormitusseuranta on "nouseva alue" (systemaattinen katsaus, [PMC 2023](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10356657/)); GPS-fleettien kustannus + tulkintaosaaminen ovat esteitä → **subjektiivinen/RPE- ja hyvinvointipohjainen seuranta on saavutettava sisäänmeno** ei-eliittiseuroille.

### 2.5 Lapsidatan suoja + GDPR — kysyntää kiihdyttävä, ei vain rajoite
Sääntely tiukkenee 2024–2025 (privacy-by-default lapsille, ikäverifiointi, dokumentoitu vanhempien suostumus, biometriikan tiukemmat säännöt; sakot 20 M € / 4 % liikevaihdosta). ICO valvoo aktiivisesti alaikäisten dataa ([ICO Children's Code](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/protecting-childrens-privacy-online-our-childrens-code-strategy/children-s-code-strategy-progress-update-december-2025/)). **Terveysdata (bio-ikä, hyvinvointi) on korkeimman herkkyyden Art. 9 -kategoriassa + lapsikohtainen regiimi → tuplariski.** Seurat *eivät kykene* itse rakentamaan compliant-järjestelmiä → **GDPR on samaan aikaan este ja erottautuja** (sisäänrakennettu suostumushallinta, roolipohjainen pääsy, retention, audit = compliance-oikotie jonka he ostavat).

**Mitä trendit tarkoittavat kysynnälle:**
- Kyvykkyysvaje **on** markkina — SaaS joka muuntaa raakatestit kypsyystietoisiksi indekseiksi myy suoraan aukkoon.
- Bio-age + RAE-korjaus siirtyvät "eliitin edusta" "odotetuksi käytännöksi".
- Nuorten kuormitus-/hyvinvointiseuranta on validoitu mutta HW-portattu → SW-/RPE-first on saavutettava wedge.
- GDPR-/lapsidatapaine on kysyntäkiihdytin — itse rakennetuista seuraratkaisuista tulee vastuu.

---

## 3. Kilpailukenttä (nimetyt toimijat)

| Toimija | Mitä | Kenelle | Hinta (julkinen) | Nuoriso/bio-age/RAE/perhe? |
|---|---|---|---|---|
| **MyE.Way (Eerikkilä/Palloilu-säätiö, FI)** | E-oppiminen + kehitysseuranta, Palloliiton pelaajapolku (10–17v) | liitto/valmentaja/johto | ei julkinen | **Nuorisofokus ✓** mutta instituutiovetoinen, ei perhe/lapsi ensin, ei näkyvää RAE/bio-age-logiikkaa. **Suomalainen inkumbentti + lähin metodologinen naapuri.** |
| **Hudl / InStat / Wyscout** | Video + analyysi + scouting-tietokanta | koulut→proseurat, scoutit | Hudl club 400–1 600 $/joukkue/v; Wyscout 299–399 €/v | Video/rekrytointivetoinen, ei kypsyys/perhe |
| **Playermaker** | Kenkäsensori, tekniset metriikat (≥8v) | grassroots→huippuakatemiat | tiered, ei julkinen | **Nuorisoystävällinen ✓** mutta HW joka mittaa teknistä *outputtia*, ei kypsyys/RAE/passi |
| **Kitman Labs** | Enterprise AMS + Talent Development -moduuli | liigat/liitot/akatemiat (eliitti) | custom (esim. 174,3k $ US-tilaus) | **Tieteellisesti syvin talent-dev-kilpailija**, mutta enterprise-hintainen, instituutio-omisteinen. Ajaa Premier Leaguen keskitettyä alustaa. |
| **TeamBuildr** | S&C-ohjelmointi/AMS | S&C-valmentajat | 90–280 $/kk | Kuormitus/kuntosali, ei talent-ID/kypsyys |
| **Zone7** | AI-loukkaantumisriski | 50+ eliittiseuraa | custom | Puhtaasti eliitti-injury, ei nuorisokehitys |
| **Sportlyzer (EE)** | Kehitys + seurahallinta nuoriso/amatööri | nuorisoseurat + **vanhemmat** | ~53 €/kk (126–150 pel.); 1 000 €/v (1–25) | **Lähin yleisö ✓** mutta ei bio-age/RAE/passi; management-työkalu |
| **PlayerData** | GPS/IMU-wearable | grassroots→pro | ~£8/pelaaja/kk | Fyysinen kuorma-HW, ei talent-ID/kypsyys |
| **iSportsAnalysis** | Edullinen videoanalyysi | koulut/seurat/liitot | budjetti, ei eritelty | Analyysityökalu, ei kehitys/perhe |
| **The FA England DNA / Football DNA** | Valmennusfilosofia/curriculum | valmentajat | sisältöpalvelu | Curriculum, ei mittaus/kypsyys/perhedata |

*Adjakentit: skills.lab Arena (lab-mittaus/ID), VALD (normidata), aiScout/ai.io (AI-itsescouting), JOGO. "The Sporting Lab" — ei merkittävää julkista jalanjälkeä → ei materiaalinen uhka.*

**Whitespace-johtopäätös:** markkina jakautuu (a) eliittiprotyökaluihin (Wyscout/Kitman/Zone7 — kalliita, rekrytointi/injury, ei nuorisokehityssielua), (b) HW-wearableihin (Playermaker/PlayerData — mittaavat outputtia, ei kypsyyskontekstia), (c) video/analyysiin (Hudl/iSports), (d) nuorisoseurahallintaan (Sportlyzer/MyE.Way — lähin yleisö, mutta ei bio-age/RAE/passi-kerrosta). **Leikkauspiste nuorisokehitys + kypsyys/RAE-korjaus + lapsiturvallinen perhemuotoilu + pelaajan omistama seurojen-yli-passi on tyhjä.** MyE.Way + Sportlyzer = yleisöpäällekkäisyyden seurattavat; Kitman = ainoa jolla on tieteellinen syvyys tulla tähän tilaan jos haluaisi laskeutua alaspäin.

---

## 4. Todistetut aukot ↔ TalentMasterin erottautujat

1. **RAE-korjaus (käytännössä palvelematon).** Q1 30,3 % vs Q4 20,5 % huippuliigoissa; myöhäissyntyinen selviytyjä kerää *enemmän* prouraminuutteja — RAE **kääntyy** urasuorituksessa ([J. Sports Sciences 2024](https://pubmed.ncbi.nlm.nih.gov/39607339/)). "Fyysinen etu nyt ≠ lahjakkuus myöhemmin." Yksikään kaupallinen alusta ei rakenna RAE-korjausta pisteytykseen.
2. **Biologinen ikä / kypsyys (tutkimusaihe, ei tuoteominaisuus).** U15/U16-valinnoista **0 % myöhäiskypsyjiä**; myöhäiskypsyjät ~15 % väestöstä mutta vain 1–2 % akatemiapelaajista ([FIFA/Cumming](https://www.fifatrainingcentre.com/en/environment/science-explained/high-performance/talent-pathways/sean-cumming-on-maturation-in-youth-football.php)); 2025-uratutkimuksessa *kaikki* top-5-liigan urat myöhäiskypsyjä-ryhmästä ([MDPI 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12101215/)). Ei saavutettavaa SaaS:ää joka laskee kypsyysstatuksen ja kehystää *jokaisen* mittarin sen ympärille.
3. **Lapsikeskeinen kehitys (rakenteellinen sokea piste).** Dropout tytöt 26,8 % / pojat 21,4 % ([PMC](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8801566/)); entiset pelaajat halusivat useammin lopettaa (21 % vs 9 %) ja kokivat vertailua muihin (18 % vs 13 %, [Project Play](https://projectplay.org/news/aspen-institute-national-survey-of-youth-and-sports-15-key-findings)). Jokainen vakava alusta on valmentaja/scout-lähtöinen; ei "lapsi ensin" -muotoilua ilman vertailua/ranking-lukuja.
4. **Pelaajan omistama seurojen-yli-passi (selkein tyhjä tila).** "Kun pelaaja vaihtaa seuraa, kehityshistoria katoaa" on eksplisiittinen grassroots-kipupiste; FIFA:n Electronic Player Passport kattaa vain rekisteröinnin/korvaukset ikävuodesta 12, **ei** teknistä/fyysistä/kypsyysprofiilia ([FIFA EPP](https://inside.fifa.com/transfer-system/clearing-house/epp-process)). Athlete data sovereignty on avoin oikeudellinen kysymys ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12745375/)). TalentMasterin Solo "Player™" + PlayerCode-silta on maastossa jota kukaan muu ei miehitä.

---

## 5. Maksuhalukkuus segmenteittäin

### (a) Liitot & eliittiakatemiat — kuusinumeroiset budjetit, opaakki hinnoittelu
Catapult keskimääräinen sopimusarvo ~26,8k $ (~25k €) ([investoripresentaatio](https://www.catapult.com/wp-content/uploads/2025/01/20241203-3-December-2024-Investor-Presentation-web.pdf)); Kitman 174,3k $ US-tilaus; Smartabase 65+ olympialiitossa. Per-player-ankkurit: Catapult 180 $/pelaaja/v, PlayerData ~110 €/pelaaja/v. **Ankkuroi liittotaso per-player-in-programme -talouteen, älä opaakkeihin "20–40k €"-blogilukuihin.**

### (b) Ruohonjuuri- & kilpaseurat — tiukat katot, inkumbentti-ankkurit
- **MyClub** (Suomen jalkapallon inkumbentti — HJK, Honka): Bronze 6 €/50 jäsentä/kk, **Silver 9,10 €/50 jäsentä/kk**, Gold 450 €/kk (alv 0 %) ([myclub.fi](https://www.myclub.fi/hinnoittelu/)).
- **Nimenhuuto:** Pro 8 €/joukkue/kk. **Spond:** ilmainen ydin + 2,5 % maksutransaktiot. **Sportlyzer:** kehitys/testaus *maksullisessa* tasossa (1 000 €/v, 1–25 pel.) — **validoi arvioinnin premium-lisämyyntinä.**
- Perheiden todelliset maksut (seuran budjetin konteksti): jäsenmaksu 20–55 €/v + kuukausimaksu ~46–72 €/kk. Ylöjärven Ilves (TM-pilottiseura) P2012 72 €/kk. FC Honka listaa "myClub + muut järjestelmät" maksujen kattamaksi.
- Hintaherkkyys: kilpajuniorijalkapallo nousi 2 125 €/v (2015) → ~2 595 €/v (2023) ([Palloliitto](https://www.palloliitto.fi/harrastamisen-hinta)).

### (c) Perheet suoraan (B2C) — verrokit 9,99–25 $/kk
Techne Futbol 9,99 $/kk (~9,20 €); DribbleUp 19,99 $/kk; Trace 25 $/kk tai 180 $/v; MOJO 59,99 $/v. **Kuluttajakuvio: perheurheilusovellukset klusteroituvat 5,99–19,99 $/kk ja 60–300 $/v; kaikki työntävät vuosihinnoittelua.** Signaalit: 32 % vanhemmista maksaisi mieluiten lisää paremmasta seurateknologiasta; 82 % odottaa paljon, vain 44 % tyytyväisiä ([PlayMetrics](https://home.playmetrics.com/parent-expectations-study)). Suomessa lasten harrastukset keskimäärin ~97 €/kk (~1 160 €/v, [OP-media](https://www.op-media.fi/hyvinvointi/maksaisitko-lapsen-harrastuksesta-yli-tonnin-vuodessa-moni-maksaa-ja-tonni-on-viela-edullinen-hinta/)).

---

## 6. Verdikti TalentMasterin hinnoittelusta

| Segmentti | Markkina-ankkurit | TM-hinta | Verdikti |
|---|---|---|---|
| **B2B seura** | MyClub Silver 9,10 €/50 jäs/kk; Sportlyzer 1 000 €/v; Nimenhuuto 8 €/joukkue/kk; PlayerData ~110 €/pelaaja/v | **50 €/kk + 2,5 €/pelaaja/kk** | **Perusmaksu hyvin ankkuroitu** (~600 €/v, Nimenhuudon ja Sportlyzerin välissä). **Per-player on riski:** 2,5 €/pelaaja/kk = 125 €/kk 50 pelaajalle = >13× MyClub. Sopii **akatemia-/talenttitasoksi**, ei grassroots-oletukseksi — ellei kehitysarvoa jota MyClub/Spond eivät anna perustella selvästi. Harkitse per-player talenttitason vipuna. |
| **B2C Solo** | Techne 9,99 $/kk; kuluttajaklusteri 60–300 $/v | **4,99 €/kk (~60 €/v)** | **Hyvin ankkuroitu, tarkoituksella aggressiivinen.** Alle jokaisen suoran verrokin; <5 % perheen 1 000–2 600 €/v urheilukuluista. **Suositus: johda vuosihinnalla (~49–59 €/v)** — verrokit työntävät vuosimallia retentioon; 4,99 €/kk = kalliimpi mukavuustaso. Varaa nostaa myöhemmin. |
| **Liitto/akatemia** | Catapult ~25k € ACV; Kitman 174k $; 65+ olympialiittoa | (ei vielä hinnoiteltu) | Markkina tukee **viisi–kuusinumeroisia vuosilisenssejä**, mutta suhdemyytyjä/quote-only. Ankkuroi per-player-in-programme -talouteen. Perustajan liittorooli = uskottavuusetu tähän kanavaan. |

**Bottom line:** B2C 4,99 €/kk on hyvin ankkuroitu ja sopivan aggressiivinen. B2B 50 €/kk perusmaksu uskottava. **Ainoa stressitestattava luku on 2,5 €/aktiivipelaaja/kk** — grassroots-mittakaavassa se törmää MyClubin ~9 €/50-jäsen-ankkuriin; istuu paremmin akatemia-/talenttitasona. Nykyinen Sibbo-malli (50 €/kk + 2,5 €/kk/aktiivipelaaja, seura perii perheiltä) on linjassa — vahvista arvo­lupaus per-player-osuudelle.

---

## 7. Johtopäätökset → seuraavat toimitukset

1. **Markkinatarve on validoitu:** kasvava emämarkkina + mitattava kyvykkyysvaje + neljä todistettua aukkoa jotka osuvat suoraan erottautujiin. Kategoria ("nuorten pelaajan kehityspassi") on avoin → sekä riski (kategorian luonti) että etu (ei suoraa kilpailijaa leikkauspisteessä).
2. **Beachhead on oikea:** Suomi (167k rekisteröityä, ~1 000 seuraa, perustajan liittorooli) → Pohjoismaat (~1,5–2 M) → EU (>60 M).
3. **Hinnoittelu kestää** yhtä stressitestattavaa lukua lukuun ottamatta (per-player-taso).
4. **[TARKENNA] ennen sijoittajadekkiä:** CIES/UEFA-demografiatutkimus (Euroopan tarkat luvut), Palloliiton toimintakertomus (Suomen U18-jakauma), Pohjoismaiden liittotilastot. Nämä muuttavat estimaatit kovaksi dataksi.

**Syöte seuraaviin:** BP2 (Business Plan) käyttää §1 markkinakokoa + §5–6 hinnoittelua liikevaihtomalliin; BP4 (ansaintamalli + GTM) rakentaa §3 kilpailu-whitespacen + §6 verdiktin päälle; BP5 (Financial Plan) käyttää §5–6 ARPU-ankkureita + §1.4 SOM-metodia.

---

### Lähdeluettelo (keskeiset)
Markkinakoko: MarketsandMarkets, Fortune Business Insights, Precedence Research, SNS Insider, FutureDataStats, Dataintelo, IntelMarketResearch (2024–25) · Palloliitto, UEFA landscape/grassroots, UEFA/CIES demographic study.
Trendit: *Science & Medicine in Football* 2024 (Tandfonline/PubMed) · UEFA Intelligence Centre · Premier League EPPP · KNVB RAE (Frontiers/PMC) · FIFA Training Centre (Cumming) · PMC bio-banding & load-monitoring reviews · ICO Children's Code · GDPR-advisory (Didomi, WSGR).
Kilpailu: eerikkila.fi/myeway, hudl.com, playermaker.com, kitmanlabs.com, teambuildr.com, zone7.ai, sportlyzer.com, playerdata.com, thefa.com.
Aukot: PMC (RAE top-10 leagues, career inversion, biological maturation career trajectory), FIFA EPP, Project Play, Aspen Institute, PMC athlete data sovereignty.
Maksuhalukkuus: Catapult investor deck, Kitman/HigherGov, myclub.fi, nimenhuuto.com, spond, sportlyzer.com, Palloliitto harrastamisen hinta, technefutbol.com, PlayMetrics, Project Play, OP-media.

*Kaikki URL:t linkitetty tekstissä. Vahvuus: korkea trendeissä (b–e) ja aukoissa (vertaisarvioitu/virallinen). Matalampi/merkitty: markkinakokoluvut (vendor-estimaatit), jotkin liittokohtaiset bio-banding-mandaatit (vahvistamatta).*
