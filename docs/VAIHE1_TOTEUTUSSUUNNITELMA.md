# TalentMaster — Vaihe 1: Perustan kovetus (hosting-vaihto + modularisointi)

_Tarkka toteutussuunnitelma · annettavaksi koodarille TAI ajettavaksi itse · spec-and-verify_

## Miten tätä käytetään

Jokainen **vaihe** = yksi `CODE_OHJE`-briiffi (minä kirjoitan) → yksi PR → verifiointi → merge.
**Ei big-bangia:** jokainen vaihe on itsenäisesti tuotantoon vietävä JA peruutettava. Voit pysähtyä
minkä tahansa vaiheen jälkeen ilman että mikään jää kesken.

### Prosessi (toistuu joka vaiheessa)
1. **Arkkitehti (Claude)** kirjoittaa briiffin: mitä, miksi, DoD, verifiointitapa.
2. **Koodari (Code tai sinä)** toteuttaa branchilla → PR (base `main`).
3. **Arkkitehti** verifioi: **L1** git-diff · **L2** testit (`npm test`) · **L3** elävä selaimessa.
4. **Sinä** mergeät. Deploy.
5. Seuraava vaihe vasta kun edellinen on vihreä.

### Kultaiset säännöt (suojaavat migraatiossa — nämä estävät rikkomisen)
- **Behavior-preserving:** ekstraktiossa käytös ei muutu, logiikka vain *siirtyy* uuteen paikkaan.
- **Säilytä testattu ydin + invariantit** (CLAUDE.md §3/§7) — älä kirjoita niitä uusiksi.
- **Yksi huoli per PR.** Testit ekstraktion mukana. Ei Rules-/skeemamuutosta ellei vaihe on juuri se.
- **Verifioi ennen mergeä.** Pidä vanha polku kunnes uusi on todistettu.

### Tärkeä tekninen valinta (miksi tämä on matalariskinen)
Modularisointi **ei vaadi bundleria eikä build-vaihetta.** `lib/`-moduulit ladataan jo nyt tavallisella
`<script src>`-tagilla (dual-export: `module.exports || window.TM_*`). Ekstraktio = siirrä logiikka
inline-HTML:stä `lib/tm_*.js`:ään, lataa se scriptinä, kutsu appista. **Sama kuvio jonka verifioimme
juuri tässä sessiossa** (`tm_adar_rubriikki.js`, `_tekKorttiData`). Bundleri (esbuild) on
*myöhempi, valinnainen* optimointi — ei estä eikä tarvita.

---

## Vaiheet järjestyksessä

### 1.0 — Turvaverkko & valmistelu · koko: S · riski: mitätön
**Ennen kuin mitään koodia liikutetaan.** Tavoite: kukaan ei lennä sokkona.
- Node-versio pinnattu (`package.json` `engines` — nyt tyhjä).
- `README.md` + `docs/DEV_ONBOARDING.md` (kloonaa → `npm install` → `npm test` → esikatsele → deploy).
- CI vihreä baseline; varmuuskopiot päälle (Firestore export / PITR); Sentry-kattavuus tarkistettu.
- **Verifiointi:** uusi kone saa repon pystyyn pelkän dokumentin avulla; backupit päällä.
- **Valmis kun:** kuka tahansa (myös sinä) saa ympäristön pystyyn ohjeesta.

### 1.1 — Firebase Hosting -siirto · koko: M · riski: matala, täysin peruutettavissa
Tavoite: atomiset deployt, rollback, **preview-kanavat**, cache-headerit. **Ei koske sovelluslogiikkaa.**
- `firebase.json` hosting-konfig; deploy **rinnakkain** GitHub Pagesin kanssa (ei vielä cutoveria).
- `Cache-Control`-headerit → poistaa `?v=`-käsityön tarpeen operatiivisesti.
- **Preview-kanava per PR** → L3-verifiointi oikeasta URL:sta *ennen* mergeä (parantaa kaikkea muuta).
- Verifioi että Firebase Hosting -versio käyttäytyy identtisesti; **sitten cutover** (domain).
- **Verifiointi:** L3 — molemmat hostit rinnan, identtinen käytös; GitHub Pages jää varalle.
- **Valmis kun:** tuotanto Firebase Hostingissa, vanha jää fallbackiksi, preview-kanavat käytössä.

### 1.2 — Versiointi kuntoon · koko: S · riski: matala
Tavoite: sama jaettu kirjasto ei aja eri versioina eri apeissa (velka V5/V7).
- Skripti joka synkkaa `?v=` kaikkiin 6 appiin yhdestä lähteestä (`version.json`).
- `bump-version` kattamaan **VP + Seura** (nyt vain 4/6 → ne jäävät jälkeen).
- **Verifiointi:** L1 (kaikki apit sama lib-versio) + L2.
- **Valmis kun:** yksi versio per lib, kaikki 6 appia synkassa.

