# BP5 — Financial Plan + investointisuunnitelma

> **Business-suunnittelu, osa 5/5.** Markon sekvenssi: (1) markkinatarve → (2) Business Plan → (3) IPR → (4) ansaintamalli + GTM → (5) **Financial Plan + investointisuunnitelma**.
> Laadittu 2026-07-01. Rakentuu: BP1 (maksuhalukkuus), BP4 (ansaintamalli). Rahoitusdata: web-tutkimus (Business Finland, Finnvera, FiBAN, ELY, 2024–2026).
> ⚠️ **EI sijoitus- eikä kirjanpitoneuvonta.** Kaikki luvut ovat **havainnollistavia oletuksia** (merkitty), vahvistettava **kirjanpitäjällä**. Julkisen rahoituksen ehdot muuttuvat vuosittain → **[TARKISTA LIVE]** ennen hakemista.

---

## 0. Ydin

**Hybridi ei-laimentava-first -polku:** bootstrap pilottituloilla + Business Finland **Sprint-tuki** (Tempo-seuraaja, ≤100 k€ 75 %) + starttiraha/Finnvera-takaus → kasvata todistettu adoptio + data → nosta pääomakierros myöhemmin **vahvuudesta, omistus säilyttäen**. Rajakustannus/pelaaja lähes nolla (SaaS) → bruttokate korkea; päävipu = asiakashankinta + retentio. Kevyt burn (yksin-/pienkehittäjä) antaa poikkeuksellisen pitkän runwayn.

---

