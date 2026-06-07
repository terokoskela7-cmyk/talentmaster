# TalentMaster™ — KPI Master Architecture + Tutkimusperusta
# Claude Code -referenssi · 2026-06-07
# Tämä dokumentti on kanoninen viite kaikelle indeksi-, mittari- ja detail-paneelityölle.

---

## 1. ARKKITEHTUURIPERIAATTEET (pysyvät, ei muuteta)

1. Raakadata Firestoreen, indeksit lasketaan lennossa
2. Eerikkilä-normit = single source of truth (fyysinen, 5-portainen)
3. TK-merkkirajat = single source of truth (tekninen, kulta/hopea/pronssi)
4. H-H pujottelu/syöttö = Palloliiton FINAL2024 3-portainen normi
5. Mittaus universaali, normit lokaalit
6. Sama testi + eri protokolla → molemmat näytetään rinnakkain
7. Data-tietoinen UI: näytä mitä on, piilota mitä ei ole
8. OVR ei aktivoidu ennen ≥3 dimensiota
9. FLEI on pohjavalmiusindeksi, EI dimensio
10. RAE-korjaus = kansainvälinen erottautumistekijä (Q1:0.92, Q2:0.96, Q3:1.02, Q4:1.06)
11. PHV ohittaa kronologisen iän AINA

---

## 2. RAAKADATA — 17 testiä, 3 protokollaa + FLEI

### A. H-H ominaisuustestit (U10–U19, Eerikkilä 5-portainen)

| Testi | Kenttä hh_viimeisin | Yksikkö | Suunta | Dimensio |
|-------|---------------------|---------|--------|----------|
| Lin5m | lin5m | s | pienempi=parempi | D1 |
| Lin10m | lin10m | s | pienempi=parempi | D1 |
| Lin30m | lin30m | s | pienempi=parempi | D1 |
| CMJ | cmj | cm | suurempi=parempi | D1 |
| SJ | sj | cm | suurempi=parempi | D1 |
| MAS | mas | km/h (tallennuksessa) | suurempi=parempi | D1 |
| Kasirata | kasirata | s | pienempi=parempi | D1 |
| SM-juoksu | sm_juoksu | s | pienempi=parempi | D1→D2 silta |
| SM-pallo | sm_pallo | s | pienempi=parempi | D2 |

HUOM MAS: Eerikkilä-normit ovat m/s. Tallennettu arvo on km/h.
Laskennassa: arvo_ms = arvo_kmh / 3.6. Näytössä: km/h.

### B. H-H tekniikkatestit (U10–U19, FINAL2024 3-portainen)

| Testi | Kenttä | Yksikkö | Suunta | Normi |
|-------|--------|---------|--------|-------|
| Pujottelu H-H | pujottelu_hh TAI hh_viimeisin.pujottelu | s | pienempi=parempi | 3-portainen (1/2/3) |
| Syöttö H-H | syotto_hh TAI hh_viimeisin.syotto | s | pienempi=parempi | 3-portainen (1/2/3) |

KRIITTINEN: Sama fyysinen rata kuin TK mutta ERI pisteytys.
H-H protokolla = populaationormi (vertaa kaikkiin).
TK protokolla = huippukynnys (onko mitalitasolla).

### C. Tekniikkakilpailut TK (U8–U13, kulta/hopea/pronssi)

| Testi | Yksikkö | Suunta | Normi |
|-------|---------|--------|-------|
| Ponnauttelu | krt/30s | suurempi=parempi | TK_MERKKIRAJAT per ikä/sp |
| Syöttö TK | pisteet | suurempi=parempi | TK_MERKKIRAJAT |
| Pujottelu TK | s | pienempi=parempi | TK_MERKKIRAJAT |
| Kuljetus-laukaus | pisteet | suurempi=parempi | TK_MERKKIRAJAT |
| Pituuspotku | m | suurempi=parempi | TK_MERKKIRAJAT (U12+) |

### D. FLEI harjoitettavuuskartoitus (U10–U19, 1–3)

5 ketjua: SBL ⚡, SFL 🦵, LL ↔️, DIAG 🔄, DFL 🏗️
Raakadata 1.0–3.0. Normalisointi: (arvo-1)/2×100 = 0–100%.
FLEI < 40% → automaattinen klinikkalähetys.
Heikoin ketju → S-harjoitteen kohde (EI profiiliin).

---

