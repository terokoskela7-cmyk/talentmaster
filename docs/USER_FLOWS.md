# TalentMaster™ — Käyttäjäpolkumatriisi
## Päivitetty 2026-04-09

> Ennen kuin rakennetaan uusi ominaisuus, tarkistetaan tästä dokumentista
> miten se vaikuttaa jokaiseen rooliin. Päivitetään aina kun uusi toiminto
> suunnitellaan tai toteutetaan.

---

## Roolien lyhenteet

| Lyhenne | Rooli | Näkymä |
|---|---|---|
| SA | Super Admin | TalentMaster_Admin.html |
| VP | Valmennuspäällikkö | TalentMaster_VP_v18.html |
| VAL | Valmentaja + kenttäroolit | TalentMaster_Master_v9.html |
| TST | Testaaja / Fysiikkavalmentaja | TalentMaster_Harjoitettavuus_Lomake.html |
| PEL | Pelaaja | TalentMaster_Pelaaja_v1.html |
| UTJ | Urheilutoimenjohtaja | TalentMaster_UTJ_v1.html |
| VAN | Vanhempi / Huoltaja | TalentMaster_Vanhempi.html |

---

## Toiminto 1 — Pelaajan rekisteröinti

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | Luo seura + VP-käyttäjä | Admin.html | ✅ OK |
| VP | Luo joukkue, lähettää rekisteröintikutsun vanhemmalle | Seura.html | ✅ OK |
| VAL | Näkee uuden pelaajan joukkuelistassaan | Master v9 | ✅ OK |
| PEL | Kirjautuu salasanalinkillä | Pelaaja_v1.html | ✅ OK |
| VAN | Täyttää suostumuslomakkeen, saa salasanalinkin | Rekisterointi.html + Vanhempi.html | ✅ OK testattu |

**SJK-pilotin erityisprosessi (2026-04-09):**
Pelaajat rekisteröidään ensin ilman suostumuslomaketta.
VP ja valmentajat tarkistavat testidatan. Vasta kun data OK
→ suostumuslomakkeet huoltajille → pelaajatunnukset.

**Tyttöjoukkue (SJK U14/15T — uusi 2026-04-09):**
Ensimmäinen tyttöjoukkue pilotissa. Mirwald-kaava eri parametrit
tytöille — tarkistettava Sprint 5:ssä ennen PHV-laskentaa.

Avoin bugi: `joukkueNimi` tallentuu ID:nä eikä näyttönimenä rekisteröintilomakkeesta.

---

## Toiminto 2 — Testitapahtuman luominen

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| SA | Näkee kaikki tapahtumat | Admin.html | EI vielä |
| VP | Luo testitapahtuman kalenteriin | VP_v18 Kalenteri | ✅ OK |
| VAL | Luo tapahtuman omalle joukkueelleen | Master v9 Kalenteri | ✅ OK |
| TST | Avaa tapahtuman testipäivänä | Harjoitettavuus_Lomake.html | KESKEN tapahtumaId-integraatio |

**Huomio:** Firestore-kokoelma on `testitapahtumat` (EI `tapahtumat`).
Avoin: Lomake ei lue `tapahtumaId` URL:sta — hakee pelaajat joukkueen mukaan.

---

## Toiminto 3 — Harjoitettavuuskartoituksen suorittaminen

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Näkee tapahtuman tilan + voi tuoda historiadata Excelillä | VP_v18 + Excel-pohja | ✅ Excel-pohja valmis |
| TST | Syöttää tulokset protokollan mukaan | Harjoitettavuus_Lomake.html | KESKEN tapahtumaintegraatio |

**Kolme testikerrosta:**
1. Tekniikkakilpailut: ponnauttelu, syöttö, pujottelu, kuljetus-laukaus (U8–U13)
2. H-H ominaisuustestit: nopeus / ketteryys / voima / tekniikka / kestävyys (U10–U19)
3. Harjoitettavuuskartoitus: U12 (9 testiä, max 27p) / U15 (13 testiä, max 39p)

