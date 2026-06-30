# Indeksianalyysi + suunnitelma (2026-06-28)

> Laadittu D2-vakautuksen (PR #22) jälkeen. Kohde: D1/D2-koostumus, sm_juoksun sijoitus, Erityistuki-kynnys,
> TSI-kynnys, OVR-portti. **Kaikki tasomuutokset = §14-metodologiapäätöksiä → Tero päättää ennen toteutusta.**
> Pohjana live-koodi (VP_v25, Master_v16, Pelaaja_v7, lib/tm_eerikkila_normit.js) + Pallo-Iirot P11 -pilottidata (U11, ei PHV-dataa).
>
> **PÄÄTÖKSET LUKITTU 2026-06-28 (Tero):** (1) sm_juoksu → D1-ketteryys (osaindeksi + FYS); (2) "Erityistuki" → **"Kehityskohde"** + uudelleen-scope (tekninen+FLEI, fyysinen vain post-PHV); (3) TSI → ikäkohtaiset rajat + ei punakehystä ≤12; (4) D2-prioriteetti lukittu (TKI→TK→H-H→sm_pallo). **Eerikkilä-dokumentti "Kehitysvaihekohtainen harjoittelu" (Kevät 2025) analysoitu → §8 uudet löydökset** (virallinen ikä→PHV-kartta + kehitysvaihekohtaiset tavoitetasot + Philippaerts-tiedeperusta).

---

## 0. Yhdistävä havainto (juurisyy)

Pilotin nuoret kohortit (U10–U13) **ilman PHV-dataa** paljastavat, että useat signaalikynnykset on kalibroitu
**vanhemmille / eliitille** ja **ylilaukeavat nuorilla**. §28:n perusperiaate ("pre-PHV heikko fyysinen = neutraali,
ei kehityskohde") on kirjattu **dokumentteihin mutta ei koodin signaalilogiikkaan**. Esimerkki Pallo-Iirot P11:stä:
lähes kaikki 28 pelaajaa on liputettu "Erityistuki", ja kaikkien TSI tulkitaan "🔴 Kriittinen".

**Korjauksen ydin: ikä/PHV-tietoinen neutraaliuskerros**, jota signaalifunktiot käyttävät yhtenäisesti.
Kun PHV-data puuttuu ja ikä ≤12–13, fyysisiä heikkouksia ei tulkita kehityskohteiksi (§28 invariantit #2/#3).

---

## 1. sm_juoksu — orpo, kuuluu D1:een (ketteryys)

**Nykytila (koodi):** `laskeD1Joustava` FYS-lista = `lin5m, lin10m, lin30m, cmj, mas, kasirata` — **sm_juoksu puuttuu.**
`laskeD1Osaindeksit` ketteryys = vain `kasirata`. sm_pallo on oikein D2:ssa. sm_juoksu käytetään **vain TSI:ssä**
(`sm_pallo − sm_juoksu`). Lib luokittelee sen: *"Suunnanmuutos ilman palloa — puhdas ketteryys"* (fyysinen).

**Ongelma:** sm_juoksu on mitattu testi joka ei vaikuta mihinkään dimensioon — hukattua signaalia. Se on selkeästi
**D1-ketteryys** (sama perhe kuin kasirata).

**Suositus:** lisää sm_juoksu D1-ketteryyteen.
- `laskeD1Osaindeksit.ketteryys = ka(kasirata, sm_juoksu)` (molemmat suunnanmuutos-agiliteettiä).
- Harkinta `laskeD1Joustava` FYS-listaan: jos lisätään, D1-kokonaistaso saa ketteryys-komponentin myös sieltä.
  **Päätös:** lisätäänkö FYS-listaan vai vain osaindeksiin? (Suositus: molempiin — johdonmukaisuus.)
- **Säilytä TSI ennallaan** (tarvitsee sm_juoksun). sm_juoksu D1:ssä + sm_pallo D2:ssa + TSI erotuksena = ei päällekkäisyyttä, eri kysymykset.
- §28-huom: suunnanmuutosnopeudella on neuraalinen (pre-PHV) komponentti → kohtuullinen D1-osa jo nuorilla, mutta phvHerkkä → neutraaliuskerros (§0) koskee silti.

---

## 2. D2 — paras tekninen mittari (vakautettu, dokumentoitava)

**Nykytila (PR #22):** prioriteetti `TKI → TK → H-H (syöttö/pujottelu) → sm_pallo-fallback`. sm_juoksu poistettu D2:sta.

**Analyysi:**
- **H-H syöttö/pujottelu = puhtain D2** (pallotaito ilman juoksunopeuden sekoittavaa tekijää) → oikea ensisijainen lähde.
- **sm_pallo** sisältää agiliteetti-sekoituksen (nopea ketterä lapsi saa matalan ajan pallotaidosta riippumatta) → vain fallback kun H-H puuttuu. OK.
- **TSI** (`sm_pallo − sm_juoksu`) eristää pallon kustannuksen = **puhtain "tekniikka paineessa" -mittari**, mutta sillä ei ole ikänormitaulua → **pidetään erillisenä signaalina, EI osana D2-tasoa** (nykytila oikea).

**Suositus:** vakautus on metodologisesti oikea — **dokumentoi se** (§26/§30/§34). Jatkokehitys: kun TK-merkki (kulta/hopea/pronssi)
on saatavilla, painota D2:ta sillä. Ei muutosta nyt — vahvista + kirjaa.

---

## 3. Erityistuki — ylilaukeaa, vaatii ikä/PHV-portituksen ⚑ (tärkein)

**Nykytila (VP_v25 `_tarvitseeTuki`):**
```javascript
return (p.flei_viimeisin != null && p.flei_viimeisin < 50)
    || (p.hh_taso != null && p.hh_taso < 2.5)
    || p.erityistuki === true;
```
**Ei PHV-portitusta.** `hh_taso` lasketaan 30m/CMJ/MAS:sta — Pallo-Iiroilla vain 30m (CMJ/MAS puuttuu) → ohut proxy,
ja U11-nopeusnormeilla `hh_taso` on lähes aina 1 → **`< 2.5` liputtaa ~kaikki**.

**Ongelmat (kaksi):**
1. **§28-ristiriita:** matala fyysinen pre-PHV on neutraali, ei kehityskohde — silti se laukaisee "Erityistuki".
2. **Väärä mittari:** käyttää `hh_taso`:a (fyysinen, 30m-proxy), ei `d2_taso`:a (tekninen — §28:n mukaan **kriittisin pre-PHV-mittari**).

**Suositus — uudelleenmäärittele Erityistuki:**
- Poista **raaka fyysinen (`hh_taso`) trigger** kun pre-PHV TAI (ei PHV-dataa JA ikä ≤12–13). Käytä §0-neutraaliuskerrosta.
- Perusta Erityistuki **mielekkäisiin huoliin:**
  - **FLEI < 40** → klinikkalähetys (§14, säilyy — aito).
  - **D2 (tekninen) matala pre-PHV** (esim. `d2_taso < 2`) → kriittinen ikkuna (§28 taito 6–13v) — *tämä* on oikea pre-PHV-huoli.
  - Post-PHV: matala D1 voi olla aito → silloin `hh_taso`-trigger sallitaan.
- **Pallo-Iirot-vaikutus:** liputus putoaa ~kaikista niihin joilla aito tekninen/FLEI-huoli → signaali saa arvonsa takaisin.
- **Päätös:** D2-kynnys (esim. <2.0?) + ikäraja (≤12 vai ≤13?) + miten käsitellään "ei PHV-dataa" (oletus: kohtele pre-PHV:nä jos ikä ≤12).

---

## 4. TSI-kynnys — ikäskaalaamaton, ylilaukeaa nuorilla

**Nykytila (Master_v16):** kiinteät rajat `≤0.5 vapaus · ≤1.0 kehitettävä · ≤1.5 ⚠ · >1.5 🔴 Kriittinen`.
§22-tausta ("hyvä pelaaja häviää 0.3–0.6s") on **eliitti/aikuistaso**.

**Ongelma:** U11-data TSI 1.79–6.83s → **kaikki "🔴 Kriittinen".** 11-vuotiaalla pallo hidastaa luonnostaan paljon enemmän
kuin aikuisella → kiinteä 1.5s on väärä nuorille.

**Suositus:**
- **Ikäporrastetut TSI-rajat** (U10–12 selvästi korkeampi toleranssi). Vaatii viitedataa (sm_juoksu/sm_pallo-erotuksen
  jakauma per ikä) — voidaan johtaa kun dataa kertyy useammasta seurasta. **Väliaikaisratkaisu:** skaalaa rajat iällä
  (esim. ×kerroin) TAI näytä TSI ≤12-ikäisille **ilman "Kriittinen"-punakehystä** (§7.22 — ei hälyttävää kehystä lapsen/nuoren datalle).
- TSI säilyy valmentajan diagnostiikkana (oikea käyttö), mutta tulkintateksti ei saa olla "kriittinen" koko ikäluokalle.
- **Päätös:** ikäporrastus heti (arviorajat) vai vasta dataan perustuen? Suositus: väliaikaiset ikäkohtaiset arviorajat nyt, tarkennus datalla myöhemmin.

---

## 5. OVR-portti — toimii, ei muutostarvetta (vahvistus)

**Nykytila (Pelaaja_v7):** OVR = RAE × Σ(arvo×paino)/Σ(paino), painot D1 .40 / D2 .25 / D3 .15 / D4 .10 / D5 .10.
**Portti:** `mitatut.length < 3 → rakentuu` (ei OVR-lukua). **OVR-lattia:** PRE/LAH → `Math.max(norm5(d1_taso), 50)` (§28).

**Analyysi:** Pallo-Iiroilla D1+D2 = **2 ulottuvuutta → OVR portattu** (näyttää 🌱 / "D3/D4/D5 tulossa"). **Tämä on oikein** —
ei keksitä OVR:ää kahdesta dimensiosta. OVR-lattia suojaa late-bloomeria oikein.

**Suositus:** **ei muutosta.** OVR aktivoituu kun D3 (ADAR/pelihavainto) + D4/D5 (psyykkinen/sosiaalinen) kertyvät.
Vahvista että portti + lattia pysyvät. Ainoa harkinta: näytä "rakentuu 2/3" -edistymä selkeämmin (jo osin on).

---

## 6. Toteutussuunnitelma (vaiheet)

**Vaihe A — §14-päätökset (Tero), ennen koodia:**
1. sm_juoksu → D1-ketteryys: osaindeksiin + FYS-listaan? (suositus: molempiin)
2. Erityistuki: D2-kynnys (<2.0?) + ikäraja (≤12/≤13) + "ei PHV-dataa" = pre-PHV-oletus? FLEI<40 säilyy.
3. TSI: väliaikaiset ikäkohtaiset arviorajat vai vain punakehyksen poisto ≤12:lta?
4. D2-prioriteetti: vahvista vakautettu järjestys lopulliseksi.

**Vaihe B — Code (matalan riskin, ei datamigraatiota):**
- `_tarvitseeTuki` → ikä/PHV-tietoinen (§0-helper `onNeutraaliPrePHV(p)`); fyysinen trigger vain post-PHV; lisää D2-pre-PHV-trigger.
- TSI-tulkinta (Master) → ikäkohtainen; ≤12 ei "Kriittinen"-kehystä (§7.22).
- `laskeD1Osaindeksit.ketteryys` + (valinn.) `laskeD1Joustava` FYS → sm_juoksu mukaan.
- Yhteinen helper `lib/tm_eerikkila_normit.js`: `onNeutraaliPrePHV(p)` = `phv_tila ∈ {PRE,LAH}` TAI (`phv_tila` puuttuu JA normiIka ≤12).
- **Vitest:** Erityistuki-portitus (U11 ei-liputus ilman teknistä/FLEI-huolta), sm_juoksu D1:ssä, TSI ikäraja.

**Vaihe C — datariippuvainen:**
- TSI ikäporrastetut viiterajat (kun sm-dataa ≥ usea seura/ikä).
- OVR aktivoituu kun D3–D5 kertyy (ei koodimuutosta, datakypsyys).

**Vaihe D — dokumentointi:**
- Päivitä §14 (D2-prioriteetti, sm_juoksu→D1), §26 (d2-lähteet), §28 (neutraaliuskerros koodissa), §30 (signaalikynnykset),
  `docs/testit_indeksit.js` + `KPI_MASTER_ARCHITECTURE.md` + `TKI_ANALYYSIMALLI.md` päätösten mukaan.

**Riippuvuudet/turva:** kaikki muutokset lue-aikaisia tai pikakenttä-laskentaan → ei datamigraatiota. recalcHH idempotentti.
Pallo-Iirot toimii regressiotestidata-kohteena (28 P11, 3 tapahtumaa). PR clean-flow per muutos.

---

## 7. Tiivistelmä — mikä muuttuu pelaajalle/VP:lle

| Signaali | Nyt (U11) | Korjauksen jälkeen |
|---|---|---|
| **Erityistuki** | ~kaikki liputettu (hh_taso<2.5) | vain aito tekninen/FLEI-huoli (§28-neutraali fyysinen) |
| **TSI** | kaikki "🔴 Kriittinen" | ikäkohtainen; ≤12 ei hälytyskehystä |
| **D1** | sm_juoksu hukassa | ketteryys sisältää sm_juoksun |
| **D2** | vakautettu (H-H) | sama, dokumentoitu lopulliseksi |
| **OVR** | portattu (2 dim) ✓ | ennallaan — aktivoituu D3–D5:llä |

---

## 8. Eerikkilä "Kehitysvaihekohtainen harjoittelu" (Kevät 2025) — uudet löydökset

Palloliitto/Eerikkilä-koulutusmateriaali. Tukee analyysin päätöksiä virallisella lähteellä + tuo yhden ison
metodologiamahdollisuuden. Lähteet mm. Philippaerts 2006, Lloyd & Oliver 2019, Myer 2015 (ks. dokumentin lähdeluettelo).

**8.1 Virallinen ikä→PHV-vaihe -kartta (s. 22) — neutraaliuskerroksen perusta.**
| Vaihe | Pojat | Tytöt |
|---|---|---|
| PRE-PHV | **P10–12** | T9–11 |
| MID-PHV | P13–15 | T12–14 |
| POST-PHV | P16–19 | T15–19 |
→ Kun bioikädata puuttuu (kuten Pallo-Iirot), `onNeutraaliPrePHV(p)`-fallback **ikä ≤12 (P) / ≤11 (T) = PRE-PHV** on
Palloliitto-linjattu, ei arvaus. Tämä on §0-neutraaliuskerroksen virallinen tuki.

**8.2 Kehitysvaihekohtaiset tavoitetasot (s. 15–21) — ISO mahdollisuus.**
Eerikkilällä on **PHV-vaiheen mukaiset tavoitetasot** (PRE/MID/POST) lineaarinopeudelle, kevennyshypylle (CMJ) ja
1200m/MAS:lle — kronologisen iän tasojen **lisäksi**. Sama tulos tulkitaan kahdesti:
- Pelaaja A: 14.1v, PHV −0.5, 10m 1.81s → ikäluokka P14 = **taso 2**, kehitysvaihe (−1…0 PHV) = **taso 4** (myöhäiskypsä, oikeasti hyvä).
- Pelaaja B: 13.5v, PHV +1.7, 10m 1.78s → ikäluokka P13 = **taso 4**, kehitysvaihe (>+1 PHV) = **taso 2** (varhaiskypsä, oikeasti keskitaso).

→ **Tämä on §14/§28:n RAE/bio-banding-korjaus konkreettisena.** Kaksitasoinen tulkinta: (a) **kronologinen ikäluokkataso**
(nyt käytössä) + (b) **kehitysvaihetaso** (kun bioikä mitattu). Roadmap: hae/rakenna PHV-vaihe-tavoitetaulukot (nopeus/CMJ/MAS)
ja näytä molemmat, kun PHV-data on. **Vaihe C (datariippuvainen)** — vaatii bioikämittaukset (§25 PHV/Mirwald käytössä, KR lukittu).
PHV-vaiherajat testitulkintaan (s. 15–16): **PRE < −2v · MID −2…+2v (±1 kriittisin) · POST > +2v** (karkeampi 3-jako kuin §25:n
5 koodia; §25-koodit ovat kuormarajoitinta varten, nämä testitulkintaa varten → dokumentoi molemmat tarkoitukset).

**8.3 Nopeuden notkahdus pre-PHV (Philippaerts 2006, s. 6) — §28:n tiedeperusta.**
Suunnanmuutosnopeus (5×10m) + 30m lineaarinopeus **heikkenevät hetkellisesti ~1v ennen PHV:tä**, kiihtyvät PHV:n aikana,
tasaantuvat 1–1.5v jälkeen. "Adolescence awkwardness" (s. 8) = motorisen kontrollin hetkellinen häiriö + suhteellisen voiman
lasku kasvupyrähdyksessä. → **Suora tiedeperusta:** pre/peri-PHV nopeuden lasku EI ole aito heikkeneminen → ei kehityskohde,
ei "huononi"-kehys (§28 invariantti #3, §7.22). Vahvistaa Kehityskohde- + TSI-päätökset.

**8.4 sm_juoksu = fyysinen nopeus/ketteryys (s. 6).** Dokumentti testaa "Suunnanmuutosnopeus 5×10m viivajuoksu" nopeus-/fyysisenä
ominaisuutena 30m:n rinnalla → vahvistaa päätöksen sm_juoksu → D1-ketteryys (ei D2).

**8.5 Mittausväli (s. 14) — tarkenna §25.** Antropometria/PHV: **3–4kk välein 11–15v**, **6kk välein <11v & >15v**.
(§25 nyt: U10–12 2×/v, U13–15 3×/v, U16–19 1–2×/v → linjaa Eerikkilään: 11–15 tihein.)

**8.6 Khamis-Roche %PAH-ankkurit (s. 5):** −1v PHV ≈ 89 % aikuispituudesta, +1v PHV ≈ 96 %. Hyödyllinen kun KR aktivoidaan (§25 lukittu).

**8.7 Vammaehkäisy PHV-vaiheittain (s. 9–11):** Sever (PRE), Osgood-Schlatter (PRE/MID), rasitusmurtuma alaselkä (POST),
tyttöjen ACL post-spurt. **Riskilippu: kasvutahti ≥7.2 cm/v tai >0.6 cm viim. kk.** → rikastaa kuormarajoitin-/loukkaantumissignaalia (§25 PH-tila); roadmap kun kasvumittausdataa kertyy.

---

## 9. Lukitut päätökset + päivitetty toteutus (2026-06-28)

| # | Päätös | Toteutus |
|---|---|---|
| 1 | **sm_juoksu → D1-ketteryys** | `laskeD1Osaindeksit.ketteryys = ka(kasirata, sm_juoksu)` + lisää `laskeD1Joustava` FYS-listaan. TSI ennallaan. |
| 2 | **"Erityistuki" → "Kehityskohde"** + re-scope | `_tarvitseeTuki`→`_kehityskohde`: FLEI<40 (klinikka) TAI (pre-PHV/≤12 JA `d2_taso<2`, tekninen ikkuna §28). Raaka `hh_taso` vain post-PHV. Nimi UI:hin "Kehityskohde". |
| 3 | **TSI ikäkohtainen + ei punakehystä ≤12** | Master TSI-tulkinta: ikäskaalatut arviorajat; ≤12 (pre-PHV) kehityskieli + teal, EI "Kriittinen". Lapsi/perhe §7.22. |
| 4 | **D2-prioriteetti lukittu** | TKI→TK→H-H syöttö/pujottelu→sm_pallo. sm_juoksu ei koskaan D2. TSI erillinen signaali. Dokumentoi §14/§26/§30. |

**Yhteinen helper (lib/tm_eerikkila_normit.js):** `onNeutraaliPrePHV(p)` = `phv_tila ∈ {PRE,LAH}` **TAI** (`phv_tila` puuttuu JA
`normiIka` ≤12 P / ≤11 T) — virallinen ikä→PHV-kartta §8.1. Käytetään Kehityskohde- + TSI-logiikassa.

**Vaihe B — Code (matalan riskin, lue-aikainen, ei datamigraatiota):**
1. `onNeutraaliPrePHV` + Vitest.
2. `_kehityskohde` (ent. `_tarvitseeTuki`) uusi logiikka + UI-teksti "Kehityskohde" (VP_v25 SIGNAALI-sarake + suodatin).
3. TSI-tulkinta ikäkohtaiseksi (Master) + §7.22-kehys ≤12.
4. `laskeD1Osaindeksit`/`laskeD1Joustava` sm_juoksu mukaan + Vitest.
5. Pallo-Iirot regressiotestidata: U11 ei enää massaliputusta, sm_juoksu D1:ssä, TSI ei "Kriittinen".

**Vaihe C — datariippuvainen (kun bioikädata kertyy):** kehitysvaihekohtaiset tavoitetasot (§8.2) nopeus/CMJ/MAS → kaksitasoinen
tulkinta (kronologinen + kehitysvaihe); kasvutahti-riskilippu (§8.7); mittausvälin linjaus (§8.5).

**Vaihe D — docs:** §14 (D2, sm_juoksu→D1, neutraaliuskerros), §26 (d2-lähteet), §28 (neutraalius koodissa + Philippaerts §8.3 +
ikä→PHV-kartta §8.1 + kehitysvaihetasot §8.2), §30 (kynnykset), §25 (mittausväli §8.5); `testit_indeksit.js`, `KPI_MASTER_ARCHITECTURE.md`, `TKI_ANALYYSIMALLI.md`.

---

## 10. Vaihe B live-löydökset + kaksikerrosmalli (PÄÄTÖS 2026-06-28)

PR #23 (Vaihe B) deployattu + recalcHH ajettu. Live-verifiointi Pallo-Iirot P11 (28) paljasti **kaksi aukkoa** jotka korjataan **Vaihe B′:ssä**:

**Aukko 1 — sm_juoksu ei päädy D1:een (data-putki).** `laskeD1Joustava` lukee `hh_viimeisin`-objektia, mutta tuonti
tallentaa `sm_juoksu`:n **erilliseen `sm_juoksu_viimeisin`-pikakenttään**, EI `hh_viimeisin`:iin → D1-kattavuus jää 3:een (5m+10m+30m),
sm_juoksu ei mukana. **Korjaus:** tallenna `sm_juoksu` (ja `sm_pallo`) myös `hh_viimeisin`-objektiin tuonnissa + recalcHH:ssa
(tai mergeä `*_viimeisin` hh-objektiin ennen `laskeD1Joustava`-kutsua). sm_pallo pysyy D2:ssa/TSI:ssä (FYS-lista jättää sen pois).

**Aukko 2 — Kehityskohde ylilaukeaa yhä (24/28).** Pre-PHV-trigger `d2_taso<2` osuu 24/28:aan, koska U11:n syöttö/pujottelu-tasot
klusteroituvat tasolle 1 (FINAL2024-normit eliittiviitteisiä). **Juurisyy:** ruohonjuuritason U11:ssä absoluuttinen taso on
yhtenäisen matala → mikä tahansa absoluuttiseen tasoon perustuva per-pelaaja-liputus ylilaukeaa. **Ratkaisu = kaksikerrosmalli (vahvistettu):**

### Kerros 1 — Tavoitetaso-etäisyys (ohjelmointi, NEUTRAALI, näkyy aina)
Kuinka kaukana pelaajat ovat **kansallisesta tasosta 3** (tulevaisuuden tavoite) per ominaisuus (suunnanmuutos/D1-ketteryys,
tekniikka/D2, nopeus). EI hälytys — kehitys-/ohjelmointityökalu (U11:llä taso 1–2 normaali; etäisyys kertoo *mitä harjoitellaan*).
Rakennuspalikat: `laskeTaso3Osuus` (lib, olemassa) + joukkuepulssi + Eerikkilä §8.2 ryhmän tasovertailu ("kuinka moni % tasolla 1–5").
§28-kehys: etäisyys = kehityssuunta, ei vika. Näkyy valmentajalle/VP:lle joukkue-syvänäkymässä per ominaisuus.

### Kerros 2 — "Kehityskohde"-prioriteettimerkki (PRIORISOINTI, valikoiva)
Vastaa "kuka tarvitsee *yksilöllistä* huomiota" → valikoiva, EI 24/28. **Pre-PHV trigger:**
- **suhteellinen:** pelaaja joukkueensa **alimmassa ~20 %:ssa** (D2 / heikoin dimensio suhteessa OMAAN joukkueeseen), TAI
- **FLEI < 40** (klinikka), TAI **aito taantuma** (negatiivinen delta yli 2 mittauksen), TAI **manuaalinen** lippu.
- **Post-PHV:** lisäksi raaka fyysinen sallittu (kuten Vaihe B).
Joukkueen yleinen heikkous näkyy **Kerros 1:ssä**, ei 24 yksittäisenä lippuna.

**Vaihe B′ Code-tehtävä:** (1) sm_juoksu (+sm_pallo) → `hh_viimeisin` (tuonti + recalcHH). (2) `_kehityskohde` pre-PHV-trigger
absoluuttisesta (`d2<2`) → suhteelliseksi (joukkueen alin ~20 % D2/heikoin dim) + FLEI<40 + taantuma + manuaalinen.
(3) Tavoitetaso-etäisyys-näkymä per ominaisuus (Kerros 1) — hyödynnä `laskeTaso3Osuus` + per-pelaaja gap tasoon 3, neutraali kehys.
Vitest: Kehityskohde valikoivuus (U11 ei massaliputa), sm_juoksu D1-kattavuudessa. recalcHH + live-verify jälkeen.
