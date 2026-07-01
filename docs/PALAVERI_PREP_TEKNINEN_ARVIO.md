# Palaveri-prep — tekninen arvio (mahdollinen 2. koodari), 2026-07-02

> Sparraussessio potentiaalisen toisen kehittäjän kanssa. Arvio on korkealaatuinen — se on **hyvä rekrymerkki**. Mutta arvioija sanoo itse: *"Live page inspection was not possible... findings are based on the source documentation"* → osa "kriittisistä puutteista" on **jo tehty** (vanhentuneet dokit) tai faktisesti väärin. Tämä prep: mikä on totta, mikä ei, mitä otat omaksi, miten vedät palaverin.
> Faktat varmistettu reposta 2026-07-01 (ei muistinvaraisia).

---

## 0. Miten vedä palaveri (asenne)
1. **Ota arvio tosissaan ja kiitä siitä.** Laatu = kandidaatti on terävä. Se on itsessään arvokasta.
2. **Omista aidot löydökset heti** — erityisesti demo-salasana. Nopea "hyvä katch, korjaan tänään" osoittaa kypsyyttä ja on paras vastaus.
3. **Korjaa vanhentuneet kohdat rauhallisesti, faktoilla** — älä puolustele. "Tuo on jo tehty, katsotaan yhdessä koodista." Näet samalla miten kandidaatti reagoi kun näytät että hän luki vanhaa dataa — hyvä kandidaatti päivittää näkemyksensä sujuvasti.
4. **Erottele: turvallisuushygienia (korjaa nyt) vs. arkkitehtuurivelka (roadmap).** Älä anna kaiken näyttää yhtä kiireelliseltä.
5. **Käytä palaveri kandidaatin arviointiin:** vahva turvallisuusvaisto + Azure-tausta + perusteellisuus. Heikkous: ei verifioinut väitteitä ajavaa järjestelmää vasten → muutama itsevarma-mutta-väärä väite. Katso reagoiko hän niihin nöyrästi.

---

## 1. JO TEHTY — arvioija luki vanhentuneita dokkeja (korjaa faktoilla)

### ❌→✅ "GDPR: No RTBF or data export implementation" (heidän H1, 'critical')
**VÄÄRIN — tehty ja live-verifioitu.** `functions/index.js`: `exports.poistaPelaajaGDPR` (rivi 2166) + `exports.viePelaajanDataGDPR` (rivi 2272) + `functions/gdpr_locator.js`. Oikeus tulla unohdetuksi (Art. 17) + datan export (Art. 20) rakennettu, dryRun-esikatselu, audit, kaikki EU:ssa. Verifioitu demo-pelaajalla (2 bugia napattu ennen tuotantoa: signBlob IAM + collectionGroup). **Näytä koodista.**

### ❌→✅ "No native offline support / not a PWA / no Service Worker, no manifest.json" (heidän §9, M2)
**VÄÄRIN pelaaja-/vanhempi-apeille.** Reposta löytyy: `sw_pelaaja.js`, `sw_vanhempi.js`, `manifest_pelaaja.json`, `manifest_vanhempi.json`, `assets/pwa/icon-{192,512,maskable}.png`. **Molemmat rekisteröivät Service Workerin** (grep vahvistaa Pelaaja_v7 + Vanhempi_v2). Eli pelaaja- ja vanhempi-appi OVAT PWA:ita SW + manifest + ikonit + allowlist-cache-strategia (§27.4).
- *Osittain oikein:* kenttätyökalut (Testaus_v9, ADAR) käyttävät ERI offline-mallia (bundler, "page-stays-alive"). Arvioija sekoitti kenttätyökalun mallin koko appiin. Offline-kritiikki pätee vain kenttätyökaluihin, ei pelaaja/vanhempi-PWA:han.

