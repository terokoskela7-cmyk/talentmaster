# TalentMaster — NYT-toteutussuunnitelma + jatkoviikot

> Laadittu 2026-06-24. Lähtee `YKSINKEHITTAJAN_TOIMINTASUUNNITELMA.md`:n **NYT-osasta** ja purkaa sen
> konkreettisiksi, **pilotti-turvallisiksi** askeliksi + rolling-jatkosuunnitelmaksi (vk 1–12).
> Periaate: turvaverkko ensin, pilotti ei kärsi koskaan, ~1 pv/viikko varattuna pilottipalautteen korjauksiin.

---

## 0. Pilotti-ei-kärsi -turvaprotokolla (koskee JOKAISTA muutosta)

Lue tämä ennen mitään askelta. Nämä säännöt pitävät 4–5 seuran pilotin vakaana koko kehitystyön ajan.

1. **Infra ennen featurea.** NYT-osan työ on lähes kokonaan *infraa* (CI, backup, staging, Rules-deploy) joka
   **ei kosketa pilotin käyttöliittymää lainkaan** → riski pilotille = lähes nolla. Tästä on turvallista aloittaa.
2. **Riskialtis muutos vain stagingiin ensin.** Kun staging-tenant on pystyssä (vk 2), kaikki koodimuutokset
   jotka koskettavat dataa/UI:ta testataan stagingissa ennen tuotantoa.
3. **Additiivinen oletuksena.** Uudet kentät/CF:t/näkymät lisätään; olemassa olevia ei muuteta ilman pakottavaa
   syytä. Ei datamigraatioita ilman dry-run-first + idempotenssi (kuten A5 teki).
4. **Aina testit + version:bump.** Jokainen tuotantoon menevä muutos: `npm test` vihreä + `npm run version:bump`
   (cache-bust). Tämä on jo paikallaan — suojele sitä.
5. **Tuhoava toiminto = vartioitu.** RTBF (poisto) -CF: SA/johto-gate + dry-run-tila + audit-loki + testattu
   stagingissa ennen tuotantoa. Claude ei suorita kovia poistoja itse — rakentaa vain ominaisuuden.
6. **Rules-deploy edelleen hallittu.** Kunnes CI-deploy toimii (vk 2), Rules julkaistaan Consolesta + emulaattori­testit
   (97) ajetaan ensin.
7. **~1 pv/viikko pilottipalautteelle.** Perjantai = puhdistus + pilottiseurojen ilmoittamien ongelmien korjaus.
   Tämä on osa suunnitelmaa, ei poikkeus.

**Omistajalegenda:** 🧑 = Tero (konsoli/IAM/GitHub/billing — Claude ei voi tehdä, tarkat ohjeet annetaan) ·
🤖 = Code (kirjoittaa tuotanto-/CI-koodin Clauden speksistä) · 🟦 = Claude (speksi, mockup, verify, dokumentaatio).

---

## 1. NYT-osa purettuna — 8 kohtaa

### N1 — Off-site backup (ALOITA TÄSTÄ: nolla pilottiriskiä, välitön vakuutus)
- **Tavoite:** viikoittainen automaattinen Firestore-vienti Cloud Storageen → et menetä pilottidataa.
- **Askeleet:** 🧑 (1) Luo Cloud Storage -bucket (esim. `gs://talentmaster-backups`, europe-west1, lifecycle 90 pv).
  (2) `gcloud firestore export gs://talentmaster-backups/$(date +%F)` — testaa kerran käsin.
  (3) Ajasta: Cloud Scheduler -job (viikoittain) joka kutsuu export-operaatiota (service account jolla
  `datastore.importExportAdmin`). 🟦 antaa tarkat komennot + scheduler-määrittelyn.
- **Pilottiriski:** **ei mitään** (vienti on luku, ei muuta tuotantodataa).
- **Valmis kun:** export näkyy bucketissa + scheduler ajaa sen automaattisesti + palautus testattu kerran stagingiin.

