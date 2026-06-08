# VP v24 Standalone → v25 Tuotanto — Jatkokehityshuomiot

> Vertailu tehty 2026-06-08. v24 standalone = design-visio (demo-data), v25 = tuotantoversio (live Firebase).
> Tämä dokumentti listaa v24:n elementit jotka puuttuvat v25:stä ja kannattaa toteuttaa.

---

## 1. TILANNE-näkymä — puuttuvat elementit

### 1.1 Kausipalkki + deadline-widget
**v24:** "Kevätkausi 01.04–30.06" + edistymäpalkki (W01→W07→W18) + "Seuraava deadline: 15.05 FLEI-välimittaus — 8 päivää · 4 joukkuetta".
**v25:** Puuttuu kokonaan.
**Prioriteetti:** 🟡 Korkea. `_laskeKausi(nyt)` on jo v25:ssä — tarvitsee vain renderöinnin + deadline-lähteen (konfiguraatio tai kalenteri).

### 1.2 KPI-paneeli "Klubin pulssi" (4 korttia sparklinella)
**v24:** Pelaajaa (142 ↑+8 vs. syksy) · FLEI RAE-korj. (68/100 ↑+2.3) · IDP-jono (1 avoinna) · Testitapahtumia (2 avointa ↑+1). Jokainen minimaalisella sparkline-trendiviivalla.
**v25:** Puuttuu kokonaan. Signaalit kattavat osan, mutta ei numeerista KPI-yhteenvetoa.
**Prioriteetti:** 🔴 Kriittinen. VP:n ensimmäinen katsaus pitäisi olla "miten meillä menee" — 4 KPI:tä riittää.
**Toteutus:** Dataa on jo ladattu `_pelaajat`-arrayyn. FLEI RAE-korjaus vaatii BQ-kvartiilikertoimet (§28). Sparkline = inline SVG polyline, ei kirjastoa.

### 1.3 Signaalien monipuolisuus
**v24:** 5+ signaalia (ADAR-kirjaus puuttuu, Hidden Gem -kynnys, IDP-ehdotus, PHV-kasvu, kalibraatio valmis) + IDP-hyväksyntäjono oikeassa reunassa (Hyväksy/Hylkää -napit).
**v25:** 1 signaali (FLEI puuttuu). S6–S9 toteutettu mutta dataa vähän.
**Prioriteetti:** 🟡 Data-riippuvainen. Signaalit syttyvät automaattisesti kun dataa kertyy. IDP-hyväksyntäjono on uusi toiminnallisuus (vaatii `idp_kausi`-alikokoelman).

### 1.4 Nominoinnit — "Tämän viikon nominoinnit"
**v24:** Hidden Gem / X-Factor / Erityistuki -kortit (pelaajan nimi, joukkue, BQ-badge, FLEI, Δ kausi, resilienssi/luovuus/sitoutuminen). VP:n hyväksyntää odottavat → kohti Head of Talent -listaa.
**v25:** Puuttuu kokonaan.
**Prioriteetti:** 🟡 Korkea (Sprint 6–7). Vaatii §28 kehitysikkunat + Hidden Gem -logiikan tuotantoversioon. Signaalikynnykset (§30): D2≥3.5 + D1≤2.5 + erotus≥1.0.

### 1.5 FLEI-muistutuswidget (vasemmassa alareunassa)
**v24:** Kiinteä amber-banneri "FLEI VÄLIMITTAUS 15.5 — 8 päivää. Varmistathan että U13 ja U15 protokollat ovat valmiina."
**v25:** Puuttuu.
**Prioriteetti:** 🟢 Matala. Samantyyppinen kuin kausipalkki-deadline — voidaan yhdistää.

### 1.6 Footer (Benchmark · Locale · GDPR)
**v24:** "vs. Eerikkilä · vs. UEFA U-Tier B · Δ+0.4" | "fi-FI · 1 234,5 · DD.MM.YYYY · UTC+3" | "Datankäsittely EU/EEA · alaikäisten tunnistetiedot anonymisoidaan kv-raporteissa".
**v25:** Puuttuu.
**Prioriteetti:** 🟢 Matala. Informatiivinen, ei toiminnallinen. Toteutetaan kv-laajennuksen yhteydessä.

