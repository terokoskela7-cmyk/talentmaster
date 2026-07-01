# Bio-banding — arkkitehtuuri, tieteellinen benchmark ja vaiheistus

> Laadittu 2026-07-01. Kanoninen bio-banding-suunnitelma. Rakentuu: `src/lib/tm_bioika.js` (§25 Mirwald PHV + Khamis-Roche-runko), §28 (herkkyysikkunat), §30 (KPI/bio-banding roadmap), §26 (pikakentät).
> Referenssit: **MyE.Way** (Palloliiton live-tuote, 2 näyttöä) + **Palloliiton menetelmäkuvaus** + **riippumaton tiedekirjallisuus 2015–2026** (3 tutkimuskulmaa). Nämä konvergoivat → [LÄHDE]-aukot ratkaistu julkaistulla tieteellä.

---

## 0. Ydin — kypsyys, ei kronologinen ikä
Bio-banding = vertaa pelaajaa **biologisen kypsyyden**, ei syntymävuoden, mukaan. Ratkaisee RAE:n + kypsyysvinouman (§28). Keskeisin ominaisuus = **dual-taso** (§4C): sama testitulos näytetään sekä ikäluokka- että kehitysvaihe-normia vasten (MyE.Way: Nopeus 10m ikäluokka 1 / kehitysvaihe 3). Tieteellinen tuki: **PHV/kypsyys ohittaa kronologisen iän talenttiarviossa on valtavirtaa** (Cumming/Malina, Premier League EPPP).

---

## 1. Menetelmät kehitysvaiheen määrittämiseen (5 tapaa)

| Menetelmä | Mitä mittaa | Muuttujat | Poikkileikkaus? | Meillä | Tieteen kanta |
|---|---|---|---|---|---|
| **Kasvukäyrä** (kasvutahti) | Pituuskasvun nopeus cm/v | ≥2 pituusmittausta ajassa | Ei (vaatii seurannan) | V3 (uusi) | Herkin PHV-signaali; loukkaantumisriski >7,2 cm/v |
| **PHV offset (Mirwald)** | Etäisyys PHV:stä ±v | pituus, istumapituus, paino, ikä | **Kyllä** | ✅ ON (§25) | Halpa proxy; **harha lähellä PHV:tä** + ali/yliarvioi myöhäis/varhaiskypsyjät |
| **Khamis-Roche (%PAH)** | % ennustetusta aikuispituudesta | pituus, paino, ikä, **molempien vanhempien pituus** | **Kyllä** | ⚠️ **LUKOSSA** (§25) | **Eliittiakatemioiden standardi** (Cumming/PL) |
| **Tanner** | Sekundääriset sukupuolimerkit | terveydenhuollon arvio | Kyllä | Ei (ei sovellu appiin) | Kliininen, ei kenttäkäyttöön |
| **Luuston ikä** | Kasvulevyt röntgenistä | röntgen | Kyllä | Ei | **Kultastandardi**, mutta kallis/invasiivinen |

**Molemmat poikkileikkausmenetelmät (PHV + Khamis-Roche) ovat ENNUSTEITA** → lukemat voivat muuttua, erityisesti nuorilla pelaajilla (Palloliiton kuvaus + tiede yhtä mieltä).

---

## 2. Tieteellinen benchmark (2015–2026) — täyttää [LÄHDE]-aukot

### A. Maturity z-score = **%PAH:n z-score** (julkaistu metriikka)
- Standardoi %PAH ikä+sukupuoli-**viitejakaumaan** (ka/SD) → **[LÄHDE ratkaistu]: Sherar et al. 2007** -kasvuviitepopulaatio antaa ka/SD:t.
- Kaava: `z = (%PAH − ka_ikä,sp) / SD_ikä,sp`.
- **Kaistat (vakiintuneet):** myöhäinen z < −0,5 · ajallaan −0,5…+0,5 · varhainen z > +0,5.
- ⚠️ **Vaatii %PAH:n → vaatii Khamis-Rochen** (lukossa). Jos standardoidaan omaan kohorttiin Sherarin sijaan → vendor-konstrukti; ilmoita kumpi viite. (Vaihtoehto: z-score suoraan offsetista — karkeampi.)

