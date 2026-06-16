# Joustava indeksilaskenta — analyysi (testit + muutos)

> 2026-06-16. Tausta: Pallo-Iirot P10 H-H-data (10m/30m + syöttö/pujottelu, ei cmj/mas/TKI) ei näkynyt missään näkymässä,
> koska järjestelmä oli jäykkä "kaikki tai ei mitään" (näkymät vaativat johdetut indeksit täydeltä patterilta).
> Päätös: **indeksit lasketaan niistä testeistä jotka on tehty** (joustava d1_taso/d2_taso + kattavuus). Tämä doc =
> testimaiseman analyysi + muutoksen periaate + kansainvälistymisen (seurat testaavat omilla tavoillaan) reunaehdot.
> Liittyy: §14 (5D) · §22 (testit) · §23 (TKI) · §26 (pikakentät) · §28 (PHV/herkkyysikkunat) · §30 (KPI master).

---

## 1. MIKSI — jäykkyyden ongelma

Nykyrakenne: raakatesti → **johdettu indeksi** (hh_taso / TKI / TSI) → näkymä. Indeksit vaativat **kiinteän patterin**:
- `hh_taso` vaatii 30m + CMJ + MAS (kolme avaintestiä) → ilman cmj/mas = null.
- `TKI` vaatii 4–5 TK-lajia → ilman niitä = null.
- `TSI` vaatii sm_pallo + sm_juoksu.

Kun seura tekee **osajoukon** testeistä (kuten Pallo-Iirot: 10m/30m + syöttö/pujottelu), kaikki johdetut indeksit jäävät nulliksi → data on tallessa (`hh_viimeisin`) mutta **ei näy missään**. Tämä on **kansainvälistymisen estävä jäykkyys**: ulkomaiset seurat eivät tee Palloliiton täsmäpatteria — ne testaavat omilla tavoillaan, omilla osajoukoillaan.

**Periaate korjauksen jälkeen:** indeksi = *funktio saatavilla olevista testeistä + normeista + kattavuudesta*. Näytä mitä on, merkitse kattavuus, älä vaadi täyttä patteria.

---

## 2. TESTIMAISEMA — mitä TalentMaster osaa, dimensioittain

| Dimensio | Testit | Normi (raaka → taso) | Indeksi |
|---|---|---|---|
| **D1 Fyysinen** | lin5/10/20/30m · CMJ · SJ · MAS · kasirata · 5-0-5 · (sm_juoksu silta) | Eerikkilä 5-port (FINAL2024) | `d1_taso` = ka saatavilla olevista tasoista ✅ jo joustava |
| **D2 Tekninen** | **TK-lajit** (ponnauttelu/syöttö/pujottelu/kulj-laukaus/pituuspotku) · **H-H pujottelu/syöttö** · TSI (sm_pallo−sm_juoksu) | TK: aikapohjainen `TK_KOKONAISRAJAT` + merkit · H-H: 3-port FINAL2024 · TSI: erotus | `d2_taso` = TKI TAI H-H 3-port (← muutoksen ydin) |
| **FLEI** (pohjavalmius, EI dimensio) | 5 ketjua SBL/SFL/LL/DIAG/DFL | raaka 1–3 → `(arvo-1)/2×100` = 0–100 % | `flei_viimeisin`; <40 % → klinikka |
| **D4 Peliäly** | ADAR (havaitse/päätä/toimi/arvioi) | 1–3, ikävaihekynnykset (§28) | `adar_viimeisin`; ≥3 havaintoa luotettava |
| **D3 Psyykkinen** | D3-kysely (Inner Drive/Coachability/Resilience/Focus/Emotional Control) | Likert 1–5 | `d3_viimeisin`; seuravetoinen |
| **D5 Sosiaalinen** | — (ei mittaria) | — | — |
| **Bio/PHV** | pituus·paino·istumapituus·ikä | Mirwald 2002 | `phv_tila`; **ohittaa kronologisen iän** |

Huom: **mittaus on universaali, normi lokaali** (§30). Sama liike (esim. 30m) mitataan kaikkialla, mutta taso-tulkinta riippuu maakohtaisesta normista.

---

## 3. JOUSTAVAN INDEKSIN KAKSI KOMPONENTTIA

Indeksi = **(a) mitkä testit kuuluvat mihin dimensioon** + **(b) mikä normi muuntaa raa'an tasoksi**.