---

## 2. VALMENTAJAT-näkymä — erot

### 2.1 Valmentajakorttien KPI-tiheys
**v24:** Jokaisessa kortissa: ADAR ka. + trendi (↑+0.3), HARJ/VKO (harjoituksia viikossa), VIIM.KIRJAUS (aika). "HILJAINEN"-badge kun >7 pv kirjaamatta. UEFA-lisenssitaso (A/B/C).
**v25:** VAI-luku (0), mentorointi-pallo (vihreä/punainen), sähköposti. Mentoroi/Arvioi -napit. UEFA-taso näkyy coach-modaalissa mutta ei kortissa.
**Prioriteetti:** 🟡 Korkea. ADAR/harjoitus-KPI:t ja HILJAINEN-badge ovat VP:n tärkeimpiä signaaleja valmentajien aktiivisuudesta.
**Toteutus:** VAI+ 5-komponenttinen indeksi on jo suunniteltu (§19). Korttiin lisätään: ADAR-luku, HARJ/VKO (kirjauksista), viimeinen kirjausaika, HILJAINEN-badge (>7 pv).

### 2.2 Coach-modaali (v25:n etu)
**v25:** 4-välilehtinen center-modal (Profiili/VAI+/Harjoituslaatu/Mentorointi) — toteutettu ja toimiva.
**v24:** Ei modaalia, pelkkä korttiklikkaus → profiili.
**Tila:** v25 on edellä tässä.

---

## 3. PELAAJAT-näkymä — erot

### 3.1 Suodatinchipsit (signaalipohjainen)
**v24:** Kaikki (9) · Hidden Gem (1) · X-Factor (2) · Erityistuki (2) · BQ-Underdog (3) · PHV-vaihe (4). Lukumäärät chipeissä.
**v25:** FLEI · TKI · Signaali · PHV -sarakepohjainen. Joukkuepulssin klikkaus → joukkuesyvänäkymä.
**Prioriteetti:** 🟡 Sprint 7. Hidden Gem / X-Factor / Underdog -suodattimet ovat VP:n ydintyökalu talenttinominointeihin. Vaatii §28 signaalilogiikan.

### 3.2 RAE-korjattu FLEI suluissa
**v24:** FLEI-luvun perässä suluissa RAE-korjattu arvo, esim. "71 (68)". Alaviite: "RAE = Relative Age Effect (Morganti et al. 2025)".
**v25:** RAE-korjausta ei näytetä pelaajariviltä.
**Prioriteetti:** 🟡 Sprint 6. RAE-kertoimet (Q1 0.92 · Q2 0.96 · Q3 1.02 · Q4 1.06) on jo dokumentoitu §30. Tarvitsee syntymäkuukauden → BQ-kvartiilin.

### 3.3 BQ-badge + UNDERDOG-merkki
**v24:** BQ1–BQ4 värikoodatut badget + UNDERDOG-merkki (BQ4 + senoritasolla ≥2.80).
**v25:** Ei BQ-badgeja pelaajalistassa.
**Prioriteetti:** 🟡 Sprint 6–7. BQ lasketaan syntymäkuukaudesta — vaatii `syntymaaika`-kentän (Timestamp) joka on jo rakenteessa.

---

## 4. Yleinen design

### 4.1 Topbar — hakupalkki
**v24:** "Hae pelaajaa, joukkuetta, valmentajaa" + ⌘K pikanäppäin.
**v25:** Sama haku toteutettu mutta visuaalisesti eri.
**Tila:** Molemmat OK.

