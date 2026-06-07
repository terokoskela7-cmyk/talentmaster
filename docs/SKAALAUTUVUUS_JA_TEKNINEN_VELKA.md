# TalentMaster — Skaalautuvuus & tekninen velka

> Laadittu 2026-06-07. Konteksti: pilotti (SJK + Sibbo) on käynnissä yhden kehittäjän + AI-avustajan
> moodissa. Tämä dokumentti määrittää (A) Sprint 6:n teknisen velan, joka pitää maksaa ennen kuin
> toinen kehittäjä voi turvallisesti osallistua, ja (B) suunnan, johon TalentMaster pitää kehittää
> jotta siitä tulee skaalautuva SaaS-tuote.
>
> Lähtötila-arvio (faktat repo-skannauksesta 2026-06-07):
> - Frontend-monoliitit: VP_v25 6 272 riviä, Master_v16 5 723, Seura 5 703 — markup+CSS+JS samassa.
> - **0 automaattitestiä.** Validointi = manuaalinen `node --check` + brace-laskenta per commit.
> - **Ei `firestore.indexes.json`:ää** (lisätty nyt) → composite-indeksit elivät Consolessa → hiljaiset query-failit.
> - Rules deployataan käsin Consolesta (GitHub Actions → 403). Ei review-porttia.
> - Versio tiedostonimessä (Master_v16, Pelaaja_v7) + vanhat versiot repossa (Master_v9, Pelaaja_v3).
> - Funktio-törmäykset (laskeEI/laskeFVP/laskeVNE kahdessa tiedostossa, last-loaded-wins).

---

## OSA A — Sprint 6: tekninen velka (P0, ennen avointa kehitystä)

Periaate: jokainen alla oleva poistaa kokonaisen **hiljaisen virheluokan**, jollaisia korsimme juuri
manuaalisesti (composite-index-failit, kentännimi-mismatchit, logout-tilavuodot).

### A1. `firestore.indexes.json` + indeksit CI:hin ✅ (tiedosto luotu)
- **Tehty:** `firestore.indexes.json` juureen — 3 indeksiä niille queryille, jotka nyt kiertävät
  client-suodatuksella (limit-ikkuna):
  - `havainnot` (tila, pelaaja_lukenut, luotu↓) — P6-kuuntelija
  - `kehut` (nahty, luotu↓) — perhekehu
  - `mentoroinnit` (valmentajaId, aika↓) — VP lataaValmentajat + coach-historia
- **Seuraava:** `firebase deploy --only firestore:indexes` (service accountilla, EI Consolesta).
  Kun indeksit ovat livenä, koodi voi **palata järjestettyihin where-queryihin** ja luopua
  limit-ikkuna-kompromissista (joka pilotissa riittää, mutta skaalassa pudottaa vanhoja merkintöjä).
- **Miksi:** index-as-code = uusi query ei pääse tuotantoon ilman, että sen indeksi on repossa.
  Tämä estää pysyvästi sen bugiluokan, jota jahtasimme commiteissa 333c36a / 786f43e.

### A2. KPI-laskennan yksikkötestit (suurin tuotto) — ✅ VALMIS 2026-06-07
- **Työkalu:** **Vitest** (`npm test` = `vitest run`, `test:watch` = `vitest`). Aloitin node:testillä
  (nolla riippuvuutta), mutta vaihdoimme Vitestiin paremman DX:n vuoksi (watch, coverage, expect-API).
  Molemmat KPI-moduulit ovat UMD (`module.exports`) → `createRequire`-import toimii suoraan.
- **Tehty (85 testiä, kaikki vihreät):** `tests/testit_indeksit.test.js` (64) +
  `tests/eerikkila_normit.test.js` (21) + `vitest.config.js` (`include: tests/**`) +
  CI `.github/workflows/test.yml` (`npm ci && npm test`, verifioitu vihreäksi). Kattaa:
  - `tkLaskeMerkki`, `tkLaskeTKI`, `laskeKokonaistulos`, `tkPituuspotkuBonus`,
    `_laskeVahvuudetJaKehityskohteet`, `hhLaskeTaso`, `laskeEI`, `laskeFVP`, `laskeVNE`
  - `eerikkilaTaso`, `eerikkilaNormiarvo`, `laskeTSI`
  - **MAS-yksikkö-REGRESSIO:** km/h (14.4) saturoi taso 5; m/s (4.0) → oikea taso → muunnos /3.6 pakollinen