## 3. JOHDETUT INDEKSIT — 10 indeksiä, 2 kerrosta

### Kerros A: Tuotannossa (näytetään UI:ssa)

| Indeksi | Kaava | Asteikko | Käyttö | Tiedosto |
|---------|-------|----------|--------|----------|
| hh_taso | keskiarvo H-H tasoista | 1–5 | KPI-kortti M1 | lennossa |
| d2_taso | ka(sm_juoksu_taso, sm_pallo_taso) | 1–5 | piilossa (d1_taso puuttuu) | recalcSMtasot |
| TSI | sm_pallo − sm_juoksu | ±s | KPI-kortti M2 + detail | §22 |
| TKI | (syöttö×0.40+pujottelu×0.30+ponnauttelu×0.20+KL×0.10) | 0–100 | KPI-kortti M2 | tkLaskeTKI() |
| FLEI | ka(5 ketjua) normalisoitu | 0–100% | KPI-kortti M1 | lennossa |
| Delta | taso − taso_edellinen | ±number | Delta-badge | VAIHE 2 |

### Kerros B: Koodi valmis, UI puuttuu (testit_indeksit.js)

| Indeksi | Kaava | Milloin näytetään | Arvo |
|---------|-------|-------------------|------|
| EI (Elastisuusindeksi) | CMJ − SJ | Kun SJ saatavilla (laaja H-H) | cm, tavoite ikäkohtainen |
| FVP (Voima-nopeusprofiili) | Lin5m / (Lin30m/6) | Kun lin5m saatavilla | ratio: <0.90 nopeus, >1.10 voima |
| VNE (kokonaisräjähtävyys) | EI + FVP + nopeus | Kun EI + FVP molemmat | Räjähdys/Jousi/Moottori/Rakentaja/Perusta |
| OVR | D1×0.40+D2×0.25+D3×0.15+D4×0.10+D5×0.10 | EI VIELÄ (vaatii ≥3 dimensiota) | 0–100 |

---

## 4. DETAIL-PANEELIT — mitä näytetään klikkauksella

### H-H Detail (klikkaa H-H KPI:tä)

```
Fyysinen profiili — [Nimi], [ikä]v

Testi       Taso    Arvo      Normi     Suunta
30m         ●●○○○   4.34s     4.28s     ▼ alle
CMJ         ●●●○○   35.5cm    35.4cm    ▲ yli
MAS         ●●○○○   16.1km/h  16.2km/h  ▼ alle
SM-juoksu   ●●●○○   7.84s     7.82s     ▼ alle

Vahvin: CMJ (taso 3) · Heikoin: 30m (taso 2)
→ Suositus: [heikoimman testin harjoitusohje]
```

Laskenta: eerikkilaTaso(arvo, testi, ika, sp)
Normi: eerikkilaNormiarvo(testi, ika, sp) = taso-3 kynnys
Suunta: arvo vs normi → ▲ yli / ▼ alle
MAS: arvo_kmh, normi_kmh (molemmat km/h, laskennassa ÷3.6)

JOS laaja H-H data (SJ + lin5m saatavilla):
```
Räjähtävyysprofiili:
EI: 4.2 cm (hyvä — tavoite ≥5.0 cm)
FVP: 0.95 (tasapainoinen)
VNE: ⚡ Räjähdys — erinomainen kokonaisprofiili
```

### TSI Detail (klikkaa TSI KPI:tä)

```
Tekniikka-nopeus — [Nimi]

SM-juoksu (ilman palloa): 7.84s   taso 3
SM-pallo  (pallon kanssa): 9.24s   taso 3
                           ━━━━━━
TSI erotus:               +1.40s

⚠️ Pallo hidastaa 1.40 sekuntia
   Tavoite: alle 0.50s

→ Suositus: Päivittäinen pallokuljetus vauhdissa
```

TSI tulkinta:
- ≤ 0s: 🔥 "Pallo nopeuttaa" (harvinainen, eliittitaso)
- 0–0.5s: ✅ "Tekninen vapaus" (tavoitetaso)
- 0.5–1.0s: "Kehitettävä" (normaali)
- > 1.0s: ⚠️ "Pallo hidastaa" (prioriteetti)
- > 1.5s: 🔴 "Kriittinen" (tekniikkatyö välttämätön)

