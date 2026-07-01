# GDPR-tekniikka — RTBF + datan export (spec)

> Laadittu 2026-06-30. Sprintin tavoite: rakentaa **tekninen** mekanismi (1) oikeudelle tulla unohdetuksi (RTBF,
> GDPR Art. 17) ja (2) datan siirrettävyydelle / export (Art. 20). Täydentää: `SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md`
> §33 B4, `YKSINKEHITTAJAN_TOIMINTASUUNNITELMA.md` §0.1 (viimeinen turvaverkkokohta), CLAUDE.md §11 (tietomalli) + §13 (CF).
>
> **EI juridinen neuvonta.** Tämä on tekninen toteutus. **Policy odottaa juristia/DPO:ta:** muodollinen
> retention-*politiikka*, DPIA ja tietosuojaseloste eivät kuulu tähän sprinttiin (ks. `GDPR_POLICY_PLAN.md`).
> **Rekisterinpitäjä-malli (päätös 2026-06-30, Malli A):** TalentMasterID Oy = **rekisterinpitäjä**; seura saa
> käyttöoikeuden pelaajiinsa edustusajaksi (ei käsittelijä, ei seuratason DPA). RTBF/export ovat rekisterinpitäjän
> (SA/johto) käynnistämiä toimia. Ks. `GDPR_POLICY_PLAN.md`.

---

## 0. Periaatteet
1. **Palvelinpuolella vain.** RTBF + export ovat Cloud Functioneja (europe-west1, Admin SDK). Asiakas EI saa poistaa
   pelaajadataa suoraan (Rules: delete-kielto pelaajiin + alikokoelmiin paitsi SA). Tämä CF on ainoa poistoreitti.
2. **Authz `tarkistaOikeus`.** RTBF + export: SA tai seuran **johto** (vp/seurasihteeri/UTJ) — EI valmentaja
   (poisto/luovutus on rekisterinpitäjä-tason toimi).
3. **RTBF on peruuttamaton → kaksivaiheinen.** `dryRun=true` (oletus) palauttaa **manifestin** (mitä ja kuinka paljon
   poistettaisiin) ESIKATSELUKSI. Vasta `dryRun=false` + `vahvistus:true` tekee kovan poiston.
4. **Audit aina** (mutta ilman henkilösisältöä): audit-merkintä = kuka, milloin, mihin pelaajaan, montako dokumenttia/
   tiedostoa poistettiin/vietiin. EI tallenneta poistettua henkilösisältöä auditiin.
5. **Älä jätä orpoa henkilödataa.** Pelaajan data on hajautettu (§11) — RTBF/export PAKKO käydä KAIKKI sijainnit läpi
   (alikokoelmat + ristiviitteet + Storage-media + Auth). Yksikin unohdettu sijainti = GDPR-rikkomus.

---

## 1. HENKILÖDATAN KARTTA (mistä pelaajan data löytyy — §11)

> Pelaajalla on **kaksi avainta:** `pelaajaId` = doc-ID = Firebase UID (seuran pelaaja) **JA** `palloID`/`tunniste`
> (kenttä). Ristiviitteet käyttävät vaihtelevasti kumpaakin → locatorin PAKKO tukea molempia.