- **Sivulöydökset:** (1→A6) root `package.json` oli väärin nimetty tsconfig → siirretty `tsconfig.json`:ään;
  (2) puhtaassa `npm install`issa rollup-natiivibinääri jäi asentumatta (npm optional-deps-bugi) —
  `npm ci` korjaa, joten CI on kunnossa.
- **Vielä lisättävää (myöhemmin):** TSI 5-vyöhyke-rajat eksplisiittisesti, Hidden Gem -kynnys,
  ADAR-pisteet + lisää validoituja fixtureita (esim. Miko Alho TSI 1.4 → ⚠ ei 🔴).
- **Miksi:** ilman näitä kuka tahansa contributor rikkoo laskennan hiljaa — eikä manuaalinen
  `node --check` huomaa logiikkavirhettä, vain syntaksin.

### A3. Funktio-törmäysten purku (A2:n edellytys) — ✅ VALMIS 2026-06-07
- **Ongelma oli:** `laskeEI`/`laskeFVP` määritelty BÅDE `docs/testit_indeksit.js` (rikas → objekti)
  ETTÄ `lib/tm_eerikkila_normit.js` (yksinkertainen → numero) → last-loaded-wins.
- **Ratkaisu:** eerikkilä-libin versiot nimetty `laskeEI_simple`/`laskeFVP_simple` + backward-compat
  alias `if (typeof laskeEI === 'undefined') { var laskeEI = laskeEI_simple; }`. Latausjärjestys
  ratkaisee oikein: **Master** lataa molemmat (eerikkilä→testit_indeksit) → rikas voittaa (3-arg-kutsut);
  **VP** lataa vain eerikkilän → simple-numero (2-arg-kutsut). Kumpikin kutsupaikka säilyy ennallaan.
- **Lisäksi (TK-invariantti §23):** `tkLaskeMerkki`/`tkLaskeTKI` saivat `rajatOverride`-parametrin
  (yhtenäistetty Excel_Tuontin kanssa) + `<= → <` kaikissa kopioissa + `Math.min`-guard.
- **Vartioitu:** A2-testit varmistavat että molemmat `laskeEI`-versiot antavat saman ydinarvon.

### A4. Security Rules -testit + Rules CI
- **Työkalu:** `@firebase/rules-unit-testing` + emulaattori.
- **Kriittiset testit:** valmentaja EI voi lukea toisen seuran dataa; valmentaja VOI päivittää
  oman `kayttajat/{uid}`-profiilin mutta EI toisen; johto-roolit (vp/UTJ/sihteeri) EIVÄT
  client-päivitä pelaajia; kalenteri-kirjoitus toimii oikeilla rooleilla.
- **Rules CI:hin:** `firebase deploy --only firestore:rules` service accountilla. Selvitä miksi
  GitHub Actions sai 403 (todennäk. SA:lta puuttuu `firebaserules.admin` / Firebase Admin -rooli).
  Tämä poistaa "deployasinko oikean version?" -luottamusriskin.

### A5. `luotu`-kentän tyyppiristiriita + puuttuva kenttä — 🟡 KÄYNNISSÄ
- **KAKSI vikaluokkaa** (molemmat → orderBy/where-näkymättömyys, sama oire):
  - **Tyyppi-mismatch:** `havainnot.luotu` = ISO-string (Master 3498/3537) vs Timestamp-kyselyt
    (Vanhempi `where Timestamp`, Pelaaja `orderBy`). Firestore-tyyppijärjestys (timestamp < string)
    erottaa ne → limit/where näkee vain toisen tyypin.
  - **Puuttuva kenttä:** Pelaaja kirjoittaa `paivitetty` muttei `luotu`:a → Vanhempi `orderBy('luotu')`
    sulkee pelaajan kirjaukset **kokonaan** pois (orderBy palauttaa vain kentän omaavat docit).
- **Cascade:** kun Master kirjoittaa `luotu`:n Timestampina, Masterin omat string-vertailut hajoavat
  (3861/3879 `>= rajaPvm` → false, 5500 `String(Timestamp)` sort) → korjattava lukkoaskelin.