JOS H-H pujottelu/syöttö saatavilla, lisää TSI-paneelin loppuun:
```
H-H Tekniikkatestit (3-portainen normi):
Pujottelu   ●●●    18.2s    normi: 18.6s    ▲ yli
Syöttö      ●●○    25.1s    normi: 23.0s    ▼ alle
```

### TKI Detail (klikkaa TKI KPI:tä)

```
Tekniikkaprofiili — [Nimi], [ikä]v

Laji            Merkki   Arvo     Kulta   Hopea   Pronssi
Ponnauttelu     ○○○  —   31.8     50      42      34
Syöttö          ○○○  —   8        20      15      11     ← kehitä
Pujottelu       ○○○  —   22.5     14.2    16.8    20.0
Kulj-laukaus    ●●●  🥇  16       15      11      7      ★ vahvuus

TKI: 22/100
```

Kynnysarvot haetaan: TK_MERKKIRAJAT[sp][laji][ika]
Näytä kaikki kolme kynnystä per laji — valmentaja näkee
kuinka kaukana seuraavasta tasosta.

JOS ikä ≤ 12, lisää paneelin loppuun:
```
🔥 Motorinen kultaikkuna auki
Tekniikan kehitys on nyt tehokkaimmillaan.
Sama harjoitus vaatii 3× enemmän toistoja U15:ssä.
(Forsman 2013, Côté 2007)
```

JOS ikä 13–14:
```
⚡ Kultaikkuna sulkeutumassa
Priorisoi tekniikkatyö nyt.
```

JOS ikä ≥ 15:
```
📊 Tekniikka = toistojen asia
Post-kultaikkuna: päivittäinen pallokosketus kriittinen.
```

---

## 5. PUJOTTELU/SYÖTTÖ — kaksi protokollaa, yksi rata

### Päätös (pysyvä)

| Tilanne | Mitä näytetään |
|---------|---------------|
| Vain H-H pujottelu/syöttö | 3-portainen taso + raaka-aika + Eerikkilä-normi |
| Vain TK pujottelu/syöttö | Mitali + raaka-arvo + TK_MERKKIRAJAT kynnykset |
| Molemmat saatavilla | Molemmat rinnakkain eri otsikoilla |

H-H protokolla vastaa: "Miten tämä pelaaja vertautuu kaikkiin ikäisiinsä?"
TK protokolla vastaa: "Onko tämä pelaaja mitalitasolla?"

Normit ovat eri lähteistä:
- H-H: tm_eerikkila_normit.js → eerikkilaTaso()
- TK: docs/testit_indeksit.js → TK_MERKKIRAJAT + tkLaskeMerkki()

---

## 6. KPI-KORTIN PRIORITEETTIHIERARKIA (Master_v16 Kehitys)

### Mittari 1 (vasen):
1. Jos flei_viimeisin > 0 → näytä FLEI %
2. Muuten jos hh_taso → näytä H-H (1–5) + label
3. Muuten → piilota

### Mittari 2:
1. Jos tki_viimeisin > 0 → näytä TKI (0–100) + mitali/kehityskohde
2. Muuten jos tsi_viimeisin → näytä TSI (±s) + tulkinta
3. Muuten → piilota

### Mittari 3: D1/D2
- Jos d1_taso JA d2_taso → näytä 🔵D1/🟢D2
- Muuten → piilota (d1_taso puuttuu useimmilta, TODO recalcHH)

### Mittari 4: Testikertoja (aina)
### Mittari 5: Streak (aina)

### Delta-badge (jokaisen numeron vieressä):
- Jos _edellinen saatavilla: ↑+0.5 (vihreä) / ↓−0.2 (punainen)
- Muuten: → (harmaa)
- Tooltip: "Edellinen: [arvo] ([pvm])"

---

## 7. SIGNAALIT (automaattiset herätteet)

| Signaali | Ehto | Badge | Taso |
|----------|------|-------|------|
| Hidden Gem | D2 ≥ 3.5 + D1 ≤ 2.5 + erotus ≥ 1.0 | PIILOHELMI | VP + valmentaja |
| X-Factor | mikä tahansa testi taso 5 | X-FACTOR | VP + valmentaja |
| Kehitysvauhti ↓ | delta < −0.3 | ↓ punainen | VP + valmentaja |
| Kehitysvauhti ↑ | delta > +0.5 | ↑ vihreä | VP + valmentaja |
| FLEI kriittinen | FLEI < 40% | KLINIKKA | VP (klinikkalähetys) |
| PHV huippu | maturity offset 0 ± 0.5v | PHV ⚠️ | VP + valmentaja |
| Kultaikkuna | ikä ≤ 12 + TKI < 40 | TEKNIIKKA 🔥 | Valmentaja |
| TSI korkea | TSI > 1.5s | PALLO ⚠️ | Valmentaja |
| Streak katkeamassa | streak > 7 + ei kirjausta tänään | — | AI-agentti (Sprint 6) |