### 1.3 — Kustannus-baseline · koko: S · riski: mitätön (vain mittaus)
Tavoite: tiedä mistä Firestore-kustannus syntyy ennen kuin optimoit.
- Kartoita: 16 reaaliaikaista listeneriä, rajaamattomat kokoelmaluvut, kalenterin koko-luku.
- Firestore-käyttömittarit + **budjettihälytys** päälle.
- **Tuotos:** priorisoitu lista optimoitavista hot-poluista (syöte Vaiheelle 2).
- **Valmis kun:** baseline mitattu, hälytykset päällä, optimointilista olemassa.

### 1.4 — Pilotti-ekstraktio · koko: S–M · riski: matala
Tavoite: **todista strangler-kuvio pienellä palalla** — rakenna luottamus (etenkin jos teet itse /
uusi koodari aloittaa). Valitse pieni, korkean duplikaation, matalan kytköksen logiikka
(esim. auth/PIN-helper `tm_auth.js`:iin, tai pieni jaettu laskenta).
- Ekstraktoi `lib/tm_*.js`:ään (dual-export) + vitest-testit; **yksi app** käyttämään.
- **Verifiointi:** L1/L2/L3, käytös ennallaan.
- **Valmis kun:** yksi huoli jaettuna + testattuna → malli todistettu ja toistettavissa.

### 1.5 — Kalenteri-ydin ekstraktio · koko: L (jaettu moneen PR:ään) · riski: keski
Tavoite: poista **suurin bugipinta** (kalenteri/RSVP duplikaatio, velka V2 — siellä viime bugit elivät).
- Laajenna `lib/tm_kalenteri.js`: lataus + saatavuus/tila render + save.
- **Migroi yksi app kerrallaan:** Pelaaja → Vanhempi → Master → VP. Behavior-preserving. Testit mukana.
- **Verifiointi:** L1/L2/L3 **per app** — erityisesti elävä kalenteri/RSVP (Topias).
- **Valmis kun:** kaikki 4 appia käyttävät jaettua kalenteria; `_p7`/`_vanh`-copy-paste + kaksi
  läsnäolotallenninta poistettu.

### 1.6 — Kortti/5D-ydin ekstraktio · koko: L (jaettu) · riski: keski
Tavoite: yhtenäistä kortti/5D-laskenta (velka V1) — kun kortti-featuret ovat vakiintuneet.
- Ekstraktoi `_fcKorttiData`/`_laskeStage`/`_dimTaso5`/OVR `lib/`-moduuliin + **testit ENSIN**.
- Migroi Pelaaja → VP/Master/Admin. Elvytä/korvaa kuollut `tm-kortit.js`/`tm-profile.js`.
- **Verifiointi:** L1/L2/L3; kortti-render Topiaalla.
- **Valmis kun:** yksi testattu kortti/5D-lähde, kaikki apit käyttävät sitä.

### 1.7 — Ohut data-kerros · koko: M–L · riski: keski · (valinnainen, kun 1.5+1.6 tehty)
Tavoite: keskitä hot-polkujen kirjoitukset (velka V3/V4) → poista "tallennin ajautuu" -luokka.
- `lib/tm_data.js` repository: kayttajat, kalenteri, lasnaolijat, idp.
- **Valmis kun:** hot-polkujen kirjoitukset kulkevat yhden kerroksen läpi.

---

## Aikajana & päätöspisteet

```
1.0 turvaverkko → 1.1 hosting → 1.2 versiointi → 1.3 kustannus-baseline
   → 1.4 pilotti-ekstraktio → 1.5 kalenteri → 1.6 kortti/5D → (1.7 data-kerros)
```

- **1.0–1.3 = perusta** (nopeita, matalariskisiä). Näiden jälkeen olet valmiimpi kasvuun jo paljon.
- **1.4 = mallin todistus.** Pieni, turvallinen — hyvä ensimmäinen jos teet itse.
- **1.5–1.7 = varsinainen modularisointi**, app kerrallaan, ei koskaan monta yhtä aikaa samassa alueessa.

**Voit pysähtyä minkä tahansa vaiheen jälkeen.** Jos kasvu ei ole akuutti, 1.0–1.3 riittää pitkälle.

## Sinun roolisi joka portilla (ei vaadi syväkokemusta)
- Hyväksyt briiffin ennen toteutusta · mergeät PR:n verifioinnin jälkeen · päätät priorisoinnin.
- Jos teet itse: seuraa briiffiä, aja `npm test` + `npm run lint`, avaa PR — **minä verifioin L1/L2/L3.**
- **Aloita 1.0:sta** (turvaverkko) — se tekee kaiken muun turvalliseksi.

## Rinnakkaisuus (jos löydät toisen koodarin)
Turvallista rinnakkaistaa VAIN ei-päällekkäiset alueet: esim. 1.1 (hosting) + 1.3 (mittaus) yhtä
aikaa OK. **Älä koskaan aja kahta koodaria samassa tiedostossa/alueessa** (esim. molemmat
kalenterissa) — se synnyttää juuri ne ajautumabugit joita poistamme. Minä pidän sekvenssin.
