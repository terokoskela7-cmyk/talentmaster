# Code-tehtävä: Bio-banding V2 — Kehitysvaihe-taso (PHV-kaistat) + dual-taso

> Lähde: **Palloliiton virallinen materiaali** `Kehitysvaihekohtainen harjoittelu ja ominaisuustestien tulkinta` (Kevät 2025), s. 15–21 + `docs/BIOBANDING_ARKKITEHTUURI.md`. Tämä on bio-bandingin **arvokkain** osa (dual-taso = "fyysinen nyt ≠ lahjakkuus myöhemmin" näkyvänä, MyE.Way-näyttö 2 -pariteetti).
> **KESKEINEN KORJAUS 2026-07-01:** MyE.Way EI laske kehitysvaihe-tasoa Khamis-Rochesta eikä siirtämällä pelaajaa nuorempaan ikäluokkaan. Se **jakaa testitulosaineiston PHV-offset-kaistoihin** ja vertaa pelaajan tulosta **oman kaistansa tavoitetasoihin**. → **Menetelmä tarvitsee vain PHV-offsetin (on jo, Mirwald §25) + kehitysvaihe-tavoitetasotaulukot. EI Khamis-Rochea.**

## 🚦 GATE — ✅ AVATTU (taulukot kädessä 2026-07-01)
- ✅ **PHV-offset per pelaaja** — on jo (`maturity_offset`, Mirwald, §25). Ei tarvita Khamis-Rochea.
- ✅ **Kehitysvaihe-tavoitetasotaulukot SAATU** Palloliitolta (`kehitysvaihe.xlsx`, pojat + tytöt) → **generoitu datatiedostoksi `docs/kehitysvaihe_tavoitetasot.js`** (suoraan lähteestä, ei käsintranskriptiota). Sisältää `TM_KEHITYSVAIHE` = `{ KAISTAT, phvKaista(offset), TAULUKOT[sp][testi], kehitysvaiheTaso(arvo,testi,offset,sp) }`. **Verifioitu s.18 pariteettiankkureilla (Pelaaja A→4, Pelaaja B→2).**
- ⚠️ **2 ARVIO-solua (pojat P>+1) — lähdevirhe Eerikkilä/MyE.Way-taulukossa:** `lin20m` taso3 (lähteessä 3,08 = sama kuin taso4 → saavuttamaton) + `lin30m` taso3 (lähteessä 4,52 > taso2 4,46 → käänteinen). **Korvattu monotonisella arviolla** (suhteellinen interpolointi naapurikaistoista): 20m taso3 = **3,12**, 30m taso3 = **4,33**. Kirjattu tiedoston `TM_KEHITYSVAIHE.ARVIOT`-rekisteriin + `onArvio(testi,band,sp)`-helper (UI voi merkitä "* arvio"). **Bugi ilmoitettu Eerikkilään 2026-07 → vaihda viralliseen arvoon kun vahvistettu (yksi rivi/solu, päivitä ARVIOT + poista rekisteristä).** Muut 356 solua = virallisia; koko taulukko nyt monotoninen (tytöt olivat täysin puhtaat).
- ✅ **Ikäluokka-ristiintarkistus TEHTY (2026-07-01):** `kehitysvaihe.xlsx` ikäluokkasarakkeet vs. `EERIKKILA_NORMIT` — **129/132 soluriviä identtiset.** Vahvistaa että normimme ovat linjassa virallisen lähteen kanssa. **3 poikkeamaa, kukin 0,01 s, vain aikuis-/lähes-aikuistytöissä** (ei pilottidatassa): `nopeus_10m` T18 taso4 (meillä 1,77 → virallinen 1,78), `nopeus_10m` T19 taso4 (1,76 → 1,77), `nopeus_30m` N taso3 (4,46 → 4,45). **Valinnainen mikrolinjaus** (kohdista `lib/tm_eerikkila_normit.js` viralliseen); matala prio, ei estä dual-tasoa. Jos linjaat: päivitä `tests/eerikkila_normit.test.js` odotukset + varmista ettei riko olemassa olevia.

> **Khamis-Roche / %PAH / maturity-z-score = ERILLINEN, MYÖHEMPI tarkennus** (ei dual-tason edellytys). Ks. §"Myöhempi tarkennus".

## Menetelmä (Palloliiton materiaali s. 16, EKSAKTI)

Testitulosaineisto jaetaan **arvioituun pituuskasvun huippuun (PHV) verrattuna** viiteen kaistaan. `offset` = `maturity_offset` (vuosia PHV:stä; negatiivinen = ennen PHV:tä):