### B. Bio-banding-kaistat = **%PAH-kaistat** (Cumming/Bath, Premier League)
- Kilpailukaistat **5 % leveä**: <85 % · 85–90 % · 90–95 % · >95 % ennustetusta aikuispituudesta.
- **%PAH → PHV-status:** **<90 % = pre-PHV · 90–96 % = circa-PHV · >96 % = post-PHV** — **täsmää Palloliiton kuvaukseen** (−1v≈89 %, +1v≈96 %).
- Premier League EPPP -turnaus: pelaajat 85–90 % -kaistalta (Cumming 2018, n=66, 4 seuraa).

### C. Kasvutahti-vyöhykkeet (kirjallisuus vahvistaa MyE.Way'n)
- **PHV-huippu:** pojat ~9,5 cm/v, tytöt ~8,3 cm/v (Malina/Bouchard).
- **Loukkaantumisriskikynnys >7,2 cm/v** (PMC6293374) = **MyE.Way'n "nopea ≥7,2" täsmää.** Hidas <~5 cm/v = kliininen huoli (MyE.Way <3,0 = konservatiivinen).
- Suositus: nosta **>7,2 cm/v -signaali** valmentajalle `PH`-kuormarajoittimen rinnalle (siteerattava peruste).

### D. Kypsyysviitteiset normit (dual-taso — on olemassa)
- **Ghouili et al. 2024** (BMC, n=647): LMS-percentiilit **per kypsyyskaista** (pre/circa/post, ±1v) — lähin malli meidän "kehitysvaihe-tasolle". Esim. 30m: pre 5,10 / circa 4,80 / post 4,41 s.
- Sprinttipercentiilit vs **luustoikä** (n≈1745, eliittiakatemiat): nopeus seuraa luustoikää, ei kronologista → varhaiskypsyjä näyttää keinotekoisen hyvältä, myöhäinen huonolta ikäluokkanormissa.
- ⚠️ **Ei universaalia siirrettävää normitaulukkoa** — julkaistut normit ovat populaatiokohtaisia (tunisialainen seura, tietyt EU-akatemiat). → oma/Palloliiton kypsyysnormi tarvitaan tarkkoihin lukuihin; Ghouili antaa rakenteen.

### E. Menetelmävalinta (tiede)
**%PAH (Khamis-Roche) = eliittiakatemioiden standardi** dual-tasoon/kaistoihin; Mirwald-offset = halpa seula (myöhäis/varhaiskypsyjä-harha + epätarkkuus lähellä PHV:tä → **älä esitä offset-luokittelua yksilötasolla luotettavana**). Moore 2015 -yksinkertaistus (age+pituus, ei istumapituutta) = kevyt fallback.

---

## 3. Mitä meillä JO on (`tm_bioika.js` §25)
Mirwald-offset (−9,3236/−9,376, MyE.Way-täsmällinen) · phv_ika · phv_tila (PRE/LAH/PH/POST/AN — hienompi kuin ±1v circa) · **yli-ikäisyys −0,75v** (jo laskettu, vain näkyviin) · kuormarajoitin (PH) · herkkyysikkuna-signaalit + Hidden Gem (§28). **Khamis-Roche-runko rakennettu mutta LUKOSSA** (`KR_VERIFIOITU=false`).

## 4. Uudet komponentit
- **A. Maturity z-score** (%PAH-pohjainen, Sherar-viite) — *vaatii KR:n avaamisen*.
- **B. Kasvutahti cm/v** + vyöhykkeet (>7,2 riski) — vaatii ≥2 kasvumittausta.
- **C. ⭐ Kypsyysviitteinen dual-taso** per testi (ikäluokka + kehitysvaihe) — *vaatii KR:n %PAH:n TAI offset-kaistan + kypsyysnormit*.
- **D. Bio-banding-ryhmittely** (%PAH-kaistat tai phv_tila-kaistat) — offset-versio toimii JO.

## 5. 🔑 Kriittinen prerekvisiitti — Khamis-Rochen avaaminen
Dual-taso + z-score + %PAH-kaistat perustuvat **%PAH:hon**, joka on lukossa. **Todellinen gate ei ole MyE.Way vaan KR-kertoimet.**
- **Toimenpide:** hanki **Khamis & Roche 1994 + Pediatrics 1995;95:457 -erratum-kertoimet** (imperiaaliset, ikä+sp-kohtaiset 4–17,5v puolivuosivälein) → täytä `KR_KERTOIMET` + `KR_VERIFIOITU=true` (§25 integraatiopinta valmis). Vanhempien pituudet: rekisteröinnistä (`isa_pituus_cm`/`aiti_pituus_cm`, §25) + Epstein-korjaus (jo koodissa) + THL-fallback puuttuville.
- Tarkkuus: SE ~5,6 cm pojat / 4,3 cm tytöt — näytä virhemarginaali aina (§25 tekee jo).