**Testipankki (tm_testipankki.js):** 64 testiä, 8 protokollaa.
FLEI: 5 ketjua (SBL / SFL / LL / DIAG / DFL) — DIAG = SL+FL pysyvästi (Wilke 2016).

---

## Toiminto 4 — Tulosten tarkastelu

| Rooli | Mitä näkee | Missä | Tila |
|---|---|---|---|
| SA | Kaikki kartoitukset | Admin.html | EI vielä |
| VP | FLEI, ikäluokittain, trendit, X-Factor, Hidden Gem | VP_v18 Kartoitukset | KESKEN |
| VAL | Tilannekortti + Valmentaja_Matriisi.html | Master v9 + matriisi | ✅ matriisi valmis, PENDING deploy |
| TST | Tallennusvahvistus | Harjoitettavuus_Lomake.html | ✅ OK |
| PEL | FLEI-tulos selkokielellä + omatoimiohjelma | Pelaaja_v1.html | KESKEN FLEI-integraatio |
| VAN | Lapsen FLEI + kehityssuositukset | Vanhempi.html | KESKEN UI valmis |

---

## Toiminto 5 — Biologisen iän mittaus

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Näkee PHV-tilan tilastollisesti | VP_v18 | EI vielä |
| VAL | Näkee PHV-jakauman + kuormitusrajoitukset | Master v9 | EI vielä |
| TST | Mittaa pituus/paino/istumapituus → Excel-pohja Lehti 1 | Excel-pohja | ✅ Excel valmis |
| PEL | Kasvupyrähdyksen vaiheen näyttö selkokielellä | Pelaaja_v1 | EI vielä |
| VAN | Kuormitusrajoitusvaroitus PHV-huipulla | Vanhempi.html | EI vielä |

`TM_LASKE_BIOIKA()` valmis testipankissa — tallentaa `phv_tila` + `maturity_offset` Firestoreen.
**Tyttöjoukkue:** Mirwald eri parametrit — tarkistettava Sprint 5 ennen SJK U14/15T -aktivointia.

---

## Toiminto 6 — IDP (Individual Development Plan)

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Hyväksyy IDP-aktivoinnin, seuraa tilastoja | VP_v18 | KESKEN aktivointilogiikka |
| VAL | Tekee havaintoja, aktivoi IDP:n (3 reittiä) | Master v9 | KESKEN havainnot |
| TST | FLEI → IDP automaattisesti | IDP-kortti v3 | KESKEN kytkentä |
| PEL | Kehityskortti: vahvuudet 70%, kehityskohteet 30% | IDP_Kortti_v3.html + Pelaaja_v1 | KESKEN kortti valmis |
| VAN | Lapsen kehityskortti selkokielellä | Vanhempi.html | KESKEN UI valmis |

**3 aktivointireittiä:**
1. Manuaalinen pyyntö (VAL/TV/VP)
2. Automaattisignaali (X-Factor / Hidden Gem)
3. Talenttiohjelma (KORI-kriteerit, 20+20/seura)

**3 tasoa:** Perus (kaikki) / Laajennettu (signaali/pyyntö) / Talenttikortti (KORI)

---

## Toiminto 7 — ADAR / Game IQ

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Joukkueen D4-profiili, ADAR-trendit | VP_v18 | EI vielä |
| VAL | Täyttää ADAR-arvioinnin harjoitusten yhteydessä | Master v9 ADAR | KESKEN Firebase-integraatio |
| PEL | Peliäly-palaute ikäluokan mukaan | Pelaaja_v1 / IDP-kortti | EI vielä |

**Ikäluokkakohtaistus:**
- U8–U12: Havainnoija (vain Assess) — pelaaja ei tiedä
- U13–U15: Arvioija (A+D+A, max 12p) — narratiivi pakollinen
- U16–U19: Täysi ADAR (A+D+A+R + pelaajan reflektio)

