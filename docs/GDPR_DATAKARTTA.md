# GDPR-datakartta + retention-politiikka (G0)

> Runko laadittu 2026-06-23 (arkkitehti). **Tyhjät sarakkeet (oikeusperuste, retention-aika, päätös) täyttää Tero/DPO/laki** —
> nämä ovat juridisia päätöksiä, en anna oikeudellista neuvoa. Tämä on **datakartta** (mitä henkilödataa, missä) jota RTBF (G1),
> retention-automaatio (G2) ja SAR (G4) tarvitsevat. Lähde: CLAUDE.md §11 (Firestore-rakenne) · §15 (Storage) · §13 (käsittelijät).
> **Status:** runko valmis → DPO täyttää päätössarakkeet → sitten G1 (poisto-CF) buildattavissa.

---

## 1. FIRESTORE — henkilödatapolut

> Sarakkeet täytettäväksi: **Oikeusperuste** (suostumus / sopimus / oikeutettu etu) · **Retention** (säilytysaika) · **RTBF** (poista / anonymisoi) · **Art.9** (terveysdata, erityissuoja).

| Polku | Datatyyppi (esim.) | Alaikäinen | Art.9? | Oikeusperuste *(DPO)* | Retention *(DPO)* | RTBF-toimi *(DPO)* |
|---|---|---|---|---|---|---|
| `seurat/{sid}/pelaajat/{id}` | nimi, syntymäaika, sukupuoli, huoltajaEmail, PIN, pikakentät | ✅ | osa | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/havainnot/{id}` | ADAR-pelihavainto, narratiivi, media-viite | ✅ | – | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/kirjaukset/{pvm}` | harjoituskirjaukset, fiilinki, RPE | ✅ | mahd. (hyvinvointi) | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/testitulokset/{id}` | fyysiset/tekniset testitulokset | ✅ | mahd. | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/biologinen_ika/{pvm}` | pituus, paino, istumapituus, PHV | ✅ | **✅ terveys** | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/idp/{id}` · `idp_kausi` | kehityssuunnitelma | ✅ | – | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/vp_muistiinpanot/{id}` | VP:n muistiinpanot pelaajasta | ✅ | mahd. | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/kehut/{id}` | vanhemman kehu | ✅ | – | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/palautteet/{id}` | valmentajan TKI-palaute | ✅ | – | ☐ | ☐ | ☐ poista |
| `…/pelaajat/{id}/reviewit/{id}` | MDT-review | ✅ | – | ☐ | ☐ | ☐ poista |
| `seurat/{sid}/kayttajat/{uid}` | henkilöstö: nimi, email, rooli, lisenssi, CPD, pikakentät | – (aikuinen) | – | ☐ | ☐ | ☐ poista |
| `…/kayttajat/{uid}/reflektiot/{id}` | **valmentajan reflektio + äänen viite + transkriptio** | – | – | ☐ | ☐ | ☐ poista |
| `…/kayttajat/{uid}/notifikaatiot/{id}` | ilmoitukset | – | – | ☐ | ☐ | ☐ poista |
| `seurat/{sid}/harjoitusarvioinnit/{id}` (+ palaute_jaettu/yksityinen) | harjoitusarviointi + palaute | – | – | ☐ | ☐ | ☐ poista |
| `seurat/{sid}/kutsut/{id}` | huoltajan email + kutsutila | ✅ (epäsuora) | – | ☐ | ☐ | ☐ poista |
| `suostumukset/{id}` (ylätaso) | suostumusdata, huoltajaEmail | ✅ | – | suostumus | ☐ (säilytä todisteena?) | ☐ **anonymisoi/säilytä** |
| `kayttajat/{uid}` (ylätaso) | profiili | – | – | ☐ | ☐ | ☐ poista |
| `benchmarks/{maa}/…` · `harjoitusarviointi_benchmark` | **anonyymi aggregaatti (n≥30)** | ✅ (lähde) | – | – | – | **EI henkilödataa → jää** |
| `errors/{id}` · audit-loki | virheet / audit (PII-skrubattu §33 B2) | – | – | ☐ | ☐ (audit oma retention) | ☐ |

## 2. STORAGE — henkilödatatiedostot

| Polku | Sisältö | Alaikäinen | RTBF-toimi *(DPO)* | Huom |
|---|---|---|---|---|
| `seurat/{sid}/havainnot/{hid}/media_*.jpg` | **ADAR Vision -kuvat (alaikäisen harjoitus)** | ✅ | ☐ poista | menee OpenAI Visioniin → ks. §3 |
| `seurat/{sid}/kayttajat/{uid}/reflektiot/*.webm` | **valmentajan ääni** | – | ☐ poista | menee Whisperiin → ks. §3 |

