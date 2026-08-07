# CODE — Testit-hub P1: Tuo tiedostosta (oikea moodi) + joustava testivalitsin

**Osa Testit-teemaa** (master: `docs/CODE_OHJE_TESTIT_TEEMA_ROADMAP.md`). **Jatkoa P0:lle** (`ws-testit`-hub jo olemassa).
**Kohteet:** `TalentMaster_Excel_Tuonti.html`, `TalentMaster_VP_v25.html` (+ Master P3:ssa, ei tässä).
**Design-totuus:** artefakti `tm-testit-hub-designmap` (§02b joustava valitsin). **Kaksi pinottua PR:ää — P1.1 ensin, sitten P1.2.**

## Periaate (Teron linjaus)
Useimmat seurat **soveltavat** — valitsevat protokollasta sopivat testit tai yksittäisiä testejä. Testivalinnan on oltava
joustava, ja "Tuo tiedostosta" -kortit vievät **oikeaan moodiin** (ei kaikki samaan yleisnäkymään). Datamalli tukee jo
(`aktiiviset_testit`), ja Testaus_v9:ssä on jo joustava valitsin — P1 tuo saman Excel-pohjan generointiin + korjaa reitityksen.

---

## PR P1.1 — "Tuo tiedostosta" -korttien oikea moodi (pieni, TEE ENSIN)

**Ongelma:** P0:ssa kaikki kolme korttia (`_vpTestitTuo`) avaavat `Excel_Tuonti.html?seuraId=` → sama yleisnäkymä
(Excel-tab + Moodi A). Käyttäjän pitäisi tietää itse vaihtaa PDF-tabiin tai historia-moodiin. Excel_Tuonnissa **ei ole
URL-paramia** tabin/moodin esivalintaan.

### Työ
1. **Excel_Tuonti init (parsinta ~rivi 1471–1484, `?lataa=`-lohkon viereen):** lue kaksi uutta paramia ja kutsu
   **olemassa olevia** toggle-funktioita DOM:in valmistuttua (sama `setTimeout ~700ms` -kuvio kuin `?lataa=`):
   - `?tab=pdf` → `vaihtoTuontityyppi('pdf')` (rivi 676).
   - `?moodi=historia` → `valitseMoodi('historia')` (rivi 691) + varmista että Excel-tab on aktiivinen ensin.
   - Oletus (ei paramia) ennallaan: Excel-tab + Moodi A. **Ei muuta logiikkaa** — vain esivalinta olemassa olevilla funktioilla.
2. **VP hub (`_vpTestitTuo`, P0):** pilko kolmeksi reitittimeksi (tai anna moodi-argumentti):
   - **Excel-pohja** → `Excel_Tuonti.html?seuraId=<sid>` (oletus: Excel + tapahtuma/lataus).
   - **Historiatuonti** → `Excel_Tuonti.html?seuraId=<sid>&moodi=historia`.
   - **Palloliiton PDF** → `Excel_Tuonti.html?seuraId=<sid>&tab=pdf`.

### DoD P1.1
- **L1:** Excel_Tuonti init lukee `?tab=`/`?moodi=` → kutsuu `vaihtoTuontityyppi`/`valitseMoodi`; hub-kortit välittävät oikeat paramit.
- **L3 (elävä):** hubista "Historiatuonti" avaa Excel_Tuonnin **historia-moodissa**, "Palloliiton PDF" **PDF-tabissa**, "Excel-pohja" oletusnäkymässä. Molemmat teemat.
- Pieni PR. Ei skeema-/Rules-/laskentamuutosta.

---

## PR P1.2 — Joustava testivalitsin + testilistapohjainen Excel-pohja (keskikokoinen)

**Tavoite:** "Excel-pohja" -reitti antaa valita **protokolla-esitäytön TAI yksittäiset testit**, ja generoi pohjan
**valituille testeille** (ei koko protokollaa). Kenttäkirjaus (Testaus_v9) tukee jo tätä (`vapaa`-protokolla +
checkboxit) — tämä tuo saman Excel-pohjaan + yhtenäistää.

### Nykytila (vahvistettu koodista)
- `generoiExcelPohja(protokolla, joukkueNimi)` (~1113) + `pohjaSarakkeet(protokolla)` (~1036) ovat **protokolla-lukittuja**
  (`PROTOKOLLAT`-avain, ~926–1019). MUTTA **geneerinen fallback-haara (~1074–1081) rakentaa sarakkeet jo `proto.testit[]`
  -listasta** → 90 % valmis testilistapohjaiseen generointiin.
- Testaus_v9:ssä on jo **`VAPAA_TESTIPANKKI`** (kategorioitu testimeta) + valitsin (`_v1RenderoiVapaa` ~1793,
  `_haeProto` ~1332 syntetisoi proto-objektin mielivaltaisesta `aktiiviset_testit[]`:sta). **Älä keksi uutta** — käytä tätä.
- **Luku-polku `_pohjaHeaderMap()` (~1196) + `prosessoiExcel`** tarvitsevat saman testilistan tunnistaakseen sarakkeet.

### Työ

**1. Valitsin-UI (Excel-pohja -kortin avaus hubissa):** protokolla-esitäyttö (6 `PROTOKOLLAT`-avainta) → ruksaa testit
valmiiksi → **karsi/lisää yksittäisiä testejä** koko pankista (`VAPAA_TESTIPANKKI`-meta) → "Lataa pohja".
Alustaherkille (`ALUSTAHERKAT_TESTIT`, Testaus_v9 ~1090) alusta-tieto kysytään vain kun ne ovat mukana (§22).
Design-lukko + molemmat teemat (02b-mock referenssi).

