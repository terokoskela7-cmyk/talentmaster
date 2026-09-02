# Code-brief — i18n V5 · RAITA B · **B2 Pari C: Master_v16 — renderTestit (Tester) + renderCal (Kalender) sv** → B2 VALMIS

> **Konteksti:** today+inbox + Pari A + Pari B valmiina. Tämä = **viimeinen B2-pari: Tester + Kalender**
> (tapahtumapohjaiset näkymät). Sisältää **eniten §1 enum-display-mappeja** (event-tila + RSVP) → lue riskilista
> §1 + §5.1 tarkasti. **Tämän jälkeen kaikki 11 työtilaa sv → B2 valmis → täysi live-selaintarkastus.**

## Skooppi — funktiot (reititä `masterT()`:llä JS:ssä)
| Näkymä | Render-funktio (rivi n.) | Sisältö |
|---|---|---|
| **Tester** | `renderTestit` (2814) | testitapahtumalista, tilat, tulostaulukko-otsikot, tyhjätilat |
| **Kalender** | `renderCal` (8349) | kalenteritapahtumat, tapahtuman detalji (`addRow`), läsnäolo/RSVP-koonti, näkymävalitsin |

**Malli (kuten today/inbox):** dynaaminen render → `masterT(fi)`. §7.1 EI nested template literaleja. **Bugivahti:**
tarkista concat vs template-literal per funktio ENNEN muodon valintaa. Aja inline-parse-vahti.

## §1 enum-display-mapit (KRIITTINEN — EI data-i18n raakaan enumiin)
Riskilista §1 keskittyy TÄHÄN pariin. Tee **display-mappi renderissä**, ÄLÄ sokeaa korvausta:
- **Kalenteritapahtuman `tila` (rivi 8543):** `addRow('Tila', t.tila || '—')` — enum (`'suunniteltu'/'vahvistettu'/'valmis'/'peruttu'`)
  renderöidään raakana JA verrataan koodissa. → **`_tilaLbl(t.tila)`-display-mappi:** tunnetut käännetään kartasta
  (näyttömuodot kartassa), tuntematon → `t.tila` raakana (fi, turvallinen). Rivin **otsikko** `'Tila'` → `masterT('Tila')` (`Status`).
- **RSVP-saatavuus (rivit 8689–8731):** `state[pid].saatavuus`-enum `'tulossa'/'estynyt'` lasketaan → **enum-vertailu säilyy fi**
  (`sa === 'tulossa'`), vain **näyttö** reititetään. Rivi 8692 template: `'  ·  RSVP: ' + rsvp.tulossa + ' tulossa · ' + rsvp.estynyt + ' estynyt'`
  → `masterT('RSVP: {x} tulossa · {y} estynyt').replace('{x}', rsvp.tulossa).replace('{y}', rsvp.estynyt)` (SV: `RSVP: {x} kommer · {y} förhindrade`).
  Badge 8731 `✓ Tulossa` (näyttö) → `masterT('✓ Tulossa')` (`✓ Kommer`); title `Pelaaja ilmoitti tulevansa` → kartasta.
- **§5.1 CASE-SENSITIIVISYYS:** resolver on eksakti — enum `'valmis'` (pienaakkoset, koodivertailu) ≠ näyttö `'Valmis'` (kartassa).
  ÄLÄ normalisoi. Meidän `tmI18nResolve` täyttää tämän jo.

## §6 dynaamiset templatet — tässä parissa
| Rivi | FI (pohja) | SV-suositus |
|---|---|---|
| 8490 | toast `Näkymä: {Kuukausi/Kausi} — tulossa` | `Vy: {Månad/Säsong} — kommer` (näyttöosat kartasta, konkatenoi käännetyt) |
| 8692 | `RSVP: {x} tulossa · {y} estynyt` | `RSVP: {x} kommer · {y} förhindrade` |
| 9348 | toast `Kuormitusseuranta tulossa (§21)` | `Belastningsuppföljning kommer (§21)` (§-viite verbatim) |

**Toast/confirm-audit:** riskilista §6 mainitsee toast-vyöhykkeet — käy läpi kaikki `toast('...')`-kutsut näissä
funktioissa + varmista dynaamiset osat placeholderilla, staattiset kartasta.

## §5.2 split-tekstit
Rivi 3667 `Kuitatut löytyvät <b>Arkisto</b>-välilehdeltä` (jos osuu Tester/Inbox-arkistoon) → **koko lause yhtenä avaimena**
tai `data-i18n-html` (V1.1-malli säilyttää `<b>`): kartassa `Kvitterade finns i fliken <b>Arkiv</b>`. Ruotsin sanajärjestys
ei toimi osa-korvauksilla.

## ⛔ ÄLÄ reititä (riskilista §2–§3)
`tila`/`saatavuus`/cadence/scope/kadenssi **value**-attribuutit + koodivertailut · kirjaustyypit · testi-id:t ·
ws-avaimet · roolistringit · demo-pelaajanimet. Tuotetermit verbatim · indeksilyhenteet · **§-viitteet (§21/§28) verbatim**.
**§7-rajaus:** lib/normi-teksti fi. **Demo-haarat (§3)** fi.

## Glossaari commonista automaattisesti
Reititä masterT:llä, common voittaa. C1-portti kaataa jos lisäät commonin avaimen master-karttaan. Vain Pari C -spesifit karttaan.

## Cache-bust (§27.4)
`tm_master_i18n.js` muuttuu → **`?v` +1** (Pari B:n jälkeen). version.json auto-bump mainissa.

## DoD (Pari C) → B2 VALMIS
- **Tester + Kalender sv-tilassa 100 % ruotsiksi:** testilista + tilat + otsikot · kalenteri + tapahtuman detalji
  (tila-display-mappi §1) + RSVP/läsnäolo (näyttö reititetty, enum-value raakana) + näkymävalitsin/toastit.
- §1 tila + RSVP display-mapit (ei sokea korvaus, case-sensitiivinen §5.1). §6-templatet placeholderilla. §5.2 split-lause yhtenä avaimena.
- Glossaari commonista. Tuotetermit + §-viitteet verbatim. lib-teksti fi (§7). Demo fi (§3).
- **C1 säilyy. fi-regressio ehjä (enum-vertailut toimivat molemmilla kielillä!).** Vitest: Pari C -avainkattavuus + fi-fallback + C1 + **enum-value-invariantti** (`saatavuus === 'tulossa'` toimii sv-tilassa). `npm run lint` EXIT 0.

## Verifiointi (Claude — 4-kerrosportti, LIVE koska B2 valmistuu)
1. Kielineutraali gate renderTestit/renderCal → 0 reitittämätöntä näkyvää (pl. §7 lib + §1 tuntematon-enum-fallback + demo §3).
2. **Enum-invariantti-todiste:** injektoitu sv-tila EI riko `t.tila`/`saatavuus`-koodivertailuja (tila-badge + RSVP-laskenta oikein sv:ssä).
3. C1 + glossaari-portti + toast/confirm-audit (dynaamiset §6-templatet).
4. **Täysi live-selaintarkastus (kirjautunut sessio): 11 työtilaa läpi sv:ssä** — koti/today/inbox/dev/havainnot/pulse/season/kuorma/testit/cal + kalenteri-detalji. lint 0 · suite vihreä · inline-parse 0.

## Rajaus (EI Pari C:ssä)
Raita C: Seura-wiraus (Kimin SEURA-kartta + riskilista repossa docs/, viimeinen henkilöstösivu). lib-sisällön sv (curriculum, oma vaihe).
