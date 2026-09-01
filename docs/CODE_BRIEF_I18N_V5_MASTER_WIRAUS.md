# Code-brief — i18n VAIHE 5 · **RAITA B: Valmentaja (Master_v16) sv-wiraus commonin päälle**

> **Konteksti:** Jaettu `lib/tm_i18n_common.js` (Vaihe 0/0.1) on käytössä ja verifioitu. Kimin **Master-kartta on valmis,
> kanonin mukainen ja repossa:** `docs/MASTER_SV_KAANNOSMUISTI.json` (1194 avainta, JSON validi, 0 kiellettyä
> glossaari-varianttia, lajitermit kanonissa) + `docs/MASTER_SV_RISKILISTA.md` (dual-use + dynaamiset templatet).
> Master_v16 = **0 reititystä** tällä hetkellä (lataa vain `tm_lang.js?v=1`, 9792 riviä, 11 työtilaa). **Tämä PR wiraa sen
> commonin päälle** — sama malli kuin VP, mutta kartta on jo olemassa (kevyempi kuin VP:n vaiheistus).
>
> **EI tässä:** Seura-wiraus (Raita C, oma brief). lib-sisällön käännös (§7 alla). Pelaaja/Vanhempi = jo sv (getter).

---

## Arkkitehtuuri (sama kuin VP)
1. **Uusi `lib/tm_master_i18n.js`** = `var TM_MASTER_I18N = { sv: {fi→sv}, en: {} }` — rakennettu
   `docs/MASTER_SV_KAANNOSMUISTI.json`:sta. Getterit:
   ```js
   function masterT(fi){ return (typeof tmI18nResolve==='function') ? tmI18nResolve(fi, TM_MASTER_I18N) : fi; }
   function masterLokalisoi(root){ if(typeof tmLokalisoiCommon==='function') tmLokalisoiCommon(root, TM_MASTER_I18N); }
   ```
2. **Latausjärjestys Master-HTML:ssä:** `tm_lang.js` → **`tm_i18n_common.js?v=2`** → **`tm_master_i18n.js?v=1`** (common ENNEN sivukarttaa).
3. **Kieli-init:** Master on autentikoitu (seuraId) → sama kuin VP: `seura.kieli` → `tmKieliInitSeura(...)` (guardattu). Kielivalitsin topbariin/asetuksiin → `tmAsetaKieli(k,true)` + `masterLokalisoi()` + re-render aktiivinen ws.
4. **Reititys:** staattinen chrome (navi-labelit, otsikot, taulukko-otsikot, aina-näkyvä kehys) → **`data-i18n`** + `masterLokalisoi`-sweep. Dynaaminen JS-render (Inbox-kortit, kehitys-detailit, kalenteri, kirjaukset…) → **`masterT(fi)`**. (Sama static→data-i18n / dynamic→masterT -jako kuin VP V2.)

## Dedupe (C1-portti — PAKOLLINEN)
`docs/MASTER_SV_KAANNOSMUISTI.json`:ssa on **24 avainta jotka ovat jo commonissa** → **ÄLÄ kopioi niitä `tm_master_i18n.js`:iin** (C1-testi kaataa buildin). Ne resolvoituvat commonista. Näistä **2 poikkeaa Kimin arvosta → common voittaa** (ei toimenpidettä, drop riittää):
- `Talenttivalmentaja`: Kimi "Talenttränare" → **common "Talangtränare"** (kanoni)
- `Fysiikkavalmentaja`: Kimi "Fysisk tränare" → **common "Fystränare"** (kanoni)

Muut 22 (Spara/Avbryt/Spelare/Lag/Kalender/Logga ut/Sähköposti…) identtisiä → drop. **Lisää konsistenssitestiin C1 myös `TM_MASTER_I18N ∩ TM_I18N_COMMON = ∅`** (sama kuin VP-kartalle).

## Riskilistan käsittely (`docs/MASTER_SV_RISKILISTA.md` — noudata tarkasti)
- **§1 enum-arvot raakana** (`tila` rivi 8520, IDP-status-fallback 6365, RSVP 8667–8669): **display-mappi renderissä**, EI data-i18n:iä raakaan enumiin. Tunnetut tilat käännetään kartasta ("● Aktiivinen"→"● Aktiv"), tuntematon fallback (`_mEsc(st)`) jää fi:ksi (turvallinen).
- **§5.1 CASE-SENSITIIVISYYS (kriittinen):** kartassa on avaimia jotka eroavat enumista **vain kirjainkoolla** ("Kesken" vs `'kesken'`, "Saavutettu" vs `'saavutettu'`). Resolver/sweep on **eksakti täsmäys (case-sensitiivinen)** — ÄLÄ normalisoi pienaakkosiin. (Meidän `tmI18nResolve` täyttää tämän jo — älä lisää lowercase-logiikkaa.)
- **§5.2 split-tekstit** (rivi 3667 `Kuitatut löytyvät <b>Arkisto</b>-välilehdeltä`): ruotsin sanajärjestys ei toimi osa-korvauksilla → **koko lause yhtenä avaimena** (kartassa suositus: "Kvitterade finns i fliken <b>Arkiv</b>") tai `data-i18n-html` (V1.1-malli säilyttää `<b>`).
- **§6 dynaamiset templatet** (11 riviä + toast-vyöhykkeet 4606/6079/6429/7055/7895): interpoloidut → **koodi-i18n placeholder-templatella** (`masterT('{x}/{n} kirjasi RPE:n').replace(...)`), sv-suositukset riskilistan §6-taulukossa. Staattiset osat kartasta.

