# TalentMaster — Moat & tulevaisuuskestävyys (arkkitehdin näkemys)

> 2026-06-17. Senioriarkkitehdin strateginen kartta: mikä on suojattavaa pääomaa (kantaa + kasvaa + maksetaan),
> mikä pakollinen muttei erottava, mikä katoavaa. + datamallin tulevaisuuskestävyys-auditti.
> Liittyy: STRATEGIA.md (bisnesmalli, RAE, kv) · §20 (integraatiot) · §30 (KPI/data) · §33 (skaalautuvuus/velka) · §2 (RAE-tiede).
> Periaate: **ominaisuudet ovat kopioitavissa; metodologia + data + luottamus compoundaavat.**

---

## 1. MOAT-KARTTA — kolme kerrosta

### A. Suojattava pääoma — kantaa tulevaisuuteen, compoundaa (TÄHÄN investoidaan)
| Pääoma | Missä elää | Miksi moat | Toimenpide |
|---|---|---|---|
| **Metodologia-IP** | RAE-korjaus (§2), FLEI, PHV/kehitysikkunat (§28), per-test-normit, suljettu silmukka | Dashboardin kopioi viikossa; **validoitua metodologiaa + tiedenarratiivia ei** | Vertaisarvioitu artikkeli (KIHU); normit lukittuna SSOT:ina |
| **Pitkittäisdata + PalloID** | `pelaajat/{palloID}`, kehitysrekisteri, benchmarks, §30 koonti | **Mitä kauemmin pyörii, sitä korvaamattomampi** — syvin compounding-moat | Kerää (adoptio); arkkitehtuuri datan ympärille (§2 alla) |
| **GDPR-luokan alaikäisdata** | §33 B4, Rules, suostumusketju | EU+lapset = este JA moat; liittotason luottamus | Retention, audit, field-level Rules, EU-residenssi |
| **Ekosysteemiasema** | PalloID-infra, TASO/liitto-integraatiot (§20), FIFA Art.19, API/MCP | Lock-in **datasta, ei sopimuksista** — konvergoit yhdistäväksi kerrokseksi | Integraatiot + B2G-asema |
| **Filosofia operationalisoituna** | 5D koko-ihminen, RAE-reiluus, ei-menetyskehys (§7.22) | Arvopohjainen erottautuja — resonoi liitoille + vanhemmille | Pidä invarianttina |

### B. Pakollinen, muttei moat — välttämätön adoptiolle, ei erottava
UI-selkeys, mobiili-ensin, onboarding, FIFA-kortti, dashboardit, i18n, teema. **Vipu moatiin** (adoptio → data), ei moat itse. Pidä "riittävän hyvänä", älä yli-investoi.

### C. Katoava / hyödyke
Raaka AI-generointi (narratiivit/nudget — malli on hyödyke, **arvo on syötetyssä metodologiassa+datassa**), geneerinen analytiikka. Älä rakenna erottautumista näiden varaan.

---

## 2. DATAPÄÄOMA — tulevaisuuskestävyys-auditti

Datapääoma on syvin moat (1.A) → arkkitehtuurin **tärkein pitkän tähtäimen kysymys.**