---

## 8. SEURAKOHTAINEN DATAKARTTA

| Kenttä | SJK | Sibbo | Demo/KPV | Lähde |
|--------|-----|-------|----------|-------|
| hh_taso | ✅ | ❌ | ✅ | recalcHH |
| hh_viimeisin | ✅ lin30m/cmj/mas | ❌ | ✅ | Excel-tuonti |
| d2_taso | ✅ | ❌ | ✅ | recalcSMtasot |
| tsi_viimeisin | ✅ | ❌ | ❌ | recalcTSI |
| tki_viimeisin | ❌ | ✅ | ✅ | tekniikkakilpailu-tuonti |
| tki_merkki | ❌ | ⚠️ null (alle rajan) | ✅ | — |
| tki_kehityskohde | ❌ | ✅ | ✅ | — |
| tki_vahvuus | ❌ | ✅ | ❌ | — |
| flei_viimeisin | ❌ | ❌ | ✅ | FLEI-kartoitus |
| sbl/sfl/ll/diag/dfl | ❌ | ❌ | ✅ | FLEI-kartoitus |
| d1_taso | ❌ (TODO) | ❌ | ❌ | EI LASKETTU VIELÄ |
| pujottelu_hh | ❓ tarkistettava | ❌ | ✅ | H-H laaja tuonti |
| syotto_hh | ❓ tarkistettava | ❌ | ✅ | H-H laaja tuonti |
| syntymaVuosi | ⚠️ osittain | ❌ | ✅ | Excel-tuonti/vahvistus |
| hh_taso_edellinen | ❌ (syttyy seuraavalla testillä) | ❌ | ❌ | VAIHE 2 |

---

## 9. TUTKIMUSPERUSTA — lisäykset arkkitehtuuriin

### FIFA 11+ Kids (Ramos et al. 2024, N=10 000+)
- 48% vammariskin vähennys, 74% vakavien vammojen
- 7 harjoitusta, 5 vaikeustasoa, 15–20 min
- Integraatio: tm-microcycles.js Movement Prep / pre-harkka
- Prioriteetti: Sprint 5

### FMS + YBT + CMJ yhdistelmäseulonta
- YBT komposiitti < 89–94% = vammariski
- YBT anterior-asymmetria > 4 cm = riski
- CMJ viikoittainen Z-pisteseuranta = herkin väsymysindikaattori
- Integraatio: signaalikerros VP:lle
- Prioriteetti: Sprint 5–6

### Rotaatiotaito (LIIKE™ Rotaatiotaito-dokumentti)
- Torso-hip separation validoitu potkuennustaja (r=0.57–0.83)
- Spiral Line (DIAG-ketju) = rotaation anatominen perusta
- Body Reading: 4 komponenttia × 3 tasoa = havaintotyökalu
- 10 DIAG-harjoitetta (DIAG-001–010) = PANKKI-lisäys
- Integraatio: FLEI DIAG-ketjuun + Master_v16 Havainto
- Prioriteetti: Sprint 5 (harjoitteet), Sprint 6 (Body Reading)

### Euroopan huippuakatemiat (Ajax, Benfica, RB Salzburg)
- Testit palvelevat pelitapaa, eivät abstrakteja vertailuja
- RB Salzburg: 360° Soccerbot, IR-kamerat = suunta
- Ajax: yksilöllinen kehitys > joukkuemenestys nuorissa
- Integraatio: filosofinen validointi TM:n "pelaaja ensin" -periaatteelle

### Bio-banding (Fransen et al.)
- PHV-pohjainen ryhmittely harjoittelun suunnitteluun
- Fransenin menetelmä validoiduin jalkapalloilijoille
- Jo osittain toteutettu: PHV ohittaa Stage-luokituksen
- Integraatio: kehitysikkunat (VAIHE 3)

### Quadrant-malli (fysiologinen data)
- Metabolinen × neuromuskulaarinen kuormitus
- HRV (RMSSD_MEAN + RMSSD_CV) viikkotason seuranta
- Integraatio: Sprint 6+ kun Polar/Oura-data saatavilla