## 3. KÄSITTELIJÄT (3rd-party) — DPA + alaikäis-AI-linjaus *(DPO)*

| Käsittelijä | Mitä dataa | Alaikäisen data? | DPA-status *(DPO)* | Linjaus *(DPO)* |
|---|---|---|---|---|
| Google / Firebase (Firestore, Storage, Functions) | kaikki | ✅ | ☐ | ☐ |
| OpenAI (Whisper) | **valmentajan ääni** | – | ☐ | ☐ opt-in info riittävä? |
| OpenAI (GPT-4o Vision) | **alaikäisen ADAR-kuvat** + narratiivi | ✅ | ☐ | ☐ **KRIITTINEN: lapsen kuva AI:lle — suostumus/peruste?** |
| Anthropic (narratiivi) | tekstidata (pelaajakonteksti) | ✅ (epäsuora) | ☐ | ☐ |
| SendGrid (sähköposti) | huoltajan/henkilöstön email | ✅ (epäsuora) | ☐ | ☐ |
| Sentry (virheseuranta) | PII-skrubattu (§33 B2) | – | ☐ | ✅ skrubi tehty |

## 4. PÄÄTÖKSET — KV-BENCHMARK-SUOSITUKSILLA (DPO vahvistaa)

> Suositukset alan käytännöstä (Clifford Chance · HCR Law · Kitman Labs · ICO Children's Code · Platform Sports Management · JMIR — käyttäjän benchmark 2026-06-23; **arkkitehti ei verifioinut lähteitä itsenäisesti, DPO/laki vahvistaa**). Datakarttamme on rakenteellisesti **edellä alaa** (audit + Sentry-PII-skrubi); aukot ovat juridisissa päätöksissä.

1. **Oikeusperuste — EI suostumusta ytimeen.** Urheilussa suostumus on heikko (valmentaja–pelaaja-valtasuhde vääristää vapaaehtoisuuden). **Suositus:**
   - `pelaajat` + `kirjaukset` + `testitulokset` + `idp` → **sopimus** (seuran jäsenyys/pelaajasopimus) tai **laillinen velvollisuus** (huolenpitovelvollisuus).
   - `biologinen_ika` (Art.9) → **laillinen velvollisuus + Art.9 erityisperuste**.
   - **Suostumus vain valinnaisiin:** kuvien julkaisu, markkinointi, benchmark-osallistuminen, AI-litterointi/Vision.
2. **Retention — dokumentoitu aikataulu (storage limitation):** *(DPO vahvistaa luvut)*
   - Aktiivinen pelaajasuhde → koko profiili.
   - Pelaaja eroaa → **2–5 v** perustiedot, sitten **anonymisoi/poista**.
   - Suostumustodiste → **5–10 v** (todisteena), mutta **anonymisoi pelaajaviite**.
   - **Terveysdata (biologinen_ika)** → lyhin mahdollinen (Art.9).
   - Audit-loki → lakisääteinen aika.
3. **RTBF — NELITASOINEN matriisi** (ei pelkkä "poista"):
   - **Poista:** havainnot, kirjaukset, media/kuvat, äänireflektiot.
   - **Anonymisoi:** suostumustodiste (poista pelaajaviite, säilytä aikaleima + suostumustyyppi).
   - **Pseudonymisoi:** testitulokset jotka halutaan kehityskäyriin/tutkimukseen.
   - **Säilytä:** lakisääteiset audit-lokit.
4. **Art.9-päätös (poista epäselvyys):** jos `kirjaukset` (RPE/fiilinki/vamma) · `testitulokset` · `vp_muistiinpanot` sisältävät terveys-/vamma-/hyvinvointitietoa → merkitse **pysyvästi Art.9** + erityisperuste. ("mahdollisesti" on riski.)
5. **DPIA (Data Protection Impact Assessment) — TODENNÄKÖISESTI PAKOLLINEN:** alaikäisten data + **profilointi** (talenttiarviointi, signaalit, RAE, Hidden Gem). Tee DPIA ennen laajaa tuotantoa (Clifford Chance: lasten data + profilointi → DPIA).
6. **Alaikäis-AI (KRIITTISIN):** **ÄLÄ lähetä lapsen ADAR-kuvia OpenAI Visioniin** ennen kuin **DPA + DPIA + huoltajan erillissuostumus** kunnossa. Harkitse: OpenAI **EU data residency** -optio tai EU-pohjainen Whisper/vision-palvelu (data lähtee nyt EU:n ulkopuolelle US:ään).
7. **DPA:t:** allekirjoitetut DPA:t **OpenAI + SendGrid + Google** ennen tuotantoa.
8. **18v-siirtymä = automaatio (ei vain päätöspiste):** syntymäpäivä-trigger → (a) poista huoltajalinkitys, (b) ilmoita pelaajalle datan omistajuudesta, (c) pyydä uusi oikeusperuste. (FIFA §1 + ICO Children's Code.)
9. **ISO 27001 (pidempi tähtäin):** alan hygienia (Kitman Labs). Harkitse sertifioinnin aloitusta — rakennat kuitenkin nollasta.

## 5. RETENTION_METADATA — skeema (tekninen runko, K2.6 2.1)

Jotta G2-retention-automaatio + G1-RTBF + G4-SAR voivat toimia koneellisesti, **jokainen henkilödata-dokumentti saa `retention_metadata`-kentän** (kirjoitetaan luonnissa, ei migraatio takautuvasti pakollinen — taustabackfill erikseen):
```
retention_metadata: {
  createdAt:      timestamp,                 // milloin syntyi (retention laskee tästä TAI poistumistriggeristä)
  legalBasis:     'sopimus'|'laillinen_velvollisuus'|'oikeutettu_etu'|'suostumus',  // §4.1 (DPO)
  art9:           bool,                      // erityisluokka (terveys) — §4.4
  retentionUntil: timestamp|null,            // laskettu poistumistriggeristä + retention-aika; null = aktiivinen
  rtbfAction:     'poista'|'anonymisoi'|'pseudonymisoi'|'sailyta'  // §4.3 nelitaso
}
```
- **Poistumistrigger (milloin retention alkaa):** EI luontihetki vaan **suhteen päättyminen** — pelaaja eroaa seurasta (`aktiivinen:false`) / suostumus peruttu / 18v-siirtymä. Trigger asettaa `retentionUntil = nyt + retention-aika`.
- **Aktiivinen suhde → `retentionUntil:null`** (ei poisteta).
- G2 skannaa `retentionUntil < now` → suorittaa `rtbfAction`. Arkaluonteinen (art9) → **review-jono** (ei auto-poisto, ihminen vahvistaa).

## 6. ANONYMISOINTISÄÄNNÖT (per RTBF-action, §4.3)

- **poista:** dokumentti + Storage-tiedostot kokonaan pois (havainnot, kirjaukset, media, äänireflektiot).
- **anonymisoi:** poista suorat tunnisteet (nimi, syntymäaika, huoltajaEmail, PalloID, pelaajaviite), **säilytä** ei-tunnistava (aikaleima, suostumustyyppi, agregoituva taso). Esim. suostumustodiste → `{pvm, tyyppi, versio}` ilman henkilöviittausta.
- **pseudonymisoi:** korvaa tunniste pysyvällä satunnaistunnisteella (kehityskäyrät/tutkimus säilyvät, henkilöä ei voi suoraan tunnistaa). Avainkartta erikseen, tiukasti rajattu.
- **sailyta:** lakisääteinen (audit-loki) — ei kosketa retentionissa, oma politiikka.

## 7. STORAGE-POLKUJEN KATTAVUUS (K2.6 — varmista ettei jää aukkoja)

G1-poiston PAKKO kattaa KAIKKI Storage-polut. Tunnetut: `havainnot/.../media_*` · `kayttajat/{uid}/reflektiot/*`. **Code varmistaa greppaamalla:** onko muita upload-polkuja (profiilikuvat, liitteet, brändilogot `seurat/{sid}/brandi/`, export-arkistot, SAR-ZIPit)? Brändilogo EI ole henkilödataa (jää); export-arkistot (G4) ovat → omat retention-säännöt.

## 8. SEURAAVA

DPO vahvistaa §4 (suositukset valmiina pohjaksi) → **G1 RTBF-poisto-CF** (nelitaso §6, kaikki Storage-polut §7) rakennettavissa. **Kriittinen polku ennen laajaa tuotantoa:** DPIA (§4.5) + alaikäis-AI-linjaus (§4.6) + DPA:t (§4.7). **Tekninen runko (retention_metadata §5, anonymisointi §6) voidaan rakentaa rinnakkain DPO-päätösten kanssa** — väliaikaiset oletukset (esim. retention 2 v) kunnes DPO vahvistaa (K2.6 riskinlievennys). Tämä datakartta = G1:n + G4:n lähde.