**2. Generaattorin yleistys:** laajenna `generoiExcelPohja` ottamaan **joko protokolla-avain TAI proto-objekti/`testit[]`**
(`_haeProto`-tyylinen). Reititä testilista **geneeriseen `pohjaSarakkeet`-haaraan** (1074–1081, joka jo osaa). Erikoislaji-
sarakkeet (kuljetus_laukaus `kl_raaka/kl_vahennys`, pituuspotku `pp_oikea/pp_vasen`, MAS `min,sek`) pidä **protokolla-/
metaspesifeinä poikkeuksina** — jos valittu testi vaatii erikoissarakkeet, käytä samaa metaa kuin protokollahaara.

**3. ⚠ KRIITTINEN suunnittelupäätös — generointi↔luku-skeeman siirto. Suositus: META-LEHTI (itsekuvaava pohja).**
URL `?lataa=` ei skaalaudu mielivaltaiselle listalle, eikä pohjaa saa sitoa tapahtumaan (kevyt polku). **Ratkaisu:**
generoi Exceliin **piilotettu "Meta"-lehti** joka listaa valitut `testId`:t (+ yksikkö/yritykset/kind). Tuonnissa
`_pohjaHeaderMap`/`prosessoiExcel` **lukee Meta-lehden** → tietää sarakkeet ilman tapahtumaa/URL-riippuvuutta →
**pohja on itsekuvaava.** Fallback nykyiseen `tunnistaTestiId`-fuzzyyn jos Meta-lehti puuttuu (vanhat pohjat).
- *(Vaihtoehto jota EI valita ilman erillistä päätöstä: tapahtuma-ID-polku — VP luo tapahtuman `aktiiviset_testit`:llä →
  `?tapahtumaId=` → pohja+tuonti siitä. Robusti mutta sitoo kevyen pohjalatauksen tapahtuman luontiin. Meta-lehti on kevyempi.)*

**4. Testi-id-konvention yhtenäistys:** Excel_Tuonti `PROTOKOLLAT` käyttää `lin30m` (ilman alaviivaa), Testaus_v9
`VAPAA_TESTIPANKKI`/`ALUSTAHERKAT` käyttää `lin_5m/lin_10m/lin_30m` (alaviivalla). **Valitse yksi kanoninen muoto** ja
mappaa toinen (älä jätä kahta rinnakkaista id-avaruutta valitsimeen). Dokumentoi valinta kommenttiin.

**5. Jaettu lähde (suositus):** jos kohtuudella mahdollista, nosta `VAPAA_TESTIPANKKI` + testimeta jaettuun libiin
(esim. laajenna olemassa olevaa `src/lib/tm_testipankki.js` tai `lib/`-vastine) jota **sekä Testaus_v9 että Excel_Tuonti**
käyttävät → yksi testimeta-lähde. Jos ekstraktio liian iso tähän PR:ään: inline + "⚠ PIDÄ SYNKASSA Testaus_v9
VAPAA_TESTIPANKKI" -kommentti.

### DoD P1.2
- **L1:** Excel-pohja -reitti näyttää valitsimen (protokolla-esitäyttö + yksittäisten testien karsinta/lisäys);
  `generoiExcelPohja` ottaa testilistan → generoi pohjan valituille testeille geneerisellä haaralla + **Meta-lehti**;
  `_pohjaHeaderMap`/`prosessoiExcel` lukee Meta-lehden → tuonti tunnistaa sarakkeet; erikoislajit toimivat; id-konventio yhtenäinen.
- **L2 (vitest):** pohjan sarakegenerointi mielivaltaisesta `testit[]`:sta (oikeat headerit + kind/yritys); Meta-lehden
  luku palauttaa saman skeeman (round-trip); alustaherkkä-suodatus. ~893+ vihreä.
- **L3 (elävä, molemmat teemat):** valitse "H-H laaja" -esitäyttö → karsi MAS pois + lisää kasirata → lataa pohja →
  Excelissä sarakkeet vain valituille testeille + Meta-lehti; tuo sama tiedosto takaisin → tunnistaa testit → tallentaa +
  laskee pikakentät (Vaihe 1). Verifioi ettei koko protokollaa pakoteta.
- Keskikokoinen PR (mutta oma, erillään P1.1:stä).

## Yhteiset reunaehdot (molemmat PR:t)
- **Ei uutta laskentaa** (kanoniset libit + Vaihe 1:n pikakenttälaskenta). **Ei uutta Rules-tarvetta** (sama kirjoituspolku, samat roolit).
- **Yksi testimeta-lähde** (VAPAA_TESTIPANKKI) — ei kolmatta kopiota. §26 pari-invariantti tuonnissa (jo olemassa `prosessoiExcel`:ssä).
- **Design-lukko + molemmat teemat.** Ei käsin-versiobumppia (§33 + CI-vartija). Kukin PR verifioidaan livenä ennen seuraavaa.

## Huom Codelle
- **Tee P1.1 ensin** (pieni, turvallinen, näkyvä hyöty) ja raportoi → verifioin → sitten P1.2.
- P1.2:n **Meta-lehti-päätös** on arkkitehtuurisuositukseni; jos törmäät esteeseen (esim. SheetJS piilolehti), kerro
  raportissa ennen kuin vaihdat tapahtuma-ID-polkuun — se on eri kompromissi.
- Kenttäkirjauksen joustava valitsin (Testaus_v9 `vapaa`) on jo olemassa → **älä rakenna sitä uudelleen**, käytä/jaa se.
