# Node 22 -runtime-nosto + GDPR (retention / RTBF / audit) — vaiheistettu suunnitelma

> Scoping 2026-06-23 (Tero). Kaksi työvirtaa: **A** tekninen runtime-nosto (kova takaraja) · **B** GDPR-compliance alaikäis- + äänidatalle (nouseva riski).
> Liittyy: CLAUDE.md §33 (CF-runtime TODO + B4 GDPR) · §11 (datamalli, GDPR Art. 9 terveys) · §2 (stack) · §13 (CF, aiProxy/Whisper, SendGrid).
> **Juridinen varaus:** tämä on teknisen + prosessipuolen suunnitelma. Retention-ajat, käsittelyn oikeusperuste, DPA:t ja alaikäis-AI-linjaukset
> vaativat **DPO/lakiarvion** — en anna oikeudellista neuvoa, vaan rakennan koneiston jolla päätökset toteutetaan.

> ## TILA (2026-06-23)
> - **A — Node 22 -nosto:** ✅ komento annettu Codelle (revisoitu: breaking-inventaario + firebase-functions-test E2E + canary + rollback). **Kesken** → verify kun Code raportoi.
> - **AI-gate (ADAR Vision/Whisper alaikäisellä):** ⏸ **ODOTTAA DPO-linjausta** (Tero 2026-06-23: ei rakenneta gateä nyt, DPO päättää alaikäis-AI-linjauksen ensin).
> - **GDPR G0 datakartta:** ✅ runko + kv-benchmark-suositukset + retention_metadata-skeema valmiit (`GDPR_DATAKARTTA.md`). ⏸ **ODOTTAA DPO:n §4-päätöksiä** (oikeusperuste · retention-ajat · DPIA · alaikäis-AI · DPA:t).
> - **GDPR G1–G8:** ⏸ blokattu G0/DPO:lla (tekninen runko rakennettavissa väliaikaisilla oletuksilla kun DPO käynnistyy).
> - Kehitystyö jatkuu muualla odotellessa (RAE V2 Vanhempi-kehys · 3A white-label · FLEI→"Kehon valmius" · i18n Vaihe 0 ym.).

---

# A. NODE 22 -RUNTIME-NOSTO (kova takaraja)

**Nykytila (§33):** CF deployattu **Node 20 (1st Gen)** + firebase-functions **4.9.0**. `functions/package.json` engines on jo `22`, mutta `firebase.json` runtime = `nodejs20` ja SDK vanha → deploy ajaa 20:n. **Node 20 decommission 2026-10-31** (deploy-varoitukset toistuvia). firebase-functions ≥5.1 tarvitaan + **breaking changes** noston yhteydessä.

**Työ:**
1. `firebase.json` functions runtime → **`nodejs22`**.
2. **firebase-functions 4.9.0 → uusin (v6.x)** + firebase-admin tarkistus. **Breaking changes läpikäynti:** 1st-gen API (`functions.https.onCall`, `functions.pubsub.schedule`, `functions.firestore.document`) toimii yhä mutta on deprekoitu; harkitse v2-migraatiota (`onCall`/`onSchedule`/`onDocumentCreated` `firebase-functions/v2`:sta) — TAI pidä 1st-gen ja korjaa vain rikkovat kohdat (pienempi muutos). **Päätös:** minimaalinen — pidä 1st-gen, nosta runtime + SDK, korjaa breaking-kohdat (matalin riski; v2-migraatio = oma vaihe).
3. **runWith({secrets})** (Secret Manager -migraatio) säilytettävä noston yli.
4. **Redeploy KAIKKI funktiot** (CI-workflow, sama .env/secret-polku).
5. **Savutesti per funktio** (vitest EI kata CF-runtimea): aiProxy (litterointi/narratiivi) · sähköpostifunktiot (kutsu) · notif-triggerit (T1/T3) · ajastetut (T2/N2) · callablet (luoKayttaja/vaihdaKayttajanRooli/vahvistaSuostumus/haeAuditLoki). Lokit + Console.

**Riski:** SDK-major-bump voi rikkoa hiljaa (CF ei kaadu buildissa mutta heittää ajossa). → **deploy ensin yhdelle ei-kriittiselle funktiolle, savutesta, sitten loput.** Cloud Scheduler -IAM (§ aiempi) + region-huomiot säilyvät.

**Sekvenssi:** (1) Code: package.json+firebase.json+SDK-bump + breaking-fix, push. (2) Deploy CI:llä. (3) Savutesti per funktio (minä + Tero lokeista). (4) Rollback-suunnitelma: edellinen revisio redeployattavissa jos savutesti punainen.