- **(a) testi→dimensio** on melko universaali (30m = nopeus = D1 kaikkialla). Tämän joustavuus = "laske ka niistä jotka on" — **tämä on nyt toteutettava muutos** (d1_taso jo tekee tämän; d2_taso laajenee H-H:hon).
- **(b) raaka→taso normi** on **lokaali ja kova kansainvälinen ongelma** (ks. §5). Suomessa: Eerikkilä/FINAL2024/TK-merkkirajat. Ulkomailla: seuran/maan oma normi tai mäppäys.

Tämän muutoksen ydin on (a): **d1_taso + d2_taso lasketaan saatavilla olevista testeistä**, suomalaisilla normeilla. (b):n yleistäminen on vaihe 2.

---

## 4. KATTAVUUS & LUOTTAMUS — välttämätön pari joustavuudelle

Joustavuus ilman kattavuusmerkintää on vaarallista: **2 testin `d1_taso` ei ole vertailukelpoinen 7 testin kanssa.** Siksi:

- Jokainen indeksi kantaa **kattavuuden** (montako / mitkä testit) + lähteen (`d1_lahde`/`d2_lahde` = 'tki'|'hh'|'sm').
- Näkymä näyttää indeksin + kattavuuden ("D1 3.2 · 2/7 testiä") — ei piilota, mutta ei myöskään väitä ohutta dataa varmaksi.
- **Load-bearing-testit:** jotkin testit kantavat dimensiota enemmän. D1 ilman maksiminopeutta/voimaa (30m/MAS/CMJ) on osittainen; **§28: pre-PHV heikko 30m/MAS/CMJ on NEUTRAALI** → kattavuus + PHV-konteksti estävät väärät johtopäätökset.
- **Minimikynnys:** harkitse minimi-testimäärä ennen kuin indeksi näytetään "indeksinä" vs "yksittäisinä tuloksina" (esim. d2 yhdestä testistä = "tekniikkanäyte", ei "D2-taso").

---

## 5. KANSAINVÄLISTYMISEN REUNAEHTO — normi on este, ei testi

Tärkein oivallus: **joustava testi→dimensio (a) ratkaisee Pallo-Iirot-tyyppisen kotimaisen osajoukon, muttei vielä kansainvälistä.** Ulkomainen seura omilla testeillä törmää (b):hen:

- Eerikkilä/FINAL2024 ovat **suomalaisia väestönormeja**. Saksalaisen/ruotsalaisen seuran 30m-aika pitää verrata **heidän** normiinsa, ei suomalaiseen — muuten taso on systemaattisesti väärä.
- Jos seura tekee testin jota TM ei tunne (esm. oma ketteryystesti), TM:llä ei ole normia → indeksi ei laskettavissa ilman mäppäystä.

**Vaihe 2 (kansainvälinen) = konfiguroitava testi→dimensio→normi-mäppäys:**
1. Seura/maa ilmoittaa **testivalikoimansa** (mitä mittaavat) + **normilähteen** (oma normi / lähin TM-normi / raaka ilman normia).
2. TM mäppää testit dimensioihin (universaali) + soveltaa **valittua normia** tasoksi.
3. `seurat/{sid}/konfiguraatio/normisto: 'eerikkila_fi' | 'oma' | 'mapattu'` (vrt. §22 `tunnistetyyppi`-pattern).
4. Tuntemattomat testit → raaka näytetään, mutta indeksiin vain jos normi olemassa.

Tämä on iso, mutta **tämän muutoksen (joustava d1/d2 + kattavuus) arkkitehtuuri on sen suora pohja** — sama "laske saatavilla olevista" -logiikka, vain normilähde vaihtuu konfiguraatiosta.

---

## 6. RISKIT & VARAUKSET tässä muutoksessa

1. **Vertailtavuus:** ohut indeksi ≠ täysi → kattavuus AINA näkyviin; älä rankkaa seuroja/pelaajia eri kattavuuksilla suoraan.
2. **§28 PHV:** pre-PHV fyysinen ei rankaise (D1-lattia jo tehty FIFA-kortissa) — sama periaate joustavaan d1:een.
3. **§7.22 pelaajalle:** tasolukuja ei näytetä lapselle jos sääntö niin sanoo; tekniikka lapsen kielellä.
4. **Norm-sekaannus:** H-H pujottelu/syöttö (3-port populaationormi) vs TK pujottelu/syöttö (huippukynnys) — **eri normi, sama rata** (§30). Joustava d2 saa käyttää H-H 3-porttia kun TKI puuttuu, **mutta merkittävä lähde** ('hh' vs 'tki') ettei sekoa.
5. **Hiljainen yliväittäminen:** yhden testin "D2-taso" voi näyttää varmemmalta kuin on → kattavuus + lähde pakollisina.

