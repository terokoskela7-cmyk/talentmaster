# TalentMaster — hinnoittelu- ja laskutusmalli

> Laadittu 2026-06-25. Kanoninen hinnoittelu + laskutus + ALV-ehto. Uudelleenkäytettävä kaikille seuroille.
> **Ei juridinen/kirjanpidollinen neuvonta** — varmista ALV-rekisteröinnin ajoitus + sanamuodot kirjanpitäjältä.

## 0. Yritys + ALV-status (2026-06)
- Laskuttaja: **TalentMasterID Oy**, Y-tunnus **3616734-7**, Vaasa.
- **ALV-status: EI arvonlisäverovelvollinen** (liikevaihto alle 20 000 €/v, AVL-alaraja 2025→ 20 000 €).
  → Laskut **ilman ALV:tä** toistaiseksi. Ei myöskään oikeutta vähentää ostojen ALV:tä.
- **Seuranta:** rekisteröidy ALV:hen **ennen kuin kalenterivuoden liikevaihto ylittää 20 000 €.** Skaalauksessa (useita seuroja) tämä tulee vastaan nopeasti.

---

## 1. ALV-EHTO (kirjattava jokaiseen sopimukseen) ⚑
**Hinnat ovat arvonlisäverottomia (alv 0 %). ALV lisätään hintoihin, jos/kun TalentMasterID Oy tulee
arvonlisäverovelvolliseksi.**

- **Nyt (ei rekisteröity):** lasku = nettohinta, ei ALV-riviä. Laskulle maininta: *"Ei arvonlisäverovelvollinen
  (liikevaihto alle 20 000 €/v)."*
- **Rekisteröitymisen jälkeen:** nettohinta + **25,5 %** (yleinen ALV-kanta 2026). Esim. 50 € → 50 € + 25,5 % = **62,75 €**.
- **Periaate:** sovi AINA **netto + ALV erikseen** (ei "sis. alv"). Näin ALV tulee asiakkaan maksettavaksi päälle,
  ei katteesta. "Sis. alv" söisi rekisteröityessä 25,5 % katteesta + pakottaisi hintaneuvotteluun.

---

## 2. Kaksi tulovirtaa
| Virta | Asiakas | Hinta | Laskutus |
|---|---|---|---|
| **B2B — seuralisenssi + pelaajamaksu** | Seura (yhdistys) | Lisenssi + per-pelaaja | Lasku/verkkolasku seuralle |
| **B2C — Solo Player™** | Perhe suoraan | 4,99 €/kk | Stripe (erillinen, P1) |

> **Kriittinen periaate:** B2B-pelaajamaksu **seura maksaa koostettuna** (lasku = lisenssi + 2,5 € × aktiiviset pelaajat),
> seura perii perheiltä jäsenmaksuissa. EI perheiden mikromaksuja (vältetään alaikäisten maksut + GDPR-monimutkaisuus).
> Perheiden suora maksu = vain Solo-B2C-tuote (Stripe).

---

## 3. B2B-hinnoittelu — pakettitasot (kaikki hinnat alv 0 %, ks. §1)

> **Kategoriaperiaate (BP4B):** TalentMaster ei kilpaile hallinnossa (Jopox/MyClub) — se tuottaa pelaajankehitys-/talenttiarvoa.
> Value metric = **kehityssyvyys**, ei hallinto. Per-player = premium-vipu (Taso 2), ei grassroots-vero.

| Taso | Kohde | Seuralisenssi/kk | Pelaajamaksu/kk | Ydinarvo |
|---|---|---|---|---|
| **1 Kehitys** | kilpa-/kehittävä seura | **50–90 €** | **2,5 €/aktiivipelaaja** | Testaus (H-H/TKI/FLEI) + kehitysvauhti + harjoitegeneraattori + kehityssilmukka |
| **2 Talentti/Akatemia** | akatemia, talenttiohj., EPPP Cat 2–3/NLZ/RJO | **150–400 €** | **4–12 €/aktiivipelaaja** *(tai 500–2 000 €/v/joukkue)* | + bio-ikä (PHV) + RAE-korjaus + herkkyysikkunat + syvänäkymä + ADAR + VAI+ + passi |
| **Enterprise** | liitto, moniseura, residenssi | custom | per-player-in-programme | + moniseura-aggregaatio + benchmark + API/white-label |

