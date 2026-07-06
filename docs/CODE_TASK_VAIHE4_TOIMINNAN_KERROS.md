# Vaihe 4 — Toiminnan kerros: konsepti → cue → harjoite (data muuttuu resepteiksi)

> Lähde: co-design 2026-07-05. Suurin vipu (`KEHITYSTYON_VAIHEET.md` aukko #1): syväanalyysi antaa diagnoosin, Vaihe 4 antaa **reseptin**. Rakentuu teknis-taktisen curriculumin (`DATAMALLI_TEKNISTAKTINEN.md` + Master_kokonaisuus.xlsx) + IDP-ytimen (3a/3b/3c) päälle. Kohde: `Master_v16` (valmentaja, omistaa kentän) + `VP_v25` (oversight) + `Pelaaja_v7`/`Vanhempi_v2` (cue-kerros §7.22). §7b · §7.22 · §26 · §28 · §35 · §A7.

## 0. RIIPPUVUUS (kriittinen)
Vaihe 4 tarvitsee **sisällön dataksi = I1-parseri** (`lib/tm_teknistaktiset.js`, Excelistä: konseptit + kriteerit + **kysymykset (cue)** + **harjoitteet**). Ilman sitä ketjussa ei ole sisältöä. **I1 rakennetaan ensin** (oma brief), sitten Vaihe 4 = työnkulku joka käyttää sitä. Spec suunnittelee työnkulun; toteutus alkaa I1:n jälkeen.

## 1. Ydin — kolmen palan ketju
Jokainen kehityskohde (IDP-fokus 3a / heikoin arvio / jaksofokus) purkautuu **kolmeksi toiminnaksi**:
1. **KONSEPTI** — mitä kehitetään (curriculum: youth Y-H0…Y-P4 / pelipaikkafundamentti T-P1… + `ydinkonsepti` "mitä tulee ymmärtää"). Pelitilanne + pelimuoto (§7b).
2. **CUE** — miten ohjataan (`Kysymyspankki`: ohjaavat kysymykset). Valmentajalle kentällä + pelaajalle reflektointiin ("kysymys tekee älykkään").
3. **HARJOITE** — millä kehitetään (`Harjoitepankki`: painopisteet + harjoite-esimerkit oikeassa pelimuodossa 3v3→11v11 + auto-suositus).

## 2. ROOLIT — jokaisen näkymä + toiminta Vaiheessa 4
| Rooli | Näkee | Tekee |
|---|---|---|
| **Valmentaja** (omistaa kentän) | Jaksofokus + konsepti (ydinkonsepti/kriteerit) + cue-kysymykset + suositellut harjoitteet + pelimuoto | Vahvistaa/valitsee konseptin jaksolle · vie cue+harjoite treeniin · havainnoi · kirjaa toteutuman → 3b-review + arviointi |
| **VP** (oversight) | Mitä konsepteja työn alla joukkueittain/seurassa · kattavuus · coaching-laatu (VAI+) | Suosittaa painopistettä · varmistaa että fokus → toiminta toteutuu (ei jää diagnoosiksi) |
| **Talentti-/fysiikka-/erikoisvalmentaja** | Oman vastuualueen konseptit (D1 fys / D2-D4 tekn-takt) | Oman osa-alueen harjoitteet + cue; sama ketju |
| **Pelaaja** (§7.22) | Konsepti omalla kielellä (jaettu ymmärrys §0b: mikä/miksi pelissä) + yksi cue-kysymys + "kokeile tänään" | Ymmärtää · kokeilee · reflektoi kysymyksen kautta (ei tasolukuja/harjoite-suoritusarviota) |
| **Vanhempi** (§7.22) | Sama konsepti perhekielellä + "miten tukea" | Tukee autonomiaa (Deci&Ryan), ei painosta |

**Invariantti (§ valmentaja omistaa kentän):** järjestelmä *ehdottaa* konsepti/cue/harjoite; valmentaja *päättää ja vie kentälle*. Ei pakota harjoitusohjelmaa.

## 3. KONSEPTI — mistä tulee, miten valitaan
- Lähde: IDP-fokus (3a `idp_fokus`) TAI arvioinnin heikoin (Vaihe 2 `arviointi_havaittu` / teknis-taktinen `tt_heikoin`) TAI valmentajan valinta.
- **§28-kypsyysvahti:** ei-fyysinen etusijalle ilman PHV-dataa (sama kuin 3a). Pre-PHV taito-ikkuna → tekniikka/taito ensin.
- **Ikävaihe (§ näkemyskaari):** U13 pelipaikaton → youth-konsepti; U15+ → pelipaikkafundamentti. Yksi konsepti kerrallaan per jakso (ei ylikuormita).

## 4. CUE — Kysymyspankki, kaksi kieltä
- **Valmentaja (kenttä):** 3 ohjaavaa kysymystä konseptista (Kysymyspankki) — käytetään harjoituksessa ja pelin jälkeen.
- **Pelaaja (reflektointi, §7.22):** yksi kysymys pelaajan kielellä (jaettu ymmärrys) → oivallus, ei käsky.
- Periaate: "kysymys tekee älykkään, käsky tottelevaisen."

## 5. HARJOITE — Harjoitepankki + pelimuoto
- Suositellut harjoitteet konseptista (`Harjoitepankki`: painopisteet + esimerkit) **oikeassa pelimuodossa** (3v3/5v5/8v8/11v11, näkemyskaari-ikä).
- **Auto-suositus** (Excelin sarake): kun arvio heikko (taso 1–2) → nosta harjoite automaattisesti. Valmentaja valitsee/muokkaa.
- **Kytkös §A7:** youth-tasolla harjoitelogiikka_v4 (S/T-harjoite heikoimpaan ketjuun) täydentää; teknis-taktinen tuo pelitilanneharjoitteet.

## 6. JAKSO (meso 1–6 vk) — konseptin koti + kalenteri
- **Jaksofokus** = kausifokuksen (makro) alle laddaava 1–6 vk lohko, jonka konsepti työn alla. Täyttää aloitusnäkymän jaksofokus-placeholderin.
- **Kalenteri (§35):** harjoitteet sijoittuvat jakson harjoituksiin (kalenteri-tapahtumat); läsnäolo/kuorma (K2/K5) kytkeytyy.
- **Silmukka:** jakso alkaa (konsepti+cue+harjoite) → treenit → valmentaja havainnoi → 3b-review + arviointi päivittyy → seuraava jakso (uusi konsepti tai syvennä).

## 7. Firestore + pikakentät (§26)
- Jaksofokus pikakenttä pelaajadokkiin: `jaksofokus: {konsepti_avain, alkoi, kesto_vk, cue_id, harjoite_id}` (aloitusnäkymä + kortti lukevat ilman alikokoelmakyselyä). Historia `idp_kausi`/jakso-alikokoelmassa.
- Konsepti/cue/harjoite-**sisältö** = `lib/tm_teknistaktiset.js` (I1, staattinen), EI Firestoreen. Vain pelaajakohtainen jaksofokus + toteutuma persistoidaan.
- Ei uutta raskasta infraa; kalenteri (§35) hoitaa harjoitussijoituksen.

## 8. Invariantit
§7b (konsepti AINA pelitilanteen kautta, pelimuoto näkyvissä) · §7.22 (pelaaja/perhe: cue + ymmärrys, ei tasolukuja/harjoitearviota) · §28 (kypsyysvahti konseptivalinnassa) · § valmentaja omistaa kentän (ehdotus, ei pakko) · §26 pikakentät · §5 · GDPR §33. Curriculum = talon metodi (`ARVIOINTI_KEHYKSET`, korvattavissa). Ei version.json-bumppia toteutuksessa.

## 9b. SUUNNITELMAN TARKISTUS (2026-07-05) — ketjun kattavuus per vaihe
Tarkistettu Excelistä että konsepti + cue + harjoite tulevat suunnitelluksi kaikille:

| Pala | Youth-vaihe (U6–14) | Pelipaikkavaihe (U15+) |
|---|---|---|
| **Konsepti** | ✅ Y-H0…Y-P4 (14) + ydinkonsepti/kriteerit | ✅ T-/CB-fundamentit + kriteerit 1/3/5 + ydinkonsepti |
| **Cue (kysymykset)** | ✅ Kysymyspankki 3 kysymystä/konsepti | ⚠️ **PUUTTUU — pelipaikkafundamenteilla ei cue-kysymyksiä** |
| **Harjoite** | 🔶 §A7 harjoitelogiikka (S/T heikoimpaan) + pelimuoto | ✅ Harjoitepankki 92 harjoitetta, koodit täsmää (CB-P1…) |

**Aukko (kirjattu):** pelipaikkafundamenteilta puuttuu **cue-kysymykset** (Kysymyspankki kattaa vain youthin). Ratkaisu Vaihe 4:ssä:
- **Väliaikaisesti:** pelipaikkavaiheessa cue = `ydinkonsepti` ("mitä tulee ymmärtää") + `kriteerit` (taso 1/3/5) coaching-promptina — ne toimivat ohjaavana sisältönä kunnes kysymykset kirjoitetaan.
- **Sisältötyö (Excel):** lisää Kysymyspankkiin 3 kysymystä per pelipaikkafundamentti (samoin kuin youthilla) → täysi cue-ketju. Erillinen sisältötehtävä, ei koodia.
**Harjoite-lähde eroaa vaiheittain (invariantti):** youth → §A7-generaattori + pelimuoto; pelipaikka → Harjoitepankki (koodilinkki `T-P1`→harjoite). Vaihe 4 valitsee lähteen `tt_vaihe`:n mukaan. **Harjoitesuositus-sarake Excelissä tyhjä** → auto-suositus = Harjoitepankki-koodilinkki, ei sarakkeesta.
**Muut roolit (hallinto):** seurasihteeri/UTJ/fysioterapeutti EIVÄT ole toiminnan kerroksen osallistujia (hallinto/terveys omat polkunsa; fysioterapeutti kytkeytyy kuorma/kasvu-aukkoon §KEHITYSTYON_VAIHEET, ei ydinketjuun).

## 9c. HARJOITTELUN SUUNNITTELU — teemat → kalenteri (Teron lisäys 2026-07-05)
Curriculumin teemat eivät ole vain *arviointia* vaan **valmentajan harjoitteluohje**: mitä harjoitellaan missäkin iässä/pelipaikassa. Vaihe 4 ei siis palvele vain yksilön IDP:tä vaan **koko joukkueen harjoittelun suunnittelua**.
- **Kaksi tasoa suunnittelussa:**
  - **Yksilön teknis-taktinen** (OMA_VERSIO youth + pelipaikka) — mitä pelaajat kehittävät.
  - **Joukkuetaktinen** (JOUKKUEEN pelimalli / pelin vaiheet — hyökkäys/puolustus/siirtymät) — **UUSI kerros, sisältö puuttuu** (OMA_VERSIO on yksilötaso). Yhdistetään yksilöteemoihin suunnittelussa.
- **Työnkulku:** valmentaja **valitsee harjoitusteemat** (yksilö + joukkuetaktinen) → ne muodostavat **jakson harjoittelusuunnitelman** → **istuvat kalenteriin (§35)** harjoitustapahtumina. Näin kalenteri saa *sisällön* (ei vain aikoja): "tämän viikon treeni: teema T-P3 selusta + joukkuetaktinen prässi".
- **Kytkös:** jaksofokus (§6) + kalenteri (§35 tapahtumat) + youth "Painotus/Pelimuoto" (OMA_VERSIO) + Harjoitepankki/konseptipelit → valmentaja rakentaa treenin teemasta.
- **Aukko (kirjattu):** **joukkuetaktinen malli puuttuu** — OMA_VERSIO kattaa yksilön. Tarvitaan joukkuetaktinen teemasto (pelin vaiheet joukkuetasolla) jos se yhdistetään. Kysytään Terolta onko oma joukkuetaktinen malli olemassa (kuten yksilömalli oli).
- **Vaiheistus:** tämä on **4d–4e** (harjoittelun suunnittelu → kalenteri) — rakentuu 4a:n (yksilö konsepti→cue→harjoite) + §35-kalenterin päälle. Joukkuetaktinen = oma sisältö- + suunnittelupala.

## 9. Vaiheistus
- **I1 (edellytys):** parseri → `lib/tm_teknistaktiset.js` (konseptit+kriteerit+cue+harjoitteet). Oma brief.
- **4a:** valmentajan konsepti→cue→harjoite -kortti (Master) + jaksofokus + toteutuman kirjaus → 3b/arviointi.
- **4b:** pelaaja/perhe cue-kerros (Pelaaja_v7/Vanhempi_v2, §7.22 — jaettu ymmärrys jo suunniteltu).
- **4c:** VP-oversight (mitä konsepteja työn alla, kattavuus).
- **4d:** kalenteri-kytkös (harjoite → jakson treeni, §35).