**Seuran pelaaja (ensisijainen):**
| Sijainti | Avain | Huom |
|---|---|---|
| `seurat/{sid}/pelaajat/{pelaajaId}` | UID | pääkortti + pikakentät |
| `…/pelaajat/{pid}/havainnot/{id}` | alikokoelma | pelihavainnot (+ ai_narratiivi) |
| `…/pelaajat/{pid}/kirjaukset/{pvm}` | alikokoelma | päivittäiset kirjaukset |
| `…/pelaajat/{pid}/testitulokset/{id}` | alikokoelma | testidata |
| `…/pelaajat/{pid}/biologinen_ika/{pvm}` | alikokoelma | GDPR Art. 9 (terveys) |
| `…/pelaajat/{pid}/pelidata/{otteluId}` | alikokoelma | TASO-pelidata |
| `…/pelaajat/{pid}/kehut/{id}` | alikokoelma | perhekehut |
| **Ristiviitteet (eivät katoa recursiveDeletellä):** | | |
| `seurat/{sid}/kalenteri/{tid}/lasnaolijat/{pelaajaId}` | UID | läsnäolo (§35) — collectionGroup `lasnaolijat` |
| `seurat/{sid}/testitapahtumat/{tid}/tulokset/{pid}` | UID/palloID | testitapahtuma-tulokset (§22) |
| `seurat/{sid}/valmentajat/{uid}/kontribuutio/{palloID}` | palloID | jos olemassa |
| `seurat/{sid}/rekisteri/{palloID}` · `…/alumni/{palloID}` | palloID | viittaukset |
| **Solo / globaali:** | | |
| `pelaajat/{palloID}` (litteä Solo) + alikokoelmat | palloID | jos pelaaja on Solo-linkitetty (tunniste-match) |
| `marketplace/{palloID}` · `palloliitto/ohjelmat/{x}/pelaajat/{palloID}` + `palautteet/{palloID}` | palloID | jos olemassa |
| **Storage:** | | |
| `seurat/{sid}/havainnot/**` (media_*.jpg pelaajan havainnoista) | prefix | ADAR/pelihavainto-kuvat |
| **Auth:** | | |
| Firebase Auth -käyttäjä `uid == pelaajaId` (anonyymi PIN-tili) | UID | poista RTBF:ssä |

**EI poisteta / EI viedä:**
- `benchmarks/**` — **anonyymit aggregaatit (n≥30)**, ei uudelleentunnistettavissa → GDPR-soveltamisalan ulkopuolella.
- Huoltajan Firebase Auth -tili — jaettu sisarusten kesken; huoltaja voi pyytää oman datansa erikseen. RTBF:n kohde
  = alaikäinen pelaaja (rekisteröity henkilö), ei huoltaja.
- Toisten pelaajien data (viestit/kehut joiden vastapuoli on tämä pelaaja → harkinta: poista vain tämän pelaajan
  alikokoelmista; älä riko toisen pelaajan dataa).

---

## 2. JAETTU LOCATOR (yksi totuus, kaksi kuluttajaa)