## 1. ⚠️ Tärkein 2025–2026 muutos (lue ensin)
Business Finland **sulki klassiset startup-instrumentit syksyllä 2025** (Tempo-haku 3.10.2025, NIY 10.10.2025) budjettileikkausten vuoksi ja **korvasi Tempon uudella "Sprint-tuella" 2026** ([BF uutinen](https://www.businessfinland.fi/en/whats-new/news/2025/Innovation-Funding-Calls-to-Be-Closed-and-Funding-Services-Discontinued/) · [BF 2026](https://www.businessfinland.fi/en/whats-new/news/2026/what-do-business-finlands-funding-services-look-like-at-the-beginning-of-2026/)). Suunnitelma käyttää **Sprintiä**, ei Tempoa. **[TARKISTA LIVE ennen hakua.]**

---

## 2. Tulomalli (havainnollistava bottom-up)

> ⚠️ **Kaikki luvut alla ovat OLETUKSIA** havainnollistamaan mallin logiikkaa. Todelliset tavoitteet johdetaan **pilotin konversio-/aktivaatiodatasta** (BP4 §3) + kirjanpitäjän kanssa. ARPU-ankkurit: BP1 §5–6.

### 2.1 ARPU-ankkurit tasoittain (BP4B-paketit)
> Value metric = kehityssyvyys (taso), ei pelkkä pelaajamäärä. ARPU eriytetään tasoittain — premium-akatemia (Taso 2) nostaa keskiarvoa merkittävästi vs. yhden ARPU:n oletus.

| Taso | Perus/v | Per-player-oletus | **Seura-ARPU/v (oletus)** |
|---|---|---|---|
| **Taso 1 Kehitys** | 600–1 080 € (50–90 €/kk) | 2,5 €/kk × ~25 pelaajaa | **~1 350–2 000 €** |
| **Taso 2 Talentti/Akatemia** | 1 800–4 800 € (150–400 €/kk) | 4–12 €/kk × ~30 pelaajaa (kv. yläpää) | **~3 500–8 000 €** (kv-akatemia enemmän) |
| **Enterprise (liitto)** | custom | per-player-in-programme | **viisi–kuusinumeroinen/v** |
| **B2C Solo** | ~55 €/v (vuosihinta johtava) | — | ~55 €/tilaus |

**Kansainvälinen kerroin (BP4 §8):** Taso 2 kv-akatemiat (ENG/DE/NL/ES) yläpäähän + maakerroin (Premium DK/NO). ES-residenssit korkein WTP.

### 2.2 Havainnollistava 3-vuotisskenaario (OLETUS — validoi)
| | V1 (0–12 kk) | V2 (12–24 kk) | V3 (24–36 kk) |
|---|---|---|---|
| Maksavat seurat | 5–10 | 20–40 | 50–100 |
| Solo-tilaukset | 100–300 | 500–1 500 | 2 000–5 000 |
| Liitto/akatemia | 0 | 1 (pilotti) | 1–3 |
| **ARR-luokka (oletus)** | ~15–40 k€ | ~80–200 k€ | ~300–700 k€ |

**Nämä ovat suuruusluokkia**, eivät ennusteita. Kolme muuttujaa hallitsevat: seurojen määrä × seura-ARPU × retentio. **Pilotin ensimmäiset konversiot antavat oikean nimittäjän** — päivitä taulukko niillä ennen sijoittajadekkiä.

### 2.3 Yksikkötalous (rakenne)
- **Bruttokate korkea** (SaaS, EU-pilvi; rajakustannus/pelaaja ~0).
- **Retentio-vipu = data + passi** → vaihtokustannus kasvaa historian myötä (lock-in datasta, ei sopimuksesta, BP3 tietokantaoikeus).
- **[TARKENNA kirjanpitäjän kanssa]:** CAC, LTV, LTV/CAC, churn %, katerakenne, alv-vaikutus (yritys ei vielä alv-velvollinen, liikevaihto <20 k€/v — muuttuu kasvaessa).

---

## 3. Kustannusrakenne ja burn

### 3.1 Kehittäjän kokonaiskustannus (Suomi, 2024–25)
Keskitason kehittäjä brutto ~4 500–5 500 €/kk (~54–66 k€/v, [Witted 2025](https://witted.com/blog/developing/the-salary-level-of-software-developers-in-finland-in-2025)); työnantajan sivukulut **~+20 %** → **kokonaiskustannus ~65–79 k€/v** (keskiarvo ~72 k€). Senior ~86 k€/v.

### 3.2 Kevyt burn (1–3 hlö)
| Skenaario | Burn/kk | Kuvaus |
|---|---|---|
| **Erittäin kevyt** (perustaja palkaton, starttiraha) | **~500–1 000 €** | Pilvi/työkalut 50–400 €, kirjanpito pieni Oy 100–200 €, työpiste 0–500 € |
| **Maltillinen** (2 perustajaa ~3 000 €/kk brutto) | **~8 000–9 000 €** | |
| **3 hlö markkinapalkoilla** | **~15 000–20 000 €** | Jokainen kehittäjä ≈ brutto ×1,20 + 300–600 € työkalut/piste |

**TalentMasterin etu:** yksinkehittäjä + AI-avusteinen työnkulku (dokumentoitu) → **erittäin kevyt burn** → poikkeuksellisen pitkä runway samalla rahoituksella. Tämä on hybridimallin kulmakivi.

---

## 4. Rahoituslähteet (ei-laimentava-first)

| Lähde | Määrä | Ehdot | Lähde |
|---|---|---|---|
| **Pilottitulot** | kasvava | Sibbo-malli 50 €/kk + 2,5 €/pelaaja | BP4 |
| **Starttiraha** | ~740 €/kk, max 12 kk | Uusi päätoiminen yrittäjä; hae ennen aloitusta | [tem.fi](https://tem.fi/en/start-up-grants) |
| **BF Sprint-tuki** | **≤100 k€, 75 %** | Pieni yritys, väh. **50 k€ oma pääoma**, innovatiivinen + kv. Auki **2.3.–31.8.2026** | [Sprint 2026](https://www.businessfinland.fi/en/services/funding/calls/2026/sprint-grant-funding-call/) |
| **Finnvera Alkutakaus** | pankinlainaan 80 % takaus, 10–80 k€ (max 160 k€) | SME ≤3 v; haetaan **pankin kautta**; provisio 1,75 %/v | [Finnvera](https://www.finnvera.fi/eng/financing/guarantees/start-guarantee) |
| **ELY yrityksen kehittämisavustus** | min 5 k€, ≤50 % | Kansainvälistyminen/kyvykkyys (ei rutiinituotekehitys) | [tem.fi](https://tem.fi/yrityksen-kehittamisavustus) |
| **NIY (jos avautuu uudelleen)** | **≤1,0 M€, kokonaan avustus** (250+250+500 k€, 2024→) | Startup <5 v, R&D-intensiivinen, omistaa IPR:t | [BF NIY](https://www.businessfinland.fi/en/services/funding/funding-services/Young-innovative-companies/) — ⚠ suljettu 10/2025, seuraa seuraajaa |
| **EIC Accelerator (EU)** | avustus ≤2,5 M€ + pääoma 1–10 M€ | Deep-tech SME; vaatii puolustettavan tieteellisen edun (PHV/RAE-mallit) | [EIC](https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en) |
| **FiBAN-enkelit** | mediaani 20 k€/enkeli, ~275 k€/kierros | Syndikoitu; SW top-sektori | [FiBAN](https://fiban.org/data/) |

**⚠ De minimis -katto: 300 k€ / rullaava 3 v** kaikkien julkisten myöntäjien yhteensä (BF+ELY+Finnvera+kunnat). Sprint 100 k€ syö kolmasosan. NIY eri valtiontukiperuste (ei de minimis). ([BF de minimis](https://www.businessfinland.fi/en/services/funding/funding-services/guidelines-terms-and-forms/de-minimis/))

**Urheilu-/EU-apurahat (rehellinen fit):** Erasmus+ Sport, OKM, Olympiakomitea = rakennettu **voittoa tavoittelemattomille** (seurat/liitot), **et voi olla suora saaja**. Realistinen kulma: **Palloliitto tai pilottiseura on saaja + ottaa tuotteesi rahoitettuna teknologiakumppanina** → traction + referenssi, ei skaalauspääomaa. EIC Accelerator = ainoa iso EU-instrumentti joka sopii voittoa tavoittelevalle SaaS:lle.

---

## 5. Pääomakierrokset (jos/kun nostetaan)
| Vaihe | Tyypillinen Suomi/Pohjoismaat (2024–25) | Laimennus |
|---|---|---|
| Pre-seed | ~0,3–1,5 M€ | ~10–15 % |
| Seed | 0,5–3 M€ (**Suomen mediaani 1,8 M€ 2024**) | ~15–25 % |

Enkelivaiheen pre-money-mediaani 1,52 M€ (FiBAN 2025). Pohjoismaiden arvostukset ~20–30 % USA:n alle. Suomalainen siirto: **nosta vasta tractionilla → pienempi, myöhempi kierros paremmalla arvostuksella**; kerrosta Tesi-yhteissijoitus + jäljellä olevat BF-tuet päälle laimennuksen minimoimiseksi. ([FVCA 2024](https://paaomasijoittajat.fi/app/uploads/VC_Finland_2024.pdf) · [Seedtable](https://seedtable.com/best-startups-in-finland))

---

## 6. Investointisuunnitelma — käyttökohteet (priorisoitu)
1. **Toinen kehittäjä** (~72 k€/v kokonaiskustannus) — poistaa yksinkehittäjä-pullonkaulan; suurin yksittäinen vipu.
2. **GDPR/juridiikka** — juristin vahvistus (Malli A), DPIA-harkinta, tavaramerkki (BP3, ~210–850 € kuponilla).
3. **Myynti/GTM** — referenssien tuotanto, liittokanava, Solo-markkinointi (BP4).
4. **Pohjoismaat-lokalisointi** — kieli (norja/tanska), liittokontaktit.
5. **Infra/skaalaus** — pilvikustannus kasvaa pelaajamäärän myötä (matala rajakustannus).

---

## 7. Hybridipolku (sekvenssi)
1. **Bootstrap:** perustaja starttirahalla (~740 €/kk) + minimaaliset nostot, burn **~500–1 000 €/kk**. Konvertoi pilotit (SJK, Sibbo, KPV…) maksaviksi → toistuva liikevaihto + validointi. Valinnainen Finnvera-takaus käyttöpääomaan ilman laimennusta.
2. **BF Sprint ≤100 k€ (75 %)** — ensimmäinen R&D/kv-tuki (auki 2.3.–31.8.2026; vaatii ≥50 k€ oma pääoma). Rahoita markkinavalidointi + kv-kasvu. Vahdi de minimis -kattoa.
3. **Skaalaus ei-laimentavasti:** NIY-tyylinen R&D-rahoitus (≤1,0 M€, kokonaan avustus) kun R&D-intensiteetti + tiimi kasvavat, *jos BF avaa NIY:n/vastaavan uudelleen*. Deep-tech-kehyksessä **EIC Accelerator** = EU-tason rinnakkaisreitti.
4. **Myöhempi pääomakierros:** saavu pre-seed/seediin liikevaihdolla + tuki-tractionilla → nosta ~0,5–3 M€ (Suomen seed-mediaani 1,8 M€) ~15–25 % laimennuksella FiBAN-enkeleiltä ja/tai suomalaiselta seed-VC:ltä (Maki.vc, Icebreaker.vc, Lifeline, Voima, Vendep). Kerrosta Tesi + BF-tuet.

**Nettovaikutus:** ei-laimentava raha (starttiraha → Sprint/NIY → Finnvera) kattaa riskisen alkurakennuksen ja ostaa tractionin → lopullinen pääomakierros on **pienempi, myöhempi ja paremmalla arvostuksella** — omistus säilyy.

---

## 8. Yhteenveto sijoittajalle
Kevyt burn + korkea bruttokate + ei-laimentava-first-rahoitus = poikkeuksellisen pääomatehokas polku. Hybridimalli antaa runwayta ilman aikaista laimennusta; datavallihauta (BP3) + rekisterinpitäjyys nostavat retentiota ja arvostusta ajan myötä. **Kaikki luvut vahvistettava kirjanpitäjän kanssa; julkisen rahoituksen ehdot tarkistettava live ennen hakua.**

---

### ⚠ Merkityt epävarmuudet
- BF-instrumentit muutoksessa (Tempo/NIY suljettu 10/2025, Sprint 2026) — vahvista live-status.
- **NIY = 1,0 M€ (ei 1,25 M€), kokonaan avustus 2024→.**
- Suomen pre-money-arvostuksista ei puhdasta julkista sarjaa — johdettu ("20–30 % USA:n alle" + FiBAN 1,52 M€ mediaani).
- Kaikki julkiset ehdot + työnantajamaksut nollautuvat vuosittain — tarkista alkuperäis-URL:eista ennen dekin viimeistelyä.

### Liittyvät dokumentit
BP1–BP4 (koko suite). Tekninen kevyt-burn-peruste: YKSINKEHITTAJAN_TOIMINTASUUNNITELMA.md, TEKNINEN_YLEISKUVA.md. Hinnoittelu: HINNOITTELU_LASKUTUS.md.

*Lähteet linkitetty tekstissä: Business Finland (Sprint/NIY/Tempo/de minimis), Finnvera, tem.fi (starttiraha/ELY), FiBAN, FVCA, Witted/Koodiklinikka, EIC. Kaikki 2024–2026.*