- **Sekvenssi (plan B — regressio ensin mahdottomaksi):**
  1. ✅ **Rules-vartija + testit** (TÄSSÄ): `luotuLuontiKelpaa`/`luotuPaivitysKelpaa` (havainnot/kirjaukset/kehut).
     create: luotu pakollinen + timestamp. update: `affectedKeys`-pohjainen (lukukuittaus ei riko).
     6 uutta rules-testiä. Kääntyy ✓, **EI deployattu** (live-ruleset varmistettu puhtaaksi).
  2. ✅ **Writer-fix + cascade** (TÄSSÄ): Master 3498/3537 → `serverTimestamp()` (havainnot=reaaliaikainen);
     Pelaaja kirjausData + takautuva → `Timestamp.fromDate(new Date(pvm))` (TUOTEPÄÄTÖS: `luotu`=treenipäivä,
     idempotentti merge + kronologinen feed; `paivitetty`=kirjaushetki). Cascade-luvut Master 3861/3879/5508
     → `_luotuToMs()` (tyyppiturvallinen Timestamp|string→ms). **Lisä-cascade löytyi:** `adar_pvm` (5530)
     pidettävä ISO-stringinä (VP `new Date(p.adar_pvm)` rikkoutuisi Timestampista); `_tarinaOtsikko`
     (Vanhempi) verifioitu turvalliseksi (saa aina Daten). Kaikki lukijat (Vanhempi/VP/Pelaaja) defensiivisiä
     tai turvallisia. Syntaksi ✓, KPI-testit 85 ✓.
  3. ⬜ Heterogeeninen migraatio (`collectionGroup`): havainnot konvertoi string→Timestamp;
     kirjaukset **backfill** `luotu = Timestamp.fromDate(new Date(pvm))` (doc-ID=pvm). Dry-run-first, idempotentti, batch ≤450.
  4. ⬜ **Deploy vartija VIIMEISENÄ** (kun kirjoittajat + migraatio valmiit) → regressio mahdoton.
- **Myöhemmin:** sama `aika`-kentälle (mentoroinnit, VP + tm_import) — oma vartija + writer-fix.

### A6. Repo-siivous
- Poista vanhat versiotiedostot: `TalentMaster_Master_v9.html`, `TalentMaster_Pelaaja_v3.html`
  (varmista ettei mikään HTML linkitä niitä).
- Yhdistä `tm_auth.js` + `tm-auth.js` (kaksi lähes identtistä nimeä = törmäysriski).
- **Pidemmällä:** poista versio tiedostonimestä → `master.html` + git-tagit/CHANGELOG hoitavat version.

**Sprint 6 -DoD:** CI ajaa A2+A4 testit jokaisessa PR:ssä; A1+A5 indeksit/kentät yhtenäiset;
A3+A6 törmäykset purettu. Tämän jälkeen toinen kehittäjä voi tehdä PR:n rikkomatta tuotantoa hiljaa.

---

## OSA B — SaaS-skaalautuvuuden suunta

Järjestys = riippuvuusjärjestys. P1 rakentaa A:n päälle; P2 kaupallistaa P1:n.

### B1 (P1) — Frontend-arkkitehtuuri: monoliitista moduuleihin
**Ongelma:** 6 000-rivinen HTML/rooli (markup+CSS+JS yhdessä) → kaksi kehittäjää = merge-helvetti,
ei uudelleenkäyttöä, ei testattavuutta.
**Suunta:**
- Build-step (Vite) + komponentit. Aloita jakamalla jaettu logiikka (KPI-laskenta, auth, Firestore-
  wrapperit, design-tokenit) `src/lib/`-moduuleiksi, joita kaikki roolit importtaavat.
- Yksi design-system (CSS-muuttujat ovat jo olemassa → kerää komponenttikirjastoksi).
- Tavoite: roolinäkymä = ohut kuori + jaetut moduulit, ei 6 000 riviä copy-pastea.
- **Ei big-bang-rewrite** — strangler-pattern: uusi feature uutena moduulina, vanha kuoritaan vähitellen.

### B2 (P1) — Havainnoitavuus (observability)
**Ongelma:** koko tähänastinen bugihistoria = **hiljaisia epäonnistumisia** (index puuttui, kenttä väärin,
listener kuoli). Skaalassa et näe niitä lokeista.
**Suunta:**
- Virheseuranta (Sentry tms.) → client-virheet + Cloud Functions -virheet keskitettyyn näkymään.
- Strukturoitu CF-lokitus + hälytykset (esim. epäonnistuneet kutsut, Rules-deny-piikit).
- Käyttöanalytiikka: mitkä ominaisuudet ovat oikeasti käytössä (priorisointi dataohjatusti).
- Linkki muistiin: *[silent-failure-anti-pattern-kirjaukset]* — sama periaate koko järjestelmään:
  älä niele virhettä, tee se näkyväksi (käyttäjälle toast, kehittäjälle Sentry).