---

# B. GDPR — alaikäis- + äänidata (retention / RTBF / audit)

**Konteksti:** nuorten jalkapallo = **alaikäisten henkilödata** (GDPR Art. 8 lapset, Art. 9 terveys §11) + nyt **äänireflektiot** (valmentajan audio Storagessa) + AI-käsittely (Whisper→OpenAI, ADAR Vision→OpenAI). Riski nousee datan + monimuotoisuuden kasvaessa.

## G0 — Datakartta + retention-politiikka + DPA-inventaario (PERUSTA — pääosin päätöksiä/dokumentaatiota)
**Ilman tätä RTBF/retention ei ole rakennettavissa.** Inventoi **jokainen paikka jossa henkilödata on:**
- **Firestore:** `seurat/{sid}/pelaajat/{id}` + alikokoelmat (havainnot, kirjaukset, testitulokset, biologinen_ika, idp, vp_muistiinpanot, kehut, palautteet, reviewit, harjoitusarvioinnit) · `kayttajat/{uid}` (+ reflektiot, notifikaatiot) · `suostumukset` · `kutsut` · pikakentät · `benchmarks` (anonyymi/aggregaatti → ei henkilödataa).
- **Storage:** `seurat/{sid}/havainnot/.../media_*.jpg` (ADAR Vision) · `seurat/{sid}/kayttajat/{uid}/reflektiot/*.webm` (ääni).
- **3rd-party (käsittelijät):** Google/Firebase · OpenAI (Whisper-ääni + Vision-kuvat) · SendGrid (sähköposti) · Sentry (PII-skrubattu §33 B2).
- **Per datatyyppi päätä (DPO/laki):** oikeusperuste · retention-aika · onko Art. 9 (terveys) · alaikäis-suostumus (huoltaja).
- **DPA-inventaario:** varmista DPA OpenAI/SendGrid/Google. **Alaikäis-AI-linjaus:** menevätkö alaikäisen kuvat (ADAR Vision) + valmentajan ääni OpenAI:lle — onko suostumus/peruste kunnossa? (Tämä on iso kysymys — kirjaa, ratkaise lakiarviolla.)
- **Tuotos:** `docs/GDPR_DATAKARTTA.md` (datakartta + retention-taulukko + DPA-status).

## G1 — Oikeus tulla unohdetuksi (RTBF, Art. 17) — KORKEIN KONKREETTINEN BUILD
**Mekanismi joka poistaa henkilön KAIKEN datan pyynnöstä** (alaikäisellä huoltaja käyttää oikeutta):
- **CF `poistaHenkiloData(palloID|uid, tyyppi)`** (admin SDK, SA/johto-gate): iteroi pelaajan kaikki alikokoelmat + Storage-tiedostot (havainnot-kuvat) + derivoidut pikakentät → poista/anonymisoi. Idempotentti. **Audit-merkintä** (kuka, milloin, mitä). Benchmark-aggregaatit (anonyymi) jäävät.
- **Valmentajan reflektiot** (oma data): poista `kayttajat/{uid}/reflektiot` + Storage-äänet.
- **UI:** Admin/Seura "Poista henkilön data (GDPR)" -toiminto (vahvistus, peruuttamaton → kuuluu kiellettyihin client-toimiin; **CF tekee palvelinpuolella**). Suostumuksen peruutus → liipaisin tähän.
- **Verify:** poisto kattaa kaikki §G0-kartan polut (testaa demo-pelaajalla: ei jäänteitä Firestoreen eikä Storageen).

## G2 — Retention-automaatio
- Ajastettu CF: sovella retention-politiikkaa (§G0) — esim. pelaaja poistunut seurasta / täyttää 18 / suostumus peruttu → datan elinkaari (poisto tai anonymisointi review-jonoon). **Älä auto-poista ilman politiikkaa + ihmisen vahvistusta arkaluonteiselle.**
- Suostumuksen peruutus (`suostumukset`) → kytkeytyy G1:een.

## G3 — Audit-laajennus
- §33: `haeAuditLoki` + osa eventeistä (huoltajakutsu/suostumus/muistutus). **Laajenna:** arkaluonteisen datan PÄÄSY + poistot + RTBF-pyynnöt + retention-ajot → audit. Auditin oma retention. Admin-näkymä (read-only, §33 "Audit-loki/Hälytykset" laajennus).

