# Vaihe 7.2 — Ohjelmakirjasto + editori + per-ohjelma-analytiikka + AI-analyysi (rakentaja-polku)

> V7:n **rakentaja-polku** (§10.2) täytenä: fysiikkavalmentaja/fysioterapeutti rakentaa yksilölliset ohjelmat, **tallentaa kirjastoon** (`seurat/{sid}/ohjelmat/{id}`), käyttää uudelleen monelle pelaajalle, seuraa **per-ohjelma** mikä toimii kenelle, ja saa AI-arvion kasvuvaihe-sopivuudesta. EI muuta V7:n kevyttä polkua (OTO-valmentaja jatkaa templaateilla). EI moottorin uudelleenkirjoitusta — rakentuu V7:n `ohjelma`-slotin (§2c) + `jaksofokus_historia`-annos–vaste-rivien päälle. Kohde: **VP_v25 + Master_v16** (fysiikkavalmentaja Masterissa, VP oversight). §2c · §10 · §11 · §13 · §26 · §28 · V7-spec. Visuaali: `docs/mockups/vaihe7_2_ohjelmakirjasto_mockup.html`.

## 0. Periaate — ohjelma on seuran omaisuus, ei per-pelaaja-kertakäyttö
V7 tallentaa ohjelman **upotettuna** pelaajan jaksofokukseen (kertakäyttö). 7.2 nostaa ohjelman **kirjasto-objektiksi**: rakenna kerran → liitä monelle → seuraa aggregaattina. Annos–vaste-datasetti (V7) saa nyt **ryhmittelyavaimen** (`ohjelma_id`) → "tämä ohjelma tuotti keskimäärin deltan X N pelaajalla". Tämä on askel kohti näyttöpohjaista, pelaajakohtaista fysiikkavalmennusta ilman että kevyt polku monimutkaistuu.

### 0.1 Kokonaistavoite — pelaajan tarina elää
7.2:n perimmäinen tarkoitus ei ole yksittäinen ohjelmakortti vaan **pelaajan jatkuva tarina**: järjestelmä tietää *mitä* pelaaja on harjoitellut (ohjelma + vaiheet + harjoitteet), *millä tavoitteilla* (tyyppi, fokus, lähtötaso §2c) ja *millä vasteella* (annos–vaste-rivit, delta §29). `ohjelma_id`-ryhmittely + `jaksofokus_historia`-ketju tekevät tästä **historian ja trendin**: peräkkäiset jaksot muodostavat aikajanan, jonka päälle per-ohjelma-analytiikka (§4) ja pelaajan elämäkerta (4b) piirtävät kokonaiskuvan. **TalentMaster ei tee päätöstä pelaajan puolesta — se kertoo historian ja trendin näistä kokonaisuuksista, jotta asiantuntija (fysiikkavalmentaja/OTO-valmentaja/VP) tekee paremman päätöksen.** Jokainen 7.2:n rakenneosa (kirjasto → analytiikka → AI) palvelee tätä: tarina pysyy eheänä yli jaksojen, ohjelmamuutosten ja versioiden (denormalisointi §1), eikä katkea vaikka kirjasto-ohjelmaa muokataan.

## 1. Datamalli — `seurat/{seuraId}/ohjelmat/{id}` (VARATTU §11)
```
ohjelmat/{id}
  nimi, tyyppi: 'nopeus_voima'|'perusvoima'|'kuntoutus'|'nopeus'|'liikkuvuus'|'muu',
  kuvaus,                              // vapaa yhteenveto (EI terveysyksityiskohtia §2c/GDPR Art. 9)
  kesto_vk,
  vaiheet: [ { vaihe, viikot, intensiteetti, nimi, ohje, mittari, harjoitteet:[hpp_ex_id|vapaa] } ],
                                       // rakenne = Everton P_lisays (§9.2) + HPP-rehab vaiherakenne
  versio (int), edellinen_versio_id,   // versiointi (muokkaus → uusi doc, ei ylikirjoita)
  laatija_uid, laatija_rooli, luotu, paivitetty,   // fysiikkavalmentaja/fysioterapeutti
  arkistoitu: bool                     // pehmeä poisto (ei kovaa deletea — historia viittaa)
```
- **Liitos pelaajaan (additiivinen, ei migraatiota):** `jaksofokus.ohjelma.ohjelma_id` = viittaus. Koko `ohjelma`-objekti kopioidaan silti jaksofokukseen (**denormalisointi** → jakso itsenäinen vaikka kirjasto-ohjelmaa muokataan/arkistoidaan). Sulun historia-entry sisältää jo `ohjelma`-snapshotin (§2c) → ajettu versio säilyy automaattisesti.
- **Versiointi:** editointi luo **uuden doc-id:n** (`versio+1`, `edellinen_versio_id`), ei ylikirjoita. Käynnissä olevat/suljetut jaksot pitävät ajetun version (snapshot). Kirjasto näyttää oletuksena uusimman ei-arkistoidun.

