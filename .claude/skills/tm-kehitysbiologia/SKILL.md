---
name: tm-kehitysbiologia
description: >-
  TalentMasterin biologinen ikä ja kehitysikkunat: PHV (Mirwald, MyE.Way-pariteetti, PHV-tilakoodit PRE/LAH/PH/POST/AN, kuormarajoitin), bio-banding V1, kasvutahti, yli-ikäisyys, Khamis-Roche-lukitus, herkkyysikkunat ja signaloinnin invariantit (Hidden Gem, FVP, pre-PHV-neutraalius, OVR-lattia). Lataa ennen kuin kosket tm_bioika.js:ään, PHV-/bio-banding-koodiin tai mihin tahansa talentti-signaaliin (Hidden Gem, X-Factor, OVR).
---

# tm-kehitysbiologia

> Siirretty juuren CLAUDE.md:stä 29.9.2026 (laiska lataus). Osiot SELLAISENAAN, alkuperäisellä numeroinnilla — ristiviittaukset (§N) toimivat. Ehdottomat säännöt sekä tietosuoja- ja turvasäännöt ovat juuressa (CLAUDE.md §0, §7, §12, §38, §39) ja voittavat ristiriidassa.

## 25. BIOLOGINEN IKÄ — `lib/tm_bioika.js`

### Kahden menetelmän jako (eivät kilpaile — Eerikkilä/Palloliitto MyEWay)
| Menetelmä | Kysymys | Käyttö | Tila |
|---|---|---|---|
| **PHV (Mirwald 2002)** | "Mitä pelaajassa tapahtuu nyt?" | Harjoittelun ohjaus, kuormarajoitin, loukkaantumisriski | ✅ Toteutettu |
| **Khamis-Roche (1995 erratum)** | "Kuinka kypsä suhteessa muihin?" | Bio-banding, ryhmittely, %PAH | ⏳ LUKITTU (`KR_KERTOIMET_PUUTTUU`) |