**Huomio:** ADAR-pisteet tallennetaan `adar`-kokoelmaan, EI `havainnot`-kokoelmaan.

---

## Toiminto 8 — Kalenteri ja tapahtumat

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Näkee kaikkien joukkueiden tapahtumat | VP_v18 | ✅ OK |
| VAL | Näkee oman joukkueen tapahtumat | Master v9 Kalenteri | ✅ OK |
| TST | Avaa testauslomakkeen tapahtumasta | Harjoitettavuus_Lomake.html | KESKEN URL-parametri |
| PEL | Omatoimiharjoitteet viikkonäkymässä | Pelaaja_v1.html | KESKEN UI valmis |
| VAN | Lapsen harjoituskalenteri + streak | Vanhempi.html | KESKEN UI valmis |

**Kokoelmanimi:** `testitapahtumat` (EI `tapahtumat`)

---

## Toiminto 9 — Omatoimiharjoittelu ja streak

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Streakien poikkeamat dashboardissa | VP_v18 | EI vielä |
| VAL | Hälytys kun pelaajan streak katkeaa | Master v9 | EI vielä |
| PEL | Kirjaa T/D/S/P-harjoitteet, streak + fiilinki | Pelaaja_v1.html | ✅ kirjaus + fiilinki-lukitus OK |
| VAN | Lapsen streak + viimeisin kirjaus | Vanhempi.html | KESKEN UI valmis |

**Firestore-rakenne (toteutettu):**
```
seurat/{id}/pelaajat/{pelaajaId}/kirjaukset/{pvm}
  tyyppi: T/D/S/P, tehty: bool, kesto_min, rpe: 1-10
  aika: ilta/aamu/paiva
  fiilinki: 1-5
  uni: 1-3, lihaskunto: 1-3  ← mini-Hooper, U13+
  fiilinki_paivitetty: ISO-ts ← lukitusavain, 1 kirjaus/pv
```
Streak-historia: EI vielä Firestoreen (localStoragessa) — Sprint 5.

---

## Toiminto 10 — Teknis-fyysinen ohjelma

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | FLEI-jakauma — klinikkatrigger alle 40% | VP_v18 | EI vielä |
| VAL | 3+1-malli alkurutiinissa, ketjuprofiili per pelaaja | Valmentaja_Matriisi.html | ✅ valmis, PENDING deploy |
| TST | Kartoitus → FLEI → ohjelma generoidaan | Harjoitettavuus_Lomake.html | KESKEN generointi |
| PEL | D/S/P-omatoimiohjelma + ikäkohtainen kieli + Stage-badge | Pelaaja_v1 + IDP-kortti | ✅ harjoitelogiikka v4 integroitu |
| VAN | Lapsen omatoimiohjelma selkokielellä | Vanhempi.html | EI vielä |

Logiikka: `harjoitelogiikka_v4.js` + `tm_ketju_matriisi.js` → `generoimTehtavat(pelaaja)` → Firestore `omatoimi_ohjelmat`

---

## Toiminto 11 — Keräilykortit

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| PEL | Selaa kortteja, avaa lukittuja saavutuksilla | TalentMaster_Kortit.html | ✅ tuotannossa |
| VAN | Näkee lapsen korttikokoelman | TalentMaster_Kortit.html | ✅ tuotannossa |
| VP / VAL | — | — | Ei tarvetta |

**Spesiaalikorttiluokat:**
- 🔥 FIRE — kauden läpimurtokortit
- 💎 ICON — holografinen legendakortti
- ⭐ MILESTONE — kehityskortti (30pv putki / FLEI 80+)
- 🌟 TOTY — Team of the Year

Avoin: Milestone-kortit eivät vielä kytkeydy Firestoreen — lukituslogiikka staattinen.

---

## Toiminto 12 — UTJ-kasvattisuppilo

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| UTJ | Seuraa kasvattien määrää edustusjoukkueessa | TalentMaster_UTJ_v1.html | ✅ tuotannossa |
| VP | Strateginen metriikka | UTJ_v1.html tai VP_v18 | KESKEN |
| SA | Kaikki seurat | — | EI vielä |