### B3 (P1) — Tenant-elinkaari & self-service onboarding
**Ongelma:** uuden seuran lisäys on nyt käsityötä (datasyöttö, kutsut, roolit).
**Suunta:**
- Provisiointi-flow: seura-admin perustaa seuran → joukkueet → kutsuu valmentajat → massakutsu
  vanhemmille (massakutsu-pohja on jo) ilman kehittäjän käsiä.
- Rooli-/oikeushallinnan UI (custom claims hallittavissa tuotteesta, ei Consolesta).
- Tenant-eristyksen kovennus: A4-Rules-testit per tenant, varmista ettei cross-tenant-vuotoja.

### B4 (P0 compliance, P1 tuotteistus) — Tietosuoja & GDPR
**Tämä on sekä suurin riski että kilpailuetu:** käsittelette **alaikäisten** urheilu- ja
suorituskykydataa EU:ssa. Tämä on lainsäädännöllinen skaalautuvuusakseli — ilman sitä et voi myydä
laajemmin.
**Suunta:**
- Suostumushallinta on jo olemassa (`suostumusTila`, Rekisteröinti_Suostumus.html, vahvistaSuostumus)
  → laajenna: peruutus, versiointi, audit.
- **Retention-politiikka:** kuinka kauan dataa säilytetään, automaattinen poisto.
- **Oikeus tulla unohdetuksi:** CF joka poistaa pelaajan + huoltajan datan kaikkialta (Auth + Firestore).
- Audit-loki (on jo osin: `testipvm_korjattu` ym.) → kattava muutosloki arkaluontoiseen dataan.
- Field-level Rules-validointi (esim. valmentaja ei voi muuttaa omaa `rooli`-kenttäänsä — vrt.
  CLAUDE.md huomio kayttajat-self-updatesta).
- DPA:t (data processing agreements) seurojen kanssa.

### B5 (P2) — Suorituskyky & kustannus
**Ongelma:** Firestore-luvut maksavat per-dokumentti; limit-ikkuna-kompromissit (A1) eivät skaalaa.
**Suunta:**
- Denormalisointi-/aggregaatti-strategia (esim. valmentaja-KPI:t esilaskettuna, ei query-loop).
- Bundle-koon hallinta (B1:n build-step mahdollistaa tree-shakingin).
- Välimuisti + offline (service workerit `sw_pelaaja.js`/`sw_vanhempi.js` ovat jo olemassa → hyödynnä).
- Firestore-luku-budjetin monitorointi (B2).

### B6 (P2) — Datamallin evoluutio
**Suunta:**
- Schema-versiointi + migraatio-CF:t (nyt kenttiä lisätään ad hoc → tyyppiristiriidat kuten A5).
- Kanoninen datakartta koodissa (KPI_MASTER_ARCHITECTURE.md kuvaa, mutta ei pakota).
- Validointi kirjoituspisteissä (CF tai Rules) ettei vastaavia luotu-tyyppi-sotkuja synny.

### B7 (P2) — Tuotteistus & laajennettavuus
**Suunta:**
- White-label (seuran brändäys).
- Julkinen API / integraatiot (seurahallintajärjestelmät, kausijärjestelmät).
- AI-insight-kerros tuotteeksi (`tm_ai.js`, `tm_why_lauseet.js` ovat pohja) — automaattiset
  kehityssuositukset, "miksi"-selitykset valmentajalle/perheelle.

---

## Tiivistelmä — mihin suuntaan

| Vaihe | Fokus | Lopputulos |
|-------|-------|-----------|
| **Sprint 6 (P0)** | Tekninen velka: testit, indeksit, Rules-CI, törmäykset | Toinen kehittäjä voi osallistua turvallisesti |
| **P1** | Moduulit + observability + tenant-self-service + GDPR-perusta | Skaalautuva alusta, monta seuraa ilman käsityötä |
| **P2** | Suorituskyky + datamalli + tuotteistus | Kaupallinen SaaS: white-label, API, AI-insightit |

**Ydinviesti:** luuranko (multi-tenant data, server-authz, domain-logiikka) on oikea ja kantaa.
Skaalautuvan SaaSin este ei ole arkkitehtuurin perusvalinnat vaan **puuttuva insinöörikuri**:
testit, CI, index-as-code, observability ja GDPR-prosessit. Sprint 6 aloittaa tämän; P1 tekee siitä
alustan; P2 tuotteen.