## 2. Ohjelmaeditori (Master_v16 — fysiikkavalmentaja; VP_v25 — oversight)
- **Kentät:** nimi · tyyppi (custom-dropdown §37) · kuvaus · kesto_vk · **viikko-ohjelma** (lisää vaihe: nimi, viikkoväli, intensiteetti %, ohje, mittari, harjoitteet). Harjoitteet joko **HPP_EXERCISES-viittaus** (`src/lib/hpp_rehab_protokollat.js` — valikko) tai vapaateksti.
- **Aloita valmiista:** "Uusi kirjastosta" → esitäyttö V7:n kevyt-templaatista (§10.1 `TM_OHJELMA_TEMPLAATIT`) TAI Everton 6 vk plyo-progressiosta (`EVERTON_LISAYKSET.loikat.ll.P_lisays`) TAI HPP-rehab-protokollasta (kuntoutus). Fysiikkavalmentaja muokkaa → tallenna kirjastoon.
- **PURE-lib `lib/tm_ohjelma.js`** (§34, dual-export, Vitest): `tmOhjelmaValidoi(o)` (pakolliset kentät, vaiheiden intensiteetti-järkevyys) · `tmOhjelmaVersioi(vanha, muutokset)` → uusi versio-objekti · `tmOhjelmaTemplaatista(tyyppi)` (lainaa V7 `tmOhjelmaTemplaatti` + Everton/HPP-rakenteet). EI Firestore/DOM.
- **⚠ GDPR Art. 9 (kuntoutus):** `kuvaus`/`harjoitteet` = harjoitussisältöä (esim. "eksentrinen takareisi 2×/vk"), EI diagnooseja. Vamma-/terveystieto → `terveys/`-alikokoelma erikseen. Editori estää (validointi + UI-huomio): ei diagnoosi-kenttää ohjelmassa.

## 3. Ohjelman liittäminen jaksoon (rakentaja-polku, §10.2)
- Fyysisen jaksofokuksen asetuksessa (D1-siltamodaali / manuaalinen): kevyt polku näyttää templaatit; **rakentaja-polku näyttää lisäksi "Kirjastosta"** → valitse tallennettu ohjelma → `jaksofokus.ohjelma = {ohjelma_id, ...kopio}`. Sama sulku/historia kuin V7 (moottori ei muutu).
- Näkyvyys §10.3: kirjasto + editori näkyvät kun seuralla on `fysiikkavalmentaja`/`fysioterapeutti`-rooli TAI seura-konfiguraatio. Kevyt polku ennallaan.

## 4. Per-ohjelma-analytiikka (rakentaja korostaa, §10.5)
- **Näkymä:** kirjaston ohjelmakortti → "ajettu **N** pelaajalla · ka delta **X** · toteuma **Y %** · tulos-jakauma (parani/ennallaan/vaihda)". Fysiikkavalmentaja näkee **mikä ohjelma toimii kenelle** (ikä/PHV-vaihe-erittely).
- **PURE-lib `lib/tm_ohjelma_analytiikka.js`** (dual-export, Vitest): `tmOhjelmaKooste(ohjelma_id, pelaajaHistoriat[])` → `{n, ka_delta, toteuma_pct, tulosjakauma, phv_erittely}`. Lukee `jaksofokus_historia`-rivit joilla `ohjelma.ohjelma_id === id`. **§26-vahti:** aggregaatti on **on-demand** (ei render-polulla; VP/fysiikkavalmentaja avaa erikseen) — lukee seuran pelaajat kerran, ei per-kortti-kyselyä. Prosessirehellinen: delta vain riveiltä joilla `delta_mitattu != null` (§29); muut = "N/M mitattu".
- **Kuormaevidenssi (kun K5 tulee):** `kuorma_kooste` (GPS/Catapult, §7-tulevaisuus) lisättävissä koosteeseen additiivisesti — dose ≠ response (kuorma täydentää toteumaa, ei korvaa deltaa).