**Firestore:** `utj_data/{kausi}` → `{kasvatteja, vlYkk, minuuttia, seurat[]}`
Fallback: demo-aikajana jos Firestore tyhjä.

---

## Toiminto 13 — Harjoitteluseuranta (VP:n kenttäkäynti) — UUSI 2026-04-09

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Kirjaa kenttäkäynnin (7 kriteeriä 1-10 + toimenpide) | VP_v18 Valmentajat-tabi | ✅ tuotannossa |
| VP | Näkee yhteenvedon Power BI -tyylisesti | VP_v18 Osaaminen-näkymä | ✅ tuotannossa |
| VP | Suodattaa per valmentaja | VP_v18 valmentajasuodatin | ✅ tuotannossa |
| VAL | Näkee omat arviointinsa | Master v9 | EI vielä |
| UTJ | Aggregoitu harjoitteluseuranta | VP_v18 | KESKEN |

**7 kriteeriä (asteikko 1-10, tavoite suluissa):**
1. Valmennuksen toiminta on innostavaa (8)
2. Pelaajat liikkeessä harjoitusajasta (8)
3. Toistot — pallokosketukset (7)
4. Toistot — teknis-taktinen (7)
5. Pelaajat yrittävät täysillä (8)
6. Toiminta pelin vaatimusten mukaan (7)
7. Seuran painopiste näkyy (7)

**Firestore:** `seurat/{id}/mentoroinnit/{id}`
**VP-näkymä:** kortit grid + popup + käyntihistoria max 10 + KPI-rivi + kriteeripalkistot + trendi SVG + valmentajasuodatin

---

## Toiminto 14 — Pelihavainto (TIPS) — SUUNNITELTU Sprint 5

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VAL | TIPS-arvio 24h sisällä ottelusta | Master v9 (tuleva) | SUUNNITELTU |
| PEL | Oma arvio 48h sisällä — näkee valmentajan vasta oman jälkeen | Pelaaja_v1 (tuleva) | SUUNNITELTU |
| VP | Molemmat arviot + FLEI/PHV/bio-ikä/RAE vierellä | VP_v18 (tuleva) | SUUNNITELTU |
| VAN | Pelkistetty kehitysnäkymä | Vanhempi.html (tuleva) | SUUNNITELTU |
| UTJ | Aggregoitu joukkuetaso | VP_v18 (tuleva) | SUUNNITELTU |

**TIPS-kriteerit (1-10):**
- T = Tekninen suoritus paineessa (D2)
- I = Pelikuva — Game IQ (D4)
- P = Persoona — intensiteetti (D3)
- S = Suorituksen nopeus (D1+D4)
- \+ IDP-tavoitteen toteutuminen (TM-uniikki 5. kriteeri)

**Prosessi:**
```
Ottelu
  → Valmentaja kirjaa TIPS 24h (Master v9)
  → Pelaaja arvioi 48h (Pelaaja_v1) — EI näe valmentajan arviota ennen omaa
  → VP näkee molemmat + konteksti (FLEI + PHV + bio-ikä + RAE)
  → Kehityskeskustelu → IDP päivittyy
```

**Ikävaiheen adaptaatio:**
- Leikkija U8–12: kuvakysymykset, ei numeroita
- Rakentaja U13–16: TIPS 1–10 + IDP + vapaa havainto
- Showcase U17–19: TIPS + positiokohtainen + vertailu edelliseen

**Firestore:** `pelaajat/{id}/pelihavainnot/{otteluId}`
**KV-perusta:** Ajax TIPS, GPAI (Mitchell 1995), Premier League EPPP
**Demo:** `TalentMaster_Pelihavainto_Demo.html` (offline, EI GitHubissa)

---

## Toiminto 15 — Testidatan tuonti (Excel → Firestore) — UUSI 2026-04-09

