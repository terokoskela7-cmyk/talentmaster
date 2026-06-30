# TalentMaster — Yksinkehittäjän toimintasuunnitelma

> Laadittu 2026-06-24. **Päivitetty 2026-06-30 (tilannekatsaus §0.1).** Tausta: ellei toista kehittäjää saada heti,
> Tero jatkaa kehitystä yksin (+ AI-avustaja) samalla kun ajaa 4–5 seuran kesäpilotteja ja kerää kokemuksia.
> Tämä dokumentti = **kriittinen analyysi KIMIn suunnitelmasta + tarkennettu, pilotti-ehtoinen toimintasuunnitelma.**
> Täydentää: `SKAALAUTUVUUS_JA_TEKNINEN_VELKA.md` (§33-velka), `PILOTTI_KAYTTOONOTTO_2026.md` (seurakohtainen
> aikataulu), CLAUDE.md (invariantit + tehty työ).

---

## 0. Verdict — lyhyesti

KIMIn suunnitelma on **vahva, hyvin tutkittu ja suunta on oikea**: API-first, headless, modulaarinen domain-logiikka,
"avoin runko", turvaverkko ensin, AI-avustaja tiimikaverina, 90 päivän syklit. Benchmarkit (Hudl, Catapult/Kitman,
Playermaker, MACH Alliance) ovat relevantteja ja osoittavat oikeaan suuntaan.

**Mutta:** se on kirjoitettu kunnianhimoisena 12 kuukauden uudelleenrakennusohjelmana. Sinun todellisuutesi on
**yksin tekijä + 4–5 seuran kesäpilotti + kokemusten keruu.** Kaksi kalibrointia tarvitaan:

1. **Pilotti on nyt itse tuote, ei häiriö kehitykselle.** Prioriteetti #1 seuraavat ~3 kk = pilotin vakaus +
   sen oppiminen (mitä seurat oikeasti käyttävät, mihin kompastuvat). Arkkitehtuuri-investointi on tämän
   *palvelija*, ei kilpailija.
2. **Älä rakenna ekosysteemiä spekulatiivisesti.** Julkista API-ekosysteemiä, webhookkeja, partner-API:a tai
   frontendin täysuudelleenkirjoitusta **ei pidä rakentaa ennen kuin niille on konkreettinen tilaaja** (oma
   refaktorointi, allekirjoitettu integraatio, tai toinen kehittäjä). "API-first tapana" kyllä; "täysi
   julkinen API KK 3–5" ei.

Tiivis ero: **KIMI antaa oikean pohjantähden; tämä plan korjaa sekvenssin niin ettet yli-rakenna** etkä
horjuta tuotannossa olevaa pilottia jonka takia koko oppiminen tapahtuu.

---

## 0.1 TILANNEKATSAUS 2026-06-30 — turvaverkko on jo rakennettu

> Lyhyt totuus: **yksinkehittämisen perusta on turvattu.** Suunnitelman tärkein investointi (turvaverkko ennen
> featureita) on suurelta osin tehty kesän aikana. Voit jatkaa yksin vakaalta pohjalta.