### N2 — Kustannushälytys (nolla pilottiriskiä)
- **Tavoite:** huomaat Firestore-luku-/kustannuskarkaamisen ajoissa.
- **Askeleet:** 🧑 Cloud Billing → Budgets & alerts → budjetti (esim. 50 €/kk) + hälytys 50/90/100 %.
- **Pilottiriski:** ei mitään (pelkkä monitorointi).
- **Valmis kun:** budjettihälytys aktiivinen + sähköposti tulee testikynnyksellä.

### N3 — Branch protection + CI-portit (matala riski; suojaa kaiken tulevan)
- **Tavoite:** `main` ei voi rikkoutua huomaamatta — testit pakollisia ennen mergeä.
- **Askeleet:** 🤖/🟦 varmista että CI-workflow ajaa `npm test` (296) + Rules-testit (97) [+ lisää ESLint myöhemmin].
  🧑 GitHub → Settings → Branches → Protect `main`: vaadi status checks (unit-tests + rules-tests) läpi ennen mergeä.
- **Pilottiriski:** matala (ei kosketa tuotantoa; estää vain rikkinäiset merget). Yksin tekijälle: voit silti
  pushata omiin haaroihin vapaasti — portti on vain `main`:iin.
- **Valmis kun:** PR joka rikkoo testin estyy; vihreä PR menee läpi.

### N4 — Rules-deploy CI:hin (poistaa yksin tekijän suurimman riskin)
- **Tavoite:** Security Rules deployataan automaattisesti repo­sta, ei käsin Consolesta.
- **Askeleet:** 🧑 (1) Korjaa service accountin IAM-oikeus (`roles/firebaserules.admin` + tarvittaessa
  `roles/firebase.developAdmin`) — tämä oli aiemman 403:n syy. (2) Lisää SA-avain GitHub Secretiksi.
  🤖/🟦 (3) Workflow: emulaattori-Rules-testit (97) vihreä → `firebase deploy --only firestore:rules`.
- **Pilottiriski:** matala — **mutta** Rules-virhe voisi lukita pilotin. Mitigaatio: deploy vasta kun
  emulaattoritestit vihreät; ensimmäiset kerrat aja rinnan Console-varmistuksen kanssa.
- **Valmis kun:** Rules-muutos menee tuotantoon vihreän testin kautta ilman Console-käsityötä; verifioitu yhdellä
  triviaalilla muutoksella.
- **Riippuvuus:** IAM-korjaus (🧑) ennen workflow'ta.

### N5 — Staging-tenant (mahdollistaa kaiken turvallisen testaamisen jälkeenpäin)
- **Tavoite:** testaa uudet featuret oikealla datarakenteella ilman että pilottiseurat näkevät keskeneräistä.
- **Askeleet (kevyin → järeämpi):** 🟦 suosittelee aloittamaan **staging-`seuraId`:llä samassa projektissa**
  (`seurat/staging_demo/...`, ei oikeita lapsia, synteettistä dataa) — nolla lisäkustannus, eristetty Rules-tasolla.
  Järeämpi vaihtoehto myöhemmin: erillinen Firebase-projekti (täysi eristys, oma kustannus).
- **Pilottiriski:** ei mitään (uusi eristetty tenant; ei kosketa oikeita seuroja).
- **Valmis kun:** staging-seuraan voi kirjautua testirooleilla + ajaa uuden featuren läpi ilman tuotantovaikutusta.

### N6 — Sentry release tracking (pieni, matala riski)
- **Tavoite:** virhe linkittyy tarkkaan git-commitiin → debuggaus nopeutuu.
- **Askeleet:** 🤖/🟦 lisää Sentryyn `release`-tunniste (= `version.json`:n versio / commit-SHA) + breadcrumbs.
  Sentry on jo käytössä (EU-region, PII-skrubi §33 B2) → tämä on pieni lisäys.
- **Pilottiriski:** matala (vain virheraportoinnin metadata; PII-skrubi säilyy).
- **Valmis kun:** testivirhe näkyy Sentryssä oikealla release-tagilla.