## G4 — Subject Access Request (SAR, Art. 15) — datan vienti
- Vie henkilön KAIKKI data koneluettavasti (Art. 15/20). Rakentuu pelaajaportti-pohjalle (STRATEGIA Sprint 4) + kattaa alikokoelmat + Storage-viitteet. Alaikäisellä huoltaja.

## G5 — Suostumus + käsittelijägovernance
- **Oikeusperuste ytimeen = sopimus/laillinen velvollisuus, EI suostumus** (urheilun valtasuhde heikentää suostumusta — kv-benchmark). Suostumus vain valinnaisiin (kuvajulkaisu, markkinointi, AI-litterointi/Vision).
- Suostumus granulaarinen (§11) + **AI-käsittely eksplisiittisesti** (Whisper/Vision OpenAI:lle) + peruutettava. DPA:t allekirjoitettu **OpenAI + SendGrid + Google** ennen tuotantoa. Harkitse OpenAI **EU data residency** / EU-pohjainen AI (data lähtee nyt US:ään).

## G6 — DPIA (Data Protection Impact Assessment) — TODENNÄKÖISESTI PAKOLLINEN, AIKAINEN
Alaikäisten data + **profilointi** (talenttiarviointi, signaalit, RAE, Hidden Gem) → DPIA tarvitaan (kv-benchmark: Clifford Chance). **Tee ennen laajaa tuotantoa** — riskinarvio + lieventävät toimet dokumentoituna. DPO/laki vetää; minä/tekninen tuotamme datakartan + käsittelykuvauksen syötteeksi.

## G7 — 18v-siirtymä automaationa (FIFA §1 + ICO Children's Code)
Syntymäpäivä-trigger (ajastettu CF): pelaaja täyttää 18 → (a) poista huoltajalinkitys, (b) ilmoita pelaajalle datan omistajuudesta, (c) pyydä uusi oikeusperuste. Ei vain päätöspiste — koneellistettu dataelinkaareen.

## G8 — ISO 27001 (pidempi tähtäin)
Alan hygienia (Kitman Labs). Harkitse sertifioinnin aloitusta — rakennetaan nollasta, joten privacy/security-by-design heti on halvempaa kuin jälkikäteen.

---

## DIVISION OF LABOR

- **Tero / DPO / laki:** G0 retention-ajat + oikeusperuste + DPA-review + alaikäis-AI-linjaus + suostumustekstit (G5). **(Juridiset päätökset.)**
- **Code:** A (runtime+SDK), G1 (poisto-CF + UI), G2 (retention-CF), G3 (audit-laajennus), G4 (SAR-vienti). **(Tekninen toteutus.)**
- **Minä:** suunnittelu + datakartan rungon laatiminen (G0) + live-verify (poisto kattaa kaikki polut; runtime-savutesti).

## SUOSITELTU SEKVENSSI (päivitetty kv-benchmarkilla)

1. **A. Node 22 -nosto ENSIN** — kova takaraja (10/2026), rajattu, ei riipu GDPR:stä. De-risk heti.
2. **G0 datakartta** ✅ runko valmis (kv-benchmark-suositukset täytetty pohjaksi) → **DPO vahvistaa §4-päätökset.**
3. **KRIITTINEN POLKU ENNEN LAAJAA TUOTANTOA (juridinen, DPO/laki):** oikeusperuste = sopimus/laillinen velvollisuus (ei suostumus) · **DPIA (G6)** · **alaikäis-AI-linjaus + DPA:t (G5)** · retention-aikataulu. **Nämä erottavat GDPR-compliant-alustan point-solution-riskistä** (kv-benchmark) — eivät vaadi koodia ensin, vaan päätökset.
4. **G1 RTBF-poisto-CF** (nelitasoinen poista/anonymisoi/pseudonymisoi/säilytä) — korkein konkreettinen build kun §4 vahvistettu.
5. G3 audit-laajennus · G2 retention-automaatio · G7 18v-automaatio · G4 SAR · G8 ISO 27001 (pidempi tähtäin).

> **Aloitus:** A (Node 22) heti. **Rinnalla juridinen polku (kohta 3) DPO:n kanssa — se on pullonkaula, ei koodi.** Kun DPO vahvistaa oikeusperusteen + retention + DPIA + alaikäis-AI, G1 (RTBF) on nopeasti rakennettavissa. Tekninen koneisto on helpompi kuin oikeat juridiset päätökset — kv-benchmark vahvistaa: olemme rakenteellisesti edellä, juridiset päätökset ovat aukko.