**Adoptio-kerros:** ilmainen määräaikainen pilotti (1 ikäluokka) → land → Taso 1 → Taso 2 (land-and-expand). Solo B2C = §2 (perhe suoraan).

**Kansainvälinen hinnoittelu (BP4 §8):** pääakseli = **segmentti** (taso yllä, kattaa 3–5× hajonnan); toissijainen = **maakerroin ±25 %** — Premium (DK, NO) · Standard (SE, NL, UK, DE, FR, FI) · Value (ES, IT). Lokalisoi per maa; **premium pitää instituutio-/akatemiasegmentissä, ei grassroots-volyymissä.**

> **Nykyinen pilottimalli (Sibbo ym.) = Taso 1 -baseline:** pilotti 50 €/kk + 0 €/pelaaja → jatko 50 €/kk + 2,5 €/aktiivipelaaja. Akatemiapilotti (Taso 2) erikseen: `AKATEMIA_PILOTTITARJOUS.md`.

---

## 4. "Aktiivinen pelaaja" — laskutuksen peruste
Per-pelaaja-maksu lasketaan **aktiivisista pelaajista** kuukauden lopun tilanteen mukaan. Ehdotettu määritelmä
(järjestelmä voi laskea tämän automaattisesti olemassa olevasta datasta):
- **Aktiivinen = pelaaja jolla on `suostumusTila: 'annettu'` JA kuuluu aktiiviseen joukkueeseen** seurassa.
- EI lasketa: `pilotti`/`odottaa`-tilassa olevat (ei vielä suostumusta), deaktivoidut, demo.
- Laskenta: `seurat/{seuraId}/pelaajat` joissa `suostumusTila=='annettu'` (pikakenttä, §26) → kuukauden lopun lukumäärä.
- **Automatisointi (myöhemmin):** kuukausittainen ajo (Cloud Function) → aktiivisten pelaajien määrä per seura →
  laskutusrivi. Pilotissa lasketaan käsin (pelaajat 0 € → ei vielä tarvetta).

---

## 5. Laskutustapa vaiheittain
- **Pilotti (1 seura):** **perinteinen lasku/verkkolasku** TalentMasterID Oy:n laskutusohjelmasta. 50 €/kk (tai koko
  jakso kerralla). Pelaajat 0 € → vain lisenssilasku. Yhdistys maksaa pankkisiirrolla.
- **Skaalaus (useita seuroja + per-pelaaja):** **verkkolasku laskutusohjelmasta** (seurat = yhdistyksiä, tarvitsevat
  laskun kirjanpitoon; per-pelaaja = laskurivin määrä). Vaihtoehto: Stripe Billing/Invoicing automatisointiin.
- **Solo-perheet (B2C):** **Stripe** (P1), automaattinen tilaus 4,99 €/kk, erillinen tuotteesta.

---

## 6. Sibbo-pilotti (konkretia, sovittu 2026-06)
- Kohde: 2014–2016 syntyneiden joukkueet, aktiivipilotti n. 2–3 kk (VP + valmentajat + perheet käyttöön).
- **Pilotti:** seuralisenssi **50 €/kk (alv 0 %)**, pelaajat **0 €**.
- **Pilotin jälkeen:** kaikki seuran joukkueet käyttöön; **50 €/kk lisenssi + 2,5 €/kk / aktiivinen pelaaja**.
- Lasku: TalentMasterID Oy → Sibbo-Vargarna, ALV-ehto §1, maininta verottomuudesta.
- Pilottisopimukseen kirjattava: hinnat (alv 0 %), ALV-ehto, kesto, jatko (per-pelaaja), "aktiivinen pelaaja" -määritelmä.

---

## 7. Muistilista
- [ ] Pilottisopimus/tarjous Sibbolle (hinnat alv 0 % + ALV-ehto §1).
- [ ] Lasku 50 €/kk (tai jakso) — laskutusohjelmasta, verottomuusmaininta.
- [ ] Seuraa liikevaihtoa → ALV-rekisteröinti ennen 20 000 €.
- [ ] (Myöhemmin) aktiivisten pelaajien automaattilaskenta + per-pelaaja-laskutus.
- [ ] (Myöhemmin) Solo B2C Stripe (P1).
- [ ] Varmista ALV-ajoitus + sanamuodot **kirjanpitäjältä**.