### 4.2 Sivupalkin badget
**v24:** Tilanne (3), Valmentajat (1), Pelaajat (142). Teal-aksentti aktiiviselle. "TYÖKALUT" eroteltu (Arvioi harjoitus, Benchmark).
**v25:** Sama rakenne, hieman eri visuaalisesti. Benchmark puuttuu.
**Prioriteetti:** 🟢 Benchmark-työkalu (Sprint 7+).

---

## 5. Toteutusjärjestys (ehdotus)

| # | Elementti | Sprint | Riippuvuudet |
|---|---|---|---|
| 1 | KPI-paneeli (4 korttia) | 6 | `_pelaajat` jo ladattu |
| 2 | Kausipalkki + deadline | 6 | `_laskeKausi` valmis |
| 3 | RAE-korjattu FLEI | 6 | BQ-kertoimet §30 |
| 4 | Valmentajakorttien ADAR/HARJ/HILJAINEN | 6 | VAI+ §19 |
| 5 | Hidden Gem / X-Factor / Underdog -suodattimet | 7 | §28 kehitysikkunat |
| 6 | Nominoinnit-osio | 7 | Signaalilogiikka + HG |
| 7 | IDP-hyväksyntäjono | 7 | `idp_kausi` alikokoelma |
| 8 | Benchmark-työkalu | 7+ | Kv-normit |
| 9 | Footer (Locale/GDPR) | 8+ | Kv-laajennus |

---

## 6. Valmentaja KPI-kortin kansainvälinen viitekehys

> Lähde: kansainväliset arviointikehykset (ICF-kompetenssit, olympiakomiteoiden koulutusohjelmat, UEFA Pro -kriteeristöt).
> TalentMasterin VAI+ ja coach-modaali toteutetaan tämän viitekehyksen pohjalta.

### 6.1 Neljä arviointiulottuvuutta

**A. Tulosulotteet (Outcome Metrics)**
- Joukkueen sijoitus sarjataulukossa tai kilpailuissa
- Voitto/tappio-suhde tai piste-ero
- Henkilökohtaiset ennätykset (PB) ja niiden kehitys
- Mitalit ja saavutukset kausitasolla

**B. Prosessiulotteet (Process Metrics)**
- Harjoitustuntien laatu ja määrä (planned vs. executed)
- Taktinen osaaminen ja pelikirjan omaksuminen
- Fyysinen kehitys (testitulokset: VO2max, voima, nopeus)
- Tekninen kehitys (lajitekniikan analyysi)

**C. Ihmissuhde- ja johtamisulotteet**
- Pelaajien tyytyväisyys (360°-palaute)
- Pelaajakehitys ja -säilyvyys (retention rate)
- Kommunikaation laatu ja selkeys
- Ryhmädynamiikan ja tiimihengen ylläpito

**D. Ammatillinen kehitys**
- Valmentajan oma jatkokoulutus ja sertifikaatit (UEFA-lisenssit)
- Verkostoituminen ja mentorointi
- Uusien menetelmien omaksuminen

### 6.2 Valmennuspäällikön arviointikriteerit

| Ominaisuus | Arviointitapa | TM-datalähde |
|---|---|---|
| Strateginen ajattelu | Pelikirjan ja kausisuunnitelman laatu | SPL-arviointi (7 kriteeriä) |
| Taktinen osaaminen | Otteluanalyysit ja reaaliaikaiset ratkaisut | TASO-pelidata (§20) |
| Johtaminen | Pelaajien sitoutuminen ja luottamus | Kirjausaktiivisuus, ADAR-havaintofrekvenssi |
| Kommunikaatio | Palaute pelaajilta ja taustajoukoilta | Mentorointi-viestit, pelaajapalaute |
| Analyyttisyys | Datan hyödyntäminen päätöksenteossa | Testausosallistuminen, IDP-ehdotukset |
| Adaptiivisuus | Muutoksiin reagointi ja oppimiskyky | CPD-tunnit, koulutushistoria |
| Eettisyys | Käyttäytyminen ja arvojen mukaisuus | VP:n kvalitatiivinen arvio |

### 6.3 Käytännön toteutus (ICF-yhteensopivuus)

