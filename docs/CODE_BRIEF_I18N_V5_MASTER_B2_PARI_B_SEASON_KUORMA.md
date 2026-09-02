# Code-brief — i18n V5 · RAITA B · **B2 Pari B: Master_v16 — renderSeason (Säsong) + renderKuorma (Belastning & känsla) sv**

> **Konteksti:** today+inbox VALMIS + Pari A (Utveckling+Puls) tulossa/valmis. Sama B2-malli. Tämä =
> **Pari B: Säsong + Belastning & känsla** (pitkittäis-/aggregaattinäkymät: kausikooste + kuorma-/fiilisdata).
> Kartta (`docs/MASTER_SV_KAANNOSMUISTI.json`) kattaa staattiset stringit; §6-templatet reititetään koodissa.

## Skooppi — funktiot (reititä `masterT()`:llä JS:ssä)
| Näkymä | Render-funktio (rivi n.) | Sisältö |
|---|---|---|
| **Säsong** | `renderSeason` (7924) | kausikooste — kehitysmetriikat (kahdesti mitatut / parani), signaalimäärät, testikattavuus |
| **Belastning & känsla** | `renderKuorma` (8246) | kuormaseuranta — RPE-kirjaus %, fiilis-kirjaus %, roster-koonnit |

**Malli (kuten today/inbox):** dynaaminen render → `masterT(fi)`. §7.1 EI nested template literaleja. **Bugivahti:**
tarkista rakentaako funktio HTML:n `+`-konkatenaatiolla (→ `' + masterT('...') + '`) vai template-literaalilla
(→ `${masterT('...')}`) ENNEN muodon valintaa. Aja inline-parse-vahti (sama joka nappasi `_renderTodayFokus`-bugin).

## §6 dynaamiset templatet (placeholder + .replace) — tässä parissa
| Rivi | FI (pohja) | SV-suositus (riskilista §6) |
|---|---|---|
| 7968 | `{parani}/{m} kahdesti mitattua parani` / `tarvitsee 2 mittausta/pelaaja` | `{parani}/{m} av två uppmätta förbättrades` / `kräver 2 mätningar/spelare` |
| 8065 | `{n} pelaajaa · {x} signaalia · {y} testiä ({z} avoinna) · {k} kirjausta` | `{n} spelare · {x} signaler · {y} tester ({z} öppna) · {k} registreringar` |
| 8291 | `{x}/{rosterN} kirjasi RPE:n` | `{x}/{rosterN} registrerade RPE` |
| 8320 | `{x}/{rosterN} kirjasi fiiliksen` | `{x}/{rosterN} registrerade måendet` |

**Malli:** `masterT('{x}/{n} kirjasi RPE:n').replace('{x}', r.x).replace('{n}', rosterN)`. Sanajärjestys `{x}/{n}`
säilyy sv:ssä → suora placeholder riittää. Metr-kortin aputeksti (`metr(...)`) 3. param = arvo, 4. = title-selitys →
molemmat kartasta (title voi olla pitkä lause → yksi avain).

## §1 enum-arvot raakana (EI karttaan)
- `renderKuorma`/`renderSeason` lukevat kirjaus-/mittausdataa — **`kirjaustyyppi` `'T'/'D'/'S'/'P'`, `lahde`, `sukupuoli`
  raakana, EI reititetä.** Vain näyttötekstit (otsikot, apurivit, kirjaus-%-labelit) reititetään.
- Jos kuorma-näkymä näyttää kirjaustyyppi-nimiä käyttäjälle (näyttömuoto, ei value) → ne OVAT kartassa → reititä näyttö,
  ÄLÄ value-attribuuttia.

## ⛔ ÄLÄ reititä (riskilista §2–§3)
Kirjaustyypit/cadence/scope **value**-attribuutit · testi-id:t · ws-avaimet · roolistringit · demo-pelaajanimet ·
`lahde`-enumit (`'manuaalinen'/'catapult'/'polar'`). Tuotetermit verbatim (X-Factor/Hidden Gem/Underdog) ·
indeksilyhenteet (TKI/H-H/TSI/D1–D5/PHV/FLEI) · RPE (lyhenne, säilyy). **§7-rajaus:** lib/normi-teksti fi.
**Demo-haarat (§3)** fi.

## Glossaari commonista automaattisesti
Kehon valmius→Kroppslig beredskap · roolit · yleisnapit — reititä masterT:llä, common voittaa. C1-portti kaataa jos
lisäät commonin avaimen master-karttaan. Vain Pari B -spesifit body-stringit karttaan.

## Cache-bust (§27.4)
`tm_master_i18n.js` muuttuu → **`?v` +1** (Pari A:n jälkeen; nosta edellisestä). version.json auto-bump mainissa.

## DoD (Pari B)
- **Säsong + Belastning & känsla sv-tilassa 100 % ruotsiksi:** kausikooste (metriikat + signaali-/testimäärät) ·
  kuormaseuranta (RPE-% + fiilis-% + roster-koonnit). §6-templatet placeholderilla, sanajärjestys sv-oikea.
- Glossaari commonista. Tuotetermit + lyhenteet (RPE/TKI…) verbatim. lib-teksti fi (§7). Demo fi (§3). Enum-value raakana (§1).
- C1 säilyy. fi-regressio ehjä. Vitest: Pari B -avainkattavuus + fi-fallback + C1. `npm run lint` EXIT 0.

## Verifiointi (Claude — 4-kerrosportti)
1. Kielineutraali gate renderSeason/renderKuorma → 0 reitittämätöntä näkyvää (pl. §7 lib + §1 enum-value + demo §3).
2. Node/jsdom render-proof: §6-templatet sv (`{x}/{n} registrerade RPE`, `{n} spelare · {x} signaler…`), interpolointi OK.
3. C1 + glossaari-portti (Master∩common=∅, 0 varianttia).
4. lint 0 · suite vihreä · inline-parse 0.

## Rajaus (EI Pari B:ssa)
Pari A (Utveckling+Puls) · Pari C (Tester+Kalender). §1 RSVP + tila-enum kuuluvat **Pari C:hen** (renderCal-alue). Seura (Raita C). lib-sisältö sv.