## ⛔ ÄLÄ reititä (riskilista §2–§3)
Kirjaustyypit `'T'/'D'/'S'/'P'` · cadence-**value**-attribuutit (`'kerran'/'viikoittain'/'2_viikottain'/'kuukausittain'` — näyttönimet OVAT kartassa) · poisto-scope `'vain'/'seuraavat'/'sarja'` · ilmoituskadenssi `'paivittain'/'viikoittain'` · `sukupuoli 'M'/'N'` · `lahde 'manuaalinen'/'catapult'/'polar'` · **testi-id:t** (lin_5m…pituuspotku) · **ws-avaimet** `setWs('koti'…'testit')` (data-ws) · pelipaikka-/joukkuenimet + roolistringit (Custom Claims) · demo-pelaajien nimet.
> Näyttö vs. avain: näyttönimet (Inbox/Idag/Puls/…, En gång/Varje vecka, Endast detta…) ovat kartassa; **value**-attribuutit ja Firestore-arvot pysyvät fi:nä.

## Tuotetermit — verbatim (§5)
`X-Factor` · `Hidden Gem` · `Underdog` — ennallaan (kartassa avain=arvo). Indeksilyhenteet TKI/H-H/TSI/PHV/D1–D5/RAE/FLEI ennallaan.

## ⚠️ lib-riippuvuus (riskilista §7) — RAJAUS, EI tässä PR:ssä
Osa Masterin näkyvästä tekstistä tulee **lib-tiedostoista** (`tm_eerikkila_normit`, `tm_teknistaktiset` ym. — valmennussisältö/curriculum). Kimi käänsi ne erikseen `lib_sv/`-**forkkina**. **ME EMME ADOPTOI `lib_sv/`-forkkia** (getter-arkkitehtuuri: yksi lib-kansio, ei fi/sv-haaraa — README:n "eri kansio per kieli" on forkkimalli jonka hylkäsimme). Master-UI-wiraus (tämä PR) kattaa vain `MASTER_SV_KAANNOSMUISTI.json`:n UI-stringit. **Lib-sisällön sv (curriculum-teksti) on erillinen myöhempi kysymys** — jätä lib-lähtöinen teksti fi:ksi tässä PR:ssä, älä kytke lib_sv:hen. Merkitse jäljelle jäävä lib-teksti tiedoksi; suunnittelemme lib-sisällön getter-kerroksen omana vaiheena.

## Cache-bust (§27.4)
- Uusi `tm_master_i18n.js?v=1` + `tm_i18n_common.js?v=2` Master-HTML:ään. Master-HTML muuttuu (data-i18n-tagit + getter-kytkentä) → APP_VERSION/version.json auto-bump mainissa (§33). Master:lla ei omaa SW:tä.

## Phasing (Code valitsee)
Kartta on valmis → wiraus on mekaanista. **Suositus: yksi PR** jos hallittavissa; jos verifiointi paisuu, **jaa kahtia**: (B1) infra + kieli-init + aina-näkyvä chrome (navi/topbar/login) + staattiset otsikot; (B2) 11 työtilan dynaaminen render-reititys. C1-portti + glossaari pätevät molempiin.

## DoD
- Master lataa common + `tm_master_i18n.js`; `masterT`/`masterLokalisoi` delegoivat commoniin; **Master∩common=∅** (C1).
- Staattinen chrome data-i18n + dynaamiset renderit masterT; enum-display-mapit (§1); dynaamiset templatet (§6); split-tekstit (§5.2).
- Glossaari commonista kanonisena (Kroppslig beredskap/Slalom/Passning/Utvecklingsansvarig). Tuotetermit verbatim. lib-teksti jää fi (§7-rajaus).
- fi-regressio ehjä. Vitest: C1 Master-kartalle + Master-avainkattavuus + fi-fallback. `npm run lint` EXIT 0.

## Verifiointi (Claude — 4-kerrosportti + portit)
1. Kielineutraali gate Master-työtiloista → 0 reitittämätöntä näkyvää (paitsi §7 lib-teksti + §1 tuntematon-enum-fallback = tietoiset fi-jäänteet).
2. Live fi/sv render-diffi (injektoitu seura.kieli='sv'): navi + Inbox + Kehitys + Kalenteri + Testit molemmilla kielillä.
3. Toast/alert/confirm-audit (dynaamiset templatet §6).
4. **C1 + glossaari-portti:** Master∩common=∅, 0 kiellettyä varianttia; `masterT` sv-todiste (Kehon valmius→Kroppslig beredskap commonista; roolit kanonissa Talangtränare/Fystränare).