**✅ Tehty (NYT-listan turvaverkko):**
- **Rules-deploy CI** (#47/N4) · **Off-site backup** viikoittain (#44/N1) · **Kustannushälytys** (#45/N2) ·
  **Branch protection + CI-portit** (#46/N3) · **Sentry errors-only EU + PII-skrubi** (§33 B2) ·
  **Vitest 348 + Rules-testit** (CI:ssä) · **version:bump-automaatio mainissa** (#53, lopetti stamp-konfliktit) ·
  **CF Node 22 + firebase-functions 6** (§33) · **sähköpostin toimitettavuus** SPF/DKIM/DMARC korjattu (#54).
- **`lib/`-modularisointi etenee** (eerikkila/kalenteri/indeksit/harjoitelogiikka kanonisina) — §2.3:n "halpa 80 %" jo käynnissä.
- **In-app-aloituskerros** rakennettu (VP/valmentaja "Aloita tästä" datavetoinen checklist + pelaaja/vanhempi tervetulo) — QA tehty 06-30.

**⏳ Jäljellä NYT-listalta (= solo-tien viimeiset turvaverkkokohdat):**
1. **GDPR-tekniikka: RTBF (oikeus tulla unohdetuksi) + datan export.** Ainoa iso avoin turvaverkkokohta.
   Yhtyy strategian Horisontti 2:een (myyntiportti ennen alaikäisdatan laskutusta) → **yksi rakennus, kaksi tarkoitusta.**
2. **Kevyt staging-tenant** (testaa oikealla datalla ilman että pilottiseurat näkevät keskeneräistä).
3. **Pilotin palautesilmukka** (kevyt käyttöinstrumentointi + palautekanava, §7.22-turvallinen) → priorisoi kaiken muun.

**Suositeltu seuraava sprint:** GDPR-tekniikka (RTBF-CF + export-CF). Sulkee turvaverkon JA avaa syksyn maksavat sopimukset
(SJK go-live syyskuu). Tämän jälkeen tarveohjattu kehitys pilotin oppimisen mukaan.

---

## 1. Mitä KIMI saa oikein — omaksu sellaisenaan

- **Turvaverkko ensin (Vaihe 1).** Rules-deploy CI:hin, staging, branch protection, backupit, GDPR-tekniikka.
  Tämä on yksin tekijän tärkein investointi ja täsmää olemassa olevaan §33-suunnitelmaan (A4 Rules-CI, B4 GDPR).
  **Täysi yhteisymmärrys — tämä on oikea ensimmäinen siirto.**
- **"Avoin runko" -filosofia / MACH-henki.** Omaksu *tapana*, ei big-bangina: uusi feature suunnitellaan niin
  että sen takana on selkeä JSON-rajapinta vaikka vain oma UI sitä kutsuu.
- **Solo-stack-valinta (jos/kun frontend modularisoidaan): Vite + Alpine.js + Tailwind.** Oikea valinta —
  React/Vue toisi 500 uutta konseptia jotka hidastavat yksin tekijää. Tämä on oikea *valinta*; ajoituksesta olen
  eri mieltä (ks. §2).
- **AI-avustaja tiimikaverina** (suunnittelu → luonnos → sinä päätät). Kultainen sääntö: älä mergeä lukematta.
- **90 päivän syklit + viikkorytmi + perjantain "puhdistuspäivä".** Hyvä kuri yksin tekijälle.
- **Riskienhallinta:** off-site-backup (`gcloud firestore export`), kustannushälytykset, Firebase-lukitusriskin
  pienennys pitämällä domain-logiikka puhtaissa moduuleissa. Kaikki oikein.
- **Data portability (vie kaikki datani).** GDPR-vaatimus + luottamusetu. Omaksu.

---

## 2. Mitä kalibroin — kriittinen analyysi

### 2.1 Pilotti on prioriteetti, arkkitehtuuri sen palvelija
KIMI alistaa pilotin 12 kk:n rakennusohjelmalle. Käännä se: **seuraavat ~3 kk arkkitehtuurityö rajataan siihen
mikä (a) pitää pilotin vakaana ja (b) tekee pilotin oppimisen näkyväksi.** Kaikki muu odottaa kunnes tiedät
datasta mitä seurat oikeasti tarvitsevat. Pilotti tuottaa juuri sen tiedon jolla priorisoit — älä ohita sitä
kalenteripohjaisella roadmapilla.

### 2.2 Älä rakenna julkista API-ekosysteemiä spekulatiivisesti (KIMI KK 3–5)
Täysi julkinen REST-API + webhookit + partner-API + rate-limiting + OpenAPI-autogen on iso urakka **ilman
yhtäkään integraatioasiakasta tai toista kehittäjää.** Tämä on klassinen ennenaikainen abstraktio. Suunta on
oikea, mutta **rakenna API-endpointit vasta kun niille on konkreettinen kuluttaja:**
- oma uusi frontend joka kuluttaa niitä (eli vasta jos/kun frontend-refaktorointi alkaa), TAI
- allekirjoitettu/konkreettinen integraatio (Palloliitto, wearable).

Siihen asti: **pidä domain-logiikka puhtaina, kutsuttavina moduuleina + Cloud Functioneina selkeällä
JSON-sopimuksella.** Se on 80 % API-valmiudesta ilman ekosysteemin ylläpitokuormaa.

### 2.3 Älä kirjoita toimivia tuotantosovelluksia uusiksi kesken pilotin (KIMI KK 6–8)
Tämä on suurin riski koko KIMIn suunnitelmassa yksin tekijälle. Nykyiset vanilla-monoliitit **toimivat ja ovat
tuotannossa oikealla pilottidatalla.** Viiden roolisovelluksen uudelleenkirjoitus (Vite + Alpine + Tailwind)
kolmessa kuukaudessa samalla kun pilotti pyörii:
- tuo **3 uutta työkalua + build-vaiheen** = uusi virhepinta yksin tekijälle,
- riskeeraa horjuttaa juuri sitä tuotetta joka tuottaa oppimisen,
- ei tuota pilottiseuroille mitään uutta arvoa (sama UI, eri tekniikka).

**Strangler-malli on oikea kuvio, ajoitus on riski.** Tee se *vähitellen ja syyn ajamana*: kuori rooli uusiksi
vain kun se vaatii ison muutoksen muutenkin — ei kalenterin mukaan. **Halpa 80 %** on jo aloitettu ja sitä
kannattaa jatkaa: eriytä jaettu logiikka `lib/`-moduuleiksi (jo tehty: `tm_eerikkila_normit.js`,
`tm_kalenteri.js`, `testit_indeksit.js`, `harjoitelogiikka_v4.js`). Tämä on *sekä* tulevan kehittäjän *että*
mahdollisen Vite-migraation oikea esivalmistelu — ilman riskialtista rewriteä.

### 2.4 Siirrä myöhemmäksi: event-driven Pub/Sub, partner-API, white-label-tuotteistus (KIMI KK 9–12)
Ennenaikaista pilottimittakaavassa. Huom: **white-label-brändäys on jo osin rakennettu** (Vaihe 3A: seuran
logo + aksenttiväri + WCAG-kontrastifallback) — KIMI ei tiennyt tätä. Event-driven arkkitehtuuri on oikea
*tulevaisuuskuva* mutta ei ratkaise mitään nykyistä ongelmaa.

### 2.5 GDPR: erota tekninen ja policy (KIMI niputtaa KK 1:een)
KIMI nostaa GDPR:n oikein etualalle (alaikäisdata EU:ssa = suurin riski + kilpailuetu). Mutta erota:
- **Rakennettavissa nyt yksin (korkea arvo):** oikeus tulla unohdetuksi (RTBF) -CF (poistaa pelaajan +
  alikokoelmat), datan vienti (export), tekninen retention-ajastus.
- **Vaatii DPO:n / juridiikan (portti säilyy):** muodollinen DPIA, retention-*politiikka*, DPA:t seurojen kanssa.
  CLAUDE.md §33 merkitsee tämän "WAITING DPO" — pidä se portti, mutta rakenna tekninen puoli sen rinnalla.

### 2.6 Keskeneräiset pilottiominaisuudet ennen arkkitehtuurikiertoteitä
Kalenteri (K1–K3 valmis, K4–K6 kesken) ja korttijärjestelmä (Vaihe 0–1.5 valmis) ovat **pilottipinnan**
ominaisuuksia. Vie loppuun ne jotka palvelevat pilotin oppimista *ennen* arkkitehtuurin sivupolkuja — mutta vain
jos seurat niitä haluavat (pilotti kertoo).

---

## 3. Tarkennettu toimintasuunnitelma — NYT / SEURAAVAKSI / MYÖHEMMIN

> Periaate: **NYT = kalenteripohjainen** (turvaverkko, kiinteä). **SEURAAVAKSI & MYÖHEMMIN = tarve­ohjattu**
> (pilotin oppiminen ja konkreettiset tilaajat määräävät, ei kalenteri).

### NYT (seuraavat ~4 viikkoa) — turvaverkko + pilottivakaus
Tämä on KIMIn Vaihe 1, karsittuna ja pilotti-tietoisena. **Älä rakenna uutta featurea ennen tätä.**

| # | Toimenpide | Tekninen tarkennus | Miksi |
|---|---|---|---|
| 1 | **Rules-deploy CI:hin** | Korjaa service accountin oikeus (`firebaserules.admin`/Firebase Admin) → GitHub Actions ajaa `firebase deploy --only firestore:rules` | Manuaalinen Console-deploy on yksin tekijän suurin riski (väsymys+kiire → rikkinäiset Rulesit tuotantoon) |
| 2 | **Off-site backup** | Ajastettu `gcloud firestore export` → Cloud Storage, viikoittain | Et menetä pilottidataa; nukkumarauha |
| 3 | **Kustannushälytys** | Cloud Billing budget alert (esim. 50 €/kk) | Firestore maksaa per-luku; huomaat karkaamisen ajoissa |
| 4 | **Branch protection + CI-portit** | `main` vaatii: Vitest (296) + Rules-testit (97) [+ ESLint] | "Toimii minun koneella" -virheet kiinni ennen tuotantoa |
| 5 | **Sentry release tracking** | Liitä virheet git-commitiin | Virheen sattuessa tiedät tarkan commitin |
| 6 | **Staging-tenant** | Kevyin: erillinen `seuraId` stagingille (tai oma Firebase-projekti jos budjetti sallii) | Testaa uudet featuret oikealla datalla ilman että pilottiseurat näkevät keskeneräistä |
| 7 | **Pilotin palautesilmukka** | Kevyt käyttöinstrumentointi (mitä ominaisuuksia seurat oikeasti käyttävät) + yksinkertainen tapa kerätä seurojen palaute | Tämä data priorisoi kaiken muun — älä kehitä sokkona |
| 8 | **GDPR tekninen** | RTBF-CF (poista pelaaja + alikokoelmat) + datan export. Policy/DPIA odottaa DPO:ta | Alaikäisdata = pakko; tekninen puoli buildattavissa nyt |

### SEURAAVAKSI (kesä–alkusyksy) — pilotin ehdoilla, tarve­ohjattu
- **Vie loppuun pilottipinnan kalenteri** *jos seurat haluavat*: K4 muistutukset → **K5 kuorma/dropout-erottautuja**
  (käyttää K2-läsnäolo + K3-toistuvuusdataa — uniikki arvo) → K6 iCal (kun pyydetään).
- **Jatka jaetun logiikan eriyttämistä `lib/`-moduuleiksi** (auth, Firestore-wrapperit, design-tokenit). Halpa,
  riskitön modularisointi — sekä tulevan kehittäjän että mahdollisen Vite-migraation oikea pohjatyö. **Ei rewriteä.**
- **1st-gen → Cloud Functions v2 -migraatio** (jo §33-listalla) kun muutenkin kosket funktioihin.
- **Repo-siivous (A6):** poista vanhat versiotiedostot, yhdistä `tm_auth.js`/`tm-auth.js`.
- **AI-insightit (matala hedelmä):** CF joka generoi pelaajakohtaisen kehityssuosituksen olemassa olevasta
  5D-/bio-ikä-datasta (`tm_ai.js`/`tm_why_lauseet.js` ovat pohja). Tämä voi tulla aikaisemmin kuin KIMI ehdottaa
  — data on jo olemassa, ja se on **pilotin erottautuja** jonka seurat huomaavat heti.
- **Vasta tämän jälkeen, jos jokin rooli vaatii ison muutoksen muutenkin:** kokeile Vite+Alpine+Tailwind-stackia
  **pienimmällä roolilla (pelaaja-app)** strangler-kokeena — palautuva, matala riski. Älä laajenna ennen kuin
  tämä yksi on todistetusti parempi.

### MYÖHEMMIN (tarve­ohjattu, ei kalenteri) — avoin runko kun on syy
- **Julkinen REST-API-kerros:** rakenna kun (a) oma uusi frontend kuluttaa sitä, TAI (b) konkreettinen
  integraatiokumppani (Palloliitto / wearable) on sovittu. Yhtenäinen vastausmuoto + API-avainhallinta silloin.
- **Tenant self-service + Stripe:** kun myyntiputki perustelee sen (olet vielä ilmaispilotissa).
- **Event-driven (Pub/Sub), partner-API, white-labelin tuotteistus:** opportunistisesti, kun maksava kysyntä on.

---

## 4. "Avoin ja skaalautuva" — mitä se konkreettisesti tarkoittaa SINULLE nyt

Ei täyttä mikropalvelu-/API-alustaa tänään. Käytännössä neljä asiaa, jotka pitävät oven auki sekä tulevalle
kehittäjälle että integraatioille **ilman spekulatiivista rakentamista:**

1. **Domain-logiikka puhtaissa, testatuissa JS-moduuleissa** (Firebase-riippumattomia) — *jo totta*, pidä se.
   Tämä on myös Firebase-lukitusriskin vakuutus: jos pitää joskus vaihtaa alustaa, logiikka siirtyy sellaisenaan.
2. **API-valmius tapana:** uusi feature = kutsuttava funktio / HTTP-endpoint selkeällä JSON-sopimuksella, vaikka
   vain oma UI kutsuu sitä. Ei julkista ekosysteemiä — vain siisti rajapinta.
3. **Data portability** (export) — luottamusetu + GDPR.
4. **Dokumentoidut invariantit** (CLAUDE.md) — tulevan kehittäjän onboarding-ankkuri.

Nämä neljä = "avoin runko" käytännössä, ilman ettei mitään yli-rakenneta ennen tarvetta.

---

## 5. Yksinkehittäjän käytäntö (KIMIltä, tarkennettuna)

- **AI tiimikaverina:** anna AI:lle aina CLAUDE.md kontekstiksi; **testit ovat vartija.** AI luonnostelee → sinä
  päätät → et mergeä lukematta. Pyydä AI:ta kirjoittamaan testit uudelle koodille, tarkista kattavuus itse.
- **90 päivän syklit:** 1–60 rakennusta · 61–75 testit/refaktorointi/dokumentaatio · 76–90 pilottipalaute + bugit + suunnittelu.
- **Viikkorytmi:** ma suunnittelu (AI:n kanssa) · ti–to syvä työ · pe puhdistuspäivä (refaktorointi/CI/dokumentaatio, ei uusia featureita).
- **Yksi kuri yli muiden:** jokainen muutos kulkee testien + CI:n läpi ennen tuotantoa. *Tämä on jo paikallaan
  (296 + 97 testiä, CI) — suojele sitä, älä anna kiireen ohittaa.*

---

## 6. Ensimmäiset 30 päivää — konkreettinen

> **Päivitetty 2026-06-30:** Alkuperäisen taulukon viikot 1–2 (Rules-CI, branch protection, CI-portit, backup,
> Billing-alert) on **jo tehty** (§0.1). Alla uudelleenkohdistettu 30 päivää jäljellä oleviin solo-turvaverkkokohtiin
> + pilotin oppimiseen. Huom: heinä–elokuu lomittuu pilotin käyttöönoton kanssa (`PILOTTI_KAYTTOONOTTO_2026.md`) —
> säädä tahti sen mukaan.

| Viikko | Ma (suunnittelu) | Ti–To (syvä työ) | Pe (puhdistus) |
|---|---|---|---|
| 1 | GDPR-tekniikka: RTBF + export -spec | RTBF-CF (pelaaja + alikokoelmien rekursio, europe-west1, Admin SDK) + export-CF | Testaa + dokumentoi (policy/DPIA → DPO-lista, portti säilyy) |
| 2 | Staging-tenant: kevyin malli | Erillinen `seuraId` stagingille (tai oma Firebase-projekti) + verifioi | Dokumentoi staging-työnkulku |
| 3 | Pilotin palautesilmukka | Kevyt käyttöinstrumentointi (§7.22-turvallinen) + palautekanava + Sentry release tracking | Katsaus: mitä pilottidata kertoo |
| 4 | Priorisoi SEURAAVAKSI pilottidatan pohjalta | Tarveohjattu: KPV/Ylöjärven Ilves -datatuonnit (heinäkuu) TAI AI-insight-CF (matala hedelmä) | Review + `lib/`-eriytys jatkuu |

**Tehty jo (ei enää 30 päivän listalla):** Rules-deploy CI · branch protection + CI-portit · off-site backup ·
Billing-alert · Sentry (errors+PII-skrubi) · sähköposti SPF/DKIM/DMARC · version:bump-automaatio · CF Node 22.

**Kriittisin oivallus (KIMIltä, allekirjoitan):** älä mieti "miten saan toisen kehittäjän" vaan "miten rakennan
niin että kuka tahansa voi liittyä." Lisään: **ja niin että pilotti pysyy vakaana ja opettaa sinua** — sillä
juuri pilotti kertoo mitä kannattaa rakentaa seuraavaksi. Turvaverkko + puhtaat moduulit + dokumentoidut
invariantit + API-valmius tapana = voit jatkaa yksin niin kauan kuin haluat, ja oikea kehittäjä pääsee
tuottavaksi viikossa, ei kuukaudessa.

---

## 7. Seuraavat askeleet tämän dokumentin jälkeen
Voin avata minkä tahansa NYT-kohdan tarkaksi toteutukseksi:
- Rules-deploy-CI:n GitHub Actions -workflow + SA-oikeuksien korjausohje.
- RTBF + export -Cloud Functionien spec (europe-west1, Admin SDK, alikokoelmien rekursio).
- Off-site backup -ajastus (`gcloud firestore export` + Cloud Scheduler).
- Pilotin käyttöinstrumentoinnin kevyt malli (mitä mitata ilman että rikot §7.22-lapsiturvaa).
