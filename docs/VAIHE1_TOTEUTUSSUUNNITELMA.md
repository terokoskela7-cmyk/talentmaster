# TalentMaster — Vaihe 1: Perustan kovetus (hosting-vaihto + modularisointi)

_Tarkka toteutussuunnitelma · v2 (täydennetty turvaverkoilla) · solo-vetäjälle & tulevalle partnerille · spec-and-verify_

## Miten tätä käytetään + solo-realismi

Jokainen **vaihe** = yksi `CODE_OHJE`-briiffi (arkkitehti kirjoittaa) → yksi PR → verifiointi → merge.
**Ei big-bangia:** jokainen vaihe on itsenäisesti tuotantoon vietävä JA peruutettava.

**Prosessi (toistuu joka vaiheessa):**
1. **Arkkitehti (Claude)** kirjoittaa briiffin: mitä, miksi, DoD, verifiointitapa.
2. **Koodari (AI Code tai partneri)** toteuttaa branchilla → PR (base `main`).
3. **Arkkitehti** verifioi: **L1** git-diff · **L2** testit · **L3** elävä selaimessa.
4. **Sinä** mergeät. Deploy.

**Solo-realismi (tärkeä):** et kirjoita ekstraktioita käsin. **AI-koodari tekee koodin, sinä ajat
silmukkaa** — hyväksy briiffi → käske Code toteuttamaan → Claude verifioi → sinä mergeät.
Ei vaadi teknistä syväosaamista; vaatii luotettavan prosessin, joka on tässä.

**Solo-vyöhyke:** **1.0–1.4 on turvallinen yksin** (perusta + pieni pilotti). **1.5–1.6 (kalenteri,
kortti/5D) ovat isoimmat/riskisimmät → tee partnerin kanssa tai erityishuolella.** Voit pysähtyä
minkä tahansa vaiheen jälkeen — jo 1.0:n jälkeen olet paljon vahvemmalla.

## Kultaiset säännöt (suojaavat migraatiossa)
- **Behavior-preserving:** ekstraktiossa käytös ei muutu, logiikka vain *siirtyy*.
- **Säilytä testattu ydin + invariantit** (CLAUDE.md §3/§7) — älä kirjoita uusiksi.
- **Yksi huoli per PR.** Testit ekstraktion mukana. Ei Rules-/skeemamuutosta ellei vaihe on juuri se.
- **Verifioi ennen mergeä.** Pidä vanha polku kunnes uusi todistettu.
- **Ei bundleria/build-vaihetta tarvita:** `lib/`-moduulit ladataan `<script src>`-tagilla
  (dual-export). Ekstraktio = siirrä logiikka inline-HTML:stä `lib/tm_*.js`:ään. Sama kuvio jonka
  verifioimme (`tm_adar_rubriikki.js`, `_tekKorttiData`). Esbuild-bundleri = myöhempi, valinnainen.

---

## VAIHE 1.0 — Turvaverkko (LAAJENNETTU) · ennen kuin mitään koodia liikutetaan
Tämä on nyt suunnitelman **tärkein perusta** — se tekee kaiken muun turvalliseksi yksin tekevälle.

### 1.0a — Ympäristö & ajettavuus
- **Erillinen staging-Firebase-projekti** (tai vähintään Firestore-emulaattori paikalliseen kehitykseen)
  → refaktoroinnit/kokeilut EIVÄT osu tuotanto-dataan (oikeiden alaikäisten data). ⚠️ Isoin
  yksittäinen turvaverkko solo-refaktoroinnille — nyt apit osuvat suoraan tuotantoon.
- Node-versio pinnattu (`package.json` `engines` — nyt tyhjä).
- `README.md` + `docs/DEV_ONBOARDING.md` (kloonaa → `npm install` → `npm test` → esikatsele → deploy).
  Ratkaisee samalla "toisen koodaajan onboarding" -kysymyksen.

### 1.0b — Pääsy, jatkuvuus & bus-factor (solo-riski)
- **Kirjaa kuka-omistaa-mitä + palautuspolut:** Firebase/GCP-omistajuus, domain, GitHub, super-admin,
  laskutus; recovery-sähköpostit, 2FA-varakoodit. **Bus-factor = 1** nyt → tämä on halpa vakuutus.
- **Turvallisen luovutuksen suunnitelma** partnerille (secretit, IAM-roolit) valmiiksi.
- **Dokumentit = projektin aivot:** AI:lla ei ole muistia yli sessioiden → CLAUDE.md + briiffit +
  nämä suunnitelmat *ovat* muisti. Pidä ajan tasalla. Lisää kevyt **päätösloki (ADR)**: *miksi*
  valittiin hosting-vaihto eikä rewrite, jne.

### 1.0c — Turva & kustannus
- **Varmuuskopiot päälle:** Firestore-export + Point-in-Time Recovery.
- **Kova budjettikatto** (ei vain hälytys) — solo-vetäjä ei saa yllätyslaskua jos huono kysely pääsee läpi.
- **Anonyymin pääsyn väärinkäyttöpinnan tarkistus** (näimme RSVP:n anon-polun) — 10k + anon-kirjoitus
  = luku-/kustannuspiikin riski.