## 6. Vaiheistus
| Vaihe | Sisältö | Riippuvuus | SJK-valmius |
|---|---|---|---|
| **V1** (heti, ei KR:ää) | −0,75-kriteeri näkyviin + **offset-pohjainen bio-banding-ryhmittely** (phv_tila-kaistat pre/circa/post ±1v) + >7,2 cm/v -signaali | Mirwald (ON) | ✅ 8 PHV-pelaajaa |
| **V2** (dual-taso ⭐) | %PAH + maturity z-score + **kehitysvaihe-taso** per testi + ikäluokka↔kehitysvaihe-toggle | **KR-avaus (§5)** + kypsyysnormit | ⏳ KR + normit |
| **V3** (kasvutahti) | Kasvunopeus cm/v + vyöhykkeet | ≥2 kasvumittausta | ⏳ 2. kierros |

> V1 tuottaa arvoa **heti** olemassa olevalla Mirwaldilla (karkea bio-banding + injury-signaali). V2 (arvokkain) gate = **Khamis-Roche avaus**, ei MyE.Way.

## 7. Firestore + UI + invariantit
- **biologinen_ika/{pvm}**: lisää `maturity_zscore` (V2), `paah_pct` + `paah_kaista` (V2, KR), `kasvutahti_cm_v`/`vyohyke` (V3).
- **Pikakentät** (§26): `kehitysvaihe_kaista`, `maturity_zscore`, `paah_pct`, `kasvutahti_*`. Renderöinti pikakentistä.
- **UI:** ikäluokka↔kehitysvaihe-toggle radariin + tasopylväisiin (MyE.Way-pariteetti); bio-banding-ryhmittelynäkymä.
- **§7.22 EHDOTON:** dual-taso + z-score + %PAH = **valmentaja/VP-työkaluja**. Lapselle EI kypsyys-z-lukua/vertailua; perheelle "miten tukea" -kielellä (§16). Kypsyysdata (pituus/paino/vanhempien pituus) = Art. 9 → suostumus (kuten PHV).
- Kypsyysnormit ≠ ikäluokkanormit → molemmat rinnakkain, ei ristiin (§30).

## 8. Seuraavat askeleet
1. **V1 nyt (Code):** phv_tila-kaistat ryhmittelynäkymään + −0,75-kriteeri UI + >7,2 cm/v -signaali (kun kasvutahti on). Mirwaldilla, ei riippuvuuksia.
2. **KR-avaus (data):** hanki 1995-erratum-kertoimet → avaa Khamis-Roche → %PAH + z-score. **Tämä avaa V2:n.**
3. **Kypsyysnormit:** pyydä **Palloliitto/MyE.Way** kypsyysvaihe-normit per testi (heidän kehitysvaihe-tasonsa käyttää niitä); fallback = johda viitepopulaatiosta (Ghouili-rakenne) tai käytä %PAH-z-score-kaistoja.
4. **MyE.Way-pariteetti vahvistus:** varmista z-score-viite (Sherar vai oma kohortti) + kasvutahti-vyöhykerajat — samat kanavat kuin −9,3236/−20,3.

---

### Lähteet (keskeiset)
Mirwald 2002 · Moore 2015 (Springer 10.1007/s40279-017-0750-y) · Khamis-Roche 1994 + **Pediatrics 1995;95:457 erratum** · Sherar et al. 2007 (%PAH-viite z-scorelle) · Cumming 2017 (Strength & Cond J, bio-banding) · Malina/Cumming 2019 (Sports Med 10.1007/s40279-019-01166-x) · Cumming 2018 (J Sports Sci, EPPP-turnaus) · Abbott 2019 (Sports 7:193, tekniikka↑ ilman fysiikan laskua) · **Ghouili 2024** (BMC, kypsyys-percentiilit) · injury-risk >7,2 cm/v (PMC6293374) · Palloliiton menetelmäkuvaus + MyE.Way-näytöt 2026-07-01.

### Liittyvät
`src/lib/tm_bioika.js` (§25) · `tm_eerikkila_normit.js` · CLAUDE.md §28 · §30 · §26 · §16.