## 5. AI-ohjelma-analyysi (`aiProxy` CF, §13)
- **Kysymys:** "Onko tämä ohjelma oikeanlainen tälle pelaajalle tässä kasvuvaiheessa?" — fysiikkavalmentajan päätöstuki, EI automaattinen määräys.
- **Syöte aiProxylle** (palvelinpuoli, ei selaimessa avaimia §13): ohjelma (tyyppi, vaiheet, intensiteetti) + pelaajan `phv_tila`/`biologinenIka_viimeisin`/`hh_taso`/annos–vaste-historia (`jaksofokus_historia` fyysiset rivit) + **näyttöpohjainen referenssi** (YPD-emfaasi + annostelu-haarukat, tutkimusraportti / `tm_fyysteemat` oletusannos).
- **Ulostulo:** narratiivi + `ai_luottamus:'matala'` (kuten ADAR §15) + kehityskieli (§28: pre-PHV rajallinen kehitys ≠ huono ohjelma). Esim. "Ohjelma painottaa maksivoimaa (85–90 % 1RM), mutta pelaaja on pre-PHV (offset −1,2 v) → YPD suosittaa hermostollista painotusta; harkitse tehotyyppiä". Tallennus `ohjelmat/{id}/ai_arviot/{pvm}` (ei ylikirjoita ohjelmaa).
- **Rajaus:** AI EI muuta ohjelmaa automaattisesti; ehdotus, jonka fysiikkavalmentaja hyväksyy/hylkää. §7.22-henki: ei pelaajalle syyllistävää kieltä.

## 6. Roolit + Rules
- **Kirjoitus `seurat/{sid}/ohjelmat/{id}`:** `onOmanSeuranValmentaja` (sis. fysiikkavalmentaja) || `fysioterapeutti` (§V7 §5 -klausuulin laajennus) || `onJohtoRooli`. Luku: oma seura. Pehmeä poisto (`arkistoitu`), ei kovaa deletea (historia viittaa). Rules-header bump + **Console-deploy** (§12). Rules-testit **emulaattorilla** (V6/V7-opetus): fysiikkavalmentaja/fysioterapeutti kirjoittaa ✓ · toisen seuran → estetty ✓ · pelaaja/anon → estetty ✓ · kova delete → estetty ✓.
- **`jaksofokus.ohjelma.ohjelma_id`** kirjoittuu jaksofokuksen mukana (V7-klausuuli kattaa jo — `jaksofokus`-kenttä).
- VP oversight (näkee kaikki ohjelmat + analytiikan); fysiikkavalmentaja/fysioterapeutti rakentaa + liittää.

## 7. Rajaus (EI 7.2:ssa)
- **K5 kuorma/dropout** (GPS/Catapult-aggregaatti) — oma kerros; 7.2 varaa `kuorma_kooste`-slotin koosteeseen.
- **Pelaajan/perheen ohjelmanäkymä** — 4b-tyyppinen positiivinen kooste erikseen.
- **AI auto-generointi** (AI luo ohjelman tyhjästä) — EI; AI arvioi ihmisen tekemän. Auto-generointi oma vaihe jos pilotti vaatii.
- **Cross-club-benchmark** (ohjelmat eri seurojen välillä) — tenant-eristys pysyy; ei jaeta.