### PHV — Mirwald 2002 (Excel-verifioitu identtiseksi)
**Lähde:** Mirwald RL et al. Med Sci Sports Exerc 2002;34(4):689-694.
**Toteutus:** `laskeMirwald()` + `laskeBioIkaDokumentti()` + `bioIkaTallennusOperaatiot()`.
Verifioitu `TalentMaster_BioIka.xlsx`:stä ZIP-XML-tasolla (11 kerrointa identtiset, PHV-kynnykset, yli-ikäisyystaulukko).
**Poikien Mirwald-vakio `−9.3236`** (MyE.Way-pariteetti, 2026-07-01, verifioitu 2 referenssipisteellä — eroaa
julkaistusta Mirwald 2002 -arvosta `−9.236` 0.088 v/~1 kk, koska Palloliiton live-tuote MyE.Way käyttää tätä →
täsmäävät PHV-luvut SJK-ekosysteemissä); **tytöt `−9.376`** (jo identtinen MyE.Way'n kanssa, ennallaan).
**Kolme kopiota:** `tm_bioika.js` (kanoninen) · `tm_testipankki.js` · `tm_ylaikaisyys.js` — **päivitettävä yhdessä**
(tekninen velka: → single-source + re-export). Regressio: `tests/bioika_myeway.test.js` lukitsee pariteetin.

**Pakolliset muuttujat:** `ika` (desimaali, `syntymapaiva` → `Date.UTC()`) · `pituus` (cm, 2× ka) ·
`paino` (kg, 2× ka) · `istumapituus` (cm, 1×, kriittinen) · `sukupuoli` `'P'`/`'T'` (erilliset kaavat).
Sukupuoli normalisoidaan: `M`→`P`, `N`→`T` (`normSukupuoli()`).
**Tulos:** `maturity_offset` (vuosia PHV-huipusta) · `phv_ika = ika − offset` · `phv_tila_koodi` · `yli_ikaisyys.poikkeuslupa`.

**PHV-tilakoodi (CANONICAL — käytä KAIKKIALLA):**
| Koodi | Merkitys | offset |
|---|---|---|
| `PRE` | Ennen kasvupyrähdystä | < −1.0 |
| `LAH` | Lähestyy | −1.0 … −0.5 |
| `PH` | Kasvupyrähdyksessä ⚠️ **VAROITUSTILA** | −0.5 … +0.5 |
| `POST` | Jälkeen | +0.5 … +1.0 |
| `AN` | Jälki-PHV | > +1.0 |

**EI** `pre_phv`/`circa_phv`/`huippu`/`PHV` (vanhat koodit vain backward-compat: Pelaaja_v7 `_laskeStage`/signaalit).
**`phv_tila === 'PH'` → kuormarajoitin:** voimaharjoittelu max 80 % 1RM, hyppyvolyymi −20 %, juoksuvolyymi seurattava.

### Bio-banding V1 (Mirwald-pohjainen — EI Khamis-Rochea) — `docs/BIOBANDING_ARKKITEHTUURI.md`
Rakentuu vain olemassa olevaan Mirwald-PHV:hen (ei riippuvuuksia). **PÄÄTÖS 2026-07-01: V2 (Khamis-Roche %PAH + maturity z-score + dual-taso) LYKÄTTY** — Palloliitto vasta *kokeilee* KR-testejä → KR-data ei luotettavaa/laajaa. V1 tuottaa arvoa heti (SJK 8 PHV-pelaajaa).
- **`kehitysvaiheKaista(phv_tila_koodi)` → `'pre'|'circa'|'post'`** (bio-banding circa = ±1v PHV:stä): PRE→pre · LAH+PH+POST→circa · AN→post. Pikakenttä `kehitysvaihe_kaista` (biologinen_ika-dok + pelaajadok).
- **`laskeKasvutahti(pituus_nyt, pvm_nyt, pituus_edell, pvm_edell)` → `{cm_v, vyohyke}`**: vyöhykkeet **hidas <3,0 · kohtalainen 3,0–7,2 · nopea ≥7,2 cm/v**. **≥7,2 = loukkaantumisriskisignaali** (PMC6293374, PH-kuormarajoittimen rinnalle). Guard: `null` kun <2 kasvumittausta. Pikakentät `kasvutahti_cm_v`/`kasvutahti_vyohyke` (Testaus_v9 hakee edellisen `biologinen_ika`-dokin → `syote.edellinen`).
- **Yli-ikäisyys −0,75 näkyviin:** `yli_ikaisyys.poikkeuslupa` (jo laskettu, `YLI_IKAISYYS_KYNNYS` + `phv_ika >= kynnys`, **Palloliitto-pariteetti verifioitu — ÄLÄ muuta**) surfacataan VP bio-banding-näkymässä + Pelaaja-kortissa (positiivinen mahdollisuus, §7.22-turvallinen).
- **Bio-banding-ryhmittelynäkymä** `avaaBioBanding()` (VP_v25 Työkalut-sidebar): ryhmittelee `_pelaajat` kaistoittain pikakentistä (fallback `phv_tila` → toimii SJK:n olemassa olevalla datalla). **§7.22:** kaista + kasvutahti = valmentaja/VP-työkaluja, EI lapselle rankingina.
- Regressio: `tests/biobanding_v1.test.js` (kaista · kasvutahti-rajat · yli-ikäisyys 4 kanonista esimerkkiä).

### Khamis-Roche — LUKITTU (kertoimet verifioitava ennen aktivointia)
Alkuperäinen Khamis & Roche 1994 sisälsi **virheellisiä kertoimia** → käytettävä **Pediatrics 1995;95:457 erratum**
(selittää miksi KR oli aiemmin poistettu). `KR_VERIFIOITU = false` → `laskeKR()` palauttaa `{error:'KR_KERTOIMET_PUUTTUU'}`.
Aktivointi: lisää erratum-kertoimet `KR_KERTOIMET`:iin + `KR_VERIFIOITU = true`.
- Kertoimet **imperiaalisia** (tuumat/paunat) — muunna cm/kg ennen, tulos takaisin cm. Puolen vuoden intervallit → **lineaarinen interpolointi** murto-iille (4–17.5 v).
- **Midparent:** pojat `(isä+äiti+13)/2`, tytöt `(isä+äiti−13)/2`.
- **Vanhempien fallback** (puuttuville, THL FinRavinto 2017): isä **179 cm**, äiti **166 cm** (EI 181/168 — yläkanttiin → systemaattisesti liian suuret ennusteet). Epstein-korjaus (itseraportoinnin yliarviointi): isä −1.5 cm, äiti −1.0 cm. UI merkitsee AINA "arvio".
- **Virhe näytetään AINA:** 11–15 v ±2.5 cm, muu ±2.0 cm, +1.5 cm jos estimoitu. Tyttöjen KR tarkempi (keskivirhe 4.3 cm vs. pojat 5.6 cm). Etninen kalibrointi: Fels-aineisto (valkoihoiset pohjoisamerikkalaiset) → maahanmuuttajataustaisilla tarkkuus voi heiketä (rajoitus, ei este).

### Firestore + kasvumittaus
- **Historia:** `seurat/{sid}/pelaajat/{pid}/biologinen_ika/{pvm}` (oma dok per mittauspäivä, oma Rules-blokki §12).
- **Bio-pikakentät pelaajadokumentissa:** `phv_tila` (koodi) + `biologinenIka_viimeisin` (koko viimeisin mittausdok). KR Sprint 4: `kr_isa_cm`/`kr_aiti_cm`.
- **Vanhempien pituudet** (rekisteröinnistä): `isa_pituus_cm` / `aiti_pituus_cm` / `vanhempi_pituus_puuttuu`. Validointi isä 140–220, äiti 130–200; vapaaehtoisia (adoptio/yksinhuoltaja). GDPR-informointi: käytetään biologisen kypsyyden arviointiin.
- **Kasvumittaus (Testaus_v9 `kasvumittaus`-protokolla):** pituus 2× + paino 2× (`laskentatapa:'keskiarvo'`) + istumapituus 1×.
  `_v5SyotaYritys`: jos `laskentatapa==='keskiarvo'` → `obj.paras` = yritysten keskiarvo (ei "paras"). PHV lasketaan +
  tallennetaan kahteen polkuun "Merkitse valmiiksi" -toiminnossa. Mittausaika ~3–4 min/pelaaja. Väli: U10–12 2×/v · U13–15 3×/v · U16–19 1–2×/v.
- **Älä kopioi `tm_bioika.js`:ää** — repon versio on auktoritatiivinen (287 riviä, Excel-verifioitu); laajenna sitä.

---

## 28. KEHITYSIKKUNAT — herkkyysvaiheet (KOKO SIGNALOINNIN BIOLOGINEN PERUSTA)

> Hidden Gem, X-Factor, pikakenttäpainotukset ja VP:n toimenpide-ehdotukset ovat **kaikki tämän biologisen totuuden käyttöliittymä.** Täysi tieteellinen perustelu: `docs/STRATEGIA.md §2`. Liittyy §14 (metodologia) + §25 (PHV).

**Perusperiaate:** herkkyysikkuna ≠ "milloin ominaisuus on tärkeä", vaan **milloin sen kehittäminen on poikkeuksellisen herkkää** — sama harjoitusmäärä tuottaa moninkertaisen vaikutuksen. Ikkunan sulkeuduttua sama tulos vaatii 3–5× työn — tai jää saavuttamatta.

| Ominaisuus (mittari) | Herkkyysikkuna | Mekanismi | **Signaali-invariantti (koodi)** |
|---|---|---|---|
| **Taito/tekniikka** (D2: TSI, SM-pallo) | **~6–13 v (pre-PHV)** | hermoston plastisuus, motoriset ohjelmat | **TSI = kriittisin yksittäinen indikaattori** — paljastaa onko ikkuna käytetty. U14+ uusi perustaito 3–5× työ |
| **Koordinaatio/liikehallinta** (FLEI) | pre-PHV | faskiaalinen adaptoituvuus | matala FLEI pre-PHV = **vakava** (perustaidot jäivät rakentumatta). FLEI≥65 U12 = poikkeuksellinen. Post-PHV nousee hitaammin |
| **Kiihdytys 5–10m** (D1 osa) | **KAKSI ikkunaa:** ~7–13 (neuraalinen) + post-PHV (voima) | SSC, aktivaationopeus → myöh. lihasmassa | 5m/10m osittain harjoiteltavissa jo pre-PHV (poikkeus muista nopeusmittareista) |
| **Maksiminopeus 30m + aerobinen** (MAS) (D1) | **post-PHV** (P ~U14–18, T ~U12–16) | testosteroni/GH | **pre-PHV heikko 30m/MAS = NEUTRAALI, ei negatiivinen signaali** |
| **Voima** (CMJ, 5RM) | **post-PHV** | anaboliset hormonit | **CMJ pre-PHV = koordinaation mittari, EI voiman.** Post-PHV 3–4× voimakasvu |
| **Peliäly** (D4: ADAR) | laaja ~U10→U19 (kortikaalinen) | strateginen taso kypsyy myöhään | **ADAR-kynnykset ikävaihekohtaisia** — U11 ≠ U16, ei suoraa vertailua |

### Signaloinnin invariantit (Hidden Gem & FVP — ÄLÄ KOODAA ILMAN NÄITÄ)
1. **Hidden Gem on PHV-tilakohtainen.** korkea D2 + matala D1 **PRE-PHV** = aito gem (fysiikka tulee automaattisesti 2–4 v sisällä). **POST-PHV** sama profiili = fyysinen nousuvara EI enää tule automaattisesti → hyvä pelaaja, mutta ei "jalostamaton timantti". Sama luku, eri merkitys.
2. **FVP (5m/30m) tulkittava PHV-kontekstissa.** matala FVP pre-PHV = normaali (nopeusprofiili odotettu); post-PHV = aito voimanpuute. **Ilman PHV-dataa (Sibbo/SJK) FVP-arvoa EI saa tulkita voimaksi** — VP:lle näytettävä ilman voimajohtopäätöstä.
3. **Pre-PHV heikko 30m/MAS/CMJ ei laske talenttiarviota** — biologisesti odotettua, ei kehityskohde.
4. **Kullankimpale:** korkea FLEI + korkea D2 **pre-PHV** = molemmat kriittiset ikkunat käytetty samanaikaisesti → ansaitsee oman merkin/painokertoimen Hidden Gem -logiikassa.
5. **Varhainen tekniikkamitali = longitudinaalinen vahvistus (vahvin signaali).** Tekniikkakilpailun **kulta/hopea U8–U12** todistaa että tekninen ohjelma rakentui plastisimmassa ikkunassa → **motorinen automatisaatio** (taito siirtyy tietoisesta kontrollista alitajuntaan) → vapauttaa kognitiivista kapasiteettia peliälylle (D4) 3–5 v myöhemmin. *Palloliitto: "Peliä on mahdollista havainnoida tehokkaasti vasta kun motoriset suoritukset ovat saavuttaneet riittävän tason."* **Eri luokan löytö** kuin korkea D2 tänään (joka voi olla myöhäiskehitystä tai yksittäinen testipäivä). → Hidden Gem -porras "Tekninen varhaiskehitys vahvistettu".

**Toteutus:** tekniikkakilpailutulokset ovat `testitulokset/`-alikokoelmassa (`merkki`/`ika`/`pvm`), mutta §26 = ei alikokoelmakyselyjä renderöinnissä → **pikakenttä** `tekninen_varhaiskehitys: {merkki, ika, pvm}` (null jos ei) lasketaan tuonnissa/recalcissa pelaajan tekniikkakilpailuhistoriasta (paras kulta/hopea kun ika 8–12).

**Käytännön rajoite (2026-06):** pilottidatassa ei vielä PHV:tä → Hidden Gem porrastettava: **ehdokas** (korkea D2 + matala D1, toimii nyt) → **vahvistettu** (+ PRE-PHV, kun bio-ikä mitattu) → **varhaiskehitys vahvistettu** (+ tekniikkamitali U8–U12, longitudinaalinen).

**Toteutus — FC-kortin OVR-lattia (Pelaaja_v7 `naytaFcOverlay`, 2026-06-16):** invariantti #3:n koodisuoja. PRE/LAH-tilassa D1 lasketaan OVR:ään `ovrVal = Math.max(norm5(d1_taso), 50)` (neutraali lattia 50 = taso 3) → raaka pre-PHV-fyysinen ei vedä late-developerin OVR:ää neutraalin alle. Kortti näyttää yhä 🌱 (FYS-ruutu = `state:'grow'`, ei lukua). Vain OVR-osuus lattioidaan; gate ≥3, painot (.40) ja RAE ennallaan. `norm5 = t→round((t-1)/4*99)`.

---