1. **§20 PalloID-ylätaso (migraatiovelka #1).** Nyt `seurat/{id}/pelaajat/{pid}` **sitoo datan seuraan**. GDPR Art. 20 (kannettavuus) + kv-skaalaus + pelaajan datan omistus (FIFA 18v) vaativat tulevaisuudessa `pelaajat/{palloID}` ylätasolle + seuraliitokset viitteillä. **ISO migraatio — EI nyt** (kirjattu velaksi STRATEGIA §3), mutta tämä on **se rakenteellinen päätös joka määrää kv-skaalan ja datan kannettavuuden.** Suunnittele ennen kuin dataa on liikaa migratoitavaksi.
2. **Retention + oikeus tulla unohdetuksi** (§33 B4) — alaikäisdata vaatii elinkaaripolitiikan. Rakennettava ennen isoa volyymia.
3. **Kannettavuus** — pelaajaportti (Sprint 4), scout-ikkunat, datan vienti. Pelaajan datan omistus = luottamus + FIFA Art.19bis B2G-tuote.
4. **AI provider-agnostinen + pseudonymisoitu** (§21 `tm_ai.js`) — älä lukkiudu malliin; älä lähetä lasten henkilötietoa raakana ulos.
5. **Pitkittäiskoonti** (§30, gate ≥2 mittausta) — datan arvo realisoituu kun kausia on useita. Rakennuspalikat (`*_edellinen`-deltat, `perTestTasot`) ovat jo olemassa.

---

## 3. ASIAKASARVO SEGMENTEITTÄIN (mistä maksetaan)

- **Valmentaja:** säästää aikaa + kertoo mitä tehdä (resepti/suljettu silmukka) + toimii kentällä → adoptio.
- **Valmennuspäällikkö:** lahjakkuus + harha (RAE), valmentajien kalibrointi, päätösten puolustus, raportointi ylös.
- **Liitto / B2G (iso raha + tulevaisuus):** validoitu **tiede + skaala + luottamus** — ei ominaisuudet. Talent wastage -vähennys, compliance.
- **Vanhempi/pelaaja (Solo):** kehittyvä-ihminen-näkymä, motivaatio, reiluus (myöhäissyntynyt ei katoa).
- **Scout:** datan kannettavuus, FIFA-ikkunat.

---

## 4. STRATEGISET PRIORITEETIT (arkkitehdin suositus)

1. **Syvennä metodologia- + datamoattia** — kaikki muu kopioitavissa. Vertaisarvioitu artikkeli = korkein strateginen ROI (STRATEGIA §3: "yksi artikkeli avaa enemmän ovia kuin 10 pilottiseuraa").
2. **Adoptio-lentopyörä:** selkeys/mobiili → enemmän dataa → validointi isommalla N:llä → liittouskottavuus → skaala. (Tämän session selkeystyö ruokkii juuri tätä.)
3. **Datamallin tulevaisuuskestävyys** — §20 PalloID-ylätaso-suunnitelma + retention, ennen kuin volyymi kasvaa.
4. **AI mahdollistajana**, ei moattina — pseudonymisoitu, halpa malli massaan.

**Suurin riski:** ominaisuusmäärä karkaa adoption + datan edelle. **Pilotin pullonkaula on data + käyttöönotto, ei ominaisuudet.** + yhden kehittäjän monoliitti-velka (§33 B1 modularisointi). Kuri: vähemmän uutta, syvempää validointia.

---

## 5. KONKREETTISET SEURAAVAT ARKKITEHTUURILIIKKEET (tiekartta, ei "kaikki nyt")

| Prio | Liike | Miksi |
|---|---|---|
| 🔴 | Vertaisarvioitu FLEI/RAE-artikkeli (KIHU) | Korkein strateginen ROI — metodologiamoat näkyväksi |
| 🔴 | §20 PalloID-ylätaso migraatio**suunnitelma** (ei toteutus vielä) | Määrää kv-skaalan + datan kannettavuuden + GDPR Art.20 |
| 🟡 | Pitkittäiskoonti (§30) kun N riittää | Datapääoma realisoituu |
| 🟡 | GDPR-retention + audit (§33 B4) | Luottamusmoat ennen volyymia |
| 🟡 | Frontend-modularisointi (§33 B1, strangler) | Yhden kehittäjän velka → skaalautuvuus |
| 🟢 | Provider-agnostinen `tm_ai.js` + Claude `aiProxy`:yn | AI mahdollistajana, ei lukkona |

> **Punainen lanka:** suojaa ja syvennä sitä mikä compoundaa (metodologia + data + luottamus). Pidä UI/AI riittävän hyvänä ruokkimaan adoptiota. Älä erehdy luulemaan kiillotusta tai AI:ta moatiksi.