| Kaista | Ehto (offset o) | Kehitysvaihe |
|---|---|---|
| 1 | `o < −2` | PRE-PHV |
| 2 | `−2 ≤ o < −1` | MID-PHV |
| 3 | `−1 ≤ o < 0` | MID-PHV |
| 4 | `0 ≤ o < +1` | MID-PHV |
| 5 | `o ≥ +1` | POST-PHV |

**Vain kolme testiä (s. 19):** lineaarinopeus (10m/30m), kevennyshyppy (CMJ), 1200m/MAS. (Nämä = `hh_viimeisin.{lin10m|lin30m, cmj, mas}`.) Muille testeille kehitysvaihe-tasoa EI lasketa → radarissa/tasoissa vain ikäluokka-taso niille.

### Pariteettitestit (s. 18 — ÄLÄ RIKO, MyE.Way-ankkurit)
- **Pelaaja A:** ikä 14,1 v · PHV-offset −0,5 · 10m 1,81 s → Ikäluokka **P14 = taso 2** · Kehitysvaihe (kaista 3: −1…0) = **taso 4**
- **Pelaaja B:** ikä 13,5 v · PHV-offset +1,7 · 10m 1,78 s → Ikäluokka **P13 = taso 4** · Kehitysvaihe (kaista 5: >+1 POST) = **taso 2**

> Tulkinta (koko ominaisuuden ydin): A on hieman myöhäiskypsyjä → näyttää heikolta (2) ikätovereitaan vastaan mutta hyvältä (4) samassa kehitysvaiheessa oleviin verrattuna. B on varhaiskypsyjä → näyttää loistavalta (4) ikäluokassa mutta keskitasolta (2) kehitysvaiheessa (nopeus tulee kypsyydestä, ei taidosta). **Tämä on suoja RAE:lle + myöhäiskypsyjän aliarvioinnille.**

## Toteutus (kun taulukot saadaan)

### 1. Kehitysvaihe-kaista offsetista (`src/lib/tm_bioika.js`)
- Uusi helper `phvKaista(offset)` → 1–5 (taulukko yllä). Guard: `null` jos offset puuttuu.
- **HUOM sekaannuksen esto:** tämä 5-kaistainen jako on **kehitysvaihe-tavoitetasoja** varten (s. 16) ja on **ERI** kuin V1:n bio-banding-ryhmittelykaista `kehitysvaiheKaista` (pre/circa/post, ±1v, `CODE_TASK_BIOBANDING_V1`) joka on treeni-/otteluryhmittelyä varten. Molemmat säilyvät, eri käyttötarkoitus — älä yhdistä. (V1 = "kenen kanssa harjoittelee"; V2 = "mihin normiin tulosta verrataan".)

### 2. Kehitysvaihe-tavoitetasotaulukot — ✅ VALMIS TIEDOSTO
- **`docs/kehitysvaihe_tavoitetasot.js` on jo generoitu** (Claude, suoraan `kehitysvaihe.xlsx`:stä). Rakenne: `TAULUKOT[sp('P'|'T')][testi].{ suunta:'pienempi'|'suurempi', kaistat:[5 kpl {5,4,3,2}] }`. Testit: `lin5m, lin10m, lin20m, lin30m, cmj, mas`.
- **Älä transkriboi uudelleen** — lataa tämä tiedosto (script-tag / require) kuten `testit_indeksit.js`. Provenienssi + PENDING-solut dokumentoitu tiedoston headerissa.
- **MAS:** taulukko on m/s; data km/h → **jaa 3.6 ennen `kehitysvaiheTaso`-kutsua** (funktio odottaa m/s, kuten `eerikkilaTaso` §29).

### 3. ⭐ Dual-taso -funktio — ✅ VALMIS (tiedostossa)
- `kehitysvaiheTaso(arvo, testi, offset, sp)` **on jo toteutettu** `kehitysvaihe_tavoitetasot.js`:ssä (`TM_KEHITYSVAIHE.kehitysvaiheTaso`). Palauttaa 1–5, tai `null` jos: testi ei tuettu, offset puuttuu, tai PENDING-solu. `phvKaista(offset)` → 0–4 (rajat s.16: `o<−2 | −2≤o<−1 | −1≤o<0 | 0≤o<+1 | o≥+1`).
- **Lennossa** (kuten `eerikkilaTaso`), ei tallenneta. Rinnalla olemassa oleva `eerikkilaTaso` = ikäluokka.
- Code: **kytke tämä UI:hin** (kohta 4) + varmista lataus kaikissa tarvittavissa näkymissä (VP_v25, Master). Vitest s.18-ankkureilla (ks. Testit).