---

## 7. SUOSITUKSET

- **Nyt (toteutuksessa):** d1_taso + d2_taso joustaviksi (lasketaan saatavilla olevista), d2 myös H-H syöttö/pujottelusta, kattavuus + lähde näkyviin, näkymät lukevat näitä ensisijaisesti. Ratkaisee Pallo-Iirot + kotimaiset osajoukot.
- **Vaihe 2 (kansainvälinen):** konfiguroitava normilähde per seura/maa (§5) + minimi-kattavuuskynnykset + tuntematon-testi-käsittely.
- **Periaate kaikkialle:** *mittaa mitä haluat, me laskemme indeksit niistä joille meillä on normi, ja kerromme rehellisesti kuinka kattava kuva on.* Tämä on samalla myyntiviesti: TM taipuu seuran testikäytäntöön, ei pakota patteria.

---

## 8. PER-TEST ARVIOINTI TM-NORMEILLA (yksittäiset testit) — joustavuuden päätepiste

> Käyttäjän linjaus 2026-06-16: "arvioidaan meidän normeilla näitä testejä myös yksittäisiä."

Aggregoitu indeksi (d1/d2) on yksi taso. **Sen alle tarvitaan per-test arviointi:** jokainen tehty testi saa *oman tasonsa* TM-normilla, näkyviin sellaisenaan — riippumatta siitä laskeutuuko aggregaatti.

**Periaate:** jokainen raakatesti → `eerikkilaTaso(arvo, testi, ika, sp)` (tai 3-port / TK-merkki testityypin mukaan) → **per-test taso (1–5 / 1–3 / mitali)** näytetään. Yksi testi on arvokas yksin: "30m = taso 4 · syöttö (H-H) = taso 3" vaikka cmj/mas puuttuu.

**Normi per testityyppi (TM, Suomi):**
- Fyysiset (lin*, CMJ, SJ, MAS, kasirata, sm_*) → **Eerikkilä 5-port** (FINAL2024). MAS ÷3.6 ennen normia.
- H-H pujottelu/syöttö → **3-port FINAL2024** (populaationormi, vain P/T 10–15).
- TK-lajit → **TK-merkit/kynnykset** (huippukynnys, eri kuin H-H — `d2_lahde` erottaa).
- FLEI-ketjut → 0–100 % (raaka 1–3).

**Mitä tämä antaa:**
1. **Yksittäinen testi näkyy aina** taso-arvioituna (detail-paneelit tekevät tätä jo per rivi; tehdään johdonmukaiseksi + näkyväksi kaikkialle, myös kun aggregaatti puuttuu).
2. **Aggregaatti = per-test tasojen ka** (läpinäkyvä: käyttäjä näkee mistä d1/d2 koostuu).
3. **Vahvuus/kehityskohde per test** (mikä testi taso 5 = X-Factor; mikä matala = kehityskohde) — toimii ohuellakin datalla.
4. **§28-konteksti per test:** pre-PHV heikko 30m/MAS/CMJ neutraali, ei "matala taso" -leima.

**Reunaehdot:** ikä+sp pakollinen normiin (syntymaVuosi tai joukkuenimi-fallback "P10"→10/M); jos puuttuu → raaka näytetään ilman tasoa (ei väärää tasoa). Pelaajalle §7.22 (ei tasolukuja jos sääntö niin sanoo → lapsen kieli). Kansainvälisesti: per-test taso käyttää §5:n konfiguroitavaa normilähdettä.

**Toteutus:** osa nyt menevää joustava-d1/d2-työtä (detail-paneelit näyttävät per-test tasot eerikkilaTaso:lla); varmistetaan että per-test arviointi on **ensisijainen näkyvä kerros** indeksin rinnalla, ei piilossa detailin takana. Sama kanoninen `eerikkilaTaso`-funktio kaikkialle.