### ⚠️→osin "GDPR policy: no privacy policy, no DPIA mention, no DPA" (heidän §8.2)
**Työn alla, ei puuttuva.** Malli A -päätös tehty (TM = rekisterinpitäjä, `GDPR_POLICY_PLAN.md`), **tietosuojaseloste-luonnos** olemassa (`TIETOSUOJASELOSTE_LUONNOS.md`), **juristibriiffi** valmis (`GDPR_JURISTIBRIEFFI.md`, 8 kysymystä ml. DPIA + Art. 9). Sibbo-sopimus päivitetty Malli A:han. DPIA + DPA(Google) + retention = juristin vahvistusta odottava (#98). → "Ei mainintaa" on väärin; nämä ovat aktiivisessa juristiputkessa.

---

## 2. AIDOT & KIIREELLISET — omista, tee (osa jo tänään)

### 🔴 KRIITTINEN — demo-salasana julkisessa reposssa (heidän I1) — TOSI
Demo-VP:n plaintext-salasana `[redacted]` löytyi versionhallinnasta (3 tiedostoa: `docs/demo_setup_ohjeet.md`, `tm_admin/setup_demo_fc.js`, `tm_admin/check_demo.js` — arvioijan mainitsemat `check_all_users.js`/`firestore_rules_check.js` eivät sisältäneet sitä). **Tämä on arvioijan paras löytö — ota täysi vastuu.** Poistettu tiedostoista 2026-07-01; tili rotatoitava Consolessa (historia).
**Toimet (sinä, tänään, ennen palaveria jos ehdit):**
1. **Firebase Console → poista/disabloi `vp.demo@talentmaster.fi`** (tai vaihda salasana + rajaa demo-seuraan jossa ei oikeaa dataa).
2. Poista salasana kaikista 5 tiedostosta (→ Code-tehtävä).
3. Tarkista audit-lokista pääsikö tilillä oikeaan dataan.
4. Git-historia sisältää salasanan pysyvästi → tili on joka tapauksessa disabloitava/rotatoitava, ei riitä että poistaa tiedostosta.

### 🟠 API-avaimen domain-rajoitus + App Check (heidän I2/H4) — todennäköisesti auki
`config.js` rivi 14 kommentti on ristiriitainen ("✅ ... on asetettu (TEHTÄVÄ)") → **varmista Google Cloud Consolesta** onko HTTP-referrer-rajoitus päällä. Jos ei:
1. Rajaa avain domaineihin `terokoskela7-cmyk.github.io` + `talentmasterid.com` (5 min, tee tänään).
2. Harkitse **Firebase App Check** (laiteattestointi) — nostaa väärinkäytön rimaa oleellisesti. Hyvä keskisuuri projekti.
> Konteksti palaveriin: Firebase-apiKey on *suunniteltu julkiseksi* (turva = Security Rules). Mutta arvioija on oikeassa että **avoin apiKey + puutteellinen rajaus = kvootin väärinkäyttö / Rules-luotaus.** Oikea korjaus = domain-rajoitus + App Check, ei avaimen piilotus.

### 🟡 Super-admin UID + henkilökohtainen email reposssa (heidän H3)
Poista **henkilökohtainen gmail** CLAUDE.md/config.js:stä (hygienia). UID **ei ole kirjautumistunnus** → arvioijan "HIGH" on ylimitoitettu (medium-low), mutta email-poisto on halpa ja järkevä. → Code-tehtävä.

### 🟢 Nopeat voitot (heidän M-taso/L-taso)
- **Sentry allowed origins** (estä väärennetyt error-postaukset) — Sentry-projektin asetus, 5 min.
- **`functions/.env` → `.gitignore`** + `.env.example` (nyt vain ei-salainen SENDGRID_FROM_EMAIL, mutta riskivektori).
- **`npm audit` CI:hin** (L4).

---

## 3. AIDOT ARKKITEHTUURI-KOMPROMISSIT — keskustele roadmapina (ei hätä)

| Löydös | Totuus / vastaus | Prioriteetti |
|---|---|---|
| **Monoliittinen 1-HTML/rooli, ei TypeScriptiä, ei komponentteja** | Tietoinen solo-dev-valinta (ei build-työkaluja). Tunnistettu velka §33 B1 (Vite/strangler). `lib/`-domain-logiikka jo framework-riippumaton + testattu → migraatio ei hukkaa bisneslogiikkaa. **TS-migraatio `lib/`-first on järkevä ensiaskel** (arvioija oikeassa: dokumentoidut bugit = juuri TS:n kiinniottamaa luokkaa). | Keskipitkä |
| **GitHub Pages tuotantohostina** | Reilu kritiikki. **Firebase Hosting** (sama ekosysteemi, security headers, App Check, atominen deploy, selkeä DPA) on luonteva siirto ennen kaupallista laajennusta. Pilotissa OK. | Ennen kaupallista |
| **Selain-navigaatio rikki (ei History API, ei deep-link)** | Aito UX-puute. `pushState`-retrofit kohtuutyö. | Keskitaso |
| **Cloud Functions v1 → v2** | Tunnistettu velka §33 (Node 22 tehty, v2-migraatio jäljellä). | Keskitaso |
| **PIN-autentikointi lapsille heikko** | Aito keskustelu. Nykyisin 4-num PIN + Anonymous Auth. **Lisää: rate-limiting (CF-guard tai App Check), PIN-palautuspolku dokumentoitava, harkitse 6-num.** Ei kuitenkaan "hätä nyt" pilotissa. Huoltajan email 2. tekijänä = hyvä idea. | Ennen kaupallista |
| **Firestore ei analytiikkaan (federaatiotaso)** | Oikein. **BigQuery-export** (natiivi Firebase-integraatio) kun mennään liitto-/ristiseura-raportointiin (§30 roadmap). | Myöhempi |
| **`lib/` vs `src/lib/` duplikaatti** | Tunnistettu (§33 A6). Osin re-exportoitu; loppuun vietävä. | Matala |
| **Vanhat versiotiedostot (VP_v1..v24)** | Kuollutta koodia, poistettavissa. | Matala |
| **Bus factor / CLAUDE.md-vetoinen kehitys** | Reilu huomio. Vastaus: `TEKNINEN_YLEISKUVA.md` + `CLAUDE.md` + 348 testiä + dokumentoidut invariantit = siirrettävää. 2. koodari testaa juuri tämän. | (rekry) |

---

## 4. Mitä arvioija saa oikein (myönnä avoimesti)
Demo-salasana (paras katch), API-rajoitus/App Check, selainnavigaatio, TS-arvo, GitHub Pages → Firebase Hosting, PIN-rate-limiting, BigQuery-analytiikka, CF v1→v2. Nämä ovat **oikeita ja hyödyllisiä** — käytä ne. Arvioija ymmärtää Firestore/GDPR-ympäristön hyvin.

## 5. Mitä arvioija saa väärin / ylimitoittaa (korjaa faktalla)
- **RTBF/export "puuttuu"** → tehty + verifioitu (näytä koodi).
- **"Ei PWA / ei Service Workeria"** → on PWA (sw_pelaaja.js + manifestit + ikonit + rekisteröinti).
- **GDPR-policy "ei mainintaa"** → Malli A + seloste-luonnos + juristibriiffi olemassa, juristiputki käynnissä.
- **Super-admin UID "HIGH/exploitable"** → UID ei ole login-tunnus; medium-low.
- **Firebase apiKey "exposed" dramatisointi** → julkinen by design; oikea korjaus on App Check + domain-rajoitus (jonka arvioija onneksi nimeääkin).

---

## 6. Palaverin toimintalista (priorisoitu)
**Tänään ennen palaveria (jos ehdit):**
1. 🔴 Disabloi/rotatoi `vp.demo@talentmaster.fi` Firebase Consolessa + tarkista audit.
2. 🟠 Varmista/aseta API-avaimen domain-rajoitus Google Cloud Consolessa.

**Code-tehtävät (anna Codelle, ei kiire palaveriin):**
3. Poista demo-VP:n plaintext-salasana `[redacted]` tiedostoista + `functions/.env` → .gitignore + `.env.example`.
4. Poista henkilökohtainen gmail CLAUDE.md/config.js:stä.
5. `npm audit` CI:hin.

**Roadmap-päätökset palaverissa (kandidaatin kanssa):**
6. Firebase App Check — päätä tehdäänkö nyt vai kaupallista ennen.
7. GitHub Pages → Firebase Hosting -siirron ajoitus.
8. TypeScript `lib/`-first -migraatio — sopiva 1. tehtävä uudelle koodarille?
9. History API -navigaatio — keskisprintti.

**Kandidaatti-arvio (sinulle):**
Vahva turvallisuus + arkkitehtuurinäkemys, perusteellinen, Azure→Firebase-kääntäjä selkeä. Testaa palaverissa: (a) miten reagoi kun näytät että RTBF/PWA on jo tehty (nöyryys vs. defensiivisyys), (b) osaako priorisoida (hätä vs. velka), (c) sopiiko solo-dev-kompromissien kunnioitus vs. "kaikki pitää kirjoittaa uusiksi" -asenne.

---

*Faktat varmistettu reposta 2026-07-01: GDPR-funktiot (index.js 2166/2272 + gdpr_locator.js), PWA (sw_pelaaja/vanhempi.js + manifestit + assets/pwa/ikonit + SW-rekisteröinti), demo-salasana (5 tiedostoa), config.js (superAdminUid + API-rajoitus-kommentti ristiriitainen).*