`kerääPelaajanManifesti(db, seuraId, pelaajaId)` → manifesti:
- ratkaise `palloID` pelaajadokumentista (tunniste/palloID-kenttä).
- listaa: pääDoc-ref, alikokoelma-refit (havainnot/kirjaukset/testitulokset/biologinen_ika/pelidata/kehut),
  ristiviite-refit (lasnaolijat collectionGroup jossa doc-id==pelaajaId rajattuna seuraan; testitapahtumat/*/tulokset/{pid};
  palloID-pohjaiset rekisteri/alumni/kontribuutio/marketplace/palloliitto jos olemassa), Solo `pelaajat/{palloID}` jos on,
  Storage-prefiksit (havaintojen media), Auth uid.
- palauttaa myös **lukumäärät** per kategoria (dryRun-esikatselua + audittia varten).
RTBF kuluttaa = poistaa; export kuluttaa = lukee. **Älä duplikoi enumerointia kahteen funktioon.**

---

## 3. RTBF — `poistaPelaajaGDPR` (Cloud Function, europe-west1)
**Params:** `{ seuraId, pelaajaId, dryRun=true, vahvistus=false }`
**Authz:** `tarkistaOikeus` → SA tai johto. Muuten permission-denied.
**Logiikka:**
1. Varmista pelaaja on olemassa (muuten 'not-found'). Kerää manifesti.
2. **dryRun=true (oletus):** palauta `{ dryRun:true, poistettaisiin: {pelaaja:1, havainnot:N, kirjaukset:N, testitulokset:N, biologinen_ika:N, pelidata:N, kehut:N, lasnaolo:N, testitapahtuma_tulokset:N, palloID_viitteet:N, solo:0/1, media_tiedostoja:N, auth:0/1} }`. EI kirjoita.
3. **dryRun=false JA vahvistus=true:**
   - `firestore.recursiveDelete(playerRef)` (pääDoc + kaikki alikokoelmat).
   - poista ristiviite-docit batcheina (lasnaolijat, testitapahtuma-tulokset, palloID-pohjaiset, Solo-doc + sen alikokoelmat recursiveDeletellä).
   - poista Storage-media (`bucket.deleteFiles({prefix})`).
   - `admin.auth().deleteUser(pelaajaId)` (anonyymi PIN-tili; try/catch jos ei ole).
   - **Audit:** kirjoita merkintä `tyyppi:'gdpr_rtbf'`, `severity:'alert'`, seuraId, pelaajaId, requesterUid, aikaleima, **lukumäärät** (ei sisältöä).
   - palauta `{ dryRun:false, poistettu: {…lukumäärät…} }`.
4. **Turvallisuus:** vahvistus-lippu pakollinen; logita alku+loppu; idempotentti (jo poistettu → no-op + audit 'gdpr_rtbf_noop').

---

## 4. EXPORT — `viePelaajanDataGDPR` (Cloud Function, europe-west1)
**Params:** `{ seuraId, pelaajaId, muoto='json' }`
**Authz:** `tarkistaOikeus` → SA tai johto. (Huoltajan oma-export = myöhempi laajennus; kirjaa TODO.)
**Logiikka:**
1. Kerää manifesti → **lue** kaikki → rakenna strukturoitu objekti `{ pelaaja:{…}, havainnot:[…], kirjaukset:[…], testitulokset:[…], biologinen_ika:[…], pelidata:[…], kehut:[…], lasnaolo:[…], testitapahtuma_tulokset:[…], media:[storage_urls] }` (koneluettava, Art. 20).
2. **Toimitus:** kirjoita JSON Storageen `gdpr_exports/{seuraId}/{pelaajaId}_{aikaleima}.json` → palauta **signed URL (24 h vanheneminen)**. (Iso data → ei inline. Pieni → voi palauttaa myös inline.)
3. **Audit:** `tyyppi:'gdpr_export'`, `severity:'info'`, lukumäärät.
4. palauta `{ url, vanhenee, lukumäärät }`.

---

## 5. RULES + TESTIT
- **Rules-vartija:** asiakas EI saa `delete` pelaajiin eikä alikokoelmiin (paitsi SA). Varmista `tm_admin/firestore.rules`
  delete-säännöt + lisää Rules-testi (asiakas/anon/valmentaja delete → denied; CF/Admin SDK ohittaa Rules).
- **Vitest:** locator-manifestin koostamislogiikka (mockattu Firestore: oikeat refit + lukumäärät, molemmat avaimet),
  audit-payloadin muoto (ei henkilösisältöä).
- **Emulaattori (jos feasible):** RTBF dryRun palauttaa oikeat lukumäärät; false poistaa + Auth deleteUser kutsutaan.

---

## 6. INVARIANTIT + DEPLOY
- europe-west1 · Admin SDK · firebase-functions v6 (1st-gen `/v1`, kuten muut) · authz `tarkistaOikeus` · ei uusia secretejä.
- RTBF: `dryRun` OLETUS true; `vahvistus` pakollinen false-ajossa; kova poisto peruuttamaton.
- Audit ilman henkilösisältöä. §11 KAIKKI sijainnit (älä jätä orpoa). Storage + Auth mukana.
- **Vaatii deployn:** `firebase deploy --only functions`.
- **EI tähän sprinttiin (oma vaihe):** retention-ajastus (policy → DPO), field-level Rules (§33 B4), huoltajan oma-export,
  muodollinen DPIA/DPA. Tekninen RTBF + export = tämän sprintin scope.

---

## 7. Käyttöliittymä (kevyt, myöhempi)
CF:t ovat ydin. Kevyt UI (Admin tai Seura, SA/johto): "Pelaajan tietopyyntö (export)" + "Poista pelaaja (RTBF)" napit →
dryRun-esikatselu → vahvistusdialogi → kutsu CF. Voidaan tehdä erillisenä pienenä pintana CF:ien jälkeen.