## 8. Tuotantovaiheistus — 7.2a → 7.2b → 7.2c (deterministinen ensin, AI viimeisenä portitettuna)
Periaate: **deterministinen arvo tuotantoon heti, koneellinen valmennusneuvo viimeisenä ja portitettuna.** AI:n hyöty on datasetin funktio — se kypsyy vasta kun annos–vaste-rivejä (2. mittaukset, PHV-kasvumittaukset §28/§29) on kertynyt. Siksi 7.2 tuotetaan kolmena erillisenä, itsenäisesti julkaistavana inkrementtinä. Jokainen vaihe rikastaa **pelaajan tarinaa** (§0.1) — kirjasto kirjaa *mitä*, analytiikka piirtää *trendin*, AI ehdottaa *tulkinnan*.

- **7.2a — Deterministinen kirjasto (tuotantokelpoinen heti, ei AI:ta).** Datamalli §1 (`ohjelmat/{id}`, versiointi, denormalisointi), editorin tallenna/uudelleenkäytä/versioi (§2), ohjelman liittäminen jaksoon (§3), rules + Console-deploy (§6). Analytiikasta vain kevyt N-laskuri ("ajettu N pelaajalla"), ei koostetta vielä. **Arvo:** fysiikkavalmentaja saa ohjelmat talteen ja uudelleenkäyttöön heti, ja `ohjelma_id`-ryhmittely alkaa kertyä historiaan → tarina alkaa elää päivästä 1. **Riski:** matala (deterministinen CRUD + tenant-eristys).
- **7.2b — Editori-täydennys + per-ohjelma-analytiikka.** `tm_ohjelma_analytiikka.js` (§4): N / ka-delta / toteuma-% / tulosjakauma / PHV-erittely, on-demand (§26), delta vain mitatuista (§29). **Arvo:** "mikä ohjelma toimii kenelle" — historia muuttuu trendiksi. **Portti:** hyödyllinen vasta kun suljettuja jaksoja/ohjelma ≥ muutama; ei sisällöllistä estettä julkaista aiemmin (näyttää "N/M mitattu" kunnes dataa on). **Riski:** matala–keski (lukupolku, §26-vahti kriittinen).
- **7.2c — AI-ohjelma-analyysi (portitettu, erillinen, human-in-the-loop).** `aiProxy`-arvio (§5): narratiivi + `ai_luottamus:'matala'`, ei auto-generointia, ei auto-muutosta. **Arvo:** päätöstuki (kasvuvaihe-sopivuus) — korkein riski (koneellinen valmennusneuvo), pienin *välitön* hyöty → viimeisenä. **Portti julkaisulle:** (a) 7.2b-datasetti + näyttöpohjainen referenssi riittää syötteeksi, ja (b) fysiikkavalmentaja-pilotti validoi narratiivin laadun. Voi jäädä pilotti-lipun taakse kunnes (a)+(b) täyttyvät. **Riski:** keski (valmennusneuvo) → pakollinen ihmisen hyväksyntä, matala luottamus, §28-kehityskieli.

**Merge-portit erikseen:** 7.2a voi mennä liveksi ennen kuin 7.2b/7.2c on edes koodattu. Jokainen inkrementti: oma branch, oma verifiointi (§9), oma Teron "live". Ei niputeta.

## 9. Verifiointi
Vitest: `tm_ohjelma.js` (validoi pakolliset + intensiteetti-järki; versioi → uusi id + edellinen_versio_id; templaatista-esitäyttö) · `tm_ohjelma_analytiikka.js` (kooste n/ka_delta/toteuma_pct oikein; delta vain mitatuista §29; 0-pelaajaa-tapaus; phv-erittely). **Rules emulaattorilla** (§6 — 4 uutta testiä, aja `firebase emulators:exec`). Live VP_v25 + Master_v16: editori → tallenna kirjastoon → liitä pelaajalle jaksossa → sulje → per-ohjelma-analytiikka päivittyy (N=1, delta jos mitattu) → versioi ohjelma → vanha jakso pitää ajetun version → AI-arvio (narratiivi + luottamus matala). GDPR: kuntoutus-ohjelma ei diagnooseja. `npm test` + lint + selain-tarkistus. Rules Console-deploy kirjattu. **Merge vasta kun Tero sanoo "live".**
