# Code-brief — P1: Pelihavainto (TM-malli) + tilanne + yksilölinkki

> **Lähde:** `docs/CODE_TASK_PELIHAVAINTO_TM_MALLI.md` (kattospec, päätökset §13 LUKITTU). Tämä brief rajaa toteutuksen
> **vain P1:een** (§11): TM:n oma "Pelihavainto"-työkalu (talteenotto uusiksi) + **yksilölinkki** (Kartta A) →
> teknis-taktinen jaksofokus. **EI pelipaikkafundamentteja (P2), EI joukkuelinkkiä/Silta 5.1 (P3), EI videota.**
> Kohde: **Master_v16** (talteenotto + yksilölinkki) + **VP_v25** (oversight, kevyt). Rakentuu olemassa olevan
> `havainnot`-kokoelman, `tm_arviointi_taksonomia.js`:n ja `tm_teknistaktiset.js`:n päälle. Moottoria ei muuteta.

## 0. Ydinperiaate — asiantuntijan valta (§1.1, ehdoton)
Järjestelmä **ehdottaa ja järjestää; valta on aina valmentajalla.** Jokainen ehdotus on ohitettavissa: valmentaja voi
(a) valita ehdotuksista, (b) **valita koko TM_TT_YOUTH-listasta** ehdotuksen ohi, (c) muokata cue/koe, (d) olla
asettamatta mitään. **Mikään ei tapahdu automaattisesti.** Ehdotus näyttää aina *miksi* (mistä taksonomia-avaimesta).

## 1. Talteenotto — TM "Pelihavainto" (Master, korvaa Palloliitto-esittelymallin)
- **Työkalun nimi UI:ssa "Pelihavainto"** (ei "ADAR"). Kentät:
  - **Pelaaja** (konteksti).
  - **Tilanne** (pakollinen): Peli · Harjoitus · Turnaus · Muu. Peli → valinnainen `vastustaja` + `tilanne_pvm`.
  - **ADAR 1–5** (LUKITTU §13): **Havainnointi** (A) · **Päätöksenteko** (D) · **Toteutus** (Act) · **Reagointi** (R).
    Suomenkieliset nimet, asteikko 1–5 ankkurein (hae `TM_ARVIOINTI_ASTEIKKO` -tekstit, sama kieli kuin muu arviointi).
  - **Vapaa havainto** (teksti). ⚠ EI terveys-/vammatietoa (→ `terveys/`); UI-huomio.
  - **Tarkenna kohde (valinnainen dropdown, §13 Q4):** peliäly-taksonomia-avain — Ennakointi · Näkemys · Päätöksenteko ·
    Sijoittuminen · Peli paineessa · Ajoitus (+ puolustus: Puolustusennakointi · Puolustussijoittuminen · Prässi · Riistot…).
    Lista `tm_arviointi_taksonomia.js`:stä (dim D4, jo suomeksi). Tyhjä = johdetaan automaattisesti (kohta 2).
- **Tallennus `havainnot/{id}`:** `pisteet:{A,D,Act,R}` (1–5) · `tilanne` · `vapaa_havainto` · `taksonomia_valittu?` ·
  `taksonomia:[…]` (auto, kohta 2) · luotu/valmentajaUid/pelaajaId/seuraId. Offline-yhteensopiva jos capture on samassa polussa.

## 2. Taksonomia-kerros (olemassa, `tmAdarHavaittu`)
- Laske jokaiselle havainnolle taksonomia-avaimet: **`taksonomia_valittu`** jos annettu, muuten `tmAdarHavaittu(pisteet)`
  (`ADAR_HAVAITTU_MAP`: a→anticipation/vision, d→decision_making, ac→play_under_pressure, r→positioning). Tallenna
  `taksonomia[]`. Tämä on yksilölinkin (ja myöhemmin P2/P3) yhteinen avain.

## 3. Pikakentät (§26 — ei render-kyselyä)
- Päivitä `paivitaAdarPikakentat` **1–5:een**: `adar_viimeisin={yht,…}` (1–5), `adar_havaintoja`, `adar_pvm`,
  vahvin/heikoin dimensio. **Lisää `adar_tilanne_jakauma`** (peli vs harjoitus -lkm). **Asteikkomigraatio:** kertaajo
  `pisteet ÷2` (pyöristä) olemassa olevaan dataan TAI normalisoi lukuvaiheessa — tee ennen 1–5-datan kertymistä.

## 4. PURE-lib `lib/tm_pelialy_yksilo.js` (§34 — dual-export, Vitest, EI window/DOM/Firestore)
- `tmPelialyYksiloEhdota(taksonomiaAvaimet, ctx)` → top-3 `TM_TT_YOUTH`-teemaa (Kartta A). Ehdotus, ei pakko.
  - `taksonomiaAvaimet`: `['anticipation',…]` (havainnon `taksonomia`-kenttä).
  - `ctx`: `sallitutKonseptit` (ika/vaihe-gating, `tmTtItems`) · `konseptiNimi(avain)→nimi` (oletus TM_TT_YOUTH-nimi).
  - **Kartta A (LUKITTU §13):** Ennakointi→y_h0/y_h6/y_p3 · Näkemys→y_h0/y_h8/y_h6 · Päätöksenteko→y_h2/y_h3/y_h8 ·
    Sijoittuminen→y_h7/y_p2/y_p3 · Ajoitus→y_h7/y_h8 · Peli paineessa→y_h1/y_h5 (raja D2, myös V5-silta) ·
    Puolustusavaimet→y_p1/y_p2/y_p3/y_p4. Perustaito ensin tasapelissä (kuten V5).
  - Palauta `{konsepti_avain, konsepti_nimi, taksonomia_avain, syy}`. Tyhjä = graceful.