### N7 — Pilotin palautesilmukka (tärkein oppimisen kannalta)
- **Tavoite:** näet mitä seurat *oikeasti* käyttävät + kanava palautteelle → priorisoit datasta, et tunteesta.
- **Askeleet:** 🟦 speksaa kevyt, **§7.22-turvallinen** käyttöinstrumentointi (tapahtuma-tason: "VP avasi
  kalenterin", "valmentaja merkitsi läsnäolon", "testitulos tuotu" — **ei lapsen sisältödataa, ei henkilötietoa
  eventteihin**). Vaihtoehdot: kevyt oma Firestore-`telemetria`-kokoelma (anonyymi tapahtumalaskuri per
  seura+rooli+ominaisuus) tai Sentry/analytiikka. + yksinkertainen palautenappi henkilöstöpinnoille (VP/valmentaja)
  → kirjaa palautteen `palaute`-kokoelmaan tai sähköpostiin.
- **Pilottiriski:** matala (additiivinen; ei muuta olemassa olevaa). Tietosuoja: vain aggregoidut/anonyymit
  käyttötapahtumat, ei lasten dataa.
- **Valmis kun:** näet viikkotasolla mitä ominaisuuksia käytetään + seurat voivat jättää palautteen napista.

### N8 — GDPR tekninen: RTBF + export (korkea arvo; rakennettavissa nyt)
- **Tavoite:** oikeus tulla unohdetuksi (poista pelaaja + kaikki alikokoelmat) + "vie kaikki datani".
- **Askeleet:** 🟦 speksaa, 🤖 toteuttaa: (1) **export-CF** (europe-west1, Admin SDK): kerää pelaajan kaikki
  data (testit, arvioinnit, havainnot, kirjaukset, kalenteri-läsnäolot) → ZIP (JSON+CSV) → latauslinkki/sähköposti.
  (2) **RTBF-CF:** SA/johto-gate + **dry-run-tila oletuksena** (listaa mitä poistettaisiin) + vahvistus → poistaa
  pelaajan + alikokoelmat rekursiivisesti + Auth-tilin + audit-merkintä. **Testaa stagingissa ensin.**
  Policy/DPIA/DPA odottaa DPO:ta (ei tässä).
- **Pilottiriski:** export = ei mitään. RTBF = potentiaalisesti tuhoava → siksi dry-run + gate + staging-testaus +
  audit. Claude ei aja kovaa poistoa itse.
- **Valmis kun:** export tuottaa pelaajan datapaketin; RTBF poistaa testipelaajan stagingissa täysin + audit-jälki jää.
- **Riippuvuus:** N5 (staging) ennen RTBF-tuotantoa.

---

## 2. NELJÄN VIIKON SEKVENSSI (NYT-osa) — turvallinen järjestys

> Logiikka: **vakuutus ensin** (backup/billing, nolla riskiä) → **vartijat** (CI/branch/staging) →
> **näkyvyys + tuhoava tekniikka** (Sentry/instrumentointi/GDPR) kun staging suojaa.

| Viikko | Ma (suunnittelu) | Ti–To (syvä työ) | Pe (puhdistus + pilottipalaute) |
|---|---|---|---|
| **1 — Vakuutus + vartijat** | N1+N2 suunnittelu (backup-komennot, budjetti) | 🧑 N1 backup + scheduler · 🧑 N2 billing-alert · 🧑+🤖 N3 branch protection + CI-portit | Dokumentoi backup-/palautusprosessi · pilottipalaute |
| **2 — Deploy-automaatio + staging** | N4 IAM-korjauksen suunnittelu | 🧑 N4 SA-IAM + secret → 🤖 Rules-deploy-workflow · 🟦+🤖 N5 staging-seuraId + synteettinen data | Verifioi Rules-CI triviaalimuutoksella · pilottipalaute |
| **3 — GDPR tekninen** | N8 export+RTBF spec | 🤖 N8 export-CF → RTBF-CF (dry-run) · testaa stagingissa | Testaa RTBF staging-testipelaajalla + audit · pilottipalaute |
| **4 — Näkyvyys + oppiminen** | N6+N7 suunnittelu (§7.22-turvallinen) | 🤖 N6 Sentry release tracking · 🟦+🤖 N7 käyttöinstrumentointi + palautenappi | **Katsaus: mitä pilottidata kertoo → priorisoi SEURAAVAKSI** · pilottipalaute |