### 4. UI: Ikäluokka ↔ Kehitysvaihe -toggle
- **VP_v25 syvänäkymä (radar + tasomuutospylväät)** ja **valmentaja Master** (§29 detail): toggle `Ikäluokka | Kehitysvaihe | Molemmat` (MyE.Way-näyttö 2 -pariteetti).
- Radarissa kehitysvaihe-overlay **vain 3 akselille** (lin.nopeus/CMJ/MAS) — muut akselit näyttävät vain ikäluokka-arvon (dokumentoi tämä osittaisuus UI:ssa, esim. himmeä akselinimi tai alaviite). Ks. `CODE_TASK_SYVANAKYMA_UI.md`.
- Pelaajakohtainen (s. 21): "millä tasolla suhteessa kehitysvaiheen tavoitetasoihin" + muutos edelliseen testikertaan.

## §7.22 — EHDOTON
- Kehitysvaihe-taso = **valmentaja/VP-työkalu**. Lapselle EI kehitysvaihe-taso­lukua rankingina; perheelle "miten tukea" -kielellä (§16). Sama kuin ikäluokka-taso — ei näytetä lapselle tasolukua (§7.22).
- Materiaalin ydinviesti (s. 2, 23): "aikuisiän urheilumenestykseen [biologisen kypsyyden ajoituksella] ei ole vaikutusta" → kehitysvaihe-taso viestittävä **ei-leimaavana**, ajoitusta selittävänä.

## Myöhempi tarkennus (ERILLINEN — ei dual-tason edellytys)
Khamis-Roche %PAH + maturity-z-score EIVÄT ole tarpeen kehitysvaihe-tasolle (PHV-offset riittää). Ne ovat **valinnainen lisätarkkuus** (poikkileikkaus ilman useaa mittausta, kypsyysajoituksen z-luokitus). Jos joskus tehdään: erillinen brief, gate = KR-erratum-kertoimet + z-viite (Sherar 2007 / Palloliitto) + Palloliiton KR-datan kypsyys. **EI aloiteta tässä.** `laskeKR`-runko `tm_bioika.js`:ssä pysyy lukossa (`KR_VERIFIOITU=false`).

## Testit
- Vitest `tests/biobanding_v2.test.js`:
  - `phvKaista(offset)` — 5 kaistan rajat (−2, −1, 0, +1, ja rajatapaukset `o=−2` → kaista 2, `o=0` → kaista 4, `o=+1` → kaista 5).
  - `kehitysvaiheTaso` — **s.18 pariteettiankkurit** (Pelaaja A 10m 1,81 offset −0,5 → 4; Pelaaja B 10m 1,78 offset +1,7 → 2), kun viralliset taulukot ladattu.
  - `kehitysvaiheTaso` palauttaa `null` ei-tuetulle testille (esim. `sm_pallo`, `pujottelu`) ja kun offset puuttuu.
  - Ikäluokka-taso (`eerikkilaTaso`) ennallaan (s.18: P14 10m 1,81 → 2; P13 10m 1,78 → 4) — regressiosuoja ettei muutu.

## Dokumentaatio
- CLAUDE.md §25/§28: kehitysvaihe-taso (5 PHV-kaistaa s.16, vain lin.nopeus/CMJ/MAS, EI KR:ää), s.18-pariteettiankkurit, dual-taso-toggle. Päivitä "KR LUKOSSA" → "KR ei tarvita dual-tasoon; %PAH valinnainen lisätarkkuus".
- `docs/BIOBANDING_ARKKITEHTUURI.md`: merkitse menetelmä = PHV-kaista-tavoitetasot (Palloliitto-materiaali), ei KR.
- Kasvutahti-injuryraja: materiaali (s.9) vahvistaa **≥7,2 cm/v** (V1:ssä jo) + lisää **>0,6 cm edellisenä kuukautena** → V1-kasvutahti-helperiin pieni lisäsignaali (oma pieni PR, ei tässä).

## Ei tähän
- Khamis-Roche / %PAH / z-score (myöhempi valinnainen tarkennus).
- V1 (Mirwald-kaista, −0,75, kasvutahti) = tehty.
- Virallisten tavoitetasotaulukoiden **keksiminen** — vain Palloliiton data.
- Feature branch → PR → merge, ei versionbumppia.