- **Asiantuntijan valta:** lib palauttaa top-3, mutta **UI tarjoaa aina "Näytä kaikki teemat"** → koko `tmTtItems`-lista
  valittavaksi ehdotuksen ohi (§0).

## 5. Yksilölinkki UI (Master) + jaksofokus
- Pelihavainnon tallennuksen jälkeen: **"Ehdota yksilöteema"** → `tmPelialyYksiloEhdota` top-3 (syy näkyvissä) +
  "Näytä kaikki". Valinta → aseta **jaksofokus** `{domeeni:'teknis_taktinen', konsepti:{avain,nimi}, cue, koe,
  lahde:'pelihavainto', lahtotaso:{pisteet, heikoin_dim, taksonomia}, alkoi}`. cue/koe **`tmTtPelaaja(avain)`**
  (otsikko/mika/miksi/cue/koe — pelaajaturvallinen). Sama sulku/historia kuin V6 (moottori ei muutu).
- Valmentaja voi asettaa 0–1 yksilöteemaa per havainto (P1). Ei pakoteta.

## 6. VP oversight (kevyt)
- VP näkee pelihavainnot + yksilöfokukset osana olemassa olevaa Jaksofokus-työkalua (domeeni `teknis_taktinen`).
  Pelihavainto-lähde pelaajaraportissa näyttää tilanne-jakauman ("n ottelusta, m harjoituksesta"). Ei uutta näkymää.

## 7. Rajaus (EI P1:ssä)
- **P2 — pelipaikkafundamentit (14+):** Kartta B, `domeeni:'pelipaikka'`. Oma brief.
- **P3 — joukkuelinkki (Silta 5.1):** Kartta C, `TM_TT_JOUKKUE`, ryhmäaggregointi. Oma brief (`CODE_TASK_SILTA_5_1_PELIALY.md`).
- **Video/evidenssi + kalenteri-tilanne + AI** — myöhempiä (raskas GDPR videolle).

## 8. Roolit + Rules + GDPR
- **Ei uutta kokoelmaa:** `havainnot` (rules olemassa) + `jaksofokus`-kenttä (rules olemassa V6). Uudet kentät
  (`tilanne`, `taksonomia`, `taksonomia_valittu`, `linkki_yksilo`) ovat `havainnot`-dokin sisällä → **varmista ettei
  write-validointi hylkää niitä**; rules-header bump + Console-deploy vain jos kenttävalidointi sitä vaatii (kirjaa).
- Rules-testi emulaattorilla: valmentaja kirjoittaa pelihavainnon + yksilö-jaksofokuksen ✓ · toinen seura estetty ✓.
- **GDPR:** pelihavainto = subjektiivinen suoritusarvio, ei terveystietoa; vapaa havainto -huomio (kohta 1).

## 9. Verifiointi + DoD
- **Vitest:** `tm_pelialy_yksilo.js` (Kartta A: kukin taksonomia-avain → oikea teema-shortlist; tyhjä→graceful;
  sallitutKonseptit-gating; perustaito tasapelissä) · `tmAdarHavaittu` regressio (1–5) · asteikkomigraatio ÷2.
- **Rules emulaattorilla:** uudet kentät + jaksofokus kirjoittuu, toinen seura estetty.
- **Live Master+VP:** tee pelihavainto (tilanne=Peli, ADAR 1–5, dropdown-tarkennus) → auto-taksonomia näkyy →
  "Ehdota yksilöteema" top-3 + "Näytä kaikki" → aseta teema → jaksofokus syntyy (domeeni teknis_taktinen) → sulku →
  delta. **Asiantuntijan valta:** valitse listasta ehdotuksen ohi → toimii. Vanha 1–10-data migratoitu 1–5. 0 konsolivirhettä.
- `npm test` + lint + selain-tarkistus. Rules-deploy kirjattu jos tehty. **Merge vasta kun Tero sanoo "live".** Branch `feat/pelihavainto-p1`.

## 10. Työjärjestys Codelle
1. `lib/tm_pelialy_yksilo.js` (PURE, Kartta A) + Vitest.
2. Asteikkomigraatio 1–10→1–5 + `paivitaAdarPikakentat` (1–5, tilanne_jakauma) + `tmAdarHavaittu`-kytkentä.
3. "Pelihavainto"-talteenotto Master (tilanne, ADAR 1–5 suomeksi, vapaa, taksonomia-dropdown) → `havainnot`-tallennus.
4. Yksilölinkki-UI (ehdota top-3 + "Näytä kaikki") → jaksofokus (domeeni teknis_taktinen, cue/koe tmTtPelaaja).
5. VP oversight kevyt (tilanne-jakauma raporttiin).
6. Rules-varmistus + emulaattoritesti. Verifiointi §9 → raportoi git + emulaattori + selain (ei "valmis" ilman koodia).
