# Code-brief — I1: Pelihavainto-kaanon (ADAR-pikakortti) + P1:n 1–5-siivous

> **Lähde:** `docs/CODE_TASK_PELIHAVAINTO_INTEGROINTI_A.md` (päätös A) + `docs/ANALYYSI_PELIHAVAINTO_P1_VS_PIKAKORTTI.md`.
> Tämä brief kattaa **I1:n**: tee **ADAR-pikakortti** kaanoniseksi pelihavaintotyökaluksi (1–3, ikävaiheistettu),
> upota se Masteriin, **poista P1:n 1–5-talteenotto**, migratoi 1–5-testidata, ja varmista että Peli-välilehti +
> arviointi + IDP lukevat 1–3-datan oikein (korjaa nykyinen "Reaction 4/3 · kokonais 3/12" -bugi). **EI IDP-siltaa näkyväksi
> (I2), EI harjoitussisältöä (I3).** Kohde: **Master_v16** + **TalentMaster_ADAR_Pikakortti.html** + Peli-välilehti (VP_v25 /
> Pelaaja_v7). Ei uutta mallia — pikakortti + downstream ovat jo olemassa 1–3:lle; tämä poistaa konfliktin ja viimeistelee upotuksen.

## 0. Miksi — konteksti (auditointi)
`havainnot`-kokoelmaan kirjoittaa kaksi mallia: **pikakortti (1–3, ikävaiheistettu)** ja **P1 (1–5)**. Downstream
(arviointi `tmAdarHavaittu`, Peli-välilehti `/12`, IDP `idpKeraaKandidaatit` ≤2-kynnys) on rakennettu **1–3:lle** →
P1:n 1–5 rikkoo sen (Reaction 4/3). Master `openDrill('adar')` (n. rivi 8462) kutsuu nyt P1:n `_pelihavaintoModal`ia;
kommentti "korvaa Pikakortti-launcherin". **I1 palauttaa pikakortin kaanoniksi.**

## 0.1 VERIFIOITU (de-riskaus 2026-07-10) — muoto + upotus todettu koodista
- **`adar_viimeisin`-muoto täsmää kaikki lukijat.** Pikakortti kirjoittaa `adar_viimeisin: { a, d, ac, r, yht, pvm }`
  (+ `adar_pvm, adar_havaintoja, adar_vahvin, adar_heikoin`). Lukijat: **`tmAdarHavaittu`** lukee `a/d/ac/r` (pienet) →
  arviointi + IDP; **Peli-välilehti/raportti** lukevat `adar_viimeisin.yht`. **Kaikki rakennettu pikakortin muodolle** →
  P1:n `pisteet:{A,D,Act,R}` (isot, 1–5) oli poikkeama. **⇒ Kaanon-suunta vahvistettu koodista, ei oletus.**
- **Upotus toimii.** Pikakortti sisältää sekä oman `initializeApp`/`apiKey`in ETTÄ lukee `window._tmDB/_tmAuth/_tmSeuraId`
  → toimii sekä standalone että upotettuna. Iframe + kontekstin välitys Masterista on tuettu.
- **Arviointi jo himmentää ADAR-lähteen** (`onAdar` → ei V5-väriä vaan ink3 + badge) → 1–3-arvo EI näy väärin
  värikoodattuna arviointiriveillä. **Ainoa 1–5-skaalan näyttökorjaus jää 5D-radariin** (§3).
- **Jäljellä Coden vahvistettavaksi (matala riski):** iframe-auth-jako (oma init vs jaettu), P1:n isokirjain-datan migraatio (§5),
  Peli-välilehden ikävaihe-tietoisuus (§4, oikeaa työtä ei riski).

## 1. Pikakortti kaanoniksi + upotus Masteriin
- **`openDrill('adar')`** (Master ~8462): reititä **ADAR-pikakorttiin**, EI `_pelihavaintoModal`iin.
- **Mekanismi (pikakortti on jo tähän suunniteltu):** upota `TalentMaster_ADAR_Pikakortti.html` **iframeen** Havainnot-
  drill-paneeliin. Master **injektoi** iframen ikkunaan `_tmDB` (Firestore), `_tmAuth`, `_tmSeuraId` (pikakortti lukee juuri
  näitä globaaleja) + **aktiivisen pelaajan** (esivalinta, ettei valmentaja valitse uudelleen). Master **kuuntelee**
  `window.postMessage('tm:adar:saved')` → sulje paneeli + päivitä pelaajan tila/lista.
- **Pikasyöttö näkyviin oletuksena** (pelaaja → ADAR-osa → 1–3 = 3 klik). Taso valikoituu iän mukaan (U8–U12 vain Assess,
  U13–U15 A·D·Act, U16–U19 täysi) — jo pikakortissa. Ei seura-valintaporttia upotettuna (konteksti tulee Masterista).
- **Offline** (IndexedDB-jono) säilyy — älä riko.

## 2. Poista P1:n 1–5-talteenotto (yksi malli havainnot-kokoelmaan)
- Poista/jäädytä `_pelihavaintoModal` (Master ~8552) + sen 1–5-tila (`window._phTila`, pisteet 1–5) ja tallennus
  (`malli:'tm_pelihavainto'`, pisteet 1–5). Ei enää kahta pelihavaintomallia.
- Säilytä P1:n **downstream-libit** (`tm_pelialy_yksilo`, `tmAdarHavaittu`) — niitä käytetään I2/I3:ssa; sovita 1–3 (kohta 3).
- **Huom:** P1:n `taksonomia_valittu` / tilanne / vapaa_havainto -kentät — pikakortissa on omat vastineet (tilanne, pelivaihe,
  narratiivi/reflektio). Älä yritä ylläpitää molempia skeemoja; pikakortin skeema on kaanon.