- Sentry-kattavuus tarkistettu (virhemonitorointi).

### 1.0d — Appien varmistusverkko (koska automaattitestit eivät kata appeja)
- **Manuaalinen savutesti-checklista per app** (5 min: kirjaudu → kalenteri näkyy → kortti aukeaa →
  RSVP toimii → tallennus onnistuu…), jonka **sinä** voit ajaa itse ennen mergeä. Vähentää yhden
  pisteen riippuvuutta siitä että arkkitehti on aina paikalla L3:een.

### 1.0e — GDPR-perusteet (juridis-operatiivinen, ei tekninen)
- Dokumentoi: **kuka on rekisterinpitäjä**, **DPA-malli seuroille**, **poistoprosessi**. `terveys/`-
  eristys on jo hyvä pohja. 10 000 alaikäistä + solo-omistaja = tämä ei saa olla jälkiajatus.

**Riski:** matala (enimmäkseen konfiguraatio + dokumentointi). **Valmis kun:** staging olemassa,
pääsyt/recovery kirjattu, backupit + budjettikatto päällä, savutesti-checklistat + GDPR-perusteet
dokumentoitu, repo pystyyn ohjeesta.
**Huom:** osa 1.0:sta on **console/ops-työtä** (Firebase/GCP-konsoli) — tässä sinä tarvitset eniten
kädestä pitäen -ohjausta; koodiosuudet (README, Node-pin, checklistat) AI hoitaa.

---

## VAIHE 1.1 — Firebase Hosting -siirto · M · riski matala, peruutettavissa
Atomiset deployt, rollback, **preview-kanavat**, cache-headerit. Ei koske sovelluslogiikkaa.
- `firebase.json` hosting; deploy **rinnakkain** GitHub Pagesin kanssa; `Cache-Control` (poistaa
  `?v=`-käsityön); **preview-kanava per PR** (L3 oikeasta URL:sta ennen mergeä).
- Verifioi identtinen käytös → cutover. GitHub Pages jää fallbackiksi.

## VAIHE 1.2 — Versiointi kuntoon · S · riski matala
Sama lib ei aja eri versioina eri apeissa (V5/V7). Synkkaus-skripti `?v=` yhdestä lähteestä;
`bump-version` kattamaan VP + Seura (nyt 4/6).

## VAIHE 1.3 — Kustannus-baseline · S · riski mitätön (mittaus)
Kartoita 16 listeneriä + rajaamattomat luvut + kalenterin koko-luku; käyttömittarit päälle;
**tuotos:** priorisoitu optimointilista (syöte Vaiheelle 2). (Budjettikatto tuli jo 1.0c:ssä.)

## VAIHE 1.4 — Pilotti-ekstraktio · S–M · riski matala
Todista strangler-kuvio pienellä, hyvin rajatulla palalla (esim. auth/PIN-helper tai pieni jaettu
laskenta) → `lib/tm_*.js` (dual-export) + testit; yksi app käyttämään. **Turvallinen ensiaskel solona.**

## VAIHE 1.5 — Kalenteri-ydin ekstraktio · L (jaettu) · riski keski · ⚠️ partneri/erityishuolella
Suurin bugipinta (V2). Laajenna `lib/tm_kalenteri.js`; migroi app kerrallaan (Pelaaja→Vanhempi→
Master→VP), behavior-preserving, testit + savutesti per app.

## VAIHE 1.6 — Kortti/5D-ydin ekstraktio · L (jaettu) · riski keski · ⚠️ partneri/erityishuolella
Yhtenäistä kortti/5D-laskenta (V1) kun kortti-featuret vakiintuneet. Testit ENSIN. Migroi
Pelaaja→VP/Master/Admin.

## VAIHE 1.7 — Ohut data-kerros · M–L · valinnainen, kun 1.5+1.6 tehty
Keskitä hot-polkujen kirjoitukset (V3/V4) → poista "tallennin ajautuu" -luokka.

---

## Aikajana
```
1.0 turvaverkko (laaja) → 1.1 hosting → 1.2 versiointi → 1.3 kustannus-baseline
   → 1.4 pilotti-ekstraktio  |  [SOLO-VYÖHYKE PÄÄTTYY TÄHÄN]
   → 1.5 kalenteri → 1.6 kortti/5D → (1.7 data-kerros)   [partnerin kanssa / erityishuolella]
```

## "Valmis kasvuun" -kriteeri (milloin voi alkaa kasvattaa seuramäärää)
✅ Staging olemassa · ✅ hosting + rollback · ✅ varmuuskopiot + budjettikatto ·
✅ kustannus-hot-polut rajattu · ✅ GDPR-perusteet dokumentoitu · ✅ savutesti-checklistat ·
✅ pääsyt/recovery kirjattu.

## Sinun roolisi joka portilla
Hyväksyt briiffin → (käsket Coden toteuttaa) → ajat savutesti-checklistan → **Claude verifioi
L1/L2/L3** → mergeät. **Aloita 1.0:sta.** Rinnakkaisuus (jos löytyy partneri): vain ei-päällekkäiset
alueet yhtä aikaa; ei koskaan kahta samassa tiedostossa — arkkitehti pitää sekvenssin.