**Kuukauden lopputulos:** voit nukkua yösi (backup + Rules-CI + testit + staging), näet virheet ja käytön
(Sentry + instrumentointi), GDPR-tekniikka on kunnossa, ja sinulla on dataa siitä mitä seurat oikeasti tarvitsevat.

---

## 3. JATKOVIIKOT (vk 5–12) — rolling, pilotin ehdoilla

> Rakenne joka viikko: **ma** suunnittelu (AI:n kanssa) · **ti–to** yksi increment · **pe** puhdistus +
> pilottipalautteen korjaus. **Varaa ~1 pv/viikko pilottikorjauksiin** — ne menevät featurejen edelle.
> Mikään alla ei ole kalenteriin lukittu: **pilottipalaute saa muuttaa järjestyksen.**

### Sykli 2 (vk 5–8) — halpa modularisointi + matala hedelmä
- **`lib/`-moduulien eriyttäminen jatkuu** (auth-wrapper, Firestore-wrapper, design-tokenit omiksi moduuleiksi joita
  kaikki roolit importtaavat). Riskitön, additiivinen — *tämä on sekä tulevan kehittäjän että mahdollisen
  Vite-migraation oikea pohjatyö, ilman rewriteä.* Jatka K3:n `lib/tm_kalenteri.js`-mallia.
- **AI-insight (matala hedelmä):** CF joka generoi pelaajakohtaisen kehityssuosituksen olemassa olevasta
  5D-/bio-ikä-datasta (`tm_ai.js` pohja). Pilotin erottautuja jonka seurat huomaavat — data on jo olemassa.
- **Kalenteri K4 (muistutukset)** *jos pilottipalaute osoittaa tarpeen* — muuten ohita.
- **Repo-siivous (A6):** poista vanhat versiotiedostot, yhdistä `tm_auth.js`/`tm-auth.js`.

### Sykli 3 (vk 9–12) — tarveohjattu syvennys
- **CF 1st-gen → v2 -migraatio** kun muutenkin kosket funktioihin (jo §33-listalla).
- **Kalenteri K5 (kuorma/dropout-erottautuja)** kun K2-läsnäolo + K3-toistuvuusdataa on kertynyt tarpeeksi —
  uniikki arvo, käyttää nyt kerättävää dataa.
- **Vite-strangler-KOE vain jos jokin rooli vaatii ison muutoksen muutenkin:** kokeile pienimmällä roolilla
  (pelaaja-app) Vite+Alpine+Tailwind palautuvana kokeena. **Älä laajenna** ennen kuin tämä yksi on todistetusti
  parempi. Jos mikään rooli ei vaadi isoa muutosta → älä tee tätä vielä.

### Mikä EI kuulu näille viikoille (tarveohjattu, ei kalenteri)
Julkinen API-ekosysteemi, webhookit, partner-API, event-driven Pub/Sub, tenant self-service + Stripe → vasta kun
on konkreettinen tilaaja (oma uusi frontend, allekirjoitettu integraatio, tai maksava myyntiputki). Ks.
`YKSINKEHITTAJAN_TOIMINTASUUNNITELMA.md` §3 MYÖHEMMIN.

---

## 4. Aloitus — ensimmäinen askel tänään/tällä viikolla

**Aloita N1 (backup) + N2 (billing-alert)** — nolla pilottiriskiä, välitön vakuutus, ei koske koodia eikä pilottia.
Sen jälkeen N3 (branch protection + CI-portit). Nämä kolme ovat viikon 1 sisältö ja täysin turvallisia.

Claude voi tuottaa heti:
- **N1:** tarkat `gcloud`-komennot (bucket + export + Cloud Scheduler) copy-paste-valmiina.
- **N3:** GitHub Actions -workflow'n sisällön + branch protection -asetusten klikkausohjeet.
- **N4:** IAM-korjauksen tarkat roolit + Rules-deploy-workflow (kun haluat viikolla 2).

Pilottipalautteen korjaukset hoidetaan rinnalla joka perjantai — ne menevät aina tämän infrasuunnitelman edelle
jos jokin pilotissa rikkoutuu.