Kansainvälisesti tunnustetuissa järjestelmissä korostetaan neljää arviointimekanismia:
1. **Säännöllinen itsearviointi** — TM: valmentajan oma KPI-kortti Master_v16:ssa
2. **Päällikön havainnointi (shadowing)** — TM: VP:n SPL-arviointi + ADAR-havainnot
3. **Pelaaja- ja esimiespalaute** — TM: kirjausten fiilinki-trendi + mentorointi-loop
4. **Objektiivinen suoritusdata** — TM: VAI+ 5-komponenttinen indeksi (ADAR 30%, Käynnit 20%, Harjoittelu 20%, Kontakti 15%, Kehitys 15%)

### 6.4 Mapattavuus VAI+ -komponentteihin

| KV-ulottuvuus | VAI+ komponentti | Paino |
|---|---|---|
| Tulosulotteet (A) | **Kehitys** (joukkueen TKI/H-H Δ) | 15 % |
| Prosessiulotteet (B) | **Harjoittelu** (planned vs. executed, kirjausten laatu) | 20 % |
| Ihmissuhde/johtaminen (C) | **ADAR** (havaintojen laatu + frekvenssi) + **Kontakti** (pelaajan kohtaaminen) | 30 % + 15 % |
| Ammatillinen kehitys (D) | **Käynnit** (aktiivisuus, CPD-tunnit) | 20 % |

---

## 7. ADAR → "Pelihavainto" -nimipäätös (2026-06-08)

**UI/frontend:** "Pelihavainto" kaikkialla. Valmentaja näkee: "Pelihavainnot", "Uusi pelihavainto", "Pelihavainto · KPV U13 vs HJK · 5.6.2026".
**Backend/Firestore:** `tyyppi: 'adar'`, `pisteet: {A, D, Act, R}` — ei muuteta.
**Metodologia/docs:** "ADAR-kehä" kun kuvataan arviointimallia.

### Arviointiulottuvuudet (UI-nimet)

| Firestore | UI-nimi | Kuvaus |
|---|---|---|
| A | Tilanneluku | Havainnointi + kommunikaatio pelitilanteessa |
| D | Päätöksenteko | Ratkaisun valinta |
| Act | Toimeenpano | Suorituksen laatu |
| R | Reagointi | Palautesykli — uudelleenarviointi |

### Teoreettinen tausta

Kaksi kilpailevaa ketjumallia jalkapallon koulutusmaailmassa:

1. **Kommunikaatio → Päätöksenteko → Toimeenpano** (Raymond Verheijen / Football Coaching Evolution). Palloliiton valmentajakoulutusten ja JalkapalloAkatemian pohjamalli. Korostaa joukkueen kommunikaatiota havainnoinnin yläpuolella.

2. **Havainto → Päätös → Suoritus → Palaute** (Perception–Decision–Execution, klassinen UEFA/Welford & Schmidt). Syklinen malli — sama rakenne kuin ADAR-kehä.

TalentMasterin ADAR-kehä on lähempänä klassista UEFA-mallia (syklinen yksilön arviointisilmukka pelillisessä ympäristössä). "Pelihavainto" UI-nimenä on neutraali — ei sido kumpaankaan koulukuntaan.

**Vaatimus:** pelihavainto tehdään aina pelillisessä ympäristössä (harjoitus tai ottelu), ei irrallisissa taitoharjoitteissa.

**Lähteet:** JalkapalloAkatemia (Verheijen-viitekehys) · UEFA The Technician · The Coaching Manual (PDE-malli) · Palloliitto harjoitusrakennemateriaali.

---

## 8. Periaate

v24 standalone on **tuotevisio** — näyttää mihin v25 kehittyy. v25 on **tuotantopohja** — live Firebase, toiminnalliset modaalit, mentorointi. Kehitys kulkee v25 → v24:n suuntaan: jokainen Sprint tuo yhden v24-elementin tuotantoon oikealla datalla.