| Rooli | Mitä tekee | Missä | Tila |
|---|---|---|---|
| VP | Täyttää Excel-pohjan testidatalla | TalentMaster_Testidatan_Tuontipohja.xlsx | ✅ Excel valmis |
| VP | Lataa Excelin tuontityökaluun | VP_v18 tai Admin.html (tuleva) | EI vielä |
| SA | Tarkistaa tuodun datan | Admin.html | EI vielä |

**Excel-pohja (5 välilehteä):**
- `0_OHJEET` — VP:n käyttöohjeet
- `1_Pelaajat` — perustiedot + PHV-data (pituus/paino/istumapituus)
- `2_HH_Testit` — nopeus/ketteryys/voima/tekniikka/kestävyys, TSI automaattinen
- `3_Harjoitettavuus` — pisteet 1–3, FLEI% automaattinen kaavalla
- `4_Tekniikkakilpailut` — syöttö+pujottelu+ponnauttelu, paras automaattinen

**Tuontiprosessi:**
```
VP täyttää Excel
  → SheetJS lukee selaimessa (client-side)
  → Cloud Function kirjoittaa Firestoreen oikeaan rakenteeseen
  → VP tarkistaa datan
  → Suostumuslomakkeet huoltajille (VASTA kun data OK)
  → Pelaajatunnukset aktivoidaan
```

---

## Kehitysprioriteettijärjestys (päivitetty 2026-04-09)

### Sprint 4 (käynnissä)
- ✅ Harjoitteluseuranta — VP:n kenttäkäynti Power BI -tyyli (Toiminto 13)
- ✅ Excel-tuontipohja rakennettu (Toiminto 15)
- 🔴 Pelaaja-sivu lag-bugi — tutkimatta
- 🔴 SJK-käyttöönotto: VP-tunnukset + joukkueet + pelaajat
- 🔴 Excel → Firestore tuontityökalu (Toiminto 15)
- 🟡 Fiilinki-kysely väärä U13-vaiheessa

### Sprint 5
- Pelihavainto Taso 1 + 2 (Toiminto 14)
- Tyttöjen PHV-kaava (Mirwald eri parametrit)
- Streak Firestoreen (pois localStoragesta)
- IDP-aktivointilogiikka 3 reittiä (Toiminto 6)
- Kenttähavainto → Firestore (Toiminto 7)

### Sprint 6-8
- Pelihavainto Taso 3 — FLEI + IDP-kytkös (Toiminto 14)
- AI Behavioural Science -agentti (vaatii 2–4vk dataa)
- Klinikkamoduuli FLEI < 40%
- Milestone-kortit Firestoresta (Toiminto 11)

---

## Tarkistuslista uudelle ominaisuudelle

- **SA:** Tarvitaanko hallintonäkymää?
- **VP:** Onko dashboard-näkymä? Miten seuraa?
- **VAL:** Toimiiko puhelimella kentällä?
- **TST:** Tarvitaanko erillistä lomaketta?
- **PEL:** Ikäkohtainen kieli? (leikkija/rakentaja/showcase)
- **UTJ:** Aggregoitu — ei yksittäisiä pelaajatietoja
- **VAN:** Selkokielinen? Huoltaja ymmärtää?
- **Data:** Firestore-polku + kentät suunniteltu?
- **Oikeudet:** Permission matrix tarkistettu?
- **Mobiili:** Toimiiko puhelimella?
- **FLEI:** Vaikuttaako laskentaan? 5 ketjua, DIAG = SL+FL
- **Ikävaihe:** PHV-rajoitin huomioitu? Tyttöjen Mirwald OK?
- **Kortit:** Vaikuttaako korttikokoelmaan? Milestone-kynnysarvo?
- **Harjoitelogiikka:** Käyttääkö `generoimTehtavat()` v4:aa?
- **Kokoelmanimi:** `testitapahtumat` (EI `tapahtumat`)
- **Tyttöjoukkue:** PHV-kaava tarkistettu ennen aktivointia?
