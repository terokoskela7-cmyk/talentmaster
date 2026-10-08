# sv-läpiajo · luvut ennen reititystä (8.10.2026) — PR 1

Työkalu: `tools/i18n/sv_lapiajo.mjs` (Playwright, headless Chromium). Tulos: `docs/i18n/sv_lapiajo_tulos.json` (näkymä · teksti · DOM-polku · lähde tiedosto:rivi). Baseline: `tools/i18n/sv_lapiajo_baseline.json`.
Ajo: `node tools/i18n/sv_lapiajo.mjs` (paikallisesti `TM_CHROME_PATH=<chrome>`; CI: `google-chrome`). **Mittaus ei koske tuotantoa**: kukin sovellus ajetaan omalla sisäänrakennetulla demo-datallaan (`demoMode()` · `loginDemo()` · `demoKirjaudu('aleksi')` · `?demo=1`), kieli `tm_kieli=sv`.

## Luvut (uniikit suomenkieliset tekstit per sovellus, 64 näkymää)

| Sovellus | Uniikkeja | UI (löytyy lähteestä) | data? | UI: tunnettu fi-merkkijono, **sv-rivi on jo kartassa → pelkkä reititys** | UI: tunnettu fi, sv-rivi puuttuu | UI: vain heuristiikka (ei missään kartassa → **tarvitsee sv:n Geminiltä**) |
|---|---:|---:|---:|---:|---:|---:|
| Pelaaja | 162 | 150 | 12 | 54 | 0 | 96 |
| Vanhempi | 30 | 18 | 12 | 8 | 0 | 10 |
| Master | 109 | 83 | 26 | 73 | 0 | 10 |
| VP | 37 | 31 | 6 | 24 | 0 | 7 |
| Seura (vain kirjautuminen) | 6 | 6 | 0 | 5 | 0 | 1 |
| ADAR Pikakortti | 9 | 8 | 1 | 2 | 0 | 6 |
| Pelihavainto_Kentta | 5 | 5 | 0 | 2 | 0 | 3 |
| **Yhteensä** | **358** | **301** | **57** | **168** | **0** | **133** |

Esiintymiä (sama teksti usealla näkymällä) 822. "data?" = teksti ei löydy lähdekoodista literaalina → todennäköisesti demo-/seuran data tai dynaaminen (D16: ei käännetä); lopullisen rajauksen tekee Tero/PM. Lähteen jakauma (UI): Pelaaja_v7 149 · Master_v16 81 · VP_v25 26 · Vanhempi_v2 17 · ADAR 8 · Seura 6 · Pelihavainto_Kentta 5; lib/: `tm_pelihavainto_valinta.js` 6, muut 3.

**Tulkinta:** 168 UI-tekstiä on pelkkä reititysbugi (käännös on jo `vpT`/`masterT`/tm_lang/lib-kartassa, mutta kovakoodattu teksti ei kulje sen kautta). ~133 tarvitsee uuden sv:n (Gemini-erä 2). Painopiste on Pelaaja (150 UI, joista 96 ei missään kartassa): perheiden näkymät ensin.

Löydös VP:stä: demo-sisäänkäynti `demoMode()` ei aja `vpLokalisoi()`-sweepiä → ilman sitä VP:n sivupalkki ja yläpalkki jäävät suomeksi (144 → 37 tekstiä sen jälkeen). Työkalu ajaa sweepin kuten oikea kirjautumispolku (`lokalisoi`-kenttä sovelluksen määrityksessä). **Tarkista oikea kirjautumispolku:** ajaako se sweepin varmasti kaikissa tapauksissa (seuran kieli → sv automaattisesti)? Tämä on yksi kohta jota demo ei todista.

## Mitä läpiajo EI vielä kata (rajaus raportoitava)
- **Kirjautumista vaativat näkymät oikealla datalla**: Seura (rosteri, käyttäjät — "EI demodataa"), Vanhemman oikea koti/kalenteri/klippi, Pelaajan kalenteri oikeilla tapahtumilla, Pelaajan Minä-ryhmät niiltä osin kuin demo-data ne piilottaa (tyhjä osio piiloon), Masterin/VP:n datariippuvaiset sisällöt. Vaatii fixtuurimoodin (Firebase-emulaattori + siemendata) — ehdotan **PR 1b**:ksi. Brief viittasi "olemassa olevaan chrome-tests-asetelmaan": sellaista ei ole sovellusten käynnistykseen; `chrome-tests` ajaa vain `tm_kentta`-komponentin.
- **Toastit/modaalit**, jotka vaativat kirjoituksen. Avattavat modaalit (VP: harjoitusarviointi, ADAR-kenttätyökalu, Bio-banding, Kaaviopankki, ohjelmakirjasto; Master: Kaaviopankki, harjoitusarviointi, valmentajan kehitys) ajettiin, mutta ne eivät toistaiseksi lisää näkyviä tekstejä → avaus vaatii tarkennuksen (PR 1b).
- Masterin alinäkymät (Testit: Kirjaa kentällä, Pikakirjaus; Tekniikkakisat; Ottelutarkkailut sisältö), VP:n harjoitettavuusarviointi ja Testit-alivälilehdet: mukana vain, jos näkyvät päänäkymässä. Alinavigaatio (`avaa*/show*/…`) ajetaan automaattisesti, mutta sisältö riippuu demo-datasta.
- Tunnistin on **alaraja**: heuristiikka ei löydä esim. "Tekniikkakisat"-tyyppisiä uusia yhdyssanoja, ellei tunnettua vartaloa tai fi-karttaa ole.