---

## 10. TOTEUTUSJÄRJESTYS

### Tehty (Sprint 4, 2026-06) ✅
- Detail-paneelit H-H/TSI/TKI normivertailuineen (VAIHE 1)
- Delta-badge hh_taso_edellinen + tki_edellinen (VAIHE 2)
- MAS-yksikköbugi korjattu (km/h ÷ 3.6 laskennassa)
- TMBus→Firestore migraatio Kehitys-näkymässä
- Case-insensitive joukkuesuodatus

### Seuraavaksi (Sprint 4, vko 25–27)
- H-H pujottelu/syöttö TSI-detail-paneeliin (3-portainen)
- TKI per-laji kynnysarvot detail-paneeliin
- Kultaikkuna-konteksti TKI-paneeliin (ikäperustainen)
- EI/FVP/VNE H-H detail-paneeliin (kun laaja H-H)
- Kehitysikkunat (VAIHE 3)
- Reseptimalli (VAIHE 4)

### Sprint 5 (vko 27–29)
- 10 DIAG-harjoitetta PANKKI:in (rotaatiotaito)
- FIFA 11+ Kids Movement Prep -integraatio
- Body Reading havaintotyökalu Master_v16:een
- D1 FPI laskenta (0–100)

### Sprint 6+ (vko 29+)
- AI Behavioural Science -agentti
- Polar/Oura quadrant-integraatio
- OVR aktivointi (kun ≥3 dimensiota)
- RAE-korjaus OVR:iin
- CMJ Z-pisteseuranta
- YBT-signaali

---

## 11. FIRESTORE-KENTTÄLUETTELO (täydellinen)

### Pikakentät pelaajat/{id} (merge:true)

```
# H-H fyysinen
hh_viimeisin: {lin30m, cmj, mas, sm_juoksu, sm_pallo, lin5m, lin10m, sj, kasirata, pujottelu, syotto}
hh_taso: number (1–5)
hh_taso_edellinen: number
hh_taso_edellinen_pvm: string
hh_pvm: string (YYYY-MM-DD)
d2_taso: number
sm_juoksu_taso: number (1–5)
sm_pallo_taso: number (1–5)
sm_juoksu_viimeisin: number (s)
sm_pallo_viimeisin: number (s)

# TSI
tsi_viimeisin: number (s, SM-pallo − SM-juoksu)
tsi_pvm: string

# TKI
tki_viimeisin: number (0–100)
tki_merkki: string|null (kulta/hopea/pronssi)
tki_kehityskohde: string (syotto/pujottelu/ponnauttelu/kuljetus_laukaus)
tki_vahvuus: string
tki_pvm: string
tki_edellinen: number
tki_edellinen_pvm: string

# FLEI
sbl, sfl, ll, diag, dfl: number (1–3)
flei_viimeisin: number (0–100%)

# Biologinen
syntymaVuosi: number
sukupuoli: 'M'|'N'
phv_tila: string

# Käyttäytyminen
xp: number
streak: number
streak_paivitetty: string

# Hidden Gem
hidden_gem: string|null (ehdokas/vahvistettu/eliitti)

# Recalc
_recalc: true (merkki lasketuista pikakentistä)
```

### Normifunktiot (lennossa, EI tallenna)

```javascript
// tm_eerikkila_normit.js
eerikkilaTaso(arvo, testi, ika, sp)      // → 1–5 (H-H fyysinen)
eerikkilaTaso(arvo, testi, ika, sp)      // → 1–3 (pujottelu/syotto)
eerikkilaNormiarvo(testi, ika, sp)       // → normi-kynnysarvo (taso-3)

// docs/testit_indeksit.js
tkLaskeMerkki(laji, arvo, ika, sp)       // → kulta/hopea/pronssi/null
tkLaskeTKI(merkit)                        // → 0–100
laskeEI(cmj, sj, ika)                    // → {arvo, tulkinta, tavoite}
laskeFVP(m5, m30, pelipaikka)             // → {arvo, profiili, tulkinta}
laskeVNE({cmj, sj, m5, m30, taso30m})    // → {profiilityyppi, kuvaus}
laskeTSI(smPallo, smJuoksu)              // → sekuntia (+ = pallo hidastaa)
```

---