## 3. Asteikko 1–3 — §7 LUKITTU (Tero)
- **ADAR pysyy omalla 1–3-asteikollaan** (Kehitettävää/Kehittyvä/Hallitsee). **EI muunnosta 1–5-taksonomiaan.** Arviointi
  erottelee lähteet jo (mitattu/havaittu/pelihavainto) → pelihavainto näkyy omana 1–3-merkintänään.
- **`tmAdarHavaittu`:** varmista että se tulkitsee `adar_viimeisin` **1–3**-arvot oikein (arvo ≤2 = kehityskohde → IDP-kandidaatti;
  arvo 3 = hallitsee → ei). Poista P1:n 1–5-oletukset (jos libissä on kynnys 5:lle).
- **5D-radar (kriittinen näyttödetalji):** koska D4 (peliäly) on 1–3 ja muut dimensiot 1–5, **normalisoi radar per dimensio
  näyttöä varten** (esim. arvo/max → 0–1) ettei peliäly näytä visuaalisesti matalammalta kuin on. Arvo säilyy 1–3 datassa;
  vain visualisointi suhteutetaan. Koskee VP + Pelaaja + Master 5D-radaria.

## 4. Peli-välilehti + arviointi + IDP lukevat 1–3 oikein
- **Peli-välilehti** (VP_v25 / Pelaaja_v7, "Awareness/Decision/Action/Reaction · Pelihavainto kokonais /12"): kun data on
  1–3, `/3` per dimensio ja kokonais `/N` (N = tason osamäärä × 3) ovat oikein. **Korjaa nykyinen bugi:** varmista ettei
  arvo ylitä nimittäjää (4/3) ja että kokonais laskee summan oikein (nyt 3/12 väärin). **Ikävaihetietoisuus:** näytä vain
  kyseisen tason osat (U13 = 3 osaa /9, ei 4 osaa /12). Käytä pelaajan ikää tason valintaan (tmTtVaihe / ikäluokka).
- **Arviointi:** `tmAdarHavaittu(adar_viimeisin)` → D4-lähde 1–3-merkinnällä. Toimii kun asteikko yhtenäinen.
- **IDP:** `idpKeraaKandidaatit` ≤2-kynnys toimii sellaisenaan 1–3:lla (ei muutosta). (Näkyvä IDP-silta = I2.)

## 5. Migraatio + siivous
- P1:n 1–5-testihavainnot (minimaalinen määrä, esim. Topias Koskela) → **poista tai skaalaa** `pisteet ÷2`-tyyppisesti
  1–3:een. Tehdään kertaajona ennen kaanonin käyttöönottoa (ei jätetä sekadataa).
- **`adar_viimeisin` yksi muoto:** varmista että pikakortin kirjoittama rakenne (yht + per-dim) on se jota arviointi +
  Peli-välilehti + IDP lukevat. Yhtenäistä jos P1 kirjoitti eri muodon.

## 6. Rajaus (EI I1:ssä)
- **IDP-silta näkyväksi** ("Tee tästä IDP-tavoite" + IDP-kortin lähdemerkintä) → **I2**.
- **Harjoitussisältö** (`tm_pelialy_yksilo` 1–3 → teknis-taktinen teema IDP-tavoitteelle) → **I3**.
- **Sisällön laajennus** (uudet KPI:t/pelipaikat) → valmentajakoulutus (`ADAR_Koulutus`), ei koodi.
- Pikakortin oma iso refaktorointi → ei.

## 7. Verifiointi + DoD
- **Live (Master):** `openDrill('adar')` → pikakortti aukeaa iframessa, pelaaja esivalittu, seura-konteksti tulee Masterista
  (ei erillistä porttia) → **pikasyöttö 3 klik** → tallennus → paneeli sulkeutuu (`tm:adar:saved`) → pelaajan tila päivittyy.
- **Peli-välilehti:** sama pelaaja → ADAR-osat näkyvät oikein **1–3** (ei 4/3), kokonais oikein (ei 3/12), vain ikätason osat
  (U13 → /9). **5D-radar normalisoitu** (peliäly ei näytä matalalta).
- **Arviointi:** pelihavainto näkyy D4-lähteenä 1–3. **IDP:** ADAR ≤2 → kandidaatti syntyy (`idpKeraaKandidaatit`).
- **Ikävaihe:** U8–U12-pelaaja → pikakortti näyttää vain Assess. **Offline:** kirjaus ilman verkkoa → synkkaa kun palaa.
- **Siivous:** P1:n `_pelihavaintoModal` ei enää tavoitettavissa; 1–5-testidata migratoitu.
- `npm test` + lint + selain-tarkistus. Rules: ei muutosta (sama havainnot-kokoelma). **Merge vasta kun Tero sanoo "live".**
  Branch `feat/pelihavainto-i1-kaanon`.

## 8. Työjärjestys Codelle
1. Reititä `openDrill('adar')` pikakorttiin (iframe + konteksti-injektio `_tmDB/_tmAuth/_tmSeuraId` + pelaaja + `tm:adar:saved`-kuuntelu).
2. Poista P1:n `_pelihavaintoModal` + 1–5-tila/tallennus.
3. Migratoi 1–5-testidata → 1–3; yhtenäistä `adar_viimeisin`-muoto.
4. `tmAdarHavaittu` 1–3-tulkinta; poista 1–5-oletukset.
5. Peli-välilehti: 1–3 + ikätaso-osat + kokonais-korjaus. 5D-radar per-dimensio-normalisointi.
6. Verifiointi §7 → raportoi git + emulaattori + selain (ei "valmis" ilman koodia).