## Teron löydökset: selvitys
| Löydös | Selvitys |
|---|---|
| Vanhempi: "Harjoitus – nopeus klo 17" | Ilmoitusteksti kootaan **palvelimella** (`functions/kalenteri_notif.js`) suomeksi ja **tallennetaan valmiina merkkijonona** (`teksti`): `'Huomenna: ' + nimi + ' klo HH:MM · paikka'`, `'Peruttu: ' + nimi`, `'Muutos: ' + nimi + ' → klo …'`. Tapahtuman **nimi** (esim. "Harjoitus – nopeus") on valmentajan kirjoittama data (D16, ei käännetä). "Huomenna:", "Peruttu:", "Muutos:", "klo" ovat UI-tekstiä, jonka asiakas ei voi kääntää jälkikäteen. Korjausvaihtoehdot: (A) tallenna rakenteisena (`tyyppi`, `nimi`, `alkaa`, `paikka`) ja kokoa teksti asiakkaassa `T()`:llä; (B) palvelin kokoaa seuran kielellä (`seurat/{sid}.kieli`). Suositus A (myös oikea päivämäärä-/kellonaikamuoto asiakkaassa). Vaatii functions-muutoksen + Rules/UI-muutoksen — oma PR, Teron päätös. |
| VP: "spelobservation väärässä kohdassa" | Kartoissa `Spelobservation` on `Pelihavainto`-perheen käännös (tm_master_i18n 983 `Pelihavainto`, 32 `◎ pelihavainto`, tm_vp_i18n 29–51 jne.). Etsin sv-rivit, joissa on spelobserv-/matchobserv-sana mutta fi-avain ei ole havainto-/tarkkailu-sanaa: **ei yhtään** — ristiinkäännöstä ei löydy kartoista. Todennäköinen syy on se, että fi-sana *Pelihavainto* on käytössä kahdessa merkityksessä (ADAR-kenttätyökalu vs. ottelun aikainen kirjaus/Ottelutarkkailut). **Tarvitsen Teron: mikä ruutu/teksti** (kuvakaappaus tai näkymä + napin teksti), niin raportoin rivin ja kontekstin; korjaus Gemini-erässä (termistöpäätös: Pelihavainto / Otteluhavainnointi / Ottelutarkkailu). |
| Master: curriculum | Sidecar (`TM_TT_SV`) on kytketty VP:hen (`_ttSv`), ei Masteriin → PR n (Master). |
| Master/VP: "ALOITA JAKSO" | `tmJaksoTila` (`lib/tm_aloita_jakso.js`) palauttaa kovakoodatut `teksti`-literaalit → reititys kirjaston FI-kartan kautta (PR n). Huom: sama funktio lasketaan palvelimella S1:ssä; avaimet eivät saa muuttaa `tila`-arvoja. |

## Excel-pohjat (raportti, Tero päättää)
Pohjat generoidaan `TalentMaster_Excel_Tuonti.html`:ssä (`generoiExcelPohja`, `pohjaSarakkeet`, `?lataa=<protokolla>`); sarakeotsikot ovat tuonnin avaimia (`_pohjaHeaderMap`, §7.19). Vaihtoehdot: **(1)** pohjaan sv-ohjerivi tai -välilehti (otsikot pysyvät fi:nä) — pieni, ei riko tuontia; **(2)** tuonti hyväksyy sekä fi- että sv-otsikot alias-taulun kautta, ja pohja generoidaan seuran kielellä — siistein, mutta vaatii `_pohjaHeaderMap`-muutoksen ja testit jokaiselle protokollalle. Suositus: (1) 1.11. mennessä, (2) myöhemmin.

## Seuraavat PR:t (ehdotus, järjestys brieffin mukaan)
1. **PR 1 (tämä)**: läpiajo + luvut + baseline + CI-raportti.
2. **PR 1b**: fixtuurimoodi (emulaattori/siemendata) autentikoiduille näkymille ja modaalien avaus; laajentaa baselinen.
3. **PR 2 — perheet**: Pelaaja (150 UI: Minä-ryhmien otsikot, Tänään, kortti, ilmoitukset…) ja Vanhempi (18); `TM_ADAR_NIMET`; ilmoitusteksti (A/B yllä).
4. **PR 3 — Master**: jakso (`tmJaksoTila`), curriculum-sidecar, Tänään-demosisältö, kalenteri, säsong/träningsplan, tekniikkakisat, oma arviointi.
5. **PR 4 — VP** + Seura + ADAR Pikakortti (`PH_TEKSTIT` → kirjastokartta; bundler-template §7.10) + Pelihavainto_Kentta.
6. **Gemini-erä 2** (`docs/i18n/sv_kaannoserae_2.json`) kootaan PR 2–4:n uusista avaimista + #892:n jäännökset (ts_otsikko, Förening, Kehityskaari (kausifokus), VP×Master 110 riviä) — viimeistään 20.10.