## 12. VP JOUKKUE-MODAALI — sisältöspeksi (`_jsvModal` + `_jspModal`)

> VP_v25 joukkuenäkymä: pulssikortin klikkaus → joukkue-modaali → per-pelaaja pikakatsaus.
> Tämä osio määrittelee mitä tietoa näytetään. Toteutusjärjestys Sprint 5.

### A. Joukkue-modaali (`_jsvModal`, kaksipalstainen)

**Vasen sarake (radar + joukkue-KPI):**

| Elementti | Lähde | Tila |
|-----------|-------|------|
| 5D-radar (D1–D5) | joukkueen pelaajien ka. dimensioittain | ✅ toteutettu |
| Radar skaala 1–5 | D1-akseli | ✅ toteutettu |
| Kattavuusprosentti | "H-H 14/18 · TKI 8/18 · FLEI 3/18" — testattu/koko per datasetti | ⏳ UUSI |
| Viimeisin testipvm | joukkueen viimeisin `hh_pvm` / `tki_pvm` | ⏳ UUSI |
| Hidden Gem -ehdokkaat | lukumäärä joukkueessa (§7 ehto) | ⏳ UUSI |

**Oikea sarake (pelaajataulukko):**

| Sarake | Lähde | Tila |
|--------|-------|------|
| Nimi | pelaajadok | ✅ |
| H-H taso | `hh_taso` | ✅ |
| TKI / FLEI | `tki_viimeisin` / `flei_viimeisin` | ✅ |
| PHV-tila | `phv_tila` (PRE/LÄH/PH/POST/AN) | ⏳ UUSI — kriittinen §28 tulkinnalle |
| Delta H-H | `hh_taso` − `hh_taso_edellinen` → ↑/↓/→ | ⏳ UUSI |
| Delta TKI | `tki_viimeisin` − `tki_edellinen` → ↑/↓/→ | ⏳ UUSI |
| Viimeisin testi | max(`hh_pvm`, `tki_pvm`) → "vanhentunut" jos >90pv | ⏳ UUSI |
| → pikakatsaus | klikkaus avaa `_jspModal` | ✅ |

### B. Per-pelaaja pikakatsaus (`_jspModal`, 640px)

**Hero-rivi (toteutettu):** nimi + badge vasemmalla, 5D-radar oikealla (kompakti 220px).

**Välilehdet (nykyiset):** Fyysinen · Tekninen · Peli · Kehitys.

**Lisättävät elementit per välilehti:**

| Välilehti | Lisäys | Lähde | Tila |
|-----------|--------|-------|------|
| Fyysinen | EI/FVP/VNE (kun laaja H-H) | §3 Kerros B | ⏳ kuten §4 H-H detail |
| Fyysinen | H-H pujottelu/syöttö 3-port | §5 | ⏳ kuten §4 TSI detail |
| Tekninen | Per-laji kynnysarvot (kulta/hopea/pronssi) | §4 TKI detail | ⏳ |
| Tekninen | Kultaikkuna-konteksti (ikäperustainen) | §4 TKI detail | ⏳ |
| Peli | ADAR-viimeisin (A/D/Act/R) + havaintomäärä | `adar_viimeisin` | ⏳ |
| Kehitys | Delta-aikajana (2 viimeistä mittausta) | `_edellinen`-kentät | ⏳ |

### C. Signaalit joukkue-modaalissa

VP:n joukkue-modaali näyttää joukkuetason signaalit (§7) suoraan radarin alla:

| Signaali | Ehto | Näyttö |
|----------|------|--------|
| Hidden Gem | ≥1 joukkueessa | "🔷 2 piilohelmiehdokasta" (klikkaa → listaa nimet) |
| X-Factor | ≥1 taso 5 | "⭐ 1 X-Factor" |
| PHV ⚠️ | ≥1 PH-tilassa | "⚠️ 3 kasvupyrähdyksessä — kuormarajoitin" |
| FLEI kriittinen | ≥1 <40% | "🔴 1 klinikkalähetys" |
| Kehitysvauhti ↓ | ≥1 delta<−0.3 | "↓ 2 laskussa" |

Kaikki pikakentistä — ei alikokoelmakyselyjä (§1 periaate 1+7).

---

*KPI Master Architecture + Tutkimusperusta · TalentMaster™ · 2026-06-07*
*Lähde: käyttäjän kanoninen referenssi. Tislaus CLAUDE.md §30.*
